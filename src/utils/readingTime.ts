// Minutes to read a post's body at 250 words a minute. Figure code is not
// reading: inline <svg> blocks (path coordinates, attributes) are removed, and
// any other HTML tags are stripped so only their visible text is counted.
// Figure captions stay, since readers do read them.
const WORDS_PER_MINUTE = 250;

function countWords(text: string): number {
  const readable = text
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    // Only real tags (a letter after `<`), so prose like "rate < current" stays.
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
  return readable.split(/\s+/).filter(Boolean).length;
}

export function getReadingTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE));
}

// Splits a lesson into its main path and its deep layer: the contents of the
// `<details class="lesson-depth">` expanders (evidence, country notes, edge
// cases) that a reader opens only if they want more. A depth block's summary
// is always on screen, so it stays in the main path, as do quick checks. A
// <details> nested inside a depth block belongs to it.
export function splitDepth(text: string): { main: string; depth: string } {
  const tag = /<details\b[^>]*>|<\/details\s*>/gi;
  let main = '';
  let depth = '';
  let cursor = 0;
  let level = 0; // nesting inside the current depth block, 0 when outside
  let m: RegExpExecArray | null;
  while ((m = tag.exec(text))) {
    const opening = m[0][1] !== '/';
    if (level === 0) {
      if (opening && /\bclass\s*=\s*["'][^"']*\blesson-depth\b/i.test(m[0])) {
        main += text.slice(cursor, tag.lastIndex);
        cursor = tag.lastIndex;
        // The block's own summary, if it comes first, is main-path text.
        const summary = /^\s*<summary\b[\s\S]*?<\/summary\s*>/i.exec(text.slice(cursor));
        if (summary) {
          main += summary[0];
          cursor += summary[0].length;
          tag.lastIndex = cursor;
        }
        level = 1;
      }
    } else {
      level += opening ? 1 : -1;
      if (level === 0) {
        depth += text.slice(cursor, m.index);
        main += m[0];
        cursor = tag.lastIndex;
      }
    }
  }
  // An unclosed depth block runs to the end, as a browser would render it.
  if (level > 0) depth += text.slice(cursor);
  else main += text.slice(cursor);
  return { main, depth };
}

export interface LayeredReadingTime {
  /** Minutes for everything outside the depth expanders' contents. */
  main: number;
  /** Minutes inside them; 0 when the lesson has none. */
  depth: number;
  /** main + depth, so the numbers a reader sees add up. */
  total: number;
}

// Both parts round up, like getReadingTime, so neither understates.
export function getLayeredReadingTime(text: string): LayeredReadingTime {
  const { main, depth } = splitDepth(text);
  const depthWords = countWords(depth);
  const mainMinutes = getReadingTime(main);
  const depthMinutes = depthWords > 0 ? Math.ceil(depthWords / WORDS_PER_MINUTE) : 0;
  return { main: mainMinutes, depth: depthMinutes, total: mainMinutes + depthMinutes };
}
