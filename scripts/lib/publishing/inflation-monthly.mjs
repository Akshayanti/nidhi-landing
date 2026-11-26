/**
 * Pure parsing for the monthly consumer price index that lets the inflation
 * calculator end at a month, not at the last full year
 * (`scripts/fetch-inflation-monthly.mjs` does the fetching and the writing).
 *
 * The source is the BIS data set "Consumer prices" (WS_LONG_CPI), the monthly
 * index (unit 628), as SDMX-CSV. Its terms of permitted use
 * (https://data.bis.org/help/legal, read Nov 25, 2026) allow unrestricted use
 * provided the BIS is cited as the source, a translation says it is not an
 * official BIS translation, the use implies no endorsement, and a commercial
 * product makes no additional charge for the statistics.
 *
 * Only the months the join needs are kept: `WINDOW_YEARS` calendar years back
 * from the fetch, enough to compare the index's yearly changes with the World
 * Bank's for the years `src/utils/inflation/monthly.ts` checks. Whether a
 * country's months are joined to its yearly history is decided there, at
 * build time, from this file and the World Bank's; this module only keeps the
 * file honest.
 *
 * Every function here throws on a response it does not expect. The fetch
 * script never writes a partial file.
 *
 * No network, no filesystem: the tests feed these functions fixtures.
 */
import { createHash } from 'node:crypto';

export const DATAFLOW = 'BIS:WS_LONG_CPI(1.0)';
/** The index itself; 771 is the year-on-year change, which the tool does not use. */
export const UNIT = '628';
export const SOURCE = 'BIS, Consumer prices (WS_LONG_CPI): consumer price index, monthly';
export const TERMS = 'https://data.bis.org/help/legal';

/** Calendar years of months kept, counting the year of the fetch. */
export const WINDOW_YEARS = 9;

/** BIS reference areas that are not ISO countries, and the World Bank code each stands for. */
export const AREA_CODES = { XM: 'EMU' };

/** Countries the tool's pages open with; a response without them is broken. */
const REQUIRED = ['USA', 'DEU', 'ESP', 'CZE', 'MEX'];
/** Fewer countries than this means a truncated response. The data set has about 60. */
const MIN_COUNTRIES = 40;

function fail(message) {
  throw new Error(`BIS response: ${message}`);
}

/** One line of CSV, with quoted fields and doubled quotes. */
export function splitCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return out;
}

const COLUMNS = ['DATAFLOW', 'FREQ', 'REF_AREA', 'UNIT_MEASURE', 'TIME_PERIOD', 'OBS_VALUE', 'OBS_STATUS'];
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * The SDMX-CSV response as rows of { area, month, value }. A row with no
 * value (the BIS marks a month it does not have) is left out; anything else
 * unexpected throws.
 */
export function parseBisCsv(text) {
  if (typeof text !== 'string') fail('expected text');
  const lines = text.split(/\r?\n/).filter((l) => l !== '');
  if (lines.length < 2) fail('no rows');
  const header = splitCsvLine(lines[0]);
  const at = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));
  for (const c of COLUMNS) if (at[c] < 0) fail(`no "${c}" column`);
  const rows = [];
  const seen = new Set();
  for (let n = 1; n < lines.length; n++) {
    const f = splitCsvLine(lines[n]);
    if (f.length !== header.length) fail(`row ${n + 1} has ${f.length} fields, the header has ${header.length}`);
    if (f[at.DATAFLOW] !== DATAFLOW) fail(`row ${n + 1} is from "${f[at.DATAFLOW]}", not ${DATAFLOW}`);
    if (f[at.FREQ] !== 'M') fail(`row ${n + 1} is not monthly`);
    if (f[at.UNIT_MEASURE] !== UNIT) fail(`row ${n + 1} has unit "${f[at.UNIT_MEASURE]}", not the index (${UNIT})`);
    const area = f[at.REF_AREA];
    const month = f[at.TIME_PERIOD];
    if (!/^[A-Z0-9]{2}$/.test(area)) fail(`row ${n + 1} has the area "${area}"`);
    if (!MONTH.test(month)) fail(`row ${n + 1} has the period "${month}"`);
    const key = `${area} ${month}`;
    if (seen.has(key)) fail(`${area} has ${month} twice`);
    seen.add(key);
    const raw = f[at.OBS_VALUE];
    if (raw === '' || raw === 'NaN') continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) fail(`row ${n + 1} has the value "${raw}"`);
    rows.push({ area, month, value });
  }
  return rows;
}

/** Four decimals: what the join needs, and a stable file. */
export function round4(v) {
  return Math.round(v * 10000) / 10000;
}

/** The first month kept by a fetch made on `fetchedAt` (YYYY-MM-DD). */
export function firstMonthFor(fetchedAt) {
  return `${Number(fetchedAt.slice(0, 4)) - (WINDOW_YEARS - 1)}-01`;
}

/**
 * The file's full contents. `worldBank` is the committed yearly file: its
 * codes name the countries, and an area it does not have is left out, since
 * nothing could be joined to it.
 */
export function buildMonthlyDataset(rows, worldBank, fetchedAt) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) fail(`no fetch date ("${fetchedAt}")`);
  const byIso2 = { ...AREA_CODES };
  for (const [code, c] of Object.entries(worldBank.countries)) if (!(c.iso2 in byIso2) && !Object.values(AREA_CODES).includes(code)) byIso2[c.iso2] = code;
  const firstMonth = firstMonthFor(fetchedAt);
  const countries = {};
  for (const { area, month, value } of rows) {
    const code = byIso2[area];
    if (!code || !worldBank.countries[code] || month < firstMonth) continue;
    (countries[code] ??= { area, months: {} }).months[month] = round4(value);
  }
  const codes = Object.keys(countries);
  if (codes.length < MIN_COUNTRIES) fail(`only ${codes.length} countries, fewer than ${MIN_COUNTRIES}`);
  for (const code of REQUIRED) if (!countries[code]) fail(`${code} is missing`);
  return { source: SOURCE, terms: TERMS, dataflow: DATAFLOW, unit: UNIT, fetchedAt, firstMonth, countries };
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  return value;
}

/** Stable JSON: sorted keys, one country per line, trailing newline. */
export function serializeMonthly(dataset) {
  const { countries, ...rest } = sortKeys(dataset);
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, '');
  const body = Object.keys(countries).map((code) => `    ${JSON.stringify(code)}: ${JSON.stringify(countries[code])}`);
  return `${head},\n  "countries": {\n${body.join(',\n')}\n  }\n}\n`;
}

/** Whether two datasets hold the same months, ignoring when each was fetched. */
export function sameMonthlyData(a, b) {
  if (!a || !b) return false;
  const strip = ({ fetchedAt: _ignored, ...rest }) => rest;
  return serializeMonthly(strip(a)) === serializeMonthly(strip(b));
}

/**
 * What a refresh may change before a person has to say so. New months arrive
 * every month and the latest few are revised a little. A country or a month
 * that disappears, or an index that moved (a rebasing moves every value at
 * once), changes answers already given, so a person reads it first.
 */
export const MONTHLY_LIMITS = {
  /** Countries in the old file and not in the new one. */
  countriesRemoved: 0,
  /** Months inside the new window that the old file had and the new one lacks. */
  monthsRemoved: 0,
  /** Values that moved by more than `LARGE_REVISION`. */
  largeChanges: 0,
  /** Values that moved at all, as a share of the values both files have. */
  changedShare: 0.1,
};

/** A month's index moved by more than this share of itself. */
export const LARGE_REVISION = 0.02;

export function compareMonthly(previous, next, limits = MONTHLY_LIMITS) {
  const before = previous.countries;
  const after = next.countries;
  const countriesRemoved = Object.keys(before).filter((c) => !after[c]).sort();
  const countriesAdded = Object.keys(after).filter((c) => !before[c]).sort();
  const monthsRemoved = [];
  const large = [];
  let monthsAdded = 0;
  let changed = 0;
  let shared = 0;
  for (const code of Object.keys(after).sort()) {
    const old = before[code]?.months ?? {};
    const now = after[code].months;
    for (const month of Object.keys(now)) if (!(month in old)) monthsAdded += 1;
    for (const month of Object.keys(old).sort()) {
      if (month < next.firstMonth) continue;
      if (!(month in now)) {
        monthsRemoved.push(`${code} ${month}`);
        continue;
      }
      shared += 1;
      if (now[month] === old[month]) continue;
      changed += 1;
      if (Math.abs(now[month] - old[month]) > LARGE_REVISION * old[month]) large.push(`${code} ${month}: ${old[month]} to ${now[month]}`);
    }
  }
  const over = [];
  if (countriesRemoved.length > limits.countriesRemoved) over.push(`${countriesRemoved.length} countries removed`);
  if (monthsRemoved.length > limits.monthsRemoved) over.push(`${monthsRemoved.length} months removed`);
  if (large.length > limits.largeChanges) over.push(`${large.length} values moved by more than ${LARGE_REVISION * 100}%`);
  if (shared > 0 && changed / shared > limits.changedShare) over.push(`${changed} of ${shared} past values changed`);
  return { countriesRemoved, countriesAdded, monthsRemoved, monthsAdded, changed, shared, large, over };
}

/** The comparison as Markdown, for the workflow's summary and its issue. */
export function summarizeMonthly(cmp, { listed = 20 } = {}) {
  const list = (items) => (items.length > listed ? `${items.slice(0, listed).join(', ')} and ${items.length - listed} more` : items.join(', '));
  const lines = [
    `- Months added: ${cmp.monthsAdded}`,
    `- Past values changed: ${cmp.changed} of ${cmp.shared}`,
    `- Values that moved by more than ${LARGE_REVISION * 100}%: ${cmp.large.length}${cmp.large.length ? ` (${list(cmp.large)})` : ''}`,
    `- Months removed: ${cmp.monthsRemoved.length}${cmp.monthsRemoved.length ? ` (${list(cmp.monthsRemoved)})` : ''}`,
    `- Countries added: ${cmp.countriesAdded.length}${cmp.countriesAdded.length ? ` (${list(cmp.countriesAdded)})` : ''}`,
    `- Countries removed: ${cmp.countriesRemoved.length}${cmp.countriesRemoved.length ? ` (${list(cmp.countriesRemoved)})` : ''}`,
  ];
  if (cmp.over.length) lines.push('', `**Over the limits:** ${cmp.over.join('; ')}.`);
  return lines.join('\n');
}

/** A short name for exactly this comparison, which `--accept` takes. */
export function monthlyDigest(previous, next) {
  const strip = ({ fetchedAt: _ignored, ...rest }) => rest;
  return createHash('sha256').update(serializeMonthly(strip(previous))).update('\n').update(serializeMonthly(strip(next))).digest('hex').slice(0, 12);
}
