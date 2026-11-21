#!/usr/bin/env node
/**
 * Refreshes the inflation calculator's history: World Bank indicator
 * FP.CPI.TOTL.ZG (consumer price inflation, annual %) for every country.
 *
 * Writes src/data/inflation/worldbank.json, which the site serves from its own
 * origin: a reader's browser never contacts the World Bank. Run monthly by
 * .github/workflows/inflation-data.yml, which pushes a branch and opens an
 * issue for a person to open its pull request when the file changed; run it
 * by hand with `node scripts/fetch-inflation.mjs`.
 *
 * Fails with a non-zero exit, and leaves the existing file untouched, on any
 * network error or response shape it does not expect. The file is written
 * whole, through a temporary file and a rename, never in part.
 *
 * When the data is unchanged the file is left exactly as it was (its
 * fetchedAt included), so a quiet month produces no diff.
 *
 * A changed dataset is compared with the committed one (#446): countries and
 * years removed, past values changed. The summary is printed, and written as
 * Markdown to the file named by `--summary <path>`. A change over the limits
 * (`CHANGE_LIMITS`) fails the run and writes no data. Its summary ends with a
 * short name for that exact comparison; `--accept <name>` lets that same
 * comparison through once a person has read it, and nothing else.
 *
 * `--baseline <path>` names the committed file to compare with when it is not
 * the one being written (the workflow compares with the file on main). A
 * baseline that is missing or cannot be read fails the run: only
 * `--first-import` may start without one.
 *
 * `--dry-run accepted` and `--dry-run refused` exercise everything after the
 * fetch without the World Bank: the new data is made up from the baseline
 * (`dryRunDataset`), the same way every time. A dry run's data is never
 * merged.
 */
import { readFileSync, realpathSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INDICATOR,
  buildDataset,
  compareDatasets,
  comparisonDigest,
  dryRunDataset,
  parseCountries,
  parseIndicator,
  sameData,
  serializeDataset,
  splitPage,
  summarizeComparison,
} from './lib/inflation-data.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(repoRoot, 'src/data/inflation/worldbank.json');
const API = 'https://api.worldbank.org/v2';
const PER_PAGE = 20000;

async function getJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

/** Every page of a paged World Bank endpoint. */
async function getAllPages(baseUrl) {
  const sep = baseUrl.includes('?') ? '&' : '?';
  const first = await getJson(`${baseUrl}${sep}page=1`);
  const { meta } = splitPage(first);
  const pages = [first];
  for (let p = 2; p <= meta.pages; p++) pages.push(await getJson(`${baseUrl}${sep}page=${p}`));
  return pages;
}

/**
 * Fetches and parses everything, retrying the whole fetch (not one page) if
 * the pages came from two different World Bank updates.
 */
async function fetchParsed() {
  const year = new Date().getUTCFullYear();
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const [indicatorPages, countryPages] = await Promise.all([
      getAllPages(`${API}/country/all/indicator/${INDICATOR}?format=json&date=1960:${year}&per_page=${PER_PAGE}`),
      getAllPages(`${API}/country?format=json&per_page=400`),
    ]);
    try {
      return parseIndicator(indicatorPages, parseCountries(countryPages));
    } catch (err) {
      if (!/different updates/.test(err.message)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

function option(args, name) {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : null;
}

/** `args` and `out` are parameters so a test can run this against a temporary file. */
export async function main(args = process.argv.slice(2), out = OUT) {
  const dryRun = option(args, '--dry-run');
  const summaryPath = option(args, '--summary');
  const accepted = option(args, '--accept');
  const baselinePath = option(args, '--baseline') ?? out;
  const today = new Date().toISOString().slice(0, 10);

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

  let dataset;
  if (dryRun) {
    if (!previous) throw new Error('a dry run needs the committed data to build from');
    dataset = { ...dryRunDataset(previous, dryRun), fetchedAt: today };
  } else {
    dataset = buildDataset(await fetchParsed(), today);
  }

  if (sameData(previous, dataset)) {
    console.log(`Unchanged: ${Object.keys(dataset.countries).length} countries, World Bank update ${dataset.lastUpdated}.`);
    return;
  }

  if (previous) {
    const comparison = compareDatasets(previous, dataset);
    const digest = comparisonDigest(previous, dataset);
    const refused = comparison.over.length > 0 && accepted !== digest;
    let summary = summarizeComparison(comparison);
    if (comparison.over.length) {
      summary += refused
        ? `\n\nRefused: no data was written. If this change is real, run again with this name to accept exactly this comparison: \`${digest}\``
        : `\n\nThis change is over the limits and was let through by hand, as comparison \`${digest}\`.`;
    }
    console.log(summary);
    if (summaryPath) writeFileSync(summaryPath, `${summary}\n`);
    if (refused) {
      throw new Error(`the new data differs from the committed file by more than a refresh may (${comparison.over.join('; ')})${accepted ? `, and the name given (${accepted}) is not this comparison's (${digest})` : ''}`);
    }
  }

  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, serializeDataset(dataset));
  renameSync(tmp, out);
  console.log(`Wrote ${Object.keys(dataset.countries).length} countries, World Bank update ${dataset.lastUpdated}, to ${out}.`);
}

// Runs only as the entry script, so a test can import main without a fetch.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`fetch-inflation failed, nothing written: ${err.message}`);
    process.exit(1);
  });
}
