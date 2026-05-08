#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { readFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { loadAllPosts, loadPost } from './lib/parse-markdown.js';

const TEMPLATE_PATH = join(import.meta.dirname, 'story-template.html');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'output', 'instagram');

/**
 * Basic HTML escape for text injected into the template.
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Apply **bold** markdown to escaped text.
 * Input should already be HTML-escaped.
 */
function applyBold(escaped) {
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Render escaped + bolded multi-line text as a stack of <div> lines.
 *
 * Each input line becomes its own <div>. Blank lines become <div>&nbsp;</div>
 * so they take up a full line-height and produce a real visual gap — this is
 * more reliable than <br/> which some renderers collapse between consecutive ones.
 *
 * Convenience: `||` anywhere in the value is treated as an explicit blank-line
 * separator. Useful inside quoted (single-line) YAML values where a real
 * newline isn't possible. (Inside block scalars `|`, just use a real blank
 * line — also works.) `||||` = two blank lines, and so on.
 */
function renderText(raw) {
  return raw
    .replace(/\|\|/g, '\n\n')
    .split('\n')
    .map(line => {
      const content = line === '' ? '&nbsp;' : applyBold(escapeHtml(line));
      return `<div>${content}</div>`;
    })
    .join('');
}

/**
 * Inject content into the template and screenshot a PNG.
 */
async function renderFrame(page, templateHtml, variant, contentHtml, opts = {}) {
  const { hashtag = '' } = opts;

  const html = templateHtml
    .replace(
      'id="story" class="story"',
      `id="story" class="story story-${variant}"`
    )
    .replace(
      '<div class="content" id="content"></div>',
      `<div class="content" id="content">${contentHtml}</div>`
    )
    .replace(
      '<div class="hashtag-corner" id="hashtag-corner"></div>',
      hashtag
        ? `<div class="hashtag-corner" id="hashtag-corner">${escapeHtml(hashtag)}</div>`
        : ''
    );

  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);

  // Auto-shrink content font if it overflows
  await page.evaluate(() => {
    const story = document.getElementById('story');
    const content = document.getElementById('content');
    if (!story || !content) return;

    const style = getComputedStyle(story);
    const padTop = parseFloat(style.paddingTop);
    const padBot = parseFloat(style.paddingBottom);
    const maxH = (story.offsetHeight - padTop - padBot) * 0.92;

    const baseFontSize = parseFloat(getComputedStyle(content).fontSize);
    if (content.scrollHeight <= maxH) return;

    let lo = baseFontSize * 0.55;
    let hi = baseFontSize;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      content.style.fontSize = `${mid}px`;
      if (content.scrollHeight <= maxH) lo = mid;
      else hi = mid;
    }
    content.style.fontSize = `${lo}px`;
  });
}

/**
 * Render all story frames for a single post.
 *
 * Poll questions are NOT rendered into PNGs — they go into the native IG poll
 * sticker when posting. The PNGs are brand-consistent backdrops:
 *
 *   Default mode (no story_answer):
 *     - frame-2-stat.png: big stat/insight. Doubles as backdrop for step 2
 *       (poll sticker) AND step 3 (link sticker). Works well when the poll is
 *       self-assessment and the stat is cohesive context, not a spoiler.
 *
 *   Quiz mode (story_answer set):
 *     - frame-2-poll.png: blank brand-chrome-only canvas. Backs step 2 so the
 *       native poll sticker reads cleanly with nothing competing underneath.
 *     - frame-2-answer.png: two-part layout — "ANSWER" + reveal text up top,
 *       continuing stat/insight below. Backs step 3 under the link sticker.
 *       The stat that would otherwise back step 2 is folded in here so the
 *       narrative continues instead of dropping on the answer frame.
 *
 * Quiz stickers were removed by IG — multi-option polls (up to 4) cover the
 * same interaction now. See PLAYBOOK.md §7 for the full cascade.
 */
/**
 * Render one day's worth of story frames (hook / stat-or-poll+answer / cta)
 * given a `cascade` sub-object shaped { hook, stat, answer, prompt, hashtag }.
 *
 * `filePrefix` is prepended to each PNG filename so multi-day campaigns
 * can share a directory without collision:
 *   - '' (default) → frame-1-hook.png, frame-2-stat.png, frame-3-cta.png
 *   - 'day2-'      → day2-frame-1-hook.png, day2-frame-2-stat.png, ...
 */
async function renderCascade(page, templateHtml, outDir, cascade, filePrefix = '') {
  const hasAnyContent = cascade.hook || cascade.stat || cascade.answer || cascade.prompt;
  if (!hasAnyContent) return [];

  const hasQuiz = !!cascade.answer;
  const rendered = [];

  if (cascade.hook) {
    const body = `<div>${renderText(cascade.hook)}</div>`;
    await renderFrame(page, templateHtml, 'hook', body, { hashtag: cascade.hashtag });
    const filepath = join(outDir, `${filePrefix}frame-1-hook.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  if (hasQuiz) {
    await renderFrame(page, templateHtml, 'poll', '', { hashtag: cascade.hashtag });
    const filepath = join(outDir, `${filePrefix}frame-2-poll.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  } else if (cascade.stat) {
    const body = `<div>${renderText(cascade.stat)}</div>`;
    await renderFrame(page, templateHtml, 'stat', body, { hashtag: cascade.hashtag });
    const filepath = join(outDir, `${filePrefix}frame-2-stat.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  if (hasQuiz) {
    const mainHtml = `<div class="answer-main">${renderText(cascade.answer)}</div>`;
    const statHtml = cascade.stat
      ? `<div class="answer-stat">${renderText(cascade.stat)}</div>`
      : '';
    const body = mainHtml + statHtml;
    await renderFrame(page, templateHtml, 'answer', body, { hashtag: cascade.hashtag });
    const filepath = join(outDir, `${filePrefix}frame-2-answer.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  if (cascade.prompt) {
    const body = `<div>${renderText(cascade.prompt)}</div>`;
    await renderFrame(page, templateHtml, 'cta', body, { hashtag: cascade.hashtag });
    const filepath = join(outDir, `${filePrefix}frame-3-cta.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  return rendered;
}

export async function renderStoriesForPost(post, browser) {
  const s = post.story || {};
  const day2 = s.day2 || {};
  const hasDay1 = s.hook || s.stat || s.answer || s.prompt;
  const hasDay2 = day2.hook || day2.stat || day2.answer || day2.prompt;
  if (!hasDay1 && !hasDay2) return { skipped: true };

  const outDir = join(OUTPUT_DIR, post.subDir, post.slug, 'stories');
  await mkdir(outDir, { recursive: true });

  // Clean stale frame-*.png and day2-frame-*.png files so the final output
  // dir reflects exactly what this render produced. Critical because quiz-
  // mode emits a different set of frames than default mode — and toggling
  // story_day2_* fields on/off needs to clean up abandoned day2 PNGs too.
  for (const name of await readdir(outDir).catch(() => [])) {
    if (/^(day2-)?frame-.*\.png$/.test(name)) {
      await unlink(join(outDir, name));
    }
  }

  const templateHtml = await readFile(TEMPLATE_PATH, 'utf-8');
  const page = await browser.newPage();
  const rendered = [];

  // Day 1 — standard cascade, no filename prefix
  if (hasDay1) {
    const day1Cascade = {
      hook: s.hook,
      stat: s.stat,
      answer: s.answer,
      prompt: s.prompt,
      hashtag: s.hashtag,
    };
    rendered.push(...await renderCascade(page, templateHtml, outDir, day1Cascade));
  }

  // Day 2 — optional, milestone posts only. Same cascade shape, day2- prefix.
  // Use story_day2_hashtag to override the Day 1 hashtag sticker when needed.
  if (hasDay2) {
    const day2Cascade = {
      hook: day2.hook,
      stat: day2.stat,
      answer: day2.answer,
      prompt: day2.prompt,
      hashtag: day2.hashtag || s.hashtag,
    };
    rendered.push(...await renderCascade(page, templateHtml, outDir, day2Cascade, 'day2-'));
  }

  await page.close();
  return { rendered, outDir };
}

async function main() {
  const targetFile = process.argv[2];

  console.log('Starting Instagram story renderer...\n');

  const browser = await puppeteer.launch({ headless: true });

  try {
    const posts = targetFile
      ? [await loadPost(targetFile)]
      : await loadAllPosts();

    let skippedCount = 0;
    let renderedCount = 0;

    for (const post of posts) {
      const result = await renderStoriesForPost(post, browser);
      if (result.skipped) {
        skippedCount++;
        continue;
      }
      renderedCount++;
      const relOut = result.outDir.replace(OUTPUT_DIR + '/', '');
      console.log(`✓ ${post.title}`);
      console.log(`  → ${result.rendered.length} frames → output/instagram/${relOut}/\n`);
    }

    console.log(`Done. Rendered ${renderedCount} post(s); skipped ${skippedCount} without story fields.`);
  } finally {
    await browser.close();
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Story render failed:', err);
    process.exit(1);
  });
}
