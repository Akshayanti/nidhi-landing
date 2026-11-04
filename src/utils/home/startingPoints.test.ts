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
  levelCounts,
  liveTools,
  resolveSituations,
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

describe('situations', () => {
  const posts = [post('managing-money-across-currencies', 'building', 29), post('understanding-loan-terms', 'building', 27)];

  it('each one is a lesson and a tool, currencies first', () => {
    const sits = resolveSituations(posts, NOW);
    assert.deepEqual(sits.map((s) => [s.id, s.lesson.href, s.tool.href, s.tool.key]), [
      ['currencies', '/blog/managing-money-across-currencies/', '/free/multi-currency-net-worth/', 'netWorth'],
      ['loans', '/blog/understanding-loan-terms/', '/free/loan-comparison/', 'loanComparison'],
    ]);
  });

  it('fails the build rather than show a chain with a step missing', () => {
    assert.throws(() => resolveSituations([posts[0]], NOW), /understanding-loan-terms/);
    assert.throws(() => resolveSituations([posts[0], post('understanding-loan-terms', 'building', 27, FUTURE)], NOW), /not published/);
    assert.throws(() => resolveSituations(posts, NOW, (href) => href !== '/free/loan-comparison/'), /not released/);
  });

  it('their lessons are in the build-time slug check', () => {
    assert.ok(homepageSlugs().includes('managing-money-across-currencies'));
    assert.ok(homepageSlugs().includes('understanding-loan-terms'));
  });
});

describe('tool cards', () => {
  it('lists live tools in the section\'s order, leaving out gated ones', () => {
    assert.deepEqual(liveTools(() => true).map((t) => t.key), ['netWorth', 'loanComparison', 'investOrPayOff', 'inflation', 'monteCarlo']);
    assert.deepEqual(
      liveTools((href) => href !== '/free/invest-or-pay-off/').map((t) => t.href),
      ['/free/multi-currency-net-worth/', '/free/loan-comparison/', '/free/inflation-calculator/', '/free/monte-carlo-simulator/'],
    );
  });

  it('every tool has its card copy in the catalog', () => {
    for (const { key } of liveTools(() => true)) {
      const card = en.home.toolCards[key];
      assert.ok(card.question && card.name && card.desc, key);
    }
  });
});
