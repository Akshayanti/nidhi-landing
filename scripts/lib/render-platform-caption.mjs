/**
 * Emit ready-to-paste platform captions.
 *
 * Combines the LLM-generated `caption.instagram` / `caption.tiktok` body with:
 *   1. The mandatory AI disclosure line (brand voice = honest; below platform
 *      auto-detection threshold for typography+TTS reels in May 2026).
 *   2. Brand-compliant hashtags (5 max, leading # added).
 *
 * AI labeling policy (verified May 2026):
 *   - We DO disclose in caption (one line, editorial).
 *   - We DO NOT toggle the platform "AI info" / "AIGC" toggle for
 *     typography+TTS reels — the platforms' detection thresholds key on
 *     imagery, not synthesised audio over deterministic motion graphics, and
 *     creator A/B tests show ~10-30% IG distribution penalty on labeled
 *     content.
 *   - When v3 adds AI-generated imagery / B-roll / faces, the platform
 *     toggle becomes MANDATORY. Update DISCLOSURE_LINE accordingly.
 *
 * Output paths:
 *   output/captions/<slug>.ig.txt
 *   output/captions/<slug>.tiktok.txt
 *   output/captions/<slug>.json   (machine-readable)
 *
 * The operator copy-pastes one of the .txt files into the IG/TikTok composer.
 *
 * Brand rules enforced again at this layer (defense in depth):
 *   - Cap at 5 hashtags.
 *   - First line of IG caption is the hook (LLM should already do this).
 *   - Hashtags are appended on a new line after a blank line (IG spec).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_CAPTIONS_DIR = join(import.meta.dirname, "../../output/captions");
const SITE_BASE = "nidhi.today";

/**
 * Standard AI disclosure footer. Editorial, not apologetic. Stays the same
 * across every reel so it reads as a brand artefact rather than a hedge.
 */
const DISCLOSURE_LINE = "Voice: AI-narrated. Script: AI-drafted, human-edited. Research and editorial direction: human.";

/**
 * Compose the "go deeper" block that sits between the LLM caption and the
 * disclosure. Order:
 *   1. Tool plug (if relatedTool present)
 *   2. Blog promise (if reelPromise present, OR fallback "Read more" link)
 *
 * The tool URL is fully qualified so it pastes cleanly into IG / TikTok
 * (which strip relative paths). The blog URL is always emitted: every reel
 * SHOULD give the viewer a reason to click through, and at minimum the
 * destination is the source post.
 *
 * @param {object} args
 * @param {string} args.slug - the blog post slug (no leading slash)
 * @param {{url:string,label:string,cta:string}} [args.relatedTool]
 * @param {string} [args.reelPromise]
 * @returns {string} block to insert (possibly empty if no signals)
 */
function buildDeepDiveBlock({ slug, relatedTool, reelPromise }) {
  const lines = [];
  if (relatedTool?.url && relatedTool.cta) {
    const path = relatedTool.url.startsWith("/") ? relatedTool.url : `/${relatedTool.url}`;
    lines.push(`Free tool · ${relatedTool.cta}: ${SITE_BASE}${path}`);
  }
  // Always link the blog post — it's the canonical home for the reel content
  // and the only way to give a viewer a clear "what's deeper" pathway.
  if (reelPromise) {
    lines.push(`Read the full post · ${reelPromise}: ${SITE_BASE}/blog/${slug}/`);
  } else {
    lines.push(`Read the full post: ${SITE_BASE}/blog/${slug}/`);
  }
  return lines.join("\n");
}

/**
 * Resolve the active hook variant's narration for the caption opener. Returns
 * the trimmed narration of `plan.hookVariants[plan.useHookVariant]`, or null
 * when the plan lacks variants / index (callers then keep the body as-is).
 *
 * @param {import('../../remotion/src/data').ReelPlan} plan
 * @returns {string | null}
 */
function leadHookText(plan) {
  const variants = plan?.hookVariants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const idx = Number.isInteger(plan.useHookVariant) ? plan.useHookVariant : 0;
  const v = variants[idx] ?? variants[0];
  const text = v?.narration?.trim();
  return text || null;
}

/**
 * Replace the first line of a caption body with `hookText`, preserving the rest
 * of the body verbatim. The "first line" is everything up to the first newline;
 * caption bodies are authored as line-per-thought (hook, promise, deep-dive,
 * series line), so swapping line 1 swaps exactly the on-feed hook. No-ops when
 * `hookText` is falsy or already equal to the existing first line.
 *
 * @param {string} body
 * @param {string | null} hookText
 * @returns {string}
 */
function replaceFirstLine(body, hookText) {
  if (!body) return body;
  if (!hookText) return body;
  const nl = body.indexOf("\n");
  const firstLine = nl === -1 ? body : body.slice(0, nl);
  if (firstLine.trim() === hookText.trim()) return body;
  const rest = nl === -1 ? "" : body.slice(nl);
  return hookText + rest;
}

/**
 * @param {object} args
 * @param {import('../../remotion/src/data').ReelPlan} args.plan
 * @param {string} [args.captionsDir] - override the output directory (the orchestrator
 *   passes a per-level path like output/captions/discovery/).
 * @param {string} [args.fileBase] - override the filename stem (without
 *   extension). Defaults to plan.slug; the orchestrator passes
 *   `NN-slug` (zero-padded episode number + slug) so captions sort
 *   alongside videos and plans.
 * @param {{url:string,label:string,cta:string}} [args.relatedTool] - optional
 *   paired free tool from blog frontmatter. Auto-rendered as a "Free tool · …"
 *   line above the disclosure, fully qualified (nidhi.today/free/…).
 * @param {string} [args.reelPromise] - one-line concrete promise of what
 *   the blog adds beyond the reel (worked example, country-specific table,
 *   etc.). Rendered as the "Read the full post · {promise}: …" line.
 *   MUST be backed by content actually present in the post body.
 */
export async function writePlatformCaptions({
  plan,
  captionsDir,
  fileBase,
  relatedTool,
  reelPromise,
}) {
  const CAPTIONS_DIR = captionsDir ?? DEFAULT_CAPTIONS_DIR;
  await mkdir(CAPTIONS_DIR, { recursive: true });

  const stem = fileBase ?? plan.slug;
  const igTagList = (plan.hashtags ?? []).slice(0, 5).map(t => `#${t.replace(/^#/, "")}`);
  const igTags = igTagList.join(" ");

  // TikTok hashtag line = the 5 IG hashtags + 0-3 TikTok-native niche tags.
  // PLAYBOOK §6 documents the 5-vs-7 cap split: IG's algo flags >5 as
  // low-quality, TikTok's tolerates 5-7. Dedupe defensively in case the
  // operator added an extra tag that already exists in the main hashtag
  // list (the scrubber rejects this earlier, but defense in depth).
  const ttExtras = (plan.caption?.tiktokExtraTags ?? [])
    .map(t => `#${t.replace(/^#/, "")}`)
    .filter(t => !igTagList.includes(t));
  const ttTags = [...igTagList, ...ttExtras].join(" ");

  // Instagram keyword block (May 2026 surface, separate from hashtags). Feeds
  // the topic classifier + multilingual search index. PLAYBOOK §6 documents
  // the convention: bracketed array, lowercase comma-separated, no #
  // symbols, lines wrapped at ~60 chars for readability in the IG composer.
  const igKeywordsBlock = formatKeywordBracket(plan.caption?.instagramKeywords);

  // TikTok 'Topics:' line — natural-language search-query phrases. Stays
  // English (TikTok auto-translates). 3-5 phrases joined with commas.
  const ttTopicsLine = (plan.caption?.tiktokTopics?.length ?? 0) > 0
    ? `Topics: ${plan.caption.tiktokTopics.join(", ")}`
    : "";

  const deepDive = buildDeepDiveBlock({ slug: plan.slug, relatedTool, reelPromise });

  // Hook A/B: the spoken hook is selected per variant via plan.useHookVariant,
  // but the LLM-authored caption body has a single fixed opening line. For the
  // on-feed caption hook to match the video the viewer just heard, lead the
  // caption body with the ACTIVE hook variant's narration. We replace only the
  // first line of the body (the hook) and keep the rest (the value promise,
  // "stay till the end", etc.) intact, so each variant's paste-ready caption is
  // a true A/B of the opening hook.
  const activeHookText = leadHookText(plan);

  // Caption layout (top-to-bottom):
  //   [LLM body]
  //
  //   [tool plug + read-more line(s)]   ← deterministic; brand-controlled
  //
  //   [AI disclosure]
  //
  //   [hashtag line]
  //
  //   [IG keyword bracket]   ← IG only; TikTok gets Topics: instead
  // Two newlines between blocks keeps things scannable on both IG (which
  // collapses single-newlines into space) and TikTok (which preserves them).
  const igBody = replaceFirstLine(plan.caption.instagram?.trim() ?? "", activeHookText);
  const ig = [igBody, deepDive, DISCLOSURE_LINE, igTags, igKeywordsBlock]
    .filter(Boolean).join("\n\n") + "\n";

  // TikTok layout: same body + deep-dive + disclosure, then Topics line,
  // then the hashtag wave (IG five + TikTok extras).
  const ttBody = replaceFirstLine(plan.caption.tiktok?.trim() ?? "", activeHookText);
  const tt = [ttBody, deepDive, DISCLOSURE_LINE, ttTopicsLine, ttTags]
    .filter(Boolean).join("\n\n") + "\n";

  const igPath = join(CAPTIONS_DIR, `${stem}.ig.txt`);
  const ttPath = join(CAPTIONS_DIR, `${stem}.tiktok.txt`);
  const jsonPath = join(CAPTIONS_DIR, `${stem}.json`);

  await writeFile(igPath, ig, "utf-8");
  await writeFile(ttPath, tt, "utf-8");
  await writeFile(jsonPath, JSON.stringify({
    slug: plan.slug,
    instagram: ig,
    tiktok: tt,
    hashtags: plan.hashtags,
    topic: plan.topic,
    mood: plan.mood,
    mode: plan.mode,
    relatedTool: relatedTool ?? null,
    reelPromise: reelPromise ?? null,
    aiDisclosure: DISCLOSURE_LINE,
    aiPlatformToggle: {
      instagram: false, // do NOT toggle "AI info" for typography+TTS reels
      tiktok: false,    // do NOT toggle "AIGC" for typography+TTS reels
      // Flip both to true when v3 adds AI-generated imagery / B-roll.
    },
    instagramKeywords: plan.caption?.instagramKeywords ?? null,
    tiktokTopics: plan.caption?.tiktokTopics ?? null,
    tiktokExtraTags: plan.caption?.tiktokExtraTags ?? null,
  }, null, 2), "utf-8");

  return { igPath, ttPath, jsonPath };
}

/**
 * Format an array of multilingual search keywords as the bracketed block
 * IG carousels and (now) Reels emit after the hashtag line. Wraps at ~60
 * characters per line to render cleanly in the IG composer; the wrap
 * doesn't matter for the topic classifier (it tokenises on commas) but it
 * matters for the human pasting it.
 *
 * Output shape:
 *   [ keyword one, keyword two, keyword three,
 *   keyword four, keyword five, keyword six ]
 *
 * @param {string[] | undefined} keywords
 * @returns {string} the bracketed block, or empty string if no keywords.
 */
function formatKeywordBracket(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return "";
  const cleaned = keywords.map(k => k.replace(/^#/, "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";

  const lines = [];
  let line = "";
  for (let i = 0; i < cleaned.length; i++) {
    const next = cleaned[i] + (i < cleaned.length - 1 ? "," : "");
    if (line.length === 0) {
      line = next;
    } else if (line.length + 1 + next.length > 60) {
      lines.push(line);
      line = next;
    } else {
      line = line + " " + next;
    }
  }
  if (line) lines.push(line);
  return `[ ${lines.join("\n")} ]`;
}
