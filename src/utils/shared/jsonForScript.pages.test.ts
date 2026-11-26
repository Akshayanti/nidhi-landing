/**
 * No page writes JSON into a <script> element except through jsonForScript
 * (jsonForScript.ts), which cannot end that element.
 *
 * In a file of its own, apart from the function's own tests
 * (jsonForScript.test.ts): it reads every .astro file under src/, so it
 * depends on every file, and the mutation cache works out what a test
 * depends on from its source (#904). It runs no code a mutation run mutates.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('JSON written into pages', () => {
  const SRC = join(import.meta.dirname, '../..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.astro')) files.push(path);
    }
  };
  walk(SRC);

  it('goes through jsonForScript wherever it is set as a script’s content', () => {
    const raw = files.filter((path) => /set:html=\{\s*JSON\.stringify\(/.test(readFileSync(path, 'utf8'))).map((path) => path.slice(SRC.length + 1));
    assert.deepEqual(raw, [], 'use jsonForScript(value) from src/utils/shared/jsonForScript.ts');
    const safe = files.filter((path) => /set:html=\{jsonForScript\(/.test(readFileSync(path, 'utf8'))).map((path) => path.slice(SRC.length + 1)).sort();
    assert.deepEqual(safe, ['components/BaseHead.astro', 'components/LearnHome.astro', 'components/pages/HowToHubPage.astro']);
  });
});
