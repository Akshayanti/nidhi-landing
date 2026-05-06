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
 *        FROM_EMAIL      hello@nidhi.today   (MUST be an address this
 *                        Apps Script account is allowed to send from —
 *                        either the script owner's primary address or a
 *                        verified "Send mail as" alias)
 *        SITE_URL        https://nidhi.today
 *        HMAC_SECRET     <random 64 hex chars — `openssl rand -hex 32` —
 *                        used ONLY for signing GH-Actions-originated
 *                        send_post requests. Per-subscriber tokens are
 *                        random opaque values, not HMAC-derived.>
 *        POSTHOG_API_KEY (optional) for server-side event tracking
 *        POSTHOG_HOST    (optional) https://eu.i.posthog.com
 *
 *   3. Create the Sheet with these EXACT headers in row 1 (8 columns):
 *        email | status | source | created_at | confirmed_at |
 *        unsubscribed_at | confirm_token | unsub_token
 *      Statuses: pending | confirmed | unsubscribed
 *
 *   4. Run `?action=health` once to verify the config. The response is JSON
 *      that reports per-check ok/error for properties, web app URL, Gmail
 *      advanced service, Sheet access (including the exact tab used and
 *      header row match), and FROM_EMAIL sendability.
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
 *   GET  ?action=unsubscribe&t=...  Opaque token lookup. Marks row as
 *                                   unsubscribed. Redirects to
 *                                   {SITE_URL}/unsubscribed/.
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
 *   GET  ?action=health             Per-dependency ok/error JSON report.
 *                                   Safe to call; never modifies anything.
 *
 *   GET  ?action=scan_bounces       Signed (&sig=hmac-of-"scan_bounces").
 *                                   Scans the FROM_EMAIL inbox for
 *                                   mailer-daemon replies in the last 14
 *                                   days, marks matching Sheet rows as
 *                                   `bounced` so future sends skip them.
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

/**
 * Verify scan-bounces signature. No body (GET-style trigger), so we sign a
 * fixed constant. The action is idempotent (marking bounced rows as
 * bounced is a no-op on repeat), so replay-safety over the constant isn't
 * a risk worth solving with a timestamp.
 */
function verifyScanBouncesSig_(signatureHex) {
  if (!signatureHex) return false;
  if (!/^[0-9a-f]{64}$/i.test(String(signatureHex))) return false;
  var cfg = config_();
  var expected = hmacHex_(cfg.hmacSecret, 'scan_bounces');
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
};

var EXPECTED_HEADERS = [
  'email', 'status', 'source', 'created_at', 'confirmed_at',
  'unsubscribed_at', 'confirm_token', 'unsub_token',
];

/**
 * Open the configured tab of the configured spreadsheet.
 *
 * Fails loud if the tab doesn't exist (previous versions silently
 * auto-created a "Subscribers" tab when SHEET_NAME didn't match, which
 * caused data to land in a tab the operator wasn't watching). This version
 * requires an explicit match.
 */
function sheet_() {
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
  var rows = sh.getRange(2, 1, last - 1, 8).getValues();
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

function buildMimeMessage_(opts) {
  // opts: { from, fromName, to, subject, html, text, listUnsubPostUrl,
  //         listId, messageId }
  // listUnsubPostUrl is the URL that Gmail/Outlook POST to when the user
  // clicks the native one-click unsubscribe button (RFC 8058).
  var boundary = 'nidhi-' + Utilities.getUuid();
  var headers = [
    'From: ' + formatAddress_(opts.fromName, opts.from),
    'To: ' + opts.to,
    'Subject: ' + encodeSubject_(opts.subject),
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    'List-Unsubscribe: <' + opts.listUnsubPostUrl + '>',
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
    'List-ID: ' + opts.listId,
    'Precedence: bulk',
    'Auto-Submitted: auto-generated',
  ];
  if (opts.messageId) headers.push('Message-ID: <' + opts.messageId + '>');

  // 8bit (not 7bit): bodies contain UTF-8 bytes (e.g. U+2019 curly apostrophe
  // in "Everyone\u2019s"). Declaring 7bit with 8-bit bytes is an RFC
  // violation — some clients fall back to latin-1/ASCII and render the
  // unknown 0xE2 0x80 0x99 sequence as "?" (the "Everyone?s" bug). The
  // outer message is wrapped by Gmail.Users.Messages.send via base64, so
  // 8bit here is fine for transport.
  var parts = [
    '--' + boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    opts.text,
    '',
    '--' + boundary,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    opts.html,
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
    if (action === 'confirm')      return handleConfirm_(e);
    if (action === 'unsubscribe')  return handleUnsubscribe_(e, 'GET');
    if (action === 'health')       return handleHealth_();
    if (action === 'scan_bounces') return handleScanBounces_(e);
    return htmlResponse_(pageTemplate_(
      'Nothing here',
      'This endpoint powers newsletter signups on nidhi.today.',
      'Go to the blog',
      config_().siteUrl + '/blog/'
    ));
  } catch (err) {
    return htmlResponse_(pageTemplate_(
      'Something went wrong',
      String(err && err.message ? err.message : err),
      'Go to the blog',
      safeSiteUrl_() + '/blog/'
    ));
  }
}

function doPost(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'subscribe')    return handleSubscribe_(e);
    if (action === 'confirm')      return handleConfirm_(e);   // JS-initiated confirm
    if (action === 'unsubscribe')  return handleUnsubscribe_(e, 'POST');
    if (action === 'send_post')    return handleSendPost_(e);
    if (action === 'scan_bounces') return handleScanBounces_(e);
    return jsonResponse_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
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
  var report = { ok: true, checks: {}, web_app_url: null };

  function check(name, fn) {
    try {
      report.checks[name] = { ok: true, info: fn() || null };
    } catch (err) {
      report.ok = false;
      report.checks[name] = { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  check('script_properties', function () {
    var required = ['SHEET_ID', 'SHEET_NAME', 'FROM_NAME', 'FROM_EMAIL', 'SITE_URL', 'HMAC_SECRET'];
    var missing = required.filter(function (k) { return !prop_(k); });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
    return { configured: required };
  });

  check('web_app_url', function () {
    var url = ScriptApp.getService().getUrl();
    if (!url) throw new Error('ScriptApp.getService().getUrl() returned empty — not deployed as a web app?');
    report.web_app_url = url;
    return { url: url };
  });

  check('gmail_advanced_service', function () {
    if (typeof Gmail === 'undefined') {
      throw new Error('Gmail advanced service not enabled. Apps Script → Services → + → Gmail API → Add.');
    }
    var profile = Gmail.Users.getProfile('me');
    return { authorized_as: profile.emailAddress };
  });

  check('sheet_access', function () {
    var cfg = config_();
    var sh = sheet_();
    var headers = sh.getRange(1, 1, 1, 8).getValues()[0];
    var mismatched = EXPECTED_HEADERS.filter(function (h, i) {
      return String(headers[i] || '').toLowerCase() !== h;
    });
    if (mismatched.length) {
      throw new Error(
        'Sheet header row mismatch. Expected 8 columns: ' +
        EXPECTED_HEADERS.join(' | ') +
        '. Got: ' + headers.join(' | ') +
        '. Missing/wrong: ' + mismatched.join(', ')
      );
    }
    return { sheet_id: cfg.sheetId, sheet_name: cfg.sheetName, rows: sh.getLastRow() };
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

function handleSubscribe_(e) {
  var email = normalizeEmail_((e.parameter && e.parameter.email) || '');
  var source = String((e.parameter && e.parameter.source) || '').slice(0, 200);
  if (!isValidEmail_(email)) return jsonResponse_({ ok: false, error: 'invalid_email' });

  var sh = sheet_();
  var row = findSubscriberRow_(sh, email);
  var now = new Date();

  var confirmToken = randomToken_();
  var unsubToken = randomToken_();

  if (row === 0) {
    sh.appendRow([email, 'pending', source, now, '', '', confirmToken, unsubToken]);
  } else {
    var status = String(sh.getRange(row, COL.status).getValue()).toLowerCase();
    if (status === 'confirmed') {
      // Already subscribed — don't leak that fact. Silently succeed.
      trackPosthog_('blog_subscribe_duplicate', email, { source: source });
      return jsonResponse_({ ok: true });
    }
    // pending or unsubscribed: reset to pending with fresh tokens.
    sh.getRange(row, COL.status, 1, 8 - COL.email).setValues([[
      'pending', source, now, '', '', confirmToken, unsubToken,
    ]]);
  }

  sendConfirmationEmail_(email, confirmToken);
  trackPosthog_('blog_subscribe_pending', email, { source: source });
  return jsonResponse_({ ok: true });
}

// ============================================================================
// Confirm
// ============================================================================

function handleConfirm_(e) {
  var cfg = config_();
  var token = (e.parameter && e.parameter.t) || '';
  var sh = sheet_();
  var row = findRowByToken_(sh, COL.confirmToken, token);

  if (row === 0) {
    return redirectResponse_(cfg.siteUrl + '/subscription-invalid?reason=confirm');
  }

  var email = String(sh.getRange(row, COL.email).getValue()).trim();
  var unsubToken = String(sh.getRange(row, COL.unsubToken).getValue()).trim();

  // Flip status to confirmed; clear unsubscribedAt in case this row was
  // previously unsubscribed; invalidate the confirm token so the link is
  // single-use. Unsub token stays intact.
  sh.getRange(row, COL.status).setValue('confirmed');
  sh.getRange(row, COL.confirmedAt).setValue(new Date());
  sh.getRange(row, COL.unsubscribedAt).setValue('');
  sh.getRange(row, COL.confirmToken).setValue('');

  // Welcome email: land softly in the inbox right after the opt-in click
  // so the subscriber sees an immediate "you're in" beyond the landing
  // page. Non-fatal — if Gmail hiccups, we still confirm the row.
  try {
    sendWelcomeEmail_(email, unsubToken);
  } catch (err) {
    // Welcome email is non-blocking (the subscriber IS confirmed regardless),
    // but we still want a signal so a silent Gmail outage doesn't mean
    // nobody ever gets their "you're in" email. Aggregate event + console
    // log is the minimum useful alert surface.
    console.warn('sendWelcomeEmail_ failed for ' + email + ': ' + err);
    trackPosthog_('blog_welcome_failed', email, {
      email_domain: emailDomain_(email),
      error: String(err && err.message ? err.message : err).slice(0, 300),
    });
  }

  trackPosthog_('blog_subscribe_confirmed', email, {});
  return redirectResponse_(cfg.siteUrl + '/subscription-confirmed');
}

// ============================================================================
// Unsubscribe
// ============================================================================

function handleUnsubscribe_(e, method) {
  var cfg = config_();
  var token = (e.parameter && e.parameter.t) || '';
  var sh = sheet_();
  var row = findRowByToken_(sh, COL.unsubToken, token);

  if (row === 0) {
    if (method === 'POST') {
      return jsonResponse_({ ok: false, error: 'invalid_token' });
    }
    return redirectResponse_(cfg.siteUrl + '/subscription-invalid?reason=unsubscribe');
  }

  var email = String(sh.getRange(row, COL.email).getValue()).trim();
  sh.getRange(row, COL.status).setValue('unsubscribed');
  sh.getRange(row, COL.unsubscribedAt).setValue(new Date());

  trackPosthog_('blog_unsubscribe', email, { method: method });

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
    return jsonResponse_({ ok: false, error: 'from_email_not_sendable: ' + err.message });
  }

  var payload = JSON.parse(raw);
  if (!payload || !payload.subject || !payload.html || !payload.text || !payload.guid) {
    return jsonResponse_({ ok: false, error: 'missing_fields' });
  }

  var seenKey = 'sent_guid:' + payload.guid;
  if (prop_(seenKey)) {
    return jsonResponse_({ ok: true, skipped: 'already_sent', sent: 0 });
  }

  var subscribers = listConfirmedSubscribers_();
  if (subscribers.length === 0) {
    props_().setProperty(seenKey, String(new Date().getTime()));
    return jsonResponse_({ ok: true, sent: 0 });
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
        messageId: payload.guid.replace(/[^a-zA-Z0-9._-]/g, '_') + '@' + host_(cfg.siteUrl),
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
// address is dead is to look at `mailer-daemon` bounce replies sitting in
// the FROM_EMAIL inbox. This job scans the last 14 days of such replies,
// extracts failed recipient addresses, and flips matching Sheet rows from
// `confirmed` → `bounced` so we stop burning Workspace quota on dead
// addresses.
//
// `bounced` is outside the enum in listConfirmedSubscribers_() — which
// filters on status==='confirmed' — so marked rows are implicitly dropped
// from all future fan-outs. Re-subscribing via the public form overwrites
// the row back to `pending` and goes through the normal double-opt-in
// flow, which acts as a manual "we think this address works again" check.
//
// Why a single 14-day window:
//  - Shorter than 14d and a weekly cron would miss bounces that arrived
//    between runs;
//  - Longer and we'd repeatedly re-process the same old bounces on every
//    daily run (harmless, just wasteful).
//
// The extracted address set intentionally over-matches (any `<…@…>` in the
// bounce body) and we filter to addresses actually present in our sheet,
// so we can't accidentally mark a stranger's email.

function handleScanBounces_(e) {
  var sig = (e && e.parameter && e.parameter.sig) || '';
  if (!verifyScanBouncesSig_(sig)) {
    return jsonResponse_({ ok: false, error: 'bad_signature' });
  }

  var cfg = config_();

  // Broad Gmail query — we over-match on purpose and then filter candidates
  // against the Sheet. Bounces come from `mailer-daemon@googlemail.com`
  // in most cases; the subject heuristic catches forwarding-service
  // bounces that spoof a different From.
  var query = 'in:inbox (from:mailer-daemon OR from:postmaster OR subject:"Delivery Status Notification") newer_than:14d';
  var threads;
  try {
    threads = GmailApp.search(query, 0, 200);
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'gmail_search_failed: ' + err });
  }

  // Build a Set of all addresses appearing in bounce bodies.
  var candidates = {};
  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var msg = msgs[m];
      var haystack = '';
      try { haystack += (msg.getSubject() || '') + '\n'; } catch (_) {}
      try { haystack += (msg.getPlainBody() || ''); } catch (_) {}
      // Match both `<user@host>` bracketed forms and bare addresses — bounce
      // reports vary wildly between providers.
      var re = /([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/g;
      var match;
      while ((match = re.exec(haystack)) !== null) {
        var addr = match[1].toLowerCase();
        if (addr.indexOf('mailer-daemon') === 0) continue;
        if (addr.indexOf('postmaster@') === 0)   continue;
        if (addr === cfg.fromEmail.toLowerCase())  continue;
        // Skip common noise: Google-generated bounce-report from lines.
        if (/@googlemail\.com$/i.test(addr)) continue;
        if (/@google\.com$/i.test(addr))     continue;
        candidates[addr] = true;
      }
    }
  }

  // Filter to addresses that actually exist in the Sheet (and are currently
  // confirmed) — everything else is noise from the bounce body.
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) {
    return jsonResponse_({
      ok: true, threads_scanned: threads.length,
      candidates: Object.keys(candidates).length, marked_bounced: 0,
    });
  }

  var marked = 0;
  var markedAddrs = [];
  var rows = sh.getRange(2, 1, last - 1, 8).getValues();
  for (var r = 0; r < rows.length; r++) {
    var rowEmail = String(rows[r][0] || '').trim().toLowerCase();
    var rowStatus = String(rows[r][1] || '').toLowerCase();
    if (rowStatus !== 'confirmed') continue;
    if (!candidates[rowEmail]) continue;

    sh.getRange(r + 2, COL.status).setValue('bounced');
    sh.getRange(r + 2, COL.unsubscribedAt).setValue(new Date());
    marked++;
    markedAddrs.push(rowEmail);

    trackPosthog_('blog_subscriber_bounced', rowEmail, {
      email_domain: emailDomain_(rowEmail),
      via: 'mailer_daemon_scan',
    });
  }

  if (marked > 0) {
    console.warn('scan_bounces: marked ' + marked + ' row(s) as bounced: ' + markedAddrs.join(', '));
  }

  return jsonResponse_({
    ok: true,
    threads_scanned: threads.length,
    candidates: Object.keys(candidates).length,
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
    cfg.fromName + ' — confirm your subscription\r\n\r\n' +
    'Hi,\r\n\r\n' +
    'Click the link below to confirm you\u2019d like a heads-up from ' + cfg.fromName + ' whenever a new post goes up:\r\n\r\n' +
    confirmPageUrl + '\r\n\r\n' +
    'If you didn\u2019t sign up, ignore this email and you won\u2019t hear from us again.\r\n\r\n' +
    '— ' + cfg.fromName + '\r\n' +
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
    cfg.fromName + ' — you\u2019re in.\r\n\r\n' +
    'Thanks for confirming. We\u2019ll ping you from ' + cfg.fromEmail + ' whenever a new post goes up — nothing else. No digests, no "special offers".\r\n\r\n' +
    'While you wait for the next one, the existing posts are all on the blog:\r\n' +
    blogUrl + '\r\n\r\n' +
    'Reply to this email if anything ever lands wrong — a real person reads it.\r\n\r\n' +
    '— ' + cfg.fromName + '\r\n' +
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
              '<p style="margin:0 0 16px;">Thanks for confirming. We\u2019ll ping you from <strong style="color:#0D47A1;">' + escapeHtml_(cfg.fromEmail) + '</strong> whenever a new post goes up &mdash; nothing else. No digests, no surprises, no "special offers".</p>' +
              '<p style="margin:0 0 20px;">While you wait for the next one, the existing posts are all on the blog:</p>' +
              '<p style="margin:0 0 24px;"><a href="' + escapeHtml_(blogUrl) + '" style="display:inline-block;padding:12px 24px;background:#009688;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Start reading &rarr;</a></p>' +
              '<p style="margin:0 0 12px;color:#555;font-size:14px;">Reply to this email if anything ever lands wrong &mdash; a real person reads it.</p>' +
              '<p style="margin:24px 0 0;color:#555;font-size:14px;">&mdash; ' + escapeHtml_(cfg.fromName) + '</p>' +
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
          '<img src="' + escapeHtml_(logoUrl) + '" alt="' + escapeHtml_(cfg.fromName) + ' — Money, understood." width="200" height="auto" style="display:block;max-width:200px;height:auto;border:0;outline:none;">' +
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
 *   3. Computes HMAC-SHA256 of the literal string "scan_bounces" with
 *      the current secret, and prints it. You can then run the same
 *      HMAC locally with your GH Actions copy of the secret:
 *
 *        printf 'scan_bounces' \
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
  //   printf 'scan_bounces' | openssl dgst -sha256 -hmac 'SECRET' | awk '{print $NF}'
  var sig = hmacHex_(s, 'scan_bounces');
  console.log('HMAC-SHA256("scan_bounces") with this secret:');
  console.log('  ' + sig);
  console.log('');
  console.log('Reproduce on your terminal (with the SAME secret value you pasted into the GH Actions NEWSLETTER_HMAC_SECRET):');
  console.log('  printf \'scan_bounces\' | openssl dgst -sha256 -hmac \'PASTE-SECRET-HERE\' | awk \'{print $NF}\'');
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
  var sh = sheet_();
  var maxCol = Math.max(8, sh.getLastColumn());

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

  var rows = sh.getRange(2, 1, last - 1, 8).getValues();
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

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

function trackPosthog_(event, distinctId, properties) {
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
