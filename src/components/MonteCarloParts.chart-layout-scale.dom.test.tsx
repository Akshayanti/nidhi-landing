/**
 * The Monte Carlo simulator's chart, its amount axis (#790): how high the
 * axis goes, where its gridlines are and which amounts label them, the unit
 * the heading names, how many gridlines larger text leaves room for, and the
 * room the amounts take on the left (or inside the plot when they are too
 * wide). The chart is mounted by itself, with plans worked out for real.
 */
import {
  island, drawChart, clear, onPhone, atTextSize, textDrawnAs, all, one, num, near, tenth,
  drawing, plot, amountLines, minorAmountLines, amountLabels, unitHeading, pointsOf, yOfAmount,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** The amounts on the gridlines, as numbers of the heading's unit. */
const labelled = () => amountLabels().map((s) => Number(s.replace(/,/g, '')));

describe('the chart’s amount axis', () => {
  it('runs from nothing to the first round step above the highest balance drawn, in even steps', () => {
    const { exact } = drawChart({ saveYears: 30 });
    assert.equal(unitHeading(), 'Amounts in millions of €');
    assert.deepEqual(amountLabels(), ['0', '0.5', '1', '1.5', '2', '2.5']);
    // While saving, the whole 8 in 10 band fits under the top.
    const highest = Math.max(...exact.bands.map((b) => b.p90));
    assert.ok(highest <= 2_500_000 && highest > 2_000_000, `the highest balance, ${highest}, sits under the top gridline`);
    const p = plot();
    assert.deepEqual([p.y, p.h], [18, 324], 'the plot keeps its height, 18 units from the top');
    const lines = amountLines();
    assert.equal(lines.length, 6);
    lines.forEach((l, i) => {
      near(num(l, 'y1'), p.bottom - (i / 5) * p.h, 1e-6, `gridline ${i}`);
      assert.deepEqual([num(l, 'x1'), num(l, 'x2')], [p.x, p.right]);
    });
    // Lighter lines halfway between, at normal text.
    const minor = minorAmountLines();
    assert.equal(minor.length, 5);
    minor.forEach((l, i) => near(num(l, 'y1'), p.bottom - ((i + 0.5) / 5) * p.h, 1e-6, `minor line ${i}`));
    // The lines are drawn against the same axis: the median's last point at its amount.
    const median = pointsOf('.mcs-median');
    assert.equal(median.length, 31);
    near(median[30][1], yOfAmount(exact.bands[30].p50, 2_500_000), 0.06, 'the median at 30 years');
    near(median[30][0], p.right, 0.06);
    near(median[0][0], p.x, 0.06);
  });

  it('with withdrawals, covers the 8 in 10 band up to the last year of saving, that year included', () => {
    // Saved for five years, then drawn down fast: the highest point of the
    // band is in year 5, above anything the middle half or the single line reach.
    const { exact } = drawChart({ start: 300_000, monthly: 0, saveYears: 5, withdrawal: 100_000, withdrawYears: 20 });
    const lastSaving = exact.bands[5].p90;
    const rest = Math.max(...exact.bands.map((b) => b.p75), ...exact.bands.slice(0, 4).map((b) => b.p90), ...exact.straightLine);
    assert.ok(lastSaving > 500_000 && rest <= 500_000, 'only the last saving year needs the sixth step');
    assert.equal(unitHeading(), 'Amounts in thousands of €');
    assert.deepEqual(amountLabels(), ['0', '100', '200', '300', '400', '500', '600']);
    assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint, 'nothing runs above the top');
  });

  it('while living off it, lets the luckiest paths run above the top, and says so', () => {
    // Small withdrawals: the top paths keep compounding for twenty years.
    const { exact } = drawChart({ start: 500_000, monthly: 0, saveYears: 5, withdrawal: 1_000, withdrawYears: 20 });
    const middleHalf = Math.max(...exact.bands.map((b) => b.p75));
    assert.ok(middleHalf <= 3_000_000 && middleHalf > 2_500_000);
    assert.ok(exact.bands[25].p90 > 3_000_000, 'the 8 in 10 band ends above the top');
    assert.equal(unitHeading(), 'Amounts in millions of €');
    assert.deepEqual(amountLabels(), ['0', '0.5', '1', '1.5', '2', '2.5', '3']);
    assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint + island.chart.clippedLabels);
    // The band's edge is cut at the top of the plot.
    const edge = pointsOf('.mcs-edge--outer');
    assert.equal(edge[25][1], plot().y);
  });

  it('a balance exactly at the top gridline is not said to run above it', () => {
    // Nothing added, a fifth of it withdrawn every year: today's 600,000 is the highest point.
    const { exact } = drawChart({ start: 600_000, monthly: 0, saveYears: 0, withdrawal: 200_000, withdrawYears: 30 });
    assert.equal(Math.max(...exact.bands.map((b) => b.p90)), 600_000);
    assert.deepEqual(amountLabels(), ['0', '100', '200', '300', '400', '500', '600']);
    assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint);
  });

  it('names the unit once, in the plan’s currency, and writes small amounts in full', () => {
    drawChart({ start: 100, monthly: 0, saveYears: 2, currency: 'USD' });
    assert.equal(unitHeading(), 'Amounts in $');
    assert.deepEqual(amountLabels(), ['0', '25', '50', '75', '100', '125', '150']);
    clear();
    drawChart({ saveYears: 30, currency: 'INR' });
    assert.equal(unitHeading(), 'Amounts in lakhs of ₹');
    assert.deepEqual(labelled().slice(0, 2), [0, 5]);
  });
});

describe('the chart’s gridlines as the text grows', () => {
  it('at twice the text size a wide chart keeps six steps and drops the lighter lines', () => {
    atTextSize(32);
    drawChart({ saveYears: 30 });
    assert.equal(one('svg.mcs-chart').getAttribute('style'), '--chart-fs: 28px; --chart-fv: 32px;');
    assert.deepEqual(amountLabels(), ['0', '0.5', '1', '1.5', '2', '2.5']);
    assert.equal(all('line.mcs-gridMinor').length, 0);
    assert.equal(plot().h, 324, 'the plot keeps its height');
  });

  it('just under twice the size the lighter lines are still drawn', () => {
    atTextSize(31.9);
    drawChart({ saveYears: 30 });
    assert.equal(minorAmountLines().length, 5);
  });

  it('gridlines stay at least 1.8 label heights apart: three steps on a wide chart at four times the size', () => {
    atTextSize(64);
    drawChart({ saveYears: 30 });
    // 324 units of plot, labels 56 units tall: room for three steps, not four.
    assert.deepEqual(amountLabels(), ['0', '1', '2', '3']);
    assert.equal(unitHeading(), 'Amounts in millions of €');
  });

  it('on a phone: six steps at normal text, four at twice the size, two at four times', () => {
    onPhone();
    drawChart({ saveYears: 30 });
    assert.deepEqual([drawing().W, plot().h], [360, 202]);
    assert.deepEqual(amountLabels(), ['0', '0.5', '1', '1.5', '2', '2.5']);
    clear();
    atTextSize(32);
    drawChart({ saveYears: 30 });
    // 202 units of plot, labels 28 units tall: four steps.
    assert.deepEqual(amountLabels(), ['0', '1', '2', '3']);
    clear();
    atTextSize(64);
    drawChart({ saveYears: 30 });
    // Labels 56 units tall: two steps.
    assert.deepEqual(amountLabels(), ['0', '2', '4']);
    assert.equal(amountLines().length, 3);
  });

  it('text is sized from the width the drawing is shown at: half the width, twice the units', () => {
    atTextSize(16, { shown: 0.5 });
    drawChart({ saveYears: 30 });
    assert.equal(one('svg.mcs-chart').getAttribute('style'), '--chart-fs: 28px; --chart-fv: 32px;');
  });
});

describe('the room the amounts take on the left', () => {
  it('is as wide as the widest amount and a gap of one label height', () => {
    drawChart({ saveYears: 30 });
    // "0.5", "1.5", "2.5": three characters of 14-unit text, then 14 units.
    assert.equal(plot().x, Math.ceil(3 * 14 * 0.6 + 14));
    const labels = all('.mcs-axisAmount:not([data-sample])');
    for (const l of labels) assert.equal(l.getAttribute('text-anchor'), 'end');
    assert.equal(all('.mcs-axisAmount--inside').length, 0);
  });

  it('is never under 32 units on a wide chart, or 22 on a phone', () => {
    // Amounts of one digit ("0" to "5").
    drawChart({ start: 4, monthly: 0, saveYears: 1 });
    assert.deepEqual(amountLabels(), ['0', '1', '2', '3', '4', '5']);
    assert.equal(plot().x, 32);
    clear();
    onPhone();
    drawChart({ start: 4, monthly: 0, saveYears: 1 });
    assert.equal(plot().x, Math.ceil(14 * 0.6 + 14), 'a digit and the gap need 23');
    clear();
    textDrawnAs(() => 5);
    drawChart({ start: 4, monthly: 0, saveYears: 1 });
    assert.equal(plot().x, 22, 'drawn narrower than that, the least is 22');
  });

  it('follows the amounts as the browser draws them, up to the width that leaves the plot six tenths of a wide chart', () => {
    // 760 wide, 132 kept on the right: the amounts and their gap may take 172.
    textDrawnAs((cls) => (cls.includes('mcs-axisAmount') ? 158 : 20));
    drawChart({ saveYears: 30 });
    assert.equal(plot().x, 172);
    assert.equal(plot().y, 18);
    assert.equal(all('.mcs-axisAmount--inside').length, 0);
  });

  it('a unit wider, the amounts go inside the plot, above their lines, with room above the top one', () => {
    textDrawnAs((cls) => (cls.includes('mcs-axisAmount') ? 159 : 20));
    drawChart({ saveYears: 30 });
    const p = plot();
    assert.equal(p.x, 32, 'the margin falls back to its least');
    assert.equal(p.y, Math.ceil(1.4 * 14), 'a whole label fits above the top gridline');
    const inside = all('.mcs-axisAmount--inside:not([data-sample])');
    assert.deepEqual(inside.map((l) => l.textContent), ['0.5', '1', '1.5', '2', '2.5']);
    const lines = amountLines();
    inside.forEach((l, i) => {
      assert.equal(num(l, 'x'), p.x + 6);
      near(num(l, 'y'), tenth(num(lines[i + 1], 'y1') - 0.3 * 14), 1e-9);
    });
  });

  it('on a phone the amounts may take 130 units, with 14 kept on the right', () => {
    onPhone();
    textDrawnAs((cls) => (cls.includes('mcs-axisAmount') ? 116 : 20));
    drawChart({ saveYears: 30 });
    assert.equal(plot().x, 130);
    assert.equal(drawing().W - plot().right, 14);
    clear();
    textDrawnAs((cls) => (cls.includes('mcs-axisAmount') ? 117 : 20));
    drawChart({ saveYears: 30 });
    assert.equal(plot().x, 22);
    assert.ok(all('.mcs-axisAmount--inside:not([data-sample])').length > 0);
  });

  it('larger text leaves half a label above the top gridline when the amounts sit beside the plot', () => {
    atTextSize(64);
    drawChart({ saveYears: 30 });
    // Amounts of one digit, 56 units tall: beside the plot, 0.8 of a label above it.
    assert.equal(all('.mcs-axisAmount--inside').length, 0);
    assert.equal(plot().y, Math.ceil(0.8 * 56));
    assert.equal(plot().x, Math.ceil(56 * 0.6 + 56));
  });
});
