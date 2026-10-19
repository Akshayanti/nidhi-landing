/**
 * Locale registry.
 *
 * English is the default locale and stays where it is: the site root, with no
 * prefix, no redirect and no query parameter. Every other locale lives under
 * its own single-segment prefix: Hindi at /hi/, Spanish at /es/, Czech at /cs/.
 *
 * The path is the only place a locale is recorded. Nothing is written to
 * localStorage for it, and there is no automatic redirect from Accept-Language
 * or navigator.language, so a shared link always opens in the language it
 * names. That also means the same browser storage keys serve every locale
 * (see the privacy changelog), which is why none of the helpers here touch
 * storage.
 *
 * The shape follows the unmerged `i18n-spanish` branch (LOCALE_META, prefix
 * helpers). That branch predates a lot of what main has since added, so it is
 * reference only and was not merged.
 */
export const DEFAULT_LOCALE = 'en' as const;

export const LOCALES = ['en', 'hi', 'es', 'cs'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Each locale's own name for itself, in its own script, plus the tags the
 * document and its structured data need. `label` is the same string on every
 * page and in every catalog, which is why it is here rather than in the string
 * files: the language picker reads it, and adding a locale adds a row here and
 * no translated strings.
 */
export const LOCALE_META: Record<Locale, { label: string; htmlLang: string; ogLocale: string }> = {
  en: { label: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  hi: { label: 'हिन्दी', htmlLang: 'hi', ogLocale: 'hi_IN' },
  es: { label: 'Español', htmlLang: 'es', ogLocale: 'es_ES' },
  cs: { label: 'Čeština', htmlLang: 'cs', ogLocale: 'cs_CZ' },
};

/**
 * The BCP-47 tag to hand to `Intl` (a lesson card's short month, for instance),
 * keyed by locale. Kept apart from `htmlLang` because the two answer different
 * questions: `htmlLang` is what the document declares, while this is the
 * region-specific tag that decides how a date is written. Spelling it out
 * rather than deriving it keeps the English pages rendering exactly what they
 * rendered before the locale plumbing existed.
 */
export const DATE_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  // Plain 'es', not 'es-ES' or 'es-419': the Spanish edition is written for
  // every Spanish-speaking country, and the dates it prints read the same in
  // all of them.
  es: 'es',
  cs: 'cs-CZ',
};

/**
 * How a figure in the site's own copy is written in each edition: the home
 * page's worked example, its chart, and any amount a catalog string quotes.
 * English readers write `€10,000`, Hindi readers `₹1,50,000` (the Hindi example
 * is in rupees, see `EXAMPLE_CURRENCY`). A Spanish reader reads
 * `10,000` as ten with three decimals, so the Spanish edition writes
 * `10.000 €`, as the RAE and every euro country that speaks Spanish do.
 * Czech groups with a no-break space and writes the symbol after the number,
 * `10 000 Kč` (the Czech example is in koruna, see `EXAMPLE_CURRENCY`).
 *
 * Lessons are not affected: they are English and keep English figures. The
 * free tools format an amount by the currency the reader chose, except on a
 * page with its own amount style (`TOOL_AMOUNT_LOCALE`), which agrees with this.
 */
export const PROSE_NUMBER_LOCALE: Record<Locale, string> = {
  en: 'en',
  // Indian grouping: the Hindi example is in rupees, written ₹1,50,000 and,
  // abbreviated on a chart, ₹1.5L and ₹2.3Cr, as Indian readers write them.
  hi: 'en-IN',
  es: 'es',
  cs: 'cs',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** '' for the default locale, '/hi' for Hindi. Never ends in a slash. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Prefix a site-absolute path with the locale. The path keeps whatever
 * trailing slash it was given: `trailingSlash: 'always'` means callers should
 * pass '/about/' rather than '/about', and this helper deliberately does not
 * guess.
 */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${localePrefix(locale)}${normalized}`;
}

/**
 * A lesson's address. Lessons are written once, in English, and are not
 * translated: a page in another language lists the English lessons and links
 * to them here, at their one address. There is deliberately no locale argument,
 * because there is no second address to get wrong, and a shared lesson link
 * opens the lesson rather than a copy of it.
 *
 * The learning path's own pages (the index, a level page, a topic page, the
 * hubs) are chrome and are translated, so those keep a locale and go through
 * `localizedPath` or `blogTagPath`.
 */
export function lessonPath(slug: string): string {
  return `/blog/${slug}/`;
}

export function blogTagPath(locale: Locale, tag: string): string {
  return localizedPath(locale, `/blog/tag/${encodeURIComponent(tag)}/`);
}
