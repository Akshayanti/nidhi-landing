/**
 * Unit tests for src/utils/loan/url.ts.
 *
 * Wire format: see the file header in url.ts. Tests below assert against
 * the compact-tuple format (`v1=Name~Principal~Rate~Mode~Term~Payment~Fee~Extra`,
 * single-letter scalars `c` / `n` / `t` / `h`, two-letter advanced
 * suffixes `_rk`, `_if`, `_sr`, `_pc`, `_pr`, `_ls`, `_pp`, `_pu`).
 * The legacy per-field format (`v1_principal`, `cur=`, etc.) was hard-cut
 * in v5.2 of the free-tools plan.
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
} from './url.ts';

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
    }
    // Each slot's rate is distinct so adding a vendor doesn't visually
    // duplicate an existing curve. We assert pair-wise distinctness.
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

  it('omits the `c` parameter when currency is the default (EUR)', () => {
    const params = new URLSearchParams(
      encodeToQueryString(DEFAULT_VENDORS, withGlobal({ currency: 'EUR' })),
    );
    assert.equal(params.get('c'), null);
  });

  it('emits `c` when currency differs from the default', () => {
    // INR is intentionally far from the EUR default, so any
    // accidental coupling between the two would surface here.
    const params = new URLSearchParams(
      encodeToQueryString(DEFAULT_VENDORS, withGlobal({ currency: 'INR' })),
    );
    assert.equal(params.get('c'), 'INR');
    // And USD must now also emit because it is no longer the default.
    const usdParams = new URLSearchParams(
      encodeToQueryString(DEFAULT_VENDORS, withGlobal({ currency: 'USD' })),
    );
    assert.equal(usdParams.get('c'), 'USD');
  });

  it('skips empty-string fields so the URL stays compact', () => {
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), name: 'A', principal: '100000', annualRatePct: '5',
        modeKind: 'term', termMonths: '120', monthlyPayment: '', feeMajor: '0', extraMonthly: '0' },
      { ...makeDefaultVendor(1), name: 'B', principal: '100000', annualRatePct: '5',
        modeKind: 'term', termMonths: '120', monthlyPayment: '', feeMajor: '0', extraMonthly: '0' },
    ];
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    // Tuple positions for monthlyPayment (5), feeMajor (6), extraMonthly (7)
    // are empty/zero. They survive in the tuple because '0' is non-empty,
    // but the tuple is short enough to inspect directly.
    const v1 = params.get('v1');
    assert.ok(v1, 'v1 tuple must exist');
    // Tuple format: name~principal~rate~mode~term~payment~fee~extra
    // mode='term' is substituted to '' by the encoder so it's blank in pos 3.
    assert.equal(v1, 'A~100000~5~~120~~0~0', `unexpected v1 tuple: ${v1}`);
  });

  it('uses 1-indexed slot keys (v1, v2, ..., v5)', () => {
    const vendors = Array.from({ length: 5 }, (_, i) => makeDefaultVendor(i));
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    for (let i = 1; i <= 5; i++) {
      assert.ok(
        params.has(`v${i}`),
        `expected v${i} in encoded URL, got: ${[...params.keys()].join(',')}`,
      );
    }
    // Off-by-one safety: there is no v0 and no v6.
    assert.equal(params.has('v0'), false);
    assert.equal(params.has('v6'), false);
  });

  it('substitutes modeKind="term" to empty (default-omission)', () => {
    // Position 3 in the tuple is modeKind. When the value is the default
    // 'term', the encoder writes '' so the tuple's trailing-trim has a
    // chance to drop it (and intermediate positions stay positional).
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), name: 'A', principal: '100', annualRatePct: '5',
        modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '0', extraMonthly: '0' },
      makeDefaultVendor(1),
    ];
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    const v1 = params.get('v1')!;
    // Position 3 (mode) is empty, position 5 (payment) is empty. Tuple:
    // "A~100~5~~360~~0~0".
    assert.equal(v1.split('~')[3], '');
  });

  it('emits modeKind="payment" because it differs from the default', () => {
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), modeKind: 'payment' as const, monthlyPayment: '1500' },
      makeDefaultVendor(1),
    ];
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.equal(params.get('v1')!.split('~')[3], 'payment');
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
    // No `n`, no v3+ tuples -> count is MIN_VENDORS
    const a = decodeFromQueryString('n=abc').vendors;
    assert.equal(a.length, MIN_VENDORS);
    // No `n`, but v4 tuple is present -> count is 4
    const b = decodeFromQueryString('n=NaN&v4=Bank~100000').vendors;
    assert.equal(b.length, 4);
  });

  it('infers count from the highest populated v{i} tuple when n is absent', () => {
    // 3 vendors, no `n`
    const qs3 = 'v1=A~100000&v2=B~100000&v3=C~100000';
    assert.equal(decodeFromQueryString(qs3).vendors.length, 3);
    // 5 vendors, no `n`
    const qs5 = 'v1=A~1&v2=B~1&v3=C~1&v4=D~1&v5=E~1';
    assert.equal(decodeFromQueryString(qs5).vendors.length, 5);
  });

  it('inference uses v{i} tuple specifically (advanced-only slots are ignored)', () => {
    // Only v3_pp (advanced field) is set, with no v3 tuple. This is an
    // orphan and must NOT extend the count to 3 — the advanced field
    // applies on top of the simple-mode tuple, not as a row marker.
    const { vendors } = decodeFromQueryString('v1=A~1&v2=B~1&v3_pp=2');
    assert.equal(vendors.length, 2);
  });

  it('reads the `c` parameter', () => {
    const { currency } = decodeFromQueryString('c=INR');
    assert.equal(currency, 'INR');
  });

  it('normalises an unknown modeKind back to "term"', () => {
    // Tuple position 3 = modeKind. "garbage" must coerce to 'term' so a
    // hostile share link can't put the UI into an unexpected state.
    const { vendors } = decodeFromQueryString('v1=A~100~5~garbage&v2=B~100~5~garbage');
    assert.equal(vendors[0].modeKind, 'term');
    assert.equal(vendors[1].modeKind, 'term');
  });

  it('preserves a valid modeKind=payment', () => {
    const { vendors } = decodeFromQueryString(
      'v1=A~100~5~payment~360~1500&v2=B~100~5~payment~360~1500',
    );
    assert.equal(vendors[0].modeKind, 'payment');
    assert.equal(vendors[1].modeKind, 'payment');
  });

  it('decoded vendor falls back to slot template for empty tuple positions', () => {
    // Tuple `v1=~~~` would be three trailing empties, all trimmed by
    // encodeTuple to ''. Send a sparse tuple that omits termMonths and
    // assert the decoder filled the slot template default ('360').
    const { vendors } = decodeFromQueryString('v1=Custom%20Bank');
    assert.equal(vendors[0].name, 'Custom Bank');
    // termMonths was empty in the tuple → falls back to slot 0 template.
    assert.equal(vendors[0].termMonths, '360');
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('encode/decode round-trip', () => {
  // For each supported vendor count we build a non-default state with
  // distinct values per slot, encode it, decode the result, and assert
  // the decoded state matches the original byte-for-byte.
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
        // Advanced fields at their inactive defaults.
        rateKind: 'fixed',
        initialFixedMonths: '60',
        subsequentRatePct: '',
        pointsCostMajor: '0',
        pointsRateReductionPct: '0',
        lumpSumsEncoded: '',
        prepayPenaltyPct: '0',
        prepayPenaltyUntilMonth: '0',
      }));
      // Use GBP because it is decisively non-default (EUR is the default
      // since the EU-dominant audience pivot). The point of this test is
      // to prove the wire format round-trips a non-default currency, so
      // it must use a code that survives the "omit when equal to default"
      // optimisation in the encoder.
      const qs = encodeToQueryString(vendors, withGlobal({ currency: 'GBP' }));
      const { vendors: decoded, currency } = decodeFromQueryString(qs);
      assert.equal(currency, 'GBP');
      assert.equal(decoded.length, count);

      // monthlyPayment for term-mode vendors round-trips as '' → '' on
      // decode only when the slot template's monthlyPayment is also ''.
      // For the non-term vendors we pass an explicit value and expect it
      // to survive verbatim.
      for (let i = 0; i < count; i++) {
        assert.equal(decoded[i].name, vendors[i].name);
        assert.equal(decoded[i].principal, vendors[i].principal);
        assert.equal(decoded[i].annualRatePct, vendors[i].annualRatePct);
        assert.equal(decoded[i].modeKind, vendors[i].modeKind);
        assert.equal(decoded[i].termMonths, vendors[i].termMonths);
        assert.equal(decoded[i].monthlyPayment, vendors[i].monthlyPayment);
        assert.equal(decoded[i].feeMajor, vendors[i].feeMajor);
        assert.equal(decoded[i].extraMonthly, vendors[i].extraMonthly);
      }
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

  it('an empty user-typed extraMonthly falls back to the slot template default', () => {
    // If a user's "extraMonthly" field is empty, the encoded tuple has
    // an empty position there; decode falls back to the slot template
    // default ("0" for slot 0). The user-typed "" was never persisted,
    // so the round-trip differs by design.
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
// Per-vendor advanced fields: encode/decode (key-value, not in tuple)
// ---------------------------------------------------------------------------

describe('encode per-vendor advanced fields', () => {
  it('omits advanced fields equal to defaults', () => {
    const params = new URLSearchParams(encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE));
    for (const key of [
      'v1_rk',
      'v1_if',
      'v1_sr',
      'v1_pc',
      'v1_pr',
      'v1_ls',
      'v1_pp',
      'v1_pu',
    ]) {
      assert.ok(!params.has(key), `${key} should be omitted at default`);
    }
  });

  it('emits advanced fields when set non-default', () => {
    const vendors = DEFAULT_VENDORS.map((v) => ({ ...v }));
    vendors[0].rateKind = 'hybrid';
    vendors[0].initialFixedMonths = '120';
    vendors[0].subsequentRatePct = '7.5';
    vendors[0].lumpSumsEncoded = '12:5000;36:3000';
    vendors[0].prepayPenaltyPct = '2';
    vendors[0].prepayPenaltyUntilMonth = '60';
    const params = new URLSearchParams(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.equal(params.get('v1_rk'), 'hybrid');
    assert.equal(params.get('v1_if'), '120');
    assert.equal(params.get('v1_sr'), '7.5');
    assert.equal(params.get('v1_ls'), '12:5000;36:3000');
    assert.equal(params.get('v1_pp'), '2');
    assert.equal(params.get('v1_pu'), '60');
  });
});

describe('decode per-vendor advanced fields', () => {
  it('normalises an unknown rateKind back to "fixed"', () => {
    const { vendors } = decodeFromQueryString('v1_rk=garbage&v2_rk=garbage');
    assert.equal(vendors[0].rateKind, 'fixed');
    assert.equal(vendors[1].rateKind, 'fixed');
  });

  it('decodes a hybrid vendor with all advanced fields populated', () => {
    const qs =
      'v1_rk=hybrid&v1_if=120&v1_sr=7.5' +
      '&v1_pc=2000&v1_pr=0.25' +
      '&v1_ls=12:5000;36:3000' +
      '&v1_pp=2&v1_pu=60';
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
    for (const key of ['t', 'h', 'rv', 'ra', 'rr', 'rt', 'rf', 'rl']) {
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
    assert.equal(params.get('h'), '120');
    assert.equal(params.get('rr'), '3.5');
    assert.equal(params.get('rl'), '1');
    // These remain at default and should be omitted.
    assert.ok(!params.has('ra'));
    assert.ok(!params.has('rt'));
  });
});

describe('decode global state', () => {
  it('falls back to defaults when nothing is present', () => {
    const { global } = decodeFromQueryString('v1=A~100000');
    assert.equal(global.horizonMonths, DEFAULT_GLOBAL_STATE.horizonMonths);
    assert.equal(global.refiAtMonth, DEFAULT_GLOBAL_STATE.refiAtMonth);
    assert.equal(global.refiRollFee, false);
    assert.equal(global.activeTab, DEFAULT_GLOBAL_STATE.activeTab);
  });

  it('decodes global keys when present', () => {
    const { global } = decodeFromQueryString(
      't=horizon&h=120&rv=2&ra=48&rr=3.25&rt=240&rf=1500&rl=1',
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

  it('falls back to the default tab on a malformed `t` value', () => {
    const { global } = decodeFromQueryString('t=garbage');
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

// ---------------------------------------------------------------------------
// URL length sanity check
// ---------------------------------------------------------------------------

describe('URL length (regression: keep share links chat-friendly)', () => {
  it('a 3-vendor non-default URL fits well under 250 chars', () => {
    // Old wire format produced ~280 chars for this case; the compact
    // format must come in well under that. Pin at 200 so accidental
    // key-name regressions get caught.
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), name: 'Bank A', principal: '300000', annualRatePct: '4.5',
        feeMajor: '2000', extraMonthly: '100' },
      { ...makeDefaultVendor(1), name: 'Bank B', principal: '300000', annualRatePct: '5.0',
        feeMajor: '2500', extraMonthly: '100' },
      { ...makeDefaultVendor(2), name: 'Bank C', principal: '300000', annualRatePct: '5.5',
        feeMajor: '3000', extraMonthly: '100' },
    ];
    const qs = encodeToQueryString(vendors, withGlobal({ currency: 'GBP' }));
    assert.ok(qs.length < 200, `expected <200 chars, got ${qs.length}: ${qs}`);
  });
});
