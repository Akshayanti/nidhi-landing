/**
 * Unit tests for src/utils/shared/parseLocaleNumber.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatForInput, numberSeparators, parseLocaleNumber } from './parseLocaleNumber.ts';

const EN = 'en';
const HI = 'en-IN';
const ES = 'es';

describe('numberSeparators', () => {
  it('reads each page locale\'s marks from Intl', () => {
    assert.deepEqual(numberSeparators(EN), { group: ',', decimal: '.' });
    assert.deepEqual(numberSeparators(HI), { group: ',', decimal: '.' });
    assert.deepEqual(numberSeparators(ES), { group: '.', decimal: ',' });
  });
});

describe('English and Hindi pages: comma groups, point is the decimal', () => {
  for (const locale of [EN, HI]) {
    it(`reads plain, grouped and decimal numbers (${locale})`, () => {
      assert.equal(parseLocaleNumber('10000', locale), 10_000);
      assert.equal(parseLocaleNumber('10,000', locale), 10_000);
      assert.equal(parseLocaleNumber('1,234,567.89', locale), 1_234_567.89);
      assert.equal(parseLocaleNumber('2.5', locale), 2.5);
      assert.equal(parseLocaleNumber('0.75', locale), 0.75);
    });
  }

  it('reads Indian lakh grouping', () => {
    assert.equal(parseLocaleNumber('10,00,000', HI), 1_000_000);
    assert.equal(parseLocaleNumber('1,25,00,000.50', HI), 12_500_000.5);
    assert.equal(parseLocaleNumber('10,00,000', EN), null, 'groups of two are Indian grouping only');
  });

  it('reads "10.000" as ten, since the point is the decimal mark here', () => {
    assert.equal(parseLocaleNumber('10.000', EN), 10);
    assert.equal(parseLocaleNumber('10.000', EN, { maxDecimals: 2 }), null, 'three decimals are refused where two are allowed');
  });

  it('takes the only possible reading when the input cannot be grouping', () => {
    assert.equal(parseLocaleNumber('2,5', EN), 2.5, 'a comma before one digit can only be a decimal');
    assert.equal(parseLocaleNumber('12,34', EN), 12.34, 'nor before two');
    assert.equal(parseLocaleNumber('1.234.567', EN), 1_234_567, 'several points can only be grouping');
    assert.equal(parseLocaleNumber('10.000,50', EN), 10_000.5, 'with both marks, the rightmost is the decimal');
  });
});

describe('Spanish pages: point groups, comma is the decimal', () => {
  it('reads plain, grouped and decimal numbers', () => {
    assert.equal(parseLocaleNumber('10000', ES), 10_000);
    assert.equal(parseLocaleNumber('10.000', ES), 10_000);
    assert.equal(parseLocaleNumber('2,5', ES), 2.5);
    assert.equal(parseLocaleNumber('10.000,50', ES), 10_000.5);
    assert.equal(parseLocaleNumber('1.234.567,8', ES), 1_234_567.8);
    assert.equal(parseLocaleNumber('2,500', ES), 2.5, 'the comma is the decimal mark here, whatever follows it');
  });

  it('takes a point before fewer or more than three digits as a decimal', () => {
    assert.equal(parseLocaleNumber('2.5', ES), 2.5);
    assert.equal(parseLocaleNumber('3.25', ES), 3.25);
    assert.equal(parseLocaleNumber('2.500', ES), 2_500, 'three digits after a point is grouping on a Spanish page');
  });
});

describe('spaces as grouping, in every locale', () => {
  it('accepts spaces, no-break spaces and thin spaces between groups', () => {
    assert.equal(parseLocaleNumber('10 000', EN), 10_000);
    assert.equal(parseLocaleNumber('10 000,50', ES), 10_000.5);
    assert.equal(parseLocaleNumber('1 234 567', ES), 1_234_567);
    assert.equal(parseLocaleNumber('  42  ', EN), 42);
  });

  it('rejects spaces that do not separate groups of three', () => {
    assert.equal(parseLocaleNumber('1 2', EN), null);
    assert.equal(parseLocaleNumber('10  000', EN), null);
  });
});

describe('what is rejected rather than guessed', () => {
  for (const [raw, locale] of [
    ['', EN],
    ['abc', EN],
    ['1,23,4', EN],
    ['10,00,000', EN],
    ['1,2,3', EN],
    ['1.2.3', ES],
    ['12.34.567', ES],
    ['1,234.5.6', EN],
    ['.5', EN],
    ['5.', EN],
    ['5,', ES],
    ['1e3', EN],
    ['10.000.5', EN],
    ['1 000.000,5', ES],
    ['12,34.5', EN],
  ] as const) {
    it(`"${raw}" on ${locale}`, () => assert.equal(parseLocaleNumber(raw, locale), null));
  }

  it('refuses a minus sign unless negatives are allowed', () => {
    assert.equal(parseLocaleNumber('-2,5', ES), null);
    assert.equal(parseLocaleNumber('-2,5', ES, { allowNegative: true }), -2.5);
    assert.equal(parseLocaleNumber('−2.5', EN, { allowNegative: true }), -2.5);
    assert.equal(parseLocaleNumber('-0', EN, { allowNegative: true }), 0);
    assert.ok(!Object.is(parseLocaleNumber('-0', EN, { allowNegative: true }), -0));
  });

  it('refuses more decimals than allowed', () => {
    assert.equal(parseLocaleNumber('3.14', EN, { maxDecimals: 2 }), 3.14);
    assert.equal(parseLocaleNumber('3.145', EN, { maxDecimals: 2 }), null);
    assert.equal(parseLocaleNumber('3,145', ES, { maxDecimals: 2 }), null);
  });
});

describe('formatForInput', () => {
  it('writes a number back in the page\'s style, without grouping', () => {
    assert.equal(formatForInput(2.5, EN), '2.5');
    assert.equal(formatForInput(2.5, ES), '2,5');
    assert.equal(formatForInput(10_000, ES), '10000');
    assert.equal(formatForInput(1_000_000, HI), '1000000');
    assert.equal(formatForInput(3.14159, EN), '3.14');
  });

  it('round-trips through the parser in every locale', () => {
    for (const locale of [EN, HI, ES]) {
      for (const n of [0, 2.5, 3.25, 10_000, 1_234_567.89, 10_000.5]) {
        assert.equal(parseLocaleNumber(formatForInput(n, locale), locale), n, `${n} in ${locale}`);
      }
    }
  });
});

describe('grouping is one system or the other, never a mix', () => {
  it('rejects western and Indian groups mixed in one number', () => {
    assert.equal(parseLocaleNumber('1,234,56,789', 'hi'), null);
    assert.equal(parseLocaleNumber('123,45,678', 'hi'), null);
  });

  it('still reads each system on its own', () => {
    assert.equal(parseLocaleNumber('1,00,00,000', 'hi'), 10_000_000);
    assert.equal(parseLocaleNumber('1,234,567', 'hi'), 1_234_567);
    assert.equal(parseLocaleNumber('1.234.567', 'es'), 1_234_567);
  });
});
