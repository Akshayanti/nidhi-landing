/**
 * What the Monte Carlo simulator accepts in a number box (inputs.ts).
 */
import { readsSource } from '../../../test/mutationRun.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isValidNumber, tooLongForLink } from './inputs.ts';

describe('isValidNumber', () => {
  it('takes a number in range and refuses anything else', () => {
    for (const v of ['0', '1', '60', '12.5', ' 7 ']) assert.equal(isValidNumber(v, 0, 60), true, v);
    for (const v of ['', '  ', '-1', '61', 'abc', 'NaN', 'Infinity', '1e999']) assert.equal(isValidNumber(v, 0, 60), false, v);
  });

  it('takes whole years only where it is asked to (issue 516)', () => {
    for (const v of ['0', '1', '12', '60', '12.0']) assert.equal(isValidNumber(v, 0, 60, true), true, v);
    for (const v of ['12.5', '0.5', '2.5', '59.999']) assert.equal(isValidNumber(v, 0, 60, true), false, v);
  });
});

describe('the simulator’s year boxes', () => {
  const source = readFileSync(join(import.meta.dirname, '../../components/MonteCarloSimulator.tsx'), 'utf8');
  const form = readFileSync(join(import.meta.dirname, 'form.ts'), 'utf8');

  it('are checked as whole numbers, and say so to the browser', { skip: readsSource }, () => {
    assert.match(form, /saveYears: !isValidNumber\(f\.saveYears, 0, 60, true\)/);
    assert.match(form, /withdrawYears: f\.withdrawOn && !isValidNumber\(f\.withdrawYears, 1, 60, true\)/);
    assert.equal((source.match(/step="1" value=\{form\.(saveYears|withdrawYears)\}/g) ?? []).length, 2);
  });
});

describe('the length a link can carry', () => {
  it('counts the number, not the spaces around it', () => {
    assert.equal(tooLongForLink(`  ${'1'.repeat(199)}  `), false);
    assert.equal(tooLongForLink(`  ${'1'.repeat(201)}  `), true);
  });
});

describe('a number is refused for its length at 201 characters, typed or written out', () => {
  it('as typed: 200 characters pass, 201 do not, whatever the number comes to', () => {
    const at200 = `0.1${'0'.repeat(197)}`;
    assert.equal(at200.length, 200);
    assert.equal(tooLongForLink(at200), false);
    assert.equal(tooLongForLink(`${at200}0`), true);
    // Not a number at all, and still too long to carry.
    assert.equal(tooLongForLink('x'.repeat(201)), true);
    assert.equal(tooLongForLink('x'.repeat(200)), false);
  });

  it('as a link writes it: a short exponent that spells out past 200 characters', () => {
    // 1e-198 is "0." and 197 zeros and a 1: 200 characters.
    assert.equal(tooLongForLink('1e-198'), false);
    assert.equal(tooLongForLink('1e-199'), true);
    assert.equal(tooLongForLink('1e-250'), true);
  });

  it('a short number, an empty box and text are not too long', () => {
    for (const v of ['2000000', '', '   ', 'abc', 'Infinity', '1e999']) assert.equal(tooLongForLink(v), false, v);
  });

  it('a box refused for its length is not a valid number, though it is in range', () => {
    assert.equal(isValidNumber('1e-198', 0, 60), true);
    assert.equal(isValidNumber('1e-199', 0, 60), false);
    assert.equal(isValidNumber(`0.1${'0'.repeat(198)}`, 0, 60), false);
  });
});
