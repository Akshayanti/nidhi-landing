/**
 * Pure helpers that translate the URL-shape `VendorInput` into the
 * typed inputs the engine in `loanMath.ts` expects.
 *
 * Lives outside `LoanCompare.tsx` so it can be unit-tested under
 * `node --test` without spinning up React or a DOM. The vendor card UI
 * just imports from here.
 */
import {
  computeLoan,
  toMinor,
  type LoanResult,
  type LumpSum,
  type PrepaymentPenalty,
  type RateSpec,
} from './loanMath.ts';
import { parseLumpSums, type VendorInput } from './loanCompareUrl.ts';

/**
 * Parse a user-typed money/percentage string into a number.
 *
 * Accepts spaces and commas as cosmetic group separators, so "1,234,567"
 * and "1 234 567" both parse to 1234567. Rejects any other punctuation
 * (e.g. a stray dot in the wrong place) by returning NaN, so callers can
 * decide whether to surface an error or fall back to a default.
 *
 * Returns NaN for empty input. Callers wanting to default-empty-to-zero
 * should explicitly do `parseNumber(s) || 0`.
 */
export function parseNumber(s: string): number {
  const cleaned = s.replace(/[\s,]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Translate a vendor's URL-shape inputs into the typed optional fields
 * the engine consumes. Only emits a non-trivial value when the relevant
 * field is "in use"; otherwise the property is omitted and the engine
 * falls back to its default (fixed rate, no lumps, no penalty).
 *
 * Specifically:
 *   - `rateSpec` is emitted only when `rateKind === 'hybrid'` AND both
 *     the initial-period and subsequent-rate fields parse to valid
 *     finite numbers.
 *   - `lumpSums` is emitted only when at least one parseable lump-sum
 *     entry is present in `lumpSumsEncoded`.
 *   - `prepaymentPenalty` is emitted only when both `prepayPenaltyPct`
 *     and `prepayPenaltyUntilMonth` parse to strictly positive numbers.
 */
export function buildAdvancedFields(
  v: VendorInput,
  currency: string,
): {
  rateSpec?: RateSpec;
  lumpSums?: LumpSum[];
  prepaymentPenalty?: PrepaymentPenalty;
} {
  const out: ReturnType<typeof buildAdvancedFields> = {};

  if (v.rateKind === 'hybrid') {
    const initialMonths = Math.round(parseNumber(v.initialFixedMonths));
    const subsequent = parseNumber(v.subsequentRatePct) / 100;
    if (Number.isFinite(initialMonths) && initialMonths > 0 && Number.isFinite(subsequent)) {
      out.rateSpec = {
        kind: 'hybrid',
        initialAnnualRate: parseNumber(v.annualRatePct) / 100,
        initialMonths,
        subsequentAnnualRate: subsequent,
      };
    }
  }

  const lumpEntries = parseLumpSums(v.lumpSumsEncoded);
  if (lumpEntries.length > 0) {
    out.lumpSums = lumpEntries.map((e) => ({
      month: e.month,
      amountMinor: toMinor(e.amountMajor, currency),
    }));
  }

  const penaltyPct = parseNumber(v.prepayPenaltyPct);
  const penaltyUntil = Math.round(parseNumber(v.prepayPenaltyUntilMonth));
  if (
    Number.isFinite(penaltyPct) &&
    penaltyPct > 0 &&
    Number.isFinite(penaltyUntil) &&
    penaltyUntil > 0
  ) {
    out.prepaymentPenalty = {
      pctOfBalance: penaltyPct / 100,
      untilMonth: penaltyUntil,
    };
  }

  return out;
}

/**
 * Drive the engine end-to-end from a `VendorInput`. Picks the right
 * `LoanMode` based on `modeKind` and forwards every optional field via
 * `buildAdvancedFields`. The returned `LoanResult` carries the engine's
 * own `error` string when inputs are invalid (so the caller can show it
 * verbatim without a second validation layer).
 */
export function computeFromInput(v: VendorInput, currency: string): LoanResult {
  const principalMinor = toMinor(parseNumber(v.principal), currency);
  const annualRate = parseNumber(v.annualRatePct) / 100;
  const feeMinor = toMinor(parseNumber(v.feeMajor) || 0, currency);
  const extraMonthlyMinor = toMinor(parseNumber(v.extraMonthly) || 0, currency);
  const adv = buildAdvancedFields(v, currency);

  if (v.modeKind === 'term') {
    const months = Math.round(parseNumber(v.termMonths));
    return computeLoan(
      { principalMinor, annualRate, feeMinor, extraMonthlyMinor, ...adv },
      { kind: 'term', months },
    );
  }
  const monthlyMinor = toMinor(parseNumber(v.monthlyPayment), currency);
  return computeLoan(
    { principalMinor, annualRate, feeMinor, extraMonthlyMinor, ...adv },
    { kind: 'payment', monthlyMinor },
  );
}

/**
 * Compute the hypothetical "no points paid" baseline `LoanResult` for a
 * vendor that has paid discount points. The baseline is the same vendor
 * with the points cost removed from the fee and the points rate
 * reduction added back to the rate. Used as the second argument to
 * `pointsBreakEven`.
 *
 * Returns `null` when the vendor has not entered both a positive points
 * cost and a positive rate reduction; the caller treats null as
 * "no break-even row to display".
 */
export function computeNoPointsBaseline(v: VendorInput, currency: string): LoanResult | null {
  const cost = parseNumber(v.pointsCostMajor);
  const reduction = parseNumber(v.pointsRateReductionPct);
  if (!Number.isFinite(cost) || cost <= 0) return null;
  if (!Number.isFinite(reduction) || reduction <= 0) return null;

  const baseline: VendorInput = {
    ...v,
    // Subtract the points cost from the entered fee. Clamp at zero
    // because a baseline "fee minus points" can never be negative.
    feeMajor: String(Math.max(0, (parseNumber(v.feeMajor) || 0) - cost)),
    // Add the rate reduction back to recover the no-points rate.
    annualRatePct: String((parseNumber(v.annualRatePct) || 0) + reduction),
  };
  return computeFromInput(baseline, currency);
}
