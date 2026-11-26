/**
 * Unit tests for src/utils/shared/exportFile.ts: the guard on CSV text and the
 * file name. The download and the print are in exportFile.dom.test.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { exportFilename, guardText, isoDate, unguardText } from './exportFile.ts';

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

  it('leaves a tab or a carriage return inside the text alone', () => {
    for (const text of ['a\tb', 'a\rb', 'ab\t', ' \tx']) {
      assert.equal(guardText(text), text, JSON.stringify(text));
      assert.equal(unguardText(`'${text}`), `'${text}`, JSON.stringify(text));
    }
  });

  it('round-trips text the reader typed with a leading apostrophe', () => {
    for (const text of ["'=x", "''+1", "'-"]) {
      assert.equal(guardText(text), `'${text}`, JSON.stringify(text));
      assert.equal(unguardText(guardText(text)), text, JSON.stringify(text));
    }
  });

  it('takes off one apostrophe only, and only before what it would have guarded', () => {
    assert.equal(unguardText("'=x"), '=x');
    assert.equal(unguardText("''=x"), "'=x");
    assert.equal(unguardText("'Tis"), "'Tis");
    assert.equal(unguardText("''"), "''");
    assert.equal(unguardText("='"), "='");
  });
});

describe('exportFilename', () => {
  it('names the file by tool and local date only', () => {
    const d = new Date(2026, 9, 28, 23, 59);
    assert.equal(isoDate(d), '2026-10-28');
    assert.equal(exportFilename('loan-comparison', 'xlsx', d), 'nidhi-loan-comparison-2026-10-28.xlsx');
    assert.equal(exportFilename('net-worth', 'csv', d), 'nidhi-net-worth-2026-10-28.csv');
  });

  it('writes a one-digit month and day with two digits', () => {
    assert.equal(isoDate(new Date(2027, 0, 5)), '2027-01-05');
    assert.equal(isoDate(new Date(2027, 11, 31)), '2027-12-31');
  });

  it('uses today\'s date when given none', () => {
    const before = isoDate(new Date());
    const name = exportFilename('inflation', 'xlsx');
    const after = isoDate(new Date());
    assert.ok([before, after].map((day) => `nidhi-inflation-${day}.xlsx`).includes(name), name);
    assert.ok([before, after].includes(isoDate()));
  });
});
