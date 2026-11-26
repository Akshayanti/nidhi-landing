---
name: loan-rate-change-review-2026-11-26
description: #818/#796 review: new required boxes contradict the FAQ, hybrid period pre-filled 60, card error sits far above the fold, "digits only" misleads; re-review 27 Nov signed off
metadata:
  type: project
---

Review of fix/loan-rate-and-links (#818 changing rate required, #796 lump month), 26 Nov 2026. Verdict OBJECT; re-review 27 Nov (with #819) SIGN OFF.

- Making a box required must be checked against the FAQ "Which fields are required?" (`faq` in loanComparison.ts, all five languages) and against the RequiredMark/aria-required pattern on the card; both were missed, fixed 27 Nov.
- Choosing "Fixed, then variable" pre-fills the initial period with 60 (`ADVANCED_DEFAULTS` in src/utils/loan/url.ts); only the later rate starts empty. Briefs may say "both empty": check the defaults.
- The card's error (`.lc-results`) renders ABOVE the optional folds: at 320 px it was 929 px (200%) and 3,879 px (400%) above the rate radio. Not a live region by design (#608).
- Lump month: own message `lumpMonth` when the month is the only fault. Remaining gap: "12,5:5000" (comma decimal, es/cs) does not read at all, gets the generic "digits only" message, and removing the comma gives month 125.
- RequiredMark sits after a plain space, so at 400%/320 px the "*" wraps alone onto its own line (en "Initial fixed period (months)", also the older marks). A no-break space before the mark would fix every one.
- Spreadsheet lump sums over 32,767 chars continue in rows with an empty label (print: empty `<th scope=row>`); accepted because every piece reads "Month N: amount" and the case needs ~1,200 huge pairs.
- Error text gets hyphens:auto at 400%, so words hyphenate at 320 px; existing behaviour.
- Probe recipe: dev server via `npx astro dev --port 4399` daemonises (pid in its log; kill it, confirm with curl). puppeteer import path is node_modules/puppeteer/lib/puppeteer/puppeteer.js. `Page.setFontSizes` via CDP gives the real 400% text; element screenshots after it came out blank, trust measurements.

Related: [[loan-steps-review-2026-11]], [[tool-redesign-review-2026-11]].
