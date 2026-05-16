/**
 * Unit tests for src/utils/currencyRiskMath.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregate,
  isSupportedCurrency,
  parseCSV,
  formatPct,
  getCurrencyLabel,
  type AssetRow,
} from './currencyRiskMath.ts';

// ---------------------------------------------------------------------------
// isSupportedCurrency
// ---------------------------------------------------------------------------

describe('isSupportedCurrency', () => {
  it('returns true for all 30 supported currencies', () => {
    const supported = ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR'];
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
    assert.ok(result.hasRates);
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

  it('handles missing rates gracefully (hasRates=false)', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
      { name: 'Stocks', value: '30000', currency: 'USD', type: 'asset' },
    ];
    const result = aggregate(rows, 'EUR', null);
    assert.equal(result.hasRates, false);
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

  it('handles unknown currency in rates (missing rate)', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    // JPY is supported but not in our sampleRates
    const result = aggregate(
      [{ name: 'Yen', value: '1000000', currency: 'JPY', type: 'asset' }],
      'EUR',
      { EUR: 1.0 },
    );
    // Should still produce a position with netAmountFunctional = 0
    assert.equal(result.positions.length, 1);
    assert.equal(result.positions[0].netAmountFunctional, 0);
    assert.equal(result.hasRates, true);
  });
});

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------

describe('parseCSV', () => {
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

  it('defaults type to asset when omitted or unrecognized', () => {
    const csv = `Test,50000,USD,liability
Test2,30000,EUR
Test3,10000,GBP,unknown`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows[0].type, 'liability');
    assert.equal(rows[1].type, 'asset');
    assert.equal(rows[2].type, 'asset');
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
    // The value string keeps the commas; parseAmount strips them during aggregation.
    assert.equal(rows[0].value, '1,000,000');
  });

  it('handles header auto-detection when value/currency keywords present', () => {
    const csv = `name,value,currency,type
Test,50000,USD,asset`;
    const { rows, errors } = parseCSV(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Test');
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
