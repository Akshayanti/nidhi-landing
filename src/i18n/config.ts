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

export function blogPath(locale: Locale): string {
  return localizedPath(locale, '/blog/');
}

export function blogPostPath(locale: Locale, slug: string): string {
  return localizedPath(locale, `/blog/${slug}/`);
}

export function blogTagPath(locale: Locale, tag: string): string {
  return localizedPath(locale, `/blog/tag/${encodeURIComponent(tag)}/`);
}
