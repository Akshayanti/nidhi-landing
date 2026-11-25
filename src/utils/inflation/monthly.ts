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

/** A latest month more than this many months before the day the site is built is too old to end an answer at. */
export const STALE_AFTER_MONTHS = 6;

/**
 * Countries whose months are never joined, whatever the figures say, each
 * with the reason. For a difference in what the two indices measure that the
 * comparison of yearly changes would not catch. Reviewed in pull requests.
 */
export const WITHHELD: Readonly<Record<string, string>> = {};

/** A year accepted although the two figures differ: the figures that were reviewed, and the evidence. */
export interface AcceptedYear {
  /** The World Bank's yearly figure as reviewed, in percent. */
  worldBank: number;
  /** The yearly change the monthly index implied as reviewed, in percent. */
  implied: number;
  evidence: string;
}

/** How far each figure may sit from the one reviewed and still be the case that was reviewed: rounding, no more. */
export const ACCEPTED_WORLD_BANK_WITHIN = 0.005;
export const ACCEPTED_IMPLIED_WITHIN = 0.05;

/**
 * Years taken as agreeing although the World Bank's yearly figure sits
 * outside the tolerance, each with the figures reviewed and the evidence.
 * Only for a year where the monthly index is shown to be the country's own
 * official one, so that the yearly figure is the one that differs. The
 * exception holds only while both figures are the ones reviewed: a revision
 * of either is a new case, and is a mismatch until it is reviewed (or agrees,
 * when the entry is removed). The answer still carries the World Bank's
 * figure for that year. Reviewed in pull requests, and said on the page.
 */
export const ACCEPTED_YEARS: Readonly<Record<string, Readonly<Record<number, AcceptedYear>>>> = {
  IND: {
    2025: {
      worldBank: 2.4,
      implied: 2.18,
      evidence:
        'India\'s statistics office (MOSPI, all-India combined index, base 2012) averages 195.08 in 2025 and 190.88 in 2024: 2.20%. '
        + 'The BIS index gives 2.18% and the World Bank\'s own monthly index the same; the World Bank\'s yearly figure is 2.40. '
        + 'For 2020 to 2024 the monthly indices and the yearly figures agree within 0.03 points. Checked Nov 25, 2026; owner\'s decision the same day.',
    },
  },
};

/** Whether a year that does not agree is the accepted case, with both figures as they were reviewed. */
export function isAcceptedYear(code: string, year: number, implied: number, worldBank: number): boolean {
  if (!Object.hasOwn(ACCEPTED_YEARS, code) || !Object.hasOwn(ACCEPTED_YEARS[code], year)) return false;
  const reviewed = ACCEPTED_YEARS[code][year];
  return Math.abs(worldBank - reviewed.worldBank) <= ACCEPTED_WORLD_BANK_WITHIN && Math.abs(implied - reviewed.implied) <= ACCEPTED_IMPLIED_WITHIN;
}

/** Why a country that has monthly figures keeps its yearly answer. */
export type WithheldReason =
  /** The index's yearly changes differ from the World Bank's by more than the tolerance. */
  | 'mismatch'
  /** A month of the link year is missing, or too few years can be compared. */
  | 'incomplete'
  /** The index has no month after the link year. */
  | 'no-later-month'
  /** Its latest month is more than `STALE_AFTER_MONTHS` before the day the site is built. */
  | 'stale'
  /** Named in `WITHHELD`. */
  | 'listed';

/** Where a country's months come from, in the order they are tried. */
export const MONTHLY_SOURCES = ['bis', 'worldBank'] as const;
export type MonthlySource = (typeof MONTHLY_SOURCES)[number];

/** The month an answer ends at (`YYYY-MM`), the step from the link year's average to it, and whose index it is. */
export interface MonthlyEnd {
  month: string;
  factor: number;
  source: MonthlySource;
  /** Set when the index is a quarter's figure repeated for each of its months: the month named carries its quarter's. */
  quarterly?: true;
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

/** Whole months from `month` (`YYYY-MM`) to the month of `day` (`YYYY-MM-DD`). */
export function monthsBefore(month: string, day: string): number {
  return (Number(day.slice(0, 4)) - Number(month.slice(0, 4))) * 12 + (Number(day.slice(5, 7)) - Number(month.slice(5, 7)));
}

/**
 * One source's months for a country, and the day their age is measured from:
 * the day the site is built, not the day the file was fetched, which stands
 * still when a refresh finds nothing new.
 */
export interface MonthlySeries {
  source: MonthlySource;
  months: Readonly<Record<string, number>>;
  asOf: string;
}

/** The three months of a quarter, by the quarter's number from year 0: `YYYY-MM` each. */
function quarterMonths(quarter: number): string[] {
  const year = Math.floor(quarter / 4);
  return [1, 2, 3].map((n) => `${year}-${String((quarter % 4) * 3 + n).padStart(2, '0')}`);
}

/**
 * Whether the index is published by quarter and repeated for each month: the
 * months so far of the latest month's quarter all carry one figure, and so do
 * all three months of each of the two quarters before it.
 */
export function isQuarterly(months: Readonly<Record<string, number>>, latest: string): boolean {
  const quarter = Number(latest.slice(0, 4)) * 4 + Math.floor((Number(latest.slice(5, 7)) - 1) / 3);
  const same = (keys: string[]) => keys.every((k) => typeof months[k] === 'number' && months[k] === months[keys[0]]);
  return same(quarterMonths(quarter).filter((k) => k <= latest)) && same(quarterMonths(quarter - 1)) && same(quarterMonths(quarter - 2));
}

/**
 * The join for one country from one source: the month and the factor, or why
 * not. `years` is the World Bank's yearly series (year to percent), `months`
 * the index (`YYYY-MM` to its value), `asOf` the day its age is measured from.
 */
export function monthlyJoin(code: string, years: Readonly<Record<string, number>>, { source, months, asOf }: MonthlySeries): MonthlyJoin {
  if (Object.hasOwn(WITHHELD, code)) return { withheld: 'listed' };
  const yearKeys = Object.keys(years).map(Number);
  const monthKeys = Object.keys(months).sort();
  if (yearKeys.length === 0 || monthKeys.length === 0) return { withheld: 'incomplete' };
  const link = Math.max(...yearKeys);
  const mean = yearMean(months, link);
  if (mean === null) return { withheld: 'incomplete' };
  const month = monthKeys[monthKeys.length - 1];
  if (month <= `${link}-12`) return { withheld: 'no-later-month' };
  if (monthsBefore(month, asOf) > STALE_AFTER_MONTHS) return { withheld: 'stale' };

  let compared = 0;
  for (let y = link; y > link - YEARS_COMPARED; y--) {
    const worldBank = years[String(y)];
    const implied = impliedYearlyRate(months, y);
    if (typeof worldBank !== 'number' || implied === null) {
      // The link year is the one the join stands on: it must be comparable.
      if (y === link) return { withheld: 'incomplete' };
      continue;
    }
    if (!ratesAgree(implied, worldBank) && !isAcceptedYear(code, y, implied, worldBank)) return { withheld: 'mismatch' };
    compared += 1;
  }
  if (compared < YEARS_NEEDED) return { withheld: 'incomplete' };
  const end: MonthlyEnd = { month, factor: round6(months[month] / mean), source };
  return isQuarterly(months, month) ? { ...end, quarterly: true } : end;
}

/**
 * The join for one country across its sources, tried in the order given: the
 * first that joins is the answer's. If none does, the reason is the first
 * source's, the one that would have been used. Null when no source has the
 * country at all.
 */
export function bestJoin(code: string, years: Readonly<Record<string, number>>, series: readonly MonthlySeries[]): MonthlyJoin | null {
  let first: MonthlyJoin | null = null;
  for (const one of series) {
    const join = monthlyJoin(code, years, one);
    if (!('withheld' in join)) return join;
    first ??= join;
  }
  return first;
}
