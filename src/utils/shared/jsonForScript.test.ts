/**
 * JSON written into a <script> element cannot end that element
 * (jsonForScript.ts), and no page writes JSON there any other way.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { jsonForScript } from './jsonForScript.ts';

describe('jsonForScript', () => {
  it('means the same as the value it was given', () => {
    const value = { title: 'A </script><script>alert(1)</script> title', list: ['<!--', 'a < b', '\u2028\u2029'], n: 1, nested: { ok: true } };
    assert.deepEqual(JSON.parse(jsonForScript(value)), value);
  });

  it('holds nothing that can end a script element or start a comment', () => {
    const out = jsonForScript({ a: '</script>', b: '<!-- x -->', c: '</SCRIPT >', d: '\u2028' });
    assert.doesNotMatch(out, /</);
    assert.doesNotMatch(out, /[\u2028\u2029]/);
  });

  it('leaves ordinary text as it is', () => {
    assert.equal(jsonForScript({ name: 'nidhi', q: 'कैसे करें?' }), '{"name":"nidhi","q":"कैसे करें?"}');
  });
});

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
    assert.deepEqual(safe, ['components/BaseHead.astro', 'components/pages/HowToHubPage.astro']);
  });
});
