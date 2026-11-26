/**
 * The Monte Carlo simulator's chart, mounted by itself for the tests of its
 * layout (src/components/MonteCarloParts.Chart.layout.dom.test.tsx): the
 * settings the simulator wraps it in, plans worked out for real over a few
 * paths, the ways a test reads what is drawn where, and stand-ins for what
 * jsdom does not lay out (the screen's width, the reader's text size, the
 * width of drawn text). Not a test file.
 *
 * Importing it clears the page and puts every stand-in back after each test.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
// The English catalog by itself: the other languages' catalogs are not drawn here.
import { en } from '../src/i18n/strings/en.ts';
import { DEFAULTS, type ToolState } from '../src/utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../src/utils/monte-carlo/math.ts';
import { formatAmount as formatAmountIn } from '../src/utils/shared/formatAmount.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { ChartWordsContext } from '../src/components/ChartAmounts.tsx';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { Chart } from '../src/components/MonteCarloSimulator.tsx';

export const t = en.tools;
export const island = t.monteCarlo.island;
export type Strings = typeof island;

// ---------------------------------------------------------------------------
// Stand-ins, put back after every test
// ---------------------------------------------------------------------------

const real = {
  matchMedia: window.matchMedia,
  rect: window.SVGElement.prototype.getBoundingClientRect,
  getBBox: (window.SVGElement.prototype as unknown as Record<string, unknown>).getBBox,
};

afterEach(() => {
  cleanup();
  window.matchMedia = real.matchMedia;
  window.SVGElement.prototype.getBoundingClientRect = real.rect;
  (window.SVGElement.prototype as unknown as Record<string, unknown>).getBBox = real.getBBox;
  document.documentElement.style.fontSize = '';
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

/** A phone's width, as the chart asks for it, until the test ends. */
export function onPhone() {
  window.matchMedia = ((query: string) => ({
    matches: query === '(width < 640px)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * The reader's text size (the root font size), with the drawing shown
 * `shown` times its own width, starting `left` px from the window's edge,
 * until the test ends. A drawing shown at its own width draws one rem as
 * `px` units.
 */
export function atTextSize(px: number, { shown = 1, left = 0 } = {}) {
  document.documentElement.style.fontSize = `${px}px`;
  window.SVGElement.prototype.getBoundingClientRect = function (this: SVGElement) {
    const width = Number((this.getAttribute('viewBox') ?? '0 0 0').split(' ')[2]) * shown;
    return { left, top: 0, width, height: 300, right: left + width, bottom: 300, x: left, y: 0, toJSON() {} } as DOMRect;
  };
}

/**
 * The width the browser draws each piece of chart text at, by the class it
 * is drawn with and its words, until the test ends. jsdom measures nothing,
 * so without this every width is the estimate from the text's length.
 */
export function textDrawnAs(width: (cls: string, words: string) => number) {
  (window.SVGElement.prototype as unknown as Record<string, unknown>).getBBox = function (this: SVGElement) {
    return { x: 0, y: 0, height: 10, width: width(this.getAttribute('class') ?? '', this.textContent ?? '') };
  };
}

// ---------------------------------------------------------------------------
// Drawing a plan's chart
// ---------------------------------------------------------------------------

export type Page = Partial<{ amountLocale: string | null; numberLocale: string; strings: Strings; code: string }>;

/** Draws a chart from results as given, inside the settings the simulator wraps it in. */
export function drawResult(plan: ToolState, exact: SimulationResult, worded: SimulationResult, page: Page = {}) {
  return render(
    <AmountLocaleContext.Provider value={page.amountLocale ?? null}>
      <ChartWordsContext.Provider value={t.export.chart}>
        <NumberLocaleContext.Provider value={page.numberLocale ?? 'en'}>
          <Chart result={exact} worded={worded} state={plan} code={page.code ?? plan.currency} strings={page.strings ?? island} />
        </NumberLocaleContext.Provider>
      </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>,
  );
}

/** Works a plan out over 100 paths (unless it says otherwise) and draws its chart, as the results panel does. */
export function drawChart(change: Partial<ToolState> = {}, page: Page = {}) {
  const plan: ToolState = { ...DEFAULTS, currency: 'EUR', paths: 100, ...change };
  const exact = simulate(plan);
  const worded = roundedResult(exact);
  return { plan, exact, worded, ...drawResult(plan, exact, worded, page) };
}

/** Takes the chart off the page, so a test can draw another. */
export const clear = () => cleanup();

/** The same chart with other words on it. */
export const withChartWords = (words: Partial<Strings['chart']>): Strings => ({ ...island, chart: { ...island.chart, ...words } });

// ---------------------------------------------------------------------------
// Reading the drawing
// ---------------------------------------------------------------------------

export const all = (selector: string) => [...document.querySelectorAll(selector)];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
export const money = (v: number, code = 'EUR', locale: string | null = null) => formatAmountIn(v, code, false, locale);
export const near = (a: number, b: number, tol = 0.051, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b}`);
/** To a tenth of a drawing unit, as the chart places its text. */
export const tenth = (n: number) => Math.round(n * 10) / 10;

/** The drawing's width and height, in its own units. */
export function drawing() {
  const [, , W, H] = (one('svg.mcs-chart').getAttribute('viewBox') ?? '').split(' ').map(Number);
  return { W, H };
}
/** The plot: the box the lines are drawn in. */
export function plot() {
  const r = one('.mcs-plotBg');
  const x = num(r, 'x'), y = num(r, 'y'), w = num(r, 'width'), h = num(r, 'height');
  return { x, y, w, h, right: x + w, bottom: y + h };
}
/** The gridlines across the plot that carry an amount, from the bottom up. */
export const amountLines = () => all('line.mcs-grid, line.mcs-axisLine').filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
/** The lighter lines between them. */
export const minorAmountLines = () => all('line.mcs-gridMinor').filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
/** Where the lighter lines between labelled years are drawn. */
export const minorYearLines = () => all('line.mcs-gridMinor').filter((l) => l.getAttribute('x1') === l.getAttribute('x2')).map((l) => num(l, 'x1'));
/** The amounts written on the gridlines, as drawn. */
export const amountLabels = () => text('.mcs-axisAmount:not([data-sample])');
/** The heading that names the unit those amounts are counted in. */
export const unitHeading = () => one('.tool-chartUnit').textContent;
/** The year labels under the plot. */
export const yearLabelEls = () => all('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');
export const yearLabels = () => yearLabelEls().map((el) => el.textContent ?? '');
/** The axis title under the years: its text element and its lines. */
export const axisTitle = () => one('text.mcs-axisTitle:not([data-sample])');
export const titleLines = () => text('text.mcs-axisTitle:not([data-sample]) tspan');
/** Where a year is drawn across the plot. */
export const xOfYear = (year: number, years: number) => plot().x + (year / years) * plot().w;
/** Where an amount is drawn up the plot, on an axis whose top gridline is `top`. */
export const yOfAmount = (v: number, top: number) => plot().y + (1 - Math.min(v, top) / top) * plot().h;
/** The points of a drawn line, in order. */
export const pointsOf = (selector: string): Array<[number, number]> =>
  [...(one(selector).getAttribute('d') ?? '').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

/** The three end labels (high, median, low): the dot, where the words start, and what they say. */
export function endLabels() {
  return all('g.mcs-endLabel').map((g) => {
    const dot = g.querySelector('circle');
    const words = g.querySelector('text');
    const leader = g.querySelector('.mcs-leader');
    return {
      dotY: dot ? num(dot, 'cy') : null,
      dotX: dot ? num(dot, 'cx') : null,
      // The words are written two units above the place worked out for them.
      y: words ? tenth(num(words, 'y') + 2) : null,
      x: words ? num(words, 'x') : null,
      name: g.querySelector('.mcs-endName')?.textContent ?? null,
      value: g.querySelector('.mcs-endValue')?.textContent ?? null,
      leader: leader ? { y1: num(leader, 'y1'), y2: num(leader, 'y2') } : null,
    };
  });
}

/** The text the chart draws unseen to measure it: its words, the class it is drawn with and its size. */
export const measuredSamples = () =>
  all('svg.mcs-chart text[data-sample]').map((el) => ({ cls: el.getAttribute('class') ?? '', words: el.textContent ?? '', size: parseFloat((el as HTMLElement).style.fontSize) }));

// ---------------------------------------------------------------------------
// Reading a year: keys and the pointer
// ---------------------------------------------------------------------------

export const chartBox = () => one('.mcs-chartBox');
/** Presses a key on the chart; false when the chart kept the key from the page. */
export const press = (key: string) => fireEvent.keyDown(chartBox(), { key });
/** The year the read-out shows, or null when it is closed. */
export function yearRead(): number | null {
  const title = document.querySelector('.chart-readoutTitle')?.firstChild?.textContent;
  return title ? Number(title.replace(/\D+/g, '')) : null;
}
/** Points the mouse at the chart, `clientX` px from the window's left edge. */
export const pointAt = (clientX: number) => fireEvent.pointerMove(one('svg.mcs-chart'), { clientX, pointerType: 'mouse' });
