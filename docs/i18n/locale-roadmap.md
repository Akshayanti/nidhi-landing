# Locale roadmap

The site is published in five languages:

- **English** (`en`), at the root.
- **Hindi** (`hi`), at /hi/ (glossary `hi-glossary.md`).
- **Spanish** (`es`), at /es/ (glossary `es-glossary.md`).
- **Czech** (`cs`), at /cs/ since October 20, 2026 (glossary `cs-glossary.md`).
- **Marathi** (`mr`), at /mr/ since October 20, 2026 (glossary `mr-glossary.md`).

The languages below come next, in this order, one at a time. The order is the
owner's decision (October 2026).

1. **Swahili** (`sw`)
2. **French** (`fr`)
3. **Portuguese** (`pt`, Brazilian)
4. **Bengali** (`bn`)
5. **Indonesian** (`id`)

## Checks before a locale is published

Each language follows the rules in `CLAUDE.md`: its catalog is complete before
its routes are published, it gets a glossary here (`<code>-glossary.md`) before
its first strings are written, and every free tool is verified in it before
merging. On top of those:

**The tools work in the reader's own money.** A translated page is of little
use if a reader cannot enter and read amounts in the currency they are paid in.
Before a locale is published:

1. **Every currency its readers use is in the tools' list** (`RAW_CURRENCIES`
   in `src/utils/loan/math.ts`, with a label in every catalog in
   `src/i18n/strings/tools/currencies.ts`). A new currency also goes into
   `src/utils/inflation/countries.ts` for the countries that use it, and the
   catalog strings that state how many currencies the tools support are
   updated in every language.
2. **The tools open in the readers' currency** (`TOOL_DEFAULT_CURRENCY` in
   `src/utils/shared/toolState.ts`).
3. **Amounts are grouped the way the readers write them**, in the tools
   (`TOOL_AMOUNT_LOCALE`) and in the site's own copy (`PROSE_NUMBER_LOCALE`):
   the thousands separator, the decimal mark, the symbol's position, and
   Indian lakh and crore grouping where readers use it.
4. **Short forms on charts cannot be misread.** `formatAmount` abbreviates in
   English (`K`, `M`, `B`), which a Spanish reader took for the wrong scale, so
   Spanish has its own billion. Each new locale is checked the same way.

**A language counts as added only when every check below has passed** on a
build of the branch, for the new language and for every language already
published (a shared component can break the others). The results go in the
pull request.

1. **Tests, lint, typecheck and build** pass, including the catalog tests for
   the new language (no untranslated copy, the script and punctuation its
   glossary sets, meta descriptions within 160 characters).
2. **SEO.** Every page of the new edition declares its `lang`, a canonical
   address in the edition, `og:locale` and `inLanguage`. Every indexed page
   carries hreflang for every edition plus `x-default`, and every other
   edition's twin points back. The sitemap lists the new edition's indexed
   pages with the same hreflang entries as the others. Every indexed meta
   description is at most 160 characters as built, titles are distinct, the
   404 page has a block in the language, and `public/llms.txt` lists it.
3. **Rendering.** Every page at 320, 390 and 1366 pixels wide: no horizontal
   overflow, no element wider than the screen, the language's typeface loaded
   (no fallback boxes), no line that starts with a word the glossary keeps
   on the line before, and the language picker readable with every entry.
   Every placeholder, button and label fits inside its own control at 320
   pixels (its text width measured against the box; a clipped placeholder is
   not a page overflow, so the other checks miss it), and no text runs under
   positioned decoration such as the home page's step-3 sparkline.
   Screenshots of the home page, the learning path, the free tools and the
   privacy notice at phone and laptop sizes are reviewed by the council.
4. **Accessibility.** An automated audit (axe-core in a headless browser,
   WCAG 2.1 A and AA plus best practices) of every page at phone and laptop
   sizes reports no violations. Every accessible name, label, alt text and
   screen-reader-only text on the new edition's pages is in the language
   (English only where the glossary allows it, marked `lang="en"`, such as
   lesson titles), and the language picker names each language in its own
   script with its `lang`.
5. **Privacy.** The `CLAUDE.md` browser check of every free tool, on a
   `PUBLIC_ANALYTICS_TEST=1` build, in every language at phone and laptop
   sizes, finds no typed value in any PostHog payload.
6. **The council signs off** on the glossary, every catalog section, the
   screenshots and the results of the checks above.

## What the published locales settled

Each locale added a case the next ones reuse:

- **Hindi:** lakh and crore grouping, Devanagari fonts, and a plural rule where
  0 takes the singular.
- **Spanish:** its own word for a thousand million on charts (`mil M`), since
  a Spanish reader takes `B` for *billón*, a million millions.
- **Czech:** three plural forms (1, 2 to 4, 5 and more), the first locale with
  more than two: every counted string has a `Few` form and the code picks one
  with `plural()` (`src/i18n/plural.ts`); a language with fewer forms repeats
  its `Many` text. Currency CZK, written `1 058 721 Kč`. Chart short forms in
  Czech (`tis.`, `mil.`, `mld.`), never `B`, since Czech *bilion* is also a
  million millions.
- **Marathi:** Devanagari, sharing the Hindi edition's font file, which also
  carries Marathi's own letters (ळ, ऱ) and its letter forms. Its vocabulary and
  grammar are its own: the Hindi glossary was a reference, not a source. A
  sentence ends with a full stop, never the danda. Digits stay Latin, so dates
  use `mr-IN-u-nu-latn` (plain `mr` writes Devanagari digits). The tools open
  in INR with lakh and crore grouping, and the home page reuses the Hindi
  edition's rupee example. The reader is तुम्ही. One plural form for 1 and
  another for everything else, 0 included.

## Notes per upcoming language

- **Swahili:** Latin script, standardised. Currencies: Kenyan shilling (KES),
  Tanzanian shilling (TZS) and Ugandan shilling (UGX), none supported yet.
  The tools open in KES. The everyday money of
  many readers (mobile money, savings groups, high inflation) is not what the
  lessons and tools describe; translation does not change that.
- **French:** narrow no-break space before `:`, `;`, `?` and `!`, and as the
  thousands separator. Currencies: EUR, CHF and CAD are supported; the West and
  Central African CFA francs (XOF, XAF) and the Congolese franc (CDF) are not.
  Chart short forms: French *billion* is a million millions (*Md* for a
  thousand million).
- **Portuguese:** Brazilian Portuguese. Close to the Spanish catalog in
  structure, but translated from English, not from Spanish. Currency: BRL,
  already supported; written `R$ 1.058.721`. The Angolan kwanza (AOA) and the
  Mozambican metical (MZN) are not supported.
- **Bengali:** a new script and font, and Bengali digits as a formatting choice
  to settle in its glossary. Currencies: INR (West Bengal) is supported; the
  Bangladeshi taka (BDT), the currency of most Bengali speakers, is not. Both
  use lakh and crore grouping. The tools open in BDT.
- **Indonesian:** Latin script, no grammatical plural forms. Currency: IDR,
  already supported; written `Rp 1.058.721`. Chart short forms: Indonesian
  writes *rb*, *jt*, *M* and *T* (thousand, million, *miliar*, trillion), so
  an `M` meaning million would be read as a thousand times too large.

Not on the list for now: Arabic and Urdu, which need the layout to support
right-to-left first.
