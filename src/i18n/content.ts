import type { CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from './config';

type BlogPost = CollectionEntry<'blog'>;

export function postLocale(post: BlogPost): Locale {
  return (post.data.locale ?? DEFAULT_LOCALE) as Locale;
}

export function isPostInLocale(post: BlogPost, locale: Locale): boolean {
  return postLocale(post) === locale;
}

export function visibleBlogPosts(posts: BlogPost[], locale: Locale, isDev: boolean, now = new Date()): BlogPost[] {
  return posts
    .filter((post) => isPostInLocale(post, locale))
    .filter((post) => isDev || post.data.pubDate <= now)
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
}
