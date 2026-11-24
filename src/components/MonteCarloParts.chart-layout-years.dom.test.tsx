/**
 * The Monte Carlo simulator's chart, its year axis (#790): which years are
 * labelled for short and long plans, on a wide screen and a phone and at
 * larger text, the lighter lines for the years between, and the axis title:
 * the lines it takes, the room it is given, where it sits and when it is
 * drawn smaller. The chart is mounted by itself, with plans worked out for real.
 */
import {
  drawChart, clear, withChartWords, onPhone, atTextSize, textDrawnAs, all, num, near,
  drawing, plot, yearLabelEls, yearLabels, minorYearLines, minorAmountLines, axisTitle, titleLines, xOfYear,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
  it('every year up to ten years, every fifth up to thirty, every tenth beyond', () => {
    assert.deepEqual(labelsFor(8), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    assert.deepEqual(labelsFor(10), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    assert.deepEqual(labelsFor(11), ['0', '5', '10']);
    assert.deepEqual(labelsFor(30), ['0', '5', '10', '15', '20', '25', '30']);
    assert.deepEqual(labelsFor(31), ['0', '10', '20', '30']);
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
    assert.deepEqual(yearLabels(), ['0', '10', '20', '30']);
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
    assert.deepEqual(yearLabels(), ['0', '25', '50', '75', '100']);
    clear();
    atTextSize(32);
    clear();
    onPhone();
    assert.deepEqual(labelsFor(30), ['0', '10', '20', '30']);
    assert.deepEqual(labelsFor(60), ['0', '20', '40', '60']);
  });

  it('when even fifty years apart is too tight, every fiftieth year is kept', () => {
    onPhone();
    atTextSize(64);
    drawChart({ saveYears: 60, withdrawal: 20_000, withdrawYears: 60 });
    assert.deepEqual(yearLabels(), ['0', '50', '100']);
  });
});

describe('the lighter lines for the years between', () => {
  it('every year between labels five years apart, and none past the last year', () => {
    drawChart({ saveYears: 12 });
    assert.deepEqual(yearLabels(), ['0', '5', '10']);
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
