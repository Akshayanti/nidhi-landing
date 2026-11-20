/**
 * Every CSS custom property that is read is also set somewhere.
 *
 * `var(--name)` with a name nobody sets, and no fallback, makes the whole
 * declaration invalid: a background computes to transparent and a colour to
 * the inherited one, in both themes, without an error anywhere (#345). This
 * reads the source and fails on such a name.
 *
 * A name counts as set when the source holds `--name:` (a stylesheet, a
 * `<style>` block, a `style` attribute) or the quoted name (`'--name'`, as a
 * React style key or a `setProperty` call has it). `var(--name, fallback)` is
 * not checked: the fallback is the answer when the name is not set.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'src');
const READ = /\.(css|astro|tsx|ts|jsx|js|mjs|md|mdx|svg|html)$/;
const TEST = /\.test\.(ts|mjs)$/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return READ.test(entry.name) && !TEST.test(entry.name) ? [path] : [];
  });
}

/** Code comments say `var(--token)` when they mean "any token". */
const PLACEHOLDERS = new Set(['--token']);

export function undefinedTokens(sources: { path: string; text: string }[]): string[] {
  const set = new Set<string>();
  const read: { name: string; where: string }[] = [];
  for (const { path, text } of sources) {
    for (const m of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) set.add(m[1]);
    for (const m of text.matchAll(/['"`](--[A-Za-z0-9_-]+)['"`]/g)) set.add(m[1]);
    for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
      const line = text.slice(0, m.index).split('\n').length;
      read.push({ name: m[1], where: `${path}:${line}` });
    }
  }
  return read
    .filter((r) => !set.has(r.name) && !PLACEHOLDERS.has(r.name))
    .map((r) => `${r.name} at ${r.where}`);
}

describe('CSS custom properties', () => {
  it('finds a name that is read and never set, and passes one with a fallback', () => {
    const found = undefinedTokens([
      { path: 'a.css', text: ':root { --known: red; }\n.a { color: var(--known); background: var(--unknown); border-color: var(--other, blue); }' },
      { path: 'b.tsx', text: "<i style={{ '--from-js': 1 }} className=\"x\" />; const c = 'var(--from-js)';" },
    ]);
    assert.deepEqual(found, ['--unknown at a.css:2']);
  });

  it('every var(--name) without a fallback in src/ has a definition', () => {
    const sources = files(SRC).map((path) => ({ path: relative(ROOT, path), text: readFileSync(path, 'utf8') }));
    assert.ok(sources.length > 100, 'the source files were found');
    assert.deepEqual(undefinedTokens(sources), []);
  });
});
