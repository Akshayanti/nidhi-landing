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

export const GUIDE_HUB = '/how-to/';
export const GUIDE_GROUPS = ['month', 'owe', 'borders', 'safe'] as const;
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
    if (d.form === 'example' && !d.stepsHeading) throw new Error(`Guide ${d.slug}: a worked example needs a stepsHeading`);
    for (const c of d.corrections ?? []) {
      if (c.date > d.lastChecked) throw new Error(`Guide ${d.slug}: a correction dated after lastChecked; move lastChecked too`);
    }
  }
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
