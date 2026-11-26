/**
 * What the simulator accepts in a number box.
 */
import { plainDigits } from '../shared/parseLocaleNumber.ts';


/**
 * Whether a box holds a number from `min` to `max`. `whole` is for the two
 * boxes of years: the simulation runs year by year, so 12.5 years has no
 * result of its own (the fixed-return line had none to show and printed
 * "NaN", and half a year gave the figures of a whole one).
 */
export function isValidNumber(v: string, min: number, max: number, whole = false): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max && (!whole || Number.isInteger(n)) && !tooLongForLink(v);
}

/**
 * A link carries a number of 200 characters at most: a longer one arrived
 * as unreadable, or as zero when it was too small to be a number, so it is
 * refused where it is typed, and said to be unreadable there (#789).
 */
export function tooLongForLink(v: string): boolean {
  const n = Number(v);
  return v.trim().length > 200 || (Number.isFinite(n) && plainDigits(n).length > 200);
}
