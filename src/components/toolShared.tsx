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
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type Ref } from 'react';
import { resultGate } from '../utils/shared/settle.ts';
import { steadyAbove, type Steady } from '../utils/shared/steadyAbove.ts';

/** False in the server-rendered page and on the first render; true once the island runs. */
export function useToolReady(): boolean {
  const [ready, setReady] = useState(false);
  // Stryker disable next-line ArrayDeclaration: any list that never changes runs the effect once, as the empty one does
  useEffect(() => setReady(true), []);
  return ready;
}

/** Props for a tool's root element: nothing in it can be used until the island runs. */
export function heldUntilReady(ready: boolean): { inert?: boolean; 'aria-busy'?: true } {
  return ready ? {} : { inert: true, 'aria-busy': true };
}

/** The translated pattern `Error: {message}`, handed down by each island. */
export const ErrorLeadContext = createContext('');

/** What is said under a box that arrived holding the mark of an unreadable value. */
export const UnreadableContext = createContext('');

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
  // Stryker disable next-line StringLiteral: the fallback is for no notice, whose count is 0, and a count of 0 says nothing
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
 *
 * `quiet` is for the page still arriving (a shared link not yet read): while
 * it holds, nothing is said, and the text it ends on is the one the page
 * loaded with, so a link's own result is not read out on opening (#880).
 */
export function ResultAnnouncement({ text, also, notice, delay = 600, quiet = false }: { text: string; also?: string; notice?: Notice; delay?: number; quiet?: boolean }) {
  const [said, setSaid] = useState('');
  const heard = useRef<{ text: string; also: string | undefined } | null>(null);
  const wasQuiet = useRef(false);
  useEffect(() => {
    if (!heard.current || wasQuiet.current) {
      heard.current = { text, also };
      wasQuiet.current = quiet;
      return undefined;
    }
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
  }, [text, also, delay, quiet]);
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
 * `unsaid` is a part that goes with another, which shows the one reason.
 */
export function Withheld({ reason, reasonId, unsaid = false, children }: { reason: string | null; reasonId?: string; unsaid?: boolean; children: React.ReactNode }) {
  return (
    <div className="tool-result">
      {/* An empty reason withholds too: a corrected box has nothing to fix while its result settles. */}
      <div className={`tool-resultBody${reason !== null ? ' tool-withheld' : ''}`} inert={reason !== null}>{children}</div>
      {reason && !unsaid && <p id={reasonId} className="tool-resultReason">{reason}</p>}
    </div>
  );
}

/**
 * A box holding nothing but "?", the mark of a value that could not be read,
 * is selected, so typing replaces it (#789). On the click as well as on
 * focus: the mouse coming up puts the caret where it was pressed.
 */
export function selectMarker(e: { currentTarget: HTMLInputElement }): void {
  if (e.currentTarget.value === '?') e.currentTarget.select();
}

/** Props for every box that can show the mark. */
export const markerSelect = { onFocus: selectMarker, onClick: selectMarker };

/** The results' gate (utils/shared/settle.ts): withheld from an invalid form until the corrected one's result is on screen. */
export function useResultGate(invalid: boolean, current: boolean): { withheld: boolean; waiting: boolean } {
  const [held, setHeld] = useState(false);
  const gate = resultGate({ invalid, held, current });
  // Set while rendering, so that no frame shows what is held.
  if (gate.withheld !== held) setHeld(gate.withheld);
  return gate;
}

type LinkFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'readOnly' | 'ref'> & {
  /** The share link to show and select. */
  link: string;
  ref?: Ref<HTMLInputElement>;
};

/**
 * A read-only box holding a share link. The link is set as the field's value
 * property, never as its `value` attribute (which React writes for a
 * controlled input), so the page's markup never carries a link's state: no
 * attribute should hold what a reader typed (CLAUDE.md, free tools rule 4).
 */
export function LinkField({ link, ref, ...rest }: LinkFieldProps) {
  const own = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    if (own.current && own.current.value !== link) own.current.value = link;
  }, [link]);
  return (
    <input
      {...rest}
      readOnly
      ref={(el) => {
        own.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
    />
  );
}

/**
 * A copied share link, as the loan comparison and the net worth calculator
 * have it (#711): said once through the tool's announcement (`notice`), and
 * shown in a bar under the buttons, where it can be copied by hand when the
 * clipboard is refused. The address goes as soon as `stale` changes (the
 * form), when it stops being the address of what is on the page. It sits in
 * a read-only box's value, set from script, never in an attribute (CLAUDE.md,
 * free tools rule 4).
 */
export function useShareLink(stale: unknown, words: { status: string; prompt: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<Notice>({ text: '', n: 0 });
  useEffect(() => { setUrl(''); }, [stale]);
  const copied = useCallback((link: string) => {
    setUrl(link);
    setFailed(false);
    setNotice((was) => ({ text: words.status, n: was.n + 1 }));
  }, [words.status]);
  const refused = useCallback((link: string) => {
    setUrl(link);
    setFailed(true);
    setNotice((was) => ({ text: words.prompt, n: was.n + 1 }));
  }, [words.prompt]);
  return { url, failed, notice, copied, refused };
}

/** The bar under a tool's buttons that holds a copied share link (`useShareLink`). Not a live region: the notice says it. */
export function ShareUrlBar({ url, failed, label, failedLabel, aria }: { url: string; failed: boolean; label: string; failedLabel: string; aria: string }) {
  if (!url) return null;
  return (
    <div className="lc-shareUrlBar">
      <span className="lc-shareUrlLabel">{failed ? failedLabel : label}</span>
      <LinkField
        className="lc-shareUrlInput"
        link={url}
        onFocus={(e) => { e.target.select(); e.target.scrollLeft = 0; }}
        aria-label={aria}
      />
    </div>
  );
}

/**
 * For a part of a tool that changes height as a reader types in a box below
 * it: the ref to put on that part. The box then stays where it is on the
 * screen (#827, `steadyAbove`). The part is looked at again after every
 * render of the component that calls this, so call it where the part's
 * content is decided.
 */
export function useSteadyAbove<T extends HTMLElement>(): (el: T | null) => void {
  const steady = useRef<Steady | null>(null);
  useLayoutEffect(() => {
    steady.current?.settle();
  });
  return useCallback((el: T | null) => {
    steady.current?.stop();
    steady.current = el === null ? null : steadyAbove(el);
  }, []);
}
