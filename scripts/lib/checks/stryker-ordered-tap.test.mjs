// The test runner of a mutation run keeps the configured order of the test
// files (#854, stryker-ordered-tap.mjs): the ordering itself, the runner as
// Stryker makes it, real Stryker runs, and that stryker.config.mjs uses it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TapTestRunner } from '@stryker-mutator/tap-runner';
import { NAME, OrderedTapTestRunner, inConfiguredOrder, strykerPlugins } from './stryker-ordered-tap.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PLUGIN = join(import.meta.dirname, 'stryker-ordered-tap.mjs');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...ENV } = process.env;

process.env.STRYKER_SCOPE ??= 'inflation';
const { default: config } = await import('../../../stryker.config.mjs');
const CONFIGURED = config.tap.testFiles;

// A shuffle that is the same on every run of this test.
const shuffled = (list, seed) => {
  const out = [...list];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

describe('the test files in the configured order', () => {
  it('come back as configured however they were found, on the list stryker.config.mjs gives', () => {
    assert.ok(CONFIGURED.length > 100, `only ${CONFIGURED.length} test files configured`);
    let moved = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const found = shuffled(CONFIGURED, seed);
      if (found.join() !== CONFIGURED.join()) moved += 1;
      assert.deepEqual(inConfiguredOrder(found, CONFIGURED), CONFIGURED);
    }
    assert.equal(moved, 200, 'every shuffle did move something');
    assert.deepEqual(inConfiguredOrder([...CONFIGURED].reverse(), CONFIGURED), CONFIGURED);
  });

  it('are a list of their own: the configured one is not handed out', () => {
    const configured = ['b.test.ts', 'a.test.ts'];
    const ordered = inConfiguredOrder(['a.test.ts', 'b.test.ts'], configured);
    assert.deepEqual(ordered, ['b.test.ts', 'a.test.ts']);
    assert.notEqual(ordered, configured);
    assert.deepEqual(inConfiguredOrder([], []), []);
  });

  it('fail when a configured file was not found, a pattern included', () => {
    assert.throws(() => inConfiguredOrder(['a.test.ts'], ['a.test.ts', 'gone.test.ts']), /tap-ordered: tap\.testFiles lists a file that was not found \(it must name files, not patterns\): gone\.test\.ts$/);
    assert.throws(() => inConfiguredOrder(['src/a.test.ts'], ['src/*.test.ts']), /not found .*: src\/\*\.test\.ts$/);
    assert.throws(() => inConfiguredOrder(CONFIGURED.slice(1), CONFIGURED), /not found/);
  });

  it('fail when a file was found that is not configured', () => {
    assert.throws(() => inConfiguredOrder(['a.test.ts', 'new.test.ts'], ['a.test.ts']), /tap-ordered: a test file was found that tap\.testFiles does not list: new\.test\.ts$/);
    assert.throws(() => inConfiguredOrder([...CONFIGURED, 'src/new.test.ts'], CONFIGURED), /does not list: src\/new\.test\.ts$/);
  });

  it('fail when a file is listed or found twice', () => {
    assert.throws(() => inConfiguredOrder(['a.test.ts'], ['a.test.ts', 'a.test.ts']), /lists a file twice: a\.test\.ts$/);
    assert.throws(() => inConfiguredOrder(['a.test.ts', 'a.test.ts'], ['a.test.ts']), /2 test files were found for the 1 listed$/);
  });
});

describe('the runner Stryker is given', () => {
  it('is one test runner plugin, named as stryker.config.mjs names it', () => {
    assert.equal(NAME, 'tap-ordered');
    assert.equal(strykerPlugins.length, 1);
    assert.equal(strykerPlugins[0].kind, 'TestRunner');
    assert.equal(strykerPlugins[0].name, 'tap-ordered');
    assert.equal(typeof strykerPlugins[0].factory, 'function');
    assert.deepEqual(strykerPlugins[0].factory.inject, ['$injector']);
  });

  it('is the tap runner of the installed version, taking what it takes', () => {
    // An upgrade that changes any of this is read again before it is let in:
    // what the class is handed, and the three lines the order rests on.
    for (const pkg of ['core', 'tap-runner', 'api']) {
      assert.equal(JSON.parse(read(`node_modules/@stryker-mutator/${pkg}/package.json`)).version, '10.1.1', pkg);
    }
    assert.equal(Object.getPrototypeOf(OrderedTapTestRunner), TapTestRunner);
    assert.deepEqual(TapTestRunner.inject, ['options', 'logger', 'globalNamespace']);
    assert.equal(OrderedTapTestRunner.inject, TapTestRunner.inject);
    assert.equal(OrderedTapTestRunner.hookFile, TapTestRunner.hookFile);
    assert.deepEqual(Object.getOwnPropertyNames(OrderedTapTestRunner.prototype), ['constructor', 'init'], 'nothing but the list is changed');
    const runner = read('node_modules/@stryker-mutator/tap-runner/dist/src/tap-test-runner.js');
    assert.ok(runner.includes('        this.testFiles = await findTestyLookingFiles(this.options.tap.testFiles);\n'));
    assert.ok(runner.includes('        const testFiles = testFilter ?? testFilesToRun;\n'));
    assert.ok(runner.includes('            : this.testFiles;\n'));
    assert.ok(read('node_modules/@stryker-mutator/tap-runner/dist/src/tap-helper.js').includes("    return glob(globPatterns, { ignore: ['**/node_modules/**'], posix: true });\n"));
    assert.ok(read('node_modules/@stryker-mutator/core/dist/src/mutants/mutant-test-planner.js').includes('                    testFilter: coveredBy,\n'));
  });

  it('lists this project’s test files in the configured order, every time', () => {
    // The runner itself, made and started as Stryker does in each of its
    // test runner processes, forty times over, from the project's folder.
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { OrderedTapTestRunner } from ${JSON.stringify(pathToFileURL(PLUGIN).href)};
      const configured = JSON.parse(process.argv[1]);
      const lists = [];
      for (let i = 0; i < 40; i++) {
        const runner = new OrderedTapTestRunner({ tap: { testFiles: configured } }, { isDebugEnabled: () => false }, '__stryker__');
        await runner.init();
        lists.push(runner.testFiles);
      }
      process.stdout.write(JSON.stringify(lists));
    `, JSON.stringify(CONFIGURED)], { cwd: ROOT, encoding: 'utf8', env: ENV, maxBuffer: 64 * 1024 * 1024 });
    const lists = JSON.parse(out);
    assert.equal(lists.length, 40);
    for (const list of lists) assert.deepEqual(list, CONFIGURED);
  });

  it('refuses to start when a configured test file is not there', () => {
    const run = () => execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { OrderedTapTestRunner } from ${JSON.stringify(pathToFileURL(PLUGIN).href)};
      await new OrderedTapTestRunner({ tap: { testFiles: ['package.json', 'src/not-there.test.ts'] } }, {}, '__stryker__').init();
    `], { cwd: ROOT, encoding: 'utf8', env: ENV, stdio: 'pipe' });
    assert.throws(run, /tap\.testFiles lists a file that was not found \(it must name files, not patterns\): src\/not-there\.test\.ts/);
  });
});

describe('stryker.config.mjs', () => {
  it('uses the ordered runner, beside the plugins Stryker loads by itself', () => {
    const source = read('stryker.config.mjs');
    assert.ok(source.includes("  testRunner: 'tap-ordered',\n  appendPlugins: ['./scripts/lib/checks/stryker-ordered-tap.mjs'],\n"));
    assert.doesNotMatch(source, /\n\s*plugins:/, 'the default plugins are not replaced');
    assert.equal(config.testRunner, NAME);
    assert.deepEqual(config.appendPlugins, ['./scripts/lib/checks/stryker-ordered-tap.mjs']);
    assert.ok(existsSync(join(ROOT, config.appendPlugins[0])));
    assert.ok(source.includes('    testFiles: TEST_FILES,\n'));
  });

  it('lists files, not patterns, each once and each there', () => {
    assert.equal(new Set(CONFIGURED).size, CONFIGURED.length);
    for (const file of CONFIGURED) {
      assert.doesNotMatch(file, /[*?{}[\]\\]/, file);
      assert.ok(existsSync(join(ROOT, file)), file);
    }
  });
});

// The real thing, small: five test files in three folders, listed in an
// order that is neither by name nor by folder. Each writes its name to a log
// as it loads. Four of them only run the code; the last one checks it, so
// under a mutant Stryker goes through all five before the mutant dies.
// (The tap runner alone listed these five out of order in 53 and 83 of 300
// tries, and this project's own list in 34 of 40; the test above starts the
// ordered runner on that list forty times.)
describe('real Stryker runs with the ordered runner', { timeout: 120_000 }, () => {
  const ORDER = ['src/z.test.mjs', 'src/b/m.test.mjs', 'src/a/k.test.mjs', 'src/c.test.mjs', 'src/b/a.test.mjs'];

  it('run the test files in the configured order, in the first test run and for each mutant, six times of six', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-ordered-'));
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      mkdirSync(join(dir, 'src/a'), { recursive: true });
      mkdirSync(join(dir, 'src/b'));
      writeFileSync(join(dir, 'src/sum.mjs'), 'export function sum(a, b) { return a + b; }\n');
      const log = join(dir, 'order.log');
      for (const file of ORDER) {
        const check = file === ORDER.at(-1) ? 'assert.equal(sum(2, 3), 5);' : 'sum(2, 3); assert.ok(true);';
        writeFileSync(join(dir, file), "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { appendFileSync } from 'node:fs';\n"
          + `import { sum } from '${relative(dirname(file), 'src') || '.'}/sum.mjs';\nappendFileSync(process.env.ORDER_LOG, '${file}\\n');\ntest('t', () => { ${check} });\n`);
      }
      writeFileSync(join(dir, 'stryker.config.mjs'), `export default ${JSON.stringify({
        testRunner: NAME, appendPlugins: [PLUGIN],
        tap: { testFiles: ORDER, nodeArgs: ['--test-reporter=tap'], forceBail: true },
        // One mutant at a time, so the log is one run after the other.
        coverageAnalysis: 'perTest', mutate: ['src/sum.mjs'], concurrency: 1,
        reporters: ['json'], jsonReporter: { fileName: 'reports/m.json' },
        tempDirName: '.stryker-tmp', thresholds: { break: null },
      })};\n`);
      for (let i = 1; i <= 6; i++) {
        writeFileSync(log, '');
        const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js'), 'run', 'stryker.config.mjs'], { cwd: dir, encoding: 'utf8', env: { ...ENV, ORDER_LOG: log } });
        assert.match(out, /Starting initial test run \(tap-ordered test runner with "perTest" coverage analysis\)/);
        const report = JSON.parse(readFileSync(join(dir, 'reports/m.json'), 'utf8'));
        const mutants = report.files['src/sum.mjs'].mutants;
        assert.ok(mutants.length >= 2, `run ${i}: ${mutants.length} mutants`);
        // Stryker numbers the tests as their files ran in the first test run.
        const numbered = Object.entries(report.testFiles).sort(([, a], [, b]) => Number(a.tests[0].id) - Number(b.tests[0].id)).map(([file]) => file);
        assert.deepEqual(numbered, ORDER, `run ${i}: the first test run`);
        for (const mutant of mutants) {
          assert.equal(mutant.status, 'Killed', `run ${i}`);
          assert.deepEqual(mutant.coveredBy, ['0', '1', '2', '3', '4'], `run ${i}: each mutant's tests, in order`);
          assert.deepEqual(mutant.killedBy, ['4'], `run ${i}: the last file is the one that checks`);
        }
        // What really ran: the first test run, then every file for each mutant.
        const ran = readFileSync(log, 'utf8').trim().split('\n');
        assert.deepEqual(ran, Array.from({ length: 1 + mutants.length }, () => ORDER).flat(), `run ${i}: the log`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
