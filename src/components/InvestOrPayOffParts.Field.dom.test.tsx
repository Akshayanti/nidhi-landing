/**
 * One box of the invest or pay off form (#790): its label, what describes
 * it to a screen reader, its unit, and its error, which names a link's
 * unreadable value as such.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { draw, events, none, one, t } from '../../test/investOrPayOffParts.results.tsx';
import { Field } from './InvestOrPayOff.tsx';

const box = () => screen.getByLabelText('Debt balance') as HTMLInputElement;
const field = (over: Partial<Parameters<typeof Field>[0]> = {}) => (
  <Field id="iop-balance" label="Debt balance" value="18000" onChange={() => {}} error={null} inputMode="decimal" {...over} />
);

describe('a box of the form', () => {
  it('a plain box: labelled, typed as text, nothing describing it, no unit and no error', () => {
    draw(field());
    const input = box();
    assert.equal(input.id, 'iop-balance');
    assert.equal(input.type, 'text');
    assert.equal(input.getAttribute('inputmode'), 'decimal');
    assert.equal(input.getAttribute('autocomplete'), 'off');
    assert.equal(input.value, '18000');
    assert.equal(input.hasAttribute('placeholder'), false);
    assert.equal(input.hasAttribute('aria-invalid'), false);
    assert.equal(input.hasAttribute('aria-errormessage'), false);
    assert.equal(input.hasAttribute('aria-describedby'), false);
    assert.equal(one('.ifc-inputWrap').className, 'ifc-inputWrap');
    none('.ifc-unit');
    none('.ifc-error');
    none('.ifc-hint');
    assert.equal(one('.ifc-fieldNote').textContent, '');
  });

  it('a hint, a unit and a placeholder', () => {
    draw(field({ hint: 'What you owe today', unit: '%', placeholder: '2.1', inputMode: 'numeric' }));
    const input = box();
    assert.equal(input.getAttribute('inputmode'), 'numeric');
    assert.equal(input.placeholder, '2.1');
    assert.equal(input.getAttribute('aria-describedby'), 'iop-balance-hint');
    assert.equal(one('#iop-balance-hint').textContent, 'What you owe today');
    assert.equal(one('#iop-balance-hint').className, 'ifc-hint');
    assert.equal(one('.ifc-inputWrap').className, 'ifc-inputWrap ifc-inputWrap--unit');
    assert.equal(one('.ifc-unit').textContent, '%');
    assert.equal(one('.ifc-unit').getAttribute('aria-hidden'), 'true');
  });

  it('an error comes first among what describes the box, then the hint, then the text elsewhere', () => {
    draw(field({ error: 'Enter an amount.', hint: 'What you owe today', alsoDescribedBy: 'iop-note' }));
    const input = box();
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(input.hasAttribute('aria-errormessage'), false, 'named once, through aria-describedby (#899)');
    assert.equal(input.getAttribute('aria-describedby'), 'iop-balance-error iop-balance-hint iop-note');
    const error = one('#iop-balance-error');
    assert.equal(error.className, 'ifc-error');
    assert.equal(error.textContent, t.export.fieldError.replace('{message}', 'Enter an amount.'));
  });

  it('only the text elsewhere, when there is no hint or error', () => {
    draw(field({ alsoDescribedBy: 'iop-note' }));
    assert.equal(box().getAttribute('aria-describedby'), 'iop-note');
  });

  it('an error without a hint', () => {
    draw(field({ error: 'Enter an amount.' }));
    assert.equal(box().getAttribute('aria-describedby'), 'iop-balance-error');
    none('.ifc-hint');
  });

  it('a box holding only the mark of an unreadable value says so, rather than the usual error', () => {
    draw(field({ value: ' ? ', error: 'Enter an amount.' }));
    assert.equal(one('#iop-balance-error').textContent, t.export.fieldError.replace('{message}', t.export.fieldUnreadable));
  });

  it('a mark among other text is an ordinary error', () => {
    draw(field({ value: '1?', error: 'Enter an amount.' }));
    assert.equal(one('#iop-balance-error').textContent, t.export.fieldError.replace('{message}', 'Enter an amount.'));
  });

  it('the mark is selected when the box is entered, so typing replaces it', () => {
    draw(field({ value: '?', error: 'Enter an amount.' }));
    const input = box();
    fireEvent.focus(input);
    assert.equal(input.selectionStart, 0);
    assert.equal(input.selectionEnd, 1);
  });

  it('what is typed goes to the page, and no analytics carry it', () => {
    const typed: string[] = [];
    draw(field({ onChange: (e) => typed.push(e.target.value) }));
    fireEvent.change(box(), { target: { value: '987654' } });
    assert.deepEqual(typed, ['987654']);
    assert.ok(!JSON.stringify(events).includes('987654'));
  });
});
