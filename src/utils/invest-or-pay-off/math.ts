/**
 * The invest or pay off calculator's engine. Browser-safe and dependency-free
 * apart from the Monte Carlo simulator's return model, which it shares so the
 * two tools can never disagree about what stocks have returned.
 *
 * What it compares
 * ----------------
 * One debt and one extra amount of money each month. Two paths, compared on
 * the same date:
 *
 *   A, pay off:  the extra money goes to the debt. Once the debt is paid, the
 *                old payment and the extra are invested every month.
 *   B, invest:   the debt runs its normal schedule and the extra money is
 *                invested. If the debt ends before the comparison date, its
 *                payment is invested from then on.
 *
 * Net wealth on the comparison date is what has been invested, less any tax
 * on gains, less any debt still owed. Both paths run on the same simulated
 * returns (paired), so the difference between them comes from the choice,
 * not from luck.
 *
 * Money in the engine is nominal; results are shown in today's money
 * ----------------------------------------------------------------------
 * A debt is charged at its own rate, in the money of the day, so the
 * schedules run in nominal terms. The investment is a diversified world stock
 * portfolio: its yearly returns come from the Monte Carlo simulator's model
 * (Dimson, Marsh and Staunton world equities, after inflation) and are turned
 * into nominal returns with the reader's inflation figure,
 * (1 + real) x (1 + inflation) - 1. At the end, every result is divided by
 * the inflation over the period to give today's money. Compounding is exact
 * throughout; nothing is ever "nominal minus inflation".
 *
 * Timing: interest is charged and payments made at the end of each month,
 * at a twelfth of the yearly rate; money invested in a month starts growing
 * the next month. Tax relief on the debt's interest, when the reader enters
 * one, is treated as cash back each month on the interest charged that month
 * and is invested in the same path. Tax on investment gains is taken once, on
 * the comparison date, on the gain above what was put in.
 *
 * Known limits, stated on the page: one debt, a fixed rate, no prepayment
 * fees, no employer match, a constant inflation figure, and the Monte Carlo
 * simulator's own limits (thin tails, independent years).
 */

import { STOCKS, lognormalParams, returnModel, type ReturnSetting } from '../monte-carlo/math.ts';
import { geometricAverage, type Series } from '../inflation/math.ts';

export type ReturnChoice = ReturnSetting | 'own';
export const RETURN_CHOICES: readonly ReturnChoice[] = ['cautious', 'historical', 'optimistic', 'own'];

export type Horizon = 'payoff' | 'plus5' | 'plus10';
export const HORIZONS: readonly Horizon[] = ['payoff', 'plus5', 'plus10'];
const HORIZON_EXTRA_MONTHS: Record<Horizon, number> = { payoff: 0, plus5: 60, plus10: 120 };

/** The top and bottom of the after-inflation range the model and the lessons use for world stocks. */
export const REAL_RETURN_TOP = 6;
export const REAL_RETURN_BOTTOM = 4;

/** Paths in every comparison: enough to settle the 10th and 90th percentiles. */
export const PATHS = 10_000;
export const SEED = 49;

/** Longest debt the page will schedule, in months (60 years). */
export const MAX_MONTHS = 720;
export const MAX_AMOUNT = 1e12;
export const MAX_DEBT_RATE = 10_000;
export const MAX_INFLATION = 10_000;
export const MAX_FEE_PCT = 5;

/**
 * The default inflation figure: the geometric average of the country's last
 * ten calendar years up to its latest figure, used only when at least five of
 * those ten have one and the latest is recent. `latestYear` is the newest
 * year in the whole data set, so a country whose figures stopped long ago
 * gets no default rather than a stale one.
 */
export const INFLATION_WINDOW = 10;
export const INFLATION_MIN_YEARS = 5;
export const INFLATION_MAX_AGE = 3;

export interface InflationDefault {
  /** Ten-year geometric average, percent a year. */
  average: number;
  first: number;
  last: number;
  /** Years in the window that have a figure. */
  count: number;
  /** Five-year geometric average up to the same year, for context; null when fewer than five figures. */
  fiveYear: number | null;
  /** The latest year's figure. */
  latest: number;
}

export function inflationDefault(series: Series, latestYear: number): InflationDefault | null {
  const years = Object.keys(series)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return null;
  const last = years[years.length - 1];
  if (latestYear - last > INFLATION_MAX_AGE) return null;
  const first = last - INFLATION_WINDOW + 1;
  const inWindow = years.filter((y) => y >= first);
  if (inWindow.length < INFLATION_MIN_YEARS) return null;
  const five = years.filter((y) => y > last - 5);
  return {
    average: geometricAverage(inWindow.map((y) => series[y])),
    first,
    last,
    count: inWindow.length,
    fiveYear: five.length === 5 ? geometricAverage(five.map((y) => series[y])) : null,
    latest: series[last],
  };
}

export interface Inputs {
  /** What is owed today. */
  balance: number;
  /** The debt's yearly rate, percent. */
  debtRate: number;
  /** The regular monthly payment. */
  payment: number;
  /** Extra money each month, the amount the reader is deciding about. */
  extra: number;
  /** The reader's own estimate of the relief on the interest, percent; 0 for none. */
  relief: number;
  /** Inflation, percent a year, held constant. */
  inflation: number;
  returns: ReturnChoice;
  /** The reader's own yearly return before inflation, percent; used when returns is 'own'. */
  ownReturn: number;
  /** Yearly fund fee, percent of the balance. */
  feePct: number;
  /** Tax on investment gains at the comparison date, percent; 0 for none. */
  gainsTax: number;
  horizon: Horizon;
}

export type InputProblem = 'no-balance' | 'payment-too-low' | 'too-long' | 'impossible-rate';

export interface Percentiles {
  p10: number;
  p50: number;
  p90: number;
}

export interface Result {
  /** Months until the debt is paid in each path, counted from today. */
  payoffMonthA: number;
  payoffMonthB: number;
  /** The comparison date, in months from today. */
  months: number;
  /** Net wealth on the comparison date, today's money. */
  a: Percentiles;
  b: Percentiles;
  /** The paired difference, B minus A, today's money. */
  diff: Percentiles;
  /** Share of paths in which B ended with higher net wealth (0 to 1). */
  bAhead: number;
  /** Interest charged, less relief, up to the comparison date. */
  interestA: number;
  interestB: number;
  /** Interest avoided in A, nominal and in today's money. */
  interestAvoided: number;
  interestAvoidedToday: number;
  /** Debt still owed in B on the comparison date, nominal. */
  remainingB: number;
  paths: number;
}

export interface Rates {
  /** The debt's rate after the reader's relief, percent. */
  debtAfterRelief: number;
  /** The same after inflation, exact, percent. */
  debtReal: number;
  /** The investment's compound yearly return after inflation, before fees, percent. */
  investReal: number;
  /** The same before inflation, percent. */
  investNominal: number;
}

export type ReturnNote = 'above-range' | 'below-zero' | null;

const finite = (n: number, d: number) => (Number.isFinite(n) ? n : d);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Clamps every input to what the page allows, so a hand-edited link cannot hang the browser. */
export function sanitizeInputs(i: Inputs): Inputs {
  return {
    balance: clamp(finite(i.balance, 0), 0, MAX_AMOUNT),
    debtRate: clamp(finite(i.debtRate, 0), 0, MAX_DEBT_RATE),
    payment: clamp(finite(i.payment, 0), 0, MAX_AMOUNT),
    extra: clamp(finite(i.extra, 0), 0, MAX_AMOUNT),
    relief: clamp(finite(i.relief, 0), 0, 100),
    inflation: clamp(finite(i.inflation, 0), -99.99, MAX_INFLATION),
    returns: RETURN_CHOICES.includes(i.returns) ? i.returns : 'historical',
    ownReturn: clamp(finite(i.ownReturn, 0), -99.99, MAX_INFLATION),
    feePct: clamp(finite(i.feePct, 0), 0, MAX_FEE_PCT),
    gainsTax: clamp(finite(i.gainsTax, 0), 0, 100),
    horizon: HORIZONS.includes(i.horizon) ? i.horizon : 'payoff',
  };
}

/** Exact real rate in percent: (1 + nominal) / (1 + inflation) - 1. */
export function toReal(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** Exact nominal rate in percent: (1 + real) x (1 + inflation) - 1. */
export function toNominal(realPct: number, inflationPct: number): number {
  return ((1 + realPct / 100) * (1 + inflationPct / 100) - 1) * 100;
}

/** Log-space parameters of the yearly real stock return for a choice. */
export function realReturnModel(returns: ReturnChoice, ownReturn: number, inflation: number): { mu: number; sigma: number } {
  if (returns !== 'own') return returnModel(returns).stocks;
  // The reader's figure moves the compound return and keeps the history's
  // ups and downs, as the cautious and optimistic settings do.
  const { sigma } = lognormalParams(STOCKS.mean, STOCKS.sd);
  return { mu: Math.log(1 + toReal(ownReturn, inflation) / 100), sigma };
}

export function rates(raw: Inputs): Rates {
  const i = sanitizeInputs(raw);
  const debtAfterRelief = i.debtRate * (1 - i.relief / 100);
  const investReal = (Math.exp(realReturnModel(i.returns, i.ownReturn, i.inflation).mu) - 1) * 100;
  return {
    debtAfterRelief,
    debtReal: toReal(debtAfterRelief, i.inflation),
    investReal,
    investNominal: toNominal(investReal, i.inflation),
  };
}

/**
 * The note under the reader's own return: strictly above the top of the
 * range used in the model and the lessons, or strictly below zero after
 * inflation. Exactly 0% keeps buying power before fees and taxes: no note.
 */
export function returnNote(raw: Inputs): ReturnNote {
  const i = sanitizeInputs(raw);
  if (i.returns !== 'own') return null;
  const real = toReal(i.ownReturn, i.inflation);
  if (real > REAL_RETURN_TOP + 1e-9) return 'above-range';
  if (real < -1e-9) return 'below-zero';
  return null;
}

export function inputProblem(raw: Inputs): InputProblem | null {
  if (!Number.isFinite(raw.inflation) || raw.inflation <= -100 || (raw.returns === 'own' && raw.ownReturn <= -100)) return 'impossible-rate';
  const i = sanitizeInputs(raw);
  if (i.balance <= 0) return 'no-balance';
  if (i.payment <= i.balance * (i.debtRate / 100 / 12)) return 'payment-too-low';
  if (schedule(i, 0).payoffMonth > MAX_MONTHS) return 'too-long';
  return null;
}

interface Schedule {
  /** Money going into the investment at the end of each month, index 0 is month 1. */
  invest: Float64Array;
  /** Debt owed at the end of each month. */
  owed: Float64Array;
  /** Interest charged each month, before relief. */
  interest: Float64Array;
  payoffMonth: number;
}

/**
 * One path's debt schedule over `months` months (or until paid when 0):
 * each month the interest is charged, then `payment + extraToDebt` is paid.
 * When the debt is cleared, what is left of that month's money and every
 * later month's goes to the investment, along with any extra not sent to the
 * debt and the relief on the month's interest.
 */
function schedule(i: Inputs, extraToDebt: number, months = 0, extraToInvest = 0): Schedule {
  const monthlyRate = i.debtRate / 100 / 12;
  const outgo = i.payment + extraToDebt;
  const cap = months > 0 ? months : MAX_MONTHS + 1;
  const invest = new Float64Array(cap);
  const owed = new Float64Array(cap);
  const interest = new Float64Array(cap);
  let debt = i.balance;
  let payoffMonth = 0;
  for (let m = 0; m < cap; m++) {
    if (debt > 0) {
      const charged = debt * monthlyRate;
      interest[m] = charged;
      debt += charged;
      const paid = Math.min(debt, outgo);
      debt -= paid;
      // Below a hundredth of a cent the debt is paid.
      if (debt < 1e-6) debt = 0;
      invest[m] = outgo - paid + extraToInvest + charged * (i.relief / 100);
      if (debt === 0) payoffMonth = m + 1;
    } else {
      invest[m] = outgo + extraToInvest;
    }
    owed[m] = debt;
    if (months === 0 && debt === 0) {
      return { invest: invest.subarray(0, m + 1), owed: owed.subarray(0, m + 1), interest: interest.subarray(0, m + 1), payoffMonth };
    }
  }
  return { invest, owed, interest, payoffMonth: payoffMonth || cap + 1 };
}

function percentile(sorted: Float64Array, q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function percentilesOf(values: Float64Array): Percentiles {
  const sorted = Float64Array.from(values).sort();
  return { p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9) };
}

/**
 * Runs the comparison. Call `inputProblem` first; this assumes the debt can
 * be paid within MAX_MONTHS.
 */
export function compare(raw: Inputs, options: { paths?: number; seed?: number; flat?: boolean } = {}): Result {
  const i = sanitizeInputs(raw);
  const paths = options.paths ?? PATHS;
  const seed = options.seed ?? SEED;

  const payoffMonthA = schedule(i, i.extra).payoffMonth;
  const payoffMonthB = schedule(i, 0).payoffMonth;
  const months = payoffMonthA + HORIZON_EXTRA_MONTHS[i.horizon];
  const A = schedule(i, i.extra, months);
  const B = schedule(i, 0, months, i.extra);

  const sum = (a: Float64Array) => a.reduce((s, v) => s + v, 0);
  const keepRelief = 1 - i.relief / 100;
  const interestA = sum(A.interest) * keepRelief;
  const interestB = sum(B.interest) * keepRelief;
  const remainingB = B.owed[months - 1];
  const putInA = sum(A.invest);
  const putInB = sum(B.invest);

  const deflate = Math.pow(1 + i.inflation / 100, months / 12);
  // `flat` removes the ups and downs (every year at the compound return), for exact checks.
  const model = realReturnModel(i.returns, i.ownReturn, i.inflation);
  const mu = model.mu;
  const sigma = options.flat ? 0 : model.sigma;
  const nominalFactor = 1 + i.inflation / 100;
  const keep = 1 - i.feePct / 100;
  const tax = i.gainsTax / 100;
  const years = Math.ceil(months / 12);

  const netA = new Float64Array(paths);
  const netB = new Float64Array(paths);
  const diff = new Float64Array(paths);
  let bAhead = 0;

  // Per-path mulberry32 state, as in the Monte Carlo simulator: each path
  // draws the same numbers whatever the inputs, so a change to the debt
  // moves the result only through the debt.
  for (let p = 0; p < paths; p++) {
    let a = (Math.imul(seed, 0x9e3779b1) + p) >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let balA = 0;
    let balB = 0;
    for (let y = 0; y < years; y++) {
      // Box-Muller, two uniforms a year so each year's draw stays aligned
      // with the Monte Carlo simulator's stock draw.
      let u = 0;
      while (u === 0) u = next();
      const v = next();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      const growth = Math.exp(mu + sigma * z) * nominalFactor * keep;
      const monthly = Math.pow(growth, 1 / 12);
      const end = Math.min(months, (y + 1) * 12);
      for (let m = y * 12; m < end; m++) {
        balA = balA * monthly + A.invest[m];
        balB = balB * monthly + B.invest[m];
      }
    }
    const afterTaxA = balA - tax * Math.max(0, balA - putInA);
    const afterTaxB = balB - tax * Math.max(0, balB - putInB);
    netA[p] = afterTaxA / deflate;
    netB[p] = (afterTaxB - remainingB) / deflate;
    diff[p] = netB[p] - netA[p];
    if (diff[p] > 0) bAhead++;
  }

  return {
    payoffMonthA,
    payoffMonthB,
    months,
    a: percentilesOf(netA),
    b: percentilesOf(netB),
    diff: percentilesOf(diff),
    bAhead: bAhead / paths,
    interestA,
    interestB,
    interestAvoided: interestB - interestA,
    interestAvoidedToday: (interestB - interestA) / deflate,
    remainingB,
    paths,
  };
}

/**
 * The comparison the page shows next to a reader's own return when it is
 * above the model's range: the same inputs with the cautious and optimistic
 * settings, so the reader's figure is never replaced, only set beside the
 * range.
 */
export function compareRange(raw: Inputs, options: { paths?: number; seed?: number } = {}): { cautious: Result; optimistic: Result } {
  return {
    cautious: compare({ ...raw, returns: 'cautious' }, options),
    optimistic: compare({ ...raw, returns: 'optimistic' }, options),
  };
}
