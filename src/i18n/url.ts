/**
 * Path arithmetic for a prefixed locale. Pure functions only, so the language
 * switcher, the hreflang tags and the sitemap all derive the other locale's URL
 * the same way and can be tested without a browser.
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

/**
 * Keep only campaign parameters, returning '' or a string starting with '?'.
 * Used by the language switcher so a switch carries `utm_source` and friends
 * but drops anything else an address might hold. Free-tool state is never in
 * the query string (it travels after the `#`), so nothing else needs keeping.
 */
export function utmSearch(search: string): string {
  const keep = new URLSearchParams();
  new URLSearchParams(search).forEach((value, key) => {
    if (key.startsWith('utm_')) keep.append(key, value);
  });
  const out = keep.toString();
  return out ? `?${out}` : '';
}

/**
 * The href a language switcher should point at. `hash` may be given with or
 * without its leading '#'; an empty one means no fragment. The fragment
 * matters for the free tools, where a share link carries the tool state after
 * the '#', a part of the address browsers never send to a server.
 */
export function localizedHref(to: Locale, pathname: string, search = '', hash = ''): string {
  const fragment = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `${swapLocale(pathname, to)}${utmSearch(search)}${fragment}`;
}
