/**
 * Adapter layer between `VendorInput` (URL-shaped strings) and the typed engine in `math.ts`.
 * Extracted from the component so it's testable without React or a DOM.
 */
import {
  computeLoan,
  toMinor,
  type LoanResult,
  type LumpSum,
  type PrepaymentPenalty,
  type RateSpec,
} from './math.ts';
import { parseLumpSums, type VendorInput } from './url.ts';

/**
 * Strips cosmetic grouping (spaces, commas) so "1,234,567" and "1 234 567" both parse.
 * Returns NaN for empty or invalid input so callers can choose their own fallback.
 */
export function parseNumber(s: string): number {
  const cleaned = s.replace(/[\s,]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Translates URL-shape inputs into typed engine fields. Omits properties at their defaults
 * so the engine's fallback logic runs unchanged when a feature is not in use.
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
 * Single entry point so every caller gets the same validation, conversion, and error formatting.
 * The returned `LoanResult` carries the engine's own `error` string when inputs are invalid,
 * so the caller can show it verbatim without a second validation layer.
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
 * Reconstructs the counterfactual "no points" loan so `pointsBreakEven` can compare with/without.
 * Returns `null` when the vendor has not entered both a positive points cost and a positive rate
 * reduction; the caller treats null as "no break-even row to display".
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
