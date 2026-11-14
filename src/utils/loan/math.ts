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
  { code: 'AOA', label: 'Angolan Kwanza (AOA)', locale: 'pt-AO' },
  { code: 'AUD', label: 'Australian Dollar (AUD)', locale: 'en-AU' },
  { code: 'BDT', label: 'Bangladeshi Taka (BDT)', locale: 'en-IN' },
  { code: 'BRL', label: 'Brazilian Real (BRL)', locale: 'pt-BR' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', locale: 'en-CA' },
  { code: 'CDF', label: 'Congolese Franc (CDF)', locale: 'fr-CD' },
  { code: 'CHF', label: 'Swiss Franc (CHF)', locale: 'de-CH' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)', locale: 'zh-CN' },
  { code: 'CZK', label: 'Czech Koruna (CZK)', locale: 'cs-CZ' },
  { code: 'DKK', label: 'Danish Krone (DKK)', locale: 'da-DK' },
  /**
   * A euro has no one convention: Germany writes "1.058.721 €", France
   * "1 058 721 €" and Ireland "€1,058,721". This picks the English-speaking
   * eurozone, which is the one the site's own writing uses (`€10,000` in every
   * lesson, and `formatProseAmount` for the figures quoted in prose), so a
   * reader never meets two spellings of the same euro amount. A Spanish page
   * writes every amount the Spanish way instead (`TOOL_AMOUNT_LOCALE`), which
   * is how its prose writes them too.
   */
  { code: 'EUR', label: 'Euro (EUR)', locale: 'en-IE' },
  { code: 'GBP', label: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'HKD', label: 'Hong Kong Dollar (HKD)', locale: 'zh-HK' },
  { code: 'HUF', label: 'Hungarian Forint (HUF)', locale: 'hu-HU' },
  { code: 'IDR', label: 'Indonesian Rupiah (IDR)', locale: 'id-ID' },
  { code: 'INR', label: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'ISK', label: 'Icelandic Króna (ISK)', locale: 'is-IS' },
  { code: 'JPY', label: 'Japanese Yen (JPY)', locale: 'ja-JP' },
  { code: 'KES', label: 'Kenyan Shilling (KES)', locale: 'en-KE' },
  { code: 'KRW', label: 'South Korean Won (KRW)', locale: 'ko-KR' },
  { code: 'MXN', label: 'Mexican Peso (MXN)', locale: 'es-MX' },
  { code: 'MYR', label: 'Malaysian Ringgit (MYR)', locale: 'ms-MY' },
  { code: 'MZN', label: 'Mozambican Metical (MZN)', locale: 'pt-MZ' },
  { code: 'NOK', label: 'Norwegian Krone (NOK)', locale: 'nb-NO' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)', locale: 'en-NZ' },
  { code: 'PHP', label: 'Philippine Peso (PHP)', locale: 'fil-PH' },
  { code: 'PLN', label: 'Polish Złoty (PLN)', locale: 'pl-PL' },
  { code: 'RON', label: 'Romanian Leu (RON)', locale: 'ro-RO' },
  { code: 'SEK', label: 'Swedish Krona (SEK)', locale: 'sv-SE' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)', locale: 'en-SG' },
  { code: 'THB', label: 'Thai Baht (THB)', locale: 'th-TH' },
  { code: 'TRY', label: 'Turkish Lira (TRY)', locale: 'tr-TR' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)', locale: 'sw-TZ' },
  { code: 'UGX', label: 'Ugandan Shilling (UGX)', locale: 'en-UG' },
  { code: 'USD', label: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'XAF', label: 'Central African CFA Franc (XAF)', locale: 'fr-CM' },
  { code: 'XOF', label: 'West African CFA Franc (XOF)', locale: 'fr-SN' },
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

/** A yearly rate as a whole number of hundred-millionths: 2.9% is 2,900,000. */
const RATE_SCALE = 1e8;
/** One month of a yearly rate held at that scale. */
const MONTH_DIVISOR = 12 * RATE_SCALE;

/**
 * One month's interest on a balance, in minor units: a twelfth of the yearly
 * rate, rounded half away from zero, worked out in whole numbers.
 *
 * `roundMinor(balance * (annualRate / 12))` is not the same thing. A rate
 * such as 2.9% has no exact binary form, so a product that is exactly a half
 * (60.00 at 2.9% is 14.5 cents) can come out a hair under it and round down:
 * one cent short in that row (#532). Here the rate becomes a whole number
 * once and the half is compared exactly. Where the product is too large for
 * exact floating-point whole numbers, BigInt carries it.
 *
 * A balance that is not a whole number of minor units, or a rate that is not
 * a usable number, falls back to the floating-point form: the callers check
 * their inputs and never pass one.
 */
export function monthlyInterestMinor(balanceMinor: number, annualRate: number): number {
  if (annualRate === 0 || balanceMinor === 0) return 0;
  const scaled = Math.round(annualRate * RATE_SCALE);
  if (!Number.isInteger(balanceMinor) || balanceMinor < 0 || !Number.isFinite(annualRate) || annualRate < 0 || !Number.isSafeInteger(scaled)) {
    return roundMinor(balanceMinor * (annualRate / 12));
  }
  const product = balanceMinor * scaled;
  if (Number.isSafeInteger(product)) {
    const whole = Math.floor(product / MONTH_DIVISOR);
    const rest = product - whole * MONTH_DIVISOR;
    return rest * 2 >= MONTH_DIVISOR ? whole + 1 : whole;
  }
  const divisor = BigInt(MONTH_DIVISOR);
  return Number((2n * BigInt(balanceMinor) * BigInt(scaled) + divisor) / (2n * divisor));
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

/**
 * The locale and symbol style for a tool's amount: the page's own style when
 * it has one, otherwise the currency's. A page style writes the narrow symbol
 * ("$", "£", "₹"), since the Spanish default spells most currencies as a code
 * ("1500 GBP") and the currency is already chosen beside the figure.
 */
export function amountStyle(code: string, amountLocale?: string | null): { locale: string; display: 'symbol' | 'narrowSymbol' } {
  return amountLocale ? { locale: amountLocale, display: 'narrowSymbol' } : { locale: getCurrency(code).locale, display: 'symbol' };
}

/** Currencies that share the "$" symbol and need disambiguation. */
const DOLLAR_CURRENCIES = new Set(['USD', 'CAD', 'AUD', 'SGD', 'HKD', 'NZD']);

/**
 * `amountLocale` is the page's own number style where it has one
 * (`TOOL_AMOUNT_LOCALE`); see `amountStyle` above.
 */
export function formatMoney(units: number, currencyCode: string, amountLocale?: string | null): string {
  // Never "€NaN" or "-€0.00": an amount that is not a number has no figure,
  // and less than half a minor unit either side of zero is zero.
  if (!Number.isFinite(units)) return 'n/a';
  const { code } = getCurrency(currencyCode);
  const { locale, display } = amountStyle(code, amountLocale);
  const value = fromMinor(Math.abs(units) < 0.5 ? 0 : units, code);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: display,
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
      /**
       * What the lender does when the rate changes. `'term'` (the default)
       * works out a new payment so the loan still ends on its term.
       * `'payment'` leaves the scheduled payment as it was, so the loan ends
       * earlier or later than its term, or never: a payment that no longer
       * covers a month's interest lets the balance grow.
       */
      keeps?: 'term' | 'payment';
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
  /**
   * Set for a fixed-then-variable loan whose rate changes before the term
   * ends. `month` is the first month at the new rate. `paymentMinor` is what
   * is paid each month from then on, extra monthly principal included, as the
   * effective schedule has it; `null` when the loan is paid off before that
   * month, so no later payment exists. `last` marks the case where that
   * payment is the closing one and never repeats. The page shows both payments: the
   * first one alone makes two offers that part ways later look the same.
   */
  rateChange?: { month: number; paymentMinor: number | null; last?: boolean };
  /**
   * Set when the scheduled payment is kept at the rate change and at least
   * one payment is made at the later rate. `termMonths` is the term the
   * reader entered.
   *   - `'paid'`: the loan is paid off in `months`, which may be earlier or
   *     later than `termMonths`.
   *   - `'never'`: after the rate change and the last lump sum, a month's
   *     payment (extras included) no longer exceeds that month's interest,
   *     so the balance cannot fall again. `covers` says whether the payment
   *     equals the interest (the balance stands still) or is less (it grows).
   *   - `'limit'`: the balance is still falling at `MAX_TERM_MONTHS`; the
   *     payoff exists but was not computed.
   * When the outcome is not `'paid'`, `months`, the totals and the APR are
   * not figures of a finished loan: `totalPaidMinor`, `totalInterestMinor`
   * and `aprNominal` are `NaN`, and `schedule` runs to the limit.
   */
  keptPayment?: {
    outcome: 'paid' | 'never' | 'limit';
    termMonths: number;
    covers?: 'equal' | 'less';
    /** First month whose payment did not exceed its interest (`'never'` only). */
    fromMonth?: number;
  };
  warnings: string[];
  error?: string;
}

export const MAX_TERM_MONTHS = 1200;

/**
 * The largest loan the engine takes, in minor units: a million million euros
 * in cents. Far beyond any loan, and well inside the whole numbers a
 * JavaScript number holds exactly, so every sum in a schedule stays exact.
 */
export const MAX_PRINCIPAL_MINOR = 1e14;

/**
 * The message for an optional amount that cannot be used. It is written so
 * that the tool's analytics, which sorts messages by the words in them,
 * files it under "other".
 */
export const OPTIONAL_UNREADABLE = 'One of the optional boxes cannot be read. Use digits only, or clear the box.';

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

  let balance = principalMinor;
  const schedule: AmortizationRow[] = [];

  if (annualRate > 0) {
    const interestFirstMonth = monthlyInterestMinor(balance, annualRate);
    if (paymentMinor + extraMinor <= interestFirstMonth) {
      return {
        schedule: [],
        warnings,
        error: 'Monthly payment is too low to ever pay off the loan; it does not even cover the first month\'s interest.',
      };
    }
  }

  while (balance > 0 && schedule.length < MAX_TERM_MONTHS) {
    const interest = monthlyInterestMinor(balance, annualRate);
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
  /**
   * The loan has a contractual term of `totalMonths`, and its last payment
   * clears whatever is left. The scheduled payment is rounded to the minor
   * unit, so after the last contractual month a few cents can remain (or the
   * last payment can be a few cents too much); a lender puts that difference
   * into the final payment, and so does this. Without it a 360-month loan
   * runs to a 361st payment of a few cents in about half of all cases.
   * It applies while the difference is smaller than one scheduled payment.
   * Not set for a loan entered by its payment, which has no term to end on.
   */
  endsAtTerm?: boolean;
}): {
  schedule: AmortizationRow[];
  warnings: string[];
  error?: string;
  recastPaymentMinor?: number;
  /** Only when the payment is kept at the rate change and the loan is not paid off within the limit. */
  unpaid?: { outcome: 'never' | 'limit'; covers?: 'equal' | 'less'; fromMonth?: number };
} {
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
    const initialInterest = monthlyInterestMinor(principalMinor, initialRate);
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
  let recastPaymentMinor: number | undefined;
  const keepsPayment = spec.rateSpec.kind === 'hybrid' && spec.rateSpec.keeps === 'payment';
  const lastLumpMonth = Math.max(0, ...lumpByMonth.keys());
  // The first month, after the rate change and the last lump sum, whose
  // payment did not exceed its interest. Rate and payment are constant from
  // there on, so the balance can never fall again.
  let stalled: { covers: 'equal' | 'less'; fromMonth: number } | undefined;

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
      !keepsPayment &&
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
      recastPaymentMinor = currentPayment;
      if (spec.rateSpec.subsequentAnnualRate > 0) {
        const monthsInterest = monthlyInterestMinor(balance, spec.rateSpec.subsequentAnnualRate);
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

    const interest = monthlyInterestMinor(balance, rateForMonth(spec.rateSpec, month));
    let payment = currentPayment + extraMonthlyMinor;
    let principal = payment - interest;

    if (
      keepsPayment &&
      !stalled &&
      spec.rateSpec.kind === 'hybrid' &&
      month > spec.rateSpec.initialMonths &&
      month > lastLumpMonth &&
      principal <= 0
    ) {
      stalled = { covers: principal === 0 ? 'equal' : 'less', fromMonth: month };
    }

    // What would be left after this month's scheduled payment is less than
    // one more such payment: it belongs in this, the last contractual one.
    // (At a very high rate over a very long term the half-unit of rounding
    // compounds into more than a payment; that is left to run on instead of
    // doubling the last payment.)
    const endsHere = spec.endsAtTerm === true && month === totalMonths && balance - principal < currentPayment;
    if (principal >= balance || endsHere) {
      // Last regular row: the payment is whatever clears the balance
      // exactly. Usually that is a little less than the scheduled payment;
      // on the last month of a loan with a term it can be a little more.
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

  if (balance > 0 && keepsPayment) {
    // Not an error: this is what keeping the payment does at this rate. The
    // schedule to the limit is returned so the page can draw the balance.
    return {
      schedule,
      warnings,
      unpaid: stalled ? { outcome: 'never', ...stalled } : { outcome: 'limit' },
    };
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

  return { schedule, warnings, recastPaymentMinor };
}

/** Every code path that needs rate information gets a single shape, regardless of how the user entered it. */
function resolveRateSpec(inputs: LoanInputs): RateSpec {
  if (inputs.rateSpec) return inputs.rateSpec;
  return { kind: 'fixed', annualRate: inputs.annualRate };
}

export function computeLoan(inputs: LoanInputs, mode: LoanMode): LoanResult {
  const penalty = inputs.prepaymentPenalty;
  let rateSpec = resolveRateSpec(inputs);

  // The optional amounts. One that is not a number, or is negative, is an
  // error and never a quiet zero: a NaN fee used to give a NaN total, and a
  // negative fee lowered the total paid without a word (#352). The page's own
  // checks (inputs.ts) normally stop these first; the engine does not rely
  // on that.
  const optional = [
    inputs.feeMinor ?? 0,
    inputs.extraMonthlyMinor ?? 0,
    ...(inputs.lumpSums ?? []).flatMap((l) => [l.month, l.amountMinor]),
    ...(penalty ? [penalty.pctOfBalance, penalty.untilMonth, penalty.flatMinor ?? 0] : []),
  ];
  if (optional.some((v) => !Number.isFinite(v) || v < 0)) return emptyResult(0, OPTIONAL_UNREADABLE);

  // Every amount is a whole number of minor units from here on, so the
  // schedule's sums are exact. A fraction of a cent is rounded away once.
  const principalMinor = roundMinor(inputs.principalMinor);
  const feeMinor = roundMinor(inputs.feeMinor ?? 0);
  const extraMonthlyMinor = roundMinor(inputs.extraMonthlyMinor ?? 0);
  const lumpSums = (inputs.lumpSums ?? []).map((l) => ({ ...l, amountMinor: roundMinor(l.amountMinor) }));

  if (!Number.isFinite(inputs.principalMinor) || principalMinor <= 0) {
    return emptyResult(feeMinor, 'Enter a loan amount greater than zero.');
  }
  if (principalMinor > MAX_PRINCIPAL_MINOR) {
    return emptyResult(feeMinor, 'This loan amount is too large for the tool. Enter a smaller amount.');
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

  // Keeping the payment only means something when a payment is made at a
  // different rate. With the two rates equal, or the change at or after the
  // end of the term, the schedule is the ordinary one.
  if (
    rateSpec.kind === 'hybrid' &&
    rateSpec.keeps === 'payment' &&
    (rateSpec.subsequentAnnualRate === rateSpec.initialAnnualRate ||
      (mode.kind === 'term' && rateSpec.initialMonths >= Math.floor(mode.months)))
  ) {
    rateSpec = { ...rateSpec, keeps: 'term' };
  }
  const keepsPayment = rateSpec.kind === 'hybrid' && rateSpec.keeps === 'payment';

  let totalMonths: number;
  let scheduledPayment: number;
  if (mode.kind === 'term') {
    // Whole months, counted before the check: half a month is no term.
    if (!Number.isFinite(mode.months) || Math.floor(mode.months) < 1) {
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
    // A cent over thirty years has a payment that rounds to nothing. Say
    // that, not "enter a monthly payment": this reader typed a term.
    if (scheduledPayment <= 0) {
      return emptyResult(feeMinor, 'The loan is too small for this term. Enter a larger amount or a shorter term.');
    }
  } else {
    if (!Number.isFinite(mode.monthlyMinor) || roundMinor(mode.monthlyMinor) <= 0) {
      return emptyResult(feeMinor, 'Enter a monthly payment greater than zero.');
    }
    if (rateSpec.kind === 'hybrid') {
      // Payment-mode + hybrid is ill-defined: we don't know what term
      // the user is contracting for, and recasting requires that. The
      // UI gates this; we double-belt here.
      return emptyResult(
        feeMinor,
        'Fixed-then-variable loans need a fixed term: under “Solve for”, choose “Monthly payment”.',
      );
    }
    scheduledPayment = roundMinor(mode.monthlyMinor);
    // For payment-mode fixed loans we don't have a contractual term;
    // simulate up to MAX_TERM_MONTHS and use the actual payoff length.
    totalMonths = MAX_TERM_MONTHS;
  }

  // Effective schedule: applies any voluntary extra principal AND lump
  // sums. Drives the user-facing "months", "total paid", and the
  // balance chart.
  const { schedule, warnings, error, recastPaymentMinor, unpaid } = buildScheduleAdvanced({
    principalMinor,
    rateSpec,
    totalMonths,
    basePaymentMinor: scheduledPayment,
    extraMonthlyMinor,
    lumpSums,
    endsAtTerm: mode.kind === 'term',
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
  const contract = hasVoluntaryActions
    ? buildScheduleAdvanced({
        principalMinor,
        rateSpec,
        totalMonths,
        basePaymentMinor: scheduledPayment,
        extraMonthlyMinor: 0,
        lumpSums: [],
        endsAtTerm: mode.kind === 'term',
      })
    : { schedule, unpaid };
  // With the payment kept, the scheduled payments alone may never pay the
  // loan off although the reader's extras do. There is then no contractual
  // payment stream to solve an APR on, so the reader's own schedule is used.
  const contractSchedule = contract.unpaid ? schedule : contract.schedule;

  // Whether a payment is made at the later rate at all: an extra payment or
  // a lump sum can clear the loan before the rate changes.
  const reachesChange =
    keepsPayment && rateSpec.kind === 'hybrid' && schedule.length > rateSpec.initialMonths;
  const keptPayment: LoanResult['keptPayment'] = reachesChange
    ? { outcome: unpaid ? unpaid.outcome : 'paid', termMonths: totalMonths, ...(unpaid?.covers ? { covers: unpaid.covers, fromMonth: unpaid.fromMonth } : {}) }
    : undefined;

  // Prepayment penalty: applies when the effective schedule pays the
  // loan off strictly earlier than the contract would, AND the early
  // payoff falls on or before `untilMonth`. We charge on the balance at
  // the moment of the early payoff (the row right before the loan
  // clears).
  let prepaymentPenaltyMinor = 0;
  if (penalty && schedule.length < contract.schedule.length) {
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

  const aprNominal = unpaid ? NaN : computeApr(principalMinor, feeMinor, contractSchedule);

  // The payment after the rate change, read from the schedule the reader's own
  // plan produces. When the only payment at the new rate is the closing one,
  // that payment is the figure: no full recast payment is ever made.
  let rateChange: LoanResult['rateChange'];
  if (rateSpec.kind === 'hybrid' && rateSpec.initialMonths < totalMonths) {
    const month = rateSpec.initialMonths + 1;
    const row = schedule[month - 1];
    let paymentMinor: number | null = null;
    if (row) {
      if (schedule.length === month) paymentMinor = row.payment;
      else if (keepsPayment) paymentMinor = scheduledPayment + Math.max(0, Math.floor(extraMonthlyMinor));
      else if (recastPaymentMinor === undefined) paymentMinor = row.payment;
      else paymentMinor = recastPaymentMinor + Math.max(0, Math.floor(extraMonthlyMinor));
    }
    rateChange = { month, paymentMinor, ...(row && schedule.length === month ? { last: true } : {}) };
  }

  return {
    monthlyPaymentMinor: scheduledPayment,
    effectiveMonthlyMinor: scheduledPayment + extraMonthlyMinor,
    months: schedule.length,
    // A loan that is not paid off has no total: a sum to the limit would
    // look like one.
    totalPaidMinor: unpaid ? NaN : totalPaid,
    totalInterestMinor: unpaid ? NaN : totalInterest,
    feeMinor,
    schedule,
    contractSchedule,
    aprNominal,
    prepaymentPenaltyMinor,
    ...(rateChange ? { rateChange } : {}),
    ...(keptPayment ? { keptPayment } : {}),
    warnings,
  };
}

/**
 * True when the payment is kept at the rate change and the loan is not paid
 * off: it never is, or not within the calculation limit. Such a result has a
 * schedule but no totals, no APR and no payoff month.
 */
export function isNotPaidOff(r: LoanResult): boolean {
  return r.keptPayment !== undefined && r.keptPayment.outcome !== 'paid';
}

/**
 * How many months of an offer's schedule a balance chart draws. A loan that
 * is never paid off has a schedule to the calculation limit, where its balance
 * is hundreds of times the loan: drawn whole, it would flatten every other
 * line. It is drawn over the range the chart has without it, the longest of
 * the other schedules, or its own entered term if that is longer. Every other
 * offer is drawn whole.
 */
export function shownMonths(results: LoanResult[], index: number): number {
  const r = results[index];
  if (r.keptPayment?.outcome !== 'never') return r.schedule.length;
  const others = results
    .filter((o, i) => i !== index && !o.error && o.keptPayment?.outcome !== 'never')
    .map((o) => o.schedule.length);
  return Math.min(r.schedule.length, Math.max(r.keptPayment.termMonths, ...others));
}

/** A result that carries only an error: nothing was computed. */
export function emptyResult(feeMinor: number, error: string): LoanResult {
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
 *   - This function returns the nominal annualization (`monthly_rate × 12`),
 *     on the same basis as the rate the reader types, and the one figure
 *     the page shows. EU, UK and some other documents compound the same
 *     monthly rate over a year (`(1+i)^12 − 1`), so theirs reads higher; the
 *     page says so above the offers.
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
  // A monthly rate of 1 (100% a month, 1200% a year on the times-12
  // convention) is comfortably above any conceivable real loan. We expand
  // if a degenerate input slips through.
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
 * Format an APR (decimal) as a localized percentage string.
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
  // Less than half of the last digit shown, either side of zero, is 0.00%, never "-0.00%".
  if (Math.abs(apr) < 0.00005) apr = 0;
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
 * With a lower monthly payment, break-even is the cost divided by the monthly saving; with the
 * same payment (a loan entered by its payment), it is read from the two balances.
 */
export function pointsBreakEven(withPoints: LoanResult, withoutPoints: LoanResult): PointsBreakEven {
  const upfrontDelta = withPoints.feeMinor - withoutPoints.feeMinor;
  const monthlySavings = withoutPoints.effectiveMonthlyMinor - withPoints.effectiveMonthlyMinor;
  const lifetimeSavings = withoutPoints.totalPaidMinor - withPoints.totalPaidMinor;

  let months: number;
  if (upfrontDelta <= 0) {
    months = 0;
  } else if (monthlySavings > 0) {
    months = Math.ceil(upfrontDelta / monthlySavings);
  } else {
    // The payment is the same with and without points: a loan entered by its
    // payment. The lower rate then shows as a balance that falls faster, and
    // a shorter loan. The points have paid for themselves in the first month
    // in which the loan with points owes less by at least what they cost.
    months = Infinity;
    const last = Math.max(withPoints.schedule.length, withoutPoints.schedule.length);
    for (let m = 1; m <= last; m++) {
      const owedWith = withPoints.schedule[m - 1]?.balance ?? 0;
      const owedWithout = withoutPoints.schedule[m - 1]?.balance ?? 0;
      if (owedWithout - owedWith >= upfrontDelta) { months = m; break; }
    }
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

/**
 * What the points row says under its break-even: that the points save money
 * over the life of the loan, that they cost money (the loan ends, by its
 * term or by extra payments, before they have paid for themselves), or
 * that they never pay for themselves at all. The lifetime figure is signed;
 * printing its size alone turned a loss into "Saves".
 */
export function pointsVerdict(be: PointsBreakEven): 'saves' | 'costs' | 'never' {
  if (!Number.isFinite(be.months)) return 'never';
  return be.lifetimeSavingsMinor < 0 ? 'costs' : 'saves';
}

export interface RefinanceComparison {
  refinanceTotalMinor: number;
  keepTotalMinor: number;
  /** Positive means refinancing saves money over the combined horizon; negative means it costs more. */
  savingsMinor: number;
  /**
   * Months after the refinance until the lower payments due have covered
   * what the refinance costs in cash. `Infinity` if they never do; `0` if
   * there is no such cost.
   */
  breakEvenMonths: number;
  /**
   * What the original loan charges for being cleared early, in minor units:
   * zero when it has no such clause or the refinance falls after its last
   * month. Already inside `refinanceTotalMinor`.
   */
  penaltyMinor: number;
  /** Whether the reader's extra payments or lump sums were continued on the new loan. */
  extrasCarried: boolean;
  snapshotAtRefi: EquitySnapshot;
}

/**
 * The original loan as the reader entered it: what `original` was computed
 * from. A `LoanResult` does not keep its penalty clause, its extra payments
 * or its lump sums, and a refinance changes the cost of all three.
 */
export interface RefinanceOriginalLoan {
  inputs: LoanInputs;
  mode: LoanMode;
}

/**
 * Compares at the cash-out-of-pocket level: every euro handed over in each scenario
 * (original through refi + new loan costs vs. original to contractual end).
 *
 * Three things keep the two sides like for like (#370):
 *   - A refinance clears the original loan, so its early repayment penalty
 *     is charged when the refinance falls on or before the penalty's last
 *     month: on the balance then owed, as `computeLoan` charges any early
 *     payoff. It is cash at the refinance, whatever happens to the new
 *     loan's closing costs.
 *   - The reader's extra monthly payment, and lump sums planned for later
 *     months, continue on the new loan. "Keep" already includes them;
 *     leaving them off the new loan set a loan paid down faster against one
 *     that is not.
 *   - Break-even compares the payments due on each loan, month by month,
 *     without those extras. They are the reader's choice on either loan and
 *     are not what the refinance saves. On the original loan, "due" means
 *     due on what is really owed at the refinance: its terms applied to the
 *     balance the extras have already brought down, with no extras after.
 *
 * Without `source`, the original loan is taken to have no penalty clause and
 * no extras.
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
  source?: RefinanceOriginalLoan,
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

  const refiMonth = Math.floor(refiAtMonth);
  const carriedExtra = Math.max(0, roundMinor(source?.inputs.extraMonthlyMinor ?? 0));
  // A lump sum planned for month 48 of the original loan is month 12 of a
  // loan that starts after month 36. One already paid stays where it was.
  const originalLumps = source?.inputs.lumpSums ?? [];
  const carriedLumps = originalLumps
    .filter((l) => l.month > refiMonth && l.amountMinor > 0)
    .map((l) => ({ month: l.month - refiMonth, amountMinor: l.amountMinor }));

  const newLoan = computeLoan(
    {
      principalMinor: newPrincipal,
      annualRate: newAnnualRate,
      feeMinor: rollFeeIntoPrincipal ? 0 : Math.max(0, newOriginationFeeMinor),
      extraMonthlyMinor: carriedExtra,
      lumpSums: carriedLumps,
    },
    { kind: 'term', months: Math.floor(newTermMonths) },
  );
  if (newLoan.error || newLoan.schedule.length === 0) {
    return { error: newLoan.error ?? 'New loan is not valid.' };
  }

  // The original loan's charge for being cleared early.
  const clause = source?.inputs.prepaymentPenalty;
  const penaltyMinor =
    clause && refiMonth <= clause.untilMonth
      ? roundMinor(remainingBalance * Math.max(0, clause.pctOfBalance)) + Math.max(0, Math.floor(clause.flatMinor ?? 0))
      : 0;

  // Original cash out of pocket through refi: each row's payment, plus
  // the original fee (already paid at origination, so it's a sunk cost
  // in either scenario; we include it in BOTH totals for consistency).
  let paidThroughRefi = original.feeMinor;
  for (let i = 0; i < refiMonth; i++) {
    paidThroughRefi += original.schedule[i].payment;
  }

  const refiTotal = paidThroughRefi + penaltyMinor + newLoan.totalPaidMinor;
  const keepTotal = original.totalPaidMinor;
  const savings = keepTotal - refiTotal;

  // Break-even, counted from the refinance: the first month by which the
  // lower payments due have covered what the refinance costs in cash, the
  // closing costs (unless they went into the new loan) and the penalty.
  // The payments due leave out the reader's extras: for two level payments
  // this is the cost divided by the monthly saving, and it also follows a
  // payment that changes with the rate and stops counting a saving once the
  // original loan would have ended anyway.
  //
  // What is due on the original loan depends on what is owed. Extras paid
  // before the refinance have lowered the balance, so the loan ends sooner
  // than its contract schedule, and a payment recast at a rate change is
  // recast on the lower balance. So the original loan is run again with its
  // extras stopped at the refinance: each month's extra becomes a lump sum
  // in that month (both come off the balance after the payment), and later
  // lump sums are left out.
  const cashCost = (rollFeeIntoPrincipal ? 0 : Math.max(0, newOriginationFeeMinor)) + penaltyMinor;
  let oldDue = original.contractSchedule;
  if (source && (carriedExtra > 0 || originalLumps.some((l) => l.amountMinor > 0))) {
    const paidSoFar = [
      ...originalLumps.filter((l) => l.month <= refiMonth),
      ...(carriedExtra > 0 ? Array.from({ length: refiMonth }, (_, i) => ({ month: i + 1, amountMinor: carriedExtra })) : []),
    ];
    const stopped = computeLoan(
      { ...source.inputs, extraMonthlyMinor: 0, lumpSums: paidSoFar, prepaymentPenalty: undefined },
      source.mode,
    );
    if (!stopped.error && stopped.schedule.length > refiMonth) oldDue = stopped.schedule;
  }
  const newDue = newLoan.contractSchedule;
  let breakEvenMonths: number;
  if (cashCost <= 0) {
    breakEvenMonths = 0;
  } else {
    breakEvenMonths = Infinity;
    let saved = 0;
    const last = Math.max(oldDue.length - refiMonth, newDue.length);
    for (let k = 1; k <= last; k++) {
      saved += (oldDue[refiMonth + k - 1]?.payment ?? 0) - (newDue[k - 1]?.payment ?? 0);
      if (saved >= cashCost) { breakEvenMonths = k; break; }
    }
  }

  return {
    refinanceTotalMinor: refiTotal,
    keepTotalMinor: keepTotal,
    savingsMinor: savings,
    breakEvenMonths,
    penaltyMinor,
    extrasCarried: carriedExtra > 0 || carriedLumps.length > 0,
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
