/**
 * What the Apps Script files share (#444). Each .gs file is pasted into its
 * own Apps Script project by hand, so they cannot import one helper file.
 * Instead the shared code is one marked block, copied word for word:
 *   - "Shared helpers" in newsletter.gs, waitlist.gs and volunteer-list.gs;
 *   - "Volunteer form contract" in waitlist.gs (its count) and
 *     volunteer-list.gs (the planner's invite list).
 * These tests fail when a copy differs from the others, check that the
 * copies behave the same once loaded, and compare volunteer-list's list with
 * waitlist's count on the same rows, so the number the site shows and the
 * list the planner reads cannot drift apart.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const SHARED = ['scripts/newsletter.gs', 'scripts/waitlist.gs', 'scripts/volunteer-list.gs'];
const CONTRACT = ['scripts/waitlist.gs', 'scripts/volunteer-list.gs'];
const VOLUNTEER_SHEET_ID = '1K3LL_00Kq4L0ouTsr2cQc25xKNLn5YaI75KnKn9U3Z8';
const BETA = "Invite me to the planner's beta when it opens.";
const WHEN = new Date('2026-01-01T00:00:00Z');
const HEADER = ['Timestamp', 'Email', 'Name to credit (optional)', 'Planner beta (optional)'];

/** The text between `// <name>: begin` and `// <name>: end`, exactly once in the file. */
function block(file, name) {
  const source = fs.readFileSync(file, 'utf8');
  const begin = `// ${name}: begin`;
  const end = `// ${name}: end`;
  assert.equal(source.split(begin).length, 2, `${file} has one "${begin}"`);
  assert.equal(source.split(end).length, 2, `${file} has one "${end}"`);
  return source.slice(source.indexOf(begin), source.indexOf(end) + end.length);
}

/** The names a block defines (functions and vars). */
const definedIn = (text) => [...text.matchAll(/^(?:function|var) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);

function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] ? rows[0].length : 0),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
    }),
  };
}

/**
 * Loads a script with fakes of the services. `tabs` is the volunteer
 * spreadsheet as a list of tabs (each a list of rows, header first):
 * volunteer-list.gs is bound to it, and waitlist.gs opens it by id; the
 * waitlist itself is empty.
 */
function load(file, tabs = [[HEADER]]) {
  const volunteerBook = { getSheets: () => tabs.map(fakeSheet) };
  const waitlist = fakeSheet([['email', 'source', 'created_at']]);
  const ctx = {
    console: { error() {}, log() {}, warn() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => crypto.randomUUID(),
    },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => volunteerBook,
      openById: (id) => (id === VOLUNTEER_SHEET_ID ? volunteerBook : { getSheetByName: () => waitlist }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'x' }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://example.invalid/exec' }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx;
}

// The scripts hold only token hashes; the tests swap in the hash of a token they know.
const TOKEN = 'a-test-token';
const HASH = crypto.createHash('sha256').update(TOKEN).digest('hex');
const post = (fields) => ({ parameter: fields, postData: { contents: new URLSearchParams(fields).toString() } });

/** volunteer-list's answer on these tabs. */
function listAnswer(tabs) {
  const ctx = load('scripts/volunteer-list.gs', tabs);
  vm.runInContext(`VOLUNTEER_LIST_TOKEN_SHA256_ = '${HASH}';`, ctx);
  return JSON.parse(ctx.doPost(post({ action: 'list', token: TOKEN })).s);
}

/** waitlist's count on these tabs, with an empty waitlist, plus the volunteers it counted. */
function countAnswer(tabs) {
  const ctx = load('scripts/waitlist.gs', tabs);
  vm.runInContext(`COUNT_TOKEN_SHA256_ = '${HASH}';`, ctx);
  const answer = JSON.parse(ctx.doPost(post({ action: 'count', token: TOKEN })).s);
  const counted = ctx.betaVolunteers_(ctx.SpreadsheetApp.openById(VOLUNTEER_SHEET_ID));
  // Arrays made inside the VM belong to its realm: compare what they hold.
  return { answer, counted: counted && JSON.parse(JSON.stringify(counted.map((v) => v.email))) };
}

describe('the shared Apps Script helpers (#444)', () => {
  it('are the same text in newsletter.gs, waitlist.gs and volunteer-list.gs', () => {
    const [first, ...rest] = SHARED.map((f) => block(f, 'Shared helpers'));
    for (const [i, other] of rest.entries()) {
      assert.equal(other, first, `${SHARED[i + 1]}'s shared helpers differ from ${SHARED[0]}'s: change all three together`);
    }
    assert.deepEqual(definedIn(first).sort(), ['formBody_', 'isValidEmail_', 'normalizeEmail_', 'sameString_', 'sha256Hex_']);
  });

  it('are defined only inside the block, so no second copy can override them', () => {
    for (const file of SHARED) {
      const source = fs.readFileSync(file, 'utf8');
      const outside = source.replace(block(file, 'Shared helpers'), '');
      for (const name of definedIn(block(file, 'Shared helpers'))) {
        assert.doesNotMatch(outside, new RegExp(`^(?:function|var) ${name}\\b`, 'm'), `${file} defines ${name} outside the block`);
      }
      assert.doesNotMatch(source, /constantTimeEquals_/, `${file}: use sameString_`);
    }
  });

  it('give the same answers once loaded', () => {
    const ctxs = SHARED.map((f) => load(f));
    const emails = [' A@X.io ', 'first.last+tag@example.co.uk', '=cmd@x.io', '+a@x.io', 'a b@x.io', 'o\'brien@x.io', 'a@b', '', null, 'x@y.z\n', 'ä@bü.de'];
    const strings = [['abc', 'abc'], ['abc', 'abd'], ['abc', 'abcd'], ['', ''], ['a', '']];
    const bodies = ['action=list&token=t%2Bx', 'a=1&a=2', 'token=%E0%A4', '', 'x'.repeat(5000), 'k+ey=v+al&=&flag'];
    const answers = ctxs.map((c) => JSON.stringify({
      normalized: emails.map((e) => c.normalizeEmail_(e)),
      valid: emails.map((e) => c.isValidEmail_(c.normalizeEmail_(e))),
      sha: ['', 'abc', 'नमस्ते'].map((s) => c.sha256Hex_(s)),
      same: strings.map(([a, b]) => c.sameString_(a, b)),
      body: bodies.map((b) => c.formBody_({ postData: { contents: b } })),
    }));
    assert.equal(answers[1], answers[0], 'waitlist.gs differs from newsletter.gs');
    assert.equal(answers[2], answers[0], 'volunteer-list.gs differs from newsletter.gs');
    assert.equal(load(SHARED[0]).sha256Hex_('abc'), crypto.createHash('sha256').update('abc').digest('hex'));
  });
});

describe('the volunteer form contract (#444)', () => {
  it('is the same text in waitlist.gs and volunteer-list.gs', () => {
    const [a, b] = CONTRACT.map((f) => block(f, 'Volunteer form contract'));
    assert.equal(b, a, 'change both copies together');
    for (const name of ['volunteerResponses_', 'hasChoice_', 'betaVolunteers_']) assert.ok(definedIn(a).includes(name), name);
  });

  // Each case is the volunteer spreadsheet's tabs.
  const cases = {
    'ticked, unticked and duplicate rows': [[HEADER,
      [WHEN, 'V@x.io', 'n', BETA], [WHEN, 'w@x.io', 'n', ''], [WHEN, 'v@x.io', 'n', BETA], [WHEN, ' W@x.io', 'n', BETA]]],
    'a choice among others, and text that only contains it': [[HEADER,
      [WHEN, 'a@x.io', 'n', `Other, ${BETA}`], [WHEN, 'b@x.io', 'n', `${BETA}, Other`], [WHEN, 'c@x.io', 'n', `A, ${BETA}, B`],
      [WHEN, 'd@x.io', 'n', `${BETA} Not really`], [WHEN, 'e@x.io', 'n', `Maybe: ${BETA}`], [WHEN, 'f@x.io', 'n', `${BETA},Other`]]],
    'addresses only one validator used to accept': [[HEADER,
      [WHEN, '+a@x.io', 'n', BETA], [WHEN, '=b@x.io', 'n', BETA], [WHEN, 'c"d@x.io', 'n', BETA], [WHEN, 'bad', 'n', BETA], [WHEN, '', 'n', BETA], [WHEN, 'ok@x.io', 'n', BETA]]],
    'columns in another order': [[['Planner beta (optional)', 'Email', 'Timestamp'], [BETA, 'r@x.io', WHEN]]],
    'a notes tab before the responses': [[['Notes']], [HEADER, [WHEN, 'n@x.io', 'n', BETA]]],
    'no responses yet': [[HEADER]],
  };

  for (const [name, tabs] of Object.entries(cases)) {
    it(`the list and the count agree: ${name}`, () => {
      const list = listAnswer(tabs);
      const { answer, counted } = countAnswer(tabs);
      assert.equal(list.ok, true);
      assert.deepEqual(answer, { ok: true, count: list.items.length });
      assert.deepEqual(counted, list.items.map((i) => i.email));
    });
  }

  it('the exact match is the definition: "contains the text" does not count', () => {
    const { items } = listAnswer(cases['a choice among others, and text that only contains it']);
    assert.deepEqual(items.map((i) => i.email), ['a@x.io', 'b@x.io', 'c@x.io']);
  });

  for (const [name, tabs] of Object.entries({
    'two tabs carry the headers (an archived copy)': [[HEADER, [WHEN, 'old@x.io', 'n', BETA]], [HEADER, [WHEN, 'new@x.io', 'n', BETA]]],
    'a header is missing': [[['Timestamp', 'Email'], [WHEN, 'a@x.io']]],
  })) {
    it(`both refuse to guess when ${name}`, () => {
      assert.deepEqual(listAnswer(tabs), { ok: false, error: 'schema' });
      assert.deepEqual(countAnswer(tabs).answer, { ok: false, error: 'schema' });
    });
  }

  it('volunteer-list health is not ok when two tabs carry the headers', () => {
    const ctx = load('scripts/volunteer-list.gs', [[HEADER], [HEADER]]);
    const health = JSON.parse(ctx.doGet({ parameter: { action: 'health' } }).s);
    assert.equal(health.ok, false);
    assert.deepEqual(health.checks.sheet, { ok: false });
  });
});
