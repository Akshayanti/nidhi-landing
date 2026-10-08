import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ChartReadout, useEscapeToClose, useReadoutPlacement } from './chart/ChartReadout.tsx';
import { CURRENCIES } from '../utils/loan/math.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import {
  MAX_FEE_PCT,
  RETURN_SETTINGS,
  RUN_OPTIONS,
  simulate,
  type ReturnSetting,
  type SimulationResult,
} from '../utils/monte-carlo/math.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, encodeState, type ToolState } from '../utils/monte-carlo/url.ts';
import type { WorkerReply, WorkerRequest } from '../utils/monte-carlo/worker.ts';

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

function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** "9 in 10" style phrasing, rounded to the nearest tenth. */
function inTen(share: number): string {
  return `${Math.round(share * 10)} in 10`;
}

// ---------------------------------------------------------------------------
// Return settings, as shown on the switch. The figures match math.ts: the
// historical row quotes the published world figures, the other two the ends
// of the long-run range used across nidhi's articles.
// ---------------------------------------------------------------------------

const RETURN_LABELS: Record<ReturnSetting, string> = {
  cautious: 'Cautious',
  historical: 'Historical',
  optimistic: 'Optimistic',
};

const RETURN_TIPS: Record<ReturnSetting, string> = {
  cautious:
    'Stocks grow about 4% a year after inflation and bonds about 1%: the low end of the long-run range. The ups and downs are as large as in history.',
  historical:
    'World markets from 1900 to 2025: stocks grew about 5.3% a year after inflation and bonds about 1.7%, with the ups and downs they actually had.',
  optimistic:
    'Stocks grow about 6% a year after inflation and bonds about 3%: the high end of the long-run range. The ups and downs are as large as in history.',
};

// Above this many paths the simulation runs in a worker, off the main thread.
const WORKER_THRESHOLD = 10_000;

// ---------------------------------------------------------------------------
// Phones (the site's 640px breakpoint). The server and the first browser
// render assume a wider screen, so the page hydrates cleanly; phones then
// switch to the compact chart. Nothing is stored.
// ---------------------------------------------------------------------------

const PHONE_QUERY = '(max-width: 640px)';

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
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
  feePct: string;
  returns: ReturnSetting;
  paths: number;
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
    feePct: String(s.feePct),
    returns: s.returns,
    paths: s.paths,
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
    feePct: n(f.feePct),
    returns: f.returns,
    paths: f.paths,
  };
}

function isValid(v: string, min: number, max: number): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
}

// ---------------------------------------------------------------------------
// Simulation runner: small runs on the main thread, large ones in a worker,
// falling back to the main thread if a worker cannot start.
// ---------------------------------------------------------------------------

/** The result and the plan that produced it, so the panel never pairs new inputs with old numbers. */
interface Shown {
  result: SimulationResult;
  state: ToolState;
}

function useSimulation(state: ToolState): Shown & { busy: boolean } {
  const [shown, setShown] = useState<Shown>(() => ({ result: simulate(state), state }));
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);

  useEffect(() => () => worker.current?.terminate(), []);

  // The first result is computed while rendering (also on the server), so
  // the effect has nothing to do until the plan changes.
  const initial = useRef(state);

  useEffect(() => {
    if (state === initial.current) return;
    const id = ++latest.current;
    if (state.paths <= WORKER_THRESHOLD) {
      setShown({ result: simulate(state), state });
      setBusy(false);
      return;
    }
    setBusy(true);
    const fallback = () => {
      // Let the busy state paint before blocking the thread.
      window.setTimeout(() => {
        if (id !== latest.current) return;
        setShown({ result: simulate(state), state });
        setBusy(false);
      }, 30);
    };
    try {
      if (!worker.current) {
        worker.current = new Worker(new URL('../utils/monte-carlo/worker.ts', import.meta.url), { type: 'module' });
      }
      const w = worker.current;
      w.onmessage = (e: MessageEvent<WorkerReply>) => {
        if (e.data.id !== latest.current) return;
        setShown({ result: e.data.result, state });
        setBusy(false);
      };
      w.onerror = () => {
        worker.current?.terminate();
        worker.current = null;
        fallback();
      };
      const request: WorkerRequest = { id, inputs: state };
      w.postMessage(request);
    } catch {
      fallback();
    }
  }, [state]);

  return { ...shown, busy };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MonteCarloSimulator() {
  const [form, setForm] = useState<FormState>(() => toForm(DEFAULTS));
  const [settled, setSettled] = useState<ToolState>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(false);
  // Phones only: returns, fees and paths start folded (CSS ignores this
  // on wider screens, where they always show).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ids = {
    settings: useId(),
    currency: useId(),
    start: useId(),
    monthly: useId(),
    saveYears: useId(),
    stockPct: useId(),
    withdrawal: useId(),
    withdrawYears: useId(),
    feePct: useId(),
    returns: useId(),
    paths: useId(),
  };

  // Escape hides the return tooltips wherever focus is (WCAG 1.4.13); they
  // come back once the pointer or focus leaves the switch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTipsDismissed(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    feePct: !isValid(form.feePct, 0, MAX_FEE_PCT),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  // Simulate a moment after typing stops, and only on valid input, so the
  // chart does not jump around on every keystroke.
  useEffect(() => {
    if (hasErrors) return;
    const t = window.setTimeout(() => setSettled(toState(form)), 250);
    return () => window.clearTimeout(t);
  }, [form, hasErrors]);

  const { result, state: shownState, busy: running } = useSimulation(settled);
  // Pending from the moment a new plan settles until its result is on screen,
  // so Copy can never share a plan the results do not show yet.
  const pending = running || settled !== shownState;

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
        <p className="mcs-hint mcs-crossLink">
          Money in several currencies? Add it up first with the{' '}
          <a href="/free/multi-currency-net-worth/" data-attr="free-monte-carlo-net-worth-link">net worth calculator</a>,
          then enter the total here.
        </p>

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

        <QuickResult result={result} state={shownState} busy={pending} />

        {/* Phones only: the toggle for the folded settings, showing what they
            are set to. An invalid fee keeps them open so the error shows.
            The current values sit outside the button, drawn over it with
            pointer-events off: with consent, analytics records a clicked
            button's text, and the fee is a typed value (CLAUDE.md: choices,
            never values). */}
        <div className="mcs-settingsRow">
          <button
            type="button"
            className="mcs-settingsToggle"
            aria-expanded={settingsOpen || errors.feePct}
            aria-controls={ids.settings}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <span className="mcs-settingsName">Returns, fees and paths</span>
          </button>
          <p className="mcs-settingsValue">
            {RETURN_LABELS[form.returns]} · {errors.feePct ? '?' : form.feePct}% fees · {form.paths.toLocaleString('en-US')} paths
          </p>
        </div>

        <div
          id={ids.settings}
          className={`mcs-grid mcs-grid--assumptions${settingsOpen || errors.feePct ? ' mcs-settings--open' : ''}`}
        >
          <fieldset
            className={`mcs-switch${tipsDismissed ? ' mcs-switch--tipsOff' : ''}`}
            onMouseLeave={() => setTipsDismissed(false)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTipsDismissed(false);
            }}
          >
            <legend className="mcs-label">Returns</legend>
            <div className="mcs-switchRow">
              {RETURN_SETTINGS.map((s) => (
                <label key={s} className={`mcs-switchOpt${form.returns === s ? ' mcs-switchOpt--on' : ''}`}>
                  <input
                    type="radio"
                    name={ids.returns}
                    value={s}
                    checked={form.returns === s}
                    aria-describedby={`${ids.returns}-${s}`}
                    onChange={() => {
                      setForm((f) => ({ ...f, returns: s }));
                      track('free_monte_carlo_returns_changed', { setting: s });
                    }}
                  />
                  <span>{RETURN_LABELS[s]}</span>
                  <span className="mcs-tip" role="tooltip" id={`${ids.returns}-${s}`}>{RETURN_TIPS[s]}</span>
                </label>
              ))}
            </div>
            {/* The chosen setting's description, visible for touch screens
                where there is no hover. Screen readers get it from the
                tooltip through aria-describedby, so it is hidden from them. */}
            <span className="mcs-hint" aria-hidden="true">{RETURN_TIPS[form.returns]}</span>
          </fieldset>
          <NumberField
            id={ids.feePct}
            label="Yearly fees, %"
            value={form.feePct}
            onChange={update('feePct')}
            invalid={errors.feePct}
            max={MAX_FEE_PCT}
            hint="Fund and platform fees, taken off every year's return. 0 to 5."
          />
          <div className="mcs-field">
            <label className="mcs-label" htmlFor={ids.paths}>Simulated paths</label>
            <select
              id={ids.paths}
              className="mcs-input"
              value={form.paths}
              aria-describedby={`${ids.paths}-hint`}
              onChange={(e) => {
                const paths = Number(e.target.value);
                setForm((f) => ({ ...f, paths }));
                track('free_monte_carlo_runs_changed', { runs: paths });
              }}
            >
              {RUN_OPTIONS.map((n) => (
                <option key={n} value={n}>{n.toLocaleString('en-US')}</option>
              ))}
            </select>
            <span className="mcs-hint" id={`${ids.paths}-hint`}>More paths give steadier figures; past 10,000 they move by a few percent at most.</span>
          </div>
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
          <button type="button" className="mcs-btn" onClick={copyShareLink} disabled={hasErrors || pending} data-attr="free-monte-carlo-share">
            {copied ? 'Link copied' : 'Copy a link to this plan'}
          </button>
          <button type="button" className="mcs-btn mcs-btn--ghost" onClick={reset} data-attr="free-monte-carlo-reset">
            Reset
          </button>
          <span className="mcs-hint" role="status" aria-live="polite">
            {hasErrors
              ? 'Fix the highlighted fields to update the results.'
              : running
                ? `Running ${settled.paths.toLocaleString('en-US')} paths…`
                : ''}
          </span>
        </div>
      </form>

      <Results result={result} state={shownState} code={shownState.currency} busy={running} />
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

/**
 * Phones only: the headline result right under the main inputs, so it
 * answers as you type instead of sitting below the whole form. The full
 * results below say the same, so screen readers skip this copy.
 */
function QuickResult({ result, state, busy }: { result: SimulationResult; state: ToolState; busy: boolean }) {
  const code = state.currency;
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const lasted = state.withdrawal > 0 ? result.lasted : null;
  if (!saving && lasted === null) return null;
  return (
    <div className={`mcs-quick${busy ? ' mcs-quick--busy' : ''}`} aria-hidden="true">
      {saving && (
        <>
          <span className="mcs-quickTitle">Median after {state.saveYears} year{state.saveYears === 1 ? '' : 's'}</span>
          <span className="mcs-quickValue">{formatAmount(r.p50, code)}</span>
          <span className="mcs-quickRange">
            8 in 10 paths between {formatAmount(r.p10, code, true)} and {formatAmount(r.p90, code, true)}
          </span>
        </>
      )}
      {lasted !== null && (
        <span className="mcs-quickRange">
          The money lasted all {state.withdrawYears} years in {inTen(lasted)} paths.
        </span>
      )}
    </div>
  );
}

function Results({ result, state, code, busy }: { result: SimulationResult; state: ToolState; code: string; busy: boolean }) {
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const withdrawing = state.withdrawal > 0;
  const tableId = useId();

  return (
    <section className={`mcs-results${busy ? ' mcs-results--busy' : ''}`} aria-labelledby="mcs-results-h" aria-busy={busy}>
      <h2 id="mcs-results-h" className="mcs-resultsTitle">
        {saving ? `After ${state.saveYears} year${state.saveYears === 1 ? '' : 's'} of saving` : 'Starting from today'}
      </h2>

      {saving && (
        <>
          <div className="mcs-cards">
            {/* Phones show the short name only, in three columns, and the
                explanations once below the cards (mcs-cardsKey). */}
            <div className="mcs-card">
              <span className="mcs-cardLabel">Low<span className="mcs-cardMore"> (10th percentile): 1 in 10 paths ended below</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p10, code)}</span>
            </div>
            <div className="mcs-card mcs-card--mid">
              <span className="mcs-cardLabel">Median<span className="mcs-cardMore">: half the paths ended above, half below</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p50, code)}</span>
            </div>
            <div className="mcs-card">
              <span className="mcs-cardLabel">High<span className="mcs-cardMore"> (90th percentile): 1 in 10 paths ended above</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p90, code)}</span>
            </div>
          </div>
          <p className="mcs-cardsKey">
            Low and high: 1 in 10 paths ended below or above (the 10th and 90th percentiles). Median: half ended above, half below.
          </p>
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
        {result.paths < 10_000 &&
          ` With only ${result.paths.toLocaleString('en-US')} paths, the figures can be several percent away from what thousands of paths give.`}
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

interface Geometry {
  W: number;
  H: number;
  PAD: { top: number; right: number; bottom: number; left: number };
  /** End-of-line labels need the right-hand gutter; phones read them from the cards. */
  endLabels: boolean;
}

const WIDE: Geometry = { W: 760, H: 420, PAD: { top: 40, right: 132, bottom: 56, left: 104 }, endLabels: true };
// Drawn for a phone's width, so it fits without sideways scrolling and its
// 16-unit labels stay about 15px on screen.
const NARROW: Geometry = { W: 360, H: 270, PAD: { top: 18, right: 14, bottom: 50, left: 66 }, endLabels: false };

// Readout swatch colours, matching the chart's dots and inner band.
const OUTER_DOT = 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))';
const INNER_BAND = 'color-mix(in srgb, var(--color-deep-blue) 34%, transparent)';

/** Round gridline steps (1, 2, 2.5 or 5 times a power of ten), at most six, covering v. */
function niceScale(v: number): { top: number; step: number; count: number } {
  if (v <= 0) return { top: 6, step: 1, count: 6 };
  const raw = v / 6;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * exp).find((s) => s >= raw) ?? 10 * exp;
  const count = Math.max(1, Math.ceil(v / step - 1e-9));
  return { top: step * count, step, count };
}

/** Spreads end labels apart so none overlap, keeping their order. */
function spreadLabels(ys: number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(ys.length);
  let prev = -Infinity;
  for (const [y, i] of order) {
    const placed = Math.max(y, prev + gap, min);
    out[i] = placed;
    prev = placed;
  }
  // If the stack ran past the bottom, push it back up.
  const overflow = Math.max(0, Math.max(...out) - max);
  return out.map((y) => y - overflow);
}

function Chart({ result, state, code }: { result: SimulationResult; state: ToolState; code: string }) {
  const titleId = useId();
  const descId = useId();
  const gradId = useId();
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const { bands, straightLine, years } = result;
  const narrow = usePhone();
  const { W, H, PAD, endLabels: showEndLabels } = narrow ? NARROW : WIDE;
  const PLOT_W = W - PAD.left - PAD.right;
  const PLOT_H = H - PAD.top - PAD.bottom;

  // Scale to the middle half of every year, plus the full 8-in-10 band while
  // saving. During withdrawals the luckiest paths keep compounding and would
  // otherwise squash the saving years into the bottom of the chart; the part
  // of the band above the top is clipped and labelled.
  const saveEnd = Math.min(state.saveYears, years);
  const { top, step: yStep, count: yCount } = niceScale(
    Math.max(...bands.map((b) => b.p75), ...bands.slice(0, saveEnd + 1).map((b) => b.p90), ...straightLine),
  );
  const clipped = bands.some((b) => b.p90 > top);

  const x = (y: number) => PAD.left + (years === 0 ? 0 : (y / years) * PLOT_W);
  const yPx = (v: number) => PAD.top + (1 - Math.min(v, top) / top) * PLOT_H;
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

  const yTicks = Array.from({ length: yCount + 1 }, (_, t) => t * yStep);
  const yMinor = Array.from({ length: yCount }, (_, t) => (t + 0.5) * yStep);
  const xStep = years <= 10 ? 1 : years <= 30 ? 5 : 10;
  const xTicks: number[] = [];
  for (let y = 0; y <= years; y += xStep) xTicks.push(y);
  const xMinorStep = xStep === 1 ? 0 : xStep / 5 >= 1 ? xStep / 5 : 0;
  const xMinor: number[] = [];
  if (xMinorStep) for (let y = xMinorStep; y < years; y += xMinorStep) if (y % xStep !== 0) xMinor.push(y);

  const withdrawing = state.withdrawal > 0 && state.withdrawYears > 0;
  const end = bands[years];

  // End-of-line labels, read off directly instead of from the axis.
  // Rounded to a tenth of a unit so server and browser floating point agree
  // when the page hydrates.
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const endRaw = [end.p90, end.p50, end.p10].map((v) => r1(yPx(v)));
  const endY = spreadLabels(endRaw, 22, PAD.top + 8, H - PAD.bottom).map(r1);
  const endLabels = [
    { key: 'p90', label: 'High', value: end.p90, cls: 'mcs-endLabel--outer' },
    { key: 'p50', label: 'Median', value: end.p50, cls: 'mcs-endLabel--median' },
    { key: 'p10', label: 'Low', value: end.p10, cls: 'mcs-endLabel--outer' },
  ];

  const desc =
    `Fan chart of ${result.paths.toLocaleString('en-US')} simulated paths over ${years} years. ` +
    `At the end, the 10th percentile is ${formatAmount(end.p10, code)}, the median ${formatAmount(end.p50, code)}, ` +
    `and the 90th percentile ${formatAmount(end.p90, code)}. A single fixed-return line ends at ${formatAmount(straightLine[years], code)}.`;

  // Pointer and keyboard reading of a year's values.
  function yearAt(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || years === 0) return null;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * W;
    if (vx < PAD.left - 12 || vx > W - PAD.right + 12) return null;
    return Math.max(0, Math.min(years, Math.round(((vx - PAD.left) / PLOT_W) * years)));
  }
  function onKey(e: React.KeyboardEvent) {
    const cur = hover ?? (e.key === 'ArrowLeft' || e.key === 'End' ? years : 0);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = hover === null ? 0 : Math.min(years, cur + 1);
    else if (e.key === 'ArrowLeft') next = hover === null ? years : Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = years;
    else if (e.key === 'Escape') {
      setHover(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setHover(next);
    }
  }

  const h = hover !== null ? bands[hover] : null;
  const phase =
    hover === null || !withdrawing
      ? null
      : hover === 0
        ? 'Start'
        : hover <= state.saveYears
          ? 'Saving'
          : `Withdrawing, year ${hover - state.saveYears}`;
  const announce = h
    ? `Year ${hover}${phase ? `, ${phase.toLowerCase()}` : ''}. High ${formatAmount(h.p90, code)}, middle half ${formatAmount(h.p25, code)} to ${formatAmount(h.p75, code)}, median ${formatAmount(h.p50, code)}, low ${formatAmount(h.p10, code)}, single line ${formatAmount(straightLine[hover!], code)}.`
    : '';

  useEscapeToClose(hover !== null, useCallback(() => setHover(null), []));
  // Beside the crosshair, kept inside the plotted area so it never covers the
  // end labels (phones stack it below the chart).
  const cardLeft = useReadoutPlacement(figureRef, svgRef, cardRef, hover === null ? null : x(hover) / W, (W - PAD.right) / W);

  return (
    <figure
      className="mcs-figure"
      ref={figureRef}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }}
    >
      {!narrow && <p className="mcs-swipe" aria-hidden="true">Swipe to see the whole chart &rarr;</p>}
      <div className="mcs-chartScroll">
        <div
          className="mcs-chartBox"
          tabIndex={0}
          role="group"
          aria-label="Chart. Use the left and right arrow keys to read the values for each year."
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
            className={narrow ? 'mcs-chart mcs-chart--narrow' : 'mcs-chart'}
            onPointerMove={(e) => setHover(yearAt(e.clientX))}
            onPointerDown={(e) => setHover(yearAt(e.clientX))}
          >
            <title id={titleId}>Spread of simulated outcomes</title>
            <desc id={descId}>{desc}</desc>
            <defs>
              <linearGradient id={`${gradId}-outer`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="mcs-stop mcs-stop--outerTop" />
                <stop offset="100%" className="mcs-stop mcs-stop--outerBottom" />
              </linearGradient>
              <linearGradient id={`${gradId}-inner`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="mcs-stop mcs-stop--innerTop" />
                <stop offset="100%" className="mcs-stop mcs-stop--innerBottom" />
              </linearGradient>
              <filter id={`${gradId}-glow`} x="-5%" y="-20%" width="110%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <clipPath id={clipId}>
                <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
              </clipPath>
            </defs>

            <rect className="mcs-plotBg" x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} rx="6" />
            {withdrawing && state.saveYears < years && (
              <g>
                <rect className="mcs-phase" x={x(state.saveYears)} y={PAD.top} width={x(years) - x(state.saveYears)} height={PLOT_H} />
                {/* Only when there is room; the readout names the phase too. */}
                {x(years) - x(state.saveYears) >= 130 && (
                  <text className="mcs-phaseLabel" x={x(state.saveYears) + 10} y={PAD.top + 22}>Living off it</text>
                )}
              </g>
            )}

            {yMinor.map((t) => (
              <line key={`ym${t}`} className="mcs-gridMinor" x1={PAD.left} x2={W - PAD.right} y1={yPx(t)} y2={yPx(t)} />
            ))}
            {xMinor.map((t) => (
              <line key={`xm${t}`} className="mcs-gridMinor" x1={x(t)} x2={x(t)} y1={PAD.top} y2={H - PAD.bottom} />
            ))}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line className={t === 0 ? 'mcs-axisLine' : 'mcs-grid'} x1={PAD.left} x2={W - PAD.right} y1={yPx(t)} y2={yPx(t)} />
                <text className="mcs-axis" x={PAD.left - 12} y={yPx(t) + 5} textAnchor="end">{formatAmount(t, code, true)}</text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                {t > 0 && <line className="mcs-grid" x1={x(t)} x2={x(t)} y1={PAD.top} y2={H - PAD.bottom} />}
                <text className="mcs-axis" x={x(t)} y={H - PAD.bottom + 24} textAnchor="middle">{t}</text>
              </g>
            ))}
            <text className="mcs-axis mcs-axisTitle" x={PAD.left + PLOT_W / 2} y={H - 8} textAnchor="middle">Years from today</text>

            <g clipPath={`url(#${clipId})`}>
              <path d={area(p10, p90)} fill={`url(#${gradId}-outer)`} />
              <path d={area(p25, p75)} fill={`url(#${gradId}-inner)`} />
              {/* Band edges, so each band stays distinguishable where the fills are faint. */}
              <path className="mcs-edge mcs-edge--outer" d={line(p90)} />
              <path className="mcs-edge mcs-edge--outer" d={line(p10)} />
              <path className="mcs-edge mcs-edge--inner" d={line(p75)} />
              <path className="mcs-edge mcs-edge--inner" d={line(p25)} />
              <path className="mcs-straight" d={line(straightLine)} />
              <path className="mcs-medianGlow" d={line(p50)} filter={`url(#${gradId}-glow)`} />
              <path className="mcs-median" d={line(p50)} />
            </g>

            {endLabels.map((l, i) => (
              <g key={l.key} className={`mcs-endLabel ${l.cls}`}>
                {/* A leader line when the label had to move away from its point. */}
                {showEndLabels && Math.abs(endY[i] - endRaw[i]) > 4 && (
                  <line className="mcs-leader" x1={x(years) + 5} y1={endRaw[i]} x2={W - PAD.right + 8} y2={endY[i] - 7} />
                )}
                {(showEndLabels || l.value <= top) && <circle cx={x(years)} cy={endRaw[i]} r="4" />}
                {showEndLabels && (
                  <text x={W - PAD.right + 12} y={endY[i] - 2}>
                    <tspan className="mcs-endName">{l.label}{l.value > top ? ' ↑' : ''}</tspan>
                    <tspan x={W - PAD.right + 12} dy="17" className="mcs-endValue">{formatAmount(l.value, code, true)}</tspan>
                  </text>
                )}
              </g>
            ))}

            {h && hover !== null && (
              <g className="mcs-hover" pointerEvents="none">
                <line className="mcs-hoverLine" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
                {/* A value above the top of the chart gets no dot: drawn at the
                    edge it would mark the wrong value. The readout still lists it. */}
                {h.p90 <= top && <circle className="mcs-hoverDot mcs-hoverDot--outer" cx={x(hover)} cy={yPx(h.p90)} r="5" />}
                <circle className="mcs-hoverDot mcs-hoverDot--outer" cx={x(hover)} cy={yPx(h.p10)} r="5" />
                {straightLine[hover] <= top && <circle className="mcs-hoverDot mcs-hoverDot--straight" cx={x(hover)} cy={yPx(straightLine[hover])} r="5" />}
                {h.p50 <= top && <circle className="mcs-hoverDot mcs-hoverDot--median" cx={x(hover)} cy={yPx(h.p50)} r="6" />}
              </g>
            )}
          </svg>

          <span className="mcs-srOnly" aria-live="polite">{announce}</span>
        </div>
      </div>
      {/* Outside the sideways-scrolling box: on phones it sits under the chart
          at full width (see global.css), on wider screens it floats beside
          the crosshair. */}
      {h && hover !== null && (
        <ChartReadout
          title={`Year ${hover}`}
          tag={phase}
          cardRef={cardRef}
          position={cardLeft}
          rows={[
            // Swatches match the dots on the chart: band-edge dots for high
            // and low, the median dot, the single-line dot, and the inner band.
            { label: 'High (90th)', value: formatAmount(h.p90, code), swatch: 'dot', color: OUTER_DOT },
            { label: 'Middle half', value: `${formatAmount(h.p25, code)} to ${formatAmount(h.p75, code)}`, swatch: 'band', color: INNER_BAND },
            { label: 'Median', value: formatAmount(h.p50, code), swatch: 'dot', color: 'var(--color-deep-blue)', strong: true },
            { label: 'Low (10th)', value: formatAmount(h.p10, code), swatch: 'dot', color: OUTER_DOT },
            { label: 'Single line', value: formatAmount(straightLine[hover], code), swatch: 'dot', color: 'var(--color-teal)' },
          ]}
        />
      )}
      <figcaption className="mcs-legend">
        <span><i className="mcs-key mcs-key--outer" aria-hidden="true" />8 in 10 paths</span>
        <span><i className="mcs-key mcs-key--inner" aria-hidden="true" />Middle half</span>
        <span><i className="mcs-key mcs-key--median" aria-hidden="true" />Median balance</span>
        <span><i className="mcs-key mcs-key--straight" aria-hidden="true" />Single fixed-return line</span>
        <span className="mcs-legendHint">
          Point at the chart, tap it, or use the arrow keys to read any year.
          {clipped &&
            (showEndLabels
              ? ' The lightest band runs above the top of the chart; the High label on the right shows where it ends.'
              : ' The lightest band runs above the top of the chart; tap any year to read its high value.')}
        </span>
      </figcaption>
    </figure>
  );
}
