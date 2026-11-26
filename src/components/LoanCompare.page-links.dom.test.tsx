/**
 * The loan comparison as its page mounts it (#790): a shared link arriving,
 * what is kept for the language switch, and what the page works out across
 * the offers (the amounts drawn at one size, the points break-even, the offer
 * the split chart follows). Adding, removing and choosing offers, the
 * currency and the reset are in LoanCompare.page-offers.dom.test.tsx;
 * copying, the exports and the validation event in
 * LoanCompare.page-share.dom.test.tsx.
 *
 * The page reads a link from the window property ToolStateGuard leaves,
 * never from the address, and writes nothing to the address (CLAUDE.md,
 * "Free Tools Keep Inputs Out of URLs").
 */
import {
  island, events, eventNames, published, arriveWith, cameFrom, mount, offer, link, cards, currencySelect, has, box, c,
  splitFollows, rowAmount, addressUntouched, one, all, page,
} from '../../test/loanCompare.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';
import { amountLength } from '../utils/shared/amountUnits.ts';

const r = island.results;
const tabSelected = (label: string) => all('[role="tab"]').find((b) => b.textContent?.includes(label))?.getAttribute('aria-selected');

describe('the loan comparison: a shared link arriving', () => {
  it('as the server sends it: held until the island runs, in the page\'s currency, nothing copied and nothing said', () => {
    const doc = new DOMParser().parseFromString(renderToString(page({ defaultCurrency: 'INR' })), 'text/html');
    const root = doc.querySelector('.lc-root');
    assert.ok(root);
    assert.equal(root.hasAttribute('inert'), true);
    assert.equal(root.getAttribute('aria-busy'), 'true');
    assert.equal(doc.querySelector('.lc-currencyField option[selected]')?.getAttribute('value'), 'INR');
    assert.equal(doc.querySelectorAll('.lc-grid > article.lc-card').length, 2);
    assert.equal(doc.querySelector('.lc-shareUrlBar'), null);
    assert.equal(doc.querySelector('[data-attr="lc-share-copy"] .tool-swapLabel > span')?.textContent, island.toolbar.share);
    assert.equal(doc.querySelector('.lc-root > span[aria-live="polite"]')?.textContent, '');
  });

  it('opens without a link in the page\'s own currency, as the example, keeping nothing for the switch', () => {
    mount({ defaultCurrency: 'INR' });
    assert.equal(currencySelect().value, 'INR');
    assert.equal(cards().length, 2);
    assert.equal(one('.lc-example').textContent, island.example);
    // Nothing to carry: the other language opens with its own currency. Kept once, after the page read the head.
    assert.deepEqual(published, ['']);
    assert.deepEqual(events, []);
    assert.ok(addressUntouched());
  });

  it('opens a link as it was sent, says so once with where it came from, and keeps it for the switch', () => {
    window.history.replaceState(null, '', '/free/?utm_source=share&utm_medium=referral');
    const before = window.location.href;
    const state = link([offer(0, { name: 'North' }), offer(1), offer(2, { principal: '90000' })], { currency: 'USD', activeTab: 'horizon' });
    arriveWith(state);
    mount({ defaultCurrency: 'INR' });
    assert.equal(currencySelect().value, 'USD');
    assert.deepEqual(cards().map((card) => box(card, c.name).value), ['North', 'Offer B', 'Offer C']);
    assert.equal(box(cards()[2], c.principal).value, '90000');
    assert.equal(tabSelected(island.tabs.horizon.label), 'true');
    // A link is not the example.
    assert.equal(has('.lc-example'), false);
    assert.deepEqual(events, [['free_loan_comparison_shared_view_opened', { vendors: 3, utm_source: 'share' }]]);
    // The link's own state, once: never the starting state first.
    assert.equal(published.length, 1);
    assert.equal(published[0], state);
    assert.equal(window.location.href, before);
  });

  it('reads a link with no currency as euros on any page, and a link from an address with no source as from none', () => {
    arriveWith(link([offer(0), offer(1, { principal: '1000' })]));
    mount({ defaultCurrency: 'INR' });
    assert.equal(currencySelect().value, 'EUR');
    assert.deepEqual(events, [['free_loan_comparison_shared_view_opened', { vendors: 2, utm_source: null }]]);
  });

  it('leaves a language switch uncounted, and still opens what it carried', () => {
    cameFrom('https://nidhi.today/hi/free/');
    arriveWith(link([offer(0), offer(1)], { currency: 'GBP' }));
    mount();
    assert.equal(currencySelect().value, 'GBP');
    assert.deepEqual(eventNames(), []);
  });

  it('ignores what the page head left that is not a link\'s state', () => {
    arriveWith(42);
    mount({ defaultCurrency: 'INR' });
    assert.equal(currencySelect().value, 'INR');
    assert.equal(one('.lc-example').textContent, island.example);
    assert.deepEqual(events, []);
  });

  it('opens in euros on a page whose starting currency the tool does not offer', () => {
    mount({ defaultCurrency: 'XXX' });
    assert.equal(currencySelect().value, 'EUR');
  });
});

describe('the loan comparison: what is worked out across the offers', () => {
  it('draws each headline amount at the size of the longest among the offers, a link\'s included', () => {
    arriveWith(link([offer(0, { principal: '2500000' }), offer(1)]));
    mount();
    const [a, b] = cards();
    for (const row of [r.monthly, r.totalPaid, r.totalInterest]) {
      const big = rowAmount(a, row);
      const small = rowAmount(b, row);
      assert.ok(amountLength(big.text) > amountLength(small.text), row);
      assert.equal(big.length, amountLength(big.text), row);
      // The smaller offer's amount takes the larger one's room.
      assert.equal(small.length, amountLength(big.text), row);
    }
  });

  it('leaves an offer that cannot be worked out out of the shared size', () => {
    // A's payment only covers its interest: an error, but with a long payment the engine still states.
    arriveWith(link([offer(0, { principal: '2500000', annualRatePct: '200' }), offer(1)]));
    mount();
    const b = cards()[1];
    const monthly = rowAmount(b, r.monthly);
    assert.equal(monthly.length, amountLength(monthly.text));
  });

  it('shows the points break-even for a link\'s offer that paid points', () => {
    arriveWith(link([offer(0, { feeMajor: '3000', pointsCostMajor: '2500', pointsRateReductionPct: '0.25' }), offer(1)]));
    mount();
    const [a, b] = cards();
    assert.ok(a.textContent?.includes(r.breakEven));
    assert.ok(!b.textContent?.includes(r.breakEven));
  });

  it('has the split chart follow the offer that costs least in all, the first of equals, and only one that is paid off', () => {
    let view = mount();
    // B's rate is lower.
    assert.equal(splitFollows(), 'Offer B');
    view.unmount();

    arriveWith(link([offer(0), offer(1, { annualRatePct: '6.5' })]));
    view = mount();
    assert.equal(splitFollows(), 'Offer A');
    view.unmount();

    // A keeps its payment at a rate it cannot pay off: it has no total, so it is not the lowest.
    const never = { rateKind: 'hybrid', subsequentRatePct: '30', rateChangeKeeps: 'payment', initialFixedMonths: '12' } as const;
    arriveWith(link([offer(0, never), offer(1, { annualRatePct: '7' })]));
    view = mount();
    assert.equal(splitFollows(), 'Offer B');
    view.unmount();

    // No offer paid off, or none that can be worked out: the page still opens.
    arriveWith(link([offer(0, never), offer(1, never)]));
    view = mount();
    assert.equal(cards().length, 2);
    // With no total to compare, it follows the first offer that has a schedule.
    assert.equal(splitFollows(), 'Offer A');
    view.unmount();
    arriveWith(link([offer(0, { principal: '' }), offer(1, { principal: '' })]));
    mount();
    assert.equal(cards().length, 2);
  });
});
