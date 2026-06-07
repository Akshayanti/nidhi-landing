import { useCurrentFrame, spring, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { BRAND, TYPE, type Beat } from "../data";

/**
 * Theme-driven colour tokens are read as CSS variables set by BrandBackground.
 *
 * Why not direct BRAND.* references? Because the same beat layouts render on
 * BOTH the Discovery (dark navy canvas) and Building (cream paper canvas)
 * themes. Hard-coding `BRAND.ink` would force black text on navy, which is
 * unreadable. The BrandBackground sets `--ink` to either BRAND.ink (paper
 * theme) or BRAND.paper (dark theme), and every component below picks up
 * the right colour automatically.
 *
 * The brand accent colours (teal, amber) work on both backgrounds, so they
 * stay as direct BRAND.* references and don't need a CSS-variable swap.
 */
const COLOR = {
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  inkMuted: "var(--ink-muted)",
  hairline: "var(--hairline)",
  rule: "var(--rule)",
  cardBg: "var(--card-bg)",
} as const;

interface Props {
  beat: Beat;
  /** Local beat duration in frames (used to choreograph animations). */
  durationInFrames: number;
}

/**
 * Beat-level scene. Picks a layout primitive based on `beat.kind` and
 * `beat.anchor.type`. All layouts share kinetic-typography defaults
 * (word-by-word reveal, emphasis pop) so any beat looks dynamic even
 * without an anchor.
 */
export function BeatScene({ beat, durationInFrames }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Anchor-driven primitive takes precedence over kind heuristics.
  if (beat.anchor) {
    switch (beat.anchor.type) {
      case "stat":
        return <StatBeat beat={beat} frame={frame} fps={fps} />;
      case "compare":
        return <CompareBeat beat={beat} frame={frame} fps={fps} />;
      case "list":
        return <ListBeat beat={beat} frame={frame} fps={fps} />;
      case "flow":
        return <FlowBeat beat={beat} frame={frame} fps={fps} />;
      case "number-counter":
        return <NumberCounterBeat beat={beat} frame={frame} fps={fps} duration={durationInFrames} />;
      case "figure":
        return <FigureBeat beat={beat} frame={frame} fps={fps} />;
    }
  }

  // No anchor: pure kinetic typography. Different layouts per kind so the
  // visual rhythm changes scene-to-scene rather than feeling templated.
  switch (beat.kind) {
    case "warning":
      return <WarningBeat beat={beat} frame={frame} fps={fps} />;
    case "transition":
      return <TransitionBeat beat={beat} frame={frame} fps={fps} />;
    case "story":
    case "example":
      return <NarrativeBeat beat={beat} frame={frame} fps={fps} />;
    case "definition":
    case "comparison":
    case "stat":
    case "list":
    default:
      return <DefinitionBeat beat={beat} frame={frame} fps={fps} />;
  }
}

// ---------------- shared bits ----------------

// Safe areas tuned for IG Reels / TikTok overlay UI.
//   Top:    ~280 px reserved (status bar + IG header + SeriesChip).
//   Bottom: ~380 px reserved (caption pill at bottom: 200 + IG action rail).
const center: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  paddingLeft: 80,
  paddingRight: 80,
  paddingTop: 280,
  paddingBottom: 380,
};

/**
 * Adaptive sizing for beat headlines.
 *   ≤ 5 words → base size (96 px)
 *   each extra word reduces ~5 px, floor 56 px.
 */
function fitHeadline(text: string, base: number): number {
  const wordCount = text.trim().split(/\s+/).length;
  const overflow = Math.max(0, wordCount - 5);
  return Math.max(56, Math.round(base - overflow * 5));
}

/**
 * Adaptive sizing for the giant beat hero numbers (Stat / NumberCounter
 * primitives at 240 px base). "EUR 3,000" or "67%" stays at 240; longer
 * values like "EUR 60,000" or "1 in 4" shrink so they don't blow past the
 * 920 px content area.
 */
function fitBeatNumber(value: string, base: number): number {
  const overflow = Math.max(0, value.length - 5);
  return Math.max(96, Math.round(base - overflow * 12));
}

/**
 * Adaptive sizing for compare-card values. Cards are ~280 px wide internally,
 * which can't fit "Inconvenience" at 92 px. Shrinks aggressively per char
 * above 6, floors at 48 px.
 */
function fitCompareValue(value: string, base: number): number {
  const overflow = Math.max(0, value.length - 6);
  return Math.max(48, Math.round(base - overflow * 6));
}

function KineticHeadline({
  text,
  emphasis = [],
  appear,
}: {
  text: string;
  emphasis?: string[];
  appear: number;
}) {
  const emphSet = new Set(emphasis.map(w => w.replace(/[^a-z0-9]/gi, "").toLowerCase()));
  const norm = (w: string) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const words = text.split(/\s+/);

  return (
    <h1
      style={{
        fontFamily: TYPE.display,
        fontSize: fitHeadline(text, TYPE.beatHeadline),
        fontWeight: 800,
        color: COLOR.ink,
        margin: 0,
        textAlign: "center",
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 20}px)`,
        maxWidth: "100%",
      }}
    >
      {words.map((w, i) => {
        const isEmph = emphSet.has(norm(w));
        return (
          <span key={i}>
            <span
              style={{
                color: isEmph ? BRAND.teal : COLOR.ink,
                fontStyle: isEmph ? "italic" : "normal",
                background: isEmph ? `linear-gradient(180deg, transparent 60%, rgba(0,137,123,0.18) 60%)` : "none",
                padding: isEmph ? "0 6px" : 0,
                marginLeft: isEmph ? 4 : 0,
                marginRight: isEmph ? 4 : 0,
              }}
            >
              {w}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </h1>
  );
}

function Subtext({ text, appear }: { text: string; appear: number }) {
  return (
    <div
      style={{
        fontFamily: TYPE.ui,
        fontSize: TYPE.beatSubtext,
        fontWeight: 500,
        color: COLOR.inkSoft,
        marginTop: 30,
        textAlign: "center",
        lineHeight: 1.3,
        opacity: appear,
        transform: `translateY(${(1 - appear) * 12}px)`,
        maxWidth: 880,
      }}
    >
      {text}
    </div>
  );
}

function KindLabel({ label, color = BRAND.teal, appear }: { label: string; color?: string; appear: number }) {
  return (
    <div
      style={{
        fontFamily: TYPE.ui,
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        marginBottom: 36,
        opacity: appear,
      }}
    >
      {label}
    </div>
  );
}

// ---------------- anchor-driven layouts ----------------

function StatBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  if (beat.anchor?.type !== "stat") return null;
  const numScale = spring({ frame, fps, config: { damping: 11, stiffness: 150 } });
  const labelAppear = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const headlineAppear = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <div style={center}>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: fitBeatNumber(beat.anchor.value, TYPE.beatNumber),
          fontWeight: 900,
          color: COLOR.ink,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          textAlign: "center",
          maxWidth: "100%",
          transform: `scale(${numScale}) translateY(${(1 - numScale) * 30}px)`,
        }}
      >
        {beat.anchor.value}
      </div>
      {beat.anchor.label && (
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: TYPE.beatSubtext + 6,
            fontWeight: 600,
            color: COLOR.inkMuted,
            marginTop: 18,
            textAlign: "center",
            opacity: labelAppear,
            maxWidth: "100%",
          }}
        >
          {beat.anchor.label}
        </div>
      )}
      <div style={{ height: 60 }} />
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
    </div>
  );
}

function CompareBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  if (beat.anchor?.type !== "compare") return null;
  const leftAppear = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const dividerAppear = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 180 } });
  const rightAppear = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 120 } });
  const headlineAppear = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const mode = beat.anchor.mode ?? "vs";

  return (
    <div style={center}>
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
      <div style={{ height: 60 }} />
      <div style={{ display: "flex", gap: 24, alignItems: "stretch", width: "100%", maxWidth: 920 }}>
        <CompareCard
          label={beat.anchor.left.label}
          value={beat.anchor.left.value}
          appear={leftAppear}
          tone="ink"
        />
        <CompareDivider appear={dividerAppear} mode={mode} />
        <CompareCard
          label={beat.anchor.right.label}
          value={beat.anchor.right.value}
          appear={rightAppear}
          tone={mode === "progression" ? "ink" : "teal"}
        />
      </div>
    </div>
  );
}

/**
 * Divider for compare beats.
 *
 * mode="vs" (symmetric alternatives): centered "vs" italic between two short
 * rules, mirroring the ContradictionHookVs hook style. Equal weighting, no
 * directional connotation.
 *
 * mode="progression" (causal/decomposition): centered amber "→" arrow between
 * short rules. Use when one side produces, causes, or decomposes into the
 * other ("borrowed → interest paid", "income → savings"). Both cards are
 * rendered in ink tone so the arrow carries the directionality, not colour.
 */
function CompareDivider({ appear, mode }: { appear: number; mode: "vs" | "progression" }) {
  const isProgression = mode === "progression";
  return (
    <div
      style={{
        alignSelf: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: appear,
        transform: `scale(${0.85 + appear * 0.15})`,
      }}
    >
      <div style={{ width: 2, height: 22, background: COLOR.rule }} />
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: isProgression ? 56 : 26,
          fontWeight: 800,
          letterSpacing: isProgression ? "0" : "0.16em",
          color: BRAND.amber, // amber accent inks well on cream and on dark navy
          fontStyle: isProgression ? "normal" : "italic",
          textTransform: isProgression ? "none" : "lowercase",
          lineHeight: 1,
        }}
      >
        {isProgression ? "→" : "vs"}
      </div>
      <div style={{ width: 2, height: 22, background: COLOR.rule }} />
    </div>
  );
}

function CompareCard({ label, value, appear, tone }: { label: string; value: string; appear: number; tone: "ink" | "teal" }) {
  // tone="ink" means: take whatever the canvas's ink colour is (paper:navy,
  // dark:cream). tone="teal" overrides with the editorial accent regardless
  // of canvas. Border + label colour follow `accent`; the value itself stays
  // on `COLOR.ink` so the typography hierarchy (small-cap accent label,
  // big ink value) is preserved.
  const accent = tone === "teal" ? BRAND.teal : COLOR.ink;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0, // permit shrinking inside flex row
        background: COLOR.cardBg,
        border: `2px solid ${accent}`,
        borderRadius: 24,
        padding: "32px 24px",
        textAlign: "center",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 16}px)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: 28,
          fontWeight: 700,
          color: accent,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: fitCompareValue(value, 88),
          fontWeight: 800,
          color: COLOR.ink,
          marginTop: 12,
          lineHeight: 1.0,
          letterSpacing: "-0.02em",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ListBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  if (beat.anchor?.type !== "list") return null;
  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <div style={center}>
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
      <div style={{ height: 50 }} />
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          width: "100%",
          maxWidth: 760,
        }}
      >
        {beat.anchor.items.map((item, i) => {
          const itemAppear = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 14, stiffness: 130 } });
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                fontFamily: TYPE.ui,
                fontSize: 60,
                fontWeight: 600,
                color: COLOR.ink,
                padding: "16px 0",
                borderBottom: `1px solid ${COLOR.hairline}`,
                opacity: itemAppear,
                transform: `translateX(${(1 - itemAppear) * -24}px)`,
              }}
            >
              <span style={{ fontFamily: TYPE.display, fontSize: 56, color: BRAND.teal, fontWeight: 800, minWidth: 60 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Flowchart beat: 3-5 ordered nodes connected by directional arrows, revealed
 * one at a time so the eye follows the sequence as the voiceover describes it.
 *
 * This is the primary "not text-heavy" primitive for process / how-to beats.
 * Instead of a bullet list, the viewer sees an actual diagram of steps with
 * directional flow. The terminal node (steps[i].outcome === true) renders with
 * a teal accent fill so the payoff reads at a glance even on a paused frame.
 *
 * Orientation:
 *   - vertical (default): nodes stack down the portrait frame with "↓" arrows.
 *     Choreographed reveal cadence ~7 frames per node keeps a 4-5s beat in sync.
 *   - horizontal: nodes sit left-to-right with "→" arrows. Reserved for 2-3
 *     short nodes; the renderer shrinks node text to fit but long chains will
 *     overflow, so the schema + prompt cap horizontal at 3 nodes.
 */
function FlowBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  if (beat.anchor?.type !== "flow") return null;
  const orientation = beat.anchor.orientation ?? "vertical";
  const steps = beat.anchor.steps.slice(0, 5);
  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const isHorizontal = orientation === "horizontal";

  // Per-node reveal cadence. Node i appears, then its inbound arrow.
  const NODE_STEP = 7; // frames between successive node reveals
  const baseDelay = 8; // frames after headline before node 1 appears

  const fitNodeLabel = (label: string) => {
    const words = label.trim().split(/\s+/).length;
    const base = isHorizontal ? 40 : 54;
    return Math.max(30, base - Math.max(0, words - 3) * 4);
  };

  return (
    <div style={center}>
      {beat.onscreenText && beat.onscreenText.trim() && (
        <>
          <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
          <div style={{ height: 44 }} />
        </>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: isHorizontal ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          width: "100%",
          maxWidth: isHorizontal ? 940 : 720,
        }}
      >
        {steps.map((step, i) => {
          const nodeAppear = spring({
            frame: frame - baseDelay - i * NODE_STEP,
            fps,
            config: { damping: 15, stiffness: 130 },
          });
          // The arrow leading INTO node i (i>0) appears just before the node.
          const arrowAppear = i === 0 ? 1 : spring({
            frame: frame - baseDelay - i * NODE_STEP + 4,
            fps,
            config: { damping: 16, stiffness: 180 },
          });
          const isOutcome = step.outcome === true;
          const accent = isOutcome ? BRAND.teal : COLOR.ink;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: isHorizontal ? "row" : "column",
                alignItems: "center",
                width: isHorizontal ? "auto" : "100%",
                flex: isHorizontal ? 1 : "none",
                minWidth: 0,
              }}
            >
              {i > 0 && (
                <FlowArrow horizontal={isHorizontal} appear={arrowAppear} />
              )}
              <div
                style={{
                  width: isHorizontal ? "100%" : "auto",
                  minWidth: isHorizontal ? 0 : 360,
                  maxWidth: "100%",
                  background: isOutcome ? BRAND.teal : COLOR.cardBg,
                  border: `2px solid ${accent}`,
                  borderRadius: 20,
                  padding: isHorizontal ? "20px 16px" : "22px 30px",
                  textAlign: "center",
                  opacity: nodeAppear,
                  transform: `translateY(${(1 - nodeAppear) * 16}px) scale(${0.92 + nodeAppear * 0.08})`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontFamily: TYPE.ui,
                    fontSize: fitNodeLabel(step.label),
                    fontWeight: 700,
                    color: isOutcome ? BRAND.paperWhite : COLOR.ink,
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                    wordBreak: "break-word",
                  }}
                >
                  {step.label}
                </div>
                {step.detail && step.detail.trim() && (
                  <div
                    style={{
                      fontFamily: TYPE.ui,
                      fontSize: isHorizontal ? 24 : 30,
                      fontWeight: 500,
                      color: isOutcome ? "rgba(255,255,255,0.85)" : COLOR.inkMuted,
                      marginTop: 8,
                      lineHeight: 1.2,
                    }}
                  >
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Directional connector between two flow nodes. Renders an amber arrow (the
 * brand's directional accent, matching the compare "progression" divider) plus
 * a short hairline so the chain reads as a continuous path. Orientation flips
 * the glyph and the surrounding spacing.
 */
function FlowArrow({ horizontal, appear }: { horizontal: boolean; appear: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        padding: horizontal ? "0 10px" : "8px 0",
        opacity: appear,
        transform: `scale(${0.8 + appear * 0.2})`,
      }}
    >
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: horizontal ? 44 : 48,
          fontWeight: 800,
          color: BRAND.amber,
          lineHeight: 1,
        }}
      >
        {horizontal ? "→" : "↓"}
      </div>
    </div>
  );
}

function NumberCounterBeat({
  beat,
  frame,
  fps,
  duration,
}: {
  beat: Beat;
  frame: number;
  fps: number;
  duration: number;
}) {
  if (beat.anchor?.type !== "number-counter") return null;
  const from = beat.anchor.from ?? 0;
  const target = beat.anchor.to;
  const t = spring({ frame, fps, config: { damping: 18, stiffness: 80, mass: 0.8 }, durationInFrames: Math.min(duration, fps * 2) });
  const value = Math.round(interpolate(t, [0, 1], [from, target]));
  const labelAppear = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const headlineAppear = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <div style={center}>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: fitBeatNumber(
            `${beat.anchor.prefix ?? ""}${target.toLocaleString("en-GB")}${beat.anchor.suffix ?? ""}`,
            TYPE.beatNumber,
          ),
          fontWeight: 900,
          color: COLOR.ink,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          maxWidth: "100%",
        }}
      >
        {beat.anchor.prefix ?? ""}{value.toLocaleString("en-GB")}{beat.anchor.suffix ?? ""}
      </div>
      {beat.anchor.label && (
        <div style={{ fontFamily: TYPE.ui, fontSize: TYPE.beatSubtext + 6, fontWeight: 600, color: COLOR.inkMuted, marginTop: 18, opacity: labelAppear }}>
          {beat.anchor.label}
        </div>
      )}
      <div style={{ height: 60 }} />
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
    </div>
  );
}

// ---------------- figure layout (reuses pre-rendered blog SVGs) ----------------

function FigureBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  if (beat.anchor?.type !== "figure") return null;

  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const figureAppear = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 100 } });

  // Clean figure beat: the figure IS the slide. Earlier versions wrapped it
  // in a white card with border, shadow, rounded corners and padding, plus
  // rendered the long figcaption underneath. The result was a "picture-in-
  // picture" feel — a small framed image floating inside a busy canvas.
  //
  // Now: optional short headline at top, then the figure rendered edge-to-
  // edge in its native aspect at maximum width that respects the safe area.
  // The figcaption from the post is intentionally NOT rendered: it's blog/
  // carousel-length prose, unreadable in a 4-second beat. The voiceover and
  // headline carry context; the figure does the rest.
  return (
    <div style={center}>
      {beat.onscreenText && beat.onscreenText.trim() && (
        <>
          <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
          <div style={{ height: 28 }} />
        </>
      )}
      <Img
        src={staticFile(beat.anchor.path)}
        style={{
          width: 980,
          maxWidth: "100%",
          height: "auto",
          objectFit: "contain",
          opacity: figureAppear,
          transform: `translateY(${(1 - figureAppear) * 18}px)`,
        }}
      />
    </div>
  );
}

// ---------------- pure-typography layouts ----------------

function DefinitionBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const subAppear = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <div style={center}>
      <KindLabel label={beat.kind} appear={headlineAppear} />
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
      {beat.subtext && <Subtext text={beat.subtext} appear={subAppear} />}
    </div>
  );
}

function NarrativeBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const subAppear = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <div style={{ ...center, alignItems: "flex-start", textAlign: "left" }}>
      <KindLabel label={beat.kind === "story" ? "STORY" : "EXAMPLE"} appear={headlineAppear} />
      <h1
        style={{
          fontFamily: TYPE.display,
          fontSize: TYPE.beatHeadline - 4,
          fontWeight: 700,
          fontStyle: "italic",
          color: COLOR.ink,
          margin: 0,
          textAlign: "left",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          opacity: headlineAppear,
          transform: `translateY(${(1 - headlineAppear) * 16}px)`,
        }}
      >
        {beat.onscreenText}
      </h1>
      {beat.subtext && (
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: TYPE.beatSubtext,
            fontWeight: 400,
            color: COLOR.inkSoft,
            marginTop: 24,
            textAlign: "left",
            lineHeight: 1.35,
            opacity: subAppear,
            transform: `translateY(${(1 - subAppear) * 10}px)`,
          }}
        >
          {beat.subtext}
        </div>
      )}
    </div>
  );
}

function WarningBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  const headlineAppear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const subAppear = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 110 } });
  const ruleProgress = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={center}>
      <KindLabel label="HEADS UP" color={BRAND.amber} appear={headlineAppear} />
      <div
        style={{
          width: "60%",
          maxWidth: 540,
          height: 4,
          background: BRAND.amber,
          marginBottom: 28,
          transformOrigin: "left center",
          transform: `scaleX(${ruleProgress})`,
        }}
      />
      <KineticHeadline text={beat.onscreenText} emphasis={beat.emphasis} appear={headlineAppear} />
      {beat.subtext && <Subtext text={beat.subtext} appear={subAppear} />}
    </div>
  );
}

function TransitionBeat({ beat, frame, fps }: { beat: Beat; frame: number; fps: number }) {
  const appear = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  return (
    <div style={{ ...center, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: TYPE.beatHeadline + 12,
          fontWeight: 700,
          fontStyle: "italic",
          color: COLOR.ink,
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          opacity: appear,
          transform: `translateY(${(1 - appear) * 12}px)`,
          maxWidth: 880,
        }}
      >
        {beat.onscreenText}
      </div>
    </div>
  );
}
