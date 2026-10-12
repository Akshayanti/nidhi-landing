/**
 * Unit tests for src/utils/home/heroExamples.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EXAMPLES, EXAMPLE_CURRENCY, STARTER, monthlyPath, starterExample, yearlyPath } from './heroExamples.ts';

describe('growth helpers', () => {
  it('a year of 5% growth on a lump sum with no saving is exactly 5%', () => {
    assert.ok(Math.abs(monthlyPath(100_000, 0, 12)[12] - 105_000) < 1e-6);
  });

  it('yearly path picks every twelfth month', () => {
    const y = yearlyPath(1_000, 100, 3);
    assert.equal(y.length, 4);
    assert.ok(Math.abs(y[1] - monthlyPath(1_000, 100, 12)[12]) < 1e-9);
  });
});

describe('hero example', () => {
  it('net worth is what is owned minus what is owed', () => {
    const e = starterExample();
    assert.equal(e.owned, 8_600);
    assert.equal(e.owed, 5_200);
    assert.equal(e.netWorth, 3_400);
  });

  it('the path starts at the invested balance and has one point a year', () => {
    const e = starterExample();
    assert.equal(e.values.length, STARTER.years + 1);
    assert.equal(e.values[0], e.invested);
  });

  it('the end splits into money put in (start plus monthly) and growth', () => {
    const e = starterExample();
    assert.equal(e.added, 18_000);
    assert.equal(e.putIn, e.invested + e.added);
    assert.ok(e.growth > 0);
    assert.ok(Math.abs(e.putIn + e.growth - e.end) < 1e-6);
  });
});

describe('the example each edition shows', () => {
  it('is in rupees for Hindi readers and in euros elsewhere', () => {
    assert.equal(EXAMPLE_CURRENCY.hi, 'INR');
    assert.equal(EXAMPLE_CURRENCY.en, 'EUR');
    assert.equal(EXAMPLE_CURRENCY.es, 'EUR');
  });

  for (const [code, ex] of Object.entries(EXAMPLES)) {
    it(`${code}: keeps the shape the copy describes`, () => {
      const e = starterExample(ex.starter);
      // The look-ahead starts at the vehicle's value, so the step reads on from the table.
      assert.equal(e.netWorth, ex.starter.owns[1].amount);
      assert.ok(e.netWorth > 0);
      assert.equal(ex.higherMonthly, ex.starter.monthly * 2);
      // Same income, one person under water and one ahead.
      assert.ok(ex.people.alex.owns < ex.people.alex.owes);
      assert.ok(ex.people.sam.owns > ex.people.sam.owes);
    });
  }
});
