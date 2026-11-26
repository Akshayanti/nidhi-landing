#!/usr/bin/env node
// Checks the static dependency analysis of the mutation cache against what
// the tests really do (#891, condition 1: static analysis and run-time
// tracing together).
//
//   node scripts/check-mutation-deps.mjs [test files...]
//
// Runs each test file a mutation run starts (or the ones named) under
// lib/checks/trace-deps-hook.mjs, which records every module it loads and
// every path it reads, and fails when a file under src/ that the test
// reached is missing from the dependencies mutation-deps.mjs found for it.
// Files outside src/, and any package.json or tsconfig in it, are in the
// shards' global fingerprint (mutation-fingerprint.mjs), so only the rest
// of src/ is compared. A test whose
// analysis already says "depends on everything" is not run: nothing can be
// missing from it.
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
import { PACKAGE_SCOPE, isSelectedTest, trackedPaths } from './lib/checks/mutation-fingerprint.mjs';

const root = process.cwd();
const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const graph = createGraph({ root, tracked });
const named = process.argv.slice(2);
const tests = named.length > 0 ? named : tracked.filter(isSelectedTest);
const work = mkdtempSync(join(tmpdir(), 'mutation-deps-trace-'));
const hook = join(root, 'scripts/lib/checks/trace-deps-hook.mjs');
const isFile = (rel) => { try { return statSync(join(root, rel)).isFile(); } catch { return false; } };

/**
 * True when `rel` (a traced path) is held by `files` (paths, ?paths and
 * >prefixes): a file that is there only by its contents, so a read of it is
 * not covered by a mere "is it there"; a path that is not a file (a folder,
 * or a name looked for and not found) by whether it is there, or by a
 * listing of it or of a folder above it.
 */
export function covered(rel, files, isFile) {
  if (isFile(rel)) return files.has(rel);
  if (files.has(`?${rel}`) || files.has(`>${rel}/`)) return true;
  for (const entry of files) {
    if (entry.startsWith('>') && rel.startsWith(entry.slice(1))) return true;
  }
  return false;
}

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
    try { lines = readFileSync(out, 'utf8').split('\n').filter(Boolean); } catch { /* nothing recorded */ }
    done({ test, code, stderr, lines });
  });
});

const results = [];
let wide = 0;
const queue = [];
for (const test of tests) {
  if (graph.dependencies(test).all.length > 0) { wide += 1; continue; }
  queue.push(test);
}
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
for (const { test, code, stderr, lines } of results.sort((a, b) => a.test.localeCompare(b.test))) {
  if (code !== 0) {
    failed += 1;
    console.error(`${test}: the test failed under the trace (exit ${code}), so what it reaches is not known.\n${stderr.slice(-2000)}`);
    continue;
  }
  const files = new Set(graph.dependencies(test).files);
  const missing = new Set();
  for (const abs of lines) {
    const rel = relative(root, abs).split('\\').join('/').replace(/\/$/, '');
    // Outside src/, and the package.json and tsconfig lookups in src/: in the global fingerprint.
    if (!rel.startsWith('src/') || PACKAGE_SCOPE.test(rel)) continue;
    if (!covered(rel, files, isFile)) missing.add(rel);
  }
  if (missing.size > 0) {
    misses += missing.size;
    console.error(`${test} reaches, but its fingerprint leaves out:\n${[...missing].sort().map((m) => `  ${m}`).join('\n')}`);
  }
}
console.log(`check-mutation-deps: ${results.length} test file(s) traced, ${wide} that depend on everything not run, ${misses} file(s) missed, ${failed} test file(s) failed.`);
process.exit(misses > 0 || failed > 0 ? 1 : 0);
