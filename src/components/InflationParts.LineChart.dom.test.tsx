/**
 * The chart of an answer's path, year by year (#790): `LineChart` picks a
 * round scale and names its unit once above the chart, labels the years that
 * fit, draws the line with a dot at each end, describes itself to a screen
 * reader, and makes room as the reader's text grows. An amount too large to
 * draw is said in words. Every expected figure is worked out by hand beside it.
 */
import { t, island, draw, clear, all, text, one, none, num, drawing, pointsOf, atTextSize, textDrawnAs, complaintsWhile, type Page } from '../../test/inflationParts.components.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LineChart } from './InflationCalculator.tsx';

type Point = { x: number; value: number };
type Options = Partial<{ calendar: boolean; code: string; title: string; axis: string; narrow: boolean; monthPoint: { month: string; x: number; value: number } }>;

function chart(points: Point[], o: Options = {}, page: Page = {}) {
  return draw(
    <LineChart points={points} monthPoint={o.monthPoint} calendar={o.calendar ?? false} code={o.code ?? 'EUR'} title={o.title ?? 'What €10,000 buys each year'} axis={o.axis ?? 'Years from now'} strings={island} narrow={o.narrow ?? false} />,
    page,
  );
}

/** From 10,000 down by 250 a year: 7,500 after ten years. */
const falling = (years: number) => Array.from({ length: years + 1 }, (_, x) => ({ x, value: 10_000 - 250 * x }));
/** 100 growing 10% a year from 2015: 110, 121, 133.1, 146.41 and 161.051 in 2020. */
const RISING = [100, 110, 121, 133.1, 146.41, 161.051].map((value, i) => ({ x: 2015 + i, value }));

const svg = () => one('svg.ifc-chart');
const gridlines = () => all('svg.ifc-chart g > line').map((l) => ({ cls: l.getAttribute('class'), x1: num(l, 'x1'), x2: num(l, 'x2'), y: num(l, 'y1'), level: l.getAttribute('y1') === l.getAttribute('y2') }));
const amounts = () => all('text.ifc-axisAmount:not([data-sample])').map((l) => ({ words: l.textContent, x: num(l, 'x'), y: num(l, 'y'), anchor: l.getAttribute('text-anchor') }));
const yearEls = () => all('svg.ifc-chart > text.ifc-axis:not(.ifc-axisTitle)');
const years = () => yearEls().map((l) => ({ words: l.textContent, x: num(l, 'x'), y: num(l, 'y'), anchor: l.getAttribute('text-anchor') }));
const axisTitle = () => one('svg.ifc-chart > text.ifc-axisTitle');
const titleLines = () => all('svg.ifc-chart > text.ifc-axisTitle tspan').map((s) => ({ words: s.textContent, x: num(s, 'x'), dy: num(s, 'dy') }));
const dots = () => all('circle.ifc-dot').map((c) => [num(c, 'cx'), num(c, 'cy'), num(c, 'r')]);
const samples = () => all('svg.ifc-chart text[data-sample]').map((s) => [s.getAttribute('class'), s.textContent, (s as HTMLElement).style.fontSize]);

describe('the chart of an answer, year by year', () => {
  it('ten years on a wide screen at normal text: the scale, the years, the line and what a screen reader is told', () => {
    // Nothing the chart draws may make React complain (two gridlines or two labels it cannot tell apart, say).
    assert.deepEqual(complaintsWhile(() => {
      chart(falling(10));
      chart(falling(4), { narrow: true });
    }), []);
    clear();
    chart(falling(10));
    {
      // the figure: its title with the amount kept whole, and the unit named once above the chart
      assert.equal(one('figure').className, 'ifc-figure');
      assert.equal(one('figcaption').className, 'ifc-chartTitle');
      assert.equal(one('figcaption').textContent, 'What €10,000 buys each year');
      assert.deepEqual(text('figcaption .amt'), ['€10,000']);
      assert.equal(one('.tool-chartUnit').textContent, 'Amounts in thousands of €');
      assert.ok(one('figcaption').nextElementSibling === one('.tool-chartUnit'));
    }
    {
      // the drawing is an image named by the title and described in words
      assert.equal(svg().getAttribute('role'), 'img');
      assert.ok(one('figcaption').id.length > 0);
      assert.equal(svg().getAttribute('aria-labelledby'), one('figcaption').id);
      assert.equal(svg().getAttribute('aria-describedby'), one('svg.ifc-chart > desc').id);
      assert.notEqual(one('figcaption').id, one('desc').id);
      assert.equal(one('desc').textContent, 'Line chart. Starts at about €10,000 (year 0) and ends at about €7,500 (year 10).');
      // 760 across; 18 of head room, 224 of plot and 58 of foot; text at 14 units.
      assert.deepEqual(drawing('svg.ifc-chart'), { W: 760, H: 300 });
      assert.equal(svg().style.getPropertyValue('--chart-fs'), '14px');
    }
    {
      // five steps of 2,000 cover 10,000; the plot starts 31 in ("10" is 16.8 wide, plus a gap of 14)
      assert.deepEqual(gridlines(), [
        { cls: 'ifc-axisLine', x1: 31, x2: 732, y: 242, level: true },
        { cls: 'ifc-gridLine', x1: 31, x2: 732, y: 197.2, level: true },
        { cls: 'ifc-gridLine', x1: 31, x2: 732, y: 152.4, level: true },
        { cls: 'ifc-gridLine', x1: 31, x2: 732, y: 107.6, level: true },
        { cls: 'ifc-gridLine', x1: 31, x2: 732, y: 62.8, level: true },
        { cls: 'ifc-gridLine', x1: 31, x2: 732, y: 18, level: true },
      ]);
      // Bare numbers, right-aligned 8.4 before the plot, a third of a line below their gridline.
      assert.deepEqual(amounts(), [
        { words: '0', x: 22.6, y: 246.9, anchor: 'end' },
        { words: '2', x: 22.6, y: 202.1, anchor: 'end' },
        { words: '4', x: 22.6, y: 157.3, anchor: 'end' },
        { words: '6', x: 22.6, y: 112.5, anchor: 'end' },
        { words: '8', x: 22.6, y: 67.7, anchor: 'end' },
        { words: '10', x: 22.6, y: 22.9, anchor: 'end' },
      ]);
    }
    {
      // every second year is labelled (ten would be more than eight), 70.1 units to a year
      assert.deepEqual(years(), [
        { words: '0', x: 31, y: 261.6, anchor: 'middle' },
        { words: '2', x: 171.2, y: 261.6, anchor: 'middle' },
        { words: '4', x: 311.4, y: 261.6, anchor: 'middle' },
        { words: '6', x: 451.6, y: 261.6, anchor: 'middle' },
        { words: '8', x: 591.8, y: 261.6, anchor: 'middle' },
        { words: '10', x: 732, y: 261.6, anchor: 'middle' },
      ]);
      // The axis title, on one line under the middle of the plot (31 + 701 / 2), at its full size.
      assert.equal(axisTitle().getAttribute('x'), '382');
      assert.equal(axisTitle().getAttribute('y'), '284');
      assert.equal(axisTitle().getAttribute('text-anchor'), 'middle');
      assert.equal(axisTitle().style.fontSize, '');
      assert.equal(axisTitle().hasAttribute('visibility'), false);
      assert.deepEqual(titleLines(), [{ words: 'Years from now', x: 382, dy: 0 }]);
    }
    {
      // the line falls 5.6 units a year from the top gridline, over an area closed along the foot
      const line = pointsOf('path.ifc-line');
      assert.equal(line.length, 11);
      assert.deepEqual(line.slice(0, 3), [[31, 18], [101.1, 23.6], [171.2, 29.2]]);
      assert.deepEqual(line[10], [732, 74]);
      assert.ok(one('path.ifc-line').getAttribute('d')?.startsWith('M31,18 L101.1,23.6 L171.2,29.2 '));
      assert.equal(one('path.ifc-area').getAttribute('d'), `${one('path.ifc-line').getAttribute('d')} L732,242 L31,242 Z`);
      assert.deepEqual(dots(), [[31, 18, 5], [732, 74, 5]]);
    }
    {
      // each word of the axis title is drawn unseen, once, so its real width can be measured
      assert.deepEqual(samples(), [['ifc-axis ifc-axisTitle', 'Years', '14px'], ['ifc-axis ifc-axisTitle', 'from', '14px'], ['ifc-axis ifc-axisTitle', 'now', '14px']]);
      assert.equal(one('g.chart-measure').getAttribute('aria-hidden'), 'true');
    }
  });

  it('calendar years on a phone: four steps at most, years as they are, the last label kept inside', () => {
    chart(RISING, { calendar: true, narrow: true, axis: 'Year', title: 'What €100 is worth each year since' });
    // 161.051 needs four steps of 50; "Amounts in €" since nothing reaches a thousand.
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in €');
    assert.equal(one('desc').textContent, 'Line chart. Starts at about €100 (2015) and ends at about €161 (2020).');
    // 14 of head room, 142 of plot and 54 of foot.
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 360, H: 210 });
    // "200" is 25.2 wide, plus 14: the plot starts 40 in and ends 18 from the right.
    assert.deepEqual(gridlines().map((g) => [g.cls, g.x1, g.x2, g.y]), [
      ['ifc-axisLine', 40, 342, 156],
      ['ifc-gridLine', 40, 342, 120.5],
      ['ifc-gridLine', 40, 342, 85],
      ['ifc-gridLine', 40, 342, 49.5],
      ['ifc-gridLine', 40, 342, 14],
    ]);
    assert.deepEqual(amounts().map((a) => [a.words, a.x, a.y]), [['0', 31.6, 160.9], ['50', 31.6, 125.4], ['100', 31.6, 89.9], ['150', 31.6, 54.4], ['200', 31.6, 18.9]]);
    // Five years are more than a phone's four labels, so every second year: the even ones, 60.4 units to a year.
    assert.deepEqual(years(), [
      { words: '2016', x: 100.4, y: 175.6, anchor: 'middle' },
      { words: '2018', x: 221.2, y: 175.6, anchor: 'middle' },
      // Centred, "2020" would run 0.8 past the drawing's edge: it ends at its year.
      { words: '2020', x: 342, y: 175.6, anchor: 'end' },
    ]);
    assert.deepEqual(titleLines(), [{ words: 'Year', x: 191, dy: 0 }]);
    assert.equal(axisTitle().getAttribute('y'), '198');
    // 0.71 units to a euro, from the foot at 156.
    assert.deepEqual(pointsOf('path.ifc-line'), [[40, 85], [100.4, 77.9], [160.8, 70.1], [221.2, 61.5], [281.6, 52], [342, 41.7]]);
    assert.ok(one('path.ifc-area').getAttribute('d')?.endsWith(' L342,156 L40,156 Z'));
    assert.deepEqual(dots(), [[40, 85, 5], [342, 41.7, 5]]);
    assert.deepEqual(samples(), [['ifc-axis ifc-axisTitle', 'Year', '14px']]);
  });

  it('labels every year while they are few enough: eight on a wide screen, four on a phone', () => {
    chart(falling(8));
    assert.deepEqual(years().map((y) => y.words), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    clear();
    chart(falling(9));
    assert.deepEqual(years().map((y) => y.words), ['0', '2', '4', '6', '8']);
    clear();
    chart(falling(4), { narrow: true });
    assert.deepEqual(years().map((y) => y.words), ['0', '1', '2', '3', '4']);
    clear();
    chart(falling(5), { narrow: true });
    assert.deepEqual(years().map((y) => y.words), ['0', '2', '4']);
    clear();
    // The shortest path there is: a start and an end.
    chart(falling(1), { narrow: true });
    assert.deepEqual(years().map((y) => y.words), ['0', '1']);
    assert.equal(pointsOf('path.ifc-line').length, 2);
    assert.equal(one('desc').textContent, 'Line chart. Starts at about €10,000 (year 0) and ends at about €9,750 (year 1).');
  });

  it('with nothing to draw it shows nothing, and an amount too large to draw is said in words', () => {
    const { container } = chart([{ x: 0, value: 10_000 }]);
    assert.equal(container.innerHTML, '');
    clear();
    assert.equal(chart([]).container.innerHTML, '');
    clear();
    // A million billion is where amounts stop being drawn.
    for (const top of [1e15, Infinity, NaN]) {
      chart([{ x: 0, value: 10_000 }, { x: 1, value: top }]);
      none('svg');
      none('.tool-chartUnit');
      assert.equal(one('figure').className, 'ifc-figure');
      assert.equal(one('figcaption').className, 'ifc-chartTitle');
      assert.deepEqual(text('figcaption .amt'), ['€10,000']);
      assert.equal(one('figcaption').hasAttribute('id'), false);
      assert.deepEqual(all('figure p').map((p) => [p.className, p.textContent]), [['ifc-note', island.chart.tooLarge]]);
      clear();
    }
    // Just under it, the chart is drawn.
    chart([{ x: 0, value: 10_000 }, { x: 1, value: 9.99e14 }]);
    assert.equal(all('svg.ifc-chart').length, 1);
    none('.ifc-note');
  });

  it('amount labels too wide for the margin go inside the plot, above their gridlines', () => {
    // Drawn 300 wide, the labels would leave the plot under six tenths of the chart.
    textDrawnAs((cls) => (cls.includes('ifc-axisAmount') ? 300 : 0));
    chart(falling(10));
    // The margin falls back to 28, and the head room grows to a whole line (1.4 x 14, rounded up).
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 760, H: 302 });
    assert.deepEqual(gridlines().map((g) => [g.x1, g.y]), [[28, 244], [28, 199.2], [28, 154.4], [28, 109.6], [28, 64.8], [28, 20]]);
    // No label on the foot line; the others start 6 into the plot, 4.2 above their gridline.
    assert.deepEqual(amounts(), [
      { words: '2', x: 34, y: 195, anchor: 'start' },
      { words: '4', x: 34, y: 150.2, anchor: 'start' },
      { words: '6', x: 34, y: 105.4, anchor: 'start' },
      { words: '8', x: 34, y: 60.6, anchor: 'start' },
      { words: '10', x: 34, y: 15.8, anchor: 'start' },
    ]);
    clear();
    // The same on a phone, whose margin falls back to 18: head room 20, plot 142, foot 54.
    chart(falling(10), { narrow: true });
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 360, H: 216 });
    assert.deepEqual(gridlines().map((g) => g.x1), [18, 18, 18, 18, 18]);
    assert.deepEqual(amounts().map((a) => [a.words, a.x, a.anchor]), [['2.5', 24, 'start'], ['5', 24, 'start'], ['7.5', 24, 'start'], ['10', 24, 'start']]);
    clear();
    // Labels measured narrower than the least margin leave the least margin.
    textDrawnAs((cls) => (cls.includes('ifc-axisAmount') ? 2 : 0));
    chart(falling(10));
    assert.deepEqual(gridlines().map((g) => g.x1), [28, 28, 28, 28, 28, 28]);
    assert.equal(amounts()[0].anchor, 'end');
    assert.equal(amounts().length, 6);
  });

  it('at larger text there are fewer gridlines and more room around the plot', () => {
    // 200% text: one rem is 32 units and the text 28, so 224 of plot holds four labels 50.4 apart, not five.
    atTextSize(32);
    chart(falling(10));
    assert.equal(svg().style.getPropertyValue('--chart-fs'), '28px');
    // Head room 23 (0.8 x 28, rounded up), foot 107 (3.8 x 28, rounded up).
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 760, H: 354 });
    // "2.5" is 50.4 wide, plus 28: the plot starts 79 in.
    assert.deepEqual(gridlines().map((g) => [g.x1, g.y]), [[79, 247], [79, 191], [79, 135], [79, 79], [79, 23]]);
    assert.deepEqual(amounts().map((a) => [a.words, a.x, a.y]), [['0', 62.2, 256.8], ['2.5', 62.2, 200.8], ['5', 62.2, 144.8], ['7.5', 62.2, 88.8], ['10', 62.2, 32.8]]);
    assert.deepEqual(years().map((y) => [y.words, y.y]), [['0', 286.2], ['2', 286.2], ['4', 286.2], ['6', 286.2], ['8', 286.2], ['10', 286.2]]);
    assert.equal(axisTitle().getAttribute('y'), '331');
    assert.deepEqual(samples()[0], ['ifc-axis ifc-axisTitle', 'Years', '28px']);
    clear();
    // On a phone 142 of plot holds two: 161.051 takes two steps of 100.
    chart(RISING, { calendar: true, narrow: true, axis: 'Year' });
    assert.deepEqual(amounts().map((a) => a.words), ['0', '100', '200']);
    // "200" is 50.4 wide, plus 28: the plot is 263 across from 79, 52.6 to a year. A label needs
    // 67.2 and a gap of 28, so every second year is a candidate even though five years' labels would be few
    // enough. "2018" would end at 270.4 and "2020", ending at its year, starts at 274.8: closer than the
    // 16.8 kept between labels, so the last year is kept and the one before it left out.
    assert.deepEqual(years().map((y) => [y.words, y.x, y.anchor]), [['2016', 131.6, 'middle'], ['2020', 342, 'end']]);
    clear();
    // Four years, 65.75 units each: few enough for a phone, but a label needs 95.2, so every second
    // year again, 131.5 apart, and this time all three fit. The first starts at the plot's edge rather
    // than centred on it: centred, it reached under the amounts' "0" (#815).
    chart(RISING.slice(1), { calendar: true, narrow: true, axis: 'Year' });
    assert.deepEqual(years().map((y) => [y.words, y.x, y.anchor]), [['2016', 79, 'start'], ['2018', 210.5, 'middle'], ['2020', 342, 'end']]);
    clear();
    // The same from an odd year: the even years are the ones labelled, not the first and every second after it.
    chart(RISING.slice(0, 5), { calendar: true, narrow: true, axis: 'Year' });
    assert.deepEqual(years().map((y) => [y.words, y.x, y.anchor]), [['2016', 144.8, 'middle'], ['2018', 276.3, 'middle']]);
    clear();
    // A step whose labels fit exactly is used: with amount labels drawn 228 wide the plot is 476
    // across, 95.2 to a year, which is what "2020" and its gap need. Every year is a candidate, and
    // "2019" is left out, to keep the last year; and "2016", since "2015" now starts at the plot's edge
    // instead of reaching under the amounts (#815), and "2016" would touch it.
    textDrawnAs((cls) => (cls.includes('ifc-axisAmount') ? 228 : 0));
    chart(RISING, { calendar: true, axis: 'Year' });
    assert.deepEqual(gridlines().map((g) => g.x1), [256, 256, 256, 256, 256]);
    assert.deepEqual(years().map((y) => y.words), ['2015', '2017', '2018', '2020']);
    assert.equal(years()[0].anchor, 'start');
  });

  it('year labels that would touch are left out', () => {
    // 200% text on a wide screen, amount labels inside: the plot runs from 28 to 732, 117.3 to a year.
    atTextSize(32);
    textDrawnAs((cls) => (cls.includes('ifc-axisAmount') ? 300 : 0));
    chart(Array.from({ length: 7 }, (_, i) => ({ x: 2014 + i, value: 100 })), { calendar: true, axis: 'Year' });
    // "2014" (67.2 wide) starts at its year so as not to be cut, and ends at 95.2; "2015" would
    // start at 111.7, inside the 16.8 kept between labels, so it is left out. At the other end "2019"
    // would end at 648.3 and "2020" starts at 664.8, 16.5 on: the last year is kept, not the one before it.
    assert.deepEqual(years().map((y) => [y.words, y.x, y.anchor]), [
      ['2014', 28, 'start'], ['2016', 262.7, 'middle'], ['2017', 380, 'middle'], ['2018', 497.3, 'middle'], ['2020', 732, 'end'],
    ]);
  });

  it('an axis title too long for one line takes two, and the foot grows for it', () => {
    // Each word drawn 172 wide: two and a gap of 4.2 are 348.2, inside the 352 there is; a third is not.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 172 : 0));
    chart(RISING, { calendar: true, narrow: true, axis: 'Years  from now ' });
    assert.deepEqual(samples().map((s) => s[1]), ['Years', 'from', 'now']);
    // Half the title is 176.1 wide, so its middle can be no further right than 183.9.
    assert.deepEqual(titleLines(), [{ words: 'Years from', x: 184, dy: 0 }, { words: 'now', x: 184, dy: 16.8 }]);
    assert.equal(axisTitle().getAttribute('x'), '184');
    assert.equal(axisTitle().style.fontSize, '');
    // The foot holds two lines: (2.6 + 2.4) x 14 = 70, with 14 of head room and 142 of plot.
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 360, H: 226 });
    assert.equal(axisTitle().getAttribute('y'), '198');
    assert.equal(years()[0].y, 175.6);
    clear();
    // Five units wider each, two words and their gap are 358.2: more than the 352, so every word has its own line.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 177 : 0));
    chart(RISING, { calendar: true, narrow: true, axis: 'Years from now' });
    assert.deepEqual(titleLines().map((l) => [l.words, l.dy]), [['Years', 0], ['from', 16.8], ['now', 16.8]]);
    // (2.6 + 3.6) x 14 = 86.8 of foot, rounded up.
    assert.deepEqual(drawing('svg.ifc-chart'), { W: 360, H: 243 });
  });

  it('a word wider than the drawing is drawn smaller to fit, and left out below the smallest size chart text is drawn at', () => {
    // 400 wide in the 356 there is: drawn at 0.89 of its size, 12.46.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 400 : 0));
    chart(RISING, { calendar: true, narrow: true, axis: 'Year' });
    assert.equal(axisTitle().style.fontSize, '12.46px');
    assert.equal(axisTitle().hasAttribute('visibility'), false);
    assert.deepEqual(titleLines(), [{ words: 'Year', x: 180, dy: 0 }]);
    clear();
    // Exactly as wide as the room: at its full size.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 356 : 0));
    chart(RISING, { calendar: true, narrow: true, axis: 'Year' });
    assert.equal(axisTitle().style.fontSize, '');
    assert.equal(axisTitle().hasAttribute('visibility'), false);
    clear();
    // 500 wide would need 0.712 of its size, under the floor of 0.75 / 0.875: left out.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 500 : 0));
    chart(RISING, { calendar: true, narrow: true, axis: 'Year' });
    assert.equal(axisTitle().getAttribute('visibility'), 'hidden');
    assert.equal(axisTitle().style.fontSize, '9.968px');
    clear();
    // Exactly at the floor it is still drawn: 882 wide in a wide drawing's 756 is 0.75 / 0.875 of its size.
    textDrawnAs((cls) => (cls === 'ifc-axis ifc-axisTitle' ? 882 : 0));
    chart(RISING, { calendar: true, axis: 'Year' });
    assert.equal(axisTitle().hasAttribute('visibility'), false);
    assert.ok(Math.abs(parseFloat(axisTitle().style.fontSize) - 12) < 1e-9);
  });

  it('a wide title beside a wide margin stays inside the drawing', () => {
    // Amount labels 250 wide put the plot from 264 to 732, its middle at 498; a title 700 wide
    // (half 352) can be centred no further right than 408.
    textDrawnAs((cls) => (cls.includes('ifc-axisAmount') ? 250 : cls === 'ifc-axis ifc-axisTitle' ? 700 : 0));
    chart(RISING, { calendar: true, axis: 'Year' });
    assert.deepEqual(gridlines().map((g) => g.x1), [264, 264, 264, 264, 264]);
    assert.deepEqual(titleLines(), [{ words: 'Year', x: 408, dy: 0 }]);
    assert.equal(axisTitle().style.fontSize, '');
  });

  it('amounts follow the currency and the page’s own style', () => {
    chart(falling(10), { code: 'USD', title: 'What $10,000 buys each year' });
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in thousands of $');
    assert.equal(one('desc').textContent, 'Line chart. Starts at about $10,000 (year 0) and ends at about $7,500 (year 10).');
    clear();
    chart(falling(10), {}, { amountLocale: 'es' });
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in thousands of €');
    assert.equal(one('desc').textContent, 'Line chart. Starts at about 10.000 € (year 0) and ends at about 7500 € (year 10).');
    clear();
    // Outside a tool's chart words the gridlines carry whole amounts and no unit is named.
    chart(falling(10), {}, { chartWords: null });
    none('.tool-chartUnit');
    assert.deepEqual(amounts().map((a) => a.words), ['€0', '€2,000', '€4,000', '€6,000', '€8,000', '€10,000']);
    assert.equal(t.export.chart.amountsInScale, 'Amounts in {scale} of {currency}');
  });
});

describe('the chart of an answer that ends at a month', () => {
  // January 2021 sits 5.5 months before the middle of 2021: 2021 - 5.5 / 12 = 2020.5417 on the year axis.
  const MONTH = { month: '2021-01', x: 2021 - 5.5 / 12, value: 177.1561 };
  const yearly = () => all('path.ifc-line:not(.ifc-line--month)');
  const monthly = () => all('path.ifc-line--month');
  const squares = () => all('rect.ifc-dot--month').map((q) => [q.getAttribute('class'), num(q, 'x'), num(q, 'y'), num(q, 'width'), num(q, 'height')]);
  const legend = () => all('p.ifc-legend--line > span').map((sp) => [sp.querySelector('i')?.className, sp.querySelector('i')?.getAttribute('aria-hidden'), sp.textContent]);

  it('draws the years as before up to the last, then a dashed step to a square at the month', () => {
    chart(RISING, { calendar: true, narrow: true, axis: 'Year', title: 'What €100 is worth each year since', monthPoint: MONTH });
    // The same scale as without the month: 177 still fits under 200.
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in €');
    assert.deepEqual(amounts().map((a) => a.words), ['0', '50', '100', '150', '200']);
    // The axis now runs 5.5417 years across 302 units: 54.5 to a year, and the month at the right edge.
    assert.equal(yearly().length, 1);
    assert.equal(yearly()[0].getAttribute('d'), 'M40,85 L94.5,77.9 L149,70.1 L203.5,61.5 L258,52 L312.5,41.7');
    // 177.1561 of 200 on a plot 142 high from 14: 14 + (1 - 0.88578) x 142 = 30.2.
    assert.equal(monthly().length, 1);
    assert.equal(monthly()[0].getAttribute('d'), 'M312.5,41.7 L342,30.2');
    assert.equal(monthly()[0].getAttribute('class'), 'ifc-line ifc-line--month');
    // The filled area runs on under the month.
    assert.equal(one('path.ifc-area').getAttribute('d'), 'M40,85 L94.5,77.9 L149,70.1 L203.5,61.5 L258,52 L312.5,41.7 L342,30.2 L342,156 L40,156 Z');
    // A dot at the first and the last year, and a square of 10 centred on the month.
    assert.deepEqual(dots(), [[40, 85, 5], [312.5, 41.7, 5]]);
    assert.deepEqual(squares(), [['ifc-dot ifc-dot--month', 337, 25.2, 10, 10]]);
    // Every second year still, each at its own place on the longer axis.
    assert.deepEqual(years().map((y) => [y.words, y.x, y.anchor]), [['2016', 94.5, 'middle'], ['2018', 203.5, 'middle'], ['2020', 312.5, 'middle']]);
  });

  it('tells a screen reader where it ends, and says under the drawing which mark is which', () => {
    chart(RISING, { calendar: true, narrow: true, axis: 'Year', title: 'What €100 is worth each year since', monthPoint: MONTH });
    assert.equal(one('desc').textContent, 'Line chart. Starts at about €100 (2015) and ends in January 2021 at about €177.');
    assert.deepEqual(legend(), [
      ['ifc-key ifc-key--year', 'true', 'A year’s average'],
      ['ifc-key ifc-key--month', 'true', 'One month, the latest with a figure: January 2021'],
    ]);
    assert.equal(one('p.ifc-legend--line').className, 'ifc-legend ifc-legend--line');
    // Under the drawing, inside the figure.
    assert.ok(one('svg.ifc-chart').nextElementSibling === one('p.ifc-legend--line'));
    assert.ok(one('figure').contains(one('p.ifc-legend--line')));
  });

  it('names each month in the key and in the description', () => {
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    names.forEach((name, i) => {
      chart(RISING, { calendar: true, narrow: true, axis: 'Year', monthPoint: { ...MONTH, month: `2022-${String(i + 1).padStart(2, '0')}` } });
      assert.equal(legend()[1][2], `One month, the latest with a figure: ${name} 2022`);
      assert.equal(one('desc').textContent, `Line chart. Starts at about €100 (2015) and ends in ${name} 2022 at about €177.`);
      clear();
    });
  });

  it('makes room on the scale for a month higher than every year', () => {
    chart(RISING, { calendar: true, narrow: true, axis: 'Year', monthPoint: { ...MONTH, value: 450 } });
    // A phone's chart has four steps at most, so 450 needs steps of 200 up to 600: the years alone would have stopped at 200.
    assert.deepEqual(amounts().map((a) => a.words), ['0', '200', '400', '600']);
  });

  it('a month too large to draw is said in words, like a year that is', () => {
    chart(RISING, { calendar: true, monthPoint: { ...MONTH, value: 2e15 } });
    none('svg.ifc-chart');
    assert.equal(one('.ifc-note').textContent, island.chart.tooLarge);
  });

  it('an answer that ends at a year has no dashed step, no square and no key', () => {
    chart(RISING, { calendar: true, narrow: true, axis: 'Year' });
    assert.equal(yearly().length, 1);
    none('path.ifc-line--month');
    none('rect.ifc-dot--month');
    none('p.ifc-legend--line');
    assert.equal(one('desc').textContent, 'Line chart. Starts at about €100 (2015) and ends at about €161 (2020).');
    assert.ok(one('path.ifc-area').getAttribute('d')?.endsWith('L342,41.7 L342,156 L40,156 Z'));
  });
});
