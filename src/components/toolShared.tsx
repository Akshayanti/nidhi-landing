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

/**
 * The tool's one announcement: `text` is said politely once it has stayed the
 * same for `delay` ms. Nothing is said for the text the page loads with. Give
 * it the result sentence, or the "fix the marked fields" line while the result
 * on screen is an old one. It must stay mounted, at one place in the tree.
 */
export function ResultAnnouncement({ text, delay = 600 }: { text: string; delay?: number }) {
  const [said, setSaid] = useState('');
  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return undefined; }
    const timer = window.setTimeout(() => setSaid(text), delay);
    return () => window.clearTimeout(timer);
  }, [text, delay]);
  return <span className="chart-srOnly" aria-live="polite" aria-atomic="true">{said}</span>;
}
