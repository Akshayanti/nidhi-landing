/**
 * Loan amortization utilities, currency-aware.
 *
 * Precision strategy
 * ------------------
 * All monetary values are kept as integer minor units (the smallest indivisible
 * unit for the currency: cents for USD/EUR/GBP/INR/CZK, yen for JPY, etc.) for
 * any sum, comparison, or schedule step. JavaScript `number` is IEEE 754 double
 * precision and has 53 bits of integer precision, which is safe well beyond
 * any realistic loan amount.
 *
 * Each currency has a "factor" = 10^(decimal places) read from
 * `Intl.NumberFormat(...).resolvedOptions().minimumFractionDigits`. The
 * amortization runs in integer minor units regardless of the currency, so the
 * sum of principal payments matches the original loan amount exactly. The
 * final payment in each schedule is reconciled to clear the balance.
 *
 * Display formatting respects the currency's locale conventions, including
 * Indian-style lakh/crore grouping for INR (e.g. "₹1,23,45,678").
 */

// -----------------------------------------------------------------------------
// Currency catalogue
// -----------------------------------------------------------------------------

export interface CurrencyInfo {
  code: string;
  label: string;
  /** Locale used for display formatting; controls grouping conventions. */
  locale: string;
  /** Number of minor units per major unit (10^decimals). Filled in lazily. */
  factor: number;
}

const RAW_CURRENCIES: Omit<CurrencyInfo, 'factor'>[] = [
  { code: 'USD', label: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'INR', label: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'JPY', label: 'Japanese Yen (JPY)', locale: 'ja-JP' },
  { code: 'CZK', label: 'Czech Koruna (CZK)', locale: 'cs-CZ' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar (AUD)', locale: 'en-AU' },
  { code: 'CHF', label: 'Swiss Franc (CHF)', locale: 'de-CH' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)', locale: 'en-SG' },
  { code: 'KRW', label: 'South Korean Won (KRW)', locale: 'ko-KR' },
];

function resolveFactor(code: string): number {
  try {
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    });
    const digits = fmt.resolvedOptions().minimumFractionDigits ?? 2;
    return Math.pow(10, digits);
  } catch {
    return 100;
  }
}

export const CURRENCIES: CurrencyInfo[] = RAW_CURRENCIES.map((c) => ({
  ...c,
  factor: resolveFactor(c.code),
}));

const CURRENCY_BY_CODE: Record<string, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export const DEFAULT_CURRENCY = 'USD';

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCY_BY_CODE[code] ?? CURRENCY_BY_CODE[DEFAULT_CURRENCY];
}

// -----------------------------------------------------------------------------
// Money primitives
// -----------------------------------------------------------------------------

/** Round a (possibly fractional) minor-unit value to integer, half-away-from-zero. */
export function roundMinor(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return units >= 0 ? Math.floor(units + 0.5) : -Math.floor(-units + 0.5);
}

/** Convert a major-unit amount (e.g. dollars, rupees, yen) to integer minor units. */
export function toMinor(amount: number, currencyCode: string): number {
  if (!Number.isFinite(amount)) return 0;
  const { factor } = getCurrency(currencyCode);
  return roundMinor(amount * factor);
}

/** Convert minor units back to major units (number; lossy display only). */
export function fromMinor(units: number, currencyCode: string): number {
  const { factor } = getCurrency(currencyCode);
  return units / factor;
}

/**
 * Format an integer minor-units value as a localized currency string.
 * Uses the currency's locale, so INR renders with Indian-style 2,3,3 grouping
 * (e.g. ₹1,23,45,678) and JPY renders with no decimals.
 */
export function formatMoney(units: number, currencyCode: string): string {
  const { code, locale } = getCurrency(currencyCode);
  const value = fromMinor(units, code);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
  }).format(value);
}

// -----------------------------------------------------------------------------
// Amortization
// -----------------------------------------------------------------------------

export interface AmortizationRow {
  /** 1-based month index. */
  month: number;
  /** Total payment for the month, in minor units. */
  payment: number;
  /** Interest portion, in minor units. */
  interest: number;
  /** Principal portion, in minor units. */
  principal: number;
  /** Remaining balance after this payment, in minor units. */
  balance: number;
}

export interface LoanInputs {
  /** Loan principal in minor units. */
  principalMinor: number;
  /** Annual interest rate as a decimal (e.g. 0.065 for 6.5%). */
  annualRate: number;
  /** Origination/closing fee in minor units. */
  feeMinor?: number;
  /** Optional extra principal payment each month, in minor units. */
  extraMonthlyMinor?: number;
}

export type LoanMode =
  | { kind: 'term'; months: number }
  | { kind: 'payment'; monthlyMinor: number };

export interface LoanResult {
  monthlyPaymentMinor: number;
  effectiveMonthlyMinor: number;
  months: number;
  totalPaidMinor: number;
  totalInterestMinor: number;
  feeMinor: number;
  schedule: AmortizationRow[];
  warnings: string[];
  error?: string;
}

const MAX_TERM_MONTHS = 1200;

export function computeScheduledPaymentMinor(
  principalMinor: number,
  annualRate: number,
  months: number,
): number {
  if (months <= 0) return 0;
  if (annualRate === 0) {
    return roundMinor(principalMinor / months);
  }
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, -months);
  const payment = (principalMinor * r) / (1 - factor);
  return roundMinor(payment);
}

export function computeMonthsForPayment(
  principalMinor: number,
  annualRate: number,
  monthlyMinor: number,
): number {
  if (monthlyMinor <= 0) return Infinity;
  if (annualRate > 0) {
    // Quick "never pays off" detection without simulating the loop.
    const r = annualRate / 12;
    if (monthlyMinor <= principalMinor * r) return Infinity;
  }
  // Delegate to the integer-cent schedule so the answer agrees, to the month,
  // with the schedule a caller will actually see. The closed-form estimate
  // n = -ln(1 - P*r/M)/ln(1+r) is fast but disagrees by one month at the
  // boundary because the payment is rounded to the cent, so the schedule
  // reconciles the final payment and the closed form's `ceil` is one month
  // too high in those cases.
  const { schedule, error } = buildSchedule(principalMinor, annualRate, monthlyMinor);
  if (error || schedule.length === 0) return Infinity;
  return schedule.length;
}

export function buildSchedule(
  principalMinor: number,
  annualRate: number,
  paymentMinor: number,
  extraMinor: number = 0,
): { schedule: AmortizationRow[]; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  if (principalMinor <= 0) {
    return { schedule: [], warnings, error: 'Principal must be greater than zero.' };
  }
  if (paymentMinor <= 0) {
    return { schedule: [], warnings, error: 'Monthly payment must be greater than zero.' };
  }

  const r = annualRate / 12;
  let balance = principalMinor;
  const schedule: AmortizationRow[] = [];

  if (annualRate > 0) {
    const interestFirstMonth = roundMinor(balance * r);
    if (paymentMinor + extraMinor <= interestFirstMonth) {
      return {
        schedule: [],
        warnings,
        error: 'Monthly payment is too low to ever pay off the loan; it does not even cover the first month\'s interest.',
      };
    }
  }

  while (balance > 0 && schedule.length < MAX_TERM_MONTHS) {
    const interest = annualRate === 0 ? 0 : roundMinor(balance * r);
    let payment = paymentMinor + extraMinor;
    let principal = payment - interest;

    if (principal >= balance) {
      principal = balance;
      payment = principal + interest;
      balance = 0;
    } else {
      balance -= principal;
    }

    schedule.push({
      month: schedule.length + 1,
      payment,
      interest,
      principal,
      balance,
    });
  }

  if (balance > 0) {
    return {
      schedule,
      warnings,
      error: `Loan does not amortize within ${MAX_TERM_MONTHS} months. Increase the monthly payment.`,
    };
  }

  const principalSum = schedule.reduce((s, row) => s + row.principal, 0);
  if (principalSum !== principalMinor) {
    warnings.push(
      `Internal precision check: principal sum ${principalSum} ≠ ${principalMinor}. Please report this.`,
    );
  }

  return { schedule, warnings };
}

export function computeLoan(inputs: LoanInputs, mode: LoanMode): LoanResult {
  const { principalMinor, annualRate } = inputs;
  const feeMinor = inputs.feeMinor ?? 0;
  const extraMonthlyMinor = inputs.extraMonthlyMinor ?? 0;

  if (!Number.isFinite(principalMinor) || principalMinor <= 0) {
    return emptyResult(feeMinor, 'Enter a loan amount greater than zero.');
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    return emptyResult(feeMinor, 'Enter a non-negative interest rate.');
  }

  let scheduledPayment: number;
  if (mode.kind === 'term') {
    if (!Number.isFinite(mode.months) || mode.months <= 0) {
      return emptyResult(feeMinor, 'Enter a term of at least one month.');
    }
    if (mode.months > MAX_TERM_MONTHS) {
      return emptyResult(feeMinor, `Term cannot exceed ${MAX_TERM_MONTHS} months.`);
    }
    scheduledPayment = computeScheduledPaymentMinor(principalMinor, annualRate, mode.months);
  } else {
    if (!Number.isFinite(mode.monthlyMinor) || mode.monthlyMinor <= 0) {
      return emptyResult(feeMinor, 'Enter a monthly payment greater than zero.');
    }
    scheduledPayment = mode.monthlyMinor;
  }

  const { schedule, warnings, error } = buildSchedule(
    principalMinor,
    annualRate,
    scheduledPayment,
    extraMonthlyMinor,
  );

  if (error || schedule.length === 0) {
    return {
      monthlyPaymentMinor: scheduledPayment,
      effectiveMonthlyMinor: scheduledPayment + extraMonthlyMinor,
      months: 0,
      totalPaidMinor: 0,
      totalInterestMinor: 0,
      feeMinor,
      schedule: [],
      warnings,
      error,
    };
  }

  const totalPayments = schedule.reduce((s, row) => s + row.payment, 0);
  const totalInterest = schedule.reduce((s, row) => s + row.interest, 0);
  const totalPaid = totalPayments + feeMinor;

  return {
    monthlyPaymentMinor: scheduledPayment,
    effectiveMonthlyMinor: scheduledPayment + extraMonthlyMinor,
    months: schedule.length,
    totalPaidMinor: totalPaid,
    totalInterestMinor: totalInterest,
    feeMinor,
    schedule,
    warnings,
  };
}

function emptyResult(feeMinor: number, error: string): LoanResult {
  return {
    monthlyPaymentMinor: 0,
    effectiveMonthlyMinor: 0,
    months: 0,
    totalPaidMinor: 0,
    totalInterestMinor: 0,
    feeMinor,
    schedule: [],
    warnings: [],
    error,
  };
}

export function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'n/a';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}
