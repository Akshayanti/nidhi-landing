---
name: announce-review-2026-11-20
description: Review of #596/#603/#604/#608-#610 branch: spoken abbreviations in announcements, right-aligned long hints, overridden section fill, live-region logging recipe
metadata:
  type: project
---

Review of branch fix/loan-comparison-label (20 Nov 2026).

- **Announcements reuse on-screen abbreviations.** The loan tool's `months()` strings ("4 yr 6 mo", es "1 a. y 1 mes", cs "1 r. 1 měs.") went into the refinance live sentence; cs also ends "měs.." (template adds a period). A spoken sentence needs whole words: Intl.NumberFormat unit year/month long + Intl.ListFormat type unit works, but mr needs `-u-nu-latn` (Devanagari digits otherwise) and hi gives वर्ष where the catalog says साल.
- **`.lc-resultValue` is right-aligned and `.lc-resultHint` inherits it**: any multi-sentence hint under a value becomes a ragged-left paragraph (851 px tall at 200% text, cs, 320 px). Check hint length whenever a hint string grows.
- **`.lc-tabPanel .lc-advancedSection { background: transparent }`** overrides any fill given to `.lc-advancedSection`; both sections using it live in tab panels.
- Recipe that worked: MutationObserver on `[aria-live],[role=status],[role=alert]` added via evaluateOnNewDocument, logging region text with timestamps; set `nidhi-cookie-consent`=declined and `nidhi-theme-mode` before load, or the cookie banner takes focus. Type into LocaleNumberInput with focus + Ctrl+A, not triple-click (triple-click appended, giving NaN and an empty result).
- Another session may edit the same worktree during a review: check `git status` before trusting that the build matches the files.

**Why:** these recur wherever the tools add spoken sentences or longer hints.
**How to apply:** for any new announcement, read it in es and cs; for any longer hint, screenshot at 320 px and 200% text. Related: [[tool-redesign-review-2026-11]], [[large-text-review-2026-11-17]].
