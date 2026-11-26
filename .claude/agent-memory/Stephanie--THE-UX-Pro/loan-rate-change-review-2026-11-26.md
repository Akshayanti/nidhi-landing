---
name: loan-rate-change-review-2026-11-26
description: #818/#796 review: new required boxes contradict the FAQ, hybrid period pre-filled 60, card error sits far above the fold, "digits only" misleads
metadata:
  type: project
---

Review of fix/loan-rate-and-links (#818 changing rate required, #796 lump month), 26 Nov 2026. Verdict OBJECT.

- Making a box required must be checked against the FAQ "Which fields are required?" (`faq` in loanComparison.ts, all five languages) and against the RequiredMark/aria-required pattern on the card; both were missed.
- Choosing "Fixed, then variable" pre-fills the initial period with 60 (`ADVANCED_DEFAULTS` in src/utils/loan/url.ts); only the later rate starts empty. Briefs may say "both empty": check the defaults.
- The card's error (`.lc-results`) renders ABOVE the optional folds: at 320 px it was 929 px (200%) and 3,879 px (400%) above the rate radio, so the reader acting in the fold sees only a red border. Not a live region by design (#608); the delayed "Fix the highlighted fields" announcement covers screen readers.
- Shared "Use digits only" message is wrong advice for well-formed but out-of-range input (12.5:5000): it can steer a reader to 125:5000.
- Error text gets hyphens:auto at 400%, so words hyphenate at 320 px; existing behaviour, not new.
- Probe recipe: dev server via `npx astro dev --port 4399` daemonises (note the pid in its log, kill it); puppeteer import path is node_modules/puppeteer/lib/puppeteer/puppeteer.js.

Related: [[loan-steps-review-2026-11]], [[tool-redesign-review-2026-11]].
