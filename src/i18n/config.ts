export const DEFAULT_LOCALE = 'en' as const;

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_META: Record<Locale, { label: string; htmlLang: string; ogLocale: string }> = {
  en: { label: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  es: { label: 'Español', htmlLang: 'es', ogLocale: 'es_ES' },
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

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
