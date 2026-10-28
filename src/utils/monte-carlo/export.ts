/**
 * The Monte Carlo simulator's spreadsheet: the plan, the assumptions, every
 * year's spread and the outcome, as the results on screen show them.
 *
 * It is built from the plan and the result the page is showing (never a plan
 * still being typed), so the file and the screen cannot disagree. Amounts are
 * rounded to whole units, as the screen writes them: a simulated balance has
 * no meaningful cents. Shares are percentages, written as numbers.
 *
 * Pure: no DOM, no analytics. The island hands the sheets to `downloadWorkbook`.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import { format } from '../../i18n/format.ts';
import type { Cell, Sheet } from '../shared/xlsx.ts';
import { QUOTED_RATES, type SimulationResult } from './math.ts';
import type { ToolState } from './url.ts';

type Island = Dict['tools']['monteCarlo']['island'];
type Common = Dict['tools']['export'];

export interface MonteCarloExport {
  island: Island;
  common: Common;
  state: ToolState;
  result: SimulationResult;
  /** The day the file is made, YYYY-MM-DD. */
  date: string;
  /** The page's address, without any shared state. */
  page: string;
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));
const amount = (v: number): Cell => ({ n: Math.round(v), fmt: 'amount0' });
const percent = (share: number): Cell => ({ n: Math.round(share * 10_000) / 100, fmt: 'decimal2' });
const whole = (v: number): Cell => ({ n: v, fmt: 'integer' });

export function monteCarloSheets({ island, common, state, result, date, page }: MonteCarloExport): Sheet[] {
  const x = island.export;
  const withdrawing = state.withdrawal > 0;

  const about: Sheet = {
    name: common.sheets.about,
    widths: [22, 90],
    rows: [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, date],
      [common.about.currency, state.currency],
      [common.about.page, page],
      [x.moneyLabel, x.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
    ],
  };

  const inputRows: Cell[][] = [
    [island.fields.start, amount(state.start)],
    [island.fields.monthly, amount(state.monthly)],
    [island.fields.saveYears, whole(state.saveYears)],
    [x.stocks, whole(state.stockPct)],
    [x.bonds, whole(100 - state.stockPct)],
    [island.settings.feeLabel, { n: state.feePct, fmt: 'decimal2' }],
    [x.withdrawals, withdrawing ? common.yes : common.no],
  ];
  if (withdrawing) {
    inputRows.push([island.withdraw.amountLabel, amount(state.withdrawal)], [island.withdraw.yearsLabel, whole(state.withdrawYears)]);
  }
  const inputs: Sheet = { name: common.sheets.inputs, widths: [34, 18], rows: [head(common.columns.item, common.columns.value), ...inputRows] };

  const rates = QUOTED_RATES[state.returns];
  const assumptions: Sheet = {
    name: x.sheets.assumptions,
    widths: [48, 18],
    rows: [
      head(common.columns.item, common.columns.value),
      [island.settings.legend, island.returns[state.returns]],
      [x.stocksGrowth, percent(rates.stocks)],
      [x.bondsGrowth, percent(rates.bonds)],
      [island.settings.pathsLabel, whole(result.paths)],
      [x.rebalanced, island.fields.mixHint],
    ],
  };

  const byYear: Sheet = {
    name: x.sheets.byYear,
    widths: [10, 16, 16, 16, 16, 16, 16],
    rows: [
      head(island.results.tableYear, island.results.tableLow, x.p25, island.results.tableMedian, x.p75, island.results.tableHigh, island.results.tableStraight),
      ...result.bands.map((b, year): Cell[] => [
        whole(year),
        amount(b.p10),
        amount(b.p25),
        amount(b.p50),
        amount(b.p75),
        amount(b.p90),
        amount(result.straightLine[year]),
      ]),
    ],
  };

  const outcomeRows: Cell[][] = [
    [x.atEndOfSaving, null],
    [island.results.tableLow, amount(result.atRetirement.p10)],
    [island.results.tableMedian, amount(result.atRetirement.p50)],
    [island.results.tableHigh, amount(result.atRetirement.p90)],
    [x.belowLine, percent(result.belowStraightLine)],
  ];
  if (withdrawing && result.lasted !== null) {
    outcomeRows.push([x.lasted, percent(result.lasted)]);
    if (result.medianRunOutYear !== null) outcomeRows.push([x.runOut, whole(result.medianRunOutYear)]);
  }
  outcomeRows.push([x.sharesNote, format(island.results.caveat, { paths: String(result.paths) })]);
  const outcome: Sheet = { name: x.sheets.outcome, widths: [56, 18], rows: [head(common.columns.item, common.columns.value), ...outcomeRows] };

  return [about, inputs, assumptions, byYear, outcome];
}
