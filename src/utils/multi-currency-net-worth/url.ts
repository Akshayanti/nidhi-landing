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
 *   - position 1: value (REQUIRED: a row with no value has no reason to exist)
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
 *   - `m=f` or `m=r`: share mode (full / redacted). Absent for the user's own URL sync.
 *   - `f=USD`: functional currency, omitted when EUR (default)
 *   - `n=3`: row count, omitted when 2 (default)
 *
 * Two sharing modes:
 *
 * 1. Full mode (`m=f`): encodes all asset rows plus per-currency
 *    concentrations and amounts. Recipient sees the sender's complete view.
 *
 *      ?m=f&f=EUR&a1=US%20Stocks~50000~USD&p_USD=22.0~moderate~46000.00
 *
 * 2. Redacted mode (`m=r`): encodes only functional currency and per-currency
 *    concentration % + risk levels. No asset rows, no amounts.
 *
 *      ?m=r&f=EUR&p_USD=28.5~moderate&p_EUR=71.5~functional
 *
 * Hard cutover: legacy `mode=full|redacted` and `a1_name`-style keys are NOT
 * decoded. v5.2 of the free-tools plan documents the rationale (the tool is
 * new, no shared URLs are in the wild yet, and carrying legacy paths
 * indefinitely would erode the simplicity gain).
 */

import type { AggregationResult, AssetRow, CurrencyPosition, RiskLevel } from './math.ts';
import { aggregate, netTotal, concentrationShares, isUnreadableAmount } from './math.ts';
import { CURRENCIES, DEFAULT_CURRENCY } from '../loan/math.ts';
import { linkCurrency, linkName, linkNumber } from '../shared/linkInput.ts';
import { decodeTuple, encodeTuple, serializeParams, setNonDefault } from '../shared/compactUrl.ts';

export type ShareMode = 'full' | 'redacted';

/**
 * Where a shared link's state lives. Links carry it after the #, which
 * browsers never send to a server; ToolStateGuard in the page head moves it
 * (or an older ?-style link's state) out of the address bar into this window
 * property before analytics start, and the component reads it from there.
 * The tool never writes inputs into the address while you type.
 */
export const SHARED_STATE_GLOBAL = '__nidhiNetWorthShared';

/**
 * Matches one state parameter name, for ToolStateGuard: today's keys, and the
 * keys of the first links (May 2026: mode, func, a0_name, c_EUR, r_EUR,
 * amt_EUR), so those too leave the address and are refused, never shown.
 */
export const STATE_KEY_PATTERN = 'm|f|n|a\\d+|p_[A-Za-z]+|' + 'mode|func|a\\d+_[a-z]+|c_[A-Za-z]+|r_[A-Za-z]+|amt_[A-Za-z]+';

/** A key only the first links (May 2026) wrote. */
const FIRST_LINK_KEY = /^(?:mode|func|a\d+_[a-z]+|c_[A-Za-z]+|r_[A-Za-z]+|amt_[A-Za-z]+)$/;
/** A key only today's links write (`n` and `f` are in both). */
const TODAY_KEY = /^(?:m|a\d+|p_[A-Za-z]+)$/;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Part of the link format (the count a link leaves out): never changed. */
const DEFAULT_ROW_COUNT = 2;
/** How many blank rows the form opens with. Not part of the link format. */
const START_ROW_COUNT = 1;
/**
 * The one limit of rows: the form, a CSV import, a link and the language
 * switch (#794). Nothing is cut to it. What is over it is refused whole, and
 * so is a list that arrives with fewer rows than it says.
 */
export const MAX_ROWS = 500;

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
  /** The sender's net worth was zero or less: `pct` is then the concentration, and no share of net worth is stated. */
  noShares?: boolean;
  /** Whether the sender had no rate for it. Absent in a link from before links said so (#795). */
  rateUnavailable?: boolean;
  /** In a full link: the currency's own amount, worked out from the rows. */
  netAmountOriginal?: number;
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
  /**
   * The list was not whole or was over MAX_ROWS, so none of it was loaded:
   * a shared link, or the state a language switch carries.
   */
  refused?: 'link' | 'transfer' | 'old';
  /**
   * An older link with a zero that could be a missing rate: it cannot say its
   * total and shares cover every currency, so none is shown (#795).
   */
  inDoubt?: boolean;
}

// The codec uses DEFAULT_CURRENCY (imported from loan/math.ts so both free
// tools share a single source of truth) as the value that gets omitted from
// the URL to keep share links short. When the audience-default changed from
// USD to EUR, every place this codec hard-coded 'USD' had to move to the
// constant; otherwise EUR users would emit `f=EUR` and per-row currency
// tags on every share, while USD users would silently drop their currency.
/** The currencies a link may name: the tools' own list. This value is also what the exchange-rate request carries. */
const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(CURRENCIES.map((c) => c.code));

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
  // Number text or the marker, never what else was typed (#789).
  fields[ROW_IDX.VALUE] = linkNumber(row.value, '');
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
  // A link's values are whoever wrote the link's: a name is cut to an
  // ordinary length, a value that does not read as a number is dropped, and
  // a currency the tools do not know becomes the default (see linkInput.ts).
  row.name = linkName(fields[ROW_IDX.NAME]);
  row.value = linkNumber(fields[ROW_IDX.VALUE], '');
  if (fields[ROW_IDX.CURRENCY] !== '') row.currency = linkCurrency(fields[ROW_IDX.CURRENCY].toUpperCase(), KNOWN_CURRENCIES, row.currency);
  if (fields[ROW_IDX.TYPE] === 'liability') row.type = 'liability';
  return row;
}

// ---------------------------------------------------------------------------
// Position tuple helpers
// ---------------------------------------------------------------------------

/** Fifth field of a position: whether its rate was known. An older link has none. */
const RATE_KNOWN = 'k';
const RATE_MISSING = 'x';

function rateStatus(pos: CurrencyPosition): string {
  // Copied on from an older link, which did not know either.
  if (pos.rateUnknown) return '';
  // With no rates at all nothing is flagged, and nothing is converted.
  const missing = pos.rateUnavailable ?? (!pos.isFunctional && pos.netAmountFunctional === 0 && pos.netAmountOriginal !== 0);
  return missing ? RATE_MISSING : RATE_KNOWN;
}

function encodePositionFull(pos: CurrencyPosition): string {
  return encodeTuple([
    pos.pctOfTotal.toFixed(1),
    pos.riskLevel,
    pos.netAmountFunctional.toFixed(2),
    '',
    rateStatus(pos),
  ]);
}

/** Fourth field of a position: net worth was zero or less, and the first field is the concentration. */
const NO_SHARES_FLAG = 'z';

/**
 * Without amounts the recipient cannot tell that net worth was zero or less,
 * and the exposure figures of that state (a debt as a share of a negative
 * total) would be read as shares. The link then carries the concentration,
 * which the chart draws, and says so.
 */
function encodePositionRedacted(pos: CurrencyPosition, concentration: number | null): string {
  if (concentration === null) return encodeTuple([pos.pctOfTotal.toFixed(1), pos.riskLevel, '', '', rateStatus(pos)]);
  return encodeTuple([concentration.toFixed(1), pos.riskLevel, '', NO_SHARES_FLAG, rateStatus(pos)]);
}

// Both are written with toFixed(), which spells 1e21 and above with an
// exponent. That spelling is taken; no smaller exponent is.
/** A share as every writer has written it, to one decimal. */
const SHARE_TEXT = /^-?(\d+\.\d|\d(\.\d+)?e\+(2[1-9]|[3-9]\d|\d{3}))$/;
/** An amount as every writer has written it, to two decimals: one cut short, or spelt another way, is not one. */
const AMOUNT_TEXT = /^-?(\d+\.\d\d|\d(\.\d+)?e\+(2[1-9]|[3-9]\d|\d{3}))$/;

function decodePosition(code: string, packed: string): SharedPositionData | null {
  const [pctRaw = '', riskRaw = '', amtRaw = '', flagRaw = '', statusRaw = ''] = decodeTuple(packed);
  if (!SHARE_TEXT.test(pctRaw)) return null;
  const pct = Number(pctRaw);
  if (!Number.isFinite(pct)) return null;

  // No band is assumed: one cut short read as Low.
  if (!isValidRiskLevel(riskRaw)) return null;
  const riskLevel: RiskLevel = riskRaw;

  const amt = amtRaw === '' ? 0 : parseFloat(amtRaw);
  return {
    code,
    pct,
    netAmountFunctional: Number.isFinite(amt) ? amt : 0,
    riskLevel,
    ...(flagRaw === NO_SHARES_FLAG ? { noShares: true } : {}),
    ...(statusRaw === RATE_KNOWN ? { rateUnavailable: false } : statusRaw === RATE_MISSING ? { rateUnavailable: true } : {}),
  };
}

/** Whether every amount in a full link reads. One that does not was shown as zero. */
function amountsRead(params: URLSearchParams): boolean {
  for (const [key, value] of params) {
    if (!key.startsWith('p_') || !KNOWN_CURRENCIES.has(key.slice(2).toUpperCase())) continue;
    const amount = decodeTuple(value, 3)[2];
    if (!AMOUNT_TEXT.test(amount) || !Number.isFinite(Number(amount))) return false;
  }
  return true;
}

/** A shared view's result, as far as its link can say. */
export function sharedResult(
  shared: SharedPositionData[],
  functionalCurrency: string,
  label: (level: RiskLevel) => string,
): AggregationResult {
  const funcCode = functionalCurrency.toUpperCase();
  const positions: CurrencyPosition[] = shared.map((p) => ({
    code: p.code,
    netAmountOriginal: p.netAmountOriginal ?? p.netAmountFunctional,
    netAmountFunctional: p.netAmountFunctional,
    pctOfTotal: p.pct,
    isFunctional: p.code === funcCode || p.riskLevel === 'functional',
    riskLevel: p.riskLevel,
    riskLabel: label(p.riskLevel),
    ...(p.rateUnavailable === undefined ? { rateUnknown: true } : { rateUnavailable: p.rateUnavailable }),
  }));

  positions.sort((a, b) => {
    if (a.isFunctional && !b.isFunctional) return -1;
    if (!a.isFunctional && b.isFunctional) return 1;
    return Math.abs(b.pctOfTotal) - Math.abs(a.pctOfTotal);
  });

  const totalNetWorthFunctional = netTotal(positions);
  // A redacted link has no amounts ('none'). A full one says itself which
  // rates were missing; from before it could, it is in doubt or it is whole.
  const anyAmount = shared.some((p) => p.netAmountFunctional !== 0);
  const anyMissing = shared.some((p) => p.rateUnavailable === true);
  return {
    positions,
    totalNetWorthFunctional,
    hasRates: anyMissing ? 'partial' : anyAmount ? 'full' : 'none',
    // With amounts the total says it; without, the link does.
    noShares: anyAmount ? totalNetWorthFunctional <= 0 : shared.some((p) => p.noShares === true),
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

  nonEmpty.forEach((row, i) => {
    const packed = encodeRow(row);
    if (packed !== '') params.set(`a${i + 1}`, packed);
  });

  return serializeParams(params);
}

/** The blank starter rows for a page whose tools start in `currency`. */
export function makeDefaultRows(currency: string = DEFAULT_CURRENCY): AssetRow[] {
  return Array.from({ length: START_ROW_COUNT }, () => makeDefaultRow(currency));
}

/**
 * Whether the form is still the page's untouched starting state: the
 * spending currency is the page's own, and every row is blank (no name, no
 * value) in that same currency. Blank rows added later count as untouched,
 * as they do in `encodeFullData`.
 */
export function isPristineFullData(rows: AssetRow[], functionalCurrency: string, pageCurrency: string): boolean {
  return (
    functionalCurrency === pageCurrency &&
    rows.every((r) => r.name.trim() === '' && r.value.trim() === '' && r.currency === pageCurrency)
  );
}

/**
 * What the tool publishes for the language switch: nothing while it is
 * untouched, so the other page opens with its own starting currency, and the
 * editable full-data encoding (unchanged) once anything changed.
 */
export function publishableState(rows: AssetRow[], functionalCurrency: string, pageCurrency: string): string {
  // Never '' once changed: blank rows alone encode as `n=0`, which decodes as
  // blank euro rows, so euros picked on a rupee page stay euros.
  return isPristineFullData(rows, functionalCurrency, pageCurrency) ? '' : encodeFullData(rows, functionalCurrency);
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

/**
 * Why a redacted link cannot be made, and the first row to go to (#795):
 * its shares would look like the whole list's. An amount that cannot be read
 * comes before a missing rate.
 */
export function redactedRefusal(
  rows: AssetRow[],
  result: AggregationResult,
): { reason: 'rows' | 'rates'; row: number; count: number } | null {
  const unreadable = rows.filter((r) => isUnreadableAmount(r.value));
  if (unreadable.length > 0) return { reason: 'rows', row: rows.indexOf(unreadable[0]), count: unreadable.length };
  if (result.hasRates === 'full') return null;
  const missing = new Set(
    result.positions.filter((p) => (result.hasRates === 'none' ? !p.isFunctional : p.rateUnavailable)).map((p) => p.code),
  );
  if (missing.size === 0) return null;
  const row = rows.findIndex((r) => r.value.trim() !== '' && missing.has(r.currency.toUpperCase()));
  return { reason: 'rates', row: Math.max(0, row), count: missing.size };
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

  nonEmpty.forEach((row, i) => {
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

  const total = netTotal(positions);
  const noShares = positions.some((p) => p.netAmountFunctional !== 0) && total <= 0;
  const concentration = noShares ? concentrationShares(positions) : null;
  for (const pos of positions) {
    params.set(`p_${pos.code}`, encodePositionRedacted(pos, concentration ? concentration.get(pos.code) ?? 0 : null));
  }
  // Last: a link cut anywhere among its positions has lost it, and is refused.
  params.set('f', functionalCurrency);

  return serializeParams(params);
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

export function decodeFromQueryString(qs: string): DecodeResult {
  const params = new URLSearchParams(qs);
  const mode = params.get('m');
  // A link from the first version (May 2026) cannot be read today: refused
  // as such, never opened as an empty form. A key of theirs beside today's
  // keys is a stray, and is ignored as before.
  const keys = [...params.keys()];
  if (keys.some((k) => FIRST_LINK_KEY.test(k)) && !keys.some((k) => TODAY_KEY.test(k))) {
    return refusal(linkCurrency(params.get('f'), KNOWN_CURRENCIES, DEFAULT_CURRENCY), 'old');
  }

  if (mode === 'r') return decodeRedacted(params);
  if (mode === 'f') return decodeFull(params);

  // No mode flag → user's own state (full-data layout, editable form).
  const functionalCurrency = linkCurrency(params.get('f'), KNOWN_CURRENCIES, DEFAULT_CURRENCY);

  if ([...params.keys()].length === 0) {
    return {
      rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
      functionalCurrency,
      isReadOnly: false,
      shareMode: null,
    };
  }

  if (!rowsAreWhole(params)) return refusal(functionalCurrency, 'transfer');
  const rows = decodeAssetRows(params);
  return { rows, functionalCurrency, isReadOnly: false, shareMode: null };
}

// ---------------------------------------------------------------------------
// Internal decode helpers
// ---------------------------------------------------------------------------

/** How many rows a link says it holds, or null where the number is no count. */
function declaredCount(params: URLSearchParams): number | null {
  const n = params.get('n');
  if (n !== null) return /^\d{1,9}$/.test(n) ? Number(n) : null;
  // The writer leaves out a count of two. With no row either, none is claimed.
  const present = [...params.keys()].filter((key) => /^a\d+$/.test(key)).length;
  return present === 0 ? 0 : Math.max(DEFAULT_ROW_COUNT, present);
}

/** Whether every row the link says it holds is in it, and no other. */
function rowsAreWhole(params: URLSearchParams): boolean {
  const count = declaredCount(params);
  if (count === null || count > MAX_ROWS) return false;
  const keys = [...params.keys()].filter((key) => /^a\d+$/.test(key));
  if (keys.length !== count) return false;
  for (let i = 1; i <= count; i++) if (!params.has(`a${i}`)) return false;
  return true;
}

function refusal(functionalCurrency: string, refused: 'link' | 'transfer' | 'old'): DecodeResult {
  return {
    rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
    functionalCurrency,
    isReadOnly: false,
    shareMode: null,
    refused,
  };
}

function decodeAssetRows(params: URLSearchParams): AssetRow[] {
  const count = declaredCount(params) ?? 0;
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
  const functionalCurrency = linkCurrency(params.get('f'), KNOWN_CURRENCIES, DEFAULT_CURRENCY);
  if (!rowsAreWhole(params)) return refusal(functionalCurrency, 'link');
  const rows = decodeAssetRows(params);
  const sharedPositions = decodePositions(params);
  if (!sharedPositions) return refusal(functionalCurrency, 'link');
  // The totals come last in a link, so a link cut short loses them first: one
  // for each currency of the rows that can be read and no other, or no total.
  const totalled = new Set(sharedPositions.map((p) => p.code));
  const needed = aggregate(rows, functionalCurrency, null).positions;
  const nothingInIt = needed.length === 0 && !rows.some((r) => isUnreadableAmount(r.value)) && sharedPositions.length === 0;
  if (nothingInIt || totalled.size !== needed.length || needed.some((p) => !totalled.has(p.code)) || !amountsRead(params)) {
    return refusal(functionalCurrency, 'link');
  }

  const own = new Map(needed.map((p) => [p.code, p.netAmountOriginal]));
  for (const pos of sharedPositions) pos.netAmountOriginal = own.get(pos.code) ?? 0;
  // A missing rate was only ever written as a zero amount. Rows that net to
  // zero add nothing with a rate or without.
  const inDoubt = sharedPositions.some(
    (p) => p.rateUnavailable === undefined && p.code !== functionalCurrency && p.netAmountFunctional === 0 && Math.abs(p.netAmountOriginal!) >= 1e-9,
  );

  return { rows, functionalCurrency, isReadOnly: true, shareMode: 'full', sharedPositions, inDoubt };
}

function decodeRedacted(params: URLSearchParams): DecodeResult {
  const functionalCurrency = linkCurrency(params.get('f'), KNOWN_CURRENCIES, DEFAULT_CURRENCY);
  const sharedPositions = decodePositions(params);
  // One that says a rate was missing is one the tool refuses to make.
  const named = KNOWN_CURRENCIES.has((params.get('f') ?? '').toUpperCase());
  if (!named || !sharedPositions || sharedPositions.length === 0 || sharedPositions.some((p) => p.rateUnavailable) || !sharesAreWhole(sharedPositions)) {
    return refusal(functionalCurrency, 'link');
  }
  // With no rows to look at, any zero share could be a missing rate, and a
  // lone one in the spending currency the first of several that were cut away.
  const lone = sharedPositions.length === 1;
  const inDoubt = sharedPositions.some((p) => p.rateUnavailable === undefined && p.pct === 0 && (lone || p.code !== functionalCurrency));

  return {
    rows: Array.from({ length: DEFAULT_ROW_COUNT }, () => makeDefaultRow()),
    functionalCurrency,
    isReadOnly: true,
    shareMode: 'redacted',
    sharedPositions,
    inDoubt,
  };
}

/**
 * A link's positions, or null where they are not whole: one that cannot be
 * read, one twice, or a rate status on some only, as a link cut short has.
 * None is skipped: what was left would look like everything (#795).
 */
function decodePositions(params: URLSearchParams): SharedPositionData[] | null {
  const positions: SharedPositionData[] = [];
  for (const [key, value] of params) {
    if (!key.startsWith('p_')) continue;
    const code = key.slice(2).toUpperCase();
    // The code is shown on the page: only a currency the tools know.
    if (!KNOWN_CURRENCIES.has(code) || positions.some((p) => p.code === code)) return null;
    const pos = decodePosition(code, value);
    if (pos === null) return null;
    positions.push(pos);
  }
  const withStatus = positions.filter((p) => p.rateUnavailable !== undefined).length;
  return withStatus === 0 || withStatus === positions.length ? positions : null;
}

/**
 * Whether a redacted link's shares are all there: all zero, or 100 together,
 * each rounded to one decimal, give or take what adding shares that large
 * loses (netTotal's bound). A lone one is 100 or zero. An older link, with no
 * status, totals more only with debts alone: every share then above zero,
 * none banded as held. A lost position whose share was zero, or small enough
 * to fall within the rounding, can pass: with no rows in the link nothing
 * else can show it.
 */
function sharesAreWhole(positions: SharedPositionData[]): boolean {
  if (positions.every((p) => p.pct === 0)) return true;
  if (positions.length === 1) return positions[0].pct === 100;
  let sum = 0;
  let size = 0;
  for (const { pct } of positions) {
    sum += pct;
    size += Math.abs(pct);
  }
  const rounding = 0.05 * positions.length + 1e-9 + 2 * (positions.length + 1) * Number.EPSILON * size;
  if (Math.abs(sum - 100) <= rounding) return true;
  const older = positions.some((p) => p.rateUnavailable === undefined);
  return older && sum > 100 && positions.every((p) => p.pct === 0 || (p.pct > 0 && (p.riskLevel === 'functional' || p.riskLevel === 'net-debt')));
}

function isValidRiskLevel(s: string): s is RiskLevel {
  return ['functional', 'low', 'moderate', 'elevated', 'net-debt', 'unbanded'].includes(s);
}

/**
 * Whether a change to the rows makes a shared view the reader's own. A
 * redacted view has no rows, and an empty one added, removed or given a
 * currency or type changes nothing that was shared: only a typed name or
 * amount is its first edit. An import, the spending currency and Clear end
 * any shared view where they happen.
 */
export function endsSharedView(redacted: boolean, edit: Partial<AssetRow> | 'add' | 'remove'): boolean {
  return !redacted || (typeof edit !== 'string' && ('name' in edit || 'value' in edit));
}
