import type { CSSProperties } from "react";
import { BrandBackground } from "./components/BrandBackground";
import { SeriesChip } from "./components/SeriesChip";
import { BRAND, TYPE, type ReelPlan } from "./data";

interface Props {
  plan: ReelPlan;
  /** Optional override; defaults to plan.useHookVariant. */
  hookVariantIdx?: number;
}

/**
 * Reel cover thumbnail.
 *
 * 1080×1920 still PNG used as the IG / TikTok reel cover (and as a grid card
 * in the blog index). Rendered via Remotion's `renderStill` from a single
 * frame of this composition.
 *
 * Design intent:
 *   - Brand-correct dark navy canvas (matches the hook + CTA tonal beats).
 *   - SeriesChip top-left so the cover carries the series + episode + topic
 *     anchor at a glance, even at IG-grid thumbnail size (~ 320px wide).
 *   - The hook's onscreenLines as oversized headline (auto-shrunk to fit).
 *     The lines are already crafted to read in 1-3 seconds, which is exactly
 *     the budget for a grid scroller.
 *   - Optional stat kicker above the headline when the chosen hook variant
 *     has a `stat` anchor — surfaces the headline number small (not huge)
 *     so the headline still leads.
 *   - "WATCH THE REEL ▶" pill + handle bottom — affordance signal that this
 *     is a reel, not a static post.
 *
 * No animation, no audio, no captions. The composition has duration 1 frame
 * and `renderStill` extracts frame 0.
 */
export function Thumbnail({ plan, hookVariantIdx }: Props) {
  const idx = typeof hookVariantIdx === "number"
    ? hookVariantIdx
    : plan.useHookVariant ?? 0;
  const hook = plan.hookVariants[idx] ?? plan.hookVariants[0];

  // Stat kicker only when the hook has a stat anchor. Other anchor types
  // (compare / list / figure) don't translate to a small kicker; for those
  // the headline carries the cover alone.
  const stat = hook?.anchor?.type === "stat" ? hook.anchor : null;

  // Auto-fit by longest line. The editorial intent is one source line per
  // visual row (no wrapping inside a line), so the font size is constrained
  // by the longest line's character count against the safe column width
  // (1080 - 2×80 = 920px). Empirically Fraunces Black at large sizes runs
  // around 0.56em average glyph advance for mixed-case English (measured
  // from rendered D02/D08 samples; wider letters like 'm', 'n', 'b', 'e'
  // pull the average up over what mono estimates predict), so the budget is:
  //   maxFontPx ≈ columnWidth / (longestLineLen × 0.56)
  // Capped to 140 (top of Series 2 cover scale; higher caps push wide-letter
  // short lines past the safe edge — "One number" at 160px renders ~920px
  // because Fraunces Black widens at large sizes) and floor 58 (still
  // readable at IG-grid thumbnail size). Long-line hooks like "What stocks
  // bonds crypto really do" can hit the floor; we accept a smaller cover
  // headline over wrapping the source line and breaking editorial rhythm.
  const longestLine = hook.onscreenLines.reduce(
    (n, l) => Math.max(n, l.length), 0,
  );
  const COLUMN = 920;
  const GLYPH_ADV = 0.58;
  const fitSize = Math.floor(COLUMN / Math.max(longestLine, 1) / GLYPH_ADV);
  const headlineSize = Math.min(140, Math.max(58, fitSize));
  // Total visual height of the headline block: lines × line-height multiplier.
  // Used below to decide line-height (tighter when many large lines).
  const lineCount = hook.onscreenLines.length;
  const lineHeight = (lineCount >= 4 || headlineSize >= 150) ? 0.96 : 1.04;

  return (
    <BrandBackground variant="dark">
      <SeriesChip
        level={plan.postLevel}
        episode={plan.episode}
        total={plan.seriesTotal}
        topicChip={plan.topicChip}
        dark
      />

      {/* Center column: optional stat kicker + headline */}
      <div style={centerColumn}>
        {stat && (
          <div style={statKicker}>
            <span style={statValue}>{stat.value}</span>
            {stat.label && <span style={statLabel}>{stat.label}</span>}
          </div>
        )}

        <div
          style={{
            ...headline,
            fontSize: headlineSize,
            lineHeight,
          }}
        >
          {hook.onscreenLines.map((line, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>
          ))}
        </div>
      </div>

      {/* Bottom strip: teal hairline + watch affordance + handle */}
      <div style={bottomStrip}>
        <div style={tealRule} />
        <div style={watchRow}>
          <span style={watchPill}>WATCH THE REEL</span>
          <span style={playGlyph}>▶</span>
        </div>
        <div style={handleRow}>
          <span style={handle}>@nidhi.today</span>
        </div>
      </div>
    </BrandBackground>
  );
}

// ---------- Styles ----------

const centerColumn: CSSProperties = {
  position: "absolute",
  // Sits below the SeriesChip (top ~280px) and above the bottom strip
  // (bottom ~360px). Center of mass biased slightly above midline so the
  // headline isn't clipped by IG's profile-pill overlay at the very bottom.
  top: 360,
  bottom: 380,
  left: 80,
  right: 80,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "flex-start",
  gap: 36,
};

const statKicker: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 18,
  paddingLeft: 14,
  borderLeft: `4px solid #9FE9DD`,
};

const statValue: CSSProperties = {
  fontFamily: TYPE.display,
  fontSize: 72,
  fontWeight: 900,
  color: "#9FE9DD",
  letterSpacing: "-0.02em",
  lineHeight: 1,
};

const statLabel: CSSProperties = {
  fontFamily: TYPE.ui,
  fontSize: 28,
  fontWeight: 600,
  color: "rgba(250, 247, 242, 0.72)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  maxWidth: 700,
};

const headline: CSSProperties = {
  fontFamily: TYPE.display,
  fontWeight: 900,
  color: BRAND.paper,
  letterSpacing: "-0.025em",
  textAlign: "left",
  maxWidth: 920,
  // Slight optical paragraph hang for editorial feel.
  textWrap: "balance" as CSSProperties["textWrap"],
};

const bottomStrip: CSSProperties = {
  position: "absolute",
  left: 80,
  right: 80,
  bottom: 140,
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const tealRule: CSSProperties = {
  height: 3,
  width: 120,
  background: "#9FE9DD",
};

const watchRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
};

const watchPill: CSSProperties = {
  fontFamily: TYPE.ui,
  fontSize: 32,
  fontWeight: 800,
  color: "#9FE9DD",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

const playGlyph: CSSProperties = {
  fontSize: 36,
  color: "#9FE9DD",
  marginLeft: 6,
  // Optical alignment with the cap-height of the pill text.
  transform: "translateY(-2px)",
};

const handleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const handle: CSSProperties = {
  fontFamily: TYPE.ui,
  fontSize: 36,
  fontWeight: 600,
  color: "rgba(250, 247, 242, 0.78)",
  letterSpacing: "0.06em",
};

// ---------- Default props for Composition registration ----------
//
// The Composition node itself lives in `ReelComposition.tsx`'s Root (so all
// compositions register from one tree). This factory provides the studio
// preview defaults; production renders pass real plan JSON via inputProps.

export function makeDefaultThumbnailPlan(): ReelPlan {
  return {
    slug: "preview",
    postTitle: "Preview thumbnail",
    postLevel: "discovery",
    episode: 8,
    seriesTotal: 16,
    mode: "faithful",
    topic: "Emergency funds",
    topicChip: "EMERGENCY FUNDS",
    blogPath: "blog/emergency-fund",
    mood: "calm-authority",
    hookVariants: [
      {
        id: "h-stat",
        layout: "big-number",
        narration: "One in four expats can't cover a single 400 euro emergency.",
        onscreenLines: ["Most people", "are one bill", "away from debt."],
        anchor: { type: "stat", value: "1 in 4", label: "couldn't cover EUR 400" },
        emphasis: ["one bill", "debt"],
      },
    ],
    useHookVariant: 0,
    beats: [],
    cta: {
      approved: "save",
      narration: "Save this.",
      onscreenText: "Save this",
      handle: "@nidhi.today",
    },
    caption: { instagram: "", tiktok: "" },
    hashtags: ["nidhi", "nidhibasics"],
    availableFigures: [],
  };
}
