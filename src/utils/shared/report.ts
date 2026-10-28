/**
 * The free tools' printable report: what a tool hands to `ToolReport` to print
 * when a reader makes a PDF (or prints the page any other way).
 *
 * A report is built from the same sheets as the spreadsheet, so the screen,
 * the spreadsheet and the PDF cannot disagree; it only leaves things out (the
 * loan's month-by-month schedules, most years of a long table). Each tool has
 * a `report.ts` beside its `export.ts` that turns its sheets into one.
 *
 * Pure: no DOM. Numbers stay numbers here; `ToolReport` writes them in the
 * reader's locale.
 */
import type { Cell, Sheet } from './xlsx.ts';

export interface ReportTable {
  caption?: string;
  head: string[];
  rows: Cell[][];
  /** A line under the table, e.g. that only every fifth year is shown. */
  note?: string;
}

export interface ReportPoint {
  x: number;
  y: number;
}

export interface ReportSeries {
  label: string;
  points: ReportPoint[];
  /** An SVG dash pattern; lines are told apart by dashes, never by colour alone. */
  dash?: string;
  strong?: boolean;
}

export interface ReportBand {
  label: string;
  lower: ReportPoint[];
  upper: ReportPoint[];
  /** How dark the band is, 0 to 1. */
  shade: number;
}

export type ReportChart =
  | { kind: 'lines'; title: string; xLabel: string; series: ReportSeries[]; bands?: ReportBand[] }
  | { kind: 'bars'; title: string; bars: { label: string; share: number }[] };

export interface Report {
  /** The tool's name, the report's title. */
  tool: string;
  currency: string;
  /** The answer as the page words it, one paragraph each. */
  answer: string[];
  /** What the answer means, in plain words that interpret without advising. */
  meaning: string;
  /** What the reader entered; null in a shared view that carries none. */
  entered: ReportTable | null;
  tables: ReportTable[];
  chart: ReportChart | null;
  assumptions: string[];
  /** A table of assumptions, when a tool has numbers to show there. */
  assumptionTable?: ReportTable;
}

/** A cell's text, for a header. */
export const cellLabel = (c: Cell): string => (c && typeof c === 'object' && 't' in c ? c.t : typeof c === 'string' ? c : '');

/**
 * A sheet whose first row is its header, as a table. `keep` drops rows (a
 * spacer, a row the report shows elsewhere).
 */
export function tableOf(sheet: Sheet, opts: { caption?: string; note?: string; keep?: (row: Cell[], index: number) => boolean } = {}): ReportTable {
  const [header, ...rows] = sheet.rows;
  const keep = opts.keep ?? (() => true);
  return {
    caption: opts.caption,
    head: header.map(cellLabel),
    rows: rows.filter((row, i) => row.length > 0 && keep(row, i)),
    note: opts.note,
  };
}

/** True when a row has a label and nothing else worth printing (empty, or zero). */
export function isEmptyRow(row: Cell[]): boolean {
  return row.slice(1).every((c) => c === null || c === '' || (typeof c === 'object' && c !== null && 'n' in c && c.n === 0));
}

/**
 * A by-year table short enough for a page: every row when there are `whole`
 * or fewer (31 is a year 0 and thirty more), otherwise every fifth and the
 * last, with `note` saying so.
 */
export function byYearTable(head: Cell[], rows: Cell[][], caption: string | undefined, note: string, whole = 31): ReportTable {
  const sampled = rows.length > whole;
  return {
    caption,
    head: head.map(cellLabel),
    rows: sampled ? rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1) : rows,
    note: sampled ? note : undefined,
  };
}

/** At most `max` points of a long line, always keeping its first and last. */
export function thin<T>(points: T[], max = 120): T[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}
