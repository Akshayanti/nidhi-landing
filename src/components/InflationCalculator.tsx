import { useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CURRENCIES, amountFormat, amountStyle } from '../utils/shared/money.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { longestAmount } from '../utils/shared/amountUnits.ts';
import { Amounts } from './Amounts.tsx';
import { ChartUnit, ChartWordsContext, useAxisMargin, useChartAmounts } from './ChartAmounts.tsx';
import { FIT_FLOOR, niceSteps, placeLabels, textWidth, useChartRem, wrapWords } from './chart/useChartRem.ts';
import { MeasureSamples, useMeasuredText } from './chart/MeasuredText.tsx';
import { NumberLocaleContext } from './LocaleNumberInput.tsx';
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
import { SHARED_STATE_GLOBAL, decodeState, defaultState, isPristineState, type ToolState } from '../utils/inflation/url.ts';
import { boxErrors, formFromLink, publishableForm, toForm, toState, type FormState } from '../utils/inflation/form.ts';
import { format } from '../i18n/format.ts';
import { plural } from '../i18n/plural.ts';
import type { Dict } from '../i18n/strings/types.ts';
import { SwapLabel, ToolExport, ToolReport } from './ToolExport.tsx';
import { downloadWorkbook, isoDate, printResults } from '../utils/shared/exportFile.ts';
import { currencyChangesBetween, mixedYearChange, type CurrencyChange } from '../utils/inflation/currencyChanges.ts';
import { inflationReport } from '../utils/inflation/report.ts';
import { inflationSheets, type InflationAnswer } from '../utils/inflation/export.ts';
import { ErrorLeadContext, ErrorText, heldUntilReady, markerSelect, ResultAnnouncement, UnreadableContext, useToolReady, useResultGate, Withheld, WITHHELD_SAID_AFTER } from './toolShared.tsx';

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
type ExportStrings = Dict['tools']['export'];

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

const PHONE_QUERY = '(width < 640px)';

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
  const { display } = amountStyle(code, amountLocale);
  return amountFormat(code, amountLocale, {
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
  exportStrings,
  defaultCurrency,
  defaultCountry,
  countries,
  initialHistory,
  historyUrl,
  numberLocale,
  amountLocale,
}: {
  strings: Strings;
  exportStrings: ExportStrings;
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
  // The form `settled` was worked out from.
  const [settledForm, setSettledForm] = useState(form);
  const [copied, setCopied] = useState(false);
  const [compact, setCompact] = useState<Record<string, CompactSeries>>(() =>
    initialHistory ? { [initialHistory.code]: initialHistory.series } : {},
  );
  const [historyFailed, setHistoryFailed] = useState(false);
  // Whether the optional country history is unfolded. View state only: it is
  // never shared, stored or tracked.
  const [historyOpen, setHistoryOpen] = useState(false);
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
    // The boxes as the link has them, bad ones included; the state behind them stays finite.
    const opened = formFromLink(raw as string, numberLocale) ?? toForm(shared, numberLocale);
    const arrived = { ...opened, country: shared.country };
    setForm(arrived);
    setSettled(shared);
    setSettledForm(arrived);
    // A shared link that names a country shows its history without a click.
    if (shared.country && shared.country !== defaultCountry) setHistoryOpen(true);
    // A language switch carries the state too, but that view was counted on
    // the page it came from.
    if (arrivedByLanguageSwitch()) return;
    track('free_inflation_shared_view_opened', {
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, [countryByCode, numberLocale]);

  // The form as it stands, not the settled state: a bad box must arrive bad,
  // and a choice made while one is bad must not be lost (#789).
  // Keeps what is on screen where the header's language switch can find it
  // (after the #, at click time; see src/utils/shared/toolState.ts). Never
  // the address: nothing here writes to it.
  useEffect(() => {
    if (!hydrated) return;
    publishToolState(SHARED_STATE_GLOBAL, publishableForm(form, numberLocale, defaultCurrency, defaultCountry));
  }, [hydrated, form, numberLocale, defaultCurrency, defaultCountry]);

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
        // An answer thrown away leaves the history unloaded, so the country
        // asks again when it is chosen again (#867, #879).
        if (!live) return;
        loadedAll.current = true;
        setCompact((c) => ({ ...data.countries, ...c }));
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

  const wrong = boxErrors(form, numberLocale);
  const errors = {
    amount: wrong.amount,
    rate: !pastByHistory && wrong.rate,
    years: !pastByHistory && wrong.years,
    growth: form.mode === 'keep' && wrong.growth,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  // Recalculate a moment after typing stops, and only on valid input, so the
  // answer does not jump on every keystroke.
  useEffect(() => {
    if (hasErrors) return;
    const timer = window.setTimeout(() => {
      setSettled((prev) => toState(form, prev, numberLocale));
      setSettledForm(form);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form, hasErrors, numberLocale]);
  const { withheld, waiting } = useResultGate(hasErrors, form === settledForm);

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

  // A share link carries the form as it stands, once the answer shows it.
  function copyShareLink() {
    if (waiting) return;
    const state = publishableForm(form, numberLocale, defaultCurrency, defaultCountry);
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

  // A copy is of the answer on screen (the settled state), and only once that
  // answer is there: not while a field is invalid or a history is loading.
  const settledCountry = settled.country ? countryByCode.get(settled.country) ?? null : null;
  function shownAnswer(): InflationAnswer | null {
    const a = computeAnswer(settled, strings, settledCountry, seriesFor(settled.country), historyState(settled.country), numberLocale, amountLocale);
    if (a === 'loading') return null;
    const first = a.points[0];
    const last = a.points[a.points.length - 1];
    return {
      question: a.calendar && settledCountry ? t(strings.questions.pastCountry, { country: settledCountry.name }) : strings.questions[settled.mode],
      sentences: a.sentences,
      value: a.value,
      points: a.points,
      axis: a.axis,
      chartTitle: a.chartTitle,
      history: a.calendar && settledCountry && first && last ? { country: settledCountry.name, from: first.x, to: last.x } : null,
    };
  }
  const exportReady = !waiting && shownAnswer() !== null;

  const decimals = Math.round(Math.log10(CURRENCIES.find((c) => c.code === settled.currency)?.factor ?? 100));

  // What prints: the answer on screen, its sentences as the page shows them.
  // Hidden on screen (see ToolReport); absent while there is no answer.
  function printedReport() {
    const answer = shownAnswer();
    const a = computeAnswer(settled, strings, settledCountry, seriesFor(settled.country), historyState(settled.country), numberLocale, amountLocale);
    if (!answer || a === 'loading') return null;
    const band = a.band.length > 0 ? [`${strings.results.bandLabel} ${a.band.join(' · ')}`] : [];
    return inflationReport({ island: strings, common: exportStrings, state: settled, answer, decimals, lines: [a.headline, ...a.sentences, ...band], method: a.method });
  }
  const report = printedReport();

  function downloadSpreadsheet() {
    const answer = shownAnswer();
    if (!answer) return;
    const sheets = inflationSheets({
      island: strings,
      common: exportStrings,
      state: settled,
      answer,
      decimals,
      date: isoDate(),
      page: `${window.location.origin}${window.location.pathname}`,
    });
    downloadWorkbook(sheets, 'inflation');
    track('free_inflation_exported', { format: 'xlsx' });
  }

  function printPage() {
    track('free_inflation_exported', { format: 'pdf' });
    printResults();
  }


  function reset() {
    const blank = toForm(start, numberLocale);
    setForm(blank);
    setSettled(start);
    setSettledForm(blank);
    setHistoryOpen(false);
    track('free_inflation_reset');
  }

  const num = (n: number) => n.toLocaleString(numberLocale);
  const country = form.country ? countryByCode.get(form.country) ?? null : null;
  const question =
    form.mode === 'past' && pastByHistory && country
      ? country.code === EURO_AREA ? strings.questions.pastEuroArea : t(strings.questions.pastCountry, { country: country.name })
      : strings.questions[form.mode];

  // The starting figures are an example until one of them is changed.
  const pristine = !hasErrors && isPristineState(toState(form, settled, numberLocale), defaultCurrency, defaultCountry);

  const toolReady = useToolReady();
  return (
    <AmountLocaleContext.Provider value={amountLocale}>
    <NumberLocaleContext.Provider value={numberLocale}>
    <ChartWordsContext.Provider value={exportStrings.chart}>
    <ErrorLeadContext.Provider value={exportStrings.fieldError}>
    <UnreadableContext.Provider value={exportStrings.fieldUnreadable}>
    <div className="ifc-root" {...heldUntilReady(toolReady)}>
      <form className="ifc-form" onSubmit={(e) => e.preventDefault()} aria-label={strings.formLabel}>
        <div className="ifc-formHead">
          <p className="ifc-example">{pristine ? strings.example : ''}</p>
          <button type="button" className="btn btn--quiet ifc-reset" onClick={reset} data-attr="free-inflation-reset">
            {strings.actions.reset}
          </button>
        </div>
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
                  <option key={c.code} value={c.code}>{strings.currencies[c.code] ?? c.label}</option>
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
            fold={form.mode !== 'past'}
            open={historyOpen || formState === 'error'}
            onToggle={setHistoryOpen}
            narrow={narrow}
            numberLocale={numberLocale}
            onCountry={chooseCountry}
            onUse={(avg) => {
              setForm((f) => ({ ...f, rate: formatForInput(round2(avg), numberLocale) }));
              track('free_inflation_average_used');
            }}
          />
        </div>

      </form>

      <Results
        strings={strings}
        state={settled}
        withheld={withheld}
        invalid={hasErrors}
        country={settled.country ? countryByCode.get(settled.country) ?? null : null}
        series={seriesFor(settled.country)}
        historyStatus={historyState(settled.country)}
        narrow={narrow}
        numberLocale={numberLocale}
      />

      <ToolExport
        strings={exportStrings}
        share={
          <button type="button" className="btn btn--outline" onClick={copyShareLink} aria-disabled={waiting || undefined} data-attr="free-inflation-share">
            <SwapLabel label={strings.actions.copy} alternate={strings.actions.copied} swapped={copied} />
          </button>
        }
        xlsxAttr="free-inflation-export-xlsx"
        pdfAttr="free-inflation-export-pdf"
        ready={exportReady}
        settling={waiting && !hasErrors && shownAnswer() !== null}
        onSpreadsheet={downloadSpreadsheet}
        onPrint={printPage}
      />

      {report && !withheld && <ToolReport report={report} strings={exportStrings} locale={amountLocale ?? numberLocale} />}
    </div>
    </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
    </ChartWordsContext.Provider>
    </NumberLocaleContext.Provider>
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
  const unreadable = useContext(UnreadableContext);
  const hintId = `${props.id}-hint`;
  const errorId = `${props.id}-error`;
  const describedBy = [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ifc-field">
      <label className="ifc-label" htmlFor={props.id}>{props.label}</label>
      <div className={`ifc-inputWrap${props.unit ? ' ifc-inputWrap--unit' : ''}`}>
        <input
          {...markerSelect}
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
        {props.error && <span className="ifc-error" id={errorId}><ErrorText>{props.value.trim() === '?' ? unreadable : props.error}</ErrorText></span>}
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
  fold,
  open,
  onToggle,
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
  /** Folded behind one row that names the country: every question but "Past to today", which needs it. */
  fold: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
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

  const content = (
    <>
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
                ? t(country.code === EURO_AREA ? h.chartLabelEuroArea : h.chartLabel, {
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
              {/* Drawn as one short line per year where two columns do not fit
                  (tool-recordTable in global.css); the roles keep it a table
                  for a screen reader. */}
              <table className="ifc-table tool-recordTable" role="table">
                <caption>{country.code === EURO_AREA ? h.tableCaptionEuroArea : t(h.tableCaption, { country: country.name })}</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">{h.tableYear}</th>
                    <th scope="col" role="columnheader">{h.tableRate}</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {allYears(series)
                    .reverse()
                    .map((y) => (
                      <tr key={y} role="row">
                        <th scope="row" role="rowheader" data-label={h.tableYear}>{y}</th>
                        <td role="cell" data-label={h.tableRate}>{y in series ? pct(series[y], numberLocale, 2) : h.tableNone}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </>
  );
  if (!fold) return <div className="ifc-history">{content}</div>;
  return (
    <details className="ifc-history ifc-history--fold" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="ifc-historySummary disclosure">
        <span className="ifc-historyTitle">{h.label}</span>
        <span className="ifc-historyStatus">{country ? country.name : h.none}</span>
      </summary>
      <div className="ifc-historyFold">{content}</div>
    </details>
  );
}

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
  // Text follows the reader's text size (#676): the plot keeps its height
  // while the labels fit beside each other, and grows only as far as two
  // labels a line apart need; the margins grow with the labels.
  const svgRef = useRef<SVGSVGElement>(null);
  const { rem } = useChartRem(svgRef, W);
  const fs = 0.875 * rem;
  const fmt = (v: number) => pct(v, numberLocale, 0);
  const yLabels = [top, 0, ...(bottom < 0 ? [bottom] : [])];
  const labelW = Math.max(...yLabels.map((v) => textWidth(fmt(v), fs)));
  // Tall enough that the labels at the top, zero and the bottom sit at least
  // 1.4 label heights apart.
  const plotH = Math.max(narrow ? 110 : 130, (1.4 * fs * (top - bottom)) / (bottom < 0 ? Math.min(top, -bottom) : top));
  const PAD = { top: Math.max(10, Math.ceil(0.6 * fs)), right: 8, bottom: Math.max(30, Math.ceil(1.9 * fs)), left: Math.max(narrow ? 52 : 60, Math.ceil(labelW + 0.6 * fs)) };
  const H = PAD.top + plotH + PAD.bottom;
  const plotW = W - PAD.left - PAD.right;
  const bw = plotW / Math.max(1, years.length);
  const y = (v: number) => PAD.top + ((top - Math.max(bottom, Math.min(top, v))) / (top - bottom)) * plotH;
  const zero = y(0);
  const first = years[0];
  const last = years[years.length - 1];
  // The first and last years, while both fit along the foot; the last alone otherwise.
  const yearW = textWidth(String(last), fs);
  const bothYears = 2 * yearW + fs <= W - PAD.left;
  return (
    <figure className="ifc-bars">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${Math.ceil(H)}`} role="img" aria-label={label} className="ifc-barsSvg" style={{ '--chart-fs': `${fs}px` } as React.CSSProperties}>
        <line className="ifc-gridLine" x1={PAD.left} x2={W - PAD.right} y1={y(top)} y2={y(top)} />
        {bottom < 0 && <line className="ifc-gridLine" x1={PAD.left} x2={W - PAD.right} y1={y(bottom)} y2={y(bottom)} />}
        <text className="ifc-axis" x={PAD.left - 0.5 * fs} y={y(top) + 0.35 * fs} textAnchor="end">{fmt(top)}</text>
        <text className="ifc-axis" x={PAD.left - 0.5 * fs} y={zero + 0.35 * fs} textAnchor="end">{fmt(0)}</text>
        {bottom < 0 && <text className="ifc-axis" x={PAD.left - 0.5 * fs} y={y(bottom) + 0.35 * fs} textAnchor="end">{fmt(bottom)}</text>}
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
        {bothYears && <text className="ifc-axis" x={PAD.left} y={H - 0.5 * fs} textAnchor="start">{first}</text>}
        <text className="ifc-axis" x={W - PAD.right} y={H - 0.5 * fs} textAnchor="end">{last}</text>
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
  /** The answer as a number: an amount, or for "keeping up" the real rate in % a year. */
  value: number;
  sentences: string[];
  band: string[];
  method: string;
  points: { x: number; value: number }[];
  /** A sentence the announcement must not leave out: the answer allowed for a change of currency. */
  announceMore?: string;
  calendar: boolean;
  chartTitle: string;
  axis: string;
}

/** When a change took effect, as far as its source says: "on 5 March 1993", "in July 1995", "during 1999". */
function changeDate(on: NonNullable<CurrencyChange['on']>, r: Strings['results']): string {
  if (on.month === undefined) return t(r.changedDuring, { year: on.year });
  if (on.day === undefined) return t(r.changedIn, { month: r.monthsAlone[on.month - 1], year: on.year });
  return t(r.changedOn, { day: on.day, month: r.monthsWithDay[on.month - 1], year: on.year });
}

/** The euro area's figures run back to 1960; euro notes and coins came in 2002. */
const EURO_AREA = 'EMU';
const EURO_BEGAN = 1999;
const EURO_CASH = 2002;

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
    const average = (Math.pow(factor, 1 / span) - 1) * 100;
    // The amounts are the country's own money only when the calculator is in
    // its currency. Then every change of unit after the first year matters
    // (currencyChanges.ts): the typed amount is read as money of that year,
    // and the answer and the chart are given in today's unit, the one the
    // symbol stands for. The note says so, and gives the other reading.
    const changes = country!.currency === code ? (() => { const c = currencyChangesBetween(country!.code, from, to); return [...c.crossed, ...c.later]; })() : [];
    const unit = changes.reduce((r, c) => r * c.ratio, 1);
    const value = (A * factor) / unit;
    const plain = (n: number) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 6 }).format(n);
    // The first year can be the very year a change took effect, when both
    // monies were in use (#619). The amount is read by the year the table
    // files the change under, and the note gives what the figures can say.
    const mixed = country!.currency === code ? mixedYearChange(country!.code, from) : null;
    // The euro area as a whole, before euro notes and coins: the typed number
    // was nobody's euros, so it is shown as a plain amount.
    const beforeEuroCash = country!.code === EURO_AREA && country!.currency === code && from < EURO_CASH;
    // Across a change the typed amount was not today's money, so it carries no symbol.
    const shownAmount = changes.length > 0 || beforeEuroCash ? plain(A) : amount;
    const sentences = [
      t(country!.code === EURO_AREA ? r.pastEuroArea : changes.length > 0 ? r.pastCountryOld : r.pastCountry, { country: country!.name, amount: shownAmount, from, result: aboutText(value, code, strings, amountLocale), to }),
    ];
    let announceMore: string | undefined;
    const say = (note: string) => {
      sentences.push(note);
      announceMore = announceMore ? `${announceMore} ${note}` : note;
    };
    // In the order the money changed: the first year's own change, then any later one.
    if (mixed?.on && mixed.year === from) {
      // Read as the money that change brought in: the other reading is one more division.
      const up = mixed.ratio < 1;
      say(t(up ? r.mixedYearUp : r.mixedYear, {
        country: country!.name,
        changeDate: changeDate(mixed.on, r),
        ratio: plain(up ? 1 / mixed.ratio : mixed.ratio),
        oldResult: aboutText(value / mixed.ratio, code, strings, amountLocale),
        year: from,
      }));
    }
    if (changes.length > 0) {
      const unconverted = aboutText(A * factor, code, strings, amountLocale);
      say(
        changes.length === 1
          ? unit < 1
            ? // One pound became two dollars: said that way round, not "0.5 units became 1".
              t(r.currencyChangedUp, { country: country!.name, year: changes[0].year, ratio: plain(1 / unit), from, unconverted })
            : t(r.currencyChanged, { country: country!.name, year: changes[0].year, ratio: plain(unit), from, unconverted })
          : t(r.currencyChangedMore, { country: country!.name, years: changes.map((c) => c.year).join(', '), ratio: plain(unit), from, unconverted }),
      );
    }
    // Filed under the next year, so the note above reads the amount as the old money.
    if (mixed?.on && mixed.year !== from) say(t(r.mixedYearBefore, { changeDate: changeDate(mixed.on, r), year: from }));
    if (beforeEuroCash) {
      say(t(from < EURO_BEGAN ? r.euroBefore1999 : r.euro1999to2001, { from }));
    }
    // Said as a fall when prices fell, never "rose about -28%", and over one
    // year without "those 1 year" or an average equal to the total (#868).
    const fell = factor < 1;
    const change = { total: pct(Math.abs(factor - 1) * 100, numberLocale, 0), years: yearsPhrase(span, strings, numberLocale), average: pct(Math.abs(average), numberLocale, 1) };
    sentences.push(t(span === 1 ? (fell ? r.pastCountryFallOneYear : r.pastCountryRiseOneYear) : fell ? r.pastCountryFall : r.pastCountryRise, change));
    return {
      headline: aboutText(value, code, strings, amountLocale),
      value,
      sentences,
      announceMore,
      band: [],
      method: r.methodHistory,
      points: historyPath(series, from, A).map((p) => ({ x: p.year, value: p.value / unit })),
      calendar: true,
      chartTitle: t(strings.chart.title.past, { amount: shownAmount }),
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
      value: same ? 0 : real,
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
    value,
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
  withheld,
  invalid,
  country,
  series,
  historyStatus,
  narrow,
  numberLocale,
}: {
  strings: Strings;
  state: ToolState;
  withheld: boolean;
  /** Invalid now, which is announced; `withheld` lasts until the corrected answer is there. */
  invalid: boolean;
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
  const announceText = result === 'loading' ? '' : t(strings.results.announce, { headline: result.headline, sentence: result.announceMore ? `${result.sentences[0]} ${result.announceMore}` : result.sentences[0] });
  useEffect(() => {
    if (state === firstState.current || !announceText) return;
    setAnnouncement(announceText);
    // A new answer only: the text follows the state, not every render.
  }, [state, historyStatus]);
  // What was said before the form went wrong is not said again as it returns.
  useEffect(() => {
    if (withheld) setAnnouncement('');
  }, [withheld]);

  return (
    <section className="ifc-results" aria-labelledby="ifc-results-h">
      <h2 id="ifc-results-h" className="ifc-resultsTitle">{strings.results.heading}</h2>
      <span className="ifc-srOnly" aria-live="polite">{withheld ? '' : announcement}</span>
      <ResultAnnouncement text={invalid ? strings.results.fix : ''} delay={WITHHELD_SAID_AFTER} />
      <Withheld reason={withheld ? (invalid ? strings.results.fix : '') : null}>
      {result === 'loading' ? (
        <p className="ifc-note" role="status">{strings.history.loading}</p>
      ) : (
        <div className="ifc-resultBody">
          <div className="ifc-answer">
            <p className="ifc-headline"><Amounts>{result.headline}</Amounts></p>
            {result.sentences.map((s, i) => (
              <p key={i} className={i === 0 ? 'ifc-sentence' : 'ifc-note'}><Amounts>{s}</Amounts></p>
            ))}
            {result.band.length > 0 && (
              <p className="ifc-band">
                <span className="ifc-bandLabel">{strings.results.bandLabel}</span>{' '}
                {result.band.map((b, i) => (
                  <span key={i} className="ifc-bandItem">
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {/* The ends of the range are compared, so they share one size. */}
                    <Amounts shared={longestAmount(...result.band)}>{b}</Amounts>
                  </span>
                ))}
              </p>
            )}
            <p className="ifc-method"><Amounts>{result.method}</Amounts></p>
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
      </Withheld>
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
  const { amountLocale } = useMoney();
  const amounts = useChartAmounts();
  const titleId = useId();
  const descId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const W = narrow ? 360 : 760;
  // Text follows the reader's text size (#676): `rem` drawing units make one
  // rem on screen. The plot keeps its height; gridlines thin out so their
  // labels stay apart, and the margins grow with the labels.
  const { rem } = useChartRem(svgRef, W);
  const fs = 0.875 * rem;
  const BASE = narrow ? { top: 14, right: 18, bottom: 54 } : { top: 18, right: 28, bottom: 58 };
  const plotH = (narrow ? 210 : 300) - BASE.top - BASE.bottom;
  const values = points.map((p) => p.value);
  const maxV = Math.max(0, ...values);
  const drawn = points.length >= 2 && Number.isFinite(maxV) && maxV < DISPLAY_CEILING;
  const { top, step, count } = niceSteps(drawn ? maxV : 1, Math.min(narrow ? 4 : 5, plotH / (1.8 * fs)));
  // The axis names its unit once, above the chart, and its gridlines carry
  // bare numbers; the left margin is as wide as those numbers are drawn (#521).
  const unit = amounts.axis(top, code);
  const yTicks = Array.from({ length: count + 1 }, (_, i) => i * step);
  const tickText = yTicks.map((v) => unit.tick(v));
  const margin = useAxisMargin(
    svgRef,
    '.ifc-axisAmount',
    { estimate: Math.max(...tickText.map((s) => textWidth(s, fs))), gap: fs, least: narrow ? 18 : 28, width: W, right: BASE.right },
  );
  const titleWords = axis.split(/\s+/).filter(Boolean);
  const measured = useMeasuredText(svgRef, titleWords.map((w) => ({ cls: 'ifc-axis ifc-axisTitle', text: w, size: fs })));
  const titleWidth = (line: string) =>
    line.split(' ').reduce((sum, w) => sum + measured.width({ cls: 'ifc-axis ifc-axisTitle', text: w, size: fs }), 0) + (line.split(' ').length - 1) * 0.3 * fs;
  const titleLines = wrapWords(axis, W - 8, titleWidth);
  const titleFit = Math.min(1, (W - 4) / Math.max(1, ...titleLines.map(titleWidth)));
  if (points.length < 2) return null;
  if (!drawn) {
    return (
      <figure className="ifc-figure">
        <figcaption className="ifc-chartTitle"><Amounts>{title}</Amounts></figcaption>
        <p className="ifc-note">{strings.chart.tooLarge}</p>
      </figure>
    );
  }
  const PAD = {
    // A label drawn above its gridline needs its whole line height above the plot.
    top: Math.max(BASE.top, Math.ceil((margin.inside ? 1.4 : 0.8) * fs)),
    right: BASE.right,
    bottom: Math.max(BASE.bottom, Math.ceil((2.6 + 1.2 * titleLines.length) * fs)),
    left: margin.left,
  };
  const H = PAD.top + plotH + PAD.bottom;
  const plotW = W - PAD.left - PAD.right;
  const x0 = points[0].x;
  const x1 = points[points.length - 1].x;
  const span = Math.max(1, x1 - x0);
  const px = (x: number) => PAD.left + ((x - x0) / span) * plotW;
  const py = (v: number) => PAD.top + (1 - v / top) * plotH;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r1(px(p.x))},${r1(py(p.value))}`).join(' ');
  const area = `${line} L${r1(px(x1))},${r1(py(0))} L${r1(px(x0))},${r1(py(0))} Z`;
  const maxTicks = narrow ? 4 : 8;
  const xStep = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= maxTicks && (s / span) * plotW >= textWidth(String(x1), fs) + fs) ?? 100;
  const xCandidates: number[] = [];
  for (let x = Math.ceil(x0 / xStep) * xStep; x <= x1; x += xStep) xCandidates.push(x);
  // Labels that would touch, or run past the drawing, are left out.
  const xTicks = placeLabels(xCandidates.map(px), xCandidates.map((x) => textWidth(String(x), fs)), 2, W - 2, 0.6 * fs)
    .map(({ i, anchor }) => ({ x: xCandidates[i], anchor }));
  const titleHalf = (titleFit * Math.max(1, ...titleLines.map(titleWidth))) / 2 + 2;
  const titleX = Math.round(Math.min(Math.max(PAD.left + plotW / 2, titleHalf), W - titleHalf));
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
      <figcaption className="ifc-chartTitle" id={titleId}><Amounts>{title}</Amounts></figcaption>
      <ChartUnit>{unit.heading}</ChartUnit>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${Math.ceil(H)}`} role="img" aria-labelledby={titleId} aria-describedby={descId} className="ifc-chart" style={{ '--chart-fs': `${fs}px` } as React.CSSProperties}>
        <desc id={descId}>{desc}</desc>
        <MeasureSamples list={measured.list} />
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line className={v === 0 ? 'ifc-axisLine' : 'ifc-gridLine'} x1={PAD.left} x2={W - PAD.right} y1={r1(py(v))} y2={r1(py(v))} />
            {margin.inside
              ? v > 0 && <text className="ifc-axis ifc-axisAmount" x={PAD.left + 6} y={r1(py(v) - 0.3 * fs)} textAnchor="start">{unit.tick(v)}</text>
              : <text className="ifc-axis ifc-axisAmount" x={r1(PAD.left - 0.6 * fs)} y={r1(py(v) + 0.35 * fs)} textAnchor="end">{unit.tick(v)}</text>}
          </g>
        ))}
        {xTicks.map(({ x, anchor }) => (
          <text key={`x${x}`} className="ifc-axis" x={r1(px(x))} y={r1(H - PAD.bottom + 1.4 * fs)} textAnchor={anchor}>
            {x}
          </text>
        ))}
        <text className="ifc-axis ifc-axisTitle" x={titleX} y={r1(H - PAD.bottom + 3.0 * fs)} textAnchor="middle" style={titleFit < 1 ? { fontSize: `${fs * titleFit}px` } : undefined} visibility={titleFit < FIT_FLOOR ? 'hidden' : undefined}>
          {titleLines.map((l, i) => <tspan key={i} x={titleX} dy={i === 0 ? 0 : r1(1.2 * fs)}>{l}</tspan>)}
        </text>
        <path className="ifc-area" d={area} />
        <path className="ifc-line" d={line} />
        <circle className="ifc-dot" cx={r1(px(start.x))} cy={r1(py(start.value))} r="5" />
        <circle className="ifc-dot" cx={r1(px(end.x))} cy={r1(py(end.value))} r="5" />
      </svg>
    </figure>
  );
}

// The parts of the page, for their own tests: each can be mounted or called
// without the whole calculator around it. The page itself uses only the
// default export.
export {
  Field, HistoryBars, HistoryPanel, LineChart, Results,
  aboutText, allYears, changeDate, computeAnswer, defaultFrom, effectiveFrom, fromYearsFor, loadHistory, niceScale,
  pct, typedAmount, usePhone, yearsPhrase,
};
