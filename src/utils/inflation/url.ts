/**
 * Share-link state codec for the inflation calculator.
 *
 * Follows the compact-URL convention in `src/utils/shared/compactUrl.ts`:
 * short keys, every field omitted when at its default.
 *
 *   m  question        (b buy, c cost, p past, k keeping up; default b)
 *   c  currency        (default EUR)
 *   a  amount          (default 10000)
 *   r  inflation rate  (percent a year, default 3)
 *   y  years           (default 10)
 *   g  raise or return (percent a year, default 5)
 *   n  country         (ISO3 code of the history shown; default none)
 *   f  from year       (past to today with a country; default: ten years
 *                       before the latest year with data)
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
import { MAX_AMOUNT, MAX_GROWTH, MAX_RATE, MAX_YEARS, MIN_GROWTH, MIN_RATE, MIN_YEARS, round2, type Mode } from './math.ts';

export interface ToolState {
  mode: Mode;
  currency: string;
  amount: number;
  rate: number;
  years: number;
  growth: number;
  /** ISO3 code of the country whose history is shown, or '' for none. */
  country: string;
  /** The starting year for past to today with a country, or null for the default. */
  from: number | null;
}

export const DEFAULTS: ToolState = {
  mode: 'buy',
  currency: DEFAULT_CURRENCY,
  amount: 10_000,
  rate: 3,
  years: 10,
  growth: 5,
  country: '',
  from: null,
};

const MODE_CODES: Record<Mode, string> = { buy: 'b', cost: 'c', past: 'p', keep: 'k' };
const MODE_BY_CODE: Record<string, Mode> = { b: 'buy', c: 'cost', p: 'past', k: 'keep' };

export const STATE_KEYS = ['m', 'c', 'a', 'r', 'y', 'g', 'n', 'f'] as const;

/** Window property the page head script stores a shared fragment in. */
export const SHARED_STATE_GLOBAL = '__nidhiInflationShared';

/** Matches one state parameter name, for ToolStateGuard. */
export const STATE_KEY_PATTERN = `[${STATE_KEYS.join('')}]`;

export function encodeState(state: ToolState): string {
  const p = new URLSearchParams();
  setNonDefault(p, 'm', MODE_CODES[state.mode], MODE_CODES[DEFAULTS.mode]);
  setNonDefault(p, 'c', state.currency, DEFAULTS.currency);
  setNonDefault(p, 'a', state.amount, DEFAULTS.amount);
  setNonDefault(p, 'r', state.rate, DEFAULTS.rate);
  setNonDefault(p, 'y', state.years, DEFAULTS.years);
  setNonDefault(p, 'g', state.growth, DEFAULTS.growth);
  setNonDefault(p, 'n', state.country, DEFAULTS.country);
  if (state.from !== null) p.set('f', String(state.from));
  return serializeParams(p);
}

/** The untouched state for a page that starts in `currency`, showing `country`'s history. */
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
  const fromRaw = p.get('f');
  const from = fromRaw !== null && /^\d{4}$/.test(fromRaw) ? Number(fromRaw) : null;
  return {
    mode: MODE_BY_CODE[p.get('m') ?? ''] ?? DEFAULTS.mode,
    currency: CURRENCIES.some((c) => c.code === code) ? code : DEFAULTS.currency,
    amount: clamp(num('a', DEFAULTS.amount), 0, MAX_AMOUNT),
    rate: round2(clamp(num('r', DEFAULTS.rate), MIN_RATE, MAX_RATE)),
    years: Math.round(clamp(num('y', DEFAULTS.years), MIN_YEARS, MAX_YEARS)),
    growth: round2(clamp(num('g', DEFAULTS.growth), MIN_GROWTH, MAX_GROWTH)),
    country: /^[A-Z]{3}$/.test(country) ? country : DEFAULTS.country,
    from,
  };
}
