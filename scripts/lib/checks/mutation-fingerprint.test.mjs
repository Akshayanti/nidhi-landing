import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SCHEMA, SOURCE_READERS, fingerprint, isFingerprinted, isSelectedTest, trackedPaths } from './mutation-fingerprint.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

describe('what a mutation shard’s earlier results depend on', () => {
  const FILES = {
    'package-lock.json': 'lock', 'tsconfig.json': 'ts', '.nvmrc': '22', 'stryker.config.mjs': 'config',
    'scripts/lib/checks/mutation-shards.mjs': 'shards', 'test/dom.ts': 'helper',
    'src/utils/loan/math.ts': 'math', 'src/utils/loan/math.test.ts': 'math test',
    'src/components/LoanCompare.tsx': 'loan', 'src/components/LoanCompare.dom.test.tsx': 'loan test',
    'src/data/inflation/worldbank.json': 'data', 'src/content/blog/01-a.md': 'lesson', 'docs/plans/PLAYBOOK.md': 'doc',
    '.github/workflows/tool-mutation.yml': 'workflow', '.github/workflows/deploy.yml': 'deploy',
  };
  const of = (files) => fingerprint(Object.keys(files), (path) => files[path]);
  const BASE = of(FILES);

  it('is a sha256, the same whatever order the files come in', () => {
    assert.match(BASE, /^[0-9a-f]{64}$/);
    assert.equal(fingerprint(Object.keys(FILES).reverse(), (path) => FILES[path]), BASE);
    assert.equal(fingerprint([...Object.keys(FILES), 'test/dom.ts'], (path) => FILES[path]), BASE);
  });

  it('stays the same when only a test the run starts is edited, added or deleted', () => {
    assert.equal(of({ ...FILES, 'src/utils/loan/math.test.ts': 'a sharper test' }), BASE);
    assert.equal(of({ ...FILES, 'src/utils/loan/new.test.ts': 'new', 'src/components/New.dom.test.tsx': 'new' }), BASE);
    const { 'src/utils/loan/math.test.ts': gone, ...rest } = FILES;
    assert.equal(gone, 'math test');
    assert.equal(of(rest), BASE);
  });

  it('stays the same for a lesson and for what no mutation run reads', () => {
    assert.equal(of({ ...FILES, 'src/content/blog/01-a.md': 'edited', 'src/content/blog/02-b.md': 'new' }), BASE);
    assert.equal(of({ ...FILES, 'docs/plans/PLAYBOOK.md': 'edited', '.github/workflows/deploy.yml': 'edited', 'CLAUDE.md': 'new' }), BASE);
  });

  it('changes with anything else: code, helpers, data, settings, the workflow, a new or a moved file', () => {
    for (const path of Object.keys(FILES).filter(isFingerprinted)) {
      assert.notEqual(of({ ...FILES, [path]: `${FILES[path]} changed` }), BASE, path);
      const { [path]: gone, ...rest } = FILES;
      assert.notEqual(of(rest), BASE, `${path} deleted`);
      assert.notEqual(of({ ...rest, [`${path}.moved`]: gone }), BASE, `${path} moved`);
    }
    assert.deepEqual(Object.keys(FILES).filter(isFingerprinted).sort(), [
      '.github/workflows/tool-mutation.yml', '.nvmrc', 'package-lock.json', 'scripts/lib/checks/mutation-shards.mjs',
      'src/components/LoanCompare.tsx', 'src/data/inflation/worldbank.json', 'src/utils/loan/math.ts',
      'stryker.config.mjs', 'test/dom.ts', 'tsconfig.json',
    ]);
    for (const path of ['src/new.ts', 'public/new.svg', 'emails/post.html.j2', 'a-new-file.txt', 'scripts/new.mjs']) {
      assert.notEqual(of({ ...FILES, [path]: 'new' }), BASE, path);
    }
  });

  it('does not take content for a name, or two files for one', () => {
    assert.notEqual(of({ 'a': 'b\0c', 'test/x.ts': '' }), of({ 'a\0b': 'c', 'test/x.ts': '' }));
    assert.notEqual(of({ 'ab': 'c' }), of({ 'a': 'bc' }));
  });

  it('refuses to answer without files, or with one it cannot read', () => {
    assert.throws(() => fingerprint([], () => ''), /nothing to fingerprint/);
    assert.throws(() => fingerprint(['docs/a.md', 'src/a.test.ts'], () => ''), /nothing to fingerprint/);
    assert.throws(() => fingerprint(['src/a.ts'], () => { throw new Error('ENOENT'); }), /ENOENT/);
  });

  it('reads git’s list whole, names with spaces included', () => {
    assert.deepEqual(trackedPaths('src/a b.ts\0docs/c\nd.md\0'), ['src/a b.ts', 'docs/c\nd.md']);
    assert.deepEqual(trackedPaths(''), []);
  });

  it('has a schema number, part of every fingerprint', () => {
    assert.equal(SCHEMA, 2);
    assert.match(read('scripts/lib/checks/mutation-fingerprint.mjs'), /update\(`schema \$\{SCHEMA\}\\0`\)/);
  });
});

describe('the tests left out are exactly the tests a mutation run starts', () => {
  it('knows a test by its place and its name', () => {
    for (const path of ['src/utils/loan/math.test.ts', 'src/components/LoanCompare.dom.test.tsx', 'src/a.test.ts']) assert.equal(isSelectedTest(path), true, path);
    for (const path of [
      ...SOURCE_READERS, 'src/utils/loan/math.ts', 'test/dom.test.ts', 'scripts/repo-hygiene.test.mjs', 'src/a.test.mjs',
      'src/a.test.ts.bak', 'src/a.test.tsx/b.ts', 'xsrc/a.test.ts', 'src/test.ts',
    ]) assert.equal(isSelectedTest(path), false, path);
  });

  it('is the list stryker.config.mjs runs, made by the same function', () => {
    const config = read('stryker.config.mjs');
    assert.match(config, /import \{ isSelectedTest \} from '\.\/scripts\/lib\/checks\/mutation-fingerprint\.mjs';/);
    // Filtered by that function, then only put in order (cheapest first): the order adds and drops no file.
    assert.ok(config.includes("const TEST_FILES = cheapestFirst(globSync(['src/**/*.test.ts', 'src/**/*.test.tsx']).filter(isSelectedTest), WHOLE_TOOLS);"));
    assert.ok(config.includes('testFiles: TEST_FILES,'));
    const globbed = globSync(['src/**/*.test.ts', 'src/**/*.test.tsx'], { cwd: ROOT }).sort();
    const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z', 'src'], { cwd: ROOT, encoding: 'utf8' }));
    const byName = tracked.filter((p) => isSelectedTest(p) || SOURCE_READERS.includes(p)).filter((p) => existsSync(join(ROOT, p))).sort();
    assert.deepEqual(byName, globbed.filter((p) => tracked.includes(p)));
    for (const path of SOURCE_READERS) assert.ok(existsSync(join(ROOT, path)), path);
  });
});

describe('no test’s result depends on the contents of another test file', () => {
  // A test file is left out of the fingerprint because Stryker compares it.
  // That covers the test itself, not another test that imports it or reads
  // it: there an edit would change a result Stryker goes on reusing.
  const CODE = /\.(ts|tsx|mjs|js)$/;
  const files = trackedPaths(execFileSync('git', ['ls-files', '-z', 'src', 'test'], { cwd: ROOT, encoding: 'utf8' }))
    .filter((p) => CODE.test(p) && existsSync(join(ROOT, p)));
  const resolve = (from, spec) => {
    const base = join(dirname(from), spec);
    return [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, join(base, 'index.ts')]
      .find((c) => existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile()) ?? null;
  };
  const imports = (file) => [...read(file).matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => resolve(file, m[1])).filter(Boolean);
  const closure = (file, seen = new Set()) => {
    if (seen.has(file)) return seen;
    seen.add(file);
    for (const next of imports(file)) closure(next, seen);
    return seen;
  };

  it('no file imports a test file', () => {
    const found = files.flatMap((f) => imports(f).filter((i) => /\.test\.[a-z]+$/.test(i)).map((i) => `${f} imports ${i}`));
    assert.deepEqual(found, []);
    assert.doesNotMatch(files.map(read).join('\n'), /(?:from|import)\s*\(?\s*['"][^'"]*\.test(?:\.[a-z]+)?['"]/);
  });

  it('no file reads a test file by name', () => {
    const call = /(readFileSync|readFile|new URL|join|resolve)\([^)]*['"`][^'"`]*\.test\.(ts|tsx)['"`]/;
    assert.deepEqual(files.filter((f) => call.test(read(f))), []);
    assert.match("readFileSync(new URL('./math.test.ts', import.meta.url))", call);
    assert.match("join(SRC, 'utils/loan/math.test.ts')", call);
  });

  // A test that runs mutated code AND lists a folder: each such listing is
  // named here with the line that keeps test files out of what it reads. A
  // new one fails until it is read and added.
  const LISTS = {
    'src/i18n/strings/catalog.test.ts': ["/\\.(astro|tsx|ts|js|mjs)$/.test(name) && !/\\.test\\./.test(name) ? readFileSync(path, 'utf8') : ''"],
    'src/utils/shared/jsonForScript.test.ts': ["else if (name.endsWith('.astro')) files.push(path);"],
    'src/utils/shared/toolPrivacy.test.ts': ["else if (name.endsWith('.astro')) out.push(path);"],
    'src/utils/privacySurface.ts': ["if (!CODE.test(name) || /\\.test\\./.test(name) || WORDS.test(path) || SELF.test(path)) continue;"],
    'src/utils/analyticsLabels.ts': ["else if (match.test(name) && !/\\.test\\./.test(name) && !SKIP.test(path)) out.push(path);"],
    'src/utils/sitemap.ts': ["else if (/\\.(md|mdx)$/.test(entry)) out.push(full);", "const files = readdirSync(dir).filter((entry) => entry.endsWith('.md'));"],
    'src/utils/spelling.test.ts': ["if (!file.endsWith('.md')) continue;", "if (!file.endsWith('.md')) continue;"],
  };
  const LISTING = /readdirSync|globSync|opendirSync|import\.meta\.glob|fs\.glob|readdir\(/;

  it('a test that runs mutated code and lists a folder keeps test files out of what it reads', () => {
    const config = read('stryker.config.mjs');
    const scopes = config.slice(config.indexOf('export const SCOPES = {'), config.indexOf('\n};', config.indexOf('export const SCOPES = {')));
    const patterns = [...scopes.matchAll(/'(src\/[^']+)'/g)].map((m) => m[1]);
    const mutated = new Set(globSync(patterns, { cwd: ROOT }).filter((f) => !/\.test\.tsx?$/.test(f)));
    assert.ok(mutated.size > 60, `only ${mutated.size} mutated files found`);
    // Reaching mutated code: importing it, or naming one of its files in a
    // string (a test can read a classic script and run it), or running
    // source any other way.
    const names = new RegExp(`['"\`/](${[...mutated].map((f) => f.split('/').pop().replace(/\./g, '\\.')).join('|')})['"\`]`);
    const RUNS_SOURCE = /node:vm|runInNewContext|runInThisContext|new Function\(|\beval\(/;
    const listing = new Set();
    let reaching = 0;
    for (const test of files.filter(isSelectedTest)) {
      const reached = [...closure(test)];
      if (!reached.some((f) => mutated.has(f) || RUNS_SOURCE.test(read(f)) || names.test(read(f)))) continue;
      reaching += 1;
      for (const f of reached) if (LISTING.test(read(f))) listing.add(f);
    }
    assert.ok(reaching > 40, `only ${reaching} tests reach mutated code`);
    // A test that runs a mutated classic script from its text, importing
    // nothing mutated, counts too (Codex, sign-off round).
    const viaText = closure('src/utils/shared/cleanElements.test.ts');
    assert.ok(![...viaText].some((f) => mutated.has(f)), 'cleanElements.test.ts imports no mutated file');
    assert.ok([...viaText].some((f) => RUNS_SOURCE.test(read(f)) || names.test(read(f))), 'and is still seen to run one');
    assert.ok(listing.has('src/utils/analyticsLabels.ts'), 'so the listing it reaches is reviewed');
    for (const line of ["runInNewContext(source, {})", "import vm from 'node:vm';", "new Function(text)()", "readFileSync(join(here, 'cleanElements.js'), 'utf8')"]) {
      assert.ok(RUNS_SOURCE.test(line) || names.test(line), line);
    }
    assert.deepEqual([...listing].sort(), Object.keys(LISTS).sort());
    for (const [file, lines] of Object.entries(LISTS)) {
      const text = read(file);
      // One line for each listing, and the only other mention is the import.
      assert.equal(text.split('readdirSync(').length - 1, lines.length, `${file}: a listing with no line here`);
      assert.equal(text.match(new RegExp(LISTING.source, 'g')).length, lines.length + 1, `${file}: another kind of listing`);
      for (const line of new Set(lines)) {
        assert.equal(text.split(line).length - 1, lines.filter((l) => l === line).length, `${file}: the line that keeps test files out has changed`);
      }
    }
  });
});

describe('Stryker itself retests what an edited test file covers', { timeout: 180_000 }, () => {
  // The claim the fingerprint rests on, on the installed Stryker and tap
  // runner: two tiny modules, each with its test file; after a first run,
  // one test file is edited to check what it only ran before. The second
  // run, on the first run's incremental file, must test that module's
  // survivors again (and kill them) and reuse the other module's results.
  it('kills the survivors the edit now checks, and reuses the untouched file’s results', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-fingerprint-'));
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      writeFileSync(join(dir, 'src/sum.mjs'), 'export function sum(a, b) { return a + b; }\n');
      writeFileSync(join(dir, 'src/big.mjs'), 'export function big(a) { return a > 10; }\n');
      const head = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n";
      writeFileSync(join(dir, 'src/sum.test.mjs'), `${head}import { sum } from './sum.mjs';\ntest('sum', () => { assert.equal(sum(2, 3), 5); });\n`);
      writeFileSync(join(dir, 'src/big.test.mjs'), `${head}import { big } from './big.mjs';\ntest('big', () => { big(1); assert.ok(true); });\n`);
      writeFileSync(join(dir, 'stryker.config.mjs'), `export default ${JSON.stringify({
        testRunner: 'tap', plugins: ['@stryker-mutator/tap-runner'],
        tap: { testFiles: ['src/*.test.mjs'], nodeArgs: ['--test-reporter=tap'], forceBail: true },
        coverageAnalysis: 'perTest', mutate: ['src/sum.mjs', 'src/big.mjs'], concurrency: 1,
        reporters: ['json'], jsonReporter: { fileName: 'reports/m.json' },
        incremental: true, incrementalFile: 'reports/inc.json', tempDirName: '.stryker-tmp', thresholds: { break: null },
      })};\n`);
      // Not a child of this test run: with NODE_TEST_CONTEXT set, the tests
      // Stryker starts would not report in TAP.
      const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
      const run = () => {
        const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/@stryker-mutator/core/bin/stryker.js'), 'run', 'stryker.config.mjs'], { cwd: dir, encoding: 'utf8', env });
        const report = JSON.parse(readFileSync(join(dir, 'reports/m.json'), 'utf8'));
        const status = (file) => report.files[file].mutants.map((m) => m.status);
        return { out, sum: status('src/sum.mjs'), big: status('src/big.mjs') };
      };
      const first = run();
      assert.ok(first.sum.length >= 2 && first.sum.every((s) => s === 'Killed'), `sum: ${first.sum}`);
      assert.ok(first.big.length >= 4 && first.big.every((s) => s === 'Survived'), `big: ${first.big}`);

      writeFileSync(join(dir, 'src/big.test.mjs'), `${head}import { big } from './big.mjs';\ntest('big', () => { assert.equal(big(10), false); assert.equal(big(11), true); });\n`);
      const second = run();
      assert.ok(second.big.every((s) => s === 'Killed'), `big after the edit: ${second.big}`);
      assert.ok(second.sum.every((s) => s === 'Killed'));
      const reused = /(\d+) of (\d+) mutant result\(s\) are reused/.exec(second.out);
      assert.ok(reused, second.out);
      assert.equal(Number(reused[1]), first.sum.length, 'only the untouched file’s results are reused');
      assert.equal(Number(reused[2]), first.sum.length + first.big.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
