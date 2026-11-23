import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { formatTag, tagChipLabel } from './tags.ts';
import { learnEn } from '../i18n/strings/learn.ts';

describe('the tags lessons carry', () => {
  it('all have a name and copy in the catalog (blog-content-plan Rule 4)', () => {
    const dir = new URL('../content/blog/', import.meta.url);
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.md'));
    assert.ok(files.length > 0);
    const known = new Set(Object.keys(learnEn.learn.tags));
    const unknown: string[] = [];
    let read = 0;
    for (const file of files) {
      const list = readFileSync(new URL(file.split('/').map(encodeURIComponent).join('/'), dir), 'utf8').match(/^tags: *(\[.*\])$/m);
      if (!list) continue;
      read += 1;
      for (const tag of JSON.parse(list[1]) as string[]) if (!known.has(tag)) unknown.push(`${file}: ${tag}`);
    }
    assert.ok(read > 50, 'the tags lines are no longer found');
    assert.deepEqual(unknown, []);
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
