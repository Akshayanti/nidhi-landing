/**
 * Hindi and Marathi headings get Devanagari leading and no Latin tracking on
 * every page (issue 407).
 *
 * The rule is in src/styles/global.css. A page's own title class is written
 * in a scoped <style>, where Astro adds an attribute to the class, so it
 * weighs two classes; the rule used to weigh one and lost on eleven of
 * eighteen pages. It now carries two extra classes of weight. This test
 * holds that weight, and that no page sets tracking on a heading for these
 * two languages itself.
 *
 * What a browser really computes was measured on the built pages when this
 * was written (every heading on 16 pages in each language: line-height 1.4,
 * letter-spacing normal; the home page's hero keeps its own 1.2).
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '../..');
const CSS = readFileSync(join(SRC, 'styles/global.css'), 'utf8');

describe('Devanagari headings', () => {
  const rule = /html:is\(\[lang="hi"\], \[lang="mr"\]\) :is\(h1, h2, h3, h4, h5, h6\)((?::not\(\._\))+) \{\s*line-height: 1\.4;[^}]*letter-spacing: normal;\s*\}/.exec(CSS);

  it('the rule covers all six heading levels, with leading and tracking', () => {
    assert.ok(rule, 'the Hindi and Marathi heading rule is not in global.css as expected');
  });

  it('outweighs a page’s own scoped title class', () => {
    // html (a type) + [lang] (a class) + h1 (a type) + the extra classes.
    const extra = (rule?.[1].match(/:not\(\._\)/g) ?? []).length;
    const weight = { classes: 1 + extra, types: 2 };
    // `.lc-pageTitle[data-astro-cid-x]`: two classes, no type.
    assert.ok(weight.classes > 2, `the rule weighs ${weight.classes} classes; a scoped title class weighs 2`);
  });

  it('no element has the class the weight is borrowed from', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(astro|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(SRC);
    for (const path of files) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), /class(Name)?=["'{][^"'}]*(^|[\s"'`])_([\s"'`]|$)/, path);
    }
  });

  it('a page that wants something else for Devanagari says so for Devanagari, and never asks for tracking', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.astro')) files.push(path);
      }
    };
    walk(SRC);
    const own: string[] = [];
    for (const path of files) {
      for (const m of readFileSync(path, 'utf8').matchAll(/:global\(html:is\(\[lang='hi'\], \[lang='mr'\]\)\)([^{]*\bh[1-6]\b[^{]*)\{([^}]*)\}/g)) {
        own.push(`${path.slice(SRC.length + 1)}:${m[1].trim()} {${m[2].trim()}}`);
        assert.doesNotMatch(m[2], /letter-spacing:\s*-/, `${path}: negative tracking on a Devanagari heading`);
      }
    }
    // Listed, so that a new exception is seen: the home page's hero title only.
    assert.deepEqual(own, ['components/pages/HomePage.astro:.hero-copy h1 {line-height: 1.2;}']);
  });
});
