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
 * Answers never leave the page (see LearnHome.tsx and the privacy notice).
 */

/** Levels whose ideas build on each other, in order. */
const LADDER = ['discovery', 'building', 'optimizing'] as const;

export interface Concept {
  id: string;
  level: string;
  label: string;
  /** The lesson that teaches it. */
  slug: string;
}

export const CONCEPTS: Concept[] = [
  { id: 'net-worth', level: 'discovery', label: 'What net worth is, and how to work it out', slug: 'what-is-net-worth' },
  { id: 'interest', level: 'discovery', label: 'Why the interest rate on a debt matters', slug: 'liabilities' },
  { id: 'emergency-fund', level: 'discovery', label: 'What an emergency fund is for', slug: 'emergency-fund' },
  { id: 'inflation', level: 'discovery', label: 'How inflation shrinks what money buys', slug: 'purchasing-power' },
  { id: 'asset-classes', level: 'building', label: 'How shares, bonds and cash differ', slug: 'investing-101-asset-classes' },
  { id: 'diversification', level: 'building', label: 'What diversification does, and what it does not', slug: 'diversification' },
  { id: 'tax-accounts', level: 'building', label: 'What a tax-advantaged account is', slug: 'tax-advantaged-accounts' },
  { id: 'rebalancing', level: 'building', label: 'Why a portfolio drifts and gets rebalanced', slug: 'rebalancing-your-portfolio' },
  { id: 'fees', level: 'optimizing', label: 'How a 1% yearly fee adds up over decades', slug: 'fee-optimization' },
  { id: 'real-returns', level: 'optimizing', label: 'What a real return is, after inflation and costs', slug: 'real-returns-and-benchmarking' },
  { id: 'tax-loss', level: 'optimizing', label: 'Tax-loss harvesting and asset location', slug: 'tax-loss-harvesting-and-asset-location' },
  { id: 'glide-path', level: 'optimizing', label: 'What a glide path is', slug: 'advanced-rebalancing' },
];

export interface Goal {
  id: string;
  label: string;
  /** Null for "not sure": the ticked ideas decide. */
  level: string | null;
  /** Completes "the lessons on ...". */
  topic?: string;
}

export const GOALS: Goal[] = [
  { id: 'picture', label: 'Seeing clearly where my money stands', level: 'discovery', topic: 'net worth, cash flow and budgeting' },
  { id: 'safety', label: 'Building a safety net, or getting on top of debt', level: 'discovery', topic: 'emergency funds and debt' },
  { id: 'invest', label: 'Starting to invest, or setting goals', level: 'building', topic: 'investing, accounts and goals' },
  { id: 'habits', label: 'Following through on what I already know', level: 'psychology', topic: 'habits, biases and following through' },
  { id: 'refine', label: 'Making a plan I already have work better', level: 'optimizing', topic: 'fees, taxes and fine-tuning a plan' },
  { id: 'unsure', label: 'Not sure yet', level: null },
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

export function conceptsFor(eligible: readonly string[]): Concept[] {
  return CONCEPTS.filter((c) => eligible.includes(c.level));
}

export function goalsFor(eligible: readonly string[]): Goal[] {
  return GOALS.filter((g) => g.level === null || eligible.includes(g.level));
}

export function suggestLevel(ticked: ReadonlySet<string>, goalId: string | null, eligible: readonly string[]): Suggestion {
  const ladder = LADDER.filter((l) => eligible.includes(l));
  const stats = (level: string) => {
    const concepts = CONCEPTS.filter((c) => c.level === level);
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

/** Fails the build when a concept names a lesson that does not exist. */
export function assertConceptSlugs(slugs: ReadonlySet<string>): void {
  const missing = CONCEPTS.filter((c) => !slugs.has(c.slug)).map((c) => `${c.id} -> ${c.slug}`);
  if (missing.length > 0) {
    throw new Error(`Level helper ideas name lessons that do not exist: ${missing.join(', ')}. Fix CONCEPTS in src/utils/levelHelper.ts.`);
  }
}
