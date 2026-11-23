/**
 * Finds the amounts in a line of text, so the page can keep each one whole.
 *
 * An amount is read as one thing: its sign, its currency symbol or code, its
 * digits with their separators and decimals, and a percent sign or a short
 * suffix. A line break inside it changes what a reader takes it to be: a
 * minus sign left at the end of a line turns "−€1,520" into "€1,520", and a
 * break at a separator turns "98 765 432 Kč" into two amounts. So the tools
 * draw every amount as one unbreakable unit (`Amounts.tsx`), and when a unit
 * is wider than its line it is drawn smaller, by just enough to fit, instead
 * of being broken or pushing the page sideways (#667; council, Nov 17, 2026).
 *
 * The fit is done in CSS from a length, not by measuring: `amountLength` is
 * the unit's width counted in digits. Amounts are drawn with fixed-width
 * digits, which have one width in each of the site's two fonts, so the count
 * is close: never less than the true width in either font for the formats the
 * tools produce, and a few percent more.
 *
 * The length is the only thing derived from an amount that reaches an
 * attribute (an inline custom property). It is layout data, not the value,
 * and analytics never reads `style`.
 *
 * The functions here work on text that is already formatted, so the same
 * sentences still go unchanged to the announcements and the exports.
 */

// Written by code point, so no invisible character sits in this file.
const NBSP = String.fromCodePoint(0x00a0);
const NNBSP = String.fromCodePoint(0x202f);
const MINUS = String.fromCodePoint(0x2212);
const APOSTROPHE = String.fromCodePoint(0x2019);
const LATIN = `A-Za-z${String.fromCodePoint(0x00c0)}-${String.fromCodePoint(0x024f)}`;

const JOIN = `[${NBSP}${NNBSP}]`;
const SIGN = `[${MINUS}+-]`;
/**
 * "€", "₹", the dollar forms that carry letters ("A$", "CA$"), a code written
 * against its figure ("CHF-1'520"), a symbol in letters joined to its figure
 * ("Kz 0", "F CFA 0"), and the percent sign where it comes first ("%44,1" in Turkish).
 */
const SYMBOL = `(?:\\p{Sc}|%|[A-Z]{1,3}\\$|[A-Z]{2,4}(?=${SIGN}|\\d)|(?:[${LATIN}]{1,4}\\.?${JOIN}){1,2})`;
/** Digits, with separators only between digits: a sentence's own comma or full stop stays outside. */
const NUMBER = `\\d(?:[\\d.,'${APOSTROPHE}${NBSP}${NNBSP}]*\\d)?`;
/** What may follow, attached or joined by a no-break space: "%", "Kč", "M", "mil.", "Cr". */
const SUFFIX = `(?:${JOIN}?(?:%|\\p{Sc}|[${LATIN}]{1,4}\\.?)(?![\\p{L}\\p{M}\\d]))`;
/** The loan comparison names a dollar currency after its amount: "$1,000.00 CAD". */
const CODE = '(?: [A-Z]{3}(?![\\p{L}\\p{M}\\d]))';

/** A Spanish page writes billions as "2,5 mil M €", with ordinary spaces. */
const THOUSAND_MILLION = '(?: mil M)';

const AMOUNT = new RegExp(
  `(?<![\\p{L}\\p{M}\\d])(?:${SIGN}${JOIN}?)?(?:${SYMBOL}${JOIN}?${SIGN}?)?${NUMBER}${THOUSAND_MILLION}?${SUFFIX}{0,3}${CODE}?`,
  'gu',
);

/** About one and a half digits wide in both fonts. */
const WIDE = new Set(['M', 'W', 'm', 'w', '%', '₩', '₪', '@']);
/** Thin letters, about two thirds of a digit at most. */
const THIN = new Set([
  'i', 'l', 'j', 't', 'f', 'r',
  // Stryker disable next-line StringLiteral: a capital is counted as a capital before the thin letters are looked at, so this entry is never read
  'I',
]);
/** Currency signs wider than a digit by a quarter. */
const BROAD = new Set(['₱', '₦', '₴']);

/**
 * The width of a unit, counted in digits and rounded up to a tenth. Amounts
 * are drawn with fixed-width digits, so a digit is exactly 1 in each font; a
 * separator is half and a space a little under; a sign, a currency symbol or
 * a small letter is about a digit (a thin one two thirds); a capital is 1.3;
 * the wide ones are 1.7.
 * Every weight is at or just above the widest case measured in the heading
 * font (Inter) and the body font (Roboto), so the count never comes out
 * narrower than the amount is drawn.
 */
export function amountLength(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (/\d/.test(ch)) n += 1;
    else if (ch === NNBSP) n += 0.25;
    else if (/\s/.test(ch)) n += 0.45;
    else if (/[.,']/.test(ch) || ch === APOSTROPHE) n += 0.5;
    else if (WIDE.has(ch)) n += 1.7;
    else if (BROAD.has(ch) || /\p{Lu}/u.test(ch)) n += 1.3;
    else if (THIN.has(ch)) n += 0.65;
    else if (/\p{Ll}/u.test(ch)) n += 1;
    else n += 1.1;
  }
  return Math.ceil(n * 10 - 1e-9) / 10;
}

export interface AmountUnit {
  amount: string;
  length: number;
}

/** A line as its plain stretches and its amounts, in order. Joining the pieces gives the line back. */
export function splitAmounts(text: string): (string | AmountUnit)[] {
  const out: (string | AmountUnit)[] = [];
  let last = 0;
  for (const m of text.matchAll(AMOUNT)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push({ amount: m[0], length: amountLength(m[0]) });
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The longest unit among several lines: the one size a comparison's amounts share. */
export function longestAmount(...texts: string[]): number {
  let max = 0;
  for (const text of texts) {
    for (const part of splitAmounts(text)) if (typeof part !== 'string') max = Math.max(max, part.length);
  }
  return max;
}
