// Earlier Timeout results whose tests have changed are tested again (#855):
// the rule on a report of the shape Stryker writes, and a real Stryker run
// where the test behind a timeout is deleted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dropStaleTimeouts } from './mutation-timeouts.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

/** A report as Stryker's incremental file holds it: two test files, one source file. */
function reportOf(mutants) {
  return {
    testFiles: {
      'src/a.test.ts': { source: 'a v1', tests: [{ id: '0', name: 'src/a.test.ts' }] },
      'src/b.test.ts': { source: 'b v1', tests: [{ id: '1', name: 'src/b.test.ts' }] },
    },
    files: { 'src/code.ts': { language: 'typescript', source: 'code', mutants } },
  };
}
const ON_DISK = { 'src/a.test.ts': 'a v1', 'src/b.test.ts': 'b v1' };
const reader = (files) => (path) => files[path] ?? null;
const statuses = (report) => report.files['src/code.ts'].mutants.map((m) => `${m.id}:${m.status}`);

describe('earlier timeouts whose tests have changed', () => {
  const MUTANTS = () => [
    { id: 't-a', status: 'Timeout', coveredBy: ['0'] },
    { id: 't-b', status: 'Timeout', coveredBy: ['1'] },
    { id: 't-ab', status: 'Timeout', coveredBy: ['0', '1'] },
    { id: 't-static', status: 'Timeout', static: true, coveredBy: [] },
    { id: 't-bare', status: 'Timeout' },
    { id: 'k-a', status: 'Killed', coveredBy: ['0'], killedBy: ['0'] },
    { id: 's-a', status: 'Survived', coveredBy: ['0'] },
    { id: 'n', status: 'NoCoverage', coveredBy: [] },
  ];

  it('are all kept while every test file is as it was', () => {
    const report = reportOf(MUTANTS());
    assert.equal(dropStaleTimeouts(report, reader(ON_DISK)), 0);
    assert.equal(report.files['src/code.ts'].mutants.length, 8);
  });

  it('are taken out when a test that covered them was deleted, and with it those no test is on record for', () => {
    const report = reportOf(MUTANTS());
    const { 'src/a.test.ts': gone, ...rest } = ON_DISK;
    assert.equal(gone, 'a v1');
    assert.equal(dropStaleTimeouts(report, reader(rest)), 4);
    assert.deepEqual(statuses(report), ['t-b:Timeout', 'k-a:Killed', 's-a:Survived', 'n:NoCoverage']);
  });

  it('are taken out when a test that covered them was edited', () => {
    const report = reportOf(MUTANTS());
    assert.equal(dropStaleTimeouts(report, reader({ ...ON_DISK, 'src/b.test.ts': 'b v2' })), 4);
    assert.deepEqual(statuses(report), ['t-a:Timeout', 'k-a:Killed', 's-a:Survived', 'n:NoCoverage']);
  });

  it('leave every other result alone: Stryker judges those itself', () => {
    const report = reportOf(MUTANTS());
    dropStaleTimeouts(report, reader({}));
    assert.deepEqual(statuses(report), ['k-a:Killed', 's-a:Survived', 'n:NoCoverage']);
  });

  it('are taken out when their covering test is not on record at all', () => {
    const report = reportOf([{ id: 't-x', status: 'Timeout', coveredBy: ['7'] }, { id: 't-b', status: 'Timeout', coveredBy: ['1'] }]);
    assert.equal(dropStaleTimeouts(report, reader(ON_DISK)), 1);
    assert.deepEqual(statuses(report), ['t-b:Timeout']);
  });

  it('copes with a file that records no tests or no mutants', () => {
    assert.equal(dropStaleTimeouts({ files: {} }, reader({})), 0);
    assert.equal(dropStaleTimeouts({ testFiles: { 'src/a.test.ts': { source: 'a v1' } }, files: { 'src/code.ts': { mutants: [] } } }, reader(ON_DISK)), 0);
  });
});

// The real thing, small: a loop whose mutant never ends, reached by one test
// file. With that file deleted, Stryker alone would hand the Timeout on.
describe('a real Stryker run, after the test behind a timeout is deleted', () => {
  it('tests the mutant again and finds no test reaches it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-timeouts-'));
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      writeFileSync(join(dir, 'src/count.mjs'), 'export function count(n) {\n  let i = 0;\n  while (i < n) i++;\n  return i;\n}\n');
      writeFileSync(join(dir, 'src/sum.mjs'), 'export function sum(a, b) { return a + b; }\n');
      const head = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n";
      writeFileSync(join(dir, 'src/count.test.mjs'), `${head}import { count } from './count.mjs';\ntest('count', () => { assert.equal(count(3), 3); });\n`);
      writeFileSync(join(dir, 'src/sum.test.mjs'), `${head}import { sum } from './sum.mjs';\ntest('sum', () => { assert.equal(sum(2, 3), 5); });\n`);
      writeFileSync(join(dir, 'stryker.config.mjs'), `export default ${JSON.stringify({
        testRunner: 'tap', plugins: ['@stryker-mutator/tap-runner'],
        tap: { testFiles: ['src/*.test.mjs'], nodeArgs: ['--test-reporter=tap'], forceBail: true },
        coverageAnalysis: 'perTest', mutate: ['src/count.mjs', 'src/sum.mjs'], concurrency: 2,
        timeoutMS: 400, timeoutFactor: 1,
        reporters: ['json'], jsonReporter: { fileName: 'reports/m.json' },
        incremental: true, incrementalFile: 'reports/inc.json', tempDirName: '.stryker-tmp', thresholds: { break: null },
      })};\n`);
      const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
      const run = () => {
        execFileSync(process.execPath, [join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js'), 'run', 'stryker.config.mjs'], { cwd: dir, encoding: 'utf8', env });
        return JSON.parse(readFileSync(join(dir, 'reports/m.json'), 'utf8')).files['src/count.mjs'].mutants.map((m) => m.status);
      };
      const first = run();
      const timeouts = first.filter((s) => s === 'Timeout').length;
      assert.ok(timeouts >= 1, `a loop mutant times out: ${first}`);

      rmSync(join(dir, 'src/count.test.mjs'));
      const incremental = join(dir, 'reports/inc.json');
      const report = JSON.parse(readFileSync(incremental, 'utf8'));
      const dropped = dropStaleTimeouts(report, (path) => {
        try { return readFileSync(join(dir, path), 'utf8'); } catch { return null; }
      });
      assert.equal(dropped, timeouts);
      writeFileSync(incremental, JSON.stringify(report));
      const second = run();
      assert.equal(second.length, first.length);
      assert.ok(second.every((s) => s === 'NoCoverage'), `no test reaches the loop any more: ${second}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
