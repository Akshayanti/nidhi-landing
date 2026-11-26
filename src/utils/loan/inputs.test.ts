/**
 * Unit tests for src/utils/loanCompareInputs.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdvancedFields,
  comparisonWithheld,
  computeFromInput,
  computeNoPointsBaseline,
  isUnreadable,
  loanFromInput,
  parseNumber,
  unreadableOptionalFields,
  OPTIONAL_UNREADABLE,
  POINTS_ABOVE_FEE,
  RATE_CHANGE_INCOMPLETE,
  missingRateChangeFields,
  pointsCostAboveFee,
} from './inputs.ts';
import { canonicalLumpSums, decodeFromQueryString, makeDefaultVendor, type VendorInput } from './url.ts';
import { pointsBreakEven } from './math.ts';

/** Compose a fully-populated VendorInput by spreading the slot-0 default
 *  and overriding the fields we care about. Keeps each test focused. */
function vendor(overrides: Partial<VendorInput> = {}): VendorInput {
  return { ...makeDefaultVendor(0), ...overrides };
}

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------

describe('parseNumber', () => {
  it('parses a plain integer', () => {
    assert.equal(parseNumber('1234'), 1234);
  });

  it('parses a decimal value', () => {
    assert.equal(parseNumber('1234.56'), 1234.56);
  });

  it('strips comma group separators', () => {
    assert.equal(parseNumber('1,234,567'), 1234567);
    assert.equal(parseNumber('1,234.56'), 1234.56);
  });

  it('strips whitespace separators', () => {
    assert.equal(parseNumber('1 234 567'), 1234567);
    assert.equal(parseNumber('  42 '), 42);
  });

  it('returns NaN for an empty string', () => {
    assert.ok(Number.isNaN(parseNumber('')));
  });

  it('returns NaN for non-numeric content', () => {
    assert.ok(Number.isNaN(parseNumber('abc')));
    assert.ok(Number.isNaN(parseNumber('12abc')));
    assert.ok(Number.isNaN(parseNumber('1.2.3')));
  });

  it('parses zero', () => {
    assert.equal(parseNumber('0'), 0);
  });

  it('parses a negative number', () => {
    assert.equal(parseNumber('-12.5'), -12.5);
  });

  it('returns NaN for Infinity / -Infinity tokens (rejects non-finite)', () => {
    assert.ok(Number.isNaN(parseNumber('Infinity')));
    assert.ok(Number.isNaN(parseNumber('-Infinity')));
  });

  it('reads plain decimal digits only: no hex, exponent, binary or octal spellings (issue 352)', () => {
    for (const text of ['0x10', '0X1F', '1e5', '1E5', '2.5e3', '1e-3', '0b101', '0o17', '+-5', '5-', '.', '-', '+']) {
      assert.ok(Number.isNaN(parseNumber(text)), text);
    }
    assert.equal(parseNumber('.5'), 0.5);
    assert.equal(parseNumber('5.'), 5);
    assert.equal(parseNumber('+5'), 5);
    assert.equal(parseNumber('007'), 7);
  });

  it('a fee typed as 1e5 or 0x10 is an unreadable box, not a fee of 100,000 or 16', () => {
    for (const feeMajor of ['1e5', '0x10']) {
      assert.deepEqual(unreadableOptionalFields(vendor({ principal: '250000', annualRatePct: '6.5', feeMajor })), ['feeMajor'], feeMajor);
    }
  });
});

// ---------------------------------------------------------------------------
// buildAdvancedFields
// ---------------------------------------------------------------------------

describe('buildAdvancedFields', () => {
  it('returns an empty object when nothing optional is set', () => {
    const v = vendor();
    const out = buildAdvancedFields(v, 'USD');
    assert.deepEqual(out, {});
  });

  describe('rateSpec (hybrid)', () => {
    it('omits rateSpec when rateKind is fixed', () => {
      const out = buildAdvancedFields(vendor({ rateKind: 'fixed' }), 'USD');
      assert.equal(out.rateSpec, undefined);
    });

    it('emits a hybrid rateSpec when all hybrid fields parse cleanly', () => {
      const out = buildAdvancedFields(
        vendor({
          annualRatePct: '4.5',
          rateKind: 'hybrid',
          initialFixedMonths: '60',
          subsequentRatePct: '7.25',
        }),
        'USD',
      );
      assert.deepEqual(out.rateSpec, {
        kind: 'hybrid',
        initialAnnualRate: 0.045,
        initialMonths: 60,
        subsequentAnnualRate: 0.0725,
      });
    });

    it('omits rateSpec when initialFixedMonths is missing or zero', () => {
      const empty = buildAdvancedFields(
        vendor({ rateKind: 'hybrid', initialFixedMonths: '', subsequentRatePct: '7' }),
        'USD',
      );
      assert.equal(empty.rateSpec, undefined);
      const zero = buildAdvancedFields(
        vendor({ rateKind: 'hybrid', initialFixedMonths: '0', subsequentRatePct: '7' }),
        'USD',
      );
      assert.equal(zero.rateSpec, undefined);
    });

    it('omits rateSpec when subsequentRatePct cannot parse', () => {
      const out = buildAdvancedFields(
        vendor({ rateKind: 'hybrid', initialFixedMonths: '60', subsequentRatePct: 'abc' }),
        'USD',
      );
      assert.equal(out.rateSpec, undefined);
    });

    it('floors a fractional initialFixedMonths to a whole month', () => {
      const out = buildAdvancedFields(
        vendor({ rateKind: 'hybrid', initialFixedMonths: '60.7', subsequentRatePct: '7' }),
        'USD',
      );
      assert.equal(out.rateSpec?.kind, 'hybrid');
      if (out.rateSpec?.kind === 'hybrid') {
        assert.equal(out.rateSpec.initialMonths, 61); // Math.round
      }
    });
  });

  describe('lumpSums', () => {
    it('omits lumpSums when the encoded string is empty', () => {
      const out = buildAdvancedFields(vendor({ lumpSumsEncoded: '' }), 'USD');
      assert.equal(out.lumpSums, undefined);
    });

    it('parses a single lump sum and converts to minor units', () => {
      const out = buildAdvancedFields(vendor({ lumpSumsEncoded: '12:5000' }), 'USD');
      assert.deepEqual(out.lumpSums, [{ month: 12, amountMinor: 500_000 }]);
    });

    it('parses multiple lumps and preserves order', () => {
      const out = buildAdvancedFields(
        vendor({ lumpSumsEncoded: '12:5000;36:3000;60:10000' }),
        'USD',
      );
      assert.deepEqual(out.lumpSums, [
        { month: 12, amountMinor: 500_000 },
        { month: 36, amountMinor: 300_000 },
        { month: 60, amountMinor: 1_000_000 },
      ]);
    });

    it('honours the active currency when converting to minor units', () => {
      // JPY has zero decimals: 5000 yen is 5000 minor units, not 500000.
      const out = buildAdvancedFields(vendor({ lumpSumsEncoded: '12:5000' }), 'JPY');
      assert.deepEqual(out.lumpSums, [{ month: 12, amountMinor: 5000 }]);
    });

    it('drops malformed lump-sum entries silently', () => {
      const out = buildAdvancedFields(
        vendor({ lumpSumsEncoded: '12:5000;garbage;0:1000;36:3000' }),
        'USD',
      );
      assert.deepEqual(out.lumpSums, [
        { month: 12, amountMinor: 500_000 },
        { month: 36, amountMinor: 300_000 },
      ]);
    });
  });

  describe('prepaymentPenalty', () => {
    it('omits the penalty when both fields are at their default zero', () => {
      const out = buildAdvancedFields(vendor(), 'USD');
      assert.equal(out.prepaymentPenalty, undefined);
    });

    it('omits the penalty when only the percentage is set', () => {
      const out = buildAdvancedFields(
        vendor({ prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '0' }),
        'USD',
      );
      assert.equal(out.prepaymentPenalty, undefined);
    });

    it('omits the penalty when only the until-month is set', () => {
      const out = buildAdvancedFields(
        vendor({ prepayPenaltyPct: '0', prepayPenaltyUntilMonth: '36' }),
        'USD',
      );
      assert.equal(out.prepaymentPenalty, undefined);
    });

    it('emits the penalty when both fields are positive', () => {
      const out = buildAdvancedFields(
        vendor({ prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '60' }),
        'USD',
      );
      assert.deepEqual(out.prepaymentPenalty, {
        pctOfBalance: 0.02,
        untilMonth: 60,
      });
    });

    it('rejects a non-numeric percentage', () => {
      const out = buildAdvancedFields(
        vendor({ prepayPenaltyPct: 'abc', prepayPenaltyUntilMonth: '60' }),
        'USD',
      );
      assert.equal(out.prepaymentPenalty, undefined);
    });
  });

  it('combines all three optional fields when all are set', () => {
    const out = buildAdvancedFields(
      vendor({
        annualRatePct: '5.0',
        rateKind: 'hybrid',
        initialFixedMonths: '60',
        subsequentRatePct: '7',
        lumpSumsEncoded: '12:5000',
        prepayPenaltyPct: '2',
        prepayPenaltyUntilMonth: '36',
      }),
      'USD',
    );
    assert.equal(out.rateSpec?.kind, 'hybrid');
    assert.equal(out.lumpSums?.length, 1);
    assert.equal(out.prepaymentPenalty?.pctOfBalance, 0.02);
  });
});

// ---------------------------------------------------------------------------
// computeFromInput
// ---------------------------------------------------------------------------

describe('computeFromInput', () => {
  // Reference figures below were cross-checked with a Python reproduction
  // of the engine's integer-cent amortization to ensure the assertions
  // are exact, not approximate.

  it('computes a simple fixed-rate 30-year term loan exactly', () => {
    const r = computeFromInput(
      vendor({
        principal: '300000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        feeMajor: '0',
        extraMonthly: '0',
      }),
      'USD',
    );
    assert.equal(r.error, undefined);
    // The closed-form payment for 300k @ 5% / 360 months rounds DOWN to
    // 1610.46. The few cents that leaves are part of the 360th payment:
    // a loan with a term ends on its term.
    assert.equal(r.schedule.length, 360);
    // 4.09 more than the others, here.
    assert.equal(r.schedule[359].payment, 161_455);
    assert.equal(r.monthlyPaymentMinor, 161_046);
    assert.equal(r.totalInterestMinor, 27_976_969);
    assert.equal(r.totalPaidMinor, 57_976_969);
    assert.equal(r.schedule[r.schedule.length - 1].balance, 0);
    assert.equal(
      r.schedule.reduce((s, row) => s + row.principal, 0),
      30_000_000,
    );
  });

  it('honours comma-grouped principal input (matches the un-comma version exactly)', () => {
    const grouped = computeFromInput(
      vendor({ principal: '300,000', annualRatePct: '5', termMonths: '360' }),
      'USD',
    );
    const plain = computeFromInput(
      vendor({ principal: '300000', annualRatePct: '5', termMonths: '360' }),
      'USD',
    );
    assert.equal(grouped.error, undefined);
    assert.equal(grouped.monthlyPaymentMinor, plain.monthlyPaymentMinor);
    assert.equal(grouped.schedule.length, plain.schedule.length);
    assert.equal(grouped.totalInterestMinor, plain.totalInterestMinor);
  });

  it('routes hybrid inputs through the rateSpec path with exact recast', () => {
    const fixed = computeFromInput(
      vendor({
        principal: '300000',
        annualRatePct: '4',
        modeKind: 'term',
        termMonths: '360',
      }),
      'USD',
    );
    const hybrid = computeFromInput(
      vendor({
        principal: '300000',
        annualRatePct: '4',
        modeKind: 'term',
        termMonths: '360',
        rateKind: 'hybrid',
        initialFixedMonths: '60',
        subsequentRatePct: '7',
      }),
      'USD',
    );
    assert.equal(fixed.error, undefined);
    assert.equal(hybrid.error, undefined);

    // Fixed: closed-form on 300k @ 4% / 360 = 1432.25/mo, exact 360-month
    // payoff. Total interest = 215,607.20 (in minor units: 21,560,720).
    assert.equal(fixed.schedule.length, 360);
    assert.equal(fixed.totalInterestMinor, 21_560_720);
    assert.equal(fixed.schedule[0].interest, 100_000); // 300,000 * 0.04 / 12

    // Hybrid: same month-1 interest (same initial 4% rate).
    assert.equal(hybrid.schedule[0].interest, 100_000);
    // Month-61 interest jumps to 158,283 cents because of the rate
    // recast at month 61 (7% on the recast balance).
    assert.equal(hybrid.schedule[60].interest, 158_283);
    // The cent the recast payment leaves is part of the last payment.
    assert.equal(hybrid.schedule.length, 360);
    // Total interest under hybrid is 361,272.75 (361,272 cents in this
    // case: Python yields 36,127,275; let the engine speak for itself).
    assert.equal(hybrid.totalInterestMinor, 36_127_275);
  });

  it('routes lump-sum inputs through the lumpSums path: exact length and interest', () => {
    const r = computeFromInput(
      vendor({
        principal: '300000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        lumpSumsEncoded: '24:50000',
      }),
      'USD',
    );
    assert.equal(r.error, undefined);
    // 50k lump in month 24 cuts the loan to 259 months exactly.
    assert.equal(r.schedule.length, 259);
    assert.equal(r.totalInterestMinor, 16_681_514);
  });

  it('charges the prepayment penalty exactly when paid off in the penalty window', () => {
    const r = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        // 5,000,000 dollar lump in month 6 wipes the whole balance.
        lumpSumsEncoded: '6:500000',
        prepayPenaltyPct: '2',
        prepayPenaltyUntilMonth: '60',
      }),
      'USD',
    );
    // Loan paid off exactly in month 6.
    assert.equal(r.schedule.length, 6);
    // Pre-row-6 balance was 198,788.41 → 2% penalty rounds to 397,577 cents.
    assert.equal(r.prepaymentPenaltyMinor, 397_577);
    // Total paid is the sum of the 6 row payments + fee + penalty.
    const sumPayments = r.schedule.reduce((s, row) => s + row.payment, 0);
    assert.equal(r.totalPaidMinor, sumPayments + r.feeMinor + r.prepaymentPenaltyMinor);
  });

  it('does NOT charge the penalty when payoff is past the penalty window', () => {
    const r = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        prepayPenaltyPct: '2',
        prepayPenaltyUntilMonth: '24',
      }),
      'USD',
    );
    assert.equal(r.prepaymentPenaltyMinor, 0);
  });

  it('passes the extra-monthly amount through to the engine: exact payoff length', () => {
    const baseline = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
      }),
      'USD',
    );
    const withExtra = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        extraMonthly: '200',
      }),
      'USD',
    );
    // Baseline pays off in its 360 months.
    assert.equal(baseline.schedule.length, 360);
    // +200/month cuts that to exactly 256 months.
    assert.equal(withExtra.schedule.length, 256);
  });

  it('routes payment-mode inputs correctly: 200k @ 5% with 1500/mo payment', () => {
    const r = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '5',
        modeKind: 'payment',
        monthlyPayment: '1500',
      }),
      'USD',
    );
    assert.equal(r.error, undefined);
    assert.equal(r.monthlyPaymentMinor, 150_000);
    // 200k @ 5% with 1500/month pays off in exactly 196 months.
    assert.equal(r.schedule.length, 196);
  });

  it('rejects hybrid + payment mode at the engine level', () => {
    const r = computeFromInput(
      vendor({
        principal: '200000',
        annualRatePct: '4',
        modeKind: 'payment',
        monthlyPayment: '1500',
        rateKind: 'hybrid',
        initialFixedMonths: '60',
        subsequentRatePct: '7',
      }),
      'USD',
    );
    assert.ok(r.error);
    assert.match(r.error!, /need a fixed term/i);
  });

  it('surfaces the engine error when principal is empty', () => {
    const r = computeFromInput(vendor({ principal: '' }), 'USD');
    assert.ok(r.error);
    assert.match(r.error!, /loan amount/i);
  });

  it('surfaces the engine error when rate is empty', () => {
    const r = computeFromInput(vendor({ annualRatePct: '' }), 'USD');
    assert.ok(r.error);
    assert.match(r.error!, /interest rate/i);
  });

  it('honours JPY (zero-decimal) currency: 20M yen @ 1% / 30y exactly', () => {
    const r = computeFromInput(
      vendor({
        principal: '20000000',
        annualRatePct: '1',
        modeKind: 'term',
        termMonths: '360',
      }),
      'JPY',
    );
    assert.equal(r.error, undefined);
    assert.equal(r.schedule.length, 360);
    // JPY has no minor units, so principalMinor === principalMajor.
    assert.equal(
      r.schedule.reduce((s, row) => s + row.principal, 0),
      20_000_000,
    );
    // Closed-form payment 20M @ 1% over 360 months rounds to exactly
    // 64,328 yen.
    assert.equal(r.monthlyPaymentMinor, 64_328);
  });
});

// ---------------------------------------------------------------------------
// computeNoPointsBaseline
// ---------------------------------------------------------------------------

describe('computeNoPointsBaseline', () => {
  it('returns null when no points cost is entered', () => {
    const out = computeNoPointsBaseline(
      vendor({ pointsCostMajor: '0', pointsRateReductionPct: '0.25' }),
      'USD',
    );
    assert.equal(out, null);
  });

  it('returns null when no rate reduction is entered', () => {
    const out = computeNoPointsBaseline(
      vendor({ pointsCostMajor: '2000', pointsRateReductionPct: '0' }),
      'USD',
    );
    assert.equal(out, null);
  });

  it('returns null when either field is empty', () => {
    assert.equal(
      computeNoPointsBaseline(
        vendor({ pointsCostMajor: '', pointsRateReductionPct: '0.25' }),
        'USD',
      ),
      null,
    );
    assert.equal(
      computeNoPointsBaseline(
        vendor({ pointsCostMajor: '2000', pointsRateReductionPct: '' }),
        'USD',
      ),
      null,
    );
  });

  it('builds a baseline with the points cost subtracted from the fee', () => {
    // With-points loan: fee 5000 (which includes 2000 of points), rate 5%.
    // No-points baseline: fee 3000, rate 5.25%.
    const withPoints = computeFromInput(
      vendor({
        principal: '300000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        feeMajor: '5000',
        pointsCostMajor: '2000',
        pointsRateReductionPct: '0.25',
      }),
      'USD',
    );
    const baseline = computeNoPointsBaseline(
      vendor({
        principal: '300000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        feeMajor: '5000',
        pointsCostMajor: '2000',
        pointsRateReductionPct: '0.25',
      }),
      'USD',
    );
    assert.ok(baseline);
    if (baseline) {
      // Baseline fee is 3000 (5000 minus 2000 in points), expressed in cents.
      assert.equal(baseline.feeMinor, 300_000);
      // Baseline monthly payment is higher (rate is 0.25pp higher).
      assert.ok(baseline.monthlyPaymentMinor > withPoints.monthlyPaymentMinor);
    }
  });

  it('has no baseline when the points cost is more than the fee it is part of (issue 531)', () => {
    const offer = vendor({ principal: '300000', annualRatePct: '5', modeKind: 'term', termMonths: '360', feeMajor: '1000', pointsCostMajor: '5000', pointsRateReductionPct: '0.25' });
    assert.equal(computeNoPointsBaseline(offer, 'USD'), null);
    assert.equal(pointsCostAboveFee(offer), true);
    // The offer says what is wrong, where it used to work out a break-even on a cost of 1,000.
    const r = computeFromInput(offer, 'USD');
    assert.equal(r.error, POINTS_ABOVE_FEE);
    assert.equal(r.schedule.length, 0);
    // With no fee at all the cost used to vanish and the row said "n/a".
    assert.equal(computeFromInput({ ...offer, feeMajor: '0' }, 'USD').error, POINTS_ABOVE_FEE);
    assert.equal(computeFromInput({ ...offer, feeMajor: '' }, 'USD').error, POINTS_ABOVE_FEE);
  });

  it('a points cost equal to the fee, or below it, is fine', () => {
    for (const feeMajor of ['5000', '5000.01', '7500']) {
      const offer = vendor({ principal: '300000', annualRatePct: '5', modeKind: 'term', termMonths: '360', feeMajor, pointsCostMajor: '5000', pointsRateReductionPct: '0.25' });
      assert.equal(pointsCostAboveFee(offer), false, feeMajor);
      assert.equal(computeFromInput(offer, 'USD').error, undefined, feeMajor);
    }
    // No points cost: nothing to compare.
    assert.equal(pointsCostAboveFee(vendor({ feeMajor: '0', pointsCostMajor: '0' })), false);
    assert.equal(pointsCostAboveFee(vendor({ feeMajor: '', pointsCostMajor: '' })), false);
  });

  it('250,000 over 360 months at 6.00% with points of 2,500 for a quarter point: break-even in 62 months', () => {
    const offer = vendor({ principal: '250000', annualRatePct: '6', modeKind: 'term', termMonths: '360', feeMajor: '2500', pointsCostMajor: '2500', pointsRateReductionPct: '0.25' });
    const withPoints = computeFromInput(offer, 'EUR');
    const without = computeNoPointsBaseline(offer, 'EUR');
    assert.ok(without && !without.error);
    if (!without) return;
    assert.equal(without.feeMinor, 0);
    assert.equal(withPoints.monthlyPaymentMinor, 149888);
    assert.equal(without.monthlyPaymentMinor, 153929);
    const be = pointsBreakEven(withPoints, without);
    assert.equal(be.months, Math.ceil(2500_00 / (153929 - 149888)));
    assert.equal(be.months, 62);
    assert.equal(be.lifetimeSavingsMinor, without.totalPaidMinor - withPoints.totalPaidMinor);
    assert.ok(be.lifetimeSavingsMinor > 12000_00 && be.lifetimeSavingsMinor < 12100_00, String(be.lifetimeSavingsMinor));
  });

  it('the message is filed under "other" by the analytics classifier, as the unreadable-box one is', () => {
    const lower = POINTS_ABOVE_FEE.toLowerCase();
    for (const word of ['principal', 'payment', 'rate', 'term']) assert.ok(!lower.includes(word), word);
  });
});

describe('an optional box that cannot be read (issue 513)', () => {
  const base = { principal: '250000', annualRatePct: '6.5', modeKind: 'term' as const, termMonths: '360' };

  it('is an error on the offer, not a zero', () => {
    for (const patch of [
      { feeMajor: 'NaN' }, { feeMajor: '€2,500' }, { feeMajor: '-300' },
      { extraMonthly: '200 a month' }, { pointsCostMajor: 'abc' }, { pointsRateReductionPct: 'x' },
      { prepayPenaltyPct: '2%' }, { prepayPenaltyUntilMonth: 'never' },
      { lumpSumsEncoded: '12-5000' }, { lumpSumsEncoded: '5000 in month 12' }, { lumpSumsEncoded: '12:5000;oops' },
    ]) {
      const r = computeFromInput(vendor({ ...base, ...patch }), 'EUR');
      assert.equal(r.error, OPTIONAL_UNREADABLE, JSON.stringify(patch));
      assert.equal(r.schedule.length, 0);
      assert.equal(unreadableOptionalFields(vendor({ ...base, ...patch })).length, 1, JSON.stringify(patch));
    }
  });

  it('names the box, so the page can mark it', () => {
    assert.deepEqual(unreadableOptionalFields(vendor({ ...base, feeMajor: '€2,500', lumpSumsEncoded: '12-5000' })), ['feeMajor', 'lumpSumsEncoded']);
  });

  it('an empty box, a zero and a number as people type it are all fine', () => {
    for (const patch of [
      {}, { feeMajor: '' }, { feeMajor: '0' }, { feeMajor: '2,500' }, { feeMajor: '2 500.50' }, { extraMonthly: '200' },
      { lumpSumsEncoded: '' }, { lumpSumsEncoded: '12:5000' }, { lumpSumsEncoded: '12:5000;36:3000;' }, { lumpSumsEncoded: ' 12:5000 ; 36:3000 ' },
      { prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '36' },
    ]) {
      assert.deepEqual(unreadableOptionalFields(vendor({ ...base, ...patch })), [], JSON.stringify(patch));
      assert.equal(computeFromInput(vendor({ ...base, ...patch }), 'EUR').error, undefined, JSON.stringify(patch));
    }
  });

  it('the boxes of a changing rate count only for a loan that has one', () => {
    assert.deepEqual(unreadableOptionalFields(vendor({ ...base, rateKind: 'fixed', subsequentRatePct: 'abc' })), []);
    assert.deepEqual(unreadableOptionalFields(vendor({ ...base, rateKind: 'hybrid', initialFixedMonths: 'five', subsequentRatePct: 'abc' })), ['initialFixedMonths', 'subsequentRatePct']);
  });

  it('a fee typed with a currency sign no longer makes the offer look free of fees', () => {
    const typed = computeFromInput(vendor({ ...base, feeMajor: '€2,500' }), 'EUR');
    const plain = computeFromInput(vendor({ ...base, feeMajor: '2500' }), 'EUR');
    assert.ok(typed.error);
    assert.equal(plain.feeMinor, 250_000);
  });

  it('the message sorts under "other" in the tool’s analytics: none of its words is a reason of its own', () => {
    const lower = OPTIONAL_UNREADABLE.toLowerCase();
    for (const word of ['principal', 'payment', 'interest', 'rate', 'term', 'range']) assert.ok(!lower.includes(word), word);
  });
});

// ---------------------------------------------------------------------------
// The edges of reading an offer
// ---------------------------------------------------------------------------

describe('reading what was typed, at the edges', () => {
  it('a number may start at its decimal point, with any number of digits after it', () => {
    assert.equal(parseNumber('.5'), 0.5);
    assert.equal(parseNumber('.25'), 0.25);
    assert.equal(parseNumber('-.125'), -0.125);
    assert.ok(Number.isNaN(parseNumber('.')));
    // A quarter point typed without its zero is a rate reduction, not an unreadable box.
    assert.deepEqual(unreadableOptionalFields(vendor({ pointsRateReductionPct: '.25' })), []);
  });

  it('a box holding only spaces is empty, not unreadable', () => {
    assert.equal(isUnreadable('  '), false);
    assert.equal(isUnreadable(''), false);
    assert.equal(isUnreadable('0'), false);
    assert.equal(isUnreadable('-1'), true);
    assert.equal(isUnreadable('abc'), true);
    assert.deepEqual(unreadableOptionalFields(vendor({ feeMajor: '  ', extraMonthly: ' ' })), []);
  });

  it('a space after the last lump-sum separator is not a pair that fails to read', () => {
    assert.deepEqual(unreadableOptionalFields(vendor({ lumpSumsEncoded: '12:5000; ' })), []);
    assert.deepEqual(unreadableOptionalFields(vendor({ lumpSumsEncoded: ' ; ' })), []);
  });

  it('the boxes of a changing rate are not on the page for a loan set by its payment, so they are not counted', () => {
    const offer = vendor({ rateKind: 'hybrid', modeKind: 'payment', monthlyPayment: '1500', initialFixedMonths: 'five', subsequentRatePct: 'abc' });
    assert.deepEqual(unreadableOptionalFields(offer), []);
  });

  it('with no points cost there is nothing for the fee to contradict, whatever the fee box holds', () => {
    assert.equal(pointsCostAboveFee(vendor({ pointsCostMajor: '0', feeMajor: '-5' })), false);
    assert.equal(pointsCostAboveFee(vendor({ pointsCostMajor: '-1', feeMajor: '-5' })), false);
    assert.equal(pointsCostAboveFee(vendor({ pointsCostMajor: 'abc', feeMajor: '-5' })), false);
    // A cost of any size against a fee that does not read is above it.
    assert.equal(pointsCostAboveFee(vendor({ pointsCostMajor: '0.01', feeMajor: 'abc' })), true);
  });

  it('the points message carries the phrase the page finds its translation by', () => {
    assert.ok(POINTS_ABOVE_FEE.toLowerCase().includes('points cost is more than the fee'), POINTS_ABOVE_FEE);
    assert.ok(OPTIONAL_UNREADABLE.toLowerCase().includes('optional boxes cannot be read'), OPTIONAL_UNREADABLE);
  });
});

describe('what the engine is given', () => {
  it('a loan set by its term: amount, rate, fee and extra in minor units, the term in months', () => {
    const offer = vendor({ principal: '200,000', annualRatePct: '5', modeKind: 'term', termMonths: '240', feeMajor: '1,250.50', extraMonthly: '100' });
    assert.deepEqual(loanFromInput(offer, 'USD'), {
      inputs: { principalMinor: 20_000_000, annualRate: 0.05, feeMinor: 125_050, extraMonthlyMinor: 10_000 },
      mode: { kind: 'term', months: 240 },
    });
  });

  it('a loan set by its payment: the payment in minor units, empty optional boxes as zero', () => {
    const offer = vendor({ principal: '200000', annualRatePct: '5', modeKind: 'payment', termMonths: '', monthlyPayment: '1500', feeMajor: '', extraMonthly: '' });
    assert.deepEqual(loanFromInput(offer, 'USD'), {
      inputs: { principalMinor: 20_000_000, annualRate: 0.05, feeMinor: 0, extraMonthlyMinor: 0 },
      mode: { kind: 'payment', monthlyMinor: 150_000 },
    });
    // Yen has no minor unit.
    assert.deepEqual(loanFromInput({ ...offer, principal: '20000000', monthlyPayment: '70000' }, 'JPY').mode, { kind: 'payment', monthlyMinor: 70_000 });
  });

  it('a fixed-rate offer has no rate change, whatever its folded boxes still hold', () => {
    const offer = vendor({ rateKind: 'fixed', initialFixedMonths: '60', subsequentRatePct: '7', rateChangeKeeps: 'payment' });
    assert.deepEqual(buildAdvancedFields(offer, 'USD'), {});
  });

  it('a changing rate says what stays the same only when it is the payment', () => {
    const offer = vendor({ annualRatePct: '5', rateKind: 'hybrid', initialFixedMonths: '60', subsequentRatePct: '7' });
    assert.deepEqual(buildAdvancedFields({ ...offer, rateChangeKeeps: 'payment' }, 'USD'), {
      rateSpec: { kind: 'hybrid', initialAnnualRate: 0.05, initialMonths: 60, subsequentAnnualRate: 0.07, keeps: 'payment' },
    });
    assert.deepEqual(buildAdvancedFields({ ...offer, rateChangeKeeps: 'term' }, 'USD'), {
      rateSpec: { kind: 'hybrid', initialAnnualRate: 0.05, initialMonths: 60, subsequentAnnualRate: 0.07 },
    });
  });
});

describe('points with nothing to recover', () => {
  // The fee covers the points, so only the rate reduction decides.
  const offer = { principal: '300000', annualRatePct: '5', modeKind: 'term' as const, termMonths: '360', feeMajor: '5000', pointsCostMajor: '2000' };

  it('no baseline for a reduction of zero, below zero or unreadable', () => {
    for (const pointsRateReductionPct of ['0', '-0.25', 'abc', '']) {
      assert.equal(computeNoPointsBaseline(vendor({ ...offer, pointsRateReductionPct }), 'USD'), null, pointsRateReductionPct);
    }
  });

  it('the smallest reduction has one: the same loan at the higher rate, with the fee less the points', () => {
    const baseline = computeNoPointsBaseline(vendor({ ...offer, pointsRateReductionPct: '0.25' }), 'USD');
    const plain = computeFromInput(vendor({ ...offer, annualRatePct: '5.25', feeMajor: '3000', pointsCostMajor: '' }), 'USD');
    assert.ok(baseline);
    assert.equal(baseline.error, undefined);
    assert.equal(baseline.feeMinor, 300_000);
    // 300,000 over 360 months at 5.25%: 1,656.61 a month.
    assert.equal(baseline.monthlyPaymentMinor, 165_661);
    assert.equal(baseline.totalPaidMinor, plain.totalPaidMinor);
  });
});

describe('either sign of an invalid offer withholds the comparison', () => {
  const valid = computeFromInput(vendor({ principal: '10000', annualRatePct: '5', modeKind: 'term', termMonths: '12' }), 'EUR');

  it('valid offers are compared', () => {
    assert.equal(valid.schedule.length, 12);
    assert.equal(comparisonWithheld([valid, valid]), false);
    assert.equal(comparisonWithheld([]), false);
  });

  it('a message alone is enough, even beside a schedule', () => {
    assert.equal(comparisonWithheld([valid, { ...valid, error: 'Enter a loan amount greater than zero.' }]), true);
  });

  it('an offer with no schedule is enough, even without a message', () => {
    assert.equal(comparisonWithheld([{ ...valid, schedule: [] }, valid]), true);
  });
});

describe('a rate that changes needs the month of the change and the later rate (issue 818)', () => {
  // The first example offer: 250,000 at 6.5% over 360 months, 568,861.58 in all at a fixed rate.
  const changing = { principal: '250000', annualRatePct: '6.5', modeKind: 'term' as const, termMonths: '360', rateKind: 'hybrid' as const, initialFixedMonths: '60', subsequentRatePct: '9' };
  const NEEDS_TERM = 'Fixed-then-variable loans need a fixed term: under “Solve for”, choose “Monthly payment”.';

  it('with the later rate left empty the offer is an error with no schedule, where it used to total 568,861.58 at the starting rate', () => {
    const blank = computeFromInput(vendor({ ...changing, subsequentRatePct: '' }), 'EUR');
    assert.equal(blank.error, RATE_CHANGE_INCOMPLETE);
    assert.equal(blank.schedule.length, 0);
    assert.equal(blank.totalPaidMinor, 0);
    // The same boxes with a fixed rate chosen: the figure the empty box used to give.
    assert.equal(computeFromInput(vendor({ ...changing, rateKind: 'fixed', subsequentRatePct: '' }), 'EUR').totalPaidMinor, 56_886_158);
  });

  it('with a later rate of 9% after 60 months it totals 683,995.09, as before', () => {
    const r = computeFromInput(vendor(changing), 'EUR');
    assert.equal(r.error, undefined);
    assert.equal(r.schedule.length, 360);
    assert.equal(r.totalPaidMinor, 68_399_509);
  });

  it('a month of the change that is empty, zero or rounds to zero is an error too', () => {
    for (const initialFixedMonths of ['', '  ', '0', '0.4', '0,0']) {
      const r = computeFromInput(vendor({ ...changing, initialFixedMonths }), 'EUR');
      assert.equal(r.error, RATE_CHANGE_INCOMPLETE, JSON.stringify(initialFixedMonths));
      assert.equal(r.schedule.length, 0, JSON.stringify(initialFixedMonths));
    }
  });

  it('names the boxes that are left out, so the page can mark them', () => {
    assert.deepEqual(missingRateChangeFields(vendor(changing)), []);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, subsequentRatePct: '' })), ['subsequentRatePct']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, subsequentRatePct: '  ' })), ['subsequentRatePct']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: '' })), ['initialFixedMonths']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: ' ' })), ['initialFixedMonths']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: '0' })), ['initialFixedMonths']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: '0.4' })), ['initialFixedMonths']);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: '', subsequentRatePct: '' })), ['initialFixedMonths', 'subsequentRatePct']);
  });

  it('half a month rounds to one, and a later rate of zero is a rate: neither is left out', () => {
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, initialFixedMonths: '0.5' })), []);
    assert.deepEqual(missingRateChangeFields(vendor({ ...changing, subsequentRatePct: '0' })), []);
    // 60 months at 6.5%, then 300 months at 0%.
    const free = computeFromInput(vendor({ ...changing, subsequentRatePct: '0' }), 'EUR');
    assert.equal(free.error, undefined);
    assert.equal(free.totalPaidMinor, 32_883_768);
  });

  it('a box that holds something unreadable is not listed as left out: it has its own message', () => {
    const offer = vendor({ ...changing, initialFixedMonths: 'five', subsequentRatePct: 'abc' });
    assert.deepEqual(missingRateChangeFields(offer), []);
    assert.equal(computeFromInput(offer, 'EUR').error, OPTIONAL_UNREADABLE);
    // An unreadable box beside an empty one: the unreadable one is said first.
    assert.equal(computeFromInput(vendor({ ...changing, feeMajor: '€5', subsequentRatePct: '' }), 'EUR').error, OPTIONAL_UNREADABLE);
  });

  it('a fixed rate needs neither box, whatever they hold', () => {
    const offer = vendor({ ...changing, rateKind: 'fixed', initialFixedMonths: '', subsequentRatePct: '' });
    assert.deepEqual(missingRateChangeFields(offer), []);
    assert.equal(computeFromInput(offer, 'EUR').error, undefined);
  });

  it('a loan set by its payment does not show the two boxes, so neither is listed', () => {
    const offer = vendor({ ...changing, modeKind: 'payment', monthlyPayment: '2000', initialFixedMonths: '', subsequentRatePct: '' });
    assert.deepEqual(missingRateChangeFields(offer), []);
  });

  it('a link that arrives with a changing rate and no later rate shows the error', () => {
    const { vendors } = decodeFromQueryString('v1=Vendor+A~250000~6.5~~360~~0~0&v1_rk=hybrid&v2=Vendor+B~250000~6.0~~360~~2500~0');
    assert.equal(vendors[0].rateKind, 'hybrid');
    assert.equal(vendors[0].initialFixedMonths, '60');
    assert.equal(vendors[0].subsequentRatePct, '');
    assert.deepEqual(missingRateChangeFields(vendors[0]), ['subsequentRatePct']);
    assert.equal(computeFromInput(vendors[0], 'EUR').error, RATE_CHANGE_INCOMPLETE);
    assert.equal(computeFromInput(vendors[1], 'EUR').error, undefined);
    // With the later rate in the link, it is worked out.
    const whole = decodeFromQueryString('v1=Vendor+A~250000~6.5~~360~~0~0&v1_rk=hybrid&v1_sr=9&v2=Vendor+B~250000~6.0~~360~~2500~0');
    assert.equal(computeFromInput(whole.vendors[0], 'EUR').totalPaidMinor, 68_399_509);
  });

  it('the message is filed under "other" by the analytics classifier, and carries the phrase the page finds its translation by', () => {
    const lower = RATE_CHANGE_INCOMPLETE.toLowerCase();
    for (const word of ['principal', 'payment', 'interest', 'rate', 'term', 'range']) assert.ok(!lower.includes(word), word);
    assert.ok(lower.includes('changing offer needs both of its boxes'), RATE_CHANGE_INCOMPLETE);
  });

  describe('on a loan set by its payment', () => {
    const byPayment = { ...changing, modeKind: 'payment' as const, monthlyPayment: '2000', feeMajor: '500' };

    it('says a changing rate needs a term when its two boxes are empty, where it used to be worked out as a fixed rate', () => {
      const r = computeFromInput(vendor({ ...byPayment, initialFixedMonths: '', subsequentRatePct: '' }), 'EUR');
      assert.equal(r.error, NEEDS_TERM);
      assert.equal(r.schedule.length, 0);
      assert.equal(r.feeMinor, 50_000);
    });

    it('says the same with the two boxes filled, as the engine always did', () => {
      const r = computeFromInput(vendor(byPayment), 'EUR');
      assert.equal(r.error, NEEDS_TERM);
      assert.equal(r.feeMinor, 50_000);
    });

    it('says what is wrong with a required box first', () => {
      const r = computeFromInput(vendor({ ...byPayment, subsequentRatePct: '', monthlyPayment: '' }), 'EUR');
      assert.equal(r.error, 'Enter a monthly payment greater than zero.');
    });

    it('a fixed rate set by its payment is worked out: 250,000 at 6.5% with 2,000 a month is paid off in 210 months', () => {
      const r = computeFromInput(vendor({ ...byPayment, rateKind: 'fixed' }), 'EUR');
      assert.equal(r.error, undefined);
      assert.equal(r.months, 210);
    });
  });
});

describe('a lump sum in a month the loan does not have (issue 796)', () => {
  // 100,000 at 6% over 120 months: 133,224.33 in all.
  const base = { principal: '100000', annualRatePct: '6', modeKind: 'term' as const, termMonths: '120' };

  it('part of a month, or a month past 1,200, makes the box unreadable: the lump sum is never moved or dropped', () => {
    for (const lumpSumsEncoded of ['12.5:5000', '1300:5000', '1201:5000', '12:5000;12.5:5000', '12:5000;1300:5000']) {
      const offer = vendor({ ...base, lumpSumsEncoded });
      assert.deepEqual(unreadableOptionalFields(offer), ['lumpSumsEncoded'], lumpSumsEncoded);
      const r = computeFromInput(offer, 'EUR');
      assert.equal(r.error, OPTIONAL_UNREADABLE, lumpSumsEncoded);
      assert.equal(r.schedule.length, 0, lumpSumsEncoded);
    }
  });

  it('a whole month up to 1,200 is fine: 5,000 in month 12 ends the loan in month 113, for 129,796.70', () => {
    const r = computeFromInput(vendor({ ...base, lumpSumsEncoded: '12:5000' }), 'EUR');
    assert.equal(r.error, undefined);
    assert.equal(r.months, 113);
    assert.equal(r.totalPaidMinor, 12_979_670);
    assert.deepEqual(unreadableOptionalFields(vendor({ ...base, lumpSumsEncoded: '1200:5000' })), []);
  });

  it('a lump sum after the loan is paid off, within 1,200 months, is still no error and changes nothing', () => {
    const r = computeFromInput(vendor({ ...base, lumpSumsEncoded: '130:5000' }), 'EUR');
    assert.equal(r.error, undefined);
    assert.equal(r.months, 120);
    assert.equal(r.totalPaidMinor, 13_322_433);
  });

  it('holds as each page writes numbers', () => {
    for (const [typed, locale] of [['12,5:5000', 'es'], ['12,5:5000', 'cs'], ['1.300:5000', 'es'], ['1 300:5000', 'cs'], ['12.5:5000', 'en-US'], ['1,300:5000', 'en-US'], ['१२.५:५०००', 'hi'], ['१३००:५०००', 'mr']] as const) {
      const offer = vendor({ ...base, lumpSumsEncoded: canonicalLumpSums(typed, locale) });
      assert.deepEqual(unreadableOptionalFields(offer), ['lumpSumsEncoded'], `${typed} (${locale})`);
    }
    assert.deepEqual(unreadableOptionalFields(vendor({ ...base, lumpSumsEncoded: canonicalLumpSums('12:5.000,50', 'es') })), []);
  });

  it('a link that carries such a month opens with the box in error', () => {
    const { vendors } = decodeFromQueryString('v1=A~100000~6~~120~~0~0&v1_ls=12.5:5000');
    assert.deepEqual(unreadableOptionalFields(vendors[0]), ['lumpSumsEncoded']);
    assert.equal(computeFromInput(vendors[0], 'EUR').error, OPTIONAL_UNREADABLE);
  });
});
