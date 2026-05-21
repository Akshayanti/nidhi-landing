import { BRAND, TYPE } from "../data";

interface Props {
  level: "discovery" | "building";
  /** 1-indexed episode number within the series. */
  episode: number;
  /** Total episodes in the series. */
  total: number;
  /** Topic anchor in CAPS (e.g. "EMERGENCY FUNDS"). 1-3 words. */
  topicChip: string;
  /** Override the series display name. Defaults: "BASICS SERIES" / "BUILDING SERIES". */
  label?: string;
  /** When dark = true, inverts colours for dark backgrounds (hook, CTA). */
  dark?: boolean;
}

const DEFAULT_LABEL: Record<Props["level"], string> = {
  discovery: "BASICS SERIES",
  building: "BUILDING SERIES",
};

/**
 * Persistent series + topic anchor rendered TOP-LEFT on every frame of every
 * reel. Placed top-left because top-right collides with Instagram's profile
 * follow button on Reels (~120px right inset).
 *
 * Two lines:
 *   1. "BASICS SERIES · 08 / 16"   (small caps, hairline-spaced)
 *   2. "EMERGENCY FUNDS"           (heavier, slightly larger; the topic anchor)
 *
 * The two-line composition makes the series + episode + topic legible in
 * one glance without burning hook narration time. (Spoken series anchoring
 * costs the 0–3s completion-rate window — see PLAYBOOK.md:687).
 */
export function SeriesChip({
  level,
  episode,
  total,
  topicChip,
  label,
  dark = false,
}: Props) {
  const seriesText = label ?? DEFAULT_LABEL[level];

  const fg = dark ? BRAND.paper : BRAND.ink;
  const accentFg = dark ? "#9FE9DD" : BRAND.teal;
  const fgSoft = dark ? "rgba(250,247,242,0.62)" : "rgba(0,33,113,0.55)";
  const stripeColor = dark ? "rgba(159,233,221,0.85)" : BRAND.teal;

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        zIndex: 4,
      }}
    >
      {/* Top line: SERIES NAME · EPISODE NUMBER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingLeft: 14,
          borderLeft: `4px solid ${stripeColor}`,
        }}
      >
        <span
          style={{
            fontFamily: TYPE.ui,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.22em",
            color: accentFg,
          }}
        >
          {seriesText}
        </span>
        <span
          style={{
            fontFamily: TYPE.ui,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.10em",
            color: fgSoft,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          · {String(episode).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* Bottom line: TOPIC ANCHOR */}
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "0.10em",
          color: fg,
          paddingLeft: 18,
          maxWidth: 720,
          lineHeight: 1.05,
          textTransform: "uppercase",
        }}
      >
        {topicChip}
      </div>
    </div>
  );
}
