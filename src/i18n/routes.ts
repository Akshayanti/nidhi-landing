/**
 * Helpers for the `[locale]` route mirror.
 *
 * Every page that exists in more than one language is a pair: an English file
 * at its root path (`src/pages/about.astro`), and a generic route under
 * `src/pages/[locale]/` whose `getStaticPaths` returns only the non-default
 * locales. That way the default locale's URLs stay exactly where they were and
 * cannot be shadowed by the mirror, and adding a language later is a matter of
 * adding it to `LOCALES` rather than of copying twenty files.
 *
 * These two functions are the whole of the pattern, kept together so the guard
 * in `routeLocale` cannot be left out of one mirrored route and quietly
 * generate a second copy of the English page at a prefixed address.
 */
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from './config.ts';

/** The locales a mirrored route generates, which is every locale but the default one. */
export const MIRRORED_LOCALES: readonly Locale[] = LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

/**
 * `getStaticPaths` for a mirrored route. The page file still has to export its
 * own `getStaticPaths` (Astro reads it off the route module), so it delegates
 * here.
 */
export function localizedStaticPaths(): Array<{ params: { locale: string } }> {
  return MIRRORED_LOCALES.map((locale) => ({ params: { locale } }));
}

/**
 * The locale a mirrored route was generated for.
 *
 * Throws rather than falling back. A fallback would turn a routing mistake
 * into an English page served at a prefixed address: a duplicate that search
 * engines would index and that nothing in the build would report. A failed
 * build is the better end of that trade.
 */
export function routeLocale(params: Record<string, string | undefined>): Locale {
  const locale = params.locale;
  if (!isLocale(locale) || locale === DEFAULT_LOCALE) {
    throw new Error(
      `a [locale] route was asked for the locale ${JSON.stringify(locale)}, but mirrored ` +
        `routes generate only ${MIRRORED_LOCALES.join(', ') || '(none)'}`,
    );
  }
  return locale;
}
