---
name: toolsa11y-review-2026-11-28
description: fix/tools-a11y (15 commits) review: loan chart focus ring clipped by its scroller at every width (pre-existing); export stacking already existed <640px; guide notes still break beside the disc
metadata:
  type: project
---

Review of fix/tools-a11y on 2026-11-28 (SIGN OFF, non-blocking findings).

- **Loan balance chart focus ring is invisible at 375 and 1280** (`.lc-chartBox:focus-visible` outline-offset 4px, parent `.lc-chartScroll` overflow-x:auto clips it). Pre-existing, not from #758. Any focusable box inside an overflow scroller needs a negative offset or the ring on the scroller via :has(:focus-visible).
- `.lc-yPin` (sticky y-axis copy) aligns to the pixel with the chart's own ticks at 320-639 px, 100-400%, both themes; it takes 151 of 262 px at 400% on 320 (owner's design). It has pointer-events auto, so it swallows taps over the plot under it.
- `.tool-exportButtons > *` was already `flex: 1 1 100%` below 640px on main: the #488 22.5em column rule only changes things at >=640 px with ~180%+ text. Check old rules before believing "now stacks on small screens".
- `.gv-notes li` still puts the number disc beside the text: column 151 px at 400%/320 vs ~225 if it flowed under, words break unhyphenated ("Advertise/d"). dt was fixed, notes were not. `p.guide-step-example` amounts still break ("€1,200,") at 300-400% on 320-375.
- Probe recipe: MutationObserver on closest([role=status],[aria-live]) catches region text changes but not inserted role=alert nodes (target is the parent). Typing into LocaleNumberInput: select with Ctrl+A, triple-click + Backspace left stale digits.

Related: [[sitepages-review-2026-11-27]], [[pr752-review-2026-11-21]].
