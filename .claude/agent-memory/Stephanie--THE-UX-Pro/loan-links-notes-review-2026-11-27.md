---
name: loan-links-notes-review-2026-11-27
description: fix/loan-links-and-notes (27 Nov 2026): NBSP before the required mark does not hold at 400%/320 because labels allow emergency breaks; damaged-link view verified; probe recipe
metadata:
  type: project
---

- #917 required mark: a no-break space is not enough. `.lc-fieldLabel` allows emergency breaks (overflow-wrap), so when "(months) *" cannot fit the line the asterisk still drops alone ("Term (months)" en, "Doba splatnosti (měsíce)" cs at 320 px, 400% text). Measure per-node line rects (Range.getClientRects on each child of the label), not a screenshot.
- Damaged share link (#820): one role=alert paragraph plus one button replaces the whole island, nothing else focusable; focus to `p.lc-example` (tabindex -1) after the button; language switch carries the damaged state. No heading in the notice.
- Probe recipe: puppeteer import path is `node_modules/puppeteer/lib/puppeteer/puppeteer.js`; text size via CDP `Page.setFontSizes`; wait for `.lc-root:not([inert])`, since the dev server hydrates slowly and the SSR examples show first. A dev server started under `systemd-run --scope` survives `pkill -f`: kill its node pid.

**Why:** the next review of the required mark or the link check can start here.
**How to apply:** for any "keep X with its word" fix, test the longest label at 320 px / 400% with line rects. See [[large-text-review-2026-11-17]].
