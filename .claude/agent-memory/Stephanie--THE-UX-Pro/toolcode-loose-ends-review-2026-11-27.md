---
name: toolcode-loose-ends-review-2026-11-27
description: c3012bf review (#825 per-box ? state, #826, #889 flushSync, #792, #895): a ? in one required box marks all required boxes with "This value could not be read"
metadata:
  type: project
---

Branch fix/tool-code-loose-ends (head c3012bf), signed off 2026-11-27 with non-blocking findings.

- Loan card: when a required box arrives as "?", `requiredError` marks every required box aria-invalid and points it at one message, "This value could not be read. Enter it again." (LoanCompare.tsx VendorCard). Since #825 keeps that message until the ? box itself is edited, a reader typing in the rate hears their rate called unreadable. Fix idea: while `arrived`, mark only boxes whose value holds the marker.
- #889: only MeasuredText's flushSync path has a same-task test; useChartRem's has none (its #876 tests use `await act`).
- Spot check: what a "box" is called varies inside the loan tool's own catalogs (es campo/recuadro, cs pole/rámeček, mr रकाना/चौकट, hi खाना/बॉक्स), so a What's changed item that follows the tool's usual word is not a glossary breach.

**How to apply:** check whether the per-box marking was done before looking again at ? handling on the loan card.
