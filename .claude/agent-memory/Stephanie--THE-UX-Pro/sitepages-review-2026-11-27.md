---
name: sitepages-review-2026-11-27
description: fix/site-pages-a11y review: visible email label inherits dark text on blue boxes (1.87:1); #841 guide dt still letter-breaks; dead :has padding rule; scratchpad profile path too long for Chrome
metadata:
  type: project
---

Review of branch fix/site-pages-a11y on 2026-11-27 (OBJECT).

- **A new visible label on the waitlist or full newsletter box inherits `--color-text-primary`**, so it is #212121 on #0D47A1 (1.87:1) in light theme. Those boxes set white on each child class, not on the box. Any new text element inside `.waitlist-box` / `.subscribe--full .subscribe-box` needs its own colour. Dark theme hides the bug (text primary is white there).
- **#841 was claimed fixed by "audit shows no finding" but reproduced**: `.gv-doc-line` is a no-wrap flex row; dt `overflow-wrap: anywhere` plus dd without wrapping → letters one per line and amounts like "€3,000.00" split per character at 300-400% on 320-414 px. Always re-run the repro yourself (the brief's word is not evidence).
- `.lp-nodeCard:has(> .lp-cardBadges)` placed before the older `.lp-nodeCard:has(.lp-cardBadges)` with equal specificity is dead: the later rule wins. Measure computed padding, don't trust comments.
- Cookie `(height < 30rem)` reorder also fires on landscape phones at 100% and short laptops at 200%: harmless (answers visible, explanation starts in view).
- TOPIC_ALONE "dinero/peníze/पैसे" find nothing: the index is English; only "money" works.

**Tooling:** Chrome fails with "Socket path too long" when the profile is under the session scratchpad. Symlink `/tmp/claude-1000/stx -> <scratchpad>/tmp` and use `TMPDIR=/tmp/claude-1000/stx`; profiles still live in the scratchpad. Puppeteer import by absolute path from the worktree's node_modules target (resolve with `node -e "require.resolve('puppeteer')"`), so scratch scripts can live in the scratchpad.

Related: [[contrast-pr-review-2026-11-14]], [[forms-pr-review-2026-11-14]].

**Recheck at a5a5d8f (2026-11-28): SIGN OFF.** Labels 8.6:1+, guide lines wrap whole words, scroll hint and sticky caption from 640px, "money" synonyms work. Left open: at 400% on 320-375 px a guide amount wider than its box still breaks ("€3,000.0 / 0") and labels break beside the number disc ("Balan/ce"); the audit counts these as "wider than their line", not as failures, because outside /free/ no amount rule applies.
