import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { DEFAULT_LOCALE } from '../i18n/config';
import { visibleBlogPosts } from '../i18n/content';

export async function GET(context: APIContext) {
  const now = new Date();
  const posts = visibleBlogPosts(await getCollection('blog'), DEFAULT_LOCALE, false, now);

  return rss({
    title: 'nidhi: Personal Finance Blog',
    description: 'Free personal finance education: net worth, budgeting, saving, investing, and debt management. Build your financial literacy step by step.',
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
