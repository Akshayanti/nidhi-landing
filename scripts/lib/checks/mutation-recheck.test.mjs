// The recheck of reused kills (#854): the rule on reports of the shape
// Stryker writes, the scripts the workflow runs, and real Stryker runs where
// a test file added before an unchanged killer cannot run under the mutant.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GUARD_NOTE, partScores, stoppedByGuard } from './mutation-floors.mjs';
import { beforePath, newOrChangedTestFiles, takeOutKillsToRecheck, testFilesBefore } from './mutation-recheck.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

// An incremental file as Stryker writes it: `tests` is each test file's
// source by path (Stryker numbers them in this order, one test a file, as
// the tap runner reports), `mutants` go under one code file.
const reportOf = (tests, mutants) => ({
  files: { 'src/code.ts': { language: 'typescript', source: 'code', mutants } },
  testFiles: Object.fromEntries(Object.entries(tests).map(([path, source], i) => [path, { source, tests: [{ id: String(i), name: path }] }])),
});
const killed = (coveredBy, killedBy) => ({ id: 'm', status: 'Killed', coveredBy, killedBy });
const statuses = (report) => report.files['src/code.ts'].mutants.map((m) => m.status);
// What the workflow does with the note: written to a file, read back.
const roundTrip = (before) => JSON.parse(JSON.stringify(before));

describe('the note of the test files before the run', () => {
  it('holds each restored test file with a hash of its source, and nothing of the mutants', () => {
    const before = testFilesBefore(reportOf({ 'src/a.test.ts': 'a', 'src/z.test.ts': 'z' }, [killed(['1'], ['1'])]));
    assert.deepEqual(Object.keys(before), ['reused', 'testFiles']);
    assert.equal(before.reused, true);
    assert.deepEqual(Object.keys(before.testFiles), ['src/a.test.ts', 'src/z.test.ts']);
    for (const hash of Object.values(before.testFiles)) assert.match(hash, /^[0-9a-f]{64}$/);
    assert.notEqual(before.testFiles['src/a.test.ts'], before.testFiles['src/z.test.ts']);
  });

  it('says so when nothing is reused', () => {
    assert.deepEqual(testFilesBefore(null), { reused: false });
    assert.deepEqual(testFilesBefore({ files: {} }), { reused: true, testFiles: {} });
  });

  it('comes back from its file as it went in', () => {
    for (const before of [testFilesBefore(null), testFilesBefore(reportOf({ 'src/a.test.ts': 'a' }, [])), testFilesBefore({ testFiles: { 'src/a.test.ts': { tests: [] } } })]) {
      assert.deepEqual(roundTrip(before), before);
    }
    assert.deepEqual(testFilesBefore({ testFiles: { 'src/a.test.ts': { tests: [] } } }), { reused: true, testFiles: { 'src/a.test.ts': null } });
  });

  it('is kept beside the results, under a name of its own', () => {
    assert.equal(beforePath('reports/stryker-incremental/loan-2of3.json'), 'reports/stryker-incremental/loan-2of3.before.json');
  });
});

describe('the kills taken out to be tested again', () => {
  const OLD = { 'src/z.test.ts': 'z' };
  const before = roundTrip(testFilesBefore(reportOf(OLD, [])));

  it('are none while every test file is as it was', () => {
    const report = reportOf(OLD, [killed(['0'], ['0']), killed([], []), killed(undefined, ['0'])]);
    assert.deepEqual([...newOrChangedTestFiles(before, report)], []);
    assert.equal(takeOutKillsToRecheck(report, before), 0);
    assert.equal(report.files['src/code.ts'].mutants.length, 3);
  });

  it('include a kill that a new test file covers', () => {
    const report = reportOf({ 'src/a.test.ts': 'a', ...OLD }, [killed(['0', '1'], ['1'])]);
    assert.deepEqual([...newOrChangedTestFiles(before, report)], ['src/a.test.ts']);
    assert.equal(takeOutKillsToRecheck(report, before), 1);
    assert.deepEqual(report.files['src/code.ts'].mutants, []);
    assert.deepEqual(Object.keys(report.testFiles), ['src/a.test.ts', 'src/z.test.ts'], 'the test files are left as they were');
  });

  it('include a kill that an edited test file covers, whichever file killed it', () => {
    const was = roundTrip(testFilesBefore(reportOf({ 'src/a.test.ts': 'a', ...OLD }, [])));
    const report = reportOf({ 'src/a.test.ts': 'a, edited', ...OLD }, [killed(['0', '1'], ['1']), killed(['0', '1'], ['0']), killed(['1'], ['1'])]);
    assert.deepEqual([...newOrChangedTestFiles(was, report)], ['src/a.test.ts']);
    assert.equal(takeOutKillsToRecheck(report, was), 2);
    assert.deepEqual(report.files['src/code.ts'].mutants, [killed(['1'], ['1'])], 'the kill only the unchanged file covers is untouched');
  });

  it('leave a kill that the new test file does not cover', () => {
    const report = reportOf({ 'src/a.test.ts': 'a', ...OLD }, [killed(['1'], ['1'])]);
    assert.equal(takeOutKillsToRecheck(report, before), 0);
    assert.deepEqual(statuses(report), ['Killed']);
  });

  it('are none when a test file is only deleted', () => {
    const was = roundTrip(testFilesBefore(reportOf({ 'src/a.test.ts': 'a', ...OLD }, [])));
    const report = reportOf(OLD, [killed(['0'], ['0']), killed([], [])]);
    assert.deepEqual([...newOrChangedTestFiles(was, report)], []);
    assert.equal(takeOutKillsToRecheck(report, was), 0);
  });

  it('are only ever kills: a survivor, a mutant no test reaches and an ignored one stay', () => {
    const report = reportOf({ 'src/a.test.ts': 'a', ...OLD }, ['Survived', 'NoCoverage', 'Ignored', 'Killed'].map((status) => ({ id: status, status, coveredBy: ['0', '1'] })));
    assert.equal(takeOutKillsToRecheck(report, before), 1);
    assert.deepEqual(statuses(report), ['Survived', 'NoCoverage', 'Ignored']);
  });

  it('include a kill whose covering tests cannot be traced, once any test file is new or edited', () => {
    const untraced = () => [killed([], ['1']), killed(undefined, ['1']), killed(['1', '7'], ['1']), killed(['1'], ['1'])];
    const changed = reportOf({ 'src/a.test.ts': 'a', ...OLD }, untraced());
    assert.equal(takeOutKillsToRecheck(changed, before), 3);
    assert.deepEqual(changed.files['src/code.ts'].mutants, [killed(['1'], ['1'])]);
    const same = { ...reportOf(OLD, untraced()) };
    assert.equal(takeOutKillsToRecheck(same, before), 0, 'and not otherwise');
  });

  it('count a test file with no source on record, before or now, as edited', () => {
    const noSource = { files: { 'src/code.ts': { mutants: [killed(['0'], ['0'])] } }, testFiles: { 'src/z.test.ts': { tests: [{ id: '0' }] } } };
    assert.equal(takeOutKillsToRecheck(structuredClone(noSource), before), 1);
    assert.equal(takeOutKillsToRecheck(reportOf(OLD, [killed(['0'], ['0'])]), roundTrip(testFilesBefore(noSource))), 1);
    assert.equal(takeOutKillsToRecheck(structuredClone(noSource), roundTrip(testFilesBefore(noSource))), 1);
  });

  it('are none when nothing was reused, whatever the tests', () => {
    const report = reportOf({ 'src/a.test.ts': 'a', ...OLD }, [killed(['0', '1'], ['1']), killed([], [])]);
    assert.equal(takeOutKillsToRecheck(report, roundTrip(testFilesBefore(null))), 0);
    assert.equal(report.files['src/code.ts'].mutants.length, 2);
  });

  it('count over every file, and read a report with no files or no test files', () => {
    const report = { ...reportOf({ 'src/a.test.ts': 'a', ...OLD }, [killed(['0'], ['0'])]) };
    report.files['src/other.ts'] = { mutants: [killed(['0', '1'], ['1']), killed(['1'], ['1'])] };
    assert.equal(takeOutKillsToRecheck(report, before), 2);
    assert.deepEqual(Object.values(report.files).map((f) => f.mutants.length), [0, 1]);
    assert.equal(takeOutKillsToRecheck({}, before), 0);
    assert.equal(takeOutKillsToRecheck({ files: { 'src/code.ts': { mutants: [killed([], [])] } } }, before), 0);
  });

  it('refuse a note they cannot read, rather than take it for "nothing to do"', () => {
    for (const bad of [undefined, null, {}, { reused: 'false' }, { reused: true }, { reused: true, testFiles: null }, { testFiles: {} }]) {
      assert.throws(() => takeOutKillsToRecheck(reportOf(OLD, []), bad), /not one mutation-stale-results\.mjs wrote/);
    }
  });

  it('do not take a file named like something every object has for one on record', () => {
    const report = reportOf({ constructor: 'a', ...OLD }, [killed(['0', '1'], ['1'])]);
    assert.deepEqual([...newOrChangedTestFiles(before, report)], ['constructor']);
  });
});

// A run cancelled while Stryker tests mutants: Stryker writes what it had
// finished, the reused kill included, with today's test sources. The
// workflow's recheck step still runs, and only then are the results saved.
describe('a run cancelled after the first pass wrote its results', () => {
  const OLD = { 'src/z.test.ts': 'z' };
  const NOW = { 'src/a.test.ts': 'a', ...OLD };
  // As pass 1 leaves it: the stale kill, covered by the new file too.
  const afterPassOne = () => reportOf(NOW, [killed(['0', '1'], ['1']), { id: 's', status: 'Survived', coveredBy: ['1'] }]);
  const before = roundTrip(testFilesBefore(reportOf(OLD, [])));

  it('saves no kill left to recheck, so the next run has none to reuse', () => {
    const saved = afterPassOne();
    assert.equal(takeOutKillsToRecheck(saved, before), 1);
    // The next run restores what was saved and makes its own note from it.
    const restored = roundTrip(saved);
    const nextBefore = roundTrip(testFilesBefore(restored));
    assert.deepEqual(statuses(restored), ['Survived'], 'the kill is not there to be reused');
    // Its own recheck finds no test file edited, and that is right now.
    assert.deepEqual([...newOrChangedTestFiles(nextBefore, restored)], []);
    assert.equal(takeOutKillsToRecheck(restored, nextBefore), 0);
  });

  it('would lose the recheck for good if the results were saved as the first pass left them', () => {
    // Why the save waits for the recheck: saved as they are, the results
    // carry today's test sources, and the next run sees nothing to recheck.
    const restored = roundTrip(afterPassOne());
    assert.equal(takeOutKillsToRecheck(restored, roundTrip(testFilesBefore(restored))), 0);
    assert.deepEqual(statuses(restored), ['Killed', 'Survived']);
  });

  it('keeps the old test sources when it stops before Stryker has written anything', () => {
    // During the first test run the results on disk are the restored ones.
    const onDisk = reportOf(OLD, [killed(['0'], ['0'])]);
    assert.equal(takeOutKillsToRecheck(onDisk, before), 0);
    // Saved as they came: the next run still sees the new test file as new.
    const nextBefore = roundTrip(testFilesBefore(roundTrip(onDisk)));
    assert.deepEqual([...newOrChangedTestFiles(nextBefore, afterPassOne())], ['src/a.test.ts']);
    assert.equal(takeOutKillsToRecheck(afterPassOne(), nextBefore), 1);
  });
});

// The two scripts the workflow runs, on files in a temp folder: the note is
// written before Stryker, and the recheck sets its outputs last or not at all.
describe('the scripts around a Stryker run', () => {
  const NAME = 'reports/stryker-incremental/net-worth.json';
  const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...clean } = process.env;
  const inFolder = (use) => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-recheck-scripts-'));
    try {
      mkdirSync(join(dir, 'reports/stryker-incremental'), { recursive: true });
      const script = (name, env = {}) => {
        writeFileSync(join(dir, 'outputs'), '');
        const done = spawnSync(process.execPath, [join(ROOT, 'scripts', name)], {
          cwd: dir, encoding: 'utf8', env: { ...clean, STRYKER_SCOPE: 'net-worth', STRYKER_SHARD: '1/1', GITHUB_OUTPUT: join(dir, 'outputs'), ...env },
        });
        return { status: done.status, out: done.stdout + done.stderr, outputs: readFileSync(join(dir, 'outputs'), 'utf8') };
      };
      const file = (path) => (existsSync(join(dir, path)) ? JSON.parse(readFileSync(join(dir, path), 'utf8')) : null);
      use({ dir, script, file });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const OLD = { 'src/z.test.ts': 'z' };
  const NOW = { 'src/a.test.ts': 'a', ...OLD };

  it('has one shard for the scope these tests name', () => {
    assert.equal(JSON.parse(readFileSync(join(ROOT, 'stryker.shards.json'), 'utf8'))['net-worth'], 1, 'if net worth is cut into shards, name a scope of one shard in these tests');
  });

  it('note the restored test files, take out the kill a new test file covers, and say how many', () => {
    inFolder(({ dir, script, file }) => {
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(OLD, [killed(['0'], ['0']), { id: 't', status: 'Timeout', coveredBy: ['0'] }])));
      const noted = script('mutation-stale-results.mjs');
      assert.equal(noted.status, 0, noted.out);
      assert.deepEqual(file(beforePath(NAME)), testFilesBefore(reportOf(OLD, [])));
      assert.deepEqual(statuses(file(NAME)), ['Killed'], 'the timeout is taken out as before');
      // Pass 1 would run here; what it writes has the new test file in it.
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(NOW, [killed(['0', '1'], ['1']), killed(['1'], ['1'])])));
      const checked = script('mutation-recheck.mjs');
      assert.equal(checked.status, 0, checked.out);
      assert.equal(checked.outputs, 'checked=true\nselected=1\n');
      assert.match(checked.out, /1 kill\(s\) covered by a new or edited test file taken out/);
      assert.deepEqual(file(NAME).files['src/code.ts'].mutants, [killed(['1'], ['1'])]);
      assert.equal(existsSync(join(dir, `${NAME}.tmp`)), false);
      // A second go, as after pass 2 would be: nothing more to take out.
      assert.equal(script('mutation-recheck.mjs').outputs, 'checked=true\nselected=0\n');
    });
  });

  it('take nothing out on a forced run, and when nothing was restored', () => {
    inFolder(({ dir, script, file }) => {
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(OLD, [killed(['0'], ['0'])])));
      assert.equal(script('mutation-stale-results.mjs', { STRYKER_FORCE: '1' }).status, 0);
      assert.deepEqual(file(beforePath(NAME)), { reused: false });
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(NOW, [killed(['0', '1'], ['1'])])));
      assert.equal(script('mutation-recheck.mjs', { STRYKER_FORCE: '1' }).outputs, 'checked=true\nselected=0\n');
      assert.deepEqual(statuses(file(NAME)), ['Killed']);
    });
    inFolder(({ dir, script, file }) => {
      rmSync(join(dir, 'reports'), { recursive: true });
      assert.equal(script('mutation-stale-results.mjs').status, 0);
      assert.deepEqual(file(beforePath(NAME)), { reused: false });
      // Cancelled before Stryker wrote anything: no results, nothing to keep.
      assert.equal(script('mutation-recheck.mjs').outputs, 'checked=true\nselected=0\n');
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(NOW, [killed(['0', '1'], ['1'])])));
      assert.equal(script('mutation-recheck.mjs').outputs, 'checked=true\nselected=0\n');
    });
    inFolder(({ dir, script, file }) => {
      writeFileSync(join(dir, NAME), '{"files":');
      assert.equal(script('mutation-stale-results.mjs').status, 0);
      assert.equal(existsSync(join(dir, NAME)), false, 'results nobody can read are removed as before');
      assert.deepEqual(file(beforePath(NAME)), { reused: false });
    });
  });

  it('fail, and set no output, without the note or with results cut short', () => {
    inFolder(({ dir, script }) => {
      writeFileSync(join(dir, NAME), JSON.stringify(reportOf(NOW, [killed(['0', '1'], ['1'])])));
      const noNote = script('mutation-recheck.mjs');
      assert.equal(noNote.status, 1);
      assert.equal(noNote.outputs, '');
      assert.match(noNote.out, /Nothing is vouched for, so nothing is saved\./);
      writeFileSync(join(dir, beforePath(NAME)), '{"reused":tr');
      assert.deepEqual([script('mutation-recheck.mjs').status, script('mutation-recheck.mjs').outputs], [1, '']);
      writeFileSync(join(dir, beforePath(NAME)), '{}');
      assert.deepEqual([script('mutation-recheck.mjs').status, script('mutation-recheck.mjs').outputs], [1, '']);
      // A sound note, and results Stryker was stopped in the middle of writing.
      writeFileSync(join(dir, beforePath(NAME)), JSON.stringify(testFilesBefore(reportOf(OLD, []))));
      writeFileSync(join(dir, NAME), '{"files":{"src/code.ts":{"mutants":[');
      assert.deepEqual([script('mutation-recheck.mjs').status, script('mutation-recheck.mjs').outputs], [1, '']);
      rmSync(join(dir, NAME));
      rmSync(join(dir, beforePath(NAME)));
      assert.deepEqual([script('mutation-recheck.mjs').status, script('mutation-recheck.mjs').outputs], [1, ''], 'no note and no results: still not vouched for');
    });
  });
});

// The real thing, small. `five` has one mutant, killed by z.test.mjs. Then
// a.test.mjs is added: it runs first, passes on the code as written, and
// under that mutant ends its own process before its tests run, saying what
// the memory guard says (test/mutationMemoryGuard.mjs), as a test that
// allocates without end under the mutant would be ended.
//
// The order is the point: a.test.mjs runs before z.test.mjs because the
// configuration lists it first, and the runner is the one the project's own
// runs use, which keeps the configured order (stryker-ordered-tap.mjs). Each
// run is still checked for the order it took.
describe('real Stryker runs, after a test file is added before the unchanged killer', { timeout: 120_000 }, () => {
  const head = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n";
  const project = () => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-recheck-'));
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    writeFileSync(join(dir, 'src/five.mjs'), 'export const five = () => 5;\n');
    writeFileSync(join(dir, 'src/sum.mjs'), 'export function sum(a, b) { return a + b; }\n');
    writeFileSync(join(dir, 'src/z.test.mjs'), `${head}import { five } from './five.mjs';\nimport { sum } from './sum.mjs';\ntest('z', () => { assert.equal(five(), 5); assert.equal(sum(2, 3), 5); });\n`);
    // The test files, in the order they are to run. The ordered runner
    // wants every listed file to be there, so the list is given again when
    // a.test.mjs is added.
    const configure = (testFiles) => writeFileSync(join(dir, 'stryker.config.mjs'), `export default ${JSON.stringify({
      testRunner: 'tap-ordered', appendPlugins: [join(import.meta.dirname, 'stryker-ordered-tap.mjs')],
      tap: { testFiles, nodeArgs: ['--test-reporter=tap'], forceBail: true },
      coverageAnalysis: 'perTest', mutate: ['src/five.mjs', 'src/sum.mjs'], concurrency: 1,
      reporters: ['json'], jsonReporter: { fileName: 'reports/m.json' },
      incremental: true, incrementalFile: 'reports/inc.json', tempDirName: '.stryker-tmp', thresholds: { break: null },
    })};\n`);
    configure(['src/z.test.mjs']);
    const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
    const incremental = join(dir, 'reports/inc.json');
    return {
      dir,
      incremental,
      // A test file added, to run before the one already there.
      addFirst: (source) => {
        writeFileSync(join(dir, 'src/a.test.mjs'), source);
        configure(['src/a.test.mjs', 'src/z.test.mjs']);
      },
      // One Stryker run: what it says, and its report with each file's mutants.
      run: () => {
        const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js'), 'run', 'stryker.config.mjs'], { cwd: dir, encoding: 'utf8', env });
        const report = JSON.parse(readFileSync(join(dir, 'reports/m.json'), 'utf8'));
        return { out, report, five: report.files['src/five.mjs'].mutants, sum: report.files['src/sum.mjs'].mutants };
      },
      // The step before Stryker: the note, from the results as restored.
      note: () => roundTrip(testFilesBefore(JSON.parse(readFileSync(incremental, 'utf8')))),
      // The step after Stryker: the kills to recheck taken out, in the file.
      recheck: (before) => {
        const report = JSON.parse(readFileSync(incremental, 'utf8'));
        const taken = takeOutKillsToRecheck(report, before);
        writeFileSync(incremental, JSON.stringify(report));
        return taken;
      },
    };
  };
  const reused = (out) => Number(/(\d+) of \d+ mutant result\(s\) are reused/.exec(out)?.[1]);
  // Stryker numbers the tests in the order their files ran.
  const ranFirst = ({ report }) => Object.entries(report.testFiles).find(([, file]) => file.tests[0].id === '0')[0];

  it('without the recheck the kill is reused; with it the second pass finds the error a fresh run finds', () => {
    const { dir, incremental, run, note, recheck, addFirst } = project();
    try {
      const first = run();
      assert.deepEqual(first.five.map((m) => m.status), ['Killed'], 'five has one mutant, killed by z.test.mjs');
      assert.ok(first.sum.length >= 2 && first.sum.every((m) => m.status === 'Killed'));
      const saved = readFileSync(incremental, 'utf8');

      const before = note();
      assert.deepEqual(Object.keys(before.testFiles), ['src/z.test.mjs']);
      addFirst(`${head}import { writeSync } from 'node:fs';\nimport { five } from './five.mjs';\n`
        + `if (five() !== 5) { writeSync(2, ${JSON.stringify(`${GUARD_NOTE}\n`)}); process.kill(process.pid, 'SIGKILL'); }\ntest('a', () => { assert.ok(true); });\n`);

      // Pass 1: Stryker alone hands the kill on, though a.test.mjs covers it.
      const passOne = run();
      assert.equal(reused(passOne.out), 1 + first.sum.length, passOne.out);
      assert.equal(ranFirst(passOne), 'src/a.test.mjs');
      assert.deepEqual(passOne.five.map((m) => m.status), ['Killed']);
      assert.equal(passOne.five[0].coveredBy.length, 2, 'this run’s coverage: both test files');
      assert.equal(partScores({ files: { 'src/utils/five.ts': { mutants: passOne.five } } }).logic, 100);

      // The recheck takes out that kill and no other, and pass 2 tests it.
      assert.equal(recheck(before), 1);
      const left = JSON.parse(readFileSync(incremental, 'utf8'));
      assert.deepEqual(left.files['src/five.mjs'].mutants, []);
      assert.equal(left.files['src/sum.mjs'].mutants.length, first.sum.length);
      const passTwo = run();
      assert.equal(reused(passTwo.out), first.sum.length, 'everything else is reused');
      assert.equal(ranFirst(passTwo), 'src/a.test.mjs');
      assert.deepEqual(passTwo.five.map((m) => m.status), ['RuntimeError']);
      assert.match(passTwo.five[0].statusReason, /Error running file "src\/a\.test\.mjs"/);
      assert.ok(stoppedByGuard(passTwo.five[0]), 'ended as the memory guard ends a process: not caught');
      assert.equal(partScores({ files: { 'src/utils/five.ts': { mutants: passTwo.five } } }).logic, 0, 'the score the reused kill hid');
      assert.ok(passTwo.sum.every((m) => m.status === 'Killed'));

      // And that is what a run with no earlier results says.
      rmSync(incremental);
      const fresh = run();
      assert.equal(ranFirst(fresh), 'src/a.test.mjs');
      assert.deepEqual(fresh.five.map((m) => m.status), ['RuntimeError']);
      assert.ok(stoppedByGuard(fresh.five[0]));

      // The earlier results again, and the run cancelled after pass 1 wrote
      // them: the recheck runs before the save, so the next run (its own
      // note, nothing edited since) has no kill to reuse and tests the mutant.
      writeFileSync(incremental, saved);
      const beforeAgain = note();
      assert.deepEqual(run().five.map((m) => m.status), ['Killed']);
      assert.equal(recheck(beforeAgain), 1);
      const next = note();
      const retry = run();
      assert.equal(ranFirst(retry), 'src/a.test.mjs');
      assert.deepEqual(retry.five.map((m) => m.status), ['RuntimeError']);
      assert.equal(recheck(next), 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an added test file that covers no kill takes nothing out, and there is no second pass', () => {
    const { dir, run, note, recheck, addFirst } = project();
    try {
      const first = run();
      const before = note();
      addFirst(`${head}test('a', () => { assert.equal(1 + 1, 2); });\n`);
      const passOne = run();
      assert.equal(reused(passOne.out), first.five.length + first.sum.length, passOne.out);
      assert.equal(Object.keys(JSON.parse(readFileSync(join(dir, 'reports/inc.json'), 'utf8')).testFiles).length, 2, 'the new file is on record');
      assert.equal(recheck(before), 0);
      assert.ok([...passOne.five, ...passOne.sum].every((m) => m.status === 'Killed'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
