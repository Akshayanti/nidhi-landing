#!/usr/bin/env node
// Phone-width audit of every site page.
//
//   node scripts/audit-mobile.mjs [baseUrl] [--width 375] [--json out.json] [--dist dist] [--path /a/,/b/] [--jobs 3]
//
// The pages are every page in dist/ (build first), in every language. With no
// baseUrl the built site in dist/ is served locally, as GitHub Pages serves it
// (scripts/lib/checks/serve-dist.mjs); give a dev or preview server's address to
// audit that instead.
//
// For each page it reports:
// - horizontal overflow (the page scrolls sideways) and the elements causing it
// - blog figures: the smallest label size as actually rendered on screen,
//   labels that overlap each other, and labels that spill outside the figure
// - tables wider than the screen that are not in a sideways-scrolling box
// - body text under 16px
// - tap targets (links, buttons, inputs) smaller than 24 x 24 px that are not
//   inline links inside a sentence (WCAG 2.2 target size, minimum)
// Each finding names its page, its kind (`rule`) and the element, by a
// selector unique in the page plus what was measured. Known findings, each
// tracked in an issue, are listed in scripts/lib/checks/known-failures.mjs (check
// 'audit'); a page that does not load or scrolls sideways cannot be excused.
// Exit code 1 on any other finding, or on a known-failure entry that is
// malformed, out of date or matches nothing.

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { loadDist, readHead } from './lib/checks/check-dist.mjs';
import { KNOWN_FAILURES, report, splitKnown } from './lib/checks/known-failures.mjs';
import { serveDist } from './lib/checks/serve-dist.mjs';

const args = process.argv.slice(2);
const given = args.find((a) => /^https?:/.test(a));
const width = Number(args[args.indexOf('--width') + 1]) || 375;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const distDir = args.includes('--dist') ? args[args.indexOf('--dist') + 1] : join(import.meta.dirname, '..', 'dist');
const only = args.includes('--path') ? args[args.indexOf('--path') + 1].split(',') : null;
const jobs = Math.max(1, Number(args.includes('--jobs') ? args[args.indexOf('--jobs') + 1] : 3) || 3);
const MIN_FIGURE_PX = 10; // smallest acceptable rendered chart label

/**
 * Every page the build wrote, in every language, read from dist/ (#364): the
 * list can no longer fall behind the site, as the hand-kept one did (it had
 * only English and Hindi, and missed the two newest tools). Redirect pages
 * are left out, since they show nothing, and an address that does not exist
 * is added once per edition, to audit the not-found page in each language.
 * `--path /a/,/b/` audits only those pages.
 */
function pagesFromDist(dir) {
  if (!existsSync(dir)) throw new Error(`${dir} does not exist: build the site first (npm run build).`);
  const site = loadDist(dir);
  const pages = [];
  for (const [path, html] of site.pages) {
    if (path === '/404.html') continue;
    if (readHead(html).redirect) continue;
    pages.push(path);
  }
  const editions = [...new Set(pages.map((p) => /^\/(hi|es|cs|mr)\//.exec(p)?.[0] ?? '/'))];
  for (const prefix of editions) pages.push(`${prefix}no-such-page/`);
  return pages.sort();
}

const pages = only ?? pagesFromDist(distDir);
const served = given ? null : await serveDist(distDir);
const base = (given || served.base).replace(/\/$/, '');

const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });

/** Measure one loaded page. Every finding carries the element's selector, unique in the page. */
function measure(MIN) {
  const vw = window.innerWidth;
  const out = { overflow: null, figures: [], tables: [], smallBody: [], tinyText: [], smallTargets: [] };

  // `tag.class` names a class of elements; `unique(el)` finds only this one:
  // its tag and classes, then each ancestor's, with :nth-of-type where a
  // parent holds more than one of the same tag, until one element matches.
  const esc = (c) => CSS.escape(c);
  const classes = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const classOf = (el) => `${el.tagName.toLowerCase()}${classes(el).length ? '.' + esc(classes(el)[0]) : ''}`;
  const one = (selector) => document.querySelectorAll(selector).length === 1;
  const step = (el) => {
    if (el.id && one(`#${esc(el.id)}`)) return `#${esc(el.id)}`;
    const own = `${el.tagName.toLowerCase()}${classes(el).map((c) => '.' + esc(c)).join('')}`;
    const parent = el.parentElement;
    const same = parent ? [...parent.children].filter((c) => c.tagName === el.tagName) : [];
    return same.length > 1 ? `${own}:nth-of-type(${same.indexOf(el) + 1})` : own;
  };
  const unique = (el) => {
    let selector = step(el);
    for (let node = el.parentElement; node && !one(selector) && node !== document.documentElement; node = node.parentElement) {
      selector = `${step(node)} > ${selector}`;
    }
    return selector;
  };
  const finding = (el, value, detail) => ({ element: `${unique(el)} @ ${value}`, ruleElement: `${classOf(el)} @ ${value}`, detail });

  // Horizontal overflow and its sources (ignore content inside sideways scrollers).
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const scrollerOf = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return p;
      }
      return null;
    };
    const culprits = [];
    for (const el of document.body.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.right <= vw + 1) continue;
      if (scrollerOf(el)) continue;
      culprits.push(`${unique(el)} right=${Math.round(b.right)}`);
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
    // Text drawn unseen (the samples a chart measures its labels with) is not
    // something a reader sees, so it is not measured.
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && getComputedStyle(t).visibility === 'visible');
    // Icons and legend swatches have no labels to measure.
    if (!texts.length) return;
    let minPx = Infinity;
    let minText = '';
    const rects = [];
    const spill = [];
    for (const t of texts) {
      const px = parseFloat(getComputedStyle(t).fontSize) * scale;
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
    const under = texts.filter((t) => parseFloat(getComputedStyle(t).fontSize) * scale < MIN).length;
    if (minPx < MIN || overlaps.length || spill.length) {
      const title = svg.querySelector('title')?.textContent?.trim() || '';
      out.figures.push(finding(svg, `min ${minPx.toFixed(1)}px`, `figure ${i + 1} "${title}" scale ${scale.toFixed(3)}: min ${minPx.toFixed(1)}px ("${minText}"), ${under}/${texts.length} labels under ${MIN}px${overlaps.length ? `, overlaps: ${overlaps.slice(0, 4).join('; ')}` : ''}${spill.length ? `, spill: ${spill.slice(0, 4).join('; ')}` : ''}`));
    }
  });

  // Tables wider than the screen, not inside a sideways scroller.
  document.querySelectorAll('table').forEach((t) => {
    const b = t.getBoundingClientRect();
    if (b.right <= vw + 1) return;
    // Screen-reader-only data tables sit in a 1px clipped box: not visible,
    // and the box (not the table) decides the page width.
    for (let p = t; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const pb = p.getBoundingClientRect();
      if ((cs.clip && cs.clip !== 'auto') || (cs.overflow === 'hidden' && pb.width <= 1 && pb.height <= 1)) return;
    }
    for (let p = t.parentElement; p; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return;
    }
    out.tables.push(finding(t, `${Math.round(b.width)}px wide`, `table ${Math.round(b.width)}px wide, no sideways scroll`));
  });

  // Reading text under 16px: paragraphs and list items in post bodies,
  // summaries, FAQ answers and page body copy.
  document.querySelectorAll('.prose p, .prose li, .post-tldr li, .post-faq-a, .post-faq-a p, .about-intro, .about-body p, .about-body').forEach((p) => {
    if (p.closest('figure, table')) return;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 16) out.smallBody.push(finding(p, `${fs}px`, `reading text ${fs}px`));
  });
  // Any visible text under 13px, outside charts.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || el.closest('svg, script, style, noscript')) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || el.getClientRects().length === 0) continue;
    const fs = parseFloat(s.fontSize);
    if (fs < 13) out.tinyText.push(finding(el, `${fs}px`, `"${n.textContent.trim().slice(0, 30)}" ${fs}px`));
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
    // WCAG 2.5.8's inline exception: a link, or a glossary term (the button
    // that termTips.js puts in a linked term's place), inside a sentence.
    const inline = (el.tagName === 'A' && s.display === 'inline') || el.classList.contains('term-tip-trigger');
    if (inline && el.closest('p, li, td, figcaption, dd, blockquote, summary')) return;
    // A radio or check box wrapped in its label is pressed through the label
    // too, so the label is the target (the rule above already measures a
    // hidden input's label the same way).
    if (el.tagName === 'INPUT' && /^(radio|checkbox)$/.test(el.type)) {
      const label = el.closest('label');
      if (label) { const lb = label.getBoundingClientRect(); if (lb.width >= 24 && lb.height >= 24) return; }
    }
    if (b.width < 24 || b.height < 24) {
      const size = `${Math.round(b.width)}x${Math.round(b.height)}`;
      out.smallTargets.push(finding(el, size, `"${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)}" ${size}`));
    }
  });
  return out;
}

/** The audit's kinds of finding: `rule` in a problem and in a known-failure entry. */
const RULES = { figures: 'figure', tables: 'table-overflow', smallBody: 'small-reading-text', tinyText: 'text-under-13px', smallTargets: 'small-target' };

const results = [];
const problems = [];
const pageLevel = (path, rule, message) => problems.push({ check: 'audit', rule, page: path, element: '', message: `${path}: ${message}` });

async function audit(tab, path) {
  let status = 0;
  try {
    const res = await tab.goto(base + path, { waitUntil: 'networkidle2', timeout: 60000 });
    status = res ? res.status() : 0;
  } catch (e) {
    results.push({ path, error: String(e.message || e) });
    pageLevel(path, 'error', `ERROR ${String(e.message || e)}`);
    return;
  }
  await tab.evaluate(() => document.fonts.ready);
  const r = await tab.evaluate(measure, MIN_FIGURE_PX);
  results.push({ path, status, ...r });
  if (status >= 400 && !path.endsWith('no-such-page/')) pageLevel(path, 'http', `HTTP ${status}`);
  if (r.overflow) pageLevel(path, 'overflow', `OVERFLOW scrollWidth ${r.overflow.scrollWidth}: ${r.overflow.culprits.join('; ')}`);
  for (const [key, rule] of Object.entries(RULES)) {
    for (const f of r[key]) problems.push({ check: 'audit', rule, page: path, element: f.element, ruleElement: f.ruleElement, message: `${path}: ${rule} ${f.element}: ${f.detail}` });
  }
}

let next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, pages.length) }, async () => {
  const tab = await browser.newPage();
  await tab.setViewport({ width, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  while (next < pages.length) await audit(tab, pages[next++]);
  await tab.close();
}));
await browser.close();
served?.server.close();

const failed = report('audit', splitKnown(problems, KNOWN_FAILURES.filter((k) => k.check === 'audit')), { full: !only });
console.log(`\n${results.length} pages at ${width}px. ${failed} problem(s).`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ results, problems }, null, 2));
process.exit(failed ? 1 : 0);
