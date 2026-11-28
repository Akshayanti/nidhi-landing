/**
 * A page's own share image (the og:image a link preview shows), drawn by
 * `scripts/render-share-cards.mjs` into `public/brand/social/<kind>/<slug>.png`
 * (#420, #743).
 *
 * Guides, lessons and the English tool pages have one. A translated tool page
 * keeps the English brand card, as `docs/brand-identity.md` says (owner,
 * Nov 28, 2026, #743). A page whose card has not been drawn yet gets the
 * site's default card, so a new lesson or tool never breaks the build.
 */
import { existsSync } from 'node:fs';

export type ShareCardKind = 'how-to' | 'lessons' | 'tools';

export interface ShareCard {
  image: string;
  imageAlt: string;
}

/** "What Is Net Worth? A lesson from nidhi.": the title, then what the page is. */
export function shareCardAlt(title: string, what: string): string {
  const t = title.trim();
  return `${t}${/[.?!]$/.test(t) ? '' : '.'} ${what}`;
}

/**
 * Where a lesson's card is kept: outside public/, so that only the cards of
 * published lessons are served (src/pages/brand/social/lessons/[slug].png.ts).
 * Null when it has not been drawn.
 */
export function lessonCardFile(slug: string): string | null {
  const file = `src/share-cards/lessons/${slug}.png`;
  return existsSync(file) ? file : null;
}

/** The page's card, or undefined when it has none and the default card applies. */
export function shareCard(kind: ShareCardKind, slug: string, title: string, what: string): ShareCard | undefined {
  // Read from where the build runs, as GuidePage reads its card: a path with
  // a known start. Guide and tool cards are in public/; a lesson's is served
  // by its own endpoint, at the same kind of address.
  const image = `/brand/social/${kind}/${slug}.png`;
  const drawn = kind === 'lessons' ? lessonCardFile(slug) !== null : existsSync(`public/brand/social/${kind}/${slug}.png`);
  return drawn ? { image, imageAlt: shareCardAlt(title, what) } : undefined;
}
