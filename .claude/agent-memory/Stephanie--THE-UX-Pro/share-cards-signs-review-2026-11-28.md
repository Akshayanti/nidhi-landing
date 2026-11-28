---
name: share-cards-signs-review-2026-11-28
description: e905ee9 (#691 sharedSigns, #743/#420 share cards): SIGN OFF; card teal text 7.6:1, guide footer collision, empty tool card; probe recipe for every currency
metadata:
  type: project
---

Branch fix/amounts-and-cards, commit e905ee9 (28 Nov 2026): SIGN OFF, nothing blocking.

- **sharedSigns** (money.ts) runs on every amountFormat/formatMoney/axisTick: probe of all CURRENCIES x {null, es, cs} x {formatMoney, formatAmount, compact} gave U+2212 first, no hyphen, one unit from splitAmounts. The many `.replace('-', '−')` calls in MultiCurrencyNetWorth/InvestOrPayOff are now no-ops.
- Hyphen minus still left in tool copy: monteCarlo.ts "-42.9%" in en/hi/mr (cs has U+2212, es words it); impossible-rate "-100%" in all five.
- **Cards** (scripts/render-share-cards.mjs): kicker and URL in `#005B4F` on `#F8F9FA` = 7.63:1, below the 8:1 aim; the site uses `#004D40` for teal text there. Guide meta line "A worked example... · free" ends ~10px from the logo. Tool cards have no group line and a ~250px empty band; the hub's `freeHub.tools.*.kicker` fits that slot.
- **Recipe:** a dev server may already run for the worktree (`astro dev` refuses a second one and names the pid/port); read og meta with curl from that port. Quick format probe: a `.mts` in the scratchpad importing the worktree's money.ts by absolute path, run with tsx under systemd-run.

Related: [[minus-sign-review-2026-11-24]], [[numbers-review-2026-11-25]]
