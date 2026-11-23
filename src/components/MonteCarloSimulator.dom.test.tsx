import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, defaultState, encodeState, type ToolState } from '../utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../utils/monte-carlo/math.ts';
import { formatAmount as formatAmountIn } from '../utils/shared/formatAmount.ts';
import { chartLabel as chartLabelIn } from '../utils/shared/chartAmounts.ts';
import { formErrors, formFromLink } from '../utils/monte-carlo/form.ts';
import MonteCarloSimulator from './MonteCarloSimulator.tsx';

const t = dict('en').tools;
const island = t.monteCarlo.island;
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
/** The starting plan's result, as the page works it out for the island. */
const STARTING_RESULT = simulate(defaultState('EUR'));

// As the English page renders it (src/components/pages/MonteCarloPage.astro).
function mount() {
  return render(
    <MonteCarloSimulator
      strings={island}
      exportStrings={t.export}
      netWorthHref="/free/multi-currency-net-worth/"
      defaultCurrency="EUR"
      amountLocale={null}
      numberLocale="en"
      initialResult={STARTING_RESULT}
    />,
  );
}

/** Types `text` into the "invested today" box, replacing what is there, and leaves the box. */
async function typeStart(text: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(island.fields.start);
  await user.clear(box);
  await user.type(box, text);
  await user.tab();
  return box;
}

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
});
afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
});

describe('the Monte Carlo simulator, mounted', () => {
  it('publishes what is typed, readable or not, and marks what cannot be read', async () => {
    mount();
    {
      // publishes a typed starting amount for the language switch
      await typeStart('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeState(raw as string)?.start, 73191);
    }
    {
      // publishes an unreadable starting amount as still in error
      await typeStart('7x');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const form = formFromLink(raw as string);
      assert.ok(form, 'the published state decodes');
      assert.equal(form.start, 'NaN');
      assert.equal(formErrors(form).start, true);
    }
    {
      // marks an unreadable starting amount invalid and withholds the results
      const box = screen.getByLabelText(island.fields.start);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.ok(screen.getByText(island.actions.fix, { selector: '.tool-resultReason' }));
    }
  });
});

// ---------------------------------------------------------------------------
// The rest of the page, as a reader uses it (#790)
// ---------------------------------------------------------------------------

const w = window as unknown as Record<string, unknown>;

/** Mounts the simulator as a page in another language or style would. */
function mountWith(props: Partial<{ amountLocale: string | null; numberLocale: string; defaultCurrency: string; netWorthHref: string; initialResult: SimulationResult }> = {}) {
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

/** Opens a shared plan: what the page head leaves for the island to read. */
function openPlan(change: Partial<ToolState>, props?: Parameters<typeof mountWith>[0]) {
  const plan = { ...DEFAULTS, ...change };
  w[SHARED_STATE_GLOBAL] = encodeState(plan);
  return { plan, ...mountWith(props) };
}

/** Waits for a large run to finish on the page, however slow the machine. */
const runDone = async () => {
  await waitFor(() => assert.equal(results().getAttribute('aria-busy'), 'false'), { timeout: 10_000 });
  await settle(50);
};

/** Lets the typing settle and the result follow. */
const settle = (ms = 320) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const results = () => document.querySelector('.mcs-results') as HTMLElement;
const heading = () => document.getElementById('mcs-results-h') as HTMLElement;
const text = (selector: string) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? '');
const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
const radio = (value: string) => screen.getAllByRole('radio').find((r) => (r as HTMLInputElement).value === value) as HTMLInputElement;
const money = (v: number, code = 'EUR', locale: string | null = null) => formatAmountIn(v, code, false, locale);

/** Analytics as the page would send them, recorded. */
let events: Array<[string, Record<string, unknown> | undefined]> = [];
beforeEach(() => {
  events = [];
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
});
afterEach(() => {
  delete w.posthog;
});
// A download leaves a timer to free its file a minute later; the window going
// takes it along, so the run ends when the tests do.
after(() => window.close());

// The chart's tests come first: a broken chart fails on its own tests at
// once, instead of after every other test has run (mutation runs stop at the
// first failure).

// ---------------------------------------------------------------------------
// The chart: what is drawn where. jsdom lays nothing out, so text is placed
// by its estimated width, as on a first drawing in the browser.
// ---------------------------------------------------------------------------

type Pt = [number, number];
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
const svg = () => one('svg.mcs-chart') as unknown as SVGSVGElement;
const viewBox = () => (svg().getAttribute('viewBox') ?? '').split(' ').map(Number);
function plotBox() {
  const r = one('.mcs-plotBg');
  const x = num(r, 'x'), y = num(r, 'y'), w = num(r, 'width'), h = num(r, 'height');
  return { x, y, w, h, right: x + w, bottom: y + h };
}
/** The points of a drawn line, in order. */
const points = (d: string): Pt[] => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const pathOf = (selector: string) => points(one(selector).getAttribute('d') ?? '');
/** What one unit of the axis heading stands for. */
function axisUnit(): number {
  const heading = one('.tool-chartUnit').textContent ?? '';
  return heading.includes('billions') ? 1e9 : heading.includes('millions') ? 1e6 : heading.includes('thousands') ? 1e3 : 1;
}
/** The value at the top gridline, as its label says. */
function axisTop(): number {
  const labels = text('.mcs-axisAmount:not([data-sample])').map((s) => Number(s.replace(/,/g, '')));
  return Math.max(...labels) * axisUnit();
}
/** Where a value is drawn: the axis read the way a reader reads it. */
function heightOf(v: number): number {
  const p = plotBox();
  return p.y + (1 - Math.min(v, axisTop()) / axisTop()) * p.h;
}
const near = (a: number, b: number, tol = 0.06, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b}`);

/** Draws a plan and waits for it. */
async function drawPlan(change: Partial<ToolState>, props?: Parameters<typeof mountWith>[0]) {
  const { plan, unmount } = openPlan(change, props);
  await settle(20);
  const exact = simulate(plan);
  return { plan, unmount, exact, worded: roundedResult(exact) };
}

/** A plan of withdrawals only, from half a million, over 100 paths unless said. */
const drawdown = (withdrawal: number, change: Partial<ToolState> = {}): Partial<ToolState> => ({ saveYears: 0, monthly: 0, start: 500_000, withdrawal, withdrawYears: 30, paths: 100, ...change });

/** Types into the box labelled `label`, replacing what is there, and leaves it. */
async function typeInto(label: string, value: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(label);
  await user.clear(box);
  if (value) await user.paste(value);
  await user.tab();
  return box;
}
/** The same, and lets the plan settle. */
async function retype(label: string, value: string) {
  const box = await typeInto(label, value);
  await settle();
  return box;
}
const describedBy = (box: HTMLElement) => (box.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
/** Presses a key on the chart. */
const pressOnChart = (key: string) => fireEvent.keyDown(one('.mcs-chartBox'), { key });
const yearLabels = () => text('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');

// Mounting the page is the dearest step of every test (it works out the
// starting plan first), so each test below mounts once and checks all that
// one plan shows.

describe('the chart, on a wide screen', () => {
  it('draws a thirty-year plan: its plot, axes, lines, bands, labels and words', async () => {
    const { exact, worded } = await drawPlan({ saveYears: 30, paths: 100 });
    {
      // keeps its plot the height it is drawn at, with the years and the axis title below it
      const [x0, y0, W, H] = viewBox();
      assert.deepEqual([x0, y0, W], [0, 0, 760]);
      const p = plotBox();
      assert.equal(p.h, 420 - 40 - 56);
      assert.equal(p.y, 18);
      const clip = one('clipPath rect');
      assert.deepEqual(['x', 'y', 'width', 'height'].map((a) => num(clip, a)), [p.x, p.y, p.w, p.h]);
      const years = [...document.querySelectorAll('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])')];
      assert.deepEqual(years.map((y) => y.textContent), ['0', '5', '10', '15', '20', '25', '30']);
      for (const y of years) assert.ok(num(y, 'y') > p.bottom && num(y, 'y') < H, 'year labels sit under the plot');
      const title = one('text.mcs-axisTitle:not([data-sample])');
      assert.equal(title.textContent, island.chart.axisYears);
      assert.ok(num(title, 'y') > num(years[0], 'y') && num(title, 'y') < H, 'the axis title under the years');
      assert.equal(num(title, 'x'), Math.round(p.x + p.w / 2), 'under the middle of the plot');
      assert.equal(title.getAttribute('text-anchor'), 'middle');
      assert.equal(H, p.bottom + Math.max(56, Math.ceil((2.6 + 1.2) * 14)));
      assert.equal(svg().getAttribute('style'), '--chart-fs: 14px; --chart-fv: 16px;');
    }
    {
      // places each year along the plot, and each amount at its height on the axis
      const p = plotBox();
      const median = pathOf('.mcs-median');
      assert.equal(median.length, 31);
      median.forEach(([x, y], i) => {
        near(x, p.x + (i / 30) * p.w, 0.06, `year ${i} x`);
        near(y, heightOf(exact.bands[i].p50), 0.06, `year ${i} median`);
      });
      for (const [selector, key] of [['.mcs-edge--outer:nth-of-type(3)', 'p90'], ['.mcs-edge--outer:nth-of-type(4)', 'p10'], ['.mcs-edge--inner:nth-of-type(5)', 'p75'], ['.mcs-edge--inner:nth-of-type(6)', 'p25']] as const) {
        pathOf(selector).forEach(([, y], i) => near(y, heightOf(exact.bands[i][key]), 0.06, `${key} year ${i}`));
      }
      pathOf('.mcs-straight').forEach(([, y], i) => near(y, heightOf(exact.straightLine[i]), 0.06, `line year ${i}`));
      assert.equal(one('.mcs-medianGlow').getAttribute('d'), one('.mcs-median').getAttribute('d'));
      assert.ok(one('.mcs-median').getAttribute('d')?.startsWith('M'));
      assert.equal((one('.mcs-median').getAttribute('d')?.match(/M/g) ?? []).length, 1);
    }
    {
      // fills each band between its two edges
      const bands = [...document.querySelectorAll('g[clip-path] > path:not([class])')];
      assert.equal(bands.length, 2);
      const outer = bands[0].getAttribute('d') ?? '';
      assert.ok(outer.endsWith(' Z'));
      const pts = points(outer);
      const hi = pathOf('.mcs-edge--outer:nth-of-type(3)');
      const lo = pathOf('.mcs-edge--outer:nth-of-type(4)');
      assert.deepEqual(pts, [...hi, ...[...lo].reverse()]);
      const inner = points(bands[1].getAttribute('d') ?? '');
      assert.deepEqual(inner, [...pathOf('.mcs-edge--inner:nth-of-type(5)'), ...[...pathOf('.mcs-edge--inner:nth-of-type(6)')].reverse()]);
    }
    {
      // draws gridlines at round steps from nothing to the top, labelled in the unit the heading names
      const p = plotBox();
      assert.equal(one('.tool-chartUnit').textContent, 'Amounts in millions of €');
      const major = [...document.querySelectorAll('line.mcs-grid, line.mcs-axisLine')].filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
      const labels = text('.mcs-axisAmount:not([data-sample])');
      assert.equal(major.length, labels.length);
      assert.equal(major[0].getAttribute('class'), 'mcs-axisLine');
      assert.equal(num(major[0], 'y1'), p.bottom);
      assert.equal(num(major.at(-1)!, 'y1'), p.y, 'the top gridline at the top of the plot');
      for (const l of major) assert.deepEqual([num(l, 'x1'), num(l, 'x2')], [p.x, p.right]);
      const values = labels.map(Number);
      assert.equal(values[0], 0);
      const step = values[1];
      values.forEach((v, i) => near(v, i * step, 1e-9, 'label'));
      major.forEach((l, i) => near(num(l, 'y1'), p.bottom - (i / (major.length - 1)) * p.h, 1e-6, 'gridline'));
      assert.ok(major.length - 1 <= 6, 'at most six steps');
      // The top covers the middle half of every year and the whole 8 in 10 band while saving.
      const highest = Math.max(...exact.bands.map((b) => b.p90), ...exact.straightLine);
      assert.ok(axisTop() >= highest && axisTop() - step * axisUnit() < highest);
      // Each label beside its line, to the left of the plot.
      const drawn = [...document.querySelectorAll('.mcs-axisAmount:not([data-sample])')];
      drawn.forEach((t, i) => {
        assert.equal(t.getAttribute('text-anchor'), 'end');
        near(num(t, 'x'), p.x - 0.6 * 14, 0.051);
        near(num(t, 'y'), num(major[i], 'y1') + 0.35 * 14, 0.051);
      });
      // Minor gridlines halfway between, and on every year that has no label.
      const minor = [...document.querySelectorAll('line.mcs-gridMinor')];
      const minorY = minor.filter((l) => l.getAttribute('x1') === String(p.x) && l.getAttribute('x2') === String(p.right));
      assert.equal(minorY.length, major.length - 1);
      minorY.forEach((l, i) => near(num(l, 'y1'), (num(major[i], 'y1') + num(major[i + 1], 'y1')) / 2, 1e-6, 'minor'));
      const minorX = minor.filter((l) => l.getAttribute('y1') === String(p.y)).map((l) => num(l, 'x1'));
      const xAt = (y: number) => p.x + (y / 30) * p.w;
      assert.deepEqual(minorX, Array.from({ length: 30 }, (_, y) => y).filter((y) => y % 5 !== 0).map(xAt));
      for (const l of minor.filter((m) => m.getAttribute('y1') === String(p.y))) assert.equal(num(l, 'y2'), p.bottom);
      // A gridline for every labelled year after the first.
      const yearLines = [...document.querySelectorAll('line.mcs-grid')].filter((l) => l.getAttribute('x1') === l.getAttribute('x2'));
      assert.deepEqual(yearLines.map((l) => num(l, 'x1')), [5, 10, 15, 20, 25, 30].map(xAt));
      for (const l of yearLines) assert.deepEqual([num(l, 'y1'), num(l, 'y2')], [p.y, p.bottom]);
    }
    {
      // keeps the first and last year labels inside the drawing
      const years = [...document.querySelectorAll('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])')];
      const p = plotBox();
      years.forEach((y, i) => near(num(y, 'x'), p.x + ((i * 5) / 30) * p.w, 1e-6, 'year label'));
      for (const y of years) near(num(y, 'y'), Math.round((p.bottom + 1.4 * 14) * 10) / 10, 1e-9, 'year label height');
      assert.deepEqual(years.map((y) => y.getAttribute('text-anchor')), ['middle', 'middle', 'middle', 'middle', 'middle', 'middle', 'middle']);
    }
    {
      // labels the end of each line with its name and its rounded value, beside the plot
      const p = plotBox();
      const groups = [...document.querySelectorAll('g.mcs-endLabel')];
      assert.deepEqual(groups.map((g) => g.getAttribute('class')), ['mcs-endLabel mcs-endLabel--outer', 'mcs-endLabel mcs-endLabel--median', 'mcs-endLabel mcs-endLabel--outer']);
      assert.deepEqual(groups.map((g) => g.querySelector('.mcs-endName')?.textContent), ['High', 'Median', 'Low']);
      const end = worded.bands[30];
      assert.deepEqual(groups.map((g) => g.querySelector('.mcs-endValue')?.textContent), [end.p90, end.p50, end.p10].map((v) => chartLabelIn(v, 'EUR', t.export.chart, null, 'en')));
      const ends = [exact.bands[30].p90, exact.bands[30].p50, exact.bands[30].p10];
      groups.forEach((g, i) => {
        const dot = g.querySelector('circle')!;
        assert.equal(num(dot, 'cx'), p.right);
        near(num(dot, 'cy'), heightOf(ends[i]), 0.051, 'end dot');
        const label = g.querySelector('text')!;
        assert.equal(num(label, 'x'), p.right + 12);
        assert.equal(num(g.querySelector('.mcs-endValue')!, 'x'), p.right + 12);
        assert.equal(num(g.querySelector('.mcs-endValue')!, 'dy'), Math.round(1.1 * 16 * 10) / 10);
      });
      const ys = groups.map((g) => num(g.querySelector('text')!, 'y'));
      assert.ok(ys[0] < ys[1] && ys[1] < ys[2]);
      // The gutter fits the widest label.
      const widest = Math.max(...groups.flatMap((g) => [`${g.querySelector('.mcs-endName')?.textContent?.replace(/ ↑$/, '')} ↑`.length * 14 * 0.6, (g.querySelector('.mcs-endValue')?.textContent ?? '').length * 16 * 0.6]));
      assert.equal(viewBox()[2] - p.right, Math.max(132, Math.ceil(16 + widest)));
    }
    {
      // a band within the top is not marked
      assert.equal(text('.mcs-endName:not([data-sample])').some((n) => n.includes('↑')), false);
      assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint);
    }
    {
      // a title that fits is drawn at its size, in the middle of the plot
      const title = one('text.mcs-axisTitle:not([data-sample])');
      assert.equal(title.getAttribute('style'), null);
      assert.equal(title.getAttribute('visibility'), null);
    }
    {
      // names its parts, and describes the plan in words
      const s = svg();
      assert.equal(s.getAttribute('role'), 'img');
      const [title, desc] = (s.getAttribute('aria-labelledby') ?? '').split(' ').map((id) => document.getElementById(id));
      assert.equal(title?.textContent, island.chart.title);
      const end = worded.bands[30];
      assert.equal(desc?.textContent, `Fan chart of 100 simulated paths over 30 years. At the end, the 10th percentile is ${money(end.p10)}, the median ${money(end.p50)}, and the 90th percentile ${money(end.p90)}. A single fixed-return line ends at ${money(worded.straightLine[30])}.`);
      assert.equal(one('.mcs-chartBox').getAttribute('aria-label'), island.chart.groupLabel);
      assert.equal(one('.mcs-chartBox').getAttribute('class'), 'mcs-chartBox');
      assert.equal(s.getAttribute('class'), 'mcs-chart');
      assert.equal(one('.mcs-swipe').textContent, island.chart.swipe);
      assert.deepEqual(text('.mcs-legend > span:not(.mcs-legendHint)'), [island.chart.legendPaths, island.chart.legendMiddle, island.chart.legendMedian, island.chart.legendStraight]);
      assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint);
      const fill = (selector: string) => one(selector).getAttribute('fill');
      const bands = [...document.querySelectorAll('g[clip-path] > path:not([class])')];
      assert.equal(bands[0].getAttribute('fill'), `url(#${document.querySelectorAll('linearGradient')[0].id})`);
      assert.equal(bands[1].getAttribute('fill'), `url(#${document.querySelectorAll('linearGradient')[1].id})`);
      assert.equal(fill('.mcs-median'), null);
      assert.equal(one('.mcs-medianGlow').getAttribute('filter'), `url(#${one('filter').id})`);
      assert.equal(one('g[clip-path]').getAttribute('clip-path'), `url(#${one('clipPath').id})`);
    }
    {
      // has no living-off shade without withdrawals
      assert.equal(document.querySelector('rect.mcs-phase'), null);
    }
    {
      // a plan of a multiple of five years ends its table on it once
      await settle(20);
      assert.deepEqual(text('.mcs-table tbody th'), ['0', '5', '10', '15', '20', '25', '30']);
    }
  });

  it('labels short plans every year, and longer ones every five or ten', async () => {
    await drawPlan({ saveYears: 8, paths: 100 });
    assert.deepEqual(yearLabels(), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    assert.ok([...document.querySelectorAll('line.mcs-gridMinor')].every((l) => l.getAttribute('y1') === l.getAttribute('y2')), 'no minor year lines when every year is labelled');
    await retype(island.fields.saveYears, '10');
    assert.equal(yearLabels().length, 11);
    await retype(island.fields.saveYears, '31');
    assert.deepEqual(yearLabels(), ['0', '10', '20', '30']);
    await retype(island.fields.saveYears, '11');
    assert.deepEqual(yearLabels(), ['0', '5', '10']);
  });

  it('spreads end labels that would overlap, with a line back to their point', async () => {
    await drawPlan({ saveYears: 1, stockPct: 0, start: 0, monthly: 10_000, paths: 100 });
    const groups = [...document.querySelectorAll('g.mcs-endLabel')];
    const gap = Math.ceil(14 + 16 + 7);
    const ys = groups.map((g) => num(g.querySelector('text')!, 'y') + 2);
    assert.ok(ys[1] - ys[0] >= gap - 0.05 && ys[2] - ys[1] >= gap - 0.05, `labels ${ys} at least ${gap} apart`);
    const p = plotBox();
    for (const y of ys) assert.ok(y >= p.y + 14 - 0.05 && y <= viewBox()[3] - (viewBox()[3] - p.bottom) - 1.4 * 16 + 0.05, `label ${y} inside`);
    const moved = groups.filter((g) => g.querySelector('.mcs-leader'));
    assert.ok(moved.length >= 1);
    for (const g of groups) {
      const dotY = num(g.querySelector('circle')!, 'cy');
      const labelY = num(g.querySelector('text')!, 'y') + 2;
      const leader = g.querySelector('.mcs-leader');
      assert.equal(Boolean(leader), Math.abs(labelY - dotY) > 4);
      if (leader) {
        assert.deepEqual([num(leader, 'x1'), num(leader, 'y1'), num(leader, 'x2')], [p.right + 5, dotY, p.right + 8]);
        near(num(leader, 'y2'), labelY - 0.4 * 14, 0.051);
      }
    }
  });

  it('a band that runs above the top is cut there, marked, and read without a dot', async () => {
    const { exact } = await drawPlan({ saveYears: 5, withdrawal: 1_000, withdrawYears: 40, start: 500_000, paths: 100 });
    {
      // a band that runs above the top is cut there, its end marked, and the legend says so
      const top = axisTop();
      assert.ok(exact.bands.some((b) => b.p90 > top), 'the case runs above the top');
      const p = plotBox();
      pathOf('.mcs-edge--outer:nth-of-type(3)').forEach(([, y], i) => {
        if (exact.bands[i].p90 > top) assert.equal(y, p.y, `year ${i} at the top`);
      });
      assert.equal(document.querySelector('.mcs-endLabel .mcs-endName')?.textContent, 'High ↑');
      assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint + island.chart.clippedLabels);
      assert.ok(axisTop() >= Math.max(...exact.bands.map((b) => b.p75)));
    }
    {
      // a value above the top gets no dot, as drawn at the edge it would mark the wrong value
      pressOnChart('End');
      const top = axisTop();
      assert.ok(exact.bands[45].p90 > top);
      const classes = [...document.querySelectorAll('.mcs-hoverDot')].map((d) => d.getAttribute('class'));
      assert.equal(classes.filter((c) => c === 'mcs-hoverDot mcs-hoverDot--outer').length, 1);
      assert.equal(classes.includes('mcs-hoverDot mcs-hoverDot--median'), exact.bands[45].p50 <= top);
      assert.equal(classes.includes('mcs-hoverDot mcs-hoverDot--straight'), exact.straightLine[45] <= top);
    }
  });

  it('shades the years of living off it, and names them where there is room', async () => {
    await drawPlan({ saveYears: 10, withdrawal: 20_000, withdrawYears: 20, paths: 100 });
    const p = plotBox();
    const phase = one('rect.mcs-phase');
    const xAt = (y: number) => p.x + (y / 30) * p.w;
    near(num(phase, 'x'), xAt(10), 1e-6);
    near(num(phase, 'width'), p.right - xAt(10), 1e-6);
    assert.deepEqual([num(phase, 'y'), num(phase, 'height')], [p.y, p.h]);
    const label = one('.mcs-phaseLabel');
    assert.equal(label.textContent, island.chart.livingOff);
    near(num(label, 'x'), xAt(10) + 10, 1e-6);
    assert.equal(num(label, 'y'), Math.round((p.y + 1.4 * 14) * 10) / 10);
    // With nothing saved first, withdrawing from the start shades it all.
    await retype(island.fields.saveYears, '0');
    near(num(one('rect.mcs-phase'), 'x'), plotBox().x, 1e-6);
  });

  it('leaves the name out where the years of living off it are too narrow', async () => {
    await drawPlan({ saveYears: 28, withdrawal: 20_000, withdrawYears: 2, paths: 100 });
    assert.ok(document.querySelector('rect.mcs-phase'));
    assert.equal(document.querySelector('.mcs-phaseLabel'), null);
  });

});

/** A phone's width, as the page asks for it, for the length of `run`. */
async function onPhone(run: (changes: { listeners: Array<() => void>; removed: number }) => Promise<void>) {
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

describe('the chart, on a phone', () => {
  it('is drawn for the phone’s width, without end labels or the swipe hint, and follows the width', async () => {
    await onPhone(async (changes) => {
      const { exact, unmount } = await drawPlan({ saveYears: 30, paths: 100 });
      assert.ok(changes.listeners.length >= 1, 'it listens for the screen changing width');
      const [, , W, H] = viewBox();
      assert.equal(W, 360);
      const p = plotBox();
      assert.equal(p.h, 270 - 18 - 50);
      assert.equal(p.y, 18);
      assert.equal(W - p.right, 14);
      assert.equal(H, p.bottom + Math.max(50, Math.ceil((2.6 + 1.2) * 14)));
      assert.equal(svg().getAttribute('class'), 'mcs-chart mcs-chart--narrow');
      assert.equal(one('.mcs-chartBox').getAttribute('class'), 'mcs-chartBox mcs-chartBox--scrub');
      assert.equal(document.querySelector('.mcs-swipe'), null);
      assert.equal(document.querySelectorAll('.mcs-endLabel text').length, 0);
      assert.equal(document.querySelectorAll('.mcs-leader').length, 0);
      const ends = [exact.bands[30].p90, exact.bands[30].p50, exact.bands[30].p10];
      const dots = [...document.querySelectorAll('.mcs-endLabel circle')];
      assert.equal(dots.length, 3);
      dots.forEach((d, i) => near(num(d, 'cy'), heightOf(ends[i]), 0.051));
      pathOf('.mcs-median').forEach(([x, y], i) => {
        near(x, p.x + (i / 30) * p.w, 0.06);
        near(y, heightOf(exact.bands[i].p50), 0.06);
      });
      unmount();
      assert.ok(changes.removed >= 1, 'and stops when it goes');
    });
  });

  it('a value above the top gets no end dot, and the legend says to tap for it', async () => {
    await onPhone(async () => {
      const { exact } = await drawPlan({ saveYears: 5, withdrawal: 1_000, withdrawYears: 40, start: 500_000, paths: 100 });
      assert.ok(exact.bands[45].p90 > axisTop());
      assert.equal(document.querySelectorAll('.mcs-endLabel circle').length, 2);
      assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint + island.chart.clippedPhone);
    });
  });

  it('labels every other year where every year would crowd, with no minor year lines between', async () => {
    await onPhone(async () => {
      await drawPlan({ saveYears: 10, paths: 100 });
      const years = text('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');
      assert.deepEqual(years, ['0', '2', '4', '6', '8', '10']);
      assert.ok([...document.querySelectorAll('line.mcs-gridMinor')].every((l) => l.getAttribute('y1') === l.getAttribute('y2')));
    });
  });

});

describe('reading a year off the chart', () => {
  const box = () => one('.mcs-chartBox');
  const readoutTitle = () => document.querySelector('.chart-readoutTitle');
  const announced = () => one('.mcs-chartBox .mcs-srOnly').textContent;
  const press = (key: string) => fireEvent.keyDown(box(), { key });

  it('arrow keys step through the years, and say each one', async () => {
    const { exact, worded } = await drawPlan({ saveYears: 3, withdrawal: 20_000, withdrawYears: 4, paths: 100 });
    assert.equal(readoutTitle(), null);
    assert.equal(announced(), '');
    assert.ok(document.querySelector('.chart-readoutSlot') === null);
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseStart);
    const b = worded.bands[0];
    assert.equal(announced(), `Year 0, start. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[0])}.`);
    press('ArrowRight');
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 2');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseSaving);
    const y2 = worded.bands[2];
    assert.deepEqual([...document.querySelectorAll('.chart-readout dd')].map((d) => d.textContent), [money(y2.p90), `${money(y2.p25)} to ${money(y2.p75)}`, money(y2.p50), money(y2.p10), money(worded.straightLine[2])]);
    assert.deepEqual([...document.querySelectorAll('.chart-readout dt')].map((d) => d.textContent), [island.chart.readoutHigh, island.chart.readoutMiddle, island.chart.readoutMedian, island.chart.readoutLow, island.chart.readoutStraight]);
    // Each line's swatch in the colour and shape the chart draws it with.
    assert.deepEqual(
      [...document.querySelectorAll<HTMLElement>('.chart-readout .chart-swatch')].map((el) => [el.className, el.style.color]),
      [
        ['chart-swatch chart-swatch--dot', 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))'],
        ['chart-swatch chart-swatch--band', 'color-mix(in srgb, var(--color-deep-blue) 34%, transparent)'],
        ['chart-swatch chart-swatch--dot', 'var(--color-deep-blue)'],
        ['chart-swatch chart-swatch--dot', 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))'],
        ['chart-swatch chart-swatch--dot', 'var(--color-teal)'],
      ],
    );
    press('ArrowRight');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseSaving, 'the last year of saving');
    press('ArrowRight');
    assert.equal(one('.chart-readoutTag').textContent, 'Withdrawing, year 1');
    assert.ok(announced()?.startsWith('Year 4, withdrawing, year 1. '));
    press('End');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7');
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7', 'it stops at the last year');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 6');
    press('Home');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0', 'and at the first');
    press('Escape');
    assert.equal(readoutTitle(), null);
    assert.equal(announced(), '');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7', 'left from nothing starts at the end');
    void exact;
  });

  it('keys, focus, the mouse and Escape on a four-year plan', async () => {
    const { exact, worded } = await drawPlan({ saveYears: 4, paths: 100 });
    {
      // other keys leave it alone, and the arrows keep the page from scrolling
      const ignored = fireEvent.keyDown(box(), { key: 'a' });
      assert.equal(ignored, true);
      assert.equal(readoutTitle(), null);
      const handled = fireEvent.keyDown(box(), { key: 'ArrowRight' });
      assert.equal(handled, false);
      const escape = fireEvent.keyDown(box(), { key: 'Escape' });
      assert.equal(escape, true);
    }
    {
      // a plan without withdrawals names no phase
      press('End');
      assert.equal(document.querySelector('.chart-readoutTag'), null);
      const b = worded.bands[4];
      assert.equal(announced(), `Year 4. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[4])}.`);
      press('Escape');
    }
    {
      // marks the year read with a line and a dot on each value
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight');
      const p = plotBox();
      const x = p.x + (2 / 4) * p.w;
      const line = one('.mcs-hoverLine');
      assert.deepEqual([num(line, 'x1'), num(line, 'x2'), num(line, 'y1'), num(line, 'y2')], [x, x, p.y, p.bottom]);
      assert.equal(one('.mcs-hover').getAttribute('pointer-events'), 'none');
      const dots = [...document.querySelectorAll('.mcs-hoverDot')];
      assert.deepEqual(dots.map((d) => d.getAttribute('class')), ['mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--straight', 'mcs-hoverDot mcs-hoverDot--median']);
      const b = exact.bands[2];
      [b.p90, b.p10, exact.straightLine[2], b.p50].forEach((v, i) => {
        assert.equal(num(dots[i], 'cx'), x);
        near(num(dots[i], 'cy'), heightOf(v), 1e-6, `dot ${i}`);
      });
      assert.deepEqual(dots.map((d) => d.getAttribute('r')), ['5', '5', '5', '6']);
    }
    {
      // leaving the chart, by focus or by mouse, puts the read-out away; a finger lifting does not
      press('ArrowRight');
      fireEvent.blur(box());
      assert.equal(readoutTitle(), null);
      press('ArrowRight');
      fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'touch' });
      assert.ok(readoutTitle());
      fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'mouse' });
      assert.equal(readoutTitle(), null);
    }
    {
      // Escape anywhere puts the read-out away
      press('ArrowRight');
      fireEvent.keyDown(window, { key: 'Escape' });
      assert.equal(readoutTitle(), null);
    }
  });

  it('the read-out: beside the crosshair, and read by a pointer', async () => {
    const proto = window.HTMLElement.prototype;
    const real = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get(this: HTMLElement) { return this.classList.contains('chart-readout') ? 200 : 0; } });
    try {
      await drawPlan({ saveYears: 10, paths: 100 });
      assert.equal(document.querySelector('.chart-readoutSlot'), null, 'no empty slot while it is closed');
      const figure = one('.mcs-figure');
      Object.defineProperty(figure, 'clientWidth', { configurable: true, value: 760 });
      (svg() as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 0, top: 0, width: 760, height: 398, right: 760, bottom: 398, x: 0, y: 0 });
      const p = plotBox();
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'Home' });
      await act(async () => {});
      const card = one('.chart-readout');
      assert.equal(parseFloat(card.style.left), p.x + 14);
      assert.equal(parseFloat(card.style.top), 8);
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'End' });
      await act(async () => {});
      assert.equal(parseFloat(one('.chart-readout').style.left), p.right - 14 - 200);
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      await act(async () => {});
      const x7 = p.x + 0.7 * p.w;
      near(parseFloat(one('.chart-readout').style.left), x7 + 14 + 200 > p.right ? x7 - 214 : x7 + 14, 0.01);
      {
        // a pointer reads the year under it, and nothing beyond the plot
      const s = svg();
        // Shown at its own width, from the left edge of the window.
        (s as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 0, top: 0, width: 760, height: 398, right: 760, bottom: 398, x: 0, y: 0 });
        const p = plotBox();
        const at = (y: number) => p.x + (y / 10) * p.w;
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(4) + 3 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 4');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(7) - 35 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 6');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.x - 11 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0', 'just left of the plot still reads its first year');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.right + 11 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 10');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.x - 13 });
        assert.equal(readoutTitle(), null);
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(2) });
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.right + 13 });
        assert.equal(readoutTitle(), null);
      }
      {
        // reads the same year when the chart is drawn at another size or place
      const s = svg();
        (s as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 100, top: 0, width: 380, height: 199, right: 480, bottom: 199, x: 100, y: 0 });
        const p = plotBox();
        const at = (y: number) => 100 + ((p.x + (y / 10) * p.w) / 760) * 380;
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(3) });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 3');
      }
    } finally {
      if (real) Object.defineProperty(proto, 'offsetWidth', real);
    }
  });

});

/** The reader's text size, as the root font size, with the chart shown at its own width, for the length of `run`. */
async function atTextSize(px: number, run: () => Promise<void>) {
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

describe('the chart at larger text', () => {
  it('at twice the size: larger text, the same plot, no minor gridlines', async () => {
    await atTextSize(32, async () => {
      await drawPlan({ saveYears: 30, paths: 100 });
      assert.equal(svg().getAttribute('style'), '--chart-fs: 28px; --chart-fv: 32px;');
      const p = plotBox();
      assert.equal(p.h, 324);
      assert.equal(document.querySelectorAll('line.mcs-gridMinor').length, 0);
      const major = [...document.querySelectorAll('line.mcs-grid, line.mcs-axisLine')].filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
      assert.ok(major.length - 1 <= Math.min(6, 324 / (1.8 * 28)), 'fewer gridlines as the text grows');
      const H = viewBox()[3];
      assert.ok(H - p.bottom >= Math.ceil((2.6 + 1.2) * 28), 'room under the plot for the years and the title');
      const title = one('text.mcs-axisTitle:not([data-sample])');
      near(num(title, 'y'), Math.round((p.bottom + 3 * 28) * 10) / 10, 1e-9);
    });
  });

  it('just under twice the size keeps the minor gridlines', async () => {
    await atTextSize(31, async () => {
      await drawPlan({ saveYears: 30, paths: 100 });
      assert.ok(document.querySelectorAll('line.mcs-gridMinor').length > 0);
    });
  });

  it('at four times the size on a phone: amounts move inside the plot, above their lines, and the title wraps', async () => {
    await onPhone(async () => {
      await atTextSize(64, async () => {
        // Gridlines at 2.5 and 5 million: labels wide enough to need the room.
        await drawPlan({ saveYears: 40, paths: 100 });
        const fs = 0.875 * 64;
        const p = plotBox();
        assert.equal(p.x, 22, 'the margin shrinks to its least');
        assert.equal(p.y, Math.max(18, Math.ceil(1.4 * fs)), 'room above for the top label');
        const inside = [...document.querySelectorAll('.mcs-axisAmount--inside:not([data-sample])')];
        assert.ok(inside.length > 0);
        const major = [...document.querySelectorAll('line.mcs-grid, line.mcs-axisLine')].filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
        assert.equal(inside.length, major.length - 1, 'every gridline but the bottom one');
        inside.forEach((t, i) => {
          assert.equal(t.getAttribute('text-anchor'), 'start');
          assert.equal(num(t, 'x'), p.x + 6);
          near(num(t, 'y'), num(major[i + 1], 'y1') - 0.3 * fs, 0.051);
        });
        const lines = [...document.querySelectorAll('text.mcs-axisTitle:not([data-sample]) tspan')];
        assert.ok(lines.length > 1, 'the axis title takes more than one line');
        assert.equal(lines.map((l) => l.textContent).join(' '), island.chart.axisYears);
        assert.equal(lines[0].getAttribute('dy'), '0');
        assert.equal(Number(lines[1].getAttribute('dy')), Math.round(1.2 * fs * 10) / 10);
        const H = viewBox()[3];
        assert.equal(H - p.bottom, Math.max(50, Math.ceil((2.6 + 1.2 * lines.length) * fs)));
        assert.equal(document.querySelector('.mcs-phaseLabel'), null);
      });
    });
  });

  it('a long axis title on a phone is drawn smaller to fit, and left out below the least size', async () => {
    const strings = { ...island, chart: { ...island.chart, axisYears: 'Yearsfromtodaywrittenasoneverylongwordwithoutanyspace' } };
    await onPhone(async () => {
      render(<MonteCarloSimulator strings={strings} exportStrings={t.export} netWorthHref="/" defaultCurrency="EUR" amountLocale={null} numberLocale="en" initialResult={STARTING_RESULT} />);
      await settle(20);
      const title = one('text.mcs-axisTitle:not([data-sample])');
      const width = strings.chart.axisYears.length * 14 * 0.6;
      const fit = (360 - 4) / width;
      near(parseFloat(title.style.fontSize), 14 * fit, 0.001, 'title size');
      assert.equal(title.getAttribute('visibility'), fit < 0.75 / 0.875 ? 'hidden' : null);
      const half = (fit * width) / 2 + 2;
      assert.equal(num(title, 'x'), Math.round(Math.min(Math.max(plotBox().x + plotBox().w / 2, half), 360 - half)));
    });
  });

});

describe('the starting result', () => {
  // A result the starting plan would never give, so it shows which was drawn.
  const given = simulate({ ...defaultState('EUR'), start: 123_456 });
  const median = (r: SimulationResult) => money(roundedResult(r).atRetirement.p50);

  it('an ordinary load draws the one the page worked out, and does not work it out again', async () => {
    mountWith({ initialResult: given });
    await settle();
    assert.notEqual(median(given), median(STARTING_RESULT));
    assert.equal(one('.mcs-quickValue').textContent, median(given));
    assert.equal(heading().textContent, 'After 30 years of saving');
  });

  it('a shared plan replaces it with its own', async () => {
    const { plan } = openPlan({ saveYears: 5, paths: 100 }, { initialResult: given });
    await settle(20);
    assert.equal(one('.mcs-quickValue').textContent, median(simulate(plan)));
  });

  it('a shared plan whose boxes read differently shows what the boxes say', async () => {
    w[SHARED_STATE_GLOBAL] = 's=0000000000000001&n=100';
    mountWith({ initialResult: given });
    await settle();
    assert.equal(one('.mcs-quickValue').textContent, median(simulate({ ...DEFAULTS, start: 1, paths: 100 })));
  });
});

describe('a shared plan', () => {
  it('opens with its boxes and its results, and is counted with where it came from', async () => {
    window.history.replaceState(null, '', '/free/monte-carlo-simulator/?utm_source=share');
    try {
      const { plan } = openPlan({ start: 20_000, monthly: 300, saveYears: 12, paths: 1_000 });
      await settle(20);
      assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '20000');
      assert.equal(heading().textContent, 'After 12 years of saving');
      const worded = roundedResult(simulate(plan));
      assert.deepEqual(text('.mcs-cardValue'), [money(worded.atRetirement.p10), money(worded.atRetirement.p50), money(worded.atRetirement.p90)]);
      assert.deepEqual(events.filter(([e]) => e === 'free_monte_carlo_shared_view_opened'), [['free_monte_carlo_shared_view_opened', { utm_source: 'share' }]]);
    } finally {
      window.history.replaceState(null, '', '/free/');
    }
  });

  it('arriving by a language switch is not counted again, and a plain one keeps the settings folded', async () => {
    Object.defineProperty(document, 'referrer', { value: 'https://nidhi.today/hi/free/', configurable: true });
    try {
      openPlan({ start: 20_000 });
      await settle(20);
      assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '20000');
      assert.deepEqual(events, []);
      // that changes neither a fee nor the run count keeps them folded
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
      assert.ok(!one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
    } finally {
      Object.defineProperty(document, 'referrer', { value: '', configurable: true });
    }
  });

  it('a link without a plan opens the page as it starts', async () => {
    w[SHARED_STATE_GLOBAL] = 'utm_source=share';
    mountWith();
    await settle(20);
    assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '50000');
    assert.deepEqual(events, []);
  });

  it('boxes that arrived unreadable say so, keep the results back, and open what they need', async () => {
    w[SHARED_STATE_GLOBAL] = 's=NaN&y=10&f=NaN&k=NaN';
    mountWith();
    await settle(20);
    {
      // a box that arrived unreadable says so, and keeps the results back
      const box = screen.getByLabelText(island.fields.start);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.equal(screen.getAllByText(`Error: ${t.export.fieldUnreadable}`).length, 2);
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.ifc-example').textContent, '');
    }
    {
      // with a fee box that cannot be read shows the fees too
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
      assert.equal(one('.mcs-settingsValue').textContent, '?% fees · 10,000 paths');
    }
    {
      // a mix that arrived unreadable shows as unknown, the slider at the default
      const slider = screen.getByRole('slider') as HTMLInputElement;
      assert.equal(document.querySelector(`label[for="${slider.id}"]`)?.textContent, 'Mix: ?% stocks, ?% bonds');
      assert.equal(slider.value, '80');
      assert.equal(one('.mcs-mix .mcs-hint').textContent, island.fields.mixHint);
    }
    {
      // an unreadable box retyped wrong says the range instead
      const box = await typeInto(island.fields.start, '-3');
      assert.equal(describedBy(box)[0], 'Error: Enter an amount from 0 to 1,000,000,000,000.');
    }
  });

  it('with a box out of range says the range, not that the box cannot be read', async () => {
    w[SHARED_STATE_GLOBAL] = 's=-5';
    mountWith();
    await settle(20);
    const box = screen.getByLabelText(island.fields.start) as HTMLInputElement;
    assert.equal(box.value, '-5');
    assert.equal(box.getAttribute('aria-invalid'), 'true');
    assert.equal(describedBy(box)[0], 'Error: Enter an amount from 0 to 1,000,000,000,000.');
  });

  for (const [name, change] of [['a fee', { feePct: 0.5 }], ['a run count', { paths: 1_000 }]] as const) {
    it(`that sets ${name} shows the fees and paths without a click`, async () => {
      openPlan(change);
      await settle(20);
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
    });
  }

});

describe('the page as it starts', () => {
  it('says, offers and describes what it should, and counts nothing', async () => {
    const { container } = mountWith({ netWorthHref: '/hi/free/multi-currency-net-worth/' });
    await settle(20);
    {
      // an untouched page counts nothing and publishes nothing to carry
      assert.deepEqual(events, []);
      assert.equal(w[SHARED_STATE_GLOBAL], '');
      assert.equal(heading().textContent, 'After 30 years of saving');
      assert.equal(one('.ifc-example').textContent, island.example);
    }
    {
      // describes each setting with the rates it runs at
      assert.deepEqual(text('.mcs-tip').map((s) => s.match(/[\d.]+%/g)), [['4%', '1%'], ['5.3%', '1.7%'], ['6%', '3%']]);
    }
    {
      // ten thousand runs or more carry no warning
      assert.ok(!one('.mcs-caveat').textContent?.includes('With only'));
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
    }
    {
      // a valid box points only at its hint, and a box without one at nothing
      assert.deepEqual(describedBy(screen.getByLabelText(island.fields.start)), [island.fields.startHint]);
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-describedby'), null);
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-invalid'), null);
    }
    {
      // a box of years asks for whole numbers, an amount box for decimals
      assert.equal(screen.getByLabelText(island.fields.saveYears).getAttribute('inputmode'), 'numeric');
      assert.equal(screen.getByLabelText(island.fields.start).getAttribute('inputmode'), 'decimal');
      assert.equal(screen.getByLabelText(island.fields.start).getAttribute('autocomplete'), 'off');
    }
    {
      // the fee box says its range in its hint
      const box = screen.getByLabelText(island.settings.feeLabel);
      assert.equal(document.getElementById(box.getAttribute('aria-describedby') ?? '')?.textContent, "Fund and platform fees, taken off every year's return. 0 to 5.");
      assert.equal(screen.getByLabelText(island.settings.pathsLabel).getAttribute('aria-describedby'), `${screen.getByLabelText(island.settings.pathsLabel).id}-hint`);
      assert.equal(document.getElementById(`${screen.getByLabelText(island.settings.pathsLabel).id}-hint`)?.textContent, island.settings.pathsHint);
    }
    {
      // each return setting is described by its own tooltip
      for (const r of screen.getAllByRole('radio')) {
        const tip = document.getElementById(r.getAttribute('aria-describedby') ?? '');
        assert.equal(tip?.getAttribute('role'), 'tooltip');
        assert.ok(tip?.textContent);
      }
      const names = new Set(screen.getAllByRole('radio').map((r) => r.getAttribute('name')));
      assert.equal(names.size, 1, 'one group');
    }
    {
      // submitting the form does not leave the page
      const submitted = fireEvent.submit(screen.getByRole('form', { name: island.formLabel }));
      assert.equal(submitted, false);
    }
    {
      // the tool cannot be used until it has started, then can
      assert.equal(one('.mcs-root').getAttribute('aria-busy'), null);
      assert.ok(container.querySelector('form[aria-label="Your plan"]'));
    }
    {
      // links to the net worth calculator the page names
      assert.equal(screen.getByRole('link', { name: island.fields.crossLink.link }).getAttribute('href'), '/hi/free/multi-currency-net-worth/');
    }
    {
      // the jump button takes the reader to the full result
      const h = heading();
      let scrolled: unknown = null;
      (h as unknown as Record<string, unknown>).scrollIntoView = (o: unknown) => { scrolled = o; };
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: island.quick.jump }));
      assert.deepEqual(scrolled, { block: 'start' });
      assert.equal(document.activeElement, h);
    }
  });

});

describe('the choices', () => {
  it('a return setting, the descriptions and the mix', async () => {
    mountWith();
    {
      // a return setting is counted, marked and described under the switch
      const user = userEvent.setup();
      await user.click(radio('cautious'));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_returns_changed', { setting: 'cautious' }]);
      assert.equal((radio('cautious') as HTMLInputElement).checked, true);
      assert.deepEqual(text('.mcs-switchOpt--on span:first-of-type'), [island.returns.cautious]);
      const tip = 'Stocks grow about 4% a year after inflation and bonds about 1%: the low end of the long-run range. The ups and downs are as large as in history.';
      assert.equal(one('.mcs-switch > .mcs-hint').textContent, tip);
    }
    {
      // Escape hides the setting descriptions until the pointer or focus leaves the switch
      const fieldset = one('.mcs-switch');
      const user = userEvent.setup();
      await user.keyboard('{Shift}');
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
      await user.keyboard('{Escape}');
      assert.ok(fieldset.classList.contains('mcs-switch--tipsOff'));
      fireEvent.mouseLeave(fieldset);
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
      await user.keyboard('{Escape}');
      const radios = screen.getAllByRole('radio');
      fireEvent.blur(fieldset, { relatedTarget: radios[1] });
      assert.ok(fieldset.classList.contains('mcs-switch--tipsOff'), 'focus moving within the switch keeps them hidden');
      fireEvent.blur(fieldset, { relatedTarget: document.body });
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
    }
    {
      // the mix names both shares, and says the default is only an example
      const label = () => document.querySelector(`label[for="${screen.getByRole('slider').id}"]`)?.textContent;
      assert.equal(label(), 'Mix: 80% stocks, 20% bonds');
      assert.ok(one('.mcs-mix .mcs-hint').textContent?.includes('80% stocks is an example value'));
      fireEvent.change(screen.getByRole('slider'), { target: { value: '65' } });
      assert.equal(label(), 'Mix: 65% stocks, 35% bonds');
      assert.equal(one('.mcs-mix .mcs-hint').textContent, island.fields.mixHint);
    }
  });

  it('the run count and the rates, in a page\u2019s own number styles', async () => {
    mountWith({ numberLocale: 'de', amountLocale: 'es' });
    {
      // writes the rates in a page’s own style where it has one
      assert.deepEqual(text('.mcs-tip').map((s) => s.match(/[\d,]+\s%/g)?.map((m) => m.replace(/\s/, ' '))), [['4 %', '1 %'], ['5,3 %', '1,7 %'], ['6 %', '3 %']]);
    }
    {
      // the run count is counted, summarised and warned about when it is small
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(island.settings.pathsLabel), '1000');
      assert.deepEqual(events.at(-1), ['free_monte_carlo_runs_changed', { runs: 1_000 }]);
      assert.equal(one('.mcs-settingsValue').textContent, '0% fees · 1.000 paths');
      await settle();
      assert.ok(one('.mcs-caveat').textContent?.includes(' With only 1.000 paths'));
      assert.deepEqual(text(`#${CSS.escape(screen.getByLabelText(island.settings.pathsLabel).id)} option`), ['100', '1.000', '10.000', '100.000']);
    }
  });

  it('the fee: summarised as typed, and kept open while wrong', async () => {
    mountWith();
    {
      // the fee is summarised as typed, to two places
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: island.settings.toggle }));
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      const box = screen.getByLabelText(island.settings.feeLabel);
      await user.clear(box);
      await user.type(box, '0.257');
      assert.equal(one('.mcs-settingsValue').textContent, '0.26% fees · 10,000 paths');
      await user.click(screen.getByRole('button', { name: island.settings.toggle }));
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
    }
    {
      // a wrong fee keeps the fold open and says what to type
      const user = userEvent.setup();
      const box = screen.getByLabelText(island.settings.feeLabel);
      await user.clear(box);
      await user.type(box, '9');
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
      assert.ok(screen.getByText('Error: Enter a percentage from 0 to 5.'));
      assert.equal(one('.mcs-settingsValue').textContent, '?% fees · 10,000 paths');
    }
  });

  it('withdrawals: switched on and off, counted, even when analytics fail, and their boxes', async () => {
    const { unmount } = mountWith();
    {
      // withdrawals switch on with their boxes, and are counted
      assert.ok(screen.getByText(island.withdraw.off));
      assert.equal(screen.queryByLabelText(island.withdraw.amountLabel), null);
      const user = userEvent.setup();
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_withdrawal_toggled', { on: true }]);
      assert.equal(screen.queryByText(island.withdraw.off), null);
      assert.equal((screen.getByLabelText(island.withdraw.amountLabel) as HTMLInputElement).value, '30000');
      assert.equal((screen.getByLabelText(island.withdraw.yearsLabel) as HTMLInputElement).value, '30');
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_withdrawal_toggled', { on: false }]);
    }
    const user = userEvent.setup();
    {
      // analytics that fail never stop the page
      w.posthog = { capture: () => { throw new Error('blocked'); } };
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.ok(screen.getByLabelText(island.withdraw.amountLabel));
      delete w.posthog;
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.equal(screen.queryByLabelText(island.withdraw.amountLabel), null);
      w.posthog = {};
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.ok(screen.getByLabelText(island.withdraw.amountLabel));
    }
    {
      // the withdrawal boxes say their own ranges
      let box = await typeInto(island.withdraw.amountLabel, '0');
      assert.deepEqual(describedBy(box), ['Error: Enter an amount from 1 to 100,000,000,000.', island.withdraw.amountHint]);
      box = await typeInto(island.withdraw.yearsLabel, '0');
      assert.deepEqual(describedBy(box), ['Error: Enter a whole number of years from 1 to 60.', island.withdraw.yearsHint]);
    }
    {
      // Escape stops hiding them once the simulator is gone
      unmount();
      await user.keyboard('{Escape}');
    }
  });

  it('a currency is counted and redraws the results; reset brings back the starting plan', async () => {
    openPlan({ start: 20_000, feePct: 1, currency: 'INR', paths: 100, saveYears: 5 }, { defaultCurrency: 'GBP' });
    await settle(20);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'USD');
    await settle();
    assert.deepEqual(events.at(-1), ['free_monte_carlo_currency_changed', { currency: 'USD' }]);
    const worded = roundedResult(simulate({ ...DEFAULTS, start: 20_000, feePct: 1, paths: 100, saveYears: 5 }));
    assert.equal(text('.mcs-cardValue')[1], money(worded.atRetirement.p50, 'USD'));
    await user.click(screen.getByRole('button', { name: island.actions.reset }));
    assert.deepEqual(events.at(-1), ['free_monte_carlo_reset', undefined]);
    assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '50000');
    assert.equal((screen.getByLabelText(island.fields.currency) as HTMLSelectElement).value, 'GBP');
    assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
    assert.equal(one('.ifc-example').textContent, island.example);
    assert.ok(text('.mcs-cardValue')[1].startsWith('£'));
  });

});

/** Chooses how many paths to run, and lets the plan settle. */
async function choosePaths(n: string) {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText(island.settings.pathsLabel), n);
  await settle();
}

describe('the results in words', () => {
  it('saving and then withdrawing: the quick answer, the cards, both answers and the printed report', async () => {
    const { plan } = openPlan({ saveYears: 7, withdrawal: 30_000, withdrawYears: 20, paths: 1_000 });
    await settle(20);
    const r = roundedResult(simulate(plan)).atRetirement;
    assert.equal(one('.mcs-quickTitle').textContent, 'Median after 7 years');
    assert.equal(one('.mcs-quickValue').textContent, money(r.p50));
    assert.equal(one('.mcs-quick .mcs-quickRange').textContent, `8 in 10 paths between ${money(r.p10)} and ${money(r.p90)}`);
    assert.equal(one('.mcs-quick').getAttribute('aria-hidden'), 'true');
    assert.deepEqual(text('.mcs-cardLabel'), [island.results.lowLabel + island.results.lowMore, island.results.medianLabel + island.results.medianMore, island.results.highLabel + island.results.highMore]);
    assert.equal(text('.mcs-quick .mcs-quickRange').length, 2);
    assert.ok(document.querySelector('.mcs-lastedHead'));
    assert.ok(document.querySelector('.mcs-cards'));
    const report = one('.tool-report');
    assert.equal(report.querySelector('.tool-reportTitle')?.textContent, island.export.tool);
    assert.deepEqual([...report.querySelectorAll('.tool-reportBlock')[0].querySelectorAll('p')].map((p) => p.textContent), [
      `Median after 7 years: ${money(r.p50)}`,
      `8 in 10 paths between ${money(r.p10)} and ${money(r.p90)}`,
      one('.mcs-quick .mcs-quickRange:last-child').textContent,
    ]);
    assert.ok(report.textContent?.includes(`${t.export.about.currency}: EUR`));
  });

  it('saving only: the single line, the table, one year, and no years at all', async () => {
    const { plan } = openPlan({ saveYears: 10, paths: 1_000 });
    await settle(20);
    {
      // the single line and the share of paths below it
      const exact = simulate(plan);
      const worded = roundedResult(exact);
      const note = one('.mcs-note');
      assert.equal(note.querySelector('strong')?.textContent, money(worded.straightLine[10]));
      assert.equal(note.textContent, `${island.results.noteBefore} ${money(worded.straightLine[10])}. ${Math.round(exact.belowStraightLine * 100)}% of the simulated paths ended below it.`);
    }
    {
      // the table lists every fifth year and the last, each amount under its column
      await retype(island.fields.saveYears, '12');
      const worded = roundedResult(simulate({ ...plan, saveYears: 12 }));
      const rows = [...document.querySelectorAll('.mcs-table tbody tr')];
      assert.deepEqual(rows.map((r) => r.querySelector('th')?.textContent), ['0', '5', '10', '12']);
      assert.deepEqual([...rows[1].querySelectorAll('td')].map((c) => c.textContent), [worded.bands[5].p10, worded.bands[5].p50, worded.bands[5].p90, worded.straightLine[5]].map((v) => money(v)));
      assert.deepEqual([...rows[1].querySelectorAll('td')].map((c) => c.getAttribute('data-label')), [island.results.tableLow, island.results.tableMedian, island.results.tableHigh, island.results.tableStraight]);
      assert.deepEqual(text('.mcs-table thead th'), [island.results.tableYear, island.results.tableLow, island.results.tableMedian, island.results.tableHigh, island.results.tableStraight]);
      assert.equal(one('.mcs-table caption').textContent, island.results.tableCaption);
    }
    {
      // opening the table is counted, closing it is not
      const details = one('.mcs-tableWrap') as HTMLDetailsElement;
      details.open = true;
      fireEvent(details, new window.Event('toggle'));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_table_opened', undefined]);
      details.open = false;
      fireEvent(details, new window.Event('toggle'));
      assert.equal(events.filter(([e]) => e === 'free_monte_carlo_table_opened').length, 1);
    }
    {
      // one year of saving has words of its own
      await retype(island.fields.saveYears, '1');
      assert.equal(heading().textContent, island.results.headingOne);
      assert.equal(one('.mcs-quickTitle').textContent, island.quick.medianOne);
    }
    {
      // no saving and no withdrawals: nothing to spread, said once
      await retype(island.fields.saveYears, '0');
      assert.equal(heading().textContent, island.results.headingToday);
      assert.equal(document.querySelector('.mcs-quick'), null);
      assert.equal(document.querySelector('.mcs-cards'), null);
      assert.deepEqual(text('.mcs-note'), [island.results.empty]);
      assert.equal(document.querySelector('.mcs-figure'), null);
      assert.equal(document.querySelector('.mcs-tableWrap'), null);
      assert.ok(screen.getByText(island.results.empty, { selector: '.tool-reportBlock p' }));
    }
  });

  it('writes the share below the line, and a one-year report, in a page’s own style', async () => {
    const { plan } = openPlan({ saveYears: 10, paths: 1_000 }, { amountLocale: 'es' });
    await settle(20);
    const share = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 }).format(simulate(plan).belowStraightLine);
    assert.ok(one('.mcs-note').textContent?.endsWith(`. ${share} of the simulated paths ended below it.`));
    await retype(island.fields.saveYears, '1');
    assert.ok(one('.tool-reportLead').textContent?.startsWith(`${island.quick.medianOne}: `));
  });

  it('withdrawals: how often the money lasted, in every case the words differ', async () => {
    openPlan(drawdown(30_000));
    await settle(20);
    {
      // lasting in some paths: the share, in tenths and in percent, and when it ran out
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(30_000)} a year, the money lasted all 30 years in 6 in 10 simulated paths (58%).`);
      assert.equal(one('.mcs-lastedHead strong').textContent, '6 in 10');
      assert.equal(one('.mcs-lasted .mcs-note').textContent, 'Among the paths where it ran out, the median year it did so was year 21 of 30.');
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money lasted all 30 years in 6 in 10 paths.');
      assert.equal(document.querySelector('.mcs-quickTitle'), null, 'no saving, no median of it');
      assert.equal(document.querySelector('.mcs-cards'), null);
    }
    {
      // nearly every path: more than 9 in 10, never all
      await retype(island.withdraw.amountLabel, '16000');
      assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenMore);
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(95%).'));
    }
    {
      // nearly no path: fewer than 1 in 10
      await retype(island.withdraw.amountLabel, '60000');
      assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenFewer);
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(2%).'));
    }
    {
      // every path lasting, and none
      await retype(island.withdraw.amountLabel, '1000');
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(1_000)} a year, the money lasted all 30 years in every simulated path.`);
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money lasted all 30 years in every path.');
      assert.equal(document.querySelector('.mcs-lasted .mcs-note'), null, 'no year it ran out');
      await retype(island.withdraw.amountLabel, '200000');
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(200_000)} a year, the money ran out before the 30 years were over in every simulated path.`);
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money ran out before the 30 years were over in every path.');
    }
    {
      // a share that rounds to all or none keeps a decimal, so it never says all or none
      await choosePaths('1000');
      await retype(island.withdraw.amountLabel, '11000');
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(99.6%).'));
      await retype(island.withdraw.amountLabel, '74000');
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(0.3%).'));
    }
    {
      // one year of withdrawals has words of its own, in every case
      await choosePaths('100');
      await retype(island.fields.start, '100000');
      await retype(island.withdraw.yearsLabel, '1');
      const cases: Array<[number, string, string]> = [
        [95_000, `Taking ${money(95_000)} for one year, the money lasted the full year in 9 in 10 simulated paths (89%).`, 'The money lasted the full year in 9 in 10 paths.'],
        [1_000, `Taking ${money(1_000)} for one year, the money lasted the full year in every simulated path.`, island.quick.lastedAllOne],
        [900_000, `Taking ${money(900_000)} for one year, the money ran out before the year was over in every simulated path.`, island.quick.lastedNoneOne],
      ];
      for (const [withdrawal, head, quick] of cases) {
        await retype(island.withdraw.amountLabel, String(withdrawal));
        assert.equal(one('.mcs-lastedHead').textContent, head);
        assert.equal(one('.mcs-quick .mcs-quickRange').textContent, quick);
      }
    }
  });

  it('a share that rounds to all or none, in a page’s own style', async () => {
    openPlan(drawdown(11_000, { paths: 1_000 }), { amountLocale: 'es' });
    await settle(20);
    assert.match(one('.mcs-lastedHead').textContent ?? '', /\(99,6\s%\)\.$/);
  });

  it('the caveat counts the paths in the page’s number style', async () => {
    openPlan({ saveYears: 3, paths: 100_000 }, { numberLocale: 'hi' });
    // A large run finishes a moment after the page opens (there is no worker here).
    await runDone();
    await waitFor(() => assert.ok(one('.mcs-caveat').textContent?.includes('1,00,000')), { timeout: 5_000 });
    assert.ok(one('.mcs-caveat').textContent?.includes('shares of 1,00,000 simulated paths'));
    assert.ok(one('.mcs-caveat').textContent?.includes('another 1,00,000 random runs'));
  });
});

describe('the number boxes', () => {
  it('say what is wrong, hold the results and the exports back, and let go once corrected', async () => {
    mountWith();
    await settle(20);
    const user = userEvent.setup();
    {
      // the export buttons say why they wait while a box is wrong, and not while a result settles
      const xlsx = screen.getByRole('button', { name: t.export.spreadsheet });
      assert.equal(xlsx.getAttribute('aria-disabled'), null);
      assert.equal(screen.queryByText(t.export.notReady), null);
      const box = screen.getByLabelText(island.fields.start);
      await user.type(box, '1');
      assert.equal(xlsx.getAttribute('aria-disabled'), 'true');
      assert.equal(screen.queryByText(t.export.notReady), null, 'settling says nothing');
      await user.type(box, 'x');
      assert.ok(screen.getByText(t.export.notReady));
      await retype(island.fields.start, '50000');
      assert.equal(screen.queryByText(t.export.notReady), null);
    }
    {
      // out of range says the range, in the page’s number style
      const cases: Array<[string, string, string, string]> = [
        [island.fields.start, '-5', 'Error: Enter an amount from 0 to 1,000,000,000,000.', '50000'],
        [island.fields.monthly, '20000000000', 'Error: Enter an amount from 0 to 10,000,000,000.', '1000'],
        [island.fields.saveYears, '61', 'Error: Enter a whole number of years from 0 to 60.', '30'],
      ];
      for (const [label, value, error, back] of cases) {
        const box = await typeInto(label, value);
        assert.equal(box.getAttribute('aria-invalid'), 'true', label);
        assert.equal(describedBy(box)[0], error);
        await typeInto(label, back);
      }
    }
    {
      // while a box is wrong the results are held back, the reason is said, and nothing is printed
      await settle();
      await typeInto(island.fields.saveYears, '61');
      assert.equal(heading().textContent, t.export.report.answer);
      assert.ok(one('.mcs-results .tool-resultBody').classList.contains('tool-withheld'));
      assert.ok(one('.mcs-quick').classList.contains('tool-withheld'));
      assert.equal(one('.mcs-results .tool-resultReason').textContent, island.actions.fix);
      assert.equal(one('.mcs-actions [role="status"]').textContent, '');
      assert.equal(document.querySelector('.tool-report'), null);
      await settle(1_050);
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, island.actions.fix);
      await typeInto(island.fields.saveYears, '20');
      await settle();
      assert.equal(heading().textContent, 'After 20 years of saving');
      assert.ok(!one('.mcs-quick').classList.contains('tool-withheld'));
    }
    {
      // a corrected box shows its result once it settles, the old one never
      await typeInto(island.fields.saveYears, '12');
      assert.equal(heading().textContent, t.export.report.answer, 'not the last plan’s result');
      await settle();
      assert.equal(heading().textContent, 'After 12 years of saving');
    }
    {
      // an empty box counts as nothing where nothing is allowed
      await typeInto(island.fields.monthly, '');
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-invalid'), 'true');
    }
    {
      // a number too long for a link is refused as unreadable where it is typed
      const box = await typeInto(island.fields.start, '1'.repeat(201));
      assert.equal(describedBy(box)[0], `Error: ${t.export.fieldUnreadable}`);
    }
  });
});

describe('sharing and saving', () => {
  let written: string[] = [];
  let prompted: unknown[][] = [];
  let refuse = false;
  const realPrompt = window.prompt;
  beforeEach(() => {
    written = [];
    prompted = [];
    refuse = false;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (s: string) => { written.push(s); return refuse ? Promise.reject(new Error('no')) : Promise.resolve(); } },
    });
    window.prompt = (...args: unknown[]) => { prompted.push(args); return null; };
  });
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).clipboard;
    window.prompt = realPrompt;
  });

  it('copies a link with the plan after the #, offers it by hand when refused, downloads and prints', async () => {
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const realClick = window.HTMLAnchorElement.prototype.click;
    const realPrint = window.print;
    const blobs: Blob[] = [];
    const names: string[] = [];
    let printed = 0;
    URL.createObjectURL = (b: Blob) => { blobs.push(b); return 'blob:x'; };
    URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { names.push(this.download); };
    window.print = () => { printed++; };
    try {
      openPlan({ start: 20_000, paths: 100 });
      await settle(20);
      const button = screen.getByRole('button', { name: island.actions.copy });
      {
        // copies a link to the plan, with the plan after the #, and says so
        fireEvent.click(button);
        assert.deepEqual(written, [`https://nidhi.today/free/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=monte_carlo#s=20000&n=100`]);
        assert.deepEqual(events.at(-1), ['free_monte_carlo_share_copied', undefined]);
        await settle(20);
        assert.ok(button.textContent?.includes(island.actions.copied));
        assert.equal(button.getAttribute('data-attr'), 'free-monte-carlo-share');
      }
      {
        // offers the link to copy by hand when the clipboard refuses
        refuse = true;
        fireEvent.click(button);
        await settle(20);
        assert.deepEqual(prompted, [[island.actions.copyPrompt, written[1]]]);
      }
      // user-event puts its own clipboard in place, so it is set up after the copying.
      const user = userEvent.setup();
      {
        // downloads the plan on screen as a spreadsheet, counted by its format only
        await user.click(screen.getByRole('button', { name: t.export.spreadsheet }));
        assert.deepEqual(events.at(-1), ['free_monte_carlo_exported', { format: 'xlsx' }]);
        assert.equal(blobs.length, 1);
        assert.match(names[0], /^nidhi-monte-carlo-\d{4}-\d{2}-\d{2}\.xlsx$/);
        const file = new TextDecoder().decode(await blobs[0].arrayBuffer());
        assert.ok(file.includes('EUR'), 'the plan’s currency');
        assert.ok(file.includes('https://nidhi.today/free/'), 'the page, without the plan');
        assert.ok(file.includes('20000'), 'the plan’s starting amount');
      }
      {
        // prints, counted by its format only
        await user.click(screen.getByRole('button', { name: t.export.print }));
        assert.equal(printed, 1);
        assert.deepEqual(events.at(-1), ['free_monte_carlo_exported', { format: 'pdf' }]);
      }
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
      window.HTMLAnchorElement.prototype.click = realClick;
      window.print = realPrint;
    }
  });

  it('the untouched plan copies a link that names its currency, and nothing while the results catch up', async () => {
    mountWith({ defaultCurrency: 'INR' });
    await settle(20);
    const button = screen.getByRole('button', { name: island.actions.copy });
    fireEvent.click(button);
    assert.deepEqual(written, ['https://nidhi.today/free/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=monte_carlo']);
    events.length = 0;
    // Typing with user-event would put its own clipboard in place.
    fireEvent.change(screen.getByLabelText(island.fields.start), { target: { value: '500001' } });
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    fireEvent.click(button);
    assert.equal(written.length, 1);
    assert.deepEqual(events, []);
    await settle();
    assert.equal(button.getAttribute('aria-disabled'), null);
  });
});

describe('large runs', () => {
  const g = globalThis as unknown as Record<string, unknown>;

  /** A stand-in for the browser's worker: it answers when the test says, with a small run marked by its path count. */
  class FakeWorker {
    static made: FakeWorker[] = [];
    url: string;
    options: unknown;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    requests: Array<{ id: number; inputs: ToolState }> = [];
    terminated = 0;
    constructor(url: URL, options: unknown) {
      this.url = String(url);
      this.options = options;
      FakeWorker.made.push(this);
    }
    postMessage(request: { id: number; inputs: ToolState }) { this.requests.push(request); }
    terminate() { this.terminated++; }
    answer(i: number, paths = 100) {
      const { id, inputs } = this.requests[i];
      act(() => this.onmessage?.({ data: { id, result: simulate({ ...inputs, paths }) } }));
    }
  }
  beforeEach(() => { FakeWorker.made = []; });
  afterEach(() => { delete g.Worker; delete w.Worker; });
  const useFake = () => { g.Worker = FakeWorker; w.Worker = FakeWorker; };

  it('without a worker run on the page, saying so; a held-back result says so too; a newer plan wins', async () => {
    openPlan({ saveYears: 1, paths: 100 });
    await settle(20);
    {
      // run on the page, saying they are running meanwhile, and the buttons wait for that
      await choosePaths('100000');
      assert.equal(one('.mcs-actions [role="status"]').textContent, 'Running 100,000 paths…');
      assert.equal(results().getAttribute('aria-busy'), 'true');
      assert.ok(results().classList.contains('mcs-results--busy'));
      assert.ok(one('.mcs-quick').classList.contains('mcs-quick--busy'));
      assert.ok(screen.getByText(t.export.notReady), 'running is said');
      await runDone();
      assert.equal(one('.mcs-actions [role="status"]').textContent, '');
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.equal(screen.queryByText(t.export.notReady), null);
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
    }
    {
      // a result held back for a wrong box says the long run is running once it is corrected
      const user = userEvent.setup();
      const box = screen.getByLabelText(island.fields.saveYears);
      await user.clear(box);
      await user.type(box, '2');
      await settle();
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.mcs-results .tool-resultReason').textContent, 'Running 100,000 paths…');
      await runDone();
      assert.equal(heading().textContent, 'After 2 years of saving');
    }
    {
      // a newer plan wins over a slower older one
      await typeInto(island.fields.saveYears, '3');
      await settle();
      fireEvent.click(screen.getByRole('button', { name: island.actions.reset }));
      await settle(400);
      await runDone();
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
      assert.equal(results().getAttribute('aria-busy'), 'false');
    }
    {
      // a newer plan that comes while the older one waits to start wins too
      await typeInto(island.fields.saveYears, '3');
      await choosePaths('100000');
      await runDone();
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
      const reset = screen.getByRole('button', { name: island.actions.reset });
      // Reset the moment the large run says it is running: before it starts on the page.
      const observer = new MutationObserver(() => {
        if (results().getAttribute('aria-busy') !== 'true') return;
        observer.disconnect();
        fireEvent.click(reset);
      });
      observer.observe(results(), { attributes: true, attributeFilter: ['aria-busy'] });
      await typeInto(island.fields.saveYears, '4');
      await settle(400);
      observer.disconnect();
      await runDone();
      assert.equal(heading().textContent, 'After 30 years of saving');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
    }
  });

  it('with a worker: only large runs go there, its answer shows, and one that fails is replaced', async () => {
    useFake();
    const { unmount } = openPlan({ saveYears: 1, paths: 100 });
    await settle(20);
    {
      // a small run never starts a worker
      await choosePaths('10000');
      assert.equal(FakeWorker.made.length, 0);
      assert.equal(results().getAttribute('aria-busy'), 'false');
    }
    await choosePaths('100000');
    const worker = FakeWorker.made[0];
    {
      // a large run goes to the worker, and its answer shows
      assert.equal(FakeWorker.made.length, 1);
      assert.match(worker.url, /monte-carlo\/worker\.ts$/);
      assert.deepEqual(worker.options, { type: 'module' });
      assert.equal(worker.requests.length, 1);
      assert.equal(worker.requests[0].inputs.paths, 100_000);
      assert.equal(results().getAttribute('aria-busy'), 'true');
      worker.answer(0, 100);
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100 simulated paths'), 'the worker’s answer is what shows');
    }
    {
      // a worker that fails is dropped, and the run finishes on the page
      await choosePaths('1000');
      await choosePaths('100000');
      assert.equal(FakeWorker.made.length, 1, 'the same worker takes the next large run');
      assert.equal(worker.requests.length, 2);
      act(() => worker.onerror?.());
      assert.equal(worker.terminated, 1);
      await runDone();
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
      await choosePaths('1000');
      await choosePaths('100000');
      assert.equal(FakeWorker.made.length, 2, 'a new one is started for the next large run');
    }
    unmount();
    assert.equal(FakeWorker.made[1].terminated, 1, 'the worker goes with the page');
  });

  it('keeps one worker, and ignores an answer to a plan since replaced', async () => {
    useFake();
    openPlan({ saveYears: 1, paths: 100_000, currency: 'EUR' });
    await settle(20);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'INR');
    await settle();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'GBP');
    await settle();
    assert.equal(FakeWorker.made.length, 1);
    const worker = FakeWorker.made[0];
    // The shared plan, then each currency.
    assert.equal(worker.requests.length, 3);
    assert.ok(worker.requests[2].id > worker.requests[1].id);
    worker.answer(1, 100);
    assert.equal(results().getAttribute('aria-busy'), 'true', 'the old answer is not shown');
    worker.answer(2, 1_000);
    assert.equal(results().getAttribute('aria-busy'), 'false');
    assert.ok(text('.mcs-cardValue')[1].startsWith('£'));
  });
});
