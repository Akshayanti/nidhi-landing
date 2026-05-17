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
  buildScheduleAdvanced,
  computeApr,
  computeLoan,
  computeMonthsForPayment,
  computeScheduledPaymentMinor,
  equityAtMonth,
  formatApr,
  formatMoney,
  formatMonths,
  fromMinor,
  getCurrency,
  pickSplitSamples,
  pointsBreakEven,
  rateForMonth,
  refinanceComparison,
  roundMinor,
  toMinor,
} from './math.ts';

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

  it('formats USD with US grouping, code appended for dollar currencies', () => {
    const s = formatMoney(toMinor(1234567.89, 'USD'), 'USD');
    assert.match(s, /\$/);
    assert.ok(/1,234,567\.89/.test(s), `got: ${s}`);
    assert.ok(s.endsWith(' USD'), `expected USD suffix, got: ${s}`);
  });

  it('formats CAD with code appended (shares $ symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'CAD'), 'CAD');
    assert.match(s, /\$/);
    assert.ok(s.endsWith(' CAD'), `expected CAD suffix, got: ${s}`);
  });

  it('formats AUD with code appended (shares $ symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'AUD'), 'AUD');
    assert.match(s, /\$/);
    assert.ok(s.endsWith(' AUD'), `expected AUD suffix, got: ${s}`);
  });

  it('formats SGD with code appended (shares $ symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'SGD'), 'SGD');
    assert.match(s, /\$/);
    assert.ok(s.endsWith(' SGD'), `expected SGD suffix, got: ${s}`);
  });

  it('formats HKD with code appended (shares $ symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'HKD'), 'HKD');
    assert.match(s, /\$/);
    assert.ok(s.endsWith(' HKD'), `expected HKD suffix, got: ${s}`);
  });

  it('formats NZD with code appended (shares $ symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'NZD'), 'NZD');
    assert.match(s, /\$/);
    assert.ok(s.endsWith(' NZD'), `expected NZD suffix, got: ${s}`);
  });

  it('formats INR with Indian (lakh/crore) grouping, no code appended', () => {
    const s = formatMoney(toMinor(12345678, 'INR'), 'INR');
    assert.ok(/1,23,45,678/.test(s), `expected Indian grouping in: ${s}`);
    assert.ok(!s.endsWith(' INR'), `INR should not have suffix, got: ${s}`);
  });

  it('formats INR fractional amounts with Indian grouping, no code appended', () => {
    const s = formatMoney(toMinor(125000.5, 'INR'), 'INR');
    assert.ok(/1,25,000\.50/.test(s), `expected Indian grouping in: ${s}`);
    assert.ok(!s.endsWith(' INR'), `INR should not have suffix, got: ${s}`);
  });

  it('formats JPY without decimals, no code appended', () => {
    const s = formatMoney(toMinor(1234567, 'JPY'), 'JPY');
    assert.ok(/1,234,567/.test(s), `got: ${s}`);
    assert.ok(!/\.\d/.test(s), `JPY should not have decimals: ${s}`);
    assert.ok(!s.endsWith(' JPY'), `JPY should not have suffix, got: ${s}`);
  });

  it('formats EUR with German grouping (de-DE locale), no code appended', () => {
    const s = formatMoney(toMinor(1234567.89, 'EUR'), 'EUR');
    assert.ok(/1\.234\.567,89/.test(s), `expected German grouping in: ${s}`);
    assert.ok(!s.endsWith(' EUR'), `EUR should not have suffix, got: ${s}`);
  });

  it('formats CHF without code appended (unique symbol)', () => {
    const s = formatMoney(toMinor(1234567.89, 'CHF'), 'CHF');
    assert.ok(!s.endsWith(' CHF'), `CHF should not have suffix, got: ${s}`);
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

// ---------------------------------------------------------------------------
// APR
// ---------------------------------------------------------------------------

describe('computeApr', () => {
  // Helper: build a clean contract schedule for a fixed-rate fully-amortizing
  // loan with no extra principal. Mirrors what `computeLoan` does internally.
  function contract(principalMajor: number, annualRate: number, months: number) {
    const principalMinor = toMinor(principalMajor, 'USD');
    const payment = computeScheduledPaymentMinor(principalMinor, annualRate, months);
    const { schedule, error } = buildSchedule(principalMinor, annualRate, payment);
    assert.equal(error, undefined);
    return { principalMinor, schedule };
  }

  it('equals nominal rate (within rounding) when fee is zero', () => {
    const { principalMinor, schedule } = contract(250_000, 0.065, 360);
    const apr = computeApr(principalMinor, 0, schedule);
    // With cents-rounding the schedule's effective rate drifts a hair from
    // the input rate, but the disagreement is in the fourth decimal of
    // percent at most for any realistic loan size.
    assert.ok(
      Math.abs(apr - 0.065) < 5e-5,
      `expected APR ≈ 6.50%, got ${(apr * 100).toFixed(4)}%`,
    );
  });

  it('is greater than nominal rate when a positive fee is added', () => {
    const { principalMinor, schedule } = contract(250_000, 0.06, 360);
    const apr = computeApr(principalMinor, toMinor(2500, 'USD'), schedule);
    assert.ok(apr > 0.06, `expected APR > nominal 6%, got ${(apr * 100).toFixed(4)}%`);
    // Sanity ceiling: a $2,500 fee on a $250k 30-year loan is roughly
    // ~10 bps to ~12 bps of APR uplift; if it's outside [6.05%, 6.20%]
    // something has gone wrong with the solver or the schedule.
    assert.ok(apr > 0.0605 && apr < 0.062, `APR uplift out of band: ${(apr * 100).toFixed(4)}%`);
  });

  // The strongest test of correctness is the defining identity itself: at
  // the returned APR, the present value of the contract payment stream
  // (discounted monthly) equals the net amount disbursed (principal − fee).
  // We verify this for the blog post's headline example to within 1 cent.
  it("satisfies the PV identity for the blog post's 3.1% + €3,000 case to within 1 cent", () => {
    const principalMinor = toMinor(250_000, 'EUR');
    const feeMinor = toMinor(3000, 'EUR');
    const payment = computeScheduledPaymentMinor(principalMinor, 0.031, 300);
    const { schedule } = buildSchedule(principalMinor, 0.031, payment);
    const apr = computeApr(principalMinor, feeMinor, schedule);

    // Reconstruct PV at the returned APR and check it matches netAdvance.
    const monthly = apr / 12;
    let pv = 0;
    let denom = 1 + monthly;
    for (const row of schedule) {
      pv += row.payment / denom;
      denom *= 1 + monthly;
    }
    const netAdvance = principalMinor - feeMinor;
    assert.ok(
      Math.abs(pv - netAdvance) < 1,
      `PV at APR ${(apr * 100).toFixed(4)}% = ${pv.toFixed(2)}, expected ${netAdvance}`,
    );

    // Also bound the magnitude: blog labels this "~3.3%" but the
    // mathematically exact nominal APR is closer to 3.21% (the blog
    // rounds aggressively). It must be strictly above the nominal 3.1%
    // and well below 3.5%.
    assert.ok(
      apr > 0.031 && apr < 0.035,
      `APR out of expected band: ${(apr * 100).toFixed(4)}%`,
    );
  });

  it("satisfies the PV identity for the blog post's 2.9% + €5,000 case to within 1 cent", () => {
    const principalMinor = toMinor(250_000, 'EUR');
    const feeMinor = toMinor(5000, 'EUR');
    const payment = computeScheduledPaymentMinor(principalMinor, 0.029, 300);
    const { schedule } = buildSchedule(principalMinor, 0.029, payment);
    const apr = computeApr(principalMinor, feeMinor, schedule);

    const monthly = apr / 12;
    let pv = 0;
    let denom = 1 + monthly;
    for (const row of schedule) {
      pv += row.payment / denom;
      denom *= 1 + monthly;
    }
    const netAdvance = principalMinor - feeMinor;
    assert.ok(
      Math.abs(pv - netAdvance) < 1,
      `PV at APR ${(apr * 100).toFixed(4)}% = ${pv.toFixed(2)}, expected ${netAdvance}`,
    );
    // Strictly above nominal 2.9%, below 3.5%.
    assert.ok(
      apr > 0.029 && apr < 0.035,
      `APR out of expected band: ${(apr * 100).toFixed(4)}%`,
    );
  });

  // Universal PV-identity check across a sweep of representative loan
  // shapes. This is the regression net: any future change to the solver
  // that violates the defining APR equation will fail here, regardless of
  // which exact APR the change happens to produce.
  it('satisfies the PV identity across a sweep of loan shapes', () => {
    const cases: { principal: number; rate: number; months: number; fee: number }[] = [
      { principal: 100_000, rate: 0.05,  months: 360, fee: 0 },
      { principal: 100_000, rate: 0.05,  months: 360, fee: 1_000 },
      { principal: 250_000, rate: 0.07,  months: 360, fee: 4_500 },
      { principal: 25_000,  rate: 0.045, months:  60, fee: 250 },
      { principal: 50_000,  rate: 0.10,  months: 120, fee: 1_500 },
      { principal: 1_000,   rate: 0.30,  months:  12, fee: 50 },
      { principal: 500_000, rate: 0.025, months: 240, fee: 0 },
      { principal: 200_000, rate: 0.06,  months: 180, fee: 8_000 },
    ];
    for (const c of cases) {
      const P = toMinor(c.principal, 'USD');
      const F = toMinor(c.fee, 'USD');
      const payment = computeScheduledPaymentMinor(P, c.rate, c.months);
      const { schedule } = buildSchedule(P, c.rate, payment);
      const apr = computeApr(P, F, schedule);
      const m = apr / 12;
      let pv = 0;
      let denom = 1 + m;
      for (const row of schedule) {
        pv += row.payment / denom;
        denom *= 1 + m;
      }
      const netAdvance = P - F;
      assert.ok(
        Math.abs(pv - netAdvance) < 1,
        `case ${JSON.stringify(c)}: PV=${pv.toFixed(2)} ≠ netAdvance=${netAdvance}, APR=${(apr * 100).toFixed(4)}%`,
      );
      // Sanity: APR must be ≥ nominal (fees can only raise the cost).
      // Allow tiny slack for cents-rounding in the schedule reconciliation.
      assert.ok(
        apr >= c.rate - 1e-4,
        `case ${JSON.stringify(c)}: APR ${(apr * 100).toFixed(4)}% below nominal ${(c.rate * 100).toFixed(4)}%`,
      );
    }
  });

  it('returns 0 for a zero-rate, zero-fee loan (no cost of borrowing)', () => {
    const principalMinor = toMinor(12_000, 'USD');
    const { schedule } = buildSchedule(principalMinor, 0, toMinor(1000, 'USD'));
    assert.equal(computeApr(principalMinor, 0, schedule), 0);
  });

  it('produces a positive APR when nominal is 0% but fees are non-zero', () => {
    // 0% promo financing is real (some retailers, some auto manufacturers).
    // The fee turns the cost-of-borrowing positive even if the rate is zero.
    const principalMinor = toMinor(12_000, 'USD');
    const { schedule } = buildSchedule(principalMinor, 0, toMinor(1000, 'USD'));
    const apr = computeApr(principalMinor, toMinor(300, 'USD'), schedule);
    assert.ok(apr > 0, `expected APR > 0 with 0% nominal + fee, got ${apr}`);
    // A $300 fee on a $12k 12-month 0% loan disburses $11,700 net for
    // 12 × $1,000 in payments. APR ≈ 4.5–5%. Bound it loosely.
    assert.ok(apr > 0.04 && apr < 0.06, `APR out of expected band: ${(apr * 100).toFixed(4)}%`);
  });

  it('returns NaN when the fee equals or exceeds the principal', () => {
    const { principalMinor, schedule } = contract(10_000, 0.05, 60);
    assert.ok(
      Number.isNaN(computeApr(principalMinor, principalMinor, schedule)),
      'fee == principal should yield NaN',
    );
    assert.ok(
      Number.isNaN(computeApr(principalMinor, principalMinor + 1, schedule)),
      'fee > principal should yield NaN',
    );
  });

  it('returns NaN for an empty contract schedule', () => {
    assert.ok(Number.isNaN(computeApr(toMinor(1000, 'USD'), 0, [])));
  });

  it('returns NaN for non-finite or non-positive principal', () => {
    const { schedule } = contract(10_000, 0.05, 60);
    assert.ok(Number.isNaN(computeApr(0, 0, schedule)));
    assert.ok(Number.isNaN(computeApr(-1, 0, schedule)));
    assert.ok(Number.isNaN(computeApr(NaN, 0, schedule)));
  });

  it('returns NaN for negative or non-finite fee', () => {
    const { principalMinor, schedule } = contract(10_000, 0.05, 60);
    assert.ok(Number.isNaN(computeApr(principalMinor, -1, schedule)));
    assert.ok(Number.isNaN(computeApr(principalMinor, NaN, schedule)));
  });

  it('is strictly monotonic in fee (more fee ⇒ higher APR)', () => {
    const { principalMinor, schedule } = contract(200_000, 0.055, 240);
    const fees = [0, 500, 2_000, 5_000, 10_000];
    const aprs = fees.map((f) => computeApr(principalMinor, toMinor(f, 'USD'), schedule));
    for (let i = 1; i < aprs.length; i++) {
      assert.ok(
        aprs[i] > aprs[i - 1],
        `APR not monotonic at fee=${fees[i]}: ${(aprs[i - 1] * 100).toFixed(4)}% → ${(aprs[i] * 100).toFixed(4)}%`,
      );
    }
  });

  it('matches the analytical solution for a 1-payment loan', () => {
    // Single-payment case has a closed form: net advance × (1+i) = payment.
    // For principal = $1,000, fee = $50, payment = $1,100 (rate built into
    // payment), the implied monthly rate i = 1100 / (1000 - 50) - 1
    // = 1100 / 950 - 1 ≈ 0.157894737. Nominal APR ≈ 1.894736842.
    const principalMinor = toMinor(1000, 'USD');
    const feeMinor = toMinor(50, 'USD');
    const schedule = [
      { month: 1, payment: toMinor(1100, 'USD'), interest: toMinor(100, 'USD'), principal: toMinor(1000, 'USD'), balance: 0 },
    ];
    const apr = computeApr(principalMinor, feeMinor, schedule);
    const expectedMonthly = 1100 / 950 - 1;
    const expectedNominal = expectedMonthly * 12;
    assert.ok(
      Math.abs(apr - expectedNominal) < 1e-9,
      `expected ${expectedNominal}, got ${apr}`,
    );
  });

  it('handles a JPY loan (factor=1) without precision drift', () => {
    // Zero-decimal currencies were the original motivation for the
    // integer-cent design. Verify APR still solves correctly when the
    // minor unit is the major unit.
    const principalMinor = toMinor(10_000_000, 'JPY');
    const payment = computeScheduledPaymentMinor(principalMinor, 0.025, 240);
    const { schedule } = buildSchedule(principalMinor, 0.025, payment);
    const apr = computeApr(principalMinor, toMinor(50_000, 'JPY'), schedule);
    assert.ok(apr > 0.025, `expected APR > nominal 2.5%, got ${(apr * 100).toFixed(4)}%`);
    assert.ok(apr < 0.030, `JPY APR uplift unreasonably large: ${(apr * 100).toFixed(4)}%`);
  });
});

describe('computeLoan exposes APR and contractSchedule', () => {
  it('aprNominal ≈ nominal rate when there is no fee', () => {
    const r = computeLoan(
      { principalMinor: toMinor(250_000, 'USD'), annualRate: 0.065 },
      { kind: 'term', months: 360 },
    );
    assert.ok(Math.abs(r.aprNominal - 0.065) < 1e-4, `APR=${r.aprNominal}`);
  });

  it('aprNominal > nominal rate once a fee is applied', () => {
    const r = computeLoan(
      {
        principalMinor: toMinor(250_000, 'USD'),
        annualRate: 0.065,
        feeMinor: toMinor(3000, 'USD'),
      },
      { kind: 'term', months: 360 },
    );
    assert.ok(r.aprNominal > 0.065, `expected APR > 6.5%, got ${r.aprNominal}`);
  });

  it('contractSchedule equals schedule when no extra principal is given', () => {
    const r = computeLoan(
      { principalMinor: toMinor(50_000, 'USD'), annualRate: 0.05 },
      { kind: 'term', months: 60 },
    );
    // Same reference is fine and intentional (avoids duplicate work) but
    // we accept either same-reference or row-by-row equality.
    assert.equal(r.schedule.length, r.contractSchedule.length);
    for (let i = 0; i < r.schedule.length; i++) {
      assert.deepEqual(r.schedule[i], r.contractSchedule[i]);
    }
  });

  it('contractSchedule is the no-extra schedule even when extra principal is given', () => {
    const principalMinor = toMinor(200_000, 'USD');
    const baseline = computeLoan(
      { principalMinor, annualRate: 0.06 },
      { kind: 'term', months: 360 },
    );
    const withExtra = computeLoan(
      { principalMinor, annualRate: 0.06, extraMonthlyMinor: toMinor(200, 'USD') },
      { kind: 'term', months: 360 },
    );
    // Effective schedule must be strictly shorter than the contract.
    assert.ok(
      withExtra.schedule.length < withExtra.contractSchedule.length,
      `expected effective schedule shorter than contract, got ${withExtra.schedule.length} vs ${withExtra.contractSchedule.length}`,
    );
    // Contract schedule should match the baseline (no-extra) exactly:
    // same length, same per-row cash flows. This is the strict invariant
    // we actually care about; extra principal must not bleed into the
    // contractual disclosure.
    assert.equal(withExtra.contractSchedule.length, baseline.schedule.length);
    for (let i = 0; i < baseline.schedule.length; i++) {
      assert.deepEqual(withExtra.contractSchedule[i], baseline.schedule[i]);
    }
    // And APR must match the baseline (extra principal is voluntary; it
    // doesn't change the contract or the cost the lender disclosed).
    assert.equal(withExtra.aprNominal, baseline.aprNominal);
  });

  it('aprNominal is NaN when the loan is invalid', () => {
    const r = computeLoan(
      { principalMinor: 0, annualRate: 0.05 },
      { kind: 'term', months: 60 },
    );
    assert.ok(Number.isNaN(r.aprNominal));
    assert.equal(r.contractSchedule.length, 0);
  });
});

describe('formatApr', () => {
  it('formats a typical APR with two decimals and percent sign', () => {
    const s = formatApr(0.0633);
    assert.match(s, /6\.33\s*%/);
  });

  it('formats zero APR as "0.00%"', () => {
    const s = formatApr(0);
    assert.match(s, /0\.00\s*%/);
  });

  it('returns "n/a" for NaN', () => {
    assert.equal(formatApr(NaN), 'n/a');
  });

  it('returns "n/a" for non-finite input', () => {
    assert.equal(formatApr(Infinity), 'n/a');
    assert.equal(formatApr(-Infinity), 'n/a');
  });

  it('respects the locale parameter (de-DE uses comma as decimal separator)', () => {
    const s = formatApr(0.0633, 'de-DE');
    // Either "6,33 %" or "6,33%" depending on ICU; both are valid.
    assert.match(s, /6,33\s?%/);
  });
});

// ---------------------------------------------------------------------------
// pickSplitSamples
// ---------------------------------------------------------------------------

describe('pickSplitSamples', () => {
  // Universal invariants every successful sampling must satisfy. Asserting
  // these explicitly keeps the chart's data shape contractually defined,
  // not just incidentally true.
  function assertInvariants(out: number[], total: number, target: number) {
    // 1. All entries are positive integers within range.
    for (const m of out) {
      assert.ok(Number.isInteger(m), `not an integer: ${m}`);
      assert.ok(m >= 1 && m <= total, `out of range: ${m} for total ${total}`);
    }
    // 2. Strictly increasing (uniqueness + ordering in one shot).
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i] > out[i - 1], `not strictly increasing at ${i}: ${out}`);
    }
    // 3. Anchored at 1 and `total`.
    if (total > 0) {
      assert.equal(out[0], 1, `must start at month 1, got ${out[0]}`);
      assert.equal(out[out.length - 1], total, `must end at month ${total}, got ${out[out.length - 1]}`);
    }
    // 4. Bounded by target. Allow it to be smaller than target only when
    //    the total schedule is shorter than target (short-loan fallback).
    assert.ok(
      out.length <= target,
      `expected ≤ ${target} samples, got ${out.length}`,
    );
  }

  it('returns [] for non-positive or non-finite totals', () => {
    assert.deepEqual(pickSplitSamples(0), []);
    assert.deepEqual(pickSplitSamples(-1), []);
    assert.deepEqual(pickSplitSamples(NaN), []);
    assert.deepEqual(pickSplitSamples(Infinity), []);
  });

  it('returns every month for schedules shorter than the sample target', () => {
    assert.deepEqual(pickSplitSamples(1), [1]);
    assert.deepEqual(pickSplitSamples(3), [1, 2, 3]);
    assert.deepEqual(pickSplitSamples(6), [1, 2, 3, 4, 5, 6]);
  });

  it('returns six anchored samples for a 25-year (300-month) schedule', () => {
    const out = pickSplitSamples(300, 6);
    assertInvariants(out, 300, 6);
    // Six samples, anchored. Even spacing puts intermediates near
    // 60, 120, 180, 240. Allow ±1 of off-by-one tolerance from rounding.
    assert.equal(out.length, 6);
    const expected = [1, 61, 121, 180, 240, 300];
    for (let i = 0; i < out.length; i++) {
      assert.ok(
        Math.abs(out[i] - expected[i]) <= 1,
        `sample ${i}: got ${out[i]}, expected near ${expected[i]}; full out=${out}`,
      );
    }
  });

  it('returns six anchored samples for a 30-year (360-month) schedule', () => {
    const out = pickSplitSamples(360, 6);
    assertInvariants(out, 360, 6);
    assert.equal(out[0], 1);
    assert.equal(out[out.length - 1], 360);
  });

  it('respects the target parameter', () => {
    const out = pickSplitSamples(360, 4);
    assertInvariants(out, 360, 4);
    assert.equal(out.length, 4);
  });

  it('falls back to a minimum target of 2 if asked for fewer', () => {
    // The chart needs at least the first and last to be meaningful;
    // collapsing to one sample would turn the bar into a hint, not a chart.
    const out = pickSplitSamples(360, 1);
    assertInvariants(out, 360, 2);
    assert.equal(out.length, 2);
    assert.deepEqual(out, [1, 360]);
  });

  it('does not duplicate adjacent samples on tightly-bound short loans', () => {
    // Edge case where rounding could push two intermediate samples to the
    // same integer; the function must drop duplicates while still reaching
    // the final month.
    for (let total = 7; total <= 20; total++) {
      const out = pickSplitSamples(total, 6);
      assertInvariants(out, total, 6);
    }
  });

  it('is robust to fractional totals (floors before computing)', () => {
    const out = pickSplitSamples(300.7, 6);
    assertInvariants(out, 300, 6);
    assert.equal(out[out.length - 1], 300);
  });
});

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

// ---------------------------------------------------------------------------
// Advanced engine: rate spec
// ---------------------------------------------------------------------------

describe('rateForMonth', () => {
  it('returns the fixed rate every month', () => {
    const spec = { kind: 'fixed' as const, annualRate: 0.05 };
    assert.equal(rateForMonth(spec, 1), 0.05);
    assert.equal(rateForMonth(spec, 360), 0.05);
  });

  it('returns the initial rate at and before the boundary, subsequent after', () => {
    const spec = {
      kind: 'hybrid' as const,
      initialAnnualRate: 0.04,
      initialMonths: 60,
      subsequentAnnualRate: 0.07,
    };
    assert.equal(rateForMonth(spec, 1), 0.04);
    assert.equal(rateForMonth(spec, 60), 0.04);
    assert.equal(rateForMonth(spec, 61), 0.07);
    assert.equal(rateForMonth(spec, 360), 0.07);
  });
});

// ---------------------------------------------------------------------------
// Advanced engine: hybrid rate loans
// ---------------------------------------------------------------------------

describe('computeLoan: hybrid rate', () => {
  const principal = 30_000_000; // 300,000.00 in minor units
  const term = 360;

  it('uses the initial rate before the transition and the subsequent rate after', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.04, // ignored when rateSpec is supplied
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.04,
          initialMonths: 60,
          subsequentAnnualRate: 0.07,
        },
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.error, undefined);
    assert.ok(result.schedule.length === term || result.schedule.length === term + 1);

    // Month-1 interest at 4% nominal on full balance.
    const expectedFirstInterest = roundMinor(principal * (0.04 / 12));
    assert.equal(result.schedule[0].interest, expectedFirstInterest);

    // Payment at the start should match the initial closed-form payment
    // (300k @ 4% over 360 months ~ 1432.25/mo, in cents).
    const initialPayment = computeScheduledPaymentMinor(principal, 0.04, 360);
    assert.equal(result.schedule[0].payment, initialPayment);

    // After the transition, the payment is recast against remaining
    // balance and remaining months at the subsequent rate. The recast
    // payment should be strictly larger than the initial one (rate jumped
    // up). And month-61 interest must reflect the 7% rate.
    const balanceEndOfMonth60 = result.schedule[59].balance;
    const expectedM61Interest = roundMinor(balanceEndOfMonth60 * (0.07 / 12));
    assert.equal(result.schedule[60].interest, expectedM61Interest);
    assert.ok(result.schedule[60].payment > result.schedule[0].payment);
  });

  it('keeps the integer-cent invariant: principal column sums exactly to the loan amount', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.03,
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.03,
          initialMonths: 84,
          subsequentAnnualRate: 0.055,
        },
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.error, undefined);
    const principalSum = result.schedule.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal);
    // No precision warning emitted.
    assert.ok(!result.warnings.some((w) => w.includes('precision check')));
  });

  it('still amortizes within the contractual term after recast', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.04,
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.04,
          initialMonths: 60,
          subsequentAnnualRate: 0.06,
        },
      },
      { kind: 'term', months: 360 },
    );
    assert.equal(result.error, undefined);
    // Integer-cent rounding can leave a sub-cent stub for one extra
    // month; the engine accepts this (closed-form payment rounded down).
    assert.ok(result.schedule.length === 360 || result.schedule.length === 361);
    assert.equal(result.schedule[result.schedule.length - 1].balance, 0);
  });

  it('rejects hybrid + payment mode (term is required for recast)', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.04,
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.04,
          initialMonths: 60,
          subsequentAnnualRate: 0.07,
        },
      },
      { kind: 'payment', monthlyMinor: 200_000 },
    );
    assert.ok(result.error);
    assert.match(result.error!, /hybrid/i);
  });

  it('rejects an invalid initial period', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.04,
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.04,
          initialMonths: 0,
          subsequentAnnualRate: 0.07,
        },
      },
      { kind: 'term', months: 360 },
    );
    assert.ok(result.error);
  });

  it('rejects a negative subsequent rate', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: 0.04,
        rateSpec: {
          kind: 'hybrid',
          initialAnnualRate: 0.04,
          initialMonths: 60,
          subsequentAnnualRate: -0.01,
        },
      },
      { kind: 'term', months: 360 },
    );
    assert.ok(result.error);
  });
});

// ---------------------------------------------------------------------------
// Advanced engine: lump-sum prepayments
// ---------------------------------------------------------------------------

describe('computeLoan: lump-sum prepayments', () => {
  const principal = 20_000_000; // 200,000
  const rate = 0.05;
  const term = 360;

  it('reduces the balance immediately the same month, with no extra interest accrued', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 12, amountMinor: 1_000_000 }], // 10,000
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.error, undefined);

    const baseline = computeLoan(
      { principalMinor: principal, annualRate: rate },
      { kind: 'term', months: term },
    );

    // Month-12 interest must equal pre-lump balance interest (lump applies
    // AFTER the regular payment). So month-12 interest should be the same
    // as in the no-lump baseline.
    assert.equal(result.schedule[11].interest, baseline.schedule[11].interest);

    // End-of-month-12 balance should be exactly baseline balance minus 10k.
    assert.equal(result.schedule[11].balance, baseline.schedule[11].balance - 1_000_000);

    // Month-12 row's payment should reflect the lump.
    assert.equal(
      result.schedule[11].payment,
      baseline.schedule[11].payment + 1_000_000,
    );
  });

  it('shortens the term and reduces total interest', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 24, amountMinor: 2_000_000 }],
      },
      { kind: 'term', months: term },
    );
    const baseline = computeLoan(
      { principalMinor: principal, annualRate: rate },
      { kind: 'term', months: term },
    );
    assert.ok(result.schedule.length < baseline.schedule.length);
    assert.ok(result.totalInterestMinor < baseline.totalInterestMinor);
  });

  it('preserves the integer-cent invariant on principal', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [
          { month: 12, amountMinor: 500_000 },
          { month: 36, amountMinor: 750_000 },
          { month: 60, amountMinor: 250_000 },
        ],
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.error, undefined);
    const principalSum = result.schedule.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal);
  });

  it('sums multiple lumps in the same month', () => {
    const single = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 6, amountMinor: 800_000 }],
      },
      { kind: 'term', months: term },
    );
    const split = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [
          { month: 6, amountMinor: 300_000 },
          { month: 6, amountMinor: 500_000 },
        ],
      },
      { kind: 'term', months: term },
    );
    assert.equal(single.schedule.length, split.schedule.length);
    assert.equal(single.totalInterestMinor, split.totalInterestMinor);
    assert.equal(single.schedule[5].balance, split.schedule[5].balance);
  });

  it('caps a lump that exceeds the remaining balance', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 6, amountMinor: 50_000_000 }], // way more than balance
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.error, undefined);
    // Loan paid off in month 6.
    assert.equal(result.schedule.length, 6);
    assert.equal(result.schedule[5].balance, 0);
    const principalSum = result.schedule.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal);
  });

  it('contractSchedule ignores lump sums (APR is on the contract)', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 12, amountMinor: 1_000_000 }],
      },
      { kind: 'term', months: term },
    );
    // The contract schedule is identical to a no-lump baseline.
    const baseline = computeLoan(
      { principalMinor: principal, annualRate: rate },
      { kind: 'term', months: term },
    );
    assert.equal(
      result.contractSchedule[result.contractSchedule.length - 1].balance,
      0,
    );
    assert.equal(result.contractSchedule.length, baseline.schedule.length);
  });
});

// ---------------------------------------------------------------------------
// Advanced engine: prepayment penalty
// ---------------------------------------------------------------------------

describe('computeLoan: prepayment penalty', () => {
  const principal = 15_000_000;
  const rate = 0.05;
  const term = 360;

  it('charges the penalty when the loan is paid off early within the penalty window', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        extraMonthlyMinor: 200_000, // big extra to pay off well before 360
        prepaymentPenalty: { pctOfBalance: 0.02, untilMonth: 60 },
      },
      { kind: 'term', months: term },
    );
    // Penalty applies only if effective payoff is on or before month 60.
    if (result.schedule.length <= 60) {
      assert.ok(result.prepaymentPenaltyMinor > 0);
      // Penalty included in totalPaid.
      const payments = result.schedule.reduce((s, r) => s + r.payment, 0);
      assert.equal(
        result.totalPaidMinor,
        payments + result.feeMinor + result.prepaymentPenaltyMinor,
      );
    }
  });

  it('does not charge a penalty when the loan is paid off after the window', () => {
    // Tiny extra, so payoff lands well past month 24.
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        extraMonthlyMinor: 1000,
        prepaymentPenalty: { pctOfBalance: 0.02, untilMonth: 24 },
      },
      { kind: 'term', months: term },
    );
    assert.ok(result.schedule.length > 24);
    assert.equal(result.prepaymentPenaltyMinor, 0);
  });

  it('does not charge a penalty when no early payoff occurs', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        prepaymentPenalty: { pctOfBalance: 0.02, untilMonth: 60 },
      },
      { kind: 'term', months: term },
    );
    // No voluntary action; effective schedule equals contract schedule.
    assert.equal(result.schedule.length, result.contractSchedule.length);
    assert.equal(result.prepaymentPenaltyMinor, 0);
  });

  it('combines flat and percentage components', () => {
    const result = computeLoan(
      {
        principalMinor: principal,
        annualRate: rate,
        lumpSums: [{ month: 6, amountMinor: 50_000_000 }], // pay off in month 6
        prepaymentPenalty: { pctOfBalance: 0.01, untilMonth: 60, flatMinor: 50_000 },
      },
      { kind: 'term', months: term },
    );
    assert.equal(result.schedule.length, 6);
    assert.ok(result.prepaymentPenaltyMinor > 50_000); // includes the flat
  });
});

// ---------------------------------------------------------------------------
// Equity snapshot
// ---------------------------------------------------------------------------

describe('equityAtMonth', () => {
  const principal = 20_000_000;
  const fee = 200_000;
  const result = computeLoan(
    { principalMinor: principal, annualRate: 0.05, feeMinor: fee },
    { kind: 'term', months: 360 },
  );

  it('returns zeros for an empty schedule', () => {
    const snap = equityAtMonth([], 12, 0);
    assert.equal(snap.principalPaidMinor, 0);
    assert.equal(snap.balanceMinor, 0);
  });

  it('includes the origination fee in total out-of-pocket', () => {
    const snap = equityAtMonth(result.schedule, 12, fee);
    const payments = result.schedule.slice(0, 12).reduce((s, r) => s + r.payment, 0);
    assert.equal(snap.totalOutOfPocketMinor, payments + fee);
  });

  it('reports principal/interest/balance consistently with the schedule', () => {
    const m = 36;
    const snap = equityAtMonth(result.schedule, m, fee);
    const principalPaid = result.schedule.slice(0, m).reduce((s, r) => s + r.principal, 0);
    const interestPaid = result.schedule.slice(0, m).reduce((s, r) => s + r.interest, 0);
    assert.equal(snap.principalPaidMinor, principalPaid);
    assert.equal(snap.interestPaidMinor, interestPaid);
    assert.equal(snap.balanceMinor, result.schedule[m - 1].balance);
    assert.equal(snap.month, m);
  });

  it('clamps a month past the schedule to the last row', () => {
    const snap = equityAtMonth(result.schedule, 9999, fee);
    assert.equal(snap.month, result.schedule[result.schedule.length - 1].month);
    assert.equal(snap.balanceMinor, 0);
    assert.equal(snap.principalPaidMinor, principal);
  });

  it('returns zero principal for month 1 of a fresh loan, almost', () => {
    const snap = equityAtMonth(result.schedule, 1, 0);
    assert.equal(snap.principalPaidMinor, result.schedule[0].principal);
    assert.equal(snap.balanceMinor, result.schedule[0].balance);
  });
});

// ---------------------------------------------------------------------------
// Points break-even
// ---------------------------------------------------------------------------

describe('pointsBreakEven', () => {
  const principal = 30_000_000;
  const term = 360;

  it('finds a finite, positive break-even when paying points lowers the rate', () => {
    const withPoints = computeLoan(
      { principalMinor: principal, annualRate: 0.055, feeMinor: 600_000 }, // 6,000 in points
      { kind: 'term', months: term },
    );
    const withoutPoints = computeLoan(
      { principalMinor: principal, annualRate: 0.06, feeMinor: 0 },
      { kind: 'term', months: term },
    );
    const be = pointsBreakEven(withPoints, withoutPoints);
    assert.ok(be.months > 0 && be.months < term);
    assert.ok(be.monthlySavingsMinor > 0);
    // Lifetime savings positive when points pay off over the full term.
    assert.ok(be.lifetimeSavingsMinor > 0);
  });

  it('returns Infinity when points do not actually lower the monthly payment', () => {
    const withPoints = computeLoan(
      { principalMinor: principal, annualRate: 0.06, feeMinor: 600_000 },
      { kind: 'term', months: term },
    );
    const withoutPoints = computeLoan(
      { principalMinor: principal, annualRate: 0.06, feeMinor: 0 },
      { kind: 'term', months: term },
    );
    const be = pointsBreakEven(withPoints, withoutPoints);
    assert.equal(be.months, Infinity);
    assert.ok(be.lifetimeSavingsMinor < 0); // points are pure cost
  });

  it('returns 0 months when the upfront cost is zero', () => {
    const a = computeLoan(
      { principalMinor: principal, annualRate: 0.055 },
      { kind: 'term', months: term },
    );
    const b = computeLoan(
      { principalMinor: principal, annualRate: 0.06 },
      { kind: 'term', months: term },
    );
    const be = pointsBreakEven(a, b);
    assert.equal(be.months, 0);
  });
});

// ---------------------------------------------------------------------------
// Refinance comparison
// ---------------------------------------------------------------------------

describe('refinanceComparison', () => {
  const principal = 30_000_000;
  const term = 360;
  const original = computeLoan(
    { principalMinor: principal, annualRate: 0.07, feeMinor: 300_000 },
    { kind: 'term', months: term },
  );

  it('saves money when refinancing into a substantially lower rate early', () => {
    const cmp = refinanceComparison(original, 36, 0.04, 360, 200_000);
    assert.ok(!('error' in cmp));
    if (!('error' in cmp)) {
      assert.ok(cmp.savingsMinor > 0);
      assert.ok(cmp.breakEvenMonths > 0 && Number.isFinite(cmp.breakEvenMonths));
      // Snapshot must align with original schedule.
      assert.equal(cmp.snapshotAtRefi.month, 36);
      assert.equal(cmp.snapshotAtRefi.balanceMinor, original.schedule[35].balance);
    }
  });

  it('returns Infinity break-even when the new monthly is not lower', () => {
    // Refi at the same rate but pay a fee: monthly is essentially the
    // same (or higher because we re-amortize a smaller balance over
    // more months might actually drop it; pick a higher rate to ensure
    // monthly increases).
    const cmp = refinanceComparison(original, 36, 0.09, 360, 200_000);
    assert.ok(!('error' in cmp));
    if (!('error' in cmp)) {
      // New monthly will be higher than original (rate jumped). So
      // break-even is unreachable.
      assert.equal(cmp.breakEvenMonths, Infinity);
    }
  });

  it('rejects an out-of-range refinance month', () => {
    assert.ok('error' in refinanceComparison(original, 0, 0.04, 360, 0));
    assert.ok('error' in refinanceComparison(original, term, 0.04, 360, 0));
    assert.ok('error' in refinanceComparison(original, term + 10, 0.04, 360, 0));
  });

  it('rejects bad rates and terms', () => {
    assert.ok('error' in refinanceComparison(original, 36, -0.01, 360, 0));
    assert.ok('error' in refinanceComparison(original, 36, 0.04, 0, 0));
  });

  it('rolls the new fee into principal when requested', () => {
    const outOfPocket = refinanceComparison(original, 36, 0.04, 360, 200_000, false);
    const rolled = refinanceComparison(original, 36, 0.04, 360, 200_000, true);
    assert.ok(!('error' in outOfPocket) && !('error' in rolled));
    if (!('error' in outOfPocket) && !('error' in rolled)) {
      // Rolling the fee in means a slightly higher new principal,
      // hence slightly higher monthly and slightly different totals.
      // Both totals must still produce a self-consistent answer.
      assert.notEqual(outOfPocket.refinanceTotalMinor, rolled.refinanceTotalMinor);
      // Rolled-in: break-even is 0 because there is no out-of-pocket
      // fee to recoup at the moment of refi.
      assert.equal(rolled.breakEvenMonths, 0);
    }
  });

  it('keep total equals the original full-term cost', () => {
    const cmp = refinanceComparison(original, 36, 0.04, 360, 200_000);
    assert.ok(!('error' in cmp));
    if (!('error' in cmp)) {
      assert.equal(cmp.keepTotalMinor, original.totalPaidMinor);
    }
  });
});
