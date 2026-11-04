/**
 * Every glossary link in a lesson lands on something.
 *
 * A lesson links to its own glossary card with `#glossary` and to one entry
 * with `#term-<id>`, where the id comes from `termId()` (src/utils/glossary.mjs,
 * the same helper the lesson page uses to give each entry its id). A link to an
 * id that no entry has goes nowhere, and the term tooltip never appears.
 *
 * This reads the lesson files directly, so it covers lessons dated in the
 * future too. The build leaves those out until their publish date, which is
 * why a broken link in a scheduled lesson would otherwise first show up on
 * the day it goes live (council round 19, Nov 4, 2026).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { GLOSSARY_CARD_ID, termId } from './glossary.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const contentDir = join(root, 'src', 'content');

function lessonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return lessonFiles(path);
    return /\.mdx?$/.test(entry.name) ? [path] : [];
  });
}

/** The frontmatter block and the body after it. */
function split(source: string): { front: string; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return match ? { front: match[1], body: match[2] } : { front: '', body: source };
}

/**
 * The glossary terms in the frontmatter. Every lesson writes them as
 * `  - term: "…"` inside `glossary:`; a double-quoted YAML scalar without
 * escapes reads the same as a JSON string.
 */
function glossaryTerms(front: string): string[] {
  const block = front.match(/^glossary:\s*\n((?:[ \t]+.*\n?|\s*\n)*)/m);
  if (!block) return [];
  return [...block[1].matchAll(/^\s*-\s*term:\s*("(?:[^"\\]|\\.)*"|'[^']*'|.+?)\s*$/gm)].map((m) => {
    const raw = m[1];
    if (raw.startsWith('"')) return JSON.parse(raw) as string;
    if (raw.startsWith("'")) return raw.slice(1, -1);
    return raw;
  });
}

/** The body without fenced or inline code, so examples are not read as links. */
function withoutCode(body: string): string {
  return body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

/** Every in-page anchor a Markdown link or an HTML `href` points to. */
function anchors(text: string): string[] {
  const found = [
    ...[...text.matchAll(/\]\(#([^)\s]+)\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/href=["']#([^"']+)["']/g)].map((m) => m[1]),
  ];
  return found.filter((id) => id === GLOSSARY_CARD_ID || id.startsWith('term-'));
}

const files = lessonFiles(contentDir);

describe('lesson glossary links', () => {
  it('finds the lessons', () => {
    assert.ok(files.length > 0, `no lesson files under ${relative(root, contentDir)}`);
  });

  it('points every #term- link at an entry in the same lesson\'s glossary', () => {
    const broken: string[] = [];
    for (const file of files) {
      const { front, body } = split(readFileSync(file, 'utf8'));
      const ids = new Set(glossaryTerms(front).map(termId));
      for (const id of anchors(withoutCode(front + '\n' + body))) {
        if (id !== GLOSSARY_CARD_ID && !ids.has(id)) broken.push(`${relative(root, file)}: #${id}`);
      }
    }
    assert.deepEqual(broken, [], 'links to a glossary term the lesson does not define');
  });

  it('uses #glossary only in a lesson that has a glossary', () => {
    const broken: string[] = [];
    for (const file of files) {
      const { front, body } = split(readFileSync(file, 'utf8'));
      if (glossaryTerms(front).length > 0) continue;
      if (anchors(withoutCode(front + '\n' + body)).includes(GLOSSARY_CARD_ID)) broken.push(relative(root, file));
    }
    assert.deepEqual(broken, [], 'links to #glossary without a glossary');
  });

  it('gives every term in a lesson its own id', () => {
    const clashes: string[] = [];
    for (const file of files) {
      const seen = new Map<string, string>();
      for (const term of glossaryTerms(split(readFileSync(file, 'utf8')).front)) {
        const id = termId(term);
        const other = seen.get(id);
        if (other !== undefined) clashes.push(`${relative(root, file)}: "${other}" and "${term}" are both #${id}`);
        seen.set(id, term);
      }
    }
    assert.deepEqual(clashes, [], 'two terms share one anchor id');
  });
});
