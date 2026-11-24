/**
 * The Monte Carlo simulator's chart, mounted by itself, for the tests of what
 * it draws and of its read-out
 * (src/components/MonteCarloParts.chart-readout*.dom.test.tsx): the chart as
 * the page gives it a plan and its result, readers for what is drawn where,
 * and stand-ins for what jsdom does not lay out (a phone's width, the
 * reader's text size, the sizes the read-out is placed by). Not a test file.
 *
 * jsdom lays nothing out, so text is placed by its estimated width, as on a
 * first drawing in the browser.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { dict } from '../src/i18n/index.ts';
import { DEFAULTS, type ToolState } from '../src/utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../src/utils/monte-carlo/math.ts';
import { formatAmount } from '../src/utils/shared/formatAmount.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { ChartWordsContext } from '../src/components/ChartAmounts.tsx';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { Chart } from '../src/components/MonteCarloSimulator.tsx';

export const tools = dict('en').tools;
export const island = tools.monteCarlo.island;
export const words = island.chart;
export type Strings = typeof island;

/** What React complained of while a test drew: a list drawn with a repeated key, say. */
const complaints: string[] = [];
const realError = console.error;
beforeEach(() => {
  complaints.length = 0;
  console.error = (...said: unknown[]) => { complaints.push(said.map(String).join(' ')); };
});
afterEach(() => {
  cleanup();
  console.error = realError;
  assert.deepEqual(complaints, [], 'the chart draws without a complaint from React');
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

// ---------------------------------------------------------------------------
// Mounting the chart
// ---------------------------------------------------------------------------

/** What the page around the chart gives it, where a test wants something else. */
export interface Around {
  strings?: Strings;
  /** The words charts write amounts with; null is a chart drawn outside a tool, whose gridlines keep full amounts. */
  chartWords?: typeof tools.export.chart | null;
  /** The result to draw in place of the plan's own. */
  result?: SimulationResult;
}

function tree(plan: ToolState, exact: SimulationResult, around: Around) {
  return (
    <AmountLocaleContext.Provider value={null}>
      <ChartWordsContext.Provider value={around.chartWords === undefined ? tools.export.chart : around.chartWords}>
        <NumberLocaleContext.Provider value="en">
          <Chart result={exact} worded={roundedResult(exact)} state={plan} code={plan.currency} strings={around.strings ?? island} />
        </NumberLocaleContext.Provider>
      </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>
  );
}

/**
 * Draws the chart of a plan in euros, over 50 paths unless said, as the
 * results panel does: the exact result for the shapes, the rounded one for
 * the words. `redraw` draws another plan in the same chart.
 */
export function drawChart(change: Partial<ToolState> = {}, around: Around = {}) {
  const planOf = (c: Partial<ToolState>): ToolState => ({ ...DEFAULTS, currency: 'EUR', paths: 50, ...c });
  const plan = planOf(change);
  const exact = around.result ?? simulate(plan);
  const view = render(tree(plan, exact, around));
  return {
    plan,
    exact,
    worded: roundedResult(exact),
    unmount: view.unmount,
    redraw(next: Partial<ToolState>, nextAround: Around = around) {
      const p = planOf(next);
      const e = nextAround.result ?? simulate(p);
      view.rerender(tree(p, e, nextAround));
      return { plan: p, exact: e, worded: roundedResult(e) };
    },
  };
}

// ---------------------------------------------------------------------------
// Reading the chart
// ---------------------------------------------------------------------------

export type Pt = [number, number];
export const one = (selector: string, within: ParentNode = document) => {
  const el = within.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
/**
 * Whether something is drawn. A test asks this, and never hands an element to
 * `assert.equal`: a failure would write the whole element out, which takes
 * jsdom long enough for a mutation run to time out.
 */
export const drawn = (selector: string) => document.querySelector(selector) !== null;
export const all = (selector: string, within: ParentNode = document) => [...within.querySelectorAll(selector)];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
export const money = (v: number) => formatAmount(v, 'EUR', false, null);
/** To a tenth of a drawing unit, as the chart places its text. */
export const tenth = (n: number) => Math.round(n * 10) / 10;
export const near = (a: number, b: number, tol = 0.051, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b}`);

export const svg = () => one('svg.mcs-chart') as unknown as SVGSVGElement;
/** The drawing's width and height, in its own units. */
export function drawing() {
  const [, , W, H] = (svg().getAttribute('viewBox') ?? '').split(' ').map(Number);
  return { W, H };
}
export function plotBox() {
  const r = one('.mcs-plotBg');
  const x = num(r, 'x'), y = num(r, 'y'), w = num(r, 'width'), h = num(r, 'height');
  return { x, y, w, h, right: x + w, bottom: y + h };
}
/** The gridlines' amounts, bottom to top, as the axis writes them. */
export const axisAmounts = () => text('.mcs-axisAmount:not([data-sample])');
/** The value at the top gridline, read from its label and the unit named above the chart. */
export function axisTop(): number {
  const heading = document.querySelector('.tool-chartUnit')?.textContent ?? '';
  const unit = heading.includes('billions') ? 1e9 : heading.includes('millions') ? 1e6 : heading.includes('thousands') ? 1e3 : 1;
  return Math.max(...axisAmounts().map((s) => Number(s.replace(/[^\d.]/g, '')))) * unit;
}
/** Where a value is drawn: the axis read the way a reader reads it. */
export function heightOf(v: number, top = axisTop()): number {
  const p = plotBox();
  return p.y + (1 - Math.min(v, top) / top) * p.h;
}
/** Where a year is drawn. */
export function acrossOf(year: number, years: number): number {
  const p = plotBox();
  return p.x + (year / years) * p.w;
}
/** A drawn line's points, in order: it starts with a move and goes on in straight lines. */
export function linePoints(d: string): Pt[] {
  assert.match(d, /^M-?[\d.]+,-?[\d.]+( L-?[\d.]+,-?[\d.]+)*$/, 'one move, then lines, a space between');
  return [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}
/** A drawn band's outline: along its upper edge, back along its lower one, and closed. */
export function bandPoints(d: string): Pt[] {
  assert.match(d, / Z$/, 'the band is closed');
  return linePoints(d.slice(0, -2));
}
export const yearLabels = () => text('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');
/** The horizontal lines of a class, bottom to top as drawn. */
export const levelLines = (selector: string) => all(selector).filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
/** The upright lines of a class, left to right as drawn. */
export const uprightLines = (selector: string) => all(selector).filter((l) => l.getAttribute('x1') === l.getAttribute('x2'));

// ---------------------------------------------------------------------------
// The read-out
// ---------------------------------------------------------------------------

export const chartBox = () => one('.mcs-chartBox');
export const press = (key: string) => fireEvent.keyDown(chartBox(), { key });
/** Presses the right arrow until `year` is read, from nothing read. */
export function readYear(year: number) {
  press('Home');
  for (let y = 0; y < year; y++) press('ArrowRight');
}
export const readout = () => document.querySelector<HTMLElement>('.chart-readout');
export const readoutTitle = () => one('.chart-readoutTitle').firstChild?.textContent;
export const readoutTag = () => document.querySelector('.chart-readoutTag')?.textContent ?? null;
export const readoutValues = () => text('.chart-readout dd');
/** What a screen reader is told. */
export const announced = () => one('.mcs-chartBox .mcs-srOnly').textContent;

// ---------------------------------------------------------------------------
// Stand-ins for layout
// ---------------------------------------------------------------------------

/** A phone's width, as the chart asks for it, for the length of `run`. */
export function onPhone(run: () => void) {
  const real = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === '(width < 640px)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    run();
  } finally {
    window.matchMedia = real;
  }
}

type Box = { left: number; top: number; width: number };
const rect = ({ left, top, width }: Box) => ({ left, top, width, height: 300, right: left + width, bottom: top + 300, x: left, y: top, toJSON() {} }) as DOMRect;

/**
 * A laid-out page for the length of `run`: the reader's text size (the root
 * font size, 16 unless said), the drawing shown `shown` wide (its own width
 * unless said) at `left`, `top` inside a figure at the window's corner, the
 * read-out card `card.width` by `card.height`, and, where `letter` is given,
 * chart text measured as the browser would (jsdom measures none, and the
 * chart falls back on its estimate of 0.6 of the size a letter).
 */
export function laidOut(
  { textSize = 16, shown, left = 0, top = 0, card = { width: 0, height: 0 }, figureWidth = 760, letter }: { textSize?: number; shown?: number; left?: number; top?: number; card?: { width: number; height: number }; figureWidth?: number; letter?: number },
  run: () => void,
) {
  const html = document.documentElement;
  const svgProto = window.SVGElement.prototype;
  const htmlProto = window.HTMLElement.prototype;
  const real = {
    rect: svgProto.getBoundingClientRect,
    offsetWidth: Object.getOwnPropertyDescriptor(htmlProto, 'offsetWidth'),
    offsetHeight: Object.getOwnPropertyDescriptor(htmlProto, 'offsetHeight'),
    clientWidth: Object.getOwnPropertyDescriptor(window.Element.prototype, 'clientWidth'),
  };
  const isCard = (el: Element) => el.classList.contains('chart-readout');
  html.style.fontSize = `${textSize}px`;
  svgProto.getBoundingClientRect = function (this: SVGElement) {
    const own = Number((this.getAttribute('viewBox') ?? '0 0 0').split(' ')[2]);
    return rect({ left, top, width: shown ?? own });
  };
  Object.defineProperty(htmlProto, 'offsetWidth', { configurable: true, get(this: HTMLElement) { return isCard(this) ? card.width : 0; } });
  Object.defineProperty(htmlProto, 'offsetHeight', { configurable: true, get(this: HTMLElement) { return isCard(this) ? card.height : 0; } });
  Object.defineProperty(window.Element.prototype, 'clientWidth', { configurable: true, get(this: Element) { return this.classList.contains('mcs-figure') ? figureWidth : 0; } });
  // The browser's own measure of a piece of chart text: each letter `letter` of its size wide.
  const measuring = svgProto as unknown as { getBBox?: () => { width: number } };
  if (letter !== undefined) {
    measuring.getBBox = function (this: SVGElement) {
      const size = parseFloat(this.style.fontSize) || parseFloat(this.ownerSVGElement?.style.getPropertyValue('--chart-fs') ?? '0');
      return { width: [...(this.textContent ?? '')].length * size * letter };
    };
  }
  try {
    run();
  } finally {
    delete measuring.getBBox;
    html.style.fontSize = '';
    svgProto.getBoundingClientRect = real.rect;
    if (real.offsetWidth) Object.defineProperty(htmlProto, 'offsetWidth', real.offsetWidth);
    if (real.offsetHeight) Object.defineProperty(htmlProto, 'offsetHeight', real.offsetHeight);
    if (real.clientWidth) Object.defineProperty(window.Element.prototype, 'clientWidth', real.clientWidth);
  }
}
