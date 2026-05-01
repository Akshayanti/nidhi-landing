#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
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
 * Build the sticker-area HTML for poll/quiz frames.
 */
function buildStickerArea(label, options, answer = '') {
  if (!options || options.length === 0) return '';
  const optsHtml = options
    .map(o => `<div class="opt">${escapeHtml(o)}</div>`)
    .join('');
  const answerHtml = answer
    ? `<div class="quiz-answer">Correct: ${escapeHtml(answer)}</div>`
    : '';
  return `
    <div class="sticker-area">
      <div class="sticker-label">${escapeHtml(label)}</div>
      <div class="sticker-options">${optsHtml}</div>
      ${answerHtml}
    </div>
  `;
}

/**
 * Render all story frames for a single post.
 */
export async function renderStoriesForPost(post, browser) {
  const s = post.story || {};
  const hasAnyContent = s.hook || s.stat || s.pollQ || s.quizQ || s.prompt;
  if (!hasAnyContent) return { skipped: true };

  const outDir = join(OUTPUT_DIR, post.subDir, post.slug, 'stories');
  await mkdir(outDir, { recursive: true });

  const templateHtml = await readFile(TEMPLATE_PATH, 'utf-8');
  const page = await browser.newPage();
  const rendered = [];

  // Frame 1: Hook
  if (s.hook) {
    const body = `<div>${renderText(s.hook)}</div>`;
    await renderFrame(page, templateHtml, 'hook', body, { hashtag: s.hashtag });
    const filepath = join(outDir, 'frame-1-hook.png');
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // Frame 2: Poll (question + placeholder for native IG poll sticker)
  if (s.pollQ) {
    const body = `
      <div class="question">${renderText(s.pollQ)}</div>
      ${buildStickerArea('Add IG poll sticker here ↓', s.pollOpts)}
    `;
    await renderFrame(page, templateHtml, 'poll', body, { hashtag: s.hashtag });
    const filepath = join(outDir, 'frame-2-poll.png');
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // Frame 3: Quiz (question + placeholder for native IG quiz sticker)
  if (s.quizQ) {
    const body = `
      <div class="question">${renderText(s.quizQ)}</div>
      ${buildStickerArea('Add IG quiz sticker here ↓', s.quizOpts, s.quizAnswer)}
    `;
    await renderFrame(page, templateHtml, 'quiz', body, { hashtag: s.hashtag });
    const filepath = join(outDir, 'frame-3-quiz.png');
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // Frame 4: Stat / Value frame (big number or key fact)
  if (s.stat) {
    const body = `<div>${renderText(s.stat)}</div>`;
    await renderFrame(page, templateHtml, 'stat', body, { hashtag: s.hashtag });
    const filepath = join(outDir, 'frame-4-stat.png');
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // Frame 5: CTA (save / tag / share prompt)
  if (s.prompt) {
    const body = `<div>${renderText(s.prompt)}</div>`;
    await renderFrame(page, templateHtml, 'cta', body, { hashtag: s.hashtag });
    const filepath = join(outDir, 'frame-5-cta.png');
    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
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
