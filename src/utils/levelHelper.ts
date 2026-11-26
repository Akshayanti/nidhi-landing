/**
 * The level helper on /blog/ ("Help me choose a level"): two questions, then
 * a suggested level, the reason, and the lessons that cover what the reader
 * could not yet explain.
 *
 * 1. Which ideas could you explain to a friend? Four per level, each taught
 *    by one lesson. A level counts as a gap when two or fewer are ticked.
 * 2. What would help most right now? A goal that points at one level, or
 *    "not sure".
 *
 * A level takes part only once every one of its lessons is published
 * (`eligible`), so the helper never suggests a level that is half written.
 * Psychology sits beside the ladder: it has no ideas to tick, and is
 * suggested when the goal is about following through.
 *
 * Only structure lives here, and only the part the page's script may carry:
 * the goals and the rule that turns ticks into a suggestion. The ideas
 * themselves (which lesson teaches each one) are in `levelConcepts.ts`, which
 * the page reads at build time; the script is handed the ideas of the
 * published levels in the page's data and passes them to `suggestLevel`, so it
 * never names a lesson that is not out yet (#464). Every word the reader sees (an idea's label, a goal's
 * question and the phrase its reason completes) is in the catalog under
 * `blogIndex.island.concepts` and `blogIndex.island.goals`, so a language's
 * helper speaks that language without this module knowing any.
 *
 * Answers never leave the page (see LearnHome.astro and the privacy notice).
 */

import { format } from '../i18n/format.ts';

/** Levels whose ideas build on each other, in order. */
const LADDER = ['discovery', 'building', 'optimizing'] as const;

export interface Concept {
  id: string;
  level: string;
  /** The lesson that teaches it. */
  slug: string;
}

export interface Goal {
  id: string;
  /** Null for "not sure": the ticked ideas decide. */
  level: string | null;
}

export const GOALS: Goal[] = [
  { id: 'picture', level: 'discovery' },
  { id: 'safety', level: 'discovery' },
  { id: 'invest', level: 'building' },
  { id: 'habits', level: 'psychology' },
  { id: 'refine', level: 'optimizing' },
  { id: 'unsure', level: null },
];

/** A level counts as a gap when this many of its ideas, or fewer, are ticked. */
export const GAP_AT_MOST = 2;

export type Reason =
  /** The suggested level has ideas the reader could not tick, and later levels build on them. */
  | 'foundation'
  /** The goal points here, and the reader has what it builds on. */
  | 'goal'
  /** The goal points here, and the reader already knows most of its ideas. */
  | 'goal-known'
  /** Most ideas in every eligible level were ticked. */
  | 'all-known';

export interface Suggestion {
  level: string;
  reason: Reason;
  /** How many of the level's ideas were ticked, out of how many. */
  ticked: number;
  total: number;
  /** Lessons for the ideas not ticked in the suggested level, in order. */
  gapSlugs: string[];
  /** A second level worth a look, after or alongside the first. */
  also: string | null;
}

export function goalsFor(eligible: readonly string[]): Goal[] {
  return GOALS.filter((g) => g.level === null || eligible.includes(g.level));
}

/**
 * `ideas` is the list the reader was shown: the ideas of the eligible levels
 * (`conceptsFor` in levelConcepts.ts), passed in by the page.
 */
export function suggestLevel(ticked: ReadonlySet<string>, goalId: string | null, eligible: readonly string[], ideas: readonly Concept[]): Suggestion {
  const ladder = LADDER.filter((l) => eligible.includes(l));
  const stats = (level: string) => {
    const concepts = ideas.filter((c) => c.level === level);
    const known = concepts.filter((c) => ticked.has(c.id));
    return {
      ticked: known.length,
      total: concepts.length,
      gapSlugs: concepts.filter((c) => !ticked.has(c.id)).map((c) => c.slug),
      isGap: concepts.length > 0 && known.length <= GAP_AT_MOST,
    };
  };
  const firstGap = ladder.find((l) => stats(l).isGap) ?? null;
  const goal = GOALS.find((g) => g.id === goalId && (g.level === null || eligible.includes(g.level)));
  const goalLevel = goal?.level ?? null;
  const psychology = eligible.includes('psychology') ? 'psychology' : null;
  const rank = (level: string) => ladder.indexOf(level as (typeof LADDER)[number]);

  const make = (level: string, reason: Reason, also: string | null): Suggestion => {
    const s = stats(level);
    return { level, reason, ticked: s.ticked, total: s.total, gapSlugs: s.gapSlugs, also: also === level ? null : also };
  };

  if (goalLevel === 'psychology') {
    // The bias lessons lean on the Discovery vocabulary; otherwise they work
    // alongside any level.
    if (firstGap === 'discovery') return make('discovery', 'foundation', 'psychology');
    return make('psychology', 'goal', firstGap);
  }
  if (goalLevel) {
    if (firstGap && rank(firstGap) < rank(goalLevel)) return make(firstGap, 'foundation', goalLevel);
    const known = !stats(goalLevel).isGap;
    const nextGap = ladder.find((l) => rank(l) > rank(goalLevel) && stats(l).isGap) ?? null;
    return make(goalLevel, known ? 'goal-known' : 'goal', known ? nextGap : null);
  }
  if (firstGap) return make(firstGap, 'foundation', null);
  const last = ladder[ladder.length - 1] ?? 'discovery';
  return make(psychology ?? last, 'all-known', psychology ? last : null);
}

/** The catalog lines a suggestion's reason is written from (`blogIndex.island`). */
export interface ReasonWords {
  resultReasonFoundation: string;
  resultReasonGoalPsych: string;
  resultReasonGoal: string;
  resultReasonGoalKnown: string;
  resultReasonAllKnownPsych: string;
  resultReasonAllKnown: string;
}

/**
 * Why the level was suggested, in terms of the reader's own answers. `name`
 * is the level's name and `goalTopic` the phrase of the goal picked, both in
 * the page's language.
 */
export function helperReason(s: Suggestion, name: string, words: ReasonWords, goalTopic?: string): string {
  switch (s.reason) {
    case 'foundation':
      return format(words.resultReasonFoundation, { ticked: s.ticked, total: s.total, level: name });
    case 'goal':
      return s.level === 'psychology'
        ? format(words.resultReasonGoalPsych, { topic: goalTopic ?? '' })
        : format(words.resultReasonGoal, { topic: goalTopic ?? '' });
    case 'goal-known':
      return format(words.resultReasonGoalKnown, { topic: goalTopic ?? '', ticked: s.ticked, total: s.total });
    case 'all-known':
      return s.level === 'psychology' ? words.resultReasonAllKnownPsych : words.resultReasonAllKnown;
  }
}
