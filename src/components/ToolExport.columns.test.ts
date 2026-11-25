/**
 * Which of a printed table's columns are set flush right, as numbers. Pure,
 * so it needs no browser: ToolExport.report.dom.test.tsx checks the classes
 * the report draws from it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReportTable } from '../utils/shared/report.ts';
import { numericColumns } from './ToolExport.tsx';

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
