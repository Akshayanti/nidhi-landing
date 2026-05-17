/**
 * Unit tests for src/utils/shared/compactUrl.ts.
 *
 * These tests pin the wire-format contract every free tool relies on. If
 * one of these breaks, every tool's share URLs break with it — so the
 * suite is intentionally narrow and assertion-heavy.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeTuple,
  encodeTuple,
  escapeField,
  setNonDefault,
  unescapeField,
} from './compactUrl.ts';

describe('escapeField / unescapeField', () => {
  it('passes plain ASCII through unchanged', () => {
    // Field values are stored RAW. URL-encoding happens once at the
    // URLSearchParams layer; `escapeField` only handles the separator.
    assert.equal(escapeField('US Stocks'), 'US Stocks');
    assert.equal(unescapeField('US Stocks'), 'US Stocks');
  });

  it('replaces literal tilde with the SOH marker', () => {
    // `~` would otherwise corrupt the tuple. The marker survives a
    // URLSearchParams round-trip (encoded as `%01`, auto-decoded on parse).
    assert.equal(escapeField('A~B'), 'A\u0001B');
    assert.equal(unescapeField('A\u0001B'), 'A~B');
  });

  it('round-trips a value with multiple tildes', () => {
    const s = 'House ~ Mortgage ~ 2024';
    assert.equal(unescapeField(escapeField(s)), s);
  });

  it('passes characters URLs would normally encode through unchanged', () => {
    // These get URL-encoded by URLSearchParams when it serialises, not
    // by escapeField. The helper is delimiter-aware only.
    const samples = ['FD @ SBI (5yr)', 'a&b', 'a=b', 'a+b', 'café'];
    for (const s of samples) {
      assert.equal(escapeField(s), s);
      assert.equal(unescapeField(escapeField(s)), s);
    }
  });
});

describe('encodeTuple', () => {
  it('joins with tilde', () => {
    assert.equal(encodeTuple(['a', 'b', 'c']), 'a~b~c');
  });

  it('drops trailing empty fields', () => {
    // Asset row with only name + value populated should not waste bytes
    // on `~~` for empty trailing currency/type.
    assert.equal(encodeTuple(['a', '50000', '', '']), 'a~50000');
  });

  it('preserves empty middle fields (positional)', () => {
    // `~50000~USD` — empty name, then value, then currency. The leading
    // empty must remain so position 1 is still `value`.
    assert.equal(encodeTuple(['', '50000', 'USD']), '~50000~USD');
  });

  it('returns empty string when all fields are empty', () => {
    assert.equal(encodeTuple([]), '');
    assert.equal(encodeTuple(['', '', '']), '');
  });

  it('escapes literal tilde in field values via the SOH marker', () => {
    // The user's asset is named "Mortgage ~ House"; the tilde must be
    // replaced or the tuple parser splits it into two phantom fields.
    // The space stays raw — URLSearchParams will encode it on toString().
    assert.equal(encodeTuple(['Mortgage ~ House', '300000']), 'Mortgage \u0001 House~300000');
  });
});

describe('decodeTuple', () => {
  it('splits a basic tuple', () => {
    assert.deepEqual(decodeTuple('a~b~c'), ['a', 'b', 'c']);
  });

  it('handles empty middle fields', () => {
    assert.deepEqual(decodeTuple('~50000~USD'), ['', '50000', 'USD']);
  });

  it('decodes the SOH marker back to literal tilde', () => {
    assert.deepEqual(decodeTuple('Mortgage \u0001 House~300000'), ['Mortgage ~ House', '300000']);
  });

  it('round-trips a tilde-containing field through URLSearchParams', () => {
    // End-to-end check that the wire format survives an actual
    // URLSearchParams round-trip (where the marker becomes `%01`).
    const params = new URLSearchParams();
    params.set('a1', encodeTuple(['Mortgage ~ House', '300000']));
    const wire = params.toString();
    assert.ok(wire.includes('%01'), `expected SOH to be percent-encoded in URL, got: ${wire}`);
    const parsed = new URLSearchParams(wire);
    const decoded = decodeTuple(parsed.get('a1')!);
    assert.deepEqual(decoded, ['Mortgage ~ House', '300000']);
  });

  it('pads to expectedLength when shorter', () => {
    // Caller wants 4 fields but tuple only has 2 — fill the rest with ''.
    assert.deepEqual(decodeTuple('a~b', 4), ['a', 'b', '', '']);
  });

  it('returns expectedLength empties for an empty tuple', () => {
    assert.deepEqual(decodeTuple('', 3), ['', '', '']);
  });

  it('does not pad when expectedLength is 0', () => {
    assert.deepEqual(decodeTuple('a~b'), ['a', 'b']);
  });
});

describe('encode/decode round-trip', () => {
  it('round-trips a typical asset row', () => {
    const fields = ['US Stocks', '50000', 'USD', 'asset'];
    assert.deepEqual(decodeTuple(encodeTuple(fields), fields.length), fields);
  });

  it('round-trips with a trailing-default-trim', () => {
    // Encoding drops the trailing 'asset' if the caller pre-substitutes
    // defaults to ''. Decoding with expectedLength=4 fills it back as '',
    // and the caller is responsible for re-applying its default.
    // Field values are stored RAW (no URL-encoding here); the surrounding
    // URLSearchParams takes care of percent-escaping at toString() time.
    const trimmed = encodeTuple(['US Stocks', '50000', 'USD', '']);
    assert.equal(trimmed, 'US Stocks~50000~USD');
    assert.deepEqual(decodeTuple(trimmed, 4), ['US Stocks', '50000', 'USD', '']);
  });

  it('round-trips special characters', () => {
    const fields = ['FD @ SBI (5yr)', '100000', 'INR', 'asset'];
    assert.deepEqual(decodeTuple(encodeTuple(fields), 4), fields);
  });
});

describe('setNonDefault', () => {
  it('omits when value equals default', () => {
    const params = new URLSearchParams();
    setNonDefault(params, 'k', 'EUR', 'EUR');
    assert.equal(params.has('k'), false);
  });

  it('omits when value is empty string', () => {
    const params = new URLSearchParams();
    setNonDefault(params, 'k', '', '');
    setNonDefault(params, 'k2', '', 'something');
    assert.equal(params.has('k'), false);
    assert.equal(params.has('k2'), false);
  });

  it('omits when value is null or undefined', () => {
    const params = new URLSearchParams();
    setNonDefault(params, 'k', null, '');
    setNonDefault(params, 'k2', undefined, '');
    assert.equal(params.has('k'), false);
    assert.equal(params.has('k2'), false);
  });

  it('emits when value differs from default', () => {
    const params = new URLSearchParams();
    setNonDefault(params, 'k', 'USD', 'EUR');
    assert.equal(params.get('k'), 'USD');
  });

  it('compares as strings to handle mixed numeric/string defaults', () => {
    // Vendor count is a number in some tools and a string in others. The
    // helper must DTRT regardless of which side stringifies first.
    const params = new URLSearchParams();
    setNonDefault(params, 'n', 2, '2');
    assert.equal(params.has('n'), false);
    setNonDefault(params, 'n', 3, 2);
    assert.equal(params.get('n'), '3');
  });
});
