/**
 * Unit tests for src/utils/home/startingPoints.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { en } from '../../i18n/strings/en.ts';
import {
  assertHomepageSlugs,
  homepageSlugs,
  lessonToolPairs,
  levelCounts,
  nextLesson,
  readingOrder,
  resolveGrowthTopics,
  resolveStartingPoints,
  routeNext,
  type HomePost,
} from './startingPoints.ts';

const NOW = new Date('2026-10-07');
const PAST = new Date('2026-01-01');
const FUTURE = new Date('2099-01-01');

function post(slug: string, level: string, order: number, pubDate = PAST, relatedTool?: string): HomePost {
  return {
    data: {
      slug,
      title: `Title of ${slug}`,
      level,
      order,
      pubDate,
      relatedTool: relatedTool ? { url: relatedTool, label: 'x', cta: 'y' } : undefined,
    },
  };
}

describe('build-time slug check', () => {
  it('passes when every homepage slug exists, even if scheduled', () => {
    const all = homepageSlugs().map((s, i) => post(s, 'discovery', i, FUTURE));
    assert.doesNotThrow(() => assertHomepageSlugs(all));
  });

  it('names the missing slug', () => {
    const all = homepageSlugs().slice(1).map((s, i) => post(s, 'discovery', i));
    assert.throws(() => assertHomepageSlugs(all), new RegExp(homepageSlugs()[0]));
  });
});

describe('starting points', () => {
  it('leaves out scheduled lessons, and situations with none live', () => {
    const posts = [
      post('what-is-net-worth', 'discovery', 1),
      post('emergency-fund', 'discovery', 8, FUTURE),
      post('cash-flow-101', 'discovery', 10),
    ];
    const points = resolveStartingPoints(posts, NOW);
    // The Optimizing route stays, empty, until its lessons go live.
    assert.deepEqual(points.map((p) => p.id), ['basics', 'complex']);
    assert.deepEqual(points[1].lessons, []);
    assert.equal(points[1].level, 'optimizing');
    assert.deepEqual(points[0].lessons.map((l) => l.slug), ['what-is-net-worth', 'cash-flow-101']);
    assert.equal(points[0].level, 'discovery');
    assert.equal(points[0].levelCount, 2);
    // No words: the caller reads `home.startingPoints[id]` and `home.levels`.
    assert.equal('situation' in points[0], false);
    assert.equal(points[0].lessons[0].href, '/blog/what-is-net-worth/');
  });

  it('names each route\'s tools, leaving out gated ones', () => {
    const posts = [post('saving-vs-investing', 'building', 1), post('understanding-loan-terms', 'building', 2)];
    const all = resolveStartingPoints(posts, NOW);
    assert.deepEqual(all.find((p) => p.id === 'no-plan')!.tools.map((t) => t.href), ['/free/monte-carlo-simulator/']);
    const gated = resolveStartingPoints(posts, NOW, (href) => href !== '/free/monte-carlo-simulator/');
    assert.deepEqual(gated.find((p) => p.id === 'no-plan')!.tools, []);
    assert.deepEqual(
      gated.find((p) => p.id === 'complex')!.tools.map((t) => t.href),
      ['/free/loan-comparison/', '/free/multi-currency-net-worth/'],
    );
  });

  it('the Optimizing route fills in as its lessons publish', () => {
    const posts = [
      post('financial-projections', 'optimizing', 43),
      post('what-if-scenarios', 'optimizing', 43.3, FUTURE),
    ];
    const complex = resolveStartingPoints(posts, NOW).find((p) => p.id === 'complex')!;
    assert.deepEqual(complex.lessons.map((l) => l.slug), ['financial-projections']);
    assert.equal(complex.levelCount, 1);
  });

  it('a route\'s button moves to the first unread lesson', () => {
    const route = ['a', 'b', 'c'].map((slug) => ({ slug, title: slug, href: `/blog/${slug}/` }));
    assert.deepEqual(routeNext(route, []), { next: route[0], started: false });
    assert.deepEqual(routeNext(route, ['a', 'x']), { next: route[1], started: true });
    assert.deepEqual(routeNext(route, ['b']), { next: route[0], started: true });
    assert.deepEqual(routeNext(route, ['a', 'b', 'c']), { next: null, started: true });
  });

  it('growth topics follow the same rule', () => {
    const topics = resolveGrowthTopics([post('managing-money-across-currencies', 'building', 29)], NOW);
    assert.deepEqual(topics.map((t) => t.id), ['currencies']);
  });
});

describe('level counts', () => {
  it('counts live ladder lessons only', () => {
    const c = levelCounts([
      post('a', 'discovery', 1),
      post('b', 'building', 2),
      post('c', 'optimizing', 3, FUTURE),
      post('d', 'inclusive-finances', 4),
    ], NOW);
    assert.equal(c.total, 2);
    assert.deepEqual(c.levels, ['discovery', 'building']);
  });
});

describe('lesson and tool pairs', () => {
  it('pairs each tool with its earliest live lesson and hides gated tools', () => {
    const posts = [
      post('later', 'optimizing', 47, PAST, '/free/multi-currency-net-worth'),
      post('how-to-calculate-net-worth', 'discovery', 2, PAST, '/free/multi-currency-net-worth'),
      post('understanding-loan-terms', 'building', 27, PAST, '/free/loan-comparison'),
      post('financial-projections', 'optimizing', 43, PAST, '/free/monte-carlo-simulator'),
      post('scheduled', 'building', 1, FUTURE, '/free/loan-comparison'),
    ];
    const pairs = lessonToolPairs(posts, NOW, (href) => href !== '/free/monte-carlo-simulator/');
    assert.deepEqual(pairs.map((p) => [p.lesson.slug, p.tool.href]), [
      ['how-to-calculate-net-worth', '/free/multi-currency-net-worth/'],
      ['understanding-loan-terms', '/free/loan-comparison/'],
    ]);
    assert.equal(pairs[0].tool.key, 'netWorth');
    assert.equal(pairs[0].tool.preview, 'donut');
  });
});

describe('continue learning', () => {
  const order = readingOrder([
    post('c', 'building', 3),
    post('a', 'discovery', 1),
    post('b', 'discovery', 2),
    post('x', 'inclusive-finances', 2),
    post('z', 'psychology', 9, FUTURE),
  ], NOW);

  it('reading order is live ladder lessons by order', () => {
    assert.deepEqual(order.map((l) => l.slug), ['a', 'b', 'c']);
  });

  it('suggests the first unread lesson after the furthest read', () => {
    assert.equal(nextLesson(order, ['a'])?.slug, 'b');
    assert.equal(nextLesson(order, ['b'])?.slug, 'c');
  });

  it('after the last lesson, falls back to the earliest one skipped', () => {
    assert.equal(nextLesson(order, ['c'])?.slug, 'a');
    assert.equal(nextLesson(order, ['a', 'c'])?.slug, 'b');
  });

  it('returns null with no progress, unknown slugs, or everything read', () => {
    assert.equal(nextLesson(order, []), null);
    assert.equal(nextLesson(order, ['gone', 'x']), null);
    assert.equal(nextLesson(order, ['a', 'b', 'c']), null);
  });
});

