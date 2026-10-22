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
 *        COUNT_TOKEN      (optional) a long random string. Turns on the count
 *                          endpoint below; the same value goes into the
 *                          landing site's WAITLIST_COUNT_TOKEN GitHub secret.
 *                          Without it the count endpoint refuses every call.
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
 *                            Returns { ok: true, count } when the token
 *                            matches COUNT_TOKEN: the number of distinct,
 *                            valid addresses on the list, and nothing else.
 *                            The landing site's build reads it to show a
 *                            rounded-down total ("50+ people have joined").
 *                            The token travels in the body, never the URL,
 *                            so it does not end up in logs.
 *
 *   GET  ?action=health     Per-dependency ok/error JSON report.
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

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ============================================================================
// PostHog
// ============================================================================

function distinctIdForEmail_(email) {
  var norm = normalizeEmail_(email);
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, norm, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var h = (b & 0xFF).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
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
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'waitlist') return handleWaitlist_(e);
    if (action === 'count') return handleCount_(e);
    return jsonResponse_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function safeSiteUrl_() {
  try { return config_().siteUrl; } catch (_) { return 'https://nidhi.today'; }
}

// ============================================================================
// Count (for the landing site's build)
// ============================================================================

// Distinct, valid addresses: duplicates kept from before dedupe and blank or
// malformed rows do not inflate the total the site shows.
function handleCount_(e) {
  var expected = prop_('COUNT_TOKEN');
  var given = String((e.parameter && e.parameter.token) || '');
  if (!expected || !sameString_(given, expected)) return jsonResponse_({ ok: false, error: 'forbidden' });
  var s = sheet_();
  var last = s.getLastRow();
  if (last < 2) return jsonResponse_({ ok: true, count: 0 });
  var seen = {};
  var count = 0;
  s.getRange(2, COL.email, last - 1, 1).getValues().forEach(function (row) {
    var email = normalizeEmail_(row[0]);
    if (isValidEmail_(email) && !seen[email]) { seen[email] = true; count++; }
  });
  return jsonResponse_({ ok: true, count: count });
}

// Walks the longer of the two whole, with no early return, so the time taken
// says nothing about the token's length or how much of a guess was right.
function sameString_(a, b) {
  var len = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// ============================================================================
// Waitlist (single opt-in)
// ============================================================================

function handleWaitlist_(e) {
  var email = normalizeEmail_((e.parameter && e.parameter.email) || '');
  var source = String((e.parameter && e.parameter.source) || '').slice(0, 200);
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
      sh.appendRow([email, source, new Date()]);
      added = true;
    }
  } finally {
    lock.releaseLock();
  }

  // A repeat changes nothing and sends nothing, and gets the same reply as a
  // new signup: the response must not say whether an address is on the list.
  if (added) {
    trackPosthog_('waitlist_signup', distinctIdForEmail_(email), {
      source: source,
      email_domain: emailDomain_(email),
    });
  }

  return jsonResponse_({ ok: true });
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

  function check(name, fn) {
    try {
      report.checks[name] = { ok: true, info: fn() || null };
    } catch (err) {
      report.ok = false;
      report.checks[name] = { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  check('script_properties', function () {
    var required = ['SPREADSHEET_ID', 'SHEET_NAME', 'SITE_URL'];
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

  check('sheet', function () {
    var s = sheet_();
    var headers = s.getRange(1, 1, 1, 3).getValues()[0];
    var expected = ['email', 'source', 'created_at'];
    for (var i = 0; i < expected.length; i++) {
      if (String(headers[i] || '').toLowerCase() !== expected[i]) {
        throw new Error('Column ' + (i + 1) + ' header "' + headers[i] + '" does not match expected "' + expected[i] + '". Headers found: ' + JSON.stringify(headers));
      }
    }
    var rows = s.getLastRow() - 1; // minus header
    return { tab: s.getName(), headers: headers, row_count: rows };
  });

  check('posthog', function () {
    var cfg = config_();
    return { configured: !!cfg.posthogApiKey, host: cfg.posthogHost };
  });

  return jsonResponse_(report);
}
