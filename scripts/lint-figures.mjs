#!/usr/bin/env node
/**
 * Lint blog figures for two known rendering-pipeline gotchas that fail silently
 * in the browser but pass build + curl-DOM checks. Both are documented in
 * `docs/plans/blog-content-plan.md` Editorial Rule 9.
 *
 * Gotcha 1: CommonMark closes a raw HTML block at the first blank line. Blank
 * lines between `<figure>` and `</figure>` (e.g. for visual spacing of SVG
 * groups) terminate the block and dump the rest of the SVG markup as escaped
 * paragraph text below an empty figure box.
 *
 * Gotcha 2: Astro component-scoped `<style>` blocks add a `[data-astro-cid-*]`
 * qualifier to every selector. Markdown-slotted SVG children never receive
 * that attribute, so any `.fig-*` rule placed inside the `BlogPost.astro`
 * `<style>` block silently fails to match. Figure CSS must live in
 * `src/styles/global.css`.
 *
 * Exits non-zero on any violation so the build can fail fast.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const BLOGPOST_LAYOUT = join(ROOT, "src/layouts/BlogPost.astro");

const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md") || entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

// --- Check 1: blank lines inside <figure>...</figure> in blog markdown ---
const figureRe = /<figure\b[^>]*>[\s\S]*?<\/figure>/g;
for (const file of walk(BLOG_DIR)) {
  const text = readFileSync(file, "utf8");
  let m;
  figureRe.lastIndex = 0;
  while ((m = figureRe.exec(text)) !== null) {
    const block = m[0];
    if (/\n[ \t]*\n/.test(block)) {
      const startLine = text.slice(0, m.index).split("\n").length;
      // Pinpoint the offending blank line for a useful error message
      const lines = block.split("\n");
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && lines[i].trim() === "" && i < lines.length - 1) {
          offset = i;
          break;
        }
      }
      errors.push(
        `${relative(ROOT, file)}:${startLine + offset}: blank line inside <figure> block. ` +
          `CommonMark closes the raw HTML block at the first blank line; ` +
          `the rest of the SVG renders as escaped paragraph text. ` +
          `Remove blank lines between <figure> and </figure>.`,
      );
    }
  }
}

// --- Check 2: figure CSS classes inside scoped style block of BlogPost.astro ---
try {
  const layout = readFileSync(BLOGPOST_LAYOUT, "utf8");
  // Match component-scoped <style> blocks (i.e. those WITHOUT is:global)
  const styleRe = /<style(\s+[^>]*)?>([\s\S]*?)<\/style>/g;
  let sm;
  while ((sm = styleRe.exec(layout)) !== null) {
    const attrs = sm[1] || "";
    const body = sm[2];
    if (/\bis:global\b/.test(attrs)) continue; // global blocks are fine
    // Strip CSS comments so a doc-pointer comment doesn't trigger a false positive
    const bodyNoComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
    if (/\.fig-[a-z-]+|\.prose\s+figure\b|\.prose\s+figcaption\b/.test(bodyNoComments)) {
      const startLine = layout.slice(0, sm.index).split("\n").length;
      errors.push(
        `${relative(ROOT, BLOGPOST_LAYOUT)}:${startLine}: figure CSS (.fig-*, .prose figure, .prose figcaption) ` +
          `found inside a scoped <style> block. Astro adds a [data-astro-cid-*] qualifier to ` +
          `scoped selectors, which markdown-slotted SVG children never receive — the rules silently ` +
          `fail to match. Move figure CSS to src/styles/global.css.`,
      );
    }
  }
} catch (e) {
  // Layout file should exist; if it doesn't, surface the error clearly
  errors.push(`could not read ${BLOGPOST_LAYOUT}: ${e.message}`);
}

if (errors.length > 0) {
  console.error("\n✗ lint-figures: blog figure rendering checks failed\n");
  for (const e of errors) console.error("  " + e);
  console.error(
    `\n${errors.length} issue${errors.length === 1 ? "" : "s"} found. ` +
      `See docs/plans/blog-content-plan.md Editorial Rule 9 for context.\n`,
  );
  process.exit(1);
}

console.log(`✓ lint-figures: ${walk(BLOG_DIR).length} blog files checked, no issues.`);
