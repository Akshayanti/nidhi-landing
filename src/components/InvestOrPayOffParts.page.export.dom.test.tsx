/**
 * The invest or pay off calculator as its page mounts it (#790): copying a
 * link, the reset, the spreadsheet and the printed report. Links arriving
 * and what is kept for the language switch are in
 * InvestOrPayOffParts.page.share.dom.test.tsx.
 *
 * Throughout: the address is never written, a link carries state after the
 * `#` only, and analytics get fixed event names and choices, never a typed
 * amount, rate or the encoded state (CLAUDE.md, "Free Tools Keep Inputs Out
 * of URLs").
 */
import {
  island, fill, events, eventNames, shared, copied, prompted, printed, downloads, clock, turn, arriveWith, clipboard, mount, all, text, one, boxes,
  type, typeAndSettle, currencySelect, countrySelect, chooseCurrency, pick, more, shareButton, xlsxButton, pdfButton, resetButton, ariaDisabled,
  headline, fileText, sentText, addressUntouched,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { isoDate } from '../utils/shared/exportFile.ts';
import { compare, compareRange, wordedResult, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS, decodeState } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

const ADDRESS = 'https://nidhi.today/free/';
const SHARE = `${ADDRESS}?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=invest_or_pay_off`;
/** A link's state: dollars, a small debt, the optimistic return, compared on the day it is paid. */
const LINK = 'c=USD&b=1000&r=5&p=300&x=150&i=3&s=o&h=p';
const money = (code: string, amountLocale: string | null = null) => (v: number) => formatAmount(v, code, false, amountLocale).replace(/^-/, '−');
const linesFor = (inputs: Inputs, code: string, todayAt: 'month' | 'end' = 'month') => resultLines(compare(inputs), island, 'en', money(code), todayAt);
const label = () => one('[data-attr="free-invest-or-pay-off-share"] .tool-swapLabel > span').textContent;
/** Nothing typed, and no state, reached analytics, and the address was not written. */
const nothingTypedSent = (...typed: string[]) => {
  const sent = sentText();
  for (const v of typed) assert.ok(!sent.includes(v), `analytics carried ${v}`);
  for (const [, props] of events) {
    for (const value of Object.values(props ?? {})) assert.ok(value === null || !String(value).includes('='), 'analytics carried the state');
  }
};

describe('the invest or pay off calculator: copying, starting again and saving', () => {
  it('copies a link with the state after the #, the label saying so for a moment, and sends only that a link was copied', async () => {
    clipboard();
    window.history.replaceState(null, '', '/free/?utm_source=elsewhere#old');
    mount();
    // untouched: a link with no state
    fireEvent.click(shareButton());
    await turn();
    assert.deepEqual(copied, [SHARE]);
    assert.equal(label(), island.actions.copied);
    clock.pass(2499);
    assert.equal(label(), island.actions.copied);
    clock.pass(1);
    assert.equal(label(), island.actions.copy);
    window.history.replaceState(null, '', '/free/');
    // typed: the state after the #, never in the query
    typeAndSettle('balance', '4321');
    fireEvent.click(shareButton());
    await turn();
    assert.equal(copied[1], `${SHARE}#${shared()}`);
    assert.equal(decodeState(new URL(copied[1]).hash)?.balance, 4321);
    assert.deepEqual(events.filter(([name]) => name === 'free_invest_or_pay_off_share_copied'), [['free_invest_or_pay_off_share_copied', undefined], ['free_invest_or_pay_off_share_copied', undefined]]);
    // while a figure is settling, nothing is copied or sent
    type('balance', '4322');
    fireEvent.click(shareButton());
    await turn();
    assert.equal(copied.length, 2);
    assert.equal(eventNames().filter((n) => n === 'free_invest_or_pay_off_share_copied').length, 2);
    nothingTypedSent('4321', '4322');
    assert.ok(addressUntouched());
  });

  it('offers the link to copy by hand when the clipboard refuses, and copies nothing where there is none', async () => {
    clipboard(false);
    arriveWith(LINK);
    const view = mount();
    fireEvent.click(shareButton());
    await turn();
    assert.deepEqual(prompted, [[island.actions.copyPrompt, `${SHARE}#${LINK}`]]);
    assert.equal(label(), island.actions.copy);
    assert.equal(eventNames().at(-1), 'free_invest_or_pay_off_share_copied');
    view.unmount();
    // No clipboard at all: still counted, nothing thrown.
    delete (navigator as unknown as Record<string, unknown>).clipboard;
    events.length = 0;
    arriveWith(undefined);
    mount();
    fireEvent.click(shareButton());
    await turn();
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated', 'free_invest_or_pay_off_share_copied']);
    assert.equal(prompted.length, 1);
  });

  it('starts again from the example at once, folds "Taxes and fees" and says it was reset', () => {
    arriveWith(`${LINK}&l=10`);
    mount();
    assert.equal(more().open, true);
    type('extra', '99');
    fireEvent.click(resetButton());
    assert.deepEqual([boxes.balance().value, boxes.debtRate().value, boxes.payment().value, boxes.extra().value, boxes.inflation().value, boxes.relief().value], ['18000', '6.5', '400', '200', '', '0']);
    assert.equal(currencySelect().value, 'EUR');
    assert.equal(countrySelect().value, 'EMU');
    assert.equal(more().open, false);
    // the example's comparison, with nothing waiting
    assert.equal(headline(), linesFor({ ...DEFAULTS, inflation: 2 } as Inputs, 'EUR')[1]);
    assert.equal(ariaDisabled(shareButton()), false);
    assert.equal(one('.iop-example').textContent, island.example);
    assert.equal(shared(), '');
    assert.equal(eventNames().at(-1), 'free_invest_or_pay_off_reset');
    assert.deepEqual(events.at(-1), ['free_invest_or_pay_off_reset', undefined]);
    nothingTypedSent('99');
  });

  it('saves a spreadsheet of what is shown, named by the date, with the page\'s address and the inflation\'s source', async () => {
    window.history.replaceState(null, '', '/free/?utm_source=share#b=1');
    mount();
    fireEvent.click(xlsxButton());
    assert.deepEqual(events.at(-1), ['free_invest_or_pay_off_exported', { format: 'xlsx' }]);
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].name, `nidhi-invest-or-pay-off-${isoDate()}.xlsx`);
    const xml = await fileText(downloads[0].blob);
    assert.ok(xml.includes(`>${ADDRESS}<`), 'the page, without its query or #');
    assert.ok(!xml.includes('utm_source'));
    assert.ok(xml.includes(`>${isoDate()}<`));
    assert.ok(xml.includes(fill(island.country.average, { country: 'Euro area', first: 2016, last: 2025, avg: '2%' })));
    // Every digit, to the cent.
    const exact = compare({ ...DEFAULTS, inflation: 2 } as Inputs);
    assert.ok(xml.includes(`<v>${Number(exact.diff.p50.toFixed(2))}</v>`));
    // the sentences as the page says them
    for (const line of linesFor({ ...DEFAULTS, inflation: 2 } as Inputs, 'EUR')) assert.ok(xml.includes(line.replace(/'/g, '&apos;')) || xml.includes(line), line);
    window.history.replaceState(null, '', '/free/');
    // A typed figure is said to be typed; yen have no decimals.
    typeAndSettle('inflation', '2');
    chooseCurrency('JPY');
    clock.pass(250);
    fireEvent.click(xlsxButton());
    const yen = await fileText(downloads[1].blob);
    assert.ok(yen.includes(`>${island.export.inflationTyped}<`));
    assert.ok(!yen.includes('(World Bank)'));
    assert.ok(yen.includes(`<v>${Number(exact.diff.p50.toFixed(0))}</v>`));
    assert.ok(!yen.includes(`<v>${Number(exact.diff.p50.toFixed(2))}</v>`));
    assert.ok(!sentText().includes('2016'));
  });

  it('prints the report the page shows, rounded as the page rounds, with the range beside your own return', () => {
    mount({ amountLocale: 'es' });
    pick('returns', 'own');
    type('ownReturn', '20');
    pick('horizon', 'payoff');
    typeAndSettle('balance', '1000');
    fireEvent.click(radioEnd());
    clock.pass(250);
    fireEvent.click(pdfButton());
    assert.deepEqual(events.at(-1), ['free_invest_or_pay_off_exported', { format: 'pdf' }]);
    assert.equal(printed.length, 1);
    const inputs = { ...DEFAULTS, inflation: 2, returns: 'own', ownReturn: 20, horizon: 'payoff', balance: 1000 } as Inputs;
    const exact = compare(inputs);
    const lines = resultLines(exact, island, 'en', money('EUR', 'es'), 'end');
    const report = one('.tool-report');
    assert.deepEqual(text('.tool-report .tool-reportBlock:first-of-type p').slice(0, 4), lines);
    assert.equal(report.querySelector('.tool-reportTitle')?.textContent, island.formLabel);
    // amounts in the report's tables are the page's rounding, written the Spanish way
    const cells = text('.tool-report td');
    const worded = wordedResult(exact);
    const es = (v: number) => new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(v);
    assert.ok(cells.includes(es(worded.a.p50)), `${es(worded.a.p50)} in ${cells.join(' | ')}`);
    assert.ok(!cells.includes(es(exact.a.p50)) || worded.a.p50 === exact.a.p50);
    const range = compareRange(inputs);
    assert.ok(cells.includes(es(wordedResult(range.cautious).diff.p50)));
    assert.ok(cells.includes(es(wordedResult(range.optimistic).diff.p50)));
    assert.ok(text('.tool-report caption, .tool-report th').some((c) => c === island.results.side.figure));
    // Held back with the results while a box is wrong.
    type('balance', 'x');
    assert.equal(all('.tool-report').length, 0);
    nothingTypedSent('1000');
  });
});

function radioEnd() {
  return all('input[type="radio"][value="end"]')[0] as HTMLInputElement;
}
