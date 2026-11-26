/**
 * The Monte Carlo simulator's spreadsheet and printed report, against a
 * result written by hand, so every row and cell can be stated exactly.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { monteCarloEn } from '../../i18n/strings/tools/monteCarlo.ts';
import { exportEn } from '../../i18n/strings/tools/export.ts';
import { format } from '../../i18n/format.ts';
import { QUOTED_RATES, type SimulationResult } from './math.ts';
import { defaultState, type ToolState } from './url.ts';
import { monteCarloSheets } from './export.ts';
import { monteCarloReport } from './report.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { monteCarlo: monteCarloEn, export: exportEn },
};

const t = TOOL_STRINGS.en;
const island = t.monteCarlo.island;
const common = t.export;
const x = island.export;
const DATE = '2026-11-23';
const PAGE = 'https://nidhi.today/free/monte-carlo-simulator/';

const band = (base: number) => ({ p10: base + 0.4, p25: base + 1000.4, p50: base + 2000.6, p75: base + 3000.5, p90: base + 4000.49 });

/** Two years of saving and one of withdrawing, with figures that round in known ways. */
const RESULT: SimulationResult = {
  years: 3,
  bands: [band(10_000), band(20_000), band(30_000), band(40_000)],
  straightLine: [10_000, 21_000.6, 32_000.4, 43_000.5],
  atRetirement: band(30_000),
  belowStraightLine: 0.61237,
  lasted: 0.87654,
  medianRunOutYear: 7,
  paths: 1_000,
};

const STATE: ToolState = {
  ...defaultState('INR'),
  start: 10_000.4,
  monthly: 999.6,
  saveYears: 2,
  stockPct: 65,
  withdrawal: 12_000.5,
  withdrawYears: 1,
  feePct: 0.25,
  returns: 'cautious',
  paths: 1_000,
};

const sheets = (state: ToolState = STATE, result: SimulationResult = RESULT) =>
  monteCarloSheets({ island, common, state, result, date: DATE, page: PAGE });

const head = (...titles: string[]) => titles.map((title) => ({ t: title, bold: true }));
const amount = (n: number) => ({ n, fmt: 'amount0' });
const whole = (n: number) => ({ n, fmt: 'integer' });
const pct = (n: number) => ({ n, fmt: 'decimal2' });

describe('Monte Carlo spreadsheet', () => {
  it('has five sheets in order, with their names and column widths', () => {
    const all = sheets();
    assert.deepEqual(all.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.assumptions, x.sheets.byYear, x.sheets.outcome]);
    assert.deepEqual(all.map((s) => s.widths), [[22, 90], [34, 18], [48, 18], [10, 16, 16, 16, 16, 16, 16], [56, 18]]);
  });

  it('says what the file is, when and where it was made, and in which currency', () => {
    assert.deepEqual(sheets()[0].rows, [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, DATE],
      [common.about.currency, 'INR'],
      [common.about.page, PAGE],
      [x.moneyLabel, x.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
  });

  it('lists the plan with withdrawals, amounts in whole units', () => {
    assert.deepEqual(sheets()[1].rows, [
      head(common.columns.item, common.columns.value),
      [island.fields.start, amount(10_000)],
      [island.fields.monthly, amount(1_000)],
      [island.fields.saveYears, whole(2)],
      [x.stocks, whole(65)],
      [x.bonds, whole(35)],
      [island.settings.feeLabel, pct(0.25)],
      [x.withdrawals, common.yes],
      [island.withdraw.amountLabel, amount(12_001)],
      [island.withdraw.yearsLabel, whole(1)],
    ]);
  });

  it('lists a plan without withdrawals with no withdrawal rows', () => {
    const rows = sheets({ ...STATE, withdrawal: 0, withdrawYears: 30 })[1].rows;
    assert.equal(rows.length, 8);
    assert.deepEqual(rows[7], [x.withdrawals, common.no]);
  });

  it('states the assumptions, rates as percentages to two places', () => {
    const rates = QUOTED_RATES.cautious;
    assert.deepEqual(sheets()[2].rows, [
      head(common.columns.item, common.columns.value),
      [island.settings.legend, island.returns.cautious],
      [x.stocksGrowth, pct(Math.round(rates.stocks * 10_000) / 100)],
      [x.bondsGrowth, pct(Math.round(rates.bonds * 10_000) / 100)],
      [island.settings.pathsLabel, whole(1_000)],
      [x.rebalanced, island.fields.mixHint],
    ]);
    // The cautious setting runs stocks at 4% and bonds at 1%.
    assert.deepEqual(sheets()[2].rows.slice(2, 4).map((r) => r[1]), [pct(4), pct(1)]);
  });

  it('writes a percentage to two places, not more', () => {
    const outcome = sheets()[4].rows;
    assert.deepEqual(outcome.find((r) => r[0] === x.belowLine), [x.belowLine, pct(61.24)]);
    assert.deepEqual(outcome.find((r) => r[0] === x.lasted), [x.lasted, pct(87.65)]);
  });

  it('holds every year, rounded to whole units', () => {
    const rows = sheets()[3].rows;
    assert.deepEqual(rows[0], head(island.results.tableYear, island.results.tableLow, x.p25, island.results.tableMedian, x.p75, island.results.tableHigh, island.results.tableStraight));
    assert.deepEqual(rows[2], [whole(1), amount(20_000), amount(21_000), amount(22_001), amount(23_001), amount(24_000), amount(21_001)]);
    assert.equal(rows.length, 5);
  });

  it('gives the outcome at the end of saving and of withdrawing', () => {
    assert.deepEqual(sheets()[4].rows, [
      head(common.columns.item, common.columns.value),
      [x.atEndOfSaving, null],
      [island.results.tableLow, amount(30_000)],
      [island.results.tableMedian, amount(32_001)],
      [island.results.tableHigh, amount(34_000)],
      [x.belowLine, pct(61.24)],
      [x.lasted, pct(87.65)],
      [x.runOut, whole(7)],
      [x.sharesNote, format(island.results.caveat, { paths: '1000' })],
    ]);
  });

  it('leaves out the year money runs out when no path ran out', () => {
    const rows = sheets(STATE, { ...RESULT, lasted: 1, medianRunOutYear: null })[4].rows;
    assert.deepEqual(rows.map((r) => r[0]), [common.columns.item, x.atEndOfSaving, island.results.tableLow, island.results.tableMedian, island.results.tableHigh, x.belowLine, x.lasted, x.sharesNote].map((label, i) => (i === 0 ? { t: label, bold: true } : label)));
  });

  it('leaves out every withdrawal outcome for a plan without withdrawals', () => {
    const rows = sheets({ ...STATE, withdrawal: 0 }, { ...RESULT, lasted: null, medianRunOutYear: null })[4].rows;
    assert.deepEqual(rows.slice(5).map((r) => r[0]), [x.belowLine, x.sharesNote]);
  });

  it('leaves out the withdrawal outcome when the result has none, even with a withdrawal', () => {
    const rows = sheets(STATE, { ...RESULT, lasted: null, medianRunOutYear: 4 })[4].rows;
    assert.deepEqual(rows.slice(5).map((r) => r[0]), [x.belowLine, x.sharesNote]);
  });

  it('a result with withdrawals but no withdrawal in the plan gives no withdrawal outcome', () => {
    const rows = sheets({ ...STATE, withdrawal: 0 }, RESULT)[4].rows;
    assert.deepEqual(rows.slice(5).map((r) => r[0]), [x.belowLine, x.sharesNote]);
  });
});

describe('Monte Carlo printed report', () => {
  const report = (state: ToolState = STATE, result: SimulationResult = RESULT) =>
    monteCarloReport({ island, common, state, result, answer: ['the answer'] });

  it('names the tool, the currency and the answer as given', () => {
    const r = report();
    assert.equal(r.tool, x.tool);
    assert.equal(r.currency, 'INR');
    assert.deepEqual(r.answer, ['the answer']);
    assert.equal(r.meaning, x.meaning);
    assert.deepEqual(r.assumptions, []);
  });

  it('prints the plan and the assumptions from the spreadsheet, without its header row', () => {
    const r = report();
    assert.deepEqual(r.entered?.head, [common.columns.item, common.columns.value]);
    assert.deepEqual(r.entered?.rows[0], [island.fields.start, amount(10_000)]);
    assert.equal(r.entered?.rows.length, 9);
    assert.deepEqual(r.assumptionTable?.rows[0], [island.settings.legend, island.returns.cautious]);
  });

  it('prints a short plan as its first and last year, every fifth between', () => {
    const [table] = report().tables;
    assert.equal(table.caption, x.sheets.byYear);
    assert.equal(table.head[0], island.results.tableYear);
    assert.deepEqual(table.rows.map((row) => (row[0] as { n: number }).n), [0, 3]);
    assert.equal(table.note, common.report.sampled);
  });

  it('prints only every fifth year and the last of a long plan, and says so', () => {
    const bands = Array.from({ length: 41 }, (_, y) => band(y * 1_000));
    const long = { ...RESULT, years: 40, bands, straightLine: bands.map((b) => b.p50) };
    const [table] = report({ ...STATE, saveYears: 20, withdrawYears: 20 }, long).tables;
    assert.deepEqual(table.rows.map((row) => (row[0] as { n: number }).n), [0, 5, 10, 15, 20, 25, 30, 35, 40]);
    assert.equal(table.note, common.report.sampled);
  });

  it('draws the fan chart: both bands, the median and the dashed single line, every year', () => {
    const chart = report().chart;
    assert.ok(chart && chart.kind === 'lines');
    assert.equal(chart.title, `${island.chart.title} (INR)`);
    assert.equal(chart.xLabel, island.chart.axisYears);
    const points = (pick: (b: SimulationResult['bands'][number]) => number) => RESULT.bands.map((b, y) => ({ x: y, y: pick(b) }));
    assert.deepEqual(chart.bands, [
      { label: island.chart.legendPaths, lower: points((b) => b.p10), upper: points((b) => b.p90), shade: 0.12 },
      { label: island.chart.legendMiddle, lower: points((b) => b.p25), upper: points((b) => b.p75), shade: 0.28 },
    ]);
    assert.deepEqual(chart.series, [
      { label: island.chart.legendMedian, points: points((b) => b.p50), strong: true },
      { label: island.chart.legendStraight, points: RESULT.straightLine.map((y, i) => ({ x: i, y })), dash: '6 4' },
    ]);
  });

  it('draws no chart for a plan of no years', () => {
    const none = { ...RESULT, years: 0, bands: [band(10_000)], straightLine: [10_000], lasted: null, medianRunOutYear: null };
    assert.equal(report({ ...STATE, saveYears: 0, withdrawal: 0 }, none).chart, null);
  });
});
