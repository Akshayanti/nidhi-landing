/**
 * nidhi volunteer review sheets: Google Apps Script
 * ==================================================
 *
 * Builds one volunteer's glossary review sheet from the data that
 * scripts/review/glossary-export.ts writes (Data.js, `REVIEW_DATA`). The plan
 * this follows is docs/plans/volunteer-review-material.md (sections 1, 2 and
 * 10).
 *
 * A standalone script in the hello@nidhi.today account, pushed with clasp
 * into a folder that holds only this file (as Code.js), Data.js and
 * appsscript.json. The owner runs `buildGlossarySheet` from the script editor
 * (Run); Google asks the owner once to allow the script to create sheets in
 * their Drive.
 *
 * What it does, and what it does not:
 *   - Creates a new spreadsheet in the owner's Drive. It never shares it:
 *     sharing a copy with a volunteer ("anyone with the link can edit") is a
 *     separate, deliberate step the owner takes by hand.
 *   - Writes every cell as plain text (number format "@"), so nothing a
 *     volunteer or the data contains is read as a formula.
 *   - Marks the reference columns (grey) with warning-only protection: an
 *     edit there asks for confirmation. That is an accident warning, not a
 *     lock: the collection compares those cells with the private manifest.
 *   - Gives the volunteer's columns dropdowns that reject other input, so a
 *     verdict is always one of the listed answers and a blank means "not
 *     reviewed yet".
 *   - Holds no names, email addresses or agreement details of any volunteer.
 */

/** Answers for a term. Stable strings: the collection reads them back. */
var VERDICTS_ = [
  'Sudah tepat (Fine)',
  'Ada pilihan lebih baik (Better option)',
  'Salah (Wrong)',
  'Tidak yakin (Not sure)',
];
var TOOLS_ = ['Tidak ada (None)', 'AI', 'Alat terjemahan (Translation tool)', 'Keduanya (Both)'];
var REGISTER_ = ['Anda', 'kamu', 'Tanpa kata ganti (No pronoun)', 'Tidak yakin (Not sure)'];

var GREY_ = '#f1f3f4';
var HEADER_ = '#d2e3fc';

/** Builds the sheet and logs its address. */
function buildGlossarySheet() {
  var d = REVIEW_DATA;
  // One sheet per copy code: running this again by mistake must not make a
  // second copy (it did once, from the editor's default Run choice).
  var props = PropertiesService.getScriptProperties();
  var builtKey = 'built:' + d.lang + ':' + d.batch.id + ':' + d.copyId;
  var existing = props.getProperty(builtKey);
  if (existing) throw new Error('A sheet for ' + d.copyId + ', batch ' + d.batch.id + ' already exists: ' + existing + '. Nothing created.');
  var ss = SpreadsheetApp.create('nidhi glossary review · ' + d.lang + ' · ' + d.batch.id + ' · ' + d.copyId);

  var start = ss.getSheets()[0];
  start.setName('Mulai di sini (Start here)');
  writeStartHere_(start, d);

  writeProgress_(ss.insertSheet('Progres (Progress)'), d);
  writeRegister_(ss.insertSheet('Sapaan (Register)'), d);
  writeTerms_(ss.insertSheet(d.batch.id + ' Istilah (Terms)'), d);

  ss.setActiveSheet(start);
  props.setProperty(builtKey, ss.getUrl());
  Logger.log('Created: ' + ss.getUrl());
  return ss.getUrl();
}

/** Writes rows as plain text, so no value is ever read as a formula. */
function writeText_(sheet, row, col, values) {
  var range = sheet.getRange(row, col, values.length, values[0].length);
  range.setNumberFormat('@');
  range.setValues(values);
  return range;
}

function header_(range) {
  range.setFontWeight('bold').setBackground(HEADER_).setVerticalAlignment('middle').setWrap(true);
}

function dropdown_(range, values) {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build()
  );
}

function warnOnly_(range, description) {
  range.protect().setDescription(description).setWarningOnly(true);
}

function writeStartHere_(sheet, d) {
  var rows = [
    ['Terima kasih sudah membantu nidhi.', 'Thank you for helping nidhi.'],
    [
      'Lembar ini berisi istilah keuangan yang akan dipakai situs nidhi dalam bahasa Indonesia. Usulan di kolom "Usulan (draf AI)" adalah draf dari AI, bukan keputusan.',
      'This sheet holds the money terms the nidhi site would use in Indonesian. The suggestions in the "Usulan (draf AI)" column are AI drafts, not decisions.',
    ],
    [
      'Belum ada edisi bahasa Indonesia dan belum ada tanggalnya. Anda boleh berhenti kapan saja; baris yang belum diisi biarkan kosong.',
      'There is no Indonesian edition yet and no date for one. You can stop at any time; leave rows you have not reviewed empty.',
    ],
    ['Satu batch memerlukan sekitar 30 sampai 60 menit.', 'A batch takes about 30 to 60 minutes.'],
    [
      'Mulailah dari tab "Sapaan": cara situs menyapa pembaca. Lalu buka tab istilah.',
      'Start with the "Sapaan" tab: how the site addresses the reader. Then open the terms tab.',
    ],
    [
      'Kolom abu-abu adalah bahan rujukan; mohon jangan diubah. Isi kolom putih: Penilaian, Usulan Anda, Alasan, dan Alat yang dipakai. Usulan dan alasan boleh dikosongkan.',
      'Grey columns are reference; please do not change them. Fill in the white columns: verdict, your suggestion, reason and tool used. Suggestion and reason are optional.',
    ],
    [
      'Wajib: di tab "Progres", pilih apakah Anda memakai AI atau alat terjemahan untuk batch ini (sel kuning). Batch tidak bisa dikirim tanpa jawaban ini. Jika berbeda untuk baris tertentu, pilih juga di baris itu.',
      'Required: in the "Progres" tab, say whether you used AI or a translation tool for this batch (the yellow cell). A batch cannot be sent without this answer. If a row differs, say so on that row too.',
    ],
    [
      'Setelah selesai, balas email kami dengan "batch ' + d.batch.id + ' selesai". Mohon jangan mengubah batch setelah email itu; perubahan berikutnya masuk ke batch berikutnya atau email baru.',
      'When you are done, reply to our email with "batch ' + d.batch.id + ' done". Please do not change the batch after that email; later changes go in the next batch or a new email.',
    ],
    [
      'Jangan bagikan tautan lembar ini: siapa pun yang punya tautan bisa membuka dan mengubahnya.',
      'Please do not share this sheet\'s link: anyone who has it can open and change it.',
    ],
    [
      'Ada pertanyaan? Tulis ke hello@nidhi.today. Biasanya dibalas dalam satu hari.',
      'Questions? Write to hello@nidhi.today. A reply usually comes within a day.',
    ],
    ['Kesepakatan sukarelawan berlaku untuk usia 18 tahun ke atas.', 'The volunteer agreement is for people aged 18 or over.'],
    ['Kode salinan: ' + d.copyId, 'Copy code: ' + d.copyId],
    ['Sumber: ' + d.sourceCommit + ', ' + d.exportedAt.slice(0, 10), 'Source: ' + d.sourceCommit + ', ' + d.exportedAt.slice(0, 10)],
  ];
  header_(writeText_(sheet, 1, 1, [['Bahasa Indonesia', 'English']]));
  writeText_(sheet, 2, 1, rows).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 520).setColumnWidth(2, 520);
  sheet.setFrozenRows(1);
  warnOnly_(sheet.getRange(1, 1, rows.length + 1, 2), 'Start here (reference)');
}

function writeProgress_(sheet, d) {
  header_(
    writeText_(sheet, 1, 1, [
      ['Batch', 'Judul (Title)', 'Wajib: untuk batch ini saya memakai (Required: for this batch I used)', 'Catatan (Notes)'],
    ])
  );
  writeText_(sheet, 2, 1, [[d.batch.id, d.batch.title, '', '']]);
  sheet.getRange(2, 1, 1, 2).setBackground(GREY_);
  dropdown_(sheet.getRange(2, 3), TOOLS_);
  // Yellow until answered: a batch cannot be collected while it is blank.
  var required = sheet.getRange(2, 3);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenCellEmpty().setBackground('#fff2cc').setRanges([required]).build(),
  ]);
  required.setBorder(true, true, true, true, false, false, '#e37400', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  warnOnly_(sheet.getRange(1, 1, 2, 2), 'Progress (reference)');
  sheet.setColumnWidth(1, 80).setColumnWidth(2, 260).setColumnWidth(3, 300).setColumnWidth(4, 360);
  sheet.setFrozenRows(1);
}

function writeRegister_(sheet, d) {
  var intro = [
    [
      'Situs harus memilih cara menyapa pembaca. Pilih yang paling cocok untuk setiap konteks, lalu pilih bawaan untuk seluruh situs. Boleh berbeda per konteks.',
      'The site has to choose how to address the reader. Pick what fits each context best, then a default for the whole site. It may differ by context.',
    ],
  ];
  writeText_(sheet, 1, 1, intro).setWrap(true);
  sheet.getRange(1, 1, 1, 2).setBackground(GREY_);

  var head = [['Konteks (Context)', 'English', 'Anda', 'kamu', 'Tanpa kata ganti (No pronoun)', 'Pilihan Anda (Your choice)', 'Alasan (Why)']];
  header_(writeText_(sheet, 3, 1, head));
  var rows = d.register.map(function (r) {
    return [r.context, r.english, r.anda, r.kamu, r.none, '', ''];
  });
  rows.push(['Bawaan untuk seluruh situs (Default for the whole site)', '', '', '', '', '', '']);
  writeText_(sheet, 4, 1, rows).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(4, 1, rows.length, 5).setBackground(GREY_);
  dropdown_(sheet.getRange(4, 6, rows.length, 1), REGISTER_);
  warnOnly_(sheet.getRange(4, 1, rows.length, 5), 'Register examples (reference)');
  [200, 260, 260, 260, 260, 190, 300].forEach(function (w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
  sheet.setFrozenRows(3);
}

function writeTerms_(sheet, d) {
  var head = [[
    'Ref',
    'English',
    'Arti (Meaning)',
    'Contoh di situs (Example on the site)',
    'Di mana (Where)',
    'Usulan (draf AI)',
    'Alternatif',
    'Catatan (Notes)',
    'Penilaian (Verdict)',
    'Usulan Anda (Your suggestion)',
    'Alasan (Why)',
    'Alat yang dipakai (Tool used)',
  ]];
  header_(writeText_(sheet, 1, 1, head));
  var rows = d.terms.map(function (t) {
    return [t.ref, t.term, t.meaning, t.example, t.where, t.draft, t.alternatives, t.notes, '', '', '', ''];
  });
  writeText_(sheet, 2, 1, rows).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(2, 1, rows.length, 8).setBackground(GREY_);
  dropdown_(sheet.getRange(2, 9, rows.length, 1), VERDICTS_);
  dropdown_(sheet.getRange(2, 12, rows.length, 1), TOOLS_);
  warnOnly_(sheet.getRange(1, 1, rows.length + 1, 8), 'Terms (reference)');
  [90, 130, 220, 260, 150, 160, 160, 260, 190, 200, 220, 180].forEach(function (w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
}

/* ------------------------------------------------------------------------
 * Collection
 * ------------------------------------------------------------------------
 *
 * `collectGlossarySheet` reads one volunteer's submitted copy (its address in
 * COLLECT_URL, set in Config.js, which is pushed only when collecting and
 * never committed) and writes, in the owner's private master file for that
 * copy (one file per copy, so that removing someone deletes whole files and
 * their version history, never rows inside a shared file):
 *
 *   - "Snapshot <copy>": the copy's terms and register tabs exactly as they
 *     stood when collected, protected. Later steps work from this, not from
 *     the live copy, so what was submitted is kept even if the copy changes.
 *   - "Review <copy>": one row per term with the verdict, suggestion, reason,
 *     tool used (the row's own answer, or the batch's), and flags, plus an
 *     empty Decision column for the owner.
 *   - "Register <copy>": the register answers.
 *
 * It refuses to collect a batch whose "For this batch I used" answer is
 * blank (a blank never means None), or a copy whose copy code does not match
 * the data it was built from. It flags, and never applies:
 *   - a volunteer cell that holds a formula (read through getFormulas, so a
 *     computed result is never mistaken for typed text);
 *   - a reference cell (grey) that differs from what was exported;
 *   - a suggestion without a verdict, or a suggestion next to "Fine".
 * Running it again for the same copy replaces that copy's tabs, so a repeat
 * run gives the same result. The master's id is kept in the script's
 * properties, so the master is found again without any Drive access.
 */

var DECISIONS_ = [
  'Agreed: draft',
  'Agreed: volunteer suggestion',
  'Agreed: other wording',
  'Keep open',
];

function collectGlossarySheet() {
  var d = REVIEW_DATA;
  var copy = SpreadsheetApp.openByUrl(COLLECT_URL);

  var codeCell = copy.getSheetByName('Mulai di sini (Start here)').getRange('A1:B30').getValues()
    .map(function (r) { return r[1]; })
    .filter(function (v) { return String(v).indexOf('Copy code: ') === 0; })[0];
  var copyId = codeCell ? String(codeCell).slice('Copy code: '.length).trim() : '';
  if (copyId !== d.copyId) throw new Error('Copy code "' + copyId + '" does not match the data (' + d.copyId + '). Nothing collected.');

  var progress = copy.getSheetByName('Progres (Progress)').getRange(2, 1, 1, 4).getValues()[0];
  var batchTool = String(progress[2]).trim();
  if (!batchTool) throw new Error('The batch tool answer ("For this batch I used") is blank. Nothing collected; ask the volunteer to fill it in.');

  var termsSheet = copy.getSheetByName(d.batch.id + ' Istilah (Terms)');
  var n = d.terms.length;
  var values = termsSheet.getRange(2, 1, n, 12).getValues();
  var formulas = termsSheet.getRange(2, 1, n, 12).getFormulas();

  var regSheet = copy.getSheetByName('Sapaan (Register)');
  var regCount = d.register.length + 1;
  var regValues = regSheet.getRange(4, 1, regCount, 7).getValues();
  var regFormulas = regSheet.getRange(4, 1, regCount, 7).getFormulas();

  var master = masterSpreadsheet_(d);
  var stamp = new Date().toISOString();

  // Snapshot: the values as they stand now, kept as plain text.
  var snap = replaceSheet_(master, 'Snapshot ' + d.copyId);
  writeText_(snap, 1, 1, [['Collected ' + stamp + ' from copy ' + d.copyId + ', batch ' + d.batch.id + ', source ' + d.sourceCommit + '. Batch tool: ' + batchTool, '', '', '', '', '', '', '', '', '', '', '']]);
  writeText_(snap, 2, 1, [termsHeaderPlain_()]);
  writeText_(snap, 3, 1, values.map(function (r) { return r.map(String); }));
  writeText_(snap, n + 5, 1, regValues.map(function (r) { return r.map(String); }));
  snap.protect().setDescription('Snapshot of ' + d.copyId + ' at ' + stamp).setWarningOnly(true);

  // Review rows.
  var reviewRows = d.terms.map(function (t, i) {
    var v = values[i];
    var f = formulas[i];
    var flags = [];
    var expected = [t.ref, t.term, t.meaning, t.example, t.where, t.draft, t.alternatives, t.notes];
    for (var c = 0; c < 8; c++) {
      if (String(v[c]) !== String(expected[c])) flags.push('Reference cell changed: ' + termsHeaderPlain_()[c]);
    }
    for (var c2 = 8; c2 < 12; c2++) {
      if (f[c2]) flags.push('Formula in ' + termsHeaderPlain_()[c2] + ' (not read)');
    }
    var verdict = f[8] ? '' : String(v[8]);
    var suggestion = f[9] ? '' : String(v[9]);
    var why = f[10] ? '' : String(v[10]);
    var rowTool = f[11] ? '' : String(v[11]);
    var tool = rowTool || (verdict || suggestion ? batchTool + ' (batch)' : '');
    if (!verdict && suggestion) flags.push('Suggestion without a verdict');
    if (verdict.indexOf('Sudah tepat') === 0 && suggestion) flags.push('Suggestion next to "Fine"');
    if (!verdict && !suggestion) flags.push('Not reviewed');
    return [t.ref, t.term, t.draft, verdict, suggestion, why, tool, flags.join('; '), '', ''];
  });
  var review = replaceSheet_(master, 'Review ' + d.copyId);
  header_(writeText_(review, 1, 1, [['Ref', 'English', 'Draft', 'Verdict', 'Suggestion', 'Why', 'Tool used', 'Flags', 'Decision', 'Owner notes']]));
  writeText_(review, 2, 1, reviewRows).setWrap(true).setVerticalAlignment('top');
  dropdown_(review.getRange(2, 9, n, 1), DECISIONS_);
  review.setFrozenRows(1);
  [90, 130, 160, 190, 200, 240, 170, 260, 200, 260].forEach(function (w, i) { review.setColumnWidth(i + 1, w); });

  // Register answers.
  var reg = replaceSheet_(master, 'Register ' + d.copyId);
  var regRows = regValues.map(function (r, i) {
    var flags = regFormulas[i][5] || regFormulas[i][6] ? 'Formula (not read)' : '';
    return [String(r[0]), regFormulas[i][5] ? '' : String(r[5]), regFormulas[i][6] ? '' : String(r[6]), flags];
  });
  header_(writeText_(reg, 1, 1, [['Context', 'Choice', 'Why', 'Flags']]));
  writeText_(reg, 2, 1, regRows).setWrap(true);
  [260, 200, 360, 200].forEach(function (w, i) { reg.setColumnWidth(i + 1, w); });

  var flagged = reviewRows.filter(function (r) { return r[7] && r[7] !== 'Not reviewed'; }).length;
  var reviewed = reviewRows.filter(function (r) { return r[3]; }).length;
  Logger.log('Collected ' + d.copyId + ': ' + reviewed + ' of ' + n + ' terms reviewed, ' + flagged + ' flagged. Master: ' + master.getUrl());
  return master.getUrl();
}

function termsHeaderPlain_() {
  return ['Ref', 'English', 'Meaning', 'Example', 'Where', 'Draft', 'Alternatives', 'Notes', 'Verdict', 'Suggestion', 'Why', 'Tool used'];
}

/** The owner's private master for this copy; created once. */
function masterSpreadsheet_(d) {
  var props = PropertiesService.getScriptProperties();
  var key = 'master:' + d.lang + ':' + d.batch.id + ':' + d.copyId;
  var id = props.getProperty(key);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted: make a new one */ }
  }
  var ss = SpreadsheetApp.create('nidhi glossary master · ' + d.lang + ' · ' + d.batch.id + ' · ' + d.copyId + ' (private)');
  props.setProperty(key, ss.getId());
  return ss;
}

/** A fresh, empty tab with this name, replacing an older one from a previous run. */
function replaceSheet_(ss, name) {
  var old = ss.getSheetByName(name);
  if (old) {
    old.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    ss.deleteSheet(old);
  }
  var sheet = ss.insertSheet(name);
  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return sheet;
}
