/**
 * The inflation calculator's page, for its component tests
 * (src/components/InflationParts.page*.dom.test.tsx): how the page mounts
 * the island, a small made-up history served by a stand-in `fetch`, and the
 * ways a test types, waits and reads the page. Not a test file.
 *
 * Importing it sets every test of the file up the same way: nothing shared
 * left on the window, analytics recorded in `events`, the window's timers
 * run by hand (test/windowClock.ts), and stand-ins for the clipboard, the
 * print dialog and a download, each recording what it was given.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { clock } from './windowClock.ts';
import { inflationEn } from '../src/i18n/strings/tools/inflation.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { SHARED_STATE_GLOBAL } from '../src/utils/inflation/url.ts';
import type { CompactHistory, CompactSeries } from '../src/utils/inflation/history.ts';
import InflationCalculator, { type CountryOption } from '../src/components/InflationCalculator.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { inflation: inflationEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.inflation.island;
export type Strings = typeof island;
export const w = window as unknown as Record<string, unknown>;
export { clock };

/** Fills a catalog pattern's `{placeholders}` by hand. */
export const fill = (pattern: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), pattern);

// ---------------------------------------------------------------------------
// A made-up history
// ---------------------------------------------------------------------------

/** The countries the page offers: one with a currency of the tool's, the euro area, one without, one the history file lacks. */
export const COUNTRIES: CountryOption[] = [
  { code: 'EMU', name: 'Euro area', currency: 'EUR' },
  { code: 'NOD', name: 'Nodataland', currency: null },
  { code: 'OTH', name: 'Otherland', currency: null },
  { code: 'TST', name: 'Testland', currency: 'USD' },
];

/**
 * Testland: 10% every year from 2015 to 2020, so prices rose 1.1^5 = 1.61051
 * from 2015 and 1.1^2 = 1.21 from 2018, and the average is 10%.
 * Otherland: 21% in 2019 and none in 2021, with no figure for 2020, so no unbroken run to
 * start from; its average is the square root of 1.21, less one: 10%.
 * The euro area: 1998 to 2000, 10% in 1999; its average is the cube root of 1.1, less one: 3.23%.
 */
export const HISTORY: CompactHistory = {
  updated: '2026-10-08',
  countries: {
    TST: [2015, [10, 10, 10, 10, 10, 10]],
    OTH: [2019, [21, null, 0]],
    EMU: [1998, [0, 10, 0]],
  },
};

// ---------------------------------------------------------------------------
// Stand-ins, recorded
// ---------------------------------------------------------------------------

/** Analytics as the page would send them. */
export const events: Array<[string, Record<string, unknown> | undefined]> = [];
/** The names of the events sent so far, in order. */
export const eventNames = () => events.map(([name]) => name);
/** Every value the page kept for the language switch, in order. */
export const published: unknown[] = [];
/** What the page keeps for the language switch to carry now. */
export const shared = () => w[SHARED_STATE_GLOBAL];
/** What was put on the clipboard, what the print dialog was opened for, and the files handed over as downloads. */
export const copied: string[] = [];
export const printed: number[] = [];
export const downloads: Array<{ blob: Blob; name: string }> = [];
/** What the page asked the network for, and the answers the test holds back until it lets them go. */
export const asked: Array<{ url: unknown; options: unknown }> = [];
const pending: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

/** Answers the oldest request still waiting: with the history, or with a failure. */
export async function answerFetch(how: 'history' | 'offline' | 'refused' = 'history') {
  const next = pending.shift();
  assert.ok(next, 'no request is waiting');
  await act(async () => {
    if (how === 'offline') next.reject(new TypeError('offline'));
    else next.resolve({ ok: how === 'history', status: how === 'history' ? 200 : 503, json: () => Promise.resolve(HISTORY) });
    // The page forgets a failed request a turn later, as a browser's event loop gives it.
    await new Promise((done) => setImmediate(done));
  });
}
export const waitingRequests = () => pending.length;

const real = {
  fetch: globalThis.fetch,
  print: window.print,
  prompt: window.prompt,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
  click: window.HTMLAnchorElement.prototype.click,
};
let blobUrls = new Map<string, Blob>();

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

beforeEach(() => {
  events.length = 0;
  published.length = 0;
  copied.length = 0;
  printed.length = 0;
  downloads.length = 0;
  asked.length = 0;
  pending.length = 0;
  blobUrls = new Map();
  recordShared();
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
  clock.install();
  globalThis.fetch = ((url: unknown, options: unknown) => {
    asked.push({ url, options });
    return new Promise<Response>((resolve, reject) => pending.push({ resolve: resolve as (v: unknown) => void, reject }));
  }) as typeof fetch;
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
  clock.restore();
  globalThis.fetch = real.fetch;
  window.print = real.print;
  window.prompt = real.prompt;
  URL.createObjectURL = real.createObjectURL;
  URL.revokeObjectURL = real.revokeObjectURL;
  window.HTMLAnchorElement.prototype.click = real.click;
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
  numberLocale: string;
  amountLocale: string | null;
}>;

export const page = (props: PageProps = {}) => (
  <InflationCalculator
    strings={props.strings ?? island}
    exportStrings={t.export}
    defaultCurrency={props.defaultCurrency ?? 'EUR'}
    defaultCountry={props.defaultCountry ?? ''}
    countries={props.countries ?? COUNTRIES}
    initialHistory={props.initialHistory ?? null}
    historyUrl={props.historyUrl ?? '/data/inflation-history.json'}
    numberLocale={props.numberLocale ?? 'en'}
    amountLocale={props.amountLocale ?? null}
  />
);

/** Mounts the calculator as its page does (src/components/pages/InflationCalculatorPage.astro). */
export const mount = (props: PageProps = {}) => render(page(props));

/** The history arrives: from the network if the page is waiting on it, or from the copy the page already holds. */
export async function historyArrives() {
  if (pending.length > 0) await answerFetch('history');
  else await turn();
}

/** Lets promises the page waits on run, and the page redraw. */
export const turn = () => act(async () => { await new Promise((done) => setImmediate(done)); });

/** Lets typing settle: a quarter of a second of the page's own time. */
export const settle = (ms = 250) => clock.pass(ms);

// ---------------------------------------------------------------------------
// Reading and using the page
// ---------------------------------------------------------------------------

export const all = (selector: string) => [...document.querySelectorAll(selector)];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const none = (selector: string) => assert.equal(document.querySelectorAll(selector).length, 0, `${selector} is there`);

export const tab = (mode: keyof Strings['tabs']) => screen.getByRole('tab', { name: island.tabs[mode] });
export const selectedTab = () => screen.getAllByRole('tab').filter((el) => el.getAttribute('aria-selected') === 'true').map((el) => el.textContent);
export const box = (label: string) => screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement;
export const choice = (label: string) => screen.getByLabelText(label, { selector: 'select' }) as HTMLSelectElement;
export const type = (label: string, value: string) => fireEvent.change(box(label), { target: { value } });
export const choose = (label: string, value: string) => fireEvent.change(choice(label), { target: { value } });
export const headline = () => one('.ifc-headline').textContent;
export const sentences = () => text('.ifc-answer > p.ifc-sentence, .ifc-answer > p.ifc-note');
export const question = () => one('.ifc-question').textContent;
export const example = () => one('.ifc-example').textContent;
/** Whether the answer is withheld, and the reason shown for it. */
export const withheld = () => one('.ifc-results .tool-resultBody').classList.contains('tool-withheld');
export const reason = () => text('.ifc-results .tool-resultReason');
/** What a screen reader was last told of a new answer. */
export const said = () => one('.ifc-results > span.ifc-srOnly').textContent;
export const shareButton = () => one('[data-attr="free-inflation-share"]');
export const xlsxButton = () => one('[data-attr="free-inflation-export-xlsx"]');
export const pdfButton = () => one('[data-attr="free-inflation-export-pdf"]');
/** What the copy button says to a reader: its other label is kept only for its width. */
export const copyLabel = () => one('[data-attr="free-inflation-share"] .tool-swapLabel > span:first-child').textContent;
export const disabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';
/** The error under a box, or null. */
export const errorOf = (label: string) => {
  const id = box(label).getAttribute('aria-errormessage');
  return id ? document.getElementById(id)?.textContent ?? null : null;
};
/** The printed report's answer lines, or null when there is no report. */
export const reportLines = () => (document.querySelector('.tool-report') ? [...one('.tool-report > section.tool-reportBlock').querySelectorAll('p')].map((p) => p.textContent ?? '') : null);
/** The printed report's "What you entered" table, row by row. */
export const reportEntered = () => [...all('.tool-report table')[0].querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => c.textContent ?? ''));
/** The method the printed report gives. */
export const reportMethod = () => text('.tool-report > section.tool-reportBlock:last-of-type li');
/** A downloaded file's bytes as text: the workbook is a stored zip, so its XML can be read as it is. */
export const fileText = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());
