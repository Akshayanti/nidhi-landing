/**
 * The comparison's form, and what of it a link or the language switch carries.
 *
 * Built from the form as it stands, not from the last state that could be
 * compared: that state kept the last good number for a bad box, and lost
 * every choice made while one was bad (#789).
 */
import { parseAmount, parsePercent } from '../inflation/math.ts';
import { boxValue, readBoxes, withBoxes } from '../shared/formBoxes.ts';
import { UNREADABLE } from '../shared/linkInput.ts';
import { displayNumber, formatForInput } from '../shared/parseLocaleNumber.ts';
import { MAX_DEBT_RATE, MAX_FEE_PCT, MAX_INFLATION, type Horizon, type ReturnChoice, type TodayBasis } from './math.ts';
import { DEFAULTS, decodeState, encodeState, publishableState, type ToolState } from './url.ts';

const BOX_KEYS = {
  balance: 'b',
  debtRate: 'r',
  payment: 'p',
  extra: 'x',
  relief: 'l',
  inflation: 'i',
  ownReturn: 'o',
  feePct: 'f',
  gainsTax: 't',
} as const;

export type TextKey = keyof typeof BOX_KEYS;

export const BOX_FIELDS = Object.keys(BOX_KEYS) as TextKey[];

export interface FormState extends Record<TextKey, string> {
  currency: string;
  country: string;
  returns: ReturnChoice;
  horizon: Horizon;
  todayAt: TodayBasis;
}

export function toForm(s: ToolState, locale: string): FormState {
  const f = (n: number) => formatForInput(n, locale);
  return {
    currency: s.currency,
    country: s.country,
    returns: s.returns,
    horizon: s.horizon,
    todayAt: s.todayAt,
    balance: f(s.balance),
    debtRate: f(s.debtRate),
    payment: f(s.payment),
    extra: f(s.extra),
    relief: f(s.relief),
    inflation: s.inflation === null ? '' : f(s.inflation),
    ownReturn: f(s.ownReturn),
    feePct: f(s.feePct),
    gainsTax: f(s.gainsTax),
  };
}

const PERCENT_LIMITS: Record<'debtRate' | 'relief' | 'inflation' | 'ownReturn' | 'feePct' | 'gainsTax', [number, number]> = {
  debtRate: [0, MAX_DEBT_RATE],
  relief: [0, 100],
  inflation: [-99.99, MAX_INFLATION],
  ownReturn: [-99.99, MAX_INFLATION],
  feePct: [0, MAX_FEE_PCT],
  gainsTax: [0, 100],
};

export function parseField(key: TextKey, raw: string, locale: string): number | null {
  if (key === 'balance' || key === 'payment' || key === 'extra') return parseAmount(raw, locale);
  const [min, max] = PERCENT_LIMITS[key];
  return parsePercent(raw, min, max, locale);
}

/** Which boxes are wrong, on the page or not. An empty inflation box means "the country's figure". */
export function boxErrors(f: FormState, locale: string): Partial<Record<TextKey, boolean>> {
  const out: Partial<Record<TextKey, boolean>> = {};
  for (const key of BOX_FIELDS) {
    if (key === 'inflation' && f.inflation.trim() === '') continue;
    if (parseField(key, f[key], locale) === null) out[key] = true;
  }
  return out;
}

/** The wrong boxes that are in use: the reader's own return is, only when it is the one chosen. */
export function fieldErrors(f: FormState, locale: string): Partial<Record<TextKey, boolean>> {
  const out = boxErrors(f, locale);
  if (f.returns !== 'own') delete out.ownReturn;
  return out;
}

/** The form as a state, keeping `prev`'s value for any field that does not parse. */
export function toState(f: FormState, prev: ToolState, locale: string): ToolState {
  const n = (k: TextKey, d: number) => parseField(k, f[k], locale) ?? d;
  return {
    currency: f.currency,
    country: f.country,
    returns: f.returns,
    horizon: f.horizon,
    todayAt: f.todayAt,
    balance: n('balance', prev.balance),
    debtRate: n('debtRate', prev.debtRate),
    payment: n('payment', prev.payment),
    extra: n('extra', prev.extra),
    relief: n('relief', prev.relief),
    inflation: f.inflation.trim() === '' ? null : n('inflation', prev.inflation ?? 0),
    ownReturn: n('ownReturn', prev.ownReturn),
    feePct: n('feePct', prev.feePct),
    gainsTax: n('gainsTax', prev.gainsTax),
  };
}

/** A bad box as a link has it: a number only if it is still bad read plainly. */
function carriedBox(key: TextKey, text: string, locale: string): string {
  const value = boxValue(text, locale);
  return value !== '' && parseField(key, value, 'en') !== null ? UNREADABLE : value;
}

/**
 * What the language switch carries: the form as it stands. A bad box goes
 * with it even where the choice made does not use it, since the next one might.
 */
export function publishableForm(f: FormState, locale: string, pageCurrency: string, pageCountry: string): string {
  const state = toState(f, DEFAULTS, locale);
  const errors = boxErrors(f, locale);
  const bad = BOX_FIELDS.filter((key) => errors[key]);
  if (bad.length === 0) return publishableState(state, pageCurrency, pageCountry);
  return withBoxes(encodeState(state), Object.fromEntries(bad.map((key) => [BOX_KEYS[key], carriedBox(key, f[key], locale)])));
}

/** The form a link opens on `locale`'s page, or null when it carries no state. */
export function formFromLink(search: string, locale: string): FormState | null {
  const decoded = decodeState(search);
  if (!decoded) return null;
  const form = toForm(decoded, locale);
  const boxes = readBoxes(search, Object.values(BOX_KEYS));
  for (const key of BOX_FIELDS) {
    const value = boxes[BOX_KEYS[key]];
    if (value !== undefined) form[key] = displayNumber(value, locale);
  }
  return form;
}
