/**
 * The calculator's form, and what of it a link or the language switch carries.
 *
 * Built from the form as it stands, not from the last state that could be
 * calculated: that state kept the last good number for a bad box, and lost
 * every choice made while one was bad (#789).
 */
import { boxValue, readBoxes, withBoxes } from '../shared/formBoxes.ts';
import { UNREADABLE } from '../shared/linkInput.ts';
import { displayNumber, formatForInput } from '../shared/parseLocaleNumber.ts';
import { MAX_GROWTH, MAX_RATE, MIN_GROWTH, MIN_RATE, parseAmount, parsePercent, parseYears, type Mode } from './math.ts';
import { DEFAULTS, decodeState, encodeState, publishableState, type ToolState } from './url.ts';

export interface FormState {
  mode: Mode;
  currency: string;
  amount: string;
  rate: string;
  years: string;
  growth: string;
  country: string;
  /** '' means the default starting year for the country. */
  from: string;
}

const BOX_KEYS = { amount: 'a', rate: 'r', years: 'y', growth: 'g' } as const;

export type BoxField = keyof typeof BOX_KEYS;

const FIELDS = Object.keys(BOX_KEYS) as BoxField[];

export function toForm(s: ToolState, locale: string): FormState {
  return {
    mode: s.mode,
    currency: s.currency,
    amount: formatForInput(s.amount, locale),
    rate: formatForInput(s.rate, locale),
    years: String(s.years),
    growth: formatForInput(s.growth, locale),
    country: s.country,
    from: s.from === null ? '' : String(s.from),
  };
}

function parseBox(field: BoxField, text: string, locale: string): number | null {
  switch (field) {
    case 'amount': return parseAmount(text, locale);
    case 'rate': return parsePercent(text, MIN_RATE, MAX_RATE, locale);
    case 'years': return parseYears(text);
    case 'growth': return parsePercent(text, MIN_GROWTH, MAX_GROWTH, locale);
  }
}

/** The form as a state, keeping `prev`'s value for any field that does not parse. */
export function toState(f: FormState, prev: ToolState, locale: string): ToolState {
  return {
    mode: f.mode,
    currency: f.currency,
    amount: parseBox('amount', f.amount, locale) ?? prev.amount,
    rate: parseBox('rate', f.rate, locale) ?? prev.rate,
    years: parseBox('years', f.years, locale) ?? prev.years,
    growth: parseBox('growth', f.growth, locale) ?? prev.growth,
    country: f.country,
    from: f.from === '' ? null : Number(f.from),
  };
}

/** Which boxes are wrong, on the page or not: the component knows which are shown. */
export function boxErrors(f: FormState, locale: string): Record<BoxField, boolean> {
  const bad = (field: BoxField) => parseBox(field, f[field], locale) === null;
  return { amount: bad('amount'), rate: bad('rate'), years: bad('years'), growth: bad('growth') };
}

/**
 * A bad box as a link has it. A number only if it is still bad read plainly:
 * years typed in Devanagari digits are an error here, and as "12" would
 * arrive as a valid answer.
 */
function carriedBox(field: BoxField, text: string, locale: string): string {
  const value = boxValue(text, locale);
  return value !== '' && parseBox(field, value, 'en') !== null ? UNREADABLE : value;
}

/**
 * What the language switch carries: the form as it stands. A bad box goes
 * with it even where the question does not show it, since the next one might.
 */
export function publishableForm(f: FormState, locale: string, pageCurrency: string, pageCountry: string): string {
  const state = toState(f, DEFAULTS, locale);
  const errors = boxErrors(f, locale);
  const bad = FIELDS.filter((field) => errors[field]);
  if (bad.length === 0) return publishableState(state, pageCurrency, pageCountry);
  return withBoxes(encodeState(state), Object.fromEntries(bad.map((field) => [BOX_KEYS[field], carriedBox(field, f[field], locale)])));
}

/** The form a link opens on `locale`'s page, or null when it carries no state. */
export function formFromLink(search: string, locale: string): FormState | null {
  const decoded = decodeState(search);
  if (!decoded) return null;
  const form = toForm(decoded, locale);
  const boxes = readBoxes(search, Object.values(BOX_KEYS));
  for (const field of FIELDS) {
    const value = boxes[BOX_KEYS[field]];
    if (value !== undefined) form[field] = displayNumber(value, locale);
  }
  return form;
}
