/**
 * Unit tests for src/utils/shared/amountUnits.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES, formatMoney } from '../loan/math.ts';
import { formatAmount, formatPercent } from './formatAmount.ts';
import { amountLength, longestAmount, splitAmounts } from './amountUnits.ts';

const MINUS = String.fromCodePoint(0x2212);
const units = (text: string) => splitAmounts(text).filter((p) => typeof p !== 'string').map((p) => (p as { amount: string }).amount);

describe('splitAmounts', () => {
  it('gives the line back when its pieces are joined', () => {
    for (const line of ['Between €9,900 and €17,010, in 2024.', 'no figures here', '', `${MINUS}€1,520 behind`, '98.765.432 €']) {
      assert.equal(splitAmounts(line).map((p) => (typeof p === 'string' ? p : p.amount)).join(''), line);
    }
  });

  it('keeps a sign and a currency symbol with the figure', () => {
    assert.deepEqual(units(`a gap of ${MINUS}€1,520 after ten years`), [`${MINUS}€1,520`]);
    assert.deepEqual(units('up +1.94% a year'), ['+1.94%']);
    assert.deepEqual(units('-€12,800'), ['-€12,800']);
  });

  it('leaves a sentence\'s own punctuation outside the unit', () => {
    assert.deepEqual(units('It comes to €1,520, which is less than €9,900.'), ['€1,520', '€9,900']);
  });

  it('takes each end of a range as its own unit, so the line can end at the word between', () => {
    assert.deepEqual(units('between €9,900,000,000 and €17,010,000,000'), ['€9,900,000,000', '€17,010,000,000']);
    assert.deepEqual(units('from 1995 to 2024'), ['1995', '2024']);
  });

  it('does not read a hyphen between two years as a minus sign', () => {
    assert.deepEqual(units('2020-2024'), ['2020', '2024']);
  });

  it('leaves a figure inside a word alone', () => {
    assert.deepEqual(units('the p10 and p90 lines'), []);
  });

  it('keeps every full amount the tools format as one unit, in every currency and page style', () => {
    for (const c of CURRENCIES) {
      for (const style of [null, 'es', 'cs', 'en-IN']) {
        for (const value of [0, 7, 1520, -1520, 98_765_432, 1e12]) {
          const text = formatAmount(value, c.code, false, style).replace(/^-/, MINUS);
          assert.deepEqual(units(`x ${text} y`), [text], `${c.code} ${style}: ${text}`);
          const cents = formatMoney(value * 100 + 55, c.code, style);
          assert.deepEqual(units(`x ${cents} y`), [cents], `${c.code} ${style}: ${cents}`);
        }
      }
    }
  });

  it('keeps every short amount and every percentage as one unit', () => {
    for (const c of CURRENCIES) {
      for (const style of [null, 'es', 'cs']) {
        for (const value of [1520, 98_765_432, 2_300_000_000]) {
          const text = formatAmount(value, c.code, true, style);
          assert.deepEqual(units(`x ${text} y`), [text], `${c.code} ${style}: ${text}`);
        }
        const pct = formatPercent(44.1, c.code, 1, style);
        assert.deepEqual(units(`x ${pct} y`), [pct], `${c.code} ${style}: ${pct}`);
      }
    }
  });

  it('keeps a Devanagari word after a figure out of the unit', () => {
    const line = `2024${String.fromCodePoint(0x00a0)}मध्ये ₹7,440`;
    assert.deepEqual(units(line), ['2024', '₹7,440']);
  });
});

describe('amountLength', () => {
  it('counts a digit as one and a separator as half', () => {
    assert.equal(amountLength('1234'), 4);
    assert.equal(amountLength('1,234'), 4.5);
  });

  it('counts a sign or a symbol as a little more than a digit', () => {
    assert.equal(amountLength('€1'), 2.1);
    assert.equal(amountLength(`${MINUS}€1`), 3.2);
  });

  it('counts a capital as more than a small letter, and the wide characters as more still', () => {
    assert.ok(amountLength('1K') > amountLength('1k'));
    assert.ok(amountLength('1M') > amountLength('1K'));
    assert.equal(amountLength('1%'), 2.7);
  });

  it('is longer for a longer amount', () => {
    assert.ok(amountLength('€17,010,000,000') > amountLength('€9,900,000,000'));
  });

  it('never counts an amount as narrower than its digits', () => {
    for (const c of CURRENCIES) {
      const text = formatAmount(98_765_432, c.code);
      assert.ok(amountLength(text) >= 8, `${c.code}: ${text}`);
    }
  });
});

describe('longestAmount', () => {
  it('finds the longest unit among several lines', () => {
    assert.equal(longestAmount('€1,520', 'between €9,900 and €17,010,000'), amountLength('€17,010,000'));
    assert.equal(longestAmount('no figures'), 0);
  });
});

describe('splitAmounts, piece by piece', () => {
  it('gives no empty piece before an amount that starts the line, between two that touch, or after one that ends it', () => {
    assert.deepEqual(splitAmounts('€5 and'), [{ amount: '€5', length: 2.1 }, ' and']);
    assert.deepEqual(splitAmounts('costs €5'), ['costs ', { amount: '€5', length: 2.1 }]);
    assert.deepEqual(splitAmounts('€5'), [{ amount: '€5', length: 2.1 }]);
    assert.deepEqual(splitAmounts('5%+6'), [{ amount: '5%', length: 2.7 }, { amount: '+6', length: 2.1 }]);
    assert.deepEqual(splitAmounts(''), []);
  });
});

describe('amountLength, character by character', () => {
  const NNBSP = String.fromCodePoint(0x202f);
  const NBSP = String.fromCodePoint(0x00a0);
  const APOSTROPHE = String.fromCodePoint(0x2019);

  it('counts a narrow no-break space as a quarter and any other space as a little under half', () => {
    assert.equal(amountLength(`1${NNBSP}1`), 2.3);
    assert.equal(amountLength(`1${NNBSP}${NNBSP}1`), 2.5);
    assert.equal(amountLength('1 1'), 2.5);
    assert.equal(amountLength(`1${NBSP}${NBSP}1`), 2.9);
  });

  it('counts every separator as half: point, comma and both apostrophes', () => {
    for (const sep of ['.', ',', "'", APOSTROPHE]) assert.equal(amountLength(`1${sep}1`), 2.5, sep);
  });

  it('counts each wide character as 1.7', () => {
    for (const ch of ['M', 'W', 'm', 'w', '%', '₩', '₪', '@']) assert.equal(amountLength(ch), 1.7, ch);
  });

  it('counts each thin small letter as two thirds', () => {
    for (const ch of ['i', 'l', 'j', 't', 'f', 'r']) assert.equal(amountLength(ch), 0.7, ch);
    assert.equal(amountLength('ii'), 1.3);
  });

  it('counts a capital, the capital I too, and each broad currency sign as 1.3', () => {
    for (const ch of ['K', 'Č', 'I', '₱', '₦', '₴']) assert.equal(amountLength(ch), 1.3, ch);
  });

  it('counts a small letter as one digit, and any other sign as a little more', () => {
    assert.equal(amountLength('k'), 1);
    assert.equal(amountLength('č'), 1);
    assert.equal(amountLength('€'), 1.1);
    assert.equal(amountLength('+'), 1.1);
    assert.equal(amountLength('₹'), 1.1);
  });
});
