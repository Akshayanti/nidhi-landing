/**
 * What the simulator accepts in a number box.
 */

/**
 * Whether a box holds a number from `min` to `max`. `whole` is for the two
 * boxes of years: the simulation runs year by year, so 12.5 years has no
 * result of its own (the fixed-return line had none to show and printed
 * "NaN", and half a year gave the figures of a whole one).
 */
export function isValidNumber(v: string, min: number, max: number, whole = false): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max && (!whole || Number.isInteger(n));
}
