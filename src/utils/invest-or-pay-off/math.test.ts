/**
 * Unit tests for src/utils/invest-or-pay-off/math.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REAL_RETURN_TOP,
  compare,
  compareRange,
  inflationDefault,
  inputProblem,
  rates,
  returnNote,
  sanitizeInputs,
  toNominal,
  toReal,
  type Inputs,
} from './math.ts';

// Eva's car loan from lesson 49: a 6.5% loan, extra money each month.
const BASE: Inputs = {
  balance: 18_000,
  debtRate: 6.5,
  payment: 400,
  extra: 200,
  relief: 0,
  inflation: 2,
  returns: 'historical',
  ownReturn: 7,
  feePct: 0,
  gainsTax: 0,
  horizon: 'payoff',
};

const FAST = { paths: 2_000 };
const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b} (tolerance ${tol})`);

describe('real and nominal rates', () => {
  it('converts exactly, never by subtraction', () => {
    close(toReal(7, 2), 4.902, 0.001);
    close(toNominal(5, 2), 7.1, 1e-9);
    close(toReal(toNominal(4.3, 37), 37), 4.3, 1e-9);
  });

  it('places the debt after relief and after inflation', () => {
    const r = rates({ ...BASE, debtRate: 4, relief: 30, inflation: 2 });
    close(r.debtAfterRelief, 2.8, 1e-9);
    close(r.debtReal, toReal(2.8, 2), 1e-9);
  });

  it('turns the after-inflation settings into nominal returns with the inflation figure', () => {
    const low = rates({ ...BASE, returns: 'cautious', inflation: 2 });
    const high = rates({ ...BASE, returns: 'cautious', inflation: 40 });
    close(low.investReal, 4, 1e-9);
    close(high.investReal, 4, 1e-9);
    close(high.investNominal, toNominal(4, 40), 1e-9);
  });
});

describe('return notes', () => {
  it('notes only a figure strictly above the range after inflation', () => {
    const at = toNominal(REAL_RETURN_TOP, 2);
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: at }), null);
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: at + 0.01 }), 'above-range');
  });

  it('judges the figure after the country inflation, so a high-inflation figure is not flagged', () => {
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: 18, inflation: 2 }), 'above-range');
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: 18, inflation: 12 }), null);
  });

  it('notes strictly below zero, and nothing at exactly zero', () => {
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: 2, inflation: 2 }), null);
    assert.equal(returnNote({ ...BASE, returns: 'own', ownReturn: 1.9, inflation: 2 }), 'below-zero');
  });

  it('gives no note for the three settings', () => {
    for (const returns of ['cautious', 'historical', 'optimistic'] as const) assert.equal(returnNote({ ...BASE, returns }), null);
  });
});

describe('input problems', () => {
  it('rejects a payment that never pays the debt', () => {
    assert.equal(inputProblem({ ...BASE, payment: 18_000 * 0.065 / 12 }), 'payment-too-low');
    assert.equal(inputProblem({ ...BASE, balance: 0 }), 'no-balance');
  });

  it('rejects impossible rates at or below -100%', () => {
    assert.equal(inputProblem({ ...BASE, inflation: -100 }), 'impossible-rate');
    assert.equal(inputProblem({ ...BASE, returns: 'own', ownReturn: -100 }), 'impossible-rate');
    assert.equal(inputProblem({ ...BASE, inflation: Number.NaN }), 'impossible-rate');
  });

  it('rejects a debt longer than sixty years', () => {
    assert.equal(inputProblem({ ...BASE, balance: 1_000_000, debtRate: 5, payment: 4_200 }), 'too-long');
  });

  it('accepts the base case', () => {
    assert.equal(inputProblem(BASE), null);
  });

  it('clamps hand-edited values', () => {
    const s = sanitizeInputs({ ...BASE, feePct: 50, relief: 200, horizon: 'nope' as never, returns: 'x' as never });
    assert.equal(s.feePct, 5);
    assert.equal(s.relief, 100);
    assert.equal(s.horizon, 'payoff');
    assert.equal(s.returns, 'historical');
  });
});

describe('schedules', () => {
  it('pays off sooner with the extra money and avoids interest', () => {
    const r = compare(BASE, FAST);
    assert.ok(r.payoffMonthA < r.payoffMonthB);
    assert.ok(r.interestAvoided > 0);
    assert.equal(r.months, r.payoffMonthA);
  });

  it('subtracts the debt still owed in B on the comparison date', () => {
    const r = compare(BASE, FAST);
    assert.ok(r.remainingB > 0);
    // With no growth at all, B is A less the remaining debt plus the interest A avoided.
    const flat = compare({ ...BASE, returns: 'own', ownReturn: 0, inflation: 0 }, { paths: 1, flat: true });
    close(flat.a.p50 - flat.b.p50, flat.interestAvoided, 0.01);
  });

  it('with zero extra, the two paths are the same', () => {
    const r = compare({ ...BASE, extra: 0, horizon: 'plus5' }, FAST);
    assert.equal(r.payoffMonthA, r.payoffMonthB);
    close(r.diff.p10, 0, 1e-6);
    close(r.diff.p90, 0, 1e-6);
    assert.equal(r.bAhead, 0);
  });

  it('extra money above the balance clears the debt in the first month and invests the rest', () => {
    const r = compare({ ...BASE, balance: 100, extra: 5_000, horizon: 'plus5' }, FAST);
    assert.equal(r.payoffMonthA, 1);
    assert.ok(r.a.p50 > 0);
  });

  it('handles B paying off before the comparison date, and after it', () => {
    const before = compare({ ...BASE, horizon: 'plus10' }, FAST);
    assert.ok(before.payoffMonthB < before.months);
    assert.equal(before.remainingB, 0);
    const after = compare({ ...BASE, horizon: 'payoff' }, FAST);
    assert.ok(after.payoffMonthB > after.months);
    assert.ok(after.remainingB > 0);
  });

  it('pays the final partial month and invests what is left of it', () => {
    // 1,000 at 0%: 100 a month plus 150 extra clears it in four months (250 x 4 = 1,000).
    const r = compare({ ...BASE, balance: 1_000, debtRate: 0, payment: 100, extra: 150, inflation: 0, returns: 'own', ownReturn: 0 }, { paths: 1, flat: true });
    assert.equal(r.payoffMonthA, 4);
    // 1,050: the fifth month needs only 50 of the 250, so A ends with 200 invested after a horizon of five months.
    const p = compare({ ...BASE, balance: 1_050, debtRate: 0, payment: 100, extra: 150, inflation: 0, returns: 'own', ownReturn: 0 }, { paths: 1, flat: true });
    assert.equal(p.payoffMonthA, 5);
    close(p.a.p50, 200, 1e-6);
  });

  it('counts relief as cash back on the interest, so it lowers the interest and the gap', () => {
    const none = compare(BASE, FAST);
    const half = compare({ ...BASE, relief: 50 }, FAST);
    close(half.interestA, none.interestA / 2, 1e-6);
    assert.ok(half.interestAvoided < none.interestAvoided);
  });
});

describe('the paired simulation', () => {
  it('is reproducible with the same seed', () => {
    assert.deepEqual(compare(BASE, FAST), compare(BASE, FAST));
  });

  it('reports percentiles of the paired difference, not differences of percentiles', () => {
    const r = compare({ ...BASE, horizon: 'plus10' }, FAST);
    assert.ok(r.diff.p10 <= r.diff.p50 && r.diff.p50 <= r.diff.p90);
    // The paired spread is much narrower than subtracting independent percentiles would suggest.
    assert.ok(r.diff.p90 - r.diff.p10 < r.b.p90 - r.a.p10);
  });

  it('a high-rate debt is almost always better paid off; a low-rate one less often', () => {
    const card = compare({ ...BASE, debtRate: 22, horizon: 'plus10' }, FAST);
    const mortgage = compare({ ...BASE, balance: 280_000, debtRate: 3.4, payment: 1_300, extra: 500, horizon: 'plus10' }, FAST);
    assert.ok(card.bAhead < 0.1, `card ${card.bAhead}`);
    assert.ok(mortgage.bAhead > card.bAhead);
  });

  it('fees and tax on gains reduce what investing ends with', () => {
    const plain = compare({ ...BASE, horizon: 'plus10' }, FAST);
    const costly = compare({ ...BASE, horizon: 'plus10', feePct: 1, gainsTax: 25 }, FAST);
    assert.ok(costly.b.p50 < plain.b.p50);
    assert.ok(costly.bAhead <= plain.bAhead);
  });

  it('shows results in today\'s money', () => {
    const r0 = compare({ ...BASE, returns: 'own', ownReturn: 0, inflation: 0, horizon: 'plus5' }, { paths: 1, flat: true });
    const r5 = compare({ ...BASE, returns: 'own', ownReturn: 5, inflation: 5, horizon: 'plus5' }, { paths: 1, flat: true });
    // A 5% return at 5% inflation keeps buying power, so A (no debt, contributions invested)
    // in today's money is below the zero-inflation case: contributions are fixed in nominal terms.
    assert.ok(r5.a.p50 < r0.a.p50);
  });

  it('runs the historical range beside the reader\'s own figure', () => {
    const own = { ...BASE, returns: 'own' as const, ownReturn: 15, horizon: 'plus10' as const };
    const range = compareRange(own, FAST);
    assert.ok(range.cautious.b.p50 < range.optimistic.b.p50);
    assert.ok(compare(own, FAST).b.p50 > range.optimistic.b.p50);
  });
});

describe('the inflation default', () => {
  const series = (from: number, to: number, rate: number) => {
    const s: Record<number, number> = {};
    for (let y = from; y <= to; y++) s[y] = rate;
    return s;
  };

  it('averages the last ten years geometrically, with five-year and latest context', () => {
    const s = { ...series(2010, 2024, 3), 2024: 10 };
    const d = inflationDefault(s, 2025);
    assert.ok(d);
    assert.equal(d.first, 2015);
    assert.equal(d.last, 2024);
    assert.equal(d.count, 10);
    close(d.average, (Math.pow(1.03 ** 9 * 1.1, 1 / 10) - 1) * 100, 1e-9);
    close(d.fiveYear!, (Math.pow(1.03 ** 4 * 1.1, 1 / 5) - 1) * 100, 1e-9);
    assert.equal(d.latest, 10);
  });

  it('needs five of the ten years', () => {
    const sparse = { 2016: 2, 2018: 2, 2020: 2, 2022: 2, 2024: 2 };
    assert.ok(inflationDefault(sparse, 2025));
    const sparser = { 2018: 2, 2020: 2, 2022: 2, 2024: 2 };
    assert.equal(inflationDefault(sparser, 2025), null);
  });

  it('gives no default when the figures stopped long ago or there are none', () => {
    assert.equal(inflationDefault(series(2000, 2018, 2), 2025), null);
    assert.equal(inflationDefault({}, 2025), null);
  });

  it('handles very high and negative inflation', () => {
    assert.ok(inflationDefault({ ...series(2015, 2024, 50), 2023: -1 }, 2025)!.average > 40);
  });
});
