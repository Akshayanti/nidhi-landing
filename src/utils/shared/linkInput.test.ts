/**
 * What a share link may put into a tool (linkInput.ts): a known currency,
 * something that reads as a typed number, a name of ordinary length.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_LINK_NAME_LENGTH, fitsLinkNumber, linkCurrency, linkLumpSums, linkName, linkNumber, linkWholeNumber } from './linkInput.ts';

const KNOWN = new Set(['EUR', 'USD', 'INR']);

describe('linkCurrency', () => {
  it('keeps a currency the tools know', () => {
    assert.equal(linkCurrency('USD', KNOWN, 'EUR'), 'USD');
  });

  it('falls back for anything else', () => {
    for (const code of [null, '', 'ZZZ', 'usd', ' USD', '<script>', 'EUR&base=USD#', 'E'.repeat(3000)]) {
      assert.equal(linkCurrency(code, KNOWN, 'EUR'), 'EUR', String(code).slice(0, 20));
      assert.equal(linkCurrency(code, KNOWN, null), null);
    }
  });
});

describe('linkNumber', () => {
  it('keeps numbers the way people type them', () => {
    for (const typed of ['', '0', '250000', '4.5', '1,234.56', '1.234,56', '1 234,56', '1\u00a0234,56', '1\u202f234', "1'234", '1’234', '-5', '+5', '१२३']) {
      assert.equal(linkNumber(typed, 'fallback'), typed, typed);
    }
  });

  it('takes the default only when there is no value', () => {
    assert.equal(linkNumber(null, '60'), '60');
  });

  it('marks text, markup and over-long values, never the default and never the text (#789)', () => {
    for (const value of ['abc', '7x', '12 months', '1e9', '<b>1</b>', '5%', '1/2', 'javascript:1', '12:5000', '1;2', '1'.repeat(201), '12\u0001']) {
      assert.equal(linkNumber(value, '60'), 'NaN', value.slice(0, 20));
    }
  });
});

describe('linkNumber and an unreadable box (#789)', () => {
  it('keeps the unreadable marker', () => {
    assert.equal(linkNumber('NaN', '60'), 'NaN');
  });
});

describe('linkLumpSums', () => {
  it('bounds each side, not the list', () => {
    const side = '1'.repeat(200);
    assert.equal(linkLumpSums(`${side}:${side}`, ''), `${side}:${side}`);
    assert.equal(linkLumpSums(`1:${side}1;2:300`, ''), '1:NaN;2:300');
  });

  it('takes the default only when there is no value', () => {
    assert.equal(linkLumpSums(null, ''), '');
  });
});

describe('linkWholeNumber', () => {
  it('keeps a whole number in range, in its plain form', () => {
    assert.equal(linkWholeNumber('0', 0, 6, '1'), '0');
    assert.equal(linkWholeNumber('6', 0, 6, '1'), '6');
    assert.equal(linkWholeNumber('03', 0, 6, '1'), '3');
  });

  it('falls back out of range or when it is not a whole number', () => {
    for (const value of [null, '', '7', '99', '-1', '1.5', 'abc', '1e1', ' 1', '9'.repeat(12)]) {
      assert.equal(linkWholeNumber(value, 0, 6, '1'), '1', String(value));
    }
  });
});

describe('linkName', () => {
  it('keeps an ordinary name, in any script', () => {
    for (const name of ['Bank A', 'Česká spořitelna', 'एसबीआई होम लोन', 'A ~ B', 'O’Brien & Sons <3']) {
      assert.equal(linkName(name), name);
    }
  });

  it('cuts a long name at the stated length, without splitting a character', () => {
    assert.equal(linkName('x'.repeat(5000)).length, MAX_LINK_NAME_LENGTH);
    const cut = linkName('😀'.repeat(200));
    assert.equal([...cut].length, MAX_LINK_NAME_LENGTH);
    assert.equal(cut, '😀'.repeat(MAX_LINK_NAME_LENGTH));
  });

  it('removes control characters, the tuple codec’s own marker among them', () => {
    assert.equal(linkName('A\u0001B\u0000C\nD\u007fE\u0085F'), 'ABCDEF');
  });
});

describe('the edges of what a link may carry', () => {
  it('keeps a number of 200 characters and marks one of 201', () => {
    assert.equal(linkNumber('9'.repeat(200), 'f'), '9'.repeat(200));
    assert.equal(linkNumber('9'.repeat(201), 'f'), 'NaN');
  });

  it('skips a blank lump sum between two real ones, and reads spaces around each side', () => {
    assert.equal(linkLumpSums('1:2; ;3:4', 'f'), '1:2;3:4');
    assert.equal(linkLumpSums(' 12 : 5 ', 'f'), '12:5');
    assert.equal(linkLumpSums('1:2;', 'f'), '1:2');
  });

  it('marks a lump sum with a side missing or one too many, and keeps the other side', () => {
    assert.equal(linkLumpSums(' :5', 'f'), 'NaN:5');
    assert.equal(linkLumpSums('5: ', 'f'), '5:NaN');
    assert.equal(linkLumpSums('5', 'f'), 'NaN');
    assert.equal(linkLumpSums('1:2:3;4:5', 'f'), 'NaN;4:5');
    assert.equal(linkLumpSums('x:5', 'f'), 'NaN:5');
  });

  it('keeps as many lump sums as a plan can hold and refuses one more', () => {
    const pairs = (n: number) => Array.from({ length: n }, () => '1:2').join(';');
    assert.equal(linkLumpSums(pairs(1200), 'f'), pairs(1200));
    assert.equal(linkLumpSums(pairs(1201), 'f'), 'NaN');
  });

  it('keeps a whole number at either end of its range and falls back just outside', () => {
    assert.equal(linkWholeNumber('1', 1, 10, 'f'), '1');
    assert.equal(linkWholeNumber('10', 1, 10, 'f'), '10');
    assert.equal(linkWholeNumber('0', 1, 10, 'f'), 'f');
    assert.equal(linkWholeNumber('11', 1, 10, 'f'), 'f');
    assert.equal(linkWholeNumber(null, 1, 10, 'f'), 'f');
    assert.equal(linkWholeNumber('007', 1, 10, 'f'), '7');
    assert.equal(linkWholeNumber('1234567890', 0, 1e12, 'f'), 'f', 'ten digits are too many');
    assert.equal(linkWholeNumber('123456789', 0, 1e12, 'f'), '123456789');
  });
});

describe('a number as the site writes one: all a checked link may carry (#821)', () => {
  const NBSP = '\u00a0';
  const NARROW = '\u202f';

  it('takes digits alone or with one decimal mark, which is what the tools write', () => {
    for (const value of ['0', '5', '250000', '007', '6.5', '6,5', '0.0000001', '12345.678901', '1,25', '1.25']) {
      assert.equal(fitsLinkNumber(value), true, value);
    }
  });

  it('takes comma groups of three with a point for decimals: the English, Hindi and Marathi pages', () => {
    for (const value of ['1,234,567', '12,345,678', '123,456,789', '1,234.5', '12,345.67', '123,456.789', '1,234,567.5']) {
      assert.equal(fitsLinkNumber(value), true, value);
    }
  });

  it('takes the Indian grouping, twos before the last three', () => {
    for (const value of ['1,00,000', '10,00,000', '1,00,00,000', '12,34,567', '12,34,567.5', '10,00,000.75']) {
      assert.equal(fitsLinkNumber(value), true, value);
    }
  });

  it('takes point groups with a comma for decimals: the Spanish page', () => {
    for (const value of ['1.234.567', '12.345.678', '123.456.789', '1.234,5', '12.345,67', '123.456,789', '1.234.567,5']) {
      assert.equal(fitsLinkNumber(value), true, value);
    }
  });

  it('takes space groups with a comma for decimals: the Czech page, with a plain, a no-break or a narrow no-break space', () => {
    for (const space of [' ', NBSP, NARROW]) {
      for (const value of ['1_234', '12_345', '123_456', '1_234_567', '12_345_678,5', '1_234,56']) {
        const written = value.replaceAll('_', space);
        assert.equal(fitsLinkNumber(written), true, JSON.stringify(written));
      }
    }
  });

  it('refuses what is not a number anyone writes: marks alone, marks at an end, a sign, a letter, nothing', () => {
    for (const value of ['', '-', '+', '.', ',', ' ', '..', ',,', '-.', '.5', ',5', '5.', '5,', '1..2', '1,,2', '1.,2', '+5', '5-', '5+', '1e5', '0x10', 'NaN', 'abc', '5 ', ' 5', '1\t234', "1'234", '1’234', '1/2', '5%']) {
      assert.equal(fitsLinkNumber(value), false, JSON.stringify(value));
    }
  });

  it('refuses groups that are no grouping: "1,2,3", "1 2", a group of the wrong size, a zero in front', () => {
    for (const value of [
      '1,2,3', '1 2', '1 23', '1 2345', '1.2.3', '1,23,45', '1,2345,678', '1,234,5678', '1234,567,890', '0,123,456', '01,234,567',
      '1,00,00', '1,00,0000', '100,00,000', '0,00,000', '1,000,00', '10,00,000,75',
      '1.23.456', '1.234.5678', '1234.567.890', '0.123.456', '1.2345.678',
      '1234 567', '0 123', '1  234', '1 234 ', ' 1 234', '1 234 56', '12 34 567',
    ]) {
      assert.equal(fitsLinkNumber(value), false, JSON.stringify(value));
    }
  });

  it('refuses a style with another style\'s marks: two kinds of space, a point after spaces, a second decimal', () => {
    for (const value of [
      `1 234${NBSP}567`, `1${NBSP}234${NARROW}567`, '1 234.5', `1${NBSP}234.5`, '1,234,567,5', '1,234,567.', '1,234,567.5.5', '1,234.5,5',
      '1.234.567.', '1.234.567,', '1.234,5,5', '1.234,5.5', '1 234,', '1 234,5,5', '10,00,000.', '1,234 567', '1.234 567',
    ]) {
      assert.equal(fitsLinkNumber(value), false, JSON.stringify(value));
    }
  });

  it('refuses anything before or after a number of every style', () => {
    for (const whole of ['5', '6.5', '1,234,567', '1,234.5', '10,00,000', '1.234.567', '1.234,5', '1 234 567', '1 234,5']) {
      assert.equal(fitsLinkNumber(whole), true, whole);
      for (const [before, after] of [['x', ''], ['', 'x'], ['', '\n'], ['\n', ''], ['', '%'], ['€', '']]) {
        const value = `${before}${whole}${after}`;
        assert.equal(fitsLinkNumber(value), false, JSON.stringify(value));
      }
    }
  });

  it('refuses digits of another script: the tools write Latin ones and the tool that reads these knows no others', () => {
    for (const value of ['१२३', '१,२३४', '١٢٣', '۱۲۳', '1२3']) assert.equal(fitsLinkNumber(value), false, value);
  });

  it('takes a minus only where the field takes one, and only one, in front of a number', () => {
    for (const value of ['-5', '-6.5', '-1,234.5', '-10,00,000', '-1.234,5', '-1 234']) {
      assert.equal(fitsLinkNumber(value), false, value);
      assert.equal(fitsLinkNumber(value, {}), false, value);
      assert.equal(fitsLinkNumber(value, { negative: false }), false, value);
      assert.equal(fitsLinkNumber(value, { negative: true }), true, value);
    }
    for (const value of ['5', '57', '6.5', '1,234.5']) assert.equal(fitsLinkNumber(value, { negative: true }), true, value);
    for (const value of ['-', '--5', '5-', '+5', '- 5', '−5', '-', '-.5', '']) assert.equal(fitsLinkNumber(value, { negative: true }), false, JSON.stringify(value));
  });

  it('takes a number of 200 characters and refuses one of 201, minus included', () => {
    assert.equal(fitsLinkNumber('9'.repeat(200)), true);
    assert.equal(fitsLinkNumber('9'.repeat(201)), false);
    assert.equal(fitsLinkNumber(`-${'9'.repeat(199)}`, { negative: true }), true);
    assert.equal(fitsLinkNumber(`-${'9'.repeat(200)}`, { negative: true }), false);
  });

  it('leaves the reader of older links as lenient as it was', () => {
    for (const value of ['1,2,3', '1 2', '1..2', '-', '+5', ',', '१२३', "1'234"]) {
      assert.equal(fitsLinkNumber(value), false, value);
      assert.equal(linkNumber(value, '60'), value, value);
    }
  });
});
