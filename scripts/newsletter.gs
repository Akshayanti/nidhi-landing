/**
 * Nidhi blog newsletter — Google Apps Script Web App
 * ===================================================
 *
 * Deploy this as a Web App (Deploy → New deployment → Web app).
 *   Execute as:    Me (<your Workspace account>)
 *   Who has access: Anyone
 *
 * After any code change: Deploy → Manage deployments → ✏️ → New version →
 * Deploy. The /exec URL stays the same.
 *
 * Required setup in the Apps Script project:
 *   1. Services (left rail) → Add service → "Gmail API" (advanced service).
 *      Needed to send raw MIME with List-Unsubscribe headers.
 *   2. Project Settings → Script properties → add:
 *        SHEET_ID        <id of the Google Sheet — between /d/ and /edit in the URL>
 *        SHEET_NAME      <name of the tab in that Sheet — MUST match exactly>
 *        FROM_NAME       nidhi
 *        FROM_EMAIL      updates@nidhi.today  (MUST be an address this
 *                        Apps Script account is allowed to send from —
 *                        either the script owner's primary address or a
 *                        verified "Send mail as" alias. Replies go to
 *                        hello@nidhi.today via Reply-To header.)
 *        SITE_URL        https://nidhi.today
 *        HMAC_SECRET     <random 64 hex chars — `openssl rand -hex 32` —
 *                        used ONLY for signing GH-Actions-originated
 *                        send_post requests. Per-subscriber tokens are
 *                        random opaque values, not HMAC-derived.>
 *        POSTHOG_API_KEY (optional) for server-side event tracking
 *        POSTHOG_HOST    (optional) https://eu.i.posthog.com
 *
 *   3. Create the Sheet with these EXACT headers in row 1 (9 columns):
 *        email | status | source | created_at | confirmed_at |
 *        unsubscribed_at | confirm_token | unsub_token | reminder_sent_at
 *      Statuses: pending | confirmed | unsubscribed | bounced
 *
 *   4. Run `?action=health` once to verify the config. The response is JSON
 *      that says ok or not for properties, web app URL, Gmail advanced
 *      service, Sheet access and FROM_EMAIL sendability. It is public, so it
 *      gives no reasons: those are in the execution log (Apps Script →
 *      Executions).
 *
 * Endpoints (relative to /exec URL):
 *
 *   POST ?action=subscribe          form body: email, source
 *                                   Appends a pending row with two fresh
 *                                   random tokens; emails a confirmation
 *                                   link. Responds { ok: true } on any valid
 *                                   email (doesn't leak whether email was
 *                                   already subscribed).
 *
 *   GET  ?action=confirm&t=...      Opaque token lookup. Flips pending →
 *                                   confirmed, invalidates the confirm
 *                                   token (single-use). Redirects browser
 *                                   to {SITE_URL}/subscription-confirmed/.
 *                                   On bad token: redirects to
 *                                   {SITE_URL}/subscription-invalid/.
 *
 *   GET  ?action=unsubscribe&t=...  Never unsubscribes: a link can be
 *                                   followed by a mail scanner. Redirects
 *                                   to {SITE_URL}/unsubscribe?t=..., whose
 *                                   button sends the POST below.
 *
 *   POST ?action=unsubscribe&t=...  Same behaviour but JSON response —
 *                                   used by Gmail's RFC 8058 one-click
 *                                   List-Unsubscribe button.
 *
 *   POST ?action=send_post          JSON body + `sig` query param
 *                                   (HMAC-SHA256 hex of raw body, signed
 *                                   with HMAC_SECRET). Sends to all
 *                                   confirmed subscribers using Gmail API
 *                                   raw send with List-Unsubscribe headers.
 *                                   Chunks by elapsed time to stay under
 *                                   the 6-minute execution cap.
 *
 *   POST action=count               form body: action, token
 *                                   Returns { ok: true, count } (distinct
 *                                   confirmed subscribers) when the token's
 *                                   SHA-256 matches COUNT_TOKEN_SHA256_;
 *                                   { ok: false, error: 'forbidden' } otherwise.
 *
 *   Reminders and deletions: not a web action. handleRemindPending runs
 *   from an hourly time trigger. It sends one reminder to each pending
 *   subscriber whose row is older than 3 days and has had none (between
 *   9:00 and 11:59 Prague time), deletes pending rows after 7 days,
 *   unsubscribed rows after 30 days and bounced rows after a week.
 *
 *   Reminder test: not a web action. Run testRemindFromEditor from the
 *   Apps Script editor (see its comment).
 *
 *   GET  ?action=health             Per-dependency ok or not, as JSON; the
 *                                   reasons go to the execution log. Safe
 *                                   to call; never modifies anything.
 *
 *   GET  ?action=scan_bounces       Signed: &ts=<unix seconds>&sig=<hmac of
 *                                   "scan_bounces:<ts>">, good for five
 *                                   minutes. Reads Google's delivery
 *                                   failure reports about this script's
 *                                   mail in the FROM_EMAIL inbox from the
 *                                   last 14 days and marks the rows they
 *                                   name as `bounced` so future sends skip
 *                                   them.
 *                                   Idempotent. Triggered daily by the
 *                                   deploy workflow; can be curled
 *                                   manually with a signed URL.
 *
 * One-shot maintenance:
 *   migrateAddTokens  — run from the Apps Script editor after upgrading
 *                       to this version if the Sheet has pre-existing
 *                       rows without token columns. Backfills opaque
 *                       tokens for every row that doesn't have them yet.
 */

// ============================================================================
// Config helpers
// ============================================================================

function props_() {
  return PropertiesService.getScriptProperties();
}

function prop_(key, fallback) {
  var v = props_().getProperty(key);
  return (v === null || v === undefined || v === '') ? (fallback || '') : v;
}

function requireProp_(key) {
  var v = prop_(key);
  if (!v) throw new Error('Missing required script property: ' + key);
  return v;
}

function config_() {
  return {
    sheetId:        requireProp_('SHEET_ID'),
    sheetName:      requireProp_('SHEET_NAME'),
    fromName:       prop_('FROM_NAME', 'nidhi'),
    fromEmail:      requireProp_('FROM_EMAIL'),
    siteUrl:        prop_('SITE_URL', 'https://nidhi.today').replace(/\/$/, ''),
    hmacSecret:     requireProp_('HMAC_SECRET'),
    posthogKey:     prop_('POSTHOG_API_KEY', ''),
    posthogHost:    prop_('POSTHOG_HOST', 'https://eu.i.posthog.com').replace(/\/$/, ''),
    webAppUrl:      ScriptApp.getService().getUrl(),
  };
}

// ============================================================================
// Random tokens & request signing
// ============================================================================

/**
 * Per-subscriber opaque random token. 64 hex chars (~256 bits). Not derived
 * from the email or any other data — just random. Stored in the Sheet.
 * Compromise requires stealing the Sheet, not guessing the email.
 */
function randomToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/**
 * HMAC-SHA256 → hex, for signing GH-Actions-originated send_post and
 * scan_bounces requests. NOT used for per-subscriber confirm/unsub tokens
 * — those are opaque random (see randomToken_).
 *
 * Why the explicit UTF-8 charset:
 *   The two-arg overload computeHmacSha256Signature(value, key) uses an
 *   implementation-defined charset when converting the String args to
 *   bytes, which is not guaranteed stable across Apps Script runtime
 *   versions (Rhino vs V8) or Google's request-ingress normalization.
 *   That produced a subtle `bad_signature` bug when the signed body
 *   contained non-ASCII bytes (em-dashes, curly quotes, etc. baked into
 *   rendered blog HTML): Python signed the UTF-8 bytes, but Apps Script
 *   re-hashed the decoded String using a different charset, and the two
 *   HMACs disagreed. Passing UTF_8 explicitly makes the output
 *   deterministic. Paired with Python now using ensure_ascii=True on
 *   the send side, this is belt-and-suspenders — either half would fix
 *   it, both guarantee it can't come back.
 */
function hmacHex_(secret, data) {
  var bytes = Utilities.computeHmacSha256Signature(data, secret, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify GH-Actions-signed send_post request. Signature format: hex-only. */
function verifyRequestSignature_(rawBody, signatureHex) {
  if (!signatureHex) return false;
  if (!/^[0-9a-f]{64}$/i.test(String(signatureHex))) return false;
  var cfg = config_();
  var expected = hmacHex_(cfg.hmacSecret, rawBody);
  return constantTimeEquals_(expected, String(signatureHex).toLowerCase());
}

// How far a scan_bounces request's time may be from this script's clock.
var SCAN_SIGNATURE_WINDOW_MS_ = 5 * 60 * 1000;

/**
 * Verify a scan_bounces request. There is no body to sign, so the caller
 * signs the action's name with the time it was made, `scan_bounces:<unix
 * seconds>`, and sends that time as `ts`. A signature is good for five
 * minutes either side of this script's clock and then for nothing: one that
 * is seen later (in a log, say) cannot be used again.
 */
function verifyScanBouncesSig_(signatureHex, ts) {
  if (!signatureHex || !/^[0-9a-f]{64}$/i.test(String(signatureHex))) return false;
  if (!/^[0-9]{9,11}$/.test(String(ts || ''))) return false;
  if (Math.abs(Date.now() - Number(ts) * 1000) > SCAN_SIGNATURE_WINDOW_MS_) return false;
  var expected = hmacHex_(config_().hmacSecret, 'scan_bounces:' + ts);
  return constantTimeEquals_(expected, String(signatureHex).toLowerCase());
}

// ============================================================================
// Sheet I/O
// ============================================================================

var COL = {
  email:           1,
  status:          2,
  source:          3,
  createdAt:       4,
  confirmedAt:     5,
  unsubscribedAt:  6,
  confirmToken:    7,
  unsubToken:      8,
  reminderSentAt:  9,
};

var EXPECTED_HEADERS = [
  'email', 'status', 'source', 'created_at', 'confirmed_at',
  'unsubscribed_at', 'confirm_token', 'unsub_token', 'reminder_sent_at',
];

/**
 * Open the configured tab of the configured spreadsheet.
 *
 * Fails loud if the tab doesn't exist (previous versions silently
 * auto-created a "Subscribers" tab when SHEET_NAME didn't match, which
 * caused data to land in a tab the operator wasn't watching). This version
 * requires an explicit match.
 */
/**
 * The subscriber tab, once its header row has been checked.
 *
 * Every handler reads and writes cells by position (COL). The Sheet is
 * edited by hand, and one inserted or moved column would make every one of
 * them use the wrong cells: tokens looked up in the wrong column (every
 * confirm and unsubscribe link "invalid"), a status written into another
 * field, a send that finds nobody confirmed. So a tab whose first nine
 * headers are not the expected ones is refused here, before anything is
 * read or written, and the reason goes to the execution log. Columns added
 * after the ninth are fine.
 */
function sheet_() {
  var sh = sheetUnchecked_();
  var headers = sh.getRange(1, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
  var wrong = EXPECTED_HEADERS.filter(function (h, i) {
    return String(headers[i] || '').trim().toLowerCase() !== h;
  });
  if (wrong.length) {
    throw new Error(
      'Sheet header row mismatch: nothing was read or written. Expected the first ' +
      EXPECTED_HEADERS.length + ' columns to be: ' + EXPECTED_HEADERS.join(' | ') +
      '. Missing or out of place: ' + wrong.join(', ') +
      '. Put the columns back in that order (a column may be added after the last one).'
    );
  }
  return sh;
}

/** The subscriber tab as it is, for the one function whose job is to repair its header row. */
function sheetUnchecked_() {
  var cfg = config_();
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sh = ss.getSheetByName(cfg.sheetName);
  if (!sh) {
    var existing = ss.getSheets().map(function (s) { return s.getName(); });
    throw new Error(
      'Sheet tab "' + cfg.sheetName + '" not found in spreadsheet ' +
      cfg.sheetId + '. Existing tabs: [' + existing.join(', ') + ']. ' +
      'Either rename an existing tab to "' + cfg.sheetName + '", or update ' +
      'the SHEET_NAME script property to match.'
    );
  }
  return sh;
}

// How long a request waits for the lock before it gives up with an error.
var LOCK_WAIT_MS_ = 20000;

/**
 * Runs `fn` while holding the script lock, so no other execution of this
 * script can change the Sheet between a handler finding a row and writing to
 * it. Every handler that reads the Sheet and then writes goes through here,
 * and looks its row up inside the lock: a row number found before the lock
 * was taken may belong to someone else by the time it is used.
 *
 * Mail and analytics calls stay outside the lock. They take seconds, and
 * holding the lock for them would make a reader's subscribe request wait
 * behind a reminder run.
 */
function withSheetLock_(fn) {
  var lock = LockService.getScriptLock();
  // waitLock throws when the wait runs out. hasLock is checked as well, so
  // nothing below can ever run without the lock.
  lock.waitLock(LOCK_WAIT_MS_);
  if (!lock.hasLock()) throw new Error('Could not take the script lock.');
  try {
    return fn();
  } finally {
    // Sheet writes are buffered. They are committed before the lock is given
    // up, or the next execution could read the Sheet as it was before them.
    try {
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }
}

function findSubscriberRow_(sh, email) {
  email = email.toLowerCase().trim();
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var emails = sh.getRange(2, COL.email, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    var cell = String(emails[i][0] || '').toLowerCase().trim();
    if (cell === email) return i + 2;
  }
  return 0;
}

/**
 * Look up a row by the value in one of the token columns. Linear scan over
 * the column — fine at the scale we operate at (Sheet <= a few thousand rows
 * before we'd migrate off anyway).
 */
function findRowByToken_(sh, colIndex, token) {
  token = String(token || '').trim();
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return 0; // malformed token
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var values = sh.getRange(2, colIndex, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var cell = String(values[i][0] || '').trim();
    if (cell && constantTimeEquals_(cell, token)) return i + 2;
  }
  return 0;
}

function listConfirmedSubscribers_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, EXPECTED_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === 'confirmed') {
      out.push({
        email: String(rows[i][0]).trim(),
        unsubToken: String(rows[i][7]).trim(),
      });
    }
  }
  return out;
}

// ============================================================================
// Email sending (Gmail raw send with List-Unsubscribe)
// ============================================================================

/** Text as base64 of its UTF-8 bytes, in lines of 76 characters (RFC 2045). */
function base64Lines_(text) {
  var encoded = Utilities.base64Encode(String(text == null ? '' : text), Utilities.Charset.UTF_8);
  var lines = [];
  for (var i = 0; i < encoded.length; i += 76) lines.push(encoded.slice(i, i + 76));
  return lines.join('\r\n');
}

function buildMimeMessage_(opts) {
  // opts: { from, fromName, to, subject, html, text, listUnsubPostUrl,
  //         listId, messageId }
  // listUnsubPostUrl is the URL that Gmail/Outlook POST to when the user
  // clicks the native one-click unsubscribe button (RFC 8058).
  // Replies always go to hello@nidhi.today regardless of the sending address.
  var boundary = 'nidhi-' + Utilities.getUuid();
  var headers = [
    'From: ' + formatAddress_(opts.fromName, opts.from),
    'Reply-To: ' + formatAddress_(opts.fromName, 'hello@nidhi.today'),
    'To: ' + opts.to,
    'Subject: ' + encodeSubject_(opts.subject),
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    'List-ID: ' + opts.listId,
    'Precedence: bulk',
    'Auto-Submitted: auto-generated',
    // Ties a delivery failure report back to this mail and this recipient
    // (see mailRef_ and the bounce scanner).
    'X-Nidhi-Ref: ' + mailRef_(opts.to),
  ];
  if (opts.messageId) headers.push('Message-ID: <' + opts.messageId + '>');
  // The one-click unsubscribe headers (RFC 8058) only when there is an
  // address to give. The reminder goes to someone who has not confirmed and
  // has nothing to unsubscribe from; it used to carry the header with
  // "<null>" in it, which a mail provider reads as a broken bulk sender.
  if (opts.listUnsubPostUrl) {
    headers.push('List-Unsubscribe: <' + opts.listUnsubPostUrl + '>');
    headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
  }

  // Both parts go as base64 in lines of 76 characters. A lesson's HTML has
  // lines of thousands of characters, over the 998 a mail line may have, and
  // a relay that re-wraps such a line can break the markup; base64 also
  // carries the UTF-8 bytes (curly apostrophes, Devanagari) without relying
  // on every relay passing 8-bit text through.
  var parts = [
    '--' + boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines_(opts.text),
    '',
    '--' + boundary,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines_(opts.html),
    '',
    '--' + boundary + '--',
    '',
  ];

  return headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
}

function formatAddress_(name, email) {
  if (!name) return email;
  var safe = String(name).replace(/["\\]/g, '\\$&');
  return '"' + safe + '" <' + email + '>';
}

function encodeSubject_(subject) {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return '=?UTF-8?B?' + Utilities.base64Encode(subject, Utilities.Charset.UTF_8) + '?=';
}

function sendRaw_(mimeMessage) {
  // Explicit UTF-8 when base64-encoding the full MIME payload. Without
  // the charset arg, Utilities.base64EncodeWebSafe(String) falls back to
  // an implementation-defined default that has historically been Latin-1
  // in Apps Script's legacy code paths — which can't represent characters
  // above U+00FF. The practical symptom is a correctly-rendered subject
  // line (encodeSubject_ passes UTF_8 explicitly below) but every
  // em-dash / curly quote / ellipsis / any non-Latin-1 char in the body
  // arriving at Gmail as "?". The MIME headers already declare
  // charset="UTF-8" + Content-Transfer-Encoding: 8bit, so once we hand
  // Gmail correct UTF-8 bytes the end-to-end rendering is fine.
  var raw = Utilities.base64EncodeWebSafe(mimeMessage, Utilities.Charset.UTF_8);
  // eslint-disable-next-line no-undef
  return Gmail.Users.Messages.send({ raw: raw }, 'me');
}

// ============================================================================
// HTTP entry points
// ============================================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'confirm')         return handleConfirm_(e);
    if (action === 'unsubscribe')     return handleUnsubscribe_(e, 'GET');
    if (action === 'health')          return handleHealth_();
    if (action === 'scan_bounces')    return handleScanBounces_(e);
    return htmlResponse_(pageTemplate_(
      'Nothing here',
      'This endpoint powers newsletter signups on nidhi.today.',
      'Go to the blog',
      config_().siteUrl + '/blog/'
    ));
  } catch (err) {
    // The message can name the spreadsheet, its tabs or the sending account,
    // so it is logged here and the caller gets a fixed sentence.
    console.error('[newsletter] GET failed: ' + err);
    return htmlResponse_(pageTemplate_(
      'Something went wrong',
      'Please try again in a little while.',
      'Go to the blog',
      safeSiteUrl_() + '/blog/'
    ));
  }
}

function doPost(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'subscribe')       return handleSubscribe_(e);
    if (action === 'confirm')         return handleConfirm_(e);   // JS-initiated confirm
    if (action === 'unsubscribe')     return handleUnsubscribe_(e, 'POST');
    if (action === 'send_post')       return handleSendPost_(e);
    if (action === 'scan_bounces')    return handleScanBounces_(e);
    if (action === 'count')           return handleCount_(e);
    return jsonResponse_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error('[newsletter] POST failed: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
}

/**
 * The form-encoded POST body as an object. e.parameter also carries the query
 * string, so a credential must come from here to be sure it was not sent in
 * the URL, where it would end up in logs.
 */
function formBody_(e) {
  var out = {};
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw.length > 4096) return out;
  raw.split('&').forEach(function (pair) {
    if (!pair) return;
    var at = pair.indexOf('=');
    try {
      var key = decodeURIComponent((at < 0 ? pair : pair.slice(0, at)).replace(/\+/g, ' '));
      var value = at < 0 ? '' : decodeURIComponent(pair.slice(at + 1).replace(/\+/g, ' '));
      if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = value;
    } catch (_) { /* a malformed pair is dropped */ }
  });
  return out;
}

// Longest token the count action will hash: the real one is 64 characters, so
// anything longer is not it and is not worth hashing.
var MAX_TOKEN_LENGTH_ = 128;

// The newsletter's size, for the line in the site's newsletter boxes ("20+
// readers get new lessons by email."). The site's build asks once per build
// with a secret token and gets back one number: distinct confirmed
// subscribers (listConfirmedSubscribers_ reads status `confirmed` only), so
// pending, unsubscribed and bounced rows are not counted, and nothing
// about any one person is returned.
//
// The SHA-256 of the count token, in hex. The token itself lives only in the
// landing site's NEWSLETTER_COUNT_TOKEN secret (and the founder's local .env);
// the hash of a 256-bit random token says nothing about it, so it can sit in
// the source. To rotate: make a new token (openssl rand -hex 32), set the
// secret, put its SHA-256 here, redeploy.
var COUNT_TOKEN_SHA256_ = 'cdf92fa17035c66fef3933ee54661e0bf3422fa8ead803f1818bce8a86e0e6d8';

function handleCount_(e) {
  // From the body only: a token in the address would end up in logs.
  var given = String(formBody_(e).token || '');
  if (!given || given.length > MAX_TOKEN_LENGTH_ || !constantTimeEquals_(sha256Hex_(given), COUNT_TOKEN_SHA256_)) {
    return jsonResponse_({ ok: false, error: 'forbidden' });
  }
  var seen = {};
  var count = 0;
  listConfirmedSubscribers_().forEach(function (s) {
    var email = String((s && s.email) || '').toLowerCase();
    if (email && email.indexOf('@') > 0 && !seen[email]) { seen[email] = true; count++; }
  });
  return jsonResponse_({ ok: true, count: count });
}

function safeSiteUrl_() {
  try { return config_().siteUrl; } catch (_) { return 'https://nidhi.today'; }
}

// ============================================================================
// UTM helpers
// ============================================================================
//
// Every link in every email carries newsletter UTMs so traffic lands in
// PostHog / GA with consistent source/medium/campaign. Source and medium
// are always newsletter / email; campaign varies by email purpose
// (`confirm`, `welcome`, or the post slug for newsletter sends — the last
// is baked into the Jinja-rendered payload by Python, not Apps Script).

/**
 * Canonical query fragment (no leading `?` or `&`). Keep in sync with
 * `_utm_query` in scripts/send_newsletter.py.
 */
function utmQuery_(campaign) {
  return 'utm_source=newsletter&utm_medium=email&utm_campaign=' +
    encodeURIComponent(campaign || 'newsletter');
}

/**
 * Append UTMs to a URL. Picks `?` or `&` based on existing query. Returns
 * the raw URL (caller must run it through escapeHtml_ before embedding).
 */
function withUtm_(url, campaign) {
  var sep = url.indexOf('?') >= 0 ? '&' : '?';
  return url + sep + utmQuery_(campaign);
}

// ============================================================================
// Health check
// ============================================================================

function handleHealth_() {
  var report = { ok: true, checks: {} };

  // The result is public, so it says only ok or not. The reason, which can
  // name the spreadsheet, its size, the sending account and its aliases, is
  // logged for the owner (Apps Script → Executions).
  function check(name, fn) {
    try {
      var info = fn();
      report.checks[name] = { ok: true };
      if (info) console.log('[newsletter] health check ' + name + ': ' + JSON.stringify(info));
    } catch (err) {
      report.ok = false;
      report.checks[name] = { ok: false };
      console.error('[newsletter] health check ' + name + ' failed: ' + err);
    }
  }

  check('script_properties', function () {
    var required = ['SHEET_ID', 'SHEET_NAME', 'FROM_NAME', 'FROM_EMAIL', 'SITE_URL', 'HMAC_SECRET'];
    var missing = required.filter(function (k) { return !prop_(k); });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
  });

  check('web_app_url', function () {
    if (!ScriptApp.getService().getUrl()) throw new Error('ScriptApp.getService().getUrl() returned empty: not deployed as a web app?');
  });

  check('gmail_advanced_service', function () {
    if (typeof Gmail === 'undefined') {
      throw new Error('Gmail advanced service not enabled. Apps Script → Services → + → Gmail API → Add.');
    }
    return { authorized_as: Gmail.Users.getProfile('me').emailAddress };
  });

  check('sheet_access', function () {
    var cfg = config_();
    var sh = sheet_();
    var headers = sh.getRange(1, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
    var mismatched = EXPECTED_HEADERS.filter(function (h, i) {
      return String(headers[i] || '').toLowerCase() !== h;
    });
    if (mismatched.length) {
      throw new Error(
        'Sheet header row mismatch. Expected ' + EXPECTED_HEADERS.length + ' columns: ' +
        EXPECTED_HEADERS.join(' | ') +
        '. Got: ' + headers.join(' | ') +
        '. Missing/wrong: ' + mismatched.join(', ')
      );
    }
    return { sheet_name: cfg.sheetName, rows: sh.getLastRow() };
  });

  check('from_email_sendable', function () {
    return fromEmailSendableReport_();
  });

  return jsonResponse_(report);
}

/**
 * Resolve the script owner's primary address + "Send mail as" aliases, and
 * determine whether FROM_EMAIL is actually sendable from this account.
 *
 * Returns { matches: 'primary'|'alias', primary, aliases } on success.
 * Throws a human-readable Error otherwise.
 *
 * Implementation notes:
 *  - Uses `Session.getEffectiveUser().getEmail()` rather than
 *    `Session.getActiveUser().getEmail()`. The active-user lookup returns
 *    an empty string for anonymous web-app callers (when the caller isn't
 *    in the same Workspace domain as the script owner — Google's
 *    cross-domain privacy policy). Effective-user returns the identity
 *    the script is running *as*, which, under "Execute as: Me", is the
 *    script owner — exactly the account whose mail identities we care
 *    about. This is the fix for the classic "primary: (), aliases: ()"
 *    health-check failure.
 *  - `GmailApp.getAliases()` can throw if the necessary Gmail scope hasn't
 *    been granted yet. Surface a clear next step instead of a raw stack.
 */
function fromEmailSendableReport_() {
  var cfg = config_();

  var primary = '';
  try { primary = Session.getEffectiveUser().getEmail() || ''; } catch (_) { /* leave empty */ }

  var aliases = [];
  try {
    aliases = GmailApp.getAliases() || [];
  } catch (err) {
    throw new Error(
      'Could not list "Send mail as" aliases: ' + err +
      '. This usually means the Gmail scope has not been authorized for this ' +
      'script yet. From the Apps Script editor, run sendConfirmationEmail_ or ' +
      'any email-sending function once manually to trigger the authorization ' +
      'prompt, then re-run ?action=health.'
    );
  }

  if (cfg.fromEmail === primary) {
    return { matches: 'primary', primary: primary, aliases: aliases };
  }
  if (aliases.indexOf(cfg.fromEmail) !== -1) {
    return { matches: 'alias', primary: primary, aliases: aliases };
  }

  throw new Error(
    'FROM_EMAIL "' + cfg.fromEmail + '" is neither the script owner\'s primary address (' +
    (primary || '<could not resolve — deploy "Execute as: Me">') +
    ') nor a verified "Send mail as" alias (' +
    (aliases.length ? aliases.join(', ') : '<none configured>') +
    '). Fix: in the Gmail account that owns this Apps Script, go to ' +
    'Settings → Accounts and Import → "Send mail as" and add + verify ' +
    cfg.fromEmail + '. Or change the FROM_EMAIL script property to an ' +
    'address already listed above.'
  );
}

/**
 * Lightweight preflight called at the top of handleSendPost_. Caches a
 * "checked today" marker in Script Properties so we don't redo the Gmail
 * metadata lookups on every send — but we DO catch silent breakages
 * (someone removed the "Send mail as" alias in Gmail settings) within 24h
 * instead of only when the operator happens to curl /health.
 *
 * Throws on misconfiguration, which handleSendPost_ surfaces to the
 * caller as { ok: false, error }. GitHub Actions' continue-on-error
 * prevents this from breaking the deploy, and the failure notification
 * step files a GitHub issue.
 */
function ensureFromEmailSendable_() {
  var today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var cacheKey = 'alias_check:' + today;
  if (prop_(cacheKey)) return;

  fromEmailSendableReport_();    // throws on misconfig

  props_().setProperty(cacheKey, '1');

  // Opportunistic cleanup of yesterday's (and older) markers so the
  // property store doesn't accumulate one dead key per day forever.
  var allProps = props_().getProperties();
  for (var k in allProps) {
    if (k.indexOf('alias_check:') === 0 && k !== cacheKey) {
      props_().deleteProperty(k);
    }
  }
}

// ============================================================================
// Subscribe
// ============================================================================

// A second submit for an address that is still waiting to confirm sends no
// second mail inside this window, and leaves the row as it is, so the link
// in the first mail keeps working. One form clicked many times, or a script
// aimed at someone else's address, could otherwise mail them every time:
// this allows four a day at most. A reader whose mail went astray can try
// again later, and the 3-day reminder carries the link too.
var RESEND_COOLDOWN_MS_ = 6 * 60 * 60 * 1000;

// Confirmation mails this script will send in one UTC day. Past it, a
// request changes nothing at all: no row is added (each would be owed a
// reminder mail three days on) and no existing row is touched (its link must
// keep working). The site cannot read this script's reply, so a real reader
// who signs up after the limit is hit sees the usual message and gets no mail
// that day; the limit is logged as an error so the owner sees it. That is the
// price of not letting a script send mail without end from this address.
//
// Why 100. Google counts recipients over a moving 24 hours, 1,500 for this
// account, not per UTC day. Three kinds of mail follow from a sign-up, each
// with a daily limit of this size: the confirmation; the reminder, owed for
// a confirmation three days earlier (MAX_REMINDERS_PER_DAY_); and the
// welcome, sent when someone confirms (MAX_WELCOMES_PER_DAY_). In the worst 24 hours a flood can take
// two UTC days of each: six times this limit, 600 mails. That leaves 900 for
// a lesson, which goes to every confirmed reader. So a lesson still goes out
// in full while the list is under 900 readers. Raise the list past that and
// these limits, or the mail service, have to change with it.
var MAX_CONFIRMATIONS_PER_DAY_ = 100;

// Reminder mails in one UTC day. Reminders are owed for rows admitted three
// days earlier, but runs that were late or failed could bring several days'
// worth on one day; this keeps the day's total to the figure counted above.
// A reader left out stays due and is reminded by a later run.
var MAX_REMINDERS_PER_DAY_ = 100;

// Welcome mails in one UTC day. Past it a reader is still confirmed, and the
// page they land on says so; only the extra mail is skipped.
var MAX_WELCOMES_PER_DAY_ = 100;

function handleSubscribe_(e) {
  var email = normalizeEmail_((e.parameter && e.parameter.email) || '');
  var source = cleanSource_(e.parameter && e.parameter.source);
  if (!isValidEmail_(email)) return jsonResponse_({ ok: false, error: 'invalid_email' });

  var now = new Date();
  var confirmToken = randomToken_();
  var unsubToken = randomToken_();

  // Find-then-write happens under the lock: two submits for one new address
  // cannot both append, and the row reset below cannot land on a row that a
  // deletion has just moved someone else into.
  var outcome = withSheetLock_(function () {
    var sh = sheet_();
    var row = findSubscriberRow_(sh, email);
    if (row !== 0) {
      var values = sh.getRange(row, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
      var status = String(values[COL.status - 1] || '').toLowerCase();
      if (status === 'confirmed') return 'confirmed';
      var createdAt = values[COL.createdAt - 1];
      // When this address was last sent a mail asking it to confirm: at
      // sign-up, or later (a re-send or the reminder, both stamped in
      // reminder_sent_at).
      var reminded = values[COL.reminderSentAt - 1];
      var lastAsked = Math.max(createdAt ? new Date(createdAt).getTime() : 0, reminded ? new Date(reminded).getTime() : 0) || 0;
      if (status === 'pending' && lastAsked && now.getTime() - lastAsked < RESEND_COOLDOWN_MS_) return 'recent';
    }
    // Checked before anything is written: past the limit nothing changes.
    if (!takeDailySlot_('confirm_mails', MAX_CONFIRMATIONS_PER_DAY_)) return 'capped';
    if (row === 0) {
      sh.appendRow([email, 'pending', source, now, '', '', confirmToken, unsubToken]);
      return 'pending';
    }
    var oldConfirm = String(values[COL.confirmToken - 1] || '').trim();
    var oldUnsub = String(values[COL.unsubToken - 1] || '').trim();
    // An unsubscribe link stays good for the life of a row: every mail
    // already sent to this address carries the old one.
    if (oldUnsub) unsubToken = oldUnsub;
    if (status === 'pending' && oldConfirm) {
      // Asked again while still waiting: the same link is sent again, so the
      // first mail's link keeps working, and created_at stays where it was,
      // so asking again cannot put off the 7-day expiry. The re-send counts
      // as this row's reminder: it is stamped where the reminder is, which
      // also starts the wait before the next re-send.
      confirmToken = oldConfirm;
      sh.getRange(row, COL.reminderSentAt).setValue(now);
      return 'pending';
    }
    // unsubscribed or bounced (or a pending row that lost its token): back
    // to pending with a new confirmation link and a new clock.
    sh.getRange(row, COL.status, 1, 9 - COL.email).setValues([[
      'pending', source, now, '', '', confirmToken, unsubToken, '',
    ]]);
    return 'pending';
  });

  // The reply is the same in every case: it must not say whether an address
  // is on the list, was just asked for, or hit the day's limit.
  if (outcome === 'confirmed') {
    trackPosthog_('blog_subscribe_duplicate', distinctIdForEmail_(email), { source: source });
    return jsonResponse_({ ok: true });
  }
  if (outcome === 'recent') return jsonResponse_({ ok: true });
  if (outcome === 'capped') {
    console.error('[newsletter] daily confirmation limit reached (' + MAX_CONFIRMATIONS_PER_DAY_ + '): nothing written, nothing sent');
    return jsonResponse_({ ok: true });
  }
  sendConfirmationEmail_(email, confirmToken);
  trackPosthog_('blog_subscribe_pending', distinctIdForEmail_(email), { source: source });
  return jsonResponse_({ ok: true });
}

/**
 * Counts one mail of a kind (`confirm_mails`, `welcome_mails`) against
 * today's limit; false once the limit is reached. Call inside the lock. The
 * day is read here, inside the lock, not when the request arrived: a request
 * that waited for the lock across midnight would otherwise count against
 * yesterday and, clearing "the other days", wipe today's count.
 */
function takeDailySlot_(kind, limit) {
  var today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var prefix = kind + ':';
  var key = prefix + today;
  var used = Number(prop_(key)) || 0;
  if (used >= limit) return false;
  props_().setProperty(key, String(used + 1));
  if (used === 0) {
    // First of the day: drop this kind's counters of days before today. A
    // later day cannot exist, and today's is never dropped.
    var all = props_().getProperties();
    for (var k in all) if (k.indexOf(prefix) === 0 && k.slice(prefix.length) < today) props_().deleteProperty(k);
  }
  return true;
}

// ============================================================================
// Pending-subscriber reminder
// ============================================================================
//
// Called via a GAS time-based trigger (hourly) bound directly to
// handleRemindPending, and by nothing else: it is not a web action, so
// nobody outside can choose the moment it runs. Reminders go out between
// 9:00 and 11:59 Prague time, as the privacy notice says. Sends exactly one
// reminder to each pending subscriber whose row is
// > 3 days old and hasn't received a reminder yet.
//
// Idempotent: the reminder_sent_at column ensures each pending subscriber
// gets at most one reminder. Repeated calls are harmless no-ops.

/**
 * Sends one test reminder, for checking how the reminder mail looks. Run it
 * from the Apps Script editor only (Run → testRemindFromEditor): it is not
 * reachable over the web, because a public version would tell anyone whether
 * an address is on the list and would mail a pending address on every call.
 *
 * Set the script property TEST_REMIND_EMAIL to the address first. It must be
 * a pending subscriber. The time gate is bypassed and reminder_sent_at is
 * not updated, so the hourly run still handles the row normally later.
 */
function testRemindFromEditor() {
  var email = normalizeEmail_(prop_('TEST_REMIND_EMAIL'));
  if (!email) throw new Error('Set the script property TEST_REMIND_EMAIL first.');

  // Row lookup and read share one lock, so the token read is this address's.
  var confirmToken = withSheetLock_(function () {
    var sh = sheet_();
    var row = findSubscriberRow_(sh, email);
    if (row === 0) throw new Error('TEST_REMIND_EMAIL is not in the sheet.');
    var values = sh.getRange(row, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
    if (String(values[COL.status - 1] || '').toLowerCase() !== 'pending') {
      throw new Error('TEST_REMIND_EMAIL is not a pending subscriber.');
    }
    return String(values[COL.confirmToken - 1] || '').trim();
  });
  if (!confirmToken) throw new Error('No confirm token on that row.');

  sendReminderEmail_(email, confirmToken);
  console.log('testRemindFromEditor: reminder sent.');
}

/** Reminders are sent from this hour up to, not including, the next one, Prague time. */
var REMIND_FROM_HOUR_ = 9;
var REMIND_UNTIL_HOUR_ = 12;

/** An unsubscribed row is deleted this long after the unsubscribe (privacy notice: "up to 30 days"). */
var UNSUBSCRIBED_KEPT_MS_ = 30 * 24 * 60 * 60 * 1000;

/**
 * A bounced row is deleted this long after it was marked (privacy notice:
 * "removed as soon as we notice them, usually within a week"). The week is
 * there so that a row marked by mistake can still be put back by hand.
 */
var BOUNCED_KEPT_MS_ = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes the rows the privacy notice says are removed: an unsubscribed row
 * 30 days after the unsubscribe, and a bounced row a week after it was
 * marked (both dates are in unsubscribed_at). Returns how many of each
 * went; no address is logged.
 *
 * A row whose date cannot be read is kept and counted, so that the owner
 * sees it in the log instead of losing a row by a guess.
 */
function purgeDepartedRows_(now) {
  var out = withSheetLock_(function () {
    var counts = { unsubscribed: 0, bounced: 0, undated: 0 };
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return counts;
    var rows = sh.getRange(2, 1, last - 1, EXPECTED_HEADERS.length).getValues();
    var rowsToDelete = [];
    for (var r = 0; r < rows.length; r++) {
      var status = String(rows[r][COL.status - 1] || '').toLowerCase();
      if (status !== 'unsubscribed' && status !== 'bounced') continue;
      var left = rows[r][COL.unsubscribedAt - 1];
      var age = left ? now.getTime() - new Date(left).getTime() : NaN;
      if (isNaN(age)) { counts.undated++; continue; }
      if (age < (status === 'bounced' ? BOUNCED_KEPT_MS_ : UNSUBSCRIBED_KEPT_MS_)) continue;
      rowsToDelete.push(r + 2);
      counts[status]++;
    }
    // Bottom-up, so a deletion never shifts a row still to be deleted.
    for (var d = rowsToDelete.length - 1; d >= 0; d--) sh.deleteRow(rowsToDelete[d]);
    return counts;
  });
  if (out.unsubscribed || out.bounced) console.log('[newsletter] purge: deleted ' + out.unsubscribed + ' unsubscribed row(s) past 30 days and ' + out.bounced + ' bounced row(s) past a week');
  if (out.undated) console.error('[newsletter] purge: ' + out.undated + ' unsubscribed or bounced row(s) have no readable date and were kept: set the date or delete them by hand');
  return { unsubscribed: out.unsubscribed, bounced: out.bounced };
}

function handleRemindPending() {
  var now = new Date();

  // Rows the privacy notice says are removed: done on every run, whatever
  // the hour, since no mail is sent for it.
  var purged = purgeDepartedRows_(now);

  // Reminders go out between 9:00 and 11:59 in Prague, as the privacy notice
  // says ("sent between 9 AM and 12 PM Prague time"), summer and winter.
  var pragueHour = parseInt(Utilities.formatDate(now, 'Europe/Prague', 'H'), 10);
  if (pragueHour < REMIND_FROM_HOUR_ || pragueHour >= REMIND_UNTIL_HOUR_) {
    return jsonResponse_({ ok: true, skipped: 'outside_window', prague_hour: pragueHour, purged: purged });
  }

  var started = Date.now();
  var threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  var sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  var dayMs = 24 * 60 * 60 * 1000;

  // Step 1, under the lock: read the Sheet once, delete the expired rows and
  // list the rows that are due a reminder. The row numbers come from a
  // snapshot taken inside the lock, so they are still right when the rows
  // are deleted. Nothing is remembered by row number past this point.
  var plan = withSheetLock_(function () {
    var due = [];
    var expired = [];
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return { due: due, expired: expired };

    var rows = sh.getRange(2, 1, last - 1, EXPECTED_HEADERS.length).getValues();
    var rowsToDelete = [];
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (String(row[COL.status - 1] || '').toLowerCase() !== 'pending') continue;

      var createdAt = row[COL.createdAt - 1];
      var ageMs = createdAt ? now.getTime() - new Date(createdAt).getTime() : 0;
      var email = String(row[COL.email - 1] || '').trim();

      // Older than 7 days: remove entirely.
      if (createdAt && ageMs >= sevenDaysMs) {
        rowsToDelete.push(r + 2); // 0-indexed data row → sheet row
        expired.push({ email: email, days: Math.round(ageMs / dayMs) });
        continue;
      }

      // Older than 3 days, with no reminder yet.
      if (!createdAt || ageMs < threeDaysMs) continue;
      if (row[COL.reminderSentAt - 1]) continue;

      var confirmToken = String(row[COL.confirmToken - 1] || '').trim();
      if (!email || !confirmToken) continue;
      due.push({ email: email, confirmToken: confirmToken, days: Math.round(ageMs / dayMs) });
    }

    // Bottom-up, so a deletion never shifts a row still to be deleted.
    for (var d = rowsToDelete.length - 1; d >= 0; d--) sh.deleteRow(rowsToDelete[d]);
    return { due: due, expired: expired };
  });

  plan.expired.forEach(function (x) {
    trackPosthog_('blog_pending_expired', distinctIdForEmail_(x.email), { days_since_signup: x.days });
  });

  // Step 2, one reader at a time: claim the row under the lock (stamp
  // reminder_sent_at), then send outside it. Claiming first is what stops two
  // overlapping runs from both mailing the same person; claiming one at a
  // time means a run that is cut off has at most one claim without a mail,
  // and every reader it did not reach is still due on the next run.
  var sent = 0;
  var left = 0;
  for (var i = 0; i < plan.due.length; i++) {
    if (Date.now() - started > REMIND_TIME_BUDGET_MS_) { left = plan.due.length - i; break; }
    var x = plan.due[i];
    if (!claimReminder_(x.email, x.confirmToken, now)) continue;
    try {
      sendReminderEmail_(x.email, x.confirmToken);
    } catch (err) {
      console.warn('handleRemindPending: failed for ' + x.email + ': ' + err);
      releaseReminderClaim_(x.email, x.confirmToken);
      continue;
    }
    sent++;
    trackPosthog_('blog_pending_reminded', distinctIdForEmail_(x.email), { days_since_signup: x.days });
  }

  var reply = { ok: true, reminded: sent, deleted: plan.expired.length, prague_hour: pragueHour, purged: purged };
  if (left) reply.left_for_next_run = left;
  return jsonResponse_(reply);
}

// A reminder run stops taking new readers after this long, well inside Apps
// Script's 6 minute limit. The rest are picked up by the next hourly run.
var REMIND_TIME_BUDGET_MS_ = 4 * 60 * 1000;

/**
 * The row holding `confirmToken`, as { row, values }, only if it is still a
 * pending subscriber with this address. Call it inside the lock. The reader
 * may have confirmed, unsubscribed, expired or subscribed afresh since the
 * row was first read, and a row number from then means nothing now. The row
 * is found by its token, not its address: tokens are unique, while an older
 * Sheet may hold one address on two rows.
 */
function pendingRowFor_(sh, email, confirmToken) {
  var row = findRowByToken_(sh, COL.confirmToken, confirmToken);
  if (row === 0) return null;
  var values = sh.getRange(row, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
  if (String(values[COL.status - 1] || '').toLowerCase() !== 'pending') return null;
  if (normalizeEmail_(values[COL.email - 1]) !== normalizeEmail_(email)) return null;
  return { row: row, values: values };
}

/**
 * Stamps reminder_sent_at for a reader still due one; false if not, if
 * another run got there first, or if the day's reminders are used up. A
 * reader left out by the limit is not stamped, so a later run takes them.
 */
function claimReminder_(email, confirmToken, when) {
  return withSheetLock_(function () {
    var sh = sheet_();
    var found = pendingRowFor_(sh, email, confirmToken);
    if (!found || found.values[COL.reminderSentAt - 1]) return false;
    if (!takeDailySlot_('reminder_mails', MAX_REMINDERS_PER_DAY_)) return false;
    sh.getRange(found.row, COL.reminderSentAt).setValue(when);
    return true;
  });
}

/**
 * A reminder that could not be sent gives its claim back, so the next hourly
 * run tries again. The row is found again by its confirm token, and only a
 * row that is still pending for the same address is touched: the reader may have
 * confirmed, unsubscribed or subscribed afresh while the mail was failing.
 */
function releaseReminderClaim_(email, confirmToken) {
  try {
    withSheetLock_(function () {
      var sh = sheet_();
      var found = pendingRowFor_(sh, email, confirmToken);
      if (found) sh.getRange(found.row, COL.reminderSentAt).setValue('');
    });
  } catch (err) {
    console.warn('releaseReminderClaim_: ' + err);
  }
}

/**
 * Single reminder email. Similar to the original confirmation email but with
 * "you started subscribing, finish here" messaging. Carries the existing
 * confirm token so the link still works.
 */
function sendReminderEmail_(email, confirmToken) {
  var cfg = config_();
  var campaign = 'remind';

  var confirmPageUrlRaw = cfg.siteUrl + '/confirm?t=' + confirmToken;
  var confirmPageUrl = withUtm_(confirmPageUrlRaw, campaign);

  var subject = 'Finish subscribing to ' + cfg.fromName + '?';

  var text =
    cfg.fromName + ', reminder\r\n\r\n' +
    'Hi,\r\n\r\n' +
    'You started subscribing to the ' + cfg.fromName + ' blog a few days ago but didn’t click the confirmation link yet.\r\n\r\n' +
    'If you still want in, click below:\r\n\r\n' +
    confirmPageUrl + '\r\n\r\n' +
    'Changed your mind? No worries, ignore this email and we won’t email you again.\r\n\r\n' +
    '- ' + cfg.fromName + '\r\n' +
    withUtm_(cfg.siteUrl, campaign) + '\r\n';

  var html =
    '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml_(subject) + '</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,sans-serif;color:#222;line-height:1.6;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">' +
        '<tr><td align="center" style="padding:24px 12px;">' +
          '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">' +
            brandBannerHtml_(cfg, campaign) +
            '<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.65;color:#222;">' +
              '<p style="margin:0 0 16px;">Hi,</p>' +
              '<p style="margin:0 0 20px;">You started subscribing to the <strong style="color:#0D47A1;">' + escapeHtml_(cfg.fromName) + '</strong> blog a few days ago but didn’t click the confirmation link yet. If you still want in, tap the button below to finish.</p>' +
              '<p style="margin:0 0 24px;"><a href="' + escapeHtml_(confirmPageUrl) + '" style="display:inline-block;padding:12px 28px;background:#009688;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Finish subscribing</a></p>' +
              '<p style="margin:0 0 12px;color:#666;font-size:14px;">Or copy and paste this link:</p>' +
              '<p style="margin:0 0 20px;color:#666;font-size:13px;word-break:break-all;"><a href="' + escapeHtml_(confirmPageUrl) + '" style="color:#009688;text-decoration:underline;">' + escapeHtml_(confirmPageUrl) + '</a></p>' +
              '<p style="margin:0;color:#666;font-size:14px;">Changed your mind? No worries, ignore this email and we won’t email you again.</p>' +
            '</td></tr>' +
            footerHtml_(cfg, null, /* isNewsletter */ false, campaign) +
          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</body></html>';

  var mime = buildMimeMessage_({
    from: cfg.fromEmail,
    fromName: cfg.fromName,
    to: email,
    subject: subject,
    html: html,
    text: text,
    listUnsubPostUrl: null,
    listId: 'nidhi blog newsletter <newsletter.' + host_(cfg.siteUrl) + '>',
    messageId: 'remind-' + confirmToken.slice(0, 16) + '@' + host_(cfg.siteUrl),
  });
  sendRaw_(mime);
}

// ============================================================================
// Confirm
// ============================================================================

function handleConfirm_(e) {
  var cfg = config_();
  var token = (e.parameter && e.parameter.t) || '';

  // Lookup and write under one lock, so the row found by the token is the
  // row written to. Flip status to confirmed; clear unsubscribedAt in case
  // this row was previously unsubscribed; invalidate the confirm token so
  // the link is single-use. Unsub token stays intact.
  var found = withSheetLock_(function () {
    var sh = sheet_();
    var row = findRowByToken_(sh, COL.confirmToken, token);
    if (row === 0) return null;
    // Only a row that is waiting can be confirmed. (An unsubscribe clears the
    // confirmation link as well; this covers a row left from before it did.)
    if (String(sh.getRange(row, COL.status).getValue()).toLowerCase() !== 'pending') return null;
    var who = {
      email: String(sh.getRange(row, COL.email).getValue()).trim(),
      unsubToken: String(sh.getRange(row, COL.unsubToken).getValue()).trim(),
    };
    sh.getRange(row, COL.status).setValue('confirmed');
    sh.getRange(row, COL.confirmedAt).setValue(new Date());
    sh.getRange(row, COL.unsubscribedAt).setValue('');
    sh.getRange(row, COL.confirmToken).setValue('');
    // Counted here, under the lock, so the day's welcome mails have a limit too.
    who.welcome = takeDailySlot_('welcome_mails', MAX_WELCOMES_PER_DAY_);
    return who;
  });

  if (!found) {
    return redirectResponse_(cfg.siteUrl + '/subscription-invalid?reason=confirm');
  }
  var email = found.email;
  var unsubToken = found.unsubToken;

  // Welcome email: land softly in the inbox right after the opt-in click
  // so the subscriber sees an immediate "you're in" beyond the landing
  // page. Non-fatal — if Gmail hiccups, we still confirm the row.
  try {
    if (found.welcome) sendWelcomeEmail_(email, unsubToken);
    else console.error('[newsletter] daily welcome limit reached (' + MAX_WELCOMES_PER_DAY_ + '): reader confirmed, welcome mail not sent');
  } catch (err) {
    // Welcome email is non-blocking (the subscriber IS confirmed regardless),
    // but we still want a signal so a silent Gmail outage doesn't mean
    // nobody ever gets their "you're in" email. Aggregate event + console
    // log is the minimum useful alert surface.
    console.warn('sendWelcomeEmail_ failed for ' + email + ': ' + err);
    trackPosthog_('blog_welcome_failed', distinctIdForEmail_(email), {
      email_domain: emailDomain_(email),
      error: String(err && err.message ? err.message : err).slice(0, 300),
    });
  }

  trackPosthog_('blog_subscribe_confirmed', distinctIdForEmail_(email), {});
  return redirectResponse_(cfg.siteUrl + '/subscription-confirmed');
}

// ============================================================================
// Unsubscribe
// ============================================================================

function handleUnsubscribe_(e, method) {
  var cfg = config_();
  var token = (e.parameter && e.parameter.t) || '';

  // A GET never unsubscribes. A link can be followed by something that is
  // not the reader (a mail scanner, a link preview), and RFC 8058 keeps the
  // one-click action to POST for that reason. A GET goes to the site's
  // unsubscribe page, which shows what is about to happen and sends the
  // POST when the reader presses the button.
  if (method === 'GET') {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(String(token))) {
      return redirectResponse_(cfg.siteUrl + '/subscription-invalid?reason=unsubscribe');
    }
    return redirectResponse_(cfg.siteUrl + '/unsubscribe?t=' + encodeURIComponent(token));
  }

  // Idempotency: a second unsubscribe for the same token is a no-op. This
  // happens in practice when the user double-clicks the "Unsubscribe me"
  // button, when Gmail's RFC 8058 one-click POST fires AND the user also
  // clicks the email-body link's landing page, or when the row was already
  // auto-marked by the bounce scanner. Without this guard we'd re-stamp
  // unsubscribed_at and re-fire blog_unsubscribe, double-counting exits in
  // PostHog retention. Lookup, check and write share one lock.
  var result = withSheetLock_(function () {
    var sh = sheet_();
    var row = findRowByToken_(sh, COL.unsubToken, token);
    if (row === 0) return null;
    var who = String(sh.getRange(row, COL.email).getValue()).trim();
    var currentStatus = String(sh.getRange(row, COL.status).getValue()).toLowerCase();
    if (currentStatus === 'unsubscribed') return { email: who, changed: false };
    sh.getRange(row, COL.status).setValue('unsubscribed');
    sh.getRange(row, COL.unsubscribedAt).setValue(new Date());
    // A confirmation link still out there (the reader used the unsubscribe
    // header on the confirmation mail) must not bring the row back.
    sh.getRange(row, COL.confirmToken).setValue('');
    return { email: who, changed: true };
  });

  if (!result) {
    if (method === 'POST') {
      return jsonResponse_({ ok: false, error: 'invalid_token' });
    }
    return redirectResponse_(cfg.siteUrl + '/subscription-invalid?reason=unsubscribe');
  }
  if (result.changed) {
    trackPosthog_('blog_unsubscribe', distinctIdForEmail_(result.email), { method: method });
  }

  // Gmail's RFC 8058 one-click unsubscribe POSTs and expects a 2xx JSON
  // response (it doesn't follow redirects). Browser-initiated (clicking a
  // link from the email body, then the landing page's POST) expects a JSON
  // too — the nidhi.today/unsubscribe page reads it and navigates the user
  // to /unsubscribed/. GET-initiated (direct link click from email body
  // fallback, for clients that won't do one-click) gets a redirect to the
  // branded page.
  if (method === 'POST') {
    return jsonResponse_({ ok: true });
  }
  return redirectResponse_(cfg.siteUrl + '/unsubscribed');
}

// ============================================================================
// Newsletter send (called by GitHub Actions)
// ============================================================================

// Workspace (verified domain) caps outbound mail at 1,500 recipients/day.
// Warn the operator when we're close to that so they can either compress
// the send schedule, move to a paid tier, or slice the list.
var QUOTA_DAILY_RECIPIENTS = 1500;
var QUOTA_WARN_THRESHOLD   = 0.80;

// How often we persist progress during a large fan-out. Each write is a
// round-trip to Google's properties service; 25 is a compromise between
// progress-granularity-on-crash (~25 dupes worst case on retry) and
// wall-clock overhead during the send loop.
var SEND_PROGRESS_CHECKPOINT = 25;

function handleSendPost_(e) {
  var cfg = config_();

  var raw = (e && e.postData && e.postData.contents) || '';
  var sig = (e && e.parameter && e.parameter.sig) || '';
  if (!verifyRequestSignature_(raw, sig)) {
    return jsonResponse_({ ok: false, error: 'bad_signature' });
  }

  // Preflight: fail fast (and loud) if FROM_EMAIL isn't sendable from this
  // account. Without this, every per-recipient sendRaw_ would throw inside
  // the catch block and show up as N individual "send failed" warnings
  // while the root cause is one missing alias in Gmail settings.
  try {
    ensureFromEmailSendable_();
  } catch (err) {
    // The reason names the account and its aliases: logged, not returned.
    console.error('[newsletter] from_email_not_sendable: ' + err.message);
    return jsonResponse_({ ok: false, error: 'from_email_not_sendable' });
  }

  var payload = JSON.parse(raw);
  if (!payload || !payload.subject || !payload.html || !payload.text || !payload.guid) {
    return jsonResponse_({ ok: false, error: 'missing_fields' });
  }

  var seenKey = 'sent_guid:' + payload.guid;
  if (prop_(seenKey)) {
    return jsonResponse_({ ok: true, skipped: 'already_sent', sent: 0 });
  }

  // One fan-out per guid at a time. If the caller's HTTP request fails while
  // this script keeps running, the next workflow run arrives while the first
  // is still sending, and without this both would mail the same readers. The
  // reply is shaped like a partial send, so the caller leaves the guid
  // unmarked and a later run resumes or finds it already sent.
  var claim = claimSend_(payload.guid);
  if (!claim) {
    return jsonResponse_({ ok: true, sent: 0, failed: 0, partial: true, in_progress: true });
  }
  try {
    return sendPostFanOut_(cfg, payload, seenKey);
  } finally {
    releaseSend_(payload.guid, claim);
  }
}

// A claim older than this is a run that died without cleaning up. Apps
// Script stops an execution at 6 minutes, and the fan-out stops itself after
// 5, so no live run is older.
var SEND_CLAIM_MAX_AGE_MS_ = 7 * 60 * 1000;

function sendingKey_(guid) { return 'sending:' + guid; }

/**
 * Takes the per-guid send claim and returns its value ("<time>:<random>"),
 * or '' when another run holds a fresh one.
 */
function claimSend_(guid) {
  return withSheetLock_(function () {
    var key = sendingKey_(guid);
    var since = Number(String(prop_(key)).split(':')[0]) || 0;
    if (since && Date.now() - since < SEND_CLAIM_MAX_AGE_MS_) return '';
    var claim = Date.now() + ':' + Utilities.getUuid();
    props_().setProperty(key, claim);
    return claim;
  });
}

/** Gives the claim back, only if it is still this run's: a run that was taken over leaves the new claim alone. */
function releaseSend_(guid, claim) {
  try {
    withSheetLock_(function () {
      var key = sendingKey_(guid);
      if (prop_(key) === claim) props_().deleteProperty(key);
    });
  } catch (err) {
    console.warn('releaseSend_: ' + err);
  }
}

function sendPostFanOut_(cfg, payload, seenKey) {
  // Checked again now that the claim is held: the run that held it before
  // may have finished this guid in the meantime.
  if (prop_(seenKey)) {
    return jsonResponse_({ ok: true, skipped: 'already_sent', sent: 0 });
  }

  // One mail per address, even if the Sheet holds the address twice.
  var seenEmails = {};
  var subscribers = listConfirmedSubscribers_().filter(function (s) {
    var key = (s.email || '').toLowerCase();
    if (seenEmails[key]) return false;
    seenEmails[key] = true;
    return true;
  });
  if (subscribers.length === 0) {
    // Nobody to send to. The lesson is NOT marked as sent: a list that reads
    // as empty is far more often a Sheet that could not be read properly
    // than a newsletter with no readers, and marking it would mean the
    // lesson never goes out. The sender treats this answer as a failure,
    // so the run is red and someone looks.
    console.error('[newsletter] send_post: no confirmed subscriber was found; the lesson was not marked as sent');
    return jsonResponse_({ ok: true, sent: 0, failed: 0, no_recipients: true });
  }

  // Quota warning (PostHog + console) — fires when the confirmed-subscriber
  // count crosses the Workspace daily-recipient threshold. The send still
  // proceeds; this is an early-warning for the operator.
  if (subscribers.length >= QUOTA_DAILY_RECIPIENTS * QUOTA_WARN_THRESHOLD) {
    console.warn('newsletter: confirmed subscribers (' + subscribers.length +
      ') approaching Workspace daily cap of ' + QUOTA_DAILY_RECIPIENTS);
    trackPosthog_('blog_newsletter_quota_warning', cfg.fromEmail, {
      subscriber_count: subscribers.length,
      cap: QUOTA_DAILY_RECIPIENTS,
      utilization: Math.round((subscribers.length / QUOTA_DAILY_RECIPIENTS) * 100) / 100,
      guid: payload.guid,
    });
  }

  // Deterministic ordering across retries. The fan-out may not finish in
  // one Apps Script invocation (6-minute cap, 5-minute budget); on the
  // next invocation we use this ordering + a persisted high-water mark
  // to skip recipients already handled. Lexicographic email sort is
  // stable even if subscribers are added/removed between invocations —
  // the only effect is that a new subscriber inserted before the marker
  // is missed for this post (picked up on the next post), and one
  // inserted after the marker is included.
  subscribers.sort(function (a, b) {
    var ae = (a.email || '').toLowerCase();
    var be = (b.email || '').toLowerCase();
    return ae < be ? -1 : ae > be ? 1 : 0;
  });

  var progressKey = 'send_progress:' + payload.guid;
  var lastSentEmail = (prop_(progressKey) || '').toLowerCase();

  var listId = 'nidhi blog newsletter <newsletter.' + host_(cfg.siteUrl) + '>';

  var started = Date.now();
  var timeBudgetMs = 5 * 60 * 1000;

  var sent = 0, failed = 0, skipped_already_sent = 0;
  var checkpointEmail = lastSentEmail;

  for (var i = 0; i < subscribers.length; i++) {
    var sub = subscribers[i];
    var subEmailLower = (sub.email || '').toLowerCase();

    // Resume: lexicographic skip of recipients handled by a previous
    // partial run. O(1) space for the marker regardless of list size.
    if (lastSentEmail && subEmailLower <= lastSentEmail) {
      skipped_already_sent++;
      continue;
    }

    if (Date.now() - started > timeBudgetMs) {
      // Persist progress so the next invocation picks up where we left off.
      props_().setProperty(progressKey, checkpointEmail);
      return jsonResponse_({
        ok: true, sent: sent, failed: failed,
        skipped_already_sent: skipped_already_sent,
        partial: true,
        resume_after: checkpointEmail,
      });
    }

    if (!sub.unsubToken) {
      // Row has no unsub token — probably an old row predating this schema.
      // Skip rather than send without the one-click unsubscribe URL, which
      // would be non-compliant with Gmail's bulk-sender rules.
      failed++;
      console.warn('skipping ' + sub.email + ': missing unsub_token. Run migrateAddTokens().');
      trackPosthog_('blog_newsletter_send_failed', cfg.fromEmail, {
        guid: payload.guid,
        email_domain: emailDomain_(sub.email),
        reason: 'missing_unsub_token',
      });
      // Advance the marker past this row so we don't re-hit it on resume.
      checkpointEmail = subEmailLower;
      continue;
    }

    try {
      // Per-recipient one-click POST target for Gmail/Outlook native
      // unsubscribe buttons (RFC 8058).
      var listUnsubPostUrl = cfg.webAppUrl + '?action=unsubscribe&t=' + sub.unsubToken;
      // User-facing unsubscribe link shown in the email body, goes to the
      // branded landing page on nidhi.today (not Apps Script) so subscribers
      // never see script.google.com URLs and preview bots don't trigger it.
      var unsubPageUrl = cfg.siteUrl + '/unsubscribe?t=' + sub.unsubToken;

      var personalizedHtml = injectUnsubscribeUrl_(payload.html, unsubPageUrl);
      var personalizedText = injectUnsubscribeUrlText_(payload.text, unsubPageUrl);

      var mime = buildMimeMessage_({
        from: cfg.fromEmail,
        fromName: cfg.fromName,
        to: sub.email,
        subject: payload.subject,
        html: personalizedHtml,
        text: personalizedText,
        listUnsubPostUrl: listUnsubPostUrl,
        listId: listId,
        // One id per message: every copy of a lesson used to carry the same
        // one, and a provider that drops duplicates by id can then drop one
        // of two copies that reach the same mailbox by different addresses.
        messageId: payload.guid.replace(/[^a-zA-Z0-9._-]/g, '_') + '.' + String(sub.unsubToken).slice(0, 16) + '@' + host_(cfg.siteUrl),
      });
      sendRaw_(mime);
      sent++;
      checkpointEmail = subEmailLower;

      // Persist progress periodically so a crash loses at most
      // SEND_PROGRESS_CHECKPOINT recipients on retry (they'd get a dupe,
      // acceptable vs. silent gaps).
      if (sent % SEND_PROGRESS_CHECKPOINT === 0) {
        props_().setProperty(progressKey, checkpointEmail);
      }
    } catch (err) {
      failed++;
      console.warn('send failed for ' + sub.email + ': ' + err);
      // Per-recipient failure event — captures domain + error message so we
      // can spot patterns (e.g. one domain blocklisting us) without leaking
      // full subscriber addresses into PostHog.
      trackPosthog_('blog_newsletter_send_failed', cfg.fromEmail, {
        guid: payload.guid,
        email_domain: emailDomain_(sub.email),
        error: String(err && err.message ? err.message : err).slice(0, 300),
      });
      // Advance the marker past the failed row — next retry will skip it
      // (by design: per-recipient failures don't block the fan-out, and
      // systematic failures surface via the aggregate blog_newsletter_sent
      // event's `failed` count).
      checkpointEmail = subEmailLower;
    }
  }

  // Full fan-out complete. Drop the progress marker and set the
  // idempotency marker so any retry of this guid short-circuits.
  props_().deleteProperty(progressKey);
  props_().setProperty(seenKey, String(new Date().getTime()));
  trackPosthog_('blog_newsletter_sent', cfg.fromEmail, {
    guid: payload.guid,
    sent: sent,
    failed: failed,
    skipped_already_sent: skipped_already_sent,
    url: payload.url,
  });
  return jsonResponse_({
    ok: true,
    sent: sent,
    failed: failed,
    skipped_already_sent: skipped_already_sent,
  });
}

function emailDomain_(email) {
  var s = String(email || '').trim().toLowerCase();
  var at = s.indexOf('@');
  return at >= 0 ? s.slice(at + 1) : '';
}

// ============================================================================
// Bounce scanner — runs from GitHub Actions (HMAC-authed)
// ============================================================================
//
// Gmail's advanced API doesn't expose bounce webhooks for consumer accounts
// / free Workspace tiers. The only way to notice that a subscriber's
// address is dead is to look at the delivery failure reports sitting in the
// FROM_EMAIL inbox. This job reads the last 14 days of them and flips the
// matching Sheet rows to `bounced`, so they get no more mail.
//
// A report counts only if all of this holds, because anyone can send this
// inbox a message that merely looks like one (see failedRecipients_):
//   - it is from Google's own delivery subsystem, mailer-daemon@googlemail.com,
//     and is a delivery report by its structure, not by its subject;
//   - for that recipient, in that recipient's own block of the report, it
//     says `Action: failed` with a 5.x.x status. A delay notice or a full
//     mailbox reported as 4.x.x is not one;
//   - the mail it returns carries a reference this script made for that
//     same recipient (X-Nidhi-Ref), within the last 14 days and for the
//     reader's current sign-up. So the report is about a mail this script
//     sent to that reader. Mail sent before this header existed has none: a
//     failure of one of those is not acted on, and the next mail will be;
//   - Gmail found the report signed by googlemail.com. The reference shows
//     which mail a report is about; this shows the report is Google's.
//
// `bounced` is outside the enum in listConfirmedSubscribers_() — which
// filters on status==='confirmed' — so marked rows are dropped from all
// future fan-outs, and a pending row that bounced gets no reminder.
// Re-subscribing via the public form puts the row back to `pending` and
// goes through the normal double opt-in.

/**
 * A reference carried by every mail this script sends, in the X-Nidhi-Ref
 * header: the time the mail was made (unix seconds), a dot, and an HMAC of
 * the recipient's address and that time under the script's secret.
 *
 * A delivery failure report returns the headers of the mail that failed, so
 * a genuine report about a mail to someone carries a reference made for
 * that someone. Nobody without the secret can write one for another
 * address. Each mail has its own, and one is honoured only for a mail sent
 * in the last 14 days and after the reader's current sign-up, so a
 * reference seen in a forwarded mail goes stale and never outlives a
 * re-subscription. On its own it shows which mail a report is about, not
 * that the report is genuine: for that the report must also come through
 * Google's own sender checks (see authenticatedByGoogle_). It says nothing
 * about the reader to anyone: it is in their own mail.
 */
function mailRef_(email, seconds) {
  var ts = String(seconds === undefined ? Math.floor(Date.now() / 1000) : seconds);
  return ts + '.' + hmacHex_(config_().hmacSecret, 'mail-ref:' + String(email || '').trim().toLowerCase() + ':' + ts).slice(0, 40);
}

/** The time (ms) a reference was made for `email`, or 0 if it is not one this script wrote for that address. */
function mailRefTime_(ref, email) {
  var m = /^([0-9]{9,11})\.([0-9a-f]{40})$/.exec(String(ref || '').trim());
  if (!m) return 0;
  return constantTimeEquals_(mailRef_(email, m[1]), m[1] + '.' + m[2]) ? Number(m[1]) * 1000 : 0;
}

/**
 * Whether Gmail, receiving this message, found it to be signed by
 * googlemail.com. Gmail writes what it found in an Authentication-Results
 * header that it puts above everything the message arrived with, under its
 * own name (mx.google.com); only that first header is read, since a sender
 * can put any such header of their own lower down. A From line alone can be
 * written by anyone. It has to be the signature itself that passed (dkim):
 * a sender-policy pass alone (dmarc by way of spf) says where the message
 * came from and nothing about its To line or its content being as signed.
 */
function authenticatedByGoogle_(outerHeaders) {
  var first = /^Authentication-Results:[ \t]*([^\r\n]*)$/im.exec(outerHeaders);
  if (!first) return false;
  var results = first[1];
  if (!/^mx\.google\.com[ \t]*;/i.test(results)) return false;
  // The domain must end there: googlemail.com.example.org is someone else's.
  var dkim = /\bdkim=pass\b[^;]*\bheader\.(?:i=@|d=)googlemail\.com(?![\w.-])/i.test(results);
  return dkim;
}

// The only sender whose reports are read: the address alone, or a display
// name followed by the address in angle brackets.
var BOUNCE_SENDER_ = /^(?:[^<>]*<mailer-daemon@googlemail\.com>|mailer-daemon@googlemail\.com)$/i;

// Reports looked at in one scan, at most. Reaching it is logged.
var BOUNCE_MAX_THREADS_ = 1000;

/** Whether a header's value is exactly `address`: alone, or one display name with no brackets or commas, then the address in angle brackets. */
function isExactly_(value, address) {
  var v = String(value).trim().toLowerCase();
  if (v === address) return true;
  var m = /^([^<>,]*)<([^<>]*)>$/.exec(v);
  return Boolean(m) && m[2] === address;
}

/**
 * A report from Google's delivery subsystem that was not acted on, and why.
 * Logged for the owner: it is either a forgery, or a sign that Google's
 * reports no longer look the way this expects and real bounces are being
 * passed over.
 */
function skipped_(why) {
  console.error('[newsletter] bounce scan: a report from mailer-daemon@googlemail.com was not acted on: ' + why);
  return [];
}

/** Headers as single lines: a folded header continues on lines that start with white space. */
function unfold_(text) {
  return String(text).replace(/\r?\n[ \t]+/g, ' ');
}

/**
 * The addresses one message reports as permanently failed, lower-cased; none
 * unless the message is a delivery report, read by its structure:
 *
 *   - the message itself is a multipart/report of type delivery-status;
 *   - in its message/delivery-status part, each recipient has a block of its
 *     own, and that block says `Action: failed` with a 5.x.x status for that
 *     recipient. A recipient whose block says delayed, or 4.x.x, is not
 *     taken because another recipient in the same report failed;
 *   - the part that returns the original mail carries a reference this
 *     script made for that same recipient (X-Nidhi-Ref);
 *   - the report is addressed to this script's own sending address, and
 *     Gmail found it to be signed by googlemail.com.
 *
 * Text that only looks like these fields, in a quoted message or in the
 * human-readable part, is not read as them. Each result is
 * `{ email, sentAt }`, `sentAt` being when the returned mail was made.
 */
function failedRecipients_(msg) {
  var from = '';
  try { from = String(msg.getFrom() || '').trim(); } catch (_) { return []; }
  if (!BOUNCE_SENDER_.test(from)) return [];
  var raw = '';
  try { raw = String(msg.getRawContent() || ''); } catch (_) { return skipped_('it could not be read'); }

  var split = /\r?\n\r?\n/.exec(raw);
  if (!split) return skipped_('it has no line between its headers and its body');
  var outer = unfold_(raw.slice(0, split.index));
  var body = raw.slice(split.index + split[0].length);
  // A report about a mail this script sent comes back to the address it was
  // sent from. A report about someone else's mail is addressed to them, and
  // stays so if it is passed on with Google's signature intact, since the To
  // line is part of what is signed.
  // There must be exactly one To line: a signature covers the last one, so
  // a second one put above it would be read here and signed by nobody.
  var sender = String(config_().fromEmail).toLowerCase();
  var toLines = outer.match(/^To:[^\r\n]*$/gim) || [];
  if (toLines.length !== 1 || !isExactly_(toLines[0].replace(/^To:/i, ''), sender)) return skipped_('it is not addressed to this script and nobody else');
  if (!authenticatedByGoogle_(outer)) {
    // Worth a look by the owner: either a forgery, or Google's reports no
    // longer arrive the way this expects and real bounces are being passed over.
    return skipped_('Gmail did not find it signed by googlemail.com');
  }
  // Exactly one type line, for the same reason as the To line: the type
  // names the boundary the signed body is read by, so a second one put
  // above the signed one would change what is read without breaking the
  // signature.
  var typeLines = outer.match(/^Content-Type:[^\r\n]*$/gim) || [];
  if (typeLines.length !== 1) return skipped_('it does not have exactly one type');
  var type = /^Content-Type:[ \t]*multipart\/report\b([^\r\n]*)$/i.exec(typeLines[0]);
  if (!type || !/report-type[ \t]*=[ \t]*"?delivery-status"?/i.test(type[1])) return skipped_('it is not a delivery report by its type');
  var boundary = /boundary[ \t]*=[ \t]*(?:"([^"]+)"|([^\s;]+))/i.exec(type[1]);
  if (!boundary) return skipped_('its type names no boundary');
  // A part starts at a line that is the boundary and nothing else. What
  // stands before the first such line and after the closing one (the
  // boundary followed by two more dashes) is not part of the report.
  var marker = (boundary[1] || boundary[2]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var text = '\n' + body;
  var close = new RegExp('\\r?\\n--' + marker + '--[ \\t]*(?=\\r?\\n|$)').exec(text);
  if (!close) return skipped_('it has no closing boundary line');
  var parts = text.slice(0, close.index).split(new RegExp('\\r?\\n--' + marker + '[ \\t]*(?=\\r?\\n)'));
  parts.shift();
  // Something to read, the status, the returned mail: three parts, in that order.
  if (parts.length !== 3) return skipped_('it does not have exactly three parts');

  // A delivery report has its parts in a fixed order: something to read,
  // then the status, then the returned mail. The second and third are read
  // as exactly that, by their position.
  var partOf = function (index, kind) {
    var cut = /\r?\n\r?\n/.exec(parts[index]);
    if (!cut) return null;
    if (!kind.test(unfold_(parts[index].slice(0, cut.index)))) return null;
    return parts[index].slice(cut.index + cut[0].length);
  };
  if (partOf(0, /^Content-Type:[ \t]*(?:message\/delivery-status|message\/rfc822|text\/rfc822-headers)\b/im) !== null) return skipped_('its first part is not something to read');
  var status = partOf(1, /^Content-Type:[ \t]*message\/delivery-status\b/im);
  var returned = partOf(2, /^Content-Type:[ \t]*(?:message\/rfc822|text\/rfc822-headers)\b/im);
  var original = null;
  if (returned !== null) {
    // The returned mail: its own headers come first.
    var end = /\r?\n\r?\n/.exec(returned);
    original = unfold_(end ? returned.slice(0, end.index) : returned);
  }
  if (status === null || !original) return skipped_('its second and third parts are not a status and a returned mail');
  // The returned mail is one this script sent: from its own address, with
  // one reference.
  var fromLines = original.match(/^From:[^\r\n]*$/gim) || [];
  if (fromLines.length !== 1 || !isExactly_(fromLines[0].replace(/^From:/i, ''), sender)) return skipped_('the mail it returns is not from this script');
  var refLines = original.match(/^X-Nidhi-Ref:[^\r\n]*$/gim) || [];
  if (refLines.length !== 1) return skipped_('the mail it returns does not carry one reference');
  var refLine = /^X-Nidhi-Ref:[ \t]*(\S+)[ \t]*$/i.exec(refLines[0]);
  if (!refLine) return skipped_('the reference in the mail it returns cannot be read');

  var out = [];
  unfold_(status).split(/\r?\n\r?\n/).forEach(function (block) {
    var who = /^Final-Recipient:[ \t]*rfc822[ \t]*;[ \t]*<?([^\s<>;,]+@[^\s<>;,]+)>?[ \t]*$/im.exec(block);
    var action = /^Action:[ \t]*([A-Za-z]+)[ \t]*$/im.exec(block);
    var code = /^Status:[ \t]*([0-9])\.[0-9]+\.[0-9]+/im.exec(block);
    if (!who || !action || !code) return;
    if (action[1].toLowerCase() !== 'failed' || code[1] !== '5') return;
    var addr = who[1].toLowerCase();
    // The returned mail was one of ours, made for this very address.
    var sentAt = mailRefTime_(refLine[1], addr);
    if (sentAt && !out.some(function (x) { return x.email === addr; })) out.push({ email: addr, sentAt: sentAt });
  });
  if (out.length === 0) return skipped_('it reports no permanent failure of the address its returned mail was made for');
  return out;
}

function handleScanBounces_(e) {
  var sig = (e && e.parameter && e.parameter.sig) || '';
  var ts = (e && e.parameter && e.parameter.ts) || '';
  if (!verifyScanBouncesSig_(sig, ts)) {
    return jsonResponse_({ ok: false, error: 'bad_signature' });
  }

  // Every report in the inbox from the last 14 days, a page at a time. The
  // search finds threads; a thread can hold older messages, so each message's
  // own date is checked as well.
  var query = 'in:inbox from:mailer-daemon@googlemail.com newer_than:14d';
  var oldest = Date.now() - 14 * 24 * 60 * 60 * 1000;
  var scanned = 0;
  // address -> its newest failed mail: when it was sent and when that was reported
  var failedAt = {};
  try {
    var start = 0;
    for (; start < BOUNCE_MAX_THREADS_; start += 100) {
      var threads = GmailApp.search(query, start, 100);
      scanned += threads.length;
      for (var t = 0; t < threads.length; t++) {
        var msgs = threads[t].getMessages();
        for (var i = 0; i < msgs.length; i++) {
          var when = NaN;
          try { when = msgs[i].getDate().getTime(); } catch (_) { /* no date: not read */ }
          // An older message in a thread the search found is outside the 14
          // days by design; one with no date at all is worth a line.
          if (isNaN(when)) { skipped_('its date cannot be read'); continue; }
          if (!(when >= oldest)) continue;
          failedRecipients_(msgs[i]).forEach(function (x) {
            // The mail that failed was itself sent in the last 14 days, and
            // before its report.
            if (!(x.sentAt >= oldest && x.sentAt <= when)) { skipped_('the mail it returns was not sent in the last 14 days and before the report'); return; }
            if (!failedAt[x.email] || failedAt[x.email].sentAt < x.sentAt) failedAt[x.email] = { reported: when, sentAt: x.sentAt };
          });
        }
      }
      if (threads.length < 100) break;
    }
    if (start >= BOUNCE_MAX_THREADS_) console.error('[newsletter] bounce scan: more than ' + BOUNCE_MAX_THREADS_ + ' report threads in 14 days; the oldest were not read');
  } catch (err) {
    console.error('[newsletter] bounce scan: reading the inbox failed: ' + err);
    return jsonResponse_({ ok: false, error: 'gmail_search_failed' });
  }

  // The inbox scan above took a while; the Sheet is read and written here in
  // one go under the lock, so each row number is used while it is still right.
  var markedAddrs = withSheetLock_(function () {
    var out = [];
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return out;
    var rows = sh.getRange(2, 1, last - 1, EXPECTED_HEADERS.length).getValues();
    for (var r = 0; r < rows.length; r++) {
      var rowEmail = String(rows[r][COL.email - 1] || '').trim().toLowerCase();
      var rowStatus = String(rows[r][COL.status - 1] || '').toLowerCase();
      if (rowStatus !== 'confirmed' && rowStatus !== 'pending') continue;
      var failure = failedAt[rowEmail];
      if (!failure) continue;
      // The mail that failed must have been sent for this sign-up: one made
      // before it (an earlier subscription's), or a row whose date cannot be
      // read, is left alone. A reference holds whole seconds and a mail is
      // made after its row, so the two are compared in seconds, with no
      // allowance.
      var since = Math.floor(new Date(rows[r][COL.createdAt - 1]).getTime() / 1000) * 1000;
      if (!(since <= failure.sentAt)) continue;
      sh.getRange(r + 2, COL.status).setValue('bounced');
      sh.getRange(r + 2, COL.unsubscribedAt).setValue(new Date());
      out.push(rowEmail);
    }
    return out;
  });
  var marked = markedAddrs.length;

  markedAddrs.forEach(function (addr) {
    trackPosthog_('blog_subscriber_bounced', distinctIdForEmail_(addr), {
      email_domain: emailDomain_(addr),
      via: 'mailer_daemon_scan',
    });
  });

  if (marked > 0) {
    console.warn('scan_bounces: marked ' + marked + ' row(s) as bounced: ' + markedAddrs.join(', '));
  }

  return jsonResponse_({
    ok: true,
    threads_scanned: scanned,
    candidates: Object.keys(failedAt).length,
    marked_bounced: marked,
  });
}

// ============================================================================
// Confirmation email (branded)
// ============================================================================

function sendConfirmationEmail_(email, confirmToken) {
  var cfg = config_();
  var campaign = 'confirm';

  // Confirmation link lands on the branded nidhi.today page which then
  // POSTs to Apps Script on explicit user click — same pattern as
  // unsubscribe, so subscribers never see script.google.com and preview
  // bots don't auto-confirm.
  // No trailing slash before `?` — astro.config.mjs sets trailingSlash:'never'
  // and the previous `/confirm/?t=...` form 404s on strict static hosts.
  var confirmPageUrlRaw = cfg.siteUrl + '/confirm?t=' + confirmToken;
  var confirmPageUrl = withUtm_(confirmPageUrlRaw, campaign);

  // For the List-Unsubscribe header on this email we don't have an unsub
  // token yet in a useful way (we just generated it for the row — use it
  // too, so Gmail's one-click works even on the confirmation email).
  var sh = sheet_();
  var row = findSubscriberRow_(sh, email);
  var unsubToken = row ? String(sh.getRange(row, COL.unsubToken).getValue()).trim() : '';
  // List-Unsubscribe *header* stays UTM-free — it's machine-parsed by
  // Gmail/Outlook clients, not human-clicked, and spam filters flag
  // unexpected params in the header.
  var listUnsubPostUrl = cfg.webAppUrl + '?action=unsubscribe&t=' + unsubToken;

  var subject = 'Confirm your subscription to ' + cfg.fromName;
  var banner = brandBannerHtml_(cfg, campaign);
  var logoAlt = cfg.fromName;

  var text =
    cfg.fromName + ', confirm your subscription\r\n\r\n' +
    'Hi,\r\n\r\n' +
    'Click the link below to confirm you\u2019d like a heads-up from ' + cfg.fromName + ' whenever a new post goes up:\r\n\r\n' +
    confirmPageUrl + '\r\n\r\n' +
    'If you didn\u2019t sign up, ignore this email and you won\u2019t hear from us again.\r\n\r\n' +
    '- ' + cfg.fromName + '\r\n' +
    withUtm_(cfg.siteUrl, campaign) + '\r\n';

  var html =
    '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml_(subject) + '</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,sans-serif;color:#222;line-height:1.6;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">' +
        '<tr><td align="center" style="padding:24px 12px;">' +
          '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">' +
            banner +
            '<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.65;color:#222;">' +
              '<p style="margin:0 0 16px;">Hi,</p>' +
              '<p style="margin:0 0 20px;">Click the button below to confirm you\u2019d like a heads-up from <strong style="color:#0D47A1;">' + escapeHtml_(cfg.fromName) + '</strong> whenever a new post goes up.</p>' +
              '<p style="margin:0 0 24px;"><a href="' + escapeHtml_(confirmPageUrl) + '" style="display:inline-block;padding:12px 28px;background:#009688;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Confirm subscription</a></p>' +
              '<p style="margin:0 0 12px;color:#666;font-size:14px;">If the button doesn\u2019t work, copy and paste this link into your browser:</p>' +
              '<p style="margin:0 0 20px;color:#666;font-size:13px;word-break:break-all;"><a href="' + escapeHtml_(confirmPageUrl) + '" style="color:#009688;text-decoration:underline;">' + escapeHtml_(confirmPageUrl) + '</a></p>' +
              '<p style="margin:0;color:#666;font-size:14px;">If you didn\u2019t sign up, ignore this email and you won\u2019t hear from us again.</p>' +
            '</td></tr>' +
            footerHtml_(cfg, listUnsubPostUrl, /* isNewsletter */ false, campaign) +
          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</body></html>';

  var mime = buildMimeMessage_({
    from: cfg.fromEmail,
    fromName: cfg.fromName,
    to: email,
    subject: subject,
    html: html,
    text: text,
    listUnsubPostUrl: listUnsubPostUrl,
    listId: 'nidhi blog newsletter <newsletter.' + host_(cfg.siteUrl) + '>',
    messageId: 'confirm-' + confirmToken.slice(0, 16) + '@' + host_(cfg.siteUrl),
  });
  sendRaw_(mime);
}

// ============================================================================
// Welcome email (sent once, right after the subscriber confirms)
// ============================================================================

/**
 * Fires from handleConfirm_ on a successful opt-in click. Short, warm, sets
 * expectations: one email per new post, reply-to works, unsubscribe in every
 * email. Shares the same MIME builder / list-unsubscribe plumbing as the
 * newsletter and confirmation emails.
 */
function sendWelcomeEmail_(email, unsubToken) {
  var cfg = config_();
  var campaign = 'welcome';

  var blogUrl = withUtm_(cfg.siteUrl + '/blog', campaign);
  // Bare per-recipient unsubscribe page. This one is substituted into the
  // `{{UNSUBSCRIBE_URL}}` placeholder that footerHtml_ already pairs with
  // `&utm_...`. Appending UTMs here would double-stamp them on the final
  // href; keep this variant bare and use `unsubPageUrlTracked` when we need
  // a plain-text "Unsubscribe: <url>" line.
  var unsubPageUrlBare = cfg.siteUrl + '/unsubscribe?t=' + encodeURIComponent(unsubToken);
  var unsubPageUrlTracked = withUtm_(unsubPageUrlBare, campaign);
  // List-Unsubscribe *header* stays UTM-free (machine-parsed, not clicked).
  var listUnsubPostUrl = cfg.webAppUrl + '?action=unsubscribe&t=' + encodeURIComponent(unsubToken);

  var subject = 'You\u2019re subscribed to ' + cfg.fromName;
  var banner = brandBannerHtml_(cfg, campaign);

  var text =
    cfg.fromName + ', you\u2019re in.\r\n\r\n' +
    'Thanks for confirming. We\u2019ll ping you from ' + cfg.fromEmail + ' whenever a new post goes up, nothing else. No digests, no "special offers".\r\n\r\n' +
    'While you wait for the next one, the existing posts are all on the blog:\r\n' +
    blogUrl + '\r\n\r\n' +
    'Reply to this email if anything ever lands wrong, a real person reads it.\r\n\r\n' +
    '- ' + cfg.fromName + '\r\n' +
    withUtm_(cfg.siteUrl, campaign) + '\r\n\r\n' +
    '---\r\n' +
    // Text body shows the clickable URL with UTMs inline (the footerHtml_
    // template path uses the bare variant since it appends UTMs itself).
    'Unsubscribe: ' + unsubPageUrlTracked + '\r\n' +
    'Privacy:     ' + withUtm_(cfg.siteUrl + '/privacy', campaign) + '\r\n';

  var html =
    '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml_(subject) + '</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,sans-serif;color:#222;line-height:1.6;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">' +
        '<tr><td align="center" style="padding:24px 12px;">' +
          '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">' +
            banner +
            '<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.65;color:#222;">' +
              '<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#0D47A1;font-weight:700;letter-spacing:-0.01em;">You\u2019re in.</h1>' +
              '<p style="margin:0 0 16px;">Thanks for confirming. We\u2019ll ping you from <strong style="color:#0D47A1;">' + escapeHtml_(cfg.fromEmail) + '</strong> whenever a new post goes up , nothing else. No digests, no surprises, no "special offers".</p>' +
              '<p style="margin:0 0 20px;">While you wait for the next one, the existing posts are all on the blog:</p>' +
              '<p style="margin:0 0 24px;"><a href="' + escapeHtml_(blogUrl) + '" style="display:inline-block;padding:12px 24px;background:#009688;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Start reading &rarr;</a></p>' +
              '<p style="margin:0 0 12px;color:#555;font-size:14px;">Reply to this email if anything ever lands wrong , a real person reads it.</p>' +
              '<p style="margin:24px 0 0;color:#555;font-size:14px;">- ' + escapeHtml_(cfg.fromName) + '</p>' +
            '</td></tr>' +
            // footerHtml_ renders `{{UNSUBSCRIBE_URL}}&utm_...`, so swap in
            // the BARE unsub URL. Using the tracked variant here would
            // double-stamp the UTM params on the final href.
            footerHtml_(cfg, listUnsubPostUrl, /* isNewsletter */ true, campaign).replace('{{UNSUBSCRIBE_URL}}', escapeHtml_(unsubPageUrlBare)) +
          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</body></html>';

  var mime = buildMimeMessage_({
    from: cfg.fromEmail,
    fromName: cfg.fromName,
    to: email,
    subject: subject,
    html: html,
    text: text,
    listUnsubPostUrl: listUnsubPostUrl,
    listId: 'nidhi blog newsletter <newsletter.' + host_(cfg.siteUrl) + '>',
    messageId: 'welcome-' + unsubToken.slice(0, 16) + '-' + Date.now() + '@' + host_(cfg.siteUrl),
  });
  sendRaw_(mime);
}

/**
 * Reusable brand banner for emails. Logo image on the left, brand name +
 * tagline stacked. Works even if the recipient's email client blocks images
 * (the alt text + tagline still show). Not shared with post.html.j2 because
 * the Jinja template is rendered client-side (Python); Apps Script only
 * emits this banner on its own confirmation email.
 */
function brandBannerHtml_(cfg, campaign) {
  // The PNG already contains the wordmark "nidhi" and the tagline
  // "Money, understood." — don't repeat the tagline as text below.
  // Source image is 400px wide; we display at 200px for a crisp 2x on retina.
  var logoUrl = cfg.siteUrl + '/brand/logo/full/logo-full-400-light.png';
  var bannerHref = withUtm_(cfg.siteUrl + '/blog', campaign);
  return (
    '<tr><td style="padding:0;">' +
      '<div style="background:#0D47A1;height:4px;line-height:4px;font-size:0;">&nbsp;</div>' +
      '<div style="padding:24px 28px 20px;border-bottom:1px solid #eee;">' +
        '<a href="' + escapeHtml_(bannerHref) + '" style="text-decoration:none;color:inherit;display:inline-block;">' +
          '<img src="' + escapeHtml_(logoUrl) + '" alt="' + escapeHtml_(cfg.fromName) + ' - Money, understood." width="200" height="auto" style="display:block;max-width:200px;height:auto;border:0;outline:none;">' +
        '</a>' +
      '</div>' +
    '</td></tr>'
  );
}

function footerHtml_(cfg, listUnsubPostUrl, isNewsletter, campaign) {
  // Newsletter path: the body contains the literal `{{UNSUBSCRIBE_URL}}`
  // placeholder which Apps Script (or sendWelcomeEmail_) swaps in per
  // recipient. UTMs are appended after the placeholder so the final URL
  // ends up `…/unsubscribe?t=TOKEN&utm_…` without breaking the token.
  var unsubLink = isNewsletter
    ? '{{UNSUBSCRIBE_URL}}&' + utmQuery_(campaign)
    : withUtm_(cfg.siteUrl + '/unsubscribe?t=__N/A__', campaign);

  var blogHref    = withUtm_(cfg.siteUrl + '/blog',    campaign);
  var privacyHref = withUtm_(cfg.siteUrl + '/privacy', campaign);
  var rssHref     = withUtm_(cfg.siteUrl + '/rss.xml', campaign);

  return (
    '<tr><td style="padding:20px 28px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#777;line-height:1.5;">' +
      (isNewsletter ?
        '<p style="margin:0 0 8px;">You\u2019re getting this because you subscribed to <a href="' + escapeHtml_(blogHref) + '" style="color:#0D47A1;text-decoration:underline;">' + escapeHtml_(host_(cfg.siteUrl)) + '/blog</a>.</p>' +
        '<p style="margin:0 0 8px;">' +
          '<a href="' + escapeHtml_(unsubLink) + '" style="color:#777;text-decoration:underline;">Unsubscribe</a> &middot; ' +
          '<a href="' + escapeHtml_(privacyHref) + '" style="color:#777;text-decoration:underline;">Privacy</a> &middot; ' +
          '<a href="' + escapeHtml_(rssHref) + '" style="color:#777;text-decoration:underline;">RSS</a>' +
        '</p>'
      :
        '<p style="margin:0 0 8px;">' +
          '<a href="' + escapeHtml_(privacyHref) + '" style="color:#777;text-decoration:underline;">Privacy</a> &middot; ' +
          '<a href="' + escapeHtml_(rssHref) + '" style="color:#777;text-decoration:underline;">RSS</a>' +
        '</p>'
      ) +
      '<p style="margin:0;color:#999;">Educational, not financial advice. Everyone\u2019s situation is different.</p>' +
    '</td></tr>'
  );
}

// ============================================================================
// One-shot migration: backfill tokens on pre-upgrade rows
// ============================================================================

/**
 * Diagnose a persistent `bad_signature` error without having to redeploy.
 *
 * Run from the Apps Script editor (Run → debugHmacSecret). No redeploy
 * required — editor runs use the latest SAVED code against the LIVE
 * script properties. So as long as you've pasted this file into the
 * editor and hit Save, this function works.
 *
 * What it does:
 *   1. Reads HMAC_SECRET from Script Properties.
 *   2. Prints its length, first/last 4 chars, and format sanity checks
 *      (hex-only? whitespace? newline at end?). Safe to share the first/
 *      last 4 chars — they're not enough to reconstruct the secret.
 *   3. Computes HMAC-SHA256 of the literal string "secret-check" with
 *      the current secret, and prints it. You can then run the same
 *      HMAC locally with your GH Actions copy of the secret:
 *
 *        printf 'secret-check' \
 *          | openssl dgst -sha256 -hmac 'PASTE-SECRET-HERE' \
 *          | awk '{print $NF}'
 *
 *      If the hex strings match → the two secrets are byte-identical
 *      and bad_signature is NOT a secret issue (something else is going
 *      wrong; open an issue with the outputs). If they DIFFER → the two
 *      copies of the secret are not the same. Check for invisible chars
 *      first (length mismatch, trailing whitespace), then regenerate
 *      fresh on both sides with `openssl rand -hex 32`.
 */
function debugHmacSecret() {
  var s = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET') || '';

  console.log('--- HMAC_SECRET (Apps Script Script Properties) ---');
  console.log('length           : ' + s.length + '  (expected: 64 for `openssl rand -hex 32`)');
  console.log('first 4 chars    : ' + JSON.stringify(s.slice(0, 4)));
  console.log('last 4 chars     : ' + JSON.stringify(s.slice(-4)));
  console.log('hex-only         : ' + /^[0-9a-f]+$/i.test(s));
  console.log('contains space   : ' + /\s/.test(s));
  console.log('ends with newline: ' + /\n$/.test(s));
  console.log('');

  if (!s) {
    console.log('ERROR: HMAC_SECRET is empty. Set it in Project Settings → Script properties.');
    return;
  }

  // Sign the same fixed string the GH Actions bounce-scan step signs.
  // Reproduce locally with:
  //   printf 'secret-check' | openssl dgst -sha256 -hmac 'SECRET' | awk '{print $NF}'
  var sig = hmacHex_(s, 'secret-check');
  console.log('HMAC-SHA256("secret-check") with this secret (a comparison value only: it opens nothing):');
  console.log('  ' + sig);
  console.log('');
  console.log('Reproduce on your terminal (with the SAME secret value you pasted into the GH Actions NEWSLETTER_HMAC_SECRET):');
  console.log('  printf \'secret-check\' | openssl dgst -sha256 -hmac \'PASTE-SECRET-HERE\' | awk \'{print $NF}\'');
  console.log('');
  console.log('Match? secrets are byte-identical — bad_signature is NOT a secret problem.');
  console.log('Differ? the two copies are different values. Regenerate with openssl rand -hex 32 and paste to both.');
}

/**
 * Run this once from the Apps Script editor (Run → migrateAddTokens) after
 * upgrading to the token-based schema. For every row that's missing a
 * confirm_token or unsub_token, generates fresh random tokens and writes
 * them. Idempotent — safe to run multiple times.
 *
 * Also verifies the header row matches EXPECTED_HEADERS and updates it
 * if the user added the two new columns to the Sheet but didn't fill in
 * the header text.
 */
function migrateAddTokens() {
  var sh = sheetUnchecked_();
  var maxCol = Math.max(EXPECTED_HEADERS.length, sh.getLastColumn());

  // Fix the header row if needed.
  var headers = sh.getRange(1, 1, 1, maxCol).getValues()[0];
  var writtenHeaders = false;
  for (var i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (String(headers[i] || '').toLowerCase() !== EXPECTED_HEADERS[i]) {
      sh.getRange(1, i + 1).setValue(EXPECTED_HEADERS[i]);
      writtenHeaders = true;
    }
  }
  if (writtenHeaders) sh.setFrozenRows(1);

  var last = sh.getLastRow();
  if (last < 2) {
    console.log('No rows to migrate.');
    return;
  }

  var rows = sh.getRange(2, 1, last - 1, EXPECTED_HEADERS.length).getValues();
  var filled = 0;
  for (var r = 0; r < rows.length; r++) {
    var confirmTok = String(rows[r][COL.confirmToken - 1] || '').trim();
    var unsubTok = String(rows[r][COL.unsubToken - 1] || '').trim();
    var changed = false;
    if (!confirmTok || !/^[0-9a-f]{64}$/i.test(confirmTok)) {
      sh.getRange(r + 2, COL.confirmToken).setValue(randomToken_());
      changed = true;
    }
    if (!unsubTok || !/^[0-9a-f]{64}$/i.test(unsubTok)) {
      sh.getRange(r + 2, COL.unsubToken).setValue(randomToken_());
      changed = true;
    }
    if (changed) filled++;
  }
  console.log('migrateAddTokens: filled ' + filled + ' row(s).');
}

// ============================================================================
// Response helpers
// ============================================================================

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(html) {
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Return a tiny HTML page that immediately redirects the top frame to the
 * given URL. Apps Script HtmlService serves responses inside a Google-owned
 * iframe at googleusercontent.com, so window.location only moves the iframe
 * — we need window.top to move the address bar. Referrer-Policy prevents
 * the destination from seeing the full Apps Script URL (with the opaque
 * token) as Referer.
 */
function redirectResponse_(url) {
  var safe = String(url);
  var html =
    '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="referrer" content="no-referrer">' +
    '<meta http-equiv="refresh" content="0; url=' + escapeHtml_(safe) + '">' +
    '<title>Redirecting\u2026</title>' +
    '<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:48px auto;padding:0 24px;color:#444;text-align:center;line-height:1.5;}a{color:#009688;}</style>' +
    '</head><body>' +
    '<p>Redirecting to nidhi.today\u2026</p>' +
    '<p><a href="' + escapeHtml_(safe) + '">Continue</a></p>' +
    '<script>try{window.top.location.replace(' + JSON.stringify(safe) + ');}catch(e){window.location.replace(' + JSON.stringify(safe) + ');}</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function pageTemplate_(title, message, ctaText, ctaHref) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="referrer" content="no-referrer">' +
    '<title>' + escapeHtml_(title) + '</title>' +
    '<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 24px;color:#222;line-height:1.5;}' +
    'h1{color:#0D47A1;font-size:1.6rem;}a.cta{display:inline-block;margin-top:16px;padding:10px 20px;background:#009688;color:#fff;text-decoration:none;border-radius:6px;}</style>' +
    '</head><body><h1>' + escapeHtml_(title) + '</h1><p>' + escapeHtml_(message) + '</p>' +
    '<a class="cta" href="' + escapeHtml_(ctaHref) + '">' + escapeHtml_(ctaText) + '</a></body></html>';
}

// ============================================================================
// Utilities
// ============================================================================

function normalizeEmail_(s) { return String(s || '').toLowerCase().trim(); }

// An address is written into a spreadsheet cell, where a value that starts
// with = + - or @ is read as a formula, so an address may not start with one
// (very few do). It also may not hold white space, double quotes, brackets or
// the marks that separate addresses in a list. Letters of any script, and an
// apostrophe (o'brien@...), are fine.
function isValidEmail_(s) {
  return s.length <= 254 && /^[^\s@=+\-"()<>,;:\\\[\]][^\s@"()<>,;:\\\[\]]*@[^\s@'"()<>,;:\\\[\]=+]+\.[^\s@'"()<>,;:\\\[\]=+]+$/.test(s) && !/[\r\n]/.test(s);
}

/**
 * The page a sign-up came from, as the site sends it: a path on the site.
 * Anything else is dropped, since the request can say anything and the value
 * goes into a spreadsheet cell and an analytics event.
 */
function cleanSource_(raw) {
  var s = String(raw || '');
  // `$` also matches before a final line break, so that is ruled out by itself.
  return /^\/[A-Za-z0-9/_.-]{0,199}$/.test(s) && !/[\r\n]/.test(s) ? s : '';
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function host_(urlStr) {
  var m = /^https?:\/\/([^\/]+)/.exec(String(urlStr));
  return m ? m[1] : urlStr;
}

function injectUnsubscribeUrl_(html, url) {
  return String(html).split('{{UNSUBSCRIBE_URL}}').join(url);
}

function injectUnsubscribeUrlText_(text, url) {
  return String(text).split('{{UNSUBSCRIBE_URL}}').join(url);
}

// Analytics restarted in a new PostHog project at 00:00 UTC on Oct 8, 2026;
// nothing is sent before then (matches src/components/Analytics.astro).
var POSTHOG_START_MS_ = Date.parse('2026-10-08T00:00:00Z');

function trackPosthog_(event, distinctId, properties) {
  if (Date.now() < POSTHOG_START_MS_) return;
  var cfg;
  try { cfg = config_(); } catch (_) { return; }
  if (!cfg.posthogKey) return;
  try {
    UrlFetchApp.fetch(cfg.posthogHost + '/capture/', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        api_key: cfg.posthogKey,
        event: event,
        distinct_id: distinctId,
        properties: properties || {},
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (_) { /* non-fatal */ }
}

// Stable, PII-minimised subscriber identifier for PostHog. SHA-256 of the
// normalised email (lowercase, trimmed), hex-encoded. Must match the client's
// sha256Hex() in src/components/SubscribeSection.astro exactly — both sides
// normalise with .toLowerCase().trim() before hashing so the browser's
// posthog.identify(hash) call aliases to the same distinct_id the server
// uses for blog_subscribe_pending / _confirmed / blog_unsubscribe, which is
// what makes the PostHog funnel actually stitch across client + server.
function distinctIdForEmail_(email) {
  return sha256Hex_(String(email).toLowerCase().trim());
}

function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(str),
    Utilities.Charset.UTF_8
  );
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    // Apps Script returns signed bytes (-128..127). Convert to unsigned
    // before hex formatting so we get the canonical 64-char lowercase digest.
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = b.toString(16);
    hex += h.length === 1 ? '0' + h : h;
  }
  return hex;
}
