#!/usr/bin/env node
/**
 * Regenerate platform captions (.ig.txt / .tiktok.txt / .json) from saved
 * reel plans without re-running TTS / Remotion. Useful when only the
 * caption-writer logic, frontmatter `relatedTool`, or `reelPromise` changed
 * and you don't want to spend ~3 minutes per reel re-rendering video.
 *
 * Usage:
 *   node scripts/regenerate-captions.mjs                       # all levels
 *   node scripts/regenerate-captions.mjs --level discovery     # one level
 *   node scripts/regenerate-captions.mjs --level discovery --slug emergency-fund
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadPosts } from "./lib/parse-blog-meta.mjs";
import { writePlatformCaptions } from "./lib/render-platform-caption.mjs";

const ROOT = join(import.meta.dirname, "..");

function parseArgs(argv) {
  const opts = { level: "all", slug: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--level") opts.level = argv[++i];
    else if (a === "--slug") opts.slug = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const posts = await loadPosts(opts.level === "all" ? "all" : opts.level);
  const filtered = opts.slug ? posts.filter(p => p.meta.slug === opts.slug) : posts;

  let regenerated = 0;
  let skipped = 0;

  for (const post of filtered) {
    const slug = post.meta.slug;
    const order = Number.isFinite(post.meta.order) ? Number(post.meta.order) : null;
    const filePrefix = order !== null ? `${String(order).padStart(2, "0")}-` : "";
    const fileBase = `${filePrefix}${slug}`;

    const level = post.meta.level === "discovery" ? "discovery" : "building";
    const planPath = join(ROOT, "output", "plans", level, `${fileBase}.json`);
    const captionsDir = join(ROOT, "output", "captions", level);

    if (!existsSync(planPath)) {
      console.log(`  skip (no plan): ${level}/${fileBase}`);
      skipped++;
      continue;
    }

    const plan = JSON.parse(await readFile(planPath, "utf-8"));
    await writePlatformCaptions({
      plan,
      captionsDir,
      fileBase,
      relatedTool: post.meta.relatedTool,
      reelPromise: post.meta.reelPromise,
    });
    console.log(`  rewrote: ${level}/${fileBase}`);
    regenerated++;
  }

  console.log(`\nDone. ${regenerated} regenerated, ${skipped} skipped (no plan yet).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
