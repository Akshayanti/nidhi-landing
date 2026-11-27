/**
 * The invest or pay off calculator as its page mounts it (#790): the
 * inflation figure typed or the country's, and the reader's own return and
 * its notes. "Taxes and fees", amounts and today's money are in
 * InvestOrPayOffParts.page.more.dom.test.tsx; the page's parts, typing and
 * wrong boxes in InvestOrPayOffParts.page.dom.test.tsx.
 *
 * Throughout: the address is never written while typing, and analytics get
 * fixed event names, never a typed amount, rate or the encoded state
 * (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 */
import {
  island, t, fill, events, eventNames, asked, clock, mount, all, text, one, none, has, boxes, type, typeAndSettle, currencySelect, countrySelect,
  chooseCountry, radio, pick, shareButton, xlsxButton, ariaDisabled, headline, resultNotes, withheld, said, countryNote, returnNoteText, sentText,
  addressUntouched,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { compare, toReal, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

const f = island.fields;
const r = island.results;
const fieldError = (message: string) => fill(t.export.fieldError, { message });
const minus = (s: string) => s.replace(/^-/, '−');
const money = (code = 'EUR', amountLocale: string | null = null) => (v: number) => minus(formatAmount(v, code, false, amountLocale));
/** The page's sentences for a state, worked out here: the Euro area's 2% unless another inflation is given. */
const linesFor = (s: Partial<Inputs> & { currency?: string } = {}, locale = 'en') => {
  const { currency = 'EUR', ...rest } = s;
  const inputs: Inputs = { ...DEFAULTS, inflation: 2, ...rest } as Inputs;
  return resultLines(compare(inputs), island, locale, money(currency), 'month');
};
/** A rate as the page writes it: below zero with the true minus, not a hyphen (#884). */
const pctText = (v: number, digits = 1) => new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v / 100).replace('-', '−');
/** Nothing typed reached analytics. */
const nothingTypedSent = (...typed: string[]) => {
  const sent = sentText();
  for (const v of typed) assert.ok(!sent.includes(v), `analytics carried ${v}`);
  for (const [, props] of events) {
    for (const value of Object.values(props ?? {})) assert.ok(value === null || !String(value).includes('='), 'analytics carried the state');
  }
  assert.ok(addressUntouched(), 'the address was written');
};

describe('the invest or pay off calculator: the inflation figure and your own return', () => {
  it('asks for an inflation figure where there is none, and uses a typed one before the country\'s', () => {
    mount({ defaultCountry: '', initialHistory: null });
    {
      // no country and no figure: no comparison, and nothing sent
      assert.equal(countrySelect().value, '');
      assert.deepEqual(resultNotes(), [island.country.needed]);
      assert.equal(headline(), null);
      assert.deepEqual(countryNote(), []);
      assert.equal(boxes.inflation().placeholder, '');
      assert.equal(ariaDisabled(shareButton()), false);
      assert.equal(ariaDisabled(xlsxButton()), true);
      assert.ok(text('.tool-exportNote').includes(t.export.notReady));
      assert.equal(has('.tool-report'), false);
      assert.deepEqual(events, []);
      assert.deepEqual(asked, []);
    }
    typeAndSettle('inflation', '2');
    assert.equal(headline(), linesFor()[1]);
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated']);
    typeAndSettle('inflation', '0');
    assert.equal(headline(), linesFor({ inflation: 0 })[1]);
    assert.notEqual(linesFor({ inflation: 0 })[1], linesFor()[1]);
    clock.pass(600);
    // emptied: asked for again, and said
    typeAndSettle('inflation', ' ');
    assert.deepEqual(resultNotes(), [island.country.needed]);
    clock.pass(600);
    assert.equal(said(), island.country.needed);
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated']);
    nothingTypedSent();
  });

  it('takes a typed inflation over the Euro area\'s, and goes back to it with one click', () => {
    mount();
    typeAndSettle('inflation', '0');
    assert.equal(headline(), linesFor({ inflation: 0 })[1]);
    assert.equal(boxes.inflation().placeholder, '');
    const back = one('.iop-countryNote .iop-linkBtn') as HTMLButtonElement;
    assert.deepEqual([back.type, back.className, back.textContent], ['button', 'iop-linkBtn', f.useCountry]);
    assert.equal(back.parentElement?.className, 'ifc-hint');
    assert.ok(countryNote()[0].endsWith(` ${f.useCountry}`));
    fireEvent.click(back);
    assert.equal(boxes.inflation().value, '');
    assert.equal(boxes.inflation().placeholder, '2');
    none('.iop-linkBtn');
    // A space is no figure either: the country's is offered, with nothing to go back to.
    type('inflation', ' ');
    assert.equal(boxes.inflation().placeholder, '2');
    none('.iop-linkBtn');
    type('inflation', '');
    clock.pass(250);
    assert.equal(headline(), linesFor()[1]);
    // A country of none keeps the currency and empties the box.
    typeAndSettle('inflation', '3');
    chooseCountry('');
    assert.equal(boxes.inflation().value, '');
    assert.equal(currencySelect().value, 'EUR');
    clock.pass(250);
    assert.deepEqual(resultNotes(), [island.country.needed]);
    // Back to the Euro area: its figure again, in euros, with nothing fetched.
    fireEvent.change(currencySelect(), { target: { value: 'USD' } });
    chooseCountry('EMU');
    assert.equal(currencySelect().value, 'EUR');
    clock.pass(250);
    assert.equal(headline(), linesFor()[1]);
    assert.deepEqual(asked, []);
  });

  it('asks for your own return when it is the choice, and says what it comes to after inflation', () => {
    // A catalog whose own-figure line has a place for a rate: the page leaves it empty.
    mount({ strings: { ...island, returns: { ...island.returns, own: { ...island.returns.own, desc: 'Own figure [{rate}]' } } } });
    const ownDesc = () => all('.iop-choices:not(.iop-choices--date) .ifc-hint').pop()?.textContent;
    assert.equal(ownDesc(), 'Own figure []');
    pick('returns', 'own');
    assert.equal(radio('returns', 'own').checked, true);
    assert.equal(radio('returns', 'historical').checked, false);
    const own = boxes.ownReturn();
    {
      // the box, described by its hint and the note on swings
      assert.equal(own.value, '7');
      assert.equal(own.inputMode, 'text');
      assert.equal(own.parentElement?.querySelector('.ifc-unit')?.textContent, '%');
      const swings = one('p.ifc-hint[id$="-ownSwings"]');
      assert.equal(swings.textContent, island.returns.ownSwings);
      assert.equal(own.getAttribute('aria-describedby'), `${own.id}-hint ${swings.id}`);
      assert.equal(swings.id, own.id.replace(/ownReturn$/, 'ownSwings'));
      assert.equal(one('.iop-returnNote').getAttribute('aria-live'), 'polite');
    }
    // 7% with the Euro area's 2% is 4.9% after inflation, inside the range.
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: pctText(toReal(7, 2)) })]);
    assert.equal(one('.iop-returnNote p').className, 'ifc-hint');
    // A space in the inflation box is no figure: the Euro area's is used still.
    type('inflation', ' ');
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: pctText(toReal(7, 2)) })]);
    type('inflation', '');
    clock.pass(250);
    assert.equal(headline(), linesFor({ returns: 'own' })[1]);
    assert.equal(has('.iop-side'), false);
    // Above the optimistic setting: said, and the cautious and optimistic settings shown beside it.
    type('ownReturn', '20');
    assert.deepEqual(returnNoteText(), [fill(island.returns.above, { real: pctText(toReal(20, 2)), historical: '5.3%', top: 6 })]);
    assert.equal(one('.iop-returnNote p').className, 'iop-note');
    clock.pass(250);
    assert.equal(one('.iop-side h3').textContent, r.side.heading);
    assert.ok(text('.iop-side th').includes(fill(r.side.yours, { rate: pctText(toReal(20, 2)) })));
    // Below zero: said.
    type('ownReturn', '1');
    assert.deepEqual(returnNoteText(), [fill(island.returns.below, { real: pctText(toReal(1, 2)) })]);
    assert.equal(one('.iop-returnNote p').className, 'iop-note');
    // A return a hair under inflation is written as 0%, and a figure of 0% is not said to lose
    // buying power (#888): 3% with 3.03% inflation is -0.03% after inflation.
    type('inflation', '3.03');
    type('ownReturn', '3');
    assert.ok(toReal(3, 3.03) < -0.02);
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: '0%' })]);
    assert.equal(one('.iop-returnNote p').className, 'ifc-hint');
    // The first figure written below zero is said as a loss: 3% with 3.11% is -0.1%.
    type('inflation', '3.11');
    assert.deepEqual(returnNoteText(), [fill(island.returns.below, { real: `${String.fromCodePoint(0x2212)}0.1%` })]);
    assert.equal(one('.iop-returnNote p').className, 'iop-note');
    // At the edges, with no inflation: exactly the top of the range, and exactly nothing, are inside it.
    type('inflation', '0');
    type('ownReturn', '6');
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: '6%' })]);
    // 6.04% is written "6%": no note saying it is above 6%, and no table for a gap the figure does not show (#888).
    type('ownReturn', '6.04');
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: '6%' })]);
    assert.equal(one('.iop-returnNote p').className, 'ifc-hint');
    clock.pass(250);
    assert.equal(has('.iop-side'), false);
    // 6.06% is written "6.1%": the note and the table are both there.
    type('ownReturn', '6.06');
    assert.deepEqual(returnNoteText(), [fill(island.returns.above, { real: '6.1%', historical: '5.3%', top: 6 })]);
    clock.pass(250);
    assert.equal(has('.iop-side'), true);
    type('ownReturn', '0');
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: '0%' })]);
    // A figure that cannot be read: marked, and no note.
    type('ownReturn', '6x');
    assert.deepEqual(returnNoteText(), []);
    assert.equal(own.getAttribute('aria-invalid'), 'true');
    assert.equal(withheld(), true);
    assert.equal(own.closest('.ifc-field')?.querySelector('.ifc-error')?.textContent, fieldError(fill(f.percentError, { min: '-99.99', max: '10,000' })));
    // Another choice: the box goes, and its mistake with it.
    pick('returns', 'cautious');
    assert.equal(all('input[id$="-ownReturn"]').length, 0);
    none('.iop-returnNote');
    assert.equal(withheld(), true, 'held until the corrected comparison is there');
    clock.pass(250);
    assert.equal(withheld(), false);
    assert.equal(headline(), linesFor({ returns: 'cautious', inflation: 0, ownReturn: 0 })[1]);
    nothingTypedSent('20', '6x');
  });

  it('works an own return out against the country\'s figure until one is typed, and with none says nothing', () => {
    mount({ defaultCountry: '', initialHistory: null });
    pick('returns', 'own');
    assert.deepEqual(returnNoteText(), []);
    type('inflation', '2');
    assert.deepEqual(returnNoteText(), [fill(island.returns.realIs, { real: pctText(toReal(7, 2)) })]);
    // A comparison of your own return is told with the side table only when it is above the range.
    clock.pass(250);
    assert.equal(has('.iop-side'), false);
  });
});
