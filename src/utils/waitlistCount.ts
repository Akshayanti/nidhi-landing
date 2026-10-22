/**
 * The waitlist's size, for the line under the box's heading ("20+ people have
 * joined my waitlist."). How it is read, and why it is safe, is in
 * listCount.ts: once per build, with the WAITLIST_COUNT_TOKEN secret, from the
 * waitlist script's `count` action (scripts/waitlist.gs), which answers with
 * the number of distinct valid addresses and nothing else.
 *
 * The dev server shows the exact count, ungated, so the founder can see it
 * locally (WaitlistSection.astro); only the published site holds to the rule.
 */
import { LIST_COUNT_STEP, LIST_COUNT_THRESHOLD, askListCount, parseCountAnswer, shownListCount } from './listCount.ts';

export { parseCountAnswer };
/** No line until this many people have joined. */
export const WAITLIST_COUNT_THRESHOLD = LIST_COUNT_THRESHOLD;
/** The shown number is rounded down to a multiple of this. */
export const WAITLIST_COUNT_STEP = LIST_COUNT_STEP;
/** The number the page may show, or null for no line. */
export const shownWaitlistCount = shownListCount;

let once: Promise<number | null> | undefined;

/** The waitlist's size, asked for once per build; null when unknown. */
export function waitlistCount(): Promise<number | null> {
  once ??= askListCount(import.meta.env.PUBLIC_WAITLIST_ENDPOINT, 'WAITLIST_COUNT_TOKEN', 'waitlist');
  return once;
}
