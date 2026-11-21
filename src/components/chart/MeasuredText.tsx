import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { textWidth } from './useChartRem.ts';

/** One piece of chart text to measure: the class it is drawn with, its words, and its size in drawing units. */
export interface Sample {
  cls: string;
  text: string;
  size: number;
}

const keyOf = ({ cls, text, size }: Sample) => `${cls}|${Math.round(size * 10)}|${text}`;

/** The samples once each, in a fixed order. */
function unique(samples: Sample[]): Sample[] {
  const seen = new Set<string>();
  return samples.filter((s) => {
    const k = keyOf(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * The widths of chart labels as the browser draws them, in drawing units
 * (#676). A label's width decides whether it fits (an end label's gutter, an
 * axis title that has to wrap), and an estimate from its length is wrong for
 * Devanagari, bold figures and long words. Every sample is drawn unseen by
 * `<MeasureSamples>` inside the same SVG, measured after each drawing, and
 * the estimate stands in until then (and on the server). Unchanged widths keep
 * the same state, so this settles at once.
 *
 * The unseen copies are found by their position (`data-sample` is a number):
 * a label's words, which can hold an amount the reader typed, never go into
 * an attribute (CLAUDE.md, "Free Tools Keep Inputs Out of URLs", rule 4).
 */
export function useMeasuredText(svg: RefObject<SVGSVGElement | null>, samples: Sample[]): { width: (sample: Sample) => number; list: Sample[] } {
  const list = unique(samples);
  const listRef = useRef(list);
  listRef.current = list;
  const [widths, setWidths] = useState<Record<string, number>>({});
  const measure = useRef(() => {});
  measure.current = () => {
    const el = svg.current;
    if (!el) return;
    const next: Record<string, number> = {};
    for (const t of el.querySelectorAll<SVGTextElement>('text[data-sample]')) {
      const s = listRef.current[Number(t.dataset.sample)];
      if (!s) continue;
      try {
        const w = t.getBBox().width;
        if (w > 0) next[keyOf(s)] = w;
      } catch { /* not rendered */ }
    }
    const keys = Object.keys(next);
    // A hidden chart measures as nothing: what was measured before stays.
    if (keys.length === 0) return;
    setWidths((prev) => (keys.every((k) => Math.abs((prev[k] ?? -9) - next[k]) < 0.5) ? prev : { ...prev, ...next }));
  };
  useLayoutEffect(() => measure.current());
  useLayoutEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => { if (live) measure.current(); });
    return () => { live = false; };
  }, []);
  return {
    width: (s) => widths[keyOf(s)] ?? textWidth(s.text, s.size) * (/\p{Script=Devanagari}/u.test(s.text) ? 1.2 : 1),
    list,
  };
}

/** The samples, drawn unseen in the chart so `useMeasuredText` can measure them. */
export function MeasureSamples({ list }: { list: Sample[] }) {
  return (
    <g aria-hidden="true" visibility="hidden" className="chart-measure">
      {list.map((s, i) => (
        <text key={keyOf(s)} data-sample={i} className={s.cls} x={0} y={0} style={{ fontSize: s.size }}>{s.text}</text>
      ))}
    </g>
  );
}
