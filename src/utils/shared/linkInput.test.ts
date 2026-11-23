/**
 * What a share link may put into a tool (linkInput.ts): a known currency,
 * something that reads as a typed number, a name of ordinary length.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_LINK_NAME_LENGTH, linkCurrency, linkLumpSums, linkName, linkNumber, linkWholeNumber } from './linkInput.ts';

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
