/**
 * The net worth calculator's printed report (report.ts): the answer, what it
 * means, the rows entered, the table by currency, the rates and the bars,
 * against holdings small enough to add up on paper.
 *
 * The rates are round: one euro buys 2 US dollars and 200 yen. Every expected
 * figure is written out here from those, never read back from the report.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS } from '../../i18n/index.ts';
import type { AggregationResult, AssetRow, CurrencyPosition } from './math.ts';
import { aggregate } from './math.ts';
import type { NetWorthExport } from './export.ts';
import { netWorthReport } from './report.ts';

const t = DICTS.en.tools;
const island = t.multiCurrencyNetWorth.island;
const common = t.export;
const x = island.export;
const ANSWER = ['Total net worth: €3,000.00', 'A second paragraph'];

const RATES = { EUR: 1, USD: 2, JPY: 200 };

/** In euros: 1,000.50 less 500.50 owed is 500; 4,000 dollars is 2,000; 100,000 yen is 500. Net worth 3,000. */
const ROWS: AssetRow[] = [
  { name: 'Savings', value: '1,000.50', currency: 'EUR', type: 'asset' },
  { name: 'Shares', value: '4000', currency: 'USD', type: 'asset' },
  { name: '', value: '', currency: 'EUR', type: 'asset' },
  { name: 'Yen account', value: '100000', currency: 'JPY', type: 'asset' },
  { name: 'Card', value: '500.50', currency: 'EUR', type: 'liability' },
];

const base = { island, common, functionalCurrency: 'EUR', riskLabel: (level: string) => `band:${level}`, answer: ANSWER };
const own = (rows: AssetRow[], rates: Record<string, number> | null, over: Partial<NetWorthExport> = {}) =>
  netWorthReport({ ...base, result: aggregate(rows, 'EUR', rates), rows, rates, showAmounts: true, ...over });

const eur = (n: number) => ({ n, fmt: 'amount2' });
const usd = eur;
const jpy = (n: number) => ({ n, fmt: 'amount0' });
const pct = (n: number) => ({ n, fmt: 'decimal2' });
const EURO = 'Euro (EUR)';
const DOLLAR = 'US Dollar (USD)';
const YEN = 'Japanese Yen (JPY)';
const KORUNA = 'Czech Koruna (CZK)';
const NO_RATE = 'Rate unavailable';

const MEANING = 'Net worth is what you own minus what you owe.';
const SHARES = 'Each currency’s share shows how much of it moves when that currency rises or falls against the one you spend in.';
const CONVERTED = 'Amounts in other currencies are converted at the rates loaded on the page, which change every day.';

/** A position as a link without amounts gives it: a share and a band, nothing else. */
const shareOnly = (code: string, pctOfTotal: number, riskLevel: CurrencyPosition['riskLevel'], more: Partial<CurrencyPosition> = {}): CurrencyPosition => ({
  code, netAmountOriginal: 0, netAmountFunctional: 0, pctOfTotal, isFunctional: riskLevel === 'functional', riskLevel, riskLabel: '', ...more,
});
const hidden = (result: AggregationResult) => netWorthReport({ ...base, result, rows: null, rates: null, showAmounts: false });

describe('net worth report: the reader’s own list, every rate known', () => {
  const report = own(ROWS, RATES);

  it('is titled with the tool, in the spending currency, and opens with the page’s answer', () => {
    assert.equal(report.tool, 'Net worth calculator');
    assert.equal(report.currency, 'EUR');
    assert.deepEqual(report.answer, ANSWER);
  });

  it('explains net worth, what a share shows, and that amounts were converted', () => {
    assert.equal(report.meaning, `${MEANING} ${SHARES} ${CONVERTED}`);
    assert.equal(MEANING, x.meaning);
    assert.equal(SHARES, x.meaningShares);
    assert.equal(CONVERTED, x.meaningRates);
  });

  it('prints the rows that hold an amount', () => {
    assert.deepEqual(report.entered, {
      caption: undefined,
      head: ['Name', 'Value', 'Currency', 'Type'],
      rows: [
        ['Savings', eur(1000.5), 'EUR', 'Asset'],
        ['Shares', usd(4000), 'USD', 'Asset'],
        ['Yen account', jpy(100000), 'JPY', 'Asset'],
        ['Card', eur(500.5), 'EUR', 'Liability'],
      ],
      note: undefined,
    });
  });

  it('prints the table by currency, stacked on narrow paper, and then the rates', () => {
    assert.deepEqual(report.tables, [
      {
        caption: 'By currency',
        head: ['Currency', 'Code', 'Net, in its own currency', 'Net, in EUR', 'Concentration, %', 'Exposure, % of net worth', 'Share band'],
        rows: [
          [EURO, 'EUR', eur(500), eur(500), pct(16.67), pct(16.67), 'band:functional'],
          [DOLLAR, 'USD', usd(4000), eur(2000), pct(66.67), pct(66.67), 'band:elevated'],
          [YEN, 'JPY', jpy(100000), eur(500), pct(16.67), pct(16.67), 'band:low'],
          [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(3000)],
        ],
        note: undefined,
        stack: true,
      },
      {
        caption: 'Rates',
        head: ['Currency', 'Code', 'Units per 1 EUR'],
        rows: [
          [DOLLAR, 'USD', { n: 2, fmt: 'general' }],
          [YEN, 'JPY', { n: 200, fmt: 'general' }],
        ],
      },
    ]);
  });

  it('draws one bar for each currency, its share of the 3,000', () => {
    assert.deepEqual(report.chart, {
      kind: 'bars',
      title: 'Currency concentration',
      bars: [
        { label: EURO, share: (500 / 3000) * 100 },
        { label: DOLLAR, share: (2000 / 3000) * 100 },
        { label: YEN, share: (500 / 3000) * 100 },
      ],
    });
  });

  it('says where the rates come from, and that this is not advice', () => {
    assert.deepEqual(report.assumptions, [x.ratesText, island.results.disclaimer]);
  });

  it('names currencies on the bars in the page’s language', () => {
    const es = DICTS.es.tools;
    const spanish = netWorthReport({ ...base, island: es.multiCurrencyNetWorth.island, common: es.export, result: aggregate(ROWS, 'EUR', RATES), rows: ROWS, rates: RATES, showAmounts: true });
    assert.ok(spanish.chart?.kind === 'bars');
    assert.deepEqual(spanish.chart.bars.map((b) => b.label), ['EUR', 'USD', 'JPY'].map((code) => (es.multiCurrencyNetWorth.island.currencies as Record<string, string>)[code]));
    assert.equal(spanish.entered?.head[0], es.multiCurrencyNetWorth.island.table.colName);
  });
});

describe('net worth report: a debt in another currency', () => {
  it('the bars are concentration, which adds to 100, not exposure', () => {
    // 1,000 euros, and 1,000 dollars owed (500 euros): sizes 1,000 and 500 of 1,500.
    const report = own([
      { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
      { name: 'Loan', value: '1000', currency: 'USD', type: 'liability' },
    ], RATES);
    assert.ok(report.chart?.kind === 'bars');
    assert.deepEqual(report.chart.bars, [
      { label: EURO, share: (1000 / 1500) * 100 },
      { label: DOLLAR, share: (500 / 1500) * 100 },
    ]);
  });
});

describe('net worth report: everything in the spending currency', () => {
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000.50', currency: 'EUR', type: 'asset' },
    { name: 'Card', value: '200.25', currency: 'EUR', type: 'liability' },
  ];

  it('has no bars, no rates and no word about conversion, with what is owned and owed in the table', () => {
    const report = own(rows, RATES);
    assert.ok(report.chart === null);
    assert.equal(report.meaning, `${MEANING} ${SHARES}`);
    assert.deepEqual(report.assumptions, [island.results.disclaimer]);
    assert.equal(report.tables.length, 1);
    assert.deepEqual(report.tables[0].rows, [
      [EURO, 'EUR', eur(800.25), eur(800.25), pct(100), pct(100), 'band:functional'],
      [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(800.25)],
      ['What you own', 'EUR', null, eur(1000.5)],
      ['What you owe', 'EUR', null, eur(200.25)],
    ]);
  });
});

describe('net worth report: a rate is missing (#795)', () => {
  // 1,000 euros, 2,000 dollars (1,000 euros) and 3,000 koruna with no rate.
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
    { name: 'Fund', value: '3000', currency: 'CZK', type: 'asset' },
    { name: 'Shares', value: '2000', currency: 'USD', type: 'asset' },
  ];

  it('one of two: no bars of a subtotal, no sentence about shares, and the subtotal with its note', () => {
    const report = own(rows, RATES);
    assert.ok(report.chart === null);
    assert.equal(report.meaning, `${MEANING} ${CONVERTED}`);
    assert.deepEqual(report.tables, [
      {
        caption: 'By currency',
        head: ['Currency', 'Code', 'Net, in its own currency', 'Net, in EUR'],
        rows: [
          [EURO, 'EUR', eur(1000), eur(1000)],
          [DOLLAR, 'USD', usd(2000), eur(1000)],
          [KORUNA, 'CZK', eur(3000), NO_RATE],
          [{ t: 'Total excluding currencies with missing rates', bold: true }, 'EUR', null, eur(2000)],
          [island.results.partialHint],
        ],
        note: undefined,
        stack: true,
      },
      {
        caption: 'Rates',
        head: ['Currency', 'Code', 'Units per 1 EUR'],
        rows: [[DOLLAR, 'USD', { n: 2, fmt: 'general' }], [KORUNA, 'CZK', NO_RATE]],
      },
    ]);
    assert.deepEqual(report.assumptions, [x.ratesText, island.results.disclaimer]);
  });

  it('every other currency’s: nothing was converted, and the report does not say it was', () => {
    for (const rates of [{ EUR: 1 }, null]) {
      const report = own(rows.slice(0, 2), rates);
      assert.ok(report.chart === null);
      assert.equal(report.meaning, MEANING);
    }
    assert.deepEqual(own(rows.slice(0, 2), null).assumptions, [island.results.disclaimer]);
    assert.equal(own(rows.slice(0, 2), null).tables.length, 1);
  });
});

describe('net worth report: nothing entered', () => {
  it('has the answer and the meaning, and nothing to tabulate or draw', () => {
    assert.deepEqual(own([], RATES), {
      tool: 'Net worth calculator',
      currency: 'EUR',
      answer: ANSWER,
      meaning: `${MEANING} ${SHARES} ${CONVERTED}`,
      entered: null,
      chart: null,
      tables: [],
      assumptions: [],
    });
  });

  it('with no rates loaded it does not say amounts were converted', () => {
    assert.equal(own([], null).meaning, `${MEANING} ${SHARES}`);
  });
});

describe('net worth report: a shared view that hides amounts', () => {
  const result: AggregationResult = {
    positions: [shareOnly('EUR', 62.5, 'functional'), shareOnly('USD', 25, 'moderate'), shareOnly('JPY', 12.5, 'low')],
    totalNetWorthFunctional: 0,
    hasRates: 'none',
  };

  it('prints currencies, shares and bands, and no row that was entered', () => {
    const report = hidden(result);
    assert.ok(report.entered === null);
    assert.equal(report.meaning, `${MEANING} ${SHARES}`);
    assert.deepEqual(report.tables, [{
      caption: 'By currency',
      head: ['Currency', 'Code', 'Concentration, %', 'Exposure, % of net worth', 'Share band'],
      rows: [
        [EURO, 'EUR', pct(62.5), pct(62.5), 'band:functional'],
        [DOLLAR, 'USD', pct(25), pct(25), 'band:moderate'],
        [YEN, 'JPY', pct(12.5), pct(12.5), 'band:low'],
      ],
      note: undefined,
      stack: true,
    }]);
    assert.deepEqual(report.assumptions, [island.results.disclaimer]);
  });

  it('draws the bars from the shares the link carries', () => {
    assert.deepEqual(hidden(result).chart, {
      kind: 'bars',
      title: island.chart.heading,
      bars: [{ label: EURO, share: 62.5 }, { label: DOLLAR, share: 25 }, { label: YEN, share: 12.5 }],
    });
  });

  it('draws no bar for a currency flagged as having no rate', () => {
    const report = hidden({ ...result, positions: [shareOnly('EUR', 60, 'functional'), shareOnly('USD', 20, 'low'), shareOnly('JPY', 0, 'low', { rateUnavailable: true })] });
    assert.ok(report.chart?.kind === 'bars');
    // 60 and 20 of 80.
    assert.deepEqual(report.chart.bars, [{ label: EURO, share: 75 }, { label: DOLLAR, share: 25 }]);
  });

  it('draws no chart at all when no currency has a share to draw', () => {
    const report = hidden({ ...result, positions: [shareOnly('USD', 0, 'low', { rateUnavailable: true }), shareOnly('JPY', 0, 'low', { rateUnavailable: true })] });
    assert.ok(report.chart === null);
    assert.equal(report.tables.length, 1);
  });
});
