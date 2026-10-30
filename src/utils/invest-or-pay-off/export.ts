/**
 * The invest or pay off calculator's spreadsheet: what was entered, the
 * result in words and as numbers, and the historical range beside the
 * reader's own return when the page shows it.
 *
 * It is built from the inputs and the result the page is showing, so the
 * file and the screen cannot disagree.
 *
 * Pure: no DOM, no analytics. The island hands the sheets to `downloadWorkbook`.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import { amountFormat, type Cell, type Sheet } from '../shared/xlsx.ts';
import type { Inputs, Result } from './math.ts';

type Island = Dict['tools']['investOrPayOff']['island'];
type Common = Dict['tools']['export'];

/** What the page is showing. */
export interface ShownComparison {
  inputs: Inputs;
  result: Result;
  /** The cautious and optimistic runs, shown when the reader's own return is above the range. */
  range: { cautious: Result; optimistic: Result } | null;
  /** Where the inflation figure came from, in the page's words, or null when it was typed. */
  inflationSource: string | null;
  /** The result's sentences, as on the page. */
  lines: string[];
}

export interface InvestOrPayOffExport {
  island: Island;
  common: Common;
  currency: string;
  shown: ShownComparison;
  /** The selected currency's decimals (its minor units). */
  decimals: number;
  date: string;
  page: string;
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));

export function investOrPayOffSheets({ island, common, currency, shown, decimals, date, page }: InvestOrPayOffExport): Sheet[] {
  const x = island.export;
  const f = island.fields;
  const money = (v: number): Cell => ({ n: Number(v.toFixed(decimals)), fmt: amountFormat(decimals) });
  const rate = (v: number): Cell => ({ n: v, fmt: 'decimal2' });
  const whole = (v: number): Cell => ({ n: v, fmt: 'integer' });
  const { inputs: i, result: r } = shown;

  const about: Sheet = {
    name: common.sheets.about,
    widths: [22, 90],
    rows: [
      head(common.columns.item, common.columns.value),
      [common.about.tool, island.formLabel],
      [common.about.made, date],
      [common.about.currency, currency],
      [common.about.page, page],
      [x.moneyLabel, x.moneyText],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ],
  };

  const inputRows: Cell[][] = [
    [f.balance, money(i.balance)],
    [f.debtRate, rate(i.debtRate)],
    [f.payment, money(i.payment)],
    [f.relief, rate(i.relief)],
    [f.extra, money(i.extra)],
    [x.inflation, rate(i.inflation)],
    [x.inflationSource, shown.inflationSource ?? x.inflationTyped],
    [x.returns, island.returns[i.returns].label],
  ];
  if (i.returns === 'own') inputRows.push([f.ownReturn, rate(i.ownReturn)]);
  inputRows.push([f.fee, rate(i.feePct)], [f.gainsTax, rate(i.gainsTax)], [x.horizon, island.horizons[i.horizon]]);
  const inputs: Sheet = { name: common.sheets.inputs, widths: [40, 60], rows: [head(common.columns.item, common.columns.value), ...inputRows] };

  const c = x.columns;
  const result: Sheet = {
    name: x.sheets.result,
    widths: [36, 18, 18, 18],
    rows: [
      head(c.path, c.p10, c.p50, c.p90),
      [island.results.payoffPath, money(r.a.p10), money(r.a.p50), money(r.a.p90)],
      [island.results.investPath, money(r.b.p10), money(r.b.p50), money(r.b.p90)],
      [x.gapRow, money(r.diff.p10), money(r.diff.p50), money(r.diff.p90)],
      [],
      [x.investAhead, whole(Math.round(r.bAhead * 100))],
      [x.months, whole(r.months)],
      [x.paths, whole(r.paths)],
      ...shown.lines.map((line): Cell[] => [line]),
      [x.method],
    ],
  };

  const sheets = [about, inputs, result];
  if (shown.range) {
    const s = island.results.side;
    sheets.push({
      name: x.sheets.range,
      widths: [36, 22, 18],
      rows: [
        head(s.figure, s.invest, s.gap),
        [island.returns.own.label, whole(Math.round(r.bAhead * 100)), money(r.diff.p50)],
        [island.returns.cautious.label, whole(Math.round(shown.range.cautious.bAhead * 100)), money(shown.range.cautious.diff.p50)],
        [island.returns.optimistic.label, whole(Math.round(shown.range.optimistic.bAhead * 100)), money(shown.range.optimistic.diff.p50)],
      ],
    });
  }
  return sheets;
}
