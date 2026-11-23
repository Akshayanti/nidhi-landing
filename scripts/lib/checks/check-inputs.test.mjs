import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { NEVER_READ, WORKFLOWS, changedPaths, isInput, needsRun } from './check-inputs.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const [MUTATION, TEXT_SIZE, PRIVACY] = WORKFLOWS;

describe('a pull request needs a free tools workflow unless it changes only what none of them reads', () => {
  it('knows the three workflows, and each is a file', () => {
    assert.deepEqual(WORKFLOWS, ['.github/workflows/tool-mutation.yml', '.github/workflows/tool-text-size.yml', '.github/workflows/tool-privacy.yml']);
    for (const own of WORKFLOWS) assert.ok(existsSync(join(ROOT, own)), own);
  });

  for (const own of WORKFLOWS) {
    it(`${own}: skips one that changes only docs, agent files, other workflows or the two root notes`, () => {
      assert.equal(needsRun(['docs/plans/PLAYBOOK.md'], own), false);
      assert.equal(needsRun(['docs/i18n/hi-glossary.md', '.claude/agents/x.md', 'README.md', 'CLAUDE.md'], own), false);
      assert.equal(needsRun(['.github/workflows/deploy.yml', '.github/dependabot.yml'], own), false);
    });

    it(`${own}: runs for anything else, including what is read outside src/ and test/`, () => {
      for (const path of [
        'src/utils/loan/math.ts', 'src/components/MonteCarloSimulator.tsx', 'src/content/blog/14-budgeting.md', 'test/dom.ts',
        'src/styles/global.css', 'src/components/Analytics.astro', 'src/i18n/strings/hi.ts',
        'package.json', 'package-lock.json', '.npmrc', '.nvmrc', 'tsconfig.json', 'astro.config.mjs',
        'stryker.config.mjs', 'stryker.floors.json', 'scripts/some-script.mjs', 'scripts/lib/checks/some-check.mjs',
        'scripts/lib/checks/check-inputs.mjs', 'public/third-party-notices.txt', 'emails/post.html.j2',
        'remotion/package.json', 'LICENSE', 'a-new-file.txt', own,
      ]) {
        assert.equal(isInput(path, own), true, path);
        assert.equal(needsRun(['docs/x.md', path], own), true, path);
      }
    });

    it(`${own}: runs when it cannot tell what changed`, () => {
      assert.equal(needsRun([], own), true);
      assert.equal(needsRun([''], own), true);
      assert.equal(needsRun(undefined, own), true);
    });
  }

  it('a change to one workflow runs that workflow and not the other two', () => {
    for (const changed of WORKFLOWS) {
      for (const own of WORKFLOWS) assert.equal(needsRun([changed], own), changed === own, `${changed} for ${own}`);
    }
  });

  it('runs a workflow it does not know, whatever changed', () => {
    for (const own of [undefined, '', 'tool-privacy.yml', '.github/workflows/deploy.yml', '.github/workflows/tool-privacy.yml ']) {
      assert.equal(needsRun(['docs/plans/PLAYBOOK.md'], own), true, String(own));
    }
  });

  it('does not take a lookalike for a skipped place', () => {
    for (const path of ['src/docs/notes.md', 'docs.md', 'README.md.bak', 'scripts/README.md', 'docs', '.githubx/a.yml', 'src/CLAUDE.md']) {
      assert.equal(isInput(path, PRIVACY), true, path);
    }
  });

  it('reads both ends of a move, and names with spaces or newlines, from NUL-separated output', () => {
    // git diff --name-only --no-renames -z lists a moved file as its old and its new path.
    const moved = 'src/utils/loan/math.test.ts\0docs/old/math.test.ts\0';
    assert.deepEqual(changedPaths(moved), ['src/utils/loan/math.test.ts', 'docs/old/math.test.ts']);
    for (const own of WORKFLOWS) assert.equal(needsRun(changedPaths(moved), own), true);
    assert.deepEqual(changedPaths('docs/a b.md\0docs/c\nd.md\0'), ['docs/a b.md', 'docs/c\nd.md']);
    assert.equal(needsRun(changedPaths('docs/a b.md\0docs/c\nd.md\0'), TEXT_SIZE), false);
    assert.equal(needsRun(changedPaths(''), MUTATION), true);
  });
});

describe('nothing the three workflows start reads what they skip', () => {
  // What they start: the mutation run, every test in src/ (test/ holds their
  // helpers); the other two, the build (the two prebuild scripts, Astro on
  // astro.config.mjs and src/, then the postbuild script) and one audit
  // script each. The scripts are
  // followed through their relative imports. A path to a skipped place in
  // code, not in a comment or a message, would let a skipped pull request
  // change a result. This is a tripwire for a literal path, not a proof: a
  // path built from a variable is not seen.
  const ENTRY = [
    'astro.config.mjs', 'scripts/lint-figures.mjs', 'scripts/lint-scoped-styles.mjs', 'scripts/render-email-figures.mjs',
    'scripts/audit-text-size.mjs', 'scripts/verify-tool-privacy.mjs',
  ];
  const files = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js|astro)$/.test(name)) files.add(full);
    }
  };
  walk(join(ROOT, 'src'));
  walk(join(ROOT, 'test'));
  const follow = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const next = join(dirname(file), spec);
      if (existsSync(next) && statSync(next).isFile()) follow(next);
    }
  };
  for (const entry of ENTRY) follow(join(ROOT, entry));

  const segments = NEVER_READ.map((p) => p.replace(/\/$/, ''));
  const quoted = segments.map((s) => s.replace(/\./g, '\\.')).join('|');
  const call = new RegExp(`(join|resolve|readFileSync|readdirSync|globSync|new URL)\\([^)]*['"\`](\\.\\.\\/)*(${quoted})(['"\`/])`);

  it('the build is still those scripts and Astro, and each audit one script', () => {
    const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
    assert.equal(scripts.prebuild, 'node scripts/lint-figures.mjs && node scripts/lint-scoped-styles.mjs');
    assert.equal(scripts.build, 'astro build');
    assert.equal(scripts.postbuild, 'node scripts/render-email-figures.mjs');
    const run = (workflow) => [...readFileSync(join(ROOT, workflow), 'utf8').matchAll(/node (scripts\/[\w./-]+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(run(TEXT_SIZE))], ['scripts/audit-text-size.mjs']);
    assert.deepEqual([...new Set(run(PRIVACY))], ['scripts/verify-tool-privacy.mjs']);
  });

  it('follows the scripts into what they import', () => {
    const seen = [...files].map((f) => relative(ROOT, f));
    for (const entry of ENTRY) assert.ok(seen.includes(entry), entry);
    assert.ok(seen.includes('scripts/lib/checks/lint-figures.mjs'), 'an import of a prebuild script');
    assert.ok(seen.some((f) => f.endsWith('.astro')), 'the pages');
  });

  it('catches a literal read of each skipped place', () => {
    for (const line of [
      "join(ROOT, 'docs', 'plans')", "readFileSync('docs/plans/PLAYBOOK.md', 'utf8')", "resolve('../../.claude/agents')",
      'readdirSync(`.github/workflows`)', 'new URL("../CLAUDE.md", import.meta.url)', "readFileSync(join(root, 'README.md'))",
    ]) assert.match(line, call, line);
    for (const line of ["join(ROOT, 'src', 'docs.ts')", "// see docs/color-palette.md", "readFileSync('scripts/README.md.bak')"]) assert.doesNotMatch(line, call, line);
  });

  it('names none of them as a path segment in a join, a resolve, a URL or a read', () => {
    const found = [...files].filter((f) => call.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    assert.deepEqual(found, [], 'a file the free tools workflows start reads a place they skip: take it out of NEVER_READ');
  });
});
