/**
 * Backfill / batch render reel cover thumbnails from saved plan JSONs.
 *
 * The main orchestrator (`scripts/render-reels.mjs`) renders thumbnails by
 * default for every fresh reel render. This standalone script is for:
 *
 *   1. Backfilling thumbnails for reels that were rendered before the
 *      thumbnail composition existed.
 *   2. Iterating on the thumbnail design without re-running the full
 *      LLM → TTS → mp4 pipeline (which costs ~1.5 min/reel).
 *   3. Re-emitting thumbnails after a Thumbnail.tsx style change
 *      (CSS-var swap, type scale tweak, etc.).
 *
 * Usage:
 *   node scripts/render-thumbnails.mjs                   # all Discovery
 *   node scripts/render-thumbnails.mjs --level building
 *   node scripts/render-thumbnails.mjs --level all
 *   node scripts/render-thumbnails.mjs <slug>            # single
 *   node scripts/render-thumbnails.mjs --variant 1       # use 2nd hook variant
 *
 * Output: output/thumbnails/<level>/NN-slug.png (1080×1920, ~150-200KB each).
 *
 * Wall-clock: ~5-8s per still on the typical dev machine (bundle once,
 * then renderStill is fast). The bundling step dominates; we run each
 * thumbnail through `npx tsx src/render-thumbnail.ts` which re-bundles
 * per call. For 16 reels that's ~2-3 min total, acceptable for a backfill
 * that runs occasionally. If this becomes a bottleneck, hoist the bundle
 * into this orchestrator and call `renderStill` directly in a loop.
 */

import { join } from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const OUTPUT_BASE = join(import.meta.dirname, "../output");
const REMOTION_DIR = join(import.meta.dirname, "../remotion");

function dirsForLevel(level) {
  return {
    plans: join(OUTPUT_BASE, "plans", level),
    thumbnails: join(OUTPUT_BASE, "thumbnails", level),
  };
}

function parseArgs(argv) {
  const opts = { slug: null, level: "discovery", variant: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--level") opts.level = argv[++i];
    else if (a.startsWith("--level=")) opts.level = a.slice(8);
    else if (a === "--variant") opts.variant = Number(argv[++i]);
    else if (a.startsWith("--variant=")) opts.variant = Number(a.slice(10));
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else if (a.startsWith("--")) { console.error(`Unknown flag: ${a}`); process.exit(2); }
    else rest.push(a);
  }
  if (rest.length > 0) opts.slug = rest[0];
  if (!["discovery", "building", "all"].includes(opts.level)) {
    console.error(`--level must be discovery|building|all (got "${opts.level}")`);
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log(`Backfill reel cover thumbnails from saved plans.

Usage:
  node scripts/render-thumbnails.mjs [slug] [flags]

Flags:
  --level discovery|building|all   Source folder (default: discovery)
  --variant 0|1|2                  Force a specific hook variant (default: use plan.useHookVariant)
  -h, --help                       Show this help
`);
}

/**
 * List the plan files at a given level. Filename convention: NN-slug.json.
 * Returns absolute paths.
 */
async function listPlansForLevel(level, filterSlug) {
  const dir = dirsForLevel(level).plans;
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const plans = files
    .filter(f => f.endsWith(".json"))
    .map(f => join(dir, f));
  if (filterSlug) {
    // Match either by exact base (NN-slug) or by slug fragment after the order prefix.
    return plans.filter(p => {
      const base = p.split("/").pop().replace(/\.json$/, "");
      return base === filterSlug || base.replace(/^\d+-/, "") === filterSlug;
    });
  }
  return plans;
}

async function renderOne({ planPath, level, variantOverride }) {
  const dirs = dirsForLevel(level);
  await mkdir(dirs.thumbnails, { recursive: true });

  const base = planPath.split("/").pop().replace(/\.json$/, "");
  const outPath = join(dirs.thumbnails, `${base}.png`);
  const variantArg = variantOverride !== null && variantOverride !== undefined
    ? String(variantOverride)
    : "";

  console.log(`┌─ ${base}`);
  execSync(
    `cd "${REMOTION_DIR}" && npx tsx src/render-thumbnail.ts "${planPath}" "${outPath}" ${variantArg}`,
    { stdio: "inherit" },
  );
  console.log(`└─ ✓ ${outPath.replace(import.meta.dirname + "/..", ".")}\n`);
  return outPath;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const levels = opts.level === "all" ? ["discovery", "building"] : [opts.level];

  let allPlans = [];
  for (const level of levels) {
    const plans = await listPlansForLevel(level, opts.slug);
    for (const p of plans) allPlans.push({ planPath: p, level });
  }

  if (allPlans.length === 0) {
    console.error(`No plan JSONs found${opts.slug ? ` matching "${opts.slug}"` : ""} at level "${opts.level}".`);
    process.exit(1);
  }

  console.log(`Rendering ${allPlans.length} thumbnail${allPlans.length > 1 ? "s" : ""} (level=${opts.level})\n`);

  let done = 0, failed = 0;
  for (const { planPath, level } of allPlans) {
    try {
      await renderOne({ planPath, level, variantOverride: opts.variant });
      done++;
    } catch (err) {
      console.error(`└─ ✗ FAILED: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`Done. ${done} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
