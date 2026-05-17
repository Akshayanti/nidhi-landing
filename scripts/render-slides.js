#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadAllPosts, loadPost } from './lib/parse-markdown.js';

const TEMPLATE_PATH = join(import.meta.dirname, 'slide-template.html');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'output', 'instagram');

// ---------- Text polish (smart quotes, dashes, arrows) ----------

/**
 * Apply typographic polish to plain text. Em-dashes are intentionally NOT
 * generated here. House style avoids them. Use commas, colons, or periods.
 *   "x"  → "x"        '  → ’ (contextual)
 *   ->   → →          <-        → ←
 * Run BEFORE inline markdown conversion so it doesn't touch HTML tags.
 */
function smartTypography(text) {
  return text
    // arrows (only the ascii forms; leave existing → alone)
    .replace(/->/g, '\u2192')
    .replace(/<-/g, '\u2190')
    // curly double quotes: opening after start-of-line/whitespace/punct
    .replace(/(^|[\s(\[{-])"/g, '$1\u201C')
    .replace(/"/g, '\u201D')
    // curly single quotes / apostrophes
    .replace(/(^|[\s(\[{-])'/g, '$1\u2018')
    .replace(/'/g, '\u2019');
}

// ---------- Inline markdown ----------

function applyInline(text) {
  // Bold: **text**
  let out = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic / accent: *text* (only when not inside ** which already consumed)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return out;
}

/**
 * Convert a markdown body block to HTML paragraphs / lists / line breaks.
 * Used by `prose` and `comparison` column bodies.
 */
function bodyToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const out = [];
  let inList = null;          // 'ul' | 'ol' | null
  let buf = [];

  const flushPara = () => {
    if (buf.length) {
      out.push(`<p>${applyInline(buf.join(' '))}</p>`);
      buf = [];
    }
  };
  const closeList = () => {
    if (inList) { out.push(`</${inList}>`); inList = null; }
  };

  for (const raw of lines) {
    let line = raw.trim();

    // Legacy compat: the previous template used `>> centered`, `>>> right`,
    // and `———` as a divider. The new layout system handles alignment via
    // CSS, so we just strip these prefixes/markers when we encounter them
    // in older markdown that hasn't been migrated yet.
    if (line === '———' || line === '---') continue;
    line = line.replace(/^>>>\s+/, '').replace(/^>>\s+/, '');

    if (line === '') { flushPara(); closeList(); continue; }

    const liBullet = line.match(/^[-*]\s+(.*)$/);
    if (liBullet) {
      flushPara();
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
      out.push(`<li>${applyInline(liBullet[1])}</li>`);
      continue;
    }
    const liNum = line.match(/^\d+\.\s+(.*)$/);
    if (liNum) {
      flushPara();
      if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
      out.push(`<li>${applyInline(liNum[1])}</li>`);
      continue;
    }

    closeList();
    buf.push(line);
  }
  flushPara();
  closeList();
  return out.join('');
}

/**
 * Parse rows from a markdown body for `list` layout.
 * Numbered lines → numeric markers; bullet lines → dot markers; plain → dot.
 */
function bodyToRows(text) {
  if (!text) return [];
  const rows = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      rows.push({ marker: num[1], text: num[2] });
      continue;
    }
    const bul = line.match(/^[-*]\s+(.*)$/);
    if (bul) {
      rows.push({ marker: 'dot', text: bul[1] });
      continue;
    }
    rows.push({ marker: 'dot', text: line });
  }
  return rows;
}

/**
 * Split a comparison body on `---` into two columns.
 * Each column may contain its own `**Title**` first line which becomes <h3>.
 */
function bodyToComparison(text, fields = {}) {
  // Column separator is `===` on its own line. We do NOT use `---` here
  // because the slide-block regex consumes `---` as the slide terminator,
  // so a `---` inside a slide body is impossible by the time we get here.
  const parts = (text || '').split(/\n=+\n/);
  const cols = parts.map((part, idx) => {
    const trimmed = part.trim();
    // Allow first line **Title** as column heading; else use field titles.
    const lines = trimmed.split('\n');
    let title = '';
    let body = trimmed;
    const titleMatch = lines[0]?.match(/^\*\*(.+)\*\*$/);
    if (titleMatch) {
      title = titleMatch[1];
      body = lines.slice(1).join('\n').trim();
    }
    if (!title) {
      title = idx === 0 ? (fields.left_title || '') : (fields.right_title || '');
    }
    return { title, body };
  });
  // Pad to two cols
  while (cols.length < 2) cols.push({ title: '', body: '' });
  return cols.slice(0, 2);
}

// ---------- Layout renderers ----------

const SVG_SAVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const SVG_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const SVG_FOLLOW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>`;
// External-link icon. Signals "leave Instagram, go to the blog."
const SVG_READ = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`;

/**
 * Strip protocol, UTMs, and trailing slash for display.
 * "https://nidhi.today/blog/budgeting/?utm_source=..." → "nidhi.today/blog/budgeting"
 */
function cleanBlogUrl(url) {
  if (!url) return '';
  try {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/\?.*$/, '')
      .replace(/\/+$/, '');
  } catch {
    return url;
  }
}

function renderHook(slide) {
  // Body becomes the headline; **bold** within it gets the teal accent.
  // Optional `sub:` field renders as a muted subhead beneath.
  // Note: hook layout intentionally does NOT consume `kicker:` (that's closer-only).
  const headline = applyInline(smartTypography(slide.text));
  const sub = slide.fields.sub
    ? `<div class="hook-sub">${applyInline(smartTypography(slide.fields.sub))}</div>`
    : '';
  return `
    <div class="hook-headline">${headline}</div>
    ${sub}
    <div class="swipe-cue">SWIPE</div>
  `;
}

function renderProse(slide) {
  // `title:` is the slide's heading. `eyebrow:` is reserved for the
  // chip override (handled by buildEyebrow) and is NOT consumed here.
  const title = slide.fields.title || '';
  const titleHtml = title ? `<div class="prose-title">${applyInline(smartTypography(title))}</div>` : '';
  const body = bodyToHtml(smartTypography(slide.text));
  return `${titleHtml}<div class="prose-body">${body}</div>`;
}

function renderStat(slide) {
  const label = slide.fields.label || '';
  const hero = slide.fields.hero || '';
  const caption = slide.fields.caption || '';
  const note = slide.fields.note || slide.text || '';
  return `
    ${label ? `<div class="stat-label">${applyInline(smartTypography(label))}</div>` : ''}
    ${hero ? `<div class="stat-hero">${applyInline(smartTypography(hero))}</div>` : ''}
    ${caption ? `<div class="stat-caption">${applyInline(smartTypography(caption))}</div>` : ''}
    ${note ? `<div class="stat-note">${applyInline(smartTypography(note))}</div>` : ''}
  `;
}

function renderList(slide) {
  // `title:` is the slide's heading. `eyebrow:` is the chip override only.
  const title = slide.fields.title || '';
  const rows = bodyToRows(smartTypography(slide.text));
  const titleHtml = title ? `<div class="list-title">${applyInline(smartTypography(title))}</div>` : '';
  const rowsHtml = rows.map(r => {
    const markerCls = r.marker === 'dot' ? 'marker dot' : 'marker';
    const markerInner = r.marker === 'dot' ? '' : r.marker;
    return `<div class="row"><div class="${markerCls}">${markerInner}</div><div class="row-text">${applyInline(r.text)}</div></div>`;
  }).join('');
  return `${titleHtml}<div class="list-rows">${rowsHtml}</div>`;
}

function renderComparison(slide) {
  // `title:` is the slide's heading. `eyebrow:` is the chip override only.
  const title = slide.fields.title || '';
  const [a, b] = bodyToComparison(smartTypography(slide.text), slide.fields);
  const titleHtml = title ? `<div class="cmp-title">${applyInline(smartTypography(title))}</div>` : '';
  const colHtml = (col) => `
    <div class="cmp-col">
      ${col.title ? `<h3>${applyInline(col.title)}</h3>` : ''}
      ${bodyToHtml(col.body)}
    </div>`;
  return `
    ${titleHtml}
    <div class="cmp-cols">
      ${colHtml(a)}
      <div class="cmp-rule"></div>
      ${colHtml(b)}
    </div>
  `;
}

function renderCloser(slide, post) {
  const kicker = slide.fields.kicker || slide.text || '';
  const next = slide.fields.next || '';
  const save = slide.fields.save || '';
  const share = slide.fields.share || '';
  const follow = slide.fields.follow || '';
  // READ row: explicit `read:` field wins; otherwise auto-derive from
  // post.blogUrl. Empty string disables the row entirely. Copy makes
  // navigation explicit because URLs are not tappable inside posts.
  let read = slide.fields.read;
  if (read === undefined && post?.blogUrl) {
    const clean = cleanBlogUrl(post.blogUrl);
    if (clean) read = `Full breakdown on <strong>${clean}</strong> (link in bio)`;
  }

  const row = (icon, verb, text) => text ? `
    <div class="crow">
      <div class="icon">${icon}</div>
      <div class="verb">${verb}</div>
      <div class="text">${applyInline(smartTypography(text))}</div>
    </div>` : '';

  return `
    ${kicker ? `<div class="closer-kicker">${applyInline(smartTypography(kicker))}</div>` : ''}
    ${next ? `<div class="closer-next">${applyInline(smartTypography(next))}</div>` : ''}
    <div class="closer-rows">
      ${row(SVG_READ, 'Read', read)}
      ${row(SVG_SAVE, 'Save', save)}
      ${row(SVG_SHARE, 'Share', share)}
      ${row(SVG_FOLLOW, 'Follow', follow)}
    </div>
  `;
}

const LAYOUTS = {
  hook: renderHook,
  prose: renderProse,
  stat: renderStat,
  list: renderList,
  comparison: renderComparison,
  closer: renderCloser,
};

// ---------- Slide assembly ----------

function buildEyebrow(post, slide) {
  // Hook slide gets no eyebrow chip. Its design uses the headline as the anchor.
  if (slide.layout === 'hook') return '';
  // Per-slide `eyebrow:` field overrides the post's series/category chip on
  // any non-hook layout. Falls back to series, then category, then empty.
  return slide.fields.eyebrow || post.series || post.category || '';
}

function buildProgressDots(current, total) {
  const dots = [];
  for (let i = 1; i <= total; i++) {
    dots.push(`<span class="dot${i === current ? ' active' : ''}"></span>`);
  }
  return dots.join('');
}

function buildHandle(post, slide) {
  if (slide.layout === 'hook') return `<span class="handle">@nidhi.today</span>`;
  if (slide.layout === 'closer') return `<span class="handle">@nidhi.today</span>`;
  return `<span class="handle muted">@nidhi.today</span>`;
}

function buildSourceFooter(slide, post) {
  const hasSource = Boolean(slide.fields.source);
  const blog = cleanBlogUrl(post?.blogUrl);
  // Render a "More on the blog" line whenever the slide cites a source
  // and the post has a blog URL. Skip on the closer (it already has a
  // dedicated READ row in the CTA ladder).
  const showBlogNudge = hasSource && blog && slide.layout !== 'closer';

  if (!hasSource && !showBlogNudge) return '';

  const sourceLine = hasSource
    ? `<div class="source">${applyInline(smartTypography(slide.fields.source))}</div>`
    : '';
  const blogLine = showBlogNudge
    ? `<div class="blog-nudge">Full breakdown on <strong>${blog}</strong> (link in bio)</div>`
    : '';

  return sourceLine + blogLine;
}

// ---------- Main render loop ----------

export async function renderSlides(post, browser) {
  const outDir = join(OUTPUT_DIR, post.subDir, post.slug);
  await mkdir(outDir, { recursive: true });

  const templateHtml = await readFile(TEMPLATE_PATH, 'utf-8');
  const page = await browser.newPage();
  const rendered = [];

  for (const slide of post.slides) {
    const layout = LAYOUTS[slide.layout] ? slide.layout : 'prose';
    const renderFn = LAYOUTS[layout];

    const innerHtml = renderFn(slide, post) + buildSourceFooter(slide, post);

    const eyebrow = buildEyebrow(post, slide);
    const eyebrowHtml = eyebrow ? eyebrow.toUpperCase() : '';
    const progressHtml = buildProgressDots(slide.number, post.totalSlides);
    const handleHtml = buildHandle(post, slide);

    const html = templateHtml
      .replace('id="slide" class="slide" data-layout="prose"',
               `id="slide" class="slide" data-layout="${layout}"`)
      .replace('<div class="eyebrow" id="eyebrow"></div>',
               `<div class="eyebrow" id="eyebrow">${eyebrowHtml}</div>`)
      .replace('<div class="content" id="content"></div>',
               `<div class="content" id="content">${innerHtml}</div>`)
      .replace('<div class="progress" id="progress"></div>',
               `<div class="progress" id="progress">${progressHtml}</div>`)
      .replace('<div class="handle" id="handle"></div>',
               handleHtml.replace('<span class="handle"', '<div class="handle"').replace('<span class="handle muted"', '<div class="handle muted"').replace('</span>', '</div>'));

    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);

    // Auto-fit. Two passes:
    //   1) Stat hero: shrink ONLY the .stat-hero element until it fits the
    //      content width on one line.
    //   2) Everything: scale .content font-size down if scrollHeight
    //      overflows the available height.
    await page.evaluate(() => {
      const content = document.getElementById('content');
      if (!content) return;

      // Pass 1: stat hero width fit.
      // Direct ratio calculation: scale = available / measured. Floor at 0.25
      // (= 55px on 220px base) keeps the hero legibly hero-sized; anything
      // that can't fit at 0.25 is an editorial signal to shorten the string.
      const hero = content.querySelector('.stat-hero');
      if (hero) {
        const available = content.clientWidth;
        const baseSize = parseFloat(getComputedStyle(hero).fontSize);
        hero.style.fontSize = `${baseSize}px`;
        const measured = hero.scrollWidth;
        const widthScale = measured > available ? available / measured : 1.0;
        const finalScale = Math.max(0.25, widthScale);
        hero.style.fontSize = `${baseSize * finalScale}px`;
      }

      // Pass 2: vertical fit.
      const available = content.clientHeight;
      if (content.scrollHeight <= available) return;
      const baseSize = parseFloat(getComputedStyle(content).fontSize);
      let lo = 0.55, hi = 1.0;
      const apply = (s) => { content.style.fontSize = `${baseSize * s}px`; };
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        apply(mid);
        if (content.scrollHeight <= available) lo = mid;
        else hi = mid;
      }
      apply(lo);
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
      console.log(`  → ${files.length} images saved to output/instagram/${post.subDir ? post.subDir + '/' : ''}${post.slug}/\n`);
    }

    console.log('Done.');
  } finally {
    await browser.close();
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Render failed:', err);
    process.exit(1);
  });
}
