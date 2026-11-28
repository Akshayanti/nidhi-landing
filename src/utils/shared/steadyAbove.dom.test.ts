/**
 * Tests for src/utils/shared/steadyAbove.ts: the box a reader is typing in
 * stays where it is when a part of the page above it changes height (#827).
 *
 * jsdom lays nothing out, so the heights and positions are made up here: the
 * region's own height (`natural`, and never less than a `min-height` it was
 * given, as in a browser) and the top of each box. The window is a stand-in
 * that records what it was asked to do.
 */
import '../../../test/dom.ts';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { steadyAbove, type Steady, type SteadyWindow } from './steadyAbove.ts';

let region: HTMLElement;
let before: HTMLInputElement;
let inside: HTMLInputElement;
let box: HTMLInputElement;
let other: HTMLInputElement;
/** The region's height as its content alone makes it. */
let natural: number;
/** The top of each box on the screen. */
let tops: Map<Element, number>;
let scrolls: unknown[][];
let timers: { run: () => void; after: number | undefined }[];
let steady: Steady;

const win = {
  scrollBy: (...args: unknown[]) => { scrolls.push(args); },
  setTimeout: (run: () => void, after?: number) => { timers.push({ run, after }); return 0; },
} as unknown as SteadyWindow;

const held = () => region.style.minHeight;
const send = (type: string) => document.dispatchEvent(new window.Event(type));
/** The content changes to this height, and the change is drawn. */
const draw = (height: number) => { natural = height; steady.settle(); };
const runTimers = () => { for (const timer of timers.splice(0)) timer.run(); };

beforeEach(() => {
  document.body.innerHTML = '<input id="before"><div id="region"><input id="inside"></div><input id="box"><input id="other">';
  region = document.getElementById('region') as HTMLElement;
  [before, inside, box, other] = ['before', 'inside', 'box', 'other'].map((id) => document.getElementById(id) as HTMLInputElement);
  natural = 100;
  tops = new Map<Element, number>([[box, 200], [other, 300]]);
  scrolls = [];
  timers = [];
  region.getBoundingClientRect = () => ({ height: Math.max(natural, Number.parseFloat(region.style.minHeight) || 0) }) as DOMRect;
  for (const el of [box, other]) el.getBoundingClientRect = () => ({ top: tops.get(el) }) as DOMRect;
  steady = steadyAbove(region, win);
});

afterEach(() => {
  steady.stop();
  document.body.innerHTML = '';
});

describe('a region that gets shorter while the reader types below it', () => {
  it('keeps the height it had, so nothing below it moves up', () => {
    box.focus();
    draw(40);
    assert.equal(held(), '100px');
    assert.deepEqual(scrolls, []);
  });

  it('goes on keeping it at every later change that leaves it shorter, and never adds to it', () => {
    box.focus();
    draw(40);
    draw(40);
    assert.equal(held(), '100px');
    draw(0);
    assert.equal(held(), '100px');
    draw(70);
    assert.equal(held(), '100px');
    assert.deepEqual(scrolls, []);
  });

  it('holds nothing once the content is as tall again as it was', () => {
    box.focus();
    draw(40);
    draw(100);
    assert.equal(held(), '');
    assert.deepEqual(scrolls, []);
    // And the next time it gets shorter, the height kept is still the one the reader saw.
    draw(99);
    assert.equal(held(), '100px');
  });

  it('holds nothing for a change that leaves the height as it is', () => {
    box.focus();
    draw(100);
    assert.equal(held(), '');
  });

  it('holds nothing while the focus is nowhere, before the region or inside it', () => {
    draw(40);
    assert.equal(held(), '');
    for (const el of [before, inside]) {
      natural = 100;
      el.focus();
      draw(40);
      assert.equal(held(), '', el.id);
    }
    assert.deepEqual(scrolls, []);
  });

  it('holds nothing when the page says nothing is focused at all', () => {
    box.focus();
    Object.defineProperty(document, 'activeElement', { get: () => null, configurable: true });
    try {
      send('focusout');
      draw(40);
      assert.equal(held(), '');
    } finally {
      delete (document as unknown as Record<string, unknown>).activeElement;
    }
  });

  it('measures the height the reader saw when the focus arrived, not the one at the start', () => {
    natural = 60;
    box.focus();
    draw(100);
    draw(70);
    assert.equal(held(), '100px');
    box.blur();
    natural = 30;
    box.focus();
    draw(20);
    assert.equal(held(), '30px');
  });
});

describe('the focus leaving the box', () => {
  it('lets the height go when the focus goes nowhere', () => {
    box.focus();
    draw(40);
    box.blur();
    assert.equal(held(), '');
  });

  it('lets it go when the focus moves to another box, and starts again from what is there', () => {
    box.focus();
    draw(40);
    other.focus();
    assert.equal(held(), '');
    // The shorter region is what the reader now sees: nothing to keep at the same height.
    draw(40);
    assert.equal(held(), '');
    draw(10);
    assert.equal(held(), '40px');
  });

  it('lets it go when a later change is drawn after the focus has left, even if no focus event was heard', () => {
    box.focus();
    draw(40);
    // The box is taken out of the page: the browser moves the focus without telling.
    box.remove();
    assert.equal(held(), '100px');
    draw(40);
    assert.equal(held(), '');
  });

  for (const end of ['pointerup', 'pointercancel']) {
    it(`waits for a pointer that is down, until it is up and its click has been sent (${end})`, () => {
      box.focus();
      draw(40);
      send('pointerdown');
      box.blur();
      assert.equal(held(), '100px', 'the page under the pointer has not moved');
      // A change drawn in the meantime (the box tidying its number as it is left) moves nothing either.
      draw(20);
      assert.equal(held(), '100px');
      send(end);
      assert.equal(held(), '100px', 'the click comes after this event');
      assert.deepEqual(timers.map((timer) => timer.after), [0]);
      runTimers();
      assert.equal(held(), '');
    });
  }

  it('lets go at once again after the pointer is up', () => {
    send('pointerdown');
    send('pointerup');
    runTimers();
    box.focus();
    draw(40);
    box.blur();
    assert.equal(held(), '');
  });

  it('keeps the height when the pointer is pressed and lifted in the box itself', () => {
    box.focus();
    draw(40);
    send('pointerdown');
    send('pointerup');
    runTimers();
    assert.equal(held(), '100px');
  });
});

describe('a region that gets taller while the reader types below it', () => {
  it('moves the page by as far as the box went down, at once', () => {
    box.focus();
    tops.set(box, 230);
    draw(130);
    assert.deepEqual(scrolls, [[{ top: 30, behavior: 'instant' }]]);
    assert.equal(held(), '');
  });

  it('leaves the page alone when the browser has kept the box in place itself, or the box went up', () => {
    box.focus();
    draw(130);
    tops.set(box, 150);
    draw(160);
    assert.deepEqual(scrolls, []);
  });

  it('leaves the page alone when the region is not what grew', () => {
    box.focus();
    tops.set(box, 260);
    draw(100);
    assert.deepEqual(scrolls, []);
    tops.set(box, 300);
    draw(40);
    assert.deepEqual(scrolls, []);
  });

  it('leaves the page alone while the focus is not below the region', () => {
    inside.focus();
    draw(130);
    before.focus();
    draw(160);
    assert.deepEqual(scrolls, []);
  });

  it('measures each move from where the box was after the last one', () => {
    box.focus();
    tops.set(box, 230);
    draw(130);
    tops.set(box, 250);
    draw(150);
    assert.deepEqual(scrolls.map(([to]) => (to as ScrollToOptions).top), [30, 20]);
  });

  it('measures from where the box was after the reader last scrolled', () => {
    box.focus();
    tops.set(box, 120);
    send('scroll');
    tops.set(box, 135);
    draw(115);
    assert.deepEqual(scrolls.map(([to]) => (to as ScrollToOptions).top), [15]);
  });

  it('measures from where the new box was when the focus moved to it', () => {
    box.focus();
    other.focus();
    tops.set(other, 340);
    draw(140);
    assert.deepEqual(scrolls.map(([to]) => (to as ScrollToOptions).top), [40]);
  });

  it('keeps the taller height as the one seen: getting shorter again is held at it', () => {
    box.focus();
    draw(130);
    draw(100);
    assert.equal(held(), '130px');
  });

  it('moves the page from a held height too, by the box alone', () => {
    box.focus();
    draw(40);
    tops.set(box, 225);
    draw(125);
    assert.equal(held(), '');
    assert.deepEqual(scrolls.map(([to]) => (to as ScrollToOptions).top), [25]);
    draw(110);
    assert.equal(held(), '125px');
  });

  it('ignores a scroll while nothing below is focused', () => {
    send('scroll');
    box.focus();
    tops.set(box, 210);
    draw(110);
    assert.deepEqual(scrolls.map(([to]) => (to as ScrollToOptions).top), [10]);
  });
});

describe('stopping', () => {
  it('lets go of the height, and listens to nothing afterwards', () => {
    const added: string[] = [];
    const removed: string[] = [];
    const real = { add: document.addEventListener, remove: document.removeEventListener };
    document.addEventListener = ((type: string, _l: unknown, capture: unknown) => { added.push(`${type} ${String(capture)}`); }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, _l: unknown, capture: unknown) => { removed.push(`${type} ${String(capture)}`); }) as typeof document.removeEventListener;
    try {
      const second = steadyAbove(region, win);
      // Each is heard before the page's own code handles the event.
      assert.deepEqual(added, ['pointerdown true', 'pointerup true', 'pointercancel true', 'focusin true', 'focusout true', 'scroll true']);
      second.stop();
      assert.deepEqual(removed, added);
    } finally {
      document.addEventListener = real.add;
      document.removeEventListener = real.remove;
    }
  });

  it('really stops: the same listeners that were added are the ones taken away', () => {
    box.focus();
    draw(40);
    steady.stop();
    assert.equal(held(), '');
    region.style.minHeight = '7px';
    box.blur();
    other.focus();
    send('scroll');
    send('pointerdown');
    send('pointerup');
    assert.equal(held(), '7px');
    assert.deepEqual(timers, []);
    region.style.minHeight = '';
  });
});

describe('with the page\'s own window', () => {
  it('moves that window when none is handed in', () => {
    const real = window.scrollBy;
    const asked: unknown[][] = [];
    window.scrollBy = ((...args: unknown[]) => { asked.push(args); }) as typeof window.scrollBy;
    const own = steadyAbove(region);
    try {
      box.focus();
      tops.set(box, 212);
      natural = 112;
      own.settle();
      assert.deepEqual(asked, [[{ top: 12, behavior: 'instant' }]]);
    } finally {
      own.stop();
      window.scrollBy = real;
    }
  });
});
