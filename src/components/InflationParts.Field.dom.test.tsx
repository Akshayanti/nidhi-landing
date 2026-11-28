/**
 * The inflation calculator's text box (#790): `Field` ties a box to its
 * label, its hint and its error, says an error to a screen reader with the
 * "Error:" lead-in, says a box that arrived unreadable could not be read, and
 * shows a unit beside the box without reading it out.
 */
import { t, draw, clear, one, none } from '../../test/inflationParts.components.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { Field } from './InflationCalculator.tsx';

const box = () => screen.getByRole('textbox') as HTMLInputElement;
const attr = (name: string) => box().getAttribute(name);

describe('a box of the inflation calculator', () => {
  it('a plain box has its label and nothing to describe it', () => {
    draw(<Field id="amt" label="Amount" value="10,000" onChange={() => {}} error={null} inputMode="decimal" />);
    assert.ok(screen.getByLabelText('Amount') === box());
    assert.equal(one('label').className, 'ifc-label');
    assert.equal(one('.ifc-field label').getAttribute('for'), 'amt');
    assert.equal(box().id, 'amt');
    assert.equal(box().value, '10,000');
    assert.equal(box().className, 'ifc-input');
    assert.equal(attr('type'), 'text');
    assert.equal(attr('inputmode'), 'decimal');
    assert.equal(attr('autocomplete'), 'off');
    assert.equal(box().hasAttribute('step'), false);
    assert.equal(box().hasAttribute('aria-invalid'), false);
    assert.equal(box().hasAttribute('aria-errormessage'), false);
    assert.equal(box().hasAttribute('aria-describedby'), false);
    assert.equal(box().parentElement?.className, 'ifc-inputWrap');
    none('.ifc-unit');
    none('.ifc-error');
    none('.ifc-hint');
    assert.equal(one('.ifc-fieldNote').textContent, '');
  });

  it('a hint describes the box, and a unit is shown beside it without being read out', () => {
    draw(<Field id="rate" label="Rate" value="3" onChange={() => {}} hint="0 to 10,000" error={null} inputMode="numeric" unit="%" />);
    assert.equal(attr('aria-describedby'), 'rate-hint');
    assert.equal(one('.ifc-hint').id, 'rate-hint');
    assert.equal(one('.ifc-hint').textContent, '0 to 10,000');
    assert.equal(attr('inputmode'), 'numeric');
    assert.equal(box().parentElement?.className, 'ifc-inputWrap ifc-inputWrap--unit');
    assert.equal(one('.ifc-unit').textContent, '%');
    assert.equal(one('.ifc-unit').getAttribute('aria-hidden'), 'true');
    assert.equal(box().hasAttribute('aria-invalid'), false);
    assert.equal(box().hasAttribute('aria-errormessage'), false);
    none('.ifc-error');
  });

  it('an error marks the box, is said with its lead-in, and comes before the hint', () => {
    draw(<Field id="yrs" label="Years" value="0" onChange={() => {}} hint="1 to 100" error="Enter 1 to 100." inputMode="numeric" />);
    assert.equal(attr('aria-invalid'), 'true');
    // Named once, through aria-describedby (#899).
    assert.equal(box().hasAttribute('aria-errormessage'), false);
    assert.equal(attr('aria-describedby'), 'yrs-error yrs-hint');
    assert.equal(one('.ifc-error').id, 'yrs-error');
    assert.equal(one('.ifc-error').textContent, 'Error: Enter 1 to 100.');
    assert.equal(t.export.fieldError, 'Error: {message}');
    assert.equal(one('.ifc-fieldNote').textContent, 'Error: Enter 1 to 100.1 to 100');
    clear();
    // An error with no hint is the one thing that describes the box.
    draw(<Field id="yrs" label="Years" value="0" onChange={() => {}} error="Enter 1 to 100." inputMode="numeric" />);
    assert.equal(attr('aria-describedby'), 'yrs-error');
    none('.ifc-hint');
  });

  it('a box that arrived holding only the mark of an unreadable value says so, whatever spaces are around the mark', () => {
    draw(<Field id="amt" label="Amount" value=" ? " onChange={() => {}} error="Enter an amount." inputMode="decimal" />);
    assert.equal(one('.ifc-error').textContent, `Error: ${t.export.fieldUnreadable}`);
    clear();
    // Anything else typed beside the mark is an ordinary wrong value.
    draw(<Field id="amt" label="Amount" value="?1" onChange={() => {}} error="Enter an amount." inputMode="decimal" />);
    assert.equal(one('.ifc-error').textContent, 'Error: Enter an amount.');
    clear();
    // Without an error there is nothing to say, even for the mark.
    draw(<Field id="amt" label="Amount" value="?" onChange={() => {}} error={null} inputMode="decimal" />);
    none('.ifc-error');
  });

  it('is always a text box, so digits from any keyboard are taken, and what is typed is handed on', () => {
    const typed: string[] = [];
    draw(<Field id="n" label="Number" value="?" onChange={(e) => typed.push(e.target.value)} error={null} inputMode="numeric" />);
    const input = document.getElementById('n') as HTMLInputElement;
    assert.equal(input.getAttribute('type'), 'text');
    assert.equal(input.hasAttribute('step'), false);
    assert.equal(input.getAttribute('inputmode'), 'numeric');
    fireEvent.change(input, { target: { value: '१२' } });
    assert.deepEqual(typed, ['१२']);
    // A text box holding only the mark is selected when it is entered, so typing replaces it.
    fireEvent.focus(box());
    assert.deepEqual([box().selectionStart, box().selectionEnd], [0, 1]);
  });
});
