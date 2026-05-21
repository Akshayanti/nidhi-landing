/**
 * Reel render orchestrator (v2).
 *
 * Pipeline:
 *   blog post (md) → LLM (Claude) → ReelPlan → scrub → TTS → align spans →
 *   pick music → write input JSON → Remotion render → mp4 + caption.txt + plan.json
 *
 * Usage:
 *   npm run render-reels                                    # all Discovery posts (default)
 *   node scripts/render-reels.mjs <slug>                    # single post
 *   node scripts/render-reels.mjs --level discovery
 *   node scripts/render-reels.mjs --level building
 *   node scripts/render-reels.mjs --level all
 *   node scripts/render-reels.mjs --mode faithful           # force faithful mode
 *   node scripts/render-reels.mjs --mode riff               # force riff mode
 *   node scripts/render-reels.mjs --mode auto               # let LLM pick (default)
 *   node scripts/render-reels.mjs <slug> --variant 1        # use 2nd hook variant
 *   node scripts/render-reels.mjs --plan-only               # generate plans, skip TTS+render
 *   node scripts/render-reels.mjs --no-hookcut              # skip 15s byproduct
 *   node scripts/render-reels.mjs <slug> --variants-all     # render all 3 hook variants
 *
 * Required env: ANTHROPIC_API_KEY  (in .env)
 * Optional env: NIDHI_REEL_MODEL   (default: claude-sonnet-4-5-20250929)
 *               NIDHI_REEL_VOICE   (default: en-GB-RyanNeural)
 *               NIDHI_REEL_RATE    (default: +5%)
 *               NIDHI_REEL_PITCH   (default: -2Hz)
 */

import { join } from "node:path";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadPosts } from "./lib/parse-blog-meta.mjs";
import { generateReelPlan } from "./lib/llm-script-writer.mjs";
import { scrubPlan, assertNoViolations } from "./lib/scrub-output.mjs";
import { generateTTS, stitchNarration, alignSegments } from "./lib/generate-tts.mjs";
import { pickMusic } from "./lib/pick-music.mjs";
import { writePlatformCaptions } from "./lib/render-platform-caption.mjs";
import { prepareFigures } from "./lib/prepare-figures.mjs";

const OUTPUT_BASE = join(import.meta.dirname, "../output");
const REMOTION_DIR = join(import.meta.dirname, "../remotion");
const REMOTION_OUTPUTS = join(REMOTION_DIR, "outputs");
const REMOTION_PUBLIC_AUDIO = join(REMOTION_DIR, "public/audio");

/**
 * Format scrubber violations as a structured user-feedback message for the
 * LLM's next retry attempt. Groups by rule so the LLM can reason about
 * categories (math vs MiFID vs brand-only) and includes the suggested fix
 * verbatim when present.
 *
 * @param {Array<{ rule: string; field: string; quote: string; suggestion?: string }>} violations
 * @returns {string}
 */
function formatRetryFeedback(violations) {
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  const lines = [
    "Your previous JSON plan failed the brand + math scrubber. Below are the violations you must fix.",
    "Output the COMPLETE corrected JSON plan, not a diff. Same schema. Keep what was good.",
    "",
  ];
  for (const [rule, vs] of byRule.entries()) {
    lines.push(`## Rule: ${rule}`);
    for (const v of vs) {
      lines.push(`- field: ${v.field}`);
      lines.push(`  quote: ${JSON.stringify(v.quote)}`);
      if (v.suggestion) lines.push(`  fix:   ${v.suggestion}`);
    }
    lines.push("");
  }
  lines.push(
    "Specific reminders:",
    "- math-consistency: every numerical claim must reconcile with the `assumptions` block (inflation, savings rate, horizon). If you change a number, also update assumptions or the dependent claims.",
    "- mifid-no-hedge / mifid-no-tail: any return % needs BOTH a historical hedge ('historically', 'on average', 'long-run') AND a non-guarantee tail ('future returns are not guaranteed' or equivalent) in the same beat or the next beat.",
    "- us-only-term / india-only-term / banned-hashtag / ticker / named-broker: rewrite without the flagged term.",
    "",
    "Return ONLY the corrected JSON. No prose, no markdown fences.",
  );
  return lines.join("\n");
}

/**
 * Build per-level output paths. Mirrors `src/content/blog/{1. discovery, 2. building}/`.
 * @param {"discovery"|"building"} level
 * @returns {{ videos: string; captions: string; plans: string; thumbnails: string }}
 */
function dirsForLevel(level) {
  return {
    videos: join(OUTPUT_BASE, "videos", level),
    captions: join(OUTPUT_BASE, "captions", level),
    plans: join(OUTPUT_BASE, "plans", level),
    thumbnails: join(OUTPUT_BASE, "thumbnails", level),
  };
}

// Load .env if present (we don't import dotenv to avoid the dep; do it manually).
async function loadDotEnv() {
  const envPath = join(import.meta.dirname, "../.env");
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Parse CLI args into a normalised options object. */
function parseArgs(argv) {
  const opts = {
    slug: null,
    level: "discovery",
    mode: "auto",
    variant: 0,
    variantsAll: false,
    planOnly: false,
    hookcut: false, // clean cut only by default; opt-in via --hookcut
    fromPlan: false, // if true, load the saved plan from disk and skip LLM
    thumbnail: true, // render cover PNG by default; opt-out via --no-thumbnail
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--level") { opts.level = argv[++i]; }
    else if (a.startsWith("--level=")) { opts.level = a.slice(8); }
    else if (a === "--mode") { opts.mode = argv[++i]; }
    else if (a.startsWith("--mode=")) { opts.mode = a.slice(7); }
    else if (a === "--variant") { opts.variant = Number(argv[++i]); }
    else if (a.startsWith("--variant=")) { opts.variant = Number(a.slice(10)); }
    else if (a === "--variants-all") { opts.variantsAll = true; }
    else if (a === "--plan-only") { opts.planOnly = true; }
    else if (a === "--hookcut") { opts.hookcut = true; }
    else if (a === "--no-hookcut") { opts.hookcut = false; } // legacy alias, default already off
    else if (a === "--no-thumbnail") { opts.thumbnail = false; }
    else if (a === "--from-plan") { opts.fromPlan = true; }
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else if (a.startsWith("--")) { console.error(`Unknown flag: ${a}`); process.exit(2); }
    else { rest.push(a); }
  }
  if (rest.length > 0) opts.slug = rest[0];
  if (!["discovery", "building", "all"].includes(opts.level)) {
    console.error(`--level must be one of: discovery, building, all (got "${opts.level}")`);
    process.exit(2);
  }
  if (!["faithful", "riff", "auto"].includes(opts.mode)) {
    console.error(`--mode must be one of: faithful, riff, auto (got "${opts.mode}")`);
    process.exit(2);
  }
  if (opts.variant < 0 || opts.variant > 2 || !Number.isInteger(opts.variant)) {
    console.error(`--variant must be 0, 1, or 2 (got ${opts.variant})`);
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log(`Reel render orchestrator

Usage:
  node scripts/render-reels.mjs [slug] [flags]

Flags:
  --level discovery|building|all   Source folder (default: discovery)
  --mode faithful|riff|auto        Script generation mode (default: auto = LLM picks)
  --variant 0|1|2                  Which hook variant to render (default: 0)
  --variants-all                   Render all 3 hook variants as separate mp4s
  --plan-only                      Stop after generating + scrubbing the plan
  --hookcut                        Also render a 15-20s hook-cut byproduct (default: off)
  --no-thumbnail                   Skip the 1080×1920 cover PNG (default: render)
  --from-plan                      Load the saved plan JSON from output/plans/<level>/<slug>.json and skip the LLM call. Useful for re-rendering after a layout/component change without paying for fresh generation.
  -h, --help                       Show this help
`);
}

/**
 * Pick beats for the 15s hook-cut byproduct: hook + ~2 highest-density beats + CTA.
 * "Density" heuristic: prefer "stat", "comparison", "warning" beats; cap total
 * at 8s of beat narration.
 *
 * @param {import('../remotion/src/data').ReelPlan} plan
 * @param {Array<{startMs:number,endMs:number}>} beatSpans
 * @returns {string[]}  selected beat IDs, in original order
 */
function pickHookcutBeats(plan, beatSpans) {
  const SCORE = { stat: 5, comparison: 4, warning: 4, definition: 3, example: 3, list: 2, story: 2, transition: 1 };
  const ranked = plan.beats.map((b, i) => ({
    id: b.id,
    idx: i,
    score: SCORE[b.kind] ?? 1,
    durMs: beatSpans[i].endMs - beatSpans[i].startMs,
  }));
  ranked.sort((a, b) => b.score - a.score || a.durMs - b.durMs);

  const picked = [];
  let totalMs = 0;
  const BUDGET_MS = 8000;
  for (const r of ranked) {
    if (totalMs + r.durMs > BUDGET_MS) continue;
    picked.push(r);
    totalMs += r.durMs;
    if (picked.length >= 2) break;
  }
  if (picked.length === 0) picked.push(ranked[0]);
  picked.sort((a, b) => a.idx - b.idx);
  return picked.map(p => p.id);
}

async function renderOne({ post, opts, variantIdx }) {
  const slug = post.meta.slug;
  const level = post.meta.level === "discovery" ? "discovery" : "building";
  const variantSuffix = variantIdx === 0 ? "" : `-v${variantIdx + 1}`;
  // Filename convention mirrors the blog source: NN-slug, where NN is the
  // zero-padded `order` from frontmatter (matches src/content/blog/.../NN-slug.md).
  // This keeps videos / plans / captions sorting in the same order as the
  // posts when listed in a directory.
  const order = Number.isFinite(post.meta.order) ? Number(post.meta.order) : null;
  const filePrefix = order !== null ? `${String(order).padStart(2, "0")}-` : "";
  const fileBase = `${filePrefix}${slug}${variantSuffix}`;
  const renderSlug = fileBase; // used by Remotion intermediates and TTS audio cache
  const dirs = dirsForLevel(level);

  console.log(`\n┌─ ${post.meta.title} ${variantSuffix ? `(variant ${variantIdx + 1})` : ""}`);
  console.log(`│  level: ${level}  |  slug: ${slug}  |  file: ${fileBase}`);

  // 0. Prep figures (extracts figcaption from body, copies pre-rendered PNG
  //    into remotion/public/figures/<slug>.png if available).
  const availableFigures = await prepareFigures({ slug, body: post.body });
  if (availableFigures.length > 0) {
    console.log(`│  [0/6] Found ${availableFigures.length} pre-rendered figure(s) for this post.`);
  } else if (/<figure\b/.test(post.body)) {
    console.log(`│  [0/6] Post has a <figure> in source but no rasterised PNG yet. Run \`npm run render-figures -- ${slug}\` first to enable figure beats.`);
  }

  // 1. Plan acquisition. Either:
  //    (a) load the saved plan from disk (--from-plan, e.g. for re-rendering
  //        after a layout / component change without paying for new tokens), or
  //    (b) call the LLM with up to 3 attempts, scrubber-driven self-correction.
  let rawPlan;
  if (opts.fromPlan) {
    const savedPath = join(dirs.plans, `${renderSlug}.json`);
    console.log(`│  [1/6] Loading saved plan from ${savedPath.replace(import.meta.dirname + "/..", ".")}...`);
    if (!existsSync(savedPath)) {
      throw new Error(`--from-plan requested but no saved plan at ${savedPath}. Run without --from-plan first to generate.`);
    }
    rawPlan = JSON.parse(await readFile(savedPath, "utf-8"));
    rawPlan.availableFigures = availableFigures;
  } else {
    console.log(`│  [1/6] Generating plan via Claude (mode=${opts.mode})...`);
    rawPlan = await generateReelPlan({
      meta: post.meta,
      body: post.body,
      mode: opts.mode,
      availableFigures,
      maxAttempts: 3,
      validate: (candidate, attempt) => {
        candidate.useHookVariant = variantIdx;
        const { violations } = scrubPlan(candidate);
        if (violations.length === 0) {
          if (attempt > 0) console.log(`│        attempt ${attempt + 1}: clean.`);
          return null;
        }
        if (attempt + 1 >= 3) return null; // last attempt, let caller throw
        console.warn(`│        attempt ${attempt + 1}: ${violations.length} violation(s); requesting fix...`);
        for (const v of violations) {
          console.warn(`│          · [${v.rule}] ${v.field}: "${v.quote}"`);
        }
        return formatRetryFeedback(violations);
      },
    });
  }
  rawPlan.useHookVariant = variantIdx;

  // 2. Final scrub (idempotent — also enforces the hard gate).
  console.log(`│  [2/6] Scrubbing brand-rule violations...`);
  const { plan, violations } = scrubPlan(rawPlan);
  if (violations.length > 0) {
    console.warn(`│        ${violations.length} violation(s) detected after ${3} attempts:`);
    for (const v of violations) {
      console.warn(`│        · [${v.rule}] ${v.field}: "${v.quote}"`);
    }
    assertNoViolations(violations);
  }

  // Persist the plan immediately (useful for debugging even if later steps fail).
  await mkdir(dirs.plans, { recursive: true });
  const planPath = join(dirs.plans, `${renderSlug}.json`);
  await writeFile(planPath, JSON.stringify(plan, null, 2), "utf-8");

  // Stamp orchestrator-controlled fields onto the in-memory plan for the
  // downstream render. These come from blog frontmatter, not the LLM, and we
  // intentionally write the persisted JSON BEFORE this stamp so the saved
  // plan stays a pure record of the LLM output (audit trail). The CTA scene
  // reads relatedTool / reelPromise to render a contextual READ row that
  // gives a concrete reason to click through (free tool or one-line teaser)
  // instead of a generic blog URL.
  if (post.meta.relatedTool) plan.relatedTool = post.meta.relatedTool;
  if (post.meta.reelPromise) plan.reelPromise = post.meta.reelPromise;

  if (opts.planOnly) {
    console.log(`│  --plan-only: stopping after plan write.`);
    console.log(`└─ ✓ Plan saved: ${planPath.replace(import.meta.dirname + "/..", ".")}\n`);
    return { plan, paths: { plan: planPath } };
  }

  // 3. TTS
  console.log(`│  [3/6] Generating TTS (edge-tts, voice=${process.env.NIDHI_REEL_VOICE || "en-GB-RyanNeural"})...`);
  const { hookText, beatTexts, ctaText, text } = stitchNarration(plan);
  const { audioRelative, wordTimings } = await generateTTS(text, renderSlug);

  // 4. Align spans
  console.log(`│  [4/6] Aligning beat spans against word timings (${wordTimings.length} words)...`);
  const segmentTexts = [hookText, ...beatTexts, ctaText];
  const segmentSpans = alignSegments(wordTimings, segmentTexts);
  const hookSpan = segmentSpans[0];
  const beatSpans = segmentSpans.slice(1, -1).map((span, i) => ({
    beatId: plan.beats[i].id,
    startMs: span.startMs,
    endMs: span.endMs,
  }));
  const ctaSpan = segmentSpans[segmentSpans.length - 1];

  // 5. Music pick + platform captions
  console.log(`│  [5/6] Picking music (mood=${plan.mood}) and writing captions...`);
  const { musicFile } = await pickMusic({ mood: plan.mood, slug: renderSlug });
  if (!musicFile) {
    console.log(`│        (no music track available; rendering with voiceover only)`);
  }
  await mkdir(dirs.captions, { recursive: true });
  const { igPath } = await writePlatformCaptions({
    plan,
    captionsDir: dirs.captions,
    fileBase,
    relatedTool: post.meta.relatedTool,
    reelPromise: post.meta.reelPromise,
  });
  console.log(`│        captions: ${igPath.replace(import.meta.dirname + "/..", ".")}`);

  // 6. Remotion render(s) + intermediate cleanup
  console.log(`│  [6/6] Rendering Remotion composition(s)...`);
  await mkdir(dirs.videos, { recursive: true });
  await mkdir(REMOTION_OUTPUTS, { recursive: true });

  const fullInput = {
    plan,
    hookSpan,
    beatSpans,
    ctaSpan,
    wordTimings,
    audioFile: audioRelative,
    musicFile,
    cut: "full",
  };
  const fullInputPath = join(REMOTION_OUTPUTS, `${renderSlug}-input.json`);
  await writeFile(fullInputPath, JSON.stringify(fullInput), "utf-8");

  const fullOutPath = join(dirs.videos, `${renderSlug}.mp4`);
  execSync(
    `cd "${REMOTION_DIR}" && npx tsx src/render-single.ts "${fullInputPath}" "${fullOutPath}"`,
    { stdio: "inherit" },
  );

  // Render the cover thumbnail (1080×1920 PNG) from the same plan. This is
  // a fast still render (~5-8s) using Remotion's `renderStill` against the
  // separate `Thumbnail` composition registered in `ReelComposition.tsx`'s
  // Root. The plan path on disk (the one we just wrote at step 2) is the
  // input — Thumbnail doesn't need audio / word timings / spans, only the
  // ReelPlan with its hook variant + topic chip + episode number. Skipped
  // when --no-thumbnail is passed (e.g. for ultra-fast iteration loops).
  let thumbnailOutPath = null;
  if (opts.thumbnail) {
    await mkdir(dirs.thumbnails, { recursive: true });
    thumbnailOutPath = join(dirs.thumbnails, `${renderSlug}.png`);
    execSync(
      `cd "${REMOTION_DIR}" && npx tsx src/render-thumbnail.ts "${planPath}" "${thumbnailOutPath}" ${variantIdx}`,
      { stdio: "inherit" },
    );
  }

  let hookcutOutPath = null;
  let hookcutInputPath = null;
  if (opts.hookcut) {
    const hookcutBeatIds = pickHookcutBeats(plan, beatSpans);
    const hookcutInput = { ...fullInput, cut: "hookcut", hookcutBeatIds };
    hookcutInputPath = join(REMOTION_OUTPUTS, `${renderSlug}-hookcut-input.json`);
    await writeFile(hookcutInputPath, JSON.stringify(hookcutInput), "utf-8");

    hookcutOutPath = join(dirs.videos, `${renderSlug}-hookcut.mp4`);
    execSync(
      `cd "${REMOTION_DIR}" && npx tsx src/render-single.ts "${hookcutInputPath}" "${hookcutOutPath}"`,
      { stdio: "inherit" },
    );
  }

  // Clean up intermediates: the per-render input JSONs and the TTS mp3+vtt.
  // Plans + captions stay (audit trail). Final mp4s stay.
  await safeUnlink(fullInputPath);
  if (hookcutInputPath) await safeUnlink(hookcutInputPath);
  await safeUnlink(join(REMOTION_PUBLIC_AUDIO, `${renderSlug}.mp3`));
  await safeUnlink(join(REMOTION_PUBLIC_AUDIO, `${renderSlug}.vtt`));

  console.log(`└─ ✓ ${fullOutPath.replace(import.meta.dirname + "/..", ".")}${thumbnailOutPath ? `\n   ✓ ${thumbnailOutPath.replace(import.meta.dirname + "/..", ".")}` : ""}${hookcutOutPath ? `\n   ✓ ${hookcutOutPath.replace(import.meta.dirname + "/..", ".")}` : ""}\n`);
  return {
    plan,
    paths: { full: fullOutPath, thumbnail: thumbnailOutPath, hookcut: hookcutOutPath, plan: planPath },
  };
}

/** Best-effort unlink that swallows ENOENT. */
async function safeUnlink(path) {
  try {
    await unlink(path);
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

async function main() {
  await loadDotEnv();

  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "✗ Anthropic credentials missing. Set one of:\n" +
      "    ANTHROPIC_API_KEY=sk-ant-...                              (public api.anthropic.com)\n" +
      "    ANTHROPIC_AUTH_TOKEN=<token>  +  ANTHROPIC_BASE_URL=<url> (corporate gateway)\n"
    );
    process.exit(1);
  }

  const allPosts = await loadPosts(opts.level);
  const posts = opts.slug
    ? allPosts.filter(p => p.meta.slug === opts.slug)
    : allPosts;

  if (posts.length === 0) {
    console.error(
      `No posts found${opts.slug ? ` matching slug "${opts.slug}"` : ""} at level "${opts.level}".`
    );
    process.exit(1);
  }

  const variants = opts.variantsAll ? [0, 1, 2] : [opts.variant];

  console.log(
    `Rendering ${posts.length} reel${posts.length > 1 ? "s" : ""} ` +
    `× ${variants.length} variant${variants.length > 1 ? "s" : ""} ` +
    `(level=${opts.level}, mode=${opts.mode}${opts.planOnly ? ", plan-only" : ""}${!opts.hookcut ? ", no-hookcut" : ""})`
  );

  let done = 0, failed = 0;
  for (const post of posts) {
    for (const v of variants) {
      try {
        await renderOne({ post, opts, variantIdx: v });
        done++;
      } catch (err) {
        console.error(`└─ ✗ FAILED: ${err.message}\n`);
        failed++;
      }
    }
  }

  console.log(`\nDone. ${done} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
