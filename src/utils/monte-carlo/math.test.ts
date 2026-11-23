/**
 * Unit tests for src/utils/monte-carlo/math.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BONDS,
  QUOTED_RATES,
  STOCKS,
  averageRates,
  compoundRates,
  impliedGeometricMean,
  lognormalParams,
  mulberry32,
  returnModel,
  sanitizeInputs,
  simulate,
  type SimulationInputs,
} from './math.ts';

const SAVE_ONLY: SimulationInputs = {
  start: 50_000,
  monthly: 1_000,
  saveYears: 30,
  stockPct: 100,
  withdrawal: 0,
  withdrawYears: 0,
  feePct: 0,
  returns: 'historical',
  paths: 2_000,
};

const DRAWDOWN: SimulationInputs = { ...SAVE_ONLY, monthly: 0, saveYears: 0, stockPct: 60 };

describe('return model', () => {
  it('lognormal fit reproduces the published arithmetic mean and sd', () => {
    // E[X] and SD[X] of a lognormal gross return, from its log-space parameters.
    for (const { mean, sd } of [STOCKS, BONDS]) {
      const { mu, sigma } = lognormalParams(mean, sd);
      const m = Math.exp(mu + (sigma * sigma) / 2);
      const v = (Math.exp(sigma * sigma) - 1) * Math.exp(2 * mu + sigma * sigma);
      assert.ok(Math.abs(m - (1 + mean)) < 1e-12);
      assert.ok(Math.abs(Math.sqrt(v) - sd) < 1e-12);
    }
  });

  it('implied geometric means stay close to the published rates the page quotes', () => {
    assert.ok(Math.abs(impliedGeometricMean(STOCKS.mean, STOCKS.sd) - QUOTED_RATES.historical.stocks) < 0.002);
    assert.ok(Math.abs(impliedGeometricMean(BONDS.mean, BONDS.sd) - QUOTED_RATES.historical.bonds) < 0.002);
  });

  it('the cautious and optimistic descriptions quote the rates the model runs at', () => {
    for (const s of ['cautious', 'optimistic'] as const) {
      assert.ok(Math.abs(compoundRates(s).stocks - QUOTED_RATES[s].stocks) < 1e-9);
      assert.ok(Math.abs(compoundRates(s).bonds - QUOTED_RATES[s].bonds) < 1e-9);
    }
  });

  it('cautious and optimistic hit the ends of the 4 to 6% and 1 to 3% ranges', () => {
    const c = compoundRates('cautious');
    const o = compoundRates('optimistic');
    assert.ok(Math.abs(c.stocks - 0.04) < 1e-12 && Math.abs(c.bonds - 0.01) < 1e-12);
    assert.ok(Math.abs(o.stocks - 0.06) < 1e-12 && Math.abs(o.bonds - 0.03) < 1e-12);
  });

  it('every setting keeps the historical ups and downs', () => {
    const h = returnModel('historical');
    for (const setting of ['cautious', 'optimistic'] as const) {
      const m = returnModel(setting);
      assert.equal(m.stocks.sigma, h.stocks.sigma);
      assert.equal(m.bonds.sigma, h.bonds.sigma);
    }
  });

  it('seeded generator is deterministic and in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      assert.equal(x, b());
      assert.ok(x >= 0 && x < 1);
    }
  });
});

describe('simulate', () => {
  it('gives identical results for identical inputs', () => {
    assert.deepEqual(simulate(SAVE_ONLY).atRetirement, simulate(SAVE_ONLY).atRetirement);
  });

  it('pins the default plan, so a refactor cannot silently change results', () => {
    const r = simulate({ ...SAVE_ONLY, stockPct: 80, paths: 10_000 });
    assert.equal(Math.round(r.atRetirement.p10), 547_008);
    assert.equal(Math.round(r.atRetirement.p50), 1_058_721);
    assert.equal(Math.round(r.atRetirement.p90), 2_163_515);
  });

  it('switching on withdrawals leaves the saving phase unchanged', () => {
    const both = simulate({ ...SAVE_ONLY, withdrawal: 30_000, withdrawYears: 25 });
    assert.deepEqual(both.atRetirement, simulate(SAVE_ONLY).atRetirement);
  });

  it('a path does not depend on how many paths run', () => {
    // The first 100 paths are the same whatever the total, so 100 runs is a
    // subset of 1,000: its median must fall within the larger run's spread.
    const small = simulate({ ...SAVE_ONLY, paths: 100 }).atRetirement;
    const large = simulate({ ...SAVE_ONLY, paths: 1_000 }).atRetirement;
    assert.ok(small.p50 > large.p10 && small.p50 < large.p90);
  });

  it('orders percentiles and starts every band at the starting amount', () => {
    const r = simulate(SAVE_ONLY);
    assert.equal(r.bands.length, 31);
    assert.equal(r.bands[0].p10, 50_000);
    assert.equal(r.bands[0].p90, 50_000);
    for (const band of r.bands) {
      assert.ok(band.p10 <= band.p25 && band.p25 <= band.p50 && band.p50 <= band.p75 && band.p75 <= band.p90);
    }
  });

  it('with no volatility the straight line matches monthly compounding by hand', () => {
    const r = simulate({ ...SAVE_ONLY, saveYears: 1, paths: 10 });
    const g = STOCKS.mean;
    const monthly = Math.pow(1 + g, 1 / 12);
    let b = 50_000;
    for (let m = 0; m < 12; m++) b = (b + 1_000) * monthly;
    assert.ok(Math.abs(r.straightLine[1] - b) < 1e-6);
  });

  it('takes the yearly fee off the growth factor', () => {
    const r = simulate({ ...SAVE_ONLY, monthly: 0, saveYears: 1, feePct: 1, paths: 10 });
    const g = STOCKS.mean;
    assert.ok(Math.abs(r.straightLine[1] - 50_000 * (1 + g) * 0.99) < 1e-6);
  });

  it('a fee lowers every percentile, and a higher fee lowers it more', () => {
    const none = simulate(SAVE_ONLY).atRetirement;
    const one = simulate({ ...SAVE_ONLY, feePct: 1 }).atRetirement;
    const two = simulate({ ...SAVE_ONLY, feePct: 2 }).atRetirement;
    for (const k of ['p10', 'p50', 'p90'] as const) assert.ok(two[k] < one[k] && one[k] < none[k]);
  });

  it('orders the settings: cautious below historical below optimistic', () => {
    const c = simulate({ ...SAVE_ONLY, returns: 'cautious' }).atRetirement.p50;
    const h = simulate({ ...SAVE_ONLY, returns: 'historical' }).atRetirement.p50;
    const o = simulate({ ...SAVE_ONLY, returns: 'optimistic' }).atRetirement.p50;
    assert.ok(c < h && h < o);
  });

  it('draws the straight line at the average return, above the median of an all-stock plan', () => {
    // A volatile path compounds at the geometric mean in the median case,
    // which is below the average return the line uses: the median ends
    // under the line, and more than half the paths with it.
    const r = simulate({ ...SAVE_ONLY, paths: 10_000 });
    const ratio = r.atRetirement.p50 / r.straightLine[30];
    assert.ok(ratio > 0.6 && ratio < 0.9, `median/line ratio ${ratio}`);
    assert.ok(r.belowStraightLine > 0.55 && r.belowStraightLine < 0.75, `share below ${r.belowStraightLine}`);
    // The line is above the one a compound-rate calculator would draw.
    const g = impliedGeometricMean(STOCKS.mean, STOCKS.sd);
    assert.ok(STOCKS.mean > g);
    assert.ok(Math.abs(averageRates('historical').stocks - STOCKS.mean) < 1e-9);
  });

  it('a 100% bond plan has a much narrower spread than a 100% stock plan', () => {
    const stocks = simulate(SAVE_ONLY).atRetirement;
    const bonds = simulate({ ...SAVE_ONLY, stockPct: 0 }).atRetirement;
    assert.ok(bonds.p90 / bonds.p10 < stocks.p90 / stocks.p10);
  });

  it('reports no withdrawal result when there is no withdrawal', () => {
    const r = simulate({ ...SAVE_ONLY, paths: 500 });
    assert.equal(r.lasted, null);
    assert.equal(r.medianRunOutYear, null);
  });

  it('a withdrawal larger than the pot runs out in year one on every path', () => {
    const r = simulate({ ...DRAWDOWN, start: 10_000, withdrawal: 50_000, withdrawYears: 10, paths: 500 });
    assert.equal(r.lasted, 0);
    assert.equal(r.medianRunOutYear, 1);
    assert.equal(r.bands[10].p90, 0);
  });

  it('a tiny withdrawal from a large pot lasts on every path', () => {
    const r = simulate({ ...DRAWDOWN, start: 1_000_000, withdrawal: 1_000, withdrawYears: 30, paths: 500 });
    assert.equal(r.lasted, 1);
    assert.equal(r.medianRunOutYear, null);
  });

  it('a higher withdrawal never lasts more often than a lower one', () => {
    const base = { ...DRAWDOWN, start: 1_000_000, withdrawYears: 30 };
    const low = simulate({ ...base, withdrawal: 35_000 }).lasted ?? 0;
    const high = simulate({ ...base, withdrawal: 55_000 }).lasted ?? 0;
    assert.ok(high <= low);
  });

  it('withdrawals from nothing are never counted as paid', () => {
    const empty = simulate({ ...DRAWDOWN, start: 0, monthly: 0, saveYears: 0, withdrawal: 12_000, withdrawYears: 30, paths: 200 });
    assert.equal(empty.lasted, 0);
    assert.equal(empty.medianRunOutYear, 1);
    const afterSaving = simulate({ ...DRAWDOWN, start: 0, monthly: 0, saveYears: 10, withdrawal: 12_000, withdrawYears: 30, paths: 200 });
    assert.equal(afterSaving.lasted, 0);
    assert.equal(afterSaving.medianRunOutYear, 1);
  });

  it('a pot that pays its last withdrawal exactly still counts as lasting', () => {
    // One year of small withdrawals from a large pot: every path pays them all.
    const r = simulate({ ...DRAWDOWN, start: 1_000_000, monthly: 0, saveYears: 0, withdrawal: 1_000, withdrawYears: 1, paths: 200 });
    assert.equal(r.lasted, 1);
  });

  it('a zero start with no contributions stays at zero without counting as running out', () => {
    const r = simulate({ ...SAVE_ONLY, start: 0, monthly: 0, saveYears: 5, paths: 50 });
    assert.equal(r.atRetirement.p90, 0);
    assert.equal(r.lasted, null);
  });
});

describe('sanitizeInputs', () => {
  it('clamps out-of-range and non-finite values', () => {
    const s = sanitizeInputs({
      start: -5,
      monthly: NaN,
      saveYears: 500,
      stockPct: 140,
      withdrawal: 10,
      withdrawYears: 0,
      feePct: 30,
      returns: 'wild' as never,
      paths: 5_000_000,
    });
    assert.deepEqual(s, {
      start: 0,
      monthly: 0,
      saveYears: 60,
      stockPct: 100,
      withdrawal: 10,
      withdrawYears: 1,
      feePct: 5,
      returns: 'historical',
      paths: 100_000,
    });
  });

  it('drops withdrawal years when there is no withdrawal', () => {
    assert.equal(sanitizeInputs({ ...SAVE_ONLY, withdrawYears: 25 }).withdrawYears, 0);
  });
});

describe('amounts a link can ask for are capped (#354)', () => {
  const base = { start: 10_000, monthly: 500, saveYears: 30, stockPct: 60, withdrawal: 0, withdrawYears: 0, feePct: 0, returns: 'historical' as const, paths: 100 };

  it('caps the starting amount, the monthly amount and the withdrawal', async () => {
    const m = await import('./math.ts');
    const clean = m.sanitizeInputs({ ...base, start: 1e308, monthly: 1e308, withdrawal: 1e308, withdrawYears: 30 });
    assert.equal(clean.start, m.MAX_START);
    assert.equal(clean.monthly, m.MAX_MONTHLY);
    assert.equal(clean.withdrawal, m.MAX_WITHDRAWAL);
    // Just under the caps is left alone.
    assert.equal(m.sanitizeInputs({ ...base, start: 999_999_999_999 }).start, 999_999_999_999);
  });

  it('the largest plan there can be still gives finite numbers, on every setting', async () => {
    const m = await import('./math.ts');
    for (const returns of m.RETURN_SETTINGS) {
      const r = m.simulate({ ...base, start: 1e308, monthly: 1e308, saveYears: 60, stockPct: 100, withdrawal: 1e308, withdrawYears: 60, returns, paths: 100 });
      const bad: string[] = [];
      const walk = (v: unknown, path: string) => {
        if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(path); } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      };
      walk(r, returns);
      assert.deepEqual(bad.slice(0, 5), []);
    }
  });
});

describe('the result as the page words it (#530)', () => {
  it('rounds every amount with its own year, and leaves shares and counts alone', async () => {
    const m = await import('./math.ts');
    const { noiseStep } = await import('../shared/noiseRounding.ts');
    const exact = m.simulate({ start: 50_000, monthly: 1_000, saveYears: 30, stockPct: 60, withdrawal: 0, withdrawYears: 0, feePct: 0, returns: 'historical', paths: 10_000 });
    const worded = m.roundedResult(exact);
    // Year 0 has no spread: the starting amount is shown as typed.
    assert.deepEqual(worded.bands[0], exact.bands[0]);
    assert.equal(worded.straightLine[0], 50_000);
    for (const y of [1, 10, 30]) {
      const step = noiseStep(exact.bands[y].p10, exact.bands[y].p90, exact.paths);
      assert.ok(step >= 1, `year ${y}`);
      for (const k of ['p10', 'p25', 'p50', 'p75', 'p90'] as const) {
        assert.ok(Math.abs(worded.bands[y][k] - exact.bands[y][k]) <= step / 2 + 1e-6);
        assert.ok(Math.abs(worded.bands[y][k] / step - Math.round(worded.bands[y][k] / step)) < 1e-6, `${k} is a whole number of steps`);
      }
      // The single line is rounded with the same step as the year it sits in.
      assert.ok(Math.abs(worded.straightLine[y] / step - Math.round(worded.straightLine[y] / step)) < 1e-6);
      assert.ok(worded.bands[y].p10 <= worded.bands[y].p25 && worded.bands[y].p25 <= worded.bands[y].p50 && worded.bands[y].p50 <= worded.bands[y].p75 && worded.bands[y].p75 <= worded.bands[y].p90);
    }
    assert.deepEqual(worded.atRetirement, worded.bands[30]);
    assert.equal(worded.belowStraightLine, exact.belowStraightLine);
    assert.equal(worded.paths, exact.paths);
    assert.equal(worded.years, exact.years);
    // The page's own default: 10,000 runs resolve the result to the nearest 10,000.
    assert.equal(noiseStep(exact.atRetirement.p10, exact.atRetirement.p90, 10_000), 10_000);
    assert.equal(worded.atRetirement.p50 % 10_000, 0);
    // The exact result is not touched.
    assert.notEqual(exact.atRetirement.p50 % 10_000, 0);
  });

  it('fewer runs round more coarsely, more runs more finely', async () => {
    const m = await import('./math.ts');
    const plan = { start: 50_000, monthly: 1_000, saveYears: 30, stockPct: 60, withdrawal: 0, withdrawYears: 0, feePct: 0, returns: 'historical' as const };
    const few = m.roundedResult(m.simulate({ ...plan, paths: 100 })).atRetirement.p50;
    const many = m.roundedResult(m.simulate({ ...plan, paths: 100_000 })).atRetirement.p50;
    assert.equal(few % 100_000, 0);
    assert.equal(many % 1_000, 0);
    assert.notEqual(many % 100_000, 0);
  });
});

describe('the generator and the single line, in detail', () => {
  it('the seeded generator gives the same numbers it always has', () => {
    const next = mulberry32(7);
    assert.deepEqual([next(), next(), next()], [0.011704753153026104, 0.06195825757458806, 0.97690763277933]);
  });

  it('a mixed plan grows the line at the blend of stock and bond averages, after the fee', () => {
    const r = simulate({ ...SAVE_ONLY, monthly: 0, saveYears: 1, stockPct: 60, feePct: 0.5, paths: 10 });
    const g = averageRates('historical');
    const expected = 50_000 * (1 + 0.6 * g.stocks + 0.4 * g.bonds) * 0.995;
    assert.ok(Math.abs(r.straightLine[1] - expected) < 1e-6, `${r.straightLine[1]} against ${expected}`);
  });

  it('the line pays the withdrawals month by month once saving ends', () => {
    const plan = { ...SAVE_ONLY, start: 100_000, monthly: 500, saveYears: 1, stockPct: 60, withdrawal: 12_000, withdrawYears: 2, paths: 10 };
    const r = simulate(plan);
    const g = averageRates('historical');
    const monthly = Math.pow(1 + 0.6 * g.stocks + 0.4 * g.bonds, 1 / 12);
    let b = 100_000;
    const line = [b];
    for (let y = 1; y <= 3; y++) {
      for (let m = 0; m < 12; m++) b = (b + (y <= 1 ? 500 : -1_000)) * monthly;
      line.push(b);
    }
    assert.equal(r.straightLine.length, 4);
    line.forEach((v, y) => assert.ok(Math.abs(r.straightLine[y] - v) < 1e-6, `year ${y}: ${r.straightLine[y]} against ${v}`));
  });

  it('a line that runs out stays at zero for every year left', () => {
    const r = simulate({ ...DRAWDOWN, start: 5_000, withdrawal: 12_000, withdrawYears: 3, paths: 10 });
    assert.deepEqual(r.straightLine, [5_000, 0, 0, 0]);
  });
});

describe('running out, in detail', () => {
  it('counts the year money runs out from the start of withdrawals, not of saving', () => {
    const r = simulate({ ...SAVE_ONLY, start: 10_000, monthly: 0, saveYears: 5, withdrawal: 50_000, withdrawYears: 10, paths: 100 });
    assert.equal(r.lasted, 0);
    assert.equal(r.medianRunOutYear, 1);
  });

  it('a plan with nothing in it has run out, even when its withdrawal is too small to register', () => {
    // 5e-324 a year is zero a month: no month can fail to pay it, so only
    // the empty pot at the start of the year says the plan has nothing to pay from.
    const r = simulate({ ...DRAWDOWN, start: 0, withdrawal: Number.MIN_VALUE, withdrawYears: 3, paths: 20 });
    assert.equal(r.lasted, 0);
    assert.equal(r.medianRunOutYear, 1);
  });

  it('pins the median year money runs out, so a refactor cannot change it silently', () => {
    const r = simulate({ ...DRAWDOWN, start: 300_000, stockPct: 100, withdrawal: 30_000, withdrawYears: 30, paths: 101 });
    assert.equal(r.lasted, 1 - 91 / 101);
    assert.equal(r.medianRunOutYear, 14);
  });

  it('a plan that ends saving with nothing has no path below the line, which is at nothing too', () => {
    const r = simulate({ ...SAVE_ONLY, start: 0, monthly: 0, saveYears: 3, paths: 50 });
    assert.equal(r.straightLine[3], 0);
    assert.equal(r.belowStraightLine, 0);
  });

  it('a single path is its own every percentile, and runs out once, in its first year short', () => {
    const r = simulate({ ...DRAWDOWN, start: 100_000, withdrawal: 40_000, withdrawYears: 10, paths: 1 });
    for (const b of r.bands) assert.ok(b.p10 === b.p50 && b.p50 === b.p90 && b.p25 === b.p75 && b.p25 === b.p50);
    const first = r.bands.findIndex((b) => b.p50 === 0);
    assert.ok(first > 0 && first < 10, `ran out in year ${first}`);
    assert.equal(r.lasted, 0);
    assert.equal(r.medianRunOutYear, first, 'the year it first ran short, not a later one');
  });

  it('no years of saving: no path is below the line, whatever the plan', () => {
    for (const plan of [
      { ...DRAWDOWN, start: 500_000, withdrawal: 30_000, withdrawYears: 30, paths: 100 },
      { ...DRAWDOWN, start: 0, withdrawal: 1_000, withdrawYears: 5, paths: 10 },
      { ...SAVE_ONLY, saveYears: 0, withdrawal: 0, withdrawYears: 0, paths: 100 },
      { ...SAVE_ONLY, saveYears: 0, withdrawal: 0, withdrawYears: 0, start: 0, paths: 1 },
    ]) {
      const r = simulate(plan);
      assert.equal(r.straightLine[0], plan.start, 'the line starts where every path does');
      assert.equal(r.belowStraightLine, 0);
    }
  });
});
