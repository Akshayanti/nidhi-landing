---
name: editorial-voice-and-canonical-figures
description: nidhi lesson voice (rule of thumb + why + where it breaks) and the canonical figures/thresholds the corpus should agree on, from the Oct 2026 overclaim audit
metadata:
  type: project
---

Editorial goal (stated 2026-10-07): lessons should say "here's the useful rule of thumb, why it exists, where it breaks, how to think about your situation", not "here's the rule". Model lesson: introduction-to-financial-independence (4% rule limits, US-data bias, horizon, country).

**Why:** the 2026-10-07 audit of published lessons (discovery, building, psychology) found repeated overclaims and cross-lesson contradictions; the team is fixing body text and frontmatter (tldr, description, faq) together.

**How to apply:** when reviewing any lesson, check against these canonical positions:
- Long-run real stock returns: 4-6% developed markets (DMS), US at the high end. Several FAQs said 5-7% and the Rule of 72 table used 7% "real"; flag any drift.
- Real estate: low single digit real appreciation; never put a nominal 3-5% in a "real" column.
- Savings rate: a powerful lever and a strong signal, not "the single most predictive metric". Zones for 50%+ must match the FI lesson table (about 17 years at 50%).
- High-interest debt threshold differed (5-6% vs 8-10%); should be framed relative to inflation and expected after-tax returns, since 8-10% mortgages are normal in India and other high-inflation markets.
- Priority order (starter EF, very high interest debt, employer match, full EF, etc.) was inconsistent across 5 lessons; push for one canonical order with "deviate when" notes.
- Credit scoring: US tiered pricing is not universal; SCHUFA/BKR style systems do not require a credit card to build history.
- Loss aversion "twice": cite as "roughly, in many studies, varies by person and stakes".
- 5-year and 1-year "markets recover" claims contradict the site's own risk table (worst 5-year -7% annualised).
- Canonical (set by the team 2026-10-07): real bonds a little under 2%/yr since 1900; debt above ~8-10% usually worth clearing in low-inflation economies, 4-8% judgement call, elsewhere judge vs inflation; order = starter EF, high-interest debt, employer match "often taken early" (alongside or before), full EF, tax-advantaged, remaining debt by rate, taxable.
- Scheduled lessons (4. optimizing, inclusive-finances) were rewritten to this on 2026-10-07; invest-or-pay-off-debt is the anchor (its inline SVG band now 0-4 / 4-8 / 8+). Illustrative real-return examples use 5% (mid-range); flag 6%+ "real" or 7% "real".
- Style-check false positive: `var(--color-...)` inside inline SVG styles matches the "no double dash" grep; it is CSS, not prose.
Related: [[savings-rate-claims]]
