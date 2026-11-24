/**
 * The net worth calculator's printed report (#790): the answer it leads
 * with, worded as the page words its total, for nothing entered, one
 * currency, several, a missing rate and a view without amounts; the band of
 * each currency in its table, in the page's language; and the number style
 * its tables are written in.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 */
import { RATES, draw, island, own, owe, t, text, withoutAmounts, worked, type Style } from '../../test/netWorthParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AggregationResult, AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { PrintedReport } from './MultiCurrencyNetWorth.tsx';

const r = island.results;

function report(result: AggregationResult, rows: AssetRow[] | null, { showAmounts = true, currency = 'EUR', rates = RATES as Record<string, number> | null } = {}, style: Style = {}) {
  return draw(
    <PrintedReport strings={island} exportStrings={t.export} functionalCurrency={currency} result={result} rows={rows} rates={rates} showAmounts={showAmounts} />,
    style,
  );
}
/** The report's answer: the paragraphs under its first heading. */
const answer = () => text('.tool-report > section:first-of-type > p');
/** Every table cell in the report. */
const cells = () => text('.tool-report td');

describe('the answer the report leads with', () => {
  it('nothing entered: what to add', () => {
    report(worked([]), []);
    assert.deepEqual(answer(), [r.empty]);
  });

  it('everything in the spending currency: the total, with its cents', () => {
    // 1,500 euros held, 200.50 owed.
    const rows = [own('1500'), owe('200.50')];
    report(worked(rows), rows);
    assert.deepEqual(answer(), ['Total net worth: €1,299.50']);
  });

  it('a debt in Swiss francs keeps a true minus in the report, as on the page', () => {
    const rows = [own('1000', 'CHF'), owe('2500', 'CHF')];
    report(worked(rows, 'CHF', null), rows, { currency: 'CHF', rates: null });
    assert.deepEqual(answer(), ['Total net worth: CHF\u22121,500.00']);
  });

  it('in yen, whole yen', () => {
    const rows = [own('5000', 'JPY'), owe('1200', 'JPY')];
    report(worked(rows, 'JPY', null), rows, { currency: 'JPY', rates: null });
    assert.deepEqual(answer(), ['Total net worth: ￥3,800']);
  });

  it('several currencies: the converted total', () => {
    // 1,000 euros and 2,000 dollars (1,000 euros).
    const rows = [own('1000'), own('2000', 'USD')];
    report(worked(rows), rows);
    assert.deepEqual(answer(), ['Total net worth: €2,000.00']);
  });

  it('converted into yen, whole yen', () => {
    // 5,000 yen and 100 euros (20,000 yen).
    const rows = [own('5000', 'JPY'), own('100')];
    const rates = { JPY: 1, EUR: 1 / 200 };
    report(worked(rows, 'JPY', rates), rows, { currency: 'JPY', rates });
    assert.deepEqual(answer(), ['Total net worth: ￥25,000']);
  });

  it('a currency missing its rate: the subtotal, named as one, and why', () => {
    // 1,000 euros, 2,000 dollars (1,000 euros) and 700 koruna, which has no rate here.
    const rows = [own('1000'), own('2000', 'USD'), own('700', 'CZK')];
    const rates = { EUR: 1, USD: 2 };
    report(worked(rows, 'EUR', rates), rows, { rates });
    assert.deepEqual(answer(), ['Total excluding currencies with missing rates: €2,000.00', r.partialHint]);
  });

  it('no rate for anything held elsewhere: says the rate is unavailable, and no total', () => {
    const rows = [own('1000'), own('700', 'CZK')];
    report(worked(rows, 'EUR', { EUR: 1 }), rows, { rates: { EUR: 1 } });
    assert.deepEqual(answer(), [r.rateUnavailable]);
  });

  it('no rates at all: the same', () => {
    const rows = [own('1000'), own('2000', 'USD')];
    report(worked(rows, 'EUR', null), rows, { rates: null });
    assert.deepEqual(answer(), [r.rateUnavailable]);
  });

  it('a view without amounts: the total is hidden, in one currency or several', () => {
    const one = [own('1500')];
    let drawn = report(worked(one), null, { showAmounts: false });
    assert.deepEqual(answer(), ['Total net worth: Hidden']);
    drawn.unmount();
    drawn = report(withoutAmounts(worked([own('1000'), own('2000', 'USD')])), null, { showAmounts: false, rates: null });
    assert.deepEqual(answer(), ['Total net worth: Hidden']);
    assert.ok(!cells().some((c) => c.includes('1,000')), cells().join(' | '));
  });

  it('a link that carried no rates and no amounts, shown as if it had amounts, states no total', () => {
    report(withoutAmounts(worked([own('1000'), own('2000', 'USD')])), null, { rates: null });
    assert.deepEqual(answer(), []);
  });
});

describe('the tables', () => {
  // 2,000 euros and 400,000 yen (2,000 euros): half each.
  const rows = [own('2000'), own('400000', 'JPY')];

  it('name each currency’s band in the page’s language', () => {
    report(worked(rows), rows);
    assert.ok(cells().some((c) => c.endsWith(r.labelElevated)), cells().join(' | '));
    assert.ok(cells().some((c) => c.endsWith(r.labelFunctional)), cells().join(' | '));
  });

  it('are written as English writes numbers, unless the page has a style of its own', () => {
    let drawn = report(worked(rows), rows);
    assert.ok(cells().includes('400,000'), cells().join(' | '));
    drawn.unmount();
    drawn = report(worked(rows), rows, {}, { amountLocale: 'es' });
    assert.ok(cells().includes('400.000'), cells().join(' | '));
    assert.ok(!cells().includes('400,000'));
  });
});
