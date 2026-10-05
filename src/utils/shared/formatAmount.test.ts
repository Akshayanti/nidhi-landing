/**
 * Unit tests for src/utils/shared/formatAmount.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES } from '../loan/math.ts';
import { formatAmount } from './formatAmount.ts';

// Words the browser's compact notation uses in other languages.
const FOREIGN_ABBREVIATIONS = /Mio|mio|mln|mil\.|mill|\bmn\b|\bMn\b|\bmi\b|jt|\bJ\b|万|만|억|億|\bm\. /;

function decimalSeparator(locale: string): string {
  return new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')!.value;
}

describe('formatAmount', () => {
  it('formats full amounts in the currency\'s own conventions', () => {
    assert.equal(formatAmount(1_058_721, 'EUR').replace(/\s/g, ' '), '1.058.721 €');
    assert.equal(formatAmount(1_058_721, 'USD'), '$1,058,721');
    assert.equal(formatAmount(1_058_721, 'INR'), '₹10,58,721');
  });

  it('abbreviates in English for every supported currency', () => {
    for (const c of CURRENCIES) {
      const short = formatAmount(2_163_515, c.code, true);
      assert.doesNotMatch(short, FOREIGN_ABBREVIATIONS, `${c.code}: ${short}`);
    }
  });

  it('keeps the currency\'s decimal separator in short forms', () => {
    for (const c of CURRENCIES) {
      if (c.code === 'INR') continue; // lakh and crore, checked below
      const short = formatAmount(2_163_515, c.code, true);
      assert.ok(short.includes(`2${decimalSeparator(c.locale)}16`), `${c.code}: ${short}`);
    }
  });

  it('uses K, M and B for thousands, millions and billions', () => {
    assert.equal(formatAmount(547_008, 'EUR', true).replace(/\s/g, ' '), '547K €');
    assert.equal(formatAmount(2_163_515, 'EUR', true).replace(/\s/g, ' '), '2,16M €');
    assert.equal(formatAmount(2.5e9, 'EUR', true).replace(/\s/g, ' '), '2,5B €');
    assert.equal(formatAmount(0, 'EUR', true).replace(/\s/g, ' '), '0 €');
  });

  it('keeps lakh and crore for rupees', () => {
    assert.equal(formatAmount(2_163_515, 'INR', true), '₹21.6L');
    assert.equal(formatAmount(11_400_000, 'INR', true), '₹1.14Cr');
  });
});
