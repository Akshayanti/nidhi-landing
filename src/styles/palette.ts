/**
 * Color constants for JS/TS consumers.
 *
 * Mirror of the CSS constants in `global.css`. React/Recharts/etc. components
 * that pass colors as props (rather than via CSS) should import from here so
 * there is one source of truth across CSS and JS.
 *
 * Three families:
 *   PALETTE   — 10 brand identities × 2 (light/dark), from docs/color-palette.md
 *   NEUTRAL   — grayscale + surface neutrals
 *   SEMANTIC  — success/warning/danger/info, plus CTA + callout fills, plus
 *               status text variants and chart colors
 *
 * Whenever you add or change a value here, update the matching CSS constant
 * in `src/styles/global.css` (and vice versa).
 */

// ---------------------------------------------------------------------------
// Palette (brand identities)
// ---------------------------------------------------------------------------

export const PALETTE = {
  // On-white (light-mode foreground / on-light-bg). 10 identities.
  red:         '#991100',
  deepOrange:  '#8B2E00',
  amber:       '#6B4800',
  olive:       '#4A4A00',
  green:       '#004D1A',
  teal:        '#005B4F',
  cyan:        '#005566',
  blue:        '#0A3D8F',
  indigo:      '#1A237E',
  purple:      '#311B92',

  // On-#1E1E1E (dark-mode foreground / on-dark-bg). Same hue identity.
  redDark:        '#FF9E80',
  deepOrangeDark: '#FFAB91',
  amberDark:      '#FFCA28',
  oliveDark:      '#E6EE5C',
  greenDark:      '#81C784',
  tealDark:       '#80CBC4',
  cyanDark:       '#80DEEA',
  blueDark:       '#90CAF9',
  indigoDark:     '#D1C4E9',
  purpleDark:     '#E1BEE7',
} as const;

// ---------------------------------------------------------------------------
// Neutrals (grayscale + surfaces)
// ---------------------------------------------------------------------------

export const NEUTRAL = {
  white:         '#FFFFFF',
  offWhite:      '#F8F9FA',  // light page bg
  n25:           '#F5F5F5',  // subtle hover bg in light mode
  n50:           '#F0F0F0',  // subtle borders, code bg
  n100:          '#E8E8E8',  // light bg-dark surface
  n200:          '#E0E0E0',  // default light border
  n500:          '#9A9A9A',  // dark-mode muted text
  n600:          '#5A5A5A',  // light-mode muted text
  n700:          '#616161',  // light-mode secondary text
  n800:          '#B0B0B0',  // dark-mode secondary text
  n900:          '#212121',  // light-mode primary text
  nearBlack:     '#0D0D0D',
  pageBgDark:    '#121212',
  surfaceDark:   '#1E1E1E',
  surface2Dark:  '#2A2A2A',
  borderDark:    '#333333',

  preBgLight:    '#1e293b',
  preFgLight:    '#e2e8f0',
  preBgDark:     '#0D1117',
  preFgDark:     '#C9D1D9',
} as const;

// ---------------------------------------------------------------------------
// Semantic
// ---------------------------------------------------------------------------

export const SEMANTIC = {
  // Functional UI states (Material Design AA pairs).
  successLight: '#2E7D32',
  warningLight: '#F57C00',
  dangerLight:  '#C62828',
  infoLight:    '#0288D1',

  successDark:  PALETTE.greenDark,
  warningDark:  '#FFB74D',
  dangerDark:   '#EF9A9A',
  infoDark:     '#4FC3F7',

  // CTA fills (must hold white text).
  ctaBgLight:        '#00796B',
  ctaBgHoverLight:   PALETTE.teal,
  ctaBgDark:         '#00695C',
  ctaBgHoverDark:    '#00897B',

  // Destructive CTA — palette-derived.
  destructiveBg:        PALETTE.red,
  destructiveBgHover:   PALETTE.deepOrange,
  destructiveTextLight: '#c2410c',
  destructiveTextDark:  PALETTE.deepOrangeDark,

  // Callout (deep-blue fill that holds white text).
  calloutBg: '#0D47A1',

  // Status messaging on dark callout surfaces.
  statusSuccessOnDark: '#b2f2ea',
  statusErrorOnDark:   '#ffb3ad',
  statusErrorLight:    '#c0392b',

  // Notice background tints.
  noticeCautionBgLight: '#FFF8E1',
  noticeCautionBgDark:  '#3D3520',
  noticeDangerBgLight:  '#FFEBEE',
  noticeDangerBgDark:   '#3D2020',

  // Warning notice triplets (alert: bg + border + text).
  warningLightBg:           '#fff3cd',
  warningLightBorder:       '#ffe082',
  warningLightBorderStrong: '#ffc107',
  warningLightText:         '#665100',
  warningLightTextStrong:   '#856404',
  warningLightTextAmber:    '#ffc107',
  warningDarkBg:            '#332b00',
  warningDarkBorder:        '#664d00',
} as const;

// ---------------------------------------------------------------------------
// Chart palette
// ---------------------------------------------------------------------------

/**
 * Distinguishable color series for charts (currency tags, loan series,
 * persona badges, multi-series graphs). The first two slots reuse the
 * brand-blue + brand-teal CSS variables so they theme-flip to dark-mode
 * variants when [data-theme="dark"] is set. The remaining 9 are Material
 * Design picks chosen for distinguishability against each other and the
 * brand pair, returned as static hex (they don't theme-flip).
 *
 * On dark surfaces the saturated mid-tone hex values still read at AA
 * against #1E1E1E (verified per-color in the chart audit).
 */
export const CHART_SERIES = [
  'var(--color-deep-blue)', // 1: brand blue (theme-reactive)
  'var(--color-teal)',      // 2: brand teal (theme-reactive)
  '#E65100',                // 3: orange
  '#6A1B9A',                // 4: purple
  SEMANTIC.successLight,    // 5: green (#2E7D32)
  SEMANTIC.dangerLight,     // 6: red   (#C62828)
  '#1565C0',                // 7: blue (lighter hue than brand)
  '#6D4C41',                // 8: brown
  '#00838F',                // 9: cyan
  '#F9A825',                // 10: amber
  '#4A148C',                // 11: deep purple
] as const;

/**
 * Risk-level colors for the multi-currency net worth tool. Maps risk
 * categories to their visual signal. Functional uses the brand-teal CSS
 * variable so "your functional currency" theme-flips with the rest of
 * the brand; the rest are static semantic colors.
 */
export const RISK_COLORS = {
  functional: 'var(--color-teal)',
  low:        SEMANTIC.successLight,
  moderate:   '#F9A825',
  elevated:   SEMANTIC.dangerLight,
  'net-debt': SEMANTIC.dangerLight,
} as const;

/**
 * Persona badge colors. Each persona has a distinct identity color used
 * across the site (in-content badges, illustration tints, etc.).
 */
export const PERSONA_COLORS = {
  eva:    '#7B1FA2',
  petra:  '#00897B',
  jiri:   '#1565C0',
  marcus: '#E65100',
  tomas:  SEMANTIC.dangerLight,
} as const;
