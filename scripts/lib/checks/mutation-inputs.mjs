// What a mutation result can depend on (#790, #846). A pull request that
// changes none of these files cannot change a score, so the "Free tools
// mutation" workflow skips its shards and its required gate passes without
// them (owner, Nov 23, 2026: a docs-only pull request needs no mutation run).
// Nightly and manual runs always test everything.
//
// The list is the incremental cache's fingerprint in tool-mutation.yml
// (what the tests run on), plus what decides how the run is made and judged:
// the Stryker files, the mutation scripts, package.json, tsconfig.json and
// the workflow itself. A test keeps it a superset of the fingerprint.

/** Path prefixes (ending in /) and exact paths whose change can move a score. */
export const MUTATION_INPUTS = [
  'src/',
  'test/',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.nvmrc',
  'stryker.config.mjs',
  'stryker.shards.json',
  'stryker.shard-weights.json',
  'stryker.floors.json',
  'scripts/mutation-',
  'scripts/lib/checks/mutation-',
  '.github/workflows/tool-mutation.yml',
];

/** Inside src/ but read by no test the mutation run starts: the lessons. */
export const NOT_INPUTS = ['src/content/'];

/** True when changing `path` can change a mutation result. */
export function isMutationInput(path) {
  if (NOT_INPUTS.some((p) => path.startsWith(p))) return false;
  return MUTATION_INPUTS.some((p) => (p.endsWith('/') || p.endsWith('-') ? path.startsWith(p) : path === p));
}

/**
 * Whether a pull request changing `paths` needs the mutation run. An empty or
 * unreadable list runs it: the gate fails open toward testing, never toward
 * skipping.
 */
export function needsMutationRun(paths) {
  const list = (paths ?? []).map((p) => p.trim()).filter(Boolean);
  return list.length === 0 || list.some(isMutationInput);
}
