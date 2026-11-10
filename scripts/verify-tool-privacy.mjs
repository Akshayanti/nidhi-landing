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
//   --stale-ok         run although dist/ is older than the source
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
// A clean payload counts only if the events were there. Each part of a run
// (using the tool, the # link, the language switch, the ? link) must show its
// own $pageview and $pageleave; using the tool must show the tool's events
// for the named-row removal, the share and each export, and, with consent,
// $autocapture and a $rageclick or $dead_click; across its runs every tool
// must show both of those. Zero click events means click
// capture never started, not that clicks are clean. A step that could not be
// done (a button that could not be pressed, a file that was not saved) fails
// the run: what was not exercised was not checked.
//
// What a clean run shows is that nothing typed was sent during these steps,
// in the forms findLeaks reads. It is evidence about the steps taken, on the
// build tested, not a proof about every possible click. Its known limits:
// - The distinctive values go into the amount and name fields listed in
//   TOOLS. Rates, terms, years and the other fields are clicked but hold no
//   distinctive value, so a leak of one of those would not be recognised.
// - A link, the language switch and the old link are judged to have brought
//   the state back when the first typed amount is on the page again; the
//   other values are not compared.
// - Up to eight charts and six result cards are clicked. Nothing inside a
//   link is clicked, since that would leave the page.
// - A button the pointer cannot land on (the output names each) is
//   activated directly. That checks what the button sends, not that a
//   reader can use it.
// - A value that was changed before it was sent (rounded, split, hashed)
//   would not be recognised.
//
// Nothing reaches PostHog. The build must be a test build (a dummy key
// PostHog rejects); only the SDK's static scripts load from PostHog; the
// settings request is answered here; every other PostHog request is recorded
// and aborted; and Chrome cannot resolve the ingestion host at all.

import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { gunzipSync } from 'node:zlib';
import puppeteer from 'puppeteer';
import {
  AMOUNTS, NAMES, TEST_KEY, findLeaks, eventsIn, decodeBody, checkRun, checkMatrix,
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
 *
 * `removeNamedRow` adds a row, names it with the second name and removes it
 * with its own remove button: the click that sent a typed name in Oct 2026.
 * It returns what went wrong, if anything; a removal that did not happen
 * fails the run.
 *
 * `mustSend` are the tool's events that every run has to show while the tool
 * is used, `name` or `name:format`. They are the evidence that each button
 * was really pressed: an export that was only attempted sends nothing.
 * `sharedView` is the event a # share link has to produce.
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
    removeNamedRow: (page) => addNameRemove(page, '[data-attr="lc-vendor-add"]', '[data-attr="lc-vendor-remove"]', []),
    ownEvents: /^free_loan_comparison_/,
    mustSend: ['vendor_added', 'vendor_removed', 'details_toggled', 'tab_changed', 'share_modal_opened', 'share_copied', 'exported:xlsx', 'exported:pdf', 'reset'],
    sharedView: 'shared_view_opened',
  },
  'multi-currency-net-worth': {
    global: '__nidhiNetWorthShared',
    fields: [
      { selector: 'input[id$="-name"]', value: N1 },
      { selector: 'input[id$="-value"]', value: A1 },
      { selector: 'input[id$="-value"]', value: A2, last: true },
    ],
    removeNamedRow: (page) => addNameRemove(page, '[data-attr="mcnw-asset-add"]', '[data-attr="mcnw-asset-remove"]', [['input[id$="-value"]', A3]]),
    ownEvents: /^free_multi_currency_net_worth_/,
    mustSend: ['asset_added', 'asset_removed', 'csv_downloaded', 'share_modal_opened', 'share_copied', 'exported:xlsx', 'exported:pdf', 'reset'],
    files: ['.csv'],
    // Its share link opens a read-only view, which has an event of its own.
    sharedView: 'shared_view_opened',
  },
  'monte-carlo-simulator': {
    global: '__nidhiMonteCarloShared',
    fields: [
      { selector: 'input.mcs-input[type="number"]', value: A1 },
      { selector: 'input.mcs-input[type="number"]', value: A2, nth: 1 },
    ],
    ownEvents: /^free_monte_carlo_/,
    mustSend: ['currency_changed', 'withdrawal_toggled', 'table_opened', 'share_copied', 'exported:xlsx', 'exported:pdf', 'reset'],
    sharedView: 'shared_view_opened',
  },
  'inflation-calculator': {
    global: '__nidhiInflationShared',
    fields: [{ selector: 'input[id$="-amount"]', value: A1 }],
    ownEvents: /^free_inflation_/,
    mustSend: ['mode_changed', 'currency_changed', 'country_changed', 'share_copied', 'exported:xlsx', 'exported:pdf', 'reset'],
    sharedView: 'shared_view_opened',
  },
  'invest-or-pay-off': {
    global: '__nidhiInvestOrPayOffShared',
    fields: [
      { selector: 'input[id$="-balance"]', value: A1 },
      { selector: 'input[id$="-payment"]', value: A2 },
      { selector: 'input[id$="-extra"]', value: A3 },
    ],
    ownEvents: /^free_invest_or_pay_off_/,
    mustSend: ['calculated', 'share_copied', 'exported:xlsx', 'exported:pdf', 'reset'],
    sharedView: 'shared_view_opened',
  },
};

/** How many inputs on the page hold the second name. */
const namedInputs = (page) => page.evaluate((name) => [...document.querySelectorAll('astro-island input')].filter((i) => i.value === name).length, N2);

/** Adds a row, gives it the second name (and any other values), then removes it with the last remove button. */
async function addNameRemove(page, addSelector, removeSelector, others) {
  const before = (await visible(page, removeSelector)).length;
  if (!(await click(page, addSelector))) return ['the add button could not be clicked, so no named row was removed'];
  await fill(page, 'input[id$="-name"]', N2, { last: true });
  for (const [selector, value] of others) await fill(page, selector, value, { last: true });
  if ((await namedInputs(page)) !== 1) return ['the added row did not take its name, so no named row was removed'];
  if (!(await click(page, removeSelector, { last: true }))) return ['the remove button of the named row could not be clicked'];
  await sleep(300);
  if ((await namedInputs(page)) !== 0) return ['the named row is still there after its remove button was clicked'];
  if ((await visible(page, removeSelector)).length > before + 1) return ['a row was added but none was removed'];
  return [];
}

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

/** Every file under `dir` whose name matches. */
function filesUnder(dir, match) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) out.push(...filesUnder(path, match));
    else if (match.test(name.name)) out.push(path);
  }
  return out;
}

/** The newest change under `dir`, as a time. */
function newest(dir) {
  let latest = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    latest = Math.max(latest, name.isDirectory() ? newest(path) : statSync(path).mtimeMs);
  }
  return latest;
}

/**
 * The build under test is a test build, all of it, and it is the current
 * source. Every tool page that will be opened carries the dummy key, and no
 * page anywhere in dist/ carries any other PostHog key.
 */
function requireTestBuild() {
  const stop = (message) => { console.error(`${message}\nRun:  PUBLIC_ANALYTICS_TEST=1 npm run build   (or: npm run verify:tool-privacy)`); process.exit(2); };
  if (!existsSync(join(DIST, 'index.html'))) stop('No build found.');
  for (const slug of tools) for (const locale of locales) {
    const page = join(DIST, locale === 'en' ? '' : locale, 'free', slug, 'index.html');
    if (!existsSync(page)) stop(`dist/ has no page for ${slug} in ${locale}.`);
    if (!readFileSync(page, 'utf8').includes(TEST_KEY)) stop(`dist/ is not a test build: ${page.slice(DIST.length)} does not carry the dummy key.`);
  }
  // The language switch lands on the English or the Hindi page of the tool.
  for (const slug of tools) for (const locale of ['en', 'hi']) {
    const page = join(DIST, locale === 'en' ? '' : locale, 'free', slug, 'index.html');
    if (!existsSync(page) || !readFileSync(page, 'utf8').includes(TEST_KEY)) stop(`dist/ is not a test build: /${locale === 'en' ? '' : `${locale}/`}free/${slug}/ is missing or does not carry the dummy key.`);
  }
  // No page and no script anywhere in the build carries any other PostHog key.
  for (const file of filesUnder(DIST, /\.(html|js|mjs)$/)) {
    const keys = new Set(readFileSync(file, 'utf8').match(/phc_[A-Za-z0-9_]{10,}/g) || []);
    keys.delete(TEST_KEY);
    if (keys.size) stop(`dist/ is not a test build: ${file.slice(DIST.length)} carries a PostHog key other than the dummy one. This check never runs against a build with a real key.`);
  }
  if (!argv.includes('--stale-ok')) {
    const built = statSync(join(DIST, 'index.html')).mtimeMs;
    const changed = Math.max(newest(join(ROOT, 'src')), statSync(join(ROOT, 'package.json')).mtimeMs, statSync(join(ROOT, 'astro.config.mjs')).mtimeMs);
    if (changed > built) stop('dist/ is older than the source: the check would pass or fail on a site that is not the one being changed. (--stale-ok skips this.)');
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
async function watch(page, requests, problems, note) {
  const client = typeof page._client === 'function' ? page._client() : null;
  if (!client) throw new Error('This Puppeteer version does not expose the page session; verify-tool-privacy.mjs needs updating.');
  client.on('Fetch.requestPaused', ({ request }) => {
    let host = '';
    try { host = new URL(request.url).hostname; } catch { return; }
    if (!isPosthog(host) || request.method === 'GET') return;
    const parts = (request.postDataEntries || []).map((e) => Buffer.from(e.bytes || '', 'base64'));
    // Which part of the run the request belongs to: see `phase` in run().
    requests.push({ url: request.url, body: Buffer.concat(parts), phase: note.phase });
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    let url;
    try { url = new URL(req.url()); } catch { req.continue(); return; }
    const posthog = isPosthog(url.hostname);

    // No request of any kind, to any address, may carry what was typed: an
    // image, a script, a fetch or a change of page to the site's own server
    // would put it in a server log. The one exception is the page the check
    // itself opens to try an old ?-style link, by its exact address.
    // The part after the # is left out: a browser keeps it and sends it to no one.
    if (!note.opening.has(req.url())) {
      const leaks = findLeaks(`${req.url().split('#')[0]} ${posthog ? '' : req.postData() || ''}`);
      if (leaks.length) problems.push(`a ${req.isNavigationRequest() ? 'page load' : 'request'} to ${url.hostname}${url.pathname} carries what was typed in its address${posthog ? '' : ' or body'}: ${leaks.join(', ')}`);
    }

    // Nor may the address of the page a request comes from, where another
    // site would be told it (the Referer header).
    if (url.hostname !== '127.0.0.1') {
      const referer = findLeaks((req.headers().referer || '').split('#')[0]);
      if (referer.length) problems.push(`a request to ${url.hostname} names the page it came from with what was typed in it: ${referer.join(', ')}`);
    }

    if (!posthog) {
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
    // The SDK's own scripts, by their bare address, and nothing else, load from PostHog.
    if (req.method() === 'GET' && !url.search && /^\/static\/([\w.-]+\/)?[\w.-]+\.js$/.test(url.pathname)) { req.continue(); return; }
    if (req.method() === 'GET' && /^\/array\/[^/]+\/config(\.js)?$/.test(url.pathname)) {
      const json = JSON.stringify(REMOTE_CONFIG);
      if (url.pathname.endsWith('.js')) {
        req.respond({ status: 200, headers: CORS, contentType: 'application/javascript', body: `(function(){window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG[${JSON.stringify(TEST_KEY)}]={config:${json},siteApps:[]};})();` });
      } else {
        req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: json });
      }
      return;
    }
    // Anything else PostHog is asked for with GET was not expected: say so.
    if (req.method() === 'GET') problems.push(`an unexpected request to PostHog: GET ${url.pathname}${url.search ? '?...' : ''}`);
    req.abort();
  });

  // Printing would open a dialog that stops the page; the export still runs.
  // Copying is kept on the page instead of going to the clipboard, which
  // every browser on the machine shares: runs side by side would read each
  // other's links, and the person at the keyboard would lose theirs.
  await page.evaluateOnNewDocument(() => {
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
    const keep = (text) => { window.__copied = String(text); return Promise.resolve(); };
    try { Object.defineProperty(Clipboard.prototype, 'writeText', { configurable: true, value: keep }); } catch { /* no clipboard here */ }
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
      // A closed <details> keeps its content laid out, with a size, but not
      // shown: the browser's own test knows the difference.
      const shown = typeof node.checkVisibility !== 'function' || node.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
      return shown && r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && !node.disabled && (!link || switchLink);
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
  // Where the element's centre is, and whether that point really is the element.
  const measure = (block) => el.evaluate((node, where) => {
    if (where) {
      // Leave the field that has the focus first, as a tap elsewhere would:
      // a field can redraw what is below it when it loses the focus, and a
      // click that began before that would end on something else.
      const active = document.activeElement;
      if (active && active !== node && active !== document.body && !node.contains(active)) active.blur();
      node.scrollIntoView({ block: where, inline: 'nearest', behavior: 'instant' });
    }
    const r = node.getBoundingClientRect();
    // The centre first, then other points on it: a container can cut part of
    // an element off, and then its centre belongs to something else.
    let over = 'nothing: the point is outside the window';
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75], [0.1, 0.5], [0.9, 0.5]]) {
      const x = r.left + r.width * fx;
      const y = r.top + r.height * fy;
      const hit = document.elementFromPoint(x, y);
      if (!hit) continue;
      // The point must be the element itself or something inside it. A label
      // around a checkbox or a radio button counts too: clicking it is how
      // that control is used.
      const label = hit.closest('label');
      if (hit === node || node.contains(hit) || (label && label.contains(node))) return { x, y };
      over = `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}`;
    }
    return { covered: over };
  }, block);

  let point = null;
  try {
    // Middle of the window first; if something sits over it there, lower and higher.
    for (const block of ['center', 'end', 'start']) {
      point = await measure(block);
      if (point && !point.covered) break;
    }
    // The page may still be settling (a notice opening or closing moves what
    // is below it, sometimes a moment after the focus moves): click only once
    // the point has stayed put for three looks in a row.
    let still = 0;
    for (let i = 0; i < 20 && point && !point.covered && still < 3; i++) {
      await sleep(90);
      const again = await measure(null);
      still = !again.covered && Math.abs(again.x - point.x) < 1 && Math.abs(again.y - point.y) < 1 ? still + 1 : 0;
      point = again;
    }
    // Never settled: no click is made on a page that is still moving.
    if (point && !point.covered && still < 3) point = { covered: 'nothing: the page did not stop moving' };
  } catch { return false; }
  if (!point || point.covered) {
    if (point && page.nidhiNote) page.nidhiNote.covered.add(point.covered);
    return false;
  }
  if (times > 1) {
    for (let i = 0; i < times; i++) { await page.mouse.click(point.x, point.y); await sleep(gap); }
    return true;
  }
  // One click, watched: if the element moves away as the button goes down
  // (pressing can take the focus from something that then redraws the page),
  // that click is lost, as it would be for a reader, who then clicks again.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await sleep(40);
    const under = await measure(null).catch(() => ({ covered: 'gone' }));
    await page.mouse.up();
    await sleep(gap);
    // Gone or replaced after the click is what a click often does: it counted.
    if (under.covered === 'gone' || (!under.covered && Math.abs(under.x - point.x) < 2 && Math.abs(under.y - point.y) < 2)) return true;
    if (page.nidhiNote) page.nidhiNote.moved = (page.nidhiNote.moved || 0) + 1;
    await sleep(350);
    point = await measure(null).catch(() => ({ covered: 'gone' }));
    if (point.covered) return point.covered === 'gone';
  }
  // It moved away every time: that click was not made.
  return false;
}

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

/**
 * Types `value` into a field, replacing what is there. The field is found
 * even inside a closed section (a "More options" panel is opened the way a
 * reader would, by its summary), and the typing is checked: the field must
 * have the focus before a key is pressed and hold the value afterwards. A
 * value that lands in another field would make the tool invalid, and then
 * nothing after it would be exercised.
 */
async function fill(page, selector, value, where = {}) {
  let el = await choose(page, selector, where);
  if (!el) {
    // Open every closed section that holds a match, then look again.
    for (const hidden of await page.$$(selector)) {
      const summary = await hidden.evaluateHandle((node) => {
        const details = node.closest('details:not([open])');
        return details ? details.querySelector(':scope > summary') : null;
      });
      const asElement = summary.asElement();
      if (asElement) { await press(page, asElement); await sleep(200); }
    }
    el = await choose(page, selector, where);
  }
  if (!el) throw new Error(`no visible field for ${selector}`);
  // A field under an adornment (a currency sign, say) is reached with the keyboard instead.
  if (!(await press(page, el))) await el.focus();
  // Select what is there, so that typing replaces it.
  const focused = await el.evaluate((node) => { node.focus(); if (typeof node.select === 'function') node.select(); return document.activeElement === node; });
  if (!focused) throw new Error(`the field for ${selector} could not take the focus`);
  await page.keyboard.type(String(value), { delay: 5 });
  const held = await el.evaluate((node) => node.value);
  // Grouping marks a field adds as it formats are not a difference.
  const bare = (v) => String(v).replace(/[\s.,'  ]/g, '');
  if (bare(held) !== bare(value)) throw new Error(`the field for ${selector} holds "${held}" after "${value}" was typed`);
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

/** Presses every visible button of the tool that has not been pressed yet, reset buttons left for last. */
async function pressButtons(page, note, pressed) {
  const resets = [];
  for (const el of await visible(page, 'astro-island button:not([role="tab"])')) {
    const label = await el.evaluate((node) => `${node.getAttribute('data-attr') || ''} ${node.className}`.trim()).catch(() => null);
    if (label === null || pressed.has(label)) continue;
    if (/reset|--ghost/i.test(label)) { resets.push(el); continue; }
    if (/remove/.test(label)) continue; // done on a named row, and checked there
    note.step = `clicking the button ${label}`;
    pressed.add(label);
    await press(page, el);
    await sleep(250);
    // A dialog opened by a button: use its controls, the one that closes it last.
    const DIALOG = 'astro-island [role="dialog"], astro-island dialog[open]';
    const inner = [];
    for (const d of await visible(page, 'astro-island [role="dialog"] button, astro-island dialog[open] button')) {
      const name = await d.evaluate((node) => `${node.getAttribute('data-attr') || ''} ${node.className}`).catch(() => '');
      inner.push([/cancel|close/i.test(name) ? 1 : 0, d, name.trim()]);
    }
    for (const [, d, name] of inner.sort((x, y) => x[0] - y[0])) {
      // A control the pointer cannot reach (cut off by its container, say) is
      // still activated, by calling its click directly, so that what it
      // sends is checked. That is not a reader's click: it skips focus and
      // hit testing, so it says nothing about whether the control can be
      // used. The run's output names every control reached this way.
      if (!(await press(page, d))) {
        const done = await d.evaluate((node) => { if (!node.isConnected) return false; node.click(); return true; }).catch(() => false);
        if (done) note.unreachable.add(name);
      }
      await sleep(300);
    }
    await page.keyboard.press('Escape');
    await sleep(200);
    // The dialog has to be gone before anything behind it can be used.
    for (let i = 0; i < 3 && (await page.$(DIALOG)); i++) {
      const closer = await page.$('astro-island [role="dialog"] [data-attr*="cancel"], astro-island [role="dialog"] [class*="ancel"], astro-island [role="dialog"] [class*="lose"]');
      if (closer) await closer.evaluate((node) => node.click()).catch(() => {});
      await sleep(300);
    }
    if (await page.$(DIALOG)) note.stuck = `the dialog opened by ${label} could not be closed`;
  }
  return resets;
}

/** Clicks every field and changes every choice the tool offers. Returns the fields it found. */
async function makeChoices(page, note) {
  const island = 'astro-island';
  // Click inputs, and change every choice the tool offers.
  note.step = 'clicking inputs and choices';
  const inputs = await visible(page, `${island} input[type="text"], ${island} input[type="number"]`);
  for (const el of inputs) await press(page, el);
  // A choice from a list: its next option, chosen as the browser does it.
  for (const el of await visible(page, `${island} select`)) {
    const next = await el.evaluate((node) => {
      const options = [...node.options].filter((o) => !o.disabled && o.value !== node.value && o.value !== '');
      return options.length ? options[0].value : null;
    }).catch(() => null);
    if (next === null) continue;
    await press(page, el);
    await page.keyboard.press('Escape');
    await el.select(next).catch(() => {});
    await sleep(200);
  }
  for (const selector of [`${island} input[type="checkbox"]`, `${island} summary`, `${island} [role="tab"]`, `${island} input[type="radio"]`]) {
    for (const el of await visible(page, selector)) {
      await press(page, el);
      await sleep(120);
    }
  }
  await sleep(400);
  return inputs;
}

/** Everything a reader can do on one tool page. Returns what could not be done. */
async function useTool(page, tool, note, downloads, sent) {
  const island = 'astro-island';
  const failed = [];

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
  if (tool.removeNamedRow) {
    note.step = 'adding and removing a named row';
    failed.push(...await tool.removeNamedRow(page));
  }
  await sleep(500);

  // Share and export first, while the tool holds exactly what was typed.
  const pressed = new Set();
  await pressButtons(page, note, pressed);
  await sleep(500);

  // The link the tool itself made, if it copied one.
  note.shared = await page.evaluate(() => window.__copied || '').catch(() => '');

  const inputs = await makeChoices(page, note);

  // Result cards and charts.
  note.step = 'clicking charts and results';
  // Back to the first tab, where a tool with tabs keeps its charts.
  const firstTab = await choose(page, `${island} [role="tab"]`);
  if (firstTab) { await press(page, firstTab); await sleep(400); }
  const big = [];
  for (const el of await visible(page, `${island} svg`)) {
    const box = await el.boundingBox().catch(() => null);
    if (box && box.width > 120 && box.height > 60) big.push(el);
  }
  note.charts = big.length;
  for (const el of big.slice(0, 8)) { await press(page, el, 3); await sleep(300); }
  const cards = await visible(page, `${island} [class*="result"], ${island} [class*="Result"], ${island} [class*="summary"], ${island} [class*="card"], ${island} output, ${island} table td`);
  note.cards = cards.length;
  for (const el of cards.slice(0, 6)) { await press(page, el); await sleep(150); }
  // Rage clicks: four quick clicks in one spot, in three different places
  // (charts first, then results, text and fields), since a page can mark a
  // part of itself as not to be captured. Whether PostHog saw one is checked
  // from the events; here it only has to have been possible to make them.
  note.step = 'rage and dead clicks';
  const plain = await visible(page, `${island} h2, ${island} h3, ${island} p, ${island} dd, ${island} td`);
  note.plain = plain.length;
  let rage = 0;
  for (const el of [...big, ...cards.slice(0, 6), ...plain.slice(0, 6), ...inputs]) {
    if (rage >= 3) break;
    if (await press(page, el, 4, 80)) { rage++; await sleep(1200); }
  }
  if (!rage) failed.push(`no rage click could be made (over the places tried: ${[...note.covered].join(', ') || 'nothing noted'})`);
  // Dead clicks: one click each on plain text, where nothing responds.
  let dead = 0;
  for (const el of plain.slice(0, 5)) { if (await press(page, el)) dead++; await sleep(300); }
  if (!dead) failed.push('no plain text could be clicked for a dead click');
  // PostHog decides a click was dead a few seconds after it.
  await sleep(4200);

  // Buttons that only appeared after the choices were made, then reset.
  let resets = await pressButtons(page, note, pressed);
  note.buttons = pressed.size;
  await sleep(500);

  // Every step the tool must take has to show in what it sent. A click can
  // miss while the page is still moving, so whatever has not been seen yet
  // is done again, a few times, before the run is judged. PostHog sends its
  // events in batches every few seconds, hence the wait.
  const missing = () => tool.mustSend.filter((need) => need !== 'reset' && !sent().has(need));
  for (let again = 1; again <= 3; again++) {
    await sleep(3600);
    const todo = missing();
    if (todo.length === 0) break;
    note.retried = `${again}: ${todo.join(', ')}`;
    note.step = `doing again: ${todo.join(', ')}`;
    if (todo.some((need) => /removed/.test(need)) && tool.removeNamedRow) await tool.removeNamedRow(page);
    resets = await pressButtons(page, note, new Set());
    // From the second go, a button the pointer keeps missing (the page moves
    // under it) is activated by calling its click directly, so that what it
    // sends is still checked. The output names it: such a run checks the
    // payload of that step, not that a reader's pointer can make it.
    if (again >= 2) {
      const DIRECT = { 'exported:xlsx': '[data-attr$="export-xlsx"]', 'exported:pdf': '[data-attr$="export-pdf"]', share_copied: '[data-attr*="share-copy"], [data-attr$="-share"]' };
      await sleep(3600);
      for (const need of missing()) {
        if (!DIRECT[need]) continue;
        const button = await page.$(`${island} ${DIRECT[need].split(', ').join(`, ${island} `)}`);
        if (button && (await button.evaluate((node) => { node.click(); return true; }).catch(() => false))) note.unreachable.add(need);
        await sleep(400);
      }
    }
    await makeChoices(page, note);
    // A section that was left open is closed and opened once more.
    for (const el of await visible(page, `${island} summary`)) { await press(page, el); await sleep(150); }
  }
  // The link as last copied, now that every step has been taken.
  note.shared = (await page.evaluate(() => window.__copied || '').catch(() => '')) || note.shared;

  // The exports really happened: a spreadsheet was saved and the print dialog was asked for.
  const saved = existsSync(downloads) ? readdirSync(downloads) : [];
  for (const ext of ['.xlsx', ...(tool.files || [])]) {
    if (!saved.some((name) => name.endsWith(ext))) failed.push(`no ${ext} file was saved: that export did not run`);
  }
  if (!(await page.evaluate(() => window.__printed || 0))) failed.push('the print dialog was never asked for: the PDF export did not run');
  note.saved = saved.length;
  return { resets, failed };
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
  // `phase` names the part of the run a request belongs to: using the tool,
  // the # share link, the language switch, the old ? link. `opening` holds
  // the addresses the check itself is loading.
  const note = { phase: 'use', covered: new Set(), unreachable: new Set(), opening: new Set(), parts: new Set() };
  const context = await browser.createBrowserContext();
  const downloads = mkdtempSync(join(tmpdir(), 'nidhi-privacy-'));
  let page;

  const open = async (address, phase) => {
    note.phase = phase;
    note.parts.add(phase);
    note.leaving = false;
    page = await context.newPage();
    page.nidhiNote = note;
    await page.setViewport(VIEWPORTS[viewport]);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    await watch(page, requests, problems, note);
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, browserContextId: context.id }).catch(() => {});
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true }).catch(() => {});
    const expected = new URL(base + address).pathname;
    // If the page goes somewhere it was not sent, say during which step.
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame() || note.leaving) return;
      const to = new URL(frame.url());
      if (to.protocol !== 'about:' && to.pathname !== expected) problems.push(`the page went to ${to.pathname} by itself while: ${note.step}`);
    });
    note.opening.add(base + address);
    await page.goto(base + address, { waitUntil: 'domcontentloaded', timeout: 60000 });
    note.opening.delete(base + address);
    await waitForTool(page);
    if (PLANT) {
      // One leak through analytics, one through an image on the site's own server.
      await page.evaluate((amount) => {
        window.posthog.capture('free_planted_leak', { amount });
        const img = document.createElement('img');
        img.src = `/?planted=${amount}`;
        document.body.appendChild(img);
      }, A1);
    }
  };
  // The page's last events go out as it unloads, while the abort still applies.
  const leave = async () => {
    note.leaving = true;
    await page.goto('about:blank').catch(() => {});
    await sleep(700);
    await page.close();
  };
  const address = () => page.evaluate(() => window.location.pathname + window.location.search + window.location.hash);
  // The first typed amount is on the page again: in a field, or in what a read-only view shows.
  const restored = () => page.evaluate((amount) => [...document.querySelectorAll('astro-island input')].some((i) => i.value.replace(/\D/g, '') === amount) || document.querySelector('astro-island').innerText.replace(/\D/g, '').includes(amount), String(A1));

  try {
    if (consent === 'accepted') {
      await context.setCookie({ name: 'nidhi-cookie-consent', value: 'accepted', url: base, path: '/' });
    }

    // 1. Use the tool. Without the cookie, the banner is in front of the page:
    // a reader who does not consent answers it with "decline", once.
    await open(path, 'use');
    if (consent === 'declined') {
      if (!(await click(page, '#cookie-decline'))) problems.push('the cookie banner was not shown to a reader with no answer');
      await sleep(400);
    } else if ((await visible(page, '#cookie-overlay')).length) {
      problems.push('the cookie banner was shown although consent was already given');
    }
    // What the tool has sent so far while being used, as `name` and `name:format`.
    const prefix = tool.ownEvents.source.replace(/^\^/, '');
    const sent = () => {
      const names = new Set();
      for (const r of requests) {
        if (r.phase !== 'use') continue;
        for (const e of eventsIn(decodeBody(r.url, r.body, gunzipSync).json)) {
          if (!e.event.startsWith(prefix)) continue;
          const name = e.event.slice(prefix.length);
          names.add(name);
          if (e.properties && e.properties.format) names.add(`${name}:${e.properties.format}`);
        }
      }
      return names;
    };
    const { resets, failed } = await useTool(page, tool, note, downloads, sent);
    problems.push(...failed);
    if (note.stuck) problems.push(note.stuck);
    const state = await page.evaluate((g) => window[g] || '', tool.global);
    if (!state) problems.push('the tool published no state for the language switch, so the share-link steps had nothing to carry');
    if ((await address()) !== path) problems.push(`the address changed while the tool was used: ${await address()}`);
    for (const el of resets) { await press(page, el); await sleep(300); }
    await leave();

    // The link the tool itself copied is the one opened next, exactly. The
    // tool was changed before it was shared, so the link must carry state
    // after its #, and nothing but campaign tags before it.
    let shareLink = '';
    try {
      const copied = new URL(note.shared);
      if ([...copied.searchParams.keys()].some((k) => !k.startsWith('utm_'))) problems.push(`the copied share link carries more than utm parameters before the #: ${copied.pathname}${copied.search}`);
      if (copied.pathname !== path) problems.push(`the copied share link is not a link to this tool: ${copied.pathname}`);
      else if (copied.hash.length <= 1) problems.push('the copied share link carries no state after its #, although the tool had been changed');
      else shareLink = copied.pathname + copied.search + copied.hash;
    } catch {
      problems.push('the tool copied no share link');
    }
    const utm = '?utm_source=share&utm_medium=referral';
    const cleanShare = shareLink.split('#')[0];

    if (shareLink) {
      // 2. The copied # share link: the state is moved out of the address, and applied.
      await open(shareLink, 'share');
      if ((await address()) !== cleanShare) problems.push(`a # share link left state in the address: ${await address()}`);
      if (!(await restored())) problems.push('a # share link did not bring the typed amount back, so the link carried no state to protect');
      await leave();
    }
    if (state) {
      // 3. Switch language from the tool's own state after the #: it crosses, and is applied.
      await open(`${path}${utm}#${state}`, 'switch');
      const other = locale === 'en' ? 'hi' : 'en';
      const otherPath = `${other === 'en' ? '' : `/${other}`}/free/${slug}/`;
      const opener = await choose(page, '.lang-picker summary, [data-attr="nav-menu"]');
      if (opener) { await press(page, opener); await sleep(300); }
      const link = await choose(page, `a[data-lang-switch="${other}"]`);
      if (!link) {
        problems.push(`no visible language switch to ${other}`);
      } else {
        const href = await link.evaluate((a) => a.getAttribute('href'));
        if (href.includes('#') || /[?&](?!utm_)[^=&]+=/.test(href)) problems.push(`the language switch link holds more than utm parameters: ${href}`);
        note.leaving = true;
        // The browser is sent on with the state after the #, which no server is given.
        const [, pressedLink] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null), press(page, link)]);
        note.leaving = false;
        if (!pressedLink) problems.push('the language switch link could not be clicked');
        // The page arrived at is a part of its own: it needs its own evidence.
        note.phase = 'arrived';
        note.parts.add('arrived');
        await waitForTool(page);
        if ((await address()) !== `${otherPath}${utm}`) problems.push(`after a language switch the address is ${await address()}`);
        if (!(await restored())) problems.push('the language switch did not carry the typed amount across');
      }
      await leave();

      // 4. An old ? link: the same, from the query string.
      await open(`${path}?${state}&utm_source=share`, 'old');
      if ((await address()) !== `${path}?utm_source=share`) problems.push(`an old ? link left state in the address: ${await address()}`);
      if (!(await restored())) problems.push('an old ? link did not bring the typed amount back');
      await leave();
    }
  } catch (err) {
    problems.push(`the run stopped while ${note.step}: ${err && err.message ? err.message : err}`);
    try { note.leaving = true; await page.goto('about:blank'); await page.close(); } catch { /* already closed */ }
  } finally {
    await context.close().catch(() => {});
    rmSync(downloads, { recursive: true, force: true });
  }

  const decoded = requests.map((r) => ({ url: r.url, phase: r.phase, ...decodeBody(r.url, r.body, gunzipSync) }));
  const events = decoded.flatMap((d) => eventsIn(d.json).map((e) => ({ ...e, phase: d.phase })));
  const result = checkRun({
    decoded, events, consent, headless: HEADLESS, origin: base, parts: [...note.parts],
    ownEvents: tool.ownEvents, mustSend: tool.mustSend, sharedView: tool.sharedView, planted: PLANT,
  });
  result.problems.unshift(...problems);
  result.problems = [...new Set(result.problems)];
  const notes = { ...note, covered: [...note.covered], unreachable: [...note.unreachable], parts: [...note.parts], opening: undefined };
  if (DUMP) {
    mkdirSync(DUMP, { recursive: true });
    writeFileSync(join(DUMP, `${slug}.${locale}.${viewport}.${consent}.json`), JSON.stringify({ note: notes, problems: result.problems, counts: result.counts, decoded }, null, 1));
  }
  return { ...result, note: notes };
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
    '--host-resolver-rules=MAP eu.i.posthog.com ~NOTFOUND, MAP us.i.posthog.com ~NOTFOUND, MAP app.posthog.com ~NOTFOUND, MAP internal-j.posthog.com ~NOTFOUND',
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,900',
    // A CI runner has no user namespace for Chrome's sandbox.
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ],
});

const matrix = [];
for (const slug of tools) for (const locale of locales) for (const viewport of viewports) for (const consent of consents) matrix.push({ slug, locale, viewport, consent });

let failed = 0;
let done = 0;
const finished = [];
let next = 0;
const started = Date.now();
console.log(`Checking ${matrix.length} runs against ${base} (${HEADLESS ? 'headless' : 'with a window'}, ${Math.min(JOBS, matrix.length)} at a time)${PLANT ? ', each with a planted leak that must be caught' : ''}.`);

// Told to stop (Ctrl-C, or a kill): close every browser and leave at once.
// Without this the workers below would take each closed browser for one that
// died and start another, and the run could not be stopped.
const browsers = new Set();
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stopping = true;
    for (const b of browsers) { try { b.process()?.kill('SIGKILL'); } catch { /* already gone */ } }
    process.exit(130);
  });
}

// Each worker has a browser of its own: a page in a background tab is slowed
// down by Chrome and would not behave as a reader's page does.
async function worker() {
  let browser = await launch();
  browsers.add(browser);
  while (next < matrix.length && !stopping) {
    const job = matrix[next++];
    const name = `${job.slug} ${job.locale} ${job.viewport} consent:${job.consent}`;
    let result;
    // A browser that was closed or crashed is started again, and the run with it, once.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await run(browser, base, job);
        // A page or a window that went away under the run (closed by hand,
        // or by the machine) says nothing about the site: run it once more.
        const lostPage = result.problems.some((p) => /the run stopped while .*(Session closed|Target closed|detached Frame|Connection closed|page has been closed)/.test(p));
        if (attempt === 1 || (browser.connected && !lostPage)) break;
        if (browser.connected) continue;
      } catch (err) {
        result = { problems: [`the browser stopped: ${err && err.message ? err.message : err}`], counts: {}, note: { unreachable: [] } };
        if (attempt === 1) break;
      }
      if (stopping) return;
      browsers.delete(browser);
      await browser.close().catch(() => {});
      browser = await launch();
      browsers.add(browser);
    }
    const counts = Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(', ');
    // Both planted leaks are found, the event sent to PostHog and the image
    // asked of the site's own server, and nothing else is wrong with the run.
    const leaks = result.problems.filter((p) => p.includes('carries what was typed'));
    const caught = leaks.some((p) => /^a request to \/(e|i\/v0\/e)\//.test(p)) && leaks.some((p) => /^a request to 127\.0\.0\.1\/ /.test(p)) && leaks.length === result.problems.length;
    const ok = PLANT ? caught : result.problems.length === 0;
    done++;
    if (!ok) failed++;
    finished.push({ slug: job.slug, consent: job.consent, counts: result.counts });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(done).padStart(3)}/${matrix.length}  ${name}  (${counts})`);
    if (result.note.unreachable.length) console.log(`       note: activated directly, not by the pointer (cut off, covered or moving on this layout), so only what it sends was checked: ${result.note.unreachable.join(', ')}`);
    if (PLANT && !caught) console.log(`       - ${leaks.length >= 2 ? 'both planted leaks were caught, but something else went wrong with the run' : 'the two planted leaks were not both caught'}:`);
    if (!ok) for (const p of result.problems) console.log(`       - ${p}`);
  }
  await browser.close().catch(() => {});
}
await Promise.all(Array.from({ length: Math.min(JOBS, matrix.length) }, worker));

server.close();
// Both kinds of click event were seen for every tool, in some run.
const across = PLANT ? [] : checkMatrix(finished);
for (const p of across) console.log(`FAIL  ${p}`);
if (across.length) failed += 1;
console.log(`\n${matrix.length - failed + (across.length ? 1 : 0)} of ${matrix.length} runs ${PLANT ? 'caught the planted leak' : 'clean'} in ${Math.round((Date.now() - started) / 1000)} s.`);
if (failed) {
  console.log(PLANT
    ? 'A self-test run did not end as it should: either a planted leak was missed or the run itself went wrong. Fix that before trusting a clean run.'
    : 'A failure here is a privacy bug or a check that could not see the events. Fix it before merging (CLAUDE.md, "Free tools keep inputs out of URLs", rule 6).');
  process.exit(1);
}
