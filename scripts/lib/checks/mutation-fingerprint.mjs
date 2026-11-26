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
// pull request that only edits tests keeps every shard's earlier results,
// but for what the test files that depend on everything cover: those are
// marked on any change, another test file's included (mutation-deps.mjs).
//
// Since #891 the code under src/ is left out too: each test file and each
// mutated file has a fingerprint of its own, of everything it reaches
// (mutation-deps.mjs), saved beside the shard's results, and a test file
// whose fingerprint changed is made to look changed to Stryker. So a change
// to one tool's code no longer starts every shard of every tool afresh.
//
// What stays in is what can change any result and that no test reaches
// through its imports and reads: the machinery of a mutation run. Until
// #904 that was written as "everything tracked outside src/", 284 files, and
// a change to any one (a script that renders a video, an image in public/,
// the Remotion project's lockfile) started all 24 shards with nothing
// restored. Now it is said by name (`isFingerprinted`):
//
// - every tracked file at the root: the dependencies (package.json,
//   package-lock.json, .npmrc), Node (.nvmrc), Stryker's settings, the
//   shards and their weights, the floors, tsconfig, the build's
//   configuration. The other root files (LICENSE, CNAME, the dotfiles) are
//   kept with them: they hardly ever change, so keeping them is a small,
//   accepted cost, and a new root file is in until someone says otherwise;
// - everything in test/: the helpers and setup every test process loads;
// - everything in scripts/lib/checks/, scripts/mutation-*.mjs and
//   scripts/check-mutation-deps.mjs: the runner and its ordering, the
//   reporter, the rules that decide what is reused. Kept as whole folders,
//   not picked file by file, and a test holds that nothing they import lies
//   outside what is kept;
// - the workflows a mutation run reads (check-inputs.mjs);
// - any package.json or tsconfig, wherever it is: Node and tsx look for one
//   in each folder of every module's path. But for the separate projects
//   (`SEPARATE_PROJECTS`: their own package, no code of theirs loaded by a
//   test, which a test holds), where those files are data like any other.
//
// Everything else outside src/ (public/, emails/, remotion/, the other
// scripts) is fingerprinted like the code under src/: by the test files
// that reach it. A test whose reads are all known has every file it reads
// in its own fingerprint; a test with a read that cannot be worked out
// hashes every tracked file a mutation run can read (mutation-deps.mjs,
// `readablePaths`), and those are exactly the files this fingerprint draws
// from, so a file left out here is always in theirs. The check of the
// analysis against what the tests really open (scripts/check-mutation-deps.mjs)
// covers reads outside src/ too, for both kinds of test. A file a test
// does reach and that is kept here is in both, which costs nothing.
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
 * per-file fingerprints beside them. 5: only the machinery left in (#904);
 * a result saved under 4 was made when a change outside src/ started every
 * shard afresh, and is not handed to the rule that no longer does.
 */
export const SCHEMA = 5;

/** Tests that read the source as text: no mutation run starts them. */
export const SOURCE_READERS = ['src/utils/privacySurface.test.ts'];

/** True for a test file a mutation run starts (stryker.config.mjs uses this). */
export function isSelectedTest(path) {
  return /^src\/(.+\/)?[^/]+\.test\.tsx?$/.test(path) && !SOURCE_READERS.includes(path);
}

/** Files Node or tsx look up in each folder of a module's path (check-mutation-deps.mjs sees the lookups). */
export const PACKAGE_SCOPE = /(^|\/)(package\.json|tsconfig[^/]*\.json)$/;

const UNDER_PACKAGE_SCOPE = /(^|\/)(package\.json|tsconfig[^/]*\.json)\//;

/** Folders that hold what runs and judges a mutation run: all of each is fingerprinted. */
export const MACHINERY_FOLDERS = ['test/', 'scripts/lib/checks/'];

/** The scripts a mutation shard runs around Stryker, and the check of the dependency analysis. */
export const MACHINERY_SCRIPTS = /^scripts\/(mutation-[^/]+|check-mutation-deps)\.mjs$/;

/**
 * Projects of their own inside the repository, each with its own package:
 * no test loads their code (mutation-fingerprint.test.mjs holds it), so a
 * package.json or tsconfig of theirs changes no module a test loads. A test
 * that reads one as data has it in its own fingerprint.
 */
export const SEPARATE_PROJECTS = ['remotion/', 'tools/'];

/** True when a change to `path` must start every shard afresh. */
export function isFingerprinted(path) {
  if (!isInput(path, WORKFLOWS[0])) return false;
  // What Node and tsx look for in every folder while they load a module (a
  // package.json says how a folder's files load, a tsconfig how tsx compiles
  // them): added or changed, it changes every run that loads from there.
  // Under such a name too: were one ever a folder, what is in it changes whether the name is there.
  if (PACKAGE_SCOPE.test(path) || UNDER_PACKAGE_SCOPE.test(path)) return !SEPARATE_PROJECTS.some((folder) => path.startsWith(folder));
  if (path.startsWith('src/')) return false;
  // At the root: the dependencies, Node, Stryker's settings, the shards.
  if (!path.includes('/')) return true;
  // The workflows a mutation run reads: the only paths under .github/ that are an input.
  if (path.startsWith('.github/')) return true;
  return MACHINERY_FOLDERS.some((folder) => path.startsWith(folder)) || MACHINERY_SCRIPTS.test(path);
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
