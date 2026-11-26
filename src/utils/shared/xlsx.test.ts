/**
 * Unit tests for src/utils/shared/xlsx.ts.
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

import { amountFormat, buildXlsx, columnName, crc32, escapeXml, sheetNames, typedRate, workbookParts, XLSX_TYPE, zipStore, type Sheet } from './xlsx.ts';

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

// ---------------------------------------------------------------------------
// The parts as a spreadsheet app reads them
// ---------------------------------------------------------------------------

interface El {
  name: string;
  attrs: Record<string, string>;
  children: El[];
  text: string;
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * A strict reader for the XML the writer produces: the declaration, then one
 * root, every tag closed in order, and text only inside the elements named
 * in `textIn`. Fails on anything else, as an app does on a damaged part.
 */
function parseXml(xml: string, textIn: string[] = []): El {
  assert.ok(xml.startsWith(XML_DECLARATION), 'the part starts with the XML declaration');
  const root: El = { name: '', attrs: {}, children: [], text: '' };
  const stack = [root];
  const tag = /<(\/?)([\w:]+)((?:\s+[\w:]+="[^"<]*")*)\s*(\/?)>/gy;
  let at = XML_DECLARATION.length;
  while (at < xml.length) {
    const top = stack[stack.length - 1];
    if (xml[at] !== '<') {
      const end = xml.indexOf('<', at);
      assert.ok(end > at, 'text is followed by a tag');
      assert.ok(textIn.includes(top.name), `no stray text in <${top.name}>: ${JSON.stringify(xml.slice(at, at + 30))}`);
      top.text += xml.slice(at, end);
      at = end;
      continue;
    }
    tag.lastIndex = at;
    const m = tag.exec(xml);
    assert.ok(m, `a whole tag at ${at}: ${JSON.stringify(xml.slice(at, at + 40))}`);
    at = tag.lastIndex;
    const [, closing, name, attrText, selfClosing] = m;
    if (closing) {
      assert.equal(name, top.name, 'tags close in the order they opened');
      stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of attrText.matchAll(/([\w:]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const el: El = { name, attrs, children: [], text: '' };
    top.children.push(el);
    if (!selfClosing) stack.push(el);
  }
  assert.equal(stack.length, 1, 'every tag is closed');
  assert.equal(root.children.length, 1, 'one root element');
  return root.children[0];
}

const child = (el: El, name: string): El => {
  const found = el.children.filter((c) => c.name === name);
  assert.equal(found.length, 1, `one <${name}> in <${el.name}>`);
  return found[0];
};
const partsOf = (sheets: Sheet[]) => new Map(workbookParts(sheets));
const sheetOf = (sheet: Sheet) => parseXml(partsOf([sheet]).get('xl/worksheets/sheet1.xml')!, ['t', 'v']);
/** The cells of a sheet, by reference: its text or number as written, and its style. */
function cellsOf(sheet: Sheet): Record<string, { value: string; style: string | undefined; type: string | undefined }> {
  const out: Record<string, { value: string; style: string | undefined; type: string | undefined }> = {};
  for (const row of child(sheetOf(sheet), 'sheetData').children) {
    for (const c of row.children) {
      const value = c.attrs.t === 'inlineStr' ? child(child(c, 'is'), 't').text : child(c, 'v').text;
      out[c.attrs.r] = { value, style: c.attrs.s, type: c.attrs.t };
    }
  }
  return out;
}

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_PACKAGE_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_DOC_RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

describe('typedRate and amountFormat', () => {
  it('shows a typed rate with two decimals, and with every decimal when it has more', () => {
    assert.deepEqual(typedRate(5), { n: 5, fmt: 'decimal2' });
    assert.deepEqual(typedRate(4.88), { n: 4.88, fmt: 'decimal2' });
    assert.deepEqual(typedRate(4.875), { n: 4.875, fmt: 'general' });
    assert.deepEqual(typedRate(-4.875), { n: -4.875, fmt: 'general' });
  });

  it('does not take the rounding error of a two-decimal rate for more decimals', () => {
    // 0.1 + 0.2 is 0.30000000000000004: two decimals as typed.
    assert.equal(typedRate(0.1 + 0.2).fmt, 'decimal2');
    // The allowance itself (a hundredth of 1e-9 off) is still two decimals; just past it is not.
    assert.equal(typedRate(1.0000000000000001e-11).fmt, 'decimal2');
    assert.equal(typedRate(1.1e-11).fmt, 'general');
  });

  it('picks the amount format by the currency\'s minor units', () => {
    assert.equal(amountFormat(0), 'amount0');
    assert.equal(amountFormat(2), 'amount2');
    assert.equal(amountFormat(3), 'amount3');
  });
});

describe('sheetNames, case by case', () => {
  it('drops characters XML cannot hold', () => {
    assert.deepEqual(sheetNames(['Plan\u0001 A']), ['Plan A']);
  });

  it('strips apostrophes from both ends only, however many, and spaces around them', () => {
    assert.deepEqual(sheetNames(["it's"]), ["it's"]);
    assert.deepEqual(sheetNames(["''two''"]), ['two']);
    assert.deepEqual(sheetNames([" 'spaced' "]), ['spaced']);
    assert.deepEqual(sheetNames(["' inner '"]), ['inner']);
  });

  it('numbers a sheet whose name is nothing but apostrophes and spaces', () => {
    assert.deepEqual(sheetNames(['Loans', "' '", "''"]), ['Loans', 'Sheet 2', 'Sheet 3']);
  });

  it('never ends a shortened name with a space', () => {
    const name = `${'a'.repeat(30)} b`;
    assert.deepEqual(sheetNames([name]), ['a'.repeat(30)]);
  });

  it('counts repeats upwards: (2), (3)', () => {
    assert.deepEqual(sheetNames(['Plan', 'plan', 'PLAN']), ['Plan', 'plan (2)', 'PLAN (3)']);
  });

  it('keeps a numbered repeat of a long name within 31 characters, with no space before the cut', () => {
    const long = 'b'.repeat(40);
    const [first, second] = sheetNames([long, long]);
    assert.equal(first, 'b'.repeat(31));
    assert.equal(second, `${'b'.repeat(27)} (2)`);
    assert.equal(second.length, 31);
    // The 27th character is a space: it is dropped, not left before the number.
    const spaced = `${'c'.repeat(26)} ${'d'.repeat(10)}`;
    assert.deepEqual(sheetNames([spaced, spaced])[1], `${'c'.repeat(26)} (2)`);
  });
});

describe('a sheet\'s cells', () => {
  it('writes nothing for an empty cell, and no row for an empty row', () => {
    const sheet: Sheet = { name: 'S', rows: [[null, undefined, '', 'kept'], [null, '', undefined], [], [7]] };
    assert.deepEqual(cellsOf(sheet), {
      D1: { value: 'kept', style: undefined, type: 'inlineStr' },
      A4: { value: '7', style: undefined, type: undefined },
    });
    assert.deepEqual(child(sheetOf(sheet), 'sheetData').children.map((r) => r.attrs.r), ['1', '4']);
  });

  it('marks a bold cell, and only that one', () => {
    const cells = cellsOf({ name: 'S', rows: [[{ t: 'Field', bold: true }, { t: 'plain' }]] });
    assert.equal(cells.A1.style, '1');
    assert.equal(cells.B1.style, undefined);
  });

  it('gives each number format its own style, and none to a plain number', () => {
    const cells = cellsOf({
      name: 'S',
      rows: [[{ n: 1 }, { n: 1, fmt: 'general' }, { n: 1, fmt: 'amount2' }, { n: 1, fmt: 'amount0' }, { n: 1, fmt: 'amount3' }, { n: 1, fmt: 'decimal2' }, { n: 1, fmt: 'integer' }]],
    });
    assert.deepEqual(Object.values(cells).map((c) => c.style), [undefined, undefined, '2', '3', '4', '5', '6']);
  });

  it('writes zero and negative zero as 0, and leaves out what is not a number', () => {
    const cells = cellsOf({ name: 'S', rows: [[0, -0, { n: -0, fmt: 'amount2' }, Infinity, -Infinity, NaN, -1.5]] });
    assert.deepEqual(Object.entries(cells).map(([ref, c]) => [ref, c.value]), [['A1', '0'], ['B1', '0'], ['C1', '0'], ['G1', '-1.5']]);
  });

  it('cuts text at the longest a cell may hold', () => {
    const cells = cellsOf({ name: 'S', rows: [['x'.repeat(40_000), 'y'.repeat(32_767)]] });
    assert.equal(cells.A1.value.length, 32_767);
    assert.equal(cells.B1.value.length, 32_767);
  });

  it('keeps the spaces of a text cell', () => {
    const t = child(child(child(child(sheetOf({ name: 'S', rows: [['  two  spaces ']] }), 'sheetData'), 'row'), 'c'), 'is').children[0];
    assert.equal(t.text, '  two  spaces ');
    assert.equal(t.attrs['xml:space'], 'preserve');
  });

  it('sets the widths it is given, column by column, and none otherwise', () => {
    const wide = sheetOf({ name: 'S', rows: [['a']], widths: [20, 40.5] });
    assert.equal(wide.attrs.xmlns, NS_MAIN);
    assert.deepEqual(wide.children.map((c) => c.name), ['cols', 'sheetData']);
    assert.deepEqual(child(wide, 'cols').children.map((c) => [c.name, c.attrs]), [
      ['col', { min: '1', max: '1', width: '20', customWidth: '1' }],
      ['col', { min: '2', max: '2', width: '40.5', customWidth: '1' }],
    ]);
    assert.deepEqual(sheetOf({ name: 'S', rows: [['a']] }).children.map((c) => c.name), ['sheetData']);
    assert.deepEqual(sheetOf({ name: 'S', rows: [['a']], widths: [] }).children.map((c) => c.name), ['sheetData']);
  });
});

describe('the workbook\'s fixed parts', () => {
  const sheets: Sheet[] = [
    { name: 'About <this>', rows: [['a']] },
    { name: 'By year', rows: [[1]] },
    { name: 'Schedule', rows: [[2]] },
  ];
  const parts = partsOf(sheets);

  it('declares the type of every part', () => {
    const types = parseXml(parts.get('[Content_Types].xml')!);
    assert.equal(types.name, 'Types');
    assert.equal(types.attrs.xmlns, 'http://schemas.openxmlformats.org/package/2006/content-types');
    assert.deepEqual(types.children.map((c) => [c.name, c.attrs]), [
      ['Default', { Extension: 'rels', ContentType: 'application/vnd.openxmlformats-package.relationships+xml' }],
      ['Default', { Extension: 'xml', ContentType: 'application/xml' }],
      ['Override', { PartName: '/xl/workbook.xml', ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml' }],
      ['Override', { PartName: '/xl/styles.xml', ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml' }],
      ...[1, 2, 3].map((n) => ['Override', { PartName: `/xl/worksheets/sheet${n}.xml`, ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml' }]),
    ]);
  });

  it('points from the package to the workbook', () => {
    const rels = parseXml(parts.get('_rels/.rels')!);
    assert.equal(rels.name, 'Relationships');
    assert.equal(rels.attrs.xmlns, NS_PACKAGE_RELS);
    assert.deepEqual(rels.children.map((c) => [c.name, c.attrs]), [
      ['Relationship', { Id: 'rId1', Type: `${NS_DOC_RELS}/officeDocument`, Target: 'xl/workbook.xml' }],
    ]);
  });

  it('lists every sheet by name, each tied to its own file, and the styles after them', () => {
    const workbook = parseXml(parts.get('xl/workbook.xml')!);
    assert.equal(workbook.name, 'workbook');
    assert.equal(workbook.attrs.xmlns, NS_MAIN);
    assert.equal(workbook.attrs['xmlns:r'], NS_DOC_RELS);
    assert.deepEqual(child(workbook, 'sheets').children.map((c) => [c.name, c.attrs]), [
      ['sheet', { name: 'About &lt;this&gt;', sheetId: '1', 'r:id': 'rId1' }],
      ['sheet', { name: 'By year', sheetId: '2', 'r:id': 'rId2' }],
      ['sheet', { name: 'Schedule', sheetId: '3', 'r:id': 'rId3' }],
    ]);
    const rels = parseXml(parts.get('xl/_rels/workbook.xml.rels')!);
    assert.equal(rels.name, 'Relationships');
    assert.equal(rels.attrs.xmlns, NS_PACKAGE_RELS);
    assert.deepEqual(rels.children.map((c) => [c.name, c.attrs]), [
      ['Relationship', { Id: 'rId1', Type: `${NS_DOC_RELS}/worksheet`, Target: 'worksheets/sheet1.xml' }],
      ['Relationship', { Id: 'rId2', Type: `${NS_DOC_RELS}/worksheet`, Target: 'worksheets/sheet2.xml' }],
      ['Relationship', { Id: 'rId3', Type: `${NS_DOC_RELS}/worksheet`, Target: 'worksheets/sheet3.xml' }],
      ['Relationship', { Id: 'rId4', Type: `${NS_DOC_RELS}/styles`, Target: 'styles.xml' }],
    ]);
  });

  it('says why an empty workbook is refused', () => {
    assert.throws(() => workbookParts([]), /at least one sheet/);
  });

  it('is typed as a spreadsheet when downloaded', () => {
    assert.equal(XLSX_TYPE, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});

describe('the stylesheet', () => {
  const styles = parseXml(partsOf([{ name: 'S', rows: [['a']] }]).get('xl/styles.xml')!);
  const list = (name: string) => {
    const el = child(styles, name);
    assert.equal(Number(el.attrs.count), el.children.length, `${name} counts its entries`);
    return el.children;
  };

  it('has every section an app expects, in the order the format sets', () => {
    assert.equal(styles.name, 'styleSheet');
    assert.equal(styles.attrs.xmlns, NS_MAIN);
    assert.deepEqual(styles.children.map((c) => c.name), ['numFmts', 'fonts', 'fills', 'borders', 'cellStyleXfs', 'cellXfs', 'cellStyles']);
  });

  it('has a plain and a bold font of one size, the two fills every workbook starts with, and one empty border', () => {
    const fonts = list('fonts');
    assert.deepEqual(fonts.map((f) => f.children.map((c) => [c.name, c.attrs.val])), [
      [['sz', '11'], ['name', 'Calibri']],
      [['b', undefined], ['sz', '11'], ['name', 'Calibri']],
    ]);
    assert.deepEqual(list('fills').map((f) => child(f, 'patternFill').attrs.patternType), ['none', 'gray125']);
    assert.deepEqual(list('borders').map((b) => b.children.map((c) => c.name)), [['left', 'right', 'top', 'bottom', 'diagonal']]);
    assert.deepEqual(list('cellStyleXfs').map((x) => x.attrs), [{ numFmtId: '0', fontId: '0', fillId: '0', borderId: '0' }]);
    assert.deepEqual(list('cellStyles').map((x) => x.attrs), [{ name: 'Normal', xfId: '0', builtinId: '0' }]);
  });

  it('shows each cell style the way its name says', () => {
    const formats = new Map(list('numFmts').map((f) => [f.attrs.numFmtId, f.attrs.formatCode]));
    // 1 is the format every app has built in for a whole number.
    formats.set('0', 'General').set('1', '0');
    const shown = list('cellXfs').map((x) => {
      assert.deepEqual([x.attrs.fillId, x.attrs.borderId, x.attrs.xfId], ['0', '0', '0']);
      assert.equal(x.attrs.applyNumberFormat, x.attrs.numFmtId === '0' ? undefined : '1');
      assert.equal(x.attrs.applyFont, x.attrs.fontId === '0' ? undefined : '1');
      return [formats.get(x.attrs.numFmtId), x.attrs.fontId === '1' ? 'bold' : 'plain'];
    });
    assert.deepEqual(shown, [
      ['General', 'plain'], // a plain cell
      ['General', 'bold'], // bold
      ['#,##0.00', 'plain'], // amount2
      ['#,##0', 'plain'], // amount0
      ['#,##0.000', 'plain'], // amount3
      ['0.00', 'plain'], // decimal2
      ['0', 'plain'], // integer
    ]);
    assert.equal(formats.size, 6, 'no format is declared and left unused, none is declared twice');
  });
});

describe('the zip container', () => {
  const enc = new TextEncoder();
  const first = enc.encode('hello');
  const second = new Uint8Array([0, 1, 2, 255, 254, 253, 7]);
  const files: [string, Uint8Array][] = [['a.txt', first], ['dir/ऋण.bin', second]];
  const zip = zipStore(files);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const names = files.map(([path]) => enc.encode(path));
  const localAt = [0, 30 + names[0].length + first.length];
  const centralAt = localAt[1] + 30 + names[1].length + second.length;
  const centralSize = 46 + names[0].length + 46 + names[1].length;

  it('writes each file under a header that says what follows', () => {
    files.forEach(([, data], i) => {
      const at = localAt[i];
      assert.equal(view.getUint32(at, true), 0x04034b50, 'local file signature');
      assert.equal(view.getUint16(at + 4, true), 20, 'version needed');
      assert.equal(view.getUint16(at + 6, true), 0x0800, 'names are UTF-8');
      assert.equal(view.getUint16(at + 8, true), 0, 'stored, not compressed');
      assert.equal(view.getUint16(at + 10, true), 0, 'time');
      assert.equal(view.getUint16(at + 12, true), 0x0021, 'date: 1 January 1980');
      assert.equal(view.getUint32(at + 14, true), crc32(data), 'checksum');
      assert.equal(view.getUint32(at + 18, true), data.length, 'size as stored');
      assert.equal(view.getUint32(at + 22, true), data.length, 'size');
      assert.equal(view.getUint16(at + 26, true), names[i].length, 'name length in bytes');
      assert.equal(view.getUint16(at + 28, true), 0, 'no extra field');
      assert.deepEqual([...zip.subarray(at + 30, at + 30 + names[i].length)], [...names[i]]);
      assert.deepEqual([...zip.subarray(at + 30 + names[i].length, at + 30 + names[i].length + data.length)], [...data]);
    });
  });

  it('lists every file in the directory, with where it starts', () => {
    let at = centralAt;
    files.forEach(([, data], i) => {
      assert.equal(view.getUint32(at, true), 0x02014b50, 'directory entry signature');
      assert.equal(view.getUint16(at + 4, true), 20, 'made by');
      assert.equal(view.getUint16(at + 6, true), 20, 'version needed');
      assert.equal(view.getUint16(at + 8, true), 0x0800, 'names are UTF-8');
      assert.equal(view.getUint16(at + 10, true), 0, 'stored');
      assert.equal(view.getUint16(at + 12, true), 0, 'time');
      assert.equal(view.getUint16(at + 14, true), 0x0021, 'date');
      assert.equal(view.getUint32(at + 16, true), crc32(data), 'checksum');
      assert.equal(view.getUint32(at + 20, true), data.length, 'size as stored');
      assert.equal(view.getUint32(at + 24, true), data.length, 'size');
      assert.equal(view.getUint16(at + 28, true), names[i].length, 'name length');
      assert.deepEqual([...zip.subarray(at + 30, at + 42)], new Array(12).fill(0), 'no extra, comment, disk or attributes');
      assert.equal(view.getUint32(at + 42, true), localAt[i], 'where the file starts');
      assert.deepEqual([...zip.subarray(at + 46, at + 46 + names[i].length)], [...names[i]]);
      at += 46 + names[i].length;
    });
    assert.equal(at, centralAt + centralSize);
  });

  it('ends with a record that finds the directory', () => {
    const at = centralAt + centralSize;
    assert.equal(zip.length, at + 22, 'nothing after the end record');
    assert.equal(view.getUint32(at, true), 0x06054b50, 'end signature');
    assert.equal(view.getUint32(at + 4, true), 0, 'one disk');
    assert.equal(view.getUint16(at + 8, true), 2, 'entries on this disk');
    assert.equal(view.getUint16(at + 10, true), 2, 'entries in all');
    assert.equal(view.getUint32(at + 12, true), centralSize, 'directory size');
    assert.equal(view.getUint32(at + 16, true), centralAt, 'directory start');
    assert.equal(view.getUint16(at + 20, true), 0, 'no comment');
  });
});
