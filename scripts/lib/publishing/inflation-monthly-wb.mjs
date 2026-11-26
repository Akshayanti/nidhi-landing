/**
 * Pure parsing for the inflation calculator's second monthly source: the
 * World Bank's Global Economic Monitor, indicator CPTOTNSXN ("CPI Price, not
 * seas. adj."), the monthly consumer price index for the countries the BIS
 * does not publish one for (`inflation-monthly.mjs` is the first source).
 *
 * The same World Bank API as the yearly figures answers it, as pages of
 * `[meta, rows]`, with `source=15` and months written `2026M07`. A row's
 * country is its ISO3 code; aggregates ("Advanced Economies") have codes the
 * yearly file does not, and are left out with them.
 *
 * The file has the shape of the BIS one, so the same comparison, limits,
 * summary and name (`compareMonthly`, `monthlyDigest`) keep a refresh honest.
 * Whether a country's months are joined is decided at build time
 * (`src/utils/inflation/monthly.ts`).
 *
 * No network, no filesystem: the tests feed these functions fixtures.
 */
import { splitPage } from './inflation-data.mjs';
import { firstMonthFor, round4 } from './inflation-monthly.mjs';

export const WB_MONTHLY_INDICATOR = 'CPTOTNSXN';
/** The Global Economic Monitor's number among the World Bank's databases. */
export const WB_MONTHLY_SOURCE_ID = '15';
export const WB_MONTHLY_SOURCE = 'World Bank, Global Economic Monitor: CPI Price, not seas. adj. (CPTOTNSXN), monthly';
export const WB_MONTHLY_LICENSE = 'CC BY 4.0';

/** Countries a full answer always has; a response without them is broken. */
const REQUIRED = ['USA', 'DEU', 'KEN'];
/** Fewer countries than this means a truncated response. The database has about 150. */
const MIN_COUNTRIES = 100;

function fail(message) {
  throw new Error(`World Bank monthly response: ${message}`);
}

const MONTH = /^(\d{4})M(0[1-9]|1[0-2])$/;

/**
 * Every page of the indicator, as { lastUpdated, rows: [{ code, month, value }] }.
 * A month with no value is left out. Pages from two different updates, another
 * indicator or database, a month written another way, the same month twice or
 * a value that is not a positive number all throw.
 */
export function parseWorldBankMonthly(pages) {
  if (!Array.isArray(pages) || pages.length === 0) fail('no pages');
  let lastUpdated = null;
  const rows = [];
  const seen = new Set();
  for (const page of pages) {
    const { meta, rows: pageRows } = splitPage(page);
    if (String(meta.sourceid) !== WB_MONTHLY_SOURCE_ID) fail(`database ${meta.sourceid}, not the Global Economic Monitor (${WB_MONTHLY_SOURCE_ID})`);
    if (typeof meta.lastupdated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(meta.lastupdated)) fail(`no update date ("${meta.lastupdated}")`);
    if (lastUpdated !== null && meta.lastupdated !== lastUpdated) fail(`pages from different updates (${lastUpdated} and ${meta.lastupdated})`);
    lastUpdated = meta.lastupdated;
    for (const row of pageRows) {
      if (row?.indicator?.id !== WB_MONTHLY_INDICATOR) fail(`a row of "${row?.indicator?.id}", not ${WB_MONTHLY_INDICATOR}`);
      const code = row.country?.id;
      if (typeof code !== 'string' || !/^[A-Z0-9]{2,3}$/.test(code)) fail(`a row with the country "${code}"`);
      const when = MONTH.exec(String(row.date));
      if (!when) fail(`${code} has the period "${row.date}"`);
      const month = `${when[1]}-${when[2]}`;
      const key = `${code} ${month}`;
      if (seen.has(key)) fail(`${code} has ${month} twice`);
      seen.add(key);
      if (row.value === null) continue;
      if (typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value <= 0) fail(`${code} ${month} has the value "${row.value}"`);
      rows.push({ code, month, value: row.value });
    }
  }
  return { lastUpdated, rows };
}

/**
 * The file's full contents. `worldBank` is the committed yearly file: a code
 * it does not have (an aggregate) is left out, and so is a month before the
 * window.
 */
export function buildWorldBankMonthly(parsed, worldBank, fetchedAt) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) fail(`no fetch date ("${fetchedAt}")`);
  const firstMonth = firstMonthFor(fetchedAt);
  const countries = {};
  for (const { code, month, value } of parsed.rows) {
    if (!Object.hasOwn(worldBank.countries, code) || month < firstMonth) continue;
    (countries[code] ??= { area: code, months: {} }).months[month] = round4(value);
  }
  const codes = Object.keys(countries);
  if (codes.length < MIN_COUNTRIES) fail(`only ${codes.length} countries, fewer than ${MIN_COUNTRIES}`);
  for (const code of REQUIRED) if (!countries[code]) fail(`${code} is missing`);
  return {
    source: WB_MONTHLY_SOURCE,
    license: WB_MONTHLY_LICENSE,
    indicator: WB_MONTHLY_INDICATOR,
    lastUpdated: parsed.lastUpdated,
    fetchedAt,
    firstMonth,
    countries,
  };
}
