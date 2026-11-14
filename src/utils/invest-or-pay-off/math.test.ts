/**
 * Unit tests for src/utils/invest-or-pay-off/math.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REAL_RETURN_TOP,
  PATHS,
  SEED,
  compare,
  compareRange,
  effectiveAnnual,
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
    // A twelfth of the rate each month: 2.8% comes to 2.836% over a year.
    close(r.debtReal, toReal(effectiveAnnual(2.8), 2), 1e-9);
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

describe("interest avoided in today's money is worked out month by month", () => {
  // An independent replay of both debt schedules: every month's interest at
  // that month's prices.
  const replay = (i: Inputs, months: number) => {
    const rate = i.debtRate / 100 / 12;
    const run = (outgo: number) => {
      const out: number[] = [];
      let debt = i.balance;
      for (let m = 0; m < months; m++) {
        const charged = debt > 0 ? debt * rate : 0;
        out.push(charged);
        debt = Math.max(0, debt + charged - Math.min(debt + charged, outgo));
        if (debt < 1e-6) debt = 0;
      }
      return out;
    };
    const a = run(i.payment + i.extra);
    const b = run(i.payment);
    let nominal = 0;
    let today = 0;
    for (let m = 0; m < months; m++) {
      const saved = (b[m] - a[m]) * (1 - i.relief / 100);
      nominal += saved;
      today += saved / Math.pow(1 + i.inflation / 100, (m + 1) / 12);
    }
    return { nominal, today };
  };

  for (const inflation of [0, 2, 6, 25]) {
    for (const relief of [0, 30]) {
      it(`matches a month-by-month replay at ${inflation}% inflation, ${relief}% relief`, () => {
        const i = { ...BASE, inflation, relief };
        const r = compare(i, { paths: 50, flat: true });
        const want = replay(i, r.months);
        close(r.interestAvoided, want.nominal, 0.01);
        close(r.interestAvoidedToday, want.today, 0.01);
      });
    }
  }

  it('equals the nominal figure with no inflation, and sits between it and the end-date figure otherwise', () => {
    const flat = compare({ ...BASE, inflation: 0 }, { paths: 50, flat: true });
    close(flat.interestAvoidedToday, flat.interestAvoided, 1e-6);
    const r = compare({ ...BASE, inflation: 6 }, { paths: 50, flat: true });
    const atEnd = r.interestAvoided / Math.pow(1.06, r.months / 12);
    assert.ok(r.interestAvoidedToday < r.interestAvoided);
    assert.ok(r.interestAvoidedToday > atEnd);
    // The other way of counting, offered as the reader's choice, is exactly that end-date figure.
    close(r.interestAvoidedTodayAtEnd, atEnd, 1e-9);
    close(flat.interestAvoidedTodayAtEnd, flat.interestAvoided, 1e-6);
  });
});

describe('the debt rate in the rates sentence is what the debt costs over a year', () => {
  it('compounds a rate charged monthly: 6.5% is 6.70%, 24% is 26.82%', () => {
    close(effectiveAnnual(6.5), 6.6972, 1e-4);
    close(effectiveAnnual(24), 26.8242, 1e-4);
    assert.equal(effectiveAnnual(0), 0);
  });

  it('then removes inflation exactly: 6.5% at 2% is 4.61%, 24% at 2% is 24.34%', () => {
    close(rates(BASE).debtReal, 4.6051, 1e-4);
    close(rates({ ...BASE, debtRate: 24 }).debtReal, 24.3374, 1e-4);
    // Not the quoted rate less inflation, which would read 4.41% and 21.57%.
    assert.ok(rates(BASE).debtReal > toReal(6.5, 2));
  });
});

describe("the page's own run is pinned", () => {
  // Lesson 49's example at the path count and seed the page uses. A change to
  // the draw order, the tax base or the deflator moves these and must be meant.
  const r = compare(BASE);

  it('runs 10,000 paths with seed 49', () => {
    assert.equal(PATHS, 10_000);
    assert.equal(SEED, 49);
    assert.equal(r.paths, 10_000);
  });

  it('pays off in 33 months with the extra money, 52 without', () => {
    assert.equal(r.payoffMonthA, 33);
    assert.equal(r.payoffMonthB, 52);
    assert.equal(r.months, 33);
  });

  it('investing came out ahead in 54.16% of paths, by 106.09 at the median', () => {
    assert.equal(r.bAhead, 0.5416);
    close(r.diff.p50, 106.0864, 1e-3);
    close(r.diff.p10, -1007.6675, 1e-3);
    close(r.diff.p90, 1530.1816, 1e-3);
  });

  it('ends at 97.98 on the pay-off path and 204.07 at the median on the investing path', () => {
    close(r.a.p50, 97.98, 1e-3);
    assert.equal(r.a.p10, r.a.p90);
    close(r.b.p50, 204.0664, 1e-3);
    close(r.remainingB, 7101.895, 1e-3);
    close(r.interestAvoided, 605.3587, 1e-3);
  });
});

describe('a flat path matches hand arithmetic', () => {
  // A debt at 0%, so the schedule is plain subtraction: path A pays 2x a month
  // and invests nothing until the debt is gone; path B pays x and invests x.
  // With `flat`, every year grows at exactly the compound return.
  const flatCase = (over: Partial<Inputs>, balance: number, monthlyEach: number): Inputs => ({
    ...BASE,
    balance,
    debtRate: 0,
    payment: monthlyEach,
    extra: monthlyEach,
    inflation: 0,
    returns: 'own',
    ownReturn: 10,
    ...over,
  });
  /** What n payments of x come to when each month grows by g and the last payment earns nothing. */
  const saved = (x: number, n: number, g: number) => (g === 1 ? x * n : (x * (Math.pow(g, n) - 1)) / (g - 1));

  it('grows monthly contributions at the yearly return', () => {
    const r = compare(flatCase({}, 1200, 100), { paths: 1, flat: true });
    assert.equal(r.months, 6);
    assert.equal(r.remainingB, 600);
    assert.equal(r.a.p50, 0);
    const g = Math.pow(1.1, 1 / 12);
    close(r.b.p50, saved(100, 6, g) - 600, 1e-9);
  });

  it('a 1% fee turns each year\'s growth into 1.10 x 0.99', () => {
    const r = compare(flatCase({ feePct: 1 }, 1200, 100), { paths: 1, flat: true });
    const g = Math.pow(1.1 * 0.99, 1 / 12);
    close(r.b.p50, saved(100, 6, g) - 600, 1e-9);
    // Over whole years the factor is exactly (1.10 x 0.99)^n on money already in.
    close(Math.pow(g, 24), Math.pow(1.1 * 0.99, 2), 1e-12);
  });

  it('a 25% tax is charged on the gain only, never on what was put in', () => {
    const r = compare(flatCase({ gainsTax: 25 }, 1200, 100), { paths: 1, flat: true });
    const before = saved(100, 6, Math.pow(1.1, 1 / 12));
    const gain = before - 600;
    close(r.b.p50, before - 0.25 * gain - 600, 1e-9);
    // Tax on the whole balance would leave far less.
    assert.ok(r.b.p50 > before * 0.75 - 600 + 100);
  });

  it('no tax is charged on a loss', () => {
    const r = compare(flatCase({ gainsTax: 25, ownReturn: -10 }, 1200, 100), { paths: 1, flat: true });
    close(r.b.p50, saved(100, 6, Math.pow(0.9, 1 / 12)) - 600, 1e-9);
  });

  it('5% inflation over 60 months divides the result by 1.05^5', () => {
    // 6,000 at 0%, 50 + 50 a month: path A is done in 60 months.
    const nominalReturn = 10;
    const r = compare(flatCase({ inflation: 5, ownReturn: nominalReturn }, 6000, 50), { paths: 1, flat: true });
    assert.equal(r.months, 60);
    assert.equal(r.remainingB, 3000);
    const g = Math.pow(1.1, 1 / 12);
    close(r.b.p50, (saved(50, 60, g) - 3000) / Math.pow(1.05, 5), 1e-8);
  });

  it('fee, tax and inflation together: 7.90 on the six-month case', () => {
    const r = compare(flatCase({ feePct: 1, gainsTax: 25, inflation: 5 }, 1200, 100), { paths: 1, flat: true });
    const before = saved(100, 6, Math.pow(1.1 * 0.99, 1 / 12));
    close(r.b.p50, (before - 0.25 * (before - 600) - 600) / Math.pow(1.05, 0.5), 1e-9);
    close(r.b.p50, 7.9031, 1e-4);
  });
});

describe('inputs the page would reject still give numbers', () => {
  const finiteResult = (r: ReturnType<typeof compare>) => {
    for (const v of [r.a.p10, r.a.p50, r.a.p90, r.b.p10, r.b.p50, r.b.p90, r.diff.p10, r.diff.p50, r.diff.p90, r.bAhead, r.interestA, r.interestB, r.interestAvoided, r.interestAvoidedToday, r.interestAvoidedTodayAtEnd, r.remainingB]) {
      assert.ok(Number.isFinite(v), `not a number: ${v}`);
    }
  };

  it('a zero balance is refused by inputProblem, and compare gives zeros, never NaN', () => {
    assert.equal(inputProblem({ ...BASE, balance: 0 }), 'no-balance');
    const r = compare({ ...BASE, balance: 0 }, FAST);
    finiteResult(r);
    assert.equal(r.months, 0);
    assert.equal(r.remainingB, 0);
    assert.equal(r.b.p50, 0);
  });

  it('a payment that never pays the debt, and values that are not numbers, stay finite too', () => {
    finiteResult(compare({ ...BASE, payment: 1 }, { paths: 20 }));
    finiteResult(compare({ ...BASE, balance: NaN, debtRate: Infinity, inflation: NaN }, { paths: 20 }));
  });
});
