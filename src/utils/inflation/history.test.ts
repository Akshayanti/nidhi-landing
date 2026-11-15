import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fromCompact, toCompact, toCompactSeries, type WorldBankFile } from './history.ts';

describe('the compact inflation history', () => {
  it('a country becomes its first year and a dense list, null for a year with no figure', () => {
    assert.deepEqual(toCompactSeries({ '1962': 3.5, '1960': 1.78, '1963': -0.4 }), [1960, [1.78, null, 3.5, -0.4]]);
    assert.deepEqual(toCompactSeries({ '2020': 0 }), [2020, [0]]);
    assert.equal(toCompactSeries({}), null);
  });

  it('the whole file: countries in code order, empty ones left out, dated by the source', () => {
    const file: WorldBankFile = {
      source: 's', license: 'l', indicator: 'i', lastUpdated: '2026-10-08', fetchedAt: '2026-10-09',
      countries: {
        IND: { iso2: 'IN', years: { '1960': 1.78, '1961': 1.7 } },
        CZE: { iso2: 'CZ', years: { '1992': 11.1 } },
        XXX: { iso2: 'XX', years: {} },
      },
    };
    const compact = toCompact(file);
    assert.equal(compact.updated, '2026-10-08');
    assert.deepEqual(Object.keys(compact.countries), ['CZE', 'IND']);
    assert.deepEqual(compact.countries.IND, [1960, [1.78, 1.7]]);
  });

  it('reads back to the same years, gaps as missing keys', () => {
    const years = { '1960': 1.78, '1962': 3.5, '1963': 0 };
    assert.deepEqual(fromCompact(toCompactSeries(years)), { 1960: 1.78, 1962: 3.5, 1963: 0 });
  });

  it('a malformed entry gives an empty series instead of a crash', () => {
    for (const bad of [null, undefined, 'x', 5, {}, [], [1960], [1960, 'x'], ['1960', [1]], [1960.5, [1]], [1960, [1], 2]]) {
      assert.deepEqual(fromCompact(bad), {}, JSON.stringify(bad));
    }
    assert.deepEqual(fromCompact([1960, [1, 'x', null, NaN, Infinity, 2]]), { 1960: 1, 1965: 2 });
  });
});
