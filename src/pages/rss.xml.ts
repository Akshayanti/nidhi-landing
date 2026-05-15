import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const now = new Date();
  const posts = (await getCollection('blog'))
    .filter(post => post.data.pubDate <= now)
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));

  return rss({
    title: 'nidhi: Personal Finance Blog',
    description: 'Free personal finance education: net worth, budgeting, saving, investing, and debt management. Build your financial literacy step by step.',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.data.slug}`,
      categories: post.data.tags,
    })),
    customData: `<language>en</language>\n    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
  });
}
