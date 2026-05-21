/**
 * Render a single reel using Remotion.
 *
 * Usage: npx tsx src/render-single.ts <inputJsonPath> <outputPath>
 *
 * The input JSON conforms to ReelInput in `data.ts` (full plan + segment spans
 * + word timings + audio path + cut mode). The orchestrator at
 * `scripts/render-reels.mjs` produces this file.
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";

async function render() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx tsx src/render-single.ts <inputJsonPath> <outputPath>");
    process.exit(1);
  }

  const [inputPath, outputPath] = args;
  const input = JSON.parse(readFileSync(inputPath, "utf-8"));

  const entryPoint = path.resolve(import.meta.dirname, "index.ts");

  console.log("  Bundling...");
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log("  Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "ReelComposition",
    inputProps: { input },
  });

  const fps = composition.fps;

  // Compute total frames from segment spans.
  const lastSpanMs = computeLastFrame(input);
  const totalFrames = Math.ceil((lastSpanMs / 1000) * fps) + Math.round(fps * 1.5); // 1.5s tail
  // Safety floor: never render under 6s.
  const finalFrames = Math.max(totalFrames, fps * 6);

  console.log(`  Rendering ${finalFrames} frames (${(finalFrames / fps).toFixed(1)}s)... [cut=${input.cut}]`);

  await renderMedia({
    composition: { ...composition, durationInFrames: finalFrames },
    serveUrl: bundled,
    codec: "h264",
    audioBitrate: input.musicFile ? "192k" : "128k",
    crf: input.musicFile ? 22 : 24,
    outputLocation: outputPath,
    inputProps: { input },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`  ${pct}%\r`);
    },
  });

  console.log(`  Done: ${outputPath}`);
}

/**
 * Compute the last meaningful millisecond in the timeline.
 * For full-cut: max of all segment end times.
 * For hookcut: sum of segment durations + a small CTA tail.
 */
function computeLastFrame(input: any): number {
  if (input.cut === "hookcut" && Array.isArray(input.hookcutBeatIds)) {
    const POST_PAD = 180;
    const GAP = 80;
    const CTA_TAIL = 1200;

    let total = (input.hookSpan.endMs - input.hookSpan.startMs) + POST_PAD + GAP;
    for (const span of input.beatSpans) {
      if (!input.hookcutBeatIds.includes(span.beatId)) continue;
      total += (span.endMs - span.startMs) + POST_PAD + GAP;
    }
    total += (input.ctaSpan.endMs - input.ctaSpan.startMs) + CTA_TAIL;
    return total;
  }

  // Full cut: ends at CTA end + tail
  return input.ctaSpan.endMs + 1500;
}

render().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
