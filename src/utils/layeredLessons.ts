// The layered-lesson rule for Optimizing and Inclusive Finances (PLAYBOOK
// "Blog lessons", blog-content-plan.md Rule 10), checked at build time so a
// lesson cannot quietly ship without it. It covers past and future lessons:
// every lesson at these levels must meet it unless it is still listed in
// NOT_YET_LAYERED, the conversion backlog. Converting a lesson means removing
// it from that list in the same change; the build fails if a listed lesson
// already passes, so completed entries cannot linger. A new lesson at these
// levels must pass from the start, never join the list.

export const LAYERED_LEVELS = ['optimizing', 'inclusive-finances'] as const;

/** Lessons at those levels not yet converted. Delete a slug when its lesson is. */
export const NOT_YET_LAYERED: ReadonlySet<string> = new Set([
  // Optimizing
  'geographic-arbitrage',
  'income-replacement-ratio',
  'insurance-optimization',
  'recognizing-and-avoiding-financial-scams-and-fraud',
  'advanced-rebalancing',
  // Inclusive Finances
  'immigrants-expats-and-cross-border-households',
  'solo-agers-and-single-income-households',
  'unmarried-and-cohabiting-couples',
  'owning-a-home-with-more-than-two-people',
  'multi-partner-households',
  'divorce-and-separation-finances',
  'caregiving-and-the-career-break-wealth-gap',
  'financial-planning-with-a-disability',
  'when-your-marriage-is-not-recognised-abroad',
  'chosen-family-and-next-of-kin',
  'multi-generational-household-economics',
  'blended-and-non-traditional-families',
  'widowhood-and-sudden-single-income',
  'building-your-own-default',
]);

// Headings that count instead of naming their point, and the closing
// skeleton every unconverted lesson shares.
// "Step two: ..." stays allowed: a real sequence may number its steps, as
// long as the heading names the step.
const NUMBER = '(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)';
const COUNTED_HEADING = new RegExp(
  `^(part|category|adjustment|modifier)\\s+${NUMBER}\\b|^${NUMBER}\\s+(questions?|steps?|ways?|things?|rules?|words?|lists?|bands?|buckets?|defaults?|categories|modes?|signs?|mistakes?)\\b`,
  'i',
);
const SKELETON_HEADING = /^cross-continent (notes|examples)\b.*$|^getting started$/i;

interface LessonShape {
  seoTitle?: string;
  glossary?: { term: string }[];
  takeaways?: (string | { text: string; href: string })[];
}

/** What a lesson at a layered level is missing; empty when it meets the rule. */
export function layeredLessonProblems(data: LessonShape, h2s: string[]): string[] {
  const problems: string[] = [];
  if (!data.seoTitle) problems.push('no seoTitle in the reader\'s search words');
  if (!data.glossary?.length) problems.push('no glossary terms');
  const takeaways = data.takeaways ?? [];
  if (takeaways.length < 2 || takeaways.some((t) => typeof t === 'string' || !t.href)) {
    problems.push('"In this lesson" needs at least two takeaways, each with an href to its section');
  }
  for (const h of h2s) {
    if (COUNTED_HEADING.test(h)) problems.push(`heading counts instead of naming its point: "${h}"`);
    if (SKELETON_HEADING.test(h)) problems.push(`shared closing heading, name the section's point instead: "${h}"`);
  }
  return problems;
}
