/**
 * Unit tests for src/utils/shared/xlsx.ts and src/utils/shared/exportFile.ts.
 *
 * The workbook is also opened in LibreOffice and an independent reader before
 * a change to the exports merges (CLAUDE.md, free tools); these tests hold the
 * structure in place between those checks.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';

import { buildXlsx, columnName, crc32, escapeXml, sheetNames, workbookParts, zipStore } from './xlsx.ts';
import { exportFilename, guardText, isoDate, unguardText } from './exportFile.ts';

/** Read a stored zip back: path to text. Fails on anything but what zipStore writes. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  const dec = new TextDecoder();
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const method = view.getUint16(at + 8, true);
    const crc = view.getUint32(at + 14, true);
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = dec.decode(bytes.subarray(at + 30, at + 30 + nameLength));
    const data = bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size);
    assert.equal(method, 0, `${name} is stored`);
    assert.equal(crc32(data), crc, `${name} CRC`);
    files.set(name, dec.decode(method === 0 ? data : inflateRawSync(data)));
    at += 30 + nameLength + size;
  }
  assert.equal(view.getUint32(at, true), 0x02014b50, 'central directory follows the files');
  return files;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  });
});

describe('columnName', () => {
  it('counts A to Z, then AA', () => {
    assert.deepEqual([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
});

describe('escapeXml', () => {
  it('escapes markup and drops characters XML cannot hold', () => {
    assert.equal(escapeXml('a<b>&"c"\u0001\u0008￾'), 'a&lt;b&gt;&amp;&quot;c&quot;');
    assert.equal(escapeXml('tab\tline\nok'), 'tab\tline\nok');
    assert.equal(escapeXml('lone \uD800 surrogate, pair 😀'), 'lone  surrogate, pair 😀');
  });
});

describe('sheetNames', () => {
  it('keeps names every app accepts, unique ignoring case', () => {
    assert.deepEqual(
      sheetNames(['Schedule: Offer [A]/x', 'schedule  offer a x', "'quoted'", '', 'A very long sheet name that runs past thirty-one']),
      ['Schedule Offer A x', 'schedule offer a x (2)', 'quoted', 'Sheet 4', 'A very long sheet name that run'],
    );
  });
});

describe('buildXlsx', () => {
  const bytes = buildXlsx([
    { name: 'About', rows: [[{ t: 'Field', bold: true }, { t: 'Value', bold: true }], ['Name', '=HYPERLINK("http://x")'], ['Hindi', 'ऋण तुलना ₹ Kč']], widths: [20, 40] },
    { name: 'By year', rows: [['Year', 'Balance'], [{ n: 1, fmt: 'integer' }, { n: 123456.78, fmt: 'amount2' }], [2, { n: NaN }], [3, { n: -0 }]] },
  ]);
  const files = unzip(bytes);

  it('writes the six parts an .xlsx needs, in order', () => {
    assert.deepEqual([...files.keys()], [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
  });

  it('stores text as inline strings, never as a formula', () => {
    const sheet = files.get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /<c r="B2" t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;http:\/\/x&quot;\)<\/t><\/is><\/c>/);
    assert.ok(!sheet.includes('<f>'));
    assert.ok(sheet.includes('ऋण तुलना ₹ Kč'));
  });

  it('stores numbers as numbers, with their format', () => {
    const sheet = files.get('xl/worksheets/sheet2.xml')!;
    assert.ok(sheet.includes('<c r="A2" s="6"><v>1</v></c><c r="B2" s="2"><v>123456.78</v></c>'));
    // Not a number: no cell. Negative zero: written as 0.
    assert.ok(sheet.includes('<row r="3"><c r="A3"><v>2</v></c></row>'));
    assert.ok(sheet.includes('<c r="B4"><v>0</v></c>'));
  });

  it('names every sheet in the workbook and its relationships', () => {
    assert.ok(files.get('xl/workbook.xml')!.includes('<sheet name="By year" sheetId="2" r:id="rId2"/>'));
    assert.ok(files.get('xl/_rels/workbook.xml.rels')!.includes('Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'));
    assert.ok(files.get('[Content_Types].xml')!.includes('PartName="/xl/worksheets/sheet2.xml"'));
  });

  it('carries no date or place of making', () => {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    assert.equal(view.getUint16(10, true), 0);
    assert.equal(view.getUint16(12, true), 0x0021);
  });

  it('refuses an empty workbook', () => {
    assert.throws(() => workbookParts([]));
  });

  it('zips byte-for-byte what it is given', () => {
    const data = new Uint8Array([0, 1, 2, 255]);
    const back = zipStore([['x.bin', data]]);
    assert.deepEqual([...back.subarray(35, 39)], [0, 1, 2, 255]);
  });
});

describe('guardText and unguardText', () => {
  it('guards a cell that would start a formula, even after spaces', () => {
    for (const text of ['=SUM(A1)', '+1', '-1', '@x', '  =x', '\tx', '\rx']) {
      assert.equal(guardText(text), `'${text}`, JSON.stringify(text));
      assert.equal(unguardText(guardText(text)), text, JSON.stringify(text));
    }
  });

  it('leaves ordinary text alone', () => {
    for (const text of ['Savings', "'Tis", 'a=b', ' x', '']) {
      assert.equal(guardText(text), text);
      assert.equal(unguardText(text), text);
    }
  });

  it('round-trips text the reader typed with a leading apostrophe', () => {
    for (const text of ["'=x", "''+1", "'-"]) {
      assert.equal(unguardText(guardText(text)), text, JSON.stringify(text));
    }
  });
});

describe('exportFilename', () => {
  it('names the file by tool and local date only', () => {
    const d = new Date(2026, 9, 28, 23, 59);
    assert.equal(isoDate(d), '2026-10-28');
    assert.equal(exportFilename('loan-comparison', 'xlsx', d), 'nidhi-loan-comparison-2026-10-28.xlsx');
  });
});
