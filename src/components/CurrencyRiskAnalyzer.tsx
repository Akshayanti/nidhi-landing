import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../utils/loanMath';
import {
  aggregate,
  formatPct,
  getCurrencyLabel,
  isSupportedCurrency,
  parseCSV,
  type AssetRow,
  type ParseError,
} from '../utils/currencyRiskMath';
import {
  decodeFromQueryString,
  encodeShared,
  encodeFullData,
  type ShareMode,
  type SharedPositionData,
} from '../utils/currencyRiskUrl';

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

export default function CurrencyRiskAnalyzer() {
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
      track('free_currency_risk_shared_view_opened', { mode: decoded.shareMode ?? 'unknown', positions: decoded.sharedPositions.length });
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
      .catch(() => {
        if (cancelled) return;
        setRatesError(true);
        setRatesLoading(false);
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

  const addRow = useCallback(() => {
    setRows((prev) => {
      const next = [...prev, { name: '', value: '', currency: DEFAULT_CURRENCY, type: 'asset' as const }];
      track('free_currency_risk_asset_added', { count: next.length });
      return next;
    });
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      track('free_currency_risk_asset_removed', { count: next.length });
      return next;
    });
  }, []);

  // ---- CSV upload ----

  const handleCsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const { rows: parsed, errors: parseErrors } = parseCSV(text);
        setCsvErrors(parseErrors);
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
    track('free_currency_risk_csv_uploaded', { count: newRows.length });
  }, []);

  const confirmCsvOverwrite = useCallback(() => {
    if (csvConfirmPending) {
      applyCsvRows(csvConfirmPending);
      track('free_currency_risk_csv_overwrite_confirmed', { count: csvConfirmPending.length });
    }
  }, [csvConfirmPending, applyCsvRows]);

  const cancelCsvOverwrite = useCallback(() => {
    setCsvConfirmPending(null);
    setCsvErrors([]);
    track('free_currency_risk_csv_overwrite_cancelled');
  }, []);

  // ---- Sharing ----

  const hasData = rows.some((r) => r.value.trim() !== '');

  const openShareModal = useCallback(() => {
    if (!hasData || !result.hasRates || result.positions.length === 0) return;
    setShareUrl('');
    setCopied(false);
    setShareModalOpen(true);
    track('free_currency_risk_share_modal_opened');
  }, [hasData, result.hasRates, result.positions.length]);

  const copyShareLinkFromModal = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const qs = encodeShared(rows, result.positions, functionalCurrency, shareMode);
    const url = `${window.location.origin}${window.location.pathname}?${qs}&utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=currency_risk`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track('free_currency_risk_share_copied', { mode: shareMode });
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
    track('free_currency_risk_reset');
  }, []);

  return (
    <div className="cr-root">
      {/* ---- Toolbar ---- */}
      <div className="cr-toolbar" role="toolbar" aria-label="Currency risk analyzer actions">
        <div className="cr-funcCurrencyField">
          <label className="cr-fieldLabel" htmlFor={functionalCurrencySelectId}>
            Functional currency (the one you spend in)
          </label>
          <select
            id={functionalCurrencySelectId}
            className="cr-select"
            value={functionalCurrency}
            onChange={(e) => {
              const next = e.target.value;
              setFunctionalCurrency(next);
              track('free_currency_risk_func_currency_changed', { currency: next });
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="cr-fieldHelp">
            Your results are converted into this currency. It won't be flagged as a risk.
          </p>
        </div>

        <div className="cr-toolbarActions">
          <button
            type="button"
            className="cr-shareBtn"
            onClick={openShareModal}
            disabled={!hasData || !result.hasRates || result.positions.length === 0}
            title="Share your currency risk analysis"
          >
            Share
          </button>
          <button type="button" className="cr-resetBtn" onClick={reset} title="Clear all data and start fresh">
            Reset
          </button>
          {copied && shareUrl && (
            <div className="cr-shareUrlBar" role="status" aria-live="polite">
              <span className="cr-shareUrlLabel">Link copied to clipboard</span>
              <input
                className="cr-shareUrlInput"
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
        <div className="cr-banner cr-bannerWarn" role="alert">
          <span>
            Exchange rates unavailable, showing raw amounts without conversion.{' '}
            <button type="button" className="cr-retryBtn" onClick={() => { setRatesRetryKey((k) => k + 1); track('free_currency_risk_rates_retry'); }}>
              Retry
            </button>
          </span>
        </div>
      )}
      {ratesLoading && !ratesError && (
        <div className="cr-banner cr-bannerInfo" role="status">
          Loading exchange rates&hellip;
        </div>
      )}

      {/* ---- Read-only view banner ---- */}
      {isReadOnlyView && (
        <div className="cr-banner cr-bannerInfo">
          You're viewing a shared risk profile. The data shown is what the sender chose to include. You can start fresh with the form below.
        </div>
      )}

      {/* ---- Asset table ---- */}
      <div className="cr-tableSection">
        <div className="cr-tableHeader">
          <h2 className="cr-sectionTitle">Your assets &amp; liabilities</h2>
          <span className="cr-rowCount">
            {rows.filter((r) => r.value.trim() !== '').length} item{rows.filter((r) => r.value.trim() !== '').length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="cr-table" role="table" aria-label="Assets and liabilities">
          <div className="cr-tableHead" role="rowgroup">
            <div className="cr-tableRow cr-tableRowHead" role="row">
              <div className="cr-tableCell cr-cellName" role="columnheader">Name</div>
              <div className="cr-tableCell cr-cellValue" role="columnheader">Value</div>
              <div className="cr-tableCell cr-cellCurrency" role="columnheader">Currency</div>
              <div className="cr-tableCell cr-cellType" role="columnheader">Type</div>
              <div className="cr-tableCell cr-cellActions" role="columnheader">
                <span className="cr-srOnly">Actions</span>
              </div>
            </div>
          </div>
          <div className="cr-tableBody" role="rowgroup">
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

        <div className="cr-tableFooter">
          <button type="button" className="cr-addBtn" onClick={addRow}>
            + Add asset
          </button>
          <button
            type="button"
            className="cr-csvBtn"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV
          </button>
          <button
            type="button"
            className="cr-downloadBtn"
            onClick={() => {
              const filled = rows.filter((r) => r.value.trim() !== '');
              if (filled.length > 0) {
                downloadCSV(filled, 'full');
                track('free_currency_risk_csv_downloaded', { count: filled.length });
              }
            }}
            disabled={!hasData || isReadOnlyView}
            title="Download your assets as CSV"
          >
            Download CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="cr-srOnly"
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
          <div className="cr-csvErrors" role="alert">
            <p className="cr-csvErrorsTitle">
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
      <p className="cr-disclaimer">
        Exchange rates are ECB reference rates updated daily via the Frankfurter API.
        Concentration analysis is based on net positions (assets minus liabilities) per currency.
        This page is for educational purposes and is not financial advice.
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
    <div className="cr-tableRow" role="row">
      <div className="cr-tableCell cr-cellName" role="cell">
        <label htmlFor={nameId} className="cr-srOnly">
          Asset name (row {index + 1} of {total})
        </label>
        <input
          id={nameId}
          type="text"
          className="cr-input"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. US Stocks"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="cr-tableCell cr-cellValue" role="cell">
        <label htmlFor={valueId} className="cr-srOnly">
          Value (row {index + 1})
        </label>
        <input
          id={valueId}
          type="text"
          inputMode="decimal"
          className="cr-input"
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="50000"
          autoComplete="off"
        />
      </div>
      <div className="cr-tableCell cr-cellCurrency" role="cell">
        <label htmlFor={currencyId} className="cr-srOnly">
          Currency (row {index + 1})
        </label>
        <select
          id={currencyId}
          className="cr-select cr-selectSm"
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
      <div className="cr-tableCell cr-cellType" role="cell">
        <label htmlFor={typeId} className="cr-srOnly">
          Type (row {index + 1})
        </label>
        <select
          id={typeId}
          className="cr-select cr-selectSm"
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value as AssetRow['type'] })}
        >
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
        </select>
      </div>
      <div className="cr-tableCell cr-cellActions" role="cell">
        {onRemove && (
          <button
            type="button"
            className="cr-removeBtn"
            onClick={onRemove}
            aria-label={`Remove row ${index + 1}`}
            title="Remove"
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
      <section className="cr-results">
        <div className="cr-emptyState">
          <p>Add at least one asset to see your currency concentration.</p>
        </div>
      </section>
    );
  }

  const displayCurrency = result.hasRates ? functionalCurrency : result.positions[0].code;
  const totalLabel = !hideAmounts && result.hasRates
    ? formatMoney(Math.round(result.totalNetWorthFunctional * getFactor(displayCurrency)), displayCurrency)
    : null;

  return (
    <section className="cr-results">
      {/* Total NW */}
      {hideAmounts ? (
        <div className="cr-total cr-total--hidden">
          <span className="cr-totalLabel">Total net worth</span>
          <span className="cr-totalValue cr-totalValue--hidden">Hidden</span>
        </div>
      ) : result.hasRates && totalLabel ? (
        <div className="cr-total">
          <span className="cr-totalLabel">Total net worth</span>
          <span className="cr-totalValue">{totalLabel}</span>
        </div>
      ) : null}

      {/* Donut chart */}
      <ConcentrationChart positions={result.positions} functionalCurrency={functionalCurrency} />

      {/* Risk cards */}
      <div className="cr-riskCards">
        <h3 className="cr-riskCardsTitle">Per-currency risk assessment</h3>
        {result.positions.map((pos) => (
          <div key={pos.code} className={`cr-riskCard cr-riskCard--${pos.riskLevel}`}>
            <div className="cr-riskCardHead">
              <span
                className="cr-riskBadge"
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
              <span className="cr-riskCurrency">
                {getCurrencyLabel(pos.code)}
                {pos.rateUnavailable ? (
                  <> - <span className="cr-riskHidden">Rate unavailable</span></>
                ) : hidePct ? (
                  <> - <span className="cr-riskHidden">Hidden</span></>
                ) : (
                  pos.pctOfTotal !== 0 && <> - {formatPct(pos.pctOfTotal)}</>
                )}
                {!hideAmounts && !pos.rateUnavailable && pos.netAmountFunctional !== 0 && <> - {formatMoney(Math.round(Math.abs(pos.netAmountFunctional) * getFactor(functionalCurrency)), functionalCurrency)}</>}
              </span>
            </div>
            <p className="cr-riskLabel">
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

function Recommendation({ pos, functionalCurrency, hidePct = false }: { pos: ReturnType<typeof aggregate>['positions'][0]; functionalCurrency: string; hidePct?: boolean }) {
  if (pos.rateUnavailable) {
    return (
      <p className="cr-riskRec">
        Live rate for {pos.code} against {functionalCurrency} was not returned by the
        ECB feed, so this position is excluded from the concentration math.
        The original-currency net amount is still shown above.
      </p>
    );
  }
  if (pos.riskLevel === 'functional') {
    if (hidePct) {
      return <p className="cr-riskRec">This is your spending currency. The concentration percentage is not included in this share.</p>;
    }
    const pct = pos.pctOfTotal;
    if (pct > 50) {
      return <p className="cr-riskRec">Most of your wealth is in your spending currency. No action needed.</p>;
    }
    if (pct > 20) {
      return (
        <p className="cr-riskRec">
          {pct.toFixed(0)}% of your net worth is in your spending currency.
          Consider whether this covers your near-term expenses; the rest is exposed to exchange-rate moves.
        </p>
      );
    }
    return (
      <p className="cr-riskRec">
        Only {pct.toFixed(0)}% of your net worth is in your spending currency ({functionalCurrency}).
        Your day-to-day purchasing power is highly sensitive to exchange-rate swings.
        Consider converting some foreign-currency assets into {functionalCurrency}.
      </p>
    );
  }
  if (pos.riskLevel === 'net-debt') {
    return (
      <p className="cr-riskRec">
        You owe more than you hold in {pos.code}. This may be intentional (e.g. a mortgage)
        but the leverage increases your sensitivity to exchange-rate moves.
      </p>
    );
  }
  if (pos.riskLevel === 'elevated') {
    return hidePct ? (
      <p className="cr-riskRec">
        A significant concentration in {pos.code} could materially change your purchasing power
        if the {pos.code}/{functionalCurrency} rate moves. Consider diversifying.
      </p>
    ) : (
      <p className="cr-riskRec">
        {Math.abs(pos.pctOfTotal).toFixed(0)}% of your net worth is exposed to {pos.code}.
        A significant swing in {pos.code}/{functionalCurrency} could materially change your purchasing power.
        Consider diversifying into other currencies or your functional currency.
      </p>
    );
  }
  if (pos.riskLevel === 'moderate') {
    return (
      <p className="cr-riskRec">
        A meaningful portion of your net worth is in {pos.code}. Monitor the{' '}
        {pos.code}/{functionalCurrency} rate and consider whether your future spending needs
        are aligned with this exposure.
      </p>
    );
  }
  return (
    <p className="cr-riskRec">
      Your {pos.code} exposure is modest. No urgent action needed.
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
    <div className="cr-modalOverlay" onClick={handleOverlayClick}>
      <div
        className="cr-modalDialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <h2 className="cr-modalTitle" id={modalTitleId}>Share your analysis</h2>

        <div className="cr-modalBody">
          {/* ---- Left pane: options ---- */}
          <div className="cr-modalOptions">
            <fieldset className="cr-modalFieldset">
              <legend className="cr-modalLegend">Choose what to share:</legend>

              <label className="cr-modalCheck">
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

              <label className="cr-modalCheck">
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

            <div className="cr-modalFooter">
              <button type="button" className="cr-modalCancelBtn" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="cr-modalCopyBtn" onClick={onCopy}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {copied && shareUrl && (
              <div className="cr-shareUrlBar" role="status" aria-live="polite">
                <span className="cr-shareUrlLabel">Link copied to clipboard</span>
                <input
                  className="cr-shareUrlInput"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label="Shareable link URL"
                />
              </div>
            )}
          </div>

          {/* ---- Right pane: preview ---- */}
          <div className="cr-modalPreview">
            <h3 className="cr-modalPreviewTitle">
              Recipient preview
              {isFull && (
                <span className="cr-modalPreviewBadge">
                  {nonEmpty.length} item{nonEmpty.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="cr-modalPreviewBody">
              <ResultsPanel
                result={previewResult}
                functionalCurrency={functionalCurrency}
                ratesLoading={false}
                ratesError={false}
                hidePct={false}
                hideAmounts={!isFull}
              />
              {isFull && nonEmpty.length > 0 && (
                <div className="cr-modalAssetList">
                  <table className="cr-modalAssetTable">
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
      <div className="cr-chartSection">
        <h3 className="cr-chartTitle">Currency concentration</h3>
        <p className="cr-chartEmpty">Enter values above to see a concentration chart.</p>
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
    <div className="cr-chartSection">
      <h3 className="cr-chartTitle">Currency concentration</h3>
      <div className="cr-chartWrap">
        <svg
          className="cr-chart"
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
          <text x={cx} y={cy - 6} textAnchor="middle" className="cr-chartCenterLabel">
            {positions.length}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="cr-chartCenterSub">
            currenc{positions.length === 1 ? 'y' : 'ies'}
          </text>
        </svg>

        {/* Legend */}
        <div className="cr-legend">
          {positions.map((pos, i) => (
            <span key={pos.code} className="cr-legendItem">
              <span
                className="cr-legendSwatch"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="cr-legendCode">{pos.code}</span>
              <span className="cr-legendPct">
                {((getAmount(pos) / total) * 100).toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Screen-reader table */}
      <table className="cr-srOnly">
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
    const cancelBtn = dialog.querySelector<HTMLElement>('.cr-csvConfirmNo');
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
      className="cr-csvConfirm"
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <p id={headingId}>
        Uploading a CSV will replace your current {currentCount} item{currentCount !== 1 ? 's' : ''}
        {' '}with {pendingCount} from the file. Continue?
      </p>
      <div className="cr-csvConfirmActions">
        <button type="button" className="cr-csvConfirmYes" onClick={onConfirm}>
          Replace
        </button>
        <button type="button" className="cr-csvConfirmNo" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskLabelFromLevel(level: string): string {
  switch (level) {
    case 'functional': return 'Your spending currency';
    case 'net-debt': return 'Net debt in this currency';
    case 'elevated': return 'Elevated exposure, consider diversifying';
    case 'moderate': return 'Moderate exposure';
    default: return 'Low exposure';
  }
}

function buildSharedResult(
  sharedPositions: SharedPositionData[],
  functionalCurrency: string,
): import('../utils/currencyRiskMath').AggregationResult {
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

  return { positions, totalNetWorthFunctional, hasRates: sharedPositions.some((p) => p.netAmountFunctional !== 0) };
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
    hasRates: isFull ? realResult.hasRates : false,
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