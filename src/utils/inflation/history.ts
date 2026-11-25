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
 * A country the BIS publishes a monthly price index for carries a third item
 * (`monthly.ts`): the month an answer may end at and the step to it from the
 * last year's average, `["2026-09", 1.0394]`, or the reason its months are
 * not joined, `"mismatch"`. `monthly` in the file is the day those months
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
import { monthlyJoin, type MonthlyJoin, type WithheldReason } from './monthly.ts';

/** The calculator's own address, for the nav, the footer and the hub. */
export const INFLATION_URL = '/free/inflation-calculator/';

/** Where the compact history is served, on the site's own origin. */
export const HISTORY_URL = '/data/inflation-history.json';

/** The month an answer may end at with its factor, or why a country's months are not joined. */
export type CompactEnd = [string, number] | WithheldReason;

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

/** The shape of `src/data/inflation/bis-monthly.json`. */
export interface MonthlyFile {
  source: string;
  terms: string;
  dataflow: string;
  unit: string;
  fetchedAt: string;
  firstMonth: string;
  countries: Record<string, { area: string; months: Record<string, number> }>;
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
 * With the country's code and its months, the join to them follows.
 */
export function toCompactSeries(years: Record<string, number>, code?: string, months?: Record<string, number>): CompactSeries | null {
  const keys = Object.keys(years)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return null;
  const first = keys[0];
  const last = keys[keys.length - 1];
  const values: (number | null)[] = [];
  for (let y = first; y <= last; y++) values.push(String(y) in years ? years[String(y)] : null);
  if (code === undefined || months === undefined) return [first, values];
  const join = monthlyJoin(code, years, months);
  return [first, values, 'withheld' in join ? join.withheld : [join.month, join.factor]];
}

/** The whole file, compacted, countries in code order, with the monthly join where there are months. */
export function toCompact(file: WorldBankFile, monthly?: MonthlyFile): CompactHistory {
  const countries: Record<string, CompactSeries> = {};
  for (const code of Object.keys(file.countries).sort()) {
    const compact = toCompactSeries(file.countries[code].years, code, monthly?.countries[code]?.months);
    if (compact) countries[code] = compact;
  }
  return monthly ? { updated: file.lastUpdated, monthly: monthly.fetchedAt, countries } : { updated: file.lastUpdated, countries };
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

const WITHHELD_REASONS: readonly WithheldReason[] = ['mismatch', 'incomplete', 'no-later-month', 'listed'];

/**
 * The monthly join a compact entry carries, or null when it carries none (a
 * country with no monthly index) or one this code cannot read: then the
 * answer ends at the last full year, as it would without it.
 */
export function joinFromCompact(entry: unknown): MonthlyJoin | null {
  if (!Array.isArray(entry) || entry.length !== 3) return null;
  const end: unknown = entry[2];
  if (typeof end === 'string') return (WITHHELD_REASONS as readonly string[]).includes(end) ? { withheld: end as WithheldReason } : null;
  if (!Array.isArray(end) || end.length !== 2) return null;
  const [month, factor] = end as [unknown, unknown];
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) return null;
  return { month, factor };
}
