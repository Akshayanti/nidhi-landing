// What a mutation shard's earlier results depend on (#846, #848). A shard
// reuses its Stryker incremental file only from a run with the same
// fingerprint, so the fingerprint is everything that can change a mutant's
// result WITHOUT Stryker noticing.
//
// Stryker notices two things itself: a change to the code around a mutant,
// and a change to a test file (the tap runner reports one test per file, so
// an edited, added or deleted test file is a changed, added or deleted test:
// the mutants it killed are tested again, and so are the survivors it
// covers). So the test files a mutation run starts are left out, and a
// pull request that only edits tests keeps every shard's earlier results.
//
// Everything else tracked by git is in: the tools' own code (a change to one
// function can stop an unchanged test from killing an unchanged mutant in
// another), what the tests import or read, the test helpers, the settings,
// the shards, the dependencies. Left out as well: what no mutation run reads
// (check-inputs.mjs) and the lessons, as before.
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
 * may hold one already handed on wrongly, and must not be restored.
 */
export const SCHEMA = 2;

/** Tests that read the source as text: no mutation run starts them. */
export const SOURCE_READERS = ['src/utils/privacySurface.test.ts'];

/** True for a test file a mutation run starts (stryker.config.mjs uses this). */
export function isSelectedTest(path) {
  return /^src\/(.+\/)?[^/]+\.test\.tsx?$/.test(path) && !SOURCE_READERS.includes(path);
}

/** True when a change to `path` must start every shard afresh. */
export function isFingerprinted(path) {
  if (isSelectedTest(path)) return false;
  if (path.startsWith('src/content/')) return false;
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
