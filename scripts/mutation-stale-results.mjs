#!/usr/bin/env node
// Makes a shard's restored results ready for Stryker (#855, #854).
//
//   STRYKER_SCOPE=<scope> STRYKER_SHARD=<i>/<n> STRYKER_FORCE=<0|1> node scripts/mutation-stale-results.mjs
//
// Run before Stryker, in the same environment. It does these things:
//
// - Takes the timeouts and errors out, so Stryker tests those mutants again
//   on every run (the rule and the reason are in
//   lib/checks/mutation-stale-results.mjs). Earlier results that cannot be
//   read are removed, so the shard starts afresh rather than from a file
//   nobody can vouch for.
// - Makes Stryker see as changed every test file whose dependencies
//   changed since the results were saved (#891; the rule and the reason
//   are in lib/checks/mutation-deps.mjs), and writes today's dependency
//   fingerprints beside the results, saved with them.
// - Notes the test files of the restored results as they were, in a file
//   beside them, for the recheck after the run (mutation-recheck.mjs; the
//   rule and the reason are in lib/checks/mutation-recheck.mjs). With no
//   earlier results, or on a forced run, Stryker reuses nothing, and the
//   note says so. The note is written last: without it the recheck fails
//   and nothing is saved.
// - Removes the plan an earlier Stryker run may have left beside the
//   results (lib/checks/stryker-run-plan.mjs), before anything else.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { depsPath, invalidate, readStored, shardFingerprints } from './lib/checks/mutation-deps.mjs';
import { isSelectedTest, trackedPaths } from './lib/checks/mutation-fingerprint.mjs';
import { beforePath, planPath, testFilesBefore } from './lib/checks/mutation-recheck.mjs';
import { dropUnsafeResults } from './lib/checks/mutation-stale-results.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.incrementalFile;
const root = process.cwd();
// No plan of an earlier run outlives this step (lib/checks/mutation-recheck.mjs):
// the recheck believes only the one the run after this step writes.
rmSync(planPath(path), { force: true });
const writeWhole = (file, text) => {
  writeFileSync(`${file}.tmp`, text);
  renameSync(`${file}.tmp`, file);
};
const note = (report) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(beforePath(path), JSON.stringify(testFilesBefore(report)));
};

// Today's fingerprints: every test file a mutation run can start, and every
// file this shard mutates or holds results for. A file that cannot be
// fingerprinted fails the step: without the note below nothing is saved.
const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const fingerprintsFor = (report) => shardFingerprints({ root, tracked, isTest: isSelectedTest, mutate: config.mutate, report });
const saveFingerprints = (current) => {
  mkdirSync(dirname(path), { recursive: true });
  writeWhole(depsPath(path), JSON.stringify(current));
};

if (!existsSync(path)) {
  saveFingerprints(fingerprintsFor(null));
  note(null);
  console.log(`${path}: no earlier results.`);
  process.exit(0);
}
let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
  if (!report.files || typeof report.files !== 'object') throw new Error('no files in it');
} catch (error) {
  rmSync(path);
  saveFingerprints(fingerprintsFor(null));
  note(null);
  console.log(`${path}: earlier results could not be read (${error.message}); the shard starts afresh.`);
  process.exit(0);
}
const dropped = dropUnsafeResults(report);
const current = fingerprintsFor(report);
let stored = null;
try {
  stored = readStored(JSON.parse(readFileSync(depsPath(path), 'utf8')));
} catch {
  stored = null;
}
// With no fingerprints on record every test file counts as changed.
const { tests, mutants } = invalidate(report, stored, current, root);
// The results first, then the fingerprints: a step cut short between the
// two leaves the old fingerprints, and the next run marks the same files
// again. The other way round would pair today's fingerprints with results
// that were never marked.
if (dropped > 0 || tests.length > 0 || mutants > 0) writeWhole(path, JSON.stringify(report));
saveFingerprints(current);
// A forced run retests every mutant: nothing is reused, so nothing is rechecked.
note(config.force ? null : report);
console.log(`${path}: ${dropped} earlier timeout(s) or error(s) taken out, to be tested again.`);
console.log(`${path}: ${stored ? '' : 'no dependency fingerprints on record, so '}${tests.length} test file(s) whose dependencies changed are tested again; ${mutants} mutant(s) with no test on record in a changed file taken out.`);
if (tests.length > 0 && tests.length <= 40) console.log(tests.map((t) => `  ${t}`).join('\n'));
