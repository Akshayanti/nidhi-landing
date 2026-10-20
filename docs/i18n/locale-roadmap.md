# Locale roadmap

The site is published in four languages:

- **English** (`en`), at the root.
- **Hindi** (`hi`), at /hi/ (glossary `hi-glossary.md`).
- **Spanish** (`es`), at /es/ (glossary `es-glossary.md`).
- **Czech** (`cs`), at /cs/ since October 20, 2026 (glossary `cs-glossary.md`).

The languages below come next, in this order, one at a time. The order is the
owner's decision (October 2026).

1. **Marathi** (`mr`)
2. **Swahili** (`sw`)
3. **French** (`fr`)
4. **Portuguese** (`pt`, Brazilian)
5. **Bengali** (`bn`)
6. **Indonesian** (`id`)

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

## Notes per upcoming language

- **Marathi:** Devanagari, like Hindi, so the fonts are already in place.
  Marathi has its own vocabulary and grammar: the Hindi glossary is a
  reference, not a source. Currency: INR, already supported, with lakh and
  crore grouping as on the Hindi edition.
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
