---
name: number-edges-round2-2026-11-27
description: fix/number-edges round 2 (27 Nov 2026): inflation two significant figures below 10, net worth "Rate unavailable" when no rates; what was checked by code only
metadata:
  type: project
---

Round 2 of fix/number-edges signed off from code and DOM tests, no browser (a mutation run had the machine; owner had runaway-test crashes, so every node run goes in a systemd-run MemoryMax scope).

- Inflation small amounts: `smallAmount` uses `maximumSignificantDigits: 2` through `amountFormat`, so hi/mr keep Latin digits (currency locale en-IN), cs/es put the sign after with a no-break space. Checking it is one Intl call per locale, no server needed.
- Net worth #887: `sharesUnknown` happens only when `gap` is null (hideAmounts), so the donut and badge branches still run; the donut returns its empty state when every share is 0, and the DOM test asserts no "0%" anywhere in the body text, including sr-only.
- Watch next time: a range whose ends straddle 10 mixes precisions ("€9.6" next to "€12"). Owner's decision, not filed.

**Why:** next reviews of these two tools can skip what was settled here.
**How to apply:** start from [[number-edges-review-2026-11-27]] and this note; still to check in a browser: the inflation headline at 320 px with 400% text.
