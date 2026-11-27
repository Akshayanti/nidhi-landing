/**
 * The key pattern each free tool hands its guard, against every key the
 * tool's encoder can emit (CLAUDE.md, "Free tools keep inputs out of URLs",
 * rule 3). The guard moves shared state out of the address before analytics
 * load, and it knows a key by this pattern: a key the pattern misses would
 * stay in the address and reach analytics with the page view.
 *
 * These assertions run the tools' own encoders. They are in a file of their
 * own, apart from the rules checked against the source as text
 * (toolPrivacy.test.ts), so that this file reads nothing but the modules it
 * imports: the mutation cache works out what a test depends on from its
 * source, and a test that walks folders depends on every file (#904).
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as loan from '../loan/url.ts';
import * as netWorth from '../multi-currency-net-worth/url.ts';
import type { AssetRow, CurrencyPosition } from '../multi-currency-net-worth/math.ts';
import * as monteCarlo from '../monte-carlo/url.ts';
import * as monteCarloForm from '../monte-carlo/form.ts';
import * as inflation from '../inflation/url.ts';
import * as investOrPayOff from '../invest-or-pay-off/url.ts';

const key = (pattern: string): RegExp => new RegExp(`^(?:${pattern})$`);
const keysOf = (encoded: string): string[] => [...new URLSearchParams(encoded).keys()];

describe('the guard’s key pattern covers every key the encoder can emit', () => {
  it('loan comparison: five offers with every field changed', () => {
    // Built from the default shapes, so a field added later is changed here too.
    const special: Record<string, string> = { name: 'Home Bank ~ & Co', modeKind: 'payment', rateKind: 'hybrid', rateChangeKeeps: 'payment', lumpSumsEncoded: '12:5000;24:2500' };
    const vendors = Array.from({ length: loan.MAX_VENDORS }, (_, i) => {
      const v = loan.makeDefaultVendor(i) as unknown as Record<string, string>;
      for (const field of Object.keys(v)) v[field] = special[field] ?? (v[field] === '7' ? '8' : '7');
      return v as unknown as loan.VendorInput;
    });
    const global = { ...loan.DEFAULT_GLOBAL_STATE } as unknown as Record<string, string | boolean>;
    for (const field of Object.keys(global)) {
      global[field] = typeof global[field] === 'boolean' ? true : field === 'currency' ? 'INR' : field === 'activeTab' ? 'refi' : '7';
    }
    const keys = keysOf(loan.encodeToQueryString(vendors, global as unknown as loan.GlobalState));
    const isKey = key(loan.STATE_KEY_PATTERN);
    for (const k of keys) assert.ok(isKey.test(k), `the pattern misses ${k}`);
    // Ten globals, then per offer the tuple and its nine advanced fields.
    assert.equal(keys.length, 10 + loan.MAX_VENDORS * 10, keys.join(' '));
    // Older links carried an APR convention as `ac`; nothing writes it now, and the guard still removes it.
    assert.ok(isKey.test('ac'));
    // The link the tool writes carries the same keys inside its envelope: the format first, the check last (#820).
    const sealed = keysOf(loan.encodeSharedState(vendors, global as unknown as loan.GlobalState));
    assert.deepEqual(sealed, ['f', ...keys, 'z']);
    for (const k of sealed) assert.ok(isKey.test(k), `the pattern misses ${k}`);
  });

  const rows: AssetRow[] = Array.from({ length: 60 }, (_, i) => ({
    name: `Asset ${i} ~ flat`, value: String(1000 + i), currency: i % 2 ? 'INR' : 'USD', type: i % 3 ? 'asset' : 'liability',
  }));
  const positions: CurrencyPosition[] = ['EUR', 'USD', 'INR', 'CZK', 'JPY'].map((code, i) => ({
    code, netAmountOriginal: 1000 + i, netAmountFunctional: 900 + i, pctOfTotal: 20, isFunctional: i === 0,
    riskLevel: 'low', riskLabel: 'Low',
  } as CurrencyPosition));

  it('net worth: the tool’s own state, a full share and a redacted share', () => {
    const isKey = key(netWorth.STATE_KEY_PATTERN);
    const own = keysOf(netWorth.encodeFullData(rows, 'INR'));
    const full = keysOf(netWorth.encodeShared(rows, positions, 'INR', 'full'));
    const redacted = keysOf(netWorth.encodeShared(rows, positions, 'INR', 'redacted'));
    for (const k of [...own, ...full, ...redacted]) assert.ok(isKey.test(k), `the pattern misses ${k}`);
    assert.ok(own.includes('f') && own.includes('n') && own.includes('a50'), own.join(' '));
    assert.ok(full.includes('m') && full.includes('p_CZK'), full.join(' '));
    assert.deepEqual(redacted.sort(), ['f', 'm', 'p_CZK', 'p_EUR', 'p_INR', 'p_JPY', 'p_USD']);
  });

  it('Monte Carlo: every field changed emits every key', () => {
    const state: monteCarlo.ToolState = {
      ...monteCarlo.DEFAULTS, currency: 'INR', start: 1, monthly: 2, saveYears: 3, stockPct: 4, withdrawal: 5,
      withdrawYears: 6, feePct: 0.5, returns: 'optimistic', paths: monteCarlo.DEFAULTS.paths + 1,
    };
    for (const field of Object.keys(monteCarlo.DEFAULTS) as (keyof monteCarlo.ToolState)[]) {
      assert.notEqual(state[field], monteCarlo.DEFAULTS[field], `${field} is new: change it in this test`);
    }
    // `o` is the form's alone: withdrawals off, beside an amount typed wrong.
    const off = monteCarloForm.publishableForm({ ...monteCarloForm.toForm(state), withdrawOn: false, withdrawal: 'NaN' }, 'EUR');
    const keys = [...new Set([...keysOf(monteCarlo.encodeState(state)), ...keysOf(off)])];
    assert.deepEqual(keys.slice().sort(), [...monteCarlo.STATE_KEYS].sort());
    const isKey = key(monteCarlo.STATE_KEY_PATTERN);
    for (const k of keys) assert.ok(isKey.test(k), `the pattern misses ${k}`);
  });

  it('inflation calculator: every field changed emits every key', () => {
    const state: inflation.ToolState = { mode: 'past', currency: 'INR', amount: 1, rate: 2, years: 3, growth: 4, country: 'IND', from: 1990 };
    for (const field of Object.keys(inflation.DEFAULTS) as (keyof inflation.ToolState)[]) {
      assert.notEqual(state[field], inflation.DEFAULTS[field], `${field} is new: change it in this test`);
    }
    const keys = keysOf(inflation.encodeState(state));
    assert.deepEqual(keys.slice().sort(), [...inflation.STATE_KEYS].sort());
    for (const k of keys) assert.ok(key(inflation.STATE_KEY_PATTERN).test(k), `the pattern misses ${k}`);
  });

  it('invest or pay off: every field changed emits every key', () => {
    const state: investOrPayOff.ToolState = {
      currency: 'INR', balance: 1, debtRate: 2, payment: 3, extra: 4, relief: 5, country: 'IND', inflation: 6,
      returns: 'own', ownReturn: 8, feePct: 0.5, gainsTax: 9, horizon: 'plus10', todayAt: 'end',
    };
    for (const field of Object.keys(investOrPayOff.DEFAULTS) as (keyof investOrPayOff.ToolState)[]) {
      assert.notEqual(state[field], investOrPayOff.DEFAULTS[field], `${field} is new: change it in this test`);
    }
    const keys = keysOf(investOrPayOff.encodeState(state));
    assert.deepEqual(keys.slice().sort(), [...investOrPayOff.STATE_KEYS].sort());
    for (const k of keys) assert.ok(key(investOrPayOff.STATE_KEY_PATTERN).test(k), `the pattern misses ${k}`);
  });

  it('single-letter tools: the pattern is built from the encoder’s own key list', () => {
    for (const mod of [inflation, investOrPayOff, monteCarlo]) {
      assert.equal(mod.STATE_KEY_PATTERN, `[${mod.STATE_KEYS.join('')}]`);
      for (const k of mod.STATE_KEYS) assert.equal(k.length, 1, `${k}: a character class matches one letter`);
    }
  });

  it('no tool’s pattern takes a campaign or site parameter for state', () => {
    for (const mod of [loan, netWorth, monteCarlo, inflation, investOrPayOff]) {
      const isKey = key(mod.STATE_KEY_PATTERN);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'internal', 'q']) {
        assert.equal(isKey.test(k), false, `${mod.SHARED_STATE_GLOBAL}: ${k}`);
      }
    }
  });
});
