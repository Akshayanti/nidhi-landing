/**
 * Published lessons for the learning path's front page (/blog/) and its
 * level pages (/blog/<level>/), in reading order and placed on the path.
 * Scheduled posts show in dev and appear in production once their pubDate
 * has passed, the same rule as the post pages.
 *
 * There is one lesson library, in English, and no locale is threaded through
 * here: the lessons are not translated, and a page in another language lists
 * these same lessons and links to them at their one address (see `lessonPath`).
 * What a language changes is the chrome around the list, which is the catalog's
 * business, not this module's: nothing here returns a sentence.
 */
import { getCollection } from 'astro:content';
import { getReadingTime } from './readingTime';
import { assertCompanionHosts, placeOnPath } from './companions';
import { LADDER_LEVELS } from './home/startingPoints';
import { assertConceptSlugs } from './levelHelper';
import { lessonPath } from '../i18n/config.ts';

export interface PathPost {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  level: 'discovery' | 'building' | 'psychology' | 'optimizing' | 'mastery' | 'inclusive-finances';
  readingTime: number;
  tags: string[];
  /** The lesson's one address, built here so no caller can localize it. */
  href: string;
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
      // Last, so the key order of the object a page hydrates an island with is
      // the order it had before this field existed.
      href: lessonPath(post.data.slug),
    }));
}

/**
 * One level's worth of a topic's lessons, as structure alone: the level, its
 * lessons in reading order, and how many lessons the whole level has. The
 * level's name and the link back to it are words and addresses, so the page
 * adds those.
 */
export interface TopicSection {
  level: string;
  /** Posts of this topic, in reading order; `step` is the post's place in its level. */
  posts: Array<PathPost & { step?: number; stepCount?: number }>;
  levelTotal: number;
}

/**
 * A topic's lessons grouped by level: the ladder levels in reading order,
 * then the Inclusive Finances guides that carry the tag. A level with none of
 * the topic's lessons is left out.
 */
export function topicGroups(posts: PathPost[], tag: string): TopicSection[] {
  const groups: TopicSection[] = [];
  for (const level of LADDER_LEVELS) {
    const inLevel = posts.filter((p) => p.level === level && p.pathLevel);
    const tagged = inLevel
      .map((p, i) => ({ ...p, step: i + 1, stepCount: inLevel.length }))
      .filter((p) => p.tags.includes(tag));
    if (tagged.length > 0) groups.push({ level, posts: tagged, levelTotal: inLevel.length });
  }
  const guides = posts.filter((p) => p.level === 'inclusive-finances');
  const taggedGuides = guides.filter((p) => p.tags.includes(tag));
  if (taggedGuides.length > 0) {
    groups.push({ level: 'inclusive-finances', posts: taggedGuides, levelTotal: guides.length });
  }
  return groups;
}

/**
 * Every tag the lessons use, with its groups, sorted by tag. One entry per
 * topic page: the route turns the list into paths, and the page renders one of
 * them.
 */
export async function getTopicIndex(): Promise<Array<{ tag: string; groups: TopicSection[] }>> {
  const posts = await getPathPosts();
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  return tags.map((tag) => ({ tag, groups: topicGroups(posts, tag) }));
}

