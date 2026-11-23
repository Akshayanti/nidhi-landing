/**
 * Unit tests for src/utils/monte-carlo/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULTS, decodeState, defaultState, encodeState, isPristineState, publishableState } from './url.ts';

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

describe('page starting currency and the language switch', () => {
  it('keeps EUR as the codec baseline: a link without c decodes as EUR', () => {
    assert.equal(DEFAULTS.currency, 'EUR');
    assert.equal(decodeState('s=1000')?.currency, 'EUR');
  });

  it('encodes c=INR for a plan in rupees', () => {
    assert.equal(encodeState(defaultState('INR')), 'c=INR');
    assert.equal(decodeState(encodeState(defaultState('INR')))?.currency, 'INR');
  });

  it('treats the untouched plan in the page currency as pristine', () => {
    assert.equal(isPristineState(defaultState('EUR'), 'EUR'), true);
    assert.equal(isPristineState(defaultState('INR'), 'INR'), true);
  });

  it('treats any change, or a currency other than the page one, as not pristine', () => {
    assert.equal(isPristineState(defaultState('EUR'), 'INR'), false);
    assert.equal(isPristineState(defaultState('INR'), 'EUR'), false);
    assert.equal(isPristineState({ ...defaultState('INR'), start: 2_500_000 }, 'INR'), false);
    assert.equal(isPristineState({ ...defaultState('INR'), returns: 'cautious' }, 'INR'), false);
  });

  it('publishes nothing while pristine and the share encoding once changed', () => {
    assert.equal(publishableState(defaultState('INR'), 'INR'), '');
    assert.equal(publishableState(defaultState('EUR'), 'EUR'), '');
    assert.equal(publishableState({ ...defaultState('INR'), start: 2_500_000 }, 'INR'), 'c=INR&s=2500000');
    assert.equal(publishableState({ ...defaultState('EUR'), start: 2_500_000 }, 'INR'), 's=2500000');
    // Euros picked on a page that starts in rupees: still carried as euros.
    assert.equal(publishableState(defaultState('EUR'), 'INR'), 'c=EUR');
    assert.equal(decodeState('c=EUR')?.currency, 'EUR');
  });
});

describe('numbers in a link are plain decimals only (#354)', () => {
  it('reads a number only as the page writes one', async () => {
    const { decodeState, DEFAULTS } = await import('./url.ts');
    // Number() would read these as 16, 1000 and 12.
    for (const raw of ['0x10', '1e3', '%2012%20', '+5', '-0x10', 'Infinity', '-Infinity', 'NaN', '1,000', '१२']) {
      assert.equal(decodeState(`s=${raw}&y=25`)?.start, DEFAULTS.start, raw);
    }
    assert.equal(decodeState('s=16&y=25')?.start, 16);
    assert.equal(decodeState('s=-5&y=25')?.start, 0);
    assert.equal(decodeState('f=0.25')?.feePct, 0.25);
    assert.equal(decodeState('n=1e3')?.paths, DEFAULTS.paths);
  });

  it('caps what a link can ask for', async () => {
    const { decodeState } = await import('./url.ts');
    const { MAX_START, MAX_MONTHLY, MAX_WITHDRAWAL } = await import('./math.ts');
    const s = decodeState('s=999999999999999&m=999999999999999&w=999999999999999&r=30');
    assert.deepEqual([s?.start, s?.monthly, s?.withdrawal], [MAX_START, MAX_MONTHLY, MAX_WITHDRAWAL]);
    // More digits than any amount has is not a number here at all.
    assert.equal(decodeState('s=' + '9'.repeat(400))?.start, (await import('./url.ts')).DEFAULTS.start);
  });

  it('a return setting is looked up among its own three codes', async () => {
    const { decodeState, DEFAULTS } = await import('./url.ts');
    for (const e of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'x', '']) {
      assert.equal(decodeState(`s=5&e=${e}`)?.returns, DEFAULTS.returns, e);
    }
    assert.equal(decodeState('e=c')?.returns, 'cautious');
  });
});

describe('return settings and odd links, in detail', () => {
  it('each setting has its own code, both ways', () => {
    for (const [returns, code] of [['cautious', 'c'], ['historical', ''], ['optimistic', 'o']] as const) {
      const encoded = encodeState({ ...DEFAULTS, returns });
      assert.equal(encoded, code ? `e=${code}` : '');
      if (code) assert.equal(decodeState(encoded)?.returns, returns);
    }
  });

  it('only a ? or # at the very start is a prefix', () => {
    assert.equal(decodeState('s=20000&f=?')?.start, 20_000);
  });
});
