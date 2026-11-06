/**
 * Nidhi volunteer beta-interest list — Google Apps Script Web App
 * ================================================================
 *
 * A small web app bound to the volunteer form's response spreadsheet (the one
 * scripts/volunteer-form.gs sends the form's answers to). It lets the
 * planner's admin tools read who ticked "Planner beta (optional)", to choose
 * whom to invite. Nothing is invited automatically: a person picks every
 * invite.
 *
 * Only an email address and when the form was submitted are returned, and
 * only for rows that ticked the beta box. The script reads just those three
 * columns; no other answer field is read or returned to the planner.
 *
 * Create it as a container-bound script: open the response spreadsheet →
 * Extensions → Apps Script (or `clasp create --type sheets --parentId <sheet
 * id>`), paste this file, then Deploy → New deployment → Web app.
 *   Execute as:    Me (<your Workspace account>)
 *   Who has access: Anyone   (the token below is the gate, as for the waitlist)
 *
 * After any code change: Deploy → Manage deployments → ✏️ → New version →
 * Deploy. The /exec URL stays the same.
 *
 * No script properties are needed: the script reads the spreadsheet it is
 * bound to. It finds the response tab and the columns by their header text,
 * not their position, so a reordered sheet keeps working; a missing header
 * answers { ok: false, error: 'schema' } rather than guessing.
 *
 * Endpoints (relative to /exec URL):
 *
 *   POST action=list        form body: action, token
 *                            Returns { ok: true, items: [{ email,
 *                            submitted_at }] } when the token's SHA-256
 *                            matches VOLUNTEER_LIST_TOKEN_SHA256_ below, one
 *                            item per distinct, valid address that ticked the
 *                            beta box (the first row winning). The action and
 *                            the token are read only from the POST body
 *                            (form-encoded); anything in the query string is
 *                            ignored, so a token sent in the URL is never
 *                            accepted. A wrong or missing token answers
 *                            { ok: false, error: 'forbidden' }.
 *
 *   GET  ?action=health     Coarse ok/false per dependency, with no tab names,
 *                            counts or error text (details go to the script's
 *                            own logs). Any other GET answers { ok: false,
 *                            error: 'not_found' }.
 *
 * Any other POST action answers { ok: false, error: 'not_found' }.
 */

// ============================================================================
// Form contract: the header texts and the choice this script depends on.
// Keep in step with scripts/volunteer-form.gs (a test compares them).
// ============================================================================

var HEADER_EMAIL_ = 'Email';
var HEADER_TIMESTAMP_ = 'Timestamp';
var HEADER_BETA_ = 'Planner beta (optional)';
var BETA_CHOICE_ = 'Invite me to the planner\'s beta when it opens.';

// Longest token the list action will hash: the real one is 43 characters, so
// anything longer is not it and is not worth hashing.
var MAX_TOKEN_LENGTH_ = 128;

// ============================================================================
// Sheet helpers
// ============================================================================

/** Column index (0-based) of each required header, or null if one is missing. */
function columns_(headers) {
  var wanted = { email: HEADER_EMAIL_, submitted: HEADER_TIMESTAMP_, beta: HEADER_BETA_ };
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
 * The response tab and its columns: the first tab whose header row has all
 * three headers. Found by headers, not by position, because a form's
 * spreadsheet can gain tabs and a first tab is not guaranteed to be the
 * responses. Null when none matches.
 */
function responses_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script is not bound to a spreadsheet.');
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var width = sheets[i].getLastColumn();
    if (width < 1 || sheets[i].getLastRow() < 1) continue;
    var cols = columns_(sheets[i].getRange(1, 1, 1, width).getValues()[0]);
    if (cols) return { sheet: sheets[i], cols: cols };
  }
  return null;
}

/** One column's values below the header row, as a flat array. */
function column_(sh, index, rows) {
  return sh.getRange(2, index + 1, rows, 1).getValues().map(function (r) { return r[0]; });
}

function normalizeEmail_(s) { return String(s || '').toLowerCase().trim(); }

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var h = (b & 0xFF).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

// Compare the fixed-length SHA-256 hex digests without returning at the first
// mismatch.
function sameString_(a, b) {
  var len = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
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

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// Handlers
// ============================================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'health') return handleHealth_();
    return jsonResponse_({ ok: false, error: 'not_found' });
  } catch (err) {
    console.error('[volunteer-list] GET failed: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
}

function doPost(e) {
  try {
    if (formBody_(e).action === 'list') return handleList_(e);
    return jsonResponse_({ ok: false, error: 'not_found' });
  } catch (err) {
    // The message can name sheet internals, so the caller gets a fixed word.
    console.error('[volunteer-list] POST failed: ' + err);
    return jsonResponse_({ ok: false, error: 'error' });
  }
}

// ============================================================================
// List (for the planner's admin tools)
// ============================================================================

// The SHA-256 of the list token, in hex. The token itself lives only in the
// planner server's environment; a hash of a 256-bit random token says nothing
// about it, so it can sit in the source. To rotate: make a new token, put its
// SHA-256 here, redeploy, update the server's environment.
var VOLUNTEER_LIST_TOKEN_SHA256_ = '0c91a7c49e5e54cde64e0497ef98d0f691bdc6db65568a9c6361bf494cd121cf';

function handleList_(e) {
  var given = String(formBody_(e).token || '');
  if (!given || given.length > MAX_TOKEN_LENGTH_ || !sameString_(sha256Hex_(given), VOLUNTEER_LIST_TOKEN_SHA256_)) return jsonResponse_({ ok: false, error: 'forbidden' });
  var found = responses_();
  if (!found) return jsonResponse_({ ok: false, error: 'schema' });
  var rows = found.sheet.getLastRow() - 1;
  if (rows < 1) return jsonResponse_({ ok: true, items: [] });
  var betas = column_(found.sheet, found.cols.beta, rows);
  var emails = column_(found.sheet, found.cols.email, rows);
  var times = column_(found.sheet, found.cols.submitted, rows);
  var seen = {};
  var items = [];
  for (var i = 0; i < rows; i++) {
    // A checkbox answer is stored as its chosen texts joined by commas.
    if (String(betas[i] || '').indexOf(BETA_CHOICE_) < 0) continue;
    var email = normalizeEmail_(emails[i]);
    if (!isValidEmail_(email) || seen[email]) continue;
    seen[email] = true;
    items.push({
      email: email,
      submitted_at: times[i] instanceof Date ? times[i].toISOString() : String(times[i] || ''),
    });
  }
  return jsonResponse_({ ok: true, items: items });
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
      console.error('[volunteer-list] health check ' + name + ' failed: ' + err);
    }
  }

  check('web_app_url', function () {
    if (!ScriptApp.getService().getUrl()) throw new Error('not deployed as a web app');
  });

  check('sheet', function () {
    if (!responses_()) throw new Error('no tab has the required headers');
  });

  return jsonResponse_(report);
}
