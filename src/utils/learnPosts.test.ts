import './testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PathPost } from './learnPosts.ts';

const { assertNoLevelSlug, topicGroups } = await import('./learnPosts.ts');

const post = (id: string, level: PathPost['level'], tags: string[], onPath = true): PathPost => ({
  id, title: id, description: '', pubDate: '2026-01-01T00:00:00.000Z', level, readingTime: 5, tags,
  isNew: false, href: `/blog/${id}/`, ...(onPath ? { pathLevel: level } : {}),
});

const posts = [
  post('d1', 'discovery', ['budgeting']),
  post('d2', 'discovery', ['debt']),
  post('d3', 'discovery', ['budgeting', 'debt']),
  post('b1', 'building', ['debt']),
  post('b-off', 'building', ['budgeting'], false),
  post('i1', 'inclusive-finances', ['budgeting'], false),
  post('i2', 'inclusive-finances', ['migration'], false),
];

describe('a topic page\'s lessons', () => {
  it('groups them by level in reading order, each with its place in the whole level', () => {
    const groups = topicGroups(posts, 'debt');
    assert.deepEqual(groups.map((g) => [g.level, g.levelTotal, g.posts.map((p) => [p.id, p.step, p.stepCount])]), [
      ['discovery', 3, [['d2', 2, 3], ['d3', 3, 3]]],
      ['building', 1, [['b1', 1, 1]]],
    ]);
  });

  it('leaves out a level with none, and a lesson that is not placed on the path', () => {
    const groups = topicGroups(posts, 'budgeting');
    assert.deepEqual(groups.map((g) => g.level), ['discovery', 'inclusive-finances']);
    assert.ok(!groups.flatMap((g) => g.posts).some((p) => p.id === 'b-off'));
  });

  it('Inclusive Finances guides come last, counted against all of them, with no step', () => {
    const last = topicGroups(posts, 'budgeting').at(-1)!;
    assert.deepEqual([last.level, last.levelTotal, last.posts.map((p) => p.id)], ['inclusive-finances', 2, ['i1']]);
    assert.equal(last.posts[0].step, undefined);
  });

  it('a tag nobody uses has no groups', () => {
    assert.deepEqual(topicGroups(posts, 'nothing'), []);
  });
});

describe('lesson slugs and level pages', () => {
  it('a lesson cannot take a level page\'s address', () => {
    assert.doesNotThrow(() => assertNoLevelSlug(['compound-growth', 'building-an-emergency-fund']));
    for (const level of ['discovery', 'building', 'psychology', 'optimizing', 'mastery']) {
      assert.throws(() => assertNoLevelSlug(['compound-growth', level]), new RegExp(`taken by the level page /blog/${level}/`));
    }
  });
});
