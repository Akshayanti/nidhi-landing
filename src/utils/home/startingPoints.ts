/**
 * What the homepage links to, chosen at build time from the blog collection.
 *
 * The homepage names lessons by slug in two places: the routes in the lessons
 * section, and the two situations in the hero ("Which sounds like you?").
 * Routes go through the same filter as everything else on the site, so a
 * scheduled post never gets a homepage link before its pubDate and a gated
 * tool never appears before it launches. A situation is a whole chain (lesson,
 * tool, planner question), so it is never shown half-built: the build fails
 * instead (`resolveSituations`).
 *
 * `assertHomepageSlugs` fails the build when a slug named here is not in the
 * collection at all (a typo, or a post renamed later), the same way
 * `assertCompanionHosts` guards the learning path.
 */

export interface HomePost {
  data: {
    slug: string;
    title: string;
    level: string;
    order?: number;
    pubDate: Date;
    relatedTool?: { url: string; label: string; cta: string };
  };
}

export interface LessonLink {
  slug: string;
  title: string;
  href: string;
}

/** The core ladder levels, in reading order. Inclusive Finances is not a step. */
export const LADDER_LEVELS = ['discovery', 'building', 'psychology', 'optimizing', 'mastery'] as const;


/**
 * A route in, as structure alone: which level it starts in, the lessons it
 * walks through in order, and the free tools that go with it. Every word a
 * reader sees for a route lives in the `home` catalog namespace under the same
 * `id`, so translating this page is a catalog entry rather than an edit here.
 */
export interface StartingPointDef {
  id: string;
  /** The level this situation starts in; null when it draws on several. */
  level: string | null;
  /** In the order a reader should take them. The first live one is where the card's button leads. */
  lessons: string[];
  /** Free tools to try the route on your own numbers, keyed into TOOLS. */
  tools?: string[];
  /**
   * Shown even before any of its lessons is live, as an empty route that
   * fills in as they publish. For a level whose lessons are still scheduled.
   */
  showWhenEmpty?: boolean;
}

export const STARTING_POINTS: StartingPointDef[] = [
  {
    id: 'basics',
    level: 'discovery',
    lessons: ['what-is-net-worth', 'emergency-fund', 'cash-flow-101'],
    tools: ['/free/multi-currency-net-worth/'],
  },
  {
    id: 'no-plan',
    level: 'building',
    lessons: ['saving-vs-investing', 'getting-started-investing', 'setting-financial-goals'],
    tools: ['/free/monte-carlo-simulator/'],
  },
  {
    id: 'habits',
    level: 'psychology',
    lessons: ['why-smart-people-make-dumb-money-decisions', 'present-bias-and-your-future-self', 'mental-accounting'],
  },
  {
    id: 'complex',
    level: 'optimizing',
    lessons: ['financial-projections', 'what-if-scenarios', 'cash-flow-forecasting'],
    tools: ['/free/loan-comparison/', '/free/multi-currency-net-worth/'],
    showWhenEmpty: true,
  },
];

export type ToolKey = 'netWorth' | 'loanComparison' | 'monteCarlo' | 'inflation' | 'investOrPayOff';

/**
 * The free tools, in the order the homepage's tools section lists them, each
 * keyed to its catalog entry (`home.toolCards[key]`: the reader's question,
 * the tool's name and one line). Keyed by the address each card opens.
 */
export const TOOLS: Record<string, { key: ToolKey }> = {
  '/free/multi-currency-net-worth/': { key: 'netWorth' },
  '/free/loan-comparison/': { key: 'loanComparison' },
  '/free/invest-or-pay-off/': { key: 'investOrPayOff' },
  '/free/inflation-calculator/': { key: 'inflation' },
  '/free/monte-carlo-simulator/': { key: 'monteCarlo' },
};

/** The tools section's cards: every tool `isToolLive` accepts, in TOOLS order. */
export function liveTools(isToolLive: (href: string) => boolean): Array<{ href: string; key: ToolKey }> {
  return Object.entries(TOOLS)
    .filter(([href]) => isToolLive(href))
    .map(([href, meta]) => ({ href, key: meta.key }));
}

/**
 * The hero's situations: one reader's question, followed through a lesson
 * (Read), a free tool (Try) and the planner (Plan). Structure only; every word
 * is in `home.situations[id]`. The lesson is English in every edition and
 * opens at its one address; the tool is localized by the page.
 */
export const SITUATIONS = [
  { id: 'currencies', lesson: 'managing-money-across-currencies', tool: '/free/multi-currency-net-worth/' },
  { id: 'loans', lesson: 'understanding-loan-terms', tool: '/free/loan-comparison/' },
] as const;

export type SituationId = (typeof SITUATIONS)[number]['id'];

/**
 * The situations ready to render. Each one is a whole chain, so a lesson that
 * is not published or a tool that is not released fails the build with a
 * message, rather than leaving a situation with a missing step.
 */
export function resolveSituations(
  posts: HomePost[],
  now: Date,
  isToolLive: (href: string) => boolean = () => true,
): Array<{ id: SituationId; lesson: LessonLink; tool: { href: string; key: ToolKey } }> {
  const live = liveIndex(posts, now);
  return SITUATIONS.map((s) => {
    const [lesson] = toLinks([s.lesson], live);
    if (!lesson) {
      throw new Error(`The homepage situation "${s.id}" links to the lesson "${s.lesson}", which is not published. Publish it or change SITUATIONS in src/utils/home/startingPoints.ts.`);
    }
    if (!TOOLS[s.tool] || !isToolLive(s.tool)) {
      throw new Error(`The homepage situation "${s.id}" links to the tool ${s.tool}, which is not released. Change SITUATIONS in src/utils/home/startingPoints.ts.`);
    }
    return { id: s.id, lesson, tool: { href: s.tool, key: TOOLS[s.tool].key } };
  });
}

const isLive = (p: HomePost, now: Date) => p.data.pubDate <= now;

function liveIndex<T extends HomePost>(posts: T[], now: Date): Map<string, T> {
  return new Map(posts.filter((p) => isLive(p, now)).map((p) => [p.data.slug, p]));
}

function toLinks<T extends HomePost>(slugs: string[], live: Map<string, T>): LessonLink[] {
  return slugs
    .map((slug) => live.get(slug))
    .filter((p): p is T => !!p)
    .map((p) => ({ slug: p.data.slug, title: p.data.title, href: `/blog/${p.data.slug}/` }));
}

/** Every slug the homepage names, for the build-time check. */
export function homepageSlugs(): string[] {
  return [...STARTING_POINTS.flatMap((s) => s.lessons), ...SITUATIONS.map((s) => s.lesson)];
}

export function assertHomepageSlugs(allPosts: HomePost[]): void {
  const slugs = new Set(allPosts.map((p) => p.data.slug));
  const missing = [...new Set(homepageSlugs())].filter((s) => !slugs.has(s));
  if (missing.length > 0) {
    throw new Error(`The homepage links to posts that do not exist: ${missing.join(', ')}. Fix src/utils/home/startingPoints.ts.`);
  }
}

/** Live lessons per ladder level, and the total. */
export function levelCounts(posts: HomePost[], now: Date): { byLevel: Record<string, number>; total: number; levels: string[] } {
  const byLevel: Record<string, number> = {};
  for (const p of posts) {
    if (!isLive(p, now) || !(LADDER_LEVELS as readonly string[]).includes(p.data.level)) continue;
    byLevel[p.data.level] = (byLevel[p.data.level] ?? 0) + 1;
  }
  const levels = LADDER_LEVELS.filter((l) => byLevel[l]);
  return { byLevel, total: levels.reduce((s, l) => s + byLevel[l], 0), levels };
}

/** A route ready to render: its structure, plus how much of it is live. */
export interface StartingPoint {
  id: string;
  level: string | null;
  levelCount: number;
  lessons: LessonLink[];
  tools: Array<{ href: string }>;
  showWhenEmpty: boolean;
}

/**
 * Routes with at least one live lesson, plus those marked showWhenEmpty
 * (with no lessons until theirs go live); lessons that are not live yet are
 * left out, and so are tools `isToolLive` rejects.
 *
 * No words come back from here: the caller looks up `home.startingPoints[id]`
 * and `home.levels[level]` for those.
 */
export function resolveStartingPoints(posts: HomePost[], now: Date, isToolLive: (href: string) => boolean = () => true): StartingPoint[] {
  const live = liveIndex(posts, now);
  const { byLevel } = levelCounts(posts, now);
  return STARTING_POINTS.map((s) => ({
    id: s.id,
    level: s.level,
    levelCount: s.level ? byLevel[s.level] ?? 0 : 0,
    lessons: toLinks(s.lessons, live),
    tools: (s.tools ?? [])
      .filter((href) => TOOLS[href] && isToolLive(href))
      .map((href) => ({ href })),
    showWhenEmpty: s.showWhenEmpty ?? false,
  })).filter((s) => s.lessons.length > 0 || s.showWhenEmpty);
}

/**
 * Where a starting point's button should lead for someone who has read
 * `readSlugs`: the first unread lesson on the route. `started` says whether
 * they have read any of it, so the button can say "Continue" instead of
 * "Start". `next` is null once the whole route is read.
 */
export function routeNext(route: LessonLink[], readSlugs: string[]): { next: LessonLink | null; started: boolean } {
  const read = new Set(readSlugs);
  return {
    next: route.find((l) => !read.has(l.slug)) ?? null,
    started: route.some((l) => read.has(l.slug)),
  };
}
