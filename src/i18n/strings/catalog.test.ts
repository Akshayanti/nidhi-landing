/**
 * Catalog tests for the string catalogs in this directory.
 *
 * `Dict` is `typeof en` and every catalog is annotated with it, so a missing
 * key and an unknown key are both type errors. Note that nothing in
 * `package.json` or in CI runs a type check, so that only shows up in an
 * editor: the key-parity test below is what actually fails a build over a
 * missing key, and that is why it is worth its duplication.
 *
 * The rest covers what types cannot see at all: a blank translation, and an
 * English sentence left standing in the Hindi catalog by accident.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS, LOCALES, dict } from '../index.ts';
import { en } from './en.ts';
import { hi } from './hi.ts';

/** One translatable string, addressed by its dot path. */
type Leaf = { path: string; value: string };

/**
 * Flattens a catalog into dot paths. Throws on a value that is neither a
 * string nor a group of them, so a number or a nested array cannot sneak in
 * and be skipped silently.
 */
function leaves(node: unknown, prefix = ''): Leaf[] {
  if (typeof node === 'string') return [{ path: prefix, value: node }];
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  throw new Error(`catalog value at ${prefix || '<root>'} is neither a string nor a group`);
}

const EN = leaves(en);
const HI = leaves(hi);
const EN_BY_PATH = new Map(EN.map((leaf) => [leaf.path, leaf.value]));

/**
 * Paths where the two catalogs are allowed to hold the same text. Keep this
 * short and justified: it is the one place where "not translated" and
 * "correctly identical" look the same.
 *
 * Empty, and deliberately kept so that the next value which really must read
 * the same in two languages has somewhere to go with its reason. The only
 * entries it has held were the two language names, `हिन्दी` and `English`, and
 * those are not in the catalogs at all any more: a language is named in its own
 * script, which is the same string in every catalog, so the picker reads them
 * from LOCALE_META in `src/i18n/config.ts`.
 */
const IDENTICAL_OK = new Set<string>([
  // A person's name is not a word in the catalog's sense: "Alex" and "Sam" are
  // the same two people in every language, the way a language's own name is.
  // They are here rather than being transliterated because transliterating a
  // first name would rename the example's characters from one edition to the
  // next, and the two names are what make "same income, different net worth"
  // readable at a glance.
  'home.compare.people.alex.name',
  'home.compare.people.sam.name',

  // The privacy notice names four services, and three of those names are the
  // services' own (the fourth, "Your browser", is prose and is translated). A
  // reader who wants to look one up has to look up the name it actually has,
  // and a translator rendering "Google Workspace" in Devanagari would be
  // inventing a company. `privacy.collect.pageviews.link` is the same name
  // again, as a link.
  'privacy.collect.pageviews.link',
  'privacy.where.processors.posthog.name',
  'privacy.where.processors.google.name',
  'privacy.where.processors.github.name',

  // A level page's document title is the level's own name and one-line summary
  // around the brand suffix, and those two already come from the catalog. The
  // pattern itself is placeholders plus "nidhi", so there is nothing in it a
  // translator could translate, and the Hindi page reads it the same way.
  'level.meta.title',
]);

/**
 * True when there is nothing in the value a translator could translate:
 * punctuation, a bare number, an amount, a currency code, a date format. Four
 * consecutive Latin letters is the line between "not a word" and "a word
 * somebody forgot to translate".
 */
function isLanguageNeutral(value: string): boolean {
  return !/[A-Za-z]{4}/.test(value);
}

describe('catalog structure', () => {
  it('has a catalog for every locale in the registry', () => {
    assert.deepEqual(Object.keys(DICTS).sort(), [...LOCALES].sort());
  });

  it('has strings at all', () => {
    assert.ok(EN.length > 0);
  });

  it('resolves every key in every catalog, so nothing is blank', () => {
    for (const { path, value } of [...EN, ...HI]) {
      assert.ok(value.trim().length > 0, `${path} is blank`);
    }
  });
});

describe('catalogs agree on their keys', () => {
  it('gives the two catalogs the same key set', () => {
    // The gate that actually runs. It also still holds if a catalog is ever
    // built dynamically, loaded from JSON, or cast out of its type.
    const enKeys = EN.map((leaf) => leaf.path).sort();
    const hiKeys = HI.map((leaf) => leaf.path).sort();
    assert.deepEqual(hiKeys, enKeys);
  });

  it('resolves a catalog through dict() for each locale', () => {
    for (const locale of LOCALES) {
      assert.equal(dict(locale), DICTS[locale]);
      assert.ok(leaves(dict(locale)).length > 0);
    }
  });
});

describe('the Hindi catalog is translated, not copied', () => {
  it('leaves no English word untranslated', () => {
    const copied = HI.filter(({ path, value }) => {
      if (IDENTICAL_OK.has(path)) return false;
      if (value !== EN_BY_PATH.get(path)) return false;
      return !isLanguageNeutral(value);
    }).map(({ path, value }) => `${path}: ${value}`);

    assert.deepEqual(
      copied,
      [],
      `Hindi values still identical to English:\n  ${copied.join('\n  ')}\n\n` +
        'Translate them, or add the path to IDENTICAL_OK in this file with a reason.',
    );
  });

  it('writes the Hindi catalog in Devanagari', () => {
    // A locale-independent sanity check: the Hindi catalog is mostly Devanagari
    // prose, so a wholesale copy-paste from another language would show up as
    // Latin text nearly everywhere.
    const prose = HI.filter(({ path, value }) => !IDENTICAL_OK.has(path) && !isLanguageNeutral(value));
    const devanagari = prose.filter(({ value }) => /[ऀ-ॿ]/.test(value));
    assert.ok(
      devanagari.length >= prose.length / 2,
      `only ${devanagari.length} of ${prose.length} Hindi values contain Devanagari`,
    );
  });
});

describe('style rules from CLAUDE.md hold in every catalog', () => {
  it('uses no em dash, in either its character or entity form', () => {
    const offenders = [...EN, ...HI].filter(({ value }) =>
      /—|&mdash;|&#8212;|&#x2014;/i.test(value),
    );
    assert.deepEqual(offenders.map((leaf) => leaf.path), []);
  });

  it('uses no double dash', () => {
    const offenders = [...EN, ...HI].filter(({ value, path }) => {
      // A path may legitimately contain one; a value may not.
      return /--/.test(value) && !path.startsWith('code');
    });
    assert.deepEqual(offenders.map((leaf) => leaf.path), []);
  });
});
