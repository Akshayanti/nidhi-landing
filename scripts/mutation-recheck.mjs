#!/usr/bin/env node
// Takes out of a shard's results, after a Stryker run, every kill that a
// new or edited test file covers, so a second run tests those mutants in
// full (#854; the rule and the reason are in lib/checks/mutation-recheck.mjs).
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
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { beforePath, takeOutKillsToRecheck } from './lib/checks/mutation-recheck.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.incrementalFile;
let selected = 0;
try {
  const before = JSON.parse(readFileSync(beforePath(path), 'utf8'));
  if (existsSync(path)) {
    const report = JSON.parse(readFileSync(path, 'utf8'));
    selected = takeOutKillsToRecheck(report, before);
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
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `checked=true\nselected=${selected}\n`);
