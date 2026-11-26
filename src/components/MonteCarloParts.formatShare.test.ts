/**
 * The Monte Carlo simulator's shares of paths (#790): `formatShare` writes a
 * share as a whole percentage, and never rounds "nearly all" up to 100% or
 * "hardly any" down to 0%.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatShare } from './MonteCarloSimulator.tsx';

/** A page's own style puts a no-break space before the sign; the tests read it as a plain one. */
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('a share of the paths, as a percentage', () => {
  it('is a whole percentage in the middle of the range', () => {
    assert.equal(formatShare(0.5, null), '50%');
    assert.equal(formatShare(0.555, null), '56%');
    assert.equal(formatShare(0.006, null), '1%');
    assert.equal(formatShare(0.994, null), '99%');
  });

  it('says 100% and 0% only for every path and no path', () => {
    assert.equal(formatShare(1, null), '100%');
    assert.equal(formatShare(0, null), '0%');
  });

  it('keeps one decimal where a whole percentage would claim every path or none', () => {
    assert.equal(formatShare(0.9954, null), '99.5%');
    assert.equal(formatShare(0.996, null), '99.6%');
    assert.equal(formatShare(0.004, null), '0.4%');
  });

  it('never rounds that decimal up to 100% or down to 0%', () => {
    assert.equal(formatShare(0.99999, null), '99.9%');
    assert.equal(formatShare(0.00001, null), '0.1%');
  });

  it('follows a page’s own number style, by the same rules', () => {
    assert.equal(plain(formatShare(0.5, 'es')), '50 %');
    assert.equal(plain(formatShare(0.555, 'es')), '56 %');
    assert.equal(plain(formatShare(1, 'es')), '100 %');
    assert.equal(plain(formatShare(0, 'es')), '0 %');
    assert.equal(plain(formatShare(0.9954, 'es')), '99,5 %');
    assert.equal(plain(formatShare(0.99999, 'es')), '99,9 %');
    assert.equal(plain(formatShare(0.00001, 'es')), '0,1 %');
    assert.equal(formatShare(0.9954, 'en'), '99.5%');
  });
});
