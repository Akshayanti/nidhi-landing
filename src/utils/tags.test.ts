import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTag, tagChipLabel } from './tags.ts';

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
