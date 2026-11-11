/**
 * What the Monte Carlo simulator accepts in a number box (inputs.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isValidNumber } from './inputs.ts';

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

  it('are checked as whole numbers, and say so to the browser', () => {
    assert.match(source, /saveYears: !isValidNumber\(form\.saveYears, 0, 60, true\)/);
    assert.match(source, /withdrawYears: form\.withdrawOn && !isValidNumber\(form\.withdrawYears, 1, 60, true\)/);
    assert.equal((source.match(/step="1" value=\{form\.(saveYears|withdrawYears)\}/g) ?? []).length, 2);
  });
});
