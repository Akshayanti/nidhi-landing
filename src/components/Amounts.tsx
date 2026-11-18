/**
 * Draws the amounts in a line of a tool's results as whole units.
 *
 * `<Amounts>` takes a formatted line ("Between €9,900 and €17,010") and wraps
 * each amount it finds; `<Amount>` takes a string that is one amount. Either
 * way the amount never breaks across lines, and where it is wider than its
 * line the CSS (`.amt` in global.css) draws that one amount smaller, by just
 * enough to fit. The words around it keep the reader's text size. See
 * src/utils/shared/amountUnits.ts for the rule and the reasons.
 *
 * `shared` is for a comparison: pass the longest length among the amounts a
 * reader compares (`longestAmount`), so that if one has to be drawn smaller
 * they all are, and size never suggests one figure matters more.
 * `<SharedAmounts>` does the same for everything inside it.
 *
 * The box the amount is fitted to is the nearest ancestor that is a size
 * container (`.amt-box`, or a result block that declares `container-type`).
 */
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { amountLength, splitAmounts } from '../utils/shared/amountUnits.ts';

/** The shared length of the comparison an amount sits in, or 0 outside one. */
const SharedLengthContext = createContext(0);

/**
 * Everything inside is one comparison: its amounts share `length`, the
 * longest among them. For rows whose amounts are drawn by other components
 * (the same row in each offer of the loan comparison).
 */
export function SharedAmounts({ length, children }: { length: number; children: ReactNode }) {
  return <SharedLengthContext.Provider value={length}>{children}</SharedLengthContext.Provider>;
}

function unitStyle(length: number): CSSProperties {
  return { '--amt-len': length } as CSSProperties;
}

/** One amount, whole. */
export function Amount({ children, shared }: { children: string; shared?: number }) {
  const group = useContext(SharedLengthContext);
  return <span className="amt" style={unitStyle(Math.max(shared ?? 0, group, amountLength(children)))}>{children}</span>;
}

/** A line of text with each amount in it kept whole. */
export function Amounts({ children, shared }: { children: string; shared?: number }) {
  const group = useContext(SharedLengthContext);
  return (
    <>
      {splitAmounts(children).map((part, i) => (typeof part === 'string'
        ? part
        // The pieces of one line never reorder, so the position is a stable key.
        : <span key={i} className="amt" style={unitStyle(Math.max(shared ?? 0, group, part.length))}>{part.amount}</span>))}
    </>
  );
}
