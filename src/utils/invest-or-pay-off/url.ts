/**
 * Share-link state codec for the invest or pay off calculator.
 *
 * Follows the compact-URL convention in `src/utils/shared/compactUrl.ts`:
 * short keys, every field omitted when at its default.
 *
 *   c  currency          (default EUR)
 *   b  debt balance      (default 18000)
 *   r  debt rate         (percent a year, default 6.5)
 *   p  monthly payment   (default 400)
 *   x  extra a month     (default 200)
 *   l  relief            (percent of the interest, default 0)
 *   n  country           (ISO3 code whose inflation is the default; default none)
 *   i  inflation         (percent a year; default: the country's figure)
 *   s  return choice     (c cautious, h historical, o optimistic, w own; default h)
 *   o  own return        (percent a year before inflation, default 7)
 *   f  fund fee          (percent a year, default 0)
 *   t  tax on gains      (percent, default 0)
 *   h  comparison date   (p payoff, 5 five years later, 0 ten years later; default 5)
 *
 * The tool never writes these into the address while you type (CLAUDE.md,
 * "Free Tools Keep Inputs Out of URLs"). They go into a link only when you
 * copy a share link, and then after the #, which browsers never send to a
 * server. ToolStateGuard moves them out of the address bar into
 * SHARED_STATE_GLOBAL before analytics start, and the island reads them from
 * there.
 *
 * A link with no `c` means EUR and a link with no `n` means no country on
 * every page, so a link reads the same in every language. A page's own
 * starting point (rupees and India on the Hindi page) applies only when no
 * state arrived; see `publishableState`.
 */
import { CURRENCIES, DEFAULT_CURRENCY } from '../loan/math.ts';
import { serializeParams, setNonDefault } from '../shared/compactUrl.ts';
import { MAX_AMOUNT, MAX_DEBT_RATE, MAX_FEE_PCT, MAX_INFLATION, type Horizon, type ReturnChoice } from './math.ts';

export interface ToolState {
  currency: string;
  balance: number;
  debtRate: number;
  payment: number;
  extra: number;
  relief: number;
  /** ISO3 code of the country whose inflation is the default, or '' for none. */
  country: string;
  /** The reader's own inflation figure, or null for the country's default. */
  inflation: number | null;
  returns: ReturnChoice;
  ownReturn: number;
  feePct: number;
  gainsTax: number;
  horizon: Horizon;
}

export const DEFAULTS: ToolState = {
  currency: DEFAULT_CURRENCY,
  balance: 18_000,
  debtRate: 6.5,
  payment: 400,
  extra: 200,
  relief: 0,
  country: '',
  inflation: null,
  returns: 'historical',
  ownReturn: 7,
  feePct: 0,
  gainsTax: 0,
  horizon: 'plus5',
};

const RETURN_CODES: Record<ReturnChoice, string> = { cautious: 'c', historical: 'h', optimistic: 'o', own: 'w' };
const RETURN_BY_CODE: Record<string, ReturnChoice> = { c: 'cautious', h: 'historical', o: 'optimistic', w: 'own' };
const HORIZON_CODES: Record<Horizon, string> = { payoff: 'p', plus5: '5', plus10: '0' };
const HORIZON_BY_CODE: Record<string, Horizon> = { p: 'payoff', '5': 'plus5', '0': 'plus10' };

export const STATE_KEYS = ['c', 'b', 'r', 'p', 'x', 'l', 'n', 'i', 's', 'o', 'f', 't', 'h'] as const;

/** Window property the page head script stores a shared fragment in. */
export const SHARED_STATE_GLOBAL = '__nidhiInvestOrPayOffShared';

/** Matches one state parameter name, for ToolStateGuard. */
export const STATE_KEY_PATTERN = `[${STATE_KEYS.join('')}]`;

/** Two decimals: what the page's fields carry. */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function encodeState(state: ToolState): string {
  const p = new URLSearchParams();
  setNonDefault(p, 'c', state.currency, DEFAULTS.currency);
  setNonDefault(p, 'b', state.balance, DEFAULTS.balance);
  setNonDefault(p, 'r', state.debtRate, DEFAULTS.debtRate);
  setNonDefault(p, 'p', state.payment, DEFAULTS.payment);
  setNonDefault(p, 'x', state.extra, DEFAULTS.extra);
  setNonDefault(p, 'l', state.relief, DEFAULTS.relief);
  setNonDefault(p, 'n', state.country, DEFAULTS.country);
  if (state.inflation !== null) p.set('i', String(state.inflation));
  setNonDefault(p, 's', RETURN_CODES[state.returns], RETURN_CODES[DEFAULTS.returns]);
  setNonDefault(p, 'o', state.ownReturn, DEFAULTS.ownReturn);
  setNonDefault(p, 'f', state.feePct, DEFAULTS.feePct);
  setNonDefault(p, 't', state.gainsTax, DEFAULTS.gainsTax);
  setNonDefault(p, 'h', HORIZON_CODES[state.horizon], HORIZON_CODES[DEFAULTS.horizon]);
  return serializeParams(p);
}

/** The untouched state for a page that starts in `currency`, with `country`'s inflation. */
export function defaultState(currency: string = DEFAULTS.currency, country: string = DEFAULTS.country): ToolState {
  return { ...DEFAULTS, currency, country };
}

/** Whether the state is still the page's untouched starting state, in its own currency and country. */
export function isPristineState(state: ToolState, pageCurrency: string, pageCountry = ''): boolean {
  return (
    state.currency === pageCurrency &&
    state.country === pageCountry &&
    encodeState({ ...state, currency: DEFAULTS.currency, country: DEFAULTS.country }) === ''
  );
}

/**
 * What the tool publishes for the language switch, and what a share link
 * carries: nothing while it is untouched, so the other page opens with its
 * own starting currency and country, and the encoded state once anything
 * changed.
 */
export function publishableState(state: ToolState, pageCurrency: string, pageCountry = ''): string {
  if (isPristineState(state, pageCurrency, pageCountry)) return '';
  // The defaults in euros with no country, picked on a page that starts
  // elsewhere, encode as ''; name the currency so the other page does not
  // read '' as "use your own".
  return encodeState(state) || `c=${state.currency}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Decodes a query string or fragment; returns null when it carries no tool state. */
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
  const country = (p.get('n') ?? '').toUpperCase();
  const inflationRaw = p.get('i');
  const inflation = inflationRaw !== null && inflationRaw.trim() !== '' && Number.isFinite(Number(inflationRaw))
    ? round2(clamp(Number(inflationRaw), -99.99, MAX_INFLATION))
    : null;
  return {
    currency: CURRENCIES.some((c) => c.code === code) ? code : DEFAULTS.currency,
    balance: clamp(num('b', DEFAULTS.balance), 0, MAX_AMOUNT),
    debtRate: round2(clamp(num('r', DEFAULTS.debtRate), 0, MAX_DEBT_RATE)),
    payment: clamp(num('p', DEFAULTS.payment), 0, MAX_AMOUNT),
    extra: clamp(num('x', DEFAULTS.extra), 0, MAX_AMOUNT),
    relief: round2(clamp(num('l', DEFAULTS.relief), 0, 100)),
    country: /^[A-Z]{3}$/.test(country) ? country : DEFAULTS.country,
    inflation,
    returns: RETURN_BY_CODE[p.get('s') ?? ''] ?? DEFAULTS.returns,
    ownReturn: round2(clamp(num('o', DEFAULTS.ownReturn), -99.99, MAX_INFLATION)),
    feePct: round2(clamp(num('f', DEFAULTS.feePct), 0, MAX_FEE_PCT)),
    gainsTax: round2(clamp(num('t', DEFAULTS.gainsTax), 0, 100)),
    horizon: HORIZON_BY_CODE[p.get('h') ?? ''] ?? DEFAULTS.horizon,
  };
}
