/**
 * Worked examples behind the homepage hero charts. Every value a visitor can
 * read off those charts (by hovering) comes from these calculations and the
 * assumptions stated beside them, so the examples stay internally consistent.
 *
 * All amounts are in euros of today's money; growth is a steady 5% a year
 * after inflation, the middle of the long-run range used across the site,
 * applied monthly, with savings added at the start of each month.
 */

export const EXAMPLE_RETURN = 0.05;
const MONTHLY_GROWTH = Math.pow(1 + EXAMPLE_RETURN, 1 / 12);

/** Balance after each month: index 0 is the start. */
export function monthlyPath(start: number, monthly: number, months: number): number[] {
  const out = [start];
  let b = start;
  for (let m = 0; m < months; m++) {
    b = (b + monthly) * MONTHLY_GROWTH;
    out.push(b);
  }
  return out;
}

/** Year-end balances: index 0 is the start. */
export function yearlyPath(start: number, monthly: number, years: number): number[] {
  const months = monthlyPath(start, monthly, years * 12);
  return months.filter((_, i) => i % 12 === 0);
}

/** Slide 1: the last twelve months and the next twelve, at the same saving rate. */
export const NET_WORTH_PATH = {
  startAYearAgo: 100_000,
  monthly: 1_500,
};
export function netWorthPath() {
  const values = monthlyPath(NET_WORTH_PATH.startAYearAgo, NET_WORTH_PATH.monthly, 24);
  return { values, todayIndex: 12, today: values[12] };
}

/** Slides 3 and 4: one household. 38% of a 4,000 monthly income saved. */
export const HOUSEHOLD = {
  start: 60_000,
  income: 4_000,
  savingsRate: 0.38,
  /** Financial independence target: 25 times yearly spending (a 4% withdrawal rate). */
  fiMultiple: 25,
};

export function fiProjection(years = 25) {
  const monthly = HOUSEHOLD.income * HOUSEHOLD.savingsRate;
  const spending = HOUSEHOLD.income - monthly;
  const target = spending * 12 * HOUSEHOLD.fiMultiple;
  const values = yearlyPath(HOUSEHOLD.start, monthly, years);
  const fiYear = values.findIndex((v) => v >= target);
  return { values, target, monthly, spending, fiYear: fiYear < 0 ? null : fiYear };
}

/** Slide 4: the same household saving five percentage points more of its income. */
export function whatIf(years = 20, extraPoints = 5) {
  const current = HOUSEHOLD.income * HOUSEHOLD.savingsRate;
  const more = current + (HOUSEHOLD.income * extraPoints) / 100;
  const base = yearlyPath(HOUSEHOLD.start, current, years);
  const higher = yearlyPath(HOUSEHOLD.start, more, years);
  return { base, higher, extraPerMonth: more - current, difference: higher[years] - base[years] };
}
