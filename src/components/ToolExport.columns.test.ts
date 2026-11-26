/**
 * Which of a printed table's columns are set flush right, as numbers. Pure,
 * so it needs no browser: ToolExport.report.dom.test.tsx checks the classes
 * the report draws from it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReportTable } from '../utils/shared/report.ts';
import { cellText, numericColumns } from './ToolExport.tsx';

describe('which columns hold numbers only', () => {
  it('is never the first, and any other whose filled cells are all numbers', () => {
    const table: ReportTable = {
      head: ['label', 'numbers', 'with null', 'with a gap', 'with blank', 'number cells', 'mixed', 'text cells', 'empty'],
      rows: [
        [1, 1, 1, 1, 1, { n: 1 }, 'x', { t: '1' }, null],
        [2, 2, null, undefined, '', { n: 2, fmt: 'amount2' }, 2, 3, ''],
      ],
    };
    assert.deepEqual(numericColumns(table), [false, true, true, true, true, true, false, false, false]);
  });

  it('is none in a table with no rows', () => {
    assert.deepEqual(numericColumns({ head: ['a', 'b'], rows: [] }), [false, false]);
  });
});

describe('cellText: a negative cell', () => {
  const MINUS = String.fromCodePoint(0x2212);
  it('is written with the true minus sign the answer above it uses, in every format and language (#883)', () => {
    assert.equal(cellText({ n: -1520, fmt: 'amount2' }, 'en'), `${MINUS}1,520.00`);
    assert.equal(cellText({ n: -1520, fmt: 'amount2' }, 'es'), `${MINUS}1.520,00`);
    assert.equal(cellText({ n: -1170, fmt: 'amount2' }, 'cs'), `${MINUS}1${String.fromCodePoint(0xa0)}170,00`);
    assert.equal(cellText({ n: -1520, fmt: 'amount2' }, 'hi'), `${MINUS}1,520.00`);
    assert.equal(cellText(-2.5, 'en'), `${MINUS}2.5`);
    assert.equal(cellText({ n: -3 }, 'en'), `${MINUS}3`);
    assert.equal(cellText({ n: -12, fmt: 'integer' }, 'en'), `${MINUS}12`);
    assert.ok(!cellText({ n: -1520, fmt: 'amount2' }, 'mr').includes('-'));
  });

  it('leaves a positive cell and a text cell as they are', () => {
    assert.equal(cellText({ n: 1520, fmt: 'amount2' }, 'en'), '1,520.00');
    assert.equal(cellText({ t: 'a-b' }, 'en'), 'a-b');
    assert.equal(cellText('x-y', 'en'), 'x-y');
  });
});
