/**
 * The figures a loan comparison rests on, checked against loans small enough
 * to work by hand: totals, the payment after a rate change, the early
 * repayment charge, the APR, the points and refinance break-evens (#790).
 *
 * Every expected figure here is worked out in a comment or by a formula
 * written beside it, never read back from the function under test. Three
 * loans carry most of the file:
 *
 *   - 1,000.00 at 12% a year (1% a month) over 3 months. The payment is
 *     1000 x 0.01 / (1 - 1.01^-3) = 340.02.
 *       month 1: interest 10.00, principal 330.02, owed 669.98
 *       month 2: interest  6.70, principal 333.32, owed 336.66
 *       month 3: interest  3.37, principal 336.66, owed 0 (payment 340.03)
 *     Paid 1,020.07 in all, 20.07 of it interest.
 *   - 1,200.00 at 0% over 12 months: 100.00 a month, nothing else.
 *   - The first loan with its rate doubling to 24% (2% a month) after month 1.
 *     Worked out again for the 2 months left: 669.98 x 0.02 / (1 - 1.02^-2)
 *     = 345.07.
 *       month 2: interest 13.40, principal 331.67, owed 338.31
 *       month 3: interest  6.77, principal 338.31, owed 0 (payment 345.08)
 *     With the payment kept at 340.02 instead:
 *       month 2: interest 13.40, principal 326.62, owed 343.36
 *       month 3: interest  6.87, principal 343.36, owed 0 (payment 350.23)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_FIXED_MONTHS,
  OPTIONAL_UNREADABLE,
  RATE_NEVER_CHANGES,
  lumpPartUsedNote,
  lumpsUnusedNote,
  computeApr,
  computeLoan,
  emptyResult,
  equityAtMonth,
  formatApr,
  isNotPaidOff,
  pickSplitSamples,
  pointsBreakEven,
  pointsVerdict,
  refinanceBreakEven,
  refinanceComparison,
  shownMonths,
  type AmortizationRow,
  type LoanInputs,
  type LoanMode,
  type LoanResult,
  type RateSpec,
} from './math.ts';

const row = (month: number, payment: number, interest: number, principal: number, balance: number): AmortizationRow =>
  ({ month, payment, interest, principal, balance });
const term = (months: number): LoanMode => ({ kind: 'term', months });
const byPayment = (monthlyMinor: number): LoanMode => ({ kind: 'payment', monthlyMinor });
const sum = (rows: AmortizationRow[], field: 'payment' | 'interest' | 'principal') => rows.reduce((s, r) => s + r[field], 0);

/** 1,000.00 at 12% over 3 months, as worked in the header. */
const HAND_ROWS = [
  row(1, 34002, 1000, 33002, 66998),
  row(2, 34002, 670, 33332, 33666),
  row(3, 34003, 337, 33666, 0),
];
const HAND: LoanInputs = { principalMinor: 100000, annualRate: 0.12 };
const hand = (more: Partial<LoanInputs> = {}, mode: LoanMode = term(3)) => computeLoan({ ...HAND, ...more }, mode);

/** After month 11 of the loan below 100.00 is owed: a lump sum of 500.00 that month is used in part. */
const PART_11 = lumpPartUsedNote(11);

/** 1,200.00 at 0% over 12 months: 100.00 a month. */
const FLAT: LoanInputs = { principalMinor: 120000, annualRate: 0 };
const flat = (more: Partial<LoanInputs> = {}, mode: LoanMode = term(12)) => computeLoan({ ...FLAT, ...more }, mode);

/** The first loan with a rate that changes: 12% for `initialMonths`, then `subsequentAnnualRate`. */
const changing = (keeps: 'term' | 'payment' | undefined, initialMonths = 1, subsequentAnnualRate = 0.24): RateSpec =>
  ({ kind: 'hybrid', initialAnnualRate: 0.12, initialMonths, subsequentAnnualRate, ...(keeps ? { keeps } : {}) });

const TOO_LOW = "Monthly payment is too low to ever pay off the loan; it does not even cover the first month's interest.";
const NOT_IN_LIMIT = 'Loan does not amortize within 1200 months. Increase the monthly payment.';

// ---------------------------------------------------------------------------
// computeLoan
// ---------------------------------------------------------------------------

describe('a loan worked by hand comes out to the cent', () => {
  it('1,000.00 at 12% over 3 months: 340.02 a month, 1,020.07 in all', () => {
    const r = hand();
    assert.deepEqual(r.schedule, HAND_ROWS);
    assert.deepEqual(r.contractSchedule, HAND_ROWS);
    assert.equal(r.monthlyPaymentMinor, 34002);
    assert.equal(r.effectiveMonthlyMinor, 34002);
    assert.equal(r.months, 3);
    assert.equal(r.totalPaidMinor, 102007);
    assert.equal(r.totalInterestMinor, 2007);
    assert.equal(r.prepaymentPenaltyMinor, 0);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.error, undefined);
    assert.equal(r.rateChange, undefined);
    assert.equal(r.keptPayment, undefined);
  });

  it('the fee is paid on top of the payments, and an extra payment each month is part of what is paid monthly', () => {
    // 100.00 a month plus 20.00 extra clears 1,200.00 in 10 months.
    const r = flat({ feeMinor: 2500, extraMonthlyMinor: 2000 });
    assert.equal(r.monthlyPaymentMinor, 10000);
    assert.equal(r.effectiveMonthlyMinor, 12000);
    assert.equal(r.months, 10);
    assert.equal(r.totalPaidMinor, 120000 + 2500);
    assert.equal(r.totalInterestMinor, 0);
    assert.equal(r.feeMinor, 2500);
    // What the lender requires is still twelve payments of 100.00.
    assert.equal(r.contractSchedule.length, 12);
    assert.equal(sum(r.contractSchedule, 'payment'), 120000);
  });
});

describe('the limits on a term and on a fixed period', () => {
  it('a term of 1200 months is taken, one of 1201 is refused by name', () => {
    // 1,200.00 at 0% over 1200 months is 1.00 a month.
    const longest = flat({}, term(1200));
    assert.equal(longest.error, undefined);
    assert.equal(longest.months, 1200);
    assert.equal(longest.monthlyPaymentMinor, 100);
    assert.equal(longest.totalPaidMinor, 120000);
    const over = flat({}, term(1201));
    assert.equal(over.error, 'Term cannot exceed 1200 months.');
    assert.equal(over.months, 0);
  });

  it('a fixed period of 1200 months or more is taken, where it used to be refused: the rate never changes, and the result says so (issue 914)', () => {
    for (const initialMonths of [1200, 1201, 5000]) {
      const r = computeLoan({ ...FLAT, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths, subsequentAnnualRate: 0.12 } }, term(1200));
      assert.equal(r.error, undefined, String(initialMonths));
      assert.equal(r.months, 1200);
      // 1.00 a month at 0%: nothing is paid at the later rate.
      assert.equal(r.totalPaidMinor, 120000);
      assert.deepEqual(r.warnings, [RATE_NEVER_CHANGES]);
      assert.equal(r.rateChange, undefined);
    }
  });

  it('a fixed period of 1199 months leaves one payment at the new rate', () => {
    // 1.00 a month at 0% for 1199 months leaves 1.00; at 1% a month the last payment is 1.01.
    const r = computeLoan({ ...FLAT, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1199, subsequentAnnualRate: 0.12 } }, term(1200));
    assert.equal(r.error, undefined);
    assert.equal(r.months, 1200);
    assert.equal(r.totalPaidMinor, 120001);
    assert.deepEqual(r.rateChange, { month: 1200, paymentMinor: 101, last: true });
  });
});

describe('the month a rate changes in is a whole month, from the first (issue 914)', () => {
  const spec = (initialMonths: number, keeps?: 'payment'): RateSpec => changing(keeps, initialMonths);

  it('part of a month, zero, a negative month and a month that is no number are refused in words of their own', () => {
    for (const initialMonths of [0.5, 1.5, 60.4, 0, -1, -0.5, NaN, Infinity, -Infinity]) {
      const r = hand({ rateSpec: spec(initialMonths), feeMinor: 700 });
      assert.equal(r.error, INITIAL_FIXED_MONTHS, String(initialMonths));
      assert.deepEqual(r.schedule, []);
      assert.equal(r.feeMinor, 700);
    }
    assert.equal(INITIAL_FIXED_MONTHS, 'Initial fixed period must be a whole number of months, from 1 up.');
  });

  it('the first month is taken: the payment is worked out again from month 2, as in the header', () => {
    const r = hand({ rateSpec: spec(1) });
    assert.equal(r.error, undefined);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(r.rateChange, { month: 2, paymentMinor: 34507 });
  });

  it('a change one month before the end leaves a payment at the later rate, and no note', () => {
    const r = hand({ rateSpec: spec(2) });
    assert.deepEqual(r.warnings, []);
    assert.equal(r.rateChange?.month, 3);
  });

  it('a change in the last month of the term or after it never comes: the loan is the fixed one, with a note', () => {
    for (const initialMonths of [3, 4, 1200, 1201]) {
      for (const keeps of [undefined, 'payment'] as const) {
        const r = hand({ rateSpec: spec(initialMonths, keeps) });
        assert.equal(r.error, undefined);
        assert.deepEqual(r.schedule, HAND_ROWS, String(initialMonths));
        assert.equal(r.totalPaidMinor, 102007);
        assert.deepEqual(r.warnings, [RATE_NEVER_CHANGES], String(initialMonths));
        assert.equal(r.rateChange, undefined);
        assert.equal(r.keptPayment, undefined);
      }
    }
    assert.equal(RATE_NEVER_CHANGES, 'The rate does not change within this term, so the subsequent rate is not used.');
  });

  it('a fixed rate has no later rate, so no note', () => {
    assert.deepEqual(hand().warnings, []);
  });
});

describe('a lump sum larger than what is owed is said: only what is owed is paid (issue 925)', () => {
  it('names the month, and no amount', () => {
    assert.equal(PART_11, 'The lump sum in month 11 is more than is owed then, so only part of it is used.');
    assert.equal(lumpPartUsedNote(7), 'The lump sum in month 7 is more than is owed then, so only part of it is used.');
  });

  it('one cent more than is owed is more; exactly what is owed is all used, and gets no note', () => {
    // 100.00 a month leaves 600.00 after month 6.
    const exact = flat({ lumpSums: [{ month: 6, amountMinor: 60000 }] });
    assert.equal(exact.months, 6);
    assert.deepEqual(exact.warnings, []);
    const more = flat({ lumpSums: [{ month: 6, amountMinor: 60001 }] });
    assert.equal(more.months, 6);
    assert.equal(more.totalPaidMinor, 120000);
    assert.deepEqual(more.schedule, exact.schedule);
    assert.deepEqual(more.warnings, [lumpPartUsedNote(6)]);
    // One cent less is all used too, and the loan runs a month longer.
    const less = flat({ lumpSums: [{ month: 6, amountMinor: 59999 }] });
    assert.equal(less.months, 7);
    assert.deepEqual(less.warnings, []);
  });

  it('counts the lump sums of one month together, and says it once', () => {
    // 300.00 and 400.00 in month 6 are 700.00 against the 600.00 owed; neither alone is more.
    const r = flat({ lumpSums: [{ month: 6, amountMinor: 30000 }, { month: 6, amountMinor: 40000 }] });
    assert.equal(r.months, 6);
    assert.deepEqual(r.warnings, ['The lump sums in month 6 are more than is owed then, so only part of them is used.']);
    // One lump sum there, with two in an earlier month that were used whole, is still one.
    const one = flat({ lumpSums: [{ month: 2, amountMinor: 100 }, { month: 2, amountMinor: 100 }, { month: 6, amountMinor: 70000 }] });
    assert.deepEqual(one.warnings, ['The lump sum in month 6 is more than is owed then, so only part of it is used.']);
  });

  it('comes before the note on the lump sums after it, which are not used at all', () => {
    const r = flat({ lumpSums: [{ month: 14, amountMinor: 5000 }, { month: 11, amountMinor: 50000 }] });
    assert.deepEqual(r.warnings, [PART_11, 'The lump sum in month 14 comes after this loan is paid off in month 11, so it is not used.']);
    const several = flat({ lumpSums: [{ month: 11, amountMinor: 50000 }, { month: 12, amountMinor: 1 }, { month: 20, amountMinor: 1 }] });
    assert.deepEqual(several.warnings, [PART_11, 'The lump sums from month 12 on come after this loan is paid off in month 11, so they are not used.']);
  });

  it('comes after the note on a rate that never changes', () => {
    // 1,200.00 at 12% over 3 months: 804.01 is owed after month 1.
    const r = hand({ rateSpec: changing(undefined, 3), lumpSums: [{ month: 1, amountMinor: 200000 }, { month: 9, amountMinor: 5000 }] });
    assert.equal(r.months, 1);
    assert.deepEqual(r.warnings, [RATE_NEVER_CHANGES, lumpPartUsedNote(1), 'The lump sum in month 9 comes after this loan is paid off in month 1, so it is not used.']);
  });

  it('is said on a loan set by its payment too', () => {
    // 1,200.00 at 0% with 200.00 a month: 800.00 is owed after month 2.
    const r = flat({ lumpSums: [{ month: 2, amountMinor: 80001 }] }, byPayment(20000));
    assert.equal(r.months, 2);
    assert.deepEqual(r.warnings, [lumpPartUsedNote(2)]);
  });

  it('is not said of a lump sum in the payoff month that the payment left nothing for: that one is not used at all', () => {
    assert.deepEqual(flat({ lumpSums: [{ month: 12, amountMinor: 5000 }] }).warnings, ['The lump sum in month 12 comes after this loan is paid off in month 12, so it is not used.']);
  });
});

describe('a lump sum dated after the loan is paid off is said, not dropped in silence (issue 915)', () => {
  const NOTE_13 = 'The lump sum in month 13 comes after this loan is paid off in month 12, so it is not used.';

  it('one lump sum after the last month: the loan is as it was without it, and a note names both months', () => {
    const r = flat({ lumpSums: [{ month: 13, amountMinor: 5000 }] });
    assert.equal(r.error, undefined);
    assert.equal(r.months, 12);
    assert.equal(r.totalPaidMinor, 120000);
    assert.deepEqual(r.schedule, flat().schedule);
    assert.deepEqual(r.warnings, [NOTE_13]);
    assert.equal(lumpsUnusedNote({ fromMonth: 13, count: 1 }, 12), NOTE_13);
  });

  it('a lump sum that pays the loan off is used; a later one is the one named, with the earlier payoff', () => {
    // 100.00 a month leaves 600.00 after month 6; a lump sum of 600.00 that month clears it.
    const r = flat({ lumpSums: [{ month: 6, amountMinor: 60000 }, { month: 8, amountMinor: 10000 }] });
    assert.equal(r.months, 6);
    assert.equal(r.totalPaidMinor, 120000);
    assert.deepEqual(r.warnings, ['The lump sum in month 8 comes after this loan is paid off in month 6, so it is not used.']);
  });

  it('a lump sum used in part is not one of the unused: only what was owed is paid, and its own note says so', () => {
    // After month 11 100.00 is owed; of a lump sum of 500.00 that month, 100.00 is paid.
    const r = flat({ lumpSums: [{ month: 11, amountMinor: 50000 }] });
    assert.equal(r.months, 11);
    assert.equal(r.totalPaidMinor, 120000);
    assert.deepEqual(r.warnings, [PART_11]);
  });

  it('a lump sum in the payoff month, when that month\'s payment already cleared the loan, is not used either', () => {
    const r = flat({ lumpSums: [{ month: 12, amountMinor: 5000 }] });
    assert.equal(r.months, 12);
    assert.equal(r.totalPaidMinor, 120000);
    assert.deepEqual(r.warnings, ['The lump sum in month 12 comes after this loan is paid off in month 12, so it is not used.']);
  });

  it('several are named by the first of them, in whatever order they were typed', () => {
    const several = 'The lump sums from month 15 on come after this loan is paid off in month 12, so they are not used.';
    assert.deepEqual(flat({ lumpSums: [{ month: 20, amountMinor: 5000 }, { month: 15, amountMinor: 5000 }, { month: 1200, amountMinor: 1 }] }).warnings, [several]);
    assert.equal(lumpsUnusedNote({ fromMonth: 15, count: 3 }, 12), several);
    assert.equal(lumpsUnusedNote({ fromMonth: 15, count: 2 }, 12), several);
    // Two in one month are two lump sums.
    assert.deepEqual(flat({ lumpSums: [{ month: 13, amountMinor: 5000 }, { month: 13, amountMinor: 7000 }] }).warnings, [
      'The lump sums from month 13 on come after this loan is paid off in month 12, so they are not used.',
    ]);
  });

  it('counts only the ones not paid: used ones before them change the payoff month, not the count', () => {
    // 100.00 extra in month 3 ends the loan a month early; two paid in one month are both used.
    const r = flat({ lumpSums: [{ month: 3, amountMinor: 5000 }, { month: 3, amountMinor: 5000 }, { month: 14, amountMinor: 5000 }] });
    assert.equal(r.months, 11);
    assert.deepEqual(r.warnings, ['The lump sum in month 14 comes after this loan is paid off in month 11, so it is not used.']);
    // A lump sum of nothing is no lump sum, used or not.
    assert.deepEqual(flat({ lumpSums: [{ month: 14, amountMinor: 0 }] }).warnings, []);
  });

  it('every lump sum used, or none typed: no note', () => {
    assert.deepEqual(flat({ lumpSums: [{ month: 3, amountMinor: 5000 }] }).warnings, []);
    assert.deepEqual(flat().warnings, []);
  });

  it('on a loan set by its payment the payoff month is the one the schedule ends in', () => {
    // 1,200.00 at 0% with 200.00 a month is paid off in month 6.
    const r = flat({ lumpSums: [{ month: 7, amountMinor: 5000 }] }, byPayment(20000));
    assert.equal(r.months, 6);
    assert.deepEqual(r.warnings, ['The lump sum in month 7 comes after this loan is paid off in month 6, so it is not used.']);
  });

  it('comes after the note on a rate that never changes, when a result has both', () => {
    const r = hand({ rateSpec: changing(undefined, 3), lumpSums: [{ month: 9, amountMinor: 5000 }] });
    assert.deepEqual(r.warnings, [RATE_NEVER_CHANGES, 'The lump sum in month 9 comes after this loan is paid off in month 3, so it is not used.']);
  });

  it('charges no month the later rate when the fixed period covers the term, even a month past the term (issue 925)', () => {
    // 1,000,000.00 at 50% a year over 360 months: the rounding of the payment
    // leaves more than one payment owed at the term, so the loan runs to month 368.
    const loan = { principalMinor: 100_000_000, annualRate: 0.5, feeMinor: 0 };
    const fixed = computeLoan(loan, { kind: 'term', months: 360 });
    assert.equal(fixed.months, 368);
    for (const extra of [{}, { extraMonthlyMinor: 100 }]) {
      const plain = computeLoan({ ...loan, ...extra }, { kind: 'term', months: 360 });
      const whole = computeLoan(
        { ...loan, ...extra, rateSpec: { kind: 'hybrid', initialAnnualRate: 0.5, subsequentAnnualRate: 0, initialMonths: 360, keeps: 'term' } },
        { kind: 'term', months: 360 },
      );
      assert.deepEqual(whole.schedule, plain.schedule);
      assert.equal(whole.totalPaidMinor, plain.totalPaidMinor);
      assert.equal(whole.aprNominal, plain.aprNominal);
      assert.deepEqual(whole.warnings, [RATE_NEVER_CHANGES]);
    }
  });

  it('a loan that is not paid off has no payoff to come after: no note', () => {
    // The payment is kept at 340.02 while the rate goes to 1200% a year: the balance grows.
    const r = hand({ rateSpec: changing('payment', 1, 12), lumpSums: [{ month: 1200, amountMinor: 1 }] });
    assert.equal(isNotPaidOff(r), true);
    assert.deepEqual(r.warnings.filter((w) => w.includes('lump sum')), []);
  });
});

describe('a loan that cannot be paid off says why, and shows no figures', () => {
  it('a payment the reader typed that does not cover the interest is called too low', () => {
    // 1,000.00 at 1% a month costs 10.00 in the first month; 5.00 plus 3.00 extra is 8.00.
    const r = hand({ extraMonthlyMinor: 300 }, byPayment(500));
    assert.equal(r.error, TOO_LOW);
    assert.equal(r.monthlyPaymentMinor, 500);
    assert.equal(r.effectiveMonthlyMinor, 800);
    assert.equal(r.months, 0);
    assert.equal(r.totalPaidMinor, 0);
    assert.equal(r.totalInterestMinor, 0);
    assert.deepEqual(r.schedule, []);
    assert.deepEqual(r.contractSchedule, []);
    assert.ok(Number.isNaN(r.aprNominal));
    assert.equal(r.prepaymentPenaltyMinor, 0);
    assert.deepEqual(r.warnings, []);
  });

  it('with a term typed, the same thing is put as the tool\'s own payment covering only the interest', () => {
    // 1.00 at 1% a month over 1200 months: the payment, 0.01 / (1 - 1.01^-1200), rounds to 0.01, the month's interest.
    const r = computeLoan({ principalMinor: 100, annualRate: 0.12 }, term(1200));
    assert.equal(r.error, 'With this amount, rate and term, the monthly payment only covers the interest, so the loan is never paid off. Enter a lower rate, a shorter term or a larger amount.');
    assert.equal(r.monthlyPaymentMinor, 1);
    assert.equal(r.months, 0);
    assert.deepEqual(r.schedule, []);
  });

  it('a loan entered by its payment has no term to end on: 1,200.50 at 1.00 a month is not paid off in 1200 months', () => {
    // 1200 payments of 1.00 leave 0.50. A loan with a term would put that in its last payment; this one has none.
    const r = computeLoan({ principalMinor: 120050, annualRate: 0 }, byPayment(100));
    assert.equal(r.error, NOT_IN_LIMIT);
    assert.equal(r.months, 0);
    assert.equal(r.totalPaidMinor, 0);
    assert.deepEqual(r.schedule, []);
    assert.deepEqual(r.contractSchedule, []);
  });

  it('extra payments that do pay it off give totals, but the required payments alone still fall short, so there is no APR', () => {
    // 2.00 a month clears 1,200.00 in 600 months and the last 0.50 in the 601st.
    const r = computeLoan({ principalMinor: 120050, annualRate: 0, extraMonthlyMinor: 100 }, byPayment(100));
    assert.equal(r.error, undefined);
    assert.equal(r.months, 601);
    assert.equal(r.totalPaidMinor, 120050);
    // The required 1.00 a month comes to 1,200.00 at the limit, 0.50 short of what was lent.
    assert.equal(sum(r.contractSchedule, 'payment'), 120000);
    assert.ok(Number.isNaN(r.aprNominal));
  });

  it('an optional amount that is not a number stops the loan before anything is worked out', () => {
    const r = hand({ feeMinor: NaN });
    assert.deepEqual(r, emptyResult(0, OPTIONAL_UNREADABLE));
  });
});

describe('a result with nothing worked out', () => {
  it('carries the fee and the message, and no figure that could be mistaken for one', () => {
    const r = emptyResult(500, 'Enter a loan amount greater than zero.');
    assert.equal(r.monthlyPaymentMinor, 0);
    assert.equal(r.effectiveMonthlyMinor, 0);
    assert.equal(r.months, 0);
    assert.equal(r.totalPaidMinor, 0);
    assert.equal(r.totalInterestMinor, 0);
    assert.equal(r.feeMinor, 500);
    assert.deepEqual(r.schedule, []);
    assert.deepEqual(r.contractSchedule, []);
    assert.ok(Number.isNaN(r.aprNominal));
    assert.equal(r.prepaymentPenaltyMinor, 0);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.error, 'Enter a loan amount greater than zero.');
  });
});

describe('the payment after a rate change, by hand', () => {
  it('worked out again for the months left: 345.07, and 1,030.17 in all', () => {
    const r = hand({ rateSpec: changing('term') });
    assert.deepEqual(r.schedule, [HAND_ROWS[0], row(2, 34507, 1340, 33167, 33831), row(3, 34508, 677, 33831, 0)]);
    assert.equal(r.totalPaidMinor, 34002 + 34507 + 34508);
    assert.equal(r.totalInterestMinor, 1000 + 1340 + 677);
    assert.deepEqual(r.rateChange, { month: 2, paymentMinor: 34507 });
    assert.equal(r.keptPayment, undefined);
    assert.equal(isNotPaidOff(r), false);
  });

  it('kept as it was: still 340.02, a last payment of 350.23, and the result says the payment was kept', () => {
    const r = hand({ rateSpec: changing('payment') });
    assert.deepEqual(r.schedule, [HAND_ROWS[0], row(2, 34002, 1340, 32662, 34336), row(3, 35023, 687, 34336, 0)]);
    assert.equal(r.totalPaidMinor, 34002 + 34002 + 35023);
    assert.deepEqual(r.rateChange, { month: 2, paymentMinor: 34002 });
    assert.deepEqual(r.keptPayment, { outcome: 'paid', termMonths: 3 });
    assert.equal(isNotPaidOff(r), false);
  });

  it('a lump sum paid in the month of the change is not part of the new monthly payment', () => {
    // With 1.00 extra a month, 668.98 is owed after month 1. For the 2 months left at 2% a month:
    // 668.98 x 0.02 / (1 - 1.02^-2) = 344.56, plus the 1.00 extra is 345.56. The 50.00 lump sum is paid once.
    const recast = hand({ rateSpec: changing('term'), extraMonthlyMinor: 100, lumpSums: [{ month: 2, amountMinor: 5000 }] });
    assert.equal(recast.schedule[1].payment, 34456 + 100 + 5000);
    assert.deepEqual(recast.rateChange, { month: 2, paymentMinor: 34556 });
    // Kept: 340.02 plus the 1.00 extra.
    const kept = hand({ rateSpec: changing('payment'), extraMonthlyMinor: 100, lumpSums: [{ month: 2, amountMinor: 5000 }] });
    assert.equal(kept.schedule[1].payment, 34002 + 100 + 5000);
    assert.deepEqual(kept.rateChange, { month: 2, paymentMinor: 34102 });
  });

  it('when the only payment at the new rate is the closing one, that payment is the figure', () => {
    // 1.00 extra a month: 668.98 after month 1, then interest 6.69 and principal 334.33 leave 334.65.
    // Month 3 at 2%: interest 6.69, so 341.34 clears it. A full payment (341.34 worked out, plus 1.00) is never made.
    const r = hand({ rateSpec: changing('term', 2), extraMonthlyMinor: 100 });
    assert.deepEqual(r.schedule[2], row(3, 34134, 669, 33465, 0));
    assert.deepEqual(r.rateChange, { month: 3, paymentMinor: 34134, last: true });
  });

  it('a loan cleared in the last month of the fixed period never meets the new rate', () => {
    // Month 2 leaves 336.66; a lump sum clears it there and then.
    const r = hand({ rateSpec: changing('payment', 2), lumpSums: [{ month: 2, amountMinor: 100000 }] });
    assert.equal(r.months, 2);
    assert.equal(r.schedule[1].payment, 34002 + 33666);
    assert.deepEqual(r.rateChange, { month: 3, paymentMinor: null });
    assert.equal(r.keptPayment, undefined);
  });

  it('a change that falls at the end of the term is no change: keeping the payment means nothing then', () => {
    // 1,000.00 at 10% a month over 84 months: the payment, rounded to the cent, falls behind, and the
    // loan runs past its term. A rate change after month 84 never comes: the months past the term are
    // charged the one rate the loan has, exactly as the fixed loan is (issue 925), whatever was chosen
    // for the payment.
    const fixed = computeLoan({ principalMinor: 100000, annualRate: 1.2 }, term(84));
    const r = computeLoan(
      { principalMinor: 100000, annualRate: 1.2, rateSpec: { kind: 'hybrid', initialAnnualRate: 1.2, initialMonths: 84, subsequentAnnualRate: 0, keeps: 'payment' } },
      term(84),
    );
    assert.equal(r.monthlyPaymentMinor, 10003);
    const owedAtTerm = r.schedule[83].balance;
    assert.ok(owedAtTerm > 10003, `the loan must run past its term for this test: ${owedAtTerm}`);
    assert.equal(r.months, 86);
    assert.ok(r.schedule[84].interest > 0, 'the month after the term is charged the loan\'s own rate, not 0%');
    assert.deepEqual(r.schedule, fixed.schedule);
    assert.equal(r.keptPayment, undefined);
    assert.equal(r.rateChange, undefined);
  });
});

describe('the charge for paying a loan off early, by hand', () => {
  const clause = { pctOfBalance: 0.1, untilMonth: 2, flatMinor: 250 };

  it('is nothing when the loan runs its term', () => {
    const r = hand({ prepaymentPenalty: clause });
    assert.equal(r.prepaymentPenaltyMinor, 0);
    assert.equal(r.totalPaidMinor, 102007);
    // Nor when the clause covers the last month too: paying on time is not paying early.
    const covered = hand({ prepaymentPenalty: { ...clause, untilMonth: 3 } });
    assert.equal(covered.prepaymentPenaltyMinor, 0);
    assert.equal(covered.totalPaidMinor, 102007);
  });

  it('in the last month the clause covers: 10% of the 669.98 then owed, plus the flat 2.50', () => {
    // A lump sum in month 2 clears the 336.66 left after that month's payment.
    const r = hand({ prepaymentPenalty: clause, lumpSums: [{ month: 2, amountMinor: 50000 }] });
    assert.equal(r.months, 2);
    assert.equal(r.prepaymentPenaltyMinor, 6700 + 250);
    assert.equal(r.totalPaidMinor, 34002 + (34002 + 33666) + 6950);
    assert.equal(r.totalInterestMinor, 1670);
  });

  it('a month after the clause ends, nothing', () => {
    const r = hand({ prepaymentPenalty: { ...clause, untilMonth: 1 }, lumpSums: [{ month: 2, amountMinor: 50000 }] });
    assert.equal(r.months, 2);
    assert.equal(r.prepaymentPenaltyMinor, 0);
    assert.equal(r.totalPaidMinor, 34002 + 34002 + 33666);
  });

  it('a loan cleared in its first month is charged on the whole amount lent', () => {
    // The payment of 340.02 leaves 669.98, which the lump sum clears. 10% of 1,000.00 is 100.00.
    const r = hand({ prepaymentPenalty: { pctOfBalance: 0.1, untilMonth: 1 }, lumpSums: [{ month: 1, amountMinor: 100000 }] });
    assert.equal(r.months, 1);
    assert.equal(r.prepaymentPenaltyMinor, 10000);
    assert.equal(r.totalPaidMinor, 34002 + 66998 + 10000);
  });

  it('a flat charge is counted in whole minor units', () => {
    const r = hand({ prepaymentPenalty: { pctOfBalance: 0, untilMonth: 2, flatMinor: 250.9 }, lumpSums: [{ month: 2, amountMinor: 50000 }] });
    assert.equal(r.prepaymentPenaltyMinor, 250);
  });
});

// ---------------------------------------------------------------------------
// shownMonths
// ---------------------------------------------------------------------------

describe('how much of a loan that is never paid off a chart draws', () => {
  // 1,000.00 at 12% over 120 months is 14.35 a month. After one month the rate
  // doubles; 2% of what is owed is nearly 20.00, more than the payment kept.
  const never = (months: number) => hand({ rateSpec: changing('payment') }, term(months));
  const stuck = never(120);
  const short = hand();
  const long = computeLoan({ principalMinor: 240000, annualRate: 0 }, term(240));

  it('such a loan has a schedule to the limit and says from when it stopped falling', () => {
    assert.equal(stuck.monthlyPaymentMinor, 1435);
    assert.deepEqual(stuck.keptPayment, { outcome: 'never', termMonths: 120, covers: 'less', fromMonth: 2 });
    assert.equal(stuck.schedule.length, 1200);
    assert.equal(isNotPaidOff(stuck), true);
    assert.ok(Number.isNaN(stuck.totalPaidMinor));
    assert.ok(Number.isNaN(stuck.totalInterestMinor));
    assert.ok(Number.isNaN(stuck.aprNominal));
  });

  it('a loan that is paid off is drawn whole', () => {
    assert.equal(shownMonths([short, stuck], 0), 3);
    assert.equal(shownMonths([stuck, long], 1), 240);
  });

  it('alone, it is drawn over its own term', () => {
    assert.equal(shownMonths([stuck], 0), 120);
  });

  it('beside a longer loan, over that loan\'s length; beside a shorter one, still over its own term', () => {
    assert.equal(shownMonths([stuck, long], 0), 240);
    assert.equal(shownMonths([short, stuck], 1), 120);
  });

  it('another loan that is never paid off does not stretch the chart to the limit', () => {
    assert.equal(shownMonths([stuck, never(180)], 0), 120);
    assert.equal(shownMonths([stuck, never(180)], 1), 180);
  });

  it('an offer in error is not drawn, so it sets no range', () => {
    const inError: LoanResult = { ...long, error: 'Enter a loan amount greater than zero.' };
    assert.equal(shownMonths([inError, stuck], 1), 120);
    assert.equal(shownMonths([stuck, inError, short], 0), 120);
  });
});

// ---------------------------------------------------------------------------
// APR
// ---------------------------------------------------------------------------

describe('the APR is the rate at which the payments are worth what was handed over', () => {
  /** What a stream of payments is worth today at a monthly rate. */
  const worth = (rows: AmortizationRow[], monthly: number) => rows.reduce((s, r) => s + r.payment / (1 + monthly) ** r.month, 0);
  const one = (payment: number) => [row(1, payment, 0, 0, 0)];

  it('the hand-worked loan: its payments discounted at the APR come to 1,000.00, or to 990.00 after a 10.00 fee', () => {
    const noFee = computeApr(100000, 0, HAND_ROWS);
    assert.ok(Math.abs(worth(HAND_ROWS, noFee / 12) - 100000) < 1e-6);
    // The payment is rounded to the cent, so the APR sits a hair off the 12% typed.
    assert.ok(Math.abs(noFee - 0.12) < 0.0001, String(noFee));
    const withFee = computeApr(100000, 1000, HAND_ROWS);
    assert.ok(Math.abs(worth(HAND_ROWS, withFee / 12) - 99000) < 1e-6);
    assert.ok(withFee > noFee + 0.05, 'a 1% fee on a three-month loan is a large yearly cost');
    assert.equal(hand({ feeMinor: 1000 }).aprNominal, withFee);
  });

  it('one payment a month later: 1.00 repaid by 2.00 is 100% a month, by 3.00 is 200% a month', () => {
    assert.ok(Math.abs(computeApr(100, 0, one(200)) - 12) < 1e-9);
    assert.ok(Math.abs(computeApr(100, 0, one(300)) - 24) < 1e-9);
  });

  it('still finds a rate far beyond any real loan: 1.00 repaid by 1,000.00 is 99,900% a month', () => {
    assert.ok(Math.abs(computeApr(100, 0, one(100000)) - 999 * 12) < 1e-6);
  });

  it('gives up, as not a number, on a payment a thousand million times the loan', () => {
    assert.ok(Number.isNaN(computeApr(1, 0, one(1_500_000_000))));
  });

  it('payments that only give the loan back are 0%; payments that fall short of it have no APR', () => {
    assert.equal(computeApr(120000, 0, flat().schedule), 0);
    assert.equal(computeApr(1000, 0, one(1000)), 0);
    assert.ok(Number.isNaN(computeApr(1000, 0, one(999))));
    assert.ok(Number.isNaN(computeApr(1000, 0, one(900))));
  });

  it('no schedule, no APR, however small the loan', () => {
    assert.ok(Number.isNaN(computeApr(0.5, 0, [])));
    assert.ok(Number.isNaN(computeApr(100000, 0, [])));
  });

  it('a fee that takes the whole loan leaves nothing to measure a rate on', () => {
    assert.ok(Number.isNaN(computeApr(100, 100, [row(1, 0, 0, 0, 0)])));
    assert.ok(Number.isNaN(computeApr(100000, 100000, HAND_ROWS)));
    assert.ok(Number.isNaN(computeApr(100000, 150000, HAND_ROWS)));
  });
});

describe('the APR as printed', () => {
  it('groups thousands the English way when no locale is given', () => {
    assert.equal(formatApr(12.3456), '1,234.56%');
  });

  it('half of the last digit shown rounds up, and only less than that is 0.00%', () => {
    assert.equal(formatApr(0.00005), '0.01%');
    assert.equal(formatApr(0.00004), '0.00%');
    assert.equal(formatApr(-0.00004), '0.00%');
  });

  it('a locale the browser does not know still prints the figure, plainly', () => {
    assert.equal(formatApr(0.0633, 'en_US'), '6.33%');
    assert.equal(formatApr(0.12002, 'en_US'), '12.00%');
  });
});

// ---------------------------------------------------------------------------
// Where a loan stands at a month
// ---------------------------------------------------------------------------

describe('where the hand-worked loan stands', () => {
  it('after month 2: 663.34 repaid, 16.70 interest, 336.66 owed, 680.04 plus the fee paid out', () => {
    assert.deepEqual(equityAtMonth(HAND_ROWS, 2, 1500), {
      month: 2,
      principalPaidMinor: 66334,
      interestPaidMinor: 1670,
      balanceMinor: 33666,
      totalOutOfPocketMinor: 68004 + 1500,
    });
  });

  it('before the first month nothing is paid but the fee', () => {
    for (const month of [0, 0.5, -3]) {
      assert.deepEqual(equityAtMonth(HAND_ROWS, month, 1500), {
        month: 0,
        principalPaidMinor: 0,
        interestPaidMinor: 0,
        balanceMinor: 0,
        totalOutOfPocketMinor: 1500,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------

describe('points: when the cost comes back', () => {
  it('only the extra fee is the cost of the points: 4.00 more in fees, 6.69 a month less, back in month 1', () => {
    // With points: 1,000.00 at 0% over 3 months, 333.33 a month, 6.00 in fees.
    // Without: the hand-worked loan, 340.02 a month, 2.00 in fees.
    const withPoints = hand({ annualRate: 0, feeMinor: 600 });
    const without = hand({ feeMinor: 200 });
    assert.deepEqual(pointsBreakEven(withPoints, without), {
      months: 1,
      monthlySavingsMinor: 669,
      lifetimeSavingsMinor: 102007 + 200 - (100000 + 600),
    });
    // 13.00 more in fees is back within two months of 6.69 (13.38); 14.00 more takes a third.
    assert.equal(pointsBreakEven(hand({ annualRate: 0, feeMinor: 1500 }), without).months, 2);
    assert.equal(pointsBreakEven(hand({ annualRate: 0, feeMinor: 1600 }), without).months, 3);
  });

  it('points that cost nothing more are level at once, even when they change nothing', () => {
    assert.deepEqual(pointsBreakEven(hand({ feeMinor: 200 }), hand({ feeMinor: 200 })), { months: 0, monthlySavingsMinor: 0, lifetimeSavingsMinor: 0 });
    assert.equal(Object.is(pointsBreakEven(hand({ annualRate: 0 }), hand({ feeMinor: 500 })).months, 0), true);
  });

  describe('with the same payment either way, read from what is owed', () => {
    // 1,000.00 paying 100.00 a month. At 0% the first payment leaves 900.00; at 1% a month,
    // 10.00 of it is interest and 910.00 is left. The gap is 10.00 after month 1. In month 2
    // the 1% loan pays 9.10 interest and owes 819.10 against 800.00: a gap of 19.10.
    const withPoints = (feeMinor: number) => hand({ annualRate: 0, feeMinor }, byPayment(10000));
    const without = hand({}, byPayment(10000));

    it('points costing exactly the gap after month 1 are back in month 1; a cent more takes month 2', () => {
      assert.equal(without.schedule[0].balance, 91000);
      assert.equal(pointsBreakEven(withPoints(1000), without).months, 1);
      assert.equal(pointsBreakEven(withPoints(1001), without).months, 2);
      assert.equal(pointsBreakEven(withPoints(1910), without).months, 2);
      assert.equal(pointsBreakEven(withPoints(1000), without).monthlySavingsMinor, 0);
    });

    it('points that cost more than the loan ever saves never come back, though one loan ends first', () => {
      // The 0% loan ends in month 10, the 1% loan in month 11.
      assert.equal(withPoints(0).months, 10);
      assert.equal(without.months, 11);
      const be = pointsBreakEven(withPoints(10_000_000), without);
      assert.equal(be.months, Infinity);
      assert.equal(pointsVerdict(be), 'never');
    });

    it('nor when it is the loan without points that ends first', () => {
      // The same loan with a fee and nothing for it, against one cleared by a lump sum in month 2.
      const cleared = hand({ lumpSums: [{ month: 2, amountMinor: 100000 }] }, byPayment(10000));
      assert.equal(cleared.months, 2);
      assert.equal(pointsBreakEven(hand({ feeMinor: 500 }, byPayment(10000)), cleared).months, Infinity);
    });
  });

  it('the line under the break-even: a loss is a cost, anything else that comes back is a saving', () => {
    assert.equal(pointsVerdict({ months: 5, monthlySavingsMinor: 100, lifetimeSavingsMinor: -1 }), 'costs');
    assert.equal(pointsVerdict({ months: 5, monthlySavingsMinor: 100, lifetimeSavingsMinor: 0 }), 'saves');
    assert.equal(pointsVerdict({ months: 5, monthlySavingsMinor: 100, lifetimeSavingsMinor: 1 }), 'saves');
    assert.equal(pointsVerdict({ months: Infinity, monthlySavingsMinor: 0, lifetimeSavingsMinor: 500 }), 'never');
  });
});

// ---------------------------------------------------------------------------
// Refinance break-even
// ---------------------------------------------------------------------------

describe('refinance break-even on a cost paid in cash', () => {
  // The original loan pays 100.00 a month for 12 months.
  const old = flat().schedule;
  // A new loan of 300.00 at 0% over 4 months: 75.00 a month.
  const four = computeLoan({ principalMinor: 30000, annualRate: 0 }, term(4)).schedule;
  // A new loan of 1,200.00 at 0% over 24 months: 50.00 a month.
  const twentyFour = flat({}, term(24)).schedule;

  it('is the first month by which the lower payments have covered it: 25.00 a month saved', () => {
    assert.equal(refinanceBreakEven(old, four, 7500), 3, 'three months of 25.00 are exactly 75.00');
    assert.equal(refinanceBreakEven(old, four, 7501), 4);
    assert.equal(refinanceBreakEven(old, four, 8000), 4);
    assert.equal(refinanceBreakEven(old, four, 1), 1);
  });

  it('once the new loan has ended, the whole old payment is saved each month', () => {
    // 100.00 saved by month 4, then 100.00 a month: 200.00 by month 5, 300.00 by month 6.
    assert.equal(refinanceBreakEven(old, four, 25000), 6);
    // 900.00 by month 12, the last month there is anything to save.
    assert.equal(refinanceBreakEven(old, four, 85000), 12);
    assert.equal(refinanceBreakEven(old, four, 90000), 12);
    assert.equal(refinanceBreakEven(old, four, 90001), Infinity);
  });

  it('once the old loan would have ended, the new payments eat the saving again', () => {
    // 50.00 a month saved for 12 months is 600.00 at most.
    assert.equal(refinanceBreakEven(old, twentyFour, 60000), 12);
    assert.equal(refinanceBreakEven(old, twentyFour, 60001), Infinity);
  });

  it('counts payments only, unless told the costs went into the new loan', () => {
    assert.equal(refinanceBreakEven(old, twentyFour, 12000), 3);
    // Counting what is owed as well, two loans at 0% are level for ever: 120.00 never comes back.
    assert.equal(refinanceBreakEven(old, twentyFour, 12000, true), Infinity);
  });
});

describe('refinance break-even with the costs added to the new loan', () => {
  // The original loan: the hand-worked one, 1,000.00 owed at 1% a month, three payments left.
  // The new loan: 1,015.00 (15.00 of costs added) at 0%.
  const newLoan = (principalMinor: number, months: number) => computeLoan({ principalMinor, annualRate: 0 }, term(months)).schedule;

  it('by hand: 5.00 behind after month 1, 1.70 ahead after month 2, 5.07 ahead at the end', () => {
    // Over 3 months the new loan pays 338.33, 338.33, 338.34 and owes 676.67, 338.34, 0.
    //   month 1: saved 340.02 - 338.33 = 1.69; owed 669.98 against 676.67: 1.69 - 6.69 = -5.00
    //   month 2: saved 3.38; owed 336.66 against 338.34: 3.38 - 1.68 = 1.70
    //   month 3: saved 3.38 + 340.03 - 338.34 = 5.07; nothing owed on either
    // 5.07 is also 1,020.07 paid on the old loan less 1,015.00 on the new.
    const three = newLoan(101500, 3);
    assert.deepEqual(three.map((r) => [r.payment, r.balance]), [[33833, 67667], [33833, 33834], [33834, 0]]);
    assert.equal(refinanceBreakEven(HAND_ROWS, three, 0, true), 2);
    assert.equal(refinanceBreakEven(HAND_ROWS, three, 170, true), 2);
    assert.equal(refinanceBreakEven(HAND_ROWS, three, 171, true), 3);
    assert.equal(refinanceBreakEven(HAND_ROWS, three, 507, true), 3);
    assert.equal(refinanceBreakEven(HAND_ROWS, three, 508, true), Infinity);
  });

  it('a new loan that runs on after the old one has ended gains nothing more', () => {
    // Over 4 months the new loan pays 253.75 a month. After month 3 the position is
    // 1,020.07 - 761.25 paid, less the 253.75 still owed: 5.07. Month 4 pays that 253.75: still 5.07.
    const fourMonths = newLoan(101500, 4);
    assert.equal(refinanceBreakEven(HAND_ROWS, fourMonths, 507, true), 3);
    assert.equal(refinanceBreakEven(HAND_ROWS, fourMonths, 508, true), Infinity);
  });

  it('a new loan that owes the same and charges the same is level from the first month', () => {
    assert.equal(refinanceBreakEven(flat().schedule, flat({}, term(24)).schedule, 0, true), 1);
  });

  it('a higher new payment is matched on the old loan: paid off with the same money, nothing is left to charge interest on', () => {
    // The new loan, 1,010.10 at 0%, is paid in one month. The same money clears the old loan
    // with its 10.00 of interest: 1,010.00. The refinance is 0.10 behind and stays there.
    assert.equal(refinanceBreakEven(HAND_ROWS, newLoan(101010, 1), 0, true), Infinity);
    // At 1,010.00 exactly it is level.
    assert.equal(refinanceBreakEven(HAND_ROWS, newLoan(101000, 1), 0, true), 1);
  });

  it('an original loan with nothing left gives nothing to recover', () => {
    assert.equal(refinanceBreakEven([], newLoan(101010, 1), 0, true), Infinity);
  });
});

// ---------------------------------------------------------------------------
// Refinance comparison
// ---------------------------------------------------------------------------

describe('a refinance worked by hand: 1,200.00 at 0%, refinanced after month 6 with 600.00 owed', () => {
  const original = flat();
  const ok = (c: ReturnType<typeof refinanceComparison>) => {
    if ('error' in c) throw new Error(c.error);
    return c;
  };
  const failed = (c: ReturnType<typeof refinanceComparison>) => ('error' in c ? c.error : 'no error');
  const source = (more: Partial<LoanInputs>, mode: LoanMode = term(12)) => ({ inputs: { ...FLAT, ...more }, mode });

  it('over 12 more months with 6.00 of closing costs in cash: 50.00 a month, 6.00 dearer in all, back in a month', () => {
    assert.deepEqual(ok(refinanceComparison(original, 6, 0, 12, 600)), {
      refinanceTotalMinor: 60000 + 60000 + 600,
      keepTotalMinor: 120000,
      savingsMinor: -600,
      breakEvenMonths: 1,
      breakEvenKind: 'cash',
      paymentLower: true,
      penaltyMinor: 0,
      extrasCarried: false,
      endsLater: true,
      snapshotAtRefi: { month: 6, principalPaidMinor: 60000, interestPaidMinor: 0, balanceMinor: 60000, totalOutOfPocketMinor: 60000 },
    });
  });

  it('over the 6 months left, at no cost, nothing changes: the payment is not lower and there is nothing to pay back', () => {
    const c = ok(refinanceComparison(original, 6, 0, 6, 0));
    assert.equal(c.paymentLower, false);
    assert.equal(c.breakEvenKind, 'none');
    assert.equal(c.breakEvenMonths, 0);
    assert.equal(c.savingsMinor, 0);
    assert.equal(c.endsLater, false);
  });

  it('the first month, a rate of nothing and a term of one month are all allowed', () => {
    const c = ok(refinanceComparison(original, 1, 0, 1, 0));
    assert.equal(c.snapshotAtRefi.balanceMinor, 110000);
    assert.equal(c.refinanceTotalMinor, 120000);
    assert.equal(c.endsLater, false);
  });

  describe('what cannot be compared says why', () => {
    it('an original loan that is itself in error, or has no schedule', () => {
      const message = 'Original loan is invalid; cannot compute refinance.';
      assert.equal(failed(refinanceComparison(emptyResult(0, 'Enter a loan amount greater than zero.'), 6, 0, 12, 0)), message);
      assert.equal(failed(refinanceComparison({ ...original, error: 'Enter a loan amount greater than zero.' }, 6, 0, 12, 0)), message);
      assert.equal(failed(refinanceComparison({ ...original, schedule: [] }, 6, 0, 12, 0)), message);
    });

    it('a refinance month that is not a month, or before the first', () => {
      for (const month of [NaN, Infinity, 0, 0.5, -2]) {
        assert.equal(failed(refinanceComparison(original, month, 0, 12, 0)), 'Refinance month must be at least 1.', String(month));
      }
    });

    it('a refinance in the last month or after it', () => {
      for (const month of [12, 13, 400]) {
        assert.equal(failed(refinanceComparison(original, month, 0, 12, 0)), 'Refinance month must be before the original loan ends.', String(month));
      }
    });

    it('a new rate that is not a rate', () => {
      for (const rate of [NaN, Infinity, -0.01]) {
        assert.equal(failed(refinanceComparison(original, 6, rate, 12, 0)), 'New rate must be non-negative.', String(rate));
      }
    });

    it('a new term that is not a month long', () => {
      for (const months of [NaN, Infinity, 0, 0.5, -12]) {
        assert.equal(failed(refinanceComparison(original, 6, 0, months, 0)), 'New term must be at least 1 month.', String(months));
      }
    });

    it('a schedule that already owes nothing at that month', () => {
      // No loan from the engine has such a month before its last; a schedule from elsewhere might.
      const done = { ...original, schedule: [...original.schedule, row(13, 0, 0, 0, 0)] };
      assert.equal(failed(refinanceComparison(done, 12, 0, 12, 0)), 'Original loan has no remaining balance at the refinance month.');
    });

    it('a new loan the engine refuses, in the engine\'s own words', () => {
      // Closing costs added to the loan that take it past the largest amount the tool takes.
      assert.equal(
        failed(refinanceComparison(original, 6, 0, 12, 1e15, true)),
        'This loan amount is too large for the tool. Enter a smaller amount.',
      );
    });
  });

  describe('the reader\'s extra payments', () => {
    it('an extra 20.00 a month goes on to the new loan, and what the old loan still has due stops when it would really have ended', () => {
      // 120.00 a month: 600.00 owed after month 5, paid off in month 10.
      const inputs = { extraMonthlyMinor: 2000 };
      const withExtra = flat(inputs);
      assert.equal(withExtra.months, 10);
      // New loan: 600.00 over 12 months is 50.00 due, 70.00 with the extra: 9 months.
      // Old loan with the extras stopped: 600.00 at 100.00 due, 6 more months. 50.00 saved in each
      // is 300.00 at most, so 320.00 of costs never comes back. (The contract's 7 months would give 350.00.)
      const c = ok(refinanceComparison(withExtra, 5, 0, 12, 32000, false, source(inputs)));
      assert.equal(c.extrasCarried, true);
      assert.equal(c.breakEvenKind, 'cash');
      assert.equal(c.breakEvenMonths, Infinity);
      assert.equal(c.refinanceTotalMinor, 5 * 12000 + 60000 + 32000);
      assert.equal(c.endsLater, true, 'month 5 plus 9 is later than month 10');
      assert.equal(ok(refinanceComparison(withExtra, 5, 0, 12, 30000, false, source(inputs))).breakEvenMonths, 6);
    });

    it('a lump sum already paid stays paid: the old loan has less left due, and nothing is carried', () => {
      // 200.00 in month 3: 500.00 owed after month 5, paid off in month 10.
      const inputs = { lumpSums: [{ month: 3, amountMinor: 20000 }] };
      const withLump = flat(inputs);
      assert.equal(withLump.months, 10);
      assert.equal(withLump.schedule[4].balance, 50000);
      // New loan: 500.00 over 10 months, 50.00 a month. The old loan has 5 months of 100.00 left:
      // 250.00 saved at most. (The contract's 7 months would give 350.00.)
      const c = ok(refinanceComparison(withLump, 5, 0, 10, 30000, false, source(inputs)));
      assert.equal(c.extrasCarried, false);
      assert.equal(c.breakEvenMonths, Infinity);
      assert.equal(ok(refinanceComparison(withLump, 5, 0, 10, 25000, false, source(inputs))).breakEvenMonths, 5);
      // An empty lump sum row beside it changes nothing.
      const withEmptyRow = source({ lumpSums: [{ month: 2, amountMinor: 0 }, { month: 3, amountMinor: 20000 }] });
      assert.equal(ok(refinanceComparison(withLump, 5, 0, 10, 30000, false, withEmptyRow)).breakEvenMonths, Infinity);
    });

    it('a lump sum paid in the refinance month itself is already paid', () => {
      // 700.00 owed after month 3. New loan: 14 months of 50.00. The old loan has 7 months of 100.00
      // left: 350.00 saved at most. (Without the lump sum it would have 9 months left: 450.00.)
      const inputs = { lumpSums: [{ month: 3, amountMinor: 20000 }] };
      const c = ok(refinanceComparison(flat(inputs), 3, 0, 14, 40000, false, source(inputs)));
      assert.equal(c.snapshotAtRefi.balanceMinor, 70000);
      assert.equal(c.extrasCarried, false);
      assert.equal(c.breakEvenMonths, Infinity);
      assert.equal(ok(refinanceComparison(flat(inputs), 3, 0, 14, 35000, false, source(inputs))).breakEvenMonths, 7);
    });

    it('a lump sum planned for later goes on to the new loan, counted from its start', () => {
      // 200.00 in month 8. After month 5, 700.00 is owed. New loan: 14 months of 50.00, with the
      // 200.00 in its month 3: 350.00 owed after that, 7 more months. Ten months in all.
      const inputs = { lumpSums: [{ month: 8, amountMinor: 20000 }] };
      const c = ok(refinanceComparison(flat(inputs), 5, 0, 14, 0, false, source(inputs)));
      assert.equal(c.extrasCarried, true);
      assert.equal(c.refinanceTotalMinor, 50000 + 70000);
      assert.equal(c.endsLater, true, 'month 5 plus 10 is later than month 10');
      // Without the lump sum carried, the new loan would take all 14 months; either way it ends later.
      assert.equal(c.savingsMinor, 0);
    });

    it('an empty lump sum row planned for later is not an extra', () => {
      const inputs = { lumpSums: [{ month: 9, amountMinor: 0 }] };
      assert.equal(ok(refinanceComparison(flat(inputs), 5, 0, 14, 0, false, source(inputs))).extrasCarried, false);
    });

    it('a new loan whose required payment only covers its interest, repaid by the carried extra, is still compared', () => {
      // 600.00 at 1% a month over 1200 months: the payment rounds to 6.00, the month's interest.
      // The 20.00 extra carried over repays it, far later than month 10.
      const inputs = { extraMonthlyMinor: 2000 };
      const c = ok(refinanceComparison(flat(inputs), 5, 0.12, 1200, 0, false, source(inputs)));
      assert.equal(c.snapshotAtRefi.balanceMinor, 60000);
      assert.equal(c.extrasCarried, true);
      assert.equal(c.endsLater, true);
      assert.equal(c.keepTotalMinor, 120000);
    });
  });

  describe('the loan as entered is read for its extras and its penalty, and for nothing else', () => {
    // 120.00 of closing costs against 50.00 a month saved on this loan: back in month 3.
    // A loan twice the size would pay 200.00 a month and have it back in month 1.
    const other: LoanInputs = { principalMinor: 240000, annualRate: 0 };

    it('with no extras entered, what is due is read from the result itself', () => {
      const c = ok(refinanceComparison(original, 6, 0, 12, 12000, false, { inputs: other, mode: term(12) }));
      assert.equal(c.breakEvenMonths, 3);
      assert.equal(c.extrasCarried, false);
    });

    it('nor does an empty lump sum row count as an extra', () => {
      const c = ok(refinanceComparison(original, 6, 0, 12, 12000, false, { inputs: { ...other, lumpSums: [{ month: 2, amountMinor: 0 }] }, mode: term(12) }));
      assert.equal(c.breakEvenMonths, 3);
    });

    it('a description that would have the loan paid off by the refinance month does not fit it, and is not used for what is due', () => {
      // The result: 120.00 a month, 600.00 owed after month 5. The description: 600.00 over 6 months
      // with 20.00 extra, which is paid off in month 5 exactly. What is due stays the result's own
      // 100.00 a month for 7 more months; against 50.00 on the new loan, 300.00 is back in month 6.
      const withExtra = flat({ extraMonthlyMinor: 2000 });
      const c = ok(refinanceComparison(withExtra, 5, 0, 12, 30000, false, { inputs: { principalMinor: 60000, annualRate: 0, extraMonthlyMinor: 2000 }, mode: term(6) }));
      assert.equal(c.paymentLower, true);
      assert.equal(c.breakEvenMonths, 6);
    });
  });
});

describe('a refinance of a loan entered by its payment', () => {
  const ok = (c: ReturnType<typeof refinanceComparison>) => {
    if ('error' in c) throw new Error(c.error);
    return c;
  };

  it('when the required payment alone would not pay it off in time, what is due is still that payment', () => {
    // 1,000.00 at 0.1% a month, 1.35 required and 1.00 extra. The first month's interest is 1.00,
    // so the required payment alone repays 0.35 a month to begin with: not done in 1200 months.
    const inputs: LoanInputs = { principalMinor: 100000, annualRate: 0.012, extraMonthlyMinor: 100 };
    const mode = byPayment(135);
    const original = computeLoan(inputs, mode);
    assert.equal(original.error, undefined);
    assert.equal(computeLoan({ ...inputs, extraMonthlyMinor: 0 }, mode).error, NOT_IN_LIMIT);
    // After 12 months under 1,000.00 is owed; over 1200 months at 0% that is under 0.84 a month,
    // and more than 0.35. So 1.35 falls to something that saves between 0.51 and 1.00 a month:
    // costs of 1.00 are back in month 2.
    const c = ok(refinanceComparison(original, 12, 0, 1200, 100, false, { inputs, mode }));
    assert.ok(c.snapshotAtRefi.balanceMinor < 100000 && c.snapshotAtRefi.balanceMinor > 1200 * 35);
    assert.equal(c.paymentLower, true);
    assert.equal(c.breakEvenMonths, 2);
  });

  it('when the required payment alone does not cover the interest, the totals are still compared', () => {
    // 1,000.00 at 1% a month: 9.00 required, 2.00 extra, against 10.00 of interest in month 1.
    const inputs: LoanInputs = { ...HAND, extraMonthlyMinor: 200 };
    const mode = byPayment(900);
    const original = computeLoan(inputs, mode);
    assert.equal(original.error, undefined);
    // Month 1: 11.00 paid, 1.00 of it principal. Month 2: interest 9.99, principal 1.01.
    assert.deepEqual(original.schedule.slice(0, 2), [row(1, 1100, 1000, 100, 99900), row(2, 1100, 999, 101, 99799)]);
    // Refinanced after month 2 at 0% over one month, with the 2.00 extra carried: 997.99 to repay.
    const c = ok(refinanceComparison(original, 2, 0, 1, 0, false, { inputs, mode }));
    assert.equal(c.refinanceTotalMinor, 2200 + 99799);
    assert.equal(c.keepTotalMinor, original.totalPaidMinor);
    assert.equal(c.extrasCarried, true);
    assert.equal(c.endsLater, false);
  });
});

// ---------------------------------------------------------------------------
// The months a payment-split chart samples
// ---------------------------------------------------------------------------

describe('the months sampled when the count asked for is no ordinary number', () => {
  it('every month, once, when asked for more samples than there could ever be', () => {
    assert.deepEqual(pickSplitSamples(4, Infinity), [1, 2, 3, 4]);
  });

  it('the first and the last month, each once, when the count is not a number', () => {
    assert.deepEqual(pickSplitSamples(12, NaN), [1, 12]);
    assert.deepEqual(pickSplitSamples(1, NaN), [1]);
  });
});
