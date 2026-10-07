/**
 * What the homepage links to, chosen at build time from the blog collection.
 *
 * The homepage names lessons by slug in three places: the "Start wherever
 * you are" situations, the "grows with you" topics, and (through each post's
 * `relatedTool`) the lesson and tool pairs. Every one of them goes through
 * the same filter, so a scheduled post never gets a homepage link before its
 * pubDate, and a gated tool never appears before it launches.
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

export const LEVEL_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  building: 'Building',
  psychology: 'Psychology',
  optimizing: 'Optimizing',
  mastery: 'Mastery',
};

interface StartingPointDef {
  id: string;
  situation: string;
  detail: string;
  /** The level this situation starts in; null when it draws on several. */
  level: string | null;
  /** In the order a reader should take them. The first live one is where the card's button leads. */
  lessons: string[];
  /** Free tools to try the route on your own numbers, keyed into TOOL_COPY. */
  tools?: string[];
}

export const STARTING_POINTS: StartingPointDef[] = [
  {
    id: 'basics',
    situation: 'I’m starting from the beginning.',
    detail: 'You know you should understand your money better, but not where to begin. Start with the ideas everything else is built on.',
    level: 'discovery',
    lessons: ['what-is-net-worth', 'emergency-fund', 'cash-flow-101'],
    tools: ['/free/multi-currency-net-worth/'],
  },
  {
    id: 'no-plan',
    situation: 'I have some savings, but no plan.',
    detail: 'Money is building up and you are not sure what it should be doing. Learn what saving, investing and goals each are for.',
    level: 'building',
    lessons: ['saving-vs-investing', 'getting-started-investing', 'setting-financial-goals'],
    tools: ['/free/monte-carlo-simulator/'],
  },
  {
    id: 'habits',
    situation: 'I know what to do, but I don’t always do it.',
    detail: 'Most money mistakes are not about knowledge. See how attention, habit and emotion shape the decisions you make.',
    level: 'psychology',
    lessons: ['why-smart-people-make-dumb-money-decisions', 'present-bias-and-your-future-self', 'mental-accounting'],
  },
  {
    id: 'complex',
    situation: 'My finances have got complicated.',
    detail: 'A loan or a home, investments, a household to plan for, or money in more than one country. The same ideas still apply, with more moving parts.',
    level: null,
    lessons: ['understanding-loan-terms', 'taxes-and-your-financial-plan', 'managing-money-across-currencies'],
    tools: ['/free/loan-comparison/', '/free/multi-currency-net-worth/'],
  },
];

interface GrowthTopicDef {
  id: string;
  label: string;
  detail: string;
  lessons: string[];
}

/** Life getting more involved, roughly in the order it tends to happen. */
export const GROWTH_TOPICS: GrowthTopicDef[] = [
  {
    id: 'safety-net',
    label: 'A first salary and a safety net',
    detail: 'Where your money goes, and how much to keep for the unexpected.',
    lessons: ['cash-flow-101', 'emergency-fund'],
  },
  {
    id: 'investing',
    label: 'Investing for the long run',
    detail: 'Risk, diversification and the accounts that make it simpler.',
    lessons: ['understanding-risk', 'diversification'],
  },
  {
    id: 'home',
    label: 'Borrowing, and maybe a home',
    detail: 'What a loan really costs, and whether property fits your plan.',
    lessons: ['understanding-loan-terms', 'real-estate-as-investment'],
  },
  {
    id: 'taxes',
    label: 'Taxes that touch every decision',
    detail: 'Thinking in after-tax terms, and where to hold investments.',
    lessons: ['taxes-and-your-financial-plan', 'tax-advantaged-accounts'],
  },
  {
    id: 'independence',
    label: 'Retirement and financial independence',
    detail: 'What enough looks like, and how long it might take to get there.',
    lessons: ['introduction-to-financial-independence', 'financial-projections'],
  },
  {
    id: 'currencies',
    label: 'Money in more than one country',
    detail: 'Assets, debts and plans in different currencies, seen as one picture.',
    lessons: ['managing-money-across-currencies', 'why-your-euro-buys-more-in-some-countries'],
  },
];

/** Homepage wording for the tools that lessons point to, keyed by URL. */
export const TOOL_COPY: Record<string, { name: string; desc: string; preview: 'donut' | 'bars' | 'fan' }> = {
  '/free/multi-currency-net-worth/': {
    name: 'Net worth calculator',
    desc: 'Add what you own and owe and see your net worth. Works with one currency or several, at live ECB rates.',
    preview: 'donut',
  },
  '/free/loan-comparison/': {
    name: 'Loan comparison',
    desc: 'Put borrowing offers side by side: APR, total cost and how long each takes to pay off.',
    preview: 'bars',
  },
  '/free/monte-carlo-simulator/': {
    name: 'Monte Carlo simulator',
    desc: 'See the range of ways your savings and retirement could turn out, not just one line.',
    preview: 'fan',
  },
};

const withSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);

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
  return [...STARTING_POINTS.flatMap((s) => s.lessons), ...GROWTH_TOPICS.flatMap((t) => t.lessons)];
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

export interface StartingPoint {
  id: string;
  situation: string;
  detail: string;
  level: string | null;
  levelLabel: string | null;
  levelCount: number;
  lessons: LessonLink[];
  tools: Array<{ href: string; name: string }>;
}

/**
 * Situations with at least one live lesson; lessons that are not live yet
 * are left out, and so are tools `isToolLive` rejects.
 */
export function resolveStartingPoints(posts: HomePost[], now: Date, isToolLive: (href: string) => boolean = () => true): StartingPoint[] {
  const live = liveIndex(posts, now);
  const { byLevel } = levelCounts(posts, now);
  return STARTING_POINTS.map((s) => ({
    id: s.id,
    situation: s.situation,
    detail: s.detail,
    level: s.level,
    levelLabel: s.level ? LEVEL_LABELS[s.level] ?? null : null,
    levelCount: s.level ? byLevel[s.level] ?? 0 : 0,
    lessons: toLinks(s.lessons, live),
    tools: (s.tools ?? [])
      .filter((href) => TOOL_COPY[href] && isToolLive(href))
      .map((href) => ({ href, name: TOOL_COPY[href].name })),
  })).filter((s) => s.lessons.length > 0);
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

export interface GrowthTopic {
  id: string;
  label: string;
  detail: string;
  lessons: LessonLink[];
}

export function resolveGrowthTopics(posts: HomePost[], now: Date): GrowthTopic[] {
  const live = liveIndex(posts, now);
  return GROWTH_TOPICS.map((t) => ({ ...t, lessons: toLinks(t.lessons, live) })).filter((t) => t.lessons.length > 0);
}

export interface LessonToolPair {
  lesson: LessonLink;
  tool: { href: string; name: string; desc: string; preview: 'donut' | 'bars' | 'fan' };
}

/**
 * One pair per tool: the earliest live lesson (in reading order) that names
 * it as its `relatedTool`. `isToolLive` lets the caller hide gated tools.
 */
export function lessonToolPairs(posts: HomePost[], now: Date, isToolLive: (href: string) => boolean): LessonToolPair[] {
  const sorted = posts
    .filter((p) => isLive(p, now) && p.data.relatedTool)
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
  const pairs = new Map<string, LessonToolPair>();
  for (const p of sorted) {
    const href = withSlash(p.data.relatedTool!.url);
    const copy = TOOL_COPY[href];
    if (!copy || pairs.has(href) || !isToolLive(href)) continue;
    pairs.set(href, {
      lesson: { slug: p.data.slug, title: p.data.title, href: `/blog/${p.data.slug}/` },
      tool: { href, ...copy },
    });
  }
  return [...pairs.values()];
}

/**
 * The live ladder lessons in reading order, for the "Continue learning" link.
 * Inclusive Finances posts are optional follow-ups, so they are left out.
 */
export function readingOrder(posts: HomePost[], now: Date): LessonLink[] {
  return posts
    .filter((p) => isLive(p, now) && (LADDER_LEVELS as readonly string[]).includes(p.data.level))
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99))
    .map((p) => ({ slug: p.data.slug, title: p.data.title, href: `/blog/${p.data.slug}/` }));
}

/**
 * The next lesson for someone who has read `readSlugs`: the first unread
 * lesson after the furthest one they have read, so a reader who jumped
 * ahead (often from a search) carries on from there rather than being sent
 * back to the start. Once nothing is left after that point, the earliest
 * lesson they skipped. Null when they have read nothing on the current path
 * (then the page keeps "Start learning"), or all of it.
 */
export function nextLesson(order: LessonLink[], readSlugs: string[]): LessonLink | null {
  const read = new Set(readSlugs);
  let furthest = -1;
  order.forEach((l, i) => { if (read.has(l.slug)) furthest = i; });
  if (furthest < 0) return null;
  const unread = (l: LessonLink) => !read.has(l.slug);
  return order.slice(furthest + 1).find(unread) ?? order.find(unread) ?? null;
}
