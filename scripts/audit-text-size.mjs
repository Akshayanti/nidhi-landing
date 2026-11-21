#!/usr/bin/env node
// Large-text audit of the free tools, run against a dev or preview server.
//
//   node scripts/audit-text-size.mjs [baseUrl] [--tool a,b] [--locale en,hi]
//        [--width 320,375] [--size 100,200] [--path /,/about/]
//        [--json out.json] [--shots dir] [--show]
//
// --path measures other pages instead of the tools (each in every language
// asked for). --show opens a Chrome window instead of running without one.
//
// One run covers every text size, so a fix at one size cannot quietly leave
// the next one broken: each tool, in each language, at each screen width, at
// each text size, in each of its states (as loaded, every fold open, every
// tab, every choice that reveals a field, and long amounts typed in, up to
// the largest the tools accept).
//
// "Text size" is the browser's own default font size (16 px is 100%), set in
// a fresh profile, not page zoom: zoom is the same as a narrower screen, and
// the widths cover that.
//
// It fails on:
// - sideways scroll: the page is wider than the screen
// - spill: text runs past the edge of the box that holds it
// - cut: text is clipped by a box that hides what does not fit
// - overlap: two pieces of text sit on top of each other
// - split: a number or a word broken across two lines when it would have
//   fitted on a line of its own
// - amount: an amount in a tool's results (Amounts.tsx) that is on more than
//   one line, wider than its line, drawn below 16 px, or, when it was drawn
//   smaller to fit, left filling under 85% of its line (only the longest of a
//   group that shares one size is held to that); and an amount in a tool's
//   results that is not drawn as a unit at all
// - chart: text inside a chart's SVG that runs past the drawing (or the box
//   that clips it), sits on top of another label, or is drawn below 75% of
//   the reader's text size: chart text grows with the page's (#676)
// It counts, without failing, the numbers and words that are wider than the
// line they sit in. Those have to break somewhere, so the counts are for
// comparing a change with what was there before.
//
// The cookie banner is answered ("declined") before each page loads, so it
// does not cover the page; --banner leaves it up and measures with it.
//
// --no-fonts blocks the web fonts, so the page is measured in the fallback
// fonts of this machine: what a reader sees while the fonts load, or when
// they fail. The 85% check is left out of that pass.
//
// What it does not reach: Safari, Firefox, a phone's own text-size setting,
// dialogs, printed reports, and a chart's lines and shapes (its text is checked).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:/.test(a)) || 'http://localhost:4321').replace(/\/$/, '');
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const pick = (name, all) => (opt(name) ? opt(name).split(',') : all);

// Kept in step with LOCALES in src/i18n/config.ts and the tools under
// src/pages/free/ by hand: this script runs under plain node.
const LOCALES = ['en', 'hi', 'es', 'cs', 'mr'];
const TOOLS = ['loan-comparison', 'multi-currency-net-worth', 'monte-carlo-simulator', 'inflation-calculator', 'invest-or-pay-off'];
const WIDTHS = [320, 360, 375, 414, 480, 640, 768, 1024, 1280];
const SIZES = [100, 150, 200, 300, 400];

const tools = pick('--tool', TOOLS);
// Other pages, when asked for; otherwise the tools.
const paths = opt('--path') ? opt('--path').split(',') : tools.map((t) => `/free/${t}/`);
const locales = pick('--locale', LOCALES);
const widths = pick('--width', WIDTHS).map(Number);
const sizes = pick('--size', SIZES).map(Number);
const only = opt('--state') ? opt('--state').split(';') : null;
const jsonOut = opt('--json');
const noFonts = args.includes('--no-fonts');
const shots = opt('--shots');
if (shots) mkdirSync(shots, { recursive: true });


/** Measures the page as it stands. Runs in the browser. */
function measure(CHECK_FILL) {
  // A currency symbol against a figure, on either side.
  const RAW = /\p{Sc}[\u00a0\u202f]?\d[\d.,'\u00a0\u202f]*|\d[\d.,'\u00a0\u202f]*[\u00a0\u202f]?(?:\p{Sc}|K\u010d)/u;
  const vw = document.documentElement.clientWidth;
  const out = { scroll: 0, culprits: [], spill: [], cut: [], overlap: [], split: [], amount: [], chart: [], forcedNumbers: 0, forcedWords: 0, forcedSamples: [] };
  const name = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  };
  const say = (el) => `${name(el)} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
  const hidden = (el) => {
    // Closed folds, closed menus and faded-out layers are not on screen.
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) return true;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden') return true;
      const b = p.getBoundingClientRect();
      // Screen-reader-only text sits in a clipped 1 px box.
      if (b.width <= 1 && b.height <= 1 && s.overflow !== 'visible') return true;
      if (s.clip !== 'auto' || (s.clipPath !== 'none' && b.width <= 2)) return true;
    }
    return false;
  };
  const clipperOf = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return p;
    }
    return null;
  };
  const scrollerOf = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth) return p;
    }
    return null;
  };

  // Whether a line of text is inside every box above it that hides what
  // runs past its top or bottom (a table that scrolls inside its own box).
  const inView = (el, r) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowY)) continue;
      const b = p.getBoundingClientRect();
      if (r.bottom <= b.top + 1 || r.top >= b.bottom - 1) return false;
    }
    return true;
  };

  // Sideways scroll, and the elements that reach past the screen.
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    out.scroll = sw - vw;
    const seen = [];
    for (const el of document.body.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.right <= vw + 1 || clipperOf(el) || hidden(el)) continue;
      // Keep the deepest elements: drop an ancestor once a child is listed.
      for (let i = seen.length - 1; i >= 0; i--) if (seen[i].contains(el)) seen.splice(i, 1);
      seen.push(el);
    }
    out.culprits = seen.slice(0, 6).map((el) => `${say(el)} +${Math.round(el.getBoundingClientRect().right - vw)}`);
  }

  // Text, one piece per text node.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const pieces = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, noscript, template, option, select') || hidden(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const all = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    // Leave out lines scrolled out of sight inside a box that scrolls up and down.
    const rects = all.filter((r) => inView(el, r));
    if (!rects.length) continue;
    pieces.push({ n, el, rects });

    // Spill: the text reaches past the nearest box with an edge of its own.
    let box = el;
    while (box && box !== document.body && /^(inline|contents)$/.test(getComputedStyle(box).display)) box = box.parentElement;
    if (box && box !== document.body && !scrollerOf(el)) {
      const bb = box.getBoundingClientRect();
      const over = Math.max(...rects.map((r) => r.right)) - bb.right;
      const under = bb.left - Math.min(...rects.map((r) => r.left));
      if (over > 1.5 || under > 1.5) out.spill.push(`${say(box)} +${Math.round(Math.max(over, under))}`);
    }
    // Cut: a clipping ancestor hides part of the text.
    const clip = clipperOf(el);
    if (clip && !/(auto|scroll)/.test(getComputedStyle(clip).overflowX)) {
      const cb = clip.getBoundingClientRect();
      const over = Math.max(...rects.map((r) => r.right)) - cb.right;
      if (over > 1.5 && cb.width > 2) out.cut.push(`${say(el)} in ${name(clip)} +${Math.round(over)}`);
    }

    // Words broken in the middle, and numbers split between digits.
    const text = n.textContent;
    // A unit is what the page asks to keep together: a word, or words and
    // figures joined by no-break spaces ("98 765 Kc" in Czech, a bracketed term).
    // A slash does not end a unit: the browser keeps "origination/closing" together.
    const re = /[^ \t\n\r\u200b\u00ad-]+/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m[0].length < 2) continue;
      // Joined by a no-break space to something outside this piece of text
      // (a link before it, say): the unit is longer than what is seen here.
      if (/^[\u00a0\u202f]|[\u00a0\u202f]$/.test(m[0])) continue;
      if (m.index === 0 && pieces.length > 1 && /[\u00a0\u202f]$/.test(pieces[pieces.length - 2].n.textContent)) continue;
      const wr = document.createRange();
      wr.setStart(n, m.index);
      wr.setEnd(n, m.index + m[0].length);
      // On more than one line: its pieces sit at clearly different heights.
      const drawnPieces = [...wr.getClientRects()].filter((r) => r.width > 0.5);
      if (!drawnPieces.some((r) => Math.abs(r.top - drawnPieces[0].top) > drawnPieces[0].height * 0.4)) continue;
      // A language that hyphenates shows the reader a hyphen: a chosen break.
      if (getComputedStyle(el).hyphens === 'auto' && !/\d/.test(m[0])) continue;
      // Where the line ends inside it. Between two letters or two digits, or
      // anywhere inside an amount (a sign or a currency symbol left behind),
      // the reader sees a broken word or number. After other punctuation
      // ("?from=EUR") it is an ordinary line end.
      const isNumber = /\d/.test(m[0]) && !/\p{L}{4,}/u.test(m[0]);
      let inside = isNumber;
      if (!inside) {
        const cr = document.createRange();
        let last = null;
        for (let i = 0; i < m[0].length && !inside; i++) {
          cr.setStart(n, m.index + i);
          cr.setEnd(n, m.index + i + 1);
          const b = cr.getBoundingClientRect();
          if (b.width < 0.5) continue;
          if (last !== null && Math.abs(b.top - last.top) > last.height / 2) inside = /[\p{L}\p{M}\p{N}]/u.test(m[0][i]) && /[\p{L}\p{M}\p{N}]/u.test(m[0][last.i]);
          last = { top: b.top, height: b.height, i };
        }
      }
      if (!inside) continue;
      // Broken although it fits on a line of its own: that is a finding.
      // Wider than the line: it has to break, so it is only counted.
      let line = el;
      while (line && line !== document.body && /^(inline|contents)$/.test(getComputedStyle(line).display)) line = line.parentElement;
      const ls = getComputedStyle(line);
      let room = line.clientWidth - parseFloat(ls.paddingLeft) - parseFloat(ls.paddingRight);
      // Text straight inside a row shares the row with the row's other items.
      if (/flex|grid/.test(ls.display) && !/column/.test(ls.flexDirection) && n.parentElement === line) {
        for (const c of line.children) if (getComputedStyle(c).position !== 'absolute') room -= c.getBoundingClientRect().width + (parseFloat(ls.columnGap) || 0);
      }
      // Its width unbroken is the sum of its pieces as drawn.
      const drawn = [...wr.getClientRects()].reduce((sum, x) => sum + x.width, 0);
      // A little slack (2% of the line): a word that fits only on paper, by a
      // pixel or two, is not a finding.
      if (drawn <= room - Math.max(2, room * 0.02)) out.split.push(`${name(el)} "${m[0]}" (${Math.round(drawn)} wide in a line of ${Math.round(room)})`);
      else {
        if (isNumber) out.forcedNumbers += 1;
        else out.forcedWords += 1;
        if (out.forcedSamples.length < 4) out.forcedSamples.push(`${name(el)} "${m[0]}"`);
      }
    }
  }

  // Amounts drawn as units.
  const reduced = new Map();
  // Amounts that share a size with one that is not showing (the other offers
  // behind a phone's tabs): the longest of the group may be one of those.
  const unseen = new Map();
  for (const a of document.querySelectorAll('.amt')) {
    if (hidden(a)) {
      const len = a.style.getPropertyValue('--amt-len');
      unseen.set(len, [...(unseen.get(len) || []), a.textContent]);
      continue;
    }
    const text = a.textContent;
    const r = document.createRange();
    r.selectNodeContents(a);
    const rows = [...r.getClientRects()].filter((x) => x.width > 0.5);
    if (rows.some((x) => Math.abs(x.top - rows[0].top) > rows[0].height * 0.4)) out.amount.push(`broken "${text}"`);
    const size = parseFloat(getComputedStyle(a).fontSize);
    const around = parseFloat(getComputedStyle(a.parentElement).fontSize);
    // Small print keeps its own size; only an amount the fit made smaller is held to the floor.
    if (size < 15.95 && size < around - 0.5) out.amount.push(`below 16px (${size.toFixed(1)}) "${text}"`);
    let box = a.parentElement;
    while (box && box !== document.body && /^(inline|contents)$/.test(getComputedStyle(box).display)) box = box.parentElement;
    const bs = getComputedStyle(box);
    // What the page says always sits beside the amount on its line (--amt-beside).
    const gauge = document.createElement('span');
    gauge.style.cssText = 'position:absolute;visibility:hidden;width:var(--amt-beside, 0px)';
    a.appendChild(gauge);
    const beside = gauge.getBoundingClientRect().width;
    gauge.remove();
    const line = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    const room = Math.max(line - beside, 1);
    const width = a.getBoundingClientRect().width;
    if (width > line + 1) out.amount.push(`wider than its line by ${Math.round(width - line)} "${text}" in ${name(box)}`);
    if (size < around - 0.5) {
      // Amounts that share a size: the same length and the same drawn size.
      const key = `${a.style.getPropertyValue('--amt-len')}|${size.toFixed(1)}|${Math.round(room)}`;
      const g = reduced.get(key) || { fill: 0, text };
      if (width / room > g.fill) { g.fill = width / room; g.text = text; }
      // The same amounts drawn where this one is: how wide the unseen ones would be.
      for (const other of new Set(unseen.get(a.style.getPropertyValue('--amt-len')) || [])) {
        const twin = document.createElement('span');
        twin.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
        twin.textContent = other;
        a.appendChild(twin);
        const w = twin.getBoundingClientRect().width;
        twin.remove();
        if (w / room > g.fill) { g.fill = w / room; g.text = other; }
      }
      reduced.set(key, g);
    }
  }
  if (CHECK_FILL) for (const g of reduced.values()) if (g.fill < 0.85) out.amount.push(`fills ${Math.round(g.fill * 100)}% of its line "${g.text}"`);
  // An amount in a tool's results that is not drawn as a unit.
  for (const p of pieces) {
    if (!p.el.closest('astro-island') || p.el.closest('.amt, input, textarea, select, button, label, legend, table.chart-srOnly, [aria-hidden="true"]')) continue;
    const m = p.n.textContent.match(RAW);
    if (m) out.amount.push(`not a unit "${m[0]}" in ${name(p.el)}`);
  }
  out.amount = [...new Set(out.amount)].slice(0, 8);

  // Overlap: two pieces of text from different elements on top of each other.
  const flat = pieces.flatMap((p) => p.rects.map((r) => ({ r, p })));
  flat.sort((a, b) => a.r.top - b.r.top);
  const found = new Set();
  for (let i = 0; i < flat.length; i++) {
    const A = flat[i];
    for (let j = i + 1; j < flat.length && flat[j].r.top < A.r.bottom; j++) {
      const B = flat[j];
      if (A.p === B.p || A.p.el.contains(B.p.el) || B.p.el.contains(A.p.el)) continue;
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      // Lines of one paragraph share a few pixels of leading; that is not an overlap.
      if (w > 2 && h > 0.35 * Math.min(A.r.height, B.r.height)) found.add(`${say(A.p.el)} × ${say(B.p.el)}`);
    }
  }
  out.overlap = [...found].slice(0, 6);

  // Chart text (#676): every label drawn inside a chart's SVG grows with the
  // reader's text size, stays inside the drawing, and sits clear of every
  // other label. A label the chart left off is simply not there.
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  for (const svg of document.querySelectorAll('svg')) {
    if (hidden(svg)) continue;
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && t.checkVisibility({ visibilityProperty: true }) && !t.closest('[visibility="hidden"]'));
    if (!texts.length) continue;
    const sb = svg.getBoundingClientRect();
    if (sb.width < 2) continue;
    const vb = svg.viewBox.baseVal;
    const scale = vb && vb.width ? Math.min(sb.width / vb.width, sb.height / vb.height) : 1;
    const label = (t) => `"${t.textContent.trim().slice(0, 24)}" in ${name(svg)}`;
    const boxes = [];
    for (const t of texts) {
      // Each line (tspan) is its own box; a text without tspans is one.
      const parts = t.querySelectorAll('tspan').length ? [...t.querySelectorAll('tspan')] : [t];
      for (const p of parts) {
        const r = p.getBoundingClientRect();
        if (r.width < 0.5) continue;
        boxes.push({ r, t });
        if (r.left < sb.left - 1.5 || r.right > sb.right + 1.5 || r.top < sb.top - 1.5 || r.bottom > sb.bottom + 1.5) out.chart.push(`cut ${label(t)}`);
        // Two in a row past the side of the screen, say, inside a chart that scrolls.
        const clip = clipperOf(svg);
        if (clip && !/(auto|scroll)/.test(getComputedStyle(clip).overflowX)) {
          const cb = clip.getBoundingClientRect();
          if (r.right > cb.right + 1.5 || r.left < cb.left - 1.5) out.chart.push(`cut by ${name(clip)} ${label(t)}`);
        }
      }
      const drawn = parseFloat(getComputedStyle(t).fontSize) * scale;
      if (drawn < root * 0.75 - 0.5) out.chart.push(`small (${drawn.toFixed(1)}px at a ${root}px root) ${label(t)}`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i]; const B = boxes[j];
      if (A.t === B.t) continue;
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (w > 1 && h > 0.2 * Math.min(A.r.height, B.r.height)) out.chart.push(`overlap ${label(A.t)} × ${label(B.t)}`);
    }
  }
  out.chart = [...new Set(out.chart)].slice(0, 8);
  out.spill = [...new Set(out.spill)].slice(0, 6);
  out.cut = [...new Set(out.cut)].slice(0, 6);
  out.split = [...new Set(out.split)].slice(0, 6);
  return out;
}

/**
 * Types amounts into the tool's amount fields, through React's own setter so
 * the tool recomputes as it does for a reader. A field the tool then marks as
 * invalid (a figure over that field's limit, or a field that is not an amount
 * after all) is given the next figure down the list until the tool accepts
 * one, and its old value back if it accepts none: so each field ends at the
 * largest figure it takes, and the state shows a result, not an error. Runs in
 * the browser.
 */
async function typeAmounts([first, ...lower]) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const type = (input, value) => {
    set.call(input, value);
    for (const e of ['input', 'change', 'blur']) input.dispatchEvent(new Event(e, { bubbles: true }));
  };
  const fields = [...document.querySelectorAll('.toolp-page input[inputmode="decimal"], .toolp-page input[inputmode="numeric"]')]
    .filter((input) => !input.closest('[hidden]') && !/rate|pct|percent|years|term|inflation|return|relief|tax|fee|points|until/i.test(input.id));
  const before = fields.map((input) => input.value);
  const step = fields.map((_, i) => (i === 0 ? -1 : 0));
  fields.forEach((input, i) => type(input, i === 0 ? first : lower[0]));
  for (let round = 0; round <= lower.length; round++) {
    await new Promise((r) => setTimeout(r, 500));
    const rejected = fields.map((input, i) => [input, i]).filter(([input]) => input.getAttribute('aria-invalid') === 'true');
    if (!rejected.length) break;
    for (const [input, i] of rejected) {
      step[i] += 1;
      type(input, step[i] < lower.length ? lower[step[i]] : before[i]);
    }
  }
  await new Promise((r) => setTimeout(r, 900));
}

const LONGEST = ['1000000000000', '1000000000000', '100000000000', '10000000000', '1000000000', '100000000', '10000000'];

/** The states of a tool page, each a function that changes the page in the browser. */
const STATES = [
  ['loaded', null],
  ['folds open', () => { document.querySelectorAll('main details, .toolp-page details').forEach((d) => { d.open = true; }); }],
  // Eight digits in every amount field: the length a reader with a large
  // balance in a low-value currency sees.
  ['long amounts', typeAmounts, ['98765432', '98765432']],
  // The largest amounts the tools accept. Every tool's main amount takes up to
  // 1,000,000,000,000 (1e12, thirteen digits); the other amount fields have
  // lower limits (1e11 for the simulator's withdrawal, 1e10 for its monthly
  // amount). Each field is offered the figures in turn, largest first, and
  // keeps the first one the tool accepts: its own maximum.
  ['longest amounts', typeAmounts, LONGEST],
  ['last choices', async () => {
    // The last radio of each group is the one that reveals a field ("My own figure").
    const groups = new Map();
    for (const r of document.querySelectorAll('.toolp-page input[type="radio"]')) groups.set(r.name, r);
    for (const r of groups.values()) r.click();
    // A switch that is off hides its fields too ("Take money out later").
    for (const c of document.querySelectorAll('.toolp-page input[type="checkbox"]')) if (!c.checked && !c.closest('[hidden]')) c.click();
    await new Promise((r) => setTimeout(r, 400));
  }],
  // The fields those choices revealed, at their own maxima as well.
  ['longest amounts, every choice', typeAmounts, LONGEST],
];

const results = [];
const run = async (size) => {
  // A fresh profile whose default font size is the reader's text size.
  const profile = mkdtempSync(join(tmpdir(), 'nidhi-text-size-'));
  mkdirSync(join(profile, 'Default'), { recursive: true });
  const px = Math.round(16 * size / 100);
  writeFileSync(join(profile, 'Default', 'Preferences'), JSON.stringify({ webkit: { webprefs: { default_font_size: px, default_fixed_font_size: Math.round(13 * size / 100) } } }));
  const browser = await puppeteer.launch({ headless: !args.includes('--show'), userDataDir: profile });
  try {
    const page = await browser.newPage();
    if (noFonts) {
      await page.setRequestInterception(true);
      page.on('request', (req) => (req.resourceType() === 'font' ? req.abort() : req.continue()));
    }
    if (!args.includes('--banner')) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('nidhi-cookie-consent', 'declined'); } catch { /* no storage */ } });
    for (const tool of paths) for (const locale of locales) for (const width of widths) {
      const path = `${locale === 'en' ? '' : '/' + locale}${tool}`;
      // The dev server reloads a page when a source file is saved under it:
      // that page is measured again, up to three times.
      for (let attempt = 1; ; attempt++) {
        const taken = [];
        try {
          await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 800, hasTouch: width < 800 });
          await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 90000 });
          await page.evaluate(() => document.fonts.ready);
          // A tool that never started would be measured as a still picture of
          // itself: typed amounts and choices would change nothing.
          await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), { timeout: 30000 })
            .catch(() => { throw new Error(`A tool on ${path} did not start (its island never hydrated)`); });
          const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
          if (Math.abs(root - px) > 0.5) throw new Error(`Text size not applied: root is ${root}px, expected ${px}px`);
          const tabs = await page.$$eval('.toolp-page [role="tab"]', (els) => els.length);
          const isTool = await page.$('.toolp-page') !== null;
          const states = [...(isTool ? STATES : STATES.slice(0, 2)), ...Array.from({ length: tabs }, (_, i) => [`tab ${i + 1}`, async (index) => {
            document.querySelectorAll('.toolp-page [role="tab"]')[index].click();
            await new Promise((r) => setTimeout(r, 500));
          }, i])];
          for (const [state, change, arg] of states) {
            // --state measures the named states only, in order ("a;b").
            if (only && !only.includes(state)) continue;
            if (change) await page.evaluate(change, arg);
            const m = await page.evaluate(measure, !noFonts);
            taken.push({ tool, locale, width, size, state, ...m });
            const bad = m.scroll || m.spill.length || m.cut.length || m.overlap.length || m.split.length || m.amount.length || m.chart.length;
            if (shots && bad) await page.screenshot({ path: join(shots, `${tool.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${locale}-${width}-${size}-${state.replace(/\s+/g, '-')}.png`), fullPage: true });
          }
          results.push(...taken);
          break;
        } catch (e) {
          if (attempt >= 3 || !/context was destroyed|detached|navigation/i.test(String(e.message))) throw e;
        }
      }
    }
  } finally {
    await browser.close();
    rmSync(profile, { recursive: true, force: true });
  }
};
for (const size of sizes) await run(size);

let failing = 0;
let forcedWords = 0;
let forcedNumbers = 0;
for (const r of results) {
  forcedWords += r.forcedWords;
  forcedNumbers += r.forcedNumbers;
  const lines = [];
  if (r.scroll) lines.push(`SCROLL +${r.scroll}px: ${r.culprits.join('; ')}`);
  if (r.spill.length) lines.push(`SPILL ${r.spill.join('; ')}`);
  if (r.cut.length) lines.push(`CUT ${r.cut.join('; ')}`);
  if (r.overlap.length) lines.push(`OVERLAP ${r.overlap.join('; ')}`);
  if (r.split.length) lines.push(`SPLIT ${r.split.join('; ')}`);
  if (r.amount.length) lines.push(`AMOUNT ${r.amount.join('; ')}`);
  if (r.chart.length) lines.push(`CHART ${r.chart.join('; ')}`);
  if (!lines.length) continue;
  failing += 1;
  console.log(`\n${r.tool} ${r.locale} ${r.width}px ${r.size}% [${r.state}]`);
  for (const l of lines) console.log('  ' + l);
}
console.log(`\n${results.length} measurements, ${failing} with a finding, ${forcedWords} words and ${forcedNumbers} numbers wider than their line.`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1));
process.exit(failing ? 1 : 0);
