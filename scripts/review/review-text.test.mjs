/**
 * scripts/review/review-text.gs holds the words a volunteer sees in a review
 * sheet, one pack per language. It runs in Google's Apps Script runtime, so
 * the test loads it into a Node VM. It uses no Google service: the checks
 * here are about the packs agreeing with each other, with the volunteer form
 * and with what review-sheet.gs reads back from them.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('scripts/review/review-text.gs', 'utf8'), ctx);
// A plain copy: objects made in the VM are not this realm's objects.
const TEXT = JSON.parse(JSON.stringify(ctx.SHEET_TEXT_));
const FORM_LANGUAGES = { ...ctx.FORM_LANGUAGES_ };
const PUBLISHED = { ...ctx.PUBLISHED_ };
const LANGS = Object.keys(TEXT).filter((l) => l !== 'en');

/** Every leaf string of a pack, by dotted key. */
function leaves(node, path = '', out = {}) {
  for (const [k, v] of Object.entries(node)) {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === 'string') out[p] = v;
    else leaves(v, p, out);
  }
  return out;
}

const placeholders = (s) => (s.match(/\{[a-z]+\}/g) ?? []).sort();

describe('review-text.gs: the packs follow the English one', () => {
  it('its own check finds nothing missing', () => {
    assert.deepEqual([...ctx.checkTextPacks_()], []);
  });

  it('every pack has exactly the English keys, each with words in it', () => {
    const english = Object.keys(leaves(TEXT.en)).sort();
    for (const lang of LANGS) {
      const pack = leaves(TEXT[lang]);
      assert.deepEqual(Object.keys(pack).sort(), english, lang);
      for (const [key, value] of Object.entries(pack)) assert.notEqual(value.trim(), '', `${lang}.${key} is blank`);
    }
  });

  it('its own check names a missing word, a missing group and a list of the wrong length', () => {
    const broken = {};
    vm.createContext(broken);
    vm.runInContext(fs.readFileSync('scripts/review/review-text.gs', 'utf8'), broken);
    vm.runInContext(
      "SHEET_TEXT_.id.start.thanks = ''; delete SHEET_TEXT_.fr.cols; SHEET_TEXT_.de.verdicts = SHEET_TEXT_.de.verdicts.slice(0, 3);",
      broken,
    );
    assert.deepEqual([...broken.checkTextPacks_()], ['id.start.thanks', 'fr.cols', 'de.verdicts']);
  });

  it('every sentence keeps the placeholders of its English source, so nothing is left unfilled or dropped', () => {
    const english = leaves(TEXT.en);
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(leaves(TEXT[lang]))) {
        assert.deepEqual(placeholders(value), placeholders(english[key]), `${lang}.${key}`);
      }
    }
  });

  it('uses only the four placeholders a sheet fills in', () => {
    for (const lang of Object.keys(TEXT)) {
      for (const [key, value] of Object.entries(leaves(TEXT[lang]))) {
        for (const p of placeholders(value)) assert.match(p, /^\{(draft|register|progress|batch)\}$/, `${lang}.${key}`);
      }
    }
  });

  it('no pack uses an em dash or a double dash', () => {
    for (const lang of Object.keys(TEXT)) {
      for (const [key, value] of Object.entries(leaves(TEXT[lang]))) assert.doesNotMatch(value, /\u2014|-{2}/, `${lang}.${key}`);
    }
  });
});

describe('review-text.gs: the choices are read back by position', () => {
  it('every pack has four verdicts and four tool answers, in the English order', () => {
    assert.deepEqual(TEXT.en.verdicts, ['Fine', 'Better option', 'Wrong', 'Not sure']);
    assert.deepEqual(TEXT.en.tools, ['None', 'AI', 'Translation tool', 'Both']);
    for (const lang of LANGS) {
      assert.equal(TEXT[lang].verdicts.length, 4, lang);
      assert.equal(TEXT[lang].tools.length, 4, lang);
    }
  });

  it('no two choices of a list read the same once the English is added, or the wrong one would be read back', () => {
    for (const lang of Object.keys(TEXT)) {
      for (const list of ['verdicts', 'tools']) {
        const shown = TEXT[lang][list].map((v, i) => ctx.bi_(v, TEXT.en[list][i]));
        assert.equal(new Set(shown).size, shown.length, `${lang}.${list}: ${shown.join(' | ')}`);
      }
    }
  });

  it('the tab names of a pack differ from each other, since tabs are found by name', () => {
    for (const lang of Object.keys(TEXT)) {
      const tabs = Object.values(TEXT[lang].tabs);
      assert.equal(new Set(tabs).size, tabs.length, lang);
    }
  });
});

describe('review-text.gs: languages', () => {
  it('has a pack for every language the form offers, and for no other', () => {
    assert.deepEqual(Object.values(FORM_LANGUAGES).sort(), LANGS.slice().sort());
  });

  it('knows every language name in the form\'s "Which languages?" choices', () => {
    // The same context, so the form's own lists are read, not copied here.
    const form = {};
    vm.createContext(form);
    vm.runInContext(fs.readFileSync('scripts/volunteer-form.gs', 'utf8'), form);
    const offered = Array.from(vm.runInContext('[...OPEN_LANGUAGES, ...UPCOMING_LANGUAGES]', form));
    const names = offered.map((choice) => /\(([A-Za-z]+)\)$/.exec(choice)?.[1]);
    assert.equal(names.includes(undefined), false, 'a form choice has no English name in brackets');
    assert.deepEqual(names.slice().sort(), Object.keys(FORM_LANGUAGES).sort());
  });

  it('marks as published exactly the languages the form lists as open', () => {
    assert.deepEqual(Object.keys(PUBLISHED).sort(), ['cs', 'es', 'mr']);
    assert.deepEqual(
      Object.keys(PUBLISHED).sort(),
      ['Spanish', 'Czech', 'Marathi'].map((name) => FORM_LANGUAGES[name]).sort(),
    );
  });

  it('names each language in its own words', () => {
    assert.equal(TEXT.en.name, 'English');
    const names = LANGS.map((l) => TEXT[l].name);
    assert.equal(new Set(names).size, names.length);
    assert.equal(names.includes('English'), false);
  });
});

describe('review-text.gs: helpers', () => {
  it('text_ gives the language\'s pack, and English for a language without one', () => {
    assert.equal(ctx.text_('id').name, 'Bahasa Indonesia');
    assert.equal(ctx.text_('xx').name, 'English');
    assert.equal(ctx.text_(undefined).name, 'English');
  });

  it('bi_ puts the English after the local word in brackets, once', () => {
    assert.equal(ctx.bi_('Penilaian', 'Verdict'), 'Penilaian (Verdict)');
    // A word that is the same in both is not doubled ("AI (AI)").
    assert.equal(ctx.bi_('AI', 'AI'), 'AI');
  });
});
