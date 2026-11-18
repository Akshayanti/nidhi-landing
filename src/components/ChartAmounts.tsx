import { createContext, useContext, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useMoney } from './useMoney.ts';
import {
  amountScale,
  axisHeading,
  axisTick,
  chartLabel,
  type AmountScale,
  type ChartWords,
} from '../utils/shared/chartAmounts.ts';

/**
 * The words a chart writes amounts with (the tools' shared catalog, `chart`).
 * A tool sets it once at its root, like `AmountLocaleContext`.
 */
export const ChartWordsContext = createContext<ChartWords | null>(null);

/**
 * How this page's charts write amounts (`chartAmounts.ts`): `axis(max, code)`
 * for an axis, whose heading names the unit once and whose gridlines carry
 * bare numbers, and `label(value, code)` for a figure that stands alone.
 */
export function useChartAmounts() {
  const words = useContext(ChartWordsContext);
  const { amountLocale, formatAmount } = useMoney();
  return {
    axis(max: number, code: string): { scale: AmountScale; heading: string; tick: (v: number) => string } {
      const scale = amountScale(max, code, amountLocale);
      return {
        scale,
        // Without the words (a chart drawn outside a tool) the gridlines keep full amounts.
        heading: words ? axisHeading(words, scale, code, amountLocale) : '',
        tick: (v) => (words ? axisTick(v, scale, code, amountLocale) : formatAmount(v, code)),
      };
    },
    label: (value: number, code: string) => (words ? chartLabel(value, code, words, amountLocale) : formatAmount(value, code, true)),
  };
}

/** The line above a chart that names what its amounts are counted in. */
export function ChartUnit({ children }: { children: string }) {
  return children ? <p className="tool-chartUnit">{children}</p> : null;
}

/**
 * The room a chart's amount labels need on its left, measured from the labels
 * as drawn (#521): a margin sized for "€2.5M" cut the front off "1,5 mil. Kč".
 *
 * `selector` picks the labels inside the SVG; `estimate` is the room given
 * before the first measurement (and on the server); `gap` is what sits between
 * a label and the plot; `right` is what the chart keeps on its other side.
 * Measured after every drawing (the figures, the currency, the language's
 * words or the chart's size may have changed), when the fonts arrive, and
 * when the chart is shown or resized: a chart in a closed fold or another tab
 * measures as nothing until then. An unchanged width changes nothing, so this
 * settles at once.
 *
 * When the labels would leave the plot less than `plot` of the chart's width,
 * they go inside the plot instead, above their gridlines (`inside`), and the
 * margin falls back to `least`: a plot squeezed into a third of a phone shows
 * nothing.
 */
export function useAxisMargin(
  svg: RefObject<SVGSVGElement | null>,
  selector: string,
  { estimate, gap, least, width, right = 0, plot = 0.6 }: { estimate: number; gap: number; least: number; width: number; right?: number; plot?: number },
): { left: number; inside: boolean } {
  const [widest, setWidest] = useState<number | null>(null);
  const measure = useRef(() => {});
  measure.current = () => {
    const el = svg.current;
    if (!el) return;
    let w = 0;
    for (const t of el.querySelectorAll<SVGTextElement>(selector)) {
      try { w = Math.max(w, t.getBBox().width); } catch { /* not rendered */ }
    }
    if (w > 0) setWidest((prev) => (prev !== null && Math.abs(prev - w) < 0.5 ? prev : w));
  };
  // The SVG can arrive after the first drawing (a chart with nothing to draw
  // yet), so the element being watched is checked after every drawing.
  const watched = useRef<{ el: SVGSVGElement; seen: ResizeObserver } | null>(null);
  useLayoutEffect(() => {
    const el = svg.current;
    if (watched.current && watched.current.el !== el) {
      watched.current.seen.disconnect();
      watched.current = null;
    }
    if (el && !watched.current && typeof ResizeObserver !== 'undefined') {
      const seen = new ResizeObserver(() => measure.current());
      seen.observe(el);
      watched.current = { el, seen };
    }
    measure.current();
  });
  useLayoutEffect(() => {
    let live = true;
    // The web font arrives after the first paint and is a different width.
    document.fonts?.ready.then(() => { if (live) measure.current(); });
    return () => {
      live = false;
      watched.current?.seen.disconnect();
      watched.current = null;
    };
  }, []);
  const needed = Math.ceil((widest ?? estimate) + gap);
  if (width - needed - right < width * plot) return { left: least, inside: true };
  return { left: Math.max(least, needed), inside: false };
}
