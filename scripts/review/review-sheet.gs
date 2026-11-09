/**
 * nidhi volunteer review sheets: the "nidhi review" menu
 * =======================================================
 *
 * Bound to the private volunteer sheet ("nidhi volunteer translators"), in the
 * same Apps Script project as scripts/volunteer-list.gs. The plan is
 * docs/plans/volunteer-review-material.md; the owner's routine is
 * docs/volunteer-agreement.md.
 *
 * Files in the project: this file, review-text.gs (the words volunteers see,
 * per language), Data.js (written by scripts/review/glossary-export.ts: every
 * batch of every language with material, nothing about any volunteer) and
 * volunteer-list.gs. Everything shares one global scope, so names here end
 * in an underscore or start with "review".
 *
 * The owner selects a volunteer's row and picks from the menu:
 *   - Prepare next batch: builds that person's next review copy and its
 *     private master file, makes the copy code and adds it to their Review
 *     copies cell.
 *   - Collect a finished batch: after their "batch done" email, saves what
 *     they submitted into the copy's master, then prepares the next batch.
 *   - What's next?: the one next step for this person.
 *   - Replace the open copy: for a leaked or lost link.
 *   - Show this person's files: every copy and master, with links.
 *   - Forget this person's review records: the last step of a removal.
 * Every action ends with a dialog that lists the owner's next manual steps.
 *
 * What it never does: share a file, send an email, set Status or Last
 * contact, decide anything, or delete a file. Those stay with the owner, as
 * the privacy notice promises. It writes only to the Review copies cell of
 * the selected row, to files it creates, and to its own script properties.
 *
 * Records: one script property per copy code, `review:<code>`, holding the
 * language, batch, state and the ids of the copy and its master. No name or
 * email: only the row's Review copies cell connects a code to a person.
 * States: building, open, collecting, collected, replaced.
 *
 * Every step is written down before the next one starts, so a failure part
 * way through is finished by running the same menu item again: a "building"
 * code is finished by Prepare, a "collecting" one by Collect, and a repeat
 * collection keeps the owner's decisions.
 */

var HEAD_ = { email: 'Email', status: 'Status', copies: 'Review copies', languages: 'Which languages?' };
var CAN_START_ = { Agreed: true, Active: true };
var CODE_ALPHABET_ = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
var GREY_ = '#f1f3f4';
var HEADER_ = '#d2e3fc';
var DECISIONS_ = ['Agreed: draft', 'Agreed: volunteer suggestion', 'Agreed: other wording', 'Keep open'];

/* ------------------------------------------------------------------------
 * Menu
 * ------------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('nidhi review')
    .addItem('Prepare next batch', 'reviewPrepare')
    .addItem('Collect a finished batch', 'reviewCollect')
    .addItem('What\'s next?', 'reviewNext')
    .addSeparator()
    .addItem('Replace the open copy (leaked or lost link)', 'reviewReplace')
    .addItem('Show this person\'s files', 'reviewFiles')
    .addItem('Forget this person\'s review records', 'reviewForget')
    .addToUi();
}

function reviewPrepare() {
  guard_(function () {
    var person = person_();
    if (!CAN_START_[person.status]) {
      return dialog_('Not ready for a batch', [
        p_('Status is "' + esc_(person.status || 'blank') + '". A batch goes only to someone whose Status is Agreed or Active.'),
        steps_(['If they replied "I agree", label the email "Volunteer agreements", set Status to Agreed, then try again.']),
      ]);
    }
    var lang = chooseLanguage_(person);
    if (!lang) return;
    var result = locked_(function () {
      var fresh = samePerson_(person);
      if (!CAN_START_[fresh.status]) throw new Error('Status changed to "' + (fresh.status || 'blank') + '" meanwhile. Nothing built.');
      return prepareFor_(fresh, lang);
    });
    showPrepared_(result);
  });
}

function reviewCollect() {
  guard_(function () {
    var person = person_();
    var rec = openRecord_(person);
    if (!rec) {
      return dialog_('Nothing to collect', [p_('This person has no open batch. A collected batch stays closed: later changes come in the next batch.'), whatNextHtml_(person)]);
    }
    var ui = SpreadsheetApp.getUi();
    var answer = ui.alert(
      'Collect ' + rec.code,
      'Has this person\'s "batch ' + rec.batch + ' done" email arrived on their thread? A filled-in sheet is not a submission until they say so.',
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;
    var out = locked_(function () {
      var fresh = samePerson_(person);
      var now = record_(rec.code);
      if (fresh.codes.indexOf(rec.code) === -1 || !now || (now.state !== 'open' && now.state !== 'collecting')) {
        throw new Error(rec.code + ' changed meanwhile (no longer open, or no longer in this row). Nothing collected.');
      }
      var collected = collectCode_(rec.code);
      var next = null;
      var nextError = '';
      if (CAN_START_[fresh.status]) {
        try { next = prepareFor_(samePerson_(person), rec.lang); } catch (e) { nextError = e.message; }
      }
      return { collected: collected, next: next, nextError: nextError, status: fresh.status };
    });
    showCollected_(out);
  });
}

function reviewNext() {
  guard_(function () {
    var person = person_();
    dialog_('What\'s next', [whatNextHtml_(person)]);
  });
}

function reviewReplace() {
  guard_(function () {
    var person = person_();
    var rec = openRecord_(person) || buildingRecord_(person);
    if (!rec) return dialog_('Nothing to replace', [p_('This person has no open copy.')]);
    var ui = SpreadsheetApp.getUi();
    var answer = ui.alert(
      'Replace ' + rec.code,
      'This marks ' + rec.code + ' as replaced (it will never count as a finished batch) and builds a new copy of batch ' + rec.batch + ' with a new code. Continue?',
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;
    var result = locked_(function () {
      var fresh = samePerson_(person);
      var r = record_(rec.code);
      if (fresh.codes.indexOf(rec.code) === -1 || !r || (r.state !== 'open' && r.state !== 'building')) {
        throw new Error(rec.code + ' changed meanwhile. Nothing replaced.');
      }
      r.state = 'replaced';
      r.replacedAt = new Date().toISOString();
      saveRecord_(r);
      // If building the new copy fails now, Prepare next batch builds it:
      // a replaced batch does not count as sent.
      return prepareFor_(samePerson_(person), rec.lang);
    });
    result.replaced = rec;
    showPrepared_(result);
  });
}

function reviewFiles() {
  guard_(function () {
    var person = person_();
    if (!person.codes.length) return dialog_('No review files', [p_('This person has no copy codes.')]);
    var items = person.codes.map(function (code) {
      var r = record_(code);
      if (!r) return code + ': no record (made by hand, or already forgotten)';
      return code + ', batch ' + r.batch + ', ' + r.state + ': ' +
        (r.copy ? link_(fileUrl_(r.copy), 'review copy') : 'no copy') + ', ' +
        (r.master ? link_(fileUrl_(r.master), 'private master') : 'no master');
    });
    dialog_('Review files for this row', [list_(items, true), p_('A file that was already deleted still has a link here; it opens to an error.')]);
  });
}

function reviewForget() {
  guard_(function () {
    var person = person_();
    if (!person.codes.length) return dialog_('Nothing to forget', [p_('This person has no copy codes.')]);
    var ui = SpreadsheetApp.getUi();
    var answer = ui.alert(
      'Forget ' + person.codes.join(', '),
      'For a removal only. First delete every file under "Show this person\'s files", every Compare sheet that shows them, and their published wording log rows except the permission record. This then deletes the script\'s records for these codes. Continue?',
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;
    locked_(function () {
      person.codes.forEach(function (code) { PropertiesService.getScriptProperties().deleteProperty('review:' + code); });
    });
    dialog_('Records forgotten', [steps_([
      'Delete this person\'s row in the sheet.',
      'Empty the Drive trash (drive.google.com, Bin, Empty bin).',
      'Carry on with the removal list in docs/volunteer-agreement.md.',
    ])]);
  });
}

/* ------------------------------------------------------------------------
 * Who is selected
 * ------------------------------------------------------------------------ */

/** The volunteer in the selected row (or `row`), read fresh from the sheet. */
function person_(row) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var col = {};
  Object.keys(HEAD_).forEach(function (k) {
    var i = headers.indexOf(HEAD_[k]);
    if (i === -1) throw new Error('This tab has no "' + HEAD_[k] + '" column. Open the form responses tab of the volunteer sheet.');
    col[k] = i + 1;
  });
  if (!row) {
    var range = sheet.getActiveRange();
    if (!range || range.getNumRows() !== 1) throw new Error('Select one cell in one volunteer\'s row first.');
    row = range.getRow();
  }
  if (row < 2) throw new Error('Select a volunteer\'s row, not the header.');
  var value = function (k) { return String(sheet.getRange(row, col[k]).getValue()).trim(); };
  var email = value('email');
  if (!email) throw new Error('Row ' + row + ' has no email address.');
  var codesText = value('copies');
  var codes = codesText ? codesText.split(',').map(function (c) { return c.trim(); }).filter(String) : [];
  codes.forEach(function (c) {
    if (!/^[a-z]{2,3}-[A-Z0-9]+-[2-9A-Z]{4}$/.test(c)) throw new Error('"' + c + '" in Review copies is not a copy code. Fix the cell, then try again.');
  });
  return {
    sheet: sheet, row: row, copiesCol: col.copies, email: email, status: value('status'),
    languages: value('languages'), codes: codes,
  };
}

/** The same person, reread inside the lock: same tab, same row, same email. */
function samePerson_(before) {
  var fresh = person_(before.row);
  if (fresh.sheet.getSheetId() !== before.sheet.getSheetId() || fresh.email !== before.email) {
    throw new Error('The selected row changed meanwhile (sorted or edited?). Nothing done; select the person again.');
  }
  return fresh;
}

/** Languages with material that this person ticked, as codes. */
function languagesFor_(person) {
  var found = [];
  var re = /\(([A-Za-z]+)\)/g;
  var m;
  while ((m = re.exec(person.languages))) {
    var code = FORM_LANGUAGES_[m[1]];
    if (code && found.indexOf(code) === -1) found.push(code);
  }
  return found;
}

/** Asks which language when there is more than one; null when there is none. */
function chooseLanguage_(person) {
  var ticked = languagesFor_(person);
  var ready = ticked.filter(function (l) { return REVIEW_DATA.languages[l]; });
  var open = openRecord_(person) || buildingRecord_(person);
  if (open) return open.lang;
  if (!ready.length) {
    var names = ticked.map(function (l) { return text_(l).name; }).join(', ') || 'none we know';
    dialog_('No material yet', [
      p_('This person ticked: ' + esc_(names) + '. None of these has a glossary yet, so there is no batch to send.'),
      steps_(['Ask Claude to start the glossary for their language (docs/i18n/locale-roadmap.md, "Gathering material ahead of an edition").', 'Then export and push the data, and choose Prepare next batch again.']),
    ]);
    return null;
  }
  if (ready.length === 1) return ready[0];
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt('Which language?', 'This person ticked several languages with material: ' + ready.join(', ') + '. Type one of these codes.', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return null;
  var lang = answer.getResponseText().trim().toLowerCase();
  if (ready.indexOf(lang) === -1) throw new Error('"' + lang + '" is not one of ' + ready.join(', ') + '.');
  return lang;
}

/* ------------------------------------------------------------------------
 * Records
 * ------------------------------------------------------------------------ */

function record_(code) {
  var raw = PropertiesService.getScriptProperties().getProperty('review:' + code);
  return raw ? JSON.parse(raw) : null;
}

function saveRecord_(r) {
  PropertiesService.getScriptProperties().setProperty('review:' + r.code, JSON.stringify(r));
}

function recordsOf_(person) {
  return person.codes.map(function (code) {
    var r = record_(code);
    if (!r) throw new Error('Review copies holds "' + code + '", which this menu has no record of (typed by hand, or forgotten). Remove it from the cell or ask Claude.');
    return r;
  });
}

function openRecord_(person) {
  return recordsOf_(person).filter(function (r) { return r.state === 'open' || r.state === 'collecting'; })[0] || null;
}

function buildingRecord_(person) {
  return recordsOf_(person).filter(function (r) { return r.state === 'building'; })[0] || null;
}

function newCode_(lang, batch) {
  for (var tries = 0; tries < 20; tries++) {
    var bytes = Utilities.getUuid().replace(/-/g, '');
    var tag = '';
    for (var i = 0; i < 4; i++) tag += CODE_ALPHABET_[parseInt(bytes.substr(i * 2, 2), 16) % CODE_ALPHABET_.length];
    var code = lang + '-' + batch + '-' + tag;
    if (!record_(code)) return code;
  }
  throw new Error('Could not make a unique copy code.');
}

function fileUrl_(id) {
  return 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
}

/* ------------------------------------------------------------------------
 * Preparing a batch
 * ------------------------------------------------------------------------ */

/**
 * Builds the person's next batch in `lang`, or finishes one whose building
 * was interrupted. Returns { rec, resumed } or { done: true }.
 */
function prepareFor_(person, lang) {
  var data = REVIEW_DATA.languages[lang];
  if (!data) throw new Error('No material for ' + lang + '.');
  if (!CAN_START_[person.status]) throw new Error('Status is "' + (person.status || 'blank') + '", so no batch is built.');
  var building = buildingRecord_(person);
  if (building) return { rec: finishBuilding_(building), resumed: true };
  var open = openRecord_(person);
  if (open) throw new Error('Batch ' + open.batch + ' (' + open.code + ') is still open. Collect it, or replace it, before preparing another.');

  var counted = {};
  recordsOf_(person).forEach(function (r) {
    if (r.lang === lang && r.state !== 'replaced') counted[r.batch] = true;
  });
  var batch = data.batches.filter(function (b) { return !counted[b.id]; })[0];
  if (!batch) return { done: true, lang: lang };

  var rec = {
    code: newCode_(lang, batch.id), lang: lang, batch: batch.id, state: 'building',
    sourceCommit: REVIEW_DATA.sourceCommit, createdAt: new Date().toISOString(),
  };
  rec.spec = specHash_(rec, batch, data);
  saveRecord_(rec);
  // The code goes in the row before any file exists, so an interrupted build
  // is found again from the row and finished, never orphaned. If the row
  // cannot be written, the record goes too.
  try {
    var cell = person.sheet.getRange(person.row, person.copiesCol);
    cell.setNumberFormat('@');
    cell.setValue(person.codes.concat([rec.code]).join(', '));
    SpreadsheetApp.flush();
  } catch (e) {
    PropertiesService.getScriptProperties().deleteProperty('review:' + rec.code);
    throw e;
  }
  return { rec: finishBuilding_(rec), resumed: false };
}

/**
 * Creates and fills the copy and the master. Each file's id is saved the
 * moment the file exists, and filling starts from an empty file every time,
 * so a retry reuses the same files instead of making new ones.
 */
function finishBuilding_(rec) {
  var data = REVIEW_DATA.languages[rec.lang];
  var batch = data && data.batches.filter(function (b) { return b.id === rec.batch; })[0];
  if (!batch || specHash_(rec, batch, data) !== rec.spec) {
    throw new Error('What ' + rec.code + ' would contain changed since it was started (new data or new sheet text). Use "Replace the open copy" to start it again.');
  }
  var layout = layout_(rec.lang, batch, data);
  if (!rec.copy) {
    rec.copy = SpreadsheetApp.create('nidhi review · ' + rec.code).getId();
    saveRecord_(rec);
  }
  if (!rec.copyReady) {
    fillCopy_(SpreadsheetApp.openById(rec.copy), rec, batch, data, layout);
    rec.copyReady = true;
    saveRecord_(rec);
  }
  if (!rec.master) {
    rec.master = SpreadsheetApp.create('nidhi review master · ' + rec.code + ' (private)').getId();
    saveRecord_(rec);
  }
  if (!rec.masterReady) {
    fillMaster_(SpreadsheetApp.openById(rec.master), rec, batch, data, layout);
    rec.masterReady = true;
    saveRecord_(rec);
  }
  rec.state = 'open';
  rec.openedAt = new Date().toISOString();
  saveRecord_(rec);
  return rec;
}

/** A hash of everything a copy shows, so a resumed build matches what was started. */
function specHash_(rec, batch, data) {
  var layout = layout_(rec.lang, batch, data);
  var spec = {
    batch: batch, register: data.register, layout: layout, text: text_(rec.lang), en: SHEET_TEXT_.en,
    header: termsHeader_(rec.lang, layout.published),
  };
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(spec), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes).slice(0, 22);
}

/** Empties a spreadsheet down to one blank tab, removing protections. */
function reset_(ss) {
  // An interrupted run may have left the placeholder behind: reuse it.
  var keep = ss.getSheetByName('_building') || ss.insertSheet('_building');
  keep.clear();
  ss.getSheets().forEach(function (sh) {
    if (sh.getSheetId() !== keep.getSheetId()) {
      sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
      sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { p.remove(); });
      ss.deleteSheet(sh);
    }
  });
  return keep;
}

/** Tab names and dropdown values for a copy, kept in its master so collection never depends on the current packs. */
function layout_(lang, batch, data) {
  var t = text_(lang);
  var en = SHEET_TEXT_.en;
  var both = function (list, enList) { return list.map(function (v, i) { return bi_(v, enList[i]); }); };
  return {
    tabs: {
      start: bi_(t.tabs.start, en.tabs.start),
      progress: bi_(t.tabs.progress, en.tabs.progress),
      register: bi_(t.tabs.register, en.tabs.register),
      terms: batch.id + ' ' + bi_(t.tabs.terms, en.tabs.terms),
    },
    verdicts: both(t.verdicts, en.verdicts),
    tools: both(t.tools, en.tools),
    registerChoices: data.register ? data.register.options.concat([bi_(t.notSure, en.notSure)]) : [],
    published: !!PUBLISHED_[lang],
  };
}

function termsHeader_(lang, published) {
  var t = text_(lang).cols;
  var e = SHEET_TEXT_.en.cols;
  var draft = published ? bi_(t.current, e.current) : bi_(t.draft, e.draft);
  return ['Ref', 'English', bi_(t.meaning, e.meaning), bi_(t.example, e.example), bi_(t.where, e.where), draft,
    bi_(t.alternatives, e.alternatives), bi_(t.notes, e.notes), bi_(t.verdict, e.verdict), bi_(t.suggestion, e.suggestion),
    bi_(t.why, e.why), bi_(t.tool, e.tool)];
}

function fillCopy_(ss, rec, batch, data, layout) {
  var placeholder = reset_(ss);
  var start = ss.insertSheet(layout.tabs.start);
  writeStartHere_(start, rec, batch, data, layout);
  writeProgress_(ss.insertSheet(layout.tabs.progress), rec, batch, layout);
  if (data.register) writeRegister_(ss.insertSheet(layout.tabs.register), rec, data, layout);
  writeTerms_(ss.insertSheet(layout.tabs.terms), rec, batch, layout);
  ss.deleteSheet(placeholder);
  ss.setActiveSheet(start);
}

/** The private master starts with a record of exactly what was sent. */
function fillMaster_(ss, rec, batch, data, layout) {
  var placeholder = reset_(ss);
  var sent = ss.insertSheet('Sent');
  ss.deleteSheet(placeholder);
  var meta = {
    schema: REVIEW_DATA.schema, code: rec.code, lang: rec.lang, batch: batch.id, title: batch.title,
    fingerprint: batch.fingerprint, spec: rec.spec, sourceCommit: rec.sourceCommit, exportedAt: REVIEW_DATA.exportedAt,
    sentAt: new Date().toISOString(), layout: layout,
  };
  writeText_(sent, 1, 1, [['Built ' + meta.sentAt + ': ' + rec.code + ', batch ' + batch.id + ', source ' + meta.sourceCommit + ', spec ' + rec.spec]]);
  writeText_(sent, 2, 1, [[JSON.stringify(meta)]]);
  writeText_(sent, 3, 1, [['Ref', 'English', 'Meaning', 'Example', 'Where', 'Draft', 'Alternatives', 'Notes']]);
  writeText_(sent, 4, 1, batch.terms.map(function (t) { return [t.ref, t.term, t.meaning, t.example, t.where, t.draft, t.alternatives, t.notes]; }));
  if (data.register) writeText_(sent, batch.terms.length + 6, 1, [['Register: ' + JSON.stringify(data.register)]]);
  sent.protect().setDescription('What was sent in ' + rec.code).setWarningOnly(true);
}

function writeStartHere_(sheet, rec, batch, data, layout) {
  var t = text_(rec.lang);
  var en = SHEET_TEXT_.en;
  var fill = function (s) {
    return s.replace('{draft}', layout.published ? bi_(t.cols.current, en.cols.current) : bi_(t.cols.draft, en.cols.draft))
      .replace('{register}', layout.tabs.register).replace('{progress}', layout.tabs.progress).replace('{batch}', batch.id);
  };
  var keys = ['thanks', layout.published ? 'aboutPublished' : 'aboutNew', 'stop'];
  if (data.register) keys.push('register');
  keys = keys.concat(['grey', 'required', 'done', 'share', 'questions', 'age']);
  var rows = keys.map(function (k) { return [fill(t.start[k]), fill(en.start[k])]; });
  rows.push([t.start.code + ': ' + rec.code, en.start.code + ': ' + rec.code]);
  rows.push([t.start.source + ': ' + rec.sourceCommit, en.start.source + ': ' + rec.sourceCommit]);
  header_(writeText_(sheet, 1, 1, [[t.name, 'English']]));
  writeText_(sheet, 2, 1, rows).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 520).setColumnWidth(2, 520);
  sheet.setFrozenRows(1);
  warnOnly_(sheet.getRange(1, 1, rows.length + 1, 2), 'Start here (reference)');
}

function writeProgress_(sheet, rec, batch, layout) {
  var t = text_(rec.lang).cols;
  var e = SHEET_TEXT_.en.cols;
  header_(writeText_(sheet, 1, 1, [[bi_(t.batch, e.batch), bi_(t.title, e.title), bi_(t.required, e.required), bi_(t.notes, e.notes)]]));
  writeText_(sheet, 2, 1, [[batch.id, batch.title, '', '']]);
  sheet.getRange(2, 1, 1, 2).setBackground(GREY_);
  var required = sheet.getRange(2, 3);
  dropdown_(required, layout.tools);
  // Yellow until answered: a batch cannot be collected while it is blank.
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenCellEmpty().setBackground('#fff2cc').setRanges([required]).build(),
  ]);
  required.setBorder(true, true, true, true, false, false, '#e37400', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  warnOnly_(sheet.getRange(1, 1, 2, 2), 'Progress (reference)');
  sheet.setColumnWidth(1, 80).setColumnWidth(2, 260).setColumnWidth(3, 320).setColumnWidth(4, 360);
  sheet.setFrozenRows(1);
}

function writeRegister_(sheet, rec, data, layout) {
  var t = text_(rec.lang);
  var en = SHEET_TEXT_.en;
  writeText_(sheet, 1, 1, [[t.registerIntro, en.registerIntro]]).setWrap(true);
  sheet.getRange(1, 1, 1, 2).setBackground(GREY_);
  var options = data.register.options;
  var head = [bi_(t.cols.context, en.cols.context), 'English'].concat(options).concat([bi_(t.cols.choice, en.cols.choice), bi_(t.cols.why, en.cols.why)]);
  header_(writeText_(sheet, 3, 1, [head]));
  var width = head.length;
  var rows = data.register.rows.map(function (r) { return [r.context, r.english].concat(r.examples).concat(['', '']); });
  var last = [bi_(t.defaultRow, en.defaultRow)];
  while (last.length < width) last.push('');
  rows.push(last);
  writeText_(sheet, 4, 1, rows).setWrap(true).setVerticalAlignment('top');
  var refCols = 2 + options.length;
  sheet.getRange(4, 1, rows.length, refCols).setBackground(GREY_);
  dropdown_(sheet.getRange(4, refCols + 1, rows.length, 1), layout.registerChoices);
  warnOnly_(sheet.getRange(4, 1, rows.length, refCols), 'Register examples (reference)');
  for (var c = 1; c <= width; c++) sheet.setColumnWidth(c, c <= refCols ? 240 : 260);
  sheet.setFrozenRows(3);
}

function writeTerms_(sheet, rec, batch, layout) {
  header_(writeText_(sheet, 1, 1, [termsHeader_(rec.lang, layout.published)]));
  var rows = batch.terms.map(function (t) {
    return [t.ref, t.term, t.meaning, t.example, t.where, t.draft, t.alternatives, t.notes, '', '', '', ''];
  });
  writeText_(sheet, 2, 1, rows).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(2, 1, rows.length, 8).setBackground(GREY_);
  dropdown_(sheet.getRange(2, 9, rows.length, 1), layout.verdicts);
  dropdown_(sheet.getRange(2, 12, rows.length, 1), layout.tools);
  warnOnly_(sheet.getRange(1, 1, rows.length + 1, 8), 'Terms (reference)');
  [90, 130, 220, 260, 150, 160, 160, 260, 190, 200, 220, 180].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
}

/* ------------------------------------------------------------------------
 * Collecting a batch
 * ------------------------------------------------------------------------
 *
 * Two phases, so an interrupted collection never changes the evidence:
 *   1. Capture: every value and formula of the copy's progress, terms and
 *      register tabs, read once and written into the master's "Capture" tab,
 *      one JSON line per row, with a completion line written last. Only then
 *      does the code become "collecting". A retry reuses a complete capture
 *      and never rereads the live copy.
 *   2. From the capture, the master gets "Snapshot" (every cell, formulas as
 *      their text), "Review" (one row per term with verdict, suggestion,
 *      reason, tool and flags, plus the owner's Decision column) and
 *      "Register". New tabs are built under a temporary name and swapped in
 *      only when complete, and decisions already made are carried over.
 * Everything is checked against the master's "Sent" tab, never against the
 * current data. It refuses a batch tool answer that is blank, a formula, or
 * not one of the choices sent. It flags, and never applies: formulas,
 * changed reference cells, unknown verdicts, suggestions without a verdict,
 * and suggestions next to "Fine".
 */
function collectCode_(code) {
  var rec = record_(code);
  if (!rec || (rec.state !== 'open' && rec.state !== 'collecting')) throw new Error(code + ' is not open.');
  var master = openOrFail_(rec.master, 'The private master for ' + code + ' cannot be opened. Use "Replace the open copy".');
  var sentSheet = master.getSheetByName('Sent');
  var meta = JSON.parse(String(sentSheet.getRange(2, 1).getValue()));
  if (meta.code !== code) throw new Error('The master for ' + code + ' records a different code (' + meta.code + ').');
  var layout = meta.layout;
  var n = countSentTerms_(sentSheet);
  var sent = sentSheet.getRange(4, 1, n, 8).getValues().map(function (r) { return r.map(String); });
  var register = null;
  var regCell = String(sentSheet.getRange(n + 6, 1).getValue());
  if (regCell.indexOf('Register: ') === 0) register = JSON.parse(regCell.slice('Register: '.length));

  var cap = readCapture_(master, code);
  if (!cap) {
    var copy = openOrFail_(rec.copy, 'The review copy for ' + code + ' cannot be opened (deleted?). Use "Replace the open copy".');
    cap = capture_(copy, layout, n, register);
    var toolCheck = cap.progress.f[2] ? 'formula' : String(cap.progress.v[2]).trim();
    if (toolCheck === 'formula') throw new Error('The batch tool answer is a formula, not a choice. Nothing collected; ask the volunteer to pick from the list.');
    if (!toolCheck) throw new Error('The batch tool answer ("For this batch I used") is blank. Nothing collected; ask the volunteer to fill it in.');
    if (layout.tools.indexOf(toolCheck) === -1) throw new Error('The batch tool answer "' + toolCheck + '" is not one of the choices. Nothing collected; ask the volunteer to pick from the list.');
    writeCapture_(master, code, cap);
  }
  rec.state = 'collecting';
  saveRecord_(rec);

  var stamp = cap.at;
  var batchTool = String(cap.progress.v[2]).trim();
  var pv = cap.progress.v;
  var pf = cap.progress.f;
  var progressFlags = [];
  if (pf[0] || pf[1] || pf[3]) progressFlags.push('Formula in the Progress tab');
  if (String(pv[0]) !== meta.batch || String(pv[1]) !== meta.title) progressFlags.push('Progress batch or title changed');
  var literal = function (rows) { return rows.map(function (r) { return r.v.map(function (v, j) { return r.f[j] || String(v); }); }); };

  // Owner decisions survive any number of interruptions: they are gathered
  // from every place they may be, written to a new checkpoint tab, and only
  // then are older copies removed. Checkpoints go once Review is swapped in.
  var kept = {};
  // Oldest first, so a newer copy wins, blank or not: clearing a decision
  // in Review is itself a decision. The owner edits only "Review".
  var checkpoints = master.getSheets()
    .filter(function (sh) { return sh.getName().indexOf('Decisions kept ') === 0; })
    .sort(function (a, b) { return Number(a.getName().slice(15).split('-')[0]) - Number(b.getName().slice(15).split('-')[0]) || (a.getName() < b.getName() ? -1 : 1); });
  checkpoints.concat([master.getSheetByName('Review (new)'), master.getSheetByName('Review')]).forEach(function (old) {
    if (old && old.getLastRow() > 1) {
      var isReview = old.getName() === 'Review' || old.getName() === 'Review (new)';
      old.getRange(2, 1, old.getLastRow() - 1, isReview ? 10 : 3).getValues().forEach(function (r) {
        if (r[0]) kept[r[0]] = isReview ? [r[8], r[9]] : [r[1], r[2]];
      });
    }
  });
  var keptRefs = Object.keys(kept);
  if (keptRefs.length) {
    var stampName = 'Decisions kept ' + new Date().getTime();
    var suffix = 0;
    while (master.getSheetByName(stampName + (suffix ? '-' + suffix : ''))) suffix++;
    var checkpoint = master.insertSheet(stampName + (suffix ? '-' + suffix : ''));
    writeText_(checkpoint, 1, 1, [['Ref', 'Decision', 'Owner notes']]);
    writeText_(checkpoint, 2, 1, keptRefs.map(function (ref) { return [ref, kept[ref][0], kept[ref][1]]; }));
    SpreadsheetApp.flush();
    checkpoints.forEach(function (sh) { master.deleteSheet(sh); });
  }

  var snap = newTab_(master, 'Snapshot');
  writeText_(snap, 1, 1, [['Collected ' + stamp + ' from ' + code + ', batch ' + rec.batch + '. Progress row: ' + JSON.stringify(literal([cap.progress])[0]) +
    (progressFlags.length ? '. Flags: ' + progressFlags.join('; ') : '')]]);
  writeText_(snap, 2, 1, [termsHeader_(rec.lang, layout.published)]);
  writeText_(snap, 3, 1, literal(cap.terms));
  if (register) writeText_(snap, n + 5, 1, literal(cap.register));
  swapIn_(master, snap, 'Snapshot');
  snap.protect().setDescription('Snapshot of ' + code + ' at ' + stamp).setWarningOnly(true);

  var head = termsHeader_('en', layout.published);
  var reviewRows = sent.map(function (expected, i) {
    var v = cap.terms[i].v;
    var f = cap.terms[i].f;
    var flags = [];
    for (var c = 0; c < 8; c++) {
      if (f[c]) flags.push('Formula in ' + head[c]);
      else if (String(v[c]) !== expected[c]) flags.push('Reference cell changed: ' + head[c]);
    }
    for (var c2 = 8; c2 < 12; c2++) if (f[c2]) flags.push('Formula in ' + head[c2] + ' (not read)');
    var verdictRaw = f[8] ? '' : String(v[8]);
    var vi = layout.verdicts.indexOf(verdictRaw);
    if (verdictRaw && vi === -1) flags.push('Unknown verdict: ' + verdictRaw);
    var verdict = vi === -1 ? '' : SHEET_TEXT_.en.verdicts[vi];
    var suggestion = f[9] ? '' : String(v[9]);
    var why = f[10] ? '' : String(v[10]);
    var rowTool = f[11] ? '' : String(v[11]);
    if (rowTool && layout.tools.indexOf(rowTool) === -1) flags.push('Unknown tool answer: ' + rowTool);
    var tool = rowTool || (verdict || suggestion ? batchTool + ' (batch)' : '');
    if (!verdict && suggestion) flags.push('Suggestion without a verdict');
    if (vi === 0 && suggestion) flags.push('Suggestion next to "Fine"');
    if (!verdict && !suggestion && !verdictRaw) flags.push('Not reviewed');
    var old = kept[expected[0]] || ['', ''];
    return [expected[0], expected[1], expected[5], verdict, suggestion, why, tool, flags.join('; '), old[0], old[1]];
  });
  var review = newTab_(master, 'Review');
  header_(writeText_(review, 1, 1, [['Ref', 'English', 'Draft', 'Verdict', 'Suggestion', 'Why', 'Tool used', 'Flags', 'Decision', 'Owner notes']]));
  writeText_(review, 2, 1, reviewRows).setWrap(true).setVerticalAlignment('top');
  dropdown_(review.getRange(2, 9, n, 1), DECISIONS_);
  review.setFrozenRows(1);
  [90, 130, 160, 190, 200, 240, 170, 260, 200, 260].forEach(function (w, i) { review.setColumnWidth(i + 1, w); });
  swapIn_(master, review, 'Review');
  master.getSheets().forEach(function (sh) { if (sh.getName().indexOf('Decisions kept ') === 0) master.deleteSheet(sh); });

  var registerFlags = 0;
  if (register) {
    var choiceCol = register.options.length + 2;
    var expectedReg = register.rows.map(function (row) { return [row.context, row.english].concat(row.examples); });
    var regRows = cap.register.map(function (row, i) {
      var r = row.v;
      var f = row.f;
      var flags = [];
      var want = expectedReg[i];
      for (var c = 0; c < choiceCol; c++) {
        if (f[c]) flags.push('Formula in a reference cell');
        else if (want && String(r[c]) !== String(want[c])) flags.push('Reference cell changed');
        else if (!want && c > 0 && String(r[c])) flags.push('Reference cell changed');
      }
      if (f[choiceCol] || f[choiceCol + 1]) flags.push('Formula (not read)');
      var choice = f[choiceCol] ? '' : String(r[choiceCol]);
      if (choice && layout.registerChoices.indexOf(choice) === -1) flags.push('Unknown choice');
      return [String(r[0]), choice, f[choiceCol + 1] ? '' : String(r[choiceCol + 1]), flags.join('; ')];
    });
    if (cap.registerHeader.join('|') !== register.options.join('|')) regRows.push(['(header)', '', '', 'Register options changed']);
    registerFlags = regRows.filter(function (r) { return r[3]; }).length;
    var reg = newTab_(master, 'Register');
    header_(writeText_(reg, 1, 1, [['Context', 'Choice', 'Why', 'Flags']]));
    writeText_(reg, 2, 1, regRows).setWrap(true);
    [260, 200, 360, 200].forEach(function (w, i) { reg.setColumnWidth(i + 1, w); });
    swapIn_(master, reg, 'Register');
  }

  rec.state = 'collected';
  rec.collectedAt = stamp;
  saveRecord_(rec);
  return {
    rec: rec, masterUrl: fileUrl_(rec.master), total: n, progressFlags: progressFlags, registerFlags: registerFlags,
    reviewed: reviewRows.filter(function (r) { return r[3]; }).length,
    flagged: reviewRows.filter(function (r) { return r[7] && r[7] !== 'Not reviewed'; }).length,
  };
}

/** Reads every submitted cell, with formulas, from the live copy. */
function capture_(copy, layout, n, register) {
  var rows = function (range) {
    var v = range.getValues();
    var f = range.getFormulas();
    return v.map(function (r, i) { return { v: r.map(String), f: f[i] }; });
  };
  var cap = {
    at: new Date().toISOString(),
    progress: rows(tab_(copy, layout.tabs.progress).getRange(2, 1, 1, 4))[0],
    terms: rows(tab_(copy, layout.tabs.terms).getRange(2, 1, n, 12)),
    register: [],
    registerHeader: [],
  };
  if (register) {
    var regTab = tab_(copy, layout.tabs.register);
    cap.register = rows(regTab.getRange(4, 1, register.rows.length + 1, register.options.length + 4));
    cap.registerHeader = regTab.getRange(3, 3, 1, register.options.length).getValues()[0].map(String);
  }
  return cap;
}

/** One JSON line per row, the completion line last: a half-written capture is never used. */
function writeCapture_(master, code, cap) {
  var tab = newTab_(master, 'Capture');
  var lines = [['progress ' + JSON.stringify(cap.progress)], ['registerHeader ' + JSON.stringify(cap.registerHeader)]]
    .concat(cap.terms.map(function (r) { return ['term ' + JSON.stringify(r)]; }))
    .concat(cap.register.map(function (r) { return ['register ' + JSON.stringify(r)]; }));
  writeText_(tab, 2, 1, lines);
  // Complete before it gets its real name: readCapture_ accepts a complete
  // "Capture (new)" too, so a stop at any point after this line reuses it.
  writeText_(tab, 1, 1, [['complete ' + JSON.stringify({ code: code, at: cap.at })]]);
  SpreadsheetApp.flush();
  swapIn_(master, tab, 'Capture');
  tab.protect().setDescription('Submission of ' + code + ' as captured').setWarningOnly(true);
}

function readCapture_(master, code) {
  var cap = readCaptureTab_(master.getSheetByName('Capture'), code);
  if (cap) return cap;
  var pending = master.getSheetByName('Capture (new)');
  cap = readCaptureTab_(pending, code);
  if (cap) swapIn_(master, pending, 'Capture');
  return cap;
}

function readCaptureTab_(tab, code) {
  if (!tab || tab.getLastRow() < 2) return null;
  var lines = tab.getRange(1, 1, tab.getLastRow(), 1).getValues().map(function (r) { return String(r[0]); });
  if (lines[0].indexOf('complete ') !== 0) return null;
  var head = JSON.parse(lines[0].slice('complete '.length));
  if (head.code !== code) return null;
  var cap = { at: head.at, progress: null, registerHeader: [], terms: [], register: [] };
  lines.slice(1).forEach(function (l) {
    var sp = l.indexOf(' ');
    var kind = l.slice(0, sp);
    var value = JSON.parse(l.slice(sp + 1));
    if (kind === 'progress') cap.progress = value;
    else if (kind === 'registerHeader') cap.registerHeader = value;
    else if (kind === 'term') cap.terms.push(value);
    else if (kind === 'register') cap.register.push(value);
  });
  return cap;
}

/** A new tab under a temporary name; swapIn_ gives it the real name once complete. */
function newTab_(ss, name) {
  var temp = ss.getSheetByName(name + ' (new)');
  if (temp) {
    temp.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    ss.deleteSheet(temp);
  }
  return ss.insertSheet(name + ' (new)');
}

function swapIn_(ss, tab, name) {
  var old = ss.getSheetByName(name);
  if (old) {
    old.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    ss.deleteSheet(old);
  }
  tab.setName(name);
}

function countSentTerms_(sheet) {
  var col = sheet.getRange(4, 1, sheet.getLastRow() - 3, 1).getValues();
  var n = 0;
  while (n < col.length && /^[A-Z]{2,3}-[A-Z0-9]+-\d{3}$/.test(String(col[n][0]))) n++;
  return n;
}

function tab_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('The copy has no "' + name + '" tab (renamed or deleted?). Nothing collected.');
  return sheet;
}

function openOrFail_(id, message) {
  try { return SpreadsheetApp.openById(id); } catch (e) { throw new Error(message); }
}

/* ------------------------------------------------------------------------
 * Dialogs: what the owner does next
 * ------------------------------------------------------------------------ */

function sendSteps_(rec, firstBatch) {
  var steps = [
    'Open the ' + link_(fileUrl_(rec.copy), 'review copy') + ' and check it looks right.',
    'In the copy: Share, General access, "Anyone with the link", role Editor, Done.',
    'Email the link on this person\'s existing thread, and say "batch ' + rec.batch + '" in the message.',
    'In the volunteer sheet, set Last contact to today.',
  ];
  if (firstBatch) steps.push('Set Status to Active.');
  return steps_(steps);
}

function showPrepared_(result) {
  if (result.done) {
    return dialog_('All batches done', [p_('This person has had every batch there is for ' + esc_(text_(result.lang).name) + '. Nothing was built.'), steps_(['Thank them, and update Last contact.', 'When new batches are added, choose Prepare next batch again.'])]);
  }
  var rec = result.rec;
  var parts = [];
  if (result.replaced) {
    parts.push(p_('Marked ' + esc_(result.replaced.code) + ' as replaced.'));
    parts.push(steps_(['Open the ' + link_(fileUrl_(result.replaced.copy), 'old copy') + ': Share, General access, Restricted.', 'Delete the old copy and its ' + link_(fileUrl_(result.replaced.master), 'master') + ' once nothing in them is needed.']));
  }
  parts.push(p_((result.resumed ? 'Finished building ' : 'Built ') + '<b>' + esc_(rec.code) + '</b> (batch ' + esc_(rec.batch) + ') and added the code to Review copies. Nothing has been shared or sent.'));
  parts.push(sendSteps_(rec, rec.batch === REVIEW_DATA.languages[rec.lang].batches[0].id));
  dialog_('Batch ' + rec.batch + ' is ready to send', parts);
}

function showCollected_(out) {
  var c = out.collected;
  var parts = [p_('Collected <b>' + esc_(c.rec.code) + '</b>: ' + c.reviewed + ' of ' + c.total + ' terms reviewed, ' + c.flagged + ' flagged' + (c.registerFlags ? ', ' + c.registerFlags + ' register rows flagged' : '') + '.' +
    (c.progressFlags.length ? ' Also: ' + esc_(c.progressFlags.join('; ')) + '.' : ''))];
  parts.push(steps_(['Fill in the Decision column in the ' + link_(c.masterUrl, 'private master') + ' (Review tab). Look at the flagged rows first.']));
  if (out.next && out.next.rec) {
    var hold = c.flagged || c.progressFlags.length || c.registerFlags ? ' The flags may need a reply first: if they do, hold this batch until that is sorted.' : '';
    parts.push(p_('The next batch is built: <b>' + esc_(out.next.rec.code) + '</b> (batch ' + esc_(out.next.rec.batch) + ').' + hold));
    parts.push(sendSteps_(out.next.rec, false));
  } else if (out.next && out.next.done) {
    parts.push(p_('That was their last batch: there is nothing left to build.'));
  } else if (out.nextError) {
    parts.push(p_('The collection is saved, but the next batch could not be built: ' + esc_(out.nextError) + ' Choose Prepare next batch to try again.'));
  } else {
    parts.push(p_('No next batch: Status is "' + esc_(out.status || 'blank') + '", so nothing new goes out.'));
  }
  dialog_('Batch collected', parts);
}

/** The one next step for this person, as HTML. */
function whatNextHtml_(person) {
  if (person.status === 'Paused') return p_('Paused: no new batches. If they send a finished batch anyway, you can still collect it.') + openLine_(person);
  if (!CAN_START_[person.status]) return p_('Status is "' + esc_(person.status || 'blank') + '". Batches start once they have replied "I agree" and Status is Agreed.');
  var building = buildingRecord_(person);
  if (building) return p_('Building ' + esc_(building.code) + ' did not finish. Choose Prepare next batch to finish it.');
  var open = openRecord_(person);
  if (open) {
    return p_('Batch ' + esc_(open.batch) + ' (' + esc_(open.code) + ') is open. If you have not sent it yet:') + sendSteps_(open, false) +
      p_('Once their "batch ' + esc_(open.batch) + ' done" email arrives, choose Collect a finished batch.');
  }
  var records = recordsOf_(person);
  var last = records.filter(function (r) { return r.state === 'collected'; }).pop();
  if (last) {
    var blank = undecided_(last);
    if (blank) return p_(blank + ' rows of ' + esc_(last.code) + ' have no decision yet: fill them in the ' + link_(fileUrl_(last.master), 'private master') + '.') + p_('Then, if no batch is open, choose Prepare next batch.');
  }
  if (!person.codes.length) return p_('No batch yet. Choose Prepare next batch to build their first one.');
  return p_('Nothing is open and every decision is made. Choose Prepare next batch; it tells you if there is nothing left.');
}

function openLine_(person) {
  var open = openRecord_(person);
  return open ? p_('Open batch: ' + esc_(open.code) + '.') : '';
}

function undecided_(rec) {
  try {
    var review = SpreadsheetApp.openById(rec.master).getSheetByName('Review');
    if (!review || review.getLastRow() < 2) return 0;
    return review.getRange(2, 9, review.getLastRow() - 1, 1).getValues().filter(function (r) { return !String(r[0]); }).length;
  } catch (e) {
    return 0;
  }
}

/* ------------------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------------------ */

/** Runs a menu action and shows any error in a dialog instead of a toast. */
function guard_(fn) {
  try {
    fn();
  } catch (e) {
    dialog_('Stopped', [p_(esc_(e.message)), p_('Part of this may already be done. Choose What\'s next? to see where things stand: Prepare next batch finishes an interrupted build or replacement, and Collect a finished batch finishes an interrupted collection.')]);
  }
}

/** One action at a time, so a double click cannot build two copies. Prompts happen before this, never inside. */
function locked_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Another review action is still running. Wait a moment and try again.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function dialog_(title, parts) {
  var html = '<div style="font:14px/1.5 Arial,sans-serif;color:#202124">' + parts.join('') +
    '<p style="margin-top:18px"><button onclick="google.script.host.close()" style="padding:6px 16px">Close</button></p></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(420), title);
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function p_(html) { return '<p>' + html + '</p>'; }

function link_(url, label) { return '<a href="' + esc_(url) + '" target="_blank">' + esc_(label) + '</a>'; }

function steps_(items) { return list_(items, false, true); }

function list_(items, raw, ordered) {
  var tag = ordered ? 'ol' : 'ul';
  return '<' + tag + '>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + tag + '>';
}

/** Writes rows as plain text, so no value is ever read as a formula. */
function writeText_(sheet, row, col, values) {
  var range = sheet.getRange(row, col, values.length, values[0].length);
  range.setNumberFormat('@');
  // Sheets reads any value starting with "=" as a formula, whatever the
  // format. A leading apostrophe keeps it as text and is not part of the value.
  range.setValues(values.map(function (r) {
    return r.map(function (v) { var t = String(v); return t.charAt(0) === '=' ? '\'' + t : t; });
  }));
  return range;
}

function header_(range) {
  range.setFontWeight('bold').setBackground(HEADER_).setVerticalAlignment('middle').setWrap(true);
}

function dropdown_(range, values) {
  range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build());
}

function warnOnly_(range, description) {
  range.protect().setDescription(description).setWarningOnly(true);
}
