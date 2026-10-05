import { useLayoutEffect } from "react";
import { useCurrentFrame } from "remotion";

const MIN_VISIBLE_OPACITY = 0.05;
const TEXT_OVERLAP_OPACITY = 0.98;
const MIN_TEXT_OVERLAP_PX = 4;
const MIN_TEXT_OVERLAP_RATIO = 0.2;
const EDGE_TOLERANCE = 1;

type Bounds = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

function composedParent(element: Element) {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function effectiveOpacity(element: Element) {
  if (!element.isConnected) return 0;
  let opacity = 1;
  let current: Element | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      current.hasAttribute("hidden")
      || current.getAttribute("aria-hidden") === "true"
      || style.display === "none"
      || style.visibility === "hidden"
      || style.visibility === "collapse"
      || style.getPropertyValue("content-visibility") === "hidden"
    ) return 0;
    const value = Number.parseFloat(style.opacity || "1");
    if (Number.isFinite(value)) opacity *= value;
    if (opacity <= MIN_VISIBLE_OPACITY) return opacity;
    current = composedParent(current);
  }
  return opacity;
}

function isPainted(element: Element) {
  if (effectiveOpacity(element) <= MIN_VISIBLE_OPACITY) return false;
  const visibilityCheck = (element as Element & {
    checkVisibility?: (options?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
  }).checkVisibility;
  if (visibilityCheck && !visibilityCheck.call(element, { checkOpacity: true, checkVisibilityCSS: true })) return false;
  return element.getClientRects().length > 0;
}

function carriesText(element: Element) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

function intersects(a: Bounds, b: Bounds) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function meaningfulTextIntersection(a: Bounds, b: Bounds) {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (width < MIN_TEXT_OVERLAP_PX || height < MIN_TEXT_OVERLAP_PX) return false;
  const overlapArea = width * height;
  const smallerArea = Math.min(a.width * a.height, b.width * b.height);
  return smallerArea > 0 && overlapArea / smallerArea >= MIN_TEXT_OVERLAP_RATIO;
}

function normalizedDirectText(element: Element) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameTextBlock(a: HTMLElement, b: HTMLElement) {
  // Separate direct-text children of one wrapper are commonly deliberate
  // headline lines. Their tight line-height can make browser line rectangles
  // touch even though the glyphs remain legible.
  return a.parentElement !== null && a.parentElement === b.parentElement;
}

function clipsAxis(value: string) {
  return value === "hidden" || value === "clip" || value === "scroll" || value === "auto";
}

function clippingAncestor(element: Element, surface: Element, rect: Bounds) {
  let ancestor = composedParent(element);
  while (ancestor && ancestor !== surface) {
    const style = window.getComputedStyle(ancestor);
    // SVG viewports are checked in their own coordinate system below. Mixing
    // getScreenCTM() with DOM rectangles is unreliable when Remotion scales
    // the composition during rendering.
    const clipsX = !(ancestor instanceof SVGElement) && clipsAxis(style.overflowX);
    const clipsY = !(ancestor instanceof SVGElement) && clipsAxis(style.overflowY);
    if (clipsX || clipsY) {
      const clip = ancestor.getBoundingClientRect();
      const clippedX = clipsX && (rect.left < clip.left - EDGE_TOLERANCE || rect.right > clip.right + EDGE_TOLERANCE);
      const clippedY = clipsY && (rect.top < clip.top - EDGE_TOLERANCE || rect.bottom > clip.bottom + EDGE_TOLERANCE);
      if (clippedX || clippedY) return ancestor;
    }
    ancestor = composedParent(ancestor);
  }
  return null;
}

function directTextBounds(element: HTMLElement): Bounds | null {
  const rects: DOMRect[] = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    rects.push(...Array.from(range.getClientRects()));
    range.detach();
  }
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function directTextRects(element: HTMLElement) {
  const rects: DOMRect[] = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    rects.push(...Array.from(range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1));
    range.detach();
  }
  return rects;
}

function renderedTextBounds(element: HTMLElement, surface: HTMLElement): Bounds | null {
  if (effectiveOpacity(element) < TEXT_OVERLAP_OPACITY) return null;
  let rect = element.getBoundingClientRect();
  let left = rect.left;
  let right = rect.right;
  let top = rect.top;
  let bottom = rect.bottom;

  // getBoundingClientRect includes every CSS transform in the ancestor chain.
  // Intersect it with the visible portion of each clipping ancestor so text
  // outside an overflow viewport cannot collide with something on screen.
  let current: Element | null = element;
  while (current && current !== surface) {
    const style = window.getComputedStyle(current);
    if (
      current.hasAttribute("hidden")
      || current.getAttribute("aria-hidden") === "true"
      || style.display === "none"
      || style.visibility === "hidden"
      || style.visibility === "collapse"
      || style.getPropertyValue("content-visibility") === "hidden"
    ) return null;
    const clip = current.getBoundingClientRect();
    if (clipsAxis(style.overflowX)) {
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
    }
    if (clipsAxis(style.overflowY)) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
    current = composedParent(current);
  }

  rect = surface.getBoundingClientRect();
  left = Math.max(left, rect.left);
  right = Math.min(right, rect.right);
  top = Math.max(top, rect.top);
  bottom = Math.min(bottom, rect.bottom);
  if (right - left < 1 || bottom - top < 1) return null;
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function backgroundAlpha(element: Element) {
  const value = window.getComputedStyle(element).backgroundColor.trim().toLowerCase();
  if (!value || value === "transparent") return 0;
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return 1;
  const parts = rgba[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? Number.parseFloat(parts[3]) || 0 : 1;
}

function opaqueCoverAtPoint(element: HTMLElement, surface: HTMLElement, x: number, y: number) {
  const stack = document.elementsFromPoint(x, y);
  for (const candidate of stack) {
    if (candidate === element || element.contains(candidate)) return null;
    if (candidate.contains(element)) continue;
    if (!surface.contains(candidate) || !isPainted(candidate)) continue;
    if (candidate.closest("[data-reel-chrome]")) continue;
    if (backgroundAlpha(candidate) >= 0.92) return candidate;
  }
  return null;
}

function opaqueTextCover(element: Element, surface: HTMLElement) {
  if (!(element instanceof HTMLElement)) return null;
  for (const rect of directTextRects(element)) {
    const inset = Math.min(2, rect.width / 8);
    const y = rect.top + rect.height / 2;
    const points = [rect.left + inset, rect.left + rect.width / 2, rect.right - inset];
    const covers = points
      .map((x) => opaqueCoverAtPoint(element, surface, x, y))
      .filter((candidate): candidate is Element => Boolean(candidate));
    // Three samples avoid reporting a decorative edge or a small badge as
    // hidden copy. If most of a laid-out text line is behind an opaque sibling,
    // the frame is not legible and must fail.
    if (covers.length >= 2) return covers[0];
  }
  return null;
}

function textClippingAncestor(element: Element, surface: Element) {
  if (!(element instanceof HTMLElement)) return null;
  const textRect = directTextBounds(element);
  if (!textRect) return null;

  // Measure the actual laid-out text range against every clipping boundary.
  // scrollWidth and scrollHeight are unsuitable here: a tight line-height can
  // make them exceed an element by a few pixels even when every glyph remains
  // safely inside the card that clips its background.
  let current: Element | null = element;
  while (current && current !== surface) {
    const style = window.getComputedStyle(current);
    const clipsX = clipsAxis(style.overflowX);
    const clipsY = clipsAxis(style.overflowY);
    if (clipsX || clipsY) {
      const clip = current.getBoundingClientRect();
      const clippedX = clipsX && (textRect.left < clip.left - EDGE_TOLERANCE || textRect.right > clip.right + EDGE_TOLERANCE);
      const clippedY = clipsY && (textRect.top < clip.top - EDGE_TOLERANCE || textRect.bottom > clip.bottom + EDGE_TOLERANCE);
      if (clippedX || clippedY) return current;
    }
    current = composedParent(current);
  }
  return null;
}

function svgViewportViolation(element: Element) {
  if (!(element instanceof SVGGraphicsElement)) return null;
  const svg = element.ownerSVGElement;
  if (!svg) return null;

  try {
    const elementToScreen = element.getScreenCTM();
    const svgToScreen = svg.getScreenCTM();
    if (!elementToScreen || !svgToScreen) return null;

    // Map the text's un-clipped geometry back into the root SVG viewBox. The
    // outer player scale cancels out, so this remains correct in preview,
    // still renders and full video renders.
    const elementToViewBox = svgToScreen.inverse().multiply(elementToScreen);
    const box = element.getBBox();
    const corners = [
      new DOMPoint(box.x, box.y),
      new DOMPoint(box.x + box.width, box.y),
      new DOMPoint(box.x, box.y + box.height),
      new DOMPoint(box.x + box.width, box.y + box.height),
    ].map((point) => point.matrixTransform(elementToViewBox));
    const left = Math.min(...corners.map((point) => point.x));
    const right = Math.max(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.y));
    const bottom = Math.max(...corners.map((point) => point.y));
    const viewBox = svg.viewBox.baseVal;
    const viewLeft = viewBox.width > 0 ? viewBox.x : 0;
    const viewTop = viewBox.height > 0 ? viewBox.y : 0;
    const viewRight = viewBox.width > 0 ? viewBox.x + viewBox.width : svg.clientWidth;
    const viewBottom = viewBox.height > 0 ? viewBox.y + viewBox.height : svg.clientHeight;

    if (
      left < viewLeft - EDGE_TOLERANCE
      || top < viewTop - EDGE_TOLERANCE
      || right > viewRight + EDGE_TOLERANCE
      || bottom > viewBottom + EDGE_TOLERANCE
    ) return svg;
  } catch {
    // Some SVG nodes expose no geometry while mounting. They are ignored
    // until the next frame, when the browser has laid them out.
  }
  return null;
}

function description(element: Element) {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 72) || element.tagName.toLowerCase();
}

/**
 * Render-time safety check for reel text.
 *
 * BrandBackground marks each active visual surface. SeriesChip and
 * SubtitleCaption mark fixed chrome. On every rendered frame this guard checks
 * visible text against fixed chrome, opaque sibling surfaces, overflow
 * clipping ancestors and SVG viewports. SVG clipping is measured in viewBox
 * coordinates so Remotion's outer render scale cannot create false positives.
 */
export function ReelLayoutGuard() {
  const frame = useCurrentFrame();

  useLayoutEffect(() => {
    const surfaces = Array.from(document.querySelectorAll<HTMLElement>("[data-reel-surface]"));
    const chrome = Array.from(document.querySelectorAll<HTMLElement>("[data-reel-chrome]"))
      .filter(isPainted)
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }));
    const issues = new Set<string>();

    for (const surface of surfaces) {
      if (!isPainted(surface)) continue;
      const candidates = Array.from(surface.querySelectorAll<HTMLElement | SVGElement>("*"));

      for (const element of candidates) {
        if (element.closest("[data-reel-chrome]")) continue;
        if (!carriesText(element) || !isPainted(element)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 0.5 || rect.height < 0.5) continue;
        const label = description(element);

        const clippingParent = clippingAncestor(element, surface, rect);
        if (clippingParent) {
          issues.add(`“${label}” is clipped by ${clippingParent.tagName.toLowerCase()}`);
        }

        const textClip = textClippingAncestor(element, surface);
        if (textClip && textClip !== clippingParent) {
          issues.add(`“${label}” has text clipped by ${textClip.tagName.toLowerCase()}`);
        }

        const svgViewport = svgViewportViolation(element);
        if (svgViewport) {
          issues.add(`“${label}” is clipped by svg viewBox`);
        }

        const opaqueCover = opaqueTextCover(element, surface);
        if (opaqueCover) {
          issues.add(`“${label}” is covered by opaque ${opaqueCover.tagName.toLowerCase()}`);
        }

        for (const item of chrome) {
          if (intersects(rect, item.rect)) {
            issues.add(`“${label}” overlaps ${item.element.dataset.reelChrome ?? "fixed chrome"}`);
          }
        }
      }

      const textEntries = candidates
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => !element.closest("[data-reel-chrome]") && carriesText(element) && isPainted(element))
        // Transitional layers routinely cross while entering and leaving.
        // A collision only matters once both pieces of copy are fully visible.
        .filter((element) => effectiveOpacity(element) >= TEXT_OVERLAP_OPACITY)
        .map((element) => ({
          element,
          rects: [renderedTextBounds(element, surface)].filter((rect): rect is Bounds => Boolean(rect)),
          label: description(element),
          text: normalizedDirectText(element),
        }))
        .filter((entry) => entry.rects.length > 0);

      for (let first = 0; first < textEntries.length; first += 1) {
        for (let second = first + 1; second < textEntries.length; second += 1) {
          const a = textEntries[first];
          const b = textEntries[second];
          if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
          if (sameTextBlock(a.element, b.element)) continue;
          // Tool-to-CTA cross fades can briefly mount the same card twice.
          if (a.text && a.text === b.text) continue;
          const overlaps = a.rects.some((aRect) => b.rects.some((bRect) => meaningfulTextIntersection(aRect, bRect)));
          if (overlaps) issues.add(`“${a.label}” overlaps text “${b.label}”`);
        }
      }
    }

    if (issues.size > 0) {
      throw new Error(`REEL LAYOUT FAILED at frame ${frame}\n${Array.from(issues).map((issue) => `  ${issue}`).join("\n")}`);
    }
  }, [frame]);

  return null;
}
