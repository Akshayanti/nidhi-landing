// The reporter that writes which mutants a Stryker run ran itself (#854,
// stryker-run-plan.mjs): what it writes and when, on plans and reports of the
// shape Stryker gives it. Real runs with it are in mutation-recheck.test.mjs.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlanKind } from '@stryker-mutator/api/core';
import { PluginKind } from '@stryker-mutator/api/plugin';
import { killsRunNow, planPath, reportHash } from './mutation-recheck.mjs';
import { NAME, RUN, RunPlanReporter, incrementalText, strykerPlugins } from './stryker-run-plan.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
// Any scope will do: the plugins and reporters are the same for all.
process.env.STRYKER_SCOPE ??= 'inflation';
const { default: config } = await import('../../../stryker.config.mjs');

const inFolder = (use) => {
  const dir = mkdtempSync(join(tmpdir(), 'nidhi-run-plan-'));
  try {
    use(join(dir, 'reports/inc.json'), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const plans = [
  { plan: PlanKind.Run, mutant: { id: '0' } },
  { plan: PlanKind.EarlyResult, mutant: { id: '1', status: 'Killed' } },
  { plan: PlanKind.Run, mutant: { id: '2' } },
  { plan: PlanKind.EarlyResult, mutant: { id: '3', status: 'Ignored' } },
];
const report = { schemaVersion: '1.0', files: { 'src/code.ts': { mutants: [{ id: '0', status: 'Killed' }] } }, testFiles: {} };

describe('the reporter of the run\'s plan', () => {
  it('is a reporter plugin under the name the configuration lists', () => {
    assert.equal(strykerPlugins.length, 1);
    assert.deepEqual([strykerPlugins[0].kind, strykerPlugins[0].name, strykerPlugins[0].injectableClass], [PluginKind.Reporter, NAME, RunPlanReporter]);
    assert.ok(config.reporters.includes(NAME));
    assert.ok(config.appendPlugins.includes('./scripts/lib/checks/stryker-run-plan.mjs'));
    assert.equal(config.incremental, true);
    assert.equal(RUN, PlanKind.Run, 'the kind of a plan that runs its mutant, as Stryker names it');
  });

  it('writes the mutants planned to run, with the hash of the report as Stryker writes it', () => {
    inFolder((file) => {
      const reporter = new RunPlanReporter({ incremental: true, incrementalFile: file });
      reporter.onMutationTestingPlanReady({ mutantPlans: plans });
      assert.equal(existsSync(planPath(file)), false, 'nothing until the report is made');
      reporter.onMutationTestReportReady(report);
      const written = JSON.parse(readFileSync(planPath(file), 'utf8'));
      assert.deepEqual(written.ran, ['0', '2']);
      assert.equal(written.file, file);
      // Stryker then writes the incremental file: the same object, indented by two.
      assert.equal(incrementalText(report), JSON.stringify(report, null, 2));
      assert.equal(written.report, reportHash(JSON.stringify(report, null, 2)));
      assert.deepEqual([...killsRunNow(written, file, JSON.stringify(report, null, 2))], ['0', '2']);
      assert.equal(killsRunNow(written, file, JSON.stringify(report)), null, 'the same report written another way is not vouched for');
      assert.deepEqual(readdirSync(join(file, '..')), ['inc.plan.json'], 'written whole: no half-written file is left');
    });
  });

  it('writes Stryker\'s own text for the incremental file (10.1.1)', () => {
    const helper = readFileSync(join(ROOT, 'node_modules/@stryker-mutator/core/dist/src/reporters/mutation-test-report-helper.js'), 'utf8');
    assert.ok(helper.includes('await this.fs.writeFile(this.options.incrementalFile, JSON.stringify(report, null, 2), \'utf-8\');'));
    // The reporters are told first, then the file is written, and only when the report was made.
    assert.match(helper, /this\.reporter\.onMutationTestReportReady\(report, metrics\);\n\s+if \(this\.options\.incremental\) \{\n\s+await this\.writeIncrementalReport\(report\);/);
    // A mutant keeps its id into the report; only the tests are numbered afresh.
    assert.match(helper, /const \{ fileName, location, killedBy, coveredBy, \.\.\.apiMutant \} = mutantResult;\n\s+return \{\n\s+\.\.\.apiMutant,/);
    const planner = readFileSync(join(ROOT, 'node_modules/@stryker-mutator/core/dist/src/mutants/mutant-test-planner.js'), 'utf8');
    assert.ok(planner.includes('this.reporter.onMutationTestingPlanReady({ mutantPlans });'));
  });

  it('removes an earlier run\'s file as it starts, and writes none when the report is never made', () => {
    inFolder((file) => {
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(planPath(file), '{"an":"earlier run"}');
      const reporter = new RunPlanReporter({ incremental: true, incrementalFile: file });
      assert.equal(existsSync(planPath(file)), false);
      // The run is cut short after the plan: Stryker makes no report.
      reporter.onMutationTestingPlanReady({ mutantPlans: plans });
      assert.equal(existsSync(planPath(file)), false);
    });
  });

  it('fails the run when the earlier file cannot be removed', () => {
    inFolder((file) => {
      mkdirSync(planPath(file), { recursive: true });
      writeFileSync(join(planPath(file), 'kept'), '');
      assert.throws(() => new RunPlanReporter({ incremental: true, incrementalFile: file }));
    });
  });

  it('writes nothing without a plan, and nothing outside incremental mode', () => {
    inFolder((file, dir) => {
      new RunPlanReporter({ incremental: true, incrementalFile: file }).onMutationTestReportReady(report);
      const off = new RunPlanReporter({ incremental: false, incrementalFile: file });
      off.onMutationTestingPlanReady({ mutantPlans: plans });
      off.onMutationTestReportReady(report);
      const none = new RunPlanReporter({ incremental: true });
      none.onMutationTestingPlanReady({ mutantPlans: plans });
      none.onMutationTestReportReady(report);
      assert.deepEqual(readdirSync(dir), []);
    });
  });

  it('says a run that reused everything ran nothing, which is not the same as saying nothing', () => {
    inFolder((file) => {
      const reporter = new RunPlanReporter({ incremental: true, incrementalFile: file });
      reporter.onMutationTestingPlanReady({ mutantPlans: plans.filter((p) => p.plan === PlanKind.EarlyResult) });
      reporter.onMutationTestReportReady(report);
      assert.deepEqual([...killsRunNow(JSON.parse(readFileSync(planPath(file), 'utf8')), file, incrementalText(report))], []);
    });
  });
});
