import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * How many of a chart's drawing units make one `rem` on screen, so the text
 * inside an SVG grows with the reader's text size like the page around it
 * (#676; owner, Nov 21, 2026; council, Nov 21, 2026).
 *
 * A chart is drawn in a fixed number of units across (`width`, its viewBox)
 * and shown at whatever width its box has, so 16 units can be 12 px on a
 * phone and 21 px on a laptop, and never more at 200% or 400% text. This
 * measures the root font size and the drawing's rendered width, and returns
 * `rem = root × width / rendered`: a label drawn `0.875 * rem` units tall is
 * 0.875 rem on screen, whatever the screen and whatever the text size.
 *
 * The server, and the first drawing in the browser, assume the drawing is
 * shown at its own width at 16 px (`rem` = 16), so the page hydrates cleanly;
 * the real value follows at once. Measured after every drawing (the SVG can
 * arrive later), when the fonts arrive and when the drawing is resized. A
 * chart in a closed fold measures as nothing, and keeps the value it had.
 *
 * `scale` is the reader's text size against the default (root / 16): 2 at
 * 200%. Charts use it to thin their gridlines.
 */
export function useChartRem(svg: RefObject<SVGSVGElement | null>, width: number): { rem: number; scale: number } {
  const [state, setState] = useState({ rem: 16, scale: 1 });
  const measure = useRef(() => {});
  measure.current = () => {
    const el = svg.current;
    if (!el) return;
    const shown = el.getBoundingClientRect().width;
    if (!(shown > 1)) return;
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    // Rounded, so a sub-pixel change in the box does not redraw the chart.
    const rem = Math.round(((root * width) / shown) * 10) / 10;
    const scale = Math.round((root / 16) * 100) / 100;
    setState((prev) => (Math.abs(prev.rem - rem) < 0.15 && prev.scale === scale ? prev : { rem, scale }));
  };
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
    document.fonts?.ready.then(() => { if (live) measure.current(); });
    return () => {
      live = false;
      watched.current?.seen.disconnect();
      watched.current = null;
    };
  }, []);
  return state;
}

/**
 * The least a chart word may be drawn smaller, as a share of its size, to fit
 * (council, Nov 21 2026): chart text is 0.875 rem, and 0.75 rem is the
 * smallest any of it is drawn (the audit's floor). A word that would need
 * more is left out, never moved out of the drawing (owner, #676).
 */
export const FIT_FLOOR = 0.75 / 0.875;

/** Room a label needs across, before it can be measured: digits and letters at about 0.6 of their height. */
export function textWidth(text: string, size: number): number {
  return [...text].length * size * 0.6;
}

/**
 * Round steps for an axis (1, 2, 2.5 or 5 times a power of ten) covering `v`
 * in at most `max` steps: fewer gridlines as the text grows.
 */
export function niceSteps(v: number, max: number): { top: number; step: number; count: number } {
  const n = Math.max(1, Math.floor(max));
  if (!(v > 0)) return { top: n, step: 1, count: n };
  const raw = v / n;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * exp).find((s) => s >= raw - 1e-12) ?? 10 * exp;
  const count = Math.max(1, Math.ceil(v / step - 1e-9));
  return { top: step * count, step, count };
}

/**
 * The step between labels on an axis of whole numbers (years, say), from the
 * smallest of `steps` whose labels keep a gap of `gap` units: `spacing(step)`
 * is the distance between two labels, `widest` the widest label. When even
 * the largest step is too tight, the largest is returned and the caller keeps
 * the labels that fit.
 */
export function labelStep(steps: number[], spacing: (step: number) => number, widest: number, gap: number): number {
  return steps.find((s) => spacing(s) >= widest + gap) ?? steps[steps.length - 1];
}

/**
 * A line of words broken into lines no wider than `max` units, as `width`
 * measures them: an axis title that does not fit across a phone at
 * a large text size takes two lines rather than running off the drawing.
 */
export function wrapWords(text: string, max: number, width: (line: string) => number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && width(`${last} ${word}`) <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/**
 * How to anchor a label centred on `x` so it stays inside `[min, max]`: at
 * the start or the end of the drawing a centred label would be cut in half.
 */
export function edgeAnchor(x: number, width: number, min: number, max: number): 'start' | 'middle' | 'end' {
  if (x - width / 2 < min) return 'start';
  if (x + width / 2 > max) return 'end';
  return 'middle';
}

/**
 * Which of a row of labels to draw, and how to anchor each: every label is
 * centred on its `x` unless that would cut it at an edge, and a label that
 * would come within `gap` of the one kept before it is left out. The last
 * label is preferred to the one before it, so an axis keeps its end.
 */
export function placeLabels(xs: number[], widths: number[], min: number, max: number, gap: number): { i: number; anchor: 'start' | 'middle' | 'end' }[] {
  const span = (i: number) => {
    const anchor = edgeAnchor(xs[i], widths[i], min, max);
    const left = Math.max(min, anchor === 'start' ? xs[i] : anchor === 'end' ? xs[i] - widths[i] : xs[i] - widths[i] / 2);
    return { i, anchor, left, right: left + widths[i] };
  };
  const kept: ReturnType<typeof span>[] = [];
  for (let i = 0; i < xs.length; i++) {
    const s = span(i);
    if (s.right > max + 0.5) continue;
    const clash = (k: ReturnType<typeof span> | undefined) => !!k && s.left < k.right + gap;
    if (clash(kept[kept.length - 1])) {
      // The last label replaces the one before it, if that makes room.
      if (i !== xs.length - 1 || kept.length < 2 || clash(kept[kept.length - 2])) continue;
      kept.pop();
    }
    kept.push(s);
  }
  return kept.map(({ i, anchor }) => ({ i, anchor }));
}
