// The order a mutation run starts its test files in (#790): cheap first.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cheapestFirst, testCost } from './mutation-test-order.mjs';

const TOOLS = ['LoanCompare', 'MonteCarloSimulator'];

describe('the order of a mutation run’s test files', () => {
  it('knows a test with no browser, one that mounts a part, and one that mounts a whole tool', () => {
    assert.equal(testCost('src/utils/loan/math.test.ts', TOOLS), 0);
    assert.equal(testCost('src/components/chart/useChartRem.test.ts', TOOLS), 0);
    assert.equal(testCost('src/components/MonteCarloParts.tableYears.test.ts', TOOLS), 0);
    assert.equal(testCost('src/components/Amounts.dom.test.tsx', TOOLS), 1);
    assert.equal(testCost('src/components/MonteCarloParts.Results.dom.test.tsx', TOOLS), 1);
    assert.equal(testCost('src/utils/shared/exportFile.dom.test.ts', TOOLS), 1);
    assert.equal(testCost('src/components/LoanCompare.dom.test.tsx', TOOLS), 3);
    assert.equal(testCost('src/components/MonteCarloSimulator.chart-wide.dom.test.tsx', TOOLS), 3);
  });

  it('counts a parts file\'s page tests after the parts and before a tool\'s own whole-tool tests', () => {
    assert.equal(testCost('src/components/NetWorthParts.page.dom.test.tsx', TOOLS), 2);
    assert.equal(testCost('src/components/NetWorthParts.page.share.rows.dom.test.tsx', TOOLS), 2);
    assert.equal(testCost('src/components/MonteCarloParts.page-form.dom.test.tsx', TOOLS), 2);
    assert.equal(testCost('src/components/InvestOrPayOffParts.page.history.dom.test.tsx', TOOLS), 2);
    assert.equal(testCost('src/components/NetWorthParts.PrintedReport.dom.test.tsx', TOOLS), 1);
    assert.equal(testCost('src/components/NetWorthParts.pageless.dom.test.tsx', TOOLS), 1);
    assert.equal(testCost('src/components/NetWorthParts.helpers.test.ts', TOOLS), 0);
    // A tool's own page tests come before its older whole-tool file, which
    // kills few of the page's mutants: by path alone it would run first.
    assert.ok(cheapestFirst(['src/components/NetWorthParts.page.dom.test.tsx', 'src/components/MultiCurrencyNetWorth.dom.test.tsx'], ['MultiCurrencyNetWorth'])[0].includes('NetWorthParts.page'));
    assert.ok(cheapestFirst(['src/components/InvestOrPayOff.dom.test.tsx', 'src/components/InvestOrPayOffParts.page.dom.test.tsx'], ['InvestOrPayOff'])[0].includes('InvestOrPayOffParts.page'));
  });

  it('does not take a part for a whole tool because their names begin alike', () => {
    assert.equal(testCost('src/components/LoanCompareRow.dom.test.tsx', TOOLS), 1);
    assert.equal(testCost('src/components/MonteCarloSimulator.test.ts', TOOLS), 0);
  });

  it('puts the cheap ones first, and keeps path order within a kind', () => {
    const files = [
      'src/components/LoanCompare.dom.test.tsx',
      'src/components/Amounts.dom.test.tsx',
      'src/components/MonteCarloSimulator.start.dom.test.tsx',
      'src/components/MonteCarloParts.Results.dom.test.tsx',
      'src/utils/shared/xlsx.test.ts',
      'src/utils/loan/math.test.ts',
    ];
    assert.deepEqual(cheapestFirst(files, TOOLS), [
      'src/utils/loan/math.test.ts',
      'src/utils/shared/xlsx.test.ts',
      'src/components/Amounts.dom.test.tsx',
      'src/components/MonteCarloParts.Results.dom.test.tsx',
      'src/components/LoanCompare.dom.test.tsx',
      'src/components/MonteCarloSimulator.start.dom.test.tsx',
    ]);
    assert.equal(files[0], 'src/components/LoanCompare.dom.test.tsx', 'the list given is left as it was');
  });

  it('loses and adds no file', () => {
    const files = ['b.dom.test.tsx', 'a.test.ts', 'LoanCompare.x.dom.test.tsx', 'c.test.tsx'];
    assert.deepEqual([...cheapestFirst(files, TOOLS)].sort(), [...files].sort());
  });

  it('is what stryker.config.mjs lists: no whole-tool test before a cheaper one, every tool’s component known', async () => {
    process.env.STRYKER_SCOPE ??= 'inflation';
    const { default: config, SCOPES } = await import('../../../stryker.config.mjs');
    const tools = Object.entries(SCOPES).filter(([scope]) => scope !== 'shared')
      .flatMap(([, patterns]) => patterns.filter((p) => p.startsWith('src/components/')).map((p) => p.split('/').pop().replace(/\.tsx$/, '')));
    assert.equal(tools.length, 5);
    const costs = config.tap.testFiles.map((f) => testCost(f, tools));
    assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
    assert.ok(costs.includes(0) && costs.includes(1) && costs.includes(2));
    assert.deepEqual(config.tap.testFiles, cheapestFirst(config.tap.testFiles, tools));
  });
});
