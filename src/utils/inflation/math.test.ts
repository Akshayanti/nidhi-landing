/**
 * Unit tests for src/utils/inflation/math.ts and the compact history in
 * src/utils/inflation/history.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_AMOUNT,
  MAX_RATE,
  MODES,
  answer,
  answerPath,
  bandRates,
  cumulativeFactor,
  geometricAverage,
  growthFactor,
  historyPath,
  keepingUp,
  missingYears,
  parseAmount,
  parsePercent,
  parseYears,
  realRate,
  recentAverage,
  round2,
  roundAbout,
  seriesYears,
  unbrokenStart,
  whatItBuys,
  whatItCosts,
  yearRuns,
  extremes,
  type Series,
} from './math.ts';
import { fromCompact, toCompact, toCompactSeries } from './history.ts';

const close = (actual: number, expected: number, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`);

describe('both directions at a typed rate', () => {
  it('discounts what an amount buys and grows what a price costs, compounded yearly', () => {
    close(whatItBuys(10_000, 3, 10), 10_000 / Math.pow(1.03, 10));
    close(whatItCosts(10_000, 3, 10), 10_000 * Math.pow(1.03, 10));
    close(whatItBuys(1_000, 3, 10), 744.0939, 1e-6);
    close(whatItCosts(1_000, 3, 10), 1343.9164, 1e-6);
  });

  it('is the inverse of itself: buying power and cost undo each other', () => {
    close(whatItBuys(whatItCosts(5_000, 7.5, 23), 7.5, 23), 5_000);
  });

  it('leaves the amount unchanged at 0%', () => {
    assert.equal(whatItBuys(1_000, 0, 30), 1_000);
    assert.equal(whatItCosts(1_000, 0, 30), 1_000);
    assert.equal(growthFactor(0, 100), 1);
  });

  it('stays finite at the largest rate and horizon the tool accepts', () => {
    const f = growthFactor(MAX_RATE, 100);
    assert.ok(Number.isFinite(f));
    close(f, Math.pow(101, 100));
    assert.ok(Number.isFinite(whatItCosts(1e12, MAX_RATE, 100)));
    assert.ok(whatItBuys(1_000, MAX_RATE, 1) < 10);
    close(whatItBuys(1_000, MAX_RATE, 1), 1_000 / 101);
  });

  it('draws the path from year 0 to the last year', () => {
    const path = answerPath('cost', 100, 10, 3);
    assert.equal(path.length, 4);
    close(path[0], 100);
    close(path[3], 133.1);
    close(answerPath('buy', 100, 10, 2)[2], 100 / 1.21);
  });
});

describe('keeping up: the exact real rate', () => {
  it('is (1 + g) / (1 + i) - 1, not g - i', () => {
    close(realRate(5, 3), (1.05 / 1.03 - 1) * 100);
    assert.ok(realRate(5, 3) < 2, 'the exact rate is below the subtraction shortcut');
    close(realRate(3, 3), 0);
    close(realRate(110, 100), 5);
  });

  it('is negative when inflation outruns the raise, and exact at hyperinflation', () => {
    close(realRate(2, 4), (1.02 / 1.04 - 1) * 100);
    close(realRate(0, MAX_RATE), (1 / 101 - 1) * 100);
    assert.ok(realRate(-10, 0) < 0);
  });

  it('compounds the real rate over the years', () => {
    close(keepingUp(10_000, 5, 3, 10), 10_000 * Math.pow(1.05 / 1.03, 10));
    close(keepingUp(10_000, 3, 3, 40), 10_000);
  });
});

describe('the band either side of a rate', () => {
  it('is one point lower and one point higher', () => {
    assert.deepEqual(bandRates(3), { lower: 2, higher: 4 });
    assert.deepEqual(bandRates(2.25), { lower: 1.25, higher: 3.25 });
  });

  it('floors the lower side at 0 and drops it when it would repeat the rate', () => {
    assert.deepEqual(bandRates(0.5), { lower: 0, higher: 1.5 });
    assert.deepEqual(bandRates(0), { lower: null, higher: 1 });
  });

  it('caps the higher side at the largest rate the box accepts', () => {
    assert.deepEqual(bandRates(9_999.5), { lower: 9_998.5, higher: MAX_RATE });
    assert.deepEqual(bandRates(MAX_RATE), { lower: 9_999, higher: null });
  });
});

describe('roundAbout', () => {
  it('keeps whole units below 100 and three significant figures above', () => {
    assert.equal(roundAbout(74.4), 74);
    assert.equal(roundAbout(744.09), 744);
    assert.equal(roundAbout(1343.92), 1340);
    assert.equal(roundAbout(13_439.16), 13_400);
    assert.equal(roundAbout(7_440_939), 7_440_000);
    assert.equal(roundAbout(99.6), 100);
    assert.equal(roundAbout(0.4), 0);
  });

  it('rounds negatives symmetrically and leaves infinities alone', () => {
    assert.equal(roundAbout(-1343.92), -1340);
    assert.equal(roundAbout(Infinity), Infinity);
  });
});

describe('typed values, by the page locale', () => {
  it('accepts 0 to 10,000 with up to two decimals', () => {
    assert.equal(parsePercent('3', 0, MAX_RATE), 3);
    assert.equal(parsePercent(' 3.25 ', 0, MAX_RATE), 3.25);
    assert.equal(parsePercent('0', 0, MAX_RATE), 0);
    assert.equal(parsePercent('10000', 0, MAX_RATE), 10_000);
    assert.equal(parsePercent('10,000', 0, MAX_RATE, 'en'), 10_000);
    assert.equal(parsePercent('10.000', 0, MAX_RATE, 'es'), 10_000);
    assert.equal(parsePercent('2,5', 0, MAX_RATE, 'es'), 2.5);
    assert.equal(parsePercent('2.5', 0, MAX_RATE, 'en-IN'), 2.5);
  });

  it('reads a half-typed number as the other tools do (#520)', () => {
    assert.equal(parsePercent('3.', 0, MAX_RATE), 3);
    assert.equal(parsePercent('.5', 0, MAX_RATE), 0.5);
    assert.equal(parsePercent(',5', 0, MAX_RATE, 'es'), 0.5);
    assert.equal(parsePercent('3,', 0, MAX_RATE, 'cs'), 3);
    assert.equal(parsePercent('-.5', -99.99, MAX_RATE), -0.5);
    assert.equal(parseAmount('.5'), 0.5);
    assert.equal(parseAmount('1,000.', 'en'), 1000);
    // The page's own decimal mark only: a point is grouping on a Spanish page.
    assert.equal(parsePercent('.5', 0, MAX_RATE, 'es'), null);
  });

  it('rejects more decimals, words, negatives where not allowed, and out-of-range rates', () => {
    for (const bad of ['', 'abc', '3.255', '10000.01', '10001', '-1', '1e3', '.', '1,000.5.5']) {
      assert.equal(parsePercent(bad, 0, MAX_RATE), null, bad);
    }
    assert.equal(parsePercent('10.000,01', 0, MAX_RATE, 'es'), null);
  });

  it('allows a negative raise down to -99.99', () => {
    assert.equal(parsePercent('-2.5', -99.99, MAX_RATE), -2.5);
    assert.equal(parsePercent('-2,5', -99.99, MAX_RATE, 'es'), -2.5);
    assert.equal(parsePercent('-100', -99.99, MAX_RATE), null);
    assert.equal(parsePercent('-0', -99.99, MAX_RATE), 0);
  });

  it('accepts whole years from 1 to 100 and amounts from 0 to a trillion', () => {
    assert.equal(parseYears('10'), 10);
    assert.equal(parseYears('0'), null);
    assert.equal(parseYears('101'), null);
    assert.equal(parseYears('2.5'), null);
    // Digits from a Devanagari, Arabic-Indic or Persian keyboard.
    assert.equal(parseYears('१०'), 10);
    assert.equal(parseYears(' ३० '), 30);
    assert.equal(parseYears('١٥'), 15);
    assert.equal(parseYears('۲۰'), 20);
    assert.equal(parseYears('१२३४'), null, 'past the most years');
    assert.equal(parseYears('२.५'), null, 'still whole years only');
    assert.equal(parseAmount('१५००००', 'en-IN'), 150_000);
    assert.equal(parseAmount('१,५०,०००', 'en-IN'), 150_000);
    assert.equal(parseAmount('1000.50'), 1000.5);
    assert.equal(parseAmount('10,000', 'en'), 10_000);
    assert.equal(parseAmount('10.000', 'es'), 10_000);
    assert.equal(parseAmount('10.000,50', 'es'), 10_000.5);
    assert.equal(parseAmount('10,00,000', 'en-IN'), 1_000_000);
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount('-5'), null);
    assert.equal(parseAmount('2e12'), null);
    assert.equal(parseAmount('2000000000000'), null);
  });
});

describe('past to today with a country\'s history', () => {
  const series: Series = { 2019: 2, 2020: 10, 2021: 5, 2022: -1 };

  it('multiplies every year after the starting year through the latest', () => {
    const { factor, toYear, missing } = cumulativeFactor(series, 2019);
    close(factor, 1.1 * 1.05 * 0.99);
    assert.equal(toYear, 2022);
    assert.deepEqual(missing, []);
    close(cumulativeFactor(series, 2022).factor, 1);
  });

  it('reports a gap in the span and leaves it out of the product', () => {
    const gappy: Series = { 2012: 25, 2013: 10, 2017: 20, 2018: 30 };
    const { factor, missing } = cumulativeFactor(gappy, 2012);
    close(factor, 1.1 * 1.2 * 1.3);
    assert.deepEqual(missing, [2014, 2015, 2016]);
    assert.deepEqual(missingYears(gappy), [2014, 2015, 2016]);
    assert.deepEqual(yearRuns(missingYears(gappy)), [[2014, 2016]]);
  });

  it('starts no earlier than the unbroken run that ends with the latest year', () => {
    assert.equal(unbrokenStart({ 2012: 25, 2013: 10, 2017: 20, 2018: 30 }), 2017);
    assert.equal(unbrokenStart(series), 2019);
    assert.equal(unbrokenStart({}), null);
  });

  it('draws the path year by year from the starting amount', () => {
    const path = historyPath(series, 2020, 100);
    assert.deepEqual(path.map((p) => p.year), [2020, 2021, 2022]);
    close(path[2].value, 100 * 1.05 * 0.99);
  });
});

describe('the history summary', () => {
  it('takes the geometric average, the steady rate with the same total effect', () => {
    close(geometricAverage([10, -10]), (Math.sqrt(1.1 * 0.9) - 1) * 100);
    close(geometricAverage([3, 3, 3]), 3);
    assert.ok(Number.isNaN(geometricAverage([])));
  });

  it('averages the ten most recent years with a figure and says how long a span they cover', () => {
    const s: Series = {};
    for (let y = 2000; y <= 2025; y++) if (y !== 2020) s[y] = 2;
    const avg = recentAverage(s);
    assert.ok(avg);
    close(avg.average, 2);
    assert.equal(avg.count, 10);
    assert.equal(avg.first, 2015);
    assert.equal(avg.last, 2025);
    assert.equal(avg.span, 11, 'the missing 2020 widens the span');
    assert.equal(recentAverage({ 2024: 4 })?.count, 1);
    assert.equal(recentAverage({}), null);
  });

  it('finds the highest and lowest year in a window', () => {
    assert.deepEqual(extremes({ 2020: 1, 2021: 7, 2022: -2 }, [2020, 2021, 2022]), {
      high: { year: 2021, rate: 7 },
      low: { year: 2022, rate: -2 },
    });
  });
});

describe('the compact history the page serves', () => {
  it('round-trips a series, gaps as nulls', () => {
    const years = { '2012': 25, '2013': 10, '2017': 20, '2018': 30 };
    const compact = toCompactSeries(years);
    assert.deepEqual(compact, [2012, [25, 10, null, null, null, 20, 30]]);
    assert.deepEqual(fromCompact(compact), { 2012: 25, 2013: 10, 2017: 20, 2018: 30 });
  });

  it('compacts the whole file and keeps its update date', () => {
    const out = toCompact({
      source: 's',
      license: 'CC BY 4.0',
      indicator: 'FP.CPI.TOTL.ZG',
      lastUpdated: '2026-10-08',
      fetchedAt: '2026-10-12',
      countries: { USA: { iso2: 'US', years: { '2025': 2.7 } }, IND: { iso2: 'IN', years: { '2024': 4.95, '2025': 2.1 } } },
    });
    assert.equal(out.updated, '2026-10-08');
    assert.deepEqual(Object.keys(out.countries), ['IND', 'USA']);
    assert.deepEqual(out.countries.IND, [2024, [4.95, 2.1]]);
  });

  it('reads a malformed entry as an empty series rather than throwing', () => {
    assert.deepEqual(fromCompact(null), {});
    assert.deepEqual(fromCompact([2020]), {});
    assert.deepEqual(fromCompact(['x', [1]]), {});
    assert.deepEqual(fromCompact(undefined), {});
  });
});

describe('the four questions', () => {
  it('are offered in the order of the tabs', () => {
    assert.deepEqual(MODES, ['buy', 'cost', 'past', 'keep']);
  });

  it('each has its own sum: 1,000 at 10% inflation over 2 years, with a 21% raise for keeping up', () => {
    close(answer('buy', 1000, 10, 2), 1000 / 1.21);
    close(answer('cost', 1000, 10, 2), 1210);
    close(answer('past', 1000, 10, 2), 1210);
    // (1.21 / 1.10)^2 = 1.1^2 = 1.21
    close(answer('keep', 1000, 10, 2, 21), 1210);
    // With no raise given, keeping up is the same as what it buys.
    close(answer('keep', 1000, 10, 2), 1000 / 1.21);
  });

  it('keeping up is drawn year by year at the real rate', () => {
    const path = answerPath('keep', 1000, 10, 2, 21);
    assert.equal(path.length, 3);
    close(path[0], 1000);
    close(path[1], 1100);
    close(path[2], 1210);
  });
});

describe('a rate kept to two decimals', () => {
  it('rounds to the nearest hundredth', () => {
    assert.equal(round2(3.14159), 3.14);
    assert.equal(round2(2.345), 2.35);
    assert.equal(round2(-2.5049), -2.5);
  });

  it('never gives a negative zero, which would be shown as "-0"', () => {
    assert.ok(Object.is(round2(-0.001), 0));
    assert.ok(Object.is(round2(-0), 0));
    assert.ok(Object.is(round2(0), 0));
  });
});

describe('the edges of what a box accepts', () => {
  it('a rate that cannot be negative refuses a minus sign, even before a zero', () => {
    assert.equal(parsePercent('-0', 0, MAX_RATE), null);
    assert.equal(parsePercent('-0.00', 0, MAX_RATE), null);
  });

  it('a range that reaches below zero accepts its own lowest value', () => {
    assert.equal(parsePercent('-99.99', -99.99, MAX_RATE), -99.99);
    assert.equal(parsePercent('5', 5, 10), 5);
    assert.equal(parsePercent('10', 5, 10), 10);
    assert.equal(parsePercent('4.99', 5, 10), null);
    assert.equal(parsePercent('10.01', 5, 10), null);
    assert.equal(parsePercent('abc', 5, 10), null);
  });

  it('years: 1 and 100 are in, spaces around the number are ignored, four digits are out', () => {
    assert.equal(parseYears('1'), 1);
    assert.equal(parseYears('100'), 100);
    assert.equal(parseYears(' 10 '), 10);
    assert.equal(parseYears('1000'), null);
    assert.equal(parseYears('x10'), null);
    assert.equal(parseYears('10x'), null);
    assert.equal(parseYears(''), null);
  });

  it('an amount of exactly a trillion is in, and 0 is an amount', () => {
    assert.equal(parseAmount('1000000000000'), MAX_AMOUNT);
    assert.equal(parseAmount('1000000000000.01'), null);
    assert.equal(parseAmount('0'), 0);
    assert.equal(parseAmount('abc'), null);
  });
});

describe('a history with nothing in it, or with a gap', () => {
  it('an empty history has no years, no gaps and no rise', () => {
    assert.deepEqual(seriesYears({}), []);
    assert.deepEqual(missingYears({}), []);
    assert.deepEqual(cumulativeFactor({}, 2000), { factor: 1, toYear: null, missing: [] });
    assert.deepEqual(historyPath({}, 2000, 100), []);
    assert.deepEqual(historyPath({}, -5, 100), []);
  });

  it('years come oldest first, by number, however the keys were written', () => {
    assert.deepEqual(seriesYears({ 2021: 1, 1999: 2, 2005: 3 }), [1999, 2005, 2021]);
    // Keys that are not plain whole numbers keep the order they were written in, so they need sorting.
    assert.deepEqual(seriesYears({ [-1]: 1, [-3]: 2, [-2]: 3 }), [-3, -2, -1]);
    assert.deepEqual(seriesYears({ [-3]: 1, 2: 2, [-1]: 3 }), [-3, -1, 2]);
  });

  it('a history with no gap has no missing years', () => {
    assert.deepEqual(missingYears({ 2019: 2, 2020: 10, 2021: 5 }), []);
    assert.deepEqual(missingYears({ 2020: 10 }), []);
  });

  it('the path holds its value through a year with no figure', () => {
    // 100 in 2012, +10% in 2013, nothing for 2014 and 2015, +20% in 2016.
    const path = historyPath({ 2012: 25, 2013: 10, 2016: 20 }, 2012, 100);
    assert.deepEqual(path.map((p) => p.year), [2012, 2013, 2014, 2015, 2016]);
    close(path[1].value, 110);
    close(path[2].value, 110);
    close(path[3].value, 110);
    close(path[4].value, 132);
  });

  it('a single year averages to itself', () => {
    close(geometricAverage([7]), 7);
  });
});

describe('years grouped into runs', () => {
  it('sorts first, and starts a new run after every break', () => {
    assert.deepEqual(yearRuns([2020, 2014, 2016, 2015]), [[2014, 2016], [2020, 2020]]);
    assert.deepEqual(yearRuns([2001, 2003, 2005]), [[2001, 2001], [2003, 2003], [2005, 2005]]);
    assert.deepEqual(yearRuns([9, 10, 11, 100]), [[9, 11], [100, 100]]);
    assert.deepEqual(yearRuns([]), []);
  });

  it('leaves the list it was given as it was', () => {
    const years = [2020, 2014];
    yearRuns(years);
    assert.deepEqual(years, [2020, 2014]);
  });
});

describe('the highest and the lowest year', () => {
  const series: Series = { 2019: -3, 2020: 5, 2021: 5, 2022: 1, 2023: -3, 2024: 2 };

  it('the earliest year wins a tie, high or low', () => {
    assert.deepEqual(extremes(series, [2019, 2020, 2021, 2022, 2023, 2024]), {
      high: { year: 2020, rate: 5 },
      low: { year: 2019, rate: -3 },
    });
  });

  it('looks only at the years asked for, and only at those with a figure', () => {
    assert.deepEqual(extremes(series, [2022, 2024]), { high: { year: 2024, rate: 2 }, low: { year: 2022, rate: 1 } });
    assert.deepEqual(extremes(series, [2018, 2022, 2030]), { high: { year: 2022, rate: 1 }, low: { year: 2022, rate: 1 } });
  });

  it('is nothing when no year asked for has a figure', () => {
    assert.equal(extremes(series, [2018, 2030]), null);
    assert.equal(extremes(series, []), null);
  });
});
