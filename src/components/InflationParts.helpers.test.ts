/**
 * The inflation calculator's small pure helpers (#790): how a percentage and a
 * typed amount are written, how a result is said ("about", "more than", "less
 * than"), which starting years a country's history offers and which one is
 * used, the years a history chart covers, its round gridlines, and the date a
 * currency change is given.
 *
 * No browser: these are plain functions of numbers, series and strings.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inflationEn, inflationCs } from '../i18n/strings/tools/inflation.ts';
import {
  aboutText,
  allYears,
  changeDate,
  defaultFrom,
  effectiveFrom,
  fromYearsFor,
  niceScale,
  pct,
  typedAmount,
  yearsPhrase,
} from './InflationCalculator.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { inflation: inflationEn },
  cs: { inflation: inflationCs },
};

const en = TOOL_STRINGS.en.inflation.island;
const cs = TOOL_STRINGS.cs.inflation.island;

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`);

/** Every year from `first` to `last`, each with the same rate. */
const run = (first: number, last: number, rate = 2) => {
  const s: Record<number, number> = {};
  for (let y = first; y <= last; y++) s[y] = rate;
  return s;
};
const range = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

describe('a percentage in the page’s number style', () => {
  it('takes a percent, not a fraction, and shows up to two decimals', () => {
    assert.equal(pct(1.944, 'en'), '1.94%');
    assert.equal(pct(1.946, 'en'), '1.95%');
    assert.equal(pct(3, 'en'), '3%');
    assert.equal(pct(2.5, 'en'), '2.5%');
    assert.equal(pct(12_345.678, 'en'), '12,345.68%');
  });

  it('follows the page’s marks', () => {
    assert.equal(pct(1.944, 'cs'), '1,94 %');
    assert.equal(pct(1.944, 'es'), '1,94 %');
    assert.equal(pct(1.944, 'hi'), '1.94%');
  });

  it('rounds to the decimals asked for', () => {
    assert.equal(pct(64.6, 'en', 0), '65%');
    assert.equal(pct(18.17, 'en', 1), '18.2%');
    assert.equal(pct(18, 'en', 1), '18%');
  });

  it('carries a plus sign only when asked, and never on a zero', () => {
    assert.equal(pct(2, 'en', 2, true), '+2%');
    assert.equal(pct(-2.5, 'en', 2, true), '−2.5%');
    assert.equal(pct(0, 'en', 2, true), '0%');
    assert.equal(pct(0.004, 'en', 2, true), '0%');
    assert.equal(pct(2, 'en', 2), '2%');
    assert.equal(pct(2, 'en', 2, false), '2%');
    assert.equal(pct(-2.5, 'en'), '−2.5%');
  });

  it('writes a fall with the true minus sign the other tools use, in every page style (#888)', () => {
    for (const locale of ['en', 'hi', 'es', 'cs', 'mr']) {
      for (const signed of [false, true]) {
        const text = pct(-2.5, locale, 2, signed);
        assert.ok(text.startsWith('\u2212'), `${locale}: ${text}`);
        assert.ok(!text.includes('-'), `${locale}: ${text}`);
      }
    }
  });

  it('writes a rate that rounds to nothing as 0%, never "-0%" (#888)', () => {
    assert.equal(pct(-0.004, 'en'), '0%');
    assert.equal(pct(-0.04, 'en', 1), '0%');
    assert.equal(pct(-0.4, 'en', 0), '0%');
    assert.equal(pct(-0.004, 'en', 2, true), '0%');
    assert.equal(pct(-0.04, 'cs', 1).replace(/\s/g, ' '), '0 %');
    // The digits shown still decide.
    assert.equal(pct(-0.005, 'en'), '\u22120.01%');
    assert.equal(pct(-0.04, 'en'), '\u22120.04%');
    assert.equal(pct(-0.6, 'en', 0), '\u22121%');
  });
});

describe('the amount as it was typed', () => {
  it('shows cents only where they were typed, two at most', () => {
    assert.equal(typedAmount(1234, 'EUR', null), '€1,234');
    assert.equal(typedAmount(1234.5, 'EUR', null), '€1,234.5');
    assert.equal(typedAmount(1234.567, 'INR', null), '₹1,234.57');
    assert.equal(typedAmount(100_000, 'INR', null), '₹1,00,000');
  });

  it('keeps typed cents in a currency that has none of its own', () => {
    assert.equal(typedAmount(1234.5, 'JPY', null), '¥1,234.5');
  });

  it('is written the currency’s way on a page with no number style of its own', () => {
    assert.equal(typedAmount(1234.5, 'USD', null), '$1,234.5');
    assert.equal(typedAmount(1234.5, 'CZK', null), '1,234.5 Kč');
  });

  it('is written the page’s way, with the short symbol, on a page that has a style', () => {
    assert.equal(typedAmount(1234.5, 'USD', 'es'), '1234,5 $');
    assert.equal(typedAmount(1234.5, 'USD', 'cs'), '1 234,5 $');
    assert.equal(typedAmount(1234.5, 'EUR', 'cs'), '1 234,5 €');
  });
});

describe('a result said in words', () => {
  it('is "about" the amount, to three significant figures, in whole units', () => {
    assert.equal(aboutText(1343.9, 'EUR', en, null), 'about €1,340');
    assert.equal(aboutText(826.446, 'EUR', en, null), 'about €826');
    assert.equal(aboutText(74.4, 'USD', en, null), 'about $74');
    assert.equal(aboutText(9.99e14, 'EUR', en, null), 'about €999,000,000,000,000');
  });

  it('below 10 keeps two significant figures, where whole units said "about €1" for everything from 0.6 to 1.4 (#868)', () => {
    assert.equal(aboutText(0.6, 'EUR', en, null), 'about €0.6');
    assert.equal(aboutText(0.7441, 'EUR', en, null), 'about €0.74');
    assert.equal(aboutText(1, 'EUR', en, null), 'about €1');
    assert.equal(aboutText(1.3439, 'EUR', en, null), 'about €1.3');
    assert.equal(aboutText(1.4, 'EUR', en, null), 'about €1.4');
    assert.equal(aboutText(7.02, 'EUR', en, null), 'about €7');
    assert.equal(aboutText(9.94, 'EUR', en, null), 'about €9.9');
    assert.equal(aboutText(0.07441, 'EUR', en, null), 'about €0.074');
    assert.equal(aboutText(0.3, 'EUR', en, null), 'about €0.3');
    // From 10 up nothing changes: whole units.
    assert.equal(aboutText(9.96, 'EUR', en, null), 'about €10');
    assert.equal(aboutText(10.4, 'EUR', en, null), 'about €10');
    assert.equal(aboutText(13.6, 'EUR', en, null), 'about €14');
  });

  it('is "less than" the smallest amount that can be typed below it, but zero is zero', () => {
    assert.equal(aboutText(0.01, 'EUR', en, null), 'about €0.01');
    assert.equal(aboutText(0.00996, 'EUR', en, null), 'about €0.01');
    assert.equal(aboutText(0.0099, 'EUR', en, null), 'less than €0.01');
    assert.equal(aboutText(0.0001, 'EUR', en, null), 'less than €0.01');
    assert.equal(aboutText(1e-200, 'EUR', en, null), 'less than €0.01');
    assert.equal(aboutText(0, 'EUR', en, null), 'about €0');
  });

  it('a currency with no smaller unit keeps the two figures too: the amount measures buying power', () => {
    assert.equal(aboutText(1.3439, 'JPY', en, null), 'about ¥1.3');
    assert.equal(aboutText(0.7441, 'JPY', en, null), 'about ¥0.74');
    assert.equal(aboutText(0.001, 'JPY', en, null), 'less than ¥0.01');
    assert.equal(aboutText(134.39, 'JPY', en, null), 'about ¥134');
  });

  it('small amounts are written in the page’s number style', () => {
    assert.equal(aboutText(1.3439, 'USD', en, 'cs'), 'about 1,3 $');
    assert.equal(aboutText(0.7441, 'EUR', cs, 'cs'), 'zhruba 0,74 €');
    assert.equal(aboutText(0.7441, 'USD', en, 'es'), 'about 0,74 $');
    assert.equal(aboutText(0.0001, 'USD', en, 'es'), 'less than 0,01 $');
    // The Hindi and Marathi pages write amounts the Indian English way.
    assert.equal(aboutText(1.3439, 'INR', en, 'en-IN'), 'about ₹1.3');
    assert.equal(aboutText(0.07441, 'INR', en, 'en-IN'), 'about ₹0.074');
    assert.equal(aboutText(0.7441, 'CZK', en, null), 'about 0.74 Kč');
  });

  it('is "more than" the ceiling from a thousand million million up, and for a number too large to hold', () => {
    assert.equal(aboutText(1e15, 'EUR', en, null), 'more than €1,000,000,000,000,000');
    assert.equal(aboutText(3e20, 'EUR', en, null), 'more than €1,000,000,000,000,000');
    assert.equal(aboutText(Infinity, 'EUR', en, null), 'more than €1,000,000,000,000,000');
    assert.equal(aboutText(NaN, 'EUR', en, null), 'more than €1,000,000,000,000,000');
  });

  it('uses the page’s words and the page’s amount style', () => {
    assert.equal(aboutText(1343.9, 'EUR', cs, 'cs'), 'zhruba 1 340 €');
    assert.equal(aboutText(0.003, 'USD', en, 'cs'), 'less than 0,01 $');
    assert.equal(aboutText(1e15, 'USD', en, 'cs'), 'more than 1 000 000 000 000 000 $');
    assert.equal(aboutText(0.003, 'USD', en, 'es'), 'less than 0,01 $');
  });
});

describe('a number of years in words', () => {
  it('has a singular and a plural in English', () => {
    assert.equal(yearsPhrase(1, en, 'en'), '1 year');
    assert.equal(yearsPhrase(2, en, 'en'), '2 years');
    assert.equal(yearsPhrase(10, en, 'en'), '10 years');
  });

  it('has three forms in Czech: 1 rok, 2 to 4 roky, 5 and more let', () => {
    assert.equal(yearsPhrase(1, cs, 'cs'), '1 rok');
    assert.equal(yearsPhrase(2, cs, 'cs'), '2 roky');
    assert.equal(yearsPhrase(4, cs, 'cs'), '4 roky');
    assert.equal(yearsPhrase(5, cs, 'cs'), '5 let');
    assert.equal(yearsPhrase(100, cs, 'cs'), '100 let');
  });
});

describe('the starting years a history offers', () => {
  it('are every year of the unbroken run up to the latest, except that last year', () => {
    assert.deepEqual(fromYearsFor(run(2018, 2022)), [2018, 2019, 2020, 2021]);
    assert.deepEqual(fromYearsFor({ 2021: 3, 2022: 4 }), [2021]);
  });

  it('start after the last gap, so no year is skipped', () => {
    assert.deepEqual(fromYearsFor({ 2012: 25, 2013: 10, 2017: 20, 2018: 30, 2019: 5 }), [2017, 2018]);
  });

  it('are none for a single year, an empty history or no history', () => {
    assert.deepEqual(fromYearsFor({ 2022: 4 }), []);
    assert.deepEqual(fromYearsFor({}), []);
    assert.deepEqual(fromYearsFor(null), []);
  });
});

describe('the starting year used', () => {
  it('is ten years before the latest year with a figure by default', () => {
    // Options 2000 to 2023 mean figures up to 2024.
    assert.equal(defaultFrom(range(2000, 2023)), 2014);
    assert.equal(defaultFrom(range(2014, 2023)), 2014);
    assert.equal(defaultFrom(range(2013, 2023)), 2014);
  });

  it('is the earliest the run allows when that is less than ten years back', () => {
    assert.equal(defaultFrom(range(2018, 2023)), 2018);
    assert.equal(defaultFrom([2023]), 2023);
  });

  it('is nothing when there are no starting years', () => {
    assert.equal(defaultFrom([]), null);
    assert.equal(effectiveFrom(2015, []), null);
    assert.equal(effectiveFrom(null, []), null);
  });

  it('is the year chosen when the history offers it, and the default otherwise', () => {
    const options = range(2000, 2023);
    assert.equal(effectiveFrom(2005, options), 2005);
    assert.equal(effectiveFrom(2023, options), 2023);
    assert.equal(effectiveFrom(1999, options), 2014);
    assert.equal(effectiveFrom(2024, options), 2014);
    assert.equal(effectiveFrom(null, options), 2014);
  });
});

describe('the years a history chart covers', () => {
  it('are every calendar year from the first figure to the last, gaps included', () => {
    assert.deepEqual(allYears({ 2012: 25, 2013: 10, 2017: 20 }), [2012, 2013, 2014, 2015, 2016, 2017]);
    assert.deepEqual(allYears({ 2020: 1 }), [2020]);
  });

  it('are none for an empty history', () => {
    assert.deepEqual(allYears({}), []);
  });
});

describe('round gridlines for a chart', () => {
  it('steps by 1, 2, 2.5 or 5 times a power of ten, the smallest that needs no more than five lines', () => {
    // 5 / 5 = 1: steps of 1.
    assert.deepEqual(niceScale(5), { top: 5, step: 1, count: 5 });
    // 8 / 5 = 1.6: steps of 2, four of them.
    assert.deepEqual(niceScale(8), { top: 8, step: 2, count: 4 });
    // 12 / 5 = 2.4: steps of 2.5, five of them, so the top is past the value.
    assert.deepEqual(niceScale(12), { top: 12.5, step: 2.5, count: 5 });
    // 22 / 5 = 4.4: steps of 5.
    assert.deepEqual(niceScale(22), { top: 25, step: 5, count: 5 });
    // 37 / 5 = 7.4: steps of 10, four of them.
    assert.deepEqual(niceScale(37), { top: 40, step: 10, count: 4 });
    assert.deepEqual(niceScale(50), { top: 50, step: 10, count: 5 });
    assert.deepEqual(niceScale(3700), { top: 4000, step: 1000, count: 4 });
  });

  it('works the same below one', () => {
    const { top, step, count } = niceScale(0.37);
    close(step, 0.1);
    assert.equal(count, 4);
    close(top, 0.4);
  });

  it('takes a different largest number of lines', () => {
    // 10 / 4 = 2.5: steps of 2.5, four of them.
    assert.deepEqual(niceScale(10, 4), { top: 10, step: 2.5, count: 4 });
    // 10 / 2 = 5: steps of 5, two of them.
    assert.deepEqual(niceScale(10, 2), { top: 10, step: 5, count: 2 });
    // 10 / 10 = 1: steps of 1, ten of them.
    assert.deepEqual(niceScale(10, 10), { top: 10, step: 1, count: 10 });
  });

  it('adds no empty line for a value a hair over a round one', () => {
    // 0.1 + 0.2 is 0.30000000000000004: three steps of 0.1, not four.
    const { step, count } = niceScale(0.1 + 0.2);
    close(step, 0.1);
    assert.equal(count, 3);
  });

  it('is one line of one for nothing to show: zero, a negative, not a number', () => {
    for (const v of [0, -5, NaN]) assert.deepEqual(niceScale(v), { top: 1, step: 1, count: 1 }, String(v));
  });
});

describe('the date a currency changed, as far as its source gives it', () => {
  it('is a day, a month and a year when all three are known', () => {
    assert.equal(changeDate({ year: 1993, month: 3, day: 5 }, en.results), 'on 5 March 1993');
    assert.equal(changeDate({ year: 1999, month: 12, day: 1 }, en.results), 'on 1 December 1999');
    assert.equal(changeDate({ year: 1989, month: 1, day: 16 }, en.results), 'on 16 January 1989');
  });

  it('is a month and a year without a day', () => {
    assert.equal(changeDate({ year: 1995, month: 7 }, en.results), 'in July 1995');
    assert.equal(changeDate({ year: 1995, month: 1 }, en.results), 'in January 1995');
  });

  it('is the year alone without a month', () => {
    assert.equal(changeDate({ year: 1999 }, en.results), 'during 1999');
    assert.equal(changeDate({ year: 1999, day: 5 }, en.results), 'during 1999');
  });

  it('uses the form of the month each wording needs, in a language that has two', () => {
    assert.equal(changeDate({ year: 1993, month: 3, day: 5 }, cs.results), '5.\u00a0března 1993');
    assert.equal(changeDate({ year: 1993, month: 3 }, cs.results), 'v\u00a0březnu 1993');
    assert.equal(changeDate({ year: 1993 }, cs.results), 'v\u00a0průběhu roku 1993');
  });
});
