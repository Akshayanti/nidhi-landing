/**
 * Small offers for the tests of the loan comparison's horizon and refinance
 * sections, entered the way a reader types them and run through the engine as
 * the page runs them. Each is worked out by hand in its comment, so a test
 * can state the figure a reader should see without asking the engine for it.
 * Amounts are in euros unless a test says otherwise.
 */
import { computeFromInput, loanFromInput } from '../src/utils/loan/inputs.ts';
import { refinanceComparison, type LoanResult, type RefinanceComparison } from '../src/utils/loan/math.ts';
import { DEFAULT_GLOBAL_STATE, makeDefaultVendor, type GlobalState, type VendorInput } from '../src/utils/loan/url.ts';

/** An offer in slot `slot` with every optional box empty, and the boxes given. */
const offer = (boxes: Partial<VendorInput>, slot = 0): VendorInput => ({
  ...makeDefaultVendor(slot),
  principal: '1200',
  annualRatePct: '0',
  modeKind: 'term',
  termMonths: '12',
  monthlyPayment: '',
  feeMajor: '',
  extraMonthly: '',
  ...boxes,
});

/** 1,200.00 at 0% over 12 months: 100.00 a month, 1,200.00 in all, no interest. */
export const plain = (slot = 0): VendorInput => offer({}, slot);

/**
 * 1,200.00 at 12% a year (1% a month) over 3 months. The payment is
 * 1,200 x 0.01 / (1 - 1.01^-3) = 408.03.
 *   Month 1: 12.00 of interest, 396.03 off the loan, 803.97 left.
 *   Month 2:  8.04 of interest, 399.99 off the loan, 403.98 left.
 *   Month 3:  4.04 of interest, 408.02 to close.
 * 1,224.08 in all, 24.08 of it interest.
 */
export const dear = (slot = 0): VendorInput => offer({ annualRatePct: '12', termMonths: '3' }, slot);

/** 12,000.00 at 0% over 120 months: 100.00 a month for ten years. */
export const long = (slot = 0): VendorInput => offer({ principal: '12000', termMonths: '120' }, slot);

/** `plain` with a fee of 60.00 paid at the start. */
export const withFee = (slot = 0): VendorInput => offer({ feeMajor: '60' }, slot);

/** `plain` with a charge of 2% of what is still owed if it is cleared in its first `until` months. */
export const withPenalty = (until: number, slot = 0): VendorInput =>
  offer({ prepayPenaltyPct: '2', prepayPenaltyUntilMonth: String(until) }, slot);

/**
 * `plain` with 250.00 extra each month: 350.00 a month, so 850.00 is left
 * after month 1, 500.00 after month 2, 150.00 after month 3, and month 4
 * clears it. Paid off in 4 months, 1,200.00 in all.
 */
export const withExtra = (slot = 0): VendorInput => offer({ extraMonthly: '250' }, slot);

/** 999.00 at 0% over 9 months: 111.00 a month, 999.00 in all. */
export const small = (slot = 0): VendorInput => offer({ principal: '999', termMonths: '9' }, slot);

/** An offer with no loan amount: the engine answers with an error and no schedule. */
export const invalid = (slot = 0): VendorInput => offer({ principal: '0' }, slot);

/**
 * The payment kept at 100.00 while the rate goes from 0% to 120% after one
 * month: 1,100.00 left costs 110.00 a month, more than the payment. The
 * balance grows and the loan is never paid off.
 */
export const neverPaid = (slot = 0): VendorInput =>
  offer({ rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '120', rateChangeKeeps: 'payment' }, slot);

/**
 * 12,000.00 at 12% a year over 60 months. Refinanced at month 1 into 9% over
 * 120 months with closing costs put into the loan, the lower rate soon makes
 * up the costs, but ten years of interest cost more in total.
 */
export const stretched = (slot = 0): VendorInput => offer({ principal: '12000', annualRatePct: '12', termMonths: '60' }, slot);

/** The results of these offers, as the page computes them. */
export const resultsOf = (vendors: VendorInput[], currency = 'EUR'): LoanResult[] =>
  vendors.map((v) => computeFromInput(v, currency));

/** The refinance boxes: the first offer at month 6, into 0% over 12 months, no closing costs, unless given. */
export const scenario = (boxes: Partial<GlobalState> = {}): GlobalState => ({
  ...DEFAULT_GLOBAL_STATE,
  currency: 'EUR',
  refiVendorIndex: '1',
  refiAtMonth: '6',
  refiNewRatePct: '0',
  refiNewTermMonths: '12',
  refiNewFeeMajor: '',
  refiRollFee: false,
  ...boxes,
});

/** What the engine makes of refinancing this offer, with amounts in cents. */
export function refinanced(
  vendor: VendorInput,
  at: number,
  yearlyRate: number,
  term: number,
  feeMinor = 0,
  rolled = false,
): RefinanceComparison | { error: string } {
  return refinanceComparison(computeFromInput(vendor, 'EUR'), at, yearlyRate, term, feeMinor, rolled, loanFromInput(vendor, 'EUR'));
}
