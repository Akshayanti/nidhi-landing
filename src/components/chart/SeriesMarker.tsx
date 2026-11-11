/**
 * The shape that goes with a chart series, so colour is never the only thing
 * that tells two series apart (WCAG 1.4.1). A series keeps one shape wherever
 * it appears: on the chart, in the legend, beside its name on a card.
 *
 * Slots follow CHART_SERIES in src/styles/palette.ts:
 *   1 to 5   filled circle, square, triangle, diamond, cross
 *   6 to 10  the same five as outlines (on a line chart these are the dashed lines)
 *   11       a plus
 *
 * The shapes carry no text and no data: every one is decorative
 * (aria-hidden), because the name or the letter always stands beside it.
 */
import type { CSSProperties } from 'react';

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'plus';

const SHAPES: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond', 'cross'];

/** How many series have a marker of their own before the shapes repeat. */
export const SERIES_MARKER_COUNT = 11;

/** The shape of a series slot (0-based), and whether it is drawn as an outline. */
export function seriesMarker(index: number): { shape: MarkerShape; hollow: boolean } {
  const i = ((index % SERIES_MARKER_COUNT) + SERIES_MARKER_COUNT) % SERIES_MARKER_COUNT;
  if (i === 10) return { shape: 'plus', hollow: false };
  return { shape: SHAPES[i % 5], hollow: i >= 5 };
}

const n = (v: number) => Number(v.toFixed(2));

interface GlyphProps {
  /** Series slot, 0-based. */
  index: number;
  cx: number;
  cy: number;
  /** Half the marker's width. */
  r: number;
  /** Any CSS colour, including var(--token). */
  color: string;
  /** A line in this colour behind the marker, so it stands clear of what it sits on. */
  halo?: string;
  className?: string;
}

/**
 * One marker, for use inside an <svg>. Colours go through `style` so a
 * var(--token) resolves in every browser.
 */
export function MarkerGlyph({ index, cx, cy, r, color, halo, className }: GlyphProps) {
  const { shape, hollow } = seriesMarker(index);
  const line = n(Math.max(1.5, r * 0.42));
  const draw = (style: CSSProperties, key: string, grow = 0) => {
    const stroked = shape === 'cross' || shape === 'plus';
    if (stroked) {
      const a = r * (shape === 'cross' ? 0.78 : 1);
      const d =
        shape === 'cross'
          ? `M${n(cx - a)} ${n(cy - a)} L${n(cx + a)} ${n(cy + a)} M${n(cx + a)} ${n(cy - a)} L${n(cx - a)} ${n(cy + a)}`
          : `M${n(cx - a)} ${n(cy)} L${n(cx + a)} ${n(cy)} M${n(cx)} ${n(cy - a)} L${n(cx)} ${n(cy + a)}`;
      return (
        <g key={key}>
          <path d={d} style={{ ...style, fill: 'none', strokeWidth: n(line * 1.25 + grow), strokeLinecap: 'round' }} />
          {/* An outlined cross is a cross in a ring: a cross has no inside to leave empty. */}
          {hollow && <circle cx={n(cx)} cy={n(cy)} r={n(r * 1.15)} style={{ ...style, fill: 'none', strokeWidth: n(line * 0.8 + grow) }} />}
        </g>
      );
    }
    const s = { ...style, strokeWidth: n((hollow ? line : 0) + grow), strokeLinejoin: 'round' as const };
    const q = hollow ? r - line / 2 : r;
    if (shape === 'circle') return <circle key={key} cx={n(cx)} cy={n(cy)} r={n(q)} style={s} />;
    if (shape === 'square') return <rect key={key} x={n(cx - q * 0.88)} y={n(cy - q * 0.88)} width={n(q * 1.76)} height={n(q * 1.76)} style={s} />;
    if (shape === 'triangle') return <path key={key} d={`M${n(cx)} ${n(cy - q * 1.05)} L${n(cx + q * 1.05)} ${n(cy + q * 0.85)} L${n(cx - q * 1.05)} ${n(cy + q * 0.85)} Z`} style={s} />;
    return <path key={key} d={`M${n(cx)} ${n(cy - q * 1.15)} L${n(cx + q * 1.15)} ${n(cy)} L${n(cx)} ${n(cy + q * 1.15)} L${n(cx - q * 1.15)} ${n(cy)} Z`} style={s} />;
  };
  const filled = !hollow && shape !== 'cross' && shape !== 'plus';
  return (
    <g className={className}>
      {halo && draw({ stroke: halo, fill: filled ? halo : 'none' }, 'halo', 3)}
      {draw({ stroke: color, fill: filled ? color : 'none' }, 'mark')}
    </g>
  );
}

interface MarkerProps {
  /** Series slot, 0-based. */
  index: number;
  /** Any CSS colour, including var(--token). */
  color: string;
  /** Width and height in CSS pixels. */
  size?: number;
  className?: string;
}

/** A marker on its own, to stand beside a series' name. Decorative. */
export function SeriesMarker({ index, color, size = 14, className }: MarkerProps) {
  return (
    <svg
      className={className ? `chart-marker ${className}` : 'chart-marker'}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <MarkerGlyph index={index} cx={8} cy={8} r={6} color={color} />
    </svg>
  );
}
