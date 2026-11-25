/**
 * The join between a yearly inflation history and a monthly price index
 * (monthly.ts): which month an answer may end at, the step to it from the last
 * year's average, and every reason a country keeps its yearly answer.
 *
 * The made-up index is flat within each year, so a year's mean is its one
 * value and the yearly change it implies can be read off: 100, 110, 121,
 * 133.1, 146.41, 161.051 is 10% a year from 2020 to 2025.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOLERANCE_POINTS,
  TOLERANCE_SHARE,
  WITHHELD,
  YEARS_COMPARED,
  YEARS_NEEDED,
  impliedYearlyRate,
  monthlyJoin,
  ratesAgree,
  yearMean,
} from './monthly.ts';

const key = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** Every month of each year at that year's one value. */
function flat(byYear: Record<number, number>, more: Record<string, number> = {}): Record<string, number> {
  const months: Record<string, number> = {};
  for (const [year, value] of Object.entries(byYear)) for (let m = 1; m <= 12; m++) months[key(Number(year), m)] = value;
  return { ...months, ...more };
}

/** 10% a year, 2020 to 2025. */
const INDEX = { 2020: 100, 2021: 110, 2022: 121, 2023: 133.1, 2024: 146.41, 2025: 161.051 };
/** The World Bank's figures that agree with it. */
const YEARS = { '2020': 3, '2021': 10, '2022': 10, '2023': 10, '2024': 10, '2025': 10 };
/** March 2026 is 10% above the 2025 average. */
const LATER = { '2026-03': 177.1561 };

describe('the settings of the join', () => {
  it('are the financial review’s: 0.2 points or 2% of the rate, over five years, at least three of them comparable', () => {
    assert.equal(TOLERANCE_POINTS, 0.2);
    assert.equal(TOLERANCE_SHARE, 0.02);
    assert.equal(YEARS_COMPARED, 5);
    assert.equal(YEARS_NEEDED, 3);
    assert.deepEqual(WITHHELD, {});
  });
});

describe('a year of the index', () => {
  it('is the mean of its twelve months', () => {
    const months: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) months[key(2025, m)] = m;
    // 1 + 2 + ... + 12 = 78, and 78 / 12 = 6.5.
    assert.equal(yearMean(months, 2025), 6.5);
    assert.equal(yearMean(flat({ 2024: 128 }), 2024), 128);
  });

  it('has no mean when a month is missing, or is not a positive number', () => {
    for (let gone = 1; gone <= 12; gone++) {
      const months = flat({ 2025: 100 });
      delete months[key(2025, gone)];
      assert.equal(yearMean(months, 2025), null, `without month ${gone}`);
    }
    for (const bad of [0, -1, NaN, Infinity, '100', null]) {
      assert.equal(yearMean({ ...flat({ 2025: 100 }), '2025-12': bad as number }, 2025), null, String(bad));
    }
    assert.equal(yearMean(flat({ 2024: 100 }), 2025), null);
    assert.equal(yearMean({}, 2025), null);
  });

  it('reads months by their two-digit number, January as 01', () => {
    const months = flat({ 2025: 100 });
    delete months['2025-01'];
    assert.equal(yearMean({ ...months, '2025-1': 100 }, 2025), null);
  });

  it('implies a yearly change: its mean over the year before’s', () => {
    // 121 / 110 = 1.1
    assert.ok(Math.abs(impliedYearlyRate(flat(INDEX), 2022)! - 10) < 1e-9);
    // 90 / 100 = 0.9: a fall is a negative rate.
    assert.ok(Math.abs(impliedYearlyRate(flat({ 2024: 100, 2025: 90 }), 2025)! + 10) < 1e-9);
    assert.equal(impliedYearlyRate(flat({ 2025: 90 }), 2025), null);
    assert.equal(impliedYearlyRate(flat({ 2024: 100 }), 2025), null);
  });
});

describe('whether the index and the World Bank follow the same prices', () => {
  it('allows 0.2 percentage points either way, and no more', () => {
    assert.equal(ratesAgree(0.2, 0), true);
    assert.equal(ratesAgree(-0.2, 0), true);
    assert.equal(ratesAgree(0.2001, 0), false);
    assert.equal(ratesAgree(-0.2001, 0), false);
    assert.equal(ratesAgree(3, 3), true);
    assert.equal(ratesAgree(3.25, 3), false);
    assert.equal(ratesAgree(2.75, 3), false);
  });

  it('allows 2% of the rate where that is more: a high-inflation year is not held to 0.2 points', () => {
    // 2% of 100 is 2 points.
    assert.equal(ratesAgree(102, 100), true);
    assert.equal(ratesAgree(98, 100), true);
    assert.equal(ratesAgree(102.5, 100), false);
    assert.equal(ratesAgree(97.5, 100), false);
    // The size of the rate counts, not its sign.
    assert.equal(ratesAgree(-102, -100), true);
    assert.equal(ratesAgree(-102.5, -100), false);
    // 2% of 5 is 0.1 point, less than 0.2, so 0.2 still holds.
    assert.equal(ratesAgree(5.125, 5), true);
    assert.equal(ratesAgree(5.25, 5), false);
  });
});

describe('the month a country’s answer may end at', () => {
  it('is the latest month, with the step to it from the last year’s average', () => {
    // 177.1561 / 161.051 = 1.1
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
  });

  it('is the latest of several, wherever it was written in the file', () => {
    const months = { '2026-04': 80.5255, ...flat(INDEX, LATER), '2026-02': 170 };
    // 80.5255 / 161.051 = 0.5: prices can be lower than the year's average.
    assert.deepEqual(monthlyJoin('TST', YEARS, months), { month: '2026-04', factor: 0.5 });
  });

  it('keeps the step to six decimals', () => {
    // 161.051 x 1.0123456789 = 163.03928...; the step is 1.012346 to six places.
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, { '2026-01': 161.051 * 1.0123456789 })), { month: '2026-01', factor: 1.012346 });
  });

  it('links from the World Bank’s last year, whichever that is', () => {
    // No 2025 figure yet: the link is the 2024 average, and 2025's months only lie on the way.
    const { '2025': _none, ...to2024 } = YEARS;
    const join = monthlyJoin('TST', { ...to2024, '2020': 10, '2019': 10 }, flat({ 2019: 90.909090909, ...INDEX }, LATER));
    // 177.1561 / 146.41 = 1.21
    assert.deepEqual(join, { month: '2026-03', factor: 1.21 });
  });
});

describe('a country that keeps its yearly answer', () => {
  it('when the index stops with the link year: no later month', () => {
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX)), { withheld: 'no-later-month' });
    // December of the link year is not later; January of the next is.
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, { '2026-01': 161.051 })), { month: '2026-01', factor: 1 });
  });

  it('when a month of the link year is missing: incomplete', () => {
    const months = flat(INDEX, LATER);
    delete months['2025-07'];
    assert.deepEqual(monthlyJoin('TST', YEARS, months), { withheld: 'incomplete' });
  });

  it('when there are no years, or no months: incomplete', () => {
    assert.deepEqual(monthlyJoin('TST', {}, flat(INDEX, LATER)), { withheld: 'incomplete' });
    assert.deepEqual(monthlyJoin('TST', YEARS, {}), { withheld: 'incomplete' });
  });

  it('when an earlier year is short of a month, with the link year whole and a later month there: incomplete', () => {
    // All twelve months of 2025 and March 2026 are there; February 2024 is not, so neither 2025's
    // change nor 2024's can be worked out. The reason shown must cover this case too.
    const months = flat(INDEX, LATER);
    delete months['2024-02'];
    assert.ok(yearMean(months, 2025) !== null && yearMean(months, 2024) === null);
    assert.deepEqual(monthlyJoin('TST', YEARS, months), { withheld: 'incomplete' });
  });

  it('when the link year itself cannot be compared: incomplete', () => {
    // The year before the link year has a month missing, so the link year's own change cannot be worked out.
    const months = flat(INDEX, LATER);
    delete months['2024-02'];
    assert.deepEqual(monthlyJoin('TST', YEARS, months), { withheld: 'incomplete' });
  });

  it('when the index’s yearly change differs from the World Bank’s in the link year: mismatch', () => {
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2025': 10.5 }, flat(INDEX, LATER)), { withheld: 'mismatch' });
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2025': 9.5 }, flat(INDEX, LATER)), { withheld: 'mismatch' });
    // Inside the tolerance it is joined: 10.15 against the index's 10.
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2025': 10.15 }, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
  });

  it('when they differ in any of the five years compared, and not for a year before those', () => {
    for (const year of ['2021', '2022', '2023', '2024']) {
      assert.deepEqual(monthlyJoin('TST', { ...YEARS, [year]: 11 }, flat(INDEX, LATER)), { withheld: 'mismatch' }, year);
    }
    // 2020 is the sixth year back: it is not compared (and the index has no 2019 to compare it with).
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2020': 50 }, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
    // Nor is it compared when the index does reach back that far.
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2020': 50 }, flat({ 2019: 90, ...INDEX }, LATER)), { month: '2026-03', factor: 1.1 });
  });

  it('a year that only one of the two has is passed over, while three can still be compared', () => {
    // The World Bank has no 2023 and no 2022: 2025, 2024 and 2021 remain.
    const { '2023': _a, '2022': _b, ...three } = YEARS;
    assert.deepEqual(monthlyJoin('TST', three, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
    // And none of 2021 either: two is too few.
    const { '2021': _c, ...two } = three;
    assert.deepEqual(monthlyJoin('TST', two, flat(INDEX, LATER)), { withheld: 'incomplete' });
    // The index has no 2021 or 2022: 2025, 2024 and 2023 can be compared, 2022 and 2021 cannot.
    const { 2020: _d, 2021: _e, ...from2022 } = INDEX;
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(from2022, LATER)), { month: '2026-03', factor: 1.1 });
    // Without 2022 as well, only 2025 and 2024: too few.
    const { 2022: _f, ...from2023 } = from2022;
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(from2023, LATER)), { withheld: 'incomplete' });
  });

  it('a mismatch in a year that can be compared outweighs years that cannot', () => {
    const { '2023': _a, ...gap } = YEARS;
    assert.deepEqual(monthlyJoin('TST', { ...gap, '2021': 12 }, flat(INDEX, LATER)), { withheld: 'mismatch' });
  });

  it('when it is on the list of countries never joined, whatever its figures', () => {
    const list = WITHHELD as Record<string, string>;
    list.TST = 'a made-up reason';
    try {
      assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, LATER)), { withheld: 'listed' });
      assert.deepEqual(monthlyJoin('OTH', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
    } finally {
      delete list.TST;
    }
    // A name every object has is not a country on the list.
    assert.deepEqual(monthlyJoin('toString', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1 });
  });
});
