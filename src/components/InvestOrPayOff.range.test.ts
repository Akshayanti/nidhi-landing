/**
 * The ends of the invest or pay off range chart's scale (#881): room around
 * the figures, never a zero line that no bar reaches.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rangeScale } from './InvestOrPayOff.tsx';

const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} is not ${b}`);
/** Where zero sits along the track, as a share of it. */
const zeroAt = ({ lo, hi }: { lo: number; hi: number }) => (0 - lo) / (hi - lo);
/** Whether the chart draws its zero line, as RangeChart decides it. */
const zeroLine = ({ lo, hi }: { lo: number; hi: number }) => lo < 0 && hi > 0;

describe('the range chart scale', () => {
  it('stops at zero when every figure is positive', () => {
    // Once 10,000 to 100,000 put the low end at -3,500: a zero line at 3.2% of the track.
    const scale = rangeScale(10_000, 100_000);
    assert.equal(scale.lo, 0);
    near(scale.hi, 104_500, 'top');
    assert.equal(zeroLine(scale), false);
  });

  it('keeps its room below the lowest figure when that room stays above zero', () => {
    const scale = rangeScale(90_000, 100_000);
    near(scale.lo, 88_500, 'bottom');
    near(scale.hi, 100_500, 'top');
  });

  it('stops at zero when every figure is negative', () => {
    const scale = rangeScale(-100_000, -1_000);
    near(scale.lo, -114_850, 'bottom');
    assert.equal(scale.hi, 0);
    assert.equal(zeroLine(scale), false);
  });

  it('draws zero where the figures cross it, with room either side', () => {
    const scale = rangeScale(-20_000, 80_000);
    near(scale.lo, -25_000, 'bottom');
    near(scale.hi, 85_000, 'top');
    assert.equal(zeroLine(scale), true);
    near(zeroAt(scale), 25_000 / 110_000, 'zero');
  });

  it('has a width when every figure is zero', () => {
    const scale = rangeScale(0, 0);
    assert.ok(scale.hi > scale.lo);
    assert.equal(zeroLine(scale), false);
  });
});
