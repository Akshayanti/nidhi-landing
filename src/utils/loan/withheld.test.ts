/**
 * When the loan comparison withholds its comparison, and when a card says a
 * value arrived unreadable (#789, #793). One invalid offer is enough: a range
 * over the others would name the wrong lowest offer and spread.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { comparisonWithheld, computeFromInput, holdsMarker } from './inputs.ts';
import { MAX_LINK_LUMP_SUMS } from '../shared/linkInput.ts';
import { makeDefaultVendor, decodeFromQueryString, encodeToQueryString, defaultGlobalState } from './url.ts';

const offers = (change: Record<string, string> = {}) => [{ ...makeDefaultVendor(0), ...change }, makeDefaultVendor(1), makeDefaultVendor(2)];
const results = (list: ReturnType<typeof offers>) => list.map((v) => computeFromInput(v, 'EUR'));
const withheld = (list: ReturnType<typeof offers>) => comparisonWithheld(results(list));
const marked = (v: ReturnType<typeof makeDefaultVendor>) => holdsMarker(v);

describe('the comparison is withheld while an offer is invalid (#793)', () => {
  it('not for valid offers', () => assert.equal(withheld(offers()), false));
  for (const [field, value] of [['principal', 'NaN'], ['principal', ''], ['annualRatePct', 'NaN'], ['termMonths', '0'], ['feeMajor', 'NaN'], ['lumpSumsEncoded', '12:NaN'], ['prepayPenaltyPct', 'NaN']]) {
    it(`${field} = "${value}"`, () => {
      const list = offers({ [field]: value });
      assert.ok(field in makeDefaultVendor(0) || field in decodeFromQueryString('').vendors[0], `${field} is not a field`);
      assert.equal(withheld(list), true);
      const arrived = decodeFromQueryString(encodeToQueryString(list, defaultGlobalState('EUR'))).vendors;
      assert.equal(withheld(arrived as ReturnType<typeof offers>), true, 'and where it arrives');
    });
  }
});

describe('a list of lump sums over the limit (#789)', () => {
  const list = (count: number) => offers({ lumpSumsEncoded: Array(count).fill('12:1').join(';') });
  const arrive = (from: ReturnType<typeof offers>) => decodeFromQueryString(encodeToQueryString(from, defaultGlobalState('EUR'))).vendors as ReturnType<typeof offers>;

  it('at the limit it is compared, here and where it arrives', () => {
    assert.equal(withheld(list(MAX_LINK_LUMP_SUMS)), false);
    assert.equal(withheld(arrive(list(MAX_LINK_LUMP_SUMS))), false);
  });
  it('over it the sender cannot share: the comparison is withheld', () => {
    assert.equal(withheld(list(MAX_LINK_LUMP_SUMS + 1)), true);
  });
  it('over it the switch carries the mark, not the first of the list', () => {
    const arrived = arrive(list(MAX_LINK_LUMP_SUMS + 1));
    assert.equal(arrived[0].lumpSumsEncoded, 'NaN');
    assert.equal(withheld(arrived), true);
  });
});

describe('a card that arrived holding the mark (#789)', () => {
  it('a number is none', () => assert.equal(marked(makeDefaultVendor(0)), false));
  it('a name spelt like it is none', () => assert.equal(marked({ ...makeDefaultVendor(0), name: 'NaN' }), false));
  it('a whole box', () => assert.equal(marked({ ...makeDefaultVendor(0), annualRatePct: 'NaN' }), true));
  for (const lumps of ['NaN', 'NaN:500', '12:500;24:NaN']) it(`lump sums ${lumps}`, () => assert.equal(marked({ ...makeDefaultVendor(0), lumpSumsEncoded: lumps }), true));
});

describe('a tiny lump sum is not marked as unreadable (#789)', () => {
  it('through a link', async () => {
    const url = await import('./url.ts');
    const lumpSumsEncoded = url.canonicalLumpSums('12:0.0000001', 'en');
    const sent = url.encodeToQueryString(
      [{ ...url.makeDefaultVendor(0), lumpSumsEncoded }, url.makeDefaultVendor(1)],
      url.defaultGlobalState(),
    );
    assert.equal(url.decodeFromQueryString(sent).vendors[0].lumpSumsEncoded, '12:0.0000001');
  });
});
