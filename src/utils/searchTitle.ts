// A lesson makes one promise: the search title (`seoTitle`, shown in the
// browser tab and search results) may only shorten the page title, never
// change its topic (blog-content-plan.md Rule 11). Checked at build time,
// because the two drifted apart once the page title was allowed to be a
// hook (Oct 22, 2026). Whether the promise is really the same is still an
// editorial call; this catches the words.

export const SEARCH_TITLE_MAX = 57;

const STOP_WORDS = new Set(
  'a an the and or of to for in on with your you is are it its how what why when who if do does vs not at by from as be can'.split(' '),
);

/** Lowercase content words: split on anything not a letter or digit (hyphens and apostrophes too), stop words dropped. */
export function titleWords(title: string): string[] {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP_WORDS.has(w));
}

// Words count as the same when they match exactly, differ only by a final
// "s", or are listed here as forms of one word. A short explicit list, not
// prefix matching, so unrelated words never pass.
const SAME_WORD: Record<string, string> = {
  consolidate: 'consolidation',
  grow: 'growing',
};

function base(word: string): string {
  const w = SAME_WORD[word] ?? word;
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

function sameWord(seo: string, title: string): boolean {
  return base(seo) === base(title);
}

/** Why a search title breaks the rule, or null when it is a shortening of the page title. */
export function searchTitleProblem(title: string, seoTitle: string | undefined): string | null {
  if (!seoTitle) return null;
  if (seoTitle.length > SEARCH_TITLE_MAX) return `seoTitle is ${seoTitle.length} characters, over ${SEARCH_TITLE_MAX}`;
  const page = titleWords(title);
  // Small words ("how to", "your", "the") may be added or dropped freely so
  // the search title reads naturally; every other word must come from the
  // title. A search title made only of small words says nothing.
  const words = titleWords(seoTitle);
  if (!words.length) return 'seoTitle has no words of its own from the title';
  let at = 0;
  for (const word of words) {
    const found = page.findIndex((w, i) => i >= at && sameWord(word, w));
    if (found === -1) {
      return `seoTitle must shorten the title, in the title's order: "${word}" is not in "${title}" after the words before it`;
    }
    at = found + 1;
  }
  return null;
}
