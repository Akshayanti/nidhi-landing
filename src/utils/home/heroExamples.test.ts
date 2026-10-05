/**
 * Unit tests for src/utils/home/heroExamples.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fiProjection, monthlyPath, netWorthPath, whatIf, yearlyPath } from './heroExamples.ts';

describe('growth helpers', () => {
  it('a year of 5% growth on a lump sum with no saving is exactly 5%', () => {
    assert.ok(Math.abs(monthlyPath(100_000, 0, 12)[12] - 105_000) < 1e-6);
  });

  it('yearly path picks every twelfth month', () => {
    const y = yearlyPath(1_000, 100, 3);
    assert.equal(y.length, 4);
    assert.ok(Math.abs(y[1] - monthlyPath(1_000, 100, 12)[12]) < 1e-9);
  });
});

describe('hero examples', () => {
  it('net worth path has 25 monthly points with today in the middle', () => {
    const p = netWorthPath();
    assert.equal(p.values.length, 25);
    assert.equal(p.today, p.values[12]);
    assert.ok(p.values[24] > p.today && p.today > p.values[0]);
  });

  it('the FI year is the first year at or above the target', () => {
    const p = fiProjection();
    assert.ok(p.fiYear !== null);
    assert.ok(p.values[p.fiYear!] >= p.target);
    assert.ok(p.values[p.fiYear! - 1] < p.target);
    assert.equal(Math.round(p.target), Math.round((4_000 - 1_520) * 12 * 25));
  });

  it('saving five points more ends higher by the compounded extra saving', () => {
    const w = whatIf();
    assert.equal(Math.round(w.extraPerMonth), 200);
    const extraOnly = yearlyPath(0, 200, 20)[20];
    assert.ok(Math.abs(w.difference - extraOnly) < 1e-6);
  });
});
