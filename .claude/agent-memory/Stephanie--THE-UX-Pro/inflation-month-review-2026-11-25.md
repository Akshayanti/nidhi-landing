---
name: inflation-month-review-2026-11-25
description: Inflation "Past to today" ending at a month (BIS join): legend did not name the month despite the brief; answer block 12-13k px at 320/400%; hi/mr desc postposition after "(in month)"
metadata:
  type: project
---

Review 2026-11-25 of the month join in `InflationCalculator.tsx` (uncommitted on home-hero-planner-and-cookie-sheet).

- **Check the claim, not the brief:** the brief said the month label was "in the legend and the desc"; the legend (`legendMonth`) said only "One month, the latest with a figure". Read the rendered text before accepting a design claim.
- Answer block before the chart at 320 px: 700-870px at 100%, 10,700-13,100px at 400% (five `.ifc-note` lines, 14px at 100%). The join note is about 45% of it and is method, not answer.
- Reusing `changedIn` ("in {month} {year}") inside a desc template with its own postposition breaks hi/mr: "(सितंबर 2026 में) पर". Czech `monthsAlone` are locative, so a bare month needs Intl nominative names.
- Sound: square marker + dashed step read without colour; keys visible in dark and forced colours (outline CanvasText); no sideways scroll or legend overlap at 320/390, 100-400%, all five languages.

- **Fixed and signed off the same day:** the legend names the month (catalog `monthsName`, nominative, not Intl, since the island's number locale is not the page language on hi); `descMonth` per language; joinNote moved after the method line. It still sits inside `.ifc-answer`, so the distance to the chart did not shrink (12.2k px at 320/400% en): moving it below the chart is the remaining lever, if raised again.

- Second source (World Bank GEM, 65 more countries, India included) rechecked and signed off the same day. Probe trap: one es run missed the join note because the dev server hot-reloaded mid-run while the author edited; rerun before reporting a missing line.

**Probe:** scratch `ifc.mjs` pattern: consent preset to declined via evaluateOnNewDocument, click third `[role=tab]`, `page.select('.ifc-countryField select', 'ESP')`, wait 2.5s. Pass flags into `page.evaluate` as arguments (no `process` in the page). Related: [[hero-cookie-sticky-review-2026-11-25]].
