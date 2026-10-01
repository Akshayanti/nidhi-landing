/**
 * Places Inclusive Finances posts on the learning path.
 *
 * Inclusive posts are not a step of their own. Each one sits right after the
 * curriculum post whose default assumption it breaks (its `companionOf` host),
 * inside that host's level section. Placement is computed from the full list
 * of visible posts, so a tag page that shows only a subset still places each
 * companion under the right level.
 *
 * A companion whose host is not visible is left out of the path. In
 * production that cannot happen, since a companion ships after its host; in
 * dev it hides the Mastery companions until the Mastery posts exist. Such
 * posts are still listed on the /blog/inclusive-finances/ hub.
 */
interface Placeable {
  data: {
    slug: string;
    title: string;
    level: string;
    companionOf?: string;
  };
}

export interface PathPlacement {
  /** The ladder level whose section shows this post. */
  pathLevel: string;
  /** Title of the host post, for companions that have one. */
  companionTitle?: string;
}

/**
 * Fails the build when a live companion names a host slug that is not in the
 * collection at all (a typo, or a Mastery post published under a different
 * slug than the one fixed in the plan). Without this the companion would
 * silently drop off the learning path. Companions that are not live yet, and
 * hosts that exist but are scheduled for later, are fine.
 */
export function assertCompanionHosts<T extends Placeable & { data: { pubDate: Date } }>(allPosts: T[], now: Date): void {
  const slugs = new Set(allPosts.map((p) => p.data.slug));
  const broken = allPosts.filter(
    (p) => p.data.companionOf && p.data.pubDate <= now && !slugs.has(p.data.companionOf),
  );
  if (broken.length > 0) {
    const list = broken.map((p) => `${p.data.slug} -> ${p.data.companionOf}`).join(', ');
    throw new Error(`Live companion posts name a host slug that does not exist: ${list}. Fix companionOf or the host's slug.`);
  }
}

/** `sortedPosts` must be the visible posts in `order` order. */
export function placeOnPath<T extends Placeable>(sortedPosts: T[]): Map<string, PathPlacement> {
  const bySlug = new Map(sortedPosts.map((p) => [p.data.slug, p]));
  const placements = new Map<string, PathPlacement>();
  let currentLevel = 'discovery';
  for (const post of sortedPosts) {
    const { slug, level, companionOf } = post.data;
    if (level !== 'inclusive-finances') {
      currentLevel = level;
      placements.set(slug, { pathLevel: level });
      continue;
    }
    if (companionOf && !bySlug.has(companionOf)) continue;
    placements.set(slug, {
      pathLevel: currentLevel,
      companionTitle: companionOf ? bySlug.get(companionOf)!.data.title : undefined,
    });
  }
  return placements;
}
