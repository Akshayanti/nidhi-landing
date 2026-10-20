import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLayeredReadingTime, getReadingTime, splitDepth } from './readingTime';

const words = (n: number, w = 'word') => Array.from({ length: n }, () => w).join(' ');

const depthBlock = (body: string) =>
  `<details class="lesson-depth">\n<summary class="disclosure">The evidence</summary>\n\n${body}\n\n</details>`;
const quickCheck = (body: string) =>
  `<details class="quick-check">\n<summary class="disclosure">Quick check: why?</summary>\n\n${body}\n\n</details>`;

test('getReadingTime counts the whole body, expanders included', () => {
  assert.equal(getReadingTime(words(500) + depthBlock(words(500))), 5);
});

test('getReadingTime ignores svg and tags, keeps at least one minute', () => {
  assert.equal(getReadingTime(`<svg><path d="${words(2000, 'M0')}"/></svg>`), 1);
  assert.equal(getReadingTime('rate < current'), 1);
});

test('splitDepth moves depth blocks out of the main path', () => {
  const { main, depth } = splitDepth(`intro ${depthBlock('deep')} outro`);
  assert.match(main, /intro/);
  assert.match(main, /outro/);
  assert.doesNotMatch(main, /deep/);
  assert.match(depth, /deep/);
});

test('a depth block summary is main-path text', () => {
  const { main, depth } = splitDepth(`intro ${depthBlock('deep')}`);
  assert.match(main, /The evidence/);
  assert.doesNotMatch(depth, /The evidence|summary|details/);
});

test('quick checks stay in the main path', () => {
  const { main, depth } = splitDepth(`intro ${quickCheck('answer')}`);
  assert.match(main, /answer/);
  assert.equal(depth, '');
});

test('a details nested inside a depth block belongs to it', () => {
  const text = `a ${depthBlock(`b ${quickCheck('inner')} c`)} after`;
  const { main, depth } = splitDepth(text);
  assert.match(depth, /inner/);
  assert.match(depth, / c/);
  assert.match(main, /The evidence/);
  assert.match(main, /after/);
  assert.doesNotMatch(main, /inner/);
});

test('class matching takes other classes and single quotes', () => {
  const { depth } = splitDepth(`<details class='x lesson-depth'><summary>s</summary>deep</details>`);
  assert.match(depth, /deep/);
});

test('an unclosed depth block runs to the end', () => {
  const { main, depth } = splitDepth(`intro <details class="lesson-depth">deep`);
  assert.match(main, /intro/);
  assert.match(depth, /deep/);
});

test('layered time: main, depth and total minutes', () => {
  const t = getLayeredReadingTime(words(1000) + depthBlock(words(1000)) + quickCheck(words(50)));
  assert.equal(t.main, 5); // 1000 + 50 words, plus both summaries
  assert.equal(t.depth, 4);
  assert.equal(t.total, 9);
});

test('layered time without depth blocks matches getReadingTime', () => {
  const body = words(1300);
  assert.deepEqual(getLayeredReadingTime(body), { main: 6, depth: 0, total: 6 });
});

test('depth rounds up: a short block is one minute, 260 words two', () => {
  assert.equal(getLayeredReadingTime(words(100) + depthBlock(words(20))).depth, 1);
  assert.equal(getLayeredReadingTime(words(100) + depthBlock(words(260))).depth, 2);
});
