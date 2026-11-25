#!/usr/bin/env node
/**
 * Refreshes the monthly consumer price index the inflation calculator joins
 * to a country's yearly history: BIS data set "Consumer prices"
 * (WS_LONG_CPI), the monthly index, for every country the BIS publishes.
 *
 * Writes src/data/inflation/bis-monthly.json. The site serves what it needs
 * of it from its own origin, inside the same history file as the World Bank's
 * figures: a reader's browser never contacts the BIS. Run with the yearly
 * refresh by .github/workflows/inflation-data.yml; by hand with
 * `node scripts/fetch-inflation-monthly.mjs`.
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

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(repoRoot, 'src/data/inflation/bis-monthly.json');
const WORLD_BANK = join(repoRoot, 'src/data/inflation/worldbank.json');
const API = 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LONG_CPI/1.0';

async function getCsv(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/vnd.sdmx.data+csv;version=1.0.0' }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

function option(args, name) {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : null;
}

/** `args`, `out` and `fetchCsv` are parameters so a test can run this without the BIS. */
export async function main(args = process.argv.slice(2), out = OUT, fetchCsv = getCsv) {
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

  const csv = await fetchCsv(`${API}/M..${UNIT}?startPeriod=${firstMonthFor(today)}`);
  const dataset = buildMonthlyDataset(parseBisCsv(csv), worldBank, today);

  if (sameMonthlyData(previous, dataset)) {
    console.log(`Unchanged: ${Object.keys(dataset.countries).length} countries of monthly figures.`);
    return;
  }

  if (previous) {
    const comparison = compareMonthly(previous, dataset);
    const digest = monthlyDigest(previous, dataset);
    const refused = comparison.over.length > 0 && accepted !== digest;
    let summary = `### Monthly index (BIS)\n\n${summarizeMonthly(comparison)}`;
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
