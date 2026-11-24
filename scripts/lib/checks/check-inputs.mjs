// Whether a pull request can change what a free tools suite measures (#790,
// #846). The mutation, text-size and privacy suites (tool-suite.yml, run by
// PR Checks on a pull request) each skip their jobs for a pull request that
// changes only files none of them reads, and each summary job passes in that
// one case (owner, Nov 23, 2026: a change to docs needs no mutation,
// text-size or privacy run). Nightly and manual runs always run everything.
//
// The rule is a short list of what is NEVER read, not a list of what is: a
// mutation run starts every test in src/, and those tests read lessons,
// public/, emails/, scripts/, astro.config.mjs and more; the other two build
// the whole site. So anything not on the list below runs all three. A test
// (check-inputs.test.mjs) fails if a file the three start (src/, test/, the
// build's configuration and scripts, the two audits and what they import)
// names one of these places directly in a read (a literal path in join,
// resolve, readFileSync, readdirSync, globSync or new URL); a read through a
// variable or a helper is not caught, so a new read of these places is
// checked by hand before it lands.

/** Prefixes (ending in /) and exact paths none of the three workflows reads. */
export const NEVER_READ = ['docs/', '.claude/', '.github/', 'README.md', 'CLAUDE.md'];

/**
 * The three workflows, which name the three suites. Each reads one file
 * inside a NEVER_READ prefix of its own: a change to one of them runs that
 * suite and not the other two.
 */
export const WORKFLOWS = [
  '.github/workflows/tool-mutation.yml',
  '.github/workflows/tool-text-size.yml',
  '.github/workflows/tool-privacy.yml',
];

/**
 * The workflows every suite reads: tool-suite.yml holds the jobs of all
 * three, and pr-checks.yml runs them on a pull request. A change to either
 * runs all three suites.
 */
export const SHARED = [
  '.github/workflows/tool-suite.yml',
  '.github/workflows/pr-checks.yml',
];

/** True when changing `path` can change what the workflow `own` measures. */
export function isInput(path, own) {
  if (path === own || SHARED.includes(path)) return true;
  return !NEVER_READ.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));
}

/** The paths in `git diff --name-only --no-renames -z` output. */
export function changedPaths(nulSeparated) {
  return nulSeparated.split('\0').filter((p) => p !== '');
}

/**
 * Whether a pull request changing `paths` needs the workflow `own` (one of
 * WORKFLOWS) to run. An empty or unreadable list runs it, and so does a
 * workflow this file does not know: the answer fails open toward running,
 * never toward skipping.
 */
export function needsRun(paths, own) {
  if (!WORKFLOWS.includes(own)) return true;
  const list = (paths ?? []).filter((p) => typeof p === 'string' && p !== '');
  return list.length === 0 || list.some((p) => isInput(p, own));
}
