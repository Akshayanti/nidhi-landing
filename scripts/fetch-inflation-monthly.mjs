#!/usr/bin/env node
/**
 * Refreshes a monthly consumer price index the inflation calculator joins to
 * a country's yearly history. There are two, and `--source` says which:
 *
 *   bis (the default)   BIS data set "Consumer prices" (WS_LONG_CPI), the
 *                       monthly index, into src/data/inflation/bis-monthly.json
 *   world-bank          the World Bank's Global Economic Monitor, indicator
 *                       CPTOTNSXN, into src/data/inflation/worldbank-monthly.json,
 *                       for the countries the BIS has no index for
 *
 * The site serves what it needs of them from its own origin, inside the same
 * history file as the World Bank's yearly figures: a reader's browser never
 * contacts either. Run with the yearly refresh by
 * .github/workflows/inflation-data.yml; by hand with
 * `node scripts/fetch-inflation-monthly.mjs [--source world-bank]`.
 *
 * Fails with a non-zero exit, and leaves the existing file untouched, on any
 * network error or response it does not expect. The file is written whole,
 * through a temporary file and a rename.
 *
 * When the months are unchanged the file is left exactly as it was (its
 * fetchedAt included). A changed file is compared with the committed one:
 * the summary is printed, and written as Markdown to `--summary <path>`
 * (appended, so it can follow the yearly refresh's). A change over
 * `MONTHLY_LIMITS` fails the run and writes no data; its summary ends with a
 * short name for that exact comparison, and `--accept <name>` lets that same
 * comparison through once a person has read it.
 *
 * `--baseline <path>` names the committed file to compare with when it is not
 * the one being written. `--first-import` starts without one.
 * `--world-bank <path>` names the yearly file whose countries are kept.
 */
import { appendFileSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UNIT,
  buildMonthlyDataset,
  compareMonthly,
  firstMonthFor,
  monthlyDigest,
  parseBisCsv,
  sameMonthlyData,
  serializeMonthly,
  summarizeMonthly,
} from './lib/publishing/inflation-monthly.mjs';
import { WB_MONTHLY_INDICATOR, WB_MONTHLY_SOURCE_ID, buildWorldBankMonthly, parseWorldBankMonthly } from './lib/publishing/inflation-monthly-wb.mjs';
import { splitPage } from './lib/publishing/inflation-data.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(repoRoot, 'src/data/inflation/bis-monthly.json');
const OUT_WORLD_BANK = join(repoRoot, 'src/data/inflation/worldbank-monthly.json');
const WORLD_BANK = join(repoRoot, 'src/data/inflation/worldbank.json');
const API = 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LONG_CPI/1.0';
const WB_API = 'https://api.worldbank.org/v2';

async function get(url, accept, read) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await read(res);
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

/** The BIS's months since the window's first, as a dataset. */
async function fetchBis(worldBank, today) {
  const csv = await get(`${API}/M..${UNIT}?startPeriod=${firstMonthFor(today)}`, 'application/vnd.sdmx.data+csv;version=1.0.0', (res) => res.text());
  return buildMonthlyDataset(parseBisCsv(csv), worldBank, today);
}

/** The Global Economic Monitor's months since the window's first, every page, as a dataset. */
async function fetchWorldBankMonthly(worldBank, today) {
  const first = firstMonthFor(today).slice(0, 4);
  const base = `${WB_API}/country/all/indicator/${WB_MONTHLY_INDICATOR}?source=${WB_MONTHLY_SOURCE_ID}&format=json&date=${first}M01:${today.slice(0, 4)}M12&per_page=30000`;
  const page = (n) => get(`${base}&page=${n}`, 'application/json', (res) => res.json());
  const pages = [await page(1)];
  const { meta } = splitPage(pages[0]);
  for (let n = 2; n <= meta.pages; n++) pages.push(await page(n));
  return buildWorldBankMonthly(parseWorldBankMonthly(pages), worldBank, today);
}

function option(args, name) {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : null;
}

/** `args` and `out` are parameters so a test can run this against a temporary file. */
export async function main(args = process.argv.slice(2), out = null) {
  const source = option(args, '--source') ?? 'bis';
  if (source !== 'bis' && source !== 'world-bank') throw new Error(`--source is "${source}": it is bis or world-bank`);
  const fromWorldBank = source === 'world-bank';
  out ??= fromWorldBank ? OUT_WORLD_BANK : OUT;
  const title = fromWorldBank ? 'Monthly index (World Bank, Global Economic Monitor)' : 'Monthly index (BIS)';
  const summaryPath = option(args, '--summary');
  const accepted = option(args, '--accept');
  const baselinePath = option(args, '--baseline') ?? out;
  const worldBankPath = option(args, '--world-bank') ?? WORLD_BANK;
  const today = new Date().toISOString().slice(0, 10);

  const worldBank = JSON.parse(readFileSync(worldBankPath, 'utf8'));
  if (!worldBank || typeof worldBank.countries !== 'object' || worldBank.countries === null) throw new Error(`the yearly data at ${worldBankPath} has no countries`);

  let previous = null;
  try {
    previous = JSON.parse(readFileSync(baselinePath, 'utf8'));
    if (!previous || typeof previous.countries !== 'object' || previous.countries === null) throw new Error('it has no countries');
  } catch (err) {
    if (!args.includes('--first-import')) {
      throw new Error(`the committed data at ${baselinePath} cannot be read (${err.message}), so there is nothing to compare the new data with. Restore the file, or run with --first-import if there has never been one`);
    }
    previous = null;
  }

  const dataset = fromWorldBank ? await fetchWorldBankMonthly(worldBank, today) : await fetchBis(worldBank, today);

  if (sameMonthlyData(previous, dataset)) {
    console.log(`Unchanged: ${Object.keys(dataset.countries).length} countries of monthly figures.`);
    return;
  }

  if (previous) {
    const comparison = compareMonthly(previous, dataset);
    const digest = monthlyDigest(previous, dataset);
    const refused = comparison.over.length > 0 && accepted !== digest;
    let summary = `### ${title}\n\n${summarizeMonthly(comparison)}`;
    if (comparison.over.length) {
      summary += refused
        ? `\n\nRefused: no data was written. If this change is real, run again with this name to accept exactly this comparison: \`${digest}\``
        : `\n\nThis change is over the limits and was let through by hand, as comparison \`${digest}\`.`;
    }
    console.log(summary);
    if (summaryPath) appendFileSync(summaryPath, `\n${summary}\n`);
    if (refused) {
      throw new Error(`the new months differ from the committed file by more than a refresh may (${comparison.over.join('; ')})${accepted ? `, and the name given (${accepted}) is not this comparison's (${digest})` : ''}`);
    }
  }

  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, serializeMonthly(dataset));
  renameSync(tmp, out);
  console.log(`Wrote ${Object.keys(dataset.countries).length} countries of monthly figures to ${out}.`);
}

// Runs only as the entry script, so a test can import main without a fetch.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`fetch-inflation-monthly failed, nothing written: ${err.message}`);
    process.exit(1);
  });
}
