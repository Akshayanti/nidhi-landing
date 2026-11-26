/**
 * Reads a number the way a reader of the page's language types it.
 *
 * English and Hindi pages group with a comma and mark decimals with a point
 * ("10,000.50", or in lakhs, "10,00,000", which no western number resembles,
 * so it is read on every page). Spanish pages do the
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
 * The Arabic decimal mark "٫" (U+066B) and thousands mark "٬" (U+066C), as an
 * Arabic or Persian keyboard types them, mean one thing only, so the page's
 * convention never enters into them (#625):
 *   - "٫" is always the decimal mark, on every page: "٢٫٥" is two and a half,
 *     and "١٫٢٣٤" is 1.234, never one thousand two hundred and thirty-four,
 *     even on a page whose own decimal mark is a comma;
 *   - "٬" is always grouping, in groups of three (or Indian twos before the
 *     last three, as with a comma): "١٬٢٣٤" is 1234, and "٢٬٥" is rejected,
 *     not read as two and a half;
 *   - a number holding either of them and a Latin point or comma ("١٬٢٣٤.٥",
 *     "1.234٫5") is rejected rather than guessed at. Spaces may group the whole
 *     part in place of "٬", but not alongside it, as with the Latin marks.
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
 * three ("1,234,567"). Comma grouping may also be Indian, twos before the last
 * three ("10,00,000"): no western number looks like that, so it is read on any
 * page rather than turned away. One separator only.
 */
function ungroup(int: string, sep: string): string | null {
  const e = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // The whole number matches one system or the other, never a mix of the two
  // ("1,234,56,789" is neither): western groups of three throughout, or, in
  // comma-grouped numbers, twos before the last three.
  // No grouped whole number starts with a zero: "0.125" can only be a
  // decimal, whatever the page's grouping mark is.
  const western = new RegExp(`^[1-9]\\d{0,2}(${e}\\d{3})+$`);
  const lakh = new RegExp(`^[1-9]\\d?(${e}\\d{2})*${e}\\d{3}$`);
  return western.test(int) || (sep === ',' && lakh.test(int)) ? int.split(sep).join('') : null;
}

/** True when `s` is a valid grouped whole number with `sep` as its only separator. */
function isGrouping(s: string, sep: string): boolean {
  return ungroup(s, sep) !== null;
}

/**
 * Digits typed from a Devanagari, Arabic-Indic or Persian keyboard, as the
 * Latin digits the tools work in: "१२३" is 123 on every page. The site writes
 * Latin digits everywhere, but a reader's keyboard may not.
 */
export function latinDigits(text: string): string {
  return text.replace(/[\u0966-\u096f\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c - (c >= 0x0966 ? 0x0966 : c >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

/** The Arabic decimal mark (U+066B), a decimal on every page. */
const ARABIC_DECIMAL = '\u066b';
/** The Arabic thousands mark (U+066C), grouping on every page. */
const ARABIC_GROUP = '\u066c';

/** Parses `raw` by `locale`'s conventions, or returns null when it is not a number. */
export function parseLocaleNumber(raw: string, locale: string, options: ParseOptions = {}): number | null {
  const { maxDecimals = Infinity, allowNegative = false } = options;
  let s = latinDigits(raw).trim().replace(/[   ]/g, ' ');
  let negative = false;
  if (s[0] === '-' || s[0] === '−') {
    if (!allowNegative) return null;
    negative = true;
    s = s.slice(1).trimStart();
  }
  if (!/^\d[\d., \u066b\u066c]*$/.test(s) || /\d$/.test(s) === false) return null;
  if (/ {2,}/.test(s)) return null;

  const local = numberSeparators(locale);
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  const hasArabic = /[\u066b\u066c]/.test(s);
  let decimal: string | null = null;

  if (hasArabic) {
    // Arabic marks have one reading each; mixed with Latin ones, none (#625).
    if (hasDot || hasComma) return null;
    decimal = s.includes(ARABIC_DECIMAL) ? ARABIC_DECIMAL : null;
  } else if (hasDot && hasComma) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  } else if (hasDot || hasComma) {
    const mark = hasDot ? '.' : ',';
    const count = s.split(mark).length - 1;
    if (mark === local.decimal) {
      // The page's decimal mark: one of them is a decimal; several can only be grouping.
      decimal = count === 1 ? mark : null;
    } else if (isGrouping(s, mark)) {
      // The page's grouping mark, used as grouping: there is no decimal mark.
    } else if (count === 1 && (!/^\d{3}$/.test(s.split(mark)[1]) || /^0+$/.test(s.split(mark)[0]))) {
      // The page's grouping mark, but not in groups of three, or after a
      // whole part of zero ("0.125"): it can only be a decimal.
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
  const groupMarks = new Set(intRaw.match(/[., \u066b\u066c]/g) ?? []);
  if (groupMarks.size > 1) return null;
  const sep = [...groupMarks][0];
  // "٬" groups exactly as a comma does, Indian grouping included. Without a
  // mark the whole part is digits: the first check allowed nothing else.
  const int = sep === ARABIC_GROUP
    ? ungroup(intRaw.split(ARABIC_GROUP).join(','), ',')
    : sep ? ungroup(intRaw, sep) : intRaw;
  if (int === null) return null;

  const parsed = Number(frac !== undefined ? `${int}.${frac}` : int);
  // More than 308 digits is past what a number can hold. It is still a number
  // the reader typed, and a very large one, so it is read as the largest there
  // is: the tool then says "too large", not "enter a number" (#520).
  const n = Number.isFinite(parsed) ? parsed : Number.MAX_VALUE;
  const signed = negative ? -n : n;
  return Object.is(signed, -0) ? 0 : signed;
}

/** Writes a number for an input box in `locale`'s style, without grouping: "2.5" or "2,5". */
export function formatForInput(n: number, locale: string, maxDecimals = 2): string {
  return n.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: maxDecimals });
}

/**
 * What an input box hands a tool whose state holds plain number strings: the
 * number in JavaScript's own spelling ("2.5", "10000"), '' for an empty box, or
 * 'NaN' when the box holds something that is not a number on this page, so the
 * tool shows its usual error instead of reading the text some other way.
 */
export function canonicalNumber(raw: string, locale: string): string {
  const t = raw.trim();
  if (t === '') return '';
  const n = parseLocaleNumber(completeNumber(t, locale), locale);
  if (n === null) return 'NaN';
  // From 1e21 up a number prints as "1e+21", which no engine here reads: a
  // 22-digit loan amount was answered with "greater than zero" (#520). Plain
  // digits, so the engine can say it is too large.
  return plainDigits(n);
}

/**
 * A number as a link carries it. String() writes an exponent from 1e21 up and
 * below a millionth, which a link refuses: a valid 0.0000001 arrived as
 * unreadable, and rounded to ten or twenty decimals an invalid one arrived as
 * a valid zero (#789). Every digit is kept, none rounded.
 */
export function plainDigits(n: number): string {
  if (Math.abs(n) >= 1e21) return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 });
  const [mantissa, exponent] = String(n).split('e-');
  if (exponent === undefined) return mantissa;
  const digits = mantissa.replace(/[-.]/g, '');
  return `${mantissa.startsWith('-') ? '-' : ''}0.${'0'.repeat(Number(exponent) - 1)}${digits}`;
}

/**
 * A number as readers leave it in a box, made whole: "2," is a number still
 * being typed and ",5" a short way to write 0,5, with the page's own decimal
 * mark (".5" and "5." on an English page). Every tool reads these the same way
 * (#520): a tool that parses its own boxes passes the text through here first.
 * A leading minus sign is kept where it is.
 */
export function completeNumber(raw: string, locale: string): string {
  const t = raw.trim();
  // Arabic marks mixed with Latin ones have no reading (#625): taking one off
  // the end here would hide the mixture from the parser that refuses it.
  if (/[\u066b\u066c]/.test(t) && /[.,]/.test(t)) return t;
  const sign = /^[-−]/.test(t) ? t[0] : '';
  let body = t.slice(sign.length).trimStart();
  const { decimal } = numberSeparators(locale);
  // The Arabic decimal mark is a decimal on every page, so it completes too.
  const isDecimal = (mark: string) => mark === decimal || mark === ARABIC_DECIMAL;
  if (body.length > 1 && isDecimal(body.slice(-1))) body = body.slice(0, -1);
  if (body.length > 1 && isDecimal(body[0])) body = `0${body}`;
  return sign + body;
}

/**
 * How a plain number string is shown in an input box on `locale`'s page: "2,5"
 * on a Spanish page. Strings from older share links may still carry comma
 * grouping ("250,000"), which those tools always read as grouping; anything
 * that is not a number is shown as it is.
 */
export function displayNumber(value: string, locale: string): string {
  const t = value.trim();
  if (t === '') return '';
  // The marker of a box that could not be read: no English word in anyone's box.
  if (t === 'NaN') return '?';
  // A plain number keeps every digit it has: only the decimal mark changes.
  // Below zero too: rounded, -99.99000000001 arrived as a valid -99.99 (#789).
  if (/^-?\d+(\.\d+)?$/.test(t)) return t.replace('.', numberSeparators(locale).decimal);
  const n = Number(t.replace(/[\s,]/g, ''));
  return Number.isFinite(n) ? formatForInput(n, locale, 10) : value;
}
