/**
 * Unit tests for the first half of src/utils/loan/math.ts: how an amount is
 * written, one month of interest, and the two schedule builders
 * (`buildSchedule`, `buildScheduleAdvanced`) with `computeMonthsForPayment`.
 *
 * Every expected payment, interest and balance here is worked out by hand on
 * a loan small enough to follow, or from the annuity formula written out in
 * the test. None comes from the function under test.
 *
 * No browser and no component is loaded, so the file runs in well under a
 * second as its own process.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENCIES,
  MAX_TERM_MONTHS,
  OPTIONAL_UNREADABLE,
  amountFormat,
  amountNumberLocale,
  buildSchedule,
  buildScheduleAdvanced,
  computeMonthsForPayment,
  formatMoney,
  getCurrency,
  monthlyInterestMinor,
  roundMinor,
  type AmortizationRow,
  type RateSpec,
} from './math.ts';

const NBSP = ' ';

/** One row of a schedule, written in the order a statement prints it. */
function row(month: number, payment: number, interest: number, principal: number, balance: number): AmortizationRow {
  return { month, payment, interest, principal, balance };
}

/**
 * A rate that can be read only so many times. A loan whose balance never
 * falls is followed to the limit of 1,200 months and no further: a schedule
 * that runs on past it fails here, instead of filling the memory.
 */
function readToTheLimit<T extends RateSpec>(spec: T): T {
  let left = 100_000;
  return new Proxy(spec, {
    get(target, key, receiver) {
      left -= 1;
      if (left < 0) throw new Error('the schedule ran on past its limit of months');
      return Reflect.get(target, key, receiver);
    },
  });
}

const TOO_LOW = "Monthly payment is too low to ever pay off the loan; it does not even cover the first month's interest.";
const NOT_WITHIN_LIMIT = 'Loan does not amortize within 1200 months. Increase the monthly payment.';

// ---------------------------------------------------------------------------
// How an amount is written
// ---------------------------------------------------------------------------

describe('every currency in the list', () => {
  it('has a three-letter code, a name that ends with that code, and is found by its code', () => {
    assert.equal(CURRENCIES.length, 38);
    for (const currency of CURRENCIES) {
      assert.match(currency.code, /^[A-Z]{3}$/);
      assert.ok(currency.label.endsWith(` (${currency.code})`), currency.label);
      assert.ok(currency.label.length > ` (${currency.code})`.length + 2, currency.label);
      assert.ok(getCurrency(currency.code) === currency, currency.code);
    }
  });

  it('counts in whole units or in hundredths, and its amounts can be written its own way', () => {
    for (const currency of CURRENCIES) {
      assert.ok(currency.factor === 1 || currency.factor === 100, `${currency.code}: ${currency.factor}`);
      // 1,234 units of the currency: the digits survive whatever marks the locale uses.
      const written = formatMoney(1234 * currency.factor, currency.code);
      assert.equal(written.replace(/\D/g, '').slice(0, 4), '1234', `${currency.code}: ${written}`);
      assert.equal(new Intl.NumberFormat(currency.locale).resolvedOptions().locale.split('-')[0], currency.locale.split('-')[0], currency.code);
    }
  });
});

describe('the locale for a number beside an amount', () => {
  it('is the page\'s own style where the page has one, whatever the currency', () => {
    assert.equal(amountNumberLocale('EUR', 'es-ES'), 'es-ES');
    assert.equal(amountNumberLocale('INR', 'cs-CZ'), 'cs-CZ');
  });

  it('counts in lakhs and crores for a currency written that way, and in threes for the rest', () => {
    assert.equal(amountNumberLocale('INR'), 'en-IN');
    assert.equal(amountNumberLocale('BDT'), 'en-IN');
    assert.equal(amountNumberLocale('INR', null), 'en-IN');
    assert.equal(amountNumberLocale('USD'), 'en-US');
    assert.equal(amountNumberLocale('CZK'), 'en-US');
    // An unknown code is treated as the default currency, the euro.
    assert.equal(amountNumberLocale('ZZZ'), 'en-US');
  });
});

describe('an amount in parts, on a page without its own amount style', () => {
  it('keeps the currency\'s symbol and place, and joins the digits into one part with commas and a point', () => {
    // Czech writes "1 234 567,50 Kč": five parts of digits and spaces become one.
    const koruna = amountFormat('CZK', null, { style: 'currency', currency: 'CZK' });
    assert.deepEqual(koruna.formatToParts(1234567.5), [
      { type: 'integer', value: '1,234,567' },
      { type: 'decimal', value: '.' },
      { type: 'fraction', value: '50' },
      { type: 'literal', value: NBSP },
      { type: 'currency', value: 'Kč' },
    ]);
    assert.equal(koruna.format(1234567.5), `1,234,567.50${NBSP}Kč`);

    // Turkish writes "₺10.000,00": the symbol comes first and stays first.
    const lira = amountFormat('TRY', null, { style: 'currency', currency: 'TRY' });
    assert.deepEqual(lira.formatToParts(10000), [
      { type: 'currency', value: '₺' },
      { type: 'integer', value: '10,000' },
      { type: 'decimal', value: '.' },
      { type: 'fraction', value: '00' },
    ]);
  });

  it('leaves an amount that has no digits as it came', () => {
    const lira = amountFormat('TRY', null, { style: 'currency', currency: 'TRY' });
    assert.deepEqual(lira.formatToParts(NaN), [
      { type: 'currency', value: '₺' },
      { type: 'nan', value: 'NaN' },
    ]);
  });
});

describe('an amount in parts, written the page\'s or the rupee\'s own way', () => {
  it('comes back as the locale wrote it', () => {
    // A Spanish page: no group mark under ten thousand, a comma for decimals, the symbol last.
    const pound = amountFormat('GBP', 'es-ES', { style: 'currency', currency: 'GBP', currencyDisplay: 'narrowSymbol' });
    assert.deepEqual(pound.formatToParts(1500), [
      { type: 'integer', value: '1500' },
      { type: 'decimal', value: ',' },
      { type: 'fraction', value: '00' },
      { type: 'literal', value: NBSP },
      { type: 'currency', value: '£' },
    ]);
    // Rupees keep their lakhs and crores: 10,58,721.
    const rupee = amountFormat('INR', null, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    assert.deepEqual(rupee.formatToParts(1058721), [
      { type: 'currency', value: '₹' },
      { type: 'integer', value: '10' },
      { type: 'group', value: ',' },
      { type: 'integer', value: '58' },
      { type: 'group', value: ',' },
      { type: 'integer', value: '721' },
    ]);
  });
});

describe('rounding to the minor unit', () => {
  it('rounds nothing to a plain zero, never a negative one', () => {
    assert.ok(Object.is(roundMinor(0), 0));
    assert.ok(Object.is(roundMinor(0.4), 0));
  });
});

describe('formatMoney around zero', () => {
  it('writes exactly half a minor unit as one unit, and anything less as zero without a sign', () => {
    assert.equal(formatMoney(0.5, 'EUR'), '€0.01');
    assert.equal(formatMoney(-0.5, 'EUR'), '-€0.01');
    assert.equal(formatMoney(0.49, 'EUR'), '€0.00');
    assert.equal(formatMoney(-0.49, 'EUR'), '€0.00');
  });
});

describe('the message for an optional box that cannot be read', () => {
  it('says what is wrong and what to do about it', () => {
    assert.equal(OPTIONAL_UNREADABLE, 'One of the optional boxes cannot be read. Use digits only, or clear the box.');
  });
});

// ---------------------------------------------------------------------------
// One month of interest
// ---------------------------------------------------------------------------

describe('one month of interest at the edges', () => {
  it('is a plain zero on no balance or at no rate, never a negative zero', () => {
    assert.ok(Object.is(monthlyInterestMinor(-0, 0.05), 0));
    assert.ok(Object.is(monthlyInterestMinor(500, -0), 0));
    assert.ok(Object.is(monthlyInterestMinor(0, 0.05), 0));
    assert.ok(Object.is(monthlyInterestMinor(500, 0), 0));
  });

  it('rounds half a unit away from zero when the balance or the rate is negative', () => {
    // 50 at 12% a year is 1% a month: half a unit, owed the other way.
    assert.equal(monthlyInterestMinor(-50, 0.12), -1);
    assert.equal(monthlyInterestMinor(50, -0.12), -1);
  });

  it('still answers for a balance that is not a whole number of minor units', () => {
    // 100.25 at 12.000001% a year: 100.25 x 0.12000001 / 12 = 1.0025000835...
    assert.equal(monthlyInterestMinor(100.25, 0.12000001), 1);
  });

  it('is exact on a balance too large for floating-point whole numbers', () => {
    // 6% a year is a two-hundredth a month. 99,999,999,999,900 / 200 is
    // 499,999,999,999.5 exactly, and the half rounds up.
    assert.equal(monthlyInterestMinor(99_999_999_999_900, 0.06), 500_000_000_000);
    // One hundred less is a whole number of units, with nothing to round.
    assert.equal(monthlyInterestMinor(99_999_999_999_800, 0.06), 499_999_999_999);
  });
});

// ---------------------------------------------------------------------------
// Months for a payment
// ---------------------------------------------------------------------------

describe('computeMonthsForPayment at the edges', () => {
  it('counts a loan that ends on the last month the engine follows, and gives no count one month beyond', () => {
    // No interest, one unit a month: 1,200 units take 1,200 months.
    assert.equal(computeMonthsForPayment(1200, 0, 1), MAX_TERM_MONTHS);
    assert.equal(computeMonthsForPayment(1201, 0, 1), Infinity);
  });

  it('never pays off when the payment is no more than a month\'s interest, even where rounding the interest would hide it', () => {
    // 1 unit at 300% a year owes a quarter of a unit a month, which rounds to
    // nothing. A payment of a fifth, or of exactly the quarter, never gets ahead.
    assert.equal(computeMonthsForPayment(1, 3, 0.2), Infinity);
    assert.equal(computeMonthsForPayment(1, 3, 0.25), Infinity);
  });
});

// ---------------------------------------------------------------------------
// buildSchedule
// ---------------------------------------------------------------------------

describe('buildSchedule, worked by hand', () => {
  // 1,000.00 at 12% a year (1% a month), 400.00 a month.
  //   month 1: interest 10.00, principal 390.00, owed 610.00
  //   month 2: interest  6.10, principal 393.90, owed 216.10
  //   month 3: interest  2.16 (2.161 rounded), principal 216.10, payment 218.26
  const worked = [
    row(1, 40000, 1000, 39000, 61000),
    row(2, 40000, 610, 39390, 21610),
    row(3, 21826, 216, 21610, 0),
  ];

  it('splits each payment into interest and principal, and the last payment clears what is left', () => {
    assert.deepEqual(buildSchedule(100000, 0.12, 40000), { schedule: worked, warnings: [] });
  });

  it('adds the extra monthly amount to the payment', () => {
    assert.deepEqual(buildSchedule(100000, 0.12, 30000, 10000), { schedule: worked, warnings: [] });
  });

  it('refuses a principal or a payment of nothing, with an empty schedule', () => {
    for (const principal of [0, -1]) {
      assert.deepEqual(buildSchedule(principal, 0.12, 40000), { schedule: [], warnings: [], error: 'Principal must be greater than zero.' });
    }
    for (const payment of [0, -1]) {
      assert.deepEqual(buildSchedule(100000, 0, payment), { schedule: [], warnings: [], error: 'Monthly payment must be greater than zero.' });
    }
  });

  it('refuses a payment that only equals the first month\'s interest, and counts the extra amount towards it', () => {
    // The first month's interest on 1,000.00 at 12% a year is 10.00.
    assert.deepEqual(buildSchedule(100000, 0.12, 1000), { schedule: [], warnings: [], error: TOO_LOW });
    assert.deepEqual(buildSchedule(100000, 0.12, 400, 600), { schedule: [], warnings: [], error: TOO_LOW });
    // 5.00 and 6.00 extra is 11.00: one more than the interest, so the loan starts.
    const started = buildSchedule(100000, 0.12, 500, 600);
    assert.equal(started.error, undefined);
    assert.deepEqual(started.schedule[0], row(1, 1100, 1000, 100, 99900));
  });

  it('follows a loan for 1,200 months and says so when something is still owed', () => {
    // No interest, one unit a month: 1,201 units leave one unit after 1,200 months.
    const long = buildSchedule(1201, 0, 1);
    assert.equal(long.error, NOT_WITHIN_LIMIT);
    assert.deepEqual(long.warnings, []);
    assert.equal(long.schedule.length, 1200);
    assert.deepEqual(long.schedule[1199], row(1200, 1, 0, 1, 1));
    // 1,200 units are paid off on the last month, with nothing to report.
    const exact = buildSchedule(1200, 0, 1);
    assert.equal(exact.error, undefined);
    assert.equal(exact.schedule.length, 1200);
    assert.deepEqual(exact.schedule[1199], row(1200, 1, 0, 1, 0));
  });

  it('says so when the principal column does not add up to the loan', () => {
    // Amounts that are not whole minor units: 0.3 + 0.3 + 0.3 + what is left
    // of 1 comes to 0.9999999999999999 in floating point.
    const { schedule, warnings } = buildSchedule(1, 0, 0.3);
    assert.equal(schedule.length, 4);
    assert.deepEqual(warnings, ['Internal precision check: principal sum 0.9999999999999999 ≠ 1. Please report this.']);
  });
});

// ---------------------------------------------------------------------------
// buildScheduleAdvanced
// ---------------------------------------------------------------------------

describe('buildScheduleAdvanced: what it refuses', () => {
  const fixed: RateSpec = { kind: 'fixed', annualRate: 0.12 };

  it('refuses a principal, a payment or a term of nothing, with an empty schedule', () => {
    for (const principalMinor of [0, -1]) {
      assert.deepEqual(
        buildScheduleAdvanced({ principalMinor, rateSpec: fixed, totalMonths: 12, basePaymentMinor: 40000 }),
        { schedule: [], warnings: [], error: 'Principal must be greater than zero.' },
      );
    }
    for (const basePaymentMinor of [0, -1]) {
      assert.deepEqual(
        buildScheduleAdvanced({ principalMinor: 100000, rateSpec: { kind: 'fixed', annualRate: 0 }, totalMonths: 12, basePaymentMinor }),
        { schedule: [], warnings: [], error: 'Monthly payment must be greater than zero.' },
      );
    }
    // Part of a month is no month.
    for (const totalMonths of [0, 0.9, -3]) {
      assert.deepEqual(
        buildScheduleAdvanced({ principalMinor: 100000, rateSpec: fixed, totalMonths, basePaymentMinor: 40000 }),
        { schedule: [], warnings: [], error: 'Term must be at least one month.' },
      );
    }
  });

  it('refuses a payment that only equals the first month\'s interest, counting whole units of the extra amount', () => {
    // The first month's interest on 1,000.00 at 12% a year is 10.00.
    const tooLow = { schedule: [], warnings: [], error: TOO_LOW };
    assert.deepEqual(buildScheduleAdvanced({ principalMinor: 100000, rateSpec: fixed, totalMonths: 12, basePaymentMinor: 1000 }), tooLow);
    // 6.00 and 4.009 extra: the part of a unit is dropped, which leaves 10.00.
    assert.deepEqual(
      buildScheduleAdvanced({ principalMinor: 100000, rateSpec: fixed, totalMonths: 12, basePaymentMinor: 600, extraMonthlyMinor: 400.9 }),
      tooLow,
    );
    const started = buildScheduleAdvanced({ principalMinor: 100000, rateSpec: fixed, totalMonths: 12, basePaymentMinor: 600, extraMonthlyMinor: 401 });
    assert.equal(started.error, undefined);
    assert.deepEqual(started.schedule[0], row(1, 1001, 1000, 1, 99999));
  });

  it('follows a fixed-rate loan for 1,200 months and says so when something is still owed', () => {
    // 10,000.00 at 1.2% a year owes 10.00 a month; 10.01 a month pays one
    // unit off in the first month and would need thousands of months.
    const slow = buildScheduleAdvanced({ principalMinor: 1_000_000, rateSpec: { kind: 'fixed', annualRate: 0.012 }, totalMonths: 1200, basePaymentMinor: 1001 });
    assert.equal(slow.error, NOT_WITHIN_LIMIT);
    assert.deepEqual(slow.warnings, []);
    assert.equal(slow.unpaid, undefined);
    assert.equal(slow.schedule.length, 1200);
    assert.deepEqual(slow.schedule[0], row(1, 1001, 1000, 1, 999_999));
    assert.ok(slow.schedule[1199].balance > 0);
  });
});

describe('buildScheduleAdvanced: a fixed rate with extra and lump sums, worked by hand', () => {
  it('applies lump sums after the month\'s payment, adds those of one month together and ignores the ones it cannot use', () => {
    // 1,000.00 at 1% a month, 300.00 a month and 100.00 extra.
    //   month 1: interest 10.00, principal 390.00, owed 610.00;
    //            lump sums of 50.00 and 60.00 bring it to 500.00
    //   month 2: interest  5.00, principal 395.00, owed 105.00
    //   month 3: interest  1.05, principal 105.00, payment 106.05
    const result = buildScheduleAdvanced({
      principalMinor: 100000,
      rateSpec: { kind: 'fixed', annualRate: 0.12 },
      totalMonths: 3,
      basePaymentMinor: 30000,
      extraMonthlyMinor: 10000.5,
      lumpSums: [
        { month: 1, amountMinor: 5000 },
        // Part of a month counts as that month, part of a unit is dropped.
        { month: 1.9, amountMinor: 6000.9 },
        // None of these is a payment: a negative amount, nothing, not a number, without end, before the loan.
        { month: 1, amountMinor: -1000 },
        { month: 2, amountMinor: 0 },
        { month: 2, amountMinor: NaN },
        { month: 2, amountMinor: Infinity },
        { month: 0, amountMinor: 7000 },
        { month: NaN, amountMinor: 7000 },
      ],
    });
    assert.deepEqual(result, {
      schedule: [
        row(1, 51000, 1000, 50000, 50000),
        row(2, 40000, 500, 39500, 10500),
        row(3, 10605, 105, 10500, 0),
      ],
      warnings: [],
      recastPaymentMinor: undefined,
    });
  });

  it('takes from a lump sum only what is still owed', () => {
    // 10.00 at no interest, 1.00 a month, and 50.00 offered in the first month.
    const { schedule } = buildScheduleAdvanced({
      principalMinor: 1000,
      rateSpec: { kind: 'fixed', annualRate: 0 },
      totalMonths: 10,
      basePaymentMinor: 100,
      lumpSums: [{ month: 1, amountMinor: 5000 }],
    });
    assert.deepEqual(schedule, [row(1, 1000, 0, 1000, 0)]);
  });

  it('says so when the principal column does not add up to the loan', () => {
    const { schedule, warnings } = buildScheduleAdvanced({ principalMinor: 1, rateSpec: { kind: 'fixed', annualRate: 0 }, totalMonths: 4, basePaymentMinor: 0.3 });
    assert.equal(schedule.length, 4);
    assert.deepEqual(warnings, ['Internal precision check: principal sum 0.9999999999999999 ≠ 1. Please report this.']);
  });

  it('takes no notice, at a fixed rate, of fields that only a changing rate has', () => {
    // The loan of buildSchedule above: 1,000.00 at 1% a month, 400.00 a month.
    const stray = { kind: 'fixed' as const, annualRate: 0.12, initialMonths: 1, subsequentAnnualRate: 0.6, keeps: 'payment' as const };
    assert.deepEqual(buildScheduleAdvanced({ principalMinor: 100000, rateSpec: stray, totalMonths: 3, basePaymentMinor: 40000 }), {
      schedule: [row(1, 40000, 1000, 39000, 61000), row(2, 40000, 610, 39390, 21610), row(3, 21826, 216, 21610, 0)],
      warnings: [],
      recastPaymentMinor: undefined,
    });
    // And a fixed-rate loan that is not paid off within the limit is refused: there is no kept payment to report on.
    const slow = buildScheduleAdvanced({ principalMinor: 1_000_000, rateSpec: { ...stray, annualRate: 0.012 }, totalMonths: 1200, basePaymentMinor: 1001 });
    assert.equal(slow.error, NOT_WITHIN_LIMIT);
    assert.equal(slow.unpaid, undefined);
  });
});

describe('buildScheduleAdvanced: a loan with a term ends on it', () => {
  const noInterest: RateSpec = { kind: 'fixed', annualRate: 0 };

  it('puts the unit the rounded payment leaves into the last payment, only when the loan has a term', () => {
    // 100 over 3 months is 33 a month, which leaves 1.
    const withTerm = buildScheduleAdvanced({ principalMinor: 100, rateSpec: noInterest, totalMonths: 3, basePaymentMinor: 33, endsAtTerm: true });
    assert.deepEqual(withTerm.schedule, [row(1, 33, 0, 33, 67), row(2, 33, 0, 33, 34), row(3, 34, 0, 34, 0)]);
    for (const endsAtTerm of [false, undefined]) {
      const byPayment = buildScheduleAdvanced({ principalMinor: 100, rateSpec: noInterest, totalMonths: 3, basePaymentMinor: 33, endsAtTerm });
      assert.deepEqual(byPayment.schedule, [row(1, 33, 0, 33, 67), row(2, 33, 0, 33, 34), row(3, 33, 0, 33, 1), row(4, 1, 0, 1, 0)]);
    }
  });

  it('does not double the last payment when a whole payment is still owed after the term', () => {
    // 300 at 100 a month over a term of 2: after the second payment 100 is
    // left, a full payment, so it is a third payment and not part of the second.
    const { schedule } = buildScheduleAdvanced({ principalMinor: 300, rateSpec: noInterest, totalMonths: 2, basePaymentMinor: 100, endsAtTerm: true });
    assert.deepEqual(schedule, [row(1, 100, 0, 100, 200), row(2, 100, 0, 100, 100), row(3, 100, 0, 100, 0)]);
  });
});

describe('buildScheduleAdvanced: a rate that changes, with a new payment worked out', () => {
  it('works out the payment for what is owed over the months left, at the later rate', () => {
    // 1,200.00 over 4 months, no interest for 2 months, then 1% a month.
    //   months 1 and 2: 300.00 each, owed 600.00
    //   new payment: 600.00 x 0.01 x 1.01^2 / (1.01^2 - 1), the annuity for 2 months
    //   month 3: interest 6.00, principal 298.51, owed 301.49
    //   month 4: interest 3.01 (3.0149 rounded), principal 301.49, payment 304.50
    const annuity = Math.round((60000 * 0.01 * 1.0201) / 0.0201);
    assert.equal(annuity, 30451);
    const result = buildScheduleAdvanced({
      principalMinor: 120000,
      rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 2, subsequentAnnualRate: 0.12 },
      totalMonths: 4,
      basePaymentMinor: 30000,
    });
    assert.deepEqual(result, {
      schedule: [
        row(1, 30000, 0, 30000, 90000),
        row(2, 30000, 0, 30000, 60000),
        row(3, 30451, 600, 29851, 30149),
        row(4, 30450, 301, 30149, 0),
      ],
      warnings: [],
      recastPaymentMinor: 30451,
    });
  });

  it('warns when the new payment only equals a month\'s interest at the later rate', () => {
    // 101 units, one paid in the first month at no interest. Then 1% a month
    // on 100 is 1 unit, and the payment for 100 over 1,199 months,
    // 1 / (1 - 1.01^-1199), is 1 unit as well: nothing is paid off.
    const spec = () => readToTheLimit({ kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 0.12 });
    const stuck = buildScheduleAdvanced({ principalMinor: 101, rateSpec: spec(), totalMonths: 1200, basePaymentMinor: 1 });
    assert.deepEqual(stuck.warnings, ['After the initial fixed period, the subsequent rate is so high that the recast payment barely covers interest.']);
    assert.equal(stuck.error, NOT_WITHIN_LIMIT);
    assert.equal(stuck.schedule.length, 1200);
    assert.deepEqual(stuck.schedule[1199], row(1200, 1, 1, 0, 100));

    // With one unit extra a month the payment is ahead of the interest: no warning, and the loan ends.
    // (99 are owed after the first month; the new payment for 99 is again 1 unit.)
    const ahead = buildScheduleAdvanced({ principalMinor: 101, rateSpec: spec(), totalMonths: 1200, basePaymentMinor: 1, extraMonthlyMinor: 1 });
    assert.deepEqual(ahead.warnings, []);
    assert.equal(ahead.error, undefined);
    assert.deepEqual(ahead.schedule[1], row(2, 2, 1, 1, 98));
    assert.equal(ahead.schedule[ahead.schedule.length - 1].balance, 0);
  });

  it('gives no such warning when the later rate is nothing, even if the new payment rounds to nothing', () => {
    // 100 units over 1,199 months at no interest is less than half a unit a month.
    const stuck = buildScheduleAdvanced({
      principalMinor: 101,
      rateSpec: readToTheLimit({ kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 0 }),
      totalMonths: 1200,
      basePaymentMinor: 1,
    });
    assert.deepEqual(stuck.warnings, []);
    assert.equal(stuck.error, NOT_WITHIN_LIMIT);
    assert.deepEqual(stuck.schedule[1199], row(1200, 0, 0, 0, 100));
  });
});

describe('buildScheduleAdvanced: a rate that changes, with the payment kept', () => {
  /** No interest for one month, then 1.2% a year: a thousandth of what is owed each month. */
  const kept = () => readToTheLimit({ kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 0.012, keeps: 'payment' });

  it('keeps the payment, so the loan ends when it ends', () => {
    // 1,200.00, no interest for 2 months then 1% a month, 300.00 a month throughout.
    //   months 1 and 2: owed 900.00, then 600.00
    //   month 3: interest 6.00, principal 294.00, owed 306.00
    //   month 4: interest 3.06, principal 296.94, owed 9.06
    //   month 5: interest 0.09 (0.0906 rounded), principal 9.06, payment 9.15
    const result = buildScheduleAdvanced({
      principalMinor: 120000,
      rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 2, subsequentAnnualRate: 0.12, keeps: 'payment' },
      totalMonths: 4,
      basePaymentMinor: 30000,
    });
    assert.deepEqual(result, {
      schedule: [
        row(1, 30000, 0, 30000, 90000),
        row(2, 30000, 0, 30000, 60000),
        row(3, 30000, 600, 29400, 30600),
        row(4, 30000, 306, 29694, 906),
        row(5, 915, 9, 906, 0),
      ],
      warnings: [],
      recastPaymentMinor: undefined,
    });
  });

  it('reports a payment that equals the interest: the balance stands still from the month the rate changes', () => {
    // 1,000 paid in the first month leaves 1,000,000, which owes 1,000 a month.
    const result = buildScheduleAdvanced({ principalMinor: 1_001_000, rateSpec: kept(), totalMonths: 1200, basePaymentMinor: 1000 });
    assert.deepEqual(result.unpaid, { outcome: 'never', covers: 'equal', fromMonth: 2 });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.schedule.length, 1200);
    assert.deepEqual(result.schedule[1199], row(1200, 1000, 1000, 0, 1_000_000));
  });

  it('reports a payment that is less than the interest: the balance grows', () => {
    // 999 paid in the first month leaves 1,000,000, which owes 1,000: one more than the payment.
    const result = buildScheduleAdvanced({ principalMinor: 1_000_999, rateSpec: kept(), totalMonths: 1200, basePaymentMinor: 999 });
    assert.deepEqual(result.unpaid, { outcome: 'never', covers: 'less', fromMonth: 2 });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.schedule[1], row(2, 999, 1000, -1, 1_000_001));
  });

  it('reports a balance that is still falling at the limit, without calling it never', () => {
    // 1,001 paid in the first month leaves 1,000,000; the payment is one unit ahead of the interest.
    const result = buildScheduleAdvanced({ principalMinor: 1_001_001, rateSpec: kept(), totalMonths: 1200, basePaymentMinor: 1001 });
    assert.deepEqual(result.unpaid, { outcome: 'limit' });
    assert.equal(result.error, undefined);
    assert.equal(result.schedule.length, 1200);
    assert.deepEqual(result.schedule[1], row(2, 1001, 1000, 1, 999_999));
  });

  it('judges only after the last lump sum whether the balance can fall again', () => {
    // 2,000,000 with 1,001 a month. After the first month 1,998,999 is owed.
    //   month 2: interest 1,999 (1,998.999 rounded), 998 short, owed 1,999,997
    //   month 3: interest 2,000, 999 short, owed 2,000,996
    //   month 4: interest 2,001, 1,000 short, owed 2,001,996
    //   month 5: interest 2,002, 1,001 short, owed 2,002,997;
    //            a lump sum of 1,002,997 brings it to 1,000,000
    //   month 6: interest 1,000, one unit paid off: the balance falls from here
    const result = buildScheduleAdvanced({
      principalMinor: 2_000_000,
      rateSpec: kept(),
      totalMonths: 1200,
      basePaymentMinor: 1001,
      lumpSums: [{ month: 5, amountMinor: 1_002_997 }],
    });
    assert.deepEqual(result.schedule.slice(1, 6), [
      row(2, 1001, 1999, -998, 1_999_997),
      row(3, 1001, 2000, -999, 2_000_996),
      row(4, 1001, 2001, -1000, 2_001_996),
      row(5, 1_003_998, 2002, 1_001_996, 1_000_000),
      row(6, 1001, 1000, 1, 999_999),
    ]);
    assert.deepEqual(result.unpaid, { outcome: 'limit' });
  });

  it('does not wait for a lump sum it cannot use', () => {
    const result = buildScheduleAdvanced({
      principalMinor: 1_001_000,
      rateSpec: kept(),
      totalMonths: 1200,
      basePaymentMinor: 1000,
      lumpSums: [
        { month: NaN, amountMinor: 100 },
        { month: Infinity, amountMinor: 100 },
        { month: 40, amountMinor: 0 },
        { month: 50, amountMinor: NaN },
        { month: 60, amountMinor: -100 },
      ],
    });
    assert.deepEqual(result.unpaid, { outcome: 'never', covers: 'equal', fromMonth: 2 });
    assert.deepEqual(result.schedule[1199], row(1200, 1000, 1000, 0, 1_000_000));
  });
});

describe('buildScheduleAdvanced: a lump sum larger than what is owed (issue 925)', () => {
  const flat = (lumpSums: { month: number; amountMinor: number }[]) =>
    buildScheduleAdvanced({ principalMinor: 120000, rateSpec: { kind: 'fixed', annualRate: 0 }, totalMonths: 12, basePaymentMinor: 10000, lumpSums });

  it('pays what is owed and no more, and hands back the month', () => {
    // 1,200.00 at 0%, 100.00 a month: 900.00 is owed after month 3.
    const result = flat([{ month: 3, amountMinor: 90001 }]);
    assert.equal(result.partLumpMonth, 3);
    assert.ok(result.partLumpSeveral === false);
    // Two typed for that month are several; two in another month do not make this one several.
    assert.ok(flat([{ month: 3, amountMinor: 50000 }, { month: 3, amountMinor: 40001 }]).partLumpSeveral === true);
    assert.ok(flat([{ month: 1, amountMinor: 1 }, { month: 1, amountMinor: 1 }, { month: 3, amountMinor: 90001 }]).partLumpSeveral === false);
    assert.deepEqual(result.schedule.at(-1), row(3, 100000, 0, 100000, 0));
    assert.equal(result.schedule.length, 3);
  });

  it('hands back no month, not even an empty one, when every lump sum is used whole or none is', () => {
    for (const lumpSums of [[], [{ month: 3, amountMinor: 90000 }], [{ month: 3, amountMinor: 5000 }], [{ month: 13, amountMinor: 5000 }], [{ month: 12, amountMinor: 5000 }]]) {
      const result = flat(lumpSums);
      assert.ok(!('partLumpMonth' in result), JSON.stringify(lumpSums));
      assert.ok(!('partLumpSeveral' in result), JSON.stringify(lumpSums));
      assert.equal(result.error, undefined);
    }
  });
});

