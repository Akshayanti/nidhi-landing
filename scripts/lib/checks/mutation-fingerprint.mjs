// What a mutation shard's earlier results depend on (#846, #848). A shard
// reuses its Stryker incremental file only from a run with the same
// fingerprint, so the fingerprint is everything that can change a mutant's
// result WITHOUT Stryker noticing.
//
// Stryker notices two things itself: a change to the code around a mutant,
// and a change to a test file (the tap runner reports one test per file, so
// an edited, added or deleted test file is a changed, added or deleted test:
// the mutants it killed are tested again, and so are the survivors it
// covers; the kills of other tests that it covers are tested again by the
// recheck after the run, mutation-recheck.mjs). So the test files a mutation run starts are left out, and a
// pull request that only edits tests keeps every shard's earlier results.
//
// Since #891 the code under src/ is left out too: each test file and each
// mutated file has a fingerprint of its own, of everything it reaches
// (mutation-deps.mjs), saved beside the shard's results, and a test file
// whose fingerprint changed is made to look changed to Stryker. So a change
// to one tool's code no longer starts every shard of every tool afresh.
//
// What stays in is what can change any result and that no test reaches
// through its imports and reads: everything tracked outside src/ that a
// mutation run reads (check-inputs.mjs): the dependencies (package.json,
// package-lock.json), Node (.nvmrc), Stryker's settings and the shards, the
// runner and its ordering, the test helpers and setup in test/, tsconfig, the
// workflows. A file outside src/ that a test does reach is in both, which
// costs nothing.
//
// Leaving a test file out is safe only while no other test's result depends
// on its contents. mutation-fingerprint.test.mjs holds that: no file imports
// a test file, and a test that runs mutated code and lists a folder reads no
// test file from it.
import { createHash } from 'node:crypto';
import { isInput, WORKFLOWS } from './check-inputs.mjs';

/**
 * Raised when the rule changes, so no earlier result outlives it. 2: results
 * saved before stale timeouts and errors were taken out (mutation-stale-results.mjs)
 * may hold one already handed on wrongly, and must not be restored. 3:
 * results saved before reused kills were rechecked (mutation-recheck.mjs)
 * may hold a kill that a test file added or edited since would have turned
 * into an error, saved beside the new test sources, so no later run would
 * recheck it. 4: src/ left out (#891); results saved under 3 have no
 * per-file fingerprints beside them.
 */
export const SCHEMA = 4;

/** Tests that read the source as text: no mutation run starts them. */
export const SOURCE_READERS = ['src/utils/privacySurface.test.ts'];

/** True for a test file a mutation run starts (stryker.config.mjs uses this). */
export function isSelectedTest(path) {
  return /^src\/(.+\/)?[^/]+\.test\.tsx?$/.test(path) && !SOURCE_READERS.includes(path);
}

/** Files Node or tsx look up in each folder of a module's path (check-mutation-deps.mjs sees the lookups). */
export const PACKAGE_SCOPE = /(^|\/)(package\.json|tsconfig[^/]*\.json)$/;

/** True when a change to `path` must start every shard afresh. */
export function isFingerprinted(path) {
  // Under src/, only what Node and tsx look for in every folder while they
  // load any module (a package.json says how a folder's files load, a
  // tsconfig how tsx compiles them): added or changed, it changes every run.
  if (path.startsWith('src/')) return PACKAGE_SCOPE.test(path) && isInput(path, WORKFLOWS[0]);
  return isInput(path, WORKFLOWS[0]);
}

/** The paths in `git ls-files -z` output. */
export function trackedPaths(nulSeparated) {
  return nulSeparated.split('\0').filter((p) => p !== '');
}

/**
 * The fingerprint of the tracked `paths`, with `read(path)` giving a file's
 * bytes. Paths and contents both count; the order given does not. A file
 * that cannot be read throws: no fingerprint is better than a wrong one.
 */
export function fingerprint(paths, read) {
  const list = [...new Set(paths)].filter(isFingerprinted).sort();
  if (list.length === 0) throw new Error('nothing to fingerprint: the list of tracked files is empty');
  const hash = createHash('sha256').update(`schema ${SCHEMA}\0`);
  for (const path of list) {
    hash.update(`${path}\0`).update(createHash('sha256').update(read(path)).digest());
  }
  return hash.digest('hex');
}
