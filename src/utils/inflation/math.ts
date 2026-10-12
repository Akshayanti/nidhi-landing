/**
 * The inflation calculator's arithmetic. Browser-safe and dependency-free:
 * the island imports it, and so do the tests.
 *
 * Four questions, one convention: a rate is a yearly percentage, compounded
 * once a year, held the same every year unless a country's actual history is
 * used instead. Percentages go in as percent (3 means 3%), not as fractions,
 * because that is what a reader types and what the World Bank publishes.
 *
 *   What will it buy?   A / (1 + i)^n          today's money, n years on
 *   What will it cost?  A * (1 + i)^n          a price, n years on
 *   Past to today       A * (1 + i)^n          or A * prod(1 + r_t) with history
 *   Keeping up          (1 + g) / (1 + i) - 1  the exact real rate
 *
 * Nothing here rounds for display except `roundAbout`, which is what keeps a
 * result from claiming a precision that a guessed rate cannot carry.
 */

import { parseLocaleNumber } from '../shared/parseLocaleNumber.ts';

export type Mode = 'buy' | 'cost' | 'past' | 'keep';
export const MODES: readonly Mode[] = ['buy', 'cost', 'past', 'keep'];

/** The rate box accepts 0 to 10,000% a year, so hyperinflation can be typed. */
export const MIN_RATE = 0;
export const MAX_RATE = 10_000;
/** A raise or a return can be negative (a pay cut, a loss), but not below -100%. */
export const MIN_GROWTH = -99.99;
export const MAX_GROWTH = 10_000;
export const MIN_YEARS = 1;
export const MAX_YEARS = 100;
export const MAX_AMOUNT = 1e12;
/** The comparison rates sit this many percentage points either side of the rate. */
export const BAND_POINTS = 1;
/** Above this, a result is shown as "more than" it rather than as a number. */
export const DISPLAY_CEILING = 1e15;

/** Growth over `years` years at `ratePct` percent a year, compounded yearly. */
export function growthFactor(ratePct: number, years: number): number {
  return Math.pow(1 + ratePct / 100, years);
}

/** What `amount` buys after `years` of inflation at `ratePct`, in today's money. */
export function whatItBuys(amount: number, ratePct: number, years: number): number {
  return amount / growthFactor(ratePct, years);
}

/** What something costing `amount` today costs after `years` at `ratePct`. */
export function whatItCosts(amount: number, ratePct: number, years: number): number {
  return amount * growthFactor(ratePct, years);
}

/**
 * The exact real rate, in percent: how fast buying power grows when money
 * grows at `growthPct` while prices rise at `inflationPct`. Not the shortcut
 * `growth - inflation`, which overstates it, and badly at high inflation.
 */
export function realRate(growthPct: number, inflationPct: number): number {
  return ((1 + growthPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** What `amount` growing at `growthPct` buys after `years`, in today's money. */
export function keepingUp(amount: number, growthPct: number, inflationPct: number, years: number): number {
  return amount * Math.pow((1 + growthPct / 100) / (1 + inflationPct / 100), years);
}

/** One mode's answer at a typed rate (no history). */
export function answer(mode: Mode, amount: number, ratePct: number, years: number, growthPct = 0): number {
  if (mode === 'buy') return whatItBuys(amount, ratePct, years);
  if (mode === 'keep') return keepingUp(amount, growthPct, ratePct, years);
  return whatItCosts(amount, ratePct, years);
}

/** The year-by-year path behind an answer, from year 0 to `years`. */
export function answerPath(mode: Mode, amount: number, ratePct: number, years: number, growthPct = 0): number[] {
  return Array.from({ length: years + 1 }, (_, t) => answer(mode, amount, ratePct, t, growthPct));
}

/**
 * The comparison rates either side of `ratePct`: one point lower, floored at
 * 0, and one point higher, capped at the largest rate the box accepts. A side
 * that would equal the rate itself (a rate of 0 has no lower side) is left out,
 * so the line under a result never repeats the result.
 */
export function bandRates(ratePct: number): { lower: number | null; higher: number | null } {
  const lower = Math.max(MIN_RATE, round2(ratePct - BAND_POINTS));
  const higher = Math.min(MAX_RATE, round2(ratePct + BAND_POINTS));
  return { lower: lower < ratePct ? lower : null, higher: higher > ratePct ? higher : null };
}

/** Two decimals, the precision a rate is typed and stored at. */
export function round2(v: number): number {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Rounds a result for display as "about ...": whole units below 100, three
 * significant figures from there up (740.19 -> 740, 13,439 -> 13,400). The
 * inputs are a guess at an average rate, so a figure to the cent would
 * promise a precision the rate cannot carry.
 */
export function roundAbout(v: number): number {
  if (!Number.isFinite(v)) return v;
  const abs = Math.abs(v);
  if (abs < 100) return Math.round(v);
  const mag = Math.pow(10, Math.floor(Math.log10(abs)) - 2);
  return Math.round(v / mag) * mag;
}

// ===========================================================================
// Validation of typed values, read by the page's number conventions (see
// src/utils/shared/parseLocaleNumber.ts): "2.5" and "10,000" on an English or
// Hindi page, "2,5" and "10.000" on a Spanish one. A rate or a raise has at
// most two decimals.
// ===========================================================================

/** Parses a typed percentage within [min, max], or returns null when it is not one. */
export function parsePercent(raw: string, min: number, max: number, locale = 'en'): number | null {
  const n = parseLocaleNumber(raw, locale, { maxDecimals: 2, allowNegative: min < 0 });
  return n !== null && n >= min && n <= max ? n : null;
}

/** Parses a typed whole number of years, or null. */
export function parseYears(raw: string): number | null {
  const v = raw.trim();
  if (!/^\d{1,3}$/.test(v)) return null;
  const n = Number(v);
  return n >= MIN_YEARS && n <= MAX_YEARS ? n : null;
}

/** Parses a typed amount from 0 to MAX_AMOUNT, to the cent at most, or null. */
export function parseAmount(raw: string, locale = 'en'): number | null {
  const n = parseLocaleNumber(raw, locale, { maxDecimals: 2 });
  return n !== null && n <= MAX_AMOUNT ? n : null;
}

// ===========================================================================
// A country's history: yearly inflation in percent, keyed by year. A year the
// World Bank has no figure for is simply absent, so a gap is a missing key.
// ===========================================================================

export type Series = Record<number, number>;

/** The years a series has a figure for, oldest first. */
export function seriesYears(series: Series): number[] {
  return Object.keys(series)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Years between the first and the last that have no figure. */
export function missingYears(series: Series): number[] {
  const years = seriesYears(series);
  if (years.length === 0) return [];
  const out: number[] = [];
  for (let y = years[0]; y <= years[years.length - 1]; y++) if (!(y in series)) out.push(y);
  return out;
}

/**
 * The first year of the unbroken run that ends with the latest year. A
 * starting year before it would have to skip a year with no figure, which
 * would understate how far prices rose, so the tool starts no earlier.
 */
export function unbrokenStart(series: Series): number | null {
  const years = seriesYears(series);
  if (years.length === 0) return null;
  let start = years[years.length - 1];
  while (start - 1 in series) start -= 1;
  return start;
}

/**
 * How much prices rose from `fromYear` to the latest year: the product of
 * (1 + r) over every year after `fromYear`. `missing` lists the years in that
 * span with no figure; they are left out of the product, so a caller must not
 * present a factor with missing years as the whole rise.
 */
export function cumulativeFactor(series: Series, fromYear: number): { factor: number; toYear: number | null; missing: number[] } {
  const years = seriesYears(series);
  if (years.length === 0) return { factor: 1, toYear: null, missing: [] };
  const toYear = years[years.length - 1];
  let factor = 1;
  const missing: number[] = [];
  for (let y = fromYear + 1; y <= toYear; y++) {
    if (y in series) factor *= 1 + series[y] / 100;
    else missing.push(y);
  }
  return { factor, toYear, missing };
}

/** What `amount` in `fromYear` corresponds to in each later year, through the latest. */
export function historyPath(series: Series, fromYear: number, amount: number): { year: number; value: number }[] {
  const { toYear } = cumulativeFactor(series, fromYear);
  if (toYear === null) return [];
  const out = [{ year: fromYear, value: amount }];
  let value = amount;
  for (let y = fromYear + 1; y <= toYear; y++) {
    if (y in series) value *= 1 + series[y] / 100;
    out.push({ year: y, value });
  }
  return out;
}

/** The geometric average of yearly rates in percent: the steady rate with the same total effect. */
export function geometricAverage(ratesPct: number[]): number {
  if (ratesPct.length === 0) return NaN;
  const product = ratesPct.reduce((p, r) => p * (1 + r / 100), 1);
  return (Math.pow(product, 1 / ratesPct.length) - 1) * 100;
}

/**
 * The geometric average over the `count` most recent years with a figure,
 * with the years it covers. `span` is the number of calendar years from the
 * first to the last, which is larger than `count` when the run has gaps.
 */
export function recentAverage(series: Series, count = 10): { average: number; first: number; last: number; count: number; span: number } | null {
  const years = seriesYears(series).slice(-count);
  if (years.length === 0) return null;
  const first = years[0];
  const last = years[years.length - 1];
  return {
    average: geometricAverage(years.map((y) => series[y])),
    first,
    last,
    count: years.length,
    span: last - first + 1,
  };
}

/** Groups years into runs for display: [2014, 2015, 2016, 2020] -> [[2014, 2016], [2020, 2020]]. */
export function yearRuns(years: number[]): [number, number][] {
  const sorted = [...years].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (const y of sorted) {
    const last = out[out.length - 1];
    if (last && y === last[1] + 1) last[1] = y;
    else out.push([y, y]);
  }
  return out;
}

/** The highest and the lowest year in a list of years, by rate. */
export function extremes(series: Series, years: number[]): { high: { year: number; rate: number }; low: { year: number; rate: number } } | null {
  const ys = years.filter((y) => y in series);
  if (ys.length === 0) return null;
  let high = ys[0];
  let low = ys[0];
  for (const y of ys) {
    if (series[y] > series[high]) high = y;
    if (series[y] < series[low]) low = y;
  }
  return { high: { year: high, rate: series[high] }, low: { year: low, rate: series[low] } };
}
