/**
 * /llms.txt (#426). The route hands `buildLlmsTxt` only published content, so
 * these tests check what the builder does with what it is given: every level
 * with a lesson gets its section, in path order; an empty level is left out; a
 * lesson in a level nobody named fails the build instead of vanishing; and the
 * file's own prose keeps the site's style and voice rules.
 *
 * The route's filter (scheduled lessons left out) is `getPathPosts`, the same
 * one the learning path uses; the check below reads the route's source to
 * make sure it stays that way.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLlmsTxt, type LlmsInput } from './llmsTxt.ts';

const ROOT = join(import.meta.dirname, '..', '..');

function input(overrides: Partial<LlmsInput> = {}): LlmsInput {
  return {
    site: 'https://nidhi.today',
    lessons: [
      { title: 'Second', description: 'B.', level: 'building', href: '/blog/b/' },
      { title: 'First', description: 'A.', level: 'discovery', href: '/blog/a/' },
      { title: 'Guide', description: 'G.', level: 'inclusive-finances', href: '/blog/g/' },
    ],
    levelOrder: ['discovery', 'building', 'mastery', 'inclusive-finances'],
    levels: {
      discovery: { name: 'Discovery', summary: 'Basics' },
      building: { name: 'Building', summary: 'Next' },
      mastery: { name: 'Mastery', summary: 'Later' },
      'inclusive-finances': { name: 'Inclusive Finances', summary: 'Other households' },
    },
    tools: [{ title: 'Loan comparison', description: 'Two to five offers.', href: '/free/loan-comparison/' }],
    guides: [{ title: 'How do I?', description: 'Like this.', href: '/how-to/x/' }],
    pages: [{ title: 'Home', description: 'The start.', href: '/' }],
    languages: [{ label: 'हिन्दी', home: '/hi/', tools: '/hi/free/' }],
    ...overrides,
  };
}

describe('llms.txt', () => {
  it('gives every level with a lesson its section, in path order, with absolute links', () => {
    const text = buildLlmsTxt(input());
    const headings = text.split('\n').filter((l) => l.startsWith('## Learn: '));
    assert.deepEqual(headings, ['## Learn: Discovery (Basics)', '## Learn: Building (Next)', '## Learn: Inclusive Finances (Other households)']);
    assert.match(text, /^- \[First\]\(https:\/\/nidhi\.today\/blog\/a\/\): A\.$/m);
    assert.match(text, /^- \[Loan comparison\]\(https:\/\/nidhi\.today\/free\/loan-comparison\/\): Two to five offers\.$/m);
  });

  it('leaves out a level with no published lesson', () => {
    assert.doesNotMatch(buildLlmsTxt(input()), /Mastery/);
  });

  it('fails on a lesson whose level has no section, instead of dropping it', () => {
    const lessons = [...input().lessons, { title: 'Lost', description: 'L.', level: 'unknown', href: '/blog/l/' }];
    assert.throws(() => buildLlmsTxt(input({ lessons })), /no section for level unknown/);
  });

  it('keeps a description on one line', () => {
    const tools = [{ title: 'T', description: 'One\n  two.', href: '/free/t/' }];
    assert.match(buildLlmsTxt(input({ tools })), /^- \[T\]\(https:\/\/nidhi\.today\/free\/t\/\): One two\.$/m);
  });

  it('writes no em dash and no double dash (CLAUDE.md, Style Rules)', () => {
    assert.doesNotMatch(buildLlmsTxt(input()), new RegExp(`${String.fromCharCode(0x2014)}|-{2}`));
  });

  it('describes rather than instructs in its own prose (CLAUDE.md, Editorial Voice)', () => {
    // The fixture's own lines are neutral, so anything caught here is the builder's.
    const text = buildLlmsTxt(input()).toLowerCase();
    for (const phrase of ['you should', 'the right sequence', 'the most important', 'the most effective', 'proven', 'real-time', 'comes before investing']) {
      assert.ok(!text.includes(phrase), `llms.txt prose says "${phrase}"`);
    }
  });

  it('says the lessons are not translated yet, in line with CLAUDE.md', () => {
    assert.match(buildLlmsTxt(input()), /written in English and are not translated yet/);
  });

  it('takes its lessons from the learning path, which leaves scheduled ones out', () => {
    const route = readFileSync(join(ROOT, 'src', 'pages', 'llms.txt.ts'), 'utf8');
    assert.match(route, /getPathPosts\(\)/);
    assert.match(route, /getGuides\(\)/);
    assert.doesNotMatch(route, /getCollection\(/, 'read lessons through getPathPosts, which applies the publish date');
  });
});
