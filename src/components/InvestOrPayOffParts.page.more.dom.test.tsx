/**
 * The invest or pay off calculator as its page mounts it (#790): "Taxes and
 * fees", how amounts are written, how today's money is counted, and a new
 * list of countries. The inflation figure and the reader's own return are in
 * InvestOrPayOffParts.page.form.dom.test.tsx.
 *
 * Throughout: the address is never written while typing, and analytics get
 * fixed event names, never a typed amount, rate or the encoded state
 * (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 */
import {
  island, fill, events, shared, clock, mount, page, all, text, one, type, typeAndSettle, currencySelect, chooseCountry, radio, pick, more,
  toggleMore, resetButton, sentText, addressUntouched, COUNTRIES,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, render } from '@testing-library/react';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { compare, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

const minus = (s: string) => s.replace(/^-/, '\u2212');
const money = (code = 'EUR', amountLocale: string | null = null) => (v: number) => minus(formatAmount(v, code, false, amountLocale));
/** Nothing typed reached analytics. */
const nothingTypedSent = (...typed: string[]) => {
  const sent = sentText();
  for (const v of typed) assert.ok(!sent.includes(v), `analytics carried ${v}`);
  for (const [, props] of events) {
    for (const value of Object.values(props ?? {})) assert.ok(value === null || !String(value).includes('='), 'analytics carried the state');
  }
  assert.ok(addressUntouched(), 'the address was written');
};

describe('the invest or pay off calculator: taxes and fees, amounts, today\'s money', () => {
  it('keeps "Taxes and fees" open while a box in it is wrong, and names what is in use', () => {
    mount();
    toggleMore(true);
    assert.equal(more().open, true);
    type('relief', '101');
    assert.equal(more().open, true);
    // the status goes while a box is wrong, and closing is refused
    assert.equal(all('.iop-more:not(.iop-basis) .iop-moreStatus').length, 0);
    toggleMore(false);
    assert.equal(more().open, true);
    type('relief', '10');
    type('feePct', '1');
    assert.equal(one('.iop-more:not(.iop-basis) .iop-moreStatus').textContent, fill(island.more.inUse, { list: `${island.more.relief}, ${island.more.feePct}` }));
    type('gainsTax', '15');
    assert.equal(one('.iop-more:not(.iop-basis) .iop-moreStatus').textContent, fill(island.more.inUse, { list: `${island.more.relief}, ${island.more.feePct}, ${island.more.gainsTax}` }));
    type('relief', '0');
    type('feePct', 'x');
    type('gainsTax', '0');
    assert.equal(all('.iop-more:not(.iop-basis) .iop-moreStatus').length, 0);
    type('feePct', '0');
    assert.equal(one('.iop-more:not(.iop-basis) .iop-moreStatus').textContent, island.more.none);
    // closed by hand now that nothing is wrong
    toggleMore(false);
    assert.equal(more().open, false);
    nothingTypedSent('101', '15');
  });

  it('opens "Taxes and fees" by itself for a wrong box it hides, and the reset folds it again', () => {
    mount();
    assert.equal(more().open, false);
    type('gainsTax', '200');
    assert.equal(more().open, true);
    type('gainsTax', '0');
    assert.equal(more().open, true, 'what was opened for the reader stays open');
    clock.pass(250);
    fireEvent.click(resetButton());
    assert.equal(more().open, false);
    // Opened by hand, the reset folds it too.
    toggleMore(true);
    fireEvent.click(resetButton());
    assert.equal(more().open, false);
    type('feePct', '9');
    assert.equal(more().open, true);
    assert.equal(events.at(-1)?.[0], 'free_invest_or_pay_off_reset');
    nothingTypedSent('200', '9');
  });

  it('writes amounts the page\'s way, with a true minus, and in the currency chosen', () => {
    mount({ amountLocale: 'es' });
    const lines = resultLines(compare({ ...DEFAULTS, inflation: 2 } as Inputs), island, 'en', money('EUR', 'es'), 'month');
    assert.ok(text('.iop-answer p').includes(`${lines[0]} ${lines[2]}`));
    assert.ok(/\u22121650\s€/.test(lines[2]), lines[2]);
    fireEvent.change(currencySelect(), { target: { value: 'USD' } });
    pick('horizon', 'payoff');
    typeAndSettle('balance', '1000');
    assert.equal(currencySelect().value, 'USD');
    const usd = resultLines(compare({ ...DEFAULTS, inflation: 2, balance: 1000, horizon: 'payoff' } as Inputs), island, 'en', money('USD', 'es'), 'month');
    assert.ok(text('.iop-answer p').includes(`${usd[0]} ${usd[2]}`));
    assert.ok(usd[2].includes('US$') || usd[2].includes('$'));
    nothingTypedSent('1000', 'USD');
  });

  it('lets the reader count today\'s money at the comparison date, and the page says so', () => {
    mount();
    const end = radio('basis', 'end');
    fireEvent.click(end);
    assert.equal(radio('basis', 'end').checked, true);
    clock.pass(250);
    const lines = resultLines(compare({ ...DEFAULTS, inflation: 2 } as Inputs), island, 'en', money(), 'end');
    assert.ok(text('.iop-answer p').includes(lines[3]));
    // the printed report says the same
    assert.ok(text('.tool-report p').includes(lines[3]));
    assert.equal(shared(), 'n=EMU&a=e');
    // a choice, never sent
    nothingTypedSent('a=e');
  });

  it('takes a new list of countries when the page is given one', () => {
    const view = render(page());
    chooseCountry('');
    // The same Euro area, now in pounds.
    view.rerender(page({ countries: COUNTRIES.map((c) => (c.code === 'EMU' ? { ...c, currency: 'GBP' } : c)) }));
    chooseCountry('EMU');
    assert.equal(currencySelect().value, 'GBP');
  });
});
