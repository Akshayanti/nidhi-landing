/**
 * The one import site for locale plumbing: `import { dict, localizedPath,
 * type Locale } from '../i18n'`.
 */
import type { Locale } from './config.ts';
import { en } from './strings/en.ts';
import { hi } from './strings/hi.ts';
import type { Dict } from './strings/types.ts';

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  DATE_LOCALE,
  isLocale,
  localePrefix,
  localizedPath,
  lessonPath,
  blogTagPath,
} from './config.ts';
export type { Locale } from './config.ts';
export { stripLocale, swapLocale, utmSearch, localizedHref } from './url.ts';
export { format } from './format.ts';
export type { Dict } from './strings/types.ts';

/**
 * Every catalog, keyed by locale. The `Record<Locale, Dict>` type means adding
 * a locale to `LOCALES` without adding its catalog fails the build, which is
 * the intended way to find out.
 */
export const DICTS: Record<Locale, Dict> = { en, hi };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}
