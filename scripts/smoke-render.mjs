/**
 * End-to-end smoke test for the reel pipeline minus the LLM call.
 *
 * Uses a hand-crafted ReelPlan that mimics what Claude would emit for the
 * "08-emergency-fund" Discovery post. Runs scrubber → TTS → span alignment →
 * music pick → Remotion render. Confirms every stage of the pipeline works
 * without burning Anthropic credits.
 *
 * Usage:
 *   node scripts/smoke-render.mjs            # render full + hookcut
 *   node scripts/smoke-render.mjs --no-render  # everything except the mp4
 */

import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { scrubPlan, assertNoViolations } from "./lib/scrub-output.mjs";
import { generateTTS, stitchNarration, alignSegments } from "./lib/generate-tts.mjs";
import { pickMusic } from "./lib/pick-music.mjs";
import { writePlatformCaptions } from "./lib/render-platform-caption.mjs";

const noRender = process.argv.includes("--no-render");

const SLUG = "smoke-emergency-fund";
const REMOTION_DIR = join(import.meta.dirname, "../remotion");
const OUT_VIDEO_DIR = join(import.meta.dirname, "../output/videos");
const REMOTION_OUTPUTS = join(REMOTION_DIR, "outputs");

/** A hand-crafted plan that exercises every layout primitive. */
const fixturePlan = {
  slug: SLUG,
  postTitle: "The Emergency Fund: Your First Financial Safety Net",
  postLevel: "discovery",
  episode: 8,
  seriesTotal: 16,
  mode: "faithful",
  topic: "Emergency funds: the foundation of every financial plan",
  topicChip: "EMERGENCY FUNDS",
  blogPath: "blog/emergency-fund",
  mood: "calm-authority",
  hookVariants: [
    {
      id: "stat-hook",
      layout: "big-number",
      narration: "Most people get emergency funds wrong. Here's the math.",
      onscreenLines: ["Most people get", "emergency funds", "wrong."],
      // Stat anchor must SUPPORT the "wrong" claim, not contradict / distract.
      anchor: { type: "stat", value: "1 in 4", label: "couldn't cover a EUR 400 bill" },
      emphasis: ["wrong", "math"],
    },
    {
      id: "q-hook",
      layout: "question",
      narration: "How long could you cover essentials without income?",
      onscreenLines: ["How long?", "Three months?", "Or one"],
    },
    {
      id: "c-hook",
      layout: "contradiction",
      narration: "Saving feels safe. Without an emergency fund, it isn't.",
      onscreenLines: ["Saving feels safe.", "Without a fund, it isn't."],
    },
  ],
  useHookVariant: 0,
  beats: [
    {
      id: "b1",
      kind: "definition",
      narration: "An emergency fund is cash for the unexpected and necessary, not for sales or holidays.",
      onscreenText: "What it is",
      subtext: "Cash for the unexpected and necessary.",
      emphasis: ["unexpected", "necessary"],
    },
    {
      id: "b2",
      kind: "stat",
      narration: "Start with one month of essential expenses, not one month of salary.",
      onscreenText: "Start small",
      anchor: { type: "stat", value: "1 month", label: "of essentials, not salary" },
      emphasis: ["essential"],
    },
    {
      id: "b3",
      kind: "list",
      narration: "Rent, food, insurance, minimum debt payments, utilities. That's it.",
      onscreenText: "Essentials are",
      anchor: {
        type: "list",
        items: ["Rent", "Food and basics", "Insurance", "Minimum debt payments", "Utilities"],
      },
    },
    {
      id: "b4",
      kind: "stat",
      narration: "Then build toward three months. Six if your income is variable.",
      onscreenText: "The full target",
      anchor: { type: "stat", value: "3 to 6", label: "months of essentials" },
    },
    {
      id: "b5",
      kind: "comparison",
      narration: "Without it, every shock becomes a crisis. With it, just an inconvenience.",
      onscreenText: "Why it matters",
      anchor: {
        type: "compare",
        left: { label: "Without", value: "Crisis" },
        right: { label: "With", value: "Inconvenience" },
      },
      emphasis: ["crisis", "inconvenience"],
    },
    {
      id: "b6",
      kind: "warning",
      narration: "Don't keep it in your daily account. It will get spent.",
      onscreenText: "Move it out of sight",
      subtext: "Separate account. Accessible. Not visible from your daily app.",
    },
    {
      id: "b7",
      kind: "transition",
      narration: "An emergency fund is the foundation of every other plan.",
      onscreenText: "It's the foundation.",
    },
  ],
  cta: {
    approved: "save",
    narration: "Save this so the day you need it, you'll know exactly what to do. And follow for the rest of the Basics series.",
    onscreenText: "Save this",
    subtext: "for the day you'll need it.",
    handle: "@nidhi.today",
    followAsk: "For the rest of the Basics series.",
  },
  caption: {
    instagram:
      "Most people get emergency funds wrong. Here's the math.\n\n" +
      "Part of the Basics series, sixteen short reels covering personal finance from scratch.\n\n" +
      "Full breakdown on the blog (link in bio).\nCarousel companion on the grid.",
    tiktok: "Most people get emergency funds wrong. Save this so you have a plan before you need one.",
  },
  hashtags: ["nidhi", "nidhibasics", "expatfinance", "emergencyfundeurope", "moneymindset"],
  availableFigures: [],
};

async function main() {
  console.log("┌─ Smoke render: emergency-fund (Discovery #8/16)");

  // 1. Scrub
  console.log("│  [1/5] Scrubbing...");
  const { plan, violations } = scrubPlan(fixturePlan);
  if (violations.length > 0) {
    console.warn(`│        ${violations.length} violation(s):`);
    for (const v of violations) console.warn(`│        · [${v.rule}] ${v.field}: "${v.quote}"`);
  }
  assertNoViolations(violations);
  console.log("│        clean.");

  if (noRender) {
    const smokeDir = join(import.meta.dirname, "../output/plans/_smoke");
    await mkdir(smokeDir, { recursive: true });
    await writeFile(join(smokeDir, `${SLUG}.json`), JSON.stringify(plan, null, 2), "utf-8");
    console.log("└─ ✓ Plan-only smoke complete (skipping TTS + render).");
    return;
  }

  // 2. TTS
  console.log("│  [2/5] Generating TTS (en-GB-RyanNeural)...");
  const { hookText, beatTexts, ctaText, text } = stitchNarration(plan);
  const { audioRelative, wordTimings } = await generateTTS(text, SLUG);
  console.log(`│        ${wordTimings.length} word timings, ${(wordTimings[wordTimings.length-1].endMs/1000).toFixed(1)}s audio.`);

  // 3. Align spans
  console.log("│  [3/5] Aligning beat spans...");
  const segments = [hookText, ...beatTexts, ctaText];
  const spans = alignSegments(wordTimings, segments);
  const hookSpan = spans[0];
  const beatSpans = spans.slice(1, -1).map((s, i) => ({
    beatId: plan.beats[i].id,
    startMs: s.startMs,
    endMs: s.endMs,
  }));
  const ctaSpan = spans[spans.length - 1];

  // 4. Music + captions
  console.log("│  [4/5] Picking music + writing captions...");
  const { musicFile } = await pickMusic({ mood: plan.mood, slug: SLUG });
  console.log(`│        music: ${musicFile || "(none — voice-only)"}`);
  await writePlatformCaptions({ plan });

  // 5. Render full + hookcut
  console.log("│  [5/5] Rendering Remotion compositions...");
  await mkdir(OUT_VIDEO_DIR, { recursive: true });
  await mkdir(REMOTION_OUTPUTS, { recursive: true });

  const fullInput = {
    plan, hookSpan, beatSpans, ctaSpan, wordTimings,
    audioFile: audioRelative, musicFile, cut: "full",
  };
  const fullInputPath = join(REMOTION_OUTPUTS, `${SLUG}-input.json`);
  await writeFile(fullInputPath, JSON.stringify(fullInput), "utf-8");

  const fullOut = join(OUT_VIDEO_DIR, `${SLUG}.mp4`);
  execSync(
    `cd "${REMOTION_DIR}" && npx tsx src/render-single.ts "${fullInputPath}" "${fullOut}"`,
    { stdio: "inherit" },
  );

  // hookcut: pick the 2 highest-impact beats
  const hookcutBeatIds = ["b2", "b6"]; // stat + warning, density-rich
  const hookcutInput = { ...fullInput, cut: "hookcut", hookcutBeatIds };
  const hookcutInputPath = join(REMOTION_OUTPUTS, `${SLUG}-hookcut-input.json`);
  await writeFile(hookcutInputPath, JSON.stringify(hookcutInput), "utf-8");

  const hookcutOut = join(OUT_VIDEO_DIR, `${SLUG}-hookcut.mp4`);
  execSync(
    `cd "${REMOTION_DIR}" && npx tsx src/render-single.ts "${hookcutInputPath}" "${hookcutOut}"`,
    { stdio: "inherit" },
  );

  console.log(`└─ ✓ ${fullOut}\n   ✓ ${hookcutOut}\n`);
}

main().catch(err => {
  console.error("Smoke failed:", err);
  process.exit(1);
});
