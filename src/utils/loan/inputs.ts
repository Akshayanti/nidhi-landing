/**
 * Adapter layer between `VendorInput` (URL-shaped strings) and the typed engine in `math.ts`.
 * Extracted from the component so it's testable without React or a DOM.
 */
import {
  OPTIONAL_UNREADABLE,
  computeLoan,
  emptyResult,
  toMinor,
  type LoanResult,
  type LoanInputs,
  type LoanMode,
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
  // Plain decimal digits only. `Number()` alone also reads "0x10" as 16 and
  // "1e5" as 100,000: spellings no reader means, which a share link or a
  // slip of the hand could otherwise turn into a different loan (#352).
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** The optional boxes of an offer: left empty they are simply not in use. */
export type OptionalField =
  | 'feeMajor'
  | 'pointsCostMajor'
  | 'pointsRateReductionPct'
  | 'extraMonthly'
  | 'lumpSumsEncoded'
  | 'prepayPenaltyPct'
  | 'prepayPenaltyUntilMonth'
  | 'initialFixedMonths'
  | 'subsequentRatePct';

/** The message for an offer with an optional box that cannot be read; the engine uses it too. */
export { OPTIONAL_UNREADABLE };

/**
 * The optional boxes that hold something which is not what the box is for:
 * "€2,500" or "-300" as a fee, "200 a month" as an extra payment, "12-5000"
 * as a lump sum. Each of these used to be read as zero, or skipped, without
 * a word: a fee typed with a currency sign made an offer look free of fees
 * and lowered its APR. An empty box is not listed.
 */
export function unreadableOptionalFields(v: VendorInput): OptionalField[] {
  const out: OptionalField[] = [];
  const bad = (text: string): boolean => {
    if (text.trim() === '') return false;
    const n = parseNumber(text);
    return !Number.isFinite(n) || n < 0;
  };
  const numeric: OptionalField[] = ['feeMajor', 'pointsCostMajor', 'pointsRateReductionPct', 'extraMonthly', 'prepayPenaltyPct', 'prepayPenaltyUntilMonth'];
  for (const field of numeric) if (bad(v[field])) out.push(field);

  // The two boxes of a rate that changes are on the page only for such a loan.
  if (v.rateKind === 'hybrid' && v.modeKind === 'term') {
    if (bad(v.initialFixedMonths)) out.push('initialFixedMonths');
    if (bad(v.subsequentRatePct)) out.push('subsequentRatePct');
  }

  // Lump sums: every pair that is written must read as "month:amount".
  const pairs = v.lumpSumsEncoded.split(';').filter((pair) => pair.trim() !== '');
  if (pairs.length !== parseLumpSums(v.lumpSumsEncoded).length) out.push('lumpSumsEncoded');

  return out;
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
        ...(v.rateChangeKeeps === 'payment' ? { keeps: 'payment' as const } : {}),
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
  // An optional box that cannot be read is an error, like a required one:
  // a result that quietly left it out would look complete and be wrong.
  if (unreadableOptionalFields(v).length > 0) return emptyResult(0, OPTIONAL_UNREADABLE);
  const { inputs, mode } = loanFromInput(v, currency);
  return computeLoan(inputs, mode);
}

/**
 * What the engine is given for an offer: the typed boxes as amounts, rates
 * and a mode. The refinance scenario needs these beside the result, which
 * keeps neither the penalty clause nor the extra payments.
 */
export function loanFromInput(v: VendorInput, currency: string): { inputs: LoanInputs; mode: LoanMode } {
  const inputs: LoanInputs = {
    principalMinor: toMinor(parseNumber(v.principal), currency),
    annualRate: parseNumber(v.annualRatePct) / 100,
    feeMinor: toMinor(parseNumber(v.feeMajor) || 0, currency),
    extraMonthlyMinor: toMinor(parseNumber(v.extraMonthly) || 0, currency),
    ...buildAdvancedFields(v, currency),
  };
  const mode: LoanMode =
    v.modeKind === 'term'
      ? { kind: 'term', months: Math.round(parseNumber(v.termMonths)) }
      : { kind: 'payment', monthlyMinor: toMinor(parseNumber(v.monthlyPayment), currency) };
  return { inputs, mode };
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
