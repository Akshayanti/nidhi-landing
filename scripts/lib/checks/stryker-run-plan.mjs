// A Stryker reporter that writes which mutants a run ran itself (#854).
//
// In incremental mode Stryker plans every mutant as one to run, or as one
// whose earlier result is handed on (mutant-test-planner.js, 10.1.1: a plan
// of kind Run, or EarlyResult). The results it writes do not say which was
// which, and the recheck after the run needs to know: a reused kill that a
// new or edited test file covers must be tested again, and a kill the run
// just made must not be (mutation-recheck.mjs has the rule and the reason).
//
// So this reporter keeps the ids of the mutants planned to run, and when
// Stryker has its report, writes them beside the incremental file with a
// hash of that report. What makes the file safe to believe (checked in the
// 10.1.1 source, mutation-test-report-helper.js):
//
// - Stryker hands the report to the reporters and then writes the same
//   object as the incremental file, as `JSON.stringify(report, null, 2)`.
//   The hash here is of that text, so the recheck can tell that the results
//   on disk are the report this plan belongs to.
// - A mutant keeps its id from the plan to the report (only the tests are
//   numbered afresh).
// - A run that is cut short writes what it finished WITHOUT making the
//   report, so this reporter writes nothing, and the recheck falls back to
//   taking out every kill a new or edited test file covers.
//
// The file is removed as the reporter starts, so a run never leaves an
// earlier run's file behind, whatever becomes of it. If it cannot be
// removed the run fails. It is written whole or not at all, never changes a
// plan, and is never saved with the results.
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PluginKind, commonTokens, declareClassPlugin, tokens } from '@stryker-mutator/api/plugin';
import { planNote, planPath } from './mutation-recheck.mjs';

/** The name stryker.config.mjs gives among its `reporters`. */
export const NAME = 'run-plan';

/** The kind of a plan that runs its mutant (PlanKind.Run in @stryker-mutator/api/core). */
export const RUN = 'Run';

/** The text Stryker writes as the incremental file for `report` (mutation-test-report-helper.js, writeIncrementalReport). */
export function incrementalText(report) {
  return JSON.stringify(report, null, 2);
}

export class RunPlanReporter {
  static inject = tokens(commonTokens.options);

  constructor(options) {
    this.file = options.incremental === true && typeof options.incrementalFile === 'string' ? options.incrementalFile : null;
    this.ran = null;
    if (this.file !== null) rmSync(planPath(this.file), { force: true });
  }

  onMutationTestingPlanReady({ mutantPlans }) {
    this.ran = mutantPlans.filter((plan) => plan.plan === RUN).map((plan) => plan.mutant.id);
  }

  onMutationTestReportReady(report) {
    if (this.file === null || this.ran === null) return;
    const path = planPath(this.file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.tmp`, JSON.stringify(planNote(this.file, this.ran, incrementalText(report))));
    renameSync(`${path}.tmp`, path);
  }
}

export const strykerPlugins = [declareClassPlugin(PluginKind.Reporter, NAME, RunPlanReporter)];
