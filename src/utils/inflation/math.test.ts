/**
 * Unit tests for src/utils/inflation/math.ts and the compact history in
 * src/utils/inflation/history.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RATE,
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
  roundAbout,
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

describe('typed values', () => {
  it('accepts 0 to 10,000 with up to two decimals, comma or dot', () => {
    assert.equal(parsePercent('3', 0, MAX_RATE), 3);
    assert.equal(parsePercent(' 3.25 ', 0, MAX_RATE), 3.25);
    assert.equal(parsePercent('3,5', 0, MAX_RATE), 3.5);
    assert.equal(parsePercent('0', 0, MAX_RATE), 0);
    assert.equal(parsePercent('10000', 0, MAX_RATE), 10_000);
  });

  it('rejects more decimals, words, negatives where not allowed, and out-of-range rates', () => {
    for (const bad of ['', 'abc', '3.255', '10000.01', '10001', '-1', '1e3', '3.', '.5', '1,000.5']) {
      assert.equal(parsePercent(bad, 0, MAX_RATE), null, bad);
    }
  });

  it('allows a negative raise down to -99.99', () => {
    assert.equal(parsePercent('-2.5', -99.99, MAX_RATE), -2.5);
    assert.equal(parsePercent('-100', -99.99, MAX_RATE), null);
    assert.equal(parsePercent('-0', -99.99, MAX_RATE), 0);
  });

  it('accepts whole years from 1 to 100 and amounts from 0 to a trillion', () => {
    assert.equal(parseYears('10'), 10);
    assert.equal(parseYears('0'), null);
    assert.equal(parseYears('101'), null);
    assert.equal(parseYears('2.5'), null);
    assert.equal(parseAmount('1000.50'), 1000.5);
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount('-5'), null);
    assert.equal(parseAmount('2e12'), null);
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
  });
});
