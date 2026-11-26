// The test files that depend on everything, by name (#904).
//
// A test with a read the dependency analysis cannot work out is tied to
// every tracked file a mutation run can read (mutation-deps.mjs): any change
// marks it, and Stryker tests again every mutant it killed or covers. That
// is the safe answer, and it costs exactly what such a test covers. Until
// #904 ten of them covered a ninth of all mutants between them, so every
// pull request, a one-line lesson edit included, paid that.
//
// Now the assertions that run a tool's code are in files whose reads are
// all known, and the ones that read the source as text are in files that
// run no mutated code. This test holds both halves of that:
//
// - the list of test files that depend on everything is written here, so a
//   new one is a visible change with its reason;
// - none of them reaches a file a mutation run mutates, by an import or a
//   read the analysis follows, but for the ones named with why.
//
// It reads the cache's own graph and only ever fails a build. What such a
// test really covers is printed by the floors job from each run's reports
// (scripts/mutation-wide-coverage.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { createGraph } from './mutation-deps.mjs';
import { isSelectedTest, trackedPaths } from './mutation-fingerprint.mjs';
import { READ_THE_SOURCE, STILL_COSTLY, coveredBy } from './mutation-wide-tests.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
process.env.STRYKER_SCOPE ??= 'inflation';
const { SCOPES } = await import('../../../stryker.config.mjs');
const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).filter((p) => existsSync(join(ROOT, p)));
const graph = createGraph({ root: ROOT, tracked });
const mutated = new Set(Object.values(SCOPES).flatMap((patterns) => globSync(patterns, { cwd: ROOT })).filter((f) => !/\.test\.tsx?$/.test(f)));
const wide = tracked.filter(isSelectedTest).filter((test) => graph.dependencies(test).all.length > 0);

describe('the test files that depend on everything', () => {
  it('are the ones named here', () => {
    assert.deepEqual([...wide].sort(), [...READ_THE_SOURCE, ...Object.keys(STILL_COSTLY)].sort());
  });

  it('run no mutated code, but for the ones named with why', () => {
    assert.ok(mutated.size > 60, `only ${mutated.size} mutated files found`);
    const reaching = wide.filter((test) => graph.dependencies(test).files.some((file) => mutated.has(file)));
    assert.deepEqual(reaching.sort(), Object.keys(STILL_COSTLY).sort());
    for (const reason of Object.values(STILL_COSTLY)) assert.ok(reason.length > 40);
  });

  it('no longer include the assertions that run a tool\'s code: those files\' reads are all known', () => {
    for (const test of [
      'src/utils/shared/toolPrivacy.keys.test.ts', 'src/utils/shared/cleanElements.test.ts', 'src/i18n/strings/catalog.test.ts', 'src/utils/shared/jsonForScript.test.ts',
      'src/utils/inflation/history.test.ts', 'src/utils/shared/formReply.test.ts', 'src/utils/shared/tokenGuard.test.ts', 'src/utils/shared/settle.test.ts',
    ]) {
      assert.ok(tracked.includes(test), test);
      assert.deepEqual(graph.dependencies(test).all, [], test);
    }
  });

  it('are counted from a run\'s reports: each mutant once, whichever of them covers or killed it', () => {
    const report = (tests, mutants) => ({ testFiles: Object.fromEntries(tests.map((path, i) => [path, { tests: [{ id: String(i) }] }])), files: { 'src/a.ts': { mutants } } });
    const reports = [
      report(['src/a.test.ts', 'src/wide.test.ts'], [{ id: '1', status: 'Killed', coveredBy: ['0', '1'], killedBy: ['0'] }, { id: '2', status: 'Survived', coveredBy: ['0'] }, { id: '3', status: 'Ignored', coveredBy: ['1'] }]),
      // Another shard numbers its tests afresh.
      report(['src/wide.test.ts', 'src/other.test.ts'], [{ id: '1', status: 'Killed', coveredBy: ['1'], killedBy: ['0'] }, { id: '2', status: 'NoCoverage' }]),
    ];
    assert.deepEqual(coveredBy(reports, ['src/wide.test.ts', 'src/not-run.test.ts']), { total: 4, covered: 2, byTest: { 'src/wide.test.ts': 2, 'src/not-run.test.ts': 0 } });
    assert.deepEqual(coveredBy([], ['src/wide.test.ts']), { total: 0, covered: 0, byTest: { 'src/wide.test.ts': 0 } });
  });

  it('change their fingerprint with a file they read, the narrow ones too', () => {
    const edited = (path) => createGraph({ root: ROOT, tracked, read: (p) => `${execFileSync('cat', [join(ROOT, p)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })}${p === path ? '\n// edited\n' : ''}` });
    const cases = {
      'src/utils/shared/toolPrivacy.keys.test.ts': 'src/utils/loan/url.ts',
      'src/utils/shared/settle.test.ts': 'src/components/MonteCarloSimulator.tsx',
      'src/utils/shared/tokenGuard.test.ts': 'src/pages/unsubscribe.astro',
      'src/utils/shared/formReply.test.ts': 'src/components/WaitlistSection.astro',
      'src/utils/inflation/history.test.ts': 'src/pages/data/inflation-history.json.ts',
    };
    for (const [test, file] of Object.entries(cases)) {
      assert.ok(tracked.includes(file), file);
      assert.notEqual(edited(file).fingerprintOf(test).fingerprint, graph.fingerprintOf(test).fingerprint, `${test} reads ${file}`);
      // And not with a lesson, which it does not read.
      assert.equal(edited('src/content/blog/1. discovery/11-purchasing-power.md').fingerprintOf(test).fingerprint, graph.fingerprintOf(test).fingerprint, test);
    }
  });
});
