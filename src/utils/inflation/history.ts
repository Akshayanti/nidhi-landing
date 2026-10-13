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
 * The page embeds the one country it starts with (India on the Hindi page) in
 * the island's props, and the island fetches this file, once, when a reader
 * picks another. The World Bank itself is never contacted from a browser.
 *
 * Browser-safe: the island imports `fromCompact`. The data file itself is
 * imported only by server code.
 */
import type { Series } from './math.ts';

/** The calculator's own address, for the nav, the footer and the hub. */
export const INFLATION_URL = '/free/inflation-calculator/';

/** Where the compact history is served, on the site's own origin. */
export const HISTORY_URL = '/data/inflation-history.json';

/** One country: its first year and a rate for every year from then on, `null` for a gap. */
export type CompactSeries = [number, (number | null)[]];

export interface CompactHistory {
  updated: string;
  countries: Record<string, CompactSeries>;
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

/** One country's years, as a first year and a dense list with nulls for gaps. */
export function toCompactSeries(years: Record<string, number>): CompactSeries | null {
  const keys = Object.keys(years)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return null;
  const first = keys[0];
  const last = keys[keys.length - 1];
  const values: (number | null)[] = [];
  for (let y = first; y <= last; y++) values.push(String(y) in years ? years[String(y)] : null);
  return [first, values];
}

/** The whole file, compacted, countries in code order. */
export function toCompact(file: WorldBankFile): CompactHistory {
  const countries: Record<string, CompactSeries> = {};
  for (const code of Object.keys(file.countries).sort()) {
    const compact = toCompactSeries(file.countries[code].years);
    if (compact) countries[code] = compact;
  }
  return { updated: file.lastUpdated, countries };
}

/** Back to a year-keyed series, gaps as missing keys. Tolerates a malformed entry by returning an empty series. */
export function fromCompact(entry: unknown): Series {
  const out: Series = {};
  if (!Array.isArray(entry) || entry.length !== 2) return out;
  const [first, values] = entry as [unknown, unknown];
  if (typeof first !== 'number' || !Number.isInteger(first) || !Array.isArray(values)) return out;
  values.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) out[first + i] = v;
  });
  return out;
}
