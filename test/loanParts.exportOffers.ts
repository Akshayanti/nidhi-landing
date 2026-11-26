/**
 * Small loans worked out by hand, for the tests of the loan comparison's
 * spreadsheet (src/utils/loan/export.test.ts) and printed report
 * (src/utils/loan/report.test.ts). No DOM.
 *
 * Every offer borrows 1,200.00 so each month's figures can be checked on
 * paper. At 12% a year (1% a month) over 3 months the payment is
 * 1,200 x 0.01 / (1 - 1.01^-3) = 408.0265, so 408.03:
 *
 *   month  payment  interest  principal  balance
 *     1     408.03    12.00     396.03    803.97
 *     2     408.03     8.04     399.99    403.98
 *     3     408.02     4.04     403.98      0.00
 *
 * The tests state the figures they expect as numbers; nothing here works an
 * expectation out.
 */
import { loanComparisonEn } from '../src/i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { computeFromInput } from '../src/utils/loan/inputs.ts';
import type { LoanResult } from '../src/utils/loan/math.ts';
import type { LoanExport } from '../src/utils/loan/export.ts';
import type { VendorInput } from '../src/utils/loan/url.ts';
import type { Cell } from '../src/utils/shared/xlsx.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

export const island = TOOL_STRINGS.en.loanComparison.island;
export const common = TOOL_STRINGS.en.export;

/** An offer's boxes: 1,200.00 at 12% over 3 months, every optional box empty. */
export const offer = (over: Partial<VendorInput> = {}): VendorInput => ({
  name: '',
  principal: '1200',
  annualRatePct: '12',
  modeKind: 'term',
  termMonths: '3',
  monthlyPayment: '',
  feeMajor: '',
  extraMonthly: '',
  rateKind: 'fixed',
  initialFixedMonths: '',
  subsequentRatePct: '',
  rateChangeKeeps: 'term',
  pointsCostMajor: '',
  pointsRateReductionPct: '',
  lumpSumsEncoded: '',
  prepayPenaltyPct: '',
  prepayPenaltyUntilMonth: '',
  ...over,
});

/** The loan in the table above, with a fee of 12.00. */
export const FIXED = offer({ feeMajor: '12' });

/** The same loan with the payment typed and the months worked out. */
export const BY_PAYMENT = offer({ modeKind: 'payment', termMonths: '', monthlyPayment: '408.03' });

/**
 * 12% for one month, then 24% (2% a month), the term kept. After month 1 the
 * 803.97 left is repaid over 2 months: 803.97 x 0.02 / (1 - 1.02^-2) = 414.08.
 *
 *   month  payment  interest  principal  balance
 *     1     408.03    12.00     396.03    803.97
 *     2     414.08    16.08     398.00    405.97
 *     3     414.09     8.12     405.97      0.00
 */
export const RESET = offer({ rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '24' });

/**
 * The same rates with the payment kept at 408.03: it still ends in month 3.
 *
 *   month  payment  interest  principal  balance
 *     2     408.03    16.08     391.95    412.02
 *     3     420.26     8.24     412.02      0.00
 */
export const KEPT = offer({ rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '24', rateChangeKeeps: 'payment' });

/**
 * Never paid off: 0% for one month over 24 months is 50.00 a month; then 60%
 * (5% a month) on the 1,150.00 left is 57.50 of interest, more than the
 * payment kept, so the balance grows.
 *
 *   month  payment  interest  principal  balance
 *     1      50.00     0.00      50.00   1,150.00
 *     2      50.00    57.50      -7.50   1,157.50
 *     3      50.00    57.88      -7.88   1,165.38
 */
export const NEVER = offer({ annualRatePct: '0', termMonths: '24', rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '60', rateChangeKeeps: 'payment' });

/**
 * Paid off before its rate changes in month 3, by a lump sum of 500.00 in month 1.
 *
 *   month  payment  interest  principal  balance
 *     1     908.03    12.00     896.03    303.97
 *     2     307.01     3.04     303.97      0.00
 */
export const EARLY = offer({ rateKind: 'hybrid', initialFixedMonths: '2', subsequentRatePct: '24', lumpSumsEncoded: '1:500' });

/** An offer with no amount: it cannot be worked out. */
export const BROKEN = offer({ principal: '' });

export const result = (v: VendorInput, currency = 'USD'): LoanResult => computeFromInput(v, currency);

/** What the island hands the spreadsheet, for these offers under these names. */
export function exportOf(offers: [string, VendorInput][], over: Partial<LoanExport> = {}): LoanExport {
  const currency = over.currency ?? 'USD';
  return {
    island,
    common,
    currency,
    vendors: offers.map(([, v]) => v),
    results: offers.map(([, v]) => result(v, currency)),
    names: offers.map(([name]) => name),
    date: '2026-11-24',
    page: 'https://nidhi.today/free/loan-comparison/',
    ...over,
  };
}

export const head = (...titles: string[]): Cell[] => titles.map((title) => ({ t: title, bold: true }));
export const amount = (n: number): Cell => ({ n, fmt: 'amount2' });
export const whole = (n: number): Cell => ({ n, fmt: 'integer' });
export const pct = (n: number): Cell => ({ n, fmt: 'decimal2' });

/**
 * What a stream of monthly payments is worth today at a yearly rate in per
 * cent: the check on an APR that does not use the tool's own solver. At the
 * right APR this is the amount borrowed less the fee.
 */
export function worthToday(payments: number[], aprPct: number): number {
  const monthly = aprPct / 100 / 12;
  return payments.reduce((sum, payment, i) => sum + payment / (1 + monthly) ** (i + 1), 0);
}
