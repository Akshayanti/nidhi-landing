/**
 * One row of the net worth calculator's table (#790): what a reader types a
 * holding into. Each box is named for a screen reader by its row, typing
 * reaches the page as a change to that one field, an amount the tool cannot
 * read is marked once typing pauses or the box is left (with a fixed sentence
 * that never repeats what was typed), and the names and amounts typed reach
 * no attribute and no analytics event.
 */
import { draw, events, framed, island, own, owe, t } from '../../test/netWorthParts.results.tsx';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { CURRENCIES } from '../utils/loan/math.ts';
import type { AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { AssetRowInput } from './MultiCurrencyNetWorth.tsx';

/** Every change the row hands the page, in order. */
const patches: Array<Partial<AssetRow>> = [];
let removed = 0;

/** The row as the page holds it: each change is kept, and the row drawn again. */
function Held({ start, removable = true }: { start: AssetRow; removable?: boolean }) {
  const [row, setRow] = useState(start);
  return (
    <AssetRowInput
      row={row}
      index={1}
      total={3}
      strings={island}
      onChange={(patch) => { patches.push(patch); setRow((r) => ({ ...r, ...patch })); }}
      onRemove={removable ? () => { removed++; } : undefined}
    />
  );
}

const nameBox = () => screen.getByLabelText('Asset name (row 2 of 3)') as HTMLInputElement;
const valueBox = () => screen.getByLabelText('Value (row 2)') as HTMLInputElement;
const currencyBox = () => screen.getByLabelText('Currency (row 2)') as HTMLSelectElement;
const typeBox = () => screen.getByLabelText('Type (row 2)') as HTMLSelectElement;
/** What the amount box is described by, as a screen reader hears it, or null. */
const described = () => {
  const id = valueBox().getAttribute('aria-describedby');
  return id === null ? null : document.getElementById(id)?.textContent ?? `nothing with the id "${id}"`;
};
const marked = () => valueBox().getAttribute('aria-invalid');
const type = (box: HTMLInputElement, value: string) => fireEvent.change(box, { target: { value } });
const later = (ms: number) => act(() => { mock.timers.tick(ms); });

const READ_ERROR = t.export.fieldError.replace('{message}', island.row.valueError);
const ARRIVED_ERROR = t.export.fieldError.replace('{message}', t.export.fieldUnreadable);

beforeEach(() => {
  patches.length = 0;
  removed = 0;
  mock.timers.enable({ apis: ['setTimeout'] });
});
afterEach(() => mock.timers.reset());

describe('a row of the table', () => {
  it('names every box by its row, counting from one, and the name box by the size of the table', () => {
    draw(<Held start={own('1000', 'USD', 'Savings')} />);
    assert.equal(nameBox().value, 'Savings');
    assert.equal(valueBox().value, '1000');
    assert.equal(currencyBox().value, 'USD');
    assert.equal(typeBox().value, 'asset');
    assert.equal(screen.getByRole('button').getAttribute('aria-label'), 'Remove row 2');
    assert.equal(screen.getByRole('button').getAttribute('title'), island.row.removeTitle);
    // Every label points at its own box.
    const ids = [nameBox(), valueBox(), currencyBox(), typeBox()].map((box) => box.id);
    assert.equal(new Set(ids).size, 4);
    assert.ok(ids.every((id) => id !== ''));
  });

  it('shows the column names on narrow screens, hidden from a screen reader, which has the labels', () => {
    draw(<Held start={own('')} />);
    const shown = [...document.querySelectorAll('.mcnw-cellLabel')];
    assert.deepEqual(shown.map((el) => el.textContent), ['Name', 'Value', 'Currency', 'Type']);
    assert.ok(shown.every((el) => el.getAttribute('aria-hidden') === 'true'));
  });

  it('offers every currency the tools know, and owned or owed', () => {
    draw(<Held start={owe('')} />);
    assert.deepEqual([...currencyBox().options].map((o) => [o.value, o.textContent]), CURRENCIES.map((c) => [c.code, c.code]));
    assert.deepEqual([...typeBox().options].map((o) => [o.value, o.textContent]), [['asset', 'Asset'], ['liability', 'Liability']]);
    assert.equal(typeBox().value, 'liability');
  });

  it('suggests what to type, and keeps the browser from remembering or spell-checking it', () => {
    draw(<Held start={own('')} />);
    assert.equal(nameBox().placeholder, 'Asset/Liability Name');
    assert.equal(valueBox().placeholder, 'e.g. 50000');
    assert.equal(nameBox().getAttribute('autocomplete'), 'off');
    assert.equal(valueBox().getAttribute('autocomplete'), 'off');
    assert.equal(nameBox().getAttribute('spellcheck'), 'false');
    assert.equal(valueBox().inputMode, 'decimal');
  });

  it('hands the page each change as the one field that changed', () => {
    draw(<Held start={own('')} />);
    type(nameBox(), 'Flat');
    type(valueBox(), '250000');
    fireEvent.change(currencyBox(), { target: { value: 'JPY' } });
    fireEvent.change(typeBox(), { target: { value: 'liability' } });
    assert.deepEqual(patches, [{ name: 'Flat' }, { value: '250000' }, { currency: 'JPY' }, { type: 'liability' }]);
    assert.equal(nameBox().value, 'Flat');
    assert.equal(currencyBox().value, 'JPY');
    assert.equal(typeBox().value, 'liability');
  });

  it('an amount typed in the page’s own style reaches the page as digits', () => {
    draw(<Held start={own('')} />, { numberLocale: 'es' });
    type(valueBox(), '1.500,5');
    assert.deepEqual(patches, [{ value: '1500.5' }]);
    assert.equal(valueBox().value, '1.500,5');
  });

  it('the remove button removes the row, and a row that cannot be removed has none', () => {
    const drawn = draw(<Held start={own('5')} />);
    fireEvent.click(screen.getByRole('button'));
    assert.equal(removed, 1);
    drawn.unmount();
    draw(<Held start={own('5')} removable={false} />);
    assert.equal(screen.queryAllByRole('button').length, 0);
  });

  it('nothing typed reaches an attribute or an analytics event', () => {
    draw(<Held start={own('')} />);
    type(nameBox(), 'Zqxw cottage');
    type(valueBox(), '98765');
    fireEvent.change(currencyBox(), { target: { value: 'CZK' } });
    for (const el of document.body.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        if (attr.name === 'value') continue;
        assert.ok(!attr.value.includes('Zqxw') && !attr.value.includes('98765'), `${el.tagName} ${attr.name}`);
      }
    }
    assert.deepEqual(events, []);
  });
});

describe('an amount the tool cannot read', () => {
  it('is marked once typing pauses for 600 ms, not on the first keystroke', () => {
    draw(<Held start={own('')} />);
    type(valueBox(), '5x');
    assert.ok(marked() === null);
    assert.ok(described() === null);
    later(599);
    assert.ok(marked() === null);
    later(1);
    assert.equal(marked(), 'true');
    assert.equal(described(), READ_ERROR);
  });

  it('a pause cut short by an amount that reads leaves nothing behind for the next slip', () => {
    draw(<Held start={own('')} />);
    type(valueBox(), '5x');
    later(300);
    type(valueBox(), '5');
    later(400);
    type(valueBox(), '5y');
    assert.ok(marked() === null, 'marked before this slip’s own pause');
    later(599);
    assert.ok(marked() === null);
    later(1);
    assert.equal(marked(), 'true');
  });

  it('is marked at once when the box is left', () => {
    draw(<Held start={own('')} />);
    type(valueBox(), '5x');
    fireEvent.blur(valueBox());
    assert.equal(marked(), 'true');
    assert.equal(described(), READ_ERROR);
  });

  it('leaving a box that reads well marks nothing, then or when it is typed in again', () => {
    draw(<Held start={own('')} />);
    type(valueBox(), '5');
    fireEvent.blur(valueBox());
    assert.ok(marked() === null);
    type(valueBox(), '5x');
    assert.ok(marked() === null, 'marked before typing paused');
    later(600);
    assert.equal(marked(), 'true');
  });

  it('the mark goes as soon as the amount reads, and a pause after brings nothing back', () => {
    draw(<Held start={own('')} />);
    type(valueBox(), '5x');
    later(600);
    assert.equal(marked(), 'true');
    type(valueBox(), '5');
    assert.ok(marked() === null);
    assert.ok(described() === null);
    later(600);
    assert.ok(marked() === null);
    assert.equal(document.querySelectorAll('.mcnw-rowError').length, 0);
    // The next slip waits for its own pause, as the first did.
    type(valueBox(), '5z');
    assert.ok(marked() === null, 'marked before typing paused');
    later(600);
    assert.equal(marked(), 'true');
  });

  it('a row that arrives unreadable is marked at once, as what was typed', () => {
    draw(<Held start={own('€150')} />);
    assert.equal(marked(), 'true');
    assert.equal(described(), READ_ERROR);
  });

  it('the mark of a value that could not be carried over says to enter it again, until it is typed over', () => {
    draw(<Held start={own('NaN')} />);
    assert.equal(marked(), 'true');
    assert.equal(described(), ARRIVED_ERROR);
    type(valueBox(), 'NaN1');
    assert.equal(described(), READ_ERROR);
  });

  it('the mark arriving in a row already on screen is shown at once', () => {
    const { rerender } = draw(<AssetRowInput row={own('5')} index={0} total={1} strings={island} onChange={() => {}} />);
    assert.ok(document.querySelector('[aria-invalid]') === null);
    // The same row, so the same part: only its value changes, from outside.
    rerender(framed(<AssetRowInput row={own('NaN')} index={0} total={1} strings={island} onChange={() => {}} />));
    const box = screen.getByLabelText('Value (row 1)');
    assert.equal(box.getAttribute('aria-invalid'), 'true');
    assert.equal(document.getElementById(box.getAttribute('aria-describedby') ?? '')?.textContent, ARRIVED_ERROR);
  });
});
