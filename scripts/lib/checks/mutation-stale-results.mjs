// Earlier results that are never handed on (#855).
//
// A shard reuses its earlier results when only test files changed, and
// Stryker decides which results still hold. For a mutant that was Killed it
// asks whether a test that killed it is unchanged. For every other result it
// retests only when a covering test was ADDED (incremental-differ.js,
// mutantCanBeReused, Stryker 10.1.1). That is not enough for a mutant that
// timed out or whose test run ended in an error:
//
// - Its test may be deleted, or edited so that it no longer reaches the
//   mutant: a fresh run would say NoCoverage or Survived.
// - Whether a slow mutant times out depends on the time Stryker allows it,
//   and that allowance includes the start-up time of the WHOLE test run. A
//   test file added anywhere, one that never touches the mutant, lengthens
//   it, and a mutant that timed out before may now finish and survive.
//
// A Timeout and a RuntimeError count as caught, and a CompileError is left
// out of the score altogether, so any of them handed on wrongly makes the
// score better than a fresh run would. So none of them is handed on: every result
// that is not of a kind listed below is taken out of the restored file
// before Stryker reads it, and Stryker, finding no earlier result, runs that
// mutant in full. They are few (63 timeouts over all seventeen shards when
// this was written, eight at most in one), so the price is small.

/**
 * Results that are safe to leave to Stryker. Killed: it checks the killing
 * test itself, and where a fresh run would call the mutant a RuntimeError
 * instead (another covering test file now dies before its tests), the two
 * score the same (mutation-floors.mjs, #860). Survived and NoCoverage: handed on wrongly they make the score
 * worse, never better. Ignored: decided afresh from the source on every run.
 * Any other status, one Stryker adds later included, is not safe.
 */
export const SAFE_TO_HAND_ON = new Set(['Killed', 'Survived', 'NoCoverage', 'Ignored']);

/**
 * `report` is a Stryker incremental file. Takes out every result that is not
 * safe to hand on, changing `report` in place, and returns how many.
 */
export function dropUnsafeResults(report) {
  let dropped = 0;
  for (const file of Object.values(report.files ?? {})) {
    const kept = file.mutants.filter((mutant) => SAFE_TO_HAND_ON.has(mutant.status));
    dropped += file.mutants.length - kept.length;
    file.mutants = kept;
  }
  return dropped;
}
