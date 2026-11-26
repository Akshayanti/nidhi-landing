/**
 * Every string in the catalog is used somewhere in the source (#360).
 *
 * In a file of its own, apart from the catalog's other checks
 * (catalog.test.ts): it reads every source file under src/, so it depends on
 * every file, and the mutation cache works out what a test depends on from
 * its source (#904). It imports the English catalog and nothing else of the
 * site's code.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { en } from './en.ts';

/** One translatable string, addressed by its dot path. */
type Leaf = { path: string; value: string };

/**
 * Flattens a catalog into dot paths. Throws on a value that is neither a
 * string nor a group of them, so a number or a nested array cannot sneak in
 * and be skipped silently.
 */
function leaves(node: unknown, prefix = ''): Leaf[] {
  if (typeof node === 'string') return [{ path: prefix, value: node }];
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  throw new Error(`catalog value at ${prefix || '<root>'} is neither a string nor a group`);
}

const EN = leaves(en);

/**
 * Every string is used (#360). Copy that is deleted from a page leaves its
 * key behind in five catalogs unless something says so. A key counts as used
 * when its last name appears in the source outside the catalogs, which is how
 * a page reads it (`t.heading`, `strings.cookie.accept`). That is a loose
 * match on purpose: it cannot prove a common name such as `title` is read
 * from this group, but it catches the key whose name nothing mentions.
 *
 * A group read whole (`Object.values(page.works)`) names none of its keys, so
 * those groups are listed here, each with the line that reads it.
 */
const READ_WHOLE = [
  // AboutPage.astro and BeliefsPage.astro: Object.values(...schema.knowsAbout)
  'about.schema.knowsAbout.',
  'beliefs.schema.knowsAbout.',
  // AccessibilityPage.astro: Object.values(page.works), Object.values(page.barriers.items)
  'accessibility.works.',
  'accessibility.barriers.items.',
];

describe('every string is used', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..', '..');
  const CATALOGS = join(ROOT, 'src', 'i18n', 'strings');

  function sourceText(dir: string): string {
    return readdirSync(dir).map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return path === CATALOGS ? '' : sourceText(path);
      return /\.(astro|tsx|ts|js|mjs)$/.test(name) && !/\.test\./.test(name) ? readFileSync(path, 'utf8') : '';
    }).join('\n');
  }

  it('finds the last name of every key somewhere in the source', () => {
    const text = `${sourceText(join(ROOT, 'src'))}\n${readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8')}`;
    // An id used as a key (`net-worth`) is matched whole; an item of a list
    // (`knowsAbout.0`) has no name of its own and is read with its list.
    const named = (name: string) => new RegExp(`(?<![\\w-])${name.replace(/[$]/g, '\\$')}(?![\\w-])`).test(text);
    const verdict = new Map<string, boolean>();
    const unused = EN.map((leaf) => leaf.path).filter((path) => {
      const last = path.split('.').pop()!;
      if (/^\d+$/.test(last) || READ_WHOLE.some((group) => path.startsWith(group))) return false;
      if (!verdict.has(last)) verdict.set(last, named(last));
      return !verdict.get(last);
    });
    assert.deepEqual(unused, [], 'These keys are named nowhere outside the catalogs. Delete them from every catalog, or, if a page reads their whole group, add the group to READ_WHOLE.');
  });

  it('lists only groups that exist', () => {
    for (const group of READ_WHOLE) {
      assert.ok(EN.some((leaf) => leaf.path.startsWith(group)), `${group} is in READ_WHOLE but no key starts with it`);
    }
  });
});
