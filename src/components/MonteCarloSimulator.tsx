import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ChartReadout, useEscapeToClose, useReadoutPlacement } from './chart/ChartReadout.tsx';
import { CURRENCIES } from '../utils/loan/math.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { arrivedByLanguageSwitch, publishToolState } from '../utils/shared/toolState.ts';
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
import { format } from '../i18n/format.ts';
import type { Dict } from '../i18n/strings/types.ts';

// ---------------------------------------------------------------------------
// Copy
//
// Every word this island draws comes in through `strings`, one locale's slice
// of the catalog that `MonteCarloPage.astro` puts together. Not `dict(locale)`:
// that reads a runtime-indexed table holding every language and every tool, so
// nothing tree-shakes and the client chunk would carry the whole catalog to
// render one calculator. The type is a compile-time-only import (erased, no
// module loaded); `format` is a few lines and fills the `{placeholders}`.
//
// A figure is never typed into a string: the sentences carry `{paths}`,
// `{stocksMean}` and the rest, and the values come from the constants in
// `../utils/monte-carlo/math.ts`, so the prose and the model cannot drift
// apart. Amounts stay the currency's own business (formatAmount); path counts
// keep the fixed grouping the rest of the site uses.
// ---------------------------------------------------------------------------

type Strings = Dict['tools']['monteCarlo']['island'];

/** Shorthand, as on the pages: a catalog template is filled with `t(...)`. */
const t = format;

/** PostHog telemetry: interaction metadata only, never the values typed. */
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

const grouped = (n: number) => n.toLocaleString('en-US');

/** "9 in 10" style phrasing, rounded to the nearest tenth. */
function inTen(share: number, strings: Strings): string {
  return t(strings.inTen, { n: Math.round(share * 10) });
}

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

export default function MonteCarloSimulator({ strings, netWorthHref }: { strings: Strings; netWorthHref: string }) {
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
  // Nothing is published until the shared plan has been read, so the publish
  // below cannot overwrite it with the defaults first.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const shared = typeof raw === 'string' ? decodeState(raw) : null;
    setHydrated(true);
    if (!shared) return;
    setForm(toForm(shared));
    setSettled(shared);
    // A language switch carries the plan too, but that view was already
    // counted on the page it came from.
    if (arrivedByLanguageSwitch()) return;
    track('free_monte_carlo_shared_view_opened', {
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, []);

  // Keeps what is on screen where the header's language switch can carry it,
  // after the # and only at click time (see src/utils/shared/toolState.ts).
  // Never the address: nothing here writes to it.
  // The settled plan, the one the results show, the same one a share link
  // would carry.
  useEffect(() => {
    if (!hydrated) return;
    publishToolState(SHARED_STATE_GLOBAL, encodeState(settled));
  }, [hydrated, settled]);

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
    const timer = window.setTimeout(() => setSettled(toState(form)), 250);
    return () => window.clearTimeout(timer);
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
      () => window.prompt(strings.actions.copyPrompt, url),
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
      <form className="mcs-form" onSubmit={(e) => e.preventDefault()} aria-label={strings.formLabel}>
        <div className="mcs-grid">
          <div className="mcs-field">
            <label className="mcs-label" htmlFor={ids.currency}>{strings.fields.currency}</label>
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
                <option key={c.code} value={c.code}>{c.code}: {strings.currencies[c.code] ?? c.label}</option>
              ))}
            </select>
          </div>
          <NumberField id={ids.start} label={strings.fields.start} value={form.start} onChange={update('start')} invalid={errors.start} hint={strings.fields.startHint} />
          <NumberField id={ids.monthly} label={strings.fields.monthly} value={form.monthly} onChange={update('monthly')} invalid={errors.monthly} />
          <NumberField id={ids.saveYears} label={strings.fields.saveYears} value={form.saveYears} onChange={update('saveYears')} invalid={errors.saveYears} max={60} hint={strings.fields.saveYearsHint} />
        </div>
        <p className="mcs-hint mcs-crossLink">
          {strings.fields.crossLink.before}
          <a href={netWorthHref} data-attr="free-monte-carlo-net-worth-link">{strings.fields.crossLink.link}</a>
          {strings.fields.crossLink.after}
        </p>

        <div className="mcs-field mcs-mix">
          <label className="mcs-label" htmlFor={ids.stockPct}>
            {strings.fields.mixBefore}
            <strong>{t(strings.fields.mixStocks, { pct: errors.stockPct ? '?' : form.stockPct })}</strong>
            {strings.fields.mixMiddle}
            {t(strings.fields.mixBonds, { pct: errors.stockPct ? '?' : 100 - Number(form.stockPct) })}
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
          <span className="mcs-hint">{strings.fields.mixHint}</span>
        </div>

        <QuickResult result={result} state={shownState} busy={pending} strings={strings} />

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
            <span className="mcs-settingsName">{strings.settings.toggle}</span>
          </button>
          <p className="mcs-settingsValue">
            {t(strings.settings.summary, {
              returns: strings.returns[form.returns],
              fees: errors.feePct ? '?' : form.feePct,
              paths: grouped(form.paths),
            })}
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
            <legend className="mcs-label">{strings.settings.legend}</legend>
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
                  <span>{strings.returns[s]}</span>
                  <span className="mcs-tip" role="tooltip" id={`${ids.returns}-${s}`}>{strings.returnTips[s]}</span>
                </label>
              ))}
            </div>
            {/* The chosen setting's description, visible for touch screens
                where there is no hover. Screen readers get it from the
                tooltip through aria-describedby, so it is hidden from them. */}
            <span className="mcs-hint" aria-hidden="true">{strings.returnTips[form.returns]}</span>
          </fieldset>
          <NumberField
            id={ids.feePct}
            label={strings.settings.feeLabel}
            value={form.feePct}
            onChange={update('feePct')}
            invalid={errors.feePct}
            max={MAX_FEE_PCT}
            hint={t(strings.settings.feeHint, { maxFeePct: MAX_FEE_PCT })}
          />
          <div className="mcs-field">
            <label className="mcs-label" htmlFor={ids.paths}>{strings.settings.pathsLabel}</label>
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
                <option key={n} value={n}>{grouped(n)}</option>
              ))}
            </select>
            <span className="mcs-hint" id={`${ids.paths}-hint`}>{strings.settings.pathsHint}</span>
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
              {strings.withdraw.toggle}
            </label>
          </legend>
          {!form.withdrawOn && (
            <span className="mcs-hint">{strings.withdraw.off}</span>
          )}
          {form.withdrawOn && (
            <div className="mcs-grid mcs-grid--two">
              <NumberField id={ids.withdrawal} label={strings.withdraw.amountLabel} value={form.withdrawal} onChange={update('withdrawal')} invalid={errors.withdrawal} hint={strings.withdraw.amountHint} />
              <NumberField id={ids.withdrawYears} label={strings.withdraw.yearsLabel} value={form.withdrawYears} onChange={update('withdrawYears')} invalid={errors.withdrawYears} max={60} hint={strings.withdraw.yearsHint} />
            </div>
          )}
        </fieldset>

        <div className="mcs-actions">
          <button type="button" className="mcs-btn" onClick={copyShareLink} disabled={hasErrors || pending} data-attr="free-monte-carlo-share">
            {copied ? strings.actions.copied : strings.actions.copy}
          </button>
          <button type="button" className="mcs-btn mcs-btn--ghost" onClick={reset} data-attr="free-monte-carlo-reset">
            {strings.actions.reset}
          </button>
          <span className="mcs-hint" role="status" aria-live="polite">
            {hasErrors
              ? strings.actions.fix
              : running
                ? t(strings.actions.running, { paths: grouped(settled.paths) })
                : ''}
          </span>
        </div>
      </form>

      <Results result={result} state={shownState} code={shownState.currency} busy={running} strings={strings} />
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
function QuickResult({ result, state, busy, strings }: { result: SimulationResult; state: ToolState; busy: boolean; strings: Strings }) {
  const code = state.currency;
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const lasted = state.withdrawal > 0 ? result.lasted : null;
  if (!saving && lasted === null) return null;
  return (
    <div className={`mcs-quick${busy ? ' mcs-quick--busy' : ''}`} aria-hidden="true">
      {saving && (
        <>
          <span className="mcs-quickTitle">
            {state.saveYears === 1
              ? strings.quick.medianOne
              : t(strings.quick.medianOther, { years: state.saveYears })}
          </span>
          <span className="mcs-quickValue">{formatAmount(r.p50, code)}</span>
          <span className="mcs-quickRange">
            {t(strings.quick.range, { low: formatAmount(r.p10, code, true), high: formatAmount(r.p90, code, true) })}
          </span>
        </>
      )}
      {lasted !== null && (
        <span className="mcs-quickRange">
          {t(strings.quick.lasted, { years: state.withdrawYears, inTen: inTen(lasted, strings) })}
        </span>
      )}
    </div>
  );
}

function Results({ result, state, code, busy, strings }: { result: SimulationResult; state: ToolState; code: string; busy: boolean; strings: Strings }) {
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const withdrawing = state.withdrawal > 0;
  const tableId = useId();

  return (
    <section className={`mcs-results${busy ? ' mcs-results--busy' : ''}`} aria-labelledby="mcs-results-h" aria-busy={busy}>
      <h2 id="mcs-results-h" className="mcs-resultsTitle">
        {saving
          ? state.saveYears === 1
            ? strings.results.headingOne
            : t(strings.results.headingOther, { years: state.saveYears })
          : strings.results.headingToday}
      </h2>

      {saving && (
        <>
          <div className="mcs-cards">
            {/* Phones show the short name only, in three columns, and the
                explanations once below the cards (mcs-cardsKey). */}
            <div className="mcs-card">
              <span className="mcs-cardLabel">{strings.results.lowLabel}<span className="mcs-cardMore">{strings.results.lowMore}</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p10, code)}</span>
            </div>
            <div className="mcs-card mcs-card--mid">
              <span className="mcs-cardLabel">{strings.results.medianLabel}<span className="mcs-cardMore">{strings.results.medianMore}</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p50, code)}</span>
            </div>
            <div className="mcs-card">
              <span className="mcs-cardLabel">{strings.results.highLabel}<span className="mcs-cardMore">{strings.results.highMore}</span></span>
              <span className="mcs-cardValue">{formatAmount(r.p90, code)}</span>
            </div>
          </div>
          <p className="mcs-cardsKey">
            {strings.results.cardsKey}
          </p>
          <p className="mcs-note">
            {strings.results.noteBefore}{' '}
            <strong>{formatAmount(result.straightLine[state.saveYears], code)}</strong>
            {t(strings.results.noteAfter, { share: formatShare(result.belowStraightLine) })}
          </p>
        </>
      )}

      {!saving && !withdrawing && (
        <p className="mcs-note">{strings.results.empty}</p>
      )}

      {withdrawing && result.lasted !== null && (
        <div className="mcs-lasted">
          <p className="mcs-lastedHead">
            {t(strings.results.lastedHeadBefore, {
              amount: formatAmount(state.withdrawal, code),
              years: state.withdrawYears,
            })}{' '}
            <strong>{inTen(result.lasted, strings)}</strong>
            {t(strings.results.lastedHeadAfter, { share: formatShare(result.lasted) })}
          </p>
          {result.medianRunOutYear !== null && (
            <p className="mcs-note">
              {t(strings.results.runOut, { year: result.medianRunOutYear, years: state.withdrawYears })}
            </p>
          )}
        </div>
      )}

      <p className="mcs-caveat">
        {t(strings.results.caveat, { paths: grouped(result.paths) })}
        {result.paths < 10_000 && t(strings.results.caveatFew, { paths: grouped(result.paths) })}
      </p>

      {result.years > 0 && <Chart result={result} state={state} code={code} strings={strings} />}

      {result.years > 0 && <details className="mcs-tableWrap" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('free_monte_carlo_table_opened'); }}>
        <summary className="mcs-tableSummary">{strings.results.tableSummary}</summary>
        <div className="mcs-tableScroll">
          <table className="mcs-table" aria-describedby={tableId}>
            <caption id={tableId}>{strings.results.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{strings.results.tableYear}</th>
                <th scope="col">{strings.results.tableLow}</th>
                <th scope="col">{strings.results.tableMedian}</th>
                <th scope="col">{strings.results.tableHigh}</th>
                <th scope="col">{strings.results.tableStraight}</th>
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

function Chart({ result, state, code, strings }: { result: SimulationResult; state: ToolState; code: string; strings: Strings }) {
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

  const yTicks = Array.from({ length: yCount + 1 }, (_, i) => i * yStep);
  const yMinor = Array.from({ length: yCount }, (_, i) => (i + 0.5) * yStep);
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
    { key: 'p90', label: strings.chart.endHigh, value: end.p90, cls: 'mcs-endLabel--outer' },
    { key: 'p50', label: strings.chart.endMedian, value: end.p50, cls: 'mcs-endLabel--median' },
    { key: 'p10', label: strings.chart.endLow, value: end.p10, cls: 'mcs-endLabel--outer' },
  ];

  const desc = t(strings.chart.desc, {
    paths: grouped(result.paths),
    years,
    low: formatAmount(end.p10, code),
    median: formatAmount(end.p50, code),
    high: formatAmount(end.p90, code),
    straight: formatAmount(straightLine[years], code),
  });

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
        ? strings.chart.phaseStart
        : hover <= state.saveYears
          ? strings.chart.phaseSaving
          : t(strings.chart.phaseWithdrawing, { year: hover - state.saveYears });
  const announce = h && hover !== null
    ? t(strings.chart.announce, {
        year: hover,
        phase: phase ? `, ${phase.toLowerCase()}` : '',
        high: formatAmount(h.p90, code),
        middleLow: formatAmount(h.p25, code),
        middleHigh: formatAmount(h.p75, code),
        median: formatAmount(h.p50, code),
        low: formatAmount(h.p10, code),
        straight: formatAmount(straightLine[hover], code),
      })
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
      {!narrow && <p className="mcs-swipe" aria-hidden="true">{strings.chart.swipe}</p>}
      <div className="mcs-chartScroll">
        <div
          className="mcs-chartBox"
          tabIndex={0}
          role="group"
          aria-label={strings.chart.groupLabel}
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
            <title id={titleId}>{strings.chart.title}</title>
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
                  <text className="mcs-phaseLabel" x={x(state.saveYears) + 10} y={PAD.top + 22}>{strings.chart.livingOff}</text>
                )}
              </g>
            )}

            {yMinor.map((v) => (
              <line key={`ym${v}`} className="mcs-gridMinor" x1={PAD.left} x2={W - PAD.right} y1={yPx(v)} y2={yPx(v)} />
            ))}
            {xMinor.map((v) => (
              <line key={`xm${v}`} className="mcs-gridMinor" x1={x(v)} x2={x(v)} y1={PAD.top} y2={H - PAD.bottom} />
            ))}
            {yTicks.map((v) => (
              <g key={`y${v}`}>
                <line className={v === 0 ? 'mcs-axisLine' : 'mcs-grid'} x1={PAD.left} x2={W - PAD.right} y1={yPx(v)} y2={yPx(v)} />
                <text className="mcs-axis" x={PAD.left - 12} y={yPx(v) + 5} textAnchor="end">{formatAmount(v, code, true)}</text>
              </g>
            ))}
            {xTicks.map((v) => (
              <g key={`x${v}`}>
                {v > 0 && <line className="mcs-grid" x1={x(v)} x2={x(v)} y1={PAD.top} y2={H - PAD.bottom} />}
                <text className="mcs-axis" x={x(v)} y={H - PAD.bottom + 24} textAnchor="middle">{v}</text>
              </g>
            ))}
            <text className="mcs-axis mcs-axisTitle" x={PAD.left + PLOT_W / 2} y={H - 8} textAnchor="middle">{strings.chart.axisYears}</text>

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
          title={t(strings.chart.readoutYear, { year: hover })}
          tag={phase}
          cardRef={cardRef}
          position={cardLeft}
          rows={[
            // Swatches match the dots on the chart: band-edge dots for high
            // and low, the median dot, the single-line dot, and the inner band.
            { label: strings.chart.readoutHigh, value: formatAmount(h.p90, code), swatch: 'dot', color: OUTER_DOT },
            { label: strings.chart.readoutMiddle, value: t(strings.chart.readoutMiddleRange, { low: formatAmount(h.p25, code), high: formatAmount(h.p75, code) }), swatch: 'band', color: INNER_BAND },
            { label: strings.chart.readoutMedian, value: formatAmount(h.p50, code), swatch: 'dot', color: 'var(--color-deep-blue)', strong: true },
            { label: strings.chart.readoutLow, value: formatAmount(h.p10, code), swatch: 'dot', color: OUTER_DOT },
            { label: strings.chart.readoutStraight, value: formatAmount(straightLine[hover], code), swatch: 'dot', color: 'var(--color-teal)' },
          ]}
        />
      )}
      <figcaption className="mcs-legend">
        <span><i className="mcs-key mcs-key--outer" aria-hidden="true" />{strings.chart.legendPaths}</span>
        <span><i className="mcs-key mcs-key--inner" aria-hidden="true" />{strings.chart.legendMiddle}</span>
        <span><i className="mcs-key mcs-key--median" aria-hidden="true" />{strings.chart.legendMedian}</span>
        <span><i className="mcs-key mcs-key--straight" aria-hidden="true" />{strings.chart.legendStraight}</span>
        <span className="mcs-legendHint">
          {strings.chart.legendHint}
          {clipped &&
            (showEndLabels
              ? strings.chart.clippedLabels
              : strings.chart.clippedPhone)}
        </span>
      </figcaption>
    </figure>
  );
}
