/**
 * Saving a free tool's results: a spreadsheet, or the page printed.
 *
 * Both happen entirely in the browser. The spreadsheet is built by `xlsx.ts`
 * and handed to the browser's own download; printing is the browser's own
 * print dialog, where "Save as PDF" is one of the destinations. Nothing is
 * uploaded, and nothing here touches the address, storage or analytics.
 *
 * Two rules keep a click on these buttons from carrying what the file holds
 * (CLAUDE.md, "Free tools keep inputs out of URLs"):
 *   - the link that starts the download is never part of the document, so
 *     autocapture, which listens on the document, never sees its `href` or
 *     its `download` name;
 *   - the file name is fixed (tool and date), never derived from a value.
 *
 * Browser-safe and small on purpose: the islands import it.
 */
import { XLSX_TYPE, buildXlsx, type Sheet } from './xlsx.ts';

// A spreadsheet reads a cell that starts with one of these as a formula (or,
// for tab and carriage return, may shift it into one). OWASP's advice is to
// lead such a cell with an apostrophe, which spreadsheets show as text. Tab
// and carriage return count only as the very first character (they are
// whitespace themselves); the others count after any leading whitespace.
const FORMULA_START = /^[\t\r]|^\s*[=+\-@]/;

// Text that already starts with apostrophes before a formula character is
// guarded too, so reading the file back can tell "'=x" typed by the reader
// from "=x" guarded by us.
function needsGuard(text: string): boolean {
  return FORMULA_START.test(text) || (text.startsWith("'") && needsGuard(text.slice(1)));
}

/**
 * A CSV text cell made safe to open in a spreadsheet: one that would start a
 * formula gets a leading apostrophe. Only the net worth tool's rows file is
 * CSV; the .xlsx writer stores text as text and needs no guard.
 */
export function guardText(text: string): string {
  return needsGuard(text) ? `'${text}` : text;
}

/**
 * Undo `guardText` when a tool reads its own file back: the apostrophe goes
 * only when what follows is one it would have guarded, so a name the reader
 * typed with a leading apostrophe ("'Tis") stays as typed.
 */
export function unguardText(text: string): string {
  return text.startsWith("'") && needsGuard(text.slice(1)) ? text.slice(1) : text;
}

/** A date as YYYY-MM-DD, in the reader's own time zone. */
export function isoDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The file name: the tool and the date, never anything typed. */
export function exportFilename(tool: string, extension: 'xlsx' | 'csv', date: Date = new Date()): string {
  return `nidhi-${tool}-${isoDate(date)}.${extension}`;
}

// Long enough for a slow phone or an in-app browser to start reading the file;
// revoking at once can cancel the download there.
const REVOKE_AFTER_MS = 60_000;

/** Hand a file to the browser as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  // Never appended to the document: see the top of this file.
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

/** Sheets to a downloaded .xlsx file. */
export function downloadWorkbook(sheets: Sheet[], tool: string): void {
  downloadBlob(new Blob([buildXlsx(sheets)], { type: XLSX_TYPE }), exportFilename(tool, 'xlsx'));
}

/**
 * Open the print dialog. Called straight from the click, with nothing awaited
 * first: iOS ignores a print that comes after the tap's moment has passed.
 * What prints is the tool's report (ToolReport.tsx), always on the page and
 * shown only on paper, so there is nothing to get ready beforehand; the page's
 * fonts are its own and have loaded by the time a tool has results.
 */
export function printResults(): void {
  window.print();
}
