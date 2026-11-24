/**
 * What the Monte Carlo simulator's chart draws on a wide screen, on the chart
 * mounted by itself (#790): its frame and accessible names, the gridlines and
 * their labels, the bands and lines in their order, the end labels, the shade
 * over the years of living off the money, the marks on the year being read,
 * and the legend under it.
 */
import {
  words, tools, drawChart, one, all, text, num, money, tenth, near, svg, drawing, plotBox, axisAmounts, axisTop,
  heightOf, acrossOf, linePoints, bandPoints, yearLabels, levelLines, uprightLines, press, readYear, laidOut, onPhone,
  drawn,
} from '../../test/monteCarloParts.chart-readout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chartLabel } from '../utils/shared/chartAmounts.ts';
import { spreadLabels } from './MonteCarloSimulator.tsx';

const FS = 14;
const FV = 16;
const label = (v: number) => chartLabel(v, 'EUR', tools.export.chart, null, 'en');

describe('the chart’s frame, on a wide screen', () => {
  it('a figure with the unit above, the drawing in a box a keyboard reaches, and the legend below', () => {
    const { worded } = drawChart({ saveYears: 30 });
    assert.deepEqual(all('.mcs-figure > *').map((el) => `${el.tagName.toLowerCase()}.${el.className}`), ['p.mcs-swipe', 'p.tool-chartUnit', 'div.mcs-chartScroll', 'figcaption.mcs-legend']);
    const swipe = one('.mcs-swipe');
    assert.equal(swipe.textContent, words.swipe);
    assert.equal(swipe.getAttribute('aria-hidden'), 'true');
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in millions of €');
    const box = one('.mcs-chartScroll > div');
    assert.equal(box.className, 'mcs-chartBox');
    assert.equal(box.getAttribute('tabindex'), '0');
    assert.equal(box.getAttribute('role'), 'group');
    assert.equal(box.getAttribute('aria-label'), words.groupLabel);
    const s = svg();
    assert.equal(s.getAttribute('class'), 'mcs-chart');
    assert.equal(s.getAttribute('role'), 'img');
    const p = plotBox();
    assert.equal(s.getAttribute('viewBox'), `0 0 760 ${p.bottom + 56}`);
    assert.equal(s.getAttribute('style'), '--chart-fs: 14px; --chart-fv: 16px;');
    const [title, desc] = (s.getAttribute('aria-labelledby') ?? '').split(' ').map((id) => document.getElementById(id));
    assert.equal(title?.tagName, 'title');
    assert.equal(title?.textContent, 'Spread of simulated outcomes');
    assert.equal(desc?.tagName, 'desc');
    const end = worded.bands[30];
    assert.equal(desc?.textContent, `Fan chart of 50 simulated paths over 30 years. At the end, the 10th percentile is ${money(end.p10)}, the median ${money(end.p50)}, and the 90th percentile ${money(end.p90)}. A single fixed-return line ends at ${money(worded.straightLine[30])}.`);
  });

  it('the legend names each mark, and how to read a year', () => {
    drawChart({ saveYears: 30 });
    const spans = all('.mcs-legend > span');
    assert.deepEqual(spans.map((s) => s.textContent), [words.legendPaths, words.legendMiddle, words.legendMedian, words.legendStraight, words.legendHint]);
    assert.deepEqual(
      spans.slice(0, 4).map((s) => [s.querySelector('i')?.className, s.querySelector('i')?.getAttribute('aria-hidden')]),
      [['mcs-key mcs-key--outer', 'true'], ['mcs-key mcs-key--inner', 'true'], ['mcs-key mcs-key--median', 'true'], ['mcs-key mcs-key--straight', 'true']],
    );
    assert.equal(spans[4].className, 'mcs-legendHint');
    assert.equal(spans[4].querySelector('i') === null, true);
  });
});

describe('the chart’s gridlines and labels, on a wide screen', () => {
  it('a line and an amount at each step, lighter lines between, and the years along the bottom', () => {
    drawChart({ saveYears: 30 });
    const p = plotBox();
    const { H } = drawing();
    const amounts = axisAmounts();
    const count = amounts.length - 1;
    assert.ok(count >= 2);
    const top = axisTop();
    const step = top / count;
    {
      // the amounts: the bottom line is the axis, each label at the left of its line
      const groups = all('svg.mcs-chart > g:not(.chart-measure)').filter((g) => g.querySelector(':scope > text.mcs-axisAmount'));
      assert.equal(groups.length, count + 1);
      groups.forEach((g, i) => {
        const line = one('line', g);
        assert.equal(line.getAttribute('class'), i === 0 ? 'mcs-axisLine' : 'mcs-grid');
        assert.deepEqual([num(line, 'x1'), num(line, 'x2')], [p.x, p.right]);
        near(num(line, 'y1'), heightOf(i * step, top), 1e-6);
        assert.equal(line.getAttribute('y1'), line.getAttribute('y2'));
        const amount = one('text', g);
        assert.equal(amount.getAttribute('class'), 'mcs-axis mcs-axisAmount');
        assert.equal(amount.getAttribute('text-anchor'), 'end');
        assert.equal(num(amount, 'x'), tenth(p.x - 0.6 * FS));
        assert.equal(num(amount, 'y'), tenth(heightOf(i * step, top) + 0.35 * FS));
        assert.equal(amount.getAttribute('style'), null);
        assert.equal(amount.getAttribute('visibility'), null);
      });
      assert.equal(amounts[0], '0');
    }
    {
      // lighter lines half-way between the amounts
      const minor = levelLines('line.mcs-gridMinor');
      assert.equal(minor.length, count);
      minor.forEach((line, i) => {
        assert.deepEqual([num(line, 'x1'), num(line, 'x2')], [p.x, p.right]);
        near(num(line, 'y1'), heightOf((i + 0.5) * step, top), 1e-6);
      });
    }
    {
      // the years: a label every five, a line at each but the first, lighter lines at the years between
      assert.deepEqual(yearLabels(), ['0', '5', '10', '15', '20', '25', '30']);
      const groups = all('svg.mcs-chart > g:not(.chart-measure)').filter((g) => g.querySelector(':scope > text.mcs-axis:not(.mcs-axisAmount)'));
      assert.equal(groups.length, 7);
      groups.forEach((g, i) => {
        const year = one('text', g);
        assert.equal(year.getAttribute('class'), 'mcs-axis');
        near(num(year, 'x'), acrossOf(i * 5, 30), 1e-6);
        assert.equal(num(year, 'y'), tenth(p.bottom + 1.4 * FS));
        assert.equal(year.getAttribute('text-anchor'), 'middle');
        const lines = all('line', g);
        assert.equal(lines.length, i === 0 ? 0 : 1, 'the first year stands on the plot’s own edge');
        if (i > 0) {
          assert.equal(lines[0].getAttribute('class'), 'mcs-grid');
          near(num(lines[0], 'x1'), acrossOf(i * 5, 30), 1e-6);
          assert.equal(lines[0].getAttribute('x1'), lines[0].getAttribute('x2'));
          assert.deepEqual([num(lines[0], 'y1'), num(lines[0], 'y2')], [p.y, H - 56]);
        }
      });
      const between = uprightLines('line.mcs-gridMinor');
      const years = Array.from({ length: 31 }, (_, y) => y).filter((y) => y % 5 !== 0);
      assert.equal(between.length, years.length);
      between.forEach((line, i) => {
        near(num(line, 'x1'), acrossOf(years[i], 30), 1e-6);
        assert.deepEqual([num(line, 'y1'), num(line, 'y2')], [p.y, H - 56]);
      });
    }
    {
      // the axis title: one line, under the middle of the plot, at its full size
      const title = one('text.mcs-axisTitle:not([data-sample])');
      assert.equal(title.getAttribute('class'), 'mcs-axis mcs-axisTitle');
      assert.equal(title.getAttribute('text-anchor'), 'middle');
      assert.equal(num(title, 'x'), Math.round(p.x + p.w / 2));
      assert.equal(num(title, 'y'), tenth(H - 56 + 3 * FS));
      assert.equal(title.getAttribute('style'), null);
      assert.equal(title.getAttribute('visibility'), null);
      const lines = all('tspan', title);
      assert.deepEqual(lines.map((l) => [l.textContent, l.getAttribute('x'), l.getAttribute('dy')]), [[words.axisYears, title.getAttribute('x'), '0']]);
    }
  });
});

describe('the chart’s bands and lines, on a wide screen', () => {
  it('draws the wide band, the middle half, their edges, the single line and the median on top, cut to the plot', () => {
    const { exact } = drawChart({ saveYears: 12 });
    const p = plotBox();
    const top = axisTop();
    const group = one('svg.mcs-chart > g[clip-path]');
    {
      // cut to the plot
      const id = /^url\(#(.+)\)$/.exec(group.getAttribute('clip-path') ?? '')?.[1] ?? '';
      const clip = document.getElementById(id);
      assert.equal(clip?.tagName, 'clipPath');
      const r = one('rect', clip!);
      assert.deepEqual([num(r, 'x'), num(r, 'y'), num(r, 'width'), num(r, 'height')], [p.x, p.y, p.w, p.h]);
    }
    const paths = all(':scope > path', group);
    assert.deepEqual(paths.map((el) => el.getAttribute('class')), [
      null, null,
      'mcs-edge mcs-edge--outer', 'mcs-edge mcs-edge--outer', 'mcs-edge mcs-edge--inner', 'mcs-edge mcs-edge--inner',
      'mcs-straight', 'mcs-medianGlow', 'mcs-median',
    ]);
    const d = (i: number) => paths[i].getAttribute('d') ?? '';
    const of = (k: 'p10' | 'p25' | 'p50' | 'p75' | 'p90') => exact.bands.map((b) => b[k]);
    const follows = (drawn: [number, number][], values: number[], years: number[], what: string) => {
      assert.equal(drawn.length, values.length, what);
      drawn.forEach(([x, y], i) => {
        near(x, acrossOf(years[i], 12), 0.051, `${what}, year ${years[i]}, across`);
        near(y, heightOf(values[i], top), 0.051, `${what}, year ${years[i]}, up`);
      });
    };
    const forward = Array.from({ length: 13 }, (_, y) => y);
    const back = [...forward].reverse();
    {
      // each band: along its upper edge, then back along its lower one
      const fill = (i: number) => document.getElementById(/^url\(#(.+)\)$/.exec(paths[i].getAttribute('fill') ?? '')?.[1] ?? '');
      const outer = bandPoints(d(0));
      follows(outer.slice(0, 13), of('p90'), forward, 'the wide band’s top');
      follows(outer.slice(13), [...of('p10')].reverse(), back, 'the wide band’s bottom');
      assert.deepEqual(all('stop', fill(0)!).map((s) => [s.getAttribute('offset'), s.getAttribute('class')]), [['0%', 'mcs-stop mcs-stop--outerTop'], ['100%', 'mcs-stop mcs-stop--outerBottom']]);
      const inner = bandPoints(d(1));
      follows(inner.slice(0, 13), of('p75'), forward, 'the middle half’s top');
      follows(inner.slice(13), [...of('p25')].reverse(), back, 'the middle half’s bottom');
      assert.deepEqual(all('stop', fill(1)!).map((s) => [s.getAttribute('offset'), s.getAttribute('class')]), [['0%', 'mcs-stop mcs-stop--innerTop'], ['100%', 'mcs-stop mcs-stop--innerBottom']]);
      assert.ok(fill(0) !== fill(1));
    }
    follows(linePoints(d(2)), of('p90'), forward, 'the high edge');
    follows(linePoints(d(3)), of('p10'), forward, 'the low edge');
    follows(linePoints(d(4)), of('p75'), forward, 'the middle half’s upper edge');
    follows(linePoints(d(5)), of('p25'), forward, 'the middle half’s lower edge');
    follows(linePoints(d(6)), exact.straightLine, forward, 'the single line');
    follows(linePoints(d(7)), of('p50'), forward, 'the median’s glow');
    follows(linePoints(d(8)), of('p50'), forward, 'the median');
    const glow = document.getElementById(/^url\(#(.+)\)$/.exec(paths[7].getAttribute('filter') ?? '')?.[1] ?? '');
    assert.equal(glow?.tagName, 'filter');
    assert.ok(glow?.querySelector('feGaussianBlur'));
    assert.equal(paths[8].getAttribute('filter'), null);
  });
});

describe('the chart’s end labels, on a wide screen', () => {
  /** The three end labels of the chart as drawn: each dot on its value, its name and amount beside it. Returns how many had to move. */
  function endLabelsOf({ exact, worded }: ReturnType<typeof drawChart>, years: number): number {
    const p = plotBox();
    const top = axisTop();
    const end = exact.bands[years];
    const said = worded.bands[years];
    const groups = all('g.mcs-endLabel');
    assert.deepEqual(groups.map((g) => g.getAttribute('class')), ['mcs-endLabel mcs-endLabel--outer', 'mcs-endLabel mcs-endLabel--median', 'mcs-endLabel mcs-endLabel--outer']);
    const dotY = [end.p90, end.p50, end.p10].map((v) => tenth(heightOf(v, top)));
    // Two lines a label, half a line between labels, and all of them beside the plot.
    const labelY = spreadLabels(dotY, Math.ceil(FS + FV + 0.5 * FS), p.y + FS, p.bottom - 1.4 * FV).map(tenth);
    groups.forEach((g, i) => {
      const dot = one('circle', g);
      assert.deepEqual([num(dot, 'cx'), num(dot, 'cy'), dot.getAttribute('r')], [p.right, dotY[i], '4']);
      const beside = one('text', g);
      assert.deepEqual([num(beside, 'x'), num(beside, 'y')], [p.right + 12, labelY[i] - 2]);
      const [name, value] = all('tspan', beside);
      assert.equal(name.getAttribute('class'), 'mcs-endName');
      assert.equal(name.textContent, [words.endHigh, words.endMedian, words.endLow][i]);
      assert.equal(value.getAttribute('class'), 'mcs-endValue');
      assert.equal(value.textContent, label([said.p90, said.p50, said.p10][i]));
      assert.deepEqual([num(value, 'x'), num(value, 'dy')], [p.right + 12, tenth(1.1 * FV)]);
      // A line back to its point only where the label had to move away from it.
      const leader = g.querySelector('.mcs-leader');
      assert.equal(Boolean(leader), Math.abs(labelY[i] - dotY[i]) > 4, `label ${i}`);
      if (leader) assert.deepEqual([num(leader, 'x1'), num(leader, 'y1'), num(leader, 'x2'), num(leader, 'y2')], [p.right + 5, dotY[i], p.right + 8, tenth(labelY[i] - 0.4 * FS)]);
    });
    return labelY.filter((y, i) => Math.abs(y - dotY[i]) > 4).length;
  }

  it('names where the high, median and low paths end, each beside its dot', () => {
    assert.equal(endLabelsOf(drawChart({ saveYears: 30 }), 30), 0, 'the case: no label had to move');
    assert.equal(all('.mcs-leader').length, 0);
    assert.equal(one('.mcs-legendHint').textContent, words.legendHint, 'nothing runs above the top, so the legend adds nothing');
  });

  it('labels that would overlap are spread apart, with a line back to each one’s point', () => {
    assert.ok(endLabelsOf(drawChart({ saveYears: 1, stockPct: 0, start: 0, monthly: 10_000 }), 1) >= 1, 'the case: a label had to move');
  });

  it('a band that runs above the top: its label points up, its dot stays at the top, and the legend says so', () => {
    const { exact, worded } = drawChart({ saveYears: 5, start: 500_000, withdrawal: 1_000, withdrawYears: 40 });
    const p = plotBox();
    const top = axisTop();
    assert.ok(exact.bands[45].p90 > top && exact.bands[45].p50 <= top, 'the case: only the high path ends above the top');
    assert.deepEqual(text('tspan.mcs-endName'), ['High ↑', 'Median', 'Low']);
    assert.equal(text('tspan.mcs-endValue')[0], label(worded.bands[45].p90));
    const dots = all('.mcs-endLabel circle');
    assert.equal(dots.length, 3);
    assert.deepEqual([num(dots[0], 'cx'), num(dots[0], 'cy')], [p.right, p.y]);
    assert.equal(one('.mcs-legendHint').textContent, words.legendHint + words.clippedLabels);
  });
});

describe('a value exactly on the chart’s top line', () => {
  // A plan whose high path runs above the top, and its result with the last
  // year moved onto the top line itself: high, upper middle, median and the
  // single line all end exactly there.
  const plan = { saveYears: 5, start: 500_000, withdrawal: 1_000, withdrawYears: 40 };
  function onTheLine() {
    const first = drawChart(plan);
    const top = axisTop();
    assert.ok(Number.isInteger(top) && first.exact.bands[45].p90 > top, 'the case: a round top, with the high path above it');
    first.unmount();
    const bands = first.exact.bands.map((b, year) => (year === 45 ? { ...b, p50: top, p75: top, p90: top } : b));
    const straightLine = first.exact.straightLine.map((v, year) => (year === 45 ? top : v));
    const chart = drawChart(plan, { result: { ...first.exact, bands, straightLine } });
    assert.equal(axisTop(), top, 'the case: the same top');
    return chart;
  }

  it('is inside the chart: its end label points nowhere, and reading the year puts a dot on it', () => {
    onTheLine();
    const p = plotBox();
    assert.deepEqual(text('tspan.mcs-endName'), ['High', 'Median', 'Low']);
    press('End');
    const dots = all('.mcs-hoverDot');
    assert.deepEqual(dots.map((dot) => dot.getAttribute('class')), ['mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--straight', 'mcs-hoverDot mcs-hoverDot--median']);
    assert.deepEqual([0, 2, 3].map((i) => num(dots[i], 'cy')), [p.y, p.y, p.y]);
  });

  it('on a phone: it keeps the dot where it ends', () => {
    onPhone(() => {
      onTheLine();
      const p = plotBox();
      const dots = all('.mcs-endLabel circle');
      assert.equal(dots.length, 3);
      assert.deepEqual([num(dots[0], 'cy'), num(dots[1], 'cy')], [p.y, p.y]);
    });
  });
});

describe('the years of living off the money, on a wide screen', () => {
  it('are shaded from the last year of saving to the end, and named at the top', () => {
    drawChart({ saveYears: 10, withdrawal: 20_000, withdrawYears: 20 });
    const p = plotBox();
    const shade = one('rect.mcs-phase');
    near(num(shade, 'x'), acrossOf(10, 30), 1e-6);
    near(num(shade, 'width'), p.right - acrossOf(10, 30), 1e-6);
    assert.deepEqual([num(shade, 'y'), num(shade, 'height')], [p.y, p.h]);
    const name = one('.mcs-phaseLabel');
    assert.equal(name.textContent, words.livingOff);
    near(num(name, 'x'), acrossOf(10, 30) + 10, 1e-6);
    assert.equal(num(name, 'y'), tenth(p.y + 1.4 * FS));
    // Drawn under the gridlines and the bands, straight after the plot's ground.
    assert.ok(shade.parentElement?.previousElementSibling === one('.mcs-plotBg'));
  });

  it('the name is left out where the shade is narrower than its words and their margin', () => {
    const room = words.livingOff.length * FS * 0.6 + 20;
    const chart = drawChart({ saveYears: 23, withdrawal: 20_000, withdrawYears: 7 });
    const width = () => num(one('rect.mcs-phase'), 'width');
    assert.ok(width() >= room && width() < room + 20, 'just wide enough');
    assert.ok(drawn('.mcs-phaseLabel'));
    chart.redraw({ saveYears: 24, withdrawal: 20_000, withdrawYears: 6 });
    assert.ok(width() < room && width() > room - 20, 'just too narrow');
    assert.equal(drawn('.mcs-phaseLabel'), false);
  });

  it('a plan that only saves has no shade, nor has one whose result holds no year of withdrawals yet', () => {
    const chart = drawChart({ saveYears: 10 });
    assert.equal(drawn('rect.mcs-phase'), false);
    assert.equal(drawn('.mcs-phaseLabel'), false);
    // The plan already asks for withdrawals; the result drawn is still the ten years of saving.
    chart.redraw({ saveYears: 10, withdrawal: 20_000, withdrawYears: 20 }, { result: chart.exact });
    assert.equal(drawn('rect.mcs-phase'), false);
  });
});

describe('the year being read, on a wide screen', () => {
  it('is marked with a line and a dot on each value', () => {
    const { exact } = drawChart({ saveYears: 4 });
    assert.equal(drawn('.mcs-hover'), false);
    readYear(3);
    const p = plotBox();
    const top = axisTop();
    const x = acrossOf(3, 4);
    const marks = one('g.mcs-hover');
    assert.equal(marks.getAttribute('pointer-events'), 'none');
    assert.ok(marks === svg().lastElementChild, 'drawn over everything else');
    const line = one('.mcs-hoverLine');
    assert.deepEqual([num(line, 'x1'), num(line, 'x2'), num(line, 'y1'), num(line, 'y2')], [x, x, p.y, p.bottom]);
    const dots = all('.mcs-hoverDot');
    assert.deepEqual(dots.map((dot) => [dot.getAttribute('class'), dot.getAttribute('r')]), [
      ['mcs-hoverDot mcs-hoverDot--outer', '5'], ['mcs-hoverDot mcs-hoverDot--outer', '5'], ['mcs-hoverDot mcs-hoverDot--straight', '5'], ['mcs-hoverDot mcs-hoverDot--median', '6'],
    ]);
    const b = exact.bands[3];
    [b.p90, b.p10, exact.straightLine[3], b.p50].forEach((v, i) => {
      assert.equal(num(dots[i], 'cx'), x);
      near(num(dots[i], 'cy'), heightOf(v, top), 1e-6, `dot ${i}`);
    });
  });

  it('a high value above the top gets no dot, and is still read out', () => {
    const { exact, worded } = drawChart({ saveYears: 5, start: 500_000, withdrawal: 1_000, withdrawYears: 40 });
    const top = axisTop();
    assert.ok(exact.bands[45].p90 > top);
    press('End');
    assert.deepEqual(all('.mcs-hoverDot').map((dot) => dot.getAttribute('class')), ['mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--straight', 'mcs-hoverDot mcs-hoverDot--median']);
    near(num(all('.mcs-hoverDot')[0], 'cy'), heightOf(exact.bands[45].p10, top), 1e-6, 'the low dot');
    assert.equal(text('.chart-readout dd')[0], money(worded.bands[45].p90));
  });
});

describe('the chart at a reader’s larger text, on a wide screen', () => {
  it('draws its words at the reader’s size, and places them by it', () => {
    laidOut({ textSize: 24 }, () => {
      drawChart({ saveYears: 10, withdrawal: 20_000, withdrawYears: 20 });
      const fs = 0.875 * 24;
      assert.equal(svg().getAttribute('style'), '--chart-fs: 21px; --chart-fv: 24px;');
      const p = plotBox();
      const { H } = drawing();
      const top = axisTop();
      const amount = all('text.mcs-axisAmount:not([data-sample])')[1];
      assert.equal(num(amount, 'x'), tenth(p.x - 0.6 * fs));
      assert.equal(num(amount, 'y'), tenth(heightOf(top / (axisAmounts().length - 1), top) + 0.35 * fs));
      const year = one('svg.mcs-chart > g:not(.chart-measure) > text.mcs-axis:not(.mcs-axisAmount)');
      assert.equal(num(year, 'y'), tenth(p.bottom + 1.4 * fs));
      assert.equal(H - p.bottom, Math.ceil((2.6 + 1.2) * fs));
      assert.equal(num(one('text.mcs-axisTitle:not([data-sample])'), 'y'), tenth(p.bottom + 3 * fs));
      assert.equal(num(one('.mcs-phaseLabel'), 'y'), tenth(p.y + 1.4 * fs));
    });
  });
});
