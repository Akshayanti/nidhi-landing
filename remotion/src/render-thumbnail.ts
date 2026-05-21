/**
 * Render a single reel cover thumbnail using Remotion's `renderStill`.
 *
 * Usage: npx tsx src/render-thumbnail.ts <planJsonPath> <outputPngPath>
 *
 * The plan JSON is the saved `ReelPlan` (output/plans/<level>/<slug>.json),
 * NOT the augmented `ReelInput` used by render-single. Thumbnails don't need
 * audio / word timings / segment spans.
 *
 * Optional 3rd arg: hookVariantIdx (0..2). Defaults to plan.useHookVariant or 0.
 */

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";

async function render() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx tsx src/render-thumbnail.ts <planJsonPath> <outputPngPath> [hookVariantIdx]");
    process.exit(1);
  }

  const [planPath, outputPath, variantArg] = args;
  const plan = JSON.parse(readFileSync(planPath, "utf-8"));
  const hookVariantIdx =
    variantArg !== undefined && variantArg !== ""
      ? Number(variantArg)
      : (typeof plan.useHookVariant === "number" ? plan.useHookVariant : 0);

  const entryPoint = path.resolve(import.meta.dirname, "index.ts");

  console.log("  Bundling...");
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log("  Selecting Thumbnail composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "Thumbnail",
    inputProps: { plan, hookVariantIdx },
  });

  console.log(`  Rendering still (1080×1920, hookVariant=${hookVariantIdx})...`);
  await renderStill({
    composition,
    serveUrl: bundled,
    output: outputPath,
    inputProps: { plan, hookVariantIdx },
    imageFormat: "png",
  });

  console.log(`  Done: ${outputPath}`);
}

render().catch((err) => {
  console.error("Thumbnail render failed:", err);
  process.exit(1);
});
