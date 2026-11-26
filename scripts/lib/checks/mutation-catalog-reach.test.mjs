// A tool's tests reach that tool's strings, not the whole catalog (#904).
//
// The mutation cache marks a test file when any file it reaches changes
// (mutation-deps.mjs), and it reaches whole files. `src/i18n/index.ts` holds
// all five catalogs, each of which holds every tool's strings, so a test
// that took one tool's labels from it was marked by an edit to any tool's
// strings: 100 of 237 test files, and nine tenths of all mutants, for one
// changed label. The tests and the helpers in test/ now import the strings
// they use from the module that defines them (`loanComparisonEn` from
// strings/tools/loanComparison.ts).
//
// This holds it there. It reads the same graph the cache uses (imports and
// reads, type-only imports left out), so a wrapper or a re-export does not
// get round it. It only ever fails a build: it changes nothing the cache
// marks.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGraph } from './mutation-deps.mjs';
import { isSelectedTest, trackedPaths } from './mutation-fingerprint.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).filter((p) => existsSync(join(ROOT, p)));
const graph = createGraph({ root: ROOT, tracked });
const tests = tracked.filter(isSelectedTest);
const reach = new Map(tests.map((test) => [test, new Set(graph.dependencies(test).files)]));

/** The modules that hold every tool's strings at once. */
const WHOLE = [
  'src/i18n/index.ts',
  ...['en', 'hi', 'es', 'cs', 'mr'].map((locale) => `src/i18n/strings/${locale}.ts`),
  'src/i18n/strings/tools/index.ts',
];

/**
 * The test files that reach a whole catalog, each with why it must. A new
 * one is added here, with its reason, or takes its strings from the modules
 * that define them.
 */
const BROAD = {
  'src/i18n/strings/catalog.test.ts': 'the catalogs themselves: every key in every language',
  'src/utils/shared/toolExports.test.ts': 'every tool\'s export labels in every language, on purpose',
  'src/components/nav.test.ts': 'the navigation labels, which live in the catalog proper',
  'src/utils/home/startingPoints.test.ts': 'the home page\'s tool cards, in the catalog proper',
  'src/utils/waitlistCount.test.ts': 'the waitlist\'s plural forms, in the Czech catalog proper',
  'src/utils/spelling.test.ts': 'the spelling of the English catalog, read whole',
  'src/utils/changesFeed.test.ts': 'the feed is built by changesFeed.ts, which takes its labels from the catalog as the site does',
};

const TOOLS = {
  loanComparison: /^src\/(components\/(Loan|ChartAmounts)|utils\/loan\/)/,
  multiCurrencyNetWorth: /^src\/(components\/(NetWorth|MultiCurrencyNetWorth)|utils\/multi-currency-net-worth\/)/,
  monteCarlo: /^src\/(components\/MonteCarlo|utils\/monte-carlo\/)/,
  inflation: /^src\/(components\/Inflation|utils\/inflation\/)/,
  investOrPayOff: /^src\/(components\/InvestOrPayOff|utils\/invest-or-pay-off\/)/,
};

/**
 * The test files, among `list`, that reach `tool`'s strings without being
 * that tool's own tests (`own`) or named in `broad`. A test that depends on
 * everything (`graph.dependencies(test).all` holds its reasons: a read that
 * cannot be worked out) is left out: every change marks it already, so
 * what it imports adds nothing to what is tested again.
 */
function othersReaching(graph, list, tool, own, broad) {
  const file = `src/i18n/strings/tools/${tool}.ts`;
  return list.filter((test) => {
    const { files, all } = graph.dependencies(test);
    return files.includes(file) && !own.test(test) && !(test in broad) && all.length === 0;
  });
}

describe('which tests reach the whole strings catalog', () => {
  it('only the ones named, each for its reason', () => {
    assert.ok(tests.length > 200, `only ${tests.length} test files found`);
    for (const whole of WHOLE) assert.ok(tracked.includes(whole), `${whole} is still there`);
    const reaching = tests.filter((test) => WHOLE.some((whole) => reach.get(test).has(whole)));
    assert.deepEqual(reaching.sort(), Object.keys(BROAD).sort());
    for (const reason of Object.values(BROAD)) assert.ok(reason.length > 20);
  });

  it('sees through a helper and a re-export, and leaves out an import of types only', () => {
    const memory = (files) => createGraph({ root: '/project', tracked: Object.keys(files), read: (p) => files[p] });
    const files = {
      'src/i18n/index.ts': "import { en } from './strings/en.ts';\nexport const DICTS = { en };\n",
      'src/i18n/strings/en.ts': 'export const en = {};\n',
      'test/helper.ts': "export { DICTS } from '../src/i18n/index.ts';\n",
      'src/a.test.ts': "import { DICTS } from '../test/helper.ts';\n",
      'src/b.test.ts': "import type { Dict } from './i18n/index.ts';\n",
    };
    const g = memory(files);
    assert.ok(g.dependencies('src/a.test.ts').files.includes('src/i18n/index.ts'));
    assert.ok(g.dependencies('src/a.test.ts').files.includes('src/i18n/strings/en.ts'));
    assert.ok(!g.dependencies('src/b.test.ts').files.includes('src/i18n/index.ts'));
  });
});

describe('which tests reach one tool\'s strings', () => {
  for (const [tool, own] of Object.entries(TOOLS)) {
    it(`${tool}: its own tests and the ones that reach the whole catalog, and no other tool's`, () => {
      const file = `src/i18n/strings/tools/${tool}.ts`;
      assert.ok(tracked.includes(file), file);
      const reaching = tests.filter((test) => reach.get(test).has(file));
      assert.ok(reaching.some((test) => own.test(test)), 'its own tests reach it');
      assert.deepEqual(othersReaching(graph, tests, tool, own, BROAD), []);
      // Far from the hundred that reached it through the catalog.
      assert.ok(reaching.length < 60, `${reaching.length} test files reach ${file}`);
    });
  }

  // The guard does fail: an inflation test that takes a loan label is found,
  // directly and through a helper, and not when it only names the type.
  it('finds another tool\'s test that imports a tool\'s strings (council, DeepSeek)', () => {
    const files = {
      'src/i18n/strings/tools/loanComparison.ts': 'export const loanComparisonEn = {};\n',
      'src/i18n/strings/tools/inflation.ts': 'export const inflationEn = {};\n',
      'test/helper.ts': "export { loanComparisonEn as loan } from '../src/i18n/strings/tools/loanComparison.ts';\n",
      'src/components/InflationParts.a.test.ts': "import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';\n",
      'src/components/InflationParts.b.test.ts': "import { loan } from '../../test/helper.ts';\n",
      'src/components/InflationParts.c.test.ts': "import type { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';\nimport { inflationEn } from '../i18n/strings/tools/inflation.ts';\n",
      'src/components/LoanParts.a.test.ts': "import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';\n",
      'src/components/InflationParts.wide.test.ts': "import { execFileSync } from 'node:child_process';\nimport { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';\n",
    };
    const g = createGraph({ root: '/project', tracked: Object.keys(files), read: (p) => files[p] });
    const list = Object.keys(files).filter(isSelectedTest);
    assert.equal(list.length, 5);
    assert.deepEqual(othersReaching(g, list, 'loanComparison', TOOLS.loanComparison, {}), ['src/components/InflationParts.a.test.ts', 'src/components/InflationParts.b.test.ts']);
    assert.deepEqual(othersReaching(g, list, 'loanComparison', TOOLS.loanComparison, { 'src/components/InflationParts.a.test.ts': 'named' }), ['src/components/InflationParts.b.test.ts']);
    assert.deepEqual(othersReaching(g, list, 'inflation', TOOLS.inflation, {}), []);
    // The one left out depends on everything, and that is why.
    assert.ok(g.dependencies('src/components/InflationParts.wide.test.ts').all.length > 0);
  });

  it('an edit to one tool\'s strings changes the fingerprint of a test of that tool, through its helper too, and of no other tool\'s test', () => {
    const edited = (path) => createGraph({ root: ROOT, tracked, read: (p) => (p === path ? `${readFileSync(join(ROOT, p), 'utf8')}\n// edited\n` : readFileSync(join(ROOT, p), 'utf8')) });
    const sample = ['src/components/LoanParts.rows.dom.test.tsx', 'src/components/LoanCompare.page-links.dom.test.tsx', 'src/components/MonteCarloParts.returnTip.test.ts', 'src/utils/inflation/report.test.ts'];
    for (const test of sample) assert.ok(tracked.includes(test), test);
    const before = Object.fromEntries(sample.map((test) => [test, graph.fingerprintOf(test).fingerprint]));
    const after = edited('src/i18n/strings/tools/loanComparison.ts');
    const changed = sample.filter((test) => after.fingerprintOf(test).fingerprint !== before[test]);
    assert.deepEqual(changed, ['src/components/LoanParts.rows.dom.test.tsx', 'src/components/LoanCompare.page-links.dom.test.tsx'], 'the loan test, and the loan test that takes its strings through test/loanCompare.page.tsx');
  });
});
