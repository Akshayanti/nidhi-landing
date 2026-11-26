/**
 * The loan comparison's balance chart (`BalanceChart` in LoanCompare.tsx),
 * mounted by itself with results from the real engine on loans small enough
 * to work out by hand: its scale and gridlines, the amounts and years on its
 * axes, one line per offer with its colour, dash and marker, the legend and
 * what a screen reader is told, and the read-out for a month by keys and by
 * pointer. The shared chart pieces have their own tests; this file pins what
 * this chart decides with them.
 *
 * jsdom lays nothing out, so the drawing's box on screen, the reader's text
 * size and the widths of labels as drawn are stand-ins the tests set.
 *
 * The drawing is 760 units wide. At the default text size its plot runs from
 * x = 56 to x = 732 and from y = 24 down to y = 344 (320 units tall), which is
 * where the figures in the tests come from.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import { CHART_SERIES } from '../styles/palette.ts';
import { computeLoan, emptyResult, type LoanResult } from '../utils/loan/math.ts';
import { ChartWordsContext } from './ChartAmounts.tsx';
import { BalanceChart } from './LoanCompare.tsx';
import { AmountLocaleContext } from './useMoney.ts';

const tools = dict('en').tools;
const island = tools.loanComparison.island;
const words = island.balance;
// As the page passes them: the first five chart colours, one per offer slot.
const COLOURS = CHART_SERIES.slice(0, 5);
const NAMES = ['Credit union', 'Town bank', 'Broker', 'Online lender', 'Employer'];
const g = globalThis as unknown as Record<string, unknown>;

// The loans.

/** An interest-free loan in euros: `principal / months` a month, the balance a straight line. */
const interestFree = (principal: number, months: number) =>
  computeLoan({ principalMinor: principal * 100, annualRate: 0 }, { kind: 'term', months });
/** €1,200 over a year at 0%: €100 a month. */
const YEAR = interestFree(1200, 12);
/** €3,000 over two and a half years at 0%: €100 a month. */
const LONGER = interestFree(3000, 30);
/** €12,000 over ten years at 0%: €100 a month. */
const DECADE = interestFree(12000, 120);
/**
 * €1,000 over six months at 12% a year, 1% a month. The payment is €172.55.
 * Month 1: €10.00 interest, €162.55 principal, €837.45 left.
 * Month 2: €8.37 interest, €164.18 principal, €673.27 left.
 * Month 3: €6.73 interest, €165.82 principal, €507.45 left.
 * The six months' interest: 10.00 + 8.37 + 6.73 + 5.07 + 3.40 + 1.71 = €35.28.
 */
const HALF_YEAR = computeLoan({ principalMinor: 100000, annualRate: 0.12 }, { kind: 'term', months: 6 });
/**
 * A loan that is never paid off: interest-free for one month, then 120% a
 * year (10% a month) with the payment kept at `principal / months`. For
 * €1,200 over 12 months the payment is €100 and €1,100 is left after month 1;
 * from then on a month's interest (€110 and rising) is more than the payment,
 * so the balance grows: 1,110.00, 1,121.00, 1,133.10 after months 2, 3, 4, and
 * 1,000 + 100 × 1.1^11 = about €1,285.31 after month 12. The interest paid by
 * then is the twelve payments plus the growth: 1,200 + 85.31 = about €1,285.31.
 */
const neverPaid = (principal: number, months: number) =>
  computeLoan(
    { principalMinor: principal * 100, annualRate: 0, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 1.2, keeps: 'payment' } },
    { kind: 'term', months },
  );
const NEVER = neverPaid(1200, 12);
/**
 * A loan whose payoff lies beyond the calculation limit: €1,000,000 over 100
 * years, interest-free for a month (payment €833.33), then a rate at which
 * the payment covers the interest with cents to spare, so the balance falls
 * by a few cents a month and is still about €999,000 at month 1,200.
 */
const BEYOND = computeLoan(
  { principalMinor: 100_000_000, annualRate: 0, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 0.000834 * 12, keeps: 'payment' } },
  { kind: 'term', months: 1200 },
);
/** An offer the engine refuses: no loan amount. */
const REFUSED = computeLoan({ principalMinor: 0, annualRate: 0.05 }, { kind: 'term', months: 12 });

// What jsdom cannot measure.

/** The drawing's box on screen. */
let drawing = { left: 0, top: 0, width: 760 };
/** The figure's box on screen. */
let figureBox = { left: 0, top: 0, width: 760 };
/** The read-out card's size. */
let card = { width: 0, height: 0 };
/** The reader's text size. */
let rootSize = '16px';
/** The width of the gridline amounts as drawn, or null where the browser has not drawn them. */
let amountWidth: number | null = null;
/** The widths of the axis title's words as drawn. */
let wordWidths: Record<string, number> = {};
/** What React complained of while a test ran (two children with one key, say). */
let complaints: string[] = [];

const kept: { rect?: typeof Element.prototype.getBoundingClientRect; style?: unknown; error?: (...said: unknown[]) => void; props: [object, string, PropertyDescriptor | undefined][] } = { props: [] };
/** Where React reports a drawing it had to patch up; the tests listen there instead of printing it. */
const reports = console as { error: (...said: unknown[]) => void };
const svgProto = window.SVGElement.prototype as unknown as { getBBox?: () => { width: number } };

function standIn(proto: object, name: string, get: (this: Element) => number) {
  kept.props.push([proto, name, Object.getOwnPropertyDescriptor(proto, name)]);
  Object.defineProperty(proto, name, { configurable: true, get });
}

beforeEach(() => {
  drawing = { left: 0, top: 0, width: 760 };
  figureBox = { left: 0, top: 0, width: 760 };
  card = { width: 0, height: 0 };
  rootSize = '16px';
  amountWidth = null;
  wordWidths = {};
  complaints = [];
  kept.rect = Element.prototype.getBoundingClientRect;
  kept.style = g.getComputedStyle;
  kept.error = reports.error;
  reports.error = (...said: unknown[]) => { complaints.push(said.map(String).join(' ')); };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const box = this.classList.contains('lc-chart') ? drawing : this.tagName === 'FIGURE' ? figureBox : { left: 0, top: 0, width: 0 };
    return { ...box, height: 0, right: box.left + box.width, bottom: box.top, x: box.left, y: box.top, toJSON: () => ({}) };
  };
  g.getComputedStyle = () => ({ fontSize: rootSize });
  svgProto.getBBox = function getBBox(this: SVGElement) {
    const width = this.hasAttribute('data-sample') ? wordWidths[this.textContent ?? ''] : this.classList.contains('lc-balanceAmount') ? amountWidth : null;
    if (width == null) throw new Error('not rendered');
    return { width };
  };
  standIn(window.HTMLElement.prototype, 'offsetWidth', function () { return this.classList.contains('chart-readout') ? card.width : 0; });
  standIn(window.HTMLElement.prototype, 'offsetHeight', function () { return this.classList.contains('chart-readout') ? card.height : 0; });
  standIn(window.Element.prototype, 'clientWidth', function () { return this.tagName === 'FIGURE' ? figureBox.width : 0; });
});
afterEach(() => {
  cleanup();
  Element.prototype.getBoundingClientRect = kept.rect!;
  g.getComputedStyle = kept.style;
  reports.error = kept.error!;
  delete svgProto.getBBox;
  for (const [proto, name, was] of kept.props.splice(0)) {
    if (was) Object.defineProperty(proto, name, was);
    else delete (proto as Record<string, unknown>)[name];
  }
  assert.deepEqual(complaints, [], 'React drew the chart without complaint');
});

// Reading the drawing.

type Options = { names?: string[]; colours?: string[]; strings?: typeof island; amountLocale?: string | null };

/** The chart as the page draws it: the offers' results, a colour and a name per slot, euros. */
function draw(results: LoanResult[], { names = NAMES, colours = COLOURS, strings = island, amountLocale = null }: Options = {}) {
  const { container } = render(
    <AmountLocaleContext.Provider value={amountLocale}>
      <ChartWordsContext.Provider value={tools.export.chart}>
        <BalanceChart results={results} colors={colours} vendorNames={names} currency="EUR" strings={strings} />
      </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>,
  );
  return container;
}

/** The page's words with another title for the years axis, as a longer language would have. */
const titled = (axisYears: string): typeof island => ({ ...island, balance: { ...words, axisYears } });

const all = (root: Element, selector: string) => [...root.querySelectorAll(selector)];
const one = (root: Element, selector: string) => {
  const found = all(root, selector);
  assert.equal(found.length, 1, `one ${selector}`);
  return found[0];
};
const num = (el: Element, name: string) => Number(el.getAttribute(name));
const texts = (root: Element, selector: string) => all(root, selector).map((el) => el.textContent);
const chartOf = (root: Element) => one(root, 'svg.lc-chart');
const boxOf = (root: Element) => one(root, '.lc-chartBox');

/** Two lengths agree to a hundredth of a drawing unit. */
function near(actual: number, expected: number, what: string) {
  assert.ok(Math.abs(actual - expected) < 0.011, `${what}: ${actual}, expected ${expected}`);
}
function nearAll(actual: number[], expected: number[], what: string) {
  assert.equal(actual.length, expected.length, `${what}: ${actual.join(', ')}`);
  actual.forEach((v, i) => near(v, expected[i], `${what} [${i}]`));
}

/** Where a month and a balance fall on a plot that starts at `left` and `top`, runs to x = 732 and is 320 tall. */
const xOf = (month: number, months: number, left = 56) => left + (month / months) * (732 - left);
const yOf = (amount: number, scaleTop: number, top = 24) => top + (1 - amount / scaleTop) * 320;

/** A line's points, from its path: "M56.0,24.0 L112.3,50.7 …". */
function points(path: Element) {
  return (path.getAttribute('d') ?? '').split(' ').map((p) => {
    const [x, y] = p.slice(1).split(',').map(Number);
    return { cmd: p[0], x, y };
  });
}

/** The gridlines across the plot, bottom first: where each is, its class and its label. */
function amountAxis(root: Element) {
  return all(chartOf(root), 'g')
    .filter((group) => group.firstElementChild?.matches('line.lc-axisLine, line.lc-chartGrid'))
    .map((group) => {
      const line = group.firstElementChild!;
      const label = group.querySelector('text');
      return { y: num(line, 'y1'), x1: num(line, 'x1'), x2: num(line, 'x2'), cls: line.getAttribute('class'), label: label ? label.textContent : null, text: label };
    });
}
/** The year labels under the plot (the axis title is not one of them). */
const yearLabels = (root: Element) => all(chartOf(root), 'svg.lc-chart > text.lc-chartTick:not(.lc-chartAxisTitle)');
/** The upright gridlines at whole years. */
const yearLines = (root: Element) => all(chartOf(root), 'svg.lc-chart > line.lc-chartGrid');
const minorAcross = (root: Element) => all(chartOf(root), 'line.lc-gridMinor').filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
const minorUpright = (root: Element) => all(chartOf(root), 'line.lc-gridMinor').filter((l) => l.getAttribute('x1') === l.getAttribute('x2'));

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross'];
/**
 * One marker as drawn (`MarkerGlyph`, chart/SeriesMarker.tsx): its shape, its
 * centre and its colour, read from the coloured layer on top of its halo.
 * `r` is half its width, which a triangle's centre depends on.
 */
function marker(glyph: Element, r = 6) {
  const top = glyph.lastElementChild!;
  const shape = top.tagName === 'g' ? top.firstElementChild! : top;
  const colour = (shape as SVGElement).style.stroke;
  if (shape.tagName === 'circle') return { shape: 'circle', x: num(shape, 'cx'), y: num(shape, 'cy'), colour };
  if (shape.tagName === 'rect') return { shape: 'square', x: num(shape, 'x') + num(shape, 'width') / 2, y: num(shape, 'y') + num(shape, 'height') / 2, colour };
  const d = shape.getAttribute('d') ?? '';
  const coords = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  const xs = coords.map((c) => c.x);
  const ys = coords.map((c) => c.y);
  const mid = (v: number[]) => (Math.min(...v) + Math.max(...v)) / 2;
  if (top.tagName === 'g') return { shape: 'cross', x: mid(xs), y: mid(ys), colour };
  // A diamond has four corners; a triangle three, its top 1.05 r above its centre.
  if (coords.length === 4) return { shape: 'diamond', x: mid(xs), y: mid(ys), colour };
  return { shape: 'triangle', x: mid(xs), y: Math.min(...ys) + 1.05 * r, colour };
}
/** The markers on each line, one group per offer: part of the way along, then at the payoff if there is one. */
const lineMarkers = (root: Element) =>
  all(chartOf(root), 'svg.lc-chart > g:not(.chart-measure):not([pointer-events])')
    .filter((group) => !group.firstElementChild?.matches('line'))
    .map((group) => [...group.children].map((glyph) => marker(glyph)));

/** The read-out card: its heading and a line per offer, or null while it is closed. */
function readout(root: Element) {
  const cards = all(root, '.chart-readout');
  if (cards.length === 0) return null;
  return {
    title: cards[0].querySelector('.chart-readoutTitle')!.textContent,
    rows: all(cards[0], 'dl > div').map((row) => `${row.querySelector('dt')!.textContent}: ${row.querySelector('dd')!.textContent}`),
    el: cards[0] as HTMLElement,
  };
}
const said = (root: Element) => one(root, '.chart-srOnly[aria-live="polite"]').textContent;
/** Presses a key on the chart; true when the chart took the key for itself (the page does not scroll). */
const press = (root: Element, key: string, shiftKey = false) => !fireEvent.keyDown(boxOf(root), { key, shiftKey });

// Tests.

describe('the balance chart, with nothing to draw', () => {
  it('says so instead of drawing an empty chart', () => {
    for (const results of [[], [REFUSED], [REFUSED, emptyResult(0, '')]]) {
      const root = draw(results);
      assert.equal(one(root, 'p.lc-chartEmpty').textContent, 'Enter valid inputs above to see a payoff chart.');
      assert.equal(all(root, 'figure, svg, table').length, 0);
      cleanup();
    }
  });
});

describe('the balance chart, two offers on a wide screen', () => {
  // €1,200 over a year and €3,000 over two and a half years, both at €100 a month.
  const months = 30;
  const scaleTop = 3000;

  it('scales the amounts to the larger loan in round steps and names the unit once', () => {
    const root = draw([YEAR, LONGER]);
    const svg = chartOf(root);
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 400');
    assert.equal((svg as SVGElement).style.getPropertyValue('--chart-fs'), '14px');
    const plot = one(svg, 'rect.lc-plotBg');
    assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(plot, a)), [56, 24, 676, 320]);

    assert.equal(one(root, 'p.tool-chartUnit').textContent, 'Amounts in thousands of €');
    const axis = amountAxis(root);
    // Six steps of €500 reach €3,000: the zero line, then a gridline every 53.33 units up to the top of the plot.
    assert.deepEqual(axis.map((a) => a.label), ['0', '0.5', '1', '1.5', '2', '2.5', '3']);
    nearAll(axis.map((a) => a.y), [344, 290.67, 237.33, 184, 130.67, 77.33, 24], 'gridlines');
    assert.deepEqual(axis.map((a) => a.cls), ['lc-axisLine', 'lc-chartGrid', 'lc-chartGrid', 'lc-chartGrid', 'lc-chartGrid', 'lc-chartGrid', 'lc-chartGrid']);
    assert.ok(axis.every((a) => a.x1 === 56 && a.x2 === 732), 'every gridline spans the plot');
    // The amounts stand left of the plot, three quarters of a letter away, level with their lines.
    for (const a of axis) {
      assert.equal(a.text!.getAttribute('class'), 'lc-chartTick lc-balanceAmount');
      assert.equal(a.text!.getAttribute('text-anchor'), 'end');
      near(num(a.text!, 'x'), 45.5, 'amount x');
      near(num(a.text!, 'y'), a.y + 4.9, 'amount y');
    }
    // A fainter line halfway between each pair: €250, €750 and so on.
    const minor = minorAcross(root);
    nearAll(minor.map((l) => num(l, 'y1')), [250, 750, 1250, 1750, 2250, 2750].map((v) => yOf(v, scaleTop)), 'minor gridlines');
    near(num(minor[0], 'y1'), 317.33, 'the €250 line');
    assert.ok(minor.every((l) => num(l, 'x1') === 56 && num(l, 'x2') === 732));
  });

  it('labels the years the longer loan runs for', () => {
    const root = draw([YEAR, LONGER]);
    const labels = yearLabels(root);
    assert.deepEqual(labels.map((l) => l.textContent), ['0', '1', '2']);
    // Twelve months are 12/30 of the plot's 676 units: 270.4.
    nearAll(labels.map((l) => num(l, 'x')), [56, 326.4, 596.8], 'year labels');
    assert.ok(labels.every((l) => l.getAttribute('text-anchor') === 'middle'));
    labels.forEach((l) => near(num(l, 'y'), 363.6, 'year label y'));
    // An upright gridline at each whole year after the start, the height of the plot.
    const lines = yearLines(root);
    nearAll(lines.map((l) => num(l, 'x1')), [326.4, 596.8], 'year gridlines');
    assert.ok(lines.every((l) => l.getAttribute('x1') === l.getAttribute('x2') && num(l, 'y1') === 24 && num(l, 'y2') === 344));
    // Every year has its own label, so there are no fainter lines between them.
    assert.equal(minorUpright(root).length, 0);

    const title = one(root, 'text.lc-chartAxisTitle:not([data-sample])');
    assert.equal(title.textContent, 'Years');
    assert.deepEqual([num(title, 'x'), num(title, 'y'), title.getAttribute('text-anchor')], [394, 386, 'middle']);
    assert.equal(title.getAttribute('style'), null);
    assert.equal(title.getAttribute('visibility'), null);
    const lines1 = all(title, 'tspan');
    assert.equal(lines1.length, 1);
    assert.deepEqual([num(lines1[0], 'x'), num(lines1[0], 'dy')], [394, 0]);
    // The word is measured in the drawing, unseen, in the title's own type.
    const sample = one(root, '.chart-measure text[data-sample]');
    assert.equal(sample.textContent, 'Years');
    assert.equal(sample.getAttribute('class'), 'lc-chartTick lc-chartAxisTitle');
  });

  it('draws one line per offer, from its loan amount down to nothing at its payoff', () => {
    const root = draw([YEAR, LONGER]);
    const lines = all(root, 'path.lc-balanceLine');
    assert.equal(lines.length, 2);
    assert.deepEqual(lines.map((l) => l.getAttribute('stroke')), ['var(--chart-1)', 'var(--chart-2)']);
    assert.deepEqual(lines.map((l) => l.getAttribute('stroke-dasharray')), ['', '9 5']);

    const year = points(lines[0]);
    assert.equal(year.length, 13);
    assert.deepEqual(year.map((p) => p.cmd).join(''), 'MLLLLLLLLLLLL');
    // €1,200 is 40% of the scale, so it starts 60% of the way down: 24 + 192.
    assert.deepEqual(year[0], { cmd: 'M', x: 56, y: 216 });
    // Month 6: €600 left, a fifth of the way along and of the way up.
    assert.deepEqual(year[6], { cmd: 'L', x: 191.2, y: 280 });
    assert.deepEqual(year[12], { cmd: 'L', x: 326.4, y: 344 });
    const longer = points(lines[1]);
    assert.equal(longer.length, 31);
    assert.deepEqual(longer[0], { cmd: 'M', x: 56, y: 24 });
    assert.deepEqual(longer[15], { cmd: 'L', x: 394, y: 184 });
    assert.deepEqual(longer[30], { cmd: 'L', x: 732, y: 344 });
    // Every month between lies on the straight line from one to the other, to the tenth of a unit a path is written in.
    longer.forEach((p, m) => {
      assert.ok(Math.abs(p.x - xOf(m, months)) < 0.051 && Math.abs(p.y - yOf(3000 - 100 * m, scaleTop)) < 0.051, `month ${m}: ${p.x}, ${p.y}`);
    });
  });

  it('marks each line once on its way, at a different place for each offer, and where it is paid off', () => {
    const root = draw([YEAR, LONGER]);
    const [first, second] = lineMarkers(root);
    assert.equal(first.length, 2);
    assert.equal(second.length, 2);
    // The first of two offers is marked a third of the way to its payoff (month 4, €800 left)…
    assert.deepEqual([first[0].shape, first[0].colour], ['circle', 'var(--chart-1)']);
    near(first[0].x, 146.13, 'first offer, on the way, x');
    near(first[0].y, 258.67, 'first offer, on the way, y');
    // …and the second two thirds of the way (month 20, €1,000 left).
    assert.deepEqual([second[0].shape, second[0].colour], ['square', 'var(--chart-2)']);
    near(second[0].x, 506.67, 'second offer, on the way, x');
    near(second[0].y, 237.33, 'second offer, on the way, y');
    // Each payoff sits on the zero line, at month 12 and month 30.
    assert.deepEqual([first[1].shape, first[1].x, first[1].y], ['circle', 326.4, 344]);
    assert.deepEqual([second[1].shape, second[1].x, second[1].y], ['square', 732, 344]);
  });

  it('names each offer in the legend with its line, its marker and when it is paid off', () => {
    const root = draw([YEAR, LONGER]);
    const items = all(root, 'figcaption.lc-balanceLegend > .lc-legendItem');
    assert.deepEqual(items.map((i) => i.textContent), ['Credit unionpaid off in 1 yr', 'Town bankpaid off in 2 yr 6 mo']);
    assert.deepEqual(texts(root, '.lc-legendNote'), ['paid off in 1 yr', 'paid off in 2 yr 6 mo']);
    const keys = items.map((i) => one(i, 'svg.lc-legendLine'));
    assert.ok(keys.every((k) => k.getAttribute('aria-hidden') === 'true'), 'the name beside it says the same');
    assert.deepEqual(keys.map((k) => one(k, 'line').getAttribute('stroke')), ['var(--chart-1)', 'var(--chart-2)']);
    assert.deepEqual(keys.map((k) => one(k, 'line').getAttribute('stroke-dasharray')), ['', '9 5']);
    assert.deepEqual(keys.map((k) => marker(one(k, 'svg > g')).shape), ['circle', 'square']);
    assert.deepEqual(keys.map((k) => marker(one(k, 'svg > g')).colour), ['var(--chart-1)', 'var(--chart-2)']);
  });

  it('tells a screen reader what the chart is, what each line does and how to read it', () => {
    const root = draw([YEAR, LONGER]);
    const svg = chartOf(root);
    assert.equal(svg.getAttribute('role'), 'img');
    const [titleId, descId, ...rest] = (svg.getAttribute('aria-labelledby') ?? '').split(' ');
    assert.equal(rest.length, 0);
    assert.notEqual(titleId, descId);
    assert.equal(one(svg, 'title').id, titleId);
    assert.equal(one(svg, 'title').textContent, 'Loan balance over time');
    assert.equal(one(svg, 'desc').id, descId);
    assert.equal(
      one(svg, 'desc').textContent,
      'Loan balance over time. Credit union: starts at €1,200, paid off in 1 yr. Town bank: starts at €3,000, paid off in 2 yr 6 mo.',
    );
    const box = boxOf(root);
    assert.equal(box.getAttribute('role'), 'group');
    assert.equal(box.getAttribute('tabindex'), '0');
    assert.equal(box.getAttribute('aria-label'), 'Balance chart. Use the left and right arrow keys to read each year, with Shift for single months.');
    // Nothing is announced, and no read-out shown, until a month is picked.
    assert.equal(said(root), '');
    assert.ok(readout(root) === null);
    assert.equal(all(root, '.chart-readoutSlot, .chart-crosshair').length, 0);
    assert.deepEqual(texts(root, 'p.lc-chartHint'), ['Point at the chart, tap it, or use the arrow keys to read the balances in any year.']);
    const swipe = one(root, 'p.chart-swipe');
    assert.equal(swipe.textContent, 'Swipe to see the whole chart →');
    assert.equal(swipe.getAttribute('aria-hidden'), 'true');
  });

  it('gives the same balances as a table, a dozen months or fewer, each offer to its own payoff', () => {
    const root = draw([YEAR, LONGER]);
    const table = one(root, '.lc-srOnly > table');
    assert.equal(one(table, 'caption').textContent, 'Loan balance over time, sampled by month');
    assert.deepEqual(texts(table, 'thead th'), ['Month', 'Credit union', 'Town bank']);
    assert.ok(all(table, 'thead th').every((th) => th.getAttribute('scope') === 'col'));
    const rows = all(table, 'tbody tr').map((tr) => texts(tr, 'th, td'));
    // Every third month of thirty. The first loan is paid off in month 12 and has no balance after it.
    assert.deepEqual(rows.map((r) => r[0]), ['3', '6', '9', '12', '15', '18', '21', '24', '27', '30']);
    assert.deepEqual(rows[0], ['3', '€900.00', '€2,700.00']);
    assert.deepEqual(rows[3], ['12', '€0.00', '€1,800.00']);
    assert.deepEqual(rows[4], ['15', 'n/a', '€1,500.00']);
    assert.deepEqual(rows[9], ['30', 'n/a', '€0.00']);
    assert.equal(all(table, 'tbody td .amt').length, 14, 'every amount is drawn as one unit');
  });

  it('reads a year at a time with the arrow keys, a month with Shift, and jumps with Home and End', () => {
    const root = draw([YEAR, LONGER]);
    assert.equal(press(root, 'ArrowRight'), true);
    assert.deepEqual(readout(root)!.rows, ['Credit union: €1,200 left, €0 interest', 'Town bank: €3,000 left, €0 interest']);
    assert.equal(readout(root)!.title, 'Start');
    assert.equal(said(root), 'Start. Credit union: €1,200 left, €0 interest. Town bank: €3,000 left, €0 interest.');
    assert.equal(readout(root)!.el.getAttribute('aria-hidden'), 'true', 'the live region says it, the card only shows it');

    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Year 1');
    assert.deepEqual(readout(root)!.rows, ['Credit union: Paid off, €0 interest', 'Town bank: €1,800 left, €0 interest']);
    assert.equal(said(root), 'Year 1. Credit union: Paid off, €0 interest. Town bank: €1,800 left, €0 interest.');
    // One month past the first loan's payoff it is still paid off.
    assert.equal(press(root, 'ArrowRight', true), true);
    assert.equal(readout(root)!.title, 'Year 1, month 1');
    assert.deepEqual(readout(root)!.rows, ['Credit union: Paid off, €0 interest', 'Town bank: €1,700 left, €0 interest']);
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Year 2, month 1');
    // The chart ends at month 30: a further year stops there, and stays.
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    assert.deepEqual(readout(root)!.rows, ['Credit union: Paid off, €0 interest', 'Town bank: Paid off, €0 interest']);
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Year 2, month 6');

    assert.equal(press(root, 'ArrowLeft'), true);
    assert.equal(readout(root)!.title, 'Year 1, month 6');
    press(root, 'ArrowLeft');
    assert.equal(readout(root)!.title, 'Month 6');
    assert.equal(press(root, 'ArrowLeft', true), true);
    assert.equal(readout(root)!.title, 'Month 5');
    assert.deepEqual(readout(root)!.rows, ['Credit union: €700 left, €0 interest', 'Town bank: €2,500 left, €0 interest']);
    press(root, 'ArrowLeft');
    assert.equal(readout(root)!.title, 'Start');
    press(root, 'ArrowLeft');
    assert.equal(readout(root)!.title, 'Start');

    assert.equal(press(root, 'End'), true);
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    assert.equal(press(root, 'Home'), true);
    assert.equal(readout(root)!.title, 'Start');
    press(root, 'ArrowRight');
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Year 2');
  });

  it('starts from the end with the left arrow, and leaves every other key to the page', () => {
    const root = draw([YEAR, LONGER]);
    // A key the chart does not use opens nothing and is not taken from the page.
    assert.equal(press(root, 'a'), false);
    assert.equal(press(root, 'Tab'), false);
    assert.ok(readout(root) === null);
    press(root, 'ArrowLeft');
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    // Nor does such a key close a read-out that is open.
    assert.equal(press(root, 'a'), false);
    assert.equal(press(root, ''), false);
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    // Escape closes it and is left to the page too (a dialog around the chart still hears it).
    assert.equal(press(root, 'Escape'), false);
    assert.ok(readout(root) === null);
    assert.equal(said(root), '');
    assert.equal(press(root, 'Escape'), false);
    assert.ok(readout(root) === null);
  });

  it('closes the read-out on Escape wherever focus is, and when focus leaves the chart', () => {
    const root = draw([YEAR, LONGER]);
    press(root, 'Home');
    assert.equal(readout(root)!.title, 'Start');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    assert.ok(readout(root) === null);
    press(root, 'End');
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    fireEvent.blur(boxOf(root));
    assert.ok(readout(root) === null);
    assert.equal(all(root, '.chart-crosshair').length, 0);
  });

  it('marks the picked month on the drawing: a line down the plot and a marker on each offer', () => {
    const root = draw([YEAR, LONGER]);
    press(root, 'ArrowRight');
    press(root, 'ArrowRight');
    press(root, 'ArrowRight', true);
    // Month 13: the first loan is at nothing, the second has €1,700 left.
    const picked = one(chartOf(root), 'svg.lc-chart > g[pointer-events="none"]');
    const hair = one(picked, 'line.chart-crosshair');
    near(num(hair, 'x1'), xOf(13, months), 'crosshair');
    near(num(hair, 'x1'), 348.93, 'crosshair');
    assert.equal(hair.getAttribute('x1'), hair.getAttribute('x2'));
    assert.deepEqual([num(hair, 'y1'), num(hair, 'y2')], [24, 344]);
    const marks = all(picked, ':scope > g').map((glyph) => marker(glyph, 6.5));
    assert.deepEqual(marks.map((m) => [m.shape, m.colour]), [['circle', 'var(--chart-1)'], ['square', 'var(--chart-2)']]);
    marks.forEach((m) => near(m.x, 348.93, 'marker x'));
    near(marks[0].y, 344, 'paid off');
    near(marks[1].y, yOf(1700, scaleTop), '€1,700 left');
    near(marks[1].y, 162.67, '€1,700 left');
  });
});

describe('the balance chart, read with a pointer', () => {
  /** A pointer event on the drawing, `at` drawing units from its left edge when it is shown at its own width. */
  const on = (root: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp', clientX: number, pointerType = 'mouse', clientY = 0) =>
    fireEvent[type](chartOf(root), { clientX, clientY, pointerType, pointerId: 1 });

  it('shows the month under a mouse, to half a month either side, and nothing outside the plot', () => {
    // The drawing stands 100 px from the left of the window at its own width.
    drawing = { left: 100, top: 0, width: 760 };
    const root = draw([YEAR, LONGER]);
    // 394 units in is the middle of the plot: month 15 of 30.
    on(root, 'pointerMove', 494);
    assert.equal(readout(root)!.title, 'Year 1, month 3');
    assert.deepEqual(readout(root)!.rows, ['Credit union: Paid off, €0 interest', 'Town bank: €1,500 left, €0 interest']);
    assert.equal(said(root), 'Year 1, month 3. Credit union: Paid off, €0 interest. Town bank: €1,500 left, €0 interest.');
    // A month is 22.53 units wide; month 20 is at 506.67, so 517 is still month 20 and 519 is month 21.
    on(root, 'pointerMove', 617);
    assert.equal(readout(root)!.title, 'Year 1, month 8');
    on(root, 'pointerMove', 619);
    assert.equal(readout(root)!.title, 'Year 1, month 9');
    // Up to 12 units outside the plot still counts, as its first or last month.
    on(root, 'pointerMove', 144);
    assert.equal(readout(root)!.title, 'Start');
    on(root, 'pointerMove', 143);
    assert.ok(readout(root) === null);
    on(root, 'pointerMove', 844);
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    on(root, 'pointerMove', 845);
    assert.ok(readout(root) === null);
    on(root, 'pointerDown', 157);
    assert.equal(readout(root)!.title, 'Start');
    on(root, 'pointerDown', 20);
    assert.ok(readout(root) === null);
  });

  it('reads the pointer against the drawing as shown, however small', () => {
    // Half size, 10 px in: one px is two drawing units, and the text is drawn
    // twice as large to stay readable, so the plot starts at 112 and is 620 wide.
    drawing = { left: 10, top: 0, width: 380 };
    const root = draw([YEAR, LONGER]);
    assert.deepEqual(['x', 'width'].map((a) => num(one(root, 'rect.lc-plotBg'), a)), [112, 620]);
    // 207 px is 394 units: (394 - 112) / 620 of 30 months = 13.6, month 14.
    on(root, 'pointerMove', 207);
    assert.equal(readout(root)!.title, 'Year 1, month 2');
    // The plot's own edges: 112 - 12 = 100 units is 60 px, 732 + 12 = 744 units is 382 px.
    on(root, 'pointerMove', 60);
    assert.equal(readout(root)!.title, 'Start');
    on(root, 'pointerMove', 59);
    assert.ok(readout(root) === null);
    on(root, 'pointerMove', 382);
    assert.equal(readout(root)!.title, 'Year 2, month 6');
    on(root, 'pointerMove', 383);
    assert.ok(readout(root) === null);
  });

  it('opens on a tap, and takes a sideways drag for a scroll of the chart', () => {
    drawing = { left: 100, top: 0, width: 760 };
    const root = draw([YEAR, LONGER]);
    on(root, 'pointerDown', 494, 'touch');
    assert.ok(readout(root) === null, 'nothing opens on contact');
    on(root, 'pointerUp', 494, 'touch');
    assert.equal(readout(root)!.title, 'Year 1, month 3');
    // The finger leaving the figure does not close what the tap opened; a mouse leaving does.
    fireEvent.pointerLeave(one(root, 'figure.lc-balanceFigure'), { pointerType: 'touch' });
    assert.equal(readout(root)!.title, 'Year 1, month 3');
    fireEvent.pointerLeave(one(root, 'figure.lc-balanceFigure'), { pointerType: 'mouse' });
    assert.ok(readout(root) === null);
    // This chart scrolls sideways on a phone, so a drag along it moves the chart, not the read-out.
    on(root, 'pointerDown', 300, 'touch');
    on(root, 'pointerMove', 400, 'touch');
    on(root, 'pointerMove', 494, 'touch');
    assert.ok(readout(root) === null);
    on(root, 'pointerUp', 494, 'touch');
    assert.ok(readout(root) === null);
  });

  it('puts the read-out beside the picked month, inside the plot, and keeps its room when it closes', () => {
    // The figure is 800 px wide and starts 80 px in; the drawing starts 20 px further in, 30 px lower.
    figureBox = { left: 80, top: 10, width: 800 };
    drawing = { left: 100, top: 40, width: 760 };
    card = { width: 100, height: 90 };
    const root = draw([YEAR, LONGER]);
    assert.equal(all(root, '.chart-readoutSlot').length, 0);
    // The start of the plot is 56 units into the drawing: the card stands 14 px right of it.
    press(root, 'ArrowRight');
    let shown = readout(root)!.el;
    assert.equal(shown.style.visibility, '');
    near(parseFloat(shown.style.left), 20 + 56 + 14, 'beside the start');
    near(parseFloat(shown.style.top), 38, 'level with the top of the drawing');
    assert.equal(all(root, '.chart-readoutSlot').length, 0, 'no empty slot while the card itself is shown');
    // Month 15, the middle of the plot (394 units).
    fireEvent.pointerMove(chartOf(root), { clientX: 100 + 394, pointerType: 'mouse' });
    assert.equal(readout(root)!.title, 'Year 1, month 3');
    near(parseFloat(readout(root)!.el.style.left), 20 + 394 + 14, 'beside the middle');
    // Month 25 is at 619.33 units: a card 100 px wide would end at 753.33, past
    // the plot's right edge at 732 units (752 px), so it goes to the left of the month.
    fireEvent.pointerMove(chartOf(root), { clientX: 100 + 619, pointerType: 'mouse' });
    assert.equal(readout(root)!.title, 'Year 2, month 1');
    shown = readout(root)!.el;
    near(parseFloat(shown.style.left), 20 + 619.33 - 14 - 100, 'left of the month');
    // Month 24 is at 596.8 units: the card ends at 730.8, inside the plot, and stays on the right.
    press(root, 'ArrowLeft', true);
    near(parseFloat(readout(root)!.el.style.left), 20 + 596.8 + 14, 'right of the month');
    // Closed, the card's height is kept as an empty slot, so the page below does not jump on the next opening.
    press(root, 'Escape');
    assert.ok(readout(root) === null);
    assert.equal((one(root, '.chart-readoutSlot') as HTMLElement).style.height, '90px');
  });
});

describe('the balance chart, a loan with interest', () => {
  it('reads out what is left and the interest paid so far, month by month', () => {
    const root = draw([HALF_YEAR]);
    assert.equal(one(chartOf(root), 'desc').textContent, 'Loan balance over time. Credit union: starts at €1,000, paid off in 6 mo.');
    press(root, 'ArrowRight');
    assert.deepEqual(readout(root)!.rows, ['Credit union: €1,000 left, €0 interest']);
    press(root, 'ArrowRight', true);
    assert.equal(readout(root)!.title, 'Month 1');
    assert.deepEqual(readout(root)!.rows, ['Credit union: €837 left, €10 interest']);
    press(root, 'ArrowRight', true);
    // €10.00 + €8.37 paid in interest, €673.27 left.
    assert.deepEqual(readout(root)!.rows, ['Credit union: €673 left, €18 interest']);
    assert.equal(said(root), 'Month 2. Credit union: €673 left, €18 interest.');
    const row = one(readout(root)!.el, 'dl > div');
    assert.equal(one(row, 'i').getAttribute('class'), 'chart-swatch chart-swatch--dot');
    assert.equal((one(row, 'i') as HTMLElement).style.color, 'var(--chart-1)');
    // The marker on the line at month 2: a third of the way along, €673.27 of a €1,000 scale.
    const picked = one(chartOf(root), 'svg.lc-chart > g[pointer-events="none"]');
    near(num(one(picked, 'line'), 'x1'), 281.33, 'crosshair');
    near(marker(one(picked, ':scope > g'), 6.5).y, 128.55, 'marker');
    // A year's step runs past the six months to the end: all €35.28 of interest paid.
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.title, 'Month 6');
    assert.deepEqual(readout(root)!.rows, ['Credit union: Paid off, €35 interest']);
  });

  it('draws the balance as the engine has it and scales to the loan alone', () => {
    const root = draw([HALF_YEAR]);
    // Five steps of €200 reach €1,000.
    const axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), ['0', '0.2', '0.4', '0.6', '0.8', '1']);
    nearAll(axis.map((a) => a.y), [344, 280, 216, 152, 88, 24], 'gridlines');
    assert.equal(minorAcross(root).length, 5);
    const line = points(one(root, 'path.lc-balanceLine'));
    // 1,000 then 837.45, 673.27, 507.45 … 0: each a sixth of the plot further along.
    assert.deepEqual(line.slice(0, 4), [
      { cmd: 'M', x: 56, y: 24 },
      { cmd: 'L', x: 168.7, y: 76 },
      { cmd: 'L', x: 281.3, y: 128.6 },
      { cmd: 'L', x: 394, y: 181.6 },
    ]);
    assert.deepEqual(line[6], { cmd: 'L', x: 732, y: 344 });
    // Under a year: only the start has a year label, and no upright gridline.
    assert.deepEqual(yearLabels(root).map((l) => l.textContent), ['0']);
    assert.equal(yearLines(root).length, 0);
    // The one offer is marked halfway to its payoff (month 3, €507.45 left) and at the payoff.
    const [marks] = lineMarkers(root);
    near(marks[0].x, 394, 'halfway x');
    near(marks[0].y, 181.62, 'halfway y');
    assert.deepEqual([marks[1].x, marks[1].y], [732, 344]);
    assert.deepEqual(texts(root, 'tbody tr').slice(0, 2), ['1€837.45', '2€673.27']);
  });

  it('writes amounts in the page own number style', () => {
    const root = draw([DECADE], { amountLocale: 'es' });
    assert.equal(one(chartOf(root), 'desc').textContent, 'Loan balance over time. Credit union: starts at 12.000\u00a0€, paid off in 10 yr.');
    press(root, 'ArrowRight');
    press(root, 'ArrowRight');
    assert.deepEqual(readout(root)!.rows, ['Credit union: 10.800\u00a0€ left, 0\u00a0€ interest']);
  });
});

describe('the balance chart, which offer is which', () => {
  it('keeps an offer its own colour, dash, marker and name when the one before it cannot be drawn', () => {
    const root = draw([REFUSED, HALF_YEAR, emptyResult(0, '')]);
    assert.deepEqual(texts(root, '.lc-legendItem'), ['Town bankpaid off in 6 mo']);
    const line = one(root, 'path.lc-balanceLine');
    assert.deepEqual([line.getAttribute('stroke'), line.getAttribute('stroke-dasharray')], ['var(--chart-2)', '9 5']);
    assert.equal(points(line).length, 7);
    const legend = one(root, 'svg.lc-legendLine');
    assert.deepEqual([one(legend, 'line').getAttribute('stroke'), one(legend, 'line').getAttribute('stroke-dasharray')], ['var(--chart-2)', '9 5']);
    assert.equal(marker(one(legend, 'svg > g')).shape, 'square');
    const [marks] = lineMarkers(root);
    assert.deepEqual(marks.map((m) => [m.shape, m.colour]), [['square', 'var(--chart-2)'], ['square', 'var(--chart-2)']]);
    assert.equal(one(chartOf(root), 'desc').textContent, 'Loan balance over time. Town bank: starts at €1,000, paid off in 6 mo.');
    assert.deepEqual(texts(root, 'thead th'), ['Month', 'Town bank']);
    press(root, 'End');
    assert.deepEqual(readout(root)!.rows, ['Town bank: Paid off, €35 interest']);
    assert.equal((one(readout(root)!.el, 'i') as HTMLElement).style.color, 'var(--chart-2)');
  });

  it('tells five offers apart by colour, dash and marker, even when their lines coincide', () => {
    // Five times the same loan: €1,200 over a year.
    const root = draw([YEAR, YEAR, YEAR, YEAR, YEAR]);
    const lines = all(root, 'path.lc-balanceLine');
    const colours = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
    const dashes = ['', '9 5', '2 4', '12 4 2 4', '5 5'];
    assert.deepEqual(lines.map((l) => l.getAttribute('stroke')), colours);
    assert.deepEqual(lines.map((l) => l.getAttribute('stroke-dasharray')), dashes);
    assert.equal(new Set(lines.map((l) => l.getAttribute('d'))).size, 1, 'the same loan draws the same line');

    const legend = all(root, 'svg.lc-legendLine');
    assert.deepEqual(legend.map((k) => one(k, 'line').getAttribute('stroke')), colours);
    assert.deepEqual(legend.map((k) => one(k, 'line').getAttribute('stroke-dasharray')), dashes);
    assert.deepEqual(legend.map((k) => marker(one(k, 'svg > g'), 5).shape), SHAPES);
    assert.deepEqual(texts(root, '.lc-legendItem'), NAMES.map((n) => `${n}paid off in 1 yr`));

    // Each is marked at its own sixth of the way: months 2, 4, 6, 8 and 10, with €1,000 down to €200 left.
    const marks = lineMarkers(root);
    assert.equal(marks.length, 5);
    assert.deepEqual(marks.map((m) => m[0].shape), SHAPES);
    assert.deepEqual(marks.map((m) => m[0].colour), colours);
    nearAll(marks.map((m) => m[0].x), [168.67, 281.33, 394, 506.67, 619.33], 'on the way, x');
    nearAll(marks.map((m) => m[0].y), [77.33, 130.67, 184, 237.33, 290.67], 'on the way, y');
    // All five are paid off at the end of the plot.
    assert.deepEqual(marks.map((m) => m[1].shape), SHAPES);
    nearAll(marks.map((m) => m[1].x), [732, 732, 732, 732, 732], 'payoff x');
    nearAll(marks.map((m) => m[1].y), [344, 344, 344, 344, 344], 'payoff y');

    press(root, 'ArrowRight');
    assert.deepEqual(readout(root)!.rows, NAMES.map((n) => `${n}: €1,200 left, €0 interest`));
    assert.deepEqual(all(readout(root)!.el, 'i').map((i) => (i as HTMLElement).style.color), colours);
    const picked = all(one(chartOf(root), 'svg.lc-chart > g[pointer-events="none"]'), ':scope > g').map((glyph) => marker(glyph, 6.5));
    assert.deepEqual(picked.map((m) => m.shape), SHAPES);
    assert.deepEqual(texts(root, 'thead th'), ['Month', ...NAMES]);
    assert.deepEqual(texts(root, 'tbody tr')[5], '6' + '€600.00'.repeat(5));
  });

  it('draws an offer past the fifth, should one be passed, as a plain line', () => {
    const root = draw(Array.from({ length: 6 }, () => YEAR), { names: [...NAMES, 'Sixth'], colours: [...CHART_SERIES.slice(0, 6)] });
    const lines = all(root, 'path.lc-balanceLine');
    assert.deepEqual(lines.map((l) => l.getAttribute('stroke-dasharray')), ['', '9 5', '2 4', '12 4 2 4', '5 5', '']);
    assert.equal(lines[5].getAttribute('stroke'), 'var(--chart-6)');
  });
});

describe('the balance chart, a loan that is not paid off', () => {
  it('scales to the highest balance of a loan that grows, and says it is not paid off', () => {
    const root = draw([NEVER]);
    // The balance passes its starting €1,200 and reaches about €1,285: six steps of €250, to €1,500.
    const axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), ['0', '0.25', '0.5', '0.75', '1', '1.25', '1.5']);
    // The schedule runs to the calculation limit; the chart draws the entered term.
    const line = points(one(root, 'path.lc-balanceLine'));
    assert.equal(line.length, 13);
    assert.deepEqual(line[0], { cmd: 'M', x: 56, y: 88 });
    // Month 4: €1,133.10 left, a third of the way along.
    near(line[4].x, 281.3, 'month 4 x');
    near(line[4].y, Number(yOf(1133.1, 1500).toFixed(1)), 'month 4 y');
    near(line[4].y, 102.3, 'month 4 y');
    assert.ok(line[12].y < line[0].y, 'the line ends above where it began');

    assert.deepEqual(texts(root, '.lc-legendNote'), ['not paid off']);
    assert.equal(one(chartOf(root), 'desc').textContent, 'Loan balance over time. Credit union: starts at €1,200, not paid off.');
    assert.deepEqual(texts(root, 'p.lc-chartHint'), [
      'Point at the chart, tap it, or use the arrow keys to read the balances in any year.',
      'Balance shown through month 12.',
    ]);
    // One marker on the way (month 6, about €1,161.05 left); none for a payoff that never comes.
    const [marks] = lineMarkers(root);
    assert.equal(marks.length, 1);
    near(marks[0].x, 394, 'on the way, x');
    assert.ok(Math.abs(marks[0].y - yOf(1161.05, 1500)) < 0.05, 'on the way, y');

    press(root, 'ArrowRight');
    for (let i = 0; i < 4; i++) press(root, 'ArrowRight', true);
    // Interest paid by month 4: 0 + 110.00 + 111.00 + 112.10 = €333.10.
    assert.deepEqual(readout(root)!.rows, ['Credit union: €1,133 left, €333 interest']);
    press(root, 'End');
    assert.equal(readout(root)!.title, 'Year 1');
    assert.deepEqual(readout(root)!.rows, ['Credit union: €1,285 left, €1,285 interest']);
    assert.equal(texts(root, 'tbody tr').length, 12);
  });

  it('draws it beside a loan that is paid off, over the range that loan gives the chart', () => {
    const root = draw([LONGER, NEVER]);
    const lines = all(root, 'path.lc-balanceLine');
    // Drawn for the other loan's 30 months, not its own 12 nor the limit's 1,200.
    assert.deepEqual(lines.map((l) => points(l).length), [31, 31]);
    assert.deepEqual(texts(root, '.lc-legendNote'), ['paid off in 2 yr 6 mo', 'not paid off']);
    assert.equal(
      one(chartOf(root), 'desc').textContent,
      'Loan balance over time. Credit union: starts at €3,000, paid off in 2 yr 6 mo. Town bank: starts at €1,200, not paid off.',
    );
    assert.equal(texts(root, 'p.lc-chartHint')[1], 'Balance shown through month 30.');
    // The paid-off loan keeps its payoff marker; the other has none.
    assert.deepEqual(lineMarkers(root).map((m) => m.length), [2, 1]);
    // By month 30 it owes 1,000 + 100 × 1.1^29 = about €2,586: the scale covers it and the €3,000 loan.
    assert.deepEqual(amountAxis(root).map((a) => a.label), ['0', '0.5', '1', '1.5', '2', '2.5', '3']);
  });

  it('keeps a shorter unpaid line at its last drawn balance in the read-out', () => {
    // Two loans that are never paid off, entered for one year and for two: each is drawn for its own term.
    const root = draw([NEVER, neverPaid(2400, 24)]);
    assert.deepEqual(all(root, 'path.lc-balanceLine').map((l) => points(l).length), [13, 25]);
    assert.equal(texts(root, 'p.lc-chartHint')[1], 'Balance shown through month 24.');
    press(root, 'ArrowRight');
    press(root, 'ArrowRight');
    assert.equal(readout(root)!.rows[0], 'Credit union: €1,285 left, €1,285 interest');
    // Past the end of the first line, at month 13 and at month 24, its row stays as it was at month 12.
    press(root, 'ArrowRight', true);
    assert.equal(readout(root)!.title, 'Year 1, month 1');
    assert.equal(readout(root)!.rows[0], 'Credit union: €1,285 left, €1,285 interest');
    press(root, 'End');
    assert.equal(readout(root)!.title, 'Year 2');
    assert.equal(readout(root)!.rows[0], 'Credit union: €1,285 left, €1,285 interest');
    const picked = all(one(chartOf(root), 'svg.lc-chart > g[pointer-events="none"]'), ':scope > g').map((glyph) => marker(glyph, 6.5));
    assert.ok(Math.abs(picked[0].y - points(all(root, 'path.lc-balanceLine')[0])[12].y) < 0.051, 'the marker stays level with the end of its line');
  });
});

describe('the balance chart, at larger text and on a small screen', () => {
  it('draws its words twice as large at 200% text, with room for them and no minor gridlines', () => {
    rootSize = '32px';
    const root = draw([YEAR]);
    const svg = chartOf(root);
    assert.equal((svg as SVGElement).style.getPropertyValue('--chart-fs'), '28px');
    // The plot keeps its 320 units; the margin under it grows to 107 for the larger labels.
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 451');
    assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(one(svg, 'rect.lc-plotBg'), a)), [112, 24, 620, 320]);
    const axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), ['0', '0.2', '0.4', '0.6', '0.8', '1', '1.2']);
    assert.ok(axis.every((a) => a.x1 === 112 && a.x2 === 732));
    near(num(axis[0].text!, 'x'), 91, 'amount x');
    near(num(axis[0].text!, 'y'), 344 + 9.8, 'amount y');
    assert.equal(all(svg, 'line.lc-gridMinor').length, 0);
    const labels = yearLabels(root);
    assert.deepEqual(labels.map((l) => [l.textContent, num(l, 'x')]), [['0', 112], ['1', 732]]);
    labels.forEach((l) => near(num(l, 'y'), 383.2, 'year label y'));
    const title = one(root, 'text.lc-chartAxisTitle:not([data-sample])');
    assert.deepEqual([num(title, 'x'), num(title, 'y')], [422, 428]);
    assert.deepEqual(points(one(root, 'path.lc-balanceLine'))[0], { cmd: 'M', x: 112, y: 24 });
  });

  it('keeps the minor gridlines when the same words are larger only because the screen is small', () => {
    drawing = { left: 0, top: 0, width: 380 };
    const root = draw([YEAR]);
    assert.equal(chartOf(root).getAttribute('viewBox'), '0 0 760 451');
    assert.equal(minorAcross(root).length, 6);
  });

  it('uses fewer, rounder steps and fewer year labels as the words grow', () => {
    // 200% text on a drawing shown at half size: the words are four times the default.
    rootSize = '32px';
    drawing = { left: 0, top: 0, width: 380 };
    let root = draw([YEAR]);
    let svg = chartOf(root);
    // Margins: 45 above, 213 below, 224 on the left for the amounts.
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 578');
    assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(one(svg, 'rect.lc-plotBg'), a)), [224, 45, 508, 320]);
    // Room for three gridline labels: steps of €500 to €1,500.
    let axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), ['0', '0.5', '1', '1.5']);
    nearAll(axis.map((a) => a.y), [365, 258.33, 151.67, 45], 'gridlines');
    near(num(axis[1].text!, 'x'), 182, 'amount x');
    near(num(axis[1].text!, 'y'), 258.33 + 19.6, 'amount y');
    assert.deepEqual(axis.map((a) => a.text!.getAttribute('text-anchor')), ['end', 'end', 'end', 'end']);
    const line = points(one(root, 'path.lc-balanceLine'));
    assert.deepEqual([line[0], line[12]], [{ cmd: 'M', x: 224, y: 109 }, { cmd: 'L', x: 732, y: 365 }]);
    assert.deepEqual(yearLines(root).map((l) => [num(l, 'x1'), num(l, 'y1'), num(l, 'y2')]), [[732, 45, 365]]);
    cleanup();

    // Ten years: a label every year would need 123 units each and has 51, every second 102; every fifth fits.
    root = draw([DECADE]);
    svg = chartOf(root);
    assert.deepEqual(yearLabels(root).map((l) => l.textContent), ['0', '5', '10']);
    nearAll(yearLabels(root).map((l) => num(l, 'x')), [224, 478, 732], 'year labels');
    nearAll(yearLines(root).map((l) => num(l, 'x1')), [478, 732], 'year gridlines');
    assert.equal(all(svg, 'line.lc-gridMinor').length, 0);
    axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), ['0', '5', '10', '15']);
    assert.equal(one(root, 'p.tool-chartUnit').textContent, 'Amounts in thousands of €');
  });

  it('moves the amounts inside the plot when they would leave it too little room', () => {
    // Four times the default size, and the amounts measure 250 units as drawn.
    rootSize = '32px';
    drawing = { left: 0, top: 0, width: 380 };
    amountWidth = 250;
    const root = draw([YEAR]);
    const svg = chartOf(root);
    // The plot takes the width back (from 32 to 732) and the top margin grows to 79 for the label above the top gridline.
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 612');
    assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(one(svg, 'rect.lc-plotBg'), a)), [32, 79, 700, 320]);
    const axis = amountAxis(root);
    nearAll(axis.map((a) => a.y), [399, 292.33, 185.67, 79], 'gridlines');
    // Each amount sits above its own gridline, from the left; the zero line needs none.
    assert.deepEqual(axis.map((a) => a.label), [null, '0.5', '1', '1.5']);
    for (const a of axis.slice(1)) {
      assert.equal(a.text!.getAttribute('text-anchor'), 'start');
      assert.equal(a.text!.getAttribute('class'), 'lc-chartTick lc-balanceAmount');
      near(num(a.text!, 'x'), 38, 'amount x');
      near(num(a.text!, 'y'), a.y - 16.8, 'amount y');
    }
    assert.deepEqual(points(one(root, 'path.lc-balanceLine'))[0], { cmd: 'M', x: 32, y: 143 });
  });

  it('sizes the left margin from the amounts as drawn', () => {
    amountWidth = 100;
    const root = draw([YEAR]);
    // 100 units of label and one letter height (14) of gap.
    assert.deepEqual(['x', 'width'].map((a) => num(one(root, 'rect.lc-plotBg'), a)), [114, 618]);
    near(num(amountAxis(root)[0].text!, 'x'), 114 - 10.5, 'amount x');
    assert.equal(one(root, 'text.lc-chartAxisTitle:not([data-sample])').getAttribute('x'), '423');
  });

  it('keeps only the year labels that have room on a hundred-year loan at 400% text on a phone', () => {
    rootSize = '64px';
    drawing = { left: 0, top: 0, width: 380 };
    const root = draw([BEYOND]);
    const svg = chartOf(root);
    assert.equal((svg as SVGElement).style.getPropertyValue('--chart-fs'), '112px');
    // 157 above, 426 below; the amounts go inside, so the plot runs from 32.
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 903');
    assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(one(svg, 'rect.lc-plotBg'), a)), [32, 157, 700, 320]);
    // Room for one step: a million.
    assert.equal(one(root, 'p.tool-chartUnit').textContent, 'Amounts in millions of €');
    const axis = amountAxis(root);
    assert.deepEqual(axis.map((a) => a.label), [null, '1']);
    near(num(axis[1].text!, 'y'), 157 - 33.6, 'amount y');
    // A gridline every 20 years, the widest step there is; of the six labels
    // 0, 40 and 100 have room, each kept inside the drawing.
    nearAll(yearLines(root).map((l) => num(l, 'x1')), [172, 312, 452, 592, 732], 'year gridlines');
    assert.ok(yearLines(root).every((l) => num(l, 'y1') === 157 && num(l, 'y2') === 477));
    assert.deepEqual(yearLabels(root).map((l) => [l.textContent, num(l, 'x'), l.getAttribute('text-anchor')]), [['0', 32, 'start'], ['40', 312, 'middle'], ['100', 732, 'end']]);
    yearLabels(root).forEach((l) => near(num(l, 'y'), 477 + 156.8, 'year label y'));
    const title = one(root, 'text.lc-chartAxisTitle:not([data-sample])');
    assert.deepEqual([num(title, 'x'), num(title, 'y')], [382, 813]);
    assert.equal(all(svg, 'line.lc-gridMinor').length, 0);

    // The payoff lies beyond the calculation limit: said so, and not marked.
    assert.deepEqual(texts(root, '.lc-legendNote'), ['beyond the calculation limit']);
    assert.equal(one(svg, 'desc').textContent, 'Loan balance over time. Credit union: starts at €1,000,000, payoff beyond the calculation limit.');
    assert.equal(texts(root, 'p.lc-chartHint')[1], 'Balance shown through month 1200.');
    assert.equal(points(one(root, 'path.lc-balanceLine')).length, 1201);
    assert.deepEqual(lineMarkers(root).map((m) => m.length), [1]);
    assert.deepEqual(texts(root, 'tbody tr th'), ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200']);
  });
});

describe('the balance chart, how many years it labels', () => {
  const years = (root: Element) => yearLabels(root).map((l) => Number(l.textContent));

  it('labels every year up to ten, every fifth up to thirty, and every tenth beyond', () => {
    let root = draw([DECADE]);
    assert.deepEqual(years(root), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(yearLines(root).length, 10);
    assert.equal(minorUpright(root).length, 0);
    near(num(yearLabels(root)[10], 'x'), 732, 'the last year ends the plot');
    cleanup();

    // Eleven years: a label every fifth year, a gridline with it, and a fainter line at each year between.
    root = draw([interestFree(13200, 132)]);
    assert.deepEqual(years(root), [0, 5, 10]);
    nearAll(yearLines(root).map((l) => num(l, 'x1')), [xOf(60, 132), xOf(120, 132)], 'year gridlines');
    near(num(yearLines(root)[0], 'x1'), 363.27, 'year 5');
    const between = minorUpright(root);
    nearAll(between.map((l) => num(l, 'x1')), [1, 2, 3, 4, 6, 7, 8, 9].map((yr) => xOf(yr * 12, 132)), 'minor gridlines');
    near(num(between[0], 'x1'), 117.45, 'year 1');
    assert.ok(between.every((l) => num(l, 'y1') === 24 && num(l, 'y2') === 344));
    cleanup();

    root = draw([interestFree(36000, 360)]);
    assert.deepEqual(years(root), [0, 5, 10, 15, 20, 25, 30]);
    assert.equal(minorUpright(root).length, 24);
    cleanup();

    root = draw([interestFree(37200, 372)]);
    assert.deepEqual(years(root), [0, 10, 20, 30]);
    // Years 1 to 30 without the three that carry a label; year 31 is the end of the plot.
    assert.equal(minorUpright(root).length, 27);
  });

  it('labels every year when a label has exactly the room it needs', () => {
    // Words 21 units tall (150% of the default), amounts 249 wide: the plot is
    // 462 units, a year 46.2, and "10" with its gap needs 2 × 12.6 + 21 = 46.2.
    drawing = { left: 0, top: 0, width: 760 / 1.5 };
    amountWidth = 249;
    const root = draw([DECADE]);
    assert.equal((chartOf(root) as SVGElement).style.getPropertyValue('--chart-fs'), '21px');
    assert.deepEqual(['x', 'width'].map((a) => num(one(root, 'rect.lc-plotBg'), a)), [270, 462]);
    assert.deepEqual(years(root), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('turns the last year label inwards when it would run off the drawing', () => {
    // Text at 26 px on a drawing at half size: the words are 45.5 units tall,
    // "10" is 54.6 wide and would reach 759.3, past the 758 a label may reach.
    rootSize = '26px';
    drawing = { left: 0, top: 0, width: 380 };
    const root = draw([DECADE]);
    const svg = chartOf(root);
    assert.equal(svg.getAttribute('viewBox'), '0 0 760 530');
    assert.deepEqual(['x', 'y', 'width'].map((a) => num(one(svg, 'rect.lc-plotBg'), a)), [182, 37, 550]);
    // A year is 55 units and a label needs 100.1: every second year is labelled.
    assert.deepEqual(yearLabels(root).map((l) => [l.textContent, num(l, 'x'), l.getAttribute('text-anchor')]), [
      ['0', 182, 'middle'], ['2', 292, 'middle'], ['4', 402, 'middle'], ['6', 512, 'middle'], ['8', 622, 'middle'], ['10', 732, 'end'],
    ]);
    // Text under 200%: the years between keep a fainter line.
    nearAll(minorUpright(root).map((l) => num(l, 'x1')), [237, 347, 457, 567, 677], 'minor gridlines');
    assert.ok(minorUpright(root).every((l) => num(l, 'y1') === 37 && num(l, 'y2') === 357));
    // Three steps of €5,000 for €12,000.
    assert.deepEqual(amountAxis(root).map((a) => a.label), ['0', '5', '10', '15']);
    assert.equal(minorAcross(root).length, 3);
  });
});

describe('the balance chart, the title of its years axis', () => {
  const titleOf = (root: Element) => one(root, 'text.lc-chartAxisTitle:not([data-sample])') as SVGElement;

  it('draws a word a little too wide slightly smaller, and leaves out one that would be too small to read', () => {
    // 760 units as drawn against the 756 there are: 99.5% of its size.
    wordWidths = { Years: 760 };
    let root = draw([YEAR]);
    near(parseFloat(titleOf(root).style.fontSize), (14 * 756) / 760, 'font size');
    assert.equal(titleOf(root).getAttribute('visibility'), null);
    // Centred on the drawing, where it just fits, not on the plot.
    assert.equal(titleOf(root).getAttribute('x'), '380');
    cleanup();

    // 882 units needs 6/7 of its size, 12 units: the smallest chart text is drawn, and still shown.
    wordWidths = { Years: 882 };
    root = draw([YEAR]);
    near(parseFloat(titleOf(root).style.fontSize), 12, 'font size');
    assert.equal(titleOf(root).getAttribute('visibility'), null);
    cleanup();

    wordWidths = { Years: 900 };
    root = draw([YEAR]);
    assert.equal(titleOf(root).getAttribute('visibility'), 'hidden');
  });

  it('keeps a title of several words on one line while it fits, clear of the drawing edge', () => {
    // A translation's title can be several words, and can carry a stray space.
    wordWidths = { Years: 400, elapsed: 340 };
    const root = draw([YEAR], { strings: titled(' Years  elapsed ') });
    assert.deepEqual(texts(root, '.chart-measure text[data-sample]'), ['Years', 'elapsed']);
    const title = titleOf(root);
    assert.deepEqual(texts(title, 'tspan'), ['Years elapsed']);
    // 400 + 340 and a 4.2 space: 744.2 wide. Centred on the plot (394) it would
    // pass the right edge, so it moves left to end 2 units inside: 760 - 372.1 - 2.
    assert.equal(title.getAttribute('x'), '386');
    assert.equal(title.getAttribute('style'), null);
    assert.equal(chartOf(root).getAttribute('viewBox'), '0 0 760 400');
  });

  it('wraps a title that does not fit onto a second line and makes room for it', () => {
    // 400 + 350 + 4.2 = 754.2, over the 752 a line may take.
    wordWidths = { Years: 400, elapsed: 350 };
    const root = draw([YEAR], { strings: titled('Years elapsed') });
    const title = titleOf(root);
    const lines = all(title, 'tspan');
    assert.deepEqual(lines.map((l) => l.textContent), ['Years', 'elapsed']);
    assert.deepEqual(lines.map((l) => num(l, 'x')), [394, 394]);
    nearAll(lines.map((l) => num(l, 'dy')), [0, 16.8], 'line spacing');
    assert.deepEqual([num(title, 'x'), num(title, 'y')], [394, 386]);
    assert.equal(title.getAttribute('style'), null);
    // The margin under the plot grows from 56 to 70 for the second line.
    assert.equal(chartOf(root).getAttribute('viewBox'), '0 0 760 414');
    cleanup();

    // Unmeasured, the words are taken at 0.6 of their height a letter: both fit one line.
    wordWidths = {};
    assert.deepEqual(texts(titleOf(draw([YEAR], { strings: titled('Years elapsed') })), 'tspan'), ['Years elapsed']);
  });
});
