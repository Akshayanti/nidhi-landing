/**
 * A numeric tool's boxes, as the language switch and links carry them
 * (formBoxes.ts): what was readable travels as a number, valid or not, and
 * what was not travels as the marker, never as typed (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { boxValue, readBoxes, withBoxes } from './formBoxes.ts';
import { displayNumber } from './parseLocaleNumber.ts';

describe('boxValue', () => {
  it('writes a readable number plainly, in range or not', () => {
    const cases = [
      ['2,5', 'es', '2.5'],
      ['-5', 'en', '-5'],
      ['1,000,000,000,000', 'en', '1000000000000'],
      ['0.0000001', 'en', '0.0000001'],
      ['1000000000000000000000', 'en', '1000000000000000000000'],
      ['१२', 'hi', '12'],
      ['2,', 'cs', '2'],
    ];
    for (const [typed, locale, value] of cases) assert.equal(boxValue(typed, locale), value, typed);
  });

  it('keeps an empty box empty', () => {
    for (const typed of ['', '   ']) assert.equal(boxValue(typed, 'en'), '');
  });

  it('marks what cannot be read, and never returns the text', () => {
    for (const typed of ['7x', 'Alice', '?', 'NaN', '1e3', '9'.repeat(201)]) {
      assert.equal(boxValue(typed, 'en'), 'NaN', typed.slice(0, 20));
    }
  });
});

describe('withBoxes and readBoxes', () => {
  it('carry the boxes over the rest of the state, empty ones included', () => {
    const encoded = withBoxes('c=INR&a=500', { a: 'NaN', r: '', y: '500' });
    assert.deepEqual(readBoxes(encoded, ['a', 'r', 'y', 'g']), { a: 'NaN', r: '', y: '500' });
    assert.equal(new URLSearchParams(encoded).get('c'), 'INR');
  });

  it('leave the state as it was when there is no box to carry', () => {
    assert.equal(withBoxes('c=INR&a=500', {}), 'c=INR&a=500');
    assert.equal(withBoxes('', {}), '');
  });

  it('read only the keys that are there', () => {
    assert.deepEqual(readBoxes('#a=12', ['a', 'r']), { a: '12' });
    assert.deepEqual(readBoxes('?a=-2.5', ['a']), { a: '-2.5' });
  });

  it('mark raw text in a link shared before the fix', () => {
    for (const raw of ['7x', '1e3', '0x10', 'Infinity', '<b>', '1,000', '9'.repeat(201)]) {
      assert.deepEqual(readBoxes(new URLSearchParams({ a: raw }).toString(), ['a']), { a: 'NaN' }, raw.slice(0, 20));
    }
  });

  it('a value reads the same after crossing to any language', () => {
    for (const from of ['en', 'hi', 'es', 'cs', 'mr']) {
      for (const to of ['en', 'hi', 'es', 'cs', 'mr']) {
        for (const value of ['0', '12', '2.5', '-3.25', '1000000000000', '', 'NaN']) {
          const typed = displayNumber(value, from);
          const arrived = readBoxes(withBoxes('', { a: boxValue(typed, from) }), ['a']).a ?? '';
          assert.equal(boxValue(displayNumber(arrived, to), to), value, `${value} ${from} to ${to}`);
        }
      }
    }
  });
});

describe('the longest number a box or a link may carry', () => {
  it('carries a number of 200 characters and marks one of 201', () => {
    assert.equal(boxValue(`1${'0'.repeat(199)}`, 'en').length, 200);
    assert.equal(boxValue(`1${'0'.repeat(200)}`, 'en'), 'NaN');
    const long = '9'.repeat(200);
    assert.deepEqual(readBoxes(`a=${long}&b=${long}9`, ['a', 'b']), { a: long, b: 'NaN' });
  });
});

describe('withBoxes and readBoxes at their edges', () => {
  it('hands the state back untouched, character for character, when there is no box', () => {
    assert.equal(withBoxes('n=a b&m=%7E', {}), 'n=a b&m=%7E');
  });

  it('reads a link with or without its leading ? or #, and only a leading one', () => {
    assert.deepEqual(readBoxes('?x=5', ['x']), { x: '5' });
    assert.deepEqual(readBoxes('#x=5', ['x']), { x: '5' });
    assert.deepEqual(readBoxes('x=5', ['x']), { x: '5' });
    assert.deepEqual(readBoxes('x=5&q=a?b', ['x']), { x: '5' });
    assert.deepEqual(readBoxes('x=5&q=a%23b#c', ['x']), { x: '5' });
  });
});
