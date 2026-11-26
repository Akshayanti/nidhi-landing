// The rules of the check of the dependency analysis against what the tests
// really read (#891, #904; scripts/check-mutation-deps.mjs runs it): which
// traced paths are compared, and when a test's fingerprint holds one.
import { isInput, WORKFLOWS } from './check-inputs.mjs';

/**
 * True when `rel` (a traced path) is held by `files` (paths, ?paths and
 * >prefixes): a file that is there only by its contents, so a read of it is
 * not covered by a mere "is it there"; a path that is not a file (a folder,
 * or a name looked for and not found) by whether it is there, or by a
 * listing of it or of a folder above it.
 */
export function covered(rel, files, isFile) {
  if (isFile(rel)) return files.has(rel);
  if (files.has(`?${rel}`) || files.has(`>${rel}/`)) return true;
  for (const entry of files) {
    if (entry.startsWith('>') && rel.startsWith(entry.slice(1))) return true;
  }
  return false;
}

/**
 * True for a traced path the check leaves alone: anything outside the
 * project, and the installed packages at its root (the lockfile, which is
 * in the shared fingerprint, says what they are). The project folder itself
 * is compared: a listing of it changes when a folder is added at the top.
 */
export function outside(rel) {
  return rel === '..' || rel.startsWith('../') || rel === 'node_modules' || rel.startsWith('node_modules/');
}

/**
 * What a traced path is on disk: 'file', 'folder' or 'none' (a name looked
 * for and not found). `stat` is statSync-like and throws when it is not there.
 */
export function kindOf(stat) {
  try {
    const found = stat();
    return found.isFile() ? 'file' : found.isDirectory() ? 'folder' : 'none';
  } catch {
    return 'none';
  }
}

// A path the rule can be asked about in place of "anything in this folder".
const inside = (rel) => `${rel}/a`;

/**
 * True when a change to what `rel` gave the test starts every shard afresh,
 * so no result can be stale for it. `named` is the shared fingerprint's rule
 * (`isFingerprinted`, mutation-fingerprint.mjs), `kind` is `kindOf` of the path.
 *
 * - A file: the rule names it and git tracks it. A file that is there and
 *   that git does not track is in no fingerprint, wherever it lies.
 * - A folder (it was listed, or looked for): the rule names everything in
 *   it. `public` is not a root file: a file added to it changes the listing
 *   and is in no shared fingerprint (council, Codex: a test that asserts
 *   unless a listing holds a name would keep a stale kill).
 * - A name that is not there: whatever is made there later, a file or a
 *   folder with a file in it, the rule names it.
 */
export function inSharedFingerprint(rel, named, trackedSet, kind) {
  if (kind === 'file') return named(rel) && trackedSet.has(rel);
  if (kind === 'folder') return named(inside(rel));
  return named(rel) && named(inside(rel));
}

/**
 * True when `rel`, read by a test that depends on everything, is held by
 * that test's fingerprint: the hash of every tracked file a mutation run can
 * read (mutation-deps.mjs, readablePaths).
 *
 * - A file: a tracked one that is an input. Not one no mutation run is
 *   meant to read (docs/, .claude/, the other workflows: a change there
 *   skips the suite, check-inputs.mjs), and not one git does not track (a
 *   build's output, a report): its contents are in no hash.
 * - A folder: everything in it is an input, so a file added to it is in
 *   the hash. The project folder itself counts: what is added at the top is
 *   an input but for a handful of names, which the suite is skipped for.
 * - A name that is not there: an input whether it is made a file or a folder.
 */
export function heldByEverything(rel, trackedSet, kind) {
  if (kind === 'file') return isInput(rel, WORKFLOWS[0]) && trackedSet.has(rel);
  if (rel === '') return kind === 'folder';
  if (kind === 'folder') return isInput(inside(rel), WORKFLOWS[0]);
  return isInput(rel, WORKFLOWS[0]) && isInput(inside(rel), WORKFLOWS[0]);
}

/** What the hook writes to stderr when a record could not be written (trace-deps-hook.mjs). */
export const UNWRITTEN = 'trace-deps-hook: a record could not be written';
