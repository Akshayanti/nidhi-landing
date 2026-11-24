#!/usr/bin/env node
// Takes the timeouts and errors out of a shard's restored results, so
// Stryker tests those mutants again on every run (#855; the rule and the
// reason are in lib/checks/mutation-stale-results.mjs).
//
//   STRYKER_SCOPE=<scope> STRYKER_SHARD=<i>/<n> node scripts/mutation-stale-results.mjs
//
// Run before Stryker, in the same environment. With no earlier results there
// is nothing to do. Earlier results that cannot be read are removed, so the
// shard starts afresh rather than from a file nobody can vouch for.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dropUnsafeResults } from './lib/checks/mutation-stale-results.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.incrementalFile;
if (!existsSync(path)) {
  console.log(`${path}: no earlier results.`);
  process.exit(0);
}
let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
  if (!report.files || typeof report.files !== 'object') throw new Error('no files in it');
} catch (error) {
  rmSync(path);
  console.log(`${path}: earlier results could not be read (${error.message}); the shard starts afresh.`);
  process.exit(0);
}
const dropped = dropUnsafeResults(report);
if (dropped > 0) writeFileSync(path, JSON.stringify(report));
console.log(`${path}: ${dropped} earlier timeout(s) or error(s) taken out, to be tested again.`);
