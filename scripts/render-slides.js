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
  // A leading `:name:` token on a row swaps the numeric/dot marker for a topic
  // icon (e.g. `1. :home: Maintenance and repairs` → house icon + text). Lets a
  // list communicate each item visually without extra words.
  const extractIcon = (s) => {
    const m = s.match(/^:([a-zA-Z]+):\s*(.*)$/);
    return m ? { icon: m[1], text: m[2] } : { icon: null, text: s };
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      const { icon, text } = extractIcon(num[2]);
      rows.push({ marker: num[1], text, icon });
      continue;
    }
    const bul = line.match(/^[-*]\s+(.*)$/);
    if (bul) {
      const { icon, text } = extractIcon(bul[1]);
      rows.push({ marker: 'dot', text, icon });
      continue;
    }
    const { icon, text } = extractIcon(line);
    rows.push({ marker: 'dot', text, icon });
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

// ---------- Topic icon library ----------
//
// Curated line-icon set for the cream editorial system. All icons share the
// same construction as the closer CTA icons: 24x24 viewBox, no fill, teal
// stroke (via currentColor), 1.9 stroke-width, rounded caps/joins. They render
// inside a soft-teal rounded badge so a slide can carry one topic glyph that
// communicates the subject at a glance (a house for housing, a globe for
// currencies) without adding text. Use sparingly: one glyph per slide, in the
// same spirit as the "one teal accent per slide" rule.
//
// Authored via an `icon:` field on a slide (slide-level glyph) or a leading
// `:name:` token on a list row (per-row marker icon). Unknown names render
// nothing, so a typo degrades gracefully instead of crashing.
const ICON_PATHS = {
  // FIRE / goals / independence
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  mountain: '<path d="M3 19l6-12 4 7 2-3 6 8z"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  // money / income
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3"/><ellipse cx="15" cy="14" rx="6" ry="3"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
  recurring: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  bank: '<path d="M3 9l9-5 9 5"/><path d="M4 9h16v2H4z"/><path d="M6 11v7M10 11v7M14 11v7M18 11v7"/><path d="M3 21h18"/>',
  scale: '<path d="M12 3v18"/><path d="M5 21h14"/><path d="M3 8l4-4 4 4M3 8c0 2 1.8 3 4 3s4-1 4-3M3 8h8"/><path d="M13 8l4-4 4 4M13 8c0 2 1.8 3 4 3s4-1 4-3M13 8h8"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1.3"/>',
  // housing
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  key: '<circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16 16l2-2M18 18l2-2"/>',
  // currency / cross-border
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  exchange: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  // metrics / dashboard
  gauge: '<path d="M3 16a9 9 0 1 1 18 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.4"/>',
  pulse: '<path d="M3 12h4l2 6 4-14 2 8h6"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 16v-4M12 16V8M16 16v-7"/>',
  checklist: '<path d="M4 6h12M4 12h12M4 18h12"/><path d="M19 5l1.5 1.5L23 4"/><path d="M19 11l1.5 1.5L23 10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  // signals
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M21 17v-5h-5"/>',
};

// Case-insensitive lookup so `trendUp`, `trendup`, and `TRENDUP` all resolve.
const ICON_PATHS_NORM = Object.fromEntries(
  Object.entries(ICON_PATHS).map(([k, v]) => [k.toLowerCase(), v])
);

function renderIcon(name) {
  const path = name && ICON_PATHS_NORM[name.trim().toLowerCase()];
  if (!path) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/**
 * A slide-level topic glyph: one line-icon inside a soft-teal rounded badge.
 * `align` controls horizontal placement of the wrapper ('center' for stat,
 * 'left' for prose/list). Returns '' when the icon name is unknown/empty.
 */
function iconGlyph(name, align = 'left') {
  const svg = renderIcon(name);
  if (!svg) return '';
  return `<div class="topic-glyph topic-glyph-${align}">${svg}</div>`;
}

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

// Wrap curly double-quote marks in a span so they can be rendered in a serif
// face. Inter at the heavy hook weight (800) draws near-vertical quote glyphs
// that read as straight ticks; a serif gives the classic curly 66/99 shape.
// Only touches double quotes; apostrophes (U+2019) are left in the body font.
function styleQuoteMarks(html) {
  return html.replace(/[\u201C\u201D]/g, (m) => `<span class="dquo">${m}</span>`);
}

function renderHook(slide) {
  // Body becomes the headline; **bold** within it gets the teal accent.
  // Optional `sub:` field renders as a muted subhead beneath.
  // Note: hook layout intentionally does NOT consume `kicker:` (that's closer-only).
  const headline = styleQuoteMarks(applyInline(smartTypography(slide.text)));
  const sub = slide.fields.sub
    ? `<div class="hook-sub">${applyInline(smartTypography(slide.fields.sub))}</div>`
    : '';
  const glyph = iconGlyph(slide.fields.icon, 'left');
  return `
    ${glyph}
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
  const glyph = iconGlyph(slide.fields.icon, 'left');
  return `${glyph}${titleHtml}<div class="prose-body">${body}</div>`;
}

function renderStat(slide) {
  const label = slide.fields.label || '';
  const hero = slide.fields.hero || '';
  const caption = slide.fields.caption || '';
  const note = slide.fields.note || slide.text || '';
  // `||` in the hero becomes a hard line break. Lets the hero hold a two-line
  // contrast (e.g. "Year 1: €625 || Year 25: €3") without the renderer
  // shrinking it to thumbnail size to fit the whole thing on one row.
  const heroHtml = hero
    ? applyInline(smartTypography(hero)).replace(/\s*\|\|\s*/g, '<br>')
    : '';
  const glyph = iconGlyph(slide.fields.icon, 'center');
  return `
    ${glyph}
    ${label ? `<div class="stat-label">${applyInline(smartTypography(label))}</div>` : ''}
    ${heroHtml ? `<div class="stat-hero">${heroHtml}</div>` : ''}
    ${caption ? `<div class="stat-caption">${applyInline(smartTypography(caption))}</div>` : ''}
    ${note ? `<div class="stat-note">${applyInline(smartTypography(note))}</div>` : ''}
  `;
}

function renderList(slide) {
  // `title:` is the slide's heading. `eyebrow:` is the chip override only.
  const title = slide.fields.title || '';
  const rows = bodyToRows(smartTypography(slide.text));
  const glyph = iconGlyph(slide.fields.icon, 'left');
  const titleHtml = title ? `<div class="list-title">${applyInline(smartTypography(title))}</div>` : '';
  const rowsHtml = rows.map(r => {
    const iconSvg = r.icon ? renderIcon(r.icon) : '';
    let markerCls, markerInner;
    if (iconSvg) {
      markerCls = 'marker icon-marker';
      markerInner = iconSvg;
    } else if (r.marker === 'dot') {
      markerCls = 'marker dot';
      markerInner = '';
    } else {
      markerCls = 'marker';
      markerInner = r.marker;
    }
    return `<div class="row"><div class="${markerCls}">${markerInner}</div><div class="row-text">${applyInline(r.text)}</div></div>`;
  }).join('');
  return `${glyph}${titleHtml}<div class="list-rows">${rowsHtml}</div>`;
}

function renderComparison(slide) {
  // `title:` is the slide's heading. `eyebrow:` is the chip override only.
  const title = slide.fields.title || '';
  const [a, b] = bodyToComparison(smartTypography(slide.text), slide.fields);
  const glyph = iconGlyph(slide.fields.icon, 'left');
  const titleHtml = title ? `<div class="cmp-title">${applyInline(smartTypography(title))}</div>` : '';
  const colIcons = [slide.fields.left_icon, slide.fields.right_icon];
  const colHtml = (col, idx) => {
    const ci = renderIcon(colIcons[idx]);
    const head = col.title
      ? `<h3>${ci ? `<span class="cmp-col-icon">${ci}</span>` : ''}${applyInline(col.title)}</h3>`
      : '';
    return `
    <div class="cmp-col">
      ${head}
      ${bodyToHtml(col.body)}
    </div>`;
  };
  return `
    ${glyph}
    ${titleHtml}
    <div class="cmp-cols">
      ${colHtml(a, 0)}
      <div class="cmp-rule"></div>
      ${colHtml(b, 1)}
    </div>
  `;
}

function renderCloser(slide, post) {
  const kicker = slide.fields.kicker || slide.text || '';
  const next = slide.fields.next || '';
  const save = slide.fields.save || '';
  const share = slide.fields.share || '';
  const follow = slide.fields.follow || '';
  // READ row, primary CTA. Default auto-derives from blog_url per PLAYBOOK §9.
  // A `read:` field overrides it with a curiosity-driven tease that names the
  // specific thing the blog answers, then points to the URL on its own line.
  const blog = cleanBlogUrl(post?.blogUrl);
  let read;
  if (slide.fields.read) {
    const tease = applyInline(smartTypography(slide.fields.read));
    read = blog
      ? `${tease}<span class="read-url">${blog} (link in bio)</span>`
      : tease;
  } else if (blog) {
    read = `Full breakdown on <strong>${blog}</strong> (link in bio)`;
  } else {
    read = '';
  }

  // `text` is plain markdown by default; pass raw=true for pre-rendered HTML
  // (the READ row, which already contains <strong>/<span> markup).
  const row = (icon, verb, text, raw = false) => text ? `
    <div class="crow">
      <div class="icon">${icon}</div>
      <div class="verb">${verb}</div>
      <div class="text">${raw ? text : applyInline(smartTypography(text))}</div>
    </div>` : '';

  return `
    ${kicker ? `<div class="closer-kicker">${applyInline(smartTypography(kicker))}</div>` : ''}
    ${next ? `<div class="closer-next">${applyInline(smartTypography(next))}</div>` : ''}
    <div class="closer-rows">
      ${row(SVG_READ, 'Read', read, true)}
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
