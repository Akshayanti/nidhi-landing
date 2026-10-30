import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CURRENCIES } from '../utils/loan/math.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { AmountLocaleContext } from './useMoney.ts';
import { formatForInput } from '../utils/shared/parseLocaleNumber.ts';
import { arrivedByLanguageSwitch, publishToolState } from '../utils/shared/toolState.ts';
import { parseAmount, parsePercent, type Series } from '../utils/inflation/math.ts';
import { fromCompact, type CompactHistory, type CompactSeries } from '../utils/inflation/history.ts';
import {
  HORIZONS,
  MAX_AMOUNT,
  MAX_DEBT_RATE,
  MAX_FEE_PCT,
  MAX_INFLATION,
  MAX_MONTHS,
  REAL_RETURN_BOTTOM,
  REAL_RETURN_TOP,
  RETURN_CHOICES,
  compare,
  compareRange,
  inflationDefault,
  inputProblem,
  rates,
  returnNote,
  toReal,
  type Horizon,
  type Inputs,
  type Result,
  type ReturnChoice,
} from '../utils/invest-or-pay-off/math.ts';
import { SHARED_STATE_GLOBAL, decodeState, defaultState, publishableState, type ToolState } from '../utils/invest-or-pay-off/url.ts';
import { format } from '../i18n/format.ts';
import { plural } from '../i18n/plural.ts';
import type { Dict } from '../i18n/strings/types.ts';
import { ToolExport, ToolReport } from './ToolExport.tsx';
import { downloadWorkbook, isoDate, printResults } from '../utils/shared/exportFile.ts';
import { investOrPayOffSheets, type ShownComparison } from '../utils/invest-or-pay-off/export.ts';
import { investOrPayOffReport } from '../utils/invest-or-pay-off/report.ts';
import type { CountryOption } from './InflationCalculator.tsx';

// ===========================================================================
// Copy
//
// Every word this island draws comes in through `strings`, one locale's slice
// of the catalog that `InvestOrPayOffPage.astro` hands it, never `dict(locale)`.
//
// The form reuses the inflation calculator's field styles (.ifc-*), so the
// tools read as one family; what is this tool's own is .iop-*.
// ===========================================================================

type Strings = Dict['tools']['investOrPayOff']['island'];
type ExportStrings = Dict['tools']['export'];

const t = format;

/**
 * PostHog telemetry. Generic events only (council, Oct 30, 2026): never a
 * country, currency, return choice, relief, warning or any value typed.
 */
function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* never let analytics throw block UI updates */
  }
}

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

function pct(v: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v / 100);
}

/** "in 2 years and 4 months", from a month count. */
function whenText(months: number, strings: Strings, locale: string): string {
  const w = strings.results.when;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const pick = <T,>(n: number, forms: { one: T; few: T; other: T }) => plural(locale, n, forms.one, forms.few, forms.other);
  if (y === 0) return t(pick(m, w.months), { n: m });
  if (m === 0) return t(pick(y, w.years), { n: y });
  return t(w.yearsMonths, { years: t(pick(y, w.yearsPart), { n: y }), months: t(pick(m, w.monthsPart), { n: m }) });
}

// ===========================================================================
// Form state: inputs are kept as strings so a field can be empty while typing.
// ===========================================================================

type TextKey = 'balance' | 'debtRate' | 'payment' | 'extra' | 'relief' | 'inflation' | 'ownReturn' | 'feePct' | 'gainsTax';

interface FormState extends Record<TextKey, string> {
  currency: string;
  country: string;
  returns: ReturnChoice;
  horizon: Horizon;
}

function toForm(s: ToolState, locale: string): FormState {
  const f = (n: number) => formatForInput(n, locale);
  return {
    currency: s.currency,
    country: s.country,
    returns: s.returns,
    horizon: s.horizon,
    balance: f(s.balance),
    debtRate: f(s.debtRate),
    payment: f(s.payment),
    extra: f(s.extra),
    relief: f(s.relief),
    inflation: s.inflation === null ? '' : f(s.inflation),
    ownReturn: f(s.ownReturn),
    feePct: f(s.feePct),
    gainsTax: f(s.gainsTax),
  };
}

const PERCENT_LIMITS: Record<'debtRate' | 'relief' | 'inflation' | 'ownReturn' | 'feePct' | 'gainsTax', [number, number]> = {
  debtRate: [0, MAX_DEBT_RATE],
  relief: [0, 100],
  inflation: [-99.99, MAX_INFLATION],
  ownReturn: [-99.99, MAX_INFLATION],
  feePct: [0, MAX_FEE_PCT],
  gainsTax: [0, 100],
};

function parseField(key: TextKey, raw: string, locale: string): number | null {
  if (key === 'balance' || key === 'payment' || key === 'extra') return parseAmount(raw, locale);
  const [min, max] = PERCENT_LIMITS[key];
  return parsePercent(raw, min, max, locale);
}

/** Which fields do not parse. An empty inflation field means "the country's figure". */
function fieldErrors(f: FormState, locale: string): Partial<Record<TextKey, boolean>> {
  const keys: TextKey[] = ['balance', 'debtRate', 'payment', 'extra', 'relief', 'feePct', 'gainsTax'];
  if (f.returns === 'own') keys.push('ownReturn');
  if (f.inflation.trim() !== '') keys.push('inflation');
  const out: Partial<Record<TextKey, boolean>> = {};
  for (const k of keys) if (parseField(k, f[k], locale) === null) out[k] = true;
  return out;
}

function toState(f: FormState, prev: ToolState, locale: string): ToolState {
  const n = (k: TextKey, d: number) => parseField(k, f[k], locale) ?? d;
  return {
    currency: f.currency,
    country: f.country,
    returns: f.returns,
    horizon: f.horizon,
    balance: n('balance', prev.balance),
    debtRate: n('debtRate', prev.debtRate),
    payment: n('payment', prev.payment),
    extra: n('extra', prev.extra),
    relief: n('relief', prev.relief),
    inflation: f.inflation.trim() === '' ? null : n('inflation', prev.inflation ?? 0),
    ownReturn: n('ownReturn', prev.ownReturn),
    feePct: n('feePct', prev.feePct),
    gainsTax: n('gainsTax', prev.gainsTax),
  };
}

function toInputs(s: ToolState, inflation: number): Inputs {
  const { currency: _c, country: _n, inflation: _i, ...rest } = s;
  return { ...rest, inflation };
}

// ===========================================================================
// Main component
// ===========================================================================

export default function InvestOrPayOff({
  strings,
  exportStrings,
  defaultCurrency,
  defaultCountry,
  countries,
  initialHistory,
  historyUrl,
  latestYear,
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
  /** The newest year in the whole inflation data set, so a stale country gets no default. */
  latestYear: number;
  numberLocale: string;
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
  const calculatedSent = useRef(false);
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const countryByCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  // Click data, recorded only with cookie consent, must not say which return
  // setting or comparison date was picked, or that a figure was typed
  // (council, Oct 30, 2026). So the form is marked ph-no-capture, its choices
  // carry no click labels, and heatmaps, which record where a click lands and
  // ignore ph-no-capture, are paused on this page, as the learning path's
  // helper does. Analytics.astro reads the same flag if PostHog loads later.
  useEffect(() => {
    window.nidhiHeatmapsPaused = true;
    const ph = window.posthog;
    if (ph && ph.__loaded && typeof ph.set_config === 'function') ph.set_config({ enable_heatmaps: false });
  }, []);

  // Shared links carry the state after the #. ToolStateGuard, in the page
  // head, moved it out of the address bar into a window property before
  // analytics started; it is read from there, never from window.location.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const decoded = typeof raw === 'string' ? decodeState(raw) : null;
    setHydrated(true);
    if (!decoded) return;
    const shared = { ...decoded, country: countryByCode.has(decoded.country) ? decoded.country : '' };
    setForm(toForm(shared, numberLocale));
    setSettled(shared);
    if (arrivedByLanguageSwitch()) return;
    track('free_invest_or_pay_off_shared_view_opened', {
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, [countryByCode, numberLocale]);

  // Keeps what is on screen where the header's language switch can find it
  // (after the #, at click time). Never the address.
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

  const seriesFor = (code: string): Series | null => (code && compact[code] ? fromCompact(compact[code]) : null);
  const historyState = (code: string): 'none' | 'loading' | 'ready' | 'error' =>
    !code ? 'none' : compact[code] ? 'ready' : historyFailed ? 'error' : 'loading';

  const errors = fieldErrors(form, numberLocale);
  const hasErrors = Object.keys(errors).length > 0;

  // Recalculate a moment after typing stops, and only on valid input.
  useEffect(() => {
    if (hasErrors) return;
    const timer = window.setTimeout(() => setSettled((prev) => toState(form, prev, numberLocale)), 250);
    return () => window.clearTimeout(timer);
  }, [form, hasErrors, numberLocale]);

  // The inflation the comparison uses: what the reader typed, else the
  // country's ten-year figure. Null means there is none yet.
  const settledSeries = seriesFor(settled.country);
  const settledDefault = settledSeries ? inflationDefault(settledSeries, latestYear) : null;
  const inflation = settled.inflation ?? settledDefault?.average ?? null;
  const inputs = inflation === null ? null : toInputs(settled, inflation);
  const problem = inputs ? inputProblem(inputs) : null;

  const computed = useMemo(() => {
    if (!inputs || problem) return null;
    const result = compare(inputs);
    const note = returnNote(inputs);
    const range = note === 'above-range' ? compareRange(inputs) : null;
    return { result, note, range, rates: rates(inputs) };
    // `inputs` is rebuilt every render; its JSON is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(inputs), problem]);

  useEffect(() => {
    if (!computed || calculatedSent.current) return;
    calculatedSent.current = true;
    track('free_invest_or_pay_off_calculated');
  }, [computed]);

  const update = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  function chooseCountry(code: string) {
    const option = countryByCode.get(code);
    setForm((f) => ({ ...f, country: code, inflation: '', currency: option?.currency ?? f.currency }));
  }

  function copyShareLink() {
    if (hasErrors) return;
    const state = publishableState(toState(form, settled, numberLocale), defaultCurrency, defaultCountry);
    const utm = 'utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=invest_or_pay_off';
    const url = `${window.location.origin}${window.location.pathname}?${utm}${state ? `#${state}` : ''}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      },
      () => window.prompt(strings.actions.copyPrompt, url),
    );
    track('free_invest_or_pay_off_share_copied');
  }

  function reset() {
    setForm(toForm(start, numberLocale));
    setSettled(start);
    track('free_invest_or_pay_off_reset');
  }

  // A true minus sign, which never breaks from its amount at the end of a line.
  const money = (v: number) => formatAmount(v, settled.currency, false, amountLocale).replace(/^-/, '\u2212');
  const settledCountry = settled.country ? countryByCode.get(settled.country) ?? null : null;

  function shown(): ShownComparison | null {
    if (!computed || !inputs || inflation === null) return null;
    return {
      inputs,
      result: computed.result,
      range: computed.range,
      inflationSource: settled.inflation === null && settledDefault && settledCountry
        ? t(strings.country.average, { country: settledCountry.name, first: settledDefault.first, last: settledDefault.last, avg: pct(settledDefault.average, numberLocale, 2) })
        : null,
      lines: resultLines(computed.result, strings, numberLocale, money),
    };
  }
  const shownNow = shown();
  const decimals = Math.round(Math.log10(CURRENCIES.find((c) => c.code === settled.currency)?.factor ?? 100));

  function downloadSpreadsheet() {
    if (!shownNow) return;
    const sheets = investOrPayOffSheets({
      island: strings,
      common: exportStrings,
      currency: settled.currency,
      shown: shownNow,
      decimals,
      date: isoDate(),
      page: `${window.location.origin}${window.location.pathname}`,
    });
    downloadWorkbook(sheets, 'invest-or-pay-off');
    track('free_invest_or_pay_off_exported', { format: 'xlsx' });
  }

  function printPage() {
    track('free_invest_or_pay_off_exported', { format: 'pdf' });
    printResults();
  }

  const report = shownNow
    ? investOrPayOffReport({ island: strings, common: exportStrings, currency: settled.currency, shown: shownNow, decimals })
    : null;

  // What the inflation panel says about the country being picked.
  const formSeries = seriesFor(form.country);
  const formDefault = formSeries ? inflationDefault(formSeries, latestYear) : null;
  const formCountry = form.country ? countryByCode.get(form.country) ?? null : null;
  const formHistory = historyState(form.country);
  const ownReal = (() => {
    const own = parseField('ownReturn', form.ownReturn, numberLocale);
    const inf = form.inflation.trim() === '' ? formDefault?.average ?? null : parseField('inflation', form.inflation, numberLocale);
    return own === null || inf === null ? null : toReal(own, inf);
  })();
  const formNote =
    form.returns === 'own' && ownReal !== null ? (ownReal > REAL_RETURN_TOP + 1e-9 ? 'above' : ownReal < -1e-9 ? 'below' : null) : null;
  const num = (n: number) => n.toLocaleString(numberLocale);

  return (
    <AmountLocaleContext.Provider value={amountLocale}>
    <div className="ifc-root iop-root">
      <form className="ifc-form ph-no-capture" onSubmit={(e) => e.preventDefault()} aria-label={strings.formLabel}>
        <fieldset className="iop-section">
          <legend className="iop-legend">{strings.sections.debt}</legend>
          <div className="ifc-grid">
            <div className="ifc-field">
              <label className="ifc-label" htmlFor={id('currency')}>{strings.fields.currency}</label>
              <select
                id={id('currency')}
                className="ifc-input"
                value={form.currency}
                onChange={(e) => {
                  const currency = e.target.value;
                  setForm((f) => ({ ...f, currency }));
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}: {strings.currencies[c.code] ?? c.label}</option>
                ))}
              </select>
              <div className="ifc-fieldNote" />
            </div>
            <Field id={id('balance')} label={strings.fields.balance} value={form.balance} onChange={update('balance')} error={errors.balance ? t(strings.fields.amountError, { max: num(MAX_AMOUNT) }) : null} inputMode="decimal" />
            <Field id={id('debtRate')} label={strings.fields.debtRate} value={form.debtRate} onChange={update('debtRate')} hint={strings.fields.debtRateHint} error={errors.debtRate ? t(strings.fields.percentError, { min: 0, max: num(MAX_DEBT_RATE) }) : null} inputMode="decimal" unit="%" />
            <Field id={id('payment')} label={strings.fields.payment} value={form.payment} onChange={update('payment')} error={errors.payment ? t(strings.fields.amountError, { max: num(MAX_AMOUNT) }) : null} inputMode="decimal" />
          </div>
          <Field id={id('relief')} label={strings.fields.relief} value={form.relief} onChange={update('relief')} hint={strings.fields.reliefHint} error={errors.relief ? t(strings.fields.percentError, { min: 0, max: 100 }) : null} inputMode="decimal" unit="%" />
        </fieldset>

        <fieldset className="iop-section">
          <legend className="iop-legend">{strings.sections.extra}</legend>
          <Field id={id('extra')} label={strings.fields.extra} value={form.extra} onChange={update('extra')} hint={strings.fields.extraHint} error={errors.extra ? t(strings.fields.amountError, { max: num(MAX_AMOUNT) }) : null} inputMode="decimal" />
        </fieldset>

        <fieldset className="iop-section">
          <legend className="iop-legend">{strings.sections.inflation}</legend>
          <div className="ifc-grid">
            <div className="ifc-field">
              <label className="ifc-label" htmlFor={id('country')}>{strings.fields.country}</label>
              <select id={id('country')} className="ifc-input" value={form.country} onChange={(e) => chooseCountry(e.target.value)}>
                <option value="">{strings.fields.countryNone}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div className="ifc-fieldNote" />
            </div>
            <Field
              id={id('inflation')}
              label={strings.fields.inflation}
              value={form.inflation}
              placeholder={form.inflation.trim() === '' && formDefault ? formatForInput(Math.round(formDefault.average * 100) / 100, numberLocale) : undefined}
              onChange={update('inflation')}
              hint={strings.fields.inflationHint}
              error={errors.inflation ? t(strings.fields.percentError, { min: num(-99.99), max: num(MAX_INFLATION) }) : null}
              inputMode="text"
              unit="%"
            />
          </div>
          <div className="iop-countryNote" aria-live="polite">
            {formCountry && formHistory === 'loading' && <p className="ifc-hint">{strings.country.loading}</p>}
            {formCountry && formHistory === 'error' && <p className="ifc-hint">{strings.country.error}</p>}
            {formCountry && formHistory === 'ready' && !formDefault && <p className="ifc-hint">{t(strings.country.noDefault, { country: formCountry.name })}</p>}
            {formCountry && formDefault && (
              <p className="ifc-hint">
                {t(strings.country.average, { country: formCountry.name, first: formDefault.first, last: formDefault.last, avg: pct(formDefault.average, numberLocale, 2) })}{' '}
                {formDefault.fiveYear !== null
                  ? t(strings.country.context, { five: pct(formDefault.fiveYear, numberLocale, 2), last: formDefault.last, latest: pct(formDefault.latest, numberLocale, 2) })
                  : t(strings.country.contextNoFive, { last: formDefault.last, latest: pct(formDefault.latest, numberLocale, 2) })}
                {form.inflation.trim() !== '' && (
                  <>
                    {' '}
                    <button type="button" className="iop-linkBtn" onClick={() => setForm((f) => ({ ...f, inflation: '' }))}>
                      {strings.fields.useCountry}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="iop-section">
          <legend className="iop-legend">{strings.sections.invest}</legend>
          <div className="iop-choices" role="radiogroup" aria-label={strings.returns.legend}>
            {RETURN_CHOICES.map((choice) => (
              <label key={choice} className="iop-choice">
                <input
                  type="radio"
                  name={id('returns')}
                  value={choice}
                  checked={form.returns === choice}
                  onChange={() => setForm((f) => ({ ...f, returns: choice }))}
                />
                <span className="iop-choiceText">
                  <span className="iop-choiceLabel">{strings.returns[choice].label}</span>
                  <span className="ifc-hint">{t(strings.returns[choice].desc, { rate: choice === 'own' ? '' : pct(rates({ ...toInputs(settled, 0), returns: choice }).investReal, numberLocale) })}</span>
                </span>
              </label>
            ))}
          </div>
          {form.returns === 'own' && (
            <>
              <Field id={id('ownReturn')} label={strings.fields.ownReturn} value={form.ownReturn} onChange={update('ownReturn')} hint={strings.fields.ownReturnHint} error={errors.ownReturn ? t(strings.fields.percentError, { min: num(-99.99), max: num(MAX_INFLATION) }) : null} inputMode="text" unit="%" />
              <div className="iop-returnNote" aria-live="polite">
                {formNote === 'above' && ownReal !== null && <p className="iop-note">{t(strings.returns.above, { real: pct(ownReal, numberLocale), low: REAL_RETURN_BOTTOM, top: REAL_RETURN_TOP })}</p>}
                {formNote === 'below' && ownReal !== null && <p className="iop-note">{t(strings.returns.below, { real: pct(ownReal, numberLocale) })}</p>}
                {formNote === null && ownReal !== null && <p className="ifc-hint">{t(strings.returns.realIs, { real: pct(ownReal, numberLocale) })}</p>}
              </div>
            </>
          )}
          <div className="ifc-grid">
            <Field id={id('feePct')} label={strings.fields.fee} value={form.feePct} onChange={update('feePct')} error={errors.feePct ? t(strings.fields.percentError, { min: 0, max: num(MAX_FEE_PCT) }) : null} inputMode="decimal" unit="%" />
            <Field id={id('gainsTax')} label={strings.fields.gainsTax} value={form.gainsTax} onChange={update('gainsTax')} hint={strings.fields.gainsTaxHint} error={errors.gainsTax ? t(strings.fields.percentError, { min: 0, max: 100 }) : null} inputMode="decimal" unit="%" />
          </div>
        </fieldset>

        <fieldset className="iop-section">
          <legend className="iop-legend">{strings.horizons.legend}</legend>
          <div className="iop-choices" role="radiogroup" aria-label={strings.horizons.legend}>
            {HORIZONS.map((h) => (
              <label key={h} className="iop-choice">
                <input
                  type="radio"
                  name={id('horizon')}
                  value={h}
                  checked={form.horizon === h}
                  onChange={() => setForm((f) => ({ ...f, horizon: h }))}
                />
                <span className="iop-choiceLabel">{strings.horizons[h]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="ifc-actions">
          <button type="button" className="ifc-btn ifc-btn--ghost" onClick={reset}>
            {strings.actions.reset}
          </button>
          <span className="ifc-hint">{hasErrors ? strings.results.fix : ''}</span>
        </div>
      </form>

      <section className={`ifc-results iop-results${hasErrors ? ' ifc-results--stale' : ''}`} aria-labelledby={id('results')} aria-live="polite">
        <h2 id={id('results')} className="ifc-resultsTitle">{strings.results.heading}</h2>
        {inflation === null && <p className="iop-note">{strings.country.needed}</p>}
        {problem && <p className="iop-note">{t(strings.problems[problem], { years: MAX_MONTHS / 12 })}</p>}
        {computed && (
          <Results
            strings={strings}
            result={computed.result}
            range={computed.range}
            ownReal={settled.returns === 'own' && inflation !== null ? toReal(settled.ownReturn, inflation) : null}
            debtReal={computed.rates.debtReal}
            investReal={computed.rates.investReal}
            numberLocale={numberLocale}
            money={money}
          />
        )}
      </section>

      <ToolExport
        strings={exportStrings}
        share={
          <span className="iop-share">
            <button type="button" className="ifc-btn" onClick={copyShareLink} disabled={hasErrors} data-attr="free-invest-or-pay-off-share">
              {copied ? strings.actions.copied : strings.actions.copy}
            </button>
            <span className="ifc-hint">{strings.actions.shareNote}</span>
          </span>
        }
        xlsxAttr="free-invest-or-pay-off-export-xlsx"
        pdfAttr="free-invest-or-pay-off-export-pdf"
        ready={!hasErrors && shownNow !== null}
        onSpreadsheet={downloadSpreadsheet}
        onPrint={printPage}
      />

      {report && <ToolReport report={report} strings={exportStrings} locale={amountLocale ?? numberLocale} />}
    </div>
    </AmountLocaleContext.Provider>
  );
}

/** The result in sentences, as the page says it and the files repeat it. */
export function resultLines(r: Result, strings: Strings, locale: string, money: (v: number) => string): string[] {
  const s = strings.results;
  const when = whenText(r.months, strings, locale);
  const investAhead = Math.round(r.bAhead * 100);
  const even = r.diff.p10 === 0 && r.diff.p90 === 0;
  return [
    t(s.on, { when }),
    even ? s.shareEven : t(s.share, { invest: investAhead, payoff: 100 - investAhead }),
    t(s.gap, { p10: money(r.diff.p10), p50: money(r.diff.p50), p90: money(r.diff.p90) }),
    t(s.avoided, { amount: money(r.interestAvoided), today: money(r.interestAvoidedToday) }),
  ];
}

function Results({
  strings,
  result: r,
  range,
  ownReal,
  debtReal,
  investReal,
  numberLocale,
  money,
}: {
  strings: Strings;
  result: Result;
  range: { cautious: Result; optimistic: Result } | null;
  ownReal: number | null;
  debtReal: number;
  investReal: number;
  numberLocale: string;
  money: (v: number) => string;
}) {
  const s = strings.results;
  const lines = resultLines(r, strings, numberLocale, money);
  const paths = [
    { key: 'a', name: s.payoffPath, p: r.a, paid: r.payoffMonthA, owed: 0, interest: r.interestA },
    { key: 'b', name: s.investPath, p: r.b, paid: r.payoffMonthB, owed: r.remainingB, interest: r.interestB },
  ];
  return (
    <div className="iop-answer">
      <p className="ifc-headline iop-headline">{lines[1]}</p>
      <p>{lines[0]} {lines[2]}</p>
      <p className="ifc-hint">{s.gapNote}</p>

      <div className="iop-paths">
        {paths.map((p) => (
          <div key={p.key} className="iop-path">
            <h3 className="iop-pathName">{p.name}</h3>
            <p className="ifc-hint">{s.netWealth}</p>
            <p className="iop-pathRange">{t(s.range, { p10: money(p.p.p10), p90: money(p.p.p90) })}</p>
            <p className="iop-pathMiddle">{t(s.middle, { p50: money(p.p.p50) })}</p>
            <ul className="iop-pathFacts">
              <li>{t(p.paid <= r.months ? s.paidIn : s.paidAfter, { when: whenText(p.paid, strings, numberLocale) })}</li>
              {p.owed > 0 && <li>{t(s.stillOwed, { amount: money(p.owed) })}</li>}
              <li>{t(s.interest, { amount: money(p.interest) })}</li>
            </ul>
          </div>
        ))}
      </div>

      <RangeChart strings={strings} paths={paths.map((p) => ({ name: p.name, p: p.p }))} money={money} />

      <p>{lines[3]}</p>
      <p className="ifc-hint">{t(s.rates, { debt: pct(debtReal, numberLocale), invest: pct(investReal, numberLocale) })}</p>

      {range && ownReal !== null && (
        <div className="iop-side">
          <h3 className="iop-pathName">{s.side.heading}</h3>
          <table className="iop-table">
            <caption className="ifc-hint">{s.side.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{s.side.figure}</th>
                <th scope="col">{s.side.invest}</th>
                <th scope="col">{s.side.gap}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: t(s.side.yours, { rate: pct(ownReal, numberLocale) }), res: r },
                { label: t(s.side.cautious, { rate: pct(REAL_RETURN_BOTTOM, numberLocale) }), res: range.cautious },
                { label: t(s.side.optimistic, { rate: pct(REAL_RETURN_TOP, numberLocale) }), res: range.optimistic },
              ].map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{Math.round(row.res.bAhead * 100)}</td>
                  <td>{money(row.res.diff.p50)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Each path's net wealth from the 10th to the 90th scenario, with the middle
 * marked, on one scale that spans both ranges (and zero, when a range goes
 * below it). Both paths are drawn the same way, so neither looks like the
 * answer. Plain HTML bars, so the labels are text at the page's size on any
 * screen; the bars are hidden from screen readers, which read the same
 * figures from the list.
 */
function RangeChart({ strings, paths, money }: { strings: Strings; paths: { name: string; p: Result['a'] }[]; money: (v: number) => string }) {
  const s = strings.results;
  const low = Math.min(...paths.map((p) => p.p.p10));
  const high = Math.max(...paths.map((p) => p.p.p90));
  const span = Math.max(high - low, Math.abs(high) * 0.05, 1);
  const lo = low < 0 && high > 0 ? low - span * 0.05 : low - span * 0.15;
  const hi = high + span * 0.05;
  const at = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(2)}%`;
  return (
    <figure className="iop-chart" data-attr="free-invest-or-pay-off-chart">
      <figcaption className="ifc-hint">{s.chartTitle}</figcaption>
      <ul className="iop-chartRows">
        {paths.map((p) => (
          <li key={p.name} className="iop-chartRow">
            <span className="iop-chartLabel">{t(s.chartLabel, { path: p.name, p10: money(p.p.p10), p50: money(p.p.p50), p90: money(p.p.p90) })}</span>
            <span className="iop-track" aria-hidden="true">
              {lo < 0 && hi > 0 && <span className="iop-zero" style={{ left: at(0) }} />}
              <span className="iop-bar" style={{ left: at(p.p.p10), width: `calc(${at(p.p.p90)} - ${at(p.p.p10)})` }} />
              <span className="iop-mid" style={{ left: at(p.p.p50) }} />
            </span>
          </li>
        ))}
      </ul>
    </figure>
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
  unit?: string;
  placeholder?: string;
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
          type="text"
          inputMode={props.inputMode}
          autoComplete="off"
          value={props.value}
          placeholder={props.placeholder}
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

