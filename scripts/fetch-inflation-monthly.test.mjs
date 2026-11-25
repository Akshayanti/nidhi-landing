/**
 * scripts/fetch-inflation-monthly.mjs with the BIS mocked: what it asks for,
 * what it writes, and that a short, changed or malformed answer is refused
 * before anything is written. The parsing itself is tested in
 * lib/publishing/inflation-monthly.test.mjs; this file is about the fetch and
 * the file on disk.
 *
 * No request leaves the machine: `fetch` is replaced in every test, and the
 * files are temporary ones, never those under src/data/inflation/.
 *
 * Run with:  npm test
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { main } from './fetch-inflation-monthly.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nidhi-inflation-monthly-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let run = 0;
const newDir = () => {
  const dir = path.join(tmp, String(++run));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const HEADER = 'DATAFLOW,FREQ,REF_AREA,UNIT_MEASURE,TIME_PERIOD,OBS_VALUE,OBS_STATUS';
const NAMES = Array.from({ length: 40 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
const REQUIRED = { US: 'USA', DE: 'DEU', ES: 'ESP', CZ: 'CZE', MX: 'MEX' };
const YEAR = new Date().getUTCFullYear();

/** A good answer: 45 countries with two months of this year, Spain's September as given. */
function goodCsv({ spain = 136.25, without = [], extra = [] } = {}) {
  const rows = [];
  for (const area of [...NAMES, ...Object.keys(REQUIRED)]) {
    if (without.includes(area)) continue;
    rows.push(`BIS:WS_LONG_CPI(1.0),M,${area},628,${YEAR}-08,100,A`);
    rows.push(`BIS:WS_LONG_CPI(1.0),M,${area},628,${YEAR}-09,${area === 'ES' ? spain : 101},A`);
  }
  return [HEADER, ...rows, ...extra].join('\n');
}

/** The yearly file the countries are named from, written beside the output. */
function worldBankFile(dir) {
  const countries = {
    ...Object.fromEntries(NAMES.map((n) => [`${n}X`, { iso2: n, years: { 2025: 1 } }])),
    ...Object.fromEntries(Object.entries(REQUIRED).map(([iso2, code]) => [code, { iso2, years: { 2025: 1 } }])),
  };
  const file = path.join(dir, 'worldbank.json');
  fs.writeFileSync(file, JSON.stringify({ countries }));
  return file;
}

/** Replaces `fetch` with the BIS's answer, and collects what the script prints. */
function mockBis(t, answer) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    const body = typeof answer === 'function' ? answer(calls.length) : answer;
    if (body instanceof Error) throw body;
    if (typeof body === 'number') return { ok: false, status: body, text: async () => '' };
    return { ok: true, status: 200, text: async () => body };
  });
  // The script waits between attempts; a test does not.
  t.mock.method(globalThis, 'setTimeout', (fn) => { fn(); return 0; });
  const lines = [];
  t.mock.method(console, 'log', (...a) => lines.push(a.join(' ')));
  return { calls, said: () => lines.join('\n') };
}

const setUp = () => {
  const dir = newDir();
  return { dir, out: path.join(dir, 'bis-monthly.json'), wb: worldBankFile(dir) };
};
const filesIn = (dir) => fs.readdirSync(dir).sort();

/** A first import, so there is a committed file to compare the next answer with. */
async function existing(t, csv = goodCsv()) {
  const s = setUp();
  mockBis(t, csv);
  await main(['--first-import', '--world-bank', s.wb], s.out);
  t.mock.restoreAll();
  return { ...s, before: fs.readFileSync(s.out, 'utf8') };
}

describe('fetch-inflation-monthly: what it asks the BIS', () => {
  it('asks once for the monthly index of every country since the window’s first month, as SDMX-CSV', async (t) => {
    const { out, wb } = setUp();
    const { calls } = mockBis(t, goodCsv());
    await main(['--first-import', '--world-bank', wb], out);
    assert.deepEqual(calls.map((c) => c.url), [`https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LONG_CPI/1.0/M..628?startPeriod=${YEAR - 8}-01`]);
    assert.deepEqual(calls[0].options.headers, { accept: 'application/vnd.sdmx.data+csv;version=1.0.0' });
    assert.ok(calls[0].options.signal instanceof AbortSignal, 'the request has no time limit');
  });

  it('tries three times before giving up, and stops at the first answer', async (t) => {
    const first = setUp();
    const { calls } = mockBis(t, (n) => (n < 3 ? new Error('offline') : goodCsv()));
    await main(['--first-import', '--world-bank', first.wb], first.out);
    assert.equal(calls.length, 3);
    assert.ok(fs.existsSync(first.out));
    t.mock.restoreAll();
    const second = setUp();
    const failing = mockBis(t, 503);
    await assert.rejects(main(['--first-import', '--world-bank', second.wb], second.out), /HTTP 503 for https:\/\/stats\.bis\.org\//);
    assert.equal(failing.calls.length, 3);
    assert.deepEqual(filesIn(second.dir), ['worldbank.json']);
    t.mock.restoreAll();
    const third = setUp();
    const once = mockBis(t, goodCsv());
    await main(['--first-import', '--world-bank', third.wb], third.out);
    assert.equal(once.calls.length, 1);
  });
});

describe('fetch-inflation-monthly: a good answer', () => {
  it('writes the file whole, with its source and terms, and leaves no temporary file', async (t) => {
    const { dir, out, wb } = setUp();
    const { said } = mockBis(t, goodCsv());
    await main(['--first-import', '--world-bank', wb], out);
    const data = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(data.dataflow, 'BIS:WS_LONG_CPI(1.0)');
    assert.equal(data.terms, 'https://data.bis.org/help/legal');
    assert.equal(data.fetchedAt, new Date().toISOString().slice(0, 10));
    assert.equal(data.firstMonth, `${YEAR - 8}-01`);
    assert.deepEqual(data.countries.ESP, { area: 'ES', months: { [`${YEAR}-08`]: 100, [`${YEAR}-09`]: 136.25 } });
    assert.equal(Object.keys(data.countries).length, 45);
    assert.deepEqual(filesIn(dir), ['bis-monthly.json', 'worldbank.json']);
    assert.match(said(), /^Wrote 45 countries of monthly figures to /m);
  });

  it('makes the folder it writes into', async (t) => {
    const { dir, wb } = setUp();
    mockBis(t, goodCsv());
    const deep = path.join(dir, 'a', 'b', 'bis-monthly.json');
    await main(['--first-import', '--world-bank', wb], deep);
    assert.ok(fs.existsSync(deep));
  });

  it('leaves the file exactly as it was when the months are the same, its fetch date included', async (t) => {
    const { out, wb, before } = await existing(t);
    const older = before.replace(/"fetchedAt": "\d{4}-\d{2}-\d{2}"/, '"fetchedAt": "2020-01-01"');
    assert.notEqual(older, before);
    fs.writeFileSync(out, older);
    const { said } = mockBis(t, goodCsv());
    await main(['--world-bank', wb], out);
    assert.equal(fs.readFileSync(out, 'utf8'), older);
    assert.match(said(), /^Unchanged: 45 countries of monthly figures\.$/m);
  });

  it('writes a new month and a small revision over the old file, and says what changed', async (t) => {
    const { dir, out, wb, before } = await existing(t);
    const summary = path.join(dir, 'summary.md');
    fs.writeFileSync(summary, 'The yearly refresh said this first.\n');
    const { said } = mockBis(t, goodCsv({ spain: 136.5, extra: [`BIS:WS_LONG_CPI(1.0),M,ES,628,${YEAR}-10,137,A`] }));
    await main(['--world-bank', wb, '--summary', summary], out);
    const after = fs.readFileSync(out, 'utf8');
    assert.notEqual(after, before);
    assert.deepEqual(JSON.parse(after).countries.ESP.months, { [`${YEAR}-08`]: 100, [`${YEAR}-09`]: 136.5, [`${YEAR}-10`]: 137 });
    assert.match(said(), /### Monthly index \(BIS\)\n\n- Months added: 1\n- Past values changed: 1 of 90/);
    // Added to the summary the yearly refresh began, not written over it.
    assert.equal(fs.readFileSync(summary, 'utf8'), `The yearly refresh said this first.\n\n### Monthly index (BIS)\n\n${said().split('### Monthly index (BIS)\n\n')[1].split('\nWrote ')[0]}\n`);
    assert.deepEqual(filesIn(dir), ['bis-monthly.json', 'summary.md', 'worldbank.json']);
  });
});

describe('fetch-inflation-monthly: an answer it refuses, before writing anything', () => {
  it('a malformed answer, a short one, or one without a country the pages open with', async (t) => {
    for (const [bad, why] of [
      ['not csv at all', /BIS response: no rows/],
      [`${HEADER}\nBIS:WS_OTHER(1.0),M,ES,628,${YEAR}-09,1,A`, /is from "BIS:WS_OTHER\(1\.0\)"/],
      [goodCsv({ without: NAMES.slice(0, 6) }), /only 39 countries, fewer than 40/],
      [goodCsv({ without: ['ES'] }), /ESP is missing/],
    ]) {
      const { out, wb, before } = await existing(t);
      mockBis(t, bad);
      await assert.rejects(main(['--world-bank', wb], out), why);
      assert.equal(fs.readFileSync(out, 'utf8'), before);
      t.mock.restoreAll();
    }
  });

  it('a change over the limits: nothing is written, the summary names the comparison, and that name lets exactly it through', async (t) => {
    const { dir, out, wb, before } = await existing(t);
    const summary = path.join(dir, 'summary.md');
    // Spain's September moved by more than 2%.
    const moved = goodCsv({ spain: 150 });
    const refused = mockBis(t, moved);
    await assert.rejects(main(['--world-bank', wb, '--summary', summary], out), /the new months differ from the committed file by more than a refresh may \(1 values moved by more than 2%\)$/);
    assert.equal(fs.readFileSync(out, 'utf8'), before);
    assert.deepEqual(filesIn(dir), ['bis-monthly.json', 'summary.md', 'worldbank.json']);
    const name = /accept exactly this comparison: `([0-9a-f]{12})`/.exec(refused.said())?.[1];
    assert.ok(name, 'the summary gives the comparison a name');
    assert.ok(fs.readFileSync(summary, 'utf8').includes(`Refused: no data was written. If this change is real, run again with this name to accept exactly this comparison: \`${name}\``));
    t.mock.restoreAll();

    // Another name does not let it through, and says which name would.
    mockBis(t, moved);
    await assert.rejects(main(['--world-bank', wb, '--accept', '000000000000'], out), new RegExp(`and the name given \\(000000000000\\) is not this comparison's \\(${name}\\)$`));
    assert.equal(fs.readFileSync(out, 'utf8'), before);
    t.mock.restoreAll();

    // Its own name does, and the summary says it was let through by hand.
    const accepted = mockBis(t, moved);
    await main(['--world-bank', wb, '--accept', name], out);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).countries.ESP.months[`${YEAR}-09`], 150);
    assert.ok(accepted.said().includes(`This change is over the limits and was let through by hand, as comparison \`${name}\`.`));
    t.mock.restoreAll();

    // A name given for a change within the limits changes nothing about it.
    const { out: out2, wb: wb2 } = await existing(t);
    const within = mockBis(t, goodCsv({ extra: [`BIS:WS_LONG_CPI(1.0),M,ES,628,${YEAR}-10,137,A`] }));
    await main(['--world-bank', wb2, '--accept', name], out2);
    assert.ok(!within.said().includes('let through by hand'));
    assert.ok(!within.said().includes('Refused'));
  });
});

describe('fetch-inflation-monthly: the files it reads', () => {
  it('needs the yearly file, with countries', async (t) => {
    const { dir, out } = setUp();
    mockBis(t, goodCsv());
    await assert.rejects(main(['--first-import', '--world-bank', path.join(dir, 'none.json')], out));
    const empty = path.join(dir, 'empty.json');
    for (const content of ['{}', 'null', '{"countries":null}', '{"countries":5}']) {
      fs.writeFileSync(empty, content);
      await assert.rejects(main(['--first-import', '--world-bank', empty], out), /the yearly data at .*empty\.json has no countries/, content);
    }
    assert.equal(fs.existsSync(out), false);
  });

  it('needs the committed months to compare with, unless told there have never been any', async (t) => {
    const { out, wb } = setUp();
    const { calls } = mockBis(t, goodCsv());
    await assert.rejects(main(['--world-bank', wb], out), /the committed data at .*bis-monthly\.json cannot be read \(.*\), so there is nothing to compare the new data with\. Restore the file, or run with --first-import if there has never been one$/);
    // Refused before the BIS is asked for anything.
    assert.equal(calls.length, 0);
    for (const content of ['{}', 'null', '{"countries":null}', '{"countries":"x"}']) {
      fs.writeFileSync(out, content);
      await assert.rejects(main(['--world-bank', wb], out), /cannot be read \(it has no countries\)/, content);
    }
    // With --first-import a file that cannot be read is replaced.
    await main(['--first-import', '--world-bank', wb], out);
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(out, 'utf8')).countries).length, 45);
  });

  it('compares with the file it is given as the baseline, and writes to its own', async (t) => {
    const base = await existing(t);
    const { dir, wb } = setUp();
    const out = path.join(dir, 'bis-monthly.json');
    // The same answer as the baseline holds: nothing to write, though the output file does not exist.
    const same = mockBis(t, goodCsv());
    await main(['--world-bank', wb, '--baseline', base.out], out);
    assert.match(same.said(), /^Unchanged/m);
    assert.equal(fs.existsSync(out), false);
    t.mock.restoreAll();
    // A different answer is written to the output, and the baseline is left as it was.
    mockBis(t, goodCsv({ spain: 136.5 }));
    await main(['--world-bank', wb, '--baseline', base.out], out);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).countries.ESP.months[`${YEAR}-09`], 136.5);
    assert.equal(fs.readFileSync(base.out, 'utf8'), base.before);
  });
});

describe('fetch-inflation-monthly: the World Bank’s own monthly index', () => {
  const WB_NAMES = Array.from({ length: 100 }, (_, i) => `C${String(i).padStart(2, '0')}`);
  const WB_REQUIRED = ['USA', 'DEU', 'KEN'];
  const wbYearly = (dir) => {
    const file = path.join(dir, 'worldbank.json');
    fs.writeFileSync(file, JSON.stringify({ countries: Object.fromEntries([...WB_NAMES, ...WB_REQUIRED].map((c) => [c, { iso2: 'XX', years: { 2025: 1 } }])) }));
    return file;
  };
  const wbRow = (id, month, value) => ({ indicator: { id: 'CPTOTNSXN', value: 'CPI' }, country: { id, value: id }, date: `${YEAR}M${month}`, value });
  /** Two pages: the hundred made-up countries, then the three it always has; Kenya's July as given. */
  const wbPages = (kenya = 288) => (url) => {
    const n = Number(new URL(url).searchParams.get('page'));
    const meta = { page: n, pages: 2, per_page: 30000, total: 206, sourceid: '15', lastupdated: '2026-09-08' };
    const codes = n === 1 ? WB_NAMES : WB_REQUIRED;
    return [meta, codes.flatMap((c) => [wbRow(c, '06', 100), wbRow(c, '07', c === 'KEN' ? kenya : 101)])];
  };
  function mockWorldBank(t, pages) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, status: 200, json: async () => pages(String(url)) };
    });
    const lines = [];
    t.mock.method(console, 'log', (...a) => lines.push(a.join(' ')));
    return { calls, said: () => lines.join('\n') };
  }

  it('asks the World Bank for the Global Economic Monitor’s index, every page, as JSON, and writes its own file', async (t) => {
    const dir = newDir();
    const out = path.join(dir, 'worldbank-monthly.json');
    const { calls, said } = mockWorldBank(t, wbPages());
    await main(['--source', 'world-bank', '--first-import', '--world-bank', wbYearly(dir)], out);
    const base = `https://api.worldbank.org/v2/country/all/indicator/CPTOTNSXN?source=15&format=json&date=${YEAR - 8}M01:${YEAR}M12&per_page=30000`;
    assert.deepEqual(calls.map((c) => c.url), [`${base}&page=1`, `${base}&page=2`]);
    for (const call of calls) assert.deepEqual(call.options.headers, { accept: 'application/json' });
    const data = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(data.indicator, 'CPTOTNSXN');
    assert.equal(data.license, 'CC BY 4.0');
    assert.equal(data.lastUpdated, '2026-09-08');
    assert.deepEqual(data.countries.KEN, { area: 'KEN', months: { [`${YEAR}-06`]: 100, [`${YEAR}-07`]: 288 } });
    assert.equal(Object.keys(data.countries).length, 103);
    assert.match(said(), /^Wrote 103 countries of monthly figures to /m);
  });

  it('compares with the committed file under the same limits, under its own heading', async (t) => {
    const dir = newDir();
    const out = path.join(dir, 'worldbank-monthly.json');
    const wb = wbYearly(dir);
    mockWorldBank(t, wbPages());
    await main(['--source', 'world-bank', '--first-import', '--world-bank', wb], out);
    const before = fs.readFileSync(out, 'utf8');
    t.mock.restoreAll();
    const same = mockWorldBank(t, wbPages());
    await main(['--source', 'world-bank', '--world-bank', wb], out);
    assert.match(same.said(), /^Unchanged: 103 countries of monthly figures\.$/m);
    t.mock.restoreAll();
    // Kenya's July moved by more than 2%: refused, nothing written.
    const moved = mockWorldBank(t, wbPages(300));
    await assert.rejects(main(['--source', 'world-bank', '--world-bank', wb], out), /the new months differ from the committed file by more than a refresh may \(1 values moved by more than 2%\)$/);
    assert.ok(moved.said().startsWith('### Monthly index (World Bank, Global Economic Monitor)\n\n- Months added: 0'));
    assert.equal(fs.readFileSync(out, 'utf8'), before);
  });

  it('refuses a source it does not know, before asking anyone for anything', async (t) => {
    const dir = newDir();
    const { calls } = mockWorldBank(t, wbPages());
    await assert.rejects(main(['--source', 'imf', '--first-import', '--world-bank', wbYearly(dir)], path.join(dir, 'x.json')), /--source is "imf": it is bis or world-bank/);
    assert.equal(calls.length, 0);
  });
});

