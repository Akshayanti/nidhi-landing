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
 * chance. Fees are a flat yearly percentage of the balance; taxes are not
 * modelled.
 *
 * Determinism
 * -----------
 * The generator is seeded, so the same inputs always give the same result.
 * That keeps share links reproducible and lets the tests pin exact numbers.
 */

export const STOCKS = { mean: 0.068, sd: 0.173 } as const;
export const BONDS = { mean: 0.023, sd: 0.112 } as const;
export const STOCK_BOND_CORRELATION = 0.2;

/**
 * Return settings. "historical" is the lognormal fitted to the world indices
 * above. "cautious" and "optimistic" keep exactly the same ups and downs
 * (the same log-space spread) but move the compound yearly return to the low
 * and high ends of the long-run range used across nidhi's articles: stocks
 * about 4 to 6% a year after inflation, bonds 1 to 3%.
 */
export type ReturnSetting = 'cautious' | 'historical' | 'optimistic';
export const RETURN_SETTINGS: readonly ReturnSetting[] = ['cautious', 'historical', 'optimistic'];
const COMPOUND_TARGETS: Record<Exclude<ReturnSetting, 'historical'>, { stocks: number; bonds: number }> = {
  cautious: { stocks: 0.04, bonds: 0.01 },
  optimistic: { stocks: 0.06, bonds: 0.03 },
};

/** Run counts the page offers. More runs settle the percentiles; past 100,000 nothing visible changes. */
export const RUN_OPTIONS = [100, 1_000, 10_000, 100_000] as const;
export const DEFAULT_PATHS = 10_000;
export const DEFAULT_SEED = 43;
/** Highest yearly fee the page accepts, in percent. */
export const MAX_FEE_PCT = 5;

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
  /** Yearly fees as a percent of the balance, taken off every year's return. */
  feePct: number;
  /** Which return assumptions to use. */
  returns: ReturnSetting;
  /** Number of simulated paths; the page offers RUN_OPTIONS. */
  paths: number;
}

export interface SimulationOptions {
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
   * Single line at the blended compound rate, after fees, with no ups and
   * downs: the kind of projection a simple calculator draws.
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

/** Log-space parameters for stocks and bonds under a return setting. */
export function returnModel(setting: ReturnSetting): { stocks: { mu: number; sigma: number }; bonds: { mu: number; sigma: number } } {
  const stocks = lognormalParams(STOCKS.mean, STOCKS.sd);
  const bonds = lognormalParams(BONDS.mean, BONDS.sd);
  if (setting === 'historical') return { stocks, bonds };
  const target = COMPOUND_TARGETS[setting];
  return {
    stocks: { mu: Math.log(1 + target.stocks), sigma: stocks.sigma },
    bonds: { mu: Math.log(1 + target.bonds), sigma: bonds.sigma },
  };
}

/** Compound yearly rates (before fees) for stocks and bonds under a setting. */
export function compoundRates(setting: ReturnSetting): { stocks: number; bonds: number } {
  const m = returnModel(setting);
  return { stocks: Math.exp(m.stocks.mu) - 1, bonds: Math.exp(m.bonds.mu) - 1 };
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
    feePct: Math.min(MAX_FEE_PCT, Math.max(0, finite(i.feePct, 0))),
    returns: RETURN_SETTINGS.includes(i.returns) ? i.returns : 'historical',
    // Any whole number up to the largest option; the page and share links
    // only ever pass one of RUN_OPTIONS (see url.ts).
    paths: Math.round(Math.min(RUN_OPTIONS[RUN_OPTIONS.length - 1], Math.max(1, finite(i.paths, DEFAULT_PATHS)))),
  };
}

/**
 * One year, month by month: money in (or out) at the start of each month,
 * then the month's share of the year's growth factor. Splitting the year's
 * gross return into twelve equal monthly factors matches the post 43 script.
 */
function stepYear(balance: number, growth: number, monthlyFlow: number): { balance: number; ranOut: boolean } {
  const monthly = Math.pow(growth, 1 / 12);
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

/**
 * Runs year by year across all paths, keeping only the current balance of
 * each path, so 100,000 paths over 120 years needs a few megabytes rather
 * than a full table of every path and year.
 *
 * Each path has its own generator state, seeded from its index, and draws
 * the same numbers in the same order whatever the plan length: switching
 * withdrawals on leaves the saving phase exactly as it was, and a path's
 * returns do not depend on how many other paths run.
 */
export function simulate(raw: SimulationInputs, options: SimulationOptions = {}): SimulationResult {
  const inputs = sanitizeInputs(raw);
  const paths = inputs.paths;
  const seed = options.seed ?? DEFAULT_SEED;
  const w = inputs.stockPct / 100;
  const keep = 1 - inputs.feePct / 100;
  const years = inputs.saveYears + inputs.withdrawYears;
  const { stocks: s, bonds: b } = returnModel(inputs.returns);
  const rho = STOCK_BOND_CORRELATION;
  const rhoC = Math.sqrt(1 - rho * rho);
  const monthlyOut = inputs.withdrawal / 12;

  // Per-path mulberry32 state, inlined for speed.
  const state = new Uint32Array(paths);
  for (let p = 0; p < paths; p++) state[p] = (Math.imul(seed, 0x9e3779b1) + p) >>> 0;
  const next = (p: number) => {
    const a = (state[p] + 0x6d2b79f5) >>> 0;
    state[p] = a;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Straight line: the blended compound rate after fees, with no volatility.
  const g = compoundRates(inputs.returns);
  const lineGrowth = (1 + w * g.stocks + (1 - w) * g.bonds) * keep;
  const straightLine = [inputs.start];
  let line = inputs.start;
  for (let y = 1; y <= years; y++) {
    const saving = y <= inputs.saveYears;
    if (line <= 0 && !saving) {
      straightLine.push(0);
      continue;
    }
    line = stepYear(line, lineGrowth, saving ? inputs.monthly : -monthlyOut).balance;
    straightLine.push(line);
  }

  const balance = new Float64Array(paths).fill(inputs.start);
  const runOutYear = new Int32Array(paths).fill(-1);
  const bands: Percentiles[] = [percentilesOf(balance)];
  let below = 0;
  if (inputs.saveYears === 0) for (let p = 0; p < paths; p++) if (balance[p] < straightLine[0]) below++;

  for (let y = 1; y <= years; y++) {
    const saving = y <= inputs.saveYears;
    for (let p = 0; p < paths; p++) {
      // Box-Muller, two uniforms per year per path.
      let u = 0;
      while (u === 0) u = next(p);
      const v = next(p);
      const r = Math.sqrt(-2 * Math.log(u));
      const z1 = r * Math.cos(2 * Math.PI * v);
      const z2 = r * Math.sin(2 * Math.PI * v);
      if (balance[p] <= 0 && !saving) continue;
      const stock = Math.exp(s.mu + s.sigma * z1);
      const bond = Math.exp(b.mu + b.sigma * (rho * z1 + rhoC * z2));
      const growth = (w * stock + (1 - w) * bond) * keep;
      const step = stepYear(balance[p], growth, saving ? inputs.monthly : -monthlyOut);
      balance[p] = step.balance;
      if (step.ranOut && !saving && runOutYear[p] < 0) runOutYear[p] = y - inputs.saveYears;
    }
    bands.push(percentilesOf(balance));
    if (y === inputs.saveYears) for (let p = 0; p < paths; p++) if (balance[p] < straightLine[y]) below++;
  }

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
