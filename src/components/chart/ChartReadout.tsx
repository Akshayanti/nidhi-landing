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
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

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
