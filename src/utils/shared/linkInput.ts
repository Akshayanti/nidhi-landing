/**
 * What a share link may put into a tool.
 *
 * A link is the one input the site does not write itself: whoever makes it
 * chooses every character. The decoders pass each value through one of
 * these, so that what reaches the form, an exchange-rate request or an
 * analytics property is a currency the tools know, something that looks
 * like a typed number, or a name of ordinary length. Anything else falls
 * back to the default, as if the link had not carried it.
 */

/** The longest name (a loan offer, an asset) a link may carry. Longer ones are cut here. */
export const MAX_LINK_NAME_LENGTH = 80;

/** The longest typed number, or list of them, a link may carry. */
const MAX_LINK_NUMBER_LENGTH = 200;

/**
 * Characters a typed number, or a list of them, is made of: digits in any
 * script, the separators people group and split numbers with, a sign, and
 * the `:` and `;` of the lump-sum list. No letters, so no free text.
 */
const NUMBER_TEXT = /^[\p{Nd}\s.,'’:;+\-]*$/u;

/** `code` if it is one of `known`, else `fallback`. The comparison is exact: codes are upper case. */
export function linkCurrency<T extends string | null>(code: string | null, known: ReadonlySet<string>, fallback: T): string | T {
  return code !== null && known.has(code) ? code : fallback;
}

/** `value` if it reads as a typed number or a list of numbers, else `fallback`. */
export function linkNumber(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  return value.length <= MAX_LINK_NUMBER_LENGTH && NUMBER_TEXT.test(value) ? value : fallback;
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
