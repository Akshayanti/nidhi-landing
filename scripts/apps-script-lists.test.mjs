/**
 * The two list actions the planner's admin tools call: waitlist.gs and
 * volunteer-list.gs. They run in Google's Apps Script runtime, so the tests
 * load each file into a Node VM with a small fake of the services it uses.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const BETA = "Invite me to the planner's beta when it opens.";
const WHEN = new Date('2026-01-01T00:00:00Z');

/** Loads a script with `rows` (header row first) as its only sheet. */
function load(file, rows, { sheetCount = 1 } = {}) {
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getName: () => 'tab',
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
    }),
  };
  const junk = { getLastRow: () => 1, getLastColumn: () => 1, getRange: () => ({ getValues: () => [['Notes']] }) };
  const sheets = sheetCount === 2 ? [junk, sheet] : [sheet];
  const ctx = {
    console: { error() {}, log() {}, warn() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),
    },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheets: () => sheets }),
      openById: () => ({ getSheetByName: () => sheet }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'x' }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://example.invalid/exec' }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx;
}

/** A POST whose action and token are in the form body, as the planner sends them. */
const post = (fields) => ({ parameter: fields, postData: { contents: new URLSearchParams(fields).toString() } });
const answer = (out) => JSON.parse(out.s);

// Test tokens: the scripts hold only hashes, so these tests swap the hash for one they know.
const TOKEN = 'a-test-token-for-the-list-action';
const HASH = crypto.createHash('sha256').update(TOKEN).digest('hex');
function withToken(ctx, constant) {
  vm.runInContext(`${constant} = '${HASH}';`, ctx);
  return ctx;
}

describe('waitlist.gs list action', () => {
  const rows = [
    ['email', 'source', 'created_at'],
    ['A@x.io', '/free/loan-comparison/', WHEN],
    ['a@x.io', '/other/', WHEN],
    ['not-an-email', 'p', WHEN],
    ['', 'p', WHEN],
    ['b@x.io', 'x'.repeat(500), WHEN],
  ];
  const ctx = () => withToken(load('scripts/waitlist.gs', rows), 'LIST_TOKEN_SHA256_');

  it('returns distinct valid addresses with only email, source and created_at', () => {
    const out = answer(ctx().doPost(post({ action: 'list', token: TOKEN })));
    assert.equal(out.ok, true);
    assert.deepEqual(out.items.map((i) => i.email), ['a@x.io', 'b@x.io']);
    assert.deepEqual(Object.keys(out.items[0]), ['email', 'source', 'created_at']);
    assert.equal(out.items[0].source, '/free/loan-comparison/');
    assert.equal(out.items[1].source.length, 200);
  });

  it('refuses a wrong, missing or oversized token', () => {
    for (const token of ['nope', '', 't'.repeat(500)]) {
      assert.equal(answer(ctx().doPost(post({ action: 'list', token }))).error, 'forbidden');
    }
  });

  it('never accepts the token or the action from the query string', () => {
    const query = { parameter: { action: 'list', token: TOKEN }, postData: { contents: '' } };
    const out = answer(ctx().doPost(query));
    assert.equal(out.ok, false);
    assert.equal(out.items, undefined);
  });

  it('answers schema when the columns are not where it expects them', () => {
    const swapped = [['source', 'email', 'created_at'], ['p', 'a@x.io', WHEN]];
    const c = withToken(load('scripts/waitlist.gs', swapped), 'LIST_TOKEN_SHA256_');
    assert.equal(answer(c.doPost(post({ action: 'list', token: TOKEN }))).error, 'schema');
  });

  it('returns an empty list for a sheet with only a header', () => {
    const c = withToken(load('scripts/waitlist.gs', [rows[0]]), 'LIST_TOKEN_SHA256_');
    assert.deepEqual(answer(c.doPost(post({ action: 'list', token: TOKEN }))), { ok: true, items: [] });
  });

  it('does not accept the count token for the list action', () => {
    const c = load('scripts/waitlist.gs', rows);
    assert.equal(answer(c.doPost(post({ action: 'list', token: TOKEN }))).error, 'forbidden');
  });

  it('keeps health output coarse', () => {
    const out = answer(ctx().doGet({ parameter: { action: 'health' } }));
    assert.deepEqual(out.checks.sheet, { ok: true });
    assert.equal(JSON.stringify(out).includes('tab'), false);
    assert.equal('web_app_url' in out, false);
  });
});

describe('volunteer-list.gs', () => {
  const header = ['Timestamp', 'Email', 'Name to credit (optional)', 'Planner beta (optional)'];
  const rows = [
    header,
    [WHEN, 'V@x.io', 'Private Name', BETA],
    [WHEN, 'w@x.io', 'Other', ''],
    [WHEN, 'v@x.io', 'Dup', BETA],
    [WHEN, 'bad', 'Bad', BETA],
    [WHEN, 'x@x.io', 'Multi', `Something, ${BETA}`],
  ];
  const ctx = (data = rows, options) => withToken(load('scripts/volunteer-list.gs', data, options), 'VOLUNTEER_LIST_TOKEN_SHA256_');

  it('returns only email and timestamp, only for ticked rows, once per address', () => {
    const out = answer(ctx().doPost(post({ action: 'list', token: TOKEN })));
    assert.equal(out.ok, true);
    assert.deepEqual(out.items.map((i) => i.email), ['v@x.io', 'x@x.io']);
    assert.deepEqual(Object.keys(out.items[0]), ['email', 'submitted_at']);
    assert.equal(JSON.stringify(out).includes('Private Name'), false);
  });

  it('finds columns by header text, so a reordered sheet still works', () => {
    const reordered = [['Planner beta (optional)', 'Email', 'Timestamp'], [BETA, 'r@x.io', WHEN]];
    const out = answer(ctx(reordered).doPost(post({ action: 'list', token: TOKEN })));
    assert.deepEqual(out.items.map((i) => i.email), ['r@x.io']);
  });

  it('finds the response tab by its headers, not by position', () => {
    const out = answer(ctx(rows, { sheetCount: 2 }).doPost(post({ action: 'list', token: TOKEN })));
    assert.equal(out.ok, true);
  });

  it('answers schema when a header is missing', () => {
    const missing = [['Timestamp', 'Email'], [WHEN, 'a@x.io']];
    assert.equal(answer(ctx(missing).doPost(post({ action: 'list', token: TOKEN }))).error, 'schema');
  });

  it('returns an empty list when there are no responses', () => {
    assert.deepEqual(answer(ctx([header]).doPost(post({ action: 'list', token: TOKEN }))), { ok: true, items: [] });
  });

  it('refuses a wrong, missing or oversized token', () => {
    for (const token of ['nope', '', 't'.repeat(500)]) {
      assert.equal(answer(ctx().doPost(post({ action: 'list', token }))).error, 'forbidden');
    }
  });

  it('never accepts the token or the action from the query string', () => {
    const query = { parameter: { action: 'list', token: TOKEN }, postData: { contents: '' } };
    assert.equal(answer(ctx().doPost(query)).error, 'not_found');
    const mixed = { parameter: { action: 'list', token: TOKEN }, postData: { contents: 'action=list' } };
    assert.equal(answer(ctx().doPost(mixed)).error, 'forbidden');
  });

  it('answers any other action and any GET with not_found', () => {
    assert.equal(answer(ctx().doPost(post({ action: 'count', token: TOKEN }))).error, 'not_found');
    assert.equal(answer(ctx().doGet({ parameter: { action: 'list', token: TOKEN } })).error, 'not_found');
  });

  it('keeps health output coarse', () => {
    const out = answer(ctx().doGet({ parameter: { action: 'health' } }));
    assert.deepEqual(out, { ok: true, checks: { web_app_url: { ok: true }, sheet: { ok: true } } });
  });

  it('matches the choice and the question titles the form script creates', () => {
    const form = fs.readFileSync('scripts/volunteer-form.gs', 'utf8');
    const list = load('scripts/volunteer-list.gs', rows);
    const get = (name) => vm.runInContext(name, list);
    // The form writes the choice as a single-quoted literal in setChoiceValues.
    const choice = /setChoiceValues\(\[('(?:[^'\\]|\\.)*')\]\)/g;
    const literals = [...form.matchAll(choice)].map((m) => vm.runInNewContext(m[1]));
    assert.ok(literals.includes(get('BETA_CHOICE_')), 'the beta choice text differs from the form');
    for (const [constant, title] of [['HEADER_EMAIL_', 'Email'], ['HEADER_TIMESTAMP_', 'Timestamp'], ['HEADER_BETA_', 'Planner beta (optional)']]) {
      assert.equal(get(constant), title);
      if (title !== 'Timestamp') assert.ok(form.includes(`.setTitle('${title}')`), `${title} is not a question title in the form`);
    }
  });
});

describe('sameString_', () => {
  const { sameString_ } = load('scripts/volunteer-list.gs', [['x']]);
  it('is true only for equal strings', () => {
    assert.equal(sameString_('abc', 'abc'), true);
    assert.equal(sameString_('abc', 'abd'), false);
    assert.equal(sameString_('abc', 'abcd'), false);
    assert.equal(sameString_('', ''), true);
  });
});
