/**
 * What a share link may put into a tool.
 *
 * A link is the one input the site does not write itself: whoever makes it
 * chooses every character. The decoders pass each value through one of
 * these, so that what reaches the form, an exchange-rate request or an
 * analytics property is a currency the tools know, something that looks
 * like a typed number, or a name of ordinary length.
 *
 * A number a link does not carry takes the default. One it carries and that
 * cannot be read is the marker `NaN`, so the box opens invalid: turning it
 * into the default gave a full, wrong answer with no error (#789).
 */

/** The longest name (a loan offer, an asset) a link may carry. Longer ones are cut here. */
export const MAX_LINK_NAME_LENGTH = 80;

/** What a box that cannot be read is in a tool's state and in a link. Never what was typed. */
export const UNREADABLE = 'NaN';

/** The most lump sums one offer may carry: one in each month of the longest term. */
export const MAX_LINK_LUMP_SUMS = 1200;

/** The longest typed number, or side of a lump sum, a link may carry. */
const MAX_LINK_NUMBER_LENGTH = 200;

/**
 * Characters a typed number is made of: digits in any script, the
 * separators people group and split numbers with, and a sign. No letters,
 * so no free text.
 */
const NUMBER_TEXT = /^[\p{Nd}\s.,'’+\-]*$/u;

/** `code` if it is one of `known`, else `fallback`. The comparison is exact: codes are upper case. */
export function linkCurrency<T extends string | null>(code: string | null, known: ReadonlySet<string>, fallback: T): string | T {
  return code !== null && known.has(code) ? code : fallback;
}

/** `fallback` when there is no value, `value` if it reads as a typed number, else the marker. */
export function linkNumber(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  return value.length <= MAX_LINK_NUMBER_LENGTH && NUMBER_TEXT.test(value) ? value : UNREADABLE;
}

/**
 * A list of lump sums ("12:5000;36:3000"). What cannot be read is marked in
 * its place, so the good pairs stay and none is dropped without a word. A
 * list that is too long is marked whole, never cut.
 */
export function linkLumpSums(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  const pairs = value.split(';').filter((pair) => pair.trim() !== '');
  if (pairs.length > MAX_LINK_LUMP_SUMS) return UNREADABLE;
  return pairs
    .map((pair) => {
      const sides = pair.split(':');
      if (sides.length !== 2) return UNREADABLE;
      return sides.map((side) => (side.trim() === '' ? UNREADABLE : linkNumber(side.trim(), UNREADABLE))).join(':');
    })
    .join(';');
}

/** A whole number from `min` to `max`, as a string, else `fallback`. */
export function linkWholeNumber(value: string | null, min: number, max: number, fallback: string): string {
  if (value === null || !/^\d{1,9}$/.test(value)) return fallback;
  const n = Number(value);
  return n >= min && n <= max ? String(n) : fallback;
}

/** A name with its control characters removed, cut at the longest length a link may carry. */
export function linkName(value: string): string {
  // Cut by code point, so a pair of surrogates is never split.
  // eslint-disable-next-line no-control-regex
  return [...value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')].slice(0, MAX_LINK_NAME_LENGTH).join('');
}
