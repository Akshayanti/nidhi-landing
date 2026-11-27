/**
 * The answer of the inflation calculator (#790): `Results` puts the answer
 * into a headline, its sentences, the same sum one point either side, the
 * method and the chart; tells a screen reader each new answer once, and why
 * there is none while a box is wrong; and withholds an answer that no longer
 * matches the form. Every figure is worked out by hand beside it.
 */
import { island, fill, inTool, clear, all, text, one, none, type Page } from '../../test/inflationParts.components.tsx';
import { clock } from '../../test/windowClock.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { DEFAULTS, type ToolState } from '../utils/inflation/url.ts';
import { Results, type CountryOption } from './InflationCalculator.tsx';

const r = island.results;
type Props = ComponentProps<typeof Results>;

const TESTLAND: CountryOption = { code: 'TST', name: 'Testland', currency: null };
const FINLAND: CountryOption = { code: 'FIN', name: 'Finland', currency: 'EUR' };
const EURO_AREA: CountryOption = { code: 'EMU', name: 'Euro area', currency: 'EUR' };

const BUY: ToolState = { ...DEFAULTS };
// 10,000 after ten years at 3%: 10,000 / 1.03^10 = 10,000 / 1.343916 = 7,440.94, said as 7,440.
const BUY_SENTENCE = 'If inflation averages 3% a year, €10,000 in 10 years buys what about €7,440 buys today.';

function props(change: Partial<Props> = {}): Props {
  return { strings: island, state: BUY, withheld: false, invalid: false, country: null, series: null, historyStatus: 'none', narrow: false, numberLocale: 'en', ...change };
}

/** Draws the answer, and gives back a way to draw it again as the form changes. */
function results(change: Partial<Props> = {}, page: Page = {}) {
  let now = props(change);
  const view = render(inTool(<Results {...now} />, page));
  return (next: Partial<Props>) => {
    now = { ...now, ...next };
    view.rerender(inTool(<Results {...now} />, page));
  };
}

/** What a screen reader is told of a new answer. */
const said = () => one('.ifc-results > span.ifc-srOnly').textContent;
/** What it is told when there is no answer. */
const saidWhy = () => one('.ifc-results > span.chart-srOnly').textContent;
const headline = () => one('.ifc-headline').textContent;
const lines = () => all('.ifc-answer > p.ifc-sentence, .ifc-answer > p.ifc-note').map((p) => [p.className, p.textContent]);
const band = () => text('.ifc-bandItem');
const body = () => one('.tool-resultBody');

beforeEach(() => clock.install());
afterEach(() => clock.restore());

describe('the answer of the inflation calculator', () => {
  it('what money buys later: the headline, its sentence, one point either side, the method and the chart', () => {
    results();
    {
      // the section is named by its heading
      assert.equal(one('section').className, 'ifc-results');
      assert.equal(one('section').getAttribute('aria-labelledby'), 'ifc-results-h');
      assert.equal(one('h2').id, 'ifc-results-h');
      assert.equal(one('h2').className, 'ifc-resultsTitle');
      assert.equal(one('h2').textContent, r.heading);
    }
    {
      assert.equal(headline(), 'about €7,440');
      assert.deepEqual(text('.ifc-headline .amt'), ['€7,440']);
      assert.deepEqual(lines(), [['ifc-sentence', BUY_SENTENCE]]);
      assert.deepEqual(text('.ifc-sentence .amt'), ['3%', '€10,000', '10', '€7,440']);
      // At 2%: 10,000 / 1.218994 = 8,203; at 4%: 10,000 / 1.480244 = 6,756.
      assert.equal(one('.ifc-band').textContent, 'One point either side: At 2%: about €8,200 · At 4%: about €6,760');
      assert.equal(one('.ifc-bandLabel').textContent, r.bandLabel);
      assert.deepEqual(band(), ['At 2%: about €8,200', ' · At 4%: about €6,760']);
      // One separator, between the two, and not read out.
      assert.deepEqual(all('.ifc-bandItem > span[aria-hidden]').map((s) => [s.getAttribute('aria-hidden'), s.textContent]), [['true', ' · ']]);
      assert.equal(one('.ifc-method').textContent, r.method);
    }
    {
      // the chart of the path, in the state's currency, on a wide drawing
      assert.equal(one('figcaption').textContent, 'What €10,000 buys each year, in today’s money'.replace('’', "'"));
      assert.equal(one('.tool-chartUnit').textContent, 'Amounts in thousands of €');
      assert.equal(one('svg.ifc-chart').getAttribute('viewBox')?.split(' ')[2], '760');
      assert.equal(one('desc').textContent, 'Line chart. Starts at about €10,000 (year 0) and ends at about €7,440 (year 10).');
      assert.ok(one('.ifc-resultBody').contains(one('figure.ifc-figure')));
      assert.ok(one('.ifc-resultBody > .ifc-answer').contains(one('.ifc-method')));
    }
    {
      // shown, not withheld, and nothing said for the answer the page loads with
      assert.equal(body().className, 'tool-resultBody');
      assert.equal(body().hasAttribute('inert'), false);
      none('.tool-resultReason');
      assert.equal(said(), '');
      assert.equal(one('.ifc-results > span.ifc-srOnly').getAttribute('aria-live'), 'polite');
      assert.equal(saidWhy(), '');
      clock.pass(5000);
      assert.equal(said(), '');
      assert.equal(saidWhy(), '');
    }
  });

  it('the amounts either side of a result share one size, the longest', () => {
    // 5,000 at 7% for ten years costs 5,000 x 1.967151 = 9,836; at 6% 8,954 and at 8% 10,795.
    results({ state: { ...DEFAULTS, mode: 'cost', currency: 'USD', amount: 5000, rate: 7 }, narrow: true });
    assert.equal(headline(), 'about $9,840');
    assert.deepEqual(lines(), [['ifc-sentence', 'If prices rise 7% a year on average, something that costs $5,000 today costs about $9,840 in 10 years.']]);
    assert.deepEqual(band(), ['At 6%: about $8,950', ' · At 8%: about $10,800']);
    // "$10,800" is a sign (1.1 of a digit), five digits and a comma (half): 6.6 digits wide. "$8,950" alone would be 5.6.
    const sizes = all('.ifc-band .amt').map((a) => [a.textContent, (a as HTMLElement).style.getPropertyValue('--amt-len')]);
    assert.deepEqual(sizes, [['6%', '6.6'], ['$8,950', '6.6'], ['8%', '6.6'], ['$10,800', '6.6']]);
    assert.equal((one('.ifc-headline .amt') as HTMLElement).style.getPropertyValue('--amt-len'), '5.6');
    // The chart follows the currency and the phone's width.
    assert.equal(one('.tool-chartUnit').textContent, 'Amounts in thousands of $');
    assert.equal(one('svg.ifc-chart').getAttribute('viewBox')?.split(' ')[2], '360');
    assert.equal(one('figcaption').textContent, 'What $5,000 becomes each year');
  });

  it('keeping up, behind: the headline, the range and the announcement carry one true minus sign, each rate whole (#888)', () => {
    // (1.02 / 1.04 - 1) = -1.92% a year; either side 1.02 / 1.03 = -0.97% and 1.02 / 1.05 = -2.86%.
    const again = results();
    again({ state: { ...DEFAULTS, mode: 'keep', growth: 2, rate: 4 } });
    assert.equal(headline(), '\u22121.92% a year');
    // The sign is inside the unit that never breaks, as on the other tools.
    assert.deepEqual(text('.ifc-headline .amt'), ['\u22121.92%']);
    assert.deepEqual(band(), ['At 3% inflation: \u22120.97% a year', ' · At 5% inflation: \u22122.86% a year']);
    assert.ok(!one('.ifc-answer').textContent!.includes('-'), 'no hyphen stands in for a minus sign');
    // What is announced is the headline itself, as on the other tools.
    assert.equal(said(), 'Updated answer: \u22121.92% a year. With a raise or return of 2% a year and inflation averaging 4%, buying power shrinks about 1.92% a year.');
  });

  it('keeping up: the real rate as the headline, and the real rate either side', () => {
    // (1.05 / 1.03 - 1) = 1.94% a year; over ten years 10,000 x 1.019417^10 = 12,120.
    results({ state: { ...DEFAULTS, mode: 'keep' } });
    assert.equal(headline(), '+1.94% a year');
    assert.deepEqual(lines(), [
      ['ifc-sentence', 'With a raise or return of 5% a year and inflation averaging 3%, buying power grows about 1.94% a year.'],
      ['ifc-note', 'After 10 years, €10,000 growing at 5% a year buys what about €12,100 buys today.'],
      ['ifc-note', fill(r.keepExact, { growth: '5%', rate: '3%', shortcut: '5% − 3% = 2%' })],
    ]);
    // 1.05 / 1.02 = 1.029412 and 1.05 / 1.04 = 1.009615.
    assert.deepEqual(band(), ['At 2% inflation: +2.94% a year', ' · At 4% inflation: +0.96% a year']);
    assert.equal(one('.ifc-method').textContent, r.method);
  });

  it('a country’s own history over one year: the change, said once, with no “those 1 year” (#868)', () => {
    const series = { 2018: 5, 2019: 5, 2020: 10 };
    results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST', from: 2019 }, country: TESTLAND, series, historyStatus: 'ready' });
    assert.deepEqual(lines()[1], ['ifc-note', 'Prices rose about 10% in that one year.']);
  });

  it('a country’s own history when prices fell: a fall, by how much, never “rose about -28%” (#868)', () => {
    // 0.8 × 0.9 = 0.72: prices fell 28% over two years, 15.1% a year (1 − the root of 0.72).
    const series = { 2017: 0, 2018: 0, 2019: -20, 2020: -10 };
    results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST', from: 2018 }, country: TESTLAND, series, historyStatus: 'ready' });
    assert.deepEqual(lines()[1], ['ifc-note', 'Prices fell about 28% in total over those 2 years, an average of 15.1% a year.']);
  });

  it('a country’s own history when prices fell for one year', () => {
    const series = { 2018: 0, 2019: 0, 2020: -10 };
    results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST', from: 2019 }, country: TESTLAND, series, historyStatus: 'ready' });
    assert.deepEqual(lines()[1], ['ifc-note', 'Prices fell about 10% in that one year.']);
  });

  it('a country’s own history: the years, the total rise and its average, and no “either side”', () => {
    // 2020 rose 10% and 2021 not at all: 1,000 of 2019 is 1,100 in 2021, 10% in two years, 4.9% a year (the root of 1.1).
    const series = { 2018: 5, 2019: 10, 2020: 10, 2021: 0 };
    results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST', from: 2019 }, country: TESTLAND, series, historyStatus: 'ready' });
    assert.equal(headline(), 'about €1,100');
    assert.deepEqual(lines(), [
      ['ifc-sentence', 'In Testland, €1,000 at average prices in 2019 bought what about €1,100 bought at average prices in 2021.'],
      ['ifc-note', 'Prices rose about 10% in total over those 2 years, an average of 4.9% a year.'],
      ['ifc-note', '2021 is the latest year with a figure here. Price changes after it are not included.'],
      ['ifc-note', 'The starting amount is treated as the average for 2019. If your pay or a price was set in a particular month, prices since then may have risen more or less than this.'],
    ]);
    none('.ifc-band');
    none('.ifc-bandLabel');
    assert.equal(one('.ifc-method').textContent, r.methodHistory);
    assert.equal(one('figcaption').textContent, 'What €1,000 is worth each year since');
    assert.equal(one('desc').textContent, 'Line chart. Starts at about €1,000 (2019) and ends at about €1,100 (2021).');
    assert.deepEqual(text('svg.ifc-chart > text.ifc-axis:not(.ifc-axisTitle)'), ['2019', '2020', '2021']);
    assert.deepEqual(text('svg.ifc-chart > text.ifc-axisTitle tspan'), [island.chart.axis.pastCountry]);
    clear();
    // With no starting year chosen it starts ten years back, or where the figures start: 2018, so 1.1 x 1.1 = 1.21.
    results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST' }, country: TESTLAND, series, historyStatus: 'ready' });
    assert.equal(lines()[0][1], 'In Testland, €1,000 at average prices in 2018 bought what about €1,210 bought at average prices in 2021.');
    clear();
    // A history that could not be loaded leaves the rate that was typed: 10,000 x 1.343916 = 13,439.
    results({ state: { ...DEFAULTS, mode: 'past', country: 'TST' }, country: TESTLAND, series: null, historyStatus: 'error' });
    assert.equal(headline(), 'about €13,400');
    assert.deepEqual(lines(), [['ifc-sentence', 'If inflation averaged 3% a year, €10,000 from 10 years ago buys what about €13,400 buys today.']]);
    assert.deepEqual(band(), ['At 2%: about €12,200', ' · At 4%: about €14,800']);
  });

  it('while a country’s history loads it says so, as a status, in place of an answer', () => {
    const state = { ...DEFAULTS, mode: 'past' as const, amount: 1000, country: 'TST', from: 2019 };
    const again = results({ state, country: TESTLAND, series: null, historyStatus: 'loading' });
    assert.deepEqual(all('.tool-resultBody > p').map((p) => [p.className, p.getAttribute('role'), p.textContent]), [['ifc-note', 'status', island.history.loading]]);
    none('.ifc-resultBody');
    none('figure');
    assert.equal(said(), '');
    // The history arrives: the answer is there, and nothing is said for the answer the page loaded with.
    again({ series: { 2019: 10, 2020: 10, 2021: 0 }, historyStatus: 'ready' });
    assert.equal(headline(), 'about €1,100');
    assert.equal(said(), '');
  });

  it('each new answer is told to a screen reader once, with its headline and first sentence', () => {
    const again = results();
    const cost = { ...DEFAULTS, mode: 'cost' as const, amount: 5000, rate: 7 };
    again({ state: cost });
    assert.equal(said(), 'Updated answer: about €9,840. If prices rise 7% a year on average, something that costs €5,000 today costs about €9,840 in 10 years.');
    assert.equal(saidWhy(), '');
    // A history still loading has nothing to say yet, and what was said last stays.
    const past = { ...DEFAULTS, mode: 'past' as const, amount: 1000, country: 'TST', from: 2019 };
    again({ state: past, country: TESTLAND, historyStatus: 'loading' });
    assert.equal(said(), 'Updated answer: about €9,840. If prices rise 7% a year on average, something that costs €5,000 today costs about €9,840 in 10 years.');
    // Once it arrives, the same question has its answer, and that is told.
    again({ series: { 2019: 10, 2020: 10, 2021: 0 }, historyStatus: 'ready' });
    assert.equal(said(), 'Updated answer: about €1,100. In Testland, €1,000 at average prices in 2019 bought what about €1,100 bought at average prices in 2021.');
    // Back at the very state the page loaded with: that one was never an update.
    again({ state: BUY, country: null, series: null, historyStatus: 'none' });
    assert.equal(said(), 'Updated answer: about €1,100. In Testland, €1,000 at average prices in 2019 bought what about €1,100 bought at average prices in 2021.');
    // An equal state that is a new answer is told.
    again({ state: { ...BUY } });
    assert.equal(said(), `Updated answer: about €7,440. ${BUY_SENTENCE}`);
  });

  it('an answer that allowed for a change of currency says so in the announcement too', () => {
    // Finland's markka became the euro in 2002 at 5.94573 to one. Prices rose 10% from 2000 to 2003:
    // 1,000 x 1.1 / 5.94573 = 185.01; without the change it would be 1,100. The cube root of 1.1 is 1.0323.
    const series = { 2000: 0, 2001: 10, 2002: 0, 2003: 0 };
    const changed = fill(r.currencyChanged, { country: 'Finland', year: 2002, ratio: '5.94573', from: 2000, unconverted: 'about €1,100' });
    const first = 'In Finland, 1,000 in the money of 2000, at that year’s average prices, bought what about €185 bought at average prices in 2003.';
    const again = results();
    again({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'FIN', from: 2000 }, country: FINLAND, series, historyStatus: 'ready' });
    assert.equal(headline(), 'about €185');
    assert.deepEqual(lines(), [
      ['ifc-sentence', first],
      ['ifc-note', changed],
      ['ifc-note', 'Prices rose about 10% in total over those 3 years, an average of 3.2% a year.'],
      ['ifc-note', '2003 is the latest year with a figure here. Price changes after it are not included.'],
      ['ifc-note', 'The starting amount is treated as the average for 2000. If your pay or a price was set in a particular month, prices since then may have risen more or less than this.'],
    ]);
    assert.ok(changed.startsWith('Finland changed its currency in 2002: 5.94573 units of the old money became 1 unit of the new.'));
    assert.equal(said(), `Updated answer: about €185. ${first} ${changed}`);
    // The amount typed was not today's money, so the chart's title gives it without a symbol.
    assert.equal(one('figcaption').textContent, 'What 1,000 is worth each year since');
    // The euro area before the euro: the amount is a plain number, and the note says why.
    again({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'EMU', from: 1998 }, country: EURO_AREA, series: { 1998: 0, 1999: 10, 2000: 0 }, historyStatus: 'ready' });
    const euro = fill(r.euroBefore1999, { from: 1998 });
    assert.deepEqual(lines().slice(0, 2), [['ifc-sentence', 'In the euro area, 1,000 at average prices in 1998 bought what about €1,100 bought at average prices in 2000.'], ['ifc-note', euro]]);
    assert.equal(said(), `Updated answer: about €1,100. In the euro area, 1,000 at average prices in 1998 bought what about €1,100 bought at average prices in 2000. ${euro}`);
  });

  it('while a box is wrong the answer is withheld, the reason is shown at once and said after a pause', () => {
    const again = results();
    const cost = { ...DEFAULTS, mode: 'cost' as const, amount: 5000, rate: 7 };
    again({ state: cost });
    assert.notEqual(said(), '');
    again({ withheld: true, invalid: true });
    {
      // the old answer cannot be reached, the reason stands in its place, and the old announcement is gone
      assert.equal(body().className, 'tool-resultBody tool-withheld');
      assert.equal(body().hasAttribute('inert'), true);
      assert.deepEqual(text('.tool-resultReason'), [r.fix]);
      assert.equal(said(), '');
    }
    {
      // the reason is said once typing has paused for a second, not before
      clock.pass(999);
      assert.equal(saidWhy(), '');
      clock.pass(1);
      assert.equal(saidWhy(), r.fix);
    }
    {
      // corrected, with the answer still settling: withheld, but there is nothing left to fix
      again({ invalid: false });
      assert.equal(body().className, 'tool-resultBody tool-withheld');
      assert.equal(body().hasAttribute('inert'), true);
      none('.tool-resultReason');
      assert.equal(said(), '');
    }
    {
      // the form comes back to the answer it had: shown again, and not said again
      again({ withheld: false });
      assert.equal(body().className, 'tool-resultBody');
      assert.equal(headline(), 'about €9,840');
      assert.equal(said(), '');
      clock.pass(5000);
      assert.equal(said(), '');
      // With nothing left to fix, the reason is no longer what was last said.
      assert.equal(saidWhy(), '');
    }
    {
      // wrong again, then corrected to a new answer: that one is told as it appears
      again({ withheld: true, invalid: true });
      again({ withheld: false, invalid: false, state: { ...BUY } });
      assert.equal(said(), `Updated answer: about €7,440. ${BUY_SENTENCE}`);
    }
    {
      // an answer that arrives while still withheld is not told
      again({ withheld: true, state: { ...cost } });
      assert.equal(said(), '');
    }
  });

  it('amounts follow the page’s own style, percentages the page’s numbers', () => {
    results({ state: { ...DEFAULTS, rate: 2.5 }, numberLocale: 'es' }, { amountLocale: 'es' });
    // 10,000 / 1.025^10 = 10,000 / 1.280085 = 7,812.
    assert.equal(headline(), 'about 7810 €');
    assert.equal(lines()[0][1], fill(r.buy, { rate: '2,5 %', amount: '10.000 €', years: '10 years', result: 'about 7810 €' }));
  });

  it('a country with a month to end at: the answer, its lines and the chart all go to the month', () => {
    // 2020 rose 10% and 2021 not at all; the month stands 20% above the 2021 average: 1,000 x 1.1 x 1.2 = 1,320.
    const series = { 2018: 5, 2019: 10, 2020: 10, 2021: 0 };
    const again = results({ state: { ...DEFAULTS, mode: 'past', amount: 1000, country: 'TST', from: 2019 }, country: TESTLAND, series, historyStatus: 'ready', join: { month: '2022-03', factor: 1.2, source: 'bis' } });
    assert.equal(headline(), 'about €1,320');
    assert.deepEqual(lines().slice(0, 4), [
      ['ifc-sentence', 'In Testland, €1,000 at average prices in 2019 bought what about €1,320 bought at prices in March 2022.'],
      ['ifc-note', 'Prices were about 32% higher in March 2022 than on average in 2019.'],
      ['ifc-note', 'From 2019 to 2021, they rose 4.9% a year on average.'],
      ['ifc-note', 'Prices were 20% higher in March 2022 than on average in 2021.'],
    ]);
    assert.equal(lines().length, 5);
    // The method, then which two sources are joined.
    assert.deepEqual(text('.ifc-answer > p.ifc-method'), [r.methodHistory, fill(r.joinNote, { to: 2021, source: r.monthlySource.bis })]);
    assert.equal(all('p.ifc-legend--line > span')[1].textContent, 'One month, the latest with a figure: March 2022');
    assert.equal(all('path.ifc-line--month').length, 1);
    assert.equal(all('rect.ifc-dot--month').length, 1);
    assert.equal(all('p.ifc-legend--line > span').length, 2);
    // The same country when its months are not joined: the yearly answer, and the reason.
    again({ join: { withheld: 'mismatch' } });
    assert.deepEqual(text('.ifc-answer > p.ifc-method'), [r.methodHistory]);
    assert.equal(headline(), 'about €1,100');
    assert.equal(lines()[3][1], 'A monthly figure is not joined for Testland: the monthly index available here does not match this yearly history closely enough.');
    none('path.ifc-line--month');
    none('p.ifc-legend--line');
    // And with no monthly index at all, which is also what leaving the join out means.
    again({ join: null });
    assert.equal(lines().length, 4);
    again({ join: undefined });
    assert.equal(lines().length, 4);
    assert.equal(headline(), 'about €1,100');
  });
});
