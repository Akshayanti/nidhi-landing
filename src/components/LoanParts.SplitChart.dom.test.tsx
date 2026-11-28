/**
 * The loan comparison's payment split chart (`SplitChart`), mounted by itself,
 * and the phone check it draws by (`usePhone`).
 *
 * The chart shows a few months of one loan as bars of one height, each split
 * into the interest part (top) and the principal part (bottom). These tests
 * pin what a reader sees and hears: which months are drawn, each bar's two
 * parts against hand-worked payments, the unit named above the chart and the
 * figures on the bars, the legend, the sentence a screen reader is given and
 * the table behind it, on a wide and on a phone-sized drawing, at normal and
 * at larger text. The chart has no read-out, keys or pointer of its own.
 *
 * The stand-in browser, the loans and the reading of the drawn chart are in
 * `test/loanParts.splitChart.tsx`. What the chart does with the widths the
 * browser reports for its labels is in `LoanParts.SplitChart.measured.dom.test.tsx`.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';
import { cleanup, render } from '@testing-library/react';
import { INK, browser, chart, checkBars, draw, fiveYears, island, loan, near, nearAll, nearSize, tenYears, threeMonths } from '../../test/loanParts.splitChart.tsx';
import { usePhone } from './LoanCompare.tsx';

beforeEach(() => browser.install());
afterEach(() => browser.restore());

describe('the payment split chart on a wide screen at normal text', () => {
  it('draws a three-month loan month by month, to the cent of its hand-worked payments', () => {
    const schedule = threeMonths();
    assert.deepEqual(schedule.map((r) => [r.month, r.payment, r.interest, r.principal]), [
      [1, 10201, 300, 9901],
      [2, 10201, 201, 10000],
      [3, 10200, 101, 10099],
    ], 'the engine agrees with the hand-worked loan');
    const c = chart(schedule);

    assert.equal(c.unit, 'Amounts in €');
    assert.equal(c.viewBox, '0 0 800 365');
    assert.equal(c.textSize, '14px');
    // A loan of up to three years is named by month, its first month included.
    assert.deepEqual(c.months, ['Month 1', 'Month 2', 'Month 3']);

    // The plot is 720 across from 56 and 240 tall from 56. Three bars of 70
    // leave four gaps of (720 − 210) / 4 = 127.5.
    checkBars(c, schedule, { left: 56, right: 776, top: 56, height: 240 }, 70);
    nearAll(c.bars.map((b) => b.interest.x), [183.5, 381, 578.5], 'the bars start');
    // The first two payments are the largest, so they fill the plot; the
    // last is a cent short of them.
    near(c.bars[0].interest.y, 56, 'the first bar reaches the top');
    near(c.bars[0].interest.height, (240 * 300) / 10201, 'month 1: 3.00 of 102.01 is interest');
    near(c.bars[0].principal.height, (240 * 9901) / 10201, 'month 1: 99.01 of 102.01 is principal');
    near(c.bars[1].interest.height, (240 * 201) / 10201, 'month 2: 2.01 of 102.01 is interest');
    near(c.bars[2].interest.y, 56 + 240 / 10201, 'the last bar is one cent in 102.01 shorter');
    near(c.bars[2].interest.height, (240 * 101) / 10201, 'month 3: 1.01 is interest');
    near(c.bars[2].principal.height, (240 * 10099) / 10201, 'month 3: 100.99 is principal');
    near(c.bars[2].principal.y + c.bars[2].principal.height, 296, 'every bar stands on the same line');

    // Whole euros on the bars. An interest part this thin has its figure
    // above the bar, in the orange that reads on the card; the principal
    // figure sits inside its part, in the ink that reads on the offer's colour.
    assert.deepEqual(c.interestLabels, ['3', '2', '1']);
    assert.deepEqual(c.principalLabels, ['99', '100', '101']);
    nearAll(c.bars.map((b) => b.interestLabel!.y), [56 - 0.3 * 14, 56 - 0.3 * 14, 56 + 240 / 10201 - 0.3 * 14], 'interest figures sit just above their bars');
    nearAll(c.bars.map((b) => b.principalLabel!.y), c.bars.map((b) => b.principal.y + 1.3 * 14), 'principal figures sit at the top of their part');
    for (const bar of c.bars) {
      assert.equal(bar.interestLabel!.fill, 'var(--chart-text-warn)');
      assert.equal(bar.principalLabel!.fill, INK);
    }
  });

  it('lays out the legend, the months and the footnote around the bars', () => {
    const c = chart(threeMonths());
    // The interest legend above the plot, the principal legend below it,
    // then the months, then the footnote, each a line of 14 px text apart.
    assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest');
    assert.deepEqual(c.legendInterest.lines, ['Interest']);
    near(c.legendInterest.x, 56, 'the interest legend starts at the plot');
    near(c.legendInterest.y, 56 - 1.45 * 14, 'the interest legend sits above the plot');
    nearAll(c.legendInterest.lineX, [56], 'its line');
    nearAll(c.legendInterest.dy, [0], 'its line');
    assert.equal(c.legendPrincipal.cls, 'lc-splitEyebrowPrincipal');
    assert.deepEqual(c.legendPrincipal.lines, ['Principal']);
    near(c.legendPrincipal.x, 56, 'the principal legend starts at the plot');
    near(c.legendPrincipal.y, 296 + 1.3 * 14, 'the principal legend sits below the plot');
    nearAll(c.legendPrincipal.lineX, [56], 'its line');
    for (const bar of c.bars) {
      near(bar.tick.y, 296 + 1.3 * 14 + 1.5 * 14, 'the months sit below the principal legend');
      nearAll(bar.tick.dy, [0], 'a month on one line');
      assert.equal(bar.tick.size, null);
      assert.equal(bar.tick.hidden, false);
    }
    assert.deepEqual(c.footnote.lines, ['Same payment every month, the split changes']);
    near(c.footnote.x, 400, 'the footnote is centred');
    nearAll(c.footnote.lineX, [400], 'its line');
    nearAll(c.footnote.dy, [0], 'its line');
    near(c.footnote.y, 296 + (1.3 + 1.5 + 1.6) * 14, 'the footnote sits below the months');
    assert.equal(c.footnote.anchor, 'middle');
    for (const words of [c.legendInterest, c.legendPrincipal, c.footnote]) {
      assert.equal(words.size, null, 'nothing is drawn smaller while it fits');
      assert.equal(words.hidden, false);
    }
    // The drawing ends half a line below the footnote: 357.6 + 7, rounded up.
    assert.equal(c.height, 365);
  });

  it('is one image to a screen reader, named by its title, described bar by bar and mirrored in a table', () => {
    const c = chart(threeMonths());
    assert.equal(c.svg.getAttribute('role'), 'img');
    assert.equal(c.svg.getAttribute('focusable'), 'false');
    assert.equal(c.svg.getAttribute('preserveAspectRatio'), 'xMidYMid meet');
    const title = c.svg.querySelector('title');
    const desc = c.svg.querySelector('desc');
    assert.ok(title !== null && desc !== null);
    assert.equal(title.textContent, 'Where each payment goes');
    assert.ok(title.id !== '' && desc.id !== '' && title.id !== desc.id);
    assert.equal(c.svg.getAttribute('aria-labelledby'), `${title.id} ${desc.id}`);
    assert.equal(
      c.said,
      'Where each monthly payment goes for Riverside Bank. '
      + 'Month 1: interest €3.00 (3%), principal €99.01. '
      + 'Month 2: interest €2.01 (2%), principal €100.00. '
      + 'Month 3: interest €1.01 (1%), principal €100.99.',
    );
    // The name and the amounts are text, never an attribute: a click on the
    // chart describes its attributes to analytics.
    for (const el of [c.svg, ...c.svg.querySelectorAll('*')]) {
      for (const attr of el.attributes) {
        assert.ok(!attr.value.includes('Riverside') && !attr.value.includes('102.01') && !attr.value.includes('99.01'), `${el.tagName} ${attr.name} holds no name or amount`);
      }
    }

    // The same months as a table, with the payment, to the cent.
    assert.equal(document.querySelector('div.lc-srOnly table caption')?.textContent, 'Interest and principal split for Riverside Bank, sampled across the loan');
    assert.deepEqual([...document.querySelectorAll('div.lc-srOnly thead th')].map((th) => th.getAttribute('scope')), ['col', 'col', 'col', 'col']);
    assert.deepEqual([...document.querySelectorAll('div.lc-srOnly tbody th')].map((th) => th.getAttribute('scope')), ['row', 'row', 'row']);
    assert.deepEqual(c.table, [
      ['Month', 'Payment', 'Interest', 'Principal'],
      ['Month 1', '€102.01', '€3.00', '€99.01'],
      ['Month 2', '€102.01', '€2.01', '€100.00'],
      ['Month 3', '€102.00', '€1.01', '€100.99'],
    ]);
    // Each amount is one unit that never breaks apart.
    assert.equal(document.querySelectorAll('div.lc-srOnly tbody td > span.amt').length, 9);
  });

  it('samples one month a year across a five-year loan, the first and the last among them', () => {
    const schedule = fiveYears();
    const c = chart(schedule);
    // Months 1, 13, 25, 36, 48 and 60 are sampled; 25 and 36 both fall in
    // year 3, so 36, the nearer the year's end, stays: one bar a year.
    const rows = [1, 13, 36, 48, 60].map((m) => schedule[m - 1]);
    assert.deepEqual(rows.map((r) => r.month), [1, 13, 36, 48, 60]);
    assert.deepEqual([rows[0].payment, rows[0].interest, rows[0].principal], [115997, 30000, 85997], '0.5% of 60,000 is 300.00');
    assert.equal(c.unit, 'Amounts in €');
    assert.equal(c.viewBox, '0 0 800 365');
    assert.deepEqual(c.months, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
    // Five bars of 70 leave six gaps of (720 − 350) / 6.
    checkBars(c, rows, { left: 56, right: 776, top: 56, height: 240 }, 70);
    near(c.bars[0].interest.x, 56 + 370 / 6, 'the first bar starts one gap in');
    near(c.bars[0].interest.height, (240 * 30000) / 115997, 'month 1: 300.00 of 1,159.97 is interest');
    near(c.bars[0].principal.height, (240 * 85997) / 115997, 'month 1: 859.97 of 1,159.97 is principal');

    assert.deepEqual(c.interestLabels, ['300', '247', '136', '73', '6']);
    assert.deepEqual(c.principalLabels, ['860', '913', '1,024', '1,087', '1,154']);
    // An interest part two lines of text tall or more (28 of the 240) holds
    // its figure, in the dark ink that reads on orange; a thinner one has it
    // above the bar.
    const inside = c.bars.map((b) => b.interest.height >= 28);
    assert.deepEqual(inside, [true, true, true, false, false]);
    c.bars.forEach((bar, i) => {
      assert.equal(bar.interestLabel!.fill, inside[i] ? 'var(--chart-on-warn)' : 'var(--chart-text-warn)');
      near(bar.interestLabel!.y, inside[i] ? bar.interest.y + 1.15 * 14 : bar.interest.y - 0.3 * 14, `bar ${i}: where its interest figure sits`);
      assert.equal(bar.principalLabel!.fill, INK);
      near(bar.principalLabel!.y, bar.principal.y + 1.3 * 14, `bar ${i}: where its principal figure sits`);
    });

    assert.equal(
      c.said,
      'Where each monthly payment goes for Riverside Bank. '
      + 'Year 1: interest €300.00 (26%), principal €859.97. '
      + 'Year 2: interest €246.96 (21%), principal €913.01. '
      + 'Year 3: interest €135.98 (12%), principal €1,023.99. '
      + 'Year 4: interest €72.82 (6%), principal €1,087.15. '
      + 'Year 5: interest €5.77 (0%), principal €1,154.06.',
    );
    assert.deepEqual(c.table.slice(1), [
      ['Year 1', '€1,159.97', '€300.00', '€859.97'],
      ['Year 2', '€1,159.97', '€246.96', '€913.01'],
      ['Year 3', '€1,159.97', '€135.98', '€1,023.99'],
      ['Year 4', '€1,159.97', '€72.82', '€1,087.15'],
      ['Year 5', '€1,159.83', '€5.77', '€1,154.06'],
    ]);
  });

  it('counts a loan of millions in millions, and leaves off a figure that would read as nothing', () => {
    // €100,000,000 over 5 years at 2%: €1,752,776.01 a month. "1,586,109"
    // is wider than a bar of 70, so the whole chart counts in millions.
    const schedule = loan(10000000000, 0.02, 60);
    const rows = [1, 13, 36, 48, 60].map((m) => schedule[m - 1]);
    assert.deepEqual([rows[0].payment, rows[0].interest], [175277601, 16666667], 'a twelfth of 2% of 100,000,000 is 166,666.67');
    const c = chart(schedule);
    assert.equal(c.unit, 'Amounts in millions of €');
    checkBars(c, rows, { left: 56, right: 776, top: 56, height: 240 }, 70);
    const millions = (minor: number) => String(Math.round(minor / 1e6) / 100);
    assert.deepEqual(c.principalLabels, rows.map((r) => millions(r.principal)));
    assert.equal(c.principalLabels[0], '1.59');
    // The last month's interest is a few thousand euros: "0" in millions, so
    // it is left off rather than say the month charged none.
    assert.ok(rows[4].interest > 0 && rows[4].interest < 500000);
    assert.deepEqual(c.interestLabels.slice(1), [...rows.slice(1, 4).map((r) => millions(r.interest)), null]);
    assert.equal(c.interestLabels[1], '0.13');
    // The first month's interest part is too thin to hold "0.17", so it is
    // written above the bar: with five bars the first starts far enough in
    // to clear the legend.
    assert.equal(c.interestLabels[0], '0.17');
    assert.equal(c.bars[0].interestLabel!.fill, 'var(--chart-text-warn)');
    // The table still has it, in full.
    assert.equal(c.table[5][2], '€2,916.43');
  });

  it('leaves off a whole-unit figure that would read as nothing, and keeps a true zero', () => {
    // Built by hand: a payment that barely covers its interest (30 cents of
    // principal), and one that is all interest, as the page hands over a
    // loan that is never paid off.
    const c = chart([
      { month: 1, payment: 1030, interest: 1000, principal: 30, balance: 99970 },
      { month: 2, payment: 1030, interest: 1030, principal: 0, balance: 99970 },
      { month: 3, payment: 1030, interest: 40, principal: 990, balance: 98980 },
    ]);
    assert.deepEqual(c.interestLabels, ['10', '10', null]);
    assert.deepEqual(c.principalLabels, [null, '0', '10']);
    // A principal part too thin to hold its figure has it under the bar, in
    // the page's own text colour.
    near(c.bars[1].principalLabel!.y, 296 + 1.15 * 14, 'under the bar');
    assert.equal(c.bars[1].principalLabel!.fill, 'var(--color-text-primary)');
    assert.equal(c.said.endsWith('Month 2: interest €10.30 (100%), principal €0.00. Month 3: interest €0.40 (4%), principal €9.90.'), true);
  });

  it('holds a figure in a part exactly two lines of text tall', () => {
    // Built by hand so the parts are exact: of a payment of 24.00 drawn 240
    // tall, 2.80 is 28, two lines of 14 px text.
    const c = chart([
      { month: 1, payment: 2400, interest: 280, principal: 2120, balance: 7880 },
      { month: 2, payment: 2400, interest: 2120, principal: 280, balance: 7600 },
    ]);
    near(c.bars[0].interest.height, 28, 'the first interest part');
    near(c.bars[1].principal.height, 28, 'the second principal part');
    assert.deepEqual(c.interestLabels, ['3', '21']);
    assert.deepEqual(c.principalLabels, ['21', '3']);
    near(c.bars[0].interestLabel!.y, 56 + 1.15 * 14, 'inside its part');
    assert.equal(c.bars[0].interestLabel!.fill, 'var(--chart-on-warn)');
    near(c.bars[1].principalLabel!.y, 268 + 1.3 * 14, 'inside its part');
    assert.equal(c.bars[1].principalLabel!.fill, INK);
  });

  it('counts yen in whole yen', () => {
    // ¥300,000 over 3 months at 12%: 1% of 300,000 is ¥3,000 of interest.
    const schedule = loan(300000, 0.12, 3);
    assert.deepEqual([schedule[0].payment, schedule[0].interest], [102007, 3000]);
    const c = chart(schedule, island, 'JPY');
    assert.deepEqual(c.interestLabels, ['3,000', '2,010', '1,010']);
    assert.equal(c.table[1][1].endsWith('102,007'), true);
  });
});

describe('the payment split chart with nothing to draw', () => {
  it('says so when the loan has no schedule', () => {
    const container = draw([]);
    assert.equal(container.querySelector('p.lc-chartEmpty')?.textContent, island.charts.splitEmpty);
    assert.ok(container.querySelector('svg') === null);
    assert.ok(container.querySelector('table') === null);
    assert.equal(container.children.length, 1);
  });

  it('draws nothing at all for a schedule that never pays anything', () => {
    // Built by hand: the engine gives no such rows.
    const container = draw([
      { month: 1, payment: 0, interest: 0, principal: 0, balance: 5000 },
      { month: 2, payment: 0, interest: 0, principal: 0, balance: 5000 },
    ]);
    assert.equal(container.innerHTML, '');
  });
});

describe('the payment split chart as the text grows', () => {
  it('keeps every year at 200% while their names fit, in bars as wide as the plot allows', () => {
    browser.wide(2);
    const schedule = fiveYears();
    const c = chart(schedule);
    assert.equal(c.textSize, '28px');
    assert.deepEqual(c.months, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
    // Five text sizes would be 140; five bars have room for (720 − 20) / 5 − 14.
    // The plot starts lower, to keep the legend above it: 2.6 × 28, rounded up.
    checkBars(c, [1, 13, 36, 48, 60].map((m) => schedule[m - 1]), { left: 56, right: 776, top: 73, height: 240 }, 700 / 5 - 14);
    assert.equal(c.unit, 'Amounts in €');
    assert.deepEqual(c.principalLabels, ['860', '913', '1,024', '1,087', '1,154']);
  });

  it('shows three years at 200% when six names no longer fit, and keeps all six in the table', () => {
    browser.wide(2);
    const schedule = tenYears();
    assert.deepEqual([schedule[0].payment, schedule[0].interest, schedule[0].principal], [111021, 50000, 61021], '0.5% of 100,000 is 500.00');
    const c = chart(schedule);
    // "Year 10" needs 4.5 text sizes (126) and a sixth of the plot is 120.
    // Months 1, 61 and 120.
    assert.deepEqual(c.months, ['Year 1', 'Year 6', 'Year 10']);
    checkBars(c, [1, 61, 120].map((m) => schedule[m - 1]), { left: 56, right: 776, top: 73, height: 240 }, 140);
    nearAll(c.bars.map((b) => b.interest.x), [131, 346, 561], 'three bars of 140 leave four gaps of 75');
    assert.equal(c.viewBox, '0 0 800 451');
    near(c.legendInterest.y, 73 - 1.45 * 28, 'the interest legend');
    near(c.legendPrincipal.y, 313 + 1.3 * 28, 'the principal legend');
    near(c.bars[0].tick.y, 313 + 2.8 * 28, 'the years');
    near(c.footnote.y, 313 + 4.4 * 28, 'the footnote');
    assert.deepEqual(c.interestLabels, ['500', '287', '6']);
    assert.deepEqual(c.principalLabels, ['610', '823', '1,104']);
    near(c.bars[0].interestLabel!.y, 73 + 1.15 * 28, 'inside the interest part');
    near(c.bars[2].interestLabel!.y, c.bars[2].interest.y - 0.3 * 28, 'above the bar');
    near(c.bars[0].principalLabel!.y, c.bars[0].principal.y + 1.3 * 28, 'inside the principal part');
    assert.equal(
      c.said,
      'Where each monthly payment goes for Riverside Bank. '
      + 'Year 1: interest €500.00 (45%), principal €610.21. '
      + 'Year 6: interest €287.13 (26%), principal €823.08. '
      + 'Year 10: interest €5.52 (0%), principal €1,103.82.',
    );
    // Months 1, 25, 49, 72, 96 and 120, whatever the drawing shows.
    assert.deepEqual(c.table.slice(1), [
      ['Year 1', '€1,110.21', '€500.00', '€610.21'],
      ['Year 3', '€1,110.21', '€422.41', '€687.80'],
      ['Year 5', '€1,110.21', '€334.94', '€775.27'],
      ['Year 6', '€1,110.21', '€240.71', '€869.50'],
      ['Year 8', '€1,110.21', '€130.14', '€980.07'],
      ['Year 10', '€1,109.34', '€5.52', '€1,103.82'],
    ]);
  });

  it('shows the first and the last year at 400%, wraps the footnote and makes room for it', () => {
    browser.wide(4);
    const schedule = tenYears();
    const c = chart(schedule);
    assert.equal(c.textSize, '56px');
    assert.deepEqual(c.months, ['Year 1', 'Year 10']);
    // Bars five text sizes wide: 280. The plot starts at 2.6 × 56, rounded up.
    checkBars(c, [schedule[0], schedule[119]], { left: 56, right: 776, top: 146, height: 240 }, 280);
    assert.deepEqual(c.footnote.lines, ['Same payment every month,', 'the split changes']);
    nearAll(c.footnote.dy, [0, 1.2 * 56], 'the second line is one line down');
    nearAll(c.footnote.lineX, [400, 400], 'both lines are centred');
    near(c.footnote.y, 386 + 4.4 * 56, 'the footnote');
    // One more line of 67.2 and half a text size under 632.4: 727.6, rounded up.
    assert.equal(c.viewBox, '0 0 800 728');
    // The first bar's interest part (108 of 240) is under two lines of this
    // text, so its figure would go above the bar, into the legend: it is
    // left off, and the last bar's, clear of the legend, is kept.
    assert.deepEqual(c.interestLabels, [null, '6']);
    assert.deepEqual(c.principalLabels, ['610', '1,104']);
    assert.equal(c.bars[1].interestLabel!.fill, 'var(--chart-text-warn)');
  });
});

describe('the payment split chart on a phone', () => {
  it('draws a narrower chart with five slimmer bars, one a year', () => {
    browser.phone();
    const schedule = fiveYears();
    const c = chart(schedule);
    assert.equal(c.textSize, '14px');
    assert.equal(c.viewBox, '0 0 360 335');
    assert.deepEqual(c.months, ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
    // The plot is 344 across from 8 and 210 tall. Five bars have room for
    // (344 − 20) / 5 − 6 = 58.8 each, with six gaps of (344 − 294) / 6.
    checkBars(c, [1, 13, 36, 48, 60].map((m) => schedule[m - 1]), { left: 8, right: 352, top: 56, height: 210 }, 324 / 5 - 6);
    nearAll(c.bars.map((b) => b.interest.x), [0, 1, 2, 3, 4].map((i) => 8 + 50 / 6 + i * (58.8 + 50 / 6)), 'the bars start');
    near(c.legendInterest.x, 8, 'the legend starts at the plot');
    near(c.legendPrincipal.x, 8, 'the legend starts at the plot');
    nearAll(c.legendPrincipal.lineX, [8], 'its line');
    near(c.legendPrincipal.y, 266 + 1.3 * 14, 'the principal legend');
    near(c.footnote.x, 180, 'the footnote is centred');
    assert.equal(c.unit, 'Amounts in €');
    assert.deepEqual(c.interestLabels, ['300', '247', '136', '73', '6']);
    assert.deepEqual(c.principalLabels, ['860', '913', '1,024', '1,087', '1,154']);
  });

  it('shows three years as soon as one of six names does not fit its column', () => {
    browser.phone();
    const schedule = tenYears();
    const c = chart(schedule);
    // A sixth of the plot is 57.3: "Year 1" (54.6 with its margin) fits and
    // "Year 10" (63) does not.
    assert.deepEqual(c.months, ['Year 1', 'Year 6', 'Year 10']);
    checkBars(c, [1, 61, 120].map((m) => schedule[m - 1]), { left: 8, right: 352, top: 56, height: 210 }, 70);
    nearAll(c.bars.map((b) => b.interest.x), [41.5, 145, 248.5], 'three bars of 70 leave four gaps of 33.5');
    assert.equal(c.table.length, 7);
  });

  it('at 400% counts in thousands, stacks each year on two lines and drops what cannot fit', () => {
    // A 320 px phone shows the 360-wide drawing at 320: 64 px text is 72 units.
    browser.phone(4);
    browser.shownWidth = 320;
    const schedule = tenYears();
    const c = chart(schedule);
    assert.equal(c.textSize, '63px');
    assert.deepEqual(c.bars.map((b) => b.tick.lines), [['Year', '1'], ['Year', '10']]);
    // Two bars with room for (344 − 20) / 2 − 6 = 156 each.
    checkBars(c, [schedule[0], schedule[119]], { left: 8, right: 352, top: 164, height: 210 }, 156);
    // "1,104" (189 wide) does not fit a bar of 156, so the chart counts in
    // thousands. Only the last bar's principal has room for its figure: the
    // others would run into the legends.
    assert.equal(c.unit, 'Amounts in thousands of €');
    assert.deepEqual(c.interestLabels, [null, null]);
    assert.deepEqual(c.principalLabels, [null, '1.1']);
    // A column is 166.67 wide and a year's name gets that less 0.4 of the
    // text size (141.47). "Year" is 151.2, so it is drawn smaller to fit.
    const room = 344 / 2 - 16 / 3 - 0.4 * 63;
    for (const bar of c.bars) {
      nearAll(bar.tick.dy, [0, 1.2 * 63], 'the number is one line down');
      nearSize(bar.tick.size, 63 * (room / 151.2), 'the name is drawn smaller by just enough');
      assert.equal(bar.tick.hidden, false);
    }
    assert.deepEqual(c.footnote.lines, ['Same', 'payment', 'every', 'month,', 'the split', 'changes']);
    nearAll(c.footnote.dy, [0, 75.6, 75.6, 75.6, 75.6, 75.6], 'each line one line down');
    // Legend 164 − 1.45 × 63; plot to 374; legend, years (two lines) and
    // footnote (six lines) below it.
    near(c.legendInterest.y, 164 - 1.45 * 63, 'the interest legend');
    near(c.legendPrincipal.y, 374 + 1.3 * 63, 'the principal legend');
    near(c.bars[0].tick.y, 374 + 2.8 * 63, 'the years');
    near(c.footnote.y, 374 + 2.8 * 63 + 1.2 * 63 + 1.6 * 63, 'the footnote, below two lines of years');
    assert.equal(c.viewBox, '0 0 360 1137');
    assert.equal(c.legendInterest.cls, 'lc-splitEyebrowInterest');
    assert.equal(c.legendPrincipal.cls, 'lc-splitEyebrowPrincipal');
  });
});

describe('the phone check the chart draws by', () => {
  function Probe() {
    return <span>{usePhone() ? 'phone' : 'wide'}</span>;
  }

  it('is a wide screen on the server, whatever the browser will say', () => {
    browser.phoneScreen = true;
    assert.equal(renderToString(<Probe />), '<span>wide</span>');
  });

  it("asks the browser for the site's phone breakpoint once mounted", () => {
    browser.phoneScreen = true;
    const { container } = render(<Probe />);
    assert.equal(container.textContent, 'phone');
    assert.deepEqual(browser.screens.map((s) => s.media), ['(width < 640px)']);
    cleanup();
    browser.phoneScreen = false;
    assert.equal(render(<Probe />).container.textContent, 'wide');
  });

  it('follows the screen as it is turned or resized, and stops listening when it leaves the page', () => {
    const { container, unmount } = render(<Probe />);
    assert.equal(container.textContent, 'wide');
    browser.screenBecomes(true);
    assert.equal(container.textContent, 'phone');
    browser.screenBecomes(false);
    assert.equal(container.textContent, 'wide');
    assert.equal(browser.listening, 1);
    unmount();
    assert.equal(browser.listening, 0);
  });

  it('still answers in a browser whose media queries cannot be listened to', () => {
    window.matchMedia = ((query: string) => ({ matches: query === '(width < 640px)', media: query })) as unknown as typeof window.matchMedia;
    const { container, unmount } = render(<Probe />);
    assert.equal(container.textContent, 'phone');
    unmount();
  });
});
