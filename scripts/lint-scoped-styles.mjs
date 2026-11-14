#!/usr/bin/env node
/**
 * Fail on a scoped style rule that can never match.
 *
 * Astro adds a `[data-astro-cid-*]` qualifier to every selector in a
 * component's `<style>` block, and only the elements written in that
 * component's own template carry the attribute. Markup that a React island
 * renders (the free tools), or that a child component or Markdown renders,
 * never does. So a rule whose selector names a class that the component's own
 * template never writes is dead: editing it changes nothing, and its live twin
 * is somewhere else, usually `src/styles/global.css`. The net worth page once
 * carried about 70 such rules, already drifting from the real ones.
 *
 * A class counts as written if its name appears anywhere in the file outside
 * the `<style>` blocks (template, frontmatter or script), or if a modifier's
 * stem is built there at run time (`badge--${size}`). Anything inside
 * `:global(...)` is not scoped and is skipped, as is a `<style is:global>`.
 *
 * Exits non-zero on any violation so the build can fail fast.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.astro')) out.push(path);
  }
  return out;
}

/** Removes every `:global(...)`, with nested brackets, from a selector. */
function stripGlobal(selector) {
  let out = '';
  for (let i = 0; i < selector.length; i += 1) {
    if (selector.startsWith(':global(', i)) {
      let depth = 0;
      for (i += 7; i < selector.length; i += 1) {
        if (selector[i] === '(') depth += 1;
        else if (selector[i] === ')') { depth -= 1; if (depth === 0) break; }
      }
    } else {
      out += selector[i];
    }
  }
  return out;
}

/**
 * The selectors of a style sheet with the line each starts on. A small reader
 * is enough: comments, strings and declaration blocks are skipped, and the
 * prelude of a nested at-rule (`@media (...)`) is not a selector.
 */
function selectorsOf(css) {
  const found = [];
  let prelude = '';
  let preludeLine = 1;
  let line = 1;
  const stack = [];
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '\n') line += 1;
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      line += css.slice(i, stop).split('\n').length - 1;
      i = stop - 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) j += css[j] === '\\' ? 2 : 1;
      if (stack[stack.length - 1] !== 'rule') prelude += css.slice(i, j + 1);
      i = j;
      continue;
    }
    const inside = stack[stack.length - 1];
    if (ch === '{') {
      const text = prelude.trim();
      if (text.startsWith('@')) {
        // Rules nest inside these; any other at-rule holds declarations or keyframes.
        stack.push(/^@(media|supports|container|layer|scope)\b/.test(text) ? 'group' : 'rule');
      } else if (inside === 'rule') {
        stack.push('rule');
      } else {
        found.push({ selector: text, line: preludeLine });
        stack.push('rule');
      }
      prelude = '';
      continue;
    }
    if (ch === '}') { stack.pop(); prelude = ''; continue; }
    if (inside === 'rule') continue;
    if (ch === ';') { prelude = ''; continue; }
    if (prelude.trim() === '' && !/\s/.test(ch)) preludeLine = line;
    prelude += ch;
  }
  return found;
}

/**
 * Whether the component writes this class: its full name, or, for a modifier
 * such as `badge--large`, a name built at run time from its stem
 * (`badge--${size}` in the template, `'badge--' + size` in a script).
 */
function isWritten(name, outside) {
  if (outside.includes(name)) return true;
  const cut = name.lastIndexOf('--');
  if (cut <= 0) return false;
  const stem = name.slice(0, cut + 2);
  return outside.includes(stem + '${') || outside.includes(stem + "' +") || outside.includes(stem + '" +');
}

const errors = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  const styleRe = /<style([^>]*)>([\s\S]*?)<\/style>/g;
  const outside = source.replace(styleRe, '');
  let m;
  while ((m = styleRe.exec(source))) {
    if (/\bis:global\b/.test(m[1])) continue;
    const firstLine = source.slice(0, m.index).split('\n').length;
    for (const { selector, line } of selectorsOf(m[2])) {
      for (const part of selector.split(',')) {
        const scoped = stripGlobal(part);
        const classes = scoped.match(/\.-?[_a-zA-Z][\w-]*/g) ?? [];
        const missing = classes.map((c) => c.slice(1)).filter((c) => !isWritten(c, outside));
        if (missing.length > 0) {
          errors.push(`${relative(ROOT, file)}:${firstLine + line - 1}  "${part.trim()}"  names .${missing.join(', .')}, which this component's template never writes`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Scoped style rules that can never match (${errors.length}):\n`);
  for (const e of errors) console.error('  ' + e);
  console.error('\nA scoped rule only reaches elements written in the same .astro file. Move the rule to src/styles/global.css, wrap the foreign part in :global(...), or delete it.');
  process.exit(1);
}
console.log('lint-scoped-styles: every scoped rule names classes its own template writes.');
