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
 *   - The serialized form keeps backwards-compatible per-field keys
 *     (`v{i}_{key}`, e.g. `v1_principal=250000`). Adding/removing slots
 *     does not change the wire format of an individual slot.
 *   - We add a single new top-level key, `n`, that records the vendor
 *     count when it differs from MIN_VENDORS. We omit `n` when the count
 *     is at the minimum so the default-state URL stays compact.
 *   - When `n` is absent we infer the count by scanning for the highest
 *     `vN_principal` index. We only treat `principal` as the canonical
 *     "this slot exists" marker because it has no useful default of its
 *     own; using something like `modeKind` would create false positives
 *     for slots that were never populated.
 */
import { DEFAULT_CURRENCY } from './loanMath.ts';

export type ModeKind = 'term' | 'payment';

export interface VendorInput {
  name: string;
  principal: string;          // major-unit amount, as typed
  annualRatePct: string;      // percent, as typed (e.g. "6.5")
  modeKind: ModeKind;
  termMonths: string;         // months, as typed
  monthlyPayment: string;     // major-unit amount, as typed
  feeMajor: string;           // origination/closing fee, major units
  extraMonthly: string;       // extra principal per month, major units
}

// A comparator with one row isn't a comparison; below 2 the delta table
// and "lowest cost" badge become meaningless. The upper bound of 5 keeps
// the grid legible on a typical desktop and bounds the URL length when
// sharing.
export const MIN_VENDORS = 2;
export const MAX_VENDORS = 5;

export const VENDOR_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

// Per-slot starter values. Slots 3-5 use sensible-but-distinct rates so
// a freshly-added vendor doesn't duplicate an existing one and the chart
// immediately shows a difference.
export const VENDOR_TEMPLATES: ReadonlyArray<Omit<VendorInput, 'name'>> = [
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
  return { name: `Vendor ${label}`, ...tmpl };
}

export const DEFAULT_VENDORS: VendorInput[] = Array.from(
  { length: MIN_VENDORS },
  (_, i) => makeDefaultVendor(i),
);

// Order is irrelevant for correctness (URLSearchParams sorts on .toString
// in some engines but in Node it preserves insertion order); we list the
// fields explicitly so adding a new VendorInput field is a deliberate
// decision, not an automatic wire-format change.
const QS_KEYS: (keyof VendorInput)[] = [
  'name',
  'principal',
  'annualRatePct',
  'modeKind',
  'termMonths',
  'monthlyPayment',
  'feeMajor',
  'extraMonthly',
];

export function encodeToQueryString(vendors: VendorInput[], currency: string): string {
  const params = new URLSearchParams();
  if (currency !== DEFAULT_CURRENCY) params.set('cur', currency);
  if (vendors.length !== MIN_VENDORS) params.set('n', String(vendors.length));
  vendors.forEach((v, i) => {
    const idx = i + 1;
    QS_KEYS.forEach((k) => {
      const value = v[k];
      // Preserve "user typed empty" behaviour: skip the key entirely so
      // the receiving end falls back to the slot's template default.
      // This also keeps the URL short for fields like `monthlyPayment`
      // when the vendor is in 'term' mode and vice-versa.
      if (value !== '' && value != null) {
        params.set(`v${idx}_${k}`, String(value));
      }
    });
  });
  return params.toString();
}

export interface DecodeResult {
  vendors: VendorInput[];
  currency: string | null;
}

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const currency = params.get('cur');
  if ([...params.keys()].length === 0) {
    // No state in URL at all: hand back a fresh copy of the defaults so
    // callers can mutate without affecting our module-level constant.
    return { vendors: DEFAULT_VENDORS.map((v) => ({ ...v })), currency: null };
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
    QS_KEYS.forEach((k) => {
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
    return next;
  });
  return { vendors, currency };
}
