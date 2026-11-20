import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITUATIONS_BASE, hasSituationFiles, isSituationFile } from './situationFiles.ts';

describe('whether a situation page exists yet (#322)', () => {
  it('a page is a Markdown file that is not a note', () => {
    assert.equal(isSituationFile('something-arrived.md'), true);
    assert.equal(isSituationFile('_README.md'), false);
    assert.equal(isSituationFile('notes.txt'), false);
  });

  it('no folder, an empty folder and a folder of notes all count as none', () => {
    const root = mkdtempSync(join(tmpdir(), 'situations-'));
    try {
      assert.equal(hasSituationFiles(root), false);
      const dir = join(root, SITUATIONS_BASE);
      mkdirSync(dir, { recursive: true });
      assert.equal(hasSituationFiles(root), false);
      writeFileSync(join(dir, '_README.md'), 'notes');
      assert.equal(hasSituationFiles(root), false);
      mkdirSync(join(dir, 'moving'));
      writeFileSync(join(dir, 'moving', 'new-country.md'), 'a page');
      assert.equal(hasSituationFiles(root), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads the folder the collection reads', async () => {
    const { readFileSync } = await import('node:fs');
    const config = readFileSync(join(import.meta.dirname, '..', 'content.config.ts'), 'utf8');
    assert.match(config, /hasSituationFiles\(\)\s*\? glob\(\{ pattern: '\*\*\/\[\^_\]\*\.md', base: SITUATIONS_BASE \}\)/);
  });
});
