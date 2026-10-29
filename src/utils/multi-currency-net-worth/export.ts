/**
 * The net worth calculator's spreadsheet: what was entered, each currency's
 * net position and share, the total, and the rates used.
 *
 * It is built from what the page shows, never from more: a shared view that
 * hides amounts (the anonymous share) gives a file with currencies and shares
 * only, and nothing in it is worked back out from the shares. A shared view has
 * no rows and no rates of its own, so those sheets are left out there.
 *
 * The rates are the ones loaded on this page from Frankfurter. The page does
 * not keep the date the rates were published, so the file does not claim one.
 *
 * Pure: no DOM, no analytics. The island hands the sheets to `downloadWorkbook`.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import { format } from '../../i18n/format.ts';
import { getCurrency } from '../loan/math.ts';
import { amountFormat, type Cell, type Sheet } from '../shared/xlsx.ts';
import { getCurrencyLabel, isSingleCurrency, ownedAndOwed, parseAmount, type AggregationResult, type AssetRow } from './math.ts';

type Island = Dict['tools']['multiCurrencyNetWorth']['island'];
type Common = Dict['tools']['export'];

export interface NetWorthExport {
  island: Island;
  common: Common;
  functionalCurrency: string;
  result: AggregationResult;
  /** The rows typed on this page; null in a shared view. */
  rows: AssetRow[] | null;
  /** Rates loaded on this page (units of a currency per one of the spending currency); null in a shared view. */
  rates: Record<string, number> | null;
  /** False when the view hides amounts (an anonymous share). */
  showAmounts: boolean;
  /** Each position's risk label, as the page words it. */
  riskLabel: (level: string) => string;
  date: string;
  page: string;
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));

export function netWorthSheets(e: NetWorthExport): Sheet[] {
  const { island, common, functionalCurrency: fc, result, rows, rates, showAmounts, date, page } = e;
  const x = island.export;
  const decimalsOf = (code: string) => Math.round(Math.log10(getCurrency(code).factor));
  const money = (v: number, code: string): Cell => ({ n: Number(v.toFixed(decimalsOf(code))), fmt: amountFormat(decimalsOf(code)) });
  const share = (pct: number): Cell => ({ n: Math.round(pct * 100) / 100, fmt: 'decimal2' });
  const name = (code: string) => getCurrencyLabel(code, island.currencies);

  const about: Sheet = {
    name: common.sheets.about,
    widths: [22, 90],
    rows: [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, date],
      [common.about.currency, fc],
      [common.about.page, page],
      ...(showAmounts ? [] : [[x.hiddenLabel, x.hiddenText] as Cell[]]),
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ],
  };

  const sheets: Sheet[] = [about];

  if (rows) {
    const filled = rows.filter((r) => r.value.trim() !== '');
    sheets.push({
      name: common.sheets.inputs,
      widths: [30, 18, 12, 14],
      rows: [
        head(island.table.colName, island.table.colValue, island.table.colCurrency, island.table.colType),
        ...filled.map((r): Cell[] => {
          const v = parseAmount(r.value);
          return [r.name, Number.isFinite(v) ? money(v, r.currency) : r.value, r.currency, r.type === 'liability' ? island.row.liability : island.row.asset];
        }),
      ],
    });
  }

  // Everything in the spending currency needs no rates, as on the page.
  const single = isSingleCurrency(result, fc);
  const converted = single || result.hasRates !== 'none';
  const header = showAmounts
    ? [island.chart.tableColCurrency, x.code, x.netOwn, ...(converted ? [format(x.netSpending, { currency: fc })] : []), x.sharePct, island.chart.tableColRisk]
    : [island.chart.tableColCurrency, x.code, x.sharePct, island.chart.tableColRisk];
  const byCurrency: Cell[][] = result.positions.map((p): Cell[] => {
    const pctCell = p.rateUnavailable ? island.results.rateUnavailable : share(p.pctOfTotal);
    if (!showAmounts) return [name(p.code), p.code, pctCell, e.riskLabel(p.riskLevel)];
    return [
      name(p.code),
      p.code,
      money(p.netAmountOriginal, p.code),
      ...(converted ? [p.rateUnavailable ? island.results.rateUnavailable : money(single ? p.netAmountOriginal : p.netAmountFunctional, fc)] : []),
      pctCell,
      e.riskLabel(p.riskLevel),
    ];
  });
  const totals: Cell[][] = [];
  if (showAmounts && converted) {
    const total = single ? result.positions[0].netAmountOriginal : result.totalNetWorthFunctional;
    totals.push([], [{ t: island.results.totalLabel, bold: true }, fc, null, money(total, fc)]);
    if (rows && single) {
      const split = ownedAndOwed(rows, fc);
      totals.push([island.results.whatYouOwn, fc, null, money(split.owned, fc)], [island.results.whatYouOwe, fc, null, money(split.owed, fc)]);
    }
    if (result.hasRates === 'partial') totals.push([island.results.partialHint]);
  }
  sheets.push({ name: x.sheets.byCurrency, widths: [28, 8, 18, 22, 16, 30], rows: [head(...header), ...byCurrency, ...totals] });

  if (rates && !single && result.hasRates !== 'none') {
    const others = result.positions.filter((p) => p.code !== fc);
    sheets.push({
      name: x.sheets.rates,
      widths: [28, 8, 24],
      rows: [
        [x.ratesText],
        head(island.chart.tableColCurrency, x.code, format(x.ratePer, { currency: fc })),
        ...others.map((p): Cell[] => [name(p.code), p.code, rates[p.code] ? { n: rates[p.code], fmt: 'general' } : island.results.rateUnavailable]),
      ],
    });
  }

  return sheets;
}
