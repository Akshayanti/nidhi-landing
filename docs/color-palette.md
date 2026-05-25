# Color Palette

> 5 level-identity pairs + 10-pair extended palette. All pairs share the same hue identity across light/dark modes. Every color meets WCAG AAA (≥ 8:1) on its respective background.

**Last updated:** 2026-05-25

---

## Blog Level Colors (5 pairs)

Used in: `src/styles/global.css` (`--level-*`), `LearningPath.tsx`, `LevelBadge.astro`, and future chart/graph components.

| # | Level | Light | On white | Dark | On #1E1E1E |
|---|-------|-------|----------|------|------------|
| 1 | discovery | `#005B4F` | 8.0:1 | `#80DEEA` | 10.8:1 |
| 2 | building | `#0A3D8F` | 10.1:1 | `#90CAF9` | 9.5:1 |
| 3 | psychology | `#6B4800` | 8.2:1 | `#FFCA28` | 10.9:1 |
| 4 | optimizing | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 |
| 5 | mastery | `#311B92` | 12.3:1 | `#E1BEE7` | 10.1:1 |

Hue identity: `teal → blue → amber → red → purple`

---

## Extended Palette (10 pairs)

For charts, graphs, and any visualization needing more than 5 distinguishable colors. Every pair maintains consistent hue identity across light/dark modes.

| # | Name | Light | On white | Dark | On #1E1E1E |
|---|------|-------|----------|------|------------|
| 1 | red | `#991100` | 8.6:1 | `#FF9E80` | 8.3:1 |
| 2 | deep-orange | `#8B2E00` | 8.4:1 | `#FFAB91` | 9.1:1 |
| 3 | amber | `#6B4800` | 8.2:1 | `#FFCA28` | 10.9:1 |
| 4 | olive | `#4A4A00` | 9.3:1 | `#E6EE5C` | 13.3:1 |
| 5 | green | `#004D1A` | 10.1:1 | `#81C784` | 8.3:1 |
| 6 | teal | `#005B4F` | 8.1:1 | `#80CBC4` | 8.9:1 |
| 7 | cyan | `#005566` | 8.4:1 | `#80DEEA` | 10.8:1 |
| 8 | blue | `#0A3D8F` | 10.1:1 | `#90CAF9` | 9.5:1 |
| 9 | indigo | `#1A237E` | 13.2:1 | `#D1C4E9` | 10.2:1 |
| 10 | purple | `#311B92` | 12.3:1 | `#E1BEE7` | 10.1:1 |

Interactive viewer: `color-palette-viewer.html` (open in browser to mutate colors and see live WCAG ratios).

---

## Design Constraints

- **8:1 minimum** — every color passes WCAG AAA for normal text on its intended background (white for light mode, `#1E1E1E` for dark mode).
- **Same hue across modes** — a level's dark-mode color is the lighter equivalent of its light-mode color, so users recognize the same identity after switching themes.
- **Distinguishable** — hues are spread across the spectrum. Adjacent pairs may have similar luminance (unavoidable at 8:1), but hue differences + numbered labels + text identifiers provide redundant identification.
- **Reusable** — these pairs are the single source of truth for level badges, learning path waypoints, progress bars, chart lines, and graph segments.

---

## How to Use

### In CSS
```css
color: var(--level-discovery);   /* #005B4F in light, #80DEEA in dark */
```

### In JavaScript/React
```ts
const LEVEL_COLORS = {
  discovery:  { light: '#005B4F', dark: '#80DEEA' },
  building:   { light: '#0A3D8F', dark: '#90CAF9' },
  psychology: { light: '#6B4800', dark: '#FFCA28' },
  optimizing: { light: '#991100', dark: '#FF9E80' },
  mastery:    { light: '#311B92', dark: '#E1BEE7' },
};
```

### Adding a new level
1. Pick an unused pair from the extended palette (or add a new pair to the 10).
2. Add the CSS variable in `src/styles/global.css` (light and dark).
3. Add the level to the enum in `src/content.config.ts`.
4. Add the level meta in `src/components/LearningPath.tsx` and `LevelBadge.astro`.
5. Update this document.
