# Locale roadmap

The site is published in five languages:

- **English** (`en`), at the root.
- **Hindi** (`hi`), at /hi/ (glossary `hi-glossary.md`).
- **Spanish** (`es`), at /es/ (glossary `es-glossary.md`).
- **Czech** (`cs`), at /cs/ since October 20, 2026 (glossary `cs-glossary.md`).
- **Marathi** (`mr`), at /mr/ since October 20, 2026 (glossary `mr-glossary.md`).

The languages below come next, in this order, one at a time. The rule is the
owner's decision (October 20, 2026): **rank by the number of people who read
the language** (as a first, second or third language), **with at most two
editions per region**, so the editions reach as many readers as possible
while covering different parts of the world. A language counts towards the
region where most of its readers live (Spanish: Latin America; English is
global and counts nowhere). A language is left out where the site's channels
are blocked or the law conflicts with the privacy notice. Reader figures are
rounded estimates from speaker counts (Ethnologue-based tables) and national
literacy rates:

1. **French** (`fr`), Africa: about 270 to 290 million readers. Most
   second-language speakers in West and Central Africa learned it at school,
   where it is the language of teaching and paperwork.
2. **Portuguese** (`pt`, Brazilian), Latin America, the second edition there
   after Spanish: about 235 to 245 million.
3. **Indonesian** (`id`), Southeast Asia: about 230 to 240 million; mostly a
   second language, but the language of school and government, with
   literacy near 96%.
4. **German** (`de`), Europe, the second edition there after Czech: about
   135 million.
5. **Japanese** (`ja`), East Asia: about 125 million.
6. **Vietnamese** (`vi`), Southeast Asia, the second there: about 97
   million.
7. **Turkish** (`tr`), West Asia: about 94 million.
8. **Korean** (`ko`), East Asia, the second there: about 82 million.

**Later, once the layout supports right-to-left:** Arabic, for the Middle
East and North Africa.

**Not planned, and why:**

- **Bengali** (about 200 to 220 million readers) and **Urdu**: South Asia
  already has two editions (Hindi, Marathi).
- **Swahili**: far fewer readers than the languages above. About 5 to 18
  million native speakers; most second-language speakers use it spoken, and
  in Kenya and Uganda money is mostly read about in English.
- **Russian**: Instagram is blocked in Russia, and its data-localisation law
  conflicts with how the site stores and processes data.
- **Chinese (mainland, Simplified)**: Instagram, Google and likely the
  analytics and hosting are blocked or unreliable behind the Great Firewall,
  and deliberately serving mainland readers would bring in China's data
  protection law (PIPL), which the privacy notice does not cover.
  Traditional Chinese (Taiwan, Hong Kong; about 30 million readers) has
  neither problem and is the alternative for East Asia if wanted.

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

- **French:** narrow no-break space before `:`, `;`, `?` and `!`, and as the
  thousands separator. Currencies: EUR, CHF, CAD, the West and Central
  African CFA francs (XOF, XAF) and the Congolese franc (CDF) are all
  supported. Chart short forms: French *billion* is a million millions (*Md*
  for a thousand million).
- **Portuguese:** Brazilian Portuguese. Close to the Spanish catalog in
  structure, but translated from English, not from Spanish. Currency: BRL,
  written `R$ 1.058.721`; the Angolan kwanza (AOA) and the Mozambican metical
  (MZN) are supported too.
- **Indonesian:** Latin script, no grammatical plural forms. Currency: IDR,
  already supported; written `Rp 1.058.721`. Chart short forms: Indonesian
  writes *rb*, *jt*, *M* and *T* (thousand, million, *miliar*, trillion), so
  an `M` meaning million would be read as a thousand times too large.
- **German:** formal *Sie* or informal *du* is the first glossary decision.
  Long compound words (*Vermögensaufstellung*) are the 320 px risk: headings
  and buttons need hyphenation or room. Currencies EUR and CHF are
  supported; amounts are written `1.058.721 €`.
- **Japanese:** a Japanese font is far larger than a Latin or Devanagari one,
  so it is subset or loaded only on Japanese pages; line breaking follows
  Japanese rules, not spaces. No plural forms. Large numbers group by ten
  thousand (*man*, *oku*), which the chart short forms must follow. JPY is
  supported and has no decimals.
- **Vietnamese:** Latin script with stacked diacritics, which needs the
  Vietnamese ranges of the site's fonts. The Vietnamese dong (VND) is not
  supported yet and has to be added to the tools first; it has no decimals.
- **Turkish:** the dotted and dotless i: uppercasing must follow Turkish
  rules (`i` to `İ`), so any `text-transform: uppercase` on Turkish pages is
  checked. TRY is supported; high inflation makes the inflation calculator's
  wide rate range matter. Instagram was blocked in Turkey for nine days in
  2024, so it is a less dependable channel than elsewhere.
- **Korean:** Hangul needs its own font, smaller than Japanese but still
  loaded only on Korean pages. Large numbers also group by ten thousand
  (*man*, *eok*). KRW is supported and has no decimals.

Arabic follows the list above once the layout supports right-to-left; see
"Not planned" for the languages left out and why.
