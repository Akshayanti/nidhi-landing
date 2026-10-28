/**
 * The four tools' spreadsheets and printed reports: each holds what the tool
 * computed, in every language, and the net worth copies never hold more than
 * their view shows.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES } from '../../i18n/config.ts';
import { DICTS } from '../../i18n/index.ts';
import { buildXlsx, type Cell, type Sheet } from './xlsx.ts';
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
import { isEmptyRow, type Report } from './report.ts';

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

  for (const locale of LOCALES) {
    it(`holds each offer's totals and full schedule to the cent (${locale})`, () => {
      const t = DICTS[locale].tools;
      const names = DEFAULT_VENDORS.map((_, i) => `Offer ${i + 1}`);
      const sheets = loanSheets({ island: t.loanComparison.island, common: t.export, currency, vendors: DEFAULT_VENDORS, results, names, date: DATE, page: PAGE });
      builds(sheets);
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
      // Currency name, code, share, risk: the share is the only number.
      assert.equal(row.length, 4);
      assert.ok(row.filter((c) => c && typeof c === 'object' && 'n' in c).every((c) => (c as { fmt?: string }).fmt === 'decimal2'));
    }
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
      // Optional fields left at zero are left out of what was entered.
      assert.ok(loan.entered!.rows.every((row) => !isEmptyRow(row)));
      for (const r of [mc, loan]) assert.ok(r.meaning && r.tool && r.chart);
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
