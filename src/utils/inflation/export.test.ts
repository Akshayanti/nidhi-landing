/**
 * The inflation calculator's spreadsheet (export.ts), against answers written
 * by hand, so every sheet can be stated cell by cell: what was asked, what was
 * entered, the answer in words and as a number, and the path the chart draws.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { inflationEn } from '../../i18n/strings/tools/inflation.ts';
import { exportEn } from '../../i18n/strings/tools/export.ts';
import { defaultState, type ToolState } from './url.ts';
import { inflationSheets, type InflationAnswer } from './export.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { inflation: inflationEn, export: exportEn },
};

const tools = TOOL_STRINGS.en;
const island = tools.inflation.island;
const common = tools.export;
const x = island.export;
const DATE = '2026-11-24';
const PAGE = 'https://nidhi.today/free/inflation-calculator/';

const head = (...titles: string[]) => titles.map((title) => ({ t: title, bold: true }));
const whole = (n: number) => ({ n, fmt: 'integer' });
const HEADER = head('Item', 'Value');

/** A typed-rate answer whose figures round in known ways at 0, 2 and 3 decimals. */
const ANSWER: InflationAnswer = {
  question: 'Buying power later',
  sentences: ['First sentence.', 'Second sentence.'],
  value: 7440.9391,
  points: [
    { x: 0, value: 10_000.456 },
    { x: 1, value: 9708.7385 },
    { x: 2, value: 9425.9596 },
  ],
  axis: 'Years from now',
  chartTitle: 'What €10,000.46 buys each year, in today’s money',
  history: null,
};

const STATE: ToolState = { ...defaultState('EUR'), mode: 'buy', amount: 10_000.456, rate: 3, years: 2, growth: 4.5 };

const sheets = (state: ToolState = STATE, answer: InflationAnswer = ANSWER, decimals = 2) =>
  inflationSheets({ island, common, state, answer, decimals, date: DATE, page: PAGE });

describe('inflation spreadsheet', () => {
  it('has four sheets in order, with their names and column widths', () => {
    const all = sheets();
    assert.deepEqual(all.map((s) => s.name), ['About', 'Inputs', 'Answer', 'By year']);
    assert.deepEqual(all.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.answer, x.sheets.byYear]);
    assert.deepEqual(all.map((s) => s.widths), [[22, 90], [34, 18], [26, 100], [16, 18]]);
  });

  it('says what the file is, when and where it was made, and in which currency', () => {
    assert.deepEqual(sheets()[0].rows, [
      HEADER,
      [common.about.tool, 'Inflation calculator'],
      [common.about.made, DATE],
      [common.about.currency, 'EUR'],
      [common.about.page, PAGE],
      [x.moneyLabel, x.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
    assert.deepEqual(sheets({ ...STATE, currency: 'INR' })[0].rows[3], [common.about.currency, 'INR']);
  });

  it('lists a typed-rate question: the amount to the cent, the rate and the years', () => {
    assert.deepEqual(sheets()[1].rows, [
      HEADER,
      ['Question', 'Buying power later'],
      ['Amount', { n: 10_000.46, fmt: 'amount2' }],
      ['Inflation, % a year', { n: 3, fmt: 'decimal2' }],
      ['Years from now', whole(2)],
    ]);
  });

  it('labels the amount and the years as each question does', () => {
    const rows = (mode: ToolState['mode']) => sheets({ ...STATE, mode })[1].rows.map((r) => r[0]);
    assert.deepEqual(rows('cost').slice(1), ['Question', 'What it costs today', 'Inflation, % a year', 'Years from now']);
    assert.deepEqual(rows('past').slice(1), ['Question', 'Amount back then', 'Inflation, % a year', 'Years ago']);
    assert.equal(sheets({ ...STATE, mode: 'past' })[1].rows[1][1], 'Past to today');
    assert.equal(sheets({ ...STATE, mode: 'cost' })[1].rows[1][1], 'Cost later');
  });

  it('keeps a rate typed with a third decimal as it was given', () => {
    assert.deepEqual(sheets({ ...STATE, rate: 2.125 })[1].rows[3], ['Inflation, % a year', { n: 2.125, fmt: 'general' }]);
  });

  it('adds the raise or return only for "keeping up"', () => {
    const keep = sheets({ ...STATE, mode: 'keep' })[1].rows;
    assert.deepEqual(keep, [
      HEADER,
      ['Question', 'Keeping up'],
      ['Amount today', { n: 10_000.46, fmt: 'amount2' }],
      ['Inflation, % a year', { n: 3, fmt: 'decimal2' }],
      ['Years', whole(2)],
      ['Raise or return, % a year', { n: 4.5, fmt: 'decimal2' }],
    ]);
    for (const mode of ['buy', 'cost', 'past'] as const) assert.equal(sheets({ ...STATE, mode })[1].rows.length, 5, mode);
  });

  it('with a country, lists the country and the starting year in place of the rate and the years', () => {
    const answer: InflationAnswer = { ...ANSWER, history: { country: 'India', from: 2014, to: 2024 } };
    assert.deepEqual(sheets({ ...STATE, mode: 'past' }, answer)[1].rows, [
      HEADER,
      ['Question', 'Past to today'],
      ['Amount back then', { n: 10_000.46, fmt: 'amount2' }],
      ['Inflation history', 'India'],
      ['Starting year', whole(2014)],
    ]);
  });

  it('gives the answer as the page asks it, as a number and in every sentence', () => {
    assert.deepEqual(sheets()[2].rows, [
      HEADER,
      ['Question', 'Buying power later'],
      ['Result', { n: 7440.94, fmt: 'amount2' }],
      ['In words', 'First sentence.'],
      ['In words', 'Second sentence.'],
    ]);
  });

  it('gives "keeping up" as a percent a year, not as an amount', () => {
    const answer: InflationAnswer = { ...ANSWER, value: 1.4563107 };
    assert.deepEqual(sheets({ ...STATE, mode: 'keep' }, answer, 0)[2].rows[2], ['Buying power, % a year', { n: 1.4563107, fmt: 'decimal2' }]);
    assert.deepEqual(sheets({ ...STATE, mode: 'cost' }, answer, 0)[2].rows[2], ['Result', { n: 1, fmt: 'amount0' }]);
  });

  it('with a country, adds the years used and the source of the figures', () => {
    const answer: InflationAnswer = { ...ANSWER, sentences: ['Only sentence.'], history: { country: 'India', from: 2014, to: 2024 } };
    assert.deepEqual(sheets({ ...STATE, mode: 'past' }, answer)[2].rows, [
      HEADER,
      ['Question', 'Buying power later'],
      ['Result', { n: 7440.94, fmt: 'amount2' }],
      ['In words', 'Only sentence.'],
      ['Years used', '2014 to 2024'],
      ['Source', x.sourceText],
    ]);
    assert.match(x.sourceText, /World Bank/);
  });

  it('lists the chart under its title, one row a point', () => {
    assert.deepEqual(sheets()[3].rows, [
      [{ t: ANSWER.chartTitle, bold: true }],
      head('Years from now', 'Value'),
      [whole(0), { n: 10_000.46, fmt: 'amount2' }],
      [whole(1), { n: 9708.74, fmt: 'amount2' }],
      [whole(2), { n: 9425.96, fmt: 'amount2' }],
    ]);
  });

  it('rounds every amount to the currency’s own smallest unit', () => {
    const yen = sheets(STATE, ANSWER, 0);
    assert.deepEqual(yen[1].rows[2][1], { n: 10_000, fmt: 'amount0' });
    assert.deepEqual(yen[2].rows[2][1], { n: 7441, fmt: 'amount0' });
    assert.deepEqual(yen[3].rows[3], [whole(1), { n: 9709, fmt: 'amount0' }]);
    const dinar = sheets(STATE, ANSWER, 3);
    assert.deepEqual(dinar[1].rows[2][1], { n: 10_000.456, fmt: 'amount3' });
    assert.deepEqual(dinar[2].rows[2][1], { n: 7440.939, fmt: 'amount3' });
    assert.deepEqual(dinar[3].rows[4], [whole(2), { n: 9425.96, fmt: 'amount3' }]);
  });

  it('an answer with no sentences and no points still has its headers', () => {
    const empty = sheets(STATE, { ...ANSWER, sentences: [], points: [] });
    assert.equal(empty[2].rows.length, 3);
    assert.deepEqual(empty[3].rows, [[{ t: ANSWER.chartTitle, bold: true }], head('Years from now', 'Value')]);
  });

  it('an answer that ends at a month names the month, both sources, and gives the month a row of its own', () => {
    const answer: InflationAnswer = {
      ...ANSWER,
      sentences: ['Only sentence.'],
      history: { country: 'Spain', from: 2014, to: 2025 },
      monthEnd: { month: '2026-09', value: 10_500.126, source: 'bis' },
    };
    const out = sheets({ ...STATE, mode: 'past' }, answer);
    assert.deepEqual(out[2].rows, [
      HEADER,
      ['Question', 'Buying power later'],
      ['Result', { n: 7440.94, fmt: 'amount2' }],
      ['In words', 'Only sentence.'],
      ['Years used', '2014 to 2025'],
      ['Ends at month', '2026-09'],
      ['Source', `${x.sourceText} ${x.sourceTextMonthly.bis}`],
    ]);
    assert.equal(x.sourceTextMonthly.bis, 'Months after the last full year: BIS, Consumer prices (monthly index).');
    // The other monthly source is named when the month came from it.
    assert.deepEqual(sheets({ ...STATE, mode: 'past' }, { ...answer, monthEnd: { month: '2026-07', value: 1, source: 'worldBank' } })[2].rows[6], ['Source', `${x.sourceText} Months after the last full year: World Bank, Global Economic Monitor, “CPI Price, not seas. adj.” (CPTOTNSXN), CC BY 4.0.`]);
    assert.deepEqual(out[3].rows, [
      [{ t: ANSWER.chartTitle, bold: true }],
      head('Years from now', 'Value'),
      [whole(0), { n: 10_000.46, fmt: 'amount2' }],
      [whole(1), { n: 9708.74, fmt: 'amount2' }],
      [whole(2), { n: 9425.96, fmt: 'amount2' }],
      ['2026-09', { n: 10_500.13, fmt: 'amount2' }],
      ['The last row is one month, from a monthly consumer price index, not a year’s average.'],
    ]);
    // To the currency's own smallest unit, like every other amount.
    assert.deepEqual(sheets({ ...STATE, mode: 'past' }, answer, 0)[3].rows[5], ['2026-09', { n: 10_500, fmt: 'amount0' }]);
  });

  it('an answer that ends at a year has no month row, and the one source', () => {
    for (const monthEnd of [null, undefined]) {
      const out = sheets({ ...STATE, mode: 'past' }, { ...ANSWER, history: { country: 'India', from: 2014, to: 2024 }, monthEnd });
      assert.deepEqual(out[2].rows.slice(-2), [['Years used', '2014 to 2024'], ['Source', x.sourceText]]);
      assert.equal(out[3].rows.length, 5);
    }
    // A typed-rate answer never has one, whatever it is handed.
    const typed = sheets(STATE, { ...ANSWER, monthEnd: { month: '2026-09', value: 1, source: 'bis' } });
    assert.equal(typed[2].rows.some((row) => row[0] === 'Ends at month'), false);
    assert.equal(typed[2].rows.some((row) => row[0] === 'Source'), false);
  });
});
