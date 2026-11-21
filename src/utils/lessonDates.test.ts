/**
 * A lesson is never said to have been modified before it was published
 * (lessonDates.ts), and the feed lists the newest lesson first.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { lastChanged, modifiedAfterPublication } from './lessonDates.ts';

const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe('lessonDates', () => {
  it('an edit made while the lesson was scheduled does not predate it (issue 452)', () => {
    // interest-free-and-sharia-compliant-finance: published Nov 9, last edited Oct 25.
    assert.deepEqual(lastChanged(day('2026-11-09'), day('2026-10-25')), day('2026-11-09'));
    assert.equal(modifiedAfterPublication(day('2026-11-09'), day('2026-10-25')), undefined);
  });

  it('a later edit is the modification date', () => {
    assert.deepEqual(lastChanged(day('2026-05-01'), day('2026-08-01')), day('2026-08-01'));
    assert.deepEqual(modifiedAfterPublication(day('2026-05-01'), day('2026-08-01')), day('2026-08-01'));
  });

  it('no edit, or one on the same day, leaves the publication date', () => {
    assert.deepEqual(lastChanged(day('2026-05-01')), day('2026-05-01'));
    assert.deepEqual(lastChanged(day('2026-05-01'), null), day('2026-05-01'));
    assert.equal(modifiedAfterPublication(day('2026-05-01'), day('2026-05-01')), undefined);
  });
});

describe('where the dates are given out', () => {
  const read = (path: string) => readFileSync(join(import.meta.dirname, '../..', path), 'utf8');

  it('the lesson page, its structured data and the sitemap all go through lessonDates', () => {
    const layout = read('src/layouts/BlogPost.astro');
    assert.ok(layout.includes('dateModified: lastChanged(pubDate, updatedDate).toISOString()'));
    assert.ok(layout.includes('modifiedTime: updatedDate ? lastChanged(pubDate, updatedDate) : undefined'));
    assert.doesNotMatch(layout, /dateModified: updatedDate\.|modifiedTime: updatedDate,/);
    // The sitemap's dates are worked out in src/utils/sitemap.ts, which astro.config.mjs calls.
    const sitemap = read('src/utils/sitemap.ts');
    assert.ok(sitemap.includes("import { lastChanged } from './lessonDates.ts';"));
    assert.doesNotMatch(sitemap, /fm\.updatedDate \?\? fm\.pubDate|\.updatedDate \?\? .*\.pubDate/);
    assert.ok(read('astro.config.mjs').includes("from './src/utils/sitemap.ts';"));
  });

  it('the feed is sorted newest first and names its own address (issue 453)', () => {
    const feed = read('src/pages/rss.xml.ts');
    assert.ok(feed.includes('b.data.pubDate.getTime() - a.data.pubDate.getTime()'));
    assert.doesNotMatch(feed, /\.sort\(\(a, b\) => \(a\.data\.order/);
    assert.ok(feed.includes('rel=\"self\"'));
  });
});
