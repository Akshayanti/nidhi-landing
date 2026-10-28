/**
 * The net worth calculator's printed report, built from its spreadsheet's
 * sheets: the rows entered, each currency's position and share, the rates
 * used, and the shares as bars.
 *
 * It holds what the page shows and no more: a shared view that hides amounts
 * prints currencies and shares only, because its sheets carry nothing else.
 *
 * Pure: no DOM, no analytics.
 */
import { cellLabel, tableOf, type Report, type ReportTable } from '../shared/report.ts';
import { netWorthSheets, type NetWorthExport } from './export.ts';
import { getCurrencyLabel, isSingleCurrency } from './math.ts';

export function netWorthReport(e: Omit<NetWorthExport, 'date' | 'page'> & { answer: string[] }): Report {
  const { island, functionalCurrency, result, rows, answer } = e;
  const x = island.export;
  const sheets = netWorthSheets({ ...e, date: '', page: '' });
  const find = (name: string) => sheets.find((s) => s.name === name);
  const inputs = rows ? find(e.common.sheets.inputs) : undefined;
  const byCurrency = find(x.sheets.byCurrency)!;
  const ratesSheet = find(x.sheets.rates);
  // The rates sheet opens with a line of text, then its header.
  const rates: ReportTable | null = ratesSheet
    ? { caption: x.sheets.rates, head: ratesSheet.rows[1].map(cellLabel), rows: ratesSheet.rows.slice(2) }
    : null;
  const bars = result.positions
    .filter((p) => !p.rateUnavailable)
    .map((p) => ({ label: getCurrencyLabel(p.code, island.currencies), share: p.pctOfTotal }));

  // Nothing entered yet: the answer says so, and there is nothing to tabulate.
  if (result.positions.length === 0) {
    return { tool: x.tool, currency: functionalCurrency, answer, meaning: x.meaning, entered: null, chart: null, tables: [], assumptions: [] };
  }

  return {
    tool: x.tool,
    currency: functionalCurrency,
    answer,
    meaning: x.meaning,
    entered: inputs ? tableOf(inputs) : null,
    chart: !isSingleCurrency(result, functionalCurrency) && bars.length > 0 ? { kind: 'bars', title: island.chart.heading, bars } : null,
    tables: [tableOf(byCurrency, { caption: x.sheets.byCurrency }), ...(rates ? [rates] : [])],
    assumptions: [...(rates ? [x.ratesText] : []), island.results.disclaimer],
  };
}
