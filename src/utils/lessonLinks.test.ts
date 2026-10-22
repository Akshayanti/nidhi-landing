// A link from one lesson to a section of another (/blog/<slug>/#<id>) must
// still land on something after a heading is renamed. The build checks a
// lesson's own # links; this checks the links between lessons.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { termId, GLOSSARY_CARD_ID } from './glossary.mjs';

const ROOT = join(import.meta.dirname, '../content/blog');
// Ids the lesson template always renders, beside the body's headings.
const TEMPLATE_IDS = ['post-covers-h', 'post-faq-h'];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  );
}

// Heading ids the way Astro makes them (github-slugger): inline markdown
// reduced to its words, lowercased, punctuation dropped, spaces to hyphens,
// and a repeated heading numbered. Written out here rather than importing
// Astro's own dependency.
function plain(text: string): string {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
}

function slugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

const lessons = files(ROOT).map((file) => {
  const raw = readFileSync(file, 'utf8');
  const [, fm = '', body = ''] = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
  const slug = fm.match(/^slug:\s*"?([^"\n]+)"?/m)?.[1] ?? '';
  const nextId = slugger();
  const ids = new Set(TEMPLATE_IDS);
  for (const m of body.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)) ids.add(nextId(plain(m[1])));
  const terms = [...fm.matchAll(/^\s*-?\s*term:\s*"?([^"\n]+)"?/gm)].map((m) => termId(m[1]));
  if (terms.length) [GLOSSARY_CARD_ID, ...terms].forEach((id) => ids.add(id));
  return { file, slug, raw, ids };
});
const bySlug = new Map(lessons.map((l) => [l.slug, l]));

describe('links between lessons', () => {
  it('land on a heading, the glossary or a template section of the target lesson', () => {
    const broken: string[] = [];
    for (const { file, raw } of lessons) {
      for (const m of raw.matchAll(/\/blog\/([a-z0-9-]+)\/#([A-Za-z0-9_%-]+)/g)) {
        const target = bySlug.get(m[1]);
        if (target && !target.ids.has(decodeURIComponent(m[2]))) broken.push(`${file.replace(ROOT, '')}: /blog/${m[1]}/#${m[2]}`);
      }
    }
    assert.deepEqual(broken, []);
  });
});
