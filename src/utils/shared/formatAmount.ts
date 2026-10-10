/**
 * Money formatting shared by the free tools' charts and readouts, and by the
 * illustrative figures the site quotes in its own writing. The two are not the
 * same rule; see `formatProseAmount` for the second.
 */
import { getCurrency } from '../loan/math.ts';

/**
 * Amounts use the chosen currency's own conventions (separators, symbol
 * placement), like the other free tools. Short forms for chart labels keep
 * those conventions but always abbreviate in English: the browser's compact
 * notation would write "Mio.", "mln" or "万" on an English page. English
 * locales already abbreviate in English (and en-IN in lakh and crore), so
 * they use it as is.
 */
export function formatAmount(value: number, code: string, compact = false): string {
  const { locale } = getCurrency(code);
  const v = Math.round(value);
  if (!compact) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(v);
  }
  if (locale.startsWith('en-')) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, notation: 'compact', maximumSignificantDigits: 3 }).format(v);
  }
  const abs = Math.abs(v);
  const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumSignificantDigits: 3 }).formatToParts(v / div);
  let lastNumeric = -1;
  parts.forEach((p, i) => {
    if (p.type === 'integer' || p.type === 'group' || p.type === 'decimal' || p.type === 'fraction') lastNumeric = i;
  });
  return parts.map((p, i) => p.value + (i === lastNumeric ? suffix : '')).join('');
}

/**
 * A percentage in the chosen currency's number conventions, so it matches the
 * amounts beside it ("44,1 %" next to "50.000,00 €", "44.1%" next to "$50,000.00").
 */
export function formatPercent(pct: number, code: string, digits = 1): string {
  const { locale } = getCurrency(code);
  const v = Number.isFinite(pct) ? pct / 100 : 0;
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/**
 * An amount as the site's own writing spells it: symbol first, a comma between
 * thousands, in every currency. That is how all 78 lessons write one, whether
 * the figure is quoted in euros ("€10,000"), pounds ("£120,000"), dollars
 * ("$250,000") or rupees ("₹1.25 lakh"), and it is what the homepage's worked
 * example and hero chart have to agree with, since those figures sit inside
 * sentences that use the same numbers.
 *
 * `formatAmount` above is the other case: a tool the reader is operating takes
 * the chosen currency's own conventions, so a euro figure there reads
 * "1.058.721 €" beside "44,1 %" and a rupee one "₹10,58,721". A figure quoted in
 * a sentence has no currency choice to honour, and a reader who meets
 * "9.000 €" in a Hindi sentence reads it as nine point zero zero zero.
 *
 * The locale is fixed rather than taken from the page, because a lesson keeps
 * an amount exactly as the English writes it in every edition, so a figure and
 * the sentence around it must not drift apart when a new locale arrives.
 */
const PROSE_LOCALE = 'en';

export function formatProseAmount(value: number, code: string, compact = false): string {
  const v = Math.round(value);
  if (!compact) {
    return new Intl.NumberFormat(PROSE_LOCALE, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(v);
  }
  return new Intl.NumberFormat(PROSE_LOCALE, {
    style: 'currency',
    currency: code,
    notation: 'compact',
    maximumSignificantDigits: 3,
  }).format(v);
}
