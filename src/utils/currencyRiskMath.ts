/**
 * Currency risk analysis utilities. Pure functions, zero dependencies.
 *
 * Aggregates user assets and liabilities by currency, computes net positions,
 * converts to a functional currency using live rates, and calculates
 * concentration percentages and risk levels.
 */

import { CURRENCIES, type CurrencyInfo } from './loanMath';

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

export type RiskLevel = 'functional' | 'low' | 'moderate' | 'elevated' | 'net-debt';

export interface CurrencyPosition {
  /** 3-letter currency code. */
  code: string;
  /** Net amount in the original currency (assets minus liabilities). */
  netAmountOriginal: number;
  /** Net amount converted to the functional currency. */
  netAmountFunctional: number;
  /** Percentage of total net worth (0-100). */
  pctOfTotal: number;
  /** Whether this is the user's functional/spending currency. */
  isFunctional: boolean;
  /** Risk assessment for this currency position. */
  riskLevel: RiskLevel;
  /** Human-readable risk label. */
  riskLabel: string;
  /**
   * True when the FX rate for this currency was missing from the rates
   * response and the conversion to the functional currency could not be
   * performed. The position is shown in original units only.
   */
  rateUnavailable?: boolean;
}

export interface AggregationResult {
  positions: CurrencyPosition[];
  totalNetWorthFunctional: number;
  hasRates: boolean;
}

export interface ParseError {
  line: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/** Parse a user-entered string to a positive number. Returns NaN on failure. */
function parseAmount(s: string): number {
  const cleaned = s.replace(/[\s,]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((c) => c.code === code.toUpperCase());
}

/** Check whether a currency code is in the supported catalogue. */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code.toUpperCase());
}

/**
 * Aggregate asset rows by currency, compute net positions, and (if rates
 * are provided) convert to the functional currency and calculate risk.
 *
 * If `rates` is null, positions are returned in their original currencies
 * without conversion. The caller should display a warning that rates are
 * unavailable.
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
    return { positions: [], totalNetWorthFunctional: 0, hasRates: rates !== null };
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
    return { positions, totalNetWorthFunctional: 0, hasRates: false };
  }

  // Convert to functional currency.
  for (const pos of positions) {
    if (pos.code === funcCode) {
      pos.netAmountFunctional = pos.netAmountOriginal;
    } else {
      const rate = rates[pos.code];
      if (rate === undefined || rate === 0) {
        // Currency not in the rates response, leave unconverted and flag.
        pos.netAmountFunctional = 0;
        pos.rateUnavailable = true;
      } else {
        // rate is "1 funcCurrency = rate units of pos.code"
        // So pos.netAmountOriginal / rate = amount in funcCurrency
        pos.netAmountFunctional = pos.netAmountOriginal / rate;
      }
    }
  }

  // Total net worth in functional currency.
  const totalNetWorthFunctional = positions.reduce(
    (sum, p) => sum + p.netAmountFunctional,
    0,
  );

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
  }

  // Sort: functional currency first, then by absolute percentage descending.
  positions.sort((a, b) => {
    if (a.isFunctional && !b.isFunctional) return -1;
    if (!a.isFunctional && b.isFunctional) return 1;
    return Math.abs(b.pctOfTotal) - Math.abs(a.pctOfTotal);
  });

  return { positions, totalNetWorthFunctional, hasRates: true };
}

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------

const RISK_THRESHOLDS: { maxPct: number; level: RiskLevel; label: string }[] = [
  { maxPct: 20, level: 'low', label: 'Low exposure' },
  { maxPct: 40, level: 'moderate', label: 'Moderate exposure' },
  { maxPct: Infinity, level: 'elevated', label: 'Elevated exposure, consider diversifying' },
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
  return ['elevated', 'Elevated exposure, consider diversifying'];
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into AssetRow objects.
 *
 * Expected columns: name,value,currency,type
 * - `name` and `type` are optional (type defaults to "asset").
 * - `value` must be a positive number.
 * - `currency` must be a supported 3-letter code.
 *
 * Returns valid rows and any parse errors encountered. Valid rows from a
 * partially-broken CSV are still returned so the user can fix individual
 * lines in the UI.
 */
export function parseCSV(text: string): { rows: AssetRow[]; errors: ParseError[] } {
  const rows: AssetRow[] = [];
  const errors: ParseError[] = [];

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, message: 'CSV is empty.' }] };
  }

  // Detect header row: if the first line contains "value" and "currency"
  // (case-insensitive), skip it as a header.
  let startIdx = 0;
  const first = lines[0].toLowerCase();
  if (first.includes('value') && first.includes('currency')) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const lineNum = i + 1; // 1-based for user display
    const cols = splitCSVLine(lines[i]);

    if (cols.length < 2) {
      errors.push({ line: lineNum, message: 'Expected at least value and currency columns.' });
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
      currencyStr = rawValue; // cols[1] is actually currency
      typeStr = '';
    } else {
      name = rawName;
      valueStr = rawValue;
      currencyStr = rawCurrency;
      typeStr = rawType;
    }

    // Validate value.
    const value = parseAmount(valueStr);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({ line: lineNum, message: `"${valueStr}" is not a valid positive number.` });
      continue;
    }

    // Validate currency.
    if (!currencyStr) {
      errors.push({ line: lineNum, message: 'Currency code is empty.' });
      continue;
    }
    if (!isSupportedCurrency(currencyStr)) {
      errors.push({
        line: lineNum,
        message: `"${currencyStr}" is not a supported currency. Supported: ${CURRENCIES.map((c) => c.code).join(', ')}.`,
      });
      continue;
    }

    // Validate type.
    const type: AssetType =
      typeStr === 'liability' ? 'liability' : 'asset';

    rows.push({ name, value: valueStr, currency: currencyStr, type });
  }

  return { rows, errors };
}

/**
 * Split a single CSV line into columns, respecting quoted fields.
 * Handles double-quote escaping within quoted fields ("" → ").
 */
function splitCSVLine(line: string): string[] {
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
      } else if (ch === ',') {
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

/** Get a display label for a currency code (e.g. "Euro (EUR)"). */
export function getCurrencyLabel(code: string): string {
  const info = getCurrencyInfo(code);
  return info ? info.label : code;
}

/** Format a number with up to 1 decimal place. */
export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '0%';
  return pct.toFixed(1) + '%';
}
