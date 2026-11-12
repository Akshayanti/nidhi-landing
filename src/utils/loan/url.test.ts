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
  defaultGlobalState,
  encodeLumpSums,
  encodeToQueryString,
  isPristineState,
  makeAddedVendor,
  makeDefaultVendor,
  parseLumpSums,
  publishableState,
  type GlobalState,
  type VendorInput,
  canonicalLumpSums,
  displayLumpSums,
  STATE_KEY_PATTERN,
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

describe('makeAddedVendor', () => {
  it('leaves every optional box empty, in every slot', () => {
    for (let i = 0; i < MAX_VENDORS; i++) {
      const v = makeAddedVendor(i);
      assert.equal(v.feeMajor, '0', `slot ${i} fee`);
      assert.equal(v.extraMonthly, '0', `slot ${i} extra`);
      assert.equal(v.rateKind, 'fixed');
      for (const key of ['initialFixedMonths', 'subsequentRatePct', 'lumpSumsEncoded'] as const) assert.equal(v[key], makeDefaultVendor(0)[key], `slot ${i} ${key}`);
      for (const key of ['pointsCostMajor', 'pointsRateReductionPct', 'prepayPenaltyPct', 'prepayPenaltyUntilMonth'] as const) assert.ok(v[key] === '' || Number(v[key]) === 0, `slot ${i} ${key}`);
      // The boxes a reader sees stay as the slot's starting example.
      assert.equal(v.principal, makeDefaultVendor(i).principal);
      assert.equal(v.annualRatePct, makeDefaultVendor(i).annualRatePct);
      assert.equal(v.name, makeDefaultVendor(i).name);
    }
  });

  it('survives a share link, although its fee differs from the slot template', () => {
    const vendors = [makeDefaultVendor(0), makeDefaultVendor(1), makeAddedVendor(2), makeAddedVendor(3)];
    const back = decodeFromQueryString(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE));
    assert.deepEqual(back.vendors, vendors);
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
        rateChangeKeeps: 'term',
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

  it('a box the reader emptied comes back empty, not with its default put back (issue 344)', () => {
    // On the default screen, offer B has a fee of 2,500. Cleared, the page
    // computes B with no fee; the person who opens the link must see the same.
    const vendors: VendorInput[] = [
      { ...makeDefaultVendor(0), extraMonthly: '' },
      { ...makeDefaultVendor(1), feeMajor: '' },
    ];
    const qs = encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE);
    const { vendors: decoded } = decodeFromQueryString(qs);
    assert.equal(decoded[0].extraMonthly, '');
    assert.equal(decoded[1].feeMajor, '', 'the 2,500 default is not put back');
    assert.deepEqual(decoded, vendors);
  });

  it('every cleared box survives the link and the language switch, in every slot', () => {
    const cleared = ['principal', 'annualRatePct', 'termMonths', 'feeMajor', 'extraMonthly', 'initialFixedMonths', 'pointsCostMajor', 'pointsRateReductionPct', 'prepayPenaltyPct', 'prepayPenaltyUntilMonth'] as const;
    for (let slot = 0; slot < MAX_VENDORS; slot++) {
      for (const field of cleared) {
        const vendors = Array.from({ length: MAX_VENDORS }, (_, i) => makeDefaultVendor(i));
        vendors[slot] = { ...vendors[slot], [field]: '' };
        const viaLink = decodeFromQueryString(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE)).vendors;
        assert.deepEqual(viaLink, vendors, `${field} of offer ${slot + 1} by link`);
        const viaSwitch = decodeFromQueryString(publishableState(vendors, DEFAULT_GLOBAL_STATE, DEFAULT_GLOBAL_STATE.currency)).vendors;
        assert.deepEqual(viaSwitch, vendors, `${field} of offer ${slot + 1} by the language switch`);
      }
    }
  });

  it('cleared boxes of the horizon and refinance views survive too', () => {
    for (const field of ['horizonMonths', 'refiAtMonth', 'refiNewRatePct', 'refiNewTermMonths', 'refiNewFeeMajor'] as const) {
      const global = { ...DEFAULT_GLOBAL_STATE, [field]: '' };
      const back = decodeFromQueryString(encodeToQueryString(DEFAULT_VENDORS.map((v) => ({ ...v })), global)).global;
      assert.deepEqual(back, global, field);
    }
  });

  it('a link that leaves a position out still means "the default", as short and old links rely on', () => {
    const { vendors } = decodeFromQueryString('v2=Vendor+B~250000~6.0~~360');
    assert.equal(vendors[1].feeMajor, makeDefaultVendor(1).feeMajor);
    assert.equal(vendors[1].extraMonthly, makeDefaultVendor(1).extraMonthly);
    // And an untouched comparison is still written as nothing at all.
    assert.equal(publishableState(DEFAULT_VENDORS.map((v) => ({ ...v })), DEFAULT_GLOBAL_STATE, DEFAULT_GLOBAL_STATE.currency), '');
  });

  it('a box that is empty by default is not marked', () => {
    const qs = encodeToQueryString([makeDefaultVendor(0), makeDefaultVendor(1)], DEFAULT_GLOBAL_STATE);
    assert.doesNotMatch(decodeURIComponent(qs), /(^|[~=])-($|[~&])/);
  });
});

// ---------------------------------------------------------------------------
// Lump-sum parsing helpers
// ---------------------------------------------------------------------------

describe('the APR convention older links carried', () => {
  it('is never written, and is ignored when read', () => {
    assert.equal(new URLSearchParams(encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE)).has('ac'), false);
    assert.deepEqual(decodeFromQueryString('c=USD&ac=e').global, decodeFromQueryString('c=USD').global);
    assert.deepEqual(decodeFromQueryString('ac=x').global, decodeFromQueryString('').global);
  });

  it('stays a key the guard takes out of the address', () => {
    assert.ok(new RegExp(`^(?:${STATE_KEY_PATTERN})$`).test('ac'));
  });
});

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

describe('page starting currency and the language switch', () => {
  const fresh = () => DEFAULT_VENDORS.map((v) => ({ ...v }));

  it('keeps EUR as the codec baseline: a link without c decodes as EUR', () => {
    assert.equal(decodeFromQueryString('h=120').global.currency, 'EUR');
    assert.equal(decodeFromQueryString('').global.currency, 'EUR');
  });

  it('encodes c=INR for a state in rupees, on any page', () => {
    assert.match(encodeToQueryString(fresh(), defaultGlobalState('INR')), /(^|&)c=INR(&|$)/);
    assert.doesNotMatch(encodeToQueryString(fresh(), defaultGlobalState('EUR')), /(^|&)c=/);
  });

  it('treats the untouched comparison in the page currency as pristine', () => {
    assert.equal(isPristineState(fresh(), defaultGlobalState('EUR'), 'EUR'), true);
    assert.equal(isPristineState(fresh(), defaultGlobalState('INR'), 'INR'), true);
  });

  it('treats any change, or a currency other than the page one, as not pristine', () => {
    assert.equal(isPristineState(fresh(), defaultGlobalState('EUR'), 'INR'), false);
    assert.equal(isPristineState(fresh(), defaultGlobalState('INR'), 'EUR'), false);
    const typed = fresh();
    typed[0] = { ...typed[0], principal: '123456' };
    assert.equal(isPristineState(typed, defaultGlobalState('INR'), 'INR'), false);
    assert.equal(isPristineState(fresh(), { ...defaultGlobalState('INR'), horizonMonths: '120' }, 'INR'), false);
  });

  it('publishes nothing while pristine and the share encoding once changed', () => {
    assert.equal(publishableState(fresh(), defaultGlobalState('INR'), 'INR'), '');
    // The reader on the Hindi page picked euros: carried as the codec has it,
    // with no c, which reads as EUR on the other side.
    const eur = publishableState(fresh(), defaultGlobalState('EUR'), 'INR');
    assert.notEqual(eur, '');
    assert.equal(decodeFromQueryString(eur).global.currency, 'EUR');
    const typed = fresh();
    typed[0] = { ...typed[0], principal: '123456' };
    const inr = publishableState(typed, defaultGlobalState('INR'), 'INR');
    assert.equal(inr, encodeToQueryString(typed, defaultGlobalState('INR')));
    assert.equal(decodeFromQueryString(inr).global.currency, 'INR');
  });
});

describe('lump-sum box: read as the page writes numbers', () => {
  it('reads Spanish amounts and keeps the plain format', () => {
    assert.equal(canonicalLumpSums('12:5.000;36:2.500,50', 'es'), '12:5000;36:2500.5');
    assert.equal(canonicalLumpSums('12:5,000; 36:3000', 'en'), '12:5000;36:3000');
    assert.deepEqual(parseLumpSums(canonicalLumpSums('12:5.000', 'es')), [{ month: 12, amountMajor: 5000 }]);
  });

  it('keeps a pair still being typed as it is', () => {
    assert.equal(canonicalLumpSums('12:5000;3', 'es'), '12:5000;3');
    assert.equal(canonicalLumpSums('12:5000;36:', 'es'), '12:5000;36:');
  });

  it('shows the plain format in the page\'s style', () => {
    assert.equal(displayLumpSums('12:5000;36:2500.5', 'es'), '12:5000;36:2500,5');
    assert.equal(displayLumpSums('12:5000;36:2500.5', 'en'), '12:5000;36:2500.5');
    assert.equal(displayLumpSums('', 'es'), '');
  });
});

describe('a hostile link', () => {
  const decode = (qs: string) => decodeFromQueryString(qs);

  it('a currency the tools do not know is treated as none', () => {
    for (const c of ['ZZZ', 'eur', '%3Cscript%3E', 'EUR%26x%3D1', 'E'.repeat(3000)]) {
      const { currency, global } = decode(`c=${c}&v1=Bank~100000~5`);
      assert.equal(currency, null, c.slice(0, 20));
      assert.equal(global.currency, DEFAULT_GLOBAL_STATE.currency);
    }
    assert.equal(decode('c=INR&v1=Bank~100000~5').currency, 'INR');
  });

  it('globals that do not read as numbers fall back to the defaults', () => {
    const { global } = decode('h=abc&ra=%3Cb%3E&rr=5%25&rt=ten&rf=1e9&v1=Bank~100000~5');
    assert.equal(global.horizonMonths, DEFAULT_GLOBAL_STATE.horizonMonths);
    assert.equal(global.refiAtMonth, DEFAULT_GLOBAL_STATE.refiAtMonth);
    assert.equal(global.refiNewRatePct, DEFAULT_GLOBAL_STATE.refiNewRatePct);
    assert.equal(global.refiNewTermMonths, DEFAULT_GLOBAL_STATE.refiNewTermMonths);
    assert.equal(global.refiNewFeeMajor, DEFAULT_GLOBAL_STATE.refiNewFeeMajor);
  });

  it('the refinance offer is one the link carries, or none', () => {
    assert.equal(decode('rv=99&v1=A~1~1&v2=B~1~1').global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
    assert.equal(decode('rv=3&v1=A~1~1&v2=B~1~1').global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
    assert.equal(decode('rv=-1&v1=A~1~1').global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
    assert.equal(decode('rv=x&v1=A~1~1').global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
    assert.equal(decode('rv=0&v1=A~1~1').global.refiVendorIndex, '0');
    assert.equal(decode('n=3&rv=3&v1=A~1~1&v2=B~1~1&v3=C~1~1').global.refiVendorIndex, '3');
  });

  it('a name is cut at the stated length and loses its control characters', () => {
    const long = decode(`v1=${'x'.repeat(5000)}~100000~5`).vendors[0];
    assert.equal(long.name.length, 80);
    assert.equal(long.principal, '100000', 'the fields after it are still read');
    assert.equal(decode('v1=A%00B%0AC~1~1').vendors[0].name, 'ABC');
  });

  it('a name holding the codec’s own marker reads as a name with a tilde', () => {
    // U+0001 stands for "~" inside a field (compactUrl.ts).
    assert.equal(decode('v1=A%01B~100000~5').vendors[0].name, 'A~B');
  });

  it('an offer’s numbers that do not read as numbers fall back to the slot’s own', () => {
    const base = makeDefaultVendor(0);
    const v = decode('v1=Bank~%3Cb%3E~five~term~ten~x~y~z&v1_fm=abc&v1_ls=%3Cscript%3E').vendors[0];
    assert.equal(v.name, 'Bank');
    assert.equal(v.principal, base.principal);
    assert.equal(v.annualRatePct, base.annualRatePct);
    assert.equal(v.termMonths, base.termMonths);
    assert.equal(v.monthlyPayment, base.monthlyPayment);
    assert.equal(v.feeMajor, base.feeMajor);
    assert.equal(v.extraMonthly, base.extraMonthly);
    assert.equal(v.initialFixedMonths, base.initialFixedMonths);
    assert.equal(v.lumpSumsEncoded, base.lumpSumsEncoded);
  });

  it('numbers typed the way people type them still arrive', () => {
    const v = decode('v1=Bank~1%20234%2C56~4%2C5&v1_ls=12%3A5000%3B36%3A3000').vendors[0];
    assert.equal(v.principal, '1 234,56');
    assert.equal(v.annualRatePct, '4,5');
    assert.equal(v.lumpSumsEncoded, '12:5000;36:3000');
  });

  it('an offer with its name cleared comes back with the slot’s name', () => {
    // An empty name is not written into the link, so it reads as unset.
    const vendors = [{ ...makeDefaultVendor(0), name: '', principal: '123456' }, makeDefaultVendor(1)];
    const back = decode(encodeToQueryString(vendors, DEFAULT_GLOBAL_STATE)).vendors[0];
    assert.equal(back.name, makeDefaultVendor(0).name);
    assert.equal(back.principal, '123456');
  });
});

describe('what is kept at a rate change travels as one letter', () => {
  const offer = (keeps: 'term' | 'payment'): VendorInput => ({
    ...makeDefaultVendor(0),
    rateKind: 'hybrid',
    initialFixedMonths: '60',
    subsequentRatePct: '9',
    rateChangeKeeps: keeps,
  });

  it('writes nothing for the default, so every existing link reads as before', () => {
    const qs = encodeToQueryString([offer('term'), makeDefaultVendor(1)], DEFAULT_GLOBAL_STATE);
    assert.ok(!/_rc=/.test(qs), qs);
  });

  it('writes the kept payment as v1_rc=p and reads it back', () => {
    const qs = encodeToQueryString([offer('payment'), makeDefaultVendor(1)], DEFAULT_GLOBAL_STATE);
    assert.ok(/(^|&)v1_rc=p(&|$)/.test(qs), qs);
    const back = decodeFromQueryString(qs);
    assert.equal(back.vendors[0].rateChangeKeeps, 'payment');
    assert.equal(back.vendors[1].rateChangeKeeps, 'term');
  });

  it('reads a missing or unknown code as the default', () => {
    for (const qs of ['v1_rk=hybrid&v1_sr=9', 'v1_rk=hybrid&v1_sr=9&v1_rc=x', 'v1_rk=hybrid&v1_sr=9&v1_rc=payment', 'v1_rk=hybrid&v1_sr=9&v1_rc=']) {
      assert.equal(decodeFromQueryString(qs).vendors[0].rateChangeKeeps, 'term', qs);
    }
  });
});
