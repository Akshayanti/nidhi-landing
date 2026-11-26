/**
 * Two small decisions the loan comparison's charts share, tested without a
 * browser: which months the balance table for screen readers lists
 * (`sampleSchedule`), and what a sampled month is called under a bar or in a
 * table row (`formatYearLabel`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dict } from '../i18n/index.ts';
import { formatYearLabel, sampleSchedule } from './LoanCompare.tsx';

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
  const en = dict('en').tools.loanComparison.island;

  it('calls the first month the first year', () => {
    assert.equal(formatYearLabel(1, en), 'Year 1');
  });

  it('names the month itself through the first year, its last month included', () => {
    assert.equal(formatYearLabel(2, en), 'Month 2');
    assert.equal(formatYearLabel(7, en), 'Month 7');
    assert.equal(formatYearLabel(12, en), 'Month 12');
  });

  it('names the year a later month completes', () => {
    assert.equal(formatYearLabel(24, en), 'Year 2');
    assert.equal(formatYearLabel(60, en), 'Year 5');
    assert.equal(formatYearLabel(360, en), 'Year 30');
  });

  it('names the year a later month falls in when it does not complete one', () => {
    assert.equal(formatYearLabel(13, en), 'Year 2');
    assert.equal(formatYearLabel(23, en), 'Year 2');
    assert.equal(formatYearLabel(25, en), 'Year 3');
    assert.equal(formatYearLabel(349, en), 'Year 30');
  });

  it("uses the page's own words", () => {
    const es = dict('es').tools.loanComparison.island;
    assert.equal(formatYearLabel(1, es), es.balance.year.replace('{y}', '1'));
    assert.equal(formatYearLabel(9, es), es.balance.month.replace('{m}', '9'));
    assert.notEqual(formatYearLabel(9, es), formatYearLabel(9, en));
  });
});
