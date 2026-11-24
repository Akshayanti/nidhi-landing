/**
 * The Monte Carlo simulator's chart, the labels at the end of its lines
 * (#790): their names and rounded amounts, the dots they belong to, the room
 * they are given on the right, when they are left to the cards instead, and
 * how labels that would overlap are spread apart inside the plot's height.
 * Also the sentence that describes the chart to a screen reader. The chart
 * is mounted by itself, with plans worked out for real.
 */
import {
  t, drawChart, clear, onPhone, atTextSize, textDrawnAs, all, one, money, near, tenth,
  drawing, plot, amountLabels, endLabels, measuredSamples, yOfAmount,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chartLabel } from '../utils/shared/chartAmounts.ts';

const short = (v: number) => chartLabel(v, 'EUR', t.export.chart, null, 'en');
/** The room kept on the right of the plot. */
const gutter = () => drawing().W - plot().right;

describe('the labels at the end of the chart’s lines', () => {
  it('name the high, median and low paths with their rounded amounts, each beside its dot', () => {
    const { exact, worded } = drawChart({ saveYears: 30 });
    const end = exact.bands[30];
    const said = worded.bands[30];
    const labels = endLabels();
    assert.deepEqual(labels.map((l) => l.name), ['High', 'Median', 'Low']);
    assert.deepEqual(labels.map((l) => l.value), [short(said.p90), short(said.p50), short(said.p10)]);
    assert.deepEqual(labels.map((l) => l.value), ['€2.1M', '€1M', '€600K']);
    assert.notEqual(short(end.p90), short(said.p90), 'the label carries the rounded amount, not the exact one');
    assert.deepEqual(all('g.mcs-endLabel').map((g) => g.getAttribute('class')), ['mcs-endLabel mcs-endLabel--outer', 'mcs-endLabel mcs-endLabel--median', 'mcs-endLabel mcs-endLabel--outer']);
    // Each dot at the exact amount, to a tenth of a unit, at the last year.
    const p = plot();
    assert.deepEqual(amountLabels().at(-1), '2.5');
    assert.deepEqual(labels.map((l) => l.dotY), [end.p90, end.p50, end.p10].map((v) => tenth(yOfAmount(v, 2_500_000))));
    for (const l of labels) assert.equal(l.dotX, p.right);
    // Far enough apart already: each label level with its dot, with no line to it.
    assert.deepEqual(labels.map((l) => l.y), labels.map((l) => l.dotY));
    assert.deepEqual(labels.map((l) => l.leader), [null, null, null]);
    for (const l of labels) assert.equal(l.x, p.right + 12);
    assert.equal(gutter(), 132, 'short labels keep the room the wide chart is drawn with');
  });

  it('are measured as drawn: each name with the arrow it may carry, each amount, in their own styles and sizes', () => {
    const { worded } = drawChart({ saveYears: 30 });
    const said = worded.bands[30];
    const samples = measuredSamples();
    assert.deepEqual(samples.slice(0, 6), [
      { cls: 'mcs-endName', words: 'High ↑', size: 14 },
      { cls: 'mcs-endValue', words: short(said.p90), size: 16 },
      { cls: 'mcs-endName', words: 'Median ↑', size: 14 },
      { cls: 'mcs-endValue', words: short(said.p50), size: 16 },
      { cls: 'mcs-endName', words: 'Low ↑', size: 14 },
      { cls: 'mcs-endValue', words: short(said.p10), size: 16 },
    ]);
    // Then the words of the axis title and the amounts on the gridlines.
    assert.deepEqual(samples.slice(6), [
      ...['Years', 'from', 'today'].map((words) => ({ cls: 'mcs-axis mcs-axisTitle', words, size: 14 })),
      ...amountLabels().map((words) => ({ cls: 'mcs-axis mcs-axisAmount', words, size: 14 })),
    ]);
  });

  it('the room on the right grows to the widest name or amount as drawn, and 16 units', () => {
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 150 : cls === 'mcs-endValue' ? 100 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(gutter(), 166);
    assert.equal(endLabels()[0].x, plot().right + 12);
    clear();
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 100 : cls === 'mcs-endValue' ? 150.2 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(gutter(), 167, 'rounded up to a whole unit');
    clear();
    // One name wider than the others sets it.
    textDrawnAs((cls, words) => (words === 'Low ↑' ? 180 : cls.startsWith('mcs-end') ? 100 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(gutter(), 196);
  });

  it('are drawn while they leave the plot six tenths of the drawing, and left to the cards a unit beyond', () => {
    // 760 wide, 32 on the left: the labels may take 272.
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 256 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(plot().x, 32);
    assert.equal(gutter(), 272);
    assert.equal(all('g.mcs-endLabel text').length, 3);
    clear();
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 257 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(all('g.mcs-endLabel text').length, 0);
    assert.equal(gutter(), 14, 'the plot takes the room instead');
    assert.equal(all('g.mcs-endLabel circle').length, 3, 'the dots stay');
  });

  it('wider amounts on the left leave the labels less room', () => {
    // 74 on the left: the labels may take 230.
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 214 : cls.includes('mcs-axisAmount') ? 60 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(plot().x, 74);
    assert.equal(gutter(), 230);
    clear();
    textDrawnAs((cls) => (cls === 'mcs-endName' ? 215 : cls.includes('mcs-axisAmount') ? 60 : 10));
    drawChart({ saveYears: 30 });
    assert.equal(gutter(), 14);
  });

  it('are drawn while three of them, two lines each, fit up the plot', () => {
    textDrawnAs(() => 10);
    // A name, an amount and half a line between: 108 units at this size, three are the plot’s 324.
    atTextSize(46.5);
    drawChart({ saveYears: 30 });
    assert.equal(all('g.mcs-endLabel text').length, 3);
    assert.equal(gutter(), 132);
    clear();
    // A little larger they need 109 each.
    atTextSize(46.8);
    drawChart({ saveYears: 30 });
    assert.equal(all('g.mcs-endLabel text').length, 0);
    assert.equal(gutter(), 14);
  });

  it('a phone has none: the dots only, and the plot up to 14 units from the edge', () => {
    onPhone();
    const { exact } = drawChart({ saveYears: 30 });
    assert.equal(all('g.mcs-endLabel text').length, 0);
    assert.equal(gutter(), 14);
    const end = exact.bands[30];
    assert.deepEqual(endLabels().map((l) => l.dotY), [end.p90, end.p50, end.p10].map((v) => tenth(yOfAmount(v, 2_500_000))));
  });
});

describe('end labels that would overlap', () => {
  it('are spread a name, an amount and half a line apart, in order, each with a line back to its dot', () => {
    // A year of saving in bonds only: the three paths end close together.
    drawChart({ saveYears: 1, stockPct: 0, start: 0, monthly: 10_000 });
    const labels = endLabels();
    const dots = labels.map((l) => l.dotY ?? 0);
    assert.ok(dots[1] - dots[0] < 37 || dots[2] - dots[1] < 37, 'two dots are closer than one label is tall');
    // From the top down: each at its dot, or one label under the one above it.
    const high = Math.max(dots[0], plot().y + 14);
    const median = Math.max(dots[1], high + 37);
    const low = Math.max(dots[2], median + 37);
    assert.deepEqual(labels.map((l) => l.y), [high, median, low].map(tenth));
    labels.forEach((l) => assert.equal(Boolean(l.leader), Math.abs((l.y ?? 0) - (l.dotY ?? 0)) > 4, 'a label moved away from its dot points back at it'));
    assert.ok(labels.some((l) => l.leader));
  });

  it('a path that ends above the top is labelled a text height under the top of the plot', () => {
    const { exact } = drawChart({ start: 500_000, monthly: 0, saveYears: 5, withdrawal: 1_000, withdrawYears: 20 });
    assert.ok(exact.bands[25].p90 > 3_000_000);
    const p = plot();
    const [high, median, low] = endLabels();
    assert.equal(high.name, 'High ↑');
    assert.equal(high.dotY, p.y, 'its dot at the top of the plot');
    assert.equal(high.y, p.y + 14);
    assert.deepEqual([median.name, low.name], ['Median', 'Low']);
    assert.equal(median.y, Math.max(median.dotY ?? 0, tenth(p.y + 14 + 37)));
    assert.ok((low.y ?? 0) >= (median.y ?? 0) + 37 - 0.05);
  });

  it('paths that all end at nothing are stacked up from the bottom, clear of the year labels', () => {
    const { exact } = drawChart({ start: 600_000, monthly: 0, saveYears: 0, withdrawal: 200_000, withdrawYears: 30 });
    assert.equal(exact.bands[30].p90, 0);
    const p = plot();
    const labels = endLabels();
    assert.deepEqual(labels.map((l) => l.dotY), [p.bottom, p.bottom, p.bottom]);
    // The lowest label’s amount line ends 1.4 amount heights above the bottom of the plot.
    const lowest = p.bottom - 1.4 * 16;
    assert.deepEqual(labels.map((l) => l.y), [lowest - 74, lowest - 37, lowest].map(tenth));
    assert.deepEqual(labels.map((l) => l.value), ['€0', '€0', '€0']);
  });

  it('larger text spreads them further', () => {
    atTextSize(32);
    drawChart({ start: 600_000, monthly: 0, saveYears: 0, withdrawal: 200_000, withdrawYears: 30 });
    const p = plot();
    const lowest = p.bottom - 1.4 * 32;
    // 28 + 32 + 14 units apart.
    assert.deepEqual(endLabels().map((l) => l.y), [lowest - 148, lowest - 74, lowest].map(tenth));
  });

  it('labels and dots are placed to a tenth of a unit at any text size', () => {
    atTextSize(17.3);
    textDrawnAs(() => 10);
    drawChart({ start: 600_000, monthly: 0, saveYears: 3, withdrawal: 250_000, withdrawYears: 3 });
    for (const l of endLabels()) {
      near(l.dotY ?? NaN, tenth(l.dotY ?? NaN), 1e-9, 'dot');
      const y = Number(all('g.mcs-endLabel text')[0].getAttribute('y')) + 2;
      near(y, tenth(y), 1e-9, 'label');
    }
    const ys = all('g.mcs-endLabel text').map((el) => Number(el.getAttribute('y')) + 2);
    for (const y of ys) near(y * 10, Math.round(y * 10), 1e-6, 'label');
  });
});

describe('the chart in words, for a screen reader', () => {
  it('says how many paths, over how many years, and where the low, median, high and single line end, rounded', () => {
    const { worded } = drawChart({ saveYears: 5, paths: 1_000 });
    const end = worded.bands[5];
    const [title, desc] = (one('svg.mcs-chart').getAttribute('aria-labelledby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    assert.equal(title, 'Spread of simulated outcomes');
    assert.equal(desc, `Fan chart of 1,000 simulated paths over 5 years. At the end, the 10th percentile is ${money(end.p10)}, the median ${money(end.p50)}, and the 90th percentile ${money(end.p90)}. A single fixed-return line ends at ${money(worded.straightLine[5])}.`);
  });

  it('writes the count of paths the page’s own way', () => {
    drawChart({ saveYears: 2, paths: 1_000 }, { numberLocale: 'de' });
    assert.ok(one('svg.mcs-chart desc').textContent?.startsWith('Fan chart of 1.000 simulated paths over 2 years.'));
  });
});
