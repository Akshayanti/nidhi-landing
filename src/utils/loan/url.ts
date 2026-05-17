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
 *   - `v{i}_pc` pointsCostMajor      (default '0')
 *   - `v{i}_pr` pointsRateReductionPct (default '0')
 *   - `v{i}_ls` lumpSumsEncoded      (default '')
 *   - `v{i}_pp` prepayPenaltyPct     (default '0')
 *   - `v{i}_pu` prepayPenaltyUntilMonth (default '0')
 *
 * Global scalars:
 *   - `c=EUR`     currency (omit at default 'EUR')
 *   - `n=3`       vendor count (omit at default 2)
 *   - `t=horizon` active tab (omit at default 'charts')
 *   - `h=120`     horizon months
 *   - `rv` `ra` `rr` `rt` `rf` `rl` — refinance scenario fields
 *
 * Hard cutover: the previous `cur=`, `v{i}_principal=`-style keys are NOT
 * decoded. The tool is new (no shared URLs in the wild) and v5.2 of the
 * free-tools plan documents the rationale for skipping the alias layer.
 */

import { DEFAULT_CURRENCY } from './math.ts';
import { decodeTuple, encodeTuple, serializeParams, setNonDefault } from '../shared/compactUrl.ts';

export type ModeKind = 'term' | 'payment';
export type RateKind = 'fixed' | 'hybrid';

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

export const DEFAULT_VENDORS: VendorInput[] = Array.from(
  { length: MIN_VENDORS },
  (_, i) => makeDefaultVendor(i),
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
 * Malformed pairs are silently skipped so the caller gets the salvageable subset of a mistyped
 * link rather than an outright failure. Format: "12:5000;36:3000".
 */
export function parseLumpSums(encoded: string): LumpSumEntry[] {
  if (!encoded) return [];
  const out: LumpSumEntry[] = [];
  for (const pair of encoded.split(';')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0 || colon === trimmed.length - 1) continue;
    const month = Number(trimmed.slice(0, colon).trim());
    const amount = Number(trimmed.slice(colon + 1).trim());
    if (!Number.isFinite(month) || month < 1) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    out.push({ month: Math.floor(month), amountMajor: amount });
  }
  return out;
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

function encodeVendorTuple(v: VendorInput): string {
  // Build the simple-mode tuple. Each position is the field's string value,
  // with the omit-when-default behaviour (substitute '' for fields that
  // match a stable single-valued default — currently just modeKind).
  const fields = new Array<string>(SIMPLE_FIELD_COUNT).fill('');
  fields[V_IDX.NAME] = v.name;
  fields[V_IDX.PRINCIPAL] = v.principal;
  fields[V_IDX.ANNUAL_RATE_PCT] = v.annualRatePct;
  // modeKind: 'term' is the default. Substituting '' here lets the
  // tuple's trailing-trim drop it for the most common case.
  fields[V_IDX.MODE_KIND] = v.modeKind === 'term' ? '' : v.modeKind;
  fields[V_IDX.TERM_MONTHS] = v.termMonths;
  fields[V_IDX.MONTHLY_PAYMENT] = v.monthlyPayment;
  fields[V_IDX.FEE_MAJOR] = v.feeMajor;
  fields[V_IDX.EXTRA_MONTHLY] = v.extraMonthly;
  return encodeTuple(fields);
}

function decodeVendorTuple(packed: string, slotIndex: number): VendorInput {
  // Start from the slot's template defaults so any tuple field the URL
  // omitted (or trimmed as a trailing default) falls back gracefully.
  const next = makeDefaultVendor(slotIndex);
  const fields = decodeTuple(packed, SIMPLE_FIELD_COUNT);

  // Each field overrides the slot template only when it carries data.
  // An empty slot in the tuple = "field unset, use template default" —
  // the same semantics the previous wire format had via missing keys.
  if (fields[V_IDX.NAME] !== '') next.name = fields[V_IDX.NAME];
  if (fields[V_IDX.PRINCIPAL] !== '') next.principal = fields[V_IDX.PRINCIPAL];
  if (fields[V_IDX.ANNUAL_RATE_PCT] !== '') next.annualRatePct = fields[V_IDX.ANNUAL_RATE_PCT];

  // modeKind: any unknown value coerces to 'term' so a malformed share
  // link can never put the UI into an unexpected state.
  if (fields[V_IDX.MODE_KIND] !== '') {
    next.modeKind = fields[V_IDX.MODE_KIND] === 'payment' ? 'payment' : 'term';
  }

  if (fields[V_IDX.TERM_MONTHS] !== '') next.termMonths = fields[V_IDX.TERM_MONTHS];
  if (fields[V_IDX.MONTHLY_PAYMENT] !== '') next.monthlyPayment = fields[V_IDX.MONTHLY_PAYMENT];
  if (fields[V_IDX.FEE_MAJOR] !== '') next.feeMajor = fields[V_IDX.FEE_MAJOR];
  if (fields[V_IDX.EXTRA_MONTHLY] !== '') next.extraMonthly = fields[V_IDX.EXTRA_MONTHLY];

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
  setNonDefault(params, 'h', global.horizonMonths, DEFAULT_GLOBAL_STATE.horizonMonths);
  setNonDefault(params, 'rv', global.refiVendorIndex, DEFAULT_GLOBAL_STATE.refiVendorIndex);
  setNonDefault(params, 'ra', global.refiAtMonth, DEFAULT_GLOBAL_STATE.refiAtMonth);
  setNonDefault(params, 'rr', global.refiNewRatePct, DEFAULT_GLOBAL_STATE.refiNewRatePct);
  setNonDefault(params, 'rt', global.refiNewTermMonths, DEFAULT_GLOBAL_STATE.refiNewTermMonths);
  setNonDefault(params, 'rf', global.refiNewFeeMajor, DEFAULT_GLOBAL_STATE.refiNewFeeMajor);
  if (global.refiRollFee) params.set('rl', '1');

  // Per-vendor tuples + advanced overrides.
  vendors.forEach((v, i) => {
    const idx = i + 1;
    const packed = encodeVendorTuple(v);
    if (packed !== '') params.set(`v${idx}`, packed);
    for (const { field, key } of ADVANCED_KEY_MAP) {
      const value = v[field];
      const dflt = ADVANCED_DEFAULTS[field];
      // Two skip conditions:
      //   - empty string (field not in use)
      //   - matches the inactive default (no semantic difference)
      if (value === '' || value === dflt) continue;
      params.set(`v${idx}_${key}`, String(value));
    }
  });

  return serializeParams(params);
}

export interface DecodeResult {
  vendors: VendorInput[];
  /** Kept as `string | null` for backwards compatibility with the legacy decoder. */
  currency: string | null;
  global: GlobalState;
}

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const currency = params.get('c');

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
  // ignored — same rule the old wire format used (principal-as-marker).
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
      } else {
        // All non-rateKind advanced fields are typed `string` on VendorInput
        // (see ADVANCED_DEFAULTS); the cast through `unknown` is needed only
        // because `VendorInput` itself isn't a `Record<string, string>`
        // (it carries the union-typed `modeKind` and `rateKind`).
        (next as unknown as Record<string, string>)[field] = value;
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
    horizonMonths: params.get('h') ?? DEFAULT_GLOBAL_STATE.horizonMonths,
    refiVendorIndex: params.get('rv') ?? DEFAULT_GLOBAL_STATE.refiVendorIndex,
    refiAtMonth: params.get('ra') ?? DEFAULT_GLOBAL_STATE.refiAtMonth,
    refiNewRatePct: params.get('rr') ?? DEFAULT_GLOBAL_STATE.refiNewRatePct,
    refiNewTermMonths: params.get('rt') ?? DEFAULT_GLOBAL_STATE.refiNewTermMonths,
    refiNewFeeMajor: params.get('rf') ?? DEFAULT_GLOBAL_STATE.refiNewFeeMajor,
    refiRollFee: params.get('rl') === '1',
  };

  return { vendors, currency, global };
}
