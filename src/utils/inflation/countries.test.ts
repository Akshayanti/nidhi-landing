/**
 * Unit tests for src/utils/inflation/countries.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { COUNTRY_CURRENCY } from './countries.ts';
import { CURRENCIES } from '../loan/math.ts';

describe('COUNTRY_CURRENCY', () => {
  it('maps only to currencies the tools offer', () => {
    const offered = new Set(CURRENCIES.map((c) => c.code));
    for (const [country, code] of Object.entries(COUNTRY_CURRENCY)) {
      assert.ok(offered.has(code), `${country} maps to ${code}, which the tools do not offer`);
    }
  });

  it('covers every member of the two CFA franc zones', () => {
    const zones: Record<string, string[]> = {
      XOF: ['BEN', 'BFA', 'CIV', 'GNB', 'MLI', 'NER', 'SEN', 'TGO'],
      XAF: ['CMR', 'CAF', 'TCD', 'COG', 'GNQ', 'GAB'],
    };
    for (const [code, members] of Object.entries(zones)) {
      for (const country of members) assert.equal(COUNTRY_CURRENCY[country], code, country);
      const mapped = Object.keys(COUNTRY_CURRENCY).filter((c) => COUNTRY_CURRENCY[c] === code);
      assert.deepEqual(mapped.sort(), [...members].sort(), `${code} zone`);
    }
  });
});
