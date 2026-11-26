#!/usr/bin/env node
// Takes out of a shard's results, after a Stryker run, every reused kill
// that a new or edited test file covers, so a second run tests those mutants
// in full (#854; the rule and the reason are in lib/checks/mutation-recheck.mjs).
// A kill the run made itself stays, when the plan the run left says so
// (lib/checks/stryker-run-plan.mjs); the plan is read once and removed.
//
//   STRYKER_SCOPE=<scope> STRYKER_SHARD=<i>/<n> node scripts/mutation-recheck.mjs
//
// Run after Stryker, in the same environment, whether Stryker passed, failed
// or was cancelled; mutation-stale-results.mjs must have run before Stryker.
// Under GitHub Actions it sets two outputs, as its last act: `checked=true`
// (the results now hold no kill left to recheck, so they may be saved) and
// `selected=<n>` (how many were taken out; above zero, Stryker runs again).
// Exit 1, with no output set, when the note of the test files before the run
// or the results cannot be read: nothing is vouched for, so nothing is saved.
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { beforePath, killsRunNow, planPath, takeOutKillsToRecheck } from './lib/checks/mutation-recheck.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.incrementalFile;
let selected = 0;
// The mutants this run ran itself, when its plan vouches for the results on
// disk; null otherwise, and then no kill is left in on the plan's word.
let ranNow = null;
try {
  const before = JSON.parse(readFileSync(beforePath(path), 'utf8'));
  const text = existsSync(path) ? readFileSync(path, 'utf8') : null;
  try {
    if (text !== null) ranNow = killsRunNow(JSON.parse(readFileSync(planPath(path), 'utf8')), path, text);
  } catch {
    ranNow = null;
  }
  // Read once: gone before anything is rewritten, so it can never be read
  // for other results. If it cannot be removed, the step fails.
  rmSync(planPath(path), { force: true });
  if (text !== null) {
    const report = JSON.parse(text);
    selected = takeOutKillsToRecheck(report, before, ranNow);
    if (selected > 0) {
      // Written whole or not at all: a run cancelled here leaves the file as
      // it was, and with no output set it is not saved.
      writeFileSync(`${path}.tmp`, JSON.stringify(report));
      renameSync(`${path}.tmp`, path);
    }
  } else {
    // No results at all, so no kill to recheck; the note must still be sound.
    takeOutKillsToRecheck({}, before);
  }
} catch (error) {
  console.error(`mutation-recheck: ${path}: ${error.message}. Nothing is vouched for, so nothing is saved.`);
  process.exit(1);
}
console.log(`${path}: ${selected} kill(s) covered by a new or edited test file taken out, to be tested again.`);
console.log(ranNow ? `${path}: the run's plan names ${ranNow.size} mutant(s) it ran itself; a kill among them stays.` : `${path}: no plan of this run vouches for these results, so no kill stays on its word.`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `checked=true\nselected=${selected}\n`);
