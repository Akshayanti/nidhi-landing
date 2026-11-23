import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMutationInput, needsMutationRun } from './mutation-inputs.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('a pull request needs the mutation run only when it can change a score', () => {
  it('skips one that changes only docs, lessons, other scripts or other workflows', () => {
    assert.equal(needsMutationRun(['docs/plans/PLAYBOOK.md']), false);
    assert.equal(needsMutationRun(['README.md', 'docs/i18n/hi-glossary.md']), false);
    assert.equal(needsMutationRun(['src/content/blog/14-budgeting.md']), false);
    assert.equal(needsMutationRun(['scripts/some-renderer.mjs', 'scripts/lib/media/some-parser.mjs']), false);
    assert.equal(needsMutationRun(['.github/workflows/deploy.yml', 'CLAUDE.md']), false);
  });

  it('runs for code, tests, dependencies and the run’s own settings', () => {
    for (const path of [
      'src/utils/loan/math.ts', 'src/components/MonteCarloSimulator.tsx', 'src/i18n/strings/en.ts', 'test/dom.ts',
      'package.json', 'package-lock.json', 'tsconfig.json', '.nvmrc',
      'stryker.config.mjs', 'stryker.shards.json', 'stryker.shard-weights.json', 'stryker.floors.json',
      'scripts/mutation-example.mjs', 'scripts/lib/checks/mutation-example.mjs',
      '.github/workflows/tool-mutation.yml',
    ]) {
      assert.equal(isMutationInput(path), true, path);
      assert.equal(needsMutationRun(['docs/x.md', path]), true, path);
    }
  });

  it('runs when it cannot tell what changed', () => {
    assert.equal(needsMutationRun([]), true);
    assert.equal(needsMutationRun(['', '  ']), true);
    assert.equal(needsMutationRun(undefined), true);
  });

  it('does not take a lookalike for an input', () => {
    assert.equal(isMutationInput('docs/src/notes.md'), false);
    assert.equal(isMutationInput('package.json.bak'), false);
    assert.equal(isMutationInput('scripts/lib/media/mutation-notes.mjs'), false);
  });

  it('covers everything the incremental cache counts as what the tests run on', () => {
    const workflow = readFileSync(join(ROOT, '.github/workflows/tool-mutation.yml'), 'utf8');
    const fingerprint = /hashFiles\(([^)]*)\)/.exec(workflow)[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    for (const pattern of fingerprint) {
      if (pattern.startsWith('!')) {
        assert.equal(isMutationInput(`${pattern.slice(1).replace('**', 'x.md')}`), false, pattern);
        continue;
      }
      const example = pattern.replace('**', 'x.ts');
      assert.equal(isMutationInput(example), true, `${pattern} is in the cache key but not a mutation input`);
    }
  });
});
