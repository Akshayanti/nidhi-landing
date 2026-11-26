import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HISTORY_URL, INFLATION_URL, fromCompact, joinFromCompact, monthlySeriesFor, toCompact, toCompactSeries, type MonthlyFile, type WorldBankFile } from './history.ts';
import type { MonthlySeries } from './monthly.ts';

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
  const FETCHED = '2026-04-15';
  const bis = (months: Record<string, number>): MonthlySeries => ({ source: 'bis', months, asOf: FETCHED });
  const worldBank = (months: Record<string, number>): MonthlySeries => ({ source: 'worldBank', months, asOf: FETCHED });
  const monthlyFile = (countries: Record<string, Record<string, number>>, fetchedAt = FETCHED): MonthlyFile => ({
    source: 'm', fetchedAt, firstMonth: '2018-01',
    countries: Object.fromEntries(Object.entries(countries).map(([code, months]) => [code, { area: code, months }])),
  });

  it('a country with months is given the month, the step to it and whose index it is, after its years', () => {
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(JOINED)]), [2021, RATES, ['2026-03', 1.1, 'bis']]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [worldBank(JOINED)]), [2021, RATES, ['2026-03', 1.1, 'worldBank']]);
  });

  it('a country whose months are not joined is given the reason', () => {
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(flat(INDEX))]), [2021, RATES, 'no-later-month']);
    assert.deepEqual(toCompactSeries({ ...YEARS, '2025': 12 }, 'TST', [bis(JOINED)]), [2021, [10, 10, 10, 10, 12], 'mismatch']);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis({})]), [2021, RATES, 'incomplete']);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [{ ...bis(JOINED), asOf: '2026-10-01' }]), [2021, RATES, 'stale']);
  });

  it('the first source that joins is used; if none does, the first source’s reason is given', () => {
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(JOINED), worldBank(JOINED)]), [2021, RATES, ['2026-03', 1.1, 'bis']]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(flat(INDEX)), worldBank(JOINED)]), [2021, RATES, ['2026-03', 1.1, 'worldBank']]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(flat(INDEX)), worldBank({})]), [2021, RATES, 'no-later-month']);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [worldBank({}), bis(flat(INDEX))]), [2021, RATES, 'incomplete']);
  });

  it('without a code, without months, or with no source that has the country, the entry is its years alone; an empty country is still nothing', () => {
    assert.deepEqual(toCompactSeries(YEARS), [2021, RATES]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST'), [2021, RATES]);
    assert.deepEqual(toCompactSeries(YEARS, undefined, [bis(JOINED)]), [2021, RATES]);
    assert.deepEqual(toCompactSeries(YEARS, 'TST', []), [2021, RATES]);
    assert.equal(toCompactSeries({}, 'TST', [bis(JOINED)]), null);
  });

  it('a country’s months are taken from every file that has it, the BIS before the World Bank, their age measured from the day given', () => {
    const files = { worldBank: monthlyFile({ AAA: JOINED, BBB: JOINED }, '2026-04-20'), bis: monthlyFile({ AAA: flat(INDEX) }) };
    assert.deepEqual(monthlySeriesFor('AAA', files, '2026-05-01'), [{ source: 'bis', months: flat(INDEX), asOf: '2026-05-01' }, { source: 'worldBank', months: JOINED, asOf: '2026-05-01' }]);
    assert.deepEqual(monthlySeriesFor('BBB', files, FETCHED), [worldBank(JOINED)]);
    assert.deepEqual(monthlySeriesFor('CCC', files, FETCHED), []);
    assert.deepEqual(monthlySeriesFor('AAA', {}, FETCHED), []);
    assert.deepEqual(monthlySeriesFor('AAA', { bis: monthlyFile({ AAA: JOINED }) }, FETCHED), [bis(JOINED)]);
  });

  it('the whole file: the join for each country a monthly file has, as of the day of the build, and the day the months were last fetched', () => {
    const file: WorldBankFile = {
      source: 's', license: 'l', indicator: 'i', lastUpdated: '2026-10-08', fetchedAt: '2026-10-09',
      countries: { AAA: { iso2: 'AA', years: YEARS }, BBB: { iso2: 'BB', years: YEARS }, CCC: { iso2: 'CC', years: YEARS }, DDD: { iso2: 'DD', years: YEARS } },
    };
    const files = {
      bis: monthlyFile({ AAA: JOINED, CCC: flat(INDEX), ZZZ: JOINED }),
      worldBank: monthlyFile({ AAA: JOINED, DDD: JOINED }, '2026-04-20'),
    };
    assert.deepEqual(toCompact(file, files, '2026-05-01'), {
      updated: '2026-10-08',
      monthly: '2026-04-20',
      countries: { AAA: [2021, RATES, ['2026-03', 1.1, 'bis']], BBB: [2021, RATES], CCC: [2021, RATES, 'no-later-month'], DDD: [2021, RATES, ['2026-03', 1.1, 'worldBank']] },
    });
    // The same files built seven months after the latest month: the months are too old, though the files' own dates have not moved.
    assert.deepEqual(toCompact(file, files, '2026-10-01').countries, { AAA: [2021, RATES, 'stale'], BBB: [2021, RATES], CCC: [2021, RATES, 'no-later-month'], DDD: [2021, RATES, 'stale'] });
    // The newest fetch is given, whichever source it was.
    assert.equal(toCompact(file, { bis: monthlyFile({}, '2026-05-02'), worldBank: monthlyFile({}, '2026-04-20') }, FETCHED).monthly, '2026-05-02');
    assert.equal(toCompact(file, { bis: monthlyFile({ AAA: JOINED }) }, FETCHED).monthly, FETCHED);
    // Without monthly files, or with none in the set, the history is as it was, with no date for them.
    const plain = { updated: '2026-10-08', countries: { AAA: [2021, RATES], BBB: [2021, RATES], CCC: [2021, RATES], DDD: [2021, RATES] } };
    assert.deepEqual(toCompact(file), plain);
    assert.deepEqual(toCompact(file, {}, FETCHED), plain);
  });

  it('an index published by quarter is marked, and read back so', () => {
    const quarterly = flat(INDEX, { '2026-01': 177.1561, '2026-02': 177.1561, '2026-03': 177.1561 });
    assert.deepEqual(toCompactSeries(YEARS, 'TST', [bis(quarterly)]), [2021, RATES, ['2026-03', 1.1, 'bis', 'q']]);
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-03', 1.1, 'bis', 'q']]), { month: '2026-03', factor: 1.1, source: 'bis', quarterly: true });
    assert.equal('quarterly' in joinFromCompact([2021, RATES, ['2026-03', 1.1, 'bis']])!, false);
    for (const bad of ['Q', '', 1, true, null]) assert.equal(joinFromCompact([2021, RATES, ['2026-03', 1.1, 'bis', bad]]), null, JSON.stringify(bad));
  });

  it('is read back as the month, the step and the source, or as the reason', () => {
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-03', 1.1, 'bis']]), { month: '2026-03', factor: 1.1, source: 'bis' });
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-12', 0.5, 'worldBank']]), { month: '2026-12', factor: 0.5, source: 'worldBank' });
    assert.deepEqual(joinFromCompact([2021, RATES, ['2026-01', 1, 'bis']]), { month: '2026-01', factor: 1, source: 'bis' });
    for (const reason of ['mismatch', 'incomplete', 'no-later-month', 'stale', 'listed']) {
      assert.deepEqual(joinFromCompact([2021, RATES, reason]), { withheld: reason });
    }
    // The years are still read from an entry that carries a join.
    assert.deepEqual(fromCompact([2021, [10, 11], ['2026-03', 1.1, 'bis']]), { 2021: 10, 2022: 11 });
    assert.deepEqual(fromCompact([2021, [10, 11], 'mismatch']), { 2021: 10, 2022: 11 });
  });

  it('an entry with no join, or one that cannot be read, has none: the answer then ends at its last year', () => {
    for (const bad of [
      null, undefined, 'x', 5, {}, [], [2021], [2021, RATES], [2021, RATES, ['2026-03', 1.1, 'bis'], 0],
      [2021, RATES, null], [2021, RATES, 5], [2021, RATES, {}], [2021, RATES, 'other'], [2021, RATES, ''],
      [2021, RATES, []], [2021, RATES, ['2026-03']], [2021, RATES, ['2026-03', 1.1]], [2021, RATES, ['2026-03', 1.1, 'bis', 2]], [2021, RATES, ['2026-03', 1.1, 'bis', 'q', 1]],
      [2021, RATES, [202603, 1.1, 'bis']], [2021, RATES, ['2026-3', 1.1, 'bis']], [2021, RATES, ['2026-13', 1.1, 'bis']], [2021, RATES, ['2026-00', 1.1, 'bis']],
      [2021, RATES, ['x2026-03', 1.1, 'bis']], [2021, RATES, ['2026-03x', 1.1, 'bis']], [2021, RATES, ['26-03', 1.1, 'bis']],
      [2021, RATES, ['2026-03', '1.1', 'bis']], [2021, RATES, ['2026-03', 0, 'bis']], [2021, RATES, ['2026-03', -1, 'bis']],
      [2021, RATES, ['2026-03', NaN, 'bis']], [2021, RATES, ['2026-03', Infinity, 'bis']],
      [2021, RATES, ['2026-03', 1.1, 'imf']], [2021, RATES, ['2026-03', 1.1, '']], [2021, RATES, ['2026-03', 1.1, 5]], [2021, RATES, ['2026-03', 1.1, null]],
    ]) {
      assert.equal(joinFromCompact(bad), null, JSON.stringify(bad));
    }
  });
});
