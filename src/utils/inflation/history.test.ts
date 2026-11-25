import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HISTORY_URL, INFLATION_URL, fromCompact, joinFromCompact, toCompact, toCompactSeries, type MonthlyFile, type WorldBankFile } from './history.ts';

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
    for (const bad of [null, undefined, 'x', 5, {}, [], [1960], [1960, 'x'], ['1960', [1]], [1960.5, [1]], [1960, [1], 2, 3], [1960]]) {
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

describe('the monthly end a country’s entry carries', () => {
  /** Every month of each year at that year's one value: 10% a year from 2020 to 2025. */
  const flat = (byYear: Record<number, number>, more: Record<string, number> = {}) => {
    const months: Record<string, number> = {};
    for (const [year, value] of Object.entries(byYear)) for (let m = 1; m <= 12; m++) months[`${year}-${String(m).padStart(2, '0')}`] = value;
    return { ...months, ...more };
  };
  const INDEX = { 2020: 100, 2021: 110, 2022: 121, 2023: 133.1, 2024: 146.41, 2025: 161.051 };
  const YEARS = { '2021': 10, '2022': 10, '2023': 10, '2024': 10, '2025': 10 };
  const RATES = [10, 10, 10, 10, 10];
  // March 2026 is 10% above the 2025 average.
  const JOINED = flat(INDEX, { '2026-03': 177.1561 });

  it('a country with months is given the month and the step to it, after its years', () => {
    assert.deepEqual(toCompactSeries(YEARS, 'TST', JOINED), [2021, RATES, ['2026-03', 1.1]]);
  });

  it('a country whose months are not joined is given the reason', () => {
    assert.deepEqual(toCompactSeries(YEARS, 'TST', flat(INDEX)), [2021, RATES, 'no-later-month']);
    assert.deepEqual(toCompactSeries({ ...YEARS, '2025': 12 }, 'TST', JOINED), [2021, [10, 10, 10, 10, 12], 'mismatch']);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', {}), [2021, RATES, 'incomplete']);
  });

  it('without a code or without months, the entry is its years alone; an empty country is still nothing', () => {
    assert.deepEqual(toCompactSeries(YEARS), [2021, RATES]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST'), [2021, RATES]);
    assert.deepEqual(toCompactSeries(YEARS, undefined, JOINED), [2021, RATES]);
    assert.equal(toCompactSeries({}, 'TST', JOINED), null);
  });

  it('the whole file: the join for each country the monthly file has, and the day its months were fetched', () => {
    const file: WorldBankFile = {
      source: 's', license: 'l', indicator: 'i', lastUpdated: '2026-10-08', fetchedAt: '2026-10-09',
      countries: { AAA: { iso2: 'AA', years: YEARS }, BBB: { iso2: 'BB', years: YEARS }, CCC: { iso2: 'CC', years: YEARS } },
    };
    const monthly: MonthlyFile = {
      source: 'm', terms: 't', dataflow: 'd', unit: '628', fetchedAt: '2026-11-25', firstMonth: '2018-01',
      countries: { AAA: { area: 'AA', months: JOINED }, CCC: { area: 'CC', months: flat(INDEX) }, ZZZ: { area: 'ZZ', months: JOINED } },
    };
    assert.deepEqual(toCompact(file, monthly), {
      updated: '2026-10-08',
      monthly: '2026-11-25',
      countries: { AAA: [2021, RATES, ['2026-03', 1.1]], BBB: [2021, RATES], CCC: [2021, RATES, 'no-later-month'] },
    });
    // Without a monthly file the history is as it was, with no date for one.
    assert.deepEqual(toCompact(file), { updated: '2026-10-08', countries: { AAA: [2021, RATES], BBB: [2021, RATES], CCC: [2021, RATES] } });
  });

  it('is read back as the month and the step, or as the reason', () => {
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-03', 1.1]]), { month: '2026-03', factor: 1.1 });
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-12', 0.5]]), { month: '2026-12', factor: 0.5 });
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-01', 1]]), { month: '2026-01', factor: 1 });
    for (const reason of ['mismatch', 'incomplete', 'no-later-month', 'listed']) {
      assert.deepEqual(joinFromCompact([2021, RATES, reason]), { withheld: reason });
    }
    // The years are still read from an entry that carries a join.
    assert.deepEqual(fromCompact([2021, [10, 11], ['2026-03', 1.1]]), { 2021: 10, 2022: 11 });
    assert.deepEqual(fromCompact([2021, [10, 11], 'mismatch']), { 2021: 10, 2022: 11 });
  });

  it('an entry with no join, or one that cannot be read, has none: the answer then ends at its last year', () => {
    for (const bad of [
      null, undefined, 'x', 5, {}, [], [2021], [2021, RATES], [2021, RATES, ['2026-03', 1.1], 0],
      [2021, RATES, null], [2021, RATES, 5], [2021, RATES, {}], [2021, RATES, 'other'], [2021, RATES, ''],
      [2021, RATES, []], [2021, RATES, ['2026-03']], [2021, RATES, ['2026-03', 1.1, 2]],
      [2021, RATES, [202603, 1.1]], [2021, RATES, ['2026-3', 1.1]], [2021, RATES, ['2026-13', 1.1]], [2021, RATES, ['2026-00', 1.1]],
      [2021, RATES, ['x2026-03', 1.1]], [2021, RATES, ['2026-03x', 1.1]], [2021, RATES, ['26-03', 1.1]],
      [2021, RATES, ['2026-03', '1.1']], [2021, RATES, ['2026-03', 0]], [2021, RATES, ['2026-03', -1]],
      [2021, RATES, ['2026-03', NaN]], [2021, RATES, ['2026-03', Infinity]],
    ]) {
      assert.equal(joinFromCompact(bad), null, JSON.stringify(bad));
    }
  });
});
