/**
 * The inflation calculator's printed report (report.ts): what was entered, the
 * chart's points and the by-year table, against an answer written by hand.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS } from '../../i18n/index.ts';
import { defaultState, type ToolState } from './url.ts';
import type { InflationAnswer } from './export.ts';
import { inflationReport } from './report.ts';

const tools = DICTS.en.tools;
const island = tools.inflation.island;
const common = tools.export;

const whole = (n: number) => ({ n, fmt: 'integer' });
const money = (n: number) => ({ n, fmt: 'amount2' });

const TITLE = 'What €1,000 becomes each year';
const STATE: ToolState = { ...defaultState('EUR'), mode: 'cost', amount: 1000, rate: 10, years: 2 };
const LINES = ['about €1,210', 'If prices rise 10% a year on average, it costs about €1,210.'];
const METHOD = 'Compounded once a year.';

/** 1,000 at 10% a year: 1,000, 1,100, 1,210. */
const ANSWER: InflationAnswer = {
  question: 'Cost later',
  sentences: ['Not printed: the report prints the lines it is given.'],
  value: 1210,
  points: [
    { x: 0, value: 1000 },
    { x: 1, value: 1100 },
    { x: 2, value: 1210.004 },
  ],
  axis: 'Years from now',
  chartTitle: TITLE,
  history: null,
};

const report = (answer: InflationAnswer = ANSWER, state: ToolState = STATE, notes?: string[]) =>
  inflationReport({ island, common, state, answer, decimals: 2, lines: LINES, method: METHOD, notes });

/** A straight path of `count` points: year i is worth 100 + i. */
const path = (count: number) => Array.from({ length: count }, (_, i) => ({ x: i, value: 100 + i }));

describe('inflation printed report', () => {
  it('is titled with the tool, names the currency, and carries the answer, its meaning and the method', () => {
    const r = report();
    assert.equal(r.tool, 'Inflation calculator');
    assert.equal(r.currency, 'EUR');
    assert.equal(report(ANSWER, { ...STATE, currency: 'INR' }).currency, 'INR');
    assert.deepEqual(r.answer, LINES);
    assert.equal(r.meaning, island.export.meaning);
    assert.match(r.meaning, /^Inflation is the rise in prices over time\./);
    assert.deepEqual(r.assumptions, [METHOD]);
  });

  it('prints what was entered as a table of item and value', () => {
    assert.deepEqual(report().entered, {
      caption: undefined,
      head: ['Item', 'Value'],
      rows: [
        ['Question', 'Cost later'],
        ['What it costs today', money(1000)],
        ['Inflation, % a year', { n: 10, fmt: 'decimal2' }],
        ['Years from now', whole(2)],
      ],
      note: undefined,
    });
  });

  it('draws the chart as one strong line through the answer’s points, unrounded', () => {
    assert.deepEqual(report().chart, {
      kind: 'lines',
      title: TITLE,
      xLabel: 'Years from now',
      series: [{ label: TITLE, points: [{ x: 0, y: 1000 }, { x: 1, y: 1100 }, { x: 2, y: 1210.004 }], strong: true }],
    });
  });

  it('draws no chart for a single point, and one from two points on', () => {
    assert.ok(report({ ...ANSWER, points: path(1) }).chart === null);
    assert.ok(report({ ...ANSWER, points: [] }).chart === null);
    assert.equal(report({ ...ANSWER, points: path(2) }).chart?.kind, 'lines');
  });

  it('prints a short path whole, under the chart’s title, amounts to the cent', () => {
    assert.deepEqual(report().tables, [
      {
        caption: TITLE,
        head: ['Years from now', 'Value'],
        rows: [
          [whole(0), money(1000)],
          [whole(1), money(1100)],
          [whole(2), money(1210)],
        ],
        note: undefined,
      },
    ]);
  });

  it('prints every fifth year and the last of a long path, and says so', () => {
    const [table] = report({ ...ANSWER, points: path(33) }).tables;
    assert.deepEqual(table.rows.map((row) => (row[0] as { n: number }).n), [0, 5, 10, 15, 20, 25, 30, 32]);
    assert.deepEqual(table.rows[7], [whole(32), money(132)]);
    assert.equal(table.note, common.report.sampled);
    assert.equal(table.head[0], 'Years from now');
    const [short] = report({ ...ANSWER, points: path(31) }).tables;
    assert.equal(short.rows.length, 31);
    assert.equal(short.note, undefined);
  });

  it('an answer that ends at a month: its row closes the table, and the sentence about it goes with the method', () => {
    const answer: InflationAnswer = { ...ANSWER, history: { country: 'Spain', from: 2014, to: 2016 }, monthEnd: { month: '2017-03', value: 1300 } };
    const out = report(answer, { ...STATE, mode: 'past' });
    assert.deepEqual(out.tables[0].rows, [
      [whole(0), money(1000)],
      [whole(1), money(1100)],
      [whole(2), money(1210)],
      ['2017-03', money(1300)],
    ]);
    assert.deepEqual(out.assumptions, [METHOD, 'The last row is one month, from the BIS monthly consumer price index, not a year’s average.']);
    // More on the method stands between the method and the sentence about the month's row.
    assert.deepEqual(report(answer, { ...STATE, mode: 'past' }, ['Two sources.']).assumptions, [METHOD, 'Two sources.', 'The last row is one month, from the BIS monthly consumer price index, not a year’s average.']);
    assert.deepEqual(report(ANSWER, STATE, ['A note.', 'Another.']).assumptions, [METHOD, 'A note.', 'Another.']);
    // The chart keeps the yearly points: the month is in the answer's sentences and in the table.
    assert.equal(out.chart?.kind === 'lines' && out.chart.series[0].points.length, 3);
  });

  it('an answer that ends at a year keeps its table whole and its one assumption', () => {
    for (const monthEnd of [null, undefined]) {
      const out = report({ ...ANSWER, monthEnd });
      assert.equal(out.tables[0].rows.length, 3);
      assert.deepEqual(out.assumptions, [METHOD]);
    }
  });

  it('a long path that ends at a month keeps the month’s row as its last', () => {
    // 40 years and the month: 41 rows, every fifth and the last.
    const out = report({ ...ANSWER, points: path(40), history: { country: 'Spain', from: 0, to: 39 }, monthEnd: { month: '2026-09', value: 500 } }, { ...STATE, mode: 'past' });
    const rows = out.tables[0].rows;
    assert.deepEqual(rows[rows.length - 1], ['2026-09', money(500)]);
    assert.equal(rows.length, 9);
    assert.equal(out.tables[0].note, common.report.sampled);
  });
});
