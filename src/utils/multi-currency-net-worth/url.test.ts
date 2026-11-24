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
  isPristineFullData,
  makeDefaultRows,
  publishableState,
  redactedRefusal,
  sharedResult,
  SHARED_STATE_GLOBAL,
  STATE_KEY_PATTERN,
  type SharedPositionData,
} from './url.ts';
import { aggregate } from './math.ts';
import type { AggregationResult, AssetRow, CurrencyPosition, RiskLevel } from './math.ts';

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

  it('refuses a link that says four rows and holds two', () => {
    // It used to load the two, and their total looked like the whole (#794).
    const decoded = decodeFromQueryString('a1=A~10000~USD&a2=B~20000&n=4');
    assert.equal((decoded as { refused?: string }).refused, 'transfer');
    assert.ok(decoded.rows.every((r) => r.value === ''));
  });

  it('ensures at least 2 rows', () => {
    // n=0 is impossible through normal encode but could be in a handmade URL.
    const decoded = decodeFromQueryString('n=0');
    assert.equal(decoded.rows.length, 2); // DEFAULT_ROW_COUNT
  });

  it('refuses a hostile n=999 rather than clamping it', () => {
    const params = ['n=999'];
    for (let i = 1; i <= 50; i++) {
      params.push(`a${i}=X~${i}~USD`);
    }
    const decoded = decodeFromQueryString(params.join('&'));
    assert.equal((decoded as { refused?: string }).refused, 'transfer');
    assert.ok(decoded.rows.every((r) => r.value === ''));
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
    // Legacy long-form keys must NOT appear: the v5.2 cutover removed them.
    assert.ok(!qs.includes('mode=redacted'));
    assert.ok(!qs.includes('anon=1'));
  });

  it('no asset rows or amounts in redacted URL', () => {
    const qs = encodeShared([], samplePositions, 'EUR', 'redacted');
    // No per-row tuples (a1, a2, ...) and no amount segment in p_*.
    assert.ok(!qs.includes('a1='));
    assert.ok(!qs.includes('a2='));
    // pct~risk~(no amount)~(no z)~rate status: nothing sits where an amount would (#795).
    const usdParam = new URLSearchParams(qs).get('p_USD')!;
    assert.deepEqual(usdParam.split('~').slice(2), ['', '', 'k'], `redacted p_* must hold no amount, got: ${usdParam}`);
  });

  it('decoded rows are default empty for the form', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_EUR=100.0~functional');
    assert.equal(decoded.isReadOnly, true);
    assert.equal(decoded.rows.length, 2);
    assert.equal(decoded.rows[0].value, '');
  });

  it('refuses a band it does not know, and never reads it as Low (#795)', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_USD=100.0~unknown');
    assert.equal(decoded.sharedPositions, undefined);
    assert.equal(decoded.refused, 'link');
  });

  it('handles malformed percentage', () => {
    const decoded = decodeFromQueryString('m=r&f=EUR&p_USD=abc~moderate');
    // With no share left that reads, there is nothing to show.
    assert.equal(decoded.sharedPositions, undefined);
    assert.equal(decoded.refused, 'link');
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
    // p_USD position tuple: pct~risk~amount~(no z)~rate status (#795).
    const usdParam = new URLSearchParams(qs).get('p_USD')!;
    const usdParts = usdParam.split('~');
    assert.deepEqual(usdParts.slice(3), ['', 'k']);
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
    // US Mortgage is liability: that segment must appear.
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

describe('page starting currency and the language switch', () => {
  it('keeps EUR as the codec baseline: a link without f or row currency decodes as EUR', () => {
    const d = decodeFromQueryString('a1=Cash,100');
    assert.equal(d.functionalCurrency, 'EUR');
    assert.equal(d.rows[0].currency, 'EUR');
    assert.equal(decodeFromQueryString('').functionalCurrency, 'EUR');
  });

  it('encodes INR for a state in rupees', () => {
    const qs = encodeFullData([{ name: 'Cash', value: '100', currency: 'INR', type: 'asset' }], 'INR');
    const p = new URLSearchParams(qs);
    assert.equal(p.get('f'), 'INR');
    const d = decodeFromQueryString(qs);
    assert.equal(d.functionalCurrency, 'INR');
    assert.equal(d.rows[0].currency, 'INR');
  });

  it('builds the blank starter rows in the page currency', () => {
    const rows = makeDefaultRows('INR');
    assert.equal(rows.length, 1);
    assert.ok(rows.every((r) => r.currency === 'INR' && r.name === '' && r.value === '' && r.type === 'asset'));
    assert.ok(makeDefaultRows().every((r) => r.currency === 'EUR'));
  });

  it('treats blank rows and the spending currency in the page currency as pristine', () => {
    assert.equal(isPristineFullData(makeDefaultRows('INR'), 'INR', 'INR'), true);
    assert.equal(isPristineFullData(makeDefaultRows('EUR'), 'EUR', 'EUR'), true);
    // Blank rows added later still count as untouched.
    assert.equal(isPristineFullData([...makeDefaultRows('INR'), ...makeDefaultRows('INR')], 'INR', 'INR'), true);
  });

  it('treats a value, a name, a row currency or a spending currency change as not pristine', () => {
    const rows = makeDefaultRows('INR');
    assert.equal(isPristineFullData(rows, 'EUR', 'INR'), false);
    assert.equal(isPristineFullData([{ ...rows[0], value: '5' }, rows[1]], 'INR', 'INR'), false);
    assert.equal(isPristineFullData([{ ...rows[0], name: 'Flat' }, rows[1]], 'INR', 'INR'), false);
    assert.equal(isPristineFullData([{ ...rows[0], currency: 'USD' }, rows[1]], 'INR', 'INR'), false);
    assert.equal(isPristineFullData(makeDefaultRows('EUR'), 'EUR', 'INR'), false);
  });

  it('publishes nothing while pristine and the full-data encoding once changed', () => {
    assert.equal(publishableState(makeDefaultRows('INR'), 'INR', 'INR'), '');
    const rows = [{ name: '', value: '2500000', currency: 'INR', type: 'asset' as const }, ...makeDefaultRows('INR').slice(1)];
    const qs = publishableState(rows, 'INR', 'INR');
    assert.equal(qs, encodeFullData(rows, 'INR'));
    assert.equal(decodeFromQueryString(qs).rows[0].currency, 'INR');
    assert.equal(decodeFromQueryString(qs).functionalCurrency, 'INR');
    // Euros picked on a page that starts in rupees: still carried as euros.
    const eur = publishableState(makeDefaultRows('EUR'), 'EUR', 'INR');
    assert.notEqual(eur, '');
    assert.equal(decodeFromQueryString(eur).functionalCurrency, 'EUR');
    assert.ok(decodeFromQueryString(eur).rows.every((r) => r.currency === 'EUR'));
  });
});

describe('a hostile link', () => {
  it('a spending currency the tools do not know becomes the default', () => {
    for (const f of ['ZZZ', 'usd', '%3Cb%3Ex%3C%2Fb%3E', 'EUR%26base%3DUSD%23', 'E'.repeat(3000)]) {
      for (const qs of [`f=${f}&n=1&a1=Cash~10`, `m=f&f=${f}&n=1&a1=Cash~10&p_EUR=50~low~5`, `m=r&f=${f}&p_USD=50~low`]) {
        assert.equal(decodeFromQueryString(qs).functionalCurrency, 'EUR', qs.slice(0, 30));
      }
    }
    assert.equal(decodeFromQueryString('f=INR&n=1&a1=Cash~10').functionalCurrency, 'INR');
  });

  it('a row’s currency the tools do not know becomes the default', () => {
    assert.equal(decodeFromQueryString('n=1&a1=Cash~10~%3Cb%3E').rows[0].currency, 'EUR');
    assert.equal(decodeFromQueryString('n=1&a1=Cash~10~ZZZ').rows[0].currency, 'EUR');
    assert.equal(decodeFromQueryString('n=1&a1=Cash~10~usd').rows[0].currency, 'USD', 'case is forgiven, as before');
  });

  it('a name is cut at the stated length, and a value that is not a number is marked (#789)', () => {
    const row = decodeFromQueryString(`n=1&a1=${'x'.repeat(5000)}~%3Cscript%3E~USD`).rows[0];
    assert.equal(row.name.length, 80);
    assert.equal(row.value, 'NaN');
    assert.equal(row.currency, 'USD');
    assert.equal(decodeFromQueryString('n=1&a1=Cash~1%20234%2C56').rows[0].value, '1 234,56');
  });

  it('a shared position names a currency the tools know, or the link is refused and shows none (#795)', () => {
    // Left out, what remained looked like the whole net worth.
    for (const made of ['p_%3Cb%3E=30~low', 'p_ZZZ=10~low']) {
      const decoded = decodeFromQueryString(`m=r&f=EUR&p_USD=60~low&${made}`);
      assert.equal(decoded.refused, 'link', made);
      assert.equal(decoded.sharedPositions, undefined, made);
    }
  });
});

describe('a link without amounts when net worth is zero or less', () => {
  // 250,000 EUR home, 300,000 EUR mortgage, 20,000 USD at 1.1: EUR -50,000, USD +18,181.82, total -31,818.18.
  const underwater: CurrencyPosition[] = [
    { code: 'EUR', netAmountOriginal: -50000, netAmountFunctional: -50000, pctOfTotal: 157.1, isFunctional: true, riskLevel: 'functional', riskLabel: '' },
    { code: 'USD', netAmountOriginal: 20000, netAmountFunctional: 18181.82, pctOfTotal: 0, isFunctional: false, riskLevel: 'unbanded', riskLabel: '' },
  ];

  it('carries the concentration, which adds to 100, and says no share is stated', () => {
    const decoded = decodeFromQueryString(encodeShared([], underwater, 'EUR', 'redacted'));
    const byCode = new Map(decoded.sharedPositions!.map((p) => [p.code, p]));
    assert.equal(byCode.get('EUR')!.pct, 73.3);
    assert.equal(byCode.get('USD')!.pct, 26.7);
    assert.equal(byCode.get('USD')!.riskLevel, 'unbanded');
    assert.ok(decoded.sharedPositions!.every((p) => p.noShares === true));
    // No amount travels in a link that hides them.
    assert.ok(decoded.sharedPositions!.every((p) => p.netAmountFunctional === 0));
  });

  it('leaves a link for a positive net worth as it was', () => {
    const afloat: CurrencyPosition[] = [
      { code: 'EUR', netAmountOriginal: 6000, netAmountFunctional: 6000, pctOfTotal: 60, isFunctional: true, riskLevel: 'functional', riskLabel: '' },
      { code: 'USD', netAmountOriginal: 4400, netAmountFunctional: 4000, pctOfTotal: 40, isFunctional: false, riskLevel: 'elevated', riskLabel: '' },
    ];
    const qs = encodeShared([], afloat, 'EUR', 'redacted');
    assert.ok(!/~z(&|$)/.test(qs));
    assert.ok(decodeFromQueryString(qs).sharedPositions!.every((p) => p.noShares === undefined));
  });
});

// ---------------------------------------------------------------------------
// Exactly what a link carries and what it refuses. One euro buys 2 US
// dollars, 4 pounds and 200 yen throughout, so each figure can be checked by
// sight, and each link is written out character by character.
// ---------------------------------------------------------------------------

const ROUND = { EUR: 1, USD: 2, GBP: 4, JPY: 200 };
const asset = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'asset' });
const debt = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'liability' });
const blank = (currency = 'EUR'): AssetRow => ({ name: '', value: '', currency, type: 'asset' });
const position = (code: string, more: Partial<CurrencyPosition> = {}): CurrencyPosition => ({
  code, netAmountOriginal: 0, netAmountFunctional: 0, pctOfTotal: 0, isFunctional: false, riskLevel: 'low', riskLabel: '', ...more,
});
const open = decodeFromQueryString;
const BLANK_FORM = { rows: [blank(), blank()], isReadOnly: false, shareMode: null };

/** Every order of a list, so a sorting rule is checked whatever order the positions arrive in. */
function orders<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list];
  return list.flatMap((item, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe('a full link, character by character', () => {
  // 1,000.50 euros less 500.50 owed is 500; 4,000 dollars are 2,000 euros: 2,500 in all, a fifth and four fifths.
  const rows: AssetRow[] = [
    asset('1,000.50', 'EUR', 'Savings'),
    asset('4000', 'USD', 'Shares'),
    blank('USD'),
    asset('   ', 'EUR', 'Not filled in'),
    debt('500.50', 'EUR', 'Card'),
    asset('', 'EUR', 'An idea'),
  ];
  const positions = aggregate(rows, 'EUR', ROUND).positions;
  const link = 'm=f&f=EUR&n=3&a1=Savings~1%2C000.50&a2=Shares~4000~USD&a3=Card~500.50~~liability&p_EUR=20.0~functional~500.00~~k&p_USD=80.0~elevated~2000.00~~k';

  it('carries the rows that hold an amount, each currency’s share, band and amount, and that every rate was known', () => {
    assert.equal(encodeShared(rows, positions, 'EUR', 'full'), link);
  });

  it('opens as a view that cannot be edited, with every row and figure it carried', () => {
    assert.deepEqual(open(link), {
      rows: [asset('1,000.50', 'EUR', 'Savings'), asset('4000', 'USD', 'Shares'), debt('500.50', 'EUR', 'Card')],
      functionalCurrency: 'EUR',
      isReadOnly: true,
      shareMode: 'full',
      sharedPositions: [
        { code: 'EUR', pct: 20, netAmountFunctional: 500, riskLevel: 'functional', rateUnavailable: false, netAmountOriginal: 500 },
        { code: 'USD', pct: 80, netAmountFunctional: 2000, riskLevel: 'elevated', rateUnavailable: false, netAmountOriginal: 4000 },
      ],
      inDoubt: false,
    });
  });

  it('opens the same with a question mark in front, as an older address had it', () => {
    assert.deepEqual(open(`?${link}`), open(link));
  });

  it('keeps the spending currency it names', () => {
    const dollars = 'm=f&f=USD&n=1&a1=~100~USD&p_USD=100.0~functional~100.00~~k';
    assert.equal(encodeShared([asset('100', 'USD')], aggregate([asset('100', 'USD')], 'USD', ROUND).positions, 'USD', 'full'), dollars);
    assert.equal(open(dollars).functionalCurrency, 'USD');
    assert.equal(open(dollars).refused, undefined);
  });
});

describe('a link without amounts, character by character', () => {
  const rows: AssetRow[] = [asset('1,000.50', 'EUR', 'Savings account'), asset('4000', 'USD', 'Brokerage'), debt('500.50', 'EUR', 'Card')];
  const positions = aggregate(rows, 'EUR', ROUND).positions;
  const link = 'm=r&p_EUR=20.0~functional~~~k&p_USD=80.0~elevated~~~k&f=EUR';

  it('carries each currency’s share and band, the spending currency last, and no name, row or amount', () => {
    const made = encodeShared(rows, positions, 'EUR', 'redacted');
    assert.equal(made, link);
    for (const typed of ['Savings', 'Brokerage', 'Card', '1%2C000', '4000', '500', '2000', 'a1', 'n=']) assert.ok(!made.includes(typed), typed);
  });

  it('opens as a view with shares only: blank rows and amounts of zero', () => {
    assert.deepEqual(open(link), {
      ...BLANK_FORM,
      functionalCurrency: 'EUR',
      isReadOnly: true,
      shareMode: 'redacted',
      sharedPositions: [
        { code: 'EUR', pct: 20, netAmountFunctional: 0, riskLevel: 'functional', rateUnavailable: false },
        { code: 'USD', pct: 80, netAmountFunctional: 0, riskLevel: 'elevated', rateUnavailable: false },
      ],
      inDoubt: false,
    });
  });

  it('keeps the spending currency it names', () => {
    assert.equal(open('m=r&p_USD=100.0~functional~~~k&f=USD').functionalCurrency, 'USD');
  });

  it('net worth below zero: carries the concentration, with the mark that no share of net worth is stated', () => {
    // 200 euros owed and 200 dollars held, which are 100 euros: sizes 200 and 100 of 300.
    const under = aggregate([debt('200'), asset('200', 'USD')], 'EUR', ROUND).positions;
    assert.equal(encodeShared([], under, 'EUR', 'redacted'), 'm=r&p_EUR=66.7~functional~~z~k&p_USD=33.3~unbanded~~z~k&f=EUR');
  });

  it('net worth below zero with a currency that nets to nothing: the mark is still there', () => {
    // 200 euros owed; 100 dollars held and 100 owed.
    const under = aggregate([debt('200'), asset('100', 'USD'), debt('100', 'USD')], 'EUR', ROUND).positions;
    assert.equal(encodeShared([], under, 'EUR', 'redacted'), 'm=r&p_EUR=100.0~functional~~z~k&p_USD=0.0~low~~z~k&f=EUR');
  });

  it('copied again from a view that has no amounts, it says what it was sent and adds no mark', () => {
    for (const sent of ['m=r&p_EUR=60.0~functional~~~k&p_USD=40.0~elevated~~~k&f=EUR', 'm=r&p_EUR=60.0~functional&p_USD=40.0~elevated&f=EUR']) {
      const view = sharedResult(open(sent).sharedPositions!, 'EUR', () => '');
      assert.equal(encodeShared([], view.positions, 'EUR', 'redacted'), sent);
    }
  });
});

describe('whether a rate was known, as a full link says it', () => {
  const said = (pos: CurrencyPosition) => new URLSearchParams(encodeShared([], [pos], 'EUR', 'full')).get(`p_${pos.code}`);

  it('a currency with an amount of its own and none converted lacked its rate, flagged or not', () => {
    assert.equal(said(position('USD', { netAmountOriginal: 500 })), '0.0~low~0.00~~x');
    assert.equal(said(position('USD', { netAmountOriginal: 500, rateUnavailable: true })), '0.0~low~0.00~~x');
    assert.equal(said(position('USD', { netAmountOriginal: -500 })), '0.0~low~0.00~~x');
  });

  it('a currency whose rows net to nothing had its rate', () => {
    const usd = aggregate([asset('100'), asset('100', 'USD'), debt('100', 'USD')], 'EUR', ROUND).positions.find((p) => p.code === 'USD')!;
    assert.equal(said(usd), '0.0~low~0.00~~k');
  });

  it('the spending currency needs none, and a flag that says the rate was known is believed', () => {
    assert.equal(said(position('EUR', { netAmountOriginal: 500, isFunctional: true, riskLevel: 'functional' })), '0.0~functional~0.00~~k');
    assert.equal(said(position('USD', { netAmountOriginal: 500, rateUnavailable: false })), '0.0~low~0.00~~k');
  });

  it('a view opened from an older link, which did not say, is copied on without saying', () => {
    assert.equal(said(position('USD', { netAmountOriginal: 2000, netAmountFunctional: 1000, pctOfTotal: 50, riskLevel: 'elevated', rateUnknown: true })), '50.0~elevated~1000.00');
    assert.equal(said(position('USD', { netAmountOriginal: 2000, rateUnknown: true })), '0.0~low~0.00');
  });
});

describe('the view a link gives the page', () => {
  const label = (level: RiskLevel) => `label:${level}`;
  const shared = (code: string, more: Partial<SharedPositionData> = {}): SharedPositionData => ({ code, pct: 0, netAmountFunctional: 0, riskLevel: 'low', ...more });

  it('a full link: each currency with its own amount, its converted amount, share, band and label, and their total', () => {
    const result = sharedResult([
      shared('USD', { pct: 25, netAmountFunctional: 250, riskLevel: 'moderate', rateUnavailable: false, netAmountOriginal: 500 }),
      shared('EUR', { pct: 75, netAmountFunctional: 750, riskLevel: 'functional', rateUnavailable: false, netAmountOriginal: 750 }),
    ], 'EUR', label);
    assert.deepEqual(result, {
      positions: [
        { code: 'EUR', netAmountOriginal: 750, netAmountFunctional: 750, pctOfTotal: 75, isFunctional: true, riskLevel: 'functional', riskLabel: 'label:functional', rateUnavailable: false },
        { code: 'USD', netAmountOriginal: 500, netAmountFunctional: 250, pctOfTotal: 25, isFunctional: false, riskLevel: 'moderate', riskLabel: 'label:moderate', rateUnavailable: false },
      ],
      totalNetWorthFunctional: 1000,
      hasRates: 'full',
      noShares: false,
    });
  });

  it('an older link without amounts: shares only, no rates, and each rate marked as not known either way', () => {
    const result = sharedResult([shared('EUR', { pct: 60, riskLevel: 'functional' }), shared('USD', { pct: 40, riskLevel: 'elevated' })], 'EUR', label);
    assert.deepEqual(result, {
      positions: [
        { code: 'EUR', netAmountOriginal: 0, netAmountFunctional: 0, pctOfTotal: 60, isFunctional: true, riskLevel: 'functional', riskLabel: 'label:functional', rateUnknown: true },
        { code: 'USD', netAmountOriginal: 0, netAmountFunctional: 0, pctOfTotal: 40, isFunctional: false, riskLevel: 'elevated', riskLabel: 'label:elevated', rateUnknown: true },
      ],
      totalNetWorthFunctional: 0,
      hasRates: 'none',
      noShares: false,
    });
  });

  it('the spending currency is the one the link names, in either case, or the one banded as it', () => {
    const is = (code: string, riskLevel: RiskLevel, functionalCurrency: string) => sharedResult([shared(code, { riskLevel })], functionalCurrency, label).positions[0].isFunctional;
    assert.equal(is('EUR', 'low', 'EUR'), true);
    assert.equal(is('EUR', 'low', 'eur'), true);
    assert.equal(is('USD', 'functional', 'EUR'), true);
    assert.equal(is('USD', 'low', 'EUR'), false);
    assert.equal(is('USD', 'net-debt', 'EUR'), false);
  });

  it('puts the spending currency first and the others by the size of their share, whatever order the link has them in', () => {
    const four = [
      shared('EUR', { pct: 10, riskLevel: 'functional' }),
      shared('USD', { pct: 60, riskLevel: 'elevated' }),
      shared('GBP', { pct: -80, riskLevel: 'net-debt' }),
      shared('JPY', { pct: 110, riskLevel: 'elevated' }),
    ];
    for (const order of orders(four)) {
      assert.deepEqual(sharedResult(order, 'EUR', label).positions.map((p) => p.code), ['EUR', 'JPY', 'GBP', 'USD']);
    }
  });

  it('says the rates were whole, partial or absent', () => {
    const rates = (...list: SharedPositionData[]) => sharedResult(list, 'EUR', label).hasRates;
    const eur = shared('EUR', { pct: 100, netAmountFunctional: 100, riskLevel: 'functional', rateUnavailable: false });
    assert.equal(rates(eur, shared('USD', { netAmountFunctional: 50, rateUnavailable: false })), 'full');
    assert.equal(rates(eur, shared('USD', { rateUnavailable: false })), 'full', 'one currency that nets to nothing does not make the rates absent');
    assert.equal(rates(eur, shared('USD', { rateUnavailable: true })), 'partial');
    assert.equal(rates(shared('EUR', { pct: 60 }), shared('USD', { pct: 40 })), 'none');
    assert.equal(rates(shared('EUR', { pct: 60, rateUnavailable: false }), shared('USD', { pct: 40, rateUnavailable: false })), 'none');
  });

  it('with amounts, their total says whether there are shares: none at zero or below', () => {
    const none = (...amounts: number[]) => sharedResult(amounts.map((netAmountFunctional, i) => shared(['EUR', 'USD', 'GBP'][i], { netAmountFunctional, noShares: i === 0 })), 'EUR', label).noShares;
    assert.equal(none(100, 50), false);
    assert.equal(none(100, 0), false);
    assert.equal(none(100, -100), true);
    assert.equal(none(100, -150), true);
    assert.equal(none(-1), true);
  });

  it('without amounts, the link’s own mark says it, on any one currency', () => {
    const none = (...marks: (boolean | undefined)[]) => sharedResult(marks.map((noShares, i) => shared(['EUR', 'USD', 'GBP'][i], { pct: 50, ...(noShares === undefined ? {} : { noShares }) })), 'EUR', label).noShares;
    assert.equal(none(undefined, undefined), false);
    assert.equal(none(false, false), false);
    assert.equal(none(true, true), true);
    assert.equal(none(undefined, true, undefined), true);
  });
});

describe('the state the language switch carries, character by character', () => {
  it('holds every row with something in it: an amount, a name, or a currency that was picked', () => {
    const rows = [asset('100', 'EUR', 'Savings'), asset('', 'EUR', 'Flat'), blank('USD'), blank(), debt('250.5', 'GBP')];
    assert.equal(encodeFullData(rows, 'INR'), 'f=INR&n=4&a1=Savings~100&a2=Flat&a3=~~USD&a4=~250.5~GBP~liability');
  });

  it('leaves out a row that holds only spaces', () => {
    assert.equal(encodeFullData([asset('   '), asset('100'), asset('', 'EUR', '  ')], 'EUR'), 'n=1&a1=~100');
  });

  it('a form with only spaces typed into it is still untouched', () => {
    assert.equal(isPristineFullData([asset('  ', 'EUR', '   ')], 'EUR', 'EUR'), true);
    assert.equal(publishableState([asset('  ', 'EUR', '   ')], 'EUR', 'EUR'), '');
  });

  it('every key it or a link writes is one the page takes out of the address, and no other key is', () => {
    const state = new RegExp(`^(?:${STATE_KEY_PATTERN})$`);
    const rows = [asset('100', 'USD', 'Savings'), ...Array.from({ length: 11 }, () => asset('1'))];
    const result = aggregate(rows, 'INR', { INR: 1, USD: 2, EUR: 4 });
    for (const qs of [encodeFullData(rows, 'INR'), encodeShared(rows, result.positions, 'INR', 'full'), encodeShared(rows, result.positions, 'INR', 'redacted')]) {
      const keys = [...new URLSearchParams(qs).keys()];
      assert.ok(keys.length >= 3);
      for (const key of keys) assert.match(key, state);
    }
    for (const key of ['utm_source', 'utm_medium', 'internal', 'a', 'p_', 'a1_name', 'mode', 'ma', 'fn']) assert.doesNotMatch(key, state);
  });
});

describe('where a link’s state is kept once it is out of the address', () => {
  it('is the window property the page head fills and the tool reads', () => {
    assert.equal(SHARED_STATE_GLOBAL, '__nidhiNetWorthShared');
  });
});

describe('reading the state back: the rows', () => {
  it('nothing at all, or a spending currency alone, is a blank form and no refusal', () => {
    assert.deepEqual(open(''), { ...BLANK_FORM, functionalCurrency: 'EUR' });
    assert.deepEqual(open('f=USD'), { ...BLANK_FORM, functionalCurrency: 'USD' });
  });

  it('keys from before the format changed are not read: the form opens blank, with none of their names or amounts', () => {
    assert.deepEqual(open('mode=full&a1_name=Flat&a1_value=250000&a1_currency=USD'), { ...BLANK_FORM, functionalCurrency: 'EUR' });
  });

  it('a key that only looks like a row’s is not counted as one', () => {
    for (const stray of ['data1=x', 'a1_name=Old', 'xa3=~9', 'a3x=~9']) {
      const decoded = open(`a1=~1&a2=~2&${stray}`);
      assert.equal(decoded.refused, undefined, stray);
      assert.deepEqual(decoded.rows, [asset('1'), asset('2')], stray);
      assert.equal(open(`n=2&a1=~1&a2=~2&${stray}`).refused, undefined, stray);
    }
  });

  it('a list without a count is taken to hold the rows it has, past the ninth', () => {
    const qs = Array.from({ length: 11 }, (_, i) => `a${i + 1}=~${i + 1}`).join('&');
    const decoded = open(qs);
    assert.equal(decoded.refused, undefined);
    assert.deepEqual(decoded.rows.map((r) => r.value), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  });

  it('a count that is not a plain whole number refuses the list', () => {
    for (const n of ['2.0', '%202', '2%20', '%2B2', '0000000002', '1e1', '-2', '', 'two']) {
      assert.equal(open(`n=${n}&a1=~1&a2=~2`).refused, 'transfer', n);
      assert.equal(open(`m=f&f=EUR&n=${n}&a1=~1&a2=~2&p_EUR=100.0~functional~3.00~~k`).refused, 'link', n);
    }
    assert.equal(open('n=2&a1=~1&a2=~2').refused, undefined);
  });

  it('the right number of rows under the wrong numbers refuses the list', () => {
    assert.deepEqual(open('a1=~1&a3=~3'), { ...BLANK_FORM, functionalCurrency: 'EUR', refused: 'transfer' });
    assert.equal(open('n=2&a1=~1&a3=~3').refused, 'transfer');
    assert.equal(open('n=2&a2=~1&a3=~3').refused, 'transfer');
    assert.equal(open('f=USD&n=3&a1=~1&a2=~2&a4=~4').refused, 'transfer');
    assert.equal(open('f=USD&n=3&a1=~1&a2=~2&a4=~4').functionalCurrency, 'USD');
  });

  it('blank rows at the end are not shown, down to the two the form keeps', () => {
    assert.deepEqual(open('n=4&a1=~1&a2=~2&a3=~~USD&a4=~~GBP').rows, [asset('1'), asset('2')]);
    assert.deepEqual(open('n=3&a1=~1&a2=~~USD&a3=~~GBP').rows, [asset('1'), blank('USD')]);
    assert.deepEqual(open('a1=~1&a2=~~USD').rows, [asset('1'), blank('USD')], 'the second of two stays, with the currency picked for it');
  });

  it('a last row with a name alone, or an amount alone, is kept', () => {
    assert.deepEqual(open('n=3&a1=~1&a2=~2&a3=Flat').rows, [asset('1'), asset('2'), asset('', 'EUR', 'Flat')]);
    assert.deepEqual(open('n=3&a1=~1&a2=~2&a3=~3').rows, [asset('1'), asset('2'), asset('3')]);
    assert.deepEqual(open('n=4&a1=~1&a2=~2&a3=Flat&a4=~~USD').rows, [asset('1'), asset('2'), asset('', 'EUR', 'Flat')]);
  });

  it('one row is shown with a blank one after it', () => {
    assert.deepEqual(open('n=1&a1=Flat~100~USD~liability').rows, [debt('100', 'USD', 'Flat'), blank()]);
  });
});

describe('reading a full link back: what it must hold', () => {
  const REFUSED = { ...BLANK_FORM, functionalCurrency: 'EUR', refused: 'link' };
  const one = (pos: string) => open(`m=f&f=EUR&n=1&a1=~100&${pos}`);

  it('a full link with nothing in it shows nothing', () => {
    assert.deepEqual(open('m=f&f=EUR'), REFUSED);
    assert.deepEqual(open('m=f'), REFUSED);
  });

  it('a total for another currency than the rows’ refuses it', () => {
    assert.deepEqual(open('m=f&f=EUR&n=1&a1=~100~USD&p_GBP=100.0~elevated~50.00~~k'), REFUSED);
    assert.equal(open('m=f&f=EUR&n=1&a1=~100~USD&p_USD=100.0~elevated~50.00~~k').refused, undefined);
  });

  it('a parameter that is no position is not read as one', () => {
    for (const stray of ['x_USD=1', 'xxUSD=1', 'usd=1']) assert.equal(one(`p_EUR=100.0~functional~100.00~~k&${stray}`).refused, undefined, stray);
  });

  it('takes a share as the tool writes it: one decimal, or the exponent a very large one is spelt with', () => {
    for (const share of ['100.0', '-100.0', '0.0', '1e+21', '1.5e+21', '1.25e+21', '-1.25e+21', '2e+29', '1e+30', '9.5e+99', '1e+100', '1.5e+308']) {
      const decoded = one(`p_EUR=${encodeURIComponent(share)}~functional~100.00~~k`);
      assert.equal(decoded.refused, undefined, share);
      assert.equal(decoded.sharedPositions![0].pct, Number(share), share);
    }
  });

  it('refuses a share spelt any other way, or too large to be a number', () => {
    for (const share of [' 50.0', '+50.0', '50.0 ', '50.05', '50.0x', 'x50.0', '50', '50.', '.5', '1e+5', '1e+10', '1e+20', '1e21', '1.5e+2x', '1e+1000', '1e+400', '1.e+21', '']) {
      assert.deepEqual(one(`p_EUR=${encodeURIComponent(share)}~functional~100.00~~k`), REFUSED, JSON.stringify(share));
    }
  });

  it('takes an amount as the tool writes it: two decimals, or the same exponent', () => {
    for (const amount of ['100.00', '-100.00', '0.00', '1e+21', '1.5e+21', '1.25e+21', '-1.25e+21', '2e+29', '1e+30', '9.5e+99', '1e+100', '1.5e+308']) {
      const decoded = one(`p_EUR=100.0~functional~${encodeURIComponent(amount)}~~k`);
      assert.equal(decoded.refused, undefined, amount);
      assert.equal(decoded.sharedPositions![0].netAmountFunctional, Number(amount), amount);
    }
  });

  it('refuses an amount spelt any other way, cut short, or too large to be a number', () => {
    for (const amount of [' 100.00', '+100.00', '100.00 ', '100.0', '100.005', '100.00x', 'x100.00', '100', '1e+5', '1e+10', '1e+20', '1e21', '1.5e+2x', '1e+1000', '1e+400', '']) {
      assert.deepEqual(one(`p_EUR=100.0~functional~${encodeURIComponent(amount)}~~k`), REFUSED, JSON.stringify(amount));
    }
  });

  it('an older link whose zero stands against a billionth or more of its own currency is in doubt', () => {
    const older = (value: string) => open(`m=f&f=EUR&n=1&a1=~${value}~USD&p_USD=0.0~low~0.00`).inDoubt;
    assert.equal(older('0.000000001'), true);
    assert.equal(older('0.0000000009'), false);
    assert.equal(older('100'), true);
  });
});

describe('reading a link without amounts back: whether its shares are all there', () => {
  const view = (positions: string) => open(`m=r&${positions}&f=EUR`);
  const REFUSED = { ...BLANK_FORM, functionalCurrency: 'EUR', refused: 'link' };

  it('shares that add to 100 open, within the rounding of one decimal each', () => {
    assert.equal(view('p_EUR=60.0~functional~~~k&p_USD=40.0~elevated~~~k').refused, undefined);
    assert.equal(view('p_EUR=33.3~functional~~~k&p_USD=33.3~moderate~~~k&p_GBP=33.3~moderate~~~k').refused, undefined);
    assert.equal(view('p_EUR=60.0~functional~~~k&p_USD=40.1~elevated~~~k').refused, undefined);
    assert.deepEqual(view('p_EUR=60.0~functional~~~k&p_USD=40.2~elevated~~~k'), REFUSED);
    assert.deepEqual(view('p_EUR=60.0~functional~~~k&p_USD=39.8~moderate~~~k'), REFUSED);
  });

  it('a zero share beside others does not excuse them from adding up', () => {
    assert.deepEqual(view('p_EUR=0.0~functional~~~k&p_USD=50.0~elevated~~~k'), REFUSED);
    assert.equal(view('p_EUR=0.0~functional~~~k&p_USD=100.0~elevated~~~k').refused, undefined);
    assert.equal(view('p_EUR=0.0~functional~~~k&p_USD=0.0~low~~~k').refused, undefined, 'all zero is whole');
  });

  it('a lone share is 100 or zero, older link or new', () => {
    assert.equal(view('p_EUR=100.0~functional~~~k').refused, undefined);
    assert.equal(view('p_EUR=0.0~functional~~~k').refused, undefined);
    assert.deepEqual(view('p_EUR=150.0~functional'), REFUSED);
    assert.deepEqual(view('p_USD=150.0~net-debt'), REFUSED);
    assert.deepEqual(view('p_EUR=99.9~functional~~~k'), REFUSED);
  });

  it('more than 100 is whole only in an older link, of debts alone', () => {
    assert.equal(view('p_EUR=150.0~functional&p_USD=50.0~net-debt').refused, undefined);
    assert.deepEqual(view('p_EUR=150.0~functional~~~k&p_USD=50.0~net-debt~~~k'), REFUSED, 'a new link never totals more');
    assert.deepEqual(view('p_EUR=250.0~functional&p_USD=-50.0~net-debt'), REFUSED, 'a share below zero is no debt alone');
    assert.deepEqual(view('p_EUR=150.0~functional&p_USD=50.0~low'), REFUSED, 'a holding is no debt');
  });

  it('less than 100 is never whole, older link or new, whatever the bands', () => {
    assert.deepEqual(view('p_EUR=30.0~functional&p_USD=20.0~net-debt'), REFUSED);
    assert.deepEqual(view('p_EUR=30.0~functional~~~k&p_USD=20.0~net-debt~~~k'), REFUSED);
  });

  it('shares as large as a million million million are allowed what adding them loses, and no more', () => {
    // Two shares of sizes that add to 2e18: the allowance is 2 x 3 epsilons of that, about 2,664.
    const pair = (short: number) => view(`p_EUR=1000000000000000000.0~functional~~~k&p_USD=-${(1e18 - short).toFixed(1)}~net-debt~~~k`).refused;
    assert.equal((1e18 - 2048).toFixed(1), '999999999999997952.0');
    assert.equal(pair(2048), undefined);
    assert.equal(pair(4096), 'link');
  });

  it('a sum that differs from 100 by exactly the allowance is inside it', () => {
    // Sizes that add to 2 to the 110th: the allowance, 2 x 3 epsilons of that, is 6 x 2 to the 58th, and so is the sum.
    const half = 2 ** 109;
    const pair = (over: number, under: number) =>
      view(`p_EUR=${encodeURIComponent((half + over * 2 ** 58).toFixed(1))}~functional~~~k&p_USD=${encodeURIComponent((-(half - under * 2 ** 58)).toFixed(1))}~net-debt~~~k`).refused;
    assert.equal(half + 3 * 2 ** 58 - (half - 3 * 2 ** 58), 6 * 2 ** 58);
    assert.equal(pair(3, 3), undefined);
    assert.equal(pair(4, 3), 'link', 'seven, past it');
  });

  it('an older link is in doubt over a zero share in another currency, not over the spending currency’s among several', () => {
    assert.equal(view('p_EUR=0.0~functional&p_USD=100.0~elevated').inDoubt, false);
    assert.equal(view('p_EUR=100.0~functional&p_USD=0.0~low').inDoubt, true);
    assert.equal(view('p_EUR=0.0~functional').inDoubt, true, 'a lone zero could be the first of several');
    assert.equal(view('p_EUR=100.0~functional&p_USD=0.0~low~~~k&p_GBP=0.0~low~~~k').refused, 'link', 'a status on some only');
    assert.equal(view('p_EUR=100.0~functional~~~k&p_USD=0.0~low~~~k').inDoubt, false, 'a new link says the rate was known');
  });
});

describe('why a link without amounts cannot be made (#795)', () => {
  it('with no rates at all: every other currency is missing, and the first row that needs one is named', () => {
    const rows = [blank('USD'), asset('   ', 'GBP'), asset('100'), asset('200', 'USD'), asset('300', 'GBP'), asset('5', 'USD')];
    assert.deepEqual(redactedRefusal(rows, aggregate(rows, 'EUR', null)), { reason: 'rates', row: 3, count: 2 });
  });

  it('a view that carries no rates and flags none is refused the same', () => {
    const rows = [asset('100'), asset('200', 'usd')];
    const view: AggregationResult = {
      positions: [position('EUR', { isFunctional: true, riskLevel: 'functional', pctOfTotal: 50 }), position('USD', { pctOfTotal: 50 })],
      totalNetWorthFunctional: 0,
      hasRates: 'none',
    };
    assert.deepEqual(redactedRefusal(rows, view), { reason: 'rates', row: 1, count: 1 });
  });

  it('with some rates: only the currencies that lack theirs count', () => {
    const rows = [asset('100'), asset('200', 'USD'), asset('300', 'CZK'), asset('400', 'INR')];
    assert.deepEqual(redactedRefusal(rows, aggregate(rows, 'EUR', ROUND)), { reason: 'rates', row: 2, count: 2 });
  });

  it('everything in the spending currency needs no rate, loaded or not', () => {
    const rows = [asset('100'), debt('40')];
    assert.equal(redactedRefusal(rows, aggregate(rows, 'EUR', null)), null);
    assert.equal(redactedRefusal(rows, aggregate(rows, 'EUR', ROUND)), null);
    assert.equal(redactedRefusal([], aggregate([], 'EUR', null)), null);
  });

  it('a result that says every rate was there is not refused over a rate', () => {
    const view: AggregationResult = {
      positions: [position('EUR', { isFunctional: true, riskLevel: 'functional', pctOfTotal: 50 }), position('USD', { pctOfTotal: 50, rateUnavailable: true })],
      totalNetWorthFunctional: 0,
      hasRates: 'full',
    };
    assert.equal(redactedRefusal([asset('100'), asset('200', 'USD')], view), null);
  });

  it('a missing rate with no row to point at points at the first row', () => {
    const view: AggregationResult = { positions: [position('USD', { rateUnavailable: true })], totalNetWorthFunctional: 0, hasRates: 'partial' };
    assert.deepEqual(redactedRefusal([asset('100')], view), { reason: 'rates', row: 0, count: 1 });
  });
});
