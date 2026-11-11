/**
 * Unit tests for src/utils/loanCompareInputs.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdvancedFields,
  computeFromInput,
  computeNoPointsBaseline,
  parseNumber,
  unreadableOptionalFields,
  OPTIONAL_UNREADABLE,
} from './inputs.ts';
import { makeDefaultVendor, type VendorInput } from './url.ts';

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
    // case — Python yields 36,127,275; let the engine speak for itself).
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
    assert.match(r.error!, /term mode/i);
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

  it('clamps the baseline fee at zero when points exceed the fee', () => {
    const baseline = computeNoPointsBaseline(
      vendor({
        principal: '300000',
        annualRatePct: '5',
        modeKind: 'term',
        termMonths: '360',
        feeMajor: '1000',
        pointsCostMajor: '5000',
        pointsRateReductionPct: '0.25',
      }),
      'USD',
    );
    assert.ok(baseline);
    if (baseline) {
      assert.equal(baseline.feeMinor, 0);
    }
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
