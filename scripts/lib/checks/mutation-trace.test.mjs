// The check of the dependency analysis against what the tests really read
// (#891, #904): its rules, and the check itself on a small checkout where a
// test reads a file in a way the analysis does not see.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { isFingerprinted } from './mutation-fingerprint.mjs';
import { UNWRITTEN, covered, heldByEverything, inSharedFingerprint, kindOf, outside } from './mutation-trace.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('which traced paths the check compares', () => {
  it('leaves alone what is outside the project and the installed packages at its root', () => {
    for (const rel of ['..', '../other/file.ts', '../../etc/hosts', 'node_modules', 'node_modules/tsx/dist/loader.mjs']) assert.equal(outside(rel), true, rel);
    // The project folder itself is compared (when it was listed), and so is a separate project's own node_modules.
    for (const rel of ['', 'src/a.ts', 'public/a.svg', 'scripts/a.mjs', 'node_modules.ts', '..a', 'docs/a.md', 'remotion/node_modules/x']) assert.equal(outside(rel), false, rel);
  });

  it('tells a file from a folder from a name that is not there', () => {
    const found = (file, folder) => () => ({ isFile: () => file, isDirectory: () => folder });
    assert.equal(kindOf(found(true, false)), 'file');
    assert.equal(kindOf(found(false, true)), 'folder');
    assert.equal(kindOf(found(false, false)), 'none');
    assert.equal(kindOf(() => { throw new Error('ENOENT'); }), 'none');
  });

  it('is told of a listing by the hook, which marks the path', () => {
    const hook = readFileSync(join(ROOT, 'scripts/lib/checks/trace-deps-hook.mjs'), 'utf8');
    assert.ok(hook.includes("const LISTS = new Set(['readdirSync', 'readdir', 'opendirSync', 'opendir', 'globSync', 'glob']);"));
    assert.ok(hook.includes("appendFileSync(out, `${listed ? '>' : ''}${path}\\n`);"));
    assert.ok(readFileSync(join(ROOT, 'scripts/check-mutation-deps.mjs'), 'utf8').includes("if (outside(rel) || (rel === '' && !listed)) continue;"));
  });

  it('says so in the words the hook writes when a record cannot be written', () => {
    assert.ok(readFileSync(join(ROOT, 'scripts/lib/checks/trace-deps-hook.mjs'), 'utf8').includes(`process.stderr.write('${UNWRITTEN}\\n')`));
  });
});

describe('when the shared fingerprint holds a traced path', () => {
  const tracked = new Set(['package.json', 'test/dom.ts', 'public/a.svg', 'scripts/mutation-recheck.mjs']);
  const shared = (rel, kind) => inSharedFingerprint(rel, isFingerprinted, tracked, kind);

  it('a tracked file the rule names', () => {
    for (const rel of ['package.json', 'test/dom.ts', 'scripts/mutation-recheck.mjs']) assert.equal(shared(rel, 'file'), true, rel);
    assert.equal(shared('public/a.svg', 'file'), false);
  });

  it('not a file git does not track, wherever it is', () => {
    for (const rel of ['built.txt', 'test/made.json', 'scripts/lib/checks/made.mjs']) assert.equal(shared(rel, 'file'), false, rel);
  });

  it('a folder only when the rule names everything in it: `public` is not a root file', () => {
    for (const rel of ['test', 'test/deep', 'scripts/lib/checks']) assert.equal(shared(rel, 'folder'), true, rel);
    // A file added to any of these changes its listing and is in no shared fingerprint.
    for (const rel of ['public', 'emails', 'remotion', 'scripts', 'scripts/lib', 'src', 'src/components', '.github/workflows', 'docs', '']) assert.equal(shared(rel, 'folder'), false, rel);
  });

  it('a name that is not there only when the rule names whatever is made there, file or folder', () => {
    for (const rel of ['test/none.ts', 'scripts/lib/checks/none.mjs', 'src/package.json', 'src/components/chart/package.json', 'scripts/tsconfig.json']) assert.equal(shared(rel, 'none'), true, rel);
    // At the root a new file is in, a new folder's files are not: so the name is not vouched for.
    for (const rel of ['none.json', 'newfolder', 'public/none.svg', 'scripts/none.mjs', 'remotion/tsconfig.json']) assert.equal(shared(rel, 'none'), false, rel);
  });
});

describe('when a test with known reads holds a traced path', () => {
  const isFile = (rel) => ['src/a.ts', 'public/a.svg', 'public/b.svg'].includes(rel);

  it('a file, only by its contents', () => {
    assert.equal(covered('public/a.svg', new Set(['public/a.svg']), isFile), true);
    assert.equal(covered('public/a.svg', new Set(['?public/a.svg']), isFile), false, 'known to be there is not known by content');
    assert.equal(covered('public/a.svg', new Set(['>public/']), isFile), false, 'a listing of its folder is not its contents');
    assert.equal(covered('public/b.svg', new Set(['public/a.svg']), isFile), false);
  });

  it('a folder or a name that is not there, by whether it is there or by a listing', () => {
    assert.equal(covered('public/none.svg', new Set(['?public/none.svg']), isFile), true);
    assert.equal(covered('public', new Set(['>public/']), isFile), true);
    assert.equal(covered('public/icons/none.svg', new Set(['>public/']), isFile), true);
    assert.equal(covered('emails/none.j2', new Set(['>public/']), isFile), false);
    assert.equal(covered('public/none.svg', new Set(), isFile), false);
  });
});

describe('when a test that depends on everything holds a traced path', () => {
  const tracked = new Set(['src/a.ts', 'public/a.svg', 'scripts/render.mjs', 'docs/a.md', '.github/workflows/deploy.yml', 'README.md']);
  const held = (rel, kind) => heldByEverything(rel, tracked, kind);

  it('a tracked file a mutation run can read', () => {
    for (const rel of ['src/a.ts', 'public/a.svg', 'scripts/render.mjs']) assert.equal(held(rel, 'file'), true, rel);
  });

  it('a folder of them, the project folder included, and a name that is not there', () => {
    for (const rel of ['public', 'src/content/blog', 'scripts', 'remotion', '']) assert.equal(held(rel, 'folder'), true, rel);
    for (const rel of ['public/none.svg', 'remotion/none', 'newfolder']) assert.equal(held(rel, 'none'), true, rel);
  });

  it('not what no mutation run reads: a change there skips the suite, so nothing would be tested again', () => {
    for (const rel of ['docs/a.md', '.github/workflows/deploy.yml', 'README.md']) assert.equal(held(rel, 'file'), false, rel);
    for (const rel of ['docs', 'docs/plans', '.claude', '.claude/agents', '.github/workflows']) assert.equal(held(rel, 'folder'), false, rel);
    for (const rel of ['docs/none.md', '.claude/agents/none.md', 'CLAUDE.md', 'README.md']) assert.equal(held(rel, 'none'), false, rel);
  });

  it('not a file git does not track: its contents are in no hash', () => {
    for (const rel of ['dist/index.html', 'reports/m.json', 'built.txt']) assert.equal(held(rel, 'file'), false, rel);
  });
});

// The check itself, on a checkout of a few files. `process.getBuiltinModule`
// hands out the file system without an import the analysis sees, so a read
// through it is in no fingerprint: only the trace finds it.
describe('the check on a small checkout', { timeout: 120_000 }, () => {
  const head = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n";
  const hidden = (path) => `const read = process.getBuiltinModule('node:fs').readFileSync;\ntest('t', () => { assert.ok(read(${JSON.stringify(path)}, 'utf8').length > 0); });\n`;
  const { NODE_TEST_CONTEXT: _, NODE_OPTIONS: __, ...env } = process.env;
  const check = (files, args = []) => {
    const dir = mkdtempSync(join(tmpdir(), 'nidhi-trace-'));
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      const all = { 'package.json': '{"type":"module"}', 'public/a.txt': 'a', 'docs/a.md': 'doc', 'test/helper.txt': 'helper', 'scripts/render.mjs': 'export const x = 1;\n', ...files };
      for (const [path, text] of Object.entries(all)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), text);
      }
      execFileSync('git', ['init', '-q'], { cwd: dir });
      execFileSync('git', ['add', '-A', '--', ...Object.keys(all)], { cwd: dir });
      const done = spawnSync(process.execPath, [join(ROOT, 'scripts/check-mutation-deps.mjs'), ...args], { cwd: dir, encoding: 'utf8', env });
      return { status: done.status, out: done.stdout + done.stderr };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('passes when every read is in the test\'s fingerprint, outside src/ too', () => {
    const { status, out } = check({ 'src/a.test.ts': `${head}import { readFileSync } from 'node:fs';\ntest('t', () => { assert.equal(readFileSync('public/a.txt', 'utf8'), 'a'); });\n` });
    assert.match(out, /1 test file\(s\) traced, 0 of them depending on everything, 0 file\(s\) missed, 0 test file\(s\) failed\./);
    assert.equal(status, 0, out);
  });

  it('fails on a read outside src/ that the analysis left out', () => {
    for (const path of ['public/a.txt', 'scripts/render.mjs']) {
      const { status, out } = check({ 'src/a.test.ts': `${head}${hidden(path)}` });
      assert.equal(status, 1, out);
      assert.ok(out.includes(`src/a.test.ts reaches, but its fingerprint leaves out:\n  ${path}\n`), out);
      assert.match(out, /1 file\(s\) missed/);
    }
  });

  // The case the council's review found (Codex): a test that lists a folder
  // and decides by what is in it. `public` has no slash in it, and is still
  // not a root file: a file added to it changes the listing and no shared
  // fingerprint, so the listing must be in the test's own.
  it('fails on a listing the analysis left out, of a folder or of the project folder itself', () => {
    const lists = (path) => `const list = process.getBuiltinModule('node:fs').readdirSync;\ntest('t', () => { assert.ok(!list(${JSON.stringify(path)}).includes('disable.txt')); });\n`;
    for (const [path, shown] of [['public', 'public'], ['scripts', 'scripts'], ['.', '. (the project folder, listed)']]) {
      const { status, out } = check({ 'src/a.test.ts': `${head}${lists(path)}` });
      assert.equal(status, 1, out);
      assert.ok(out.includes(`src/a.test.ts reaches, but its fingerprint leaves out:\n  ${shown}\n`), out);
    }
    // A listing of the machinery's own folder is held by the shared fingerprint: everything in it is.
    assert.equal(check({ 'src/a.test.ts': `${head}${lists('test')}` }).status, 0);
    // And a listing the analysis does see is in the test's fingerprint.
    const seen = check({ 'src/a.test.ts': `${head}import { readdirSync } from 'node:fs';\ntest('t', () => { assert.ok(!readdirSync('public').includes('disable.txt')); });\n` });
    assert.equal(seen.status, 0, seen.out);
  });

  it('fails on a name looked for at the root that is not there, when the analysis left the look out', () => {
    const looks = (path) => `const there = process.getBuiltinModule('node:fs').existsSync;\ntest('t', () => { assert.equal(there(${JSON.stringify(path)}), false); });\n`;
    const { status, out } = check({ 'src/a.test.ts': `${head}${looks('newfolder')}` });
    assert.equal(status, 1, out);
    assert.ok(out.includes('  newfolder\n'), out);
    assert.equal(check({ 'src/a.test.ts': `${head}${looks('test/none.txt')}` }).status, 0, 'made later, it is in the shared fingerprint whatever it is');
  });

  it('fails on such a read under src/, as before', () => {
    const { status, out } = check({ 'src/data.json': '{}', 'src/a.test.ts': `${head}${hidden('src/data.json')}` });
    assert.equal(status, 1, out);
    assert.ok(out.includes('  src/data.json\n'), out);
  });

  it('passes a hidden read of the machinery: a change there starts every shard afresh', () => {
    const { status, out } = check({ 'src/a.test.ts': `${head}${hidden('test/helper.txt')}` });
    assert.equal(status, 0, out);
  });

  // A test that starts a process depends on everything: every tracked file a mutation run can read.
  const wide = "import { execFileSync } from 'node:child_process';\n";

  it('runs a test that depends on everything, and passes its read of any file a mutation run can read', () => {
    const { status, out } = check({ 'src/a.test.ts': `${head}${wide}${hidden('public/a.txt')}` });
    assert.match(out, /1 test file\(s\) traced, 1 of them depending on everything, 0 file\(s\) missed/);
    assert.equal(status, 0, out);
    // A listing too, of a folder of inputs or of the project folder itself.
    for (const path of ['public', '.']) {
      const listing = check({ 'src/a.test.ts': `${head}${wide}const list = process.getBuiltinModule('node:fs').readdirSync;\ntest('t', () => { assert.ok(list(${JSON.stringify(path)}).length > 0); });\n` });
      assert.equal(listing.status, 0, listing.out);
    }
    const docs = check({ 'src/a.test.ts': `${head}${wide}const list = process.getBuiltinModule('node:fs').readdirSync;\ntest('t', () => { assert.ok(list('docs').length > 0); });\n` });
    assert.equal(docs.status, 1, docs.out);
    assert.ok(docs.out.includes('  docs\n'), docs.out);
  });

  it('fails when such a test reads what no mutation run is meant to read, or a file git does not track', () => {
    const docs = check({ 'src/a.test.ts': `${head}${wide}${hidden('docs/a.md')}` });
    assert.equal(docs.status, 1, docs.out);
    assert.ok(docs.out.includes('  docs/a.md\n'), docs.out);
    const untracked = check({ 'src/a.test.ts': `${head}${wide}import { writeFileSync } from 'node:fs';\nwriteFileSync('built.txt', 'built');\n${hidden('built.txt')}` });
    assert.equal(untracked.status, 1, untracked.out);
    assert.ok(untracked.out.includes('  built.txt\n'), untracked.out);
    // The same for a test with known reads, at the root or under a folder of the machinery.
    for (const path of ['built.txt', 'test/built.txt']) {
      const narrow = check({ 'src/a.test.ts': `${head}import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(path)}, 'built');\n${hidden(path)}` });
      assert.equal(narrow.status, 1, narrow.out);
      assert.ok(narrow.out.includes(`  ${path}\n`), narrow.out);
    }
  });

  it('fails when a test fails under the trace, since what it reaches is then not known', () => {
    const { status, out } = check({ 'src/a.test.ts': `${head}test('t', () => { assert.equal(1, 2); });\n` });
    assert.equal(status, 1, out);
    assert.match(out, /the test failed under the trace/);
  });
});
