/**
 * Locale registry.
 *
 * English is the default locale and stays where it is: the site root, with no
 * prefix, no redirect and no query parameter. Every other locale lives under
 * its own single-segment prefix. Hindi is the first of them, at /hi/.
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

export const LOCALES = ['en', 'hi'] as const;

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
