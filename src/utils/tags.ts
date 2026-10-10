/**
 * Tag helpers for the blog's topic pages.
 *
 * The curated copy that used to live here (a per-tag title and description) is
 * now in the catalog, under `learn.tags`: it is prose a reader sees, so it has
 * to exist once per language, and a module of its own keeps it next to the
 * level names it mirrors. See `src/i18n/strings/learn.ts`.
 *
 * A tag with no catalog entry still gets a page: `formatTag` turns its slug
 * into a heading, and the topic hub uses its generic card line.
 */

/**
 * Convert a kebab-case tag like "net-worth" to a display-friendly
 * "Net Worth". Used as a fallback when a tag is not in the catalog's
 * `learn.tags` table and as the heading text on the tag listing page.
 */
export function formatTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
