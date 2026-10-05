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
 *
 * Unlike the other tools, this one does not keep the address bar in sync
 * while you type. The values only go into a URL when you copy a share link,
 * and then after the #, which browsers never send to a server. The page head
 * moves them out of the address bar into SHARED_STATE_GLOBAL before analytics
 * start, so they are not recorded with the pageview either.
 */
import { CURRENCIES, DEFAULT_CURRENCY } from '../loan/math.ts';
import { serializeParams, setNonDefault } from '../shared/compactUrl.ts';
import { sanitizeInputs, type SimulationInputs } from './math.ts';

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
};

export const STATE_KEYS = ['c', 's', 'm', 'y', 'k', 'w', 'r'] as const;

/** Window property the page head script stores a shared fragment in. */
export const SHARED_STATE_GLOBAL = '__nidhiMonteCarloShared';

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
  });
  // Keep the default withdrawal horizon in the form even when withdrawals are
  // off, so switching them on starts from a sensible value.
  return { currency, ...clean, withdrawYears: withdrawal > 0 ? clean.withdrawYears : DEFAULTS.withdrawYears };
}

