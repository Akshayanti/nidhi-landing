/**
 * The inflation calculator's printed report, built from its spreadsheet's
 * sheets: what was entered, the path the chart draws (every fifth year when it
 * is long), and the method. The answer's sentences come from the island, as
 * the page shows them.
 *
 * Pure: no DOM, no analytics.
 */
import { byYearTable, tableOf, type Report } from '../shared/report.ts';
import { inflationSheets, type InflationExport } from './export.ts';

export function inflationReport(e: Omit<InflationExport, 'date' | 'page'> & { lines: string[]; method: string }): Report {
  const { island, common, state, answer, lines, method } = e;
  const [, inputs, , byYear] = inflationSheets({ ...e, date: '', page: '' });
  return {
    tool: island.formLabel,
    currency: state.currency,
    answer: lines,
    meaning: island.export.meaning,
    entered: tableOf(inputs),
    chart: answer.points.length > 1
      ? { kind: 'lines', title: answer.chartTitle, xLabel: answer.axis, series: [{ label: answer.chartTitle, points: answer.points.map((p) => ({ x: p.x, y: p.value })), strong: true }] }
      : null,
    // The sheet's first row is the chart's title, the second its header.
    tables: [byYearTable(byYear.rows[1], byYear.rows.slice(2), answer.chartTitle, common.report.sampled)],
    assumptions: [method],
  };
}
