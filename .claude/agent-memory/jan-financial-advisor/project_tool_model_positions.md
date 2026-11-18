---
name: tool-model-positions
description: Positions Jan has given on how the free tools compute and show amounts; the earlier Nov 14 entries (APR, final payment, bands, redenominations, refinance) were lost from this file and need re-deriving from the code if asked
metadata:
  type: project
---

Note (2026-11-17): the index line for this file listed positions from 2026-11-14 (APR convention, final loan payment, simulator single line, net worth bands, APR per currency, redenominations, simulated-amount rounding, refinance penalty and break-even), but the file did not exist. Re-derive those from the tools' math.ts and tests rather than from memory.

**Amount display when space is short (issue #667, 2026-11-17).** An amount is one token: sign, currency symbol, digits, decimal part, percent sign and any short suffix (M, Cr, lakh) never separate. Harm ranking, worst first: sign split from figure (reads as the opposite sign, flips which option is ahead); sideways scroll hiding the tail (silent 1000x misreading); a break inside a group; a break at a group separator (worst in cs, where "432 Kč" on the next line looks complete, in es where "98.765." looks like a sentence end, and in Indian grouping, where "65,432" looks like a whole Western number); smaller type; shortening.
**Why:** a new reader takes the first line as the whole amount, and a sign error changes the conclusion, not only the size.
**How to apply:** preferred order is whole on its own line, then shortened (only where the figure is already approximate or the exact figure is visible elsewhere on the page or export; every amount in one comparison shortened together; two different values must never shorten to the same text), then smaller type, never a break inside, never sideways scroll. Monte Carlo and invest or pay off already round in words and say the spreadsheet has every digit; the loan comparison is exact and shortening there can collapse two offers to one figure. Breaking a range at "to" is fine. U+2212 does not by itself stop a break before a following currency symbol (observed: "−" / "€1,520" at 100%).

Related: [[editorial-voice-and-canonical-figures]]
