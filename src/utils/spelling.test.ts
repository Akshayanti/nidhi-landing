import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { en } from '../i18n/strings/en.ts';

// Oxford spelling (docs/brand-identity.md, "How nidhi speaks"). A short list
// of words that have no correct use in the site's own English; names and the
// titles of cited works are listed in ALLOWED.
const WRONG = /\b(?:behavior|behavioral|favorable|favorite|neighbor|neighborhood|flavor|honor|jewelry|skepticism|installments?|amortis\w+|annualis\w+|recognis\w+|realis(?:e|ed|es|ing)|unrealis\w+|organis(?:e|ed|es|ing|ations?)|optimis(?:e|ed|es|ing|ations?)|prioritis\w+|penalis\w+|subsidis\w+|specialis(?:e|ed|es|ing|ations?)|personalis\w+|utilis\w+|normalis\w+|maximis\w+|minimis\w+)\b/i;

const ALLOWED = [
  'Making of Behavioral Economics',
  'Using Behavioral Economics',
  'The Behavioral Investor',
  '401(k) Participation and Savings Behavior',
  'Organisation for Economic Co-operation and Development',
  'Equated monthly installment',
];

/** The text a reader gets: no addresses, code, tags, slugs or published anchors. */
function prose(markdown: string): string {
  let text = markdown;
  for (const name of ALLOWED) text = text.replaceAll(name, '');
  return text
    // Past correction records stay as written, like a glossary term or a
    // heading, whose words make an address.
    .replace(/^corrections:\n(?:[ \t].*\n)*/m, '')
    .replace(/^ *- term:.*$/gm, '')
    .replace(/^#{1,6} .*$/gm, '')
    .replace(/^ *(?:- )?(?:slug|hostSlug|companionOf|relatedSlugs|lessons|related|url|href|searchTerms|tags|id):.*$/gm, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\S+/g, '');
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('the English is in Oxford spelling', () => {
  it('in the English catalog', () => {
    const found = strings(en).filter((s) => /\s/.test(s) && WRONG.test(prose(s)));
    assert.deepEqual(found, []);
  });

  for (const dir of ['blog', 'guides']) {
    it(`in src/content/${dir}`, () => {
      const root = new URL(`../content/${dir}/`, import.meta.url);
      const found: string[] = [];
      for (const file of readdirSync(root, { recursive: true }) as string[]) {
        if (!file.endsWith('.md')) continue;
        for (const line of prose(readFileSync(new URL(file.split('/').map(encodeURIComponent).join('/'), root), 'utf8')).split('\n')) {
          const hit = WRONG.exec(line);
          if (hit) found.push(`${file}: ${hit[0]}`);
        }
      }
      assert.deepEqual(found, []);
    });
  }
});

describe('a page quotes with curly marks', () => {
  // docs/brand-identity.md: curly quotation marks on every page. Markdown
  // bodies are curled when they render; frontmatter strings (FAQ answers,
  // guide steps, notes) reach the page as written.
  for (const dir of ['blog', 'guides']) {
    it(`in the frontmatter of src/content/${dir}`, async () => {
      const { parse } = await import('yaml');
      const root = new URL(`../content/${dir}/`, import.meta.url);
      const found: string[] = [];
      for (const file of readdirSync(root, { recursive: true }) as string[]) {
        if (!file.endsWith('.md')) continue;
        const text = readFileSync(new URL(file.split('/').map(encodeURIComponent).join('/'), root), 'utf8');
        const head = /^---\n([\s\S]*?)\n---\n/.exec(text);
        if (!head) continue;
        for (const value of strings(parse(head[1]))) if (value.includes('"')) found.push(`${file}: ${value.slice(0, 60)}`);
      }
      assert.deepEqual(found, []);
    });
  }
});
