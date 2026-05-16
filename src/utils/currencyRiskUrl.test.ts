/**
 * Unit tests for src/utils/currencyRiskUrl.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeFromQueryString,
  encodeShared,
  encodeFullData,
  type DecodeResult,
  type ShareMode,
} from './currencyRiskUrl.ts';
import type { AssetRow, CurrencyPosition } from './currencyRiskMath.ts';

// ---------------------------------------------------------------------------
// encodeFullData + decodeFromQueryString round-trips
// ---------------------------------------------------------------------------

describe('full-data round-trip', () => {
  it('round-trips a simple two-row state', () => {
    const rows: AssetRow[] = [
      { name: 'US Stocks', value: '50000', currency: 'USD', type: 'asset' },
      { name: 'Apartment', value: '200000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const decoded = decodeFromQueryString(qs);

    assert.equal(decoded.functionalCurrency, 'EUR');
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].name, 'US Stocks');
    assert.equal(decoded.rows[0].value, '50000');
    assert.equal(decoded.rows[0].currency, 'USD');
    assert.equal(decoded.rows[0].type, 'asset');
    assert.equal(decoded.rows[1].name, 'Apartment');
    assert.equal(decoded.rows[1].value, '200000');
    assert.equal(decoded.rows[1].currency, 'EUR');
    assert.equal(decoded.rows[1].type, 'asset');
  });

  it('round-trips liabilities', () => {
    const rows: AssetRow[] = [
      { name: 'US Stocks', value: '100000', currency: 'USD', type: 'asset' },
      { name: 'US Mortgage', value: '60000', currency: 'USD', type: 'liability' },
    ];
    const qs = encodeFullData(rows, 'USD');
    const decoded = decodeFromQueryString(qs);

    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[1].type, 'liability');
  });

  it('omits default currency (USD) from URL', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'USD', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'USD');
    // USD is default, so a1_c should be omitted.
    assert.ok(!qs.includes('a1_currency=USD'));
    // func=USD omitted because USD is default.
    assert.ok(!qs.includes('func=USD'));
  });

  it('omits default type=asset from URL', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('a1_type=asset'));
  });

  it('includes non-default type in URL', () => {
    const rows: AssetRow[] = [
      { name: 'Debt', value: '60000', currency: 'USD', type: 'liability' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(qs.includes('a1_type=liability'));
  });

  it('omits empty names from URL', () => {
    const rows: AssetRow[] = [
      { name: '', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('a1_name='));
  });

  it('omits empty values from URL', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('a1_value='));
  });

  it('omits n=2 (default row count) from URL', () => {
    const rows: AssetRow[] = [
      { name: 'A', value: '10000', currency: 'USD', type: 'asset' },
      { name: 'B', value: '20000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('n='), 'should not include n=2 since it is default');
  });

  it('includes n when row count differs from default', () => {
    const rows: AssetRow[] = [
      { name: 'A', value: '10000', currency: 'USD', type: 'asset' },
      { name: 'B', value: '20000', currency: 'EUR', type: 'asset' },
      { name: 'C', value: '30000', currency: 'GBP', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(qs.includes('n=3'));
  });

  it('default-state URL decodes to 2 empty rows with USD', () => {
    const decoded = decodeFromQueryString('');
    assert.equal(decoded.functionalCurrency, 'USD');
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].name, '');
    assert.equal(decoded.rows[0].value, '');
    assert.equal(decoded.rows[0].currency, 'USD');
    assert.equal(decoded.rows[0].type, 'asset');
  });

  it('strips trailing empty rows on decode', () => {
    // Simulate a URL with n=4 but only 2 rows have values.
    const qs = 'a1_name=A&a1_value=10000&a1_currency=USD&a2_name=B&a2_value=20000&a2_currency=EUR&n=4';
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].name, 'A');
    assert.equal(decoded.rows[1].name, 'B');
  });

  it('ensures at least 1 row', () => {
    // n=0 is impossible through normal encode but could be in a handmade URL.
    const decoded = decodeFromQueryString('n=0');
    assert.equal(decoded.rows.length, 2); // DEFAULT_ROW_COUNT
  });

  it('clamps hostile n=999 to MAX_ROWS_FOR_URL', () => {
    // Fill all 50 clamped rows with data so stripping doesn't reduce count.
    const params = ['n=999'];
    for (let i = 1; i <= 50; i++) {
      params.push(`a${i}_name=X`, `a${i}_value=${i}`, `a${i}_currency=USD`);
    }
    const decoded = decodeFromQueryString(params.join('&'));
    assert.equal(decoded.rows.length, 50);
  });
});

// ---------------------------------------------------------------------------
// Anonymous mode
// ---------------------------------------------------------------------------

describe('redacted mode', () => {
  const samplePositions: CurrencyPosition[] = [
    {
      code: 'EUR', netAmountOriginal: 100000, netAmountFunctional: 100000,
      pctOfTotal: 71.9, isFunctional: true, riskLevel: 'functional',
      riskLabel: 'Your spending currency',
    },
    {
      code: 'USD', netAmountOriginal: 40000, netAmountFunctional: 37037,
      pctOfTotal: 28.1, isFunctional: false, riskLevel: 'moderate',
      riskLabel: 'Moderate exposure',
    },
  ];

  it('encodes and decodes redacted positions', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    const decoded = decodeFromQueryString(qs);

    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.shareMode, 'redacted');
    assert.equal(decoded.functionalCurrency, 'EUR');
    assert.equal(decoded.sharedPositions!.length, 2);

    const eur = decoded.sharedPositions!.find((p) => p.code === 'EUR')!;
    assert.equal(eur.pct, 71.9);
    assert.equal(eur.riskLevel, 'functional');
    assert.equal(eur.netAmountFunctional, 0);

    const usd = decoded.sharedPositions!.find((p) => p.code === 'USD')!;
    assert.equal(usd.pct, 28.1);
    assert.equal(usd.riskLevel, 'moderate');
    assert.equal(usd.netAmountFunctional, 0);
  });

  it('URL includes mode=redacted flag, not anon=1', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    assert.ok(qs.includes('mode=redacted'));
    assert.ok(!qs.includes('anon=1'));
  });

  it('no asset rows or amounts in redacted URL', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    assert.ok(!qs.includes('a1_'));
    assert.ok(!qs.includes('amt_'));
    assert.ok(qs.includes('c_EUR=71.9'));
    assert.ok(qs.includes('r_EUR=functional'));
  });

  it('decoded rows are default empty for the form', () => {
    const decoded = decodeFromQueryString('mode=redacted&func=EUR&c_EUR=100.0&r_EUR=functional');
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].value, '');
  });

  it('handles unrecognized risk levels gracefully', () => {
    const decoded = decodeFromQueryString('mode=redacted&func=EUR&c_USD=50.0&r_USD=unknown');
    const pos = decoded.sharedPositions!.find((p) => p.code === 'USD')!;
    assert.equal(pos.riskLevel, 'low');
  });

  it('handles malformed percentage', () => {
    const decoded = decodeFromQueryString('mode=redacted&func=EUR&c_USD=abc&r_USD=moderate');
    const pos = decoded.sharedPositions!.find((p) => p.code === 'USD');
    assert.equal(pos, undefined);
  });
});

// ---------------------------------------------------------------------------
// Full sharing mode (mode=full)
// ---------------------------------------------------------------------------

describe('full sharing mode', () => {
  const samplePositions: CurrencyPosition[] = [
    {
      code: 'EUR', netAmountOriginal: 200000, netAmountFunctional: 200000,
      pctOfTotal: 67.8, isFunctional: true, riskLevel: 'functional',
      riskLabel: 'Your spending currency',
    },
    {
      code: 'USD', netAmountOriginal: 70000, netAmountFunctional: 64814.81,
      pctOfTotal: 22.0, isFunctional: false, riskLevel: 'moderate',
      riskLabel: 'Moderate exposure',
    },
    {
      code: 'INR', netAmountOriginal: 2695000, netAmountFunctional: 30111.73,
      pctOfTotal: 10.2, isFunctional: false, riskLevel: 'low',
      riskLabel: 'Low exposure',
    },
  ];

  const sampleRows: AssetRow[] = [
    { name: 'Apartment', value: '200000', currency: 'EUR', type: 'asset' },
    { name: 'US Stocks', value: '50000', currency: 'USD', type: 'asset' },
    { name: 'US Mortgage', value: '20000', currency: 'USD', type: 'liability' },
    { name: 'India FD', value: '2695000', currency: 'INR', type: 'asset' },
  ];

  it('encodes all data: rows, positions, amounts, split %', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    const decoded = decodeFromQueryString(qs);

    // URL structure.
    assert.ok(qs.includes('mode=full'));
    assert.ok(!qs.includes('anon=1'));
    assert.ok(qs.includes('a1_value='));
    assert.ok(qs.includes('c_USD=22.0'));
    assert.ok(qs.includes('r_USD=moderate'));
    assert.ok(qs.includes('amt_USD=64814.81'));

    // Decoded state.
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.shareMode, 'full');
    assert.equal(decoded.sharedPositions!.length, 3);
    assert.equal(decoded.rows.length, 4);
    assert.ok(decoded.rows.some((r) => r.value === '50000'));

    const usd = decoded.sharedPositions!.find((p) => p.code === 'USD')!;
    assert.equal(usd.pct, 22.0);
    assert.ok(Math.abs(usd.netAmountFunctional - 64814.81) < 0.1);
  });

  it('includes liabilities in full mode', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    const decoded = decodeFromQueryString(qs);
    assert.ok(decoded.rows.some((r) => r.type === 'liability'));
  });

  it('omits defaults to keep URLs short', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    assert.ok(!qs.includes('a1_type=asset')); // asset is default
    assert.ok(qs.includes('a3_type=liability')); // liability is not default
  });

  it('c_ and r_ keys always present', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    assert.ok(qs.includes('c_USD=22.0'));
    assert.ok(qs.includes('r_USD=moderate'));
    assert.ok(qs.includes('c_EUR=67.8'));
    assert.ok(qs.includes('r_EUR=functional'));
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  const samplePositionsForRoundTrip: CurrencyPosition[] = [
    {
      code: 'EUR', netAmountOriginal: 100000, netAmountFunctional: 100000,
      pctOfTotal: 100, isFunctional: true, riskLevel: 'functional',
      riskLabel: 'Your spending currency',
    },
  ];

  it('handles empty URLSearchParams (no params at all)', () => {
    const decoded = decodeFromQueryString('');
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.functionalCurrency, 'USD');
  });

  it('encodes rows with special characters in names', () => {
    const rows: AssetRow[] = [
      { name: 'FD @ SBI (5yr)', value: '100000', currency: 'INR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].name, 'FD @ SBI (5yr)');
  });

  it('handles decode with only func param', () => {
    const decoded = decodeFromQueryString('func=GBP');
    assert.equal(decoded.functionalCurrency, 'GBP');
    assert.equal(decoded.rows.length, 2);
  });

  it('user data decode has shareMode=null and isReadOnly=false', () => {
    const decoded = decodeFromQueryString('func=EUR');
    assert.equal(decoded.shareMode, null);
    assert.equal(decoded.isReadOnly, false);
  });

  it('full-data encode does not include mode flag', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '10000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('mode='));
  });

  it('encodeShared full round-trip preserves shareMode', () => {
    const rows: AssetRow[] = [
      { name: 'Savings', value: '100000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeShared(rows, samplePositionsForRoundTrip, 'EUR', 'full');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.shareMode, 'full');
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.sharedPositions!.length, 1);
    assert.equal(decoded.sharedPositions![0].code, 'EUR');
  });

  it('encodeShared redacted round-trip preserves shareMode', () => {
    const qs = encodeShared([], samplePositionsForRoundTrip, 'EUR', 'redacted');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.shareMode, 'redacted');
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.sharedPositions!.length, 1);
    assert.equal(decoded.sharedPositions![0].pct, 100.0);
    assert.equal(decoded.sharedPositions![0].netAmountFunctional, 0);
  });

  it('includes func param in full-data mode when non-USD', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '10000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'GBP');
    assert.ok(qs.includes('func=GBP'));
  });

  it('round-trips with only value and currency (no name, no type)', () => {
    const rows: AssetRow[] = [
      { name: '', value: '50000', currency: 'INR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'USD');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].name, '');
    assert.equal(decoded.rows[0].value, '50000');
    assert.equal(decoded.rows[0].currency, 'INR');
    assert.equal(decoded.rows[0].type, 'asset');
  });
});
