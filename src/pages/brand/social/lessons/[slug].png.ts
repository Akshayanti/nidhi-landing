/**
 * Each published lesson's share card (#743), served at the address its page
 * names: /brand/social/lessons/<slug>.png.
 *
 * The cards are drawn by scripts/render-share-cards.mjs into
 * src/share-cards/lessons/, not public/, because public/ is published whole:
 * a lesson dated in the future, or a draft, would have its title served
 * before the lesson is. Here a card is built only for a lesson the site
 * publishes, by the same rule as its page (src/pages/blog/[slug].astro), so
 * a scheduled lesson's card goes live with the daily rebuild that publishes it.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { lessonCardFile } from '../../../../utils/shareCard.ts';

export const getStaticPaths = (async () => {
  const isDev = import.meta.env.DEV;
  const now = new Date();
  const posts = await getCollection('blog', (post) => isDev || post.data.pubDate <= now);
  return posts
    .map((post) => post.data.slug)
    .filter((slug) => lessonCardFile(slug) !== null)
    .map((slug) => ({ params: { slug } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const file = lessonCardFile(String(params.slug));
  if (!file) return new Response(null, { status: 404 });
  return new Response(readFileSync(file), { headers: { 'Content-Type': 'image/png' } });
};
