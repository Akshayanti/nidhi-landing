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
 *                            Appends a row with status=confirmed (no
 *                            double-opt-in). Responds { ok: true } on any
 *                            valid email.
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

function trackPosthog_(event, distinctId, properties) {
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
    return jsonResponse_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function safeSiteUrl_() {
  try { return config_().siteUrl; } catch (_) { return 'https://nidhi.today'; }
}

// ============================================================================
// Waitlist (single opt-in)
// ============================================================================

function handleWaitlist_(e) {
  var email = normalizeEmail_((e.parameter && e.parameter.email) || '');
  var source = String((e.parameter && e.parameter.source) || '').slice(0, 200);
  if (!isValidEmail_(email)) return jsonResponse_({ ok: false, error: 'invalid_email' });

  var now = new Date();
  sheet_().appendRow([email, source, now]);

  trackPosthog_('waitlist_signup', distinctIdForEmail_(email), {
    source: source,
    email_domain: emailDomain_(email),
  });

  return jsonResponse_({ ok: true });
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
