/**
 * URL-state and shape helpers for the loan comparison tool.
 *
 * Extracted out of `src/components/LoanCompare.tsx` so the round-trip and
 * count-inference logic can be tested directly under `node --test`,
 * without spinning up a React renderer or a DOM. Everything here is
 * framework-agnostic and depends only on `URLSearchParams`, which Node 22
 * provides natively.
 *
 * Design notes:
 *   - The serialized form uses per-field keys (`v{i}_{key}`, e.g.
 *     `v1_principal=250000`). Adding/removing slots does not change the
 *     wire format of an individual slot.
 *   - A top-level key `n` records the vendor count when it differs from
 *     MIN_VENDORS. We omit `n` when the count is at the minimum so the
 *     default-state URL stays compact.
 *   - When `n` is absent we infer the count by scanning for the highest
 *     `vN_principal` index. We only treat `principal` as the canonical
 *     "this slot exists" marker because it has no useful default of its
 *     own; using something like `modeKind` would create false positives
 *     for slots that were never populated.
 *   - Every per-vendor field (including hybrid rate, points, lump sums,
 *     prepayment penalty) and every global field (active tab, horizon,
 *     refinance scenario) is emitted only when it differs from its
 *     default value, so a fresh comparison still produces a compact URL.
 */
import { DEFAULT_CURRENCY } from './loanMath.ts';

export type ModeKind = 'term' | 'payment';
export type RateKind = 'fixed' | 'hybrid';

export interface VendorInput {
  name: string;
  principal: string;          // major-unit amount, as typed
  annualRatePct: string;      // percent, as typed (e.g. "6.5")
  modeKind: ModeKind;
  termMonths: string;         // months, as typed
  monthlyPayment: string;     // major-unit amount, as typed
  feeMajor: string;           // origination/closing fee, major units
  extraMonthly: string;       // extra principal per month, major units

  // ---------------------------------------------------------------------
  // Advanced-mode fields. Always present on the in-memory shape so the
  // React state has a stable type, but only serialized into the URL when
  // they differ from their simple-mode defaults. The simple-mode UI
  // ignores them entirely; the advanced-mode UI reads/writes them.
  // ---------------------------------------------------------------------

  /** 'fixed' or 'hybrid' (a.k.a. ARM-style: initial fixed rate, then a
   *  different rate for the remainder of the term). Default 'fixed'. */
  rateKind: RateKind;
  /** For 'hybrid' loans: number of months the initial rate is in
   *  effect. Defaults to '60' (the common 5-year fixed window). Stored
   *  as a string so empty input is preserved verbatim across renders. */
  initialFixedMonths: string;
  /** For 'hybrid' loans: the rate that takes over after the fixed
   *  window, as a percent string. Defaults empty. */
  subsequentRatePct: string;
  /** Cost of discount points the user paid to buy the rate down, in
   *  major units. The amount is also expected to be folded into
   *  `feeMajor` (because that is what the user actually paid up front);
   *  this field is purely informational so we can reconstruct the
   *  hypothetical no-points baseline for break-even analysis. Defaults
   *  to '0'. */
  pointsCostMajor: string;
  /** Rate reduction (in percentage points) the points purchased.
   *  Example: '0.25' means the rate would have been 0.25 pp higher
   *  without buying points. Defaults to '0'. */
  pointsRateReductionPct: string;
  /** Lump-sum prepayments encoded as semicolon-separated `month:amount`
   *  pairs (amount in major units). Examples: '' (none), '12:5000',
   *  '12:5000;36:3000;60:10000'. Defaults to ''. */
  lumpSumsEncoded: string;
  /** Prepayment penalty as a percent of the remaining balance at the
   *  moment of early payoff. Defaults to '0' (no penalty). */
  prepayPenaltyPct: string;
  /** Last month at which a prepayment penalty applies. After this month
   *  no penalty is charged. '0' means no penalty (it never fires). */
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
  /** Currency code (e.g. 'USD'). */
  currency: string;
  /** Active analysis tab. Persisted in the URL so a share link lands
   *  the recipient on the same view the sender was looking at. */
  activeTab: AnalysisTab;
  /** Horizon (in months) for the equity-snapshot section. */
  horizonMonths: string;
  /** Index (1-based) of the vendor selected for the refinance scenario.
   *  '0' means "none selected". */
  refiVendorIndex: string;
  /** Month at which the refinance happens. */
  refiAtMonth: string;
  /** New loan rate, percent. */
  refiNewRatePct: string;
  /** New loan term, months. */
  refiNewTermMonths: string;
  /** New loan origination/closing fee, major units. */
  refiNewFeeMajor: string;
  /** Whether the new fee is rolled into the new principal. */
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

// Order is irrelevant for correctness (URLSearchParams sorts on .toString
// in some engines but in Node it preserves insertion order); we list the
// fields explicitly so adding a new VendorInput field is a deliberate
// decision, not an automatic wire-format change.
const QS_KEYS_SIMPLE: (keyof VendorInput)[] = [
  'name',
  'principal',
  'annualRatePct',
  'modeKind',
  'termMonths',
  'monthlyPayment',
  'feeMajor',
  'extraMonthly',
];

const QS_KEYS_ADVANCED: (keyof VendorInput)[] = [
  'rateKind',
  'initialFixedMonths',
  'subsequentRatePct',
  'pointsCostMajor',
  'pointsRateReductionPct',
  'lumpSumsEncoded',
  'prepayPenaltyPct',
  'prepayPenaltyUntilMonth',
];

// ---------------------------------------------------------------------------
// Lump-sum encoding helpers
// ---------------------------------------------------------------------------

/**
 * Parse the URL/text encoding of a lump-sum list. Format:
 *   "" (empty)                  -> []
 *   "12:5000"                   -> [{month: 12, amountMajor: 5000}]
 *   "12:5000;36:3000;60:10000"  -> three entries, in the order given
 *
 * Whitespace around tokens is ignored. Malformed pairs (missing colon,
 * non-numeric values, non-positive values) are silently skipped rather
 * than rejected; the caller usually wants the salvageable subset of a
 * mistyped link, not an outright failure.
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

/**
 * Inverse of `parseLumpSums`. Skips invalid entries and emits canonical
 * `month:amount` form, separated by semicolons. Returns '' for an empty
 * list so the encoder can drop the key entirely.
 */
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
// Encode / decode
// ---------------------------------------------------------------------------

/**
 * Encode the full state into a URL query string. Only emits keys whose
 * values differ from their defaults so a fresh comparison still produces
 * a compact URL.
 */
export function encodeToQueryString(vendors: VendorInput[], global: GlobalState): string {
  const params = new URLSearchParams();
  if (global.currency !== DEFAULT_CURRENCY) params.set('cur', global.currency);
  if (vendors.length !== MIN_VENDORS) params.set('n', String(vendors.length));

  vendors.forEach((v, i) => {
    const idx = i + 1;
    QS_KEYS_SIMPLE.forEach((k) => {
      const value = v[k];
      // Preserve "user typed empty" behaviour: skip the key entirely so
      // the receiving end falls back to the slot's template default.
      // This also keeps the URL short for fields like `monthlyPayment`
      // when the vendor is in 'term' mode and vice-versa.
      if (value !== '' && value != null) {
        params.set(`v${idx}_${k}`, String(value));
      }
    });
    // The "advanced" per-vendor fields are now first-class citizens; we
    // still default-omit them when they match the inactive default so
    // a fresh comparison's URL stays compact.
    QS_KEYS_ADVANCED.forEach((k) => {
      const value = v[k];
      const dflt = (ADVANCED_DEFAULTS as Record<string, string>)[k as string];
      if (value !== '' && value != null && value !== dflt) {
        params.set(`v${idx}_${k}`, String(value));
      }
    });
  });

  // Global state. Only emit keys that differ from defaults.
  if (global.activeTab && global.activeTab !== DEFAULT_GLOBAL_STATE.activeTab) {
    params.set('tab', global.activeTab);
  }
  if (global.horizonMonths && global.horizonMonths !== DEFAULT_GLOBAL_STATE.horizonMonths) {
    params.set('horizon', global.horizonMonths);
  }
  if (global.refiVendorIndex && global.refiVendorIndex !== DEFAULT_GLOBAL_STATE.refiVendorIndex) {
    params.set('refi_v', global.refiVendorIndex);
  }
  if (global.refiAtMonth && global.refiAtMonth !== DEFAULT_GLOBAL_STATE.refiAtMonth) {
    params.set('refi_at', global.refiAtMonth);
  }
  if (global.refiNewRatePct && global.refiNewRatePct !== DEFAULT_GLOBAL_STATE.refiNewRatePct) {
    params.set('refi_rate', global.refiNewRatePct);
  }
  if (global.refiNewTermMonths && global.refiNewTermMonths !== DEFAULT_GLOBAL_STATE.refiNewTermMonths) {
    params.set('refi_term', global.refiNewTermMonths);
  }
  if (global.refiNewFeeMajor && global.refiNewFeeMajor !== DEFAULT_GLOBAL_STATE.refiNewFeeMajor) {
    params.set('refi_fee', global.refiNewFeeMajor);
  }
  if (global.refiRollFee) {
    params.set('refi_roll', '1');
  }

  return params.toString();
}

export interface DecodeResult {
  vendors: VendorInput[];
  /** Currency code, or null when not present in the URL. Kept for
   *  backwards compatibility with the legacy decoder. */
  currency: string | null;
  /** Full global state derived from the URL. New callers should prefer
   *  this; legacy callers can keep using `currency`. */
  global: GlobalState;
}

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const currency = params.get('cur');
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
  // populated principal index, falling back to MIN_VENDORS.
  let count = Number(params.get('n'));
  if (!Number.isFinite(count) || count < MIN_VENDORS) {
    count = MIN_VENDORS;
    for (let i = MAX_VENDORS; i > MIN_VENDORS; i--) {
      if (params.has(`v${i}_principal`)) { count = i; break; }
    }
  }
  count = Math.min(MAX_VENDORS, Math.max(MIN_VENDORS, Math.round(count)));

  const vendors = Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const next: VendorInput = makeDefaultVendor(i);
    QS_KEYS_SIMPLE.forEach((k) => {
      const value = params.get(`v${idx}_${k}`);
      if (value !== null) {
        if (k === 'modeKind') {
          // Defensively normalise: any unknown mode falls back to 'term'
          // so a malformed share link can't trigger a UI state we never
          // expected.
          next.modeKind = value === 'payment' ? 'payment' : 'term';
        } else {
          (next as Record<string, string>)[k] = value;
        }
      }
    });
    QS_KEYS_ADVANCED.forEach((k) => {
      const value = params.get(`v${idx}_${k}`);
      if (value !== null) {
        if (k === 'rateKind') {
          next.rateKind = value === 'hybrid' ? 'hybrid' : 'fixed';
        } else {
          (next as Record<string, string>)[k] = value;
        }
      }
    });
    return next;
  });

  const tabRaw = params.get('tab');
  const activeTab: AnalysisTab =
    tabRaw === 'horizon' || tabRaw === 'refi' || tabRaw === 'how' || tabRaw === 'charts'
      ? tabRaw
      : DEFAULT_GLOBAL_STATE.activeTab;
  const global: GlobalState = {
    currency: currency ?? DEFAULT_GLOBAL_STATE.currency,
    activeTab,
    horizonMonths: params.get('horizon') ?? DEFAULT_GLOBAL_STATE.horizonMonths,
    refiVendorIndex: params.get('refi_v') ?? DEFAULT_GLOBAL_STATE.refiVendorIndex,
    refiAtMonth: params.get('refi_at') ?? DEFAULT_GLOBAL_STATE.refiAtMonth,
    refiNewRatePct: params.get('refi_rate') ?? DEFAULT_GLOBAL_STATE.refiNewRatePct,
    refiNewTermMonths: params.get('refi_term') ?? DEFAULT_GLOBAL_STATE.refiNewTermMonths,
    refiNewFeeMajor: params.get('refi_fee') ?? DEFAULT_GLOBAL_STATE.refiNewFeeMajor,
    refiRollFee: params.get('refi_roll') === '1',
  };

  return { vendors, currency, global };
}
