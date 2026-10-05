#!/usr/bin/env node
// Instagram content kit renderer: one source file per blog post, two days,
// one angle per day. A kit with `type: standalone` in its frontmatter is a
// single feed post that is not tied to a blog post (the Beliefs series): one
// "Day 1 (carousel)" deck of one or more slides, no reel, no brief. Each day has a reel (rendered by render-reels.mjs from
// the kit's plan JSON) and a carousel (rendered here, 4:5). This script also
// renders the story frames (9:16), the captions and a posting sheet.

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(import.meta.dirname, '..');
const SOURCE_DIR = join(ROOT, 'docs', 'instagram-kit');
const OUTPUT_DIR = join(ROOT, 'output', 'instagram-kit');

const W = 1080;
const H = 1350;
const SH = 1920;
const MAX_SLIDES = 8;
const MULTI_KEYS = new Set(['input', 'row', 'calc', 'case', 'bar', 'item', 'month', 'more', 'left_item', 'right_item', 'route', 'tier']);
const BANNED_TAGS = new Set([
  '#personalfinance', '#financialliteracy', '#moneytips', '#wealthbuilding',
  '#financialfreedom', '#desifinance', '#indiansineurope', '#indianfinance',
  '#moneyineurope', '#inflationawareness', '#costoflivingcomparison',
  '#americanexpat', '#personalfinanceus', '#fyp', '#foryou', '#foryoupage',
]);
const TONES = { ink: '#002171', teal: '#00897B', warn: '#C9791A', muted: '#9AA3B5' };
const MAKERS_MARK = 'Made by the person building nidhi, a planner that shows its assumptions. Free tools at nidhi.today.';

// ---------- parsing ----------

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (m) frontmatter[m[1]] = m[2];
  }
  return { frontmatter, body: content.slice(match[0].length) };
}

function parseBlock(lines) {
  const fields = {};
  const body = [];
  for (const line of lines) {
    const m = line.match(/^([a-z_0-9]+):\s*(.*)$/);
    if (m) {
      if (MULTI_KEYS.has(m[1])) (fields[m[1]] ||= []).push(m[2].trim());
      else fields[m[1]] = m[2].trim();
    } else if (line.trim()) {
      body.push(line.trim());
    }
  }
  return { fields, body };
}

// Sections: "## Brief", "## Stories", and per day "## Day N (angle|reel|carousel)".
export function parseKit(content, relPath) {
  const { frontmatter, body } = parseFrontmatter(content);
  const kit = { frontmatter, relPath, days: [], sections: {} };
  let deck = null;
  let block = null;
  const dayOf = n => (kit.days[n - 1] ||= { n, angle: {}, reel: null, deck: null });

  const closeBlock = () => {
    if (!block) return;
    const parsed = parseBlock(block.lines);
    if (block.kind === 'caption') deck.caption = block.lines.join('\n').trim();
    else if (block.kind === 'slide') deck.slides.push({ number: block.number, layout: block.layout, ...parsed });
    else if (block.kind === 'day') dayOf(block.day)[block.part] = parsed.fields;
    else if (block.kind === 'section') kit.sections[block.name] = parsed.fields;
    block = null;
  };

  for (const line of body.split('\n')) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      closeBlock();
      deck = null;
      const day = h2[1].match(/^Day (\d+)\s*\((\w+)\)/);
      if (day && day[2] === 'carousel') {
        deck = { day: Number(day[1]), slides: [], caption: '' };
        dayOf(deck.day).deck = deck;
      } else if (day) {
        block = { kind: 'day', day: Number(day[1]), part: day[2], lines: [] };
      } else {
        block = { kind: 'section', name: h2[1].trim().toLowerCase(), lines: [] };
      }
    } else if (h3 && deck) {
      closeBlock();
      const slide = h3[1].match(/^Slide (\d+)\s*\((\w+)\)/);
      if (slide) block = { kind: 'slide', number: Number(slide[1]), layout: slide[2], lines: [] };
      else if (/^Caption/i.test(h3[1])) block = { kind: 'caption', lines: [] };
    } else if (block) {
      block.lines.push(line);
    }
  }
  closeBlock();

  kit.days = kit.days.filter(Boolean);
  kit.slug = basename(relPath, '.md');
  kit.subDir = relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '';
  return kit;
}

// Story frames are written as d<day>_f<frame>_<field> in the Stories section.
function storyFrames(kit) {
  const frames = new Map();
  for (const [key, value] of Object.entries(kit.sections.stories || {})) {
    const m = key.match(/^d(\d)_f(\d)_(\w+)$/);
    if (!m) continue;
    const id = `day${m[1]}-frame${m[2]}`;
    if (!frames.has(id)) frames.set(id, { id, day: Number(m[1]), frame: Number(m[2]) });
    frames.get(id)[m[3]] = value;
  }
  return [...frames.values()].sort((a, b) => a.day - b.day || a.frame - b.frame);
}

const tagList = value => (value || '').split(/\s+/).filter(Boolean);
const deckTags = (kit, day) => kit.frontmatter[`hashtags_day${day.n}`] || '';
const deckKeywords = (kit, day) => (kit.frontmatter[`keywords_day${day.n}`] || '').split(',').map(s => s.trim()).filter(Boolean);

// ---------- lint ----------

const DASH = /[—–]|--|\s-\s|[A-Za-z]-[A-Za-z]/;

export function lintKit(kit) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const noDash = (where, text) => { if (DASH.test(text)) err(where, `dash or hyphen in "${text}"`); };
  if (kit.frontmatter.type === 'standalone') return lintStandalone(kit);

  for (const key of ['person', 'situation', 'withheld']) {
    if (!kit.sections.brief?.[key]) err('Brief', `missing "${key}"`);
  }
  for (const [key, value] of Object.entries(kit.sections.stories || {})) noDash(`Stories ${key}`, value);
  if (kit.days.length !== 2) err('Kit', `${kit.days.length} day(s) found, expected 2`);

  // Pieces in posting order; consecutive pieces must not share a hashtag except #nidhi.
  let previous = null;
  for (const day of kit.days) {
    const D = `Day ${day.n}`;
    for (const key of ['angle', 'number', 'takeaway', 'tool']) {
      if (!day.angle?.[key]) err(`${D} angle`, `missing "${key}"`);
    }

    if (!day.reel?.plan) err(`${D} reel`, 'missing "plan:" naming the reel plan JSON');
    else if (!existsSync(join(SOURCE_DIR, dirname(kit.relPath), day.reel.plan))) err(`${D} reel`, `plan file ${day.reel.plan} not found`);

    const pieces = [[`${D} reel`, tagList(day.reel?.hashtags)], [`${D} carousel`, tagList(deckTags(kit, day))]];
    for (const [where, tags] of pieces) {
      if (tags.length > 5) err(where, `${tags.length} hashtags, max 5`);
      if (!tags.includes('#nidhi')) err(where, 'hashtags must include #nidhi');
      for (const tag of tags) {
        if (BANNED_TAGS.has(tag.toLowerCase())) err(where, `banned hashtag ${tag}`);
        if (previous && tag !== '#nidhi' && previous.tags.includes(tag)) err(where, `hashtag ${tag} repeats from ${previous.where}`);
      }
      previous = { where, tags };
    }

    const keywords = deckKeywords(kit, day);
    if (keywords.length < 18 || keywords.length > 24) err(`${D} carousel`, `${keywords.length} keywords, expected 18 to 24`);

    const deck = day.deck;
    if (!deck) {
      err(D, 'no carousel found');
      continue;
    }
    const C = `${D} carousel`;
    if (!deck.caption) err(C, 'missing caption');
    noDash(`${C} caption`, deck.caption);
    if (deck.slides.length > MAX_SLIDES) err(C, `${deck.slides.length} slides, max ${MAX_SLIDES}`);
    if (deck.slides[0]?.layout !== 'hook') err(C, 'first slide must be a hook');
    if (deck.slides.at(-1)?.layout !== 'closer') err(C, 'last slide must be a closer');
    if (!deck.slides.some(s => s.layout === 'tool')) err(C, 'no "tool" slide: every angle needs a tool the reader keeps');

    for (const slide of deck.slides) {
      const at = `${C} slide ${slide.number}`;
      if (!LAYOUTS[slide.layout]) err(at, `unknown layout "${slide.layout}"`);
      for (const text of [...slide.body, ...Object.values(slide.fields).flat()]) noDash(at, text);
      if (!slide.fields.alt) err(at, 'missing "alt:" text (BRAND-RULES: every image gets alt text)');
      if (slide.layout === 'closer') {
        if (slide.fields.send || slide.fields.share || slide.fields.follow) err(at, 'closer takes one ask only: "save:"');
        if (day.n === 1 && !slide.fields.read) err(at, 'day 1 closer needs a "read:" line naming what the blog holds');
        if (day.n === 1 && slide.fields.more) err(at, 'day 1 closer keeps the single "read:" line; the "more:" list belongs on day 2');
        if (day.n === 2 && !slide.fields.more) err(at, 'day 2 closer needs 2 or 3 "more:" lines naming ideas from the post that neither day showed');
        if (slide.fields.more && (slide.fields.more.length < 2 || slide.fields.more.length > 3)) err(at, `${slide.fields.more.length} "more:" lines, expected 2 or 3`);
      }
    }
  }
  for (const frame of storyFrames(kit)) if (frame.kind && !frame.alt) err(`Stories ${frame.id}`, 'rendered frame needs "alt:" text');
  return errors;
}

function lintStandalone(kit) {
  const errors = [];
  const push = (where, msg) => { errors.push(`${where}: ${msg}`); };
  for (const [key, value] of Object.entries(kit.sections.stories || {})) if (DASH.test(value)) push(`Stories ${key}`, `dash or hyphen in "${value}"`);
  if (kit.days.length !== 1) push('Kit', `${kit.days.length} day(s) found, a standalone kit has exactly one`);
  const day = kit.days[0];
  if (!day?.deck) return [...errors, 'Day 1: no carousel found'];
  if (day.reel) push('Day 1', 'a standalone kit has no reel');
  const C = 'Post';
  const tags = tagList(deckTags(kit, day));
  if (tags.length > 5) push(C, `${tags.length} hashtags, max 5`);
  if (!tags.includes('#nidhi')) push(C, 'hashtags must include #nidhi');
  for (const tag of tags) if (BANNED_TAGS.has(tag.toLowerCase())) push(C, `banned hashtag ${tag}`);
  const keywords = deckKeywords(kit, day);
  if (keywords.length < 18 || keywords.length > 24) push(C, `${keywords.length} keywords, expected 18 to 24`);
  if (!day.deck.caption) push(C, 'missing caption');
  if (DASH.test(day.deck.caption)) push(`${C} caption`, 'dash or hyphen in caption');
  if (day.deck.slides.length > MAX_SLIDES) push(C, `${day.deck.slides.length} slides, max ${MAX_SLIDES}`);
  for (const slide of day.deck.slides) {
    const at = `${C} slide ${slide.number}`;
    if (!LAYOUTS[slide.layout]) push(at, `unknown layout "${slide.layout}"`);
    if (!slide.fields.alt) push(at, 'missing "alt:" text (BRAND-RULES: every image gets alt text)');
    for (const text of [...slide.body, ...Object.values(slide.fields).flat()]) if (DASH.test(text)) push(at, `dash or hyphen in "${text}"`);
  }
  for (const frame of storyFrames(kit)) if (frame.kind && !frame.alt) push(`Stories ${frame.id}`, 'rendered frame needs "alt:" text');
  return errors;
}

// ---------- helpers ----------

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rich(value = '') {
  // **word** is the teal emphasis; !!word!! is amber, for losses and costs.
  return esc(value).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/!!(.+?)!!/g, '<em class="loss">$1</em>').replace(/'/g, '’');
}

const cells = line => line.split('|').map(x => x.trim());

function euro(value) {
  if (value >= 1e6) return `€${(value / 1e6).toFixed(2)}M`;
  return `€${Math.round(value / 1000)}k`;
}

// Monthly contributions, annual effective real rate.
export function growthSeries({ start, monthly, years, rate }) {
  const mr = Math.pow(1 + rate, 1 / 12) - 1;
  const points = [start];
  let balance = start;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) balance = balance * (1 + mr) + monthly;
    points.push(balance);
  }
  return points;
}

function growthSvg(fields, { height = 640, bracket = false } = {}) {
  const start = Number(fields.start);
  const monthly = Number(fields.monthly);
  const years = Number(fields.years);
  const rates = String(fields.rates).split(',').map(s => Number(s.trim()) / 100);
  const series = rates.map(rate => growthSeries({ start, monthly, years, rate }));
  const tones = series.length === 1 ? [TONES.ink] : [TONES.warn, TONES.ink, TONES.teal];

  const cw = 912, ch = height;
  const left = 8, right = 262, top = 56, bottom = 56;
  const pw = cw - left - right, ph = ch - top - bottom;
  // Fixed ceiling from the same plan at 8% so every chart in a deck shares one scale.
  const ceiling = Math.ceil(growthSeries({ start, monthly, years, rate: 0.08 }).at(-1) / 1e6) * 1e6;
  const x = i => left + (i / years) * pw;
  const y = v => top + ph - (v / ceiling) * ph;
  const path = pts => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  let grid = '';
  for (let v = 1e6; v <= ceiling; v += 1e6) {
    grid += `<line x1="${left}" y1="${y(v)}" x2="${left + pw}" y2="${y(v)}" stroke="#DDD6C6" stroke-width="2" stroke-dasharray="3 10" />`;
    grid += `<text x="${left + 4}" y="${y(v) - 12}" class="tick">€${v / 1e6}M</text>`;
  }

  const low = series[0], high = series.at(-1);
  const band = series.length > 1
    ? `<path d="${path(high)} ${low.map((_, i) => `L${x(years - i).toFixed(1)} ${y(low[years - i]).toFixed(1)}`).join(' ')} Z" fill="rgba(0,137,123,0.09)" />`
    : '';

  const lines = series.map((pts, idx) => {
    const tone = tones[idx];
    const endY = y(pts.at(-1));
    return `
      <path d="${path(pts)}" fill="none" stroke="${tone}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${x(years)}" cy="${endY}" r="12" fill="${tone}" />
      <text x="${x(years) + 24}" y="${endY + 8}" class="end-value" fill="${tone}">${euro(pts.at(-1))}</text>
      <text x="${x(years) + 24}" y="${endY + 40}" class="end-rate">${Math.round(rates[idx] * 100)}% real</text>`;
  }).join('');

  let gap = '';
  if (bracket && series.length > 1) {
    const bx = cw - 8, y1 = y(high.at(-1)), y2 = y(low.at(-1)), mid = (y1 + y2) / 2;
    gap = `
      <path d="M${bx - 14} ${y1} H${bx} V${y2} H${bx - 14}" fill="none" stroke="${TONES.warn}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <text transform="translate(${bx - 20} ${mid}) rotate(-90)" text-anchor="middle" class="gap-label">${euro(high.at(-1) - low.at(-1))} RANGE</text>`;
  }

  return `
  <svg viewBox="0 0 ${cw} ${ch}" width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${band}
    <line x1="${left}" y1="${top + ph}" x2="${left + pw}" y2="${top + ph}" stroke="#002171" stroke-width="3" />
    ${lines}${gap}
    <text x="${left}" y="${ch - 12}" class="tick">Today</text>
    <text x="${x(years / 2)}" y="${ch - 12}" class="tick" text-anchor="middle">${years / 2} years</text>
    <text x="${x(years)}" y="${ch - 12}" class="tick" text-anchor="end">${years} years</text>
  </svg>`;
}

// bar: label | value | display | tone
function barsHtml(lines) {
  const bars = lines.map(line => {
    const [label, value, display, tone] = cells(line);
    return { label, value: Number(value), display, tone: TONES[tone] || TONES.ink, muted: tone === 'muted' };
  });
  const max = Math.max(...bars.map(b => b.value));
  return `<div class="bars">${bars.map(b => `
    <div class="bar-row">
      <div class="bar-label">${rich(b.label)}</div>
      <div class="bar-line">
        <div class="bar" style="width:${Math.max(3, (b.value / max) * 60)}%;background:${b.tone}"></div>
        <div class="bar-value" style="color:${b.muted ? '#4A5878' : b.tone}">${rich(b.display)}</div>
      </div>
    </div>`).join('')}</div>`;
}

// month: label | value | tone | tag     line: value | label     avg: value | label
// Warn bars that cross the reference line keep an ink base and use warn only
// for the excess. The label and the split carry the meaning as well as colour.
function monthsSvg(fields, { height = 560 } = {}) {
  const rows = (fields.month || []).map(line => {
    const [label, value, tone, tag] = cells(line);
    return { label, value: Number(value), tone, tag };
  });
  const [lineValue, lineLabel] = cells(fields.line || '');
  const [avgValue, avgLabel] = cells(fields.avg || '');
  const ref = Number(lineValue) || 0;
  const avg = Number(avgValue) || 0;
  const max = Number(fields.max) || Math.max(ref, ...rows.map(r => r.value)) * 1.12;
  const w = 912, labelW = 128, pad = 40, top = 44, bottom = height - 54;
  const plotW = w - labelW - pad;
  const slot = plotW / rows.length, barW = slot * 0.64;
  const y = v => bottom - (v / max) * (bottom - top);
  const bars = rows.map((r, i) => {
    const x = i * slot + (slot - barW) / 2;
    const colour = TONES[r.tone] || TONES.ink;
    let shapes;
    if (r.tone === 'warn' && ref && r.value > ref) {
      shapes = `<rect x="${x}" y="${y(ref)}" width="${barW}" height="${bottom - y(ref)}" rx="6" fill="${TONES.ink}" />
        <rect x="${x}" y="${y(r.value)}" width="${barW}" height="${y(ref) - y(r.value) + 6}" rx="6" fill="${TONES.warn}" />`;
    } else {
      shapes = `<rect x="${x}" y="${y(r.value)}" width="${barW}" height="${bottom - y(r.value)}" rx="6" fill="${colour}" />`;
    }
    const tag = r.tag ? `<text class="month-tag" x="${x + barW / 2}" y="${Math.max(34, y(r.value) - 14)}" text-anchor="middle" fill="${TONES.warn}">${esc(r.tag)}</text>` : '';
    return `${shapes}${tag}<text class="tick" x="${x + barW / 2}" y="${height - 14}" text-anchor="middle">${esc(r.label)}</text>`;
  }).join('');
  const refLine = ref ? `<line x1="0" x2="${plotW}" y1="${y(ref)}" y2="${y(ref)}" stroke="${TONES.teal}" stroke-width="5" />
    <text class="line-label" x="${plotW + 14}" y="${y(ref) - 12}" fill="${TONES.teal}">${rich(lineLabel)}</text>` : '';
  const avgLine = avg ? `<line x1="0" x2="${plotW}" y1="${y(avg)}" y2="${y(avg)}" stroke="${TONES.teal}" stroke-width="4" stroke-dasharray="4 8" />
    <text class="line-label" x="${plotW + 14}" y="${y(avg) + 9}" fill="${TONES.teal}">${rich(avgLabel)}</text>` : '';
  return `<svg width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">
    <g transform="translate(${pad},0)"><line x1="0" x2="${plotW}" y1="${bottom}" y2="${bottom}" stroke="#D9D2C3" stroke-width="2" />
    ${bars}${refLine}${avgLine}</g></svg>`;
}

// start: cash   cost: monthly cost   slots: months shown   result: label under the chart
function runwaySvg(fields, { height = 560 } = {}) {
  const start = Number(fields.start), cost = Number(fields.cost), slots = Number(fields.slots) || 12;
  const w = 912, pad = 40, top = 60, bottom = height - 54;
  const slot = (w - pad) / slots, barW = slot * 0.66;
  const y = v => bottom - (v / start) * (bottom - top);
  const cols = Array.from({ length: slots }, (_, i) => {
    const left = start - cost * i;
    const x = i * slot + (slot - barW) / 2;
    const body = left > 0
      ? `<rect x="${x}" y="${y(left)}" width="${barW}" height="${bottom - y(left)}" rx="6" fill="${i === 0 ? TONES.teal : TONES.ink}" opacity="${1 - i * 0.12}" />`
      : `<rect x="${x + 2}" y="${top + 2}" width="${barW - 4}" height="${bottom - top - 4}" rx="6" fill="none" stroke="#D9D2C3" stroke-width="3" stroke-dasharray="8 8" />`;
    const value = i === 0 ? `<text class="month-tag" x="${x + barW / 2}" y="${y(left) - 14}" text-anchor="middle" fill="${TONES.teal}">€${start.toLocaleString("en")}</text>` : '';
    return `${body}${value}<text class="tick" x="${x + barW / 2}" y="${height - 14}" text-anchor="middle">${i + 1}</text>`;
  }).join('');
  return `<svg width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">
    <g transform="translate(${pad},0)"><line x1="0" x2="${w - pad}" y1="${bottom}" y2="${bottom}" stroke="#D9D2C3" stroke-width="2" />${cols}</g></svg>
    ${fields.result ? `<div class="runway-result">${rich(fields.result)}</div>` : ''}`;
}

// ---------- layouts ----------

const title = f => (f.title ? `<h2>${rich(f.title)}</h2>` : '');
const note = f => (f.note ? `<p class="note">${rich(f.note)}</p>` : '');
const bodyText = s => s.body.map(p => `<p class="body">${rich(p)}</p>`).join('');
const stripHasDisclosure = f => /invested instead|%\s*real|real\s*growth/i.test(`${f.strip || ''} ${f.assumption || ''}`);
const stripCarriesIllustrative = f => /\billustrative\b/i.test(`${f.strip || ''} ${f.assumption || ''}`);
const stripShowsIllustrative = f => stripHasDisclosure(f) || stripCarriesIllustrative(f);
const slideCarriesProminentNumber = s => /(?:€|£|\$|\b\d[\d,.]*\b)/.test([
  ...(s.body || []),
  s.fields.bar,
  s.fields.month,
  s.fields.cost,
  s.fields.left,
  s.fields.right,
  ...(s.fields.left_item || []),
  ...(s.fields.right_item || []),
].filter(Boolean).join(' '));
const strip = f => {
  if (!f.strip && !f.assumption) return '';
  return `<div class="strip">${stripHasDisclosure(f) ? '<span class="strip-disclosure">ILLUSTRATIVE</span>' : ''}${rich(f.strip || '')}${f.assumption ? `<span class="assumption">${rich(f.assumption)}</span>` : ''}</div>`;
};

// row: label | factor | tone | what it multiplies (defaults to "monthly amount")
function toolHtml(slide) {
  const f = slide.fields;
  const rowCount = (f.row || []).length;
  const rows = (f.row || []).map(r => {
    const [label, factor, tone, what] = cells(r);
    return `<div class="tool-row"><i style="background:${TONES[tone] || TONES.ink}"></i>
      <div class="tool-side"><div class="tool-label">${rich(label)}</div><div class="tool-what">${rich(what || 'monthly amount')}</div></div>
      <div class="tool-factor" style="color:${TONES[tone] || TONES.ink}">${rich(factor)}</div></div>`;
  }).join('');
  return `
    <div class="tool-band n${rowCount}"><div class="tool-name">${rich(f.band)}</div><div class="tool-lead">${rich(f.lead)}</div></div>
    <div class="tool-body n${rowCount}">
      <div class="tool-rows n${rowCount}">${rows}</div>
      ${f.also ? `<div class="tool-also">${rich(f.also)}</div>` : ''}
      ${note(f)}
    </div>`;
}

function columnsHtml(s) {
  const [leftTitle, leftRule] = cells(s.fields.left || '');
  const [rightTitle, rightRule] = cells(s.fields.right || '');
  const column = (side, titleText, ruleText, items) => `<div class="sort-column ${side}">
    <div class="sort-column-head">
      <div class="sort-column-title">${rich(titleText)}</div>
      <div class="sort-column-rule">${rich(ruleText)}</div>
    </div>
    <div class="sort-column-items">${(items || []).map(item => `<div class="sort-column-item"><i></i><span>${rich(item)}</span></div>`).join('')}</div>
  </div>`;
  const showIllustrative = slideCarriesProminentNumber(s);
  return `<div class="columns-hook ${showIllustrative ? 'has-disclosure' : 'no-disclosure'}">
    ${showIllustrative ? '<div class="columns-disclosure">ILLUSTRATIVE</div>' : ''}
    <div class="sort-columns">
      ${column('left', leftTitle, leftRule, s.fields.left_item)}
      ${column('right', rightTitle, rightRule, s.fields.right_item)}
    </div>
    <h1 data-fit>${rich(s.body.join(' '))}</h1>
  </div>
  <div class="swipe">SWIPE <span>→</span></div>`;
}

// asset: label | display     route: label | rule | tone
function routesHtml(s) {
  const [assetLabel, assetDisplay] = cells(s.fields.asset || '');
  const routes = (s.fields.route || []).slice(0, 2).map((line, index) => {
    // route: label | rule | tone [| box text]; the box text defaults to inc-1's beneficiary wording.
    const [label, rule, tone, box] = cells(line);
    const colour = TONES[tone] || (index === 0 ? TONES.teal : TONES.warn);
    const field = index === 0
      ? `<div class="route-field filled"><i>✓</i><span>${rich(box || 'Covered by the default')}</span></div>`
      : `<div class="route-field empty"><i></i><span>${rich(box || 'Beneficiary not named')}</span></div>`;
    return `<div class="route-card" style="--route-colour:${colour}">
      <div class="route-card-head">${rich(label)}</div>
      <div class="route-card-body"><div class="route-rule">${rich(rule)}</div>${field}</div>
    </div>`;
  }).join('');
  return `<div class="routes-hook">
    <div class="hook-disclosure">ILLUSTRATIVE</div>
    <div class="route-asset"><span>${rich(assetLabel)}</span><strong>${rich(assetDisplay)}</strong></div>
    <div class="route-fork"><i></i><i></i><i></i></div>
    <div class="route-cards">${routes}</div>
    <h1 data-fit>${rich(s.body.join(' '))}</h1>
  </div><div class="swipe">SWIPE <span>→</span></div>`;
}

// tier: label | cost | tone [| detail]
// With a detail on every tier the three cards are peers of equal weight (46 cash buckets);
// without it the first tier is the hero and item: lines list its contents (inc-1).
function equalBandsHtml(s) {
  const bands = (s.fields.tier || []).slice(0, 3).map((line, index) => {
    const [label, cost, tone, detail] = cells(line);
    const colour = TONES[tone] || [TONES.ink, TONES.teal, TONES.warn][index] || TONES.ink;
    return `<div class="band-hook-card equal" style="--band-colour:${colour}">
      <div class="band-hook-head"><div class="band-hook-label">${rich(label)}</div><div class="band-hook-cost">${rich(cost)}</div></div>
      <div class="band-hook-detail"><i></i><span>${rich(detail)}</span></div>
    </div>`;
  }).join('');
  return `<div class="bands-hook">
    <div class="band-hook-grid equal">${bands}</div>
    <h1 data-fit>${rich(s.body.join(' '))}</h1>
  </div><div class="swipe">SWIPE <span>→</span></div>`;
}

function bandsHtml(s) {
  const tiers = (s.fields.tier || []).slice(0, 3);
  if (tiers.length && tiers.every(line => (cells(line)[3] || '').trim())) return equalBandsHtml(s);
  const primaryItems = (s.fields.item || []).slice(0, 3);
  const bands = (s.fields.tier || []).slice(0, 3).map((line, index) => {
    const [label, cost, tone] = cells(line);
    const colour = TONES[tone] || [TONES.teal, TONES.ink, TONES.warn][index] || TONES.ink;
    return `<div class="band-hook-card ${index === 0 ? 'primary' : ''}" style="--band-colour:${colour}">
      <div class="band-hook-label">${rich(label)}</div><div class="band-hook-cost">${rich(cost)}</div>
      ${index === 0 && primaryItems.length ? `<div class="band-hook-items">${primaryItems.map(item => `<div><i></i><span>${rich(item)}</span></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="bands-hook">
    <div class="band-hook-grid">${bands}</div>
    <h1 data-fit>${rich(s.body.join(' '))}</h1>
  </div><div class="swipe">SWIPE <span>→</span></div>`;
}

const LAYOUTS = {
  sheet: s => {
    const rows = (s.fields.row || []).map((line, index) => {
      const [label, value, currency, rowNote] = cells(line);
      const selected = /exchange rate/i.test(label);
      return `<div class="sheet-row">
        <div class="sheet-row-number">${index + 1}</div>
        <div class="sheet-cell sheet-label">${rich(label)}</div>
        <div class="sheet-cell sheet-value ${selected ? 'selected' : ''}">${rich(value)}</div>
        <div class="sheet-cell sheet-currency">${rich(currency)}</div>
        <div class="sheet-cell sheet-note">${rich(rowNote)}</div>
      </div>`;
    }).join('');
    const [totalLabel, totalValue] = cells(s.fields.total || '');
    const totalRow = (s.fields.row || []).length + 1;
    const statusParts = String(s.fields.status || '').split('·').map(part => part.trim());
    return `
      <div class="finance-sheet">
        <div class="sheet-file"><span class="sheet-file-icon"><i></i><i></i><i></i><i></i></span>${rich(s.fields.file)}</div>
        <div class="sheet-columns"><span></span><span>A</span><span>B</span><span>C</span><span>D</span></div>
        <div class="sheet-rows">${rows}
          <div class="sheet-row sheet-total-row">
            <div class="sheet-row-number">${totalRow}</div>
            <div class="sheet-cell sheet-label">${rich(totalLabel)}</div>
            <div class="sheet-cell sheet-value sheet-error">${rich(totalValue)}</div>
            <div class="sheet-cell sheet-currency"></div>
            <div class="sheet-cell sheet-note"></div>
          </div>
        </div>
        <div class="sheet-comment">${rich(s.fields.comment)}</div>
      </div>
      <div class="sheet-copy">
        <h1>${rich(s.fields.title)}</h1>
        <p class="sheet-line">${rich(s.fields.line)}</p>
        <div class="sheet-status"><i></i><strong>${rich(statusParts[0] || '')}</strong>${statusParts[1] ? `<span>·</span>${rich(statusParts[1])}` : ''}</div>
      </div>`;
  },

  hook: s => s.fields.route ? routesHtml(s) : s.fields.tier ? bandsHtml(s) : s.fields.left && s.fields.right ? columnsHtml(s) : `
      ${slideCarriesProminentNumber(s) && !stripShowsIllustrative(s.fields) ? '<div class="hook-disclosure">ILLUSTRATIVE</div>' : ''}
      ${s.fields.bar
        ? `${strip(s.fields)}${barsHtml(s.fields.bar)}`
        : s.fields.month
          ? `<div class="chart">${monthsSvg(s.fields, { height: 600 })}</div>`
          : s.fields.cost
            ? `<div class="chart">${runwaySvg(s.fields, { height: 560 })}</div>`
            : `<div class="chart">${growthSvg(s.fields, { height: 600, bracket: true })}</div>`}
      <h1 data-fit>${rich(s.body.join(' '))}</h1>
      ${s.fields.premise ? `<p class="premise">${rich(s.fields.premise)}</p>` : ''}
      <div class="swipe">SWIPE <span>→</span></div>`,

  columns: s => columnsHtml(s),

  routes: s => routesHtml(s),

  bands: s => bandsHtml(s),

  inputs: s => `
    <div class="who"><span>${rich(s.fields.who)}</span>${rich(s.fields.where)}</div>
    <div class="inputs">
      ${(s.fields.input || []).map(line => {
        const [value, label] = cells(line);
        return `<div class="input"><div class="input-value">${rich(value)}</div><div class="input-label">${rich(label)}</div></div>`;
      }).join('')}
    </div>
    <p class="question">${rich(s.fields.question)}</p>`,

  growth: s => `
    ${title(s.fields)}
    ${strip(s.fields)}
    <div class="chart">${growthSvg(s.fields, { height: (s.fields.title || '').length > 28 ? 620 : 680, bracket: Boolean(s.fields.bracket) })}</div>
    ${note(s.fields)}
    ${bodyText(s)}`,

  bars: s => `
    ${title(s.fields)}
    ${strip(s.fields)}
    ${barsHtml(s.fields.bar || [])}
    ${note(s.fields)}
    ${bodyText(s)}`,

  // once: amount | label    many: amount | label | count | total paid
  repeat: s => {
    const [onceAmount, onceLabel] = cells(s.fields.once || '');
    const [manyAmount, manyLabel, count, paid] = cells(s.fields.many || '');
    const n = Number(count) || 0;
    const cols = 30;
    const marks = Array.from({ length: n }, () => '<i></i>').join('');
    return `
      ${title(s.fields)}
      <div class="repeat">
        <div class="repeat-side">
          <div class="repeat-amount">${rich(onceAmount)}</div>
          <div class="repeat-label">${rich(onceLabel)}</div>
          <div class="repeat-once"><i></i></div>
        </div>
        <div class="repeat-side">
          <div class="repeat-amount" style="color:${TONES.warn}">${rich(manyAmount)}</div>
          <div class="repeat-label">${rich(manyLabel)}</div>
          <div class="repeat-grid" style="grid-template-columns:repeat(${cols},1fr)">${marks}</div>
          <div class="repeat-paid">${rich(paid)}</div>
        </div>
      </div>
      ${note(s.fields)}
      ${bodyText(s)}`;
  },

  months: s => `
    ${title(s.fields)}
    ${strip(s.fields)}
    <div class="chart">${monthsSvg(s.fields, { height: 600 })}</div>
    ${note(s.fields)}
    ${bodyText(s)}`,

  runway: s => `
    ${title(s.fields)}
    ${strip(s.fields)}
    <div class="chart">${runwaySvg(s.fields, { height: 580 })}</div>
    ${note(s.fields)}
    ${bodyText(s)}`,

  tool: s => toolHtml(s),

  // calc: label | first line | second line | total | tone
  worked: s => `
    ${title(s.fields)}
    ${strip(s.fields)}
    <div class="calcs">
      ${(s.fields.calc || []).map(line => {
        const [label, first, second, total, tone] = cells(line);
        const colour = TONES[tone] || TONES.ink;
        return `<div class="calc"><i style="background:${colour}"></i>
          <div class="calc-work"><div class="calc-label">${rich(label)}</div><div class="calc-line">${rich(first)}</div><div class="calc-line">${rich(second)}</div></div>
          <div class="calc-total" style="color:${colour}">${rich(total)}</div></div>`;
      }).join('')}
    </div>
    ${note(s.fields)}`,

  scenarios: s => `
    ${title(s.fields)}
    <div class="cases">
      ${(s.fields.case || []).map((line, idx) => {
        const [head, detail] = cells(line);
        const chips = detail.includes('·')
          ? detail.split('·').map(c => `<span class="chip">${rich(c.trim())}</span>`).join('')
          : `<span class="case-detail">${rich(detail)}</span>`;
        return `<div class="case"><div class="node">${idx + 1}</div><div><div class="case-head">${rich(head)}</div><div class="case-chips">${chips}</div></div></div>`;
      }).join('')}
    </div>
    ${s.fields.rule ? `<div class="rule"><span>RULE</span>${rich(s.fields.rule)}</div>` : ''}`,

  closer: (s, deck) => {
    const tool = deck.slides.find(x => x.layout === 'tool');
    return `
      <p class="kicker" data-fit>${rich(s.fields.kicker)}</p>
      ${s.fields.line ? `<p class="kicker-line">${rich(s.fields.line)}</p>` : ''}
      <div class="keep${s.fields.more ? ' has-more' : ''}">
        <div class="mini"><div class="mini-inner layout-tool">${toolHtml(tool)}</div></div>
        <div class="keep-side">
          <div class="bookmark">${rich(s.fields.save).toUpperCase()}</div>
          ${s.fields.more
            ? `<div class="read-label">ALSO IN THE FULL POST</div><ul class="more">${s.fields.more.map(m => `<li>${rich(m)}</li>`).join('')}</ul>`
            : `<div class="read-label">ON THE BLOG</div>
          <div class="read-text">${rich(s.fields.read)}</div>`}
          <div class="read-url">nidhi.today · link in bio</div>
        </div>
      </div>
      <p class="mark">${rich(MAKERS_MARK)}</p>`;
  },
};

const CSS = `
  :root { --paper:#FAF7F2; --ink:#002171; --soft:#4A5878; --faint:#5F6B82; --accent:#00897B; --accent-soft:rgba(0,137,123,.10); --rule:#E5DECF; --warn:#C9791A; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { overflow:hidden; font-family:'Roboto',sans-serif; color:var(--ink); background:var(--paper);
    background-image: radial-gradient(at 18% 8%, rgba(0,137,123,.05) 0%, transparent 40%), radial-gradient(at 82% 92%, rgba(0,33,113,.05) 0%, transparent 44%);
    -webkit-font-smoothing:antialiased; }
  em { font-style:normal; color:var(--accent); }
  em.loss { color:#C9791A; }
  .slide { width:${W}px; height:${H}px; padding:150px 84px 140px; position:relative; display:flex; flex-direction:column; }
  .eyebrow { position:absolute; top:72px; left:84px; font:700 22px 'Inter',sans-serif; letter-spacing:5px; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:18px; }
  .eyebrow::before { content:''; width:44px; height:3px; background:var(--accent); }
  .dots { position:absolute; bottom:70px; left:84px; display:flex; gap:12px; align-items:center; }
  .dots i { width:12px; height:12px; border-radius:6px; background:#DDD6C6; }
  .dots i.on { width:40px; background:var(--accent); }
  .handle { position:absolute; bottom:60px; right:84px; font:600 26px 'Inter',sans-serif; color:var(--faint); }
  .strong-handle .handle { color:var(--ink); }
  .content { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; gap:30px; }

  h1 { font:800 92px/1.04 'Inter',sans-serif; letter-spacing:-3.2px; }
  h2 { font:800 60px/1.08 'Inter',sans-serif; letter-spacing:-1.8px; }
  .body { font:400 38px/1.32 'Roboto',sans-serif; color:var(--soft); }
  .note { font:400 26px/1.4 'Roboto',sans-serif; color:var(--faint); }
  .premise { font:500 40px/1.2 'Roboto',sans-serif; color:var(--soft); margin-top:-8px; }
  .swipe { position:absolute; bottom:60px; left:50%; transform:translateX(-50%); font:700 22px 'Inter',sans-serif; letter-spacing:4px; color:var(--accent); }
  .swipe span { font-size:28px; margin-left:8px; }
  .layout-hook { padding-top:70px; }
  .layout-hook .content { justify-content:flex-start; gap:26px; }
  .layout-hook .bars { margin:60px 0 40px; }
  .hook-disclosure { position:absolute; top:30px; left:84px; font:800 22px 'Inter',sans-serif; letter-spacing:4px; color:var(--accent); }

  .layout-columns { padding-top:70px; }
  .layout-columns .content { justify-content:flex-start; gap:0; }
  .layout-routes, .layout-bands { padding-top:70px; }
  .layout-routes .content, .layout-bands .content { justify-content:flex-start; gap:0; }
  .columns-hook { position:relative; width:100%; }
  .columns-disclosure { position:absolute; top:30px; left:84px; font:800 22px 'Inter',sans-serif; letter-spacing:4px; color:var(--accent); }
  .sort-columns { margin-top:42px; display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .columns-hook.has-disclosure .sort-columns { margin-top:72px; }
  .sort-column { min-width:0; height:760px; overflow:hidden; border:3px solid var(--accent); border-radius:24px; background:rgba(255,255,255,.68); box-shadow:10px 12px 0 rgba(0,33,113,.06); }
  .sort-column.right { border-color:var(--warn); }
  .sort-column-head { min-height:178px; padding:28px 29px 24px; background:var(--accent); color:#fff; }
  .sort-column.right .sort-column-head { background:var(--warn); }
  .sort-column-title { font:800 38px/1.06 'Inter',sans-serif; letter-spacing:-.8px; }
  .sort-column-rule { display:inline-block; margin-top:15px; padding:9px 15px; border-radius:999px; background:var(--paper); color:var(--accent); font:800 25px 'Inter',sans-serif; letter-spacing:1.8px; text-transform:uppercase; }
  .sort-column.right .sort-column-rule { color:var(--warn); }
  .sort-column-items { padding:12px 25px 0; }
  .sort-column-item { min-height:135px; display:flex; align-items:center; gap:16px; border-bottom:2px solid var(--rule); font:720 33px/1.1 'Inter',sans-serif; }
  .sort-column-item i { width:14px; height:14px; flex:none; border-radius:50%; background:var(--accent); }
  .sort-column.right .sort-column-item i { background:var(--warn); }
  .columns-hook h1 { margin-top:40px; max-width:920px; font-size:76px; line-height:1.02; }

  .routes-hook { position:relative; width:100%; padding-top:66px; }
  .routes-hook .hook-disclosure { top:16px; left:0; }
  .route-asset { width:700px; height:158px; margin:0 auto; padding:28px 34px; display:flex; align-items:center; justify-content:space-between; gap:24px; border:3px solid var(--ink); border-radius:22px; background:#fff; box-shadow:10px 12px 0 rgba(0,33,113,.07); }
  .route-asset span { font:750 31px/1.1 'Inter',sans-serif; }
  .route-asset strong { font:850 60px/1 'Inter',sans-serif; letter-spacing:-2px; white-space:nowrap; }
  .route-fork { position:relative; width:100%; height:128px; }
  .route-fork::before { content:''; position:absolute; left:50%; top:0; width:4px; height:48px; transform:translateX(-50%); background:var(--ink); }
  .route-fork::after { content:''; position:absolute; left:25%; right:25%; top:46px; height:4px; background:linear-gradient(to right,var(--accent) 0 48%,transparent 48% 52%,var(--warn) 52% 100%); }
  .route-fork i { position:absolute; top:46px; width:4px; height:66px; background:var(--accent); }
  .route-fork i:nth-child(1) { left:25%; }
  .route-fork i:nth-child(2) { left:50%; top:35px; width:18px; height:18px; border-radius:50%; transform:translateX(-50%); background:var(--ink); }
  .route-fork i:nth-child(3) { left:75%; background:repeating-linear-gradient(to bottom,var(--warn) 0 12px,transparent 12px 22px); }
  .route-cards { display:grid; grid-template-columns:1fr 1fr; gap:26px; }
  .route-card { height:430px; overflow:hidden; border:3px solid var(--route-colour); border-radius:23px; background:rgba(255,255,255,.72); box-shadow:9px 11px 0 rgba(0,33,113,.06); }
  .route-card:nth-child(2) { border-style:dashed; }
  .route-card-head { min-height:108px; padding:27px 28px; display:flex; align-items:center; background:var(--route-colour); color:#fff; font:820 34px/1.08 'Inter',sans-serif; }
  .route-card-body { padding:29px 27px; }
  .route-rule { font:830 39px/1.08 'Inter',sans-serif; letter-spacing:-1px; color:var(--route-colour); }
  .route-field { min-height:108px; margin-top:34px; padding:15px 17px; display:flex; align-items:center; gap:13px; border:3px solid var(--route-colour); border-radius:14px; font:690 26px/1.12 'Inter',sans-serif; color:var(--soft); }
  .route-field.empty { border-style:dashed; }
  .route-field i { width:27px; height:27px; flex:none; display:flex; align-items:center; justify-content:center; border:3px solid var(--route-colour); border-radius:5px; color:var(--route-colour); font:900 20px/1 'Inter',sans-serif; }
  .routes-hook h1 { max-width:940px; margin-top:38px; font-size:76px; line-height:1.02; }

  .bands-hook { position:relative; width:100%; padding-top:28px; }
  .band-hook-grid { display:grid; grid-template-columns:1fr 1fr; gap:22px; }
  .band-hook-card { min-height:220px; padding:28px 30px; border:3px solid var(--band-colour); border-radius:23px; background:rgba(255,255,255,.72); box-shadow:9px 11px 0 rgba(0,33,113,.06); }
  .band-hook-card.primary { grid-column:1 / -1; min-height:440px; padding:34px 42px 26px; border-width:5px; background:rgba(0,137,123,.055); }
  .band-hook-label { font:850 45px/1 'Inter',sans-serif; letter-spacing:-1.4px; color:var(--band-colour); }
  .band-hook-cost { display:inline-block; margin-top:18px; padding:9px 16px; border-radius:999px; background:var(--band-colour); color:#fff; font:790 25px/1 'Inter',sans-serif; }
  .band-hook-card.primary .band-hook-label { font-size:70px; }
  .band-hook-card.primary .band-hook-cost { margin-top:22px; font-size:31px; padding:12px 20px; }
  .band-hook-items { margin-top:24px; }
  .band-hook-items > div { min-height:72px; display:grid; grid-template-columns:15px 1fr; gap:18px; align-items:center; border-top:2px solid var(--rule); font:730 28px/1.15 'Inter',sans-serif; color:var(--ink); }
  .band-hook-items i { width:12px; height:12px; border-radius:50%; background:var(--band-colour); }
  .band-hook-grid.equal { grid-template-columns:1fr; gap:26px; }
  .band-hook-card.equal { min-height:0; padding:30px 38px 32px; border-width:4px; }
  .band-hook-head { display:flex; align-items:center; justify-content:space-between; gap:24px; }
  .band-hook-card.equal .band-hook-label { font-size:58px; }
  .band-hook-card.equal .band-hook-cost { margin-top:0; font-size:29px; padding:11px 19px; white-space:nowrap; }
  .band-hook-detail { margin-top:22px; padding-top:20px; border-top:2px solid var(--rule); display:grid; grid-template-columns:15px 1fr; gap:18px; align-items:center; font:730 34px/1.15 'Inter',sans-serif; color:var(--ink); }
  .band-hook-detail i { width:13px; height:13px; border-radius:50%; background:var(--band-colour); }
  .bands-hook h1 { max-width:920px; margin-top:32px; font-size:74px; line-height:1.02; }

  .layout-sheet { padding:150px 72px 112px; }
  .layout-sheet .content { justify-content:flex-start; gap:0; }
  .layout-sheet .handle { bottom:54px; right:72px; font-size:22px; }
  .finance-sheet { position:relative; width:936px; height:652px; flex:none; overflow:hidden; border:2px solid var(--rule); border-radius:22px; background:#fff; box-shadow:14px 16px 0 rgba(0,33,113,.08); }
  .sheet-file { height:66px; padding:0 24px; display:flex; align-items:center; gap:16px; border-bottom:2px solid var(--rule); background:#F3F0E9; font:700 25px 'Inter',sans-serif; color:var(--ink); }
  .sheet-file-icon { width:30px; height:30px; flex:none; display:grid; grid-template-columns:1fr 1fr; gap:3px; padding:3px; border:3px solid var(--accent); border-radius:5px; }
  .sheet-file-icon i { display:block; background:var(--accent); opacity:.88; }
  .sheet-columns, .sheet-row { display:grid; grid-template-columns:48px 286px 188px 116px 298px; }
  .sheet-columns { height:42px; border-bottom:2px solid var(--rule); background:#F7F5F0; }
  .sheet-columns span { display:flex; align-items:center; justify-content:center; border-right:2px solid var(--rule); font:700 18px 'Inter',sans-serif; color:var(--faint); }
  .sheet-columns span:last-child { border-right:0; }
  .sheet-row { height:76px; }
  .sheet-row-number { display:flex; align-items:center; justify-content:center; border-right:2px solid var(--rule); border-bottom:2px solid var(--rule); background:#F7F5F0; font:600 18px 'Inter',sans-serif; color:var(--faint); }
  .sheet-cell { position:relative; min-width:0; padding:0 16px; display:flex; align-items:center; border-right:2px solid var(--rule); border-bottom:2px solid var(--rule); font:500 22px 'Roboto',sans-serif; color:var(--soft); white-space:nowrap; overflow:hidden; }
  .sheet-cell:last-child { border-right:0; }
  .sheet-label { font:650 23px 'Inter',sans-serif; color:var(--ink); }
  .sheet-value { justify-content:flex-end; font:700 25px 'Inter',sans-serif; font-variant-numeric:tabular-nums; color:var(--ink); }
  .sheet-currency { justify-content:center; font:800 20px 'Inter',sans-serif; letter-spacing:2px; color:var(--accent); }
  .sheet-note { font-size:19px; color:var(--faint); }
  .sheet-cell.selected { z-index:2; overflow:visible; box-shadow:inset 0 0 0 4px var(--accent); background:rgba(0,137,123,.06); }
  .sheet-cell.selected::after { content:''; position:absolute; right:-5px; bottom:-5px; width:10px; height:10px; background:var(--accent); border:2px solid #fff; }
  .sheet-total-row .sheet-row-number, .sheet-total-row .sheet-cell { background:#FBF5E8; font-weight:800; }
  .sheet-error { justify-content:flex-start; color:var(--warn); background:rgba(201,121,26,.14) !important; font-size:27px; overflow:visible; }
  .sheet-error::after { content:''; position:absolute; top:0; right:0; width:0; height:0; border-top:18px solid var(--warn); border-left:18px solid transparent; }
  .sheet-comment { position:absolute; right:24px; bottom:18px; width:344px; min-height:90px; padding:20px 22px; display:flex; align-items:center; border:2px solid var(--warn); border-radius:12px; background:#FFF8E8; box-shadow:8px 9px 0 rgba(201,121,26,.12); font:600 21px/1.25 'Inter',sans-serif; color:var(--ink); }
  .sheet-comment::before { content:''; position:absolute; left:-18px; top:30px; width:0; height:0; border-top:13px solid transparent; border-bottom:13px solid transparent; border-right:18px solid var(--warn); }
  .sheet-comment::after { content:''; position:absolute; left:-14px; top:33px; width:0; height:0; border-top:10px solid transparent; border-bottom:10px solid transparent; border-right:15px solid #FFF8E8; }
  .sheet-copy { padding:54px 8px 0; }
  .sheet-copy h1 { max-width:900px; font:800 62px/1.03 'Inter',sans-serif; letter-spacing:-2.5px; }
  .sheet-line { max-width:900px; margin-top:22px; font:450 30px/1.28 'Roboto',sans-serif; color:var(--soft); }
  .sheet-status { margin-top:34px; display:flex; align-items:center; gap:12px; font:600 24px 'Inter',sans-serif; color:var(--soft); }
  .sheet-status i { width:12px; height:12px; flex:none; border-radius:50%; background:var(--warn); }
  .sheet-status strong { color:var(--warn); font-weight:800; }
  .sheet-status span { color:var(--faint); }

  .strip { font:600 30px 'Inter',sans-serif; color:var(--soft); display:flex; align-items:center; gap:18px; flex-wrap:wrap; margin-top:-8px; }
  .strip-disclosure { font:800 22px 'Inter',sans-serif; letter-spacing:3px; color:var(--accent); }
  .assumption { border:3px solid var(--warn); color:var(--warn); border-radius:12px; padding:6px 16px; font-weight:800; }
  .chart svg { display:block; }
  .chart + .note { margin-top:-18px; }
  .month-tag { font:800 28px 'Inter',sans-serif; }
  .line-label { font:800 26px 'Inter',sans-serif; fill:#002171; }
  .runway-result { font:800 44px 'Inter',sans-serif; letter-spacing:-1px; color:var(--ink); margin-top:14px; }
  .tick { font:600 24px 'Inter',sans-serif; fill:#5F6B82; }
  .end-value { font:800 42px 'Inter',sans-serif; letter-spacing:-1.2px; }
  .end-rate { font:500 25px 'Roboto',sans-serif; fill:#4A5878; }
  .gap-label { font:800 22px 'Inter',sans-serif; letter-spacing:3px; fill:#C9791A; }

  .bars { display:flex; flex-direction:column; gap:52px; margin:16px 0; }
  .bar-label { font:600 36px 'Inter',sans-serif; margin-bottom:16px; }
  .bar-line { display:flex; align-items:center; gap:26px; }
  .bar { height:104px; border-radius:16px; }
  .bar-value { font:800 68px 'Inter',sans-serif; letter-spacing:-2.4px; white-space:nowrap; }

  .repeat { display:flex; flex-direction:column; gap:30px; margin:4px 0; }
  .repeat-amount { font:800 72px/1 'Inter',sans-serif; letter-spacing:-2.6px; }
  .repeat-label { font:500 30px 'Roboto',sans-serif; color:var(--soft); margin:6px 0 14px; }
  .repeat-once i { display:block; width:96px; height:96px; border-radius:14px; background:var(--muted, #9AA3B5); }
  .repeat-grid { display:grid; gap:6px; }
  .repeat-grid i { display:block; aspect-ratio:1; border-radius:4px; background:var(--warn); }
  .repeat-paid { font:700 30px 'Inter',sans-serif; color:var(--warn); margin-top:18px; }

  .who { font:400 38px 'Roboto',sans-serif; color:var(--soft); }
  .who span { display:block; font:800 34px 'Inter',sans-serif; letter-spacing:6px; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
  .inputs { border-left:6px solid var(--accent); padding-left:44px; display:flex; flex-direction:column; gap:40px; margin:14px 0; }
  .input-value { font:800 122px/1 'Inter',sans-serif; letter-spacing:-5px; }
  .input-label { font:400 36px 'Roboto',sans-serif; color:var(--soft); margin-top:8px; }
  .question { font:700 52px/1.15 'Inter',sans-serif; letter-spacing:-1.2px; }

  .layout-tool { padding:0; }
  .layout-tool .content { justify-content:flex-start; gap:0; }
  .tool-band { background:var(--ink); color:#fff; padding:96px 84px 56px; }
  .tool-name { font:800 66px/1.05 'Inter',sans-serif; letter-spacing:1px; text-transform:uppercase; }
  .tool-lead { font:400 36px 'Roboto',sans-serif; color:rgba(255,255,255,.82); margin-top:18px; }
  .tool-body { padding:34px 84px 0; display:flex; flex-direction:column; gap:26px; }
  .tool-row { display:flex; align-items:center; background:#fff; border:2px solid var(--rule); border-radius:18px; overflow:hidden; height:200px; }
  .tool-row i { align-self:stretch; width:22px; flex:none; }
  .tool-rows { display:flex; flex-direction:column; gap:20px; }
  .tool-side { padding-left:34px; flex:1; }
  .tool-label { font:800 30px 'Inter',sans-serif; letter-spacing:5px; text-transform:uppercase; }
  .tool-what { font:400 30px 'Roboto',sans-serif; color:var(--soft); margin-top:6px; }
  .tool-factor { font:800 118px/1 'Inter',sans-serif; letter-spacing:-4px; padding-right:40px; white-space:nowrap; }
  .tool-rows.n2 .tool-row { height:280px; }
  .tool-rows.n2 .tool-factor { font-size:156px; }
  .tool-rows.n2 .tool-label { font-size:36px; }
  .tool-rows.n2 .tool-what { font-size:34px; }
  .tool-band.n5 { padding:66px 84px 34px; }
  .tool-band.n5 .tool-name { font-size:54px; }
  .tool-band.n5 .tool-lead { margin-top:10px; font-size:29px; }
  .tool-body.n5 { padding-top:22px; gap:14px; }
  .tool-rows.n5 { gap:11px; }
  .tool-rows.n5 .tool-row { height:126px; }
  .tool-rows.n5 .tool-row i { width:17px; }
  .tool-rows.n5 .tool-side { padding-left:25px; }
  .tool-rows.n5 .tool-label { font-size:25px; letter-spacing:3.5px; }
  .tool-rows.n5 .tool-what { margin-top:3px; font-size:23px; }
  .tool-rows.n5 .tool-factor { padding-right:27px; font-size:70px; letter-spacing:-2px; }
  .tool-body.n5 .tool-also { padding:17px 27px; font-size:26px; }
  .tool-body.n5 .note { font-size:19px; }
  .tool-also { background:var(--accent-soft); border-radius:18px; padding:26px 34px; font:600 33px/1.3 'Inter',sans-serif; }

  .calcs { display:flex; flex-direction:column; gap:28px; }
  .calc { display:flex; align-items:center; background:#fff; border:2px solid var(--rule); border-radius:18px; overflow:hidden; min-height:224px; }
  .calc i { align-self:stretch; width:22px; flex:none; }
  .calc-work { flex:1; padding:22px 0 22px 34px; }
  .calc-label { font:800 26px 'Inter',sans-serif; letter-spacing:5px; text-transform:uppercase; margin-bottom:10px; }
  .calc-line { font:500 34px/1.35 'Roboto',sans-serif; color:var(--soft); }
  .calc-total { font:800 92px/1 'Inter',sans-serif; letter-spacing:-3.5px; padding-right:40px; }

  .cases { position:relative; display:flex; flex-direction:column; gap:44px; margin:16px 0 8px; }
  .cases::before { content:''; position:absolute; left:39px; top:40px; bottom:40px; width:4px; background:var(--rule); }
  .case { display:flex; gap:34px; align-items:flex-start; position:relative; }
  .node { flex:none; width:82px; height:82px; border-radius:50%; background:var(--paper); border:4px solid var(--accent); color:var(--accent); font:800 36px 'Inter',sans-serif; display:flex; align-items:center; justify-content:center; }
  .case-head { font:800 56px/1.05 'Inter',sans-serif; letter-spacing:-1.5px; }
  .case-chips { display:flex; flex-wrap:wrap; gap:12px; margin-top:16px; }
  .chip { border:2px solid var(--ink); border-radius:999px; padding:8px 22px; font:600 28px 'Inter',sans-serif; background:#fff; }
  .case-detail { font:400 34px/1.3 'Roboto',sans-serif; color:var(--soft); }
  .rule { background:var(--ink); color:#fff; border-radius:18px; padding:30px 36px; font:700 40px/1.2 'Inter',sans-serif; display:flex; align-items:center; gap:26px; }
  .rule span { font:800 22px 'Inter',sans-serif; letter-spacing:5px; color:#9FE9DD; }

  .kicker { font:800 78px/1.06 'Inter',sans-serif; letter-spacing:-2.6px; }
  .kicker-line { font:400 38px/1.3 'Roboto',sans-serif; color:var(--soft); margin-top:-6px; }
  .keep { display:flex; gap:44px; align-items:center; margin-top:18px; }
  .keep-side { flex:1; min-width:0; }
  .mini { flex:none; width:346px; height:432px; border-radius:14px; overflow:hidden; border:3px solid var(--ink); box-shadow:12px 12px 0 rgba(0,33,113,.12); background:var(--paper); }
  .mini-inner { width:${W}px; height:${H}px; transform:scale(.32); transform-origin:top left; display:flex; flex-direction:column; }
  .bookmark { display:inline-block; background:var(--accent); color:#fff; font:800 30px 'Inter',sans-serif; letter-spacing:4px; padding:16px 26px; border-radius:10px; margin-bottom:44px; }
  .read-label { font:800 20px 'Inter',sans-serif; letter-spacing:5px; color:var(--faint); margin-bottom:10px; }
  .read-text { font:600 36px/1.2 'Inter',sans-serif; letter-spacing:-.6px; }
  .read-url { font:600 25px 'Inter',sans-serif; color:var(--accent); margin-top:12px; }
  .keep.has-more { gap:30px; }
  .keep.has-more .mini { width:320px; height:400px; }
  .keep.has-more .mini-inner { transform:scale(.2963); }
  .keep.has-more .bookmark { margin-bottom:34px; }
  .more { list-style:none; display:flex; flex-direction:column; gap:16px; }
  .more li { font:600 30px/1.14 'Inter',sans-serif; letter-spacing:-.65px; padding-left:27px; position:relative; white-space:nowrap; }
  .more li::before { content:''; position:absolute; left:0; top:.46em; width:9px; height:9px; border-radius:50%; background:var(--accent); }
  .keep.has-more .read-url { margin-top:17px; font-size:24px; font-weight:600; opacity:.9; }
  .mark { position:absolute; left:84px; right:84px; bottom:128px; padding-top:22px; border-top:2px solid var(--rule); font:500 25px/1.4 'Roboto',sans-serif; color:var(--soft); }

  /* stories */
  .story { width:${W}px; height:${SH}px; padding:350px 84px 450px; position:relative; display:flex; flex-direction:column; justify-content:center; gap:40px; }
  .story .eyebrow { top:278px; }
  .story .handle { bottom:380px; }
  .story-label { font:800 28px 'Inter',sans-serif; letter-spacing:6px; text-transform:uppercase; color:var(--accent); }
  .story-title { font:800 84px/1.06 'Inter',sans-serif; letter-spacing:-2.8px; }
  .story-body { font:400 46px/1.3 'Roboto',sans-serif; color:var(--soft); }
  .story-box { border:4px dashed var(--rule); border-radius:24px; height:420px; }
  .story-foot { font:700 30px 'Inter',sans-serif; color:var(--accent); letter-spacing:1px; }
  .story-tool { align-self:center; flex:none; width:${W * 0.68}px; height:${H * 0.68}px; border-radius:24px; overflow:hidden; border:3px solid var(--ink); box-shadow:16px 16px 0 rgba(0,33,113,.12); }
  .story-tool .mini-inner { transform:scale(.68); }
  /* Previews are reminders, not the tool: drop text that is unreadable at this scale. */
  .mini .tool-what, .mini .tool-also, .mini .note, .story-tool .note { display:none; }
  .story-tool-note { font:600 28px/1.3 'Inter',sans-serif; color:var(--soft); }
`;

function page(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
<style>${CSS}</style></head><body>${inner}</body></html>`;
}

function slideHtml(kit, deck, slide) {
  const dots = deck.slides.map(s => `<i class="${s.number === slide.number ? 'on' : ''}"></i>`).join('');
  const edge = slide.layout === 'hook' || slide.layout === 'columns' || slide.layout === 'routes' || slide.layout === 'bands' || slide.layout === 'closer';
  const bare = slide.layout === 'hook' || slide.layout === 'columns' || slide.layout === 'routes' || slide.layout === 'bands' || slide.layout === 'tool';
  return page(`<div class="slide layout-${slide.layout} ${edge ? 'strong-handle' : ''}">
  ${bare ? '' : `<div class="eyebrow">${esc(kit.frontmatter.chip || '')}</div>`}
  <div class="content">${LAYOUTS[slide.layout](slide, deck)}</div>
  ${slide.layout === 'hook' || deck.slides.length === 1 ? '' : `<div class="dots">${dots}</div>`}
  <div class="handle">@nidhi.today</div>
</div>`);
}

function storyHtml(kit, frame) {
  const chrome = `<div class="eyebrow">${esc(kit.frontmatter.chip || '')}</div><div class="handle">@nidhi.today</div>`;
  if (frame.kind === 'poll') return page(`<div class="story">${chrome}</div>`);
  if (frame.kind === 'tool') {
    const tool = kit.days[frame.day - 1].deck.slides.find(s => s.layout === 'tool');
    return page(`<div class="story">${chrome}<div class="story-label">A tool to keep</div>
      <div class="story-tool"><div class="mini-inner layout-tool">${toolHtml(tool)}</div></div>
      ${tool.fields.note ? `<div class="story-tool-note">${rich(tool.fields.note)}</div>` : ''}</div>`);
  }
  if (frame.kind === 'result') {
    return page(`<div class="story">${chrome}<div class="story-label">${rich(frame.label)}</div>
      <div class="story-title">${rich(frame.title)}</div><div class="story-box"></div></div>`);
  }
  return page(`<div class="story">${chrome}<div class="story-label">${rich(frame.label)}</div>
    <div class="story-title">${rich(frame.title)}</div>
    ${frame.body ? `<div class="story-body">${rich(frame.body)}</div>` : ''}
    <div class="story-foot">${rich(frame.foot || 'Read the full post · link below')}</div></div>`);
}

function postingSheet(kit, frames) {
  const lines = [`POSTING SHEET: ${kit.frontmatter.title}`, `Blog: ${kit.frontmatter.blog_url}`, ''];
  for (const day of kit.days) {
    const reel = day.reel;
    if (reel) {
      lines.push(
        `DAY ${day.n}: ${day.angle.angle}`,
        `  Tool to keep: ${day.angle.tool}`,
        '',
        '  REEL',
        `    Video: ${reel.video}`,
        `    Cover: ${reel.cover}`,
        `    Caption: ${reel.caption}`,
        `    Hashtags: ${reel.hashtags}`,
        `    To render again: ${reel.render}`,
        '',
      );
    } else {
      lines.push(`POST: ${kit.frontmatter.when || 'standalone feed post'}`, '');
    }
    lines.push(
      day.deck.slides.length === 1 ? '  IMAGE' : '  CAROUSEL',
      day.deck.slides.length === 1 ? `    Image: day${day.n}/carousel/slide-01.png` : `    Slides: day${day.n}/carousel/slide-01.png to slide-${String(day.deck.slides.length).padStart(2, '0')}.png`,
      `    Caption: day${day.n}/carousel/caption.txt`,
      `    Hashtags: ${deckTags(kit, day)}`,
      '    Alt text (paste per image):',
      ...day.deck.slides.map(s => `      slide ${String(s.number).padStart(2, '0')}: ${s.fields.alt}`),
      '',
      '  STORIES',
    );
    for (const f of frames.filter(x => x.day === day.n)) {
      lines.push(`    Frame ${f.frame} (${f.time || 'any time'})`);
      if (f.share) lines.push(`      Share: ${f.share} (tap to post sticker)`);
      if (f.overlay) lines.push(`      Overlay text: ${f.overlay}`);
      if (f.kind) lines.push(`      Image: stories/${f.id}-${f.kind}.png`);
      if (f.alt) lines.push(`      Alt text: ${f.alt}`);
      if (f.poll_q) lines.push(`      Poll sticker: ${f.poll_q}`, `      Options: ${f.poll_opts}`);
      if (f.operator) lines.push(`      To do: ${f.operator}`);
      if (f.sticker) lines.push(`      Sticker: ${f.sticker}`);
      if (f.caption) lines.push(`      Caption field: ${f.caption}`);
    }
    lines.push('', ...firstHour(Boolean(day.reel)), '');
  }
  return lines.join('\n');
}

// Early signals Instagram reads are rates among real viewers (watch time,
// sends, saves), so the first hour leans on real people, never own accounts.
function firstHour(hasReel) {
  const first = hasReel ? 'the reel' : 'the post';
  return [
    '  FIRST HOUR',
    `    [ ] Story frame 1 goes up the moment ${first} is live.`,
    `    [ ] Send ${first} to 3 to 5 real people it would help (friends, colleagues, an expat group you are in); ask them to watch it through, and save or send it if it is useful.`,
    '    [ ] Reply to every comment within the hour.',
    ...(hasReel ? ['    [ ] When the carousel goes up later in the day: same story share and comment replies.'] : []),
    '    [ ] No likes, saves or shares from your own other accounts. If any happen, note them here for the metrics log:',
    '        Own-account activity: ',
  ];
}

// Returns a description of every content element that intersects the fixed
// chrome (series label, handle, progress dots, swipe cue) or leaves the canvas.
async function chromeOverlaps(browserPage) {
  return browserPage.evaluate(() => {
    const root = document.querySelector('.slide, .story');
    const chrome = [...root.querySelectorAll(':scope > .eyebrow, :scope > .handle, :scope > .dots, :scope > .swipe')]
      .filter(el => el.textContent.trim() || el.children.length);
    const content = root.classList.contains('story')
      ? [...root.children].filter(el => !chrome.includes(el) && !el.matches('.eyebrow, .handle'))
      : [...root.querySelectorAll('.content > *')];
    const box = el => el.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const page = root.getBoundingClientRect();
    const problems = [];
    for (const el of content) {
      const r = box(el);
      if (!r.width || !r.height) continue;
      for (const c of chrome) if (hit(r, box(c))) problems.push(`${el.className || el.tagName} overlaps ${c.className}`);
      if (r.left < page.left - 1 || r.right > page.right + 1 || r.top < page.top - 1 || r.bottom > page.bottom + 1) problems.push(`${el.className || el.tagName} leaves the canvas`);
    }
    // Text inside cards: every element holding text must stay on the canvas, inside any
    // ancestor that clips it (46 day 2 tool card and closer slipped past). Text wider than its own
    // box is allowed: bar labels and closer lines overhang on purpose.
    const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    for (const el of root.querySelectorAll('.content *, .story *')) {
      const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!text) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const name = `"${el.textContent.trim().slice(0, 30)}"`;
      if (!inside(r, page)) { problems.push(`${name} leaves the canvas`); continue; }
      for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
        if (getComputedStyle(a).overflow !== 'visible' && !inside(r, a.getBoundingClientRect())) { problems.push(`${name} is clipped`); break; }
      }
    }
    return [...new Set(problems)];
  });
}

// Shrinks fit-marked text until the content column stops overflowing.
async function fit(browserPage) {
  return browserPage.evaluate(() => {
    const content = document.querySelector('.content');
    const target = document.querySelector('[data-fit]');
    if (target) {
      let size = parseFloat(getComputedStyle(target).fontSize);
      while (content.scrollHeight > content.clientHeight && size > 44) target.style.fontSize = `${(size -= 3)}px`;
    }
    return content.scrollHeight > content.clientHeight + 1;
  });
}

function captionText(kit, day) {
  const keywords = deckKeywords(kit, day);
  return [day.deck.caption, '.\n.\n.', deckTags(kit, day), `[ ${keywords.join(', ')} ]`].join('\n\n') + '\n';
}

async function findMarkdownFiles(dir, base = dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await findMarkdownFiles(full, base));
    // Upper-case names (BRAND-RULES.md, README.md) are reference docs, not kits.
    else if (entry.name.endsWith('.md') && !/^[A-Z0-9_-]+\.md$/.test(entry.name)) files.push(relative(base, full));
  }
  return files.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const lintOnly = args.includes('--lint');
  const target = args.find(a => !a.startsWith('--'));
  const files = target ? [target] : await findMarkdownFiles(SOURCE_DIR);

  const kits = [];
  let failed = false;
  for (const relPath of files) {
    const kit = parseKit(await readFile(join(SOURCE_DIR, relPath), 'utf8'), relPath);
    const errors = lintKit(kit);
    if (errors.length) {
      failed = true;
      console.error(`LINT FAILED ${relPath}\n${errors.map(e => `  ${e}`).join('\n')}`);
    } else {
      console.log(`Lint ok: ${relPath}`);
      kits.push(kit);
    }
  }
  if (failed) process.exit(1);
  if (lintOnly) return;

  const browser = await puppeteer.launch({ headless: true });
  const layoutErrors = [];
  try {
    const browserPage = await browser.newPage();
    const open = async (html, path, height) => {
      await browserPage.setViewport({ width: W, height, deviceScaleFactor: 2 });
      await browserPage.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await browserPage.evaluate(() => document.fonts.ready);
      await mkdir(dirname(path), { recursive: true });
      return path;
    };
    for (const kit of kits) {
      const outDir = join(OUTPUT_DIR, kit.subDir, kit.slug);
      for (const day of kit.days) {
        const deckDir = join(outDir, `day${day.n}`, 'carousel');
        for (const slide of day.deck.slides) {
          const path = await open(slideHtml(kit, day.deck, slide), join(deckDir, `slide-${String(slide.number).padStart(2, '0')}.png`), H);
          if (await fit(browserPage)) console.warn(`  overflow: day ${day.n} slide ${slide.number}`);
          for (const p of await chromeOverlaps(browserPage)) layoutErrors.push(`${kit.relPath} day ${day.n} slide ${slide.number}: ${p}`);
          await browserPage.screenshot({ path });
        }
        await writeFile(join(deckDir, 'caption.txt'), captionText(kit, day), 'utf8');
      }

      const frames = storyFrames(kit);
      for (const frame of frames.filter(f => f.kind)) {
        const path = await open(storyHtml(kit, frame), join(outDir, 'stories', `${frame.id}-${frame.kind}.png`), SH);
        for (const p of await chromeOverlaps(browserPage)) layoutErrors.push(`${kit.relPath} story ${frame.id}: ${p}`);
        await browserPage.screenshot({ path });
      }
      await writeFile(join(outDir, 'posting-sheet.txt'), postingSheet(kit, frames), 'utf8');
      const slides = kit.days.reduce((n, d) => n + d.deck.slides.length, 0);
      console.log(`Rendered ${slides} slides and ${frames.filter(f => f.kind).length} story frames: ${relative(ROOT, outDir)}`);
    }
  } finally {
    await browser.close();
  }
  if (layoutErrors.length) {
    console.error(`LAYOUT FAILED: text overlaps fixed chrome or leaves the canvas\n${layoutErrors.map(e => `  ${e}`).join('\n')}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
