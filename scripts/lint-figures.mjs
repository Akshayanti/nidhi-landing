#!/usr/bin/env node
/**
 * Lint blog figures (the prebuild gate). The checks and why each exists are in
 * scripts/lib/lint-figures.mjs, where scripts/lint-figures.test.mjs tests them
 * on fixtures; this reads the lessons, the BlogPost layout and global.css and
 * exits non-zero on any violation so the build fails fast.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFigures } from "./lib/lint-figures.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const BLOGPOST_LAYOUT = join(ROOT, "src/layouts/BlogPost.astro");
const GLOBAL_CSS = join(ROOT, "src/styles/global.css");

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

const files = walk(BLOG_DIR).map((file) => ({ path: relative(ROOT, file), text: readFileSync(file, "utf8") }));
const errors = lintFigures({
  files,
  layout: { path: relative(ROOT, BLOGPOST_LAYOUT), text: readFileSync(BLOGPOST_LAYOUT, "utf8") },
  css: readFileSync(GLOBAL_CSS, "utf8"),
});

if (errors.length > 0) {
  console.error("\n✗ lint-figures: blog figure rendering checks failed\n");
  for (const e of errors) console.error("  " + e);
  console.error(
    `\n${errors.length} issue${errors.length === 1 ? "" : "s"} found. ` +
      `See docs/plans/blog-content-plan.md Editorial Rule 9 for context.\n`,
  );
  process.exit(1);
}

console.log(`✓ lint-figures: ${files.length} blog files checked, no issues.`);
