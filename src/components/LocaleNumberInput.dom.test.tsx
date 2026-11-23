/**
 * LocaleNumberInput: a box that reads numbers the way the page's language
 * writes them, hands the tool a plain number string, and never rewrites what
 * the reader is typing.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocaleNumberInput, NumberLocaleContext } from './LocaleNumberInput.tsx';

afterEach(cleanup);

const box = () => screen.getByRole('textbox') as HTMLInputElement;
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });

describe('LocaleNumberInput', () => {
  it('reads and shows numbers the English way when the page sets no locale', () => {
    const got: string[] = [];
    render(<LocaleNumberInput value="2.5" onValueChange={(v) => got.push(v)} aria-label="Rate" />);
    assert.equal(box().value, '2.5');
    assert.equal(box().type, 'text');
    assert.equal(box().getAttribute('aria-label'), 'Rate');
    type('1,000.5');
    assert.deepEqual(got, ['1000.5']);
  });

  it('reads and shows numbers the way the page writes them', () => {
    const got: string[] = [];
    render(
      <NumberLocaleContext.Provider value="es">
        <LocaleNumberInput value="2.5" onValueChange={(v) => got.push(v)} />
      </NumberLocaleContext.Provider>,
    );
    assert.equal(box().value, '2,5');
    type('10.000,5');
    assert.deepEqual(got, ['10000.5']);
    assert.equal(box().value, '10.000,5');
  });

  it('keeps a half-typed number as typed when the tool hands its value back', () => {
    function Tool() {
      const [value, setValue] = useState('1');
      return (
        <NumberLocaleContext.Provider value="es">
          <LocaleNumberInput value={value} onValueChange={setValue} />
          <output>{value}</output>
        </NumberLocaleContext.Provider>
      );
    }
    render(<Tool />);
    type('2,');
    assert.equal(screen.getByRole('status').textContent, '2');
    assert.equal(box().value, '2,');
    type('2,50');
    assert.equal(screen.getByRole('status').textContent, '2.5');
    assert.equal(box().value, '2,50');
  });

  it('shows the tool value afresh when it changes from elsewhere', () => {
    const shown: string[] = [];
    const toDisplay = (value: string, locale: string) => { shown.push(value); return `${locale}:${value}`; };
    const props = { onValueChange: () => {}, toDisplay };
    const view = render(<LocaleNumberInput value="1" {...props} />);
    assert.equal(box().value, 'en:1');
    view.rerender(<LocaleNumberInput value="7" {...props} />);
    assert.equal(box().value, 'en:7');
    // The same value again is not a change: the box is not worked out again.
    const calls = shown.length;
    view.rerender(<LocaleNumberInput value="7" {...props} />);
    assert.equal(shown.length, calls);
    assert.equal(box().value, 'en:7');
    // Typing, which the tool takes, then a reset to the value it had before.
    type('99');
    assert.equal(box().value, '99');
    view.rerender(<LocaleNumberInput value="99" {...props} />);
    assert.equal(box().value, '99', 'the typed text is not rewritten');
    view.rerender(<LocaleNumberInput value="7" {...props} />);
    assert.equal(box().value, 'en:7');
  });

  it('takes a tool own reading of what is typed', () => {
    const got: string[] = [];
    render(
      <NumberLocaleContext.Provider value="cs">
        <LocaleNumberInput value="" onValueChange={(v) => got.push(v)} toCanonical={(raw, locale) => `${locale}|${raw}`} />
      </NumberLocaleContext.Provider>,
    );
    assert.equal(box().value, '');
    type('3 x');
    assert.deepEqual(got, ['cs|3 x']);
  });

  it('selects the mark of an unreadable value on focus and on click, so typing replaces it', () => {
    render(<LocaleNumberInput value="NaN" onValueChange={() => {}} />);
    const el = box();
    assert.equal(el.value, '?');
    el.setSelectionRange(1, 1);
    fireEvent.focus(el);
    assert.deepEqual([el.selectionStart, el.selectionEnd], [0, 1]);
    el.setSelectionRange(1, 1);
    fireEvent.click(el);
    assert.deepEqual([el.selectionStart, el.selectionEnd], [0, 1]);
  });
});
