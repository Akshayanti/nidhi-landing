#!/usr/bin/env node
/**
 * Refreshes the inflation calculator's history: World Bank indicator
 * FP.CPI.TOTL.ZG (consumer price inflation, annual %) for every country.
 *
 * Writes src/data/inflation/worldbank.json, which the site serves from its own
 * origin: a reader's browser never contacts the World Bank. Run monthly by
 * .github/workflows/inflation-data.yml, which opens a pull request when the
 * file changed; run it by hand with `node scripts/fetch-inflation.mjs`.
 *
 * Fails with a non-zero exit, and leaves the existing file untouched, on any
 * network error or response shape it does not expect. The file is written
 * whole, through a temporary file and a rename, never in part.
 *
 * When the data is unchanged the file is left exactly as it was (its
 * fetchedAt included), so a quiet month produces no diff.
 */
import { readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDICATOR, buildDataset, parseCountries, parseIndicator, sameData, serializeDataset, splitPage } from './lib/inflation-data.mjs';

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

async function main() {
  const parsed = await fetchParsed();
  const dataset = buildDataset(parsed, new Date().toISOString().slice(0, 10));

  let previous = null;
  try {
    previous = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    previous = null;
  }
  if (sameData(previous, dataset)) {
    console.log(`Unchanged: ${Object.keys(dataset.countries).length} countries, World Bank update ${dataset.lastUpdated}.`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp`;
  writeFileSync(tmp, serializeDataset(dataset));
  renameSync(tmp, OUT);
  console.log(`Wrote ${Object.keys(dataset.countries).length} countries, World Bank update ${dataset.lastUpdated}, to ${OUT}.`);
}

main().catch((err) => {
  console.error(`fetch-inflation failed, nothing written: ${err.message}`);
  process.exit(1);
});
