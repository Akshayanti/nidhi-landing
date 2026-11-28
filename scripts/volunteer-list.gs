/**
 * Nidhi volunteer beta-interest list: Google Apps Script Web App
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
 * not their position, so a reordered sheet keeps working; a missing header,
 * or a second tab with the same headers, answers { ok: false, error:
 * 'schema' } rather than guessing. waitlist.gs counts the same volunteers
 * with the same code (the "Volunteer form contract" block below).
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

// Which source this is: a hash of this file, written by `npm run gs:version`
// and checked by a test. The health answer reports it, so the deployed
// script can be compared with main (docs/operations.md, #443).
var VERSION = '3d30f0fe63d8';

// Longest token the list action will hash: the real one is 43 characters, so
// anything longer is not it and is not worth hashing.
var MAX_TOKEN_LENGTH_ = 128;

// ============================================================================
// Volunteer form contract: begin
// The same text in waitlist.gs (its count) and volunteer-list.gs (the
// planner's invite list), so the number the site shows and the list the
// planner reads come from one definition of "which tab" and "ticked the beta
// box". scripts/apps-script-shared.test.mjs fails when the copies differ, and
// compares the two scripts' answers on the same rows. The header texts and
// the choice follow scripts/volunteer-form.gs (a test compares them).
// ============================================================================

var VOLUNTEER_HEADER_EMAIL_ = 'Email';
var VOLUNTEER_HEADER_TIMESTAMP_ = 'Timestamp';
var VOLUNTEER_HEADER_BETA_ = 'Planner beta (optional)';
var VOLUNTEER_BETA_CHOICE_ = 'Invite me to the planner\'s beta when it opens.';

/** Column index (0-based) of each required header, or null if one is missing. */
function volunteerColumns_(headers) {
  var wanted = { email: VOLUNTEER_HEADER_EMAIL_, submitted: VOLUNTEER_HEADER_TIMESTAMP_, beta: VOLUNTEER_HEADER_BETA_ };
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
 * The response tab and its columns: the one tab whose header row has all
 * three headers. Found by headers, not position, because a form's
 * spreadsheet can gain tabs. Null when no tab matches, and null when more
 * than one does: an archived copy of the responses would otherwise supply
 * old answers, and guessing between them could make the count and the list
 * disagree. Either case is logged.
 */
function volunteerResponses_(ss) {
  var sheets = ss.getSheets();
  var found = null;
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var width = sh.getLastColumn();
    if (width < 1 || sh.getLastRow() < 1) continue;
    var cols = volunteerColumns_(sh.getRange(1, 1, 1, width).getValues()[0]);
    if (!cols) continue;
    if (found) {
      console.error('[volunteers] more than one tab has the response headers: refusing to guess');
      return null;
    }
    found = { sheet: sh, cols: cols };
  }
  if (!found) console.error('[volunteers] no tab has the response headers');
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

/**
 * The volunteers who ticked the beta box, in row order, as { email,
 * submitted_at }: one per distinct, valid address, the first row winning.
 * Null when the response tab cannot be told (see volunteerResponses_).
 */
function betaVolunteers_(ss) {
  var found = volunteerResponses_(ss);
  if (!found) return null;
  var rows = found.sheet.getLastRow() - 1;
  if (rows < 1) return [];
  function column(index) {
    return found.sheet.getRange(2, index + 1, rows, 1).getValues().map(function (r) { return r[0]; });
  }
  var betas = column(found.cols.beta);
  var emails = column(found.cols.email);
  var times = column(found.cols.submitted);
  var seen = {};
  var out = [];
  for (var i = 0; i < rows; i++) {
    if (!hasChoice_(betas[i], VOLUNTEER_BETA_CHOICE_)) continue;
    var email = normalizeEmail_(emails[i]);
    if (!isValidEmail_(email) || seen[email]) continue;
    seen[email] = true;
    out.push({
      email: email,
      submitted_at: times[i] instanceof Date ? times[i].toISOString() : String(times[i] || ''),
    });
  }
  return out;
}

// ============================================================================
// Volunteer form contract: end
// ============================================================================

// ============================================================================
// Shared helpers: begin
// The same text in newsletter.gs, waitlist.gs and volunteer-list.gs. Each
// file is pasted into its own Apps Script project, so they cannot share a
// file: scripts/apps-script-shared.test.mjs fails when the copies differ.
// Change all three together, then run `npm run gs:version`.
// ============================================================================

function normalizeEmail_(s) { return String(s || '').toLowerCase().trim(); }

// An address is written into a spreadsheet cell, where a value that starts
// with = + - or @ is read as a formula, so an address may not start with one
// (very few do). It also may not hold white space, double quotes, brackets or
// the marks that separate addresses in a list. Letters of any script, and an
// apostrophe (o'brien@...), are fine.
function isValidEmail_(s) {
  s = String(s || '');
  return s.length <= 254 && /^[^\s@=+\-"()<>,;:\\\[\]][^\s@"()<>,;:\\\[\]]*@[^\s@'"()<>,;:\\\[\]=+]+\.[^\s@'"()<>,;:\\\[\]=+]+$/.test(s) && !/[\r\n]/.test(s);
}

/** The SHA-256 of the text's UTF-8 bytes, as 64 lowercase hex characters. */
function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  // Apps Script gives signed bytes (-128..127); & 0xFF makes them unsigned.
  return bytes.map(function (b) { var h = (b & 0xFF).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

/**
 * Whether two strings are equal, comparing every character rather than
 * returning at the first difference, so the time taken says nothing about
 * how much of a secret was right. Used for digests, tokens and signatures.
 */
function sameString_(a, b) {
  a = String(a);
  b = String(b);
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

// ============================================================================
// Shared helpers: end
// ============================================================================

// ============================================================================
// Response helper
// ============================================================================

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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script is not bound to a spreadsheet.');
  var items = betaVolunteers_(ss);
  if (!items) return jsonResponse_({ ok: false, error: 'schema' });
  return jsonResponse_({ ok: true, items: items });
}

// ============================================================================
// Health check
// ============================================================================

function handleHealth_() {
  var report = { ok: true, version: VERSION, checks: {} };

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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss || !volunteerResponses_(ss)) throw new Error('no single tab has the required headers');
  });

  return jsonResponse_(report);
}
