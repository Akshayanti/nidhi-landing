/**
 * The five tools' spreadsheets and printed reports: each holds what the tool
 * computed, in every language, and the net worth copies never hold more than
 * their view shows.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES } from '../../i18n/config.ts';
import { DICTS } from '../../i18n/index.ts';
import { buildXlsx, typedRate, type Cell, type Sheet } from './xlsx.ts';
import { simulate } from '../monte-carlo/math.ts';
import { defaultState as monteCarloDefaults } from '../monte-carlo/url.ts';
import { monteCarloSheets } from '../monte-carlo/export.ts';
import { DEFAULT_VENDORS } from '../loan/url.ts';
import { computeFromInput } from '../loan/inputs.ts';
import { fromMinor } from '../loan/math.ts';
import { loanSheets } from '../loan/export.ts';
import { answerPath, whatItBuys } from '../inflation/math.ts';
import { defaultState as inflationDefaults } from '../inflation/url.ts';
import { inflationSheets } from '../inflation/export.ts';
import { aggregate, type AssetRow } from '../multi-currency-net-worth/math.ts';
import { netWorthSheets } from '../multi-currency-net-worth/export.ts';
import { monteCarloReport } from '../monte-carlo/report.ts';
import { loanReport } from '../loan/report.ts';
import { netWorthReport } from '../multi-currency-net-worth/report.ts';
import { byYearTable, cellLabel, isEmptyRow, tableOf, type Report } from './report.ts';
import { inflationReport } from '../inflation/report.ts';
import { compare, compareRange, type Inputs } from '../invest-or-pay-off/math.ts';
import { DEFAULTS as investDefaults } from '../invest-or-pay-off/url.ts';
import { investOrPayOffSheets } from '../invest-or-pay-off/export.ts';
import { investOrPayOffReport } from '../invest-or-pay-off/report.ts';

const DATE = '2026-10-28';
const PAGE = 'https://nidhi.today/free/tool/';

const num = (c: Cell): number => {
  assert.ok(c && typeof c === 'object' && 'n' in c, `not a number cell: ${JSON.stringify(c)}`);
  return c.n;
};
const sheet = (sheets: Sheet[], name: string) => {
  const s = sheets.find((x) => x.name === name);
  assert.ok(s, `no sheet ${name}`);
  return s;
};
/** Every sheet is one the writer accepts. */
const builds = (sheets: Sheet[]) => assert.ok(buildXlsx(sheets).length > 0);

describe('Monte Carlo spreadsheet', () => {
  const state = { ...monteCarloDefaults('EUR'), withdrawal: 30_000, withdrawYears: 25, paths: 1_000 };
  const result = simulate(state);

  it('keeps a typed fee with three decimals as typed', () => {
    const t = DICTS.en.tools;
    const typed = { ...state, feePct: 0.125 };
    const sheets = monteCarloSheets({ island: t.monteCarlo.island, common: t.export, state: typed, result, date: DATE, page: PAGE });
    const cells = sheets.flatMap((sh) => sh.rows.flat()).flatMap((c) => (typeof c === 'object' && c !== null && 'n' in c ? [c] : []));
    assert.ok(cells.some((c) => c.n === 0.125 && c.fmt === 'general'));
    assert.deepEqual(typedRate(0.5), { n: 0.5, fmt: 'decimal2' });
    assert.deepEqual(typedRate(7), { n: 7, fmt: 'decimal2' });
    assert.deepEqual(typedRate(0.07), { n: 0.07, fmt: 'decimal2' });
    assert.deepEqual(typedRate(1234.5), { n: 1234.5, fmt: 'decimal2' });
  });

  for (const locale of LOCALES) {
    it(`holds every year's spread as the simulation computed it (${locale})`, () => {
      const t = DICTS[locale].tools;
      const sheets = monteCarloSheets({ island: t.monteCarlo.island, common: t.export, state, result, date: DATE, page: PAGE });
      builds(sheets);
      const byYear = sheet(sheets, t.monteCarlo.island.export.sheets.byYear);
      assert.equal(byYear.rows.length, result.bands.length + 1);
      result.bands.forEach((b, year) => {
        const row = byYear.rows[year + 1];
        assert.deepEqual(row.map(num), [year, b.p10, b.p25, b.p50, b.p75, b.p90, result.straightLine[year]].map(Math.round));
      });
    });
  }
});

describe('loan comparison spreadsheet', () => {
  const currency = 'EUR';
  const results = DEFAULT_VENDORS.map((v) => computeFromInput(v, currency));

  it('keeps a typed rate with three decimals as typed, and a round one with two', () => {
    const t = DICTS.en.tools;
    const vendors = [{ ...DEFAULT_VENDORS[0], annualRatePct: '4.875' }, { ...DEFAULT_VENDORS[1], annualRatePct: '6.5' }];
    const typed = vendors.map((v) => computeFromInput(v, currency));
    const sheets = loanSheets({ island: t.loanComparison.island, common: t.export, currency, vendors, results: typed, names: ['A', 'B'], date: DATE, page: PAGE });
    const cells = sheets.flatMap((sh) => sh.rows.flat()).flatMap((c) => (typeof c === 'object' && c !== null && 'n' in c ? [c] : []));
    assert.ok(cells.some((c) => c.n === 4.875 && c.fmt === 'general'), 'the 4.875 cell is written as typed');
    assert.ok(cells.some((c) => c.n === 6.5 && c.fmt === 'decimal2'), 'a round rate keeps two decimals');
  });

  it('writes lump sums for reading, each amount as the page writes amounts', () => {
    const flat = (sheets: Sheet[]) => sheets.flatMap((sh) => sh.rows.flat()).filter((c): c is string => typeof c === 'string');
    const vendors = [{ ...DEFAULT_VENDORS[0], lumpSumsEncoded: '12:5000;36:3000.5' }, DEFAULT_VENDORS[1]];
    const typed = vendors.map((v) => computeFromInput(v, currency));
    const base = { common: DICTS.en.tools.export, currency, vendors, results: typed, names: ['A', 'B'], date: DATE, page: PAGE };
    const en = flat(loanSheets({ ...base, island: DICTS.en.tools.loanComparison.island, locale: 'en-US' }));
    assert.ok(en.includes('Month\u00a012: 5,000.00; Month\u00a036: 3,000.50'), en.filter((c) => c.includes('12')).join(' | '));
    assert.ok(!en.includes('12:5000;36:3000.5'), 'the box\'s own text is not what is printed');
    // The Czech page writes a decimal comma; so does its report.
    const cs = flat(loanSheets({ ...base, common: DICTS.cs.tools.export, island: DICTS.cs.tools.loanComparison.island, locale: 'cs-CZ' }));
    assert.ok(cs.some((c) => /12: 5\s000,00; .*36: 3\s000,50/.test(c)), cs.filter((c) => c.includes('000,')).join(' | '));
    // The printed report carries the same text.
    const report = loanReport({ ...base, island: DICTS.en.tools.loanComparison.island, answer: ['a'], locale: 'en-US' });
    assert.ok(JSON.stringify(report).includes('Month\u00a012: 5,000.00; Month\u00a036: 3,000.50'));
    // An offer with no lump sums has an empty cell, and text that does not read is left as typed.
    const odd = flat(loanSheets({ ...base, island: DICTS.en.tools.loanComparison.island, vendors: [{ ...vendors[0], lumpSumsEncoded: 'soon' }, vendors[1]] }));
    assert.ok(odd.includes('soon'));
  });

  for (const locale of LOCALES) {
    it(`holds each offer's totals and full schedule to the cent (${locale})`, () => {
      const t = DICTS[locale].tools;
      const names = DEFAULT_VENDORS.map((_, i) => `Offer ${i + 1}`);
      const sheets = loanSheets({ island: t.loanComparison.island, common: t.export, currency, vendors: DEFAULT_VENDORS, results, names, date: DATE, page: PAGE });
      builds(sheets);
      // The APR column says which basis it holds.
      assert.ok(String((sheet(sheets, t.loanComparison.island.export.sheets.summary).rows[0][7] as { t: string }).t).includes(t.loanComparison.island.results.aprBasis));
      const summary = sheet(sheets, t.loanComparison.island.export.sheets.summary);
      results.forEach((r, i) => {
        const row = summary.rows[i + 1];
        assert.equal(num(row[1]), fromMinor(r.effectiveMonthlyMinor, currency));
        assert.equal(num(row[6]), fromMinor(r.totalPaidMinor, currency));
        const schedule = sheet(sheets, names[i]);
        assert.equal(schedule.rows.length, r.schedule.length + 1);
        const last = schedule.rows[schedule.rows.length - 1];
        assert.equal(num(last[4]), fromMinor(r.schedule[r.schedule.length - 1].balance, currency));
      });
    });
  }
});

describe('inflation spreadsheet', () => {
  const state = inflationDefaults('EUR', '');

  it('keeps a typed rate with three decimals as typed, and the worked-out rate at two', () => {
    const t = DICTS.en.tools;
    const typed = { ...state, mode: 'keep' as const, rate: 2.375, growth: 4.125 };
    const sheets = inflationSheets({
      island: t.inflation.island,
      common: t.export,
      state: typed,
      answer: { question: 'q', sentences: ['s'], value: 1.709401709, points: [{ x: 0, value: 1 }], axis: 'x', chartTitle: 'title', history: null },
      decimals: 2,
      date: DATE,
      page: PAGE,
    });
    const cells = sheets.flatMap((sh) => sh.rows.flat()).flatMap((c) => (typeof c === 'object' && c !== null && 'n' in c ? [c] : []));
    assert.ok(cells.some((c) => c.n === 2.375 && c.fmt === 'general'), 'the typed inflation rate');
    assert.ok(cells.some((c) => c.n === 4.125 && c.fmt === 'general'), 'the typed growth rate');
    assert.ok(cells.some((c) => c.n === 1.709401709 && c.fmt === 'decimal2'), 'a computed rate is shown at two decimals');
  });

  for (const locale of LOCALES) {
    it(`holds the answer and the chart's path (${locale})`, () => {
      const t = DICTS[locale].tools;
      const points = answerPath('buy', state.amount, state.rate, state.years).map((value, x) => ({ x, value }));
      const value = whatItBuys(state.amount, state.rate, state.years);
      const sheets = inflationSheets({
        island: t.inflation.island,
        common: t.export,
        state: { ...state, mode: 'buy' },
        answer: { question: 'q', sentences: ['s'], value, points, axis: 'x', chartTitle: 'title', history: null },
        decimals: 2,
        date: DATE,
        page: PAGE,
      });
      builds(sheets);
      const byYear = sheet(sheets, t.inflation.island.export.sheets.byYear);
      assert.equal(byYear.rows.length, points.length + 2);
      assert.equal(num(byYear.rows[byYear.rows.length - 1][1]), Number(points[points.length - 1].value.toFixed(2)));
      const answer = sheet(sheets, t.inflation.island.export.sheets.answer);
      assert.equal(num(answer.rows[2][1]), Number(value.toFixed(2)));
    });
  }
});

describe('net worth spreadsheet', () => {
  const rows: AssetRow[] = [
    { name: '=Savings', value: '12345.67', currency: 'EUR', type: 'asset' },
    { name: 'Flat', value: '2500000', currency: 'INR', type: 'asset' },
    { name: 'Loan', value: '400000', currency: 'INR', type: 'liability' },
  ];
  const rates = { EUR: 1, INR: 90 };
  const result = aggregate(rows, 'EUR', rates);
  const t = DICTS.en.tools;
  const base = { island: t.multiCurrencyNetWorth.island, common: t.export, functionalCurrency: 'EUR', result, riskLabel: (l: string) => l, date: DATE, page: PAGE };

  it('holds the rows, the positions and the total for the reader’s own data', () => {
    const sheets = netWorthSheets({ ...base, rows, rates, showAmounts: true });
    builds(sheets);
    const inputs = sheet(sheets, t.export.sheets.inputs);
    assert.equal(inputs.rows[1][0], '=Savings');
    const byCurrency = sheet(sheets, t.multiCurrencyNetWorth.island.export.sheets.byCurrency);
    const total = byCurrency.rows.find((r) => r[0] && typeof r[0] === 'object' && 't' in r[0] && r[0].t === t.multiCurrencyNetWorth.island.results.totalLabel)!;
    assert.equal(num(total[3]), Number(result.totalNetWorthFunctional.toFixed(2)));
    assert.ok(sheets.some((s) => s.name === t.multiCurrencyNetWorth.island.export.sheets.rates));
  });

  it('holds no amount at all for a view that hides them', () => {
    const hidden = { ...result, positions: result.positions.map((p) => ({ ...p, netAmountOriginal: 0, netAmountFunctional: 0 })), totalNetWorthFunctional: 0, hasRates: 'none' as const };
    const sheets = netWorthSheets({ ...base, result: hidden, rows: null, rates: null, showAmounts: false });
    builds(sheets);
    assert.deepEqual(sheets.map((s) => s.name), [t.export.sheets.about, t.multiCurrencyNetWorth.island.export.sheets.byCurrency]);
    const byCurrency = sheets[1];
    for (const row of byCurrency.rows.slice(1)) {
      // Currency name, code, concentration, exposure, risk: the two percentages are the only numbers.
      assert.equal(row.length, 5);
      assert.ok(row.filter((c) => c && typeof c === 'object' && 'n' in c).every((c) => (c as { fmt?: string }).fmt === 'decimal2'));
    }
  });
});

describe('net worth with every rate missing (#795)', () => {
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
    { name: 'Fund', value: '3000', currency: 'CZK', type: 'asset' },
  ];
  const senders = { 'no answer': null, 'an answer without them': { EUR: 1 } as Record<string, number> };

  for (const locale of LOCALES) {
    const t = DICTS[locale].tools;
    const island = t.multiCurrencyNetWorth.island;
    const x = island.export as typeof island.export & { meaningShares?: string; meaningRates?: string };
    const [, shareSentence, rateSentence] = x.meaningShares ? ['', x.meaningShares, x.meaningRates!] : x.meaning.split(/(?<=[.।]) /);
    const told = (result: ReturnType<typeof aggregate>, showAmounts: boolean) => {
      const base = { island, common: t.export, functionalCurrency: 'EUR', result, riskLabel: (l: string) => l, rows: null, rates: null, showAmounts };
      const table = sheet(netWorthSheets({ ...base, date: DATE, page: PAGE }), island.export.sheets.byCurrency).rows;
      return { table, words: table.flat().map((c) => (c && typeof c === 'object' && 't' in c ? c.t : c)), report: netWorthReport({ ...base, answer: ['a'] }) };
    };

    for (const [name, rates] of Object.entries(senders)) {
      it(`${locale}, ${name}: original amounts, no total, share, band, bar or sentence about them`, () => {
        const { table, words, report } = told(aggregate(rows, 'EUR', rates), true);
        const gone = [x.sharePct, x.exposurePct, island.chart.tableColRisk, island.results.totalLabel, island.results.totalPartial];
        for (const word of gone) assert.ok(!words.includes(word), `${word} is still there`);
        assert.equal(num(table.find((r) => r[1] === 'CZK')![2]), 3000, 'the original amount stays');
        assert.ok(words.includes(island.results.rateUnavailable), 'nothing says why');
        assert.equal(report.chart, null);
        assert.ok(!report.meaning.includes(shareSentence), 'explains shares it does not show');
        assert.ok(!report.meaning.includes(rateSentence), 'says amounts were converted');
      });
    }

    it(`${locale}: some rates missing explain no share, and still the conversion`, () => {
      const some = [...rows, { name: 'Shares', value: '2000', currency: 'USD', type: 'asset' } as AssetRow];
      const { report } = told(aggregate(some, 'EUR', { EUR: 1, USD: 1.1 }), true);
      assert.ok(!report.meaning.includes(shareSentence), 'explains shares it does not show');
      assert.ok(report.meaning.includes(rateSentence));
    });

    it(`${locale}: a view without amounts is not this case`, () => {
      const whole = aggregate(rows, 'EUR', { EUR: 1, CZK: 24 });
      const { words, report } = told({ ...whole, hasRates: 'none', totalNetWorthFunctional: 0 }, false);
      assert.ok(words.includes(x.sharePct));
      assert.ok(report.meaning.includes(shareSentence));
    });
  }
});

describe('net worth with a missing rate (#795)', () => {
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
    { name: 'Shares', value: '2000', currency: 'USD', type: 'asset' },
    { name: 'Fund', value: '3000', currency: 'CZK', type: 'asset' },
  ];
  const rates = { EUR: 1, USD: 1.1 };
  const result = aggregate(rows, 'EUR', rates);

  for (const locale of LOCALES) {
    const t = DICTS[locale].tools;
    const island = t.multiCurrencyNetWorth.island;
    const words = island.results as typeof island.results & { totalPartial?: string; announcePartial?: string };
    const base = { island, common: t.export, functionalCurrency: 'EUR', result, riskLabel: (l: string) => l };

    it(`${locale}: the workbook names a subtotal and states no share or band`, () => {
      assert.ok(words.totalPartial, 'no subtotal label');
      for (const shared of [false, true]) {
        const sheets = netWorthSheets({ ...base, rows: shared ? null : rows, rates: shared ? null : rates, showAmounts: true, date: DATE, page: PAGE });
        const table = sheet(sheets, island.export.sheets.byCurrency).rows;
        const words_ = table.flat().map((c) => (c && typeof c === 'object' && 't' in c ? c.t : c));
        for (const gone of [island.export.sharePct, island.export.exposurePct, island.chart.tableColRisk, island.results.totalLabel]) {
          assert.ok(!words_.includes(gone), `${gone} is still there`);
        }
        assert.ok(words_.includes(words.totalPartial!));
        assert.ok(words_.includes(island.results.partialHint));
        assert.equal(num(table.find((r) => r[1] === 'CZK')![2]), 3000, 'the original amount stays');
      }
    });

    it(`${locale}: the report draws no bars`, () => {
      assert.equal(netWorthReport({ ...base, rows, rates, showAmounts: true, answer: ['a'] }).chart, null);
    });

    it(`${locale}: the subtotal is announced under its own label`, () => {
      const end = locale === 'hi' ? '।' : '.';
      assert.equal(words.announcePartial?.replace(/\u00a0/g, ' '), `${words.totalPartial?.replace(/\u00a0/g, ' ')}: {total}${end}`);
    });
  }
});

/** The invest or pay off tool's defaults as the maths takes them, with a typed inflation figure. */
const investInputs = (over: Partial<Inputs> = {}): Inputs => ({
  balance: investDefaults.balance,
  debtRate: investDefaults.debtRate,
  payment: investDefaults.payment,
  extra: investDefaults.extra,
  relief: investDefaults.relief,
  inflation: 2.5,
  returns: investDefaults.returns,
  ownReturn: investDefaults.ownReturn,
  feePct: investDefaults.feePct,
  gainsTax: investDefaults.gainsTax,
  horizon: investDefaults.horizon,
  ...over,
});

describe('invest or pay off spreadsheet', () => {
  const inputs = investInputs();
  const result = compare(inputs, { paths: 500 });
  const two = (v: number) => Number(v.toFixed(2));

  for (const locale of LOCALES) {
    it(`holds both paths, the gap and what was entered (${locale})`, () => {
      const t = DICTS[locale].tools;
      const island = t.investOrPayOff.island;
      const sheets = investOrPayOffSheets({ island, common: t.export, currency: 'EUR', shown: { inputs, result, range: null, inflationSource: null, lines: ['line'] }, decimals: 2, date: DATE, page: PAGE });
      builds(sheets);
      // No range sheet unless the page shows the range.
      assert.deepEqual(sheets.map((s) => s.name), [t.export.sheets.about, t.export.sheets.inputs, island.export.sheets.result]);
      const res = sheet(sheets, island.export.sheets.result);
      assert.deepEqual(res.rows[1].slice(1).map(num), [two(result.a.p10), two(result.a.p50), two(result.a.p90)]);
      assert.deepEqual(res.rows[2].slice(1).map(num), [two(result.b.p10), two(result.b.p50), two(result.b.p90)]);
      assert.deepEqual(res.rows[3].slice(1).map(num), [two(result.diff.p10), two(result.diff.p50), two(result.diff.p90)]);
      assert.equal(res.rows[1][0], island.results.payoffPath);
      assert.equal(res.rows[2][0], island.results.investPath);
      assert.equal(num(res.rows[5][1]), Math.round(result.bAhead * 100));
      assert.equal(num(res.rows[6][1]), result.months);
      assert.equal(num(res.rows[7][1]), result.paths);
      const entered = sheet(sheets, t.export.sheets.inputs);
      assert.equal(num(entered.rows[1][1]), inputs.balance);
      assert.equal(num(entered.rows[2][1]), inputs.debtRate);
      // The reader's own return has a row only when it is the one in use.
      assert.ok(!entered.rows.some((row) => row[0] === island.fields.ownReturn));
    });
  }

  it('adds the range beside the reader\'s own return, and the row for that return', () => {
    const t = DICTS.en.tools;
    const island = t.investOrPayOff.island;
    const own = investInputs({ returns: 'own', ownReturn: 12 });
    const ownResult = compare(own, { paths: 500 });
    const range = compareRange(own, { paths: 500 });
    const sheets = investOrPayOffSheets({ island, common: t.export, currency: 'EUR', shown: { inputs: own, result: ownResult, range, inflationSource: 'World Bank', lines: ['line'] }, decimals: 2, date: DATE, page: PAGE });
    builds(sheets);
    const r = sheet(sheets, island.export.sheets.range);
    assert.equal(r.rows.length, 4);
    assert.equal(num(r.rows[2][1]), Math.round(range.cautious.bAhead * 100));
    assert.equal(num(r.rows[3][2]), two(range.optimistic.diff.p50));
    const entered = sheet(sheets, t.export.sheets.inputs);
    assert.ok(entered.rows.some((row) => row[0] === island.fields.ownReturn && num(row[1]) === 12));
    assert.ok(entered.rows.some((row) => row[1] === 'World Bank'));
  });

  it('keeps a sentence that starts with "=" as text', () => {
    const t = DICTS.en.tools;
    const sheets = investOrPayOffSheets({ island: t.investOrPayOff.island, common: t.export, currency: 'EUR', shown: { inputs, result, range: null, inflationSource: '=1+1', lines: ['=SUM(A1)'] }, decimals: 2, date: DATE, page: PAGE });
    builds(sheets);
    const cells = sheets.flatMap((sh) => sh.rows.flat());
    // Text goes into the file as text: the writer has no formula cell at all.
    assert.ok(cells.includes('=SUM(A1)') && cells.includes('=1+1'));
    assert.ok(cells.every((c) => c === null || typeof c !== 'object' || 't' in c || 'n' in c));
  });
});

describe('report helpers', () => {
  const head: Cell[] = [{ t: 'Year', bold: true }, 'Value', null];
  it('reads a header cell of either kind', () => {
    assert.deepEqual(head.map(cellLabel), ['Year', 'Value', '']);
  });
  it('turns a sheet into a table, dropping empty rows and the ones it is told to', () => {
    const table = tableOf({ name: 's', rows: [head, ['a', 1], [], ['b', 2], ['c', 3]] }, { caption: 'cap', keep: (row) => row[0] !== 'c' });
    assert.deepEqual(table.head, ['Year', 'Value', '']);
    assert.deepEqual(table.rows, [['a', 1], ['b', 2]]);
    assert.equal(table.caption, 'cap');
  });
  it('prints a short by-year table whole and a long one every fifth year and the last', () => {
    const rows = (n: number): Cell[][] => Array.from({ length: n }, (_, i) => [i, i * 2]);
    const short = byYearTable(head, rows(31), 'cap', 'note');
    assert.equal(short.rows.length, 31);
    assert.equal(short.note, undefined);
    const long = byYearTable(head, rows(42), 'cap', 'note');
    assert.deepEqual(long.rows.map((r) => r[0]), [0, 5, 10, 15, 20, 25, 30, 35, 40, 41]);
    assert.equal(long.note, 'note');
  });
});

describe('printed reports', () => {
  const allCells = (r: Report) => [...(r.entered ? [r.entered] : []), ...r.tables, ...(r.assumptionTable ? [r.assumptionTable] : [])].flatMap((t) => t.rows.flat());

  for (const locale of LOCALES) {
    it(`each tool builds a report in every language (${locale})`, () => {
      const t = DICTS[locale].tools;
      const mcState = { ...monteCarloDefaults('EUR'), paths: 1_000 };
      const mc = monteCarloReport({ island: t.monteCarlo.island, common: t.export, state: mcState, result: simulate(mcState), answer: ['a'] });
      // Every fifth year and the last, never every year.
      assert.ok(mc.tables[0].rows.length <= Math.ceil(mcState.saveYears / 5) + 2);
      const results = DEFAULT_VENDORS.map((v) => computeFromInput(v, 'EUR'));
      const loan = loanReport({ island: t.loanComparison.island, common: t.export, currency: 'EUR', vendors: DEFAULT_VENDORS, results, names: ['A', 'B'], answer: ['a'] });
      // No month-by-month schedule: the comparison table is the only table.
      assert.equal(loan.tables.length, 1);
      // The APR heading is short on paper; its basis is a line under the
      // table, and the table stacks on narrow paper (#646).
      assert.ok(loan.tables[0].head.includes(t.loanComparison.island.export.aprPct));
      assert.ok(loan.tables[0].head.every((h) => !h.includes(t.loanComparison.island.results.aprBasis)));
      assert.deepEqual(loan.tables[0].note, [t.loanComparison.island.delta.aprNote, t.loanComparison.island.export.schedulesNote]);
      assert.equal(loan.tables[0].stack, true);
      // Optional fields left at zero are left out of what was entered.
      assert.ok(loan.entered!.rows.every((row) => !isEmptyRow(row)));

      const infState = { ...inflationDefaults('EUR', ''), mode: 'buy' as const, years: 40 };
      const points = answerPath('buy', infState.amount, infState.rate, infState.years).map((value, x) => ({ x, value }));
      const inflation = inflationReport({
        island: t.inflation.island,
        common: t.export,
        state: infState,
        answer: { question: 'q', sentences: ['s'], value: whatItBuys(infState.amount, infState.rate, infState.years), points, axis: 'x', chartTitle: 'title', history: null },
        decimals: 2,
        lines: ['a'],
        method: 'm',
      });
      // Forty-one years: every fifth and the last, with the line that says so.
      assert.equal(inflation.tables[0].rows.length, 9);
      assert.equal(inflation.tables[0].note, t.export.report.sampled);
      assert.equal(inflation.tables[0].head.length, 2);
      assert.deepEqual(inflation.assumptions, ['m']);

      const invInputs = investInputs();
      const invResult = compare(invInputs, { paths: 500 });
      const invest = investOrPayOffReport({ island: t.investOrPayOff.island, common: t.export, currency: 'EUR', shown: { inputs: invInputs, result: invResult, range: null, inflationSource: null, lines: ['a'] }, decimals: 2 });
      // Both paths and the gap, nothing of the rows under them.
      assert.equal(invest.tables.length, 1);
      assert.equal(invest.tables[0].rows.length, 3);
      assert.ok(invest.chart?.kind === 'bars');
      assert.equal(invest.chart.bars[0].share + invest.chart.bars[1].share, 100);
      assert.equal(invest.chart.bars[0].share, Math.round(invResult.bAhead * 100));
      assert.deepEqual(invest.answer, ['a']);

      for (const r of [mc, loan, inflation, invest]) assert.ok(r.meaning && r.tool && r.chart && r.entered && r.entered.rows.length > 0);
    });
  }

  it('a shared net worth view that hides amounts prints no amount', () => {
    const rows: AssetRow[] = [
      { name: 'Flat', value: '2500000', currency: 'INR', type: 'asset' },
      { name: 'Savings', value: '12345.67', currency: 'EUR', type: 'asset' },
    ];
    const t = DICTS.en.tools;
    const result = aggregate(rows, 'EUR', { EUR: 1, INR: 90 });
    const hidden = { ...result, positions: result.positions.map((p) => ({ ...p, netAmountOriginal: 0, netAmountFunctional: 0 })), totalNetWorthFunctional: 0 };
    const report = netWorthReport({ island: t.multiCurrencyNetWorth.island, common: t.export, functionalCurrency: 'EUR', result: hidden, rows: null, rates: null, showAmounts: false, riskLabel: (l) => l, answer: ['Total net worth: Hidden'] });
    assert.equal(report.entered, null);
    // Shares are the only numbers, as in the spreadsheet.
    for (const c of allCells(report)) {
      if (c && typeof c === 'object' && 'n' in c) assert.equal(c.fmt, 'decimal2');
    }
    assert.equal(report.chart?.kind, 'bars');
  });
});

describe('printed report styles', () => {
  it('lets a heading over a number column wrap', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../../styles/tools.css', import.meta.url), 'utf8');
    assert.match(css, /th\.tool-reportNum\s*\{\s*white-space:\s*normal;/);
  });
  it('stacks a wide table on narrow paper, with each heading beside its value', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../../styles/tools.css', import.meta.url), 'utf8');
    assert.match(css, /@media \(max-width: 600px\) \{\s*\.tool-reportTable--stack,/);
    // The heading is text in the cell, never an attribute: it can be a typed name.
    assert.match(css, /\.tool-reportTable--stack \.tool-reportLabel\s*\{\s*display:\s*block;/);
    const tsx = readFileSync(new URL('../../components/ToolExport.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(tsx, /data-label/);
    // The report is not hidden from assistive technology on paper (#650).
    assert.doesNotMatch(tsx, /className="tool-report" aria-hidden/);
  });
});
