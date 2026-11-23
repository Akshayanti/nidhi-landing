import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { NEVER_READ, changedPaths, isMutationInput, needsMutationRun } from './mutation-inputs.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('a pull request needs the mutation run unless it changes only what no run reads', () => {
  it('skips one that changes only docs, agent files, other workflows or the two root notes', () => {
    assert.equal(needsMutationRun(['docs/plans/PLAYBOOK.md']), false);
    assert.equal(needsMutationRun(['docs/i18n/hi-glossary.md', '.claude/agents/x.md', 'README.md', 'CLAUDE.md']), false);
    assert.equal(needsMutationRun(['.github/workflows/deploy.yml']), false);
  });

  it('runs for anything else, including what the tests read outside src/ and test/', () => {
    for (const path of [
      'src/utils/loan/math.ts', 'src/components/MonteCarloSimulator.tsx', 'src/content/blog/14-budgeting.md', 'test/dom.ts',
      'package.json', 'package-lock.json', '.npmrc', '.nvmrc', 'tsconfig.json', 'astro.config.mjs',
      'stryker.config.mjs', 'stryker.floors.json', 'scripts/some-script.mjs', 'scripts/lib/checks/some-check.mjs',
      'public/third-party-notices.txt', 'emails/post.html.j2', 'remotion/package.json', 'LICENSE',
      '.github/workflows/tool-mutation.yml', 'a-new-file.txt',
    ]) {
      assert.equal(isMutationInput(path), true, path);
      assert.equal(needsMutationRun(['docs/x.md', path]), true, path);
    }
  });

  it('runs when it cannot tell what changed', () => {
    assert.equal(needsMutationRun([]), true);
    assert.equal(needsMutationRun(['']), true);
    assert.equal(needsMutationRun(undefined), true);
  });

  it('does not take a lookalike for a skipped place', () => {
    assert.equal(isMutationInput('src/docs/notes.md'), true);
    assert.equal(isMutationInput('docs.md'), true);
    assert.equal(isMutationInput('README.md.bak'), true);
    assert.equal(isMutationInput('scripts/README.md'), true);
  });

  it('reads both ends of a move, and names with spaces or newlines, from NUL-separated output', () => {
    // git diff --name-only --no-renames -z lists a moved file as its old and its new path.
    const moved = 'src/utils/loan/math.test.ts\0docs/old/math.test.ts\0';
    assert.deepEqual(changedPaths(moved), ['src/utils/loan/math.test.ts', 'docs/old/math.test.ts']);
    assert.equal(needsMutationRun(changedPaths(moved)), true);
    assert.deepEqual(changedPaths('docs/a b.md\0docs/c\nd.md\0'), ['docs/a b.md', 'docs/c\nd.md']);
    assert.equal(needsMutationRun(changedPaths('')), true);
  });
});

describe('no test a mutation run starts reads what the gate skips', () => {
  // Every test file in src/ and test/ (the run starts src/**/*.test.ts(x);
  // test/ holds their helpers). A path to a skipped place in code, not in a
  // comment or a message, would make a skipped pull request able to break
  // the run.
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(name)) files.push(full);
    }
  };
  walk(join(ROOT, 'src'));
  walk(join(ROOT, 'test'));

  it('names none of them as a path segment in a join, a resolve, a URL or a read', () => {
    const segments = NEVER_READ.map((p) => p.replace(/\/$/, ''));
    const quoted = segments.map((s) => s.replace(/\./g, '\\.')).join('|');
    const call = new RegExp(`(join|resolve|readFileSync|readdirSync|globSync|new URL)\\([^)]*['"\`](\\.\\.\\/)*(${quoted})(['"\`/])`);
    const found = files.filter((f) => call.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
    assert.deepEqual(found, [], 'a test reads a place the mutation gate skips: take it out of NEVER_READ');
  });
});
