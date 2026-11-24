/**
 * Unit tests for src/utils/inflation/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULTS, SHARED_STATE_GLOBAL, STATE_KEY_PATTERN, decodeState, defaultState, encodeState, isPristineState, publishableState, type ToolState } from './url.ts';

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
    // Exactly the eight letters: any other single letter in an address is not tool state.
    assert.equal(STATE_KEY_PATTERN, '[mcarygnf]');
    for (const k of 'bdehijklopqstuvwxz') assert.ok(!isKey.test(k), k);
    assert.equal(SHARED_STATE_GLOBAL, '__nidhiInflationShared');
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

describe('a link written by hand, or damaged on the way', () => {
  it('reads the default question when a link names it', () => {
    assert.equal(decodeState('m=b&r=4')?.mode, 'buy');
    assert.deepEqual(decodeState('m=b'), DEFAULTS);
  });

  it('strips only a leading ? or #, never one further in', () => {
    assert.equal(decodeState('a=500&x=?')?.amount, 500);
    assert.equal(decodeState('a=500&x=%23#')?.amount, 500);
    assert.equal(decodeState('?a=500')?.amount, 500);
    assert.equal(decodeState('#a=500')?.amount, 500);
  });

  it('an empty or blank number means the default, not zero', () => {
    assert.equal(decodeState('a=&r=4')?.amount, DEFAULTS.amount);
    assert.equal(decodeState('a=%20%20')?.amount, DEFAULTS.amount);
    assert.equal(decodeState('y=')?.years, DEFAULTS.years);
    assert.equal(decodeState('y=%20')?.years, DEFAULTS.years);
    assert.equal(decodeState('g=')?.growth, DEFAULTS.growth);
    assert.equal(decodeState('r=%20&y=5')?.rate, DEFAULTS.rate);
    assert.equal(decodeState('a=0')?.amount, 0, 'a typed zero is still zero');
  });

  it('clamps at both ends: no negative amount, at least one year, whole years only', () => {
    const s = decodeState('a=-5&r=-1&y=0&g=20000');
    assert.equal(s?.amount, 0);
    assert.equal(s?.rate, 0);
    assert.equal(s?.years, 1);
    assert.equal(s?.growth, 10_000);
    assert.equal(decodeState('a=2e12')?.amount, 1e12);
    assert.equal(decodeState('y=12.4')?.years, 12);
    assert.equal(decodeState('g=-2.505')?.growth, -2.5);
  });

  it('a starting year is four digits and nothing else', () => {
    assert.equal(decodeState('f=2018')?.from, 2018);
    assert.equal(decodeState('f=12018')?.from, null);
    assert.equal(decodeState('f=20189')?.from, null);
    assert.equal(decodeState('f=x2018')?.from, null);
    assert.equal(decodeState('f=2018x')?.from, null);
    assert.equal(decodeState('f=')?.from, null);
    assert.equal(decodeState('y=5')?.from, null);
  });

  it('a country code is three letters and nothing else', () => {
    assert.equal(decodeState('n=IN')?.country, '');
    assert.equal(decodeState('n=INDX')?.country, '');
    assert.equal(decodeState('n=1ND')?.country, '');
    assert.equal(decodeState('n=XIND1')?.country, '');
  });

  it('a starting year alone is state, and is written into a link', () => {
    assert.equal(encodeState({ ...DEFAULTS, from: 2018 }), 'f=2018');
    assert.deepEqual(decodeState('f=2018'), { ...DEFAULTS, from: 2018 });
  });

  it('writes every field that differs, in the fixed order', () => {
    assert.equal(
      encodeState({ mode: 'keep', currency: 'INR', amount: 2500.5, rate: 6.25, years: 25, growth: -2.5, country: 'IND', from: 1991 }),
      'm=k&c=INR&a=2500.5&r=6.25&y=25&g=-2.5&n=IND&f=1991',
    );
    assert.equal(encodeState({ ...DEFAULTS, mode: 'past' }), 'm=p');
  });
});

describe('the page starting point, one difference at a time', () => {
  it('another currency alone, or another country alone, is not pristine', () => {
    assert.equal(isPristineState(defaultState('INR'), 'EUR'), false);
    assert.equal(isPristineState(defaultState('EUR', 'IND'), 'EUR'), false);
    assert.equal(isPristineState(defaultState('EUR'), 'EUR', 'IND'), false);
  });

  it('a starting year alone is not pristine', () => {
    assert.equal(isPristineState({ ...defaultState('INR', 'IND'), from: 2010 }, 'INR', 'IND'), false);
  });

  it('the untouched state starts in euros with no country unless the page says otherwise', () => {
    assert.deepEqual(defaultState(), DEFAULTS);
    assert.deepEqual(defaultState('CZK'), { ...DEFAULTS, currency: 'CZK' });
    assert.deepEqual(defaultState('INR', 'IND'), { ...DEFAULTS, currency: 'INR', country: 'IND' });
    assert.deepEqual(DEFAULTS, { mode: 'buy', currency: 'EUR', amount: 10_000, rate: 3, years: 10, growth: 5, country: '', from: null });
  });

  it('a page with no country of its own publishes its currency once anything else is picked', () => {
    assert.equal(publishableState(defaultState('EUR'), 'CZK'), 'c=EUR');
    assert.equal(publishableState(defaultState('CZK'), 'CZK'), '');
    assert.equal(publishableState({ ...defaultState('CZK'), mode: 'cost' }, 'CZK'), 'm=c&c=CZK');
  });
});
