/**
 * The net worth calculator's spreadsheet (export.ts), sheet by sheet and cell
 * by cell, against holdings small enough to add up on paper.
 *
 * The rates are round: one euro buys 2 US dollars and 200 yen. Every expected
 * figure is written out here from those, never read back from the workbook.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS } from '../../i18n/index.ts';
import type { AggregationResult, AssetRow, CurrencyPosition } from './math.ts';
import { aggregate } from './math.ts';
import { netWorthSheets, type NetWorthExport } from './export.ts';

const t = DICTS.en.tools;
const island = t.multiCurrencyNetWorth.island;
const common = t.export;
const x = island.export;
const DATE = '2026-11-24';
const PAGE = 'https://nidhi.today/free/multi-currency-net-worth/';

const RATES = { EUR: 1, USD: 2, JPY: 200 };

/**
 * In euros: 1,000.50 saved less 500.50 owed is 500; 4,000 dollars at 2 is
 * 2,000; 100,000 yen at 200 is 500. Net worth 3,000.
 */
const ROWS: AssetRow[] = [
  { name: 'Savings', value: '1,000.50', currency: 'EUR', type: 'asset' },
  { name: 'Shares', value: '4000', currency: 'USD', type: 'asset' },
  { name: '', value: '', currency: 'EUR', type: 'asset' },
  { name: 'Yen account', value: '100000', currency: 'JPY', type: 'asset' },
  { name: 'Not yet filled in', value: '   ', currency: 'USD', type: 'asset' },
  { name: 'Card', value: '500.50', currency: 'EUR', type: 'liability' },
];

const base = { island, common, functionalCurrency: 'EUR', riskLabel: (level: string) => `band:${level}`, date: DATE, page: PAGE };
const own = (rows: AssetRow[], rates: Record<string, number> | null, over: Partial<NetWorthExport> = {}) =>
  netWorthSheets({ ...base, result: aggregate(rows, 'EUR', rates), rows, rates, showAmounts: true, ...over });

const head = (...titles: string[]) => titles.map((title) => ({ t: title, bold: true }));
const eur = (n: number) => ({ n, fmt: 'amount2' });
const usd = eur;
const jpy = (n: number) => ({ n, fmt: 'amount0' });
const pct = (n: number) => ({ n, fmt: 'decimal2' });
const EURO = 'Euro (EUR)';
const DOLLAR = 'US Dollar (USD)';
const YEN = 'Japanese Yen (JPY)';
const KORUNA = 'Czech Koruna (CZK)';
const NO_RATE = 'Rate unavailable';

/** A position as a link without amounts gives it: a share and a band, nothing else. */
const shareOnly = (code: string, pctOfTotal: number, riskLevel: CurrencyPosition['riskLevel'], more: Partial<CurrencyPosition> = {}): CurrencyPosition => ({
  code, netAmountOriginal: 0, netAmountFunctional: 0, pctOfTotal, isFunctional: riskLevel === 'functional', riskLevel, riskLabel: '', ...more,
});
const hidden = (result: AggregationResult) => netWorthSheets({ ...base, result, rows: null, rates: null, showAmounts: false });

describe('net worth spreadsheet: the reader’s own list, every rate known', () => {
  const all = own(ROWS, RATES);

  it('has four sheets in order, with their names and column widths', () => {
    assert.deepEqual(all.map((s) => s.name), ['About', 'Inputs', 'By currency', 'Rates']);
    assert.deepEqual(all.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.byCurrency, x.sheets.rates]);
    assert.deepEqual(all.map((s) => s.widths), [[22, 90], [30, 18, 12, 14], [28, 8, 18, 22, 16, 30], [28, 8, 24]]);
  });

  it('says what the file is, when and where it was made, and in which currency', () => {
    assert.deepEqual(all[0].rows, [
      head(common.columns.item, common.columns.value),
      [common.about.tool, 'Net worth calculator'],
      [common.about.made, DATE],
      [common.about.currency, 'EUR'],
      [common.about.page, PAGE],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
  });

  it('lists each row that holds an amount, as typed, and none that is blank', () => {
    assert.deepEqual(all[1].rows, [
      head('Name', 'Value', 'Currency', 'Type'),
      ['Savings', eur(1000.5), 'EUR', 'Asset'],
      ['Shares', usd(4000), 'USD', 'Asset'],
      ['Yen account', jpy(100000), 'JPY', 'Asset'],
      ['Card', eur(500.5), 'EUR', 'Liability'],
    ]);
  });

  it('gives each currency its own net amount, the amount in euros, both shares and its band, then the total', () => {
    assert.deepEqual(all[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      // 500 of 3,000 is 16.67%; 2,000 of 3,000 is 66.67%.
      [EURO, 'EUR', eur(500), eur(500), pct(16.67), pct(16.67), 'band:functional'],
      [DOLLAR, 'USD', usd(4000), eur(2000), pct(66.67), pct(66.67), 'band:elevated'],
      [YEN, 'JPY', jpy(100000), eur(500), pct(16.67), pct(16.67), 'band:low'],
      [],
      [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(3000)],
    ]);
  });

  it('states the rates used for the other currencies, per one euro, and says where they come from', () => {
    assert.deepEqual(all[3].rows, [
      [x.ratesText],
      head('Currency', 'Code', 'Units per 1 EUR'),
      [DOLLAR, 'USD', { n: 2, fmt: 'general' }],
      [YEN, 'JPY', { n: 200, fmt: 'general' }],
    ]);
  });

  it('names currencies in the page’s language', () => {
    const es = DICTS.es.tools;
    const sheets = netWorthSheets({ ...base, island: es.multiCurrencyNetWorth.island, common: es.export, result: aggregate(ROWS, 'EUR', RATES), rows: ROWS, rates: RATES, showAmounts: true });
    assert.notEqual(es.multiCurrencyNetWorth.island.currencies.USD, DOLLAR);
    assert.equal(sheets[2].rows[2][0], es.multiCurrencyNetWorth.island.currencies.USD);
    assert.equal(sheets[3].rows[2][0], es.multiCurrencyNetWorth.island.currencies.USD);
  });
});

describe('net worth spreadsheet: amounts and what cannot be read', () => {
  it('rounds an amount to the currency’s own decimals: two for euros, none for yen', () => {
    const rows: AssetRow[] = [
      { name: 'Euros', value: '1234.567', currency: 'EUR', type: 'asset' },
      { name: 'Yen', value: '1500.6', currency: 'JPY', type: 'asset' },
    ];
    const [, inputs, byCurrency] = own(rows, RATES);
    assert.deepEqual(inputs.rows.slice(1), [
      ['Euros', eur(1234.57), 'EUR', 'Asset'],
      ['Yen', jpy(1501), 'JPY', 'Asset'],
    ]);
    // 1,500.6 yen at 200 is 7.503 euros: 7.50 in the sheet.
    assert.deepEqual(byCurrency.rows[1].slice(0, 4), [EURO, 'EUR', eur(1234.57), eur(1234.57)]);
    assert.deepEqual(byCurrency.rows[2].slice(0, 4), [YEN, 'JPY', jpy(1501), eur(7.5)]);
    // 1,234.567 and 7.503 make 1,242.07.
    assert.deepEqual(byCurrency.rows[4], [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(1242.07)]);
  });

  it('keeps an amount it cannot read as the text that was typed, never as a number', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
      { name: 'Typed oddly', value: '€150,000', currency: 'USD', type: 'liability' },
    ];
    assert.deepEqual(own(rows, RATES)[1].rows.slice(1), [
      ['Savings', eur(1000), 'EUR', 'Asset'],
      ['Typed oddly', '€150,000', 'USD', 'Liability'],
    ]);
  });
});

describe('net worth spreadsheet: concentration and exposure are two columns', () => {
  it('a debt in another currency: concentration adds to 100, exposure passes it', () => {
    // 1,000 euros, and 1,000 dollars owed, which is 500 euros: net worth 500.
    const rows: AssetRow[] = [
      { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
      { name: 'Loan', value: '1000', currency: 'USD', type: 'liability' },
    ];
    assert.deepEqual(own(rows, RATES)[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      // Sizes 1,000 and 500 of 1,500: 66.67 and 33.33. Of a net worth of 500: 200 and -100.
      [EURO, 'EUR', eur(1000), eur(1000), pct(66.67), pct(200), 'band:functional'],
      [DOLLAR, 'USD', usd(-1000), eur(-500), pct(33.33), pct(-100), 'band:net-debt'],
      [],
      [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(500)],
    ]);
  });

  it('net worth below zero: the exposure cell says there is no share, and concentration stays', () => {
    // 100 euros less 300 owed is -200; 200 dollars is 100 euros: net worth -100.
    const rows: AssetRow[] = [
      { name: 'Cash', value: '100', currency: 'EUR', type: 'asset' },
      { name: 'Loan', value: '300', currency: 'EUR', type: 'liability' },
      { name: 'Dollars', value: '200', currency: 'USD', type: 'asset' },
    ];
    assert.deepEqual(own(rows, RATES)[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      // Sizes 200 and 100 of 300.
      [EURO, 'EUR', eur(-200), eur(-200), pct(66.67), 'band:unbanded', 'band:functional'],
      [DOLLAR, 'USD', usd(200), eur(100), pct(33.33), 'band:unbanded', 'band:unbanded'],
      [],
      [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(-100)],
    ]);
  });
});

describe('net worth spreadsheet: everything in the spending currency', () => {
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000.50', currency: 'EUR', type: 'asset' },
    { name: 'Flat', value: '2000', currency: 'EUR', type: 'asset' },
    { name: 'Card', value: '200.25', currency: 'EUR', type: 'liability' },
  ];
  // 3,000.50 owned less 200.25 owed.
  const total = [{ t: 'Total net worth', bold: true }, 'EUR', null, eur(2800.25)];

  it('needs no rates: the total with what is owned and owed under it, and no rates sheet', () => {
    for (const rates of [RATES, null]) {
      const sheets = own(rows, rates);
      assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.byCurrency]);
      assert.deepEqual(sheets[2].rows[0], head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR', 'Concentration, %', 'Exposure, % of net worth', 'Share band'));
      assert.deepEqual(sheets[2].rows[1].slice(0, 4), [EURO, 'EUR', eur(2800.25), eur(2800.25)]);
      assert.deepEqual(sheets[2].rows.slice(2), [
        [],
        total,
        ['What you own', 'EUR', null, eur(3000.5)],
        ['What you owe', 'EUR', null, eur(200.25)],
      ]);
    }
  });

  it('with rates the one currency is the whole of it', () => {
    assert.deepEqual(own(rows, RATES)[2].rows[1], [EURO, 'EUR', eur(2800.25), eur(2800.25), pct(100), pct(100), 'band:functional']);
  });

  it('a shared view has no rows, so no owned and owed lines', () => {
    const sheets = own(rows, RATES, { rows: null, rates: null });
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, x.sheets.byCurrency]);
    assert.deepEqual(sheets[1].rows.slice(2), [[], total]);
  });
});

describe('net worth spreadsheet: a rate is missing (#795)', () => {
  // 1,000 euros, 2,000 dollars (1,000 euros) and 3,000 koruna with no rate.
  const rows: AssetRow[] = [
    { name: 'Savings', value: '1000', currency: 'EUR', type: 'asset' },
    { name: 'Fund', value: '3000', currency: 'CZK', type: 'asset' },
    { name: 'Shares', value: '2000', currency: 'USD', type: 'asset' },
  ];

  it('one of two: a subtotal under its own label, a note, no share and no band', () => {
    const sheets = own(rows, RATES);
    assert.deepEqual(sheets[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR'),
      [EURO, 'EUR', eur(1000), eur(1000)],
      [DOLLAR, 'USD', usd(2000), eur(1000)],
      [KORUNA, 'CZK', eur(3000), NO_RATE],
      [],
      [{ t: 'Total excluding currencies with missing rates', bold: true }, 'EUR', null, eur(2000)],
      [island.results.partialHint],
    ]);
    assert.deepEqual(sheets[3].rows.slice(2), [
      [DOLLAR, 'USD', { n: 2, fmt: 'general' }],
      [KORUNA, 'CZK', NO_RATE],
    ]);
  });

  it('every other currency’s, with an answer that lacks them: original amounts and no total', () => {
    const sheets = own(rows.slice(0, 2), { EUR: 1 });
    assert.deepEqual(sheets[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR'),
      [EURO, 'EUR', eur(1000), eur(1000)],
      [KORUNA, 'CZK', eur(3000), NO_RATE],
    ]);
    assert.deepEqual(sheets[3].rows, [[x.ratesText], head('Currency', 'Code', 'Units per 1 EUR'), [KORUNA, 'CZK', NO_RATE]]);
  });

  it('no answer at all: the euro amount is still the euro amount, and there is no rates sheet', () => {
    const sheets = own(rows.slice(0, 2), null);
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.byCurrency]);
    assert.deepEqual(sheets[2].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Net, in EUR'),
      [KORUNA, 'CZK', eur(3000), NO_RATE],
      [EURO, 'EUR', eur(1000), eur(1000)],
    ]);
  });

  it('rates that were not used for the result are not listed as used', () => {
    const sheets = own(rows, RATES, { result: aggregate(rows, 'EUR', null) });
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.byCurrency]);
  });

  it('a view without amounts states no share of a subtotal either: currencies only', () => {
    const sheets = hidden({ ...aggregate(rows, 'EUR', RATES) });
    assert.deepEqual(sheets[1].rows, [
      head('Currency', 'Code'),
      [EURO, 'EUR'],
      [DOLLAR, 'USD'],
      [KORUNA, 'CZK'],
    ]);
  });
});

describe('net worth spreadsheet: amounts that were never converted', () => {
  it('nothing entered and no rates: no column of euro amounts, and no total', () => {
    const sheets = own([], null);
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, common.sheets.inputs, x.sheets.byCurrency]);
    assert.deepEqual(sheets[1].rows, [head('Name', 'Value', 'Currency', 'Type')]);
    assert.deepEqual(sheets[2].rows, [head('Currency', 'Code', 'Net, in its own currency', 'Concentration, %', 'Exposure, % of net worth', 'Share band')]);
  });

  it('a result that says no rate was used gives own amounts and shares, with no converted column and no total', () => {
    const result: AggregationResult = {
      positions: [
        { ...shareOnly('EUR', 75, 'functional'), netAmountOriginal: 300 },
        { ...shareOnly('USD', 25, 'moderate'), netAmountOriginal: 200 },
      ],
      totalNetWorthFunctional: 0,
      hasRates: 'none',
    };
    const sheets = netWorthSheets({ ...base, result, rows: null, rates: null, showAmounts: true });
    assert.deepEqual(sheets[1].rows, [
      head('Currency', 'Code', 'Net, in its own currency', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      [EURO, 'EUR', eur(300), pct(75), pct(75), 'band:functional'],
      [DOLLAR, 'USD', usd(200), pct(25), pct(25), 'band:moderate'],
    ]);
  });
});

describe('net worth spreadsheet: a shared view that hides amounts', () => {
  const result: AggregationResult = {
    positions: [shareOnly('EUR', 62.504, 'functional'), shareOnly('USD', 25.126, 'moderate'), shareOnly('JPY', 12.37, 'low')],
    totalNetWorthFunctional: 0,
    hasRates: 'none',
  };

  it('says on the first sheet that amounts are not included', () => {
    assert.deepEqual(hidden(result)[0].rows, [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, DATE],
      [common.about.currency, 'EUR'],
      [common.about.page, PAGE],
      ['Amounts', 'Not included: this shared view carries currencies and shares only.'],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ]);
  });

  it('holds two sheets, and of each currency only its name, code, shares and band', () => {
    const sheets = hidden(result);
    assert.deepEqual(sheets.map((s) => s.name), [common.sheets.about, x.sheets.byCurrency]);
    assert.deepEqual(sheets[1].rows, [
      head('Currency', 'Code', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      // The shares add to 100, so concentration is the share itself, to two decimals.
      [EURO, 'EUR', pct(62.5), pct(62.5), 'band:functional'],
      [DOLLAR, 'USD', pct(25.13), pct(25.13), 'band:moderate'],
      [YEN, 'JPY', pct(12.37), pct(12.37), 'band:low'],
    ]);
  });

  it('holds no amount even when the result carries them', () => {
    const withAmounts = aggregate(ROWS, 'EUR', RATES);
    const sheets = netWorthSheets({ ...base, result: withAmounts, rows: null, rates: null, showAmounts: false });
    assert.deepEqual(sheets[1].rows, [
      head('Currency', 'Code', 'Concentration, %', 'Exposure, % of net worth', 'Share band'),
      [EURO, 'EUR', pct(16.67), pct(16.67), 'band:functional'],
      [DOLLAR, 'USD', pct(66.67), pct(66.67), 'band:elevated'],
      [YEN, 'JPY', pct(16.67), pct(16.67), 'band:low'],
    ]);
  });

  it('a link that says net worth was zero or less states no exposure', () => {
    const sheets = hidden({ ...result, positions: [shareOnly('EUR', 60, 'functional'), shareOnly('USD', 40, 'unbanded')], noShares: true });
    assert.deepEqual(sheets[1].rows.slice(1), [
      [EURO, 'EUR', pct(60), 'band:unbanded', 'band:functional'],
      [DOLLAR, 'USD', pct(40), 'band:unbanded', 'band:unbanded'],
    ]);
  });

  it('a currency flagged as having no rate says so in both share cells, and is no part of the others’ shares', () => {
    const sheets = hidden({ ...result, positions: [shareOnly('EUR', 60, 'functional'), shareOnly('USD', 20, 'low'), shareOnly('JPY', 0, 'low', { rateUnavailable: true })] });
    assert.deepEqual(sheets[1].rows.slice(1), [
      // 60 and 20 of 80.
      [EURO, 'EUR', pct(75), pct(60), 'band:functional'],
      [DOLLAR, 'USD', pct(25), pct(20), 'band:low'],
      [YEN, 'JPY', NO_RATE, NO_RATE, 'band:low'],
    ]);
  });
});
