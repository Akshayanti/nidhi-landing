/**
 * scripts/fetch-inflation.mjs with the World Bank mocked: what it asks for,
 * and that a short, cut off or malformed answer is refused before anything
 * is written. The parsing itself is tested in lib/publishing/inflation-data.test.mjs;
 * this file is about the fetch and the file on disk.
 *
 * No request leaves the machine: `fetch` is replaced in every test, and the
 * data file is a temporary one, never src/data/inflation/worldbank.json.
 *
 * Run with:  npm test
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { main } from './fetch-inflation.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nidhi-inflation-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let run = 0;
const newOut = () => path.join(tmp, String(++run), 'worldbank.json');

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

/** A full answer: 150 made-up countries, the three the tool needs, and one aggregate that is dropped. */
function goodAnswer({ fillers = 150, india = 2.104 } = {}) {
  const codes = Array.from({ length: fillers }, (_, i) => `Q${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`);
  const countries = [country('IND', 'IN'), country('USA', 'US'), country('EMU', 'XC', true), country('SAS', '8S', true), ...codes.map((c) => country(c, c.slice(1)))];
  const rows = [row('IND', '2024', 4.953), row('IND', '2025', india), row('USA', '2025', 2.7), row('EMU', '2025', 2.1), row('SAS', '2025', 5.5), ...codes.map((c) => row(c, '2025', 1))];
  return { countries: [meta(countries.length), countries], indicator: [meta(rows.length), rows] };
}

/**
 * Replaces `fetch` for one test. `answer` holds the body for the country list
 * and for the indicator; a function there is called with the page number.
 */
function mockWorldBank(t, answer, { status = 200 } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(url);
    const body = parsed.pathname.includes('/indicator/') ? answer.indicator : answer.countries;
    const page = Number(parsed.searchParams.get('page'));
    return { ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'function' ? body(page) : body) };
  });
  // The script waits two and four seconds between its tries: no need to here.
  t.mock.method(globalThis, 'setTimeout', (fn) => { queueMicrotask(fn); return 0; });
  const log = t.mock.method(console, 'log', () => {});
  return { calls, said: () => log.mock.calls.map((c) => c.arguments.join(' ')).join('\n') };
}

/** Whatever is in the folder of the data file: the file itself and nothing half-written. */
const filesBeside = (out) => (fs.existsSync(path.dirname(out)) ? fs.readdirSync(path.dirname(out)) : []);

/** A data file already on disk, as an earlier good run wrote it. */
async function existingFile(t) {
  const out = newOut();
  mockWorldBank(t, goodAnswer());
  await main(['--first-import'], out);
  t.mock.restoreAll();
  return { out, before: fs.readFileSync(out, 'utf8') };
}

describe('fetch-inflation: what it asks the World Bank', () => {
  it('asks for the inflation indicator of every country and for the country list, as JSON, and for nothing else', async (t) => {
    const { calls } = mockWorldBank(t, goodAnswer());
    await main(['--first-import'], newOut());
    const year = new Date().getUTCFullYear();
    assert.deepEqual(calls.map((c) => c.url).sort(), [
      `https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG?format=json&date=1960:${year}&per_page=20000&page=1`,
      'https://api.worldbank.org/v2/country?format=json&per_page=400&page=1',
    ]);
    for (const call of calls) {
      assert.deepEqual(call.options.headers, { accept: 'application/json' });
      assert.ok(call.options.signal instanceof AbortSignal, 'the request has no time limit');
    }
  });

  it('fetches every page the first page says there is', async (t) => {
    const good = goodAnswer();
    const [, rows] = good.indicator;
    const half = Math.floor(rows.length / 2);
    const paged = (page) => [meta(rows.length, { page, pages: 2 }), page === 1 ? rows.slice(0, half) : rows.slice(half)];
    const out = newOut();
    const { calls } = mockWorldBank(t, { ...good, indicator: paged });
    await main(['--first-import'], out);
    assert.deepEqual(calls.map((c) => c.url).filter((u) => u.includes('/indicator/')).map((u) => new URL(u).searchParams.get('page')), ['1', '2']);
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(out, 'utf8')).countries).length, 153);
  });
});

describe('fetch-inflation: a good answer', () => {
  it('writes the file whole, with its source, and leaves no temporary file', async (t) => {
    const out = newOut();
    const { said } = mockWorldBank(t, goodAnswer());
    await main(['--first-import'], out);
    const data = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(data.indicator, 'FP.CPI.TOTL.ZG');
    assert.equal(data.lastUpdated, '2026-10-08');
    assert.equal(data.fetchedAt, new Date().toISOString().slice(0, 10));
    assert.deepEqual(data.countries.IND, { iso2: 'IN', years: { 2024: 4.95, 2025: 2.1 } });
    // The euro area is kept; other aggregates are not.
    assert.ok(data.countries.EMU);
    assert.equal(data.countries.SAS, undefined);
    assert.deepEqual(filesBeside(out), ['worldbank.json']);
    assert.match(said(), /^Wrote 153 countries, World Bank update 2026-10-08, to /m);
  });

  it('leaves the file exactly as it was when the data is the same, its fetch date included', async (t) => {
    const { out, before } = await existingFile(t);
    const older = before.replace(/"fetchedAt": "\d{4}-\d{2}-\d{2}"/, '"fetchedAt": "2020-01-01"');
    assert.notEqual(older, before);
    fs.writeFileSync(out, older);
    const { said } = mockWorldBank(t, goodAnswer());
    await main([], out);
    assert.equal(fs.readFileSync(out, 'utf8'), older);
    assert.match(said(), /^Unchanged: 153 countries/);
  });

  it('writes a small change over the old file', async (t) => {
    const { out, before } = await existingFile(t);
    mockWorldBank(t, goodAnswer({ india: 2.5 }));
    await main([], out);
    const after = fs.readFileSync(out, 'utf8');
    assert.notEqual(after, before);
    assert.equal(JSON.parse(after).countries.IND.years[2025], 2.5);
    assert.deepEqual(filesBeside(out), ['worldbank.json']);
  });
});

describe('fetch-inflation: an answer it refuses, before writing anything', () => {
  const good = goodAnswer();
  const [, rows] = good.indicator;
  const [, countries] = good.countries;
  const refused = [
    ['a short answer: too few countries have data', { ...good, indicator: goodAnswer({ fillers: 40 }).indicator }, /only 42 countries have data, expected at least 150/],
    ['an answer cut off: fewer rows than its own count', { ...good, indicator: [meta(rows.length), rows.slice(0, 100)] }, /indicator has 100 rows, metadata says 155/],
    ['a country list cut off', { ...good, countries: [meta(countries.length), countries.slice(0, 20)] }, /country list has 20 rows, metadata says 154/],
    ['an empty answer', { ...good, indicator: [meta(0), []] }, /only 0 countries have data/],
    ['an answer with no data for India', { ...good, indicator: [meta(rows.length - 2), rows.filter((r) => r.countryiso3code !== 'IND')] }, /no data for IND/],
    ['the API\'s own error message', { ...good, indicator: [{ message: [{ id: '120', key: 'Invalid value', value: 'The provided parameter value is not valid' }] }] }, /API error/],
    ['something that is not a list', { ...good, indicator: { rows } }, /expected an array/],
    ['a list with no rows in it', { ...good, indicator: [meta(rows.length), null] }, /expected an array of rows second/],
    ['metadata with no counts', { ...good, indicator: [{ lastupdated: '2026-10-08' }, rows] }, /metadata has no numeric "page"/],
    ['metadata with no update date', { ...good, indicator: [meta(rows.length, { lastupdated: undefined }), rows] }, /metadata has no lastupdated date/],
    ['a value that is not a number', { ...good, indicator: [meta(rows.length), [row('IND', '2023', '5.6'), ...rows.slice(1)]] }, /non-numeric value/],
    ['a row of another indicator', { ...good, indicator: [meta(rows.length), [{ ...rows[0], indicator: { id: 'NY.GDP.MKTP.CD' } }, ...rows.slice(1)]] }, /unexpected indicator row/],
    ['a row with no year', { ...good, indicator: [meta(rows.length), [row('IND', 'MRV', 1), ...rows.slice(1)]] }, /row without a country code or year/],
  ];

  for (const [name, answer, message] of refused) {
    it(`${name}: no file on a first import, and the old file untouched on a refresh`, async (t) => {
      const fresh = newOut();
      mockWorldBank(t, answer);
      await assert.rejects(main(['--first-import'], fresh), message);
      assert.deepEqual(filesBeside(fresh), []);
      t.mock.restoreAll();

      const { out, before } = await existingFile(t);
      const stat = fs.statSync(out);
      mockWorldBank(t, answer);
      await assert.rejects(main([], out), message);
      assert.equal(fs.readFileSync(out, 'utf8'), before);
      assert.equal(fs.statSync(out).mtimeMs, stat.mtimeMs);
      assert.deepEqual(filesBeside(out), ['worldbank.json']);
    });
  }

  it('an HTTP error: tried three times, then refused', async (t) => {
    const { out, before } = await existingFile(t);
    const { calls } = mockWorldBank(t, goodAnswer(), { status: 503 });
    await assert.rejects(main([], out), /HTTP 503 for https:\/\/api\.worldbank\.org\/v2\//);
    // Let the other request finish its own tries before counting.
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.filter((c) => c.url.includes('/indicator/')).length, 3);
    assert.equal(calls.filter((c) => !c.url.includes('/indicator/')).length, 3);
    assert.equal(fs.readFileSync(out, 'utf8'), before);
    assert.deepEqual(filesBeside(out), ['worldbank.json']);
  });

  it('a body that is not JSON', async (t) => {
    const { out, before } = await existingFile(t);
    mockWorldBank(t, { ...good, indicator: () => { throw new SyntaxError('Unexpected token < in JSON'); } });
    await assert.rejects(main([], out), /Unexpected token/);
    assert.equal(fs.readFileSync(out, 'utf8'), before);
  });

  it('pages from two different World Bank updates: the whole fetch is tried three times, then refused', async (t) => {
    const half = Math.floor(rows.length / 2);
    const mixed = (page) => [
      meta(rows.length, { page, pages: 2, lastupdated: page === 1 ? '2026-10-08' : '2026-11-12' }),
      page === 1 ? rows.slice(0, half) : rows.slice(half),
    ];
    const { out, before } = await existingFile(t);
    const { calls } = mockWorldBank(t, { ...good, indicator: mixed });
    await assert.rejects(main([], out), /pages come from different updates \(2026-10-08 and 2026-11-12\)/);
    assert.equal(calls.filter((c) => /\/indicator\/.*page=1$/.test(c.url)).length, 3);
    assert.equal(fs.readFileSync(out, 'utf8'), before);
  });

  it('a well-formed answer that has lost a country the old file had: refused, with the reason in the summary', async (t) => {
    const { out, before } = await existingFile(t);
    const summary = path.join(path.dirname(out), 'summary.md');
    const fewer = goodAnswer();
    fewer.indicator = [meta(fewer.indicator[1].length - 1), fewer.indicator[1].slice(0, -1)];
    mockWorldBank(t, fewer);
    await assert.rejects(main(['--summary', summary], out), /differs from the committed file by more than a refresh may \(1 countries removed/);
    assert.equal(fs.readFileSync(out, 'utf8'), before);
    assert.match(fs.readFileSync(summary, 'utf8'), /Refused: no data was written\./);
    assert.deepEqual(filesBeside(out).sort(), ['summary.md', 'worldbank.json']);
  });
});

describe('fetch-inflation: the file it compares with', () => {
  it('refuses to run without one, unless told it is the first import, and asks the World Bank nothing', async (t) => {
    const out = newOut();
    const { calls } = mockWorldBank(t, goodAnswer());
    await assert.rejects(main([], out), /cannot be read .* Restore the file, or run with --first-import/);
    assert.equal(calls.length, 0);
    assert.deepEqual(filesBeside(out), []);
  });

  it('refuses a committed file that is not the dataset', async (t) => {
    const out = newOut();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, '{"countries":null}');
    mockWorldBank(t, goodAnswer());
    await assert.rejects(main([], out), /it has no countries/);
    assert.equal(fs.readFileSync(out, 'utf8'), '{"countries":null}');
  });
});
