/**
 * Shared schema for the reel pipeline.
 *
 * The LLM emits a `ReelPlan`. The orchestrator augments it with timing data
 * (audio file path, word timings, beat spans). Remotion renders from the
 * augmented `ReelInput`.
 *
 * IMPORTANT: do not introduce em/en dashes (—, –) or `--` anywhere in
 * user-facing strings. Brand rule (PLAYBOOK.md). The scrub layer enforces this
 * post-LLM, but components should also avoid emitting them in fallback copy.
 */

// ---------- LLM-authored layer ----------

export type ReelMode = "faithful" | "riff";

export type Mood =
  | "calm-authority"
  | "curious"
  | "reflective"
  | "urgency"
  | "bold"
  | "warm";

/** Hook layout primitives. Picked by the LLM to match the hook concept. */
export type HookLayout =
  | "big-number"   // huge stat dominates the frame
  | "question"     // bold question, two-line setup
  | "contradiction" // "X is wrong. Here's why." pattern
  | "scenario"     // "POV: ..." or short narrative setup
  | "quote";       // short editorial quote, weighty serif

/** Beat layout primitives. Drives BeatScene rendering. */
export type BeatKind =
  | "definition"   // term + supporting line
  | "stat"         // single big number with label
  | "comparison"   // before/after or A/B
  | "example"      // concrete scenario
  | "story"        // micro-narrative paragraph
  | "warning"      // contrasting / cautionary frame
  | "list"         // 2-4 short items revealed in sequence
  | "transition";  // pacing breath, single line

/** Anchor data per beat (optional). Drives the visual primitive on top of typography. */
export type BeatAnchor =
  | null
  | { type: "stat"; value: string; label?: string }
  | {
      type: "compare";
      /**
       * Visual relationship between the two cards.
       *  - "vs" (default): symmetric alternatives or trade-offs (e.g. snowball
       *    vs avalanche, fixed vs variable, country A vs country B). Renders
       *    a vertical "vs" divider with hairlines. No directional connotation.
       *  - "progression": one side causes / produces / decomposes into the
       *    other (e.g. "€200k borrowed → €100k interest paid", "income →
       *    expenses → savings"). Renders a directional amber arrow. Use only
       *    when the relationship is genuinely directional.
       */
      mode?: "vs" | "progression";
      left: { label: string; value: string };
      right: { label: string; value: string };
    }
  | { type: "list"; items: string[] }
  | {
      /**
       * Multi-step flowchart: 3-5 sequential nodes revealed one at a time,
       * connected by directional arrows, with an optional terminal "outcome"
       * node rendered with accent emphasis. Use for PROCESSES the viewer
       * follows in order (e.g. "open account → pick an index fund → automate
       * the transfer → rebalance yearly") where a 2-card compare can't capture
       * the sequence. This is the primary "don't be text-heavy" primitive for
       * how-to / building-phase reels: it turns a list of steps into a diagram.
       *
       * Distinct from `compare` (2 cards, one relationship) and `list`
       * (unordered/parallel items). Flow implies strict left-to-right order.
       */
      type: "flow";
      /**
       * Orientation of the chain.
       *  - "vertical" (default): nodes stack top-to-bottom with down arrows.
       *    Best for 3-5 steps; reads naturally in the 9:16 portrait frame.
       *  - "horizontal": nodes sit left-to-right with right arrows. Use only
       *    for 2-3 short nodes; longer chains overflow the safe area.
       */
      orientation?: "vertical" | "horizontal";
      /** 3-5 ordered steps. Each is a short label (1-5 words). */
      steps: Array<{
        /** Short node label, 1-5 words. */
        label: string;
        /** Optional one-line detail under the label, 2-8 words. */
        detail?: string;
        /**
         * When true, render this node as the terminal outcome (teal accent
         * fill, heavier weight). Typically the last step. At most one step
         * should set this.
         */
        outcome?: boolean;
      }>;
    }
  | { type: "number-counter"; from?: number; to: number; prefix?: string; suffix?: string; label?: string }
  | {
      /** Pre-rendered SVG figure from the blog post, rasterised to PNG. */
      type: "figure";
      /** Path relative to remotion/public/, e.g. "figures/purchasing-power.png". */
      path: string;
      /** Figcaption text, used as a small caption under the figure. */
      caption?: string;
    };

export interface HookVariant {
  id: string;
  layout: HookLayout;
  /** Spoken narration for this hook. Plain prose, no SSML. */
  narration: string;
  /** On-screen text broken into 1-3 short lines. */
  onscreenLines: string[];
  /**
   * Sub-style for `contradiction` layout only. "myth-bust" means line 1 is a
   * common belief being refuted (renders with a "MYTH" kicker visible from
   * frame 0 and a strikethrough animation). "vs" means both lines are true
   * but offer contrasting angles (no strikethrough, both rendered as equal
   * alternatives separated by a divider). Default: "vs". The default avoids
   * the bug where comparison-style contradiction hooks were striking
   * through a true line-1 statement.
   */
  contradictionStyle?: "myth-bust" | "vs";
  /** Optional anchor data (e.g. the headline number). */
  anchor?: BeatAnchor;
  /** Words in narration to emphasise visually (size pop / colour). */
  emphasis?: string[];
}

export interface Beat {
  id: string;
  kind: BeatKind;
  /** Spoken narration. Should be 6-25 words. */
  narration: string;
  /** Short on-screen headline for this beat, 2-7 words. */
  onscreenText: string;
  /** Optional supporting line, 4-12 words. */
  subtext?: string;
  /** Words to emphasise visually. */
  emphasis?: string[];
  anchor?: BeatAnchor;
}

export type ApprovedCTA = "save" | "tag" | "share" | "poll";

export interface CTABlock {
  approved: ApprovedCTA;
  narration: string;
  onscreenText: string;
  subtext?: string;
  handle: string;
  /**
   * Optional follow ask, rendered as a small line under the handle and as a
   * "+ FOLLOW" badge. Must be specific to the series, never "follow for
   * more". Omitted if no follow ask is desired.
   */
  followAsk?: string;
}

export interface PlatformCaption {
  /** First line is the hook re-stated; ends with link-in-bio nudge. */
  instagram: string;
  tiktok: string;
  /**
   * Multilingual keyword array appended after the hashtag line in the IG
   * caption. Feeds IG's topic classifier + multilingual search index. Distinct
   * surface from hashtags (community-follow vs search-query) — terms here
   * MUST NOT duplicate the hashtag list. 13-18 items per post is the 2026
   * sweet spot; PLAYBOOK §6 has the full rules. Sourced per-topic from the
   * blog post (topic terms + per-post audience angle) plus targeted
   * non-English translations where the native word is what people search.
   *
   * Render shape: `[ kw1, kw2, kw3, ... ]` block on a new line after the
   * hashtag line in `.ig.txt`. NEVER include `#` symbols inside.
   */
  instagramKeywords?: string[];
  /**
   * 3-5 natural-language search-query phrases for the TikTok caption. TikTok
   * 2026 weights caption text + on-screen text + audio transcript more than
   * structured arrays; bracketed multilingual blocks read as spam. So this
   * is rendered as a single natural-language line ("Topics: phrase1, phrase2,
   * phrase3") above the hashtags in `.tiktok.txt`. Phrases stay English —
   * TikTok auto-translates and serves cross-language audiences via the
   * subtitle track + translation layer.
   */
  tiktokTopics?: string[];
  /**
   * 0-3 extra niche hashtags appended to the TikTok caption ONLY (never the
   * IG caption — IG enforces a 5-cap and stuffing flags low quality). TikTok
   * tolerates 5-7 hashtags total in 2026 and the additional niche tags lift
   * search reach on the FYP. Each tag stripped of any leading `#`.
   */
  tiktokExtraTags?: string[];
}

/** What the LLM returns. Validated and scrubbed before consumed downstream. */
export interface ReelPlan {
  slug: string;
  postTitle: string;
  postLevel: "discovery" | "building";
  /** 1-indexed episode within the series (= blog post `order`). Stamped by orchestrator. */
  episode: number;
  /** Total posts in the series the chip should render against. Defaults: 16/16. */
  seriesTotal: number;
  mode: ReelMode;
  topic: string;
  /**
   * 1-3 word topic anchor rendered in the SeriesChip ("EMERGENCY FUNDS",
   * "PURCHASING POWER", "CASH FLOW"). LLM emits explicitly; orchestrator
   * falls back to a derivation from postTitle if absent.
   */
  topicChip: string;
  /**
   * Path to the deeper article on the blog. Used by the CTA scene's "READ"
   * row (PLAYBOOK.md:413-440 — closer slide must always carry a READ
   * pointer). Stamped by orchestrator from slug; format: "blog/<slug>".
   */
  blogPath: string;
  /**
   * Numerical assumptions used to derive every quantitative claim in the reel.
   * The scrubber's math-consistency pass uses these as the single source of
   * truth: any beat number that can't be reproduced from these assumptions
   * (±2% tolerance) is rejected.
   *
   * The LLM must declare assumptions explicitly in its output. Non-numerical
   * reels may leave individual fields undefined.
   */
  assumptions?: {
    inflationPct?: number;
    savingsRatePct?: number;
    investmentRatePct?: number;
    horizonYears?: number;
    currency?: string;
    notes?: string;
  };
  mood: Mood;
  /** 3 hook candidates. Index 0 is the LLM's preferred pick. */
  hookVariants: HookVariant[];
  /** Selected hook index, default 0. CLI --variant overrides. */
  useHookVariant: number;
  beats: Beat[];
  cta: CTABlock;
  caption: PlatformCaption;
  /** Hashtag list (no leading #). 5 max per PLAYBOOK. */
  hashtags: string[];
  /**
   * Figures pre-rendered from this blog post's `<figure>` blocks. Only set
   * for posts that have figures AND whose figure PNGs have been generated
   * by `npm run render-figures`. The LLM is told about these via the user
   * prompt and may reference them in beat anchors of type "figure".
   */
  availableFigures: Array<{ path: string; caption: string }>;
  /**
   * Optional paired free tool, surfaced in the CTA scene's READ row as
   * "FREE TOOL · {cta} · nidhi.today{url}" instead of the default blog URL.
   * Stamped by orchestrator from blog frontmatter `relatedTool`. The LLM
   * does NOT author this; it is brand-controlled and deterministic.
   */
  relatedTool?: { url: string; label: string; cta: string };
  /**
   * Optional one-line teaser describing what's in the blog post that isn't
   * fully covered in the reel. Surfaced in the CTA scene's READ row as the
   * subtext line ("READ THE FULL POST · {reelPromise} · nidhi.today/blog/X").
   * Stamped by orchestrator from blog frontmatter `reelPromise`.
   */
  reelPromise?: string;
}

// ---------- Orchestrator-augmented layer ----------

export interface BeatSpan {
  beatId: string;
  startMs: number;
  endMs: number;
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

/** What the Remotion renderer consumes. */
export interface ReelInput {
  plan: ReelPlan;
  hookSpan: { startMs: number; endMs: number };
  beatSpans: BeatSpan[];
  ctaSpan: { startMs: number; endMs: number };
  wordTimings: WordTiming[];
  audioFile: string;
  /** Optional music file relative to remotion/public/. Empty = no music bed. */
  musicFile: string;
  /** Render mode: "full" = 45-75s, "hookcut" = 12-18s short. */
  cut: "full" | "hookcut";
  /** When cut = hookcut, only these beat IDs render. */
  hookcutBeatIds?: string[];
}

// ---------- Render constants ----------

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Music bed level under voiceover (linear gain, 0..1). -18dB ~= 0.126 */
export const MUSIC_DUCK_GAIN = 0.13;
/** Music bed level when no voiceover present (intro/outro tail). */
export const MUSIC_FULL_GAIN = 0.35;

// ---------- Brand palette: Series 2 cream editorial ----------
//
// Source: docs/plans/PLAYBOOK.md:128-176 (Series 2 cream editorial template).
// Replaces the legacy Material Design deep-blue + teal palette.

export const BRAND = {
  // Primary surface
  paper: "#FAF7F2",        // cream paper background
  paperDeep: "#F2EBDD",    // edge tint for vignette
  // Ink
  ink: "#002171",          // deep navy ink (titles, body)
  inkSoft: "#1E3A8A",      // softer navy for secondary text
  inkMuted: "#6B7B9C",     // very soft navy/grey
  // Accents
  teal: "#00897B",         // editorial teal accent
  tealDeep: "#00695C",     // hover/active teal
  amber: "#C2410C",        // cautionary accent (warnings only)
  // Utility
  paperWhite: "#FFFFFF",
  hairline: "#E5DFCF",     // hairline rules
} as const;

// ---------- Typography scale ----------

export const TYPE = {
  display: "'Fraunces', 'Playfair Display', Georgia, serif",
  ui: "'Inter', 'Roboto', sans-serif",
  // Sizes are in px on a 1080x1920 canvas.
  hookHero: 180,    // hook hero number
  hookTitle: 110,   // hook headline text
  hookSub: 56,
  beatNumber: 240,  // big stat anchor
  beatHeadline: 96,
  beatSubtext: 48,
  ctaPrimary: 120,
  ctaSubtext: 52,
  caption: 56,
  captionPast: 38,
  handle: 40,
} as const;
