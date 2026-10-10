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
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
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
    customData: `<language>en</language>\n    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
  });
}
