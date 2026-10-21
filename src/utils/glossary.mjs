// Lesson glossary helpers, shared by the lesson page (its glossary card and
// link checks) and the /blog/glossary/ page.

/** Anchor id for a term: "Recognition gap" -> "term-recognition-gap". */
export function termId(term) {
  return 'term-' + term
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The id of the glossary card itself, the target of `#glossary` links. */
export const GLOSSARY_CARD_ID = 'glossary';
