/**
 * URL-state codec for the Monte Carlo simulator.
 *
 * Follows the compact-URL convention in `src/utils/shared/compactUrl.ts`:
 * short keys, every field omitted when at its default.
 *
 *   c  currency           (default EUR)
 *   s  starting amount    (default 50000)
 *   m  monthly saving     (default 1000)
 *   y  years of saving    (default 30)
 *   k  stocks, percent    (default 80)
 *   w  yearly withdrawal  (default 0, meaning none)
 *   r  years withdrawing  (default 30; only written when w > 0)
 *   e  return setting     (c, h or o; default h, historical)
 *   f  yearly fees, %     (default 0)
 *   n  simulated paths    (default 10000)
 *
 * Unlike the other tools, this one does not keep the address bar in sync
 * while you type. The values only go into a URL when you copy a share link,
 * and then after the #, which browsers never send to a server. The page head
 * moves them out of the address bar into SHARED_STATE_GLOBAL before analytics
 * start, so they are not recorded with the pageview either.
 */
import { CURRENCIES, DEFAULT_CURRENCY } from '../loan/math.ts';
import { serializeParams, setNonDefault } from '../shared/compactUrl.ts';
import { DEFAULT_PATHS, RUN_OPTIONS, sanitizeInputs, type ReturnSetting, type SimulationInputs } from './math.ts';

export interface ToolState extends SimulationInputs {
  currency: string;
}

export const DEFAULTS: ToolState = {
  currency: DEFAULT_CURRENCY,
  start: 50_000,
  monthly: 1_000,
  saveYears: 30,
  stockPct: 80,
  withdrawal: 0,
  withdrawYears: 30,
  feePct: 0,
  returns: 'historical',
  paths: DEFAULT_PATHS,
};

const RETURN_CODES: Record<ReturnSetting, string> = { cautious: 'c', historical: 'h', optimistic: 'o' };
const RETURN_BY_CODE: Record<string, ReturnSetting> = { c: 'cautious', h: 'historical', o: 'optimistic' };

export const STATE_KEYS = ['c', 's', 'm', 'y', 'k', 'w', 'r', 'e', 'f', 'n'] as const;

/** Window property the page head script stores a shared fragment in. */
export const SHARED_STATE_GLOBAL = '__nidhiMonteCarloShared';

/** Matches one state parameter name, for ToolStateGuard. */
export const STATE_KEY_PATTERN = `[${STATE_KEYS.join('')}]`;

export function encodeState(state: ToolState): string {
  const p = new URLSearchParams();
  setNonDefault(p, 'c', state.currency, DEFAULTS.currency);
  setNonDefault(p, 's', state.start, DEFAULTS.start);
  setNonDefault(p, 'm', state.monthly, DEFAULTS.monthly);
  setNonDefault(p, 'y', state.saveYears, DEFAULTS.saveYears);
  setNonDefault(p, 'k', state.stockPct, DEFAULTS.stockPct);
  if (state.withdrawal > 0) {
    p.set('w', String(state.withdrawal));
    setNonDefault(p, 'r', state.withdrawYears, DEFAULTS.withdrawYears);
  }
  setNonDefault(p, 'e', RETURN_CODES[state.returns], RETURN_CODES[DEFAULTS.returns]);
  setNonDefault(p, 'f', state.feePct, DEFAULTS.feePct);
  setNonDefault(p, 'n', state.paths, DEFAULTS.paths);
  return serializeParams(p);
}

/** Decodes a query string; returns null when it carries no tool state. */
export function decodeState(search: string): ToolState | null {
  const p = new URLSearchParams(/^[?#]/.test(search) ? search.slice(1) : search);
  if (!STATE_KEYS.some((k) => p.has(k))) return null;
  const num = (key: string, dflt: number) => {
    const raw = p.get(key);
    if (raw === null || raw.trim() === '') return dflt;
    const n = Number(raw);
    return Number.isFinite(n) ? n : dflt;
  };
  const code = (p.get('c') ?? '').toUpperCase();
  const currency = CURRENCIES.some((c) => c.code === code) ? code : DEFAULTS.currency;
  const withdrawal = num('w', DEFAULTS.withdrawal);
  const clean = sanitizeInputs({
    start: num('s', DEFAULTS.start),
    monthly: num('m', DEFAULTS.monthly),
    saveYears: num('y', DEFAULTS.saveYears),
    stockPct: num('k', DEFAULTS.stockPct),
    withdrawal,
    withdrawYears: num('r', DEFAULTS.withdrawYears),
    feePct: num('f', DEFAULTS.feePct),
    returns: RETURN_BY_CODE[p.get('e') ?? ''] ?? DEFAULTS.returns,
    paths: num('n', DEFAULTS.paths),
  });
  // Keep the default withdrawal horizon in the form even when withdrawals are
  // off, so switching them on starts from a sensible value.
  return {
    currency,
    ...clean,
    withdrawYears: withdrawal > 0 ? clean.withdrawYears : DEFAULTS.withdrawYears,
    // Links only carry the run counts the page offers.
    paths: (RUN_OPTIONS as readonly number[]).includes(clean.paths) ? clean.paths : DEFAULTS.paths,
  };
}

