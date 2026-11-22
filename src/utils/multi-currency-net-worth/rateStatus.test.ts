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
