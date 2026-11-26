/**
 * Pure functions for currency risk math. Extracted from the component so the aggregation,
 * risk assessment, and CSV parsing are testable without React or a DOM.
 */

import { CURRENCIES, shownNumber, type CurrencyInfo } from '../shared/money.ts';
import { unguardText } from '../shared/exportFile.ts';
import { parseLocaleNumber, plainDigits } from '../shared/parseLocaleNumber.ts';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export type AssetType = 'asset' | 'liability';

export interface AssetRow {
  name: string;
  value: string;
  currency: string;
  type: AssetType;
}

/**
 * `'unbanded'`: something is held in another currency while total net worth
 * is zero or negative. A share of a total that is not positive cannot be
 * worked out, so the position gets no band rather than "low".
 */
export type RiskLevel = 'functional' | 'low' | 'moderate' | 'elevated' | 'net-debt' | 'unbanded';

export interface CurrencyPosition {
  /** Uniquely identifies the currency for rate lookups and display formatting. */
  code: string;
  /** Position before conversion; kept so users can verify against their own records. */
  netAmountOriginal: number;
  /** Position after conversion; drives the concentration chart and risk percentages. */
  netAmountFunctional: number;
  /**
   * Exposure: the net position as a percentage of total net worth. It drives
   * the bands and the sentences on the cards. With a debt in another
   * currency it can pass 100 or go below 0, so it is never called
   * concentration: that is `concentrationShares`, which adds to 100.
   */
  pctOfTotal: number;
  /** Functional currency is exempt from risk flagging since the user spends in it. */
  isFunctional: boolean;
  /** Drives the color-coded card border and the recommendation text. */
  riskLevel: RiskLevel;
  /** Displayed directly in the UI; kept separate from the enum so copy can evolve independently. */
  riskLabel: string;
  /**
   * True when the FX rate for this currency was missing from the rates
   * response and the conversion to the functional currency could not be
   * performed. The position is shown in original units only.
   */
  rateUnavailable?: boolean;
  /** Arrived in a link from before links said whether a rate was known (#795). */
  rateUnknown?: boolean;
}

/**
 * Tri-state rate availability:
 *   - 'full'    : every non-functional position has a usable FX rate.
 *   - 'partial' : at least one non-functional position is missing its rate.
 *                 The headline total excludes those positions, so the UI
 *                 must surface a banner; the per-row card also flags the
 *                 missing rate via `rateUnavailable: true`.
 *   - 'none'    : the rates fetch failed entirely; positions are returned
 *                 in original units only and the headline is suppressed.
 *
 * This used to be a single `boolean`; partial failures were silently
 * absorbed into the total. The tri-state lets the UI distinguish "all good"
 * from "missing one currency" from "rates failed".
 */
export type RatesAvailability = 'full' | 'partial' | 'none';

export interface AggregationResult {
  positions: CurrencyPosition[];
  totalNetWorthFunctional: number;
  hasRates: RatesAvailability;
  /**
   * Net worth is zero or less, so no position is a share of it: the cards and
   * the exports state none. Set by `aggregate`, and carried by a shared view,
   * which may have no amounts to work it out from.
   */
  noShares?: boolean;
}

/**
 * Why `parseCSV` refused a line, as a code the tool can put in the reader's
 * language. `values` holds what the sentence quotes back (the bad value, the
 * supported codes), keyed by the catalog template's placeholder names.
 */
export type ParseErrorReason =
  | 'empty'
  | 'columns'
  | 'invalidValue'
  | 'emptyCurrency'
  | 'unsupportedCurrency'
  | 'unknownType';

export interface ParseError {
  line: number;
  reason: ParseErrorReason;
  values?: Record<string, string>;
  /** The same reason in English. Analytics classifies on this text. */
  message: string;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Strips cosmetic grouping characters before parsing so "1,00,000" and
 * "100000" both work. Returns NaN on failure. What is left must be digits with
 * at most one decimal point: `Number()` alone also reads "1.5e5", "0x10" and
 * "0b11", which the CSV import refuses (#872).
 */
export function parseAmount(s: string): number {
  const cleaned = s.replace(/[\s,]/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/**
 * Whether a row's amount box holds something that is not an amount: text
 * the parser cannot read ("€150,000", "150 000 EUR", "-150000", "1.5e5").
 * Such a row is left out of every total, so the tool has to say so; an
 * empty box is just a row not filled in yet.
 */
export function isUnreadableAmount(value: string): boolean {
  return value.trim() !== '' && !Number.isFinite(parseAmount(value));
}

/** How many rows are left out of the totals because their amount cannot be read. */
export function unreadableCount(rows: AssetRow[]): number {
  return rows.filter((row) => isUnreadableAmount(row.value)).length;
}

function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((c) => c.code === code.toUpperCase());
}

/** Guards against typos and unsupported codes before they reach the aggregation engine. */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code.toUpperCase());
}

/** Exchange rates as they were fetched: units of each currency per one of `base`. */
export interface HeldRates {
  base: string;
  rates: Record<string, number>;
}

/**
 * The rates to work with for `functionalCurrency`, or null when the ones
 * held were fetched for another currency. Rates say how many units of each
 * currency one unit of their base buys, so used with another base they give
 * a total that is simply wrong (1,000 euros counted as 1,000 rupees), and
 * the tool would show it while the right rates are loading or have failed.
 */
export function ratesForBase(held: HeldRates | null, functionalCurrency: string): Record<string, number> | null {
  return held !== null && held.base.toUpperCase() === functionalCurrency.toUpperCase() ? held.rates : null;
}

/**
 * If `rates` is null, positions are returned in their original currencies without conversion,
 * so the UI can still show raw amounts with a "rates unavailable" warning.
 */
export function aggregate(
  rows: AssetRow[],
  functionalCurrency: string,
  rates: Record<string, number> | null,
): AggregationResult {
  const funcCode = functionalCurrency.toUpperCase();

  // Sum assets and liabilities per currency (in original currency units).
  const byCurrency = new Map<string, { assets: number; liabilities: number }>();

  for (const row of rows) {
    const code = row.currency.toUpperCase();
    const amount = parseAmount(row.value);
    if (!Number.isFinite(amount) || amount === 0) continue;
    if (!getCurrencyInfo(code)) continue;

    const bucket = byCurrency.get(code) ?? { assets: 0, liabilities: 0 };
    if (row.type === 'liability') {
      bucket.liabilities += amount;
    } else {
      bucket.assets += amount;
    }
    byCurrency.set(code, bucket);
  }

  if (byCurrency.size === 0) {
    return {
      positions: [],
      totalNetWorthFunctional: 0,
      hasRates: rates === null ? 'none' : 'full',
    };
  }

  // Build positions in original currency.
  const positions: CurrencyPosition[] = [];
  for (const [code, bucket] of byCurrency) {
    const netAmountOriginal = bucket.assets - bucket.liabilities;
    const isFunctional = code === funcCode;

    positions.push({
      code,
      netAmountOriginal,
      netAmountFunctional: 0,
      pctOfTotal: 0,
      isFunctional,
      riskLevel: 'low',
      riskLabel: '',
    });
  }

  if (!rates) {
    // No conversion rates available; sort by absolute original amount.
    positions.sort((a, b) => Math.abs(b.netAmountOriginal) - Math.abs(a.netAmountOriginal));
    for (const pos of positions) {
      if (!pos.isFunctional) pos.rateUnavailable = true;
      // The spending currency needs no rate: it is the reader's own, with
      // rates or without, never "Low" (#874).
      else [pos.riskLevel, pos.riskLabel] = assessRisk(0, true, pos.netAmountOriginal);
    }
    return { positions, totalNetWorthFunctional: 0, hasRates: 'none' };
  }

  // Convert to functional currency, tracking whether any rate was missing.
  // We count missing rates only for non-functional currencies because the
  // functional position never needs a conversion (`rate = 1` by definition).
  let missingRateCount = 0;
  for (const pos of positions) {
    if (pos.code === funcCode) {
      pos.netAmountFunctional = pos.netAmountOriginal;
    } else {
      const rate = rates[pos.code];
      if (rate === undefined || rate === 0) {
        // Currency not in the rates response: leave unconverted and flag.
        // Excluding it from the headline total is safer than guessing zero,
        // because the user shouldn't see a "total" that silently omits part
        // of their portfolio. The UI surfaces this via `hasRates === 'partial'`.
        pos.netAmountFunctional = 0;
        pos.rateUnavailable = true;
        missingRateCount++;
      } else {
        // rate is "1 funcCurrency = rate units of pos.code"
        // So pos.netAmountOriginal / rate = amount in funcCurrency
        pos.netAmountFunctional = pos.netAmountOriginal / rate;
      }
    }
  }

  // Total net worth in functional currency.
  const totalNetWorthFunctional = netTotal(positions);

  // Percentages and risk levels.
  for (const pos of positions) {
    if (totalNetWorthFunctional > 0) {
      pos.pctOfTotal = (pos.netAmountFunctional / totalNetWorthFunctional) * 100;
    } else if (totalNetWorthFunctional < 0 && pos.netAmountFunctional < 0) {
      // All positions are negative: show share of the negative total.
      pos.pctOfTotal = (pos.netAmountFunctional / totalNetWorthFunctional) * 100;
    } else {
      pos.pctOfTotal = 0;
    }

    const [riskLevel, riskLabel] = assessRisk(pos.pctOfTotal, pos.isFunctional, pos.netAmountOriginal);
    pos.riskLevel = riskLevel;
    pos.riskLabel = riskLabel;
    // With nothing left after debts there is no share to band: a holding in
    // another currency would otherwise read "low exposure" at 0%, while a move
    // in that currency still changes net worth by a tenth of the holding.
    if (totalNetWorthFunctional <= 0 && !pos.isFunctional && !pos.rateUnavailable && pos.netAmountOriginal > 0) {
      pos.riskLevel = 'unbanded';
      pos.riskLabel = 'No share to work out';
    }
  }

  // Sort: functional currency first, then by absolute percentage descending.
  positions.sort((a, b) => {
    if (a.isFunctional && !b.isFunctional) return -1;
    if (!a.isFunctional && b.isFunctional) return 1;
    return Math.abs(b.pctOfTotal) - Math.abs(a.pctOfTotal);
  });

  return {
    positions,
    totalNetWorthFunctional,
    hasRates: missingRateCount > 0 ? 'partial' : 'full',
    noShares: positions.length > 0 && totalNetWorthFunctional <= 0,
  };
}

/**
 * The converted positions' total. What adding them can itself lose is no net
 * worth: €1,000 less $1,100 at 1.1 left 1.1e-13, shares of 8.8e17% and a link
 * the tool refused as its own (#795). A fixed fraction of the gross would not
 * do: a trillionth of 1e15 is a real 1,000.
 */
export function netTotal(positions: readonly Pick<CurrencyPosition, 'netAmountFunctional'>[]): number {
  let total = 0;
  let gross = 0;
  for (const { netAmountFunctional: amount } of positions) {
    total += amount;
    gross += Math.abs(amount);
  }
  return Number.isFinite(gross) && Math.abs(total) <= 2 * (positions.length + 1) * Number.EPSILON * gross ? 0 : total;
}

/**
 * Concentration: each currency's share of everything held or owed, the size
 * of its net position over the sum of the sizes of all net positions, in
 * percent. The shares add to 100 whatever the signs, which is what the chart
 * draws. Equal to the exposure (`pctOfTotal`) when no currency is a net debt.
 * A currency with no exchange rate is left out. A shared view that carries
 * percentages but no amounts gives the same shares from the percentages.
 */
export function concentrationShares(
  positions: readonly Pick<CurrencyPosition, 'code' | 'netAmountFunctional' | 'pctOfTotal' | 'rateUnavailable'>[],
): Map<string, number> {
  const rated = positions.filter((p) => !p.rateUnavailable);
  const size = (p: (typeof rated)[number]) => (p.netAmountFunctional !== 0 ? Math.abs(p.netAmountFunctional) : Math.abs(p.pctOfTotal));
  const total = rated.reduce((sum, p) => sum + size(p), 0);
  return new Map(rated.map((p) => [p.code, total > 0 ? (size(p) / total) * 100 : 0]));
}

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------

/**
 * Concentration band thresholds. The labels are intentionally descriptive,
 * not advisory: the tool reports concentration size and lets the user judge
 * whether it matches their plan. An earlier revision included phrases like
 * "consider diversifying" in the labels themselves; that crossed the line
 * from calculation into recommendation, which the platform's regulatory
 * stance forbids (see docs/strategy/regulatory-advisory-classification.md
 * in the app repo). Keep these labels declarative.
 */
const RISK_THRESHOLDS: { maxPct: number; level: RiskLevel; label: string }[] = [
  { maxPct: 20, level: 'low', label: 'Low exposure' },
  { maxPct: 40, level: 'moderate', label: 'Moderate exposure' },
  { maxPct: Infinity, level: 'elevated', label: 'Elevated exposure' },
];

function assessRisk(
  pct: number,
  isFunctional: boolean,
  netAmountOriginal: number,
): [RiskLevel, string] {
  if (isFunctional) {
    return ['functional', 'Your spending currency'];
  }
  if (netAmountOriginal < 0) {
    return ['net-debt', 'Net debt in this currency'];
  }
  const absPct = Math.abs(pct);
  for (const t of RISK_THRESHOLDS) {
    if (absPct < t.maxPct) return [t.level, t.label];
  }
  return ['elevated', 'Elevated exposure'];
}

// ---------------------------------------------------------------------------
// Single-currency view
// ---------------------------------------------------------------------------

/**
 * True when every position is in the spending currency, so there is no
 * exchange-rate exposure to show. The results panel then shows what is owned
 * and owed instead of the currency donut and risk cards, which would only
 * report "100% in your own currency".
 */
export function isSingleCurrency(result: AggregationResult, functionalCurrency: string): boolean {
  const code = functionalCurrency.toUpperCase();
  return result.positions.length > 0 && result.positions.every((p) => p.code === code);
}

/**
 * What missing rates leave to show (#795). 'some': a subtotal, and nothing is
 * a share of it. 'all': original amounts, with no total either. A view without
 * amounts has nothing original to show, so it is never 'all'.
 */
export function rateGap(result: AggregationResult, functionalCurrency: string, showAmounts: boolean): 'some' | 'all' | null {
  if (isSingleCurrency(result, functionalCurrency)) return null;
  const others = result.positions.filter((p) => !p.isFunctional);
  if (showAmounts && others.length > 0 && others.every((p) => p.rateUnavailable)) return 'all';
  return result.hasRates === 'partial' ? 'some' : null;
}

/** What decides whether the rates are still to come, and whether their failure is this view's. */
interface RatesView {
  loading: boolean;
  failed: boolean;
  shared: boolean;
  singleCurrency: boolean;
  /** Rates for the spending currency are held from an earlier answer. */
  held?: boolean;
}

/**
 * Rates still on the way are not yet unavailable: until they arrive or fail
 * nothing calls them so, and there is nothing to export or print (#795).
 */
export function ratesPending(view: RatesView, hasRates: AggregationResult['hasRates']): boolean {
  return view.loading && !view.failed && !view.shared && !view.singleCurrency && hasRates === 'none';
}

/** The failure says raw amounts are shown: not while withheld, nor over amounts held rates or a sender's converted. */
export function ratesFailureShown(view: RatesView, withheld: boolean): boolean {
  return view.failed && !view.held && !view.singleCurrency && !view.shared && !withheld;
}

/** Totals of what is owned and what is owed, for rows in `currency` (same parsing as `aggregate`). */
export function ownedAndOwed(rows: AssetRow[], currency: string): { owned: number; owed: number } {
  const code = currency.toUpperCase();
  let owned = 0;
  let owed = 0;
  for (const row of rows) {
    if (row.currency.toUpperCase() !== code) continue;
    const amount = parseAmount(row.value);
    if (!Number.isFinite(amount) || amount === 0) continue;
    if (row.type === 'liability') owed += amount;
    else owned += amount;
  }
  return { owned, owed };
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Valid rows from a partially-broken CSV are still returned so the user can fix individual
 * lines in the UI instead of redoing the whole file.
 */
export interface CsvWords {
  /** Other words for "asset" in the type column: the page's own, in its language. */
  asset?: string[];
  /** Other words for "liability" in the type column. */
  liability?: string[];
}

/** The separator a file uses, by its first line: a comma, or the semicolon or tab a spreadsheet writes where the comma is the decimal mark. */
function detectSeparator(line: string): ',' | ';' | '\t' {
  const count = (sep: string) => splitCSVLine(line, sep).length;
  const [commas, semicolons, tabs] = [count(','), count(';'), count('\t')];
  if (semicolons > commas && semicolons >= tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

export function parseCSV(text: string, words: CsvWords = {}): { rows: AssetRow[]; errors: ParseError[] } {
  const rows: AssetRow[] = [];
  const errors: ParseError[] = [];
  const same = (list: string[] | undefined, word: string) => (list ?? []).some((w) => w.trim().toLowerCase() === word);

  // Blank lines are skipped, but each line keeps its number in the file, so
  // an error names the line the reader's editor shows (#875).
  const numbered = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line, i) => ({ line, num: i + 1 })).filter(({ line }) => line.trim() !== '');
  const lines = numbered.map(({ line }) => line);
  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, reason: 'empty', message: 'CSV is empty.' }] };
  }

  const separator = detectSeparator(lines[0]);

  // Detect header row: the first line is a header if it names "value" and
  // "currency", or, in any language ("Nombre;Importe;Moneda;Tipo"), if it
  // holds no digit anywhere and no currency code where the currency would be.
  let startIdx = 0;
  const first = lines[0].toLowerCase();
  const firstCols = splitCSVLine(lines[0], separator);
  const currencyCell = firstCols.length === 2 ? firstCols[1] : (firstCols[2] ?? '');
  const wordsOnly = firstCols.length >= 2 && !/\p{Nd}/u.test(lines[0]) && !isSupportedCurrency(currencyCell.trim());
  if ((first.includes('value') && first.includes('currency')) || wordsOnly) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const lineNum = numbered[i].num; // 1-based, as the file counts them
    const cols = splitCSVLine(lines[i], separator);

    if (cols.length < 2) {
      errors.push({
        line: lineNum,
        reason: 'columns',
        message: 'Expected at least value and currency columns.',
      });
      continue;
    }

    // Columns: name (optional), value (required), currency (required), type (optional)
    const rawName = (cols[0] ?? '').trim();
    const rawValue = (cols[1] ?? '').trim();
    const rawCurrency = (cols[2] ?? '').trim().toUpperCase();
    const rawType = (cols[3] ?? '').trim().toLowerCase();

    // If there are only 2 columns, treat them as value, currency (no name).
    let name: string;
    let valueStr: string;
    let currencyStr: string;
    let typeStr: string;

    if (cols.length === 2) {
      name = '';
      valueStr = rawName; // cols[0] is actually value
      currencyStr = rawValue.toUpperCase(); // cols[1] is actually currency
      typeStr = '';
    } else {
      // The tool's own download leads a formula-like name with an apostrophe
      // (src/utils/shared/exportFile.ts); reading it back takes that off.
      name = unguardText(rawName);
      valueStr = rawValue;
      currencyStr = rawCurrency;
      typeStr = rawType;
    }

    // Validate value. The amount is read the way the file writes numbers
    // and kept as the plain number the tool works with. A file that
    // separates its columns with a semicolon or a tab comes from a
    // spreadsheet where the comma is the decimal mark; in a comma file a
    // quoted "250,000" is grouped and a quoted "2500,50" can only be a
    // decimal. Anything that is not digits and marks ("0x10", "1e3",
    // "€100") is refused, never guessed at.
    const read = parseLocaleNumber(valueStr, separator === ',' ? 'en' : 'es');
    const value = read === null ? NaN : read;
    if (read !== null) valueStr = plainDigits(read);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({
        line: lineNum,
        reason: 'invalidValue',
        values: { value: valueStr },
        message: `“${valueStr}” is not a valid positive number.`,
      });
      continue;
    }

    // Validate currency.
    if (!currencyStr) {
      errors.push({ line: lineNum, reason: 'emptyCurrency', message: 'Currency code is empty.' });
      continue;
    }
    if (!isSupportedCurrency(currencyStr)) {
      const supported = CURRENCIES.map((c) => c.code).join(', ');
      errors.push({
        line: lineNum,
        reason: 'unsupportedCurrency',
        values: { value: currencyStr, supported },
        message: `“${currencyStr}” is not a supported currency. Supported: ${supported}.`,
      });
      continue;
    }

    // Validate type. An empty cell is an asset, as the format always had it.
    // Anything else must be a word for one of the two kinds: a liability
    // read as an asset moves the net worth by twice its amount.
    let type: AssetType;
    if (typeStr === '' || typeStr === 'asset' || same(words.asset, typeStr)) type = 'asset';
    else if (typeStr === 'liability' || same(words.liability, typeStr)) type = 'liability';
    else {
      errors.push({
        line: lineNum,
        reason: 'unknownType',
        values: { value: typeStr },
        message: `“${typeStr}” is not a type the tool knows. Use asset or liability.`,
      });
      continue;
    }

    rows.push({ name, value: valueStr, currency: currencyStr, type });
  }

  return { rows, errors };
}

/**
 * A CSV file's bytes as text. Files are read as UTF-8; one saved by an older
 * spreadsheet in a Windows code page would come out with broken letters
 * ("Caf" and a replacement mark), so if UTF-8 does not fit, Windows-1252 is
 * used, which covers the western European files that turn up.
 */
export function decodeCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return utf8;
  }
}

/** Handles double-quote escaping within quoted fields ("" → "). */
function splitCSVLine(line: string, separator: string = ','): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("").
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === separator) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cols.push(current.trim());
  return cols;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a code to a human-readable label for chart legends and risk cards.
 *
 * `names` is one language's currency names, keyed by code, as the tools' catalog
 * holds them (`src/i18n/strings/tools/currencies.ts`), and it is optional on
 * purpose: without one the engine's own English label stands, which is what the
 * tests exercise and what a caller that has no catalog gets. So this module
 * knows a lookup table and no language at all, and the Hindi island does not
 * have to reach for the engine's English text.
 */
export function getCurrencyLabel(code: string, names?: Record<string, string>): string {
  const info = getCurrencyInfo(code);
  if (!info) return code;
  return names?.[info.code] ?? info.label;
}

/** One decimal is enough for concentration percentages; more precision is visual noise. */
export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '0%';
  // A share that rounds to nothing is "0.0%", never "-0.0%" (#888).
  return shownNumber(pct, 1).toFixed(1) + '%';
}
