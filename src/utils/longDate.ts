/**
 * The one way the site writes a full date in prose: "November 10, 2026" in
 * English, and each other language in its own order.
 *
 * English follows `DATE_LOCALE.en` (month, day, year), the form the lessons,
 * the privacy notice and the free tools already print, so a guide and the
 * lesson it links to write the same day the same way (#350).
 *
 * Always UTC. A publication, correction or "last checked" date is stored as a
 * UTC midnight, so formatting it in the build machine's own time zone would
 * print the day before on any machine west of UTC.
 */
import { DATE_LOCALE, DEFAULT_LOCALE, type Locale } from '../i18n/config.ts';

/** A date in full, in the given language's order, read in UTC. */
export function formatLongDate(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(DATE_LOCALE[locale], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** A date in full for English content (lessons and guides): "November 10, 2026". */
export function formatEnglishDate(date: Date): string {
  return formatLongDate(date, DEFAULT_LOCALE);
}
