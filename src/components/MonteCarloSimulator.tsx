import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LocaleNumberInput, NumberLocaleContext } from './LocaleNumberInput.tsx';
import { ChartReadout, ReadoutSlot, useChartPointer, useEscapeToClose, useReadoutPlacement, useReadoutSlot } from './chart/ChartReadout.tsx';
import { CURRENCIES } from '../utils/loan/math.ts';
import { AmountLocaleContext, useMoney } from './useMoney.ts';
import { longestAmount } from '../utils/shared/amountUnits.ts';
import { Amount, Amounts } from './Amounts.tsx';
import { ChartUnit, ChartWordsContext, useAxisMargin, useChartAmounts } from './ChartAmounts.tsx';
import { FIT_FLOOR, edgeAnchor, labelStep, niceSteps, textWidth, useChartRem, wrapWords } from './chart/useChartRem.ts';
import { MeasureSamples, useMeasuredText } from './chart/MeasuredText.tsx';
import { plural } from '../i18n/plural.ts';
import { arrivedByLanguageSwitch, publishToolState } from '../utils/shared/toolState.ts';
import {
  MAX_FEE_PCT,
  MAX_MONTHLY,
  MAX_START,
  MAX_WITHDRAWAL,
  roundedResult,
  QUOTED_RATES,
  RETURN_SETTINGS,
  RUN_OPTIONS,
  simulate,
  type ReturnSetting,
  type SimulationResult,
} from '../utils/monte-carlo/math.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, defaultState, isPristineState, type ToolState } from '../utils/monte-carlo/url.ts';
import { formErrors, formFromLink, openedPlan, publishableForm, toForm, toState, type FormState } from '../utils/monte-carlo/form.ts';
import { tooLongForLink } from '../utils/monte-carlo/inputs.ts';
import type { WorkerReply, WorkerRequest } from '../utils/monte-carlo/worker.ts';
import { format } from '../i18n/format.ts';
import { SwapLabel, ToolExport, ToolReport } from './ToolExport.tsx';
import { downloadWorkbook, isoDate, printResults } from '../utils/shared/exportFile.ts';
import { monteCarloSheets } from '../utils/monte-carlo/export.ts';
import { monteCarloReport } from '../utils/monte-carlo/report.ts';
import type { Dict } from '../i18n/strings/types.ts';
import { ErrorLeadContext, ErrorText, heldUntilReady, ResultAnnouncement, UnreadableContext, useToolReady, useResultGate, Withheld, WITHHELD_SAID_AFTER } from './toolShared.tsx';

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
// keep the fixed grouping the rest of the site uses. A page with its own amount
// style (`TOOL_AMOUNT_LOCALE`, Spanish) writes all three its way, since
// "10,000 paths" reads as ten to a Spanish reader.
// ---------------------------------------------------------------------------

type Strings = Dict['tools']['monteCarlo']['island'];
type ExportStrings = Dict['tools']['export'];

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

/**
 * A share of the paths as a percentage. Whole percents, except at the two
 * ends: 100% and 0% are kept for every path and no path, so 9,954 paths in
 * 10,000 read 99.5%, not 100%.
 */
function formatShare(share: number, amountLocale: string | null): string {
  const whole = Math.round(share * 100);
  const edge = share > 0 && share < 1 && (whole === 0 || whole === 100);
  const shown = edge ? Math.min(0.999, Math.max(0.001, share)) : share;
  const digits = edge ? 1 : 0;
  if (!amountLocale) return `${(shown * 100).toFixed(digits)}%`;
  return new Intl.NumberFormat(amountLocale, { style: 'percent', maximumFractionDigits: digits }).format(shown);
}

/** A count or a limit in the page's own number style ("1,00,000" on a Hindi page), as the other tools write theirs. */
const grouped = (n: number, numberLocale: string) => n.toLocaleString(numberLocale);

/** A return setting's description, with the rates it quotes filled in from the model. */
function returnTip(strings: Strings, s: ReturnSetting, amountLocale: string | null): string {
  const pct = (r: number) =>
    amountLocale
      ? new Intl.NumberFormat(amountLocale, { style: 'percent', maximumFractionDigits: 1 }).format(r)
      : `${(r * 100).toFixed(1).replace(/\.0$/, '')}%`;
  return format(strings.returnTips[s], { stocks: pct(QUOTED_RATES[s].stocks), bonds: pct(QUOTED_RATES[s].bonds) });
}

/**
 * "9 in 10" style phrasing, rounded to the nearest tenth, for a share that is
 * neither every path nor none. Rounding never claims more than happened: 95%
 * to just under 100% reads "more than 9 in 10", and above 0% to under 5%
 * "fewer than 1 in 10". Every path and no path have sentences of their own.
 */
function inTen(share: number, strings: Strings): string {
  if (share >= 0.95) return strings.inTenMore;
  if (share < 0.05) return strings.inTenFewer;
  return t(strings.inTen, { n: Math.round(share * 10) });
}

/** The one-line answer about withdrawals, as the quick answer and the files say it. */
function lastedLine(share: number, years: number, strings: Strings, amountLocale: string | null): string {
  // One year has sentences of its own: "all 1 years" is wrong in most languages.
  const pick = (one: string, other: string) => plural(amountLocale ?? 'en', years, one, other, other);
  if (share >= 1) return t(pick(strings.quick.lastedAllOne, strings.quick.lastedAll), { years });
  if (share <= 0) return t(pick(strings.quick.lastedNoneOne, strings.quick.lastedNone), { years });
  return t(pick(strings.quick.lastedOne, strings.quick.lasted), { years, inTen: inTen(share, strings) });
}

// Above this many paths the simulation runs in a worker, off the main thread.
const WORKER_THRESHOLD = 10_000;

// ---------------------------------------------------------------------------
// Phones (the site's 640px breakpoint). The server and the first browser
// render assume a wider screen, so the page hydrates cleanly; phones then
// switch to the compact chart. Nothing is stored.
// ---------------------------------------------------------------------------

const PHONE_QUERY = '(width < 640px)';

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
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

function useSimulation(state: ToolState, initialResult: SimulationResult): Shown & { busy: boolean } {
  const [shown, setShown] = useState<Shown>(() => ({ result: initialResult, state }));
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);

  useEffect(() => () => worker.current?.terminate(), []);

  // The first result comes worked out by the page, so the effect has
  // nothing to do until the plan changes.
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
        w.terminate();
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

/**
 * `defaultCurrency` is the page's starting currency (TOOL_DEFAULT_CURRENCY in
 * src/utils/shared/toolState.ts, chosen by the page component for its
 * language). It applies only when no shared plan arrived, and after a reset;
 * a shared plan decodes the same on every page (no `c` means EUR).
 */
export default function MonteCarloSimulator({
  strings,
  exportStrings,
  netWorthHref,
  defaultCurrency,
  amountLocale,
  numberLocale,
  initialResult,
}: {
  strings: Strings;
  exportStrings: ExportStrings;
  netWorthHref: string;
  defaultCurrency: string;
  /** How the page writes amounts (`TOOL_AMOUNT_LOCALE`), or null for each currency's own style. */
  amountLocale: string | null;
  /** The page's number style for typed numbers and counts (PROSE_NUMBER_LOCALE). */
  numberLocale: string;
  /**
   * The starting plan's result, `simulate(defaultState(defaultCurrency))`,
   * worked out once by the page. The server draws it and the browser
   * hydrates with it, so the browser never runs the starting plan itself:
   * a shared plan replaces it as soon as it is read.
   */
  initialResult: SimulationResult;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(defaultState(defaultCurrency)));
  const [settled, setSettled] = useState<ToolState>(() => defaultState(defaultCurrency));
  // The form `settled` was worked out from.
  const [settledForm, setSettledForm] = useState(form);
  const [copied, setCopied] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(false);
  // Fees and paths start folded behind one row that says what they are set
  // to. View state only: never shared, stored or tracked.
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
    // The boxes as the link has them, bad ones included; the plan behind them stays finite.
    const opened = formFromLink(raw as string) ?? toForm(shared);
    setForm(opened);
    setSettled(openedPlan(opened, shared));
    setSettledForm(opened);
    // A shared plan that sets a fee or a path count, or a fee box that is
    // wrong, shows it without a click.
    if (formErrors(opened).feePct || shared.feePct !== DEFAULTS.feePct || shared.paths !== DEFAULTS.paths) setSettingsOpen(true);
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
  // The form as it stands, not the settled plan: a bad box must arrive bad,
  // and a choice made while one is bad must not be lost (#789).
  useEffect(() => {
    if (!hydrated) return;
    // Untouched publishes '' so the other language opens with its own
    // starting currency; anything changed carries as encoded.
    publishToolState(SHARED_STATE_GLOBAL, publishableForm(form, defaultCurrency));
  }, [hydrated, form, defaultCurrency]);

  const errors = formErrors(form);
  const hasErrors = Object.values(errors).some(Boolean);

  // Simulate a moment after typing stops, and only on valid input, so the
  // chart does not jump around on every keystroke. A form already settled
  // (the starting plan, a shared one as it opens, a reset) is not run again.
  useEffect(() => {
    if (hasErrors || form === settledForm) return;
    const timer = window.setTimeout(() => {
      setSettled(toState(form));
      setSettledForm(form);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form, settledForm, hasErrors]);

  const { result, state: shownState, busy: running } = useSimulation(settled, initialResult);
  // What the page says in words: amounts rounded to what the runs can tell
  // apart. The chart's shapes and the spreadsheets use `result` itself.
  const worded = useMemo(() => roundedResult(result), [result]);
  // Pending from the moment a new plan settles until its result is on screen.
  const pending = running || settled !== shownState;
  // Waiting from the keystroke, so Copy can never share a plan not shown yet.
  const { withheld, waiting } = useResultGate(hasErrors, form === settledForm && !pending);

  // A number box hands over a plain number string, whatever the page's language wrote.
  const setField = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Shares the form as it stands, once the results show it.
  function copyShareLink() {
    if (waiting) return;
    // publishableForm, not encodeState: an all-default plan in euros encodes
    // to '' and would reopen in rupees on a Hindi link, so it says c=EUR.
    const state = publishableForm(form, defaultCurrency);
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

  // Both copies are of the plan the results show, never a half-typed one, and
  // the event says only which kind was made.
  function downloadSpreadsheet() {
    const sheets = monteCarloSheets({
      island: strings,
      common: exportStrings,
      state: shownState,
      result,
      date: isoDate(),
      page: `${window.location.origin}${window.location.pathname}`,
    });
    downloadWorkbook(sheets, 'monte-carlo');
    track('free_monte_carlo_exported', { format: 'xlsx' });
  }

  function printPage() {
    track('free_monte_carlo_exported', { format: 'pdf' });
    printResults();
  }


  function reset() {
    const start = defaultState(defaultCurrency);
    const blank = toForm(start);
    setForm(blank);
    setSettled(start);
    setSettledForm(blank);
    setSettingsOpen(false);
    track('free_monte_carlo_reset');
  }

  // The starting figures are an example until one of them is changed.
  const pristine = !hasErrors && isPristineState(toState(form), defaultCurrency);

  const toolReady = useToolReady();
  return (
    <AmountLocaleContext.Provider value={amountLocale}>
    <ChartWordsContext.Provider value={exportStrings.chart}>
    <NumberLocaleContext.Provider value={numberLocale}>
    <ErrorLeadContext.Provider value={exportStrings.fieldError}>
    <UnreadableContext.Provider value={exportStrings.fieldUnreadable}>
    <div className="mcs-root" {...heldUntilReady(toolReady)}>
      <form className="mcs-form" onSubmit={(e) => e.preventDefault()} aria-label={strings.formLabel}>
        {/* The example line and Reset share the first row, as in the other tools. */}
        <div className="ifc-formHead">
          <p className="ifc-example">{pristine ? strings.example : ''}</p>
          <button type="button" className="btn btn--quiet ifc-reset" onClick={reset} data-attr="free-monte-carlo-reset">
            {strings.actions.reset}
          </button>
        </div>
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
                <option key={c.code} value={c.code}>{strings.currencies[c.code] ?? c.label}</option>
              ))}
            </select>
          </div>
          <NumberField id={ids.start} label={strings.fields.start} value={form.start} onChange={setField('start')} invalid={errors.start} error={t(strings.fields.amountError, { min: grouped(0, numberLocale), max: grouped(MAX_START, numberLocale) })} hint={strings.fields.startHint} />
          <NumberField id={ids.monthly} label={strings.fields.monthly} value={form.monthly} onChange={setField('monthly')} invalid={errors.monthly} error={t(strings.fields.amountError, { min: grouped(0, numberLocale), max: grouped(MAX_MONTHLY, numberLocale) })} />
          <NumberField id={ids.saveYears} label={strings.fields.saveYears} step="1" value={form.saveYears} onChange={setField('saveYears')} invalid={errors.saveYears} error={t(strings.fields.yearsError, { min: grouped(0, numberLocale), max: grouped(60, numberLocale) })} max={60} hint={strings.fields.saveYearsHint} />
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
          <span className="mcs-hint">
            {strings.fields.mixHint}
            {!errors.stockPct && Number(form.stockPct) === DEFAULTS.stockPct && <> {t(strings.fields.mixExample, { pct: DEFAULTS.stockPct })}</>}
          </span>
        </div>

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
                <span className="mcs-tip" role="tooltip" id={`${ids.returns}-${s}`}>{returnTip(strings, s, amountLocale)}</span>
              </label>
            ))}
          </div>
          {/* The chosen setting's description, visible for touch screens
              where there is no hover. Screen readers get it from the
              tooltip through aria-describedby, so it is hidden from them. */}
          <span className="mcs-hint" aria-hidden="true">{returnTip(strings, form.returns, amountLocale)}</span>
        </fieldset>

        <QuickResult result={worded} state={shownState} busy={pending} withheld={withheld} strings={strings} />
        {/* Phones only. A button, not a link: nothing is written to the address. */}
        <p className="mcs-jump">
          <button
            type="button"
            onClick={() => {
              const heading = document.getElementById('mcs-results-h');
              heading?.scrollIntoView({ block: 'start' });
              heading?.focus({ preventScroll: true });
            }}
          >
            {strings.quick.jump}
          </button>
        </p>

        {/* The toggle for the folded fees and paths, showing what they
            are set to. An invalid fee keeps them open so the error shows.
            The current values sit outside the button, drawn over it with
            pointer-events off: with consent, analytics records a clicked
            button's text, and the fee is a typed value (CLAUDE.md: choices,
            never values). */}
        <div className="mcs-settingsRow">
          <button
            type="button"
            className="mcs-settingsToggle disclosure"
            aria-expanded={settingsOpen || errors.feePct}
            aria-controls={ids.settings}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <span className="mcs-settingsName">{strings.settings.toggle}</span>
          </button>
          <p className="mcs-settingsValue">
            {t(strings.settings.summary, {
              fees: errors.feePct ? '?' : Number(form.feePct).toLocaleString(numberLocale, { maximumFractionDigits: 2 }),
              paths: grouped(form.paths, numberLocale),
            })}
          </p>
        </div>

        <div
          id={ids.settings}
          className={`mcs-grid mcs-grid--assumptions${settingsOpen || errors.feePct ? ' mcs-settings--open' : ''}`}
        >
          <NumberField
            id={ids.feePct}
            label={strings.settings.feeLabel}
            value={form.feePct}
            onChange={setField('feePct')}
            invalid={errors.feePct}
            error={t(strings.fields.percentError, { min: grouped(0, numberLocale), max: grouped(MAX_FEE_PCT, numberLocale) })}
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
                <option key={n} value={n}>{grouped(n, numberLocale)}</option>
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
              <NumberField id={ids.withdrawal} label={strings.withdraw.amountLabel} value={form.withdrawal} onChange={setField('withdrawal')} invalid={errors.withdrawal} error={t(strings.fields.amountError, { min: grouped(1, numberLocale), max: grouped(MAX_WITHDRAWAL, numberLocale) })} hint={strings.withdraw.amountHint} />
              <NumberField id={ids.withdrawYears} label={strings.withdraw.yearsLabel} step="1" value={form.withdrawYears} onChange={setField('withdrawYears')} invalid={errors.withdrawYears} error={t(strings.fields.yearsError, { min: grouped(1, numberLocale), max: grouped(60, numberLocale) })} max={60} hint={strings.withdraw.yearsHint} />
            </div>
          )}
        </fieldset>

        <div className="mcs-actions">
          <ResultAnnouncement text={hasErrors ? strings.actions.fix : ''} delay={WITHHELD_SAID_AFTER} />
          <span className="mcs-hint" role="status" aria-live="polite">
            {!hasErrors && running ? t(strings.actions.running, { paths: grouped(settled.paths, numberLocale) }) : ''}
          </span>
        </div>
      </form>

      <Results
        result={worded}
        exact={result}
        state={shownState}
        code={shownState.currency}
        busy={running}
        withheld={withheld ? {
          title: exportStrings.report.answer,
          // After a correction nothing is left to fix: a long run says so, a short settle nothing.
          reason: hasErrors ? strings.actions.fix : running ? t(strings.actions.running, { paths: grouped(settled.paths, numberLocale) }) : '',
        } : null}
        strings={strings}
        actions={
          <ToolExport
            strings={exportStrings}
            share={
              <button type="button" className="btn btn--outline" onClick={copyShareLink} aria-disabled={waiting || undefined} data-attr="free-monte-carlo-share">
                <SwapLabel label={strings.actions.copy} alternate={strings.actions.copied} swapped={copied} />
              </button>
            }
            xlsxAttr="free-monte-carlo-export-xlsx"
            pdfAttr="free-monte-carlo-export-pdf"
            ready={!waiting}
            settling={waiting && !hasErrors && !running}
            onSpreadsheet={downloadSpreadsheet}
            onPrint={printPage}
          />
        }
      />

      {!withheld && <PrintedReport strings={strings} exportStrings={exportStrings} state={shownState} result={worded} />}
    </div>
    </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
    </NumberLocaleContext.Provider>
    </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  value: string;
  /** Receives a plain number string ("2.5"), '' or 'NaN'. */
  onChange: (value: string) => void;
  invalid: boolean;
  /** What to type instead, shown under the box while it is invalid. */
  error?: string;
  hint?: string;
  max?: number;
  /** "1" for a box that takes whole numbers only. */
  step?: string;
}) {
  const hintId = `${props.id}-hint`;
  const errorId = `${props.id}-error`;
  const unreadable = useContext(UnreadableContext);
  // The mark that arrived, as against text being typed here.
  const [typed, setTyped] = useState(false);
  const arrived = !typed && props.value === 'NaN';
  const showError = props.invalid && Boolean(props.error);
  const described = [showError ? errorId : '', props.hint ? hintId : ''].filter(Boolean).join(' ');
  return (
    <div className="mcs-field">
      <label className="mcs-label" htmlFor={props.id}>{props.label}</label>
      {/* A text box read by the page's language, as in the other tools: a number
          box reads by the browser's own rules, where "50.000" is fifty. */}
      <LocaleNumberInput
        id={props.id}
        className="mcs-input"
        inputMode={props.step === '1' ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={props.value}
        onValueChange={(value) => { setTyped(true); props.onChange(value); }}
        aria-invalid={props.invalid || undefined}
        aria-describedby={described || undefined}
      />
      {showError && <span className="ifc-error" id={errorId}><ErrorText>{arrived || tooLongForLink(props.value) ? unreadable : props.error ?? ''}</ErrorText></span>}
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
function QuickResult({ result, state, busy, withheld, strings }: { result: SimulationResult; state: ToolState; busy: boolean; withheld: boolean; strings: Strings }) {
  const { formatAmount, amountLocale } = useMoney();
  const code = state.currency;
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const lasted = state.withdrawal > 0 ? result.lasted : null;
  if (!saving && lasted === null) return null;
  return (
    <div className={`mcs-quick${busy ? ' mcs-quick--busy' : ''}${withheld ? ' tool-withheld' : ''}`} aria-hidden="true">
      {saving && (
        <>
          <span className="mcs-quickTitle">
            {state.saveYears === 1
              ? strings.quick.medianOne
              : t(strings.quick.medianOther, { years: state.saveYears })}
          </span>
          <span className="mcs-quickValue"><Amount>{formatAmount(r.p50, code)}</Amount></span>
          <span className="mcs-quickRange">
            <Amounts>{t(strings.quick.range, { low: formatAmount(r.p10, code), high: formatAmount(r.p90, code) })}</Amounts>
          </span>
        </>
      )}
      {lasted !== null && (
        <span className="mcs-quickRange">
          {lastedLine(lasted, state.withdrawYears, strings, amountLocale)}
        </span>
      )}
    </div>
  );
}

function Results({ result, exact, state, code, busy, withheld, strings, actions }: { withheld: { title: string; reason: string } | null; result: SimulationResult; exact: SimulationResult; state: ToolState; code: string; busy: boolean; strings: Strings; actions: React.ReactNode }) {
  const { formatAmount, amountLocale } = useMoney();
  const numberLocale = useContext(NumberLocaleContext);
  const r = result.atRetirement;
  const saving = state.saveYears > 0;
  const withdrawing = state.withdrawal > 0;
  const tableId = useId();
  const cardLength = longestAmount(formatAmount(r.p10, code), formatAmount(r.p50, code), formatAmount(r.p90, code));

  return (
    <section className={`mcs-results${busy ? ' mcs-results--busy' : ''}`} aria-labelledby="mcs-results-h" aria-busy={busy}>
      <h2 id="mcs-results-h" className="mcs-resultsTitle" tabIndex={-1}>
        {/* The heading names the years, so it is a result too. */}
        {withheld
          ? withheld.title
          : saving
            ? state.saveYears === 1
              ? strings.results.headingOne
              : t(strings.results.headingOther, { years: state.saveYears })
            : strings.results.headingToday}
      </h2>
      <Withheld reason={withheld?.reason ?? null}>

      {saving && (
        <>
          {/* The three amounts are compared, so they share one size. */}
          <div className="mcs-cards">
            {/* Phones show the short name only, in three columns, and the
                explanations once below the cards (mcs-cardsKey). */}
            <div className="mcs-card">
              <span className="mcs-cardLabel">{strings.results.lowLabel}<span className="mcs-cardMore">{strings.results.lowMore}</span></span>
              <span className="mcs-cardValue"><Amount shared={cardLength}>{formatAmount(r.p10, code)}</Amount></span>
            </div>
            <div className="mcs-card mcs-card--mid">
              <span className="mcs-cardLabel">{strings.results.medianLabel}<span className="mcs-cardMore">{strings.results.medianMore}</span></span>
              <span className="mcs-cardValue"><Amount shared={cardLength}>{formatAmount(r.p50, code)}</Amount></span>
            </div>
            <div className="mcs-card">
              <span className="mcs-cardLabel">{strings.results.highLabel}<span className="mcs-cardMore">{strings.results.highMore}</span></span>
              <span className="mcs-cardValue"><Amount shared={cardLength}>{formatAmount(r.p90, code)}</Amount></span>
            </div>
          </div>
          <p className="mcs-cardsKey">
            {strings.results.cardsKey}
          </p>
        </>
      )}

      {result.years > 0 && <Chart result={exact} worded={result} state={state} code={code} strings={strings} />}

      {saving && (
        <p className="mcs-note">
          {strings.results.noteBefore}{' '}
          <strong><Amount>{formatAmount(result.straightLine[state.saveYears], code)}</Amount></strong>
          {t(strings.results.noteAfter, { share: formatShare(result.belowStraightLine, amountLocale) })}
        </p>
      )}

      {!saving && !withdrawing && (
        <p className="mcs-note">{strings.results.empty}</p>
      )}

      {withdrawing && result.lasted !== null && (
        <div className="mcs-lasted">
          <p className="mcs-lastedHead">
            {result.lasted >= 1 || result.lasted <= 0 ? (
              <Amounts>{t(result.lasted >= 1
                ? plural(amountLocale ?? 'en', state.withdrawYears, strings.results.lastedAllOne, strings.results.lastedAll, strings.results.lastedAll)
                : plural(amountLocale ?? 'en', state.withdrawYears, strings.results.lastedNoneOne, strings.results.lastedNone, strings.results.lastedNone), {
                amount: formatAmount(state.withdrawal, code),
                years: state.withdrawYears,
              })}</Amounts>
            ) : (
              <>
                <Amounts>{t(plural(amountLocale ?? 'en', state.withdrawYears, strings.results.lastedHeadBeforeOne, strings.results.lastedHeadBefore, strings.results.lastedHeadBefore), {
                  amount: formatAmount(state.withdrawal, code),
                  years: state.withdrawYears,
                })}</Amounts>{' '}
                <strong>{inTen(result.lasted, strings)}</strong>
                {t(strings.results.lastedHeadAfter, { share: formatShare(result.lasted, amountLocale) })}
              </>
            )}
          </p>
          {result.medianRunOutYear !== null && (
            <p className="mcs-note">
              {t(strings.results.runOut, { year: result.medianRunOutYear, years: state.withdrawYears })}
            </p>
          )}
        </div>
      )}

      <p className="mcs-caveat">
        {t(strings.results.caveat, { paths: grouped(result.paths, numberLocale) })}
        {result.paths < 10_000 && t(strings.results.caveatFew, { paths: grouped(result.paths, numberLocale) })}{' '}
        {t(strings.results.rounded, { paths: grouped(result.paths, numberLocale) })}
      </p>


      {result.years > 0 && <details className="mcs-tableWrap" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('free_monte_carlo_table_opened'); }}>
        <summary className="mcs-tableSummary disclosure">{strings.results.tableSummary}</summary>
        <div className="mcs-tableScroll">
          {/* Where the columns do not fit (a phone, a larger text size) each
              year becomes a short list, every amount named by its column
              (tool-recordTable in global.css). The roles keep it a table for a
              screen reader when it is drawn that way; the names are the fixed
              column headings, never a value. */}
          <table className="mcs-table tool-recordTable" role="table" aria-describedby={tableId}>
            <caption id={tableId}>{strings.results.tableCaption}</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">{strings.results.tableYear}</th>
                <th scope="col" role="columnheader">{strings.results.tableLow}</th>
                <th scope="col" role="columnheader">{strings.results.tableMedian}</th>
                <th scope="col" role="columnheader">{strings.results.tableHigh}</th>
                <th scope="col" role="columnheader">{strings.results.tableStraight}</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {tableYears(result.years).map((y) => (
                <tr key={y} role="row">
                  <th scope="row" role="rowheader" data-label={strings.results.tableYear}>{y}</th>
                  <td role="cell" data-label={strings.results.tableLow}><Amount>{formatAmount(result.bands[y].p10, code)}</Amount></td>
                  <td role="cell" data-label={strings.results.tableMedian}><Amount>{formatAmount(result.bands[y].p50, code)}</Amount></td>
                  <td role="cell" data-label={strings.results.tableHigh}><Amount>{formatAmount(result.bands[y].p90, code)}</Amount></td>
                  <td role="cell" data-label={strings.results.tableStraight}><Amount>{formatAmount(result.straightLine[y], code)}</Amount></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>}
      </Withheld>

      {actions}
    </section>
  );
}

/**
 * What prints: the plan the results show, worded as the quick result above
 * the form words it. Hidden on screen (see ToolReport).
 */
function PrintedReport({ strings, exportStrings, state, result }: { strings: Strings; exportStrings: ExportStrings; state: ToolState; result: SimulationResult }) {
  const { formatAmount, amountLocale } = useMoney();
  const code = state.currency;
  const r = result.atRetirement;
  const answer: string[] = [];
  if (state.saveYears > 0) {
    const median = state.saveYears === 1 ? strings.quick.medianOne : t(strings.quick.medianOther, { years: state.saveYears });
    answer.push(`${median}: ${formatAmount(r.p50, code)}`, t(strings.quick.range, { low: formatAmount(r.p10, code), high: formatAmount(r.p90, code) }));
  }
  if (state.withdrawal > 0 && result.lasted !== null) answer.push(lastedLine(result.lasted, state.withdrawYears, strings, amountLocale));
  if (answer.length === 0) answer.push(strings.results.empty);
  const locale = amountLocale ?? 'en-US';
  return <ToolReport report={monteCarloReport({ island: strings, common: exportStrings, state, result, answer })} strings={exportStrings} locale={locale} />;
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

// The plot's own height stays as drawn here at every text size; the room
// around it is set by the text (#676), so larger text makes the drawing taller.
const WIDE: Geometry = { W: 760, H: 420, PAD: { top: 40, right: 132, bottom: 56, left: 104 }, endLabels: true };
// Drawn for a phone's width, so it fits without sideways scrolling.
const NARROW: Geometry = { W: 360, H: 270, PAD: { top: 18, right: 14, bottom: 50, left: 66 }, endLabels: false };

// Readout swatch colours, matching the chart's dots and inner band.
const OUTER_DOT = 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))';
const INNER_BAND = 'color-mix(in srgb, var(--color-deep-blue) 34%, transparent)';

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
  // If the stack ran past the bottom, push it back up: each label only as far
  // as the one below it needs, so a label already near the top stays put.
  let next = Infinity;
  for (const [, i] of [...order].reverse()) {
    out[i] = Math.min(out[i], max, next - gap);
    next = out[i];
  }
  return out;
}

function Chart({ result, worded, state, code, strings }: { result: SimulationResult; worded: SimulationResult; state: ToolState; code: string; strings: Strings }) {
  const { formatAmount, amountLocale } = useMoney();
  const numberLocale = useContext(NumberLocaleContext);
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
  const { W, H: BASE_H, PAD: BASE, endLabels: wideLabels } = narrow ? NARROW : WIDE;
  // Chart text is sized from the reader's text size (#676): `rem` drawing
  // units are one rem on screen. Axis numbers and words are 0.875 rem, the
  // end values 1 rem.
  const { rem, scale: textScale } = useChartRem(svgRef, W);
  const fs = 0.875 * rem;
  const fv = rem;
  const PLOT_H = BASE_H - BASE.top - BASE.bottom;

  // Scale to the middle half of every year, plus the full 8-in-10 band while
  // saving. During withdrawals the luckiest paths keep compounding and would
  // otherwise squash the saving years into the bottom of the chart; the part
  // of the band above the top is clipped and labelled.
  const saveEnd = Math.min(state.saveYears, years);
  // Gridlines at least 1.8 label heights apart: fewer as the text grows.
  const { top, step: yStep, count: yCount } = niceSteps(
    Math.max(...bands.map((b) => b.p75), ...bands.slice(0, saveEnd + 1).map((b) => b.p90), ...straightLine),
    Math.min(6, PLOT_H / (1.8 * fs)),
  );
  const clipped = bands.some((b) => b.p90 > top);

  // The axis names its unit once, above the chart, and its gridlines carry
  // bare numbers; the left margin is as wide as those numbers are drawn (#521).
  const amounts = useChartAmounts();
  const axis = amounts.axis(top, code);
  const tickText = Array.from({ length: yCount + 1 }, (_, i) => axis.tick(i * yStep));
  const margin = useAxisMargin(
    svgRef,
    '.mcs-axisAmount',
    { estimate: Math.max(...tickText.map((s) => textWidth(s, fs))), gap: fs, least: narrow ? 22 : 32, width: W, right: BASE.right },
  );
  const end = bands[years];
  const endLabels = [
    { key: 'p90', label: strings.chart.endHigh, value: end.p90, said: worded.bands[years].p90, cls: 'mcs-endLabel--outer' },
    { key: 'p50', label: strings.chart.endMedian, value: end.p50, said: worded.bands[years].p50, cls: 'mcs-endLabel--median' },
    { key: 'p10', label: strings.chart.endLow, value: end.p10, said: worded.bands[years].p10, cls: 'mcs-endLabel--outer' },
  ];
  // End-of-line labels on wide screens, while their gutter leaves the plot at
  // least 60% of the drawing and their stack fits beside it; the cards and the
  // read-out carry the same figures.
  // Measured as drawn: names, values and the axis title's words.
  const titleWords = strings.chart.axisYears.split(/\s+/).filter(Boolean);
  const measured = useMeasuredText(svgRef, [
    ...endLabels.flatMap((l) => [{ cls: 'mcs-endName', text: `${l.label} ↑`, size: fs }, { cls: 'mcs-endValue', text: amounts.label(l.said, code), size: fv }]),
    ...titleWords.map((w) => ({ cls: 'mcs-axis mcs-axisTitle', text: w, size: fs })),
    ...tickText.map((text) => ({ cls: 'mcs-axis mcs-axisAmount', text, size: fs })),
  ]);
  const endGutter = Math.ceil(16 + Math.max(...endLabels.map((l) => Math.max(measured.width({ cls: 'mcs-endName', text: `${l.label} ↑`, size: fs }), measured.width({ cls: 'mcs-endValue', text: amounts.label(l.said, code), size: fv })))));
  const endGap = Math.ceil(fs + fv + 0.5 * fs);
  const showEndLabels = wideLabels && W - margin.left - endGutter >= W * 0.6 && 3 * endGap <= PLOT_H;
  // The axis title, on as many lines as it needs across the drawing.
  const titleWidth = (line: string) =>
    line.split(' ').reduce((sum, w) => sum + measured.width({ cls: 'mcs-axis mcs-axisTitle', text: w, size: fs }), 0) + (line.split(' ').length - 1) * 0.3 * fs;
  const titleLines = wrapWords(strings.chart.axisYears, W * 0.94, titleWidth);
  const PAD = {
    // Room for the top gridline's label: half of it above the plot, or all of
    // it when the labels sit inside the plot, above their lines.
    top: Math.max(narrow ? BASE.top : 18, Math.ceil((margin.inside ? 1.4 : 0.8) * fs)),
    right: showEndLabels ? Math.max(BASE.right, endGutter) : NARROW.PAD.right,
    // Year labels, then the axis title, a line each.
    bottom: Math.max(BASE.bottom, Math.ceil((2.6 + 1.2 * titleLines.length) * fs)),
    left: margin.left,
  };
  const H = PAD.top + PLOT_H + PAD.bottom;
  const PLOT_W = W - PAD.left - PAD.right;
  // The axis title sits under the middle of the plot while it fits there, and
  // is moved in from the edge only as far as it has to be.
  // A single word wider than the whole drawing (Marathi at the largest text
  // on a phone) is drawn smaller, by just enough to fit, rather than cut.
  const titleFit = Math.min(1, (W - 4) / Math.max(...titleLines.map(titleWidth)));
  const titleHalf = (titleFit * Math.max(...titleLines.map(titleWidth))) / 2 + 2;
  const titleX = Math.round(Math.min(Math.max(PAD.left + PLOT_W / 2, titleHalf), W - titleHalf));

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
  // Minor gridlines go first, once the text is twice its default size.
  const minor = textScale < 2;
  const yMinor = minor ? Array.from({ length: yCount }, (_, i) => (i + 0.5) * yStep) : [];
  // Year labels keep a gap of one label height between them.
  const baseStep = years <= 10 ? 1 : years <= 30 ? 5 : 10;
  const xStep = labelStep(
    [1, 2, 5, 10, 20, 25, 50].filter((s) => s >= baseStep),
    (s) => (years === 0 ? Infinity : (s / years) * PLOT_W),
    textWidth(String(years), fs),
    fs,
  );
  const xTicks: number[] = [];
  for (let y = 0; y <= years; y += xStep) xTicks.push(y);
  const xMinorStep = !minor || xStep === 1 ? 0 : xStep / 5 >= 1 ? xStep / 5 : 0;
  const xMinor: number[] = [];
  if (xMinorStep) for (let y = xMinorStep; y < years; y += xMinorStep) if (y % xStep !== 0) xMinor.push(y);

  const withdrawing = state.withdrawal > 0 && state.withdrawYears > 0;

  // End-of-line labels, read off directly instead of from the axis.
  // Rounded to a tenth of a unit so server and browser floating point agree
  // when the page hydrates.
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const endRaw = [end.p90, end.p50, end.p10].map((v) => r1(yPx(v)));
  // Each label's two lines stay beside the plot, clear of the year labels below it.
  const endY = spreadLabels(endRaw, endGap, PAD.top + fs, H - PAD.bottom - 1.4 * fv).map(r1);

  const desc = t(strings.chart.desc, {
    paths: grouped(result.paths, numberLocale),
    years,
    low: formatAmount(worded.bands[years].p10, code),
    median: formatAmount(worded.bands[years].p50, code),
    high: formatAmount(worded.bands[years].p90, code),
    straight: formatAmount(worded.straightLine[years], code),
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
  // The same year in words: rounded (the dots stay where the exact figures are).
  const hw = hover !== null ? worded.bands[hover] : null;
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
        high: formatAmount((hw ?? h).p90, code),
        middleLow: formatAmount((hw ?? h).p25, code),
        middleHigh: formatAmount((hw ?? h).p75, code),
        median: formatAmount((hw ?? h).p50, code),
        low: formatAmount((hw ?? h).p10, code),
        straight: formatAmount(worded.straightLine[hover], code),
      })
    : '';

  useEscapeToClose(hover !== null, useCallback(() => setHover(null), []));
  // Beside the crosshair, kept inside the plotted area so it never covers the
  // end labels (phones stack it below the chart).
  const cardLeft = useReadoutPlacement(figureRef, svgRef, cardRef, hover === null ? null : x(hover) / W, (W - PAD.right) / W);
  // The phone chart fits the screen and does not scroll sideways, so a
  // sideways drag can move the read-out along it.
  const pointer = useChartPointer(yearAt, setHover, narrow);
  const slot = useReadoutSlot(cardRef, hover !== null);

  return (
    <figure
      className="mcs-figure"
      ref={figureRef}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }}
    >
      {!narrow && <p className="mcs-swipe" aria-hidden="true">{strings.chart.swipe}</p>}
      <ChartUnit>{axis.heading}</ChartUnit>
      <div className="mcs-chartScroll">
        <div
          className={narrow ? 'mcs-chartBox mcs-chartBox--scrub' : 'mcs-chartBox'}
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
            style={{ '--chart-fs': `${fs}px`, '--chart-fv': `${fv}px` } as React.CSSProperties}
            {...pointer}
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

            <MeasureSamples list={measured.list} />
            <rect className="mcs-plotBg" x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} rx="6" />
            {withdrawing && state.saveYears < years && (
              <g>
                <rect className="mcs-phase" x={x(state.saveYears)} y={PAD.top} width={x(years) - x(state.saveYears)} height={PLOT_H} />
                {/* Only when there is room; the readout names the phase too. */}
                {x(years) - x(state.saveYears) >= textWidth(strings.chart.livingOff, fs) + 20 && PLOT_H >= 3 * fs
                  && (!margin.inside || x(state.saveYears) + 10 > PAD.left + 6 + Math.max(...tickText.map((t) => textWidth(t, fs))) + fs) && (
                  <text className="mcs-phaseLabel" x={x(state.saveYears) + 10} y={r1(PAD.top + 1.4 * fs)}>{strings.chart.livingOff}</text>
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
                {margin.inside
                  ? v > 0 && (() => {
                    // Inside the plot a long amount ("2,00,00,000" at 400% text on a
                    // phone) may be wider than the drawing: drawn smaller down to the
                    // floor, and left out below it (council, Nov 21 2026).
                    const fit = Math.min(1, (W - PAD.left - 8) / Math.max(1, measured.width({ cls: 'mcs-axis mcs-axisAmount', text: axis.tick(v), size: fs })));
                    return <text className="mcs-axis mcs-axisAmount mcs-axisAmount--inside" x={PAD.left + 6} y={r1(yPx(v) - 0.3 * fs)} textAnchor="start" style={fit < 1 ? { fontSize: `${fs * fit}px` } : undefined} visibility={fit < FIT_FLOOR ? 'hidden' : undefined}>{axis.tick(v)}</text>;
                  })()
                  : <text className="mcs-axis mcs-axisAmount" x={r1(PAD.left - 0.6 * fs)} y={r1(yPx(v) + 0.35 * fs)} textAnchor="end">{axis.tick(v)}</text>}
              </g>
            ))}
            {xTicks.map((v) => (
              <g key={`x${v}`}>
                {v > 0 && <line className="mcs-grid" x1={x(v)} x2={x(v)} y1={PAD.top} y2={H - PAD.bottom} />}
                <text className="mcs-axis" x={x(v)} y={r1(H - PAD.bottom + 1.4 * fs)} textAnchor={edgeAnchor(x(v), textWidth(String(v), fs), 0, W)}>{v}</text>
              </g>
            ))}
            <text className="mcs-axis mcs-axisTitle" x={titleX} y={r1(H - PAD.bottom + 3.0 * fs)} textAnchor="middle" style={titleFit < 1 ? { fontSize: `${fs * titleFit}px` } : undefined} visibility={titleFit < FIT_FLOOR ? 'hidden' : undefined}>
              {titleLines.map((l, i) => <tspan key={i} x={titleX} dy={i === 0 ? 0 : r1(1.2 * fs)}>{l}</tspan>)}
            </text>

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
                  <line className="mcs-leader" x1={x(years) + 5} y1={endRaw[i]} x2={W - PAD.right + 8} y2={r1(endY[i] - 0.4 * fs)} />
                )}
                {(showEndLabels || l.value <= top) && <circle cx={x(years)} cy={endRaw[i]} r="4" />}
                {showEndLabels && (
                  <text x={W - PAD.right + 12} y={endY[i] - 2}>
                    <tspan className="mcs-endName">{l.label}{l.value > top ? ' ↑' : ''}</tspan>
                    <tspan x={W - PAD.right + 12} dy={r1(1.1 * fv)} className="mcs-endValue">{amounts.label(l.said, code)}</tspan>
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
            { label: strings.chart.readoutHigh, value: formatAmount((hw ?? h).p90, code), swatch: 'dot', color: OUTER_DOT },
            { label: strings.chart.readoutMiddle, value: t(strings.chart.readoutMiddleRange, { low: formatAmount((hw ?? h).p25, code), high: formatAmount((hw ?? h).p75, code) }), swatch: 'band', color: INNER_BAND },
            { label: strings.chart.readoutMedian, value: formatAmount((hw ?? h).p50, code), swatch: 'dot', color: 'var(--color-deep-blue)', strong: true },
            { label: strings.chart.readoutLow, value: formatAmount((hw ?? h).p10, code), swatch: 'dot', color: OUTER_DOT },
            { label: strings.chart.readoutStraight, value: formatAmount(worded.straightLine[hover], code), swatch: 'dot', color: 'var(--color-teal)' },
          ]}
        />
      )}
      {hover === null && <ReadoutSlot height={slot} />}
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
