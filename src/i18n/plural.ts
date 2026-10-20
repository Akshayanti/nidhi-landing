/**
 * Picks a counted string's form for a number.
 *
 * Catalogs carry three forms for every count: `One` (exactly 1), `Few` and
 * `Many` (`one`, `few`, `other` in the tools). English, Hindi and Spanish
 * need only two, so their `Few` is the same text as their `Many`. Czech needs
 * all three: 1 lekce, 2 to 4 lekce, 0 and 5 or more lekcí.
 *
 * `one` is exactly 1 in every language, as it was before this helper: Hindi's
 * plural rule also puts 0 in `one`, and the Hindi edition has always written 0
 * with its plural form. `few` comes from `Intl.PluralRules`, which returns it
 * only for languages that have it (Czech: 2, 3 and 4). Anything else, including
 * Czech's `many` (decimals, "1,5 roku"), takes the `other` form; no counted
 * string on the site is ever given a decimal (docs/i18n/cs-glossary.md, rule 8).
 *
 * `tag` is a BCP-47 tag: an island's `numberLocale`, or `PROSE_NUMBER_LOCALE`
 * on a page.
 */
const rulesCache = new Map<string, Intl.PluralRules>();

export function pluralForm(tag: string, n: number): 'one' | 'few' | 'other' {
  if (n === 1) return 'one';
  let rules = rulesCache.get(tag);
  if (!rules) {
    rules = new Intl.PluralRules(tag);
    rulesCache.set(tag, rules);
  }
  return Number.isInteger(n) && rules.select(n) === 'few' ? 'few' : 'other';
}

/** The form of a counted string for `n`: `plural(tag, n, s.xOne, s.xFew, s.xMany)`. */
export function plural<T>(tag: string, n: number, one: T, few: T, other: T): T {
  const form = pluralForm(tag, n);
  return form === 'one' ? one : form === 'few' ? few : other;
}
