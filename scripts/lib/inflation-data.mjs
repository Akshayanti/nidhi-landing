/**
 * Pure parsing for the World Bank inflation data behind the inflation
 * calculator (`scripts/fetch-inflation.mjs` does the fetching and the writing).
 *
 * The indicator is FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)":
 * the yearly change in a country's consumer price index, in percent. Two API
 * responses go in: the indicator's rows for every country and year, and the
 * World Bank's country list, which is what says whether a code is a country or
 * an aggregate such as "South Asia" or "High income". Aggregates are dropped,
 * except the euro area (EMU), which the tool offers because a euro reader's
 * prices are measured that way too.
 *
 * Every function here throws on a response shape it does not expect. The
 * fetch script never writes a partial file, so a changed API fails the
 * monthly workflow loudly instead of quietly shipping a thinner dataset.
 *
 * No network, no filesystem: the tests feed these functions fixtures.
 */

export const INDICATOR = 'FP.CPI.TOTL.ZG';
export const SOURCE = 'World Bank, World Development Indicators: Inflation, consumer prices (annual %)';
export const LICENSE = 'CC BY 4.0';

/** The one aggregate the tool keeps. */
export const KEPT_AGGREGATES = new Set(['EMU']);

/** Countries the tool's defaults and tests depend on; a dataset without them is broken. */
const REQUIRED = ['IND', 'USA', 'EMU'];
/** Fewer real countries than this means a truncated response, not a quiet year. */
const MIN_COUNTRIES = 150;

function fail(message) {
  throw new Error(`World Bank response: ${message}`);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Splits one page of a World Bank v2 JSON response into its metadata and rows.
 * The API answers `[meta, rows]`; an error comes back as `[{ message: [...] }]`.
 */
export function splitPage(json) {
  if (!Array.isArray(json)) fail('expected an array');
  const [meta, rows] = json;
  if (!isObject(meta)) fail('expected a metadata object first');
  if (meta.message) fail(`API error: ${JSON.stringify(meta.message)}`);
  for (const key of ['page', 'pages', 'total']) {
    if (!Number.isInteger(Number(meta[key]))) fail(`metadata has no numeric "${key}"`);
  }
  if (!Array.isArray(rows)) fail('expected an array of rows second');
  return { meta: { ...meta, page: Number(meta.page), pages: Number(meta.pages), total: Number(meta.total) }, rows };
}

/**
 * The country list (`/v2/country?format=json&per_page=400`), as
 * ISO3 -> { iso2, aggregate }.
 */
export function parseCountries(pages) {
  const out = new Map();
  let expected = null;
  let seen = 0;
  for (const json of pages) {
    const { meta, rows } = splitPage(json);
    expected ??= meta.total;
    if (meta.total !== expected) fail('country list total changed between pages');
    for (const row of rows) {
      if (!isObject(row) || typeof row.id !== 'string' || typeof row.iso2Code !== 'string' || !isObject(row.region)) {
        fail(`unexpected country row ${JSON.stringify(row)}`);
      }
      seen += 1;
      out.set(row.id, { iso2: row.iso2Code, aggregate: row.region.value === 'Aggregates' || row.region.id === 'NA' });
    }
  }
  if (seen !== expected) fail(`country list has ${seen} rows, metadata says ${expected}`);
  return out;
}

/** Rounds to two decimals, without a negative zero. */
export function round2(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * The indicator pages, as { lastUpdated, countries: { ISO3: { iso2, years } } },
 * keeping real countries (an ISO3 code and an ISO2 code, not an aggregate) and
 * the euro area. Years with no value are left out, so a gap is a missing key.
 */
export function parseIndicator(pages, countries) {
  let expected = null;
  let lastUpdated = null;
  let seen = 0;
  const kept = {};
  for (const json of pages) {
    const { meta, rows } = splitPage(json);
    expected ??= meta.total;
    if (meta.total !== expected) fail('indicator total changed between pages');
    if (typeof meta.lastupdated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(meta.lastupdated)) {
      fail(`metadata has no lastupdated date (${JSON.stringify(meta.lastupdated)})`);
    }
    lastUpdated ??= meta.lastupdated;
    for (const row of rows) {
      if (!isObject(row) || !isObject(row.indicator) || row.indicator.id !== INDICATOR) {
        fail(`unexpected indicator row ${JSON.stringify(row)}`);
      }
      if (typeof row.countryiso3code !== 'string' || typeof row.date !== 'string' || !/^\d{4}$/.test(row.date)) {
        fail(`row without a country code or year ${JSON.stringify(row)}`);
      }
      if (row.value !== null && (typeof row.value !== 'number' || !Number.isFinite(row.value))) {
        fail(`non-numeric value ${JSON.stringify(row)}`);
      }
      seen += 1;
      const iso3 = row.countryiso3code;
      if (row.value === null || !/^[A-Z]{3}$/.test(iso3)) continue;
      const info = countries.get(iso3);
      if (!info) continue;
      const keep = KEPT_AGGREGATES.has(iso3) || (!info.aggregate && /^[A-Z]{2}$/.test(info.iso2));
      if (!keep) continue;
      const entry = (kept[iso3] ??= { iso2: info.iso2, years: {} });
      entry.years[row.date] = round2(row.value);
    }
  }
  if (seen !== expected) fail(`indicator has ${seen} rows, metadata says ${expected}`);
  const real = Object.keys(kept).filter((k) => !KEPT_AGGREGATES.has(k));
  if (real.length < MIN_COUNTRIES) fail(`only ${real.length} countries have data, expected at least ${MIN_COUNTRIES}`);
  for (const code of REQUIRED) if (!kept[code]) fail(`no data for ${code}`);
  return { lastUpdated, countries: kept };
}

/** Recursively sorts object keys, so the same data always serialises the same way. */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}

/** The file's full contents: the parsed data plus its provenance. */
export function buildDataset(parsed, fetchedAt) {
  return {
    source: SOURCE,
    license: LICENSE,
    indicator: INDICATOR,
    lastUpdated: parsed.lastUpdated,
    fetchedAt,
    countries: parsed.countries,
  };
}

/** Stable JSON: sorted keys, two-space indent, trailing newline. */
export function serializeDataset(dataset) {
  return `${JSON.stringify(sortKeys(dataset), null, 2)}\n`;
}

/**
 * Whether two datasets hold the same data, ignoring when each was fetched. A
 * monthly run that finds nothing new keeps the old file, fetchedAt included,
 * so it produces no diff and opens no pull request.
 */
export function sameData(a, b) {
  if (!a || !b) return false;
  const strip = ({ fetchedAt: _ignored, ...rest }) => rest;
  return serializeDataset(strip(a)) === serializeDataset(strip(b));
}
