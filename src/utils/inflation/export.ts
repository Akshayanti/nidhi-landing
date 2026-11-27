/**
 * The inflation calculator's spreadsheet: the question, what was entered, the
 * answer in words and as a number, and the path the chart draws.
 *
 * It is built from the settled state and the answer the page is showing, so
 * the file and the screen cannot disagree. The page rounds its headline
 * ("about €1,200"); the file keeps each amount to the currency's minor units,
 * and says so.
 *
 * Pure: no DOM, no analytics. The island hands the sheets to `downloadWorkbook`.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import { format } from '../../i18n/format.ts';
import { amountFormat, typedRate, type Cell, type Sheet } from '../shared/xlsx.ts';
import type { ToolState } from './url.ts';
import { roundAbout } from './math.ts';
import type { MonthlySource } from './monthly.ts';

type Island = Dict['tools']['inflation']['island'];
type Common = Dict['tools']['export'];

/** What the page shows as its answer (see `computeAnswer` in the island). */
export interface InflationAnswer {
  /** The question, as the page asks it. */
  question: string;
  /** The answer's sentences, as on the page. */
  sentences: string[];
  /** The answer as a number: an amount, or for "keeping up" a percent a year. */
  value: number;
  /** The chart's path: a year count from today, or a calendar year. */
  points: { x: number; value: number }[];
  /** The x column's heading (the chart's own axis title). */
  axis: string;
  /** The chart's title, which names what the values are. */
  chartTitle: string;
  /** Set when the answer uses a country's actual yearly inflation. */
  history: { country: string; from: number; to: number } | null;
  /**
   * Set when that answer ends at a month after the last full year, from the
   * monthly index (`monthly.ts`): the month as `YYYY-MM`, and the amount there.
   */
  monthEnd?: { month: string; value: number; source: MonthlySource } | null;
}

export interface InflationExport {
  island: Island;
  common: Common;
  state: ToolState;
  answer: InflationAnswer;
  /** The selected currency's decimals (its minor units). */
  decimals: number;
  date: string;
  page: string;
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));

export function inflationSheets({ island, common, state, answer, decimals, date, page }: InflationExport): Sheet[] {
  const x = island.export;
  // A small amount the page writes with more decimals than the currency has
  // ("about ¥1.3", "about €0.074", #868) is given as the page writes it: to
  // the currency's smallest unit it would read 1 or 0.07, less than the page says.
  // From 10 up the page's figure is whole, so no currency fails the test.
  const money = (v: number): Cell => {
    const shown = roundAbout(v);
    return Number(shown.toFixed(decimals)) !== shown ? { n: shown, fmt: 'general' } : { n: Number(v.toFixed(decimals)), fmt: amountFormat(decimals) };
  };
  // Typed rates keep the decimals they were given.
  const rate = (v: number): Cell => typedRate(v);
  const whole = (v: number): Cell => ({ n: v, fmt: 'integer' });
  const mode = state.mode;

  const about: Sheet = {
    name: common.sheets.about,
    widths: [22, 90],
    rows: [
      head(common.columns.item, common.columns.value),
      [common.about.tool, island.formLabel],
      [common.about.made, date],
      [common.about.currency, state.currency],
      [common.about.page, page],
      [x.moneyLabel, x.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ],
  };

  const inputRows: Cell[][] = [
    [x.question, island.tabs[mode]],
    [island.fields.amount[mode], money(state.amount)],
  ];
  if (answer.history) {
    inputRows.push([x.country, answer.history.country], [island.fields.from, whole(answer.history.from)]);
  } else {
    inputRows.push([island.fields.rate, rate(state.rate)], [island.fields.years[mode], whole(state.years)]);
    if (mode === 'keep') inputRows.push([island.fields.growth, rate(state.growth)]);
  }
  const inputs: Sheet = { name: common.sheets.inputs, widths: [34, 18], rows: [head(common.columns.item, common.columns.value), ...inputRows] };

  const answerRows: Cell[][] = [
    [x.question, answer.question],
    [mode === 'keep' ? x.realRate : x.result, mode === 'keep' ? { n: answer.value, fmt: 'decimal2' } : money(answer.value)],
    ...answer.sentences.map((s): Cell[] => [x.inWords, s]),
  ];
  if (answer.history) {
    const span = format(island.history.range, { first: answer.history.from, last: answer.history.to });
    answerRows.push([x.years, span]);
    // The month is given as the index names it, 2026-09: the same in every language.
    if (answer.monthEnd) answerRows.push([x.monthEnd, answer.monthEnd.month]);
    answerRows.push([x.source, answer.monthEnd ? `${x.sourceText} ${x.sourceTextMonthly[answer.monthEnd.source]}` : x.sourceText]);
  }
  const answerSheet: Sheet = { name: x.sheets.answer, widths: [26, 100], rows: [head(common.columns.item, common.columns.value), ...answerRows] };

  const byYear: Sheet = {
    name: x.sheets.byYear,
    widths: [16, 18],
    rows: [
      [{ t: answer.chartTitle, bold: true }],
      head(answer.axis, common.columns.value),
      ...answer.points.map((p): Cell[] => [whole(p.x), money(p.value)]),
      // One month, not a year's average: the row after it says so.
      ...(answer.monthEnd ? [[answer.monthEnd.month, money(answer.monthEnd.value)] as Cell[], [x.monthRow] as Cell[]] : []),
    ],
  };

  return [about, inputs, answerSheet, byYear];
}
