/**
 * Published lessons for the learning path's front page (/blog/) and its
 * level pages (/blog/<level>/), in reading order and placed on the path.
 * Scheduled posts show in dev and appear in production once their pubDate
 * has passed, the same rule as the post pages.
 */
import { getCollection } from 'astro:content';
import { getReadingTime } from './readingTime';
import { assertCompanionHosts, placeOnPath } from './companions';
import { LADDER_LEVELS } from './home/startingPoints';
import { assertConceptSlugs } from './levelHelper';

/** One line per level for the level list on /blog/. */
export const LEVEL_SUMMARIES: Record<string, string> = {
  discovery: 'The basic language of money',
  building: 'Budgets, risk and first investments',
  psychology: 'How habits and biases shape decisions',
  optimizing: 'Reviewing and refining a plan',
  mastery: 'Estate planning and the long game',
};

export interface PathPost {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  level: 'discovery' | 'building' | 'psychology' | 'optimizing' | 'mastery' | 'inclusive-finances';
  readingTime: number;
  tags: string[];
  /** Level section that shows the post; absent when its host is not live. */
  pathLevel?: string;
  companionTitle?: string;
}

/**
 * Levels the level helper may suggest: every one of their lessons is
 * published (src/utils/levelHelper.ts). Also checks that the helper's ideas
 * name lessons that exist.
 */
export async function getHelperLevels(): Promise<string[]> {
  const isDev = import.meta.env.DEV;
  const now = new Date();
  const allPosts = await getCollection('blog');
  assertConceptSlugs(new Set(allPosts.map((p) => p.data.slug)));
  return LADDER_LEVELS.filter((level) => {
    const inLevel = allPosts.filter((p) => p.data.level === level);
    return inLevel.length > 0 && inLevel.every((p) => isDev || p.data.pubDate <= now);
  });
}

/** Every visible post; `pathLevel` is set on those placed on the path. */
export async function getPathPosts(): Promise<PathPost[]> {
  const isDev = import.meta.env.DEV;
  const now = new Date();
  const allPosts = await getCollection('blog');
  assertCompanionHosts(allPosts, now);
  // A level page at /blog/<level>/ would hide a post with the same slug.
  const clash = allPosts.find((p) => (LADDER_LEVELS as readonly string[]).includes(p.data.slug));
  if (clash) throw new Error(`Post slug "${clash.data.slug}" is taken by the level page /blog/${clash.data.slug}/. Rename the post's slug.`);

  const visible = allPosts
    .filter((post) => isDev || post.data.pubDate <= now)
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
  const placements = placeOnPath(visible);
  return visible
    .map((post) => ({
      id: post.data.slug,
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate.toISOString(),
      level: post.data.level,
      readingTime: getReadingTime(post.body || ''),
      tags: post.data.tags,
      ...placements.get(post.data.slug),
    }));
}
