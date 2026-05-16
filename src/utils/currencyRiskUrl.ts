/**
 * URL-state codec for the Currency Risk Analyzer.
 *
 * Supports two sharing modes:
 *
 * 1. Full mode — encodes all asset rows (name, value, currency, type)
 *    plus the functional currency.
 *
 *    ?mode=full&a1_n=US+Stocks&a1_v=50000&a1_c=USD&a1_t=asset&func=EUR
 *
 * 2. Redacted mode — encodes only functional currency, per-currency
 *    concentration %, and per-currency risk level. No amounts, no names.
 *
 *    ?mode=redacted&func=EUR&c_USD=28.5&r_USD=moderate&c_EUR=71.5&r_EUR=functional
 *
 * Backward compatibility: legacy anon=1 URLs are treated as redacted mode.
 *
 * Design notes:
 *   - Per-row keys use `a{i}_{key}` (a = asset, i = 1-based index).
 *   - Fields with default values (type=asset, empty name) are omitted to
 *     keep URLs short.
 *   - We track row count explicitly via `n` only when it differs from the
 *     default (2).
 *   - Empty name + empty value = row was never filled; those rows are
 *     stripped on decode so the user doesn't see ghost rows.
 */

import type { AssetRow, CurrencyPosition, RiskLevel } from './currencyRiskMath';

export type ShareMode = 'full' | 'redacted';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ROW_COUNT = 2;
const MAX_ROWS_FOR_URL = 50;

const QS_KEYS: (keyof AssetRow)[] = ['name', 'value', 'currency', 'type'];

// ---------------------------------------------------------------------------
// Shared data types
// ---------------------------------------------------------------------------

export interface SharedPositionData {
  code: string;
  pct: number;
  netAmountFunctional: number;
  riskLevel: RiskLevel;
}

export interface DecodeResult {
  rows: AssetRow[];
  functionalCurrency: string;
  /** True if viewing a shared URL (mode=full or mode=redacted). */
  isReadOnly: boolean;
  /** Which share mode the URL was created with. null = not a shared URL. */
  shareMode: ShareMode | null;
  /** Per-currency data for shared URLs. */
  sharedPositions?: SharedPositionData[];
}

function makeDefaultRow(currency: string = 'USD'): AssetRow {
  return { name: '', value: '', currency, type: 'asset' };
}

// ---------------------------------------------------------------------------
// Full-data mode: encode (used for user's own URL sync)
// ---------------------------------------------------------------------------

export function encodeFullData(
  rows: AssetRow[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();

  if (functionalCurrency !== 'USD') {
    params.set('func', functionalCurrency);
  }

  const nonEmpty = rows.filter(
    (r) => r.value.trim() !== '' || r.name.trim() !== '' || r.currency !== 'USD',
  );

  if (nonEmpty.length !== DEFAULT_ROW_COUNT) {
    params.set('n', String(nonEmpty.length));
  }

  const toEncode = nonEmpty.slice(0, MAX_ROWS_FOR_URL);

  toEncode.forEach((row, i) => {
    const idx = i + 1;
    QS_KEYS.forEach((k) => {
      const value = row[k];
      if (k === 'name' && value === '') return;
      if (k === 'value' && value === '') return;
      if (k === 'currency' && value === 'USD') return;
      if (k === 'type' && value === 'asset') return;
      params.set(`a${idx}_${k}`, String(value));
    });
  });

  return params.toString();
}

// ---------------------------------------------------------------------------
// Shared encoding: full or redacted
// ---------------------------------------------------------------------------

export function encodeShared(
  rows: AssetRow[],
  positions: CurrencyPosition[],
  functionalCurrency: string,
  mode: ShareMode,
): string {
  if (mode === 'redacted') {
    return encodeRedacted(positions, functionalCurrency);
  }
  return encodeFull(rows, positions, functionalCurrency);
}

function encodeFull(
  rows: AssetRow[],
  positions: CurrencyPosition[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();
  params.set('mode', 'full');
  params.set('func', functionalCurrency);

  const nonEmpty = rows.filter((r) => r.value.trim() !== '');

  if (nonEmpty.length !== DEFAULT_ROW_COUNT) {
    params.set('n', String(nonEmpty.length));
  }

  const toEncode = nonEmpty.slice(0, MAX_ROWS_FOR_URL);
  toEncode.forEach((row, i) => {
    const idx = i + 1;
    QS_KEYS.forEach((k) => {
      const value = row[k];
      if (k === 'name' && value === '') return;
      if (k === 'value' && value === '') return;
      if (k === 'currency' && value === 'USD') return;
      if (k === 'type' && value === 'asset') return;
      params.set(`a${idx}_${k}`, String(value));
    });
  });

  // Always include concentration % and risk levels.
  for (const pos of positions) {
    params.set(`c_${pos.code}`, pos.pctOfTotal.toFixed(1));
    params.set(`r_${pos.code}`, pos.riskLevel);
  }

  // Include per-currency amounts for full mode.
  for (const pos of positions) {
    params.set(`amt_${pos.code}`, pos.netAmountFunctional.toFixed(2));
  }

  return params.toString();
}

function encodeRedacted(
  positions: CurrencyPosition[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();
  params.set('mode', 'redacted');
  params.set('func', functionalCurrency);

  for (const pos of positions) {
    params.set(`c_${pos.code}`, pos.pctOfTotal.toFixed(1));
    params.set(`r_${pos.code}`, pos.riskLevel);
  }

  return params.toString();
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const mode = params.get('mode');

  // Redacted shared mode.
  if (mode === 'redacted') {
    return decodeRedacted(params);
  }

  // Full shared mode.
  if (mode === 'full') {
    return decodeFull(params);
  }

  // User's own data (no mode flag) or legacy full-data URL.
  const functionalCurrency = params.get('func') ?? 'USD';

  if ([...params.keys()].length === 0) {
    return {
      rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
      functionalCurrency,
      isReadOnly: false,
      shareMode: null,
    };
  }

  const rows = decodeAssetRows(params);

  return { rows, functionalCurrency, isReadOnly: false, shareMode: null };
}

// ---------------------------------------------------------------------------
// Internal decode helpers
// ---------------------------------------------------------------------------

function decodeAssetRows(params: URLSearchParams): AssetRow[] {
  let count = Number(params.get('n'));
  if (!Number.isFinite(count) || count < 1) {
    count = DEFAULT_ROW_COUNT;
    for (let i = MAX_ROWS_FOR_URL; i > DEFAULT_ROW_COUNT; i--) {
      if (params.has(`a${i}_value`)) {
        count = i;
        break;
      }
    }
  }
  count = Math.min(MAX_ROWS_FOR_URL, Math.max(1, Math.round(count)));

  const rows: AssetRow[] = [];
  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    const row = makeDefaultRow();

    const name = params.get(`a${idx}_name`);
    const value = params.get(`a${idx}_value`);
    const currency = params.get(`a${idx}_currency`);
    const type = params.get(`a${idx}_type`);

    if (name !== null) row.name = name;
    if (value !== null) row.value = value;
    if (currency !== null) row.currency = currency.toUpperCase();
    if (type !== null) {
      row.type = type === 'liability' ? 'liability' : 'asset';
    }

    rows.push(row);
  }

  // Strip trailing empty rows.
  while (
    rows.length > DEFAULT_ROW_COUNT &&
    rows[rows.length - 1].name === '' &&
    rows[rows.length - 1].value === ''
  ) {
    rows.pop();
  }

  while (rows.length < DEFAULT_ROW_COUNT) {
    rows.push(makeDefaultRow());
  }

  return rows;
}

function decodeFull(params: URLSearchParams): DecodeResult {
  const functionalCurrency = params.get('func') ?? 'USD';
  const rows = decodeAssetRows(params);
  const sharedPositions = decodePositionData(params);

  return { rows, functionalCurrency, isReadOnly: true, shareMode: 'full', sharedPositions };
}

function decodeRedacted(params: URLSearchParams): DecodeResult {
  const functionalCurrency = params.get('func') ?? 'USD';
  const sharedPositions: SharedPositionData[] = [];

  for (const [key, value] of params) {
    if (!key.startsWith('c_')) continue;
    const code = key.slice(2).toUpperCase();
    const pct = parseFloat(value);
    if (!Number.isFinite(pct)) continue;

    const riskKey = `r_${code}`;
    const riskRaw = params.get(riskKey) ?? 'low';
    const riskLevel: RiskLevel = isValidRiskLevel(riskRaw) ? riskRaw : 'low';

    sharedPositions.push({ code, pct, netAmountFunctional: 0, riskLevel });
  }

  return {
    rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
    functionalCurrency,
    isReadOnly: true,
    shareMode: 'redacted',
    sharedPositions,
  };
}

function decodePositionData(params: URLSearchParams): SharedPositionData[] {
  const positions: SharedPositionData[] = [];
  const seenCodes = new Set<string>();

  for (const [key] of params) {
    let code: string | null = null;
    if (key.startsWith('c_')) code = key.slice(2).toUpperCase();
    else if (key.startsWith('amt_')) code = key.slice(4).toUpperCase();
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);

    const pctRaw = params.get(`c_${code}`);
    const pct = pctRaw !== null ? parseFloat(pctRaw) : 0;

    const riskRaw = params.get(`r_${code}`) ?? 'low';
    const riskLevel: RiskLevel = isValidRiskLevel(riskRaw) ? riskRaw : 'low';

    const amtRaw = params.get(`amt_${code}`);
    const netAmountFunctional = amtRaw !== null ? parseFloat(amtRaw) : 0;

    positions.push({
      code,
      pct: Number.isFinite(pct) ? pct : 0,
      netAmountFunctional: Number.isFinite(netAmountFunctional) ? netAmountFunctional : 0,
      riskLevel,
    });
  }

  return positions;
}

function isValidRiskLevel(s: string): s is RiskLevel {
  return ['functional', 'low', 'moderate', 'elevated', 'net-debt'].includes(s);
}
