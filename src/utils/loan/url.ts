/**
 * URL-state codec for the loan comparison tool.
 *
 * Wire format (compact)
 * ---------------------
 * The codec follows the project-wide compact-URL convention defined in
 * `src/utils/shared/compactUrl.ts`. Short keys + tuple-packed records keep
 * share URLs ~50% shorter than the previous per-field key layout.
 *
 * Per-vendor simple tuple `v{i}=name~principal~rate~mode~term~payment~fee~extra`:
 *   - position 0: name
 *   - position 1: principal
 *   - position 2: annualRatePct
 *   - position 3: modeKind ('term' default → empty in tuple, restored on decode)
 *   - position 4: termMonths
 *   - position 5: monthlyPayment
 *   - position 6: feeMajor
 *   - position 7: extraMonthly
 *   Empty fields stay empty (decode falls back to the slot template default
 *   for any field the URL did not specify); trailing defaults are dropped
 *   by `encodeTuple`.
 *
 * Per-vendor advanced fields (only emitted when they differ from the
 * inactive default in `ADVANCED_DEFAULTS`):
 *   - `v{i}_rk` rateKind             (default 'fixed')
 *   - `v{i}_if` initialFixedMonths   (default '60')
 *   - `v{i}_sr` subsequentRatePct    (default '')
 *   - `v{i}_rc` rateChangeKeeps      (default 'term'; written as `p` for 'payment')
 *   - `v{i}_pc` pointsCostMajor      (default '0')
 *   - `v{i}_pr` pointsRateReductionPct (default '0')
 *   - `v{i}_ls` lumpSumsEncoded      (default '')
 *   - `v{i}_pp` prepayPenaltyPct     (default '0')
 *   - `v{i}_pu` prepayPenaltyUntilMonth (default '0')
 *
 * Global scalars:
 *   - `c=EUR`     currency (omit at default 'EUR')
 *   - `ac=n|e`    no longer written or read: older links carried an APR convention here. It stays in
 *                 `STATE_KEY_PATTERN` so the guard still takes it out of the address.
 *   - `n=3`       vendor count (omit at default 2)
 *   - `t=horizon` active tab (omit at default 'charts')
 *   - `h=120`     horizon months
 *   - `rv` `ra` `rr` `rt` `rf` `rl`: refinance scenario fields
 *
 * The envelope (#820)
 * -------------------
 * Every link the tool writes is the state above inside an envelope,
 * `f=2&<state>&z=<check>` (`src/utils/shared/checkedLink.ts`), so a link that
 * arrives cut short or altered is refused whole and never filled with the
 * example values. A state with no `f` is a link written before the envelope
 * and is read exactly as it always was. Accepted limit: a link cut so that no
 * `f` survives, and any older link that was cut, cannot be told from an older
 * link that arrived whole, and is read as one.
 *
 * Hard cutover: the previous `cur=`, `v{i}_principal=`-style keys are NOT
 * decoded. The tool is new (no shared URLs in the wild) and v5.2 of the
 * free-tools plan documents the rationale for skipping the alias layer.
 */

import { CURRENCIES, DEFAULT_CURRENCY, MAX_TERM_MONTHS } from './math.ts';
import { CHECK_KEY, FORMAT_KEY, openState, sealState } from '../shared/checkedLink.ts';
import { decodeTuple, encodeTuple, serializeParams, setNonDefault } from '../shared/compactUrl.ts';
import { UNREADABLE, fitsLinkNumber, linkCurrency, linkLumpSums, linkName, linkNumber, linkWholeNumber } from '../shared/linkInput.ts';
import { canonicalNumber, displayNumber } from '../shared/parseLocaleNumber.ts';

/**
 * Where a shared link's state lives. Links carry it after the #, which
 * browsers never send to a server; ToolStateGuard in the page head moves it
 * (or an older ?-style link's state) out of the address bar into this window
 * property before analytics start, and the component reads it from there.
 * The tool never writes inputs into the address while you type.
 */
export const SHARED_STATE_GLOBAL = '__nidhiLoanCompareShared';

/** Matches one state parameter name, for ToolStateGuard: the envelope's two keys, then the state's own. */
export const STATE_KEY_PATTERN = `${FORMAT_KEY}|${CHECK_KEY}|c|n|t|h|ac|rv|ra|rr|rt|rf|rl|v\\d+(?:_[a-z]{2})?`;

/** The format of the links the tool writes now: the state inside an envelope with a check (#820). */
export const LINK_FORMAT = '2';

export type ModeKind = 'term' | 'payment';
export type RateKind = 'fixed' | 'hybrid';
/** What stays the same when a changing rate changes: the term (a new payment is worked out) or the payment (the term moves). */
export type RateChangeKeeps = 'term' | 'payment';

export interface VendorInput {
  name: string;
  principal: string;
  annualRatePct: string;
  modeKind: ModeKind;
  termMonths: string;
  monthlyPayment: string;
  feeMajor: string;
  extraMonthly: string;

  // Advanced-mode fields. Always present on the in-memory shape so React state has a stable type,
  // but only serialized into the URL when they differ from their inactive defaults.

  rateKind: RateKind;
  /** Number of months the initial rate is in effect. Defaults to '60' (the common 5-year fixed window). */
  initialFixedMonths: string;
  /** Rate that takes over after the fixed window, as a percent string. Defaults empty. */
  subsequentRatePct: string;
  /** What the lender keeps when the rate changes. A choice, never a typed value. */
  rateChangeKeeps: RateChangeKeeps;
  /** Cost of discount points, in major units. Expected to be folded into `feeMajor`;
   *  kept separately so we can reconstruct the no-points baseline for break-even analysis. */
  pointsCostMajor: string;
  /** Rate reduction the points purchased, in percentage points. Defaults to '0'. */
  pointsRateReductionPct: string;
  /** Semicolon-separated `month:amount` pairs (amount in major units). Defaults to ''. */
  lumpSumsEncoded: string;
  /** Penalty as a percent of the remaining balance at early payoff. Defaults to '0' (no penalty). */
  prepayPenaltyPct: string;
  /** Last month at which a prepayment penalty applies. '0' means no penalty. */
  prepayPenaltyUntilMonth: string;
}

/** Parsed lump-sum entry. */
export interface LumpSumEntry {
  month: number;
  amountMajor: number;
}

export type AnalysisTab = 'charts' | 'horizon' | 'refi' | 'how';

/** Shape of the global, non-per-vendor state. There is no "simple vs.
 *  advanced" mode: every field on a vendor card is visible at all times.
 *  Required fields are marked in the UI, optional fields are grouped by
 *  purpose (costs, prepayments, penalty) so users can see what knobs
 *  exist without toggling anything on. */
export interface GlobalState {
  /** All vendors in a comparison share one currency so the delta table is apples-to-apples. */
  currency: string;
  /** Persisted in the URL so a share link lands the recipient on the same view the sender was looking at. */
  activeTab: AnalysisTab;
  /** Horizon (in months) for the equity-snapshot section. */
  horizonMonths: string;
  /** Index (1-based) of the vendor selected for the refinance scenario. '0' means "none selected". */
  refiVendorIndex: string;
  refiAtMonth: string;
  refiNewRatePct: string;
  refiNewTermMonths: string;
  refiNewFeeMajor: string;
  refiRollFee: boolean;
}

// A comparator with one row isn't a comparison; below 2 the delta table
// and "lowest cost" badge become meaningless. The upper bound of 5 keeps
// the grid legible on a typical desktop and bounds the URL length when
// sharing.
export const MIN_VENDORS = 2;
export const MAX_VENDORS = 5;

export const VENDOR_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

// Defaults for the advanced fields. Pulled out so the encoder can omit
// any field that matches its default and the decoder can populate any
// field the URL did not specify. These are the canonical "field is
// inactive" values; deviating from any of them flips the field to "in
// use" for serialization purposes.
const ADVANCED_DEFAULTS = {
  rateKind: 'fixed' as RateKind,
  initialFixedMonths: '60',
  subsequentRatePct: '',
  rateChangeKeeps: 'term' as RateChangeKeeps,
  pointsCostMajor: '0',
  pointsRateReductionPct: '0',
  lumpSumsEncoded: '',
  prepayPenaltyPct: '0',
  prepayPenaltyUntilMonth: '0',
};

// Wire-key suffixes for advanced fields. Two-letter abbreviations save
// ~6 bytes per emitted field versus the long names. Order doesn't matter
// for URLSearchParams; we list the pairs together so adding a new
// advanced field is a one-place change.
const ADVANCED_KEY_MAP: Array<{ field: keyof typeof ADVANCED_DEFAULTS; key: string }> = [
  { field: 'rateKind', key: 'rk' },
  { field: 'initialFixedMonths', key: 'if' },
  { field: 'subsequentRatePct', key: 'sr' },
  { field: 'rateChangeKeeps', key: 'rc' },
  { field: 'pointsCostMajor', key: 'pc' },
  { field: 'pointsRateReductionPct', key: 'pr' },
  { field: 'lumpSumsEncoded', key: 'ls' },
  { field: 'prepayPenaltyPct', key: 'pp' },
  { field: 'prepayPenaltyUntilMonth', key: 'pu' },
];

// Per-slot starter values for the simple-mode fields. Slots 3-5 use
// sensible-but-distinct rates so a freshly-added vendor doesn't duplicate
// an existing one and the chart immediately shows a difference.
type SimpleVendor = Omit<
  VendorInput,
  | 'name'
  | 'rateKind'
  | 'initialFixedMonths'
  | 'subsequentRatePct'
  | 'rateChangeKeeps'
  | 'pointsCostMajor'
  | 'pointsRateReductionPct'
  | 'lumpSumsEncoded'
  | 'prepayPenaltyPct'
  | 'prepayPenaltyUntilMonth'
>;

export const VENDOR_TEMPLATES: ReadonlyArray<SimpleVendor> = [
  { principal: '250000', annualRatePct: '6.5',  modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '0',    extraMonthly: '0' },
  { principal: '250000', annualRatePct: '6.0',  modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '2500', extraMonthly: '0' },
  { principal: '250000', annualRatePct: '5.75', modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '4000', extraMonthly: '0' },
  { principal: '250000', annualRatePct: '5.5',  modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '5000', extraMonthly: '0' },
  { principal: '250000', annualRatePct: '5.25', modeKind: 'term', termMonths: '360', monthlyPayment: '', feeMajor: '6000', extraMonthly: '0' },
];

export function makeDefaultVendor(index: number): VendorInput {
  // Clamp out-of-range indices to the last available template/label
  // rather than throwing. This keeps callers (e.g. URL decode with a
  // hostile `n=999`) from blowing up on bad input. They should still
  // get a sensible vendor object back, and a separate clamp on `count`
  // is responsible for cutting the array to length.
  const safeIdx = Math.max(0, Math.min(index, MAX_VENDORS - 1));
  const tmpl = VENDOR_TEMPLATES[safeIdx];
  const label = VENDOR_LABELS[safeIdx];
  return {
    name: `Vendor ${label}`,
    ...tmpl,
    ...ADVANCED_DEFAULTS,
  };
}

/**
 * The vendor the "Add" button creates: the slot's starting amount, rate and
 * term, with every optional box empty. A fee sitting in a folded row would
 * change the result without the reader having typed it. The slot templates
 * themselves cannot lose their fees: share links leave out a value that
 * equals its slot's template, so older links depend on them. The page's
 * starting example is made the same way.
 */
export function makeAddedVendor(index: number): VendorInput {
  return { ...makeDefaultVendor(index), feeMajor: '0', extraMonthly: '0', ...ADVANCED_DEFAULTS };
}

/**
 * The example a fresh page opens with. Its optional boxes are empty, like an
 * added vendor's: the second offer used to open with a fee in a folded row.
 * A share link is still read against `makeDefaultVendor`, so links made
 * before this keep the fee they were made with.
 */
export const DEFAULT_VENDORS: VendorInput[] = Array.from(
  { length: MIN_VENDORS },
  (_, i) => makeAddedVendor(i),
);

export const DEFAULT_GLOBAL_STATE: GlobalState = {
  currency: DEFAULT_CURRENCY,
  activeTab: 'charts',
  horizonMonths: '60',
  refiVendorIndex: '1',
  refiAtMonth: '36',
  refiNewRatePct: '4.0',
  refiNewTermMonths: '360',
  refiNewFeeMajor: '0',
  refiRollFee: false,
};

// Tuple-position constants for the simple-mode fields. Documented as a
// single source of truth so encode and decode can never drift apart on
// field order.
const SIMPLE_FIELD_COUNT = 8;
const V_IDX = {
  NAME: 0,
  PRINCIPAL: 1,
  ANNUAL_RATE_PCT: 2,
  MODE_KIND: 3,
  TERM_MONTHS: 4,
  MONTHLY_PAYMENT: 5,
  FEE_MAJOR: 6,
  EXTRA_MONTHLY: 7,
} as const;

// ---------------------------------------------------------------------------
// Lump-sum encoding helpers
// ---------------------------------------------------------------------------

/**
 * One written pair, read. A month is a whole one, from 1 to the last the
 * tool counts: "12.5:5000" used to be read as month 12, and "1300:5000" was
 * read and then never paid, since no schedule runs past month 1,200 (#796).
 * Such a pair reads as numbers but names no month of a loan, which is
 * `'month'`; one that does not read at all is `null`.
 */
function readLumpSum(pair: string): LumpSumEntry | 'month' | null {
  const trimmed = pair.trim();
  const colon = trimmed.indexOf(':');
  if (colon <= 0) return null;
  // `Number` leaves out the spaces around each side, and reads an empty amount as 0, which is no amount.
  const month = Number(trimmed.slice(0, colon));
  const amount = Number(trimmed.slice(colon + 1));
  if (!Number.isFinite(month) || !Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isInteger(month) || month < 1 || month > MAX_TERM_MONTHS) return 'month';
  return { month, amountMajor: amount };
}

/** The pairs that are written: an empty one (a last ";", spaces) is nothing typed. */
const writtenPairs = (encoded: string) => encoded.split(';').filter((pair) => pair.trim() !== '');

/**
 * The pairs that read, in the format "12:5000;36:3000". A pair that does not
 * read is left out, and the page counts the pairs against what was written,
 * so a box with one left out is an error (`unreadableOptionalFields`), never
 * a smaller list used without a word.
 */
export function parseLumpSums(encoded: string): LumpSumEntry[] {
  return writtenPairs(encoded).flatMap((pair) => {
    const read = readLumpSum(pair);
    return read === null || read === 'month' ? [] : [read];
  });
}

/**
 * What is wrong with the lump-sum box, if anything. A pair that does not read
 * comes first: `'unreadable'` whenever there is one. `'month'` is a box whose
 * pairs all read as numbers, with a month among them that is not a whole one
 * from 1 to 1,200, which has a message of its own.
 */
export function lumpSumFault(encoded: string): 'unreadable' | 'month' | null {
  const read = writtenPairs(encoded).map(readLumpSum);
  if (read.includes(null)) return 'unreadable';
  return read.includes('month') ? 'month' : null;
}

/**
 * The lump-sum box's text as the plain "12:5000;36:3000" the tool keeps, with
 * each amount read the way the page writes numbers ("12:5.000,50" on a Spanish
 * page). A side that does not read is the marker, never the text typed: kept
 * as typed it was read again with other rules, and "12.:150.000" on the Czech
 * page became 150 (#789).
 */
export function canonicalLumpSums(raw: string, locale: string): string {
  return raw
    .split(';')
    .map((pair) => {
      if (pair.trim() === '') return '';
      const sides = pair.split(':');
      if (sides.length !== 2) return UNREADABLE;
      return sides.map((side) => canonicalNumber(side, locale) || UNREADABLE).join(':');
    })
    .join(';');
}

/** The tool's "12:5000;36:3000" as the page writes numbers: "12:5000,5" on a Spanish page. */
export function displayLumpSums(value: string, locale: string): string {
  return value
    .split(';')
    .map((pair) => {
      const colon = pair.indexOf(':');
      if (colon < 0) return displayNumber(pair, locale);
      const month = pair.slice(0, colon);
      return `${month === UNREADABLE ? displayNumber(month, locale) : month}:${displayNumber(pair.slice(colon + 1), locale)}`;
    })
    .join(';');
}

/** Returns '' for an empty list so the encoder can drop the key entirely. */
export function encodeLumpSums(entries: LumpSumEntry[]): string {
  const parts: string[] = [];
  for (const e of entries) {
    if (!Number.isFinite(e.month) || e.month < 1) continue;
    if (!Number.isFinite(e.amountMajor) || e.amountMajor <= 0) continue;
    parts.push(`${Math.floor(e.month)}:${e.amountMajor}`);
  }
  return parts.join(';');
}

// ---------------------------------------------------------------------------
// Per-vendor encode / decode
// ---------------------------------------------------------------------------

/**
 * What a link writes for a box the reader emptied, where the box has a
 * default that is not empty. An empty position in a link means "not given:
 * use the default", which is how short links and old links work; so a box
 * emptied on purpose (offer B's 2,500 fee, cleared) needs a mark of its
 * own, or the person who opens the link gets the default back and sees a
 * different comparison from the one that was shared. A lone hyphen is not
 * a number anyone means, and it is within what a link may carry.
 */
const CLEARED = '-';

/**
 * `value` as the link writes it: the mark when it was emptied and its default
 * is not empty. A box holds a plain number or the marker, so that is all a
 * link is written with. Anything else can only have come in with a link from
 * before the check, which was read leniently ("1,2,3", "+5"), and is written
 * as the marker: the link's own reader takes nothing else (#821).
 */
function written(value: string, dflt: string): string {
  if (value === '') return dflt === '' ? '' : CLEARED;
  return fitsLinkNumber(value) ? value : UNREADABLE;
}

/** A lump-sum list as the link writes it: each side a number as the site writes one, or the marker. */
function writtenLumpSums(text: string): string {
  const list = linkLumpSums(text, '');
  if (list === '') return '';
  return list
    .split(';')
    .map((pair) => pair.split(':').map((side) => (fitsLinkNumber(side) ? side : UNREADABLE)).join(':'))
    .join(';');
}

/** Whether a checked link's value is what `written` writes: a number as the site writes one, or one of the two marks. */
const fits = (value: string) => value === CLEARED || value === UNREADABLE || fitsLinkNumber(value);

/** The same for a lump-sum list: the mark of an emptied box, or pairs as `writtenLumpSums` writes them. */
function lumpSumsFit(value: string): boolean {
  if (value === CLEARED) return true;
  return value.split(';').every((pair) => {
    if (pair === UNREADABLE) return true;
    const sides = pair.split(':');
    return sides.length === 2 && sides.every((side) => side === UNREADABLE || fitsLinkNumber(side));
  });
}

/** What a link's value says about a box: emptied on purpose, or the value itself. */
function read(value: string | null, fallback: string): string {
  return value === CLEARED ? '' : linkNumber(value, fallback);
}

function encodeVendorTuple(v: VendorInput, slotIndex: number): string {
  const dflt = makeDefaultVendor(slotIndex);
  // Build the simple-mode tuple. Each position is the field's string value,
  // with the omit-when-default behaviour (substitute '' for fields that
  // match a stable single-valued default: currently just modeKind).
  // Stryker disable next-line ArrayDeclaration,StringLiteral: equivalent. Every one of the eight positions is assigned below, so the starting array and its fill are never read.
  const fields = new Array<string>(SIMPLE_FIELD_COUNT).fill('');
  fields[V_IDX.NAME] = v.name;
  fields[V_IDX.PRINCIPAL] = written(v.principal, dflt.principal);
  fields[V_IDX.ANNUAL_RATE_PCT] = written(v.annualRatePct, dflt.annualRatePct);
  // modeKind: 'term' is the default. Substituting '' here lets the
  // tuple's trailing-trim drop it for the most common case.
  fields[V_IDX.MODE_KIND] = v.modeKind === 'term' ? '' : v.modeKind;
  fields[V_IDX.TERM_MONTHS] = written(v.termMonths, dflt.termMonths);
  fields[V_IDX.MONTHLY_PAYMENT] = written(v.monthlyPayment, dflt.monthlyPayment);
  fields[V_IDX.FEE_MAJOR] = written(v.feeMajor, dflt.feeMajor);
  fields[V_IDX.EXTRA_MONTHLY] = written(v.extraMonthly, dflt.extraMonthly);
  return encodeTuple(fields);
}

function decodeVendorTuple(packed: string, slotIndex: number): VendorInput {
  // Start from the slot's template defaults so any tuple field the URL
  // omitted (or trimmed as a trailing default) falls back gracefully.
  const next = makeDefaultVendor(slotIndex);
  const fields = decodeTuple(packed, SIMPLE_FIELD_COUNT);

  // Each field overrides the slot template only when it carries data.
  // An empty slot in the tuple = "field unset, use template default":
  // the same semantics the previous wire format had via missing keys.
  // A link's values are whoever wrote the link's: a name is cut to an
  // ordinary length, and a number that does not read as one is dropped
  // (see linkInput.ts).
  const name = linkName(fields[V_IDX.NAME]);
  if (name !== '') next.name = name;
  if (fields[V_IDX.PRINCIPAL] !== '') next.principal = read(fields[V_IDX.PRINCIPAL], next.principal);
  if (fields[V_IDX.ANNUAL_RATE_PCT] !== '') next.annualRatePct = read(fields[V_IDX.ANNUAL_RATE_PCT], next.annualRatePct);

  // modeKind: any unknown value coerces to 'term' so a malformed share
  // link can never put the UI into an unexpected state.
  // Stryker disable next-line StringLiteral: equivalent. Every slot template's mode is 'term', and an empty position reads as 'term', so an empty mode lands on the same value either way.
  if (fields[V_IDX.MODE_KIND] !== '') {
    next.modeKind = fields[V_IDX.MODE_KIND] === 'payment' ? 'payment' : 'term';
  }

  if (fields[V_IDX.TERM_MONTHS] !== '') next.termMonths = read(fields[V_IDX.TERM_MONTHS], next.termMonths);
  if (fields[V_IDX.MONTHLY_PAYMENT] !== '') next.monthlyPayment = read(fields[V_IDX.MONTHLY_PAYMENT], next.monthlyPayment);
  if (fields[V_IDX.FEE_MAJOR] !== '') next.feeMajor = read(fields[V_IDX.FEE_MAJOR], next.feeMajor);
  if (fields[V_IDX.EXTRA_MONTHLY] !== '') next.extraMonthly = read(fields[V_IDX.EXTRA_MONTHLY], next.extraMonthly);

  return next;
}

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

/**
 * Only emits keys that differ from their defaults so a fresh comparison still produces a compact URL.
 */
export function encodeToQueryString(vendors: VendorInput[], global: GlobalState): string {
  const params = new URLSearchParams();

  // Global scalars first.
  setNonDefault(params, 'c', global.currency, DEFAULT_CURRENCY);
  setNonDefault(params, 'n', vendors.length, MIN_VENDORS);
  setNonDefault(params, 't', global.activeTab, DEFAULT_GLOBAL_STATE.activeTab);
  setNonDefault(params, 'h', written(global.horizonMonths, DEFAULT_GLOBAL_STATE.horizonMonths), DEFAULT_GLOBAL_STATE.horizonMonths);
  setNonDefault(params, 'rv', global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
  setNonDefault(params, 'ra', written(global.refiAtMonth, DEFAULT_GLOBAL_STATE.refiAtMonth), DEFAULT_GLOBAL_STATE.refiAtMonth);
  setNonDefault(params, 'rr', written(global.refiNewRatePct, DEFAULT_GLOBAL_STATE.refiNewRatePct), DEFAULT_GLOBAL_STATE.refiNewRatePct);
  setNonDefault(params, 'rt', written(global.refiNewTermMonths, DEFAULT_GLOBAL_STATE.refiNewTermMonths), DEFAULT_GLOBAL_STATE.refiNewTermMonths);
  setNonDefault(params, 'rf', written(global.refiNewFeeMajor, DEFAULT_GLOBAL_STATE.refiNewFeeMajor), DEFAULT_GLOBAL_STATE.refiNewFeeMajor);
  if (global.refiRollFee) params.set('rl', '1');

  // Per-vendor tuples + advanced overrides.
  vendors.forEach((v, i) => {
    const idx = i + 1;
    const packed = encodeVendorTuple(v, i);
    if (packed !== '') params.set(`v${idx}`, packed);
    for (const { field, key } of ADVANCED_KEY_MAP) {
      const value = v[field];
      const dflt = ADVANCED_DEFAULTS[field];
      // Two skip conditions:
      //   - empty string (field not in use)
      //   - matches the inactive default (no semantic difference)
      if (value === dflt) continue;
      // An emptied box whose default is not empty is written as the mark.
      // Stryker disable next-line StringLiteral: equivalent. An empty value with an empty default is skipped by `value === dflt` above, and an empty rate kind writes nothing below, so no link changes whichever text is compared.
      if (value === '' && (field === 'rateKind' || dflt === '')) continue;
      if (field === 'rateChangeKeeps') {
        params.set(`v${idx}_${key}`, 'p');
        continue;
      }
      const text = String(value);
      const out =
        field === 'rateKind' ? text
        : field === 'lumpSumsEncoded' ? writtenLumpSums(text)
        : written(text, String(dflt));
      if (out !== '') params.set(`v${idx}_${key}`, out);
    }
  });

  return serializeParams(params);
}

/** The untouched global state for a page whose tools start in `currency`. */
export function defaultGlobalState(currency: string = DEFAULT_CURRENCY): GlobalState {
  return { ...DEFAULT_GLOBAL_STATE, currency };
}

/**
 * Whether the comparison is still the page's untouched starting state: the
 * default vendors and settings, in the page's own starting currency.
 */
export function isPristineState(vendors: VendorInput[], global: GlobalState, pageCurrency: string): boolean {
  return (
    global.currency === pageCurrency &&
    encodeToQueryString(vendors, { ...global, currency: DEFAULT_CURRENCY }) ===
      encodeToQueryString(DEFAULT_VENDORS, DEFAULT_GLOBAL_STATE)
  );
}

/**
 * What follows the `#` of a link the tool writes: the state inside the
 * envelope, whose check lets the page that opens it tell that it arrived
 * whole (`readSharedState`).
 */
export function encodeSharedState(vendors: VendorInput[], global: GlobalState): string {
  return sealState(encodeToQueryString(vendors, global), LINK_FORMAT);
}

/**
 * What the tool publishes for the language switch: nothing while it is
 * untouched, so the other page opens with its own starting currency, and the
 * share link's own state once anything changed.
 */
export function publishableState(vendors: VendorInput[], global: GlobalState, pageCurrency: string): string {
  return isPristineState(vendors, global, pageCurrency) ? '' : encodeSharedState(vendors, global);
}

const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(CURRENCIES.map((c) => c.code));

export interface DecodeResult {
  vendors: VendorInput[];
  /** Kept as `string | null` for backwards compatibility with the legacy decoder. */
  currency: string | null;
  global: GlobalState;
}

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  // A currency the tools do not know is treated as no currency at all, so
  // the page opens in its own starting one.
  const currency = linkCurrency(params.get('c'), KNOWN_CURRENCIES, null);

  if ([...params.keys()].length === 0) {
    // No state in URL at all: hand back a fresh copy of the defaults so
    // callers can mutate without affecting our module-level constant.
    return {
      vendors: DEFAULT_VENDORS.map((v) => ({ ...v })),
      currency: null,
      global: { ...DEFAULT_GLOBAL_STATE },
    };
  }

  // Resolve count: explicit `n` wins; otherwise infer from the highest
  // populated v{i} tuple. Advanced-only slots without a tuple are
  // ignored: same rule the old wire format used (principal-as-marker).
  let count = Number(params.get('n'));
  if (!Number.isFinite(count) || count < MIN_VENDORS) {
    count = MIN_VENDORS;
    for (let i = MAX_VENDORS; i > MIN_VENDORS; i--) {
      if (params.has(`v${i}`)) { count = i; break; }
    }
  }
  count = Math.min(MAX_VENDORS, Math.max(MIN_VENDORS, Math.round(count)));

  const vendors = Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const packed = params.get(`v${idx}`);
    const next = packed !== null
      ? decodeVendorTuple(packed, i)
      : makeDefaultVendor(i);

    // Advanced fields override on top of the simple-mode tuple so a
    // share link can use the slot template for the simple fields and
    // still carry one or two advanced overrides.
    for (const { field, key } of ADVANCED_KEY_MAP) {
      const value = params.get(`v${idx}_${key}`);
      if (value === null) continue;
      if (field === 'rateKind') {
        next.rateKind = value === 'hybrid' ? 'hybrid' : 'fixed';
      } else if (field === 'rateChangeKeeps') {
        // Anything but the one known code is today's behaviour.
        next.rateChangeKeeps = value === 'p' ? 'payment' : 'term';
      } else if (field === 'lumpSumsEncoded') {
        next.lumpSumsEncoded = value === CLEARED ? '' : linkLumpSums(value, '');
      } else {
        // All non-rateKind advanced fields are typed `string` on VendorInput
        // (see ADVANCED_DEFAULTS); the cast through `unknown` is needed only
        // because `VendorInput` itself isn't a `Record<string, string>`
        // (it carries the union-typed `modeKind` and `rateKind`).
        const slot = next as unknown as Record<string, string>;
        slot[field] = read(value, slot[field]);
      }
    }
    return next;
  });

  const tabRaw = params.get('t');
  const activeTab: AnalysisTab =
    tabRaw === 'horizon' || tabRaw === 'refi' || tabRaw === 'how' || tabRaw === 'charts'
      ? tabRaw
      : DEFAULT_GLOBAL_STATE.activeTab;
  const global: GlobalState = {
    currency: currency ?? DEFAULT_GLOBAL_STATE.currency,
    activeTab,
    horizonMonths: read(params.get('h'), DEFAULT_GLOBAL_STATE.horizonMonths),
    // '0' is "no offer chosen"; otherwise one of the offers the link carries.
    refiVendorIndex: linkWholeNumber(params.get('rv'), 0, count, DEFAULT_GLOBAL_STATE.refiVendorIndex),
    refiAtMonth: read(params.get('ra'), DEFAULT_GLOBAL_STATE.refiAtMonth),
    refiNewRatePct: read(params.get('rr'), DEFAULT_GLOBAL_STATE.refiNewRatePct),
    refiNewTermMonths: read(params.get('rt'), DEFAULT_GLOBAL_STATE.refiNewTermMonths),
    refiNewFeeMajor: read(params.get('rf'), DEFAULT_GLOBAL_STATE.refiNewFeeMajor),
    refiRollFee: params.get('rl') === '1',
  };

  return { vendors, currency, global };
}

/** The keys of the settings that are typed numbers: the horizon and the refinance boxes. */
const NUMBER_KEYS: ReadonlySet<string> = new Set(['h', 'ra', 'rr', 'rt', 'rf']);
/** The positions of an offer's tuple that are typed numbers. */
const NUMBER_POSITIONS: readonly number[] = [
  V_IDX.PRINCIPAL, V_IDX.ANNUAL_RATE_PCT, V_IDX.TERM_MONTHS, V_IDX.MONTHLY_PAYMENT, V_IDX.FEE_MAJOR, V_IDX.EXTRA_MONTHLY,
];
/** The advanced fields that are choices, not typed numbers. */
const NOT_NUMBERS: ReadonlySet<string> = new Set(['rk', 'rc']);
/** The advanced keys that are typed numbers (the lump-sum list has its own shape and is asked first). */
const ADVANCED_NUMBER_KEYS: ReadonlySet<string> = new Set(ADVANCED_KEY_MAP.map(({ key }) => key).filter((key) => !NOT_NUMBERS.has(key)));

/**
 * Whether every typed number of a checked link is one the tool's own writer
 * could have written (#821): a number in one of the site's styles, the mark
 * of an emptied box or the marker of an unreadable one. The writer writes
 * nothing else, so in a link whose check holds a value outside that was
 * never in a sender's box: the link is not what anyone saw, and it is refused
 * whole, like a link that arrived damaged, rather than opened with a box
 * the sender never had. An empty position in an offer's tuple is "not
 * given" and fits. Links from before the check are not asked: they are read
 * as leniently as ever.
 */
function numbersFit(state: string): boolean {
  for (const [key, value] of new URLSearchParams(state)) {
    if (NUMBER_KEYS.has(key)) {
      if (!fits(value)) return false;
      continue;
    }
    const offer = /^v\d+(?:_([a-z]{2}))?$/.exec(key);
    if (!offer) continue;
    const field = offer[1];
    if (field === undefined) {
      const fields = decodeTuple(value, SIMPLE_FIELD_COUNT);
      if (!NUMBER_POSITIONS.every((at) => fields[at] === '' || fits(fields[at]))) return false;
    } else if (field === 'ls') {
      if (!lumpSumsFit(value)) return false;
    } else if (ADVANCED_NUMBER_KEYS.has(field) && !fits(value)) {
      return false;
    }
  }
  return true;
}

/**
 * A state that arrived (a share link, the language switch), read: the offers
 * and settings it carries, or `null` for a link written with the envelope
 * that did not arrive whole. Nothing of such a link is used: the page shows
 * neither its values nor the examples in their place (#820).
 *
 * A state with no `f` key was written before the envelope and is read as it
 * always was. One cut so that no `f` survives looks the same and is read the
 * same way: that limit is accepted. The decoder knows neither `f` nor `z`,
 * so a whole link reads as the state inside it; with every other value left
 * out, that is each offer's slot template, which is what the writer left out.
 *
 * A whole link is also refused when one of its numbers is not one the writer
 * could have written (`numbersFit`, #821).
 */
export function readSharedState(state: string): DecodeResult | null {
  const arrived = openState(state, LINK_FORMAT);
  if (arrived === 'damaged' || (arrived === 'whole' && !numbersFit(state))) return null;
  return decodeFromQueryString(state);
}
