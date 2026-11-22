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
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi, currenciesMr } from './tools/currencies.ts';
import { en } from './en.ts';
import { hi } from './hi.ts';
import { es } from './es.ts';
import { cs } from './cs.ts';
import { mr } from './mr.ts';
import { CHANGE_DAYS, LAUNCH_ITEMS } from './changes.ts';

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
const MR = leaves(mr);
/** Every translated catalog, by language, for the checks that apply to all of them. */
const TRANSLATED: Array<[string, Leaf[]]> = [['Hindi', HI], ['Spanish', ES], ['Czech', CS], ['Marathi', MR]];
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
  // FIRE is the acronym, kept in capitals in every language.
  'learn.tags.fire.name',
  // The privacy notice names five services, and four of those names are the
  // services' own (the fifth, "Your browser", is prose and is translated). A
  // reader who wants to look one up has to look up the name it actually has,
  // and a translator rendering "Google Workspace" in Devanagari would be
  // inventing a company. `privacy.collect.pageviews.link` is the same name
  // again, as a link.
  'privacy.collect.pageviews.link',
  'privacy.where.processors.posthog.name',
  'privacy.where.processors.google.name',
  'privacy.where.processors.github.name',
  'privacy.where.processors.planner.name',

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

  it('addresses the reader in one register: -ें or -एँ, never -िए or -इए', () => {
    // docs/i18n/hi-glossary.md: verbs addressed to the reader take the plain
    // polite form (देखें, करें, बताएँ), never the formal one (देखिए, कीजिए,
    // बताइए). The two had been mixed inside single sentences (#425). Words that
    // end the same way without being a request to the reader are listed here:
    // postpositions and conjunctions (लिए, इसलिए, ज़रिए), चाहिए, and the plural
    // participles किए and दिए.
    const notImperative = new Set(
      ['लिए', 'इसलिए', 'इसीलिए', 'किसलिए', 'चाहिए', 'किए', 'दिए', 'ज़रिए', 'नज़रिए'].map((w) => w.normalize('NFD')),
    );
    const changes = CHANGE_DAYS.flatMap((day) => day.items.map((item) => ({ path: `changes.${item.id}`, value: item.text.hi })));
    const offenders = [...HI, ...changes].flatMap(({ path, value }) =>
      [...value.normalize('NFD').matchAll(/[ऀ-ॣॱ-ॿ]+/gu)]
        .map(([word]) => word)
        .filter((word) => /(ि|इ)ए$/u.test(word) && !notImperative.has(word))
        .map((word) => `${path}: ${word.normalize('NFC')}`),
    );
    assert.deepEqual(offenders, [], 'Use the -ें / -एँ form (देखें, करें, बताएँ), or list a word that is not an imperative above.');
  });
});

/**
 * Spanish shares more spellings with English than Hindi does (`Euro`, a
 * cognate like `Total`), so a value identical to English is allowed here only
 * with a reason, on top of the shared `IDENTICAL_OK`.
 */
const IDENTICAL_OK_ES = new Set<string>([
  // "Error" is the Spanish word too.
  'tools.export.fieldError',
  // "Euro" is the currency's name in Spanish too, and the code is the same.
  'tools.loanComparison.island.currencies.EUR',
  'tools.multiCurrencyNetWorth.island.currencies.EUR',
  'tools.monteCarlo.island.currencies.EUR',
  'tools.inflation.island.currencies.EUR',
  'tools.investOrPayOff.island.currencies.EUR',
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
  'tools.investOrPayOff.island.currencies.EUR',
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
/**
 * Marathi is written in Devanagari, so a value identical to English is nearly
 * always a copy; the few allowed here each have a reason.
 */
const IDENTICAL_OK_MR = new Set<string>([
  // FIRE is kept as the English acronym (docs/i18n/mr-glossary.md).
  'tools.multiCurrencyNetWorth.page.related.items.6.kicker',
  // The publisher's name and the year, which read the same in every language.
  'tools.monteCarlo.page.how.source.after',
  // A source's name stays as it is (docs/i18n/mr-glossary.md rule 9).
  'tools.inflation.page.source.link',
]);

/** A meta description: a page's own, a tool page's, or a topic page's. */
const isMetaDescription = (path: string) =>
  /(^|\.)meta\.description(WithoutSimulator|WithCount|Fallback)?$/.test(path) || /^learn\.tags\.[^.]+\.description$/.test(path);

describe('the Marathi catalog is translated, not copied', () => {
  it('leaves no English word untranslated', () => {
    const copied = MR.filter(({ path, value }) => {
      if (IDENTICAL_OK.has(path) || IDENTICAL_OK_MR.has(path)) return false;
      if (value !== EN_BY_PATH.get(path)) return false;
      return !isLanguageNeutral(value);
    }).map(({ path, value }) => `${path}: ${value}`);

    assert.deepEqual(
      copied,
      [],
      `Marathi values still identical to English:\n  ${copied.join('\n  ')}\n\n` +
        'Translate them, or add the path to IDENTICAL_OK_MR in this file with a reason.',
    );
  });

  it('writes the Marathi catalog in Devanagari', () => {
    const prose = MR.filter(({ path, value }) => !IDENTICAL_OK_MR.has(path) && !isLanguageNeutral(value));
    const devanagari = prose.filter(({ value }) => /[ऀ-ॿ]/.test(value));
    assert.ok(devanagari.length >= prose.length * 0.9, `only ${devanagari.length} of ${prose.length} Marathi values contain Devanagari`);
  });

  it('ends sentences with a full stop, never the Hindi danda', () => {
    // docs/i18n/mr-glossary.md rule 2.
    assert.deepEqual(MR.filter(({ value }) => /[।॥]/.test(value)).map((l) => l.path), []);
  });

  it('writes digits in Latin, never as Devanagari numerals', () => {
    // docs/i18n/mr-glossary.md rule 7.
    assert.deepEqual(MR.filter(({ value }) => /[०-९]/.test(value)).map((l) => l.path), []);
  });

  it('quotes with typographic marks, never with straight double quotes', () => {
    assert.deepEqual(MR.filter(({ value }) => /"/.test(value)).map((l) => l.path), []);
  });

  it('keeps a case word on the line of the Latin word, number or placeholder before it', () => {
    // docs/i18n/mr-glossary.md rule 15: a postposition written apart (nidhi चे,
    // ₹5,000 पासून, {gap} चा) is joined to what precedes it with U+00A0, so a
    // line never starts with one. A string that starts with one follows a link
    // or a bold label, so its leading space is a no-break space too.
    const words = ['चा', 'ची', 'चे', 'च्या', 'ला', 'ना', 'ने', 'मध्ये', 'मधील', 'मधून', 'पासून', 'पर्यंत', 'कडून', 'कडे', 'वर', 'वरील', 'वरून', 'साठी', 'विषयी', 'बद्दल', 'प्रमाणे', 'शी', 'तून', 'नंतर', 'पेक्षा', 'पैकी', 'सारखे', 'आधीच्या', 'आधी', 'उलटल्यावर', 'इतकी', 'इतका', 'इतके'];
    const breakable = new RegExp(`(?:(?<=[A-Za-z0-9}%)\\]])|^) (?=(?:${words.join('|')})(?=[\\s.,:;!?)“”‘’]|$))`, 'u');
    assert.deepEqual(MR.filter(({ value }) => breakable.test(value)).map((l) => l.path), []);
  });

  it('puts an English bracket after a whole word, never inside one', () => {
    // A bracket followed straight by a Devanagari letter has split a word.
    assert.deepEqual(MR.filter(({ value }) => /\([A-Za-z][^)]*\)[\u0900-\u097f]/u.test(value)).map((l) => l.path), []);
  });

  it('keeps every meta description short enough for search results to show whole', () => {
    // docs/i18n/mr-glossary.md rule 13. Placeholders are filled in before the
    // page is built, so this caps the catalog text; the built pages are
    // checked as well before a change ships.
    const long = MR.filter(({ path, value }) => isMetaDescription(path) && [...value].length > 160).map(
      ({ path, value }) => `${path} (${[...value].length})`,
    );
    assert.deepEqual(long, []);
  });

  it('keeps a level page description short once its lesson count is added', () => {
    // A level page's description is the level's own text followed by
    // `level.meta.descriptionWithCount`, so the two together must fit, with a
    // two-digit count. Inclusive Finances is not one of them: its hub page
    // takes its description from `learn.tags.inclusive-finances.description`.
    const long = Object.entries(mr.learn.levelMeta)
      .filter(([level]) => level !== 'inclusive-finances')
      .map(([level, meta]) => [level, mr.level.meta.descriptionWithCount.replace('{description}', meta.description).replace('{count}', '99')])
      .filter(([, text]) => [...text].length > 160);
    assert.deepEqual(long, []);
  });
});

describe('an English bracket in Hindi or Marathi copy never splits across lines', () => {
  // docs/i18n/hi-glossary.md rule 6 and mr-glossary.md rule 10: the words of a
  // short English gloss, "(net worth)", are joined with U+00A0.
  it('joins the words of every short English bracket with a no-break space', () => {
    const split = [...HI, ...MR]
      .filter(({ value }) => /\((?:[A-Za-z][A-Za-z-]*)(?: [A-Za-z][A-Za-z-]*){1,3}\)/.test(value))
      .map((l) => `${l.path}: ${l.value.match(/\([^)]*\)/)?.[0]}`);
    assert.deepEqual(split, []);
  });
});

describe('the tools name every currency they offer', () => {
  const CODES = CURRENCIES.map((c) => c.code).sort();

  it('names exactly the engine\'s currencies, in both languages', () => {
    assert.deepEqual(Object.keys(currenciesEn).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesHi).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesEs).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesCs).sort(), CODES);
    assert.deepEqual(Object.keys(currenciesMr).sort(), CODES);
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
      assert.ok(
        currenciesMr[c.code].endsWith(`(${c.code})`),
        `${c.code} in Marathi does not end with its own code`,
      );
    }
  });
});

describe('style rules from CLAUDE.md hold in every catalog', () => {  it('uses no em dash, in either its character or entity form', () => {
    const offenders = [...EN, ...HI, ...ES, ...CS, ...MR].filter(({ value }) =>
      /\u2014|&(?:mdash|#8212|#x2014);/i.test(value),
    );
    assert.deepEqual(offenders.map((leaf) => leaf.path), []);
  });

  it('uses no double dash', () => {
    const offenders = [...EN, ...HI, ...ES, ...CS, ...MR].filter(({ value }) => /--/.test(value));
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

describe('the brand tagline', () => {
  // The header shows nav.tagline and structured data carries home.schema.slogan.
  // They are one line per language (docs/color-palette.md, "Tagline").
  it('reads the same in the header and the slogan, in every language', () => {
    for (const locale of LOCALES) {
      const d = dict(locale);
      assert.equal(d.nav.tagline, d.home.schema.slogan, locale);
    }
  });
});

/**
 * A translation carries what its English source carries (#360): the same
 * `{placeholders}`, or the sentence shows with no number, or with a literal
 * `{months}`, in one language only; and the same HTML tags, or a link or an
 * emphasis is lost or left open.
 *
 * A counted string's form for exactly one is the exception. English writes
 * the 1 out ("1 correction"), and a language whose form for one also covers
 * other counts must carry the count instead. Such a form may add placeholders,
 * but only ones its own plural forms use, and it may never drop one.
 */
const placeholdersOf = (value: string): string[] => [...new Set(value.match(/\{\w+\}/g) ?? [])].sort();
const tagsOf = (value: string): string[] => (value.match(/<\/?[a-zA-Z][^>]*>/g) ?? []).map((tag) => tag.replace(/\s[^>]*?(\/?>)$/, '$1')).sort();
const isOneForm = (path: string): boolean => /(One|\.one)$/.test(path);

/** The other forms of a counted string: `paymentsOne` has `payments`, `payments.one` has `payments.other`. */
function siblingForms(path: string, byPath: Map<string, string>): string[] {
  if (path.endsWith('.one')) {
    const group = path.slice(0, -'one'.length);
    return [...byPath].filter(([other]) => other.startsWith(group) && other !== path && !other.slice(group.length).includes('.')).map(([, value]) => value);
  }
  const base = path.slice(0, -'One'.length);
  return [base, `${base}Many`, `${base}Few`, `${base}Other`].map((p) => byPath.get(p)).filter((v): v is string => v !== undefined);
}

describe('translations carry what their English source carries', () => {
  it('keeps the same placeholders, with a form for one free to carry its count', () => {
    const offenders: string[] = [];
    for (const [name, catalog] of TRANSLATED) {
      const byPath = new Map(catalog.map((leaf) => [leaf.path, leaf.value]));
      for (const { path, value } of catalog) {
        const english = placeholdersOf(EN_BY_PATH.get(path) ?? '');
        const own = placeholdersOf(value);
        const dropped = english.filter((p) => !own.includes(p));
        let added = own.filter((p) => !english.includes(p));
        if (isOneForm(path)) {
          const allowed = new Set(siblingForms(path, byPath).flatMap(placeholdersOf));
          added = added.filter((p) => !allowed.has(p));
        }
        if (dropped.length > 0 || added.length > 0) {
          offenders.push(`${name} ${path}: dropped ${dropped.join(' ') || 'none'}, added ${added.join(' ') || 'none'}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });

  it('keeps the same HTML tags', () => {
    const offenders: string[] = [];
    for (const [name, catalog] of TRANSLATED) {
      for (const { path, value } of catalog) {
        const english = tagsOf(EN_BY_PATH.get(path) ?? '').join(' ');
        const own = tagsOf(value).join(' ');
        if (english !== own) offenders.push(`${name} ${path}: English has ${english || 'no tags'}, the translation has ${own || 'no tags'}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it('reads the placeholders and tags it compares', () => {
    assert.deepEqual(placeholdersOf('{count} of {total}, {count} left'), ['{count}', '{total}']);
    assert.deepEqual(tagsOf('See <a href="/x/">the <strong>policy</strong></a>.'), ['</a>', '</strong>', '<a>', '<strong>']);
    assert.equal(isOneForm('tools.x.paymentsOne'), true);
    assert.equal(isOneForm('about.body.correctionsCount.one'), true);
    assert.equal(isOneForm('about.body.tone'), false);
    const forms = new Map([['a.count.one', '1 thing'], ['a.count.other', '{count} things'], ['a.count.link', 'x'], ['a.count.deep.one', '{no}']]);
    assert.deepEqual(siblingForms('a.count.one', forms), ['{count} things', 'x']);
  });
});

/**
 * Every string is used (#360). Copy that is deleted from a page leaves its
 * key behind in five catalogs unless something says so. A key counts as used
 * when its last name appears in the source outside the catalogs, which is how
 * a page reads it (`t.heading`, `strings.cookie.accept`). That is a loose
 * match on purpose: it cannot prove a common name such as `title` is read
 * from this group, but it catches the key whose name nothing mentions.
 *
 * A group read whole (`Object.values(page.works)`) names none of its keys, so
 * those groups are listed here, each with the line that reads it.
 */
const READ_WHOLE = [
  // AboutPage.astro and BeliefsPage.astro: Object.values(...schema.knowsAbout)
  'about.schema.knowsAbout.',
  'beliefs.schema.knowsAbout.',
  // AccessibilityPage.astro: Object.values(page.works), Object.values(page.barriers.items)
  'accessibility.works.',
  'accessibility.barriers.items.',
];

describe('every string is used', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..', '..');
  const CATALOGS = join(ROOT, 'src', 'i18n', 'strings');

  function sourceText(dir: string): string {
    return readdirSync(dir).map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return path === CATALOGS ? '' : sourceText(path);
      return /\.(astro|tsx|ts|js|mjs)$/.test(name) && !/\.test\./.test(name) ? readFileSync(path, 'utf8') : '';
    }).join('\n');
  }

  it('finds the last name of every key somewhere in the source', () => {
    const text = `${sourceText(join(ROOT, 'src'))}\n${readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8')}`;
    // An id used as a key (`net-worth`) is matched whole; an item of a list
    // (`knowsAbout.0`) has no name of its own and is read with its list.
    const named = (name: string) => new RegExp(`(?<![\\w-])${name.replace(/[$]/g, '\\$')}(?![\\w-])`).test(text);
    const verdict = new Map<string, boolean>();
    const unused = EN.map((leaf) => leaf.path).filter((path) => {
      const last = path.split('.').pop()!;
      if (/^\d+$/.test(last) || READ_WHOLE.some((group) => path.startsWith(group))) return false;
      if (!verdict.has(last)) verdict.set(last, named(last));
      return !verdict.get(last);
    });
    assert.deepEqual(unused, [], 'These keys are named nowhere outside the catalogs. Delete them from every catalog, or, if a page reads their whole group, add the group to READ_WHOLE.');
  });

  it('lists only groups that exist', () => {
    for (const group of READ_WHOLE) {
      assert.ok(EN.some((leaf) => leaf.path.startsWith(group)), `${group} is in READ_WHOLE but no key starts with it`);
    }
  });
});

/** A language's catalog and its "What's changed" lines, for the glossary checks. */
function allWords(list: Leaf[], locale: (typeof LOCALES)[number]): Leaf[] {
  const items = [...CHANGE_DAYS.flatMap((day) => day.items), ...Object.values(LAUNCH_ITEMS)];
  return [...list, ...items.map((item) => ({ path: `changes.${item.id}`, value: item.text[locale] }))];
}

describe('each language spells a word one way', () => {
  it('writes Hindi as the glossary does', () => {
    // docs/i18n/hi-glossary.md: the nukta is a decomposed pair, so a word
    // written without one is the bare letter followed by its vowel sign.
    const wrong: Array<[RegExp, string]> = [
      [/क़दम/u, 'कदम'], [/तारीख(?!़)/u, 'तारीख़'], [/तरीक(?!़)/u, 'तरीक़ा'],
      [/(?<![ऀ-ॿ])गलत/u, 'ग़लत'], [/किस्म/u, 'क़िस्म'], [/खत्म/u, 'ख़त्म'],
      [/(?<![ऀ-ॿ])खास/u, 'ख़ास'], [/कीमत/u, 'क़ीमत'], [/हिंदी/u, 'हिन्दी'],
      [/फ़ंड/u, 'फंड'], [/नेट वर्थ/u, 'शुद्ध संपत्ति'], [/टैक्स(?!-लॉस)/u, 'कर'],
    ];
    const found = allWords(HI, 'hi').flatMap(({ path, value }) =>
      wrong.filter(([re]) => re.test(value)).map(([, use]) => `${path}: use ${use}`));
    assert.deepEqual(found, []);
  });

  it('writes Spanish in the glossary\'s neutral words', () => {
    const wrong = /(?<!\p{L})(?:costes?|importes?|montos?|móvil|móviles|celular|ordenador|computadora)(?!\p{L})/iu;
    assert.deepEqual(allWords(ES, 'es').filter(({ value }) => wrong.test(value)).map((l) => l.path), []);
  });

  it('puts a no-break space before a Spanish percent sign', () => {
    // es-glossary.md rule 6, for a figure and for a placeholder that stands for one.
    assert.deepEqual(allWords(ES, 'es').filter(({ value }) => /[\d}] ?%/.test(value)).map((l) => l.path), []);
  });

  it('puts a no-break space before a Czech percent sign', () => {
    // cs-glossary.md rule 6. Written together ("80% šance") it is an adjective.
    assert.deepEqual(allWords(CS, 'cs').filter(({ value }) => /[\d}] %/.test(value)).map((l) => l.path), []);
  });

  it('gives the Czech reader no gender through a participle', () => {
    // cs-glossary.md rule 5: "jste zadali" and "byste měli" both mark the reader.
    const participle = /(?<!\p{L})(?:(?:jste|byste)(?:\s(?:se|si|ho|je|už|také))?\s\p{L}+li|\p{L}+li\sjste)(?!\p{L})/iu;
    assert.deepEqual(allWords(CS, 'cs').filter(({ value }) => participle.test(value)).map((l) => l.path), []);
  });

  it('writes Marathi as the glossary does', () => {
    const wrong = /हिशोब|पेज(?!व्ह)|सिमुले|अॅ|महागाई वजा जाता|मुख्य पान|चेक कोरुना/u;
    assert.deepEqual(allWords(MR, 'mr').filter(({ value }) => wrong.test(value)).map((l) => l.path), []);
  });

  it('quotes English and Hindi with curly marks, never straight double quotes', () => {
    const found = [...allWords(EN, 'en'), ...allWords(HI, 'hi')].filter(({ value }) => /"/.test(value));
    assert.deepEqual(found.map((l) => l.path), []);
  });

  it('calls a lesson a lesson, in every language', () => {
    // The privacy notice says "post" on purpose: it covers the lessons and the
    // optional guides that the newsletter also sends. A cited article and a
    // newsletter's blog are somebody else's.
    const allowed = new Set(['about.body.sourcesCount']);
    const cases = [
      ['en', EN, /\b([Pp]osts?|[Aa]rticles?|[Bb]log)\b/],
      ['hi', HI, /(^|[\s“(])(लेख|लेखों|पोस्ट|पोस्टों|ब्लॉग)(?=[\s।,:.”)]|$)/],
      ['es', ES, /\b([Aa]rtículos?|[Bb]log)\b/],
      ['cs', CS, /[Čč]lán(ek|k)|\b[Bb]log/],
      ['mr', MR, /(^|[\s“(])(लेख|लेखां\S*|लेखात|लेखाचे|लेखाखाली|पोस्ट|ब्लॉग\S*)(?=[\s,:.”)]|$)/],
    ] as const;
    for (const [locale, list, pattern] of cases) {
      const found = list
        .filter((l) => !l.path.startsWith('privacy.') && !allowed.has(l.path) && pattern.test(l.value))
        .map((l) => l.path);
      assert.deepEqual(found, [], locale);
    }
  });

  it('keeps the settled names for a forecast, a spending currency and a loan offer', () => {
    const cases = [
      [EN, /functional currenc|\bvendors?\b(?!\})/i],
      [HI, /मुख्य मुद्रा/],
      [ES, /moneda (de referencia|funcional)/],
      [CS, /předpově[ďd]/],
    ] as const;
    for (const [list, pattern] of cases) {
      assert.deepEqual(list.filter((l) => pattern.test(l.value.replace(/\{vendor\}/g, ''))).map((l) => l.path), []);
    }
  });

  it('speaks as I, or as nobody: only the notice and the cookie question say we', () => {
    // docs/brand-identity.md: "I" where a person acts, neutral where the site does.
    const cases = [
      ['en', EN, /(?<!\p{L})([Ww]e|[Oo]ur|[Oo]urs|us)(?!\p{L})/u],
      ['hi', HI, /(?<![\p{L}\p{M}])(हम|हमें|हमारा|हमारी|हमारे|हमने|हमसे)(?![\p{L}\p{M}])/u],
      ['es', ES, /(?<!\p{L})(nosotros|nuestr[oa]s?|contáctanos|avísanos)(?!\p{L})/iu],
      ['cs', CS, /(?<!\p{L})(nás|nám|náš|naše|naší|našich)(?!\p{L})/iu],
      ['mr', MR, /(?<![\p{L}\p{M}])(आम्ही|आम्हाला|आमचा|आमची|आमचे|आमच्या)(?![\p{L}\p{M}])/u],
    ] as const;
    for (const [locale, list, pattern] of cases) {
      const found = list
        .filter((l) => !/^(privacy|cookie)\./.test(l.path) && pattern.test(l.value))
        .map((l) => l.path);
      assert.deepEqual(found, [], locale);
    }
  });
});
