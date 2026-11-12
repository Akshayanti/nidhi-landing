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
  type AssetRow,
} from './math.ts';
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
    assert.equal(errors[0].message, '"abc" is not a valid positive number.');
  });

  it('reports error for unsupported currency', () => {
    const csv = `Test,50000,XYZ`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.startsWith('"XYZ" is not a supported currency. Supported:'));
  });

  it('reports error for zero value', () => {
    const csv = `Test,0,USD`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, '"0" is not a valid positive number.');
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
