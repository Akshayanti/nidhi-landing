// The check of the dependency analysis against what the tests really read
// (#891, #904): its rules, and the check itself on a small checkout where a
// test reads a file in a way the analysis does not see.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { UNWRITTEN, covered, heldByEverything, inSharedFingerprint, outside } from './mutation-trace.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('which traced paths the check compares', () => {
  it('leaves alone the project folder itself, what is outside it and the installed packages', () => {
    for (const rel of ['', '..', '../other/file.ts', '../../etc/hosts', 'node_modules', 'node_modules/tsx/dist/loader.mjs']) assert.equal(outside(rel), true, rel);
    for (const rel of ['src/a.ts', 'public/a.svg', 'scripts/a.mjs', 'node_modules.ts', '..a', 'docs/a.md', 'remotion/node_modules/x']) assert.equal(outside(rel), false, rel);
  });

  it('says so in the words the hook writes when a record cannot be written', () => {
    assert.ok(readFileSync(join(ROOT, 'scripts/lib/checks/trace-deps-hook.mjs'), 'utf8').includes(`process.stderr.write('${UNWRITTEN}\\n')`));
  });
});

describe('when the shared fingerprint holds a traced path', () => {
  const named = (rel) => !rel.includes('/') || rel.startsWith('test/');
  const tracked = new Set(['package.json', 'test/dom.ts', 'public/a.svg']);
  const isFile = (rel) => tracked.has(rel) || rel === 'built.txt' || rel === 'test/made.json';

  it('a tracked file the rule names, and a name that is not there yet', () => {
    for (const rel of ['package.json', 'test/dom.ts', 'test/none.ts', 'none.json', 'test']) assert.equal(inSharedFingerprint(rel, named, tracked, isFile), true, rel);
  });

  it('not a file the rule does not name, and not one git does not track, wherever it is', () => {
    for (const rel of ['public/a.svg', 'public/none.svg', 'built.txt', 'test/made.json']) assert.equal(inSharedFingerprint(rel, named, tracked, isFile), false, rel);
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
  const isFile = (rel) => tracked.has(rel) || rel === 'dist/index.html' || rel === 'reports/m.json';

  it('a tracked file a mutation run can read, a folder of them, and a name that is not there', () => {
    for (const rel of ['src/a.ts', 'public/a.svg', 'scripts/render.mjs', 'public', 'src/content/blog', 'public/none.svg', 'remotion/none']) {
      assert.equal(heldByEverything(rel, tracked, isFile), true, rel);
    }
  });

  it('not what no mutation run reads: a change there skips the suite, so nothing would be tested again', () => {
    for (const rel of ['docs/a.md', 'docs', 'docs/none.md', '.claude/agents/a.md', '.github/workflows/deploy.yml', 'README.md', 'CLAUDE.md']) {
      assert.equal(heldByEverything(rel, tracked, isFile), false, rel);
    }
  });

  it('not a file git does not track: its contents are in no hash', () => {
    assert.equal(heldByEverything('dist/index.html', tracked, isFile), false);
    assert.equal(heldByEverything('reports/m.json', tracked, isFile), false);
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
