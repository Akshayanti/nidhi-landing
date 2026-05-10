#!/usr/bin/env node
/**
 * Rasterise blog figures into Instagram-ready PNGs.
 *
 * Reads each figure (`<figure>...</figure>` block) directly from the markdown
 * source, drops the SVG + figcaption into a brand-styled portrait template,
 * and screenshots via puppeteer at the target dimensions.
 *
 * Outputs:
 *   output/instagram/figures/{slug}/story.png      (1080×1920, IG story)
 *   output/instagram/figures/{slug}/carousel.png   (1080×1350, IG carousel slide)
 *
 * Usage:
 *   npm run render-figures                 # all 8 figures × 2 formats
 *   npm run render-figures -- <slug>       # single post, both formats
 *
 * The brand CSS variables and the figure SVG class library (`.fig-*`) are
 * extracted from `src/styles/global.css` at runtime so the rendered output
 * stays in lockstep with the live site. No drift.
 */
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const GLOBAL_CSS = join(ROOT, "src/styles/global.css");
const OUT_DIR = join(ROOT, "output/instagram/figures");

const FORMATS = {
  story:    { width: 1080, height: 1920 },
  carousel: { width: 1080, height: 1350 },
};

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

function extractFigure(text) {
  const m = text.match(/<figure\b[^>]*>([\s\S]*?)<\/figure>/);
  if (!m) return null;
  const inner = m[1];
  const svgMatch = inner.match(/<svg[\s\S]*?<\/svg>/);
  const capMatch = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
  if (!svgMatch) return null;
  return {
    svg: svgMatch[0],
    figcaption: capMatch ? capMatch[1].trim().replace(/\s+/g, " ") : "",
  };
}

function extractCssBlock(css, startMarker, endMarker) {
  const start = css.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? css.indexOf(endMarker, start) : css.length;
  return css.slice(start, end > 0 ? end : css.length);
}

function buildBrandCss(globalCss) {
  // Pull :root brand variables (light mode only — IG export forces light)
  const rootMatch = globalCss.match(/:root\s*\{[\s\S]*?\}/);
  const rootVars = rootMatch ? rootMatch[0] : "";

  // Pull the figure SVG class library + figure container styling.
  // Section markers in global.css are stable; if they ever drift the
  // template falls back gracefully (just less prettiness).
  const figureSection = extractCssBlock(
    globalCss,
    "/* Figcaption (SVG diagrams)",
    "/* Mobile: tighten figure padding",
  );
  const figureBox = extractCssBlock(
    globalCss,
    ".prose figure {",
    "/* Figcaption (SVG diagrams)",
  );
  return `${rootVars}\n${figureBox}\n${figureSection}`;
}

function buildHtml(svg, caption, { width, height }, brandCss, postTitle) {
  // Caption is plain markdown-ish text from the source; strip stray HTML
  // entities and normalize whitespace. No inline HTML rendering needed
  // because all current captions are plain prose.
  const safeCaption = caption
    .replace(/<[^>]+>/g, "")  // strip any inline HTML defensively
    .trim();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
  ${brandCss}

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
  body {
    font-family: var(--font-body);
    background: var(--color-bg);
    color: var(--color-text-primary);
    display: flex;
    flex-direction: column;
    padding: 64px 56px;
  }

  .figure-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 36px;
  }

  /* Force the .prose figure cascade so the global.css rules apply unchanged */
  .prose figure {
    margin: 0;
  }
  .prose figure svg {
    width: 100%;
    height: auto;
    padding: 40px 28px;
  }
  .prose figcaption {
    font-size: 30px;
    line-height: 1.55;
    max-width: 100%;
    margin: 0;
    text-align: center;
  }

  .ig-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 28px;
    border-top: 1px solid var(--color-border-light);
  }
  .ig-footer .handle {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 22px;
    color: var(--color-deep-blue);
    letter-spacing: -0.01em;
  }
  .ig-footer .tagline {
    font-family: var(--font-heading);
    font-weight: 400;
    font-size: 18px;
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="figure-wrap prose">
    <figure>${svg}</figure>
    ${safeCaption ? `<figcaption>${safeCaption}</figcaption>` : ""}
  </div>
  <div class="ig-footer">
    <span class="handle">@nidhi.today</span>
    <span class="tagline">Money, understood</span>
  </div>
</body>
</html>`;
}

// ----- main -----

async function main() {
  const targetSlug = process.argv[2] || null;

  const globalCss = await readFile(GLOBAL_CSS, "utf8");
  const brandCss = buildBrandCss(globalCss);

  const allMd = await walk(BLOG_DIR);
  const figures = [];
  for (const file of allMd) {
    const text = await readFile(file, "utf8");
    const fig = extractFigure(text);
    if (!fig) continue;
    const slug = extractFrontmatterField(text, "slug");
    const title = extractFrontmatterField(text, "title");
    if (!slug) continue;
    if (targetSlug && slug !== targetSlug) continue;
    figures.push({ slug, title, ...fig });
  }

  if (figures.length === 0) {
    console.error(targetSlug
      ? `No figure found for slug "${targetSlug}".`
      : "No figures found in any blog post.");
    process.exit(1);
  }

  console.log(`Rendering ${figures.length} figure(s) × ${Object.keys(FORMATS).length} format(s)...\n`);

  const browser = await puppeteer.launch({ headless: true });
  let rendered = 0;
  let failures = 0;

  try {
    for (const fig of figures) {
      console.log(`→ ${fig.slug} · ${fig.title}`);
      const slugDir = join(OUT_DIR, fig.slug);
      await mkdir(slugDir, { recursive: true });

      for (const [formatName, dims] of Object.entries(FORMATS)) {
        try {
          const page = await browser.newPage();
          await page.setViewport({
            width: dims.width,
            height: dims.height,
            deviceScaleFactor: 1,
          });
          const html = buildHtml(fig.svg, fig.figcaption, dims, brandCss, fig.title);
          await page.setContent(html, { waitUntil: "networkidle0" });
          // Belt-and-braces: wait for fonts to load before screenshot
          await page.evaluate(() => document.fonts.ready);
          const outPath = join(slugDir, `${formatName}.png`);
          await page.screenshot({
            path: outPath,
            type: "png",
            clip: { x: 0, y: 0, width: dims.width, height: dims.height },
          });
          await page.close();
          console.log(`   ✓ ${formatName} (${dims.width}×${dims.height}) → ${outPath.replace(ROOT + "/", "")}`);
          rendered++;
        } catch (err) {
          console.error(`   ✗ ${formatName} FAILED · ${err.message}`);
          failures++;
        }
      }
      console.log("");
    }
  } finally {
    await browser.close();
  }

  console.log(`Done. ${rendered} PNG(s) written${failures ? `, ${failures} failure(s)` : ""}.`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
