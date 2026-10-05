import { useEffect, useId, useMemo, useState } from 'react';
import { CURRENCIES, getCurrency } from '../utils/loan/math.ts';
import { simulate, type SimulationResult } from '../utils/monte-carlo/math.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, encodeState, type ToolState } from '../utils/monte-carlo/url.ts';

// ---------------------------------------------------------------------------
// PostHog telemetry: interaction metadata only, never the values typed.
// ---------------------------------------------------------------------------

function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* never let analytics throw block UI updates */
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatAmount(value: number, code: string, compact = false): string {
  const { locale } = getCurrency(code);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
    ...(compact ? { notation: 'compact', maximumSignificantDigits: 3 } : {}),
  }).format(Math.round(value));
}

function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** "9 in 10" style phrasing, rounded to the nearest tenth. */
function inTen(share: number): string {
  return `${Math.round(share * 10)} in 10`;
}

// ---------------------------------------------------------------------------
// Form state: inputs are kept as strings so a field can be empty while typing.
// ---------------------------------------------------------------------------

interface FormState {
  currency: string;
  start: string;
  monthly: string;
  saveYears: string;
  stockPct: string;
  withdrawOn: boolean;
  withdrawal: string;
  withdrawYears: string;
}

const DEFAULT_WITHDRAWAL = 30_000;

function toForm(s: ToolState): FormState {
  return {
    currency: s.currency,
    start: String(s.start),
    monthly: String(s.monthly),
    saveYears: String(s.saveYears),
    stockPct: String(s.stockPct),
    withdrawOn: s.withdrawal > 0,
    withdrawal: String(s.withdrawal > 0 ? s.withdrawal : DEFAULT_WITHDRAWAL),
    withdrawYears: String(s.withdrawYears),
  };
}

function toState(f: FormState): ToolState {
  const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
  return {
    currency: f.currency,
    start: n(f.start),
    monthly: n(f.monthly),
    saveYears: n(f.saveYears),
    stockPct: n(f.stockPct),
    withdrawal: f.withdrawOn ? n(f.withdrawal) : 0,
    withdrawYears: n(f.withdrawYears),
  };
}

function isValid(v: string, min: number, max: number): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MonteCarloSimulator() {
  const [form, setForm] = useState<FormState>(() => toForm(DEFAULTS));
  const [settled, setSettled] = useState<ToolState>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const ids = {
    currency: useId(),
    start: useId(),
    monthly: useId(),
    saveYears: useId(),
    stockPct: useId(),
    withdrawal: useId(),
    withdrawYears: useId(),
  };

  // Shared links carry the plan after the #, which browsers never send to a
  // server. A script in the page head moves it out of the address bar before
  // analytics start (see the page file), and leaves it here for us to read.
  useEffect(() => {
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const shared = typeof raw === 'string' ? decodeState(raw) : null;
    if (!shared) return;
    setForm(toForm(shared));
    setSettled(shared);
    track('free_monte_carlo_shared_view_opened', {
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, []);

  const errors = {
    start: !isValid(form.start, 0, 1e12),
    monthly: !isValid(form.monthly, 0, 1e10),
    saveYears: !isValid(form.saveYears, 0, 60),
    stockPct: !isValid(form.stockPct, 0, 100),
    withdrawal: form.withdrawOn && !isValid(form.withdrawal, 1, 1e11),
    withdrawYears: form.withdrawOn && !isValid(form.withdrawYears, 1, 60),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  // Simulate a moment after typing stops, and only on valid input, so the
  // chart does not jump around on every keystroke.
  useEffect(() => {
    if (hasErrors) return;
    const t = window.setTimeout(() => setSettled(toState(form)), 250);
    return () => window.clearTimeout(t);
  }, [form, hasErrors]);

  const result = useMemo(() => simulate(settled), [settled]);
  const code = settled.currency;

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Shares the plan the results show (the settled state), not a half-typed one.
  function copyShareLink() {
    const state = encodeState(settled);
    const utm = 'utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=monte_carlo';
    const url = `${window.location.origin}${window.location.pathname}?${utm}${state ? `#${state}` : ''}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      },
      () => window.prompt('Copy this link:', url),
    );
    track('free_monte_carlo_share_copied');
  }

  function reset() {
    setForm(toForm(DEFAULTS));
    setSettled(DEFAULTS);
    track('free_monte_carlo_reset');
  }

  return (
    <div className="mcs-root">
      <form className="mcs-form" onSubmit={(e) => e.preventDefault()} aria-label="Your plan">
        <div className="mcs-grid">
          <div className="mcs-field">
            <label className="mcs-label" htmlFor={ids.currency}>Currency</label>
            <select
              id={ids.currency}
              className="mcs-input"
              value={form.currency}
              onChange={(e) => {
                update('currency')(e);
                track('free_monte_carlo_currency_changed', { currency: e.target.value });
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}: {c.label}</option>
              ))}
            </select>
          </div>
          <NumberField id={ids.start} label="Invested today" value={form.start} onChange={update('start')} invalid={errors.start} hint="Today's money" />
          <NumberField id={ids.monthly} label="Added every month" value={form.monthly} onChange={update('monthly')} invalid={errors.monthly} />
          <NumberField id={ids.saveYears} label="Years of saving" value={form.saveYears} onChange={update('saveYears')} invalid={errors.saveYears} max={60} hint="0 to 60" />
        </div>

        <div className="mcs-field mcs-mix">
          <label className="mcs-label" htmlFor={ids.stockPct}>
            Mix: <strong>{errors.stockPct ? '?' : form.stockPct}% stocks</strong>, {errors.stockPct ? '?' : 100 - Number(form.stockPct)}% bonds
          </label>
          <input
            id={ids.stockPct}
            className="mcs-range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={errors.stockPct ? DEFAULTS.stockPct : form.stockPct}
            onChange={update('stockPct')}
          />
          <span className="mcs-hint">Rebalanced back to this mix once a year.</span>
        </div>

        <fieldset className="mcs-withdraw">
          <legend className="mcs-label">
            <label className="mcs-check">
              <input
                type="checkbox"
                checked={form.withdrawOn}
                onChange={(e) => {
                  const on = e.target.checked;
                  setForm((f) => ({ ...f, withdrawOn: on }));
                  track('free_monte_carlo_withdrawal_toggled', { on });
                }}
              />
              Then live off it
            </label>
          </legend>
          {!form.withdrawOn && (
            <span className="mcs-hint">Switch on to see how long the money lasts once you start taking it out.</span>
          )}
          {form.withdrawOn && (
            <div className="mcs-grid mcs-grid--two">
              <NumberField id={ids.withdrawal} label="Taken out every year" value={form.withdrawal} onChange={update('withdrawal')} invalid={errors.withdrawal} hint="Today's money, taken monthly" />
              <NumberField id={ids.withdrawYears} label="For how many years" value={form.withdrawYears} onChange={update('withdrawYears')} invalid={errors.withdrawYears} max={60} hint="1 to 60" />
            </div>
          )}
        </fieldset>

        <div className="mcs-actions">
          <button type="button" className="mcs-btn" onClick={copyShareLink} disabled={hasErrors} data-attr="free-monte-carlo-share">
            {copied ? 'Link copied' : 'Copy a link to this plan'}
          </button>
          <button type="button" className="mcs-btn mcs-btn--ghost" onClick={reset} data-attr="free-monte-carlo-reset">
            Reset
          </button>
          <span className="mcs-hint" role="status" aria-live="polite">
            {hasErrors ? 'Fix the highlighted fields to update the results.' : ''}
          </span>
        </div>
      </form>

      <Results result={result} state={settled} code={code} />
    </div>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invalid: boolean;
  hint?: string;
  max?: number;
}) {
  const hintId = `${props.id}-hint`;
  return (
    <div className="mcs-field">
      <label className="mcs-label" htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        className="mcs-input"
        type="number"
        inputMode="decimal"
        min={0}
        max={props.max}
        step="any"
        value={props.value}
        onChange={props.onChange}
        aria-invalid={props.invalid || undefined}
        aria-describedby={props.hint ? hintId : undefined}
      />
      {props.hint && <span className="mcs-hint" id={hintId}>{props.hint}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function Results({ result, state, code }: { result: SimulationResult; state: ToolState; code: string }) {
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const withdrawing = state.withdrawal > 0;
  const tableId = useId();

  return (
    <section className="mcs-results" aria-labelledby="mcs-results-h">
      <h2 id="mcs-results-h" className="mcs-resultsTitle">
        {saving ? `After ${state.saveYears} year${state.saveYears === 1 ? '' : 's'} of saving` : 'Starting from today'}
      </h2>

      {saving && (
        <>
          <div className="mcs-cards">
            <div className="mcs-card">
              <span className="mcs-cardLabel">Low (10th percentile): 1 in 10 paths ended below</span>
              <span className="mcs-cardValue">{formatAmount(r.p10, code)}</span>
            </div>
            <div className="mcs-card mcs-card--mid">
              <span className="mcs-cardLabel">Median: half the paths ended above, half below</span>
              <span className="mcs-cardValue">{formatAmount(r.p50, code)}</span>
            </div>
            <div className="mcs-card">
              <span className="mcs-cardLabel">High (90th percentile): 1 in 10 paths ended above</span>
              <span className="mcs-cardValue">{formatAmount(r.p90, code)}</span>
            </div>
          </div>
          <p className="mcs-note">
            A calculator with one fixed return would draw a single line to{' '}
            <strong>{formatAmount(result.straightLine[state.saveYears], code)}</strong>.{' '}
            {formatShare(result.belowStraightLine)} of the simulated paths ended below it.
          </p>
        </>
      )}

      {!saving && !withdrawing && (
        <p className="mcs-note">Add some years of saving, or switch on withdrawals, to see a spread of outcomes.</p>
      )}

      {withdrawing && result.lasted !== null && (
        <div className="mcs-lasted">
          <p className="mcs-lastedHead">
            Taking {formatAmount(state.withdrawal, code)} a year, the money lasted all {state.withdrawYears} years in{' '}
            <strong>{inTen(result.lasted)}</strong> simulated paths ({formatShare(result.lasted)}).
          </p>
          {result.medianRunOutYear !== null && (
            <p className="mcs-note">
              Among the paths where it ran out, the median year it did so was year {result.medianRunOutYear} of {state.withdrawYears}.
            </p>
          )}
        </div>
      )}

      <p className="mcs-caveat">
        These are shares of {result.paths.toLocaleString('en-US')} simulated paths, not the chance of anything happening
        to you. The model is a simplification; see what it leaves out below.
      </p>

      {result.years > 0 && <Chart result={result} state={state} code={code} />}

      {result.years > 0 && <details className="mcs-tableWrap" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('free_monte_carlo_table_opened'); }}>
        <summary className="mcs-tableSummary">Show the numbers as a table</summary>
        <div className="mcs-tableScroll">
          <table className="mcs-table" aria-describedby={tableId}>
            <caption id={tableId}>Balance at the end of each year, in today's money</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Low (10th)</th>
                <th scope="col">Median</th>
                <th scope="col">High (90th)</th>
                <th scope="col">Single line</th>
              </tr>
            </thead>
            <tbody>
              {tableYears(result.years).map((y) => (
                <tr key={y}>
                  <th scope="row">{y}</th>
                  <td>{formatAmount(result.bands[y].p10, code)}</td>
                  <td>{formatAmount(result.bands[y].p50, code)}</td>
                  <td>{formatAmount(result.bands[y].p90, code)}</td>
                  <td>{formatAmount(result.straightLine[y], code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>}
    </section>
  );
}

/** Every fifth year, plus the last one. */
function tableYears(years: number): number[] {
  const out: number[] = [];
  for (let y = 0; y <= years; y += 5) out.push(y);
  if (out[out.length - 1] !== years) out.push(years);
  return out;
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

const W = 720;
const H = 380;
const PAD = { top: 28, right: 24, bottom: 52, left: 112 };

/** Round gridline steps (1, 2, 2.5 or 5 times a power of ten), at most four, covering v. */
function niceScale(v: number): { top: number; step: number; count: number } {
  if (v <= 0) return { top: 4, step: 1, count: 4 };
  const raw = v / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * exp).find((s) => s >= raw) ?? 10 * exp;
  const count = Math.max(1, Math.ceil(v / step - 1e-9));
  return { top: step * count, step, count };
}

function Chart({ result, state, code }: { result: SimulationResult; state: ToolState; code: string }) {
  const titleId = useId();
  const descId = useId();
  const { bands, straightLine, years } = result;
  // Scale to the middle half of every year, plus the full 8-in-10 band while
  // saving. During withdrawals the luckiest paths keep compounding and would
  // otherwise squash the saving years into the bottom of the chart; the part
  // of the band above the top is clipped and labelled.
  const saveEnd = Math.min(state.saveYears, years);
  const { top, step: yStep, count: yCount } = niceScale(
    Math.max(...bands.map((b) => b.p75), ...bands.slice(0, saveEnd + 1).map((b) => b.p90), ...straightLine),
  );
  const clipped = bands.some((b) => b.p90 > top);
  const clipId = useId();
  const x = (y: number) => PAD.left + (years === 0 ? 0 : (y / years) * (W - PAD.left - PAD.right));
  const yPx = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yPx(v).toFixed(1)}`).join(' ');
  const area = (lo: number[], hi: number[]) =>
    `${line(hi)} ${lo
      .map((v, i) => [i, v] as const)
      .reverse()
      .map(([i, v]) => `L${x(i).toFixed(1)},${yPx(v).toFixed(1)}`)
      .join(' ')} Z`;

  const p10 = bands.map((b) => b.p10);
  const p25 = bands.map((b) => b.p25);
  const p50 = bands.map((b) => b.p50);
  const p75 = bands.map((b) => b.p75);
  const p90 = bands.map((b) => b.p90);
  const ticks = Array.from({ length: yCount + 1 }, (_, t) => t * yStep);
  const markerX = x(state.saveYears);
  const markerRight = markerX < W - PAD.right - 170;
  const step = years <= 10 ? 1 : years <= 30 ? 5 : 10;
  const xTicks: number[] = [];
  for (let y = 0; y <= years; y += step) xTicks.push(y);

  const end = bands[years];
  const desc =
    `Fan chart of ${result.paths.toLocaleString('en-US')} simulated paths over ${years} years. ` +
    `At the end, the 10th percentile is ${formatAmount(end.p10, code)}, the median ${formatAmount(end.p50, code)}, ` +
    `and the 90th percentile ${formatAmount(end.p90, code)}. A single fixed-return line ends at ${formatAmount(straightLine[years], code)}.`;

  return (
    <figure className="mcs-figure">
      <p className="mcs-swipe" aria-hidden="true">Swipe to see the whole chart &rarr;</p>
      <div className="mcs-chartScroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`} className="mcs-chart">
          <title id={titleId}>Spread of simulated outcomes</title>
          <desc id={descId}>{desc}</desc>
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
            </clipPath>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="mcs-grid" x1={PAD.left} x2={W - PAD.right} y1={yPx(t)} y2={yPx(t)} />
              <text className="mcs-axis" x={PAD.left - 10} y={yPx(t) + 5} textAnchor="end">{formatAmount(t, code, true)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} className="mcs-axis" x={x(t)} y={H - PAD.bottom + 24} textAnchor="middle">{t}</text>
          ))}
          <text className="mcs-axis" x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle">Years from today</text>
          {state.withdrawal > 0 && state.saveYears > 0 && (
            <g>
              <line className="mcs-marker" x1={markerX} x2={markerX} y1={PAD.top} y2={H - PAD.bottom} />
              <text className="mcs-axis" x={markerRight ? markerX + 8 : markerX - 8} y={PAD.top + 16} textAnchor={markerRight ? 'start' : 'end'}>
                Withdrawals start
              </text>
            </g>
          )}
          <g clipPath={`url(#${clipId})`}>
            <path className="mcs-band mcs-band--outer" d={area(p10, p90)} />
            <path className="mcs-band mcs-band--inner" d={area(p25, p75)} />
            <path className="mcs-straight" d={line(straightLine)} />
            <path className="mcs-median" d={line(p50)} />
          </g>
          {clipped && (
            <text className="mcs-axis" x={W - PAD.right} y={PAD.top - 8} textAnchor="end">
              High paths continue above &uarr;
            </text>
          )}
        </svg>
      </div>
      <figcaption className="mcs-legend">
        <span><i className="mcs-key mcs-key--outer" aria-hidden="true" />8 in 10 paths</span>
        <span><i className="mcs-key mcs-key--inner" aria-hidden="true" />Middle half</span>
        <span><i className="mcs-key mcs-key--median" aria-hidden="true" />Median balance</span>
        <span><i className="mcs-key mcs-key--straight" aria-hidden="true" />Single fixed-return line</span>
      </figcaption>
    </figure>
  );
}
