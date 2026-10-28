/**
 * A small spreadsheet writer: an .xlsx workbook built in the browser, with no
 * library.
 *
 * Why .xlsx and not CSV: a CSV has no numbers, only text with a separator and a
 * decimal mark, and Excel, LibreOffice and Google Sheets each guess those from
 * the reader's own settings, so one file cannot read right in all three for
 * every language. An .xlsx cell holds a number as a number; each app then shows
 * it in the reader's own style. Text is written as inline strings, which are
 * never evaluated as formulas, so a name that starts with "=" stays a name.
 *
 * The file is a zip of six small XML parts. The zip is "stored" (no
 * compression): the workbooks are small, and storing keeps this short enough
 * to read in one sitting. Nothing here touches the network, storage or
 * analytics.
 */

/** How a number cell is shown. Each app writes it in the reader's own style. */
export type NumFmt =
  | 'general'
  /** An amount with this many decimals (the currency's minor units). */
  | 'amount0'
  | 'amount2'
  | 'amount3'
  /** A plain number with two decimals: rates and percentages written as numbers. */
  | 'decimal2'
  /** A whole number without grouping: months, years, counts. */
  | 'integer';

export interface NumCell {
  n: number;
  fmt?: NumFmt;
}

export interface TextCell {
  t: string;
  bold?: boolean;
}

export type Cell = string | number | null | undefined | NumCell | TextCell;

export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Column widths in characters; columns without one keep the app's default. */
  widths?: number[];
}

// ---------------------------------------------------------------------------
// Cells and sheets
// ---------------------------------------------------------------------------

// Style indexes into cellXfs in STYLES below.
const STYLE: Record<NumFmt | 'bold', number> = {
  general: 0,
  bold: 1,
  amount2: 2,
  amount0: 3,
  amount3: 4,
  decimal2: 5,
  integer: 6,
};

/** The amount format for a currency with this many minor-unit digits. */
export function amountFormat(decimals: number): NumFmt {
  return decimals === 0 ? 'amount0' : decimals === 3 ? 'amount3' : 'amount2';
}

// Characters XML 1.0 does not allow, and unpaired surrogates: a name pasted
// from somewhere odd must not make the whole file unreadable.
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// The longest text a cell may hold in Excel.
const MAX_CELL_TEXT = 32_767;

export function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "A", "B", ... "Z", "AA", ... for a 0-based column. */
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function cellXml(cell: Cell, ref: string): string {
  if (cell === null || cell === undefined || cell === '') return '';
  if (typeof cell === 'number') cell = { n: cell };
  if (typeof cell === 'string') cell = { t: cell };
  if ('n' in cell) {
    // A number that is not finite has no cell value; leave the cell empty.
    if (!Number.isFinite(cell.n)) return '';
    const style = STYLE[cell.fmt ?? 'general'];
    return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${cell.n === 0 ? 0 : cell.n}</v></c>`;
  }
  const text = escapeXml(cell.t.slice(0, MAX_CELL_TEXT));
  return `<c r="${ref}" t="inlineStr"${cell.bold ? ` s="${STYLE.bold}"` : ''}><is><t xml:space="preserve">${text}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row.map((cell, c) => cellXml(cell, `${columnName(c)}${r + 1}`)).join('');
      return cells ? `<row r="${r + 1}">${cells}</row>` : '';
    })
    .join('');
  return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}">${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

/**
 * Sheet names as every app accepts them: at most 31 characters, none of
 * `[]:*?/\`, not starting or ending with an apostrophe, not empty, and unique
 * ignoring case.
 */
export function sheetNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw, i) => {
    let base = raw.replace(INVALID_XML, '').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
    base = base.replace(/^'+|'+$/g, '').trim() || `Sheet ${i + 1}`;
    let name = base.slice(0, 31).trim();
    for (let k = 2; used.has(name.toLowerCase()); k++) {
      const suffix = ` (${k})`;
      name = base.slice(0, 31 - suffix.length).trim() + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

// ---------------------------------------------------------------------------
// The workbook's fixed parts
// ---------------------------------------------------------------------------

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// Grouped amounts with the currency's decimals; the app picks the grouping and
// decimal mark from the reader's own settings.
const STYLES =
  `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">` +
  '<numFmts count="4">' +
  '<numFmt numFmtId="164" formatCode="#,##0.00"/>' +
  '<numFmt numFmtId="165" formatCode="#,##0"/>' +
  '<numFmt numFmtId="166" formatCode="#,##0.000"/>' +
  '<numFmt numFmtId="167" formatCode="0.00"/>' +
  '</numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="7">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** The workbook's parts, by path inside the zip, in the order they are written. */
export function workbookParts(sheets: Sheet[]): [string, string][] {
  if (sheets.length === 0) throw new Error('A workbook needs at least one sheet');
  const names = sheetNames(sheets.map((s) => s.name));
  const sheetPath = (i: number) => `xl/worksheets/sheet${i + 1}.xml`;
  const contentTypes =
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets
      .map((_, i) => `<Override PartName="/${sheetPath(i)}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('') +
    '</Types>';
  const rootRels =
    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
    `<Relationship Id="rId1" Type="${REL_TYPE}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>';
  const workbook =
    `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>` +
    names.map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets></workbook>';
  const workbookRels =
    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL_TYPE}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="${REL_TYPE}/styles" Target="styles.xml"/>` +
    '</Relationships>';
  return [
    ['[Content_Types].xml', contentTypes],
    ['_rels/.rels', rootRels],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', workbookRels],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i): [string, string] => [sheetPath(i), sheetXml(s)]),
  ];
}

// ---------------------------------------------------------------------------
// The zip container (stored, no compression)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Every entry is dated 1980-01-01 00:00, the zip format's earliest date: the
// file then carries no trace of when or where it was made beyond its contents.
const DOS_DATE = 0x0021;
const DOS_TIME = 0;

/** Files to a stored zip. */
export function zipStore(files: [string, Uint8Array][]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [path, data] of files) {
    const name = enc.encode(path);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed: 2.0
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, DOS_TIME, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true); // made by: 2.0
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, DOS_TIME, true);
    entry.setUint16(14, DOS_DATE, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    // Extra, comment, disk, internal and external attributes: all zero.
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0));
  let at = 0;
  for (const c of all) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Sheets to the bytes of an .xlsx file. */
export function buildXlsx(sheets: Sheet[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  return zipStore(workbookParts(sheets).map(([path, xml]) => [path, enc.encode(xml)]));
}

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
