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
  { code: 'AUD', label: 'Australian Dollar (AUD)', locale: 'en-AU' },
  { code: 'BRL', label: 'Brazilian Real (BRL)', locale: 'pt-BR' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', locale: 'en-CA' },
  { code: 'CHF', label: 'Swiss Franc (CHF)', locale: 'de-CH' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)', locale: 'zh-CN' },
  { code: 'CZK', label: 'Czech Koruna (CZK)', locale: 'cs-CZ' },
  { code: 'DKK', label: 'Danish Krone (DKK)', locale: 'da-DK' },
  { code: 'EUR', label: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'HKD', label: 'Hong Kong Dollar (HKD)', locale: 'zh-HK' },
  { code: 'HUF', label: 'Hungarian Forint (HUF)', locale: 'hu-HU' },
  { code: 'IDR', label: 'Indonesian Rupiah (IDR)', locale: 'id-ID' },
  { code: 'INR', label: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'ISK', label: 'Icelandic Króna (ISK)', locale: 'is-IS' },
  { code: 'JPY', label: 'Japanese Yen (JPY)', locale: 'ja-JP' },
  { code: 'KRW', label: 'South Korean Won (KRW)', locale: 'ko-KR' },
  { code: 'MXN', label: 'Mexican Peso (MXN)', locale: 'es-MX' },
  { code: 'MYR', label: 'Malaysian Ringgit (MYR)', locale: 'ms-MY' },
  { code: 'NOK', label: 'Norwegian Krone (NOK)', locale: 'nb-NO' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)', locale: 'en-NZ' },
  { code: 'PHP', label: 'Philippine Peso (PHP)', locale: 'fil-PH' },
  { code: 'PLN', label: 'Polish Złoty (PLN)', locale: 'pl-PL' },
  { code: 'RON', label: 'Romanian Leu (RON)', locale: 'ro-RO' },
  { code: 'SEK', label: 'Swedish Krona (SEK)', locale: 'sv-SE' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)', locale: 'en-SG' },
  { code: 'THB', label: 'Thai Baht (THB)', locale: 'th-TH' },
  { code: 'TRY', label: 'Turkish Lira (TRY)', locale: 'tr-TR' },
  { code: 'USD', label: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'ZAR', label: 'South African Rand (ZAR)', locale: 'en-ZA' },
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

/**
 * Tools default to EUR because the audience is global expats with EU as
 * the largest single segment (see brand pillar #3 in the messaging guide
 * in the app repo, and the Instagram playbook §1 for the audience map).
 * A USD default surprises the typical visitor; EUR defaults better and
 * users in other currencies switch via the dropdown in one click. The
 * URL state codec also omits the `cur` param when the user keeps the
 * default, so a EUR default keeps EU users' share links the shortest.
 */
export const DEFAULT_CURRENCY = 'EUR';

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCY_BY_CODE[code] ?? CURRENCY_BY_CODE[DEFAULT_CURRENCY];
}

// -----------------------------------------------------------------------------
// Money primitives
// -----------------------------------------------------------------------------

/** Half-away-from-zero so rounding is symmetric and the schedule never drifts negative. */
export function roundMinor(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return units >= 0 ? Math.floor(units + 0.5) : -Math.floor(-units + 0.5);
}

/** All math runs in integer minor units so principal sums match the original loan exactly. */
export function toMinor(amount: number, currencyCode: string): number {
  if (!Number.isFinite(amount)) return 0;
  const { factor } = getCurrency(currencyCode);
  return roundMinor(amount * factor);
}

/** Display-only; never feed the result back into computation. */
export function fromMinor(units: number, currencyCode: string): number {
  const { factor } = getCurrency(currencyCode);
  return units / factor;
}

/** Currencies that share the "$" symbol and need disambiguation. */
const DOLLAR_CURRENCIES = new Set(['USD', 'CAD', 'AUD', 'SGD', 'HKD', 'NZD']);

export function formatMoney(units: number, currencyCode: string): string {
  const { code, locale } = getCurrency(currencyCode);
  const value = fromMinor(units, code);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
  }).format(value);
  return DOLLAR_CURRENCIES.has(code) ? `${formatted} ${code}` : formatted;
}

// -----------------------------------------------------------------------------
// Amortization
// -----------------------------------------------------------------------------

export interface AmortizationRow {
  /** 1-based so it matches how users count ("month 1"), not how arrays index. */
  month: number;
  /** Total payment for the month, in minor units. Includes the regular
   *  scheduled payment, any extra monthly principal, and any lump sum
   *  applied that month. */
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

// -----------------------------------------------------------------------------
// Advanced loan shape
// -----------------------------------------------------------------------------

/**
 * Rate specification for a loan. We separate it from the simple
 * `annualRate: number` to preserve backward-compatibility, while letting
 * advanced inputs express hybrid (fixed-then-variable) loans without
 * inventing a ad-hoc fallback in every call site.
 *
 * Hybrid: fixed at `initialAnnualRate` for `initialMonths`, then
 * `subsequentAnnualRate` for the remainder. The payment is recast at the
 * transition so the loan still amortizes within its original term: at
 * month `initialMonths + 1` we re-solve the closed-form payment using the
 * remaining balance, the remaining months, and the subsequent rate.
 *
 * `subsequentAnnualRate` is the user's expectation for the post-fix
 * rate. It is not a market projection; the calculator surfaces it
 * unchanged. The "stress test" panel in the UI re-runs the math with a
 * higher subsequent rate so users can see the upside risk explicitly.
 */
export type RateSpec =
  | { kind: 'fixed'; annualRate: number }
  | {
      kind: 'hybrid';
      initialAnnualRate: number;
      initialMonths: number;
      subsequentAnnualRate: number;
    };

/** A one-off principal prepayment at a specific month. The amount is
 *  applied AFTER the scheduled payment (and any extra-monthly principal)
 *  for that month, so the lump sum hits the balance immediately and
 *  earns no interest the same month. */
export interface LumpSum {
  month: number;
  amountMinor: number;
}

/** Penalty charged if the loan is paid off early. Mirrors the most
 *  common contract clauses without trying to model every regional
 *  variation. */
export interface PrepaymentPenalty {
  /** Penalty as a fraction of the remaining balance at the moment of
   *  early payoff (e.g. 0.02 for 2%). Set to 0 to use only `flatMinor`. */
  pctOfBalance: number;
  /** Penalty applies only if the loan is fully paid off on or before
   *  this month (1-based). After this month, no penalty is charged. */
  untilMonth: number;
  /** Optional flat additional penalty in minor units. Combines additively
   *  with the percentage component. */
  flatMinor?: number;
}

/** Single accessor so callers don't branch on `spec.kind` at every call site. Safe to call inside loops. */
export function rateForMonth(spec: RateSpec, month: number): number {
  if (spec.kind === 'fixed') return spec.annualRate;
  return month <= spec.initialMonths ? spec.initialAnnualRate : spec.subsequentAnnualRate;
}

export interface LoanInputs {
  principalMinor: number;
  /** Annual interest rate as a decimal (e.g. 0.065 for 6.5%). For hybrid
   *  loans this is treated as the *initial* rate when no `rateSpec` is
   *  supplied; pass `rateSpec` explicitly to model a hybrid contract. */
  annualRate: number;
  feeMinor?: number;
  extraMonthlyMinor?: number;
  /** Advanced: full rate specification. Overrides `annualRate` when
   *  supplied. Use `{ kind: 'fixed', annualRate }` for parity with the
   *  simple input, or `{ kind: 'hybrid', ... }` for a fixed-then-variable
   *  loan. */
  rateSpec?: RateSpec;
  /** Advanced: zero or more lump-sum principal prepayments. Order is
   *  irrelevant; entries are applied at their specified months. */
  lumpSums?: LumpSum[];
  /** Advanced: penalty charged if the loan is paid off on or before
   *  `untilMonth`. Charged only when actual payoff (with extras + lumps)
   *  occurs strictly earlier than the contractual schedule would. */
  prepaymentPenalty?: PrepaymentPenalty;
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
  /**
   * Effective amortization schedule: includes any extra monthly principal the
   * user entered. This is what `months`, `totalPaidMinor`, and the
   * balance-over-time chart are derived from.
   */
  schedule: AmortizationRow[];
  /**
   * Contractual amortization schedule: the schedule the borrower is *required*
   * to follow, ignoring any voluntary extra principal. When extra principal
   * is zero, this is identical to `schedule`. APR is derived from this
   * schedule because regulators define APR on contractual cash flows; the
   * borrower's optional prepayments do not change the cost the lender is
   * charging.
   */
  contractSchedule: AmortizationRow[];
  /**
   * Nominal annual percentage rate (monthly rate × 12), expressed as a
   * decimal (e.g. 0.0633 for 6.33%). Folds the origination/closing fee
   * into the effective cost of borrowing by treating the fee as an upfront
   * deduction from the principal disbursed to the borrower. `NaN` when APR
   * is undefined (e.g. fee ≥ principal) and `0` when the loan has no
   * interest cost at all (zero rate, zero fee).
   *
   * For hybrid loans the contract schedule used here is the *as-disclosed*
   * schedule: initial rate for the fixed window, then the user's stated
   * subsequent rate for the rest of the term. Lenders quote APR on
   * exactly this assumption, so the number we surface lines up with
   * what users will see on their loan estimate.
   */
  aprNominal: number;
  /**
   * Prepayment penalty (in minor units) charged because of early payoff
   * under the supplied `prepaymentPenalty` clause. Already included in
   * `totalPaidMinor`. Zero when no penalty applies, either because no
   * clause was supplied or because the loan was not paid off early. */
  prepaymentPenaltyMinor: number;
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

/**
 * Single scheduler for all loan shapes (fixed, hybrid, with extras, with lumps).
 * Preserves the integer-cent invariant across every feature so the principal column sums
 * to exactly the original loan amount.
 */
export function buildScheduleAdvanced(spec: {
  principalMinor: number;
  rateSpec: RateSpec;
  totalMonths: number;
  basePaymentMinor: number;
  extraMonthlyMinor?: number;
  lumpSums?: LumpSum[];
}): { schedule: AmortizationRow[]; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  const principalMinor = spec.principalMinor;
  const totalMonths = Math.max(0, Math.floor(spec.totalMonths));
  const extraMonthlyMinor = Math.max(0, Math.floor(spec.extraMonthlyMinor ?? 0));
  const lumpSums = spec.lumpSums ?? [];

  if (principalMinor <= 0) {
    return { schedule: [], warnings, error: 'Principal must be greater than zero.' };
  }
  if (spec.basePaymentMinor <= 0) {
    return { schedule: [], warnings, error: 'Monthly payment must be greater than zero.' };
  }
  if (totalMonths <= 0) {
    return { schedule: [], warnings, error: 'Term must be at least one month.' };
  }

  // Pre-bucket lump sums by month. We tolerate multiple lumps in the same
  // month by summing them (rather than rejecting); the user's intent is
  // unambiguous and rejecting would be needlessly strict.
  const lumpByMonth = new Map<number, number>();
  for (const ls of lumpSums) {
    if (!Number.isFinite(ls.month) || ls.month < 1) continue;
    if (!Number.isFinite(ls.amountMinor) || ls.amountMinor <= 0) continue;
    const m = Math.floor(ls.month);
    lumpByMonth.set(m, (lumpByMonth.get(m) ?? 0) + Math.floor(ls.amountMinor));
  }

  // Initial-month interest sanity: payment must cover at least the first
  // month's interest, otherwise the loan never amortizes (under fixed
  // rate, anyway; for hybrid, the recast at the transition can rescue
  // an under-funded subsequent leg, but the initial leg still has to
  // pay down principal).
  const initialRate = rateForMonth(spec.rateSpec, 1);
  if (initialRate > 0) {
    const initialInterest = roundMinor(principalMinor * (initialRate / 12));
    if (spec.basePaymentMinor + extraMonthlyMinor <= initialInterest) {
      return {
        schedule: [],
        warnings,
        error:
          "Monthly payment is too low to ever pay off the loan; it does not even cover the first month's interest.",
      };
    }
  }

  const schedule: AmortizationRow[] = [];
  let balance = principalMinor;
  let currentPayment = spec.basePaymentMinor;
  let recastApplied = false;

  for (let month = 1; month <= MAX_TERM_MONTHS && balance > 0; month++) {
    // Recast the scheduled payment at the start of the post-fix leg of
    // a hybrid loan. We re-solve the closed-form payment for the
    // remaining balance over the remaining contractual months at the
    // subsequent rate. If the user's basePayment is custom (e.g. they
    // typed a fixed payment in the UI), we still recast: the moment
    // the rate changes, the same dollar payment splits differently
    // between interest and principal, and continuing without recast
    // would bend the schedule away from the contract's actual shape.
    if (
      spec.rateSpec.kind === 'hybrid' &&
      !recastApplied &&
      month === spec.rateSpec.initialMonths + 1
    ) {
      const remainingMonths = Math.max(1, totalMonths - spec.rateSpec.initialMonths);
      currentPayment = computeScheduledPaymentMinor(
        balance,
        spec.rateSpec.subsequentAnnualRate,
        remainingMonths,
      );
      recastApplied = true;
      if (spec.rateSpec.subsequentAnnualRate > 0) {
        const monthsInterest = roundMinor(balance * (spec.rateSpec.subsequentAnnualRate / 12));
        if (currentPayment + extraMonthlyMinor <= monthsInterest) {
          // Subsequent rate is so high that even the recast payment
          // can't beat interest. Surface as warning rather than error
          // so the user still sees the partial schedule.
          warnings.push(
            'After the initial fixed period, the subsequent rate is so high that the recast payment barely covers interest.',
          );
        }
      }
    }

    const r = rateForMonth(spec.rateSpec, month) / 12;
    const interest = r === 0 ? 0 : roundMinor(balance * r);
    let payment = currentPayment + extraMonthlyMinor;
    let principal = payment - interest;

    if (principal >= balance) {
      // Last regular row: shrink payment to clear exactly.
      principal = balance;
      payment = principal + interest;
      balance = 0;
    } else {
      balance -= principal;
    }

    // Apply lump sum AFTER the regular payment for this month. The lump
    // is principal-only; it doesn't accrue interest the same month
    // because interest was already computed on the pre-payment balance.
    const lump = lumpByMonth.get(month) ?? 0;
    if (lump > 0 && balance > 0) {
      const applied = Math.min(lump, balance);
      balance -= applied;
      payment += applied;
      principal += applied;
    }

    schedule.push({ month, payment, interest, principal, balance });

    if (balance <= 0) break;
  }

  if (balance > 0) {
    return {
      schedule,
      warnings,
      error: `Loan does not amortize within ${MAX_TERM_MONTHS} months. Increase the monthly payment.`,
    };
  }

  // Defensive precision check. The integer-cent invariant should hold by
  // construction; if it ever fails we surface a warning rather than
  // silently mis-reporting totals.
  const principalSum = schedule.reduce((s, row) => s + row.principal, 0);
  if (principalSum !== principalMinor) {
    warnings.push(
      `Internal precision check: principal sum ${principalSum} ≠ ${principalMinor}. Please report this.`,
    );
  }

  return { schedule, warnings };
}

/** Every code path that needs rate information gets a single shape, regardless of how the user entered it. */
function resolveRateSpec(inputs: LoanInputs): RateSpec {
  if (inputs.rateSpec) return inputs.rateSpec;
  return { kind: 'fixed', annualRate: inputs.annualRate };
}

export function computeLoan(inputs: LoanInputs, mode: LoanMode): LoanResult {
  const { principalMinor } = inputs;
  const feeMinor = inputs.feeMinor ?? 0;
  const extraMonthlyMinor = inputs.extraMonthlyMinor ?? 0;
  const lumpSums = inputs.lumpSums ?? [];
  const penalty = inputs.prepaymentPenalty;
  const rateSpec = resolveRateSpec(inputs);

  if (!Number.isFinite(principalMinor) || principalMinor <= 0) {
    return emptyResult(feeMinor, 'Enter a loan amount greater than zero.');
  }

  // Validate every rate the spec exposes. A negative subsequent rate is
  // just as invalid as a negative nominal rate; refusing to compute keeps
  // the UI honest.
  const ratesToCheck =
    rateSpec.kind === 'fixed'
      ? [rateSpec.annualRate]
      : [rateSpec.initialAnnualRate, rateSpec.subsequentAnnualRate];
  for (const r of ratesToCheck) {
    if (!Number.isFinite(r) || r < 0) {
      return emptyResult(feeMinor, 'Enter a non-negative interest rate.');
    }
  }
  if (rateSpec.kind === 'hybrid') {
    if (
      !Number.isFinite(rateSpec.initialMonths) ||
      rateSpec.initialMonths <= 0 ||
      rateSpec.initialMonths >= MAX_TERM_MONTHS
    ) {
      return emptyResult(feeMinor, 'Initial fixed period must be a positive number of months.');
    }
  }

  let totalMonths: number;
  let scheduledPayment: number;
  if (mode.kind === 'term') {
    if (!Number.isFinite(mode.months) || mode.months <= 0) {
      return emptyResult(feeMinor, 'Enter a term of at least one month.');
    }
    if (mode.months > MAX_TERM_MONTHS) {
      return emptyResult(feeMinor, `Term cannot exceed ${MAX_TERM_MONTHS} months.`);
    }
    totalMonths = Math.floor(mode.months);
    // Closed-form payment uses the *initial* rate (or the only rate, for
    // fixed). The advanced builder will recast at the hybrid transition.
    scheduledPayment = computeScheduledPaymentMinor(
      principalMinor,
      rateForMonth(rateSpec, 1),
      totalMonths,
    );
  } else {
    if (!Number.isFinite(mode.monthlyMinor) || mode.monthlyMinor <= 0) {
      return emptyResult(feeMinor, 'Enter a monthly payment greater than zero.');
    }
    if (rateSpec.kind === 'hybrid') {
      // Payment-mode + hybrid is ill-defined: we don't know what term
      // the user is contracting for, and recasting requires that. The
      // UI gates this; we double-belt here.
      return emptyResult(
        feeMinor,
        'Hybrid-rate loans must be entered in term mode (monthly payment is computed).',
      );
    }
    scheduledPayment = mode.monthlyMinor;
    // For payment-mode fixed loans we don't have a contractual term;
    // simulate up to MAX_TERM_MONTHS and use the actual payoff length.
    totalMonths = MAX_TERM_MONTHS;
  }

  // Effective schedule: applies any voluntary extra principal AND lump
  // sums. Drives the user-facing "months", "total paid", and the
  // balance chart.
  const { schedule, warnings, error } = buildScheduleAdvanced({
    principalMinor,
    rateSpec,
    totalMonths,
    basePaymentMinor: scheduledPayment,
    extraMonthlyMinor,
    lumpSums,
  });

  if (error || schedule.length === 0) {
    return {
      monthlyPaymentMinor: scheduledPayment,
      effectiveMonthlyMinor: scheduledPayment + extraMonthlyMinor,
      months: 0,
      totalPaidMinor: 0,
      totalInterestMinor: 0,
      feeMinor,
      schedule: [],
      contractSchedule: [],
      aprNominal: NaN,
      prepaymentPenaltyMinor: 0,
      warnings,
      error,
    };
  }

  // Contract schedule: the obligation absent any voluntary action. APR
  // is solved against this schedule because regulators define APR on
  // contractual cash flows. When neither extras nor lump sums exist,
  // the contract schedule is identical to the effective schedule and
  // we reuse it to avoid duplicate work.
  const hasVoluntaryActions = extraMonthlyMinor > 0 || lumpSums.length > 0;
  const contractSchedule = hasVoluntaryActions
    ? buildScheduleAdvanced({
        principalMinor,
        rateSpec,
        totalMonths,
        basePaymentMinor: scheduledPayment,
        extraMonthlyMinor: 0,
        lumpSums: [],
      }).schedule
    : schedule;

  // Prepayment penalty: applies when the effective schedule pays the
  // loan off strictly earlier than the contract would, AND the early
  // payoff falls on or before `untilMonth`. We charge on the balance at
  // the moment of the early payoff (the row right before the loan
  // clears).
  let prepaymentPenaltyMinor = 0;
  if (penalty && schedule.length < contractSchedule.length) {
    const lastRow = schedule[schedule.length - 1];
    if (lastRow && lastRow.month <= penalty.untilMonth) {
      // The balance at the moment of payoff is the balance the row
      // *cleared*: i.e., the row's `principal` minus any already-credited
      // amount. Equivalently: pre-row balance, which is the previous
      // row's balance, or principalMinor if it's the first row.
      const preRowBalance =
        schedule.length === 1
          ? principalMinor
          : schedule[schedule.length - 2].balance;
      const pct = Math.max(0, penalty.pctOfBalance);
      const flat = Math.max(0, Math.floor(penalty.flatMinor ?? 0));
      prepaymentPenaltyMinor = roundMinor(preRowBalance * pct) + flat;
    }
  }

  const totalPayments = schedule.reduce((s, row) => s + row.payment, 0);
  const totalInterest = schedule.reduce((s, row) => s + row.interest, 0);
  const totalPaid = totalPayments + feeMinor + prepaymentPenaltyMinor;

  const aprNominal = computeApr(principalMinor, feeMinor, contractSchedule);

  return {
    monthlyPaymentMinor: scheduledPayment,
    effectiveMonthlyMinor: scheduledPayment + extraMonthlyMinor,
    months: schedule.length,
    totalPaidMinor: totalPaid,
    totalInterestMinor: totalInterest,
    feeMinor,
    schedule,
    contractSchedule,
    aprNominal,
    prepaymentPenaltyMinor,
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
    contractSchedule: [],
    aprNominal: NaN,
    prepaymentPenaltyMinor: 0,
    warnings: [],
    error,
  };
}

// -----------------------------------------------------------------------------
// APR
// -----------------------------------------------------------------------------

/**
 * Compute the nominal Annual Percentage Rate (APR) for a loan, expressed as
 * a decimal (e.g. `0.0633` for 6.33%).
 *
 * Definition used here (matches US Reg Z and EU consumer-credit conventions
 * directionally; jurisdictions disagree on which fees count, which is why
 * the calculator labels the field generically as "origination/closing fee"
 * and lets the user decide what to fold in):
 *
 *   - The lender disburses `principalMinor − feeMinor` to the borrower
 *     (the borrower receives the principal but pays the fee out of pocket
 *     at origination, which is mathematically equivalent to the lender
 *     handing over the net amount).
 *   - The borrower repays the full contractual payment stream as captured
 *     in `contractSchedule`.
 *   - APR is the rate at which the present value of the payment stream,
 *     discounted monthly, equals the net amount disbursed.
 *   - We report the nominal annualization (`monthly_rate × 12`) rather
 *     than the effective annualization (`(1+i)^12 − 1`). Nominal is the
 *     convention almost every regulator uses on consumer-loan
 *     disclosures, and matches the way users compare APR figures from
 *     real lenders.
 *
 * Solver: bisection on the present-value function. PV is strictly
 * decreasing in `i`, so bisection always converges; we cap at 200
 * iterations and 1e-14 tolerance on `i`. Pure arithmetic, no DOM, no
 * dependencies, so it's safe to call in the React render path.
 *
 * Returns:
 *   - A non-negative finite number on success.
 *   - `0` exactly when there is no cost of borrowing (zero rate, zero fee).
 *   - `NaN` when APR is mathematically undefined: empty schedule, fee
 *     greater than or equal to principal, or the bisection failed to
 *     bracket a solution (which would only happen for absurd inputs the
 *     calculator should already have rejected).
 */
export function computeApr(
  principalMinor: number,
  feeMinor: number,
  contractSchedule: AmortizationRow[],
): number {
  if (!Number.isFinite(principalMinor) || principalMinor <= 0) return NaN;
  if (!Number.isFinite(feeMinor) || feeMinor < 0) return NaN;
  if (contractSchedule.length === 0) return NaN;

  const netAdvance = principalMinor - feeMinor;
  // Fee that consumes the entire principal (or more) leaves the borrower
  // with zero or negative net proceeds. The PV equation has no positive
  // solution; refusing to invent one keeps the UI honest.
  if (netAdvance <= 0) return NaN;

  // Capture payment amounts up front so the inner PV closure does not
  // re-walk the schedule on every iteration.
  const payments: number[] = contractSchedule.map((r) => r.payment);
  const sumPayments = payments.reduce((s, p) => s + p, 0);

  // pv(i): sum_{t=1..n} payment_t / (1+i)^t
  // Guarded against pathological i ≤ −1 by the bisection bounds below.
  const pv = (i: number): number => {
    if (i === 0) return sumPayments;
    let total = 0;
    const factor = 1 + i;
    let denom = factor;
    for (let k = 0; k < payments.length; k++) {
      total += payments[k] / denom;
      denom *= factor;
    }
    return total;
  };

  // pv is strictly decreasing in i for positive payments. We need the i at
  // which pv(i) = netAdvance.
  //
  //   - At i = 0, pv = sum of payments. For any positive nominal rate or
  //     positive fee the lender's return is positive, so sum > netAdvance.
  //   - For a true zero-cost loan (zero rate AND zero fee) pv(0) equals
  //     netAdvance exactly; APR is 0.
  //   - As i → ∞, pv → 0, eventually crossing below netAdvance.
  const pvAtZero = pv(0);
  if (pvAtZero <= netAdvance) {
    // Either an exactly-zero-cost loan (return 0) or a nonsensical case
    // where payments don't even repay the net advance. The latter cannot
    // arise from valid `computeLoan` inputs because we always solve for
    // a payment that fully amortizes principalMinor, but defensive callers
    // might pass a partial schedule.
    return Math.abs(pvAtZero - netAdvance) < 1 ? 0 : NaN;
  }

  let lo = 0;
  // 1 per month corresponds to ~1200% APR; comfortably above any
  // conceivable real loan, and well above payday-loan APRs in any
  // jurisdiction. We expand if a degenerate input slips through.
  let hi = 1;
  let pvHi = pv(hi);
  let expansions = 0;
  while (pvHi > netAdvance && expansions < 30) {
    hi *= 2;
    pvHi = pv(hi);
    expansions++;
  }
  if (pvHi > netAdvance) return NaN;

  // Bisection. 200 iterations is overkill for convergence to 1e-14 in i;
  // the cap is just belt-and-braces.
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    const v = pv(mid);
    if (v > netAdvance) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14) break;
  }
  const monthlyRate = (lo + hi) / 2;
  return monthlyRate * 12;
}

/**
 * Format a nominal APR (decimal) as a localized percentage string.
 *
 * - Always shows two decimals so adjacent vendors are visibly comparable
 *   even when their APRs differ by only a few basis points.
 * - Returns `'n/a'` for `NaN` so an undefined APR doesn't render as
 *   `"NaN%"` in the UI.
 *
 * The locale is intentionally a parameter (default `'en-US'`) so the
 * caller can match the rest of the page's currency locale; we don't
 * couple APR formatting to a specific currency because percentages are
 * locale-formatted (digit grouping and decimal separator) rather than
 * currency-formatted.
 */
export function formatApr(apr: number, locale: string = 'en-US'): string {
  if (!Number.isFinite(apr)) return 'n/a';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(apr);
  } catch {
    return `${(apr * 100).toFixed(2)}%`;
  }
}

// -----------------------------------------------------------------------------
// Horizon analysis: "if I sell or refi at month N, where do I stand?"
// -----------------------------------------------------------------------------

export interface EquitySnapshot {
  /** May be clamped to the schedule length if the requested month is past payoff. */
  month: number;
  principalPaidMinor: number;
  interestPaidMinor: number;
  balanceMinor: number;
  /** Cumulative payments plus the origination fee. Answers "how much have I spent so far?". */
  totalOutOfPocketMinor: number;
}

/**
 * Answers the blog's "if I sell in year 3" question directly. `month` is clamped into the valid
 * range; if it exceeds the schedule length, the snapshot reflects post-payoff state.
 */
export function equityAtMonth(
  schedule: AmortizationRow[],
  month: number,
  feeMinor: number = 0,
): EquitySnapshot {
  if (schedule.length === 0 || !Number.isFinite(month) || month < 1) {
    return {
      month: 0,
      principalPaidMinor: 0,
      interestPaidMinor: 0,
      balanceMinor: 0,
      totalOutOfPocketMinor: feeMinor,
    };
  }
  const idx = Math.min(schedule.length - 1, Math.floor(month) - 1);
  let principalPaid = 0;
  let interestPaid = 0;
  let payments = 0;
  for (let i = 0; i <= idx; i++) {
    principalPaid += schedule[i].principal;
    interestPaid += schedule[i].interest;
    payments += schedule[i].payment;
  }
  return {
    month: schedule[idx].month,
    principalPaidMinor: principalPaid,
    interestPaidMinor: interestPaid,
    balanceMinor: schedule[idx].balance,
    totalOutOfPocketMinor: payments + Math.max(0, feeMinor),
  };
}

// -----------------------------------------------------------------------------
// Discount points / rate buy-down break-even
// -----------------------------------------------------------------------------

export interface PointsBreakEven {
  /** `Infinity` when the points don't produce savings; `0` when upfront cost is zero. */
  months: number;
  monthlySavingsMinor: number;
  /** Positive means paying points saves money over the full term; negative means it's a net loss. */
  lifetimeSavingsMinor: number;
}

/**
 * Both loans must be from `computeLoan` with the same principal and term (one with points, one without).
 * Returns `Infinity` when points don't produce savings; the UI treats that as "never recoups".
 */
export function pointsBreakEven(withPoints: LoanResult, withoutPoints: LoanResult): PointsBreakEven {
  const upfrontDelta = withPoints.feeMinor - withoutPoints.feeMinor;
  const monthlySavings = withoutPoints.effectiveMonthlyMinor - withPoints.effectiveMonthlyMinor;
  const lifetimeSavings = withoutPoints.totalPaidMinor - withPoints.totalPaidMinor;

  let months: number;
  if (upfrontDelta <= 0) {
    months = 0;
  } else if (monthlySavings <= 0) {
    months = Infinity;
  } else {
    months = Math.ceil(upfrontDelta / monthlySavings);
  }

  return {
    months,
    monthlySavingsMinor: monthlySavings,
    lifetimeSavingsMinor: lifetimeSavings,
  };
}

// -----------------------------------------------------------------------------
// Refinance break-even
// -----------------------------------------------------------------------------

export interface RefinanceComparison {
  refinanceTotalMinor: number;
  keepTotalMinor: number;
  /** Positive means refinancing saves money over the combined horizon; negative means it costs more. */
  savingsMinor: number;
  /** `Infinity` if monthly payments don't drop; `0` if the new-loan fee is zero. */
  breakEvenMonths: number;
  snapshotAtRefi: EquitySnapshot;
}

/**
 * Compares at the cash-out-of-pocket level: every euro handed over in each scenario
 * (original through refi + new loan costs vs. original to contractual end).
 */
export function refinanceComparison(
  original: LoanResult,
  refiAtMonth: number,
  newAnnualRate: number,
  newTermMonths: number,
  newOriginationFeeMinor: number,
  /** When true, the new origination fee is added to the new loan's
   *  principal (financed) rather than paid out of pocket. Defaults to
   *  out-of-pocket since that's the cleaner mental model and matches
   *  most retail refinance products. */
  rollFeeIntoPrincipal: boolean = false,
): RefinanceComparison | { error: string } {
  if (original.error || original.schedule.length === 0) {
    return { error: 'Original loan is invalid; cannot compute refinance.' };
  }
  if (!Number.isFinite(refiAtMonth) || refiAtMonth < 1) {
    return { error: 'Refinance month must be at least 1.' };
  }
  if (refiAtMonth >= original.schedule.length) {
    return { error: 'Refinance month must be before the original loan ends.' };
  }
  if (!Number.isFinite(newAnnualRate) || newAnnualRate < 0) {
    return { error: 'New rate must be non-negative.' };
  }
  if (!Number.isFinite(newTermMonths) || newTermMonths < 1) {
    return { error: 'New term must be at least 1 month.' };
  }

  const snapshot = equityAtMonth(original.schedule, Math.floor(refiAtMonth), original.feeMinor);
  const remainingBalance = snapshot.balanceMinor;
  if (remainingBalance <= 0) {
    return { error: 'Original loan has no remaining balance at the refinance month.' };
  }

  const newPrincipal = rollFeeIntoPrincipal
    ? remainingBalance + Math.max(0, newOriginationFeeMinor)
    : remainingBalance;

  const newLoan = computeLoan(
    {
      principalMinor: newPrincipal,
      annualRate: newAnnualRate,
      feeMinor: rollFeeIntoPrincipal ? 0 : Math.max(0, newOriginationFeeMinor),
    },
    { kind: 'term', months: Math.floor(newTermMonths) },
  );
  if (newLoan.error || newLoan.schedule.length === 0) {
    return { error: newLoan.error ?? 'New loan is not valid.' };
  }

  // Original cash out of pocket through refi: each row's payment, plus
  // the original fee (already paid at origination, so it's a sunk cost
  // in either scenario; we include it in BOTH totals for consistency).
  let paidThroughRefi = original.feeMinor;
  for (let i = 0; i < Math.floor(refiAtMonth); i++) {
    paidThroughRefi += original.schedule[i].payment;
  }

  const refiTotal = paidThroughRefi + newLoan.totalPaidMinor;
  const keepTotal = original.totalPaidMinor;
  const savings = keepTotal - refiTotal;

  // Break-even relative to refi date: how many months of the new loan's
  // monthly-payment savings recoup the new-loan fee (and any difference
  // between the refi'd-up balance and what would otherwise have been
  // paid). For the simple consumer framing, compare new-loan effective
  // monthly to original effective monthly and divide the new-loan fee
  // by the savings.
  const newMonthly = newLoan.effectiveMonthlyMinor;
  const oldMonthly = original.effectiveMonthlyMinor;
  const monthlySavings = oldMonthly - newMonthly;
  const newFee = rollFeeIntoPrincipal ? 0 : Math.max(0, newOriginationFeeMinor);
  let breakEvenMonths: number;
  if (newFee <= 0) {
    breakEvenMonths = 0;
  } else if (monthlySavings <= 0) {
    breakEvenMonths = Infinity;
  } else {
    breakEvenMonths = Math.ceil(newFee / monthlySavings);
  }

  return {
    refinanceTotalMinor: refiTotal,
    keepTotalMinor: keepTotal,
    savingsMinor: savings,
    breakEvenMonths,
    snapshotAtRefi: snapshot,
  };
}

/**
 * Always includes month 1 (most interest-heavy) and the final month (all principal).
 * Defaults to six samples, matching the figure in the "understanding loan terms" blog post.
 */
export function pickSplitSamples(totalMonths: number, target: number = 6): number[] {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return [];
  const t = Math.max(2, Math.floor(target));
  const n = Math.floor(totalMonths);
  if (n <= t) return Array.from({ length: n }, (_, i) => i + 1);
  const out: number[] = [1];
  for (let k = 1; k < t - 1; k++) {
    const m = Math.round((k * (n - 1)) / (t - 1)) + 1;
    if (m > out[out.length - 1]) out.push(m);
  }
  if (out[out.length - 1] !== n) out.push(n);
  return out;
}

export function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'n/a';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}
