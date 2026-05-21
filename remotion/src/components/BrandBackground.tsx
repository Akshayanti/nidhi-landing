import type { CSSProperties } from "react";
import { BRAND, TYPE } from "../data";

/**
 * Theme tokens exposed as CSS variables on the BrandBackground root.
 *
 * Why CSS vars and not props/context? The reel composition has dozens of
 * hard-coded `BRAND.ink` references across BeatScene, KineticHook, CTAScene
 * etc. Threading a `variant` prop through every nested component would be
 * mechanically tedious and create a Discovery/Building branch in every
 * leaf. CSS variables give us one inversion point at the surface level: the
 * BrandBackground sets `--ink`, `--ink-soft`, etc. once, and any descendant
 * that reads `var(--ink)` automatically inverts when the variant flips.
 *
 * Convention applied across the reel:
 *   - "paper" variant: dark text on cream (the default editorial look)
 *   - "dark"  variant: cream text on deep navy (Discovery-track theme)
 *   - "warning" variant: dark text on amber-tinted cream (only used in
 *     hookcut/legacy paths; the unified Discovery theme keeps warning beats
 *     on dark too, with the amber accent line carrying the heads-up signal)
 *
 * Per-variant token derivation lives in `themeTokens()` below. Add a token
 * here when you find yourself reaching for a colour twice in BeatScene.
 */
type Variant = "paper" | "dark" | "warning";

interface ThemeTokens {
  ink: string;
  inkSoft: string;
  inkMuted: string;
  hairline: string;
  /** Vertical rules (compare-divider mini-bars). Tinted to match canvas. */
  rule: string;
  /** Inset card background (compare cards). Translucent over canvas. */
  cardBg: string;
}

function themeTokens(variant: Variant): ThemeTokens {
  if (variant === "dark") {
    return {
      ink: BRAND.paper,
      inkSoft: "rgba(250, 247, 242, 0.78)",
      inkMuted: "rgba(250, 247, 242, 0.55)",
      hairline: "rgba(250, 247, 242, 0.18)",
      rule: "rgba(250, 247, 242, 0.28)",
      cardBg: "rgba(255, 255, 255, 0.06)",
    };
  }
  // "paper" and "warning" share a paper-ink token set; warning differs only
  // in canvas tint. The amber accent itself is rendered explicitly via
  // BRAND.amber wherever it's used.
  return {
    ink: BRAND.ink,
    inkSoft: BRAND.inkSoft,
    inkMuted: BRAND.inkMuted,
    hairline: BRAND.hairline,
    rule: "rgba(0, 33, 113, 0.25)",
    cardBg: "rgba(255, 255, 255, 0.6)",
  };
}

const fontFace = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('${new URL("../assets/fonts/inter-latin.woff2", import.meta.url).href}') format('woff2');
}
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 300 500;
  font-display: swap;
  src: url('${new URL("../assets/fonts/roboto-latin.woff2", import.meta.url).href}') format('woff2');
}
`;

interface Props {
  /**
   * paper   = cream editorial (default; matches Series 2 carousel template)
   * dark    = deep navy ink for hook + CTA contrast frames AND the unified
   *           Discovery-track body theme
   * warning = subtle amber tint for warning beats (legacy; the Discovery
   *           unified theme keeps warning beats on dark with amber accents)
   */
  variant?: Variant;
  children?: React.ReactNode;
}

const baseStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "absolute",
  top: 0,
  left: 0,
  fontFamily: TYPE.ui,
  overflow: "hidden",
};

const paperStyle: CSSProperties = {
  ...baseStyle,
  // Subtle vignette: cream centre, warmer edge tint.
  background: `radial-gradient(ellipse at center, ${BRAND.paper} 0%, ${BRAND.paper} 60%, ${BRAND.paperDeep} 100%)`,
  color: BRAND.ink,
};

const darkStyle: CSSProperties = {
  ...baseStyle,
  // Editorial deep navy with very faint warm sheen at the bottom (not a sharp gradient).
  background: `linear-gradient(180deg, ${BRAND.ink} 0%, ${BRAND.ink} 70%, #001951 100%)`,
  color: BRAND.paper,
};

const warningStyle: CSSProperties = {
  ...baseStyle,
  background: `radial-gradient(ellipse at center, #FBF1EA 0%, #F5E4D4 100%)`,
  color: BRAND.ink,
};

/**
 * Subtle paper grain overlay using SVG noise. Renders at ~6% opacity so it
 * adds tactility without distracting from typography. Set `grain={false}`
 * to disable for animation-heavy beats.
 */
function GrainLayer() {
  const noise =
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.32 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${noise}`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url("${dataUrl}")`,
        backgroundSize: "220px 220px",
        opacity: 0.06,
        mixBlendMode: "multiply",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * Hairline rule top + bottom: gives the editorial Series-2 frame.
 * Matches the cream-paper carousel template (PLAYBOOK.md:128-176).
 */
function EditorialFrame({ inkColor }: { inkColor: string }) {
  return (
    <>
      <div style={{ position: "absolute", top: 56, left: 56, right: 56, height: 1, background: inkColor, opacity: 0.18 }} />
      <div style={{ position: "absolute", bottom: 56, left: 56, right: 56, height: 1, background: inkColor, opacity: 0.18 }} />
    </>
  );
}

export function BrandBackground({ variant = "paper", children }: Props) {
  const baseVariantStyle =
    variant === "dark" ? darkStyle :
    variant === "warning" ? warningStyle : paperStyle;
  const tokens = themeTokens(variant);
  const inkColor = tokens.ink;

  // CSS variables are merged onto the same style object so descendants that
  // read `var(--ink)` etc. resolve against this surface's theme. React's
  // typing rejects custom CSS-property keys on CSSProperties, so the cast
  // is intentional and narrowly scoped.
  const style: CSSProperties = {
    ...baseVariantStyle,
    ["--ink" as string]: tokens.ink,
    ["--ink-soft" as string]: tokens.inkSoft,
    ["--ink-muted" as string]: tokens.inkMuted,
    ["--hairline" as string]: tokens.hairline,
    ["--rule" as string]: tokens.rule,
    ["--card-bg" as string]: tokens.cardBg,
  };

  return (
    <div style={style}>
      <style>{fontFace}</style>
      {variant !== "dark" && <GrainLayer />}
      <EditorialFrame inkColor={inkColor} />
      {children}
    </div>
  );
}
