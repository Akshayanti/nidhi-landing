/**
 * Keeps the box a reader is typing in where it is, when a part of the page
 * above it changes height because of what is typed (#827).
 *
 * A key can change something above the box: the example note goes, a fold's
 * status line hides, an offer's results give way to an error or gain a note.
 * The box then moved under the reader's eyes, by up to 700 px at large text,
 * and could leave the screen in the middle of a word.
 *
 * `steadyAbove(region)` watches one such part. While the focus is on
 * something after the region in the page:
 * - a region that would get shorter keeps its height (a `min-height`), so
 *   nothing below it moves up;
 * - a region that gets taller moves the page by as far as the box went down,
 *   so the box stays where it was on the screen. Its content is never held
 *   back: an error shows at once.
 * When the focus leaves that box the height is let go. If a pointer is down
 * at that moment, letting go waits until it is up and its click has been
 * sent: a page that moved between the press and the release would put the
 * click on something else.
 *
 * Nothing here relies on the browser keeping the page still by itself
 * (scroll anchoring): Safari does not. Where a browser does, the page must not
 * be moved twice, so the move is measured on the box, not worked out from the
 * region: where the box is now against where it was when the page last
 * settled or scrolled. The region's height is read from the page after each
 * change; `settle` is called once the change is drawn (`useSteadyAbove` in
 * toolShared.tsx does it after every render).
 */
export interface Steady {
  /** The region's content may have changed: hold, move the page, or neither. */
  settle(): void;
  /** Stop watching, and let go of any height held. */
  stop(): void;
}

/** What `steadyAbove` needs of the window: tests hand in their own. */
export type SteadyWindow = Pick<Window, 'scrollBy' | 'setTimeout'>;

const FOCUS_EVENTS = ['focusin', 'focusout'] as const;
const RELEASE_EVENTS = ['pointerup', 'pointercancel'] as const;

export function steadyAbove(region: HTMLElement, win: SteadyWindow = window): Steady {
  const doc = region.ownerDocument;
  /** What the reader is on, when it comes after the region; the hold is for it. */
  let box: Element | null = null;
  /** The region's height as the reader last saw it while on that box. */
  let shown = 0;
  /** Where that box's top was on the screen when the page last settled or scrolled. */
  let at = 0;
  let pressed = false;

  const height = () => region.getBoundingClientRect().height;

  /** The focused element, if it comes after the region and is not inside it. */
  const focusedBelow = (): Element | null => {
    const active = doc.activeElement;
    if (active === null || region.contains(active)) return null;
    return (region.compareDocumentPosition(active) & 4) === 4 ? active : null;
  };

  /** Note where the box is, for the next change to be measured against. */
  const place = () => {
    if (box !== null) at = box.getBoundingClientRect().top;
  };

  /** Follow the focus: on a move, let go and start again from what is there. */
  const follow = () => {
    if (pressed) return;
    const now = focusedBelow();
    if (now === box) return;
    box = now;
    region.style.minHeight = '';
    shown = height();
    place();
  };

  const press = () => { pressed = true; };
  const lift = () => {
    pressed = false;
    // After this turn: the click that ends the press is sent first.
    win.setTimeout(follow, 0);
  };

  doc.addEventListener('pointerdown', press, true);
  for (const type of RELEASE_EVENTS) doc.addEventListener(type, lift, true);
  for (const type of FOCUS_EVENTS) doc.addEventListener(type, follow, true);
  doc.addEventListener('scroll', place, true);

  return {
    settle() {
      follow();
      if (box === null) return;
      region.style.minHeight = '';
      const natural = height();
      if (natural < shown) {
        region.style.minHeight = `${shown}px`;
        return;
      }
      if (natural > shown) {
        const moved = box.getBoundingClientRect().top - at;
        // At once: the site scrolls smoothly, and a glide would show the move it undoes.
        if (moved > 0) win.scrollBy({ top: moved, behavior: 'instant' });
      }
      shown = natural;
      place();
    },
    stop() {
      doc.removeEventListener('pointerdown', press, true);
      for (const type of RELEASE_EVENTS) doc.removeEventListener(type, lift, true);
      for (const type of FOCUS_EVENTS) doc.removeEventListener(type, follow, true);
      doc.removeEventListener('scroll', place, true);
      region.style.minHeight = '';
    },
  };
}
