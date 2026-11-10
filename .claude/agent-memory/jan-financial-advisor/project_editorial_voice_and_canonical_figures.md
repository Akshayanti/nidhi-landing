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

State at the 2026-11-10 audit (verify against the files before relying on it):
- Verified sound and consistent: 4 to 6% real for developed-market shares in every lesson read; bonds a little under 2%; savings-rate table (5% real, 4% withdrawal, 50% gives about 17 years, recomputed); emergency fund one month starter and three to six months; lesson 49's bands and seven-step order; loan arithmetic in lessons 15, 27, 50, 50b, 50c.
- Still open: employer match sits at step 4 (after the full fund) in lessons 23 and 30 but step 3 in lesson 49; lessons 13 and 30 give the 8 to 10% threshold without "in low-inflation economies"; cash is "0 to 2% real" in lessons 17 and 18 but "close to zero" in lesson 54 (DMS bills are about 0.5% for the US).
- An illustrative 7% is used unlabelled (lessons 06, 17 intro, 30, 49); it is a before-inflation figure and should say so wherever a real figure sits nearby.
- The 3 to 3.5% withdrawal rate for non-US readers has no cited source in lessons 25, 31, 57. Evidence to cite: Anarkulova, Cederburg, O'Doherty and Sias (38 developed markets, 1890 to 2019: a 4% real withdrawal failed in 17.4% of simulations against 3.5% on US data); Pfau 2010 (17 countries, DMS data).
- Lesson 25's "crossover usually comes years before the full FIRE number" conflicts with the 25 times rule; in Your Money or Your Life the crossover is financial independence.
- "Effective interest rate" is defined in lesson 49's glossary as the after-tax rate; the established meaning is the rate including compounding (and fees). "Income replacement ratio" has two meanings (lesson 31 metric 6, lesson 57).
- Recurring pattern: a rule of thumb's zones or caps given with no source (lesson 31 health zones, lesson 19 satellite cap of 0 to 15%).
- Agent memory is public: never record planner internals here.

Added by the second pass of the 2026-11-10 audit (all 80 lessons and 12 guides now read at least once):
- Lesson 43b runs every scenario at 6% "real" while its own glossary and every other illustration use 5%; arithmetic holds at 6%. At 5% its figures are about a sixth lower.
- Lesson 23 says tax deferral wins "even if your bracket stays the same". Not sound: at equal rates tax-deferred and tax-free accounts give the same result (EET against TEE); deferral only beats a taxable account. Singapore SRS is tax-deferred, not equity-linked.
- The crossover inconsistency extends to lesson 26, which defines it as full independence on income alone and says passive income "accelerates" independence. Position: reinvested income is part of total return, not an addition; define the crossover once for the corpus.
- Lessons 02, 20 and 29 misdescribe the net worth tool: it uses daily official reference rates (not "live mid-market"), and it does not know future spending or obligations.
- The editorial policy and about page promise that every figure is sourced and agrees across lessons. Not true while the open items stand; position: fix the items or word it as a standard with a corrections route.
- Investing horizon is "5+ years" in lessons 07 and 13 but "7+ years" in lesson 30. More unlabelled 7% in lessons 13 and 21 (52, 53 and 58 label theirs).
- Commodities "near 0% real" is true of spot prices only; futures returns are contested. "Core assets positive by structure" overstates cash and bonds after inflation.
- Verified sound, no need to recheck unless the files change: psychology lessons 33 to 42, all Inclusive Finances worked figures, all guide tables, lessons 50c, 51, 52, 53, 56, 57, 58 arithmetic.
- Outside facts verified by search on 2026-11-10: OECD Pensions at a Glance 2025 (63% average net replacement, under 35% Ireland and Lithuania, 96% Netherlands); UK loan-to-income change in force 28 Oct 2026; APRA buffer held at 3 points 28 May 2026; Eurostat 2024 pension gap 24.5%, pay gap 11.1%; France PEA social charges 18.6% from 2026; German Altersvorsorgedepot from 1 Jan 2027; Czech CZK 40m cap removed from 2026; Brazil ANS cap 5.11%; Rengo 2026 5.01% and 4.69%.
- Still unverified: Kenya Fuliza current tariff (lesson 49's Sh5 band is pre-October 2022; top band now KSh25 plus 20% excise; the operator's page blocks automated reads); South Africa chronic disease list count (25, 26 or 27 by source; lesson 58 says 25).
- Inclusive Finances reading lists lean on UK sources (Law Commission, House of Commons Library); label as a country example.

Related: [[savings-rate-claims]], [[tool-model-positions]]
