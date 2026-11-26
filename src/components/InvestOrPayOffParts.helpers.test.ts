/**
 * The invest or pay off calculator's small helpers (#790): how a share of
 * a hundred is written (`pct`), how a month count is said (`whenText`), the
 * maths' inputs from the page's state (`toInputs`), the analytics call
 * (`track`), the inflation history request (`loadHistory`) and the result's
 * sentences (`resultLines`).
 *
 * No browser: `track` and `loadHistory` are given a stand-in window and
 * fetch, put back after each test.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { investOrPayOffEn, investOrPayOffCs } from '../i18n/strings/tools/investOrPayOff.ts';
import { DEFAULTS, type ToolState } from '../utils/invest-or-pay-off/url.ts';
import type { Result } from '../utils/invest-or-pay-off/math.ts';
import { loadHistory, pct, resultLines, toInputs, track, whenText } from './InvestOrPayOff.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { investOrPayOff: investOrPayOffEn },
  cs: { investOrPayOff: investOrPayOffCs },
};

const en = TOOL_STRINGS.en.investOrPayOff.island;
const cs = TOOL_STRINGS.cs.investOrPayOff.island;
/** Czech keeps a short word on the next one with a no-break space; compared as plain spaces. */
const plain = (s: string) => s.replace(/\u00a0/g, ' ');
const g = globalThis as unknown as Record<string, unknown>;

afterEach(() => {
  delete g.window;
  delete g.fetch;
});

describe('a percentage as the page writes it', () => {
  it('one decimal at most, none when it is whole, below zero with the true minus (#884)', () => {
    assert.equal(pct(6.7, 'en'), '6.7%');
    assert.equal(pct(6.789, 'en'), '6.8%');
    assert.equal(pct(5, 'en'), '5%');
    assert.equal(pct(-1.25, 'en'), '−1.3%');
  });

  it('as many decimals as asked for, in the page’s own marks', () => {
    assert.equal(pct(6.789, 'en', 2), '6.79%');
    assert.equal(pct(6.789, 'en', 0), '7%');
    assert.equal(pct(4.5, 'cs').replace(/\s/g, ' '), '4,5 %');
  });
});

describe('a month count in words', () => {
  it('months alone under a year, years alone on a whole year', () => {
    assert.equal(whenText(0, en, 'en'), 'in 0 months');
    assert.equal(whenText(1, en, 'en'), 'in 1 month');
    assert.equal(whenText(11, en, 'en'), 'in 11 months');
    assert.equal(whenText(12, en, 'en'), 'in 1 year');
    assert.equal(whenText(36, en, 'en'), 'in 3 years');
  });

  it('years and months together otherwise', () => {
    assert.equal(whenText(13, en, 'en'), 'in 1 year and 1 month');
    assert.equal(whenText(26, en, 'en'), 'in 2 years and 2 months');
    assert.equal(whenText(33, en, 'en'), 'in 2 years and 9 months');
  });

  it('each count takes its own form in a language with three', () => {
    assert.equal(whenText(1, cs, 'cs'), 'za 1 měsíc');
    assert.equal(whenText(3, cs, 'cs'), 'za 3 měsíce');
    assert.equal(whenText(5, cs, 'cs'), 'za 5 měsíců');
    assert.equal(whenText(12, cs, 'cs'), 'za 1 rok');
    assert.equal(whenText(24, cs, 'cs'), 'za 2 roky');
    assert.equal(whenText(60, cs, 'cs'), 'za 5 let');
    assert.equal(plain(whenText(13, cs, 'cs')), 'za 1 rok a 1 měsíc');
    assert.equal(plain(whenText(27, cs, 'cs')), 'za 2 roky a 3 měsíce');
    assert.equal(plain(whenText(77, cs, 'cs')), 'za 6 let a 5 měsíců');
  });
});

describe('the maths’ inputs from the page’s state', () => {
  it('drops the currency and country and takes the inflation figure given', () => {
    const state: ToolState = { ...DEFAULTS, currency: 'INR', country: 'IND', inflation: 9, returns: 'own', ownReturn: 11, horizon: 'plus10' };
    assert.deepEqual(toInputs(state, 4.5), {
      balance: 18_000,
      debtRate: 6.5,
      payment: 400,
      extra: 200,
      relief: 0,
      inflation: 4.5,
      returns: 'own',
      ownReturn: 11,
      feePct: 0,
      gainsTax: 0,
      horizon: 'plus10',
      todayAt: 'month',
    });
  });
});

describe('analytics', () => {
  it('sends the event and its properties as given', () => {
    const sent: unknown[][] = [];
    g.window = { posthog: { capture: (...args: unknown[]) => sent.push(args) } };
    track('free_invest_or_pay_off_calculated', { horizon: 'plus5' });
    track('free_invest_or_pay_off_reset');
    assert.deepEqual(sent, [['free_invest_or_pay_off_calculated', { horizon: 'plus5' }], ['free_invest_or_pay_off_reset', undefined]]);
  });

  it('does nothing without analytics, and an analytics error never reaches the page', () => {
    g.window = {};
    assert.doesNotThrow(() => track('x'));
    g.window = { posthog: {} };
    assert.doesNotThrow(() => track('x'));
    g.window = { posthog: { capture: () => { throw new Error('blocked'); } } };
    assert.doesNotThrow(() => track('x'));
  });
});

describe('the inflation history request', () => {
  const calls: Array<[string, unknown]> = [];
  const respond = (res: { ok: boolean; status: number; body?: unknown }) => {
    g.fetch = (url: string, init: unknown) => {
      calls.push([url, init]);
      return Promise.resolve({ ok: res.ok, status: res.status, json: () => Promise.resolve(res.body) });
    };
  };

  it('a failed request is not kept, so the next call asks again', async () => {
    calls.length = 0;
    respond({ ok: false, status: 503 });
    await assert.rejects(loadHistory('/data/history.json'), { message: 'HTTP 503' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    respond({ ok: true, status: 200, body: { EMU: [1] } });
    assert.deepEqual(await loadHistory('/data/history.json'), { EMU: [1] });
    assert.deepEqual(calls, [['/data/history.json', { credentials: 'omit' }], ['/data/history.json', { credentials: 'omit' }]]);
  });

  it('asks once without cookies, and every later call shares the answer', async () => {
    calls.length = 0;
    // The answer above is kept: no request at all.
    respond({ ok: true, status: 200, body: { other: true } });
    const first = loadHistory('/data/other.json');
    const second = loadHistory('/data/other.json');
    assert.equal(first, second);
    assert.deepEqual(await first, { EMU: [1] });
    assert.equal(calls.length, 0);
  });
});

// A result small enough to read on paper: wordedResult keeps these as they are
// with 10,000 paths, as the assertions below show.
const result = (over: Partial<Result> = {}): Result => ({
  payoffMonthA: 33,
  payoffMonthB: 52,
  months: 33,
  a: { p10: 100, p50: 200, p90: 300 },
  b: { p10: 50, p50: 250, p90: 900 },
  diff: { p10: -400, p50: 100, p90: 700 },
  bAhead: 0.5416,
  interestA: 1500,
  interestB: 2700,
  interestAvoided: 1200,
  interestAvoidedToday: 1150,
  interestAvoidedTodayAtEnd: 1100,
  remainingB: 7000,
  paths: 10_000,
  ...over,
});
const money = (v: number) => `€${v}`;

describe('the result in sentences', () => {
  it('says when, who was ahead how often, the gap and the interest avoided month by month', () => {
    assert.deepEqual(resultLines(result(), en, 'en', money), [
      'Compared in 2 years and 9 months.',
      'Investing the extra money ended with higher modelled net wealth in 54 of 100 scenarios; paying off the debt did in 46.',
      'The gap, investing minus paying off, in today\'s money: €-400 at the 10th scenario in 100, €100 in the middle, €700 at the 90th.',
      'Paying off early avoids €1200 of interest up to the date (€1150 in today\'s money).',
    ]);
  });

  it('counts the interest avoided at the comparison date when that is the choice', () => {
    assert.equal(resultLines(result(), en, 'en', money, 'end')[3], 'Paying off early avoids €1200 of interest up to the date (€1100 in today\'s money).');
    assert.equal(resultLines(result(), en, 'en', money, 'month')[3], 'Paying off early avoids €1200 of interest up to the date (€1150 in today\'s money).');
  });

  it('rounds the share to a whole scenario', () => {
    assert.match(resultLines(result({ bAhead: 0.995 }), en, 'en', money)[1], /in 100 of 100 scenarios; paying off the debt did in 0\./);
  });

  it('says the paths ended level only when the gap is nothing at both ends', () => {
    const even = { p10: 0, p50: 0, p90: 0 };
    assert.equal(resultLines(result({ diff: even, bAhead: 0 }), en, 'en', money)[1], en.results.shareEven);
    assert.equal(resultLines(result({ diff: { p10: 0, p50: 0, p90: 5 }, bAhead: 0.1 }), en, 'en', money)[1], 'Investing the extra money ended with higher modelled net wealth in 10 of 100 scenarios; paying off the debt did in 90.');
    assert.equal(resultLines(result({ diff: { p10: -5, p50: 0, p90: 0 }, bAhead: 0 }), en, 'en', money)[1], 'Investing the extra money ended with higher modelled net wealth in 0 of 100 scenarios; paying off the debt did in 100.');
  });

  it('words the simulated amounts to what the scenarios can tell apart', () => {
    const lines = resultLines(result({ diff: { p10: -4123.456, p50: 1234.567, p90: 7654.321 } }), en, 'en', money);
    assert.doesNotMatch(lines[2], /\.\d/);
    assert.doesNotMatch(lines[2], /4123|1234|7654/);
  });
});
