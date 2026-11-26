import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { noiseStep, roundRow, roundToStep } from './noiseRounding.ts';

describe('rounding simulated amounts to what the runs can tell apart (#530)', () => {
  it('the step is the power of ten at or below spread / sqrt(runs)', () => {
    // 1,613,000 / 100 = 16,130: to the nearest 10,000.
    assert.equal(noiseStep(547_000, 2_160_000, 10_000), 10_000);
    // The same spread from 100 runs is ten times rougher, from 100,000 about three times finer.
    assert.equal(noiseStep(547_000, 2_160_000, 100), 100_000);
    assert.equal(noiseStep(547_000, 2_160_000, 100_000), 1_000);
    // Exactly a power of ten stays there.
    assert.equal(noiseStep(0, 1_000_000, 10_000), 10_000);
    assert.equal(noiseStep(-1_007.67, 1_530.18, 10_000), 10);
    assert.ok(Math.abs(noiseStep(0, 20, 10_000) - 0.1) < 1e-12);
  });

  it('there is no step without a spread or without runs', () => {
    assert.equal(noiseStep(50_000, 50_000, 10_000), 0);
    assert.equal(noiseStep(0, Infinity, 10_000), 0);
    assert.equal(noiseStep(0, NaN, 10_000), 0);
    assert.equal(noiseStep(0, 100, 0), 0);
    assert.equal(roundToStep(1_058_721, 0), 1_058_721);
  });

  it('rounds to the nearest step, either side of zero', () => {
    assert.equal(roundToStep(1_058_721, 10_000), 1_060_000);
    assert.equal(roundToStep(1_054_999, 10_000), 1_050_000);
    assert.equal(roundToStep(106.09, 10), 110);
    assert.equal(roundToStep(-1_007.67, 10), -1_010);
    assert.equal(roundToStep(-3, 10), 0);
    assert.equal(roundToStep(5, 10), 10);
    assert.equal(roundToStep(-5, 10), -10);
    assert.ok(Object.is(roundToStep(-3, 10), 0), 'never minus zero');
    assert.equal(roundToStep(0.34, 0.1), 0.3);
    assert.equal(roundToStep(97.98, 0.1), 98);
  });

  it('a row is rounded with one step, so its figures stay comparable', () => {
    const row = roundRow({ p10: 547_312, p50: 1_058_721, p90: 2_160_044, straight: 1_203_456 }, 547_312, 2_160_044, 10_000);
    assert.deepEqual(row, { p10: 550_000, p50: 1_060_000, p90: 2_160_000, straight: 1_200_000 });
    // No spread (year 0, or a plan with no risk): nothing is rounded.
    assert.deepEqual(roundRow({ p10: 50_000, p50: 50_000, p90: 50_000 }, 50_000, 50_000, 10_000), { p10: 50_000, p50: 50_000, p90: 50_000 });
  });

  it('rounding never moves a figure by more than half a step, and keeps their order', () => {
    const step = noiseStep(1_000, 9_000_000, 1_000);
    let prev = -Infinity;
    for (let v = 1_000; v < 9_000_000; v += 77_777) {
      const r = roundToStep(v, step);
      assert.ok(Math.abs(r - v) <= step / 2 + 1e-9);
      assert.ok(r >= prev);
      prev = r;
    }
  });
});

describe('noiseStep and roundToStep at their edges', () => {
  it('a single run still has a step: the spread\'s own power of ten', () => {
    assert.equal(noiseStep(0, 50, 1), 10);
    assert.equal(noiseStep(0, 50, 0.5), 0, 'less than one run is none');
    assert.equal(noiseStep(0, 50, NaN), 0);
  });

  it('there is no step when both ends are the same, zero included', () => {
    assert.equal(noiseStep(0, 0, 100), 0);
    assert.equal(noiseStep(-7, -7, 1), 0);
  });

  it('the spread counts whichever end is the larger', () => {
    assert.equal(noiseStep(2_160_000, 547_000, 10_000), 10_000);
  });

  it('a value that is not a finite number is handed back as it is', () => {
    assert.equal(roundToStep(Infinity, 10), Infinity);
    assert.ok(Number.isNaN(roundToStep(NaN, 10)));
    assert.equal(roundToStep(12.3, -1), 12.3);
    assert.equal(roundToStep(12.3, NaN), 12.3);
  });

  it('a step of one or more that is not whole keeps its own decimals', () => {
    assert.equal(roundToStep(7, 2.5), 7.5);
    assert.equal(roundToStep(7.3, 1), 7);
  });

  it('cuts binary dust at the step\'s decimals, and at twelve decimals for a finer step', () => {
    assert.equal(roundToStep(0.1 + 0.2, 0.1), 0.3);
    assert.equal(roundToStep(0.12345678901234, 1e-14), 0.123456789012);
  });
});
