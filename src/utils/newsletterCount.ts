/**
 * The newsletter's size, for the line in every newsletter box ("20+ readers
 * get new lessons by email."). Read as listCount.ts describes: once per build,
 * with the NEWSLETTER_COUNT_TOKEN secret, from the newsletter script's `count`
 * action (scripts/newsletter.gs), which answers with the number of distinct
 * confirmed subscribers and nothing else. People who have not confirmed, or
 * who unsubscribed, are not counted. Same threshold and rounding as the
 * waitlist.
 */
import { askListCount, shownListCount } from './listCount.ts';

/** The number the page may show, or null for no line. */
export const shownNewsletterCount = shownListCount;

let once: Promise<number | null> | undefined;

/** The newsletter's confirmed size, asked for once per build; null when unknown. */
export function newsletterCount(): Promise<number | null> {
  once ??= askListCount(import.meta.env.PUBLIC_NEWSLETTER_ENDPOINT, 'NEWSLETTER_COUNT_TOKEN', 'newsletter');
  return once;
}
