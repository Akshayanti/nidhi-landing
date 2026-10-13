/**
 * Unit tests for src/utils/shared/parseLocaleNumber.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalNumber,
  displayNumber,
  formatForInput,
  numberSeparators,
  parseLocaleNumber,
} from './parseLocaleNumber.ts';

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
    // No western number groups in twos, so an Indian reader on the English page is read too.
    assert.equal(parseLocaleNumber('10,00,000', EN), 1_000_000);
    assert.equal(parseLocaleNumber('10,00,000', ES), 1_000_000);
    assert.equal(parseLocaleNumber('10.00.000', ES), null, 'lakh grouping is written with commas');
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

describe('canonicalNumber and displayNumber: the input box and plain-number state', () => {
  it('turns what a reader types into JavaScript\'s own spelling', () => {
    assert.equal(canonicalNumber('10.000', ES), '10000');
    assert.equal(canonicalNumber('2,5', ES), '2.5');
    assert.equal(canonicalNumber('1.234,56', ES), '1234.56');
    assert.equal(canonicalNumber('10,000', EN), '10000');
    assert.equal(canonicalNumber('10,00,000', HI), '1000000');
    assert.equal(canonicalNumber('6.5', EN), '6.5');
    assert.equal(canonicalNumber('  ', ES), '');
    assert.equal(canonicalNumber('2,', ES), '2', 'a decimal mark still being typed');
    assert.equal(canonicalNumber('2.', EN), '2');
    assert.equal(canonicalNumber('.5', EN), '0.5', 'a leading decimal mark, as the tools always read it');
    assert.equal(canonicalNumber(',5', ES), '0.5');
  });

  it('marks text that is not a number as NaN rather than reading it another way', () => {
    assert.equal(canonicalNumber('1,23,4', EN), 'NaN');
    assert.equal(canonicalNumber('abc', ES), 'NaN');
    assert.equal(Number(canonicalNumber('1.2.3', ES)), NaN);
  });

  it('shows plain numbers in the page\'s style', () => {
    assert.equal(displayNumber('2.5', ES), '2,5');
    assert.equal(displayNumber('5.125', ES), '5,125');
    assert.equal(displayNumber('250000', ES), '250000');
    assert.equal(displayNumber('2.5', EN), '2.5');
    assert.equal(displayNumber('', ES), '');
    assert.equal(displayNumber('1.123456789012', ES), '1,123456789012', 'every digit kept');
    assert.equal(displayNumber('007', EN), '007', 'shown as stored');
  });

  it('shows an older link\'s comma-grouped value as the number those tools read', () => {
    assert.equal(displayNumber('250,000', ES), '250000');
    assert.equal(displayNumber('250,000', EN), '250000');
  });

  it('round-trips: what is shown reads back as the same number', () => {
    for (const locale of [EN, HI, ES]) {
      for (const v of ['0', '6.5', '5.125', '250000', '1234.56', '0.01']) {
        assert.equal(canonicalNumber(displayNumber(v, locale), locale), v, `${v} on ${locale}`);
      }
    }
  });
});
