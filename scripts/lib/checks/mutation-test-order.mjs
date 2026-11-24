// The order a mutation run starts its test files in (#790).
//
// For each mutant Stryker runs the test files that cover it one after the
// other, in the order the configuration lists them, and stops at the first
// that fails. Listed by path, every test under src/components/ comes before
// every test under src/utils/, so a mutant in a helper met the whole-page
// tests of five tools (seconds each to start a browser and mount a page)
// before the unit test beside it that kills it in a few milliseconds.
//
// So the cheap ones come first: tests that need no browser, then tests that
// mount one part, then tests that mount a whole tool. Within a kind, by path.
// The order changes how long a mutant takes to die, not whether a test's
// assertion catches it: every covering file still runs for a mutant none of
// them stops. It can change what a mutant is called when one covering file
// fails an assertion under it and another cannot run at all (Killed if the
// first comes first, RuntimeError if the second does), since Stryker stops
// at either.

/** 0 for a test with no browser, 1 for one that mounts a part, 2 for one that mounts a whole tool. */
export function testCost(file, wholeTools) {
  const name = file.split('/').pop();
  if (!/\.dom\.test\.tsx?$/.test(name)) return 0;
  return wholeTools.some((tool) => name.startsWith(`${tool}.`)) ? 2 : 1;
}

/**
 * `files` cheapest first. `wholeTools` are the names of the components that
 * are a whole tool's page (their tests are `<Name>.<...>.dom.test.tsx`).
 */
export function cheapestFirst(files, wholeTools) {
  return [...files].sort((a, b) => testCost(a, wholeTools) - testCost(b, wholeTools) || (a < b ? -1 : a > b ? 1 : 0));
}
