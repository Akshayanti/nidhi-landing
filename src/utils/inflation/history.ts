/**
 * The compact form of the World Bank inflation history that the page serves
 * from its own origin, and the conversions to and from it.
 *
 * `src/data/inflation/worldbank.json` is the repo's copy: readable, sorted,
 * reviewed in a pull request each month. A reader's browser gets something
 * smaller. `src/pages/data/inflation-history.json.ts` writes every country as
 * its first year and a list of yearly rates, `null` for a year with no figure:
 *
 *   { "updated": "2026-10-08", "countries": { "IND": [1960, [1.78, 1.7, ...]] } }
 *
 * A country with a monthly price index (the BIS's, or else the World Bank's
 * own) carries a third item (`monthly.ts`): the month an answer may end at,
 * the step to it from the last year's average and whose index it is,
 * `["2026-09", 1.0394, "bis"]` (with a fourth item, `"q"`, when the index
 * is a quarter's figure repeated for its months), or the reason its months
 * are not joined, `"mismatch"`. `monthly` in the file is the day those months
 * were fetched.
 *
 * The page embeds the one country it starts with (India on the Hindi page) in
 * the island's props, and the island fetches this file, once, when a reader
 * picks another. The World Bank itself is never contacted from a browser.
 *
 * Browser-safe: the island imports `fromCompact`. The data file itself is
 * imported only by server code.
 */
import type { Series } from './math.ts';
import { MONTHLY_SOURCES, bestJoin, type MonthlyJoin, type MonthlySeries, type MonthlySource, type WithheldReason } from './monthly.ts';

/** The calculator's own address, for the nav, the footer and the hub. */
export const INFLATION_URL = '/free/inflation-calculator/';

/** Where the compact history is served, on the site's own origin. */
export const HISTORY_URL = '/data/inflation-history.json';

/** The month an answer may end at with its factor and its source, or why a country's months are not joined. */
export type CompactEnd = [string, number, MonthlySource] | [string, number, MonthlySource, 'q'] | WithheldReason;

/**
 * One country: its first year and a rate for every year from then on, `null`
 * for a gap; then, where the BIS has a monthly index for it, its `CompactEnd`.
 */
export type CompactSeries = [number, (number | null)[]] | [number, (number | null)[], CompactEnd];

export interface CompactHistory {
  updated: string;
  /** The day the monthly index was fetched, when the file carries one. */
  monthly?: string;
  countries: Record<string, CompactSeries>;
}

/** What the join reads of a monthly file: `src/data/inflation/bis-monthly.json` or `worldbank-monthly.json`. */
export interface MonthlyFile {
  source: string;
  fetchedAt: string;
  firstMonth: string;
  /** The World Bank's own date for its monthly database; the BIS file has none. */
  lastUpdated?: string;
  countries: Record<string, { area: string; months: Record<string, number> }>;
}

/** The monthly files, by source. */
export type MonthlyFiles = Partial<Record<MonthlySource, MonthlyFile>>;

/**
 * A country's months in every source that has it, in the order the sources
 * are tried. `asOf` is the day their age is measured from: the day of the build.
 */
export function monthlySeriesFor(code: string, files: MonthlyFiles, asOf: string): MonthlySeries[] {
  const out: MonthlySeries[] = [];
  for (const source of MONTHLY_SOURCES) {
    const months = files[source]?.countries[code]?.months;
    if (months) out.push({ source, months, asOf });
  }
  return out;
}

/** The shape of `src/data/inflation/worldbank.json`. */
export interface WorldBankFile {
  source: string;
  license: string;
  indicator: string;
  lastUpdated: string;
  fetchedAt: string;
  countries: Record<string, { iso2: string; years: Record<string, number> }>;
}

/**
 * One country's years, as a first year and a dense list with nulls for gaps.
 * With the country's code and its months, from one source or several, the
 * join to them follows.
 */
export function toCompactSeries(years: Record<string, number>, code?: string, series?: readonly MonthlySeries[]): CompactSeries | null {
  const keys = Object.keys(years)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return null;
  const first = keys[0];
  const last = keys[keys.length - 1];
  const values: (number | null)[] = [];
  for (let y = first; y <= last; y++) values.push(String(y) in years ? years[String(y)] : null);
  if (code === undefined || series === undefined) return [first, values];
  const join = bestJoin(code, years, series);
  if (join === null) return [first, values];
  if ('withheld' in join) return [first, values, join.withheld];
  return [first, values, join.quarterly ? [join.month, join.factor, join.source, 'q'] : [join.month, join.factor, join.source]];
}

/**
 * The whole file, compacted, countries in code order, with the monthly join
 * where a source has months. `asOf` is the day of the build, which a month's
 * age is measured from.
 */
export function toCompact(file: WorldBankFile, monthly?: MonthlyFiles, asOf = ''): CompactHistory {
  const countries: Record<string, CompactSeries> = {};
  for (const code of Object.keys(file.countries).sort()) {
    const compact = toCompactSeries(file.countries[code].years, code, monthly && monthlySeriesFor(code, monthly, asOf));
    if (compact) countries[code] = compact;
  }
  if (!monthly) return { updated: file.lastUpdated, countries };
  // The latest of the sources' days: they are refreshed in one run.
  const fetched = MONTHLY_SOURCES.map((source) => monthly[source]?.fetchedAt).filter((day): day is string => day !== undefined).sort();
  return fetched.length > 0 ? { updated: file.lastUpdated, monthly: fetched[fetched.length - 1], countries } : { updated: file.lastUpdated, countries };
}

/** Back to a year-keyed series, gaps as missing keys. Tolerates a malformed entry by returning an empty series. */
export function fromCompact(entry: unknown): Series {
  const out: Series = {};
  if (!Array.isArray(entry) || (entry.length !== 2 && entry.length !== 3)) return out;
  const [first, values] = entry as [unknown, unknown];
  if (typeof first !== 'number' || !Number.isInteger(first) || !Array.isArray(values)) return out;
  values.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) out[first + i] = v;
  });
  return out;
}

const WITHHELD_REASONS: readonly WithheldReason[] = ['mismatch', 'incomplete', 'no-later-month', 'stale', 'listed'];

/**
 * The monthly join a compact entry carries, or null when it carries none (a
 * country with no monthly index) or one this code cannot read: then the
 * answer ends at the last full year, as it would without it.
 */
export function joinFromCompact(entry: unknown): MonthlyJoin | null {
  if (!Array.isArray(entry) || entry.length !== 3) return null;
  const end: unknown = entry[2];
  if (typeof end === 'string') return (WITHHELD_REASONS as readonly string[]).includes(end) ? { withheld: end as WithheldReason } : null;
  if (!Array.isArray(end) || (end.length !== 3 && end.length !== 4)) return null;
  const [month, factor, source] = end as [unknown, unknown, unknown];
  if (end.length === 4 && end[3] !== 'q') return null;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) return null;
  if (typeof source !== 'string' || !(MONTHLY_SOURCES as readonly string[]).includes(source)) return null;
  return end.length === 4 ? { month, factor, source: source as MonthlySource, quarterly: true } : { month, factor, source: source as MonthlySource };
}
