/**
 * The search results on /blog/ (src/components/LearnHome.astro), as a list to
 * draw: which matches are shown, the line that counts them, and whether a
 * "show all" button is needed. Pure and browser-safe; the ranking itself is
 * `search` in siteSearch.ts.
 *
 * What is typed stays in memory. The one time the address is read is a `?q=`
 * a search engine sent the reader with (`queryFromAddress`), which the page
 * applies and then takes out of the address.
 */
import { plural } from '../i18n/plural.ts';

/** Matches shown before "show all". */
export const RESULT_LIMIT = 8;

/** The longest query the box takes. */
export const QUERY_MAX = 200;

export interface ResultWords {
  noMatches: string;
  lessonOne: string;
  lessonFew: string;
  lessonMany: string;
}

export interface ResultView<M> {
  /** The matches to draw, in rank order. */
  shown: M[];
  /** The count line above them, also said to a screen reader; empty for none. */
  countLine: string;
  /** Nothing matched a query that was typed. */
  none: boolean;
  /** All the matches, when more than are shown: the number "show all" names. 0 for no button. */
  more: number;
}

export function resultView<M extends { kind: 'lesson' | 'guide' }>(
  matches: readonly M[],
  query: string,
  showAll: boolean,
  words: ResultWords,
  lang: string,
): ResultView<M> {
  const trimmed = query.trim();
  if (!trimmed) return { shown: [], countLine: '', none: false, more: 0 };
  const shown = showAll ? [...matches] : matches.slice(0, RESULT_LIMIT);
  const lessons = matches.filter((m) => m.kind === 'lesson').length;
  // Only guides matched: the guides speak for themselves, so no count.
  const countLine = matches.length === 0
    ? words.noMatches
    : lessons === 0
      ? ''
      : `${lessons} ${plural(lang, lessons, words.lessonOne, words.lessonFew, words.lessonMany)}`;
  return {
    shown,
    countLine,
    none: matches.length === 0,
    more: matches.length > shown.length ? matches.length : 0,
  };
}

/**
 * A `?q=` in the page's address: the query to apply, and the address to put
 * back without it. Null when there is none. Anything else in the address
 * (other parameters, the `#` part) is kept.
 */
export function queryFromAddress(href: string): { query: string; address: string } | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const q = url.searchParams.get('q');
  if (!q) return null;
  url.searchParams.delete('q');
  return { query: q.slice(0, QUERY_MAX), address: url.pathname + url.search + url.hash };
}
