/**
 * Unit tests for src/utils/inflation/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULTS, STATE_KEY_PATTERN, decodeState, defaultState, encodeState, isPristineState, publishableState, type ToolState } from './url.ts';

describe('encodeState', () => {
  it('encodes the defaults as an empty string', () => {
    assert.equal(encodeState(DEFAULTS), '');
  });

  it('writes only the fields that differ from the defaults', () => {
    assert.equal(encodeState({ ...DEFAULTS, mode: 'cost', rate: 4.5 }), 'm=c&r=4.5');
    assert.equal(encodeState({ ...DEFAULTS, country: 'ARG', from: 2018 }), 'n=ARG&f=2018');
  });
});

describe('decodeState', () => {
  it('returns null when the address carries no tool state', () => {
    assert.equal(decodeState(''), null);
    assert.equal(decodeState('?utm_source=share&utm_medium=referral'), null);
  });

  it('round-trips a full state', () => {
    const state: ToolState = {
      mode: 'keep',
      currency: 'INR',
      amount: 250_000,
      rate: 6.25,
      years: 25,
      growth: -2.5,
      country: 'IND',
      from: 1991,
    };
    assert.deepEqual(decodeState(encodeState(state)), state);
    for (const mode of ['buy', 'cost', 'past', 'keep'] as const) {
      assert.equal(decodeState(encodeState({ ...state, mode }))?.mode, mode);
    }
  });

  it('reads a fragment as well as a query string', () => {
    assert.equal(decodeState('#y=12')?.years, 12);
    assert.equal(decodeState('?r=7')?.rate, 7);
  });

  it('fills missing fields with defaults', () => {
    assert.deepEqual(decodeState('y=20'), { ...DEFAULTS, years: 20 });
  });

  it('falls back on unknown values and clamps ranges', () => {
    const s = decodeState('m=x&c=XYZ&a=abc&r=20000&y=500&g=-400&n=india&f=19');
    assert.ok(s);
    assert.equal(s.mode, 'buy');
    assert.equal(s.currency, 'EUR');
    assert.equal(s.amount, DEFAULTS.amount);
    assert.equal(s.rate, 10_000);
    assert.equal(s.years, 100);
    assert.equal(s.growth, -99.99);
    assert.equal(s.country, '');
    assert.equal(s.from, null);
  });

  it('keeps a rate to two decimals and a lower-case code readable', () => {
    assert.equal(decodeState('r=3.14159')?.rate, 3.14);
    assert.equal(decodeState('c=usd&n=usa')?.currency, 'USD');
    assert.equal(decodeState('n=usa')?.country, 'USA');
  });

  it('matches every key with the pattern ToolStateGuard uses, and no campaign parameter', () => {
    const isKey = new RegExp(`^(?:${STATE_KEY_PATTERN})$`);
    for (const k of ['m', 'c', 'a', 'r', 'y', 'g', 'n', 'f']) assert.ok(isKey.test(k), k);
    for (const k of ['utm_source', 'utm_content', 'q', 'internal']) assert.ok(!isKey.test(k), k);
  });
});

describe('page starting point and the language switch', () => {
  it('keeps EUR and no country as the codec baseline', () => {
    assert.equal(DEFAULTS.currency, 'EUR');
    assert.equal(decodeState('a=500')?.currency, 'EUR', 'a link without c is in euros on every page');
    assert.equal(decodeState('a=500')?.country, '', 'a link without n shows no country on every page');
  });

  it('treats the untouched state in the page currency and country as pristine', () => {
    assert.equal(isPristineState(defaultState('EUR'), 'EUR'), true);
    assert.equal(isPristineState(defaultState('INR', 'IND'), 'INR', 'IND'), true);
  });

  it('treats any change, or a currency or country other than the page one, as not pristine', () => {
    assert.equal(isPristineState(defaultState('INR', 'IND'), 'EUR'), false);
    assert.equal(isPristineState(defaultState('INR', ''), 'INR', 'IND'), false);
    assert.equal(isPristineState({ ...defaultState('EUR'), mode: 'past' }, 'EUR'), false);
    assert.equal(isPristineState({ ...defaultState('INR', 'IND'), rate: 6 }, 'INR', 'IND'), false);
  });

  it('publishes nothing while pristine and the share encoding once changed', () => {
    assert.equal(publishableState(defaultState('EUR'), 'EUR'), '');
    assert.equal(publishableState(defaultState('INR', 'IND'), 'INR', 'IND'), '');
    assert.equal(publishableState({ ...defaultState('INR', 'IND'), years: 20 }, 'INR', 'IND'), 'c=INR&y=20&n=IND');
    // Euros and no country picked on the Hindi page: still carried as euros.
    assert.equal(publishableState(defaultState('EUR', ''), 'INR', 'IND'), 'c=EUR');
    assert.deepEqual(decodeState('c=EUR'), DEFAULTS);
  });
});
