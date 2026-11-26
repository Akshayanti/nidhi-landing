/**
 * Small loans for the tests of the loan comparison's summary, its result rows
 * and its announcement. Each is worked out by hand in its comment, so a test
 * can state the figure a reader should see without asking the engine for it.
 * Amounts are in cents; the tests show them in euros.
 */
import { computeLoan, type LoanResult, type RateSpec } from '../src/utils/loan/math.ts';

const hybrid = (initialMonths: number, later: number, keeps?: 'payment', first = 0): RateSpec => ({
  kind: 'hybrid',
  initialAnnualRate: first,
  initialMonths,
  subsequentAnnualRate: later,
  keeps,
});

const over = (months: number) => ({ kind: 'term' as const, months });

/** 1,200.00 at 0% over 12 months: 100.00 a month, 1,200.00 in all, no interest. */
export const plain = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0 }, over(12));

/**
 * 1,200.00 at 12% a year (1% a month) over 2 months. The payment is
 * 1,200 x 0.01 / (1 - 1.01^-2) = 609.01. Month 1: 12.00 of interest, 597.01
 * off the loan, 602.99 left. Month 2: 6.03 of interest, 609.02 to close.
 * 1,218.03 in all, 18.03 of it interest.
 */
export const dear = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0.12 }, over(2));

/** Ten times `dear`: 12,000.00 at 12% over 2 months, 6,090.15 a month, 12,180.30 in all, 180.30 of interest. */
export const large = (): LoanResult => computeLoan({ principalMinor: 1_200_000, annualRate: 0.12 }, over(2));

/** `plain` with a fee of 60.00: 1,260.00 in all, and an APR above zero (see `aprOfLevelLoan`). */
export const withFee = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, feeMinor: 6_000 }, over(12));

/** `plain` with a fee as large as the loan: nothing is received, so there is no APR. */
export const allFee = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, feeMinor: 120_000 }, over(12));

/** What the engine returns for a loan amount of zero: an error and no schedule. */
export const invalid = (): LoanResult => computeLoan({ principalMinor: 0, annualRate: 0 }, over(12));

/**
 * 1,200.00 over 12 months, 0% for 6 months and 12% after, the payment worked
 * out again at the change. Six payments of 100.00 leave 600.00; over the six
 * months left at 1% a month that is 600 x 0.01 / (1 - 1.01^-6) = 103.53.
 */
export const stepped = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(6, 0.12) }, over(12));

/**
 * The same with the rate changing after one month: 1,100.00 left over 11
 * months at 1% a month is 1,100 x 0.01 / (1 - 1.01^-11) = 106.10 from month 2.
 */
export const steppedEarly = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(1, 0.12) }, over(12));

/**
 * The same with the rate changing for the last month only: 100.00 is left,
 * and it costs 1.00 of interest, so month 12 is one closing payment of 101.00.
 */
export const steppedLast = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(11, 0.12) }, over(12));

/**
 * `stepped` with 200.00 extra each month: 300.00 a month pays the loan off in
 * month 4, before the rate changes in month 7.
 */
export const paidBeforeChange = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 0, extraMonthlyMinor: 20_000, rateSpec: hybrid(6, 0.12) }, over(12));

/**
 * `stepped` with the payment kept at 100.00. From 600.00 at 1% a month the
 * interest is 6.00, 5.06, 4.11, 3.15, 2.18 and 1.21: 21.71. The last month of
 * the term clears what is left, so the loan ends on its term of 12 months at
 * 1,221.71 in all.
 */
export const keptOnTerm = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(6, 0.12, 'payment') }, over(12));

/**
 * The payment kept at 100.00 while the rate goes to 60% (5% a month). From
 * 600.00 the interest is 30.00, 26.50, 22.83, 18.97, 14.92 and 10.66, which
 * leaves 123.88 at the end of the term: more than a payment, so the loan runs
 * on. Month 13: 6.19 of interest, 30.07 left. Month 14: 1.50 and it is paid
 * off, 2 months later than its term, with 131.57 of interest: 1,331.57 in all.
 */
export const keptLater = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(6, 0.6, 'payment') }, over(12));

/**
 * 120% a year (10% a month) for one month, then 0%, the payment kept. The
 * payment is 1,200 x 0.1 / (1 - 1.1^-12) = 176.12. Month 1: 120.00 of interest,
 * 1,143.88 left. At 0% that is six payments of 176.12 and a seventh of 87.16:
 * paid off in month 8, 4 months earlier than its term, 1,320.00 in all.
 */
export const keptEarlier = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 1.2, rateSpec: hybrid(1, 0, 'payment', 1.2) }, over(12));

/**
 * The payment kept at 100.00 while the rate goes to 120% after one month:
 * 1,100.00 left costs 110.00 a month, more than the payment, from month 2.
 * The balance grows and the loan is never paid off.
 */
export const neverLess = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: hybrid(1, 1.2, 'payment') }, over(12));

/**
 * 12,000.00 with the payment kept at 1,000.00 while the rate goes to 120%
 * after two months: 10,000.00 left costs exactly 1,000.00 a month from month
 * 3. The balance stands still and the loan is never paid off.
 */
export const neverEqual = (): LoanResult =>
  computeLoan({ principalMinor: 1_200_000, annualRate: 0, rateSpec: hybrid(2, 1.2, 'payment') }, over(12));

/**
 * The engine's own example of a balance still falling when the calculation
 * stops at 1,200 months: 1,000,000.00 over 360 months, 8.45% for 60 months,
 * then 9.622% with the payment kept at 7,653.73.
 */
export const beyondLimit = (): LoanResult =>
  computeLoan({ principalMinor: 100_000_000, annualRate: 0.0845, rateSpec: hybrid(60, 0.09622, 'payment', 0.0845) }, over(360));

/**
 * The yearly rate (monthly rate x 12) at which `count` payments of `payment`
 * are worth `received` today, found by halving: the APR of a level loan,
 * worked out apart from the engine.
 */
export function aprOfLevelLoan(received: number, payment: number, count: number): number {
  const worth = (monthly: number) => {
    let sum = 0;
    for (let m = 1; m <= count; m++) sum += payment / (1 + monthly) ** m;
    return sum;
  };
  let low = 0;
  let high = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (worth(mid) > received) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 12;
}
