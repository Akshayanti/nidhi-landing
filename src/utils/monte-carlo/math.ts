/**
 * Monte Carlo engine for the free Monte Carlo simulator.
 *
 * What it models
 * --------------
 * One portfolio, in one currency, in today's money (every return is a real
 * return, after inflation). Each simulated year draws a stock return and a
 * bond return, blends them at the chosen mix (rebalanced every year), and
 * applies them month by month while contributions go in or withdrawals come
 * out. Thousands of such paths give a spread of outcomes, not one answer.
 *
 * Where the numbers come from
 * ---------------------------
 * Yearly real returns are drawn from a lognormal distribution whose
 * arithmetic mean and standard deviation match the Dimson-Marsh-Staunton
 * world indices, 1900 to 2025, as reprinted in Exponential Wealth: Centuries
 * of Stock and Bond Returns (CFA Institute Research Foundation, 2026):
 *
 *   - World equities (Exhibit 11.3): arithmetic mean 6.8%, standard deviation
 *     17.3%, geometric mean 5.3%.
 *   - World bonds (Exhibit 11.5): arithmetic mean 2.3%, standard deviation
 *     11.2%, geometric mean 1.7%.
 *
 * Only these published summary statistics are used; no historical series is
 * shipped. A lognormal fitted to them gives geometric means of about 5.4%
 * and 1.7%, close to the published 5.3% and 1.7% (see math.test.ts).
 *
 * Stock and bond draws are correlated at 0.2, the level around which the US
 * stock-bond correlation centred before about 1926 (Exponential Wealth,
 * Exhibit 10.4). Since then it has swung widely, both positive and negative,
 * so this is a modelling choice, stated on the page.
 *
 * Known limits (stated on the page too): a lognormal has thinner tails than
 * history (the world index's worst year was -42.9% in 2008), and each year
 * is drawn independently, so runs of bad years are not more likely than
 * chance. Fees and taxes are not modelled.
 *
 * Determinism
 * -----------
 * The generator is seeded, so the same inputs always give the same result.
 * That keeps share links reproducible and lets the tests pin exact numbers.
 */

export const STOCKS = { mean: 0.068, sd: 0.173 } as const;
export const BONDS = { mean: 0.023, sd: 0.112 } as const;
export const STOCK_BOND_CORRELATION = 0.2;

export const DEFAULT_PATHS = 10_000;
export const DEFAULT_SEED = 43;

export interface SimulationInputs {
  /** Amount invested today, in major units of the chosen currency. */
  start: number;
  /** Added at the start of every month while saving. */
  monthly: number;
  /** Years of saving before withdrawals start (0 means withdraw from today). */
  saveYears: number;
  /** Share of the portfolio in stocks, 0 to 100. The rest is in bonds. */
  stockPct: number;
  /** Yearly withdrawal in today's money, taken monthly. 0 means none. */
  withdrawal: number;
  /** Years of withdrawals after the saving phase. Ignored when withdrawal is 0. */
  withdrawYears: number;
}

export interface SimulationOptions {
  paths?: number;
  seed?: number;
}

export interface Percentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SimulationResult {
  /** Years simulated in total (saving plus withdrawing). */
  years: number;
  /** Percentiles of the balance at the end of each year; index 0 is today. */
  bands: Percentiles[];
  /**
   * Single line at the blended geometric mean, with no ups and downs: the
   * kind of projection a simple calculator draws.
   */
  straightLine: number[];
  /** Percentiles of the balance at the end of the saving phase. */
  atRetirement: Percentiles;
  /** Share of paths that ended the saving phase below the straight line. */
  belowStraightLine: number;
  /**
   * Withdrawal phase only: share of paths that paid every withdrawal in
   * full, and for the paths that did not, the median year in which they
   * ran out (counted from the start of withdrawals, rounded).
   */
  lasted: number | null;
  medianRunOutYear: number | null;
  paths: number;
}

// ---------------------------------------------------------------------------
// Random numbers
// ---------------------------------------------------------------------------

/** mulberry32: small, fast, seedable; plenty for a simulation of this size. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal pair via Box-Muller. */
function normalPair(rand: () => number): [number, number] {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  const r = Math.sqrt(-2 * Math.log(u));
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
}

/** Log-space parameters of a lognormal gross return with the given arithmetic mean and sd. */
export function lognormalParams(mean: number, sd: number): { mu: number; sigma: number } {
  const gross = 1 + mean;
  const sigma2 = Math.log(1 + (sd * sd) / (gross * gross));
  return { mu: Math.log(gross) - sigma2 / 2, sigma: Math.sqrt(sigma2) };
}

/** Geometric mean (compound yearly rate) implied by a lognormal fit. */
export function impliedGeometricMean(mean: number, sd: number): number {
  return Math.exp(lognormalParams(mean, sd).mu) - 1;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

function percentile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function percentilesOf(values: Float64Array): Percentiles {
  const sorted = Float64Array.from(values).sort();
  return {
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

/** Clamp inputs to the ranges the page allows, so a hand-edited link cannot hang the browser. */
export function sanitizeInputs(i: SimulationInputs): SimulationInputs {
  const finite = (n: number, d: number) => (Number.isFinite(n) ? n : d);
  const withdrawal = Math.max(0, finite(i.withdrawal, 0));
  return {
    start: Math.max(0, finite(i.start, 0)),
    monthly: Math.max(0, finite(i.monthly, 0)),
    saveYears: Math.round(Math.min(60, Math.max(0, finite(i.saveYears, 0)))),
    stockPct: Math.round(Math.min(100, Math.max(0, finite(i.stockPct, 0)))),
    withdrawal,
    withdrawYears: withdrawal > 0 ? Math.round(Math.min(60, Math.max(1, finite(i.withdrawYears, 1)))) : 0,
  };
}

/**
 * One month of a year: money in (or out) at the start of the month, then
 * the month's share of the year's return. Splitting the year's gross return
 * into twelve equal monthly factors matches the post 43 script.
 */
function stepYear(balance: number, yearlyReturn: number, monthlyFlow: number): { balance: number; ranOut: boolean } {
  const monthly = Math.pow(1 + yearlyReturn, 1 / 12);
  let b = balance;
  for (let m = 0; m < 12; m++) {
    b += monthlyFlow;
    // Exactly zero means this month's withdrawal was paid in full; below
    // zero means it could not be.
    if (b < 0) return { balance: 0, ranOut: true };
    b *= monthly;
  }
  return { balance: b, ranOut: false };
}

export function simulate(raw: SimulationInputs, options: SimulationOptions = {}): SimulationResult {
  const inputs = sanitizeInputs(raw);
  const paths = options.paths ?? DEFAULT_PATHS;
  const seed = options.seed ?? DEFAULT_SEED;
  const w = inputs.stockPct / 100;
  const years = inputs.saveYears + inputs.withdrawYears;
  const s = lognormalParams(STOCKS.mean, STOCKS.sd);
  const b = lognormalParams(BONDS.mean, BONDS.sd);
  const rho = STOCK_BOND_CORRELATION;
  const rhoC = Math.sqrt(1 - rho * rho);
  const monthlyOut = inputs.withdrawal / 12;

  // balances[year][path]
  const balances: Float64Array[] = Array.from({ length: years + 1 }, () => new Float64Array(paths));
  const runOutYear = new Int32Array(paths).fill(-1);

  for (let p = 0; p < paths; p++) {
    // One generator per path, so a path's year-by-year returns do not depend
    // on how many years are simulated: switching withdrawals on leaves the
    // saving phase exactly as it was.
    const rand = mulberry32((Math.imul(seed, 0x9e3779b1) + p) >>> 0);
    let bal = inputs.start;
    balances[0][p] = bal;
    for (let y = 1; y <= years; y++) {
      const [z1, z2] = normalPair(rand);
      const stock = Math.exp(s.mu + s.sigma * z1) - 1;
      const bond = Math.exp(b.mu + b.sigma * (rho * z1 + rhoC * z2)) - 1;
      const r = w * stock + (1 - w) * bond;
      const saving = y <= inputs.saveYears;
      if (bal <= 0 && !saving) {
        balances[y][p] = 0;
        continue;
      }
      const step = stepYear(bal, r, saving ? inputs.monthly : -monthlyOut);
      bal = step.balance;
      if (step.ranOut && !saving && runOutYear[p] < 0) runOutYear[p] = y - inputs.saveYears;
      balances[y][p] = bal;
    }
  }

  const bands = balances.map(percentilesOf);

  // Straight line: the blended compound rate with no volatility.
  const gS = impliedGeometricMean(STOCKS.mean, STOCKS.sd);
  const gB = impliedGeometricMean(BONDS.mean, BONDS.sd);
  const g = w * gS + (1 - w) * gB;
  const straightLine = [inputs.start];
  let line = inputs.start;
  for (let y = 1; y <= years; y++) {
    const saving = y <= inputs.saveYears;
    if (line <= 0 && !saving) {
      straightLine.push(0);
      continue;
    }
    line = stepYear(line, g, saving ? inputs.monthly : -monthlyOut).balance;
    straightLine.push(line);
  }

  const retireRow = balances[inputs.saveYears];
  const lineAtRetirement = straightLine[inputs.saveYears];
  let below = 0;
  for (let p = 0; p < paths; p++) if (retireRow[p] < lineAtRetirement) below++;

  let lasted: number | null = null;
  let medianRunOutYear: number | null = null;
  if (inputs.withdrawYears > 0) {
    const ranOut: number[] = [];
    for (let p = 0; p < paths; p++) if (runOutYear[p] > 0) ranOut.push(runOutYear[p]);
    lasted = 1 - ranOut.length / paths;
    if (ranOut.length > 0) {
      medianRunOutYear = Math.round(percentile(Float64Array.from(ranOut).sort(), 0.5));
    }
  }

  return {
    years,
    bands,
    straightLine,
    atRetirement: bands[inputs.saveYears],
    belowStraightLine: inputs.saveYears > 0 ? below / paths : 0,
    lasted,
    medianRunOutYear,
    paths,
  };
}
