/**
 * The invest or pay off calculator's spreadsheet, cell by cell (#790): what
 * was entered, the result, and the range beside the reader's own return.
 * The result is written out by hand, so every cell can be read on paper.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { investOrPayOffEn } from '../../i18n/strings/tools/investOrPayOff.ts';
import { exportEn } from '../../i18n/strings/tools/export.ts';
import type { Inputs, Result } from './math.ts';
import { investOrPayOffSheets, type ShownComparison } from './export.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { investOrPayOff: investOrPayOffEn, export: exportEn },
};

const tools = TOOL_STRINGS.en;
const island = tools.investOrPayOff.island;
const common = tools.export;

const inputs: Inputs = {
  balance: 18_000,
  debtRate: 6.5,
  payment: 400,
  extra: 200,
  relief: 12.5,
  inflation: 2.123,
  returns: 'historical',
  ownReturn: 7,
  feePct: 0.25,
  gainsTax: 15,
  horizon: 'plus5',
};

const result = (over: Partial<Result> = {}): Result => ({
  payoffMonthA: 33,
  payoffMonthB: 52,
  months: 93,
  a: { p10: 100.123, p50: 200.456, p90: 300.789 },
  b: { p10: 50.5, p50: 250.25, p90: 900.994 },
  diff: { p10: -400.4, p50: 100.1, p90: 700.7 },
  bAhead: 0.5416,
  interestA: 1500,
  interestB: 2700,
  interestAvoided: 1200,
  interestAvoidedToday: 1150,
  interestAvoidedTodayAtEnd: 1100,
  remainingB: 0,
  paths: 10_000,
  ...over,
});

const shown = (over: Partial<ShownComparison> = {}): ShownComparison => ({
  inputs,
  result: result(),
  range: null,
  inflationSource: null,
  lines: ['First line.', 'Second line.'],
  ...over,
});

const sheets = (over: Partial<ShownComparison> = {}, decimals = 2) =>
  investOrPayOffSheets({ island, common, currency: 'EUR', shown: shown(over), decimals, date: '2026-11-24', page: 'https://nidhi.today/free/invest-or-pay-off/' });

const bold = (t: string) => ({ t, bold: true });
const eur = (n: number) => ({ n, fmt: 'amount2' });
const whole = (n: number) => ({ n, fmt: 'integer' });

describe('the spreadsheet', () => {
  it('three sheets without the range: about, what was entered, the result', () => {
    const s = sheets();
    assert.deepEqual(s.map((x) => [x.name, x.widths]), [
      [common.sheets.about, [22, 90]],
      [common.sheets.inputs, [40, 60]],
      [island.export.sheets.result, [36, 18, 18, 18]],
    ]);
  });

  it('about: the tool, the date, the currency, the page and the notes', () => {
    assert.deepEqual(sheets()[0].rows, [
      [bold(common.columns.item), bold(common.columns.value)],
      [common.about.tool, island.formLabel],
      [common.about.made, '2026-11-24'],
      [common.about.currency, 'EUR'],
      [common.about.page, 'https://nidhi.today/free/invest-or-pay-off/'],
      [island.export.moneyLabel, island.export.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
  });

  it('what was entered, a typed inflation figure as typed', () => {
    const f = island.fields;
    const x = island.export;
    assert.deepEqual(sheets()[1].rows, [
      [bold(common.columns.item), bold(common.columns.value)],
      [f.balance, eur(18_000)],
      [f.debtRate, { n: 6.5, fmt: 'decimal2' }],
      [f.payment, eur(400)],
      [f.relief, { n: 12.5, fmt: 'decimal2' }],
      [f.extra, eur(200)],
      [x.inflation, { n: 2.123, fmt: 'general' }],
      [x.inflationSource, x.inflationTyped],
      [x.returns, island.returns.historical.label],
      [f.fee, { n: 0.25, fmt: 'decimal2' }],
      [f.gainsTax, { n: 15, fmt: 'decimal2' }],
      [x.horizon, island.horizons.plus5],
    ]);
  });

  it('a figure from the data is shown as the page shows it, with its source; the own return when chosen', () => {
    const rows = sheets({ inputs: { ...inputs, returns: 'own', ownReturn: 9.75, horizon: 'payoff' }, inflationSource: 'World Bank, euro area' })[1].rows;
    const x = island.export;
    assert.deepEqual(rows.slice(6), [
      [x.inflation, { n: 2.123, fmt: 'decimal2' }],
      [x.inflationSource, 'World Bank, euro area'],
      [x.returns, island.returns.own.label],
      [island.fields.ownReturn, { n: 9.75, fmt: 'decimal2' }],
      [island.fields.fee, { n: 0.25, fmt: 'decimal2' }],
      [island.fields.gainsTax, { n: 15, fmt: 'decimal2' }],
      [x.horizon, island.horizons.payoff],
    ]);
  });

  it('the result: both paths and the gap to the currency’s decimals, the counts, the sentences and the method', () => {
    const c = island.export.columns;
    assert.deepEqual(sheets()[2].rows, [
      [bold(c.path), bold(c.p10), bold(c.p50), bold(c.p90)],
      [island.results.payoffPath, eur(100.12), eur(200.46), eur(300.79)],
      [island.results.investPath, eur(50.5), eur(250.25), eur(900.99)],
      [island.export.gapRow, eur(-400.4), eur(100.1), eur(700.7)],
      [],
      [island.export.investAhead, whole(54)],
      [island.export.months, whole(93)],
      [island.export.paths, whole(10_000)],
      ['First line.'],
      ['Second line.'],
      [island.export.method],
    ]);
  });

  it('a currency without minor units is written whole, and one with three keeps three', () => {
    assert.deepEqual(sheets({}, 0)[2].rows[1], [island.results.payoffPath, { n: 100, fmt: 'amount0' }, { n: 200, fmt: 'amount0' }, { n: 301, fmt: 'amount0' }]);
    assert.deepEqual(sheets({}, 3)[2].rows[2], [island.results.investPath, { n: 50.5, fmt: 'amount3' }, { n: 250.25, fmt: 'amount3' }, { n: 900.994, fmt: 'amount3' }]);
  });

  it('the range beside the reader’s own return', () => {
    const cautious = result({ bAhead: 0.314, diff: { p10: -900, p50: -250.255, p90: 300 } });
    const optimistic = result({ bAhead: 0.786, diff: { p10: -100, p50: 600.6, p90: 1500 } });
    const s = sheets({ inputs: { ...inputs, returns: 'own' }, range: { cautious, optimistic } });
    assert.equal(s.length, 4);
    const side = island.results.side;
    assert.deepEqual([s[3].name, s[3].widths], [island.export.sheets.range, [36, 22, 18]]);
    assert.deepEqual(s[3].rows, [
      [bold(side.figure), bold(side.invest), bold(side.gap)],
      [island.returns.own.label, whole(54), eur(100.1)],
      [island.returns.cautious.label, whole(31), eur(-250.25)],
      [island.returns.optimistic.label, whole(79), eur(600.6)],
    ]);
  });
});
