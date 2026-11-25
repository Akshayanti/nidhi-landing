/**
 * The join between a country's yearly inflation history (World Bank) and a
 * monthly consumer price index (BIS), which lets an answer end at the latest
 * month with a figure instead of the last full year.
 *
 * The yearly figures carry an amount from the average prices of a starting
 * year to the average prices of the last year with a figure, the link year.
 * One more step carries it on to a month:
 *
 *   index of that month / mean of the index over the link year's 12 months
 *
 * That step is exact only if both sources follow the same price index. So a
 * country's months are joined only when the index's own yearly changes agree
 * with the World Bank's for the last years both have, the link year included
 * (the financial review's rule, Nov 25, 2026): within `TOLERANCE_POINTS`
 * percentage points, or `TOLERANCE_SHARE` of the World Bank's rate where
 * inflation is high. Otherwise the country keeps its yearly answer and the
 * page says why.
 *
 * Decided at build time (`history.ts` calls this for the file the site
 * serves), from the two committed data files. Pure: no network, no clock.
 */

/** How far the index's yearly change may sit from the World Bank's, in percentage points. */
export const TOLERANCE_POINTS = 0.2;
/** Or this share of the World Bank's rate, whichever is larger: a 60% year is not held to 0.2 points. */
export const TOLERANCE_SHARE = 0.02;
/** Years compared, ending with the link year. */
export const YEARS_COMPARED = 5;
/** Fewer years than this with a figure in both sources is too little to go on. */
export const YEARS_NEEDED = 3;

/**
 * Countries whose months are never joined, whatever the figures say, each
 * with the reason. For a difference in what the two indices measure that the
 * comparison of yearly changes would not catch. Reviewed in pull requests.
 */
export const WITHHELD: Readonly<Record<string, string>> = {};

/** Why a country that has monthly figures keeps its yearly answer. */
export type WithheldReason =
  /** The index's yearly changes differ from the World Bank's by more than the tolerance. */
  | 'mismatch'
  /** A month of the link year is missing, or too few years can be compared. */
  | 'incomplete'
  /** The index has no month after the link year. */
  | 'no-later-month'
  /** Named in `WITHHELD`. */
  | 'listed';

/** The month an answer ends at (`YYYY-MM`) and the step from the link year's average to it. */
export interface MonthlyEnd {
  month: string;
  factor: number;
}

export type MonthlyJoin = MonthlyEnd | { withheld: WithheldReason };

/** The mean of the index over a calendar year, or null if any of its 12 months is missing. */
export function yearMean(months: Readonly<Record<string, number>>, year: number): number | null {
  let sum = 0;
  for (let m = 1; m <= 12; m++) {
    const v = months[`${year}-${String(m).padStart(2, '0')}`];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
    sum += v;
  }
  return sum / 12;
}

/** The yearly change the index itself implies, in percent: one year's mean over the year before's. */
export function impliedYearlyRate(months: Readonly<Record<string, number>>, year: number): number | null {
  const now = yearMean(months, year);
  const before = yearMean(months, year - 1);
  return now === null || before === null ? null : (now / before - 1) * 100;
}

/** Whether the index's yearly change is close enough to the World Bank's to be the same index. */
export function ratesAgree(implied: number, worldBank: number): boolean {
  return Math.abs(implied - worldBank) <= Math.max(TOLERANCE_POINTS, TOLERANCE_SHARE * Math.abs(worldBank));
}

/** Six decimals: far below what an amount shows, and a stable file. */
function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * The join for one country: the month and the factor, or why not.
 * `years` is the World Bank's series (year to percent), `months` the index
 * (`YYYY-MM` to its value).
 */
export function monthlyJoin(code: string, years: Readonly<Record<string, number>>, months: Readonly<Record<string, number>>): MonthlyJoin {
  if (Object.hasOwn(WITHHELD, code)) return { withheld: 'listed' };
  const yearKeys = Object.keys(years).map(Number);
  const monthKeys = Object.keys(months).sort();
  if (yearKeys.length === 0 || monthKeys.length === 0) return { withheld: 'incomplete' };
  const link = Math.max(...yearKeys);
  const mean = yearMean(months, link);
  if (mean === null) return { withheld: 'incomplete' };
  const month = monthKeys[monthKeys.length - 1];
  if (month <= `${link}-12`) return { withheld: 'no-later-month' };

  let compared = 0;
  for (let y = link; y > link - YEARS_COMPARED; y--) {
    const worldBank = years[String(y)];
    const implied = impliedYearlyRate(months, y);
    if (typeof worldBank !== 'number' || implied === null) {
      // The link year is the one the join stands on: it must be comparable.
      if (y === link) return { withheld: 'incomplete' };
      continue;
    }
    if (!ratesAgree(implied, worldBank)) return { withheld: 'mismatch' };
    compared += 1;
  }
  if (compared < YEARS_NEEDED) return { withheld: 'incomplete' };
  return { month, factor: round6(months[month] / mean) };
}
