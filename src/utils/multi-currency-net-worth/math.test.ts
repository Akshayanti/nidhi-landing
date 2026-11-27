/**
 * Unit tests for src/utils/multi-currency-net-worth/math.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregate,
  concentrationShares,
  isSingleCurrency,
  isSupportedCurrency,
  ownedAndOwed,
  parseAmount,
  parseCSV,
  ratesForBase,
  decodeCsv,
  isUnreadableAmount,
  unreadableCount,
  formatPct,
  getCurrencyLabel,
  netTotal,
  rateGap,
  sharesUnknown,
  type AggregationResult,
  type AssetRow,
  type CurrencyPosition,
} from './math.ts';
import { CURRENCIES } from '../shared/money.ts';
import { format } from '../../i18n/format.ts';
import {
  multiCurrencyNetWorthEn,
  multiCurrencyNetWorthHi,
  multiCurrencyNetWorthEs,
} from '../../i18n/strings/tools/multiCurrencyNetWorth.ts';

// ---------------------------------------------------------------------------
// isSupportedCurrency
// ---------------------------------------------------------------------------

describe('isSupportedCurrency', () => {
  it('returns true for all 38 supported currencies', () => {
    const supported = ['AOA', 'AUD', 'BDT', 'BRL', 'CAD', 'CDF', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'INR', 'ISK', 'JPY', 'KES', 'KRW', 'MXN', 'MYR', 'MZN', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZAR'];
    assert.equal(supported.length, 38, 'sanity check on the test fixture itself');
    for (const code of supported) {
      assert.ok(isSupportedCurrency(code), `${code} should be supported`);
    }
  });

  it('is case-insensitive', () => {
    assert.ok(isSupportedCurrency('usd'));
    assert.ok(isSupportedCurrency('eur'));
    assert.ok(isSupportedCurrency('inr'));
  });

  it('returns false for unsupported codes', () => {
    assert.equal(isSupportedCurrency('XYZ'), false);
    assert.equal(isSupportedCurrency(''), false);
    assert.equal(isSupportedCurrency('RMB'), false);
  });
});

// ---------------------------------------------------------------------------
// aggregate
// ---------------------------------------------------------------------------

describe('aggregate', () => {
  const sampleRates: Record<string, number> = {
    USD: 1.08,
    EUR: 1.0,
    GBP: 0.85,
    INR: 89.5,
    CZK: 24.8,
  };

  it('returns empty positions for no rows', () => {
    const result = aggregate([], 'EUR', sampleRates);
    assert.equal(result.positions.length, 0);
    assert.equal(result.totalNetWorthFunctional, 0);
    // Empty + rates supplied: counts as 'full' (nothing to fail).
    assert.equal(result.hasRates, 'full');
  });

  it('returns hasRates=none for empty rows when rates are null', () => {
    const result = aggregate([], 'EUR', null);
    assert.equal(result.positions.length, 0);
    assert.equal(result.hasRates, 'none');
  });

  it('skips rows with empty or zero values', () => {
    const rows: AssetRow[] = [
      { name: 'Empty', value: '', currency: 'USD', type: 'asset' },
      { name: 'Zero', value: '0', currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions.length, 0);
  });

  it('skips rows with unsupported currency codes', () => {
    const rows: AssetRow[] = [
      { name: 'Bad', value: '50000', currency: 'XYZ', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions.length, 0);
  });

  it('aggregates a single currency position', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '100000', currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions.length, 1);
    assert.equal(result.positions[0].code, 'EUR');
    assert.equal(result.positions[0].netAmountOriginal, 100000);
    assert.equal(result.positions[0].netAmountFunctional, 100000);
    assert.equal(result.positions[0].pctOfTotal, 100);
    assert.equal(result.positions[0].isFunctional, true);
    assert.equal(result.positions[0].riskLevel, 'functional');
    assert.equal(result.totalNetWorthFunctional, 100000);
  });

  it('aggregates multiple assets in the same currency', () => {
    const rows: AssetRow[] = [
      { name: 'Stocks', value: '50000', currency: 'USD', type: 'asset' },
      { name: 'Cash', value: '20000', currency: 'USD', type: 'asset' },
      { name: 'Savings', value: '100000', currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions.length, 2);

    const usdPos = result.positions.find((p) => p.code === 'USD')!;
    assert.ok(usdPos);
    assert.equal(usdPos.netAmountOriginal, 70000);
    // 70000 USD / 1.08 rate ≈ 64814.81 EUR
    assert.ok(Math.abs(usdPos.netAmountFunctional - 64814.81) < 0.1);
  });

  it('nets assets and liabilities in the same currency', () => {
    const rows: AssetRow[] = [
      { name: 'US Stocks', value: '100000', currency: 'USD', type: 'asset' },
      { name: 'US Mortgage', value: '60000', currency: 'USD', type: 'liability' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions.length, 1);
    assert.equal(result.positions[0].code, 'USD');
    assert.equal(result.positions[0].netAmountOriginal, 40000);
  });

  it('handles net-negative position (more liabilities than assets)', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '10000', currency: 'USD', type: 'asset' },
      { name: 'Mortgage', value: '50000', currency: 'USD', type: 'liability' },
      { name: 'Cash', value: '20000', currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);

    const usdPos = result.positions.find((p) => p.code === 'USD')!;
    assert.ok(usdPos);
    assert.equal(usdPos.netAmountOriginal, -40000);
    assert.equal(usdPos.riskLevel, 'net-debt');
    assert.equal(usdPos.riskLabel, 'Net debt in this currency');
  });

  it('marks functional currency correctly', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
      { name: 'Stocks', value: '30000', currency: 'USD', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);

    const eurPos = result.positions.find((p) => p.code === 'EUR')!;
    assert.equal(eurPos.riskLevel, 'functional');
    assert.equal(eurPos.riskLabel, 'Your spending currency');

    const usdPos = result.positions.find((p) => p.code === 'USD')!;
    assert.equal(usdPos.isFunctional, false);
  });

  it('assesses risk levels correctly for non-functional currencies', () => {
    // 10% = low, 25% = moderate, 50% = elevated
    const rows: AssetRow[] = [
      { name: 'Small', value: '10000', currency: 'USD', type: 'asset' },
      { name: 'Medium', value: '30000', currency: 'GBP', type: 'asset' },
      { name: 'Large', value: '60000', currency: 'CZK', type: 'asset' },
      { name: 'Base', value: '100000', currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);

    const usdPos = result.positions.find((p) => p.code === 'USD')!;
    // 10000 USD / 1.08 ≈ 9259 EUR. Total ≈ 100000 + 9259 + 35294 + 2419 ≈ 146972
    // 9259/146972 ≈ 6.3% → low
    assert.equal(usdPos.riskLevel, 'low');

    const gbpPos = result.positions.find((p) => p.code === 'GBP')!;
    // 30000 GBP / 0.85 ≈ 35294 EUR → ~24% → moderate
    assert.equal(gbpPos.riskLevel, 'moderate');
  });

  it("returns hasRates='none' when rates are null and total is suppressed", () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
      { name: 'Stocks', value: '30000', currency: 'USD', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', null);
    assert.equal(result.hasRates, 'none');
    assert.equal(result.totalNetWorthFunctional, 0);
    // Positions exist but have no functional-currency amounts.
    assert.equal(result.positions.length, 2);
    assert.equal(result.positions[0].netAmountFunctional, 0);
    // Sorted by absolute original amount descending.
    assert.equal(result.positions[0].code, 'EUR');
    assert.equal(result.positions[1].code, 'USD');
  });

  it('handles total net worth of zero', () => {
    const rows: AssetRow[] = [
      { name: 'Asset', value: '50000', currency: 'EUR', type: 'asset' },
      { name: 'Liability', value: '50000', currency: 'EUR', type: 'liability' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.equal(result.positions[0].pctOfTotal, 0);
  });

  it('sorts functional currency first', () => {
    const rows: AssetRow[] = [
      { name: 'A', value: '10000', currency: 'USD', type: 'asset' },
      { name: 'B', value: '20000', currency: 'EUR', type: 'asset' },
      { name: 'C', value: '5000', currency: 'GBP', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.positions[0].code, 'EUR');
    assert.equal(result.positions[0].isFunctional, true);
  });

  it("returns hasRates='partial' when one supported currency has no rate", () => {
    // JPY is a supported code but the rates object below doesn't include it.
    // The result should distinguish "we got rates back, but one was missing"
    // from "we couldn't fetch rates at all".
    const result = aggregate(
      [{ name: 'Yen', value: '1000000', currency: 'JPY', type: 'asset' }],
      'EUR',
      { EUR: 1.0 },
    );
    assert.equal(result.positions.length, 1);
    // The unconverted position is flagged so the per-row card can warn.
    assert.equal(result.positions[0].rateUnavailable, true);
    assert.equal(result.positions[0].netAmountFunctional, 0);
    // The headline total excludes it and the tri-state surfaces the gap.
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.equal(result.hasRates, 'partial');
  });

  it("returns hasRates='full' when every non-functional code has a rate", () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
      { name: 'Stocks', value: '30000', currency: 'USD', type: 'asset' },
      { name: 'UK',     value: '5000',  currency: 'GBP', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    assert.equal(result.hasRates, 'full');
    // All three positions have a populated functional amount.
    for (const p of result.positions) {
      assert.equal(p.rateUnavailable, undefined);
    }
  });

  it("treats a zero rate the same as a missing rate (defensive)", () => {
    // A 0 rate would otherwise divide-by-zero. The aggregator must mark
    // the position as unavailable rather than emit Infinity/NaN.
    const result = aggregate(
      [{ name: 'Yen', value: '1000000', currency: 'JPY', type: 'asset' }],
      'EUR',
      { EUR: 1.0, JPY: 0 },
    );
    assert.equal(result.positions[0].rateUnavailable, true);
    assert.equal(result.hasRates, 'partial');
    assert.ok(Number.isFinite(result.totalNetWorthFunctional));
  });

  it("functional currency only: hasRates='full' even if other rates missing", () => {
    // The user's portfolio is entirely in their functional currency, so no
    // FX conversion is needed. Even if the rates response is sparse, the
    // headline number is fully accurate.
    const result = aggregate(
      [{ name: 'Cash', value: '10000', currency: 'EUR', type: 'asset' }],
      'EUR',
      {}, // no rates at all
    );
    assert.equal(result.hasRates, 'full');
    assert.equal(result.totalNetWorthFunctional, 10000);
  });

  it("strips advisory phrasing from band labels", () => {
    // Regulatory bright-line: the calculator labels are descriptive, not
    // recommendations. Earlier revisions emitted "Elevated exposure,
    // consider diversifying"; this test pins the new descriptive-only
    // contract so it cannot regress.
    const rows: AssetRow[] = [
      { name: 'Big',  value: '500000', currency: 'USD', type: 'asset' },
      { name: 'Med',  value: '50000',  currency: 'GBP', type: 'asset' },
      { name: 'Tiny', value: '500',    currency: 'CZK', type: 'asset' },
      { name: 'Base', value: '1',      currency: 'EUR', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', sampleRates);
    for (const p of result.positions) {
      assert.ok(
        !/consider|diversif|recommend|should|action|optimal|best/i.test(p.riskLabel),
        `risk label must not contain advisory language; got "${p.riskLabel}"`,
      );
    }
    // And the actual labels are exactly what the UI/spec expects.
    const labels = new Set(result.positions.map((p) => p.riskLabel));
    assert.ok(labels.has('Your spending currency'));
    assert.ok(labels.has('Low exposure') || labels.has('Moderate exposure') || labels.has('Elevated exposure'));
  });
});

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------

describe('parseCSV', () => {
  it('takes off the apostrophe the download puts before a formula-like name, and only that one', () => {
    const { rows, errors } = parseCSV("Name,Value,Currency,Type\n'=SUM(A1),100,EUR,Asset\n'Tis,200,EUR,Asset\n''-x,300,EUR,Asset");
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => r.name), ['=SUM(A1)', "'Tis", "'-x"]);
  });

  it('parses valid CSV with header', () => {
    const csv = `name,value,currency,type
US Stocks,50000,USD,asset
Apartment,200000,EUR,asset`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, 'US Stocks');
    assert.equal(rows[0].value, '50000');
    assert.equal(rows[0].currency, 'USD');
    assert.equal(rows[0].type, 'asset');
    assert.equal(rows[1].name, 'Apartment');
    assert.equal(rows[1].value, '200000');
    assert.equal(rows[1].currency, 'EUR');
    assert.equal(rows[1].type, 'asset');
  });

  it('parses CSV without header', () => {
    const csv = `US Stocks,50000,USD,asset
Apartment,200000,EUR`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 2);
    // Second row has no type → defaults to asset.
    assert.equal(rows[1].type, 'asset');
  });

  it('handles omitted name and type', () => {
    const csv = `,50000,USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, '');
    assert.equal(rows[0].value, '50000');
    assert.equal(rows[0].currency, 'USD');
    assert.equal(rows[0].type, 'asset');
  });

  it('handles 2-column CSV (value, currency only)', () => {
    const csv = `50000,USD
200000,EUR`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, '');
    assert.equal(rows[0].value, '50000');
    assert.equal(rows[0].currency, 'USD');
    assert.equal(rows[1].value, '200000');
    assert.equal(rows[1].currency, 'EUR');
  });

  it('an omitted type is an asset; a type it does not know is an error, not an asset', () => {
    const csv = `Test,50000,USD,liability
Test2,30000,EUR
Test3,10000,GBP,unknown
Test4,10000,GBP,debt`;
    const { rows, errors } = parseCSV(csv);
    assert.deepEqual(rows.map((r) => [r.name, r.type]), [['Test', 'liability'], ['Test2', 'asset']]);
    assert.deepEqual(errors.map((e) => [e.line, e.reason, e.values]), [[3, 'unknownType', { value: 'unknown' }], [4, 'unknownType', { value: 'debt' }]]);
  });

  it('reads the page’s own words for the two types, in any case', () => {
    const csv = 'Hipoteca,1000,EUR,pasivo\nCasa,5000,EUR,Activo\nLoan,1000,EUR,Liability\nX,1000,EUR,ASSET';
    const { rows, errors } = parseCSV(csv, { asset: ['Activo'], liability: ['Pasivo'] });
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => r.type), ['liability', 'asset', 'liability', 'asset']);
    // Without them, the Spanish words are refused, not read as assets.
    assert.equal(parseCSV(csv).errors.length, 2);
  });

  it('skips a header line written in another language', () => {
    for (const header of ['Nombre,Importe,Moneda,Tipo', 'Název,Hodnota,Měna,Typ', 'नाम,रकम,मुद्रा,किस्म', 'Importe,Moneda']) {
      const { rows, errors } = parseCSV(`${header}\n${header.split(',').length === 2 ? '100,EUR' : 'Cash,100,EUR,asset'}`);
      assert.deepEqual(errors, [], header);
      assert.equal(rows.length, 1, header);
    }
  });

  it('a first line that is data with a bad amount is an error, never taken for a header', () => {
    const { rows, errors } = parseCSV('Bad,abc,USD\nGood,100,EUR');
    assert.equal(rows.length, 1);
    assert.deepEqual(errors.map((e) => [e.line, e.reason]), [[1, 'invalidValue']]);
  });

  it('reads a semicolon file with decimal commas, as a spreadsheet in Spanish or Czech saves it', () => {
    const csv = 'Nombre;Importe;Moneda;Tipo\nCuenta;1000,50;EUR;Activo\nPiso;250.000,00;EUR;Activo\nHipoteca;150 000;EUR;Pasivo';
    const { rows, errors } = parseCSV(csv, { asset: ['activo'], liability: ['pasivo'] });
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => [r.name, r.value, r.type]), [['Cuenta', '1000.5', 'asset'], ['Piso', '250000', 'asset'], ['Hipoteca', '150000', 'liability']]);
    assert.equal(parseAmount(rows[2].value), 150000);
  });

  it('reads a tab-separated file', () => {
    const { rows, errors } = parseCSV('Cash\t100\tEUR\tasset\nLoan\t50\tUSD\tliability');
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => [r.name, r.value, r.currency, r.type]), [['Cash', '100', 'EUR', 'asset'], ['Loan', '50', 'USD', 'liability']]);
  });

  it('in a comma file a comma inside a quoted amount is still grouping', () => {
    const { rows, errors } = parseCSV('Flat,"250,000",EUR,asset');
    assert.deepEqual(errors, []);
    assert.equal(parseAmount(rows[0].value), 250000);
  });

  it('keeps the rows it can read and names every line it cannot', () => {
    const csv = 'Name,Value,Currency,Type\nA,16,EUR,asset\nB,-5,EUR,asset\nC,Infinity,EUR,asset\nD,€100,EUR,asset\nE,1000,EUR,asset\nF,1e400,EUR,asset';
    const { rows, errors } = parseCSV(csv);
    assert.deepEqual(rows.map((r) => r.name), ['A', 'E']);
    assert.deepEqual(errors.map((e) => e.line), [3, 4, 5, 7]);
  });

  it('ignores a byte-order mark at the start of the file', () => {
    const { rows, errors } = parseCSV(String.fromCharCode(0xfeff) + 'Name,Value,Currency\nCash,100,EUR');
    assert.deepEqual(errors, []);
    assert.equal(rows[0].name, 'Cash');
  });

  it('reports error for invalid value', () => {
    const csv = `Bad,abc,USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, '“abc” is not a valid positive number.');
  });

  it('reports error for unsupported currency', () => {
    const csv = `Test,50000,XYZ`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.startsWith('“XYZ” is not a supported currency. Supported:'));
  });

  it('reports error for zero value', () => {
    const csv = `Test,0,USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, '“0” is not a valid positive number.');
  });

  it('handles empty CSV', () => {
    const { rows, errors } = parseCSV('');
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.includes('empty'));
  });

  it('returns partial results on mix of valid and invalid rows', () => {
    const csv = `Good,50000,USD,asset
Bad,abc,EUR
AlsoGood,30000,GBP`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 2);
    assert.equal(errors.length, 1);
    assert.equal(rows[0].name, 'Good');
    assert.equal(rows[1].name, 'AlsoGood');
  });

  it('handles quoted fields with commas inside', () => {
    const csv = `"My Big, Asset",50000,USD,asset`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows[0].name, 'My Big, Asset');
  });

  it('handles quoted fields with escaped quotes', () => {
    const csv = `"My ""Big"" Asset",50000,USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows[0].name, 'My "Big" Asset');
  });

  it('handles numbers with commas (thousands separators)', () => {
    const csv = `Test,"1,000,000",USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    // The amount is kept as the plain number the tool works with.
    assert.equal(rows[0].value, '1000000');
  });

  it('handles header auto-detection when value/currency keywords present', () => {
    const csv = `name,value,currency,type
Test,50000,USD,asset`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Test');
  });

  it('gives every error a reason the tool renders in both languages', () => {
    const csv = `onlyone
Bad,abc,USD
NoCurrency,100,
Test,50000,XYZ`;
    const { errors } = parseCSV(csv);
    const all = [...errors, ...parseCSV('').errors];
    assert.deepEqual(
      all.map((e) => e.reason),
      ['columns', 'invalidValue', 'emptyCurrency', 'unsupportedCurrency', 'empty'],
    );
    for (const e of all) {
      // English reads exactly as the parser's own message, so nothing changes on the English page.
      const en = format(multiCurrencyNetWorthEn.island.table.csvErrors[e.reason], e.values ?? {});
      assert.equal(en, e.message);
      for (const catalog of [multiCurrencyNetWorthHi, multiCurrencyNetWorthEs]) {
        const translated = format(catalog.island.table.csvErrors[e.reason], e.values ?? {});
        assert.notEqual(translated, e.message);
        assert.ok(!/[{}]/.test(translated), `unfilled placeholder in ${translated}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// formatPct
// ---------------------------------------------------------------------------

describe('formatPct', () => {
  it('formats percentages with one decimal', () => {
    assert.equal(formatPct(28.57), '28.6%');
    assert.equal(formatPct(100), '100.0%');
    assert.equal(formatPct(0), '0.0%');
  });

  it('writes a share that rounds to nothing as zero, never "-0.0%" (#888)', () => {
    assert.equal(formatPct(-0.04), '0.0%');
    assert.equal(formatPct(-0), '0.0%');
    assert.equal(formatPct(-0.05), '-0.1%');
    assert.equal(formatPct(-12.34), '-12.3%');
  });

  it('handles non-finite values', () => {
    assert.equal(formatPct(NaN), '0%');
    assert.equal(formatPct(Infinity), '0%');
  });
});

// ---------------------------------------------------------------------------
// getCurrencyLabel
// ---------------------------------------------------------------------------

describe('getCurrencyLabel', () => {
  it('returns label for supported currency', () => {
    assert.ok(getCurrencyLabel('USD').includes('US Dollar'));
    assert.ok(getCurrencyLabel('EUR').includes('Euro'));
    assert.ok(getCurrencyLabel('INR').includes('Indian Rupee'));
  });

  it('returns code for unsupported currency', () => {
    assert.equal(getCurrencyLabel('XYZ'), 'XYZ');
  });
});

// ---------------------------------------------------------------------------
// Single-currency view
// ---------------------------------------------------------------------------

describe('isSingleCurrency', () => {
  const rates = { USD: 1.1, INR: 90 };
  const row = (value: string, currency: string, type: AssetRow['type'] = 'asset'): AssetRow => ({ name: '', value, currency, type });

  it('is true when everything is in the spending currency', () => {
    const r = aggregate([row('1000', 'EUR'), row('300', 'eur', 'liability')], 'EUR', rates);
    assert.equal(isSingleCurrency(r, 'EUR'), true);
  });

  it('is false once anything is in another currency', () => {
    const r = aggregate([row('1000', 'EUR'), row('50', 'USD')], 'EUR', rates);
    assert.equal(isSingleCurrency(r, 'EUR'), false);
  });

  it('is false for one currency that is not the spending currency (that is exposure)', () => {
    const r = aggregate([row('1000', 'USD')], 'EUR', rates);
    assert.equal(isSingleCurrency(r, 'EUR'), false);
  });

  it('is false with nothing entered', () => {
    assert.equal(isSingleCurrency(aggregate([], 'EUR', rates), 'EUR'), false);
  });

  it('does not need rates', () => {
    const r = aggregate([row('1000', 'EUR')], 'EUR', null);
    assert.equal(isSingleCurrency(r, 'EUR'), true);
    assert.equal(r.positions[0].netAmountOriginal, 1000);
  });
});

describe('ownedAndOwed', () => {
  it('splits assets and liabilities in the currency, with the same parsing as aggregate', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '4,200', currency: 'EUR', type: 'asset' },
      { name: 'Car', value: '3 400', currency: 'EUR', type: 'asset' },
      { name: 'Loan', value: '5200', currency: 'EUR', type: 'liability' },
      { name: 'Other', value: '999', currency: 'USD', type: 'asset' },
      { name: 'Blank', value: '', currency: 'EUR', type: 'asset' },
      { name: 'Bad', value: 'abc', currency: 'EUR', type: 'liability' },
    ];
    assert.deepEqual(ownedAndOwed(rows, 'EUR'), { owned: 7600, owed: 5200 });
  });
});

describe('decodeCsv', () => {
  it('reads UTF-8 as it is', () => {
    assert.equal(decodeCsv(new TextEncoder().encode('Café,100,EUR\nसंपत्ति,5,INR')), 'Café,100,EUR\nसंपत्ति,5,INR');
  });

  it('reads a file saved in the Windows code page, where UTF-8 would break the letters', () => {
    // "Café úspory" in Windows-1252: é is 0xE9, ú is 0xFA.
    const bytes = Uint8Array.from([0x43, 0x61, 0x66, 0xe9, 0x20, 0xfa, 0x73, 0x70, 0x6f, 0x72, 0x79, 0x2c, 0x31, 0x30, 0x30, 0x2c, 0x45, 0x55, 0x52]);
    assert.equal(decodeCsv(bytes), 'Café úspory,100,EUR');
  });
});

describe('an amount that cannot be read', () => {
  it('is told apart from an empty box and from a number', () => {
    for (const value of ['NaN', '€150,000', '150 000 EUR', '-150000', '1.5e400', 'abc', '१५००००']) assert.equal(isUnreadableAmount(value), true, value);
    for (const value of ['', '   ', '0', '150000', '150,000', '1 500.25']) assert.equal(isUnreadableAmount(value), false, value);
  });

  it('is counted, since such a row is in no total', () => {
    const rows: AssetRow[] = [
      { name: 'Flat', value: '200000', currency: 'EUR', type: 'asset' },
      { name: 'Mortgage', value: 'NaN', currency: 'EUR', type: 'liability' },
      { name: '', value: '', currency: 'EUR', type: 'asset' },
    ];
    assert.equal(unreadableCount(rows), 1);
    const result = aggregate(rows, 'EUR', { EUR: 1 });
    assert.equal(result.totalNetWorthFunctional, 200000, 'the row is left out, which is why the tool must say so');
  });
});

describe('CSV amounts are read strictly (issue 340)', () => {
  it('a quoted decimal comma in a comma file is a decimal, not grouping', () => {
    const { rows, errors } = parseCSV('Flat,"2500,50",EUR\nBond,"1.234,56",EUR\nCash,"250,000",EUR\nGold,"1,00,000",INR');
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => r.value), ['2500.5', '1234.56', '250000', '100000']);
  });

  it('refuses what is not a plain amount instead of guessing', () => {
    const { rows, errors } = parseCSV('A,0x10,EUR\nB,1e3,EUR\nC,€100,EUR\nD,-5,EUR\nE,"1,23,4",EUR\nF,12,EUR');
    assert.deepEqual(rows.map((r) => r.name), ['F']);
    assert.deepEqual(errors.map((e) => [e.line, e.reason]), [[1, 'invalidValue'], [2, 'invalidValue'], [3, 'invalidValue'], [4, 'invalidValue'], [5, 'invalidValue']]);
  });

  it('refuses a plus sign, as the amount box does: the two read one amount one way (#888)', () => {
    // A comma file, a semicolon file (a decimal comma) and the two-column form.
    for (const [file, value] of [['Cash,+5000,EUR,asset\nGold,5000,EUR,asset', '+5000'], ['Cash;+5000,50;EUR;asset\nGold;5000,50;EUR;asset', '+5000,50'], ['+5000,EUR\n5000,EUR', '+5000']] as const) {
      const { rows, errors } = parseCSV(file);
      assert.deepEqual(errors.map((e) => [e.line, e.reason, e.values]), [[1, 'invalidValue', { value }]], file);
      assert.equal(rows.length, 1, file);
      // The same text typed into a row's amount box is not an amount there either.
      assert.equal(isUnreadableAmount(value), true, value);
    }
  });

  it('a lower-case code in the two-column form is the currency it names', () => {
    const { rows, errors } = parseCSV('1000,eur\n500,Usd');
    assert.deepEqual(errors, []);
    assert.deepEqual(rows.map((r) => [r.value, r.currency]), [['1000', 'EUR'], ['500', 'USD']]);
  });
});

describe('rates belong to the currency they were fetched for (issue 339)', () => {
  const eur = { base: 'EUR', rates: { EUR: 1, USD: 1.08, INR: 90 } };
  const rows: AssetRow[] = [
    { name: 'Cash', value: '1000', currency: 'EUR', type: 'asset' },
    { name: 'Savings', value: '90000', currency: 'INR', type: 'asset' },
  ];

  it('are used while that is the spending currency', () => {
    assert.equal(ratesForBase(eur, 'EUR'), eur.rates);
    assert.equal(ratesForBase(eur, 'eur'), eur.rates);
    assert.equal(aggregate(rows, 'EUR', ratesForBase(eur, 'EUR')).totalNetWorthFunctional, 2000);
  });

  it('are not used for another spending currency: no total, never a wrong one', () => {
    assert.equal(ratesForBase(eur, 'INR'), null);
    assert.equal(ratesForBase(null, 'EUR'), null);
    // What the tool showed before: euro rates read as rupee rates.
    assert.equal(aggregate(rows, 'INR', eur.rates).totalNetWorthFunctional, 91000);
    // What it shows now, until rupee rates arrive.
    const waiting = aggregate(rows, 'INR', ratesForBase(eur, 'INR'));
    assert.equal(waiting.hasRates, 'none');
    assert.equal(waiting.totalNetWorthFunctional, 0);
  });
});

describe('concentration and exposure are two measures', () => {
  // Issue #515: an asset in one currency and a debt in another.
  const positions = [
    { code: 'CZK', netAmountFunctional: 8124, pctOfTotal: (8124 / 3458) * 100 },
    { code: 'EUR', netAmountFunctional: -4666, pctOfTotal: (-4666 / 3458) * 100 },
  ];

  it('concentration is each size over the sum of sizes, and adds to 100', () => {
    const c = concentrationShares(positions);
    assert.ok(Math.abs(c.get('CZK')! - 63.52) < 0.01);
    assert.ok(Math.abs(c.get('EUR')! - 36.48) < 0.01);
    assert.ok(Math.abs([...c.values()].reduce((a, b) => a + b, 0) - 100) < 1e-9);
    // Exposure, the share of net worth, is the other pair and is left as it was.
    assert.ok(Math.abs(positions[0].pctOfTotal - 234.93) < 0.01);
    assert.ok(Math.abs(positions[1].pctOfTotal + 134.93) < 0.01);
  });

  it('equals exposure when no currency is a net debt', () => {
    const held = [
      { code: 'EUR', netAmountFunctional: 600, pctOfTotal: 60 },
      { code: 'USD', netAmountFunctional: 400, pctOfTotal: 40 },
    ];
    const c = concentrationShares(held);
    for (const p of held) assert.ok(Math.abs(c.get(p.code)! - p.pctOfTotal) < 1e-9);
  });

  it('reads a shared view that carries percentages only, and leaves out a currency with no rate', () => {
    const shared = [
      { code: 'CZK', netAmountFunctional: 0, pctOfTotal: 234.9 },
      { code: 'EUR', netAmountFunctional: 0, pctOfTotal: -134.9 },
      { code: 'XAF', netAmountFunctional: 0, pctOfTotal: 0, rateUnavailable: true },
    ];
    const c = concentrationShares(shared);
    assert.ok(Math.abs(c.get('CZK')! - 63.52) < 0.01);
    assert.equal(c.has('XAF'), false);
    assert.equal(concentrationShares([{ code: 'EUR', netAmountFunctional: 0, pctOfTotal: 0 }]).get('EUR'), 0);
  });
});

describe('a holding in another currency when net worth is zero or negative', () => {
  const rates = { USD: 1.1, EUR: 1 };
  // Jan's case: a 250,000 EUR home, a 300,000 EUR mortgage and 20,000 USD.
  const underwater: AssetRow[] = [
    { name: 'Home', value: '250000', currency: 'EUR', type: 'asset' },
    { name: 'Mortgage', value: '300000', currency: 'EUR', type: 'liability' },
    { name: 'Savings', value: '20000', currency: 'USD', type: 'asset' },
  ];

  it('gets no band, where it used to read low exposure at 0%', () => {
    const r = aggregate(underwater, 'EUR', rates);
    assert.ok(r.totalNetWorthFunctional < 0);
    const usd = r.positions.find((p) => p.code === 'USD')!;
    assert.equal(usd.riskLevel, 'unbanded');
    assert.equal(usd.pctOfTotal, 0);
    // A 10% move in the dollar still changes net worth by a tenth of the holding: about 1,818 EUR.
    assert.equal(Math.round(usd.netAmountFunctional / 10), 1818);
    assert.equal(r.positions.find((p) => p.code === 'EUR')!.riskLevel, 'functional');
  });

  it('keeps its band as soon as the total is positive, and a debt stays a debt', () => {
    const positive = aggregate([...underwater, { name: 'Cash', value: '100000', currency: 'EUR', type: 'asset' }], 'EUR', rates);
    assert.notEqual(positive.positions.find((p) => p.code === 'USD')!.riskLevel, 'unbanded');
    const owing = aggregate([{ name: 'Loan', value: '5000', currency: 'USD', type: 'liability' }, { name: 'Cash', value: '1000', currency: 'EUR', type: 'asset' }], 'EUR', rates);
    assert.equal(owing.positions.find((p) => p.code === 'USD')!.riskLevel, 'net-debt');
  });
});

// ---------------------------------------------------------------------------
// Figures worked out on paper. One euro buys 2 US dollars, 4 pounds and
// 200 yen throughout, so every converted amount is a division by sight.
// ---------------------------------------------------------------------------

const ROUND = { EUR: 1, USD: 2, GBP: 4, JPY: 200 };
const asset = (value: string, currency: string, name = ''): AssetRow => ({ name, value, currency, type: 'asset' });
const debt = (value: string, currency: string, name = ''): AssetRow => ({ name, value, currency, type: 'liability' });
const byCode = (result: AggregationResult, code: string): CurrencyPosition => result.positions.find((p) => p.code === code)!;

/** Every order of a list, so a sorting rule is checked whatever order the rows were typed in. */
function orders<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list];
  return list.flatMap((item, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe('parseAmount', () => {
  it('reads digits, with commas and spaces as grouping in any place', () => {
    assert.equal(parseAmount('150000'), 150000);
    assert.equal(parseAmount('1,00,000'), 100000);
    assert.equal(parseAmount(' 1 500.25 '), 1500.25);
    assert.equal(parseAmount('0'), 0);
  });

  it('gives no number for an empty box, or one that holds only spaces and commas', () => {
    for (const value of ['', '   ', ',', ' , , ']) assert.ok(Number.isNaN(parseAmount(value)), JSON.stringify(value));
  });

  it('gives no number for a negative amount, text, or a number too large to hold', () => {
    for (const value of ['-1', '-150000', 'abc', '€100', '1e999', 'Infinity']) assert.ok(Number.isNaN(parseAmount(value)), value);
  });

  it('gives no number for the other spellings JavaScript reads, which the CSV import refuses too (#872)', () => {
    for (const value of ['1.5e5', '1E3', '0x10', '0b11', '0o7', '+5', '1.2.3', '.', '-0']) {
      assert.ok(Number.isNaN(parseAmount(value)), value);
      assert.ok(isUnreadableAmount(value), value);
    }
    assert.equal(parseAmount('.5'), 0.5);
    assert.equal(parseAmount('5.'), 5);
  });
});

describe('aggregate: the whole result, from sums written out', () => {
  it('with nothing entered there is nothing but an empty list and a zero total', () => {
    assert.deepEqual(aggregate([], 'EUR', ROUND), { positions: [], totalNetWorthFunctional: 0, hasRates: 'full' });
    assert.deepEqual(aggregate([asset('', 'EUR'), asset('0', 'USD'), asset('abc', 'GBP')], 'EUR', ROUND), { positions: [], totalNetWorthFunctional: 0, hasRates: 'full' });
    assert.deepEqual(aggregate([], 'EUR', null), { positions: [], totalNetWorthFunctional: 0, hasRates: 'none' });
  });

  it('converts each currency, totals them and states each share and band', () => {
    // 600 euros; 400 dollars are 200 euros; 800 pounds are 200 euros: 1,000 in all.
    const result = aggregate([asset('400', 'USD'), asset('1000', 'EUR'), debt('400', 'EUR'), asset('800', 'GBP')], 'EUR', ROUND);
    assert.deepEqual(result, {
      positions: [
        { code: 'EUR', netAmountOriginal: 600, netAmountFunctional: 600, pctOfTotal: 60, isFunctional: true, riskLevel: 'functional', riskLabel: 'Your spending currency' },
        { code: 'USD', netAmountOriginal: 400, netAmountFunctional: 200, pctOfTotal: 20, isFunctional: false, riskLevel: 'moderate', riskLabel: 'Moderate exposure' },
        { code: 'GBP', netAmountOriginal: 800, netAmountFunctional: 200, pctOfTotal: 20, isFunctional: false, riskLevel: 'moderate', riskLabel: 'Moderate exposure' },
      ],
      totalNetWorthFunctional: 1000,
      hasRates: 'full',
      noShares: false,
    });
  });

  it('with no rates it keeps each currency’s own amount, largest first, and converts, totals and bands nothing but the spending currency (#874)', () => {
    // Sizes 5,000, 300 and 100: the debt is the largest.
    for (const rows of orders([asset('100', 'EUR'), debt('5000', 'USD'), asset('300', 'GBP')])) {
      assert.deepEqual(aggregate(rows, 'EUR', null), {
        positions: [
          { code: 'USD', netAmountOriginal: -5000, netAmountFunctional: 0, pctOfTotal: 0, isFunctional: false, riskLevel: 'low', riskLabel: '', rateUnavailable: true },
          { code: 'GBP', netAmountOriginal: 300, netAmountFunctional: 0, pctOfTotal: 0, isFunctional: false, riskLevel: 'low', riskLabel: '', rateUnavailable: true },
          { code: 'EUR', netAmountOriginal: 100, netAmountFunctional: 0, pctOfTotal: 0, isFunctional: true, riskLevel: 'functional', riskLabel: 'Your spending currency' },
        ],
        totalNetWorthFunctional: 0,
        hasRates: 'none',
      });
    }
  });

  it('puts the spending currency first and the others by the size of their share, whatever order the rows are in', () => {
    // 50 euros; 600 dollars are 300; 1,600 pounds owed are -400; 110,000 yen are 550. Net worth 500.
    const rows = [asset('50', 'EUR'), asset('600', 'USD'), debt('1600', 'GBP'), asset('110000', 'JPY')];
    for (const order of orders(rows)) {
      const result = aggregate(order, 'EUR', ROUND);
      assert.deepEqual(result.positions.map((p) => [p.code, p.pctOfTotal, p.riskLevel]), [
        ['EUR', 10, 'functional'],
        ['JPY', (550 / 500) * 100, 'elevated'],
        ['GBP', -80, 'net-debt'],
        ['USD', 60, 'elevated'],
      ]);
      assert.equal(result.totalNetWorthFunctional, 500);
    }
  });

  it('says a positive net worth has shares, and a zero or negative one has none', () => {
    assert.equal(aggregate([asset('1', 'EUR')], 'EUR', ROUND).noShares, false);
    assert.equal(aggregate([asset('100', 'EUR'), asset('100', 'USD')], 'EUR', ROUND).noShares, false);
    assert.equal(aggregate([asset('100', 'EUR'), debt('200', 'USD')], 'EUR', ROUND).noShares, true, '100 less 100 is nothing');
    assert.equal(aggregate([debt('100', 'EUR')], 'EUR', ROUND).noShares, true);
  });
});

describe('aggregate: the bands', () => {
  it('names each band in plain words', () => {
    // Of 1,000: 100 is 10%, 300 is 30%, 500 is 50%, and the rest is euros.
    const result = aggregate([asset('100', 'EUR'), asset('200', 'USD'), asset('1200', 'GBP'), asset('100000', 'JPY')], 'EUR', ROUND);
    assert.deepEqual(result.positions.map((p) => [p.code, p.pctOfTotal, p.riskLevel, p.riskLabel]), [
      ['EUR', 10, 'functional', 'Your spending currency'],
      ['JPY', 50, 'elevated', 'Elevated exposure'],
      ['GBP', 30, 'moderate', 'Moderate exposure'],
      ['USD', 10, 'low', 'Low exposure'],
    ]);
    const owing = aggregate([asset('1000', 'EUR'), debt('200', 'USD')], 'EUR', ROUND);
    assert.deepEqual([byCode(owing, 'USD').riskLevel, byCode(owing, 'USD').riskLabel], ['net-debt', 'Net debt in this currency']);
  });

  it('a share of exactly 20% is moderate and of exactly 40% is elevated: a band starts at its own number', () => {
    // 400 dollars are 200 of 1,000.
    const twenty = byCode(aggregate([asset('800', 'EUR'), asset('400', 'USD')], 'EUR', ROUND), 'USD');
    assert.deepEqual([twenty.pctOfTotal, twenty.riskLevel], [20, 'moderate']);
    // 800 dollars are 400 of 1,000.
    const forty = byCode(aggregate([asset('600', 'EUR'), asset('800', 'USD')], 'EUR', ROUND), 'USD');
    assert.deepEqual([forty.pctOfTotal, forty.riskLevel], [40, 'elevated']);
    // 398 dollars are 199 of 1,000: 19.9%.
    const under = byCode(aggregate([asset('801', 'EUR'), asset('398', 'USD')], 'EUR', ROUND), 'USD');
    assert.deepEqual([under.pctOfTotal, under.riskLevel], [(199 / 1000) * 100, 'low']);
  });

  it('a currency whose rows net to nothing is no debt: it is low, at 0%', () => {
    const usd = byCode(aggregate([asset('1000', 'EUR'), asset('100', 'USD'), debt('100', 'USD')], 'EUR', ROUND), 'USD');
    assert.deepEqual([usd.netAmountOriginal, usd.pctOfTotal, usd.riskLevel, usd.riskLabel], [0, 0, 'low', 'Low exposure']);
  });

  it('amounts too large to add still get a band, the highest, never none', () => {
    // 1e308 in plain digits, the way a box holds it: an exponent is not an amount (#872).
    const huge = `1${'0'.repeat(308)}`;
    const usd = byCode(aggregate([asset(huge, 'USD'), asset(huge, 'USD'), asset('1', 'EUR')], 'EUR', ROUND), 'USD');
    assert.equal(usd.netAmountOriginal, Infinity);
    assert.deepEqual([usd.riskLevel, usd.riskLabel], ['elevated', 'Elevated exposure']);
  });
});

describe('aggregate: net worth of zero or less', () => {
  it('debts alone: each is its share of the debt, and no holding is unbanded', () => {
    // 1,000 euros owed and 2,000 dollars owed, which are 1,000 euros: -2,000.
    const result = aggregate([debt('1000', 'EUR'), debt('2000', 'USD')], 'EUR', ROUND);
    assert.equal(result.totalNetWorthFunctional, -2000);
    assert.deepEqual(result.positions.map((p) => [p.code, p.netAmountFunctional, p.pctOfTotal, p.riskLevel]), [
      ['EUR', -1000, 50, 'functional'],
      ['USD', -1000, 50, 'net-debt'],
    ]);
  });

  it('a holding against a larger debt: the debt is over 100% of the negative total, the holding has no share', () => {
    // 3,000 euros owed, 2,000 dollars held (1,000 euros): -2,000. The debt is 150% of it.
    const result = aggregate([debt('3000', 'EUR'), asset('2000', 'USD')], 'EUR', ROUND);
    assert.deepEqual(result.positions.map((p) => [p.code, p.pctOfTotal, p.riskLevel, p.riskLabel]), [
      ['EUR', 150, 'functional', 'Your spending currency'],
      ['USD', 0, 'unbanded', 'No share to work out'],
    ]);
  });

  it('exactly zero: no share is worked out, and the holding in another currency is unbanded', () => {
    // 1,000 euros owed and 2,000 dollars held, which are 1,000 euros.
    const result = aggregate([debt('1000', 'EUR'), asset('2000', 'USD')], 'EUR', ROUND);
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.deepEqual(result.positions.map((p) => [p.code, p.pctOfTotal, p.riskLevel, p.riskLabel]), [
      ['EUR', 0, 'functional', 'Your spending currency'],
      ['USD', 0, 'unbanded', 'No share to work out'],
    ]);
  });

  it('a currency that nets to nothing, or has no rate, has a share of plain zero and keeps its band', () => {
    // 500 euros owed; dollars held and owed cancel; koruna have no rate.
    const result = aggregate([debt('500', 'EUR'), asset('100', 'USD'), debt('100', 'USD'), asset('900', 'CZK')], 'EUR', ROUND);
    assert.equal(result.totalNetWorthFunctional, -500);
    for (const code of ['USD', 'CZK']) {
      const pos = byCode(result, code);
      // Not minus zero, which a number format writes as "-0".
      assert.ok(Object.is(pos.pctOfTotal, 0), `${code} has ${Object.is(pos.pctOfTotal, -0) ? 'minus zero' : pos.pctOfTotal}`);
      assert.deepEqual([pos.riskLevel, pos.riskLabel], ['low', 'Low exposure']);
    }
    assert.equal(byCode(result, 'CZK').rateUnavailable, true);
  });
});

describe('concentrationShares: a debt larger than what is held', () => {
  it('goes by the amounts, where the shares of net worth would say something else', () => {
    // 200 euros owed and 100 euros' worth of dollars held: sizes 200 and 100 of 300,
    // while as shares of the negative net worth they are 200% and nothing.
    const shares = concentrationShares([
      { code: 'EUR', netAmountFunctional: -200, pctOfTotal: 200 },
      { code: 'USD', netAmountFunctional: 100, pctOfTotal: 0 },
    ]);
    assert.deepEqual([...shares], [['EUR', (200 / 300) * 100], ['USD', (100 / 300) * 100]]);
  });
});

describe('netTotal', () => {
  const total = (...amounts: number[]) => netTotal(amounts.map((netAmountFunctional) => ({ netAmountFunctional })));

  it('adds the converted amounts', () => {
    assert.equal(total(), 0);
    assert.equal(total(600, 200, -300), 500);
    assert.equal(total(-1000, -1000), -2000);
  });

  it('takes what adding can itself lose for zero, up to and including the stated bound', () => {
    // Two amounts whose sizes add to 1, so the bound, 2 x 3 x epsilon x 1, is six epsilons.
    const pair = (epsilons: number) => total(0.5 + (epsilons / 2) * Number.EPSILON, -(0.5 - (epsilons / 2) * Number.EPSILON));
    assert.equal(pair(4), 0, 'four epsilons, inside the bound');
    assert.equal(pair(6), 0, 'six epsilons, the bound itself');
    assert.equal(pair(8), 8 * Number.EPSILON, 'eight epsilons, outside it');
  });

  it('takes the cent lost in converting for zero: 1,000 euros less 1,100 dollars at 1.1', () => {
    assert.notEqual(1000 - 1100 / 1.1, 0, 'the plain sum leaves a residue');
    assert.equal(total(1000, -1100 / 1.1), 0);
  });

  it('keeps a small difference that is real', () => {
    assert.equal(total(1e15, -(1e15 - 1000)), 1000);
  });

  it('measures the bound against what was held and owed before it cancelled, where a position says it (#824)', () => {
    const one = (netAmountFunctional: number, grossFunctional?: number) => netTotal([{ netAmountFunctional, grossFunctional }]);
    // One currency, so the bound is 2 x 2 x epsilon x the gross: four epsilons of a gross of 1.
    assert.equal(one(4 * Number.EPSILON, 1), 0, 'the bound itself');
    assert.equal(one(-4 * Number.EPSILON, 1), 0, 'below zero too');
    assert.equal(one(6 * Number.EPSILON, 1), 6 * Number.EPSILON, 'outside it');
    // The same net amount is a net worth by its own size, and residue beside the million it was left by.
    assert.equal(one(1e-11), 1e-11);
    assert.equal(one(1e-11, 1e6), 0);
    // A gross of nothing leaves no room: a currency with no rate adds none.
    assert.equal(netTotal([{ netAmountFunctional: 1e-11 }, { netAmountFunctional: 0, grossFunctional: 0 }]), 1e-11);
    // Each position by what it says, the others by their own size: 1 + 0.5 + 0.5, three currencies, 16 epsilons.
    const mixed = (residue: number) => netTotal([{ netAmountFunctional: residue, grossFunctional: 1 }, { netAmountFunctional: 0.5 }, { netAmountFunctional: -0.5 }]);
    assert.equal(mixed(16 * Number.EPSILON), 0);
    assert.equal(mixed(18 * Number.EPSILON), 18 * Number.EPSILON);
  });
});

describe('amounts that cancel inside one currency (#824, #918)', () => {
  const RATES = { EUR: 1, USD: 1.1 };

  it('€500,000.30 held, €499,000.10 and $1,100.22 owed at 1.1: what the floats leave is a net worth of zero, with no shares', () => {
    assert.ok(Math.abs(500000.30 - 499000.10 - 1100.22 / 1.1) > 1e-11, 'the plain sum leaves a residue');
    for (const rows of orders([asset('500000.30', 'EUR'), debt('499000.10', 'EUR'), debt('1100.22', 'USD')])) {
      const result = aggregate(rows, 'EUR', RATES);
      assert.equal(result.totalNetWorthFunctional, 0);
      assert.equal(result.noShares, true);
      assert.deepEqual(result.positions.map((p) => [p.code, p.pctOfTotal, p.riskLevel]), [['EUR', 0, 'functional'], ['USD', 0, 'net-debt']]);
      // The euros are added in cents, 50,000,030 less 49,900,010: the net is 1,000.20 itself, not the floats' 1000.2000000000116.
      assert.equal(byCode(result, 'EUR').netAmountOriginal, 1000.2);
      assert.notEqual(500000.30 - 499000.10, 1000.2);
      // Added exactly, a currency is measured by its net amount and names no gross.
      assert.deepEqual(result.positions.map((p) => 'grossFunctional' in p), [false, false]);
    }
  });

  it('a cent more is a real net worth of a cent, and is kept', () => {
    const result = aggregate([asset('500000.31', 'EUR'), debt('499000.10', 'EUR'), debt('1100.22', 'USD')], 'EUR', RATES);
    assert.ok(Math.abs(result.totalNetWorthFunctional - 0.01) < 1e-10, String(result.totalNetWorthFunctional));
    assert.equal(result.noShares, false);
    // The smallest total kept beside these: 2 x 3 x epsilon x the net positions' 2,000.41, under 3e-12.
    assert.ok(2 * 3 * Number.EPSILON * 2000.41 < 3e-12);
  });

  it('one currency alone: 0.1 and 0.2 held against 0.3 owed is nothing', () => {
    assert.notEqual(0.1 + 0.2 - 0.3, 0);
    const result = aggregate([asset('0.1', 'EUR'), asset('0.2', 'EUR'), debt('0.3', 'EUR')], 'EUR', RATES);
    assert.equal(result.positions[0].netAmountOriginal, 0);
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.equal(result.noShares, true);
  });

  it('500 rows at a gross of 1e15 keep a real 222, which a count of rows would take for zero', () => {
    // 250 holdings and 250 debts of two million million each, and 222 more held.
    const rows = [...Array.from({ length: 250 }, (_, i) => asset(i === 0 ? '2000000000222' : '2000000000000', 'EUR')), ...Array.from({ length: 250 }, () => debt('2000000000000', 'EUR'))];
    const result = aggregate(rows, 'EUR', RATES);
    assert.equal(result.totalNetWorthFunctional, 222);
    assert.equal(result.noShares, false);
    // Counting the 500 rows, the bound at a gross of 1e15 would be over 222.
    assert.ok(2 * 501 * Number.EPSILON * 1e15 > 222);
  });
});

describe('a currency’s rows are added in whole units of the smallest decimal typed (#918)', () => {
  const RATES = { EUR: 1, USD: 1.1 };
  const net = (...rows: AssetRow[]) => aggregate(rows, 'EUR', RATES).positions[0].netAmountOriginal;
  const exact = (...rows: AssetRow[]) => aggregate(rows, 'EUR', RATES).positions.map((p) => p.grossFunctional);

  it('500 rows of differing amounts that cancel, about 4.45e13 a side in cents: nothing, where the floats left 0.09', () => {
    // A fixed list: 250 amounts from a multiplying sequence, and as debts the same amounts with a
    // sum moved from each to its neighbour, so no debt equals a holding and the two sides are equal.
    const cents: number[] = [];
    for (let i = 0, x = 314; i < 250; i++) {
      x = (x * 48271) % 2147483647;
      cents.push(x * 16001 + (x % 977));
    }
    const written = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
    const held = cents.map(written);
    const owed = cents.flatMap((c, i) => (i % 2 === 0 ? [written(c - (c % 1000003) - 1), written(cents[i + 1] + (c % 1000003) + 1)] : []));
    assert.equal(cents.reduce((sum, c) => sum + c, 0), 4452167724800097, 'in cents, inside the safe integers');
    assert.equal(new Set([...held, ...owed]).size, 500);
    // The floats, added in the order typed, leave more than the bound allowed at that gross.
    const sum = (list: string[]) => list.reduce((total, v) => total + Number(v), 0);
    assert.equal(sum(held) - sum(owed), 0.0859375);
    assert.ok(0.0859375 > 2 * 2 * Number.EPSILON * (sum(held) + sum(owed)));
    const result = aggregate([...held.map((v) => asset(v, 'EUR')), ...owed.map((v) => debt(v, 'EUR'))], 'EUR', RATES);
    assert.equal(result.positions[0].netAmountOriginal, 0);
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.equal(result.noShares, true);
    // And a cent more on one row is a cent, with shares.
    const more = aggregate([asset('0.01', 'EUR'), ...held.map((v) => asset(v, 'EUR')), ...owed.map((v) => debt(v, 'EUR'))], 'EUR', RATES);
    assert.equal(more.totalNetWorthFunctional, 0.01);
    assert.equal(more.noShares, false);
  });

  it('what is typed is never rounded: the unit is the last decimal typed, whatever the currency has', () => {
    // Thousandths of a euro beside tenths: 125 + 100 less 225.
    assert.equal(net(asset('0.125', 'EUR'), asset('0.1', 'EUR'), debt('0.225', 'EUR')), 0);
    assert.equal(net(asset('0.105', 'EUR')), 0.105);
    assert.equal(net(asset('0.125', 'EUR'), debt('0.1', 'EUR')), 0.025);
    assert.notEqual(0.125 - 0.1, 0.025);
    // Grouping and spaces as the amount box takes them, a point with nothing before or after it.
    assert.equal(net(asset('1,000.50', 'EUR'), asset(' 2 000.25 ', 'EUR')), 3000.75);
    assert.deepEqual(exact(asset('1,000.50', 'EUR'), asset(' 2 000.25 ', 'EUR')), [undefined], 'added exactly, grouped or not');
    assert.equal(net(asset('.5', 'EUR'), asset('5.', 'EUR'), debt('0.7', 'EUR')), 4.8);
    // A debt larger than what is held is a net amount below zero.
    assert.equal(net(asset('0.1', 'EUR'), debt('0.3', 'EUR')), -0.2);
  });

  it('whole numbers add exactly up to 2^53 - 1 of that unit on each side; past it the floats are added, and say their gross', () => {
    const TOP = String(Number.MAX_SAFE_INTEGER);
    assert.equal(TOP, '9007199254740991');
    assert.deepEqual(exact(asset(TOP, 'EUR')), [undefined]);
    assert.deepEqual(exact(asset(TOP, 'EUR'), debt(TOP, 'EUR')), [undefined]);
    assert.deepEqual(exact(asset('9007199254740992', 'EUR')), [9007199254740992]);
    assert.deepEqual(exact(asset('1', 'EUR'), debt('9007199254740992', 'EUR')), [9007199254740993]);
    assert.deepEqual(exact(asset('9007199254740990', 'EUR'), asset('2', 'EUR')), [9007199254740992]);
    // In cents the same count of units is a hundredth of it; zeros that end the decimals are no unit.
    assert.deepEqual(exact(asset('90071992547409.91', 'EUR')), [undefined]);
    assert.deepEqual(exact(asset('90071992547409.92', 'EUR')), [90071992547409.92]);
    assert.deepEqual(exact(asset(`${TOP}.000`, 'EUR')), [undefined]);
    assert.deepEqual(exact(asset('900719925474099.10', 'EUR')), [undefined]);
    // Each currency by itself: the dollars here are exact, the euros are not, and a gross is converted.
    assert.deepEqual(exact(asset('9007199254740992', 'EUR'), asset('110', 'USD')), [9007199254740992, undefined]);
    assert.deepEqual(exact(asset('1', 'EUR'), asset('9907919180215091', 'USD'), debt('1', 'USD')), [undefined, 9907919180215092 / 1.1]);
  });

  it('decimals past the twenty-second are past what a power of ten can carry: the floats are added', () => {
    assert.deepEqual(exact(asset('0.0000000000000000000001', 'EUR')), [undefined]);
    assert.deepEqual(exact(asset('0.00000000000000000000001', 'EUR')), [1e-23]);
    assert.equal(net(asset('0.0000000000000000000001', 'EUR')), 1e-22);
  });

  it('past the exact range the rule of #824 holds: residue of amounts that cancel is measured against their gross', () => {
    // 91,000,000,000,000.31 euros held, 90,999,999,999,000.11 owed, and 1,100.22 dollars owed at 1.1: nothing in all.
    const rows = [asset('91000000000000.31', 'EUR'), debt('90999999999000.11', 'EUR'), debt('1100.22', 'USD')];
    assert.ok(Math.abs(91000000000000.31 - 90999999999000.11 - 1100.22 / 1.1) > 0.003, 'the floats leave a third of a cent');
    const result = aggregate(rows, 'EUR', RATES);
    assert.equal(byCode(result, 'EUR').grossFunctional, 91000000000000.31 + 90999999999000.11);
    assert.equal(result.totalNetWorthFunctional, 0);
    assert.equal(result.noShares, true);
    // A thousand more is a thousand, to the float's step at that size.
    const real = aggregate([asset('91000000000000.31', 'EUR'), debt('90999999998000.11', 'EUR'), debt('1100.22', 'USD')], 'EUR', RATES);
    assert.ok(Math.abs(real.totalNetWorthFunctional - 1000) < 0.05, String(real.totalNetWorthFunctional));
  });

  it('a currency with no rate is in no total and names no gross, exact or not', () => {
    const result = aggregate([asset('1000', 'EUR'), asset('9007199254740992', 'GBP'), debt('200', 'GBP')], 'EUR', { EUR: 1 });
    assert.equal('grossFunctional' in byCode(result, 'GBP'), false);
    assert.equal(result.totalNetWorthFunctional, 1000);
  });
});

describe('sharesUnknown (#887)', () => {
  const position = (code: string, more: Partial<CurrencyPosition> = {}): CurrencyPosition => ({
    code, netAmountOriginal: 100, netAmountFunctional: 0, pctOfTotal: 0, isFunctional: code === 'EUR', riskLevel: 'low', riskLabel: '', ...more,
  });
  const result = (hasRates: AggregationResult['hasRates'], ...positions: CurrencyPosition[]): AggregationResult => ({ positions, totalNetWorthFunctional: 0, hasRates });
  const row = (value: string, currency: string): AssetRow => ({ name: '', value, currency, type: 'asset' });

  it('a link without amounts whose total was zero or less had its rates: its shares are withheld, not unknown', () => {
    const withheld = { ...result('none', position('EUR'), position('USD')), noShares: true };
    assert.equal(sharesUnknown(withheld, 'EUR'), false);
    assert.equal(sharesUnknown({ ...withheld, noShares: false }, 'EUR'), true);
  });

  it('several currencies, no rates, nothing converted and no share carried: no share can be worked out', () => {
    assert.equal(sharesUnknown(result('none', position('EUR'), position('USD', { rateUnavailable: true })), 'EUR'), true);
    assert.equal(sharesUnknown(aggregate([row('1000', 'EUR'), row('2000', 'USD')], 'EUR', null), 'EUR'), true);
    // No spending currency among them at all.
    assert.equal(sharesUnknown(aggregate([row('1000', 'GBP'), row('2000', 'USD')], 'EUR', null), 'EUR'), true);
  });

  it('is not so with any rate, with one currency alone, or with nothing entered', () => {
    assert.equal(sharesUnknown(result('full', position('EUR'), position('USD')), 'EUR'), false);
    assert.equal(sharesUnknown(result('partial', position('EUR'), position('USD', { rateUnavailable: true })), 'EUR'), false);
    assert.equal(sharesUnknown(result('none', position('EUR')), 'EUR'), false);
    assert.equal(sharesUnknown(result('none'), 'EUR'), false);
    assert.equal(sharesUnknown(aggregate([], 'EUR', null), 'EUR'), false);
    assert.equal(sharesUnknown(aggregate([row('1000', 'EUR')], 'EUR', null), 'EUR'), false);
    assert.equal(sharesUnknown(aggregate([row('1000', 'EUR'), row('2000', 'USD')], 'EUR', { USD: 1.1 }), 'EUR'), false);
  });

  it('a link that carries a share or an amount for any currency has shares to show', () => {
    assert.equal(sharesUnknown(result('none', position('EUR'), position('USD', { pctOfTotal: 100 })), 'EUR'), false);
    assert.equal(sharesUnknown(result('none', position('EUR', { pctOfTotal: -20 }), position('USD')), 'EUR'), false);
    assert.equal(sharesUnknown(result('none', position('EUR'), position('USD', { netAmountFunctional: 5 })), 'EUR'), false);
    assert.equal(sharesUnknown(result('none', position('EUR', { netAmountFunctional: -5 }), position('USD')), 'EUR'), false);
  });
});

describe('rateGap', () => {
  const position = (code: string, more: Partial<CurrencyPosition> = {}): CurrencyPosition => ({
    code, netAmountOriginal: 100, netAmountFunctional: 100, pctOfTotal: 50, isFunctional: code === 'EUR', riskLevel: 'low', riskLabel: '', ...more,
  });
  const result = (hasRates: AggregationResult['hasRates'], ...positions: CurrencyPosition[]): AggregationResult => ({ positions, totalNetWorthFunctional: 0, hasRates });
  const missing = { rateUnavailable: true };

  it('is none when everything is in the spending currency, whatever the result says of rates', () => {
    for (const hasRates of ['full', 'partial', 'none'] as const) {
      assert.equal(rateGap(result(hasRates, position('EUR')), 'EUR', true), null, hasRates);
      assert.equal(rateGap(result(hasRates, position('EUR')), 'EUR', false), null, hasRates);
    }
  });

  it('is none with nothing entered', () => {
    assert.equal(rateGap(result('none'), 'EUR', true), null);
    assert.equal(rateGap(result('full'), 'EUR', true), null);
  });

  it('is "all" when every other currency lacks its rate, and "some" when only some do', () => {
    assert.equal(rateGap(result('none', position('EUR'), position('USD', missing), position('GBP', missing)), 'EUR', true), 'all');
    assert.equal(rateGap(result('partial', position('USD', missing)), 'EUR', true), 'all');
    assert.equal(rateGap(result('partial', position('EUR'), position('USD'), position('GBP', missing)), 'EUR', true), 'some');
    assert.equal(rateGap(result('full', position('EUR'), position('USD')), 'EUR', true), null);
  });

  it('is never "all" for a view without amounts, which has no original amounts to fall back on', () => {
    assert.equal(rateGap(result('partial', position('EUR'), position('USD', missing)), 'EUR', false), 'some');
    assert.equal(rateGap(result('none', position('EUR'), position('USD', missing)), 'EUR', false), null);
  });
});

describe('parseCSV: which separator a file uses', () => {
  const names = (text: string) => parseCSV(text).rows.map((r) => [r.name, r.value, r.currency]);

  it('a comma file may hold a semicolon or a tab inside a name', () => {
    assert.deepEqual(names('Flat; garage,250000,EUR,asset'), [['Flat; garage', '250000', 'EUR']]);
    assert.deepEqual(names('Flat\tgarage,250000,EUR'), [['Flat\tgarage', '250000', 'EUR']]);
    assert.deepEqual(names('A\tB\tC,1000,EUR'), [['A\tB\tC', '1000', 'EUR']], 'as many tabs as commas is still a comma file');
  });

  it('a semicolon file may hold as many tabs as semicolons', () => {
    assert.deepEqual(names('Flat\tA\tB;1000;EUR'), [['Flat\tA\tB', '1000', 'EUR']]);
  });

  it('a tab file may hold a semicolon inside a name', () => {
    assert.deepEqual(names('A;B\t1000\tEUR'), [['A;B', '1000', 'EUR']]);
  });

  it('in a semicolon or tab file a point groups and a comma is the decimal mark; in a comma file it is the other way', () => {
    assert.deepEqual(names('Flat;1.500;EUR\nCash;1,500;EUR'), [['Flat', '1500', 'EUR'], ['Cash', '1.5', 'EUR']]);
    assert.deepEqual(names('Flat\t1.500\tEUR'), [['Flat', '1500', 'EUR']]);
    assert.deepEqual(names('Flat,1.500,EUR\nCash,"1,500",EUR'), [['Flat', '1.5', 'EUR'], ['Cash', '1500', 'EUR']]);
  });
});

describe('parseCSV: which first line is a header', () => {
  it('a header that names value and currency is skipped even when it holds a digit', () => {
    assert.deepEqual(parseCSV('Name,Value 2026,Currency,Type\nSavings,100,EUR,asset'), {
      rows: [{ name: 'Savings', value: '100', currency: 'EUR', type: 'asset' }],
      errors: [],
    });
    assert.deepEqual(parseCSV('NAME,VALUE 2026,CURRENCY\nSavings,100,EUR').errors, []);
  });

  it('a first row whose name holds the word value, or the word currency, is a row', () => {
    assert.deepEqual(parseCSV('Value fund,1000,EUR').rows, [{ name: 'Value fund', value: '1000', currency: 'EUR', type: 'asset' }]);
    assert.deepEqual(parseCSV('Currency account,500,USD').rows, [{ name: 'Currency account', value: '500', currency: 'USD', type: 'asset' }]);
  });

  it('a first line of two cells, an amount that cannot be read and a currency, is an error and not a header', () => {
    const { rows, errors } = parseCSV('lots,EUR');
    assert.deepEqual(rows, []);
    assert.deepEqual(errors.map((e) => [e.line, e.reason, e.values]), [[1, 'invalidValue', { value: 'lots' }]]);
  });
});

describe('parseCSV: lines and marks that are not data', () => {
  it('skips lines that hold only spaces', () => {
    assert.deepEqual(parseCSV('A,1,EUR\n   \n\t\nB,2,EUR'), {
      rows: [
        { name: 'A', value: '1', currency: 'EUR', type: 'asset' },
        { name: 'B', value: '2', currency: 'EUR', type: 'asset' },
      ],
      errors: [],
    });
  });

  it('takes a byte-order mark off the start of the file, and leaves the same character inside a name alone', () => {
    assert.deepEqual(parseCSV('﻿Savings,100,EUR').rows.map((r) => r.name), ['Savings']);
    assert.deepEqual(parseCSV('Sav﻿ings,100,EUR').rows.map((r) => r.name), ['Sav﻿ings']);
  });

  it('reads the page’s words for the two types with spaces around them', () => {
    const words = { asset: [' Activo '], liability: ['  Pasivo'] };
    assert.deepEqual(parseCSV('A,1,EUR,activo\nB,2,EUR,PASIVO', words).rows.map((r) => r.type), ['asset', 'liability']);
  });
});

describe('parseCSV: what an error says', () => {
  it('names every supported code after a currency it does not know', () => {
    const [error] = parseCSV('Coins,5,XYZ').errors;
    const codes = CURRENCIES.map((c) => c.code);
    assert.equal(codes.length, 38);
    assert.equal(error.values?.supported, codes.join(', '));
    assert.match(error.values!.supported, /^AOA, AUD, .*, ZAR$/);
    assert.equal(error.message, `“XYZ” is not a supported currency. Supported: ${codes.join(', ')}.`);
  });

  it('says which type it did not know', () => {
    const [error] = parseCSV('Coins,5,EUR,Gift').errors;
    assert.deepEqual([error.line, error.reason, error.values], [1, 'unknownType', { value: 'gift' }]);
    assert.equal(error.message, '“gift” is not a type the tool knows. Use asset or liability.');
  });
});

describe('decodeCsv: a browser without the Windows code page', () => {
  it('keeps the UTF-8 reading, broken letters and all, rather than nothing', () => {
    const Real = globalThis.TextDecoder;
    class Utf8Only extends Real {
      constructor(label?: string) {
        if (label !== 'utf-8') throw new RangeError('unsupported');
        super(label);
      }
    }
    globalThis.TextDecoder = Utf8Only as typeof TextDecoder;
    try {
      // "Café" in Windows-1252: é is 0xE9, which is no UTF-8.
      assert.equal(decodeCsv(Uint8Array.from([0x43, 0x61, 0x66, 0xe9])), 'Caf�');
    } finally {
      globalThis.TextDecoder = Real;
    }
  });
});
