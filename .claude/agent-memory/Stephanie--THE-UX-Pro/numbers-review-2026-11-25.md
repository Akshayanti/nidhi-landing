---
name: numbers-review-2026-11-25
description: Numbers fixes (#861/#868/#872/#883-885): "−0" fixed only in formatAmount, not in pct or report cells; "1000K" bug was never Spanish/Hindi/Marathi-only; tests run with tsx not vitest
metadata:
  type: project
---

Commit 6db1ce5 on fix/bugs-numbers (25 Nov 2026), SIGN OFF with non-blocking findings.

- **Sibling paths again:** the −0 fix (`Math.round(v) || 0`) lives in formatAmount only. `Intl` percent and decimal formats also write "-0%" / "-0.00" for tiny negatives (InvestOrPayOff `pct`, ToolExport `cellText`), and trueMinus turns that into "−0%". `signDisplay: 'negative'` fixes it but throws RangeError before Safari 15.4 / Firefox 116, so round-then-`|| 0` is safer.
- **Compact path:** formatAmount's own short form runs whenever the amount locale does not start with `en-` and is not `cs`: every Spanish page, and on en/hi/mr pages any currency whose CURRENCIES locale is not English (CHF de-CH, JPY, BRL, SEK...). EUR is en-IE so it takes Intl's path. Copy that names "Spanish, Hindi and Marathi pages" for a compact-form bug is wrong.
- Inflation's `keepHeadline` signed pct still writes a hyphen minus; NVDA speaks it anyway (digit follows).
- **Recipe:** unit tests are node:test via `npx tsx --test <files>`; `npx vitest` reports "no test suite".

Related: [[minus-sign-review-2026-11-24]]
