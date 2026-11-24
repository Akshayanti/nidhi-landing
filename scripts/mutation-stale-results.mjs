#!/usr/bin/env node
// Makes a shard's restored results ready for Stryker (#855, #854).
//
//   STRYKER_SCOPE=<scope> STRYKER_SHARD=<i>/<n> STRYKER_FORCE=<0|1> node scripts/mutation-stale-results.mjs
//
// Run before Stryker, in the same environment. It does two things:
//
// - Takes the timeouts and errors out, so Stryker tests those mutants again
//   on every run (the rule and the reason are in
//   lib/checks/mutation-stale-results.mjs). Earlier results that cannot be
//   read are removed, so the shard starts afresh rather than from a file
//   nobody can vouch for.
// - Notes the test files of the restored results as they were, in a file
//   beside them, for the recheck after the run (mutation-recheck.mjs; the
//   rule and the reason are in lib/checks/mutation-recheck.mjs). With no
//   earlier results, or on a forced run, Stryker reuses nothing, and the
//   note says so. The note is written last: without it the recheck fails
//   and nothing is saved.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { beforePath, testFilesBefore } from './lib/checks/mutation-recheck.mjs';
import { dropUnsafeResults } from './lib/checks/mutation-stale-results.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.incrementalFile;
const note = (report) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(beforePath(path), JSON.stringify(testFilesBefore(report)));
};
if (!existsSync(path)) {
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
  note(null);
  console.log(`${path}: earlier results could not be read (${error.message}); the shard starts afresh.`);
  process.exit(0);
}
const dropped = dropUnsafeResults(report);
if (dropped > 0) writeFileSync(path, JSON.stringify(report));
// A forced run retests every mutant: nothing is reused, so nothing is rechecked.
note(config.force ? null : report);
console.log(`${path}: ${dropped} earlier timeout(s) or error(s) taken out, to be tested again.`);
