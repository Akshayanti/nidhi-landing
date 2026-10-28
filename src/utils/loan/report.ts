/**
 * The loan comparison's printed report, built from its spreadsheet's sheets:
 * what each offer was entered with (optional fields left empty are left out),
 * the comparison table, and each offer's balance over time. The month-by-month
 * schedules stay in the spreadsheet; the report says so.
 *
 * Like the page, it names no offer as the one to take: the answer is the
 * range of totals, worded as the page words it.
 *
 * Pure: no DOM, no analytics.
 */
import { isEmptyRow, tableOf, thin, type Report } from '../shared/report.ts';
import { loanSheets, type LoanExport } from './export.ts';
import { fromMinor } from './math.ts';

/** Dash patterns that tell offers apart without colour, A to E (as the page's chart). */
const DASHES = ['', '9 5', '2 4', '12 4 2 4', '5 5'];

export function loanReport(e: Omit<LoanExport, 'date' | 'page'> & { answer: string[] }): Report {
  const { island, currency, results, names, answer } = e;
  const x = island.export;
  const [, summary, inputs] = loanSheets({ ...e, date: '', page: '' });
  const series = results.flatMap((r, i) => {
    if (r.error || r.schedule.length === 0) return [];
    const first = r.schedule[0];
    const points = [
      { x: 0, y: fromMinor(first.balance + first.principal, currency) },
      ...r.schedule.map((row) => ({ x: row.month / 12, y: fromMinor(row.balance, currency) })),
    ];
    return [{ label: names[i], points: thin(points), dash: DASHES[i % DASHES.length] }];
  });

  return {
    tool: x.tool,
    currency,
    answer,
    meaning: x.meaning,
    entered: tableOf(inputs, { keep: (row) => !isEmptyRow(row) }),
    chart: series.length > 0 ? { kind: 'lines', title: `${island.charts.balanceHeading} (${currency})`, xLabel: island.balance.axisYears, series } : null,
    tables: [tableOf(summary, { caption: island.delta.heading, note: x.schedulesNote })],
    assumptions: [island.disclaimer.body],
  };
}
