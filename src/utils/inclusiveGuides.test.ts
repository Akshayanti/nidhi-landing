/**
 * Unit tests for src/utils/inclusiveGuides.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertInclusiveGroups, INCLUSIVE_GENERAL, INCLUSIVE_GROUPS, liveInclusive, type GuidePost } from './inclusiveGuides.ts';

const NOW = new Date('2026-10-07');

function post(slug: string, pubDate = '2099-01-01', level = 'inclusive-finances'): GuidePost {
  return { data: { slug, title: `Title of ${slug}`, level, pubDate: new Date(pubDate) } };
}

const every = [...INCLUSIVE_GENERAL, ...INCLUSIVE_GROUPS.flatMap((g) => g.guides)];

describe('grouping check', () => {
  it('passes when every guide is placed exactly once', () => {
    assert.equal(new Set(every).size, every.length, 'a guide is in two groups');
    assert.doesNotThrow(() => assertInclusiveGroups([...every.map((s) => post(s)), post('core', '2026-01-01', 'discovery')]));
  });

  it('names a new guide that is in no group', () => {
    assert.throws(() => assertInclusiveGroups([...every.map((s) => post(s)), post('brand-new-guide')]), /brand-new-guide/);
  });

  it('names a grouped slug that no longer exists', () => {
    assert.throws(() => assertInclusiveGroups(every.slice(1).map((s) => post(s))), new RegExp(every[0]));
  });
});

describe('live inclusive', () => {
  it('is empty while every guide is scheduled, so nothing is shown', () => {
    assert.deepEqual(liveInclusive(every.map((s) => post(s)), NOW), { count: 0, groups: [] });
  });

  it('counts live guides and lists only situations with one live', () => {
    const r = liveInclusive([
      post('gig-and-informal-economy-work', '2026-09-01'),
      post('when-the-default-plan-does-not-fit-you', '2026-09-01'),
      post('unmarried-and-cohabiting-couples'),
    ], NOW);
    assert.equal(r.count, 2);
    assert.deepEqual(r.groups.map((g) => g.id), ['work']);
  });
});
