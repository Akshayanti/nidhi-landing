/**
 * How many sources the lessons point readers to, for the About page.
 *
 * It counts what a reader can check: the `referentialReading` list under each
 * published lesson. A work listed under several lessons is one source, and so
 * is a book linked through two editions, so works are told apart by their
 * title, not their address. Sources cited only inside a lesson's text are not
 * in these lists, and the sentence on the page says so.
 * Both the listed total and the distinct count are worked out, so a change to
 * the content model shows up here rather than in a quietly wrong number.
 */

export interface SourcePost {
  data: {
    pubDate: Date;
    referentialReading?: Array<{ title: string; url: string }>;
  };
}

export interface SourceCounts {
  /** Published lessons, every level, as the home page counts them. */
  lessons: number;
  /** Entries across every further-reading list, repeats included. */
  listed: number;
  /** Distinct works, told apart by title (case and punctuation aside). */
  distinct: number;
}

export function sourceCounts(posts: SourcePost[], now: Date): SourceCounts {
  const live = posts.filter((p) => p.data.pubDate <= now);
  const works = live.flatMap((p) => (p.data.referentialReading ?? []).map((r) => workKey(r.title)));
  return { lessons: live.length, listed: works.length, distinct: new Set(works).size };
}

/** One work, whatever edition or capitalisation a lesson links it under. */
function workKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
