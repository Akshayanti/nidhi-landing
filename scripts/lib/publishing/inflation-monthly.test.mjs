/**
 * The monthly index behind the inflation calculator's month-ended answers
 * (inflation-monthly.mjs): reading the BIS's SDMX-CSV, refusing anything it
 * does not expect, keeping only the window of months and the countries the
 * yearly file has, writing a stable file, and saying what a refresh changed.
 *
 * No network: the CSV is written here.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_CODES,
  DATAFLOW,
  LARGE_REVISION,
  MONTHLY_LIMITS,
  SOURCE,
  TERMS,
  UNIT,
  WINDOW_YEARS,
  buildMonthlyDataset,
  compareMonthly,
  firstMonthFor,
  monthlyDigest,
  parseBisCsv,
  round4,
  sameMonthlyData,
  serializeMonthly,
  splitCsvLine,
  summarizeMonthly,
} from './inflation-monthly.mjs';

const HEADER = 'DATAFLOW,FREQ,REF_AREA,UNIT_MEASURE,TIME_PERIOD,OBS_VALUE,UNIT_MULT,TITLE_TS,OBS_STATUS';
const line = (area, month, value, { flow = DATAFLOW, freq = 'M', unit = UNIT, status = 'A' } = {}) => `${flow},${freq},${area},${unit},${month},${value},0,,${status}`;
const csv = (...rows) => [HEADER, ...rows].join('\n');

/** Forty made-up countries, AA to BN, and the five the tool's pages open with. */
const NAMES = Array.from({ length: 40 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
const REQUIRED = { US: 'USA', DE: 'DEU', ES: 'ESP', CZ: 'CZE', MX: 'MEX' };
const worldBank = (extra = {}) => ({
  countries: {
    ...Object.fromEntries(NAMES.map((n) => [`${n}X`, { iso2: n, years: { 2025: 1 } }])),
    ...Object.fromEntries(Object.entries(REQUIRED).map(([iso2, code]) => [code, { iso2, years: { 2025: 1 } }])),
    EMU: { iso2: 'XC', years: { 2025: 1 } },
    ...extra,
  },
});
const rowsFor = (areas, month = '2026-09', value = 100) => areas.map((area) => ({ area, month, value }));
const ALL = [...NAMES, ...Object.keys(REQUIRED)];

describe('a line of CSV', () => {
  it('splits on commas, keeps empty fields, and reads quoted ones', () => {
    assert.deepEqual(splitCsvLine('a,b,,d'), ['a', 'b', '', 'd']);
    assert.deepEqual(splitCsvLine(''), ['']);
    assert.deepEqual(splitCsvLine(','), ['', '']);
    assert.deepEqual(splitCsvLine('a,"b,c",d'), ['a', 'b,c', 'd']);
    assert.deepEqual(splitCsvLine('"say ""hi""",x'), ['say "hi"', 'x']);
    assert.deepEqual(splitCsvLine('a,"",c'), ['a', '', 'c']);
    assert.deepEqual(splitCsvLine('"a"b,c'), ['ab', 'c']);
  });
});

describe('the BIS answer', () => {
  it('becomes rows of area, month and value', () => {
    assert.deepEqual(parseBisCsv(csv(line('ES', '2026-08', '135.5'), line('ES', '2026-09', '136.25'), line('XM', '2026-09', '130'))), [
      { area: 'ES', month: '2026-08', value: 135.5 },
      { area: 'ES', month: '2026-09', value: 136.25 },
      { area: 'XM', month: '2026-09', value: 130 },
    ]);
  });

  it('reads Windows line endings, skips blank lines, and finds its columns wherever they are', () => {
    const shuffled = ['OBS_STATUS,OBS_VALUE,TIME_PERIOD,UNIT_MEASURE,REF_AREA,FREQ,DATAFLOW', `A,99.5,2026-01,${UNIT},CZ,M,${DATAFLOW}`, ''].join('\r\n');
    assert.deepEqual(parseBisCsv(shuffled), [{ area: 'CZ', month: '2026-01', value: 99.5 }]);
  });

  it('leaves out a month the BIS has no value for', () => {
    assert.deepEqual(parseBisCsv(csv(line('US', '2025-10', '', { status: 'M' }), line('US', '2025-11', 'NaN'), line('US', '2025-12', '321.5'))), [{ area: 'US', month: '2025-12', value: 321.5 }]);
  });

  it('refuses anything that is not text with rows', () => {
    assert.throws(() => parseBisCsv(null), /BIS response: expected text/);
    assert.throws(() => parseBisCsv({}), /expected text/);
    assert.throws(() => parseBisCsv(''), /no rows/);
    assert.throws(() => parseBisCsv(HEADER), /no rows/);
    assert.throws(() => parseBisCsv(`${HEADER}\n\n`), /no rows/);
  });

  it('refuses a header without one of the columns it reads', () => {
    for (const column of ['DATAFLOW', 'FREQ', 'REF_AREA', 'UNIT_MEASURE', 'TIME_PERIOD', 'OBS_VALUE', 'OBS_STATUS']) {
      const header = HEADER.replace(column, 'OTHER');
      assert.throws(() => parseBisCsv(`${header}\n${line('ES', '2026-09', '1')}`), new RegExp(`BIS response: no "${column}" column`));
    }
  });

  it('refuses a row of the wrong length, data set, frequency or unit, naming the row', () => {
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', '1'), `${line('ES', '2026-10', '1')},extra`)), /row 3 has 10 fields, the header has 9/);
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', '1', { flow: 'BIS:WS_OTHER(1.0)' }))), /row 2 is from "BIS:WS_OTHER\(1\.0\)", not BIS:WS_LONG_CPI\(1\.0\)/);
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', '1', { freq: 'Q' }))), /row 2 is not monthly/);
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', '1', { unit: '771' }))), /row 2 has unit "771", not the index \(628\)/);
  });

  it('refuses an area or a period that is not written as it should be', () => {
    for (const area of ['ESP', 'E', 'es', 'E$', '']) assert.throws(() => parseBisCsv(csv(line(area, '2026-09', '1'))), /row 2 has the area/, area);
    for (const month of ['2026', '2026-9', '2026-13', '2026-00', '2026-Q3', '26-09', '2026-091', 'x2026-09', '']) assert.throws(() => parseBisCsv(csv(line('ES', month, '1'))), /row 2 has the period/, month);
    // Digits are allowed in an area: the BIS uses codes such as 4T.
    assert.equal(parseBisCsv(csv(line('4T', '2026-01', '1'), line('ES', '2026-12', '1'))).length, 2);
  });

  it('refuses the same month twice for a country, even when one of them has no value', () => {
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', '1'), line('ES', '2026-09', '2'))), /ES has 2026-09 twice/);
    assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', ''), line('ES', '2026-09', '2'))), /ES has 2026-09 twice/);
    assert.equal(parseBisCsv(csv(line('ES', '2026-09', '1'), line('CZ', '2026-09', '2'))).length, 2);
  });

  it('refuses a value that is not a positive number', () => {
    for (const value of ['abc', '0', '-5', 'Infinity', '1e999']) assert.throws(() => parseBisCsv(csv(line('ES', '2026-09', value))), /row 2 has the value/, value);
  });
});

describe('the file built from it', () => {
  it('rounds to four decimals', () => {
    assert.equal(round4(135.538249), 135.5382);
    assert.equal(round4(135.53825), 135.5383);
    assert.equal(round4(100), 100);
  });

  it('keeps nine calendar years, counting the year of the fetch', () => {
    assert.equal(WINDOW_YEARS, 9);
    assert.equal(firstMonthFor('2026-11-25'), '2018-01');
    assert.equal(firstMonthFor('2027-01-03'), '2019-01');
  });

  it('names each country by the yearly file’s code, with its months, its area and where it came from', () => {
    const rows = [...rowsFor(ALL), { area: 'ES', month: '2026-08', value: 135.538249 }];
    const data = buildMonthlyDataset(rows, worldBank(), '2026-11-25');
    assert.deepEqual(Object.keys(data).sort(), ['countries', 'dataflow', 'fetchedAt', 'firstMonth', 'source', 'terms', 'unit']);
    assert.equal(data.source, SOURCE);
    assert.equal(data.terms, TERMS);
    assert.equal(data.terms, 'https://data.bis.org/help/legal');
    assert.equal(data.dataflow, 'BIS:WS_LONG_CPI(1.0)');
    assert.equal(data.unit, '628');
    assert.equal(data.fetchedAt, '2026-11-25');
    assert.equal(data.firstMonth, '2018-01');
    assert.equal(Object.keys(data.countries).length, 45);
    assert.deepEqual(data.countries.ESP, { area: 'ES', months: { '2026-09': 100, '2026-08': 135.5382 } });
    assert.deepEqual(data.countries.AAX, { area: 'AA', months: { '2026-09': 100 } });
  });

  it('leaves out an area the yearly file does not have, and a month before the window', () => {
    const rows = [...rowsFor(ALL), { area: 'ZZ', month: '2026-09', value: 1 }, { area: 'ES', month: '2017-12', value: 90 }, { area: 'ES', month: '2018-01', value: 91 }];
    const data = buildMonthlyDataset(rows, worldBank(), '2026-11-25');
    assert.equal('ZZ' in data.countries, false);
    assert.equal(Object.values(data.countries).some((c) => c.area === 'ZZ'), false);
    assert.deepEqual(Object.keys(data.countries.ESP.months).sort(), ['2018-01', '2026-09']);
    // A country with only months before the window is not in the file at all.
    const old = buildMonthlyDataset([...rowsFor(ALL), { area: 'XM', month: '2010-01', value: 1 }], worldBank(), '2026-11-25');
    assert.equal('EMU' in old.countries, false);
  });

  it('reads the euro area from the BIS’s own code for it, never from another area that shares a code', () => {
    assert.deepEqual(AREA_CODES, { XM: 'EMU' });
    const data = buildMonthlyDataset([...rowsFor(ALL), { area: 'XM', month: '2026-09', value: 130 }, { area: 'XC', month: '2026-09', value: 999 }], worldBank(), '2026-11-25');
    assert.deepEqual(data.countries.EMU, { area: 'XM', months: { '2026-09': 130 } });
    // A yearly file that had a country under the BIS's euro-area code would not take its place.
    const clash = buildMonthlyDataset([...rowsFor(ALL), { area: 'XM', month: '2026-09', value: 130 }], worldBank({ XMX: { iso2: 'XM', years: {} } }), '2026-11-25');
    assert.deepEqual(clash.countries.EMU, { area: 'XM', months: { '2026-09': 130 } });
    assert.equal('XMX' in clash.countries, false);
    // Without the euro area in the yearly file there is nothing to join it to.
    const { EMU: _gone, ...rest } = worldBank().countries;
    assert.equal('EMU' in buildMonthlyDataset([...rowsFor(ALL), { area: 'XM', month: '2026-09', value: 130 }], { countries: rest }, '2026-11-25').countries, false);
  });

  it('refuses a fetch date that is not a day', () => {
    for (const bad of ['', '2026-11', '25/11/2026', '2026-11-25T10:00', 'x2026-11-25']) assert.throws(() => buildMonthlyDataset(rowsFor(ALL), worldBank(), bad), /BIS response: no fetch date/, bad);
  });

  it('refuses fewer than forty countries, or an answer without one the tool’s pages open with', () => {
    // 35 made-up and the five: forty, the fewest allowed.
    assert.equal(Object.keys(buildMonthlyDataset(rowsFor([...NAMES.slice(0, 35), ...Object.keys(REQUIRED)]), worldBank(), '2026-11-25').countries).length, 40);
    assert.throws(() => buildMonthlyDataset(rowsFor([...NAMES.slice(0, 34), ...Object.keys(REQUIRED)]), worldBank(), '2026-11-25'), /BIS response: only 39 countries, fewer than 40/);
    for (const [iso2, code] of Object.entries(REQUIRED)) {
      assert.throws(() => buildMonthlyDataset(rowsFor(ALL.filter((a) => a !== iso2)), worldBank(), '2026-11-25'), new RegExp(`BIS response: ${code} is missing`));
    }
  });
});

describe('the file as written', () => {
  const data = () => buildMonthlyDataset([...rowsFor(ALL), { area: 'ES', month: '2026-08', value: 99 }], worldBank(), '2026-11-25');

  it('is stable JSON: sorted keys, one country to a line, a trailing newline, and it reads back whole', () => {
    const text = serializeMonthly(data());
    assert.ok(text.startsWith('{\n  "dataflow": "BIS:WS_LONG_CPI(1.0)",\n  "fetchedAt": "2026-11-25",\n  "firstMonth": "2018-01",\n  "source": '));
    assert.ok(text.endsWith('\n  }\n}\n'));
    assert.ok(text.includes('\n    "ESP": {"area":"ES","months":{"2026-08":99,"2026-09":100}},\n'));
    assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(data())));
    // One line a country, between the opening and the closing lines.
    assert.equal(text.split('\n').filter((l) => l.startsWith('    "')).length, 45);
    // Countries in code order, whatever order the rows came in.
    const codes = [...text.matchAll(/^ {4}"([A-Z]+)":/gm)].map((m) => m[1]);
    assert.deepEqual(codes, [...codes].sort());
    const shuffled = buildMonthlyDataset([{ area: 'ES', month: '2026-08', value: 99 }, ...rowsFor([...ALL].reverse())], worldBank(), '2026-11-25');
    assert.equal(serializeMonthly(shuffled), text);
  });

  it('is the same data whatever day it was fetched, and different once a value moves', () => {
    const a = data();
    assert.equal(sameMonthlyData(a, { ...a, fetchedAt: '2026-12-03' }), true);
    assert.equal(sameMonthlyData(a, data()), true);
    const moved = data();
    moved.countries.ESP.months['2026-08'] = 99.0001;
    assert.equal(sameMonthlyData(a, moved), false);
    assert.equal(sameMonthlyData(a, { ...a, firstMonth: '2019-01' }), false);
    assert.equal(sameMonthlyData(null, a), false);
    assert.equal(sameMonthlyData(a, null), false);
    assert.equal(sameMonthlyData(undefined, undefined), false);
  });
});

describe('what a refresh changed', () => {
  const file = (countries, firstMonth = '2018-01') => ({ source: SOURCE, terms: TERMS, dataflow: DATAFLOW, unit: UNIT, fetchedAt: '2026-11-25', firstMonth, countries });
  const months = (n, start = 100) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`2025-${String(i + 1).padStart(2, '0')}`, start + i]));
  const before = file({ AAA: { area: 'AA', months: months(10) }, BBB: { area: 'BB', months: months(10) } });

  it('has its limits: nothing removed, no value moved by more than 2%, at most a tenth of past values changed', () => {
    assert.deepEqual(MONTHLY_LIMITS, { countriesRemoved: 0, monthsRemoved: 0, largeChanges: 0, changedShare: 0.1 });
    assert.equal(LARGE_REVISION, 0.02);
  });

  it('a new month and a new country are counted and pass', () => {
    const after = file({ AAA: { area: 'AA', months: { ...months(10), '2025-11': 111 } }, BBB: before.countries.BBB, CCC: { area: 'CC', months: months(3) } });
    assert.deepEqual(compareMonthly(before, after), { countriesRemoved: [], countriesAdded: ['CCC'], monthsRemoved: [], monthsAdded: 4, changed: 0, shared: 20, large: [], over: [] });
  });

  it('small revisions pass up to a tenth of the values both files have, and no further', () => {
    const revise = (count) => {
      const m = months(10);
      for (let i = 1; i <= count; i++) m[`2025-${String(i).padStart(2, '0')}`] += 0.5;
      return file({ AAA: { area: 'AA', months: m }, BBB: before.countries.BBB });
    };
    // 2 of 20 is a tenth: at the limit, it passes.
    const two = compareMonthly(before, revise(2));
    assert.equal(two.changed, 2);
    assert.equal(two.shared, 20);
    assert.deepEqual(two.over, []);
    assert.deepEqual(two.large, []);
    assert.deepEqual(compareMonthly(before, revise(3)).over, ['3 of 20 past values changed']);
  });

  it('a value that moved by more than 2% is listed and refused; one at 2% is not', () => {
    const at = (value) => file({ AAA: { area: 'AA', months: { ...months(10), '2025-01': value } }, BBB: before.countries.BBB });
    assert.deepEqual(compareMonthly(before, at(102)).large, []);
    assert.deepEqual(compareMonthly(before, at(98)).large, []);
    const up = compareMonthly(before, at(102.5));
    assert.deepEqual(up.large, ['AAA 2025-01: 100 to 102.5']);
    assert.deepEqual(up.over, ['1 values moved by more than 2%']);
    assert.deepEqual(compareMonthly(before, at(97.5)).large, ['AAA 2025-01: 100 to 97.5']);
  });

  it('a month or a country that disappeared is refused, but not a month that left the window', () => {
    const { '2025-03': _gone, ...without } = months(10);
    const lost = compareMonthly(before, file({ AAA: { area: 'AA', months: without }, BBB: before.countries.BBB }));
    assert.deepEqual(lost.monthsRemoved, ['AAA 2025-03']);
    assert.deepEqual(lost.over, ['1 months removed']);
    assert.equal(lost.shared, 19);
    const gone = compareMonthly(before, file({ AAA: before.countries.AAA }));
    assert.deepEqual(gone.countriesRemoved, ['BBB']);
    assert.deepEqual(gone.over, ['1 countries removed']);
    // The window moved on a year: months before it are no longer kept, and that is not a loss.
    const slid = compareMonthly(before, file({ AAA: { area: 'AA', months: { '2025-06': 105 } }, BBB: { area: 'BB', months: { '2025-06': 105 } } }, '2025-06'));
    assert.deepEqual(slid.monthsRemoved, ['AAA 2025-07', 'AAA 2025-08', 'AAA 2025-09', 'AAA 2025-10', 'BBB 2025-07', 'BBB 2025-08', 'BBB 2025-09', 'BBB 2025-10']);
    const kept = Object.fromEntries(Object.entries(months(10)).filter(([m]) => m >= '2025-06'));
    assert.deepEqual(compareMonthly(before, file({ AAA: { area: 'AA', months: kept }, BBB: { area: 'BB', months: kept } }, '2025-06')).monthsRemoved, []);
  });

  it('takes other limits when given them, and never divides by nothing', () => {
    const after = file({ AAA: before.countries.AAA });
    assert.deepEqual(compareMonthly(before, after, { ...MONTHLY_LIMITS, countriesRemoved: 1 }).over, []);
    const fresh = compareMonthly(file({}), file({ AAA: { area: 'AA', months: months(2) } }));
    assert.deepEqual(fresh, { countriesRemoved: [], countriesAdded: ['AAA'], monthsRemoved: [], monthsAdded: 2, changed: 0, shared: 0, large: [], over: [] });
  });

  it('is summarised as a list, with what is over the limits said last', () => {
    const quiet = summarizeMonthly(compareMonthly(before, file({ AAA: { area: 'AA', months: { ...months(10), '2025-11': 111 } }, BBB: before.countries.BBB })));
    assert.equal(quiet, [
      '- Months added: 1',
      '- Past values changed: 0 of 20',
      '- Values that moved by more than 2%: 0',
      '- Months removed: 0',
      '- Countries added: 0',
      '- Countries removed: 0',
    ].join('\n'));
    const { '2025-03': _gone, ...without } = months(10);
    const loud = summarizeMonthly(compareMonthly(before, file({ AAA: { area: 'AA', months: { ...without, '2025-01': 110 } }, CCC: { area: 'CC', months: months(1) } })));
    assert.equal(loud, [
      '- Months added: 1',
      '- Past values changed: 1 of 9',
      '- Values that moved by more than 2%: 1 (AAA 2025-01: 100 to 110)',
      '- Months removed: 1 (AAA 2025-03)',
      '- Countries added: 1 (CCC)',
      '- Countries removed: 1 (BBB)',
      '',
      '**Over the limits:** 1 countries removed; 1 months removed; 1 values moved by more than 2%; 1 of 9 past values changed.',
    ].join('\n'));
  });

  it('a long list is cut short with a count of the rest', () => {
    const cmp = { countriesRemoved: ['A', 'B', 'C'], countriesAdded: [], monthsRemoved: [], monthsAdded: 0, changed: 0, shared: 0, large: [], over: [] };
    assert.ok(summarizeMonthly(cmp, { listed: 2 }).includes('- Countries removed: 3 (A, B and 1 more)'));
    assert.ok(summarizeMonthly(cmp, { listed: 3 }).includes('- Countries removed: 3 (A, B, C)'));
    assert.ok(summarizeMonthly(cmp).includes('- Countries removed: 3 (A, B, C)'));
  });

  it('has a short name that is the same for the same two files and changes with either', () => {
    const after = file({ AAA: before.countries.AAA });
    const name = monthlyDigest(before, after);
    assert.match(name, /^[0-9a-f]{12}$/);
    assert.equal(monthlyDigest({ ...before, fetchedAt: '2026-01-01' }, { ...after, fetchedAt: '2027-01-01' }), name);
    assert.notEqual(monthlyDigest(after, before), name);
    assert.notEqual(monthlyDigest(before, file({ BBB: before.countries.BBB })), name);
  });
});
