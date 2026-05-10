/**
 * Unit tests for src/utils/loanMath.ts.
 *
 * Run with:  npm test
 * (which is `node --test src/utils/**\/*.test.ts` under the hood,
 *  using Node 22's built-in test runner and TS type-stripping).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  buildSchedule,
  computeLoan,
  computeMonthsForPayment,
  computeScheduledPaymentMinor,
  formatMoney,
  formatMonths,
  fromMinor,
  getCurrency,
  roundMinor,
  toMinor,
} from './loanMath.ts';

// ---------------------------------------------------------------------------
// Money primitives
// ---------------------------------------------------------------------------

describe('roundMinor', () => {
  it('rounds half-away-from-zero for positive numbers', () => {
    assert.equal(roundMinor(0.5), 1);
    assert.equal(roundMinor(1.5), 2);
    assert.equal(roundMinor(2.5), 3);
    assert.equal(roundMinor(0.49999), 0);
  });

  it('rounds half-away-from-zero for negative numbers', () => {
    assert.equal(roundMinor(-0.5), -1);
    assert.equal(roundMinor(-1.5), -2);
  });

  it('returns 0 for non-finite input', () => {
    assert.equal(roundMinor(NaN), 0);
    assert.equal(roundMinor(Infinity), 0);
  });
});

describe('toMinor / fromMinor round-trip', () => {
  for (const code of ['USD', 'EUR', 'GBP', 'INR', 'CZK', 'JPY', 'KRW']) {
    it(`is exact for whole units in ${code}`, () => {
      const v = 12345;
      const minor = toMinor(v, code);
      assert.equal(fromMinor(minor, code), v);
    });
  }

  it('handles fractional cents in USD', () => {
    assert.equal(toMinor(1234.56, 'USD'), 123456);
    assert.equal(toMinor(0.01, 'USD'), 1);
    assert.equal(toMinor(0.005, 'USD'), 1); // half-up
  });

  it('rounds JPY to whole yen because factor is 1', () => {
    assert.equal(toMinor(1234.4, 'JPY'), 1234);
    assert.equal(toMinor(1234.6, 'JPY'), 1235);
  });

  it('treats unknown currency as USD-equivalent factor', () => {
    assert.equal(toMinor(100, 'XYZ'), 10000);
  });
});

// ---------------------------------------------------------------------------
// Currency catalogue & formatting
// ---------------------------------------------------------------------------

describe('CURRENCIES catalogue', () => {
  it('includes the headline set', () => {
    const codes = CURRENCIES.map((c) => c.code);
    for (const required of ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CZK']) {
      assert.ok(codes.includes(required), `${required} missing from catalogue`);
    }
  });

  it('has factor 1 for JPY and KRW (zero-decimal currencies)', () => {
    assert.equal(getCurrency('JPY').factor, 1);
    assert.equal(getCurrency('KRW').factor, 1);
  });

  it('has factor 100 for USD/EUR/GBP/INR/CZK', () => {
    for (const c of ['USD', 'EUR', 'GBP', 'INR', 'CZK']) {
      assert.equal(getCurrency(c).factor, 100);
    }
  });

  it('falls back to default currency for unknown codes', () => {
    assert.equal(getCurrency('XYZ').code, DEFAULT_CURRENCY);
  });
});

describe('formatMoney', () => {
  // We use Intl, whose exact whitespace/symbol rendering can vary slightly
  // between Node versions and ICU bundles. We assert on stable, observable
  // properties (digits, presence of currency mark, grouping pattern) rather
  // than exact byte-for-byte output.

  it('formats USD with US grouping', () => {
    const s = formatMoney(toMinor(1234567.89, 'USD'), 'USD');
    assert.match(s, /\$/);
    // Western 3-digit grouping: 1,234,567.89
    assert.ok(/1,234,567\.89/.test(s), `got: ${s}`);
  });

  it('formats INR with Indian (lakh/crore) grouping', () => {
    const s = formatMoney(toMinor(12345678, 'INR'), 'INR');
    // Indian grouping is 2,3,3 from the right: 1,23,45,678
    // The currency symbol may render as "₹" or "INR" depending on ICU; either is fine.
    assert.ok(/1,23,45,678/.test(s), `expected Indian grouping in: ${s}`);
  });

  it('formats INR fractional amounts with Indian grouping', () => {
    const s = formatMoney(toMinor(125000.5, 'INR'), 'INR');
    // 1,25,000.50
    assert.ok(/1,25,000\.50/.test(s), `expected Indian grouping in: ${s}`);
  });

  it('formats JPY without decimals', () => {
    const s = formatMoney(toMinor(1234567, 'JPY'), 'JPY');
    // No decimal separator after the integer part for JPY
    assert.ok(/1,234,567/.test(s), `got: ${s}`);
    assert.ok(!/\.\d/.test(s), `JPY should not have decimals: ${s}`);
  });

  it('formats EUR with German grouping (de-DE locale)', () => {
    const s = formatMoney(toMinor(1234567.89, 'EUR'), 'EUR');
    // de-DE uses "." for thousands and "," for decimals: 1.234.567,89
    assert.ok(/1\.234\.567,89/.test(s), `expected German grouping in: ${s}`);
  });
});

// ---------------------------------------------------------------------------
// Closed-form payment formula
// ---------------------------------------------------------------------------

describe('computeScheduledPaymentMinor', () => {
  // Standard textbook example: $200,000 at 6% annual, 30 years (360 months)
  // → $1,199.10/mo
  it('matches the textbook 30-year mortgage result', () => {
    const principalMinor = toMinor(200_000, 'USD');
    const payment = computeScheduledPaymentMinor(principalMinor, 0.06, 360);
    // $1,199.10 = 119910 cents
    assert.equal(payment, 119910);
  });

  // Auto-loan style: $25,000 at 5% for 60 months → $471.78/mo
  it('matches a 60-month auto loan', () => {
    const payment = computeScheduledPaymentMinor(toMinor(25_000, 'USD'), 0.05, 60);
    assert.equal(payment, 47178);
  });

  it('handles 0% APR by dividing principal evenly', () => {
    const payment = computeScheduledPaymentMinor(toMinor(12_000, 'USD'), 0, 12);
    assert.equal(payment, toMinor(1000, 'USD'));
  });

  it('returns 0 for non-positive months', () => {
    assert.equal(computeScheduledPaymentMinor(toMinor(10_000, 'USD'), 0.05, 0), 0);
    assert.equal(computeScheduledPaymentMinor(toMinor(10_000, 'USD'), 0.05, -3), 0);
  });
});

// ---------------------------------------------------------------------------
// Solve-for-term given a fixed monthly payment
// ---------------------------------------------------------------------------

describe('computeMonthsForPayment', () => {
  it('returns Infinity when the payment never amortizes', () => {
    // 6% on $100k = $500/mo just for interest. Pay $400 → never pays off.
    const months = computeMonthsForPayment(toMinor(100_000, 'USD'), 0.06, toMinor(400, 'USD'));
    assert.equal(months, Infinity);
  });

  it('returns Infinity when payment exactly equals interest', () => {
    // $100k * 6% / 12 = $500/mo interest; paying exactly $500 → never pays off.
    const months = computeMonthsForPayment(toMinor(100_000, 'USD'), 0.06, toMinor(500, 'USD'));
    assert.equal(months, Infinity);
  });

  it('round-trips a 360-month payment within ±1 month of cents-rounding', () => {
    // Closed-form payment for $200k @ 6% over 360 months is $1199.1011…,
    // which rounds to $1199.10. Paying the rounded amount is slightly less
    // than the mathematically exact payment, so the loan needs either 360
    // months (with a slightly-larger final payment) or 361 months (with a
    // very small final payment) to clear, depending on how rounding error
    // accumulates. Both are correct; the disagreement is sub-cent.
    const months = computeMonthsForPayment(
      toMinor(200_000, 'USD'),
      0.06,
      computeScheduledPaymentMinor(toMinor(200_000, 'USD'), 0.06, 360),
    );
    assert.ok(
      months === 360 || months === 361,
      `expected 360 or 361 months, got ${months}`,
    );
  });

  it('handles 0% APR by integer division', () => {
    // $1200 at 0% APR with $100/mo → 12 months
    const months = computeMonthsForPayment(toMinor(1200, 'USD'), 0, toMinor(100, 'USD'));
    assert.equal(months, 12);
  });

  it('returns Infinity for non-positive monthly payment', () => {
    assert.equal(computeMonthsForPayment(toMinor(1000, 'USD'), 0.05, 0), Infinity);
    assert.equal(computeMonthsForPayment(toMinor(1000, 'USD'), 0.05, -100), Infinity);
  });
});

// ---------------------------------------------------------------------------
// Schedule precision invariants
// ---------------------------------------------------------------------------

describe('buildSchedule precision invariants', () => {
  it('sum of principal payments equals the original loan exactly (USD)', () => {
    const principal = toMinor(250_000, 'USD');
    const payment = computeScheduledPaymentMinor(principal, 0.065, 360);
    const { schedule, error } = buildSchedule(principal, 0.065, payment);
    assert.equal(error, undefined);
    const principalSum = schedule.reduce((s, r) => s + r.principal, 0);
    assert.equal(
      principalSum,
      principal,
      `principal sum ${principalSum} should equal ${principal}`,
    );
  });

  it('sum of principal payments equals the original loan exactly (JPY, no decimals)', () => {
    const principal = toMinor(10_000_000, 'JPY');
    const payment = computeScheduledPaymentMinor(principal, 0.025, 240);
    const { schedule, error } = buildSchedule(principal, 0.025, payment);
    assert.equal(error, undefined);
    const principalSum = schedule.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal);
  });

  it('sum of (principal + interest) per row equals payment per row', () => {
    const principal = toMinor(50_000, 'USD');
    const payment = computeScheduledPaymentMinor(principal, 0.072, 60);
    const { schedule } = buildSchedule(principal, 0.072, payment);
    for (const row of schedule) {
      assert.equal(
        row.payment,
        row.principal + row.interest,
        `row ${row.month}: ${row.payment} ≠ ${row.principal} + ${row.interest}`,
      );
    }
  });

  it('balance reaches exactly zero on the final row', () => {
    const principal = toMinor(35_000, 'USD');
    const payment = computeScheduledPaymentMinor(principal, 0.045, 84);
    const { schedule } = buildSchedule(principal, 0.045, payment);
    assert.equal(schedule.at(-1)?.balance, 0);
  });

  it('rejects payment too low to cover interest (interest-only trap)', () => {
    // $100k at 6% needs at least $500.01/mo to ever amortize.
    const { error, schedule } = buildSchedule(
      toMinor(100_000, 'USD'),
      0.06,
      toMinor(400, 'USD'),
    );
    assert.equal(schedule.length, 0);
    assert.match(error ?? '', /never pay off|cover the first month/i);
  });

  it('rejects zero or negative principal', () => {
    const { error: errZero } = buildSchedule(0, 0.05, toMinor(100, 'USD'));
    assert.match(errZero ?? '', /Principal/i);
    const { error: errNeg } = buildSchedule(-1, 0.05, toMinor(100, 'USD'));
    assert.match(errNeg ?? '', /Principal/i);
  });

  it('zero-APR loan: principal sum still matches and final balance is 0', () => {
    const principal = toMinor(12_000, 'USD');
    const { schedule } = buildSchedule(principal, 0, toMinor(1000, 'USD'));
    assert.equal(schedule.length, 12);
    assert.equal(schedule.at(-1)?.balance, 0);
    assert.equal(schedule.reduce((s, r) => s + r.principal, 0), principal);
    // No interest at 0% APR.
    assert.equal(schedule.reduce((s, r) => s + r.interest, 0), 0);
  });
});

// ---------------------------------------------------------------------------
// computeLoan: top-level orchestration
// ---------------------------------------------------------------------------

describe('computeLoan', () => {
  it('produces consistent monthly/total for a 30-year fixed', () => {
    const result = computeLoan(
      { principalMinor: toMinor(300_000, 'USD'), annualRate: 0.07 },
      { kind: 'term', months: 360 },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.months, 360);
    // Monthly payment for $300k @ 7% for 30y is $1,995.91
    assert.equal(result.monthlyPaymentMinor, 199591);
    // Total paid = 360 * monthlyPayment ± reconciliation cents
    const expected = 199591 * 360;
    assert.ok(
      Math.abs(result.totalPaidMinor - expected) <= 360, // ≤ 1 cent per month tolerance
      `totalPaid ${result.totalPaidMinor} too far from ${expected}`,
    );
    // Total interest = total paid - principal
    assert.equal(
      result.totalInterestMinor,
      result.totalPaidMinor - toMinor(300_000, 'USD'),
    );
  });

  it('extra monthly principal reduces total interest and shortens term', () => {
    const principalMinor = toMinor(200_000, 'USD');
    const baseline = computeLoan(
      { principalMinor, annualRate: 0.06 },
      { kind: 'term', months: 360 },
    );
    const withExtra = computeLoan(
      {
        principalMinor,
        annualRate: 0.06,
        extraMonthlyMinor: toMinor(200, 'USD'),
      },
      { kind: 'term', months: 360 },
    );
    assert.ok(
      withExtra.months < baseline.months,
      `expected fewer months with extra payments: ${withExtra.months} vs ${baseline.months}`,
    );
    assert.ok(
      withExtra.totalInterestMinor < baseline.totalInterestMinor,
      'expected less total interest with extra payments',
    );
  });

  it('origination fee is added to total paid but not to total interest', () => {
    const principalMinor = toMinor(100_000, 'USD');
    const noFee = computeLoan(
      { principalMinor, annualRate: 0.05 },
      { kind: 'term', months: 180 },
    );
    const withFee = computeLoan(
      { principalMinor, annualRate: 0.05, feeMinor: toMinor(2500, 'USD') },
      { kind: 'term', months: 180 },
    );
    assert.equal(
      withFee.totalPaidMinor - noFee.totalPaidMinor,
      toMinor(2500, 'USD'),
      'fee should add exactly itself to total paid',
    );
    assert.equal(
      withFee.totalInterestMinor,
      noFee.totalInterestMinor,
      'fee should not affect total interest',
    );
  });

  it('payment-mode produces same payoff months as solve-for-term', () => {
    const principalMinor = toMinor(150_000, 'USD');
    const term = computeLoan(
      { principalMinor, annualRate: 0.055 },
      { kind: 'term', months: 240 },
    );
    const payment = computeLoan(
      { principalMinor, annualRate: 0.055 },
      { kind: 'payment', monthlyMinor: term.monthlyPaymentMinor },
    );
    assert.equal(payment.months, term.months);
    // Total paid should match within 1 cent (final-row reconciliation)
    assert.ok(Math.abs(payment.totalPaidMinor - term.totalPaidMinor) <= 1);
  });

  it('rejects invalid principal', () => {
    const r = computeLoan(
      { principalMinor: 0, annualRate: 0.05 },
      { kind: 'term', months: 60 },
    );
    assert.match(r.error ?? '', /loan amount|principal/i);
  });

  it('rejects negative interest rate', () => {
    const r = computeLoan(
      { principalMinor: toMinor(1000, 'USD'), annualRate: -0.01 },
      { kind: 'term', months: 60 },
    );
    assert.match(r.error ?? '', /non-negative|negative/i);
  });

  it('rejects invalid term', () => {
    const r = computeLoan(
      { principalMinor: toMinor(1000, 'USD'), annualRate: 0.05 },
      { kind: 'term', months: 0 },
    );
    assert.match(r.error ?? '', /term|month/i);
  });
});

// ---------------------------------------------------------------------------
// formatMonths
// ---------------------------------------------------------------------------

describe('formatMonths', () => {
  it('formats months under a year', () => {
    assert.equal(formatMonths(6), '6 mo');
  });
  it('formats whole years', () => {
    assert.equal(formatMonths(24), '2 yr');
  });
  it('formats years plus months', () => {
    assert.equal(formatMonths(30), '2 yr 6 mo');
  });
  it('returns "n/a" for non-positive', () => {
    assert.equal(formatMonths(0), 'n/a');
    assert.equal(formatMonths(-1), 'n/a');
  });
});
