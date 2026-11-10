#!/usr/bin/env node
// The browser check of CLAUDE.md, "Free tools keep inputs out of URLs", rule 6,
// as a script: nothing a reader types into a free tool may reach PostHog.
//
//   PUBLIC_ANALYTICS_TEST=1 npm run build
//   node scripts/verify-tool-privacy.mjs [options]
//   npm run verify:tool-privacy          (builds, then runs everything)
//
//   --tool <slug>      only this tool (repeatable): loan-comparison,
//                      multi-currency-net-worth, monte-carlo-simulator,
//                      inflation-calculator, invest-or-pay-off
//   --locale <code>    only this language (repeatable): en hi es cs mr
//   --viewport <name>  phone or laptop (repeatable)
//   --consent <state>  declined or accepted (repeatable)
//   --headless         no window. PostHog does not send $pageleave from a
//                      headless browser, so that one check is skipped.
//   --dump <dir>       write every decoded payload there, one file per run
//   --jobs <n>         browsers to run side by side (default 3)
//   --plant-leak       the check checking itself: each page also sends one
//                      event holding a typed amount, and every run must then
//                      FAIL. Exits 0 only if all of them did.
//
// For each tool, in each language, on a phone-sized and a laptop-sized window,
// without and with cookie consent, it types distinctive amounts and a
// distinctive name, clicks inputs, buttons, result cards and charts (three
// quick clicks for a rage click, one where nothing responds for a dead click),
// uses every export, leaves the page, opens a # share link and an old ? link,
// and switches language from a share link. Then it decodes every PostHog
// request the page tried to send and fails if any of them holds a typed
// value, a file name, a blob: or data: address, a tool address with state in
// it, or an element attribute other than data-attr and positions.
//
// A clean payload counts only if the events were there: the consent runs must
// show $autocapture and a $rageclick or $dead_click, and every run must show
// $pageview and the tool's own events. Zero click events means click capture
// never started, not that clicks are clean.
//
// Nothing reaches PostHog. The build must be a test build (a dummy key
// PostHog rejects); only the SDK's static scripts load from PostHog; the
// settings request is answered here; every other PostHog request is recorded
// and aborted; and Chrome cannot resolve the ingestion host at all.

import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { gunzipSync } from 'node:zlib';
import puppeteer from 'puppeteer';
import {
  AMOUNTS, NAMES, TEST_KEY, findLeaks, eventsIn, decodeBody, checkRun,
} from './lib/tool-privacy-checks.mjs';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

// ---------------------------------------------------------------------------
// What to run
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const many = (flag) => argv.flatMap((a, i) => (a === flag ? [argv[i + 1]] : []));
const HEADLESS = argv.includes('--headless');
const DUMP = many('--dump')[0] || null;
const PLANT = argv.includes('--plant-leak');
const JOBS = Math.max(1, Number(many('--jobs')[0]) || 3);

// Kept in step with LOCALES in src/i18n/config.ts by the unit test
// scripts/lib/tool-privacy-checks.test.mjs: this script runs under plain node.
export const LOCALE_CODES = ['en', 'hi', 'es', 'cs', 'mr'];

const [A1, A2, A3] = AMOUNTS;
const [N1, N2] = NAMES;

/**
 * Each tool: where its sentinel values go, and what to do that is its own.
 * `fields` are filled in order; `{ all: true }` fills every match (each offer,
 * each row), otherwise the first. Everything else is found on the page.
 */
const TOOLS = {
  'loan-comparison': {
    global: '__nidhiLoanCompareShared',
    fields: [
      { selector: 'input[id$="-name"]', value: N1, all: true },
      { selector: 'input[id$="-principal"]', value: A1, all: true },
      { selector: 'input[id$="-fee"]', value: A2 },
      { selector: 'input[id$="-extra"]', value: A3 },
    ],
    // A third offer, named, then removed with its remove button.
    async extra(page) {
      await click(page, '[data-attr="lc-vendor-add"]');
      await fill(page, 'input[id$="-name"]', N2, { last: true });
      await click(page, '[data-attr="lc-vendor-remove"]', { last: true });
    },
    ownEvents: /^free_loan_comparison_/,
  },
  'multi-currency-net-worth': {
    global: '__nidhiNetWorthShared',
    fields: [
      { selector: 'input[id$="-name"]', value: N1 },
      { selector: 'input[id$="-value"]', value: A1 },
      { selector: 'input[id$="-name"]', value: N2, last: true },
      { selector: 'input[id$="-value"]', value: A2, last: true },
    ],
    async extra(page) {
      await click(page, '[data-attr="mcnw-asset-add"]');
      await fill(page, 'input[id$="-name"]', N2, { last: true });
      await fill(page, 'input[id$="-value"]', A3, { last: true });
      await click(page, '[data-attr="mcnw-asset-remove"]', { last: true });
      await click(page, '[data-attr="mcnw-csv-download"]');
    },
    ownEvents: /^free_multi_currency_net_worth_/,
  },
  'monte-carlo-simulator': {
    global: '__nidhiMonteCarloShared',
    fields: [
      { selector: 'input.mcs-input[type="number"]', value: A1 },
      { selector: 'input.mcs-input[type="number"]', value: A2, nth: 1 },
    ],
    ownEvents: /^free_monte_carlo_/,
  },
  'inflation-calculator': {
    global: '__nidhiInflationShared',
    fields: [{ selector: 'input[id$="-amount"]', value: A1 }],
    ownEvents: /^free_inflation_/,
  },
  'invest-or-pay-off': {
    global: '__nidhiInvestOrPayOffShared',
    fields: [
      { selector: 'input[id$="-balance"]', value: A1 },
      { selector: 'input[id$="-payment"]', value: A2 },
      { selector: 'input[id$="-extra"]', value: A3 },
    ],
    ownEvents: /^free_invest_or_pay_off_/,
  },
};

const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  laptop: { width: 1366, height: 800, deviceScaleFactor: 1 },
};

const pick = (flag, all) => {
  const asked = many(flag);
  for (const a of asked) if (!all.includes(a)) { console.error(`Unknown ${flag} ${a}. One of: ${all.join(', ')}`); process.exit(2); }
  return asked.length ? asked : all;
};
const tools = pick('--tool', Object.keys(TOOLS));
const locales = pick('--locale', LOCALE_CODES);
const viewports = pick('--viewport', Object.keys(VIEWPORTS));
const consents = pick('--consent', ['declined', 'accepted']);

// ---------------------------------------------------------------------------
// The build under test
// ---------------------------------------------------------------------------

function requireTestBuild() {
  const page = join(DIST, 'free/loan-comparison/index.html');
  if (!existsSync(page)) {
    console.error('No build found. Run:  PUBLIC_ANALYTICS_TEST=1 npm run build');
    process.exit(2);
  }
  if (!readFileSync(page, 'utf8').includes(TEST_KEY)) {
    console.error(
      'dist/ is not a test build. This check never runs against a build that carries the real PostHog key.\n' +
      'Run:  PUBLIC_ANALYTICS_TEST=1 npm run build',
    );
    process.exit(2);
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

/** Serves dist/ on a free local port, the way GitHub Pages does: a folder answers with its index.html. */
function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    let file = join(DIST, path);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

// ---------------------------------------------------------------------------
// PostHog: record everything, let nothing through
// ---------------------------------------------------------------------------

// The live project's settings that change what is sent (CLAUDE.md rule 6):
// element data as a string, autocapture on, and everything the site does not
// use turned off, as it is on the live project.
const REMOTE_CONFIG = {
  token: TEST_KEY,
  supportedCompression: ['gzip', 'gzip-js'],
  hasFeatureFlags: false,
  captureDeadClicks: true,
  capturePerformance: false,
  autocapture_opt_out: false,
  autocaptureExceptions: false,
  analytics: { endpoint: '/i/v0/e/' },
  elementsChainAsString: true,
  errorTracking: { autocaptureExceptions: false, suppressionRules: [] },
  sessionRecording: false,
  heatmaps: true,
  surveys: false,
  defaultIdentifiedOnly: true,
  siteApps: [],
};
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' };

const isPosthog = (host) => /(^|\.)posthog\.com$/.test(host);

/**
 * Watches one page: every PostHog request it tries to send is added to
 * `requests` as `{ url, body }`, the body as bytes.
 *
 * The bytes come from the browser's own paused-request event, on the session
 * Puppeteer already intercepts with. Puppeteer's `postData()` is a string, so
 * a gzip body arrives damaged, and a second session misses the requests a
 * page sends as it unloads, which is exactly where $pageleave is.
 */
async function watch(page, requests, problems) {
  const client = typeof page._client === 'function' ? page._client() : null;
  if (!client) throw new Error('This Puppeteer version does not expose the page session; verify-tool-privacy.mjs needs updating.');
  client.on('Fetch.requestPaused', ({ request }) => {
    let host = '';
    try { host = new URL(request.url).hostname; } catch { return; }
    if (!isPosthog(host) || request.method !== 'POST') return;
    const parts = (request.postDataEntries || []).map((e) => Buffer.from(e.bytes || '', 'base64'));
    requests.push({ url: request.url, body: Buffer.concat(parts) });
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    let url;
    try { url = new URL(req.url()); } catch { req.continue(); return; }
    if (!isPosthog(url.hostname)) {
      // The exchange-rate provider is answered here too: the check makes no
      // request to anyone but the local server and PostHog's script host.
      if (url.hostname === 'api.frankfurter.dev') {
        const base = url.searchParams.get('base') || 'EUR';
        const rates = { USD: 1.1, EUR: 0.9, INR: 90, CZK: 25, GBP: 0.8, JPY: 160, CHF: 0.95, MXN: 19, CAD: 1.5, AUD: 1.6 };
        const rows = Object.entries(rates).filter(([quote]) => quote !== base).map(([quote, rate]) => ({ date: '2026-01-02', base, quote, rate }));
        req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(rows) });
        return;
      }
      if (url.hostname !== '127.0.0.1') { problems.push(`a request left for ${url.hostname}: ${url.pathname}`); req.abort(); return; }
      req.continue();
      return;
    }
    // The SDK's own scripts, and nothing else, load from PostHog.
    if (req.method() === 'GET' && /^\/static\/([\w.-]+\/)?[\w.-]+\.js$/.test(url.pathname)) { req.continue(); return; }
    if (/^\/array\/[^/]+\/config(\.js)?$/.test(url.pathname)) {
      const json = JSON.stringify(REMOTE_CONFIG);
      if (url.pathname.endsWith('.js')) {
        req.respond({ status: 200, headers: CORS, contentType: 'application/javascript', body: `(function(){window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG[${JSON.stringify(TEST_KEY)}]={config:${json},siteApps:[]};})();` });
      } else {
        req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: json });
      }
      return;
    }
    req.abort();
  });

  // Printing would open a dialog that stops the page; the export still runs.
  await page.evaluateOnNewDocument(() => {
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
}

// ---------------------------------------------------------------------------
// Acting on the page
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The visible elements matching `selector`, inside the tool. */
async function visible(page, selector) {
  const all = await page.$$(selector);
  const out = [];
  for (const el of all) {
    // A link is never clicked here: it would leave the page mid-run. Leaving
    // is done on purpose, later.
    const ok = await el.evaluate((node) => {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      const link = node.closest('a[href]') || node.querySelector('a[href]');
      const switchLink = node.matches('a[data-lang-switch]');
      return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && !node.disabled && (!link || switchLink);
    }).catch(() => false);
    if (ok) out.push(el);
  }
  return out;
}

/**
 * One real click on an element: scrolled to the middle of the window, then
 * the mouse pressed on its centre, but only if that point really is the
 * element (or inside it). A sticky header or a notice can sit over it, and a
 * click meant for a button must never land on a link.
 */
async function press(page, el, times = 1, gap = 60) {
  let point = null;
  try {
    // Middle of the window first; if something sits over it there, lower and higher.
    for (const block of ['center', 'end', 'start']) {
      point = await el.evaluate((node, where) => {
        node.scrollIntoView({ block: where, inline: 'nearest', behavior: 'instant' });
        const r = node.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (!hit) return { covered: 'nothing: the point is outside the window' };
        const same = hit === node || node.contains(hit) || (hit.contains(node) && !hit.closest('a[href]'));
        return same ? { x, y } : { covered: `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` };
      }, block);
      if (point && !point.covered) break;
    }
  } catch { return false; }
  if (!point || point.covered) {
    if (point) press.covered.add(point.covered);
    return false;
  }
  for (let i = 0; i < times; i++) { await page.mouse.click(point.x, point.y); await sleep(gap); }
  return true;
}
// What sat over an element that could not be clicked, for the run's notes.
press.covered = new Set();

async function choose(page, selector, { last = false, nth = 0 } = {}) {
  const found = await visible(page, selector);
  return last ? found[found.length - 1] : found[nth];
}

async function click(page, selector, where = {}) {
  const el = await choose(page, selector, where);
  if (!el || !(await press(page, el))) return false;
  await sleep(120);
  return true;
}

async function fill(page, selector, value, where = {}) {
  const el = await choose(page, selector, where);
  if (!el) throw new Error(`no visible field for ${selector}`);
  // A field under an adornment (a currency sign, say) is reached with the keyboard instead.
  if (!(await press(page, el))) await el.focus();
  // Select what is there, so that typing replaces it.
  await el.evaluate((node) => { node.focus(); if (typeof node.select === 'function') node.select(); });
  await el.type(String(value), { delay: 5 });
  await page.keyboard.press('Tab');
  await sleep(150);
}

async function waitForTool(page) {
  // The island has hydrated, and PostHog has loaded and applied its settings.
  await page.waitForFunction(() => {
    const island = document.querySelector('main astro-island, astro-island');
    return island && !island.hasAttribute('ssr');
  }, { timeout: 30000 });
  await page.waitForFunction(() => window.posthog && window.posthog.__loaded === true, { timeout: 30000 });
  await sleep(600);
}

/** Everything a reader can do on one tool page. */
async function useTool(page, tool, note) {
  const island = 'astro-island';

  // Type the distinctive values.
  note.step = 'typing values';
  for (const f of tool.fields) {
    if (f.all) {
      const n = (await visible(page, f.selector)).length;
      for (let i = 0; i < n; i++) await fill(page, f.selector, f.value, { nth: i });
    } else {
      await fill(page, f.selector, f.value, f);
    }
  }
  note.step = 'adding and removing a named row';
  if (tool.extra) await tool.extra(page);
  await sleep(500);

  // Click inputs, and change every choice the tool offers.
  note.step = 'clicking inputs and choices';
  for (const el of await visible(page, `${island} input[type="text"], ${island} input[type="number"]`)) {
    await press(page, el);
  }
  // A choice from a list: the next option, picked the way a keyboard does.
  for (const el of await visible(page, `${island} select`)) {
    try {
      await el.evaluate((node) => node.scrollIntoView({ block: 'center' }));
      await el.focus();
      await page.keyboard.press('ArrowDown');
    } catch { /* not reachable */ }
    await sleep(150);
  }
  for (const selector of [`${island} input[type="radio"]`, `${island} input[type="checkbox"]`, `${island} summary`, `${island} [role="tab"]`]) {
    for (const el of await visible(page, selector)) {
      await press(page, el);
      await sleep(120);
    }
  }
  await sleep(400);

  // Result cards and charts. Three quick clicks in one spot make a rage
  // click; a single click on a drawing nothing listens to makes a dead click.
  note.step = 'clicking charts and results';
  // Back to the first tab, where a tool with tabs keeps its charts.
  const firstTab = await choose(page, `${island} [role="tab"]`);
  if (firstTab) { await press(page, firstTab); await sleep(400); }
  const charts = await visible(page, `${island} svg`);
  const big = [];
  for (const el of charts) {
    const box = await el.boundingBox().catch(() => null);
    if (box && box.width > 120 && box.height > 60) big.push(el);
  }
  note.charts = big.length;
  for (const el of big.slice(0, 3)) {
    await press(page, el, 3);
    await sleep(300);
  }
  const cards = await visible(page, `${island} [class*="result"], ${island} [class*="Result"], ${island} [class*="summary"], ${island} [class*="card"], ${island} output, ${island} table td`);
  note.cards = cards.length;
  for (const el of cards.slice(0, 4)) { await press(page, el); await sleep(150); }
  // A rage click: four quick clicks on the first chart, or else the first result.
  const still = big[0] || cards[0];
  if (still) { await press(page, still, 4, 80); await sleep(400); }
  // Dead clicks: one click each on plain text, where nothing responds.
  const plain = await visible(page, `${island} h2, ${island} h3, ${island} p, ${island} dd, ${island} td`);
  note.plain = plain.length;
  for (const el of plain.slice(0, 4)) { await press(page, el); await sleep(300); }
  // PostHog decides a click was dead a few seconds after it.
  await sleep(4200);

  // Every button except reset, which goes last: add, share, copy, exports.
  note.step = 'clicking buttons';
  const buttons = await visible(page, `${island} button:not([role="tab"])`);
  const resets = [];
  for (const el of buttons) {
    const label = await el.evaluate((node) => `${node.getAttribute('data-attr') || ''} ${node.className}`).catch(() => null);
    if (label === null) continue;
    note.step = `clicking the button ${label.trim()}`;
    if (/reset|--ghost/i.test(label)) { resets.push(el); continue; }
    if (/remove/.test(label)) continue; // done above, on a named row
    await press(page, el);
    await sleep(250);
    // A dialog opened by a button: use its buttons too, then close it.
    for (const inner of await visible(page, 'astro-island [role="dialog"] button, astro-island dialog[open] button')) {
      await press(page, inner);
      await sleep(200);
    }
    await page.keyboard.press('Escape');
  }
  note.buttons = buttons.length;
  await sleep(500);
  return resets;
}

// ---------------------------------------------------------------------------
// One run: one tool, one language, one window size, one consent state
// ---------------------------------------------------------------------------

async function run(browser, base, { slug, locale, viewport, consent }) {
  const tool = TOOLS[slug];
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const path = `${prefix}/free/${slug}/`;
  const requests = [];
  const problems = [];
  const note = {};
  const context = await browser.createBrowserContext();
  const downloads = mkdtempSync(join(tmpdir(), 'nidhi-privacy-'));
  let page;

  const open = async (address) => {
    page = await context.newPage();
    await page.setViewport(VIEWPORTS[viewport]);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    await watch(page, requests, problems);
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, browserContextId: context.id }).catch(() => {});
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true }).catch(() => {});
    await page.goto(base + address, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForTool(page);
    if (PLANT) await page.evaluate((amount) => window.posthog.capture('free_planted_leak', { amount }), A1);
    // If the page goes somewhere it was not sent, say during which step.
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame() || note.leaving) return;
      const to = new URL(frame.url());
      if (to.pathname !== new URL(base + address).pathname) note.strayed = `went to ${to.pathname} while: ${note.step}`;
    });
  };
  // The page's last events go out as it unloads, while the abort still applies.
  const leave = async () => {
    note.leaving = true;
    await page.goto('about:blank').catch(() => {});
    await sleep(700);
    await page.close();
    note.leaving = false;
  };
  const address = () => page.evaluate(() => window.location.pathname + window.location.search + window.location.hash);

  try {
    if (consent === 'accepted') {
      await context.setCookie({ name: 'nidhi-cookie-consent', value: 'accepted', url: base, path: '/' });
    }
    await context.overridePermissions(base, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']).catch(() => {});

    // 1. Use the tool. Without the cookie, the banner is in front of the page:
    // a reader who does not consent answers it with "decline", once.
    await open(path);
    if (consent === 'declined') {
      if (!(await click(page, '#cookie-decline'))) problems.push('the cookie banner was not shown to a reader with no answer');
      await sleep(400);
    } else if ((await visible(page, '#cookie-overlay')).length) {
      problems.push('the cookie banner was shown although consent was already given');
    }
    const resets = await useTool(page, tool, note);
    const state = await page.evaluate((g) => window[g] || '', tool.global);
    if (!state) problems.push('the tool published no state for the language switch, so the share-link steps had nothing to carry');
    if ((await address()) !== path) problems.push(`the address changed while the tool was used: ${await address()}${note.strayed ? ` (${note.strayed})` : ''}`);
    for (const el of resets) { await press(page, el); await sleep(300); }
    await leave();

    if (state) {
      // 2. A # share link: the state is moved out of the address, and applied.
      await open(`${path}?utm_source=share&utm_medium=referral#${state}`);
      if ((await address()) !== `${path}?utm_source=share&utm_medium=referral`) problems.push(`a # share link left state in the address: ${await address()}`);
      const shown = await page.evaluate((amount) => [...document.querySelectorAll('astro-island input')].some((i) => i.value.replace(/\D/g, '') === amount) || document.body.innerText.replace(/\D/g, '').includes(amount), String(A1));
      if (!shown) problems.push('a # share link did not bring the typed amount back, so the link carried no state to protect');

      // 3. Switch language from the share link: the state crosses after the #.
      const other = locale === 'en' ? 'hi' : 'en';
      const otherPath = `${other === 'en' ? '' : `/${other}`}/free/${slug}/`;
      const opener = await choose(page, '.lang-picker summary, [data-attr="nav-menu"]');
      if (opener) { await press(page, opener); await sleep(300); }
      const link = await choose(page, `a[data-lang-switch="${other}"]`);
      if (!link) {
        problems.push(`no visible language switch to ${other}`);
      } else {
        const href = await link.evaluate((a) => a.getAttribute('href'));
        if (/#|[?&](?!utm_)/.test(href.replace(/^[^?#]*\??/, '?').replace(/^\?$/, ''))) problems.push(`the language switch link holds more than utm parameters: ${href}`);
        note.leaving = true;
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }), press(page, link)]);
        note.leaving = false;
        await waitForTool(page);
        if (!(await address()).startsWith(otherPath) || /#/.test(await address())) problems.push(`after a language switch the address is ${await address()}`);
        const carried = await page.evaluate((g) => window[g] || '', tool.global);
        if (!carried) problems.push('the language switch did not carry the tool state');
      }
      await leave();

      // 4. An old ? link: the same, from the query string.
      await open(`${path}?${state}&utm_source=share`);
      if ((await address()) !== `${path}?utm_source=share`) problems.push(`an old ? link left state in the address: ${await address()}`);
      await leave();
    }
  } catch (err) {
    problems.push(`the run stopped: ${err && err.message ? err.message : err}`);
    try { await page.goto('about:blank'); await page.close(); } catch { /* already closed */ }
  } finally {
    await context.close().catch(() => {});
    rmSync(downloads, { recursive: true, force: true });
  }

  note.covered = [...press.covered];
  press.covered.clear();
  const decoded = requests.map((r) => ({ url: r.url, ...decodeBody(r.url, r.body, gunzipSync) }));
  const events = decoded.flatMap((d) => eventsIn(d.json));
  const result = checkRun({ decoded, events, consent, headless: HEADLESS, ownEvents: tool.ownEvents, hasCharts: (note.charts || 0) > 0, origin: base });
  result.problems.unshift(...problems);
  if (DUMP) {
    mkdirSync(DUMP, { recursive: true });
    writeFileSync(join(DUMP, `${slug}.${locale}.${viewport}.${consent}.json`), JSON.stringify({ note, problems: result.problems, counts: result.counts, decoded }, null, 1));
  }
  return { ...result, note };
}

// ---------------------------------------------------------------------------

requireTestBuild();
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const launch = () => puppeteer.launch({
  headless: HEADLESS,
  args: [
    // PostHog drops events from a browser that says it is automated.
    '--disable-blink-features=AutomationControlled',
    // An event that escapes the abort still cannot connect.
    '--host-resolver-rules=MAP eu.i.posthog.com ~NOTFOUND',
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,900',
    // A CI runner has no user namespace for Chrome's sandbox.
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ],
});

const matrix = [];
for (const slug of tools) for (const locale of locales) for (const viewport of viewports) for (const consent of consents) matrix.push({ slug, locale, viewport, consent });

let failed = 0;
let done = 0;
let next = 0;
const started = Date.now();
console.log(`Checking ${matrix.length} runs against ${base} (${HEADLESS ? 'headless' : 'with a window'}, ${Math.min(JOBS, matrix.length)} at a time)${PLANT ? ', each with a planted leak that must be caught' : ''}.`);

// Each worker has a browser of its own: a page in a background tab is slowed
// down by Chrome and would not behave as a reader's page does.
async function worker() {
  let browser = await launch();
  while (next < matrix.length) {
    const job = matrix[next++];
    const name = `${job.slug} ${job.locale} ${job.viewport} consent:${job.consent}`;
    let result;
    // A browser that was closed or crashed is started again, and the run with it, once.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await run(browser, base, job);
        if (browser.connected || attempt === 1) break;
      } catch (err) {
        result = { problems: [`the browser stopped: ${err && err.message ? err.message : err}`], counts: {} };
        if (attempt === 1) break;
      }
      await browser.close().catch(() => {});
      browser = await launch();
    }
    const counts = Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(', ');
    const caught = result.problems.some((p) => p.includes('carries what was typed'));
    const ok = PLANT ? caught : result.problems.length === 0;
    done++;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(done).padStart(3)}/${matrix.length}  ${name}  (${counts})`);
    if (PLANT && !caught) console.log('       - the planted leak was not caught: the check cannot see what it is meant to see');
    if (!PLANT) for (const p of result.problems) console.log(`       - ${p}`);
  }
  await browser.close().catch(() => {});
}
await Promise.all(Array.from({ length: Math.min(JOBS, matrix.length) }, worker));

server.close();
console.log(`\n${matrix.length - failed} of ${matrix.length} runs ${PLANT ? 'caught the planted leak' : 'clean'} in ${Math.round((Date.now() - started) / 1000)} s.`);
if (failed) {
  console.log(PLANT
    ? 'The check missed a leak it was handed. Fix the check before trusting a clean run.'
    : 'A failure here is a privacy bug or a check that could not see the events. Fix it before merging (CLAUDE.md, "Free tools keep inputs out of URLs", rule 6).');
  process.exit(1);
}
