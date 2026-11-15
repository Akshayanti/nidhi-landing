import './testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const {
  COMMON_GUIDES, FEATURED_GUIDES, GUIDE_MAX_MINUTES,
  assertGuideLists, assertGuides, guidePath, guideReadingMinutes, guideText, situationPath,
} = await import('./guides.ts');
type Guides = Parameters<typeof assertGuides>[0];
type Lessons = Parameters<typeof assertGuides>[1];

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

/** A guide's data with only what the checks read; every text field short. */
function guide(slug: string, over: Record<string, unknown> = {}) {
  return {
    id: slug,
    data: {
      slug, title: 'A question?', outcome: 'An outcome.', answer: ['An answer.'],
      scope: { can: 'Can.', cannot: 'Cannot.' }, needs: ['A statement'],
      form: 'steps',
      steps: [{ action: 'Do.', why: 'Because.' }, { action: 'Do.', why: 'Because.' }, { action: 'Do.', why: 'Because.' }],
      stopHere: 'Enough.', leftToYou: 'Yours.', dependsOn: ['One', 'Two'],
      lessons: ['lesson-a'], related: [], group: 'month',
      pubDate: new Date('2026-11-10'), lastChecked: new Date('2026-11-10'),
      ...over,
    },
  };
}
const lesson = (slug: string, body = '', data: Record<string, unknown> = {}) => ({ id: slug, body, data: { slug, ...data } });
const check = (guides: unknown[], lessons: unknown[] = [lesson('lesson-a')]) =>
  assertGuides(guides as Guides, lessons as Lessons);

describe('a guide\'s reading time', () => {
  it('counts everything the reader reads, at 200 words a minute, never under one', () => {
    assert.equal(guideReadingMinutes(guide('g').data as never), 1);
    assert.equal(guideReadingMinutes(guide('g', { outcome: words(500) }).data as never), 3);
    assert.equal(guideReadingMinutes(guide('g', { outcome: words(700) }).data as never), 4);
  });

  it('includes the protective strip and each step\'s example and caution', () => {
    const text = guideText(guide('g', {
      protective: { heading: 'PROT', now: ['NOW'], canWait: ['WAIT'], note: 'NOTE' },
      steps: [{ action: 'A', why: 'W', example: 'EXAMPLE', caution: 'CAUTION' }],
    }).data as never);
    for (const part of ['PROT', 'NOW', 'WAIT', 'NOTE', 'EXAMPLE', 'CAUTION']) assert.ok(text.includes(part), part);
  });
});

describe('assertGuides', () => {
  it('passes a sound set', () => {
    assert.doesNotThrow(() => check([guide('a', { related: ['b'] }), guide('b', { related: ['a'] })]));
  });

  it('two guides cannot share a slug', () => {
    assert.throws(() => check([guide('a'), guide('a')]), /Two guides share the slug "a"/);
  });

  it('a lesson a guide names has to exist', () => {
    assert.throws(() => check([guide('a', { lessons: ['lesson-a', 'gone'] })]), /lesson "gone" does not exist/);
  });

  // The only thing that keeps a guide's figure and its lesson's figure the same.
  it('a shared figure has to be in the lesson it names, in the text or the frontmatter', () => {
    const shared = guide('a', { sharedFigures: [{ lesson: 'lesson-a', value: '3 to 6 months' }] });
    assert.throws(() => check([shared], [lesson('lesson-a', 'It says 6 to 12 months now.')]), /no longer contains "3 to 6 months"/);
    assert.doesNotThrow(() => check([shared], [lesson('lesson-a', 'Often 3 to 6 months of costs.')]));
    assert.doesNotThrow(() => check([shared], [lesson('lesson-a', '', { tldr: ['Often 3 to 6 months of costs.'] })]));
    assert.throws(
      () => check([guide('a', { sharedFigures: [{ lesson: 'gone', value: 'x' }] })]),
      /shared figure names lesson "gone", which does not exist/,
    );
  });

  it('a related question is another guide that exists', () => {
    assert.throws(() => check([guide('a', { related: ['a'] })]), /lists itself as a related question/);
    assert.throws(() => check([guide('a', { related: ['gone'] })]), /related guide "gone" does not exist/);
  });

  it('a guide over the reading limit fails the build', () => {
    assert.equal(GUIDE_MAX_MINUTES, 4);
    assert.doesNotThrow(() => check([guide('a', { outcome: words(800) })]));
    assert.throws(() => check([guide('a', { outcome: words(1000) })]), /reads in 5 minutes; the limit is 4/);
  });

  it('a worked example needs its own heading', () => {
    assert.throws(() => check([guide('a', { form: 'example' })]), /a worked example needs a stepsHeading/);
    assert.doesNotThrow(() => check([guide('a', { form: 'example', stepsHeading: 'See it' })]));
  });

  it('a correction cannot be dated after the last check', () => {
    const corrections = [{ date: new Date('2026-11-12'), note: 'Fixed.' }];
    assert.throws(() => check([guide('a', { corrections })]), /a correction dated after lastChecked/);
    assert.doesNotThrow(() => check([guide('a', { corrections, lastChecked: new Date('2026-11-12') })]));
  });
});

describe('lists of guides kept outside the guides', () => {
  const written = readdirSync(new URL('../content/guides/', import.meta.url))
    .filter((f) => f.endsWith('.md'))
    .map((f) => /^slug:\s*["']?([a-z0-9-]+)/m.exec(readFileSync(new URL(`../content/guides/${f}`, import.meta.url), 'utf8'))?.[1])
    .filter((s): s is string => Boolean(s));

  it('the featured and common guides, and every search phrase, name a guide that is written', () => {
    assert.ok(written.length > 0);
    assert.doesNotThrow(() => assertGuideLists(written.map((s) => guide(s)) as unknown as Guides));
  });

  it('a list that names a guide that is gone fails the build', () => {
    const without = written.filter((s) => s !== FEATURED_GUIDES[0]);
    assert.throws(() => assertGuideLists(without.map((s) => guide(s)) as unknown as Guides), /names "[a-z0-9-]+", which is no guide/);
    assert.equal(COMMON_GUIDES.length, 3);
    assert.equal(FEATURED_GUIDES.length, 3);
  });
});

describe('guide addresses', () => {
  it('sit under /how-to/ with a trailing slash', () => {
    assert.equal(guidePath('how-do-i-list-what-i-owe'), '/how-to/how-do-i-list-what-i-owe/');
    assert.equal(situationPath('moving-country'), '/how-to/situation/moving-country/');
  });
});
