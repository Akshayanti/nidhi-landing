/**
 * The net worth calculator's results (#790): the total in the spending
 * currency, what is owned and owed when everything is in that currency, and
 * for several currencies the card each one gets, with its share of net worth,
 * its converted amount, its band and its sentence. A missing rate, a view
 * without amounts or shares, nothing left after debts and results withheld
 * each change what is shown, and what cannot be worked out is never shown as
 * a number.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 * Every expected figure is worked out here from those.
 */
import { MINUS, draw, island, own, owe, withoutAmounts, worked } from '../../test/netWorthParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import type { AggregationResult, AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { ResultsPanel } from './MultiCurrencyNetWorth.tsx';

type Shown = Partial<{
  withheld: string | null; currency: string; pendingRates: boolean; hidePct: boolean; hideAmounts: boolean;
  rows: AssetRow[]; actions: React.ReactNode; onExample: () => void;
}>;

const r = island.results;
const name = island.currencies as Record<string, string>;
const REASON = 'Results are hidden: 1 row has an amount that could not be read.';
const ACTIONS = <p className="test-actions">Save or share</p>;

function panel(result: AggregationResult, shown: Shown = {}) {
  return draw(
    <ResultsPanel
      withheld={shown.withheld}
      result={result}
      functionalCurrency={shown.currency ?? 'EUR'}
      pendingRates={shown.pendingRates ?? false}
      strings={island}
      hidePct={shown.hidePct}
      hideAmounts={shown.hideAmounts}
      rows={shown.rows}
      actions={shown.actions}
      onExample={shown.onExample}
    />,
  );
}

/** The total as shown: its label and its value. */
const total = () => {
  const box = document.querySelector('.mcnw-total');
  if (!box) return null;
  return {
    label: box.querySelector('.mcnw-totalLabel')?.textContent,
    value: box.querySelector('.mcnw-totalValue')?.textContent,
    partialLabel: box.querySelector('.mcnw-totalLabel')?.classList.contains('mcnw-totalLabel--partial'),
    hint: box.querySelector('.mcnw-totalHint')?.textContent ?? null,
  };
};

/** Each currency's card, top to bottom. */
const cards = () => [...document.querySelectorAll('.mcnw-riskCard')].map((card) => {
  const badge = card.querySelector<HTMLElement>('.mcnw-riskBadge');
  return {
    band: [...card.classList].find((c) => c.startsWith('mcnw-riskCard--'))?.slice('mcnw-riskCard--'.length),
    head: card.querySelector('.mcnw-riskCurrency')?.textContent,
    badge: badge ? [badge.textContent, badge.style.background] : null,
    label: card.querySelector('.mcnw-riskLabel')?.textContent ?? null,
    sentences: card.querySelectorAll('.mcnw-riskRec').length,
  };
});
const heads = () => cards().map((c) => c.head);
const chart = () => document.querySelectorAll('.mcnw-chartSection').length;

describe('with nothing entered', () => {
  it('says what to add and what will be shown, and offers an example', () => {
    let asked = 0;
    panel(worked([]), { onExample: () => { asked++; }, actions: ACTIONS });
    assert.equal(document.querySelector('.mcnw-emptyLead')?.textContent, r.empty);
    assert.ok(document.body.textContent?.includes(r.emptyShows));
    fireEvent.click(screen.getByRole('button', { name: island.example.show }));
    assert.equal(asked, 1);
    // Nothing to save yet.
    assert.equal(document.querySelectorAll('.test-actions').length, 0);
  });

  it('offers no example once one is not wanted', () => {
    panel(worked([]));
    assert.equal(screen.queryAllByRole('button').length, 0);
  });

  it('with results withheld, gives the reason and keeps the actions', () => {
    panel(worked([]), { withheld: REASON, actions: ACTIONS });
    assert.deepEqual([...document.querySelectorAll('.tool-resultReason')].map((p) => p.textContent), [REASON]);
    assert.equal(document.querySelectorAll('.test-actions').length, 1);
    assert.equal(document.querySelectorAll('.mcnw-emptyState').length, 0);
  });
});

describe('everything in the spending currency', () => {
  // 1,000 euros held, 2,500 owed: net worth minus 1,500.
  const rows = [own('1000'), owe('2500')];
  const result = worked(rows);

  it('the total, with a true minus, and what is owned and owed, at one size', () => {
    panel(result, { rows, actions: ACTIONS });
    assert.deepEqual(total(), { label: r.totalLabel, value: `${MINUS}€1,500.00`, partialLabel: false, hint: null });
    const split = [...document.querySelectorAll('.mcnw-split > div')].map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent]);
    assert.deepEqual(split, [[r.whatYouOwn, '€1,000.00'], [r.whatYouOwe, `${MINUS}€2,500.00`]]);
    // Both drawn at the size of the longer, "−€2,500.00", which is the size of
    // the total, "−€1,500.00", drawn on its own.
    const size = (a: HTMLElement) => a.style.getPropertyValue('--amt-len');
    const sizes = [...document.querySelectorAll<HTMLElement>('.mcnw-split .amt')].map(size);
    assert.deepEqual(sizes, [size(document.querySelector<HTMLElement>('.mcnw-totalValue .amt')!), sizes[0]]);
    assert.ok(Number(sizes[0]) > 0);
    assert.equal(document.querySelector('.mcnw-singleNote')?.textContent, r.singleNote.replace('{currency}', name.EUR));
    assert.equal(document.querySelectorAll('.test-actions').length, 1);
    // No exchange rate is involved: no chart and no cards.
    assert.equal(chart(), 0);
    assert.equal(cards().length, 0);
  });

  it('nothing owed is a plain zero, not a minus zero', () => {
    const held = [own('1000'), own('500')];
    panel(worked(held), { rows: held });
    assert.deepEqual([...document.querySelectorAll('.mcnw-split dd')].map((d) => d.textContent), ['€1,500.00', '€0.00']);
  });

  it('Swiss francs, whose sign follows the code, still get a true minus', () => {
    // With no amount style of the page, francs are written "CHF-1,500.00":
    // the sign comes after the code, not first.
    const francs = [own('1000', 'CHF'), owe('2500', 'CHF')];
    panel(worked(francs, 'CHF', null), { rows: francs, currency: 'CHF' });
    assert.equal(total()?.value, `CHF${MINUS}1,500.00`);
    assert.deepEqual([...document.querySelectorAll('.mcnw-split dd')].map((d) => d.textContent), ['CHF\u00a01,000.00', `CHF${MINUS}2,500.00`]);
    assert.ok(!document.body.textContent?.includes('-'), 'no hyphen in place of a minus');
  });

  it('needs no rates, and counts yen whole', () => {
    const yen = [own('5000', 'JPY'), owe('1200', 'JPY')];
    panel(worked(yen, 'JPY', null), { rows: yen, currency: 'JPY' });
    assert.equal(total()?.value, '￥3,800');
    assert.deepEqual([...document.querySelectorAll('.mcnw-split dd')].map((d) => d.textContent), ['￥5,000', `${MINUS}￥1,200`]);
    assert.equal(document.querySelector('.mcnw-singleNote')?.textContent, r.singleNote.replace('{currency}', name.JPY));
  });

  it('a shared view has no rows to split', () => {
    panel(result);
    assert.equal(total()?.value, `${MINUS}€1,500.00`);
    assert.equal(document.querySelectorAll('.mcnw-split').length, 0);
  });

  it('a view without amounts reads Hidden, and shows no split', () => {
    panel(result, { rows, hideAmounts: true });
    assert.deepEqual(total(), { label: r.totalLabel, value: r.hidden, partialLabel: false, hint: null });
    assert.ok(document.querySelector('.mcnw-total')?.classList.contains('mcnw-total--hidden'));
    assert.equal(document.querySelectorAll('.mcnw-split').length, 0);
    assert.ok(!document.body.textContent?.includes('1,500'));
  });

  it('withheld: the reason in place of the results, which cannot be reached', () => {
    panel(result, { rows, withheld: REASON, actions: ACTIONS });
    assert.deepEqual([...document.querySelectorAll('.tool-resultReason')].map((p) => p.textContent), [REASON]);
    assert.ok(document.querySelector('.mcnw-total')?.closest('[inert]'));
    assert.ok(document.querySelector('.test-actions')?.closest('[inert]') === null);
  });
});

describe('several currencies, all with rates', () => {
  // 1,000 euros, 2,000 dollars (1,000 euros), 400,000 yen (2,000 euros): 4,000 euros,
  // a quarter, a quarter and a half.
  const result = worked([own('1000'), own('2000', 'USD'), own('400000', 'JPY')]);

  it('the converted total, a chart, and a card for each currency, the spending one first', () => {
    panel(result, { actions: ACTIONS });
    assert.deepEqual(total(), { label: r.totalLabel, value: '€4,000.00', partialLabel: false, hint: null });
    assert.equal(chart(), 1);
    assert.equal(document.querySelector('.mcnw-riskCardsTitle')?.textContent, r.riskHeading);
    assert.deepEqual(cards(), [
      { band: 'functional', head: `${name.EUR} · 25.0% of net worth · €1,000.00`, badge: ['Spending currency', 'var(--risk-functional)'], label: 'Your spending currency', sentences: 1 },
      { band: 'elevated', head: `${name.JPY} · 50.0% of net worth · €2,000.00`, badge: ['Elevated', 'var(--risk-elevated)'], label: 'Elevated exposure', sentences: 1 },
      { band: 'moderate', head: `${name.USD} · 25.0% of net worth · €1,000.00`, badge: ['Moderate', 'var(--risk-moderate)'], label: 'Moderate exposure', sentences: 1 },
    ]);
    assert.equal(document.querySelectorAll('.test-actions').length, 1);
  });

  it('without shares: Hidden in place of each share, amounts kept', () => {
    panel(result, { hidePct: true });
    assert.deepEqual(heads(), [`${name.EUR} · Hidden · €1,000.00`, `${name.JPY} · Hidden · €2,000.00`, `${name.USD} · Hidden · €1,000.00`]);
  });

  it('without amounts: the total reads Hidden and the cards give shares only', () => {
    panel(withoutAmounts(result), { hideAmounts: true });
    assert.deepEqual(total(), { label: r.totalLabel, value: r.hidden, partialLabel: false, hint: null });
    assert.deepEqual(heads(), [`${name.EUR} · 25.0% of net worth`, `${name.JPY} · 50.0% of net worth`, `${name.USD} · 25.0% of net worth`]);
    assert.equal(chart(), 1);
    assert.deepEqual(cards().map((c) => c.band), ['functional', 'elevated', 'moderate']);
  });

  it('a page whose own currency holds nothing writes the total in that currency', () => {
    // 2,000 dollars (1,000 euros) and 400,000 yen (2,000 euros).
    panel(worked([own('2000', 'USD'), own('400000', 'JPY')]));
    assert.equal(total()?.value, '€3,000.00');
  });

  it('a debt in another currency: the share and amount as sizes, banded as a debt', () => {
    // 5,000 euros, 2,000 dollars (1,000 euros) owed: 4,000 euros, of which the euro is 125%.
    panel(worked([own('5000'), owe('2000', 'USD')]));
    assert.deepEqual(cards().map((c) => [c.band, c.head, c.badge?.[0]]), [
      ['functional', `${name.EUR} · 125.0% of net worth · €5,000.00`, 'Spending currency'],
      ['net-debt', `${name.USD} · ${MINUS}25.0% of net worth · €1,000.00`, 'Net debt'],
    ]);
    assert.equal(total()?.value, '€4,000.00');
  });

  it('a share past 999% is said in words, and 999% still as a number', () => {
    // 10,000 euros, 19,980 dollars (9,990 euros) owed: 10 euros left, of which the euro is 100,000%.
    const over = worked([own('10000'), owe('19980', 'USD')]);
    panel(over);
    assert.equal(heads()[0], `${name.EUR} · over 999% of net worth · €10,000.00`);
    assert.equal(heads()[1], `${name.USD} · over 999% of net worth · €9,990.00`);
  });

  it('a share of exactly 999% is still a number', () => {
    const result = worked([own('5000'), owe('2000', 'USD')]);
    const at = { ...result, positions: result.positions.map((p) => ({ ...p, pctOfTotal: p.isFunctional ? 999 : -999 })) };
    panel(at);
    assert.deepEqual(heads(), [`${name.EUR} · 999.0% of net worth · €5,000.00`, `${name.USD} · ${MINUS}999.0% of net worth · €1,000.00`]);
  });

  it('a currency that comes to nothing states no share and no amount', () => {
    // 500 euros held and 500 owed, 2,000 dollars (1,000 euros).
    panel(worked([own('500'), owe('500'), own('2000', 'USD')]));
    assert.deepEqual(heads(), [name.EUR, `${name.USD} · 100.0% of net worth · €1,000.00`]);
  });

  it('nothing left after debts: no shares, amounts as sizes, the total with its minus', () => {
    // 5,000 euros owed, 2,000 dollars (1,000 euros) held: minus 4,000.
    panel(worked([owe('5000'), own('2000', 'USD')]));
    assert.equal(total()?.value, `${MINUS}€4,000.00`);
    assert.deepEqual(cards().map((c) => [c.band, c.head, c.badge, c.label]), [
      ['functional', `${name.EUR} · €5,000.00`, ['Spending currency', 'var(--risk-functional)'], 'Your spending currency'],
      ['unbanded', `${name.USD} · €1,000.00`, ['No band', 'var(--risk-unbanded)'], 'No share of net worth'],
    ]);
    assert.equal(chart(), 1);
  });

  it('amounts that cancel inside one currency: a plain zero and no shares, never a share of what the floats left (#824)', () => {
    // 500,000.30 euros held, 499,000.10 owed, and 1,100.22 dollars owed at 1.1: nothing in all.
    panel(worked([own('500000.30'), owe('499000.10'), owe('1100.22', 'USD')], 'EUR', { EUR: 1, USD: 1.1 }));
    assert.equal(total()?.value, '€0.00');
    assert.deepEqual(cards().map((c) => [c.band, c.head]), [
      ['functional', `${name.EUR} · €1,000.20`],
      ['net-debt', `${name.USD} · €1,000.20`],
    ]);
    assert.ok(!document.body.textContent!.includes('of net worth ·'), 'no card states a share');
  });

  it('in the spending currency of the page, in its minor units', () => {
    // In yen: 5,000 yen and 100 euros (20,000 yen).
    panel(worked([own('5000', 'JPY'), own('100')], 'JPY', { JPY: 1, EUR: 1 / 200 }), { currency: 'JPY' });
    assert.equal(total()?.value, '￥25,000');
    assert.deepEqual(heads(), [`${name.JPY} · 20.0% of net worth · ￥5,000`, `${name.EUR} · 80.0% of net worth · ￥20,000`]);
  });

  it('withheld: the reason once, for the total, with the actions still in reach', () => {
    panel(result, { withheld: REASON, actions: ACTIONS });
    assert.deepEqual([...document.querySelectorAll('.tool-resultReason')].map((p) => p.textContent), [REASON]);
    assert.ok(document.querySelector('.mcnw-riskCards')?.closest('[inert]'));
    assert.ok(document.querySelector('.mcnw-total')?.closest('[inert]'));
    assert.ok(document.querySelector('.test-actions')?.closest('[inert]') === null);
  });
});

describe('a currency missing its rate', () => {
  // 1,000 euros, 2,000 dollars owed (1,000 euros) and 700 koruna, which has no rate here.
  const RATED = { EUR: 1, USD: 2, JPY: 200 };
  const result = worked([own('3000'), owe('2000', 'USD'), own('700', 'CZK')], 'EUR', RATED);

  it('a subtotal, named as one, and no share, band or chart drawn from it', () => {
    panel(result);
    assert.deepEqual(total(), { label: r.totalPartial, value: '€2,000.00', partialLabel: true, hint: r.partialHint });
    assert.equal(chart(), 0);
    assert.deepEqual(cards(), [
      { band: 'unbanded', head: `${name.EUR} · Hidden · €3,000.00`, badge: null, label: null, sentences: 0 },
      // Without a band to say "debt", the amount carries its sign.
      { band: 'unbanded', head: `${name.USD} · Hidden · ${MINUS}€1,000.00`, badge: null, label: null, sentences: 0 },
      // Unconverted, in its own currency, with the one sentence saying why.
      { band: 'unbanded', head: `${name.CZK} · Rate unavailable · 700.00\u00a0Kč`, badge: null, label: null, sentences: 1 },
    ]);
  });

  it('while rates are still on the way, the currency is not yet called unavailable', () => {
    panel(result, { pendingRates: true });
    assert.equal(heads()[2], `${name.CZK} · 700.00\u00a0Kč`);
  });

  it('without amounts: the subtotal is hidden, still named as one', () => {
    panel(result, { hideAmounts: true });
    assert.deepEqual(total(), { label: r.totalPartial, value: r.hidden, partialLabel: true, hint: null });
    assert.deepEqual(heads(), [`${name.EUR} · Hidden`, `${name.USD} · Hidden`, `${name.CZK} · Rate unavailable`]);
  });

  it('with a rate for nothing held elsewhere: no total, and every amount in its own currency', () => {
    // 1,000 euros and 700 koruna, and a rate for neither the koruna nor anything else held.
    const none = worked([own('1000'), own('700', 'CZK')], 'EUR', { EUR: 1 });
    panel(none);
    assert.ok(total() === null);
    assert.equal(chart(), 0);
    assert.deepEqual(cards(), [
      { band: 'unbanded', head: `${name.EUR} · €1,000.00`, badge: null, label: null, sentences: 0 },
      { band: 'unbanded', head: `${name.CZK} · Rate unavailable · 700.00\u00a0Kč`, badge: null, label: null, sentences: 0 },
    ]);
  });

  it('with no rates at all: the amounts as they were typed, largest first', () => {
    // 1,000 euros and 2,000 dollars, unconverted.
    panel(worked([own('1000'), own('2000', 'USD')], 'EUR', null));
    assert.ok(total() === null);
    assert.deepEqual(heads(), [`${name.USD} · Rate unavailable · $2,000.00 USD`, `${name.EUR} · €1,000.00`]);
  });

  it('a view without amounts or rates bands a currency with no rate as no band, never low', () => {
    // 1,000 euros and 2,000 dollars, with no rates fetched.
    panel(worked([own('1000'), own('2000', 'USD')], 'EUR', null), { hideAmounts: true });
    assert.deepEqual(cards()[0], { band: 'unbanded', head: `${name.USD} · Rate unavailable`, badge: ['No band', 'var(--risk-unbanded)'], label: null, sentences: 1 });
  });

  it('a view without amounts or rates gives the spending currency no share either: words, and no sentence about 0% (#887)', () => {
    panel(worked([own('1000'), own('2000', 'USD')], 'EUR', null), { hideAmounts: true });
    assert.deepEqual(heads(), [`${name.USD} · Rate unavailable`, `${name.EUR} · Rate unavailable`]);
    assert.deepEqual(cards()[1], { band: 'functional', head: `${name.EUR} · Rate unavailable`, badge: ['Spending currency', 'var(--risk-functional)'], label: 'Your spending currency', sentences: 0 });
    assert.ok(!document.body.textContent!.includes('0%'), 'no share of nothing');
    // The dollar's sentence says once why it is left out, as before.
    assert.equal(cards()[0].sentences, 1);
  });

  it('the same view while its rates are still on the way calls nothing unavailable yet (#887)', () => {
    panel(worked([own('1000'), own('2000', 'USD')], 'EUR', null), { hideAmounts: true, pendingRates: true });
    assert.deepEqual(heads(), [name.USD, name.EUR]);
  });

  it('a link without amounts or rates still gives the shares it carried', () => {
    const shared = withoutAmounts(worked([own('1000'), own('2000', 'USD'), own('400000', 'JPY')]));
    panel(shared, { hideAmounts: true });
    assert.deepEqual(total(), { label: r.totalLabel, value: r.hidden, partialLabel: false, hint: null });
    assert.deepEqual(heads(), [`${name.EUR} · 25.0% of net worth`, `${name.JPY} · 50.0% of net worth`, `${name.USD} · 25.0% of net worth`]);
  });

  it('the same link drawn with its amounts on gives no total from them', () => {
    const shared = withoutAmounts(worked([own('1000'), own('2000', 'USD')]));
    panel(shared);
    assert.ok(total() === null);
  });
});
