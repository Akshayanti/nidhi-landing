// Whether a pull request can change a mutation result (#790, #846). The
// "Free tools mutation" workflow skips its shards for a pull request that
// changes only files no mutation run reads, and its required gate passes in
// that one case (owner, Nov 23, 2026: a docs-only pull request needs no
// mutation run). Nightly and manual runs always test everything.
//
// The rule is a short list of what is NEVER read, not a list of what is: a
// mutation run starts every test in src/, and those tests read lessons,
// public/, emails/, scripts/, astro.config.mjs and more, so anything not on
// the list below runs the shards. A test (mutation-inputs.test.mjs) fails if
// a test the mutation run starts begins to read one of these places.

/** Prefixes (ending in /) and exact paths no mutation run reads. */
export const NEVER_READ = ['docs/', '.claude/', '.github/', 'README.md', 'CLAUDE.md'];

/** Inside a NEVER_READ prefix, but read by the run: its own workflow. */
export const READ_AFTER_ALL = ['.github/workflows/tool-mutation.yml'];

/** True when changing `path` can change a mutation result. */
export function isMutationInput(path) {
  if (READ_AFTER_ALL.includes(path)) return true;
  return !NEVER_READ.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));
}

/** The paths in `git diff --name-only --no-renames -z` output. */
export function changedPaths(nulSeparated) {
  return nulSeparated.split('\0').filter((p) => p !== '');
}

/**
 * Whether a pull request changing `paths` needs the mutation run. An empty or
 * unreadable list runs it: the gate fails open toward testing, never toward
 * skipping.
 */
export function needsMutationRun(paths) {
  const list = (paths ?? []).filter((p) => typeof p === 'string' && p !== '');
  return list.length === 0 || list.some(isMutationInput);
}
