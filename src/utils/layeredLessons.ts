// The layered-lesson rule for Optimizing and Inclusive Finances (PLAYBOOK
// "Blog lessons", blog-content-plan.md Rule 10), checked at build time so a
// lesson cannot quietly ship without it. It covers past and future lessons:
// every lesson at these levels must meet it. The last lessons were
// converted on Oct 22, 2026, so there is no backlog; a new lesson at these
// levels must pass from the start.

export const LAYERED_LEVELS = ['optimizing', 'inclusive-finances'] as const;

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
