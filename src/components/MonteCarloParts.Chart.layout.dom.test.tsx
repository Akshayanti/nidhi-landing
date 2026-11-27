/**
 * The Monte Carlo chart's layout, mounted on its own (#790): its scale and
 * gridlines, year labels, axis title, end labels, lines and bands, and the
 * keys and pointer that pick a year. One file, so a mutant in the chart
 * starts one test process for all of it; each part below was a file of its
 * own and keeps its names to itself in a block.
 */
import {
  t, drawChart, clear, onPhone, atTextSize, textDrawnAs, all, one, money, near,
  tenth, drawing, plot, amountLabels, endLabels, measuredSamples, yOfAmount, withChartWords, titleLines, xOfYear,
  island, chartBox, press, yearRead, pointAt, num, amountLines, minorAmountLines, unitHeading, pointsOf,
  yearLabelEls, yearLabels, minorYearLines, axisTitle,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chartLabel } from '../utils/shared/chartAmounts.ts';
import { fireEvent } from '@testing-library/react';

// The Monte Carlo simulator's chart, the labels at the end of its lines
// (#790): their names and rounded amounts, the dots they belong to, the room
// they are given on the right, when they are left to the cards instead, and
// how labels that would overlap are spread apart inside the plot's height.
// Also the sentence that describes the chart to a screen reader. The chart
// is mounted by itself, with plans worked out for real.
{
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
}

// The Monte Carlo simulator's chart, its lines and bands (#790): every
// year's point at its place across the plot and at its amount up the axis,
// each line drawn as one stroke, and each band filled between its two edges.
// Also the words of the axis title as they are measured. The chart is
// mounted by itself, with a plan worked out for real.
{
  describe('the chart’s lines and bands', () => {
    /** One stroke through every year's amount, as the chart writes a line. */
    const stroke = (amounts: number[], top: number, first = 'M') =>
      amounts.map((v, i) => `${i === 0 ? first : 'L'}${xOfYear(i, amounts.length - 1).toFixed(1)},${yOfAmount(v, top).toFixed(1)}`).join(' ');
    const d = (el: Element) => el.getAttribute('d');

    it('each line is one stroke from today to the last year, through every year’s amount', () => {
      const { exact } = drawChart({ saveYears: 12 });
      assert.deepEqual(amountLabels().at(-1), '500');
      const top = 500_000;
      const of = (key: 'p10' | 'p25' | 'p50' | 'p75' | 'p90') => exact.bands.map((b) => b[key]);
      assert.equal(d(one('.mcs-median')), stroke(of('p50'), top));
      assert.equal(d(one('.mcs-medianGlow')), stroke(of('p50'), top));
      assert.equal(d(one('.mcs-straight')), stroke(exact.straightLine, top));
      const [high, low] = all('.mcs-edge--outer');
      const [upper, lower] = all('.mcs-edge--inner');
      assert.equal(d(high), stroke(of('p90'), top));
      assert.equal(d(low), stroke(of('p10'), top));
      assert.equal(d(upper), stroke(of('p75'), top));
      assert.equal(d(lower), stroke(of('p25'), top));
      assert.equal(xOfYear(12, 12), plot().right, 'the last year at the right edge of the plot');
    });

    it('each band is filled from its upper edge forward and back along its lower edge', () => {
      const { exact } = drawChart({ saveYears: 12 });
      const top = 500_000;
      const of = (key: 'p10' | 'p25' | 'p75' | 'p90') => exact.bands.map((b) => b[key]);
      /** The lower edge from the last year back to today, joined on with lines. */
      const back = (amounts: number[]) => stroke(amounts, top, 'L').split(' ').reverse().join(' ');
      const [outer, inner] = all('g[clip-path] > path:not([class])');
      assert.equal(d(outer), `${stroke(of('p90'), top)} ${back(of('p10'))} Z`);
      assert.equal(d(inner), `${stroke(of('p75'), top)} ${back(of('p25'))} Z`);
    });
  });

  describe('the axis title’s words', () => {
    it('are measured once each, whatever spaces the title is written with', () => {
      drawChart({ saveYears: 12 }, { strings: withChartWords({ axisYears: ' Years  from today ' }) });
      const words = measuredSamples().filter((s) => s.cls.includes('mcs-axisTitle')).map((s) => s.words);
      assert.deepEqual(words, ['Years', 'from', 'today']);
      assert.deepEqual(titleLines(), ['Years from today']);
    });
  });
}

// The Monte Carlo simulator's chart, finding the year to read (#790): which
// year a pointer is over, where the plot's edges stop it, the keys that open
// the read-out and move it along the years, and when the read-out names the
// part of the plan a year falls in. The chart is mounted by itself, with
// plans worked out for real; what the read-out then shows has its own tests.
{
  describe('the year under a pointer', () => {
    /** A thirty-year chart shown at half its drawn width, 100 px in from the window's edge. */
    function shownAtHalf(plotLeft = 40) {
      // Text at half size too, so the drawing is laid out as at normal text.
      atTextSize(8, { shown: 0.5, left: 100 });
      drawChart({ saveYears: 30 });
      const p = plot();
      assert.deepEqual([p.x, p.right], [plotLeft, 628]);
      /** The window position of a place across the drawing, in its own units. */
      return (units: number) => 100 + units / 2;
    }

    it('is the nearest year, wherever on the screen the chart is shown and at whatever width', () => {
      const at = shownAtHalf();
      const year = (y: number) => 40 + (y / 30) * 588;
      pointAt(at(year(15)));
      assert.equal(yearRead(), 15);
      pointAt(at(year(14.4)));
      assert.equal(yearRead(), 14);
      pointAt(at(year(14.6)));
      assert.equal(yearRead(), 15);
      pointAt(at(year(0)));
      assert.equal(yearRead(), 0);
      pointAt(at(year(30)));
      assert.equal(yearRead(), 30);
    });

    it('reads the first or last year up to 12 units outside the plot, and nothing beyond', () => {
      // Amounts drawn narrow, so the plot starts at 32 units.
      textDrawnAs(() => 10);
      const at = shownAtHalf(32);
      pointAt(at(32 - 12));
      assert.equal(yearRead(), 0, 'twelve units left of the plot is still the first year');
      pointAt(at(32 - 13));
      assert.equal(yearRead(), null, 'a unit further closes the read-out');
      pointAt(at(628 + 12));
      assert.equal(yearRead(), 30, 'twelve units right of the plot is still the last year');
      pointAt(at(628 + 13));
      assert.equal(yearRead(), null);
    });

    it('follows the phone drawing’s own width and margins', () => {
      onPhone();
      atTextSize(16, { shown: 1, left: 0 });
      drawChart({ saveYears: 30 });
      const p = plot();
      assert.equal(360 - p.right, 14);
      pointAt(p.x + (20 / 30) * p.w);
      assert.equal(yearRead(), 20);
      pointAt(p.right + 12);
      assert.equal(yearRead(), 30);
      pointAt(p.right + 13);
      assert.equal(yearRead(), null);
    });

    it('a plan with no years has nothing to read', () => {
      atTextSize(16);
      const { exact } = drawChart({ saveYears: 0, withdrawal: 0 });
      assert.equal(exact.years, 0);
      pointAt(plot().x);
      assert.equal(yearRead(), null);
      // Its one point is drawn at the left edge of the plot.
      assert.equal(one('.mcs-median').getAttribute('d'), `M${plot().x.toFixed(1)},${plot().y.toFixed(1)}`);
    });
  });

  describe('reading the chart by keyboard', () => {
    it('the right arrow opens at the first year and steps forward, stopping at the last', () => {
      drawChart({ saveYears: 3 });
      assert.equal(yearRead(), null);
      assert.equal(press('ArrowRight'), false, 'the chart keeps the key from scrolling the page');
      assert.equal(yearRead(), 0);
      press('ArrowRight');
      assert.equal(yearRead(), 1);
      press('ArrowRight');
      press('ArrowRight');
      assert.equal(yearRead(), 3);
      press('ArrowRight');
      assert.equal(yearRead(), 3);
    });

    it('the left arrow opens at the last year and steps back, stopping at the first', () => {
      drawChart({ saveYears: 3 });
      assert.equal(press('ArrowLeft'), false);
      assert.equal(yearRead(), 3);
      press('ArrowLeft');
      assert.equal(yearRead(), 2);
      press('ArrowLeft');
      press('ArrowLeft');
      assert.equal(yearRead(), 0);
      press('ArrowLeft');
      assert.equal(yearRead(), 0);
    });

    it('Home and End jump to the first and last year, open or not', () => {
      drawChart({ saveYears: 3 });
      assert.equal(press('End'), false);
      assert.equal(yearRead(), 3);
      assert.equal(press('Home'), false);
      assert.equal(yearRead(), 0);
      press('ArrowRight');
      press('End');
      assert.equal(yearRead(), 3);
      press('Escape');
      press('Home');
      assert.equal(yearRead(), 0);
    });

    it('other keys are left to the page and change nothing', () => {
      drawChart({ saveYears: 3 });
      assert.equal(press('a'), true);
      assert.equal(press('ArrowDown'), true);
      assert.equal(yearRead(), null);
      press('ArrowRight');
      press('ArrowRight');
      assert.equal(press('a'), true);
      assert.equal(press('Tab'), true);
      assert.equal(yearRead(), 1, 'the read-out stays on its year');
    });

    it('Escape closes the read-out, even when the page swallows the key above the chart', () => {
      drawChart({ saveYears: 3 });
      press('ArrowRight');
      assert.equal(yearRead(), 0);
      const swallow = (e: Event) => e.stopPropagation();
      document.addEventListener('keydown', swallow);
      try {
        assert.equal(press('Escape'), true, 'Escape itself is left to the page');
        assert.equal(yearRead(), null);
      } finally {
        document.removeEventListener('keydown', swallow);
      }
      // And the next arrow starts again from the edge.
      press('ArrowLeft');
      assert.equal(yearRead(), 3);
    });

    it('leaving the chart with the keyboard closes it', () => {
      drawChart({ saveYears: 3 });
      press('End');
      fireEvent.blur(chartBox());
      assert.equal(yearRead(), null);
    });
  });

  describe('the part of the plan a year falls in', () => {
    const tag = () => document.querySelector('.chart-readoutTag')?.textContent ?? null;

    it('is named when the plan saves and then lives off the money', () => {
      drawChart({ saveYears: 2, withdrawal: 20_000, withdrawYears: 3 });
      press('ArrowRight');
      assert.equal(tag(), island.chart.phaseStart);
      press('ArrowRight');
      assert.equal(tag(), island.chart.phaseSaving);
      press('End');
      assert.equal(tag(), 'Withdrawing, year 3');
      assert.ok(document.querySelector('rect.mcs-phase'), 'and the years of living off it are shaded');
    });

    it('is not named for a plan that only saves', () => {
      drawChart({ saveYears: 5, withdrawal: 0, withdrawYears: 30 });
      press('ArrowRight');
      assert.equal(yearRead(), 0);
      assert.equal(tag(), null);
      assert.ok(document.querySelector('rect.mcs-phase') === null);
    });

    it('is not named when withdrawals are set for no years', () => {
      // As the form can hold it for a moment: an amount to withdraw, over nought years.
      drawChart({ saveYears: 5, withdrawal: 20_000, withdrawYears: 0 });
      press('ArrowRight');
      assert.equal(yearRead(), 0);
      assert.equal(tag(), null);
    });
  });
}

// The Monte Carlo simulator's chart, its amount axis (#790): how high the
// axis goes, where its gridlines are and which amounts label them, the unit
// the heading names, how many gridlines larger text leaves room for, and the
// room the amounts take on the left (or inside the plot when they are too
// wide). The chart is mounted by itself, with plans worked out for real.
{
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
}

// The Monte Carlo simulator's chart, its year axis (#790): which years are
// labelled for short and long plans, on a wide screen and a phone and at
// larger text, the lighter lines for the years between, and the axis title:
// the lines it takes, the room it is given, where it sits and when it is
// drawn smaller. The chart is mounted by itself, with plans worked out for real.
{
  /** The years a plan of `years` of saving labels. */
  function labelsFor(years: number) {
    clear();
    drawChart({ saveYears: years });
    return yearLabels();
  }
  /** The years that get a lighter line, read back from where the lines are drawn. */
  const minorYears = (years: number) => minorYearLines().map((x) => Math.round(((x - plot().x) / plot().w) * years * 100) / 100);
  /** The gridlines drawn up the plot at labelled years. */
  const yearLines = () => all('line.mcs-grid').filter((l) => l.getAttribute('x1') === l.getAttribute('x2')).map((l) => num(l, 'x1'));

  describe('the years the chart labels', () => {
    // The horizon's own year is always labelled (#757): past the last step it
    // is added, or takes the last step's place when less than half a step on.
    it('every year up to ten years, every fifth up to thirty, every tenth beyond, and always the last year', () => {
      assert.deepEqual(labelsFor(8), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
      assert.deepEqual(labelsFor(10), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
      assert.deepEqual(labelsFor(11), ['0', '5', '11']);
      assert.deepEqual(labelsFor(30), ['0', '5', '10', '15', '20', '25', '30']);
      assert.deepEqual(labelsFor(31), ['0', '10', '20', '31']);
      assert.deepEqual(labelsFor(35), ['0', '10', '20', '30', '35']);
      assert.deepEqual(labelsFor(60), ['0', '10', '20', '30', '40', '50', '60']);
    });

    it('each label sits under its year, with a gridline up the plot at every one after the first', () => {
      drawChart({ saveYears: 30 });
      const p = plot();
      const labels = yearLabelEls();
      labels.forEach((l, i) => near(num(l, 'x'), xOfYear(i * 5, 30), 1e-6, `label ${i * 5}`));
      assert.deepEqual(yearLines(), [5, 10, 15, 20, 25, 30].map((y) => xOfYear(y, 30)));
      assert.equal(xOfYear(30, 30), p.right);
    });

    it('a plan of saving and living off it is labelled over all its years', () => {
      drawChart({ saveYears: 10, withdrawal: 20_000, withdrawYears: 25 });
      assert.deepEqual(yearLabels(), ['0', '10', '20', '30', '35']);
    });

    it('on a phone, labels that would touch are thinned: every other year of ten', () => {
      onPhone();
      assert.deepEqual(labelsFor(10), ['0', '2', '4', '6', '8', '10']);
      assert.deepEqual(minorYearLines(), [], 'no lighter lines between every other year');
      // Nine years: single digits leave room for each.
      assert.deepEqual(labelsFor(9), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
      assert.deepEqual(labelsFor(30), ['0', '5', '10', '15', '20', '25', '30']);
      assert.deepEqual(labelsFor(60), ['0', '10', '20', '30', '40', '50', '60']);
    });

    it('larger text labels fewer years, keeping a gap of one label height between them', () => {
      atTextSize(32);
      // Text 28 units tall: "30" and its gap need 61.6 units, five years are 91 apart.
      assert.deepEqual(labelsFor(30), ['0', '5', '10', '15', '20', '25', '30']);
      // A hundred and twenty years: three digits and their gap fit between labels twenty years apart.
      clear();
      drawChart({ saveYears: 60, withdrawal: 20_000, withdrawYears: 60 });
      assert.deepEqual(yearLabels(), ['0', '20', '40', '60', '80', '100', '120']);
      // A quarter larger, they need twenty-five.
      clear();
      atTextSize(40);
      drawChart({ saveYears: 60, withdrawal: 20_000, withdrawYears: 60 });
      // The end year takes the place of the label it would touch.
      assert.deepEqual(yearLabels(), ['0', '25', '50', '75', '120']);
      clear();
      atTextSize(32);
      clear();
      onPhone();
      assert.deepEqual(labelsFor(30), ['0', '10', '20', '30']);
      assert.deepEqual(labelsFor(60), ['0', '20', '40', '60']);
    });

    it('when even fifty years apart is too tight, the start and the end are kept, and the years between give way', () => {
      onPhone();
      atTextSize(64);
      drawChart({ saveYears: 60, withdrawal: 20_000, withdrawYears: 60 });
      assert.deepEqual(yearLabels(), ['0', '120']);
    });
  });

  describe('the lighter lines for the years between', () => {
    it('every year between labels five years apart, and none past the last year', () => {
      drawChart({ saveYears: 12 });
      assert.deepEqual(yearLabels(), ['0', '5', '12']);
      assert.deepEqual(minorYears(12), [1, 2, 3, 4, 6, 7, 8, 9, 11]);
      const p = plot();
      for (const l of all('line.mcs-gridMinor').filter((m) => m.getAttribute('x1') === m.getAttribute('x2'))) assert.deepEqual([num(l, 'y1'), num(l, 'y2')], [p.y, p.bottom]);
    });

    it('every second year between labels ten years apart', () => {
      drawChart({ saveYears: 31 });
      assert.deepEqual(minorYears(31), [2, 4, 6, 8, 12, 14, 16, 18, 22, 24, 26, 28]);
    });

    it('none where every year is labelled', () => {
      drawChart({ saveYears: 8 });
      assert.deepEqual(minorYearLines(), []);
      assert.equal(minorAmountLines().length > 0, true, 'the amounts keep theirs');
    });

    it('none at twice the text size or more', () => {
      atTextSize(32);
      drawChart({ saveYears: 30 });
      assert.deepEqual(yearLabels(), ['0', '5', '10', '15', '20', '25', '30']);
      assert.deepEqual(minorYearLines(), []);
    });
  });

  describe('the title under the years', () => {
    /** Draws a thirty-year plan with each word of the title drawn `width` units wide. */
    function titled(width: number, words = 'Years from today', amounts = 10) {
      clear();
      textDrawnAs((cls) => (cls.includes('mcs-axisTitle') ? width : cls.includes('mcs-axisAmount') ? amounts : 10));
      drawChart({ saveYears: 30 }, { strings: withChartWords({ axisYears: words }) });
    }

    it('takes one line while its words and the spaces between them fit across 94% of the drawing', () => {
      onPhone();
      // 360 wide: 338.4 to fill. Three words of 109 and two spaces of 4.2 are 335.4.
      titled(109);
      assert.deepEqual(titleLines(), ['Years from today']);
      assert.equal(drawing().H - plot().bottom, Math.ceil((2.6 + 1.2) * 14), 'room for the years and one line of title');
      // Three words of 111 fit by themselves (333) but not with their spaces (341.4).
      titled(111);
      assert.deepEqual(titleLines(), ['Years from', 'today']);
      assert.equal(drawing().H - plot().bottom, Math.ceil((2.6 + 2 * 1.2) * 14), 'a line more room for the second line');
    });

    it('counts one space between two words, 0.3 of the text’s height', () => {
      onPhone();
      // Two words of 167 and one space of 4.2 are 338.2: they share a line.
      titled(167);
      assert.deepEqual(titleLines(), ['Years from', 'today']);
      // Two words of 168 and their space are 340.2: a line each.
      titled(168);
      assert.deepEqual(titleLines(), ['Years', 'from', 'today']);
      assert.equal(drawing().H - plot().bottom, Math.ceil((2.6 + 3 * 1.2) * 14));
    });

    it('a wide chart keeps the room under its plot until the title needs more', () => {
      drawChart({ saveYears: 30 });
      assert.deepEqual(titleLines(), ['Years from today']);
      assert.equal(drawing().H - plot().bottom, 56);
      assert.equal(drawing().H, 18 + 324 + 56);
      clear();
      atTextSize(32);
      drawChart({ saveYears: 30 });
      assert.equal(drawing().H - plot().bottom, Math.ceil((2.6 + 1.2) * 28));
    });

    it('sits under the middle of the plot while it fits there', () => {
      drawChart({ saveYears: 30 });
      const p = plot();
      assert.equal(num(axisTitle(), 'x'), Math.round(p.x + p.w / 2));
      for (const line of all('text.mcs-axisTitle:not([data-sample]) tspan')) assert.equal(num(line, 'x'), Math.round(p.x + p.w / 2));
      assert.equal(axisTitle().getAttribute('style'), null);
      assert.equal(axisTitle().getAttribute('visibility'), null);
    });

    it('is moved in from the right edge only as far as it has to be', () => {
      onPhone();
      // One line 320 wide: half of it and 2 units is 162, so its middle is 198 from the left, not under the plot’s middle.
      // The amounts take 100 units on the left, so the plot’s middle is right of the drawing’s.
      titled(320, 'Yearsfromtoday', 86);
      const p = plot();
      assert.equal(p.x, 100);
      assert.ok(p.x + p.w / 2 > 198, 'the plot’s middle is further right');
      assert.equal(num(axisTitle(), 'x'), 360 - 162);
      assert.equal(axisTitle().getAttribute('style'), null, 'at its full size');
    });

    it('is moved in from the left edge only as far as it has to be', () => {
      // A wide chart keeps more room on its right than on its left, so its plot’s middle is left of the drawing’s.
      titled(700, 'Yearsfromtoday');
      const p = plot();
      assert.ok(p.x + p.w / 2 < 352, 'the plot’s middle is further left');
      assert.equal(num(axisTitle(), 'x'), 700 / 2 + 2);
    });

    it('a word wider than the drawing is drawn smaller, by just enough to fit', () => {
      onPhone();
      // 360 wide with 2 units kept each side: a word 400 wide is drawn at 0.89 of its size.
      titled(400, 'Yearsfromtoday');
      near(parseFloat(axisTitle().style.fontSize), 14 * (356 / 400), 1e-9, 'title size');
      assert.equal(axisTitle().getAttribute('visibility'), null);
      assert.equal(num(axisTitle(), 'x'), 180, 'in the middle of the drawing');
      // A word that fits exactly keeps its size.
      titled(356, 'Yearsfromtoday');
      assert.equal(axisTitle().getAttribute('style'), null);
      assert.equal(num(axisTitle(), 'x'), 180);
    });

    it('with several lines, fits the widest of them', () => {
      onPhone();
      textDrawnAs((cls, words) => (!cls.includes('mcs-axisTitle') ? 10 : words === 'from' ? 400 : 100));
      drawChart({ saveYears: 30 }, { strings: withChartWords({ axisYears: 'Years from today' }) });
      assert.deepEqual(titleLines(), ['Years', 'from', 'today']);
      near(parseFloat(axisTitle().style.fontSize), 14 * (356 / 400), 1e-9, 'title size');
      assert.equal(num(axisTitle(), 'x'), 180);
    });

    it('a word that would be drawn under the least size is left out', () => {
      onPhone();
      // Chart words are never drawn under 0.75 rem: 356 of 420 is under that share, 356 of 410 is not.
      titled(420, 'Yearsfromtoday');
      assert.equal(axisTitle().getAttribute('visibility'), 'hidden');
      titled(410, 'Yearsfromtoday');
      assert.equal(axisTitle().getAttribute('visibility'), null);
    });
  });
}
