/**
 * Unit tests for scripts/lib/inflation-data.mjs.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildDataset, parseCountries, parseIndicator, round2, sameData, serializeDataset, splitPage } from './inflation-data.mjs';

const meta = (total, extra = {}) => ({ page: 1, pages: 1, per_page: 20000, total, sourceid: '2', lastupdated: '2026-10-08', ...extra });
const row = (iso3, date, value) => ({
  indicator: { id: 'FP.CPI.TOTL.ZG', value: 'Inflation, consumer prices (annual %)' },
  country: { id: 'XX', value: 'Somewhere' },
  countryiso3code: iso3,
  date,
  value,
});
const country = (id, iso2Code, aggregate = false) => ({
  id,
  iso2Code,
  name: id,
  region: aggregate ? { id: 'NA', iso2code: 'NA', value: 'Aggregates' } : { id: 'SAS', iso2code: '8S', value: 'South Asia' },
});

/** Enough real countries to pass the truncation check, plus the required ones. */
function fixture({ extraRows = [], extraCountries = [] } = {}) {
  const fillers = Array.from({ length: 150 }, (_, i) => `Q${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`);
  const countries = [
    country('IND', 'IN'),
    country('USA', 'US'),
    country('EMU', 'XC', true),
    country('SAS', '8S', true),
    ...fillers.map((c) => country(c, c.slice(1))),
    ...extraCountries,
  ];
  const rows = [
    row('IND', '2024', 4.953),
    row('IND', '2025', 2.104),
    row('USA', '2025', 2.7),
    row('EMU', '2025', 2.1),
    row('SAS', '2025', 5.5),
    ...fillers.map((c) => row(c, '2025', 1)),
    ...extraRows,
  ];
  return {
    countryPages: [[meta(countries.length), countries]],
    indicatorPages: [[meta(rows.length), rows]],
  };
}

describe('splitPage', () => {
  it('rejects an API error and a malformed response', () => {
    assert.throws(() => splitPage([{ message: [{ id: '120', value: 'Invalid value' }] }]), /API error/);
    assert.throws(() => splitPage({ not: 'an array' }), /expected an array/);
    assert.throws(() => splitPage([meta(1), 'rows']), /array of rows/);
    assert.throws(() => splitPage([{ page: 1 }, []]), /pages/);
  });
});

describe('parseIndicator', () => {
  it('keeps real countries and the euro area, drops other aggregates and empty years', () => {
    const { countryPages, indicatorPages } = fixture({ extraRows: [row('IND', '2023', null)] });
    const out = parseIndicator(indicatorPages, parseCountries(countryPages));
    assert.equal(out.lastUpdated, '2026-10-08');
    assert.deepEqual(out.countries.IND, { iso2: 'IN', years: { 2024: 4.95, 2025: 2.1 } });
    assert.deepEqual(out.countries.EMU, { iso2: 'XC', years: { 2025: 2.1 } });
    assert.equal(out.countries.SAS, undefined);
  });

  it('drops a code that is not ISO3, or a country without an ISO2 code', () => {
    const { countryPages, indicatorPages } = fixture({
      extraCountries: [country('XKX', 'XK'), country('ZZZ', '')],
      extraRows: [row('', '2025', 3), row('ZZZ', '2025', 3), row('XKX', '2025', 4.4)],
    });
    const out = parseIndicator(indicatorPages, parseCountries(countryPages));
    assert.equal(out.countries.ZZZ, undefined);
    assert.deepEqual(out.countries.XKX, { iso2: 'XK', years: { 2025: 4.4 } });
  });

  it('keeps a gap as a missing year', () => {
    const { countryPages, indicatorPages } = fixture({ extraRows: [row('USA', '2022', 8), row('USA', '2023', null), row('USA', '2024', 2.95)] });
    const out = parseIndicator(indicatorPages, parseCountries(countryPages));
    assert.deepEqual(Object.keys(out.countries.USA.years), ['2022', '2024', '2025']);
  });

  it('fails loudly on a truncated or reshaped response', () => {
    const { countryPages, indicatorPages } = fixture();
    const countries = parseCountries(countryPages);
    const [[m, rows]] = indicatorPages;
    assert.throws(() => parseIndicator([[{ ...m, total: rows.length + 5 }, rows]], countries), /metadata says/);
    assert.throws(() => parseIndicator([[m, rows.map((r) => ({ ...r, indicator: { id: 'NY.GDP' } }))]], countries), /unexpected indicator row/);
    assert.throws(() => parseIndicator([[m, rows.map((r) => ({ ...r, value: '3.1' }))]], countries), /non-numeric/);
    assert.throws(() => parseIndicator([[{ ...m, lastupdated: undefined }, rows]], countries), /lastupdated/);
    const few = rows.filter((r) => !r.countryiso3code.startsWith('Q'));
    assert.throws(() => parseIndicator([[{ ...m, total: few.length }, few]], countries), /only \d+ countries/);
    const noIndia = rows.filter((r) => r.countryiso3code !== 'IND');
    assert.throws(() => parseIndicator([[{ ...m, total: noIndia.length }, noIndia]], countries), /no data for IND/);
  });

  it('reads every page of a paged response', () => {
    const { countryPages, indicatorPages } = fixture();
    const [[m, rows]] = indicatorPages;
    const half = Math.ceil(rows.length / 2);
    const paged = [
      [{ ...m, pages: 2 }, rows.slice(0, half)],
      [{ ...m, page: 2, pages: 2 }, rows.slice(half)],
    ];
    const out = parseIndicator(paged, parseCountries(countryPages));
    assert.ok(out.countries.USA && out.countries.IND);
  });
});

describe('round2', () => {
  it('rounds to two decimals and never writes a negative zero', () => {
    assert.equal(round2(3.14159), 3.14);
    assert.equal(round2(-0.001), 0);
    assert.ok(!Object.is(round2(-0.001), -0));
    assert.equal(round2(219.883929), 219.88);
  });
});

describe('serializeDataset and sameData', () => {
  it('serialises the same data identically whatever the key order', () => {
    const a = buildDataset({ lastUpdated: '2026-10-08', countries: { USA: { iso2: 'US', years: { 2025: 2.7, 2024: 2.95 } }, IND: { iso2: 'IN', years: { 2025: 2.1 } } } }, '2026-10-12');
    const b = buildDataset({ lastUpdated: '2026-10-08', countries: { IND: { years: { 2025: 2.1 }, iso2: 'IN' }, USA: { years: { 2024: 2.95, 2025: 2.7 }, iso2: 'US' } } }, '2026-10-12');
    assert.equal(serializeDataset(a), serializeDataset(b));
    assert.ok(serializeDataset(a).endsWith('}\n'));
    assert.equal(JSON.parse(serializeDataset(a)).license, 'CC BY 4.0');
  });

  it('ignores fetchedAt when comparing, and nothing else', () => {
    const a = buildDataset({ lastUpdated: '2026-10-08', countries: { IND: { iso2: 'IN', years: { 2025: 2.1 } } } }, '2026-10-12');
    const later = { ...a, fetchedAt: '2026-11-12' };
    assert.equal(sameData(a, later), true);
    assert.equal(sameData(a, { ...later, lastUpdated: '2026-11-01' }), false);
    assert.equal(sameData(a, null), false);
  });
});
