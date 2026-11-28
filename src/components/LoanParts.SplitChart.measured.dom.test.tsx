/**
 * The loan comparison's payment split chart (`SplitChart`) and the widths the
 * browser reports for its labels: the chart measures every label as drawn,
 * and decides by those widths how many years it shows, whether it counts in
 * whole units, which figures have room, where the legend, the years and the
 * footnote wrap, and what is drawn smaller or left out.
 *
 * The widths are stand-ins a test sets (`browser.drawn`, in
 * `test/loanParts.splitChart.tsx`); a label no test names is as wide as its
 * letters at 0.6 of the text size. The chart at its usual sizes is in
 * `LoanParts.SplitChart.dom.test.tsx`.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup } from '@testing-library/react';
import { browser, chart, fiveYears, island, loan, near, nearAll, nearSize, threeMonths, withSplit } from '../../test/loanParts.splitChart.tsx';

beforeEach(() => browser.install());
afterEach(() => browser.restore());

describe('the payment split chart goes by what the browser draws', () => {
  it('counts in thousands when the drawn figures are wider than their letters suggest, and leaves off one wider than its bar', () => {
    // 17 units a character: three characters (51) fit a bar of 70 less its
    // margin of 4, four (68) do not.
    browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' ? [...text].length * 17 : undefined);
    const c = chart(fiveYears());
    assert.equal(c.unit, 'Amounts in thousands of €');
    // A figure above its bar has the whole column: the two thin interest
    // parts keep theirs.
    assert.deepEqual(c.interestLabels, ['0.3', null, null, '0.07', '0.01']);
    assert.deepEqual(c.principalLabels, [null, null, null, null, null]);
  });

  it('keeps whole units when only the figures of the interest parts are wide in thousands', () => {
    // Whole figures fit; nothing else is asked of the others.
    browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' && text.includes('.') ? 500 : undefined);
    const c = chart(fiveYears());
    assert.equal(c.unit, 'Amounts in €');
    assert.deepEqual(c.interestLabels, ['300', '247', '136', '73', '6']);
  });

  it('keeps whole units when the widest figure is exactly its bar less the margin', () => {
    browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' && text === '100' ? 66 : undefined);
    const c = chart(threeMonths());
    assert.deepEqual(c.principalLabels, ['99', '100', '101']);
  });

  it('draws a schedule that lacks a month it measures but does not show', () => {
    // Built by hand: a year of months with the seventh missing. Six bars
    // show months 1, 3, 5, 8, 10 and 12; the seventh is only a candidate
    // for a drawing of three. A loan of a year is named by month.
    const year = loan(120000, 0.12, 12);
    const holed = [...year];
    delete holed[6];
    const c = chart(holed);
    assert.deepEqual(c.months, ['Month 1', 'Month 3', 'Month 5', 'Month 8', 'Month 10', 'Month 12']);
  });

  it('keeps a figure above its bar while it is no wider than the column, and one figure of two that would touch', () => {
    const figures = (widths: Record<string, number>) => {
      // "100" at 67 is wider than a bar of 70 less its margin of 4, so the
      // chart leaves whole euros for cents, and that one figure is left off.
      browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' ? { 100: 67, ...widths }[text] : undefined);
      const c = chart(threeMonths());
      cleanup();
      return c;
    };
    // Three bars, 197.5 apart. A figure may be the column less 2: at 195 the
    // third is kept, and at 197 the second would reach the next column.
    let c = figures({ '2.01': 197, '1.01': 195 });
    assert.equal(c.unit, 'Amounts in €');
    assert.deepEqual(c.interestLabels, ['3', null, '1.01']);
    assert.deepEqual(c.principalLabels, ['99.01', null, '100.99']);
    // Two neighbours of 195 each, with a margin of 2 either side, would
    // overlap by 1.5: the later one is left off.
    c = figures({ '2.01': 195, '1.01': 195 });
    assert.deepEqual(c.interestLabels, ['3', '2.01', null]);
    // At 193.5 each, with their margins, they touch and do not overlap: both are kept.
    c = figures({ '2.01': 193.5, '1.01': 193.5 });
    assert.deepEqual(c.interestLabels, ['3', '2.01', '1.01']);
  });

  it('moves a figure that would sit on another down a line inside its part, when the part has room', () => {
    // Built by hand: the engine gives no month whose interest is below zero,
    // and nothing else puts one figure on another inside a bar. Four bars,
    // the plot 240 tall for a payment of 24.00.
    //   month 2 gives back 1.20 of interest: its principal part starts 12
    //     above the bar's top, under the interest figure that sits there,
    //     so its own figure goes one line down.
    //   month 3 pays 3.00 and gives back 1.20: its principal part, 42 tall,
    //     has no room for a second line (45.5), so its figure is left off.
    //   month 4 gives back 3.64: its principal part starts 36.4 above the
    //     bar's top, and its figure would touch the interest figure on
    //     either line, so it is left off.
    const c = chart([
      { month: 1, payment: 2400, interest: 0, principal: 2400, balance: 9000 },
      { month: 2, payment: 2400, interest: -120, principal: 2520, balance: 6480 },
      { month: 3, payment: 300, interest: -120, principal: 420, balance: 6060 },
      { month: 4, payment: 2400, interest: -364, principal: 2764, balance: 3296 },
    ]);
    assert.deepEqual(c.interestLabels, ['0', '−1', '−1', '−4']);
    assert.deepEqual(c.principalLabels, ['24', '25', null, null]);
    near(c.bars[0].principalLabel!.y, 56 + 1.3 * 14, 'the first, clear of everything, on its first line');
    near(c.bars[1].principal.y, 44, 'the second principal part starts above the plot');
    near(c.bars[1].principalLabel!.y, 44 + 1.3 * 14 + 1.25 * 14, 'its figure one line down');
    near(c.bars[3].principal.y, 56 - 36.4, 'the fourth principal part starts higher still');
  });

  it('counts a figure as on another when it reaches into the space kept under it, and a part of exactly two lines as room for both', () => {
    // Built by hand, as above: the plot is 240 tall for a payment of 24.00,
    // starting at 56, and the text is 14.
    //   month 2 gives back 0.60 of interest: its principal part starts 6
    //     above the bar's top. The interest figure above the bar has its
    //     baseline at 51.8 and keeps a quarter line (3.5) clear under it, to
    //     55.3; the principal figure's first line would start at 54.2, so it
    //     goes one line down, to 50 + 18.2 + 17.5.
    //   month 3 pays 3.35 and gives back 1.20: its principal part is 45.5
    //     tall, exactly two lines and the room a figure needs (28 + 17.5),
    //     so its figure moves down a line rather than being left off.
    const c = chart([
      { month: 1, payment: 2400, interest: 0, principal: 2400, balance: 9000 },
      { month: 2, payment: 2400, interest: -60, principal: 2460, balance: 6540 },
      { month: 3, payment: 335, interest: -120, principal: 455, balance: 6085 },
      { month: 4, payment: 2400, interest: 0, principal: 2400, balance: 3685 },
    ]);
    assert.ok(c.principalLabels.every((label) => label !== null), `every principal figure is kept: ${c.principalLabels.join(', ')}`);
    near(c.bars[1].principal.y, 50, 'the second principal part starts above the plot');
    near(c.bars[1].principalLabel!.y, 50 + 1.3 * 14 + 1.25 * 14, 'its figure one line down');
    near(c.bars[2].principal.y, 56 + 240 - 33.5 - 12, 'the third principal part starts above its bar');
    near(c.bars[2].principalLabel!.y, 56 + 240 - 33.5 - 12 + 1.3 * 14 + 1.25 * 14, 'its figure one line down, inside the part');
  });

  it('keeps a figure on its line when it only touches the space kept under another', () => {
    // Built by hand, with the plot 240 tall for a payment of 48.00: month 2
    // gives back 0.98 of interest, so its principal part starts 4.9 above the
    // bar's top, and its figure's first line starts at 51.1 + 4.2 = 55.3,
    // exactly where the space under the interest figure ends.
    const c = chart([
      { month: 1, payment: 4800, interest: 0, principal: 4800, balance: 9000 },
      { month: 2, payment: 4800, interest: -98, principal: 4898, balance: 4102 },
      { month: 3, payment: 4800, interest: 0, principal: 4800, balance: 0 },
    ]);
    assert.equal(c.interestLabels[1], '−1');
    near(c.bars[1].principal.y, 56 - 4.9, 'the second principal part starts above the plot');
    near(c.bars[1].principalLabel!.y, 56 - 4.9 + 1.3 * 14, 'its figure on its first line', 1e-9);
  });

  it('leaves off a figure under the first bar when it would run into the legend below the plot', () => {
    // Built by hand, as the page hands over a loan that is never paid off:
    // every payment is all interest, so each "0" of principal goes under its
    // bar, level with the legend. The first is centred on 218.5 and starts
    // at 212.3: a legend drawn 150 wide ends at 206, one of 200 at 256.
    const allInterest = [1, 2, 3].map((month) => ({ month, payment: 1030, interest: 1030, principal: 0, balance: 99970 }));
    browser.drawn = (cls) => (cls === 'lc-splitEyebrowPrincipal' ? 150 : undefined);
    let c = chart(allInterest);
    assert.deepEqual(c.principalLabels, ['0', '0', '0']);
    cleanup();
    browser.drawn = (cls) => (cls === 'lc-splitEyebrowPrincipal' ? 200 : undefined);
    c = chart(allInterest);
    assert.deepEqual(c.principalLabels, [null, '0', '0']);
  });

  it('leaves off a figure above the first bar when it would run into the legend', () => {
    // The legend word, 67.2 wide, ends at 123.2. The first bar is centred on
    // 218.5: a figure of 186 with its margins starts at 123.5, one of 188 at 122.5.
    browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' && text === '3' ? 186 : undefined);
    let c = chart(threeMonths());
    assert.deepEqual(c.interestLabels, ['3', '2.01', '1.01']);
    cleanup();
    browser.drawn = (cls, text) => (cls === 'lc-splitValueInterest' && text === '3' ? 188 : undefined);
    c = chart(threeMonths());
    assert.deepEqual(c.interestLabels, [null, '2.01', '1.01']);
    cleanup();
    // The legend's own drawn width decides: at 60 it ends at 116, clear of 122.5.
    browser.drawn = (cls, text) => (cls === 'lc-splitEyebrowInterest' ? 60 : cls === 'lc-splitValueInterest' && text === '3' ? 188 : undefined);
    c = chart(threeMonths());
    assert.deepEqual(c.interestLabels, ['3', '2.01', '1.01']);
  });

  it('shows fewer years when their names are drawn wider than their letters suggest', () => {
    // "Year" at 124: with its number and margins a name needs 145, and a
    // fifth of the plot (one bar a year of a five-year loan) is 144.
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' && text === 'Year' ? 124 : undefined);
    const c = chart(fiveYears());
    assert.deepEqual(c.months, ['Year 1', 'Year 3', 'Year 5']);
  });

  it('keeps every year when their names are drawn exactly as wide as their columns', () => {
    // At 125% text one unit of text is 17.5: "Year" at 123 and a number at
    // 5.25, a space of 5.25 between them and a margin of 10.5 make 144, a
    // fifth of the plot.
    browser.wide(1.25);
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' ? (text === 'Year' ? 123 : 5.25) : undefined);
    const c = chart(fiveYears());
    assert.equal(c.textSize, '17.5px');
    assert.equal(c.months.length, 5);
  });

  it('does not count a stray space in a translated name as a word', () => {
    // The same exact fit: a space too many before, inside or after the name
    // adds no width, so every year still fits.
    browser.wide(1.25);
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' ? (text === 'Year' ? 123 : 5.25) : undefined);
    const c = chart(fiveYears(), { ...island, balance: { ...island.balance, year: ' Year  {y} ' } });
    assert.deepEqual(c.months, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
  });

  it('stacks a name wider than its column on two lines, drawn smaller when one word is still too wide', () => {
    // Three columns of 197.5; a name gets that less 5.6. The number "1" at
    // 200 is too wide even alone; "Month" at 12 keeps the whole name inside a
    // third of the plot, so the drawing still has three bars.
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' ? ({ 1: 200, Month: 12 } as Record<string, number>)[text] : undefined);
    const c = chart(threeMonths());
    assert.deepEqual(c.bars.map((b) => b.tick.lines), [['Month', '1'], ['Month 2'], ['Month 3']]);
    nearAll(c.bars[0].tick.dy, [0, 1.2 * 14], 'the number one line down');
    nearSize(c.bars[0].tick.size, 14 * (191.9 / 200), 'drawn smaller by just enough');
    assert.equal(c.bars[0].tick.hidden, false);
    assert.equal(c.bars[1].tick.size, null);
    // The footnote and the drawing make room for the second line: 16.8 more.
    near(c.footnote.y, 357.6 + 16.8, 'the footnote moves down a line');
    assert.equal(c.height, 382);
  });

  it('leaves out a name that would have to be drawn below the smallest text size', () => {
    // A name this wide leaves two bars, 263.33 apart, and 257.73 of room for
    // each name. At 299 a word is drawn at 0.862 of its size, just above the
    // floor of 0.75 / 0.875; at 302 it would be under it.
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' && text === '1' ? 299 : undefined);
    let c = chart(threeMonths());
    assert.deepEqual(c.months, ['Month 1', 'Month 3']);
    assert.deepEqual(c.bars.map((b) => b.tick.hidden), [false, false]);
    cleanup();
    browser.drawn = (cls, text) => (cls === 'lc-splitTickX' && text === '1' ? 302 : undefined);
    c = chart(threeMonths());
    assert.deepEqual(c.bars.map((b) => b.tick.hidden), [true, false]);
    nearSize(c.bars[0].tick.size, 14 * ((580 / 3 + 70 - 5.6) / 302), 'its size');
  });

  it('sets both legend words in ordinary letters when either does not fit in capitals', () => {
    for (const tooWide of ['lc-splitEyebrowInterest', 'lc-splitEyebrowPrincipal']) {
      browser.drawn = (cls) => (cls === tooWide ? 721 : undefined);
      const c = chart(threeMonths());
      assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest lc-splitEyebrow--plain', `${tooWide} at 721`);
      assert.equal(c.legendPrincipal.cls, 'lc-splitEyebrowPrincipal lc-splitEyebrow--plain', `${tooWide} at 721`);
      assert.equal(c.legendInterest.size, null);
      assert.equal(c.legendPrincipal.size, null);
      assert.equal(c.legendInterest.hidden, false);
      cleanup();
    }
    // Exactly as wide as the plot still fits.
    browser.drawn = (cls) => (cls.startsWith('lc-splitEyebrow') ? 720 : undefined);
    const c = chart(threeMonths());
    assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest');
    assert.equal(c.legendPrincipal.cls, 'lc-splitEyebrowPrincipal');
  });

  it('draws a legend word smaller when it does not fit even in ordinary letters, and leaves it out below the smallest size', () => {
    const widths: Record<string, number> = {
      'lc-splitEyebrowInterest': 1000,
      // 720 / 800 = 0.9 of its size.
      'lc-splitEyebrowInterest lc-splitEyebrow--plain': 800,
      // 720 / 900 = 0.8, under the floor.
      'lc-splitEyebrowPrincipal lc-splitEyebrow--plain': 900,
    };
    browser.drawn = (cls) => widths[cls];
    const c = chart(threeMonths());
    nearSize(c.legendInterest.size, 14 * 0.9, 'the interest legend is drawn at 0.9');
    assert.equal(c.legendInterest.hidden, false);
    nearSize(c.legendPrincipal.size, 14 * 0.8, 'the principal legend would be drawn at 0.8');
    assert.equal(c.legendPrincipal.hidden, true);
  });

  it('wraps the footnote by its drawn width, smaller when a word is too wide and left out below the smallest size', () => {
    // 792 of room; every word 300 wide, so two to a line.
    browser.drawn = (cls) => (cls === 'lc-splitFootnote' ? 300 : undefined);
    let c = chart(threeMonths());
    assert.deepEqual(c.footnote.lines, ['Same payment', 'every month,', 'the split', 'changes']);
    nearAll(c.footnote.dy, [0, 16.8, 16.8, 16.8], 'each line one line down');
    assert.equal(c.footnote.size, null);
    // Three more lines of 16.8 under 357.6, and half a text size: 415.
    assert.equal(c.height, 415);
    cleanup();

    browser.drawn = (cls, text) => (cls === 'lc-splitFootnote' ? (text === 'changes' ? 880 : 10) : undefined);
    c = chart(threeMonths());
    assert.deepEqual(c.footnote.lines, ['Same payment every month, the split', 'changes']);
    nearSize(c.footnote.size, 14 * (792 / 880), 'drawn at 0.9');
    assert.equal(c.footnote.hidden, false);
    cleanup();

    // At 924 it is drawn at exactly the floor, 0.75 / 0.875 of its size, and stays.
    browser.drawn = (cls, text) => (cls === 'lc-splitFootnote' ? (text === 'changes' ? 924 : 10) : undefined);
    c = chart(threeMonths());
    assert.equal(c.footnote.hidden, false);
    nearSize(c.footnote.size, 12, 'drawn at 0.75 rem');
    cleanup();

    browser.drawn = (cls, text) => (cls === 'lc-splitFootnote' ? (text === 'changes' ? 990 : 10) : undefined);
    c = chart(threeMonths());
    nearSize(c.footnote.size, 14 * 0.8, 'would be drawn at 0.8');
    assert.equal(c.footnote.hidden, true);
  });
});

describe('the payment split chart with a legend of several words', () => {
  // No language's legend has two words today; a translation may.
  const long = withSplit({ eyebrowInterest: 'Interest you pay', eyebrowPrincipal: 'Principal you repay' });

  it('wraps the legend inside the plot and moves everything else to make room', () => {
    // Capitals 300 a word: two to a line in 720, with a space of 0.45 × 14.
    browser.drawn = (cls) => (cls.startsWith('lc-splitEyebrow') ? 300 : undefined);
    const c = chart(threeMonths(), long);
    assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest');
    assert.deepEqual(c.legendInterest.lines, ['Interest you', 'pay']);
    assert.deepEqual(c.legendPrincipal.lines, ['Principal you', 'repay']);
    nearAll(c.legendInterest.dy, [0, 16.8], 'the second line one line down');
    nearAll(c.legendInterest.lineX, [56, 56], 'both lines start at the plot');
    nearAll(c.legendPrincipal.dy, [0, 16.8], 'the second line one line down');
    nearAll(c.legendPrincipal.lineX, [56, 56], 'both lines start at the plot');
    // The legend's second line, 300 wide and level with the figures above
    // the bars, reaches the first bar's: that figure is left off.
    assert.deepEqual(c.interestLabels, [null, '2', '1']);
    // Two lines above the plot: 2.6 × 14 + 16.8 = 53.2 still fits above 56.
    near(c.legendInterest.y, 56 - 1.45 * 14 - 16.8, 'the interest legend starts a line higher');
    near(c.bars[0].interest.y, 56, 'the plot stays where it was');
    near(c.legendPrincipal.y, 296 + 1.3 * 14, 'the principal legend');
    near(c.bars[0].tick.y, 296 + 1.3 * 14 + 16.8 + 1.5 * 14, 'the months move down a line');
    assert.equal(c.height, 382);
  });

  it('sets the legend in ordinary letters when one word of several does not fit in capitals', () => {
    browser.drawn = (cls, text) => (cls === 'lc-splitEyebrowInterest' && text === 'pay' ? 721 : undefined);
    const c = chart(threeMonths(), long);
    assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest lc-splitEyebrow--plain');
    assert.equal(c.legendPrincipal.cls, 'lc-splitEyebrowPrincipal lc-splitEyebrow--plain');
  });

  it('measures a line of capitals with their wider spaces', () => {
    // Capitals are spaced 0.45 of the text size apart (6.3), other words 0.3
    // (4.2). Two words of 356.85 and a space of 6.3 are 720 exactly: one line.
    browser.drawn = (cls) => (cls.startsWith('lc-splitEyebrow') ? 356.85 : undefined);
    let c = chart(threeMonths(), withSplit({ eyebrowInterest: 'Interest paid' }));
    assert.deepEqual(c.legendInterest.lines, ['Interest paid']);
    cleanup();
    // Two words of 357.5 need 721.3 with that space, and would have fitted
    // with an ordinary one.
    browser.drawn = (cls) => (cls.startsWith('lc-splitEyebrow') ? 357.5 : undefined);
    c = chart(threeMonths(), withSplit({ eyebrowInterest: 'Interest paid' }));
    assert.deepEqual(c.legendInterest.lines, ['Interest', 'paid']);
  });

  it('starts the plot lower when the legend above it needs more than the room it has', () => {
    browser.drawn = (cls) => (cls.startsWith('lc-splitEyebrow') ? 400 : undefined);
    const c = chart(threeMonths(), long);
    assert.deepEqual(c.legendInterest.lines, ['Interest', 'you', 'pay']);
    // 2.6 × 14 + 2 × 16.8 = 70 above the plot.
    near(c.bars[0].interest.y, 70, 'the plot starts lower');
    near(c.legendInterest.y, 70 - 1.45 * 14 - 2 * 16.8, 'the legend');
    near(c.legendPrincipal.y, 310 + 1.3 * 14, 'the principal legend');
    near(c.bars[0].tick.y, 310 + 1.3 * 14 + 2 * 16.8 + 1.5 * 14, 'the months, below three lines of legend');
  });
});
