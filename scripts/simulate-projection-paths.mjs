#!/usr/bin/env node
// Reproducible Monte Carlo behind the "One line versus ten thousand paths"
// figure in src/content/blog/4. optimizing/43-financial-projections.md.
//
// Data: Jordà-Schularick-Taylor Macrohistory Database, release 6
// (https://www.macrohistory.net/database/, file JSTdatasetR6.xlsx). The data
// is free to use but not ours to redistribute, so it is not checked in.
// Download the xlsx and pass its path:
//
//   node scripts/simulate-projection-paths.mjs ~/Downloads/JSTdatasetR6.xlsx
//
// Method:
// 1. For every country and year, real equity return =
//    (1 + eq_tr) / (cpi / previous cpi) - 1, in local currency.
// 2. One diversified portfolio: each year, the equal-weighted average across
//    the developed markets with data that year (up to 16), rebalanced yearly,
//    1900 to 2020. Equal weights avoid converting GDP, whose units differ by
//    country in the dataset (for example trillions of yen against billions of
//    dollars).
// 3. Subtract the same number of percentage points from every year so the
//    arithmetic average is the 6% real used for the post's middle line. This is
//    a modelling choice: it keeps the year-to-year spread in percentage points,
//    not the ratios of gross returns. Only the level is the post's assumption.
// 4. Draw 10,000 paths of 30 years by resampling single years independently,
//    with replacement (seeded, so every run gives the same numbers). This keeps
//    the spread of yearly returns but not the way good or bad years clustered. Each path starts at
//    €50,000 and adds €1,000 a month, compounding monthly within the year.
//
// Prints the summary statistics, the percentiles, and the SVG path data used
// in the figure.

import { execFileSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/simulate-projection-paths.mjs <path to JSTdatasetR6.xlsx>');
  process.exit(1);
}

const SEED = 43;
const PATHS = 10_000;
const YEARS = 30;
const START = 50_000;
const MONTHLY = 1_000;
const TARGET_MEAN = 0.06;
const FROM = 1900;
const TO = 2020;

// --- read the workbook (xlsx is a zip of XML) ---
const unzip = (part) => execFileSync('unzip', ['-p', file, part], { maxBuffer: 1 << 28 }).toString('utf8');
const strings = unzip('xl/sharedStrings.xml')
  .split('<si>')
  .slice(1)
  .map((s) => (s.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1]);
const sheet = unzip('xl/worksheets/sheet1.xml');
const rows = [];
for (const r of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const row = {};
  for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const v = (c[3] || '').match(/<v>([\s\S]*?)<\/v>/);
    if (v) row[c[1]] = /t="s"/.test(c[2]) ? strings[+v[1]] : +v[1];
  }
  rows.push(row);
}
const header = Object.fromEntries(Object.entries(rows[0]).map(([col, name]) => [name, col]));
const get = (row, name) => row[header[name]];

// --- yearly equal-weighted real equity return ---
const byCountry = {};
for (const row of rows.slice(1)) (byCountry[get(row, 'country')] ??= {})[get(row, 'year')] = row;

const yearly = [];
for (let y = FROM; y <= TO; y++) {
  let sum = 0;
  let count = 0;
  for (const c of Object.keys(byCountry)) {
    const r = byCountry[c][y];
    const p = byCountry[c][y - 1];
    if (!r || !p) continue;
    const eq = get(r, 'eq_tr');
    const cpi = get(r, 'cpi');
    const cpiPrev = get(p, 'cpi');
    if (eq == null || !cpi || !cpiPrev) continue;
    sum += (1 + eq) / (cpi / cpiPrev) - 1;
    count += 1;
  }
  if (count > 0) yearly.push(sum / count);
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1));
const geo = (a) => Math.exp(mean(a.map((x) => Math.log(1 + x)))) - 1;
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

const shift = TARGET_MEAN - mean(yearly);
const shifted = yearly.map((x) => x + shift);
if (shifted.some((r) => r <= -1)) {
  throw new Error('Mean shift produced a return at or below -100%');
}

console.log(`History ${FROM} to ${TO}: ${yearly.length} years`);
console.log(`  geometric ${pct(geo(yearly))}, arithmetic ${pct(mean(yearly))}, sd ${pct(sd(yearly))}`);
console.log(`  worst ${pct(Math.min(...yearly))}, best ${pct(Math.max(...yearly))}`);
console.log(`Shifted by ${pct(shift, 2)} (same points every year): geometric ${pct(geo(shifted))}, arithmetic ${pct(mean(shifted))}`);

// --- seeded bootstrap ---
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

function runYear(balance, r) {
  const m = Math.pow(1 + r, 1 / 12);
  for (let i = 0; i < 12; i++) balance = balance * m + MONTHLY;
  return balance;
}

const byYear = Array.from({ length: YEARS + 1 }, () => new Float64Array(PATHS));
for (let p = 0; p < PATHS; p++) {
  let b = START;
  byYear[0][p] = b;
  for (let y = 1; y <= YEARS; y++) {
    b = runYear(b, shifted[Math.floor(rand() * shifted.length)]);
    byYear[y][p] = b;
  }
}
const line = [START];
for (let y = 1; y <= YEARS; y++) line.push(runYear(line[y - 1], TARGET_MEAN));

const q = (arr, k) => {
  const s = Array.from(arr).sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(k * s.length))];
};
const end = byYear[YEARS];
const below = Array.from(end).filter((x) => x < line[YEARS]).length / PATHS;
const fmt = (x) => `€${Math.round(x).toLocaleString('en')}`;
console.log(`\nAfter ${YEARS} years (${PATHS} paths, seed ${SEED})`);
console.log(`  single line at ${pct(TARGET_MEAN, 0)} every year: ${fmt(line[YEARS])}`);
console.log(`  10th ${fmt(q(end, 0.1))}, median ${fmt(q(end, 0.5))}, 90th ${fmt(q(end, 0.9))}`);
console.log(`  paths ending below the single line: ${pct(below, 0)}`);

// --- SVG path data for the figure (x 90..600 over 30 years; y 320 = €0, 92px per €1M) ---
const X = (y) => (90 + (y * 510) / YEARS).toFixed(1);
const Y = (v) => (320 - (v / 1e6) * 92).toFixed(1);
const series = (vals) => vals.map((v, y) => `${y ? 'L' : 'M'} ${X(y)} ${Y(v)}`).join(' ');
const p10 = byYear.map((a) => q(a, 0.1));
const p50 = byYear.map((a) => q(a, 0.5));
const p90 = byYear.map((a) => q(a, 0.9));
const band = `${series(p90)} ${p10
  .map((v, y) => [y, v])
  .reverse()
  .map(([y, v]) => `L ${X(y)} ${Y(v)}`)
  .join(' ')} Z`;
console.log('\nSVG band (10th to 90th):', band);
console.log('SVG single line:', series(line));
console.log('SVG median:', series(p50));
console.log('Label y: 90th', Y(p90[YEARS]), 'line', Y(line[YEARS]), 'median', Y(p50[YEARS]), '10th', Y(p10[YEARS]));
