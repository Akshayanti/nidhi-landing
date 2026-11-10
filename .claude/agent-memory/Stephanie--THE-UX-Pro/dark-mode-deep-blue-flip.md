---
name: dark-mode-deep-blue-flip
description: --color-deep-blue flips to light #90CAF9 in dark mode, so "color: white on deep-blue" fills fail contrast (about 1.7:1); check every filled button in dark
metadata:
  type: project
---

In `src/styles/global.css`, `--color-deep-blue` is `--palette-blue` in light mode but `--palette-blue-dark` (rgb 144,202,249) in dark mode, and `--color-bg-white` becomes rgb 30,30,30. A filled control written as `background: var(--color-deep-blue); color: white` reads fine in light mode and drops to about 1.7:1 in dark (found on the Oct 2026 lesson-nav prototype FAB).

**Why:** the token name says "deep blue" but it is a role token that inverts; hard-coded `white` does not.
**How to apply:** for any filled deep-blue surface, use `color: var(--color-bg-white)` (or the header's active-button pattern) and audit with `prefers-color-scheme: dark` emulated, not just light screenshots. Related: [[contrast-audit-pitfalls]].
