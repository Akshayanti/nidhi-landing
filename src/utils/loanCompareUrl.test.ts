/**
 * Unit tests for src/utils/loanCompareUrl.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GLOBAL_STATE,
  DEFAULT_VENDORS,
  MAX_VENDORS,
  MIN_VENDORS,
  VENDOR_LABELS,
  VENDOR_TEMPLATES,
  decodeFromQueryString,
  encodeLumpSums,
  encodeToQueryString,
  makeDefaultVendor,
  parseLumpSums,
  type GlobalState,
  type VendorInput,
} from './loanCompareUrl.ts';

/** Test helper: build a GlobalState that differs from default only in
 *  the listed fields. Keeps the test cases focused on what they're
 *  asserting instead of restating every default. */
function withGlobal(patch: Partial<GlobalState>): GlobalState {
  return { ...DEFAULT_GLOBAL_STATE, ...patch };
}

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

describe('vendor count bounds', () => {
  it('MIN_VENDORS is 2', () => {
    assert.equal(MIN_VENDORS, 2);
  });

  it('MAX_VENDORS is 5', () => {
    assert.equal(MAX_VENDORS, 5);
  });

  it('VENDOR_LABELS covers exactly MAX_VENDORS slots', () => {
    assert.equal(VENDOR_LABELS.length, MAX_VENDORS);
    assert.deepEqual([...VENDOR_LABELS], ['A', 'B', 'C', 'D', 'E']);
  });

  it('VENDOR_TEMPLATES covers exactly MAX_VENDORS slots', () => {
    assert.equal(VENDOR_TEMPLATES.length, MAX_VENDORS);
  });

  it('DEFAULT_VENDORS has exactly MIN_VENDORS entries', () => {
    assert.equal(DEFAULT_VENDORS.length, MIN_VENDORS);
  });
});

describe('makeDefaultVendor', () => {
  it('produces a fully-populated vendor for each slot 0..MAX_VENDORS-1', () => {
    for (let i = 0; i < MAX_VENDORS; i++) {
      const v = makeDefaultVendor(i);
      assert.equal(v.name, `Vendor ${VENDOR_LABELS[i]}`);
      assert.ok(v.principal !== '', `slot ${i} must have a principal`);
      assert.ok(v.annualRatePct !== '', `slot ${i} must have a rate`);
      assert.ok(['term', 'payment'].includes(v.modeKind));
      // Each slot's rate is distinct so adding a vendor doesn't visually
      // duplicate an existing curve. We assert pair-wise distinctness.
    }
    const rates = Array.from({ length: MAX_VENDORS }, (_, i) => makeDefaultVendor(i).annualRatePct);
    assert.equal(new Set(rates).size, MAX_VENDORS, 'all default rates should be distinct');
  });

  it('clamps negative indices to slot 0', () => {
    assert.equal(makeDefaultVendor(-1).name, `Vendor ${VENDOR_LABELS[0]}`);
    assert.equal(makeDefaultVendor(-99).name, `Vendor ${VENDOR_LABELS[0]}`);
  });

  it('clamps over-large indices to the last slot', () => {
    const last = MAX_VENDORS - 1;
    assert.equal(makeDefaultVendor(MAX_VENDORS).name, `Vendor ${VENDOR_LABELS[last]}`);
    assert.equal(makeDefaultVendor(999).name, `Vendor ${VENDOR_LABELS[last]}`);
  });
});

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

describe('encodeToQueryString', () => {
  it('emits no `n` parameter at the default count', () => {
    const qs = encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE);
    const params = new URLSearchParams(qs);
    assert.equal(params.get('n'), null);
  });

  it('emits `n=3` when there are 3 vendors', () => {
    const vendors = [makeDefaultVendor(0), makeDefaultVendor(1), makeDefaultVendor(2)];
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.equal(params.get('n'), '3');
  });

  it('emits `n=5` at the maximum', () => {
    const vendors = Array.from({ length: 5 }, (_, i) => makeDefaultVendor(i));
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.equal(params.get('n'), '5');
  });

  it('omits the `cur` parameter when currency is the default (USD)', () => {
    const params = new URLSearchParams(
      encodeToQueryString(DEFAULT_VENDORS, withGlobal({ currency: 'USD' })),
    );
    assert.equal(params.get('cur'), null);
  });

  it('emits `cur` when currency differs from the default', () => {
    const params = new URLSearchParams(
      encodeToQueryString(DEFAULT_VENDORS, withGlobal({ currency: 'INR' })),
    );
    assert.equal(params.get('cur'), 'INR');
  });

  it('skips empty-string fields so the URL stays compact', () => {
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), name: 'A', principal: '100000', annualRatePct: '5',
        modeKind: 'term', termMonths: '120', monthlyPayment: '', feeMajor: '0', extraMonthly: '0' },
      { ...makeDefaultVendor(1), name: 'B', principal: '100000', annualRatePct: '5',
        modeKind: 'term', termMonths: '120', monthlyPayment: '', feeMajor: '0', extraMonthly: '0' },
    ];
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    // monthlyPayment is empty in both vendors so it must not appear in the URL
    assert.equal(params.get('v1_monthlyPayment'), null);
    assert.equal(params.get('v2_monthlyPayment'), null);
    // but populated fields do appear
    assert.equal(params.get('v1_principal'), '100000');
    assert.equal(params.get('v2_principal'), '100000');
  });

  it('uses 1-indexed slot keys (v1, v2, ..., v5)', () => {
    const vendors = Array.from({ length: 5 }, (_, i) => makeDefaultVendor(i));
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    for (let i = 1; i <= 5; i++) {
      assert.ok(
        params.has(`v${i}_principal`),
        `expected v${i}_principal in encoded URL, got: ${[...params.keys()].join(',')}`,
      );
    }
    // Off-by-one safety: there is no v0 and no v6.
    assert.equal(params.has('v0_principal'), false);
    assert.equal(params.has('v6_principal'), false);
  });
});

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

describe('decodeFromQueryString', () => {
  it('returns DEFAULT_VENDORS when the query string is empty', () => {
    const { vendors, currency } = decodeFromQueryString('');
    assert.equal(vendors.length, MIN_VENDORS);
    assert.equal(currency, null);
    // Each vendor matches the corresponding default template.
    vendors.forEach((v, i) => {
      assert.equal(v.name, `Vendor ${VENDOR_LABELS[i]}`);
    });
  });

  it('returns a fresh copy of defaults (mutation does not leak)', () => {
    const a = decodeFromQueryString('').vendors;
    a[0].principal = 'mutated';
    const b = decodeFromQueryString('').vendors;
    assert.notEqual(b[0].principal, 'mutated');
  });

  it('honours an explicit n=4', () => {
    const { vendors } = decodeFromQueryString('n=4');
    assert.equal(vendors.length, 4);
  });

  it('clamps n above MAX_VENDORS down to MAX_VENDORS', () => {
    const { vendors } = decodeFromQueryString('n=99');
    assert.equal(vendors.length, MAX_VENDORS);
  });

  it('clamps n below MIN_VENDORS up to MIN_VENDORS', () => {
    const { vendors } = decodeFromQueryString('n=1');
    assert.equal(vendors.length, MIN_VENDORS);
    const zero = decodeFromQueryString('n=0').vendors;
    assert.equal(zero.length, MIN_VENDORS);
    const neg = decodeFromQueryString('n=-3').vendors;
    assert.equal(neg.length, MIN_VENDORS);
  });

  it('treats a non-numeric n as missing and falls back to inference', () => {
    // No `n`, no v3+ fields -> count is MIN_VENDORS
    const a = decodeFromQueryString('n=abc').vendors;
    assert.equal(a.length, MIN_VENDORS);
    // No `n`, but v4_principal is present -> count is 4
    const b = decodeFromQueryString('n=NaN&v4_principal=100000').vendors;
    assert.equal(b.length, 4);
  });

  it('infers count from the highest populated v{i}_principal when n is absent', () => {
    // 3 vendors, no `n`
    const qs3 = 'v1_principal=100000&v2_principal=100000&v3_principal=100000';
    assert.equal(decodeFromQueryString(qs3).vendors.length, 3);
    // 5 vendors, no `n`
    const qs5 = 'v1_principal=1&v2_principal=1&v3_principal=1&v4_principal=1&v5_principal=1';
    assert.equal(decodeFromQueryString(qs5).vendors.length, 5);
  });

  it('inference uses v{i}_principal specifically (not other fields)', () => {
    // Only v3_annualRatePct is set, with no v3_principal: this is a partial
    // shared link and must NOT extend the count to 3.
    const { vendors } = decodeFromQueryString('v1_principal=1&v2_principal=1&v3_annualRatePct=5');
    assert.equal(vendors.length, 2);
  });

  it('reads the `cur` parameter', () => {
    const { currency } = decodeFromQueryString('cur=INR');
    assert.equal(currency, 'INR');
  });

  it('normalises an unknown modeKind back to "term"', () => {
    const { vendors } = decodeFromQueryString('v1_modeKind=garbage&v2_modeKind=garbage');
    assert.equal(vendors[0].modeKind, 'term');
    assert.equal(vendors[1].modeKind, 'term');
  });

  it('preserves a valid modeKind=payment', () => {
    const { vendors } = decodeFromQueryString('v1_modeKind=payment&v2_modeKind=payment');
    assert.equal(vendors[0].modeKind, 'payment');
    assert.equal(vendors[1].modeKind, 'payment');
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('encode/decode round-trip', () => {
  // For each supported vendor count we build a non-default state with
  // distinct values per slot, encode it, decode the result, and assert
  // the decoded state matches the original byte-for-byte. This is the
  // most important guarantee of the URL layer: a shared link must
  // reconstruct the sender's state exactly.
  for (const count of [2, 3, 4, 5]) {
    it(`round-trips ${count} vendors with custom values exactly`, () => {
      const vendors: VendorInput[] = Array.from({ length: count }, (_, i) => ({
        name: `My Bank ${i + 1}`,
        principal: String(100000 + i * 50000),
        annualRatePct: String(4 + i * 0.5),
        modeKind: i % 2 === 0 ? 'term' : 'payment',
        termMonths: String(180 + i * 60),
        monthlyPayment: i % 2 === 0 ? '' : String(1500 + i * 100),
        feeMajor: String(i * 1000),
        extraMonthly: String(i * 50),
        // Advanced fields at their inactive defaults (this test only
        // exercises the simple-mode wire format).
        rateKind: 'fixed',
        initialFixedMonths: '60',
        subsequentRatePct: '',
        pointsCostMajor: '0',
        pointsRateReductionPct: '0',
        lumpSumsEncoded: '',
        prepayPenaltyPct: '0',
        prepayPenaltyUntilMonth: '0',
      }));
      const qs = encodeToQueryString(vendors, withGlobal({ currency: 'EUR' }));
      const { vendors: decoded, currency } = decodeFromQueryString(qs);
      assert.equal(currency, 'EUR');
      assert.equal(decoded.length, count);
      assert.deepEqual(decoded, vendors);
    });
  }

  it('round-trips DEFAULT_VENDORS at default currency through an empty-ish URL', () => {
    const qs = encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE);
    const { vendors, currency } = decodeFromQueryString(qs);
    assert.equal(currency, null);
    assert.deepEqual(vendors, DEFAULT_VENDORS);
  });

  it('round-trips a 5-vendor state with a non-default currency', () => {
    const vendors = Array.from({ length: 5 }, (_, i) => makeDefaultVendor(i));
    const qs = encodeToQueryString(vendors, withGlobal({ currency: 'JPY' }));
    const { vendors: decoded, currency } = decodeFromQueryString(qs);
    assert.equal(currency, 'JPY');
    assert.deepEqual(decoded, vendors);
  });

  it('a malformed slot value survives because empty strings are skipped on encode', () => {
    // If a user's "extraMonthly" field is empty, the encoded URL doesn't
    // include the key, and decode falls back to the template default
    // ("0" for slot 0). The user-typed "" was never persisted, so the
    // round-trip differs by design; assert that explicitly.
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), extraMonthly: '' },
      makeDefaultVendor(1),
    ];
    const qs = encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE);
    const { vendors: decoded } = decodeFromQueryString(qs);
    assert.equal(decoded[0].extraMonthly, '0'); // template default, not ''
  });
});

// ---------------------------------------------------------------------------
// Lump-sum parsing helpers
// ---------------------------------------------------------------------------

describe('parseLumpSums', () => {
  it('returns an empty list for the empty string', () => {
    assert.deepEqual(parseLumpSums(''), []);
  });

  it('parses a single entry', () => {
    assert.deepEqual(parseLumpSums('12:5000'), [{ month: 12, amountMajor: 5000 }]);
  });

  it('parses multiple entries in order', () => {
    assert.deepEqual(parseLumpSums('12:5000;36:3000;60:10000'), [
      { month: 12, amountMajor: 5000 },
      { month: 36, amountMajor: 3000 },
      { month: 60, amountMajor: 10000 },
    ]);
  });

  it('tolerates whitespace around tokens', () => {
    assert.deepEqual(parseLumpSums(' 12 : 5000 ; 36 : 3000 '), [
      { month: 12, amountMajor: 5000 },
      { month: 36, amountMajor: 3000 },
    ]);
  });

  it('skips malformed pairs but keeps the salvageable rest', () => {
    assert.deepEqual(parseLumpSums('garbage;12:5000;:bad;7:'), [
      { month: 12, amountMajor: 5000 },
    ]);
  });

  it('skips non-positive months and amounts', () => {
    assert.deepEqual(parseLumpSums('0:1000;-5:1000;5:0;5:-100;5:1000'), [
      { month: 5, amountMajor: 1000 },
    ]);
  });

  it('floors fractional months', () => {
    assert.deepEqual(parseLumpSums('12.9:5000'), [{ month: 12, amountMajor: 5000 }]);
  });
});

describe('encodeLumpSums', () => {
  it('returns "" for an empty list', () => {
    assert.equal(encodeLumpSums([]), '');
  });

  it('emits canonical month:amount form joined by semicolons', () => {
    assert.equal(
      encodeLumpSums([
        { month: 12, amountMajor: 5000 },
        { month: 36, amountMajor: 3000 },
      ]),
      '12:5000;36:3000',
    );
  });

  it('drops invalid entries silently', () => {
    assert.equal(
      encodeLumpSums([
        { month: 0, amountMajor: 1000 },
        { month: 12, amountMajor: 0 },
        { month: 24, amountMajor: 1000 },
      ]),
      '24:1000',
    );
  });

  it('round-trips with parseLumpSums', () => {
    const entries = [
      { month: 6, amountMajor: 2500 },
      { month: 18, amountMajor: 7500 },
      { month: 60, amountMajor: 50000 },
    ];
    assert.deepEqual(parseLumpSums(encodeLumpSums(entries)), entries);
  });
});

// ---------------------------------------------------------------------------
// Per-vendor optional fields: encode/decode
// ---------------------------------------------------------------------------

describe('encode per-vendor optional fields', () => {
  it('omits optional per-vendor fields equal to defaults', () => {
    const params = new URLSearchParams(encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE));
    for (const key of [
      'v1_rateKind',
      'v1_initialFixedMonths',
      'v1_subsequentRatePct',
      'v1_pointsCostMajor',
      'v1_pointsRateReductionPct',
      'v1_lumpSumsEncoded',
      'v1_prepayPenaltyPct',
      'v1_prepayPenaltyUntilMonth',
    ]) {
      assert.ok(!params.has(key), `${key} should be omitted at default`);
    }
  });

  it('emits per-vendor optional fields when set non-default', () => {
    const vendors = DEFAULT_VENDORS.map((v) => ({ ...v }));
    vendors[0].rateKind = 'hybrid';
    vendors[0].initialFixedMonths = '120';
    vendors[0].subsequentRatePct = '7.5';
    vendors[0].lumpSumsEncoded = '12:5000;36:3000';
    vendors[0].prepayPenaltyPct = '2';
    vendors[0].prepayPenaltyUntilMonth = '60';
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.equal(params.get('v1_rateKind'), 'hybrid');
    assert.equal(params.get('v1_initialFixedMonths'), '120');
    assert.equal(params.get('v1_subsequentRatePct'), '7.5');
    assert.equal(params.get('v1_lumpSumsEncoded'), '12:5000;36:3000');
    assert.equal(params.get('v1_prepayPenaltyPct'), '2');
    assert.equal(params.get('v1_prepayPenaltyUntilMonth'), '60');
  });
});

describe('decode per-vendor optional fields', () => {
  it('normalises an unknown rateKind back to "fixed"', () => {
    const { vendors } = decodeFromQueryString('v1_rateKind=garbage&v2_rateKind=garbage');
    assert.equal(vendors[0].rateKind, 'fixed');
    assert.equal(vendors[1].rateKind, 'fixed');
  });

  it('decodes a hybrid vendor with all optional fields populated', () => {
    const qs =
      'v1_rateKind=hybrid&v1_initialFixedMonths=120&v1_subsequentRatePct=7.5' +
      '&v1_pointsCostMajor=2000&v1_pointsRateReductionPct=0.25' +
      '&v1_lumpSumsEncoded=12:5000;36:3000' +
      '&v1_prepayPenaltyPct=2&v1_prepayPenaltyUntilMonth=60';
    const { vendors } = decodeFromQueryString(qs);
    assert.equal(vendors[0].rateKind, 'hybrid');
    assert.equal(vendors[0].initialFixedMonths, '120');
    assert.equal(vendors[0].subsequentRatePct, '7.5');
    assert.equal(vendors[0].pointsCostMajor, '2000');
    assert.equal(vendors[0].pointsRateReductionPct, '0.25');
    assert.equal(vendors[0].lumpSumsEncoded, '12:5000;36:3000');
    assert.equal(vendors[0].prepayPenaltyPct, '2');
    assert.equal(vendors[0].prepayPenaltyUntilMonth, '60');
  });
});

// ---------------------------------------------------------------------------
// Global state: encode/decode (active tab, horizon, refinance scenario)
// ---------------------------------------------------------------------------

describe('encode global state', () => {
  it('omits global keys equal to defaults', () => {
    const params = new URLSearchParams(encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE));
    for (const key of ['tab', 'horizon', 'refi_v', 'refi_at', 'refi_rate', 'refi_term', 'refi_fee', 'refi_roll']) {
      assert.ok(!params.has(key), `${key} should be omitted at default`);
    }
  });

  it('emits each global key only when it differs from default', () => {
    const params = new URLSearchParams(
      encodeToQueryString(
        DEFAULT_VENDORS,
        withGlobal({ horizonMonths: '120', refiNewRatePct: '3.5', refiRollFee: true }),
      ),
    );
    assert.equal(params.get('horizon'), '120');
    assert.equal(params.get('refi_rate'), '3.5');
    assert.equal(params.get('refi_roll'), '1');
    // These remain at default and should be omitted.
    assert.ok(!params.has('refi_at'));
    assert.ok(!params.has('refi_term'));
  });
});

describe('decode global state', () => {
  it('falls back to defaults when nothing is present', () => {
    const { global } = decodeFromQueryString('v1_principal=100000');
    assert.equal(global.horizonMonths, DEFAULT_GLOBAL_STATE.horizonMonths);
    assert.equal(global.refiAtMonth, DEFAULT_GLOBAL_STATE.refiAtMonth);
    assert.equal(global.refiRollFee, false);
    assert.equal(global.activeTab, DEFAULT_GLOBAL_STATE.activeTab);
  });

  it('decodes global keys when present', () => {
    const { global } = decodeFromQueryString(
      'tab=horizon&horizon=120&refi_v=2&refi_at=48&refi_rate=3.25&refi_term=240&refi_fee=1500&refi_roll=1',
    );
    assert.equal(global.activeTab, 'horizon');
    assert.equal(global.horizonMonths, '120');
    assert.equal(global.refiVendorIndex, '2');
    assert.equal(global.refiAtMonth, '48');
    assert.equal(global.refiNewRatePct, '3.25');
    assert.equal(global.refiNewTermMonths, '240');
    assert.equal(global.refiNewFeeMajor, '1500');
    assert.equal(global.refiRollFee, true);
  });

  it('falls back to the default tab on a malformed `tab` value', () => {
    const { global } = decodeFromQueryString('tab=garbage');
    assert.equal(global.activeTab, DEFAULT_GLOBAL_STATE.activeTab);
  });
});

// ---------------------------------------------------------------------------
// Full-state round-trip
// ---------------------------------------------------------------------------

describe('full-state round-trip', () => {
  it('round-trips a hybrid vendor with full global refi scenario', () => {
    const vendors: VendorInput[] = [
      {
        ...makeDefaultVendor(0),
        rateKind: 'hybrid',
        initialFixedMonths: '120',
        subsequentRatePct: '7.5',
        pointsCostMajor: '2000',
        pointsRateReductionPct: '0.25',
        lumpSumsEncoded: '12:5000;36:3000',
        prepayPenaltyPct: '2',
        prepayPenaltyUntilMonth: '60',
      },
      makeDefaultVendor(1),
    ];
    const global: GlobalState = {
      currency: 'EUR',
      activeTab: 'horizon',
      horizonMonths: '120',
      refiVendorIndex: '2',
      refiAtMonth: '48',
      refiNewRatePct: '3.25',
      refiNewTermMonths: '240',
      refiNewFeeMajor: '1500',
      refiRollFee: true,
    };
    const qs = encodeToQueryString(vendors, global);
    const decoded = decodeFromQueryString(qs);
    assert.deepEqual(decoded.vendors, vendors);
    assert.deepEqual(decoded.global, global);
  });

  it('round-trips a 5-vendor mix of fixed and hybrid loans', () => {
    const vendors: VendorInput[] = Array.from({ length: 5 }, (_, i) => ({
      ...makeDefaultVendor(i),
      rateKind: i % 2 === 0 ? 'hybrid' : 'fixed',
      initialFixedMonths: i % 2 === 0 ? String(60 + i * 12) : '60',
      subsequentRatePct: i % 2 === 0 ? String(7 + i * 0.25) : '',
      lumpSumsEncoded: i === 0 ? '12:5000' : i === 2 ? '24:3000;48:7000' : '',
      prepayPenaltyPct: i === 1 ? '1.5' : '0',
      prepayPenaltyUntilMonth: i === 1 ? '36' : '0',
    }));
    const global = withGlobal({ horizonMonths: '84' });
    const qs = encodeToQueryString(vendors, global);
    const decoded = decodeFromQueryString(qs);
    assert.deepEqual(decoded.vendors, vendors);
    assert.deepEqual(decoded.global, global);
  });

  it('round-trips the active analysis tab', () => {
    for (const tab of ['charts', 'horizon', 'refi', 'how'] as const) {
      const global = withGlobal({ activeTab: tab });
      const decoded = decodeFromQueryString(encodeToQueryString(DEFAULT_VENDORS, global));
      assert.equal(decoded.global.activeTab, tab, `tab ${tab} round-trips`);
    }
  });
});
