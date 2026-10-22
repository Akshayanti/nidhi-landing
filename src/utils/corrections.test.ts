/**
 * Unit tests for src/utils/corrections.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertCorrectionDates, liveCorrections, publishedCorrections, type CorrectionPost } from './corrections.ts';

const NOW = new Date('2026-10-22');

function post(slug: string, pubDate: string, updatedDate?: string, corrections: Array<[string, string]> = []): CorrectionPost {
  return {
    data: {
      slug,
      title: `Title of ${slug}`,
      pubDate: new Date(pubDate),
      updatedDate: updatedDate ? new Date(updatedDate) : undefined,
      corrections: corrections.map(([date, note]) => ({ date: new Date(date), note })),
    },
  };
}

describe('published corrections', () => {
  it('lists corrections on published lessons, newest first', () => {
    const list = publishedCorrections([
      post('a', '2026-05-01', '2026-09-01', [['2026-06-01', 'first'], ['2026-09-01', 'third']]),
      post('b', '2026-05-01', '2026-07-01', [['2026-07-01', 'second']]),
    ], NOW);
    assert.deepEqual(list.map((c) => c.note), ['third', 'second', 'first']);
    assert.equal(list[0].slug, 'a');
    assert.equal(list[0].title, 'Title of a');
  });

  it('leaves out a lesson that is not published yet', () => {
    assert.deepEqual(publishedCorrections([post('later', '2099-01-01', '2099-01-02', [['2099-01-02', 'x']])], NOW), []);
  });

  it('leaves out a correction dated ahead, on a published lesson', () => {
    const list = publishedCorrections([post('a', '2026-05-01', '2026-11-01', [['2026-09-01', 'shown'], ['2026-11-01', 'not yet']])], NOW);
    assert.deepEqual(list.map((c) => c.note), ['shown']);
    assert.deepEqual(liveCorrections([{ date: new Date('2026-11-01'), note: 'x' }], NOW), []);
  });

  it('is empty when nothing has been corrected', () => {
    assert.deepEqual(publishedCorrections([post('a', '2026-05-01')], NOW), []);
  });
});

describe('correction dates', () => {
  it('passes when the last updated date covers every correction', () => {
    assert.doesNotThrow(() => assertCorrectionDates([post('a', '2026-05-01', '2026-09-01', [['2026-09-01', 'x']])]));
  });

  it('fails when a correction is newer than the last updated date', () => {
    assert.throws(() => assertCorrectionDates([post('a', '2026-05-01', '2026-08-01', [['2026-09-01', 'x']])]), /updatedDate is 2026-08-01/);
  });

  it('fails when a corrected lesson has no last updated date', () => {
    assert.throws(() => assertCorrectionDates([post('a', '2026-05-01', undefined, [['2026-09-01', 'x']])]), /updatedDate is missing/);
  });

  it('fails when a correction predates the lesson', () => {
    assert.throws(() => assertCorrectionDates([post('a', '2026-05-01', '2026-09-01', [['2026-04-01', 'x']])]), /before the lesson was published/);
  });
});
