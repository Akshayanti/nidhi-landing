/**
 * What the inflation calculator asks of the browser (#790): `usePhone` says
 * whether the screen is narrower than the site's 640px breakpoint and
 * follows it as it changes; `loadHistory` fetches the countries' history
 * from the site's own origin, once, without credentials, and asks again
 * after a failure.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { CompactHistory } from '../utils/inflation/history.ts';
import { loadHistory, usePhone } from './InflationCalculator.tsx';

function Probe() {
  return <p>{usePhone() ? 'phone' : 'wide'}</p>;
}

const realMatchMedia = window.matchMedia;
const realFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
  globalThis.fetch = realFetch;
});
after(() => window.close());

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

describe('whether the inflation calculator is on a phone', () => {
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
    assert.equal(screen.removed.length, 1);
    assert.ok(screen.removed[0] === screen.listeners[0]);
  });

  it('a browser that cannot report changes still gets its answer, and leaving the page breaks nothing', () => {
    screenOf(390, { listens: false });
    const errors: unknown[] = [];
    const seen = (e: ErrorEvent) => { errors.push(e.error ?? e.message); e.preventDefault(); };
    window.addEventListener('error', seen);
    try {
      const { container, unmount } = render(<Probe />);
      assert.equal(container.textContent, 'phone');
      unmount();
    } finally {
      window.removeEventListener('error', seen);
    }
    assert.deepEqual(errors.map(String), []);
  });

  it('the server draws the wider page, whatever screen is there', () => {
    screenOf(390);
    assert.equal(renderToString(<Probe />), '<p>wide</p>');
    // A plain no, not a blank: the page hands the answer on as it is.
    const Said = () => <p>{String(usePhone())}</p>;
    assert.equal(renderToString(<Said />), '<p>false</p>');
  });
});

/** The browser's `fetch`, answering each request in turn with what the test gives it. */
function fetchAnswering(...answers: Array<() => Promise<unknown>>) {
  const asked: Array<{ url: unknown; options: unknown }> = [];
  globalThis.fetch = ((url: unknown, options: unknown) => {
    asked.push({ url, options });
    const answer = answers[asked.length - 1];
    return answer ? answer() : Promise.reject(new Error('not expected'));
  }) as typeof fetch;
  return asked;
}

const HISTORY: CompactHistory = { updated: '2026-10-08', countries: { TST: [2019, [10, null, 3.5]] } };
/** Lets a failed request be forgotten before the next one is made. */
const settled = () => new Promise((done) => setImmediate(done));

describe('fetching the countries’ history', () => {
  // One test, in this order: a history that has arrived is kept for the rest of the page's life.
  it('asks again after each failure, sends no credentials, and keeps the history once it has arrived', async () => {
    const asked = fetchAnswering(
      () => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve(HISTORY) }),
      () => Promise.reject(new TypeError('offline')),
      () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(HISTORY) }),
    );
    {
      // the server says no: the failure names the status, and the body is not taken for a history
      await assert.rejects(loadHistory('/data/inflation-history.json'), { name: 'Error', message: 'HTTP 503' });
      assert.equal(asked.length, 1);
      assert.equal(asked[0].url, '/data/inflation-history.json');
      assert.deepEqual(asked[0].options, { credentials: 'omit' });
    }
    {
      // no connection: the failure is handed on, and the next call asks again
      await settled();
      await assert.rejects(loadHistory('/data/inflation-history.json'), { name: 'TypeError', message: 'offline' });
      assert.equal(asked.length, 2);
    }
    {
      // it arrives
      await settled();
      const first = loadHistory('/data/inflation-history.json');
      assert.deepEqual(await first, HISTORY);
      assert.equal(asked.length, 3);
      assert.deepEqual(asked[2], { url: '/data/inflation-history.json', options: { credentials: 'omit' } });
    }
    {
      // and is not fetched a second time, by this caller or the next
      await settled();
      assert.deepEqual(await loadHistory('/data/inflation-history.json'), HISTORY);
      assert.deepEqual(await loadHistory('/data/inflation-history.json'), HISTORY);
      assert.equal(asked.length, 3);
    }
  });
});
