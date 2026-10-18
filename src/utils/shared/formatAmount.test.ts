/**
 * Unit tests for src/utils/shared/formatAmount.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES } from '../loan/math.ts';
import { formatAmount, formatPercent, formatProseAmount, formatProsePercent } from './formatAmount.ts';

// Words the browser's compact notation uses in other languages.
const FOREIGN_ABBREVIATIONS = /Mio|mio|mln|mil\.|mill|\bmn\b|\bMn\b|\bmi\b|jt|\bJ\b|万|만|억|億|\bm\. /;

function decimalSeparator(locale: string): string {
  return new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')!.value;
}

describe('formatAmount', () => {
  it('formats full amounts in the currency\'s own conventions', () => {
    assert.equal(formatAmount(1_058_721, 'EUR'), '€1,058,721');
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
    assert.equal(formatAmount(547_008, 'EUR', true), '€547K');
    assert.equal(formatAmount(2_163_515, 'EUR', true), '€2.16M');
    assert.equal(formatAmount(2.5e9, 'EUR', true), '€2.5B');
    assert.equal(formatAmount(0, 'EUR', true), '€0');
  });

  it('keeps lakh and crore for rupees', () => {
    assert.equal(formatAmount(2_163_515, 'INR', true), '₹21.6L');
    assert.equal(formatAmount(11_400_000, 'INR', true), '₹1.14Cr');
  });
});

describe('formatAmount on a page with its own amount style', () => {
  it('writes every currency the Spanish way, with its narrow symbol after', () => {
    assert.equal(formatAmount(1_058_721, 'EUR', false, 'es'), '1.058.721\u00a0€');
    assert.equal(formatAmount(1_058_721, 'GBP', false, 'es'), '1.058.721\u00a0£');
    assert.equal(formatAmount(1_058_721, 'INR', false, 'es'), '1.058.721\u00a0₹');
    assert.equal(formatAmount(1500, 'EUR', false, 'es'), '1500\u00a0€');
  });

  it('never writes "10,000" on a Spanish page, in any currency', () => {
    for (const c of CURRENCIES) {
      for (const compact of [false, true]) {
        const s = formatAmount(2_163_515, c.code, compact, 'es');
        assert.doesNotMatch(s, /\d,\d{3}\b/, `${c.code}: ${s}`);
        assert.doesNotMatch(s, /^\D/, `${c.code} starts with its symbol: ${s}`);
      }
    }
  });

  it('keeps short forms in K and M with a decimal comma', () => {
    assert.equal(formatAmount(2_163_515, 'EUR', true, 'es'), '2,16M\u00a0€');
    assert.equal(formatAmount(547_008, 'EUR', true, 'es'), '547K\u00a0€');
  });

  it('writes billions as "mil M", never "B" (billón is a million millions)', () => {
    assert.equal(formatAmount(2.5e9, 'EUR', true, 'es'), '2,5 mil M\u00a0€');
    assert.equal(formatAmount(2.5e9, 'EUR', true), '€2.5B');
  });

  it('writes percentages the same way', () => {
    assert.equal(formatPercent(44.1, 'CZK', 1, 'es'), '44,1\u00a0%');
  });

  it('keeps the currency\'s own conventions without one', () => {
    assert.equal(formatAmount(1_058_721, 'EUR', false, null), '€1,058,721');
    assert.equal(formatAmount(1_058_721, 'INR', false, null), '₹10,58,721');
  });
});

describe('formatProseAmount', () => {
  it('spells an amount the way the lessons do, whatever the currency', () => {
    assert.equal(formatProseAmount(9_000, 'EUR'), '€9,000');
    assert.equal(formatProseAmount(23_200, 'EUR'), '€23,200');
    assert.equal(formatProseAmount(120_000, 'GBP'), '£120,000');
    assert.equal(formatProseAmount(250_000, 'USD'), '$250,000');
  });

  it('ignores the currency\'s own convention, which is the tools\' rule', () => {
    // The tools write these two as '₹10,58,721' and "CHF 1'058'721", because a
    // reader there picked the currency. A figure inside a sentence follows the
    // sentence, and every lesson writes one with the symbol first and commas
    // between thousands.
    assert.equal(formatProseAmount(1_058_721, 'INR'), '₹1,058,721');
    assert.equal(formatProseAmount(1_058_721, 'CHF').replace(/\s/g, ' '), 'CHF 1,058,721');
  });

  it('abbreviates in English', () => {
    assert.equal(formatProseAmount(547_008, 'EUR', true), '€547K');
    assert.equal(formatProseAmount(2_163_515, 'EUR', true), '€2.16M');
    assert.equal(formatProseAmount(2.5e9, 'EUR', true), '€2.5B');
    assert.equal(formatProseAmount(0, 'EUR', true), '€0');
  });

  it('writes a Hindi page\'s rupees with Indian grouping', () => {
    assert.equal(formatProseAmount(1_50_000, 'INR', false, 'hi'), '₹1,50,000');
    assert.equal(formatProseAmount(1_50_000, 'INR', true, 'hi'), '₹1.5L');
    assert.equal(formatProseAmount(2_30_00_000, 'INR', true, 'hi'), '₹2.3Cr');
  });

  it('writes a Spanish page\'s figures the Spanish way', () => {
    // In Spanish, "10,000" reads as ten with three decimals.
    const nbsp = (v: string) => v.replace(/\u00a0/g, ' ');
    assert.equal(nbsp(formatProseAmount(23_200, 'EUR', false, 'es')), '23.200 €');
    assert.equal(nbsp(formatProseAmount(1_500, 'EUR', false, 'es')), '1500 €');
    assert.equal(nbsp(formatProseAmount(547_008, 'EUR', true, 'es')), '547 mil €');
  });
});

describe('formatProsePercent', () => {
  it('follows the edition', () => {
    assert.equal(formatProsePercent(0.07), '7%');
    assert.equal(formatProsePercent(0.07, 'hi'), '7%');
    assert.equal(formatProsePercent(0.07, 'es').replace(/\u00a0/g, ' '), '7 %');
  });
});

describe('formatPercent', () => {
  it('uses the currency\'s decimal separator and spacing', () => {
    assert.equal(formatPercent(44.13, 'CZK').replace(/\s/g, ' '), '44,1 %');
    assert.equal(formatPercent(44.13, 'USD'), '44.1%');
    assert.equal(formatPercent(44.13, 'CHF'), '44.1%');
  });

  it('handles zero, negatives and non-finite values', () => {
    assert.equal(formatPercent(0, 'USD'), '0.0%');
    assert.equal(formatPercent(-12.5, 'USD'), '-12.5%');
    assert.equal(formatPercent(NaN, 'USD'), '0.0%');
  });
});
