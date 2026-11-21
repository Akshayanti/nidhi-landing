---
name: tokens-pr754-review-2026-11-21
description: PR #754 (hub, privacy, sign-up forms on shared tokens): scoped `.privacy-container p/ul` silently beats global `.eyebrow` and changelog size rules; lesson "All terms" link scrolls sideways at 300-400%
metadata:
  type: project
---

Review of PR #754 (closes #744, #716, #640) on 2026-11-21. Verdict: SIGN OFF with non-blocking findings.

- **Scoped rules beat global classes.** Astro's attribute scoping makes `.privacy-container p` weigh (0,3,1), more than global `.eyebrow` / `.eyebrow--muted` (0,1,0) and the page's own `.changelog-*` rules (0,2,0). So on /privacy/ the changelog eyebrow, intro, summary and details all render at 15px, in secondary grey, with 12px bottom margin, whatever the class says. Was already true before the PR. The PR's "moved to type steps" for those has no effect. Check computed styles, not the diff, when a page has a broad `container p` rule.
- **Lesson sideways scroll not caused by the PR:** `.post-glossary-all` ("All terms", `flex: none`) widens lesson pages to 335px (300%, 320) and 427px (400%, 320 and 375). Found by listing the deepest elements past the right edge. Lesson SVG text past the edge is inside figures that scroll on their own: ignore it.
- Compact newsletter row: at 400% on 320 "Subscribe" breaks mid-word ("Subsc/ribe"). That is the cost of #716's no-sideways-scroll fix and is acceptable. The "·" separators can end up alone on a line.
- Dark-mode compact newsletter error went from 3.07:1 (#c0392b on #1E1E1E) to 7.75:1 with `--color-danger`.
- Tools hub at 1080px: how-it-works list lines run 100 to 111 characters. Privacy at 688px with 15px text: about 86 characters a line on a laptop. 16px text would bring it near 80.
- Recipe: profile `Preferences` `default_font_size` for text size; `wide.mjs` (deepest elements with right > clientWidth) finds a sideways-scroll culprit quickly.

**How to apply:** when a PR moves a page's labels onto global classes, confirm the computed style changed. Related: [[large-text-review-2026-11-17]], [[contrast-audit-pitfalls]].
