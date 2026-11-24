/**
 * The Monte Carlo simulator's page, for its component tests
 * (src/components/MonteCarloSimulator.*.dom.test.tsx): how the page mounts
 * the island, the strings it gives it, the starting result, and the ways a
 * test types, waits and reads the chart. Not a test file, and the only thing
 * those test files share: one test file never imports another.
 *
 * Importing it sets every test of the file up the same way: nothing shared
 * left on the window, analytics recorded in `events`, and the window's timers
 * run by hand. A test never waits on the real clock: `settle` moves the
 * page's own time on, so the pause after typing, a large run's start and an
 * announcement's delay pass at once, and nothing fires while a test is still
 * checking what shows before it.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../src/i18n/index.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, defaultState, encodeState, type ToolState } from '../src/utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../src/utils/monte-carlo/math.ts';
import { formatAmount as formatAmountIn } from '../src/utils/shared/formatAmount.ts';
import MonteCarloSimulator from '../src/components/MonteCarloSimulator.tsx';

export const t = dict('en').tools;
export const island = t.monteCarlo.island;
export const w = window as unknown as Record<string, unknown>;
/** What the page keeps for the language switch to carry. */
export const shared = () => w[SHARED_STATE_GLOBAL];
/** The starting plan's result, as the page works it out for the island. */
export const STARTING_RESULT = simulate(defaultState('EUR'));

// ---------------------------------------------------------------------------
// The window's timers, run by hand
// ---------------------------------------------------------------------------

const realTimers = { set: window.setTimeout, clear: window.clearTimeout };
const clock = { now: 0, next: 1, timers: new Map<number, { at: number; run: () => void }>() };

function installClock() {
  clock.now = 0;
  clock.timers.clear();
  window.setTimeout = ((run: () => void, ms = 0) => {
    clock.timers.set(clock.next, { at: clock.now + ms, run });
    return clock.next++;
  }) as typeof window.setTimeout;
  window.clearTimeout = ((id: number) => { clock.timers.delete(id); }) as typeof window.clearTimeout;
}

function restoreClock() {
  window.setTimeout = realTimers.set;
  window.clearTimeout = realTimers.clear;
  clock.timers.clear();
}

/**
 * Lets `ms` of the page's time pass (the typing settles and the result
 * follows): every timer that falls due runs, in order, and the page is
 * redrawn once at the end, as it is after a real wait inside `act`. A timer
 * the redraw starts waits for the next call.
 */
export const settle = (ms = 320) => act(async () => {
  const until = clock.now + ms;
  for (;;) {
    const due = [...clock.timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    clock.timers.delete(due[0]);
    clock.now = due[1].at;
    due[1].run();
  }
  clock.now = until;
});

// ---------------------------------------------------------------------------
// Every test: a clean window, analytics recorded
// ---------------------------------------------------------------------------

/** Analytics as the page would send them, recorded. */
export const events: Array<[string, Record<string, unknown> | undefined]> = [];

beforeEach(() => {
  delete w[SHARED_STATE_GLOBAL];
  events.length = 0;
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
  installClock();
});
afterEach(() => {
  cleanup();
  delete w[SHARED_STATE_GLOBAL];
  delete w.posthog;
  restoreClock();
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

// ---------------------------------------------------------------------------
// Mounting the page
// ---------------------------------------------------------------------------

/** What a page in another language or style gives the island. */
export type PageProps = Partial<{ amountLocale: string | null; numberLocale: string; defaultCurrency: string; netWorthHref: string; initialResult: SimulationResult }>;

/** Mounts the simulator as a page in another language or style would. */
export function mountWith(props: PageProps = {}) {
  return render(
    <MonteCarloSimulator
      strings={island}
      exportStrings={t.export}
      netWorthHref={props.netWorthHref ?? '/free/multi-currency-net-worth/'}
      defaultCurrency={props.defaultCurrency ?? 'EUR'}
      amountLocale={props.amountLocale ?? null}
      numberLocale={props.numberLocale ?? 'en'}
      initialResult={props.initialResult ?? STARTING_RESULT}
    />,
  );
}

/** As the English page renders it (src/components/pages/MonteCarloPage.astro). */
export const mount = () => mountWith();

/** Opens a shared plan: what the page head leaves for the island to read. */
export function openPlan(change: Partial<ToolState>, props?: PageProps) {
  const plan = { ...DEFAULTS, ...change };
  w[SHARED_STATE_GLOBAL] = encodeState(plan);
  return { plan, ...mountWith(props) };
}

/** Draws a plan and waits for it. */
export async function drawPlan(change: Partial<ToolState>, props?: PageProps) {
  const { plan, unmount } = openPlan(change, props);
  await settle(20);
  const exact = simulate(plan);
  return { plan, unmount, exact, worded: roundedResult(exact) };
}

/** A plan of withdrawals only, from half a million, over 100 paths unless said. */
export const drawdown = (withdrawal: number, change: Partial<ToolState> = {}): Partial<ToolState> => ({ saveYears: 0, monthly: 0, start: 500_000, withdrawal, withdrawYears: 30, paths: 100, ...change });

// ---------------------------------------------------------------------------
// Reading the page
// ---------------------------------------------------------------------------

export const results = () => document.querySelector('.mcs-results') as HTMLElement;
export const heading = () => document.getElementById('mcs-results-h') as HTMLElement;
export const text = (selector: string) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const radio = (value: string) => screen.getAllByRole('radio').find((r) => (r as HTMLInputElement).value === value) as HTMLInputElement;
export const money = (v: number, code = 'EUR', locale: string | null = null) => formatAmountIn(v, code, false, locale);
export const describedBy = (box: HTMLElement) => (box.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);

/**
 * Waits for a large run to finish on the page, up to ten seconds of the
 * page's time: it fails if the page still says it is running then.
 */
export const runDone = async () => {
  for (let waited = 0; waited < 10_000 && results().getAttribute('aria-busy') !== 'false'; waited += 10) await settle(10);
  assert.equal(results().getAttribute('aria-busy'), 'false');
  await settle(50);
};

// ---------------------------------------------------------------------------
// Typing and choosing
// ---------------------------------------------------------------------------

/** A reader at the keyboard and mouse, with no pause between keystrokes. */
export const reader = () => userEvent.setup({ delay: null });

/** Types `text` into the "invested today" box, replacing what is there, and leaves the box. */
export async function typeStart(text: string) {
  const user = reader();
  const box = screen.getByLabelText(island.fields.start);
  await user.clear(box);
  await user.type(box, text);
  await user.tab();
  return box;
}

/** Types into the box labelled `label`, replacing what is there, and leaves it. */
export async function typeInto(label: string, value: string) {
  const user = reader();
  const box = screen.getByLabelText(label);
  await user.clear(box);
  if (value) await user.paste(value);
  await user.tab();
  return box;
}

/** The same, and lets the plan settle. */
export async function retype(label: string, value: string) {
  const box = await typeInto(label, value);
  await settle();
  return box;
}

/** Chooses how many paths to run, and lets the plan settle. */
export async function choosePaths(n: string) {
  const user = reader();
  await user.selectOptions(screen.getByLabelText(island.settings.pathsLabel), n);
  await settle();
}

// ---------------------------------------------------------------------------
// The chart: what is drawn where. jsdom lays nothing out, so text is placed
// by its estimated width, as on a first drawing in the browser.
// ---------------------------------------------------------------------------

export type Pt = [number, number];
export const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
export const svg = () => one('svg.mcs-chart') as unknown as SVGSVGElement;
export const viewBox = () => (svg().getAttribute('viewBox') ?? '').split(' ').map(Number);
export function plotBox() {
  const r = one('.mcs-plotBg');
  const x = num(r, 'x'), y = num(r, 'y'), w = num(r, 'width'), h = num(r, 'height');
  return { x, y, w, h, right: x + w, bottom: y + h };
}
/** The points of a drawn line, in order. */
export const points = (d: string): Pt[] => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
export const pathOf = (selector: string) => points(one(selector).getAttribute('d') ?? '');
/** What one unit of the axis heading stands for. */
export function axisUnit(): number {
  const heading = one('.tool-chartUnit').textContent ?? '';
  return heading.includes('billions') ? 1e9 : heading.includes('millions') ? 1e6 : heading.includes('thousands') ? 1e3 : 1;
}
/** The value at the top gridline, as its label says. */
export function axisTop(): number {
  const labels = text('.mcs-axisAmount:not([data-sample])').map((s) => Number(s.replace(/,/g, '')));
  return Math.max(...labels) * axisUnit();
}
/** Where a value is drawn: the axis read the way a reader reads it. */
export function heightOf(v: number): number {
  const p = plotBox();
  return p.y + (1 - Math.min(v, axisTop()) / axisTop()) * p.h;
}
export const near = (a: number, b: number, tol = 0.06, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b}`);

/** Presses a key on the chart. */
export const pressOnChart = (key: string) => fireEvent.keyDown(one('.mcs-chartBox'), { key });
export const yearLabels = () => text('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');

// ---------------------------------------------------------------------------
// Measurement stand-ins: a phone's width, the reader's text size
// ---------------------------------------------------------------------------

/** A phone's width, as the page asks for it, for the length of `run`. */
export async function onPhone(run: (changes: { listeners: Array<() => void>; removed: number }) => Promise<void>) {
  const real = window.matchMedia;
  const changes = { listeners: [] as Array<() => void>, removed: 0 };
  window.matchMedia = ((query: string) => ({
    matches: query === '(width < 640px)', media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener: (type: string, f: () => void) => { if (type === 'change') changes.listeners.push(f); },
    removeEventListener: (type: string) => { if (type === 'change') changes.removed++; },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    await run(changes);
  } finally {
    window.matchMedia = real;
  }
}

/** The reader's text size, as the root font size, with the chart shown at its own width, for the length of `run`. */
export async function atTextSize(px: number, run: () => Promise<void>) {
  const html = document.documentElement;
  const realRect = window.SVGElement.prototype.getBoundingClientRect;
  html.style.fontSize = `${px}px`;
  window.SVGElement.prototype.getBoundingClientRect = function (this: SVGElement) {
    const width = Number((this.getAttribute('viewBox') ?? '0 0 0').split(' ')[2]);
    return { left: 0, top: 0, width, height: 300, right: width, bottom: 300, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
  try {
    await run();
  } finally {
    html.style.fontSize = '';
    window.SVGElement.prototype.getBoundingClientRect = realRect;
  }
}
