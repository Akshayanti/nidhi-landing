/**
 * Unit tests for src/utils/sourceCounts.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sourceCounts, type SourcePost } from './sourceCounts.ts';

const NOW = new Date('2026-10-22');

const post = (pubDate: string, titles: string[] = []): SourcePost => ({
  data: { pubDate: new Date(pubDate), referentialReading: titles.map((title, i) => ({ title, url: `https://example.org/${pubDate}/${i}` })) },
});

describe('source counts', () => {
  it('counts a work listed under two lessons once, even through two editions', () => {
    // Same work, different addresses (one edition per lesson), different capitalisation.
    const counts = sourceCounts([post('2026-05-01', ['Nudge', 'The Little Book']), post('2026-06-01', ['nudge'])], NOW);
    assert.deepEqual(counts, { lessons: 2, listed: 3, distinct: 2 });
  });

  it('leaves out lessons that are not published yet', () => {
    assert.deepEqual(sourceCounts([post('2099-01-01', ['A book'])], NOW), { lessons: 0, listed: 0, distinct: 0 });
  });

  it('counts a lesson with no reading list as a lesson with no sources', () => {
    assert.deepEqual(sourceCounts([{ data: { pubDate: new Date('2026-05-01') } }], NOW), { lessons: 1, listed: 0, distinct: 0 });
  });
});
