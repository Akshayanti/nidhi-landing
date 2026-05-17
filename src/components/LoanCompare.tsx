import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  equityAtMonth,
  formatApr,
  formatMoney,
  formatMonths,
  getCurrency,
  pickSplitSamples,
  pointsBreakEven,
  refinanceComparison,
  toMinor,
  type AmortizationRow,
  type LoanResult,
} from '../utils/loan/math.ts';
import {
  DEFAULT_GLOBAL_STATE,
  DEFAULT_VENDORS,
  MAX_VENDORS,
  MIN_VENDORS,
  VENDOR_LABELS,
  decodeFromQueryString,
  encodeToQueryString,
  makeDefaultVendor,
  type AnalysisTab,
  type GlobalState,
  type VendorInput,
} from '../utils/loan/url.ts';
import {
  computeFromInput,
  computeNoPointsBaseline,
  parseNumber,
} from '../utils/loan/inputs.ts';

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

// ---- Amortisation split (stacked bar) chart --------------------------------
//
// Mirrors the figure in `27-understanding-loan-terms.md`: bars at six
// evenly-spaced points across the contract, each split into the interest
// portion (top) and the principal portion (bottom). Same monthly payment,
// every bar; only the split changes. The educational point only lands when
// the bar heights are visibly identical and the split is visibly extreme
// in early years.
//
// We sample from the *contract* schedule (no extra principal). Voluntary
// extra principal would compress the term and make the "see how the
// split skews early" point harder to read; the shape we want to teach is
// the contract shape.

interface SplitChartProps {
  schedule: AmortizationRow[];
  currency: string;
  vendorName: string;
  vendorColor: string;
}

function SplitChart({ schedule, currency, vendorName, vendorColor }: SplitChartProps) {
  if (schedule.length === 0) {
    return (
      <p className="lc-chartEmpty">
        Enter valid inputs above to see how each payment splits between interest and principal.
      </p>
    );
  }

  const samples = pickSplitSamples(schedule.length, 6);
  const rows = samples.map((m) => schedule[m - 1]);

  // Bar height represents the total payment for that month. For a fully-
  // amortising fixed-rate loan all bars are the same height, which is
  // exactly the visual point. The final bar may be a few cents off due
  // to schedule reconciliation; we scale to the max anyway so any
  // reconciliation fudge is invisible.
  const maxPayment = Math.max(...rows.map((r) => r.payment));
  if (maxPayment <= 0) return null;

  const width = 800;
  const height = 360;
  const padT = 56;
  const padB = 64;
  const padL = 56;
  const padR = 24;
  const plotH = height - padT - padB;
  const plotW = width - padL - padR;
  const barWidth = Math.min(70, (plotW - 20) / rows.length - 14);
  const gap = (plotW - barWidth * rows.length) / (rows.length + 1);

  const ariaSummary =
    `Where each monthly payment goes for ${vendorName}. ` +
    rows
      .map((r) => {
        const pctInterest = (r.interest / r.payment) * 100;
        const yearLabel = formatYearLabel(r.month);
        return `${yearLabel}: interest ${formatMoney(r.interest, currency)} (${pctInterest.toFixed(0)}%), principal ${formatMoney(r.principal, currency)}.`;
      })
      .join(' ');

  return (
    <>
      <svg
        className="lc-splitChart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaSummary}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <title>Where each payment goes</title>
        <desc>{ariaSummary}</desc>

        {/* Eyebrow legend, mirroring the blog figure */}
        <text x={padL} y={padT - 16} className="lc-splitEyebrowInterest">
          INTEREST
        </text>
        <text x={padL} y={height - padB + 18} className="lc-splitEyebrowPrincipal">
          PRINCIPAL
        </text>

        {rows.map((row, idx) => {
          const x = padL + gap + idx * (barWidth + gap);
          const totalH = plotH * (row.payment / maxPayment);
          const interestH = totalH * (row.interest / row.payment);
          const principalH = totalH - interestH;
          const yTop = padT + (plotH - totalH);
          const yPrincipal = yTop + interestH;

          // Show inline labels for the values when the segment has enough
          // vertical room; otherwise skip to keep the chart legible.
          const interestLabelInside = interestH >= 22;
          const principalLabelInside = principalH >= 22;

          return (
            <g key={row.month}>
              <rect
                x={x}
                y={yTop}
                width={barWidth}
                height={interestH}
                className="lc-splitBarInterest"
              />
              <rect
                x={x}
                y={yPrincipal}
                width={barWidth}
                height={principalH}
                className="lc-splitBarPrincipal"
                style={{ fill: vendorColor }}
              />
              {/* Interest value */}
              <text
                x={x + barWidth / 2}
                y={interestLabelInside ? yTop + 14 : yTop - 4}
                className="lc-splitValueInterest"
                textAnchor="middle"
                style={{
                  // When the segment is too thin, render the label above
                  // the bar in interest's accent colour for contrast on
                  // the page background.
                  fill: interestLabelInside ? '#ffffff' : 'var(--color-warning)',
                  fontWeight: 600,
                }}
              >
                {compactMoney(row.interest, currency)}
              </text>
              {/* Principal value */}
              <text
                x={x + barWidth / 2}
                y={principalLabelInside ? yPrincipal + 16 : yPrincipal + principalH + 14}
                className="lc-splitValuePrincipal"
                textAnchor="middle"
                style={{
                  fill: principalLabelInside ? '#ffffff' : 'var(--color-text-primary)',
                  fontWeight: 600,
                }}
              >
                {compactMoney(row.principal, currency)}
              </text>
              {/* X-axis label: "Year N" or "Month N" for very short loans */}
              <text
                x={x + barWidth / 2}
                y={height - padB + 36}
                className="lc-splitTickX"
                textAnchor="middle"
              >
                {formatYearLabel(row.month)}
              </text>
            </g>
          );
        })}

        <text
          x={width / 2}
          y={height - 6}
          className="lc-splitFootnote"
          textAnchor="middle"
        >
          Same payment every month, the split changes
        </text>
      </svg>

      {/* SR-only table mirrors the same data for assistive tech users. */}
      <table className="lc-srOnly">
        <caption>Interest and principal split for {vendorName}, sampled across the loan</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Payment</th>
            <th scope="col">Interest</th>
            <th scope="col">Principal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{formatYearLabel(r.month)}</th>
              <td>{formatMoney(r.payment, currency)}</td>
              <td>{formatMoney(r.interest, currency)}</td>
              <td>{formatMoney(r.principal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Render a sampled month as a "Year N" label, falling back to "Month N"
 *  for short-term loans where year framing would be misleading. */
function formatYearLabel(month: number): string {
  if (month <= 12) {
    return month === 1 ? 'Year 1' : `Month ${month}`;
  }
  // Months that fall on a year boundary read as "Year N"; off-boundary
  // months read as "Year N (mo M)" so the user can still locate them.
  if (month % 12 === 0) return `Year ${month / 12}`;
  return `Year ${Math.floor(month / 12) + 1}`;
}

// ---- Main component --------------------------------------------------------

export default function LoanCompare() {
  const [vendors, setVendors] = useState<VendorInput[]>(DEFAULT_VENDORS);
  const [globalState, setGlobalState] = useState<GlobalState>(DEFAULT_GLOBAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  // Index of the vendor whose amortisation split is currently rendered.
  // null means "auto"; track the cheapest-by-total winner. We store an
  // explicit index only when the user has manually picked one, so adding
  // or reordering vendors doesn't trap them on a stale selection.
  const [splitVendorIdx, setSplitVendorIdx] = useState<number | null>(null);
  const currencySelectId = useId();

  // Convenience accessor: the currency lives on globalState but most
  // call sites read it directly. Updates always go through setGlobalState
  // so there is one source of truth.
  const currency = globalState.currency;
  const setCurrency = useCallback(
    (next: string) => setGlobalState((g) => ({ ...g, currency: next })),
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { vendors: decoded, global: decodedGlobal } = decodeFromQueryString(
      window.location.search.slice(1),
    );
    setVendors(decoded);
    // Validate the currency we got back; an unknown code falls back to
    // the default rather than putting the dropdown into a broken state.
    if (!CURRENCIES.some((c) => c.code === decodedGlobal.currency)) {
      decodedGlobal.currency = DEFAULT_CURRENCY;
    }
    setGlobalState(decodedGlobal);
    setHydrated(true);

    // Mirrors `free_multi_currency_net_worth_shared_view_opened` on the analyzer.
    // We fire only when the URL actually carries encoded state (any
    // non-utm param), so a plain `?utm_source=...` campaign click does
    // not get mislabelled as a shared comparison view. The utm-source
    // value is reported as a property so funnels can split direct
    // shares (utm_source=share) from organic landings.
    const params = new URLSearchParams(window.location.search.slice(1));
    const hasEncodedState = [...params.keys()].some((k) => !k.startsWith('utm_'));
    if (hasEncodedState) {
      track('free_loan_comparison_shared_view_opened', {
        vendors: decoded.length,
        utm_source: params.get('utm_source') ?? null,
      });
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const qs = encodeToQueryString(vendors, globalState);
    const utm = preserveUtmParams(window.location.search);
    const next = qs ? `${window.location.pathname}?${qs}${utm}` : `${window.location.pathname}${utm}`;
    window.history.replaceState(null, '', next);
  }, [vendors, globalState, hydrated]);

  const updateVendor = useCallback((index: number, patch: Partial<VendorInput>) => {
    setVendors((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  // track() is intentionally outside the setState updater. React 18
  // StrictMode double-invokes updaters in dev, which would double-fire
  // any analytics call inside them. Computing the post-add length from
  // the closure (`vendors.length + 1`) is safe because the enclosing
  // callback is *not* double-invoked.
  const addVendor = useCallback(() => {
    if (vendors.length >= MAX_VENDORS) return;
    setVendors((prev) => [...prev, makeDefaultVendor(prev.length)]);
    track('free_loan_comparison_vendor_added', { count: vendors.length + 1 });
  }, [vendors.length]);

  const removeVendor = useCallback((index: number) => {
    if (vendors.length <= MIN_VENDORS) return;
    const removedLabel = VENDOR_LABELS[index];
    setVendors((prev) => prev.filter((_, i) => i !== index));
    track('free_loan_comparison_vendor_removed', {
      // `vendor` is the slot label that was removed (A-E). After removal,
      // the remaining vendors shift up positionally; that's fine for
      // analytics because we report the slot the user *clicked*, not its
      // post-removal identity.
      vendor: removedLabel,
      count: vendors.length - 1,
    });
  }, [vendors.length]);

  const results = useMemo(
    () => vendors.map((v) => computeFromInput(v, currency)),
    [vendors, currency],
  );

  // Debounced validation-error signal. Without this, we are blind to how
  // often real users land on a state where one or more vendors fail to
  // compute (missing principal, rate too high to amortize, etc.). The
  // effect re-runs on every keystroke because `results` is a fresh
  // reference, but the timer collapses bursts into one event 600ms after
  // the user stops typing. We never ship the error message; only the
  // count and a coarse `firstReason` bucket inferred from keywords.
  const validationTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (validationTrackTimer.current) clearTimeout(validationTrackTimer.current);
    validationTrackTimer.current = setTimeout(() => {
      const errored = results
        .map((r, i) => ({ r, i }))
        .filter((x) => Boolean(x.r.error));
      if (errored.length === 0) return;
      const firstMsg = (errored[0].r.error ?? '').toLowerCase();
      let firstReason:
        | 'missing_principal'
        | 'missing_rate'
        | 'missing_term'
        | 'payment_below_interest'
        | 'rate_out_of_range'
        | 'term_out_of_range'
        | 'other' = 'other';
      if (firstMsg.includes('principal')) firstReason = 'missing_principal';
      else if (firstMsg.includes('payment') && firstMsg.includes('interest')) firstReason = 'payment_below_interest';
      else if (firstMsg.includes('rate') && firstMsg.includes('range')) firstReason = 'rate_out_of_range';
      else if (firstMsg.includes('rate')) firstReason = 'missing_rate';
      else if (firstMsg.includes('term')) firstMsg.includes('range') ? (firstReason = 'term_out_of_range') : (firstReason = 'missing_term');
      track('free_loan_comparison_validation_error', {
        count: errored.length,
        firstReason,
        firstVendor: VENDOR_LABELS[errored[0].i],
      });
    }, 600);
    return () => {
      if (validationTrackTimer.current) clearTimeout(validationTrackTimer.current);
    };
  }, [results, hydrated]);

  // Per-vendor "no-points baseline" results, used to compute the
  // points break-even. When a vendor hasn't paid points the entry is
  // null and the UI hides the row.
  const noPointsBaselines = useMemo(
    () => vendors.map((v) => computeNoPointsBaseline(v, currency)),
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
    const url = `${window.location.origin}${window.location.pathname}?${encodeToQueryString(vendors, globalState)}&utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=loan_comparison`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track('free_loan_comparison_share_copied');
    } catch {
      setShareUrl(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      window.prompt('Copy this link:', url);
    }
  }, [vendors, globalState]);

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
              track('free_loan_comparison_currency_changed', { currency: next });
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
            title="Copy a link that includes all your loan details"
            data-attr="lc-share-copy"
          >
            {copied ? 'Link copied' : 'Copy shareable link'}
          </button>
          <button
            type="button"
            className="lc-resetBtn"
            onClick={() => {
              setVendors(DEFAULT_VENDORS);
              setGlobalState(DEFAULT_GLOBAL_STATE);
              track('free_loan_comparison_reset');
            }}
            title="Clear all data and start fresh"
            data-attr="lc-reset"
          >
            Reset to defaults
          </button>
          {copied && shareUrl && (
            <div className="lc-shareUrlBar" role="status" aria-live="polite">
              <span className="lc-shareUrlLabel">Link copied to clipboard</span>
              <input
                className="lc-shareUrlInput"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label="Shareable link URL"
              />
            </div>
          )}
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
            noPointsBaseline={noPointsBaselines[i]}
            currency={currency}
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
            data-attr="lc-vendor-add"
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
      />

      <AnalysisTabs
        vendors={vendors}
        results={results}
        currency={currency}
        cheapestByTotal={cheapestByTotal}
        splitVendorIdx={splitVendorIdx}
        onSplitVendorChange={setSplitVendorIdx}
        globalState={globalState}
        onGlobalChange={(patch) => setGlobalState((g) => ({ ...g, ...patch }))}
      />

      <details className="lc-disclaimerWrap" open>
        <summary className="lc-disclaimerSummary">Assumptions and disclaimers</summary>
        <p className="lc-disclaimer">
          Calculations assume monthly compounding and on-time payments. APR
          is shown as a nominal annualized rate (monthly rate × 12)
          computed against the contractual schedule (without voluntary
          extras), folding the origination/closing fee into the effective
          cost of borrowing; jurisdictions differ on which other costs
          (mandatory insurance, account products, taxes) must be included
          in their official APR/APRC disclosure, so add those into the
          fee field if you want them reflected. Canadian residential
          mortgages compound semi-annually by law and Brazilian and some
          UK products use other compounding conventions; on those
          products the monthly-compounding figures here will be slightly
          off. Real adjustable-rate loans track an index plus a margin
          and may have rate caps that this calculator does not enforce;
          the subsequent rate you enter is your best stress-test guess.
          Property taxes, building or community service charges, home
          insurance, and the tax treatment of loan interest in your
          jurisdiction are not modeled. Educational comparison only; not
          financial advice. For a binding loan comparison or personalized
          advice, consult a licensed mortgage broker or financial advisor.
        </p>
      </details>
    </div>
  );
}

// ---- Vendor card -----------------------------------------------------------

interface VendorCardProps {
  label: string;
  color: string;
  vendor: VendorInput;
  result: LoanResult;
  /** Hypothetical "no points paid" baseline; null when vendor isn't
   *  using points. */
  noPointsBaseline: LoanResult | null;
  currency: string;
  onChange: (patch: Partial<VendorInput>) => void;
  /** Omitted when removing would drop below the minimum vendor count. */
  onRemove?: () => void;
}

// Note: this card intentionally does not crown a "best" vendor. Earlier
// revisions rendered a star "Lowest total cost" badge and a thicker
// border on the cheapest card. Naming a winner among specific commercial
// loan offers crosses the line from calculation into recommendation under
// the EU Consumer Credit Directive and the platform's own
// regulatory-advisory-classification policy. The Side-by-side panel
// below the cards still shows the differences in money terms, which lets
// the user see which is cheapest without the calculator declaring it.
function VendorCard({
  label,
  color,
  vendor,
  result,
  noPointsBaseline,
  currency,
  onChange,
  onRemove,
}: VendorCardProps) {
  const baseId = useId();
  const id = (suffix: string) => `${baseId}-${suffix}`;
  const errorId = id('error');
  const hasError = Boolean(result.error);
  const headingId = id('heading');

  const moneyHint = `In ${currency}`;

  return (
    <article
      className="lc-card"
      style={{ '--lc-color': color } as React.CSSProperties}
      aria-labelledby={headingId}
    >
      <header className="lc-cardHeader">
        {/*
          h3 (not h2): an h2 per vendor card padded the document outline
          with up to five "Vendor A / B / C…" entries that contributed
          nothing to SEO and, with autocapture screen-readers, generated
          noisy nav. h3 keeps the card semantically labelled while letting
          the surrounding section heading own the h2 slot.
        */}
        <h3 id={headingId} className="lc-cardBadge">Vendor {label}</h3>
        {onRemove && (
          <button
            type="button"
            className="lc-cardRemove"
            onClick={onRemove}
            aria-label={`Remove vendor ${label} from comparison`}
            title="Remove from comparison"
            data-attr="lc-vendor-remove"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </header>

      {/* ------------------------------------------------------------ */}
      {/*  Required fields. Marked with a visible asterisk and          */}
      {/*  aria-required so screen readers and sighted users both know  */}
      {/*  the loan can't be priced without them. The vendor name is    */}
      {/*  intentionally left optional.                                  */}
      {/* ------------------------------------------------------------ */}

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
          Loan amount <RequiredMark /> <span className="lc-fieldHint">({currency})</span>
        </label>
        <input
          id={id('principal')}
          type="text"
          inputMode="decimal"
          className="lc-input"
          value={vendor.principal}
          onChange={(e) => onChange({ principal: e.target.value })}
          aria-invalid={hasError || undefined}
          aria-required="true"
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <div className="lc-field">
        <label className="lc-fieldLabel" htmlFor={id('rate')}>
          Annual interest rate (%) <RequiredMark />
        </label>
        <input
          id={id('rate')}
          type="text"
          inputMode="decimal"
          className="lc-input"
          value={vendor.annualRatePct}
          onChange={(e) => onChange({ annualRatePct: e.target.value })}
          aria-invalid={hasError || undefined}
          aria-required="true"
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <fieldset className="lc-modeFieldset">
        <legend className="lc-fieldLabel">Solve for <RequiredMark /></legend>
        <div className="lc-modeRow">
          <label className={`lc-modeOption ${vendor.modeKind === 'term' ? 'lc-modeOptionActive' : ''}`}>
            <input
              type="radio"
              name={`mode-${baseId}`}
              value="term"
              checked={vendor.modeKind === 'term'}
              onChange={() => {
                onChange({ modeKind: 'term' });
                track('free_loan_comparison_mode_changed', { vendor: label, mode: 'term' });
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
                track('free_loan_comparison_mode_changed', { vendor: label, mode: 'payment' });
              }}
            />
            <span>Payoff months</span>
          </label>
        </div>
      </fieldset>

      {vendor.modeKind === 'term' ? (
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('term')}>
            Term (months) <RequiredMark />
          </label>
          <input
            id={id('term')}
            type="text"
            inputMode="numeric"
            className="lc-input"
            value={vendor.termMonths}
            onChange={(e) => onChange({ termMonths: e.target.value })}
            aria-invalid={hasError || undefined}
            aria-required="true"
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('monthly')}>
            Monthly payment <RequiredMark /> <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={id('monthly')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.monthlyPayment}
            onChange={(e) => onChange({ monthlyPayment: e.target.value })}
            aria-invalid={hasError || undefined}
            aria-required="true"
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Optional groups. All visible by default so the user can see  */}
      {/*  the available knobs at a glance, but visually de-emphasised  */}
      {/*  vs. the required block above. Each group has a small         */}
      {/*  sub-heading so the purpose is scannable.                      */}
      {/* ------------------------------------------------------------ */}

      <FieldGroup title="Rate structure" hint="Fixed or fixed-then-variable (ARM)">
        <fieldset className="lc-modeFieldset">
          <legend className="lc-srOnly">Rate type</legend>
          <div className="lc-modeRow">
            <label className={`lc-modeOption ${vendor.rateKind === 'fixed' ? 'lc-modeOptionActive' : ''}`}>
              <input
                type="radio"
                name={`rateKind-${baseId}`}
                value="fixed"
                checked={vendor.rateKind === 'fixed'}
                onChange={() => {
                  onChange({ rateKind: 'fixed' });
                  track('free_loan_comparison_rate_kind_changed', {
                    vendor: label,
                    rateKind: 'fixed',
                  });
                }}
              />
              <span>Fixed</span>
            </label>
            <label className={`lc-modeOption ${vendor.rateKind === 'hybrid' ? 'lc-modeOptionActive' : ''}`}>
              <input
                type="radio"
                name={`rateKind-${baseId}`}
                value="hybrid"
                // Hybrid is only meaningful in term mode; we disable the
                // radio when the vendor is in payment mode rather than
                // auto-flipping their selection. The disabled-state hint
                // below is wired via aria-describedby so screen-reader
                // users hear the reason without sighted-only context.
                disabled={vendor.modeKind !== 'term'}
                aria-describedby={
                  vendor.modeKind !== 'term' ? id('hybrid-hint') : undefined
                }
                checked={vendor.rateKind === 'hybrid'}
                onChange={() => {
                  onChange({ rateKind: 'hybrid' });
                  track('free_loan_comparison_rate_kind_changed', {
                    vendor: label,
                    rateKind: 'hybrid',
                  });
                }}
              />
              <span>Hybrid (ARM)</span>
            </label>
          </div>
        </fieldset>
        {vendor.modeKind !== 'term' && (
          // Always render this hint when hybrid is disabled, even if the
          // user has not picked hybrid yet, so the disabled state is
          // explained on first encounter (and aria-describedby has a
          // target to point at).
          <p id={id('hybrid-hint')} className="lc-fieldHelp">
            Hybrid (ARM) loans need a fixed term. Switch <em>Solve for</em>{' '}
            above to <em>Monthly payment</em> to enable the ARM fields.
          </p>
        )}
        {vendor.rateKind === 'hybrid' && vendor.modeKind === 'term' && (
          <>
            <div className="lc-field">
              <label className="lc-fieldLabel" htmlFor={id('initialFixedMonths')}>
                Initial fixed period (months)
              </label>
              <input
                id={id('initialFixedMonths')}
                type="text"
                inputMode="numeric"
                className="lc-input"
                value={vendor.initialFixedMonths}
                onChange={(e) => onChange({ initialFixedMonths: e.target.value })}
                autoComplete="off"
              />
              <p className="lc-fieldHelp">Common: 60 (5/1 ARM), 84 (7/1), 120 (10/1).</p>
            </div>
            <div className="lc-field">
              <label className="lc-fieldLabel" htmlFor={id('subsequentRatePct')}>
                Subsequent rate (%)
              </label>
              <input
                id={id('subsequentRatePct')}
                type="text"
                inputMode="decimal"
                className="lc-input"
                value={vendor.subsequentRatePct}
                onChange={(e) => onChange({ subsequentRatePct: e.target.value })}
                autoComplete="off"
              />
              <p className="lc-fieldHelp">
                Rate after the fixed window ends. Real ARMs track an index;
                this is your stress-test guess.
              </p>
            </div>
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Costs and fees" hint="Origination, closing, and discount points">
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
          <label className="lc-fieldLabel" htmlFor={id('pointsCost')}>
            Discount points cost <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={id('pointsCost')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.pointsCostMajor}
            onChange={(e) => onChange({ pointsCostMajor: e.target.value })}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">
            Already counted in the fee above. Entering it again here lets the
            calculator show the points break-even.
          </p>
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('pointsReduction')}>
            Rate reduction from points (pp)
          </label>
          <input
            id={id('pointsReduction')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.pointsRateReductionPct}
            onChange={(e) => onChange({ pointsRateReductionPct: e.target.value })}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">e.g. 0.25 means the points cut your rate by 0.25 pp.</p>
        </div>
      </FieldGroup>

      <FieldGroup title="Prepayments" hint="Pay extra each month or in lump sums">
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
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('lumpSums')}>
            Lump-sum prepayments
          </label>
          <input
            id={id('lumpSums')}
            type="text"
            className="lc-input"
            value={vendor.lumpSumsEncoded}
            onChange={(e) => onChange({ lumpSumsEncoded: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            placeholder="12:5000;36:3000"
          />
          <p className="lc-fieldHelp">
            Format: <code>month:amount</code>, semicolon-separated. e.g.{' '}
            <code>12:5000;36:3000</code> means 5,000 in month 12 and 3,000 in
            month 36.
          </p>
        </div>
      </FieldGroup>

      <FieldGroup title="Prepayment penalty" hint="Some loans charge a fee for paying off early">
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('prepayPct')}>
            Penalty (% of balance)
          </label>
          <input
            id={id('prepayPct')}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={vendor.prepayPenaltyPct}
            onChange={(e) => onChange({ prepayPenaltyPct: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('prepayUntil')}>
            Penalty applies through (month)
          </label>
          <input
            id={id('prepayUntil')}
            type="text"
            inputMode="numeric"
            className="lc-input"
            value={vendor.prepayPenaltyUntilMonth}
            onChange={(e) => onChange({ prepayPenaltyUntilMonth: e.target.value })}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">
            Leave at 0 if there is no penalty. Charged only when the loan is
            paid off on or before this month.
          </p>
        </div>
      </FieldGroup>

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
          <>
            {/* Top three at-a-glance numbers. APR is the cross-vendor
                comparator the blog post calls "the number that matters",
                Total paid is the headline cost, and Monthly payment is
                what most users look at first. Everything else moves into
                the "Show details" expander to keep the card compact. */}
            <dl className="lc-resultList lc-resultListPrimary">
              <ResultRow
                label="Monthly"
                value={formatMoney(result.effectiveMonthlyMinor, currency)}
                hint={
                  Number(vendor.extraMonthly) > 0
                    ? `${formatMoney(result.monthlyPaymentMinor, currency)} + ${formatMoney(
                        result.effectiveMonthlyMinor - result.monthlyPaymentMinor,
                        currency,
                      )} extra`
                    : undefined
                }
              />
              <ResultRow
                label="APR"
                value={formatApr(result.aprNominal, getCurrency(currency).locale)}
                hint={result.feeMinor > 0 ? 'Includes fees' : 'No fees'}
              />
              <ResultRow
                label="Total paid"
                value={formatMoney(result.totalPaidMinor, currency)}
                emphasized
              />
            </dl>

            <details
              className="lc-resultDetails"
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  track('free_loan_comparison_details_toggled', { vendor: label });
                }
              }}
            >
              <summary className="lc-resultDetailsSummary">Show details</summary>
              <dl className="lc-resultList">
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
                {result.prepaymentPenaltyMinor > 0 && (
                  <ResultRow
                    label="Prepayment penalty"
                    value={formatMoney(result.prepaymentPenaltyMinor, currency)}
                    hint="Charged because the loan paid off early within the penalty window"
                  />
                )}
                {noPointsBaseline && !noPointsBaseline.error && (() => {
                  const be = pointsBreakEven(result, noPointsBaseline);
                  return (
                    <ResultRow
                      label="Points break-even"
                      value={
                        Number.isFinite(be.months)
                          ? formatMonths(be.months)
                          : 'never'
                      }
                      hint={
                        Number.isFinite(be.months)
                          ? `Saves ${formatMoney(Math.abs(be.lifetimeSavingsMinor), currency)} over the term`
                          : 'Points do not lower the monthly enough to recoup'
                      }
                    />
                  );
                })()}
              </dl>
            </details>
          </>
        )}
        {result.warnings.map((w, i) => (
          <p key={i} className="lc-warning" role="status">{w}</p>
        ))}
      </div>
    </article>
  );
}

// ---- Form helpers ----------------------------------------------------------

/** A small red asterisk used to mark required fields. The asterisk is
 *  presentational; the real semantic signal is the `aria-required` on
 *  the input itself. We hide the asterisk character from screen readers
 *  via aria-hidden so they don't read "required asterisk". */
function RequiredMark() {
  return (
    <span className="lc-required" aria-hidden="true" title="Required">
      *
    </span>
  );
}

interface FieldGroupProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

/** A visually-grouped section of optional fields. The title and hint are
 *  always visible (no collapsibles) so the user can see at a glance what
 *  knobs each card exposes. */
function FieldGroup({ title, hint, children }: FieldGroupProps) {
  return (
    <section className="lc-fieldGroup">
      <header className="lc-fieldGroupHeader">
        <h3 className="lc-fieldGroupTitle">{title}</h3>
        {hint && <p className="lc-fieldGroupHint">{hint}</p>}
      </header>
      <div className="lc-fieldGroupBody">{children}</div>
    </section>
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
  // Note: previously took a `bestIndex` to highlight the cheapest vendor.
  // Removed when the winner-crowning was stripped: this component now
  // derives the lowest/highest vendors from the results internally and
  // describes the spread without naming a winner.
}

function DeltaSummary({ results, vendors, currency }: DeltaSummaryProps) {
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

  // Lowest and highest total-paid figures, used for a neutral range
  // sentence below. The lowest is also used as the baseline for per-row
  // diffs so the user can size each vendor's gap without the tool
  // declaring a "winner". Earlier revisions printed
  //   "<vendor> is the cheapest overall at $X total"
  // which is a textbook recommendation under the Consumer Credit
  // Directive and the platform's regulatory-advisory policy. The math
  // is the same; the framing now describes the spread instead.
  const sortedByTotal = [...valid].sort(
    (a, b) => a.r.totalPaidMinor - b.r.totalPaidMinor,
  );
  const lowest = sortedByTotal[0];
  const highest = sortedByTotal[sortedByTotal.length - 1];
  const spreadMinor = highest.r.totalPaidMinor - lowest.r.totalPaidMinor;
  const allSame = spreadMinor === 0;

  return (
    <section className="lc-deltaSection" aria-labelledby="lc-delta-h">
      <h2 id="lc-delta-h" className="lc-sectionTitle">Side-by-side</h2>
      {/*
        aria-live=polite so screen readers re-announce when inputs change.
        The wording is deliberately neutral: it states the range and the
        spread, without pointing the user at a specific vendor as "the
        cheapest". Naming a winner among real commercial offers risks
        being read as credit intermediation under the EU Consumer
        Credit Directive 2008/48/EC (and CCD2 from 2026 onward).
      */}
      <p className="lc-deltaHero" aria-live="polite" aria-atomic="true">
        {allSame ? (
          <>All vendors come out at the same total cost of{' '}
            <strong>{formatMoney(lowest.r.totalPaidMinor, currency)}</strong>.</>
        ) : (
          <>Total cost ranges from{' '}
            <strong>{formatMoney(lowest.r.totalPaidMinor, currency)}</strong>
            {' '}to <strong>{formatMoney(highest.r.totalPaidMinor, currency)}</strong>
            {' '}across the vendors below: a spread of{' '}
            <strong>{formatMoney(spreadMinor, currency)}</strong>.</>
        )}
      </p>
      <div className="lc-deltaTableWrap">
        <table className="lc-deltaTable">
          <thead>
            <tr>
              <th scope="col" aria-label="Metric"><span className="lc-srOnly">Metric</span></th>
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
            />
            <DeltaRow
              label="Months to payoff"
              valid={valid}
              get={(r) => r.months}
              format={(n) => formatMonths(n)}
            />
            <DeltaRow
              label="APR (incl. fees)"
              valid={valid}
              // We round APRs to 6 decimal places (multiply by 1e6) so
              // formatting is stable even at the limits of the bisection
              // solver. Six decimals is well below anything we'd ever
              // display in the UI.
              get={(r) => Math.round(r.aprNominal * 1_000_000)}
              format={(n) => formatApr(n / 1_000_000, getCurrency(currency).locale)}
            />
            <DeltaRow
              label="Total interest"
              valid={valid}
              get={(r) => r.totalInterestMinor}
              format={(n) => formatMoney(n, currency)}
            />
            <DeltaRow
              label="Total paid"
              valid={valid}
              get={(r) => r.totalPaidMinor}
              format={(n) => formatMoney(n, currency)}
              emphasized
            />
            <tr className="lc-deltaSavingsRow">
              {/*
                Renamed from "Difference vs. cheapest" to a neutral,
                mathematical label. The baseline is the lowest total-paid
                vendor; that's a fact about the inputs, not a
                recommendation. The 0-diff cell shows an em-dash instead
                of "cheapest" so we don't crown a winner.
              */}
              <th scope="row">Difference vs. lowest total cost</th>
              {valid.map((v) => {
                const diff = v.r.totalPaidMinor - lowest.r.totalPaidMinor;
                return (
                  <td key={v.i}>
                    {diff === 0 ? (
                      <span className="lc-deltaBaseline" aria-label="baseline (lowest total cost)">baseline</span>
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
  emphasized?: boolean;
}

// We deliberately do not flag a "best" cell per metric. Per-metric
// "winners" turn the framing from "here are the numbers" into "here is
// the right answer for monthly payment / interest / APR": a series of
// recommendations the calculator isn't qualified to make. We just print
// the values; the user reads them.
function DeltaRow({ label, valid, get, format, emphasized }: DeltaRowProps) {
  const values = valid.map((v) => get(v.r));
  return (
    <tr className={emphasized ? 'lc-deltaRowEmphasized' : ''}>
      <th scope="row">{label}</th>
      {valid.map((v, idx) => (
        <td key={v.i}>{format(values[idx])}</td>
      ))}
    </tr>
  );
}

// ---- Analysis tabs ---------------------------------------------------------
//
// All the heavy "what does this mean" sections (charts, horizon, refi,
// methodology) live behind a single tab strip below the main grid. The
// goal is to keep the page short above the fold without burying the
// features: every tab is a single click away and the active tab is
// persisted in the URL so a share link lands the recipient on the same
// view.

const ANALYSIS_TABS: { id: AnalysisTab; label: string; hint: string }[] = [
  {
    id: 'charts',
    label: 'Charts',
    hint: 'Balance over time and how each payment splits',
  },
  {
    id: 'horizon',
    label: 'Horizon',
    hint: 'Where you stand if you sell or refinance early',
  },
  {
    id: 'refi',
    label: 'Refinance',
    hint: 'Compare keep vs. refinance with break-even',
  },
  {
    id: 'how',
    label: 'How it works',
    hint: 'Formula and methodology',
  },
];

interface AnalysisTabsProps {
  vendors: VendorInput[];
  results: LoanResult[];
  currency: string;
  cheapestByTotal: number;
  splitVendorIdx: number | null;
  onSplitVendorChange: (idx: number | null) => void;
  globalState: GlobalState;
  onGlobalChange: (patch: Partial<GlobalState>) => void;
}

function AnalysisTabs({
  vendors,
  results,
  currency,
  cheapestByTotal,
  splitVendorIdx,
  onSplitVendorChange,
  globalState,
  onGlobalChange,
}: AnalysisTabsProps) {
  const active = globalState.activeTab;
  const panelId = useId();
  // Refs to each tab button so the keyboard handler can move DOM focus
  // when the user navigates with arrow keys. Per WAI-ARIA APG for tabs,
  // arrow keys MUST move both selection and focus.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard handler implementing the WAI-ARIA Tabs (manual activation
  // is not used; auto-activation matches the prevailing convention and
  // matches our small, instant-render panels).
  //
  //   ArrowRight / ArrowDown -> next tab (wraps)
  //   ArrowLeft  / ArrowUp   -> previous tab (wraps)
  //   Home                   -> first tab
  //   End                    -> last tab
  //
  // We select-and-focus in one step so screen-reader users hear the new
  // panel announced as soon as they navigate.
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIdx = ANALYSIS_TABS.findIndex((t) => t.id === active);
    let nextIdx = -1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (currentIdx + 1) % ANALYSIS_TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (currentIdx - 1 + ANALYSIS_TABS.length) % ANALYSIS_TABS.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = ANALYSIS_TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextTab = ANALYSIS_TABS[nextIdx];
    onGlobalChange({ activeTab: nextTab.id });
    track('free_loan_comparison_tab_changed', { tab: nextTab.id, via: 'keyboard' });
    // Defer focus until React has committed the new active tab so the
    // ref points at the now-mounted button. requestAnimationFrame is
    // sufficient; the button always exists because all four are rendered
    // simultaneously (only their tabindex / aria-selected differ).
    requestAnimationFrame(() => tabRefs.current[nextIdx]?.focus());
  };

  return (
    <section className="lc-analysis" aria-label="Analysis">
      <div
        className="lc-tabList"
        role="tablist"
        aria-label="Analysis views"
        onKeyDown={onTabKeyDown}
      >
        {ANALYSIS_TABS.map((t, i) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${panelId}-${t.id}-tab`}
              aria-selected={selected}
              aria-controls={`${panelId}-${t.id}-panel`}
              // Roving tabindex: only the active tab is in the tab order.
              // Inactive tabs are reachable via arrow keys (handled above).
              tabIndex={selected ? 0 : -1}
              className={`lc-tab ${selected ? 'lc-tabActive' : ''}`}
              data-attr={`lc-tab-${t.id}`}
              onClick={() => {
                onGlobalChange({ activeTab: t.id });
                track('free_loan_comparison_tab_changed', { tab: t.id, via: 'click' });
              }}
              title={t.hint}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${panelId}-${active}-panel`}
        aria-labelledby={`${panelId}-${active}-tab`}
        className="lc-tabPanel"
      >
        {active === 'charts' && (
          <ChartsPanel
            vendors={vendors}
            results={results}
            currency={currency}
            cheapestByTotal={cheapestByTotal}
            splitVendorIdx={splitVendorIdx}
            onSplitVendorChange={onSplitVendorChange}
          />
        )}
        {active === 'horizon' && (
          <HorizonSection
            vendors={vendors}
            results={results}
            currency={currency}
            horizonMonths={globalState.horizonMonths}
            onHorizonChange={(next) => onGlobalChange({ horizonMonths: next })}
          />
        )}
        {active === 'refi' && (
          <RefinanceSection
            vendors={vendors}
            results={results}
            currency={currency}
            state={globalState}
            onChange={onGlobalChange}
          />
        )}
        {active === 'how' && <HowItWorksPanel />}
      </div>
    </section>
  );
}

// ---- Charts panel ----------------------------------------------------------

interface ChartsPanelProps {
  vendors: VendorInput[];
  results: LoanResult[];
  currency: string;
  cheapestByTotal: number;
  splitVendorIdx: number | null;
  onSplitVendorChange: (idx: number | null) => void;
}

function ChartsPanel({
  vendors,
  results,
  currency,
  cheapestByTotal,
  splitVendorIdx,
  onSplitVendorChange,
}: ChartsPanelProps) {
  const splitSelectId = useId();

  // Resolve the active vendor for the split chart. Manual selection
  // wins; otherwise we follow the cheapest. If no vendor is currently
  // valid, the chart renders an empty state inside SplitChart itself.
  const candidateIdx =
    splitVendorIdx != null && splitVendorIdx < vendors.length && !results[splitVendorIdx]?.error
      ? splitVendorIdx
      : cheapestByTotal >= 0
        ? cheapestByTotal
        : results.findIndex((r) => !r.error && r.contractSchedule.length > 0);
  const activeIdx = candidateIdx >= 0 ? candidateIdx : 0;
  const activeResult = results[activeIdx];
  const activeVendor = vendors[activeIdx];
  const vendorName = activeVendor?.name || `Vendor ${VENDOR_LABELS[activeIdx] ?? 'A'}`;

  return (
    <div className="lc-chartsPanel">
      <section className="lc-chartSection" aria-labelledby="lc-balance-h">
        <header className="lc-chartHeader">
          <h3 id="lc-balance-h" className="lc-sectionTitle">Balance over time</h3>
          <p className="lc-chartLead">
            Each line is one vendor's outstanding balance, month by month.
          </p>
        </header>
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

      <section className="lc-chartSection lc-splitSection" aria-labelledby="lc-split-h">
        <header className="lc-chartHeader">
          <h3 id="lc-split-h" className="lc-sectionTitle">Where each payment goes</h3>
          <p className="lc-chartLead">
            Same monthly payment every month. Early on, almost all of it
            is interest; near the end, almost all of it is principal.
          </p>
        </header>

        <div className="lc-splitControls">
          <label className="lc-fieldLabel" htmlFor={splitSelectId}>Vendor</label>
          <select
            id={splitSelectId}
            className="lc-select lc-splitSelect"
            value={splitVendorIdx == null ? '' : String(splitVendorIdx)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                onSplitVendorChange(null);
              } else {
                const next = Number(v);
                onSplitVendorChange(Number.isFinite(next) ? next : null);
                track('free_loan_comparison_split_vendor_changed', {
                  vendor: VENDOR_LABELS[next],
                });
              }
            }}
          >
            {/*
              Internal sort fallback: when no vendor is explicitly chosen
              we follow the lowest-total-paid one so the chart isn't
              pinned to slot A by default. Label kept neutral (no
              "cheapest" / "best" wording): see the regulatory rule in
              docs/strategy/regulatory-advisory-classification.md.
            */}
            <option value="">Auto (lowest total cost)</option>
            {vendors.map((v, i) => (
              <option key={i} value={i} disabled={Boolean(results[i]?.error)}>
                {v.name || `Vendor ${VENDOR_LABELS[i]}`}
                {results[i]?.error ? ' (incomplete)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activeResult && !activeResult.error && activeResult.contractSchedule.length > 0 ? (
          <SplitChart
            schedule={activeResult.contractSchedule}
            currency={currency}
            vendorName={vendorName}
            vendorColor={VENDOR_COLORS[activeIdx]}
          />
        ) : (
          <p className="lc-chartEmpty">
            Enter valid inputs above to see how each payment splits between
            interest and principal.
          </p>
        )}

        <p className="lc-splitCaption">
          Showing <strong>{vendorName}</strong>'s contract schedule
          {Number(activeVendor?.extraMonthly) > 0 && (
            <> (without optional extra principal; APR-equivalent view)</>
          )}
          . An extra payment in <em>year 1</em> cancels 25 years of
          interest on that euro; the same payment in <em>year 24</em>{' '}
          saves almost nothing.
        </p>
      </section>
    </div>
  );
}

// ---- How it works panel ----------------------------------------------------

function HowItWorksPanel() {
  return (
    <div className="lc-howPanel">
      <h3 className="lc-sectionTitle">How the comparison works</h3>
      <p>
        For each lender, the calculator builds a full amortization schedule
        using the standard fully-amortizing formula:
      </p>
      <p className="lc-formula">
        <code>
          M = P · r / (1 − (1 + r)<sup>−n</sup>)
        </code>
      </p>
      <ul className="lc-howList">
        <li>
          <strong>P</strong> is the loan principal, <strong>r</strong> is the
          monthly interest rate (annual rate ÷ 12), and <strong>n</strong> is
          the number of monthly payments.
        </li>
        <li>
          Each month's interest is computed on the outstanding balance, the
          payment is split between interest and principal, and the balance
          is reduced. The loop runs to the cent.
        </li>
        <li>
          <strong>APR</strong> folds the origination/closing fee into the
          rate by treating the fee as an upfront deduction from what you
          actually receive, then solving for the monthly rate at which the
          present value of the contractual payments equals that net amount.
          Reported as the nominal annual rate (monthly rate × 12), matching
          US loan disclosures.
        </li>
        <li>
          <strong>Hybrid (ARM) loans</strong> use the initial rate for the
          fixed window, then recast the payment at the transition month so
          the loan still amortizes within the original term at the
          subsequent rate.
        </li>
        <li>
          <strong>Lump-sum prepayments</strong> are applied as principal
          AFTER the regular monthly payment, so they don't accrue interest
          the same month.
        </li>
        <li>
          <strong>Prepayment penalties</strong> fire only when the loan is
          fully paid off on or before the penalty's expiration month.
        </li>
      </ul>
      <p className="lc-howNote">
        Everything runs in your browser. Nothing is sent to a server. Use
        the "Copy shareable link" button to encode every input into a URL
        you can hand to someone else.
      </p>
    </div>
  );
}

// ---- Horizon analysis ------------------------------------------------------

interface HorizonSectionProps {
  vendors: VendorInput[];
  results: LoanResult[];
  currency: string;
  horizonMonths: string;
  onHorizonChange: (next: string) => void;
}

/**
 * "If I sell or refinance at month N, where do I stand?" Per-vendor
 * snapshots of principal repaid, interest paid, remaining balance, and
 * total cash out of pocket up to the chosen horizon. The horizon slider
 * is bound to URL state via `horizonMonths`.
 */
function HorizonSection({
  vendors,
  results,
  currency,
  horizonMonths,
  onHorizonChange,
}: HorizonSectionProps) {
  const horizonId = useId();
  // Debounced engagement signal. We don't want to fire one event per
  // slider tick (a single drag would send dozens), so we schedule a
  // track() 600ms after the last change. The ref persists across
  // renders; the useEffect cleanup cancels in-flight timers when the
  // component unmounts. Property is bucketed (months) to avoid leaking
  // any computed loan figures.
  const horizonTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHorizonChange = useCallback(
    (next: string) => {
      onHorizonChange(next);
      if (horizonTrackTimer.current) {
        clearTimeout(horizonTrackTimer.current);
      }
      horizonTrackTimer.current = setTimeout(() => {
        const m = Math.round(parseNumber(next));
        if (!Number.isFinite(m) || m <= 0) return;
        track('free_loan_comparison_horizon_changed', { months: m });
      }, 600);
    },
    [onHorizonChange],
  );
  useEffect(() => () => {
    if (horizonTrackTimer.current) clearTimeout(horizonTrackTimer.current);
  }, []);
  // The slider's max is the longest valid schedule: a horizon past every
  // vendor's payoff is meaningless. We clamp to a sensible minimum of
  // 1 month so the slider always renders.
  const maxMonths = Math.max(
    1,
    ...results.filter((r) => !r.error).map((r) => r.schedule.length),
  );
  const parsed = Math.round(parseNumber(horizonMonths));
  const horizon = Number.isFinite(parsed)
    ? Math.min(maxMonths, Math.max(1, parsed))
    : 60;

  const validRows = vendors
    .map((v, i) => ({ v, i, r: results[i] }))
    .filter((row) => !row.r.error && row.r.schedule.length > 0);

  return (
    <section className="lc-advancedSection lc-horizonSection" aria-labelledby="lc-horizon-h">
      <header>
        <h3 id="lc-horizon-h" className="lc-sectionTitle">If I sell or refinance at...</h3>
        <p className="lc-sectionLead">
          Loans look very different at month 36 vs. month 360. Each row
          shows where the borrower actually stands on that date.
        </p>
      </header>

      <div className="lc-horizonControls">
        <label className="lc-fieldLabel" htmlFor={horizonId}>
          Horizon: <strong>{formatMonths(horizon)}</strong>
        </label>
        <input
          id={horizonId}
          type="range"
          min={1}
          max={maxMonths}
          step={1}
          value={horizon}
          onChange={(e) => handleHorizonChange(e.target.value)}
          // aria-valuetext lets screen readers announce a human-friendly
          // value ("2 yr 6 mo") instead of just the raw integer.
          aria-valuetext={formatMonths(horizon)}
          className="lc-horizonSlider"
        />
        <input
          type="text"
          inputMode="numeric"
          className="lc-input lc-horizonInput"
          value={horizonMonths}
          onChange={(e) => handleHorizonChange(e.target.value)}
          aria-label="Horizon in months (text)"
        />
      </div>

      {validRows.length === 0 ? (
        <p className="lc-deltaEmpty">Enter valid inputs to see horizon snapshots.</p>
      ) : (
        <div className="lc-deltaTableWrap">
          <table className="lc-deltaTable">
            <thead>
              <tr>
                <th scope="col"><span className="lc-srOnly">Metric</span></th>
                {validRows.map((row) => (
                  <th key={row.i}>
                    {row.v.name || `Vendor ${VENDOR_LABELS[row.i]}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Principal repaid</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      {formatMoney(snap.principalPaidMinor, currency)}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">Interest paid</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      {formatMoney(snap.interestPaidMinor, currency)}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">Balance remaining</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      {formatMoney(snap.balanceMinor, currency)}
                    </td>
                  );
                })}
              </tr>
              <tr className="lc-deltaRowEmphasized">
                <th scope="row">Total cash out</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      {formatMoney(snap.totalOutOfPocketMinor, currency)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---- Refinance scenario (advanced) -----------------------------------------

interface RefinanceSectionProps {
  vendors: VendorInput[];
  results: LoanResult[];
  currency: string;
  state: GlobalState;
  onChange: (patch: Partial<GlobalState>) => void;
}

/**
 * Lets the user pick one vendor and ask "what if I refinanced this loan
 * at month N into a new loan?". Uses the engine's `refinanceComparison`
 * helper to produce a savings figure and a break-even horizon.
 */
function RefinanceSection({
  vendors,
  results,
  currency,
  state,
  onChange,
}: RefinanceSectionProps) {
  const vendorSelectId = useId();
  const atMonthId = useId();
  const newRateId = useId();
  const newTermId = useId();
  const newFeeId = useId();
  const rollFeeId = useId();

  // Debounced engagement signal for the refinance section. The five
  // fields are heavily inter-related, and users typically tweak several
  // in a single session; we want a single event per "burst of activity"
  // rather than one per keystroke. Property names the field that just
  // changed; values are never sent.
  const refiTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRefiChange = useCallback((field: keyof GlobalState) => {
    if (refiTrackTimer.current) {
      clearTimeout(refiTrackTimer.current);
    }
    refiTrackTimer.current = setTimeout(() => {
      track('free_loan_comparison_refi_changed', { field });
    }, 600);
  }, []);
  useEffect(() => () => {
    if (refiTrackTimer.current) clearTimeout(refiTrackTimer.current);
  }, []);

  // Resolve the vendor to refinance. We accept any 1-based index that
  // points to a valid result; on mismatch we fall back to the first
  // valid vendor.
  const requestedIdx = Math.round(parseNumber(state.refiVendorIndex)) - 1;
  const validIndices = vendors
    .map((_, i) => i)
    .filter((i) => !results[i].error && results[i].schedule.length > 0);
  const activeIdx =
    validIndices.includes(requestedIdx) ? requestedIdx : (validIndices[0] ?? -1);

  const original = activeIdx >= 0 ? results[activeIdx] : null;
  const atMonth = Math.round(parseNumber(state.refiAtMonth));
  const newRate = parseNumber(state.refiNewRatePct) / 100;
  const newTerm = Math.round(parseNumber(state.refiNewTermMonths));
  const newFeeMinor = toMinor(parseNumber(state.refiNewFeeMajor) || 0, currency);

  const cmp =
    original && Number.isFinite(atMonth) && Number.isFinite(newRate) && Number.isFinite(newTerm)
      ? refinanceComparison(original, atMonth, newRate, newTerm, newFeeMinor, state.refiRollFee)
      : null;

  return (
    <section className="lc-advancedSection lc-refiSection" aria-labelledby="lc-refi-h">
      <header>
        <h3 id="lc-refi-h" className="lc-sectionTitle">Refinance scenario</h3>
        <p className="lc-sectionLead">
          Compare keeping a loan to refinancing it at a future month.
          Useful when rates drop or you're considering buying out an ARM
          before it resets.
        </p>
      </header>

      <div className="lc-refiInputs">
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={vendorSelectId}>Refinance which loan?</label>
          <select
            id={vendorSelectId}
            className="lc-select"
            value={state.refiVendorIndex}
            onChange={(e) => {
              onChange({ refiVendorIndex: e.target.value });
              trackRefiChange('refiVendorIndex');
            }}
          >
            {vendors.map((v, i) => (
              <option key={i} value={String(i + 1)} disabled={Boolean(results[i]?.error)}>
                {v.name || `Vendor ${VENDOR_LABELS[i]}`}
                {results[i]?.error ? ' (incomplete)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={atMonthId}>Refinance at month</label>
          <input
            id={atMonthId}
            type="text"
            inputMode="numeric"
            className="lc-input"
            value={state.refiAtMonth}
            onChange={(e) => {
              onChange({ refiAtMonth: e.target.value });
              trackRefiChange('refiAtMonth');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newRateId}>New rate (%)</label>
          <input
            id={newRateId}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={state.refiNewRatePct}
            onChange={(e) => {
              onChange({ refiNewRatePct: e.target.value });
              trackRefiChange('refiNewRatePct');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newTermId}>New term (months)</label>
          <input
            id={newTermId}
            type="text"
            inputMode="numeric"
            className="lc-input"
            value={state.refiNewTermMonths}
            onChange={(e) => {
              onChange({ refiNewTermMonths: e.target.value });
              trackRefiChange('refiNewTermMonths');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newFeeId}>
            New closing costs <span className="lc-fieldHint">({currency})</span>
          </label>
          <input
            id={newFeeId}
            type="text"
            inputMode="decimal"
            className="lc-input"
            value={state.refiNewFeeMajor}
            onChange={(e) => {
              onChange({ refiNewFeeMajor: e.target.value });
              trackRefiChange('refiNewFeeMajor');
            }}
          />
        </div>

        <div className="lc-field lc-fieldInline">
          <input
            id={rollFeeId}
            type="checkbox"
            checked={state.refiRollFee}
            onChange={(e) => {
              onChange({ refiRollFee: e.target.checked });
              trackRefiChange('refiRollFee');
            }}
          />
          <label htmlFor={rollFeeId} className="lc-fieldLabel">
            Roll closing costs into new principal
          </label>
        </div>
      </div>

      {!cmp ? (
        <p className="lc-deltaEmpty">
          Pick a valid vendor and enter a refinance month, rate, and term to see savings.
        </p>
      ) : 'error' in cmp ? (
        <p className="lc-error" role="alert">{cmp.error}</p>
      ) : (
        <div className="lc-refiResults">
          <dl className="lc-resultList">
            <ResultRow
              label="Keep current loan: total"
              value={formatMoney(cmp.keepTotalMinor, currency)}
            />
            <ResultRow
              label="Refinance: total (over both legs)"
              value={formatMoney(cmp.refinanceTotalMinor, currency)}
            />
            <ResultRow
              label={cmp.savingsMinor >= 0 ? 'Refi saves' : 'Refi costs more'}
              value={formatMoney(Math.abs(cmp.savingsMinor), currency)}
              emphasized
            />
            <ResultRow
              label="Break-even (months after refi)"
              value={
                Number.isFinite(cmp.breakEvenMonths)
                  ? formatMonths(cmp.breakEvenMonths)
                  : 'never'
              }
              hint={
                Number.isFinite(cmp.breakEvenMonths)
                  ? 'How long the new loan must run for closing costs to pay back'
                  : 'New monthly is not lower; closing costs do not recoup'
              }
            />
          </dl>
        </div>
      )}
    </section>
  );
}
