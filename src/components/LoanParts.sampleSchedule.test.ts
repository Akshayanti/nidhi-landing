/**
 * Two small decisions the loan comparison's charts share, tested without a
 * browser: which months the balance table for screen readers lists
 * (`sampleSchedule`), and what a sampled month is called under a bar or in a
 * table row (`formatYearLabel`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loanComparisonEn, loanComparisonEs } from '../i18n/strings/tools/loanComparison.ts';
import { formatYearLabel, oneAYear, sampleSchedule } from './LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn },
  es: { loanComparison: loanComparisonEs },
};

/** A schedule of `n` months whose balance in month m is `first - m`. */
const falling = (n: number, first: number) => Array.from({ length: n }, (_, i) => ({ month: i + 1, balance: first - (i + 1) }));

describe('the months the balance table lists', () => {
  it('lists every second month of a two-year loan and ends on its last month, once', () => {
    const rows = sampleSchedule([falling(24, 1000)], 12);
    assert.deepEqual(rows.map((r) => r.month), [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
    assert.deepEqual(rows.map((r) => r.values), [[998], [996], [994], [992], [990], [988], [986], [984], [982], [980], [978], [976]]);
  });

  it('takes a wider step as soon as a loan has one month more than the rows asked for', () => {
    // 13 months in 12 rows: every second month, then the last one.
    assert.deepEqual(sampleSchedule([falling(13, 500)], 12).map((r) => r.month), [2, 4, 6, 8, 10, 12, 13]);
    // 30 months in 4 rows: 30 / 4 is 7.5, so every eighth month.
    assert.deepEqual(sampleSchedule([falling(30, 500)], 4).map((r) => r.month), [8, 16, 24, 30]);
  });

  it('lists every month of a loan shorter than the rows asked for', () => {
    const rows = sampleSchedule([falling(5, 100)], 12);
    assert.deepEqual(rows, [
      { month: 1, values: [99] },
      { month: 2, values: [98] },
      { month: 3, values: [97] },
      { month: 4, values: [96] },
      { month: 5, values: [95] },
    ]);
  });

  it('runs to the longest loan and gives no balance for a loan already paid off', () => {
    const rows = sampleSchedule([falling(3, 100), falling(5, 900), []], 12);
    assert.deepEqual(rows, [
      { month: 1, values: [99, 899, null] },
      { month: 2, values: [98, 898, null] },
      // The shorter loan's own last month still has its balance.
      { month: 3, values: [97, 897, null] },
      { month: 4, values: [null, 896, null] },
      { month: 5, values: [null, 895, null] },
    ]);
  });

  it('lists nothing when no loan has a month to show', () => {
    assert.deepEqual(sampleSchedule([[]], 12), []);
    assert.deepEqual(sampleSchedule([[], []], 12), []);
  });
});

describe('what a sampled month is called', () => {
  const en = TOOL_STRINGS.en.loanComparison.island;

  it('keeps one sample a year, the first month and then the last sample in each later year', () => {
    // A five-year loan: pickSplitSamples(60, 6) puts months 25 and 36 both in year 3.
    assert.deepEqual(oneAYear([1, 13, 25, 36, 48, 60]), [1, 13, 36, 48, 60]);
    assert.deepEqual(oneAYear([1, 6, 10, 15, 19, 24]), [1, 24]);
    assert.deepEqual(oneAYear([1, 8, 15, 22, 29, 36]), [1, 22, 36]);
    assert.deepEqual(oneAYear([1, 73, 145, 216, 288, 360]), [1, 73, 145, 216, 288, 360]);
    assert.deepEqual(oneAYear([]), []);
  });

  it('names a bar by the year its month falls in, a month that ends a year in that year', () => {
    assert.deepEqual([1, 12, 13, 24, 349, 360].map((m) => formatYearLabel(m, en, true)), ['Year 1', 'Year 1', 'Year 2', 'Year 2', 'Year 30', 'Year 30']);
  });

  it('names a bar by its month on a loan of up to three years', () => {
    assert.deepEqual([1, 2, 12].map((m) => formatYearLabel(m, en, false)), ['Month 1', 'Month 2', 'Month 12']);
  });

  it("uses the page's own words", () => {
    const es = TOOL_STRINGS.es.loanComparison.island;
    assert.equal(formatYearLabel(1, es, true), es.balance.year.replace('{y}', '1'));
    assert.equal(formatYearLabel(9, es, false), es.balance.month.replace('{m}', '9'));
    assert.notEqual(formatYearLabel(9, es, false), formatYearLabel(9, en, false));
  });
});
