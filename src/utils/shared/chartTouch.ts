/**
 * How a finger on a chart is read (#479).
 *
 * A mouse shows the read-out wherever it points. A finger is different: the
 * same contact may be the start of a scroll, a tap or a drag along the chart,
 * and which one is only known once the finger has moved or lifted. So a touch
 * opens nothing on contact:
 * - lifted without moving: a tap, which picks the point under it;
 * - moved up or down first: a scroll, which the page handles and the chart
 *   ignores;
 * - moved sideways first: a scrub along the chart, where the chart does not
 *   scroll sideways itself (`scrub`), otherwise a scroll of the chart.
 */

/** A finger may wander this far, in CSS pixels, and still count as a tap. */
export const TAP_SLOP = 10;

export interface Touch {
  id: number;
  x: number;
  y: number;
  mode: 'pending' | 'scrub' | 'ignore';
}

export function touchStart(id: number, x: number, y: number): Touch {
  return { id, x, y, mode: 'pending' };
}

/** The touch after a move, and whether the chart should follow the finger. */
export function touchMove(t: Touch | null, id: number, x: number, y: number, scrub: boolean): { touch: Touch | null; follow: boolean } {
  if (!t || t.id !== id || t.mode === 'ignore') return { touch: t, follow: false };
  if (t.mode === 'scrub') return { touch: t, follow: true };
  const dx = Math.abs(x - t.x);
  const dy = Math.abs(y - t.y);
  if (Math.max(dx, dy) < TAP_SLOP) return { touch: t, follow: false };
  const mode = scrub && dx > dy ? 'scrub' : 'ignore';
  return { touch: { ...t, mode }, follow: mode === 'scrub' };
}

/** Whether lifting this finger was a tap. */
export function touchEndIsTap(t: Touch | null, id: number): boolean {
  return !!t && t.id === id && t.mode === 'pending';
}
