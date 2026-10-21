// Markdown plugin (Sätteri, Astro's markdown processor): replaces the raw HTML
// marker `<div data-lesson-glossary></div>` in a lesson body with the glossary
// card built from the lesson's `glossary` frontmatter. The terms have one
// source: the card, the term anchors and /blog/glossary/ all read the same
// list. A marker with no `glossary` in frontmatter is a build error, and so is
// a `glossary` with no marker (the terms would never be shown).
import { GLOSSARY_CARD_ID, termId } from './glossary.mjs';

const MARKER = /^<div data-lesson-glossary><\/div>\s*$/;

const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function cardHtml(entries) {
  const items = entries.map(({ term, definition }) =>
    `<div class="lesson-glossary-item" id="${termId(term)}"><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definition)}</dd></div>`,
  ).join('');
  return `<aside class="lesson-glossary" id="${GLOSSARY_CARD_ID}" aria-labelledby="glossary-label">`
    + '<p class="lesson-glossary-label" id="glossary-label">Words this lesson uses</p>'
    + `<dl class="lesson-glossary-list">${items}</dl>`
    + '<p class="lesson-glossary-more"><a href="/blog/glossary/">Every term from the lessons</a></p>'
    + '</aside>';
}

// A factory, so each file gets its own marker count.
export default function lessonGlossaryPlugin(factoryCtx) {
  const where = factoryCtx.fileURL?.pathname ?? 'a lesson';
  const entries = factoryCtx.data?.astro?.frontmatter?.glossary;
  let found = 0;
  return {
    name: 'lesson-glossary',
    html(node) {
      if (!MARKER.test(node.value.trim())) return;
      found += 1;
      if (found > 1) throw new Error(`${where}: only one <div data-lesson-glossary> per lesson`);
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error(`${where}: <div data-lesson-glossary> needs a "glossary" list in frontmatter`);
      }
      // Each term is a link target, so its anchor must exist and be unique.
      const seen = new Set();
      for (const { term } of entries) {
        const id = termId(term);
        if (id === 'term-') throw new Error(`${where}: glossary term "${term}" has no usable anchor`);
        if (seen.has(id)) throw new Error(`${where}: two glossary terms share the anchor #${id}`);
        seen.add(id);
      }
      return { rawHtml: cardHtml(entries) };
    },
    after() {
      if (found === 0 && Array.isArray(entries) && entries.length > 0) {
        throw new Error(`${where}: "glossary" in frontmatter but no <div data-lesson-glossary></div> in the body`);
      }
    },
  };
}
