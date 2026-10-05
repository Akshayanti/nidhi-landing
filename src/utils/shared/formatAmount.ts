/**
 * Money formatting shared by the free tools' charts and readouts.
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
