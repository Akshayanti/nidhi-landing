// The recheck of reused kills (#854).
//
// A shard reuses its earlier results when only test files changed. Stryker
// hands a Killed result on whenever a test that killed the mutant is
// unchanged (incremental-differ.js, mutantCanBeReused, Stryker 10.1.1). That
// is not enough when ANOTHER test file that covers the mutant was added or
// edited in the same push. For each mutant Stryker runs the covering test
// files one after the other and stops at the first that fails or cannot run
// (mutation-test-order.mjs). If the added or edited file comes before the
// unchanged killer, a fresh run may never reach the killer: under the mutant
// the new file may crash as it loads, or be ended by the memory guard
// (test/mutationMemoryGuard.mjs). A fresh run then calls the mutant a
// RuntimeError, and one the guard ended counts as NOT caught
// (mutation-floors.mjs), while the reused result says Killed: the score
// would be better than a fresh run's.
//
// Which test files cover a mutant NOW is not known before the run: a new
// file's coverage is measured in Stryker's first test run. After the run it
// is known, since Stryker writes this run's coverage (`coveredBy`) for every
// mutant, the reused ones included. So the check comes after the run:
//
// 1. Before Stryker, the test files of the restored results are noted, each
//    with a hash of its source as it was (`testFilesBefore`).
// 2. Stryker runs (pass 1), reusing what it may.
// 3. Every Killed result that a new or edited test file covers, and that
//    pass 1 did not run itself, is taken out of the incremental file
//    (`takeOutKillsToRecheck`).
// 4. If any was taken out, Stryker runs again (pass 2). It finds no earlier
//    result for those mutants and runs them in full, in today's order, and
//    reuses everything else.
//
// After that, every Killed in the shard's report was either run in this
// shard run, or is reused with no covering test file new or edited since it
// was made. A deleted covering file needs nothing: it cannot stop a run
// before the killer, and if it was the killer Stryker retests the mutant
// itself.
//
// Which kills pass 1 ran itself, and which it reused, the results do not say.
// Stryker says it while it runs: its plan gives every mutant as one to run
// or one whose earlier result is handed on. A reporter beside the ordered
// runner (stryker-run-plan.mjs) writes the mutants planned to RUN to a file
// beside the results, with a hash of the report Stryker then writes. Step 3
// leaves a kill in when that file names it: pass 1 ran it in full, on this
// checkout, in today's order, so it is already what a fresh run says. Before
// that (until Nov 2026) step 3 took out both kinds, and pass 2 ran again
// what pass 1 had just run: on a pull request that changed a file most tests
// reach, a shard with earlier results took longer than one with none.
//
// The file is believed only when it is this run's and the results on disk
// are the very report it was written for (`killsRunNow`): the same results
// file, and the same bytes, by hash. A run that was cut short writes its
// results without the report ever being made, so no file is written and
// nothing matches. The file is removed before every Stryker run and by the
// recheck as it reads it, never saved, and anything missing, unreadable or
// not matching means the old rule: both kinds are taken out. It can only
// ever leave in a kill this run made.
import { createHash } from 'node:crypto';

/** Where the note of step 1 is kept: beside the incremental file, never saved with it. */
export function beforePath(incrementalFile) {
  return `${incrementalFile.replace(/\.json$/, '')}.before.json`;
}

/** Raised when the shape of the plan file changes, so an older one is never read. */
export const PLAN_SCHEMA = 1;

/** Where the reporter keeps the plan of a run: beside the incremental file, never saved with it. */
export function planPath(incrementalFile) {
  return `${incrementalFile.replace(/\.json$/, '')}.plan.json`;
}

/** The hash a plan file holds of the report it belongs to: of the text Stryker writes as the incremental file. */
export function reportHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * The plan file's content: the results file it is for, the ids of the
 * mutants Stryker planned to run (not to hand on), and the hash of the
 * report as Stryker writes it (`reportText`).
 */
export function planNote(incrementalFile, ran, reportText) {
  return { schema: PLAN_SCHEMA, file: incrementalFile, ran: [...ran], report: reportHash(reportText) };
}

/**
 * The ids of the mutants this run ran itself, as a Set, or null when `plan`
 * (the parsed plan file) cannot vouch for the results on disk: not a plan
 * file of this shape, for another results file, or written for a report
 * other than `incrementalText` (the results file as it is on disk now).
 * Null means no kill is left in on the plan's word.
 */
export function killsRunNow(plan, incrementalFile, incrementalText) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || plan.schema !== PLAN_SCHEMA) return null;
  if (typeof incrementalFile !== 'string' || plan.file !== incrementalFile) return null;
  if (typeof incrementalText !== 'string' || typeof plan.report !== 'string' || plan.report !== reportHash(incrementalText)) return null;
  if (!Array.isArray(plan.ran) || !plan.ran.every((id) => typeof id === 'string' && id !== '')) return null;
  return new Set(plan.ran);
}

/** A test file's source as a hash; null when Stryker recorded no source. */
function hashOf(source) {
  return typeof source === 'string' ? createHash('sha256').update(source).digest('hex') : null;
}

/**
 * The note made before Stryker runs. `report` is the restored incremental
 * file, or null when Stryker will reuse nothing (no earlier results, or a
 * forced run): then nothing needs rechecking, and the note says so.
 */
export function testFilesBefore(report) {
  if (!report) return { reused: false };
  const testFiles = {};
  for (const [path, file] of Object.entries(report.testFiles ?? {})) testFiles[path] = hashOf(file.source);
  return { reused: true, testFiles };
}

/**
 * The test files in `report` (the incremental file after a run) that are new
 * or edited against `before`. A file with no source on record, on either
 * side, counts as edited: it cannot be shown to be the same.
 */
export function newOrChangedTestFiles(before, report) {
  const changed = new Set();
  for (const [path, file] of Object.entries(report.testFiles ?? {})) {
    const was = Object.hasOwn(before.testFiles, path) ? before.testFiles[path] : null;
    if (typeof was !== 'string' || was !== hashOf(file.source)) changed.add(path);
  }
  return changed;
}

/**
 * Takes out of `report` (the incremental file after a run, changed in place)
 * every Killed result that a new or edited test file covers, and returns how
 * many. `before` is the note `testFilesBefore` made.
 *
 * A Killed result whose covering tests cannot be traced to a file (no
 * `coveredBy`, or a test id no file lists) is taken out too whenever any
 * test file is new or edited: what cannot be shown to be untouched is tested
 * again. Only Killed is looked at. Stryker itself retests a survivor that a
 * new or edited test covers, and timeouts and errors are never handed on
 * (mutation-stale-results.mjs).
 *
 * `ranNow` is what `killsRunNow` gave: the ids of the mutants this run ran
 * itself, or null. A kill it names stays, whatever covers it: it was made
 * by this run. With null every kill the rule above selects is taken out.
 */
export function takeOutKillsToRecheck(report, before, ranNow = null) {
  if (before?.reused === false) return 0;
  if (before?.reused !== true || typeof before.testFiles !== 'object' || before.testFiles === null) {
    throw new Error('the note of the test files before the run is not one mutation-stale-results.mjs wrote');
  }
  const changed = newOrChangedTestFiles(before, report);
  if (changed.size === 0) return 0;
  // Stryker numbers the tests afresh in every report; the file that holds a
  // test is found through this report's own list.
  const fileOf = new Map();
  for (const [path, file] of Object.entries(report.testFiles ?? {})) {
    for (const test of file.tests ?? []) fileOf.set(test.id, path);
  }
  const toRecheck = (mutant) => {
    if (mutant.status !== 'Killed') return false;
    if (ranNow instanceof Set && typeof mutant.id === 'string' && ranNow.has(mutant.id)) return false;
    if (!Array.isArray(mutant.coveredBy) || mutant.coveredBy.length === 0) return true;
    return mutant.coveredBy.some((id) => !fileOf.has(id) || changed.has(fileOf.get(id)));
  };
  let taken = 0;
  for (const file of Object.values(report.files ?? {})) {
    const kept = file.mutants.filter((mutant) => !toRecheck(mutant));
    taken += file.mutants.length - kept.length;
    file.mutants = kept;
  }
  return taken;
}
