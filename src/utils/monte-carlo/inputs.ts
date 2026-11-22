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
  // A link carries a number of 200 characters at most: a longer one arrived
  // as unreadable, so it is refused here, where it is typed (#789).
  return Number.isFinite(n) && n >= min && n <= max && (!whole || Number.isInteger(n)) && plainDigits(n).length <= 200;
}
