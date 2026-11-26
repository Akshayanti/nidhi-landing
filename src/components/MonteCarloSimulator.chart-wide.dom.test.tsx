/**
 * The Monte Carlo simulator's chart on a wide screen (#790): where the plot,
 * its axes, lines, bands, gridlines and end labels are drawn, the year labels
 * of short and long plans, a band cut at the top, and the shade over the
 * years of living off the money.
 */
import {
  t, island, settle, drawPlan, text, one, money, retype, num, svg,
  viewBox, plotBox, points, pathOf, axisUnit, axisTop, heightOf, near, pressOnChart, yearLabels,
} from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chartLabel as chartLabelIn } from '../utils/shared/chartAmounts.ts';

/** A cell's own text, without the column name it shows where the table is drawn as records. */
const cellText = (c: Element) => { const x = c.cloneNode(true) as Element; x.querySelectorAll('.tool-recordLabel').forEach((l) => l.remove()); return x.textContent; };

// Mounting the page is the dearest step of every test, so each test below
// mounts once and checks all that one plan shows.

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
      assert.ok(document.querySelector('rect.mcs-phase') === null);
    }
    {
      // a plan of a multiple of five years ends its table on it once
      await settle(20);
      assert.deepEqual([...document.querySelectorAll('.mcs-table tbody th')].map(cellText), ['0', '5', '10', '15', '20', '25', '30']);
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
    assert.ok(document.querySelector('.mcs-phaseLabel') === null);
  });

});
