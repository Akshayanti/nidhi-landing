/**
 * The Monte Carlo simulator's number box (#790): its label, hint and error,
 * what a screen reader is told describes it, and when it says a value could
 * not be read instead of naming the range.
 */
import { draw, none, t } from '../../test/monteCarloParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberField } from './MonteCarloSimulator.tsx';

const RANGE = 'Enter an amount from 0 to 10.';
const box = () => screen.getByLabelText('Amount') as HTMLInputElement;
const describedBy = () => (box().getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);

/** The box as the form holds it: the value kept by the form, wrong when the form says so. */
function Held(props: { start: string; invalid: (value: string) => boolean; seen?: string[]; hint?: string; error?: string | null; step?: string }) {
  const [value, setValue] = useState(props.start);
  return (
    <NumberField
      id="f"
      label="Amount"
      value={value}
      onChange={(v) => { props.seen?.push(v); setValue(v); }}
      invalid={props.invalid(value)}
      error={props.error === null ? undefined : props.error ?? RANGE}
      hint={props.hint}
      step={props.step}
    />
  );
}

describe('a number box', () => {
  it('shows its value under its label, with its hint, and hands on what is typed as a plain number', async () => {
    const seen: string[] = [];
    draw(<Held start="2.5" invalid={() => false} seen={seen} hint="Today's money" />, { numberLocale: 'es' });
    assert.equal(box().value, '2,5');
    assert.equal(box().className, 'mcs-input');
    assert.equal(box().closest('.mcs-field')?.querySelector('label')?.className, 'mcs-label');
    assert.equal(box().getAttribute('inputmode'), 'decimal');
    assert.equal(box().getAttribute('autocomplete'), 'off');
    assert.equal(box().getAttribute('aria-invalid'), null);
    assert.equal(box().getAttribute('aria-describedby'), 'f-hint');
    assert.deepEqual(describedBy(), ["Today's money"]);
    assert.equal(document.getElementById('f-hint')?.className, 'mcs-hint');
    none('.ifc-error');
    const user = userEvent.setup({ delay: null });
    await user.clear(box());
    await user.type(box(), '1.000,5');
    assert.equal(seen.at(-1), '1000.5');
  });

  it('a box for whole numbers asks a phone for the digits only', () => {
    draw(<Held start="30" invalid={() => false} step="1" />);
    assert.equal(box().getAttribute('inputmode'), 'numeric');
  });

  it('a box with no hint that is not wrong is described by nothing', () => {
    draw(<Held start="5" invalid={() => false} />);
    assert.equal(box().hasAttribute('aria-describedby'), false);
    assert.equal(box().hasAttribute('aria-invalid'), false);
    none('.mcs-hint');
    none('.ifc-error');
  });

  it('a wrong box says what to type, before its hint', () => {
    draw(<Held start="50" invalid={() => true} hint="0 to 10" />);
    assert.equal(box().getAttribute('aria-invalid'), 'true');
    assert.equal(box().getAttribute('aria-describedby'), 'f-error f-hint');
    assert.deepEqual(describedBy(), [`Error: ${RANGE}`, '0 to 10']);
    assert.equal(document.getElementById('f-error')?.className, 'ifc-error');
  });

  it('a wrong box with no hint is described by its error alone', () => {
    draw(<Held start="50" invalid={() => true} />);
    assert.equal(box().getAttribute('aria-describedby'), 'f-error');
    assert.deepEqual(describedBy(), [`Error: ${RANGE}`]);
  });

  it('a wrong box with no words for it is marked, and described by its hint alone', () => {
    draw(<Held start="50" invalid={() => true} error={null} hint="0 to 10" />);
    assert.equal(box().getAttribute('aria-invalid'), 'true');
    assert.equal(box().getAttribute('aria-describedby'), 'f-hint');
    none('.ifc-error');
  });

  it('a box that is right shows no error, even with words for one', () => {
    draw(<Held start="5" invalid={() => false} hint="0 to 10" />);
    none('.ifc-error');
    assert.equal(box().getAttribute('aria-describedby'), 'f-hint');
  });

  it('a value that arrived unreadable says so, until something is typed: then it names the range', async () => {
    draw(<Held start="NaN" invalid={(v) => v === 'NaN' || Number(v) > 10} />);
    assert.deepEqual(describedBy(), [`Error: ${t.export.fieldUnreadable}`]);
    const user = userEvent.setup({ delay: null });
    // Letters typed here are not a number either, but they did not arrive: the range is what helps.
    await user.type(box(), 'x');
    assert.deepEqual(describedBy(), [`Error: ${RANGE}`]);
  });

  it('a number out of range that arrived names the range', () => {
    draw(<Held start="50" invalid={() => true} />);
    assert.deepEqual(describedBy(), [`Error: ${RANGE}`]);
  });

  it('a value too long for a link is said to be unreadable, typed or not', async () => {
    draw(<Held start={'9'.repeat(201)} invalid={() => true} />);
    assert.deepEqual(describedBy(), [`Error: ${t.export.fieldUnreadable}`]);
    const user = userEvent.setup({ delay: null });
    await user.type(box(), '9');
    assert.deepEqual(describedBy(), [`Error: ${t.export.fieldUnreadable}`]);
  });
});
