/**
 * The How-to section's later layers, built now and switched off until the
 * council has reviewed them (council, Nov 10 2026; docs/plans/how-to-guides.md,
 * "Finding guides as the set grows").
 *
 * Each layer is code that works today but reaches no reader and no search
 * engine while its flag is false. A guide count never switches a layer on by
 * itself: it only makes the layer eligible for a council review, and the build
 * prints a notice when that happens. Turning a layer on is a one-line change
 * here, after that review.
 *
 * Browser-safe: no imports, so the hub's script can read it too.
 */

export interface LayerFlags {
  /** /how-to/<group>/ pages in every language, and the hub's "a few + All N" per group. */
  groupPagesPublic: boolean;
  /** /how-to/situation/<slug>/ pages and the hub's "What's happening?" row. */
  situationPagesPublic: boolean;
  /** Filters on the hub, over the facets the guides' schema has. */
  filtersVisible: boolean;
}

export const GUIDE_LAYERS: LayerFlags = {
  groupPagesPublic: false,
  situationPagesPublic: false,
  filtersVisible: false,
};

/** When each layer becomes eligible for a council review (not when it switches on). */
export const REVIEW_AT = {
  /** Group pages: one group this large, or the whole hub this large. */
  groupGuides: 10,
  hubGuides: 30,
  /** Situation pages: the hub this large. */
  situationsHub: 30,
  /** Filters: the hub this large. */
  filtersHub: 50,
} as const;

/** A situation page lists at least this many live guides, or it is not built. */
export const SITUATION_MIN_GUIDES = 3;

/** With group pages public, the hub shows this many guides per group, then "All N". */
export const HUB_GROUP_PREVIEW = 4;

/** The groups that get a page: every group with a live guide, once the layer is public. */
export function groupPageIds(groupCounts: Record<string, number>, flags: LayerFlags = GUIDE_LAYERS): string[] {
  if (!flags.groupPagesPublic) return [];
  return Object.entries(groupCounts).filter(([, n]) => n > 0).map(([id]) => id);
}

/** How many of a group's guides the hub lists, and whether it links to the group's page. */
export function hubGroupView(count: number, flags: LayerFlags = GUIDE_LAYERS): { show: number; linkToPage: boolean } {
  if (flags.groupPagesPublic && count > HUB_GROUP_PREVIEW) return { show: HUB_GROUP_PREVIEW, linkToPage: true };
  return { show: count, linkToPage: false };
}

/** Whether a situation page is built: the layer is public and it lists enough live guides. */
export function situationBuilt(liveGuides: number, flags: LayerFlags = GUIDE_LAYERS): boolean {
  return flags.situationPagesPublic && liveGuides >= SITUATION_MIN_GUIDES;
}

/** A facet the hub's filters offer, and the guides behind each value. */
export interface Facet { id: string; values: { id: string; count: number }[] }

/**
 * The facets filters can offer, from what the guides carry. Today only the
 * group; a field added to the schema later (country, life event) is added here
 * with it. A facet with a single value filters nothing, so it is left out.
 */
export function guideFacets(guides: { group: string }[]): Facet[] {
  const counts = new Map<string, number>();
  for (const g of guides) counts.set(g.group, (counts.get(g.group) ?? 0) + 1);
  const values = [...counts].map(([id, count]) => ({ id, count }));
  return values.length > 1 ? [{ id: 'group', values }] : [];
}

/** Whether the hub shows filters. */
export function filtersShown(facets: Facet[], flags: LayerFlags = GUIDE_LAYERS): boolean {
  return flags.filtersVisible && facets.length > 0;
}

/** One line for each layer that is still off but has reached its review count. */
export function reviewNotices(
  counts: { guides: number; largestGroup: number },
  flags: LayerFlags = GUIDE_LAYERS,
): string[] {
  const notes: string[] = [];
  if (!flags.groupPagesPublic && (counts.largestGroup >= REVIEW_AT.groupGuides || counts.guides >= REVIEW_AT.hubGuides)) {
    notes.push(`How-to: group pages are ready for a council review (largest group ${counts.largestGroup}, ${counts.guides} guides). Switch on in src/utils/guideLayers.ts after it.`);
  }
  if (!flags.situationPagesPublic && counts.guides >= REVIEW_AT.situationsHub) {
    notes.push(`How-to: situation pages are ready for a council review (${counts.guides} guides). Switch on in src/utils/guideLayers.ts after it.`);
  }
  if (!flags.filtersVisible && counts.guides >= REVIEW_AT.filtersHub) {
    notes.push(`How-to: filters are ready for a council review (${counts.guides} guides). Switch on in src/utils/guideLayers.ts after it.`);
  }
  return notes;
}
