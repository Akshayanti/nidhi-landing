/**
 * The loan comparison's spreadsheet, sheet by sheet and cell by cell, against
 * small loans worked out by hand (test/loanParts.exportOffers.ts has each
 * one's schedule). Every amount, month, rate and note a reader keeps in the
 * file is stated here as a figure.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { format } from '../../i18n/format.ts';
import type { Cell } from '../shared/xlsx.ts';
import type { LoanResult } from './math.ts';
import { hasLaterPayment, LATER_PAYMENT_COLUMNS, loanSheets } from './export.ts';
import {
  amount, BROKEN, BY_PAYMENT, common, EARLY, exportOf, FIXED, head, island, KEPT, NEVER, offer, pct, RESET, result, whole, worthToday,
} from '../../../test/loanParts.exportOffers.ts';

const x = island.export;
const c = island.card;
const DATE = '2026-11-24';
const PAGE = 'https://nidhi.today/free/loan-comparison/';

const yen = (n: number): Cell => ({ n, fmt: 'amount0' });
const typed = (n: number): Cell => ({ n, fmt: 'general' });
const numberIn = (cell: Cell): number => (cell as { n: number }).n;

const summaryHead = (...payment: string[]) =>
  head(c.name, ...payment, x.months, island.delta.totalInterest, island.results.fees, island.results.penalty, island.delta.totalPaid, `${x.aprPct} (${island.results.aprBasis})`, x.computed);
const laterHead = [x.monthlyAtStart, x.monthlyAfterChange, x.fromMonth, x.paymentNote];

/** The row of the inputs sheet with this label, without the label. */
const inputRow = (rows: Cell[][], label: string): Cell[] => {
  const found = rows.filter((row) => row[0] === label);
  assert.equal(found.length, 1, `one row labelled "${label}"`);
  return found[0].slice(1);
};

describe('whether any offer has a payment after its rate changes', () => {
  const reset = result(RESET);

  it('no, with no offers at all', () => assert.equal(hasLaterPayment([]), false));

  it('no, when every rate is fixed', () => assert.equal(hasLaterPayment([result(FIXED), result(BY_PAYMENT)]), false));

  it('yes, when one offer among fixed ones pays a new amount from its rate change', () => {
    assert.equal(hasLaterPayment([result(FIXED), reset]), true);
    assert.equal(hasLaterPayment([reset]), true);
  });

  it('yes, when the payment is kept at the rate change', () => assert.equal(hasLaterPayment([result(KEPT)]), true));

  it('no, when the loan is paid off before its rate changes', () => {
    assert.equal(result(EARLY).rateChange?.paymentMinor, null);
    assert.equal(hasLaterPayment([result(EARLY)]), false);
  });

  it('no, for an offer that carries an error, whatever else it holds', () => {
    assert.equal(hasLaterPayment([{ ...reset, error: 'Enter a loan amount greater than zero.' }]), false);
  });

  it('no, for an offer with no schedule', () => {
    assert.equal(hasLaterPayment([{ ...reset, schedule: [] }]), false);
  });

  it('gives the payment four columns when it changes', () => assert.equal(LATER_PAYMENT_COLUMNS, 4));
});

describe('loan spreadsheet: its sheets', () => {
  it('are About, Summary, Inputs, then one schedule per offer under its name', () => {
    const sheets = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', RESET]]));
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, x.sheets.summary, common.sheets.inputs, 'Bank A', 'Bank B']);
  });

  it('give an offer that cannot be worked out no schedule sheet', () => {
    const sheets = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', BROKEN], ['Bank C', RESET]]));
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, x.sheets.summary, common.sheets.inputs, 'Bank A', 'Bank C']);
  });

  it('give an offer whose rate changes, with its later rate left out, no schedule sheet (issue 818)', () => {
    const noLaterRate = offer({ rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '' });
    assert.ok(result(noLaterRate).error);
    const sheets = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', noLaterRate]]));
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, x.sheets.summary, common.sheets.inputs, 'Bank A']);
  });

  it('have no schedule sheets when no offer can be worked out', () => {
    assert.equal(loanSheets(exportOf([['Bank A', BROKEN], ['Bank B', BROKEN]])).length, 3);
  });
});

describe('loan spreadsheet: the About sheet', () => {
  it('says what the file is, when and where it was made, in which currency, and what the schedules and the APR are', () => {
    const about = loanSheets(exportOf([['Bank A', FIXED]]))[0];
    assert.deepEqual(about.widths, [22, 90]);
    assert.deepEqual(about.rows, [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, DATE],
      [common.about.currency, 'USD'],
      [common.about.page, PAGE],
      [x.scheduleLabel, x.scheduleText],
      [island.results.apr, island.results.aprDocs],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
  });
});

describe('loan spreadsheet: the Inputs sheet', () => {
  const inputs = (...offers: Parameters<typeof exportOf>[0]) => loanSheets(exportOf(offers))[2];

  it('has one column per offer and one row per box, empty optional boxes as zero', () => {
    const sheet = inputs(['Bank A', FIXED], ['Bank B', BY_PAYMENT]);
    assert.deepEqual(sheet.widths, [34, 18, 18]);
    assert.deepEqual(sheet.rows, [
      head(common.columns.item, 'Bank A', 'Bank B'),
      [c.principal, amount(1200), amount(1200)],
      [c.rate, pct(12), pct(12)],
      [c.solveFor, c.modeTerm, c.modePayment],
      [c.term, whole(3), null],
      [c.monthly, null, amount(408.03)],
      [c.rateStructure.title, c.fixed, c.fixed],
      [c.fee, amount(12), amount(0)],
      [c.pointsCost, amount(0), amount(0)],
      [c.pointsReduction, pct(0), pct(0)],
      [c.extra, amount(0), amount(0)],
      [c.lumps, null, null],
      [c.penaltyPct, pct(0), pct(0)],
      [c.penaltyUntil, whole(0), whole(0)],
    ]);
  });

  it('is one column wider for each further offer', () => {
    assert.deepEqual(inputs(['A', FIXED], ['B', FIXED], ['C', FIXED], ['D', FIXED], ['E', FIXED]).widths, [34, 18, 18, 18, 18, 18]);
  });

  it('adds the three rate change rows when an offer has a changing rate, empty for a fixed one', () => {
    const { rows } = inputs(['Bank A', FIXED], ['Bank B', RESET], ['Bank C', KEPT]);
    assert.deepEqual(rows.slice(6, 10), [
      [c.rateStructure.title, c.fixed, c.hybrid, c.hybrid],
      [c.initialFixed, null, whole(1), whole(1)],
      [c.subsequentRate, null, pct(24), pct(24)],
      [c.atChange.label, null, c.atChange.term, c.atChange.payment],
    ]);
    assert.equal(rows.length, 17);
    assert.deepEqual(rows[10], [c.fee, amount(12), amount(0), amount(0)]);
  });

  it('adds those rows when every offer has a changing rate too', () => {
    const { rows } = inputs(['Bank B', RESET], ['Bank C', KEPT]);
    assert.deepEqual(rows[7], [c.initialFixed, whole(1), whole(1)]);
    assert.equal(rows.length, 17);
  });

  it('leaves the rate change boxes of a fixed offer out even when they hold something', () => {
    const fixedWithLeftovers = offer({ initialFixedMonths: '60', subsequentRatePct: '9', rateChangeKeeps: 'payment' });
    const { rows } = inputs(['Bank A', fixedWithLeftovers], ['Bank B', RESET]);
    assert.deepEqual(inputRow(rows, c.initialFixed), [null, whole(1)]);
    assert.deepEqual(inputRow(rows, c.subsequentRate), [null, pct(24)]);
    assert.deepEqual(inputRow(rows, c.atChange.label), [null, c.atChange.term]);
  });

  it('writes only the box the offer is worked out from, term or payment, when the other still holds a value', () => {
    const byTerm = offer({ monthlyPayment: '500' });
    const byPayment = offer({ modeKind: 'payment', monthlyPayment: '408.03', termMonths: '36' });
    const { rows } = inputs(['Bank A', byTerm], ['Bank B', byPayment]);
    assert.deepEqual(inputRow(rows, c.term), [whole(3), null]);
    assert.deepEqual(inputRow(rows, c.monthly), [null, amount(408.03)]);
  });

  it('writes the optional boxes as typed: fee, points, extra principal and penalty', () => {
    const full = offer({ feeMajor: '25.5', pointsCostMajor: '10', pointsRateReductionPct: '0.25', extraMonthly: '10', prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '3' });
    const { rows } = inputs(['Bank A', full], ['Bank B', offer()]);
    assert.deepEqual(inputRow(rows, c.fee), [amount(25.5), amount(0)]);
    assert.deepEqual(inputRow(rows, c.pointsCost), [amount(10), amount(0)]);
    assert.deepEqual(inputRow(rows, c.pointsReduction), [pct(0.25), pct(0)]);
    assert.deepEqual(inputRow(rows, c.extra), [amount(10), amount(0)]);
    assert.deepEqual(inputRow(rows, c.penaltyPct), [pct(2), pct(0)]);
    assert.deepEqual(inputRow(rows, c.penaltyUntil), [whole(3), whole(0)]);
  });

  it('reads grouped amounts and rounds an amount to the currency’s cents', () => {
    const { rows } = inputs(['Bank A', offer({ principal: '1,200.456', feeMajor: '1 000.006' })], ['Bank B', offer({ principal: '250 000' })]);
    assert.deepEqual(inputRow(rows, c.principal), [amount(1200.46), amount(250000)]);
    assert.deepEqual(inputRow(rows, c.fee), [amount(1000.01), amount(0)]);
  });

  it('keeps every decimal of a rate that was typed with more than two', () => {
    const eighths = offer({ annualRatePct: '4.875', rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '5.125', pointsRateReductionPct: '0.125', prepayPenaltyPct: '1.375' });
    const { rows } = inputs(['Bank A', eighths], ['Bank B', offer({ annualRatePct: '4.88' })]);
    assert.deepEqual(inputRow(rows, c.rate), [typed(4.875), pct(4.88)]);
    assert.deepEqual(inputRow(rows, c.subsequentRate), [typed(5.125), null]);
    assert.deepEqual(inputRow(rows, c.pointsReduction), [typed(0.125), pct(0)]);
    assert.deepEqual(inputRow(rows, c.penaltyPct), [typed(1.375), pct(0)]);
  });

  it('writes months as whole numbers', () => {
    const { rows } = inputs(['Bank A', offer({ termMonths: '36.6', prepayPenaltyUntilMonth: '11.5' })], ['Bank B', offer({ rateKind: 'hybrid', initialFixedMonths: '12.4', subsequentRatePct: '24' })]);
    assert.deepEqual(inputRow(rows, c.term), [whole(37), whole(3)]);
    assert.deepEqual(inputRow(rows, c.penaltyUntil), [whole(12), whole(0)]);
    assert.deepEqual(inputRow(rows, c.initialFixed), [null, whole(12)]);
  });

  it('leaves a box that does not read as a number empty, never as a wrong figure', () => {
    const unread = offer({
      principal: 'abc', annualRatePct: '', termMonths: 'soon', feeMajor: '1e3', pointsCostMajor: 'x', pointsRateReductionPct: 'x', extraMonthly: 'x',
      prepayPenaltyPct: 'x', prepayPenaltyUntilMonth: 'x', rateKind: 'hybrid', initialFixedMonths: '', subsequentRatePct: '',
    });
    const { rows } = inputs(['Bank A', unread], ['Bank B', offer({ modeKind: 'payment', monthlyPayment: '' })]);
    for (const label of [c.principal, c.rate, c.term, c.initialFixed, c.subsequentRate, c.fee, c.pointsCost, c.pointsReduction, c.extra, c.penaltyPct, c.penaltyUntil]) {
      assert.equal(inputRow(rows, label)[0], null, label);
    }
    assert.deepEqual(inputRow(rows, c.monthly), [null, null]);
  });

  describe('lump sums', () => {
    const lumpCell = (encoded: string, over: Parameters<typeof exportOf>[1] = {}) =>
      inputRow(loanSheets(exportOf([['Bank A', offer({ lumpSumsEncoded: encoded })]], over))[2].rows, c.lumps)[0];

    it('are written for reading, month and amount, each amount to the cent', () => {
      assert.equal(lumpCell('12:5000;36:3000.5'), 'Month 12: 5,000.00; Month 36: 3,000.50');
      assert.equal(lumpCell('1:500'), 'Month 1: 500.00');
    });

    it('use the month wording of the catalog, kept on one line by no-break spaces', () => {
      const cell = lumpCell('7:100');
      assert.equal(cell, `${format(island.balance.month, { m: 7 }).replaceAll(' ', ' ')}: 100.00`);
      const twoSpaces = { ...island, balance: { ...island.balance, month: 'In month {m}' } };
      assert.equal(lumpCell('7:100', { island: twoSpaces }), 'In month 7: 100.00');
    });

    it('write amounts the way the page’s locale writes them', () => {
      assert.equal(lumpCell('12:5000;36:3000.5', { locale: 'de-DE' }), 'Month 12: 5.000,00; Month 36: 3.000,50');
      assert.equal(lumpCell('12:5000', { locale: null }), 'Month 12: 5,000.00');
    });

    it('write amounts without decimals in a currency that has none', () => {
      assert.equal(lumpCell('12:5000;36:3000.5', { currency: 'JPY' }), 'Month 12: 5,000; Month 36: 3,001');
    });

    it('are empty when the box is empty or holds only spaces', () => {
      assert.equal(lumpCell(''), null);
      assert.equal(lumpCell('   '), null);
    });

    it('are left as typed when the text does not read as lump sums', () => {
      assert.equal(lumpCell('soon'), 'soon');
      assert.equal(lumpCell(' 12 5000 '), ' 12 5000 ');
    });
  });
});

describe('loan spreadsheet: the Summary sheet when no payment changes', () => {
  const summary = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', BY_PAYMENT], ['Bank C', BROKEN]]))[1];

  it('has one payment column, and names the basis of the APR in its heading', () => {
    assert.deepEqual(summary.widths, [22, 16, 12, 16, 16, 14, 16, 34, 12]);
    assert.deepEqual(summary.rows[0], summaryHead(island.delta.monthlyPayment));
  });

  it('gives each offer its payment, months, interest, fees, penalty, total and APR', () => {
    // Bank A: 408.03 + 408.03 + 408.02 = 1,224.08, of which 24.08 is interest; with the fee of 12.00, 1,236.08.
    assert.deepEqual(summary.rows[1], ['Bank A', amount(408.03), whole(3), amount(24.08), amount(12), amount(0), amount(1236.08), pct(18.1317), common.yes]);
    // Bank B has no fee, so its APR is its rate, to the cent's rounding of the last payment.
    assert.deepEqual(summary.rows[2], ['Bank B', amount(408.03), whole(3), amount(24.08), amount(0), amount(0), amount(1224.08), pct(12.0002), common.yes]);
  });

  it('states an APR at which the payments are worth what was borrowed less the fee', () => {
    const payments = [408.03, 408.03, 408.02];
    assert.ok(Math.abs(worthToday(payments, numberIn(summary.rows[1][7])) - 1188) < 0.001);
    assert.ok(Math.abs(worthToday(payments, numberIn(summary.rows[2][7])) - 1200) < 0.001);
  });

  it('lists an offer that cannot be worked out by name, with every figure empty', () => {
    assert.deepEqual(summary.rows[3], ['Bank C', null, null, null, null, null, null, null, common.no]);
    assert.equal(summary.rows.length, 4);
  });

  it('counts extra principal in the payment and shows a penalty for paying off early', () => {
    // 408.03 + 10.00 extra + 500.00 lump sum in month 1 leaves 293.97; month 2 pays it with 2.94 interest.
    // The penalty is 2% of the 293.97 paid off early: 5.88. In all 918.03 + 296.91 + 5.88 = 1,220.82.
    const early = offer({ lumpSumsEncoded: '1:500', extraMonthly: '10', prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '3' });
    const { rows } = loanSheets(exportOf([['Bank A', early]]))[1];
    assert.deepEqual(rows[1], ['Bank A', amount(418.03), whole(2), amount(14.94), amount(0), amount(5.88), amount(1220.82), pct(12.0002), common.yes]);
  });

  it('leaves the APR empty when there is none to state: a fee as large as the loan', () => {
    const { rows } = loanSheets(exportOf([['Bank A', offer({ feeMajor: '1200' })]]))[1];
    assert.deepEqual(rows[1], ['Bank A', amount(408.03), whole(3), amount(24.08), amount(1200), amount(0), amount(2424.08), null, common.yes]);
  });

  it('lists an offer that carries an error as not calculated, even if it holds figures, and gives it no sheet', () => {
    const withError: LoanResult = { ...result(FIXED), error: 'Enter a loan amount greater than zero.' };
    const sheets = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', FIXED]], { results: [result(FIXED), withError] }));
    assert.deepEqual(sheets[1].rows[2], ['Bank B', null, null, null, null, null, null, null, common.no]);
    assert.deepEqual(sheets.slice(3).map((s) => s.name), ['Bank A']);
  });

  it('lists an offer with no schedule as not calculated, and gives it no sheet', () => {
    const noSchedule: LoanResult = { ...result(FIXED), schedule: [] };
    const sheets = loanSheets(exportOf([['Bank A', FIXED], ['Bank B', FIXED]], { results: [result(FIXED), noSchedule] }));
    assert.deepEqual(sheets[1].rows[2], ['Bank B', null, null, null, null, null, null, null, common.no]);
    assert.deepEqual(sheets.slice(3).map((s) => s.name), ['Bank A']);
  });
});

describe('loan spreadsheet: the Summary sheet when a payment changes with its rate', () => {
  const all = exportOf([['Fixed', FIXED], ['Reset', RESET], ['Kept', KEPT], ['Never', NEVER], ['Early', EARLY], ['Broken', BROKEN]]);
  const summary = loanSheets(all)[1];

  it('gives the payment four columns: at the start, after the change, from which month, and a note', () => {
    assert.deepEqual(summary.widths, [22, 18, 22, 12, 34, 12, 16, 16, 14, 16, 34, 12]);
    assert.deepEqual(summary.rows[0], summaryHead(...laterHead));
    assert.equal(summary.rows.length, 7);
  });

  it('says a fixed offer has no payment change', () => {
    assert.deepEqual(summary.rows[1], ['Fixed', amount(408.03), null, null, x.noPaymentChange, whole(3), amount(24.08), amount(12), amount(0), amount(1236.08), pct(18.1317), common.yes]);
  });

  it('gives the new payment and its first month when the term is kept, with no note', () => {
    // 408.03 + 414.08 + 414.09 = 1,236.20, of which 36.20 is interest.
    assert.deepEqual(summary.rows[2], ['Reset', amount(408.03), amount(414.08), whole(2), null, whole(3), amount(36.2), amount(0), amount(0), amount(1236.2), pct(17.9659), common.yes]);
    assert.ok(Math.abs(worthToday([408.03, 414.08, 414.09], numberIn(summary.rows[2][10])) - 1200) < 0.001);
  });

  it('says when the payment is kept, from which month, and the month the loan pays off', () => {
    // 408.03 + 408.03 + 420.26 = 1,236.32, of which 36.32 is interest.
    const note = format(x.keptPaid, { month: 2, payoffMonth: 3 });
    assert.ok(note.includes('month 2') && note.includes('month 3') && !note.includes('{'));
    assert.deepEqual(summary.rows[3], ['Kept', amount(408.03), amount(408.03), whole(2), note, whole(3), amount(36.32), amount(0), amount(0), amount(1236.32), pct(17.9802), common.yes]);
    assert.ok(Math.abs(worthToday([408.03, 408.03, 420.26], numberIn(summary.rows[3][10])) - 1200) < 0.001);
  });

  it('says a loan whose kept payment never pays it off is not paid off, and leaves months, totals and APR empty', () => {
    const note = format(x.keptNever, { month: 2 });
    assert.ok(note.includes('month 2') && !note.includes('{'));
    assert.deepEqual(summary.rows[4], ['Never', amount(50), amount(50), whole(2), note, null, null, amount(0), amount(0), null, null, common.yes]);
  });

  it('says a loan still being paid at the calculation limit is not paid off within 1,200 months', () => {
    const atLimit: LoanResult = { ...result(NEVER), keptPayment: { outcome: 'limit', termMonths: 24 } };
    const { rows } = loanSheets({ ...all, results: all.results.map((r, i) => (i === 3 ? atLimit : r)) })[1];
    const note = format(x.keptLimit, { month: 2, limit: 1200 });
    assert.ok(note.includes('month 2') && note.includes('1200') && !note.includes('{'));
    assert.deepEqual(rows[4], ['Never', amount(50), amount(50), whole(2), note, null, null, amount(0), amount(0), null, null, common.yes]);
  });

  it('says a loan paid off before its rate changes has no later payment, and in which month it ended', () => {
    // 908.03 + 307.01 = 1,215.04, of which 15.04 is interest. The APR is on the contract: 408.03, 408.03, then 412.06 at 24%.
    const note = format(island.results.paidOffBeforeChange, { payoffMonth: 2 });
    assert.ok(note.includes('month 2') && !note.includes('{'));
    assert.deepEqual(summary.rows[5], ['Early', amount(408.03), null, null, note, whole(2), amount(15.04), amount(0), amount(0), amount(1215.04), pct(13.9827), common.yes]);
    assert.ok(Math.abs(worthToday([408.03, 408.03, 412.06], numberIn(summary.rows[5][10])) - 1200) < 0.001);
  });

  it('lists no later payment for a loan that ended before the change, whatever else the result holds', () => {
    const endedButKept: LoanResult = { ...result(EARLY), keptPayment: { outcome: 'paid', termMonths: 3 } };
    const { rows } = loanSheets({ ...all, results: all.results.map((r, i) => (i === 4 ? endedButKept : r)) })[1];
    assert.deepEqual(rows[5].slice(0, 5), ['Early', amount(408.03), null, null, format(island.results.paidOffBeforeChange, { payoffMonth: 2 })]);
  });

  it('lists an offer that cannot be worked out with all four payment cells empty', () => {
    assert.deepEqual(summary.rows[6], ['Broken', null, null, null, null, null, null, null, null, null, null, common.no]);
  });
});

describe('loan spreadsheet: a figure that does not exist', () => {
  const offers: Parameters<typeof exportOf>[0] = [['Never', NEVER], ['Kept', KEPT]];
  const atLimit: LoanResult = { ...result(NEVER), keptPayment: { outcome: 'limit', termMonths: 24 } };

  it('is an empty cell in the spreadsheet, so a column of numbers stays one', () => {
    for (const worded of [false, undefined]) {
      const row = loanSheets(exportOf(offers, { worded }))[1].rows[1];
      assert.deepEqual(row.slice(5), [null, null, amount(0), amount(0), null, null, common.yes]);
    }
  });

  it('is put in words for the printed report: not paid off, no finite total, no APR', () => {
    const { rows } = loanSheets(exportOf(offers, { worded: true }))[1];
    assert.deepEqual(rows[1].slice(5), [island.results.notPaidOff, island.results.noFiniteTotal, amount(0), amount(0), island.results.noFiniteTotal, island.results.notAvailable, common.yes]);
    // An offer that is paid off keeps its figures.
    assert.deepEqual(rows[2].slice(5), [whole(3), amount(36.32), amount(0), amount(0), amount(1236.32), pct(17.9802), common.yes]);
  });

  it('is worded as beyond the calculation limit when the loan is still being paid there', () => {
    const { rows } = loanSheets(exportOf(offers, { worded: true, results: [atLimit, result(KEPT)] }))[1];
    assert.deepEqual(rows[1].slice(5), [island.results.beyondLimit, island.results.notAvailable, amount(0), amount(0), island.results.notAvailable, island.results.notAvailable, common.yes]);
  });

  it('heads the APR column without its basis in the printed report, which says it under the table', () => {
    const { rows } = loanSheets(exportOf(offers, { worded: true }))[1];
    assert.deepEqual(rows[0][10], { t: x.aprPct, bold: true });
  });
});

describe('loan spreadsheet: an offer’s schedule sheet', () => {
  const scheduleHead = head(island.words.month, island.words.payment, island.words.interest, island.words.principal, x.balance);

  it('has every month’s payment, interest, principal and balance left', () => {
    const sheet = loanSheets(exportOf([['Bank A', FIXED]]))[3];
    assert.deepEqual(sheet.widths, [10, 16, 16, 16, 18]);
    assert.deepEqual(sheet.rows, [
      scheduleHead,
      [whole(1), amount(408.03), amount(12), amount(396.03), amount(803.97)],
      [whole(2), amount(408.03), amount(8.04), amount(399.99), amount(403.98)],
      [whole(3), amount(408.02), amount(4.04), amount(403.98), amount(0)],
    ]);
  });

  it('is the schedule with the new payment after a rate change', () => {
    assert.deepEqual(loanSheets(exportOf([['Bank A', FIXED], ['Bank B', RESET]]))[4].rows, [
      scheduleHead,
      [whole(1), amount(408.03), amount(12), amount(396.03), amount(803.97)],
      [whole(2), amount(414.08), amount(16.08), amount(398), amount(405.97)],
      [whole(3), amount(414.09), amount(8.12), amount(405.97), amount(0)],
    ]);
  });

  it('is the schedule with the lump sum in it, the one the totals use', () => {
    assert.deepEqual(loanSheets(exportOf([['Bank A', EARLY]]))[3].rows, [
      scheduleHead,
      [whole(1), amount(908.03), amount(12), amount(896.03), amount(303.97)],
      [whole(2), amount(307.01), amount(3.04), amount(303.97), amount(0)],
    ]);
  });

  it('shows the balance growing, month by month to the calculation limit, when the loan is never paid off', () => {
    const { rows } = loanSheets(exportOf([['Bank A', NEVER]]))[3];
    assert.deepEqual(rows.slice(1, 4), [
      [whole(1), amount(50), amount(0), amount(50), amount(1150)],
      [whole(2), amount(50), amount(57.5), amount(-7.5), amount(1157.5)],
      [whole(3), amount(50), amount(57.88), amount(-7.88), amount(1165.38)],
    ]);
    assert.equal(rows.length, 1201);
  });
});

describe('loan spreadsheet: currencies', () => {
  it('writes a currency without cents in whole units throughout', () => {
    // 120,001 yen (the amount typed, rounded to whole yen) at 12% over 3 months: 40,803 a month.
    // Interest 1,200 + 804 + 404 = 2,408; with the fee of 1,200 yen, 123,609 in all.
    const sheets = loanSheets(exportOf([['Bank A', offer({ principal: '120000.6', feeMajor: '1200' })]], { currency: 'JPY' }));
    assert.deepEqual(sheets[0].rows[3], [common.about.currency, 'JPY']);
    assert.deepEqual(sheets[1].rows[1].slice(0, 7), ['Bank A', yen(40803), whole(3), yen(2408), yen(1200), yen(0), yen(123609)]);
    assert.deepEqual(inputRow(sheets[2].rows, c.principal), [yen(120001)]);
    assert.deepEqual(sheets[3].rows.slice(1), [
      [whole(1), yen(40803), yen(1200), yen(39603), yen(80398)],
      [whole(2), yen(40803), yen(804), yen(39999), yen(40399)],
      [whole(3), yen(40803), yen(404), yen(40399), yen(0)],
    ]);
  });

  it('keeps rates and months in their own formats whatever the currency', () => {
    const sheets = loanSheets(exportOf([['Bank A', offer()]], { currency: 'JPY' }));
    assert.deepEqual(inputRow(sheets[2].rows, c.rate), [pct(12)]);
    assert.deepEqual(inputRow(sheets[2].rows, c.term), [whole(3)]);
  });
});
