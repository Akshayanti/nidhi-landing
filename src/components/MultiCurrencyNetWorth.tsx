import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../utils/loan/math.ts';
import {
  aggregate,
  formatPct,
  getCurrencyLabel,
  isSupportedCurrency,
  parseCSV,
  type AssetRow,
  type ParseError,
} from '../utils/multi-currency-net-worth/math.ts';
import {
  decodeFromQueryString,
  encodeShared,
  encodeFullData,
  type ShareMode,
  type SharedPositionData,
} from '../utils/multi-currency-net-worth/url.ts';

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

const CHART_COLORS = [
  'var(--color-deep-blue)',
  'var(--color-teal)',
  '#E65100',
  '#6A1B9A',
  '#2E7D32',
  '#C62828',
  '#1565C0',
  '#6D4C41',
  '#00838F',
  '#F9A825',
  '#4A148C',
];

const RISK_COLORS: Record<string, string> = {
  functional: 'var(--color-teal)',
  low: '#2E7D32',
  moderate: '#F9A825',
  elevated: '#C62828',
  'net-debt': '#C62828',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MultiCurrencyNetWorth() {
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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>('full');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [csvErrors, setCsvErrors] = useState<ParseError[]>([]);
  const [csvConfirmPending, setCsvConfirmPending] = useState<AssetRow[] | null>(null);

  const functionalCurrencySelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from URL on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const decoded = decodeFromQueryString(window.location.search.slice(1));
    setRows(decoded.rows);
    setFunctionalCurrency(decoded.functionalCurrency);
    if (decoded.isReadOnly && decoded.sharedPositions) {
      setSharedPositions(decoded.sharedPositions);
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

  // Sync URL (full-data mode only; skip when viewing a shared URL).
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    if (isReadOnlyView) return;
    const qs = encodeFullData(rows, functionalCurrency);
    const utm = preserveUtmParams(window.location.search);
    const next = qs ? `${window.location.pathname}?${qs}${utm}` : `${window.location.pathname}${utm}`;
    window.history.replaceState(null, '', next);
  }, [rows, functionalCurrency, hydrated, isReadOnlyView]);

  // Compute positions. In read-only mode, reconstruct from URL-stored data.
  const result = useMemo(() => {
    if (isReadOnlyView && sharedPositions) {
      return buildSharedResult(sharedPositions, functionalCurrency);
    }
    return aggregate(rows, functionalCurrency, rates);
  }, [rows, functionalCurrency, rates, isReadOnlyView, sharedPositions]);

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
    const url = `${window.location.origin}${window.location.pathname}?${qs}&utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=multi_currency_net_worth`;
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
    setCsvErrors([]);
    setCsvConfirmPending(null);
    track('free_multi_currency_net_worth_reset');
  }, []);

  return (
    <div className="mcnw-root">
      {/* ---- Toolbar ---- */}
      <div className="mcnw-toolbar" role="toolbar" aria-label="Currency risk analyzer actions">
        <div className="mcnw-funcCurrencyField">
          <label className="mcnw-fieldLabel" htmlFor={functionalCurrencySelectId}>
            Functional currency (the one you spend in)
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
            Your results are converted into this currency. It won't be flagged as a risk.
          </p>
        </div>

        <div className="mcnw-toolbarActions">
          <button
            type="button"
            className="mcnw-shareBtn"
            onClick={openShareModal}
            disabled={!hasData || result.hasRates === 'none' || result.positions.length === 0}
            title="Share your currency risk analysis"
            data-attr="mcnw-share-open"
          >
            Share
          </button>
          <button
            type="button"
            className="mcnw-resetBtn"
            onClick={reset}
            title="Clear all data and start fresh"
            data-attr="mcnw-reset"
          >
            Reset
          </button>
          {copied && shareUrl && (
            <div className="mcnw-shareUrlBar" role="status" aria-live="polite">
              <span className="mcnw-shareUrlLabel">Link copied to clipboard</span>
              <input
                className="mcnw-shareUrlInput"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label="Shareable link URL"
              />
            </div>
          )}
        </div>
      </div>

      {/* ---- Rate status ---- */}
      {ratesError && (
        <div className="mcnw-banner mcnw-bannerWarn" role="alert">
          <span>
            Exchange rates unavailable, showing raw amounts without conversion.{' '}
            <button
              type="button"
              className="mcnw-retryBtn"
              data-attr="mcnw-rates-retry"
              onClick={() => { setRatesRetryKey((k) => k + 1); track('free_multi_currency_net_worth_rates_retry'); }}
            >
              Retry
            </button>
          </span>
        </div>
      )}
      {ratesLoading && !ratesError && (
        <div className="mcnw-banner mcnw-bannerInfo" role="status">
          Loading exchange rates&hellip;
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
            One or more currencies are missing a live rate, so they are
            excluded from the total below. Their original-currency amounts
            are shown on the per-currency cards.
          </span>
        </div>
      )}

      {/* ---- Read-only view banner ---- */}
      {isReadOnlyView && (
        <div className="mcnw-banner mcnw-bannerInfo">
          You're viewing a shared risk profile. The data shown is what the sender chose to include. You can start fresh with the form below.
        </div>
      )}

      {/* ---- Asset table ---- */}
      <div className="mcnw-tableSection">
        <div className="mcnw-tableHeader">
          <h2 className="mcnw-sectionTitle">Your assets &amp; liabilities</h2>
          <span className="mcnw-rowCount">
            {rows.filter((r) => r.value.trim() !== '').length} item{rows.filter((r) => r.value.trim() !== '').length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mcnw-table" role="table" aria-label="Assets and liabilities">
          <div className="mcnw-tableHead" role="rowgroup">
            <div className="mcnw-tableRow mcnw-tableRowHead" role="row">
              <div className="mcnw-tableCell mcnw-cellName" role="columnheader">Name</div>
              <div className="mcnw-tableCell mcnw-cellValue" role="columnheader">Value</div>
              <div className="mcnw-tableCell mcnw-cellCurrency" role="columnheader">Currency</div>
              <div className="mcnw-tableCell mcnw-cellType" role="columnheader">Type</div>
              <div className="mcnw-tableCell mcnw-cellActions" role="columnheader">
                <span className="mcnw-srOnly">Actions</span>
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
            + Add asset
          </button>
          <button
            type="button"
            className="mcnw-csvBtn"
            onClick={() => fileInputRef.current?.click()}
            data-attr="mcnw-csv-upload"
          >
            Upload CSV
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
            title="Download your assets as CSV"
            data-attr="mcnw-csv-download"
          >
            Download CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="mcnw-srOnly"
            aria-label="Upload CSV file"
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
            currentCount={rows.filter((r) => r.value.trim() !== '').length}
            pendingCount={csvConfirmPending.length}
            onConfirm={confirmCsvOverwrite}
            onCancel={cancelCsvOverwrite}
          />
        )}

        {/* CSV parse errors */}
        {csvErrors.length > 0 && (
          <div className="mcnw-csvErrors" role="alert">
            <p className="mcnw-csvErrorsTitle">
              {csvErrors.length} row{csvErrors.length !== 1 ? 's' : ''} could not be imported:
            </p>
            <ul>
              {csvErrors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.message}
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
        This calculator shows mathematical concentrations of your net positions across currencies,
        using ECB reference rates that may differ from rates available at your bank or broker.
        It does not account for your future spending plans, tax residency, hedging strategies,
        or risk tolerance, and it is not financial advice. For personalized advice, consult a
        licensed financial advisor.
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
  onChange: (patch: Partial<AssetRow>) => void;
  onRemove?: () => void;
}

function AssetRowInput({ row, index, total, onChange, onRemove }: AssetRowInputProps) {
  const rowId = useId();
  const nameId = `${rowId}-name`;
  const valueId = `${rowId}-value`;
  const currencyId = `${rowId}-currency`;
  const typeId = `${rowId}-type`;

  return (
    <div className="mcnw-tableRow" role="row">
      <div className="mcnw-tableCell mcnw-cellName" role="cell">
        <label htmlFor={nameId} className="mcnw-srOnly">
          Asset name (row {index + 1} of {total})
        </label>
        <input
          id={nameId}
          type="text"
          className="mcnw-input"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Asset/Liability Name"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="mcnw-tableCell mcnw-cellValue" role="cell">
        <label htmlFor={valueId} className="mcnw-srOnly">
          Value (row {index + 1})
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
          Currency (row {index + 1})
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
          Type (row {index + 1})
        </label>
        <select
          id={typeId}
          className="mcnw-select mcnw-selectSm"
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value as AssetRow['type'] })}
        >
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
        </select>
      </div>
      <div className="mcnw-tableCell mcnw-cellActions" role="cell">
        {onRemove && (
          <button
            type="button"
            className="mcnw-removeBtn"
            onClick={onRemove}
            aria-label={`Remove row ${index + 1}`}
            title="Remove"
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
  hidePct?: boolean;
  hideAmounts?: boolean;
}

function ResultsPanel({ result, functionalCurrency, ratesLoading, ratesError, hidePct = false, hideAmounts = false }: ResultsPanelProps) {
  if (result.positions.length === 0) {
    return (
      <section className="mcnw-results">
        <div className="mcnw-emptyState">
          <p>Add at least one asset to see your currency concentration.</p>
        </div>
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
          <span className="mcnw-totalLabel">Total net worth</span>
          <span className="mcnw-totalValue mcnw-totalValue--hidden">Hidden</span>
        </div>
      ) : ratesUsable && totalLabel ? (
        <div className="mcnw-total">
          <span className="mcnw-totalLabel">Total net worth</span>
          <span className="mcnw-totalValue">{totalLabel}</span>
          {result.hasRates === 'partial' && (
            <span className="mcnw-totalHint">
              At least one currency was missing a live rate and is excluded from this total.
            </span>
          )}
        </div>
      ) : null}

      {/* Donut chart */}
      <ConcentrationChart positions={result.positions} functionalCurrency={functionalCurrency} />

      {/* Risk cards */}
      <div className="mcnw-riskCards">
        <h3 className="mcnw-riskCardsTitle">Per-currency risk assessment</h3>
        {result.positions.map((pos) => (
          <div key={pos.code} className={`mcnw-riskCard mcnw-riskCard--${pos.riskLevel}`}>
            <div className="mcnw-riskCardHead">
              <span
                className="mcnw-riskBadge"
                style={{ background: RISK_COLORS[pos.riskLevel] ?? 'var(--color-text-muted)' }}
              >
                {pos.riskLevel === 'functional'
                  ? 'Functional'
                  : pos.riskLevel === 'net-debt'
                    ? 'Net debt'
                    : pos.riskLevel === 'elevated'
                      ? 'Elevated'
                      : pos.riskLevel === 'moderate'
                        ? 'Moderate'
                        : 'Low'}
              </span>
              <span className="mcnw-riskCurrency">
                {getCurrencyLabel(pos.code)}
                {pos.rateUnavailable ? (
                  <> - <span className="mcnw-riskHidden">Rate unavailable</span></>
                ) : hidePct ? (
                  <> - <span className="mcnw-riskHidden">Hidden</span></>
                ) : (
                  pos.pctOfTotal !== 0 && <> - {formatPct(pos.pctOfTotal)}</>
                )}
                {!hideAmounts && !pos.rateUnavailable && pos.netAmountFunctional !== 0 && <> - {formatMoney(Math.round(Math.abs(pos.netAmountFunctional) * getFactor(functionalCurrency)), functionalCurrency)}</>}
              </span>
            </div>
            <p className="mcnw-riskLabel">
              {pos.rateUnavailable
                ? `No live rate available for ${pos.code} against ${functionalCurrency}; shown without conversion`
                : pos.riskLabel}
            </p>
            <Recommendation pos={pos} functionalCurrency={functionalCurrency} hidePct={hidePct} />
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
 * the same kind of bug as a math error.
 */
function Recommendation({ pos, functionalCurrency, hidePct = false }: { pos: ReturnType<typeof aggregate>['positions'][0]; functionalCurrency: string; hidePct?: boolean }) {
  if (pos.rateUnavailable) {
    return (
      <p className="mcnw-riskRec">
        Live rate for {pos.code} against {functionalCurrency} was not returned by the
        ECB feed, so this position is excluded from the concentration math.
        The original-currency net amount is still shown above.
      </p>
    );
  }
  if (pos.riskLevel === 'functional') {
    if (hidePct) {
      return <p className="mcnw-riskRec">This is your spending currency. The concentration percentage is not included in this share.</p>;
    }
    const pct = Math.max(0, Math.min(100, pos.pctOfTotal));
    const rest = Math.max(0, 100 - pct);
    if (pct > 50) {
      return (
        <p className="mcnw-riskRec">
          {pct.toFixed(0)}% of your net worth is in your spending currency ({functionalCurrency}).
          The remaining {rest.toFixed(0)}% sits in other currencies and moves with their exchange rates.
        </p>
      );
    }
    if (pct > 20) {
      return (
        <p className="mcnw-riskRec">
          {pct.toFixed(0)}% of your net worth is in your spending currency ({functionalCurrency}).
          The remaining {rest.toFixed(0)}% is held in other currencies, so a meaningful share of your
          day-to-day purchasing power moves with their exchange rates.
        </p>
      );
    }
    return (
      <p className="mcnw-riskRec">
        Only {pct.toFixed(0)}% of your net worth is in your spending currency ({functionalCurrency}).
        The remaining {rest.toFixed(0)}% is held in other currencies, so most of your purchasing
        power moves with their exchange rates.
      </p>
    );
  }
  if (pos.riskLevel === 'net-debt') {
    return (
      <p className="mcnw-riskRec">
        You owe more than you hold in {pos.code} (a "net debt" position). When you have more
        liabilities than assets in a currency, the position's value moves in the opposite
        direction from a holdings position when the {pos.code}/{functionalCurrency} rate changes.
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
  if (pos.riskLevel === 'elevated') {
    return hidePct ? (
      <p className="mcnw-riskRec">
        Your {pos.code} position is a large share of net worth in this share. A 10% move in
        the {pos.code}/{functionalCurrency} rate would change your net worth by a meaningful
        amount in the same direction.
      </p>
    ) : (
      <p className="mcnw-riskRec">
        {absPct.toFixed(0)}% of your net worth sits in {pos.code}. A 10% move in
        the {pos.code}/{functionalCurrency} rate would change your net worth by
        roughly {sensitivityStr}% in the same direction.
      </p>
    );
  }
  if (pos.riskLevel === 'moderate') {
    return hidePct ? (
      <p className="mcnw-riskRec">
        A moderate share of your net worth is in {pos.code}. A 10% move in
        the {pos.code}/{functionalCurrency} rate would change your net worth in
        the same direction by a similar fraction of this share.
      </p>
    ) : (
      <p className="mcnw-riskRec">
        {absPct.toFixed(0)}% of your net worth is in {pos.code}. A 10% move in
        the {pos.code}/{functionalCurrency} rate would change your net worth by
        roughly {sensitivityStr}% in the same direction.
      </p>
    );
  }
  // Low band.
  return hidePct ? (
    <p className="mcnw-riskRec">
      A small share of your net worth is in {pos.code}. The {pos.code}/{functionalCurrency} rate
      has only a limited effect on your overall net worth.
    </p>
  ) : (
    <p className="mcnw-riskRec">
      {absPct.toFixed(0)}% of your net worth is in {pos.code}. A 10% move in
      the {pos.code}/{functionalCurrency} rate would change your net worth by
      roughly {sensitivityStr}% in the same direction.
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
        <h2 className="mcnw-modalTitle" id={modalTitleId}>Share your analysis</h2>

        <div className="mcnw-modalBody">
          {/* ---- Left pane: options ---- */}
          <div className="mcnw-modalOptions">
            <fieldset className="mcnw-modalFieldset">
              <legend className="mcnw-modalLegend">Choose what to share:</legend>

              <label className="mcnw-modalCheck">
                <input
                  type="radio"
                  name="shareMode"
                  value="full"
                  checked={isFull}
                  onChange={() => onChangeMode('full')}
                />
                <span>
                  <strong>Full version</strong>
                  <small>All asset details, values, and net worth</small>
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
                  <strong>Redacted version</strong>
                  <small>Only currency split % and risk levels. No amounts or names.</small>
                </span>
              </label>
            </fieldset>

            <div className="mcnw-modalFooter">
              <button type="button" className="mcnw-modalCancelBtn" onClick={onClose} data-attr="mcnw-share-cancel">
                Cancel
              </button>
              <button type="button" className="mcnw-modalCopyBtn" onClick={onCopy} data-attr="mcnw-share-copy">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {copied && shareUrl && (
              <div className="mcnw-shareUrlBar" role="status" aria-live="polite">
                <span className="mcnw-shareUrlLabel">Link copied to clipboard</span>
                <input
                  className="mcnw-shareUrlInput"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label="Shareable link URL"
                />
              </div>
            )}
          </div>

          {/* ---- Right pane: preview ---- */}
          <div className="mcnw-modalPreview">
            <h3 className="mcnw-modalPreviewTitle">
              Recipient preview
              {isFull && (
                <span className="mcnw-modalPreviewBadge">
                  {nonEmpty.length} item{nonEmpty.length !== 1 ? 's' : ''}
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
              />
              {isFull && nonEmpty.length > 0 && (
                <div className="mcnw-modalAssetList">
                  <table className="mcnw-modalAssetTable">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Value</th>
                        <th>Currency</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonEmpty.map((row, i) => (
                        <tr key={i}>
                          <td>{row.name || <em>-</em>}</td>
                          <td>{row.value}</td>
                          <td>{row.currency}</td>
                          <td>{row.type === 'liability' ? 'Liability' : 'Asset'}</td>
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
}

function ConcentrationChart({ positions, functionalCurrency }: ConcentrationChartProps) {
  // Use functional-currency amounts for proportional sizing when rates are
  // available; fall back to original amounts, then to pctOfTotal (anonymous mode).
  const getAmount = (p: typeof positions[0]) => {
    if (p.netAmountFunctional !== 0) return Math.abs(p.netAmountFunctional);
    if (p.netAmountOriginal !== 0) return Math.abs(p.netAmountOriginal);
    return Math.abs(p.pctOfTotal);
  };

  const total = positions.reduce((sum, p) => sum + getAmount(p), 0);

  if (total === 0) {
    return (
      <div className="mcnw-chartSection">
        <h3 className="mcnw-chartTitle">Currency concentration</h3>
        <p className="mcnw-chartEmpty">Enter values above to see a concentration chart.</p>
      </div>
    );
  }

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 90;
  const innerR = 52;
  const strokeWidth = outerR - innerR;

  // Build arcs.
  let cumulative = 0;
  const arcs = positions.map((pos, i) => {
    const amount = getAmount(pos);
    const fraction = amount / total;
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += amount;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = fraction > 0.5 ? 1 : 0;

    // Outer arc path.
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    // Inner arc path (reverse direction).
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);

    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
      'Z',
    ].join(' ');

    return { pos, d, color: CHART_COLORS[i % CHART_COLORS.length], fraction };
  });

  // Build table for screen readers.
  const srRows = positions.map((pos) => {
    const amount = getAmount(pos);
    return {
      code: pos.code,
      label: getCurrencyLabel(pos.code),
      pct: amount !== 0 ? ((amount / total) * 100).toFixed(1) : '0',
      risk: pos.riskLabel,
    };
  });

  return (
    <div className="mcnw-chartSection">
      <h3 className="mcnw-chartTitle">Currency concentration</h3>
      <div className="mcnw-chartWrap">
        <svg
          className="mcnw-chart"
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Currency concentration donut chart. ${srRows.map((r) => `${r.label}: ${r.pct}%`).join('. ')}`}
          focusable="false"
        >
          <title>Currency concentration</title>
          {arcs.map((arc) => (
            <path
              key={arc.pos.code}
              d={arc.d}
              fill={arc.color}
              stroke="var(--color-bg-white)"
              strokeWidth="1.5"
            >
              <title>
                {getCurrencyLabel(arc.pos.code)}: {(arc.fraction * 100).toFixed(1)}%
                {arc.pos.isFunctional ? ' (your spending currency)' : ''}
              </title>
            </path>
          ))}
          {/* Center label */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="mcnw-chartCenterLabel">
            {positions.length}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="mcnw-chartCenterSub">
            currenc{positions.length === 1 ? 'y' : 'ies'}
          </text>
        </svg>

        {/* Legend */}
        <div className="mcnw-legend">
          {positions.map((pos, i) => (
            <span key={pos.code} className="mcnw-legendItem">
              <span
                className="mcnw-legendSwatch"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="mcnw-legendCode">{pos.code}</span>
              <span className="mcnw-legendPct">
                {((getAmount(pos) / total) * 100).toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Screen-reader table */}
      <table className="mcnw-srOnly">
        <caption>Currency concentration by net position</caption>
        <thead>
          <tr>
            <th scope="col">Currency</th>
            <th scope="col">Concentration</th>
            <th scope="col">Risk level</th>
          </tr>
        </thead>
        <tbody>
          {srRows.map((r) => (
            <tr key={r.code}>
              <td>{r.label}</td>
              <td>{r.pct}%</td>
              <td>{r.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV confirm dialog
// ---------------------------------------------------------------------------

interface CSVConfirmDialogProps {
  currentCount: number;
  pendingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function CSVConfirmDialog({ currentCount, pendingCount, onConfirm, onCancel }: CSVConfirmDialogProps) {
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
        Uploading a CSV will replace your current {currentCount} item{currentCount !== 1 ? 's' : ''}
        {' '}with {pendingCount} from the file. Continue?
      </p>
      <div className="mcnw-csvConfirmActions">
        <button type="button" className="mcnw-csvConfirmYes" onClick={onConfirm} data-attr="mcnw-csv-overwrite-confirm">
          Replace
        </button>
        <button type="button" className="mcnw-csvConfirmNo" onClick={onCancel} data-attr="mcnw-csv-overwrite-cancel">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mirrors the descriptive band labels in math.ts. If you change the labels
 * there, change them here too. We keep the enum-to-label mapping local to
 * the component because shared (read-only) results don't carry the label
 * over the wire (only the enum) to keep share-link length tight.
 */
function riskLabelFromLevel(level: string): string {
  switch (level) {
    case 'functional': return 'Your spending currency';
    case 'net-debt': return 'Net debt in this currency';
    case 'elevated': return 'Elevated exposure';
    case 'moderate': return 'Moderate exposure';
    default: return 'Low exposure';
  }
}

function buildSharedResult(
  sharedPositions: SharedPositionData[],
  functionalCurrency: string,
): import('../utils/multi-currency-net-worth/math.ts').AggregationResult {
  const funcCode = functionalCurrency.toUpperCase();
  const positions = sharedPositions.map((p) => ({
    code: p.code,
    netAmountOriginal: p.netAmountFunctional,
    netAmountFunctional: p.netAmountFunctional,
    pctOfTotal: p.pct,
    isFunctional: p.code === funcCode || p.riskLevel === 'functional',
    riskLevel: p.riskLevel,
    riskLabel: riskLabelFromLevel(p.riskLevel),
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

function preserveUtmParams(search: string): string {
  const params = new URLSearchParams(search);
  const utm = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const val = params.get(key);
    if (val) utm.set(key, val);
  }
  const s = utm.toString();
  return s ? '&' + s : '';
}

function getFactor(currency: string): number {
  const c = CURRENCIES.find((x) => x.code === currency);
  return c?.factor ?? 100;
}

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