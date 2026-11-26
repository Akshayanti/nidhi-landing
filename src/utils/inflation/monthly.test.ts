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
import { dict } from '../../i18n/index.ts';
import {
  TOLERANCE_POINTS,
  TOLERANCE_SHARE,
  ACCEPTED_IMPLIED_WITHIN,
  ACCEPTED_WORLD_BANK_WITHIN,
  ACCEPTED_YEARS,
  MONTHLY_SOURCES,
  STALE_AFTER_MONTHS,
  WITHHELD,
  YEARS_COMPARED,
  YEARS_NEEDED,
  bestJoin,
  impliedYearlyRate,
  isAcceptedYear,
  isQuarterly,
  monthlyJoin as monthlyJoinOf,
  monthsBefore,
  type MonthlySource,
  ratesAgree,
  yearMean,
} from './monthly.ts';

const key = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/** Every month of each year at that year's one value. */
function flat(byYear: Record<number, number>, more: Record<string, number> = {}): Record<string, number> {
  const months: Record<string, number> = {};
  for (const [year, value] of Object.entries(byYear)) for (let m = 1; m <= 12; m++) months[key(Number(year), m)] = value;
  return { ...months, ...more };
}

/** The join from one source's months, their age measured from the middle of April 2026 unless a test says otherwise. */
const monthlyJoin = (code: string, years: Record<string, number>, months: Record<string, number>, fetchedAt = '2026-04-15', source: MonthlySource = 'bis') =>
  monthlyJoinOf(code, years, { source, months, asOf: fetchedAt });

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
    assert.equal(STALE_AFTER_MONTHS, 6);
    assert.deepEqual(MONTHLY_SOURCES, ['bis', 'worldBank']);
  });

  it('has one accepted year, India’s 2025, with its evidence written down', () => {
    assert.deepEqual(Object.keys(ACCEPTED_YEARS), ['IND']);
    assert.deepEqual(Object.keys(ACCEPTED_YEARS.IND), ['2025']);
    assert.match(ACCEPTED_YEARS.IND[2025].evidence, /MOSPI.*2\.20%.*2\.18%.*2\.40/);
    // The figures reviewed: the exception is for these, and no others.
    assert.equal(ACCEPTED_YEARS.IND[2025].worldBank, 2.4);
    assert.equal(ACCEPTED_YEARS.IND[2025].implied, 2.18);
    assert.equal(ACCEPTED_WORLD_BANK_WITHIN, 0.005);
    assert.equal(ACCEPTED_IMPLIED_WITHIN, 0.05);
  });

  it('is said on the page, in every language: the source paragraph and the FAQ name the country and the year', () => {
    // The page says months are joined only where the two agree; an accepted year is the one exception, so it is named there.
    for (const locale of ['en', 'hi', 'es', 'cs', 'mr'] as const) {
      const page = dict(locale).tools.inflation.page;
      assert.match(page.sourceMonthly.after, /\(2025\)/, `${locale}: the source paragraph`);
      assert.match(page.faq.items[3].a, /\(2025\)/, `${locale}: the FAQ`);
    }
    assert.match(dict('en').tools.inflation.page.sourceMonthly.after, /or, for one year in India \(2025\), where the difference is traced to the yearly figure rather than the index;/);
  });
});

describe('how old a month is', () => {
  it('counts whole months from the month to the month of the day', () => {
    assert.equal(monthsBefore('2026-09', '2026-11-25'), 2);
    assert.equal(monthsBefore('2026-11', '2026-11-01'), 0);
    assert.equal(monthsBefore('2025-12', '2026-01-31'), 1);
    assert.equal(monthsBefore('2025-01', '2026-11-25'), 22);
    assert.equal(monthsBefore('2024-11', '2026-11-25'), 24);
    // A month after the day's is ahead of it.
    assert.equal(monthsBefore('2026-12', '2026-11-25'), -1);
  });
});

describe('a latest month that is too old', () => {
  it('more than six months before the data was fetched is not joined; six months is', () => {
    const months = flat(INDEX, LATER);
    // March 2026: six months before September, seven before October.
    assert.deepEqual(monthlyJoin('TST', YEARS, months, '2026-09-30'), { month: '2026-03', factor: 1.1, source: 'bis' });
    assert.deepEqual(monthlyJoin('TST', YEARS, months, '2026-10-01'), { withheld: 'stale' });
    assert.deepEqual(monthlyJoin('TST', YEARS, months, '2027-03-01'), { withheld: 'stale' });
  });

  it('is said before a mismatch, and after there being no later month at all', () => {
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2025': 12 }, flat(INDEX, LATER), '2026-10-01'), { withheld: 'stale' });
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX), '2027-10-01'), { withheld: 'no-later-month' });
  });
});

describe('a year accepted although the yearly figure differs', () => {
  // India's reviewed case: the World Bank's 2.4 for 2025 against an index that implies 2.18.
  // An index at 100 in 2024 and 102.18 in 2025 implies exactly that; the years before agree at 10%.
  const INDIA = { 2020: 66.550625, 2021: 73.2056875, 2022: 80.52625625, 2023: 88.578881875, 2024: 100, 2025: 102.18 };
  const india = (wb2025: number, index2025 = 102.18, more: Record<string, number> = {}) =>
    monthlyJoin('IND', { ...YEARS, '2024': 12.89, '2025': wb2025, ...more }, flat({ ...INDIA, 2025: index2025 }, { '2026-03': index2025 * 1.1 }));

  it('is accepted only with both figures as they were reviewed', () => {
    assert.equal(isAcceptedYear('IND', 2025, 2.18, 2.4), true);
    // The yearly figure within rounding of the one reviewed, and no further.
    assert.equal(isAcceptedYear('IND', 2025, 2.18, 2.404), true);
    assert.equal(isAcceptedYear('IND', 2025, 2.18, 2.396), true);
    assert.equal(isAcceptedYear('IND', 2025, 2.18, 2.41), false);
    assert.equal(isAcceptedYear('IND', 2025, 2.18, 2.39), false);
    // The implied figure within 0.05 of the one reviewed, and no further.
    assert.equal(isAcceptedYear('IND', 2025, 2.22, 2.4), true);
    assert.equal(isAcceptedYear('IND', 2025, 2.14, 2.4), true);
    assert.equal(isAcceptedYear('IND', 2025, 2.24, 2.4), false);
    assert.equal(isAcceptedYear('IND', 2025, 2.12, 2.4), false);
    // Another year, another country, or a name every object has.
    assert.equal(isAcceptedYear('IND', 2024, 2.18, 2.4), false);
    assert.equal(isAcceptedYear('TST', 2025, 2.18, 2.4), false);
    assert.equal(isAcceptedYear('toString', 2025, 2.18, 2.4), false);
    assert.equal(isAcceptedYear('IND', 'toString' as unknown as number, 2.18, 2.4), false);
  });

  it('joins India with the figures reviewed, and no other country with the same figures', () => {
    const join = india(2.4);
    assert.ok(!('withheld' in join));
    assert.equal(join.month, '2026-03');
    assert.equal(join.factor, 1.1);
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2024': 12.89, '2025': 2.4 }, flat(INDIA, { '2026-03': 112.398 })), { withheld: 'mismatch' });
  });

  it('is a mismatch again once either figure is revised away from the one reviewed', () => {
    // The World Bank revises to 3: not the case that was reviewed.
    assert.deepEqual(india(3), { withheld: 'mismatch' });
    assert.deepEqual(india(2.5), { withheld: 'mismatch' });
    // The index is revised so that it implies 2.0, while the yearly figure stays at 2.4.
    assert.deepEqual(india(2.4, 102), { withheld: 'mismatch' });
    // The World Bank revises to what the index implies: it agrees, and needs no exception.
    assert.ok(!('withheld' in india(2.2)));
  });

  it('does not excuse another year of India’s, a missing month, or a month that is too old', () => {
    assert.deepEqual(india(2.4, 102.18, { '2023': 11 }), { withheld: 'mismatch' });
    const months = flat(INDIA, { '2026-03': 112.398 });
    delete months['2025-07'];
    assert.deepEqual(monthlyJoin('IND', { ...YEARS, '2024': 12.89, '2025': 2.4 }, months), { withheld: 'incomplete' });
    assert.deepEqual(monthlyJoin('IND', { ...YEARS, '2024': 12.89, '2025': 2.4 }, flat(INDIA, { '2026-03': 112.398 }), '2026-10-01'), { withheld: 'stale' });
  });

  it('counts as one of the years compared, not as a year passed over', () => {
    // Only 2025 (accepted), 2024 and 2023 can be compared: three, which is enough.
    const { '2021': _a, '2022': _b, ...three } = { ...YEARS, '2024': 12.89, '2025': 2.4 };
    assert.ok(!('withheld' in monthlyJoin('IND', three, flat(INDIA, { '2026-03': 112.398 }))));
    const { '2023': _c, ...two } = three;
    assert.deepEqual(monthlyJoin('IND', two, flat(INDIA, { '2026-03': 112.398 })), { withheld: 'incomplete' });
  });
});

describe('an index published by quarter', () => {
  const quarters = (values: Record<string, number>) => {
    const months: Record<string, number> = {};
    for (const [quarter, value] of Object.entries(values)) {
      const [year, q] = quarter.split('Q').map(Number);
      for (let n = 1; n <= 3; n++) months[key(year, (q - 1) * 3 + n)] = value;
    }
    return months;
  };

  it('is one whose latest quarter and the two before it each carry one figure', () => {
    const months = quarters({ '2025Q4': 100, '2026Q1': 101, '2026Q2': 102 });
    assert.equal(isQuarterly(months, '2026-06'), true);
    // Part of the latest quarter is enough, with its months so far alike.
    assert.equal(isQuarterly({ ...quarters({ '2025Q4': 100, '2026Q1': 101 }), '2026-04': 102, '2026-05': 102 }, '2026-05'), true);
    assert.equal(isQuarterly({ ...quarters({ '2025Q4': 100, '2026Q1': 101 }), '2026-04': 102 }, '2026-04'), true);
    // Across a year's end: January's quarter, then the last two of the year before.
    assert.equal(isQuarterly({ ...quarters({ '2025Q3': 99, '2025Q4': 100 }), '2026-01': 101 }, '2026-01'), true);
  });

  it('is not one when any of those months differs or is missing', () => {
    const months = quarters({ '2025Q4': 100, '2026Q1': 101, '2026Q2': 102 });
    for (const month of ['2025-10', '2025-12', '2026-01', '2026-03', '2026-04', '2026-06']) {
      assert.equal(isQuarterly({ ...months, [month]: 150 }, '2026-06'), false, `${month} differs`);
      const { [month]: _gone, ...without } = months;
      assert.equal(isQuarterly(without, '2026-06'), false, `${month} is missing`);
    }
    // A monthly index, and one flat for a single quarter only.
    assert.equal(isQuarterly(flat(INDEX, LATER), '2026-03'), false);
    assert.equal(isQuarterly({ ...quarters({ '2026Q2': 102 }), '2026-01': 100, '2026-02': 100.5, '2026-03': 101, '2025-10': 98, '2025-11': 99, '2025-12': 99.5 }, '2026-06'), false);
    // A month after the latest is not looked at: the quarter so far is what counts.
    assert.equal(isQuarterly({ ...quarters({ '2025Q4': 100, '2026Q1': 101 }), '2026-04': 102, '2026-05': 103 }, '2026-04'), true);
  });

  it('marks the join, so the answer can say the month carries its quarter’s figure', () => {
    // Flat years are flat quarters too: the made-up index reads as quarterly once its latest quarter is whole.
    const quarterly = monthlyJoin('TST', YEARS, flat(INDEX, { '2026-01': 177.1561, '2026-02': 177.1561, '2026-03': 177.1561 }));
    assert.deepEqual(quarterly, { month: '2026-03', factor: 1.1, source: 'bis', quarterly: true });
    // A real monthly index carries no mark at all.
    const monthly = monthlyJoin('TST', YEARS, { ...flat(INDEX, LATER), '2025-11': 161.0511 });
    assert.deepEqual(monthly, { month: '2026-03', factor: round(177.1561 / ((161.051 * 11 + 161.0511) / 12)), source: 'bis' });
    assert.equal('quarterly' in monthly, false);
  });
});

describe('a country with more than one monthly source', () => {
  const series = (source: MonthlySource, months: Record<string, number>, asOf = '2026-04-15') => ({ source, months, asOf });

  it('takes the first that joins, in the order given, and names it', () => {
    const both = [series('bis', flat(INDEX, LATER)), series('worldBank', flat(INDEX, { '2026-02': 161.051 }))];
    assert.deepEqual(bestJoin('TST', YEARS, both), { month: '2026-03', factor: 1.1, source: 'bis' });
    assert.deepEqual(bestJoin('TST', YEARS, [...both].reverse()), { month: '2026-02', factor: 1, source: 'worldBank' });
  });

  it('passes over a source that does not join for one that does', () => {
    assert.deepEqual(bestJoin('TST', YEARS, [series('bis', flat(INDEX)), series('worldBank', flat(INDEX, LATER))]), { month: '2026-03', factor: 1.1, source: 'worldBank' });
  });

  it('gives the first source’s reason when none joins, and nothing when there is no source', () => {
    assert.deepEqual(bestJoin('TST', YEARS, [series('bis', flat(INDEX)), series('worldBank', {})]), { withheld: 'no-later-month' });
    assert.deepEqual(bestJoin('TST', YEARS, [series('worldBank', {}), series('bis', flat(INDEX))]), { withheld: 'incomplete' });
    assert.equal(bestJoin('TST', YEARS, []), null);
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
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
  });

  it('is the latest of several, wherever it was written in the file', () => {
    const months = { '2026-04': 80.5255, ...flat(INDEX, LATER), '2026-02': 170 };
    // 80.5255 / 161.051 = 0.5: prices can be lower than the year's average.
    assert.deepEqual(monthlyJoin('TST', YEARS, months), { month: '2026-04', factor: 0.5, source: 'bis' });
  });

  it('keeps the step to six decimals', () => {
    // 161.051 x 1.0123456789 = 163.03928...; the step is 1.012346 to six places.
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, { '2026-01': 161.051 * 1.0123456789 })), { month: '2026-01', factor: 1.012346, source: 'bis', quarterly: true });
    // (The made-up index is flat through 2025, so with one month after it, it reads as published by quarter.)
  });

  it('links from the World Bank’s last year, whichever that is', () => {
    // No 2025 figure yet: the link is the 2024 average, and 2025's months only lie on the way.
    const { '2025': _none, ...to2024 } = YEARS;
    const join = monthlyJoin('TST', { ...to2024, '2020': 10, '2019': 10 }, flat({ 2019: 90.909090909, ...INDEX }, LATER));
    // 177.1561 / 146.41 = 1.21
    assert.deepEqual(join, { month: '2026-03', factor: 1.21, source: 'bis' });
  });
});

describe('a country that keeps its yearly answer', () => {
  it('when the index stops with the link year: no later month', () => {
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX)), { withheld: 'no-later-month' });
    // December of the link year is not later; January of the next is.
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(INDEX, { '2026-01': 161.051 })), { month: '2026-01', factor: 1, source: 'bis', quarterly: true });
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
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2025': 10.15 }, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
  });

  it('when they differ in any of the five years compared, and not for a year before those', () => {
    for (const year of ['2021', '2022', '2023', '2024']) {
      assert.deepEqual(monthlyJoin('TST', { ...YEARS, [year]: 11 }, flat(INDEX, LATER)), { withheld: 'mismatch' }, year);
    }
    // 2020 is the sixth year back: it is not compared (and the index has no 2019 to compare it with).
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2020': 50 }, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
    // Nor is it compared when the index does reach back that far.
    assert.deepEqual(monthlyJoin('TST', { ...YEARS, '2020': 50 }, flat({ 2019: 90, ...INDEX }, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
  });

  it('a year that only one of the two has is passed over, while three can still be compared', () => {
    // The World Bank has no 2023 and no 2022: 2025, 2024 and 2021 remain.
    const { '2023': _a, '2022': _b, ...three } = YEARS;
    assert.deepEqual(monthlyJoin('TST', three, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
    // And none of 2021 either: two is too few.
    const { '2021': _c, ...two } = three;
    assert.deepEqual(monthlyJoin('TST', two, flat(INDEX, LATER)), { withheld: 'incomplete' });
    // The index has no 2021 or 2022: 2025, 2024 and 2023 can be compared, 2022 and 2021 cannot.
    const { 2020: _d, 2021: _e, ...from2022 } = INDEX;
    assert.deepEqual(monthlyJoin('TST', YEARS, flat(from2022, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
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
      assert.deepEqual(monthlyJoin('OTH', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
    } finally {
      delete list.TST;
    }
    // A name every object has is not a country on the list.
    assert.deepEqual(monthlyJoin('toString', YEARS, flat(INDEX, LATER)), { month: '2026-03', factor: 1.1, source: 'bis' });
  });
});
