// The memory guard of a mutation test process (#790, test/mutationMemoryGuard.mjs):
// it ends a process that allocates without end, leaves an ordinary one
// alone, and is what stryker.config.mjs gives every test process.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { LIMIT } from '../../../test/mutationMemoryGuard.mjs';
import { GUARD_NOTE, guardStopped, partScores, stoppedByGuard } from './mutation-floors.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const run = (code) => {
  const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
  const started = Date.now();
  const done = spawnSync(process.execPath, ['--import', './test/mutationMemoryGuard.mjs', '-e', code], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
  return { status: done.status, signal: done.signal, ms: Date.now() - started, out: done.stdout, err: done.stderr };
};

describe('the memory guard of a mutation test process', () => {
  it('allows a gigabyte', () => {
    assert.equal(LIMIT, 1024 ** 3);
  });

  it('ends a process that fills memory while holding the main thread', () => {
    // As a runaway mutant does: a loop that never yields, keeping all it makes.
    const done = run('const kept = []; for (;;) kept.push(new Array(100000).fill(kept.length));');
    assert.equal(done.signal, 'SIGKILL');
    assert.equal(done.status, null);
    assert.ok(done.ms < 30_000, `ended after ${done.ms} ms`);
    assert.ok(done.err.includes(GUARD_NOTE), 'it says why on the error output');
  });

  it('is counted as a mutant not caught, never left out of the score', () => {
    const ended = { status: 'RuntimeError', statusReason: `Error running file "x". Stderr output:\n${GUARD_NOTE}\n`, location: { start: { line: 88, column: 28 } } };
    const crashed = { status: 'RuntimeError', statusReason: 'Error running file "x". Stderr output:\nRangeError' };
    assert.equal(stoppedByGuard(ended), true);
    assert.equal(stoppedByGuard(crashed), false);
    assert.equal(stoppedByGuard({ status: 'Killed', statusReason: GUARD_NOTE }), false);
    assert.equal(stoppedByGuard({ status: 'RuntimeError' }), false);
    const report = { files: { 'src/components/X.tsx': { mutants: [{ status: 'Killed' }, { status: 'Killed' }, { status: 'Killed' }, ended, crashed] } } };
    // The other crash counts as caught (#860); the guard's does not.
    assert.deepEqual(partScores(report).counts.component, { detected: 4, undetected: 1 });
    assert.equal(partScores(report).component, 80);
    assert.deepEqual(guardStopped(report), ['src/components/X.tsx:88:28']);
  });

  it('leaves an ordinary process to finish, and does not keep it alive', () => {
    const done = run('const list = new Array(1000000).fill(1); console.log(list.length);');
    assert.equal(done.status, 0);
    assert.equal(done.err, '');
    assert.equal(done.signal, null);
    assert.equal(done.out.trim(), '1000000');
    assert.ok(done.ms < 10_000, `finished after ${done.ms} ms`);
  });

  it('is loaded first by every test process Stryker starts, and by nothing else', async () => {
    process.env.STRYKER_SCOPE ??= 'inflation';
    const { default: config } = await import('../../../stryker.config.mjs');
    assert.deepEqual(config.tap.nodeArgs.slice(0, 2), ['--import', './test/mutationMemoryGuard.mjs']);
    // Nothing else names it as a module to load: `npm test` and the site never
    // run under the guard.
    const loaders = spawnSync('git', ['grep', '-l', '-F', "mutationMemoryGuard.mjs'", '--', '.'], { cwd: ROOT, encoding: 'utf8' });
    assert.deepEqual(loaders.stdout.trim().split('\n').filter(Boolean).sort(), ['scripts/lib/checks/mutation-memory-guard.test.mjs', 'stryker.config.mjs']);
  });
});
