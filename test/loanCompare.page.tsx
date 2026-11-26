/**
 * The loan comparison's page, for its component tests
 * (src/components/LoanCompare.page-*.dom.test.tsx): how the page mounts the
 * island, and the ways a test types, clicks and reads it. Not a test file.
 *
 * Importing it sets every test of the file up the same way: nothing shared
 * left on the window, analytics recorded in `events`, the window's timers run
 * by hand (test/windowClock.ts), and stand-ins for the clipboard, the prompt,
 * the print dialog and a download, each recording what it was given. A test
 * in which the page threw fails.
 *
 * The page reads a shared link from the window property ToolStateGuard
 * leaves (`arriveWith`), never from the address, and a test checks that the
 * address was not written (`addressUntouched`).
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { clock } from './windowClock.ts';
import { loanComparisonEn } from '../src/i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { SHARED_STATE_GLOBAL, encodeToQueryString, makeAddedVendor, defaultGlobalState, type GlobalState, type VendorInput } from '../src/utils/loan/url.ts';
import LoanCompare from '../src/components/LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.loanComparison.island;
export const w = window as unknown as Record<string, unknown>;
export { clock };

/** Fills a catalog pattern's `{placeholders}` by hand. */
export const fill = (pattern: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), pattern);

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** An offer as the page's "Add" makes it for slot `i`, with `patch` typed over it. */
export const offer = (i: number, patch: Partial<VendorInput> = {}): VendorInput => ({ ...makeAddedVendor(i), ...patch });

/** A share link's state (what follows the `#`) for these offers and settings. */
export const link = (vendors: VendorInput[], global: Partial<GlobalState> = {}) =>
  encodeToQueryString(vendors, { ...defaultGlobalState('EUR'), ...global });

/** The address a copied link has, for this state. */
export const shareAddress = (state: string) =>
  `https://nidhi.today/free/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=loan_comparison#${state}`;

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

const real = {
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

let historyLength = 0;
/** Whether the page wrote the address or the history since the test began. */
export const addressUntouched = () => window.location.pathname === '/free/' && window.location.hash === '' && window.history.length === historyLength;

beforeEach(() => {
  thrown.length = 0;
  events.length = 0;
  published.length = 0;
  copied.length = 0;
  prompted.length = 0;
  printed.length = 0;
  downloads.length = 0;
  blobUrls = new Map();
  recordShared();
  historyLength = window.history.length;
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
  clock.install();
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
  delete (navigator as unknown as Record<string, unknown>).clipboard;
  delete (document as unknown as Record<string, unknown>).referrer;
  clock.restore();
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

export type PageProps = Partial<{ strings: typeof island; defaultCurrency: string; amountLocale: string | null }>;

export const page = (props: PageProps = {}) => (
  <LoanCompare
    strings={props.strings ?? island}
    exportStrings={t.export}
    defaultCurrency={props.defaultCurrency ?? 'EUR'}
    numberLocale="en"
    amountLocale={props.amountLocale ?? null}
  />
);

/** Mounts the comparison as the English page does (src/components/pages/LoanComparisonPage.astro). */
export const mount = (props: PageProps = {}) => render(page(props));

// ---------------------------------------------------------------------------
// Reading and using the page
// ---------------------------------------------------------------------------

export const all = (selector: string, within: ParentNode = document) => [...within.querySelectorAll(selector)] as HTMLElement[];
export const one = (selector: string, within: ParentNode = document) => {
  const el = within.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const has = (selector: string) => document.querySelector(selector) !== null;
export const byId = (id: string | null) => (id ? document.getElementById(id) : null);

/** The offer cards, in order. */
export const cards = () => all('.lc-grid > article.lc-card');
/** The phone buttons that pick a card (not "+ Add"). */
export const phoneTabs = () => all('.lc-vendorTabs > .lc-vendorTab');
/** Which offer the phone shows: the pressed button and the card marked active, which must agree. */
export function shownOffer(): number {
  const pressed = phoneTabs().map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i : -1)).filter((i) => i >= 0);
  const active = cards().map((c, i) => (c.classList.contains('lc-cardActive') ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(active, pressed, 'the pressed button and the active card differ');
  assert.equal(pressed.length, 1, 'not one offer shown');
  return pressed[0];
}
/** What each card's lender box holds. */
export const names = () => cards().map((c) => (box(c, island.card.name) as HTMLInputElement).value);

/** A box in a card, by the start of its label. */
export function box(card: HTMLElement, label: string): HTMLInputElement {
  const l = all('label[for]', card).find((el) => (el.textContent ?? '').trim().startsWith(label));
  assert.ok(l, `no box ${label}`);
  const input = byId(l.getAttribute('for'));
  assert.ok(input, `no box for ${label}`);
  return input as HTMLInputElement;
}
/** Types into a box of offer `i`, replacing what is there, as one change. */
export const type = (i: number, label: string, value: string) => fireEvent.change(box(cards()[i], label), { target: { value } });
export const c = island.card;

export const button = (attr: string) => one(`[data-attr="${attr}"]`) as HTMLButtonElement;
export const shareButton = () => button('lc-share-copy');
export const xlsxButton = () => button('lc-export-xlsx');
export const pdfButton = () => button('lc-export-pdf');
export const ariaDisabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';
export const currencySelect = () => one('.lc-currencyField select') as HTMLSelectElement;
export const chooseCurrency = (code: string) => fireEvent.change(currencySelect(), { target: { value: code } });

/** Whether the comparison is held back, with the cards' results still shown. */
export const withheld = () => one('.lc-deltaSection .tool-resultBody').classList.contains('tool-withheld');
/** What the one announcement says now. */
export const said = () => one('.lc-root > span[aria-live="polite"]').textContent;
/** The offer the split chart follows, as its caption names it. */
export const splitFollows = () => one('.lc-splitCaption strong').textContent;
/** The share button's visible words. */
export const shareLabel = () => one('.tool-swapLabel > span:first-child', shareButton()).textContent;

/** The amount a card shows on a result row, and the length it is drawn at. */
export function rowAmount(card: HTMLElement, label: string): { text: string; length: number } {
  const dt = all('dt.lc-resultLabel', card).find((el) => (el.textContent ?? '').startsWith(label));
  assert.ok(dt, `no row ${label}`);
  const amt = one('.amt', dt.parentElement as HTMLElement);
  return { text: amt.textContent ?? '', length: Number(amt.style.getPropertyValue('--amt-len')) };
}

/** A downloaded file's bytes as text: the workbook is a stored zip, so its XML can be read as it is. */
export const fileText = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());

/** Everything the page sent to analytics, as one string, to search for a typed value. */
export const sentText = () => JSON.stringify(events);
