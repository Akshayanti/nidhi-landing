#!/usr/bin/env node
/**
 * Every free tool, in every language it is published in, opened in a real
 * browser from the built site (#363, #364):
 *
 *   1. Hydration smoke test: the tool's island mounts (Astro drops its `ssr`
 *      attribute once React has taken over), the page logs no console error
 *      and throws nothing, and a default result is on screen: an amount,
 *      drawn through Amounts.tsx (`.amt`) with a digit in it, inside the
 *      island. A tool that opens empty (STARTS_EMPTY) must show its empty
 *      view, and then a result once its example is pressed. A smoke failure
 *      cannot be excused.
 *   2. Accessibility pass: axe-core over the whole page once the tool has
 *      mounted, in the light and the dark theme, with every WCAG 2.0, 2.1 and
 *      2.2 A and AA rule. Every violation counts, whatever axe's impact label;
 *      axe's "needs review" results are printed and do not fail the run.
 *
 *   npm run build && node scripts/smoke-pages.mjs [--dist dist] [--tool slug] [--no-axe] [--jobs 3]
 *
 * The tool pages are read from dist/ (a page under /free/ holding an island),
 * so a new tool or language is covered with no change here. The site is
 * served locally (scripts/lib/serve-dist.mjs). The exchange-rate provider the
 * net worth calculator asks is answered here with fixed rates, as the privacy
 * check does, and the run fails if that tool never asked; every other request
 * to another host is aborted. A normal build starts no analytics off
 * nidhi.today, so nothing a test does reaches anyone. Cookie consent is
 * answered "declined" before the page loads, so the prompt does not cover the
 * tool.
 *
 * Known accessibility failures are listed in scripts/lib/known-failures.mjs,
 * each with its issue and a date it ends. Exits 1 on anything else.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { loadDist } from './lib/check-dist.mjs';
import { KNOWN_FAILURES, report, splitKnown } from './lib/known-failures.mjs';
import { serveDist } from './lib/serve-dist.mjs';

const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const DIST = opt('--dist') ?? join(import.meta.dirname, '..', 'dist');
const ONLY = opt('--tool');
const AXE = !argv.includes('--no-axe');
const JOBS = Math.max(1, Number(opt('--jobs')) || 3);

/** The axe rules run: WCAG A and AA, every version up to the one the site aims at (2.2 AA). */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/** Tools that ask the exchange-rate provider for their default result. */
const RATES_HOST = 'api.frankfurter.dev';
const ASKS_FOR_RATES = ['multi-currency-net-worth'];

/**
 * Tools that open with no result until something is entered: the empty view
 * must show, and its example button must then give a result. The net worth
 * calculator starts with no assets, by design.
 */
const STARTS_EMPTY = { 'multi-currency-net-worth': { empty: '.mcnw-emptyState', example: '.mcnw-exampleBtn' } };

/** Every page under /free/<tool>/ that holds an island, in every edition. */
function toolPages(dir) {
  if (!existsSync(dir)) throw new Error(`${dir} does not exist: build the site first (npm run build).`);
  const site = loadDist(dir);
  return [...site.pages.keys()]
    .filter((path) => /^(?:\/[a-z]{2})?\/free\/[^/]+\/$/.test(path))
    .filter((path) => site.pages.get(path).includes('<astro-island'))
    .filter((path) => !ONLY || path.includes(`/free/${ONLY}/`))
    .sort();
}

const pages = toolPages(DIST);
if (pages.length === 0) {
  console.error('No tool pages found in dist/.');
  process.exit(1);
}
const axeSource = AXE ? readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8') : '';

const { server, base } = await serveDist(DIST);
const browser = await puppeteer.launch({
  headless: true,
  // A CI runner has no user namespace for Chrome's sandbox.
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});

const problems = { smoke: [], axe: [] };
const review = [];
let axeRuns = 0;

/** The provider's answer: a few rates against the base asked for, as the privacy check gives. */
function ratesAnswer(url) {
  const from = url.searchParams.get('base') || 'EUR';
  const rates = { USD: 1.1, EUR: 0.9, INR: 90, CZK: 25, GBP: 0.8, JPY: 160, CHF: 0.95, MXN: 19, CAD: 1.5, AUD: 1.6 };
  return JSON.stringify(Object.entries(rates).filter(([quote]) => quote !== from).map(([quote, rate]) => ({ date: '2026-01-02', base: from, quote, rate })));
}

async function open(path, theme) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  const asked = { rates: 0 };
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console error: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => errors.push(`uncaught: ${String(e.message || e).slice(0, 300)}`));
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.origin === base || /^(data|blob):/.test(r.url())) return r.continue();
    if (url.hostname === RATES_HOST) {
      asked.rates += 1;
      return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: ratesAnswer(url) });
    }
    return r.abort();
  });
  await page.evaluateOnNewDocument((mode) => {
    try {
      localStorage.setItem('nidhi-cookie-consent', 'declined');
      localStorage.setItem('nidhi-theme-mode', mode);
    } catch { /* storage blocked: the prompt would show, and axe would say so */ }
  }, theme);
  const res = await page.goto(base + path, { waitUntil: 'load', timeout: 60000 });
  if (!res || res.status() !== 200) errors.push(`HTTP ${res ? res.status() : 'no response'}`);
  return { page, errors, asked };
}

const mounted = () => [...document.querySelectorAll('astro-island')].every((i) => !i.hasAttribute('ssr'));

async function smoke(path) {
  const { page, errors, asked } = await open(path, 'light');
  try {
    await page.waitForFunction(() => {
      const islands = [...document.querySelectorAll('astro-island')];
      return islands.length > 0 && islands.every((i) => !i.hasAttribute('ssr'));
    }, { timeout: 30000 });
  } catch {
    errors.push('the island did not mount within 30 s');
  }
  const empty = Object.entries(STARTS_EMPTY).find(([slug]) => path.includes(`/free/${slug}/`))?.[1];
  if (empty) {
    try {
      await page.waitForSelector(`astro-island ${empty.empty}`, { visible: true, timeout: 30000 });
      await page.click(`astro-island ${empty.example}`);
    } catch {
      errors.push(`the empty view (${empty.empty}) or its example button (${empty.example}) is not on screen`);
    }
  }
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('astro-island .amt')].some((el) => {
      const box = el.getBoundingClientRect();
      return /\d/.test(el.textContent) && box.width > 0 && box.height > 0;
    }), { timeout: 30000 });
  } catch {
    errors.push('no default result (an amount with a digit in .amt) is on screen');
  }
  // Errors logged in the moment after mounting count too.
  await new Promise((r) => setTimeout(r, 500));
  if (ASKS_FOR_RATES.some((slug) => path.includes(`/free/${slug}/`)) && asked.rates === 0) {
    errors.push(`never asked ${RATES_HOST} for rates, so the local answer was not what it showed`);
  }
  for (const e of errors) problems.smoke.push({ check: 'smoke', rule: 'smoke', page: path, element: '', message: `${path}: ${e}` });
  await page.close();
}

async function accessibility(path, theme) {
  const { page } = await open(path, theme);
  try { await page.waitForFunction(mounted, { timeout: 30000 }); } catch { /* the smoke test reports it */ }
  await page.evaluate(axeSource);
  const result = await page.evaluate(async (tags) => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
    const nodes = (list) => list.flatMap((v) => v.nodes.map((n) => ({ id: v.id, impact: v.impact, help: v.help, element: n.target.map((t) => (Array.isArray(t) ? t.join(' >>> ') : t)).join(' >>> ') })));
    return { violations: nodes(r.violations), incomplete: nodes(r.incomplete) };
  }, AXE_TAGS);
  axeRuns += 1;
  for (const v of result.violations) {
    problems.axe.push({ check: 'axe', rule: v.id, page: path, element: v.element, message: `${path} (${theme}): ${v.id} [${v.impact}] ${v.help}: ${v.element}` });
  }
  for (const v of result.incomplete) review.push(`${path} (${theme}): ${v.id}: ${v.element}`);
  await page.close();
}

// The smoke test times hydration, so it runs one page at a time: three cold
// tabs at once can hold the first page's island past its timeout. The
// accessibility runs, which only wait, then share the browser.
for (const path of pages) await smoke(path);
const tasks = AXE ? pages.flatMap((path) => ['light', 'dark'].map((theme) => () => accessibility(path, theme))) : [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, tasks.length) }, async () => {
  while (next < tasks.length) await tasks[next++]();
}));

await browser.close();
server.close();

// The same element on the same page in both themes is one problem.
const unique = (list) => [...new Map(list.map((p) => [`${p.rule}\n${p.page}\n${p.element}\n${p.message.replace(/ \((light|dark)\):/, ':')}`, p])).values()];
let failed = report('smoke', splitKnown(problems.smoke, []), { full: !ONLY });
if (AXE) {
  failed += report('axe', splitKnown(unique(problems.axe), KNOWN_FAILURES.filter((k) => k.check === 'axe')), { full: !ONLY });
  if (review.length) {
    const distinct = [...new Set(review.map((r) => r.replace(/ \((light|dark)\):/, ':')))];
    console.log(`\naxe could not decide ${distinct.length} item(s); they need a person to look, and do not fail the run:`);
    for (const r of distinct.slice(0, 40)) console.log(`  ${r}`);
    if (distinct.length > 40) console.log(`  … and ${distinct.length - 40} more`);
  }
}
console.log(`\n${pages.length} tool pages${AXE ? `, ${axeRuns} accessibility runs` : ''}. ${failed} problem(s).`);
process.exit(failed ? 1 : 0);
