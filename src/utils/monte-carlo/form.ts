/**
 * The simulator's form, and what of it a link or the language switch carries.
 *
 * The form keeps its boxes as strings, so one can be empty or wrong while it
 * is typed in. What is carried is built from the form as it stands, not from
 * the last plan that could be simulated: that plan kept the last good number
 * for a bad box, and lost every choice made while one was bad (#789).
 */
import { boxValue, readBoxes, withBoxes } from '../shared/formBoxes.ts';
import { UNREADABLE } from '../shared/linkInput.ts';
import { isValidNumber, tooLongForLink } from './inputs.ts';
import { MAX_FEE_PCT, MAX_MONTHLY, MAX_START, MAX_WITHDRAWAL, type ReturnSetting } from './math.ts';
import { DEFAULTS, decodeState, encodeState, publishableState, type ToolState } from './url.ts';

export interface FormState {
  currency: string;
  start: string;
  monthly: string;
  saveYears: string;
  stockPct: string;
  withdrawOn: boolean;
  withdrawal: string;
  withdrawYears: string;
  feePct: string;
  returns: ReturnSetting;
  paths: number;
}

const BOX_KEYS = {
  start: 's',
  monthly: 'm',
  saveYears: 'y',
  stockPct: 'k',
  withdrawal: 'w',
  withdrawYears: 'r',
  feePct: 'f',
} as const;

export type BoxField = keyof typeof BOX_KEYS;

/** Beside a withdrawal amount carried while withdrawals are off: that they are. */
const OFF_KEY = 'o';

const FIELDS = Object.keys(BOX_KEYS) as BoxField[];

/** What the withdrawal box holds before anyone types in it. */
const DEFAULT_WITHDRAWAL = 30_000;

export function toForm(s: ToolState): FormState {
  return {
    currency: s.currency,
    start: String(s.start),
    monthly: String(s.monthly),
    saveYears: String(s.saveYears),
    stockPct: String(s.stockPct),
    withdrawOn: s.withdrawal > 0,
    withdrawal: String(s.withdrawal > 0 ? s.withdrawal : DEFAULT_WITHDRAWAL),
    withdrawYears: String(s.withdrawYears),
    feePct: String(s.feePct),
    returns: s.returns,
    paths: s.paths,
  };
}

/** The years of withdrawing are wrong, whether or not the box is on the page. */
function badWithdrawYears(f: FormState): boolean {
  return !isValidNumber(f.withdrawYears, 1, 60, true);
}

/** The plan to simulate. Only for a form without errors. */
export function toState(f: FormState): ToolState {
  // An empty or blank box is 0 to Number(), as the plan wants it.
  return {
    currency: f.currency,
    start: Number(f.start),
    monthly: Number(f.monthly),
    saveYears: Number(f.saveYears),
    stockPct: Number(f.stockPct),
    withdrawal: f.withdrawOn ? Number(f.withdrawal) : 0,
    // Off the page, the box may hold anything; the plan still needs a number.
    withdrawYears: !f.withdrawOn && badWithdrawYears(f) ? DEFAULTS.withdrawYears : Number(f.withdrawYears),
    feePct: Number(f.feePct),
    returns: f.returns,
    paths: f.paths,
  };
}

/** Which boxes are wrong. The withdrawal boxes are on the page only with withdrawals on. */
export function formErrors(f: FormState): Record<BoxField, boolean> {
  return {
    start: !isValidNumber(f.start, 0, MAX_START),
    monthly: !isValidNumber(f.monthly, 0, MAX_MONTHLY),
    saveYears: !isValidNumber(f.saveYears, 0, 60, true),
    stockPct: !isValidNumber(f.stockPct, 0, 100),
    withdrawal: f.withdrawOn && !isValidNumber(f.withdrawal, 1, MAX_WITHDRAWAL),
    withdrawYears: f.withdrawOn && !isValidNumber(f.withdrawYears, 1, 60, true),
    feePct: !isValidNumber(f.feePct, 0, MAX_FEE_PCT),
  };
}

/**
 * The withdrawal boxes that differ from where they start. With withdrawals
 * off the plan holds neither, so they are carried beside it; with them on,
 * the plan already holds both as the boxes do, and carrying them changes nothing.
 */
function rememberedBoxes(f: FormState): BoxField[] {
  const untouched = { withdrawal: DEFAULT_WITHDRAWAL, withdrawYears: DEFAULTS.withdrawYears };
  return (['withdrawal', 'withdrawYears'] as const).filter((field) => f[field] !== String(untouched[field]));
}

/** What the language switch carries: the form as it stands, every choice and every box. */
export function publishableForm(f: FormState, pageCurrency: string): string {
  // The withdrawal boxes go along with withdrawals off too: switched on again
  // where they arrive, a bad one must still be wrong.
  const errors = formErrors({ ...f, withdrawOn: true });
  const bad = FIELDS.filter((field) => errors[field]);
  const carried = [...new Set([...bad, ...rememberedBoxes(f)])];
  if (carried.length === 0) return publishableState(toState(f), pageCurrency);

  // The choices and the good boxes as a valid plan, the bad boxes written over it.
  const valid = { ...f };
  for (const field of bad) valid[field] = String(field === 'withdrawal' ? DEFAULT_WITHDRAWAL : DEFAULTS[field]);
  // A box refused for its length goes as the marker: written shorter, it would arrive valid.
  const box = (field: BoxField) => (tooLongForLink(f[field]) ? UNREADABLE : boxValue(f[field], 'en'));
  const boxes: Record<string, string> = Object.fromEntries(carried.map((field) => [BOX_KEYS[field], box(field)]));
  if (!f.withdrawOn && boxes[BOX_KEYS.withdrawal] !== undefined) boxes[OFF_KEY] = '1';
  return withBoxes(encodeState(toState(valid)), boxes);
}

/**
 * The plan a link's page shows: the plan its boxes give when every box can be
 * read, so the result always matches what the boxes say; the plan the link
 * decodes to, kept finite, when a box is in error.
 */
export function openedPlan(form: FormState, decoded: ToolState): ToolState {
  return Object.values(formErrors(form)).some(Boolean) ? decoded : toState(form);
}

/** The form a link opens, or null when it carries no plan. */
export function formFromLink(search: string): FormState | null {
  const decoded = decodeState(search);
  if (!decoded) return null;
  const form = toForm(decoded);
  const boxes = readBoxes(search, Object.values(BOX_KEYS));
  for (const field of FIELDS) {
    const value = boxes[BOX_KEYS[field]];
    if (value !== undefined) form[field] = value;
  }
  // A link names a withdrawal only when withdrawals are on, unless it says they are off.
  if (boxes[BOX_KEYS.withdrawal] !== undefined) form.withdrawOn = readBoxes(search, [OFF_KEY])[OFF_KEY] !== '1';
  return form;
}
