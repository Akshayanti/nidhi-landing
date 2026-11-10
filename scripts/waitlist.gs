/**
 * Nidhi product-launch waitlist — Google Apps Script Web App
 * ===========================================================
 *
 * Separate from the blog newsletter backend. This is a single-opt-in waitlist
 * for people who want to be notified when the nidhi product launches. No
 * confirmation email, no double-opt-in, no unsubscribe flow -- just a simple
 * "tell me when you go live" list.
 *
 * Deploy this as a Web App (Deploy → New deployment → Web app).
 *   Execute as:    Me (<your Workspace account>)
 *   Who has access: Anyone
 *
 * After any code change: Deploy → Manage deployments → ✏️ → New version →
 * Deploy. The /exec URL stays the same. Paste that URL into the
 * PUBLIC_WAITLIST_ENDPOINT env var on the landing site.
 *
 * Required setup in the Apps Script project:
 *   1. Project Settings → Script properties → add:
 *        SPREADSHEET_ID   <id of the Google Sheet — between /d/ and /edit in
 *                          the URL. This can be the SAME spreadsheet that
 *                          the newsletter uses; the waitlist writes to a
 *                          dedicated tab.>
 *        SHEET_NAME       beta waitlist   (or whatever you name the tab)
 *        SITE_URL         https://nidhi.today
 *        POSTHOG_API_KEY  (optional) for server-side event tracking
 *        POSTHOG_HOST     (optional) https://eu.i.posthog.com
 *
 *   2. In the spreadsheet: create a tab named "beta waitlist" (or the SHEET_NAME
 *      value) with these EXACT headers in row 1 (3 columns):
 *        email | source | created_at
 *
 * Endpoints (relative to /exec URL):
 *
 *   POST ?action=waitlist   form body: email, source
 *                            Appends a row (single opt-in) unless the
 *                            address is already on the list, in which case
 *                            nothing is written. Responds { ok: true } on
 *                            any valid email either way, so the response
 *                            never reveals who is on the list.
 *
 *   POST action=count       form body: action, token
 *                            Returns { ok: true, count } when the token's
 *                            SHA-256 matches COUNT_TOKEN_SHA256_ below: the
 *                            number of distinct, valid addresses across the
 *                            waitlist AND the volunteers who ticked the
 *                            planner-beta box in the volunteer form's response
 *                            spreadsheet (opened by VOLUNTEER_SPREADSHEET_ID_),
 *                            and nothing else. If that spreadsheet cannot be
 *                            read or its headers do not match, it answers
 *                            { ok: false, error: 'schema' | 'error' } rather
 *                            than a lower number. The landing site's build
 *                            reads it to show how many people are waiting for
 *                            a beta invite.
 *                            The token travels in the body, never the URL,
 *                            so it does not end up in logs.
 *
 *   POST action=list        form body: action, token
 *                            Returns { ok: true, items: [{ email, source,
 *                            created_at }] } when the token's SHA-256 matches
 *                            LIST_TOKEN_SHA256_ below (a different token from
 *                            the count one): one item per distinct, valid
 *                            address, the first row winning, and nothing else
 *                            from the sheet. The planner's admin tools read it
 *                            on demand to choose whom to invite; nothing is
 *                            invited automatically. The action and the token are
 *                            read only from the POST body (form-encoded);
 *                            anything in the query string is ignored, so a
 *                            token sent in the URL is never accepted. If the
 *                            sheet's first three headers are not email,
 *                            source, created_at it answers { ok: false,
 *                            error: 'schema' }.
 *
 *   GET  ?action=health     Coarse ok/false per dependency, with no tab names,
 *                            counts or error text (details go to the script's
 *                            own logs).
 */

// ============================================================================
// Config
// ============================================================================

var CONFIG_CACHE = null;

function config_() {
  if (CONFIG_CACHE) return CONFIG_CACHE;
  var p = PropertiesService.getScriptProperties();
  var missing = [];
  function req(key) {
    var v = p.getProperty(key);
    if (!v) missing.push(key);
    return v || '';
  }
  var cfg = {
    spreadsheetId: req('SPREADSHEET_ID'),
    sheetName:     req('SHEET_NAME'),
    siteUrl:       req('SITE_URL'),
    posthogApiKey: p.getProperty('POSTHOG_API_KEY') || '',
    posthogHost:   p.getProperty('POSTHOG_HOST') || 'https://eu.i.posthog.com',
  };
  if (missing.length) throw new Error('Missing script properties: ' + missing.join(', '));
  CONFIG_CACHE = cfg;
  return cfg;
}

function prop_(key) {
  try { return PropertiesService.getScriptProperties().getProperty(key); } catch (_) { return null; }
}

// ============================================================================
// Sheet helpers
// ============================================================================

var COL = { email: 1, source: 2, created_at: 3 };

var SHEET_CACHE = null;

function sheet_() {
  if (SHEET_CACHE) {
    // SpreadsheetApp caches the Spreadsheet object internally, but if the
    // user renamed the tab between calls we'd return stale data. Re-resolve
    // the sheet by name each time, but reuse the Spreadsheet handle.
    var cfg = config_();
    var s = SHEET_CACHE.getSheetByName(cfg.sheetName);
    if (!s) throw new Error('Sheet tab "' + cfg.sheetName + '" not found in the spreadsheet.');
    return s;
  }
  var cfg = config_();
  var ss = SpreadsheetApp.openById(cfg.spreadsheetId);
  SHEET_CACHE = ss;
  var s = ss.getSheetByName(cfg.sheetName);
  if (!s) throw new Error('Sheet tab "' + cfg.sheetName + '" not found in the spreadsheet.');
  return s;
}

// ============================================================================
// Email validation
// ============================================================================

function normalizeEmail_(s) { return String(s || '').toLowerCase().trim(); }

// An address is written into a spreadsheet cell, where a value that starts
// with = + - or @ is read as a formula. So it must start with something else,
// and it may not hold the characters a formula or a display name is built
// from. Letters of any script are fine. (Same rule as scripts/newsletter.gs.)
function isValidEmail_(s) {
  return s.length <= 254 && /^[^\s@=+\-'"()<>,;:\\\[\]][^\s@'"()<>,;:\\\[\]]*@[^\s@'"()<>,;:\\\[\]=+]+\.[^\s@'"()<>,;:\\\[\]=+]+$/.test(s);
}

/**
 * The page a sign-up came from, as the site sends it: a path on the site.
 * Anything else is dropped, since the request can say anything and the value
 * goes into a spreadsheet cell, an analytics event and the list the planner
 * reads.
 */
function cleanSource_(raw) {
  var s = String(raw || '');
  return /^\/[A-Za-z0-9/_.-]{0,199}$/.test(s) ? s : '';
}

// ============================================================================
// PostHog
// ============================================================================

function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var h = (b & 0xFF).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

function distinctIdForEmail_(email) {
  return sha256Hex_(normalizeEmail_(email));
}

function emailDomain_(email) {
  var parts = normalizeEmail_(email).split('@');
  return parts.length === 2 ? parts[1] : '';
}

// Analytics restarted in a new PostHog project at 00:00 UTC on Oct 8, 2026;
// nothing is sent before then (matches src/components/Analytics.astro and
// scripts/newsletter.gs).
var POSTHOG_START_MS_ = Date.parse('2026-10-08T00:00:00Z');

function trackPosthog_(event, distinctId, properties) {
  if (Date.now() < POSTHOG_START_MS_) return;
  var cfg = config_();
  if (!cfg.posthogApiKey) return;
  try {
    var payload = {
      api_key: cfg.posthogApiKey,
      timestamp: new Date().toISOString(),
      distinct_id: distinctId,
      event: event,
      properties: properties || {},
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };
    UrlFetchApp.fetch(cfg.posthogHost + '/capture/', options);
  } catch (err) {
    console.warn('[waitlist] PostHog capture failed for ' + event + ': ' + err);
  }
}

// ============================================================================
// JSON / HTML response helpers
// ============================================================================

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(html) {
  return HtmlService.createHtmlOutput(html)
    .setTitle('nidhi waitlist')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================================
// Handlers
// ============================================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'health') return handleHealth_();
    return htmlResponse_(
      '<html><body style="font-family:sans-serif;text-align:center;padding:3rem">' +
      '<h2>Nothing here</h2>' +
      '<p>This endpoint powers the product-launch waitlist on nidhi.today.</p>' +
      '<a href="' + safeSiteUrl_() + '/">Go to nidhi</a>' +
      '</body></html>'
    );
  } catch (err) {
    // The message can name sheet internals, so the caller gets a fixed word.
    console.error('[waitlist] GET failed: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
}

function doPost(e) {
  try {
    // The list action reads its action and token from the body only.
    // The list and count actions read their action and token from the body only.
    var bodyAction = formBody_(e).action;
    if (bodyAction === 'list') return handleList_(e);
    if (bodyAction === 'count') return handleCount_(e);
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'waitlist') return handleWaitlist_(e);
    return jsonResponse_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error('[waitlist] POST failed: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
}

function safeSiteUrl_() {
  try { return config_().siteUrl; } catch (_) { return 'https://nidhi.today'; }
}

// ============================================================================
// Count (for the landing site's build)
// ============================================================================

// The SHA-256 of the count token, in hex. The token itself lives only in the
// landing site's WAITLIST_COUNT_TOKEN secret (and the founder's local .env); a
// hash of a 256-bit random token says nothing about it, so it can sit in the
// source, and deploying needs no script property. To rotate: make a new token
// (openssl rand -hex 32), set the secret, put its SHA-256 here, redeploy.
var COUNT_TOKEN_SHA256_ = 'a443a8d061ebe14cf7cb89e48a63d4fc2d4d59dd5124c64337b9a7e4edc444c8';

// People waiting for a beta invite, counted once each across two lists: the
// waitlist above, and the volunteers who ticked the planner-beta box in the
// volunteer form's response spreadsheet. The union is built here, inside the
// same Google account, and only its size leaves the script. Duplicates kept
// from before dedupe, blank or malformed addresses and volunteers who did not
// tick the box do not inflate the total the site shows.
//
// If the volunteer sheet cannot be read or its headers moved, the answer is an
// error rather than the waitlist alone: a silently lower number would be
// shown as the truth, while an error makes the build leave the line out.
function handleCount_(e) {
  var given = String(formBody_(e).token || '');
  if (!given || given.length > MAX_TOKEN_LENGTH_ || !sameString_(sha256Hex_(given), COUNT_TOKEN_SHA256_)) return jsonResponse_({ ok: false, error: 'forbidden' });
  var seen = {};
  var count = 0;
  function add(raw) {
    var email = normalizeEmail_(raw);
    if (isValidEmail_(email) && !seen[email]) { seen[email] = true; count++; }
  }
  var s = sheet_();
  // A moved column would count the wrong data, so the waitlist's headers are
  // checked here as the list action checks them.
  if (!headersMatch_(s)) return jsonResponse_({ ok: false, error: 'schema' });
  var last = s.getLastRow();
  if (last >= 2) {
    s.getRange(2, COL.email, last - 1, 1).getValues().forEach(function (row) { add(row[0]); });
  }
  var volunteers;
  try {
    volunteers = betaVolunteerEmails_();
  } catch (err) {
    console.error('[waitlist] volunteer sheet unreadable: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
  if (!volunteers) return jsonResponse_({ ok: false, error: 'schema' });
  volunteers.forEach(add);
  return jsonResponse_({ ok: true, count: count });
}

// ----------------------------------------------------------------------------
// Volunteer form contract: the header texts and the choice the count depends
// on. Same texts as scripts/volunteer-list.gs, found the same way (by header,
// not position). Keep in step with scripts/volunteer-form.gs (a test compares
// them). The spreadsheet id is not a secret: opening it needs access to the
// Google account that owns it.
// ----------------------------------------------------------------------------

var VOLUNTEER_SPREADSHEET_ID_ = '1K3LL_00Kq4L0ouTsr2cQc25xKNLn5YaI75KnKn9U3Z8';
var VOLUNTEER_HEADER_EMAIL_ = 'Email';
var VOLUNTEER_HEADER_BETA_ = 'Planner beta (optional)';
var VOLUNTEER_BETA_CHOICE_ = 'Invite me to the planner\'s beta when it opens.';

/** Column index (0-based) of the email and beta headers, or null if either is missing. */
function volunteerColumns_(headers) {
  var wanted = { email: VOLUNTEER_HEADER_EMAIL_, beta: VOLUNTEER_HEADER_BETA_ };
  var found = {};
  for (var key in wanted) {
    var idx = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === wanted[key]) { idx = i; break; }
    }
    if (idx < 0) return null;
    found[key] = idx;
  }
  return found;
}

/**
 * Raw email cells of the volunteers who ticked the beta box, from the first
 * tab whose header row has both headers (a form's spreadsheet can gain tabs,
 * so position is no guide). Null when no tab matches or when more than one
 * does (an archived copy would otherwise silently supply an old count);
 * throws when the spreadsheet cannot be opened.
 */
function betaVolunteerEmails_() {
  var sheets = SpreadsheetApp.openById(VOLUNTEER_SPREADSHEET_ID_).getSheets();
  var found = null;
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var width = sh.getLastColumn();
    if (width < 1 || sh.getLastRow() < 1) continue;
    var cols = volunteerColumns_(sh.getRange(1, 1, 1, width).getValues()[0]);
    if (!cols) continue;
    if (found) return null;
    var rows = sh.getLastRow() - 1;
    if (rows < 1) { found = []; continue; }
    var emails = sh.getRange(2, cols.email + 1, rows, 1).getValues();
    var betas = sh.getRange(2, cols.beta + 1, rows, 1).getValues();
    var out = [];
    for (var r = 0; r < rows; r++) {
      if (hasChoice_(betas[r][0], VOLUNTEER_BETA_CHOICE_)) out.push(emails[r][0]);
    }
    found = out;
  }
  return found;
}

/**
 * Whether a checkbox answer includes the choice. The sheet stores the chosen
 * texts joined by ", ", and a choice text may itself hold a comma, so the cell
 * matches when it equals the choice or the choice sits between the separators
 * at either end or in the middle. An exact match, not a substring, so another
 * option that merely contains the text never counts.
 */
function hasChoice_(cell, choice) {
  var text = String(cell || '');
  if (text === choice) return true;
  return text.indexOf(choice + ', ') === 0 ||
    text.slice(-(choice.length + 2)) === ', ' + choice ||
    text.indexOf(', ' + choice + ', ') >= 0;
}

// The list action has its own token, so a leaked count token (which the
// landing build holds) cannot read addresses. The plain token lives only in
// the planner server's environment. Rotate it like the count token: new
// token, new hash here, redeploy.
var LIST_TOKEN_SHA256_ = '3be003dad4fd77a8765f2b77c57328a8127e43300db7290b96303abdcd99c32b';

// Longest token the list action will hash: the real one is 43 characters, so
// anything longer is not it and is not worth hashing.
var MAX_TOKEN_LENGTH_ = 128;

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

// First occurrence of each distinct, valid address wins. Only these three
// fields leave the sheet.
function handleList_(e) {
  var given = String(formBody_(e).token || '');
  if (!given || given.length > MAX_TOKEN_LENGTH_ || !sameString_(sha256Hex_(given), LIST_TOKEN_SHA256_)) return jsonResponse_({ ok: false, error: 'forbidden' });
  var s = sheet_();
  if (!headersMatch_(s)) return jsonResponse_({ ok: false, error: 'schema' });
  var last = s.getLastRow();
  if (last < 2) return jsonResponse_({ ok: true, items: [] });
  var seen = {};
  var items = [];
  s.getRange(2, COL.email, last - 1, COL.created_at - COL.email + 1).getValues().forEach(function (row) {
    var email = normalizeEmail_(row[COL.email - 1]);
    if (!isValidEmail_(email) || seen[email]) return;
    seen[email] = true;
    var created = row[COL.created_at - 1];
    items.push({
      email: email,
      source: String(row[COL.source - 1] || '').slice(0, 200),
      created_at: created instanceof Date ? created.toISOString() : String(created || ''),
    });
  });
  return jsonResponse_({ ok: true, items: items });
}

/** Whether row 1 starts with email, source, created_at, so a moved column never leaks the wrong data. */
function headersMatch_(sh) {
  var headers = sh.getRange(1, 1, 1, 3).getValues()[0];
  var expected = ['email', 'source', 'created_at'];
  for (var i = 0; i < expected.length; i++) {
    if (String(headers[i] || '').toLowerCase().trim() !== expected[i]) return false;
  }
  return true;
}

// Compare the fixed-length SHA-256 hex digests without returning at the first
// mismatch.
function sameString_(a, b) {
  var len = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// ============================================================================
// Waitlist (single opt-in)
// ============================================================================

// New rows this script will add in one UTC day. A script posting made-up
// addresses could otherwise fill the sheet and push up the number the site
// shows. Past it, the reply is the same and nothing is written.
var MAX_SIGNUPS_PER_DAY_ = 500;

function handleWaitlist_(e) {
  var email = normalizeEmail_((e.parameter && e.parameter.email) || '');
  var source = cleanSource_(e.parameter && e.parameter.source);
  if (!isValidEmail_(email)) return jsonResponse_({ ok: false, error: 'invalid_email' });

  // The lock makes check-then-append atomic, so two submits arriving
  // together (a double click, or both boxes on one page) can't both append.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var added = false;
  try {
    var sh = sheet_();
    dedupeOnce_(sh);
    if (!hasEmail_(sh, email)) {
      if (takeSignupSlot_(new Date())) {
        sh.appendRow([email, source, new Date()]);
        added = true;
      } else {
        console.error('[waitlist] daily sign-up limit reached (' + MAX_SIGNUPS_PER_DAY_ + '): row not written');
      }
    }
  } finally {
    lock.releaseLock();
  }

  // A repeat changes nothing and sends nothing, and gets the same reply as a
  // new signup: the response must not say whether an address is on the list.
  // (How long the reply takes can still differ a little: a new address costs
  // one write and one analytics call more. Apps Script's own timing varies by
  // more than that, and telling the two apart this way adds the address.)
  if (added) {
    trackPosthog_('waitlist_signup', distinctIdForEmail_(email), {
      source: source,
      email_domain: emailDomain_(email),
    });
  }

  return jsonResponse_({ ok: true });
}

/** Counts one new row against today's limit; false once the limit is reached. Call inside the lock. */
function takeSignupSlot_(now) {
  var store = PropertiesService.getScriptProperties();
  var key = 'signups:' + Utilities.formatDate(now, 'UTC', 'yyyy-MM-dd');
  var used = Number(store.getProperty(key)) || 0;
  if (used >= MAX_SIGNUPS_PER_DAY_) return false;
  store.setProperty(key, String(used + 1));
  if (used === 0) {
    var all = store.getProperties();
    for (var k in all) if (k.indexOf('signups:') === 0 && k !== key) store.deleteProperty(k);
  }
  return true;
}

/** Whether the (normalised) address already has a row. */
function hasEmail_(sh, email) {
  var last = sh.getLastRow();
  if (last < 2) return false;
  var values = sh.getRange(2, COL.email, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (normalizeEmail_(values[i][0]) === email) return true;
  }
  return false;
}

/**
 * One-time cleanup of rows stored before duplicates were blocked: keeps the
 * first (earliest) row for each address and deletes the later ones. Runs on
 * the first signup after this version is deployed, under the same lock, then
 * records that it ran so it never scans again.
 */
var DEDUPE_FLAG_ = 'waitlist_deduped_v1';

function dedupeOnce_(sh) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(DEDUPE_FLAG_)) return;
  var last = sh.getLastRow();
  if (last >= 2) {
    var values = sh.getRange(2, COL.email, last - 1, 1).getValues();
    var seen = {};
    var later = [];
    for (var i = 0; i < values.length; i++) {
      var key = normalizeEmail_(values[i][0]);
      if (!key) continue;
      if (seen[key]) later.push(i + 2);
      else seen[key] = true;
    }
    // Bottom up, so deleting a row doesn't shift the ones still to delete.
    for (var j = later.length - 1; j >= 0; j--) sh.deleteRow(later[j]);
    console.log('[waitlist] removed ' + later.length + ' duplicate row(s)');
  }
  props.setProperty(DEDUPE_FLAG_, new Date().toISOString());
}

// ============================================================================
// Health check
// ============================================================================

function handleHealth_() {
  var report = { ok: true, checks: {} };

  // The result is public, so it says only ok or not; the reason is logged.
  function check(name, fn) {
    try {
      fn();
      report.checks[name] = { ok: true };
    } catch (err) {
      report.ok = false;
      report.checks[name] = { ok: false };
      console.error('[waitlist] health check ' + name + ' failed: ' + err);
    }
  }

  check('script_properties', function () {
    var required = ['SPREADSHEET_ID', 'SHEET_NAME', 'SITE_URL'];
    var missing = required.filter(function (k) { return !prop_(k); });
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
  });

  check('web_app_url', function () {
    if (!ScriptApp.getService().getUrl()) throw new Error('not deployed as a web app');
  });

  check('sheet', function () {
    if (!headersMatch_(sheet_())) throw new Error('headers do not match');
  });

  check('posthog', function () {
    config_();
  });

  return jsonResponse_(report);
}
