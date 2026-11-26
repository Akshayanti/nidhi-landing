/**
 * Unit tests for src/utils/shared/report.ts: the helpers every tool's printed
 * report is built with. What each tool puts in its report is checked in
 * toolExports.test.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { byYearTable, cellLabel, isEmptyRow, tableOf, thin } from './report.ts';
import type { Cell, Sheet } from './xlsx.ts';

describe('cellLabel', () => {
  it('reads the text of a header cell, styled or plain', () => {
    assert.equal(cellLabel({ t: 'Year', bold: true }), 'Year');
    assert.equal(cellLabel('Value'), 'Value');
  });

  it('gives an empty heading for a cell that holds no text', () => {
    for (const cell of [null, undefined, '', 7, { n: 7 }] as Cell[]) assert.equal(cellLabel(cell), '');
  });
});

describe('tableOf', () => {
  const sheet: Sheet = { name: 's', rows: [[{ t: 'Field', bold: true }, 'Value'], ['a', 1], [], ['b', 2], ['c', 3]] };

  it('takes the first row as the headings and the rest as the rows, without the empty ones', () => {
    assert.deepEqual(tableOf(sheet), { caption: undefined, head: ['Field', 'Value'], rows: [['a', 1], ['b', 2], ['c', 3]], note: undefined });
  });

  it('carries the caption and the note it is given', () => {
    const table = tableOf(sheet, { caption: 'What you entered', note: ['one', 'two'] });
    assert.equal(table.caption, 'What you entered');
    assert.deepEqual(table.note, ['one', 'two']);
  });

  it('drops the rows it is told to, by content or by place', () => {
    assert.deepEqual(tableOf(sheet, { keep: (row) => row[0] !== 'c' }).rows, [['a', 1], ['b', 2]]);
    // The place is the row's place under the headings, empty rows counted.
    assert.deepEqual(tableOf(sheet, { keep: (_, i) => i !== 0 && i !== 2 }).rows, [['c', 3]]);
  });

  it('is marked for stacking on narrow paper only when asked', () => {
    assert.equal(tableOf(sheet, { stack: true }).stack, true);
    assert.ok(!('stack' in tableOf(sheet, { stack: false })));
    assert.ok(!('stack' in tableOf(sheet)));
  });
});

describe('isEmptyRow', () => {
  it('is true for a label with nothing after it, or with only blanks and zeros', () => {
    assert.equal(isEmptyRow(['Fee']), true);
    assert.equal(isEmptyRow(['Fee', null]), true);
    assert.equal(isEmptyRow(['Fee', '']), true);
    assert.equal(isEmptyRow(['Fee', { n: 0 }]), true);
    assert.equal(isEmptyRow(['Fee', { n: 0, fmt: 'amount2' }, null, '']), true);
  });

  it('is false as soon as one cell after the label has something to print', () => {
    assert.equal(isEmptyRow(['Fee', { n: 5 }]), false);
    assert.equal(isEmptyRow(['Fee', { n: -0.01, fmt: 'amount2' }]), false);
    assert.equal(isEmptyRow(['Fee', 'waived']), false);
    assert.equal(isEmptyRow(['Fee', { t: 'waived' }]), false);
    assert.equal(isEmptyRow(['Fee', { t: '' }]), false);
    assert.equal(isEmptyRow(['Fee', 12]), false);
    assert.equal(isEmptyRow(['Fee', null, '', { n: 0 }, { n: 1 }]), false);
    assert.equal(isEmptyRow(['Fee', { n: 1 }, null]), false);
  });

  it('does not look at the label', () => {
    assert.equal(isEmptyRow([{ n: 5 }, null]), true);
    assert.equal(isEmptyRow(['', { n: 5 }]), false);
  });

  it('keeps a row whose cell is missing rather than blank', () => {
    assert.equal(isEmptyRow(['Fee', undefined]), false);
  });
});

describe('byYearTable', () => {
  const head: Cell[] = [{ t: 'Year', bold: true }, 'Balance'];
  const rows = (n: number): Cell[][] => Array.from({ length: n }, (_, i) => [i, i * 2]);

  it('prints a year 0 and thirty more whole, with no note', () => {
    const all = rows(31);
    assert.deepEqual(byYearTable(head, all, 'By year', 'Every fifth year'), { caption: 'By year', head: ['Year', 'Balance'], rows: all, note: undefined });
  });

  it('prints every fifth year and the last of a longer table, and says so', () => {
    const table = byYearTable(head, rows(32), undefined, 'Every fifth year');
    assert.deepEqual(table.rows.map((r) => r[0]), [0, 5, 10, 15, 20, 25, 30, 31]);
    assert.equal(table.note, 'Every fifth year');
    assert.equal(table.caption, undefined);
  });

  it('does not print the last year twice when it is a fifth year', () => {
    assert.deepEqual(byYearTable(head, rows(36), undefined, 'n').rows.map((r) => r[0]), [0, 5, 10, 15, 20, 25, 30, 35]);
  });

  it('takes another length as whole when a tool asks', () => {
    assert.equal(byYearTable(head, rows(8), undefined, 'n', 8).note, undefined);
    assert.deepEqual(byYearTable(head, rows(9), undefined, 'n', 8).rows.map((r) => r[0]), [0, 5, 8]);
  });
});

describe('thin', () => {
  const line = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('hands back a line that is short enough as it is', () => {
    const short = line(4);
    assert.equal(thin(short, 4), short);
    const atDefault = line(120);
    assert.equal(thin(atDefault), atDefault);
  });

  it('keeps evenly spaced points of a longer line, and always its first and last', () => {
    assert.deepEqual(thin(line(11), 4), [0, 3, 6, 9, 10]);
    assert.deepEqual(thin(line(5), 4), [0, 2, 4]);
    assert.deepEqual(thin(line(10), 3), [0, 4, 8, 9]);
  });

  it('thins a line of more than 120 points unless told otherwise', () => {
    const thinned = thin(line(121));
    assert.equal(thinned.length, 61);
    assert.deepEqual([thinned[0], thinned[1], thinned[60]], [0, 2, 120]);
    assert.deepEqual(thin(line(361)).slice(-2), [356, 360]);
  });
});
