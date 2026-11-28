/**
 * Money for every free tool: the currencies the tools offer, amounts in whole
 * minor units, and how an amount is written on a page.
 *
 * Moved here from the loan engine (src/utils/loan/math.ts), which re-exports
 * it, so a tool that only needs a currency list or an amount's format no
 * longer loads the loan engine, and a change to the loan engine no longer
 * reaches every other tool's tests (#891).
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
    // Stryker disable next-line LogicalOperator: equivalent. Every currency in the list has 0 or 2 decimals, and for those `&& 2` gives the same digits as `?? 2`.
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

/**
 * A number rounded to the digits it is written with, and never minus zero:
 * −0.03 at one digit is 0, where `Intl` and `toFixed` both write "-0" (#888).
 * Rounded here rather than with `signDisplay: 'negative'`, which throws before
 * Safari 15.4 and Firefox 116. Adding zero turns −0 into 0 and leaves
 * everything else, a value that is not a number included, as it was.
 */
export function shownNumber(value: number, digits: number): number {
  return Number(value.toFixed(digits)) + 0;
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

/**
 * The locale for a number that stands beside an amount (a percentage, a bare
 * figure on a chart): the page's own style where it has one, otherwise the
 * marks every page without one uses, a comma between groups and a point for
 * decimals, in lakhs and crores for a currency counted that way.
 */
export function amountNumberLocale(code: string, amountLocale?: string | null): string {
  return amountLocale ?? (getCurrency(code).locale === 'en-IN' ? 'en-IN' : 'en-US');
}

/**
 * The page's marks on an amount written the currency's way: the symbol, its
 * place and the currency's decimals stay; the digits are grouped in threes
 * with a comma, and the decimal mark is a point.
 */
function withPageMarks(parts: Intl.NumberFormatPart[]): Intl.NumberFormatPart[] {
  const out: Intl.NumberFormatPart[] = [];
  let digits = '';
  let at = -1;
  for (const part of parts) {
    if (part.type === 'integer' || part.type === 'group') {
      if (at < 0) {
        at = out.length;
        // Stryker disable next-line ObjectLiteral,StringLiteral: equivalent. This placeholder is always replaced at the end by the grouped digits, so what it holds is never read.
        out.push({ type: 'integer', value: '' });
      }
      if (part.type === 'integer') digits += part.value;
    } else if (part.type === 'decimal') {
      out.push({ type: 'decimal', value: '.' });
    } else {
      out.push(part);
    }
  }
  if (at >= 0) out[at] = { type: 'integer', value: digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') };
  return out;
}

/**
 * A formatter for an amount in a tool (council, Nov 18, 2026, #619).
 *
 * On a page with its own amount style (Spanish, Czech) every currency is
 * written that way. On the others (English, Hindi, Marathi) an amount keeps
 * its currency's symbol, the symbol's place and its decimals, and is written
 * with the page's marks: "₺10,000", "R$ 10,000", "10,000 Kč". The currency's
 * own marks would put "₺10.000" beside "2,490,320%" in one answer, and an
 * English reader takes that for ten. Grouping is not the hazard and stays the
 * currency's: rupees in lakhs and crores ("₹10,58,721"), the rest in threes.
 */
export function amountFormat(code: string, amountLocale: string | null | undefined, options: Intl.NumberFormatOptions): { format: (v: number) => string; formatToParts: (v: number) => Intl.NumberFormatPart[] } {
  const { locale } = amountStyle(code, amountLocale);
  const own = new Intl.NumberFormat(locale, options);
  if (amountLocale || locale === 'en-IN') return { format: (v) => own.format(v), formatToParts: (v) => own.formatToParts(v) };
  const formatToParts = (v: number) => withPageMarks(own.formatToParts(v));
  return { format: (v) => formatToParts(v).map((p) => p.value).join(''), formatToParts };
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
  const { display } = amountStyle(code, amountLocale);
  const value = fromMinor(Math.abs(units) < 0.5 ? 0 : units, code);
  const formatted = amountFormat(code, amountLocale, {
    style: 'currency',
    currency: code,
    currencyDisplay: display,
  }).format(value);
  return DOLLAR_CURRENCIES.has(code) ? `${formatted} ${code}` : formatted;
}
