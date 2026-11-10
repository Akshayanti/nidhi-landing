/**
 * newsletter.gs: the actions anyone can reach, and what happens when two
 * executions touch the subscriber sheet at once. The script runs in Google's
 * Apps Script runtime, so it is loaded into a Node VM with a fake of the
 * services it uses. The fake holds the handlers to the rules that keep row
 * numbers honest:
 *   - a sheet write needs the script lock, and a read of the sheet made since
 *     the lock was taken (a row number found before the lock is stale);
 *   - writes are flushed before the lock is released;
 *   - no mail goes out while the lock is held.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync('scripts/newsletter.gs', 'utf8');
const HEADERS = ['email', 'status', 'source', 'created_at', 'confirmed_at', 'unsubscribed_at', 'confirm_token', 'unsub_token', 'reminder_sent_at'];
const SECRET = 'a'.repeat(64);
const DAY = 24 * 60 * 60 * 1000;
// Inside the 06:00 to 12:59 UTC reminder window.
const NOW = Date.parse('2026-11-10T09:00:00Z');
const tok = (c) => c.repeat(64);

const row = (email, status, ageDays, { confirm = '', unsub = '', reminded = '' } = {}) =>
  [email, status, '/blog/', new Date(NOW - ageDays * DAY), '', '', confirm, unsub, reminded];

/** Loads the script over `dataRows`; returns the VM context plus what the fakes recorded. */
function load(dataRows = []) {
  const rows = [HEADERS.slice(), ...dataRows.map((r) => r.slice())];
  const props = { SHEET_ID: 'sheet', SHEET_NAME: 'tab', FROM_EMAIL: 'updates@nidhi.today', HMAC_SECRET: SECRET };
  const rec = { rows, props, mails: [], locked: false, lockTakes: 0, onSend: null, uuid: 0, readInLock: false, dirty: false, refuseLock: false };

  const mustHoldLock = (what) => {
    if (!rec.locked) throw new Error(`${what} without the script lock`);
    if (!rec.readInLock) throw new Error(`${what} with no read of the sheet since the lock was taken`);
    rec.dirty = true;
  };
  const read = (value) => { rec.readInLock = true; return value; };
  const sheet = {
    getLastRow: () => read(rows.length),
    getLastColumn: () => HEADERS.length,
    getName: () => 'tab',
    appendRow: (values) => { mustHoldLock('appendRow'); rows.push(values.concat(Array(HEADERS.length).fill('')).slice(0, HEADERS.length)); },
    deleteRow: (n) => { mustHoldLock('deleteRow'); rows.splice(n - 1, 1); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => read(rows.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc))),
      getValue: () => read(rows[r - 1][c - 1]),
      setValue: (v) => { mustHoldLock('setValue'); rows[r - 1][c - 1] = v; },
      setValues: (vs) => {
        mustHoldLock('setValues');
        vs.forEach((line, i) => line.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = v; }));
      },
    }),
  };

  const signed = (bytes) => [...bytes].map((b) => (b > 127 ? b - 256 : b));
  const html = () => ({ setXFrameOptionsMode() { return this; } });
  const ctx = {
    console: { error() {}, log() {}, warn() {} },
    Date: class extends Date {
      constructor(...a) { if (a.length) super(...a); else super(NOW); }
      static now() { return NOW; }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: (_a, s) => signed(crypto.createHash('sha256').update(s).digest()),
      computeHmacSha256Signature: (data, secret) => signed(crypto.createHmac('sha256', secret).update(data).digest()),
      getUuid: () => crypto.createHash('md5').update(String(rec.uuid++)).digest('hex'),
      formatDate: (d, _tz, fmt) => (fmt === 'H' ? String(d.getUTCHours()) : d.toISOString().slice(0, 10)),
      base64EncodeWebSafe: (s) => Buffer.from(s, 'utf8').toString('base64url'),
      base64Encode: (s) => Buffer.from(s, 'utf8').toString('base64'),
    },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 1 }, createHtmlOutput: (s) => ({ html: s, ...html() }) },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet, getSheets: () => [sheet] }),
      flush: () => { rec.dirty = false; },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; },
        getProperties: () => ({ ...props }),
      }),
    },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://example.invalid/exec' }) },
    LockService: {
      getScriptLock: () => ({
        // The real waitLock throws on a timeout. This one returns quietly when
        // told to refuse, so the handlers' own hasLock check is what is tested.
        waitLock: () => {
          if (rec.refuseLock) return;
          if (rec.locked) throw new Error('lock taken twice');
          rec.locked = true;
          rec.readInLock = false;
          rec.lockTakes++;
        },
        hasLock: () => rec.locked,
        releaseLock: () => {
          if (rec.dirty) throw new Error('lock released before the sheet writes were flushed');
          rec.locked = false;
        },
      }),
    },
    Gmail: {
      Users: {
        Messages: {
          send: ({ raw }) => {
            if (rec.locked) throw new Error('mail sent while holding the script lock');
            const mime = Buffer.from(raw, 'base64url').toString('utf8');
            const to = /^To: (.*)$/m.exec(mime)[1].trim();
            if (rec.onSend) rec.onSend(to, mime);
            rec.mails.push(to);
          },
        },
        Settings: { SendAs: { list: () => ({ sendAs: [{ sendAsEmail: 'updates@nidhi.today', verificationStatus: 'accepted' }] }) } },
        getProfile: () => ({ emailAddress: 'updates@nidhi.today' }),
      },
    },
    GmailApp: { search: () => [], getAliases: () => ['updates@nidhi.today'] },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'updates@nidhi.today' }) },
    UrlFetchApp: { fetch: () => ({}) },
  };
  vm.createContext(ctx);
  vm.runInContext(SOURCE, ctx);
  ctx.rec = rec;
  return ctx;
}

const req = (fields, body = '') => ({ parameter: fields, postData: { contents: body } });
const json = (out) => JSON.parse(out.s);
const emails = (ctx) => ctx.rec.rows.slice(1).map((r) => r[0]);
const find = (ctx, email) => ctx.rec.rows.find((r) => r[0] === email);
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('hex');

describe('newsletter.gs: no public reminder test', () => {
  const pending = [row('p@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') })];

  for (const [name, call] of [['POST', 'doPost'], ['GET', 'doGet']]) {
    it(`${name} action=test_remind sends nothing and says nothing about the address`, () => {
      const ctx = load(pending);
      const known = ctx[call](req({ action: 'test_remind', email: 'p@x.io' }));
      const unknown = ctx[call](req({ action: 'test_remind', email: 'nobody@x.io' }));
      assert.deepEqual(ctx.rec.mails, []);
      assert.deepEqual(known.s ?? known.html, unknown.s ?? unknown.html);
      if (name === 'POST') assert.deepEqual(json(known), { ok: false, error: 'unknown_action' });
    });
  }

  it('routes only the actions that are meant to be public', () => {
    const actions = [...SOURCE.matchAll(/if \(action === '([a-z_]+)'\)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(actions)].sort(), [
      'confirm', 'count', 'health', 'remind_pending', 'scan_bounces', 'send_post', 'subscribe', 'unsubscribe',
    ]);
  });

  it('the editor-only test still sends one reminder to a pending address', () => {
    const ctx = load(pending);
    ctx.rec.props.TEST_REMIND_EMAIL = 'P@x.io ';
    ctx.testRemindFromEditor();
    assert.deepEqual(ctx.rec.mails, ['p@x.io']);
    assert.equal(find(ctx, 'p@x.io')[8], '', 'reminder_sent_at is left alone');
    ctx.rec.props.TEST_REMIND_EMAIL = 'nobody@x.io';
    assert.throws(() => ctx.testRemindFromEditor());
    assert.equal(ctx.rec.locked, false, 'the lock is given back when the lookup fails');
  });
});

describe('newsletter.gs: sheet writes hold the lock', () => {
  it('subscribe appends a new address once, under the lock, and mails outside it', () => {
    const ctx = load();
    assert.deepEqual(json(ctx.doPost(req({ action: 'subscribe', email: 'New@x.io', source: '/blog/' }))), { ok: true });
    assert.deepEqual(emails(ctx), ['new@x.io']);
    assert.deepEqual(ctx.rec.mails, ['new@x.io']);
    assert.equal(ctx.rec.lockTakes, 1);
  });

  it('a request that cannot take the lock fails without touching the sheet', () => {
    const ctx = load([row('a@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') })]);
    const before = JSON.stringify(ctx.rec.rows);
    ctx.rec.refuseLock = true;
    assert.equal(json(ctx.doPost(req({ action: 'subscribe', email: 'new@x.io' }))).ok, false);
    assert.equal(json(ctx.doPost(req({ action: 'unsubscribe', t: tok('2') }))).ok, false);
    ctx.doPost(req({ action: 'confirm', t: tok('1') }));
    assert.throws(() => ctx.handleRemindPending());
    assert.equal(JSON.stringify(ctx.rec.rows), before);
    assert.deepEqual(ctx.rec.mails, []);
  });

  it('a second subscribe for the same address reuses the row', () => {
    const ctx = load();
    ctx.doPost(req({ action: 'subscribe', email: 'new@x.io' }));
    const first = find(ctx, 'new@x.io')[6];
    ctx.doPost(req({ action: 'subscribe', email: 'new@x.io' }));
    assert.deepEqual(emails(ctx), ['new@x.io']);
    assert.notEqual(find(ctx, 'new@x.io')[6], first, 'fresh confirm token');
  });

  it('subscribe for a confirmed address changes nothing and sends nothing', () => {
    const ctx = load([row('c@x.io', 'confirmed', 30, { unsub: tok('2') })]);
    const before = JSON.stringify(ctx.rec.rows);
    assert.deepEqual(json(ctx.doPost(req({ action: 'subscribe', email: 'c@x.io' }))), { ok: true });
    assert.equal(JSON.stringify(ctx.rec.rows), before);
    assert.deepEqual(ctx.rec.mails, []);
  });

  it('confirm and unsubscribe write to the row their token names', () => {
    const ctx = load([
      row('a@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') }),
      row('b@x.io', 'pending', 1, { confirm: tok('3'), unsub: tok('4') }),
    ]);
    ctx.doPost(req({ action: 'confirm', t: tok('3') }));
    assert.equal(find(ctx, 'a@x.io')[1], 'pending');
    assert.equal(find(ctx, 'b@x.io')[1], 'confirmed');
    assert.equal(find(ctx, 'b@x.io')[6], '', 'confirm token is single-use');
    assert.deepEqual(ctx.rec.mails, ['b@x.io'], 'welcome mail');

    assert.deepEqual(json(ctx.doPost(req({ action: 'unsubscribe', t: tok('4') }))), { ok: true });
    assert.equal(find(ctx, 'b@x.io')[1], 'unsubscribed');
    assert.deepEqual(json(ctx.doPost(req({ action: 'unsubscribe', t: tok('9') }))), { ok: false, error: 'invalid_token' });
  });
});

describe('newsletter.gs: reminder run', () => {
  const sheet = () => [
    row('old1@x.io', 'pending', 8, { confirm: tok('1') }),
    row('keep@x.io', 'confirmed', 40, { unsub: tok('2') }),
    row('due1@x.io', 'pending', 4, { confirm: tok('3') }),
    row('fresh@x.io', 'pending', 1, { confirm: tok('4') }),
    row('old2@x.io', 'pending', 9, { confirm: tok('5') }),
    row('due2@x.io', 'pending', 5, { confirm: tok('6') }),
    row('done@x.io', 'pending', 5, { confirm: tok('7'), reminded: new Date(NOW - DAY) }),
  ];

  it('reminds the due rows once, deletes the expired ones and nobody else', () => {
    const ctx = load(sheet());
    const out = json(ctx.handleRemindPending());
    assert.deepEqual(out, { ok: true, reminded: 2, deleted: 2, utc_hour: 9 });
    assert.deepEqual(ctx.rec.mails, ['due1@x.io', 'due2@x.io']);
    assert.deepEqual(emails(ctx), ['keep@x.io', 'due1@x.io', 'fresh@x.io', 'due2@x.io', 'done@x.io']);
    assert.ok(find(ctx, 'due1@x.io')[8] && find(ctx, 'due2@x.io')[8]);
    assert.equal(find(ctx, 'fresh@x.io')[8], '');

    // A second run straight after finds nothing left to do.
    assert.deepEqual(json(ctx.handleRemindPending()), { ok: true, reminded: 0, deleted: 0, utc_hour: 9 });
    assert.deepEqual(ctx.rec.mails, ['due1@x.io', 'due2@x.io']);
  });

  it('a run that starts while another is sending does not mail or delete again', () => {
    const ctx = load(sheet());
    let inner;
    let started = false;
    ctx.rec.onSend = () => {
      if (started) return;
      started = true;
      inner = json(ctx.handleRemindPending());
    };
    const outer = json(ctx.handleRemindPending());
    // The second run found the first reader claimed and took the other one;
    // the first run then found that one claimed. One mail each, in total.
    assert.deepEqual(inner, { ok: true, reminded: 1, deleted: 0, utc_hour: 9 });
    assert.deepEqual(outer, { ok: true, reminded: 1, deleted: 2, utc_hour: 9 });
    assert.deepEqual(ctx.rec.mails.slice().sort(), ['due1@x.io', 'due2@x.io']);
    assert.deepEqual(emails(ctx), ['keep@x.io', 'due1@x.io', 'fresh@x.io', 'due2@x.io', 'done@x.io']);
  });

  it('rows that move while mail is going out are not written to by number', () => {
    const ctx = load(sheet());
    // While the first reminder is being sent, the reader above confirms and
    // a new reader subscribes: every later row number is now different.
    ctx.rec.onSend = (to) => {
      if (to !== 'due1@x.io') return;
      ctx.rec.onSend = null;
      ctx.doPost(req({ action: 'unsubscribe', t: tok('2') }));
      ctx.rec.rows.splice(1, 1); // the owner deletes a row by hand
      ctx.doPost(req({ action: 'subscribe', email: 'late@x.io' }));
    };
    ctx.handleRemindPending();
    assert.deepEqual(emails(ctx), ['due1@x.io', 'fresh@x.io', 'due2@x.io', 'done@x.io', 'late@x.io']);
    assert.equal(find(ctx, 'fresh@x.io')[8], '');
    assert.equal(find(ctx, 'late@x.io')[1], 'pending');
    assert.equal(find(ctx, 'late@x.io')[8], '');
  });

  it('a reminder that fails to send is tried again next run, unless the reader moved on', () => {
    const ctx = load(sheet());
    ctx.rec.onSend = (to) => { if (to === 'due1@x.io') throw new Error('gmail down'); };
    assert.equal(json(ctx.handleRemindPending()).reminded, 1);
    assert.equal(find(ctx, 'due1@x.io')[8], '', 'claim given back');
    ctx.rec.onSend = null;
    assert.equal(json(ctx.handleRemindPending()).reminded, 1);
    assert.deepEqual(ctx.rec.mails, ['due2@x.io', 'due1@x.io']);

    const again = load(sheet());
    again.rec.onSend = (to) => {
      if (to !== 'due1@x.io') return;
      again.rec.onSend = null;
      again.doPost(req({ action: 'confirm', t: tok('3') }));
      throw new Error('gmail down');
    };
    again.handleRemindPending();
    assert.equal(find(again, 'due1@x.io')[1], 'confirmed');
    assert.ok(find(again, 'due1@x.io')[8], 'a confirmed row is left as it is');
  });

  it('claims one reader at a time, so a run that is cut off loses no one else', () => {
    const ctx = load(sheet());
    const stamped = [];
    ctx.rec.onSend = () => {
      stamped.push(ctx.rec.rows.slice(1).filter((r) => r[1] === 'pending' && r[8]).map((r) => r[0]));
    };
    ctx.handleRemindPending();
    // When the first mail went out, the second reader had not been claimed.
    assert.deepEqual(stamped, [['due1@x.io', 'done@x.io'], ['due1@x.io', 'due2@x.io', 'done@x.io']]);
  });

  it('stops taking readers when its time is up and leaves them for the next run', () => {
    const ctx = load(sheet());
    let clock = NOW;
    ctx.Date.now = () => clock;
    ctx.rec.onSend = () => { clock += 5 * 60 * 1000; };
    const out = json(ctx.handleRemindPending());
    assert.deepEqual([out.reminded, out.left_for_next_run], [1, 1]);
    assert.equal(find(ctx, 'due2@x.io')[8], '', 'still due');
    ctx.rec.onSend = null;
    clock = NOW;
    assert.equal(json(ctx.handleRemindPending()).reminded, 1);
    assert.deepEqual(ctx.rec.mails, ['due1@x.io', 'due2@x.io']);
  });

  it('reminds a due row whose address also sits on an earlier row', () => {
    // An older sheet can hold one address twice (two subscribes that raced).
    const ctx = load([
      row('twice@x.io', 'confirmed', 40, { unsub: tok('1') }),
      row('twice@x.io', 'pending', 4, { confirm: tok('2') }),
      row('again@x.io', 'pending', 5, { confirm: tok('3'), reminded: new Date(NOW - DAY) }),
      row('again@x.io', 'pending', 4, { confirm: tok('4') }),
    ]);
    assert.equal(json(ctx.handleRemindPending()).reminded, 2);
    assert.deepEqual(ctx.rec.mails, ['twice@x.io', 'again@x.io']);
    assert.equal(ctx.rec.rows[1][8], '', 'the confirmed row is not stamped');
    assert.ok(ctx.rec.rows[2][8] && ctx.rec.rows[4][8], 'the due rows are');
  });

  it('does nothing outside the sending hours', () => {
    const ctx = load(sheet());
    vm.runInContext("Utilities.formatDate = function () { return '3'; };", ctx);
    assert.deepEqual(json(ctx.handleRemindPending()), { ok: true, skipped: 'outside_window', utc_hour: 3 });
    assert.equal(ctx.rec.rows.length, 8);
  });
});

describe('newsletter.gs: one fan-out per lesson', () => {
  const body = JSON.stringify({ guid: 'https://nidhi.today/blog/x/', subject: 'S', html: '<p>{{UNSUBSCRIBE_URL}}</p>', text: 't', url: 'u' });
  const send = (ctx) => json(ctx.doPost(req({ action: 'send_post', sig: sign(body) }, body)));
  const list = () => [
    row('b@x.io', 'confirmed', 30, { unsub: tok('1') }),
    row('a@x.io', 'confirmed', 30, { unsub: tok('2') }),
    row('B@x.io', 'confirmed', 30, { unsub: tok('3') }),
    row('p@x.io', 'pending', 1, { confirm: tok('4'), unsub: tok('5') }),
  ];

  it('mails each confirmed address once, then answers already_sent', () => {
    const ctx = load(list());
    assert.deepEqual(send(ctx), { ok: true, sent: 2, failed: 0, skipped_already_sent: 0 });
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io']);
    assert.equal(send(ctx).skipped, 'already_sent');
    assert.equal(Object.keys(ctx.rec.props).some((k) => k.startsWith('sending:')), false, 'claim released');
  });

  it('a second call for the same lesson during a send is told to come back', () => {
    const ctx = load(list());
    let inner;
    let started = false;
    ctx.rec.onSend = () => {
      if (started) return;
      started = true;
      inner = send(ctx);
    };
    const outer = send(ctx);
    assert.deepEqual(inner, { ok: true, sent: 0, failed: 0, partial: true, in_progress: true });
    assert.equal(outer.sent, 2);
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io']);
  });

  it('a claim left by a run that died is taken over', () => {
    const ctx = load(list());
    ctx.rec.props['sending:https://nidhi.today/blog/x/'] = `${NOW - 8 * 60 * 1000}:dead`;
    assert.equal(send(ctx).sent, 2);
  });

  it('a run that was taken over does not release the newer claim', () => {
    const ctx = load(list());
    const key = 'sending:https://nidhi.today/blog/x/';
    ctx.rec.onSend = () => { ctx.rec.props[key] = `${NOW}:the-run-that-took-over`; };
    send(ctx);
    assert.equal(ctx.rec.props[key], `${NOW}:the-run-that-took-over`);
  });

  it('a bad signature sends nothing', () => {
    const ctx = load(list());
    assert.deepEqual(json(ctx.doPost(req({ action: 'send_post', sig: 'f'.repeat(64) }, body))), { ok: false, error: 'bad_signature' });
    assert.deepEqual(ctx.rec.mails, []);
  });
});

describe('newsletter.gs: bounce scan', () => {
  it('marks a confirmed address named in a bounce, under the lock', () => {
    const ctx = load([
      row('a@x.io', 'confirmed', 30, { unsub: tok('1') }),
      row('gone@x.io', 'confirmed', 30, { unsub: tok('2') }),
    ]);
    ctx.GmailApp.search = () => [{ getMessages: () => [{ getSubject: () => 'Delivery Status Notification', getPlainBody: () => 'failed: <gone@x.io>' }] }];
    const out = json(ctx.doGet(req({ action: 'scan_bounces', sig: sign('scan_bounces') })));
    assert.equal(out.marked_bounced, 1);
    assert.equal(find(ctx, 'gone@x.io')[1], 'bounced');
    assert.equal(find(ctx, 'a@x.io')[1], 'confirmed');
  });
});
