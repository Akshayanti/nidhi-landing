/**
 * Adapter layer between `VendorInput` (URL-shaped strings) and the typed engine in `math.ts`.
 * Extracted from the component so it's testable without React or a DOM.
 */
import {
  INITIAL_FIXED_MONTHS,
  LUMP_MONTH,
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
import { UNREADABLE } from '../shared/linkInput.ts';
import { MAX_LINK_LUMP_SUMS } from '../shared/linkInput.ts';
import { lumpSumFault, parseLumpSums, type VendorInput } from './url.ts';

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

/** Whether a box holds something that cannot be used. An empty box holds nothing. */
export function isUnreadable(text: string): boolean {
  if (text.trim() === '') return false;
  const n = parseNumber(text);
  return !Number.isFinite(n) || n < 0;
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
export { LUMP_MONTH, OPTIONAL_UNREADABLE };

/**
 * The message for a points cost larger than the fee it is part of. Written,
 * like the one above, so that the tool's analytics files it under "other".
 */
export const POINTS_ABOVE_FEE = 'The points cost is more than the fee above. The fee includes the points, so it cannot be smaller. Enter a larger fee or a smaller points cost.';

/**
 * Whether the points cost is more than the fee. The points are part of the
 * fee, so the offer without points is "fee minus points cost". With a fee
 * of 1,000 and points of 2,500 that used to be clamped to zero: break-even
 * was then worked out on a cost of 1,000, a wrong figure that looked right,
 * and with no fee at all the cost vanished and the row said "n/a" (#531).
 * The two boxes contradict each other, so the offer says so.
 */
export function pointsCostAboveFee(v: VendorInput): boolean {
  const cost = parseNumber(v.pointsCostMajor);
  if (!Number.isFinite(cost) || cost <= 0) return false;
  return cost > (parseNumber(v.feeMajor) || 0);
}

/**
 * The message for an offer whose rate changes, with the month of the change
 * or the later rate left out. Only the page's phrase list reads it
 * (`ENGINE_PHRASES`): the reader sees the catalog's sentence, which names the
 * two boxes by their labels. Those labels hold the word "rate", which the
 * tool's analytics would file as a rate that is missing, so this sentence is
 * written without it, to be filed under "other" like the two above.
 */
export const RATE_CHANGE_INCOMPLETE = 'A changing offer needs both of its boxes: the months before the change and the percentage after it. Fill in both, or choose the fixed kind.';

/** The two boxes of a rate that changes. */
export type RateChangeField = 'initialFixedMonths' | 'subsequentRatePct';

/**
 * The boxes of a changing rate that are left out: an empty later rate, and a
 * month of the change that is empty or zero. Both are on the page
 * only for a loan with a term and a rate that changes, and both are needed
 * there. Without either, the offer used to be worked out at its starting
 * rate for the whole term, with no word of it, and could be named the lowest
 * total because a box was empty (#818). A box that holds something
 * unreadable is not listed here: `unreadableOptionalFields` has it, and a
 * month that is part of one ("0.4", "60.5") is `fixedPeriodFault`'s.
 */
export function missingRateChangeFields(v: VendorInput): RateChangeField[] {
  if (v.rateKind !== 'hybrid' || v.modeKind !== 'term') return [];
  const out: RateChangeField[] = [];
  if (v.initialFixedMonths.trim() === '' || parseNumber(v.initialFixedMonths) === 0) out.push('initialFixedMonths');
  if (v.subsequentRatePct.trim() === '') out.push('subsequentRatePct');
  return out;
}

/**
 * Whether the month of the rate change is part of a month: "60.4", "0.5".
 * These used to be rounded without a word, so half a month was worked out as
 * one and 60.4 as 60 (#914). It is an error on that box, said in its own
 * words. Zero and an empty box are "left out" (`missingRateChangeFields`),
 * and a negative or unreadable one is `unreadableOptionalFields`'s.
 */
export function fixedPeriodFault(v: VendorInput): boolean {
  if (v.rateKind !== 'hybrid' || v.modeKind !== 'term') return false;
  const months = parseNumber(v.initialFixedMonths);
  // Stryker disable next-line EqualityOperator: equivalent. Zero is a whole number, so `>= 0` answers the same for it.
  return months > 0 && !Number.isInteger(months);
}

/**
 * The optional boxes that hold something which is not what the box is for:
 * "€2,500" or "-300" as a fee, "200 a month" as an extra payment, "12-5000"
 * as a lump sum. Each of these used to be read as zero, or skipped, without
 * a word: a fee typed with a currency sign made an offer look free of fees
 * and lowered its APR. An empty box is not listed.
 */
export function unreadableOptionalFields(v: VendorInput): OptionalField[] {
  const out: OptionalField[] = [];
  const bad = isUnreadable;
  const numeric: OptionalField[] = ['feeMajor', 'pointsCostMajor', 'pointsRateReductionPct', 'extraMonthly', 'prepayPenaltyPct', 'prepayPenaltyUntilMonth'];
  for (const field of numeric) if (bad(v[field])) out.push(field);

  // The two boxes of a rate that changes are on the page only for such a loan.
  if (v.rateKind === 'hybrid' && v.modeKind === 'term') {
    if (bad(v.initialFixedMonths)) out.push('initialFixedMonths');
    if (bad(v.subsequentRatePct)) out.push('subsequentRatePct');
  }

  // Lump sums: every pair that is written must read as "month:amount".
  const pairs = v.lumpSumsEncoded.split(';').filter((pair) => pair.trim() !== '');
  // More than a link carries is invalid here too, or the sender could copy a
  // link that opens without them (#789).
  if (pairs.length > MAX_LINK_LUMP_SUMS || pairs.length !== parseLumpSums(v.lumpSumsEncoded).length) out.push('lumpSumsEncoded');

  return out;
}

/**
 * Whether the lump-sum box reads, pair by pair, and is wrong only in a month:
 * part of one ("12.5:5000"), or one outside 1 to 1,200. More pairs than a
 * link carries is a different fault, with the other message.
 */
export function lumpMonthFault(v: VendorInput): boolean {
  const pairs = v.lumpSumsEncoded.split(';').filter((pair) => pair.trim() !== '');
  return pairs.length <= MAX_LINK_LUMP_SUMS && lumpSumFault(v.lumpSumsEncoded) === 'month';
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
    // As typed: part of a month is the engine's to refuse, never rounded here (#914).
    const initialMonths = parseNumber(v.initialFixedMonths);
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
  // A lump sum in a month no loan has is said in its own words, when that is
  // all that is wrong: any box that does not read at all is said first.
  const unreadable = unreadableOptionalFields(v);
  if (unreadable.length > 0) return emptyResult(0, unreadable.length === 1 && lumpMonthFault(v) ? LUMP_MONTH : OPTIONAL_UNREADABLE);
  if (missingRateChangeFields(v).length > 0) return emptyResult(0, RATE_CHANGE_INCOMPLETE);
  if (fixedPeriodFault(v)) return emptyResult(0, INITIAL_FIXED_MONTHS);
  if (pointsCostAboveFee(v)) return emptyResult(0, POINTS_ABOVE_FEE);
  const { inputs, mode } = loanFromInput(v, currency);
  // A changing rate on a loan set by its payment has no term to change the
  // rate in, and that is what the offer says: whatever its two boxes, which
  // are not on the page, still hold, and whatever the payment would come to
  // (one too small to pay the loan off used to say that first, #914). The
  // engine is handed a changing rate of its own making, so it checks the
  // amount, the rate and the payment, says what is wrong with those, and
  // otherwise refuses for the term before it works anything out (#818).
  if (v.rateKind === 'hybrid' && v.modeKind === 'payment') {
    const rateSpec: RateSpec = { kind: 'hybrid', initialAnnualRate: inputs.annualRate, initialMonths: 1, subsequentAnnualRate: inputs.annualRate };
    return computeLoan({ ...inputs, rateSpec }, mode);
  }
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
  // The two boxes contradict each other; the offer itself carries the error.
  if (pointsCostAboveFee(v)) return null;

  const baseline: VendorInput = {
    ...v,
    // The points are part of the fee, so the offer without them has a fee
    // smaller by exactly their cost.
    feeMajor: String((parseNumber(v.feeMajor) || 0) - cost),
    // This offer has no points: without this, a fee made smaller by their
    // cost would itself be "less than the points cost".
    pointsCostMajor: '',
    pointsRateReductionPct: '',
    // Add the rate reduction back to recover the no-points rate.
    annualRatePct: String((parseNumber(v.annualRatePct) || 0) + reduction),
  };
  return computeFromInput(baseline, currency);
}

/**
 * Whether the comparison across the offers is withheld: one invalid offer is
 * enough, since a range over the others would name the wrong lowest and
 * spread (#793). An offer's own card depends on no other.
 */
export function comparisonWithheld(results: LoanResult[]): boolean {
  return results.some((r) => Boolean(r.error) || r.schedule.length === 0);
}

/** Whether a box of this offer holds the mark of a value that could not be read. */
export function holdsMarker(v: VendorInput): boolean {
  return Object.entries(v).some(([key, value]) => key !== 'name' && String(value).split(/[;:]/).includes(UNREADABLE));
}
