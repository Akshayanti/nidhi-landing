import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../utils/loan/math.ts';
import {
  aggregate,
  getCurrencyLabel,
  isSingleCurrency,
  isSupportedCurrency,
  ownedAndOwed,
  parseCSV,
  type AssetRow,
  type ParseError,
} from '../utils/multi-currency-net-worth/math.ts';
import {
  decodeFromQueryString,
  encodeShared,
  SHARED_STATE_GLOBAL,
  type ShareMode,
  type SharedPositionData,
} from '../utils/multi-currency-net-worth/url.ts';
import { CHART_SERIES, RISK_COLORS as PALETTE_RISK_COLORS } from '../styles/palette.ts';
import { formatAmount, formatPercent } from '../utils/shared/formatAmount.ts';
import { format } from '../i18n/format.ts';
import type { Dict } from '../i18n/strings/types.ts';

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/**
 * Every word this island says, handed in as a prop by the page.
 *
 * A prop rather than `dict(locale)` on purpose: `dict()` reads a
 * runtime-indexed table holding every language and every tool, so nothing tree
 * shakes and the client bundle would carry all of it to render one calculator.
 * One locale's `island` subtree serializes into the hydration payload instead,
 * and the type import above is erased at compile time.
 *
 * The subtree is plain data by construction (strings and nested groups of
 * them) because it has to survive that serialization. A function or an `Intl`
 * instance in the catalog would not.
 */
type Strings = Dict['tools']['multiCurrencyNetWorth']['island'];

// ---------------------------------------------------------------------------
// PostHog telemetry
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* never let analytics throw block UI updates */
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v1/latest';

// Chart series and risk colors come from src/styles/palette.ts (single
// source of truth shared with global.css).
const CHART_COLORS = CHART_SERIES;
const RISK_COLORS: Record<string, string> = PALETTE_RISK_COLORS;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MultiCurrencyNetWorth({ strings }: { strings: Strings }) {
  const [rows, setRows] = useState<AssetRow[]>([
    { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' },
    { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' },
  ]);
  const [functionalCurrency, setFunctionalCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const [ratesRetryKey, setRatesRetryKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [sharedPositions, setSharedPositions] = useState<SharedPositionData[] | null>(null);
  // Which kind of shared link this view came from: a redacted one carries no amounts.
  const [sharedRedacted, setSharedRedacted] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>('full');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [csvErrors, setCsvErrors] = useState<ParseError[]>([]);
  const [csvConfirmPending, setCsvConfirmPending] = useState<AssetRow[] | null>(null);

  const functionalCurrencySelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from a shared link on mount. ToolStateGuard in the page head has
  // already moved its state out of the address bar into a window property,
  // before analytics started (see SHARED_STATE_GLOBAL in the url module).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const decoded = decodeFromQueryString(typeof raw === 'string' ? raw : '');
    setRows(decoded.rows);
    setFunctionalCurrency(decoded.functionalCurrency);
    if (decoded.isReadOnly && decoded.sharedPositions) {
      setSharedPositions(decoded.sharedPositions);
      setSharedRedacted(decoded.shareMode === 'redacted');
      setIsReadOnlyView(true);
      // Capture utm_source so funnels can split direct shares (utm_source=share)
      // from other inbound campaigns. Mirrors the behavior on LoanCompare.tsx
      // (the cross-tool consistency was an explicit audit finding).
      const utmSource = new URLSearchParams(window.location.search).get('utm_source');
      track('free_multi_currency_net_worth_shared_view_opened', {
        mode: decoded.shareMode ?? 'unknown',
        positions: decoded.sharedPositions.length,
        utm_source: utmSource ?? null,
      });
    }
    setHydrated(true);
  }, []);

  // Fetch exchange rates when functional currency changes.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setRatesLoading(true);
    setRatesError(false);

    fetch(`${FRANKFURTER_BASE}?from=${functionalCurrency}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        // Include the base currency itself (rate = 1).
        const fetched: Record<string, number> = { ...data.rates, [functionalCurrency]: 1 };
        setRates(fetched);
        setRatesLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRatesError(true);
        setRatesLoading(false);
        // Surface fetch failures as their own event so we can measure how
        // often the upstream Frankfurter API actually fails for real users
        // (separate from the retry click, which only fires after we render
        // the fallback banner). Property keeps to a coarse reason; we
        // intentionally don't ship the full error message because it may
        // contain PII (proxied URLs, etc.).
        const reason = typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message).slice(0, 80)
          : 'unknown';
        track('free_multi_currency_net_worth_rates_error', {
          functionalCurrency,
          reason,
        });
      });

    return () => { cancelled = true; };
  }, [functionalCurrency, hydrated, ratesRetryKey]);

  // The inputs are never written into the address while you type: a URL can
  // reach analytics and server logs. They only leave the form in a share
  // link, after the # (CLAUDE.md, "Free tools keep inputs out of URLs").

  // Compute positions. In read-only mode, reconstruct from URL-stored data.
  const result = useMemo(() => {
    if (isReadOnlyView && sharedPositions) {
      return buildSharedResult(sharedPositions, functionalCurrency, strings);
    }
    return aggregate(rows, functionalCurrency, rates);
  }, [rows, functionalCurrency, rates, isReadOnlyView, sharedPositions, strings]);

  // Everything in the spending currency needs no exchange rates, so the rate
  // banners (loading, unavailable) do not apply.
  const singleCurrency = isSingleCurrency(result, functionalCurrency);

  // ---- Row operations ----

  const updateRow = useCallback((index: number, patch: Partial<AssetRow>) => {
    setRows((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  // We compute `next` outside the updater and reuse it for both setState
  // and analytics. Putting `track()` *inside* a setState updater would
  // double-fire under React 18 StrictMode (the dev-mode invariant
  // double-invokes updaters); production wouldn't see it, but anyone
  // running `npm run dev` against a real PostHog key would.
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' as const },
    ]);
    // Read length from a functional set via a microtask-stable closure:
    // we already know the new length is `rows.length + 1` because the
    // updater appends exactly one row. Using `rows.length + 1` here is
    // safe because StrictMode does not double-invoke the *enclosing*
    // callback, only the updater.
    track('free_multi_currency_net_worth_asset_added', { count: rows.length + 1 });
  }, [rows.length]);

  const removeRow = useCallback((index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    track('free_multi_currency_net_worth_asset_removed', { count: rows.length - 1 });
  }, [rows.length]);

  // ---- CSV upload ----

  const handleCsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const { rows: parsed, errors: parseErrors } = parseCSV(text);
        setCsvErrors(parseErrors);
        // Surface parse errors as their own event so we can measure CSV
        // friction. Properties carry counts and a coarse classification
        // (we look for the first error keyword); never the bad rows
        // themselves, which can contain user data.
        if (parseErrors.length > 0) {
          const firstMsg = parseErrors[0]?.message ?? '';
          let firstReason: 'invalid_value' | 'unsupported_currency' | 'empty' | 'columns' | 'other' = 'other';
          if (firstMsg.includes('not a valid positive number')) firstReason = 'invalid_value';
          else if (firstMsg.includes('not a supported currency')) firstReason = 'unsupported_currency';
          else if (firstMsg.includes('empty')) firstReason = 'empty';
          else if (firstMsg.includes('Expected at least')) firstReason = 'columns';
          track('free_multi_currency_net_worth_csv_parse_errors', {
            errorCount: parseErrors.length,
            validRowCount: parsed.length,
            firstReason,
          });
        }
        if (parsed.length > 0) {
          if (rows.some((r) => r.value.trim() !== '')) {
            // Existing data: confirm before overwriting.
            setCsvConfirmPending(parsed);
          } else {
            applyCsvRows(parsed);
          }
        }
      };
      reader.readAsText(file);
    },
    [rows],
  );

  const applyCsvRows = useCallback((newRows: AssetRow[]) => {
    // Ensure at least 2 rows for the form.
    const padded = newRows.length < 2
      ? [...newRows, ...Array.from({ length: 2 - newRows.length }, () => ({ name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' as const }))]
      : newRows;
    setRows(padded);
    setCsvConfirmPending(null);
    setCsvErrors([]);
    track('free_multi_currency_net_worth_csv_uploaded', { count: newRows.length });
  }, []);

  const confirmCsvOverwrite = useCallback(() => {
    if (csvConfirmPending) {
      applyCsvRows(csvConfirmPending);
      track('free_multi_currency_net_worth_csv_overwrite_confirmed', { count: csvConfirmPending.length });
    }
  }, [csvConfirmPending, applyCsvRows]);

  const cancelCsvOverwrite = useCallback(() => {
    setCsvConfirmPending(null);
    setCsvErrors([]);
    track('free_multi_currency_net_worth_csv_overwrite_cancelled');
  }, []);

  // ---- Sharing ----

  const hasData = rows.some((r) => r.value.trim() !== '');

  const openShareModal = useCallback(() => {
    // Allow share when rates are 'full' or 'partial' but not 'none':
    // a partial share encodes what's known and the recipient sees the
    // same gap the sender saw.
    if (!hasData || result.hasRates === 'none' || result.positions.length === 0) return;
    setShareUrl('');
    setCopied(false);
    setShareModalOpen(true);
    track('free_multi_currency_net_worth_share_modal_opened');
  }, [hasData, result.hasRates, result.positions.length]);

  const copyShareLinkFromModal = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const qs = encodeShared(rows, result.positions, functionalCurrency, shareMode);
    const url = `${window.location.origin}${window.location.pathname}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=multi_currency_net_worth#${qs}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track('free_multi_currency_net_worth_share_copied', { mode: shareMode });
    } catch {
      setShareUrl(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [rows, result.positions, functionalCurrency, shareMode]);

  const reset = useCallback(() => {
    setRows([
      { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' },
      { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' },
    ]);
    setFunctionalCurrency(DEFAULT_CURRENCY);
    setIsReadOnlyView(false);
    setSharedPositions(null);
    setSharedRedacted(false);
    setCsvErrors([]);
    setCsvConfirmPending(null);
    track('free_multi_currency_net_worth_reset');
  }, []);

  const filledCount = rows.filter((r) => r.value.trim() !== '').length;

  return (
    <div className="mcnw-root">
      {/* ---- Toolbar ---- */}
      <div className="mcnw-toolbar" role="toolbar" aria-label={strings.toolbar.aria}>
        <div className="mcnw-funcCurrencyField">
          <label className="mcnw-fieldLabel" htmlFor={functionalCurrencySelectId}>
            {strings.toolbar.currencyLabel}
          </label>
          <select
            id={functionalCurrencySelectId}
            className="mcnw-select"
            value={functionalCurrency}
            onChange={(e) => {
              const next = e.target.value;
              setFunctionalCurrency(next);
              track('free_multi_currency_net_worth_func_currency_changed', { currency: next });
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mcnw-fieldHelp">
            {strings.toolbar.currencyHelp}
          </p>
        </div>

        <div className="mcnw-toolbarActions">
          <button
            type="button"
            className="mcnw-shareBtn"
            onClick={openShareModal}
            disabled={!hasData || result.hasRates === 'none' || result.positions.length === 0}
            title={strings.toolbar.shareTitle}
            data-attr="mcnw-share-open"
          >
            {strings.toolbar.share}
          </button>
          <button
            type="button"
            className="mcnw-resetBtn"
            onClick={reset}
            title={strings.toolbar.resetTitle}
            data-attr="mcnw-reset"
          >
            {strings.toolbar.reset}
          </button>
          {copied && shareUrl && (
            <div className="mcnw-shareUrlBar" role="status" aria-live="polite">
              <span className="mcnw-shareUrlLabel">{strings.toolbar.copiedLabel}</span>
              <input
                className="mcnw-shareUrlInput"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label={strings.toolbar.shareUrlAria}
              />
            </div>
          )}
        </div>
      </div>

      {/* ---- Rate status ---- */}
      {ratesError && !singleCurrency && (
        <div className="mcnw-banner mcnw-bannerWarn" role="alert">
          <span>
            {strings.rates.errorBefore}{' '}
            <button
              type="button"
              className="mcnw-retryBtn"
              data-attr="mcnw-rates-retry"
              onClick={() => { setRatesRetryKey((k) => k + 1); track('free_multi_currency_net_worth_rates_retry'); }}
            >
              {strings.rates.retry}
            </button>
          </span>
        </div>
      )}
      {ratesLoading && !ratesError && !singleCurrency && (
        <div className="mcnw-banner mcnw-bannerInfo" role="status">
          {strings.rates.loading}
        </div>
      )}
      {/*
        Partial-rates banner: surfaces the case where the rates response
        came back successfully but is missing one or more currencies the
        user holds. The headline total excludes those positions, and each
        affected per-currency card already flags `rateUnavailable`. We
        still warn at the top so the user doesn't read the total as a
        complete picture.
      */}
      {!ratesError && !ratesLoading && result.hasRates === 'partial' && (
        <div className="mcnw-banner mcnw-bannerWarn" role="status" aria-live="polite">
          <span>
            {strings.rates.partial}
          </span>
        </div>
      )}

      {/* ---- Read-only view banner ---- */}
      {isReadOnlyView && (
        <div className="mcnw-banner mcnw-bannerInfo">
          {strings.shared.readOnly}
        </div>
      )}

      {/* ---- Asset table ---- */}
      <div className="mcnw-tableSection">
        <div className="mcnw-tableHeader">
          <h2 className="mcnw-sectionTitle">{strings.table.heading}</h2>
          <span className="mcnw-rowCount">
            {format(filledCount === 1 ? strings.table.itemsOne : strings.table.itemsMany, { count: filledCount })}
          </span>
        </div>

        <div className="mcnw-table" role="table" aria-label={strings.table.aria}>
          <div className="mcnw-tableHead" role="rowgroup">
            <div className="mcnw-tableRow mcnw-tableRowHead" role="row">
              <div className="mcnw-tableCell mcnw-cellName" role="columnheader">{strings.table.colName}</div>
              <div className="mcnw-tableCell mcnw-cellValue" role="columnheader">{strings.table.colValue}</div>
              <div className="mcnw-tableCell mcnw-cellCurrency" role="columnheader">{strings.table.colCurrency}</div>
              <div className="mcnw-tableCell mcnw-cellType" role="columnheader">{strings.table.colType}</div>
              <div className="mcnw-tableCell mcnw-cellActions" role="columnheader">
                <span className="mcnw-srOnly">{strings.table.colActions}</span>
              </div>
            </div>
          </div>
          <div className="mcnw-tableBody" role="rowgroup">
            {rows.map((row, i) => (
              <AssetRowInput
                key={i}
                row={row}
                index={i}
                total={rows.length}
                strings={strings}
                onChange={(patch) => updateRow(i, patch)}
                onRemove={rows.length > 1 ? () => removeRow(i) : undefined}
              />
            ))}
          </div>
        </div>

        <div className="mcnw-tableFooter">
          <button
            type="button"
            className="mcnw-addBtn"
            onClick={addRow}
            data-attr="mcnw-asset-add"
          >
            {strings.table.addAsset}
          </button>
          <button
            type="button"
            className="mcnw-csvBtn"
            onClick={() => fileInputRef.current?.click()}
            data-attr="mcnw-csv-upload"
          >
            {strings.table.uploadCsv}
          </button>
          <button
            type="button"
            className="mcnw-downloadBtn"
            onClick={() => {
              const filled = rows.filter((r) => r.value.trim() !== '');
              if (filled.length > 0) {
                downloadCSV(filled, 'full');
                track('free_multi_currency_net_worth_csv_downloaded', { count: filled.length });
              }
            }}
            disabled={!hasData || isReadOnlyView}
            title={strings.table.downloadTitle}
            data-attr="mcnw-csv-download"
          >
            {strings.table.downloadCsv}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="mcnw-srOnly"
            aria-label={strings.table.uploadCsvAria}
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvFile(file);
              // Reset so the same file can be re-uploaded.
              e.target.value = '';
            }}
          />
        </div>

        {/* CSV confirm dialog */}
        {csvConfirmPending && (
          <CSVConfirmDialog
            currentCount={filledCount}
            pendingCount={csvConfirmPending.length}
            strings={strings}
            onConfirm={confirmCsvOverwrite}
            onCancel={cancelCsvOverwrite}
          />
        )}

        {/* CSV parse errors */}
        {csvErrors.length > 0 && (
          <div className="mcnw-csvErrors" role="alert">
            <p className="mcnw-csvErrorsTitle">
              {format(csvErrors.length === 1 ? strings.table.errorTitleOne : strings.table.errorTitleMany, { count: csvErrors.length })}
            </p>
            <ul>
              {csvErrors.map((e) => (
                <li key={e.line}>
                  {format(strings.table.errorLine, { line: e.line, message: e.message })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ---- Results panel ---- */}
      <ResultsPanel
        result={result}
        functionalCurrency={functionalCurrency}
        ratesLoading={ratesLoading}
        ratesError={ratesError}
        rows={isReadOnlyView ? undefined : rows}
        hideAmounts={isReadOnlyView && sharedRedacted}
        strings={strings}
      />

      {/* ---- Disclaimer ---- */}
      {/*
        The disclaimer mirrors the global template defined in the app
        repo's docs/strategy/regulatory-advisory-classification.md, scoped
        to what this calculator can and can't tell you. The deliberate
        callouts are: (a) reference rates differ from retail rates;
        (b) future spending plans / tax residency / hedging are not modelled;
        (c) consult a licensed advisor for personalized advice.
      */}
      <p className="mcnw-disclaimer">
        {strings.results.disclaimer}
      </p>

      {/* ---- Share modal ---- */}
      {shareModalOpen && (
        <ShareModal
          rows={rows}
          result={result}
          functionalCurrency={functionalCurrency}
          shareMode={shareMode}
          onChangeMode={setShareMode}
          copied={copied}
          shareUrl={shareUrl}
          onCopy={copyShareLinkFromModal}
          onClose={() => { setShareModalOpen(false); setShareUrl(''); setCopied(false); }}
          strings={strings}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset row input
// ---------------------------------------------------------------------------

interface AssetRowInputProps {
  row: AssetRow;
  index: number;
  total: number;
  strings: Strings;
  onChange: (patch: Partial<AssetRow>) => void;
  onRemove?: () => void;
}

function AssetRowInput({ row, index, total, strings, onChange, onRemove }: AssetRowInputProps) {
  const rowId = useId();
  const nameId = `${rowId}-name`;
  const valueId = `${rowId}-value`;
  const currencyId = `${rowId}-currency`;
  const typeId = `${rowId}-type`;
  // The aria names and the remove button report a position in the table, so
  // they count from one the way a reader counts rows.
  const at = format(strings.row.nameAria, { index: index + 1, total });

  return (
    <div className="mcnw-tableRow" role="row">
      <div className="mcnw-tableCell mcnw-cellName" role="cell">
        <label htmlFor={nameId} className="mcnw-srOnly">
          {at}
        </label>
        <input
          id={nameId}
          type="text"
          className="mcnw-input"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={strings.row.namePlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="mcnw-tableCell mcnw-cellValue" role="cell">
        <label htmlFor={valueId} className="mcnw-srOnly">
          {format(strings.row.valueAria, { index: index + 1 })}
        </label>
        <input
          id={valueId}
          type="text"
          inputMode="decimal"
          className="mcnw-input"
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="50000"
          autoComplete="off"
        />
      </div>
      <div className="mcnw-tableCell mcnw-cellCurrency" role="cell">
        <label htmlFor={currencyId} className="mcnw-srOnly">
          {format(strings.row.currencyAria, { index: index + 1 })}
        </label>
        <select
          id={currencyId}
          className="mcnw-select mcnw-selectSm"
          value={row.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      <div className="mcnw-tableCell mcnw-cellType" role="cell">
        <label htmlFor={typeId} className="mcnw-srOnly">
          {format(strings.row.typeAria, { index: index + 1 })}
        </label>
        <select
          id={typeId}
          className="mcnw-select mcnw-selectSm"
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value as AssetRow['type'] })}
        >
          <option value="asset">{strings.row.asset}</option>
          <option value="liability">{strings.row.liability}</option>
        </select>
      </div>
      <div className="mcnw-tableCell mcnw-cellActions" role="cell">
        {onRemove && (
          <button
            type="button"
            className="mcnw-removeBtn"
            onClick={onRemove}
            aria-label={format(strings.row.removeAria, { index: index + 1 })}
            title={strings.row.removeTitle}
            data-attr="mcnw-asset-remove"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------

interface ResultsPanelProps {
  result: ReturnType<typeof aggregate>;
  functionalCurrency: string;
  ratesLoading: boolean;
  ratesError: boolean;
  strings: Strings;
  hidePct?: boolean;
  hideAmounts?: boolean;
  /** The entered rows, for the owned/owed split. Absent in shared views, which only carry per-currency totals. */
  rows?: AssetRow[];
}

function ResultsPanel({ result, functionalCurrency, ratesLoading, ratesError, strings, hidePct = false, hideAmounts = false, rows }: ResultsPanelProps) {
  if (result.positions.length === 0) {
    return (
      <section className="mcnw-results">
        <div className="mcnw-emptyState">
          <p>{strings.results.empty}</p>
        </div>
      </section>
    );
  }

  // Everything in the spending currency: no exchange rates are involved, so
  // show what is owned and owed instead of a donut that is 100% one colour
  // and a risk card that has nothing to assess. Needs no rates at all.
  if (isSingleCurrency(result, functionalCurrency)) {
    const money = (v: number) => formatMoney(Math.round(v * getFactor(functionalCurrency)), functionalCurrency);
    const split = rows ? ownedAndOwed(rows, functionalCurrency) : null;
    // A redacted shared link carries no amounts; its view passes hideAmounts,
    // so the total reads "Hidden" rather than a zero it never had.
    return (
      <section className="mcnw-results">
        {hideAmounts ? (
          <div className="mcnw-total mcnw-total--hidden">
            <span className="mcnw-totalLabel">{strings.results.totalLabel}</span>
            <span className="mcnw-totalValue mcnw-totalValue--hidden">{strings.results.hidden}</span>
          </div>
        ) : (
          <div className="mcnw-total">
            <span className="mcnw-totalLabel">{strings.results.totalLabel}</span>
            <span className="mcnw-totalValue">{money(result.positions[0].netAmountOriginal)}</span>
          </div>
        )}
        {split && !hideAmounts && (
          <dl className="mcnw-split">
            <div><dt>{strings.results.whatYouOwn}</dt><dd>{money(split.owned)}</dd></div>
            <div><dt>{strings.results.whatYouOwe}</dt><dd>{money(split.owed > 0 ? -split.owed : 0)}</dd></div>
          </dl>
        )}
        <p className="mcnw-singleNote">
          {format(strings.results.singleNote, { currency: getCurrencyLabel(functionalCurrency) })}
        </p>
      </section>
    );
  }

  // 'none' = no rates at all, fall back to original-currency display.
  // 'full' or 'partial' = converted total is meaningful (partial is a sum
  // of the positions whose rate was returned; the missing-rate banner
  // tells the user that the total is incomplete).
  const ratesUsable = result.hasRates !== 'none';
  const displayCurrency = ratesUsable ? functionalCurrency : result.positions[0].code;
  const totalLabel = !hideAmounts && ratesUsable
    ? formatMoney(Math.round(result.totalNetWorthFunctional * getFactor(displayCurrency)), displayCurrency)
    : null;

  return (
    <section className="mcnw-results">
      {/* Total NW */}
      {hideAmounts ? (
        <div className="mcnw-total mcnw-total--hidden">
          <span className="mcnw-totalLabel">{strings.results.totalLabel}</span>
          <span className="mcnw-totalValue mcnw-totalValue--hidden">{strings.results.hidden}</span>
        </div>
      ) : ratesUsable && totalLabel ? (
        <div className="mcnw-total">
          <span className="mcnw-totalLabel">{strings.results.totalLabel}</span>
          <span className="mcnw-totalValue">{totalLabel}</span>
          {result.hasRates === 'partial' && (
            <span className="mcnw-totalHint">
              {strings.results.partialHint}
            </span>
          )}
        </div>
      ) : null}

      {/* Donut chart */}
      <ConcentrationChart positions={result.positions} functionalCurrency={functionalCurrency} strings={strings} />

      {/* Risk cards */}
      <div className="mcnw-riskCards">
        <h3 className="mcnw-riskCardsTitle">{strings.results.riskHeading}</h3>
        {result.positions.map((pos) => (
          <div key={pos.code} className={`mcnw-riskCard mcnw-riskCard--${pos.riskLevel}`}>
            <div className="mcnw-riskCardHead">
              <span
                className="mcnw-riskBadge"
                style={{ background: RISK_COLORS[pos.riskLevel] ?? 'var(--color-text-muted)' }}
              >
                {riskBadge(strings, pos.riskLevel)}
              </span>
              <span className="mcnw-riskCurrency">
                {getCurrencyLabel(pos.code)}
                {pos.rateUnavailable ? (
                  <> - <span className="mcnw-riskHidden">{strings.results.rateUnavailable}</span></>
                ) : hidePct ? (
                  <> - <span className="mcnw-riskHidden">{strings.results.hidden}</span></>
                ) : (
                  pos.pctOfTotal !== 0 && <> - {formatPercent(pos.pctOfTotal, functionalCurrency)}</>
                )}
                {!hideAmounts && !pos.rateUnavailable && pos.netAmountFunctional !== 0 && <> - {formatMoney(Math.round(Math.abs(pos.netAmountFunctional) * getFactor(functionalCurrency)), functionalCurrency)}</>}
              </span>
            </div>
            <p className="mcnw-riskLabel">
              {pos.rateUnavailable
                ? format(strings.results.noRateAvailable, { code: pos.code, currency: functionalCurrency })
                : riskLabel(strings, pos.riskLevel)}
            </p>
            <Recommendation pos={pos} functionalCurrency={functionalCurrency} hidePct={hidePct} strings={strings} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Per-currency descriptive line. The voice is intentionally factual:
 *   - State the size of the position.
 *   - Quantify the sensitivity of net worth to a hypothetical FX move.
 *   - Stop. The user decides whether their plan justifies that exposure.
 *
 * An earlier revision used phrases like "Consider diversifying" and
 * "No action needed". Those are recommendations and the platform's
 * regulatory stance forbids them on free, unauthenticated tools (see
 * docs/strategy/regulatory-advisory-classification.md in the app repo).
 * If you ever feel tempted to re-add advisory wording here, treat it as
 * the same kind of bug as a math error. The same goes for a translation of
 * these lines: a band says how big a share is, never what to do about it.
 */
function Recommendation({ pos, functionalCurrency, hidePct = false, strings }: { pos: ReturnType<typeof aggregate>['positions'][0]; functionalCurrency: string; hidePct?: boolean; strings: Strings }) {
  if (pos.rateUnavailable) {
    return (
      <p className="mcnw-riskRec">
        {format(strings.rec.noRate, { code: pos.code, currency: functionalCurrency })}
      </p>
    );
  }
  const code = pos.code;
  if (pos.riskLevel === 'functional') {
    if (hidePct) {
      return <p className="mcnw-riskRec">{strings.rec.functionalHidden}</p>;
    }
    const pct = Math.max(0, Math.min(100, pos.pctOfTotal));
    const rest = Math.max(0, 100 - pct);
    const values = { pct: pct.toFixed(0), rest: rest.toFixed(0), currency: functionalCurrency };
    if (pct > 50) {
      return (
        <p className="mcnw-riskRec">
          {format(strings.rec.functionalMost, values)}
        </p>
      );
    }
    if (pct > 20) {
      return (
        <p className="mcnw-riskRec">
          {format(strings.rec.functionalMuch, values)}
        </p>
      );
    }
    return (
      <p className="mcnw-riskRec">
        {format(strings.rec.functionalLittle, values)}
      </p>
    );
  }
  if (pos.riskLevel === 'net-debt') {
    return (
      <p className="mcnw-riskRec">
        {format(strings.rec.netDebt, { code, currency: functionalCurrency })}
      </p>
    );
  }
  // Approximate net-worth sensitivity to a 10% FX move:
  //   change_to_NW% ≈ pct_of_NW × 10% / 100  =  pct / 10 (in percentage points)
  // i.e. a 50% USD position with USD/EUR moving 10% nudges NW by ~5%.
  // We round the displayed sensitivity to one decimal and floor it at 0.1
  // so a 1% position doesn't render as "0.1%" with confusing precision.
  const absPct = Math.abs(pos.pctOfTotal);
  const sensitivity = Math.max(0.1, absPct / 10);
  const sensitivityStr = sensitivity >= 1 ? sensitivity.toFixed(0) : sensitivity.toFixed(1);
  const values = { pct: absPct.toFixed(0), sensitivity: sensitivityStr, code, currency: functionalCurrency };
  if (pos.riskLevel === 'elevated') {
    return (
      <p className="mcnw-riskRec">
        {format(hidePct ? strings.rec.elevatedHidden : strings.rec.elevatedShown, values)}
      </p>
    );
  }
  if (pos.riskLevel === 'moderate') {
    return (
      <p className="mcnw-riskRec">
        {format(hidePct ? strings.rec.moderateHidden : strings.rec.moderateShown, values)}
      </p>
    );
  }
  // Low band.
  return (
    <p className="mcnw-riskRec">
      {format(hidePct ? strings.rec.lowHidden : strings.rec.lowShown, values)}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Share modal
// ---------------------------------------------------------------------------

interface ShareModalProps {
  rows: AssetRow[];
  result: ReturnType<typeof aggregate>;
  functionalCurrency: string;
  shareMode: ShareMode;
  onChangeMode: (mode: ShareMode) => void;
  copied: boolean;
  shareUrl: string;
  onCopy: () => void;
  onClose: () => void;
  strings: Strings;
}

function ShareModal({
  rows,
  result,
  functionalCurrency,
  shareMode,
  onChangeMode,
  copied,
  shareUrl,
  onCopy,
  onClose,
  strings,
}: ShareModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalTitleId = useId();

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const isFull = shareMode === 'full';
  const previewResult = useMemo(
    () => buildPreviewResult(result, isFull),
    [result, isFull],
  );

  const nonEmpty = rows.filter((r) => r.value.trim() !== '');

  return (
    <div className="mcnw-modalOverlay" onClick={handleOverlayClick}>
      <div
        className="mcnw-modalDialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <h2 className="mcnw-modalTitle" id={modalTitleId}>{strings.shareModal.title}</h2>

        <div className="mcnw-modalBody">
          {/* ---- Left pane: options ---- */}
          <div className="mcnw-modalOptions">
            <fieldset className="mcnw-modalFieldset">
              <legend className="mcnw-modalLegend">{strings.shareModal.legend}</legend>

              <label className="mcnw-modalCheck">
                <input
                  type="radio"
                  name="shareMode"
                  value="full"
                  checked={isFull}
                  onChange={() => onChangeMode('full')}
                />
                <span>
                  <strong>{strings.shareModal.fullName}</strong>
                  <small>{strings.shareModal.fullDesc}</small>
                </span>
              </label>

              <label className="mcnw-modalCheck">
                <input
                  type="radio"
                  name="shareMode"
                  value="redacted"
                  checked={!isFull}
                  onChange={() => onChangeMode('redacted')}
                />
                <span>
                  <strong>{strings.shareModal.redactedName}</strong>
                  <small>{strings.shareModal.redactedDesc}</small>
                </span>
              </label>
            </fieldset>

            <div className="mcnw-modalFooter">
              <button type="button" className="mcnw-modalCancelBtn" onClick={onClose} data-attr="mcnw-share-cancel">
                {strings.shareModal.cancel}
              </button>
              <button type="button" className="mcnw-modalCopyBtn" onClick={onCopy} data-attr="mcnw-share-copy">
                {copied ? strings.shareModal.copied : strings.shareModal.copy}
              </button>
            </div>
            {copied && shareUrl && (
              <div className="mcnw-shareUrlBar" role="status" aria-live="polite">
                <span className="mcnw-shareUrlLabel">{strings.toolbar.copiedLabel}</span>
                <input
                  className="mcnw-shareUrlInput"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label={strings.toolbar.shareUrlAria}
                />
              </div>
            )}
          </div>

          {/* ---- Right pane: preview ---- */}
          <div className="mcnw-modalPreview">
            <h3 className="mcnw-modalPreviewTitle">
              {strings.shareModal.previewHeading}
              {isFull && (
                <span className="mcnw-modalPreviewBadge">
                  {format(nonEmpty.length === 1 ? strings.table.itemsOne : strings.table.itemsMany, { count: nonEmpty.length })}
                </span>
              )}
            </h3>
            <div className="mcnw-modalPreviewBody">
              <ResultsPanel
                result={previewResult}
                functionalCurrency={functionalCurrency}
                ratesLoading={false}
                ratesError={false}
                hidePct={false}
                hideAmounts={!isFull}
                strings={strings}
              />
              {isFull && nonEmpty.length > 0 && (
                <div className="mcnw-modalAssetList">
                  <table className="mcnw-modalAssetTable">
                    <thead>
                      <tr>
                        <th>{strings.table.colName}</th>
                        <th>{strings.table.colValue}</th>
                        <th>{strings.table.colCurrency}</th>
                        <th>{strings.table.colType}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonEmpty.map((row, i) => (
                        <tr key={i}>
                          <td>{row.name || <em>-</em>}</td>
                          <td>{row.value}</td>
                          <td>{row.currency}</td>
                          <td>{row.type === 'liability' ? strings.row.liability : strings.row.asset}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Donut chart
// ---------------------------------------------------------------------------

interface ConcentrationChartProps {
  positions: ReturnType<typeof aggregate>['positions'];
  functionalCurrency: string;
  strings: Strings;
}

function ConcentrationChart({ positions: allPositions, functionalCurrency, strings }: ConcentrationChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const legendId = useId();

  // Escape clears the highlighted currency wherever focus is.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  // A currency with no exchange rate cannot be compared with the others, so it
  // stays out of the donut and is named underneath instead.
  const unavailable = allPositions.filter((p) => p.rateUnavailable);
  const positions = allPositions.filter((p) => !p.rateUnavailable);

  // Use functional-currency amounts for proportional sizing; fall back to
  // pctOfTotal for shared links that carry shares but no amounts.
  const getAmount = (p: typeof positions[0]) => {
    if (p.netAmountFunctional !== 0) return Math.abs(p.netAmountFunctional);
    return Math.abs(p.pctOfTotal);
  };

  const total = positions.reduce((sum, p) => sum + getAmount(p), 0);
  // A shared link in redacted mode carries shares but no amounts.
  const showAmounts = positions.some((p) => p.netAmountFunctional !== 0);

  if (total === 0) {
    return (
      <div className="mcnw-chartSection">
        <h3 className="mcnw-chartTitle">{strings.chart.heading}</h3>
        <p className="mcnw-chartEmpty">
          {unavailable.length > 0 && positions.length === 0
            ? strings.chart.emptyNoRates
            : strings.chart.emptyNoValues}
        </p>
      </div>
    );
  }

  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 104;
  const innerR = 64;
  const pop = 7; // how far the highlighted slice moves out

  const pct = (amount: number) => formatPercent((amount / total) * 100, functionalCurrency);
  const amountOf = (p: typeof positions[0]) => formatAmount(p.netAmountFunctional, functionalCurrency);

  // Build arcs. Coordinates are rounded so server and browser render the same.
  const r2 = (n: number) => n.toFixed(2);
  let cumulative = 0;
  const arcs = positions.map((pos, i) => {
    const amount = getAmount(pos);
    const fraction = amount / total;
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += amount;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const mid = (startAngle + endAngle) / 2;
    const at = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    // A single currency is a full ring: two half arcs, since one arc cannot
    // start and end at the same point.
    const d =
      fraction >= 0.9999
        ? `M ${cx - outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy} ` +
          `M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`
        : (() => {
            const [x1, y1] = at(outerR, startAngle);
            const [x2, y2] = at(outerR, endAngle);
            const [ix1, iy1] = at(innerR, startAngle);
            const [ix2, iy2] = at(innerR, endAngle);
            return [
              `M ${r2(x1)} ${r2(y1)}`,
              `A ${outerR} ${outerR} 0 ${largeArc} 1 ${r2(x2)} ${r2(y2)}`,
              `L ${r2(ix2)} ${r2(iy2)}`,
              `A ${innerR} ${innerR} 0 ${largeArc} 0 ${r2(ix1)} ${r2(iy1)}`,
              'Z',
            ].join(' ');
          })();
    const dx = r2(pop * Math.cos(mid));
    const dy = r2(pop * Math.sin(mid));
    return { pos, d, color: CHART_COLORS[i % CHART_COLORS.length], amount, dx, dy };
  });

  const activeArc = arcs.find((a) => a.pos.code === active) ?? null;
  const announce = activeArc
    ? format(showAmounts ? strings.chart.announceWithAmount : strings.chart.announce, {
        name: getCurrencyLabel(activeArc.pos.code),
        pct: pct(activeArc.amount),
        amount: amountOf(activeArc.pos),
      })
    : '';

  return (
    <div className="mcnw-chartSection">
      <h3 className="mcnw-chartTitle">{strings.chart.heading}</h3>
      <div className="mcnw-chartWrap" onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}>
        <svg
          className="mcnw-chart"
          viewBox={`-10 -10 ${size + 20} ${size + 20}`}
          role="img"
          aria-label={format(strings.chart.aria, { list: arcs.map((a) => `${getCurrencyLabel(a.pos.code)}: ${pct(a.amount)}`).join('. ') })}
          aria-describedby={legendId}
          focusable="false"
        >
          <title>{strings.chart.heading}</title>
          {arcs.map((arc) => {
            const on = arc.pos.code === active;
            return (
              <path
                key={arc.pos.code}
                d={arc.d}
                fill={arc.color}
                className={`mcnw-slice${active && !on ? ' mcnw-slice--dim' : ''}`}
                transform={on ? `translate(${arc.dx} ${arc.dy})` : undefined}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(arc.pos.code); }}
                onClick={() => setActive((cur) => (cur === arc.pos.code ? null : arc.pos.code))}
              />
            );
          })}
          {activeArc ? (
            <>
              <text x={cx} y={cy - 16} textAnchor="middle" className="mcnw-chartCenterCode">{activeArc.pos.code}</text>
              <text x={cx} y={cy + 10} textAnchor="middle" className="mcnw-chartCenterLabel">{pct(activeArc.amount)}</text>
              {showAmounts && (
                <text x={cx} y={cy + 32} textAnchor="middle" className="mcnw-chartCenterSub">{amountOf(activeArc.pos)}</text>
              )}
            </>
          ) : (
            <>
              <text x={cx} y={cy + 2} textAnchor="middle" className="mcnw-chartCenterLabel">{positions.length}</text>
              <text x={cx} y={cy + 24} textAnchor="middle" className="mcnw-chartCenterSub">
                {positions.length === 1 ? strings.chart.currencyOne : strings.chart.currencyMany}
              </text>
            </>
          )}
        </svg>

        {/* Legend: each entry highlights its slice on hover, focus or tap. */}
        <ul className="mcnw-legend" id={legendId} aria-label={strings.chart.legendAria}>
          {arcs.map((arc) => (
            <li key={arc.pos.code}>
              <button
                type="button"
                className={`mcnw-legendItem${arc.pos.code === active ? ' mcnw-legendItem--on' : ''}`}
                aria-pressed={arc.pos.code === active}
                onMouseEnter={() => setActive(arc.pos.code)}
                onFocus={() => setActive(arc.pos.code)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(arc.pos.code)}
              >
                <span className="mcnw-legendSwatch" style={{ background: arc.color }} />
                <span className="mcnw-legendCode">{arc.pos.code}</span>
                <span className="mcnw-legendPct">{pct(arc.amount)}</span>
                {showAmounts && <span className="mcnw-legendAmount">{amountOf(arc.pos)}</span>}
              </button>
            </li>
          ))}
        </ul>
        <span className="chart-srOnly" aria-live="polite">{announce}</span>
      </div>
      {unavailable.length > 0 && (
        <p className="mcnw-chartNote">
          {format(strings.chart.note, { codes: unavailable.map((p) => p.code).join(', '), currency: functionalCurrency })}
        </p>
      )}

      {/* Screen-reader table */}
      {/* A table ignores width and overflow, so the visually hidden box wraps it. */}
      <div className="mcnw-srOnly">
        <table>
          <caption>{strings.chart.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{strings.chart.tableColCurrency}</th>
              <th scope="col">{strings.chart.tableColConcentration}</th>
              <th scope="col">{strings.chart.tableColRisk}</th>
            </tr>
          </thead>
          <tbody>
            {arcs.map((a) => (
              <tr key={a.pos.code}>
                <td>{getCurrencyLabel(a.pos.code)}</td>
                <td>{pct(a.amount)}</td>
                <td>{riskLabel(strings, a.pos.riskLevel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV confirm dialog
// ---------------------------------------------------------------------------

interface CSVConfirmDialogProps {
  currentCount: number;
  pendingCount: number;
  strings: Strings;
  onConfirm: () => void;
  onCancel: () => void;
}

function CSVConfirmDialog({ currentCount, pendingCount, strings, onConfirm, onCancel }: CSVConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const cancelBtn = dialog.querySelector<HTMLElement>('.mcnw-csvConfirmNo');
    cancelBtn?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div
      className="mcnw-csvConfirm"
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <p id={headingId}>
        {format(currentCount === 1 ? strings.csv.confirmOne : strings.csv.confirmMany, {
          current: currentCount,
          pending: pendingCount,
        })}
      </p>
      <div className="mcnw-csvConfirmActions">
        <button type="button" className="mcnw-csvConfirmYes" onClick={onConfirm} data-attr="mcnw-csv-overwrite-confirm">
          {strings.csv.replace}
        </button>
        <button type="button" className="mcnw-csvConfirmNo" onClick={onCancel} data-attr="mcnw-csv-overwrite-cancel">
          {strings.csv.cancel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The band labels, in the page's language.
 *
 * `aggregate()` in math.ts also puts a label on each position, and it is the
 * English one. These read the level and the catalog instead, so a translated
 * page never renders an English band. If you change the labels in math.ts,
 * nothing here needs to change; if the *level names* change there, the switch
 * below does.
 */
function riskLabel(strings: Strings, level: string): string {
  switch (level) {
    case 'functional': return strings.results.labelFunctional;
    case 'net-debt': return strings.results.labelNetDebt;
    case 'elevated': return strings.results.labelElevated;
    case 'moderate': return strings.results.labelModerate;
    default: return strings.results.labelLow;
  }
}

/** The short badge above a risk card, which says the band and nothing more. */
function riskBadge(strings: Strings, level: string): string {
  switch (level) {
    case 'functional': return strings.results.badgeFunctional;
    case 'net-debt': return strings.results.badgeNetDebt;
    case 'elevated': return strings.results.badgeElevated;
    case 'moderate': return strings.results.badgeModerate;
    default: return strings.results.badgeLow;
  }
}

function buildSharedResult(
  sharedPositions: SharedPositionData[],
  functionalCurrency: string,
  strings: Strings,
): import('../utils/multi-currency-net-worth/math.ts').AggregationResult {
  const funcCode = functionalCurrency.toUpperCase();
  const positions = sharedPositions.map((p) => ({
    code: p.code,
    netAmountOriginal: p.netAmountFunctional,
    netAmountFunctional: p.netAmountFunctional,
    pctOfTotal: p.pct,
    isFunctional: p.code === funcCode || p.riskLevel === 'functional',
    riskLevel: p.riskLevel,
    riskLabel: riskLabel(strings, p.riskLevel),
  }));

  positions.sort((a, b) => {
    if (a.isFunctional && !b.isFunctional) return -1;
    if (!a.isFunctional && b.isFunctional) return 1;
    return Math.abs(b.pctOfTotal) - Math.abs(a.pctOfTotal);
  });

  const totalNetWorthFunctional = positions.reduce((sum, p) => sum + p.netAmountFunctional, 0);

  // For a shared (read-only) view we don't have the original rates response,
  // so we infer rate availability from whether the encoded payload carries
  // any per-position functional amounts. A redacted share has no amounts at
  // all (`'none'`); a full share that round-tripped at least one non-zero
  // amount is treated as `'full'`. We never report `'partial'` here because
  // the wire format doesn't distinguish "amount was zero" from "rate was
  // missing" once the values are flattened into the URL.
  const anyAmount = sharedPositions.some((p) => p.netAmountFunctional !== 0);
  return {
    positions,
    totalNetWorthFunctional,
    hasRates: anyAmount ? 'full' : 'none',
  };
}

function buildPreviewResult(
  realResult: ReturnType<typeof aggregate>,
  isFull: boolean,
): ReturnType<typeof aggregate> {
  const positions = realResult.positions.map((p) => ({
    ...p,
    netAmountFunctional: isFull ? p.netAmountFunctional : 0,
    netAmountOriginal: isFull ? p.netAmountOriginal : 0,
  }));

  const totalNetWorthFunctional = isFull
    ? realResult.totalNetWorthFunctional
    : 0;

  return {
    positions,
    totalNetWorthFunctional,
    // Anonymous preview suppresses amounts entirely, so it must report
    // `'none'`. The full preview inherits whatever the underlying result
    // had ('full' | 'partial' | 'none'); the share modal will not let
    // the user copy a link if the underlying result is 'none' anyway.
    hasRates: isFull ? realResult.hasRates : 'none',
  };
}

function getFactor(currency: string): number {
  const c = CURRENCIES.find((x) => x.code === currency);
  return c?.factor ?? 100;
}

/**
 * The downloaded file, and the tool's own input format.
 *
 * The header and the type column stay in English in every language: this file
 * is meant to be edited and uploaded again, and `parseCSV` detects a header by
 * looking for the words `value` and `currency` and reads the type column as
 * `asset` or `liability`. Translating either would make the tool reject the
 * file it wrote.
 */
function downloadCSV(rows: AssetRow[], mode: 'full' | 'anon') {
  const header = mode === 'full'
    ? 'Name,Value,Currency,Type'
    : 'Name,Currency,Type';
  const lines = rows.map((r) => {
    const name = r.name.includes(',') ? `"${r.name}"` : r.name;
    const type = r.type === 'liability' ? 'Liability' : 'Asset';
    if (mode === 'full') {
      return `${name},${r.value},${r.currency},${type}`;
    }
    return `${name},${r.currency},${type}`;
  });
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mode === 'full' ? 'asset-details.csv' : 'asset-details-anonymous.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
