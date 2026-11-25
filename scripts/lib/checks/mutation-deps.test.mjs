import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CHANGED_MARK, DEPS_SCHEMA, analyse, createGraph, dependencyFingerprints, depsPath, invalidate, readStored } from './mutation-deps.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const FAKE = '/project';

/** A graph over files held in memory. */
const graphOf = (files) => createGraph({ root: FAKE, tracked: Object.keys(files), read: (p) => files[p] });
const depsOf = (files, rel) => graphOf(files).dependencies(rel);
const fp = (files, rel) => graphOf(files).fingerprintOf(rel).fingerprint;

describe('what a file reaches, from its syntax tree (#891)', () => {
  const at = (text, file = 'src/a.test.ts') => analyse(text, `${FAKE}/${file}`, FAKE);

  it('follows static, re-exported, dynamic and required imports', () => {
    const { imports, opaque } = at(`
      import { a } from './a.ts';
      import type { T } from './t.ts';
      export * from './b.ts';
      export { c } from './c.ts';
      const d = await import('./d.ts');
      const e = require('./e.cjs');
      const f = await import(\`./locales/\${name}.ts\`);
    `);
    assert.deepEqual(opaque, []);
    assert.deepEqual(imports.map((i) => i.value && [i.value.s, i.value.exact]), [
      ['./a.ts', true], ['./b.ts', true], ['./c.ts', true], ['./d.ts', true], ['./e.cjs', true], ['./locales/', false],
    ]);
  });

  it('leaves out what is erased before anything runs, and keeps an inline type import', () => {
    const { imports } = at("import type { T } from './t.ts';\nexport type { U } from './u.ts';\nimport { type V } from './v.ts';\nimport { type W, w } from './w.ts';\n");
    assert.deepEqual(imports.map((i) => i.spec), ['./v.ts', './w.ts']);
  });

  it('an import whose path is unknown from its start is unknown', () => {
    const { imports } = at('const m = await import(where);');
    assert.equal(imports[0].value, null);
  });

  it('works out paths read through the file system', () => {
    const { reads, opaque } = at(`
      import { readFileSync, readdirSync } from 'node:fs';
      import { join } from 'node:path';
      const DATA = join(import.meta.dirname, '..', 'data');
      readFileSync(new URL('./x.json', import.meta.url));
      readdirSync(DATA);
      readFileSync(join(DATA, name));
      readFileSync(\`\${DATA}/fixed.json\`);
    `, 'src/utils/a.test.ts');
    assert.deepEqual(opaque, []);
    // new URL counts on its own as well as in the read.
    assert.deepEqual(reads.map((v) => v && [v.s, v.exact]), [
      ['file:///project/src/utils/x.json', true],
      ['file:///project/src/utils/x.json', true],
      ['/project/src/utils/../data', true],
      ['/project/src/utils/../data/', false],
      ['/project/src/utils/../data/fixed.json', true],
    ]);
  });

  it('the same fs function loaded twice, in two functions, is still followed; writes and fs.constants do not widen', () => {
    const { reads, opaque } = at(`
      import fs from 'node:fs';
      async function a() { const { readFileSync } = await import('node:fs'); return readFileSync('a.css'); }
      async function b() { const { readFileSync } = await import('node:fs'); return readFileSync('b.css'); }
      fs.writeFileSync('/tmp/x', '');
      fs.mkdtempSync('/tmp/y');
      fs.accessSync('c.txt', fs.constants.R_OK);
    `);
    assert.deepEqual(opaque, []);
    assert.deepEqual(reads.map((v) => v.s), ['a.css', 'b.css', 'c.txt']);
  });

  it('a destructured load of node:fs is followed, not counted as handing it on', () => {
    const { reads, opaque } = at("const { readFileSync } = await import('node:fs');\nreadFileSync(new URL('./a.css', import.meta.url), 'utf8');\n");
    assert.deepEqual(opaque, []);
    assert.equal(reads.length, 2);
  });

  it('sees fs.promises, `promises as`, a namespace and a default import', () => {
    const { reads } = at(`
      import fs from 'node:fs';
      import * as ns from 'fs';
      import { promises as fsp } from 'node:fs';
      import { readFile } from 'node:fs/promises';
      fs.readFileSync('a.txt');
      ns.promises.readFile('b.txt');
      fsp.readFile('c.txt');
      readFile('d.txt');
    `);
    assert.deepEqual(reads.map((v) => v.s), ['a.txt', 'b.txt', 'c.txt', 'd.txt']);
  });

  it('never reads a parameter, a destructured or a shadowed name as a constant of the same name', () => {
    for (const text of [
      "import { readFileSync } from 'node:fs'; const file = 'a.json'; function f(file) { return readFileSync(file); }",
      "import { readFileSync } from 'node:fs'; const file = 'a.json'; const g = ({ file }) => readFileSync(file);",
      "import { readFileSync } from 'node:fs'; const file = 'a.json'; { const file = other; readFileSync(file); }",
      "import { readFileSync } from 'node:fs'; const file = 'a.json'; for (const [file] of list) readFileSync(file);",
      "import { readFileSync } from 'node:fs'; import { file } from './names.ts'; readFileSync(file);",
      "import { readFileSync } from 'node:fs'; let file = 'a.json'; file = other; readFileSync(file);",
    ]) {
      assert.deepEqual(at(text).reads, [null], text);
    }
  });

  it('takes only node:path’s join and resolve for paths, not a Promise’s resolve', () => {
    const own = at("import { readFileSync } from 'node:fs'; new Promise((resolve) => readFileSync(resolve('a', 'b')));");
    assert.deepEqual(own.reads, [null]);
    const helper = at("import { readFileSync } from 'node:fs'; import { join } from './mine.ts'; readFileSync(join('a', 'b'));");
    assert.deepEqual(helper.reads, [null]);
    const path = at("import { readFileSync } from 'node:fs'; import path, { resolve as r } from 'node:path'; readFileSync(path.posix.join('a', 'b')); readFileSync(r('/x', 'y'));");
    assert.deepEqual(path.reads.map((v) => v.s), ['a/b', '/x/y']);
  });

  it('depends on everything when it starts processes or loads code another way', () => {
    for (const [text, reason] of [
      ["import { execFileSync } from 'node:child_process';", /child_process/],
      ["import { Worker } from 'node:worker_threads';", /worker_threads/],
      ["import { createRequire } from 'node:module';", /node:module/],
      ['const p = require.resolve("./x");', /require\.resolve/],
      ["import { readFileSync } from 'node:fs'; const read = readFileSync; read('a');", /hands on readFileSync/],
      ["import * as fs from 'node:fs'; use(fs);", /hands on the module fs/],
      ["import { readFileSync } from 'node:fs'; use({ readFileSync });", /hands on readFileSync/],
      ["const { readFileSync } = await import('node:fs'); use({ read: readFileSync });", /hands on readFileSync/],
      ["import { readFileSync } from 'node:fs'; readFileSync('a', { ...opts });", /options/],
      ['this is not code (', /cannot be parsed/],
      // Council round 1 (DeepSeek, Codex): shadowed names, handed-on members, unknown functions.
      ["import { readFileSync } from 'node:fs'; import { join } from 'node:path'; function read(join) { return readFileSync(join('src', 'decoy.json')); }", /name join .* declared again/],
      ["import { readFileSync } from 'node:fs'; function f(readFileSync) { return readFileSync('a.json'); }", /name readFileSync .* declared again/],
      ["import fs from 'node:fs'; const g = (fs) => fs.readFileSync('a.json');", /name fs .* declared again/],
      ["import { fileURLToPath } from 'node:url'; import { readFileSync } from 'node:fs'; { const fileURLToPath = (u) => 'x'; readFileSync(fileURLToPath(new URL('./a', import.meta.url))); }", /name fileURLToPath .* declared again/],
      ["import fs from 'node:fs'; const read = fs.readFileSync; read('src/cases.json');", /takes readFileSync off a file-system module/],
      ["import fs from 'node:fs'; const read = fs.promises.readFile; read('a');", /takes readFile off/],
      ["import fs from 'node:fs'; fs['readFileSync']('a');", /computed member/],
      ["import fs from 'node:fs'; const { readFileSync: r } = fs; r('a');", /hands on the module fs/],
      ["import fg from 'fast-glob'; fg.sync('src/data/*.json');", /calls sync on a file-system module/],
      ["import fg from 'fast-glob'; fg('src/data/*.json');", /calls the module fg itself/],
    ]) {
      assert.match(at(text).opaque.join('; '), reason, text);
    }
  });
});

describe('a file’s fingerprint covers all it reaches, and nothing else', () => {
  const FILES = {
    'src/a.test.ts': "import { a } from './a.ts';\nimport { check } from '../test/helper.ts';\n",
    'src/a.ts': "import { b } from './b';\nexport const a = 1;\n",
    'src/b.ts': "import data from './data/b.json' with { type: 'json' };\nexport const b = 2;\n",
    'src/data/b.json': '{"b": 2}',
    'test/helper.ts': "import { readFileSync } from 'node:fs';\nexport const check = () => readFileSync(new URL('../src/fixtures/case.txt', import.meta.url), 'utf8');\n",
    'src/fixtures/case.txt': 'case',
    'src/other.ts': 'export const other = 3;\n',
    'src/locales.test.ts': "export const load = (name) => import(`./locales/${name}.ts`);\n",
    'src/locales/en.ts': 'export default {};\n',
    'src/lister.test.ts': "import { readdirSync } from 'node:fs';\nreaddirSync(new URL('./lessons/', import.meta.url));\n",
    'src/lessons/one.md': 'one',
  };
  const BASE = fp(FILES, 'src/a.test.ts');

  it('changes with a transitive import, a data file, a test helper and a file the helper reads', () => {
    for (const path of ['src/a.test.ts', 'src/a.ts', 'src/b.ts', 'src/data/b.json', 'test/helper.ts', 'src/fixtures/case.txt']) {
      assert.notEqual(fp({ ...FILES, [path]: `${FILES[path]} ` }, 'src/a.test.ts'), BASE, path);
    }
    assert.deepEqual(depsOf(FILES, 'src/a.test.ts').files, [
      '>src/fixtures/case.txt/', '?src/b', '?src/fixtures/case.txt', 'src/a.test.ts', 'src/a.ts', 'src/b.ts', 'src/data/b.json', 'src/fixtures/case.txt', 'test/helper.ts',
    ]);
  });

  it('stays the same when a file it does not reach changes', () => {
    assert.equal(fp({ ...FILES, 'src/other.ts': 'export const other = 4;\n', 'src/new.ts': '' }, 'src/a.test.ts'), BASE);
  });

  it('changes when a file appears at a name tried before the one an import found', () => {
    // './b' resolved to src/b.ts; a src/b (no extension) added would win.
    assert.notEqual(fp({ ...FILES, 'src/b': 'x' }, 'src/a.test.ts'), BASE);
  });

  it('a dynamic import with a known head reaches every file under it, new ones included', () => {
    const before = fp(FILES, 'src/locales.test.ts');
    assert.notEqual(fp({ ...FILES, 'src/locales/en.ts': 'export default { a: 1 };\n' }, 'src/locales.test.ts'), before);
    assert.notEqual(fp({ ...FILES, 'src/locales/hi.ts': 'export default {};\n' }, 'src/locales.test.ts'), before);
    assert.equal(fp({ ...FILES, 'src/other.ts': '' }, 'src/locales.test.ts'), before);
  });

  it('a folder listing changes when a file is added to, edited in or taken from the folder', () => {
    const before = fp(FILES, 'src/lister.test.ts');
    assert.notEqual(fp({ ...FILES, 'src/lessons/two.md': 'two' }, 'src/lister.test.ts'), before);
    assert.notEqual(fp({ ...FILES, 'src/lessons/one.md': 'edited' }, 'src/lister.test.ts'), before);
    const { 'src/lessons/one.md': _, ...without } = FILES;
    assert.notEqual(fp(without, 'src/lister.test.ts'), before);
  });

  it('a file that cannot be followed depends on every file a mutation run reads', () => {
    const files = { ...FILES, 'src/wide.test.ts': 'const m = await import(where);\n', 'src/sub.test.ts': "import x from '#internal';\n" };
    for (const test of ['src/wide.test.ts', 'src/sub.test.ts']) {
      const before = fp(files, test);
      assert.ok(depsOf(files, test).all.length > 0, test);
      assert.notEqual(fp({ ...files, 'src/other.ts': 'changed' }, test), before, test);
      assert.notEqual(fp({ ...files, 'scripts/anything.mjs': 'new' }, test), before, test);
      // What no mutation run reads still does not count.
      assert.equal(fp({ ...files, 'docs/notes.md': 'new' }, test), before, test);
    }
    const broken = { ...FILES, 'src/broken.test.ts': "import './missing.ts';\n" };
    assert.match(depsOf(broken, 'src/broken.test.ts').all.join(), /resolves to no file/);
  });

  it('packages and Node’s own modules are left to the global fingerprint', () => {
    const files = { 'src/p.test.ts': "import React from 'react';\nimport { test } from 'node:test';\n" };
    assert.deepEqual(depsOf(files, 'src/p.test.ts'), { all: [], files: ['src/p.test.ts'] });
  });

  it('is kept beside the results, under a schema of its own', () => {
    assert.equal(depsPath('reports/stryker-incremental/loan-1of5.json'), 'reports/stryker-incremental/loan-1of5.deps.json');
    const made = dependencyFingerprints({ root: FAKE, tracked: Object.keys(FILES), read: (p) => FILES[p], tests: ['src/a.test.ts'], sources: ['src/a.ts'] });
    assert.equal(made.schema, DEPS_SCHEMA);
    assert.match(made.tests['src/a.test.ts'], /^[0-9a-f]{64}$/);
    assert.match(made.sources['src/a.ts'], /^[0-9a-f]{64}$/);
    assert.deepEqual(readStored(JSON.parse(JSON.stringify(made))), made);
    for (const bad of [null, {}, { ...made, schema: DEPS_SCHEMA + 1 }, { ...made, tests: null }, { ...made, sources: 'x' }]) assert.equal(readStored(bad), null);
  });
});

describe('a test file whose dependencies changed looks changed to Stryker', () => {
  const report = () => ({
    files: {
      'src/a.ts': { source: 'a', mutants: [
        { id: '1', status: 'Killed', coveredBy: ['t1'], killedBy: ['t1'] },
        { id: '2', status: 'Survived', coveredBy: ['t2'] },
        { id: '3', status: 'Survived', static: true, coveredBy: [] },
        { id: '4', status: 'NoCoverage' },
        { id: '5', status: 'Ignored' },
      ] },
      'src/b.ts': { source: 'b', mutants: [{ id: '6', status: 'Killed', coveredBy: ['t3'], killedBy: ['t3'] }] },
    },
    testFiles: {
      'src/a.test.ts': { source: 'test a', tests: [{ id: 't1', name: 'src/a.test.ts' }] },
      'src/c.test.ts': { source: 'test c', tests: [{ id: 't2', name: 'src/c.test.ts' }] },
      'src/b.test.ts': { source: 'test b', tests: [{ id: 't3', name: 'src/b.test.ts' }] },
    },
  });
  const FPS = { tests: { 'src/a.test.ts': 'A', 'src/c.test.ts': 'C', 'src/b.test.ts': 'B' }, sources: { 'src/a.ts': 'a', 'src/b.ts': 'b' } };

  it('changes nothing when every fingerprint is the same', () => {
    const r = report();
    assert.deepEqual(invalidate(r, FPS, FPS, FAKE), { tests: [], mutants: 0 });
    assert.deepEqual(r, report());
  });

  it('marks a test file whose own fingerprint changed, and only it', () => {
    const r = report();
    const now = { ...FPS, tests: { ...FPS.tests, 'src/b.test.ts': 'B2' } };
    assert.deepEqual(invalidate(r, FPS, now, FAKE), { tests: ['src/b.test.ts'], mutants: 0 });
    assert.equal(r.testFiles['src/b.test.ts'].source, `${CHANGED_MARK}test b`);
    assert.equal(r.testFiles['src/a.test.ts'].source, 'test a');
    // Marked once, however often it runs.
    invalidate(r, FPS, now, FAKE);
    assert.equal(r.testFiles['src/b.test.ts'].source, `${CHANGED_MARK}test b`);
  });

  it('a mutated file whose fingerprint changed: marks every test that ran its mutants, and takes out its static and uncovered ones', () => {
    const r = report();
    const now = { ...FPS, sources: { ...FPS.sources, 'src/a.ts': 'a2' } };
    // t1 killed and t2 covered a mutant in src/a.ts; t3 ran only src/b.ts.
    assert.deepEqual(invalidate(r, FPS, now, FAKE), { tests: ['src/a.test.ts', 'src/c.test.ts'], mutants: 2 });
    assert.deepEqual(r.files['src/a.ts'].mutants.map((m) => m.id), ['1', '2', '5']);
    assert.equal(r.files['src/b.ts'].mutants.length, 1);
    assert.equal(r.testFiles['src/b.test.ts'].source, 'test b');
  });

  it('with no fingerprints on record, or one missing, counts everything as changed', () => {
    const r = report();
    assert.deepEqual(invalidate(r, null, FPS, FAKE), { tests: ['src/a.test.ts', 'src/b.test.ts', 'src/c.test.ts'], mutants: 2 });
    const s = report();
    const { 'src/c.test.ts': _, ...tests } = FPS.tests;
    assert.deepEqual(invalidate(s, { ...FPS, tests }, FPS, FAKE).tests, ['src/c.test.ts']);
  });

  it('reads absolute keys as paths under the root', () => {
    const r = report();
    r.testFiles = { [`${FAKE}/src/b.test.ts`]: r.testFiles['src/b.test.ts'] };
    const now = { ...FPS, tests: { ...FPS.tests, 'src/b.test.ts': 'B2' } };
    assert.deepEqual(invalidate(r, FPS, now, FAKE).tests, ['src/b.test.ts']);
  });
});

describe('on the real repository', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  const graph = createGraph({ root: ROOT, tracked });

  it('a tool’s own tests reach the tool, and not the other tools’ code', () => {
    const loan = graph.dependencies('src/utils/loan/math.test.ts');
    assert.deepEqual(loan.all, []);
    assert.ok(loan.files.includes('src/utils/loan/math.ts'));
    const others = loan.files.filter((f) => /^src\/utils\/(inflation|monte-carlo|multi-currency-net-worth|invest-or-pay-off)\//.test(f)
      || /^src\/components\/(Inflation|MonteCarlo|MultiCurrencyNetWorth|NetWorth|InvestOrPayOff)/.test(f));
    assert.deepEqual(others, []);
  });

  it('every test of a whole tool can be followed without widening', () => {
    const config = readFileSync(join(ROOT, 'stryker.config.mjs'), 'utf8');
    assert.match(config, /export const SCOPES = \{/);
    const tools = tracked.filter((p) => /^src\/components\/(LoanCompare|Inflation|InvestOrPayOff|NetWorth|MultiCurrencyNetWorth|MonteCarlo)[^/]*\.test\.tsx?$/.test(p));
    assert.ok(tools.length > 20, `only ${tools.length} tool test files`);
    const wide = tools.filter((t) => graph.dependencies(t).all.length > 0);
    assert.deepEqual(wide, []);
  });
});

describe('Stryker, with the fingerprints, gives what a forced run gives (#891, condition 5)', { timeout: 300_000 }, () => {
  // A tiny project, run by the installed Stryker and tap runner, as the
  // shards run it: before each incremental run the restored results are
  // invalidated as scripts/mutation-stale-results.mjs does. After each
  // change (a helper, a data file a helper reads, a module reached by a
  // dynamic import) the results must equal a forced run's on the same code,
  // and for the first change, a run WITHOUT the fingerprints must be shown
  // to keep a stale kill, so the test can fail.
  it('a helper, a data file and a dynamic import: no stale kill, no stale survivor', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-deps-'));
    const write = (path, text) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); };
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      write('package.json', '{"type":"module"}');
      const head = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n";
      // big: a static helper (LIMIT) and cases read from a data file by a helper.
      write('src/big.mjs', "import { LIMIT } from './limit.mjs';\nexport function big(a) { return a > LIMIT; }\n");
      write('src/limit.mjs', 'export const LIMIT = 10;\n');
      write('src/testing/cases.mjs', "import { readFileSync } from 'node:fs';\nexport const cases = () => JSON.parse(readFileSync(new URL('../cases.json', import.meta.url), 'utf8'));\n");
      write('src/cases.json', '[[10, false], [11, true]]');
      write('src/big.test.mjs', `${head}import { big } from './big.mjs';\nimport { cases } from './testing/cases.mjs';\ntest('big', () => { for (const [a, want] of cases()) assert.equal(big(a), want); });\n`);
      // small: its limit comes through a dynamic import whose name is not known.
      write('src/small.mjs', "const { LIMIT } = await import(`./limits/${process.env.LIMITS ?? 'main'}.mjs`);\nexport function small(a) { return a < LIMIT; }\n");
      write('src/limits/main.mjs', 'export const LIMIT = 10;\n');
      write('src/small.test.mjs', `${head}import { small } from './small.mjs';\ntest('small', () => { assert.equal(small(9), true); assert.equal(small(10), false); });\n`);
      const config = (name) => `export default ${JSON.stringify({
        testRunner: 'tap', plugins: ['@stryker-mutator/tap-runner'],
        tap: { testFiles: ['src/*.test.mjs'], nodeArgs: ['--test-reporter=tap'], forceBail: true },
        coverageAnalysis: 'perTest', mutate: ['src/big.mjs', 'src/small.mjs'], concurrency: 1,
        reporters: ['json'], jsonReporter: { fileName: `reports/${name}.json` },
        incremental: true, incrementalFile: `reports/${name}.inc.json`, tempDirName: '.stryker-tmp', thresholds: { break: null },
      })};\n`;
      write('inc.config.mjs', config('inc'));
      write('forced.config.mjs', config('forced'));
      write('plain.config.mjs', config('plain'));
      const tracked = () => execFileSync('find', ['.', '-path', './node_modules', '-prune', '-o', '-path', './reports', '-prune', '-o', '-path', './.stryker-tmp', '-prune', '-o', '-type', 'f', '-print'], { cwd: dir, encoding: 'utf8' })
        .split('\n').filter(Boolean).map((p) => p.slice(2));
      const fingerprints = () => dependencyFingerprints({ root: dir, tracked: tracked(), tests: ['src/big.test.mjs', 'src/small.test.mjs'], sources: ['src/big.mjs', 'src/small.mjs'] });
      const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
      const stryker = (name, force = false) => {
        const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js'), 'run', `${name}.config.mjs`, ...(force ? ['--force'] : [])], { cwd: dir, encoding: 'utf8', env });
        const report = JSON.parse(readFileSync(join(dir, `reports/${name}.json`), 'utf8'));
        const statuses = {};
        for (const [file, { mutants }] of Object.entries(report.files)) {
          for (const m of mutants) statuses[`${file}:${m.location.start.line}:${m.location.start.column}:${m.mutatorName}:${m.replacement}`] = m.status;
        }
        return { out, statuses };
      };
      // The shards' step before Stryker: invalidate, then save today's fingerprints.
      const prepare = () => {
        const inc = join(dir, 'reports/inc.inc.json');
        const report = JSON.parse(readFileSync(inc, 'utf8'));
        const stored = readStored(JSON.parse(readFileSync(depsPath(inc), 'utf8')));
        const current = fingerprints();
        const result = invalidate(report, stored, current, dir);
        writeFileSync(inc, JSON.stringify(report));
        writeFileSync(depsPath(inc), JSON.stringify(current));
        return result;
      };
      const boundary = (statuses, file, op) => Object.entries(statuses).filter(([k]) => k.startsWith(file) && k.endsWith(`:${op}`)).map(([, s]) => s);

      // The first run: everything fresh, fingerprints saved beside it.
      const first = stryker('inc', true);
      mkdirSync(join(dir, 'reports'), { recursive: true });
      writeFileSync(depsPath(join(dir, 'reports/inc.inc.json')), JSON.stringify(fingerprints()));
      writeFileSync(join(dir, 'reports/plain.inc.json'), readFileSync(join(dir, 'reports/inc.inc.json')));
      assert.deepEqual(boundary(first.statuses, 'src/big.mjs', 'a >= LIMIT'), ['Killed']);
      assert.deepEqual(boundary(first.statuses, 'src/small.mjs', 'a <= LIMIT'), ['Killed']);

      const step = (label, expectStale) => {
        const marked = prepare();
        const inc = stryker('inc');
        const forced = stryker('forced', true);
        assert.deepEqual(inc.statuses, forced.statuses, `${label}: the incremental run must give the forced run's results`);
        if (expectStale) {
          // Without the fingerprints, Stryker keeps what it had.
          const plain = stryker('plain');
          assert.notDeepEqual(plain.statuses, forced.statuses, `${label}: without the fingerprints a stale result must show`);
        }
        return { marked, inc, forced };
      };

      // 1. A helper: the limit moves, so `a >= LIMIT` no longer fails big(10).
      write('src/limit.mjs', 'export const LIMIT = 10.5;\n');
      const helper = step('a helper', true);
      assert.deepEqual(helper.marked.tests, ['src/big.test.mjs']);
      assert.deepEqual(boundary(helper.forced.statuses, 'src/big.mjs', 'a >= LIMIT'), ['Survived']);
      assert.match(helper.inc.out, /of \d+ mutant result\(s\) are reused/);

      // 2. A data file a helper reads: a case at the new limit kills it again.
      write('src/cases.json', '[[10.5, false], [11, true]]');
      const data = step('a data file');
      assert.deepEqual(data.marked.tests, ['src/big.test.mjs']);
      assert.deepEqual(boundary(data.forced.statuses, 'src/big.mjs', 'a >= LIMIT'), ['Killed']);

      // 3. A module reached by a dynamic import.
      write('src/limits/main.mjs', 'export const LIMIT = 9.5;\n');
      const dynamic = step('a dynamic import');
      assert.deepEqual(dynamic.marked.tests, ['src/small.test.mjs']);
      assert.deepEqual(boundary(dynamic.forced.statuses, 'src/small.mjs', 'a <= LIMIT'), ['Survived']);
      // The other file's results were reused, not run again.
      const reused = /(\d+) of (\d+) mutant result\(s\) are reused/.exec(dynamic.inc.out);
      assert.ok(reused && Number(reused[1]) > 0, dynamic.inc.out);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
