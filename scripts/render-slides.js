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

  for (const line of lines) {
    const trimmed = line.trim();

    // List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { htmlParts.push('<ul>'); inList = true; }
      const itemText = trimmed.slice(2);
      htmlParts.push(`<li>${applyInline(itemText)}</li>`);
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList) { htmlParts.push('<ol>'); inList = true; }
      htmlParts.push(`<li>${applyInline(numMatch[2])}</li>`);
      continue;
    }

    // Close list if we were in one
    if (inList) {
      htmlParts.push(htmlParts[htmlParts.length - 1]?.includes('<ol>') ? '</ol>' : '</ul>');
      inList = false;
    }

    // Empty line = spacing
    if (trimmed === '') {
      htmlParts.push('<br/>');
      continue;
    }

    // Regular text line
    htmlParts.push(`<div>${applyInline(trimmed)}</div>`);
  }

  if (inList) htmlParts.push('</ul>');
  return htmlParts.join('\n');
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
    const isLast = slide.number === post.totalSlides;

    // Determine slide class
    let slideClass = 'slide slide-middle';
    if (isFirst) slideClass = 'slide slide-first';
    if (isLast) slideClass = 'slide slide-last';

    // Build content HTML
    let contentHtml = textToHtml(slide.text);

    // First slide: add handle
    let extras = '';
    if (isFirst) {
      extras = `<div class="handle">@nidhi.today</div>`;
    }

    // Last slide: add blog URL
    if (isLast && post.blogUrl) {
      contentHtml += `<div class="blog-url">${post.blogUrl.replace('https://', '')}</div>`;
    }

    // Inject into template
    const html = templateHtml
      .replace('id="slide" class="slide"', `id="slide" class="${slideClass}"`)
      .replace('<div class="content" id="content"></div>',
        `<div class="content" id="content">${contentHtml}</div>${extras}`)
      .replace('<span class="slide-counter" id="counter"></span>',
        `<span class="slide-counter" id="counter">${slide.number} / ${post.totalSlides}</span>`);

    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    // Auto-scale content to fit within the slide
    await page.evaluate(() => {
      const slide = document.getElementById('slide');
      const content = document.getElementById('content');
      if (!slide || !content) return;

      const maxH = slide.offsetHeight - 180; // padding top/bottom + bottom bar
      let scale = 1;
      while (content.scrollHeight > maxH && scale > 0.5) {
        scale -= 0.05;
        content.style.fontSize = `${scale}em`;
      }
    });

    const filename = `slide-${String(slide.number).padStart(2, '0')}.png`;
    const filepath = join(outDir, filename);

    await page.screenshot({ path: filepath, type: 'png' });
    rendered.push(filepath);
  }

  // Render story image (first slide at 1080x1920)
  const storySlide = post.slides[0];
  if (storySlide) {
    const storyHtml = templateHtml
      .replace('id="slide" class="slide"', 'id="slide" class="slide slide-story"')
      .replace('width: 1080px;\n    height: 1080px;', 'width: 1080px;\n    height: 1920px;')
      .replace('<div class="content" id="content"></div>',
        `<div class="content" id="content">${textToHtml(storySlide.text)}</div>
         <div class="swipe-cta">Swipe up to read more</div>
         <div class="handle" style="position:absolute;bottom:200px;left:0;right:0;text-align:center;font-family:Inter,sans-serif;font-weight:600;font-size:24px;color:#4EBAAA;">@nidhi.today</div>`)
      .replace('<span class="slide-counter" id="counter"></span>',
        '<span class="slide-counter" id="counter"></span>');

    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.setContent(storyHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    const storyPath = join(outDir, 'story.png');
    await page.screenshot({ path: storyPath, type: 'png' });
    rendered.push(storyPath);
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
