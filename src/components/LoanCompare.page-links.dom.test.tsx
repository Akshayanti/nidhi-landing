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
  island, events, eventNames, published, arriveWith, cameFrom, mount, offer, link, oldLink, cards, currencySelect, has, box, c,
  splitFollows, rowAmount, addressUntouched, one, all, page, type, shared, clipboard, shareButton, copied,
} from '../../test/loanCompare.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';
import { act, fireEvent } from '@testing-library/react';
import { amountLength } from '../utils/shared/amountUnits.ts';
import { checkOf, openState, pairsOf } from '../utils/shared/checkedLink.ts';

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
    mount({ defaultCurrency: 'QQQ' });
    assert.equal(currencySelect().value, 'EUR');
  });
});

describe('the loan comparison: a link that did not arrive whole (issue 820)', () => {
  // A link with a name, an amount and a currency no starting offer has.
  const SENT = [offer(0, { name: 'North', principal: '73191' }), offer(1), offer(2, { principal: '90000' })];
  const whole = () => link(SENT, { currency: 'USD', activeTab: 'horizon' });
  /** The pairs of a state, written back as a link carries them. */
  const written = (pairs: (readonly [string, string])[]) => new URLSearchParams(pairs.map(([k, v]) => [k, v])).toString();
  /** These pairs, with a check that is right for them. */
  const checked = (pairs: (readonly [string, string])[]) => written([...pairs, ['z', checkOf(pairs)]]);

  /**
   * The notice, or null. Compare it with `===` inside `assert.ok`, never with
   * `assert.equal`: when such a comparison fails, node writes out the element
   * to build its message, and an element of this page leads to the whole
   * document. That took gigabytes of memory in seconds and never finished,
   * so a mutant of the notice's code hung instead of failing.
   */
  const notice = () => document.querySelector('.lc-linkDamaged');
  const startButton = () => one('.lc-linkDamaged button') as HTMLButtonElement;

  /** The page shows the notice and nothing of a comparison. */
  function showsOnlyTheNotice(at: string) {
    assert.ok(notice(), `no notice: ${at}`);
    const root = one('.lc-root');
    assert.deepEqual([...root.children].map((el) => el.className), ['lc-linkDamaged'], at);
    assert.equal(cards().length, 0, at);
    for (const gone of ['.lc-example', '.lc-toolbar', '.lc-grid', '.lc-deltaSection', '.lc-shareUrlBar', '[data-attr="lc-share-copy"]', '[data-attr="lc-export-xlsx"]', '[data-attr="lc-export-pdf"]', 'input', 'select', '.amt', 'table', 'svg']) {
      assert.equal(has(gone), false, `${gone}: ${at}`);
    }
  }

  it('shows one sentence and one button in place of the tool, where a link cut short used to open as the example offers', () => {
    window.history.replaceState(null, '', '/free/?utm_source=share&utm_medium=referral');
    const before = window.location.href;
    const sent = whole();
    assert.equal(openState(sent, '2'), 'whole');
    // Cut in the middle of the third offer, as a messaging app cuts a long address.
    const cut = sent.slice(0, sent.indexOf('v3=') + 8);
    arriveWith(cut);
    mount({ defaultCurrency: 'INR' });

    showsOnlyTheNotice('cut');
    const sentence = one('.lc-linkDamaged > p');
    assert.equal(sentence.textContent, 'This comparison link is incomplete or has changed. Ask the sender for the full link, or start a new comparison.');
    assert.equal(sentence.getAttribute('role'), 'alert');
    assert.equal(all('.lc-linkDamaged button').length, 1);
    assert.equal(startButton().textContent, 'Start a new comparison');
    assert.equal(startButton().type, 'button');
    // No click label of its own: the button sends nothing.
    assert.equal(document.querySelectorAll('.lc-linkDamaged [data-attr]').length, 0);
    // Nothing of the link is on the page, in a box or in words.
    const text = one('.lc-root').textContent ?? '';
    for (const typed of ['North', '73191', '90000', '250000']) assert.ok(!text.includes(typed), typed);
    // No comparison was opened, so none is counted.
    assert.deepEqual(events, []);
    // What arrived is what the language switch carries: the other language shows the same notice.
    assert.deepEqual(published, [cut]);
    assert.equal(window.location.href, before);
  });

  it('does so for every way a link with a check can be wrong, and loads none of them', () => {
    const pairs = pairsOf(whole());
    const body = pairs.slice(0, -1);
    const z = pairs[pairs.length - 1];
    const kinds: [string, string][] = [
      ['the check is gone', written(body)],
      ['the check is not the last pair', written([body[0], z, ...body.slice(1)])],
      ['the check is there twice', written([...body, z, z])],
      ['the check is of something else', written([...body, ['z', z[1] === '00000000' ? '00000001' : '00000000']])],
      ['a value changed', written(pairs.map(([k, v]) => [k, k === 'c' ? 'GBP' : v] as const))],
      ['a pair was dropped', written(pairs.filter(([k]) => k !== 'v3'))],
      ['the format is another one', checked([['f', '3'], ...body.slice(1)])],
      ['the format is not first', checked([body[1], body[0], ...body.slice(2)])],
      ['the format is there twice', checked([...body, body[0]])],
      ['a key is there twice', checked([...body, body[1]])],
      ['only the format survives', 'f=2'],
    ];
    for (const [kind, state] of kinds) {
      assert.equal(openState(state, '2'), 'damaged', kind);
      arriveWith(state);
      const view = mount({ defaultCurrency: 'INR' });
      showsOnlyTheNotice(kind);
      assert.deepEqual(events, [], kind);
      assert.equal(shared(), state, kind);
      view.unmount();
    }
    assert.ok(addressUntouched());
  });

  it('shows the same notice after a language switch, which carried the link as it arrived', () => {
    cameFrom('https://nidhi.today/hi/free/');
    const cut = whole().slice(0, 40);
    arriveWith(cut);
    mount({ strings: { ...island, link: { damaged: 'यह लिंक अधूरा है।', startNew: 'नई तुलना' } } });
    showsOnlyTheNotice('after the switch');
    assert.equal(one('.lc-linkDamaged > p').textContent, 'यह लिंक अधूरा है।');
    assert.equal(startButton().textContent, 'नई तुलना');
    assert.deepEqual(published, [cut]);
    assert.deepEqual(events, []);
  });

  it('“Start a new comparison” opens the tool as it opens with no link: the example offers in the page\'s currency, the keyboard on the line that says so', () => {
    arriveWith(whole().slice(0, 40));
    mount({ defaultCurrency: 'INR' });
    act(() => { fireEvent.click(startButton()); });

    assert.ok(notice() === null);
    assert.equal(cards().length, 2);
    assert.equal(currencySelect().value, 'INR');
    assert.deepEqual(cards().map((card) => box(card, c.name).value), ['Offer A', 'Offer B']);
    const example = one('.lc-example');
    assert.equal(example.textContent, island.example);
    assert.equal(example.getAttribute('tabindex'), '-1');
    assert.ok(document.activeElement === example);
    // The damaged link is carried no longer: an untouched tool carries nothing.
    assert.equal(shared(), '');
    // The button sent nothing, and no comparison was opened from a link.
    assert.deepEqual(events, []);
    assert.ok(addressUntouched());

    // From here it is the tool as ever: what is typed is carried in a link that opens.
    type(0, c.principal, '73191');
    assert.equal(openState(shared() as string, '2'), 'whole');
    assert.ok(document.querySelector('.lc-linkDamaged') === null);
  });

  it('a new comparison opens in euros on a page whose starting currency the tool does not offer, as the tool does with no link', () => {
    arriveWith(whole().slice(0, 40));
    mount({ defaultCurrency: 'QQQ' });
    act(() => { fireEvent.click(startButton()); });
    assert.equal(currencySelect().value, 'EUR');
    assert.equal(cards().length, 2);
  });

  it('leaves the keyboard where it is when the tool opens without the notice', () => {
    mount();
    assert.ok(notice() === null);
    assert.ok(document.activeElement !== one('.lc-example'));
    assert.equal(one('.lc-example').getAttribute('tabindex'), '-1');
  });

  it('a whole link opens as the comparison it carries, never as the notice', () => {
    arriveWith(whole());
    mount({ defaultCurrency: 'INR' });
    assert.ok(notice() === null);
    assert.equal(cards().length, 3);
    assert.equal(box(cards()[0], c.principal).value, '73191');
    assert.deepEqual(eventNames(), ['free_loan_comparison_shared_view_opened']);
  });

  it('a link written before the check is read exactly as it always was, and is carried on with a check', () => {
    const old = oldLink(SENT, { currency: 'USD', activeTab: 'horizon' });
    assert.equal(openState(old, '2'), 'plain');
    arriveWith(old);
    mount({ defaultCurrency: 'INR' });
    assert.ok(notice() === null);
    assert.equal(currencySelect().value, 'USD');
    assert.deepEqual(cards().map((card) => box(card, c.name).value), ['North', 'Offer B', 'Offer C']);
    assert.equal(box(cards()[0], c.principal).value, '73191');
    assert.equal(tabSelected(island.tabs.horizon.label), 'true');
    assert.deepEqual(events, [['free_loan_comparison_shared_view_opened', { vendors: 3, utm_source: null }]]);
    // What it keeps for the language switch is the same comparison, in the format written now.
    assert.deepEqual(published, [whole()]);
    assert.equal(whole(), `f=2&${old}&z=${checkOf(pairsOf(`f=2&${old}`))}`);
  });

  it('an old link cut short cannot be told from a whole one, and opens with what is left of it: the accepted limit', () => {
    const old = oldLink(SENT, { currency: 'USD' });
    arriveWith(old.slice(0, old.indexOf('v3=') + 8));
    mount();
    assert.ok(notice() === null);
    assert.equal(cards().length, 3);
  });

  it('every link the page writes has a check that holds: the copied one and the one kept for the switch', async () => {
    clipboard();
    arriveWith(whole());
    mount();
    await act(async () => { fireEvent.click(shareButton()); });
    assert.equal(copied.length, 1);
    const [address, state] = copied[0].split('#');
    assert.ok(address.endsWith('utm_content=loan_comparison'));
    assert.equal(state, whole());
    assert.equal(openState(state, '2'), 'whole');
    assert.equal(shared(), state);
    assert.match(state, /^f=2&.*&z=[0-9a-f]{8}$/);
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
