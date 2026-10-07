#!/usr/bin/env node
/**
 * Regenerate platform captions (.ig.txt / .tiktok.txt / .json) from saved
 * reel plans without re-running TTS / Remotion. Useful when only the
 * caption-writer logic, frontmatter `relatedTool`, or `reelPromise` changed
 * and you don't want to spend ~3 minutes per reel re-rendering video.
 *
 * File naming and the reelPromise stamp mirror render-reels.mjs, including
 * second-angle plans (<NN-slug>-<angle>.json, e.g. the day 2 reel).
 *
 * Usage:
 *   node scripts/regenerate-captions.mjs                       # discovery + building
 *   node scripts/regenerate-captions.mjs --level optimizing    # one level
 *   node scripts/regenerate-captions.mjs --level discovery --slug emergency-fund
 */
import { readFile, readdir } from "node:fs/promises";
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
    const level = ["discovery", "optimizing", "inclusive-finances"].includes(post.meta.level) ? post.meta.level : "building";
    const order = Number.isFinite(post.meta.order) ? Number(post.meta.order) : null;
    const filePrefix = order !== null && level !== "inclusive-finances" ? `${String(order).padStart(2, "0")}-` : "";
    const base = `${filePrefix}${slug}`;
    const plansDir = join(ROOT, "output", "plans", level);
    const captionsDir = join(ROOT, "output", "captions", level);

    // The base plan plus any second-angle plans (<base>-<angle>.json).
    const angleRe = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-([a-z0-9]+)\\.json$`);
    const angleFiles = existsSync(plansDir) ? (await readdir(plansDir)).filter(f => angleRe.test(f)) : [];
    const fileBases = [base, ...angleFiles.map(f => f.slice(0, -".json".length))];

    for (const fileBase of fileBases) {
      const planPath = join(plansDir, `${fileBase}.json`);
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
        // A second-angle plan can carry its own blog teaser; keep it over the post-wide one.
        reelPromise: plan.reelPromise || post.meta.reelPromise,
      });
      console.log(`  rewrote: ${level}/${fileBase}`);
      regenerated++;
    }
  }

  console.log(`\nDone. ${regenerated} regenerated, ${skipped} skipped (no plan yet).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
