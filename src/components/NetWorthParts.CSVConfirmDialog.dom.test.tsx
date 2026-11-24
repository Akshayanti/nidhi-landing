/**
 * The question the net worth calculator asks before a CSV file replaces the
 * rows already typed (`CSVConfirmDialog`, #790): what it says, in the right
 * plural, that focus starts on the safe answer and stays inside the dialog,
 * that Escape is the safe answer too, and that focus goes back where it was
 * when the dialog closes.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import { czech, draw, framed, island } from '../../test/netWorthParts.charts.tsx';
import { CSVConfirmDialog } from './MultiCurrencyNetWorth.tsx';

function ask(current: number, pending: number, strings = island, locale = 'en') {
  const answers = { confirmed: 0, cancelled: 0 };
  const view = draw(
    <CSVConfirmDialog
      currentCount={current}
      pendingCount={pending}
      strings={strings}
      onConfirm={() => { answers.confirmed++; }}
      onCancel={() => { answers.cancelled++; }}
    />,
    locale,
  );
  return { answers, view };
}

const dialog = () => screen.getByRole('alertdialog');
const yes = () => screen.getByRole('button', { name: island.csv.replace });
const no = () => screen.getByRole('button', { name: island.csv.cancel });
/** Presses a key in the dialog; true when the dialog let the browser act on it. */
const press = (key: string, shiftKey = false) => fireEvent.keyDown(document.activeElement ?? dialog(), { key, shiftKey });

describe('the question before a CSV file replaces the rows', () => {
  it('says how many rows go and how many come, in the right plural, as the dialog’s name', () => {
    ask(1, 4);
    assert.equal(dialog().getAttribute('aria-modal'), 'true');
    assert.equal(dialog().textContent?.startsWith('Uploading a CSV will replace your current 1 item with 4 from the file. Continue?'), true);
    const named = document.getElementById(dialog().getAttribute('aria-labelledby') ?? '');
    assert.equal(named?.textContent, 'Uploading a CSV will replace your current 1 item with 4 from the file. Continue?');
  });

  it('counts several rows as items', () => {
    ask(3, 1);
    assert.equal(screen.getByText(/Uploading/).textContent, 'Uploading a CSV will replace your current 3 items with 1 from the file. Continue?');
  });

  it('uses each of a language’s plural forms (Czech: one, few, many)', () => {
    const cases: Array<[number, string]> = [
      [1, czech.csv.confirmOne],
      [3, czech.csv.confirmFew],
      [5, czech.csv.confirmMany],
    ];
    for (const [count, template] of cases) {
      const { view } = ask(count, 2, czech, 'cs');
      const said = template.replace('{current}', String(count)).replace('{pending}', '2');
      assert.equal(view.container.querySelector('p')?.textContent, said);
      view.unmount();
    }
  });

  it('starts on the safe answer, and each button gives its own answer', () => {
    const { answers } = ask(2, 2);
    assert.ok(document.activeElement === no());
    fireEvent.click(yes());
    assert.deepEqual(answers, { confirmed: 1, cancelled: 0 });
    fireEvent.click(no());
    assert.deepEqual(answers, { confirmed: 1, cancelled: 1 });
  });

  it('Escape is the safe answer; other keys are left to the browser', () => {
    const { answers } = ask(2, 2);
    assert.equal(press('Enter'), true);
    assert.equal(press('a', true), true);
    assert.deepEqual(answers, { confirmed: 0, cancelled: 0 });
    press('Escape');
    assert.deepEqual(answers, { confirmed: 0, cancelled: 1 });
    assert.ok(document.activeElement === no(), 'Escape moves nothing');
  });

  it('Escape gives the answer the page asks for now, after the page has changed it', () => {
    const first = { cancelled: 0 };
    const second = { cancelled: 0 };
    const dialogWith = (onCancel: () => void) => (
      <CSVConfirmDialog currentCount={2} pendingCount={2} strings={island} onConfirm={() => {}} onCancel={onCancel} />
    );
    const { view } = ask(2, 2);
    view.rerender(framed(dialogWith(() => { first.cancelled++; })));
    view.rerender(framed(dialogWith(() => { second.cancelled++; })));
    press('Escape');
    assert.deepEqual([first.cancelled, second.cancelled], [0, 1]);
  });

  it('keeps Tab inside the dialog, both ways', () => {
    ask(2, 2);
    // From the last button, Tab goes round to the first.
    assert.equal(press('Tab'), false);
    assert.ok(document.activeElement === yes());
    // From the first, Tab is the browser's own (to the next button).
    assert.equal(press('Tab'), true);
    assert.ok(document.activeElement === yes());
    // From the first, Shift+Tab goes round to the last.
    assert.equal(press('Tab', true), false);
    assert.ok(document.activeElement === no());
    // From the last, Shift+Tab is the browser's own.
    assert.equal(press('Tab', true), true);
    assert.ok(document.activeElement === no());
  });

  it('gives focus back to what had it when the dialog closes', () => {
    const before = document.createElement('button');
    before.textContent = 'Upload CSV';
    document.body.append(before);
    before.focus();
    const { view } = ask(2, 2);
    assert.ok(document.activeElement === no());
    view.unmount();
    assert.ok(document.activeElement === before);
    before.remove();
  });

  it('closes cleanly when nothing had focus as it opened', () => {
    // A browser can say no element has focus (document.activeElement null).
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => null });
    let view;
    try {
      view = ask(2, 2).view;
    } finally {
      delete (document as unknown as Record<string, unknown>).activeElement;
    }
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => { errors.push(e.message); e.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      view.unmount();
    } catch (e) {
      errors.push(String(e));
    } finally {
      window.removeEventListener('error', onError);
    }
    assert.deepEqual(errors, []);
  });
});
