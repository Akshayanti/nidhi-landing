/**
 * The bars of a country's yearly inflation (#790): `HistoryBars` picks a
 * round scale for the highest and the lowest year, cuts a hyperinflation
 * year off at 50% and says so, marks the years the average covers, labels
 * the first and the last year while both fit, and grows its margins with the
 * reader's text size. Every expected figure is worked out by hand beside it.
 */
import { island, draw, clear, all, text, one, num, near, drawing, atTextSize } from '../../test/inflationParts.components.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Series } from '../utils/inflation/math.ts';
import { HistoryBars } from './InflationCalculator.tsx';

function bars(series: Series, recentFirst: number, { narrow = false, numberLocale = 'en', label = 'Yearly inflation' } = {}) {
  return draw(<HistoryBars series={series} recentFirst={recentFirst} label={label} strings={island} numberLocale={numberLocale} narrow={narrow} />);
}

const svg = () => one('svg.ifc-barsSvg');
const rects = () => all('rect').map((r) => ({ cls: r.getAttribute('class'), x: num(r, 'x'), w: num(r, 'width'), y: num(r, 'y'), h: num(r, 'height') }));
const lines = (cls: string) => all(`line.${cls}`).map((l) => ({ x1: num(l, 'x1'), x2: num(l, 'x2'), y1: num(l, 'y1'), y2: num(l, 'y2') }));
const labels = () => all('text.ifc-axis').map((l) => ({ words: l.textContent, x: num(l, 'x'), y: num(l, 'y'), anchor: l.getAttribute('text-anchor') }));
const legend = () => text('.ifc-legend > span');
const textSize = () => svg().style.getPropertyValue('--chart-fs');

/** Compares what is drawn with what was worked out, to a twentieth of a unit. */
function same(drawn: Record<string, unknown>[], worked: Record<string, unknown>[], what: string) {
  assert.equal(drawn.length, worked.length, `${what}: how many`);
  worked.forEach((w, i) => {
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === 'number') near(drawn[i][k] as number, v, 0.051, `${what} ${i} ${k}`);
      else assert.equal(drawn[i][k], v, `${what} ${i} ${k}`);
    }
  });
}

describe('the bars of a country’s yearly inflation', () => {
  it('a history with a rise, a flat year, a gap and a fall, on a wide screen at normal text', () => {
    // Highest 7 gives a top of 10 (two steps of 5); lowest -1 gives a bottom of -1.
    bars({ 2001: 2, 2002: 7, 2003: 0, 2005: -1 }, 2003, { label: 'Yearly inflation in Testland' });
    {
      // the drawing: named for a screen reader, 760 across, text at 14 units (0.875 of 16)
      assert.equal(svg().getAttribute('role'), 'img');
      assert.equal(svg().getAttribute('aria-label'), 'Yearly inflation in Testland');
      assert.equal(textSize(), '14px');
      // Labels a line apart: 1.4 x 14 x (10 + 1) / 1 = 215.6 of plot, under 10 of head room and over 30 of foot.
      assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 760, H: 256 });
      assert.equal(one('figure').className, 'ifc-bars');
    }
    {
      // the scale: 19.6 units to a percent, so 10% at 10, 0% at 206 and -1% at 225.6
      same(lines('ifc-gridLine'), [{ x1: 60, x2: 752, y1: 10, y2: 10 }, { x1: 60, x2: 752, y1: 225.6, y2: 225.6 }], 'gridline');
      same(lines('ifc-axisLine'), [{ x1: 60, x2: 752, y1: 206, y2: 206 }], 'zero line');
      same(labels(), [
        { words: '10%', x: 53, y: 14.9, anchor: 'end' },
        { words: '0%', x: 53, y: 210.9, anchor: 'end' },
        { words: '-1%', x: 53, y: 230.5, anchor: 'end' },
        { words: '2001', x: 60, y: 248.6, anchor: 'start' },
        { words: '2005', x: 752, y: 248.6, anchor: 'end' },
      ], 'label');
    }
    {
      // the bars: five year slots of 138.4 across 692, each bar 76% of its slot; 2004 has no figure and no bar
      same(rects(), [
        { cls: 'ifc-bar', x: 76.608, w: 105.184, y: 166.8, h: 39.2 },
        { cls: 'ifc-bar', x: 215.008, w: 105.184, y: 68.8, h: 137.2 },
        // A year of no inflation still shows, one unit tall, and is the first year of the average.
        { cls: 'ifc-bar ifc-bar--recent', x: 353.408, w: 105.184, y: 206, h: 1 },
        // A fall hangs below the zero line.
        { cls: 'ifc-bar ifc-bar--recent', x: 630.208, w: 105.184, y: 206, h: 19.6 },
      ], 'bar');
    }
    {
      // the key names both kinds of bar, and says nothing of a cut while none is cut
      assert.deepEqual(legend(), [island.history.legendRecent, island.history.legendOlder]);
      assert.deepEqual(all('.ifc-legend i').map((i) => [i.className, i.getAttribute('aria-hidden')]), [['ifc-key ifc-key--recent', 'true'], ['ifc-key ifc-key--older', 'true']]);
      assert.equal(one('figcaption').className, 'ifc-legend');
    }
  });

  it('a fall deeper than the rise is high sets the plot’s height, on a phone and on a wide screen', () => {
    // Highest 3 gives a top of 4 (two steps of 2); lowest -15 gives a bottom of -20.
    const series = { 2010: 3, 2011: -15 };
    bars(series, 2011, { narrow: true });
    // 1.4 x 14 x 24 / 4 = 117.6, more than a phone's 110.
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 360, H: 158 });
    same(lines('ifc-gridLine'), [{ x1: 52, x2: 352, y1: 10, y2: 10 }, { x1: 52, x2: 352, y1: 127.6, y2: 127.6 }], 'gridline');
    same(labels(), [
      { words: '4%', x: 45, y: 14.9 },
      { words: '0%', x: 45, y: 34.5 },
      { words: '-20%', x: 45, y: 132.5 },
      { words: '2010', x: 52, y: 150.6 },
      { words: '2011', x: 352, y: 150.6 },
    ], 'label');
    same(rects(), [
      { cls: 'ifc-bar', x: 70, w: 114, y: 14.9, h: 14.7 },
      { cls: 'ifc-bar ifc-bar--recent', x: 220, w: 114, y: 29.6, h: 73.5 },
    ], 'bar');
    clear();
    // The same on a wide screen: 117.6 is under its 130, so the plot is 130 tall.
    bars(series, 2011);
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 760, H: 170 });
    same(lines('ifc-gridLine'), [{ x1: 60, x2: 752, y1: 10, y2: 10 }, { x1: 60, x2: 752, y1: 140, y2: 140 }], 'gridline');
  });

  it('a history with no fall has no line or label below zero', () => {
    // Highest 4 is its own top (two steps of 2).
    bars({ 1990: 4, 1991: 2 }, 1991);
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 760, H: 170 });
    same(lines('ifc-gridLine'), [{ x1: 60, x2: 752, y1: 10, y2: 10 }], 'gridline');
    same(lines('ifc-axisLine'), [{ y1: 140, y2: 140 }], 'zero line');
    same(labels(), [{ words: '4%', y: 14.9 }, { words: '0%', y: 144.9 }, { words: '1990' }, { words: '1991' }], 'label');
    same(rects(), [{ cls: 'ifc-bar', y: 10, h: 130 }, { cls: 'ifc-bar ifc-bar--recent', y: 75, h: 65 }], 'bar');
    clear();
    bars({ 1990: 4, 1991: 2 }, 1991, { narrow: true });
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 360, H: 150 });
    clear();
    // A history that never reaches 1% is still drawn against 1%, and one that only fell against 1% above.
    bars({ 2000: 0.4, 2001: 0.2 }, 2001);
    assert.deepEqual(labels().map((l) => l.words), ['1%', '0%', '2000', '2001']);
    same(rects(), [{ y: 88, h: 52 }, { y: 114, h: 26 }], 'bar');
    clear();
    bars({ 2000: -2, 2001: -3 }, 2001);
    // Lowest -3 gives a bottom of -5 (one step of 5): 1.4 x 14 x 6 / 1 = 117.6, under 130.
    assert.deepEqual(labels().map((l) => l.words), ['1%', '0%', '-5%', '2000', '2001']);
    same(lines('ifc-axisLine'), [{ y1: 10 + 130 / 6, y2: 10 + 130 / 6 }], 'zero line');
  });

  it('a hyperinflation year is cut off at 50%, marked, and the key says so', () => {
    // Highest 60 would need a top of 100; the cap holds it at 50.
    bars({ 1990: 60, 1991: 50, 1992: 10 }, 1992);
    assert.deepEqual(labels().map((l) => l.words), ['50%', '0%', '1990', '1992']);
    same(rects(), [
      { cls: 'ifc-bar ifc-bar--capped', y: 10, h: 130 },
      // Exactly 50% reaches the top and is not cut.
      { cls: 'ifc-bar', y: 10, h: 130 },
      { cls: 'ifc-bar ifc-bar--recent', y: 114, h: 26 },
    ], 'bar');
    assert.deepEqual(legend(), [island.history.legendRecent, island.history.legendOlder, 'Bars above 50% are cut off at the top.']);
    clear();
    // A cut year inside the average carries both marks.
    bars({ 1990: 60, 1991: 50, 1992: 10 }, 1990);
    assert.deepEqual(rects().map((r) => r.cls), ['ifc-bar ifc-bar--recent ifc-bar--capped', 'ifc-bar ifc-bar--recent', 'ifc-bar ifc-bar--recent']);
    clear();
    // A fall past -50% is cut at the bottom in the same way: top 5 (two steps of 2.5), bottom -50.
    bars({ 1990: -60, 1991: -50, 1992: 5 }, 1995);
    assert.deepEqual(labels().map((l) => l.words), ['5%', '0%', '-50%', '1990', '1992']);
    // 1.4 x 14 x 55 / 5 = 215.6 of plot, 3.92 units to a percent: zero at 29.6, the bottom at 225.6.
    same(rects(), [
      { cls: 'ifc-bar ifc-bar--capped', y: 29.6, h: 196 },
      { cls: 'ifc-bar', y: 29.6, h: 196 },
      { cls: 'ifc-bar', y: 10, h: 19.6 },
    ], 'bar');
    assert.equal(legend().length, 3);
    clear();
    // Exactly 50% up and 50% down: nothing is cut, and the key does not say anything is.
    bars({ 1990: 50, 1991: -50 }, 1995);
    assert.deepEqual(rects().map((r) => r.cls), ['ifc-bar', 'ifc-bar']);
    assert.deepEqual(legend(), [island.history.legendRecent, island.history.legendOlder]);
  });

  it('a very long history keeps every bar at least one unit wide', () => {
    // 301 year slots across a phone's 300 units: 76% of a slot is under one unit.
    bars({ 1700: 5, 2000: 3 }, 2000, { narrow: true });
    const slot = 300 / 301;
    same(rects(), [{ x: 52 + 0.12 * slot, w: 1 }, { x: 52 + 300 * slot + 0.12 * slot, w: 1 }], 'bar');
    assert.deepEqual(labels().slice(-2).map((l) => l.words), ['1700', '2000']);
  });

  it('at larger text the labels, the margins and the plot grow with it', () => {
    // 200% text: one rem is 32 units, so the text is 28.
    atTextSize(32);
    bars({ 2000: 3, 2001: -15 }, 2001, { narrow: true });
    assert.equal(textSize(), '28px');
    // Head room 17 (0.6 x 28, rounded up), plot 1.4 x 28 x 24 / 4 = 235.2, foot 54 (1.9 x 28, rounded up).
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 360, H: 307 });
    // The left margin holds the widest label, "-20%": 4 x 16.8 + 16.8 = 84.
    same(lines('ifc-gridLine'), [{ x1: 84, x2: 352, y1: 17, y2: 17 }, { x1: 84, x2: 352, y1: 252.2, y2: 252.2 }], 'gridline');
    same(labels(), [
      { words: '4%', x: 70, y: 26.8 },
      { words: '0%', x: 70, y: 66 },
      { words: '-20%', x: 70, y: 262 },
      { words: '2000', x: 84, y: 292.2, anchor: 'start' },
      { words: '2001', x: 352, y: 292.2, anchor: 'end' },
    ], 'label');
    same(rects(), [{ x: 100.08, w: 101.84 }, { x: 234.08, w: 101.84 }], 'bar');
  });

  it('at very large text on a phone only the last year is labelled, and a history with no fall grows too', () => {
    // 400% text: the text is 56, a year label 134.4 wide, and two of them with a gap need 324.8 of the 259 there are.
    atTextSize(64);
    bars({ 1990: 4, 1991: 2 }, 1991, { narrow: true });
    assert.equal(textSize(), '56px');
    // Head room 34, a phone's plot of 110 (1.4 x 56 = 78.4 is under it), foot 107.
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 360, H: 251 });
    same(labels(), [{ words: '4%', x: 73 }, { words: '0%', x: 73 }, { words: '1991', x: 352, y: 223, anchor: 'end' }], 'label');
    clear();
    // 600% text: 1.4 x 84 = 117.6 is more than the phone's 110, so the plot grows.
    atTextSize(96);
    bars({ 1990: 4, 1991: 2 }, 1991, { narrow: true });
    // Head room 51, plot 117.6, foot 160.
    assert.deepEqual(drawing('svg.ifc-barsSvg'), { W: 360, H: 329 });
    same(lines('ifc-gridLine'), [{ x1: 152, y1: 51 }], 'gridline');
    same(lines('ifc-axisLine'), [{ y1: 168.6 }], 'zero line');
  });

  it('percentages follow the page’s own number style', () => {
    bars({ 1990: 60, 1991: 2 }, 1991, { numberLocale: 'es' });
    const fifty = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 }).format(0.5);
    assert.notEqual(fifty, '50%');
    assert.equal(labels()[0].words, fifty);
    assert.equal(legend()[2], `Bars above ${fifty} are cut off at the top.`);
  });
});
