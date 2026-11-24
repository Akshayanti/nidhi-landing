/**
 * The invest or pay off calculator's printed report (#790): the sentences as
 * the page says them, what was entered, a bar for each path's share of the
 * scenarios, the paths and the gap, the range when the page shows it, and
 * the method.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DICTS } from '../../i18n/index.ts';
import type { Inputs, Result } from './math.ts';
import { investOrPayOffSheets } from './export.ts';
import { investOrPayOffReport } from './report.ts';

const tools = DICTS.en.tools;
const island = tools.investOrPayOff.island;
const common = tools.export;

const inputs: Inputs = {
  balance: 18_000, debtRate: 6.5, payment: 400, extra: 200, relief: 0, inflation: 2,
  returns: 'own', ownReturn: 9, feePct: 0, gainsTax: 0, horizon: 'plus5',
};
const result = (over: Partial<Result> = {}): Result => ({
  payoffMonthA: 33, payoffMonthB: 52, months: 93,
  a: { p10: 100, p50: 200, p90: 300 }, b: { p10: 50, p50: 250, p90: 900 }, diff: { p10: -400, p50: 100, p90: 700 },
  bAhead: 0.5416, interestA: 1500, interestB: 2700, interestAvoided: 1200, interestAvoidedToday: 1150, interestAvoidedTodayAtEnd: 1100,
  remainingB: 0, paths: 10_000, ...over,
});

const report = (range: { cautious: Result; optimistic: Result } | null) => investOrPayOffReport({
  island, common, currency: 'EUR', decimals: 2,
  shown: { inputs, result: result(), range, inflationSource: null, lines: ['First line.', 'Second line.'] },
});

describe('the printed report', () => {
  it('says what the page says, with what was entered, the bars and the method', () => {
    const r = report(null);
    assert.equal(r.tool, island.formLabel);
    assert.equal(r.currency, 'EUR');
    assert.deepEqual(r.answer, ['First line.', 'Second line.']);
    assert.equal(r.meaning, island.export.meaning);
    assert.deepEqual(r.assumptions, [island.export.method]);
    assert.deepEqual(r.chart, {
      kind: 'bars',
      title: island.export.investAhead,
      bars: [{ label: island.results.investPath, share: 54 }, { label: island.results.payoffPath, share: 46 }],
    });
    const sheets = investOrPayOffSheets({ island, common, currency: 'EUR', decimals: 2, date: '', page: '', shown: { inputs, result: result(), range: null, inflationSource: null, lines: [] } });
    assert.deepEqual(r.entered?.head, [common.columns.item, common.columns.value]);
    assert.deepEqual(r.entered?.rows, sheets[1].rows.slice(1));
  });

  it('prints the paths and the gap only, without the counts or the sentences', () => {
    const [table, ...rest] = report(null).tables;
    assert.equal(rest.length, 0);
    const c = island.export.columns;
    assert.deepEqual(table.head, [c.path, c.p10, c.p50, c.p90]);
    assert.deepEqual(table.rows.map((row) => row[0]), [island.results.payoffPath, island.results.investPath, island.export.gapRow]);
  });

  it('prints the range when the page shows it', () => {
    const tables = report({ cautious: result({ bAhead: 0.3 }), optimistic: result({ bAhead: 0.8 }) }).tables;
    assert.equal(tables.length, 2);
    const side = island.results.side;
    assert.deepEqual(tables[1].head, [side.figure, side.invest, side.gap]);
    assert.deepEqual(tables[1].rows.map((row) => row[0]), [island.returns.own.label, island.returns.cautious.label, island.returns.optimistic.label]);
  });
});
