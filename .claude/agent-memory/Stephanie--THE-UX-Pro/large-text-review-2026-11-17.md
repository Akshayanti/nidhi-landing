---
name: large-text-review-2026-11-17
description: #667 tools at 300-400% text: .btn 1em side padding is the main cause of letter-by-letter breaks; fitted amounts can end smaller than their labels; how to measure
metadata:
  type: project
---

Review of #667 (amounts as unbreakable `.amt` units fitted by container query, `overflow-wrap: anywhere` site-wide) on 2026-11-17.

- Root cause of the worst large-text breaks is padding that scales with text, not wrapping rules: `.btn` has about 1em of side padding, so at 400% on 320px a full-width button keeps ~130px for 64px text and "Reset", "PDF", "Download" break letter by letter. Was there before #667. Two-option segmented controls side by side (loan "Solve for", "Fixed / Fixed then variable", ~109px each) do the same.
- `overflow-wrap: anywhere` removed sideways page scroll at 400% (old rule: loan 447px, net worth 507px, invest 424px wide on a 320px screen) but adds new mid-word breaks in flex rows (net worth "items" count, "Value"/"Currency" cell labels). Check new vs old by injecting the old rule with addStyleTag, not by stashing.
- Fitted amounts are bound by box width, so on 320px they hit the same px at 300% and 400% (net worth owned/owed 24.7px under ~55px labels; Monte Carlo median 39.6px under a 56px range sentence; loan monthly 47.5px beside a full-size APR). Hierarchy inverts: report it.
- Scratch tools: a scan script that finds mid-word breaks via Range.getClientRects per word (split on hyphens, or hyphen breaks count as false hits). shot.mjs opens every `<details>`, including the language picker, so it shows over page tops: not a bug. Headless forced-colors emulation flips the media query but does not repaint colours.
- Dev pages show the "Dev only: waitlist count" sentence with WAITLIST_COUNT_TOKEN: ignore it.

**How to apply:** at large text, look at padding/margins in em first, then two-up controls, before blaming wrap rules. Related: [[contrast-audit-pitfalls]].

## Owner's decision on finding 3 (Nov 17, 2026)

A long amount drawn smaller than its own label at 400% on a 320 px phone is an **accepted trade-off**, recorded in CLAUDE.md ("Layout Is Checked at Every Size at Once", rule 4). Do not report it as a finding again. It is reopened only if an amount is drawn below 16 px.
