/**
 * The Monte Carlo simulator's phone check (#790): `usePhone` says whether the
 * screen is narrower than the site's 640px breakpoint, follows the screen as
 * it changes, and lets go of the browser when the page goes.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { usePhone } from './MonteCarloSimulator.tsx';

function Probe() {
  return <p>{usePhone() ? 'phone' : 'wide'}</p>;
}

const realMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
});

/** A screen the test can narrow and widen, as the browser reports it. */
function screenOf(width: number, { listens = true } = {}) {
  const screen = { width, asked: [] as string[], listeners: [] as Array<() => void>, removed: [] as Array<() => void> };
  window.matchMedia = ((query: string) => {
    screen.asked.push(query);
    return {
      get matches() { return query === '(width < 640px)' && screen.width < 640; },
      media: query,
      ...(listens && {
        addEventListener: (type: string, f: () => void) => { if (type === 'change') screen.listeners.push(f); },
        removeEventListener: (type: string, f: () => void) => { if (type === 'change') screen.removed.push(f); },
      }),
    };
  }) as unknown as typeof window.matchMedia;
  return screen;
}

describe('whether the page is on a phone', () => {
  it('a screen narrower than 640px is a phone, a wider one is not', () => {
    const narrow = screenOf(639);
    assert.equal(render(<Probe />).container.textContent, 'phone');
    assert.deepEqual([...new Set(narrow.asked)], ['(width < 640px)']);
    cleanup();
    screenOf(640);
    assert.equal(render(<Probe />).container.textContent, 'wide');
  });

  it('follows the screen as it changes, and stops listening when the page goes', () => {
    const screen = screenOf(1024);
    const { container, unmount } = render(<Probe />);
    assert.equal(container.textContent, 'wide');
    assert.equal(screen.listeners.length, 1);
    screen.width = 390;
    act(() => screen.listeners[0]());
    assert.equal(container.textContent, 'phone');
    assert.deepEqual(screen.removed, []);
    unmount();
    assert.deepEqual(screen.removed, [screen.listeners[0]]);
  });

  it('a browser that cannot report changes still gets its answer', () => {
    screenOf(390, { listens: false });
    const { container, unmount } = render(<Probe />);
    assert.equal(container.textContent, 'phone');
    unmount();
  });

  it('the server draws the wider page, whatever screen is there', () => {
    screenOf(390);
    assert.equal(renderToString(<Probe />), '<p>wide</p>');
    // A plain no, not a blank: the page hands the answer on as it is.
    const Said = () => <p>{String(usePhone())}</p>;
    assert.equal(renderToString(<Said />), '<p>false</p>');
  });
});
