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
 * silently drop off the learning path. Companions that are not live yet are
 * fine.
 *
 * Also fails when a live Inclusive Finances guide has no host, or its host is
 * not live yet: the collection's line on the home page and /blog/ says every
 * guide comes right after the lesson it builds on, so a guide ships only once
 * its host has (docs/plans/blog-content-plan.md, "Lessons, levels and
 * collections").
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
  const bySlug = new Map(allPosts.map((p) => [p.data.slug, p]));
  const early = allPosts.filter((p) => {
    if (p.data.level !== 'inclusive-finances' || p.data.pubDate > now) return false;
    const host = p.data.companionOf ? bySlug.get(p.data.companionOf) : undefined;
    return !host || host.data.pubDate > now;
  });
  if (early.length > 0) {
    const list = early.map((p) => `${p.data.slug} -> ${p.data.companionOf ?? '(no host)'}`).join(', ');
    throw new Error(`Live Inclusive Finances guides need a live host lesson: ${list}. Set companionOf, or schedule the guide after its host.`);
  }
}

/**
 * Fails the build when a guide is not right after its host in reading order:
 * the host must come first, with only other guides between them (a guide
 * hosted by another guide follows that one). Placement follows `order`, so a
 * wrong `order` would put a guide under the wrong lesson or level while its
 * line says it comes right after the lesson it builds on. A guide whose host
 * is not visible is skipped (dev, before the Mastery lessons exist).
 * `sortedPosts` must be the visible posts in `order` order.
 */
export function assertCompanionOrder<T extends Placeable>(sortedPosts: T[]): void {
  const index = new Map(sortedPosts.map((p, i) => [p.data.slug, i]));
  const misplaced = sortedPosts.filter((p, i) => {
    const { level, companionOf } = p.data;
    if (level !== 'inclusive-finances' || !companionOf || !index.has(companionOf)) return false;
    const h = index.get(companionOf)!;
    return h >= i || sortedPosts.slice(h + 1, i).some((q) => q.data.level !== 'inclusive-finances');
  });
  if (misplaced.length > 0) {
    const list = misplaced.map((p) => `${p.data.slug} -> ${p.data.companionOf}`).join(', ');
    throw new Error(`Inclusive Finances guides are not right after their host lesson: ${list}. Give each one an \`order\` just after its host's (host 45 -> guide 45.5).`);
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
