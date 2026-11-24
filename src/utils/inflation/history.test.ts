import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HISTORY_URL, INFLATION_URL, fromCompact, toCompact, toCompactSeries, type WorldBankFile } from './history.ts';

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
        ZZZ: { iso2: 'ZZ', years: {} },
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

  it('orders the years by number, however the keys were written', () => {
    assert.deepEqual(toCompactSeries({ '2003': 3, '2001': 1 }), [2001, [1, null, 3]]);
    // Keys that are not plain whole numbers keep the order they were written in, so they need sorting.
    assert.deepEqual(toCompactSeries({ '-1': 1, '-3': 2 }), [-3, [2, null, 1]]);
    assert.deepEqual(toCompactSeries({ '-3': 1, '2': 2, '-1': 3 }), [-3, [1, null, 3, null, null, 2]]);
  });

  it('a year of each kind of bad figure is a gap, and the rest keep their years', () => {
    assert.deepEqual(fromCompact([2000, [null, 1.5, '2', -Infinity, 0, true]]), { 2001: 1.5, 2004: 0 });
    assert.deepEqual(fromCompact([2000, []]), {});
    assert.deepEqual(fromCompact([null, [1]]), {});
    assert.deepEqual(fromCompact([true, [1]]), {});
    assert.deepEqual(fromCompact([NaN, [1]]), {});
    assert.deepEqual(fromCompact([2000, { 0: 1, length: 1 }]), {});
  });

  it('is fetched from the address the site serves it at', () => {
    assert.equal(HISTORY_URL, '/data/inflation-history.json');
    assert.ok(existsSync(new URL(`../../pages${HISTORY_URL}.ts`, import.meta.url)), 'no page writes the history file at that address');
    assert.equal(INFLATION_URL, '/free/inflation-calculator/');
  });
});
