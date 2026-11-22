/**
 * One limit of rows in the form, the CSV import, a link and the language
 * switch, and a list that arrives incomplete is refused whole (#794, #795):
 * a total over part of a list looks like the total of all of it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as url from './url.ts';
import { aggregate, type AssetRow } from './math.ts';

const { decodeFromQueryString, encodeFullData, encodeShared } = url;
const api = url as unknown as {
  MAX_ROWS?: number;
  redactedRefusal?: (rows: AssetRow[], result: ReturnType<typeof aggregate>) => { reason: string; row: number; count: number } | null;
};
const refused = (qs: string) => (decodeFromQueryString(qs) as { refused?: string }).refused;

const RATES = { EUR: 1, USD: 1.1, INR: 90 };
const list = (count: number): AssetRow[] => Array.from({ length: count }, (_, i) => ({
  name: `Row ${i + 1}`, value: String(1000 + i), currency: ['EUR', 'USD', 'INR'][i % 3], type: i % 7 === 6 ? 'liability' : 'asset',
}));
const full = (rows: AssetRow[]) => encodeShared(rows, aggregate(rows, 'EUR', RATES).positions, 'EUR', 'full');
const without = (qs: string, key: string) => {
  const p = new URLSearchParams(qs);
  assert.ok(p.has(key), `${key} is in the link`);
  p.delete(key);
  return p.toString();
};

describe('no row is dropped (#794)', () => {
  it('the limit is 500', () => assert.equal(api.MAX_ROWS, 500));
  for (const count of [1, 2, 3, 50, 51, 120, 500]) {
    it(`${count} rows cross a language switch whole`, () => {
      const rows = list(count);
      const arrived = decodeFromQueryString(encodeFullData(rows, 'EUR'));
      assert.deepEqual(arrived.rows.filter((r) => r.value !== ''), rows);
      assert.equal(refused(encodeFullData(rows, 'EUR')), undefined);
    });

    it(`${count} rows cross a full link whole`, () => {
      const rows = list(count);
      assert.deepEqual(decodeFromQueryString(full(rows)).rows.filter((r) => r.value !== ''), rows);
      assert.equal(refused(full(rows)), undefined);
    });
  }
});

describe('a list that is not whole is refused whole', () => {
  const own = encodeFullData(list(5), 'EUR');
  const shared = full(list(5));
  const over = encodeFullData(list(501), 'EUR');
  const cases: Array<[string, string, string]> = [
    ['a switched list missing its last row', without(own, 'a5'), 'transfer'],
    ['a switched list missing a middle row', without(own, 'a3'), 'transfer'],
    ['a switched list with a row more than it says', `${own}&a6=Extra~9`, 'transfer'],
    ['a switched list of two, cut after the first', without(encodeFullData(list(2), 'EUR'), 'a2'), 'transfer'],
    ['a switched list over the limit', over, 'transfer'],
    ['a count that is not a number', own.replace('n=5', 'n=x'), 'transfer'],
    ['an old link that says 80 and holds 50', `n=80&${Array.from({ length: 50 }, (_, i) => `a${i + 1}=X~${i + 1}`).join('&')}`, 'transfer'],
    ['a full link missing a row', without(shared, 'a4'), 'link'],
    ['a full link missing a currency’s total', without(shared, 'p_INR'), 'link'],
    ['a full link with a total that cannot be read', shared.replace(/p_USD=[^&]+/, 'p_USD=x'), 'link'],
    ['a full link over the limit', full(list(501)), 'link'],
    ['an old full link that says 80 and holds 50', `${without(shared, 'n')}&n=80`, 'link'],
    ['a redacted link with no shares', 'm=r&f=EUR', 'link'],
  ];
  for (const [what, qs, why] of cases) {
    it(what, () => {
      assert.equal(refused(qs), why);
      const arrived = decodeFromQueryString(qs);
      assert.ok(arrived.rows.every((r) => r.value === ''), 'none of it is loaded');
      assert.equal(arrived.sharedPositions, undefined);
      assert.equal(arrived.isReadOnly, false);
    });
  }

  it('a blank page that changed currency is whole', () => {
    const blank = [{ name: '', value: '', currency: 'EUR', type: 'asset' as const }];
    assert.equal(refused(encodeFullData(blank, 'INR')), undefined);
  });

  it('a redacted link has no rows to count', () => {
    const rows = list(120);
    assert.equal(refused(encodeShared(rows, aggregate(rows, 'EUR', RATES).positions, 'EUR', 'redacted')), undefined);
  });
});

describe('a full link keeps a row it could not read', () => {
  for (const at of [0, 60]) {
    it(`row ${at + 1}`, () => {
      const rows = list(61);
      rows[at].value = '7qx';
      const qs = full(rows);
      assert.ok(!qs.includes('7qx'));
      assert.equal(refused(qs), undefined);
      assert.equal(decodeFromQueryString(qs).rows[at]?.value, 'NaN');
    });
  }

  it('with no other row to total', () => {
    const qs = full([{ name: 'Flat', value: '7qx', currency: 'USD', type: 'asset' }]);
    assert.equal(refused(qs), undefined);
    assert.equal(decodeFromQueryString(qs).rows[0].value, 'NaN');
  });
});

describe('a redacted link is refused (#795)', () => {
  const refusal = (rows: AssetRow[], rates: Record<string, number>) => api.redactedRefusal?.(rows, aggregate(rows, 'EUR', rates)) ?? null;

  it('not for a whole list', () => {
    assert.equal(typeof api.redactedRefusal, 'function');
    assert.equal(refusal(list(6), RATES), null);
  });
  it('for unreadable rows first, at the first of them', () => {
    const rows = list(6);
    rows[2].value = 'x';
    rows[4].value = 'y';
    assert.deepEqual(refusal(rows, { EUR: 1 }), { reason: 'rows', row: 2, count: 2 });
  });
  it('for a missing rate, at the first row that needs it', () => {
    assert.deepEqual(refusal(list(6), { EUR: 1, USD: 1.1 }), { reason: 'rates', row: 2, count: 1 });
  });
});

describe('a tiny amount is not marked as unreadable (#789)', () => {
  it('through the language switch', async () => {
    const { canonicalNumber } = await import('../shared/parseLocaleNumber.ts');
    const { encodeFullData, decodeFromQueryString } = await import('./url.ts');
    const sent = encodeFullData([{ name: 'x', value: canonicalNumber('0.0000001', 'en'), currency: 'EUR', type: 'asset' }], 'EUR');
    assert.equal(decodeFromQueryString(sent).rows[0].value, '0.0000001');
  });
});
