/**
 * Unit tests for src/utils/levelHelper.ts and src/utils/levelConcepts.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { goalsFor, suggestLevel as suggestFrom } from './levelHelper.ts';
import { assertConceptSlugs, CONCEPTS, conceptsFor } from './levelConcepts.ts';

/** As the page calls it: with the ideas of the eligible levels. */
const suggestLevel = (ticked: ReadonlySet<string>, goalId: string | null, eligible: readonly string[]) =>
  suggestFrom(ticked, goalId, eligible, conceptsFor(eligible));

const NOW_LIVE = ['discovery', 'building', 'psychology'];
const ALL_FOUR = ['discovery', 'building', 'psychology', 'optimizing'];
const ids = (level: string) => CONCEPTS.filter((c) => c.level === level).map((c) => c.id);
const tick = (...levels: string[]) => new Set(levels.flatMap(ids));

describe('eligible levels', () => {
  it('asks only about levels that are fully published', () => {
    assert.deepEqual([...new Set(conceptsFor(NOW_LIVE).map((c) => c.level))], ['discovery', 'building']);
    assert.ok(conceptsFor(ALL_FOUR).some((c) => c.level === 'optimizing'));
  });

  it('offers the optimizing goal only once optimizing is fully published', () => {
    assert.ok(!goalsFor(NOW_LIVE).some((g) => g.level === 'optimizing'));
    assert.ok(goalsFor(ALL_FOUR).some((g) => g.level === 'optimizing'));
  });

  it('never suggests a level that is not eligible', () => {
    const s = suggestLevel(tick('discovery', 'building'), 'refine', NOW_LIVE);
    assert.notEqual(s.level, 'optimizing');
    assert.notEqual(s.also, 'optimizing');
  });
});

describe('suggestLevel', () => {
  it('suggests Discovery, with lessons for every idea, when nothing is ticked', () => {
    const s = suggestLevel(new Set(), 'unsure', NOW_LIVE);
    assert.equal(s.level, 'discovery');
    assert.equal(s.reason, 'foundation');
    assert.equal(s.gapSlugs.length, 4);
  });

  it('lists lessons only for the ideas not ticked', () => {
    const s = suggestLevel(new Set(['net-worth', 'inflation']), 'unsure', NOW_LIVE);
    assert.equal(s.level, 'discovery');
    assert.deepEqual(s.gapSlugs, ['liabilities', 'emergency-fund']);
  });

  it('treats three of four ideas as known', () => {
    const s = suggestLevel(new Set(['net-worth', 'interest', 'emergency-fund']), 'unsure', NOW_LIVE);
    assert.equal(s.level, 'building');
  });

  it('puts missing foundations before an investing goal, with the goal as the next step', () => {
    const s = suggestLevel(new Set(), 'invest', NOW_LIVE);
    assert.equal(s.level, 'discovery');
    assert.equal(s.also, 'building');
  });

  it('follows the goal when the reader has its foundations', () => {
    const s = suggestLevel(tick('discovery'), 'invest', NOW_LIVE);
    assert.equal(s.level, 'building');
    assert.equal(s.reason, 'goal');
  });

  it('suggests Psychology for following through, unless Discovery is missing', () => {
    assert.equal(suggestLevel(tick('discovery'), 'habits', NOW_LIVE).level, 'psychology');
    const early = suggestLevel(new Set(), 'habits', NOW_LIVE);
    assert.equal(early.level, 'discovery');
    assert.equal(early.also, 'psychology');
  });

  it('points a reader who knows the goal level onward to their next gap', () => {
    const s = suggestLevel(tick('discovery'), 'picture', NOW_LIVE);
    assert.equal(s.level, 'discovery');
    assert.equal(s.reason, 'goal-known');
    assert.equal(s.also, 'building');
  });

  it('suggests Psychology when every eligible idea is ticked and no goal is given', () => {
    const s = suggestLevel(tick('discovery', 'building'), 'unsure', NOW_LIVE);
    assert.equal(s.level, 'psychology');
    assert.equal(s.reason, 'all-known');
  });

  it('suggests Optimizing once it is eligible and the earlier levels are known', () => {
    const s = suggestLevel(tick('discovery', 'building'), 'refine', ALL_FOUR);
    assert.equal(s.level, 'optimizing');
    assert.equal(s.gapSlugs.length, 4);
  });

  it('sends a refine goal back to Building when Building ideas are missing', () => {
    const s = suggestLevel(tick('discovery'), 'refine', ALL_FOUR);
    assert.equal(s.level, 'building');
    assert.equal(s.also, 'optimizing');
  });
});

describe('what the island ships', () => {
  // An island's imports end up in its script. The full list of ideas names
  // lessons in levels that are not published, so the island gets its ideas as
  // a prop and must not import the list (#464).
  it('keeps the list of ideas out of the learning path island', () => {
    const island = readFileSync('src/components/LearnHome.tsx', 'utf8');
    assert.doesNotMatch(island, /levelConcepts/);
    const helper = readFileSync('src/utils/levelHelper.ts', 'utf8');
    assert.doesNotMatch(helper, /from '\.\/levelConcepts/);
    for (const { slug } of CONCEPTS) {
      assert.ok(!island.includes(`'${slug}'`) && !helper.includes(`'${slug}'`), `${slug} is named in code the island ships`);
    }
  });

  it('hands the island only the ideas of published levels', () => {
    const slugs = conceptsFor(NOW_LIVE).map((c) => c.slug);
    assert.equal(slugs.length, 8);
    assert.ok(!slugs.includes('fee-optimization'));
  });
});

describe('assertConceptSlugs', () => {
  it('passes when every idea has its lesson', () => {
    assert.doesNotThrow(() => assertConceptSlugs(new Set(CONCEPTS.map((c) => c.slug))));
  });

  it('fails when a lesson is missing', () => {
    assert.throws(() => assertConceptSlugs(new Set()), /Level helper ideas name lessons/);
  });
});
