/**
 * What the inflation calculator tells the reader (#790): `computeAnswer` turns
 * the settled form, and a country's history where one is used, into the
 * headline, the sentences, the comparison line, the note for a change of
 * currency and the points of the chart.
 *
 * Every figure here is worked out by hand on small made-up series. The one
 * used most has prices rising 10%, 20% and 25% in three successive years:
 * 1.10 x 1.20 x 1.25 = 1.65, so 1,000 becomes 1,100, 1,320 and 1,650. The
 * currency changes are the real ones (currencyChanges.ts).
 *
 * No browser: the function is pure.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inflationEn, inflationCs } from '../i18n/strings/tools/inflation.ts';
import { format } from '../i18n/format.ts';
import type { Series } from '../utils/inflation/math.ts';
import { defaultState, type ToolState } from '../utils/inflation/url.ts';
import type { MonthlyJoin } from '../utils/inflation/monthly.ts';
import { computeAnswer, monthOnYearAxis, type CountryOption } from './InflationCalculator.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { inflation: inflationEn },
  cs: { inflation: inflationCs },
};

const en = TOOL_STRINGS.en.inflation.island;
const cs = TOOL_STRINGS.cs.inflation.island;
const r = en.results;

const METHOD = 'Compounded once a year, at the same rate every year. A scenario, not a forecast.';
const METHOD_HISTORY = "Compounded year by year with each year's actual figure. History, not a forecast.";
/** The rise sentence for the 10%, 20%, 25% series: 65% in all, and 1.65^(1/3) = 1.1817. */
const RISE_3 = 'Prices rose about 65% in total over those 3 years, an average of 18.2% a year.';

/** The two notes every answer that ends at a year closes with: nothing after `to` is in it, and the start is `from`'s average. */
const LATEST = (to: number) => `${to} is the latest year with a figure here. Price changes after it are not included.`;
const START = (from: number) => `The starting amount is treated as the average for ${from}. If your pay or a price was set in a particular month, prices since then may have risen more or less than this.`;

type Status = 'none' | 'loading' | 'ready' | 'error';

const state = (change: Partial<ToolState>): ToolState => ({ ...defaultState('EUR'), amount: 1000, rate: 10, years: 2, ...change });

/** The answer, which these tests expect to be there (not "loading"). */
const answerOf = (
  s: ToolState,
  country: CountryOption | null = null,
  series: Series | null = null,
  status: Status = 'none',
  numberLocale = 'en',
  amountLocale: string | null = null,
  strings = en,
) => {
  const a = computeAnswer(s, strings, country, series, status, numberLocale, amountLocale, null);
  assert.ok(a !== 'loading', 'the answer is still loading');
  return a;
};

/** Past to today with a country's history, from `from`. */
const past = (country: CountryOption, series: Series, amount: number, from: number | null, currency = country.currency ?? 'EUR') =>
  answerOf(state({ mode: 'past', currency, amount, from }), country, series, 'ready');

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`);

const samePoints = (actual: { x: number; value: number }[], expected: [number, number][]) => {
  assert.deepEqual(actual.map((p) => p.x), expected.map(([x]) => x));
  actual.forEach((p, i) => close(p.value, expected[i][1]));
};

const USA: CountryOption = { code: 'USA', name: 'United States', currency: 'USD' };
const TUR: CountryOption = { code: 'TUR', name: 'Türkiye', currency: 'TRY' };
const AUS: CountryOption = { code: 'AUS', name: 'Australia', currency: 'AUD' };
const ECU: CountryOption = { code: 'ECU', name: 'Ecuador', currency: 'USD' };
const BRA: CountryOption = { code: 'BRA', name: 'Brazil', currency: 'BRL' };
const IDN: CountryOption = { code: 'IDN', name: 'Indonesia', currency: 'IDR' };
const BGR: CountryOption = { code: 'BGR', name: 'Bulgaria', currency: 'EUR' };
const EMU: CountryOption = { code: 'EMU', name: 'Euro area', currency: 'EUR' };

/** Four years ending in rises of 10%, 20% and 25%; the first year's own figure is never part of the sum. */
const rising = (first: number, firstRate = 3): Series => ({ [first]: firstRate, [first + 1]: 10, [first + 2]: 20, [first + 3]: 25 });

describe('what an amount buys later, at a typed rate', () => {
  // 1,000 / 1.1^2 = 826.446...; at 9%: 1,000 / 1.1881 = 841.68; at 11%: 1,000 / 1.2321 = 811.62.
  const a = answerOf(state({ mode: 'buy' }));

  it('gives the amount in today’s money, rounded in the headline and exact as a number', () => {
    assert.equal(a.headline, 'about €826');
    close(a.value, 1000 / 1.21);
    assert.deepEqual(a.sentences, ['If inflation averages 10% a year, €1,000 in 2 years buys what about €826 buys today.']);
  });

  it('compares one point either side', () => {
    assert.deepEqual(a.band, ['At 9%: about €842', 'At 11%: about €812']);
  });

  it('draws the path from today to the last year, and names the chart for the question', () => {
    samePoints(a.points, [[0, 1000], [1, 1000 / 1.1], [2, 1000 / 1.21]]);
    assert.equal(a.calendar, false);
    assert.equal(a.chartTitle, "What €1,000 buys each year, in today's money");
    assert.equal(a.axis, 'Years from now');
    assert.equal(a.method, METHOD);
    assert.ok(a.announceMore === undefined);
  });

  it('has no lower side at 0% and no higher side at the largest rate', () => {
    assert.deepEqual(answerOf(state({ mode: 'buy', rate: 0 })).band, ['At 1%: about €980']);
    // 1,000 / 100^2 = 0.1
    assert.deepEqual(answerOf(state({ mode: 'buy', rate: 10_000 })).band, ['At 9,999%: less than €1']);
  });

  it('says one year in the singular, and shows the cents that were typed', () => {
    // 1,000.5 / 1.1 = 909.545...
    const one = answerOf(state({ mode: 'buy', years: 1, amount: 1000.5 }));
    assert.deepEqual(one.sentences, ['If inflation averages 10% a year, €1,000.5 in 1 year buys what about €910 buys today.']);
    assert.equal(one.chartTitle, "What €1,000.5 buys each year, in today's money");
  });

  it('is written in the page’s language and number style', () => {
    const czech = answerOf(state({ mode: 'buy' }), null, null, 'none', 'cs', 'cs', cs);
    assert.equal(czech.headline, 'zhruba 826 €');
    assert.deepEqual(czech.sentences, [
      format(cs.results.buy, { rate: '10 %', amount: '1 000 €', years: '2 roky', result: 'zhruba 826 €' }),
    ]);
    assert.deepEqual(czech.band, ['Při 9 %: zhruba 842 €', 'Při 11 %: zhruba 812 €']);
    assert.equal(czech.chartTitle, format(cs.chart.title.buy, { amount: '1 000 €' }));
    assert.equal(czech.axis, cs.chart.axis.buy);
    assert.equal(czech.method, cs.results.method);
  });
});

describe('what something costs later, at a typed rate', () => {
  // 1,000 x 1.1^2 = 1,210; at 9%: 1,188.1, said as 1,190; at 11%: 1,232.1, said as 1,230.
  const a = answerOf(state({ mode: 'cost' }));

  it('grows the price, and says so in the cost wording', () => {
    assert.equal(a.headline, 'about €1,210');
    close(a.value, 1210);
    assert.deepEqual(a.sentences, ['If prices rise 10% a year on average, something that costs €1,000 today costs about €1,210 in 2 years.']);
    assert.deepEqual(a.band, ['At 9%: about €1,190', 'At 11%: about €1,230']);
  });

  it('draws the price rising, under the cost chart’s own title', () => {
    samePoints(a.points, [[0, 1000], [1, 1100], [2, 1210]]);
    assert.equal(a.chartTitle, 'What €1,000 becomes each year');
    assert.equal(a.axis, 'Years from now');
    assert.equal(a.calendar, false);
    assert.equal(a.method, METHOD);
  });
});

describe('past to today at a typed rate', () => {
  const PAST = 'If inflation averaged 10% a year, €1,000 from 2 years ago buys what about €1,210 buys today.';

  it('grows the amount like a price, in the past wording, with its own chart title and axis', () => {
    const a = answerOf(state({ mode: 'past' }));
    assert.equal(a.headline, 'about €1,210');
    close(a.value, 1210);
    assert.deepEqual(a.sentences, [PAST]);
    assert.deepEqual(a.band, ['At 9%: about €1,190', 'At 11%: about €1,230']);
    samePoints(a.points, [[0, 1000], [1, 1100], [2, 1210]]);
    assert.equal(a.chartTitle, 'What €1,000 is worth each year since');
    assert.equal(a.axis, 'Years since then');
    assert.equal(a.calendar, false);
    assert.equal(a.method, METHOD);
  });

  it('is what the reader gets when the history could not be loaded, or offers no starting year', () => {
    const s = state({ mode: 'past', currency: 'USD', from: 2019 });
    const typed = PAST.replaceAll('€', '$');
    assert.deepEqual(answerOf(s, USA, null, 'error').sentences, [typed]);
    assert.deepEqual(answerOf(s, USA, rising(2019), 'error').sentences, [typed]);
    assert.deepEqual(answerOf(s, USA, rising(2019), 'none').sentences, [typed]);
    assert.deepEqual(answerOf(s, USA, null, 'ready').sentences, [typed]);
    assert.deepEqual(answerOf(s, USA, { 2022: 4 }, 'ready').sentences, [typed]);
    assert.deepEqual(answerOf(s, USA, {}, 'ready').sentences, [typed]);
  });

  it('is what the reader gets with no country chosen, whatever history is at hand', () => {
    const s = state({ mode: 'past', from: 2019 });
    assert.deepEqual(answerOf(s, null, rising(2019), 'ready').sentences, [PAST]);
    assert.deepEqual(answerOf(s, null, null, 'loading').sentences, [PAST]);
  });
});

describe('a country’s history is used only for past to today', () => {
  it('the other questions keep the typed rate with a country chosen', () => {
    assert.deepEqual(answerOf(state({ mode: 'buy' }), USA, rising(2019), 'ready').sentences, [
      'If inflation averages 10% a year, €1,000 in 2 years buys what about €826 buys today.',
    ]);
    assert.equal(answerOf(state({ mode: 'cost' }), USA, null, 'loading').headline, 'about €1,210');
    assert.equal(answerOf(state({ mode: 'keep', growth: 21 }), USA, null, 'loading').method, METHOD);
  });

  it('waits while the history loads, even with an earlier country’s figures still at hand', () => {
    const s = state({ mode: 'past', currency: 'USD', from: 2019 });
    assert.equal(computeAnswer(s, en, USA, null, 'loading', 'en', null, null), 'loading');
    assert.equal(computeAnswer(s, en, USA, rising(2019), 'loading', 'en', null, null), 'loading');
    // A month to end at does not make a history that is still loading ready.
    assert.equal(computeAnswer(s, en, USA, rising(2019), 'loading', 'en', null, { month: '2023-03', factor: 1.1, source: 'bis' }), 'loading');
  });
});

describe('past to today with a country’s history', () => {
  const a = past(USA, rising(2019), 1000, 2019);

  it('multiplies every year after the starting year: 1,000 becomes 1,650', () => {
    assert.equal(a.headline, 'about $1,650');
    close(a.value, 1650);
    assert.deepEqual(a.sentences, ['In United States, $1,000 at average prices in 2019 bought what about $1,650 bought at average prices in 2022.', RISE_3, LATEST(2022), START(2019)]);
  });

  it('has no comparison line and no note, and says its method is history', () => {
    assert.deepEqual(a.band, []);
    assert.ok(a.announceMore === undefined);
    assert.equal(a.method, METHOD_HISTORY);
  });

  it('draws the amount year by year, by calendar year', () => {
    samePoints(a.points, [[2019, 1000], [2020, 1100], [2021, 1320], [2022, 1650]]);
    assert.equal(a.calendar, true);
    assert.equal(a.chartTitle, 'What $1,000 is worth each year since');
    assert.equal(a.axis, 'Year');
  });

  it('a later starting year leaves the earlier rises out, and one year is said as one year, its change once (#868)', () => {
    const late = past(USA, rising(2019), 1000, 2021);
    close(late.value, 1250);
    assert.deepEqual(late.sentences, [
      'In United States, $1,000 at average prices in 2021 bought what about $1,250 bought at average prices in 2022.',
      'Prices rose about 25% in that one year.',
      LATEST(2022),
      START(2021),
    ]);
    samePoints(late.points, [[2021, 1000], [2022, 1250]]);
  });

  it('starts ten years before the latest figure when no year, or one the history does not offer, is chosen', () => {
    // 2% a year from 2005 to 2022: from 2012 that is 1.02^10 = 1.21899, so 1,000 becomes 1,218.99.
    const flat: Series = {};
    for (let y = 2005; y <= 2022; y++) flat[y] = 2;
    for (const from of [null, 1990, 2022, 2030]) {
      const d = past(USA, flat, 1000, from);
      close(d.value, 1000 * Math.pow(1.02, 10));
      assert.deepEqual(d.sentences, [
        'In United States, $1,000 at average prices in 2012 bought what about $1,220 bought at average prices in 2022.',
        'Prices rose about 22% in total over those 10 years, an average of 2% a year.',
      LATEST(2022),
      START(2012),
    ]);
      assert.equal(d.points.length, 11);
      assert.equal(d.points[0].x, 2012);
    }
  });

  it('a fall in prices is a fall in the answer', () => {
    // -10% then -20%: 0.9 x 0.8 = 0.72, an average of sqrt(0.72) - 1 = -15.1% a year.
    const fall = past(USA, { 2020: 1, 2021: -10, 2022: -20 }, 1000, 2020);
    close(fall.value, 720);
    assert.equal(fall.sentences[1], 'Prices fell about 28% in total over those 2 years, an average of 15.1% a year.');
  });

  it('a change written as 0% claims neither a rise nor a fall (#888)', () => {
    const line = (series: Series, from: number, numberLocale = 'en') => answerOf(state({ mode: 'past', currency: 'USD', from }), USA, series, 'ready', numberLocale).sentences[1];
    const FLAT = 'Prices changed by less than 0.5% in total over those 2 years.';
    const FLAT_YEAR = 'Prices changed by less than 0.5% in that one year.';
    // 0.998 x 0.998 = 0.996: a fall of 0.4%, which was "fell about 0%"; 1.002 x 1.002 = 1.004 was "rose about 0%".
    assert.equal(line({ 2020: 1, 2021: -0.2, 2022: -0.2 }, 2020), FLAT);
    assert.equal(line({ 2020: 1, 2021: 0.2, 2022: 0.2 }, 2020), FLAT);
    assert.equal(line({ 2020: 1, 2021: 0, 2022: 0 }, 2020), FLAT);
    assert.equal(line({ 2021: 1, 2022: -0.4 }, 2021), FLAT_YEAR);
    assert.equal(line({ 2021: 1, 2022: 0.4 }, 2021), FLAT_YEAR);
    // From half a percent it is a rise or a fall again: 0.997 x 0.997 = 0.994.
    assert.equal(line({ 2020: 1, 2021: -0.3, 2022: -0.3 }, 2020), 'Prices fell about 1% in total over those 2 years, an average of 0.3% a year.');
    assert.equal(line({ 2020: 1, 2021: 0.3, 2022: 0.3 }, 2020), 'Prices rose about 1% in total over those 2 years, an average of 0.3% a year.');
    assert.equal(line({ 2021: 1, 2022: -0.6 }, 2021), 'Prices fell about 1% in that one year.');
    assert.equal(line({ 2021: 1, 2022: 0.6 }, 2021), 'Prices rose about 1% in that one year.');
    // The limit is written the page's way.
    assert.equal(line({ 2020: 1, 2021: -0.2, 2022: -0.2 }, 2020, 'cs'), 'Prices changed by less than 0,5\u00a0% in total over those 2 years.');
  });

  it('follows the page’s number style for the bare figures', () => {
    const indian = answerOf(state({ mode: 'past', currency: 'TRY', amount: 2e9, from: 2003 }), TUR, rising(2003), 'ready', 'en-IN');
    assert.equal(indian.sentences[0], 'In Türkiye, 2,00,00,00,000 in the money of 2003, at that year’s average prices, bought what about ₺3,300 bought at average prices in 2006.');
    assert.match(indian.sentences[1], /^Türkiye changed its currency in 2005: 10,00,000 units of the old money became 1 unit of the new\./);
    const czech = answerOf(state({ mode: 'past', currency: 'USD', from: 2019 }), USA, rising(2019), 'ready', 'cs');
    assert.equal(czech.sentences[1], 'Prices rose about 65 % in total over those 3 years, an average of 18,2 % a year.');
  });
});

describe('a history in a currency that is not the country’s own', () => {
  it('converts nothing and adds no note, even across a change of currency', () => {
    for (const country of [TUR, { ...TUR, currency: null }]) {
      const a = past(country, rising(2003), 1000, 2003, 'EUR');
      close(a.value, 1650);
      assert.deepEqual(a.sentences, ['In Türkiye, €1,000 at average prices in 2003 bought what about €1,650 bought at average prices in 2006.', RISE_3, LATEST(2006), START(2003)]);
      assert.ok(a.announceMore === undefined);
      samePoints(a.points, [[2003, 1000], [2004, 1100], [2005, 1320], [2006, 1650]]);
      assert.equal(a.chartTitle, 'What €1,000 is worth each year since');
    }
  });

  it('adds no note for the year both monies were in use', () => {
    const a = past(AUS, rising(1964), 1000, 1966, 'EUR');
    assert.deepEqual(a.sentences, ['In Australia, €1,000 at average prices in 1966 bought what about €1,250 bought at average prices in 1967.', 'Prices rose about 25% in that one year.', LATEST(1967), START(1966)]);
  });
});

describe('a history that crosses one change of currency', () => {
  // Turkey struck six zeros off in 2005: 2,000,000,000 x 1.65 = 3,300,000,000 old lira = 3,300 new.
  const a = past(TUR, rising(2003), 2e9, 2003);
  const note = format(r.currencyChanged, { country: 'Türkiye', year: 2005, ratio: '1,000,000', from: 2003, unconverted: 'about ₺3,300,000,000' });

  it('gives the answer in today’s unit, and the typed amount without a symbol', () => {
    assert.equal(a.headline, 'about ₺3,300');
    close(a.value, 3300);
    assert.equal(a.sentences[0], 'In Türkiye, 2,000,000,000 in the money of 2003, at that year’s average prices, bought what about ₺3,300 bought at average prices in 2006.');
    assert.equal(a.chartTitle, 'What 2,000,000,000 is worth each year since');
  });

  it('says what changed, when, by how much, and what the answer is if the amount was already today’s money', () => {
    assert.match(note, /^Türkiye changed its currency in 2005: 1,000,000 units of the old money became 1 unit of the new\. .* the answer is about ₺3,300,000,000\.$/);
    assert.deepEqual(a.sentences, [a.sentences[0], note, RISE_3, LATEST(2006), START(2003)]);
    assert.equal(a.announceMore, note);
  });

  it('draws the whole path in today’s unit', () => {
    samePoints(a.points, [[2003, 2000], [2004, 2200], [2005, 2640], [2006, 3300]]);
  });

  it('is not crossed from the year of the change itself', () => {
    const from2005 = past(TUR, rising(2003), 1000, 2005);
    assert.deepEqual(from2005.sentences, ['In Türkiye, ₺1,000 at average prices in 2005 bought what about ₺1,250 bought at average prices in 2006.', 'Prices rose about 25% in that one year.', LATEST(2006), START(2005)]);
    assert.ok(from2005.announceMore === undefined);
    close(from2005.value, 1250);
  });

  it('says a pound that became two dollars that way round, and doubles the answer', () => {
    // Australia, 1966: ratio 0.5. 1,000 pounds x 1.65 = 1,650 pounds = 3,300 dollars.
    const pounds = past(AUS, rising(1964), 1000, 1964);
    const up = format(r.currencyChangedUp, { country: 'Australia', year: 1966, ratio: '2', from: 1964, unconverted: 'about $1,650' });
    assert.match(up, /^Australia changed its currency in 1966: 1 unit of the old money became 2 units of the new\./);
    close(pounds.value, 3300);
    assert.equal(pounds.headline, 'about $3,300');
    assert.deepEqual(pounds.sentences, ['In Australia, 1,000 in the money of 1964, at that year’s average prices, bought what about $3,300 bought at average prices in 1967.', up, RISE_3, LATEST(1967), START(1964)]);
    assert.equal(pounds.announceMore, up);
    samePoints(pounds.points, [[1964, 2000], [1965, 2200], [1966, 2640], [1967, 3300]]);
  });

  it('counts a change that comes after the figures end: the answer is in the money that came later', () => {
    // Bulgaria took the euro in 2026 at 1.95583 leva: 1,650 leva = 843.63 euros.
    const a2 = past(BGR, rising(2020), 1000, 2020);
    close(a2.value, 1650 / 1.95583);
    assert.equal(a2.headline, 'about €844');
    assert.deepEqual(a2.sentences, [
      'In Bulgaria, 1,000 in the money of 2020, at that year’s average prices, bought what about €844 bought at average prices in 2023.',
      format(r.currencyChanged, { country: 'Bulgaria', year: 2026, ratio: '1.95583', from: 2020, unconverted: 'about €1,650' }),
      RISE_3,
      LATEST(2023),
      START(2020),
    ]);
  });
});

describe('a history that crosses several changes of currency', () => {
  it('multiplies the changes, crossed ones first, and lists their years', () => {
    // Bulgaria from 1998: 1,000 old leva for a new one in 1999, then 1.95583 for a euro: 1,955.83 in all.
    const a = past(BGR, rising(1998), 1000, 1998);
    const more = format(r.currencyChangedMore, { country: 'Bulgaria', years: '1999, 2026', ratio: '1,955.83', from: 1998, unconverted: 'about €1,650' });
    assert.match(more, /^Bulgaria changed its currency more than once after 1998 \(1999, 2026\): in all, 1,955\.83 units of the 1998 money became 1 unit of today's\./);
    close(a.value, 1650 / 1955.83);
    assert.equal(a.headline, 'about €1');
    assert.deepEqual(a.sentences, ['In Bulgaria, 1,000 in the money of 1998, at that year’s average prices, bought what about €1 bought at average prices in 2001.', more, RISE_3, LATEST(2001), START(1998)]);
    assert.equal(a.announceMore, more);
    samePoints(a.points, [[1998, 1000 / 1955.83], [1999, 1100 / 1955.83], [2000, 1320 / 1955.83], [2001, 1650 / 1955.83]]);
  });
});

describe('a starting year in which both monies were in use (#619)', () => {
  it('reads the amount as the new money and gives the other reading, for a change that struck zeros off', () => {
    // Ecuador, 13 March 2000, 25,000 sucres to the dollar: 50,000,000 x 1.65 = 82,500,000; as sucres, 3,300.
    const a = past(ECU, rising(2000, 50), 5e7, 2000);
    const mixed = format(r.mixedYear, { country: 'Ecuador', changeDate: 'on 13 March 2000', ratio: '25,000', oldResult: 'about $3,300', year: 2000 });
    assert.match(mixed, /^Ecuador changed its currency on 13 March 2000: 25,000 old units became 1 new unit\. .* the answer is about \$3,300\. The price figure for 2000 /);
    close(a.value, 82_500_000);
    assert.deepEqual(a.sentences, ['In Ecuador, $50,000,000 at average prices in 2000 bought what about $82,500,000 bought at average prices in 2003.', mixed, RISE_3, LATEST(2003), START(2000)]);
    assert.equal(a.announceMore, mixed);
    assert.equal(a.chartTitle, 'What $50,000,000 is worth each year since');
    samePoints(a.points, [[2000, 5e7], [2001, 5.5e7], [2002, 6.6e7], [2003, 8.25e7]]);
  });

  it('says it the other way round for a change that made more units, not fewer', () => {
    // Australia, 14 February 1966: from 1966 only the 25% of 1967 counts. 1,250 dollars; as pounds, 2,500.
    const a = past(AUS, rising(1964), 1000, 1966);
    const mixed = format(r.mixedYearUp, { country: 'Australia', changeDate: 'on 14 February 1966', ratio: '2', oldResult: 'about $2,500', year: 1966 });
    assert.match(mixed, /^Australia changed its currency on 14 February 1966: 1 old unit became 2 new units\./);
    close(a.value, 1250);
    assert.deepEqual(a.sentences, ['In Australia, $1,000 at average prices in 1966 bought what about $1,250 bought at average prices in 1967.', mixed, 'Prices rose about 25% in that one year.', LATEST(1967), START(1966)]);
    assert.equal(a.announceMore, mixed);
  });

  it('comes before the note on later changes, and both are announced, in that order', () => {
    // Brazil from 1989: mixed in 1989 (1,000 to 1), then 1993 (1,000) and 1994 (2,750): 2,750,000 in all.
    // 2,000,000,000,000 x 1.65 = 3,300,000,000,000; / 2,750,000 = 1,200,000; the other reading / 1,000 = 1,200.
    const series: Series = { 1989: 1000, 1990: 10, 1991: 20, 1992: 25, 1993: 0, 1994: 0, 1995: 0 };
    const a = past(BRA, series, 2e12, 1989);
    const mixed = format(r.mixedYear, { country: 'Brazil', changeDate: 'on 16 January 1989', ratio: '1,000', oldResult: 'about R$ 1,200', year: 1989 });
    const more = format(r.currencyChangedMore, { country: 'Brazil', years: '1993, 1994', ratio: '2,750,000', from: 1989, unconverted: 'about R$ 3,300,000,000,000' });
    close(a.value, 1_200_000);
    assert.equal(a.headline, 'about R$ 1,200,000');
    assert.deepEqual(a.sentences, [
      'In Brazil, 2,000,000,000,000 in the money of 1989, at that year’s average prices, bought what about R$ 1,200,000 bought at average prices in 1995.',
      mixed,
      more,
      // 1.65^(1/6) = 1.0870
      'Prices rose about 65% in total over those 6 years, an average of 8.7% a year.',
      LATEST(1995),
      START(1989),
    ]);
    assert.equal(a.announceMore, `${mixed} ${more}`);
  });

  it('for a change filed under the next year, reads the amount as the old money and says the figure is a yearly average', () => {
    // Indonesia: decreed 13 December 1965, prices in the new rupiah from 1966, 1,000 to 1.
    const a = past(IDN, rising(1965, 300), 2e6, 1965);
    const changed = format(r.currencyChanged, { country: 'Indonesia', year: 1966, ratio: '1,000', from: 1965, unconverted: 'about Rp 3,300,000' });
    const before = 'The change came on 13 December 1965, and the price figure for 1965 is an average for the whole year, so for an amount from one month the answer is approximate.';
    close(a.value, 3300);
    assert.deepEqual(a.sentences, ['In Indonesia, 2,000,000 in the money of 1965, at that year’s average prices, bought what about Rp 3,300 bought at average prices in 1968.', changed, before, RISE_3, LATEST(1968), START(1965)]);
    assert.equal(a.announceMore, `${changed} ${before}`);
  });

  it('has no note the year after', () => {
    // From 1966 the rises of 1967 and 1968 count: 1.2 x 1.25 = 1.5.
    const a = past(IDN, rising(1965, 300), 1000, 1966);
    assert.equal(a.sentences.length, 4);
    assert.deepEqual(a.sentences.slice(2), [LATEST(1968), START(1966)]);
    assert.equal(a.sentences[0], 'In Indonesia, Rp 1,000 at average prices in 1966 bought what about Rp 1,500 bought at average prices in 1968.');
    assert.ok(a.announceMore === undefined);
  });
});

describe('the euro area as a whole', () => {
  // 1998 to 2003: rises of 10%, 20%, 25%, then two flat years. 1.65 over 5 years is 10.5% a year.
  const series: Series = { 1997: 1, 1998: 2, 1999: 10, 2000: 20, 2001: 25, 2002: 0, 2003: 0 };
  const RISE_5 = 'Prices rose about 65% in total over those 5 years, an average of 10.5% a year.';

  it('before 1999, shows the typed number as a plain amount and says the euro did not yet exist', () => {
    const a = past(EMU, series, 1000, 1998);
    const note = format(r.euroBefore1999, { from: 1998 });
    assert.match(note, /^The euro did not yet exist in 1998\./);
    close(a.value, 1650);
    assert.equal(a.headline, 'about €1,650');
    assert.deepEqual(a.sentences, ['In the euro area, 1,000 at average prices in 1998 bought what about €1,650 bought at average prices in 2003.', note, RISE_5, LATEST(2003), START(1998)]);
    assert.equal(a.announceMore, note);
    assert.equal(a.chartTitle, 'What 1,000 is worth each year since');
    samePoints(a.points, [[1998, 1000], [1999, 1100], [2000, 1320], [2001, 1650], [2002, 1650], [2003, 1650]]);
  });

  it('from 1999 to 2001, says the euro existed but not yet as notes and coins', () => {
    for (const [from, result, rise] of [
      // From 1999: 1.2 x 1.25 = 1.5 over 4 years, 10.7% a year. From 2001: flat for 2 years.
      [1999, '€1,500', 'Prices rose about 50% in total over those 4 years, an average of 10.7% a year.'],
      [2001, '€1,000', 'Prices changed by less than 0.5% in total over those 2 years.'],
    ] as const) {
      const a = past(EMU, series, 1000, from);
      const note = format(r.euro1999to2001, { from });
      assert.match(note, new RegExp(`^The euro existed for accounting and electronic payments in ${from}; euro notes and coins entered circulation in 2002\\.`));
      assert.deepEqual(a.sentences, [`In the euro area, 1,000 at average prices in ${from} bought what about ${result} bought at average prices in 2003.`, note, rise, LATEST(2003), START(from)]);
      assert.equal(a.announceMore, note);
    }
  });

  it('from 2002, the amount is euros and there is no note', () => {
    const a = past(EMU, series, 1000, 2002);
    assert.deepEqual(a.sentences, ['In the euro area, €1,000 at average prices in 2002 bought what about €1,000 bought at average prices in 2003.', 'Prices changed by less than 0.5% in that one year.', LATEST(2003), START(2002)]);
    assert.ok(a.announceMore === undefined);
    assert.equal(a.chartTitle, 'What €1,000 is worth each year since');
  });

  it('in another currency, keeps that currency’s symbol and adds no note', () => {
    const a = past(EMU, series, 1000, 1998, 'USD');
    assert.deepEqual(a.sentences, ['In the euro area, $1,000 at average prices in 1998 bought what about $1,650 bought at average prices in 2003.', RISE_5, LATEST(2003), START(1998)]);
    assert.ok(a.announceMore === undefined);
    assert.equal(a.chartTitle, 'What $1,000 is worth each year since');
  });

  it('a member country before euro cash gets its own changeover note, not the euro area’s', () => {
    // Bulgaria is not the euro area: its 1998 answer carries the currency note only (above), never "the euro did not yet exist".
    const a = past(BGR, rising(1998), 1000, 1998);
    assert.ok(!a.sentences.some((s) => s.startsWith('The euro ')));
    assert.ok(a.sentences[0].startsWith('In Bulgaria, '));
  });
});

describe('keeping up with inflation', () => {
  // A 5% raise against 3% inflation: 1.05 / 1.03 - 1 = 1.9417...% a year, not the shortcut's 2%.
  const a = answerOf(state({ mode: 'keep', growth: 5, rate: 3, years: 10 }));

  it('gives the exact real rate, signed, as the headline and the number', () => {
    assert.equal(a.headline, '+1.94% a year');
    close(a.value, (1.05 / 1.03 - 1) * 100);
  });

  it('says buying power grows, what the amount buys after the years, and why the shortcut is off', () => {
    // 1,000 x (1.05 / 1.03)^10 = 1,212.1, said as 1,210.
    assert.deepEqual(a.sentences, [
      'With a raise or return of 5% a year and inflation averaging 3%, buying power grows about 1.94% a year.',
      'After 10 years, €1,000 growing at 5% a year buys what about €1,210 buys today.',
      'Worked out exactly: (1 + 5%) ÷ (1 + 3%) − 1. Subtracting one rate from the other (5% − 3% = 2%) is a common shortcut, close at low rates and far off at high ones.',
    ]);
  });

  it('compares the real rate one point of inflation either side', () => {
    // 1.05 / 1.02 - 1 = 2.94%; 1.05 / 1.04 - 1 = 0.96%.
    assert.deepEqual(a.band, ['At 2% inflation: +2.94% a year', 'At 4% inflation: +0.96% a year']);
    assert.deepEqual(answerOf(state({ mode: 'keep', growth: 5, rate: 0 })).band, ['At 1% inflation: +3.96% a year']);
  });

  it('draws what the amount buys each year, in today’s money', () => {
    assert.equal(a.points.length, 11);
    samePoints(a.points.slice(0, 3), [[0, 1000], [1, 1000 * (1.05 / 1.03)], [2, 1000 * (1.05 / 1.03) ** 2]]);
    close(a.points[10].value, 1000 * Math.pow(1.05 / 1.03, 10));
    assert.equal(a.points[10].x, 10);
    assert.equal(a.calendar, false);
    assert.equal(a.chartTitle, "What €1,000 buys each year, in today's money");
    assert.equal(a.axis, 'Years from now');
    assert.equal(a.method, METHOD);
    assert.ok(a.announceMore === undefined);
  });

  it('says buying power shrinks when inflation outruns the raise, with the size unsigned in the sentence', () => {
    // 1.02 / 1.04 - 1 = -1.923%; over 2 years 1,000 x (1.02 / 1.04)^2 = 961.9.
    const less = answerOf(state({ mode: 'keep', growth: 2, rate: 4 }));
    assert.equal(less.headline, '−1.92% a year');
    close(less.value, (1.02 / 1.04 - 1) * 100);
    assert.deepEqual(less.sentences.slice(0, 2), [
      'With a raise or return of 2% a year and inflation averaging 4%, buying power shrinks about 1.92% a year.',
      'After 2 years, €1,000 growing at 2% a year buys what about €962 buys today.',
    ]);
    assert.match(less.sentences[2], /\(2% − 4% = −2%\)/);
    // 1.02 / 1.03 - 1 = -0.97%; 1.02 / 1.05 - 1 = -2.86%.
    assert.deepEqual(less.band, ['At 3% inflation: −0.97% a year', 'At 5% inflation: −2.86% a year']);
  });

  it('a pay cut is a negative raise, in every place it is named', () => {
    // 0.975 / 1.03 - 1 = -5.34%.
    const cut = answerOf(state({ mode: 'keep', growth: -2.5, rate: 3 }));
    assert.equal(cut.headline, '−5.34% a year');
    assert.equal(cut.sentences[0], 'With a raise or return of −2.5% a year and inflation averaging 3%, buying power shrinks about 5.34% a year.');
    assert.match(cut.sentences[2], /\(1 \+ −2\.5%\) ÷ \(1 \+ 3%\) − 1\. .*\(−2\.5% − 3% = −5\.5%\)/);
  });

  it('says buying power stays the same when the two rates match, and gives exactly zero', () => {
    const same = answerOf(state({ mode: 'keep', growth: 3, rate: 3 }));
    assert.equal(same.headline, '0% a year');
    assert.equal(same.value, 0);
    assert.equal(same.sentences[0], 'With a raise or return of 3% a year and inflation averaging 3%, buying power stays about the same.');
    assert.equal(same.sentences[1], 'After 2 years, €1,000 growing at 3% a year buys what about €1,000 buys today.');
  });

  it('treats a difference too small to show (under 0.005 of a point) as the same, either way', () => {
    // 1.03004 / 1.03 - 1 = 0.0039%; 1.02996 / 1.03 - 1 = -0.0039%.
    for (const growth of [3.004, 2.996]) {
      const near = answerOf(state({ mode: 'keep', growth, rate: 3 }));
      assert.equal(near.headline, '0% a year', String(growth));
      assert.equal(near.value, 0, String(growth));
      assert.match(near.sentences[0], /buying power stays about the same\.$/);
    }
  });

  it('from 0.005 of a point up it is a rise or a fall again', () => {
    // 1.0301 / 1.03 - 1 = 0.0097%; 1.0299 / 1.03 - 1 = -0.0097%.
    const up = answerOf(state({ mode: 'keep', growth: 3.01, rate: 3 }));
    assert.equal(up.headline, '+0.01% a year');
    close(up.value, (1.0301 / 1.03 - 1) * 100);
    assert.match(up.sentences[0], /buying power grows about 0\.01% a year\.$/);
    const down = answerOf(state({ mode: 'keep', growth: 2.99, rate: 3 }));
    assert.equal(down.headline, '−0.01% a year');
    close(down.value, (1.0299 / 1.03 - 1) * 100);
    assert.match(down.sentences[0], /buying power shrinks about 0\.01% a year\.$/);
  });
});

describe('an answer that ends at a month, where the country has one to join', () => {
  // The 10%, 20%, 25% series ends in 2022; the monthly index stands 10% above the 2022 average in March 2023.
  // 1,000 x 1.65 x 1.1 = 1,815, and 1.815 is 82% (81.5 rounded) above the start.
  const END: MonthlyJoin = { month: '2023-03', factor: 1.1, source: 'bis' };
  const joined = (country: CountryOption, series: Series, amount: number, from: number | null, join: MonthlyJoin | null, currency = country.currency ?? 'EUR', numberLocale = 'en') => {
    const a = computeAnswer(state({ mode: 'past', currency, amount, from }), en, country, series, 'ready', numberLocale, null, join);
    assert.ok(a !== 'loading');
    return a;
  };
  const JOIN_NOTE = (to: number, source: 'bis' | 'worldBank' = 'bis') => format(r.joinNote, { to, source: r.monthlySource[source] });
  const a = joined(USA, rising(2019), 1000, 2019, END);

  it('goes one step past the last year: the yearly result times the month’s step', () => {
    assert.equal(a.headline, 'about $1,820');
    close(a.value, 1815);
    assert.equal(a.sentences[0], 'In United States, $1,000 at average prices in 2019 bought what about $1,820 bought at prices in March 2023.');
  });

  it('says the whole change to the month, the yearly average over full years only, the step since, the two sources, and the start', () => {
    assert.deepEqual(a.sentences.slice(1), [
      'Prices were about 82% higher in March 2023 than on average in 2019.',
      'From 2019 to 2022, they rose 18.2% a year on average.',
      'Prices were 10% higher in March 2023 than on average in 2022.',
      START(2019),
    ]);
    // Which sources are joined is method: it follows the method line, not the answer's sentences.
    assert.deepEqual(a.methodNotes, [JOIN_NOTE(2022)]);
    assert.equal(JOIN_NOTE(2022), 'Two sets of figures are joined here: the World Bank’s yearly inflation up to 2022, then the monthly consumer price index published by the BIS, for the step from the 2022 average to the latest month with a figure here. One month includes seasonal ups and downs and may be revised later. A monthly index reading is not an official yearly inflation rate.');
    // The note names the index the month came from.
    const other = joined(USA, rising(2019), 1000, 2019, { month: '2023-03', factor: 1.1, source: 'worldBank' });
    assert.deepEqual(other.methodNotes, [JOIN_NOTE(2022, 'worldBank')]);
    assert.match(JOIN_NOTE(2022, 'worldBank'), /then the World Bank’s monthly consumer price index \(Global Economic Monitor\), for the step/);
    assert.equal(other.monthPoint?.source, 'worldBank');
    assert.equal(a.monthPoint?.source, 'bis');
    assert.equal(a.method, METHOD_HISTORY);
    assert.deepEqual(a.band, []);
    assert.ok(a.announceMore === undefined);
  });

  it('keeps the chart’s yearly points as they were, and adds the month as a point of its own', () => {
    samePoints(a.points, [[2019, 1000], [2020, 1100], [2021, 1320], [2022, 1650]]);
    assert.equal(a.monthPoint?.month, '2023-03');
    // March is three and a half months before the middle of its year: 2023 - 3.5 / 12.
    close(a.monthPoint!.x, 2023 - 3.5 / 12);
    close(a.monthPoint!.value, 1815);
    assert.equal(a.calendar, true);
  });

  it('places a month on the year axis by the middle of its year', () => {
    close(monthOnYearAxis('2026-01'), 2026 - 5.5 / 12);
    close(monthOnYearAxis('2026-06'), 2026 - 0.5 / 12);
    close(monthOnYearAxis('2026-07'), 2026 + 0.5 / 12);
    close(monthOnYearAxis('2026-09'), 2026 + 2.5 / 12);
    close(monthOnYearAxis('2026-12'), 2026 + 5.5 / 12);
    close(monthOnYearAxis('1999-10'), 1999 + 3.5 / 12);
  });

  it('names every month, in the words a change of currency’s month is given in', () => {
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    names.forEach((name, i) => {
      const month = `2024-${String(i + 1).padStart(2, '0')}`;
      assert.equal(joined(USA, rising(2019), 1000, 2019, { month, factor: 1.1, source: 'bis' }).sentences[0], `In United States, $1,000 at average prices in 2019 bought what about $1,820 bought at prices in ${name} 2024.`);
    });
    // In Czech the month takes the form that follows "v".
    const czech = computeAnswer(state({ mode: 'past', currency: 'USD', from: 2019 }), cs, USA, rising(2019), 'ready', 'cs', null, { month: '2023-01', factor: 1.1, source: 'bis' });
    assert.ok(czech !== 'loading');
    assert.match(czech.sentences[0], /při cenách v\u00a0lednu 2023\.$/);
  });

  it('over one full year, leaves the yearly average out: it is that year’s own change', () => {
    const late = joined(USA, rising(2019), 1000, 2021, END);
    // 1,000 x 1.25 x 1.1 = 1,375, 37.5% above the start.
    close(late.value, 1375);
    assert.deepEqual(late.sentences, [
      'In United States, $1,000 at average prices in 2021 bought what about $1,380 bought at prices in March 2023.',
      'Prices were about 38% higher in March 2023 than on average in 2021.',
      'Prices were 10% higher in March 2023 than on average in 2022.',
      START(2021),
    ]);
    assert.deepEqual(late.methodNotes, [JOIN_NOTE(2022)]);
    samePoints(late.points, [[2021, 1000], [2022, 1250]]);
    close(late.monthPoint!.value, 1375);
  });

  it('says a fall as a fall, in each of the three lines on its own', () => {
    // The years fell (0.9 x 0.8 = 0.72, 15.1% a year) and the month is 5% under the last year's average: 0.72 x 0.95 = 0.684.
    const fall = joined(USA, { 2020: 1, 2021: -10, 2022: -20 }, 1000, 2020, { month: '2023-03', factor: 0.95, source: 'bis' });
    close(fall.value, 684);
    assert.deepEqual(fall.sentences.slice(1, 4), [
      'Prices were about 32% lower in March 2023 than on average in 2020.',
      'From 2020 to 2022, they fell 15.1% a year on average.',
      'Prices were 5% lower in March 2023 than on average in 2022.',
    ]);
    // The years rose and the month is under the last year's average: 1.65 x 0.4 = 0.66, lower overall.
    const mixed = joined(USA, rising(2019), 1000, 2019, { month: '2023-03', factor: 0.4, source: 'bis' });
    assert.deepEqual(mixed.sentences.slice(1, 4), [
      'Prices were about 34% lower in March 2023 than on average in 2019.',
      'From 2019 to 2022, they rose 18.2% a year on average.',
      'Prices were 60% lower in March 2023 than on average in 2022.',
    ]);
    // The years fell and the month is above the last year's average: 0.72 x 1.5 = 1.08, higher overall.
    const back = joined(USA, { 2020: 1, 2021: -10, 2022: -20 }, 1000, 2020, { month: '2023-03', factor: 1.5, source: 'bis' });
    assert.deepEqual(back.sentences.slice(1, 4), [
      'Prices were about 8% higher in March 2023 than on average in 2020.',
      'From 2020 to 2022, they fell 15.1% a year on average.',
      'Prices were 50% higher in March 2023 than on average in 2022.',
    ]);
  });

  it('a month level with the last year’s average is said as neither higher nor lower (#888), and a tenth of a percent is kept', () => {
    const level = joined(USA, rising(2019), 1000, 2019, { month: '2023-03', factor: 1, source: 'bis' });
    assert.equal(level.sentences[3], 'Prices in March 2023 were within 0.05% of their average in 2022.');
    close(level.value, 1650);
    const tenth = joined(USA, rising(2019), 1000, 2019, { month: '2023-03', factor: 1.0263, source: 'bis' });
    assert.equal(tenth.sentences[3], 'Prices were 2.6% higher in March 2023 than on average in 2022.');
  });

  it('a line whose change is written as 0% claims neither a rise nor a fall, each of the three on its own (#888)', () => {
    const lines = (series: Series, factor: number) => joined(USA, series, 1000, 2020, { month: '2023-03', factor, source: 'bis' }).sentences.slice(1, 4);
    const TOTAL = 'Prices in March 2023 were within 0.5% of their average in 2020.';
    const AVERAGE = 'From 2020 to 2022, they changed by less than 0.05% a year on average.';
    const MORE = 'Prices in March 2023 were within 0.05% of their average in 2022.';
    // 1.001 x 1.001 x 1.0002 = 1.0022: 0.22% in all, 0.1% a year, 0.02% since the last year.
    assert.deepEqual(lines({ 2020: 1, 2021: 0.1, 2022: 0.1 }, 1.0002), [TOTAL, 'From 2020 to 2022, they rose 0.1% a year on average.', MORE]);
    // The same downwards: 0.999 x 0.999 x 0.9998 = 0.9978.
    assert.deepEqual(lines({ 2020: 1, 2021: -0.1, 2022: -0.1 }, 0.9998), [TOTAL, 'From 2020 to 2022, they fell 0.1% a year on average.', MORE]);
    // 0.02% a year for two years, then a month 10% up: only the yearly average rounds to nothing.
    assert.deepEqual(lines({ 2020: 1, 2021: 0.02, 2022: 0.02 }, 1.1), ['Prices were about 10% higher in March 2023 than on average in 2020.', AVERAGE, 'Prices were 10% higher in March 2023 than on average in 2022.']);
    assert.deepEqual(lines({ 2020: 1, 2021: -0.02, 2022: -0.02 }, 0.9), ['Prices were about 10% lower in March 2023 than on average in 2020.', AVERAGE, 'Prices were 10% lower in March 2023 than on average in 2022.']);
    // Nothing moved at all.
    assert.deepEqual(lines({ 2020: 1, 2021: 0, 2022: 0 }, 1), [TOTAL, AVERAGE, MORE]);
    // From half of the last digit shown, it is a rise or a fall again: 0.6% in all, 0.06% a year, 0.06% since.
    assert.deepEqual(lines({ 2020: 1, 2021: 0.06, 2022: 0.06 }, 1.0048), ['Prices were about 1% higher in March 2023 than on average in 2020.', 'From 2020 to 2022, they rose 0.1% a year on average.', 'Prices were 0.5% higher in March 2023 than on average in 2022.']);
    assert.deepEqual(lines({ 2020: 1, 2021: -0.06, 2022: -0.06 }, 0.9994), ['Prices in March 2023 were within 0.5% of their average in 2020.', 'From 2020 to 2022, they fell 0.1% a year on average.', 'Prices were 0.1% lower in March 2023 than on average in 2022.']);
    assert.deepEqual(lines({ 2020: 1, 2021: 0, 2022: 0 }, 1.0006), [TOTAL, AVERAGE, 'Prices were 0.1% higher in March 2023 than on average in 2022.']);
    assert.deepEqual(lines({ 2020: 1, 2021: 0, 2022: 0 }, 0.994), ['Prices were about 1% lower in March 2023 than on average in 2020.', AVERAGE, 'Prices were 0.6% lower in March 2023 than on average in 2022.']);
    // Over one full year there is no yearly average line, and the two that remain are judged the same way.
    assert.deepEqual(joined(USA, { 2021: 1, 2022: 0.1 }, 1000, 2021, { month: '2023-03', factor: 0.9999, source: 'bis' }).sentences.slice(1, 3), [
      'Prices in March 2023 were within 0.5% of their average in 2021.',
      'Prices in March 2023 were within 0.05% of their average in 2022.',
    ]);
    // The limit is written the page's way.
    assert.deepEqual(
      joined(USA, { 2020: 1, 2021: 0, 2022: 0 }, 1000, 2020, { month: '2023-03', factor: 1, source: 'bis' }, 'USD', 'cs').sentences.slice(1, 4),
      ['Prices in March 2023 were within 0,5\u00a0% of their average in 2020.', 'From 2020 to 2022, they changed by less than 0,05\u00a0% a year on average.', 'Prices in March 2023 were within 0,05\u00a0% of their average in 2022.'],
    );
  });

  it('follows the page’s number style', () => {
    const czech = joined(USA, rising(2019), 1000, 2019, { month: '2023-03', factor: 1.0263, source: 'bis' }, 'USD', 'cs');
    assert.equal(czech.sentences[1], 'Prices were about 69\u00a0% higher in March 2023 than on average in 2019.');
    assert.equal(czech.sentences[2], 'From 2019 to 2022, they rose 18,2\u00a0% a year on average.');
    assert.equal(czech.sentences[3], 'Prices were 2,6\u00a0% higher in March 2023 than on average in 2022.');
  });

  it('across a change of currency, the month’s step is in the answer and in the answer for today’s money', () => {
    // Turkey: 2,000,000,000 x 1.65 x 1.1 = 3,630,000,000 old lira = 3,630 new.
    const t = joined(TUR, rising(2003), 2e9, 2003, { month: '2007-03', factor: 1.1, source: 'bis' });
    const note = format(r.currencyChanged, { country: 'Türkiye', year: 2005, ratio: '1,000,000', from: 2003, unconverted: 'about ₺3,630,000,000' });
    close(t.value, 3630);
    assert.equal(t.headline, 'about ₺3,630');
    assert.deepEqual(t.sentences.slice(0, 2), ['In Türkiye, 2,000,000,000 in the money of 2003, at that year’s average prices, bought what about ₺3,630 bought at prices in March 2007.', note]);
    assert.equal(t.announceMore, note);
    samePoints(t.points, [[2003, 2000], [2004, 2200], [2005, 2640], [2006, 3300]]);
    close(t.monthPoint!.value, 3630);
  });

  it('a month more than a year past the last full year still reads as one step from that year’s average', () => {
    // The yearly figures stop in 2022 and the month is March 2024: the step covers all of 2023 as well.
    const late = joined(USA, rising(2019), 1000, 2019, { month: '2024-03', factor: 1.3, source: 'bis' });
    // 1,000 x 1.65 x 1.3 = 2,145, 114.5% above the start.
    close(late.value, 2145);
    assert.deepEqual(late.sentences.slice(0, 4), [
      'In United States, $1,000 at average prices in 2019 bought what about $2,150 bought at prices in March 2024.',
      'Prices were about 115% higher in March 2024 than on average in 2019.',
      'From 2019 to 2022, they rose 18.2% a year on average.',
      'Prices were 30% higher in March 2024 than on average in 2022.',
    ]);
    assert.deepEqual(late.methodNotes, [JOIN_NOTE(2022)]);
    close(late.monthPoint!.x, 2024 - 3.5 / 12);
  });

  it('an index that repeats a value within each quarter says the month may carry a quarter’s figure, naming the country', () => {
    const quarterly = joined(AUS, rising(2019), 1000, 2019, { month: '2023-03', factor: 1.1, source: 'bis', quarterly: true }, 'AUD');
    assert.deepEqual(quarterly.sentences.slice(3), [
      'Prices were 10% higher in March 2023 than on average in 2022.',
      'For Australia, the index repeats one value within each recent quarter, so the month named here may carry a quarter’s figure.',
      START(2019),
    ]);
    // The country named is the one chosen, whichever it is.
    const nz: CountryOption = { code: 'NZL', name: 'New Zealand', currency: 'NZD' };
    assert.equal(joined(nz, rising(2019), 1000, 2019, { month: '2023-03', factor: 1.1, source: 'bis', quarterly: true }, 'NZD').sentences[4], 'For New Zealand, the index repeats one value within each recent quarter, so the month named here may carry a quarter’s figure.');
    // Without the mark there is no such line.
    assert.equal(a.sentences.some((line) => line.includes('quarter')), false);
  });

  it('the euro area takes its own sentence', () => {
    const e = joined(EMU, { 2010: 1, 2011: 10, 2012: 20, 2013: 25 }, 1000, 2010, { month: '2014-03', factor: 1.1, source: 'bis' });
    assert.equal(e.sentences[0], 'In the euro area, €1,000 at average prices in 2010 bought what about €1,820 bought at prices in March 2014.');
  });
});

describe('a country with a monthly index that is not joined', () => {
  const withheld = (reason: 'mismatch' | 'incomplete' | 'no-later-month' | 'stale' | 'listed') => {
    const a = computeAnswer(state({ mode: 'past', currency: 'USD', amount: 1000, from: 2019 }), en, USA, rising(2019), 'ready', 'en', null, { withheld: reason });
    assert.ok(a !== 'loading');
    return a;
  };
  const MISMATCH = 'A monthly figure is not joined for United States: the monthly index available here does not match this yearly history closely enough.';
  // Said for every way the months fall short: a month of the link year missing, too few years to compare, or nothing after the link year.
  const INCOMPLETE = 'A monthly figure is not joined for United States: the monthly index available here lacks months the join needs (all of 2022, and the years it is compared over), or has no month after 2022.';

  it('keeps the yearly answer whole, and says why there is no month', () => {
    const STALE = 'A monthly figure is not joined for United States: the latest month in the monthly index available here is more than six months old.';
    for (const [reason, why] of [['mismatch', MISMATCH], ['listed', MISMATCH], ['incomplete', INCOMPLETE], ['no-later-month', INCOMPLETE], ['stale', STALE]] as const) {
      const a = withheld(reason);
      close(a.value, 1650);
      assert.equal(a.headline, 'about $1,650');
      assert.deepEqual(a.sentences, ['In United States, $1,000 at average prices in 2019 bought what about $1,650 bought at average prices in 2022.', RISE_3, LATEST(2022), why, START(2019)], reason);
      assert.ok(a.monthPoint === undefined);
      assert.ok(a.methodNotes === undefined);
      samePoints(a.points, [[2019, 1000], [2020, 1100], [2021, 1320], [2022, 1650]]);
    }
  });

  it('a country with no monthly index at all is told only that its last year is the latest', () => {
    const a = computeAnswer(state({ mode: 'past', currency: 'USD', amount: 1000, from: 2019 }), en, USA, rising(2019), 'ready', 'en', null, null);
    assert.ok(a !== 'loading');
    assert.deepEqual(a.sentences, ['In United States, $1,000 at average prices in 2019 bought what about $1,650 bought at average prices in 2022.', RISE_3, LATEST(2022), START(2019)]);
    assert.ok(a.monthPoint === undefined);
  });

  it('a typed-rate question takes no notice of a join', () => {
    const typed = computeAnswer(state({ mode: 'buy' }), en, USA, rising(2019), 'ready', 'en', null, { month: '2023-03', factor: 1.1, source: 'bis' });
    assert.ok(typed !== 'loading');
    assert.deepEqual(typed.sentences, ['If inflation averages 10% a year, €1,000 in 2 years buys what about €826 buys today.']);
    assert.ok(typed.monthPoint === undefined);
    assert.ok(typed.methodNotes === undefined);
  });
});
