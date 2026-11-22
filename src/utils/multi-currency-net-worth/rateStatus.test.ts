/**
 * A link says, for each currency, whether its rate was known (#795). A missing
 * rate and a tiny known amount both read 0.00, so a link from before the
 * status cannot vouch for a total with such a zero in it: it is in doubt.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as url from './url.ts';
import { aggregate, type AggregationResult, type AssetRow, type RiskLevel } from './math.ts';

const { decodeFromQueryString, encodeShared } = url;
const api = url as unknown as {
  sharedResult?: (positions: url.SharedPositionData[], currency: string, label: (level: RiskLevel) => string) => AggregationResult;
};
type Arrived = {
  refused?: string;
  inDoubt?: boolean;
  sharedPositions?: Array<{ code: string; rateUnavailable?: boolean; netAmountOriginal?: number }>;
};
const open = (qs: string) => decodeFromQueryString(qs) as Arrived;
const row = (value: string, currency: string, type: AssetRow['type'] = 'asset'): AssetRow => ({ name: 'x', value, currency, type });
const link = (rows: AssetRow[], rates: Record<string, number> | null, mode: 'full' | 'redacted' = 'full') =>
  encodeShared(rows, aggregate(rows, 'EUR', rates).positions, 'EUR', mode);
const position = (qs: string, code: string) => open(qs).sharedPositions!.find((p) => p.code === code)!;
const shown = (qs: string) => api.sharedResult!(decodeFromQueryString(qs).sharedPositions!, 'EUR', (level) => level);

const HOME = row('1000', 'EUR');
const AWAY = row('3000', 'CZK');

describe('a new full link says which rate was missing', () => {
  it('missing', () => {
    const qs = link([HOME, AWAY], { EUR: 1 });
    assert.equal(position(qs, 'CZK').rateUnavailable, true);
    assert.equal(position(qs, 'EUR').rateUnavailable, false);
    assert.ok(!open(qs).inDoubt);
  });
  it('missing, for a debt', () => {
    assert.equal(position(link([HOME, row('3000', 'CZK', 'liability')], { EUR: 1 }), 'CZK').rateUnavailable, true);
  });
  it('known, with an amount that rounds to 0.00', () => {
    const qs = link([HOME, row('0.1', 'CZK')], { EUR: 1, CZK: 25 });
    assert.equal(position(qs, 'CZK').rateUnavailable, false);
    assert.ok(!open(qs).inDoubt);
  });
  it('with no rates at all, as a link with an unreadable row can be made', () => {
    assert.equal(position(link([HOME, AWAY, row('7x', 'EUR')], null), 'CZK').rateUnavailable, true);
  });
  it('the original amount comes from the rows', () => {
    const qs = link([HOME, AWAY, row('500', 'CZK', 'liability')], { EUR: 1 });
    assert.equal(position(qs, 'CZK').netAmountOriginal, 2500);
  });
  it('a converted currency keeps its own amount too', () => {
    assert.equal(position(link([HOME, AWAY], { EUR: 1, CZK: 25 }), 'CZK').netAmountOriginal, 3000);
  });
});

describe('what a shared view works with', () => {
  it('a missing rate is a partial total', () => {
    assert.equal(typeof api.sharedResult, 'function');
    const result = shown(link([HOME, AWAY], { EUR: 1 }));
    assert.equal(result.hasRates, 'partial');
    assert.equal(result.totalNetWorthFunctional, 1000);
    const away = result.positions.find((p) => p.code === 'CZK')!;
    assert.deepEqual([away.rateUnavailable, away.netAmountOriginal], [true, 3000]);
  });
  it('every currency without a rate is still partial, not no rates', () => {
    assert.equal(typeof api.sharedResult, 'function');
    assert.equal(shown(link([AWAY], { EUR: 1 })).hasRates, 'partial');
  });
  it('known rates are a full total', () => {
    assert.equal(typeof api.sharedResult, 'function');
    assert.equal(shown(link([HOME, AWAY], { EUR: 1, CZK: 25 })).hasRates, 'full');
  });
  for (const rates of [{ EUR: 1 }, { EUR: 1, CZK: 25 }] as Record<string, number>[]) {
    it(`copied again it says the same, ${Object.keys(rates).join(' ')}`, () => {
      assert.equal(typeof api.sharedResult, 'function');
      const rows = [HOME, row('0.1', 'CZK')];
      const first = link(rows, rates);
      const again = encodeShared(rows, shown(first).positions, 'EUR', 'full');
      assert.equal(position(again, 'CZK').rateUnavailable, position(first, 'CZK').rateUnavailable);
    });
  }
});

describe('an older full link', () => {
  const old = (away: string, p: string) => `m=f&f=EUR&n=${away.split('&').length + 1}&a1=h~1000&${away}&p_EUR=100.0~functional~1000.00&p_CZK=${p}`;
  it('a zero whose rows do not net to zero is in doubt', () => {
    const arrived = open(old('a2=x~3000~CZK', '0.0~low~0.00'));
    assert.equal(arrived.inDoubt, true);
    assert.ok(arrived.sharedPositions!.every((p) => p.rateUnavailable !== true), 'and it never says a rate was missing');
  });
  it('a debt written as minus zero is in doubt', () => {
    assert.equal(open(old('a2=x~0.1~CZK~liability', '0.0~net-debt~-0.00')).inDoubt, true);
  });
  it('a zero whose rows net to zero is not', () => {
    assert.ok(!open(old('a2=x~3000~CZK&a3=y~3000~CZK~liability', '0.0~low~0.00')).inDoubt);
  });
  it('decimals that net to zero are not', () => {
    assert.ok(!open(old('a2=x~0.1~CZK&a3=y~0.2~CZK&a4=z~0.3~CZK~liability', '0.0~low~0.00')).inDoubt);
  });
  it('an amount that is not zero proves the rate', () => {
    assert.ok(!open(old('a2=x~1~CZK', '0.0~low~0.04')).inDoubt);
  });
  it('the spending currency needs no rate', () => {
    assert.ok(!open('m=f&f=EUR&n=1&a1=h~0.001&p_EUR=0.0~functional~0.00').inDoubt);
  });
});

describe('an amount a full link cannot vouch for refuses it whole', () => {
  for (const [what, amount] of [['a word', '~x'], ['number then text', '~12x'], ['none', ''], ['infinity', '~Infinity']]) {
    it(what, () => {
      const arrived = open(`m=f&f=EUR&a1=h~1000&a2=x~3000~CZK&p_EUR=100~functional~1000&p_CZK=0~low${amount}`);
      assert.equal(arrived.refused, 'link');
      assert.equal(arrived.sharedPositions, undefined);
    });
  }
});

describe('a redacted link', () => {
  it('a new one says every rate was known', () => {
    const qs = link([row('100000', 'EUR'), row('100', 'CZK')], { EUR: 1, CZK: 25 }, 'redacted');
    assert.equal(position(qs, 'CZK').rateUnavailable, false);
    assert.ok(!open(qs).inDoubt);
  });
  it('a new one keeps z', () => {
    const qs = link([row('5000', 'EUR', 'liability'), AWAY], { EUR: 1, CZK: 25 }, 'redacted');
    const arrived = open(qs).sharedPositions as Array<{ noShares?: boolean; rateUnavailable?: boolean }>;
    assert.ok(arrived.every((p) => p.noShares === true && p.rateUnavailable === false));
  });
  it('one that says a rate was missing is refused whole', () => {
    assert.equal(open(link([HOME, AWAY], { EUR: 1 }, 'redacted')).refused, 'link');
  });
  for (const [what, p] of [
    ['a zero share', 'p_EUR=100.0~functional&p_CZK=0.0~low'],
    ['a zero share with z', 'p_EUR=100.0~functional~~z&p_CZK=0.0~net-debt~~z'],
    ['a share of minus zero', 'p_EUR=100.0~functional&p_CZK=-0.0~net-debt'],
    ['only a zero in the spending currency', 'p_EUR=0.0~functional'],
  ]) {
    it(`an older one with ${what} is in doubt`, () => assert.equal(open(`m=r&f=EUR&${p}`).inDoubt, true));
  }
  for (const [what, p] of [
    ['no zero share', 'p_EUR=90.0~functional&p_CZK=10.0~low'],
    ['z and no zero share', 'p_EUR=90.0~functional~~z&p_CZK=10.0~net-debt~~z'],
  ]) {
    it(`an older one with ${what} is not`, () => assert.ok(!open(`m=r&f=EUR&${p}`).inDoubt));
  }
});

const SENT_ROWS = 'm=f&f=EUR&a1=Cash~100000&a2=Fund~55000~USD';
const SENT_EUR = 'p_EUR=66.7~functional~100000.00~~k';
const HIDDEN_EUR = 'p_EUR=66.7~functional~~~k';

describe('a cut or crafted link is refused (#795)', () => {
  const refused: Record<string, string> = {
    'cut inside the last amount': `${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~5`,
    'cut after the amount, so the status is gone': `${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~50000.00`,
    'an amount in hex': `${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~0x10~~k`,
    'an amount with an exponent': `${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~5e4~~k`,
    'an amount with one decimal': `${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~50000.0~~k`,
    'a position no row backs': 'm=f&f=EUR&n=1&a1=Cash~100~EUR&p_EUR=100.0~functional~100.00~~k&p_USD=100.0~low~1000.00~~k',
    'a total with no row at all': 'm=f&f=EUR&n=0&p_EUR=100.0~functional~5000.00~~k',
    'redacted, the last entry empty': `m=r&f=EUR&${HIDDEN_EUR}&p_USD=`,
    'redacted, cut inside a share': `m=r&f=EUR&${HIDDEN_EUR}&p_USD=3`,
    'redacted, the last position gone': `m=r&f=EUR&${HIDDEN_EUR}`,
  };
  for (const [name, qs] of Object.entries(refused)) {
    it(name, () => assert.equal(open(qs).refused, 'link'));
  }
});

describe('what must still open (#795)', () => {
  const CASES: Record<string, [AssetRow[], Record<string, number> | null]> = {
    'one currency': [[row('1000', 'EUR')], null],
    'a debt in another currency': [[row('100000', 'EUR'), row('55000', 'USD', 'liability')], { EUR: 1, USD: 1.1 }],
    'three currencies': [[row('1', 'EUR'), row('1', 'USD'), row('1', 'CZK')], { EUR: 1, USD: 1, CZK: 1 }],
    'net worth below zero': [[row('1000', 'EUR', 'liability'), row('500', 'USD')], { EUR: 1, USD: 1.1 }],
    'rows that net to zero': [[row('1000', 'EUR'), row('1000', 'EUR', 'liability')], null],
  };
  for (const [name, [rows, rates]] of Object.entries(CASES)) {
    for (const mode of ['full', 'redacted'] as const) {
      it(`${mode}: ${name}`, () => {
        const qs = encodeShared(rows, aggregate(rows, 'EUR', rates).positions, 'EUR', mode);
        assert.equal(open(qs).refused, undefined, qs);
      });
    }
  }
  it('an older full link', () => {
    assert.equal(open(`${SENT_ROWS}&p_EUR=66.7~functional~100000.00&p_USD=33.3~moderate~50000.00`).refused, undefined);
  });
  it('an older redacted link', () => {
    assert.equal(open('m=r&f=EUR&p_EUR=66.7~functional&p_USD=33.3~moderate').refused, undefined);
  });
});

describe('a link names each currency once, and all say or none say (#795)', () => {
  it('a position twice', () => {
    assert.equal(open(`${SENT_ROWS}&${SENT_EUR}&p_USD=33.3~moderate~50000.00~~k&p_usd=33.3~moderate~50000.00~~k`).refused, 'link');
  });
  it('a status on one position only, redacted', () => {
    assert.equal(open(`m=r&f=EUR&${HIDDEN_EUR}&p_USD=33.3~moderate`).refused, 'link');
  });
});

describe('a link the tool writes opens, however large its amount (#795)', () => {
  // From 1e21 toFixed() writes an exponent, and every writer has used toFixed().
  for (const value of ['1000000000000000000000', '9999999999999999999999']) {
    for (const type of ['asset', 'liability'] as const) {
      it(`${type} of ${value}`, () => {
        assert.equal(open(link([row(value, 'EUR', type), AWAY], { EUR: 1, CZK: 24 })).refused, undefined);
      });
    }
  }
  it('a share that large', () => {
    const rows = [row('0.01', 'EUR'), row('100000000000000000000', 'CZK'), row('100000000000000000000', 'CZK', 'liability')];
    assert.equal(open(link(rows, { EUR: 1, CZK: 24 })).refused, undefined);
    const huge = open('m=f&f=EUR&n=1&a1=x~1000000000000000000000&p_EUR=1e%2B24~functional~1e%2B21~~k');
    assert.equal(huge.refused, undefined);
  });
  for (const amount of ['1e%2B2', '1e21', '1e-7', '1e%2B']) {
    it(`no other exponent: ${amount}`, () => {
      assert.equal(open(`m=f&f=EUR&n=1&a1=x~100&p_EUR=100.0~functional~${amount}~~k`).refused, 'link');
    });
  }
});

describe('a number too large to be one is refused, never zero (#795)', () => {
  it('an amount', () => {
    assert.equal(open('m=f&f=EUR&a1=x~100&a2=y~100~USD&p_EUR=50.0~functional~100.00~~k&p_USD=50.0~moderate~1e%2B309~~k').refused, 'link');
  });
  it('a share', () => {
    assert.equal(open('m=f&f=EUR&a1=x~100&p_EUR=1e%2B309~functional~100.00~~k').refused, 'link');
  });
});

describe('a redacted link cut short is refused, new or older (#795)', () => {
  const cuts = {
    'new, cut after the band': 'p_EUR=66.7~functional',
    'new, cut in the share': 'p_EUR=6',
    'older, cut in the last share': 'p_EUR=66.7~functional&p_USD=3',
    'older, cut in the band': 'p_EUR=66.7~functional&p_USD=33.3~mod',
    'a share of another spelling': 'p_EUR=100~functional',
    'a band no writer knows': 'p_EUR=100.0~fine',
  };
  for (const [name, tail] of Object.entries(cuts)) {
    it(name, () => assert.equal(open(`m=r&f=EUR&${tail}`).refused, 'link'));
  }
  const whole = {
    'two': 'p_EUR=66.7~functional&p_USD=33.3~moderate',
    'one': 'p_EUR=100.0~functional',
    'no shares': 'p_EUR=40.0~functional~~z&p_USD=60.0~unbanded~~z',
    'all zero': 'p_EUR=0.0~functional&p_USD=0.0~low',
    'debts only': 'p_EUR=120.0~functional&p_USD=0.0~net-debt',
  };
  for (const [name, tail] of Object.entries(whole)) {
    it(`older and whole: ${name}`, () => assert.equal(open(`m=r&f=EUR&${tail}`).refused, undefined));
  }
  it('no prefix of a link opens with fewer currencies or another band', () => {
    const full = { new: 'p_EUR=66.7~functional~~~k&p_USD=33.3~moderate~~~k', older: 'p_EUR=66.7~functional&p_USD=33.3~moderate' };
    for (const [name, tail] of Object.entries(full)) {
      for (let end = 1; end < tail.length; end += 1) {
        const got = decodeFromQueryString(`m=r&f=EUR&${tail.slice(0, end)}`);
        if (got.refused) continue;
        assert.deepEqual(got.sharedPositions!.map((p) => [p.code, p.pct, p.riskLevel]), [['EUR', 66.7, 'functional'], ['USD', 33.3, 'moderate']], `${name}: ${tail.slice(0, end)}`);
      }
    }
  });
});

describe('float residue is a net worth of zero (#795)', () => {
  const cases: Array<[string, string, number]> = [['1000', '1100', 1.1], ['50000', '55000', 1.1]];
  for (const [owned, owed, rate] of cases) {
    it(`${owned} less ${owed}`, () => {
      const rows = [row(owned, 'EUR'), row(owed, 'USD', 'liability')];
      const result = aggregate(rows, 'EUR', { EUR: 1, USD: rate });
      assert.equal(result.totalNetWorthFunctional, 0);
      assert.equal(result.noShares, true);
      const sent = encodeShared(rows, result.positions, 'EUR', 'redacted');
      assert.equal(open(sent).refused, undefined);
      assert.match(sent, /~z~k/);
    });
  }
  it('a real difference at a large gross stays', () => {
    const rows = [row('100000000000999', 'EUR'), row('100000000000000', 'EUR', 'liability'), row('900000000000000', 'USD'), row('900000000000000', 'USD', 'liability'), row('500000000000000', 'CZK'), row('499999999999000', 'GBP', 'liability')];
    const result = aggregate(rows, 'EUR', { EUR: 1, USD: 1, CZK: 1, GBP: 1 });
    assert.ok(result.totalNetWorthFunctional > 1900, String(result.totalNetWorthFunctional));
  });
});

describe('rates on the way are neither missing nor failed (#795)', () => {
  const view = { loading: true, failed: false, shared: false, singleCurrency: false };
  it('pending only where this page’s own rates are awaited', async () => {
    const { ratesPending } = await import('./math.ts');
    assert.equal(ratesPending(view, 'none'), true);
    assert.equal(ratesPending(view, 'full'), false);
    for (const change of [{ loading: false }, { failed: true }, { shared: true }, { singleCurrency: true }]) {
      assert.equal(ratesPending({ ...view, ...change }, 'none'), false, JSON.stringify(change));
    }
  });
  it('a failure says raw amounts only where they are shown', async () => {
    const { ratesFailureShown } = await import('./math.ts');
    const failed = { ...view, loading: false, failed: true };
    assert.equal(ratesFailureShown(failed, false), true);
    assert.equal(ratesFailureShown(failed, true), false, 'withheld');
    assert.equal(ratesFailureShown({ ...failed, shared: true }, false), false, 'shared');
    assert.equal(ratesFailureShown({ ...failed, singleCurrency: true }, false), false, 'one currency');
  });
  it('one rule for the cards, the export and the report', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../../components/MultiCurrencyNetWorth.tsx', import.meta.url), 'utf8');
    assert.match(source, /const exportReady = !withheld && !pendingRates && /);
    assert.match(source, /\{!withheld && !pendingRates && <PrintedReport/);
    assert.match(source, /pendingRates=\{pendingRates\}/);
    assert.match(source, /\{ratesFailureShown\(ratesView, Boolean\(withheld \|\| \(refused && untouched\)\)\) && \(/, 'a refused list shows no amounts either');
    assert.doesNotMatch(source, /mcnw-bannerWarn\$\{withheld \?/, 'after the table it needs no kept space');
  });
});

describe('a real tiny total opens its own redacted link (#795)', () => {
  it('2 at a gross of 4e14', () => {
    const rows = [row('419856381879655', 'EUR'), row('419856381879653', 'USD', 'liability')];
    const result = aggregate(rows, 'EUR', { EUR: 1, USD: 1 });
    assert.equal(result.totalNetWorthFunctional, 2);
    assert.equal(open(encodeShared(rows, result.positions, 'EUR', 'redacted')).refused, undefined);
  });
});

describe('a redacted link cut among its positions (#795)', () => {
  const cases: Record<string, ReturnType<typeof row>[]> = {
    'a zero share first': [row('50', 'EUR'), row('220000', 'USD')],
    'a zero share last': [row('220000', 'EUR'), row('50', 'USD')],
    'a debt': [row('150000', 'EUR'), row('11000', 'USD'), row('60000', 'CHF', 'liability')],
    'three': [row('50000', 'EUR'), row('30000', 'USD'), row('20000', 'CHF')],
  };
  for (const [name, rows] of Object.entries(cases)) {
    it(`${name}: no prefix opens, through the guard`, async () => {
      const { readFileSync } = await import('node:fs');
      const { runInNewContext } = await import('node:vm');
      const { STATE_KEY_PATTERN } = await import('./url.ts');
      const guard = readFileSync(new URL('../shared/toolStateGuard.js', import.meta.url), 'utf8');
      const guarded = (hash: string) => {
        const window: any = { location: { hash: `#${hash}`, search: '', pathname: '/free/x/' }, history: { state: null, replaceState() {} } };
        runInNewContext(guard, { window, globalThis: window, URLSearchParams });
        window.nidhiGuardToolState('kept', STATE_KEY_PATTERN);
        return window.kept as string | undefined;
      };
      const sent = encodeShared(rows, aggregate(rows, 'EUR', { EUR: 1, USD: 1.1, CHF: 1 }).positions, 'EUR', 'redacted');
      assert.equal(open(guarded(sent)!).refused, undefined);
      for (let end = 1; end < sent.length; end += 1) {
        const kept = guarded(sent.slice(0, end));
        if (!kept) continue;
        const got = decodeFromQueryString(kept);
        assert.ok(got.refused || !got.sharedPositions, sent.slice(0, end));
      }
    });
  }
  it('no spending currency, no view', () => {
    assert.equal(open('m=r&p_EUR=100.0~functional').refused, 'link');
    assert.equal(open('m=r&f=XX&p_EUR=100.0~functional').refused, 'link');
  });
  it('an older lone zero is in doubt', () => {
    assert.equal(open('m=r&f=EUR&p_EUR=0.0~functional').inDoubt, true);
  });
  it('older: over 100 is debts alone', () => {
    assert.equal(open('m=r&f=EUR&p_EUR=150.0~functional&p_USD=10.0~low').refused, 'link');
    assert.equal(open('m=r&f=EUR&p_EUR=120.0~functional&p_USD=10.0~net-debt').refused, undefined);
  });
});

describe('a failed refresh with rates held (#795)', () => {
  it('does not say raw amounts', async () => {
    const { ratesFailureShown } = await import('./math.ts');
    const failed = { loading: false, failed: true, shared: false, singleCurrency: false };
    assert.equal(ratesFailureShown({ ...failed, held: true }, false), false);
    assert.equal(ratesFailureShown({ ...failed, held: false }, false), true);
  });
});

it('what the notice says can escape is what can (#795)', async () => {
  const { readFileSync } = await import('node:fs');
  const log = readFileSync(new URL('../privacyChangelogEntries.ts', import.meta.url), 'utf8');
  assert.ok(log.includes('and so can a dropped debt in an older link whose net worth was below zero.'));
  // Such an older link, cut after a debt: a whole debts-only link reads the same.
  assert.equal(open('m=r&f=EUR&p_EUR=125.0~functional&p_USD=62.5~net-debt').refused, undefined);
});
