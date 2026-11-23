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
import { createHash } from 'node:crypto';

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
    // Pages from two different World Bank releases must never be combined
    // under one update date: the fetch is retried whole instead.
    if (meta.lastupdated !== lastUpdated) fail(`pages come from different updates (${lastUpdated} and ${meta.lastupdated})`);
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

/**
 * What a refresh may change before a person has to say so (#446). The World
 * Bank revises recent years a little every release and adds a year once a
 * year. A country or a year that disappears takes answers and shared links
 * with it, so neither may happen without a person saying so; the other two
 * limits catch a release that moved past values wholesale. A change at a limit
 * passes; one over it is refused. These are gates for a person to look, not a
 * judgement that the World Bank is wrong.
 */
export const CHANGE_LIMITS = {
  /** Countries in the old file and not in the new one. */
  countriesRemoved: 0,
  /** Years lost from countries that are still there. */
  yearsRemoved: 0,
  /** Past values that moved by a large amount (see `isLargeChange`). */
  largeChanges: 25,
  /** Changed values from more than `SETTLED_AFTER_YEARS` before the latest year. */
  settledChanges: 200,
  /**
   * Changed values of any year: this many, or this share of all the values in
   * the committed file, whichever is lower. Provisional (council, Nov 18,
   * 2026): the file had one release behind it when this was set, so nobody
   * knew how many values a normal release revises. If a normal release trips
   * only this limit, that is the evidence to set it by.
   */
  allChanges: 500,
  allChangesShare: 0.05,
};

/** Recent years are revised as a matter of course; values older than this rarely move. */
export const SETTLED_AFTER_YEARS = 5;

/**
 * A revision large enough to be read by a person: more than five percentage
 * points, and more than half of the larger of the two figures. So 3.1 to 3.4
 * is not one, 4 to 11 is, and 2,000 to 2,004 is not.
 */
export function isLargeChange(before, after) {
  const diff = Math.abs(after - before);
  return diff > 5 && diff > 0.5 * Math.max(Math.abs(before), Math.abs(after));
}

const yearCount = (country) => Object.keys(country.years).length;

/**
 * The difference between the committed dataset and a new one: what was added,
 * what was removed, which past values changed, and whether any of it is over
 * `CHANGE_LIMITS`.
 */
export function compareDatasets(previous, next, limits = CHANGE_LIMITS) {
  const before = previous.countries;
  const after = next.countries;
  const countriesRemoved = Object.keys(before).filter((c) => !after[c]).sort();
  const countriesAdded = Object.keys(after).filter((c) => !before[c]).sort();
  const yearsRemoved = [];
  const yearsAdded = [];
  const changed = [];
  let latest = 0;
  let values = 0;
  for (const c of Object.values(before)) {
    for (const y of Object.keys(c.years)) {
      latest = Math.max(latest, Number(y));
      values += 1;
    }
  }
  // Never rounded up: 5% of 9,217 is 460.85, so the 461st changed value is over.
  const allLimit = Math.min(limits.allChanges, Math.floor(values * limits.allChangesShare));
  for (const code of Object.keys(after).sort()) {
    if (!before[code]) continue;
    const was = before[code].years;
    const now = after[code].years;
    for (const year of Object.keys(was)) if (!(year in now)) yearsRemoved.push({ code, year });
    for (const year of Object.keys(now)) {
      if (!(year in was)) yearsAdded.push({ code, year });
      else if (was[year] !== now[year]) {
        changed.push({ code, year, before: was[year], after: now[year], large: isLargeChange(was[year], now[year]), settled: Number(year) < latest - SETTLED_AFTER_YEARS });
      }
    }
  }
  const largeChanges = changed.filter((c) => c.large);
  const settledChanges = changed.filter((c) => c.settled);
  const over = [];
  if (countriesRemoved.length > limits.countriesRemoved) over.push(`${countriesRemoved.length} countries removed (limit ${limits.countriesRemoved})`);
  if (yearsRemoved.length > limits.yearsRemoved) over.push(`${yearsRemoved.length} years removed from countries that remain (limit ${limits.yearsRemoved})`);
  if (largeChanges.length > limits.largeChanges) over.push(`${largeChanges.length} past values changed by a large amount (limit ${limits.largeChanges})`);
  if (settledChanges.length > limits.settledChanges) over.push(`${settledChanges.length} values from more than ${SETTLED_AFTER_YEARS} years before ${latest} changed (limit ${limits.settledChanges})`);
  if (changed.length > allLimit) over.push(`${changed.length} past values changed (limit ${allLimit}: ${limits.allChanges}, or ${limits.allChangesShare * 100}% of the ${values} values in the committed file, whichever is lower)`);
  return {
    countriesRemoved,
    countriesAdded,
    /** Observations that went with the removed countries, and came with the new ones: not in the year counts. */
    observationsLostWithCountries: countriesRemoved.reduce((n, c) => n + yearCount(before[c]), 0),
    observationsGainedWithCountries: countriesAdded.reduce((n, c) => n + yearCount(after[c]), 0),
    yearsRemoved,
    yearsAdded,
    changed,
    largeChanges,
    settledChanges,
    updated: { before: previous.lastUpdated, after: next.lastUpdated },
    over,
  };
}

/** Whether the comparison found any difference in the data itself (the update date aside). */
export function dataChanged(cmp) {
  return cmp.countriesRemoved.length + cmp.countriesAdded.length + cmp.yearsRemoved.length + cmp.yearsAdded.length + cmp.changed.length > 0;
}

/** The comparison as Markdown, for the pull request's description and the run's summary. */
export function summarizeComparison(cmp, { listed = 40 } = {}) {
  const dateLine = cmp.updated.before === cmp.updated.after
    ? `World Bank update date: ${cmp.updated.after}.`
    : `World Bank update date changed from ${cmp.updated.before} to ${cmp.updated.after}`;
  if (!dataChanged(cmp)) return cmp.updated.before === cmp.updated.after ? `${dateLine} No value changed.` : `${dateLine}; no value changed.`;
  const lines = [cmp.updated.before === cmp.updated.after ? dateLine : `${dateLine}.`, ''];
  const list = (items, show) => {
    const head = items.slice(0, listed).map(show).join(', ');
    return items.length > listed ? `${head}, and ${items.length - listed} more` : head;
  };
  const withList = (items, show) => (items.length ? ` (${list(items, show)})` : '');
  lines.push(`- Countries added: ${cmp.countriesAdded.length}${withList(cmp.countriesAdded, (c) => c)}${cmp.countriesAdded.length ? `, with ${cmp.observationsGainedWithCountries} yearly figures` : ''}`);
  lines.push(`- Countries removed: ${cmp.countriesRemoved.length}${withList(cmp.countriesRemoved, (c) => c)}${cmp.countriesRemoved.length ? `, taking ${cmp.observationsLostWithCountries} yearly figures with them` : ''}`);
  lines.push(`- Years added to countries already there: ${cmp.yearsAdded.length}${withList(cmp.yearsAdded, (y) => `${y.code} ${y.year}`)}`);
  lines.push(`- Years removed from countries that remain: ${cmp.yearsRemoved.length}${withList(cmp.yearsRemoved, (y) => `${y.code} ${y.year}`)}`);
  lines.push(`- Past values changed: ${cmp.changed.length}. Of these, ${cmp.settledChanges.length} are from more than ${SETTLED_AFTER_YEARS} years before the latest year, and ${cmp.largeChanges.length} changed by a large amount (more than 5 points and more than half the figure)`);
  if (cmp.largeChanges.length) {
    lines.push('', '| Country | Year | Before | After |', '|---|---|---|---|');
    for (const c of cmp.largeChanges.slice(0, listed)) lines.push(`| ${c.code} | ${c.year} | ${c.before} | ${c.after} |`);
    if (cmp.largeChanges.length > listed) lines.push(`| and ${cmp.largeChanges.length - listed} more | | | |`);
  }
  if (cmp.over.length) lines.push('', `**Over the limits:** ${cmp.over.join('; ')}.`);
  return lines.join('\n');
}

/**
 * A short name for one comparison: the committed data and the new data, their
 * fetch dates aside. A refused run prints it, and only a run told that same
 * name goes past the limits (#446): the data a person read is the data that is
 * accepted, and a fetch that brought anything else needs reading again.
 */
export function comparisonDigest(previous, next) {
  const strip = ({ fetchedAt: _ignored, ...rest }) => rest;
  return createHash('sha256').update(serializeDataset(strip(previous))).update('\n').update(serializeDataset(strip(next))).digest('hex').slice(0, 16);
}

/**
 * A made-up dataset for the workflow's dry run, built from the committed one
 * so the run needs no World Bank and gives the same result every time.
 * "accepted" is a small refresh (a new update date, one recent value revised a
 * little); "refused" also loses a country, which no refresh may do unasked.
 * Neither is real data: a dry run's pull request is closed, never merged.
 */
export function dryRunDataset(previous, kind) {
  const next = JSON.parse(JSON.stringify(previous));
  next.lastUpdated = '2099-01-01';
  const years = next.countries.USA.years;
  const last = Object.keys(years).sort().at(-1);
  years[last] = round2(years[last] + 0.01);
  if (kind === 'refused') {
    const gone = Object.keys(next.countries).filter((c) => !REQUIRED.includes(c)).sort()[0];
    delete next.countries[gone];
  } else if (kind !== 'accepted') {
    throw new Error(`unknown dry run "${kind}": use "accepted" or "refused"`);
  }
  return next;
}
