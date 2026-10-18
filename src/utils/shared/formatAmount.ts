/**
 * Money formatting shared by the free tools' charts and readouts, and by the
 * illustrative figures the site quotes in its own writing. The two are not the
 * same rule; see `formatProseAmount` for the second.
 */
import { amountStyle } from '../loan/math.ts';
import { DEFAULT_LOCALE, PROSE_NUMBER_LOCALE, type Locale } from '../../i18n/config.ts';

/**
 * Amounts use the chosen currency's own conventions (separators, symbol
 * placement), like the other free tools. Short forms for chart labels keep
 * those conventions but always abbreviate in English: the browser's compact
 * notation would write "Mio.", "mln" or "万" on an English page. English
 * locales already abbreviate in English (and en-IN in lakh and crore), so
 * they use it as is.
 *
 * `amountLocale` is the page's own number style where it has one
 * (`TOOL_AMOUNT_LOCALE`): every currency is then written in that style, with
 * its narrow symbol ("1.058.721 €", "1,06M £" on a Spanish page), and a
 * Spanish page writes billions as "mil M".
 */
export function formatAmount(value: number, code: string, compact = false, amountLocale?: string | null): string {
  const { locale, display } = amountStyle(code, amountLocale);
  const v = Math.round(value);
  if (!compact) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: display, maximumFractionDigits: 0 }).format(v);
  }
  if (locale.startsWith('en-')) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, notation: 'compact', maximumSignificantDigits: 3 }).format(v);
  }
  const abs = Math.abs(v);
  // A Spanish reader takes "B" for billón, a million millions: "2,5 mil M €".
  const billion = amountLocale?.startsWith('es') ? ' mil M' : 'B';
  const [div, suffix] = abs >= 1e9 ? [1e9, billion] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: display, maximumSignificantDigits: 3 }).formatToParts(v / div);
  let lastNumeric = -1;
  parts.forEach((p, i) => {
    if (p.type === 'integer' || p.type === 'group' || p.type === 'decimal' || p.type === 'fraction') lastNumeric = i;
  });
  return parts.map((p, i) => p.value + (i === lastNumeric ? suffix : '')).join('');
}

/**
 * A percentage in the same number conventions as the amounts beside it: the
 * chosen currency's ("44,1 %" next to "1 000 Kč", "44.1%" next to "$50,000.00"),
 * or the page's own where it has one (`amountLocale`).
 */
export function formatPercent(pct: number, code: string, digits = 1, amountLocale?: string | null): string {
  const { locale } = amountStyle(code, amountLocale);
  const v = Number.isFinite(pct) ? pct / 100 : 0;
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/**
 * An amount as the site's own writing spells it. In English that is symbol
 * first and a comma between thousands, in every currency, which is how all 78
 * lessons write one, whether
 * the figure is quoted in euros ("€10,000"), pounds ("£120,000"), dollars
 * ("$250,000") or rupees ("₹1.25 lakh"), and it is what the homepage's worked
 * example and hero chart have to agree with, since those figures sit inside
 * sentences that use the same numbers.
 *
 * `formatAmount` above is the other case, for a tool the reader is operating
 * and a currency they chose there: it follows that currency's own conventions,
 * so a rupee figure reads "₹10,58,721" beside "44,1 %". A figure quoted inside a
 * sentence has no such choice to honour and follows the sentence, which is why
 * the two rules are separate even though they now agree for euros (EUR is
 * formatted the Irish way, "€1,058,721", in both).
 *
 * Lessons are English in every edition and keep English figures. The site's
 * own copy follows its edition's reader instead (`PROSE_NUMBER_LOCALE`): an
 * English or Hindi page writes `€10,000`, a Spanish page `10.000 €`. The
 * catalog strings that quote an amount literally are written to agree.
 */
export function formatProseAmount(
  value: number,
  code: string,
  compact = false,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const tag = PROSE_NUMBER_LOCALE[locale];
  const v = Math.round(value);
  if (!compact) {
    return new Intl.NumberFormat(tag, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(v);
  }
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: code,
    notation: 'compact',
    maximumSignificantDigits: 3,
  }).format(v);
}

/** A whole percentage in the edition's own style: `7%` in English, `7 %` in Spanish. */
export function formatProsePercent(fraction: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(PROSE_NUMBER_LOCALE[locale], { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}
