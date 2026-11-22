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
  ]) {
    it(`an older one with ${what} is in doubt`, () => assert.equal(open(`m=r&f=EUR&${p}`).inDoubt, true));
  }
  for (const [what, p] of [
    ['no zero share', 'p_EUR=90.0~functional&p_CZK=10.0~low'],
    ['z and no zero share', 'p_EUR=90.0~functional~~z&p_CZK=10.0~net-debt~~z'],
    ['only the spending currency', 'p_EUR=0.0~functional'],
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
