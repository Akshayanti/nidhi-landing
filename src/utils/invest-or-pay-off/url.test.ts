/**
 * Unit tests for src/utils/invest-or-pay-off/url.ts.
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
    assert.equal(encodeState({ ...DEFAULTS, debtRate: 22, horizon: 'plus10' }), 'r=22&h=0');
    assert.equal(encodeState({ ...DEFAULTS, country: 'IND', inflation: 5.5 }), 'n=IND&i=5.5');
  });
});

describe('decodeState', () => {
  it('returns null when the address carries no tool state', () => {
    assert.equal(decodeState(''), null);
    assert.equal(decodeState('?utm_source=share&utm_medium=referral'), null);
  });

  it('round-trips a full state', () => {
    const state: ToolState = {
      currency: 'INR',
      balance: 3_000_000,
      debtRate: 9,
      payment: 27_000,
      extra: 10_000,
      relief: 30,
      country: 'IND',
      inflation: 5.25,
      returns: 'own',
      ownReturn: 12,
      feePct: 0.5,
      gainsTax: 12.5,
      horizon: 'plus5',
    };
    assert.deepEqual(decodeState(encodeState(state)), state);
    for (const returns of ['cautious', 'historical', 'optimistic', 'own'] as const) {
      assert.equal(decodeState(encodeState({ ...state, returns }))?.returns, returns);
    }
    for (const horizon of ['payoff', 'plus5', 'plus10'] as const) {
      assert.equal(decodeState(encodeState({ ...state, horizon }))?.horizon, horizon);
    }
  });

  it('reads a fragment as well as a query string', () => {
    assert.equal(decodeState('#x=300')?.extra, 300);
    assert.equal(decodeState('?r=7')?.debtRate, 7);
  });

  it('keeps no inflation figure unless one was typed', () => {
    assert.equal(decodeState('#b=1000')?.inflation, null);
    assert.equal(decodeState('#i=')?.inflation, null);
    assert.equal(decodeState('#i=abc')?.inflation, null);
    assert.equal(decodeState('#i=0')?.inflation, 0);
  });

  it('clamps hand-edited values and ignores unknown codes', () => {
    const s = decodeState('#b=-5&l=150&f=9&s=z&h=q&c=XYZ&n=12');
    assert.ok(s);
    assert.equal(s.balance, 0);
    assert.equal(s.relief, 100);
    assert.equal(s.feePct, 5);
    assert.equal(s.returns, 'historical');
    assert.equal(s.horizon, 'plus5');
    assert.equal(s.currency, 'EUR');
    assert.equal(s.country, '');
  });
});

describe('publishableState', () => {
  it('publishes nothing while the page is untouched', () => {
    assert.equal(publishableState(defaultState('INR', 'IND'), 'INR', 'IND'), '');
    assert.ok(isPristineState(defaultState('CZK', 'CZE'), 'CZK', 'CZE'));
  });

  it('names the currency when the euro defaults are picked on a page that starts elsewhere', () => {
    assert.equal(publishableState(DEFAULTS, 'INR', 'IND'), 'c=EUR');
  });

  it('publishes the encoded state once anything changed', () => {
    assert.equal(publishableState({ ...defaultState('INR', 'IND'), extra: 500 }, 'INR', 'IND'), 'c=INR&x=500&n=IND');
  });
});

describe('STATE_KEY_PATTERN', () => {
  it('matches each state key and no utm parameter', () => {
    const re = new RegExp(`^${STATE_KEY_PATTERN}$`);
    for (const k of ['c', 'b', 'r', 'p', 'x', 'l', 'n', 'i', 's', 'o', 'f', 't', 'h']) assert.ok(re.test(k), k);
    assert.ok(!re.test('utm_source'));
  });
});
