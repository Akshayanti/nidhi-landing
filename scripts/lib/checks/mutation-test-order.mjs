// The order a mutation run starts its test files in (#790).
//
// For each mutant Stryker runs the test files that cover it one after the
// other, in the order the configuration lists them (the tap runner alone
// does not keep that order; stryker-ordered-tap.mjs makes it), and stops at
// the first that fails. Listed by path, every test under src/components/ comes before
// every test under src/utils/, so a mutant in a helper met the whole-page
// tests of five tools (seconds each to start a browser and mount a page)
// before the unit test beside it that kills it in a few milliseconds.
//
// So the cheap ones come first: tests that need no browser, then tests that
// mount one part, then the parts files' page tests, then a tool's own
// whole-tool tests. Within a kind, by path.
// The order changes how long a mutant takes to die, not whether a test's
// assertion catches it: every covering file still runs for a mutant none of
// them stops. It can change what a mutant is called when one covering file
// fails an assertion under it and another cannot run at all (Killed if the
// first comes first, RuntimeError if the second does), since Stryker stops
// at either.

/**
 * 0 for a test with no browser, 1 for one that mounts a part, 2 for a parts
 * file's page tests (`<Name>Parts.page<.or->...dom.test.tsx`), 3 for a tool's
 * own whole-tool tests (`<Tool>.<...>.dom.test.tsx`). Both of the last two
 * mount the whole page. Counted as parts, the page tests ran before every
 * cheap part test below them in path order, so a mutant in shared code
 * waited for several pages to mount. Counted with the whole-tool tests and
 * sorted by path, a tool's older test file (\`MultiCurrencyNetWorth.dom\`,
 * \`InvestOrPayOff.dom\`) ran before the page tests that kill most of the
 * page's mutants, adding its few seconds to each of them.
 */
export function testCost(file, wholeTools) {
  const name = file.split('/').pop();
  if (!/\.dom\.test\.tsx?$/.test(name)) return 0;
  if (/^[A-Z]\w*Parts\.page[.-]/.test(name)) return 2;
  return wholeTools.some((tool) => name.startsWith(`${tool}.`)) ? 3 : 1;
}

/**
 * `files` cheapest first. `wholeTools` are the names of the components that
 * are a whole tool's page (their tests are `<Name>.<...>.dom.test.tsx`).
 */
export function cheapestFirst(files, wholeTools) {
  return [...files].sort((a, b) => testCost(a, wholeTools) - testCost(b, wholeTools) || (a < b ? -1 : a > b ? 1 : 0));
}
