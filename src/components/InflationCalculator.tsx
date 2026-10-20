import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CURRENCIES, amountStyle } from '../utils/loan/math.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { AmountLocaleContext, useMoney } from './useMoney.ts';
import { formatForInput } from '../utils/shared/parseLocaleNumber.ts';
import { arrivedByLanguageSwitch, publishToolState } from '../utils/shared/toolState.ts';
import {
  DISPLAY_CEILING,
  MAX_AMOUNT,
  MAX_GROWTH,
  MAX_RATE,
  MAX_YEARS,
  MIN_GROWTH,
  MIN_RATE,
  MIN_YEARS,
  MODES,
  answer,
  answerPath,
  bandRates,
  cumulativeFactor,
  extremes,
  historyPath,
  keepingUp,
  missingYears,
  parseAmount,
  parsePercent,
  parseYears,
  realRate,
  recentAverage,
  round2,
  roundAbout,
  seriesYears,
  unbrokenStart,
  yearRuns,
  type Mode,
  type Series,
} from '../utils/inflation/math.ts';
import { fromCompact, type CompactHistory, type CompactSeries } from '../utils/inflation/history.ts';
import { SHARED_STATE_GLOBAL, decodeState, defaultState, publishableState, type ToolState } from '../utils/inflation/url.ts';
import { format } from '../i18n/format.ts';
import { plural } from '../i18n/plural.ts';
import type { Dict } from '../i18n/strings/types.ts';

// ===========================================================================
// Copy
//
// Every word this island draws comes in through `strings`, one locale's slice
// of the catalog that `InflationCalculatorPage.astro` hands it. Never
// `dict(locale)`: that table holds every language and every tool, and the
// client chunk would carry all of it to render one calculator. The type import
// is compile-time only; `format` is a few lines and fills the `{placeholders}`.
//
// Country names arrive already written in the page's language (the page uses
// `Intl.DisplayNames` on the server), so the island never needs a list of them.
// ===========================================================================

type Strings = Dict['tools']['inflation']['island'];

const t = format;

/** PostHog telemetry: which choice was made, never a value typed. */
function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* never let analytics throw block UI updates */
  }
}

/** One country the select offers, its name in the page's language and its currency if the tools have it. */
export interface CountryOption {
  code: string;
  name: string;
  currency: string | null;
}

// ===========================================================================
// Phones (the site's 640px breakpoint). The server and the first browser
// render assume a wider screen, so the page hydrates cleanly; phones then
// switch to the charts drawn for their width.
// ===========================================================================

const PHONE_QUERY = '(max-width: 640px)';

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
}

// ===========================================================================
// The history file, fetched once per page from the site's own origin.
// ===========================================================================

let historyRequest: Promise<CompactHistory> | null = null;

function loadHistory(url: string): Promise<CompactHistory> {
  historyRequest ??= fetch(url, { credentials: 'omit' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<CompactHistory>;
  });
  historyRequest.catch(() => {
    historyRequest = null;
  });
  return historyRequest;
}

// ===========================================================================
// Formatting. Amounts follow the chosen currency's own conventions, as on the
// other tools, unless the page has its own amount style (`TOOL_AMOUNT_LOCALE`).
// Percentages follow the page.
// ===========================================================================

/**
 * A percentage in the page's own number style ("1.94%", "1,94 %"), since it
 * sits in the page's sentences. Amounts follow `amountStyle`, as on the other
 * tools.
 */
function pct(v: number, locale: string, digits = 2, signed = false): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(v / 100);
}

/** What the reader typed, to the cent where they typed cents. */
function typedAmount(v: number, code: string, amountLocale: string | null): string {
  const { locale, display } = amountStyle(code, amountLocale);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: display,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
}

/** A result, rounded and said as "about", "more than" or "less than". */
function aboutText(v: number, code: string, strings: Strings, amountLocale: string | null): string {
  if (!Number.isFinite(v) || v >= DISPLAY_CEILING) return t(strings.results.moreThan, { amount: formatAmount(DISPLAY_CEILING, code, false, amountLocale) });
  if (v > 0 && roundAbout(v) < 1) return t(strings.results.lessThan, { amount: formatAmount(1, code, false, amountLocale) });
  return t(strings.results.about, { amount: formatAmount(roundAbout(v), code, false, amountLocale) });
}

function yearsPhrase(n: number, strings: Strings, numberLocale: string): string {
  const { one, few, other } = strings.results.years;
  return t(plural(numberLocale, n, one, few, other), { n });
}

// ===========================================================================
// Form state: inputs are kept as strings so a field can be empty while typing.
// ===========================================================================

interface FormState {
  mode: Mode;
  currency: string;
  amount: string;
  rate: string;
  years: string;
  growth: string;
  country: string;
  /** '' means the default starting year for the country. */
  from: string;
}

function toForm(s: ToolState, locale: string): FormState {
  return {
    mode: s.mode,
    currency: s.currency,
    amount: formatForInput(s.amount, locale),
    rate: formatForInput(s.rate, locale),
    years: String(s.years),
    growth: formatForInput(s.growth, locale),
    country: s.country,
    from: s.from === null ? '' : String(s.from),
  };
}

/** The form as a state, keeping `prev`'s value for any field that does not parse. */
function toState(f: FormState, prev: ToolState, locale: string): ToolState {
  return {
    mode: f.mode,
    currency: f.currency,
    amount: parseAmount(f.amount, locale) ?? prev.amount,
    rate: parsePercent(f.rate, MIN_RATE, MAX_RATE, locale) ?? prev.rate,
    years: parseYears(f.years) ?? prev.years,
    growth: parsePercent(f.growth, MIN_GROWTH, MAX_GROWTH, locale) ?? prev.growth,
    country: f.country,
    from: f.from === '' ? null : Number(f.from),
  };
}

/** The starting years a country's history offers: its unbroken run up to the latest year, minus that last year. */
function fromYearsFor(series: Series | null): number[] {
  if (!series) return [];
  const years = seriesYears(series);
  const start = unbrokenStart(series);
  if (start === null) return [];
  const last = years[years.length - 1];
  const out: number[] = [];
  for (let y = start; y < last; y++) out.push(y);
  return out;
}

/** Ten years before the latest, or the earliest the run allows. */
function defaultFrom(options: number[]): number | null {
  if (options.length === 0) return null;
  const last = options[options.length - 1] + 1;
  return Math.max(options[0], last - 10);
}

function effectiveFrom(from: number | null, options: number[]): number | null {
  if (from !== null && options.includes(from)) return from;
  return defaultFrom(options);
}

// ===========================================================================
// Main component
// ===========================================================================

/**
 * `defaultCurrency` and `defaultCountry` are the page's starting point
 * (TOOL_DEFAULT_CURRENCY; India on the Hindi page). They apply only when no
 * shared state arrived, and after a reset; a shared link decodes the same on
 * every page (no `c` means EUR, no `n` means no country).
 */
export default function InflationCalculator({
  strings,
  defaultCurrency,
  defaultCountry,
  countries,
  initialHistory,
  historyUrl,
  numberLocale,
  amountLocale,
}: {
  strings: Strings;
  defaultCurrency: string;
  defaultCountry: string;
  countries: CountryOption[];
  initialHistory: { code: string; series: CompactSeries } | null;
  historyUrl: string;
  numberLocale: string;
  /** How the page writes amounts (`TOOL_AMOUNT_LOCALE`), or null for each currency's own style. */
  amountLocale: string | null;
}) {
  const start = defaultState(defaultCurrency, defaultCountry);
  const [form, setForm] = useState<FormState>(() => toForm(start, numberLocale));
  const [settled, setSettled] = useState<ToolState>(() => start);
  const [copied, setCopied] = useState(false);
  const [compact, setCompact] = useState<Record<string, CompactSeries>>(() =>
    initialHistory ? { [initialHistory.code]: initialHistory.series } : {},
  );
  const [historyFailed, setHistoryFailed] = useState(false);
  const loadedAll = useRef(false);
  const narrow = usePhone();
  const uid = useId();
  const ids = {
    tab: (m: Mode) => `${uid}-tab-${m}`,
    panel: `${uid}-panel`,
    currency: `${uid}-currency`,
    amount: `${uid}-amount`,
    rate: `${uid}-rate`,
    years: `${uid}-years`,
    growth: `${uid}-growth`,
    country: `${uid}-country`,
    from: `${uid}-from`,
  };
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ buy: null, cost: null, past: null, keep: null });
  const countryByCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  // Shared links carry the state after the #. ToolStateGuard, in the page
  // head, moved it out of the address bar into a window property before
  // analytics started; it is read from there, never from window.location.
  // Nothing is published until it has been read.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const decoded = typeof raw === 'string' ? decodeState(raw) : null;
    setHydrated(true);
    if (!decoded) return;
    const shared = { ...decoded, country: countryByCode.has(decoded.country) ? decoded.country : '' };
    setForm(toForm(shared, numberLocale));
    setSettled(shared);
    // A language switch carries the state too, but that view was counted on
    // the page it came from.
    if (arrivedByLanguageSwitch()) return;
    track('free_inflation_shared_view_opened', {
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, [countryByCode, numberLocale]);

  // Keeps what is on screen where the header's language switch can find it
  // (after the #, at click time; see src/utils/shared/toolState.ts). Never
  // the address: nothing here writes to it.
  useEffect(() => {
    if (!hydrated) return;
    publishToolState(SHARED_STATE_GLOBAL, publishableState(settled, defaultCurrency, defaultCountry));
  }, [hydrated, settled, defaultCurrency, defaultCountry]);

  // A country's history, from the site's own origin, the first time one is
  // picked that the page did not arrive with.
  const wanted = form.country || settled.country;
  useEffect(() => {
    if (!wanted || compact[wanted]) return;
    if (loadedAll.current) {
      setHistoryFailed(true);
      return;
    }
    let live = true;
    setHistoryFailed(false);
    loadHistory(historyUrl).then(
      (data) => {
        loadedAll.current = true;
        if (live) setCompact((c) => ({ ...data.countries, ...c }));
      },
      () => {
        if (live) setHistoryFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [wanted, compact, historyUrl]);

  const seriesCache = useMemo(() => new Map<string, Series>(), [compact]);
  const seriesFor = (code: string): Series | null => {
    if (!code || !compact[code]) return null;
    let s = seriesCache.get(code);
    if (!s) {
      s = fromCompact(compact[code]);
      seriesCache.set(code, s);
    }
    return s;
  };
  const historyState = (code: string): 'none' | 'loading' | 'ready' | 'error' =>
    !code ? 'none' : compact[code] ? 'ready' : historyFailed ? 'error' : 'loading';

  // What the form shows. "Past to today" with a country uses the history
  // instead of the rate and the years, unless the history could not load or
  // has no starting year to offer.
  const formSeries = seriesFor(form.country);
  const formState = historyState(form.country);
  const fromOptions = fromYearsFor(formSeries);
  const pastByHistory = form.mode === 'past' && (formState === 'loading' || (formState === 'ready' && fromOptions.length > 0));

  const errors = {
    amount: parseAmount(form.amount, numberLocale) === null,
    rate: !pastByHistory && parsePercent(form.rate, MIN_RATE, MAX_RATE, numberLocale) === null,
    years: !pastByHistory && parseYears(form.years) === null,
    growth: form.mode === 'keep' && parsePercent(form.growth, MIN_GROWTH, MAX_GROWTH, numberLocale) === null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  // Recalculate a moment after typing stops, and only on valid input, so the
  // answer does not jump on every keystroke.
  useEffect(() => {
    if (hasErrors) return;
    const timer = window.setTimeout(() => setSettled((prev) => toState(form, prev, numberLocale)), 250);
    return () => window.clearTimeout(timer);
  }, [form, hasErrors, numberLocale]);

  const update = (key: 'amount' | 'rate' | 'years' | 'growth') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  function chooseMode(mode: Mode) {
    if (mode === form.mode) return;
    setForm((f) => ({ ...f, mode }));
    track('free_inflation_mode_changed', { mode });
  }

  function onTabKey(e: React.KeyboardEvent) {
    const i = MODES.indexOf(form.mode);
    let next: Mode | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = MODES[(i + 1) % MODES.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = MODES[(i + MODES.length - 1) % MODES.length];
    else if (e.key === 'Home') next = MODES[0];
    else if (e.key === 'End') next = MODES[MODES.length - 1];
    if (!next) return;
    e.preventDefault();
    chooseMode(next);
    tabRefs.current[next]?.focus();
  }

  function chooseCountry(code: string) {
    const option = countryByCode.get(code);
    setForm((f) => ({ ...f, country: code, from: '', currency: option?.currency ?? f.currency }));
    track('free_inflation_country_changed', { country: code || 'none' });
  }

  // The settled state is what the answer shows; a share link carries the
  // form as it is now when it is valid, so a quick copy after typing is not
  // a quarter of a second out of date.
  function copyShareLink() {
    if (hasErrors) return;
    const state = publishableState(toState(form, settled, numberLocale), defaultCurrency, defaultCountry);
    const utm = 'utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=inflation_calculator';
    const url = `${window.location.origin}${window.location.pathname}?${utm}${state ? `#${state}` : ''}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      },
      () => window.prompt(strings.actions.copyPrompt, url),
    );
    track('free_inflation_share_copied');
  }

  function reset() {
    setForm(toForm(start, numberLocale));
    setSettled(start);
    track('free_inflation_reset');
  }

  const num = (n: number) => n.toLocaleString(numberLocale);
  const country = form.country ? countryByCode.get(form.country) ?? null : null;
  const question =
    form.mode === 'past' && pastByHistory && country
      ? t(strings.questions.pastCountry, { country: country.name })
      : strings.questions[form.mode];

  return (
    <AmountLocaleContext.Provider value={amountLocale}>
    <div className="ifc-root">
      <form className="ifc-form" onSubmit={(e) => e.preventDefault()} aria-label={strings.formLabel}>
        <div className="ifc-tabs" role="tablist" aria-label={strings.tabsLabel} onKeyDown={onTabKey}>
          {MODES.map((m) => (
            <button
              key={m}
              ref={(el) => {
                tabRefs.current[m] = el;
              }}
              id={ids.tab(m)}
              type="button"
              role="tab"
              className="ifc-tab"
              aria-selected={form.mode === m}
              aria-controls={ids.panel}
              tabIndex={form.mode === m ? 0 : -1}
              onClick={() => chooseMode(m)}
              data-attr={`free-inflation-tab-${m}`}
            >
              {strings.tabs[m]}
            </button>
          ))}
        </div>

        <div id={ids.panel} role="tabpanel" aria-labelledby={ids.tab(form.mode)} className="ifc-panel">
          <p className="ifc-question">{question}</p>

          <div className="ifc-grid">
            <div className="ifc-field ifc-field--currency">
              <label className="ifc-label" htmlFor={ids.currency}>{strings.fields.currency}</label>
              <select
                id={ids.currency}
                className="ifc-input"
                value={form.currency}
                onChange={(e) => {
                  const currency = e.target.value;
                  setForm((f) => ({ ...f, currency }));
                  track('free_inflation_currency_changed', { currency });
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}: {strings.currencies[c.code] ?? c.label}</option>
                ))}
              </select>
            </div>
            <Field
              id={ids.amount}
              label={strings.fields.amount[form.mode]}
              value={form.amount}
              onChange={update('amount')}
              error={errors.amount ? t(strings.fields.amountError, { max: num(MAX_AMOUNT) }) : null}
              inputMode="decimal"
            />
            {!pastByHistory && (
              <>
                <Field
                  id={ids.rate}
                  label={strings.fields.rate}
                  value={form.rate}
                  onChange={update('rate')}
                  hint={t(strings.fields.rateHint, { min: num(MIN_RATE), max: num(MAX_RATE) })}
                  error={errors.rate ? t(strings.fields.rateError, { min: num(MIN_RATE), max: num(MAX_RATE) }) : null}
                  inputMode="decimal"
                  unit="%"
                />
                <Field
                  id={ids.years}
                  label={strings.fields.years[form.mode]}
                  value={form.years}
                  onChange={update('years')}
                  hint={t(strings.fields.yearsHint, { min: MIN_YEARS, max: MAX_YEARS })}
                  error={errors.years ? t(strings.fields.yearsError, { min: MIN_YEARS, max: MAX_YEARS }) : null}
                  inputMode="numeric"
                  type="number"
                />
              </>
            )}
            {form.mode === 'keep' && (
              <Field
                id={ids.growth}
                label={strings.fields.growth}
                value={form.growth}
                onChange={update('growth')}
                hint={strings.fields.growthHint}
                error={errors.growth ? t(strings.fields.growthError, { min: num(MIN_GROWTH), max: num(MAX_GROWTH) }) : null}
                inputMode="text"
                unit="%"
              />
            )}
            {pastByHistory && formState === 'ready' && formSeries && (
              <div className="ifc-field">
                <label className="ifc-label" htmlFor={ids.from}>{strings.fields.from}</label>
                <select
                  id={ids.from}
                  className="ifc-input"
                  value={String(effectiveFrom(form.from === '' ? null : Number(form.from), fromOptions))}
                  aria-describedby={`${ids.from}-hint`}
                  onChange={(e) => {
                    const from = e.target.value;
                    setForm((f) => ({ ...f, from }));
                  }}
                >
                  {fromOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="ifc-fieldNote">
                  <span className="ifc-hint" id={`${ids.from}-hint`}>
                    {t(strings.fields.fromHint, { last: fromOptions[fromOptions.length - 1] + 1 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <HistoryPanel
            strings={strings}
            ids={ids}
            countries={countries}
            country={country}
            currency={form.currency}
            series={formSeries}
            state={formState}
            showUse={!pastByHistory}
            narrow={narrow}
            numberLocale={numberLocale}
            onCountry={chooseCountry}
            onUse={(avg) => {
              setForm((f) => ({ ...f, rate: formatForInput(round2(avg), numberLocale) }));
              track('free_inflation_average_used');
            }}
          />
        </div>

        <div className="ifc-actions">
          <button type="button" className="ifc-btn" onClick={copyShareLink} disabled={hasErrors} data-attr="free-inflation-share">
            {copied ? strings.actions.copied : strings.actions.copy}
          </button>
          <button type="button" className="ifc-btn ifc-btn--ghost" onClick={reset} data-attr="free-inflation-reset">
            {strings.actions.reset}
          </button>
          {/* Visible next to the buttons; the live announcement is the one over
              the stale answer, so it is not said twice. */}
          <span className="ifc-hint">{hasErrors ? strings.results.fix : ''}</span>
        </div>
      </form>

      <Results
        strings={strings}
        state={settled}
        stale={hasErrors}
        country={settled.country ? countryByCode.get(settled.country) ?? null : null}
        series={seriesFor(settled.country)}
        historyStatus={historyState(settled.country)}
        narrow={narrow}
        numberLocale={numberLocale}
      />
    </div>
    </AmountLocaleContext.Provider>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  error: string | null;
  inputMode: 'decimal' | 'numeric' | 'text';
  type?: 'number' | 'text';
  unit?: string;
}) {
  const hintId = `${props.id}-hint`;
  const errorId = `${props.id}-error`;
  const describedBy = [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ifc-field">
      <label className="ifc-label" htmlFor={props.id}>{props.label}</label>
      <div className={`ifc-inputWrap${props.unit ? ' ifc-inputWrap--unit' : ''}`}>
        <input
          id={props.id}
          className="ifc-input"
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          step={props.type === 'number' ? 'any' : undefined}
          autoComplete="off"
          value={props.value}
          onChange={props.onChange}
          aria-invalid={props.error ? true : undefined}
          aria-errormessage={props.error ? errorId : undefined}
          aria-describedby={describedBy}
        />
        {props.unit && <span className="ifc-unit" aria-hidden="true">{props.unit}</span>}
      </div>
      <div className="ifc-fieldNote">
        {props.error && <span className="ifc-error" id={errorId}>{props.error}</span>}
        {props.hint && <span className="ifc-hint" id={hintId}>{props.hint}</span>}
      </div>
    </div>
  );
}

// ===========================================================================
// History panel: the country select, and once one is picked its yearly
// inflation, the recent average and the option to use it as the rate.
// ===========================================================================

function HistoryPanel({
  strings,
  ids,
  countries,
  country,
  currency,
  series,
  state,
  showUse,
  narrow,
  numberLocale,
  onCountry,
  onUse,
}: {
  strings: Strings;
  ids: { country: string };
  countries: CountryOption[];
  country: CountryOption | null;
  currency: string;
  series: Series | null;
  state: 'none' | 'loading' | 'ready' | 'error';
  showUse: boolean;
  narrow: boolean;
  numberLocale: string;
  onCountry: (code: string) => void;
  onUse: (avg: number) => void;
}) {
  const h = strings.history;
  const years = series ? seriesYears(series) : [];
  const recent = series ? recentAverage(series) : null;
  const gaps = series ? missingYears(series) : [];
  const runStart = series ? unbrokenStart(series) : null;
  const ext = series ? extremes(series, years) : null;
  const code = currency;
  const avgOk = recent !== null && recent.average >= MIN_RATE && recent.average <= MAX_RATE;
  const ranges = yearRuns(gaps)
    .map(([a, b]) => (a === b ? String(a) : t(h.range, { first: a, last: b })))
    .join(h.rangeJoin);

  return (
    <div className="ifc-history">
      <div className="ifc-field ifc-countryField">
        <label className="ifc-label" htmlFor={ids.country}>{h.label}</label>
        <select
          id={ids.country}
          className="ifc-input"
          value={country?.code ?? ''}
          aria-describedby={`${ids.country}-hint`}
          onChange={(e) => onCountry(e.target.value)}
        >
          <option value="">{h.none}</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <span className="ifc-hint" id={`${ids.country}-hint`}>{h.hint}</span>
      </div>

      {country && state === 'loading' && <p className="ifc-note" role="status">{h.loading}</p>}
      {country && state === 'error' && <p className="ifc-note ifc-note--warn" role="status">{h.error}</p>}

      {country && state === 'ready' && series && recent && (
        <div className="ifc-historyBody">
          {!country.currency && (
            <p className="ifc-note">{t(h.currencyOther, { currency: code, country: country.name })}</p>
          )}
          <HistoryBars
            series={series}
            recentFirst={recent.first}
            label={
              ext
                ? t(h.chartLabel, {
                    country: country.name,
                    first: years[0],
                    last: years[years.length - 1],
                    high: pct(ext.high.rate, numberLocale, 1),
                    highYear: ext.high.year,
                    low: pct(ext.low.rate, numberLocale, 1),
                    lowYear: ext.low.year,
                  })
                : ''
            }
            strings={strings}
            numberLocale={numberLocale}
            narrow={narrow}
          />
          <p className="ifc-historyAvg">
            <strong>
              {recent.span > recent.count
                ? t(h.averageGaps, { country: country.name, count: recent.count, first: recent.first, last: recent.last, average: pct(recent.average, numberLocale, 1) })
                : t(h.average, { country: country.name, first: recent.first, last: recent.last, average: pct(recent.average, numberLocale, 1) })}
            </strong>{' '}
            {h.averageNote}
          </p>
          <p className="ifc-hint">
            {t(h.coverage, { first: years[0], last: years[years.length - 1] })}
            {gaps.length > 0 && <> {t(h.gaps, { years: ranges })}</>}
            {gaps.length > 0 && runStart !== null && <> {t(h.gapStart, { start: runStart })}</>}
          </p>
          {showUse &&
            (avgOk ? (
              <button type="button" className="ifc-linkBtn" onClick={() => onUse(recent.average)} data-attr="free-inflation-use-average">
                {h.use}
              </button>
            ) : (
              <p className="ifc-hint">{t(h.useOutside, { min: MIN_RATE.toLocaleString(numberLocale), max: MAX_RATE.toLocaleString(numberLocale) })}</p>
            ))}
          <details className="ifc-tableWrap">
            <summary className="ifc-tableSummary disclosure">{h.tableSummary}</summary>
            <div className="ifc-tableScroll">
              <table className="ifc-table">
                <caption>{t(h.tableCaption, { country: country.name })}</caption>
                <thead>
                  <tr>
                    <th scope="col">{h.tableYear}</th>
                    <th scope="col">{h.tableRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {allYears(series)
                    .reverse()
                    .map((y) => (
                      <tr key={y}>
                        <th scope="row">{y}</th>
                        <td>{y in series ? pct(series[y], numberLocale, 2) : h.tableNone}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/** Every calendar year from the first to the last, gaps included. */
function allYears(series: Series): number[] {
  const ys = seriesYears(series);
  if (ys.length === 0) return [];
  const out: number[] = [];
  for (let y = ys[0]; y <= ys[ys.length - 1]; y++) out.push(y);
  return out;
}

/** Round gridline steps (1, 2, 2.5 or 5 times a power of ten), at most `max`, covering v. */
function niceScale(v: number, max = 5): { top: number; step: number; count: number } {
  if (!(v > 0)) return { top: 1, step: 1, count: 1 };
  const raw = v / max;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * exp).find((s) => s >= raw) ?? 10 * exp;
  const count = Math.max(1, Math.ceil(v / step - 1e-9));
  return { top: step * count, step, count };
}

/** Bars taller than this many percent are cut off, so one hyperinflation year does not flatten the rest. */
const BAR_CAP = 50;

function HistoryBars({
  series,
  recentFirst,
  label,
  strings,
  numberLocale,
  narrow,
}: {
  series: Series;
  recentFirst: number;
  label: string;
  strings: Strings;
  numberLocale: string;
  narrow: boolean;
}) {
  const years = allYears(series);
  const values = years.filter((y) => y in series).map((y) => series[y]);
  const maxV = Math.max(0, ...values);
  const minV = Math.min(0, ...values);
  const top = Math.min(BAR_CAP, niceScale(Math.max(maxV, 1), 2).top);
  const bottom = minV < 0 ? -Math.min(BAR_CAP, niceScale(-minV, 1).top) : 0;
  const capped = maxV > top || minV < bottom;
  const W = narrow ? 360 : 760;
  const H = narrow ? 150 : 170;
  const PAD = { top: 10, right: 8, bottom: 30, left: narrow ? 52 : 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const bw = plotW / Math.max(1, years.length);
  const y = (v: number) => PAD.top + ((top - Math.max(bottom, Math.min(top, v))) / (top - bottom)) * plotH;
  const zero = y(0);
  const fmt = (v: number) => pct(v, numberLocale, 0);
  const first = years[0];
  const last = years[years.length - 1];
  return (
    <figure className="ifc-bars">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="ifc-barsSvg">
        <line className="ifc-gridLine" x1={PAD.left} x2={W - PAD.right} y1={y(top)} y2={y(top)} />
        {bottom < 0 && <line className="ifc-gridLine" x1={PAD.left} x2={W - PAD.right} y1={y(bottom)} y2={y(bottom)} />}
        <text className="ifc-axis" x={PAD.left - 8} y={y(top) + 6} textAnchor="end">{fmt(top)}</text>
        <text className="ifc-axis" x={PAD.left - 8} y={zero + 6} textAnchor="end">{fmt(0)}</text>
        {bottom < 0 && <text className="ifc-axis" x={PAD.left - 8} y={y(bottom) + 2} textAnchor="end">{fmt(bottom)}</text>}
        {years.map((yr, i) => {
          if (!(yr in series)) return null;
          const v = series[yr];
          const yv = y(v);
          const cls = `ifc-bar${yr >= recentFirst ? ' ifc-bar--recent' : ''}${v > top || v < bottom ? ' ifc-bar--capped' : ''}`;
          return (
            <rect
              key={yr}
              className={cls}
              x={PAD.left + i * bw + bw * 0.12}
              width={Math.max(1, bw * 0.76)}
              y={Math.min(yv, zero)}
              height={Math.max(1, Math.abs(zero - yv))}
            />
          );
        })}
        <line className="ifc-axisLine" x1={PAD.left} x2={W - PAD.right} y1={zero} y2={zero} />
        <text className="ifc-axis" x={PAD.left} y={H - 6} textAnchor="start">{first}</text>
        <text className="ifc-axis" x={W - PAD.right} y={H - 6} textAnchor="end">{last}</text>
      </svg>
      <figcaption className="ifc-legend">
        <span><i className="ifc-key ifc-key--recent" aria-hidden="true" />{strings.history.legendRecent}</span>
        <span><i className="ifc-key ifc-key--older" aria-hidden="true" />{strings.history.legendOlder}</span>
        {capped && <span>{t(strings.history.capped, { cap: fmt(top) })}</span>}
      </figcaption>
    </figure>
  );
}

// ===========================================================================
// The answer, the line under it, and the chart of the path.
// ===========================================================================

interface Answer {
  headline: string;
  sentences: string[];
  band: string[];
  method: string;
  points: { x: number; value: number }[];
  calendar: boolean;
  chartTitle: string;
  axis: string;
}

function computeAnswer(
  s: ToolState,
  strings: Strings,
  country: CountryOption | null,
  series: Series | null,
  historyStatus: 'none' | 'loading' | 'ready' | 'error',
  numberLocale: string,
  amountLocale: string | null,
): Answer | 'loading' {
  const r = strings.results;
  const code = s.currency;
  const A = s.amount;
  const amount = typedAmount(A, code, amountLocale);
  const options = fromYearsFor(series);
  const byHistory = s.mode === 'past' && !!country && (historyStatus === 'loading' || (historyStatus === 'ready' && options.length > 0));

  if (byHistory) {
    if (!series || historyStatus !== 'ready') return 'loading';
    const from = effectiveFrom(s.from, options)!;
    const { factor, toYear } = cumulativeFactor(series, from);
    const to = toYear!;
    const span = to - from;
    const value = A * factor;
    const average = (Math.pow(factor, 1 / span) - 1) * 100;
    return {
      headline: aboutText(value, code, strings, amountLocale),
      sentences: [
        t(r.pastCountry, { country: country!.name, amount, from, result: aboutText(value, code, strings, amountLocale), to }),
        t(r.pastCountryRise, { total: pct((factor - 1) * 100, numberLocale, 0), years: yearsPhrase(span, strings, numberLocale), average: pct(average, numberLocale, 1) }),
      ],
      band: [],
      method: r.methodHistory,
      points: historyPath(series, from, A).map((p) => ({ x: p.year, value: p.value })),
      calendar: true,
      chartTitle: t(strings.chart.title.past, { amount }),
      axis: strings.chart.axis.pastCountry,
    };
  }

  const n = s.years;
  const i = s.rate;
  const years = yearsPhrase(n, strings, numberLocale);
  const { lower, higher } = bandRates(i);
  const sides = [lower, higher].filter((v): v is number => v !== null);

  if (s.mode === 'keep') {
    const g = s.growth;
    const real = realRate(g, i);
    const after = keepingUp(A, g, i, n);
    const same = Math.abs(real) < 0.005;
    const lead = same ? r.keepSame : real > 0 ? r.keepMore : r.keepLess;
    return {
      headline: t(r.keepHeadline, { real: pct(same ? 0 : real, numberLocale, 2, true) }),
      sentences: [
        t(lead, { growth: pct(g, numberLocale), rate: pct(i, numberLocale), real: pct(Math.abs(real), numberLocale) }),
        t(r.keepAfter, { years, amount, growth: pct(g, numberLocale), result: aboutText(after, code, strings, amountLocale) }),
        t(r.keepExact, { growth: pct(g, numberLocale), rate: pct(i, numberLocale), shortcut: `${pct(g, numberLocale)} − ${pct(i, numberLocale)} = ${pct(g - i, numberLocale)}` }),
      ],
      band: sides.map((rate) => t(r.bandKeep, { rate: pct(rate, numberLocale), real: pct(realRate(g, rate), numberLocale, 2, true) })),
      method: r.method,
      points: answerPath('keep', A, i, n, g).map((value, x) => ({ x, value })),
      calendar: false,
      chartTitle: t(strings.chart.title.keep, { amount }),
      axis: strings.chart.axis.keep,
    };
  }

  const mode = s.mode;
  const formula: Mode = mode === 'buy' ? 'buy' : 'cost';
  const value = answer(formula, A, i, n);
  const template = mode === 'buy' ? r.buy : mode === 'cost' ? r.cost : r.past;
  return {
    headline: aboutText(value, code, strings, amountLocale),
    sentences: [t(template, { rate: pct(i, numberLocale), amount, years, result: aboutText(value, code, strings, amountLocale) })],
    band: sides.map((rate) => t(r.bandItem, { rate: pct(rate, numberLocale), result: aboutText(answer(formula, A, rate, n), code, strings, amountLocale) })),
    method: r.method,
    points: answerPath(formula, A, i, n).map((v, x) => ({ x, value: v })),
    calendar: false,
    chartTitle: t(strings.chart.title[mode], { amount }),
    axis: strings.chart.axis[mode],
  };
}

function Results({
  strings,
  state,
  stale,
  country,
  series,
  historyStatus,
  narrow,
  numberLocale,
}: {
  strings: Strings;
  state: ToolState;
  stale: boolean;
  country: CountryOption | null;
  series: Series | null;
  historyStatus: 'none' | 'loading' | 'ready' | 'error';
  narrow: boolean;
  numberLocale: string;
}) {
  const { amountLocale } = useMoney();
  const result = computeAnswer(state, strings, country, series, historyStatus, numberLocale, amountLocale);

  // Each recalculation is announced once it has settled: the rounded headline
  // and its sentence, in a polite live region that is otherwise invisible. Not
  // on the first render, which is the page loading, and not while loading.
  const [announcement, setAnnouncement] = useState('');
  const firstState = useRef(state);
  const announceText = result === 'loading' ? '' : t(strings.results.announce, { headline: result.headline, sentence: result.sentences[0] });
  useEffect(() => {
    if (state === firstState.current || !announceText) return;
    setAnnouncement(announceText);
    // A new answer only: the text follows the state, not every render.
  }, [state, historyStatus]);

  return (
    <section className={`ifc-results${stale ? ' ifc-results--stale' : ''}`} aria-labelledby="ifc-results-h">
      <h2 id="ifc-results-h" className="ifc-resultsTitle">{strings.results.heading}</h2>
      <span className="ifc-srOnly" aria-live="polite">{stale ? '' : announcement}</span>
      {/* While a field is invalid the answer below is the previous one: it is
          dimmed, hidden from assistive technology, and this says why. */}
      {stale && <p className="ifc-staleNote" role="status" aria-live="polite">{strings.results.stale}</p>}
      {result === 'loading' ? (
        <p className="ifc-note" role="status">{strings.history.loading}</p>
      ) : (
        <div className="ifc-resultBody" aria-hidden={stale || undefined}>
          <div className="ifc-answer">
            <p className="ifc-headline">{result.headline}</p>
            {result.sentences.map((s, i) => (
              <p key={i} className={i === 0 ? 'ifc-sentence' : 'ifc-note'}>{s}</p>
            ))}
            {result.band.length > 0 && (
              <p className="ifc-band">
                <span className="ifc-bandLabel">{strings.results.bandLabel}</span>{' '}
                {result.band.map((b, i) => (
                  <span key={i} className="ifc-bandItem">
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {b}
                  </span>
                ))}
              </p>
            )}
            <p className="ifc-method">{result.method}</p>
          </div>
          <LineChart
            points={result.points}
            calendar={result.calendar}
            code={state.currency}
            title={result.chartTitle}
            axis={result.axis}
            strings={strings}
            narrow={narrow}
          />
        </div>
      )}
    </section>
  );
}

function LineChart({
  points,
  calendar,
  code,
  title,
  axis,
  strings,
  narrow,
}: {
  points: { x: number; value: number }[];
  calendar: boolean;
  code: string;
  title: string;
  axis: string;
  strings: Strings;
  narrow: boolean;
}) {
  const { formatAmount, amountLocale } = useMoney();
  const titleId = useId();
  const descId = useId();
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const maxV = Math.max(...values);
  if (!Number.isFinite(maxV) || maxV >= DISPLAY_CEILING) {
    return (
      <figure className="ifc-figure">
        <figcaption className="ifc-chartTitle">{title}</figcaption>
        <p className="ifc-note">{strings.chart.tooLarge}</p>
      </figure>
    );
  }
  const W = narrow ? 360 : 760;
  const H = narrow ? 250 : 300;
  const PAD = narrow ? { top: 14, right: 18, bottom: 54, left: 70 } : { top: 18, right: 28, bottom: 58, left: 100 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const { top, step, count } = niceScale(maxV, narrow ? 4 : 5);
  const x0 = points[0].x;
  const x1 = points[points.length - 1].x;
  const span = Math.max(1, x1 - x0);
  const px = (x: number) => PAD.left + ((x - x0) / span) * plotW;
  const py = (v: number) => PAD.top + (1 - v / top) * plotH;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r1(px(p.x))},${r1(py(p.value))}`).join(' ');
  const area = `${line} L${r1(px(x1))},${r1(py(0))} L${r1(px(x0))},${r1(py(0))} Z`;
  const yTicks = Array.from({ length: count + 1 }, (_, i) => i * step);
  const maxTicks = narrow ? 4 : 8;
  const xStep = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= maxTicks) ?? 100;
  const xTicks: number[] = [];
  for (let x = Math.ceil(x0 / xStep) * xStep; x <= x1; x += xStep) xTicks.push(x);
  const xLabel = (x: number) => (calendar ? String(x) : t(strings.chart.yearsFrom, { n: x }));
  const start = points[0];
  const end = points[points.length - 1];
  const desc = t(strings.chart.desc, {
    start: aboutText(start.value, code, strings, amountLocale),
    end: aboutText(end.value, code, strings, amountLocale),
    from: xLabel(start.x),
    to: xLabel(end.x),
  });
  return (
    <figure className="ifc-figure">
      <figcaption className="ifc-chartTitle" id={titleId}>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId} aria-describedby={descId} className="ifc-chart">
        <desc id={descId}>{desc}</desc>
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line className={v === 0 ? 'ifc-axisLine' : 'ifc-gridLine'} x1={PAD.left} x2={W - PAD.right} y1={r1(py(v))} y2={r1(py(v))} />
            <text className="ifc-axis" x={PAD.left - 10} y={r1(py(v)) + 5} textAnchor="end">{formatAmount(v, code, true)}</text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={`x${x}`} className="ifc-axis" x={r1(px(x))} y={H - PAD.bottom + 24} textAnchor={x === x0 ? 'start' : x === x1 ? 'end' : 'middle'}>
            {x}
          </text>
        ))}
        <text className="ifc-axis ifc-axisTitle" x={PAD.left + plotW / 2} y={H - 8} textAnchor="middle">{axis}</text>
        <path className="ifc-area" d={area} />
        <path className="ifc-line" d={line} />
        <circle className="ifc-dot" cx={r1(px(start.x))} cy={r1(py(start.value))} r="5" />
        <circle className="ifc-dot" cx={r1(px(end.x))} cy={r1(py(end.value))} r="5" />
      </svg>
    </figure>
  );
}
