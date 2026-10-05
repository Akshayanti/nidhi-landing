/**
 * Unit tests for src/utils/monte-carlo/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULTS, decodeState, encodeState } from './url.ts';

describe('encodeState', () => {
  it('encodes the defaults as an empty string', () => {
    assert.equal(encodeState(DEFAULTS), '');
  });

  it('writes only the fields that differ from the defaults', () => {
    assert.equal(encodeState({ ...DEFAULTS, currency: 'CZK', start: 200_000 }), 'c=CZK&s=200000');
  });

  it('writes withdrawal years only when there is a withdrawal', () => {
    assert.equal(encodeState({ ...DEFAULTS, withdrawYears: 25 }), '');
    assert.equal(encodeState({ ...DEFAULTS, withdrawal: 30_000, withdrawYears: 25 }), 'w=30000&r=25');
    assert.equal(encodeState({ ...DEFAULTS, withdrawal: 30_000 }), 'w=30000');
  });
});

describe('decodeState', () => {
  it('returns null when the query has no tool state', () => {
    assert.equal(decodeState(''), null);
    assert.equal(decodeState('?utm_source=share'), null);
  });

  it('round-trips a full state', () => {
    const state = {
      currency: 'INR',
      start: 1_500_000,
      monthly: 25_000,
      saveYears: 20,
      stockPct: 60,
      withdrawal: 600_000,
      withdrawYears: 35,
      feePct: 0.75,
      returns: 'cautious' as const,
      paths: 100_000,
    };
    assert.deepEqual(decodeState(encodeState(state)), state);
  });

  it('fills missing fields with defaults', () => {
    assert.deepEqual(decodeState('?y=10'), { ...DEFAULTS, saveYears: 10 });
  });

  it('falls back on unknown currencies and bad numbers, and clamps ranges', () => {
    const s = decodeState('c=XYZ&s=abc&k=250&y=-3');
    assert.ok(s);
    assert.equal(s.currency, 'EUR');
    assert.equal(s.start, DEFAULTS.start);
    assert.equal(s.stockPct, 100);
    assert.equal(s.saveYears, 0);
  });

  it('encodes the return setting, fees and run count compactly', () => {
    assert.equal(encodeState({ ...DEFAULTS, returns: 'optimistic', feePct: 1, paths: 1_000 }), 'e=o&f=1&n=1000');
  });

  it('falls back on an unknown return setting and an unsupported run count', () => {
    const s = decodeState('e=x&n=5000000&f=40');
    assert.ok(s);
    assert.equal(s.returns, 'historical');
    assert.equal(s.paths, 100_000, 'a huge count is capped at the largest option');
    assert.equal(s.feePct, 5);
    assert.equal(decodeState('n=5000')?.paths, 10_000, 'a count the page does not offer falls back to the default');
  });

  it('reads a fragment as well as a query string', () => {
    assert.equal(decodeState('#y=12')?.saveYears, 12);
  });

  it('accepts a lower-case currency code', () => {
    assert.equal(decodeState('c=usd')?.currency, 'USD');
  });
});
