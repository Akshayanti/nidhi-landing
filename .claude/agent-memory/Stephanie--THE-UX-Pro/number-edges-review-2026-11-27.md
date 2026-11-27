---
name: number-edges-review-2026-11-27
description: fix/number-edges (#888/#824) review: flat 0% sentences, U+2212 in inflation, net worth zero total; real-data probe cases and recipes
metadata:
  type: project
---

Review 2026-11-27 of fix/number-edges (worktree nums2). Verdict SIGN OFF.

- **Real-data probe cases** (history as of 2026-11-25): flat month answer BRN from 2022 (flat total, fall average, flat step); flat one year IRQ 2024, MAC 2024; flat multi-year CYM 2012; negative LKA 2023. The "average of 0% a year" leftover had zero cases in the data.
- es/cs/hi/mr flat sentences already say "differed by less than"; only English said "within", so an English-only rewording keeps all five aligned.
- The inflation live region carries a % only in Keeping up (negative growth): read it there, not in Past to today.
- Net worth #824 zero state: cards drop shares, but the concentration chart and table still show 50.0%/50.0% (share of absolute positions), pre-existing.
- **Recipes:** in zsh, loop args need `${=a}` to split. Puppeteer text size: CDP `Page.setFontSizes`. Net worth rates: intercept api.frankfurter.dev and answer `[{quote:'USD',rate:1.1}]` with CORS header; state via `encodeFullData` with tsx, opened after `#`. This worktree's own node_modules let `astro dev` hydrate (unlike [[minus-sign-review-2026-11-24]]).
