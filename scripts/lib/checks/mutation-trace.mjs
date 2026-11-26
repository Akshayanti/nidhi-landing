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
 * True for a traced path the check leaves alone: the project folder itself,
 * anything outside it, and the installed packages (the lockfile, which is
 * in the shared fingerprint, says what they are).
 */
export function outside(rel) {
  return rel === '' || rel === '..' || rel.startsWith('../') || rel === 'node_modules' || rel.startsWith('node_modules/');
}

/**
 * True when a change to `rel` starts every shard afresh, so no result can
 * be stale for it: the shared fingerprint's rule names it (`isFingerprinted`,
 * mutation-fingerprint.mjs), and it is a tracked file, or is not there (made
 * later, it would be tracked and in the fingerprint). A file that is there
 * and that git does not track is in no fingerprint, wherever it lies.
 */
export function inSharedFingerprint(rel, isFingerprinted, trackedSet, isFile) {
  return isFingerprinted(rel) && (trackedSet.has(rel) || !isFile(rel));
}

/**
 * True when `rel`, read by a test that depends on everything, is held by
 * that test's fingerprint: the hash of every tracked file a mutation run can
 * read (mutation-deps.mjs, readablePaths). So a path that is an input, as a
 * tracked file, a folder or a name that is not there (made later, it would
 * be tracked and in the hash). Not held: a path no mutation run is meant to
 * read (docs/, .claude/, the other workflows: a change there skips the
 * suite, check-inputs.mjs), and a file that is there but that git does not
 * track (a build's output, a report): its contents are in no hash.
 */
export function heldByEverything(rel, trackedSet, isFile) {
  // As a file and as a folder: `docs` is the folder docs/.
  if (!isInput(rel, WORKFLOWS[0]) || !isInput(`${rel}/`, WORKFLOWS[0])) return false;
  return trackedSet.has(rel) || !isFile(rel);
}

/** What the hook writes to stderr when a record could not be written (trace-deps-hook.mjs). */
export const UNWRITTEN = 'trace-deps-hook: a record could not be written';
