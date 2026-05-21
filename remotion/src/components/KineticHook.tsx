import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { TYPE, type HookVariant } from "../data";

interface Props {
  hook: HookVariant;
}

/**
 * Hook scene: 5 layout variants driven by hook.layout.
 * Concept-driven, not template-driven. Each variant has its own composition.
 */
export function KineticHook({ hook }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  switch (hook.layout) {
    case "big-number": return <BigNumberHook hook={hook} frame={frame} fps={fps} />;
    case "question": return <QuestionHook hook={hook} frame={frame} fps={fps} />;
    case "contradiction": return <ContradictionHook hook={hook} frame={frame} fps={fps} />;
    case "scenario": return <ScenarioHook hook={hook} frame={frame} fps={fps} />;
    case "quote": return <QuoteHook hook={hook} frame={frame} fps={fps} />;
    default: return <BigNumberHook hook={hook} frame={frame} fps={fps} />;
  }
}

// ----------------- variant: big-number -----------------

function BigNumberHook({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const numScale = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const titleAppear = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 120 } });

  const stat = hook.anchor?.type === "stat" ? hook.anchor : null;

  return (
    <div style={containerCenter}>
      {stat && (
        <div
          style={{
            fontFamily: TYPE.display,
            fontSize: fitHero(stat.value, TYPE.hookHero),
            fontWeight: 900,
            color: "var(--ink)",
            transform: `scale(${numScale}) translateY(${(1 - numScale) * 30}px)`,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {stat.value}
        </div>
      )}
      {stat?.label && (
        <div
          style={{
            fontSize: TYPE.hookSub,
            fontWeight: 500,
            color: "var(--ink-soft)",
            marginTop: 16,
            opacity: titleAppear,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          {stat.label}
        </div>
      )}
      <div style={{ height: 60 }} />
      <Lines lines={hook.onscreenLines} appear={titleAppear} dark={true} />
    </div>
  );
}

// ----------------- variant: question -----------------

function QuestionHook({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const linesAppear = hook.onscreenLines.map((_, i) =>
    spring({ frame: frame - i * 6, fps, config: { damping: 14, stiffness: 110 } })
  );

  return (
    <div style={{ ...containerCenter, justifyContent: "center" }}>
      {hook.onscreenLines.map((line, i) => {
        const isLast = i === hook.onscreenLines.length - 1;
        return (
          <div
            key={i}
            style={{
              fontFamily: isLast ? TYPE.display : TYPE.ui,
              fontSize: fitHookTitle(line, isLast ? TYPE.hookTitle + 20 : TYPE.hookTitle),
              fontWeight: isLast ? 900 : 600,
              fontStyle: isLast ? "italic" : "normal",
              color: isLast ? "var(--ink)" : "var(--ink-soft)",
              opacity: linesAppear[i],
              transform: `translateY(${(1 - linesAppear[i]) * 20}px)`,
              textAlign: "center",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              padding: "0 40px",
              marginBottom: i === 0 ? 24 : 12,
              maxWidth: "100%",
            }}
          >
            {line}{isLast && line.endsWith("?") === false ? "?" : ""}
          </div>
        );
      })}
    </div>
  );
}

// ----------------- variant: contradiction -----------------

function ContradictionHook({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  // Two distinct sub-styles. Default to "vs" because it's safe — striking
  // through a true line-1 statement (the bug we hit on credit / debt /
  // net-worth / euro reels) is much worse than missing a strike on a true
  // myth-bust hook.
  const style = hook.contradictionStyle ?? "vs";
  if (style === "myth-bust") {
    return <ContradictionHookMythBust hook={hook} frame={frame} fps={fps} />;
  }
  return <ContradictionHookVs hook={hook} frame={frame} fps={fps} />;
}

/**
 * Myth-bust style: line 1 is a common (false) belief, line 2 is the truth.
 * From frame 0 the screen reads as "this is a myth being refuted":
 *   - small "MYTH" kicker visible from frame 0
 *   - faded/grey line text
 *   - strike-through animates from frame 0 → frame 14 (was frame 16 → 28),
 *     so even at the first scroll-past frame the line reads as crossed out
 *   - payoff appears at frame 24+ in big bold display
 */
function ContradictionHookMythBust({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const firstAppear = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const kickerAppear = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  // Strike starts immediately at frame 0 and completes by frame 14 (≈0.47s
  // at 30fps). This eliminates the first-frame ambiguity where viewers
  // briefly read the setup line as a positive statement.
  const strikeProgress = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const secondAppear = spring({ frame: frame - 24, fps, config: { damping: 14, stiffness: 130 } });

  const [setupLine, ...payoff] = hook.onscreenLines;

  return (
    <div style={containerCenter}>
      {/* MYTH kicker — visible from frame 0 with just a quick fade-in. */}
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "#F2A65A",
          opacity: kickerAppear,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        MYTH
      </div>
      {/* Setup line gets struck through, animating from frame 0. */}
      <div
        style={{
          position: "relative",
          fontFamily: TYPE.ui,
          fontSize: fitHookTitle(setupLine, TYPE.hookTitle - 10),
          fontWeight: 600,
          color: "var(--ink-muted)",
          opacity: firstAppear,
          textAlign: "center",
          padding: "0 40px",
          lineHeight: 1.1,
          marginBottom: 36,
          maxWidth: "100%",
        }}
      >
        {setupLine}
        <div
          style={{
            position: "absolute",
            top: "52%",
            left: 40,
            right: 40,
            height: 6,
            background: "#F2A65A",
            transformOrigin: "left center",
            transform: `scaleX(${strikeProgress})`,
            borderRadius: 3,
          }}
        />
      </div>
      {/* Payoff lines */}
      {payoff.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: TYPE.display,
            fontSize: fitHookTitle(line, TYPE.hookTitle + 16),
            fontWeight: 900,
            color: "var(--ink)",
            opacity: secondAppear,
            transform: `translateY(${(1 - secondAppear) * 24}px)`,
            textAlign: "center",
            padding: "0 40px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            maxWidth: "100%",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * "vs" style: both lines are TRUE but contrast each other. No strikethrough.
 * Both lines render as equal-weight statements with a small "vs" divider.
 * Use cases: "Perfect payment history / €19,000 extra interest", "Pay off
 * smallest first / Pay off most expensive first", "Salary tells you what
 * you earn / Net worth tells you what you keep".
 */
function ContradictionHookVs({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const firstAppear = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const dividerAppear = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 180 } });
  const secondAppear = spring({ frame: frame - 16, fps, config: { damping: 14, stiffness: 130 } });

  const [lineA, ...rest] = hook.onscreenLines;
  const lineB = rest.join(" ");

  return (
    <div style={{ ...containerCenter, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: fitHookTitle(lineA, TYPE.hookTitle + 4),
          fontWeight: 900,
          color: "var(--ink)",
          opacity: firstAppear,
          transform: `translateY(${(1 - firstAppear) * 20}px)`,
          textAlign: "center",
          padding: "0 40px",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginBottom: 18,
          maxWidth: "100%",
        }}
      >
        {lineA}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: dividerAppear,
          margin: "10px 0 18px 0",
        }}
      >
        <div style={{ width: 80, height: 2, background: "var(--rule)" }} />
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "#F2A65A",
            fontStyle: "italic",
          }}
        >
          vs
        </div>
        <div style={{ width: 80, height: 2, background: "var(--rule)" }} />
      </div>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: fitHookTitle(lineB, TYPE.hookTitle + 4),
          fontWeight: 900,
          color: "var(--ink)",
          opacity: secondAppear,
          transform: `translateY(${(1 - secondAppear) * 20}px)`,
          textAlign: "center",
          padding: "0 40px",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginBottom: 8,
          maxWidth: "100%",
        }}
      >
        {lineB}
      </div>
    </div>
  );
}

// ----------------- variant: scenario -----------------

function ScenarioHook({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const labelAppear = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const lineAppears = hook.onscreenLines.map((_, i) =>
    spring({ frame: frame - 8 - i * 6, fps, config: { damping: 14, stiffness: 110 } })
  );

  return (
    <div style={{ ...containerCenter, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#9FE9DD",
          opacity: labelAppear,
          marginBottom: 36,
        }}
      >
        Scenario
      </div>
      {hook.onscreenLines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: TYPE.display,
            fontSize: fitHookTitle(line, TYPE.hookTitle - (i === 0 ? 0 : 14)),
            fontWeight: i === 0 ? 800 : 500,
            color: i === 0 ? "var(--ink)" : "var(--ink-soft)",
            opacity: lineAppears[i],
            transform: `translateY(${(1 - lineAppears[i]) * 18}px)`,
            textAlign: "center",
            padding: "0 40px",
            lineHeight: 1.1,
            letterSpacing: "-0.015em",
            marginBottom: 16,
            maxWidth: "100%",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

// ----------------- variant: quote -----------------

function QuoteHook({ hook, frame, fps }: { hook: HookVariant; frame: number; fps: number }) {
  const appear = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <div style={{ ...containerCenter, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: 200,
          color: "#9FE9DD",
          lineHeight: 0.6,
          opacity: appear * 0.55,
          marginBottom: 0,
          alignSelf: "flex-start",
          paddingLeft: 60,
        }}
      >
        “
      </div>
      {hook.onscreenLines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: TYPE.display,
            fontSize: fitHookTitle(line, TYPE.hookTitle - 6),
            fontWeight: 600,
            fontStyle: "italic",
            color: "var(--ink)",
            opacity: appear,
            transform: `translateY(${(1 - appear) * 12}px)`,
            textAlign: "center",
            padding: "0 60px",
            lineHeight: 1.2,
            marginBottom: 8,
            maxWidth: "100%",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

// ----------------- shared bits -----------------

// Safe areas tuned for IG Reels / TikTok overlay UI.
//   Top:    ~280 px reserved (status bar + IG header + SeriesChip top-left).
//   Bottom: ~380 px reserved (caption pill at bottom: 200 + IG action rail + handle).
const containerCenter: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  paddingTop: 280,
  paddingBottom: 380,
  paddingLeft: 80,
  paddingRight: 80,
};

/**
 * Auto-shrink a font size based on character count. Prevents the hero number
 * blowing past safe-area on long values like "EUR 60,000" or "1 in 4 expats".
 */
function fitHero(value: string, base: number): number {
  const overflow = Math.max(0, value.length - 6);
  return Math.max(72, Math.round(base - overflow * 9));
}

function Lines({ lines, appear, dark }: { lines: string[]; appear: number; dark: boolean }) {
  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: TYPE.ui,
            fontSize: fitHookTitle(line, TYPE.hookSub + 6),
            fontWeight: 700,
            color: "var(--ink)",
            opacity: appear,
            transform: `translateY(${(1 - appear) * 14}px)`,
            textAlign: "center",
            padding: "0 40px",
            lineHeight: 1.15,
            marginBottom: 6,
            maxWidth: "100%",
          }}
        >
          {line}
        </div>
      ))}
    </>
  );
}

/**
 * Auto-shrink for hook headline lines. Long lines (more than ~24 characters)
 * scale down 4 px per extra character, floor at 56 px so the smallest hook
 * line is still legible at swipe-distance.
 */
function fitHookTitle(line: string, base: number): number {
  const overflow = Math.max(0, line.length - 24);
  return Math.max(56, Math.round(base - overflow * 4));
}
