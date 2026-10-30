/**
 * The invest or pay off calculator launches together with the lesson it
 * belongs to (49, Invest or Pay Off Debt First?), on the same day, at once
 * (owner, Oct 30, 2026). Until that lesson's pubDate has passed, the
 * production build leaves out the tool page and every link to it, and the
 * privacy notice and the What's changed page leave out their entries; the dev
 * server shows everything, matching how draft posts behave.
 *
 * Because the gate reads the lesson's pubDate, publishing the lesson (setting
 * a real date) launches the tool on the same scheduled deploy, with no second
 * change to remember. The Monte Carlo simulator launched with lesson 43 the
 * same way (src/utils/monte-carlo/release.ts).
 */
import { getCollection } from 'astro:content';

export const INVEST_OR_PAY_OFF_URL = '/free/invest-or-pay-off/';
export const INVEST_OR_PAY_OFF_HOST_SLUG = 'invest-or-pay-off-debt';

async function hostPubDate(): Promise<Date | null> {
  const host = (await getCollection('blog')).find((p) => p.data.slug === INVEST_OR_PAY_OFF_HOST_SLUG);
  return host ? host.data.pubDate : null;
}

export async function isInvestOrPayOffReleased(): Promise<boolean> {
  if (import.meta.env.DEV) return true;
  const date = await hostPubDate();
  return !!date && date <= new Date();
}

/**
 * The launch date: the host lesson's pubDate once it has passed. In dev, where
 * the tool shows before launch, today's date stands in.
 */
export async function investOrPayOffReleaseDate(): Promise<Date | null> {
  const date = await hostPubDate();
  if (date && date <= new Date()) return date;
  return import.meta.env.DEV ? new Date() : null;
}
