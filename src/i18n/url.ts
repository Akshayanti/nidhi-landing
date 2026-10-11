/**
 * Path arithmetic for a prefixed locale. Pure functions only, so the hreflang
 * tags, the language picker's no-script hrefs and the tools' switch detection
 * derive the other locale's URL the same way and can be tested without a
 * browser.
 *
 * The live language switch (campaign tags kept, a free tool's state added
 * after the # at click time) is the inline script in `Header.astro`, which is
 * the source of truth for it: it must never put tool state into an href,
 * because PostHog autocapture records a clicked link's href.
 */
import { DEFAULT_LOCALE, LOCALES, localePrefix, localizedPath, type Locale } from './config.ts';

/**
 * Split a pathname into the locale it is served under and the locale-neutral
 * path. `/hi/free/net-worth/` becomes `{ locale: 'hi', path: '/free/net-worth/' }`
 * and `/free/net-worth/` becomes `{ locale: 'en', path: '/free/net-worth/' }`.
 *
 * Only the known locale prefixes are stripped, never a bare two-letter
 * segment. A pattern like /^\/[a-z]{2}\// would misfile a page whose path
 * happens to start with two letters ('/history-of-money/', say), and nothing
 * here prevents such a page existing.
 */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  for (const locale of LOCALES) {
    const prefix = localePrefix(locale);
    if (!prefix) continue;
    if (path === prefix || path === `${prefix}/`) return { locale, path: '/' };
    if (path.startsWith(`${prefix}/`)) return { locale, path: path.slice(prefix.length) };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/** The same page in another locale: `/about/` to Hindi becomes `/hi/about/`. */
export function swapLocale(pathname: string, to: Locale): string {
  return localizedPath(to, stripLocale(pathname).path);
}
