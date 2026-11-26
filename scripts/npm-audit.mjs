#!/usr/bin/env node
// The audit check: fails on a high or critical advisory in any install the
// repository runs, except an advisory that has a dated exception in
// scripts/lib/checks/audit-exceptions.mjs. See that file for when an exception is
// given and how it ends.
//
// Every install, not only what the site ships (#791, council 2026-11-23): the
// build, test and video tools run in CI with the repository checked out, so
// an advisory in them is as much a gate's business as one in astro.
//
//   node scripts/npm-audit.mjs
//
// Exit code 1 when an advisory blocks, 2 when an audit itself could not run.

import { spawnSync } from 'node:child_process';
import { EXCEPTIONS, judge } from './lib/checks/audit-exceptions.mjs';

/** Each lockfile in the repository, and what it installs. */
export const INSTALLS = [
  { dir: '.', what: 'the site, its build and its tests' },
  { dir: 'remotion', what: 'the video renders' },
  { dir: 'tools/astro-check', what: 'astro check' },
];

function audit(dir) {
  const run = spawnSync('npm', ['audit', '--json'], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    console.error(`${dir}: npm audit gave no report to read.`);
    console.error(run.stderr || run.stdout);
    process.exit(2);
  }
  // With no connection to the registry npm prints an error object, not a report.
  if (report.error || !report.vulnerabilities) {
    console.error(`${dir}: npm audit could not run: ${report.error?.summary ?? report.message ?? 'no vulnerabilities list in its output'}`);
    process.exit(2);
  }
  return report;
}

const today = new Date().toISOString().slice(0, 10);
let blocking = [];
let excepted = [];
for (const { dir, what } of INSTALLS) {
  const judged = judge(audit(dir), EXCEPTIONS, today);
  console.log(`${dir} (${what}): ${judged.blocking.length} blocking, ${judged.excepted.length} under a dated exception.`);
  blocking = blocking.concat(judged.blocking.map((b) => ({ ...b, dir })));
  excepted = excepted.concat(judged.excepted.map((e) => ({ ...e, dir })));
}

for (const e of excepted) {
  console.log(`EXCEPTION in ${e.dir} until ${e.until}: ${e.id} (${e.severity}) ${e.title}`);
  console.log(`  in: ${e.packages.join(', ')}`);
  console.log(`  why: ${e.reason}`);
}
for (const b of blocking) {
  console.log(`BLOCKING in ${b.dir}: ${b.id} (${b.severity}) ${b.title}`);
  console.log(`  in: ${b.packages.join(', ')}`);
  console.log(`  ${b.url}`);
  if (b.expired) console.log(`  Its exception ended on ${b.expired}.`);
}
console.log(`\n${blocking.length} blocking, ${excepted.length} under a dated exception (high and critical only).`);
process.exit(blocking.length ? 1 : 0);
