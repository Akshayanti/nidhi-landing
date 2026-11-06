/**
 * How many people are waiting for a beta invite, for the line under the
 * waitlist box's heading ("12 people are waiting for a beta invite."). How it
 * is read, and why it is safe, is in listCount.ts: once per build, with the
 * WAITLIST_COUNT_TOKEN secret, from the waitlist script's `count` action
 * (scripts/waitlist.gs), which answers with one number: the distinct valid
 * addresses on the waitlist plus the volunteers who ticked the beta box, each
 * person once, and nothing else.
 *
 * The dev server shows the exact count, ungated, so the founder can see it
 * locally (WaitlistSection.astro); only the published site holds to the rule.
 */
import { askListCount, parseCountAnswer } from './listCount.ts';

export { parseCountAnswer };

/** Up to here the exact number is shown. */
export const WAITLIST_EXACT_BELOW = 20;
/** From WAITLIST_EXACT_BELOW to here the number is rounded down to a multiple of 5. */
export const WAITLIST_FIVES_BELOW = 50;

/** What the line shows: the number, and whether it is a rounded-down "n+". */
export interface ShownWaitlistCount {
  n: number;
  atLeast: boolean;
}

/**
 * What the page may show, or null for no line. Small totals are exact so the
 * line can start from the first person; larger ones are rounded down, never
 * up, so the page never claims more people than there are. The newsletter's
 * line keeps its own rule (shownListCount in listCount.ts).
 */
export function shownWaitlistCount(count: number | null): ShownWaitlistCount | null {
  if (count === null || count < 1) return null;
  if (count < WAITLIST_EXACT_BELOW) return { n: count, atLeast: false };
  const step = count < WAITLIST_FIVES_BELOW ? 5 : 10;
  return { n: Math.floor(count / step) * step, atLeast: true };
}

let once: Promise<number | null> | undefined;

/** The number of people waiting for a beta invite, asked for once per build; null when unknown. */
export function waitlistCount(): Promise<number | null> {
  once ??= askListCount(import.meta.env.PUBLIC_WAITLIST_ENDPOINT, 'WAITLIST_COUNT_TOKEN', 'waitlist');
  return once;
}
