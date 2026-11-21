/**
 * Where a reader stands on the learning path, for the start card and the
 * level cards on /blog/ (src/components/LearnHome.astro).
 *
 * Pure and browser-safe: the page's script reads the stored list of lessons
 * this browser has opened and hands it here as text, so this module never
 * touches storage. The list never leaves the browser (see the privacy notice).
 */

/** A lesson on the ladder (not Inclusive Finances), in reading order. */
export interface ProgressLesson {
  id: string;
  level: string;
}

/** The lesson ids in the stored list, or none when it is missing or not a list. */
export function parseProgress(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? new Set(value.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export interface NextLesson<T> {
  lesson: T;
  /** The lesson's place in its level, from 1. */
  index: number;
  /** Lessons in that level. */
  total: number;
  /** Lessons of that level already read. */
  levelRead: number;
}

export interface ProgressState<T> {
  /** Ladder lessons read. */
  readCount: number;
  /** Read lessons per level. */
  perLevel: Map<string, number>;
  /** Something on the ladder has been read. */
  returning: boolean;
  /** Every ladder lesson has been read. */
  finished: boolean;
  /** The level of the next unread lesson, for a returning reader. */
  currentLevel: string | null;
  /**
   * The lesson the start card offers: the first unread one, or the first
   * lesson of all for a new reader. Null only when there is no lesson.
   */
  next: NextLesson<T> | null;
}

/** The reader's place on the ladder: `core` in reading order, `read` the stored ids. */
export function progressState<T extends ProgressLesson>(core: readonly T[], read: ReadonlySet<string>): ProgressState<T> {
  const perLevel = new Map<string, number>();
  let readCount = 0;
  for (const l of core) {
    if (!read.has(l.id)) continue;
    readCount++;
    perLevel.set(l.level, (perLevel.get(l.level) ?? 0) + 1);
  }
  const unread = core.find((l) => !read.has(l.id)) ?? null;
  const returning = readCount > 0;
  const finished = returning && unread === null;
  const offered = unread ?? core[0] ?? null;
  let next: NextLesson<T> | null = null;
  if (offered) {
    const inLevel = core.filter((l) => l.level === offered.level);
    next = {
      lesson: offered,
      index: inLevel.findIndex((l) => l.id === offered.id) + 1,
      total: inLevel.length,
      levelRead: perLevel.get(offered.level) ?? 0,
    };
  }
  return {
    readCount,
    perLevel,
    returning,
    finished,
    currentLevel: returning && unread ? unread.level : null,
    next,
  };
}

/** Which version of the start card to show. */
export function startState(p: Pick<ProgressState<unknown>, 'returning' | 'finished' | 'next'>): 'new' | 'returning' | 'finished' | 'none' {
  if (p.finished) return 'finished';
  if (!p.next) return 'none';
  return p.returning ? 'returning' : 'new';
}
