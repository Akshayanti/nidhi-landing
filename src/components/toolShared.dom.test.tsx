/**
 * toolShared: what every free tool shares around its form and results. The
 * form held until the island runs, the box
 * that selects the mark of an unreadable value, the results withheld while a
 * box is wrong, and the results' gate. The announcements have their own
 * file (toolShared.announce.dom.test.tsx), and a field error's lead-in one
 * that needs no browser (toolShared.errors.test.tsx).
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import {
  Withheld,
  heldUntilReady,
  markerSelect,
  selectMarker,
  useResultGate,
  useToolReady,
} from './toolShared.tsx';

afterEach(cleanup);

function Root() {
  return <div data-testid="root" {...heldUntilReady(useToolReady())}><input /></div>;
}

describe('a form held until it works', () => {
  it('is inert and busy in the page the server sends', () => {
    const html = renderToStaticMarkup(<Root />);
    assert.match(html, /^<div[^>]* inert=""/);
    assert.match(html, /^<div[^>]* aria-busy="true"/);
  });

  it('can be used once the island runs, and stays so', () => {
    const view = render(<Root />);
    const root = screen.getByTestId('root');
    assert.equal(root.hasAttribute('inert'), false);
    assert.equal(root.hasAttribute('aria-busy'), false);
    view.rerender(<Root />);
    assert.equal(screen.getByTestId('root').hasAttribute('inert'), false);
  });

  it('holds with both attributes and releases with none', () => {
    assert.deepEqual(heldUntilReady(false), { inert: true, 'aria-busy': true });
    assert.deepEqual(heldUntilReady(true), {});
  });
});

describe('a box that shows the mark of an unreadable value', () => {
  const boxWith = (value: string) => {
    const el = document.createElement('input');
    el.value = value;
    document.body.append(el);
    el.setSelectionRange(value.length, value.length);
    return el;
  };

  it('selects the mark, so typing replaces it', () => {
    const el = boxWith('?');
    selectMarker({ currentTarget: el });
    assert.deepEqual([el.selectionStart, el.selectionEnd], [0, 1]);
    el.remove();
  });

  it('leaves the caret where it is in a box that holds a value', () => {
    for (const value of ['125', '']) {
      const el = boxWith(value);
      selectMarker({ currentTarget: el });
      assert.deepEqual([el.selectionStart, el.selectionEnd], [value.length, value.length]);
      el.remove();
    }
  });

  it('does so on focus and on the click', () => {
    assert.deepEqual(markerSelect, { onFocus: selectMarker, onClick: selectMarker });
  });
});

describe('results, or the reason there are none', () => {
  const parts = (container: HTMLElement) => ({
    wrap: container.firstElementChild as HTMLElement,
    body: container.querySelector('.tool-resultBody') as HTMLElement,
    reason: container.querySelector('p'),
  });

  it('shows the results when nothing is wrong', () => {
    const { wrap, body, reason } = parts(render(<Withheld reason={null}><b>€120</b></Withheld>).container);
    assert.equal(wrap.className, 'tool-result');
    assert.equal(body.className, 'tool-resultBody');
    assert.equal(body.hasAttribute('inert'), false);
    assert.equal(body.textContent, '€120');
    assert.ok(reason === null);
  });

  it('withholds them and gives the reason in their place while a box is wrong', () => {
    const { body, reason } = parts(render(<Withheld reason="Fix the marked fields" reasonId="why"><b>€120</b></Withheld>).container);
    assert.equal(body.className, 'tool-resultBody tool-withheld');
    assert.equal(body.hasAttribute('inert'), true);
    assert.equal(body.textContent, '€120', 'the space stays');
    assert.ok(reason);
    assert.equal(reason.textContent, 'Fix the marked fields');
    assert.equal(reason.id, 'why');
    assert.equal(reason.className, 'tool-resultReason');
  });

  it('withholds with an empty reason too, and says nothing', () => {
    const { body, reason } = parts(render(<Withheld reason=""><b>€120</b></Withheld>).container);
    assert.equal(body.className, 'tool-resultBody tool-withheld');
    assert.equal(body.hasAttribute('inert'), true);
    assert.ok(reason === null);
  });

  it('leaves the reason to the part it goes with', () => {
    const { body, reason } = parts(render(<Withheld reason="Fix the marked fields" unsaid><b>€120</b></Withheld>).container);
    assert.equal(body.hasAttribute('inert'), true);
    assert.ok(reason === null);
    cleanup();
    assert.ok(parts(render(<Withheld reason={null} unsaid><b>€120</b></Withheld>).container).reason === null);
  });
});

describe('the results gate', () => {
  it('withholds from an invalid form until the corrected result is on screen', () => {
    const view = renderHook(({ invalid, current }) => useResultGate(invalid, current), { initialProps: { invalid: false, current: false } });
    // Ordinary typing hides nothing, but the exports wait.
    assert.deepEqual(view.result.current, { withheld: false, waiting: true });
    view.rerender({ invalid: false, current: true });
    assert.deepEqual(view.result.current, { withheld: false, waiting: false });
    view.rerender({ invalid: true, current: true });
    assert.deepEqual(view.result.current, { withheld: true, waiting: true });
    // Corrected, but the result on screen is still the old one.
    view.rerender({ invalid: false, current: false });
    assert.deepEqual(view.result.current, { withheld: true, waiting: true });
    view.rerender({ invalid: false, current: true });
    assert.deepEqual(view.result.current, { withheld: false, waiting: false });
    view.rerender({ invalid: false, current: false });
    assert.deepEqual(view.result.current, { withheld: false, waiting: true });
  });
});
