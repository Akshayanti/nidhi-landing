/**
 * Corrections, shown rather than only promised.
 *
 * A lesson that gets something substantive wrong carries a `corrections` entry
 * in its frontmatter: the date and one plain sentence saying what changed. The
 * lesson shows the note above its title, and the editorial policy page lists
 * every published one, newest first. The policy says a substantive correction
 * also moves the lesson's "last updated" date, so the build holds a note to
 * that: a correction dated after `updatedDate`, or before the lesson was
 * published, fails it.
 *
 * Typos get no note; they are fixed quietly, as the policy says.
 */

export interface CorrectionPost {
  data: {
    slug: string;
    title: string;
    pubDate: Date;
    updatedDate?: Date;
    corrections?: Array<{ date: Date; note: string }>;
  };
}

export interface Correction {
  date: Date;
  note: string;
  slug: string;
  title: string;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A lesson's corrections whose day has come. A correction dated ahead (written
 * now, for a fix that ships with a later update) stays hidden until its date.
 */
export function liveCorrections<T extends { date: Date }>(corrections: T[] | undefined, now: Date): T[] {
  return (corrections ?? []).filter((c) => c.date <= now);
}

/** Every live correction on a published lesson, newest first; ties keep lesson order. */
export function publishedCorrections(posts: CorrectionPost[], now: Date): Correction[] {
  return posts
    .filter((p) => p.data.pubDate <= now)
    .flatMap((p) => liveCorrections(p.data.corrections, now).map((c) => ({ ...c, slug: p.data.slug, title: p.data.title })))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Fails the build on a correction the lesson's dates contradict. */
export function assertCorrectionDates(posts: CorrectionPost[]): void {
  const problems: string[] = [];
  for (const { data } of posts) {
    for (const c of data.corrections ?? []) {
      if (day(c.date) < day(data.pubDate)) {
        problems.push(`${data.slug}: correction dated ${day(c.date)}, before the lesson was published (${day(data.pubDate)}).`);
      }
      if (!data.updatedDate || day(c.date) > day(data.updatedDate)) {
        problems.push(`${data.slug}: correction dated ${day(c.date)}, but updatedDate is ${data.updatedDate ? day(data.updatedDate) : 'missing'}. A substantive correction moves the "last updated" date too.`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Lesson corrections do not match their dates:\n${problems.join('\n')}`);
}
