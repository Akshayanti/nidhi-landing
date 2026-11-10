---
name: contrast-audit-pitfalls
description: Measurement traps when auditing nidhi.today control contrast with puppeteer (color-mix, 1.5px borders, sr-only text)
metadata:
  type: project
---

Traps found while verifying the "tappable vs static" spec (2026-10-20):

- `--color-link-edge` uses color-mix(), so getComputedStyle returns `color(srgb 0.41 0.55 0.66)`. A naive `/[\d.]+/` rgb parser reads that as near-black and gives false passes in light and false fails in dark. Parse `color(srgb ...)` by scaling by 255.
- Chrome reports and renders `1.5px` borders as `1px` (lp-btn--secondary, learn-btnSecondary, cookie decline). Still about 10:1, so fine, but the "heavier outline" never shows.
- Chevron/text overlap checks hit visually hidden text (e.g. Czech "přečteno" sr-only in .learn-level); confirm with a screenshot before reporting.
- `[data-theme="dark"] .learn-num:not(.learn-numRoute)` (specificity 0,3,0) beats `.learn-levelSoon .learn-num`, so the "being written" level number is #121212 on #121212 in dark.

**Why:** these produced wrong numbers on the first pass.
**How to apply:** reuse the fixed inventory (inv2.mjs pattern) and check screenshots before calling a measured number a defect. Related: [[tappable-spec]]

- Puppeteer headless defaults to dark: setting data-theme="light" alone still measured dark surfaces. Call `page.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}])` too.
- Light lesson page background is #f8f9fa, about the same as --color-bg-subtle (1.03:1), so a bg-subtle card is outlined only by its border (--color-border 1.25:1). Seen on .lesson-depth expanders (2026-10-20).
