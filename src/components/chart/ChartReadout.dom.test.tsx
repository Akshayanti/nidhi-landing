/**
 * The value read-out the free tools' charts share: what the card shows,
 * where it is placed beside the crosshair, how Escape closes it, how a mouse
 * and a finger open and move it, and the slot that keeps its height on
 * phones. jsdom lays nothing out, so the boxes of the figure, the drawing
 * and the card are stand-ins the tests set.
 */
import '../../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useRef, type PointerEvent } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  ChartReadout, ReadoutSlot, useChartPointer, useEscapeToClose, useReadoutPlacement, useReadoutSlot,
  type ReadoutPosition, type ReadoutRow,
} from './ChartReadout.tsx';

/** What the stand-in browser reports for the figure, the drawing inside it and the card. */
let figure = { left: 0, top: 0, clientWidth: 0 };
let drawing = { left: 0, top: 0, width: 0 };
let card = { width: 0, height: 0 };
/** How many boxes the page was asked to lay out and measure. */
let boxesRead = 0;

const isCard = (el: Element) => el.classList.contains('chart-readout');
const kept: { rect?: typeof Element.prototype.getBoundingClientRect; props: [object, string, PropertyDescriptor | undefined][] } = { props: [] };

function standIn(proto: object, name: string, get: (this: Element) => number) {
  kept.props.push([proto, name, Object.getOwnPropertyDescriptor(proto, name)]);
  Object.defineProperty(proto, name, { configurable: true, get });
}

beforeEach(() => {
  figure = { left: 100, top: 30, clientWidth: 500 };
  drawing = { left: 120, top: 50, width: 400 };
  card = { width: 100, height: 0 };
  boxesRead = 0;
  kept.rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    boxesRead++;
    const box = this.tagName === 'FIGURE' ? { ...figure, width: figure.clientWidth } : this.tagName === 'svg' ? drawing : { left: 0, top: 0, width: 0 };
    return { ...box, height: 0, right: box.left + box.width, bottom: box.top, x: box.left, y: box.top, toJSON: () => ({}) };
  };
  standIn(HTMLElement.prototype, 'offsetWidth', function () { return isCard(this) ? card.width : 0; });
  standIn(HTMLElement.prototype, 'offsetHeight', function () { return isCard(this) ? card.height : 0; });
  standIn(Element.prototype, 'clientWidth', function () { return this.tagName === 'FIGURE' ? figure.clientWidth : 0; });
});
afterEach(() => {
  cleanup();
  Element.prototype.getBoundingClientRect = kept.rect!;
  for (const [proto, name, was] of kept.props.splice(0)) {
    if (was) Object.defineProperty(proto, name, was);
    else delete (proto as Record<string, unknown>)[name];
  }
});

const ROWS: ReadoutRow[] = [
  { label: 'Invested', value: '€ 73,191', swatch: 'dot', color: 'var(--chart-1)', strong: true },
  { label: 'Likely range', value: '€ 50,000 to € 90,000', swatch: 'band', color: 'rgb(1, 2, 3)' },
  { label: 'Paid in', value: '€ 40,000', swatch: 'dash', color: 'var(--chart-3)' },
];

function Card({ position, tag, rows = ROWS }: { position: ReadoutPosition | null; tag?: string | null; rows?: ReadoutRow[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return <ChartReadout title="Year 12" tag={tag} rows={rows} cardRef={ref} position={position} />;
}

describe('the read-out card', () => {
  it('lists every value at the point picked, each with its swatch', () => {
    const { container } = render(<Card position={{ left: 30, top: 12 }} />);
    const shown = container.querySelector('.chart-readout');
    assert.ok(shown);
    assert.equal(container.querySelector('.chart-readoutTitle')?.textContent, 'Year 12');
    const rows = [...container.querySelectorAll('dl > div')];
    assert.deepEqual(rows.map((r) => r.querySelector('dt')?.textContent), ['Invested', 'Likely range', 'Paid in']);
    assert.deepEqual(rows.map((r) => r.querySelector('dd')?.textContent), ['€ 73,191', '€ 50,000 to € 90,000', '€ 40,000']);
    assert.deepEqual(
      rows.map((r) => r.querySelector('dt > i')?.className),
      ['chart-swatch chart-swatch--dot', 'chart-swatch chart-swatch--band', 'chart-swatch chart-swatch--dash'],
    );
    assert.deepEqual(
      rows.map((r) => (r.querySelector('dt > i') as HTMLElement).style.color),
      ['var(--chart-1)', 'rgb(1, 2, 3)', 'var(--chart-3)'],
    );
  });

  it('marks the row that matters and no other', () => {
    const { container } = render(<Card position={{ left: 30, top: 12 }} />);
    const rows = [...container.querySelectorAll('dl > div')];
    assert.deepEqual(rows.map((r) => r.getAttribute('class')), ['chart-readoutStrong', null, null]);
  });

  it('is kept from screen readers, which hear the chart\'s own live region', () => {
    const { container } = render(<Card position={{ left: 30, top: 12 }} />);
    assert.equal(container.querySelector('.chart-readout')?.getAttribute('aria-hidden'), 'true');
  });

  it('shows a tag beside the title only when there is one', () => {
    const { container, rerender } = render(<Card position={null} tag="median" />);
    assert.equal(container.querySelector('.chart-readoutTitle > .chart-readoutTag')?.textContent, 'median');
    assert.equal(container.querySelector('.chart-readoutTitle')?.textContent, 'Year 12median');
    rerender(<Card position={null} tag={null} />);
    assert.ok(!container.querySelector('.chart-readoutTag'));
    assert.equal(container.querySelector('.chart-readoutTitle')?.textContent, 'Year 12');
    rerender(<Card position={null} />);
    assert.ok(!container.querySelector('.chart-readoutTag'));
  });

  it('sits where it is placed, and can be seen', () => {
    const { container } = render(<Card position={{ left: 30, top: 12 }} />);
    const shown = container.querySelector<HTMLElement>('.chart-readout')!;
    assert.equal(shown.style.left, '30px');
    assert.equal(shown.style.top, '12px');
    assert.equal(shown.style.visibility, '');
  });

  it('is drawn unseen in the corner until it has a place, so it can be measured', () => {
    const { container } = render(<Card position={null} />);
    const shown = container.querySelector<HTMLElement>('.chart-readout')!;
    assert.equal(shown.style.left, '0px');
    assert.equal(shown.style.top, '0px');
    assert.equal(shown.style.visibility, 'hidden');
  });
});

let places: (ReadoutPosition | null)[] = [];

/** A chart with a crosshair at `anchor` of its width; `parts` names what is on the page. */
function Placed({ anchor, limit = 1, parts = 'figure drawing card' }: { anchor: number | null; limit?: number; parts?: string }) {
  const fig = useRef<HTMLElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const position = useReadoutPlacement(fig, svg, cardRef, anchor, limit);
  places.push(position);
  return (
    <figure ref={parts.includes('figure') ? fig : undefined}>
      {parts.includes('drawing') && <svg ref={svg} />}
      {parts.includes('card') && <ChartReadout title="Year 12" rows={ROWS} cardRef={cardRef} position={position} />}
    </figure>
  );
}
const place = () => places[places.length - 1];

describe('where the read-out is placed', () => {
  beforeEach(() => { places = []; });

  it('is to the right of the crosshair, level with the top of the drawing', () => {
    // The drawing starts 20 px into the figure and 20 px down it; the crosshair is a quarter of the way across its 400 px.
    render(<Placed anchor={0.25} />);
    assert.deepEqual(place(), { left: 134, top: 28 });
  });

  it('flips to the left of the crosshair when it would cross the end of the plot', () => {
    render(<Placed anchor={0.75} limit={0.875} />);
    // The crosshair is at 320 and the plot ends at 370: 334 + 100 is past it.
    assert.deepEqual(place(), { left: 206, top: 28 });
  });

  it('stays on the right when it ends exactly at the end of the plot', () => {
    card.width = 186;
    render(<Placed anchor={0.5} />);
    // The crosshair is at 220 and the plot ends at 420.
    assert.deepEqual(place(), { left: 234, top: 28 });
  });

  it('never leaves the figure on the left', () => {
    card.width = 300;
    render(<Placed anchor={0.25} limit={0.5} />);
    assert.deepEqual(place(), { left: 0, top: 28 });
  });

  it('never leaves the figure on the right', () => {
    figure.clientWidth = 200;
    render(<Placed anchor={0.25} />);
    assert.deepEqual(place(), { left: 100, top: 28 });
  });

  it('follows the crosshair, and the end of the plot, as they move', () => {
    const { rerender } = render(<Placed anchor={0.25} />);
    rerender(<Placed anchor={0.5} />);
    assert.deepEqual(place(), { left: 234, top: 28 });
    rerender(<Placed anchor={0.5} limit={0.75} />);
    assert.deepEqual(place(), { left: 106, top: 28 });
  });

  it('has no place while no point is picked', () => {
    render(<Placed anchor={null} />);
    assert.deepEqual(places.filter((p) => p !== null), []);
    // A closed read-out costs the page no layout.
    assert.equal(boxesRead, 0);
  });

  it('loses its place when the point is let go, and finds it again', () => {
    const { container, rerender } = render(<Placed anchor={0.25} />);
    assert.equal(container.querySelector<HTMLElement>('.chart-readout')!.style.visibility, '');
    rerender(<Placed anchor={null} />);
    assert.equal(place(), null);
    assert.equal(container.querySelector<HTMLElement>('.chart-readout')!.style.visibility, 'hidden');
    rerender(<Placed anchor={0.5} />);
    assert.deepEqual(place(), { left: 234, top: 28 });
  });

  it('has no place, without complaint, while the figure, the drawing or the card is missing', () => {
    for (const parts of ['drawing card', 'figure card', 'figure drawing']) {
      places = [];
      render(<Placed anchor={0.25} parts={parts} />);
      assert.deepEqual(places.filter((p) => p !== null), [], parts);
      cleanup();
    }
  });
});

function Closer({ active, close }: { active: boolean; close: () => void }) {
  useEscapeToClose(active, close);
  return null;
}

describe('Escape on a chart with its read-out open', () => {
  const press = (key: string) => fireEvent.keyDown(document.body, { key });

  it('closes the read-out wherever focus is', () => {
    let closed = 0;
    render(<Closer active close={() => { closed++; }} />);
    press('Escape');
    assert.equal(closed, 1);
  });

  it('leaves every other key alone', () => {
    let closed = 0;
    render(<Closer active close={() => { closed++; }} />);
    press('Enter');
    press('ArrowLeft');
    press(' ');
    assert.equal(closed, 0);
  });

  it('does nothing while the read-out is closed', () => {
    let closed = 0;
    const close = () => { closed++; };
    const { rerender } = render(<Closer active={false} close={close} />);
    press('Escape');
    assert.equal(closed, 0);
    rerender(<Closer active close={close} />);
    press('Escape');
    assert.equal(closed, 1);
    rerender(<Closer active={false} close={close} />);
    press('Escape');
    assert.equal(closed, 1);
  });

  it('stops listening when the chart goes', () => {
    let closed = 0;
    const { unmount } = render(<Closer active close={() => { closed++; }} />);
    unmount();
    press('Escape');
    assert.equal(closed, 0);
  });

  it('closes with the chart\'s latest way of closing', () => {
    const calls: string[] = [];
    const { rerender } = render(<Closer active close={() => calls.push('old')} />);
    rerender(<Closer active close={() => calls.push('new')} />);
    press('Escape');
    assert.deepEqual(calls, ['new']);
  });
});

let plot: ReturnType<typeof useChartPointer>;
let hovered: (number | null)[] = [];

/** A plot 100 px wide whose points are the pointer's x; outside it there is no point. */
function Plot({ scrub }: { scrub: boolean }) {
  plot = useChartPointer((x) => (x >= 0 && x <= 100 ? x : null), (v) => { hovered.push(v); }, scrub);
  return null;
}
/** A pointer event as React hands it to the plot. */
const at = (pointerType: string, clientX: number, clientY = 0, pointerId = 1) => ({ pointerType, pointerId, clientX, clientY }) as PointerEvent;

describe('a mouse or pen on a chart', () => {
  beforeEach(() => { hovered = []; });

  it('shows the point it is pressed on and every point it moves over', () => {
    render(<Plot scrub={false} />);
    plot.onPointerDown(at('mouse', 20));
    plot.onPointerMove(at('mouse', 35));
    plot.onPointerMove(at('pen', 60));
    assert.deepEqual(hovered, [20, 35, 60]);
  });

  it('closes the read-out when it leaves the plot', () => {
    render(<Plot scrub={false} />);
    plot.onPointerMove(at('mouse', 35));
    plot.onPointerMove(at('mouse', 140));
    plot.onPointerDown(at('mouse', -5));
    assert.deepEqual(hovered, [35, null, null]);
  });

  it('changes nothing when it is released', () => {
    render(<Plot scrub={false} />);
    plot.onPointerUp(at('mouse', 35));
    assert.deepEqual(hovered, []);
  });

  it('does not end a touch that is under way when it is released', () => {
    render(<Plot scrub={false} />);
    plot.onPointerDown(at('touch', 40, 0, 1));
    plot.onPointerUp(at('mouse', 70, 0, 1));
    assert.deepEqual(hovered, []);
    plot.onPointerUp(at('touch', 40, 0, 1));
    assert.deepEqual(hovered, [40]);
  });
});

describe('a finger on a chart', () => {
  beforeEach(() => { hovered = []; });

  it('opens nothing on contact, and picks the point when it lifts without moving', () => {
    const { rerender } = render(<Plot scrub={false} />);
    plot.onPointerDown(at('touch', 40, 200));
    assert.deepEqual(hovered, []);
    // The chart is drawn again between the two: the touch is remembered.
    rerender(<Plot scrub={false} />);
    plot.onPointerMove(at('touch', 43, 203));
    plot.onPointerUp(at('touch', 43, 203));
    assert.deepEqual(hovered, [43]);
  });

  it('opens nothing when it scrolls the page', () => {
    render(<Plot scrub />);
    plot.onPointerDown(at('touch', 40, 200));
    plot.onPointerMove(at('touch', 42, 260));
    plot.onPointerMove(at('touch', 90, 260));
    plot.onPointerUp(at('touch', 90, 260));
    assert.deepEqual(hovered, []);
  });

  it('opens nothing when it drags sideways on a chart that scrolls sideways', () => {
    render(<Plot scrub={false} />);
    plot.onPointerDown(at('touch', 40, 200));
    plot.onPointerMove(at('touch', 70, 201));
    plot.onPointerMove(at('touch', 80, 201));
    plot.onPointerUp(at('touch', 80, 201));
    assert.deepEqual(hovered, []);
  });

  it('moves the read-out along a chart that does not scroll sideways', () => {
    render(<Plot scrub />);
    plot.onPointerDown(at('touch', 40, 200));
    plot.onPointerMove(at('touch', 70, 201));
    plot.onPointerMove(at('touch', 85, 230));
    assert.deepEqual(hovered, [70, 85]);
    plot.onPointerUp(at('touch', 85, 230));
    assert.deepEqual(hovered, [70, 85]);
  });

  it('keeps the last point when a scrub runs past the end of the plot', () => {
    render(<Plot scrub />);
    plot.onPointerDown(at('touch', 80, 200));
    plot.onPointerMove(at('touch', 99, 200));
    plot.onPointerMove(at('touch', 130, 200));
    assert.deepEqual(hovered, [99]);
  });

  it('picks nothing when lifted with no touch begun on the chart', () => {
    render(<Plot scrub />);
    plot.onPointerMove(at('touch', 50, 200));
    plot.onPointerUp(at('touch', 50, 200));
    assert.deepEqual(hovered, []);
  });

  it('picks a point for each of two taps, whichever fingers they are', () => {
    render(<Plot scrub={false} />);
    plot.onPointerDown(at('touch', 10, 0, 1));
    plot.onPointerUp(at('touch', 10, 0, 1));
    plot.onPointerDown(at('touch', 60, 0, 2));
    plot.onPointerUp(at('touch', 60, 0, 2));
    assert.deepEqual(hovered, [10, 60]);
  });

  it('leaves a pinch to the browser until the first finger lifts too', () => {
    render(<Plot scrub />);
    plot.onPointerDown(at('touch', 10, 0, 1));
    plot.onPointerDown(at('touch', 60, 0, 2));
    plot.onPointerUp(at('touch', 60, 0, 2));
    // The second finger comes back while the first is still down: still a pinch.
    plot.onPointerDown(at('touch', 60, 0, 2));
    plot.onPointerUp(at('touch', 60, 0, 2));
    plot.onPointerUp(at('touch', 10, 0, 1));
    assert.deepEqual(hovered, []);
    plot.onPointerDown(at('touch', 30, 0, 2));
    plot.onPointerUp(at('touch', 30, 0, 2));
    assert.deepEqual(hovered, [30]);
  });

  it('forgets a touch the browser cancels', () => {
    render(<Plot scrub={false} />);
    plot.onPointerDown(at('touch', 10, 0, 1));
    plot.onPointerCancel();
    plot.onPointerUp(at('touch', 10, 0, 1));
    assert.deepEqual(hovered, []);
    plot.onPointerDown(at('touch', 60, 0, 2));
    plot.onPointerUp(at('touch', 60, 0, 2));
    assert.deepEqual(hovered, [60]);
  });
});

let slot = -1;

function Slotted({ open, drawn = true }: { open: boolean; drawn?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  slot = useReadoutSlot(ref, open);
  return (
    <>
      {drawn && <ChartReadout title="Year 12" rows={ROWS} cardRef={ref} position={null} />}
      <ReadoutSlot height={slot} />
    </>
  );
}

describe('the slot the read-out leaves under a chart', () => {
  it('is not there before the read-out has been open', () => {
    card.height = 96;
    const { container } = render(<Slotted open={false} />);
    assert.equal(slot, 0);
    assert.ok(!container.querySelector('.chart-readoutSlot'));
  });

  it('takes the height of the open read-out, and keeps it when the read-out closes', () => {
    card.height = 96;
    const { container, rerender } = render(<Slotted open />);
    assert.equal(slot, 96);
    rerender(<Slotted open={false} />);
    assert.equal(slot, 96);
    const kept = container.querySelector<HTMLElement>('.chart-readoutSlot');
    assert.ok(kept);
    assert.equal(kept.style.height, '96px');
    assert.equal(kept.getAttribute('aria-hidden'), 'true');
    assert.equal(kept.textContent, '');
  });

  it('follows the read-out when it opens at another height', () => {
    card.height = 96;
    const { rerender } = render(<Slotted open />);
    card.height = 120;
    rerender(<Slotted open />);
    assert.equal(slot, 120);
  });

  it('keeps its height when the open read-out measures as nothing', () => {
    card.height = 96;
    const { rerender } = render(<Slotted open />);
    card.height = 0;
    rerender(<Slotted open />);
    assert.equal(slot, 96);
  });

  it('is not there, without complaint, when the read-out is open but not drawn', () => {
    const { container } = render(<Slotted open drawn={false} />);
    assert.equal(slot, 0);
    assert.ok(!container.querySelector('.chart-readoutSlot'));
  });
});
