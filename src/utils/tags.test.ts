import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { formatTag, tagChipLabel } from './tags.ts';
import { parse } from 'yaml';
import { learnCs, learnEn, learnEs, learnHi, learnMr } from '../i18n/strings/learn.ts';

const CATALOGS = { en: learnEn, hi: learnHi, es: learnEs, cs: learnCs, mr: learnMr };

describe('the tags lessons carry', () => {
  const dir = new URL('../content/blog/', import.meta.url);
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.md'));
  // Read as YAML, as the content collection reads them, so a tag list over
  // several lines is read too (#835).
  const tagged = files.flatMap((file) => {
    const text = readFileSync(new URL(file.split('/').map(encodeURIComponent).join('/'), dir), 'utf8');
    const head = /^---\n([\s\S]*?)\n---\n/.exec(text);
    const tags = head ? (parse(head[1]) as { tags?: unknown })?.tags : undefined;
    return Array.isArray(tags) ? [{ file, tags: tags as string[] }] : [];
  });

  it('are read from every lesson that has them', () => {
    assert.ok(files.length > 0);
    assert.ok(tagged.length > 50, 'the tags are no longer found');
  });

  // A tag missing from one language's catalog shows the heading form there.
  for (const [locale, catalog] of Object.entries(CATALOGS)) {
    it(`all have a name and copy in the ${locale} catalog (blog-content-plan Rule 4)`, () => {
      const known = new Set(Object.keys(catalog.learn.tags));
      const unknown = tagged.flatMap(({ file, tags }) => tags.filter((tag) => !known.has(tag)).map((tag) => `${file}: ${tag}`));
      assert.deepEqual(unknown, []);
    });
  }

  it('reads a tag list written over several lines', () => {
    const head = 'title: x\ntags:\n  - budgeting\n  - net-worth\n';
    assert.deepEqual((parse(head) as { tags: string[] }).tags, ['budgeting', 'net-worth']);
  });
});

describe('tag names', () => {
  it('a slug becomes a heading', () => {
    assert.equal(formatTag('net-worth'), 'Net Worth');
    assert.equal(formatTag('budgeting'), 'Budgeting');
    assert.equal(formatTag('fire-4-percent-rule'), 'Fire 4 Percent Rule');
    assert.equal(formatTag(''), '');
  });

  it('English chips show the bare slug, whatever the catalog says', () => {
    assert.equal(tagChipLabel('net-worth', 'Net worth', true), 'net-worth');
    assert.equal(tagChipLabel('net-worth', undefined, true), 'net-worth');
  });

  it('other languages show the catalog name, or the heading form when there is none', () => {
    assert.equal(tagChipLabel('net-worth', 'नेट वर्थ', false), 'नेट वर्थ');
    assert.equal(tagChipLabel('net-worth', undefined, false), 'Net Worth');
  });
});
