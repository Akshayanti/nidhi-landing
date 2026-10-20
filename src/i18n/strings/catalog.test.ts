/**
 * Catalog tests for the string catalogs in this directory.
 *
 * `Dict` is `typeof en` and every catalog is annotated with it, so a missing
 * key and an unknown key are both type errors, which `npm run typecheck`
 * catches in CI. The key-parity test below says the same thing in a form that
 * names the missing path, runs with the rest of the suite, and also covers
 * values the type cannot see into.
 *
 * The rest covers what types cannot see at all: a blank translation, and an
 * English sentence left standing in the Hindi catalog by accident.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS, LOCALES, dict } from '../index.ts';
import { CURRENCIES } from '../../utils/loan/math.ts';
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi } from './tools/currencies.ts';
import { en } from './en.ts';
import { hi } from './hi.ts';
import { es } from './es.ts';
import { cs } from './cs.ts';

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
const ES = leaves(es);
const CS = leaves(cs);
/** Every translated catalog, by language, for the checks that apply to all of them. */
const TRANSLATED: Array<[string, Leaf[]]> = [['Hindi', HI], ['Spanish', ES], ['Czech', CS]];
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

  // Instagram is a product name, and CLAUDE.md keeps product names in their own
  // script; Facebook and LinkedIn already stay Latin in the Hindi chrome. The
  // about page's link adds only the account handle, which is a name too.
  'nav.items.instagram',
  'about.cta.instagram',
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
    for (const { path, value } of [...EN, ...HI, ...ES, ...CS]) {
      assert.ok(value.trim().length > 0, `${path} is blank`);
    }
  });
});

describe('catalogs agree on their keys', () => {
  it('gives every catalog the same key set as English', () => {
    // The gate that actually runs. It also still holds if a catalog is ever
    // built dynamically, loaded from JSON, or cast out of its type.
    const enKeys = EN.map((leaf) => leaf.path).sort();
    for (const [name, catalog] of TRANSLATED) {
      assert.deepEqual(catalog.map((leaf) => leaf.path).sort(), enKeys, `${name} keys differ from English`);
    }
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

/**
 * Spanish shares more spellings with English than Hindi does (`Euro`, a
 * cognate like `Total`), so a value identical to English is allowed here only
 * with a reason, on top of the shared `IDENTICAL_OK`.
 */
const IDENTICAL_OK_ES = new Set<string>([
  // "Euro" is the currency's name in Spanish too, and the code is the same.
  'tools.loanComparison.island.currencies.EUR',
  'tools.multiCurrencyNetWorth.island.currencies.EUR',
  'tools.monteCarlo.island.currencies.EUR',
  'tools.inflation.island.currencies.EUR',
]);

describe('the Spanish catalog is translated, not copied', () => {
  it('leaves no English word untranslated', () => {
    const copied = ES.filter(({ path, value }) => {
      if (IDENTICAL_OK.has(path) || IDENTICAL_OK_ES.has(path)) return false;
      if (value !== EN_BY_PATH.get(path)) return false;
      return !isLanguageNeutral(value);
    }).map(({ path, value }) => `${path}: ${value}`);

    assert.deepEqual(
      copied,
      [],
      `Spanish values still identical to English:\n  ${copied.join('\n  ')}\n\n` +
        'Translate them, or add the path to IDENTICAL_OK_ES in this file with a reason.',
    );
  });

  it('writes amounts the Spanish way, never as €10,000', () => {
    // docs/i18n/es-glossary.md rule 6: in Spanish, "10,000" reads as ten with
    // three decimals. A literal amount in the Spanish copy is "10.000 €".
    const english = ES.filter(({ value }) => /€\s?\d|\d,\d{3}\b/.test(value)).map((l) => `${l.path}: ${l.value}`);
    assert.deepEqual(english, []);
  });
});

/**
 * Czech, like Spanish, shares some spellings with English (`Euro`), so a value
 * identical to English is allowed here only with a reason.
 */
const IDENTICAL_OK_CS = new Set<string>([
  // "Euro" is the currency's name in Czech too, and the code is the same.
  'tools.loanComparison.island.currencies.EUR',
  'tools.multiCurrencyNetWorth.island.currencies.EUR',
  'tools.monteCarlo.island.currencies.EUR',
  'tools.inflation.island.currencies.EUR',
  // "Newsletter" is the everyday Czech word (docs/i18n/cs-glossary.md).
  'privacy.why.newsletter.lead',
  // FIRE is kept as the English acronym and glossed where it is introduced.
  'tools.multiCurrencyNetWorth.page.related.items.6.kicker',
  // The publisher's name and the year, which read the same in every language.
  'tools.monteCarlo.page.how.source.after',
]);

describe('the Czech catalog is translated, not copied', () => {
  it('leaves no English word untranslated', () => {
    const copied = CS.filter(({ path, value }) => {
      if (IDENTICAL_OK.has(path) || IDENTICAL_OK_CS.has(path)) return false;
      if (value !== EN_BY_PATH.get(path)) return false;
      return !isLanguageNeutral(value);
    }).map(({ path, value }) => `${path}: ${value}`);

    assert.deepEqual(
      copied,
      [],
      `Czech values still identical to English:\n  ${copied.join('\n  ')}\n\n` +
        'Translate them, or add the path to IDENTICAL_OK_CS in this file with a reason.',
    );
  });

  it('writes amounts the Czech way, never as €10,000 or 10.000', () => {
    // docs/i18n/cs-glossary.md rule 6: Czech groups thousands with a space
    // and puts the symbol after the number, "10 000 Kč", "1 000 €".
    const foreign = CS.filter(({ value }) => /[€$£₹]\s?\d|\d[,.]\d{3}\b/.test(value)).map((l) => `${l.path}: ${l.value}`);
    assert.deepEqual(foreign, []);
  });

  it('quotes with „…“, never with straight double quotes', () => {
    // Rule 10. A straight quote inside a string is either a mistake or an
    // English quotation left standing.
    const straight = CS.filter(({ value }) => /"/.test(value)).map((l) => `${l.path}: ${l.value}`);
    assert.deepEqual(straight, []);
  });

  it('keeps every one-letter preposition and conjunction on the line of the word after it', () => {
    // Rule 14: Czech typography never leaves "v", "k", "s", "z", "o", "u",
    // "a" or "i" at the end of a line, so they are joined to the next word with
    // a no-break space (U+00A0) in every Czech value.
    const loose = CS.filter(({ value }) => /(^|[^\p{L}])[vkszouai] (?=\S)/iu.test(value)).map((l) => `${l.path}: ${l.value}`);
    assert.deepEqual(loose, []);
  });

  it('uses no en dash as punctuation', () => {
    // Rule 1: Czech would use the pomlčka for asides and ranges; the site uses
    // a colon, a comma, parentheses or "až" instead.
    const dashed = CS.filter(({ value }) => /–/.test(value)).map((l) => l.path);
    assert.deepEqual(dashed, []);
  });
});

/**
 * The three free tools name their currencies from `./tools/currencies.ts`, and
 * the codes they offer come from the engine's own table in
 * `src/utils/loan/math.ts`. The two are written by hand in different files, so
 * these three assertions are what keeps them one list: a currency added to the
 * engine without a name fails here, a name for a currency the engine does not
 * have fails here, and so does a Hindi name that quotes the wrong code.
 */
describe('the tools name every currency they offer', () => {
  const CODES = CURRENCIES.map((c) => c.code).sort();

  it('names exactly the engine\'s currencies, in both languages', () => {
    assert.deepEqual(Object.keys(currenciesEn).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesHi).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesEs).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesCs).sort(), CODES);
  });

  it('keeps the English name the engine\'s own label, so the two cannot drift', () => {
    for (const c of CURRENCIES) {
      assert.equal(currenciesEn[c.code], c.label, `${c.code} disagrees with the engine's label`);
    }
  });

  it('keeps the code Latin and in brackets in every language', () => {
    // The code is what a reader searches for and what the tool writes into its
    // own address, so it is the same string in both maps; only the name moves.
    for (const c of CURRENCIES) {
      assert.ok(
        currenciesHi[c.code].endsWith(`(${c.code})`),
        `${c.code} in Hindi does not end with its own code`,
      );
      assert.ok(
        currenciesEs[c.code].endsWith(`(${c.code})`),
        `${c.code} in Spanish does not end with its own code`,
      );
      assert.ok(
        currenciesCs[c.code].endsWith(`(${c.code})`),
        `${c.code} in Czech does not end with its own code`,
      );
    }
  });
});

describe('style rules from CLAUDE.md hold in every catalog', () => {  it('uses no em dash, in either its character or entity form', () => {
    const offenders = [...EN, ...HI, ...ES, ...CS].filter(({ value }) =>
      /—|&mdash;|&#8212;|&#x2014;/i.test(value),
    );
    assert.deepEqual(offenders.map((leaf) => leaf.path), []);
  });

  it('uses no double dash', () => {
    const offenders = [...EN, ...HI, ...ES, ...CS].filter(({ value }) => /--/.test(value));
    assert.deepEqual(offenders.map((leaf) => leaf.path), []);
  });
});

/**
 * Hindi's plural rule puts 0 in `one`, so a Hindi `One` string is shown for a
 * count of 0 as well as 1, and must carry the count rather than a written 1.
 * The keys listed here are chosen by comparing a count with 1 directly, never
 * through `plural()`, so they are only ever shown for exactly 1.
 */
const HI_DIRECT_ONE = new Set<string>([
  'tools.monteCarlo.island.quick.medianOne',
  'tools.monteCarlo.island.results.headingOne',
]);

describe('Hindi counted strings carry their count', () => {
  it('puts the placeholder of the plural form in every One form', () => {
    const byPath = new Map(HI.map((leaf) => [leaf.path, leaf.value]));
    const offenders = HI.filter(({ path }) => path.endsWith('One') && !HI_DIRECT_ONE.has(path)).flatMap(({ path, value }) => {
      const base = path.slice(0, -'One'.length);
      const plural = [base, `${base}Many`, `${base}Other`].map((p) => byPath.get(p)).find((v) => v !== undefined);
      const placeholders = plural?.match(/\{\w+\}/g) ?? [];
      return placeholders.some((p) => !value.includes(p)) ? [path] : [];
    });
    assert.deepEqual(offenders, []);
  });
});
