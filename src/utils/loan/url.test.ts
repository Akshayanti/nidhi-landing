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
  lumpSumFault,
  encodeToQueryString,
  isPristineState,
  makeAddedVendor,
  makeDefaultVendor,
  parseLumpSums,
  publishableState,
  encodeSharedState,
  readSharedState,
  LINK_FORMAT,
  type GlobalState,
  type VendorInput,
  canonicalLumpSums,
  displayLumpSums,
  STATE_KEY_PATTERN,
  SHARED_STATE_GLOBAL,
} from './url.ts';
import { checkOf, openState, pairsOf, sealState } from '../shared/checkedLink.ts';

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
    // orphan and must NOT extend the count to 3: the advanced field
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

  it('leaves out a month that is not a whole one, where it used to move it to the month before (issue 796)', () => {
    assert.deepEqual(parseLumpSums('12.9:5000'), []);
    assert.deepEqual(parseLumpSums('12.5:5000;36:3000'), [{ month: 36, amountMajor: 3000 }]);
    // Whole, however it is written.
    assert.deepEqual(parseLumpSums('12.0:5000'), [{ month: 12, amountMajor: 5000 }]);
  });

  it('leaves out a month past the last one the tool counts, which no schedule reaches (issue 796)', () => {
    assert.deepEqual(parseLumpSums('1200:5000'), [{ month: 1200, amountMajor: 5000 }]);
    assert.deepEqual(parseLumpSums('1201:5000'), []);
    assert.deepEqual(parseLumpSums('1300:5000;24:100'), [{ month: 24, amountMajor: 100 }]);
  });

  it('tells a month no loan has from a pair that does not read, and says the unreadable one first', () => {
    assert.equal(lumpSumFault(''), null);
    assert.equal(lumpSumFault('12:5000;36:3000; '), null);
    for (const month of ['12.5:5000', '0:5000', '0.5:5000', '-3:5000', '1201:5000', '12:5000;1300:1']) assert.equal(lumpSumFault(month), 'month', month);
    for (const unreadable of ['12-5000', 'abc', ':5000', ' :5000', '12:', '12:0', '12:-5', '12:abc', 'x:100', 'Infinity:100', '12:Infinity', 'NaN:5000', '12:5:6']) assert.equal(lumpSumFault(unreadable), 'unreadable', unreadable);
    // Both in one box: the pair that does not read is said first, wherever it stands.
    assert.equal(lumpSumFault('12.5:5000;12-5000'), 'unreadable');
    assert.equal(lumpSumFault('12-5000;12.5:5000'), 'unreadable');
    // The spaces around a side are not part of it.
    assert.deepEqual(parseLumpSums(' 12 : 5000 '), [{ month: 12, amountMajor: 5000 }]);
    assert.deepEqual(parseLumpSums(':5000; :5000;12:'), []);
  });

  it('a link with such a month arrives with it as written, for the page to refuse', () => {
    const { vendors } = decodeFromQueryString('v1=A~250000~6.5~~360~~0~0&v1_ls=12.5:5000;1300:5000');
    assert.equal(vendors[0].lumpSumsEncoded, '12.5:5000;1300:5000');
    assert.deepEqual(parseLumpSums(vendors[0].lumpSumsEncoded), []);
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
    // The share link's own state: the codec's, inside the envelope with its check (#820).
    assert.equal(inr, encodeSharedState(typed, defaultGlobalState('INR')));
    assert.equal(inr, sealState(encodeToQueryString(typed, defaultGlobalState('INR')), '2'));
    assert.equal(decodeFromQueryString(inr).global.currency, 'INR');
  });
});

describe('a link carries a check, and one that did not arrive whole is not read (issue 820)', () => {
  const offers = (): VendorInput[] => [
    { ...makeDefaultVendor(0), name: 'North Bank', principal: '73191' },
    makeDefaultVendor(1),
    { ...makeDefaultVendor(2), principal: '90000', rateKind: 'hybrid', subsequentRatePct: '9', lumpSumsEncoded: '12:5000;24:2500' },
  ];
  const global = (): GlobalState => ({ ...defaultGlobalState('INR'), activeTab: 'refi', refiAtMonth: '48', refiNewRatePct: '5.5', refiNewTermMonths: '240', horizonMonths: '84' });
  const sealed = () => encodeSharedState(offers(), global());

  it('writes the state the codec writes, between the format and the check', () => {
    const inner = encodeToQueryString(offers(), global());
    assert.equal(LINK_FORMAT, '2');
    assert.equal(sealed(), `f=2&${inner}&z=${checkOf(pairsOf(`f=2&${inner}`))}`);
    assert.match(sealed(), /^f=2&.*&z=[0-9a-f]{8}$/);
    assert.equal(openState(sealed(), LINK_FORMAT), 'whole');
  });

  it('a whole link reads as the state inside it: every offer, the currency, the tab, the refinance boxes and the horizon', () => {
    const read = readSharedState(sealed());
    assert.ok(read);
    assert.deepEqual(read, decodeFromQueryString(encodeToQueryString(offers(), global())));
    assert.deepEqual(read.vendors, offers());
    assert.deepEqual(read.global, global());
  });

  it('the check covers every key: change any one value and the link is not read', () => {
    const pairs = pairsOf(sealed());
    // Offers, their advanced fields, the currency, the tab, the refinance boxes and the horizon are all in it.
    const keys = pairs.map(([k]) => k);
    for (const k of ['f', 'c', 't', 'h', 'ra', 'rr', 'rt', 'v1', 'v3', 'v3_rk', 'v3_sr', 'v3_ls', 'z']) assert.ok(keys.includes(k), `${k} in ${keys.join(' ')}`);
    for (let i = 0; i < pairs.length - 1; i++) {
      const changed = pairs.map(([k, v], j) => [k, j === i ? `${v}1` : v]);
      assert.equal(readSharedState(new URLSearchParams(changed).toString()), null, pairs[i][0]);
    }
  });

  it('cut anywhere after the format, it is not read: nothing of it, and no example in its place', () => {
    const link = sealed();
    for (let end = 3; end < link.length; end++) assert.equal(readSharedState(link.slice(0, end)), null, link.slice(0, end));
  });

  it('a link written before the envelope is read exactly as it always was', () => {
    const old = encodeToQueryString(offers(), global());
    assert.deepEqual(readSharedState(old), decodeFromQueryString(old));
    assert.deepEqual(readSharedState(''), decodeFromQueryString(''));
    // Cut, it cannot be told from a shorter old link, and reads as one: the accepted limit.
    const cut = old.slice(0, old.indexOf('v3='));
    assert.deepEqual(readSharedState(cut), decodeFromQueryString(cut));
    // So does a new link whose start was lost with its f.
    const headless = sealed().slice('f=2&'.length);
    assert.deepEqual(readSharedState(headless), decodeFromQueryString(headless));
  });

  it('a link of another format is not read, whatever its check', () => {
    assert.equal(readSharedState(sealState(encodeToQueryString(offers(), global()), '3')), null);
    assert.equal(readSharedState(sealState(encodeToQueryString(offers(), global()), '1')), null);
  });

  it('a whole link with nothing else in it reads as each offer\'s own starting values, which is what its writer left out', () => {
    const empty = sealState('', LINK_FORMAT);
    assert.equal(empty, 'f=2&z=43ef7d0d');
    const read = readSharedState(empty);
    assert.ok(read);
    assert.deepEqual(read.vendors, decodeFromQueryString('n=2').vendors);
    assert.equal(read.global.currency, 'EUR');
  });

  it('the guard takes both keys of the envelope out of the address with the rest', () => {
    const isKey = new RegExp(`^(?:${STATE_KEY_PATTERN})$`);
    for (const [k] of pairsOf(sealed())) assert.ok(isKey.test(k), k);
    assert.ok(isKey.test('f') && isKey.test('z'));
    for (const not of ['ff', 'zz', 'fz', 'utm_source', 'F', 'Z', '']) assert.ok(!isKey.test(not), not);
  });
});

describe('lump-sum box: read as the page writes numbers', () => {
  it('reads Spanish amounts and keeps the plain format', () => {
    assert.equal(canonicalLumpSums('12:5.000;36:2.500,50', 'es'), '12:5000;36:2500.5');
    assert.equal(canonicalLumpSums('12:5,000; 36:3000', 'en'), '12:5000;36:3000');
    assert.deepEqual(parseLumpSums(canonicalLumpSums('12:5.000', 'es')), [{ month: 12, amountMajor: 5000 }]);
  });

  // The box keeps the draft as typed (LocaleNumberInput); only the state is marked.
  it('marks a pair still being typed, and keeps the finished ones', () => {
    assert.equal(canonicalLumpSums('12:5000;3', 'es'), '12:5000;NaN');
    assert.equal(canonicalLumpSums('12:5000;36:', 'es'), '12:5000;36:NaN');
    assert.equal(canonicalLumpSums('12:5000;', 'es'), '12:5000;');
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

  it('globals that do not read as numbers are marked, not given the defaults (#789)', () => {
    const { global } = decode('h=abc&ra=%3Cb%3E&rr=5%25&rt=ten&rf=1e9&v1=Bank~100000~5');
    assert.equal(global.horizonMonths, 'NaN');
    assert.equal(global.refiAtMonth, 'NaN');
    assert.equal(global.refiNewRatePct, 'NaN');
    assert.equal(global.refiNewTermMonths, 'NaN');
    assert.equal(global.refiNewFeeMajor, 'NaN');
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

  it('an offer’s numbers that do not read as numbers are marked, not given the slot’s own (#789)', () => {
    const v = decode('v1=Bank~%3Cb%3E~five~term~ten~x~y~z&v1_if=abc&v1_ls=%3Cscript%3E').vendors[0];
    assert.equal(v.name, 'Bank');
    assert.equal(v.principal, 'NaN');
    assert.equal(v.annualRatePct, 'NaN');
    assert.equal(v.termMonths, 'NaN');
    assert.equal(v.monthlyPayment, 'NaN');
    assert.equal(v.feeMajor, 'NaN');
    assert.equal(v.extraMonthly, 'NaN');
    assert.equal(v.initialFixedMonths, 'NaN');
    assert.equal(v.lumpSumsEncoded, 'NaN');
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

describe('an unreadable box never arrives as a valid one (#789)', () => {
  const carried = (vendor: object, global: object = {}) => {
    const vendors = DEFAULT_VENDORS.map((v, i) => (i === 0 ? { ...v, ...vendor } : { ...v }));
    const encoded = encodeToQueryString(vendors, { ...defaultGlobalState(), ...global });
    return { encoded, ...decodeFromQueryString(encoded) };
  };

  for (const field of ['principal', 'annualRatePct', 'termMonths', 'monthlyPayment', 'feeMajor', 'extraMonthly'] as const) {
    it(`${field}: the marker travels`, () => {
      assert.equal(carried({ [field]: 'NaN' }).vendors[0][field], 'NaN');
    });

    it(`${field}: typed text becomes the marker and is never written`, () => {
      const out = carried({ [field]: '7secret' });
      assert.equal(out.vendors[0][field], 'NaN');
      assert.ok(!out.encoded.includes('secret'));
    });
  }

  for (const field of ['horizonMonths', 'refiAtMonth', 'refiNewRatePct', 'refiNewTermMonths', 'refiNewFeeMajor'] as const) {
    it(`${field}: the marker travels`, () => {
      assert.equal(carried({}, { [field]: 'NaN' }).global[field], 'NaN');
    });
  }

  it('a bad side of a lump sum is marked and its neighbours stay', () => {
    const cases = [
      ['12:5000;24:7x', '12:5000;24:NaN'],
      ['Alice:5000', 'NaN:5000'],
      ['12:', '12:NaN'],
      [':5000', 'NaN:5000'],
      ['5000', 'NaN'],
      ['1:2:3', 'NaN'],
      ['12:5000;;24:100', '12:5000;24:100'],
    ];
    for (const [typed, arrives] of cases) {
      assert.equal(carried({ lumpSumsEncoded: typed }).vendors[0].lumpSumsEncoded, arrives, typed);
      const oldLink = decodeFromQueryString(`v1_ls=${encodeURIComponent(typed)}`);
      assert.equal(oldLink.vendors[0].lumpSumsEncoded, arrives, `old link: ${typed}`);
    }
  });

  it('raw text in a link shared before the fix arrives marked', () => {
    const { vendors, global } = decodeFromQueryString('v1=Bank~7x~7x&v1_pp=7x&h=7x&rf=7x');
    const got = [vendors[0].principal, vendors[0].annualRatePct, vendors[0].prepayPenaltyPct, global.horizonMonths, global.refiNewFeeMajor];
    assert.deepEqual(got, ['NaN', 'NaN', 'NaN', 'NaN', 'NaN']);
  });

  it('a payment in each of 1,200 months travels whole, one more is marked', () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}:${1000 + i}`).join(';');
    assert.equal(carried({ lumpSumsEncoded: list(1200) }).vendors[0].lumpSumsEncoded, list(1200));
    assert.equal(carried({ lumpSumsEncoded: list(1201) }).vendors[0].lumpSumsEncoded, 'NaN');
  });

  it('a lump sum typed on the page never keeps raw text', () => {
    assert.equal(canonicalLumpSums('12:5000;24:7x', 'en'), '12:5000;24:NaN');
    assert.equal(canonicalLumpSums('Alice', 'en'), 'NaN');
    assert.equal(canonicalLumpSums('12.:150.000', 'cs'), 'NaN:150000');
  });
});

// ---------------------------------------------------------------------------
// What a link carries and what it refuses, value by value
// ---------------------------------------------------------------------------

/** An offer as a short or old link reads it: the slot's own starting values. */
function slotOffer(name: string, annualRatePct: string, feeMajor: string): VendorInput {
  return {
    name,
    principal: '250000',
    annualRatePct,
    modeKind: 'term',
    termMonths: '360',
    monthlyPayment: '',
    feeMajor,
    extraMonthly: '0',
    rateKind: 'fixed',
    initialFixedMonths: '60',
    subsequentRatePct: '',
    rateChangeKeeps: 'term',
    pointsCostMajor: '0',
    pointsRateReductionPct: '0',
    lumpSumsEncoded: '',
    prepayPenaltyPct: '0',
    prepayPenaltyUntilMonth: '0',
  };
}

const UNTOUCHED_VIEWS: GlobalState = {
  currency: 'EUR',
  activeTab: 'charts',
  horizonMonths: '60',
  refiVendorIndex: '1',
  refiAtMonth: '36',
  refiNewRatePct: '4.0',
  refiNewTermMonths: '360',
  refiNewFeeMajor: '0',
  refiRollFee: false,
};

describe('what a link leaves out is read as these values', () => {
  it('a link that only says "five offers" opens the five slots with their own rates and fees', () => {
    const { vendors, currency, global } = decodeFromQueryString('n=5');
    assert.deepEqual(vendors, [
      slotOffer('Vendor A', '6.5', '0'),
      slotOffer('Vendor B', '6.0', '2500'),
      slotOffer('Vendor C', '5.75', '4000'),
      slotOffer('Vendor D', '5.5', '5000'),
      slotOffer('Vendor E', '5.25', '6000'),
    ]);
    assert.equal(currency, null);
    assert.deepEqual(global, UNTOUCHED_VIEWS);
  });

  it('a link that carries only a name keeps the slot’s amount, rate, term and fee', () => {
    const { vendors } = decodeFromQueryString('v1=Bank&v2=Other');
    assert.deepEqual(vendors, [
      { ...slotOffer('Vendor A', '6.5', '0'), name: 'Bank' },
      { ...slotOffer('Vendor B', '6.0', '2500'), name: 'Other' },
    ]);
  });

  it('no state at all is the page’s starting example: two offers, neither with a fee', () => {
    const { vendors, currency, global } = decodeFromQueryString('');
    assert.deepEqual(vendors, [slotOffer('Vendor A', '6.5', '0'), slotOffer('Vendor B', '6.0', '0')]);
    assert.equal(currency, null);
    assert.deepEqual(global, UNTOUCHED_VIEWS);
  });

  it('a link with any state reads offer B against its slot, fee included, as links made before the fee was dropped need', () => {
    assert.equal(decodeFromQueryString('h=120').vendors[1].feeMajor, '2500');
  });
});

describe('what a link writes', () => {
  it('the starting example, in full', () => {
    assert.equal(
      encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE),
      'v1=Vendor+A~250000~6.5~~360~~0~0&v2=Vendor+B~250000~6.0~~360~~0~0',
    );
  });

  it('every field of an offer and of the two views, each under its own key', () => {
    const offer: VendorInput = {
      name: 'Bank One',
      principal: '180000',
      annualRatePct: '4.2',
      modeKind: 'payment',
      termMonths: '',
      monthlyPayment: '1200',
      feeMajor: '750',
      extraMonthly: '50',
      rateKind: 'hybrid',
      initialFixedMonths: '84',
      subsequentRatePct: '5.9',
      rateChangeKeeps: 'payment',
      pointsCostMajor: '500',
      pointsRateReductionPct: '0.25',
      lumpSumsEncoded: '12:5000;36:3000',
      prepayPenaltyPct: '2',
      prepayPenaltyUntilMonth: '24',
    };
    const views: GlobalState = {
      currency: 'INR',
      activeTab: 'refi',
      horizonMonths: '84',
      refiVendorIndex: '3',
      refiAtMonth: '24',
      refiNewRatePct: '3.5',
      refiNewTermMonths: '240',
      refiNewFeeMajor: '1500',
      refiRollFee: true,
    };
    const link = encodeToQueryString([offer, makeDefaultVendor(1), makeDefaultVendor(2)], views);
    assert.equal(
      link,
      'c=INR&n=3&t=refi&h=84&rv=3&ra=24&rr=3.5&rt=240&rf=1500&rl=1'
        + '&v1=Bank+One~180000~4.2~payment~-~1200~750~50'
        + '&v1_rk=hybrid&v1_if=84&v1_sr=5.9&v1_rc=p&v1_pc=500&v1_pr=0.25&v1_ls=12%3A5000%3B36%3A3000&v1_pp=2&v1_pu=24'
        + '&v2=Vendor+B~250000~6.0~~360~~2500~0'
        + '&v3=Vendor+C~250000~5.75~~360~~4000~0',
    );
    // And it opens as it was sent.
    const back = decodeFromQueryString(link);
    assert.deepEqual(back.vendors, [offer, slotOffer('Vendor B', '6.0', '2500'), slotOffer('Vendor C', '5.75', '4000')]);
    assert.deepEqual(back.global, views);
    assert.equal(back.currency, 'INR');
  });

  it('every key a link writes is one the guard takes out of the address', () => {
    const key = new RegExp(`^(?:${STATE_KEY_PATTERN})$`);
    const offer: VendorInput = {
      ...makeDefaultVendor(4),
      rateKind: 'hybrid',
      initialFixedMonths: '84',
      subsequentRatePct: '5.9',
      rateChangeKeeps: 'payment',
      pointsCostMajor: '500',
      pointsRateReductionPct: '0.25',
      lumpSumsEncoded: '12:5000',
      prepayPenaltyPct: '2',
      prepayPenaltyUntilMonth: '24',
    };
    const vendors = [0, 1, 2, 3, 4].map(() => offer);
    const link = encodeToQueryString(vendors, {
      currency: 'INR', activeTab: 'how', horizonMonths: '84', refiVendorIndex: '5', refiAtMonth: '24',
      refiNewRatePct: '3.5', refiNewTermMonths: '240', refiNewFeeMajor: '1500', refiRollFee: true,
    });
    const keys = [...new URLSearchParams(link).keys()];
    // 10 for the page and its views, and a tuple with 9 optional fields for each of 5 offers.
    assert.equal(keys.length, 10 + 5 * 10);
    for (const k of keys) assert.ok(key.test(k), k);
    // The pattern is one parameter name, whole: it does not take a campaign tag or an unrelated key.
    for (const other of ['utm_source', 'v', 'v1_', 'v1_abc', 'cc', 'x']) assert.ok(!key.test(other), other);
  });

  it('a hyphen typed into a box is not the mark of an emptied one: it travels as unreadable', () => {
    const vendors = [{ ...makeDefaultVendor(0), principal: '-', pointsCostMajor: '-' }, makeDefaultVendor(1)];
    const link = encodeToQueryString(vendors, withGlobal({ horizonMonths: '-' }));
    assert.equal(link, 'h=NaN&v1=Vendor+A~NaN~6.5~~360~~0~0&v1_pc=NaN&v2=Vendor+B~250000~6.0~~360~~2500~0');
    const back = decodeFromQueryString(link);
    assert.equal(back.vendors[0].principal, 'NaN');
    assert.equal(back.vendors[0].pointsCostMajor, 'NaN');
    assert.equal(back.global.horizonMonths, 'NaN');
  });

  it('emptied boxes are written as the mark, wherever the default is not empty', () => {
    const emptied = { ...makeDefaultVendor(0), initialFixedMonths: '', pointsCostMajor: '', pointsRateReductionPct: '', prepayPenaltyPct: '', prepayPenaltyUntilMonth: '' };
    const link = encodeToQueryString(
      [emptied, makeDefaultVendor(1)],
      withGlobal({ horizonMonths: '', refiAtMonth: '', refiNewRatePct: '', refiNewTermMonths: '', refiNewFeeMajor: '' }),
    );
    assert.equal(
      link,
      'h=-&ra=-&rr=-&rt=-&rf=-&v1=Vendor+A~250000~6.5~~360~~0~0&v1_if=-&v1_pc=-&v1_pr=-&v1_pp=-&v1_pu=-&v2=Vendor+B~250000~6.0~~360~~2500~0',
    );
  });

  it('a lump-sum box holding only separators writes nothing', () => {
    for (const typed of [';', ' ; ', ' ']) {
      const link = encodeToQueryString([{ ...makeDefaultVendor(0), lumpSumsEncoded: typed }, makeDefaultVendor(1)], DEFAULT_GLOBAL_STATE);
      assert.equal(link, 'v1=Vendor+A~250000~6.5~~360~~0~0&v2=Vendor+B~250000~6.0~~360~~2500~0', JSON.stringify(typed));
    }
  });
});

describe('what a link is read as, at the edges', () => {
  it('a stated count of two wins over a third offer in the link', () => {
    const { vendors } = decodeFromQueryString('n=2&v1=A~1~1&v2=B~1~1&v3=C~1~1');
    assert.deepEqual(vendors.map((v) => v.name), ['A', 'B']);
  });

  it('a count the link does not state is the highest offer it carries', () => {
    for (const [qs, count] of [['v2=B~1~1', 2], ['v3=C~1~1', 3], ['v4=D~1~1', 4], ['v5=E~1~1', 5], ['v5=E~1~1&v3=C~1~1', 5], ['n=1&v4=D~1~1', 4]] as const) {
      assert.equal(decodeFromQueryString(qs).vendors.length, count, qs);
    }
  });

  it('a count is rounded to a whole number of offers', () => {
    assert.equal(decodeFromQueryString('n=3.4').vendors.length, 3);
    assert.equal(decodeFromQueryString('n=3.5').vendors.length, 4);
  });

  it('the emptied mark in the lump-sum position reads as an empty box', () => {
    assert.equal(decodeFromQueryString('v1_ls=-').vendors[0].lumpSumsEncoded, '');
  });

  it('an empty tab opens the first tab, and each known tab opens itself', () => {
    assert.equal(decodeFromQueryString('t=&n=3').global.activeTab, 'charts');
    for (const tab of ['charts', 'horizon', 'refi', 'how'] as const) {
      assert.equal(decodeFromQueryString(`t=${tab}`).global.activeTab, tab);
    }
  });

  it('the fee is rolled into the new loan only for the one known code', () => {
    assert.equal(decodeFromQueryString('rl=1').global.refiRollFee, true);
    for (const qs of ['rl=0', 'rl=true', 'rl=', 'h=120']) assert.equal(decodeFromQueryString(qs).global.refiRollFee, false, qs);
  });

  it('an old ?-style link is the same text, and reads the same', () => {
    // ToolStateGuard hands over what stood after the "?" or the "#"; a leading "?" changes nothing.
    const state = 'c=USD&n=3&v1=Bank~100000~5~payment~~900&v3_pp=2';
    assert.deepEqual(decodeFromQueryString(`?${state}`), decodeFromQueryString(state));
    const { vendors, currency } = decodeFromQueryString(`?${state}`);
    assert.equal(currency, 'USD');
    assert.equal(vendors.length, 3);
    assert.deepEqual(vendors[0], { ...slotOffer('Bank', '5', '0'), principal: '100000', modeKind: 'payment', monthlyPayment: '900' });
    assert.equal(vendors[2].prepayPenaltyPct, '2');
  });

  it('a number longer than any amount is marked, one at the limit arrives', () => {
    assert.equal(decodeFromQueryString(`v1=A~${'9'.repeat(200)}`).vendors[0].principal, '9'.repeat(200));
    assert.equal(decodeFromQueryString(`v1=A~${'9'.repeat(201)}`).vendors[0].principal, 'NaN');
  });
});

describe('lump sums, at the edges', () => {
  it('a number with no month is not a payment', () => {
    assert.deepEqual(parseLumpSums('125'), []);
    assert.deepEqual(parseLumpSums('12:5000;125'), [{ month: 12, amountMajor: 5000 }]);
  });

  it('the first month is a month like any other', () => {
    assert.deepEqual(parseLumpSums('1:500'), [{ month: 1, amountMajor: 500 }]);
    assert.equal(encodeLumpSums([{ month: 1, amountMajor: 500 }]), '1:500');
    // A month before the first is none; part of a month counts as the month it is in.
    assert.deepEqual(parseLumpSums('0.9:500'), []);
    assert.equal(encodeLumpSums([{ month: 0.9, amountMajor: 500 }, { month: 2.9, amountMajor: 0.5 }]), '2:0.5');
  });

  it('entries that are not numbers are left out when written', () => {
    assert.equal(
      encodeLumpSums([
        { month: NaN, amountMajor: 100 },
        { month: Infinity, amountMajor: 100 },
        { month: 3, amountMajor: NaN },
        { month: 4, amountMajor: Infinity },
        { month: 5, amountMajor: -1 },
        { month: 6, amountMajor: 100 },
      ]),
      '6:100',
    );
    assert.deepEqual(parseLumpSums('x:100;3:y;Infinity:100;4:Infinity;6:100'), [{ month: 6, amountMajor: 100 }]);
  });

  it('a space after the last separator is nothing typed, not an unreadable pair', () => {
    assert.equal(canonicalLumpSums('12:5000; ', 'en'), '12:5000;');
    assert.equal(canonicalLumpSums(' ', 'en'), '');
  });

  it('the box shows an unreadable month as a question mark and a readable one as it is kept', () => {
    assert.equal(displayLumpSums('NaN:5000', 'es'), '?:5000');
    assert.equal(displayLumpSums('12:NaN', 'es'), '12:?');
    assert.equal(displayLumpSums('NaN', 'es'), '?');
    assert.equal(displayLumpSums('12.5:5000', 'es'), '12.5:5000');
    // An amount whose month is missing is still written the page's way.
    assert.equal(displayLumpSums(':2500.5', 'es'), ':2500,5');
  });
});

describe('where the shared state is handed over', () => {
  it('a window property with a name of the tool’s own, never an empty one', () => {
    assert.match(SHARED_STATE_GLOBAL, /^__nidhi[A-Za-z]+$/);
    assert.ok(SHARED_STATE_GLOBAL.includes('Loan'));
  });
});

describe('an optional field with nothing in it', () => {
  it('writes no key where its default is empty too, and none for a rate kind that is missing', () => {
    // A rate kind is never empty on the page; a state restored from elsewhere could hold one.
    const offer = { ...makeDefaultVendor(0), rateKind: '' as VendorInput['rateKind'], subsequentRatePct: '', lumpSumsEncoded: '' };
    const link = encodeToQueryString([offer, makeDefaultVendor(1)], DEFAULT_GLOBAL_STATE);
    assert.equal(link, 'v1=Vendor+A~250000~6.5~~360~~0~0&v2=Vendor+B~250000~6.0~~360~~2500~0');
    assert.equal(decodeFromQueryString(link).vendors[0].rateKind, 'fixed');
  });
});
