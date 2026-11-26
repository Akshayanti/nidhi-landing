/**
 * Unit tests for scripts/lib/publishing/inflation-data.mjs.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CHANGE_LIMITS, buildDataset, compareDatasets, comparisonDigest, dryRunDataset, isLargeChange, parseCountries, parseIndicator, round2, sameData, serializeDataset, splitPage, summarizeComparison } from './inflation-data.mjs';

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

  it('refuses pages from two different World Bank updates', () => {
    const { countryPages, indicatorPages } = fixture();
    const [[m, rows]] = indicatorPages;
    const half = Math.ceil(rows.length / 2);
    const mixed = [
      [{ ...m, pages: 2 }, rows.slice(0, half)],
      [{ ...m, page: 2, pages: 2, lastupdated: '2026-11-05' }, rows.slice(half)],
    ];
    assert.throws(() => parseIndicator(mixed, parseCountries(countryPages)), /different updates/);
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

describe('a refresh is compared with the committed data (#446)', () => {
  const data = (countries, lastUpdated = '2026-10-08') => ({ lastUpdated, countries });
  const c = (years) => ({ iso2: 'XX', years });
  const many = (n, years) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`C${String(i).padStart(3, '0')}`, c(years(i))]));
  const span = (from, to, value) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, value(from + i)]));

  it('calls a revision large only when it is big in points and in proportion', () => {
    assert.equal(isLargeChange(3.1, 3.4), false);
    assert.equal(isLargeChange(4, 11), true);
    assert.equal(isLargeChange(2000, 2004), false, 'four points on two thousand is a revision');
    assert.equal(isLargeChange(2, 6.9), false, 'under five points');
    assert.equal(isLargeChange(-2, 9), true);
    assert.equal(isLargeChange(100, 10), true);
  });

  it('lists what was added, removed and changed', () => {
    const before = data({ AAA: c({ 2024: 3, 2025: 4 }), BBB: c({ 2024: 1, 2025: 2 }), CCC: c({ 2024: 5, 2025: 6 }) });
    const after = data({ AAA: c({ 2024: 3.2, 2025: 4, 2026: 3 }), CCC: c({ 2025: 60 }), DDD: c({ 2025: 1 }) }, '2026-11-11');
    const cmp = compareDatasets(before, after);
    assert.deepEqual(cmp.countriesRemoved, ['BBB']);
    assert.deepEqual(cmp.countriesAdded, ['DDD']);
    assert.equal(cmp.observationsLostWithCountries, 2);
    assert.equal(cmp.observationsGainedWithCountries, 1);
    assert.deepEqual(cmp.yearsRemoved, [{ code: 'CCC', year: '2024' }]);
    assert.deepEqual(cmp.yearsAdded, [{ code: 'AAA', year: '2026' }]);
    assert.deepEqual(cmp.changed.map((x) => `${x.code} ${x.year} ${x.large}`), ['AAA 2024 false', 'CCC 2025 true']);
    assert.deepEqual(cmp.updated, { before: '2026-10-08', after: '2026-11-11' });
  });

  it('lets an ordinary refresh through: a new year, a few recent values revised', () => {
    const before = data(many(60, () => span(2000, 2025, () => 5)));
    const after = data(many(60, (i) => ({ ...span(2000, 2025, (y) => (y >= 2024 && i < 30 ? 5.1 : 5)), 2026: 4 })), '2026-11-11');
    const cmp = compareDatasets(before, after);
    assert.equal(cmp.changed.length, 60);
    assert.deepEqual(cmp.over, []);
  });

  it('refuses any country removed and any year removed from a country that remains', () => {
    const base = data(many(60, () => span(2000, 2025, () => 5)));
    assert.match(compareDatasets(base, data(many(59, () => span(2000, 2025, () => 5)))).over.join(), /1 countries removed \(limit 0\)/);
    assert.match(compareDatasets(base, data(many(60, (i) => span(i === 0 ? 2001 : 2000, 2025, () => 5)))).over.join(), /1 years removed from countries that remain \(limit 0\)/);
  });

  it('refuses more large changes than the limit, and passes exactly the limit', () => {
    const base = data(many(60, () => span(2001, 2025, () => 5)));
    const moved = (n) => compareDatasets(base, data(many(60, (i) => span(2001, 2025, (y) => (y === 2025 && i < n ? 500 : 5)))));
    assert.deepEqual(moved(CHANGE_LIMITS.largeChanges).over, []);
    assert.match(moved(CHANGE_LIMITS.largeChanges + 1).over.join(), /26 past values changed by a large amount/);
  });

  it('refuses a history that moved: more than 200 changed values from over five years back', () => {
    // 60 countries, 2000 to 2025: 2019 and earlier are settled.
    const base = data(many(60, () => span(2000, 2025, () => 5)));
    const moved = (n) => compareDatasets(base, data(many(60, (i) => span(2000, 2025, (y) => (y >= 2010 && y <= 2019 && (i * 10 + (y - 2010)) < n ? 5.5 : 5)))), { ...CHANGE_LIMITS, allChanges: 1e9, allChangesShare: 1 });
    assert.equal(moved(200).settledChanges.length, 200);
    assert.deepEqual(moved(200).over, []);
    assert.match(moved(201).over.join(), /201 values from more than 5 years before 2025 changed \(limit 200\)/);
    // A recent year is not a settled one.
    const recent = compareDatasets(base, data(many(60, () => span(2000, 2025, (y) => (y >= 2020 ? 5.5 : 5)))), { ...CHANGE_LIMITS, allChanges: 1e9, allChangesShare: 1 });
    assert.equal(recent.settledChanges.length, 0);
    assert.deepEqual(recent.over, []);
  });

  it('refuses a release that revised too many values of any year: 500, or 5% of the file, whichever is lower', () => {
    // 9,217 values, as the file had on Nov 18, 2026: 5% is 460.85, so 460 pass and 461 do not.
    const years = (i) => span(1979, 2025, () => 5);
    const countries = many(196, years); // 196 x 47 = 9,212
    countries.EXTRA = c(span(2021, 2025, () => 5)); // 9,217
    const base = data(countries);
    const revised = (n) => {
      const next = JSON.parse(JSON.stringify(base));
      let left = n;
      for (const code of Object.keys(next.countries)) for (const y of [2025, 2024, 2023]) if (left > 0 && code !== 'EXTRA') { next.countries[code].years[y] = 5.1; left -= 1; }
      return compareDatasets(base, next);
    };
    assert.deepEqual(revised(460).over, []);
    assert.match(revised(461).over.join(), /461 past values changed \(limit 460: 500, or 5% of the 9217 values/);
    // A large file is held to 500.
    const big = data(many(500, () => span(1990, 2025, () => 5))); // 18,000 values, 5% is 900
    const bigNext = JSON.parse(JSON.stringify(big));
    Object.keys(bigNext.countries).forEach((code, i) => { bigNext.countries[code].years[2025] = 5.1; if (i === 0) bigNext.countries[code].years[2024] = 5.1; });
    assert.match(compareDatasets(big, bigNext).over.join(), /501 past values changed \(limit 500:/);
  });

  it('summarises for the pull request, naming what is over a limit', () => {
    const before = data({ AAA: c({ 2024: 4 }), BBB: c({ 2024: 1, 2025: 2 }) });
    const text = summarizeComparison(compareDatasets(before, data({ AAA: c({ 2024: 40, 2025: 3 }) }, '2026-11-11')));
    assert.match(text, /^World Bank update date changed from 2026-10-08 to 2026-11-11\.$/m);
    assert.match(text, /Countries removed: 1 \(BBB\), taking 2 yearly figures with them/);
    assert.match(text, /Years added to countries already there: 1 \(AAA 2025\)/);
    assert.match(text, /\| AAA \| 2024 \| 4 \| 40 \|/);
    assert.match(text, /\*\*Over the limits:\*\* 1 countries removed \(limit 0\)/);
  });

  it('says in one line when only the update date moved', () => {
    const before = data({ AAA: c({ 2024: 4 }) });
    assert.equal(summarizeComparison(compareDatasets(before, data({ AAA: c({ 2024: 4 }) }, '2026-11-11'))), 'World Bank update date changed from 2026-10-08 to 2026-11-11; no value changed.');
  });

  it('names a comparison by its data, not by when it was fetched', () => {
    const a = { ...data({ AAA: c({ 2024: 4 }) }), fetchedAt: '2026-11-01' };
    const b = { ...data({ AAA: c({ 2024: 5 }) }), fetchedAt: '2026-11-02' };
    const name = comparisonDigest(a, b);
    assert.match(name, /^[0-9a-f]{16}$/);
    assert.equal(comparisonDigest({ ...a, fetchedAt: '2026-12-01' }, { ...b, fetchedAt: '2026-12-02' }), name);
    assert.notEqual(comparisonDigest(a, { ...b, countries: { AAA: c({ 2024: 6 }) } }), name, 'different new data');
    assert.notEqual(comparisonDigest({ ...a, countries: { AAA: c({ 2024: 3 }) } }, b), name, 'a different committed file');
  });

  it('makes the same dry-run data every time: one accepted, one refused', () => {
    const base = data({ USA: c({ 2024: 2.9, 2025: 2.7 }), IND: c({ 2025: 2.1 }), EMU: c({ 2025: 2.1 }), AAA: c(span(2000, 2025, () => 1)), BBB: c({ 2025: 1 }) });
    const accepted = compareDatasets(base, dryRunDataset(base, 'accepted'));
    assert.deepEqual(accepted.over, []);
    assert.deepEqual(accepted.changed.map((x) => `${x.code} ${x.year} ${x.after}`), ['USA 2025 2.71']);
    const refused = compareDatasets(base, dryRunDataset(base, 'refused'));
    assert.deepEqual(refused.countriesRemoved, ['AAA']);
    assert.equal(refused.over.length, 1);
    assert.deepEqual(dryRunDataset(base, 'accepted'), dryRunDataset(base, 'accepted'));
    assert.equal(base.countries.USA.years[2025], 2.7, 'the committed data is not touched');
    assert.throws(() => dryRunDataset(base, 'other'), /unknown dry run/);
  });
});
