#!/usr/bin/env node
// Checks the static dependency analysis of the mutation cache against what
// the tests really do (#891, condition 1: static analysis and run-time
// tracing together).
//
//   node scripts/check-mutation-deps.mjs [test files...]
//
// Runs each test file a mutation run starts (or the ones named) under
// lib/checks/trace-deps-hook.mjs, which records every module it loads and
// every path it reads, and fails when a file the test reached is missing
// from the dependencies mutation-deps.mjs found for it. Every read inside
// the project is compared, under src/ and outside it (#904), but for what
// is in the shards' shared fingerprint (mutation-fingerprint.mjs: a change
// there starts every shard afresh, so nothing can be stale) and the
// installed packages (the lockfile is in that fingerprint).
//
// A test whose analysis says "depends on everything" is run too. Its
// fingerprint is the hash of every tracked file a mutation run can read, so
// a read of it passes when the path is one of those, and fails when it is a
// tracked file outside them (docs/, .claude/: a change there skips the
// suite) or a file git does not track (`heldByEverything`).
//
// A miss means a stale result is possible: a change to that file would not
// make Stryker test that test's mutants again. Fix the analysis (or make it
// widen) before merging. A test that fails under the trace fails the check:
// a test that stopped early may not have reached everything.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createGraph } from './lib/checks/mutation-deps.mjs';
import { isFingerprinted, isSelectedTest, trackedPaths } from './lib/checks/mutation-fingerprint.mjs';
import { UNWRITTEN, covered, heldByEverything, inSharedFingerprint, kindOf, outside } from './lib/checks/mutation-trace.mjs';

const root = process.cwd();
const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const graph = createGraph({ root, tracked });
const named = process.argv.slice(2);
const tests = named.length > 0 ? named : tracked.filter(isSelectedTest);
const work = mkdtempSync(join(tmpdir(), 'mutation-deps-trace-'));
// Beside this script, wherever the checkout it checks is.
const hook = join(import.meta.dirname, 'lib/checks/trace-deps-hook.mjs');
const isFile = (rel) => { try { return statSync(join(root, rel)).isFile(); } catch { return false; } };

const run = (test, i) => new Promise((done) => {
  const out = join(work, `${i}.trace`);
  const child = spawn(process.execPath, ['--import', 'tsx', '--import', hook, '--test', '--test-reporter=dot', test], {
    cwd: root,
    env: { ...process.env, TRACE_DEPS_OUT: out },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  child.on('close', (code) => {
    let lines = [];
    // No trace at all is not "nothing was read": every test process loads
    // at least its own file, so a missing or empty trace is a failed check.
    let traced = true;
    try { lines = readFileSync(out, 'utf8').split('\n').filter(Boolean); } catch { traced = false; }
    done({ test, code, stderr, lines, traced: traced && lines.length > 0 && !stderr.includes(UNWRITTEN) });
  });
});

const results = [];
const trackedSet = new Set(tracked);
const isWide = (test) => graph.dependencies(test).all.length > 0;
const queue = [...tests];
let next = 0;
const workers = Array.from({ length: Math.max(1, Math.floor(availableParallelism() / 2)) }, async () => {
  while (next < queue.length) {
    const i = next++;
    results.push(await run(queue[i], i));
  }
});
await Promise.all(workers);
rmSync(work, { recursive: true, force: true });

let failed = 0;
let misses = 0;
let wide = 0;
for (const { test, code, stderr, lines, traced } of results.sort((a, b) => a.test.localeCompare(b.test))) {
  if (code !== 0) {
    failed += 1;
    console.error(`${test}: the test failed under the trace (exit ${code}), so what it reaches is not known.\n${stderr.slice(-2000)}`);
    continue;
  }
  if (!traced) {
    failed += 1;
    console.error(`${test}: no trace was written, or one could not be, so what it reaches is not known.`);
    continue;
  }
  const everything = isWide(test);
  if (everything) wide += 1;
  const files = everything ? null : new Set(graph.dependencies(test).files);
  const missing = new Set();
  for (const line of lines) {
    // `>` before a path: the folder was listed (trace-deps-hook.mjs).
    const listed = line.startsWith('>');
    const rel = relative(root, listed ? line.slice(1) : line).split('\\').join('/').replace(/\/$/, '');
    // Every process looks at the project folder itself; only a listing of it is compared.
    if (outside(rel) || (rel === '' && !listed)) continue;
    const kind = kindOf(() => statSync(join(root, rel)));
    if (inSharedFingerprint(rel, isFingerprinted, trackedSet, kind)) continue;
    const held = everything ? heldByEverything(rel, trackedSet, kind) : covered(rel, files, isFile, listed);
    if (!held) missing.add(rel === '' ? '. (the project folder, listed)' : rel);
  }
  if (missing.size > 0) {
    misses += missing.size;
    console.error(`${test} reaches, but its fingerprint leaves out:\n${[...missing].sort().map((m) => `  ${m}`).join('\n')}`);
  }
}
console.log(`check-mutation-deps: ${results.length} test file(s) traced, ${wide} of them depending on everything, ${misses} file(s) missed, ${failed} test file(s) failed.`);
process.exit(misses > 0 || failed > 0 ? 1 : 0);
