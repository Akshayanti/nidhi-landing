/**
 * Amounts: every amount in a tool's results is drawn as one unit (`.amt`)
 * carrying its length, so the page can keep it whole on one line and, where
 * it is wider than its line, draw that one amount smaller. Amounts that are
 * compared share the longest length, so none is drawn larger than another.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import { amountLength } from '../utils/shared/amountUnits.ts';
import { Amount, Amounts, SharedAmounts } from './Amounts.tsx';

afterEach(cleanup);

const MINUS = String.fromCodePoint(0x2212);
const units = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('span.amt')];
const lengthOf = (el: HTMLElement) => Number(el.style.getPropertyValue('--amt-len'));

describe('Amount', () => {
  it('draws one amount as one unit that carries its own length', () => {
    const text = `${MINUS}€1,520`;
    const { container } = render(<Amount>{text}</Amount>);
    const [unit, ...rest] = units(container);
    assert.equal(rest.length, 0);
    assert.equal(unit.textContent, text);
    assert.equal(unit.childNodes.length, 1, 'sign, currency and digits are one text node');
    assert.equal(lengthOf(unit), amountLength(text));
    assert.ok(lengthOf(unit) > 0);
  });

  it('takes the longest length of its comparison, never a shorter one', () => {
    const own = amountLength('€1,520');
    assert.equal(lengthOf(units(render(<Amount shared={own + 4}>€1,520</Amount>).container)[0]), own + 4);
    cleanup();
    assert.equal(lengthOf(units(render(<Amount shared={1}>€1,520</Amount>).container)[0]), own);
    cleanup();
    assert.equal(lengthOf(units(render(<SharedAmounts length={own + 6}><Amount>€1,520</Amount></SharedAmounts>).container)[0]), own + 6);
    cleanup();
    assert.equal(lengthOf(units(render(<SharedAmounts length={1}><Amount>€1,520</Amount></SharedAmounts>).container)[0]), own);
    cleanup();
    assert.equal(lengthOf(units(render(<SharedAmounts length={own + 6}><Amount shared={own + 9}>€1,520</Amount></SharedAmounts>).container)[0]), own + 9);
  });
});

describe('Amounts', () => {
  it('keeps each amount in a line whole and leaves the words as they are', () => {
    const line = 'Between €9,900 and €17,010,000 a year';
    const { container } = render(<p><Amounts>{line}</Amounts></p>);
    const p = container.querySelector('p')!;
    assert.equal(p.textContent, line, 'the line reads as it was written');
    const found = units(container);
    assert.deepEqual(found.map((u) => u.textContent), ['€9,900', '€17,010,000']);
    assert.deepEqual(found.map(lengthOf), [amountLength('€9,900'), amountLength('€17,010,000')]);
    for (const u of found) assert.equal(u.childNodes.length, 1);
    // The words are plain text beside the units, not units themselves.
    assert.deepEqual([...p.childNodes].map((n) => n.nodeType === 3 ? n.textContent : null), ['Between ', null, ' and ', null, ' a year']);
  });

  it('draws a line with no amount as plain text', () => {
    const { container } = render(<p><Amounts>Nothing to show yet</Amounts></p>);
    assert.equal(units(container).length, 0);
    assert.equal(container.textContent, 'Nothing to show yet');
  });

  it('gives the amounts of a comparison the longest length among them', () => {
    const short = amountLength('€9');
    const long = amountLength('€17,010,000');
    assert.deepEqual(units(render(<Amounts shared={long}>From €9 to €17,010,000</Amounts>).container).map(lengthOf), [long, long]);
    cleanup();
    assert.deepEqual(units(render(<Amounts shared={1}>From €9 to €17,010,000</Amounts>).container).map(lengthOf), [short, long]);
    cleanup();
    assert.deepEqual(units(render(<SharedAmounts length={long + 2}><Amounts>From €9 to €17,010,000</Amounts></SharedAmounts>).container).map(lengthOf), [long + 2, long + 2]);
    cleanup();
    assert.deepEqual(units(render(<SharedAmounts length={1}><Amounts>From €9 to €17,010,000</Amounts></SharedAmounts>).container).map(lengthOf), [short, long]);
    cleanup();
    assert.deepEqual(units(render(<SharedAmounts length={2}><Amounts shared={long + 5}>From €9 to €17,010,000</Amounts></SharedAmounts>).container).map(lengthOf), [long + 5, long + 5]);
  });
});
