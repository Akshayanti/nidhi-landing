import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { DEFAULT_LOCALE } from '../i18n/config.ts';
import { dict } from '../i18n/index.ts';

/**
 * The one feed, at /rss.xml, in English. The lessons are not translated, so
 * there is no per-language feed: every page in every language links this one
 * (see BaseHead).
 */
export async function GET(context: APIContext) {
  const now = new Date();
  const posts = (await getCollection('blog'))
    .filter(post => post.data.pubDate <= now)
    // Newest first, as feed readers expect: several take only the first
    // few items, or treat the first as the latest. (The reading order is
    // the learning path's business, not the feed's.)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || (b.data.order ?? 99) - (a.data.order ?? 99));
  const { rss: feed } = dict(DEFAULT_LOCALE);

  return rss({
    title: feed.feedTitle,
    description: feed.feedDescription,
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.data.slug}/`,
      categories: post.data.tags,
    })),
    // The feed names its own address, as the Atom link the RSS best
    // practices ask for.
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en</language>\n    <lastBuildDate>${now.toUTCString()}</lastBuildDate>\n    <atom:link href="${new URL('rss.xml', context.site!).href}" rel="self" type="application/rss+xml"/>`,
  });
}
