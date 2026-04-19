#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadAllPosts, loadPost } from './lib/parse-markdown.js';

const TEMPLATE_PATH = join(import.meta.dirname, 'slide-template.html');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'output', 'instagram');

/**
 * Convert markdown-style text to simple HTML.
 * Handles **bold**, lists (- item), and line breaks.
 */
function textToHtml(text) {
  const lines = text.split('\n');
  const htmlParts = [];
  let inList = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { htmlParts.push('<ul>'); inList = true; inOl = false; }
      htmlParts.push(`<li>${applyInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Numbered list item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList) { htmlParts.push('<ol>'); inList = true; inOl = true; }
      htmlParts.push(`<li>${applyInline(numMatch[2])}</li>`);
      continue;
    }

    // Close list if we were in one
    if (inList) {
      htmlParts.push(inOl ? '</ol>' : '</ul>');
      inList = false;
      inOl = false;
    }

    // Empty line = spacing
    if (trimmed === '') {
      htmlParts.push('<br/>');
      continue;
    }

    // Center-aligned text: >> text
    if (trimmed.startsWith('>> ')) {
      htmlParts.push(`<div style="text-align:center">${applyInline(trimmed.slice(3))}</div>`);
      continue;
    }

    // Right-aligned text: >>> text
    if (trimmed.startsWith('>>> ')) {
      htmlParts.push(`<div style="text-align:right">${applyInline(trimmed.slice(4))}</div>`);
      continue;
    }

    // Regular text line (left-aligned)
    htmlParts.push(`<div>${applyInline(trimmed)}</div>`);
  }

  if (inList) htmlParts.push(inOl ? '</ol>' : '</ul>');
  return htmlParts.join('');
}

function applyInline(text) {
  // Bold: **text**
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

async function renderSlides(post, browser) {
  const outDir = join(OUTPUT_DIR, post.slug);
  await mkdir(outDir, { recursive: true });

  const templateHtml = await readFile(TEMPLATE_PATH, 'utf-8');

  const page = await browser.newPage();

  const rendered = [];

  for (const slide of post.slides) {
    const isFirst = slide.number === 1;

    // Determine slide class
    let slideClass = isFirst ? 'slide slide-first' : 'slide slide-middle';

    // Build content HTML
    let contentHtml = textToHtml(slide.text);

    // First slide: add handle
    let extras = '';
    if (isFirst) {
      extras = `<div class="handle">@nidhi.today</div>`;
    }

    // Inject into template
    const html = templateHtml
      .replace('id="slide" class="slide"', `id="slide" class="${slideClass}"`)
      .replace('<div class="content" id="content"></div>',
        `<div class="content" id="content">${contentHtml}</div>${extras}`)
      .replace('<span class="slide-counter" id="counter"></span>',
        `<span class="slide-counter" id="counter">${slide.number} / ${post.totalSlides}</span>`)
      .replace(/<span class="brand" id="brand-link">[^<]*<\/span>/,
        `<span class="brand" id="brand-link">https://nidhi.today</span>`);

    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    // Auto-scale content per slide: shrink to fit if needed
    await page.evaluate(() => {
      const slide = document.getElementById('slide');
      const content = document.getElementById('content');
      if (!slide || !content) return;

      const style = getComputedStyle(slide);
      const padTop = parseFloat(style.paddingTop);
      const padBot = parseFloat(style.paddingBottom);
      const bar = 44; // bottom bar height
      const maxH = (slide.offsetHeight - padTop - padBot - bar) * 0.85;

      const baseFontSize = parseFloat(getComputedStyle(content).fontSize);
      if (content.scrollHeight <= maxH) return; // already fits

      // Shrink: binary search down to smallest font that fits
      let lo = baseFontSize * 0.7, hi = baseFontSize;
      while (hi - lo > 1) {
        const mid = (lo + hi) / 2;
        content.style.fontSize = `${mid}px`;
        if (content.scrollHeight <= maxH) hi = mid;
        else lo = mid;
      }
      content.style.fontSize = `${hi}px`;
    });

    const filename = `slide-${String(slide.number).padStart(2, '0')}.png`;
    const filepath = join(outDir, filename);

    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  await page.close();
  return rendered;
}

async function main() {
  const targetFile = process.argv[2];

  console.log('Starting Instagram slide renderer...\n');

  const browser = await puppeteer.launch({ headless: true });

  try {
    const posts = targetFile
      ? [await loadPost(targetFile)]
      : await loadAllPosts();

    for (const post of posts) {
      console.log(`Rendering: ${post.title} (${post.totalSlides} slides)`);
      const files = await renderSlides(post, browser);
      console.log(`  → ${files.length} images saved to output/instagram/${post.slug}/\n`);
    }

    console.log('Done.');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Render failed:', err);
  process.exit(1);
});
