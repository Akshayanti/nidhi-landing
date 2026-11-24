// Earlier timeouts and errors are never handed on (#855): the rule on a
// report of the shape Stryker writes, and a real Stryker run where the test
// behind a timeout is deleted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { partScores } from './mutation-floors.mjs';
import { SAFE_TO_HAND_ON, dropUnsafeResults } from './mutation-stale-results.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

const reportOf = (mutants) => ({ files: { 'src/code.ts': { language: 'typescript', source: 'code', mutants } } });

describe('earlier timeouts and errors', () => {
  it('are taken out whatever their tests, and the four safe kinds are left alone', () => {
    assert.deepEqual([...SAFE_TO_HAND_ON].sort(), ['Ignored', 'Killed', 'NoCoverage', 'Survived']);
    const report = reportOf(['Timeout', 'RuntimeError', 'CompileError', 'Pending', 'SomethingNew', 'Killed', 'Survived', 'NoCoverage', 'Ignored']
      .map((status) => ({ id: status, status, coveredBy: ['0'], killedBy: status === 'Killed' ? ['0'] : undefined })));
    assert.equal(dropUnsafeResults(report), 5);
    assert.deepEqual(report.files['src/code.ts'].mutants.map((m) => m.status), ['Killed', 'Survived', 'NoCoverage', 'Ignored']);
    assert.deepEqual(report.files['src/code.ts'].mutants[0], { id: 'Killed', status: 'Killed', coveredBy: ['0'], killedBy: ['0'] }, 'a kept result is untouched');
  });

  it('are taken out with or without a covering test on record', () => {
    const report = reportOf([{ id: 'a', status: 'Timeout' }, { id: 'b', status: 'Timeout', static: true, coveredBy: [] }, { id: 'c', status: 'Timeout', coveredBy: ['3'] }]);
    assert.equal(dropUnsafeResults(report), 3);
    assert.deepEqual(report.files['src/code.ts'].mutants, []);
  });

  it('count over every file, and a file with nothing to take out is left as it was', () => {
    const report = { files: {
      'src/a.ts': { mutants: [{ status: 'Timeout' }, { status: 'Killed' }] },
      'src/b.ts': { mutants: [{ status: 'Survived' }] },
      'src/c.ts': { mutants: [{ status: 'RuntimeError' }] },
    } };
    assert.equal(dropUnsafeResults(report), 2);
    assert.deepEqual(Object.values(report.files).map((f) => f.mutants.length), [1, 1, 0]);
    assert.equal(dropUnsafeResults({ files: {} }), 0);
    assert.equal(dropUnsafeResults({}), 0);
  });

  it('matter to the score: an error handed on wrongly hides a mutant no test reaches', () => {
    // One mutant killed, one whose only test was deleted: the floors' own sum.
    const stale = { files: { 'src/utils/loan/math.ts': { mutants: [{ status: 'Killed' }, { status: 'RuntimeError' }] } } };
    const fresh = { files: { 'src/utils/loan/math.ts': { mutants: [{ status: 'Killed' }, { status: 'NoCoverage' }] } } };
    assert.equal(partScores(stale).logic, 100);
    assert.equal(partScores(fresh).logic, 50);
    const timedOut = { files: { 'src/utils/loan/math.ts': { mutants: [{ status: 'Killed' }, { status: 'Timeout' }] } } };
    assert.equal(partScores(timedOut).logic, 100);
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
      const dropped = dropUnsafeResults(report);
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
