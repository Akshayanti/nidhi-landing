/**
 * The loan comparison as its page mounts it (#790): adding and removing
 * offers, the phone's buttons that pick the card to show, the currency, the
 * reset and the tabs. Links arriving are in LoanCompare.page-links.dom.test.tsx;
 * copying, the exports and the validation event in
 * LoanCompare.page-share.dom.test.tsx.
 *
 * The phone's buttons carry fixed labels only ("Offer A"); a typed name is
 * shown as text, never put in an attribute, and no event carries one.
 */
import {
  island, events, arriveWith, mount, offer, link, cards, phoneTabs, shownOffer, names, type, c, fill, one, all, has, byId,
  currencySelect, chooseCurrency, button, sentText, addressUntouched,
} from '../../test/loanCompare.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { CURRENCIES } from '../utils/loan/math.ts';

const p = island.phoneTabs;
const addCard = () => document.querySelector('.lc-grid > .lc-cardAdd') as HTMLButtonElement | null;
const addTab = () => document.querySelector('.lc-vendorTabs > .lc-vendorTabAdd') as HTMLButtonElement | null;
const removeButtons = () => all('.lc-cardRemove');
const remove = (i: number) => fireEvent.click(one('.lc-cardRemove', cards()[i]));
const show = (i: number) => fireEvent.click(phoneTabs()[i]);
const tab = (label: string) => all('[role="tab"]').find((b) => b.textContent?.includes(label)) as HTMLElement;

describe('the loan comparison: adding and removing offers', () => {
  it('adds offers up to five from either button, showing each one added, then offers no more', () => {
    mount();
    {
      // Two offers, the first shown, neither removable.
      assert.equal(cards().length, 2);
      assert.equal(shownOffer(), 0);
      assert.deepEqual(removeButtons(), []);
      assert.deepEqual(cards().map((card) => card.id), ['lc-vendor-card-0', 'lc-vendor-card-1']);
      // Each phone button names the card it shows, which is there, by its fixed label.
      assert.deepEqual(phoneTabs().map((b) => b.getAttribute('aria-controls')), ['lc-vendor-card-0', 'lc-vendor-card-1']);
      assert.deepEqual(phoneTabs().map((b) => b.querySelector('.lc-vendorTabName')?.textContent), ['Offer A', 'Offer B']);
      assert.deepEqual(phoneTabs().map((b) => b.className.trim().split(/\s+/)), [['lc-vendorTab', 'lc-vendorTabActive'], ['lc-vendorTab']]);
      assert.equal(addTab()?.getAttribute('aria-label'), fill(p.addAria, { n: 3, max: 5 }));
      assert.equal(one('.lc-cardAddHint', addCard()!).textContent, fill(p.addCardHint, { max: 5 }));
      // The cards are grouped under their heading.
      assert.equal(byId(one('.lc-grid').getAttribute('aria-labelledby'))?.textContent, island.cardsHeading);
    }
    fireEvent.click(addCard()!);
    assert.equal(cards().length, 3);
    assert.equal(shownOffer(), 2);
    assert.equal(removeButtons().length, 3);
    assert.equal(addTab()?.getAttribute('aria-label'), fill(p.addAria, { n: 4, max: 5 }));
    fireEvent.click(addTab()!);
    assert.equal(cards().length, 4);
    assert.equal(shownOffer(), 3);
    fireEvent.click(addCard()!);
    assert.equal(cards().length, 5);
    assert.equal(shownOffer(), 4);
    assert.equal(addCard(), null);
    assert.equal(addTab(), null);
    assert.deepEqual(events, [
      ['free_loan_comparison_vendor_added', { count: 3 }],
      ['free_loan_comparison_vendor_added', { count: 4 }],
      ['free_loan_comparison_vendor_added', { count: 5 }],
    ]);
  });

  it('removes the offer clicked, keeps a neighbour on show, and stops at two', () => {
    const named = ['Ann', 'Bea', 'Cal', 'Dee', 'Eve'];
    arriveWith(link(named.map((name, i) => offer(i, { name }))));
    mount();
    events.length = 0;
    // A typed name is the button's text.
    assert.deepEqual(phoneTabs().map((b) => b.querySelector('.lc-vendorTabName')?.textContent), named);
    show(2);
    assert.equal(shownOffer(), 2);
    // The one on show goes: the next takes its place.
    remove(2);
    assert.deepEqual(names(), ['Ann', 'Bea', 'Dee', 'Eve']);
    assert.equal(shownOffer(), 2);
    // One before the one on show goes: the same offer stays on show.
    show(1);
    remove(0);
    assert.deepEqual(names(), ['Bea', 'Dee', 'Eve']);
    assert.equal(shownOffer(), 0);
    // The last, on show, goes: the one before it is shown.
    show(2);
    remove(2);
    assert.deepEqual(names(), ['Bea', 'Dee']);
    assert.equal(shownOffer(), 1);
    assert.deepEqual(removeButtons(), []);
    // The event names the slot clicked and the count left, never a typed name.
    assert.deepEqual(events, [
      ['free_loan_comparison_vendor_removed', { vendor: 'C', count: 4 }],
      ['free_loan_comparison_vendor_removed', { vendor: 'A', count: 3 }],
      ['free_loan_comparison_vendor_removed', { vendor: 'C', count: 2 }],
    ]);
    for (const name of named) assert.ok(!sentText().includes(name));
  });

  it('removes from the end, the last offer on show', () => {
    arriveWith(link([0, 1, 2].map((i) => offer(i, { name: `Lender ${i}` }))));
    mount();
    show(2);
    remove(2);
    assert.deepEqual(names(), ['Lender 0', 'Lender 1']);
    assert.equal(shownOffer(), 1);
  });
});

describe('the loan comparison: the currency, the reset and the tabs', () => {
  it('shows amounts in the currency chosen, resets to the page\'s start, and opens the tab clicked', () => {
    mount();
    const select = currencySelect();
    // Every currency the tool has, in the page's words, with the hint read with it.
    assert.deepEqual([...select.options].map((o) => o.value), CURRENCIES.map((x) => x.code));
    assert.deepEqual([...select.options].map((o) => o.textContent), CURRENCIES.map((x) => island.currencies[x.code as keyof typeof island.currencies]));
    assert.equal(byId(select.getAttribute('aria-describedby'))?.textContent, island.toolbar.currencyHelp);
    assert.equal(one('.lc-fieldPreview').textContent, `${island.toolbar.sample} €12,345,678.90`);

    chooseCurrency('INR');
    assert.equal(currencySelect().value, 'INR');
    assert.equal(one('.lc-fieldPreviewValue').textContent, '₹1,23,45,678.90');
    // Another currency is a change: the offers are no longer the example.
    assert.equal(has('.lc-example'), false);

    type(0, c.name, 'Zephyr Bank');
    fireEvent.click(addCard()!);
    show(1);
    fireEvent.click(tab(island.tabs.how.label));
    assert.equal(tab(island.tabs.how.label).getAttribute('aria-selected'), 'true');
    assert.equal(tab(island.tabs.charts.label).getAttribute('aria-selected'), 'false');

    fireEvent.click(button('lc-reset'));
    assert.equal(currencySelect().value, 'EUR');
    assert.equal(cards().length, 2);
    assert.deepEqual(names(), ['Offer A', 'Offer B']);
    assert.equal(shownOffer(), 0);
    assert.equal(tab(island.tabs.charts.label).getAttribute('aria-selected'), 'true');
    assert.equal(one('.lc-example').textContent, island.example);
    assert.deepEqual(events.map(([name, props]) => [name, props]), [
      ['free_loan_comparison_currency_changed', { currency: 'INR' }],
      ['free_loan_comparison_vendor_added', { count: 3 }],
      ['free_loan_comparison_tab_changed', { tab: 'how', via: 'click' }],
      ['free_loan_comparison_reset', undefined],
    ]);
    assert.ok(!sentText().includes('Zephyr'));
    assert.ok(addressUntouched());
  });
});
