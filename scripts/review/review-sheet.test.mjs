/**
 * scripts/review/review-sheet.gs is the "nidhi review" menu of the private
 * volunteer sheet. It runs in Google's Apps Script runtime, so the test loads
 * it (with review-text.gs, as the project does) into a Node VM with a small
 * in-memory fake of Sheets, the script properties, the lock and the dialogs.
 *
 * What is checked: the rows it writes into a review copy and its private
 * master, what it keeps about a copy, what it reads back from a volunteer,
 * and that it shares nothing with anyone. The fake has no way to share a
 * file, send an email or delete a file, and no Drive, mail or fetch service
 * exists in the VM: a call to any of them would throw.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync('scripts/review/review-text.gs', 'utf8') + '\n' + fs.readFileSync('scripts/review/review-sheet.gs', 'utf8');
const EMAIL = 'volunteer@example.invalid';

/* ------------------------------------------------------------------------
 * A fake of Sheets, as strict as the real one where a mistake would show
 * ------------------------------------------------------------------------ */

function fakeProtection(list, type) {
  const p = {
    type, description: '', warningOnly: false,
    setDescription(d) { p.description = d; return p; },
    setWarningOnly(w) { p.warningOnly = w; return p; },
    remove() { list.splice(list.indexOf(p), 1); },
  };
  list.push(p);
  return p;
}

function fakeSheet(name, id) {
  const cells = new Map();
  const key = (r, c) => `${r},${c}`;
  const sheet = {
    name, protections: [], dropdowns: [], failWrites: false, selected: null,
    getName: () => sheet.name,
    setName(n) { sheet.name = n; return sheet; },
    getSheetId: () => id,
    getLastRow: () => Math.max(0, ...[...cells.keys()].map((k) => Number(k.split(',')[0]))),
    getLastColumn: () => Math.max(0, ...[...cells.keys()].map((k) => Number(k.split(',')[1]))),
    clear() { cells.clear(); return sheet; },
    setColumnWidth: () => sheet,
    setFrozenRows() {},
    setFrozenColumns() {},
    setConditionalFormatRules() {},
    protect: () => fakeProtection(sheet.protections, 'SHEET'),
    getProtections: (type) => sheet.protections.filter((p) => p.type === type),
    getActiveRange: () => sheet.selected,
    getRange(row, col, numRows = 1, numCols = 1) {
      if (!(row >= 1 && col >= 1 && numRows >= 1 && numCols >= 1)) throw new Error(`bad range ${row},${col},${numRows},${numCols}`);
      const each = (fn) => {
        const out = [];
        for (let r = 0; r < numRows; r++) { out.push([]); for (let c = 0; c < numCols; c++) out[r].push(fn(row + r, col + c, r, c)); }
        return out;
      };
      const write = (r, c, value) => {
        if (sheet.failWrites) throw new Error('the sheet cannot be written');
        const text = String(value);
        if (text === '') cells.delete(key(r, c));
        // As Sheets does: "=" starts a formula, a leading apostrophe makes text of anything.
        else if (text[0] === '=') cells.set(key(r, c), { v: '#N/A', f: text });
        else cells.set(key(r, c), { v: text[0] === "'" ? text.slice(1) : text, f: '' });
      };
      const range = {
        getRow: () => row,
        getNumRows: () => numRows,
        getValues: () => each((r, c) => cells.get(key(r, c))?.v ?? ''),
        getFormulas: () => each((r, c) => cells.get(key(r, c))?.f ?? ''),
        getValue: () => cells.get(key(row, col))?.v ?? '',
        setValue(v) { write(row, col, v); return range; },
        setValues(values) {
          if (values.length !== numRows || values.some((r) => r.length !== numCols)) throw new Error('the data does not match the range');
          each((r, c, i, j) => write(r, c, values[i][j]));
          return range;
        },
        setDataValidation(rule) { sheet.dropdowns.push({ row, col, numRows, numCols, values: rule.values }); return range; },
        protect: () => fakeProtection(sheet.protections, 'RANGE'),
      };
      for (const m of ['setNumberFormat', 'setWrap', 'setVerticalAlignment', 'setBackground', 'setFontWeight', 'setBorder']) range[m] = () => range;
      return range;
    },
  };
  return sheet;
}

function fakeSpreadsheet(id, name) {
  let nextTab = 1;
  const ss = {
    id, name, tabs: [],
    getId: () => id,
    getSheets: () => ss.tabs.slice(),
    getSheetByName: (n) => ss.tabs.find((t) => t.name === n) ?? null,
    insertSheet(n) {
      if (ss.getSheetByName(n)) throw new Error(`a tab named "${n}" already exists`);
      const tab = fakeSheet(n, nextTab++);
      ss.tabs.push(tab);
      return tab;
    },
    deleteSheet(tab) {
      if (ss.tabs.length === 1) throw new Error('a spreadsheet keeps at least one tab');
      ss.tabs.splice(ss.tabs.indexOf(tab), 1);
    },
    setActiveSheet() {},
  };
  ss.insertSheet('Sheet1');
  return ss;
}

/* ------------------------------------------------------------------------
 * The data a batch is built from (Data.js in the project)
 * ------------------------------------------------------------------------ */

const term = (lang, batch, n, word, draft) => ({
  ref: `${lang.toUpperCase()}-${batch}-00${n}`, term: word, meaning: `What ${word} means`, example: `A sentence with ${word}.`,
  where: 'Home page', draft, alternatives: `other ${draft}`, notes: `note on ${word}`,
});

function reviewData() {
  return {
    schema: 2,
    sourceCommit: 'abc1234',
    exportedAt: '2026-11-01T00:00:00.000Z',
    languages: {
      // Indonesian: not published yet, with a register question and two batches.
      id: {
        lang: 'id',
        register: {
          options: ['Anda', 'kamu'],
          rows: [{ context: 'A tool label', english: 'Enter your amount', examples: ['Masukkan jumlah Anda', 'Masukkan jumlahmu'] }],
        },
        batches: [
          { id: 'G1', title: 'Everyday money', fingerprint: 'f-g1', terms: [term('id', 'G1', 1, 'budget', 'anggaran'), term('id', 'G1', 2, 'savings', 'tabungan'), term('id', 'G1', 3, 'loan', '=SUM(1)')] },
          { id: 'G2', title: 'Investing', fingerprint: 'f-g2', terms: [term('id', 'G2', 1, 'share', 'saham')] },
        ],
      },
      // Spanish: published, no register question, one batch.
      es: { lang: 'es', register: null, batches: [{ id: 'G1', title: 'Everyday money', fingerprint: 'f-es', terms: [term('es', 'G1', 1, 'budget', 'presupuesto')] }] },
    },
  };
}

/* ------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------ */

const HEADERS = ['Timestamp', 'Email', 'Which languages?', 'Status', 'Last contact', 'Review copies'];
const COPIES_COL = HEADERS.indexOf('Review copies') + 1;

/**
 * One volunteer in row 2 of the volunteer sheet, selected. `answers` are the
 * owner's answers to the yes or no questions, in order; with none left the
 * answer is No, so nothing is confirmed by accident.
 */
function load({ status = 'Agreed', languages = 'Bahasa Indonesia (Indonesian), not open yet', copies = '', answers = [], typed = [] } = {}) {
  const props = new Map();
  const files = new Map();
  const world = { props, files, dialogs: [], alerts: [], prompts: [], answers: [...answers], typed: [...typed], uuids: [], lockFree: true, onLock: null, failCreateAt: 0, created: 0, menu: [] };
  const volunteers = fakeSheet('Form responses 1', 99);
  volunteers.getRange(1, 1, 2, HEADERS.length).setValues([HEADERS, ['2026-11-01', EMAIL, languages, status, '2026-11-02', copies]]);
  volunteers.selected = volunteers.getRange(2, 3);
  world.volunteers = volunteers;

  const ui = {
    ButtonSet: { YES_NO: 'YES_NO', OK_CANCEL: 'OK_CANCEL' },
    Button: { YES: 'YES', NO: 'NO', OK: 'OK', CANCEL: 'CANCEL' },
    alert(title, text) { world.alerts.push({ title, text }); return world.answers.shift() ?? 'NO'; },
    prompt(title, text) {
      world.prompts.push({ title, text });
      const reply = world.typed.shift();
      return { getSelectedButton: () => (reply === undefined ? 'CANCEL' : 'OK'), getResponseText: () => reply ?? '' };
    },
    showModalDialog(output, title) { world.dialogs.push({ title, html: output.html }); },
    createMenu(name) {
      const menu = { name, items: [] };
      const builder = {
        addItem(label, fn) { menu.items.push([label, fn]); return builder; },
        addSeparator: () => builder,
        addToUi() { world.menu.push(menu); },
      };
      return builder;
    },
  };

  const ctx = {
    REVIEW_DATA: reviewData(),
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
      BorderStyle: { SOLID_MEDIUM: 'SOLID_MEDIUM' },
      getUi: () => ui,
      getActiveSheet: () => volunteers,
      flush() {},
      create(name) {
        world.created += 1;
        if (world.created === world.failCreateAt) throw new Error('Service Spreadsheets failed');
        const ss = fakeSpreadsheet(`file-${files.size + 1}`, name);
        files.set(ss.id, ss);
        return ss;
      },
      openById(id) {
        if (!files.has(id)) throw new Error('no such file');
        return files.get(id);
      },
      newDataValidation() {
        const rule = {};
        const builder = {
          requireValueInList(values) { rule.values = Array.from(values); return builder; },
          setAllowInvalid: () => builder,
          build: () => rule,
        };
        return builder;
      },
      newConditionalFormatRule() {
        const builder = { whenCellEmpty: () => builder, setBackground: () => builder, setRanges: () => builder, build: () => ({}) };
        return builder;
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) ?? null,
        setProperty: (k, v) => { props.set(k, String(v)); },
        deleteProperty: (k) => { props.delete(k); },
      }),
    },
    LockService: {
      getDocumentLock: () => ({
        tryLock() { if (world.lockFree && world.onLock) world.onLock(); return world.lockFree; },
        releaseLock() {},
      }),
    },
    HtmlService: {
      createHtmlOutput(html) { const out = { html, setWidth: () => out, setHeight: () => out }; return out; },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString('base64'),
      getUuid: () => world.uuids.shift() ?? crypto.randomUUID(),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SOURCE, ctx);
  world.ctx = ctx;
  return world;
}

/** Everything a tab holds, as rows of text, each row cut after its last filled cell. */
function rowsOf(tab) {
  if (!tab.getLastRow()) return [];
  return tab.getRange(1, 1, tab.getLastRow(), tab.getLastColumn()).getValues().map((row) => {
    const cut = row.slice();
    while (cut.length && cut.at(-1) === '') cut.pop();
    return cut;
  });
}
const copiesCell = (w) => w.volunteers.getRange(2, COPIES_COL).getValue();
const codesOf = (w) => copiesCell(w).split(', ').filter(Boolean);
const recordOf = (w, code) => JSON.parse(w.props.get(`review:${code}`));
const lastDialog = (w) => w.dialogs.at(-1);
/** The choices of the dropdown that covers a cell, as the volunteer sees them. */
function choicesAt(tab, row, col) {
  const d = tab.dropdowns.find((x) => row >= x.row && row < x.row + x.numRows && col >= x.col && col < x.col + x.numCols);
  assert.ok(d, `no dropdown at ${row},${col} of ${tab.name}`);
  return d.values;
}

/** Builds the first Indonesian batch and returns its code, record and files. */
function prepared(options) {
  const w = load(options);
  w.ctx.reviewPrepare();
  const code = codesOf(w).at(-1);
  const rec = recordOf(w, code);
  return { w, code, rec, copy: w.files.get(rec.copy), master: w.files.get(rec.master) };
}

/** The tabs of an Indonesian copy, by what they are. */
const tabsOf = (copy) => ({
  start: copy.getSheetByName('Mulai di sini (Start here)'),
  progress: copy.getSheetByName('Progres (Progress)'),
  register: copy.getSheetByName('Sapaan (Register)'),
  terms: copy.tabs.find((t) => / Istilah \(Terms\)$/.test(t.name)),
});

/** Fills in the copy as a volunteer would: the batch tool answer, then verdicts. */
function volunteerFills(copy, { tool = 1, rows = [] } = {}) {
  const { progress, terms } = tabsOf(copy);
  if (tool !== null) progress.getRange(2, 3).setValue(choicesAt(progress, 2, 3)[tool]);
  rows.forEach((cols, i) => {
    for (const [col, value] of Object.entries(cols)) terms.getRange(i + 2, Number(col)).setValue(value);
  });
  return terms;
}

const VERDICT = 9;
const SUGGESTION = 10;
const WHY = 11;
const TOOL = 12;

/* ------------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------------ */

describe('review-sheet.gs: the menu', () => {
  it('adds one menu whose every item runs a function that exists', () => {
    const w = load();
    w.ctx.onOpen();
    assert.equal(w.menu.length, 1);
    assert.equal(w.menu[0].name, 'nidhi review');
    assert.deepEqual(w.menu[0].items.map((i) => i[1]), ['reviewPrepare', 'reviewCollect', 'reviewNext', 'reviewReplace', 'reviewFiles', 'reviewForget']);
    for (const [, fn] of w.menu[0].items) assert.equal(typeof w.ctx[fn], 'function', fn);
  });
});

describe('review-sheet.gs: preparing a batch', () => {
  it('builds a review copy and a private master, and nothing else', () => {
    const { w, code } = prepared();
    assert.deepEqual([...w.files.values()].map((f) => f.name), [`nidhi review · ${code}`, `nidhi review master · ${code} (private)`]);
  });

  it('makes a copy code of language, batch and four characters that cannot be misread', () => {
    const { code } = prepared();
    assert.match(code, /^id-G1-[2-9A-HJKMNP-Z]{4}$/);
  });

  it('writes only the Review copies cell of the row: Status and Last contact stay the owner\'s', () => {
    const { w, code } = prepared();
    assert.deepEqual(rowsOf(w.volunteers), [HEADERS, ['2026-11-01', EMAIL, 'Bahasa Indonesia (Indonesian), not open yet', 'Agreed', '2026-11-02', code]]);
  });

  it('keeps a record with the language, batch, state and file ids, and nothing about the person', () => {
    const { w, code, rec } = prepared();
    assert.deepEqual([...w.props.keys()], [`review:${code}`]);
    assert.deepEqual(
      { code: rec.code, lang: rec.lang, batch: rec.batch, state: rec.state, sourceCommit: rec.sourceCommit },
      { code, lang: 'id', batch: 'G1', state: 'open', sourceCommit: 'abc1234' },
    );
    assert.deepEqual(Object.keys(rec).sort(), ['batch', 'code', 'copy', 'copyReady', 'createdAt', 'lang', 'master', 'masterReady', 'openedAt', 'sourceCommit', 'spec', 'state']);
    for (const value of w.props.values()) assert.equal(/example\.invalid|volunteer/.test(value), false);
  });

  it('gives the copy a start tab, a progress tab, a register tab and the batch\'s terms tab, in two languages', () => {
    const { copy } = prepared();
    assert.deepEqual(copy.tabs.map((t) => t.name), ['Mulai di sini (Start here)', 'Progres (Progress)', 'Sapaan (Register)', 'G1 Istilah (Terms)']);
  });

  it('writes one terms row per term: eight reference cells from the data, four blank cells to fill in', () => {
    const { copy } = prepared();
    const rows = rowsOf(tabsOf(copy).terms);
    assert.deepEqual(rows[0], [
      'Ref', 'English', 'Arti (Meaning)', 'Contoh di situs (Example on the site)', 'Di mana (Where)', 'Draf AI (AI draft)',
      'Alternatif (Alternatives)', 'Catatan (Notes)', 'Penilaian (Verdict)', 'Usulan Anda (Your suggestion)', 'Alasan (Why)', 'Alat yang dipakai (Tool used)',
    ]);
    assert.equal(rows.length, 4);
    assert.deepEqual(rows[1], ['ID-G1-001', 'budget', 'What budget means', 'A sentence with budget.', 'Home page', 'anggaran', 'other anggaran', 'note on budget']);
    assert.deepEqual(rows.slice(1).map((r) => r[0]), ['ID-G1-001', 'ID-G1-002', 'ID-G1-003']);
    assert.deepEqual(tabsOf(copy).terms.getRange(2, 9, 3, 4).getValues().flat(), Array(12).fill(''));
  });

  it('offers the verdicts and the tool answers as dropdowns, the language\'s word with the English after it', () => {
    const { copy } = prepared();
    const { terms, progress } = tabsOf(copy);
    assert.deepEqual(choicesAt(terms, 4, VERDICT), ['Sudah tepat (Fine)', 'Ada pilihan lebih baik (Better option)', 'Salah (Wrong)', 'Tidak yakin (Not sure)']);
    assert.deepEqual(choicesAt(terms, 2, TOOL), ['Tidak ada (None)', 'AI', 'Alat terjemahan (Translation tool)', 'Keduanya (Both)']);
    assert.deepEqual(choicesAt(progress, 2, 3), choicesAt(terms, 2, TOOL));
  });

  it('writes the progress row with the batch and its title, and leaves the tool answer blank', () => {
    const { copy } = prepared();
    const rows = rowsOf(tabsOf(copy).progress);
    assert.deepEqual(rows[0], ['Batch', 'Judul (Title)', 'Wajib: untuk batch ini saya memakai (Required: for this batch I used)', 'Catatan (Notes)']);
    assert.deepEqual(rows[1], ['G1', 'Everyday money']);
  });

  it('writes the register tab: each context with its examples, then a row for the site\'s default', () => {
    const { copy } = prepared();
    const { register } = tabsOf(copy);
    const rows = rowsOf(register);
    assert.deepEqual(rows[2], ['Konteks (Context)', 'English', 'Anda', 'kamu', 'Pilihan Anda (Your choice)', 'Alasan (Why)']);
    assert.deepEqual(rows[3].slice(0, 4), ['A tool label', 'Enter your amount', 'Masukkan jumlah Anda', 'Masukkan jumlahmu']);
    assert.equal(rows[4][0], 'Bawaan untuk seluruh situs (Default for the whole site)');
    assert.deepEqual(choicesAt(register, 5, 5), ['Anda', 'kamu', 'Tidak yakin (Not sure)']);
  });

  it('fills in the start tab\'s placeholders and ends it with the copy code and the source', () => {
    const { copy, code } = prepared();
    const rows = rowsOf(tabsOf(copy).start);
    assert.deepEqual(rows[0], ['Bahasa Indonesia', 'English']);
    for (const row of rows) for (const cell of row) assert.doesNotMatch(cell, /\{[a-z]+\}/);
    const english = rows.map((r) => r[1]).join('\n');
    assert.match(english, /The "Draf AI \(AI draft\)" column is an AI draft, not a decision/);
    assert.match(english, /reply to our email with "batch G1 done"/);
    assert.match(english, /Start with the "Sapaan \(Register\)" tab/);
    assert.deepEqual(rows.slice(-2), [[`Kode salinan: ${code}`, `Copy code: ${code}`], ['Sumber: abc1234', 'Source: abc1234']]);
  });

  it('never lets a value become a formula, in the copy or in the master', () => {
    // The third term's draft is "=SUM(1)".
    const { copy, master } = prepared();
    assert.equal(tabsOf(copy).terms.getRange(4, 6).getValue(), '=SUM(1)');
    for (const file of [copy, master]) {
      for (const tab of file.tabs) {
        const formulas = tab.getLastRow() ? tab.getRange(1, 1, tab.getLastRow(), tab.getLastColumn()).getFormulas().flat().filter(Boolean) : [];
        assert.deepEqual(formulas, [], `${file.name}, ${tab.name}`);
      }
    }
  });

  it('records in the master exactly what was sent', () => {
    const { master, code, rec } = prepared();
    assert.deepEqual(master.tabs.map((t) => t.name), ['Sent']);
    const rows = rowsOf(master.getSheetByName('Sent'));
    const meta = JSON.parse(rows[1][0]);
    assert.deepEqual(
      { schema: meta.schema, code: meta.code, lang: meta.lang, batch: meta.batch, title: meta.title, fingerprint: meta.fingerprint, spec: meta.spec, sourceCommit: meta.sourceCommit, exportedAt: meta.exportedAt },
      { schema: 2, code, lang: 'id', batch: 'G1', title: 'Everyday money', fingerprint: 'f-g1', spec: rec.spec, sourceCommit: 'abc1234', exportedAt: '2026-11-01T00:00:00.000Z' },
    );
    assert.deepEqual(rows[2], ['Ref', 'English', 'Meaning', 'Example', 'Where', 'Draft', 'Alternatives', 'Notes']);
    assert.deepEqual(rows[3], ['ID-G1-001', 'budget', 'What budget means', 'A sentence with budget.', 'Home page', 'anggaran', 'other anggaran', 'note on budget']);
    assert.equal(rows[5][5], '=SUM(1)');
    assert.deepEqual(JSON.parse(rows[8][0].replace(/^Register: /, '')), reviewData().languages.id.register);
    assert.equal(JSON.stringify(rows).includes(EMAIL), false);
  });

  it('protects with a warning only: no protection names anyone as an editor', () => {
    const { copy, master } = prepared();
    const protections = [...copy.tabs, ...master.tabs].flatMap((t) => t.protections);
    assert.ok(protections.length >= 5);
    for (const p of protections) assert.equal(p.warningOnly, true, p.description);
  });

  it('tells the owner nothing was shared or sent, and lists the steps that are theirs, Status to Active for a first batch', () => {
    const { w, code, rec } = prepared();
    const { title, html } = lastDialog(w);
    assert.equal(title, 'Batch G1 is ready to send');
    assert.match(html, new RegExp(`Built <b>${code}</b> \\(batch G1\\) and added the code to Review copies\\. Nothing has been shared or sent\\.`));
    assert.match(html, new RegExp(`https://docs\\.google\\.com/spreadsheets/d/${rec.copy}/edit`));
    assert.match(html, /Anyone with the link/);
    assert.match(html, /Set Status to Active\./);
  });

  it('calls the draft column the current wording for a language the site already publishes, and adds no register tab without a question', () => {
    const w = load({ languages: 'Español (Spanish)' });
    w.ctx.reviewPrepare();
    const rec = recordOf(w, copiesCell(w));
    assert.match(rec.code, /^es-G1-/);
    const copy = w.files.get(rec.copy);
    assert.deepEqual(copy.tabs.map((t) => t.name), ['Empieza aquí (Start here)', 'Progreso (Progress)', 'G1 Términos (Terms)']);
    assert.equal(rowsOf(copy.tabs[2])[0][5], 'Texto actual (Current wording)');
    assert.equal(rowsOf(w.files.get(rec.master).getSheetByName('Sent')).some((r) => /^Register: /.test(r[0])), false);
  });
});

describe('review-sheet.gs: when no batch is built', () => {
  const nothingBuilt = (w) => {
    assert.equal(w.files.size, 0);
    assert.equal(w.props.size, 0);
    assert.equal(copiesCell(w), '');
  };

  it('builds nothing unless Status is Agreed or Active', () => {
    for (const status of ['', 'New', 'Paused', 'agreed']) {
      const w = load({ status });
      w.ctx.reviewPrepare();
      assert.equal(lastDialog(w).title, 'Not ready for a batch', status);
      nothingBuilt(w);
    }
    for (const status of ['Agreed', 'Active']) assert.equal(prepared({ status }).w.files.size, 2, status);
  });

  it('says so when none of the person\'s languages has material yet', () => {
    const w = load({ languages: 'Français (French), not open yet' });
    w.ctx.reviewPrepare();
    assert.equal(lastDialog(w).title, 'No material yet');
    assert.match(lastDialog(w).html, /This person ticked: Français\./);
    nothingBuilt(w);
  });

  it('asks which language when several have material, and builds the one typed', () => {
    const both = 'Español (Spanish), Bahasa Indonesia (Indonesian), not open yet';
    const w = load({ languages: both, typed: [' ES '] });
    w.ctx.reviewPrepare();
    assert.match(w.prompts[0].text, /es, id/);
    assert.match(copiesCell(w), /^es-G1-/);

    const cancelled = load({ languages: both });
    cancelled.ctx.reviewPrepare();
    nothingBuilt(cancelled);
    assert.equal(cancelled.dialogs.length, 0);

    const wrong = load({ languages: both, typed: ['fr'] });
    wrong.ctx.reviewPrepare();
    assert.equal(lastDialog(wrong).title, 'Stopped');
    assert.match(lastDialog(wrong).html, /&quot;fr&quot; is not one of es, id\./);
    nothingBuilt(wrong);
  });

  it('stops on the header row, on several selected rows and on a row with no email', () => {
    const header = load();
    header.volunteers.selected = header.volunteers.getRange(1, 1);
    header.ctx.reviewPrepare();
    assert.match(lastDialog(header).html, /Select a volunteer's row, not the header\./);

    const several = load();
    several.volunteers.selected = several.volunteers.getRange(1, 1, 2, 1);
    several.ctx.reviewPrepare();
    assert.match(lastDialog(several).html, /Select one cell in one volunteer's row first\./);

    const noEmail = load();
    noEmail.volunteers.getRange(2, 2).setValue('');
    noEmail.ctx.reviewPrepare();
    assert.match(lastDialog(noEmail).html, /Row 2 has no email address\./);
    for (const w of [header, several, noEmail]) nothingBuilt(w);
  });

  it('stops on a tab that is not the form responses tab', () => {
    const w = load();
    w.volunteers.getRange(1, COPIES_COL).setValue('Something else');
    w.ctx.reviewPrepare();
    assert.match(lastDialog(w).html, /This tab has no &quot;Review copies&quot; column/);
    assert.equal(w.files.size, 0);
  });

  it('stops on a Review copies cell that holds something other than copy codes, or a code it has no record of', () => {
    const typed = load({ copies: 'see my notes' });
    typed.ctx.reviewPrepare();
    assert.match(lastDialog(typed).html, /&quot;see my notes&quot; in Review copies is not a copy code/);

    const unknown = load({ copies: 'id-G1-ABCD' });
    unknown.ctx.reviewPrepare();
    assert.match(lastDialog(unknown).html, /Review copies holds &quot;id-G1-ABCD&quot;, which this menu has no record of/);
    for (const w of [typed, unknown]) { assert.equal(w.files.size, 0); assert.equal(w.props.size, 0); }
  });

  it('does not build a second batch while one is open', () => {
    const { w, code } = prepared();
    w.ctx.reviewPrepare();
    assert.equal(lastDialog(w).title, 'Stopped');
    assert.match(lastDialog(w).html, new RegExp(`Batch G1 \\(${code}\\) is still open\\.`));
    assert.equal(w.files.size, 2);
    assert.equal(copiesCell(w), code);
  });

  it('builds nothing while another action holds the lock', () => {
    const w = load();
    w.lockFree = false;
    w.ctx.reviewPrepare();
    assert.match(lastDialog(w).html, /Another review action is still running/);
    nothingBuilt(w);
  });

  it('builds nothing when the row changed between the click and the lock', () => {
    const moved = load();
    moved.onLock = () => moved.volunteers.getRange(2, 2).setValue('someone-else@example.invalid');
    moved.ctx.reviewPrepare();
    assert.match(lastDialog(moved).html, /The selected row changed meanwhile/);
    nothingBuilt(moved);

    const paused = load();
    paused.onLock = () => paused.volunteers.getRange(2, 4).setValue('Paused');
    paused.ctx.reviewPrepare();
    assert.match(lastDialog(paused).html, /Status changed to &quot;Paused&quot; meanwhile\. Nothing built\./);
    nothingBuilt(paused);
  });

  it('drops the record again when the code cannot be written into the row', () => {
    const w = load();
    w.onLock = () => { w.volunteers.failWrites = true; };
    w.ctx.reviewPrepare();
    assert.equal(lastDialog(w).title, 'Stopped');
    assert.equal(w.props.size, 0);
    assert.equal(w.files.size, 0);
  });

  it('tries again for a code that is already taken, and gives up after twenty', () => {
    // Every pair of hex digits "00" picks the alphabet's first character.
    const zeros = '00000000-0000-0000-0000-000000000000';
    const w = load();
    w.props.set('review:id-G1-2222', JSON.stringify({ code: 'id-G1-2222', lang: 'es', batch: 'G1', state: 'replaced' }));
    w.uuids = [zeros, '01020304-0000-0000-0000-000000000000'];
    assert.equal(w.ctx.newCode_('id', 'G1'), 'id-G1-3456');
    w.uuids = Array(20).fill(zeros);
    assert.throws(() => w.ctx.newCode_('id', 'G1'), /Could not make a unique copy code/);
    assert.equal(w.uuids.length, 0);
  });
});

describe('review-sheet.gs: an interrupted build', () => {
  it('is found again from the row and finished with the same code and the same files', () => {
    const w = load();
    w.failCreateAt = 2; // the copy is made, the master is not
    w.ctx.reviewPrepare();
    assert.equal(lastDialog(w).title, 'Stopped');
    const code = copiesCell(w);
    assert.match(code, /^id-G1-/);
    const half = recordOf(w, code);
    assert.equal(half.state, 'building');
    assert.equal(half.copyReady, true);
    assert.equal(half.master, undefined);
    assert.equal(w.files.size, 1);

    w.ctx.reviewNext();
    assert.match(lastDialog(w).html, new RegExp(`Building ${code} did not finish\\. Choose Prepare next batch to finish it\\.`));

    w.ctx.reviewPrepare();
    assert.match(lastDialog(w).html, new RegExp(`Finished building <b>${code}</b>`));
    assert.equal(copiesCell(w), code);
    const rec = recordOf(w, code);
    assert.equal(rec.state, 'open');
    assert.equal(rec.copy, half.copy);
    assert.equal(w.files.size, 2);
    assert.equal(w.props.size, 1);
  });

  it('is not finished with different contents: new data since it was started means starting again', () => {
    const w = load();
    w.failCreateAt = 2;
    w.ctx.reviewPrepare();
    const code = copiesCell(w);
    w.ctx.REVIEW_DATA.languages.id.batches[0].terms[0].draft = 'anggaran belanja';
    w.ctx.reviewPrepare();
    assert.match(lastDialog(w).html, new RegExp(`What ${code} would contain changed since it was started`));
    assert.equal(recordOf(w, code).state, 'building');
    assert.equal(w.files.size, 1);
  });
});

describe('review-sheet.gs: collecting a finished batch', () => {
  /** A first batch, filled in and collected. Status Paused keeps the next batch from being built. */
  function collected({ fill = {}, status = 'Paused', before = () => {} } = {}) {
    const p = prepared();
    p.terms = volunteerFills(p.copy, fill);
    before(p);
    p.w.volunteers.getRange(2, 4).setValue(status);
    p.w.answers.push('YES');
    p.w.ctx.reviewCollect();
    return p;
  }
  const verdicts = ['Sudah tepat (Fine)', 'Ada pilihan lebih baik (Better option)', 'Salah (Wrong)', 'Tidak yakin (Not sure)'];
  const reviewRows = (master) => rowsOf(master.getSheetByName('Review')).map((r) => Array.from({ length: 10 }, (_, i) => r[i] ?? ''));

  it('asks first whether the "batch done" email has arrived, and does nothing on No', () => {
    const { w, copy, master, code } = prepared();
    volunteerFills(copy);
    w.ctx.reviewCollect();
    assert.equal(w.alerts[0].title, `Collect ${code}`);
    assert.match(w.alerts[0].text, /"batch G1 done" email/);
    assert.deepEqual(master.tabs.map((t) => t.name), ['Sent']);
    assert.equal(recordOf(w, code).state, 'open');
  });

  it('writes one Review row per term in English: verdict, suggestion, reason, tool, flags, and two cells for the owner', () => {
    const { master } = collected({
      fill: { rows: [
        { [VERDICT]: verdicts[0] },
        { [VERDICT]: verdicts[1], [SUGGESTION]: 'simpanan', [WHY]: 'more common', [TOOL]: 'Tidak ada (None)' },
      ] },
    });
    assert.deepEqual(reviewRows(master), [
      ['Ref', 'English', 'Draft', 'Verdict', 'Suggestion', 'Why', 'Tool used', 'Flags', 'Decision', 'Owner notes'],
      // No tool on the row: the batch's answer stands in, and says so.
      ['ID-G1-001', 'budget', 'anggaran', 'Fine', '', '', 'AI (batch)', '', '', ''],
      ['ID-G1-002', 'savings', 'tabungan', 'Better option', 'simpanan', 'more common', 'Tidak ada (None)', '', '', ''],
      ['ID-G1-003', 'loan', '=SUM(1)', '', '', '', '', 'Not reviewed', '', ''],
    ]);
    assert.deepEqual(choicesAt(master.getSheetByName('Review'), 2, 9), ['Agreed: draft', 'Agreed: volunteer suggestion', 'Agreed: other wording', 'Keep open']);
  });

  it('keeps the submission as captured, a snapshot of every cell, and the register answers', () => {
    const { master, code } = collected({
      fill: { rows: [{ [VERDICT]: verdicts[2], [SUGGESTION]: 'x' }] },
      before: ({ copy }) => {
        const { register } = tabsOf(copy);
        register.getRange(4, 5, 1, 2).setValues([['kamu', 'friendlier']]);
        register.getRange(5, 5).setValue('Tidak yakin (Not sure)');
      },
    });
    assert.deepEqual(master.tabs.map((t) => t.name), ['Sent', 'Capture', 'Snapshot', 'Review', 'Register']);

    const capture = rowsOf(master.getSheetByName('Capture')).map((r) => r[0]);
    assert.equal(JSON.parse(capture[0].replace(/^complete /, '')).code, code);
    assert.deepEqual(capture.slice(1).map((l) => l.split(' ')[0]), ['progress', 'registerHeader', 'term', 'term', 'term', 'register', 'register']);

    const snapshot = rowsOf(master.getSheetByName('Snapshot'));
    assert.match(snapshot[0][0], new RegExp(`from ${code}, batch G1\\. Progress row: \\["G1","Everyday money","AI",""\\]$`));
    assert.deepEqual(snapshot[2].slice(0, 10), ['ID-G1-001', 'budget', 'What budget means', 'A sentence with budget.', 'Home page', 'anggaran', 'other anggaran', 'note on budget', verdicts[2], 'x']);

    assert.deepEqual(rowsOf(master.getSheetByName('Register')), [
      ['Context', 'Choice', 'Why', 'Flags'],
      ['A tool label', 'kamu', 'friendlier'],
      ['Bawaan untuk seluruh situs (Default for the whole site)', 'Tidak yakin (Not sure)'],
    ]);
  });

  it('closes the batch and tells the owner how much was reviewed', () => {
    const { w, code, rec } = collected({ fill: { rows: [{ [VERDICT]: verdicts[0] }, { [VERDICT]: verdicts[3] }] } });
    const after = recordOf(w, code);
    assert.equal(after.state, 'collected');
    assert.ok(after.collectedAt);
    assert.equal(lastDialog(w).title, 'Batch collected');
    assert.match(lastDialog(w).html, new RegExp(`Collected <b>${code}</b>: 2 of 3 terms reviewed, 0 flagged\\.`));
    assert.match(lastDialog(w).html, new RegExp(`https://docs\\.google\\.com/spreadsheets/d/${rec.master}/edit`));
    assert.match(lastDialog(w).html, /No next batch: Status is "Paused", so nothing new goes out\./);
    assert.equal(w.files.size, 2);
  });

  it('builds the next batch straight away for someone who is still active, and adds its code to the row', () => {
    const { w, code } = collected({ status: 'Active' });
    const codes = codesOf(w);
    assert.equal(codes.length, 2);
    assert.equal(codes[0], code);
    assert.match(codes[1], /^id-G2-/);
    assert.equal(recordOf(w, codes[1]).state, 'open');
    assert.equal(w.files.size, 4);
    assert.match(lastDialog(w).html, new RegExp(`The next batch is built: <b>${codes[1]}</b> \\(batch G2\\)\\.`));
    // Not a first batch: the owner is not told to set Status to Active again.
    assert.doesNotMatch(lastDialog(w).html, /Set Status to Active/);
  });

  it('says when that was the last batch, and builds nothing more', () => {
    const { w } = collected({ status: 'Active' });
    const second = recordOf(w, codesOf(w)[1]);
    volunteerFills(w.files.get(second.copy));
    w.answers.push('YES');
    w.ctx.reviewCollect();
    assert.match(lastDialog(w).html, /That was their last batch: there is nothing left to build\./);
    assert.equal(w.files.size, 4);

    w.ctx.reviewPrepare();
    assert.equal(lastDialog(w).title, 'All batches done');
    assert.equal(w.files.size, 4);
    assert.equal(codesOf(w).length, 2);
  });

  it('refuses a batch whose tool answer is blank, a formula or not one of the choices, and changes nothing', () => {
    const cases = [
      [(progress) => progress, /The batch tool answer \(&quot;For this batch I used&quot;\) is blank\. Nothing collected/],
      [(progress) => progress.getRange(2, 3).setValue('=A1'), /The batch tool answer is a formula, not a choice\. Nothing collected/],
      [(progress) => progress.getRange(2, 3).setValue('ChatGPT'), /The batch tool answer &quot;ChatGPT&quot; is not one of the choices\. Nothing collected/],
    ];
    for (const [answer, message] of cases) {
      const { w, copy, master, code } = prepared();
      volunteerFills(copy, { tool: null, rows: [{ [VERDICT]: verdicts[0] }] });
      answer(tabsOf(copy).progress);
      w.answers.push('YES');
      w.ctx.reviewCollect();
      assert.equal(lastDialog(w).title, 'Stopped');
      assert.match(lastDialog(w).html, message);
      assert.deepEqual(master.tabs.map((t) => t.name), ['Sent']);
      assert.equal(recordOf(w, code).state, 'open');
      assert.equal(codesOf(w).length, 1);
    }
  });

  it('flags what it will not apply: changed reference cells, formulas, unknown verdicts and suggestions that do not fit their verdict', () => {
    const { w, master } = collected({
      fill: { rows: [
        { 6: 'anggaranku', [VERDICT]: verdicts[0], [SUGGESTION]: 'rencana' },
        { [VERDICT]: 'Great', [SUGGESTION]: 'simpanan', [TOOL]: 'A dictionary' },
        { 3: '=1+1', [SUGGESTION]: '=IMPORTRANGE("x","y")' },
      ] },
    });
    const rows = reviewRows(master).slice(1);
    // The draft shown is the one sent, not the one the volunteer typed over it.
    assert.equal(rows[0][2], 'anggaran');
    assert.equal(rows[0][7], 'Reference cell changed: AI draft; Suggestion next to "Fine"');
    assert.deepEqual(rows[1].slice(3, 8), ['', 'simpanan', '', 'A dictionary', 'Unknown verdict: Great; Unknown tool answer: A dictionary; Suggestion without a verdict']);
    // A formula is never read as an answer: the suggestion stays empty.
    assert.deepEqual(rows[2].slice(3, 8), ['', '', '', '', 'Formula in Meaning; Formula in Your suggestion (not read); Not reviewed']);
    assert.match(lastDialog(w).html, /1 of 3 terms reviewed, 3 flagged\./);
    // The snapshot keeps the formula as its text, not as something Sheets runs.
    const snapshot = master.getSheetByName('Snapshot');
    assert.equal(snapshot.getRange(5, SUGGESTION).getValue(), '=IMPORTRANGE("x","y")');
    assert.equal(snapshot.getRange(5, SUGGESTION).getFormulas()[0][0], '');
  });

  it('flags a changed progress row and changed register examples', () => {
    const { w, master } = collected({
      before: ({ copy }) => {
        const { progress, register } = tabsOf(copy);
        progress.getRange(2, 2).setValue('My own title');
        register.getRange(4, 3).setValue('Something else');
        register.getRange(4, 5).setValue('tu');
        register.getRange(3, 4).setValue('lu');
      },
    });
    assert.match(rowsOf(master.getSheetByName('Snapshot'))[0][0], /Flags: Progress batch or title changed$/);
    assert.deepEqual(rowsOf(master.getSheetByName('Register')).slice(1), [
      ['A tool label', 'tu', '', 'Reference cell changed; Unknown choice'],
      ['Bawaan untuk seluruh situs (Default for the whole site)'],
      ['(header)', '', '', 'Register options changed'],
    ]);
    assert.match(lastDialog(w).html, /2 register rows flagged\. Also: Progress batch or title changed\./);
  });

  it('stops when the copy has lost a tab, and when the copy is gone', () => {
    const renamed = prepared();
    volunteerFills(renamed.copy);
    tabsOf(renamed.copy).terms.setName('My terms');
    renamed.w.answers.push('YES');
    renamed.w.ctx.reviewCollect();
    assert.match(lastDialog(renamed.w).html, /The copy has no &quot;G1 Istilah \(Terms\)&quot; tab \(renamed or deleted\?\)\. Nothing collected\./);
    assert.equal(recordOf(renamed.w, renamed.code).state, 'open');

    const gone = prepared();
    gone.w.files.delete(gone.rec.copy);
    gone.w.answers.push('YES');
    gone.w.ctx.reviewCollect();
    assert.match(lastDialog(gone.w).html, new RegExp(`The review copy for ${gone.code} cannot be opened \\(deleted\\?\\)`));
    assert.equal(recordOf(gone.w, gone.code).state, 'open');
  });

  it('a repeated collection reuses the first capture and keeps the owner\'s decisions', () => {
    const { w, copy, master, code } = collected({ fill: { rows: [{ [VERDICT]: verdicts[0] }, { [VERDICT]: verdicts[1], [SUGGESTION]: 'simpanan' }] } });
    // The owner decides on two rows, then the run is repeated as if it had stopped part way.
    master.getSheetByName('Review').getRange(2, 9, 2, 2).setValues([['Agreed: draft', ''], ['Agreed: volunteer suggestion', 'ask again in G2']]);
    const first = rowsOf(master.getSheetByName('Capture'));
    w.props.set(`review:${code}`, JSON.stringify({ ...recordOf(w, code), state: 'collecting' }));
    // The volunteer changes the copy after saying it was done: that is not part of the submission.
    tabsOf(copy).terms.getRange(2, VERDICT).setValue(verdicts[2]);
    w.answers.push('YES');
    w.ctx.reviewCollect();

    assert.equal(recordOf(w, code).state, 'collected');
    assert.deepEqual(rowsOf(master.getSheetByName('Capture')), first);
    const rows = reviewRows(master).slice(1);
    assert.deepEqual(rows.map((r) => [r[0], r[3], r[8], r[9]]), [
      ['ID-G1-001', 'Fine', 'Agreed: draft', ''],
      ['ID-G1-002', 'Better option', 'Agreed: volunteer suggestion', 'ask again in G2'],
      ['ID-G1-003', '', '', ''],
    ]);
    // The checkpoint and the temporary tabs are gone once Review is in place.
    assert.deepEqual(master.tabs.map((t) => t.name).sort(), ['Capture', 'Register', 'Review', 'Sent', 'Snapshot']);
  });

  it('a collected batch stays closed', () => {
    const { w, master } = collected();
    const before = JSON.stringify(master.tabs.map(rowsOf));
    w.answers.push('YES');
    w.ctx.reviewCollect();
    assert.equal(lastDialog(w).title, 'Nothing to collect');
    assert.equal(w.alerts.length, 1);
    assert.equal(JSON.stringify(master.tabs.map(rowsOf)), before);
  });
});

describe('review-sheet.gs: replacing, listing and forgetting', () => {
  it('replaces an open copy with a new code for the same batch, and deletes nothing', () => {
    const { w, code, rec } = prepared({ answers: ['YES'] });
    w.ctx.reviewReplace();
    const codes = codesOf(w);
    assert.equal(codes.length, 2);
    assert.equal(codes[0], code);
    assert.match(codes[1], /^id-G1-/);
    assert.notEqual(codes[1], code);
    assert.equal(recordOf(w, code).state, 'replaced');
    assert.equal(recordOf(w, codes[1]).state, 'open');
    assert.equal(w.files.size, 4);
    const { html } = lastDialog(w);
    assert.match(html, new RegExp(`Marked ${code} as replaced\\.`));
    // Closing the old link and deleting the old files are the owner's steps.
    assert.match(html, new RegExp(`spreadsheets/d/${rec.copy}/edit" target="_blank">old copy</a>: Share, General access, Restricted\\.`));
    assert.match(html, /Set Status to Active\./);
  });

  it('does not replace without a Yes, or when nothing is open', () => {
    const { w, code } = prepared();
    w.ctx.reviewReplace();
    assert.equal(recordOf(w, code).state, 'open');
    assert.equal(w.files.size, 2);

    const none = load();
    none.ctx.reviewReplace();
    assert.equal(lastDialog(none).title, 'Nothing to replace');
  });

  it('a replaced copy cannot be collected', () => {
    const { w, code, copy } = prepared({ answers: ['YES'] });
    w.ctx.reviewReplace();
    volunteerFills(copy);
    assert.throws(() => w.ctx.collectCode_(code), new RegExp(`${code} is not open\\.`));
  });

  it('lists a person\'s files with links, and says so for a code it has no record of', () => {
    const { w, code } = prepared();
    w.props.delete(`review:${code}`);
    w.ctx.reviewFiles();
    assert.match(lastDialog(w).html, new RegExp(`<li>${code}: no record \\(made by hand, or already forgotten\\)</li>`));

    const p = prepared();
    p.w.ctx.reviewFiles();
    assert.equal(lastDialog(p.w).title, 'Review files for this row');
    assert.match(lastDialog(p.w).html, new RegExp(`<li>${p.code}, batch G1, open: <a href="https://docs\\.google\\.com/spreadsheets/d/${p.rec.copy}/edit" target="_blank">review copy</a>, <a href="https://docs\\.google\\.com/spreadsheets/d/${p.rec.master}/edit" target="_blank">private master</a></li>`));
  });

  it('forgets its records for a person only after a Yes, and leaves the files and the row to the owner', () => {
    const { w, code } = prepared();
    w.ctx.reviewForget();
    assert.match(w.alerts[0].text, /For a removal only\./);
    assert.equal(w.props.size, 1);

    w.answers.push('YES');
    w.ctx.reviewForget();
    assert.equal(w.props.size, 0);
    assert.equal(w.files.size, 2);
    assert.equal(copiesCell(w), code);
    assert.equal(lastDialog(w).title, 'Records forgotten');
    assert.match(lastDialog(w).html, /Delete this person's row in the sheet\./);
  });

  it('forgets only this person\'s codes', () => {
    const { w } = prepared({ answers: [] });
    w.props.set('review:es-G1-ZZZZ', JSON.stringify({ code: 'es-G1-ZZZZ', state: 'open' }));
    w.answers.push('YES');
    w.ctx.reviewForget();
    assert.deepEqual([...w.props.keys()], ['review:es-G1-ZZZZ']);
  });
});

describe('review-sheet.gs: what\'s next', () => {
  const next = (w) => { w.ctx.reviewNext(); return lastDialog(w).html; };

  it('names the one next step for each state of a person', () => {
    assert.match(next(load({ status: '' })), /Status is "blank"\. Batches start once they have replied "I agree"/);
    assert.match(next(load({ status: 'Paused' })), /Paused: no new batches\./);
    assert.match(next(load()), /No batch yet\. Choose Prepare next batch to build their first one\./);

    const open = prepared();
    assert.match(next(open.w), new RegExp(`Batch G1 \\(${open.code}\\) is open\\. If you have not sent it yet:`));
    assert.match(next(open.w), /Once their "batch G1 done" email arrives, choose Collect a finished batch\./);

    open.w.volunteers.getRange(2, 4).setValue('Paused');
    assert.match(next(open.w), new RegExp(`Open batch: ${open.code}\\.`));
  });

  it('counts the rows of a collected batch that still wait for a decision', () => {
    const { w, copy, master, code } = prepared();
    volunteerFills(copy);
    w.volunteers.getRange(2, 4).setValue('Paused');
    w.answers.push('YES');
    w.ctx.reviewCollect();
    w.volunteers.getRange(2, 4).setValue('Active');
    assert.match(next(w), new RegExp(`3 rows of ${code} have no decision yet`));
    master.getSheetByName('Review').getRange(2, 9, 3, 1).setValues([['Agreed: draft'], ['Keep open'], ['Agreed: draft']]);
    assert.match(next(w), /Nothing is open and every decision is made\./);
  });
});

describe('review-sheet.gs: what it never does', () => {
  it('uses no service that could share a file, send an email, fetch an address or delete a file', () => {
    const source = fs.readFileSync('scripts/review/review-sheet.gs', 'utf8');
    assert.doesNotMatch(source, /DriveApp|MailApp|GmailApp|UrlFetchApp|addEditors?\(|addViewers?\(|addCommenters?\(|setSharing\(|setTrashed\(|sendEmail\(/);
  });

  it('escapes what it shows in a dialog', () => {
    const w = load({ status: '<img src=x onerror=alert(1)>' });
    w.ctx.reviewPrepare();
    assert.doesNotMatch(lastDialog(w).html, /<img/);
    assert.match(lastDialog(w).html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });
});
