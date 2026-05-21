/**
 * Prepare figures for a reel.
 *
 * Each blog post may contain one `<figure><svg>...</svg><figcaption/>...</figure>`
 * block. The infrastructure to rasterise these as 1080×1350 PNGs already
 * exists in `scripts/render-figures.mjs` (run via `npm run render-figures`).
 * This module:
 *
 *   1. Extracts figcaption text from the post body (cheap — string parse).
 *   2. Locates the pre-rendered PNG at output/instagram/figures/<slug>/carousel.png.
 *   3. Copies it into remotion/public/figures/<slug>.png so Remotion's
 *      `staticFile()` can resolve it.
 *   4. Returns a list of `{path, caption}` entries the orchestrator passes
 *      to the LLM and into the ReelPlan.
 *
 * If the PNG is missing (operator hasn't run render-figures yet, or the post
 * has no figure), returns an empty list and the pipeline gracefully renders
 * without a figure beat. No hard failure.
 */

import { mkdir, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const FIGURE_PNG_DIR = join(ROOT, "output/instagram/figures");
const REMOTION_PUBLIC_FIGURES = join(ROOT, "remotion/public/figures");

/**
 * Extract figcaption text from a markdown body. Returns the cleaned text or
 * empty string if no figure is present.
 *
 * @param {string} body
 */
export function extractFigcaption(body) {
  const figMatch = body.match(/<figure\b[^>]*>([\s\S]*?)<\/figure>/);
  if (!figMatch) return "";
  const capMatch = figMatch[1].match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
  if (!capMatch) return "";
  return capMatch[1]
    .replace(/<[^>]+>/g, "")        // strip any inline tags
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a file exists.
 * @param {string} path
 */
async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepare figures for a post.
 *
 * @param {object} args
 * @param {string} args.slug
 * @param {string} args.body - blog post body markdown
 * @returns {Promise<Array<{ path: string; caption: string }>>}
 *   List of figure descriptors. `path` is relative to remotion/public/ so it
 *   can be passed straight into `staticFile()`.
 */
export async function prepareFigures({ slug, body }) {
  const caption = extractFigcaption(body);
  if (!caption) return [];

  // The post has a figure (figcaption found). Look for the pre-rendered PNG.
  const pngSrc = join(FIGURE_PNG_DIR, slug, "carousel.png");
  const pngExists = await fileExists(pngSrc);

  if (!pngExists) {
    // Source not yet rasterised. The operator should run:
    //   npm run render-figures -- <slug>
    // We don't run puppeteer here ourselves to keep the reel pipeline lean.
    return [];
  }

  // Copy into remotion/public/figures/<slug>.png
  await mkdir(REMOTION_PUBLIC_FIGURES, { recursive: true });
  const dest = join(REMOTION_PUBLIC_FIGURES, `${slug}.png`);
  await copyFile(pngSrc, dest);

  return [
    {
      path: `figures/${slug}.png`,
      caption,
    },
  ];
}
