/**
 * The invest or pay off calculator's page, for its component tests
 * (src/components/InvestOrPayOffParts.page*.dom.test.tsx): how the page
 * mounts the island, a small made-up inflation history served by a stand-in
 * `fetch` that the test answers by hand, and the ways a test types, waits and
 * reads the page. Not a test file.
 *
 * Importing it sets every test of the file up the same way: nothing shared
 * left on the window, analytics recorded in `events`, the window's timers run
 * by hand (test/windowClock.ts), and stand-ins for the clipboard, the prompt,
 * the print dialog and a download, each recording what it was given. A test
 * in which the page threw fails.
 *
 * The page keeps the history it fetched for as long as the module lives
 * (one request for every mount), and forgets a request that failed. So in
 * one file, tests that see the request fail come before the first that sees
 * it answered.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { clock } from './windowClock.ts';
import { investOrPayOffEn } from '../src/i18n/strings/tools/investOrPayOff.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { SHARED_STATE_GLOBAL } from '../src/utils/invest-or-pay-off/url.ts';
import type { CompactHistory, CompactSeries } from '../src/utils/inflation/history.ts';
import type { CountryOption } from '../src/components/InflationCalculator.tsx';
import InvestOrPayOff from '../src/components/InvestOrPayOff.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { investOrPayOff: investOrPayOffEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.investOrPayOff.island;
export type Strings = typeof island;
export const w = window as unknown as Record<string, unknown>;
export { clock };

/** Fills a catalog pattern's `{placeholders}` by hand. */
export const fill = (pattern: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), pattern);

// ---------------------------------------------------------------------------
// A made-up history
// ---------------------------------------------------------------------------

/** The newest year in the made-up data set. */
export const LATEST_YEAR = 2025;

/**
 * The countries the page offers.
 * Euro area: arrives with the page, 2% every year from 2016 to 2025.
 * Testland: 10% every year from 2016 to 2025, in dollars.
 * Mixland: 3% from 2016 to 2020 and 4% in 2025, nothing between: an average (3.166%), but no five-year figure; in pounds.
 * Oldland: figures that stop in 2010, too old for an average; no currency of the tool's.
 * Ruinland: -100% every year from 2016 to 2025, an impossible rate.
 * Nodataland: not in the history at all.
 */
export const COUNTRIES: CountryOption[] = [
  { code: 'EMU', name: 'Euro area', currency: 'EUR' },
  { code: 'TST', name: 'Testland', currency: 'USD' },
  { code: 'MIX', name: 'Mixland', currency: 'GBP' },
  { code: 'OLD', name: 'Oldland', currency: null },
  { code: 'RUI', name: 'Ruinland', currency: null },
  { code: 'NOD', name: 'Nodataland', currency: null },
];

export const EMU_SERIES: CompactSeries = [2016, [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]];

export const HISTORY: CompactHistory = {
  updated: '2026-10-08',
  countries: {
    TST: [2016, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]],
    MIX: [2016, [3, 3, 3, 3, 3, null, null, null, null, 4]],
    OLD: [2001, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
    RUI: [2016, [-100, -100, -100, -100, -100, -100, -100, -100, -100, -100]],
    // A different euro-area history: the page keeps the one it arrived with.
    EMU: [2016, [50, 50, 50, 50, 50, 50, 50, 50, 50, 50]],
  },
};

// ---------------------------------------------------------------------------
// Stand-ins, recorded
// ---------------------------------------------------------------------------

/** Analytics as the page would send them. */
export const events: Array<[string, Record<string, unknown> | undefined]> = [];
export const eventNames = () => events.map(([name]) => name);
/** Every value the page kept for the language switch, in order. */
export const published: unknown[] = [];
/** What the page keeps for the language switch to carry now. */
export const shared = () => w[SHARED_STATE_GLOBAL];
export const copied: string[] = [];
export const prompted: Array<[string | undefined, string | undefined]> = [];
export const printed: number[] = [];
export const downloads: Array<{ blob: Blob; name: string }> = [];
/** What the page asked the network for, and how. */
export const asked: Array<{ url: string; options: unknown }> = [];
const pending: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
export const waitingRequests = () => pending.length;

/** Lets promises the page waits on run, and the page redraw. */
export const turn = () => act(async () => { await new Promise((done) => setImmediate(done)); });

/** Answers the oldest request still waiting: with the history (or another body), with an HTTP error, or with no connection. */
export async function answerFetch(how: 'history' | 'refused' | 'offline' = 'history', body: unknown = HISTORY) {
  const next = pending.shift();
  assert.ok(next, 'no request is waiting');
  await act(async () => {
    if (how === 'offline') next.reject(new TypeError('offline'));
    else next.resolve({ ok: how === 'history', status: how === 'history' ? 200 : 503, json: () => Promise.resolve(body) });
    await new Promise((done) => setImmediate(done));
  });
  await turn();
}

const real = {
  fetch: globalThis.fetch,
  print: window.print,
  prompt: window.prompt,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
  click: window.HTMLAnchorElement.prototype.click,
};
let blobUrls = new Map<string, Blob>();

/** What the page threw and the browser reported: a test fails on any of it (checked after each test). */
export const thrown: string[] = [];
window.addEventListener('error', (e) => { thrown.push(String((e as ErrorEvent).message)); e.preventDefault(); });

/** A window property that records every value written to it, as the header's language switch would find them. */
function recordShared(initial?: unknown) {
  let value = initial;
  Object.defineProperty(window, SHARED_STATE_GLOBAL, {
    configurable: true,
    get: () => value,
    set: (v: unknown) => { value = v; published.push(v); },
  });
}

/** What the page head leaves for the island: a shared link's state, moved out of the address. */
export function arriveWith(state: unknown) {
  recordShared(state);
}

/** Puts a clipboard in the browser: one that takes the text, or one that refuses it. */
export function clipboard(works = true) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (s: string) => { copied.push(s); return works ? Promise.resolve() : Promise.reject(new Error('denied')); } },
  });
}

/** The page this one was opened from, as `document.referrer` says it. */
export function cameFrom(address: string) {
  Object.defineProperty(document, 'referrer', { configurable: true, get: () => address });
}

/** The addresses the window had, to show none was written. */
export const addressNow = () => window.location.href;
let historyLength = 0;
/** Whether the page wrote the address or the history since the test began. */
export const addressUntouched = () => window.location.href === 'https://nidhi.today/free/' && window.history.length === historyLength;

beforeEach(() => {
  thrown.length = 0;
  events.length = 0;
  published.length = 0;
  copied.length = 0;
  prompted.length = 0;
  printed.length = 0;
  downloads.length = 0;
  asked.length = 0;
  pending.length = 0;
  blobUrls = new Map();
  recordShared();
  historyLength = window.history.length;
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
  clock.install();
  globalThis.fetch = ((url: unknown, options: unknown) => {
    asked.push({ url: String(url), options });
    return new Promise<Response>((resolve, reject) => pending.push({ resolve: resolve as (v: unknown) => void, reject }));
  }) as typeof fetch;
  window.prompt = ((message?: string, value?: string) => { prompted.push([message, value]); return null; }) as typeof window.prompt;
  window.print = () => { printed.push(clock.now); };
  URL.createObjectURL = ((blob: Blob) => {
    const url = `blob:test-${blobUrls.size}`;
    blobUrls.set(url, blob);
    return url;
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const blob = blobUrls.get(this.getAttribute('href') ?? '');
    if (blob) downloads.push({ blob, name: this.download });
  };
});
afterEach(() => {
  cleanup();
  delete w[SHARED_STATE_GLOBAL];
  delete w.posthog;
  delete w.nidhiHeatmapsPaused;
  delete (navigator as unknown as Record<string, unknown>).clipboard;
  delete (document as unknown as Record<string, unknown>).referrer;
  clock.restore();
  globalThis.fetch = real.fetch;
  window.print = real.print;
  window.prompt = real.prompt;
  URL.createObjectURL = real.createObjectURL;
  URL.revokeObjectURL = real.revokeObjectURL;
  window.HTMLAnchorElement.prototype.click = real.click;
  if (window.location.href !== 'https://nidhi.today/free/') window.history.replaceState(null, '', '/free/');
  assert.deepEqual(thrown, [], 'the page threw');
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

// ---------------------------------------------------------------------------
// Mounting the page
// ---------------------------------------------------------------------------

export type PageProps = Partial<{
  strings: Strings;
  defaultCurrency: string;
  defaultCountry: string;
  countries: CountryOption[];
  initialHistory: { code: string; series: CompactSeries } | null;
  historyUrl: string;
  latestYear: number;
  numberLocale: string;
  amountLocale: string | null;
}>;

export const page = (props: PageProps = {}) => (
  <InvestOrPayOff
    strings={props.strings ?? island}
    exportStrings={t.export}
    defaultCurrency={props.defaultCurrency ?? 'EUR'}
    defaultCountry={props.defaultCountry ?? 'EMU'}
    countries={props.countries ?? COUNTRIES}
    initialHistory={'initialHistory' in props ? props.initialHistory ?? null : { code: 'EMU', series: EMU_SERIES }}
    historyUrl={props.historyUrl ?? '/data/inflation-history.json'}
    latestYear={props.latestYear ?? LATEST_YEAR}
    numberLocale={props.numberLocale ?? 'en'}
    amountLocale={props.amountLocale ?? null}
  />
);

/** Mounts the calculator as its page does (src/components/pages/InvestOrPayOffPage.astro). */
export const mount = (props: PageProps = {}) => render(page(props));

// ---------------------------------------------------------------------------
// Reading and using the page
// ---------------------------------------------------------------------------

export const all = (selector: string) => [...document.querySelectorAll(selector)] as HTMLElement[];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const none = (selector: string) => assert.equal(document.querySelectorAll(selector).length, 0, `${selector} is there`);
export const has = (selector: string) => document.querySelector(selector) !== null;

const f = island.fields;
export const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
export const boxes = {
  balance: () => box(f.balance),
  debtRate: () => box(f.debtRate),
  payment: () => box(f.payment),
  extra: () => box(f.extra),
  inflation: () => box(f.inflation),
  ownReturn: () => box(f.ownReturn),
  relief: () => box(f.relief),
  feePct: () => box(f.fee),
  gainsTax: () => box(f.gainsTax),
};
export type BoxName = keyof typeof boxes;
export const currencySelect = () => screen.getByLabelText(f.currency) as HTMLSelectElement;
export const countrySelect = () => screen.getByLabelText(f.country) as HTMLSelectElement;

/** Types into a box, replacing what is there, as one change. */
export const type = (name: BoxName, value: string) => fireEvent.change(boxes[name](), { target: { value } });
/** Types into a box and lets the page settle (a quarter second). */
export function typeAndSettle(name: BoxName, value: string) {
  type(name, value);
  clock.pass(250);
}
export const chooseCurrency = (code: string) => fireEvent.change(currencySelect(), { target: { value: code } });
export const chooseCountry = (code: string) => fireEvent.change(countrySelect(), { target: { value: code } });

/** The radio buttons of a group, by their value. */
export const radio = (group: 'returns' | 'horizon' | 'basis', value: string) => {
  const name = group === 'basis' ? 'basis' : group;
  const el = all(`input[type="radio"][value="${value}"]`).find((r) => (r as HTMLInputElement).name.endsWith(`-${name}`));
  assert.ok(el, `no ${group} ${value}`);
  return el as HTMLInputElement;
};
export const pick = (group: 'returns' | 'horizon' | 'basis', value: string) => fireEvent.click(radio(group, value));

export const more = () => one('details.iop-more:not(.iop-basis)') as HTMLDetailsElement;
/** Opens or closes "Taxes and fees" as a reader's click on its summary does. */
export function toggleMore(open: boolean) {
  const d = more();
  d.open = open;
  fireEvent(d, new window.Event('toggle'));
}

export const button = (attr: string) => one(`[data-attr="${attr}"]`) as HTMLButtonElement;
export const shareButton = () => button('free-invest-or-pay-off-share');
export const xlsxButton = () => button('free-invest-or-pay-off-export-xlsx');
export const pdfButton = () => button('free-invest-or-pay-off-export-pdf');
export const resetButton = () => one('.iop-reset') as HTMLButtonElement;
export const ariaDisabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';

/** The headline (the share of scenarios), or null when no result is shown. */
export const headline = () => document.querySelector('.iop-headline')?.textContent ?? null;
/** The notes in the results: no inflation, or a problem. */
export const resultNotes = () => text('.iop-results .tool-resultBody > .iop-note');
/** Whether the results are withheld, and the reason shown. */
export const withheld = () => one('.iop-results .tool-resultBody').classList.contains('tool-withheld');
export const reason = () => text('.iop-results .tool-resultReason');
/** What the one announcement says now. */
export const said = () => one('.iop-root > span[aria-live="polite"]').textContent;
/** The hints under the country picker. */
export const countryNote = () => text('.iop-countryNote p');
export const returnNoteText = () => text('.iop-returnNote p');

/** A downloaded file's bytes as text: the workbook is a stored zip, so its XML can be read as it is. */
export const fileText = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());

/** Everything the page sent to analytics, as one string, to search for a typed value. */
export const sentText = () => JSON.stringify(events);
