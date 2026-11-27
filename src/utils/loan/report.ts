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
import { hasLaterPayment, hasNotes, LATER_PAYMENT_COLUMNS, loanSheets, type LoanExport } from './export.ts';
import { resultNotes } from './notes.ts';
import { fromMinor, shownMonths } from './math.ts';

/** Dash patterns that tell offers apart without colour, A to E (as the page's chart). */
const DASHES = ['', '9 5', '2 4', '12 4 2 4', '5 5'];

export function loanReport(e: Omit<LoanExport, 'date' | 'page'> & { answer: string[] }): Report {
  const { island, currency, results, names, answer } = e;
  const x = island.export;
  // Stryker disable next-line StringLiteral: equivalent. The date and the page appear only on the about sheet, which the report leaves out.
  const [, sheet, inputs] = loanSheets({ ...e, date: '', page: '', worded: true });
  // The spreadsheet's notes column is a sentence wide. On paper each note is
  // a line under the comparison, after its offer's name, as the card has it
  // under the result.
  const noted = hasNotes(results);
  const summary = noted ? { ...sheet, rows: sheet.rows.map((row) => row.slice(0, -1)) } : sheet;
  const noteLines = results.flatMap((r, i) => resultNotes(r, island.engine.warnings).map((text) => `${names[i]}: ${text}`));
  const series = results.flatMap((r, i) => {
    if (r.error || r.schedule.length === 0) return [];
    const first = r.schedule[0];
    const points = [
      { x: 0, y: fromMinor(first.balance + first.principal, currency) },
      // A loan that is never paid off is drawn over the chart's own range, as on the page.
      ...r.schedule.slice(0, shownMonths(results, i)).map((row) => ({ x: row.month / 12, y: fromMinor(row.balance, currency) })),
    ];
    return [{ label: names[i], points: thin(points), dash: DASHES[i % DASHES.length] }];
  });

  // A page is too narrow for the four payment columns beside the rest. When a
  // payment changes with its rate, the comparison keeps the starting payment
  // and a second, short table carries the payments by period.
  // The basis of the APR is a line under the table, as on the page: in the
  // column heading it stacked six lines deep on narrow paper (#646).
  const note = [island.delta.aprNote, x.schedulesNote, ...noteLines];
  let tables = [tableOf(summary, { caption: island.delta.heading, note, stack: true })];
  if (hasLaterPayment(results)) {
    const cut = (from: number, to: number) => ({ ...summary, rows: summary.rows.map((row) => [row[0], ...row.slice(from, to)]) });
    const rest = { ...summary, rows: summary.rows.map((row) => [row[0], row[1], ...row.slice(1 + LATER_PAYMENT_COLUMNS)]) };
    tables = [
      tableOf(rest, { caption: island.delta.heading, note, stack: true }),
      // An offer that could not be worked out has no payment to list here; the
      // comparison above says so.
      // Stryker disable next-line StringLiteral: equivalent. A row's first payment cell is a number cell when the offer was worked out, and all its payment cells are null when it was not, so no row is kept or dropped by whichever text counts as empty.
      tableOf(cut(1, 1 + LATER_PAYMENT_COLUMNS), { caption: island.delta.monthlyPayment, stack: true, keep: (row) => !row.slice(1).every((c) => c === null || c === undefined || c === '') }),
    ];
  }

  return {
    tool: x.tool,
    currency,
    answer,
    meaning: x.meaning,
    // One column per offer: on narrow paper five of them are wider than the
    // page, so this table stacks there too (#651).
    entered: tableOf(inputs, { keep: (row) => !isEmptyRow(row), stack: true }),
    chart: series.length > 0 ? { kind: 'lines', title: `${island.charts.balanceHeading} (${currency})`, xLabel: island.balance.axisYears, series } : null,
    tables,
    assumptions: [island.disclaimer.body],
  };
}
