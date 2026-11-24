/**
 * The years the Monte Carlo simulator's table of numbers lists (#790): every
 * fifth year, and always the plan's last year, once.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tableYears } from './MonteCarloSimulator.tsx';

describe('the years the table lists', () => {
  it('lists every fifth year from today, then the last year', () => {
    assert.deepEqual(tableYears(12), [0, 5, 10, 12]);
    assert.deepEqual(tableYears(3), [0, 3]);
    assert.deepEqual(tableYears(1), [0, 1]);
  });

  it('lists a last year that is itself a fifth year once', () => {
    assert.deepEqual(tableYears(10), [0, 5, 10]);
    assert.deepEqual(tableYears(5), [0, 5]);
    assert.deepEqual(tableYears(60), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  });

  it('lists today alone for a plan of no years', () => {
    assert.deepEqual(tableYears(0), [0]);
  });
});
