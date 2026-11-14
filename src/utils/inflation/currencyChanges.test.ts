/**
 * The table of currency changes, and which of them a span of years crosses.
 * The ratios themselves were read from the sources named in the table; these
 * tests pin the ones a reader is most likely to meet, and the table's shape.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { COUNTRY_CURRENCY } from './countries.ts';
import { CURRENCY_CHANGES, currencyChangesBetween } from './currencyChanges.ts';

const data = JSON.parse(readFileSync(new URL('../../data/inflation/worldbank.json', import.meta.url), 'utf8')) as {
  countries: Record<string, { years: Record<string, number | null> }>;
};
const span = (code: string) => {
  const years = Object.entries(data.countries[code].years)
    .filter(([, v]) => v !== null)
    .map(([y]) => Number(y));
  return { first: Math.min(...years), last: Math.max(...years) };
};

describe('currency changes: the table', () => {
  it('lists only countries whose currency the calculator switches to, and that have figures', () => {
    for (const code of Object.keys(CURRENCY_CHANGES)) {
      assert.ok(COUNTRY_CURRENCY[code], `${code} is not a country the calculator shows in its own currency`);
      assert.ok(data.countries[code], `${code} has no inflation figures`);
    }
  });

  it('has positive ratios, none at par, in year order, each after the first year with a figure', () => {
    for (const [code, changes] of Object.entries(CURRENCY_CHANGES)) {
      assert.ok(changes.length > 0, code);
      const { first } = span(code);
      changes.forEach((c, i) => {
        assert.ok(Number.isFinite(c.ratio) && c.ratio > 0 && c.ratio !== 1, `${code} ${c.year}: ${c.ratio}`);
        assert.ok(Number.isInteger(c.year) && c.year > first, `${code} ${c.year} is not after its first figure (${first})`);
        if (i > 0) assert.ok(c.year > changes[i - 1].year, `${code}: ${c.year} is out of order`);
      });
    }
  });

  it('gives every euro member that changed inside its figures a changeover', () => {
    // The euro area as a whole, and countries that took the euro before their figures begin, have none.
    const without = Object.entries(COUNTRY_CURRENCY)
      .filter(([code, currency]) => currency === 'EUR' && data.countries[code] && !CURRENCY_CHANGES[code])
      .map(([code]) => code)
      .sort();
    assert.deepEqual(without, ['EMU', 'MNE', 'SMR', 'XKX']);
  });
});

describe('currency changes: what a span of years crosses', () => {
  it('Turkey from 1990: six zeros, so 249 million reads as 249', () => {
    const { last } = span('TUR');
    const c = currencyChangesBetween('TUR', 1990, last);
    assert.deepEqual(c.crossed, [{ year: 2005, ratio: 1_000_000 }]);
    assert.equal(c.ratio, 1_000_000);
    assert.deepEqual(c.later, []);
    assert.equal(Math.round(249_000_000 / c.ratio), 249);
  });

  it('Italy from 1990: lire to euros at 1,936.27', () => {
    const c = currencyChangesBetween('ITA', 1990, span('ITA').last);
    assert.equal(c.ratio, 1936.27);
    assert.equal(c.crossed[0].year, 2002);
  });

  it('a change is crossed when the first year is before it, not in it', () => {
    assert.equal(currencyChangesBetween('TUR', 2004, 2025).crossed.length, 1);
    assert.equal(currencyChangesBetween('TUR', 2005, 2025).crossed.length, 0);
    assert.equal(currencyChangesBetween('TUR', 2005, 2025).ratio, 1);
    // A price remembered from 2000 is in lire; one from 2002 is in euros.
    assert.equal(currencyChangesBetween('ITA', 2001, 2025).crossed.length, 1);
    assert.equal(currencyChangesBetween('ITA', 2002, 2025).crossed.length, 0);
  });

  it('Bulgaria: the 1999 change is crossed, and the euro of 2026 comes after the figures end', () => {
    const { last } = span('BGR');
    assert.equal(last, 2025);
    const c = currencyChangesBetween('BGR', 1990, last);
    assert.deepEqual(c.crossed, [{ year: 1999, ratio: 1000 }]);
    assert.deepEqual(c.later, [{ year: 2026, ratio: 1.95583 }]);
    const recent = currencyChangesBetween('BGR', 2010, last);
    assert.equal(recent.ratio, 1);
    assert.equal(recent.later.length, 1);
  });

  it('Brazil from 1985: four changes multiply to 2.75 million million', () => {
    const c = currencyChangesBetween('BRA', 1985, span('BRA').last);
    assert.deepEqual(c.crossed.map((x) => x.year), [1986, 1989, 1993, 1994]);
    assert.equal(c.ratio, 2.75e12);
    // From 1990 only the last two are crossed.
    assert.equal(currencyChangesBetween('BRA', 1990, 2025).ratio, 2_750_000);
  });

  it('Croatia from 1986: the dinar of 1990, the kuna and the euro', () => {
    const c = currencyChangesBetween('HRV', 1986, span('HRV').last);
    assert.deepEqual(c.crossed.map((x) => x.year), [1990, 1994, 2023]);
    assert.ok(Math.abs(c.ratio - 10_000 * 1000 * 7.5345) < 1e-3);
  });

  it('a pound that became two dollars has a ratio of a half', () => {
    assert.equal(currencyChangesBetween('AUS', 1960, 2025).ratio, 0.5);
    assert.equal(currencyChangesBetween('NZL', 1966, 2025).ratio, 0.5);
  });

  it('a country with no change, or not in the table, crosses nothing', () => {
    for (const code of ['USA', 'IND', 'CHE', 'ARG', 'nowhere']) {
      assert.deepEqual(currencyChangesBetween(code, 1960, 2025), { crossed: [], ratio: 1, later: [] });
    }
  });
});
