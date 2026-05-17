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
 * Pick the eyebrow chip text for a story frame.
 *
 * Mirrors the carousel `buildEyebrow` precedence so feed and stories carry
 * the same brand chip when a post sets `series` or `category`. Series 1
 * posts that don't set either field will render no chip (the chrome treats
 * an empty eyebrow as no rule + no text).
 */
function buildStoryEyebrow(post) {
  return post.series || post.category || '';
}

/**
 * Inject content into the template and screenshot a PNG.
 *
 * `eyebrow` and `hashtag` are optional brand chrome bits. Empty string
 * means "render nothing" (the rule before the eyebrow chip is hidden via
 * `:not(:empty)`, and the hashtag node simply renders empty text).
 */
async function renderFrame(page, templateHtml, variant, contentHtml, opts = {}) {
  const { hashtag = '', eyebrow = '' } = opts;

  const html = templateHtml
    .replace(
      'id="story" class="story"',
      `id="story" class="story story-${variant}"`
    )
    .replace(
      '<div class="eyebrow" id="eyebrow"></div>',
      eyebrow
        ? `<div class="eyebrow" id="eyebrow">${escapeHtml(eyebrow).toUpperCase()}</div>`
        : '<div class="eyebrow" id="eyebrow"></div>'
    )
    .replace(
      '<div class="content" id="content"></div>',
      `<div class="content" id="content">${contentHtml}</div>`
    )
    .replace(
      '<div class="hashtag" id="hashtag"></div>',
      hashtag
        ? `<div class="hashtag" id="hashtag">${escapeHtml(hashtag)}</div>`
        : '<div class="hashtag" id="hashtag"></div>'
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
 * Render the story-frame PNGs for one day's cascade.
 *
 * Active cascade (decision #38, May 2026):
 *
 *   1. Announce: tap-to-post share of the carousel + `story_hook` typed as
 *      overlay in IG composer. NO PNG by default. `frame-1-hook.png` only
 *      emits when the post sets `story_render_hook_png: true` (opt-in for
 *      milestone teasers, beta launches, posts that ship before the carousel).
 *
 *   2. Engage — brand-chrome-only canvas (`frame-2-poll.png`) under the
 *      native IG poll sticker. Poll question + options come from
 *      `story_poll_q` / `story_poll_opts`, typed into the sticker on post
 *      day; the PNG itself is bare paper with the eyebrow chip + handle.
 *
 *   3. Insight — tap-to-post re-share of a chosen carousel slide (number in
 *      `story_insight_slide`) with `story_insight` typed as overlay. NO PNG.
 *
 *   4. Beyond — designed frame (`frame-4-extra.png`) carrying content from
 *      the blog post that the carousel didn't include, paired with the link
 *      sticker pointing to the full post.
 *
 * Deprecated frames still emitted for legacy Series 1 posts (decisions #36,
 * #37, #38): frame-2-stat.png (story_stat), frame-2-answer.png (story_answer),
 * frame-3-cta.png (story_prompt). New posts must not set those fields.
 *
 * `filePrefix` is prepended to every PNG name so a Day 2 cascade can share
 * the same directory: '' → frame-*.png, 'day2-' → day2-frame-*.png.
 */
async function renderCascade(page, templateHtml, outDir, cascade, filePrefix = '') {
  const hasAnyContent =
    cascade.hook || cascade.pollQ || cascade.insight || cascade.blogExtra ||
    cascade.stat || cascade.answer || cascade.prompt;
  if (!hasAnyContent) return [];

  const rendered = [];
  // Same chrome on every frame in the cascade. Eyebrow + hashtag come from
  // the post / cascade and stay constant so the frames read as a series.
  const chrome = { hashtag: cascade.hashtag, eyebrow: cascade.eyebrow };

  // ---- Frame 1: hook (opt-in only, legacy fallback) ----
  // Default cascade does NOT emit a PNG for frame 1. story_hook is overlay
  // text typed in IG composer over a tap-to-post share of the carousel.
  // Opt in by setting `story_render_hook_png: true` in frontmatter when a
  // post genuinely needs a standalone first frame (milestone teasers, beta
  // launches, posts that ship before the carousel). See PLAYBOOK §7, #39.
  if (cascade.hook && cascade.renderHookPng) {
    const body = `<div>${renderText(cascade.hook)}</div>`;
    await renderFrame(page, templateHtml, 'hook', body, chrome);
    const filepath = join(outDir, `${filePrefix}frame-1-hook.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // ---- Frame 2: poll backdrop ----
  // Brand-chrome-only canvas under the native IG poll sticker.
  if (cascade.pollQ) {
    await renderFrame(page, templateHtml, 'poll', '', chrome);
    const filepath = join(outDir, `${filePrefix}frame-2-poll.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // ---- Frame 4: blog extra (designed body) ----
  // Frame 3 is a manual tap-to-post share in IG composer (no PNG); this is
  // the next rendered frame.
  if (cascade.blogExtra) {
    const body = `<div>${renderText(cascade.blogExtra)}</div>`;
    await renderFrame(page, templateHtml, 'extra', body, chrome);
    const filepath = join(outDir, `${filePrefix}frame-4-extra.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // ---- Legacy frames (deprecated, Series 1 only) ----
  // These are intentionally rendered AFTER the active cascade so the file
  // order reflects the active flow first, with legacy fallbacks at the end.
  if (cascade.stat && !cascade.pollQ /* cascade.pollQ already rendered the new poll backdrop */) {
    const body = `<div>${renderText(cascade.stat)}</div>`;
    await renderFrame(page, templateHtml, 'stat', body, chrome);
    const filepath = join(outDir, `${filePrefix}frame-2-stat.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  if (cascade.answer) {
    const mainHtml = `<div class="answer-main">${renderText(cascade.answer)}</div>`;
    const statHtml = cascade.stat
      ? `<div class="answer-stat">${renderText(cascade.stat)}</div>`
      : '';
    const body = mainHtml + statHtml;
    await renderFrame(page, templateHtml, 'answer', body, chrome);
    const filepath = join(outDir, `${filePrefix}frame-2-answer.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  if (cascade.prompt) {
    const body = `<div>${renderText(cascade.prompt)}</div>`;
    await renderFrame(page, templateHtml, 'cta', body, chrome);
    const filepath = join(outDir, `${filePrefix}frame-3-cta.png`);
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  return rendered;
}

export async function renderStoriesForPost(post, browser) {
  const s = post.story || {};
  const day2 = s.day2 || {};
  const hasDay1 =
    s.hook || s.pollQ || s.insight || s.blogExtra ||
    s.stat || s.answer || s.prompt;
  const hasDay2 =
    day2.hook || day2.pollQ || day2.insight || day2.blogExtra ||
    day2.stat || day2.answer || day2.prompt;
  if (!hasDay1 && !hasDay2) return { skipped: true };

  const outDir = join(OUTPUT_DIR, post.subDir, post.slug, 'stories');
  await mkdir(outDir, { recursive: true });

  // Clean stale frame-*.png and day2-frame-*.png files so the final output
  // dir reflects exactly what this render produced. Critical because the
  // active cascade (frame-2-poll, frame-4-extra) emits a different set
  // than the legacy cascade (frame-2-stat, frame-3-cta), and toggling
  // story_day2_* fields on/off needs to clean up abandoned day2 PNGs too.
  for (const name of await readdir(outDir).catch(() => [])) {
    if (/^(day2-)?frame-.*\.png$/.test(name)) {
      await unlink(join(outDir, name));
    }
  }

  const templateHtml = await readFile(TEMPLATE_PATH, 'utf-8');
  const page = await browser.newPage();
  const rendered = [];

  // Eyebrow chip: post.series wins over post.category. Both unset → no chip.
  // Series 1 posts that predate `series`/`category` simply render no eyebrow,
  // so legacy Series 1 stories stay clean if ever re-rendered.
  const eyebrow = buildStoryEyebrow(post);

  // Day 1 — standard cascade, no filename prefix
  if (hasDay1) {
    const day1Cascade = {
      hook: s.hook,
      pollQ: s.pollQ,
      insight: s.insight,           // metadata only, no PNG emitted
      insightSlide: s.insightSlide, // metadata only, no PNG emitted
      blogExtra: s.blogExtra,
      hashtag: s.hashtag,
      renderHookPng: s.renderHookPng,
      eyebrow,
      // Legacy fields (Series 1 only)
      stat: s.stat,
      answer: s.answer,
      prompt: s.prompt,
    };
    rendered.push(...await renderCascade(page, templateHtml, outDir, day1Cascade));
  }

  // Day 2 — optional, milestone posts only. Same cascade shape, day2- prefix.
  // Use story_day2_hashtag to override the Day 1 hashtag sticker when needed.
  if (hasDay2) {
    const day2Cascade = {
      hook: day2.hook,
      pollQ: day2.pollQ,
      insight: day2.insight,
      insightSlide: day2.insightSlide,
      blogExtra: day2.blogExtra,
      hashtag: day2.hashtag || s.hashtag,
      renderHookPng: day2.renderHookPng,
      eyebrow,
      stat: day2.stat,
      answer: day2.answer,
      prompt: day2.prompt,
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
