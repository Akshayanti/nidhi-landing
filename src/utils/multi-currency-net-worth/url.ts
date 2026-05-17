/**
 * URL-state codec for the Multi-Currency Net Worth tool.
 *
 * Wire format (compact)
 * ---------------------
 * The codec follows the project-wide compact-URL convention defined in
 * `src/utils/shared/compactUrl.ts`. Short keys + tuple-packed records keep
 * share URLs ~50-60 % shorter than the previous per-field key layout, which
 * matters because users paste these into chat clients and tweets.
 *
 * Per-row tuple `a{i}=name~value~currency~type`:
 *   - position 0: name (default '', omitted when empty)
 *   - position 1: value (REQUIRED — a row with no value has no reason to exist)
 *   - position 2: currency (default 'EUR', omitted when default)
 *   - position 3: type (default 'asset', omitted when default)
 *   Trailing default fields are dropped, so a EUR asset is just `a1=Name~50000`.
 *
 * Per-currency position tuple `p_{CODE}=pct~risk~amt`:
 *   - position 0: concentration percentage (always present)
 *   - position 1: risk level (always present)
 *   - position 2: net amount in functional currency (full mode only; redacted mode drops it)
 *
 * Scalars:
 *   - `m=f` or `m=r` — share mode (full / redacted). Absent for the user's own URL sync.
 *   - `f=USD`        — functional currency, omitted when EUR (default)
 *   - `n=3`          — row count, omitted when 2 (default)
 *
 * Two sharing modes:
 *
 * 1. Full mode (`m=f`) — encodes all asset rows plus per-currency
 *    concentrations and amounts. Recipient sees the sender's complete view.
 *
 *      ?m=f&f=EUR&a1=US%20Stocks~50000~USD&p_USD=22.0~moderate~46000.00
 *
 * 2. Redacted mode (`m=r`) — encodes only functional currency and per-currency
 *    concentration % + risk levels. No asset rows, no amounts.
 *
 *      ?m=r&f=EUR&p_USD=28.5~moderate&p_EUR=71.5~functional
 *
 * Hard cutover: legacy `mode=full|redacted` and `a1_name`-style keys are NOT
 * decoded. v5.2 of the free-tools plan documents the rationale (the tool is
 * new, no shared URLs are in the wild yet, and carrying legacy paths
 * indefinitely would erode the simplicity gain).
 */

import type { AssetRow, CurrencyPosition, RiskLevel } from './math.ts';
import { DEFAULT_CURRENCY } from '../loan/math.ts';
import { decodeTuple, encodeTuple, serializeParams, setNonDefault } from '../shared/compactUrl.ts';

export type ShareMode = 'full' | 'redacted';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ROW_COUNT = 2;
const MAX_ROWS_FOR_URL = 50;

const DEFAULT_TYPE: AssetRow['type'] = 'asset';

// Tuple field positions for a row. Documented as a constant so encode/decode
// can never drift apart on field order.
const ROW_FIELD_COUNT = 4;
const ROW_IDX = { NAME: 0, VALUE: 1, CURRENCY: 2, TYPE: 3 } as const;

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
  /** When true, the form is locked and shows reconstructed data instead of editable rows. */
  isReadOnly: boolean;
  /** Determines whether the recipient sees amounts or only percentages. */
  shareMode: ShareMode | null;
  /** Reconstructed from URL params; avoids re-fetching rates for a shared view. */
  sharedPositions?: SharedPositionData[];
}

// The codec uses DEFAULT_CURRENCY (imported from loan/math.ts so both free
// tools share a single source of truth) as the value that gets omitted from
// the URL to keep share links short. When the audience-default changed from
// USD to EUR, every place this codec hard-coded 'USD' had to move to the
// constant; otherwise EUR users would emit `f=EUR` and per-row currency
// tags on every share, while USD users would silently drop their currency.
function makeDefaultRow(currency: string = DEFAULT_CURRENCY): AssetRow {
  return { name: '', value: '', currency, type: 'asset' };
}

// ---------------------------------------------------------------------------
// Per-row encode helpers
// ---------------------------------------------------------------------------

/**
 * Pack one row into its tuple form, with default-omission applied per field.
 * Returns the empty string when the row carries no information at all
 * (caller should skip emitting the parameter entirely in that case).
 */
function encodeRow(row: AssetRow): string {
  const fields = new Array<string>(ROW_FIELD_COUNT).fill('');
  // Name: omit if empty.
  fields[ROW_IDX.NAME] = row.name;
  // Value: emit verbatim. We never substitute a default because the value
  // is the row's reason for existing.
  fields[ROW_IDX.VALUE] = row.value;
  // Currency: omit if default (EUR).
  fields[ROW_IDX.CURRENCY] = row.currency === DEFAULT_CURRENCY ? '' : row.currency;
  // Type: omit if default (asset).
  fields[ROW_IDX.TYPE] = row.type === DEFAULT_TYPE ? '' : row.type;
  // encodeTuple drops trailing defaults itself.
  return encodeTuple(fields);
}

/**
 * Reverse of `encodeRow`. Re-applies defaults to any field the tuple
 * truncated or left empty.
 */
function decodeRow(packed: string): AssetRow {
  const fields = decodeTuple(packed, ROW_FIELD_COUNT);
  const row = makeDefaultRow();
  if (fields[ROW_IDX.NAME] !== '') row.name = fields[ROW_IDX.NAME];
  if (fields[ROW_IDX.VALUE] !== '') row.value = fields[ROW_IDX.VALUE];
  if (fields[ROW_IDX.CURRENCY] !== '') row.currency = fields[ROW_IDX.CURRENCY].toUpperCase();
  if (fields[ROW_IDX.TYPE] === 'liability') row.type = 'liability';
  return row;
}

// ---------------------------------------------------------------------------
// Position tuple helpers
// ---------------------------------------------------------------------------

function encodePositionFull(pos: CurrencyPosition): string {
  return encodeTuple([
    pos.pctOfTotal.toFixed(1),
    pos.riskLevel,
    pos.netAmountFunctional.toFixed(2),
  ]);
}

function encodePositionRedacted(pos: CurrencyPosition): string {
  return encodeTuple([pos.pctOfTotal.toFixed(1), pos.riskLevel]);
}

function decodePosition(code: string, packed: string): SharedPositionData | null {
  const [pctRaw, riskRaw = 'low', amtRaw = ''] = decodeTuple(packed);
  const pct = parseFloat(pctRaw);
  if (!Number.isFinite(pct)) return null;

  const riskLevel: RiskLevel = isValidRiskLevel(riskRaw) ? riskRaw : 'low';

  const amt = amtRaw === '' ? 0 : parseFloat(amtRaw);
  return {
    code,
    pct,
    netAmountFunctional: Number.isFinite(amt) ? amt : 0,
    riskLevel,
  };
}

// ---------------------------------------------------------------------------
// Encode: user's own URL sync (no mode flag, full-data layout)
// ---------------------------------------------------------------------------

export function encodeFullData(
  rows: AssetRow[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();
  setNonDefault(params, 'f', functionalCurrency, DEFAULT_CURRENCY);

  // A row that has neither a value, nor a custom name, nor a non-default
  // currency carries no information. Dropping these keeps the URL clean
  // even when the in-memory state has empty trailing rows from the form.
  const nonEmpty = rows.filter(
    (r) =>
      r.value.trim() !== '' ||
      r.name.trim() !== '' ||
      r.currency !== DEFAULT_CURRENCY,
  );

  setNonDefault(params, 'n', nonEmpty.length, DEFAULT_ROW_COUNT);

  const toEncode = nonEmpty.slice(0, MAX_ROWS_FOR_URL);
  toEncode.forEach((row, i) => {
    const packed = encodeRow(row);
    if (packed !== '') params.set(`a${i + 1}`, packed);
  });

  return serializeParams(params);
}

// ---------------------------------------------------------------------------
// Encode: shareable links (full or redacted)
// ---------------------------------------------------------------------------

export function encodeShared(
  rows: AssetRow[],
  positions: CurrencyPosition[],
  functionalCurrency: string,
  mode: ShareMode,
): string {
  return mode === 'redacted'
    ? encodeRedacted(positions, functionalCurrency)
    : encodeFull(rows, positions, functionalCurrency);
}

function encodeFull(
  rows: AssetRow[],
  positions: CurrencyPosition[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();
  params.set('m', 'f');
  // Always emit `f` in shared mode so the recipient's URL is unambiguous
  // even when the sender's functional currency happens to be the default.
  params.set('f', functionalCurrency);

  const nonEmpty = rows.filter((r) => r.value.trim() !== '');
  setNonDefault(params, 'n', nonEmpty.length, DEFAULT_ROW_COUNT);

  const toEncode = nonEmpty.slice(0, MAX_ROWS_FOR_URL);
  toEncode.forEach((row, i) => {
    const packed = encodeRow(row);
    if (packed !== '') params.set(`a${i + 1}`, packed);
  });

  for (const pos of positions) {
    params.set(`p_${pos.code}`, encodePositionFull(pos));
  }

  return serializeParams(params);
}

function encodeRedacted(
  positions: CurrencyPosition[],
  functionalCurrency: string,
): string {
  const params = new URLSearchParams();
  params.set('m', 'r');
  params.set('f', functionalCurrency);

  for (const pos of positions) {
    params.set(`p_${pos.code}`, encodePositionRedacted(pos));
  }

  return serializeParams(params);
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const mode = params.get('m');

  if (mode === 'r') return decodeRedacted(params);
  if (mode === 'f') return decodeFull(params);

  // No mode flag → user's own state (full-data layout, editable form).
  const functionalCurrency = params.get('f') ?? DEFAULT_CURRENCY;

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
  // Resolve count: explicit `n` wins; otherwise scan for the highest-index
  // populated tuple. Empty `aN` keys aren't valid (we only emit when the
  // tuple is non-empty), so the marker is simply key presence.
  let count = Number(params.get('n'));
  if (!Number.isFinite(count) || count < 1) {
    count = DEFAULT_ROW_COUNT;
    for (let i = MAX_ROWS_FOR_URL; i > DEFAULT_ROW_COUNT; i--) {
      if (params.has(`a${i}`)) {
        count = i;
        break;
      }
    }
  }
  count = Math.min(MAX_ROWS_FOR_URL, Math.max(1, Math.round(count)));

  const rows: AssetRow[] = [];
  for (let i = 0; i < count; i++) {
    const packed = params.get(`a${i + 1}`);
    rows.push(packed !== null ? decodeRow(packed) : makeDefaultRow());
  }

  // Strip trailing empty rows so the user doesn't see ghost slots beyond
  // their data, but always keep at least DEFAULT_ROW_COUNT for the form.
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
  const functionalCurrency = params.get('f') ?? DEFAULT_CURRENCY;
  const rows = decodeAssetRows(params);
  const sharedPositions = decodePositions(params);

  return { rows, functionalCurrency, isReadOnly: true, shareMode: 'full', sharedPositions };
}

function decodeRedacted(params: URLSearchParams): DecodeResult {
  const functionalCurrency = params.get('f') ?? DEFAULT_CURRENCY;
  const sharedPositions = decodePositions(params);

  return {
    rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
    functionalCurrency,
    isReadOnly: true,
    shareMode: 'redacted',
    sharedPositions,
  };
}

function decodePositions(params: URLSearchParams): SharedPositionData[] {
  const positions: SharedPositionData[] = [];
  for (const [key, value] of params) {
    if (!key.startsWith('p_')) continue;
    const code = key.slice(2).toUpperCase();
    const pos = decodePosition(code, value);
    if (pos !== null) positions.push(pos);
  }
  return positions;
}

function isValidRiskLevel(s: string): s is RiskLevel {
  return ['functional', 'low', 'moderate', 'elevated', 'net-debt'].includes(s);
}
