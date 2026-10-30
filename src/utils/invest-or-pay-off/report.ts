/**
 * The invest or pay off calculator's printed report, built from its
 * spreadsheet's sheets: what was entered, both paths' range and the gap, the
 * range table when the page shows one, and the method. The result's sentences
 * come from the island, as the page says them.
 *
 * Pure: no DOM, no analytics.
 */
import { tableOf, type Report } from '../shared/report.ts';
import { investOrPayOffSheets, type InvestOrPayOffExport } from './export.ts';

export function investOrPayOffReport(e: Omit<InvestOrPayOffExport, 'date' | 'page'>): Report {
  const { island, currency, shown } = e;
  const x = island.export;
  const [, inputs, result, range] = investOrPayOffSheets({ ...e, date: '', page: '' });
  const r = shown.result;
  return {
    tool: island.formLabel,
    currency,
    answer: shown.lines,
    meaning: x.meaning,
    entered: tableOf(inputs),
    chart: {
      kind: 'bars',
      title: x.investAhead,
      bars: [
        { label: island.results.investPath, share: Math.round(r.bAhead * 100) },
        { label: island.results.payoffPath, share: 100 - Math.round(r.bAhead * 100) },
      ],
    },
    // The first four rows: the header, both paths and the gap.
    tables: [tableOf({ ...result, rows: result.rows.slice(0, 4) }), ...(range ? [tableOf(range)] : [])],
    assumptions: [x.method],
  };
}
