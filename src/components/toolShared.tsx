/**
 * Two small things every free tool shares.
 *
 * 1. A form held until it works. The server sends each tool's fields before
 *    the island is running. On a slow phone that gap is a few seconds, and
 *    anything typed in it was thrown away when the island took over. The
 *    tool's root is `inert` (and `aria-busy`) until the island has mounted,
 *    so a field cannot take a value it would lose.
 * 3. One result announcement. A screen reader is told the settled result in
 *    one hidden sentence, once typing has paused, and the same way in every
 *    tool. The visible results are not live regions: a live region around
 *    them queued a reading for every keystroke, or re-read every changed line.
 * 2. The lead-in of a field error ("Error: …"), so an error is told apart
 *    from help text by more than its colour, in every language.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';

/** False in the server-rendered page and on the first render; true once the island runs. */
export function useToolReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

/** Props for a tool's root element: nothing in it can be used until the island runs. */
export function heldUntilReady(ready: boolean): { inert?: boolean; 'aria-busy'?: true } {
  return ready ? {} : { inert: true, 'aria-busy': true };
}

/** The translated pattern `Error: {message}`, handed down by each island. */
export const ErrorLeadContext = createContext('');

/** A field's error message with the lead-in in front. */
export function useErrorText(message: string): string {
  const lead = useContext(ErrorLeadContext);
  return lead ? lead.replace('{message}', message) : message;
}

/** The same, as an element, for places where a hook does not fit. */
export function ErrorText({ children }: { children: string }) {
  return <>{useErrorText(children)}</>;
}

/** A short notice said at once ("Link copied"). `n` counts them, so the same words are said again. */
export interface Notice { text: string; n: number }

/** Says a notice through `say`: the region is emptied first, so a repeat is a change. */
function useNotice(notice: Notice | undefined, say: (text: string) => void) {
  const n = notice?.n ?? 0;
  const text = notice?.text ?? '';
  useEffect(() => {
    // A notice taken back (a dialog reopened, another kind of link chosen) empties the region.
    say('');
    if (n === 0) return undefined;
    const timer = window.setTimeout(() => say(text), 60);
    return () => window.clearTimeout(timer);
    // Only a new notice says anything: `say` is a state setter, and the words
    // of a notice do not change under its count.
  }, [n]);
}

/**
 * The tool's one announcement: `text` is said politely once it has stayed the
 * same for `delay` ms. Nothing is said for the text the page loads with. Give
 * it the result sentence, or the "fix the marked fields" line while the result
 * on screen is an old one. It must stay mounted, at one place in the tree, and
 * it is the tool's one live region for results and notices: it is in the page
 * before it has anything to say, and only its text changes (#603).
 *
 * `also` is a second result, from a part of the tool that is not always open
 * (the loan tool's refinance scenario): `undefined` while that part is closed.
 * It is said when it changes while the part is open, not when the part opens,
 * and together with `text` when one keystroke changed both (#608).
 *
 * `notice` is said at once, each time its count rises (a link was copied).
 */
export function ResultAnnouncement({ text, also, notice, delay = 600 }: { text: string; also?: string; notice?: Notice; delay?: number }) {
  const [said, setSaid] = useState('');
  const heard = useRef<{ text: string; also: string | undefined } | null>(null);
  useEffect(() => {
    if (!heard.current) { heard.current = { text, also }; return undefined; }
    // The part opening or closing is not a result to say, and it is the baseline
    // at once: an edit made before the delay has passed is then heard as a change.
    if ((also === undefined) !== (heard.current.also === undefined)) {
      heard.current = { text: heard.current.text, also };
    }
    const timer = window.setTimeout(() => {
      const before = heard.current!;
      const textChanged = text !== before.text;
      const alsoChanged = also !== before.also && also !== undefined && before.also !== undefined;
      heard.current = { text, also };
      if (textChanged || alsoChanged) {
        setSaid([textChanged ? text : '', alsoChanged ? also : ''].filter(Boolean).join(' '));
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [text, also, delay]);
  useNotice(notice, setSaid);
  return <span className="chart-srOnly" aria-live="polite" aria-atomic="true">{said}</span>;
}

/**
 * A notice with a region of its own, for a dialog: what is outside an open
 * modal dialog is hidden from a screen reader, so the tool's own announcement
 * cannot speak for it. Mounted empty with the dialog; only its text changes.
 */
export function NoticeRegion({ notice }: { notice: Notice }) {
  const [said, setSaid] = useState('');
  useNotice(notice, setSaid);
  return <span className="chart-srOnly" role="status" aria-atomic="true">{said}</span>;
}

/** How long after typing pauses a screen reader hears why there is no result. */
export const WITHHELD_SAID_AFTER = 1000;

/**
 * A tool's results, or the reason there are none. While a box is wrong every
 * result that depends on it goes at once, from the screen, from paper and
 * from assistive technology, and the reason takes its place (#793). The
 * space stays, so the box being typed in does not move. The reason is not a
 * live region: the tool announces it once, after `WITHHELD_SAID_AFTER`.
 */
export function Withheld({ reason, children }: { reason: string | null; children: React.ReactNode }) {
  return (
    <div className="tool-result">
      <div className={`tool-resultBody${reason ? ' tool-withheld' : ''}`} inert={Boolean(reason)}>{children}</div>
      {reason && <p className="tool-resultReason">{reason}</p>}
    </div>
  );
}
