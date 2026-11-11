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
  amberDark:      '#FFCC80',
  oliveDark:      '#E6EE5C',
  greenDark:      '#81C784',
  tealDark:       '#80CBC4',
  // Dark-mode teal for text, accents and charts: a step darker than
  // tealDark so it stays apart from blueDark on a dim screen. AA (5.6:1).
  tealMidDark:    '#26A69A',
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
 * Colour series for charts (loan offers, currencies). Every slot is a CSS
 * variable with a light and a dark value, defined in global.css
 * (--chart-1 to --chart-11), so a chart follows the theme. Each value is 3:1
 * or more against the card it is drawn on in its theme; the values and that
 * check live in CHART_SERIES_VALUES below and chartColors.test.ts.
 *
 * For lines, swatches and markers only, never for text: orange and cyan in
 * light are under 4.5:1. A series' name stands in neutral ink beside its
 * marker (src/components/chart/SeriesMarker.tsx).
 */
export const CHART_SERIES = [
  'var(--chart-1)',  // brand blue
  'var(--chart-2)',  // brand teal
  'var(--chart-3)',  // orange
  'var(--chart-4)',  // purple
  'var(--chart-5)',  // green
  'var(--chart-6)',  // red
  'var(--chart-7)',  // blue (lighter hue than brand)
  'var(--chart-8)',  // brown
  'var(--chart-9)',  // cyan
  'var(--chart-10)', // amber
  'var(--chart-11)', // deep purple
] as const;

/** The ink for a label or marker drawn on a shape filled with the same slot. */
export const CHART_SERIES_ON = CHART_SERIES.map((_, i) => `var(--chart-${i + 1}-on)`);

/**
 * What each slot resolves to, as [light, dark]. global.css holds the same
 * values (it cannot import this file); chartColors.test.ts fails if the two
 * drift apart or a value falls under 3:1 against its card.
 */
export const CHART_SERIES_VALUES: ReadonlyArray<readonly [string, string]> = [
  ['#0A3D8F', '#90CAF9'],
  ['#005B4F', '#26A69A'],
  ['#E65100', '#FFAB91'],
  ['#6A1B9A', '#E1BEE7'],
  ['#2E7D32', '#81C784'],
  ['#C62828', '#FF9E80'],
  ['#1565C0', '#D1C4E9'],
  ['#6D4C41', '#FFCC80'],
  ['#00838F', '#80DEEA'],
  ['#8A6100', '#E6EE5C'],
  ['#4A148C', '#CE93D8'],
];

/**
 * Risk levels in the net worth calculator: the guide's light and dark pairs,
 * as CSS variables (--risk-* in global.css). Each is the fill of a badge that
 * holds the word for the level, so the colour never stands alone.
 */
export const RISK_COLORS = {
  functional: 'var(--risk-functional)',
  low:        'var(--risk-low)',
  moderate:   'var(--risk-moderate)',
  elevated:   'var(--risk-elevated)',
  'net-debt': 'var(--risk-net-debt)',
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
