/**
 * How a chart learns the size of its text (#676): `useChartRem` measures the
 * reader's text size and the width the drawing is shown at, after every
 * drawing, when the drawing is resized and when the fonts arrive. jsdom lays
 * nothing out, so the width, the text size, the resize observer and the
 * fonts are stand-ins the tests set.
 */
import '../../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { StrictMode, useRef, type RefObject } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { useChartRem } from './useChartRem.ts';

const g = globalThis as unknown as Record<string, unknown>;

/** What the stand-in browser reports. */
let shown = 0;
let rootSize = '16px';
let measured: Element[] = [];

class Watcher {
  static all: Watcher[] = [];
  watching: Element[] = [];
  stopped = false;
  constructor(private readonly changed: () => void) {
    Watcher.all.push(this);
  }
  observe(el: Element) {
    assert.ok(el instanceof Element, 'only an element can be watched');
    this.watching.push(el);
  }
  unobserve() {}
  disconnect() {
    this.stopped = true;
  }
  /** The browser telling the chart its box changed. */
  resize() {
    act(() => this.changed());
  }
}
const live = () => Watcher.all.filter((w) => !w.stopped);
/** Whether `w` watches this element and nothing else. */
const watches = (w: Watcher, el: Element | null) => el !== null && w.watching.length === 1 && w.watching[0] === el;

function fontsArriveLater(): () => Promise<void> {
  let arrive = () => {};
  const ready = new Promise<void>((resolve) => { arrive = resolve; });
  Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true });
  return async () => {
    await act(async () => {
      arrive();
      await ready;
    });
  };
}

const kept: Record<string, unknown> = {};
beforeEach(() => {
  shown = 0;
  rootSize = '16px';
  measured = [];
  Watcher.all = [];
  kept.rect = Element.prototype.getBoundingClientRect;
  kept.style = g.getComputedStyle;
  kept.observer = g.ResizeObserver;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    measured.push(this);
    return { width: shown, height: 0, top: 0, left: 0, right: shown, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
  };
  g.getComputedStyle = (el: Element) => {
    assert.equal(el, document.documentElement, 'the text size is read from the page, not the chart');
    return { fontSize: rootSize };
  };
  g.ResizeObserver = Watcher;
});
afterEach(() => {
  cleanup();
  Element.prototype.getBoundingClientRect = kept.rect as typeof Element.prototype.getBoundingClientRect;
  g.getComputedStyle = kept.style;
  g.ResizeObserver = kept.observer;
  delete (document as unknown as Record<string, unknown>).fonts;
});

let seen = { rem: 0, scale: 0 };

/** A chart drawn `width` units across; `drawing` names its SVG, and a new name is a new SVG. */
function Chart({ width, drawing = 'a', outside }: { width: number; drawing?: string | null; outside?: RefObject<SVGSVGElement | null> }) {
  const own = useRef<SVGSVGElement | null>(null);
  seen = useChartRem(outside ?? own, width);
  return outside || drawing === null ? null : <svg key={drawing} ref={own} data-drawing={drawing} />;
}

describe('the size of a rem in a chart', () => {
  it('is 16 units, at the default text size, until there is a drawing to measure', () => {
    render(<Chart width={640} drawing={null} />);
    assert.deepEqual(seen, { rem: 16, scale: 1 });
    assert.equal(Watcher.all.length, 0);
    assert.equal(measured.length, 0);
  });

  it('follows the text size and the width the drawing is shown at', () => {
    shown = 300;
    rootSize = '20px';
    const { container } = render(<Chart width={640} />);
    // 20 px of text on a drawing shown at 300 of its 640 units: 42.67, to one decimal.
    assert.deepEqual(seen, { rem: 42.7, scale: 1.25 });
    assert.ok(measured.length > 0 && measured.every((el) => el === container.querySelector('svg')));
  });

  it('rounds the text size against the default to two decimals', () => {
    shown = 600;
    rootSize = '18px';
    render(<Chart width={600} />);
    assert.deepEqual(seen, { rem: 18, scale: 1.13 });
  });

  it('takes the text size as 16 px when the page does not say', () => {
    shown = 320;
    rootSize = '';
    render(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 32, scale: 1 });
  });

  it('leaves a chart in a closed fold as it was', () => {
    rootSize = '32px';
    shown = 0;
    const { rerender } = render(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 16, scale: 1 });
    shown = 1;
    rerender(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 16, scale: 1 });
    shown = 320;
    rerender(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 64, scale: 2 });
    shown = 0;
    rerender(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 64, scale: 2 });
  });

  it('measures again after every drawing, with the units the chart has then', () => {
    shown = 320;
    const { rerender } = render(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 32, scale: 1 });
    rerender(<Chart width={960} />);
    assert.deepEqual(seen, { rem: 48, scale: 1 });
  });

  it('measures a drawing that arrives after the chart', () => {
    shown = 320;
    const { rerender } = render(<Chart width={640} drawing={null} />);
    assert.deepEqual(seen, { rem: 16, scale: 1 });
    rerender(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 32, scale: 1 });
    assert.equal(live().length, 1);
  });
});

/** A chart whose measuring part is drawn inside its own SVG, like the net worth donut's centre (#876). */
function Inside({ width }: { width: number }) {
  seen = useChartRem(insideRef, width);
  return <g />;
}
let insideRef: RefObject<SVGSVGElement | null> = { current: null };
function Framed({ width }: { width: number }) {
  insideRef = useRef<SVGSVGElement | null>(null);
  return <svg ref={insideRef}><Inside width={width} /></svg>;
}

describe('a chart measured from inside its own drawing (#876)', () => {
  it('measures and watches the drawing on its first draw, once the drawing is there', async () => {
    shown = 320;
    const { container } = render(<Framed width={640} />);
    await act(async () => {});
    assert.deepEqual(seen, { rem: 32, scale: 1 });
    assert.equal(live().length, 1);
    assert.ok(watches(live()[0], container.querySelector('svg')));
  });

  it('watches the drawing even when the first measurement is the default', async () => {
    shown = 640;
    const { container } = render(<Framed width={640} />);
    await act(async () => {});
    assert.deepEqual(seen, { rem: 16, scale: 1 });
    assert.ok(watches(live()[0], container.querySelector('svg')));
    shown = 320;
    live()[0].resize();
    assert.deepEqual(seen, { rem: 32, scale: 1 });
  });
});

describe('a chart whose box changes', () => {
  it('measures again when the drawing is resized', () => {
    shown = 320;
    const { container } = render(<Chart width={640} />);
    assert.equal(Watcher.all.length, 1);
    assert.ok(watches(Watcher.all[0], container.querySelector('svg')));
    shown = 160;
    Watcher.all[0].resize();
    assert.deepEqual(seen, { rem: 64, scale: 1 });
  });

  it('is not redrawn for a change of less than a pixel', () => {
    shown = 300;
    rootSize = '20px';
    render(<Chart width={640} />);
    const before = seen;
    assert.equal(before.rem, 42.7);
    // 42.6 at this width: a tenth away, so the chart keeps what it had.
    shown = 300.5;
    Watcher.all[0].resize();
    assert.equal(seen, before);
    // 42.4 at this width.
    shown = 302;
    Watcher.all[0].resize();
    assert.deepEqual(seen, { rem: 42.4, scale: 1.25 });
    // 42.8, from below this time.
    shown = 299;
    Watcher.all[0].resize();
    assert.deepEqual(seen, { rem: 42.8, scale: 1.25 });
  });

  it('follows a new text size even when its rem comes out the same', () => {
    shown = 300;
    rootSize = '20px';
    render(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 42.7, scale: 1.25 });
    shown = 600;
    rootSize = '40px';
    Watcher.all[0].resize();
    assert.deepEqual(seen, { rem: 42.7, scale: 2.5 });
  });

  it('watches one drawing once, however often the chart is drawn', () => {
    shown = 320;
    const { rerender } = render(<Chart width={640} />);
    rerender(<Chart width={640} />);
    rerender(<Chart width={800} />);
    assert.equal(Watcher.all.length, 1);
    assert.equal(Watcher.all[0].stopped, false);
  });

  it('moves its watch to a new drawing', () => {
    shown = 320;
    const { container, rerender } = render(<Chart width={640} />);
    rerender(<Chart width={640} drawing="b" />);
    assert.equal(Watcher.all.length, 2);
    assert.equal(Watcher.all[0].stopped, true);
    assert.equal(Watcher.all[1].stopped, false);
    assert.ok(watches(Watcher.all[1], container.querySelector('[data-drawing="b"]')));
  });

  it('stops watching a drawing that is taken away, and when the chart goes', () => {
    shown = 320;
    const { rerender, unmount } = render(<Chart width={640} />);
    rerender(<Chart width={640} drawing={null} />);
    assert.equal(live().length, 0);
    rerender(<Chart width={640} drawing="b" />);
    assert.equal(live().length, 1);
    unmount();
    assert.equal(live().length, 0);
  });

  it('still watches after the double mount of strict mode', () => {
    shown = 320;
    const { container } = render(<StrictMode><Chart width={640} /></StrictMode>);
    const watching = live();
    assert.equal(watching.length, 1);
    assert.ok(watches(watching[0], container.querySelector('svg')));
    shown = 160;
    watching[0].resize();
    assert.deepEqual(seen, { rem: 64, scale: 1 });
  });

  it('measures, and goes, without complaint in a browser that cannot watch', () => {
    // React reports an error thrown while a chart is taken away instead of throwing it.
    const reported = mock.method(console, 'error', () => {});
    let uncaught = 0;
    const onError = (e: Event) => { uncaught++; e.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      g.ResizeObserver = undefined;
      shown = 320;
      const { unmount } = render(<Chart width={640} />);
      assert.deepEqual(seen, { rem: 32, scale: 1 });
      unmount();
      assert.equal(reported.mock.callCount() + uncaught, 0);
    } finally {
      reported.mock.restore();
      window.removeEventListener('error', onError);
    }
  });
});

describe('a chart whose fonts arrive late', () => {
  it('measures again when they arrive', async () => {
    const arrive = fontsArriveLater();
    shown = 320;
    render(<Chart width={640} />);
    assert.deepEqual(seen, { rem: 32, scale: 1 });
    shown = 160;
    await arrive();
    assert.deepEqual(seen, { rem: 64, scale: 1 });
  });

  it('measures nothing when they arrive after the chart has gone', async () => {
    const arrive = fontsArriveLater();
    shown = 320;
    // A drawing the chart does not own, so it is still there afterwards.
    const outside = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { unmount } = render(<Chart width={640} outside={outside} />);
    assert.deepEqual(seen, { rem: 32, scale: 1 });
    unmount();
    measured = [];
    await arrive();
    assert.equal(measured.length, 0);
  });
});
