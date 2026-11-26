/**
 * The net worth calculator's page, for its component tests
 * (src/components/NetWorthParts.page*.dom.test.tsx): how the page mounts the
 * island, the exchange rates served by a stand-in `fetch` that the test
 * answers by hand, and the ways a test types, waits and reads the page. Not a
 * test file.
 *
 * Importing it sets every test of the file up the same way: nothing shared
 * left on the window, analytics recorded in `events`, the window's timers run
 * by hand (test/windowClock.ts), animation frames run by hand, the rates
 * request's time limit run by hand, and stand-ins for the clipboard, the
 * print dialog and a download, each recording what it was given.
 *
 * The page keeps no cache between mounts (each mount asks for its rates
 * afresh), so tests in one file do not depend on their order.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clock } from './windowClock.ts';
import { multiCurrencyNetWorthEn } from '../src/i18n/strings/tools/multiCurrencyNetWorth.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { SHARED_STATE_GLOBAL } from '../src/utils/multi-currency-net-worth/url.ts';
import MultiCurrencyNetWorth from '../src/components/MultiCurrencyNetWorth.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { multiCurrencyNetWorth: multiCurrencyNetWorthEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.multiCurrencyNetWorth.island;
export type Strings = typeof island;
export const w = window as unknown as Record<string, unknown>;
export { clock };

/** Fills a catalog pattern's `{placeholders}` by hand. */
export const fill = (pattern: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), pattern);

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
export const printed: number[] = [];
export const downloads: Array<{ blob: Blob; name: string }> = [];

/** One rates request: where it went, whether it was given up on, and its answer, held until the test lets it go. */
interface Request {
  url: string;
  signal: AbortSignal;
  respond: (res: unknown) => void;
  fail: (err: unknown) => void;
  settled: boolean;
}
export const requests: Request[] = [];
export const askedFor = () => requests.map((r) => r.url);

/** A Frankfurter v2 answer: one row per quote, in units per one of `base`. */
export const ratesBody = (base: string, quotes: Record<string, number>) =>
  Object.entries(quotes).map(([quote, rate]) => ({ date: '2026-11-20', base, quote, rate }));

/** Lets promises the page waits on run, and the page redraw. */
export const turn = () => act(async () => { await new Promise((done) => setImmediate(done)); });

/** Answers a request still waiting (the oldest by default) with a body, or with an HTTP status and no body. */
export async function answer(body: unknown, { status = 200, index }: { status?: number; index?: number } = {}) {
  const req = index === undefined ? requests.find((r) => !r.settled) : requests[index];
  assert.ok(req && !req.settled, 'no request is waiting');
  req.settled = true;
  await act(async () => {
    req.respond({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
    await new Promise((done) => setImmediate(done));
  });
}

/**
 * Answers the oldest waiting request with its headers only: its body comes
 * when the returned function is called, so a test can change the page in
 * between.
 */
export async function answerHeadersOnly() {
  const req = requests.find((r) => !r.settled);
  assert.ok(req, 'no request is waiting');
  req.settled = true;
  let release: (body: unknown) => void = () => {};
  const body = new Promise((done) => { release = done; });
  await act(async () => {
    req.respond({ ok: true, status: 200, json: () => body });
    await new Promise((done) => setImmediate(done));
  });
  return async (data: unknown) => {
    await act(async () => {
      release(data);
      await new Promise((done) => setImmediate(done));
    });
  };
}

/** The oldest waiting request fails: no connection, or a body that is not JSON. */
export async function failRequest(how: 'offline' | 'garbled' = 'offline') {
  const req = requests.find((r) => !r.settled);
  assert.ok(req, 'no request is waiting');
  req.settled = true;
  await act(async () => {
    if (how === 'offline') req.fail(new TypeError('Failed to fetch https://example.invalid/secret'));
    else req.respond({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')) });
    await new Promise((done) => setImmediate(done));
  });
}

// The rates request's time limit, on the page's own (Node) timers: captured
// here so a test can let it run out without waiting fifteen seconds.
const realSet = globalThis.setTimeout;
const realClear = globalThis.clearTimeout;
const limits = new Map<unknown, () => void>();
let nextLimit = 0;
/** The time limit of every rates request still running passes. */
export async function timeLimitPasses() {
  await act(async () => {
    const due = [...limits.values()];
    limits.clear();
    for (const run of due) run();
    await new Promise((done) => setImmediate(done));
  });
  await turn();
}

// Animation frames, run by hand.
const realFrame = globalThis.requestAnimationFrame;
const frames: Array<() => void> = [];
/** The next animation frame comes. */
export const frame = () => act(() => { for (const run of frames.splice(0)) run(); });

const real = {
  fetch: globalThis.fetch,
  print: window.print,
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

beforeEach(() => {
  thrown.length = 0;
  events.length = 0;
  published.length = 0;
  copied.length = 0;
  printed.length = 0;
  downloads.length = 0;
  requests.length = 0;
  frames.length = 0;
  limits.clear();
  blobUrls = new Map();
  recordShared();
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
  clock.install();
  globalThis.fetch = ((url: unknown, options?: { signal?: AbortSignal }) => new Promise<Response>((resolve, reject) => {
    const signal = options?.signal ?? new AbortController().signal;
    const req: Request = { url: String(url), signal, respond: resolve as (v: unknown) => void, fail: reject, settled: false };
    requests.push(req);
    // As a browser does: a request given up on before it answered fails.
    signal.addEventListener('abort', () => {
      if (req.settled) return;
      req.settled = true;
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  })) as typeof fetch;
  globalThis.setTimeout = ((run: () => void, ms?: number, ...rest: unknown[]) => {
    if (ms !== 15_000) return realSet(run, ms, ...rest);
    const id = { limit: nextLimit++ };
    limits.set(id, run);
    return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: unknown) => {
    if (limits.delete(id)) return;
    realClear(id as Parameters<typeof clearTimeout>[0]);
  }) as typeof clearTimeout;
  globalThis.requestAnimationFrame = ((run: () => void) => { frames.push(run); return frames.length; }) as typeof requestAnimationFrame;
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
  delete (navigator as unknown as Record<string, unknown>).clipboard;
  delete (document as unknown as Record<string, unknown>).referrer;
  clock.restore();
  globalThis.fetch = real.fetch;
  globalThis.setTimeout = realSet;
  globalThis.clearTimeout = realClear;
  globalThis.requestAnimationFrame = realFrame;
  window.print = real.print;
  URL.createObjectURL = real.createObjectURL;
  URL.revokeObjectURL = real.revokeObjectURL;
  window.HTMLAnchorElement.prototype.click = real.click;
  if (window.location.search) window.history.replaceState(null, '', '/free/');
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
  numberLocale: string;
  amountLocale: string | null;
}>;

export const page = (props: PageProps = {}) => (
  <MultiCurrencyNetWorth
    strings={props.strings ?? island}
    exportStrings={t.export}
    defaultCurrency={props.defaultCurrency ?? 'EUR'}
    numberLocale={props.numberLocale ?? 'en'}
    amountLocale={props.amountLocale ?? null}
  />
);

/** Mounts the calculator as its page does (src/components/pages/MultiCurrencyNetWorthPage.astro). */
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

const r = island.row;
export const nameBox = (row: number, total: number) => screen.getByLabelText(fill(r.nameAria, { index: row, total })) as HTMLInputElement;
export const valueBox = (row: number) => screen.getByLabelText(fill(r.valueAria, { index: row })) as HTMLInputElement;
export const currencyOf = (row: number) => screen.getByLabelText(fill(r.currencyAria, { index: row })) as HTMLSelectElement;
export const typeOf = (row: number) => screen.getByLabelText(fill(r.typeAria, { index: row })) as HTMLSelectElement;
export const spending = () => screen.getByLabelText(island.toolbar.currencyLabel) as HTMLSelectElement;

/** The rows as the form holds them: name, value, currency, type. */
export const formRows = () => all('.mcnw-tableBody .mcnw-tableRow').map((row) => {
  const [name, value] = [...row.querySelectorAll('input')].map((i) => i.value);
  const [currency, type] = [...row.querySelectorAll('select')].map((s) => s.value);
  return [name, value, currency, type];
});

/** Types into a row: its name, its amount, and picks its currency and type, each only where given. */
export function fillRow(row: number, { name, value, currency, type }: Partial<Record<'name' | 'value' | 'currency' | 'type', string>>) {
  const total = formRows().length;
  if (name !== undefined) fireEvent.change(nameBox(row, total), { target: { value: name } });
  if (value !== undefined) fireEvent.change(valueBox(row), { target: { value } });
  if (currency !== undefined) fireEvent.change(currencyOf(row), { target: { value: currency } });
  if (type !== undefined) fireEvent.change(typeOf(row), { target: { value: type } });
}
export const chooseSpending = (code: string) => fireEvent.change(spending(), { target: { value: code } });

export const button = (attr: string) => one(`[data-attr="${attr}"]`) as HTMLButtonElement;
export const addButton = () => button('mcnw-asset-add');
export const resetButton = () => button('mcnw-reset');
export const shareButton = () => button('mcnw-share-open');
export const xlsxButton = () => button('mcnw-export-xlsx');
export const pdfButton = () => button('mcnw-export-pdf');
export const csvDownload = () => button('mcnw-csv-download');
export const removeButtons = () => all('[data-attr="mcnw-asset-remove"]') as HTMLButtonElement[];
export const exampleButton = () => document.querySelector('.mcnw-exampleBtn') as HTMLButtonElement | null;
export const clearExampleButton = () => document.querySelector('.mcnw-exampleNote .mcnw-linkBtn') as HTMLButtonElement | null;
export const ariaDisabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';

/** The headline total as shown, or null when there is none. */
export const total = () => document.querySelector('.mcnw-results .mcnw-total .mcnw-totalValue')?.textContent ?? null;
/** The banners above the results: class and text, in page order. */
export const banners = () => all('.mcnw-root > .mcnw-banner').map((el) => [el.className, el.getAttribute('role'), el.textContent]);
/** The row count beside the table's heading. */
export const itemCount = () => one('.mcnw-rowCount').textContent;
/** The CSV fold's alerts: their titles and their lines. */
export const csvAlerts = () => all('.mcnw-csvErrors').map((el) => [el.getAttribute('role'), el.querySelector('.mcnw-csvErrorsTitle')?.textContent, ...[...el.querySelectorAll('li')].map((li) => li.textContent)]);
export const fold = () => one('details.mcnw-csvFold') as HTMLDetailsElement;
export const fileInput = () => one('.mcnw-csvFoldBody input[type="file"]') as HTMLInputElement;

/** Chooses a CSV file in the upload box and lets the browser read it. */
export async function upload(content: string, name = 'holdings.csv') {
  const file = new window.File([content], name, { type: 'text/csv' });
  await userEvent.setup({ delay: null }).upload(fileInput(), file);
  // The browser reads a file over a few tasks.
  for (let i = 0; i < 6; i++) await turn();
}

/** A downloaded file's bytes as text: the workbook is a stored zip, so its XML can be read as it is. */
export const fileText = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());

/** Everything the page sent to analytics, as one string, to search for a typed value. */
export const sentText = () => JSON.stringify(events);
