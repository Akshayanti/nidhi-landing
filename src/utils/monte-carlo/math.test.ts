/**
 * Unit tests for src/utils/monte-carlo/math.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BONDS,
  STOCKS,
  impliedGeometricMean,
  lognormalParams,
  mulberry32,
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
};

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

  it('implied geometric means stay close to the published 5.3% and 1.7%', () => {
    assert.ok(Math.abs(impliedGeometricMean(STOCKS.mean, STOCKS.sd) - 0.053) < 0.002);
    assert.ok(Math.abs(impliedGeometricMean(BONDS.mean, BONDS.sd) - 0.017) < 0.002);
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
    const a = simulate(SAVE_ONLY, { paths: 2_000 });
    const b = simulate(SAVE_ONLY, { paths: 2_000 });
    assert.deepEqual(a.atRetirement, b.atRetirement);
  });

  it('switching on withdrawals leaves the saving phase unchanged', () => {
    const save = simulate(SAVE_ONLY, { paths: 2_000 });
    const both = simulate({ ...SAVE_ONLY, withdrawal: 30_000, withdrawYears: 25 }, { paths: 2_000 });
    assert.deepEqual(both.atRetirement, save.atRetirement);
  });

  it('orders percentiles and starts every band at the starting amount', () => {
    const r = simulate(SAVE_ONLY, { paths: 2_000 });
    assert.equal(r.bands.length, 31);
    assert.equal(r.bands[0].p10, 50_000);
    assert.equal(r.bands[0].p90, 50_000);
    for (const band of r.bands) {
      assert.ok(band.p10 <= band.p25 && band.p25 <= band.p50 && band.p50 <= band.p75 && band.p75 <= band.p90);
    }
  });

  it('with no volatility the straight line matches monthly compounding by hand', () => {
    const r = simulate({ ...SAVE_ONLY, saveYears: 1 }, { paths: 10 });
    const g = impliedGeometricMean(STOCKS.mean, STOCKS.sd);
    const monthly = Math.pow(1 + g, 1 / 12);
    let b = 50_000;
    for (let m = 0; m < 12; m++) b = (b + 1_000) * monthly;
    assert.ok(Math.abs(r.straightLine[1] - b) < 1e-6);
  });

  it('puts the median near the straight line for an all-stock plan', () => {
    // A volatile path compounds at the geometric mean in the median case,
    // so the median should sit within a few percent of the straight line.
    const r = simulate(SAVE_ONLY);
    const ratio = r.atRetirement.p50 / r.straightLine[30];
    assert.ok(ratio > 0.95 && ratio < 1.1, `median/line ratio ${ratio}`);
  });

  it('a 100% bond plan has a much narrower spread than a 100% stock plan', () => {
    const stocks = simulate(SAVE_ONLY, { paths: 4_000 }).atRetirement;
    const bonds = simulate({ ...SAVE_ONLY, stockPct: 0 }, { paths: 4_000 }).atRetirement;
    assert.ok(bonds.p90 / bonds.p10 < stocks.p90 / stocks.p10);
  });

  it('reports no withdrawal result when there is no withdrawal', () => {
    const r = simulate(SAVE_ONLY, { paths: 500 });
    assert.equal(r.lasted, null);
    assert.equal(r.medianRunOutYear, null);
  });

  it('a withdrawal larger than the pot runs out in year one on every path', () => {
    const r = simulate({ start: 10_000, monthly: 0, saveYears: 0, stockPct: 60, withdrawal: 50_000, withdrawYears: 10 }, { paths: 500 });
    assert.equal(r.lasted, 0);
    assert.equal(r.medianRunOutYear, 1);
    assert.equal(r.bands[10].p90, 0);
  });

  it('a tiny withdrawal from a large pot lasts on every path', () => {
    const r = simulate({ start: 1_000_000, monthly: 0, saveYears: 0, stockPct: 60, withdrawal: 1_000, withdrawYears: 30 }, { paths: 500 });
    assert.equal(r.lasted, 1);
    assert.equal(r.medianRunOutYear, null);
  });

  it('a higher withdrawal never lasts more often than a lower one', () => {
    const base = { start: 1_000_000, monthly: 0, saveYears: 0, stockPct: 60, withdrawYears: 30 };
    const low = simulate({ ...base, withdrawal: 35_000 }, { paths: 3_000 }).lasted ?? 0;
    const high = simulate({ ...base, withdrawal: 55_000 }, { paths: 3_000 }).lasted ?? 0;
    assert.ok(high <= low);
  });

  it('a zero start with no contributions stays at zero without counting as running out', () => {
    const r = simulate({ start: 0, monthly: 0, saveYears: 5, stockPct: 100, withdrawal: 0, withdrawYears: 0 }, { paths: 50 });
    assert.equal(r.atRetirement.p90, 0);
    assert.equal(r.lasted, null);
  });
});

describe('sanitizeInputs', () => {
  it('clamps out-of-range and non-finite values', () => {
    const s = sanitizeInputs({ start: -5, monthly: NaN, saveYears: 500, stockPct: 140, withdrawal: 10, withdrawYears: 0 });
    assert.deepEqual(s, { start: 0, monthly: 0, saveYears: 60, stockPct: 100, withdrawal: 10, withdrawYears: 1 });
  });

  it('drops withdrawal years when there is no withdrawal', () => {
    assert.equal(sanitizeInputs({ ...SAVE_ONLY, withdrawYears: 25 }).withdrawYears, 0);
  });
});
