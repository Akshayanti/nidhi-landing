/**
 * The net worth calculator as its page mounts it, at its row limit (#790):
 * a CSV of exactly five hundred rows is taken, and no row more can be added.
 *
 * In a file of its own, as it is the slowest of the page's tests (five
 * hundred rows to draw): a mutation run starts the files covering a mutant
 * in path order and stops at the first that fails, so this file runs after
 * NetWorthParts.page.share.dom.test.tsx, only for the mutants none of the
 * quicker tests stops. Analytics get the count, never a row's name or amount.
 */
import { fill, events, island, mount, one, all, addButton, ariaDisabled, upload } from '../../test/netWorthParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';

const tb = island.table;
const csvLines = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `Item ${from + i},${10 + i},EUR,Asset`).join('\n');

describe('the net worth calculator on its page: the row limit', () => {
  it('five hundred rows: a CSV of exactly that many is taken, and no row more can be added', async () => {
    mount();
    await upload(csvLines(500));
    const add = addButton();
    assert.equal(ariaDisabled(add), true);
    const limit = one('.mcnw-tableFooter > p.mcnw-limit');
    assert.equal(add.getAttribute('aria-describedby'), limit.id);
    assert.equal(limit.textContent, fill(tb.addLimit, { max: 500 }));
    fireEvent.click(add);
    assert.equal(all('.mcnw-tableBody .mcnw-tableRow').length, 500);
    assert.deepEqual(events, [['free_multi_currency_net_worth_csv_uploaded', { count: 500 }]]);
  });
});
