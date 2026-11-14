/**
 * The value readout shared by the free tools' interactive charts: a card
 * that lists the values at the point the reader picked (by pointer, tap or
 * arrow keys).
 *
 * On wide screens it floats beside the crosshair, flipped and clamped so it
 * stays inside the plotted area and never covers end labels; on phones,
 * where charts scroll sideways, global.css stacks it under the chart at full
 * width. It is aria-hidden: each chart announces the same values through its
 * own live region.
 */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { touchEndIsTap, touchMove, touchDown, type Touch } from '../../utils/shared/chartTouch.ts';

export interface ReadoutRow {
  label: string;
  value: string;
  /** Swatch shape: a dot for a point on a line, a block for a band. */
  swatch: 'dot' | 'band' | 'dash';
  /** Any CSS colour, including var(--token) and color-mix(). */
  color: string;
  strong?: boolean;
}

interface Props {
  title: string;
  tag?: string | null;
  rows: ReadoutRow[];
  cardRef: RefObject<HTMLDivElement | null>;
  position: ReadoutPosition | null;
}

export interface ReadoutPosition {
  left: number;
  top: number;
}

export function ChartReadout({ title, tag, rows, cardRef, position }: Props) {
  return (
    <div
      className="chart-readout"
      ref={cardRef}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position === null ? 'hidden' : undefined }}
      aria-hidden="true"
    >
      <div className="chart-readoutTitle">
        {title}
        {tag && <span className="chart-readoutTag">{tag}</span>}
      </div>
      <dl>
        {rows.map((r) => (
          <div key={r.label} className={r.strong ? 'chart-readoutStrong' : undefined}>
            <dt>
              <i className={`chart-swatch chart-swatch--${r.swatch}`} style={{ color: r.color }} />
              {r.label}
            </dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Places the readout beside the crosshair. `anchorFrac` is the crosshair's x
 * as a fraction of the SVG width; `limitFrac` is the right edge the card may
 * not cross (the end of the plotted area), as a fraction of the SVG width.
 * Returns the card's offset within the figure: level with the top of the
 * chart, so it never covers a legend above it. Null before measuring.
 */
export function useReadoutPlacement(
  figureRef: RefObject<HTMLElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  cardRef: RefObject<HTMLDivElement | null>,
  anchorFrac: number | null,
  limitFrac: number,
): ReadoutPosition | null {
  const [pos, setPos] = useState<ReadoutPosition | null>(null);

  useEffect(() => {
    if (anchorFrac === null) setPos(null);
  }, [anchorFrac]);

  useLayoutEffect(() => {
    const fig = figureRef.current;
    const card = cardRef.current;
    const svg = svgRef.current;
    if (anchorFrac === null || !fig || !card || !svg) return;
    const figRect = fig.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const offset = svgRect.left - figRect.left;
    const anchor = offset + anchorFrac * svgRect.width;
    const limit = offset + limitFrac * svgRect.width;
    const cw = card.offsetWidth;
    let x = anchor + 14;
    if (x + cw > limit) x = anchor - 14 - cw;
    setPos({ left: Math.max(0, Math.min(x, fig.clientWidth - cw)), top: svgRect.top - figRect.top + 8 });
  }, [figureRef, svgRef, cardRef, anchorFrac, limitFrac]);

  return pos;
}

/** Closes a chart's readout on Escape wherever focus is (WCAG 1.4.13). */
export function useEscapeToClose(active: boolean, close: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);
}

/**
 * Pointer handlers for a chart's plot. A mouse or pen shows the read-out
 * where it points. A finger opens it on a tap, never on contact, so a scroll
 * that starts on the chart opens nothing; where the chart does not scroll
 * sideways (`scrub`), a sideways drag moves the read-out along it (#479).
 * `at` turns a pointer's x into the chart's point, null outside the plot.
 */
export function useChartPointer(at: (clientX: number) => number | null, setHover: (v: number | null) => void, scrub: boolean) {
  const touch = useRef<Touch | null>(null);
  return {
    onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') setHover(at(e.clientX));
      else touch.current = touchDown(touch.current, e.pointerId, e.clientX, e.clientY);
    },
    onPointerMove(e: PointerEvent) {
      if (e.pointerType !== 'touch') {
        setHover(at(e.clientX));
        return;
      }
      const next = touchMove(touch.current, e.pointerId, e.clientX, e.clientY, scrub);
      touch.current = next.touch;
      // A scrub keeps the last point when the finger runs past the plot's end.
      if (next.follow) {
        const v = at(e.clientX);
        if (v !== null) setHover(v);
      }
    },
    onPointerUp(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      if (touchEndIsTap(touch.current, e.pointerId)) setHover(at(e.clientX));
      // The tracked finger lifting ends the gesture; another finger of a pinch
      // lifting leaves it ignored until the first one lifts too.
      if (touch.current?.id === e.pointerId) touch.current = null;
    },
    onPointerCancel() {
      touch.current = null;
    },
  };
}

/**
 * The height the read-out last had, kept as an empty slot while it is closed.
 * On phones the read-out sits under the chart, so opening it pushes the page
 * down; with the slot that happens once, not on every open and close (#479).
 * global.css shows the slot on phones only.
 */
export function useReadoutSlot(cardRef: RefObject<HTMLDivElement | null>, open: boolean): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const h = open ? cardRef.current?.offsetHeight ?? 0 : 0;
    if (h > 0) setHeight((was) => (was === h ? was : h));
  });
  return height;
}

export function ReadoutSlot({ height }: { height: number }) {
  return height > 0 ? <div className="chart-readoutSlot" style={{ height }} aria-hidden="true" /> : null;
}
