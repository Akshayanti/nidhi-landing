/**
 * The exchange-rate request and what is reported when it fails (rates.ts).
 * The privacy notice says the request names the spending currency and
 * nothing else; the failure event carries a reason from a fixed list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES } from '../loan/math.ts';
import { decodeFromQueryString } from './url.ts';
import { FRANKFURTER_RATES, RATES_ERROR_REASONS, RatesError, httpErrorReason, ratesErrorReason, ratesRequestUrl } from './rates.ts';

describe('ratesRequestUrl', () => {
  it('names the currency and nothing else, for every currency the tools offer', () => {
    for (const { code } of CURRENCIES) {
      assert.equal(ratesRequestUrl(code), `${FRANKFURTER_RATES}?base=${code}`);
    }
  });

  it('builds no address for anything that is not one of them', () => {
    for (const base of ['', 'ZZZ', 'eur', 'EUR&base=USD#', 'EUR ', '<b>x</b>', 'E'.repeat(3000)]) {
      assert.equal(ratesRequestUrl(base), null, base.slice(0, 20));
    }
  });

  it('whatever a link says, the request carries a known currency', () => {
    const known = new Set(CURRENCIES.map((c) => c.code));
    for (const f of ['EUR%26base%3DUSD%23', '%3Cb%3Ex%3C%2Fb%3E', 'ZZZ', 'usd', 'X'.repeat(3000), 'INR']) {
      for (const link of [`f=${f}&a1=Cash~10`, `m=f&f=${f}&a1=Cash~10`, `m=r&f=${f}&p_USD=50~low`]) {
        const { functionalCurrency } = decodeFromQueryString(link);
        assert.ok(known.has(functionalCurrency), `${link.slice(0, 40)} gave ${functionalCurrency.slice(0, 20)}`);
        assert.equal(ratesRequestUrl(functionalCurrency), `${FRANKFURTER_RATES}?base=${functionalCurrency}`);
      }
    }
  });
});

describe('ratesErrorReason', () => {
  const allowed = new Set<string>(RATES_ERROR_REASONS);

  it('is always one of the fixed reasons, never the error’s own text', () => {
    const secret = 'https://proxy.example/?account=12345 said no';
    for (const err of [
      new Error(secret), new TypeError(secret), new SyntaxError(secret), new RangeError(secret),
      { message: secret }, secret, null, undefined, 42, new RatesError('parse'), new RatesError('http_5xx'),
    ]) {
      const reason = ratesErrorReason(err);
      assert.ok(allowed.has(reason), reason);
      assert.doesNotMatch(reason, /proxy|12345/);
    }
  });

  it('tells the kinds apart', () => {
    assert.equal(ratesErrorReason(new TypeError('Failed to fetch')), 'network');
    assert.equal(ratesErrorReason(new SyntaxError('Unexpected token <')), 'parse');
    assert.equal(ratesErrorReason(new RatesError('unknown_currency')), 'unknown_currency');
    assert.equal(ratesErrorReason(new Error('anything')), 'other');
    assert.equal(httpErrorReason(404), 'http_4xx');
    assert.equal(httpErrorReason(429), 'http_4xx');
    assert.equal(httpErrorReason(503), 'http_5xx');
    assert.equal(httpErrorReason(302), 'http_other');
  });
});
