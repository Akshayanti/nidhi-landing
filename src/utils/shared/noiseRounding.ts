/**
 * Rounding a simulated amount to what the simulation can tell apart.
 *
 * A percentile read from N random runs is not exact: run it again with other
 * draws and it moves. How far depends on how spread out the runs are and on
 * how many there are, roughly spread / sqrt(N). Digits finer than that are
 * noise from the draws, and a fixed seed hides it, because the number never
 * moves on the page.
 *
 * The step is the power of ten at or below (p90 - p10) / sqrt(runs): with
 * 10,000 runs and a spread of 1.6 million, amounts are shown to the nearest
 * 10,000. Every amount in the same row (the percentiles and any line drawn
 * beside them) is rounded with that row's step, so they stay comparable.
 *
 * Browser-safe and dependency-free. Exports keep the unrounded figures.
 */

/** The step for one row of results, or 0 when there is nothing to round by. */
export function noiseStep(p10: number, p90: number, runs: number): number {
  const spread = Math.abs(p90 - p10);
  if (!Number.isFinite(spread) || !(runs >= 1)) return 0;
  // No spread at all gives a step of 0 here too: ten to the power of minus infinity.
  return Math.pow(10, Math.floor(Math.log10(spread / Math.sqrt(runs))));
}

/** `value` to the nearest `step`; unchanged when the step is 0. */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(value)) return value;
  // Halves go away from zero on both sides: -5 to -10 as 5 to 10.
  const rounded = Math.sign(value) * Math.round(Math.abs(value) / step) * step;
  // A step below 1 leaves binary dust (0.30000000000000004): cut it at the step's own decimals.
  // (For a step of 1 or more this is zero or less, and nothing is cut.)
  const decimals = Math.min(12, Math.ceil(-Math.log10(step)));
  const clean = decimals > 0 ? Number(rounded.toFixed(decimals)) : rounded;
  return Object.is(clean, -0) ? 0 : clean;
}

/** Each of `values` rounded with the step of the row they belong to. */
export function roundRow<T extends Record<string, number>>(values: T, p10: number, p90: number, runs: number): T {
  const step = noiseStep(p10, p90, runs);
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, roundToStep(v, step)])) as T;
}
