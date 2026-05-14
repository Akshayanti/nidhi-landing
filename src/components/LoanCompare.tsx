import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  computeLoan,
  formatMoney,
  formatMonths,
  toMinor,
  type LoanResult,
} from '../utils/loanMath';
import {
  DEFAULT_VENDORS,
  MAX_VENDORS,
  MIN_VENDORS,
  VENDOR_LABELS,
  decodeFromQueryString,
  encodeToQueryString,
  makeDefaultVendor,
  type VendorInput,
} from '../utils/loanCompareUrl';

// -----------------------------------------------------------------------------
// PostHog telemetry helper.
//
// Pageviews are auto-captured by the inline init in BaseHead.astro
// (`capture_pageview: true`), so this component never fires a pageview
// itself. We only emit explicit `capture` calls for in-component
// interactions where the analytical value is high and the privacy cost is
// low (no principal, no rates, no fees, no user-typed vendor names).
//
// `posthog.capture` works regardless of cookie-consent state. What's
// gated on consent is `autocapture` (the auto-watching of clicks on
// elements with `data-attr`). Explicit captures here therefore work for
// both consented and anonymous users, and we keep the property payloads
// strictly non-PII so that's safe.
// -----------------------------------------------------------------------------
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

// VENDOR_COLORS is intentionally kept here, not in loanCompareUrl.ts:
// it's a UI-only concern (how vendors render in the grid and chart) and
// has no place in URL state. Indices align with VENDOR_LABELS A-E.
const VENDOR_COLORS = [
  'var(--color-deep-blue)',
  'var(--color-teal)',
  '#E65100', // orange
  '#6A1B9A', // purple
  '#2E7D32', // green
];

// ---- Computation -----------------------------------------------------------

function parseNumber(s: string): number {
  const cleaned = s.replace(/[\s,]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function computeFromInput(v: VendorInput, currency: string): LoanResult {
  const principalMinor = toMinor(parseNumber(v.principal), currency);
  const annualRate = parseNumber(v.annualRatePct) / 100;
  const feeMinor = toMinor(parseNumber(v.feeMajor) || 0, currency);
  const extraMonthlyMinor = toMinor(parseNumber(v.extraMonthly) || 0, currency);

  if (v.modeKind === 'term') {
    const months = Math.round(parseNumber(v.termMonths));
    return computeLoan(
      { principalMinor, annualRate, feeMinor, extraMonthlyMinor },
      { kind: 'term', months },
    );
  }
  const monthlyMinor = toMinor(parseNumber(v.monthlyPayment), currency);
  return computeLoan(
    { principalMinor, annualRate, feeMinor, extraMonthlyMinor },
    { kind: 'payment', monthlyMinor },
  );
}

// ---- Chart -----------------------------------------------------------------

interface ChartProps {
  results: LoanResult[];
  colors: string[];
  vendorNames: string[];
  currency: string;
}

function BalanceChart({ results, colors, vendorNames, currency }: ChartProps) {
  const width = 720;
  const height = 280;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 36;

  const valid = results
    .map((r, i) => ({ r, i, name: vendorNames[i] }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0);

  if (valid.length === 0) {
    return <p className="lc-chartEmpty">Enter valid inputs above to see a payoff chart.</p>;
  }

  const maxMonths = Math.max(...valid.map(({ r }) => r.schedule.length));
  const initialBalances = valid.map(({ r }) => {
    const row = r.schedule[0];
    return row.balance + row.principal;
  });
  const yMax = Math.max(...initialBalances);

  const xScale = (m: number) => padL + (m / Math.max(maxMonths, 1)) * (width - padL - padR);
  const yScale = (v: number) => padT + (1 - v / Math.max(yMax, 1)) * (height - padT - padB);

  const xTicks = niceTicks(0, maxMonths, 6);
  const yTicks = niceTicks(0, yMax, 5);

  const ariaSummary =
    'Loan balance over time. ' +
    valid
      .map(
        ({ r, name }) =>
          `${name}: starts at ${formatMoney(
            r.schedule[0].balance + r.schedule[0].principal,
            currency,
          )}, paid off in ${formatMonths(r.months)}.`,
      )
      .join(' ');

  return (
    <>
    <svg
      className="lc-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaSummary}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <title>Loan balance over time</title>
      <desc>{ariaSummary}</desc>
      {yTicks.map((t) => (
        <g key={`yt-${t}`}>
          <line
            x1={padL}
            x2={width - padR}
            y1={yScale(t)}
            y2={yScale(t)}
            className="lc-chartGrid"
          />
          <text
            x={padL - 6}
            y={yScale(t)}
            className="lc-chartTickY"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {compactMoney(t, currency)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`xt-${t}`}>
          <line
            x1={xScale(t)}
            x2={xScale(t)}
            y1={height - padB}
            y2={height - padB + 4}
            className="lc-chartAxis"
          />
          <text
            x={xScale(t)}
            y={height - padB + 18}
            className="lc-chartTickX"
            textAnchor="middle"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x={(padL + width - padR) / 2}
        y={height - 4}
        className="lc-chartAxisLabel"
        textAnchor="middle"
      >
        Month
      </text>
      {results.map((r, i) => {
        if (r.error || r.schedule.length === 0) return null;
        const initial = r.schedule[0].balance + r.schedule[0].principal;
        let d = `M ${xScale(0)} ${yScale(initial)}`;
        r.schedule.forEach((row) => {
          d += ` L ${xScale(row.month)} ${yScale(row.balance)}`;
        });
        return (
          <path
            key={`line-${i}`}
            d={d}
            fill="none"
            stroke={colors[i]}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>{`${vendorNames[i]} balance over time`}</title>
          </path>
        );
      })}
    </svg>
    <table className="lc-srOnly">
      <caption>Loan balance over time, sampled by month</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          {valid.map(({ name, i }) => (
            <th key={i} scope="col">{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sampleSchedule(valid.map(({ r }) => r.schedule), 12).map((row) => (
          <tr key={row.month}>
            <th scope="row">{row.month}</th>
            {row.values.map((v, idx) => (
              <td key={idx}>{v == null ? 'n/a' : formatMoney(v, currency)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </>
  );
}

function sampleSchedule(
  schedules: { month: number; balance: number }[][],
  target: number,
): { month: number; values: (number | null)[] }[] {
  const maxMonth = Math.max(...schedules.map((s) => s.length));
  if (maxMonth === 0) return [];
  const step = Math.max(1, Math.ceil(maxMonth / target));
  const months: number[] = [];
  for (let m = step; m < maxMonth; m += step) months.push(m);
  months.push(maxMonth);
  return months.map((m) => ({
    month: m,
    values: schedules.map((s) => (m <= s.length ? s[m - 1].balance : null)),
  }));
}

function niceTicks(min: number, max: number, target: number): number[] {
  if (max <= min) return [min];
  const range = max - min;
  const step = niceStep(range / target);
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step / 2; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  let nf: number;
  if (f < 1.5) nf = 1;
  else if (f < 3) nf = 2;
  else if (f < 7) nf = 5;
  else nf = 10;
  return nf * base;
}

/** Currency-aware compact label for chart axis. Uses Intl with notation: 'compact'. */
function compactMoney(minor: number, currency: string): string {
  // Pull factor + locale via the same code path as formatMoney for consistency.
  // We build a one-off formatter inline so tick labels stay short ($250k, ₹2.5L).
  const c = CURRENCIES.find((x) => x.code === currency) ?? CURRENCIES[0];
  const value = minor / c.factor;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(minor, currency);
  }
}

// ---- Main component --------------------------------------------------------

export default function LoanCompare() {
  const [vendors, setVendors] = useState<VendorInput[]>(DEFAULT_VENDORS);
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const currencySelectId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { vendors: decoded, currency: decodedCurrency } = decodeFromQueryString(
      window.location.search.slice(1),
    );
    setVendors(decoded);
    if (decodedCurrency && CURRENCIES.some((c) => c.code === decodedCurrency)) {
      setCurrency(decodedCurrency);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const qs = encodeToQueryString(vendors, currency);
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [vendors, currency, hydrated]);

  const updateVendor = useCallback((index: number, patch: Partial<VendorInput>) => {
    setVendors((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const addVendor = useCallback(() => {
    setVendors((prev) => {
      if (prev.length >= MAX_VENDORS) return prev;
      const next = [...prev, makeDefaultVendor(prev.length)];
      // Track *after* state update is queued so the count we report is the
      // post-add count, which is what funnels actually want to filter on.
      track('loan_compare_vendor_added', { count: next.length });
      return next;
    });
  }, []);

  const removeVendor = useCallback((index: number) => {
    setVendors((prev) => {
      if (prev.length <= MIN_VENDORS) return prev;
      const removedLabel = VENDOR_LABELS[index];
      const next = prev.filter((_, i) => i !== index);
      track('loan_compare_vendor_removed', {
        // `vendor` is the slot label that was removed (A-E). After removal,
        // the remaining vendors shift up positionally; that's fine for
        // analytics because we report the slot the user *clicked*, not its
        // post-removal identity.
        vendor: removedLabel,
        count: next.length,
      });
      return next;
    });
  }, []);

  const results = useMemo(
    () => vendors.map((v) => computeFromInput(v, currency)),
    [vendors, currency],
  );

  const validResults = results
    .map((r, i) => ({ r, i }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0);
  const cheapestByTotal =
    validResults.length > 0
      ? validResults.reduce((best, cur) =>
          cur.r.totalPaidMinor < best.r.totalPaidMinor ? cur : best,
        ).i
      : -1;

  const copyShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?${encodeToQueryString(vendors, currency)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      track('loan_compare_share_copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
  }, [vendors, currency]);

  return (
    <div className="lc-root">
      <div className="lc-toolbar" role="toolbar" aria-label="Loan comparison actions">
        <div className="lc-currencyField">
          <label className="lc-fieldLabel" htmlFor={currencySelectId}>
            Display currency
          </label>
          <select
            id={currencySelectId}
            className="lc-select"
            value={currency}
            onChange={(e) => {
              const next = e.target.value;
              setCurrency(next);
              track('loan_compare_currency_changed', { currency: next });
            }}
            aria-describedby={`${currencySelectId}-hint`}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {/* The currency selector controls *display formatting only*: symbol,
              decimal places, and digit grouping. The amortization math is
              identical across currencies, and all vendors in a single
              comparison share one currency, so we surface that scope
              explicitly to avoid implying any FX conversion is happening. */}
          <p id={`${currencySelectId}-hint`} className="lc-fieldHelp">
            All loans in this comparison use this format.
          </p>
          {/* Live preview. The sample number 12,345,678.90 is deliberately
              chosen to exercise grouping differences across locales:
              Western groups every 3 digits ("12,345,678.90"), Indian uses
              lakh/crore ("1,23,45,678.90"), German swaps separators
              ("12.345.678,90"), and JPY/KRW round to whole units. Seeing
              the actual rendered number removes the "what does INR
              formatting mean?" ambiguity from the dropdown label.
              aria-live=polite so screen readers announce the format when
              the user changes the picker. */}
          <p className="lc-fieldPreview" aria-live="polite">
            <span className="lc-fieldPreviewLabel">Sample:</span>{' '}
            <span className="lc-fieldPreviewValue">
              {formatMoney(toMinor(12345678.9, currency), currency)}
            </span>
          </p>
        </div>
        <div className="lc-toolbarActions">
          <button
            type="button"
            className="lc-shareBtn"
            onClick={copyShareLink}
            aria-describedby="lc-share-status"
          >
            {copied ? 'Link copied' : 'Copy shareable link'}
          </button>
          <button
            type="button"
            className="lc-resetBtn"
            onClick={() => {
              setVendors(DEFAULT_VENDORS);
              setCurrency(DEFAULT_CURRENCY);
              track('loan_compare_reset');
            }}
          >
            Reset to defaults
          </button>
          <span
            id="lc-share-status"
            className="lc-srOnly"
            role="status"
            aria-live="polite"
          >
            {copied ? 'Shareable link copied to clipboard.' : ''}
          </span>
        </div>
      </div>

      <div className="lc-grid">
        {vendors.map((v, i) => (
          <VendorCard
            key={i}
            label={VENDOR_LABELS[i]}
            color={VENDOR_COLORS[i]}
            vendor={v}
            result={results[i]}
            currency={currency}
            isBest={validResults.length > 1 && i === cheapestByTotal}
            onChange={(patch) => updateVendor(i, patch)}
            // The remove button is only renderable when we're above the
            // minimum; passing undefined hides it. Doing the gating here
            // (instead of inside the card) keeps the card stateless.
            onRemove={vendors.length > MIN_VENDORS ? () => removeVendor(i) : undefined}
          />
        ))}
        {vendors.length < MAX_VENDORS && (
          <button
            type="button"
            className="lc-cardAdd"
            onClick={addVendor}
            aria-label={`Add another vendor to compare (${vendors.length + 1} of ${MAX_VENDORS})`}
          >
            <span className="lc-cardAddIcon" aria-hidden="true">+</span>
            <span className="lc-cardAddLabel">Add vendor</span>
            <span className="lc-cardAddHint">
              Compare up to {MAX_VENDORS}
            </span>
          </button>
        )}
      </div>

      <DeltaSummary
        results={results}
        vendors={vendors}
        currency={currency}
        bestIndex={cheapestByTotal}
      />

      <section className="lc-chartSection">
        <h2 className="lc-sectionTitle">Balance over time</h2>
        <div className="lc-legend">
          {vendors.map((v, i) => (
            <span key={i} className="lc-legendItem">
              <span className="lc-legendSwatch" style={{ background: VENDOR_COLORS[i] }} />
              {v.name || `Vendor ${VENDOR_LABELS[i]}`}
            </span>
          ))}
        </div>
        <BalanceChart
          results={results}
          colors={VENDOR_COLORS}
          vendorNames={vendors.map((v, i) => v.name || `Vendor ${VENDOR_LABELS[i]}`)}
          currency={currency}
        />
      </section>

      <p className="lc-disclaimer">
        Calculations assume a fixed interest rate, monthly compounding, and on-time
        payments. Real loans may include taxes, insurance, escrow, prepayment
        penalties, or variable rates that this calculator does not model. This page
        is for educational comparison and is not financial advice.
      </p>
    </div>
  );
}

// ---- Vendor card -----------------------------------------------------------

interface VendorCardProps {
  label: string;
  color: string;
  vendor: VendorInput;
  result: LoanResult;
  currency: string;
  isBest: boolean;
  onChange: (patch: Partial<VendorInput>) => void;
  /** Omitted when removing would drop below the minimum vendor count. */
  onRemove?: () => void;
}

function VendorCard({ label, color, vendor, result, currency, isBest, onChange, onRemove }: VendorCardProps) {
  const baseId = useId();
  const id = (suffix: string) => `${baseId}-${suffix}`;
  const errorId = id('error');
  const hasError = Boolean(result.error);
  const headingId = id('heading');

  const moneyHint = `In ${currency}`;

  return (
    <article
      className={`lc-card ${isBest ? 'lc-cardBest' : ''}`}
      style={{ '--lc-color': color } as React.CSSProperties}
      aria-labelledby={headingId}
    >
      <header className="lc-cardHeader">
        <h3 id={headingId} className="lc-cardBadge">Vendor {label}</h3>
        {isBest && (
          <span className="lc-cardBestBadge">
            <span aria-hidden="true">★ </span>Lowest total cost
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            className="lc-cardRemove"
            onClick={onRemove}
            aria-label={`Remove vendor ${label} from comparison`}
            title="Remove from comparison"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </header>

      <div className="lc-field">
        <label className="lc-fieldLabel" htmlFor={id('name')}>Vendor name</label>
        <input
          id={id('name')}
          type="text"
          className="lc-input"
          value={vendor.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="lc-field">
        <label className="lc-fieldLabel" htmlFor={id('principal')}>
          Loan amount <span className="lc-fieldHint">({currency})</span>
        </label>
        <input
          id={id('principal')}
          type="text"
          inputMode="decimal"
          className="lc-input"
          value={vendor.principal}
          onChange={(e) => onChange({ principal: e.target.value })}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <div className="lc-field">
        <label className="lc-fieldLabel" htmlFor={id('rate')}>Annual interest rate (%)</label>
        <input
          id={id('rate')}
          type="text"
          inputMode="decimal"
          className="lc-input"
          value={vendor.annualRatePct}
          onChange={(e) => onChange({ annualRatePct: e.target.value })}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <fieldset className="lc-modeFieldset">
        <legend className="lc-fieldLabel">Solve for</legend>
        <div className="lc-modeRow">
          <label className={`lc-modeOption ${vendor.modeKind === 'term' ? 'lc-modeOptionActive' : ''}`}>
            <input
              type="radio"
              name={`mode-${baseId}`}
              value="term"
              checked={vendor.modeKind === 'term'}
              onChange={() => {
                onChange({ modeKind: 'term' });
                track('loan_compare_mode_changed', { vendor: label, mode: 'term' });
              }}
            />
            <span>Monthly payment</span>
          </label>
          <label className={`lc-modeOption ${vendor.modeKind === 'payment' ? 'lc-modeOptionActive' : ''}`}>
            <input
              type="radio"
              name={`mode-${baseId}`}
              value="payment"
              checked={vendor.modeKind === 'payment'}
              onChange={() => {
                onChange({ modeKind: 'payment' });
                track('loan_compare_mode_changed', { vendor: label, mode: 'payment' });
              }}
            />
            <span>Payoff months</span>
          </label>
        </div>
      </fieldset>

      {vendor.modeKind === 'term' ? (
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('term')}>Term (months)</label>
          <input
            id={id('term')}
            type="text"
            inputMode="numeric"
            className="lc-input"
            value={vendor.termMonths}
            onChange={(e) => onChange({ termMonths: e.target.value })}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('monthly')}>
            Monthly payment <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={id('monthly')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.monthlyPayment}
            onChange={(e) => onChange({ monthlyPayment: e.target.value })}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      )}

      <details
        className="lc-extras"
        onToggle={(e) => {
          // The `toggle` event fires for both open and close; only emit on
          // open so the count reflects "users who actually wanted these
          // fields", not raw on/off churn.
          if ((e.currentTarget as HTMLDetailsElement).open) {
            track('loan_compare_extras_opened', { vendor: label });
          }
        }}
      >
        <summary className="lc-extrasSummary">More options</summary>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('fee')}>
            Origination / closing fee <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={id('fee')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.feeMajor}
            onChange={(e) => onChange({ feeMajor: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('extra')}>
            Extra principal per month <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={id('extra')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.extraMonthly}
            onChange={(e) => onChange({ extraMonthly: e.target.value })}
            autoComplete="off"
          />
        </div>
      </details>

      <div
        className="lc-results"
        aria-live="polite"
        aria-atomic="true"
      >
        {hasError ? (
          <p className="lc-error" id={errorId} role="alert">
            {result.error}
          </p>
        ) : (
          <dl className="lc-resultList">
            <ResultRow
              label="Monthly payment"
              value={formatMoney(result.effectiveMonthlyMinor, currency)}
              hint={
                Number(vendor.extraMonthly) > 0
                  ? `Scheduled ${formatMoney(result.monthlyPaymentMinor, currency)} + extra ${formatMoney(
                      result.effectiveMonthlyMinor - result.monthlyPaymentMinor,
                      currency,
                    )}`
                  : undefined
              }
            />
            <ResultRow
              label="Time to payoff"
              value={formatMonths(result.months)}
              hint={`${result.months} payment${result.months === 1 ? '' : 's'}`}
            />
            <ResultRow
              label="Total interest"
              value={formatMoney(result.totalInterestMinor, currency)}
            />
            {result.feeMinor > 0 && (
              <ResultRow label="Fees" value={formatMoney(result.feeMinor, currency)} />
            )}
            <ResultRow
              label="Total paid"
              value={formatMoney(result.totalPaidMinor, currency)}
              emphasized
            />
          </dl>
        )}
        {result.warnings.map((w, i) => (
          <p key={i} className="lc-warning" role="status">{w}</p>
        ))}
      </div>
    </article>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  hint?: string;
  emphasized?: boolean;
}

function ResultRow({ label, value, hint, emphasized }: ResultRowProps) {
  return (
    <div className={`lc-resultRow ${emphasized ? 'lc-resultRowEmphasized' : ''}`}>
      <dt className="lc-resultLabel">{label}</dt>
      <dd className="lc-resultValue">
        {value}
        {hint && <span className="lc-resultHint">{hint}</span>}
      </dd>
    </div>
  );
}

// ---- Delta summary ---------------------------------------------------------

interface DeltaSummaryProps {
  results: LoanResult[];
  vendors: VendorInput[];
  currency: string;
  bestIndex: number;
}

function DeltaSummary({ results, vendors, currency, bestIndex }: DeltaSummaryProps) {
  const valid = results
    .map((r, i) => ({ r, i, name: vendors[i].name || `Vendor ${VENDOR_LABELS[i]}` }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0);

  if (valid.length < 2) {
    return (
      <section className="lc-deltaSection">
        <h2 className="lc-sectionTitle">Side-by-side</h2>
        <p className="lc-deltaEmpty">
          Enter valid inputs for at least two vendors to see how they compare.
        </p>
      </section>
    );
  }

  const best = valid.find((v) => v.i === bestIndex)!;

  return (
    <section className="lc-deltaSection">
      <h2 className="lc-sectionTitle">Side-by-side</h2>
      <p className="lc-deltaHero">
        <strong>{best.name}</strong> is the cheapest overall at{' '}
        <strong>{formatMoney(best.r.totalPaidMinor, currency)}</strong> total.
      </p>
      <div className="lc-deltaTableWrap">
        <table className="lc-deltaTable">
          <thead>
            <tr>
              <th></th>
              {valid.map((v) => (
                <th key={v.i}>{v.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <DeltaRow
              label="Monthly payment"
              valid={valid}
              get={(r) => r.effectiveMonthlyMinor}
              format={(n) => formatMoney(n, currency)}
              lowerIsBetter
            />
            <DeltaRow
              label="Months to payoff"
              valid={valid}
              get={(r) => r.months}
              format={(n) => formatMonths(n)}
              lowerIsBetter
            />
            <DeltaRow
              label="Total interest"
              valid={valid}
              get={(r) => r.totalInterestMinor}
              format={(n) => formatMoney(n, currency)}
              lowerIsBetter
            />
            <DeltaRow
              label="Total paid"
              valid={valid}
              get={(r) => r.totalPaidMinor}
              format={(n) => formatMoney(n, currency)}
              lowerIsBetter
              emphasized
            />
            <tr className="lc-deltaSavingsRow">
              <th scope="row">Difference vs. cheapest</th>
              {valid.map((v) => {
                const diff = v.r.totalPaidMinor - best.r.totalPaidMinor;
                return (
                  <td key={v.i}>
                    {diff === 0 ? (
                      <span className="lc-deltaBest">cheapest</span>
                    ) : (
                      <span className="lc-deltaCost">+{formatMoney(diff, currency)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface DeltaRowProps {
  label: string;
  valid: { r: LoanResult; i: number; name: string }[];
  get: (r: LoanResult) => number;
  format: (n: number) => string;
  lowerIsBetter: boolean;
  emphasized?: boolean;
}

function DeltaRow({ label, valid, get, format, lowerIsBetter, emphasized }: DeltaRowProps) {
  const values = valid.map((v) => get(v.r));
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  const allEqual = values.every((v) => v === values[0]);
  return (
    <tr className={emphasized ? 'lc-deltaRowEmphasized' : ''}>
      <th scope="row">{label}</th>
      {valid.map((v, idx) => {
        const isBest = !allEqual && values[idx] === best;
        return (
          <td key={v.i} className={isBest ? 'lc-deltaCellBest' : ''}>
            {format(values[idx])}
          </td>
        );
      })}
    </tr>
  );
}
