/**
 * useSteadyAbove: the ref a tool puts on a part that changes height as a
 * reader types below it (#827). The rule itself is tested in
 * src/utils/shared/steadyAbove.dom.test.ts; here, that a component's part is
 * looked at after every render, and that a part which leaves the page is let
 * go of. jsdom lays nothing out, so each part is given its height by hand.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import { useSteadyAbove } from './toolShared.tsx';

/** The height each part has, by the text in it. */
const HEIGHTS: Record<string, number> = { note: 100, '': 20, 'longer note': 140 };

function Tool({ note, shown = true }: { note: string; shown?: boolean }) {
  const row = useSteadyAbove<HTMLParagraphElement>();
  return (
    <form>
      {shown && <p ref={row} data-testid="row">{note}</p>}
      <input aria-label="Amount" />
    </form>
  );
}

const row = () => document.querySelector('[data-testid="row"]') as HTMLElement;
const box = () => document.querySelector('input') as HTMLInputElement;
/** jsdom has no layout: the part is as tall as its text says, or as the height it was given to keep. */
const measured = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({ height: Math.max(HEIGHTS[el.textContent ?? ''], Number.parseFloat(el.style.minHeight) || 0) }) as DOMRect;
};

afterEach(() => cleanup());

describe('useSteadyAbove', () => {
  it('keeps the part\'s height when a render makes it shorter while the reader is in a box below it', () => {
    const view = render(<Tool note="note" />);
    measured(row());
    box().focus();
    view.rerender(<Tool note="" />);
    assert.equal(row().style.minHeight, '100px');
    // And looks again at the next render: as tall as before, nothing is kept.
    view.rerender(<Tool note="note" />);
    assert.equal(row().style.minHeight, '');
  });

  it('keeps nothing when the reader is not in a box below it', () => {
    const view = render(<Tool note="note" />);
    measured(row());
    view.rerender(<Tool note="" />);
    assert.equal(row().style.minHeight, '');
  });

  it('lets the height go when the focus leaves the box', () => {
    const view = render(<Tool note="note" />);
    measured(row());
    box().focus();
    view.rerender(<Tool note="" />);
    box().blur();
    assert.equal(row().style.minHeight, '');
  });

  it('lets go of a part that leaves the page, and watches the one that takes its place', () => {
    const view = render(<Tool note="note" />);
    const first = row();
    measured(first);
    box().focus();
    view.rerender(<Tool note="" />);
    assert.equal(first.style.minHeight, '100px');
    view.rerender(<Tool note="" shown={false} />);
    assert.equal(first.style.minHeight, '');
    // The part that left is no longer listened for.
    first.style.minHeight = '3px';
    box().blur();
    assert.equal(first.style.minHeight, '3px');

    view.rerender(<Tool note="longer note" />);
    const second = row();
    assert.ok(second !== first);
    measured(second);
    box().focus();
    view.rerender(<Tool note="note" />);
    assert.equal(second.style.minHeight, '140px');
  });

  it('stops watching when the tool leaves the page', () => {
    const view = render(<Tool note="note" />);
    const part = row();
    measured(part);
    box().focus();
    view.rerender(<Tool note="" />);
    view.unmount();
    assert.equal(part.style.minHeight, '');
  });
});
