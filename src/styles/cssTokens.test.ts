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
import { NEUTRAL, PALETTE, SEMANTIC } from './palette.ts';

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

/**
 * palette.ts mirrors the colour constants in global.css (#414). Both files
 * say so, and the guide calls them one source of truth, but nothing held them
 * together: the dark CTA pair in palette.ts was still the fill that had been
 * replaced for contrast in global.css.
 *
 * A TS key maps to its CSS name by family: PALETTE.deepOrange is
 * --palette-deep-orange, NEUTRAL.n25 is --neutral-25, SEMANTIC.ctaBgDark is
 * --semantic-cta-bg-dark, and the status, notice and warning keys keep their
 * own prefix (SEMANTIC.noticeCautionBgLight is --notice-caution-bg-light).
 */
export function cssName(family: 'PALETTE' | 'NEUTRAL' | 'SEMANTIC', key: string): string {
  const kebab = key
    .replace(/^n(\d+)$/, '$1')
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    .replace(/([a-z])(\d)/g, '$1-$2');
  if (family === 'PALETTE') return `--palette-${kebab}`;
  if (family === 'NEUTRAL') return `--neutral-${kebab}`;
  return /^(status-|notice-|warning-(light|dark)-)/.test(kebab) ? `--${kebab}` : `--semantic-${kebab}`;
}

describe('palette.ts mirrors global.css', () => {
  // The constants block only: the theme-reactive layer below it reuses some
  // of the prefixes (--notice-caution-bg) for aliases, which are not constants.
  const css = readFileSync(join(SRC, 'styles', 'global.css'), 'utf8');
  const start = css.indexOf(':root {', css.indexOf('Color constants: single source of truth'));
  const block = css.slice(start, css.indexOf('\n}', start));
  const constants = new Map<string, string>();
  for (const m of block.matchAll(/^\s*(--(?:palette|neutral|semantic|status|notice|warning)-[\w-]+):\s*([^;]+);/gm)) {
    constants.set(m[1], m[2].trim());
  }
  const resolve = (value: string): string => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    return ref ? resolve(constants.get(ref[1]) ?? ref[1]) : value.toUpperCase();
  };
  const tables = [['PALETTE', PALETTE], ['NEUTRAL', NEUTRAL], ['SEMANTIC', SEMANTIC]] as const;

  it('maps names the way global.css spells them', () => {
    assert.equal(cssName('PALETTE', 'deepOrangeDark'), '--palette-deep-orange-dark');
    assert.equal(cssName('NEUTRAL', 'n25'), '--neutral-25');
    assert.equal(cssName('NEUTRAL', 'controlEdgeDark'), '--neutral-control-edge-dark');
    assert.equal(cssName('SEMANTIC', 'ctaBgHoverLight'), '--semantic-cta-bg-hover-light');
    assert.equal(cssName('NEUTRAL', 'surface2Dark'), '--neutral-surface-2-dark');
    assert.equal(cssName('SEMANTIC', 'warningDark'), '--semantic-warning-dark');
    assert.equal(cssName('SEMANTIC', 'warningDarkBg'), '--warning-dark-bg');
  });

  it('every constant in palette.ts has the same value in global.css', () => {
    const wrong: string[] = [];
    for (const [family, table] of tables) {
      for (const [key, value] of Object.entries(table)) {
        const name = cssName(family, key);
        const there = constants.get(name);
        if (!there) wrong.push(`${family}.${key}: ${name} is not in global.css`);
        else if (resolve(there) !== String(value).toUpperCase()) wrong.push(`${family}.${key} is ${value}, ${name} is ${resolve(there)}`);
      }
    }
    assert.deepEqual(wrong, []);
  });

  it('every colour constant in global.css has its palette.ts entry', () => {
    const named = new Set(tables.flatMap(([family, table]) => Object.keys(table).map((key) => cssName(family, key))));
    assert.deepEqual([...constants.keys()].filter((name) => !named.has(name)), []);
  });
});
