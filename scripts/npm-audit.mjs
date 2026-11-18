#!/usr/bin/env node
// The audit check: fails on a high or critical advisory in what the site
// ships with (`npm audit --omit=dev`), except an advisory that has a dated
// exception in scripts/lib/audit-exceptions.mjs. See that file for when an
// exception is given and how it ends.
//
//   node scripts/npm-audit.mjs
//
// Exit code 1 when an advisory blocks, 2 when the audit itself could not run.

import { spawnSync } from 'node:child_process';
import { EXCEPTIONS, judge } from './lib/audit-exceptions.mjs';

const run = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error('npm audit gave no report to read.');
  console.error(run.stderr || run.stdout);
  process.exit(2);
}
// With no connection to the registry npm prints an error object, not a report.
if (report.error || !report.vulnerabilities) {
  console.error(`npm audit could not run: ${report.error?.summary ?? report.message ?? 'no vulnerabilities list in its output'}`);
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
const { blocking, excepted } = judge(report, EXCEPTIONS, today);

for (const e of excepted) {
  console.log(`EXCEPTION until ${e.until}: ${e.id} (${e.severity}) ${e.title}`);
  console.log(`  in: ${e.packages.join(', ')}`);
  console.log(`  why: ${e.reason}`);
}
for (const b of blocking) {
  console.log(`BLOCKING: ${b.id} (${b.severity}) ${b.title}`);
  console.log(`  in: ${b.packages.join(', ')}`);
  console.log(`  ${b.url}`);
  if (b.expired) console.log(`  Its exception ended on ${b.expired}.`);
}
console.log(`\n${blocking.length} blocking, ${excepted.length} under a dated exception (high and critical only).`);
process.exit(blocking.length ? 1 : 0);
