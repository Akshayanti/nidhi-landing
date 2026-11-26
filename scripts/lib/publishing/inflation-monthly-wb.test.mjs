/**
 * The inflation calculator's second monthly source, the World Bank's Global
 * Economic Monitor (inflation-monthly-wb.mjs): reading the API's pages,
 * refusing anything it does not expect, and building a file of the same shape
 * as the BIS one.
 *
 * No network: the pages are written here.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WB_MONTHLY_INDICATOR,
  WB_MONTHLY_LICENSE,
  WB_MONTHLY_SOURCE,
  WB_MONTHLY_SOURCE_ID,
  buildWorldBankMonthly,
  parseWorldBankMonthly,
} from './inflation-monthly-wb.mjs';
import { compareMonthly, sameMonthlyData, serializeMonthly } from './inflation-monthly.mjs';

const meta = (extra = {}) => ({ page: 1, pages: 1, per_page: 30000, total: 3, sourceid: '15', lastupdated: '2026-09-08', ...extra });
const row = (id, date, value, indicator = 'CPTOTNSXN') => ({ indicator: { id: indicator, value: 'CPI Price,not seas.adj,,,' }, country: { id, value: id }, countryiso3code: '', date, value, unit: '', obs_status: '', decimal: 0 });
const page = (rows, extra) => [meta(extra), rows];

/** A hundred made-up countries, C00 to C99, and the three a full answer always has. */
const NAMES = Array.from({ length: 100 }, (_, i) => `C${String(i).padStart(2, '0')}`);
const REQUIRED = ['USA', 'DEU', 'KEN'];
const worldBank = () => ({ countries: Object.fromEntries([...NAMES, ...REQUIRED].map((code) => [code, { iso2: 'XX', years: { 2025: 1 } }])) });
const rowsFor = (codes, month = '2026-07', value = 100) => codes.map((code) => ({ code, month, value }));
const ALL = [...NAMES, ...REQUIRED];

describe('the World Bank’s monthly answer', () => {
  it('is the Global Economic Monitor’s consumer price index, under CC BY 4.0', () => {
    assert.equal(WB_MONTHLY_INDICATOR, 'CPTOTNSXN');
    assert.equal(WB_MONTHLY_SOURCE_ID, '15');
    assert.equal(WB_MONTHLY_LICENSE, 'CC BY 4.0');
    assert.match(WB_MONTHLY_SOURCE, /^World Bank, Global Economic Monitor: CPI Price, not seas\. adj\. \(CPTOTNSXN\), monthly$/);
  });

  it('becomes rows of country, month and value, with the World Bank’s own update date', () => {
    const parsed = parseWorldBankMonthly([page([row('KEN', '2026M07', 288.154), row('KEN', '2026M06', 287.5), row('AME', '2026M07', 120)])]);
    assert.deepEqual(parsed, {
      lastUpdated: '2026-09-08',
      rows: [
        { code: 'KEN', month: '2026-07', value: 288.154 },
        { code: 'KEN', month: '2026-06', value: 287.5 },
        { code: 'AME', month: '2026-07', value: 120 },
      ],
    });
  });

  it('reads every page, and leaves out a month with no value', () => {
    const parsed = parseWorldBankMonthly([page([row('KEN', '2026M08', null), row('KEN', '2026M07', 288)], { pages: 2 }), page([row('USA', '2026M01', 300)], { page: 2, pages: 2 })]);
    assert.deepEqual(parsed.rows, [{ code: 'KEN', month: '2026-07', value: 288 }, { code: 'USA', month: '2026-01', value: 300 }]);
  });

  it('refuses no pages, another database, a missing update date, or pages from two updates', () => {
    assert.throws(() => parseWorldBankMonthly([]), /World Bank monthly response: no pages/);
    assert.throws(() => parseWorldBankMonthly(null), /no pages/);
    assert.throws(() => parseWorldBankMonthly([page([], { sourceid: '2' })]), /database 2, not the Global Economic Monitor \(15\)/);
    for (const lastupdated of [undefined, '', '8 September 2026', 20260908]) assert.throws(() => parseWorldBankMonthly([page([], { lastupdated })]), /no update date/);
    assert.throws(() => parseWorldBankMonthly([page([]), page([], { lastupdated: '2026-10-01' })]), /pages from different updates \(2026-09-08 and 2026-10-01\)/);
    // A numeric database id is the same database.
    assert.deepEqual(parseWorldBankMonthly([page([], { sourceid: 15 })]).rows, []);
  });

  it('refuses a row of another indicator, a country or a period that is not written as it should be, or a month twice', () => {
    assert.throws(() => parseWorldBankMonthly([page([row('KEN', '2026M07', 1, 'FP.CPI.TOTL.ZG')])]), /a row of "FP\.CPI\.TOTL\.ZG", not CPTOTNSXN/);
    assert.throws(() => parseWorldBankMonthly([page([null])]), /a row of "undefined"/);
    for (const id of ['kenya', 'K', 'KENY', '', null, 5]) assert.throws(() => parseWorldBankMonthly([page([row(id, '2026M07', 1)])]), /a row with the country/, String(id));
    for (const date of ['2026', '2026M7', '2026M13', '2026M00', '2026-07', '2026Q3', 'x2026M07', '2026M071']) assert.throws(() => parseWorldBankMonthly([page([row('KEN', date, 1)])]), /KEN has the period/, date);
    assert.throws(() => parseWorldBankMonthly([page([row('KEN', '2026M07', 1), row('KEN', '2026M07', 2)])]), /KEN has 2026-07 twice/);
    assert.throws(() => parseWorldBankMonthly([page([row('KEN', '2026M07', null), row('KEN', '2026M07', 2)])]), /KEN has 2026-07 twice/);
    // Two-letter codes and digits are allowed: the API uses a few.
    assert.equal(parseWorldBankMonthly([page([row('XK', '2026M01', 1), row('1W', '2026M12', 1)])]).rows.length, 2);
  });

  it('refuses a value that is not a positive number', () => {
    for (const value of ['288', 0, -1, NaN, Infinity]) assert.throws(() => parseWorldBankMonthly([page([row('KEN', '2026M07', value)])]), /KEN 2026-07 has the value/, String(value));
  });
});

describe('the file built from it', () => {
  it('has the shape of the BIS file: countries by code with their months, the window, and where it came from', () => {
    const data = buildWorldBankMonthly({ lastUpdated: '2026-09-08', rows: [...rowsFor(ALL), { code: 'KEN', month: '2026-06', value: 287.123456 }] }, worldBank(), '2026-11-25');
    assert.deepEqual(Object.keys(data).sort(), ['countries', 'fetchedAt', 'firstMonth', 'indicator', 'lastUpdated', 'license', 'source']);
    assert.equal(data.source, WB_MONTHLY_SOURCE);
    assert.equal(data.license, 'CC BY 4.0');
    assert.equal(data.indicator, 'CPTOTNSXN');
    assert.equal(data.lastUpdated, '2026-09-08');
    assert.equal(data.fetchedAt, '2026-11-25');
    assert.equal(data.firstMonth, '2018-01');
    assert.equal(Object.keys(data.countries).length, 103);
    assert.deepEqual(data.countries.KEN, { area: 'KEN', months: { '2026-07': 100, '2026-06': 287.1235 } });
    // The same file writer and comparison serve it.
    assert.ok(serializeMonthly(data).includes('\n    "KEN": {"area":"KEN","months":{"2026-06":287.1235,"2026-07":100}},\n'));
    assert.equal(sameMonthlyData(data, { ...data, fetchedAt: '2027-01-01' }), true);
    assert.deepEqual(compareMonthly(data, data).over, []);
  });

  it('leaves out an aggregate or any code the yearly file does not have, and a month before the window', () => {
    const rows = [...rowsFor(ALL), { code: 'AME', month: '2026-07', value: 1 }, { code: 'toString', month: '2026-07', value: 1 }, { code: 'KEN', month: '2017-12', value: 90 }, { code: 'KEN', month: '2018-01', value: 91 }];
    const data = buildWorldBankMonthly({ lastUpdated: '2026-09-08', rows }, worldBank(), '2026-11-25');
    assert.equal('AME' in data.countries, false);
    assert.equal(Object.hasOwn(data.countries, 'toString'), false);
    assert.deepEqual(Object.keys(data.countries.KEN.months).sort(), ['2018-01', '2026-07']);
  });

  it('refuses a fetch date that is not a day, fewer than a hundred countries, or an answer without one it always has', () => {
    const parsed = (codes) => ({ lastUpdated: '2026-09-08', rows: rowsFor(codes) });
    for (const bad of ['', '2026-11', '2026-11-25T10:00', 'x2026-11-25']) assert.throws(() => buildWorldBankMonthly(parsed(ALL), worldBank(), bad), /World Bank monthly response: no fetch date/, bad);
    // 97 made-up and the three: a hundred, the fewest allowed.
    assert.equal(Object.keys(buildWorldBankMonthly(parsed([...NAMES.slice(0, 97), ...REQUIRED]), worldBank(), '2026-11-25').countries).length, 100);
    assert.throws(() => buildWorldBankMonthly(parsed([...NAMES.slice(0, 96), ...REQUIRED]), worldBank(), '2026-11-25'), /only 99 countries, fewer than 100/);
    for (const code of REQUIRED) assert.throws(() => buildWorldBankMonthly(parsed(ALL.filter((c) => c !== code)), worldBank(), '2026-11-25'), new RegExp(`World Bank monthly response: ${code} is missing`));
  });
});
