/**
 * A headline for a feed item whose text is a paragraph.
 *
 * A "What's changed" item is a few sentences with no title of its own. A feed
 * reader shows `<title>` on one line and cuts it where it likes, so the title
 * is the item's first sentence, and the whole text goes in `<description>`
 * (#458). The same rule serves every language the site is written in: Hindi
 * ends a sentence with a danda (।), Marathi, Czech, Spanish and English with a
 * full stop.
 *
 * A title is never cut inside a word. A first sentence that is too long for a
 * headline is cut at the end of a clause where there is one, at a space where
 * there is not, and ends in an ellipsis to say so.
 */

/** The longest a title may be, in characters. Most first sentences are shorter. */
export const TITLE_MAX = 140;

/** Marks that end a sentence, with any closing quote or bracket that follows them. */
const SENTENCE_END = /[.!?।]+["'”’»)\]]*(?=\s|$)/gu;
/** Marks that end a clause, where a long sentence can be cut and still read whole. */
const CLAUSE_END = /[:;,][”’»)]?(?= )/gu;
const LOWER_OR_DIGIT = /^[\p{Ll}\p{Nd}]/u;

/**
 * The first sentence of `text`, with its closing mark. A full stop followed by
 * a lower-case letter or a digit is not an end: it belongs to an abbreviation
 * ("e.g. this", "např. tohle"), a Czech date ("10. listopadu") or a number.
 * Text with no sentence end comes back whole.
 */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  for (const match of trimmed.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length;
    const rest = trimmed.slice(end).trimStart();
    if (rest === '') return trimmed;
    if (match[0].startsWith('.') && LOWER_OR_DIGIT.test(rest)) continue;
    return trimmed.slice(0, end);
  }
  return trimmed;
}

const length = (s: string) => [...s].length;

/** The first sentence of `text`, or the start of it when that runs past `max` characters. */
export function feedTitle(text: string, max: number = TITLE_MAX): string {
  const sentence = firstSentence(text);
  if (length(sentence) <= max) return sentence;

  // Too long for a headline. Room is left for the ellipsis, and a cut is made
  // only before an ordinary space: a no-break space ties a short word to the
  // next one (Czech "v lekci"), and cutting there would strand it.
  const head = [...sentence].slice(0, max - 1).join('');
  const lastSpace = head.lastIndexOf(' ');
  if (lastSpace <= 0) return sentence;
  const within = head.slice(0, lastSpace + 1);

  // The last clause that ends in the second half, so the title is not a stub.
  let cut = -1;
  for (const match of within.matchAll(CLAUSE_END)) {
    const end = match.index + match[0].length;
    if (length(within.slice(0, end)) >= max / 2) cut = end;
  }
  const kept = cut > 0 ? within.slice(0, cut) : within;
  return `${kept.trimEnd().replace(/[:;,]$/u, '')}…`;
}
