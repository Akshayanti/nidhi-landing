import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { DEFAULT_LOCALE } from '../../i18n/config.ts';
import { dict } from '../../i18n/index.ts';
import { getGuides, guidePath } from '../../utils/guides.ts';

/**
 * The how-to guides' own feed, at /how-to/rss.xml, in English like the
 * guides themselves.
 *
 * They are not in /rss.xml on purpose: the newsletter is sent from that
 * feed, one mail for every item it has not sent yet, so a guide added there
 * would be mailed to every subscriber as if it were a lesson. Every how-to
 * page links this feed in its head; the rest of the site links the lesson
 * feed.
 */
export async function GET(context: APIContext) {
  const now = new Date();
  // getGuides() returns the guides that are live, in hub order; a feed lists the newest first.
  const guides = (await getGuides()).slice().sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.data.slug.localeCompare(b.data.slug));
  const { rss: feed } = dict(DEFAULT_LOCALE);

  return rss({
    title: feed.guidesFeedTitle,
    description: feed.guidesFeedDescription,
    site: context.site!,
    items: guides.map((guide) => ({
      title: guide.data.title,
      description: guide.data.description,
      pubDate: guide.data.pubDate,
      link: guidePath(guide.data.slug),
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en</language>\n    <lastBuildDate>${now.toUTCString()}</lastBuildDate>\n    <atom:link href="${new URL('how-to/rss.xml', context.site!).href}" rel="self" type="application/rss+xml"/>`,
  });
}
