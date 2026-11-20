/**
 * Unit tests for scripts/lib/parse-markdown.js: an Instagram post written in
 * Markdown, parsed into the caption, the slides and the story fields the
 * renderers draw. The post is the fixture scripts/fixtures/instagram-post.md.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { parseInstagramPost } from './parse-markdown.js';

const SOURCE = fs.readFileSync('scripts/fixtures/instagram-post.md', 'utf8');
const post = parseInstagramPost(SOURCE, 'series-1/14-budget-split.md');

describe('parse-markdown: where the post is', () => {
  it('takes the slug from the file name and keeps the folder', () => {
    assert.equal(post.slug, '14-budget-split');
    assert.equal(post.subDir, 'series-1');
    assert.equal(post.relPath, 'series-1/14-budget-split.md');
  });

  it('has an empty folder for a post at the top level', () => {
    const top = parseInstagramPost(SOURCE, '14-budget-split.md');
    assert.equal(top.slug, '14-budget-split');
    assert.equal(top.subDir, '');
  });
});

describe('parse-markdown: frontmatter', () => {
  it('reads plain and quoted values, a colon or a # inside a value included', () => {
    assert.equal(post.title, 'The 50/30/20 split: where it came from');
    assert.equal(post.blogUrl, 'https://nidhi.today/blog/budget-split/');
    assert.equal(post.hashtags, '#budgeting #moneybasics');
    assert.equal(post.postTime, '12:15 IST');
    assert.equal(post.category, 'BUDGETING');
    assert.equal(post.series, 'Basics of Money · 14/16');
  });

  it('gives an empty string for a key the post does not set', () => {
    assert.equal(post.byline, '');
    assert.equal(post.story.hashtag, '');
    assert.equal(post.story.stat, '');
  });

  it('joins a folded value into one line and keeps the lines of a block value, blank ones too', () => {
    assert.equal(post.story.insight, 'The split is a starting point, not a rule.');
    assert.equal(post.story.blogExtra, 'Line one of the extra.\n\nLine three, after a blank line.');
  });

  it('reads the key that follows a block value', () => {
    assert.equal(post.story.renderHookPng, true);
  });

  it('skips a comment line', () => {
    assert.equal(JSON.stringify(post).includes('A comment line'), false);
  });
});

describe('parse-markdown: story fields', () => {
  it('splits poll options on the bar and drops empty ones', () => {
    assert.deepEqual(post.story.pollOpts, ['Yes, easily', "No, I'd panic", 'Not sure']);
    assert.equal(post.story.pollQ, 'Could you cover a surprise bill?');
    assert.equal(post.story.hook, 'Does your budget have a name?');
  });

  it('reads the insight slide as a number, and 0 when it is missing or not a number', () => {
    assert.equal(post.story.insightSlide, 3);
    assert.equal(post.story.day2.insightSlide, 0);
    assert.equal(parseInstagramPost('---\ntitle: x\n---\n', 'x.md').story.insightSlide, 0);
  });

  it('draws the hook frame only when the post asks for it with "true"', () => {
    assert.equal(post.story.renderHookPng, true);
    assert.equal(post.story.day2.renderHookPng, false);
    assert.equal(parseInstagramPost('---\nstory_render_hook_png: yes\n---\n', 'x.md').story.renderHookPng, false);
  });

  it('keeps the second day\'s fields apart from the first day\'s', () => {
    assert.deepEqual(post.story.day2.pollOpts, ['One', 'Two']);
    assert.equal(post.story.day2.hook, '');
    assert.equal(post.story.day2.pollQ, '');
  });
});

describe('parse-markdown: caption', () => {
  it('is the Caption section up to the next rule, hashtags and all', () => {
    assert.equal(post.caption, 'A budget split is a way to look at spending.\nMethod: needs, wants, savings.\n\n#budgeting #moneybasics');
  });

  it('is empty when the post has no Caption section', () => {
    assert.equal(parseInstagramPost('---\ntitle: x\n---\n\n## Slide 1\n\nOnly a slide.', 'x.md').caption, '');
  });
});

describe('parse-markdown: slides', () => {
  it('finds every slide, in order, and nothing above the first one', () => {
    assert.equal(post.totalSlides, 4);
    assert.deepEqual(post.slides.map((s) => s.number), [1, 2, 3, 4]);
    assert.equal(JSON.stringify(post.slides).includes('Internal notes'), false);
  });

  it('makes slide 1 a hook and any other slide prose unless the heading names a layout', () => {
    assert.deepEqual(post.slides.map((s) => s.layout), ['hook', 'stat', 'compare', 'closer']);
    const plain = parseInstagramPost('## Slide 1 (stat)\n\nA\n\n---\n\n## Slide 2\n\nB', 'x.md');
    assert.deepEqual(plain.slides.map((s) => s.layout), ['stat', 'prose']);
  });

  it('keeps a slide with no fields as text only', () => {
    assert.deepEqual({ ...post.slides[0] }, { number: 1, layout: 'hook', fields: {}, text: 'Where does the 50/30/20 split come from?', handle: [] });
  });

  it('lifts the known "key: value" lines into fields and leaves no text behind', () => {
    assert.deepEqual(post.slides[1].fields, { eyebrow: 'THE SPLIT', hero: '50 / 30 / 20', caption: 'needs, wants, savings' });
    assert.equal(post.slides[1].text, '');
  });

  it('leaves a line that only looks like a field in the text: a capitalised word or a key it does not know', () => {
    const slide = post.slides[2];
    assert.deepEqual(slide.fields, {
      left_title: 'Fits', left: 'Stable income', right_title: 'Strains', right: 'High rent cities', source: 'Warren and Tyagi, 2005',
    });
    assert.equal(slide.text, 'Method: compare your own numbers first.\nunknown_key: stays in the body');
  });

  it('takes "!!" lines out as notes for the designer, indented or not, and out of the slide', () => {
    assert.deepEqual(post.slides[1].handle, ['handle: hero is the number, keep it large']);
    assert.deepEqual(post.slides[3].handle, ['handle: closer, no eyebrow']);
    assert.deepEqual(post.slides[3].fields, { save: 'Save this for your next budget review', read: 'Full lesson at the link in bio' });
    assert.equal(JSON.stringify(post.slides.map((s) => [s.text, s.fields])).includes('!!'), false);
  });

  it('reads the last slide to the end of the file', () => {
    const two = parseInstagramPost('## Slide 1\n\nFirst.\n\n---\n\n## Slide 2\n\nLast line one.\nLast line two.\n', 'x.md');
    assert.equal(two.slides[1].text, 'Last line one.\nLast line two.');
  });
});

describe('parse-markdown: a file with no frontmatter', () => {
  it('still gives the slides, with every field empty', () => {
    const bare = parseInstagramPost('## Slide 1\n\nJust this.', 'notes/bare.md');
    assert.equal(bare.title, '');
    assert.equal(bare.blogUrl, '');
    assert.deepEqual(bare.story.pollOpts, []);
    assert.equal(bare.totalSlides, 1);
    assert.equal(bare.slides[0].text, 'Just this.');
  });
});

describe('parse-markdown: files written a little differently (#723)', () => {
  it('reads the keys after a block value that has no lines', () => {
    const empty = parseInstagramPost('---\nstory_blog_extra: |\ntitle: "After the block"\ncategory: "BUDGETING"\n---\n\n## Slide 1\n\nHello\n', 'a.md');
    assert.equal(empty.title, 'After the block');
    assert.equal(empty.category, 'BUDGETING');
    assert.equal(empty.story.blogExtra, '');
  });

  it('reads a file with Windows line endings the same as one without', () => {
    const windows = parseInstagramPost(SOURCE.replace(/\n/g, '\r\n'), 'series-1/14-budget-split.md');
    assert.deepEqual(windows, post);
  });

  it('turns \\" inside a quoted value into a quote mark', () => {
    const quoted = parseInstagramPost('---\ntitle: "He said \\"hi\\""\n---\n\n## Slide 1\n\nHello\n', 'a.md');
    assert.equal(quoted.title, 'He said "hi"');
  });
});
