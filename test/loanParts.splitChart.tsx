/**
 * What the tests of the loan comparison's payment split chart share
 * (`src/components/LoanParts.SplitChart*.dom.test.tsx`): a stand-in browser,
 * a few small loans from the real engine, and a reading of the drawn chart as
 * plain values.
 *
 * jsdom lays nothing out, so the width the drawing is shown at, the reader's
 * text size, the phone check and the width of each drawn label are stand-ins
 * a test sets on `browser`. Unless a test says otherwise a label is as wide
 * as its letters at 0.6 of the text size, and a wide drawing is shown at its
 * own width. Import `test/dom.ts` before this file.
 */
import assert from 'node:assert/strict';
import { act, cleanup, render } from '@testing-library/react';
import { loanComparisonEn } from '../src/i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { computeLoan, type AmortizationRow } from '../src/utils/loan/math.ts';
import { ChartWordsContext } from '../src/components/ChartAmounts.tsx';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { SplitChart } from '../src/components/LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const g = globalThis as unknown as Record<string, unknown>;
const t = TOOL_STRINGS.en;
export const island = t.loanComparison.island;
export type Strings = typeof island;

export const VENDOR = 'Riverside Bank';
export const COLOR = 'rgb(11, 110, 79)';
export const INK = 'rgb(254, 254, 254)';

// ---- The stand-in browser ----------------------------------------------------

/** One answer to `matchMedia`: it matches only the site's phone query. */
class Screen {
  listeners = new Set<() => void>();
  constructor(readonly media: string) {}
  get matches() {
    return browser.phoneScreen && this.media === '(width < 640px)';
  }
  addEventListener(type: string, heard: () => void) {
    if (type === 'change') this.listeners.add(heard);
  }
  removeEventListener(type: string, heard: () => void) {
    if (type === 'change') this.listeners.delete(heard);
  }
}

type Drawn = (cls: string, text: string, size: number) => number | undefined;
const byLetters = (text: string, size: number) => [...text].length * size * 0.6;
const kept: Record<string, unknown> = {};

export const browser = {
  /** The width the drawing is shown at, in CSS pixels. */
  shownWidth: 800,
  /** The reader's text size. */
  rootSize: '16px',
  /** Whether the screen is narrower than the site's phone breakpoint. */
  phoneScreen: false,
  /** How wide the browser draws a label, where a test says so. */
  drawn: (() => undefined) as Drawn,
  /** Every media query asked for since `install()`. */
  screens: [] as Screen[],

  /** Before each test: a wide screen at normal text. */
  install() {
    browser.shownWidth = 800;
    browser.rootSize = '16px';
    browser.phoneScreen = false;
    browser.drawn = () => undefined;
    browser.screens = [];
    kept.rect = Element.prototype.getBoundingClientRect;
    kept.style = g.getComputedStyle;
    kept.media = window.matchMedia;
    Element.prototype.getBoundingClientRect = function () {
      const w = browser.shownWidth;
      return { width: w, height: 0, top: 0, left: 0, right: w, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
    };
    const real = kept.style as (el: Element) => unknown;
    g.getComputedStyle = (el: Element) => (el === document.documentElement ? { fontSize: browser.rootSize } : real(el));
    window.matchMedia = ((query: string) => {
      const s = new Screen(query);
      browser.screens.push(s);
      return s;
    }) as unknown as typeof window.matchMedia;
    (Element.prototype as unknown as Record<string, unknown>).getBBox = function (this: SVGElement) {
      const text = this.textContent ?? '';
      // The size is read from the attribute: jsdom's parsed style is slow.
      const size = Number(/font-size:\s*([\d.]+)px/.exec(this.getAttribute('style') ?? '')?.[1]);
      return { width: browser.drawn(this.getAttribute('class') ?? '', text, size) ?? byLetters(text, size) };
    };
  },
  /** After each test. */
  restore() {
    cleanup();
    Element.prototype.getBoundingClientRect = kept.rect as typeof Element.prototype.getBoundingClientRect;
    g.getComputedStyle = kept.style;
    window.matchMedia = kept.media as typeof window.matchMedia;
    delete (Element.prototype as unknown as Record<string, unknown>).getBBox;
  },
  /** A wide screen at the reader's text size, as a multiple of the default. */
  wide(textSize = 1) {
    browser.phoneScreen = false;
    browser.shownWidth = 800;
    browser.rootSize = `${16 * textSize}px`;
  },
  /** A phone whose drawing is shown 360 px wide, as it is drawn. */
  phone(textSize = 1) {
    browser.phoneScreen = true;
    browser.shownWidth = 360;
    browser.rootSize = `${16 * textSize}px`;
  },
  /** The screen changing width: every listener hears of it. */
  screenBecomes(phone: boolean) {
    browser.phoneScreen = phone;
    act(() => {
      for (const s of browser.screens) for (const heard of [...s.listeners]) heard();
    });
  },
  /** How many listeners the media queries still hold. */
  get listening() {
    return browser.screens.reduce((n, s) => n + s.listeners.size, 0);
  },
};

// ---- The loans ---------------------------------------------------------------

/** The contract schedule of a fixed-rate loan, from the engine. */
export const loan = (principalMinor: number, annualRate: number, months: number) =>
  computeLoan({ principalMinor, annualRate }, { kind: 'term', months }).contractSchedule;

/**
 * €300 over 3 months at 12% a year (1% a month), worked by hand. The payment
 * is 300 × 0.01 / (1 − 1.01⁻³) = 102.0066, so €102.01.
 *   month 1: interest 3.00, principal 99.01, leaves 200.99
 *   month 2: interest 2.0099 → 2.01, principal 100.00, leaves 100.99
 *   month 3: interest 1.0099 → 1.01, principal 100.99; the payment is 102.00
 */
export const threeMonths = () => loan(30000, 0.12, 3);
/** €60,000 over 5 years at 6%: €1,159.97 a month, €300.00 of the first is interest. */
export const fiveYears = () => loan(6000000, 0.06, 60);
/** €100,000 over 10 years at 6%: €1,110.21 a month, €500.00 of the first is interest. */
export const tenYears = () => loan(10000000, 0.06, 120);

// ---- Reading the chart -------------------------------------------------------

export interface Words {
  cls: string;
  x: number;
  y: number;
  lines: string[];
  lineX: number[];
  dy: number[];
  /** The size it is drawn at, in px, when it is drawn smaller to fit; else null. */
  size: number | null;
  hidden: boolean;
  anchor: string | null;
}
export interface Label {
  text: string;
  x: number;
  y: number;
  fill: string;
  anchor: string | null;
}
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Bar {
  interest: Box;
  principal: Box;
  principalFill: string;
  interestLabel: Label | null;
  principalLabel: Label | null;
  tick: Words;
}

const num = (el: Element, name: string) => Number(el.getAttribute(name));
const css = (el: Element, name: string) => new RegExp(`(?:^|;\\s*)${name}:\\s*([^;]+)`).exec(el.getAttribute('style') ?? '')?.[1].trim() ?? '';
function wordsOf(el: Element): Words {
  const spans = [...el.querySelectorAll('tspan')];
  const size = css(el, 'font-size');
  return {
    cls: el.getAttribute('class') ?? '',
    x: num(el, 'x'),
    y: num(el, 'y'),
    lines: spans.map((s) => s.textContent ?? ''),
    lineX: spans.map((s) => num(s, 'x')),
    dy: spans.map((s) => num(s, 'dy')),
    size: size === '' ? null : parseFloat(size),
    hidden: el.getAttribute('visibility') === 'hidden',
    anchor: el.getAttribute('text-anchor'),
  };
}
const boxOf = (el: Element): Box => ({ x: num(el, 'x'), y: num(el, 'y'), width: num(el, 'width'), height: num(el, 'height') });
function labelOf(el: Element | null): Label | null {
  if (el === null) return null;
  return { text: el.textContent ?? '', x: num(el, 'x'), y: num(el, 'y'), fill: css(el, 'fill'), anchor: el.getAttribute('text-anchor') };
}

/** The drawn chart as plain values. */
export function read(container: HTMLElement) {
  const svg = container.querySelector('svg.lc-splitChart');
  assert.ok(svg !== null, 'the chart is drawn');
  const direct = [...svg.children];
  const only = (start: string) => {
    const found = direct.filter((el) => el.tagName === 'text' && (el.getAttribute('class') ?? '').startsWith(start));
    assert.equal(found.length, 1, `one ${start}`);
    return found[0];
  };
  const bars: Bar[] = direct.filter((el) => el.tagName === 'g' && el.getAttribute('class') !== 'chart-measure').map((bar) => {
    const parts = [...bar.children];
    const one = (tag: string, cls: string) => parts.find((el) => el.tagName === tag && el.getAttribute('class') === cls) ?? null;
    const interest = one('rect', 'lc-splitBarInterest');
    const principal = one('rect', 'lc-splitBarPrincipal');
    const tick = one('text', 'lc-splitTickX');
    assert.ok(interest !== null && principal !== null && tick !== null, 'a bar has two parts and its month');
    assert.equal(parts.filter((el) => el.tagName === 'rect').length, 2);
    return {
      interest: boxOf(interest),
      principal: boxOf(principal),
      principalFill: css(principal, 'fill'),
      interestLabel: labelOf(one('text', 'lc-splitValueInterest')),
      principalLabel: labelOf(one('text', 'lc-splitValuePrincipal')),
      tick: wordsOf(tick),
    };
  });
  const viewBox = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
  return {
    svg,
    unit: container.querySelector('p.tool-chartUnit')?.textContent ?? null,
    height: viewBox[3],
    viewBox: svg.getAttribute('viewBox'),
    textSize: css(svg, '--chart-fs'),
    said: direct.find((el) => el.tagName === 'desc')?.textContent ?? '',
    legendInterest: wordsOf(only('lc-splitEyebrowInterest')),
    legendPrincipal: wordsOf(only('lc-splitEyebrowPrincipal')),
    bars,
    months: bars.map((b) => b.tick.lines.join(' ')),
    interestLabels: bars.map((b) => b.interestLabel?.text ?? null),
    principalLabels: bars.map((b) => b.principalLabel?.text ?? null),
    footnote: wordsOf(only('lc-splitFootnote')),
    table: [...container.querySelectorAll('div.lc-srOnly table tr')].map((row) => [...row.children].map((c) => c.textContent ?? '')),
  };
}
export type Chart = ReturnType<typeof read>;

/** The chart as the English page mounts it, for the vendor "Riverside Bank". */
export function draw(schedule: AmortizationRow[], strings: Strings = island, currency = 'EUR') {
  const view = render(
    <NumberLocaleContext.Provider value="en">
      <AmountLocaleContext.Provider value={null}>
        <ChartWordsContext.Provider value={t.export.chart}>
          <SplitChart schedule={schedule} currency={currency} vendorName={VENDOR} vendorColor={COLOR} vendorInk={INK} strings={strings} />
        </ChartWordsContext.Provider>
      </AmountLocaleContext.Provider>
    </NumberLocaleContext.Provider>,
  );
  return view.container;
}
export const chart = (schedule: AmortizationRow[], strings: Strings = island, currency = 'EUR') => read(draw(schedule, strings, currency));

/** Equal to within a millionth of a drawing unit; a drawn size is given to four decimals. */
export function near(actual: number | null, expected: number, what: string, within = 1e-6) {
  assert.ok(actual !== null && Math.abs(actual - expected) < within, `${what}: ${actual}, expected ${expected}`);
}
export function nearAll(actual: number[], expected: number[], what: string) {
  assert.equal(actual.length, expected.length, `${what}: ${actual.length} values, expected ${expected.length}`);
  actual.forEach((a, i) => near(a, expected[i], `${what} [${i}]`));
}
/** A size a label is drawn at, smaller than the text around it. */
export const nearSize = (actual: number | null, expected: number, what: string) => near(actual, expected, what, 1e-3);

/** The catalog with other legend words or another footnote. */
export const withSplit = (over: Partial<Strings['split']>): Strings => ({ ...island, split: { ...island.split, ...over } });

/**
 * What every drawing must hold, whatever its size: the bars stand on one
 * line, equally spaced, each as tall as its payment against the largest and
 * split in proportion to its interest and principal.
 */
export function checkBars(c: Chart, rows: AmortizationRow[], plot: { left: number; right: number; top: number; height: number }, barWidth: number) {
  assert.equal(c.bars.length, rows.length);
  const largest = Math.max(...rows.map((r) => r.payment));
  const gap = (plot.right - plot.left - barWidth * rows.length) / (rows.length + 1);
  c.bars.forEach((bar, i) => {
    const row = rows[i];
    const x = plot.left + gap + i * (barWidth + gap);
    const whole = plot.height * (row.payment / largest);
    const interest = plot.height * (row.interest / largest);
    near(bar.interest.x, x, `bar ${i} starts`);
    near(bar.principal.x, x, `bar ${i}, principal part, starts`);
    near(bar.interest.width, barWidth, `bar ${i} is wide`);
    near(bar.principal.width, barWidth, `bar ${i}, principal part, is wide`);
    near(bar.interest.y, plot.top + plot.height - whole, `bar ${i} tops out`);
    near(bar.interest.height, interest, `bar ${i}, interest part, is tall`);
    near(bar.principal.y, plot.top + plot.height - whole + interest, `bar ${i}, principal part, starts down`);
    near(bar.principal.height, whole - interest, `bar ${i}, principal part, is tall`);
    assert.equal(bar.principalFill, COLOR, "the principal part is in the offer's colour");
    for (const label of [bar.interestLabel, bar.principalLabel]) {
      if (label === null) continue;
      near(label.x, x + barWidth / 2, `bar ${i}: a figure is centred on its bar`);
      assert.equal(label.anchor, 'middle');
    }
    near(bar.tick.x, x + barWidth / 2, `bar ${i}: its month is centred under it`);
    nearAll(bar.tick.lineX, bar.tick.lines.map(() => x + barWidth / 2), `bar ${i}: each line of its month`);
    assert.equal(bar.tick.anchor, 'middle');
  });
}
