/**
 * What the net worth calculator says to a screen reader (#790): the total,
 * once typing has settled, in the spending currency and in its own minor
 * units; a subtotal named as one; nothing when there is no total to say
 * (nothing entered, amounts hidden, no rates, or no rate for anything held
 * elsewhere); and the reason the results are withheld, said a little later.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 */
import { framed, island, own, owe, withoutAmounts, worked } from '../../test/netWorthParts.results.tsx';
import { clock } from '../../test/windowClock.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { render } from '@testing-library/react';
import type { AggregationResult } from '../utils/multi-currency-net-worth/math.ts';
import { TotalAnnouncement } from './MultiCurrencyNetWorth.tsx';

type Said = { result: AggregationResult; currency?: string; hidden?: boolean; withheld?: string | null };

const part = ({ result, currency = 'EUR', hidden = false, withheld = null }: Said) => framed(
  <TotalAnnouncement withheld={withheld} result={result} functionalCurrency={currency} hidden={hidden} strings={island} />,
);
const live = () => document.querySelector('[aria-live="polite"]')?.textContent ?? 'no live region';

/** What is said once `then` replaces `first` on the page and `ms` pass. */
function heard(first: Said, then: Said, ms = 600) {
  const { rerender } = render(part(first));
  rerender(part(then));
  clock.pass(ms);
  return live();
}

const nothing = worked([]);
const somethingElse = worked([own('1')]);

beforeEach(() => clock.install());
afterEach(() => clock.restore());

describe('the total, said', () => {
  it('everything in the spending currency: the total, with its cents', () => {
    // 1,500 euros held, 200.50 owed.
    assert.equal(heard({ result: nothing }, { result: worked([own('1500'), owe('200.50')]) }), 'Total net worth: €1,299.50.');
  });

  it('everything in the spending currency needs no rates', () => {
    assert.equal(heard({ result: nothing }, { result: worked([own('1500')], 'EUR', null) }), 'Total net worth: €1,500.00.');
  });

  it('in a currency with no smaller unit, in whole yen', () => {
    assert.equal(heard({ result: nothing, currency: 'JPY' }, { result: worked([own('5000', 'JPY')], 'JPY', { JPY: 1 }), currency: 'JPY' }), 'Total net worth: ￥5,000.');
  });

  it('in several currencies: the converted total', () => {
    // 1,000 euros and 2,000 dollars (1,000 euros).
    assert.equal(heard({ result: nothing }, { result: worked([own('1000'), own('2000', 'USD')]) }), 'Total net worth: €2,000.00.');
  });

  it('converted into yen, in whole yen', () => {
    // 5,000 yen and 100 euros (20,000 yen at 200 to the euro).
    const result = worked([own('5000', 'JPY'), own('100')], 'JPY', { JPY: 1, EUR: 1 / 200 });
    assert.equal(heard({ result: nothing, currency: 'JPY' }, { result, currency: 'JPY' }), 'Total net worth: ￥25,000.');
  });

  it('with a currency missing its rate: named as the total without it', () => {
    // 1,000 euros, 2,000 dollars (1,000 euros) and 700 koruna, which has no rate here.
    const result = worked([own('1000'), own('2000', 'USD'), own('700', 'CZK')], 'EUR', { EUR: 1, USD: 2 });
    assert.equal(heard({ result: nothing }, { result }), 'Total excluding currencies with missing rates: €2,000.00.');
  });

  it('waits until typing has settled', () => {
    const { rerender } = render(part({ result: nothing }));
    rerender(part({ result: worked([own('1500')]) }));
    clock.pass(599);
    assert.equal(live(), '');
    clock.pass(1);
    assert.equal(live(), 'Total net worth: €1,500.00.');
  });
});

describe('nothing to say', () => {
  it('once everything is cleared away', () => {
    assert.equal(heard({ result: somethingElse }, { result: nothing }), '');
  });

  it('while the amounts are hidden', () => {
    assert.equal(heard({ result: somethingElse }, { result: worked([own('1500')]), hidden: true }), '');
    assert.equal(heard({ result: somethingElse }, { result: worked([own('1000'), own('2000', 'USD')]), hidden: true }), '');
  });

  it('without rates, in several currencies', () => {
    assert.equal(heard({ result: somethingElse }, { result: worked([own('1000'), own('2000', 'USD')], 'EUR', null) }), '');
  });

  it('from a link that carried no amounts, in several currencies', () => {
    const result = withoutAmounts(worked([own('1000'), own('2000', 'USD')]));
    assert.equal(heard({ result: somethingElse }, { result }), '');
  });

  it('with no rate for anything held outside the spending currency', () => {
    // Koruna has no rate: 700 koruna cannot be added to 1,000 euros.
    const result = worked([own('1000'), own('700', 'CZK')], 'EUR', { EUR: 1 });
    assert.equal(result.hasRates, 'partial');
    assert.equal(heard({ result: somethingElse }, { result }), '');
  });
});

describe('results withheld', () => {
  it('the reason is said instead of a total, a second later', () => {
    const reason = 'Results are hidden: 1 row has an amount that could not be read.';
    const { rerender } = render(part({ result: nothing }));
    rerender(part({ result: worked([own('1500')]), withheld: reason }));
    clock.pass(999);
    assert.equal(live(), '');
    clock.pass(1);
    assert.equal(live(), reason);
  });
});
