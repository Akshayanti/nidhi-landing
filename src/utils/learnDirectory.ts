/**
 * The directory under "Find a lesson" on /blog/ (src/components/LearnHome.astro):
 * every published lesson as a plain link, grouped by level in folds, then the
 * Inclusive Finances lessons and the How-to guides (council, Nov 21 2026, #721).
 *
 * The rows are the page's one list of lessons: the start card, the level
 * helper and search all read a lesson's title and address from its row. Search
 * text that only search needs sits once in a JSON block, keyed by the same
 * ids. `directoryProblems` is the build's check that the two agree and that
 * every published item is listed exactly once; the page throws on any problem.
 *
 * Pure: the page passes in what it read from the content collections.
 */

export const INCLUSIVE = 'inclusive-finances';
export const GUIDES = 'how-to';
/** A guide's id in the directory and in search, kept apart from lesson slugs. */
export const guideId = (slug: string) => `guide:${slug}`;

export interface DirectoryRow {
  id: string;
  title: string;
  href: string;
  /** The lesson's level, or `how-to` for a guide. */
  level: string;
  /** Reading time in minutes, for a lesson. */
  minutes?: number;
  /** Place in reading order among the ladder lessons, from 0; absent off the ladder. */
  seq?: number;
}

export interface DirectoryGroup {
  /** A level id, `inclusive-finances` or `how-to`. */
  id: string;
  rows: DirectoryRow[];
}

export interface DirectoryLesson {
  id: string;
  title: string;
  href: string;
  level: string;
  readingTime: number;
}

export interface DirectoryGuide {
  id: string;
  title: string;
  href: string;
}

/**
 * The folds, in order: each ladder level that has a lesson, Inclusive Finances,
 * then the guides. `lessons` is in reading order (ladder first, as
 * `getPathPosts` gives it), and each fold keeps that order.
 */
export function directoryGroups(levels: readonly string[], lessons: readonly DirectoryLesson[], guides: readonly DirectoryGuide[]): DirectoryGroup[] {
  const ladder = lessons.filter((l) => l.level !== INCLUSIVE);
  const seq = new Map(ladder.map((l, i) => [l.id, i]));
  const row = (l: DirectoryLesson): DirectoryRow => ({
    id: l.id, title: l.title, href: l.href, level: l.level, minutes: l.readingTime, seq: seq.get(l.id),
  });
  const groups: DirectoryGroup[] = levels.map((id) => ({ id, rows: lessons.filter((l) => l.level === id).map(row) }));
  groups.push({ id: INCLUSIVE, rows: lessons.filter((l) => l.level === INCLUSIVE).map(row) });
  groups.push({ id: GUIDES, rows: guides.map((g) => ({ id: guideId(g.id), title: g.title, href: g.href, level: GUIDES })) });
  return groups.filter((g) => g.rows.length > 0);
}

/**
 * What is wrong with a directory, as sentences; none when it is right.
 * `published` is every lesson slug and guide id (as `guideId`) the site
 * serves; `searchIds` the keys of the search block.
 */
export function directoryProblems(groups: readonly DirectoryGroup[], published: readonly string[], searchIds: readonly string[]): string[] {
  const problems: string[] = [];
  const count = new Map<string, number>();
  for (const g of groups) for (const r of g.rows) count.set(r.id, (count.get(r.id) ?? 0) + 1);
  for (const id of published) {
    const n = count.get(id) ?? 0;
    if (n !== 1) problems.push(`${id} is listed ${n} times in the /blog/ directory, not once`);
  }
  const live = new Set(published);
  for (const id of count.keys()) {
    if (!live.has(id)) problems.push(`${id} is in the /blog/ directory but is not published`);
  }
  for (const id of searchIds) {
    if (!count.has(id)) problems.push(`search entry ${id} has no row in the /blog/ directory`);
  }
  const searchable = new Set(searchIds);
  for (const id of count.keys()) {
    if (!searchable.has(id)) problems.push(`${id} has no search entry on /blog/`);
  }
  return problems;
}
