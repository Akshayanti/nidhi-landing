/**
 * Two small things every free tool shares.
 *
 * 1. A form held until it works. The server sends each tool's fields before
 *    the island is running. On a slow phone that gap is a few seconds, and
 *    anything typed in it was thrown away when the island took over. The
 *    tool's root is `inert` (and `aria-busy`) until the island has mounted,
 *    so a field cannot take a value it would lose.
 * 2. The lead-in of a field error ("Error: …"), so an error is told apart
 *    from help text by more than its colour, in every language.
 */
import { createContext, useContext, useEffect, useState } from 'react';

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
