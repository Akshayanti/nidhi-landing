#!/usr/bin/env node
// Phone-width audit of every site page, run against a dev or preview server.
//
//   node scripts/audit-mobile.mjs [baseUrl] [--width 375] [--json out.json]
//
// For each page it reports:
// - horizontal overflow (the page scrolls sideways) and the elements causing it
// - blog figures: the smallest label size as actually rendered on screen,
//   labels that overlap each other, and labels that spill outside the figure
// - tables wider than the screen that are not in a sideways-scrolling box
// - body text under 16px
// - tap targets (links, buttons, inputs) smaller than 24 x 24 px that are not
//   inline links inside a sentence (WCAG 2.2 target size, minimum)
// Exit code 1 when any page has any of these issues.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:/.test(a)) || 'http://localhost:4321').replace(/\/$/, '');
const width = Number(args[args.indexOf('--width') + 1]) || 375;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const MIN_FIGURE_PX = 10; // smallest acceptable rendered chart label

const ROOT = join(import.meta.dirname, '..');
function slugs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...slugs(p));
    else if (p.endsWith('.md')) {
      const m = readFileSync(p, 'utf8').match(/^slug:\s*"?([^"\n]+)"?/m);
      if (m) out.push(m[1]);
    }
  }
  return out;
}

const pages = [
  '/', '/about/', '/beliefs/', '/privacy/', '/editorial-policy/', '/free/',
  '/free/loan-comparison/', '/free/multi-currency-net-worth/', '/blog/',
  '/blog/inclusive-finances/', '/blog/tag/optimizing/', '/404',
  ...slugs(join(ROOT, 'src/content/blog')).map((s) => `/blog/${s}/`),
];

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const results = [];
for (const path of pages) {
  let status = 0;
  try {
    const res = await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 60000 });
    status = res ? res.status() : 0;
  } catch (e) {
    results.push({ path, error: String(e.message || e) });
    continue;
  }
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate((MIN) => {
    const vw = window.innerWidth;
    const out = { overflow: null, figures: [], tables: [], smallBody: [], tinyText: [], smallTargets: [] };

    // Horizontal overflow and its sources (ignore content inside sideways scrollers).
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) {
      const scrollerOf = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden)/.test(s.overflowX)) return p;
        }
        return null;
      };
      const culprits = [];
      for (const el of document.body.querySelectorAll('*')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.right <= vw + 1) continue;
        if (scrollerOf(el)) continue;
        culprits.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} right=${Math.round(b.right)}`);
        if (culprits.length >= 5) break;
      }
      out.overflow = { scrollWidth: sw, culprits };
    }

    // Figures.
    document.querySelectorAll('figure svg').forEach((svg, i) => {
      const vb = svg.viewBox.baseVal;
      const box = svg.getBoundingClientRect();
      if (!vb || !vb.width || !box.width) return;
      const scale = box.width / vb.width;
      const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim());
      let minPx = Infinity;
      let minText = '';
      const rects = [];
      const spill = [];
      for (const t of texts) {
        const fs = parseFloat(getComputedStyle(t).fontSize);
        const px = fs * scale;
        if (px < minPx) { minPx = px; minText = t.textContent.trim(); }
        const b = t.getBoundingClientRect();
        rects.push({ b, s: t.textContent.trim() });
        if (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1) spill.push(t.textContent.trim());
      }
      const overlaps = [];
      for (let a = 0; a < rects.length; a++) {
        for (let c = a + 1; c < rects.length; c++) {
          const A = rects[a].b, C = rects[c].b;
          const w = Math.min(A.right, C.right) - Math.max(A.left, C.left);
          const h = Math.min(A.bottom, C.bottom) - Math.max(A.top, C.top);
          if (w > 1 && h > 1 && w * h > 0.15 * Math.min(A.width * A.height, C.width * C.height)) overlaps.push(`"${rects[a].s}" × "${rects[c].s}"`);
        }
      }
      out.figures.push({ index: i + 1, title: svg.querySelector('title')?.textContent?.trim() || '', scale: +scale.toFixed(3), minPx: +minPx.toFixed(1), minText, under: texts.filter((t) => parseFloat(getComputedStyle(t).fontSize) * scale < MIN).length, texts: texts.length, overlaps, spill });
    });

    // Tables wider than the screen, not inside a sideways scroller.
    document.querySelectorAll('table').forEach((t, i) => {
      const b = t.getBoundingClientRect();
      if (b.right <= vw + 1) return;
      let scroller = false;
      for (let p = t.parentElement; p; p = p.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { scroller = true; break; }
      }
      out.tables.push({ index: i + 1, width: Math.round(b.width), scroller });
    });

    // Reading text under 16px: paragraphs and list items in post bodies,
    // summaries, FAQ answers and page body copy.
    document.querySelectorAll('.prose p, .prose li, .post-tldr p, .post-faq-a, .post-faq-a p, .about-intro, .about-body p, .about-body').forEach((p) => {
      if (p.closest('figure, table')) return;
      const fs = parseFloat(getComputedStyle(p).fontSize);
      if (fs < 16) out.smallBody.push(`${p.className || p.parentElement.className} ${fs}px`);
    });
    // Any visible text under 12px, outside charts.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el) || el.closest('svg, script, style, noscript')) continue;
      seen.add(el);
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || el.getClientRects().length === 0) continue;
      if (parseFloat(s.fontSize) < 12) out.tinyText.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${n.textContent.trim().slice(0, 30)}" ${parseFloat(s.fontSize)}px`);
    }

    // Tap targets.
    document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') return;
      // Visually hidden inputs are operated through their label: measure the label.
      // Hidden inputs taken out of the tab order are opened by a visible control.
      if (el.tagName === 'INPUT' && b.width <= 2 && b.height <= 2 && el.tabIndex === -1) return;
      if (el.tagName === 'INPUT' && b.width <= 2 && b.height <= 2) {
        const label = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
        if (label) { const lb = label.getBoundingClientRect(); if (lb.width >= 24 && lb.height >= 24) return; }
      }
      if (el.tagName === 'A' && s.display === 'inline' && el.closest('p, li, td, figcaption, dd, blockquote')) return; // inline link in running text
      if (b.width < 24 || b.height < 24) out.smallTargets.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    });
    return out;
  }, MIN_FIGURE_PX);
  results.push({ path, status, ...r });
}
await browser.close();

let blocking = 0;
for (const p of results) {
  const lines = [];
  if (p.error) lines.push(`ERROR ${p.error}`);
  if (p.status && p.status >= 400 && p.path !== '/404') lines.push(`HTTP ${p.status}`);
  if (p.overflow) lines.push(`OVERFLOW scrollWidth ${p.overflow.scrollWidth}: ${p.overflow.culprits.join('; ')}`);
  for (const f of p.figures || []) {
    const bad = f.minPx < MIN_FIGURE_PX || f.overlaps.length || f.spill.length;
    if (bad) lines.push(`FIGURE ${f.index} "${f.title}" scale ${f.scale}: min ${f.minPx}px ("${f.minText}"), ${f.under}/${f.texts} labels under ${MIN_FIGURE_PX}px${f.overlaps.length ? `, overlaps: ${f.overlaps.slice(0, 4).join('; ')}` : ''}${f.spill.length ? `, spill: ${f.spill.slice(0, 4).join('; ')}` : ''}`);
  }
  for (const t of p.tables || []) if (!t.scroller) lines.push(`TABLE ${t.index} ${t.width}px wide, no sideways scroll`);
  if ((p.smallBody || []).length) lines.push(`SMALL READING TEXT ${p.smallBody.length}: ${[...new Set(p.smallBody)].slice(0, 4).join('; ')}`);
  if ((p.tinyText || []).length) lines.push(`TEXT UNDER 12PX ${p.tinyText.length}: ${p.tinyText.slice(0, 5).join('; ')}`);
  if ((p.smallTargets || []).length) lines.push(`SMALL TARGETS ${p.smallTargets.length}: ${p.smallTargets.slice(0, 4).join('; ')}`);
  if (p.error || p.overflow || (p.figures || []).some((f) => f.minPx < MIN_FIGURE_PX || f.overlaps.length || f.spill.length) || (p.tables || []).some((t) => !t.scroller) || (p.smallBody || []).length || (p.tinyText || []).length || (p.smallTargets || []).length) blocking++;
  if (lines.length) console.log(`\n${p.path}\n  ${lines.join('\n  ')}`);
}
const figs = results.flatMap((p) => p.figures || []);
console.log(`\n${results.length} pages at ${width}px, ${figs.length} figures. Pages with blocking issues: ${blocking}.`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
process.exit(blocking ? 1 : 0);
