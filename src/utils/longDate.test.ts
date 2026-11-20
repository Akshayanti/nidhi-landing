/**
 * Unit tests for src/utils/longDate.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { formatEnglishDate, formatLongDate } from './longDate.ts';

describe('formatEnglishDate', () => {
  it('writes month, day, year', () => {
    assert.equal(formatEnglishDate(new Date('2026-11-10T00:00:00Z')), 'November 10, 2026');
  });

  it('reads the date in UTC at both ends of the day', () => {
    assert.equal(formatEnglishDate(new Date('2026-11-10T00:00:00Z')), 'November 10, 2026');
    assert.equal(formatEnglishDate(new Date('2026-11-10T23:59:59Z')), 'November 10, 2026');
  });

  it('prints the same day on a machine west or east of UTC', () => {
    const script = "import('./src/utils/longDate.ts').then((m) => process.stdout.write(m.formatEnglishDate(new Date('2026-11-10T00:00:00Z'))))";
    for (const zone of ['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
      const run = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
        env: { ...process.env, TZ: zone },
        encoding: 'utf8',
      });
      assert.equal(run.stdout, 'November 10, 2026', `${zone}: ${run.stderr}`);
    }
  });
});

describe('formatLongDate', () => {
  it('defaults to English', () => {
    const d = new Date('2026-01-05T00:00:00Z');
    assert.equal(formatLongDate(d), formatEnglishDate(d));
  });

  it('puts each language in its own order, with Latin digits', () => {
    const d = new Date('2026-11-10T00:00:00Z');
    assert.equal(formatLongDate(d, 'es'), '10 de noviembre de 2026');
    assert.equal(formatLongDate(d, 'cs'), '10. listopadu 2026');
    for (const locale of ['hi', 'mr'] as const) {
      assert.match(formatLongDate(d, locale), /^10 \S+,? 2026$/);
    }
  });
});

describe('the pages that print full dates', () => {
  // A date formatted in the page itself is how three forms came about.
  for (const file of ['src/layouts/BlogPost.astro', 'src/components/pages/GuidePage.astro', 'src/components/pages/EditorialPolicyPage.astro']) {
    it(`${file} formats its dates through longDate.ts`, () => {
      const source = readFileSync(file, 'utf8');
      // What runs at build time: the frontmatter and the template. A client
      // script may still print the reader's own day in the reader's own zone
      // (a lesson's "Saved on" line in print).
      const built = source.replace(/<script[\s\S]*?<\/script>/g, '');
      assert.doesNotMatch(built, /toLocaleDateString|DateTimeFormat/);
      assert.match(built, /utils\/longDate/);
    });
  }
});
