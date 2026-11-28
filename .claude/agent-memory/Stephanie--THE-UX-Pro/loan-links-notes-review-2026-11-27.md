---
name: loan-links-notes-review-2026-11-27
description: fix/loan-links-and-notes (27 Nov 2026): NBSP before the required mark does not hold at 400%/320 because labels allow emergency breaks; damaged-link view verified; probe recipe
metadata:
  type: project
---

- #917 required mark: a no-break space is not enough. `.lc-fieldLabel` allows emergency breaks (overflow-wrap), so when "(months) *" cannot fit the line the asterisk still drops alone ("Term (months)" en, "Doba splatnosti (měsíce)" cs at 320 px, 400% text). Measure per-node line rects (Range.getClientRects on each child of the label), not a screenshot.
- Damaged share link (#820): one role=alert paragraph plus one button replaces the whole island, nothing else focusable; focus to `p.lc-example` (tabindex -1) after the button; language switch carries the damaged state. No heading in the notice.
- Probe recipe: puppeteer import path is `node_modules/puppeteer/lib/puppeteer/puppeteer.js`; text size via CDP `Page.setFontSizes`; wait for `.lc-root:not([inert])`, since the dev server hydrates slowly and the SSR examples show first. A dev server started under `systemd-run --scope` survives `pkill -f`: kill its node pid.

- Round 2 (c2745f6): #917 fixed with a nowrap inline-block pair (last word + mark) fitted by container query; verified one line everywhere, 47 px vs 52 px label at 400%/320 for "(months)*", "(měsíce)*". #827 `steadyAbove` holds a shrinking region's min-height while the box below has focus: the box stayed put to the pixel, a user wheel scroll was not fought, Tab and tap release. Cost: at 400%/320 the held blank is 560-630 px (example note gone), mostly above the screen.
- pkill -f on the dev server exits the calling shell with 144; kill by pid from `ps aux`.

**Why:** the next review of the required mark or the link check can start here.
**How to apply:** for any "keep X with its word" fix, test the longest label at 320 px / 400% with line rects. See [[large-text-review-2026-11-17]].
