/**
 * Reads a number the way a reader of the page's language types it.
 *
 * English and Hindi pages group with a comma and mark decimals with a point
 * ("10,000.50"; Hindi also groups in lakhs, "10,00,000"). Spanish pages do the
 * opposite ("10.000,50"). Spaces, no-break spaces and thin spaces are accepted
 * as grouping everywhere, as many readers type them.
 *
 * The page's own convention decides only where the input could be read two
 * ways: "10.000" is ten thousand on a Spanish page and ten on an English one.
 * Where only one reading is possible it is taken whatever the page: "2,5" on an
 * English page cannot be grouping (a group has three digits), so it is two and
 * a half; and with both marks present ("1.234,5" or "1,234.5") the rightmost is
 * the decimal mark. Anything else, such as misplaced groups ("12,34"), two
 * decimal marks or letters, is rejected rather than guessed at.
 *
 * Browser-safe and dependency-free, so any tool's island can import it.
 */

export interface ParseOptions {
  /** Most digits allowed after the decimal mark; more is rejected. */
  maxDecimals?: number;
  /** Accept a leading minus sign (hyphen or U+2212). */
  allowNegative?: boolean;
}

const separatorCache = new Map<string, { group: string; decimal: string }>();

/** The grouping and decimal marks `Intl` uses for a locale. */
export function numberSeparators(locale: string): { group: string; decimal: string } {
  let seps = separatorCache.get(locale);
  if (!seps) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
    const group = parts.find((p) => p.type === 'group')?.value ?? ',';
    const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
    // A locale that groups with a space-like mark leaves '.' and ',' to decimals.
    seps = { group: /\s/.test(group) ? ' ' : group, decimal };
    separatorCache.set(locale, seps);
  }
  return seps;
}

/**
 * A grouped whole number: a first group of one to three digits, then groups of
 * three ("1,234,567"). Indian locales also group in twos before the last three
 * ("10,00,000"), and only they accept that. One separator only.
 */
function ungroup(int: string, sep: string, indian: boolean): string | null {
  if (!int.includes(sep)) return /^\d+$/.test(int) ? int : null;
  const e = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // The whole number matches one system or the other, never a mix of the two
  // ("1,234,56,789" is neither): western groups of three throughout, or, in
  // Indian locales, twos before the last three.
  const western = new RegExp(`^\\d{1,3}(${e}\\d{3})+$`);
  const lakh = new RegExp(`^\\d{1,2}(${e}\\d{2})*${e}\\d{3}$`);
  return western.test(int) || (indian && lakh.test(int)) ? int.split(sep).join('') : null;
}

/** True when `s` is a valid grouped whole number with `sep` as its only separator. */
function isGrouping(s: string, sep: string, indian: boolean): boolean {
  return s.includes(sep) && ungroup(s, sep, indian) !== null;
}

/** Whether a locale groups in lakhs and crores. */
function isIndian(locale: string): boolean {
  return /^(hi|en-IN)\b/i.test(locale) || /-IN$/i.test(locale);
}

/** Parses `raw` by `locale`'s conventions, or returns null when it is not a number. */
export function parseLocaleNumber(raw: string, locale: string, options: ParseOptions = {}): number | null {
  const { maxDecimals = Infinity, allowNegative = false } = options;
  let s = raw.trim().replace(/[   ]/g, ' ');
  let negative = false;
  if (/^[-−]/.test(s)) {
    if (!allowNegative) return null;
    negative = true;
    s = s.slice(1).trimStart();
  }
  if (!/^\d[\d., ]*$/.test(s) || /\d$/.test(s) === false) return null;
  if (/ {2,}/.test(s)) return null;

  const local = numberSeparators(locale);
  const indian = isIndian(locale);
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  let decimal: string | null = null;

  if (hasDot && hasComma) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  } else if (hasDot || hasComma) {
    const mark = hasDot ? '.' : ',';
    const count = s.split(mark).length - 1;
    const intPart = s.replace(/ /g, '');
    if (mark === local.decimal) {
      // The page's decimal mark: one of them is a decimal; several can only be grouping.
      decimal = count === 1 ? mark : null;
    } else if (isGrouping(intPart, mark, indian)) {
      // The page's grouping mark, used as grouping.
      decimal = null;
    } else if (count === 1 && !/^\d{3}$/.test(intPart.split(mark)[1] ?? '')) {
      // The page's grouping mark, but not in groups of three: it can only be a decimal.
      decimal = mark;
    } else {
      return null;
    }
  }

  const [intRaw, frac, extra] = decimal ? s.split(decimal) : [s];
  if (extra !== undefined) return null;
  if (frac !== undefined && !/^\d+$/.test(frac)) return null;
  if (frac !== undefined && frac.length > maxDecimals) return null;

  // Grouping in the whole part: spaces, or the one mark that is not the decimal.
  const groupMarks = new Set(intRaw.match(/[., ]/g) ?? []);
  if (groupMarks.size > 1) return null;
  const sep = [...groupMarks][0];
  if (sep === decimal) return null;
  const int = sep ? ungroup(intRaw, sep, indian) : /^\d+$/.test(intRaw) ? intRaw : null;
  if (int === null) return null;

  const n = Number(frac !== undefined ? `${int}.${frac}` : int);
  if (!Number.isFinite(n)) return null;
  const signed = negative ? -n : n;
  return Object.is(signed, -0) ? 0 : signed;
}

/** Writes a number for an input box in `locale`'s style, without grouping: "2.5" or "2,5". */
export function formatForInput(n: number, locale: string, maxDecimals = 2): string {
  return n.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: maxDecimals });
}
