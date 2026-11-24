/**
 * ToolReport's one chart, drawn for paper: bars for shares, or lines and
 * bands on an axis that names its unit once. Where each mark is drawn, what
 * each gridline says, and when the key appears. The figures below are worked
 * out by hand from the drawing's size (680 by 300, the plot from 76 to 664
 * across and from 12 to 256 down).
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import type { Report, ReportChart, ReportPoint } from '../utils/shared/report.ts';
import { NumberLocaleContext } from './LocaleNumberInput.tsx';
import { ToolReport } from './ToolExport.tsx';
import { AmountLocaleContext } from './useMoney.ts';

const strings = dict('en').tools.export;

const REPORT: Report = {
  tool: 'A tool',
  currency: 'EUR',
  answer: ['An answer.'],
  meaning: 'A meaning.',
  entered: null,
  tables: [],
  chart: null,
  assumptions: [],
};

afterEach(cleanup);

function draw(chart: ReportChart, { locale = 'en', currency = 'EUR', amountLocale = null as string | null, numberLocale = 'en' } = {}) {
  const { container } = render(
    <AmountLocaleContext.Provider value={amountLocale}>
      <NumberLocaleContext.Provider value={numberLocale}>
        <ToolReport report={{ ...REPORT, currency, chart }} strings={strings} locale={locale} />
      </NumberLocaleContext.Provider>
    </AmountLocaleContext.Provider>,
  );
  const figure = container.querySelector('figure');
  const svg = figure?.querySelector(':scope > svg') ?? null;
  const all = (selector: string) => [...(svg?.querySelectorAll(selector) ?? [])];
  return {
    container,
    figure,
    svg,
    all,
    gridlines: () => all(':scope > g').map((g) => g.querySelector('text')!.textContent),
    years: () => all(':scope > text').slice(0, -1).map((t) => t.textContent),
  };
}

const nums = (els: Element[], attr: string) => els.map((el) => Number(el.getAttribute(attr)));
/** Drawn positions against the hand-worked ones, to a millionth. */
function near(actual: number[], expected: number[], what: string) {
  assert.equal(actual.length, expected.length, `${what}: ${actual.join(', ')}`);
  actual.forEach((a, i) => assert.ok(Math.abs(a - expected[i]) < 1e-6, `${what}: ${actual.join(', ')} is not ${expected.join(', ')}`));
}
const line = (points: [number, number][], rest: { label?: string; strong?: boolean; dash?: string } = {}) => ({
  label: rest.label ?? 'A line',
  points: points.map(([x, y]): ReportPoint => ({ x, y })),
  ...(rest.strong === undefined ? {} : { strong: rest.strong }),
  ...(rest.dash === undefined ? {} : { dash: rest.dash }),
});
const lines = (series: ReturnType<typeof line>[], rest: Partial<Extract<ReportChart, { kind: 'lines' }>> = {}): ReportChart =>
  ({ kind: 'lines', title: 'Over the years', xLabel: 'Years from now', series, ...rest });

describe('the report chart of shares', () => {
  const BARS: ReportChart = {
    kind: 'bars',
    title: 'Where it sits',
    bars: [{ label: 'Cash', share: 50 }, { label: 'Debt', share: -25 }, { label: 'Gold', share: 12.25 }, { label: 'None', share: 0 }],
  };

  it('is a titled figure hidden from assistive technology, with nothing focusable', () => {
    const { figure, svg, container } = draw(BARS);
    assert.equal(figure!.className, 'tool-reportBlock tool-reportFigure');
    assert.equal(figure!.querySelector('figcaption')!.textContent, 'Where it sits');
    assert.equal(svg!.getAttribute('viewBox'), '0 0 680 112');
    assert.equal(svg!.getAttribute('width'), '100%');
    assert.equal(svg!.getAttribute('aria-hidden'), 'true');
    assert.equal(svg!.getAttribute('focusable'), 'false');
    assert.equal(container.querySelectorAll('figure').length, 1);
    assert.ok(container.querySelector('.tool-reportUnit') === null, 'shares have no unit line');
    assert.ok(container.querySelector('.tool-reportKey') === null);
  });

  it('draws one row a bar: its name, a bar as long as its share, and the share in figures', () => {
    const { all } = draw(BARS);
    const rows = all(':scope > g');
    assert.equal(rows.length, 4);
    const names = rows.map((g) => g.querySelectorAll('text')[0]);
    const shares = rows.map((g) => g.querySelectorAll('text')[1]);
    const bars = rows.map((g) => g.querySelector('rect')!);
    assert.deepEqual(names.map((t) => t.textContent), ['Cash', 'Debt', 'Gold', 'None']);
    assert.deepEqual(names.map((t) => t.getAttribute('text-anchor')), ['end', 'end', 'end', 'end']);
    for (const t of [...names, ...shares]) assert.equal(t.getAttribute('class'), 'tool-reportAxis');
    near(nums(names, 'x'), [192, 192, 192, 192], 'names end just left of the bars');
    near(nums(names, 'y'), [19, 45, 71, 97], 'name baselines');
    near(nums(bars, 'x'), [200, 200, 200, 200], 'bars start');
    near(nums(bars, 'y'), [7, 33, 59, 85], 'bars top');
    near(nums(bars, 'height'), [16, 16, 16, 16], 'bars height');
    // Of the 410 a full bar has: a half, a quarter, an eighth less a little, nothing.
    near(nums(bars, 'width'), [205, 102.5, 50.225, 0], 'bars length');
    near(nums(shares, 'x'), [411, 308.5, 256.225, 206], 'figures sit after their bars');
    near(nums(shares, 'y'), [19, 45, 71, 97], 'figure baselines');
    assert.deepEqual(shares.map((t) => t.textContent), ['50%', '-25%', '12.3%', '0%']);
    assert.equal(shares[0].hasAttribute('text-anchor'), false);
  });

  it('tells a share below zero apart by an empty bar, not by colour alone', () => {
    const bars = draw(BARS).all('rect');
    assert.deepEqual(bars.map((b) => b.getAttribute('fill')), ['#555', '#fff', '#555', '#555']);
    assert.deepEqual(bars.map((b) => b.getAttribute('stroke')), ['#222', '#222', '#222', '#222']);
    assert.deepEqual(bars.map((b) => b.getAttribute('stroke-width')), ['1', '1', '1', '1']);
  });

  it('measures the bars against the largest share once one passes 100%', () => {
    const { all } = draw({ kind: 'bars', title: 'Shares', bars: [{ label: 'Home', share: 200 }, { label: 'Loan', share: -100 }] });
    near(nums(all('rect'), 'width'), [410, 205], 'bars length');
  });

  it('writes the shares in the reader locale', () => {
    const { all } = draw({ kind: 'bars', title: 'Shares', bars: [{ label: 'Gold', share: 12.25 }] }, { locale: 'de' });
    assert.equal(all('text')[1].textContent, '12,3%');
  });
});

describe('the report chart of lines', () => {
  const CHART = lines(
    [line([[0, 0], [5, 50], [10, 100]], { label: 'Invest', strong: true }), line([[0, 100], [10, 0]], { label: 'Pay off', dash: '4 3' })],
    { bands: [{ label: 'Middle half', lower: [{ x: 0, y: 0 }, { x: 10, y: 50 }], upper: [{ x: 0, y: 0 }, { x: 10, y: 100 }], shade: 0.15 }] },
  );

  it('is a titled figure with its unit named once above it, hidden from assistive technology', () => {
    const { figure, svg } = draw(CHART);
    assert.equal(figure!.className, 'tool-reportBlock tool-reportFigure');
    assert.deepEqual([...figure!.children].map((el) => el.tagName.toLowerCase()), ['figcaption', 'p', 'svg', 'ul']);
    assert.equal(figure!.querySelector('figcaption')!.textContent, 'Over the years');
    const unit = figure!.querySelector('p')!;
    assert.equal(unit.className, 'tool-reportUnit');
    assert.equal(unit.textContent, 'Amounts in €');
    assert.equal(svg!.getAttribute('viewBox'), '0 0 680 300');
    assert.equal(svg!.getAttribute('width'), '100%');
    assert.equal(svg!.getAttribute('aria-hidden'), 'true');
    assert.equal(svg!.getAttribute('focusable'), 'false');
  });

  it('rules a gridline at each round step, with its bare figure to the left', () => {
    const { all } = draw(CHART);
    const rules = all(':scope > g > line');
    const figures = all(':scope > g > text');
    assert.deepEqual(figures.map((t) => t.textContent), ['0', '20', '40', '60', '80', '100']);
    const down = [256, 207.2, 158.4, 109.6, 60.8, 12];
    near(nums(rules, 'y1'), down, 'gridlines');
    near(nums(rules, 'y2'), down, 'gridlines are level');
    near(nums(rules, 'x1'), [76, 76, 76, 76, 76, 76], 'gridlines start at the plot');
    near(nums(rules, 'x2'), [664, 664, 664, 664, 664, 664], 'gridlines end at the plot');
    assert.deepEqual(rules.map((l) => `${l.getAttribute('stroke')} ${l.getAttribute('stroke-width')}`), Array(6).fill('#ccc 0.75'));
    near(nums(figures, 'x'), [70, 70, 70, 70, 70, 70], 'figures end left of the plot');
    near(nums(figures, 'y'), down.map((y) => y + 4), 'figures sit on their gridlines');
    for (const t of figures) {
      assert.equal(t.getAttribute('text-anchor'), 'end');
      assert.equal(t.getAttribute('class'), 'tool-reportAxis');
    }
  });

  it('marks whole steps along the bottom and names the axis under them', () => {
    const { all } = draw(CHART);
    const texts = all(':scope > text');
    const marks = texts.slice(0, -1);
    const name = texts[texts.length - 1];
    assert.deepEqual(marks.map((t) => t.textContent), ['0', '2', '4', '6', '8', '10']);
    near(nums(marks, 'x'), [76, 193.6, 311.2, 428.8, 546.4, 664], 'marks across');
    near(nums(marks, 'y'), [272, 272, 272, 272, 272, 272], 'marks under the plot');
    assert.equal(name.textContent, 'Years from now');
    near(nums([name], 'x'), [370], 'the name is centred under the plot');
    near(nums([name], 'y'), [294], 'the name sits at the foot');
    for (const t of texts) {
      assert.equal(t.getAttribute('text-anchor'), 'middle');
      assert.equal(t.getAttribute('class'), 'tool-reportAxis');
    }
  });

  it('draws each line through its points, told apart by weight and dashes', () => {
    const paths = draw(CHART).all(':scope > path');
    const [band, invest, payOff, ...rest] = paths;
    assert.equal(rest.length, 0);
    assert.equal(invest.getAttribute('d'), 'M76.0,256.0L370.0,134.0L664.0,12.0');
    assert.equal(payOff.getAttribute('d'), 'M76.0,12.0L664.0,256.0');
    for (const p of [invest, payOff]) {
      assert.equal(p.getAttribute('fill'), 'none');
      assert.equal(p.getAttribute('stroke'), '#111');
    }
    assert.equal(invest.getAttribute('stroke-width'), '2.5');
    assert.equal(invest.hasAttribute('stroke-dasharray'), false);
    assert.equal(payOff.getAttribute('stroke-width'), '1.5');
    assert.equal(payOff.getAttribute('stroke-dasharray'), '4 3');
    // The band lies under the lines: along its upper edge, back along its lower one.
    assert.equal(band.getAttribute('d'), 'M76.0,256.0L664.0,12.0L664.0,134.0L76.0,256.0Z');
    assert.equal(band.getAttribute('fill'), 'rgba(0,0,0,0.15)');
    assert.equal(band.getAttribute('stroke'), 'none');
  });

  it('has a key under it, bands first, each with a sample of how it is drawn', () => {
    const key = draw(CHART).figure!.querySelector('ul')!;
    assert.equal(key.className, 'tool-reportKey');
    assert.deepEqual([...key.children].map((li) => li.textContent), ['Middle half', 'Invest', 'Pay off']);
    const samples = [...key.querySelectorAll('svg')];
    for (const s of samples) {
      assert.deepEqual([s.getAttribute('width'), s.getAttribute('height'), s.getAttribute('aria-hidden'), s.getAttribute('focusable')], ['28', '12', 'true', 'false']);
    }
    const block = samples[0].querySelector('rect')!;
    assert.deepEqual([block.getAttribute('width'), block.getAttribute('height'), block.getAttribute('fill')], ['28', '12', 'rgba(0,0,0,0.15)']);
    const [invest, payOff] = samples.slice(1).map((s) => s.querySelector('line')!);
    assert.deepEqual(['x1', 'x2', 'y1', 'y2', 'stroke'].map((a) => invest.getAttribute(a)), ['0', '28', '6', '6', '#111']);
    assert.equal(invest.getAttribute('stroke-width'), '2.5');
    assert.equal(invest.hasAttribute('stroke-dasharray'), false);
    assert.equal(payOff.getAttribute('stroke-width'), '1.5');
    assert.equal(payOff.getAttribute('stroke-dasharray'), '4 3');
  });

  it('has a key only when there is more than one thing to tell apart', () => {
    const one = line([[0, 0], [10, 100]]);
    const band = { label: 'Range', lower: [{ x: 0, y: 0 }], upper: [{ x: 10, y: 80 }], shade: 0.1 };
    assert.ok(draw(lines([one])).figure!.querySelector('ul') === null);
    cleanup();
    assert.ok(draw(lines([one], { bands: [] })).figure!.querySelector('ul') === null);
    cleanup();
    assert.deepEqual([...draw(lines([one, one])).figure!.querySelectorAll('li')].map((li) => li.textContent), ['A line', 'A line']);
    cleanup();
    assert.deepEqual([...draw(lines([one], { bands: [band] })).figure!.querySelectorAll('li')].map((li) => li.textContent), ['Range', 'A line']);
    cleanup();
    assert.deepEqual([...draw(lines([], { bands: [band, band] })).figure!.querySelectorAll('li')].map((li) => li.textContent), ['Range', 'Range']);
  });

  it('draws a line that is not marked strong, and has no dashes, thin and solid', () => {
    const { all, figure } = draw(lines([line([[0, 0], [10, 100]], { strong: false, dash: '' }), line([[0, 0], [10, 50]])]));
    for (const mark of [...all(':scope > path'), ...figure!.querySelectorAll('li line')]) {
      assert.equal(mark.getAttribute('stroke-width'), '1.5');
      assert.equal(mark.hasAttribute('stroke-dasharray'), false);
    }
  });

  it('draws nothing when there is nothing to draw', () => {
    assert.ok(draw(lines([])).figure === null);
    cleanup();
    assert.ok(draw(lines([line([])], { bands: [{ label: 'Range', lower: [], upper: [], shade: 0.1 }] })).figure === null);
  });

  it('draws a chart that has bands and no lines', () => {
    const { all, gridlines } = draw(lines([], { bands: [{ label: 'Range', lower: [{ x: 0, y: 10 }, { x: 4, y: 20 }], upper: [{ x: 0, y: 30 }, { x: 4, y: 50 }], shade: 0.2 }] }));
    assert.deepEqual(gridlines(), ['0', '10', '20', '30', '40', '50']);
    assert.deepEqual(all(':scope > path').map((p) => p.getAttribute('d')), ['M76.0,109.6L664.0,12.0L664.0,158.4L76.0,207.2Z']);
  });
});

describe('the report chart axis', () => {
  const upTo = (max: number) => draw(lines([line([[0, 0], [10, max]])])).gridlines();

  it('steps by 1, 2, 2.5 or 5 times a power of ten, and tops out on a step', () => {
    assert.deepEqual(upTo(500), ['0', '100', '200', '300', '400', '500']);
    cleanup();
    assert.deepEqual(upTo(100), ['0', '20', '40', '60', '80', '100']);
    cleanup();
    assert.deepEqual(upTo(110), ['0', '25', '50', '75', '100', '125']);
    cleanup();
    assert.deepEqual(upTo(240), ['0', '50', '100', '150', '200', '250']);
    cleanup();
    assert.deepEqual(upTo(450), ['0', '100', '200', '300', '400', '500']);
    cleanup();
    assert.deepEqual(upTo(60), ['0', '20', '40', '60']);
    cleanup();
    assert.deepEqual(upTo(0.9), ['0', '0.2', '0.4', '0.6', '0.8', '1']);
  });

  it('still has gridlines when every amount is zero', () => {
    const { gridlines, all } = draw(lines([line([[0, 0], [10, 0]])]));
    assert.deepEqual(gridlines(), ['0', '0.25', '0.5', '0.75', '1']);
    assert.equal(all(':scope > path')[0].getAttribute('d'), 'M76.0,256.0L664.0,256.0');
  });

  it('starts below zero when an amount is below zero, and at zero otherwise', () => {
    const below = draw(lines([line([[2020, -50000], [2025, 150000]])]));
    assert.deepEqual(below.gridlines(), ['-50', '0', '50', '100', '150']);
    near(nums(below.all(':scope > g > line'), 'y1'), [256, 195, 134, 73, 12], 'gridlines');
    assert.equal(below.all(':scope > path')[0].getAttribute('d'), 'M76.0,256.0L664.0,12.0');
    assert.equal(below.figure!.querySelector('p')!.textContent, 'Amounts in thousands of €');
    cleanup();
    const above = draw(lines([line([[0, 40], [10, 100]])]));
    assert.deepEqual(above.gridlines(), ['0', '20', '40', '60', '80', '100']);
    assert.equal(above.all(':scope > path')[0].getAttribute('d'), 'M76.0,158.4L664.0,12.0');
  });

  it('names the scale of its largest amount, above or below zero', () => {
    const unit = (points: [number, number][]) => draw(lines([line(points)])).figure!.querySelector('p')!.textContent;
    assert.equal(unit([[0, -500], [1, 1500]]), 'Amounts in thousands of €');
    cleanup();
    assert.equal(unit([[0, -1500], [1, 500]]), 'Amounts in thousands of €');
    cleanup();
    assert.equal(unit([[0, -600000], [1, 400000]]), 'Amounts in thousands of €');
    cleanup();
    assert.equal(unit([[0, 0], [1, 2500000]]), 'Amounts in millions of €');
    cleanup();
    assert.equal(unit([[0, -400], [1, 400]]), 'Amounts in €');
  });

  it('writes its amounts as the page does: its currency, its own number style, its lakhs', () => {
    const data = lines([line([[0, 0], [10, 125000]])]);
    const czech = draw(data, { currency: 'CZK' });
    assert.equal(czech.figure!.querySelector('p')!.textContent, 'Amounts in thousands of Kč');
    cleanup();
    const spanish = draw(data, { amountLocale: 'es' });
    assert.deepEqual(spanish.gridlines(), ['0', '25', '50', '75', '100', '125']);
    cleanup();
    assert.deepEqual(draw(lines([line([[0, 0], [10, 1250]])]), { amountLocale: 'es', numberLocale: 'en-IN' }).gridlines(), ['0', '0,25', '0,5', '0,75', '1', '1,25']);
    cleanup();
    const hindi = draw(data, { numberLocale: 'en-IN' });
    assert.equal(hindi.figure!.querySelector('p')!.textContent, 'Amounts in lakhs of €');
    assert.deepEqual(hindi.gridlines(), ['0', '0.25', '0.5', '0.75', '1', '1.25']);
  });

  it('marks whole years from the first round one, and each year on a short span', () => {
    assert.deepEqual(draw(lines([line([[2021, 0], [2031, 100]])])).years(), ['2022', '2024', '2026', '2028', '2030']);
    cleanup();
    const short = draw(lines([line([[2020, 0], [2022, 100]])]));
    assert.deepEqual(short.years(), ['2020', '2021', '2022']);
    near(nums(short.all(':scope > text').slice(0, -1), 'x'), [76, 370, 664], 'marks across');
    cleanup();
    assert.deepEqual(draw(lines([line([[0, 0], [50, 100]])])).years(), ['0', '10', '20', '30', '40', '50']);
  });

  it('still marks the end of a span that stops a hair short of it', () => {
    assert.deepEqual(draw(lines([line([[0, 0], [2 - 1e-9, 100]])])).years(), ['0', '1', '2']);
  });

  it('draws a single moment at the left edge, with its one mark', () => {
    const { all, years } = draw(lines([line([[2026, 40], [2026, 100]])]));
    assert.deepEqual(years(), ['2026']);
    assert.equal(all(':scope > path')[0].getAttribute('d'), 'M76.0,158.4L76.0,12.0');
    near(nums(all(':scope > text').slice(0, 1), 'x'), [76], 'the mark');
  });
});
