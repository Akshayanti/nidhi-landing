// Mutation testing (#790): one scope per run, chosen by STRYKER_SCOPE, so CI
// runs the tools and the shared code as separate shards, each held to its own
// minimum (never pooled). Every test file may kill a mutant; per-test
// coverage runs only the tests that reach it.
import { globSync } from 'node:fs';

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
  mutate: [...SCOPES[scope], '!**/*.test.ts', '!**/*.test.tsx'],
  concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
  reporters: ['clear-text', 'json', 'progress'],
  jsonReporter: { fileName: `reports/mutation/${scope}.json` },
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
