// Earlier Timeout results that can no longer be trusted (#855).
//
// A shard reuses its earlier results when only test files changed, and
// Stryker decides which results still hold. For a mutant that was Killed it
// asks whether a test that killed it is unchanged. For every other result,
// Timeout among them, it retests only when a covering test was ADDED
// (incremental-differ.js, mutantCanBeReused, Stryker 10.1.1). So a mutant
// that timed out keeps counting as caught after the test that reached it is
// deleted, or edited so that it no longer reaches it: a fresh run would say
// NoCoverage or Survived. A Timeout counts towards the score, so that is a
// result reused in the unsafe direction.
//
// This takes such results out of the restored file before Stryker reads it,
// so those mutants are tested again: every Timeout covered by a test file
// that has changed or is gone, and, when any test file has changed or is
// gone, every Timeout with no covering test on record (a static mutant,
// which every test may reach). A mutant taken out is new to Stryker and is
// run in full. Nothing else in the file is touched.

/**
 * `report` is a Stryker incremental file; `read(path)` gives a test file's
 * current text, or null when it is gone. Returns how many results were taken
 * out, and changes `report` in place.
 */
export function dropStaleTimeouts(report, read) {
  const changed = new Set();
  const fileOfTest = new Map();
  for (const [path, file] of Object.entries(report.testFiles ?? {})) {
    for (const test of file.tests ?? []) fileOfTest.set(test.id, path);
    if (read(path) !== file.source) changed.add(path);
  }
  let dropped = 0;
  for (const file of Object.values(report.files ?? {})) {
    const kept = file.mutants.filter((mutant) => {
      if (mutant.status !== 'Timeout') return true;
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
