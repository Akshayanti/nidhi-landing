/**
 * Inclusive Finances, for the homepage route card and the learning path.
 *
 * Both show the collection by situation (the assumption a guide addresses),
 * never as an arbitrary handful of titles, and only once at least one guide
 * is published. A situation is listed only when one of its guides is live.
 *
 * `assertInclusiveGroups` fails the build when a guide is in no group (or
 * a group names a guide that does not exist), so a new guide cannot slip
 * past the grouping unnoticed.
 */

export interface GuidePost {
  data: {
    slug: string;
    title: string;
    level: string;
    order?: number;
    pubDate: Date;
  };
}

export const INCLUSIVE_HUB = '/blog/inclusive-finances/';

/** General guides about defaults themselves; they belong to no one situation. */
export const INCLUSIVE_GENERAL = ['when-the-default-plan-does-not-fit-you', 'building-your-own-default'];

export const INCLUSIVE_GROUPS: { id: string; label: string; guides: string[] }[] = [
  {
    id: 'relationships',
    label: 'Relationships and shared households',
    guides: [
      'unmarried-and-cohabiting-couples',
      'multi-partner-households',
      'chosen-family-and-next-of-kin',
      'blended-and-non-traditional-families',
      'shared-households-money-for-three-or-more',
      'owning-a-home-with-more-than-two-people',
      'multi-generational-household-economics',
    ],
  },
  {
    id: 'work',
    label: 'Work, income and caregiving',
    guides: ['gig-and-informal-economy-work', 'caregiving-and-the-career-break-wealth-gap'],
  },
  {
    id: 'borders',
    label: 'Countries and crossing borders',
    guides: ['immigrants-expats-and-cross-border-households', 'when-your-marriage-is-not-recognised-abroad'],
  },
  {
    id: 'disability',
    label: 'Disability and benefit rules',
    guides: ['financial-planning-with-a-disability'],
  },
  {
    id: 'faith',
    label: 'Faith and interest-free finance',
    guides: ['interest-free-and-sharia-compliant-finance'],
  },
  {
    id: 'alone',
    label: 'Separation, loss and planning alone',
    guides: ['divorce-and-separation-finances', 'widowhood-and-sudden-single-income', 'solo-agers-and-single-income-households'],
  },
];

const isInclusive = (p: GuidePost) => p.data.level === 'inclusive-finances';

export function assertInclusiveGroups(allPosts: GuidePost[]): void {
  const guides = new Set(allPosts.filter(isInclusive).map((p) => p.data.slug));
  const placed = new Set([...INCLUSIVE_GENERAL, ...INCLUSIVE_GROUPS.flatMap((g) => g.guides)]);
  const unplaced = [...guides].filter((s) => !placed.has(s));
  const unknown = [...placed].filter((s) => !guides.has(s));
  if (unplaced.length || unknown.length) {
    const parts = [
      unplaced.length ? `not in any group: ${unplaced.join(', ')}` : '',
      unknown.length ? `named but not an Inclusive Finances post: ${unknown.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(`Inclusive Finances grouping is out of date (${parts.join('; ')}). Fix src/utils/inclusiveGuides.ts.`);
  }
}

/** How many guides are live, and which situations have at least one. */
export function liveInclusive(posts: GuidePost[], now: Date): { count: number; groups: { id: string; label: string }[] } {
  const live = new Set(posts.filter((p) => isInclusive(p) && p.data.pubDate <= now).map((p) => p.data.slug));
  return {
    count: live.size,
    groups: INCLUSIVE_GROUPS.filter((g) => g.guides.some((s) => live.has(s))).map(({ id, label }) => ({ id, label })),
  };
}
