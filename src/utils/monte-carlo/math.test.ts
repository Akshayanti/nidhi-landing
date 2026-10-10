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
    const g = impliedGeometricMean(STOCKS.mean, STOCKS.sd);
    const monthly = Math.pow(1 + g, 1 / 12);
    let b = 50_000;
    for (let m = 0; m < 12; m++) b = (b + 1_000) * monthly;
    assert.ok(Math.abs(r.straightLine[1] - b) < 1e-6);
  });

  it('takes the yearly fee off the growth factor', () => {
    const r = simulate({ ...SAVE_ONLY, monthly: 0, saveYears: 1, feePct: 1, paths: 10 });
    const g = impliedGeometricMean(STOCKS.mean, STOCKS.sd);
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

  it('puts the median near the straight line for an all-stock plan', () => {
    // A volatile path compounds at the geometric mean in the median case,
    // so the median should sit within a few percent of the straight line.
    const r = simulate({ ...SAVE_ONLY, paths: 10_000 });
    const ratio = r.atRetirement.p50 / r.straightLine[30];
    assert.ok(ratio > 0.95 && ratio < 1.1, `median/line ratio ${ratio}`);
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
