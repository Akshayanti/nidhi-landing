import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { isInput, WORKFLOWS } from './check-inputs.mjs';
import { createGraph, readablePaths } from './mutation-deps.mjs';
import { MACHINERY_FOLDERS, MACHINERY_SCRIPTS, SCHEMA, SEPARATE_PROJECTS, SOURCE_READERS, fingerprint, isFingerprinted, isSelectedTest, trackedPaths } from './mutation-fingerprint.mjs';

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
    // The suites' jobs (the shards' steps among them) and the workflow that
    // runs them on a pull request: inputs of every suite (check-inputs.mjs).
    '.github/workflows/tool-suite.yml': 'suites', '.github/workflows/pr-checks.yml': 'pr checks',
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

  it('stays the same for code and data under src/, which each test file fingerprints for itself (#891)', () => {
    for (const path of ['src/utils/loan/math.ts', 'src/components/LoanCompare.tsx', 'src/data/inflation/worldbank.json']) {
      assert.equal(of({ ...FILES, [path]: `${FILES[path]} changed` }), BASE, path);
      const { [path]: gone, ...rest } = FILES;
      assert.equal(of(rest), BASE, `${path} deleted`);
    }
    assert.equal(of({ ...FILES, 'src/new.ts': 'new', 'src/utils/shared/new.json': '{}' }), BASE);
  });

  it('changes with a package.json or tsconfig under src/: Node and tsx look for them while they load any module', () => {
    for (const path of ['src/package.json', 'src/components/chart/package.json', 'src/tsconfig.json', 'src/utils/tsconfig.test.json']) {
      assert.equal(isFingerprinted(path), true, path);
      assert.notEqual(of({ ...FILES, [path]: '{"type":"commonjs"}' }), BASE, path);
    }
    for (const path of ['src/data/package.json.ts', 'src/apackage.json', 'src/i18n/strings/tsconfigs.ts']) assert.equal(isFingerprinted(path), false, path);
  });

  it('changes with the machinery: helpers, settings, the dependencies, the workflow, a new or a moved file', () => {
    for (const path of Object.keys(FILES).filter(isFingerprinted)) {
      assert.notEqual(of({ ...FILES, [path]: `${FILES[path]} changed` }), BASE, path);
      const { [path]: gone, ...rest } = FILES;
      assert.notEqual(of(rest), BASE, `${path} deleted`);
      assert.notEqual(of({ ...rest, [`${path}.moved`]: gone }), BASE, `${path} moved`);
    }
    assert.deepEqual(Object.keys(FILES).filter(isFingerprinted).sort(), [
      '.github/workflows/pr-checks.yml', '.github/workflows/tool-mutation.yml', '.github/workflows/tool-suite.yml', '.nvmrc', 'package-lock.json', 'scripts/lib/checks/mutation-shards.mjs',
      'stryker.config.mjs', 'test/dom.ts', 'tsconfig.json',
    ]);
    for (const path of ['package.json', '.npmrc', 'a-new-file.txt', 'astro.config.mjs', 'stryker.shards.json', 'test/new.ts', 'test/deep/new.mjs',
      'scripts/lib/checks/new.mjs', 'scripts/lib/checks/stryker-run-plan.mjs', 'scripts/mutation-recheck.mjs', 'scripts/mutation-new.mjs', 'scripts/check-mutation-deps.mjs']) {
      assert.equal(isFingerprinted(path), true, path);
      assert.notEqual(of({ ...FILES, [path]: 'new' }), BASE, path);
    }
  });

  it('stays the same for what is outside src/ and is not the machinery: a test that reads it fingerprints it for itself (#904)', () => {
    for (const path of ['public/new.svg', 'public/third-party-notices.txt', 'emails/post.html.j2', 'scripts/new.mjs', 'scripts/audit-text-size.mjs', 'scripts/render-kit.mjs',
      'scripts/lib/media/reel.mjs', 'scripts/lib/publishing/inflation-monthly.mjs', 'scripts/lib/new/a.mjs', 'scripts/mutation-recheck.test.txt/a', 'scripts/deep/mutation-a.mjs',
      'remotion/src/Reel.tsx', 'remotion/package.json', 'remotion/package-lock.json', 'remotion/tsconfig.json', 'tools/astro-check/package.json', 'tools/astro-check/index.mjs']) {
      assert.equal(isFingerprinted(path), false, path);
      assert.equal(of({ ...FILES, [path]: 'new' }), BASE, path);
    }
  });

  it('changes with a package.json or tsconfig in any folder a test may load code from, outside src/ too', () => {
    for (const path of ['scripts/package.json', 'scripts/lib/publishing/package.json', 'public/tsconfig.json', 'emails/package.json', 'test/package.json']) {
      assert.equal(isFingerprinted(path), true, path);
      assert.notEqual(of({ ...FILES, [path]: '{"type":"commonjs"}' }), BASE, path);
    }
    // Under such a name too, were one ever a folder.
    assert.equal(isFingerprinted('src/package.json/a'), true);
    assert.equal(isFingerprinted('remotion/package.json/a'), false);
    // And never for what no mutation run reads, whatever its name.
    for (const path of ['docs/package.json', '.claude/tsconfig.json', '.github/workflows/deploy.yml', '.github/package.json']) assert.equal(isFingerprinted(path), false, path);
  });

  it('does not take content for a name, or two files for one', () => {
    assert.notEqual(of({ 'a': 'b\0c', 'test/x.ts': '' }), of({ 'a\0b': 'c', 'test/x.ts': '' }));
    assert.notEqual(of({ 'ab': 'c' }), of({ 'a': 'bc' }));
  });

  it('refuses to answer without files, or with one it cannot read', () => {
    assert.throws(() => fingerprint([], () => ''), /nothing to fingerprint/);
    assert.throws(() => fingerprint(['docs/a.md', 'src/a.test.ts'], () => ''), /nothing to fingerprint/);
    assert.throws(() => fingerprint(['test/a.ts'], () => { throw new Error('ENOENT'); }), /ENOENT/);
    assert.throws(() => fingerprint(['src/a.ts', 'src/b.json'], () => ''), /nothing to fingerprint/);
  });

  it('reads git’s list whole, names with spaces included', () => {
    assert.deepEqual(trackedPaths('src/a b.ts\0docs/c\nd.md\0'), ['src/a b.ts', 'docs/c\nd.md']);
    assert.deepEqual(trackedPaths(''), []);
  });

  it('has a schema number, part of every fingerprint', () => {
    assert.equal(SCHEMA, 5);
    assert.match(read('scripts/lib/checks/mutation-fingerprint.mjs'), /update\(`schema \$\{SCHEMA\}\\0`\)/);
  });
});

// The rule on the real tree (#904): what is kept is the machinery, nothing
// the machinery needs is left out, and what is left out is held elsewhere.
describe('the shared fingerprint on this repository', () => {
  const tracked = trackedPaths(execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).filter((p) => existsSync(join(ROOT, p)));
  const kept = tracked.filter(isFingerprinted);
  // The memory guard every test process loads first. Written in two parts: another test
  // (mutation-memory-guard.test.mjs) lists the files that name it as a module to load.
  const GUARD = `test/mutationMemoryGuard${'.mjs'}`;

  it('holds the root files, test/, the checks, the mutation scripts and the three workflows, and nothing else', () => {
    const where = (p) => {
      if (!p.includes('/')) return 'root';
      if (p.startsWith('.github/workflows/')) return 'workflows';
      return MACHINERY_FOLDERS.find((folder) => p.startsWith(folder)) ?? (MACHINERY_SCRIPTS.test(p) ? 'scripts' : p);
    };
    const groups = Object.groupBy(kept, where);
    assert.deepEqual(Object.keys(groups).sort(), ['root', 'scripts', 'scripts/lib/checks/', 'test/', 'workflows']);
    assert.deepEqual(groups.workflows.sort(), ['.github/workflows/pr-checks.yml', '.github/workflows/tool-mutation.yml', '.github/workflows/tool-suite.yml']);
    for (const path of ['package.json', 'package-lock.json', '.npmrc', '.nvmrc', 'tsconfig.json', 'astro.config.mjs', 'stryker.config.mjs', 'stryker.shards.json', 'stryker.shard-weights.json', 'stryker.floors.json']) {
      assert.ok(groups.root.includes(path), path);
    }
    for (const path of ['scripts/mutation-stale-results.mjs', 'scripts/mutation-recheck.mjs', 'scripts/mutation-floors.mjs', 'scripts/mutation-shard-report.mjs', 'scripts/check-mutation-deps.mjs']) {
      assert.ok(groups.scripts.includes(path), path);
    }
    for (const path of [GUARD, 'scripts/lib/checks/stryker-ordered-tap.mjs', 'scripts/lib/checks/stryker-run-plan.mjs', 'scripts/lib/checks/mutation-deps.mjs', 'scripts/lib/checks/trace-deps-hook.mjs']) {
      assert.ok(kept.includes(path), path);
    }
    assert.ok(kept.length < 120, `${kept.length} files: far fewer than the 284 of everything outside src/`);
    for (const folder of ['public/', 'emails/', 'remotion/', 'tools/', 'scripts/lib/media/', 'scripts/lib/publishing/', 'src/']) {
      assert.deepEqual(kept.filter((p) => p.startsWith(folder)), [], folder);
      assert.ok(tracked.some((p) => p.startsWith(folder)), `${folder} is still there`);
    }
  });

  // What a mutation run executes besides the tests: Stryker's configuration
  // and what it names, and the scripts the shard runs around Stryker. Every
  // repository file they import, however far down, must be kept: a change to
  // one left out would change a run and start no shard afresh.
  it('holds every file the machinery imports, all the way down', () => {
    const config = read('stryker.config.mjs');
    const named = [...config.matchAll(/'(\.\/(?:scripts|test)\/[^']+\.m?[jt]s)'/g)].map((m) => m[1].slice(2));
    assert.ok(named.includes(GUARD) && named.includes('scripts/lib/checks/stryker-ordered-tap.mjs') && named.includes('scripts/lib/checks/stryker-run-plan.mjs'), named.join(', '));
    const roots = ['stryker.config.mjs', ...named, ...tracked.filter((p) => MACHINERY_SCRIPTS.test(p))];
    const resolve = (from, spec) => {
      const base = join(dirname(from), spec);
      return [base, `${base}.mjs`, `${base}.js`, `${base}.ts`, join(base, 'index.mjs')].find((c) => existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile()) ?? `${base} (not found)`;
    };
    const imports = (file) => [...read(file).matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => resolve(file, m[1]));
    const seen = new Set();
    const walk = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      if (/\.(mjs|js|ts)$/.test(file) && existsSync(join(ROOT, file))) for (const next of imports(file)) walk(next);
    };
    for (const root of roots) walk(root);
    assert.ok(seen.size > roots.length, 'the walk follows imports');
    assert.ok(seen.has('scripts/lib/checks/mutation-deps.mjs') && seen.has('scripts/lib/checks/check-inputs.mjs') && seen.has('scripts/lib/checks/mutation-shards.mjs'));
    assert.deepEqual([...seen].filter((p) => !isFingerprinted(p)).sort(), []);
    // The same walk does find a file that is left out, when one is imported.
    assert.equal(isFingerprinted(resolve('scripts/mutation-recheck.mjs', './lib/publishing/inflation-monthly.mjs')), false);
  });

  // A package.json or tsconfig counts as data only in a project no test
  // loads code from. Imports are followed for every test, the ones that
  // depend on everything included.
  it('no test loads code from a separate project, so their package files are data', () => {
    assert.deepEqual(SEPARATE_PROJECTS, ['remotion/', 'tools/']);
    for (const folder of SEPARATE_PROJECTS) assert.ok(tracked.some((p) => p.startsWith(folder) && /(^|\/)package\.json$/.test(p)), `${folder} has a package of its own`);
    const graph = createGraph({ root: ROOT, tracked });
    const CODE = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/;
    const loaded = [];
    const tests = tracked.filter(isSelectedTest);
    assert.ok(tests.length > 200);
    for (const test of tests) {
      for (const file of graph.dependencies(test).files) {
        if (CODE.test(file) && SEPARATE_PROJECTS.some((folder) => file.replace(/^[?>]/, '').startsWith(folder))) loaded.push(`${test} reaches ${file}`);
      }
    }
    assert.deepEqual(loaded, []);
    // The one read of a separate project's file: as data, by name, so it is in that test's own fingerprint.
    assert.ok(graph.dependencies('src/utils/dependencies.test.ts').files.includes('remotion/package.json'));
    assert.deepEqual(graph.dependencies('src/utils/dependencies.test.ts').all, []);
  });

  it('leaves out no file a mutation run can read without the tests that depend on everything hashing it', () => {
    const readable = new Set(readablePaths(tracked));
    for (const path of tracked) {
      if (isFingerprinted(path)) assert.ok(isInput(path, WORKFLOWS[0]), `${path}: kept, so it is an input`);
      else if (isInput(path, WORKFLOWS[0])) assert.ok(readable.has(path), `${path}: left out, so it is in the hash of everything`);
    }
    assert.ok(kept.every((p) => readable.has(p)));
    assert.ok(tracked.filter((p) => !isFingerprinted(p) && readable.has(p) && !p.startsWith('src/')).length > 150, 'the files that left the shared fingerprint');
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
  // (In #904 the assertions that walk the source moved to files of their own:
  // catalog.used.test.ts and jsonForScript.pages.test.ts are listed under those names.)
  const LISTS = {
    'src/i18n/strings/catalog.used.test.ts': ["/\\.(astro|tsx|ts|js|mjs)$/.test(name) && !/\\.test\\./.test(name) ? readFileSync(path, 'utf8') : ''"],
    'src/utils/shared/jsonForScript.pages.test.ts': ["else if (name.endsWith('.astro')) files.push(path);"],
    'src/utils/analyticsLabels.ts': ["else if (match.test(name) && !/\\.test\\./.test(name) && !SKIP.test(path)) out.push(path);"],
    'src/utils/shared/toolPrivacy.test.ts': ["else if (name.endsWith('.astro')) out.push(path);"],
    'src/utils/privacySurface.ts': ["if (!CODE.test(name) || /\\.test\\./.test(name) || WORDS.test(path) || SELF.test(path)) continue;"],
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
    // Since #904 it no longer reaches the label registry's walk of the source: that
    // check has a file of its own (cleanElements.registry.test.ts), which runs no mutated code.
    assert.ok(!viaText.has('src/utils/analyticsLabels.ts'));
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
