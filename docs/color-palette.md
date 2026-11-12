# Color Palette

> 5 level-identity pairs + 10-pair extended palette. All pairs share the same hue identity across light/dark modes. Every color meets WCAG AAA (≥ 8:1) on its respective background, with one deliberate exception: the dark-mode teal used for text, accents, charts and the Discovery level (`#26A69A`, AA at 5.6:1). See "Dark mode: lightness, not just hue" below.

**Last updated:** 2026-11-06

**One copy for both repos.** This file is nidhi's brand and colour guide for the site (this repo) and for the planner (`NetWorthAndExpenses`). The planner's `docs/brand/color-palette.md` points here; change the guide here, never there. The shared rules come first; then how each codebase implements them, and where the two differ today.

---

## Brand Identity

Who nidhi is for and how it speaks are in [`brand-identity.md`](brand-identity.md). This section covers the visual identity.

The nidhi brand identity is built from two palette colors used as a pair:

| Role | Light mode | Dark mode | Where you see it |
|------|------------|-----------|------------------|
| Primary | `#0A3D8F` palette blue | `#90CAF9` palette blue-dark | Wordmark "nidhi", logo background, primary buttons, headings |
| Accent | `#005B4F` palette teal | `#26A69A` palette teal-mid-dark (text, accents); `#80CBC4` palette teal-dark (logo accent dot) | Tagline "Money, understood", logo accent dot, link emphasis |

**Why blue + teal:** finance is conventionally rendered in blue (trust, depth). Teal is a sibling hue that pairs naturally with blue without competing, and signals warmth and approachability against the blue's authority. Both hues exist as palette identities at AAA contrast on their respective backgrounds, so the brand pair never falls below the contrast bar.

The brand uses these specific identity slots from the extended palette:
- `palette-blue` (slot 8) and `palette-blue-dark`
- `palette-teal` (slot 6) and `palette-teal-dark`

Other palette identities (red, amber, purple, etc.) are reserved for level identities, chart series, and semantic UI states. They are not part of the brand identity and should not be used as primary brand surfaces.

### Tagline

The tagline is "Money, understood". Each language has one approved line, kept in its catalog under `nav.tagline` (shown under the wordmark in the site header; on phones narrower than 520px, on its own line under the header) and `home.schema.slogan`, which a test keeps identical, and recorded, with the reasoning, in that language's glossary under `docs/i18n/`. Use it exactly as written wherever the tagline appears: under the wordmark in a logo lockup (set in the accent teal, regular weight, below "nidhi"), in image alt text, structured data and print. Never translate it afresh for one piece.

| Language | Tagline | Notes |
|----------|---------|-------|
| English | Money, understood | No full stop in a lockup or slogan. |
| Hindi | पैसे की समझ, एकदम सहज | Since 2026-11-06 (was पैसा, समझ आ गया।). No danda: the line has no verb. |
| Spanish | El dinero, entendido | |
| Czech | Peníze srozumitelně | |
| Marathi | पैशाची समज, एकदम सहज | Since 2026-11-06 (was पैसा, समजेल असा). No full stop: the line has no verb. |

The logo files under `public/brand/` and the social images under `public/brand/social/` carry the English line only.

---

## Buttons

One system, on the site and in the planner. Decided by the council and the owner on 2026-11-11 (issue #408). On the site the classes are `.btn` plus one role in `src/styles/global.css`; a component adds layout only.

| Role | Class | Light | Dark | Used for |
|------|-------|-------|------|----------|
| Primary | `.btn--primary` | fill `#0A3D8F`, white label | fill `#90CAF9`, dark surface label | The one filled main action of a page or section |
| Outline | `.btn--outline` | `#0A3D8F` label and edge | `#90CAF9` label and edge | Every other action. All of a tool's own actions (share, export, add a row, upload): a tool page has no filled button of its own |
| Quiet | `.btn--quiet` | `#3D3D3D` label, no visible edge | `#E0E0E0` label, no visible edge | Reset, cancel, not now |
| Danger | `.btn--danger` | `#991100` label and edge | `#FF9E80` label and edge | Removing or deleting, with a verb that says what |
| On the blue callout | `.btn--onCallout` | white fill and edge, `#0A3D8F` label | the same | The main action on the `#0D47A1` callout |

- **Every role:** 1rem, line-height 1.5, radius 8px, a 1.5px border (transparent on quiet), at least 44px tall with automatic height, padding 0.625rem 1rem. Labels wrap and are never cut. A link styled as a button stays a link.
- **Weight:** 700 on the main action, 600 on the others. No arrow.
- **Hover:** colours stay. The label underlines and a line appears inside the edge (2px on primary, 1px on outline and danger).
- **Disabled:** the role's colours stay, the border is dashed, nothing answers a hover, nothing fades. Native `disabled`, or `aria-disabled` on a link without `href` and on a button that must stay in the tab order.
- **Focus:** a 2px ring at 3px offset in teal, `#005B4F` in light and `#26A69A` in dark; `#80CBC4` on the blue callout.
- **Teal is not a button fill.** The filled teal buttons of before 2026-11 become blue.
- Icons on tool actions are a later change.

## Logo Design

The logo mark is a rounded square with three semantic regions:

1. **Background**: the rounded square fill
2. **Strokes**: the "n", "d", and arrow glyphwork (white in light mode, never used as brand text color elsewhere)
3. **Accent dot**: a small disc that punctuates the arrow, contrasting against the background

All three flip across light/dark modes so the mark stays AA-readable in both contexts. The brand identity is preserved because the *hue identity* of each region stays the same across modes (both background variants are palette-blue; both accent dots are palette-teal).

| Region | Light mode | Dark mode | Light contrast | Dark contrast |
|--------|------------|-----------|----------------|---------------|
| Background | `#0A3D8F` palette-blue | `#90CAF9` palette-blue-dark | n/a | n/a |
| Strokes | `#FFFFFF` neutral white | `#0A3D8F` palette-blue | 10.1:1 (AAA) | 5.8:1 (AA) |
| Accent dot | `#80CBC4` palette-teal-dark | `#005B4F` palette-teal | 5.4:1 (AA non-text) | 4.6:1 (AA non-text) |

**Contrast targets:** AA non-text contrast (3:1 minimum) for the strokes and the accent dot. The strokes themselves are decorative shape outlines, not text, so 3:1 applies; the accent dot is similarly a non-text decoration.

**Why the strokes flip in dark mode:** the previous design kept white strokes in both modes. White on `#90CAF9` is 1.75:1, which fails AA non-text contrast and renders muddy / washed out. Flipping the strokes to palette-blue gives 5.8:1 (AAA non-text) and matches the wordmark color, so the mark visually integrates with the surrounding UI.

**Why the accent dot flips:** the dot needs ≥ 3:1 against the background it sits on. `palette-teal-dark` (`#80CBC4`) gives 5.4:1 on the light-mode `palette-blue` background but only 1.07:1 on the dark-mode `palette-blue-dark` background. Inverting the pair, with `palette-teal` on `palette-blue-dark`, gives 4.6:1 in dark mode. Both modes pass AA without compromising hue identity.

The favicon SVG (`public/favicon.svg`) implements this flip with a `prefers-color-scheme` media query inside its inline `<style>`. Static brand-asset PNGs (`public/brand/logo/...`) are generated by `generate-brand-assets.sh`, which produces both `-light` and `-dark` variants of each size by remapping the three regions via ImageMagick.

In the planner, `frontend/public/favicon.svg` uses the same media query, and the in-app `<Logo>` component (`frontend/src/components/branding/Logo.tsx`) gets the same flip by binding the strokes to `theme.palette.primary.main` and the accent dot to `theme.palette.secondary.main`, both mode-aware through the MUI theme. The planner's static PNGs (`frontend/public/logo*.png`, `apple-touch-icon.png`) are deliberately single-tone: self-contained badges that contrast against themselves, not the launcher background.

---

## Blog Level Colors (5 pairs)

Used in: `src/styles/global.css` (`--level-*`), `LearningPath.tsx`, `LevelBadge.astro`, and future chart/graph components.

| # | Level | Light | On white | Dark | On #1E1E1E |
|---|-------|-------|----------|------|------------|
| 1 | discovery | `#005B4F` | 8.0:1 | `#26A69A` | 5.6:1 |
| 2 | building | `#0A3D8F` | 10.1:1 | `#90CAF9` | 9.5:1 |
| 3 | psychology | `#6B4800` | 8.2:1 | `#FFCC80` | 11.3:1 |
| 4 | optimizing | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 |
| 5 | mastery | `#311B92` | 12.3:1 | `#E1BEE7` | 10.1:1 |

Hue identity: `teal → blue → amber → red → purple`

---

## Dark mode: lightness, not just hue

On dark surfaces the pastel teal-dark (`#80CBC4`, L* 77), cyan-dark (`#80DEEA`, L* 83) and blue-dark (`#90CAF9`, L* 79) differ almost only in hue. On a dim screen hue is the first thing to go, so teal accents merged into blue headings, the first two chart series merged, and Discovery's badge looked like Building's.

Dark mode therefore uses `--palette-teal-mid-dark` (`#26A69A`, L* 62) for `--color-teal`, `--level-discovery` and `--chart-usd`: 17 L* below blue-dark, so the pair stays apart when dimmed and desaturated. It is 5.6:1 on `#1E1E1E` and 6.3:1 on `#121212`, so it passes AA for text but not AAA. Keeping AAA would mean making blue-dark paler, closer to the white body text, which costs links more than it gains. The logo accent dot keeps `#80CBC4` (brand mark, non-text).

Rule for new dark-mode colours that sit next to each other: at least about 12 L* apart, not hue alone.

---

## Extended Palette (10 pairs)

For charts, graphs, and any visualization needing more than 5 distinguishable colors. Every pair maintains consistent hue identity across light/dark modes.

| # | Name | Light | On white | Dark | On #1E1E1E |
|---|------|-------|----------|------|------------|
| 1 | red | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 |
| 2 | deep-orange | `#8B2E00` | 8.4:1 | `#FFAB91` | 9.1:1 |
| 3 | amber | `#6B4800` | 8.2:1 | `#FFCC80` | 11.3:1 |
| 4 | olive | `#4A4A00` | 9.3:1 | `#E6EE5C` | 13.3:1 |
| 5 | green | `#004D1A` | 10.1:1 | `#81C784` | 8.3:1 |
| 6 | teal | `#005B4F` | 8.1:1 | `#80CBC4` | 8.9:1 |
| 7 | cyan | `#005566` | 8.4:1 | `#80DEEA` | 10.8:1 |
| 8 | blue | `#0A3D8F` | 10.1:1 | `#90CAF9` | 9.5:1 |
| 9 | indigo | `#1A237E` | 13.2:1 | `#D1C4E9` | 10.2:1 |
| 10 | purple | `#311B92` | 12.3:1 | `#E1BEE7` | 10.1:1 |

These are the site's 10 palette pairs. The planner uses the same identities for slots 1 to 10, with a different dark amber value (see "Where the site and the planner differ today"), and adds slots 11 to 20 (see "In the planner" below).

Interactive viewer: `docs/brand/color-palette-viewer.html` in the planner repo (open it in a browser to change colors and see live WCAG ratios; it shows all 20 pairs).

---

## Design Constraints

- **8:1 minimum**: every color passes WCAG AAA for normal text on its intended background (white for light mode, `#1E1E1E` for dark mode).
- **Same hue across modes**: a level's dark-mode color is the lighter equivalent of its light-mode color, so users recognize the same identity after switching themes.
- **Distinguishable**: hues are spread across the spectrum. Adjacent pairs may have similar luminance (unavoidable at 8:1), but hue differences plus numbered labels plus text identifiers provide redundant identification.
- **Reusable**: these pairs are the single source of truth for level badges, learning path waypoints, progress bars, chart lines and graph segments on the site, and for chart series, FIRE category bars, projection lines, asset comparison series, semantic alerts and brand surfaces in the planner.
- **AA for brand combinations**: when two palette colors are used together (for example the logo accent dot on the logo background), the lower AA bar applies because the palette doc only guarantees AAA against neutral backgrounds (white or `#1E1E1E`), not against other palette colors.

---

## On the site (nidhi-landing)

### Source of Truth

Every color literal in the codebase lives in one of two files. Components consume tokens from these files, never raw hex.

| File | Format | Consumed by |
|------|--------|-------------|
| `src/styles/global.css` | CSS custom properties (`--palette-*`, `--neutral-*`, `--semantic-*`, theme-reactive `--color-*`) | All `.astro` and `.css` styling |
| `src/styles/palette.ts` | TypeScript constants (`PALETTE`, `NEUTRAL`, `SEMANTIC`, `CHART_SERIES`, `RISK_COLORS`, `PERSONA_COLORS`) | All `.tsx` files and `.astro` frontmatter |

Both files mirror each other. **Update both together** when palette values change.

Two non-CSS surfaces also keep literal copies because they cannot consume CSS variables:

| File | Why literals are kept |
|------|------------------------|
| `public/favicon.svg` | SVGs loaded via `<link rel="icon">` cannot inherit document CSS variables. Hex literals stay; each value carries an inline comment naming the palette identity it mirrors. |
| `generate-brand-assets.sh` | Bash script. Palette constants live at the top of the script and feed every downstream variant. |

---

### Material Design and Off-Palette Colors

The codebase contains a small set of off-palette literals, defined as named constants in `global.css` and `palette.ts`. They are **intentional** and serve specific purposes outside the brand identity:

| Family | Examples | Why off-palette |
|--------|----------|------------------|
| Semantic UI states | `--semantic-success-light` `#2E7D32`, `--semantic-warning-light` `#F57C00`, `--semantic-danger-light` `#C62828`, `--semantic-info-light` `#0288D1` | Material Design conventions. Users expect specific hues for success / warning / danger / info; mapping these to palette colors loses widely-recognised UI signals. |
| CTA + callout backgrounds | `--semantic-cta-bg-*` `#00796B` etc., `--semantic-callout-bg` `#0D47A1` | Solid surfaces tuned to hold white text at AA. Currently mid-tone Material colors; could be palette teal/blue but at a noticeable visual shift. |
| Pastel notice / status tints | `--notice-caution-bg-light` `#FFF8E1`, `--warning-light-bg` `#fff3cd`, `--status-success-on-dark` `#b2f2ea`, etc. | The palette has no pastel colors by design (pastels can't reach AAA contrast on white). Pastel alert backgrounds and light-on-dark status text need values outside the palette. |
| Chart series | `--chart-1` to `--chart-11` (`CHART_SERIES`) | Eleven slots, each a light and dark pair. The light values are mid-tones (several are Material Design picks, so that eleven lines stay apart on white); the dark values are the palette's pastel partners. See "Chart series, risk scale and figure inks" below. |
| Persona identity colors | `PERSONA_COLORS.eva` `#7B1FA2`, `PERSONA_COLORS.petra` `#00897B`, etc. | Distinct identity hues for in-content persona badges. Could be palette but the personas predate the palette and are tuned for inline visibility. |

**Policy:** off-palette colors are acceptable only when they live as named constants in `global.css` or `palette.ts`, not as inline literals in components. Any new off-palette value must be:

1. Added as a named constant in the appropriate source-of-truth file
2. Tied to a specific use case (state, notice, chart slot, persona, etc.)
3. AA-checked against its actual background

If a new color can be a palette identity instead of an off-palette constant, prefer the palette identity. The most common acceptable reasons to go off-palette are: a Material Design semantic convention (`success`/`warning`/`danger`/`info`), a pastel surface that the palette cannot provide, or a chart series slot beyond slot 10.

---

### How to Use

#### Two layers

The CSS in `global.css` defines two layers:

```
constants (raw hex)              theme-reactive aliases
----------------                 ---------------------
--palette-blue: #0A3D8F      →   --color-deep-blue, --level-building
--palette-blue-dark: #90CAF9 →   (same tokens, dark mode)
--palette-teal: #005B4F      →   --color-teal, --level-discovery
...etc
```

Components consume the **theme-reactive aliases** (`--color-*`, `--level-*`) so dark-mode swaps work automatically. The raw `--palette-*` constants are referenced only by the alias layer; consume them directly only when you need a hex value that should *not* flip across themes.

#### In CSS

```css
/* Recommended: theme-reactive token */
color: var(--level-discovery);     /* palette-teal in light, palette-teal-dark in dark */

/* When you need a static palette identity that doesn't theme-flip */
border-left: 4px solid var(--palette-blue);   /* always #0A3D8F */
```

#### In JavaScript / React / Astro frontmatter

```ts
import { PALETTE, CHART_SERIES, RISK_COLORS } from '../styles/palette.ts';

const swatch = PALETTE.teal;            // '#005B4F' (light-mode value)
const series = CHART_SERIES;            // 11 entries, each 'var(--chart-N)' (theme-reactive)
const risk   = RISK_COLORS.functional;  // 'var(--risk-functional)' (theme-reactive)
```

For chart and risk colors, use the exported arrays / objects rather than picking individual `PALETTE.*` slots, so a future palette reshuffle is a one-file change.

#### Chart series, risk scale and figure inks

Agreed by the three-model council on 2026-11-10 and by the owner on 2026-11-11. Three rules hold for every chart and figure on the site:

1. **Every colour is a light and dark pair.** Nothing keeps its light value on a dark card.
2. **Series colours are for lines, slices, swatches and markers, never for text.** They are held to 3:1 against the card and the page (WCAG 1.4.11), not to 4.5:1; orange and cyan in light are under 4.5:1. A name or a number is written in neutral ink. A label drawn on a filled shape uses that fill's ink token.
3. **Colour is never the only difference** (WCAG 1.4.1). Each series has a marker shape and, on a line chart, a line style; a risk colour always holds the word for its level.

**Chart series** (`--chart-N` in `global.css`, `CHART_SERIES` in `palette.ts`; `src/styles/chartColors.test.ts` checks the ratios and that the two files agree):

| Slot | Light | Dark | Marker | Line |
|------|-------|------|--------|------|
| 1 brand blue | `#0A3D8F` | `#90CAF9` | circle | solid |
| 2 brand teal | `#005B4F` | `#26A69A` | square | solid |
| 3 orange | `#E65100` | `#FFAB91` | triangle | solid |
| 4 purple | `#6A1B9A` | `#E1BEE7` | diamond | solid |
| 5 green | `#2E7D32` | `#81C784` | cross | solid |
| 6 red | `#C62828` | `#FF9E80` | circle, outlined | dashed |
| 7 blue | `#1565C0` | `#D1C4E9` | square, outlined | dashed |
| 8 brown | `#6D4C41` | `#FFCC80` | triangle, outlined | dashed |
| 9 cyan | `#00838F` | `#80DEEA` | diamond, outlined | dashed |
| 10 amber | `#8A6100` | `#E6EE5C` | cross in a ring | dashed |
| 11 deep purple | `#4A148C` | `#CE93D8` | plus | dotted |

The markers are drawn by `src/components/chart/SeriesMarker.tsx` and appear on the chart, in its legend and beside the series' name wherever that name stands (a card heading, a tab). The loan comparison, which shows at most five offers, keeps a line style of its own for each of the five as well. `--chart-N-on` is the ink for a label or marker drawn on slot N: white in light (dark on orange, where white is 3.8:1), `#121212` in dark.

**Risk scale** (`--risk-*`, `RISK_COLORS`): palette pairs, each the fill of a badge that holds the word, in `--risk-on` (white in light, `#121212` in dark; 7:1 or more on every fill).

| Level | Light | Dark |
|-------|-------|------|
| functional | `#005B4F` teal | `#80CBC4` |
| low | `#004D1A` green | `#81C784` |
| moderate | `#6B4800` amber | `#FFCC80` |
| elevated | `#8B2E00` deep orange | `#FFAB91` |
| net debt | `#991100` red | `#FF9E80` |
| no band | `#3D3D3D` neutral 850 | `#B0B0B0` neutral 800 |

"No band" is not a step on the scale: it is the neutral for a position that cannot be given a level (net worth of zero or less), so it carries no hue.

**Figure and chart inks.** In lesson figures: `--fig-on-fill` (white in light, `#121212` in dark) for a label on a filled shape; `--fig-on-warn` (`#121212` in both) for a label on orange, which never holds white (2.7:1); `--fig-text-warn` (`#8B2E00` in light) for orange text on the page; `--fig-outline` (`#595959` / `#BDBDBD`) round a fill that is under 3:1 against the page. `scripts/lint-figures.mjs` enforces them. The tools' charts use the same values as `--chart-on-warn`, `--chart-text-warn` and `--chart-outline-warn`.

#### Adding a new level

1. Pick an unused pair from the extended palette (or add a new pair to the 10).
2. Add the level alias in `src/styles/global.css` under both `:root` and `[data-theme="dark"]`, referencing the appropriate `--palette-*` constant. Do not paste a raw hex.
3. Add the level to the enum in `src/content.config.ts`.
4. Add the level meta in `src/components/LearningPath.tsx` and `LevelBadge.astro`.
5. Update this document.

#### Adding a new brand color or chart slot

1. If the new color is a palette identity (saturated, AAA on white / `#1E1E1E`): add it to the palette table above and to `--palette-*` in `global.css` + `PALETTE` in `palette.ts`.
2. If the new color is off-palette (a Material semantic state, a pastel, an extra chart slot): add it as a named constant under the appropriate family (`--semantic-*`, `--notice-*`, `CHART_SERIES`, etc.) in `global.css` or `palette.ts`. Document the reason inline.
3. Verify AA contrast against the actual background it will sit on.
4. Never inline a hex literal in a component. If you need a one-off color, add it to the source-of-truth file first.

---

## In the planner (NetWorthAndExpenses)

Paths in this section are in the `NetWorthAndExpenses` repo.

### Extended Palette (20 pairs) — Primary for Charts, Graphs & Figures

**This is the primary palette.** Every chart, graph, figure, and multi-series visualization in the nidhi app pulls its colors from these 20 pairs. Slots 1–10 are mirrored from `nidhi-landing/src/styles/palette.ts`. Slots 11–20 are app-side additions designed to fill hue gaps and to support up to 20 simultaneously distinguishable series.

All 20 pairs are AAA-verified by `frontend/scripts/palette-verify.mjs` for contrast on both backgrounds and CIEDE2000 distinguishability under normal vision and three CVD simulations.

| # | Name | Light | On white | Dark | On #1E1E1E | Source |
|---|------|-------|----------|------|------------|--------|
| 1 | red | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 | nidhi-landing |
| 2 | deep-orange | `#8B2E00` | 8.4:1 | `#FFAB91` | 9.1:1 | nidhi-landing |
| 3 | amber | `#6B4800` | 8.2:1 | `#FFCA28` | 10.9:1 | nidhi-landing |
| 4 | olive | `#4A4A00` | 9.3:1 | `#E6EE5C` | 13.3:1 | nidhi-landing |
| 5 | green | `#004D1A` | 10.1:1 | `#81C784` | 8.3:1 | nidhi-landing |
| 6 | teal | `#005B4F` | 8.1:1 | `#80CBC4` | 8.9:1 | nidhi-landing |
| 7 | cyan | `#005566` | 8.4:1 | `#80DEEA` | 10.8:1 | nidhi-landing |
| 8 | blue | `#0A3D8F` | 10.1:1 | `#90CAF9` | 9.5:1 | nidhi-landing |
| 9 | indigo | `#1A237E` | 13.2:1 | `#D1C4E9` | 10.2:1 | nidhi-landing |
| 10 | purple | `#311B92` | 12.3:1 | `#E1BEE7` | 10.1:1 | nidhi-landing |
| 11 | rose | `#8C0852` | 9.2:1 | `#FFB1D8` | 9.9:1 | app |
| 12 | magenta | `#7B0E80` | 9.5:1 | `#F0BFE8` | 10.6:1 | app |
| 13 | violet | `#5C2BB3` | 8.6:1 | `#D7C2E8` | 10.1:1 | app |
| 14 | sky | `#003F66` | 11.0:1 | `#BDDFF5` | 11.9:1 | app |
| 15 | navy | `#1A2659` | 14.3:1 | `#AEB7DE` | 8.4:1 | app |
| 16 | mint | `#125B30` | 8.2:1 | `#A8E6BC` | 11.7:1 | app |
| 17 | lime | `#465300` | 8.4:1 | `#D5E075` | 11.7:1 | app |
| 18 | gold | `#634006` | 9.3:1 | `#E8B85A` | 9.1:1 | app |
| 19 | tan | `#704528` | 8.2:1 | `#EFC8A6` | 10.7:1 | app |
| 20 | coral | `#8E1F33` | 8.8:1 | `#FFAFA8` | 9.5:1 | app |

#### Tiered cycles (5 / 10 / 15 / 20)

A single 20-slot cycle has a hidden cost: charts with only 3-4 series end up using a sub-cycle of the same desaturated palette as charts with 18-20 series. To keep small charts vivid and large charts coverage-complete, `getChartColorPalette()` selects from **four tiered cycles**:

| Tier | Slots | When used | Selection |
|------|-------|-----------|-----------|
| 5    | 5     | charts with ≤ 5 series  | brand pair (blue, teal) pinned + top-3 by Lab chroma C* |
| 10   | 10    | 6-10 series             | tier 5 + next 5 by chroma |
| 15   | 15    | 11-15 series            | tier 10 + next 5 |
| 20   | 20    | 16-20 series (or more, with wrap) | full palette |

**Tier membership is cumulative**: every slot in tier N also appears in tier N+1. The cycle order changes between tiers, though, so a chart that crosses a tier boundary (4 series growing to 6, say) can reassign the colours of its existing series. The brand pair (blue, teal) is pinned to tier 1 so charts of every size show the brand identity.

##### Cycle orders

| Tier | Cycle |
|------|-------|
| 5    | blue → lime → red → amber → teal |
| 10   | lime → blue → deepOrange → gold → olive → teal → red → amber → rose → green |
| 15   | amber → blue → coral → gold → magenta → mint → deepOrange → purple → olive → tan → teal → red → lime → rose → green |
| 20   | green → blue → rose → red → cyan → purple → gold → mint → magenta → deepOrange → olive → violet → sky → tan → teal → navy → amber → coral → indigo → lime |

Each tier wraps circularly (last slot is adjacent to first).

#### Adjacency rule

Each tier's cycle satisfies the **window-of-3 adjacency rule** on its own pool: in any 3 consecutive slots of the cycle, every pair is visually distinguishable. Concretely, for a series ABCD the cycle guarantees:

- B differs from A and C
- C differs from B and D

…and the constraint holds **circularly** so the wrap point also satisfies it. The order was generated by simulated annealing over the CIEDE2000 distance matrix computed in normal vision and under deuteranopia, protanopia, and tritanopia simulation.

##### Residual violations per tier

The constraint is hard to satisfy perfectly when the slot pool is small (more pairs forced to be near-adjacent), so each tier has a structural floor of residual mode × CVD collisions:

| Tier | Residual score | Notes |
|------|----------------|-------|
| 5    | 4.5 | red↔amber and lime↔red collide under protan/deutan |
| 10   | 7.5 | + deepOrange↔gold under deutan |
| 15   | 7   | + tan↔red, deepOrange↔olive under CVD |
| 20   | 5.5 | + cyan↔purple under deutan dark mode |

Normal-vision adjacency is fully satisfied at every tier. The residuals only affect specific CVD readers in specific pairings, where chart legends and labels provide redundant identification cues.

##### Regeneration

To regenerate the cycles (e.g. after adding new slots or changing hex values):

```
node frontend/scripts/palette-verify.mjs --search-tiers
```

To diagnose inherently collision-prone pairs (those with at least one mode × CVD violation regardless of cycle position):

```
node frontend/scripts/palette-verify.mjs --diagnose
```

To inspect the chroma ranking (used to assign tier membership):

```
node frontend/scripts/palette-verify.mjs --tier-rank
```

#### Visual reference

`docs/brand/color-palette-viewer.html` renders all 20 pairs side-by-side in light and dark mode with WCAG ratios, **all four tier cycles**, sample pie charts at counts spanning each tier's range, and a multi-line plot. Open it in a browser; it has no dependencies.

---

### Semantic UI Color Mapping

UI semantic colors (error, warning, success, info) are mapped from the extended palette so they share the same hue identity and WCAG AAA contrast guarantees. These are used for alerts, badges, form validation, and status indicators — every consumer pulls from `theme.palette.{error,warning,success,info}.main`.

| Role | Palette name | Light | On white | Dark | On #1E1E1E |
|------|--------------|-------|----------|------|------------|
| error | red | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 |
| warning | amber | `#6B4800` | 8.2:1 | `#FFCA28` | 10.9:1 |
| success | green | `#004D1A` | 10.1:1 | `#81C784` | 8.3:1 |
| info | cyan | `#005566` | 8.4:1 | `#80DEEA` | 10.8:1 |

For UI elements that need lighter/darker variants (hover states, decorative surfaces), derive them from the same hue family while maintaining ≥ 4.5:1 (AA) for large text and ≥ 7:1 (AAA) for body text. The MUI `light`/`dark` shade variants in `frontend/src/theme/theme.ts` are sourced this way.

### Source of Truth

Every color literal in the codebase lives in one of two files. Components consume tokens from these files, never raw hex.

| File | Format | Consumed by |
|------|--------|-------------|
| `frontend/src/theme/colorPalette.ts` | TypeScript constants (`EXTENDED_PALETTE`, `chartColors`, `getChartColor`, `getChartColorPalette`, `FIRE_CATEGORY_COLORS`, `ASSET_COMPARISON_COLORS`, `PROJECTION_SERIES_COLORS`) | All chart, graph, and figure components |
| `frontend/src/theme/theme.ts` | MUI theme palette (`brandColors`, `darkSemanticColors`) | All MUI components via `theme.palette.*` |

Both files mirror each other and pull their hex values from the same palette definition. **Update both together** when palette values change.

Two non-CSS surfaces also keep literal copies because they cannot consume runtime CSS variables or imports:

| File | Why literals are kept |
|------|------------------------|
| `frontend/public/favicon.svg` | SVGs loaded via `<link rel="icon">` cannot inherit document CSS variables. Hex literals stay; each value carries an inline comment naming the palette identity it mirrors. The file uses a `prefers-color-scheme` media query inside its inline `<style>` to flip across modes. |
| `frontend/index.html` (`theme-color`), `frontend/public/manifest.json` and `site.webmanifest` (`theme_color`) | Browser chrome color must be a single literal. Pinned to `#0A3D8F` palette-blue. |

---

### Material Design and Off-Palette Colors

The codebase contains a small set of off-palette literals, defined as named MUI theme variants in `theme.ts`. They are **intentional** and serve specific purposes outside the brand identity:

| Family | Examples | Why off-palette |
|--------|----------|------------------|
| MUI shade variants | `primary.light` `#5472D3`, `primary.dark` `#002171`, `secondary.light` `#4EBAAA`, `success.light` `#60AD5E`, `warning.light` `#FFB74D`, `error.light` `#FF6659`, `info.light` `#5EB8FF` | Hover/active/disabled states, alert backgrounds. The palette doc allows hue-family derivatives at ≥ 4.5:1 AA for these decorative roles. Mapping every shade to a palette pair would force every hover state to change hue. |
| Neutral grey scale | `grey.50` … `grey.900` | Material Design's neutral scale. The palette has no neutrals by design (every palette pair is a saturated hue identity); greys live separately. |
| Background surfaces | `background.default` `#F8F9FA` (light), `#121212` (dark); `background.paper` `#FFFFFF` (light), `#1E1E1E` (dark) | Material Design recommended canvas/paper colors. The palette doc explicitly bases AAA contrast against `#FFFFFF` and `#1E1E1E`, so these values are the contrast reference, not palette identities. |

**Policy:** off-palette colors are acceptable only when they live as named MUI theme constants in `theme.ts`, not as inline literals in components. Any new off-palette value must be:

1. Added as a named constant under the appropriate MUI palette role (`primary.light`, `success.dark`, etc.)
2. Tied to a specific use case (hover state, surface, neutral)
3. AA-checked against its actual background

If a new color can be a palette identity instead of an off-palette constant, prefer the palette identity. The most common acceptable reasons to go off-palette are: a Material Design semantic shade variant (hover/active), a neutral grey, or a canvas surface.

---

### How to Use

#### Two layers

The TypeScript code in `colorPalette.ts` defines two layers:

```
constants (raw hex pair)        mode-aware accessor
----------------------          --------------------
EXTENDED_PALETTE.blue       →   getChartColor(chartColors.blue, mode)
  { light: '#0A3D8F',           ↑ returns '#0A3D8F' or '#90CAF9'
    dark:  '#90CAF9' }          ↑ depending on theme.palette.mode
```

Components consume the **mode-aware accessors** (`getChartColor`, `getChartColorPalette`, MUI's `theme.palette.*`) so dark-mode swaps work automatically. Reach for the raw `EXTENDED_PALETTE.{name}.{light|dark}` constants only when you need a hex value that should *not* flip across themes (rare — almost always, you want the mode-aware accessor).

#### In TypeScript / React

```ts
import { useTheme } from '@mui/material';
import {
  getChartColor,
  getChartColorPalette,
  chartColors,
  PROJECTION_SERIES_COLORS,
  FIRE_CATEGORY_COLORS,
} from 'theme/colorPalette';

const theme = useTheme();
const mode = theme.palette.mode;

// Single chart series — mode-aware
const lineColor = getChartColor(chartColors.blue, mode);

// Multi-series chart — N mode-aware colors in cycling order
const palette = getChartColorPalette(4, mode);
// → ['#0A3D8F', '#6B4800', '#004D1A', '#311B92'] in light mode

// Domain-specific groupings — preferred over picking individual slots
const targetColor = getChartColor(PROJECTION_SERIES_COLORS.target, mode);
const fireBarColor = FIRE_CATEGORY_COLORS.lean;
```

For chart, projection, FIRE, and comparison colors, use the exported constants (`PROJECTION_SERIES_COLORS`, `FIRE_CATEGORY_COLORS`, `ASSET_COMPARISON_COLORS`) rather than picking individual `EXTENDED_PALETTE.*` slots, so a future palette reshuffle is a one-file change.

#### In MUI components

```tsx
// Semantic colors flow through the MUI theme — automatically mode-aware
<Alert severity="error" />              // theme.palette.error.main
<Chip color="warning" />                // theme.palette.warning.main
<Button color="primary" variant="contained" />  // theme.palette.primary.main

// Brand gradients — pull from theme, never hardcode hex
sx={{
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
}}
```

#### Adding a new chart series or figure color

1. Does an existing extended-palette pair already fit? Reuse it — do not add a one-off hex. Most domain groupings (FIRE, projection, asset comparison) should be built by *referencing* existing pairs, not adding new ones.
2. If you genuinely need a new hue (e.g. a 12th distinguishable chart slot), add it to the extended palette table above AND to `EXTENDED_PALETTE` in `frontend/src/theme/colorPalette.ts`. Both must be updated together.
3. Verify ≥ 8:1 contrast on both backgrounds (`#FFFFFF` light, `#1E1E1E` dark) using a contrast checker.
4. Verify the new pair stays distinguishable under deuteranopia, protanopia, and tritanopia simulation.
5. Update this document.

#### Adding a new domain grouping

If you need a new named grouping (e.g. `LIABILITY_CATEGORY_COLORS`), add it to `colorPalette.ts` as a constant that *references* existing `EXTENDED_PALETTE` slots — do not paste raw hex literals into the new constant. Example:

```ts
export const LIABILITY_CATEGORY_COLORS = {
  mortgage: EXTENDED_PALETTE.indigo.light,
  loan: EXTENDED_PALETTE.deepOrange.light,
  credit: EXTENDED_PALETTE.red.light,
};
```

This way a future palette reshuffle propagates automatically and the grouping never drifts from the source of truth.

---

## Where the site and the planner differ today

Recorded so neither codebase is "corrected" to the other by accident. Bringing them together is a decision of its own, with a code change in the repo that moves.

| What | Site (`global.css`, `palette.ts`) | Planner (`colorPalette.ts`, `theme.ts`) |
|------|-----------------------------------|------------------------------------------|
| Dark-mode teal for text and accents | `#26A69A` palette teal-mid-dark (AA, see "Dark mode: lightness, not just hue") | `#80CBC4` palette teal-dark |
| Dark-mode Discovery level | `#26A69A` | `#80DEEA` (the planner shows no level badges today) |
| Dark-mode amber (slot 3; the planner's warning colour) | `#FFCC80` | `#FFCA28` |
| Chart series | 11 slots with markers and line styles (`--chart-N`, see "Chart series, risk scale and figure inks") | 20-pair extended palette in tiered cycles |
| Number of palette pairs | 10 | 20 (slots 11 to 20 are planner additions, documented above) |
| Semantic UI colours | Material Design states, off-palette (`--semantic-*`) | Mapped onto palette pairs (red, amber, green, cyan) |
