/**
 * The loan comparison's printed report: what was entered, the comparison
 * table (and the payments by period when a payment changes with its rate) and
 * the balance chart's lines, as a reader sees them on paper, against small
 * loans worked out by hand (test/loanParts.exportOffers.ts has each one's
 * schedule).
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { format } from '../../i18n/format.ts';
import type { ReportSeries } from '../shared/report.ts';
import type { LoanResult } from './math.ts';
import { loanReport } from './report.ts';
import {
  amount, BROKEN, BY_PAYMENT, common, EARLY, exportOf, FIXED, island, KEPT, NEVER, offer, pct, RESET, result, whole,
} from '../../../test/loanParts.exportOffers.ts';

const x = island.export;
const c = island.card;

type Offers = Parameters<typeof exportOf>[0];
const report = (offers: Offers, over: Parameters<typeof exportOf>[1] = {}) =>
  loanReport({ ...exportOf(offers, over), answer: ['The offers differ by 0.12.', 'A second paragraph.'] });

/** The chart's lines; fails when the report has no line chart. */
const lines = (offers: Offers, over: Parameters<typeof exportOf>[1] = {}): ReportSeries[] => {
  const { chart } = report(offers, over);
  assert.ok(chart !== null && chart.kind === 'lines', 'a line chart');
  return chart.series;
};

const MONTH = 1 / 12;

describe('loan printed report: its heading and words', () => {
  it('names the tool and the currency, and gives the answer as the page worded it', () => {
    const r = report([['Bank A', FIXED], ['Bank B', BY_PAYMENT]]);
    assert.equal(r.tool, x.tool);
    assert.equal(r.currency, 'USD');
    assert.deepEqual(r.answer, ['The offers differ by 0.12.', 'A second paragraph.']);
    assert.equal(r.meaning, x.meaning);
  });

  it('carries the disclaimer as its one assumption', () => {
    assert.deepEqual(report([['Bank A', FIXED]]).assumptions, [island.disclaimer.body]);
  });
});

describe('loan printed report: what was entered', () => {
  it('lists each offer’s boxes, leaving out the optional rows nobody filled in', () => {
    const { entered } = report([['Bank A', FIXED], ['Bank B', BY_PAYMENT]]);
    assert.ok(entered !== null);
    assert.deepEqual(entered.head, [common.columns.item, 'Bank A', 'Bank B']);
    assert.deepEqual(entered.rows, [
      [c.principal, amount(1200), amount(1200)],
      [c.rate, pct(12), pct(12)],
      [c.solveFor, c.modeTerm, c.modePayment],
      [c.term, whole(3), null],
      [c.monthly, null, amount(408.03)],
      [c.rateStructure.title, c.fixed, c.fixed],
      [c.fee, amount(12), amount(0)],
    ]);
  });

  it('keeps an optional row as soon as one offer filled it in', () => {
    const { entered } = report([['Bank A', offer({ lumpSumsEncoded: '1:500', prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '3' })], ['Bank B', FIXED]]);
    assert.ok(entered !== null);
    // Both offers are worked out from their term, so the payment row is left out as well.
    assert.deepEqual(entered.rows.map((row) => row[0]), [c.principal, c.rate, c.solveFor, c.term, c.rateStructure.title, c.fee, c.lumps, c.penaltyPct, c.penaltyUntil]);
    assert.deepEqual(entered.rows.slice(5), [
      [c.fee, amount(0), amount(12)],
      [c.lumps, 'Month 1: 500.00', null],
      [c.penaltyPct, pct(2), pct(0)],
      [c.penaltyUntil, whole(3), whole(0)],
    ]);
  });

  it('stacks on narrow paper, and has no caption or note of its own', () => {
    const { entered } = report([['Bank A', FIXED]]);
    assert.ok(entered !== null);
    assert.equal(entered.stack, true);
    assert.equal(entered.caption, undefined);
    assert.equal(entered.note, undefined);
  });
});

describe('loan printed report: the comparison table when no payment changes', () => {
  const r = report([['Bank A', FIXED], ['Bank B', BY_PAYMENT], ['Bank C', BROKEN]]);

  it('is one table, captioned as on the page, that stacks on narrow paper', () => {
    assert.equal(r.tables.length, 1);
    assert.equal(r.tables[0].caption, island.delta.heading);
    assert.equal(r.tables[0].stack, true);
  });

  it('says under the table what the APR is based on and where the schedules are', () => {
    assert.deepEqual(r.tables[0].note, [island.delta.aprNote, x.schedulesNote]);
  });

  it('heads the APR column plainly, the basis being the line under the table', () => {
    assert.deepEqual(r.tables[0].head, [
      c.name, island.delta.monthlyPayment, x.months, island.delta.totalInterest, island.results.fees, island.results.penalty, island.delta.totalPaid, x.aprPct, x.computed,
    ]);
  });

  it('gives each offer’s payment, months, interest, fees, penalty, total and APR, and names an offer it could not work out', () => {
    assert.deepEqual(r.tables[0].rows, [
      ['Bank A', amount(408.03), whole(3), amount(24.08), amount(12), amount(0), amount(1236.08), pct(18.1317), common.yes],
      ['Bank B', amount(408.03), whole(3), amount(24.08), amount(0), amount(0), amount(1224.08), pct(12.0002), common.yes],
      ['Bank C', null, null, null, null, null, null, null, common.no],
    ]);
  });
});

describe('loan printed report: the tables when a payment changes with its rate', () => {
  const r = report([['Fixed', FIXED], ['Reset', RESET], ['Kept', KEPT], ['Never', NEVER], ['Early', EARLY], ['Broken', BROKEN]]);
  const [comparison, payments] = r.tables;

  it('are two: the comparison, then the payments by period', () => {
    assert.equal(r.tables.length, 2);
    assert.equal(comparison.caption, island.delta.heading);
    assert.equal(payments.caption, island.delta.monthlyPayment);
    assert.equal(comparison.stack, true);
    assert.equal(payments.stack, true);
    assert.deepEqual(comparison.note, [island.delta.aprNote, x.schedulesNote]);
    assert.equal(payments.note, undefined);
  });

  it('keeps the starting payment in the comparison, with the months, totals and APR', () => {
    assert.deepEqual(comparison.head, [
      c.name, x.monthlyAtStart, x.months, island.delta.totalInterest, island.results.fees, island.results.penalty, island.delta.totalPaid, x.aprPct, x.computed,
    ]);
    assert.deepEqual(comparison.rows, [
      ['Fixed', amount(408.03), whole(3), amount(24.08), amount(12), amount(0), amount(1236.08), pct(18.1317), common.yes],
      ['Reset', amount(408.03), whole(3), amount(36.2), amount(0), amount(0), amount(1236.2), pct(17.9659), common.yes],
      ['Kept', amount(408.03), whole(3), amount(36.32), amount(0), amount(0), amount(1236.32), pct(17.9802), common.yes],
      ['Never', amount(50), island.results.notPaidOff, island.results.noFiniteTotal, amount(0), amount(0), island.results.noFiniteTotal, island.results.notAvailable, common.yes],
      ['Early', amount(408.03), whole(2), amount(15.04), amount(0), amount(0), amount(1215.04), pct(13.9827), common.yes],
      ['Broken', null, null, null, null, null, null, null, common.no],
    ]);
  });

  it('lists each offer’s payment at the start, after the change and from which month, with its note', () => {
    assert.deepEqual(payments.head, [c.name, x.monthlyAtStart, x.monthlyAfterChange, x.fromMonth, x.paymentNote]);
    assert.deepEqual(payments.rows.slice(0, 5), [
      ['Fixed', amount(408.03), null, null, x.noPaymentChange],
      ['Reset', amount(408.03), amount(414.08), whole(2), null],
      ['Kept', amount(408.03), amount(408.03), whole(2), format(x.keptPaid, { month: 2, payoffMonth: 3 })],
      ['Never', amount(50), amount(50), whole(2), format(x.keptNever, { month: 2 })],
      ['Early', amount(408.03), null, null, format(island.results.paidOffBeforeChange, { payoffMonth: 2 })],
    ]);
  });

  it('leaves an offer that could not be worked out off the payments table: it has none to list', () => {
    assert.deepEqual(payments.rows.map((row) => row[0]), ['Fixed', 'Reset', 'Kept', 'Never', 'Early']);
  });

  it('words a loan still being paid at the calculation limit as beyond it', () => {
    const atLimit: LoanResult = { ...result(NEVER), keptPayment: { outcome: 'limit', termMonths: 24 } };
    const limited = report([['Kept', KEPT], ['Limit', NEVER]], { results: [result(KEPT), atLimit] });
    assert.deepEqual(limited.tables[0].rows[1], [
      'Limit', amount(50), island.results.beyondLimit, island.results.notAvailable, amount(0), amount(0), island.results.notAvailable, island.results.notAvailable, common.yes,
    ]);
    assert.deepEqual(limited.tables[1].rows[1], ['Limit', amount(50), amount(50), whole(2), format(x.keptLimit, { month: 2, limit: 1200 })]);
  });
});

describe('loan printed report: the balance chart', () => {
  it('is a line chart titled with the currency, its time axis in years', () => {
    const { chart } = report([['Bank A', FIXED]], { currency: 'JPY' });
    assert.ok(chart !== null && chart.kind === 'lines');
    assert.equal(chart.title, `${island.charts.balanceHeading} (JPY)`);
    assert.equal(chart.xLabel, island.balance.axisYears);
  });

  it('draws an offer from the amount borrowed down to nothing, a point a month', () => {
    assert.deepEqual(lines([['Bank A', FIXED]]), [{
      label: 'Bank A',
      points: [{ x: 0, y: 1200 }, { x: MONTH, y: 803.97 }, { x: 2 * MONTH, y: 403.98 }, { x: 3 * MONTH, y: 0 }],
      dash: '',
    }]);
  });

  it('starts at the amount borrowed when a lump sum pays most of it in the first month', () => {
    assert.deepEqual(lines([['Bank A', EARLY]])[0].points, [{ x: 0, y: 1200 }, { x: MONTH, y: 303.97 }, { x: 2 * MONTH, y: 0 }]);
  });

  it('draws amounts in whole units for a currency without cents', () => {
    assert.deepEqual(lines([['Bank A', offer({ principal: '120000' })]], { currency: 'JPY' })[0].points, [
      { x: 0, y: 120000 }, { x: MONTH, y: 80397 }, { x: 2 * MONTH, y: 40398 }, { x: 3 * MONTH, y: 0 },
    ]);
  });

  it('tells the offers apart by dash pattern, as the page’s chart does, starting over after the fifth', () => {
    const six: Offers = [['A', FIXED], ['B', RESET], ['C', KEPT], ['D', EARLY], ['E', BY_PAYMENT], ['F', FIXED]];
    assert.deepEqual(lines(six).map((s) => [s.label, s.dash]), [['A', ''], ['B', '9 5'], ['C', '2 4'], ['D', '12 4 2 4'], ['E', '5 5'], ['F', '']]);
  });

  it('leaves out an offer that could not be worked out, the others keeping their own pattern', () => {
    assert.deepEqual(lines([['A', FIXED], ['B', BROKEN], ['C', KEPT]]).map((s) => [s.label, s.dash]), [['A', ''], ['C', '2 4']]);
  });

  it('leaves out an offer that carries an error even if it holds a schedule, and one with no schedule', () => {
    const withError: LoanResult = { ...result(FIXED), error: 'Enter a loan amount greater than zero.' };
    const noSchedule: LoanResult = { ...result(FIXED), schedule: [] };
    const series = lines([['A', FIXED], ['B', FIXED], ['C', FIXED]], { results: [withError, noSchedule, result(FIXED)] });
    assert.deepEqual(series.map((s) => s.label), ['C']);
  });

  it('is left out when no offer can be worked out', () => {
    assert.ok(report([['A', BROKEN], ['B', BROKEN]]).chart === null);
  });

  it('draws a loan that is never paid off over its entered term, not to the calculation limit', () => {
    const [never] = lines([['Never', NEVER], ['Bank A', FIXED]]);
    // The start and 24 months: 1,150.00 after the first payment, then growing by the interest the payment does not cover.
    assert.equal(never.points.length, 25);
    assert.deepEqual(never.points.slice(0, 4), [{ x: 0, y: 1200 }, { x: MONTH, y: 1150 }, { x: 2 * MONTH, y: 1157.5 }, { x: 3 * MONTH, y: 1165.38 }]);
    assert.equal(never.points[24].x, 2);
  });

  it('draws it as far as the longest other offer when that runs past its term', () => {
    const [never, long] = lines([['Never', NEVER], ['Three years', offer({ termMonths: '36' })]]);
    assert.equal(never.points.length, 37);
    assert.equal(never.points[36].x, 3);
    assert.equal(long.points.length, 37);
  });

  it('thins a long loan’s line, keeping where it starts and where it ends', () => {
    // 1,200.00 at 1% a year over 30 years: 361 points, of which every fourth is drawn.
    const [long] = lines([['Thirty years', offer({ annualRatePct: '1', termMonths: '360' })]]);
    assert.equal(long.points.length, 91);
    assert.deepEqual(long.points[0], { x: 0, y: 1200 });
    assert.deepEqual(long.points[90], { x: 30, y: 0 });
  });
});
