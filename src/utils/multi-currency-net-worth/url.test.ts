/**
 * Unit tests for src/utils/multi-currency-net-worth/url.ts.
 *
 * Wire format: see the file header in url.ts. Tests below assert against
 * the compact-tuple format (`a1=Name~Value~Currency~Type`,
 * `p_USD=pct~risk~amt`, single-letter scalars `m` / `f` / `n`). The
 * legacy per-field format (`a1_name`, `mode=full`, etc.) was hard-cut in
 * v5.2 of the free-tools plan.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeFromQueryString,
  encodeShared,
  encodeFullData,
} from './url.ts';
import type { AssetRow, CurrencyPosition } from './math.ts';

// ---------------------------------------------------------------------------
// encodeFullData + decodeFromQueryString round-trips (user's own URL sync)
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

  it('omits default currency (EUR) from per-row tuple', () => {
    // EUR is the default per-row currency and the trailing-default-trim
    // in encodeTuple drops it. The tuple should reduce to "Savings~50000".
    const rows: AssetRow[] = [
      { name: 'Savings', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    // Read via URLSearchParams so the assertion isn't sensitive to how the
    // engine encodes spaces (`+` vs `%20`) or the order of params.
    const a1 = new URLSearchParams(qs).get('a1');
    assert.equal(a1, 'Savings~50000');
    // `f` (functional currency) also omitted at the EUR default.
    assert.ok(!qs.includes('f=EUR'));
  });

  it('emits non-default currency (USD) explicitly so it round-trips', () => {
    // After the EUR-default switch, USD is no longer the omitted value.
    // A USD position must therefore appear in the tuple or it would
    // silently decode as EUR. This test pins that contract.
    const rows: AssetRow[] = [
      { name: 'US Stocks', value: '50000', currency: 'USD', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'USD');
    const a1 = new URLSearchParams(qs).get('a1');
    assert.equal(a1, 'US Stocks~50000~USD', 'tuple must carry USD verbatim');
    assert.ok(qs.includes('f=USD'), 'non-default functional currency must be encoded');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].currency, 'USD');
    assert.equal(decoded.functionalCurrency, 'USD');
  });

  it('omits default type=asset from URL (trailing-trim)', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const a1 = new URLSearchParams(qs).get('a1');
    // 'asset' is the default and lives at position 3 (trailing). Both
    // 'asset' and the default-EUR currency get trimmed.
    assert.equal(a1, 'Test~50000');
  });

  it('includes non-default type in URL', () => {
    const rows: AssetRow[] = [
      { name: 'Debt', value: '60000', currency: 'USD', type: 'liability' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const a1 = new URLSearchParams(qs).get('a1');
    assert.equal(a1, 'Debt~60000~USD~liability');
  });

  it('omits empty names (still emits value as a leading-empty tuple field)', () => {
    const rows: AssetRow[] = [
      { name: '', value: '50000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    // Tuple becomes "~50000": empty name, then value. Default currency
    // and default type are trimmed off the end.
    const a1 = new URLSearchParams(qs).get('a1');
    assert.equal(a1, '~50000');
  });

  it('drops rows with no value, name, or non-default currency', () => {
    // The form keeps empty trailing slots for UX; the URL must not
    // serialise them or every fresh form would emit a multi-row URL.
    const rows: AssetRow[] = [
      { name: 'A', value: '100', currency: 'USD', type: 'asset' },
      { name: '', value: '', currency: 'EUR', type: 'asset' }, // empty placeholder
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(qs.includes('a1='));
    assert.ok(!qs.includes('a2='), `empty placeholder row must not be in URL, got: ${qs}`);
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

  it('default-state URL decodes to 2 empty rows in default currency (EUR)', () => {
    const decoded = decodeFromQueryString('');
    assert.equal(decoded.functionalCurrency, 'EUR');
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].name, '');
    assert.equal(decoded.rows[0].value, '');
    assert.equal(decoded.rows[0].currency, 'EUR');
    assert.equal(decoded.rows[0].type, 'asset');
  });

  it('strips trailing empty rows on decode', () => {
    // Simulate a URL with n=4 but only 2 rows have populated tuples.
    // Empty `aN` entries shouldn't even round-trip — they'd be omitted
    // by the encoder — but we still want decode to be defensive about
    // hand-edited URLs.
    const qs = 'a1=A~10000~USD&a2=B~20000&n=4';
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].name, 'A');
    assert.equal(decoded.rows[1].name, 'B');
  });

  it('ensures at least 2 rows', () => {
    // n=0 is impossible through normal encode but could be in a handmade URL.
    const decoded = decodeFromQueryString('n=0');
    assert.equal(decoded.rows.length, 2); // DEFAULT_ROW_COUNT
  });

  it('clamps hostile n=999 to MAX_ROWS_FOR_URL', () => {
    // Fill all 50 clamped rows with data so stripping doesn't reduce count.
    const params = ['n=999'];
    for (let i = 1; i <= 50; i++) {
      params.push(`a${i}=X~${i}~USD`);
    }
    const decoded = decodeFromQueryString(params.join('&'));
    assert.equal(decoded.rows.length, 50);
  });
});

// ---------------------------------------------------------------------------
// Redacted sharing mode (m=r)
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
    // Redacted mode never carries amounts, so the decoded position
    // surfaces zero. Consumers must check `shareMode` before reading.
    assert.equal(eur.netAmountFunctional, 0);

    const usd = decoded.sharedPositions!.find((p) => p.code === 'USD')!;
    assert.equal(usd.pct, 28.1);
    assert.equal(usd.riskLevel, 'moderate');
    assert.equal(usd.netAmountFunctional, 0);
  });

  it('URL uses single-letter mode flag (m=r)', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    assert.ok(qs.includes('m=r'), `expected m=r flag, got: ${qs}`);
    // Legacy long-form keys must NOT appear — the v5.2 cutover removed them.
    assert.ok(!qs.includes('mode=redacted'));
    assert.ok(!qs.includes('anon=1'));
  });

  it('no asset rows or amounts in redacted URL', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    // No per-row tuples (a1, a2, ...) and no amount segment in p_*.
    assert.ok(!qs.includes('a1='));
    assert.ok(!qs.includes('a2='));
    // Position tuple has only pct~risk in redacted mode (2 fields → 1 tilde).
    const usdParam = new URLSearchParams(qs).get('p_USD')!;
    assert.equal(usdParam.split('~').length, 2, `redacted p_* should have 2 fields, got: ${usdParam}`);
  });

  it('decoded rows are default empty for the form', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_EUR=100.0~functional');
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].value, '');
  });

  it('handles unrecognized risk levels gracefully', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_USD=50.0~unknown');
    const pos = decoded.sharedPositions!.find((p) => p.code === 'USD')!;
    assert.equal(pos.riskLevel, 'low');
  });

  it('handles malformed percentage', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_USD=abc~moderate');
    const pos = decoded.sharedPositions!.find((p) => p.code === 'USD');
    assert.equal(pos, undefined);
  });
});

// ---------------------------------------------------------------------------
// Full sharing mode (m=f)
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
    assert.ok(qs.includes('m=f'));
    assert.ok(!qs.includes('mode=full')); // legacy form removed
    assert.ok(!qs.includes('anon=1'));
    // p_USD position tuple should have all 3 fields: pct~risk~amount.
    const usdParam = new URLSearchParams(qs).get('p_USD')!;
    const usdParts = usdParam.split('~');
    assert.equal(usdParts.length, 3);
    assert.equal(usdParts[0], '22.0');
    assert.equal(usdParts[1], 'moderate');
    assert.equal(usdParts[2], '64814.81');

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

  it('omits defaults inside row tuples to keep URLs short', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    const params = new URLSearchParams(qs);
    // Apartment is EUR/asset (both default), tuple should end after the
    // value field: "Apartment~200000".
    assert.equal(params.get('a1'), 'Apartment~200000');
    // US Mortgage is liability — that segment must appear.
    assert.equal(params.get('a3'), 'US Mortgage~20000~USD~liability');
  });

  it('always emits positions in full mode', () => {
    const qs = encodeShared(sampleRows, samplePositions, 'EUR', 'full');
    for (const code of ['USD', 'EUR', 'INR']) {
      assert.ok(qs.includes(`p_${code}=`), `expected p_${code} in URL`);
    }
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
    assert.equal(decoded.functionalCurrency, 'EUR');
  });

  it('encodes rows with special characters in names', () => {
    const rows: AssetRow[] = [
      { name: 'FD @ SBI (5yr)', value: '100000', currency: 'INR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].name, 'FD @ SBI (5yr)');
  });

  it('encodes a literal tilde in a name without corrupting the tuple', () => {
    // The wire format uses `~` as the field separator, so a name
    // containing a literal tilde must be escaped. Without this, the
    // tuple "Mortgage ~ House~300000~USD" would parse as 4 fields
    // instead of 3 and the user would see a corrupted row.
    const rows: AssetRow[] = [
      { name: 'Mortgage ~ House', value: '300000', currency: 'USD', type: 'liability' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].name, 'Mortgage ~ House');
    assert.equal(decoded.rows[0].value, '300000');
    assert.equal(decoded.rows[0].currency, 'USD');
    assert.equal(decoded.rows[0].type, 'liability');
  });

  it('handles decode with only `f` param', () => {
    const decoded = decodeFromQueryString('f=GBP');
    assert.equal(decoded.functionalCurrency, 'GBP');
    assert.equal(decoded.rows.length, 2);
  });

  it('user data decode has shareMode=null and isReadOnly=false', () => {
    const decoded = decodeFromQueryString('f=EUR');
    assert.equal(decoded.shareMode, null);
    assert.equal(decoded.isReadOnly, false);
  });

  it('full-data encode does not include the mode flag', () => {
    // The user's own URL sync (encodeFullData) is distinct from a share
    // link (encodeShared). Only share links carry `m=...` so a refresh
    // doesn't inadvertently lock the form into read-only mode.
    const rows: AssetRow[] = [
      { name: 'Test', value: '10000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'EUR');
    assert.ok(!qs.includes('m='));
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

  it('includes `f` param in full-data mode when non-default', () => {
    const rows: AssetRow[] = [
      { name: 'Test', value: '10000', currency: 'EUR', type: 'asset' },
    ];
    const qs = encodeFullData(rows, 'GBP');
    assert.ok(qs.includes('f=GBP'));
  });

  it('round-trips with only value and currency (no name, no type)', () => {
    const rows: AssetRow[] = [
      { name: '', value: '50000', currency: 'INR', type: 'asset' },
    ];
    // Functional currency = USD here so we exercise both a non-default
    // functional and a non-default per-row currency in one go.
    const qs = encodeFullData(rows, 'USD');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows[0].name, '');
    assert.equal(decoded.rows[0].value, '50000');
    assert.equal(decoded.rows[0].currency, 'INR');
    assert.equal(decoded.rows[0].type, 'asset');
    assert.equal(decoded.functionalCurrency, 'USD');
  });

  it('round-trips a non-default currency exactly through encode/decode', () => {
    // Tight regression pin: the wire-format compaction (omit-when-default)
    // must never alter the user's currency. A USD entry must come back as
    // USD, never as the default.
    const rows: AssetRow[] = [
      { name: 'A', value: '100', currency: 'USD', type: 'asset' },
      { name: 'B', value: '200', currency: 'GBP', type: 'liability' },
    ];
    const qs = encodeFullData(rows, 'GBP');
    const decoded = decodeFromQueryString(qs);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].currency, 'USD');
    assert.equal(decoded.rows[0].type, 'asset');
    assert.equal(decoded.rows[1].currency, 'GBP');
    assert.equal(decoded.rows[1].type, 'liability');
    assert.equal(decoded.functionalCurrency, 'GBP');
  });
});

// ---------------------------------------------------------------------------
// URL length sanity check
// ---------------------------------------------------------------------------

describe('URL length (regression: keep share links chat-friendly)', () => {
  it('a 1-row USD share URL fits well under 200 chars', () => {
    // The original wire format produced ~157 chars for a single row.
    // The compact format must produce noticeably less. We pin at 110
    // chars so accidental key-name regressions are caught.
    const rows: AssetRow[] = [
      { name: 'US Stocks', value: '50000', currency: 'USD', type: 'asset' },
    ];
    const positions: CurrencyPosition[] = [
      {
        code: 'USD', netAmountOriginal: 50000, netAmountFunctional: 46000,
        pctOfTotal: 100, isFunctional: false, riskLevel: 'elevated',
        riskLabel: 'Elevated exposure',
      },
    ];
    const qs = encodeShared(rows, positions, 'EUR', 'full');
    assert.ok(qs.length < 110, `expected <110 chars, got ${qs.length}: ${qs}`);
  });

  it('an 8-row mixed-currency share URL fits under 700 chars', () => {
    // Realistic expat case: 8 assets across 4 currencies. The previous
    // wire format put this comfortably north of 1,000 chars; the
    // compact format must be ~half that.
    const rows: AssetRow[] = [
      { name: 'Apartment Berlin', value: '350000', currency: 'EUR', type: 'asset' },
      { name: 'Mortgage', value: '200000', currency: 'EUR', type: 'liability' },
      { name: 'Index Fund', value: '85000', currency: 'EUR', type: 'asset' },
      { name: 'US Brokerage', value: '120000', currency: 'USD', type: 'asset' },
      { name: 'UK Pension', value: '45000', currency: 'GBP', type: 'asset' },
      { name: 'India FD', value: '2500000', currency: 'INR', type: 'asset' },
      { name: 'India Property', value: '8000000', currency: 'INR', type: 'asset' },
      { name: 'Emergency Fund', value: '15000', currency: 'EUR', type: 'asset' },
    ];
    const positions: CurrencyPosition[] = [
      { code: 'EUR', netAmountOriginal: 250000, netAmountFunctional: 250000, pctOfTotal: 47.0, isFunctional: true, riskLevel: 'functional', riskLabel: '' },
      { code: 'USD', netAmountOriginal: 120000, netAmountFunctional: 110000, pctOfTotal: 20.7, isFunctional: false, riskLevel: 'moderate', riskLabel: '' },
      { code: 'GBP', netAmountOriginal: 45000, netAmountFunctional: 52000, pctOfTotal: 9.8, isFunctional: false, riskLevel: 'low', riskLabel: '' },
      { code: 'INR', netAmountOriginal: 10500000, netAmountFunctional: 117000, pctOfTotal: 22.0, isFunctional: false, riskLevel: 'moderate', riskLabel: '' },
    ];
    const qs = encodeShared(rows, positions, 'EUR', 'full');
    assert.ok(qs.length < 700, `expected <700 chars, got ${qs.length}: ${qs}`);
  });
});
