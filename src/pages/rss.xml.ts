import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { DEFAULT_LOCALE } from '../i18n/config.ts';
import { dict } from '../i18n/index.ts';

/**
 * The English feed, at /rss.xml. Its Hindi counterpart is the mirrored route
 * in `src/pages/[locale]/rss.xml.ts`; the two differ only in the locale they
 * read and the words they use, so any change here likely belongs there too.
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
