/**
 * The How-to guides (/how-to/<slug>/): which are live, in what order, how
 * long they take to read, and which lessons they lean on.
 *
 * A guide goes live on its pubDate, like a lesson, and shows in dev before
 * then. It names its lessons by slug; the build fails on a slug that does not
 * exist, and on a shared figure the named lesson no longer contains, so a
 * lesson edit cannot leave a guide saying something else. A lesson that exists
 * but is not published yet is simply not linked until it is.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { HOW_TO_ALIASES } from '../i18n/strings/howToAliases';
import { GUIDE_LAYERS, SITUATION_MIN_GUIDES, reviewNotices, situationBuilt } from './guideLayers';

export const GUIDE_HUB = '/how-to/';
export const GUIDE_GROUPS = ['month', 'owe', 'stock', 'borders', 'safe'] as const;

/**
 * The "Common questions" under the hub's search box: three guides for a
 * reader who doesn't know the word for their problem. Chosen by the council;
 * a guide that is not live yet is skipped.
 */
export const COMMON_GUIDES = [
  'will-my-money-last-until-payday',
  'how-do-i-list-what-i-owe',
  'how-can-i-check-a-suspicious-money-message',
] as const;
/**
 * The three guides named on /blog/'s "One money question?" side, one per
 * problem a scared reader recognises at a glance. Chosen by the council; a
 * guide that is not live yet is skipped.
 */
export const FEATURED_GUIDES = [
  'will-my-money-last-until-payday',
  'how-do-i-list-what-i-owe',
  'how-can-i-check-a-suspicious-money-message',
] as const;
export type GuideGroup = (typeof GUIDE_GROUPS)[number];

export type Guide = CollectionEntry<'guides'>;

export function guidePath(slug: string): string {
  return `${GUIDE_HUB}${slug}/`;
}

/** Everything a reader reads on the page, for the reading time and for search. */
export function guideText(g: Guide['data']): string {
  return [
    g.title, g.outcome, ...g.answer, g.scope.can, g.scope.cannot, ...g.needs,
    ...(g.protective ? [g.protective.heading, ...g.protective.now, ...g.protective.canWait, g.protective.note ?? ''] : []),
    ...g.steps.flatMap((s) => [s.action, s.why, s.example ?? '', s.caution ?? '']),
    g.stopHere, g.leftToYou, ...g.dependsOn,
  ].join(' ');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** The longest a guide may take to read (owner, Nov 10 2026). The build fails above it: narrow the question instead. */
export const GUIDE_MAX_MINUTES = 4;

/** Whole minutes at 200 words a minute, never under one: guides are read slowly, often by someone worried. */
export function guideReadingMinutes(g: Guide['data']): number {
  return Math.max(1, Math.round(countWords(guideText(g)) / 200));
}

/** Live guides (all in dev), checked against the lessons, in hub order. */
export async function getGuides(): Promise<Guide[]> {
  const isDev = import.meta.env.DEV;
  const now = new Date();
  const [guides, lessons] = await Promise.all([getCollection('guides'), getCollection('blog')]);
  assertGuides(guides, lessons);
  assertGuideLists(guides);
  const live = guides.filter((g) => isDev || g.data.pubDate <= now);
  noticeLayers(live);
  return guides
    .filter((g) => isDev || g.data.pubDate <= now)
    .sort((a, b) =>
      GUIDE_GROUPS.indexOf(a.data.group) - GUIDE_GROUPS.indexOf(b.data.group)
      || a.data.pubDate.getTime() - b.data.pubDate.getTime()
      || a.data.title.localeCompare(b.data.title));
}

export function assertGuides(guides: Guide[], lessons: CollectionEntry<'blog'>[]): void {
  const bySlug = new Map(lessons.map((l) => [l.data.slug, l]));
  const seen = new Set<string>();
  for (const g of guides) {
    const d = g.data;
    if (seen.has(d.slug)) throw new Error(`Two guides share the slug "${d.slug}"`);
    seen.add(d.slug);
    for (const slug of d.lessons) {
      if (!bySlug.has(slug)) throw new Error(`Guide ${d.slug}: lesson "${slug}" does not exist`);
    }
    for (const f of d.sharedFigures ?? []) {
      const lesson = bySlug.get(f.lesson);
      if (!lesson) throw new Error(`Guide ${d.slug}: shared figure names lesson "${f.lesson}", which does not exist`);
      if (!(lesson.body ?? '').includes(f.value) && !JSON.stringify(lesson.data).includes(f.value)) {
        throw new Error(`Guide ${d.slug}: lesson "${f.lesson}" no longer contains "${f.value}". Update the guide and the lesson together.`);
      }
    }
    for (const r of d.related) {
      if (r === d.slug) throw new Error(`Guide ${d.slug}: lists itself as a related question`);
      if (!guides.some((o) => o.data.slug === r)) throw new Error(`Guide ${d.slug}: related guide "${r}" does not exist`);
    }
    const minutes = guideReadingMinutes(d);
    if (minutes > GUIDE_MAX_MINUTES) {
      throw new Error(`Guide ${d.slug}: reads in ${minutes} minutes; the limit is ${GUIDE_MAX_MINUTES}. Narrow the question or cut.`);
    }
    if (d.form === 'example' && !d.stepsHeading) throw new Error(`Guide ${d.slug}: a worked example needs a stepsHeading`);
    for (const c of d.corrections ?? []) {
      if (c.date > d.lastChecked) throw new Error(`Guide ${d.slug}: a correction dated after lastChecked; move lastChecked too`);
    }
  }
}

/** Checks that hold across guides: the lists of guide slugs kept outside the guides. */
export function assertGuideLists(guides: Guide[]): void {
  const slugs = new Set(guides.map((g) => g.data.slug));
  for (const [list, ids] of [['FEATURED_GUIDES', FEATURED_GUIDES], ['COMMON_GUIDES', COMMON_GUIDES]] as const) {
    for (const id of ids) if (!slugs.has(id)) throw new Error(`${list} names "${id}", which is no guide`);
  }
  for (const [locale, aliases] of Object.entries(HOW_TO_ALIASES)) {
    for (const id of Object.keys(aliases ?? {})) {
      if (!slugs.has(id)) throw new Error(`How-to search phrases (${locale}) name "${id}", which is no guide`);
    }
  }
}

let noticed = false;
/** Once per build: say which switched-off layers have reached their review count. */
function noticeLayers(live: Guide[]): void {
  if (noticed) return;
  noticed = true;
  const perGroup = new Map<string, number>();
  for (const g of live) perGroup.set(g.data.group, (perGroup.get(g.data.group) ?? 0) + 1);
  for (const line of reviewNotices({ guides: live.length, largestGroup: Math.max(0, ...perGroup.values()) })) {
    console.warn(line);
  }
}

export type Situation = CollectionEntry<'situations'>;

/**
 * Situation pages that are built: none while the layer is off; when on, the
 * published ones (all in dev) that list enough live guides. A published page
 * with too few is a build error rather than a quietly missing page.
 */
export async function getSituations(): Promise<{ situation: Situation; guides: Guide[] }[]> {
  const isDev = import.meta.env.DEV;
  const now = new Date();
  const [situations, guides] = await Promise.all([getCollection('situations'), getGuides()]);
  const bySlug = new Map(guides.map((g) => [g.data.slug, g]));
  const all = await getCollection('guides');
  for (const s of situations) {
    for (const id of s.data.guides) {
      if (!all.some((g) => g.data.slug === id)) throw new Error(`Situation ${s.data.slug}: guide "${id}" does not exist`);
    }
  }
  if (!GUIDE_LAYERS.situationPagesPublic) return [];
  return situations
    .filter((s) => isDev || s.data.pubDate <= now)
    .map((s) => {
      const live = s.data.guides.map((id) => bySlug.get(id)).filter((g): g is Guide => Boolean(g));
      if (!situationBuilt(live.length)) {
        throw new Error(`Situation ${s.data.slug}: ${live.length} live guides; a situation page needs at least ${SITUATION_MIN_GUIDES}`);
      }
      return { situation: s, guides: live };
    });
}

export function situationPath(slug: string): string {
  return `${GUIDE_HUB}situation/${slug}/`;
}

/** Lesson slug → the guides that name it as their main lesson, for the line under a lesson's TL;DR. */
export async function guidesByMainLesson(): Promise<Map<string, { slug: string; title: string; minutes: number }[]>> {
  const map = new Map<string, { slug: string; title: string; minutes: number }[]>();
  for (const g of await getGuides()) {
    const main = g.data.lessons[0];
    const list = map.get(main) ?? [];
    list.push({ slug: g.data.slug, title: g.data.title, minutes: guideReadingMinutes(g.data) });
    map.set(main, list);
  }
  return map;
}
