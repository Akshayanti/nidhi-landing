// Earlier results that can no longer be trusted (#855).
//
// A shard reuses its earlier results when only test files changed, and
// Stryker decides which results still hold. For a mutant that was Killed it
// asks whether a test that killed it is unchanged. For every other result it
// retests only when a covering test was ADDED (incremental-differ.js,
// mutantCanBeReused, Stryker 10.1.1). So a mutant that timed out, or whose
// test run ended in an error, keeps that result after the test that reached
// it is deleted, or edited so that it no longer reaches it: a fresh run
// would say NoCoverage or Survived. A Timeout counts as caught, and a
// RuntimeError or CompileError is left out of the score altogether, so
// either one handed on wrongly makes the score better than it is.
//
// This takes such results out of the restored file before Stryker reads it,
// so those mutants are tested again: every result of a kind listed below as
// not safe to hand on that is covered by a test file that has changed or is
// gone, and, when any test file has changed or is gone, every such result
// with no covering test on record (a static mutant, which every test may
// reach). A mutant taken out is new to Stryker and is run in full. Nothing
// else in the file is touched.

/**
 * Results that are safe to leave to Stryker. Killed: it checks the killing
 * test itself. Survived and NoCoverage: handed on wrongly they make the score
 * worse, never better. Ignored: decided afresh from the source on every run.
 * Any other status, one Stryker adds later included, is not safe.
 */
export const SAFE_TO_HAND_ON = new Set(['Killed', 'Survived', 'NoCoverage', 'Ignored']);

/**
 * `report` is a Stryker incremental file; `read(path)` gives a test file's
 * current text, or null when it is gone. Returns how many results were taken
 * out, and changes `report` in place.
 */
export function dropStaleResults(report, read) {
  const changed = new Set();
  const fileOfTest = new Map();
  for (const [path, file] of Object.entries(report.testFiles ?? {})) {
    for (const test of file.tests ?? []) fileOfTest.set(test.id, path);
    if (read(path) !== file.source) changed.add(path);
  }
  let dropped = 0;
  for (const file of Object.values(report.files ?? {})) {
    const kept = file.mutants.filter((mutant) => {
      if (SAFE_TO_HAND_ON.has(mutant.status)) return true;
      const covering = mutant.coveredBy ?? [];
      // A test id with no file on record cannot be checked: tested again.
      const stale = covering.length === 0
        ? changed.size > 0
        : covering.some((id) => !fileOfTest.has(id) || changed.has(fileOfTest.get(id)));
      return !stale;
    });
    dropped += file.mutants.length - kept.length;
    file.mutants = kept;
  }
  return dropped;
}
