#!/usr/bin/env node
/**
 * Rasterise blog figures into email-ready PNGs.
 *
 * Why this exists: Gmail (web/Android/iOS) and most Outlook clients strip
 * inline <svg> from HTML email entirely — they keep the SVG's text descendants
 * (title/desc/<text>) but throw away the SVG container and all the rect /
 * path / polyline drawing, so the figure renders as a blob of run-on prose
 * instead of a chart. There is no way to fix this with inline styling; the
 * only reliable cross-client solution is to rasterise the figure into a
 * regular PNG and reference it from the email via <img>.
 *
 * What this does: walks src/content/blog/**\/*.md, finds every <figure>
 * block, drops each one's <svg> into a brand-styled framing card matching
 * `.prose figure svg` from src/styles/global.css, and screenshots via
 * puppeteer at 2× retina. The brand CSS (:root variables + `.prose figure`
 * styling + the entire .fig-* class library) is extracted from global.css
 * at runtime so the rendered PNG stays in lockstep with the live site.
 *
 * Output:
 *   dist/blog/<slug>/_figures/figure-1.png
 *   dist/blog/<slug>/_figures/figure-2.png
 *   ...
 *
 * Numbering matches the markdown's source order, which (since Astro renders
 * markdown sequentially and passes raw HTML through unmodified) also matches
 * DOM order in the rendered post. scripts/send_newsletter.py walks the post's
 * <figure> elements in DOM order and rewrites them to point at the Nth PNG
 * here — so the contract is "Nth <figure> in source ↔ figure-N.png".
 *
 * Hooked into the build via the `postbuild` npm script so PNGs are written
 * into dist/ before the GitHub Pages artifact is uploaded. The newsletter
 * workflow then references them at https://nidhi.today/blog/<slug>/_figures/
 * figure-N.png — Gmail proxies through its image cache, no separate hosting
 * required.
 *
 * Usage:
 *   npm run build                  # automatic via postbuild
 *   node scripts/render-email-figures.mjs           # all figures
 *   node scripts/render-email-figures.mjs <slug>    # single post
 */
import { readFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const GLOBAL_CSS = join(ROOT, "src/styles/global.css");
const DIST_DIR = join(ROOT, "dist");

// 2× the 544px display width inside the 600px email column. Renders crisp
// on retina inboxes without bloating the PNG (most figures land 50–120KB).
// If you change this, also adjust the `width="544"` attribute that
// scripts/send_newsletter.py sets on the <img> replacement so the displayed
// size stays the same; only the source-pixel density changes.
const RENDER_WIDTH = 1088;

// ----- helpers -----

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const st = await stat(full);
    if (st.isDirectory()) out.push(...(await walk(full)));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function extractFrontmatterField(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"));
  return m ? m[1].trim() : null;
}

/**
 * Extract every <figure>...</figure> SVG block from a markdown source file.
 *
 * Returns one entry per figure in source order. Each entry has only the SVG
 * (figcaptions are kept as plain HTML in the email and rendered separately
 * below the <img>, not baked into the PNG).
 */
function extractFigureSvgs(text) {
  const re = /<figure\b[^>]*>([\s\S]*?)<\/figure>/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const svgMatch = m[1].match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) continue;
    out.push({ svg: svgMatch[0] });
  }
  return out;
}

function extractCssBlock(css, startMarker, endMarker) {
  const start = css.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? css.indexOf(endMarker, start) : css.length;
  return css.slice(start, end > 0 ? end : css.length);
}

function buildBrandCss(globalCss) {
  // :root brand variables (light-mode palette only — emails always render
  // against the light theme; the [data-theme="dark"] override block is
  // intentionally NOT included).
  const rootMatch = globalCss.match(/:root\s*\{[\s\S]*?\}/);
  const rootVars = rootMatch ? rootMatch[0] : "";

  // Figure container + .fig-* class library + figcaption (we don't use the
  // figcaption rule in this script, but pulling the whole "Inline figures"
  // block keeps the slice contiguous and resilient to small edits in
  // global.css).
  const figureSection = extractCssBlock(
    globalCss,
    ".prose figure {",
    "/* Mobile: tighten figure padding",
  );

  return `${rootVars}\n${figureSection}`;
}

function buildHtml(svg, brandCss) {
  // The .render-target div is sized to RENDER_WIDTH so `.prose figure svg`'s
  // `max-width:100%` resolves to that width. Margins on .prose figure are
  // forced to 0 so the screenshot crops tight to the framed SVG.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  ${brandCss}

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; }
  body { padding: 0; }

  .render-target { width: ${RENDER_WIDTH}px; }
  .render-target.prose figure { margin: 0; }
  .render-target.prose figure svg {
    width: 100%;
    height: auto;
  }
</style>
</head>
<body>
  <div class="render-target prose">
    <figure>${svg}</figure>
  </div>
</body>
</html>`;
}

// ----- main -----

async function main() {
  const targetSlug = process.argv[2] || null;

  if (!existsSync(DIST_DIR)) {
    console.error(`[render-email-figures] dist/ not found — run \`npm run build\` first.`);
    process.exit(1);
  }

  const globalCss = await readFile(GLOBAL_CSS, "utf8");
  const brandCss = buildBrandCss(globalCss);

  const allMd = await walk(BLOG_DIR);
  const posts = [];
  for (const file of allMd) {
    const text = await readFile(file, "utf8");
    const figures = extractFigureSvgs(text);
    if (figures.length === 0) continue;
    const slug = extractFrontmatterField(text, "slug");
    if (!slug) continue;
    if (targetSlug && slug !== targetSlug) continue;

    // Only render figures for posts that actually shipped to dist/. Drafts /
    // date-gated posts whose dist directory doesn't exist yet would otherwise
    // produce orphan PNGs in non-existent dist subdirs. Astro emits each
    // published post at dist/blog/<slug>/index.html.
    const postIndex = join(DIST_DIR, "blog", slug, "index.html");
    if (!existsSync(postIndex)) {
      console.log(`[render-email-figures] skip ${slug} — not in dist/ (draft or date-gated)`);
      continue;
    }

    posts.push({ slug, file, figures });
  }

  if (posts.length === 0) {
    console.log(targetSlug
      ? `[render-email-figures] no figures found for slug "${targetSlug}".`
      : "[render-email-figures] no figures to render.");
    return;
  }

  const totalFigures = posts.reduce((n, p) => n + p.figures.length, 0);
  console.log(`[render-email-figures] rendering ${totalFigures} figure(s) across ${posts.length} post(s)…`);

  const browser = await puppeteer.launch({ headless: true });
  let rendered = 0;
  let failures = 0;

  try {
    for (const post of posts) {
      const outDir = join(DIST_DIR, "blog", post.slug, "_figures");
      await mkdir(outDir, { recursive: true });

      for (let i = 0; i < post.figures.length; i++) {
        const num = i + 1;
        const outPath = join(outDir, `figure-${num}.png`);
        try {
          const page = await browser.newPage();
          // Tall viewport so any reasonable figure aspect ratio renders
          // without needing scrolling. Final image is clipped to the
          // measured .render-target box so excess space is discarded.
          await page.setViewport({
            width: RENDER_WIDTH,
            height: 2400,
            deviceScaleFactor: 1,
          });
          const html = buildHtml(post.figures[i].svg, brandCss);
          await page.setContent(html, { waitUntil: "networkidle0" });
          await page.evaluate(() => document.fonts.ready);

          // Measure the rendered framed SVG so the screenshot crops tight.
          // We measure the inner <svg> (which has the white card / border /
          // border-radius / padding from `.prose figure svg`) — that's the
          // visible artwork.
          const box = await page.evaluate(() => {
            const el = document.querySelector(".render-target figure svg");
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          });
          if (!box) throw new Error("could not locate rendered SVG element");

          await page.screenshot({
            path: outPath,
            type: "png",
            // Round outwards so we never clip the border by half a pixel.
            clip: {
              x: Math.floor(box.x),
              y: Math.floor(box.y),
              width: Math.ceil(box.width),
              height: Math.ceil(box.height),
            },
            // omitBackground keeps the rounded corners transparent against
            // the email's white inner table — the visible artwork is the
            // SVG's own white card, not the page body.
            omitBackground: true,
          });
          await page.close();
          console.log(`  ✓ ${post.slug}/figure-${num}.png  (${Math.ceil(box.width)}×${Math.ceil(box.height)})`);
          rendered++;
        } catch (err) {
          console.error(`  ✗ ${post.slug}/figure-${num}.png FAILED · ${err.message}`);
          failures++;
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[render-email-figures] done. ${rendered} PNG(s) written${failures ? `, ${failures} failure(s)` : ""}.`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
