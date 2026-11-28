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
import { join } from 'node:path';

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

/** The page's card, or undefined when it has none and the default card applies. */
export function shareCard(kind: ShareCardKind, slug: string, title: string, what: string): ShareCard | undefined {
  const image = `/brand/social/${kind}/${slug}.png`;
  return existsSync(join(process.cwd(), 'public', image)) ? { image, imageAlt: shareCardAlt(title, what) } : undefined;
}
