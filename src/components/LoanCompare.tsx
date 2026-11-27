import { useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  equityAtMonth,
  amountNumberLocale,
  formatApr,
  formatMoney,
  getCurrency,
  pickSplitSamples,
  pointsBreakEven,
  pointsVerdict,
  refinanceComparison,
  type RefinanceComparison,
  toMinor,
  type AmortizationRow,
  type LoanResult,
  isNotPaidOff,
  shownMonths,
  MAX_TERM_MONTHS,
} from '../utils/loan/math.ts';
import {
  DEFAULT_VENDORS,
  MAX_VENDORS,
  MIN_VENDORS,
  VENDOR_LABELS,
  canonicalLumpSums,
  displayLumpSums,
  defaultGlobalState,
  decodeFromQueryString,
  encodeSharedState,
  isPristineState,
  makeAddedVendor,
  makeDefaultVendor,
  publishableState,
  readSharedState,
  SHARED_STATE_GLOBAL,
  type AnalysisTab,
  type GlobalState,
  type VendorInput,
} from '../utils/loan/url.ts';
import { AmountLocaleContext, useMoney } from './useMoney.ts';
import { longestAmount } from '../utils/shared/amountUnits.ts';
import { Amount, Amounts, SharedAmounts } from './Amounts.tsx';
import { ChartUnit, ChartWordsContext, useAxisMargin, useChartAmounts } from './ChartAmounts.tsx';
import { FIT_FLOOR, niceSteps, placeLabels, textWidth, useChartRem, wrapWords } from './chart/useChartRem.ts';
import { MeasureSamples, useMeasuredText } from './chart/MeasuredText.tsx';
import { readsAsZero } from '../utils/shared/chartAmounts.ts';
import { arrivedByLanguageSwitch, publishToolState } from '../utils/shared/toolState.ts';
import { LocaleNumberInput, NumberLocaleContext } from './LocaleNumberInput.tsx';
import { ChartReadout, ReadoutSlot, useChartPointer, useEscapeToClose, useReadoutPlacement, useReadoutSlot } from './chart/ChartReadout.tsx';
import {
  computeFromInput,
  loanFromInput,
  computeNoPointsBaseline,
  isUnreadable,
  OPTIONAL_UNREADABLE,
  parseNumber,
  pointsCostAboveFee,
  fixedPeriodFault,
  missingRateChangeFields,
  unreadableOptionalFields,
  type OptionalField,
  comparisonWithheld,
  holdsMarker,
} from '../utils/loan/inputs.ts';
import { CHART_SERIES, CHART_SERIES_ON } from '../styles/palette.ts';
import { MarkerGlyph, SeriesMarker } from './chart/SeriesMarker.tsx';
import { format } from '../i18n/format.ts';
import { plural } from '../i18n/plural.ts';
import type { Dict } from '../i18n/strings/types.ts';
import { SwapLabel, ToolExport, ToolReport } from './ToolExport.tsx';
import { downloadWorkbook, isoDate, printResults } from '../utils/shared/exportFile.ts';
import { loanSheets } from '../utils/loan/export.ts';
import { engineNote } from '../utils/loan/notes.ts';
import { loanReport } from '../utils/loan/report.ts';
import { ErrorLeadContext, ErrorText, heldUntilReady, LinkField, ResultAnnouncement, type Notice, UnreadableContext, useSteadyAbove, useToolReady, Withheld, WITHHELD_SAID_AFTER } from './toolShared.tsx';

/**
 * The tool's words, for one locale.
 *
 * A type and not a function: the catalog is indexed at runtime, so reaching for
 * `dict(locale)` in here would put every language and every tool into this
 * chunk to render one calculator. The page reads its own locale's slice and
 * passes it down as `strings`.
 */
type Strings = Dict['tools']['loanComparison']['island'];

/**
 * A count of months the way this language writes it.
 *
 * The engine's `formatMonths` returns English ("3 yr 6 mo"), and its unit
 * tests in `src/utils/loan/math.test.ts` pin those exact bytes; nothing else
 * calls it. The phrasing lives here so the engine stays language-free. Same
 * branches, same output in English; Hindi marks the singular on the month only.
 */
function months(count: number, s: Strings['months']): string {
  if (!Number.isFinite(count) || count <= 0) return s.na;
  const y = Math.floor(count / 12);
  const m = count % 12;
  if (y === 0) return m === 1 ? s.one : format(s.some, { m });
  const years = y === 1 ? s.year : format(s.years, { y });
  if (m === 0) return years;
  if (m === 1) return format(s.yearsAndMonth, { years });
  return format(s.yearsSome, { years, m });
}

/**
 * The payoff of an offer whose payment is kept at the rate change: the month
 * and how it compares with the entered term, or that the loan is not paid off
 * and why. Every sentence is whole in the catalog; the counts of months are
 * written as the tool writes them everywhere else.
 */
function payoffText(r: LoanResult, s: Strings): { value: string; hint?: string } {
  const kept = r.keptPayment;
  if (!kept) return { value: months(r.months, s.months) };
  if (kept.outcome === 'never') {
    return {
      value: s.results.notPaidOff,
      hint: format(kept.covers === 'equal' ? s.results.notPaidEqual : s.results.notPaidLess, { month: kept.fromMonth ?? r.rateChange?.month ?? 0 }),
    };
  }
  if (kept.outcome === 'limit') {
    return { value: s.results.beyondLimit, hint: format(s.results.beyondLimitNote, { limit: months(MAX_TERM_MONTHS, s.months) }) };
  }
  const term = months(kept.termMonths, s.months);
  const gap = r.months - kept.termMonths;
  return {
    value: format(s.results.payoffMonth, { month: r.months }),
    hint:
      gap === 0
        ? format(s.results.payoffOnTerm, { term })
        : format(gap > 0 ? s.results.payoffLater : s.results.payoffEarlier, { n: months(Math.abs(gap), s.months), term }),
  };
}

/** What stands where a total would: no finite total when the loan is never paid off, not available when the calculation stopped at its limit. */
function noTotalText(r: LoanResult, s: Strings): string {
  return r.keptPayment?.outcome === 'never' ? s.results.noFiniteTotal : s.results.notAvailable;
}

/**
 * An APR as the tool prints it. `formatApr` writes an undefined APR (a fee
 * that swallows the loan) as the English "n/a"; the tool says it in the
 * reader's language instead.
 */
function aprText(apr: number, currency: string, s: Strings, amountLocale: string | null): string {
  return Number.isFinite(apr) ? formatApr(apr, amountNumberLocale(currency, amountLocale)) : s.results.aprNa;
}

/**
 * The default names `makeDefaultVendor` writes ("Vendor A" to "Vendor E"),
 * each paired with its letter. Share links carry these exact spellings.
 */
const DEFAULT_NAMES = new Map<string, string>(
  VENDOR_LABELS.map((label, i) => [makeDefaultVendor(i).name, label]),
);

/**
 * A vendor's name as the tool shows it in legends, headers, menus and readouts.
 *
 * The name is the reader's own text and is shown as typed, with one exception:
 * an untouched default is shown in the reader's language, so a Hindi page does
 * not label its charts in English. The letter comes from the name and not the
 * slot, because removing a card shifts the ones after it up while their names
 * stay put ("Vendor C" can sit in slot B). The stored name, and so the share
 * link, does not change. An empty name falls back to the slot's own letter.
 */
/** Whether the reader typed this name: not empty, and not an untouched default. */
function isTypedName(name: string): boolean {
  return name.trim() !== '' && !DEFAULT_NAMES.has(name);
}

function shownName(name: string, index: number, s: Strings): string {
  const label = name ? DEFAULT_NAMES.get(name) : VENDOR_LABELS[index] ?? VENDOR_LABELS[0];
  return label ? format(s.card.badge, { label }) : name;
}

/**
 * How the engine's English messages are recognised. Each phrase occurs in
 * exactly one message, so the order does not decide a match; the
 * `engineError` test in `src/utils/loan/math.test.ts` reads every message
 * `src/utils/loan/math.ts` can return and checks that each one is claimed by
 * one phrase. The engine computes schedules and knows nothing about
 * languages; it writes these sentences in English, and the tool shows the
 * reader's language instead.
 *
 * The match is on the message as the engine wrote it, never on what the reader
 * sees, so the analytics classifier below buckets the same way in every locale.
 */
export const ENGINE_PHRASES: [phrase: string, key: keyof Strings['engine']['errors']][] = [
  // `buildSchedule` / `buildScheduleAdvanced`.
  ['does not amortize within', 'notAmortizing'],
  ['principal must be greater than zero', 'principal'],
  ['monthly payment must be greater than zero', 'payment'],
  ['does not even cover the first month', 'belowInterest'],
  ['term must be at least one month', 'term'],
  // `computeLoan`'s input checks.
  ['enter a loan amount greater than zero', 'amount'],
  ['loan amount is too large', 'amountMax'],
  ['loan is too small for this term', 'tooSmall'],
  ['monthly payment only covers the interest', 'interestOnly'],
  ['enter a non-negative interest rate', 'rate'],
  ['initial fixed period must be a whole number', 'initialFixed'],
  ['enter a term of at least one month', 'termMin'],
  ['term cannot exceed', 'termMax'],
  ['enter a monthly payment greater than zero', 'paymentEnter'],
  ['loans need a fixed term', 'hybridMode'],
  // `refinanceComparison`.
  ['refinance month must be at least', 'refiMonth'],
  ['refinance month must be before', 'refiMonthEnd'],
  ['new rate must be non-negative', 'refiRate'],
  ['new term must be at least', 'refiTerm'],
  ['no remaining balance at the refinance', 'refiBalance'],
  ['new loan is not valid', 'newLoan'],
  ['original loan is invalid', 'refiOriginal'],
  // `computeFromInput` (src/utils/loan/inputs.ts).
  ['optional boxes cannot be read', 'optionalUnreadable'],
  ['points cost is more than the fee', 'pointsAboveFee'],
  ['changing offer needs both of its boxes', 'rateChangeIncomplete'],
  // `computeLoan` and `computeFromInput`.
  ['lump sum needs a whole month', 'lumpMonth'],
];

/** The two messages that carry a count of months, which goes back in as `{months}`. */
const WITH_MONTHS = new Set<keyof Strings['engine']['errors']>(['notAmortizing', 'termMax']);

/**
 * The engine's message in the reader's language, with its numbers put back.
 *
 * A message the engine grows later matches no phrase and comes through
 * unchanged: a visible English sentence, which is what to show rather than an
 * empty box. Nothing here is analytics-facing; the caller still passes the raw
 * message to `track()`.
 */
export function engineError(raw: string, s: Strings): string {
  const key = engineErrorKey(raw);
  if (!key) return raw;
  if (WITH_MONTHS.has(key)) {
    const matched = /(\d+)/.exec(raw);
    return format(s.engine.errors[key], { months: matched ? matched[1] : '' });
  }
  return s.engine.errors[key];
}

/** Which of the engine's messages this is, by the catalog key of its translation. */
export function engineErrorKey(raw: string): keyof Strings['engine']['errors'] | undefined {
  const lower = raw.toLowerCase();
  return ENGINE_PHRASES.find(([phrase]) => lower.includes(phrase))?.[1];
}

/**
 * The engine's notes on a result, addressed the same way. The exports carry
 * the same sentences, so the reading of them is theirs too (`notes.ts`).
 */
function engineWarning(raw: string, s: Strings): string {
  return engineNote(raw, s.engine.warnings);
}

// -----------------------------------------------------------------------------
// PostHog telemetry helper.
//
// Pageviews are auto-captured by the inline init in BaseHead.astro
// (`capture_pageview: true`), so this component never fires a pageview
// itself. We only emit explicit `capture` calls for in-component
// interactions where the analytical value is high and the privacy cost is
// low (no principal, no rates, no fees, no user-typed vendor names).
//
// PostHog's capture call works regardless of cookie-consent state. What's
// gated on consent is `autocapture` (the auto-watching of clicks on
// elements with `data-attr`). Explicit captures here therefore work for
// both consented and anonymous users, and we keep the property payloads
// strictly non-PII so that's safe.
// -----------------------------------------------------------------------------
// The PostHog object on `window` is declared once, in the types file under src/types/.

function track(event: string, properties?: Record<string, unknown>) {
  // Stryker disable next-line StringLiteral: equivalent. Without a window the call below throws a ReferenceError that the catch swallows, so returning early and not returning look the same to every caller.
  if (typeof window === 'undefined') return;
  try {
    // Stryker disable next-line OptionalChaining: equivalent. Without the analytics library, or without its send method, the call as written stops quietly and the mutant throws a TypeError that the catch swallows, so nothing is sent and nothing breaks either way.
    window.posthog?.capture?.(event, properties);
  } catch {
    /* never let analytics throw block UI updates */
  }
}


// VENDOR_COLORS is intentionally kept here, not in loanCompareUrl.ts:
// it's a UI-only concern (how vendors render in the grid and chart) and
// has no place in URL state. Indices align with VENDOR_LABELS A-E. The
// values come from CHART_SERIES (single source of truth in palette.ts);
// we slice the first 5 because the loan grid maxes out at 5 vendors.
// Stryker disable next-line MethodExpression: equivalent. There are at most five offers (MAX_VENDORS), so no colour past the fifth is ever read.
const VENDOR_COLORS = CHART_SERIES.slice(0, 5);
// The ink for a label painted on an offer's colour (the principal bars).
// Stryker disable next-line MethodExpression: equivalent. There are at most five offers (MAX_VENDORS), so no ink past the fifth is ever read.
const VENDOR_INKS = CHART_SERIES_ON.slice(0, 5);

// ---- Chart -----------------------------------------------------------------

interface ChartProps {
  results: LoanResult[];
  colors: string[];
  vendorNames: string[];
  currency: string;
  strings: Strings;
}

// Dash patterns tell vendors apart when their lines run close together,
// independent of colour. Indices align with VENDOR_LABELS A-E.
const VENDOR_DASHES = ['', '9 5', '2 4', '12 4 2 4', '5 5'];

const BW = 760;
// The plot keeps this height at every text size; the bands for the labels
// around it grow with the text (#676). The left margin is measured from the
// gridline numbers as drawn (`useAxisMargin`).
const BPAD_BASE = { top: 24, right: 28, bottom: 56 };
const BPLOT_H = 400 - BPAD_BASE.top - BPAD_BASE.bottom;

function BalanceChart({ results, colors, vendorNames, currency, strings }: ChartProps) {
  const { formatAmount, formatMoney } = useMoney();
  const chartAmounts = useChartAmounts();
  const titleId = useId();
  const descId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Stryker disable next-line ArrayDeclaration: any list that never changes keeps the same function, as the empty one does.
  const close = useCallback(() => setHover(null), []);
  useEscapeToClose(hover !== null, close);

  // `rows` is the part of the schedule the chart draws: all of it, except for
  // a loan that is never paid off (see `shownMonths`). `open` marks a line
  // with no payoff to mark.
  const valid = results
    .map((r, i) => ({ r, i, name: vendorNames[i] }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0)
    .map((x) => ({ ...x, rows: x.r.schedule.slice(0, shownMonths(results, x.i)), open: isNotPaidOff(x.r) ? x.r.keptPayment!.outcome : null }));

  const factor = getCurrency(currency).factor;
  const maxMonths = valid.length ? Math.max(...valid.map(({ rows }) => rows.length)) : 1;
  // Text follows the reader's text size: `rem` drawing units make one rem on screen.
  const { rem, scale: textScale } = useChartRem(svgRef, BW);
  const fs = 0.875 * rem;
  const margin = useAxisMargin(svgRef, '.lc-balanceAmount', { estimate: textWidth('000.0', fs), gap: fs, least: 32, width: BW, right: BPAD_BASE.right });
  const measured = useMeasuredText(svgRef, strings.balance.axisYears.split(/\s+/).filter(Boolean).map((w) => ({ cls: 'lc-chartTick lc-chartAxisTitle', text: w, size: fs })));
  const titleWidth = (line: string) =>
    line.split(' ').reduce((sum, w) => sum + measured.width({ cls: 'lc-chartTick lc-chartAxisTitle', text: w, size: fs }), 0) + (line.split(' ').length - 1) * 0.3 * fs;
  const titleLines = wrapWords(strings.balance.axisYears, BW - 8, titleWidth);
  const titleFit = Math.min(1, (BW - 4) / Math.max(1, ...titleLines.map(titleWidth)));
  const BPAD = {
    top: Math.max(BPAD_BASE.top, Math.ceil((margin.inside ? 1.4 : 0.8) * fs)),
    right: BPAD_BASE.right,
    bottom: Math.max(BPAD_BASE.bottom, Math.ceil((2.6 + 1.2 * titleLines.length) * fs)),
    left: margin.left,
  };
  const BH = BPAD.top + BPLOT_H + BPAD.bottom;
  const BPLOT_W = BW - BPAD.left - BPAD.right;
  const x = (m: number) => BPAD.left + (m / Math.max(maxMonths, 1)) * BPLOT_W;
  const cardLeft = useReadoutPlacement(figureRef, svgRef, cardRef, hover === null ? null : x(hover) / BW, (BW - BPAD.right) / BW);
  const slot = useReadoutSlot(cardRef, hover !== null);
  // This chart scrolls sideways on a phone, so a sideways drag is a scroll: a
  // finger picks a point with a tap.
  const pointer = useChartPointer(monthAt, setHover, false);

  if (valid.length === 0) {
    return <p className="lc-chartEmpty">{strings.balance.empty}</p>;
  }

  // Balance (in major units) and interest paid so far, for month m (0 = start).
  const series = valid.map(({ rows: shown, i, name, open }) => {
    const start = (shown[0].balance + shown[0].principal) / factor;
    const balance = [start];
    const interest = [0];
    let paid = 0;
    for (const row of shown) {
      balance.push(row.balance / factor);
      paid += row.interest;
      interest.push(paid / factor);
    }
    return { i, name, balance, interest, payoff: shown.length, open, color: colors[i], dash: VENDOR_DASHES[i] ?? '' };
  });
  const at = (s: (typeof series)[number], m: number) => ({
    // Past the end of a paid-off loan the balance is nothing; a line with no
    // payoff keeps its last balance.
    balance: m < s.balance.length ? s.balance[m] : s.open ? s.balance[s.balance.length - 1] : 0,
    interest: s.interest[Math.min(m, s.interest.length - 1)],
  });

  // Gridlines thin out as the text grows, so their labels stay apart.
  const { top, step: yStep, count: yCount } = niceSteps(Math.max(...series.map((s) => (s.open ? Math.max(...s.balance) : s.balance[0]))), Math.min(6, BPLOT_H / (1.8 * fs)));
  const y = (v: number) => BPAD.top + (1 - v / top) * BPLOT_H;
  const path = (vals: number[]) => vals.map((v, m) => `${m === 0 ? 'M' : 'L'}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const years = maxMonths / 12;
  const baseStep = years <= 10 ? 1 : years <= 30 ? 5 : 10;
  const yearStep = [1, 2, 5, 10, 20].filter((s) => s >= baseStep)
    .find((s) => ((s * 12) / Math.max(maxMonths, 1)) * BPLOT_W >= textWidth(String(Math.floor(years)), fs) + fs) ?? 20;
  const xCandidates: number[] = [];
  for (let yr = 0; yr * 12 <= maxMonths; yr += yearStep) xCandidates.push(yr);
  const xTicks = placeLabels(xCandidates.map((yr) => x(yr * 12)), xCandidates.map((yr) => textWidth(String(yr), fs)), 2, BW - 2, 0.6 * fs)
    .map(({ i, anchor }) => ({ yr: xCandidates[i], anchor }));
  // Minor gridlines go first as the text grows: none from twice the default size.
  const minor = textScale < 2;
  const xMinor: number[] = [];
  if (minor && yearStep > 1) for (let yr = 1; yr * 12 < maxMonths; yr++) if (yr % yearStep !== 0) xMinor.push(yr);
  const yTicks = Array.from({ length: yCount + 1 }, (_, t) => t * yStep);
  const yMinor = minor ? Array.from({ length: yCount }, (_, t) => (t + 0.5) * yStep) : [];
  const titleHalf = (titleFit * Math.max(1, ...titleLines.map(titleWidth))) / 2 + 2;
  const titleX = Math.round(Math.min(Math.max(BPAD.left + BPLOT_W / 2, titleHalf), BW - titleHalf));
  // The axis names its unit once, above the chart; its gridlines carry bare numbers.
  const unit = chartAmounts.axis(top, currency);

  const ariaSummary =
    strings.balance.ariaPrefix +
    series
      .map((s) =>
        format(s.open === 'never' ? strings.balance.seriesLineNotPaid : s.open === 'limit' ? strings.balance.seriesLineBeyond : strings.balance.seriesLine, {
          name: s.name,
          amount: formatAmount(s.balance[0], currency),
          months: months(s.payoff, strings.months),
        }),
      )
      .join(' ');

  function monthAt(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * BW;
    if (vx < BPAD.left - 12 || vx > BW - BPAD.right + 12) return null;
    return Math.max(0, Math.min(maxMonths, Math.round(((vx - BPAD.left) / BPLOT_W) * maxMonths)));
  }
  // Arrow keys move a year at a time (a month with Shift); Home and End jump.
  function onKey(e: React.KeyboardEvent) {
    const stepM = e.shiftKey ? 1 : 12;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = hover === null ? 0 : Math.min(maxMonths, hover + stepM);
    else if (e.key === 'ArrowLeft') next = hover === null ? maxMonths : Math.max(0, hover - stepM);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = maxMonths;
    else if (e.key === 'Escape') {
      // Stryker disable next-line CallExpression: equivalent. While the read-out is open the window listener of useEscapeToClose closes it on Escape as well, and while it is closed there is nothing to close.
      setHover(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setHover(next);
    }
  }

  const when = (m: number) => {
    const yr = Math.floor(m / 12);
    const mo = m % 12;
    if (m === 0) return strings.balance.start;
    if (mo === 0) return format(strings.balance.year, { y: yr });
    return yr === 0
      ? format(strings.balance.month, { m: mo })
      : format(strings.balance.yearMonth, { y: yr, m: mo });
  };
  const rows =
    hover === null
      ? []
      : series.map((s) => {
          const v = at(s, hover);
          return {
            label: s.name,
            value:
              v.balance <= 0
                ? format(strings.balance.paidOff, {
                    interest: formatAmount(v.interest, currency),
                  })
                : format(strings.balance.left, {
                    balance: formatAmount(v.balance, currency),
                    interest: formatAmount(v.interest, currency),
                  }),
            swatch: 'dot' as const,
            color: s.color,
          };
        });
  const announce =
    hover === null ? '' : `${when(hover)}. ` + rows.map((r) => `${r.label}: ${r.value}.`).join(' ');

  return (
    <figure className="lc-balanceFigure" ref={figureRef} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }}>
      <figcaption className="lc-balanceLegend">
        {series.map((s) => (
          <span key={s.i} className="lc-legendItem">
            <svg className="lc-legendLine" viewBox="0 0 28 10" aria-hidden="true">
              <line x1="1" y1="7" x2="39" y2="7" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} strokeLinecap="round" />
              <MarkerGlyph index={s.i} cx={20} cy={7} r={5} color={s.color} halo="var(--color-bg-white)" />
            </svg>
            {s.name}
            <span className="lc-legendNote">
              {s.open === 'never'
                ? strings.balance.legendNotPaid
                : s.open === 'limit'
                  ? strings.balance.legendBeyond
                  : format(strings.balance.legendNote, { months: months(s.payoff, strings.months) })}
            </span>
          </span>
        ))}
      </figcaption>
      <ChartUnit>{unit.heading}</ChartUnit>
      <p className="chart-swipe" aria-hidden="true">{strings.balance.swipe}</p>
      <div className="lc-chartScroll">
        <div
          className="lc-chartBox"
          tabIndex={0}
          role="group"
          aria-label={strings.balance.groupAria}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <svg
            ref={svgRef}
            className="lc-chart"
            viewBox={`0 0 ${BW} ${Math.ceil(BH)}`}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
            style={{ '--chart-fs': `${fs}px` } as React.CSSProperties}
            {...pointer}
          >
            <title id={titleId}>{strings.balance.title}</title>
            <desc id={descId}>{ariaSummary}</desc>
            <MeasureSamples list={measured.list} />
            <rect className="lc-plotBg" x={BPAD.left} y={BPAD.top} width={BPLOT_W} height={BPLOT_H} rx="6" />
            {yMinor.map((t) => (
              <line key={`ym${t}`} className="lc-gridMinor" x1={BPAD.left} x2={BW - BPAD.right} y1={y(t)} y2={y(t)} />
            ))}
            {xMinor.map((yr) => (
              <line key={`xm${yr}`} className="lc-gridMinor" x1={x(yr * 12)} x2={x(yr * 12)} y1={BPAD.top} y2={BH - BPAD.bottom} />
            ))}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line className={t === 0 ? 'lc-axisLine' : 'lc-chartGrid'} x1={BPAD.left} x2={BW - BPAD.right} y1={y(t)} y2={y(t)} />
                {margin.inside
                  ? t > 0 && <text className="lc-chartTick lc-balanceAmount" x={BPAD.left + 6} y={y(t) - 0.3 * fs} textAnchor="start">{unit.tick(t)}</text>
                  : <text className="lc-chartTick lc-balanceAmount" x={BPAD.left - 0.75 * fs} y={y(t) + 0.35 * fs} textAnchor="end">{unit.tick(t)}</text>}
              </g>
            ))}
            {xCandidates.map((yr) => yr > 0 && (
              <line key={`xg${yr}`} className="lc-chartGrid" x1={x(yr * 12)} x2={x(yr * 12)} y1={BPAD.top} y2={BH - BPAD.bottom} />
            ))}
            {xTicks.map(({ yr, anchor }) => (
              <text key={`x${yr}`} className="lc-chartTick" x={x(yr * 12)} y={BH - BPAD.bottom + 1.4 * fs} textAnchor={anchor}>{yr}</text>
            ))}
            <text className="lc-chartTick lc-chartAxisTitle" x={titleX} y={BH - BPAD.bottom + 3.0 * fs} textAnchor="middle" style={titleFit < 1 ? { fontSize: `${fs * titleFit}px` } : undefined} visibility={titleFit < FIT_FLOOR ? 'hidden' : undefined}>
              {titleLines.map((l, i) => <tspan key={i} x={titleX} dy={i === 0 ? 0 : 1.2 * fs}>{l}</tspan>)}
            </text>
            {series.map((s) => (
              <path
                key={`line-${s.i}`}
                d={path(s.balance)}
                className="lc-balanceLine"
                stroke={s.color}
                strokeDasharray={s.dash}
              />
            ))}
            {series.map((s) => (
              // One marker part of the way along each line, at a different
              // place for each offer, so lines that run close together can
              // still be told apart; and one where the loan is paid off.
              <g key={`marks-${s.i}`}>
                {(() => {
                  const m = Math.round((s.payoff * (s.i + 1)) / (series.length + 1));
                  return <MarkerGlyph index={s.i} cx={x(m)} cy={y(at(s, m).balance)} r={6} color={s.color} halo="var(--color-bg-white)" />;
                })()}
                {!s.open && <MarkerGlyph index={s.i} cx={x(s.payoff)} cy={y(0)} r={6} color={s.color} halo="var(--color-bg-white)" />}
              </g>
            ))}
            {hover !== null && (
              <g pointerEvents="none">
                <line className="chart-crosshair" x1={x(hover)} x2={x(hover)} y1={BPAD.top} y2={BH - BPAD.bottom} />
                {series.map((s) => (
                  <MarkerGlyph key={`h-${s.i}`} index={s.i} cx={x(hover)} cy={y(at(s, hover).balance)} r={6.5} color={s.color} halo="var(--color-bg-white)" />
                ))}
              </g>
            )}
          </svg>
          <span className="chart-srOnly" aria-live="polite">{announce}</span>
        </div>
      </div>
      {hover !== null && <ChartReadout title={when(hover)} rows={rows} cardRef={cardRef} position={cardLeft} />}
      {hover === null && <ReadoutSlot height={slot} />}
      <p className="lc-chartHint">{strings.balance.hint}</p>
      {series.some((s) => s.open) && (
        <p className="lc-chartHint">{format(strings.balance.shownThrough, { month: maxMonths })}</p>
      )}
      {/* A table ignores width and overflow, so the visually hidden box wraps it. */}
      <div className="lc-srOnly">
        <table>
          <caption>{strings.balance.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{strings.words.month}</th>
              {valid.map(({ name, i }) => (
                <th key={i} scope="col">{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleSchedule(valid.map(({ rows: shown }) => shown), 12).map((row) => (
              <tr key={row.month}>
                <th scope="row">{row.month}</th>
                {row.values.map((v, idx) => (
                  <td key={idx}>{v == null ? strings.months.na : <Amount>{formatMoney(v, currency)}</Amount>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
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
  /** The ink for a label painted on vendorColor. */
  vendorInk: string;
  strings: Strings;
}

function SplitChart({ schedule, currency, vendorName, vendorColor, vendorInk, strings }: SplitChartProps) {
  const { formatAmount, formatMoney } = useMoney();
  const titleId = useId();
  const descId = useId();
  // Phones get a narrower drawing, so its bars stay wide enough for their
  // labels once it is scaled down to the screen.
  const phone = usePhone();
  const amounts = useChartAmounts();
  const svgRef = useRef<SVGSVGElement>(null);
  const width = phone ? 360 : 800;
  // Text follows the reader's text size (#676; council, Nov 21 2026): `rem`
  // drawing units make one rem on screen. The bars keep their height; as the
  // text grows the chart shows six sample years, then three, then two, bar
  // values that no longer fit are left off before any bar is, and the legend
  // words and the footnote wrap inside the drawing, which grows to hold them.
  const { rem } = useChartRem(svgRef, width);
  const fs = 0.875 * rem;
  const LINE = 1.2 * fs;
  const padL = phone ? 8 : 56;
  const padR = phone ? 8 : 24;
  const plotW = width - padL - padR;
  const plotH = (phone ? 330 : 360) - 56 - 64;
  const factor = getCurrency(currency).factor;
  const choices = [6, 3, 2].map((n) => pickSplitSamples(schedule.length, n));
  const candidates = [...new Set(choices.flat())].map((m) => schedule[m - 1]).filter(Boolean);
  // The chart names its unit once, in the heading above it, and the bars
  // carry bare numbers, like every other chart. Whole units while every
  // number fits its bar; otherwise one scale for the whole chart, chosen from
  // the largest payment ("Amounts in thousands of €": 1.25, 0.25).
  const whole = amounts.axis(0, currency);
  const scaled = amounts.axis(Math.max(0, ...candidates.map((r) => r.payment)) / factor, currency);
  const labelForms = (minor: number) => [whole.tick(Math.round(minor / factor)), scaled.tick(minor / factor)];
  const words = (text: string) => text.split(/\s+/).filter(Boolean);
  // How wide each label is drawn, measured in the drawing (#521, #676).
  const measured = useMeasuredText(svgRef, [
    ...candidates.flatMap((r) => [...labelForms(r.interest), ...labelForms(r.principal)]).map((text) => ({ cls: 'lc-splitValueInterest', text, size: fs })),
    ...candidates.flatMap((r) => words(formatYearLabel(r.month, strings))).map((text) => ({ cls: 'lc-splitTickX', text, size: fs })),
    ...['', ' lc-splitEyebrow--plain'].flatMap((plain) => [
      ...words(strings.split.eyebrowInterest).map((text) => ({ cls: `lc-splitEyebrowInterest${plain}`, text, size: fs })),
      ...words(strings.split.eyebrowPrincipal).map((text) => ({ cls: `lc-splitEyebrowPrincipal${plain}`, text, size: fs })),
    ]),
    ...words(strings.split.footnote).map((text) => ({ cls: 'lc-splitFootnote', text, size: fs })),
  ]);
  const widthOf = (text: string) => measured.width({ cls: 'lc-splitValueInterest', text, size: fs });
  // A line's width from its words' widths; the eyebrows' letter spacing widens their spaces.
  const lineWidth = (cls: string, line: string) => {
    const w = words(line);
    return w.reduce((sum, x) => sum + measured.width({ cls, text: x, size: fs }), 0) + (w.length - 1) * (cls.includes('Eyebrow') ? 0.45 : 0.3) * fs;
  };
  if (schedule.length === 0) {
    return (
      <p className="lc-chartEmpty">
        {strings.charts.splitEmpty}
      </p>
    );
  }

  // As many sample years as let each year's label fit its column on one line.
  const samples = choices.find((c, k) => k === choices.length - 1 || c.every((m) => lineWidth('lc-splitTickX', formatYearLabel(m, strings)) + 0.6 * fs <= plotW / c.length))!;
  const rows = samples.map((m) => schedule[m - 1]);
  // The table for screen readers keeps all six sample years whatever the
  // drawing shows: it is where the years a narrow drawing leaves out are given.
  const tableRows = choices[0].map((m) => schedule[m - 1]);

  // Bar height represents the total payment for that month. For a fully-
  // amortising fixed-rate loan all bars are the same height, which is
  // exactly the visual point. The final bar may be a few cents off due
  // to schedule reconciliation; we scale to the max anyway so any
  // reconciliation fudge is invisible.
  const maxPayment = Math.max(...rows.map((r) => r.payment));
  if (maxPayment <= 0) return null;

  // Phones: wider bars and narrower gaps, so each label fits its bar. Bars
  // widen with the text while there is room.
  const barWidth = Math.min(Math.max(70, 5 * fs), (plotW - 20) / rows.length - (phone ? 6 : 14));
  const gap = (plotW - barWidth * rows.length) / (rows.length + 1);
  const column = barWidth + gap;

  // Words that wrap: each line within `max`, and a single word wider than
  // that drawn smaller, by just enough to fit.
  const wrapped = (cls: string, text: string, max: number) => {
    const lines = wrapWords(text, max, (l) => lineWidth(cls, l));
    return { lines, fit: Math.min(1, max / Math.max(1, ...lines.map((l) => lineWidth(cls, l)))) };
  };
  // The legend words are capitals with wide spacing while they fit; when a
  // word would not, both are set in ordinary letters instead of smaller.
  const capsFit = [['lc-splitEyebrowInterest', strings.split.eyebrowInterest], ['lc-splitEyebrowPrincipal', strings.split.eyebrowPrincipal]]
    .every(([cls, text]) => words(text).every((w) => lineWidth(cls, w) <= plotW));
  const plain = capsFit ? '' : ' lc-splitEyebrow--plain';
  const eyeI = wrapped(`lc-splitEyebrowInterest${plain}`, strings.split.eyebrowInterest, plotW);
  const eyeP = wrapped(`lc-splitEyebrowPrincipal${plain}`, strings.split.eyebrowPrincipal, plotW);
  const ticks = rows.map((r) => wrapped('lc-splitTickX', formatYearLabel(r.month, strings), column - 0.4 * fs));
  const tickLines = Math.max(...ticks.map((t) => t.lines.length));
  const foot = wrapped('lc-splitFootnote', strings.split.footnote, width - 8);

  // Top to bottom: the interest legend, the bars, the principal legend, the
  // sample years and the footnote.
  const padT = Math.max(56, Math.ceil(2.6 * fs + (eyeI.lines.length - 1) * LINE));
  const eyeITop = padT - 1.45 * fs - (eyeI.lines.length - 1) * LINE;
  const plotBottom = padT + plotH;
  const eyePTop = plotBottom + 1.3 * fs;
  const tickTop = eyePTop + (eyeP.lines.length - 1) * LINE + 1.5 * fs;
  const footTop = tickTop + (tickLines - 1) * LINE + 1.6 * fs;
  const height = Math.ceil(footTop + (foot.lines.length - 1) * LINE + 0.5 * fs);

  const wholeFits = rows.every((r) => [r.interest, r.principal].every((m) => widthOf(labelForms(m)[0]) <= barWidth - 4));
  const unit = wholeFits ? whole : scaled;
  const barLabel = (minor: number) => labelForms(minor)[wholeFits ? 0 : 1];
  // A last month's few units of interest would read "0" on a chart counted in
  // thousands, or in whole units when it is under half of one. That label is
  // left off: a month that charges interest never says it charged none.
  const saysNothing = (minor: number) => readsAsZero(minor, barLabel);

  // Where each bar's two labels go. A label that would run into one already
  // placed, or into a legend line, moves to a second row inside its own
  // segment when the segment is tall enough, and is otherwise left off: the
  // table below the chart, and the schedule, still hold the figure.
  const ROW = 1.25 * fs;
  const ROOM = 2 * fs;
  // Stryker disable next-line ArrayDeclaration: equivalent. A string in the list has no box edges, so every comparison with it is false and it never stops a label being placed.
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const legendBox = (top: number, lines: string[], cls: string, fit: number) => lines.forEach((l, i) => {
    const yy = top + i * LINE;
    placed.push({ x0: padL, x1: padL + fit * lineWidth(cls, l), y0: yy - fs, y1: yy + 0.3 * fs });
  });
  legendBox(eyeITop, eyeI.lines, `lc-splitEyebrowInterest${plain}`, eyeI.fit);
  legendBox(eyePTop, eyeP.lines, `lc-splitEyebrowPrincipal${plain}`, eyeP.fit);
  const place = (text: string, cx: number, base: number, room: number, inside: boolean): number | null => {
    // Inside a bar, a label wider than the bar would run onto the next one.
    // Outside it, a label wider than the bar's own column would reach the next bar's.
    if (widthOf(text) > (inside ? barWidth - 4 : column - 2)) return null;
    const w = widthOf(text) + 4;
    for (const row of [0, 1]) {
      if (row === 1 && !(inside && room >= ROOM + ROW)) break;
      const yy = base + row * ROW;
      const box = { x0: cx - w / 2, x1: cx + w / 2, y0: yy - fs, y1: yy + 0.25 * fs };
      if (!placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1)) {
        placed.push(box);
        return yy;
      }
    }
    return null;
  };
  const labelAt = rows.map((row, idx) => {
    const cx = padL + gap + idx * column + barWidth / 2;
    const totalH = plotH * (row.payment / maxPayment);
    const interestH = totalH * (row.interest / row.payment);
    const principalH = totalH - interestH;
    const yTop = padT + (plotH - totalH);
    const yPrincipal = yTop + interestH;
    const interestInside = interestH >= ROOM;
    const principalInside = principalH >= ROOM;
    return {
      interestInside,
      principalInside,
      interest: saysNothing(row.interest) ? null : place(barLabel(row.interest), cx, interestInside ? yTop + 1.15 * fs : yTop - 0.3 * fs, interestH, interestInside),
      principal: saysNothing(row.principal) ? null : place(barLabel(row.principal), cx, principalInside ? yPrincipal + 1.3 * fs : yPrincipal + principalH + 1.15 * fs, principalH, principalInside),
    };
  });

  const ariaSummary =
    format(strings.split.ariaPrefix, { vendor: vendorName }) +
    rows
      .map((r) => {
        const pctInterest = (r.interest / r.payment) * 100;
        return format(strings.split.ariaRow, {
          when: formatYearLabel(r.month, strings),
          interest: formatMoney(r.interest, currency),
          pct: pctInterest.toFixed(0),
          principal: formatMoney(r.principal, currency),
        });
      })
      .join(' ');
  const fitStyle = (fit: number) => (fit < 1 ? { fontSize: `${fs * fit}px` } : undefined);
  // Below the floor a word is left out rather than drawn too small.
  const fitShown = (fit: number) => (fit < FIT_FLOOR ? 'hidden' : undefined);

  return (
    <>
      <ChartUnit>{unit.heading}</ChartUnit>
      <svg
        ref={svgRef}
        className="lc-splitChart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        // The name and the amounts are text inside the drawing, never an
        // attribute: a click on the chart describes its attributes to analytics.
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        style={{ '--chart-fs': `${fs}px` } as React.CSSProperties}
      >
        <title id={titleId}>{strings.split.title}</title>
        <desc id={descId}>{ariaSummary}</desc>

        {/* Every label the chart could carry, drawn unseen so each is
            measured as it would be drawn, including one that was left off. */}
        <MeasureSamples list={measured.list} />

        {/* Eyebrow legend, mirroring the blog figure */}
        <text x={padL} y={eyeITop} className={`lc-splitEyebrowInterest${plain}`} style={fitStyle(eyeI.fit)} visibility={fitShown(eyeI.fit)}>
          {eyeI.lines.map((l, i) => <tspan key={i} x={padL} dy={i === 0 ? 0 : LINE}>{l}</tspan>)}
        </text>
        <text x={padL} y={eyePTop} className={`lc-splitEyebrowPrincipal${plain}`} style={fitStyle(eyeP.fit)} visibility={fitShown(eyeP.fit)}>
          {eyeP.lines.map((l, i) => <tspan key={i} x={padL} dy={i === 0 ? 0 : LINE}>{l}</tspan>)}
        </text>

        {rows.map((row, idx) => {
          const x = padL + gap + idx * column;
          const totalH = plotH * (row.payment / maxPayment);
          const interestH = totalH * (row.interest / row.payment);
          const principalH = totalH - interestH;
          const yTop = padT + (plotH - totalH);
          const yPrincipal = yTop + interestH;
          const { interestInside, principalInside } = labelAt[idx];

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
              {labelAt[idx].interest !== null && <text
                x={x + barWidth / 2}
                y={labelAt[idx].interest ?? 0}
                className="lc-splitValueInterest"
                textAnchor="middle"
                style={{
                  // Inside the bar the label is dark in both themes: orange
                  // never holds white (2.7:1). When the segment is too thin
                  // the label goes above the bar, in an orange that reads
                  // as text on the card.
                  fill: interestInside ? 'var(--chart-on-warn)' : 'var(--chart-text-warn)',
                }}
              >
                {barLabel(row.interest)}
              </text>}
              {/* Principal value */}
              {labelAt[idx].principal !== null && <text
                x={x + barWidth / 2}
                y={labelAt[idx].principal ?? 0}
                className="lc-splitValuePrincipal"
                textAnchor="middle"
                style={{ fill: principalInside ? vendorInk : 'var(--color-text-primary)' }}
              >
                {barLabel(row.principal)}
              </text>}
              {/* X-axis label: "Year N" or "Month N" for very short loans */}
              <text
                x={x + barWidth / 2}
                y={tickTop}
                className="lc-splitTickX"
                textAnchor="middle"
                style={fitStyle(ticks[idx].fit)}
                visibility={fitShown(ticks[idx].fit)}
              >
                {ticks[idx].lines.map((l, i) => <tspan key={i} x={x + barWidth / 2} dy={i === 0 ? 0 : LINE}>{l}</tspan>)}
              </text>
            </g>
          );
        })}

        <text
          x={width / 2}
          y={footTop}
          className="lc-splitFootnote"
          textAnchor="middle"
          style={fitStyle(foot.fit)}
          visibility={fitShown(foot.fit)}
        >
          {foot.lines.map((l, i) => <tspan key={i} x={width / 2} dy={i === 0 ? 0 : LINE}>{l}</tspan>)}
        </text>
      </svg>

      {/* SR-only table mirrors the same data for assistive tech users. */}
      {/* A table ignores width and overflow, so the visually hidden box wraps it. */}
      <div className="lc-srOnly">
        <table>
          <caption>{format(strings.split.tableCaption, { vendor: vendorName })}</caption>
          <thead>
            <tr>
              <th scope="col">{strings.words.month}</th>
              <th scope="col">{strings.words.payment}</th>
              <th scope="col">{strings.words.interest}</th>
              <th scope="col">{strings.words.principal}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.month}>
                <th scope="row">{formatYearLabel(r.month, strings)}</th>
                <td><Amount>{formatMoney(r.payment, currency)}</Amount></td>
                <td><Amount>{formatMoney(r.interest, currency)}</Amount></td>
                <td><Amount>{formatMoney(r.principal, currency)}</Amount></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Render a sampled month as a "Year N" label, falling back to "Month N"
 *  for short-term loans where year framing would be misleading. */
function formatYearLabel(month: number, strings: Strings): string {
  if (month <= 12) {
    return month === 1
      ? format(strings.balance.year, { y: 1 })
      : format(strings.balance.month, { m: month });
  }
  // Months that fall on a year boundary read as "Year N"; off-boundary
  // months read as the year they fall in, so the user can still locate them.
  if (month % 12 === 0) return format(strings.balance.year, { y: month / 12 });
  return format(strings.balance.year, { y: Math.floor(month / 12) + 1 });
}

// ---- Phone layout ------------------------------------------------------------
//
// Phones (640px and narrower, the site's phone breakpoint) show one vendor
// card at a time. Which layout is showing is
// view state only: it never enters the share link, the address, storage or
// analytics.

const PHONE_QUERY = '(width < 640px)';

/** True on phone-width screens. Starts false so the server render and the
 *  first client render match (the desktop layout); updates after mount. */
function usePhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  },
  // Stryker disable next-line ArrayDeclaration: any list that never changes runs the effect once, as the empty one does.
  []);
  return phone;
}

// ---- Main component --------------------------------------------------------

/**
 * `defaultCurrency` is the page's starting currency (TOOL_DEFAULT_CURRENCY in
 * src/utils/shared/toolState.ts, chosen by the page component for its
 * language). It applies only when no shared state arrived; a shared link's
 * state decodes the same on every page.
 */
export default function LoanCompare({
  strings,
  exportStrings,
  defaultCurrency,
  numberLocale,
  amountLocale,
}: {
  strings: Strings;
  exportStrings: Dict['tools']['export'];
  defaultCurrency: string;
  /** How the page writes numbers, for reading the boxes: 'en', 'en-IN' or 'es'. */
  numberLocale: string;
  /** How the page writes amounts (`TOOL_AMOUNT_LOCALE`), or null for each currency's own style. */
  amountLocale: string | null;
}) {
  const [vendors, setVendors] = useState<VendorInput[]>(DEFAULT_VENDORS);
  const [globalState, setGlobalState] = useState<GlobalState>(() => defaultGlobalState(defaultCurrency));
  const [hydrated, setHydrated] = useState(false);
  // A link written with a check that did not arrive whole (#820): its state as
  // it arrived, which is shown to nobody and used for nothing. While it is
  // set the page shows one notice in place of the tool: no offer, example or
  // result, and nothing to copy or save. `null` on every other visit.
  const [damagedLink, setDamagedLink] = useState<string | null>(null);
  // Where the keyboard goes when the notice gives way to the tool.
  const exampleRef = useRef<HTMLParagraphElement>(null);
  const startedNew = useRef(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  // The browser would not copy: the bar asks the reader to copy the address by hand.
  // Stryker disable next-line BooleanLiteral: equivalent. The effect that clears the copied address runs on mount and sets this false, and until then no address is shown, so the label it chooses is never seen.
  const [copyFailed, setCopyFailed] = useState(false);
  // Stryker disable next-line StringLiteral: equivalent. A notice whose count is 0 is never said, so its starting words are never heard.
  const [shareNotice, setShareNotice] = useState<Notice>({ text: '', n: 0 });
  // One timer for the button's "Copied": a second copy restarts it.
  const copiedTimer = useRef<number | undefined>(undefined);
  // The refinance scenario's sentence while its tab is open; undefined otherwise.
  const [refiSaid, setRefiSaid] = useState<string | undefined>(undefined);
  // Index of the vendor whose amortisation split is currently rendered.
  // null means "auto"; track the cheapest-by-total winner. We store an
  // explicit index only when the user has manually picked one, so adding
  // or reordering vendors doesn't trap them on a stale selection.
  const [splitVendorIdx, setSplitVendorIdx] = useState<number | null>(null);
  // Phones: the vendor whose card is showing. View state only (see above).
  const [activeVendor, setActiveVendor] = useState(0);
  const currencySelectId = useId();

  // Convenience accessor: the currency lives on globalState but most
  // call sites read it directly. Updates always go through setGlobalState
  // so there is one source of truth.
  const currency = globalState.currency;
  const aprDocsId = useId();
  const setCurrency = useCallback(
    (next: string) => setGlobalState((g) => ({ ...g, currency: next })),
    // Stryker disable next-line ArrayDeclaration: equivalent. The callback uses only the state setter, which never changes, so the list only has to never change; the mutant's one constant string never changes either.
    [],
  );

  // Hydrate from a shared link on mount. ToolStateGuard in the page head has
  // already moved its state out of the address bar into a window property,
  // before analytics started (see SHARED_STATE_GLOBAL in the url module).
  useEffect(() => {
    // Stryker disable next-line StringLiteral: equivalent. Effects run only in a browser, where `window` is always there, so the guard never returns whatever it is compared with.
    if (typeof window === 'undefined') return;
    const raw = (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
    const arrived = typeof raw === 'string' ? raw : '';
    const read = readSharedState(arrived);
    // A link that did not arrive whole: nothing of it is loaded, and no event
    // is sent, since no comparison was opened. Behind the notice the tool is
    // what it is with no link at all, unseen until the reader asks for a new
    // comparison.
    if (!read) setDamagedLink(arrived);
    const shared = read ? arrived : '';
    const { vendors: decoded, global: decodedGlobal } = read ?? decodeFromQueryString('');
    setVendors(decoded);
    // No shared state: start in this page's currency. A shared state keeps
    // the codec's reading (no `c` means EUR), so links mean the same anywhere.
    if (!shared) decodedGlobal.currency = defaultCurrency;
    // Validate the currency we got back; an unknown code falls back to
    // the default rather than putting the dropdown into a broken state.
    if (!CURRENCIES.some((c) => c.code === decodedGlobal.currency)) {
      decodedGlobal.currency = DEFAULT_CURRENCY;
    }
    setGlobalState(decodedGlobal);
    setHydrated(true);

    // Mirrors `free_multi_currency_net_worth_shared_view_opened` on the analyzer.
    // We fire only when the link actually carried encoded state, so a plain
    // `?utm_source=...` campaign click does not get mislabelled as a shared
    // comparison view. The utm-source value is reported as a property so
    // funnels can split direct shares (utm_source=share) from organic landings.
    // A language switch carries the state too, but that view was already
    // counted on the page it came from.
    if (shared && !arrivedByLanguageSwitch()) {
      track('free_loan_comparison_shared_view_opened', {
        vendors: decoded.length,
        utm_source: new URLSearchParams(window.location.search).get('utm_source') ?? null,
      });
    }
  }, []);

  // The inputs are never written into the address while you type: a URL can
  // reach analytics and server logs. They only leave the form in a share
  // link, after the # (CLAUDE.md, "Free tools keep inputs out of URLs").

  // Keeps what is on screen where the header's language switch can carry it,
  // after the # and only at click time (see src/utils/shared/toolState.ts).
  // Never the address: nothing here writes to it.
  useEffect(() => {
    if (!hydrated) return;
    // Untouched publishes '' so the other language opens with its own
    // starting currency; anything changed carries as encoded. A link that did
    // not arrive whole is carried as it arrived, so the other language shows
    // the same notice and never a link made valid again from the examples.
    publishToolState(SHARED_STATE_GLOBAL, damagedLink ?? publishableState(vendors, globalState, defaultCurrency));
  }, [hydrated, damagedLink, vendors, globalState, defaultCurrency]);

  // "Start a new comparison": the notice goes and the tool opens as it does
  // with no link at all. The button goes with the notice, so the keyboard is
  // put on the line that says what is now on the page, the example offers.
  const startNew = () => {
    startedNew.current = true;
    setDamagedLink(null);
  };
  useEffect(() => {
    // Only after the button: a page that opens with the tool leaves the keyboard where it is.
    if (!startedNew.current) return;
    // Stryker disable next-line OptionalChaining: equivalent. The notice has just given way to the untouched starting offers, which always show the example line.
    exampleRef.current?.focus();
  }, [damagedLink]);

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
    setVendors((prev) => [...prev, makeAddedVendor(prev.length)]);
    // On phones, show the card just added.
    setActiveVendor(vendors.length);
    track('free_loan_comparison_vendor_added', { count: vendors.length + 1 });
  }, [vendors.length]);

  const removeVendor = useCallback((index: number) => {
    if (vendors.length <= MIN_VENDORS) return;
    const removedLabel = VENDOR_LABELS[index];
    setVendors((prev) => prev.filter((_, i) => i !== index));
    // On phones, keep showing a neighbouring card.
    setActiveVendor((a) => (a > index || a === vendors.length - 1 ? Math.max(0, a - 1) : a));
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

  // The offers are compared row by row, so each headline row's amount has one
  // size in every card: the longest among the offers that have a result.
  const sharedLengths = useMemo(() => {
    const ok = results.filter((r) => !r.error);
    const longest = (get: (r: LoanResult) => number) => longestAmount(...ok.map((r) => formatMoney(get(r), currency, amountLocale)));
    return {
      monthly: longest((r) => r.effectiveMonthlyMinor),
      totalPaid: longest((r) => r.totalPaidMinor),
      totalInterest: longest((r) => r.totalInterestMinor),
    };
  }, [results, currency, amountLocale]);

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
    // Stryker disable next-line ConditionalExpression,CallExpression: equivalent. The effect's cleanup below already clears the waiting timer before the effect runs again, so this clear and its check change nothing.
    if (validationTrackTimer.current) clearTimeout(validationTrackTimer.current);
    validationTrackTimer.current = setTimeout(() => {
      const errored = results
        .map((r, i) => ({ r, i }))
        .filter((x) => Boolean(x.r.error));
      if (errored.length === 0) return;
      // Stryker disable next-line StringLiteral: equivalent. Only offers with an error are here, so the fallback for a missing message is never used.
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

  // Stryker disable next-line MethodExpression: equivalent. Outside a held-back comparison every result has no error and a schedule, so the filter keeps them all; inside one, these values reach only parts that are hidden and inert.
  const validResults = results
    .map((r, i) => ({ r, i }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0);
  // Only an offer that is paid off has a total to be lowest.
  const withTotal = validResults.filter((x) => !isNotPaidOff(x.r));
  // Until every offer can be read, nothing compares them, and nothing is
  // shared or saved (#793).
  const withheld = comparisonWithheld(results);
  const withheldReasonId = useId();
  const cheapestByTotal =
    withTotal.length > 0
      ? withTotal.reduce((best, cur) =>
          cur.r.totalPaidMinor < best.r.totalPaidMinor ? cur : best,
        ).i
      : -1;

  const copyShareLink = useCallback(async () => {
    // Stryker disable next-line StringLiteral: equivalent. A click runs only in a browser, where `window` is always there, so the guard never returns whatever it is compared with.
    if (typeof window === 'undefined') return;
    if (withheld) return;
    track('free_loan_comparison_share_modal_opened');
    const url = `${window.location.origin}${window.location.pathname}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=loan_comparison#${encodeSharedState(vendors, globalState)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setCopyFailed(false);
      setCopied(true);
      // Said once, by the tool's one announcement (#603).
      setShareNotice((s) => ({ text: strings.toolbar.shareStatus, n: s.n + 1 }));
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
      track('free_loan_comparison_share_copied');
    } catch {
      // Not copied (an in-app browser, a refused permission): no "copied",
      // the address is offered to copy by hand, as the other tools do, and
      // stays in the bar under the buttons.
      setShareUrl(url);
      setCopyFailed(true);
      setCopied(false);
      setShareNotice((s) => ({ text: strings.toolbar.copyPrompt, n: s.n + 1 }));
      window.prompt(strings.toolbar.copyPrompt, url);
    }
  }, [withheld, vendors, globalState, strings.toolbar.copyPrompt, strings.toolbar.shareStatus]);

  // The copied address stays until the next change to the comparison, which
  // is when it stops being the address of what is on the page. It used to go
  // after 2.5 s, from under a reader who had tabbed into it (#603).
  useEffect(() => {
    setShareUrl('');
    // Stryker disable next-line BooleanLiteral: equivalent. The address is empty after this, so the bar and its label are gone, and every copy that shows the address sets this again.
    setCopyFailed(false);
  }, [vendors, globalState]);

  // Both copies are of the offers as the page shows them; the event says only
  // which kind was made.
  const downloadSpreadsheet = () => {
    const sheets = loanSheets({
      island: strings,
      common: exportStrings,
      currency,
      vendors,
      results,
      names: vendors.map((v, i) => shownName(v.name, i, strings)),
      date: isoDate(),
      page: `${window.location.origin}${window.location.pathname}`,
      locale: amountLocale,
    });
    downloadWorkbook(sheets, 'loan-comparison');
    track('free_loan_comparison_exported', { format: 'xlsx' });
  };
  const printPage = () => {
    track('free_loan_comparison_exported', { format: 'pdf' });
    printResults();
  };

  const toolReady = useToolReady();
  // The offers' tabs and the example note sit above every box, and change as
  // one is typed in: a name grows its tab, the note goes at the first key (#827).
  const tabsRow = useSteadyAbove<HTMLDivElement>();
  const exampleRow = useSteadyAbove<HTMLDivElement>();
  return (
    <NumberLocaleContext.Provider value={numberLocale}>
    <AmountLocaleContext.Provider value={amountLocale}>
    <ChartWordsContext.Provider value={exportStrings.chart}>
    <ErrorLeadContext.Provider value={exportStrings.fieldError}>
    <UnreadableContext.Provider value={exportStrings.fieldUnreadable}>
    <div className="lc-root" {...heldUntilReady(toolReady)}>
      {damagedLink !== null ? (
        // The whole tool gives way to this (#820). An alert: it takes the place
        // of what the link was opened for, and is said once, as it appears.
        // The button has no click label: it sends no event of its own.
        <div className="lc-linkDamaged">
          {/* For a reader who moves by headings; the sentence below says it to everyone. */}
          <h2 className="lc-srOnly">{strings.link.damagedHeading}</h2>
          <p className="tool-resultReason" role="alert">{strings.link.damaged}</p>
          <button type="button" className="btn btn--outline" onClick={startNew}>{strings.link.startNew}</button>
        </div>
      ) : (
      <>
      <div className="lc-toolbar" role="toolbar" aria-label={strings.toolbar.aria}>
        <div className="lc-currencyField">
          <label className="lc-fieldLabel" htmlFor={currencySelectId}>
            {strings.toolbar.currencyLabel}
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
              <option key={c.code} value={c.code}>{strings.currencies[c.code] ?? c.label}</option>
            ))}
          </select>
          {/* The currency selector controls *display formatting only*: symbol,
              decimal places, and digit grouping. The amortization math is
              identical across currencies, and all vendors in a single
              comparison share one currency, so we surface that scope
              explicitly to avoid implying any FX conversion is happening. */}
          <p id={`${currencySelectId}-hint`} className="lc-fieldHelp">
            {strings.toolbar.currencyHelp}
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
            <span className="lc-fieldPreviewLabel">{strings.toolbar.sample}</span>{' '}
            <span className="lc-fieldPreviewValue">
              <Amount>{formatMoney(toMinor(12345678.9, currency), currency, amountLocale)}</Amount>
            </span>
          </p>
        </div>
        <div className="lc-toolbarActions">
          <button
            type="button"
            className="btn btn--quiet lc-resetBtn"
            onClick={() => {
              setVendors(DEFAULT_VENDORS);
              setGlobalState(defaultGlobalState(defaultCurrency));
              setActiveVendor(0);
              track('free_loan_comparison_reset');
            }}
            title={strings.toolbar.resetTitle}
            data-attr="lc-reset"
          >
            {strings.toolbar.reset}
          </button>
        </div>

      </div>

      {/* Phones only (hidden from 641px): pick the vendor card to show.
          Fixed labels only ("A", "Vendor A"): with consent, click capture
          records a button's text, so nothing typed (names, amounts) goes
          in here. Choosing one fires no event of its own. "+ Add" is the
          same action as the dashed card on wider screens, with the same
          label and event. */}
      <div className="lc-vendorTabs" ref={tabsRow} role="group" aria-label={strings.phoneTabs.groupAria}>
        {vendors.map((v, i) => (
          <button
            key={i}
            type="button"
            className={`lc-vendorTab ${i === activeVendor ? 'lc-vendorTabActive' : ''}`}
            style={{ '--lc-color': VENDOR_COLORS[i] } as React.CSSProperties}
            aria-pressed={i === activeVendor}
            aria-controls={`lc-vendor-card-${i}`}
            onClick={() => setActiveVendor(i)}
          >
            <span className="lc-vendorTabLetter" aria-hidden="true">{VENDOR_LABELS[i]}</span>
            <span className="lc-vendorTabName">{isTypedName(v.name) ? v.name : format(strings.phoneTabs.tabName, { label: VENDOR_LABELS[i] })}</span>
          </button>
        ))}
        {vendors.length < MAX_VENDORS && (
          <button
            type="button"
            className="btn btn--outline lc-vendorTabAdd"
            onClick={addVendor}
            aria-label={format(strings.phoneTabs.addAria, { n: vendors.length + 1, max: MAX_VENDORS })}
            data-attr="lc-vendor-add"
          >
            <span aria-hidden="true">+</span> {strings.phoneTabs.add}
          </button>
        )}
      </div>

      {/* Phones only. A button, not a link: nothing is written to the address. */}
      <p className="lc-jump">
        <button
          type="button"
          onClick={() => {
            const heading = document.getElementById('lc-delta-h');
            // Stryker disable next-line OptionalChaining: equivalent. The comparison's heading is always on the page, so there is no missing heading to guard.
            heading?.scrollIntoView({ block: 'start' });
            // Stryker disable next-line OptionalChaining: equivalent. The comparison's heading is always on the page, so there is no missing heading to guard.
            heading?.focus({ preventScroll: true });
          }}
        >
          {strings.delta.heading}
        </button>
      </p>

      {/* The starting offers are an example until one of them is changed. */}
      {/* The note goes at the first key; its row keeps the note's height while
          the reader is in the box that key was typed in (#827). */}
      <div className="lc-exampleRow" ref={exampleRow}>
        {isPristineState(vendors, globalState, defaultCurrency) && <p className="lc-example" ref={exampleRef} tabIndex={-1}>{strings.example}</p>}
      </div>

      <h2 className="lc-srOnly" id={`${aprDocsId}-h`}>{strings.cardsHeading}</h2>
      {/* Why the APR here can read lower than the one on a lender's document. */}
      <p className="lc-aprDocs" id={aprDocsId}>{strings.results.aprDocs}</p>
      <div className="lc-grid" role="group" aria-labelledby={`${aprDocsId}-h`} aria-describedby={aprDocsId}>
        {vendors.map((v, i) => (
          <VendorCard
            key={i}
            domId={`lc-vendor-card-${i}`}
            active={i === activeVendor}
            label={VENDOR_LABELS[i]}
            color={VENDOR_COLORS[i]}
            index={i}
            vendor={v}
            result={results[i]}
            noPointsBaseline={noPointsBaselines[i]}
            shared={sharedLengths}
            currency={currency}
            strings={strings}
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
            // No aria-label: the visible words are the name, so a reader who
            // says "Add an offer" to voice control reaches it (WCAG 2.5.3).
            data-attr="lc-vendor-add"
          >
            <span className="lc-cardAddIcon" aria-hidden="true">+</span>
            <span className="lc-cardAddLabel">{strings.phoneTabs.addCard}</span>
            <span className="lc-cardAddHint">
              {format(strings.phoneTabs.addCardHint, { max: MAX_VENDORS })}
            </span>
          </button>
        )}
      </div>

      <LoanAnnouncement
        withheld={withheld}
        paidOff={withTotal.map((x) => x.r)}
        validCount={validResults.length}
        noted={validResults.map(({ r, i }) => ({ name: shownName(vendors[i].name, i, strings), notes: r.warnings.map((w) => engineWarning(w, strings)) }))}
        currency={currency}
        strings={strings}
        also={refiSaid}
        notice={shareNotice}
      />

      <DeltaSummary
        withheld={withheld}
        reasonId={withheldReasonId}
        results={results}
        vendors={vendors}
        currency={currency}
        strings={strings}
      />

      <ToolExport
        strings={exportStrings}
        share={
          <>
            <button
              type="button"
              className="btn btn--outline lc-shareBtn"
              onClick={copyShareLink}
              aria-disabled={withheld || undefined}
              aria-describedby={withheld ? withheldReasonId : undefined}
              title={strings.toolbar.shareTitle}
              data-attr="lc-share-copy"
            >
              <SwapLabel label={strings.toolbar.share} alternate={strings.toolbar.shareCopied} swapped={copied} steady />
            </button>
          </>
        }
        shareResult={
          // Not a live region: the copy is said by the tool's announcement.
          shareUrl && (
            <div className="lc-shareUrlBar">
              <span className="lc-shareUrlLabel">{copyFailed ? strings.toolbar.copyPrompt : strings.toolbar.copiedBar}</span>
              <LinkField
                className="lc-shareUrlInput"
                link={shareUrl}
                onFocus={(e) => { e.target.select(); e.target.scrollLeft = 0; }}
                aria-label={strings.toolbar.shareUrlAria}
              />
            </div>
          )
        }
        xlsxAttr="lc-export-xlsx"
        pdfAttr="lc-export-pdf"
        ready={!withheld && validResults.length > 0}
        onSpreadsheet={downloadSpreadsheet}
        onPrint={printPage}
      />

      <Withheld reason={withheld ? strings.delta.fix : null} unsaid>
      <AnalysisTabs
        vendors={vendors}
        results={results}
        currency={currency}
        cheapestByTotal={cheapestByTotal}
        splitVendorIdx={splitVendorIdx}
        onSplitVendorChange={setSplitVendorIdx}
        globalState={globalState}
        onGlobalChange={(patch) => setGlobalState((g) => ({ ...g, ...patch }))}
        onRefiSaid={setRefiSaid}
        strings={strings}
      />
      </Withheld>

      <details className="lc-disclaimerWrap">
        <summary className="lc-disclaimerSummary disclosure">{strings.disclaimer.summary}</summary>
        <p className="lc-disclaimer">
          {strings.disclaimer.body}
        </p>
      </details>

      {!withheld && <PrintedReport strings={strings} exportStrings={exportStrings} currency={currency} vendors={vendors} results={results} />}
      </>
      )}
    </div>
    </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
    </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>
    </NumberLocaleContext.Provider>
  );
}

/**
 * What prints: the offers as the page shows them, with the summary's range
 * sentence as the answer. Like the page, it names no offer as the one to
 * take. Hidden on screen (see ToolReport).
 */
function PrintedReport({ strings, exportStrings, currency, vendors, results }: {
  strings: Strings;
  exportStrings: Dict['tools']['export'];
  currency: string;
  vendors: VendorInput[];
  results: LoanResult[];
}) {
  const { formatMoney, amountLocale } = useMoney();
  const names = vendors.map((v, i) => shownName(v.name, i, strings));
  const totals = results.filter((r) => !r.error && r.schedule.length > 0 && !isNotPaidOff(r)).map((r) => r.totalPaidMinor).sort((a, b) => a - b);
  const d = strings.delta;
  const answer =
    totals.length < 2
      ? results.filter((r) => !r.error && r.schedule.length > 0).length < 2 ? d.empty : d.noRange
      : totals[0] === totals[totals.length - 1]
        ? `${d.sameBefore}${formatMoney(totals[0], currency)}${d.sameAfter}`
        : `${d.rangeBefore}${formatMoney(totals[0], currency)}${d.rangeTo}${formatMoney(totals[totals.length - 1], currency)}${d.rangeAcross}${formatMoney(totals[totals.length - 1] - totals[0], currency)}${d.rangeAfter}`;
  const report = loanReport({ island: strings, common: exportStrings, currency, vendors, results, names, answer: [answer], locale: amountLocale });
  return <ToolReport report={report} strings={exportStrings} locale={amountLocale ?? 'en-US'} />;
}

// ---- Vendor card -----------------------------------------------------------

interface VendorCardProps {
  /** Element id, so the phone vendor buttons can point at their card. */
  domId: string;
  /** The card showing on phones; ignored on wider screens. */
  active: boolean;
  label: string;
  color: string;
  /** Which offer this is, 0-based: it picks the marker that goes with the colour. */
  index: number;
  vendor: VendorInput;
  result: LoanResult;
  /** Hypothetical "no points paid" baseline; null when vendor isn't
   *  using points. */
  noPointsBaseline: LoanResult | null;
  /** The longest amount in each headline row across the offers: a row has one size in every card. */
  shared: { monthly: number; totalPaid: number; totalInterest: number };
  currency: string;
  strings: Strings;
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
  domId,
  active,
  label,
  color,
  index,
  vendor,
  result,
  noPointsBaseline,
  shared,
  currency,
  strings,
  onChange: onEdit,
  onRemove,
}: VendorCardProps) {
  const { formatMoney, amountLocale } = useMoney();
  const numberLocale = useContext(NumberLocaleContext);
  const baseId = useId();
  const id = (suffix: string) => `${baseId}-${suffix}`;
  // Stryker disable next-line StringLiteral: equivalent. An empty suffix still gives the card a unique id, and the message and the boxes that point at it use the same one.
  const errorId = id('error');
  const hasError = Boolean(result.error);
  // The results sit above the optional boxes, and change as those are typed
  // in (an error in their place, a note more or less): the box stays put (#827).
  const results = useSteadyAbove<HTMLDivElement>();
  // So does the card's heading, which shows the name as it is typed.
  const header = useSteadyAbove<HTMLElement>();
  // The mark that arrived, as against text being typed here.
  const unreadableText = useContext(UnreadableContext);
  const [typed, setTyped] = useState(false);
  const arrived = !typed && holdsMarker(vendor);
  const onChange = (patch: Parameters<VendorCardProps['onChange']>[0]) => { setTyped(true); onEdit(patch); };
  // The optional boxes that cannot be read: each is marked and pointed at
  // the card's message, as the required boxes are.
  const badOptional = new Set<OptionalField>([
    ...unreadableOptionalFields(vendor),
    // A points cost above the fee it is part of is marked the same way.
    ...(pointsCostAboveFee(vendor) ? (['pointsCostMajor'] as const) : []),
    // So is a box of a changing rate that is left out: both are needed.
    ...missingRateChangeFields(vendor),
    // And a month of the change that is part of a month (#914).
    ...(fixedPeriodFault(vendor) ? (['initialFixedMonths'] as const) : []),
  ]);
  // When that is what is wrong, the required boxes are not marked as well.
  // Nor for a changing rate on a loan set by its payment: the message says
  // where to go, and the amount, rate and payment are not what is wrong.
  const errorKey = result.error ? engineErrorKey(result.error) : undefined;
  const requiredError = hasError && badOptional.size === 0 && errorKey !== 'hybridMode';
  // Stryker disable next-line StringLiteral: equivalent. An empty suffix still gives the card a unique id, and the heading and what it labels use the same one.
  const headingId = id('heading');
  const notPaid = isNotPaidOff(result);

  // The four optional groups fold, each behind a row that says in words
  // (never amounts) what it holds. A group starts open when it differs from
  // this offer's starting example, and always shows a box that cannot be
  // read. Which rows are open is view state: never shared, stored or tracked.
  const isSet = (s: string) => Number(s) > 0;
  // Every offer starts with its optional boxes empty (the example and an
  // added one alike), so that is what "unchanged" means: an empty row stays folded.
  // Stryker disable next-line MethodExpression: equivalent. Every slot's added offer has the same empty optional boxes, the only fields compared with it, so the slot it is read from changes nothing.
  const slot = Math.max(0, (VENDOR_LABELS as readonly string[]).indexOf(label));
  const start = makeAddedVendor(slot);
  const differs = (...keys: (keyof VendorInput)[]) => keys.some((k) => vendor[k] !== start[k]);
  const unreadable = (...keys: OptionalField[]) => keys.some((k) => badOptional.has(k));
  const [toggled, setToggled] = useState<Partial<Record<FoldName, boolean>>>({});
  const fold = (name: FoldName, changed: boolean, bad: boolean) => ({
    open: bad || (toggled[name] ?? changed),
    onToggle: (open: boolean) => setToggled((t) => (t[name] === open ? t : { ...t, [name]: open })),
  });
  const hybrid = vendor.rateKind === 'hybrid' && vendor.modeKind === 'term';
  const folds = {
    rate: {
      ...fold('rate', differs('rateKind', 'rateChangeKeeps'), unreadable('initialFixedMonths', 'subsequentRatePct')),
      // The status says what is chosen, also on a loan set by its payment,
      // where the choice is refused: "Fixed rate" beside that message would
      // contradict it. What happens at the change is not asked there.
      state: vendor.rateKind === 'hybrid'
        ? hybrid && vendor.rateChangeKeeps === 'payment' ? strings.card.statusHybridKept : strings.card.statusHybrid
        : strings.card.statusFixed,
    },
    costs: {
      ...fold('costs', differs('feeMajor', 'pointsCostMajor', 'pointsRateReductionPct'), unreadable('feeMajor', 'pointsCostMajor', 'pointsRateReductionPct')),
      state: isSet(vendor.feeMajor) || isSet(vendor.pointsCostMajor) ? strings.card.foldSet : strings.card.foldNone,
    },
    prepay: {
      ...fold('prepay', differs('extraMonthly', 'lumpSumsEncoded'), unreadable('extraMonthly', 'lumpSumsEncoded')),
      state: isSet(vendor.extraMonthly) || vendor.lumpSumsEncoded.trim() !== '' ? strings.card.foldSet : strings.card.foldNone,
    },
    penalty: {
      ...fold('penalty', differs('prepayPenaltyPct', 'prepayPenaltyUntilMonth'), unreadable('prepayPenaltyPct', 'prepayPenaltyUntilMonth')),
      state: isSet(vendor.prepayPenaltyPct) || isSet(vendor.prepayPenaltyUntilMonth) ? strings.card.foldSet : strings.card.foldNone,
    },
  };

  return (
    <article
      id={domId}
      className={`lc-card ${active ? 'lc-cardActive' : ''}`}
      style={{ '--lc-color': color } as React.CSSProperties}
      aria-labelledby={headingId}
    >
      <header className="lc-cardHeader" ref={header}>
        {/*
          h3 (not h2): an h2 per vendor card padded the document outline
          with up to five "Vendor A / B / C…" entries that contributed
          nothing to SEO and, with autocapture screen-readers, generated
          noisy nav. h3 keeps the card semantically labelled while letting
          the surrounding section heading own the h2 slot.
        */}
        <h3 id={headingId} className="lc-cardBadge">
          <SeriesMarker index={index} color={color} />
          {/* A typed name is the heading, after the letter the phone tabs and
              the phone table use. An untouched or empty name reads "Vendor A",
              which already holds its letter. Typed text is shown as text only,
              never put in an attribute. */}
          {isTypedName(vendor.name) ? (
            <>
              <span className="lc-cardLetter">{label}</span>
              <span className="lc-cardName">{vendor.name}</span>
            </>
          ) : (
            format(strings.card.badge, { label })
          )}
        </h3>
        {onRemove && (
          <button
            type="button"
            className="lc-cardRemove"
            onClick={onRemove}
            aria-label={format(strings.card.removeAria, { label })}
            title={strings.card.removeTitle}
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
        <label className="lc-fieldLabel" htmlFor={id('name')}>{strings.card.name}</label>
        <input
          id={id('name')}
          type="text"
          className="lc-input"
          // An untouched default reads in the page's language; the stored
          // name stays "Vendor A" until the reader edits it (`shownName`).
          value={DEFAULT_NAMES.has(vendor.name) ? shownName(vendor.name, 0, strings) : vendor.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="lc-field">
        <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('principal')}>
          <RequiredLabel title={strings.card.requiredTitle}>{strings.card.principal}</RequiredLabel> <span className="lc-fieldHint">({currency})</span>
        </label>
        <LocaleNumberInput
          id={id('principal')}
          inputMode="decimal"
          className="lc-input"
          value={vendor.principal}
          onValueChange={(v) => onChange({ principal: v })}
          aria-invalid={requiredError || undefined}
          aria-required="true"
          aria-describedby={requiredError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <div className="lc-field">
        <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('rate')}>
          <RequiredLabel title={strings.card.requiredTitle}>{strings.card.rate}</RequiredLabel>
        </label>
        <LocaleNumberInput
          id={id('rate')}
          inputMode="decimal"
          className="lc-input"
          value={vendor.annualRatePct}
          onValueChange={(v) => onChange({ annualRatePct: v })}
          aria-invalid={requiredError || undefined}
          aria-required="true"
          aria-describedby={requiredError ? errorId : undefined}
          autoComplete="off"
        />
      </div>

      <fieldset className="lc-modeFieldset">
        <legend className="lc-fieldLabel lc-fieldLabel--required"><RequiredLabel title={strings.card.requiredTitle}>{strings.card.solveFor}</RequiredLabel></legend>
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
            <span>{strings.card.modeTerm}</span>
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
            <span>{strings.card.modePayment}</span>
          </label>
        </div>
      </fieldset>

      {vendor.modeKind === 'term' ? (
        <div className="lc-field">
          <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('term')}>
            <RequiredLabel title={strings.card.requiredTitle}>{strings.card.term}</RequiredLabel>
          </label>
          <LocaleNumberInput
            id={id('term')}
            inputMode="numeric"
            className="lc-input"
            value={vendor.termMonths}
            onValueChange={(v) => onChange({ termMonths: v })}
            aria-invalid={requiredError || undefined}
            aria-required="true"
            aria-describedby={requiredError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="lc-field">
          <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('monthly')}>
            <RequiredLabel title={strings.card.requiredTitle}>{strings.card.monthly}</RequiredLabel> <span className="lc-fieldHint">({currency})</span>
          </label>
          <LocaleNumberInput
            id={id('monthly')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.monthlyPayment}
            onValueChange={(v) => onChange({ monthlyPayment: v })}
            aria-invalid={requiredError || undefined}
            aria-required="true"
            aria-describedby={requiredError ? errorId : undefined}
            autoComplete="off"
          />
        </div>
      )}

      {/* Not a live region: the tool's one announcement says the settled result. */}
      <div className="lc-results" ref={results}>
        {hasError ? (
          <p className="lc-error" id={errorId}>
            <ErrorText>{arrived ? unreadableText : engineError(result.error ?? '', strings)}</ErrorText>
          </p>
        ) : (
          <>
            {/* Top three at-a-glance numbers. APR is the cross-vendor
                comparator the blog post calls "the number that matters",
                Total paid is the headline cost, and Monthly payment is
                what most users look at first. Everything else moves into
                the "Show details" expander to keep the card compact. */}
            <dl className="lc-resultList lc-resultListPrimary">
              {result.keptPayment ? (
                // The payment is kept at the rate change: one amount, and the
                // row below says when the loan ends, or that it does not.
                <>
                  <ResultRow
                    label={strings.results.monthly}
                    value={formatMoney(result.effectiveMonthlyMinor, currency)}
                  shared={shared.monthly}
                    hint={strings.results.keptNote}
                    note={
                      result.effectiveMonthlyMinor > result.monthlyPaymentMinor
                        ? format(strings.results.monthlyIncludesExtra, {
                            extra: formatMoney(result.effectiveMonthlyMinor - result.monthlyPaymentMinor, currency),
                          })
                        : undefined
                    }
                  />
                  <ResultRow label={strings.results.payoff} {...payoffText(result, strings)} />
                </>
              ) : result.rateChange && result.rateChange.paymentMinor !== null ? (
                // The payment changes with the rate: both amounts at the same
                // weight, each under its own months, so no figure stands alone.
                <div className="lc-resultRow lc-resultRowSteps">
                  <dt className="lc-resultLabel">{strings.results.monthly}</dt>
                  <dd className="lc-resultValue">
                    <PaymentSteps
                      first={formatMoney(result.effectiveMonthlyMinor, currency)}
                      later={formatMoney(result.rateChange.paymentMinor, currency)}
                      month={result.rateChange.month}
                      last={result.rateChange.last === true}
                      strings={strings}
                    />
                    <span className="lc-resultHint">{strings.results.monthlyLaterNote}</span>
                    {result.effectiveMonthlyMinor > result.monthlyPaymentMinor && (
                      <span className="lc-resultHint">
                        <Amounts>{format(strings.results.monthlyIncludesExtra, {
                          extra: formatMoney(result.effectiveMonthlyMinor - result.monthlyPaymentMinor, currency),
                        })}</Amounts>
                      </span>
                    )}
                  </dd>
                </div>
              ) : (
                <ResultRow
                  label={strings.results.monthly}
                  value={formatMoney(result.effectiveMonthlyMinor, currency)}
                  shared={shared.monthly}
                  hint={
                    Number(vendor.extraMonthly) > 0
                      ? format(strings.results.monthlyExtra, {
                          base: formatMoney(result.monthlyPaymentMinor, currency),
                          extra: formatMoney(
                            result.effectiveMonthlyMinor - result.monthlyPaymentMinor,
                            currency,
                          ),
                        })
                      : undefined
                  }
                  note={result.rateChange ? format(strings.results.paidOffBeforeChange, { payoffMonth: result.months }) : undefined}
                />
              )}
              <ResultRow
                label={strings.results.apr}
                value={notPaid ? strings.results.notAvailable : aprText(result.aprNominal, currency, strings, amountLocale)}
                hint={notPaid ? undefined : result.feeMinor > 0 ? strings.results.aprFees : strings.results.aprNoFees}
                note={notPaid ? undefined : strings.results.aprBasis}
              />
              <ResultRow
                label={strings.results.totalPaid}
                value={notPaid ? noTotalText(result, strings) : formatMoney(result.totalPaidMinor, currency)}
                shared={shared.totalPaid}
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
              <summary className="lc-resultDetailsSummary disclosure">{strings.results.showDetails}</summary>
              <dl className="lc-resultList">
                {notPaid ? (
                  <ResultRow label={strings.results.timeToPayoff} value={payoffText(result, strings).value} />
                ) : (
                  <ResultRow
                    label={strings.results.timeToPayoff}
                    value={months(result.months, strings.months)}
                    hint={format(
                      plural(numberLocale, result.months, strings.results.paymentsOne, strings.results.paymentsFew, strings.results.paymentsMany),
                      { n: result.months },
                    )}
                  />
                )}
                <ResultRow
                  label={strings.results.totalInterest}
                  value={notPaid ? noTotalText(result, strings) : formatMoney(result.totalInterestMinor, currency)}
                  shared={shared.totalInterest}
                />
                {result.feeMinor > 0 && (
                  <ResultRow
                    label={strings.results.fees}
                    value={formatMoney(result.feeMinor, currency)}
                  />
                )}
                {result.prepaymentPenaltyMinor > 0 && (
                  <ResultRow
                    label={strings.results.penalty}
                    value={formatMoney(result.prepaymentPenaltyMinor, currency)}
                    hint={strings.results.penaltyHint}
                  />
                )}
                {noPointsBaseline && !noPointsBaseline.error && (() => {
                  const be = pointsBreakEven(result, noPointsBaseline);
                  return (
                    <ResultRow
                      label={strings.results.breakEven}
                      value={
                        Number.isFinite(be.months)
                          ? months(be.months, strings.months)
                          : strings.results.never
                      }
                      hint={
                        // The lifetime figure is signed: a loan that ends
                        // before the break-even month loses money on its points.
                        pointsVerdict(be) === 'never'
                          ? strings.results.breakEvenNever
                          : format(pointsVerdict(be) === 'costs' ? strings.results.breakEvenCosts : strings.results.breakEvenSaves, {
                              amount: formatMoney(Math.abs(be.lifetimeSavingsMinor), currency),
                            })
                      }
                    />
                  );
                })()}
              </dl>
            </details>
          </>
        )}
        {result.warnings.map((w, i) => (
          // Not a live region: typing a lump sum's month digit by digit would have a
          // screen reader speak every change. The tool's one announcement says an
          // offer's notes with its figures, once typing has paused (`announcedNotes`).
          <p key={i} className="lc-warning">{engineWarning(w, strings)}</p>
        ))}
      </div>

      {/* Optional groups, after the result: each a row that opens. */}
      <FieldGroup title={strings.card.rateStructure.title} hint={strings.card.rateStructure.hint} {...folds.rate}>
        <fieldset className="lc-modeFieldset">
          <legend className="lc-srOnly">{strings.card.rateTypeAria}</legend>
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
              <span>{strings.card.fixed}</span>
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
              <span>{strings.card.hybrid}</span>
            </label>
          </div>
        </fieldset>
        {vendor.modeKind !== 'term' && (
          // Always render this hint when hybrid is disabled, even if the
          // user has not picked hybrid yet, so the disabled state is
          // explained on first encounter (and aria-describedby has a
          // target to point at).
          <p id={id('hybrid-hint')} className="lc-fieldHelp">
            {strings.card.hybridHint.before}
            <em>{strings.card.hybridHint.solveFor}</em>
            {strings.card.hybridHint.mid}
            <em>{strings.card.hybridHint.modeTerm}</em>
            {strings.card.hybridHint.after}
          </p>
        )}
        {vendor.rateKind === 'hybrid' && vendor.modeKind === 'term' && (
          <>
            <div className="lc-field">
              <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('initialFixedMonths')}>
                <RequiredLabel title={strings.card.requiredTitle}>{strings.card.initialFixed}</RequiredLabel>
              </label>
              <LocaleNumberInput
                id={id('initialFixedMonths')}
                inputMode="numeric"
                className="lc-input"
                value={vendor.initialFixedMonths}
                onValueChange={(v) => onChange({ initialFixedMonths: v })}
                aria-invalid={badOptional.has('initialFixedMonths') || undefined}
                aria-required="true"
                aria-describedby={badOptional.has('initialFixedMonths') ? errorId : undefined}
                autoComplete="off"
              />
              <p className="lc-fieldHelp">{strings.card.initialFixedHelp}</p>
            </div>
            <div className="lc-field">
              <label className="lc-fieldLabel lc-fieldLabel--required" htmlFor={id('subsequentRatePct')}>
                <RequiredLabel title={strings.card.requiredTitle}>{strings.card.subsequentRate}</RequiredLabel>
              </label>
              <LocaleNumberInput
                id={id('subsequentRatePct')}
                inputMode="decimal"
                className="lc-input"
                value={vendor.subsequentRatePct}
                onValueChange={(v) => onChange({ subsequentRatePct: v })}
                aria-invalid={badOptional.has('subsequentRatePct') || undefined}
                aria-required="true"
                aria-describedby={badOptional.has('subsequentRatePct') ? errorId : undefined}
                autoComplete="off"
              />
              <p className="lc-fieldHelp">
                {strings.card.subsequentRateHelp}
              </p>
            </div>
            {/* What the lender does at the rate change. A choice, not a typed
                value: the share link carries it as one letter, and no event
                is sent for it. It stays in place when no payment would use
                the later rate, so a setting never vanishes while typing. */}
            <fieldset className="lc-modeFieldset lc-atChange">
              <legend className="lc-fieldLabel">{strings.card.atChange.label}</legend>
              <div className="lc-modeRow lc-modeRowStacked">
                {(['term', 'payment'] as const).map((keeps) => (
                  <label key={keeps} className={`lc-modeOption ${vendor.rateChangeKeeps === keeps ? 'lc-modeOptionActive' : ''}`}>
                    <input
                      type="radio"
                      name={`rateChangeKeeps-${baseId}`}
                      value={keeps}
                      checked={vendor.rateChangeKeeps === keeps}
                      aria-describedby={id('atChange-hint')}
                      onChange={() => onChange({ rateChangeKeeps: keeps })}
                    />
                    <span>{strings.card.atChange[keeps]}</span>
                  </label>
                ))}
              </div>
              <p id={id('atChange-hint')} className="lc-fieldHelp">{strings.card.atChange.hint}</p>
            </fieldset>
          </>
        )}
      </FieldGroup>

      <FieldGroup title={strings.card.costs.title} hint={strings.card.costs.hint} {...folds.costs}>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('fee')}>
            {strings.card.fee} <span className="lc-fieldHint">({currency})</span>
          </label>
          <LocaleNumberInput
            id={id('fee')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.feeMajor}
            onValueChange={(v) => onChange({ feeMajor: v })}
            aria-invalid={badOptional.has('feeMajor') || undefined}
            aria-describedby={badOptional.has('feeMajor') ? errorId : undefined}
            autoComplete="off"
          />
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('pointsCost')}>
            {strings.card.pointsCost} <span className="lc-fieldHint">({currency})</span>
          </label>
          <LocaleNumberInput
            id={id('pointsCost')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.pointsCostMajor}
            onValueChange={(v) => onChange({ pointsCostMajor: v })}
            aria-invalid={badOptional.has('pointsCostMajor') || undefined}
            aria-describedby={badOptional.has('pointsCostMajor') ? errorId : undefined}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">
            {strings.card.pointsCostHelp}
          </p>
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('pointsReduction')}>
            {strings.card.pointsReduction}
          </label>
          <LocaleNumberInput
            id={id('pointsReduction')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.pointsRateReductionPct}
            onValueChange={(v) => onChange({ pointsRateReductionPct: v })}
            aria-invalid={badOptional.has('pointsRateReductionPct') || undefined}
            aria-describedby={badOptional.has('pointsRateReductionPct') ? errorId : undefined}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">{strings.card.pointsReductionHelp}</p>
        </div>
      </FieldGroup>

      <FieldGroup title={strings.card.prepayments.title} hint={strings.card.prepayments.hint} {...folds.prepay}>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('extra')}>
            {strings.card.extra} <span className="lc-fieldHint">({currency})</span>
          </label>
          <LocaleNumberInput
            id={id('extra')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.extraMonthly}
            onValueChange={(v) => onChange({ extraMonthly: v })}
            aria-invalid={badOptional.has('extraMonthly') || undefined}
            aria-describedby={badOptional.has('extraMonthly') ? errorId : undefined}
            autoComplete="off"
          />
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('lumpSums')}>
            {strings.card.lumps}
          </label>
          <LocaleNumberInput
            toCanonical={canonicalLumpSums}
            toDisplay={displayLumpSums}
            id={id('lumpSums')}
            className="lc-input"
            value={vendor.lumpSumsEncoded}
            onValueChange={(v) => onChange({ lumpSumsEncoded: v })}
            aria-invalid={badOptional.has('lumpSumsEncoded') || undefined}
            aria-describedby={badOptional.has('lumpSumsEncoded') ? errorId : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="12:5000;36:3000"
          />
          <p className="lc-fieldHelp">
            {strings.card.lumpsHelp.before}
            <code>{strings.card.lumpsHelp.format}</code>
            {strings.card.lumpsHelp.mid}
            <code>12:5000;36:3000</code>
            {strings.card.lumpsHelp.after}
          </p>
        </div>
      </FieldGroup>

      <FieldGroup title={strings.card.penalty.title} hint={strings.card.penalty.hint} {...folds.penalty}>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('prepayPct')}>
            {strings.card.penaltyPct}
          </label>
          <LocaleNumberInput
            id={id('prepayPct')}
            inputMode="decimal"
            className="lc-input"
            value={vendor.prepayPenaltyPct}
            onValueChange={(v) => onChange({ prepayPenaltyPct: v })}
            aria-invalid={badOptional.has('prepayPenaltyPct') || undefined}
            aria-describedby={badOptional.has('prepayPenaltyPct') ? errorId : undefined}
            autoComplete="off"
          />
        </div>
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={id('prepayUntil')}>
            {strings.card.penaltyUntil}
          </label>
          <LocaleNumberInput
            id={id('prepayUntil')}
            inputMode="numeric"
            className="lc-input"
            value={vendor.prepayPenaltyUntilMonth}
            onValueChange={(v) => onChange({ prepayPenaltyUntilMonth: v })}
            aria-invalid={badOptional.has('prepayPenaltyUntilMonth') || undefined}
            aria-describedby={badOptional.has('prepayPenaltyUntilMonth') ? errorId : undefined}
            autoComplete="off"
          />
          <p className="lc-fieldHelp">
            {strings.card.penaltyUntilHelp}
          </p>
        </div>
      </FieldGroup>
    </article>
  );
}

// ---- Form helpers ----------------------------------------------------------

/**
 * The text of a required box's label, with its mark. The mark and the last
 * word of the label are one unit that cannot break: with a space between
 * them, or a no-break space, the asterisk still went to a line of its own
 * under a long label at large text, because a label may break anywhere when
 * a word is wider than its line (#917). Where the unit is wider than the
 * label's line, the CSS draws it smaller by just enough to fit
 * (`.lc-requiredPair`), from its length in characters, as an amount is.
 *
 * The asterisk is presentational: the real signal is `aria-required` on the
 * box, so the character is hidden from screen readers.
 */
function RequiredLabel({ children, title }: { children: string; title: string }) {
  const cut = children.lastIndexOf(' ') + 1;
  const word = children.slice(cut);
  return (
    <>
      {children.slice(0, cut)}
      <span className="lc-requiredPair" style={{ '--pair-len': word.length + 1 } as React.CSSProperties}>
        {word}
        <span className="lc-required" aria-hidden="true" title={title}>*</span>
      </span>
    </>
  );
}

type FoldName = 'rate' | 'costs' | 'prepay' | 'penalty';

interface FieldGroupProps {
  title: string;
  hint?: string;
  /** What the group holds, in words: shown on its row whether open or closed. */
  state: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}

/** A group of optional fields behind a row that opens: the row names the
 *  group and says what it holds, so the card shows every option without
 *  showing every box. The chevron comes from .disclosure. */
function FieldGroup({ title, hint, state, open, onToggle, children }: FieldGroupProps) {
  return (
    <details className="lc-fieldGroup" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="lc-fieldGroupHeader disclosure">
        <span className="lc-fieldGroupTitle">{title}</span>
        <span className="lc-srOnly">: </span>
        <span className="lc-fieldGroupState">{state}</span>
      </summary>
      <div className="lc-fieldGroupBody">
        {hint && <p className="lc-fieldGroupHint">{hint}</p>}
        {children}
      </div>
    </details>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  hint?: string;
  /** A second line under the hint, on a line of its own. */
  note?: string;
  emphasized?: boolean;
  /** The longest amount in this row across the offers, so the row has one size in every card. */
  shared?: number;
}

function ResultRow({ label, value, hint, note, emphasized, shared }: ResultRowProps) {
  return (
    <div className={`lc-resultRow ${emphasized ? 'lc-resultRowEmphasized' : ''}`}>
      <dt className="lc-resultLabel">{label}</dt>
      <dd className="lc-resultValue">
        <Amounts shared={shared}>{value}</Amounts>
        {hint && <span className="lc-resultHint"><Amounts>{hint}</Amounts></span>}
        {note && <span className="lc-resultHint"><Amounts>{note}</Amounts></span>}
      </dd>
    </div>
  );
}

/**
 * What a screen reader is told once typing has settled: one offer's payment
 * and total, or the range of totals across the offers (the side-by-side
 * section's own sentence). `paidOff` holds the offers that have a total.
 * While an offer is invalid the reason is said instead, once, and the cards'
 * errors are not live regions.
 */
function announcedResult(
  paidOff: LoanResult[],
  validCount: number,
  currency: string,
  strings: Strings,
  formatMoney: (minor: number, currency: string) => string,
): string {
  if (validCount === 0) return '';
  if (validCount === 1) {
    const only = paidOff[0];
    return only
      ? format(strings.results.announceOne, {
          monthly: formatMoney(only.effectiveMonthlyMinor, currency),
          total: formatMoney(only.totalPaidMinor, currency),
        })
      : '';
  }
  if (paidOff.length < 2) return strings.delta.noRange;
  const totals = paidOff.map((r) => r.totalPaidMinor);
  const low = Math.min(...totals);
  const high = Math.max(...totals);
  const d = strings.delta;
  return low === high
    ? `${d.sameBefore}${formatMoney(low, currency)}${d.sameAfter}`
    : `${d.rangeBefore}${formatMoney(low, currency)}${d.rangeTo}${formatMoney(high, currency)}${d.rangeAcross}${formatMoney(high - low, currency)}${d.rangeAfter}`;
}

/** A valid offer as the announcement names it, with the notes under its result, in the card's order. */
interface NotedOffer {
  name: string;
  notes: string[];
}

/**
 * The notes under the offers' results, as they are said after the figures:
 * each offer's notes in the card's order, the offers in theirs. With one
 * offer the notes are its own; with several, each offer's notes follow its
 * name, as in the printed report. Nothing for offers with no notes.
 */
function announcedNotes(noted: NotedOffer[]): string {
  const several = noted.length > 1;
  return noted
    .filter((offer) => offer.notes.length > 0)
    .map((offer) => `${several ? `${offer.name}: ` : ''}${offer.notes.join(' ')}`)
    .join(' ');
}

/** The loan tool's one announcement, inside the money context it formats with. */
function LoanAnnouncement({ withheld, paidOff, validCount, noted, currency, strings, also, notice }: { withheld: boolean; paidOff: LoanResult[]; validCount: number; noted: NotedOffer[]; currency: string; strings: Strings; also: string | undefined; notice: Notice }) {
  const { formatMoney } = useMoney();
  // The figures, then the notes: one text, so a keystroke that changes both is said once.
  const result = [announcedResult(paidOff, validCount, currency, strings, formatMoney), announcedNotes(noted)].filter(Boolean).join(' ');
  return (
    <ResultAnnouncement
      text={withheld ? strings.delta.fix : result}
      delay={withheld ? WITHHELD_SAID_AFTER : undefined}
      also={withheld ? undefined : also}
      notice={notice}
    />
  );
}

// ---- Delta summary ---------------------------------------------------------

interface DeltaSummaryProps {
  withheld: boolean;
  reasonId: string;
  results: LoanResult[];
  vendors: VendorInput[];
  currency: string;
  // Note: previously took a `bestIndex` to highlight the cheapest vendor.
  // Removed when the winner-crowning was stripped: this component now
  // derives the lowest/highest vendors from the results internally and
  // describes the spread without naming a winner.
  strings: Strings;
}

function DeltaSummary({ withheld, reasonId, results, vendors, currency, strings }: DeltaSummaryProps) {
  const { formatMoney, amountLocale } = useMoney();
  // The heading stays: the phone's jump to the comparison focuses it.
  const reason = withheld ? strings.delta.fix : null;
  const valid = results
    .map((r, i) => ({
      r,
      i,
      name: shownName(vendors[i].name, i, strings),
      typed: isTypedName(vendors[i].name),
    }))
    .filter((x) => !x.r.error && x.r.schedule.length > 0);

  if (valid.length < 2) {
    return (
      <section className="lc-deltaSection">
        <h2 id="lc-delta-h" className="lc-sectionTitle" tabIndex={-1}>{strings.delta.heading}</h2>
        <Withheld reason={reason} reasonId={reasonId}>
          <p className="lc-deltaEmpty">
            {strings.delta.empty}
          </p>
        </Withheld>
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
  // Only offers that are paid off have a total. With the payment kept at a
  // rate change a loan may never be, and it is then left out of the range and
  // of the differences, never counted as the lowest because its total is blank.
  const sortedByTotal = valid.filter((v) => !isNotPaidOff(v.r)).sort(
    (a, b) => a.r.totalPaidMinor - b.r.totalPaidMinor,
  );
  const lowest: (typeof valid)[number] | undefined = sortedByTotal[0];
  const highest: (typeof valid)[number] | undefined = sortedByTotal[sortedByTotal.length - 1];
  const spreadMinor = lowest && highest ? highest.r.totalPaidMinor - lowest.r.totalPaidMinor : 0;
  const allSame = spreadMinor === 0;
  // Both ends of the range are compared, so they share one size.
  const rangeLength = lowest && highest
    ? longestAmount(formatMoney(lowest.r.totalPaidMinor, currency), formatMoney(highest.r.totalPaidMinor, currency))
    : 0;

  return (
    <section className="lc-deltaSection" aria-labelledby="lc-delta-h">
      <h2 id="lc-delta-h" className="lc-sectionTitle" tabIndex={-1}>{strings.delta.heading}</h2>
      <Withheld reason={reason} reasonId={reasonId}>
      {/*
        Not a live region: the tool's one announcement says this sentence once
        typing has settled. The wording is deliberately neutral: it states the range and the
        spread, without pointing the user at a specific vendor as "the
        cheapest". Naming a winner among real commercial offers risks
        being read as credit intermediation under the EU Consumer
        Credit Directive 2008/48/EC (and CCD2 from 2026 onward).
      */}
      <p className="lc-deltaHero">
        {!lowest || !highest || sortedByTotal.length < 2 ? (
          strings.delta.noRange
        ) : allSame ? (
          <>{strings.delta.sameBefore}
            <strong><Amount>{formatMoney(lowest.r.totalPaidMinor, currency)}</Amount></strong>
            {strings.delta.sameAfter}</>
        ) : (
          <>{strings.delta.rangeBefore}
            <strong><Amount shared={rangeLength}>{formatMoney(lowest.r.totalPaidMinor, currency)}</Amount></strong>
            {strings.delta.rangeTo}
            <strong><Amount shared={rangeLength}>{formatMoney(highest.r.totalPaidMinor, currency)}</Amount></strong>
            {strings.delta.rangeAcross}
            <strong><Amount>{formatMoney(spreadMinor, currency)}</Amount></strong>
            {strings.delta.rangeAfter}</>
        )}
      </p>
      {/* On phones the table restacks into one block per metric, each value
          marked with its vendor letter (data-slot) and colour, so nothing
          scrolls sideways. */}
      {/* Phones only: the table's header row is hidden there, so this key says
          which offer each letter is. The label is a fixed word; the names are
          text, never attributes. */}
      <ul className="lc-deltaKey" aria-label={strings.delta.keyAria}>
        {valid.map((v) => (
          <li key={v.i} style={{ '--lc-color': VENDOR_COLORS[v.i] } as React.CSSProperties}>
            <SeriesMarker index={v.i} color={VENDOR_COLORS[v.i]} />
            {v.typed && <span className="lc-deltaKeyLetter">{VENDOR_LABELS[v.i]}</span>}
            <span className="lc-deltaKeyName">{v.name}</span>
          </li>
        ))}
      </ul>
      <div className="lc-deltaTableWrap">
        <table className="lc-deltaTable">
          <thead>
            <tr>
              <th scope="col" aria-label={strings.delta.metricAria}><span className="lc-srOnly">{strings.delta.metricAria}</span></th>
              {valid.map((v) => (
                <th key={v.i}>{v.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <DeltaRow
              label={strings.delta.monthlyPayment}
              valid={valid}
              get={(r) => r.effectiveMonthlyMinor}
              format={(n) => formatMoney(n, currency)}
              cell={(r) => {
                const change = r.rateChange;
                if (r.keptPayment) {
                  return (
                    <span className="lc-deltaLines">
                      <span><Amount>{formatMoney(r.effectiveMonthlyMinor, currency)}</Amount></span>
                      <span className="lc-deltaNote">{strings.results.keptNote}</span>
                    </span>
                  );
                }
                if (!change) return null;
                if (change.paymentMinor === null) {
                  return (
                    <span className="lc-deltaLines">
                      <span><Amount>{formatMoney(r.effectiveMonthlyMinor, currency)}</Amount></span>
                      <span className="lc-deltaNote">{format(strings.results.paidOffBeforeChange, { payoffMonth: r.months })}</span>
                    </span>
                  );
                }
                return (
                  <PaymentSteps
                    first={formatMoney(r.effectiveMonthlyMinor, currency)}
                    later={formatMoney(change.paymentMinor, currency)}
                    month={change.month}
                    last={change.last === true}
                    strings={strings}
                  />
                );
              }}
            />
            <DeltaRow
              label={strings.delta.monthsToPayoff}
              valid={valid}
              get={(r) => r.months}
              format={(n) => months(n, strings.months)}
              cell={(r) => {
                if (!r.keptPayment) return null;
                if (isNotPaidOff(r)) return <span>{payoffText(r, strings).value}</span>;
                return (
                  <span className="lc-deltaLines">
                    <span>{months(r.months, strings.months)}</span>
                    <span className="lc-deltaNote">{payoffText(r, strings).hint}</span>
                  </span>
                );
              }}
            />
            <DeltaRow
              label={strings.delta.aprInclFees}
              valid={valid}
              // We round APRs to 6 decimal places (multiply by 1e6) so
              // formatting is stable even at the limits of the bisection
              // solver. Six decimals is well below anything we'd ever
              // display in the UI.
              get={(r) => Math.round(r.aprNominal * 1_000_000)}
              format={(n) => aprText(n / 1_000_000, currency, strings, amountLocale)}
              cell={(r) => (isNotPaidOff(r) ? <span>{strings.results.notAvailable}</span> : null)}
            />
            <DeltaRow
              label={strings.delta.totalInterest}
              valid={valid}
              get={(r) => r.totalInterestMinor}
              format={(n) => formatMoney(n, currency)}
              cell={(r) => (isNotPaidOff(r) ? <span>{noTotalText(r, strings)}</span> : null)}
            />
            <DeltaRow
              label={strings.delta.totalPaid}
              valid={valid}
              get={(r) => r.totalPaidMinor}
              format={(n) => formatMoney(n, currency)}
              cell={(r) => (isNotPaidOff(r) ? <span>{noTotalText(r, strings)}</span> : null)}
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
              <th scope="row">{strings.delta.diffRow}</th>
              {valid.map((v) => {
                const diff = lowest && !isNotPaidOff(v.r) && sortedByTotal.length > 1 ? v.r.totalPaidMinor - lowest.r.totalPaidMinor : NaN;
                return (
                  <td key={v.i} data-slot={VENDOR_LABELS[v.i]} style={{ '--lc-color': VENDOR_COLORS[v.i] } as React.CSSProperties}>
                    {Number.isNaN(diff) ? (
                      <span>{strings.delta.notComparable}</span>
                    ) : diff === 0 ? (
                      <span className="lc-deltaBaseline" aria-label={strings.delta.baselineAria}>{strings.delta.baseline}</span>
                    ) : (
                      <span className="lc-deltaCost"><Amount shared={longestAmount(`+${formatMoney(spreadMinor, currency)}`)}>{`+${formatMoney(diff, currency)}`}</Amount></span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lc-deltaNote">
        {strings.delta.aprNote}
      </p>
      </Withheld>
    </section>
  );
}

interface DeltaRowProps {
  label: string;
  valid: { r: LoanResult; i: number; name: string }[];
  get: (r: LoanResult) => number;
  format: (n: number) => string;
  /** A cell of several lines in place of the plain value; null keeps the value. */
  cell?: (r: LoanResult) => React.ReactNode;
  emphasized?: boolean;
}

// We deliberately do not flag a "best" cell per metric. Per-metric
// "winners" turn the framing from "here are the numbers" into "here is
// the right answer for monthly payment / interest / APR": a series of
// recommendations the calculator isn't qualified to make. We just print
// the values; the user reads them.
function DeltaRow({ label, valid, get, format, cell, emphasized }: DeltaRowProps) {
  const values = valid.map((v) => get(v.r));
  // A cell of several lines (a payment that changes with the rate) replaces the
  // plain value; on phones the whole row then puts one offer per line.
  const cells = valid.map((v) => cell?.(v.r) ?? null);
  const stacked = cells.some((c) => c !== null);
  // The offers are compared along this row, so its amounts share one size.
  const shared = longestAmount(...values.map((v) => format(v)));
  return (
    <tr className={[emphasized ? 'lc-deltaRowEmphasized' : '', stacked ? 'lc-deltaRowStacked' : ''].filter(Boolean).join(' ')}>
      <th scope="row">{label}</th>
      <SharedAmounts length={shared}>
      {valid.map((v, idx) => (
        <td key={v.i} data-slot={VENDOR_LABELS[v.i]} style={{ '--lc-color': VENDOR_COLORS[v.i] } as React.CSSProperties}>{cells[idx] ?? <span><Amounts>{format(values[idx])}</Amounts></span>}</td>
      ))}
      </SharedAmounts>
    </tr>
  );
}

/**
 * A payment that changes once: the first amount under its months, then the
 * later one, at the same weight. The label comes before its amount in the
 * markup, which is the order a screen reader gives them.
 */
function PaymentSteps({ first, later, month, last, strings }: { first: string; later: string; month: number; last?: boolean; strings: Strings }) {
  return (
    <span className="lc-steps">
      <span className="lc-step">
        <span className="lc-stepLabel">{month === 2 ? format(strings.balance.month, { m: 1 }) : format(strings.results.monthlyFirst, { lastMonth: month - 1 })}</span>{' '}
        <span className="lc-stepAmount"><Amount>{first}</Amount></span>
      </span>
      <span className="lc-step">
        <span className="lc-stepLabel">{format(last ? strings.results.monthlyLast : strings.results.monthlyFrom, { month })}</span>{' '}
        <span className="lc-stepAmount"><Amount>{later}</Amount></span>
      </span>
    </span>
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

/** The tab strip, in the order it reads. The ids are view state, and the four
 *  panels below key off them; only the words come from the catalog. */
function analysisTabs(strings: Strings): { id: AnalysisTab; label: string; hint: string }[] {
  return [
    {
      id: 'charts',
      label: strings.tabs.charts.label,
      hint: strings.tabs.charts.hint,
    },
    {
      id: 'horizon',
      label: strings.tabs.horizon.label,
      hint: strings.tabs.horizon.hint,
    },
    {
      id: 'refi',
      label: strings.tabs.refi.label,
      hint: strings.tabs.refi.hint,
    },
    {
      id: 'how',
      label: strings.tabs.how.label,
      hint: strings.tabs.how.hint,
    },
  ];
}

interface AnalysisTabsProps {
  vendors: VendorInput[];
  results: LoanResult[];
  currency: string;
  cheapestByTotal: number;
  splitVendorIdx: number | null;
  onSplitVendorChange: (idx: number | null) => void;
  globalState: GlobalState;
  onGlobalChange: (patch: Partial<GlobalState>) => void;
  /** The refinance scenario's sentence for the tool's announcement; undefined when its tab closes. */
  onRefiSaid: (text: string | undefined) => void;
  strings: Strings;
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
  onRefiSaid,
  strings,
}: AnalysisTabsProps) {
  const tabs = analysisTabs(strings);
  const active = globalState.activeTab;
  const panelId = useId();
  // Refs to each tab button so the keyboard handler can move DOM focus
  // when the user navigates with arrow keys. Per WAI-ARIA APG for tabs,
  // arrow keys MUST move both selection and focus.
  // Stryker disable next-line ArrayDeclaration: equivalent. Every tab sets its own place in the list when it is drawn, so what the list starts with is never read.
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
    const currentIdx = tabs.findIndex((t) => t.id === active);
    // Stryker disable next-line UnaryOperator: equivalent. Every key that is handled sets the index before it is used, and every other key returns first.
    let nextIdx = -1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (currentIdx + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextTab = tabs[nextIdx];
    onGlobalChange({ activeTab: nextTab.id });
    track('free_loan_comparison_tab_changed', { tab: nextTab.id, via: 'keyboard' });
    // Defer focus until React has committed the new active tab so the
    // ref points at the now-mounted button. requestAnimationFrame is
    // sufficient; the button always exists because all four are rendered
    // simultaneously (only their tabindex / aria-selected differ).
    requestAnimationFrame(() => tabRefs.current[nextIdx]?.focus());
  };

  return (
    <section className="lc-analysis" aria-label={strings.tabs.aria}>
      <div
        className="lc-tabList"
        role="tablist"
        aria-label={strings.tabs.listAria}
        onKeyDown={onTabKeyDown}
      >
        {tabs.map((t, i) => {
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
              // Only the open tab has a panel in the page, so only it names
              // one: the others pointed at ids that did not exist (#596).
              aria-controls={selected ? `${panelId}-${t.id}-panel` : undefined}
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
            strings={strings}
          />
        )}
        {active === 'horizon' && (
          <HorizonSection
            vendors={vendors}
            results={results}
            currency={currency}
            horizonMonths={globalState.horizonMonths}
            onHorizonChange={(next) => onGlobalChange({ horizonMonths: next })}
            strings={strings}
          />
        )}
        {active === 'refi' && (
          <RefinanceSection
            vendors={vendors}
            results={results}
            currency={currency}
            state={globalState}
            onChange={onGlobalChange}
            onSaid={onRefiSaid}
            strings={strings}
          />
        )}
        {active === 'how' && <HowItWorksPanel strings={strings} />}
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
  strings: Strings;
}

function ChartsPanel({
  vendors,
  results,
  currency,
  cheapestByTotal,
  splitVendorIdx,
  onSplitVendorChange,
  strings,
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
  const vendorName =
    shownName(activeVendor?.name ?? '', activeIdx, strings);

  return (
    <div className="lc-chartsPanel">
      <section className="lc-chartSection" aria-labelledby="lc-balance-h">
        <header className="lc-chartHeader">
          <h3 id="lc-balance-h" className="lc-sectionTitle">{strings.charts.balanceHeading}</h3>
          <p className="lc-chartLead">
            {strings.charts.balanceLead}
          </p>
        </header>
        <BalanceChart
          results={results}
          colors={VENDOR_COLORS}
          vendorNames={vendors.map(
            (v, i) => shownName(v.name, i, strings),
          )}
          currency={currency}
          strings={strings}
        />
      </section>

      <section className="lc-chartSection lc-splitSection" aria-labelledby="lc-split-h">
        <header className="lc-chartHeader">
          <h3 id="lc-split-h" className="lc-sectionTitle">{strings.charts.splitHeading}</h3>
          <p className="lc-chartLead">
            {strings.charts.splitLead}
          </p>
        </header>

        <div className="lc-splitControls">
          <label className="lc-fieldLabel" htmlFor={splitSelectId}>{strings.charts.vendorLabel}</label>
          <select
            id={splitSelectId}
            className="lc-select lc-splitSelect"
            // Stryker disable next-line StringLiteral: equivalent. A value no option has leaves React to select the first option, the automatic choice, which is what the empty value selects.
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
            <option value="">{strings.charts.autoOption}</option>
            {vendors.map((v, i) => (
              <option key={i} value={i} disabled={Boolean(results[i]?.error)}>
                {shownName(v.name, i, strings)}
                {results[i]?.error ? strings.charts.incomplete : ''}
              </option>
            ))}
          </select>
        </div>

        {activeResult && !activeResult.error && activeResult.contractSchedule.length > 0 ? (
          <SplitChart
            // A loan that is never paid off: the months the balance chart
            // shows, and a payment smaller than its interest is all interest.
            schedule={
              isNotPaidOff(activeResult)
                ? activeResult.contractSchedule
                    .slice(0, shownMonths(results, activeIdx))
                    .map((row) => (row.principal < 0 ? { ...row, interest: row.payment, principal: 0 } : row))
                : activeResult.contractSchedule
            }
            currency={currency}
            vendorName={vendorName}
            vendorColor={VENDOR_COLORS[activeIdx]}
            vendorInk={VENDOR_INKS[activeIdx]}
            strings={strings}
          />
        ) : (
          <p className="lc-chartEmpty">
            {strings.charts.splitEmpty}
          </p>
        )}

        <p className="lc-splitCaption">
          {strings.charts.caption.before}
          <strong>{vendorName}</strong>
          {strings.charts.caption.afterName}
          {Number(activeVendor?.extraMonthly) > 0 && strings.charts.caption.noExtras}
          {strings.charts.caption.extra}
        </p>
      </section>
    </div>
  );
}

// ---- How it works panel ----------------------------------------------------

function HowItWorksPanel({ strings }: { strings: Strings }) {
  return (
    <div className="lc-howPanel">
      <h3 className="lc-sectionTitle">{strings.how.heading}</h3>
      <p>
        {strings.how.intro}
      </p>
      <p className="lc-formula">
        <code>
          M = P · r / (1 − (1 + r)<sup>−n</sup>)
        </code>
      </p>
      <ul className="lc-howList">
        <li>
          <strong>P</strong>
          {strings.how.symbols.p}
          <strong>r</strong>
          {strings.how.symbols.r}
          <strong>n</strong>
          {strings.how.symbols.n}
        </li>
        <li>
          {strings.how.monthly}
        </li>
        <li>
          <strong>{strings.how.apr.strong}</strong>
          {strings.how.apr.rest}
        </li>
        <li>
          <strong>{strings.how.hybrid.strong}</strong>
          {strings.how.hybrid.rest}
        </li>
        <li>
          <strong>{strings.how.lumps.strong}</strong>
          {strings.how.lumps.rest}
        </li>
        <li>
          <strong>{strings.how.penalties.strong}</strong>
          {strings.how.penalties.rest}
        </li>
      </ul>
      <p className="lc-howNote">
        {strings.how.note}
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
  strings: Strings;
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
  strings,
}: HorizonSectionProps) {
  const { formatMoney } = useMoney();
  const horizonId = useId();
  const horizonErrorId = useId();
  const badHorizon = isUnreadable(horizonMonths);
  // Debounced engagement signal. We don't want to fire one event per
  // slider tick (a single drag would send dozens), so we schedule a
  // track() 600ms after the last change. The ref persists across
  // renders; the useEffect cleanup cancels in-flight timers when the
  // component unmounts. The event says only that the horizon was changed:
  // the number itself is something a reader typed or dragged to, and events
  // carry choices, never values.
  const horizonTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadableText = useContext(UnreadableContext);
  const [typed, setTyped] = useState(false);
  const handleHorizonChange = useCallback(
    (next: string) => {
      setTyped(true);
      onHorizonChange(next);
      if (horizonTrackTimer.current) {
        clearTimeout(horizonTrackTimer.current);
      }
      horizonTrackTimer.current = setTimeout(() => {
        const m = Math.round(parseNumber(next));
        if (!Number.isFinite(m) || m <= 0) return;
        track('free_loan_comparison_horizon_changed');
      }, 600);
    },
    [onHorizonChange],
  );
  useEffect(() => () => {
    if (horizonTrackTimer.current) clearTimeout(horizonTrackTimer.current);
  },
  // Stryker disable next-line ArrayDeclaration: any list that never changes runs the cleanup once, on unmount, as the empty one does.
  []);
  // The slider's max is the longest valid schedule: a horizon past every
  // vendor's payoff is meaningless. We clamp to a sensible minimum of
  // 1 month so the slider always renders.
  const maxMonths = Math.max(
    1,
    ...results.map((r, i) => (r.error ? 0 : shownMonths(results, i))),
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
        <h3 id="lc-horizon-h" className="lc-sectionTitle">{strings.horizon.heading}</h3>
        <p className="lc-sectionLead">
          {strings.horizon.lead}
        </p>
      </header>

      <div className="lc-horizonControls">
        <label className="lc-fieldLabel" htmlFor={horizonId}>
          {strings.horizon.label}{!badHorizon && <strong>{months(horizon, strings.months)}</strong>}
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
          aria-valuetext={badHorizon ? engineError(OPTIONAL_UNREADABLE, strings) : months(horizon, strings.months)}
          className="lc-horizonSlider"
        />
        <LocaleNumberInput
          inputMode="numeric"
          className="lc-input lc-horizonInput"
          value={horizonMonths}
          onValueChange={(v) => handleHorizonChange(v)}
          aria-label={strings.horizon.inputAria}
          aria-invalid={badHorizon || undefined}
          aria-describedby={badHorizon ? horizonErrorId : undefined}
        />
      </div>

      {badHorizon ? (
        <p className="lc-error" id={horizonErrorId} role="alert"><ErrorText>{typed ? engineError(OPTIONAL_UNREADABLE, strings) : unreadableText}</ErrorText></p>
      ) : validRows.length === 0 ? (
        <p className="lc-deltaEmpty">{strings.horizon.empty}</p>
      ) : (
        <div className="lc-deltaTableWrap">
          <table className="lc-deltaTable">
            <thead>
              <tr>
                <th scope="col"><span className="lc-srOnly">{strings.delta.metricAria}</span></th>
                {validRows.map((row) => (
                  <th key={row.i}>
                    {shownName(row.v.name, row.i, strings)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{strings.horizon.principalRepaid}</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      <Amount>{formatMoney(snap.principalPaidMinor, currency)}</Amount>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">{strings.horizon.interestPaid}</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      <Amount>{formatMoney(snap.interestPaidMinor, currency)}</Amount>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">{strings.horizon.balanceRemaining}</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      <Amount>{formatMoney(snap.balanceMinor, currency)}</Amount>
                    </td>
                  );
                })}
              </tr>
              <tr className="lc-deltaRowEmphasized">
                <th scope="row">{strings.horizon.totalCashOut}</th>
                {validRows.map((row) => {
                  const snap = equityAtMonth(row.r.schedule, horizon, row.r.feeMinor);
                  return (
                    <td key={row.i}>
                      <Amount>{formatMoney(snap.totalOutOfPocketMinor, currency)}</Amount>
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
  /** Hands the outcome sentence to the tool's one announcement; undefined when this section closes. */
  onSaid: (text: string | undefined) => void;
  strings: Strings;
}

/** The break-even row's value: a count of months, or the words for the cases that have none. */
function refinanceBreakEven(cmp: RefinanceComparison, strings: Strings): string {
  if (cmp.breakEvenKind === 'none') return cmp.paymentLower ? strings.refi.fromFirstMonth : strings.refi.nothingToRecoup;
  return Number.isFinite(cmp.breakEvenMonths) ? months(cmp.breakEvenMonths, strings.months) : strings.results.never;
}

/**
 * A count of months in words for a screen reader, in the page's language:
 * "4 years, 6 months", where the row on screen has "4 yr 6 mo", which some
 * screen readers spell out letter by letter. Only ever called in the browser.
 */
function spokenMonths(count: number): string {
  // Western digits, as everywhere else on the site (Marathi would default to its own).
  const lang = `${document.documentElement.lang || 'en'}-u-nu-latn`;
  const unit = (n: number, u: 'year' | 'month') => new Intl.NumberFormat(lang, { style: 'unit', unit: u, unitDisplay: 'long' }).format(n);
  const y = Math.floor(count / 12);
  const m = count % 12;
  const parts = [y > 0 ? unit(y, 'year') : '', m > 0 || y === 0 ? unit(m, 'month') : ''].filter(Boolean);
  return new Intl.ListFormat(lang, { style: 'long', type: 'unit' }).format(parts);
}

/**
 * What a screen reader is told once typing in the refinance scenario has
 * settled: the saving or the extra cost, and the break-even of its row, with
 * the time in whole words. Empty while there is no comparison: an error there
 * is an alert of its own.
 */
function announcedRefinance(
  cmp: RefinanceComparison | { error: string } | null,
  currency: string,
  strings: Strings,
  formatMoney: (minor: number, currency: string) => string,
): string {
  if (!cmp || 'error' in cmp) return '';
  const penalty = cmp.penaltyMinor > 0 ? ` ${format(strings.refi.announcePenalty, { amount: formatMoney(cmp.penaltyMinor, currency) })}` : '';
  return format(cmp.savingsMinor >= 0 ? strings.refi.announceSaves : strings.refi.announceCosts, {
    amount: formatMoney(Math.abs(cmp.savingsMinor), currency),
    time: cmp.breakEvenKind !== 'none' && Number.isFinite(cmp.breakEvenMonths) && typeof document !== 'undefined'
      ? spokenMonths(cmp.breakEvenMonths)
      : refinanceBreakEven(cmp, strings),
  }) + penalty;
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
  onSaid,
  strings,
}: RefinanceSectionProps) {
  const { formatMoney } = useMoney();
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
  const unreadableText = useContext(UnreadableContext);
  const [typed, setTyped] = useState(false);
  const refiTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRefiChange = useCallback((field: keyof GlobalState) => {
    setTyped(true);
    if (refiTrackTimer.current) {
      clearTimeout(refiTrackTimer.current);
    }
    refiTrackTimer.current = setTimeout(() => {
      track('free_loan_comparison_refi_changed', { field });
    }, 600);
  },
  // Stryker disable next-line ArrayDeclaration: any list that never changes keeps the same function, as the empty one does.
  []);
  useEffect(() => () => {
    if (refiTrackTimer.current) clearTimeout(refiTrackTimer.current);
  },
  // Stryker disable next-line ArrayDeclaration: any list that never changes runs the cleanup once, on unmount, as the empty one does.
  []);

  // Resolve the vendor to refinance. We accept any 1-based index that
  // points to a valid result; on mismatch we fall back to the first
  // valid vendor.
  const requestedIdx = Math.round(parseNumber(state.refiVendorIndex)) - 1;
  const validIndices = vendors
    .map((_, i) => i)
    // A loan that is never paid off has no remaining cost to set a new loan against.
    .filter((i) => !results[i].error && results[i].schedule.length > 0 && !isNotPaidOff(results[i]));
  const activeIdx =
    validIndices.includes(requestedIdx) ? requestedIdx : (validIndices[0] ?? -1);

  const original = activeIdx >= 0 ? results[activeIdx] : null;
  const atMonth = Math.round(parseNumber(state.refiAtMonth));
  const newRate = parseNumber(state.refiNewRatePct) / 100;
  const newTerm = Math.round(parseNumber(state.refiNewTermMonths));
  const newFeeMinor = toMinor(parseNumber(state.refiNewFeeMajor) || 0, currency);
  // An empty fee is none paid. One that cannot be read is not: it gives no result.
  const refiErrorId = useId();
  const badAtMonth = isUnreadable(state.refiAtMonth);
  const badRate = isUnreadable(state.refiNewRatePct);
  const badTerm = isUnreadable(state.refiNewTermMonths);
  const badFee = isUnreadable(state.refiNewFeeMajor);
  const badRefi = badAtMonth || badRate || badTerm || badFee;

  const cmp =
    !badRefi && original && Number.isFinite(atMonth) && Number.isFinite(newRate) && Number.isFinite(newTerm)
      ? // The offer as entered goes with its result: the refinance clears the
        // loan, so its penalty may be due, and its extra payments continue
        // on the new loan.
        refinanceComparison(original, atMonth, newRate, newTerm, newFeeMinor, state.refiRollFee, loanFromInput(vendors[activeIdx], currency))
      : null;

  // The outcome goes to the tool's one announcement, which says it once
  // typing has settled; nothing here is a live region (#608).
  const said = announcedRefinance(cmp, currency, strings, formatMoney);
  useEffect(() => { onSaid(said); }, [said, onSaid]);
  useEffect(() => () => onSaid(undefined), [onSaid]);

  return (
    <section className="lc-advancedSection lc-refiSection" aria-labelledby="lc-refi-h">
      <header>
        <h3 id="lc-refi-h" className="lc-sectionTitle">{strings.refi.heading}</h3>
        <p className="lc-sectionLead">
          {strings.refi.lead}
        </p>
      </header>

      <div className="lc-refiInputs">
        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={vendorSelectId}>{strings.refi.whichLoan}</label>
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
              // Stryker disable next-line OptionalChaining: unreachable. Every offer has a result here: the offers to refinance, worked out above, read results[i].error without it and would have thrown first.
              <option key={i} value={String(i + 1)} disabled={Boolean(results[i]?.error)}>
                {shownName(v.name, i, strings)}
                {results[i]?.error ? strings.charts.incomplete : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={atMonthId}>{strings.refi.atMonth}</label>
          <LocaleNumberInput
            id={atMonthId}
            inputMode="numeric"
            className="lc-input"
            aria-invalid={badAtMonth || undefined}
            aria-describedby={badAtMonth ? refiErrorId : undefined}
            value={state.refiAtMonth}
            onValueChange={(v) => {
              onChange({ refiAtMonth: v });
              trackRefiChange('refiAtMonth');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newRateId}>{strings.refi.newRate}</label>
          <LocaleNumberInput
            id={newRateId}
            inputMode="decimal"
            className="lc-input"
            aria-invalid={badRate || undefined}
            aria-describedby={badRate ? refiErrorId : undefined}
            value={state.refiNewRatePct}
            onValueChange={(v) => {
              onChange({ refiNewRatePct: v });
              trackRefiChange('refiNewRatePct');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newTermId}>{strings.refi.newTerm}</label>
          <LocaleNumberInput
            id={newTermId}
            inputMode="numeric"
            className="lc-input"
            aria-invalid={badTerm || undefined}
            aria-describedby={badTerm ? refiErrorId : undefined}
            value={state.refiNewTermMonths}
            onValueChange={(v) => {
              onChange({ refiNewTermMonths: v });
              trackRefiChange('refiNewTermMonths');
            }}
          />
        </div>

        <div className="lc-field">
          <label className="lc-fieldLabel" htmlFor={newFeeId}>
            {strings.refi.newFee} <span className="lc-fieldHint">({currency})</span>
          </label>
          <LocaleNumberInput
            id={newFeeId}
            inputMode="decimal"
            className="lc-input"
            aria-invalid={badFee || undefined}
            aria-describedby={badFee ? refiErrorId : undefined}
            value={state.refiNewFeeMajor}
            onValueChange={(v) => {
              onChange({ refiNewFeeMajor: v });
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
            {strings.refi.rollFee}
          </label>
        </div>
      </div>

      {badRefi ? (
        <p className="lc-error" id={refiErrorId} role="alert"><ErrorText>{typed ? engineError(OPTIONAL_UNREADABLE, strings) : unreadableText}</ErrorText></p>
      ) : !cmp ? (
        <p className="lc-deltaEmpty">
          {strings.refi.empty}
        </p>
      ) : 'error' in cmp ? (
        <p className="lc-error" role="alert"><ErrorText>{engineError(cmp.error, strings)}</ErrorText></p>
      ) : (
        <div className="lc-refiResults">
          <dl className="lc-resultList">
            {/* Keeping and refinancing are compared, so the two totals share one size. */}
            <ResultRow
              label={strings.refi.keepTotal}
              value={formatMoney(cmp.keepTotalMinor, currency)}
              shared={longestAmount(formatMoney(cmp.keepTotalMinor, currency), formatMoney(cmp.refinanceTotalMinor, currency))}
            />
            <ResultRow
              label={strings.refi.refiTotal}
              value={formatMoney(cmp.refinanceTotalMinor, currency)}
              shared={longestAmount(formatMoney(cmp.keepTotalMinor, currency), formatMoney(cmp.refinanceTotalMinor, currency))}
              hint={cmp.extrasCarried ? strings.refi.extrasCarried : undefined}
            />
            {cmp.penaltyMinor > 0 && (
              <ResultRow
                label={strings.refi.penalty}
                value={formatMoney(cmp.penaltyMinor, currency)}
                hint={strings.refi.penaltyHint}
              />
            )}
            <ResultRow
              label={cmp.savingsMinor >= 0 ? strings.refi.saves : strings.refi.costsMore}
              value={formatMoney(Math.abs(cmp.savingsMinor), currency)}
              emphasized
            />
            {/* Three kinds of break-even, each with its own words: a cost paid
                in cash, closing costs that went into the new loan, and
                nothing to pay back at all (which used to read "n/a"). */}
            <ResultRow
              label={strings.refi.breakEven}
              value={refinanceBreakEven(cmp, strings)}
              hint={
                cmp.breakEvenKind === 'none'
                  ? cmp.paymentLower ? strings.refi.fromFirstMonthHint : strings.refi.nothingToRecoupHint
                  : cmp.breakEvenKind === 'balance'
                    ? Number.isFinite(cmp.breakEvenMonths) ? strings.refi.breakEvenBalanceHint : strings.refi.breakEvenBalanceNever
                    : Number.isFinite(cmp.breakEvenMonths) ? strings.refi.breakEvenHint : strings.refi.breakEvenNever
              }
              // Said only where it is the case: the refinance breaks even and
              // still costs more in total, and the new loan ends later than
              // the current one would have (each with the reader's extra
              // payments), which is what the sentence names (#715).
              note={
                cmp.breakEvenKind !== 'none' && Number.isFinite(cmp.breakEvenMonths) && cmp.savingsMinor < 0
                && cmp.endsLater
                  ? cmp.breakEvenKind === 'balance' ? strings.refi.breakEvenBalanceLongerTerm : strings.refi.breakEvenLongerTerm
                  : undefined
              }
            />
          </dl>
        </div>
      )}
    </section>
  );
}

// The parts of the page, for their own tests: each can be mounted or called
// without the whole comparison around it. The page itself uses only the
// default export.
export {
  AnalysisTabs, BalanceChart, ChartsPanel, DeltaRow, DeltaSummary, FieldGroup, HorizonSection, HowItWorksPanel,
  LoanAnnouncement, PaymentSteps, PrintedReport, RefinanceSection, RequiredLabel, ResultRow, SplitChart, VendorCard,
  analysisTabs, announcedNotes, announcedRefinance, announcedResult, aprText, engineWarning, formatYearLabel, isTypedName, months,
  noTotalText, payoffText, sampleSchedule, shownName, spokenMonths, usePhone,
};
