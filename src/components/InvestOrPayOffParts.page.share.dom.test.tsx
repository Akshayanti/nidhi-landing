/**
 * The invest or pay off calculator as its page mounts it (#790): a shared
 * link arriving, and what is kept for the language switch. Copying, the
 * reset and the exports are in InvestOrPayOffParts.page.export.dom.test.tsx;
 * the page's parts and typing in InvestOrPayOffParts.page.dom.test.tsx.
 *
 * Throughout: the address is never written, a link carries state after the
 * `#` only, and analytics get fixed event names and choices, never a typed
 * amount, rate or the encoded state (CLAUDE.md, "Free Tools Keep Inputs Out
 * of URLs").
 */
import {
  island, t, fill, events, eventNames, published, shared, asked, clock, arriveWith, cameFrom, mount, page, one, boxes, type, typeAndSettle,
  currencySelect, countrySelect, chooseCurrency, pick, more, shareButton, xlsxButton, ariaDisabled, headline, withheld, said, sentText,
  addressUntouched,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from '@testing-library/react';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { compare, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS, decodeState } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

/** A link's state: dollars, a small debt, the optimistic return, compared on the day it is paid. */
const LINK = 'c=USD&b=1000&r=5&p=300&x=150&i=3&s=o&h=p';
const LINKED: Inputs = { ...DEFAULTS, balance: 1000, debtRate: 5, payment: 300, extra: 150, inflation: 3, returns: 'optimistic', horizon: 'payoff' } as Inputs;
const money = (code: string, amountLocale: string | null = null) => (v: number) => formatAmount(v, code, false, amountLocale).replace(/^-/, '−');
const linesFor = (inputs: Inputs, code: string, todayAt: 'month' | 'end' = 'month') => resultLines(compare(inputs), island, 'en', money(code), todayAt);
/** Nothing typed, and no state, reached analytics, and the address was not written. */
const nothingTypedSent = (...typed: string[]) => {
  const sent = sentText();
  for (const v of typed) assert.ok(!sent.includes(v), `analytics carried ${v}`);
  for (const [, props] of events) {
    for (const value of Object.values(props ?? {})) assert.ok(value === null || !String(value).includes('='), 'analytics carried the state');
  }
};

describe('the invest or pay off calculator: links, sharing and saving', () => {
  it('opens a shared link as it was sent, at once, and says it was opened', () => {
    arriveWith(LINK);
    mount();
    {
      // the boxes and choices the link carries, with its comparison and nothing waiting
      assert.deepEqual([boxes.balance().value, boxes.debtRate().value, boxes.payment().value, boxes.extra().value, boxes.inflation().value], ['1000', '5', '300', '150', '3']);
      assert.equal(currencySelect().value, 'USD');
      assert.equal(countrySelect().value, '');
      assert.equal((one('input[value="optimistic"]') as HTMLInputElement).checked, true);
      assert.equal((one('input[value="payoff"]') as HTMLInputElement).checked, true);
      assert.equal(headline(), linesFor(LINKED, 'USD')[1]);
      assert.equal(ariaDisabled(shareButton()), false);
      assert.equal(ariaDisabled(xlsxButton()), false);
      assert.equal(one('.iop-example').textContent, '');
      assert.equal(more().open, false);
    }
    // One event for the link, with no source in an address that has none, and the calculated one.
    assert.deepEqual(events, [['free_invest_or_pay_off_shared_view_opened', { utm_source: null }], ['free_invest_or_pay_off_calculated', undefined]]);
    // The state kept for the language switch is the link's, once.
    assert.equal(published.length, 1);
    assert.deepEqual(decodeState(published[0] as string), { ...LINKED, currency: 'USD', country: '', todayAt: 'month' });
    assert.deepEqual(asked, []);
    clock.pass(5000);
    assert.equal(headline(), linesFor(LINKED, 'USD')[1]);
    assert.ok(addressUntouched());
  });

  it('names where a shared link came from, and leaves a language switch uncounted', () => {
    window.history.replaceState(null, '', '/free/?utm_source=share&utm_medium=referral');
    const before = window.location.href;
    arriveWith(LINK);
    const view = mount();
    assert.deepEqual(events[0], ['free_invest_or_pay_off_shared_view_opened', { utm_source: 'share' }]);
    assert.equal(window.location.href, before);
    view.unmount();
    window.history.replaceState(null, '', '/free/');
    // The same link, carried over from the Hindi page by the language switch.
    events.length = 0;
    cameFrom('https://nidhi.today/hi/free/');
    arriveWith(LINK);
    mount();
    assert.equal(headline(), linesFor(LINKED, 'USD')[1]);
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated']);
  });

  it('opens "Taxes and fees" for a link that sets one of them, and only then', () => {
    for (const [extra, open] of [['&l=10', true], ['&f=0.5', true], ['&t=15', true], ['&l=0&f=0&t=0', false]] as const) {
      arriveWith(LINK + extra);
      const view = mount();
      assert.equal(more().open, open, extra);
      view.unmount();
    }
  });

  it('keeps a link\'s country only if the page has it', () => {
    arriveWith(`${LINK}&n=ZZZ`);
    const view = mount();
    assert.equal(countrySelect().value, '');
    // nothing is fetched for a country the page does not offer, and the switch does not carry it
    assert.deepEqual(asked, []);
    assert.equal(decodeState(shared() as string)?.country, '');
    view.unmount();
    arriveWith('b=1000&h=p&n=EMU');
    mount({ defaultCountry: '' });
    assert.equal(countrySelect().value, 'EMU');
    assert.equal(boxes.inflation().placeholder, '2');
    assert.equal(headline(), linesFor({ ...DEFAULTS, balance: 1000, horizon: 'payoff', inflation: 2 } as Inputs, 'EUR')[1]);
  });

  it('shows a link\'s box that cannot be read as it came, marked, with its comparison held back', () => {
    // A hand-edited link: a space in the amount.
    arriveWith(LINK.replace('b=1000', 'b=1%20000'));
    mount();
    const balance = boxes.balance();
    assert.equal(balance.value, '?');
    assert.equal(balance.getAttribute('aria-invalid'), 'true');
    assert.equal(balance.closest('.ifc-field')?.querySelector('.ifc-error')?.textContent, fill(t.export.fieldError, { message: t.export.fieldUnreadable }));
    assert.equal(withheld(), true);
    assert.equal(ariaDisabled(shareButton()), true);
    // The language switch carries it still unreadable, and nothing is worked out from it.
    assert.equal(new URLSearchParams(shared() as string).get('b'), 'NaN');
    clock.pass(1000);
    assert.equal(said(), island.results.fix);
    // (The page counts its first comparison as it starts, before the link is read.)
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_shared_view_opened', 'free_invest_or_pay_off_calculated']);
    // Typed again, the comparison comes.
    typeAndSettle('balance', '1000');
    assert.equal(headline(), linesFor(LINKED, 'USD')[1]);
    assert.equal(events.length, 2);
  });

  it('ignores what the page head left that is not a link\'s state', () => {
    for (const left of [42, '', 'utm_source=share', { b: 1000 }]) {
      events.length = 0;
      published.length = 0;
      arriveWith(left);
      const view = mount();
      assert.equal(boxes.balance().value, '18000', String(left));
      assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated'], String(left));
      assert.deepEqual(published, [''], String(left));
      view.unmount();
    }
  });

  it('reads its link again in a new number style', () => {
    arriveWith('b=1000&h=p&i=2.5');
    const view = render(page());
    assert.equal(boxes.inflation().value, '2.5');
    view.rerender(page({ numberLocale: 'de' }));
    assert.equal(boxes.inflation().value, '2,5');
    assert.equal(boxes.inflation().hasAttribute('aria-invalid'), false);
  });

  it('keeps the form as it stands for the language switch, a wrong box and a choice made beside it included', () => {
    mount({ defaultCurrency: 'INR', defaultCountry: '', initialHistory: null });
    assert.deepEqual(published, ['']);
    // The page's own currency chosen again is still untouched; another is carried at once, before anything settles.
    chooseCurrency('EUR');
    assert.equal(shared(), 'c=EUR');
    chooseCurrency('INR');
    assert.equal(shared(), '');
    type('balance', '7x');
    pick('horizon', 'plus10');
    const kept = new URLSearchParams(shared() as string);
    assert.deepEqual([kept.get('b'), kept.get('h'), kept.get('c')], ['NaN', '0', 'INR']);
    type('balance', '2500');
    assert.equal(decodeState(shared() as string)?.balance, 2500);
    // Every value kept was the form's, never the address.
    assert.ok(addressUntouched());
    nothingTypedSent('2500');
  });
});
