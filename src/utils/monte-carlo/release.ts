/**
 * The Monte Carlo simulator launches together with the post that explains
 * it (43, Financial Projections). Until that post's pubDate has passed, the
 * production build leaves out the tool page and every link to it, and the
 * dev server shows everything, matching how draft posts behave.
 *
 * Because the gate reads the post's pubDate, publishing the post (setting a
 * real date) launches the tool on the same scheduled deploy, with no second
 * change to remember.
 */
import { getCollection } from 'astro:content';
import { isReleased, releaseDate } from '../releaseGate.ts';

export const MONTE_CARLO_URL = '/free/monte-carlo-simulator/';
export const MONTE_CARLO_HOST_SLUG = 'financial-projections';

async function hostPubDate(): Promise<Date | null> {
  const host = (await getCollection('blog')).find((p) => p.data.slug === MONTE_CARLO_HOST_SLUG);
  return host ? host.data.pubDate : null;
}

/** `now` is for tests; every caller leaves it out. */
export async function isMonteCarloReleased(now: Date = new Date()): Promise<boolean> {
  return isReleased(await hostPubDate(), now, import.meta.env.DEV);
}

/**
 * The launch date: the host lesson's pubDate once it has passed. In dev, where
 * the tool shows before launch, today's date stands in.
 */
export async function monteCarloReleaseDate(now: Date = new Date()): Promise<Date | null> {
  return releaseDate(await hostPubDate(), now, import.meta.env.DEV);
}
