// Mutation testing (#790): one scope per run, chosen by STRYKER_SCOPE, each
// held to its own floors (never pooled). Every test file may kill a mutant;
// per-test coverage runs only the tests that reach it.
//
// Speed (#846): STRYKER_SHARD=<i>/<n> runs one of a scope's n shards, cut
// between top-level statements (scripts/lib/checks/mutation-shards.mjs), so
// CI runs a slow scope on several runners at once; stryker.shards.json says
// how many. Results are kept per shard (incremental mode): a run retests only
// mutants whose code or tests changed. STRYKER_FORCE=1 (the nightly run)
// retests everything.
import { globSync, readFileSync } from 'node:fs';
import { shardPatterns } from './scripts/lib/checks/mutation-shards.mjs';

const SCOPES = {
  inflation: ['src/utils/inflation/*.ts', 'src/components/InflationCalculator.tsx'],
  'invest-or-pay-off': ['src/utils/invest-or-pay-off/*.ts', 'src/components/InvestOrPayOff.tsx'],
  'monte-carlo': ['src/utils/monte-carlo/*.ts', 'src/components/MonteCarloSimulator.tsx'],
  loan: ['src/utils/loan/*.ts', 'src/components/LoanCompare.tsx'],
  'net-worth': ['src/utils/multi-currency-net-worth/*.ts', 'src/components/MultiCurrencyNetWorth.tsx'],
  // What the tools share: the helpers, and the components every tool draws with.
  shared: [
    'src/utils/shared/*.ts',
    'src/utils/shared/*.js',
    'src/components/{Amounts,ChartAmounts,LocaleNumberInput,ToolExport,toolShared}.tsx',
    'src/components/useMoney.ts',
    'src/components/chart/*.{ts,tsx}',
  ],
};

const SOURCE_READERS = ['src/utils/privacySurface.test.ts'];

const TEST_FILES = globSync(['src/**/*.test.ts', 'src/**/*.test.tsx']).filter((f) => !SOURCE_READERS.includes(f)).sort();

// Read by test/mutationRun.ts in every test process Stryker starts.
process.env.NIDHI_MUTATION_RUN = '1';

const scope = process.env.STRYKER_SCOPE;
if (!SCOPES[scope]) throw new Error(`STRYKER_SCOPE must be one of: ${Object.keys(SCOPES).join(', ')}`);

const SHARDS = JSON.parse(readFileSync(new URL('./stryker.shards.json', import.meta.url), 'utf8'));
// What each statement cost to test in a full run, for scopes dealt by cost
// rather than round-robin, so their shards finish together (#848).
const WEIGHTS = JSON.parse(readFileSync(new URL('./stryker.shard-weights.json', import.meta.url), 'utf8'));
const [shard, shardCount] = (process.env.STRYKER_SHARD ?? `1/${SHARDS[scope]}`).split('/').map(Number);
if (shardCount !== SHARDS[scope]) throw new Error(`${scope} has ${SHARDS[scope]} shard(s) in stryker.shards.json, not ${shardCount}`);
const files = globSync(SCOPES[scope]).filter((f) => !/\.test\.tsx?$/.test(f)).sort();
const name = shardCount === 1 ? scope : `${scope}-${shard}of${shardCount}`;
// One shard of several: whole-statement ranges. A scope of one shard: every file.
const mutate = shardCount === 1 ? files : shardPatterns(files, shardCount, shard, undefined, WEIGHTS[scope] ?? null);

export default {
  testRunner: 'tap',
  tap: {
    // Tests that read the source as text (the privacy surface, the tool
    // privacy rules) cannot judge a mutant: under Stryker they read the
    // instrumented copy. They still run in `npm test` on every pull request.
    testFiles: TEST_FILES,
    nodeArgs: ['--import', 'tsx', '--test-reporter=tap'],
    forceBail: true,
  },
  coverageAnalysis: 'perTest',
  mutate,
  concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
  reporters: ['clear-text', 'json', 'progress'],
  jsonReporter: { fileName: `reports/mutation/${name}.json` },
  incremental: true,
  incrementalFile: `reports/stryker-incremental/${name}.json`,
  force: process.env.STRYKER_FORCE === '1',
  clearTextReporter: { logTests: false, reportMutants: false },
  // Stryker's TypeScript checker step reads a tsconfig this project's tsx
  // setup does not need; skipping it leaves compile errors to the test run.
  tsconfigFile: 'stryker-no-tsconfig.json',
  tempDirName: '.stryker-tmp',
  // Not copied into a sandbox: other runs' sandboxes, reports and builds.
  ignorePatterns: ['.stryker-tmp*', 'reports', 'dist', 'tools/astro-check/node_modules', '.astro'],
  // The gate is scripts/mutation-floors.mjs: each scope's logic and component
  // against its floor in stryker.floors.json, rising to 95. Stryker itself
  // only colours its report.
  thresholds: { high: 95, low: 80, break: null },
};
