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
- The 3 to 3.5% withdrawal rate for non-US readers has no cited source in lessons 25, 31, 57. Evidence to cite: Anarkulova, Cederburg, O'Doherty and Sias (see 2026-11-17 section; only the published abstract is confirmed); Pfau 2010 (17 countries, DMS data, unread).
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

Conventions settled in the 2026-11-17 content-finance pass (branch content/finance-lessons; owner to confirm; verify against files):
- Cash after inflation: "about 0 to 1% a year over the long run", from DMS 2025 (Treasury bills 0.5% real 1900-2024, US and world). Replaced "0-2%" in lessons 17, 18; lesson 13 table now shows both columns after inflation; lesson 54 says "about 0.5% for cash".
- Crossover point: equals financial independence when income counted is sustainable (YMOYL: capital x long-term interest rate; site: portfolio x withdrawal rate). One good year's total return can cross early and cross back: a milestone only. Lessons 25, 26, 31 agree.
- Lesson 31 metric 6 renamed "Expense coverage ratio"; "income replacement ratio" is reserved for lesson 57's OECD sense. Lessons 30 and 32 lists updated.
- Priority order: lesson 49's seven steps; match is step 3 "often alongside step 2 or before it" in 13 (early), 23, 30, 49. Debt line "in low-inflation economies ... where inflation is higher, the line sits higher" in 04, 13, 23, 30, 49. "Almost always" removed. Lesson 23's 11% equivalence now conditional on full yearly taxation.
- 3 to 3.5% withdrawal outside the US: cite Anarkulova, Cederburg, O'Doherty, Sias, JPEF 24(3) 2025: only the abstract is confirmed (38 developed countries; couple aged 65, 5% ruin chance, 2.31% a year, "materially lower than" 4%). The "17.4% vs 3.5%", 60/40 and 1890-2019 details came from a secondary summary of the unread 2022 working paper: do not use them. Driver = weak real returns, not local inflation. "Indefinitely/forever" replaced with the 30-year test horizon.
- Council round 1 (2026-11-17): 3 to 3.5% is "often quoted outside the US as more cautious illustrations", never "common among planners" (no source for practice). 8-10% debt line is "a rule of thumb… no universal cutoff". Cash 0-1% always carries "Treasury bills, US and world index". Lesson 17 dropped the unread "other countries had 20-year real losses". The YMOYL measure (capital x long-term interest rate, well above 4% when written) is NOT close to a 4% withdrawal rate. Lesson 19 cap labelled a rule of thumb with no single source. The "driver = real returns" line is reasoning, not the study's finding. SRS 50% applies on or after the statutory retirement age prevailing at the first contribution (IRAS page read).
- Housing returns: no settled ranking, but lessons may report Jordà's own finding (housing about level with shares, smaller swings; Taylor, NBER Reporter 2018; QJE abstract read: 16 advanced economies 1870-2015) beside owner-level evidence. Jordà et al. QJE 2019 (16 economies 1870-2015, about 7% real, level with equities, national stocks, before transaction costs and tax) vs owner-level study (Eichholtz et al. RFS 2021, abstract confirmed: 4.0% Paris 1809-1943, 4.8% Amsterdam 1900-1979, real, net of costs and taxes). The UK 2.3% was a snippet only, so lessons say "about 4 to 5%", not "2 to 5%". Stocks are "among the highest" returning assets.
- Emerging markets since 1900 returned less than developed (DMS 2026 edition: 6.9% vs 8.5% a year; EM ahead 1960-2025, 10.9% vs 9.6%); basis believed nominal USD, not confirmed.
- Investing horizon: both conventions kept; lesson 30 now says why it uses 7+ years (fixed-date goals) against 5+ in 07/13/17.
- Illustrative 7% is labelled "before inflation" in 06, 17, 30, 49; lesson 30 adds the real-terms figure (about €330/month from 25 at 5% real for €500,000 today).
- Glossary: lesson 49's term is now "After-tax interest rate" (anchor #term-after-tax-interest-rate); "effective annual rate" means compounding and often fees.
- Left open (owner decision): which range lesson 19 keeps; full rewrite of lesson 26 "accelerates FIRE" (a one-sentence fix saying reinvested income is part of total return is in).
- Verified outside facts 2026-11-17: Fuliza since Oct 2022 Sh2.50 + excise after 3 free days on Sh101-500, top band Sh25 + excise (HapaKenya 2022; operator page 403); SRS deductible, 50% of withdrawals taxed from statutory retirement age (IRAS, MOF); Eurostat 2024 PLI Denmark 143, Portugal about 87; BNPL paper authors Berg, Burg, Keil, Puri (JFE 171, 2025); Milevsky 2001 IFID Canada floating vs fixed 1950-2000; US worst 22-year real since 1926 about 1.4% ending 1982 (Carlson 2024).

Description-line review for issue #735 (2026-11-21; descriptions feed llms.txt, RSS, search snippets; stay at or under 170 chars):
- Flagged as Not Sound or off-voice: 04 (rate alone decides manageability; body line 72 says payments vs cash flow matter too), 23 ("save more than most fund-selection decisions": body only says "can matter as much"), 14 (zero-based framed as the definition of budgeting), 13 ("getting the sequence right"; body says no single right order), 28 (three superlatives).
- Lower-priority precision fixes proposed: 01 "the clearest single number", 37 "every plan", 43b "a monthly cost outweighs a one-off", 47 and divorce lesson "without tax" (body: in many systems / immediate tax bill), 49 "the rate, not the size, sets a debt's cost", 59 "stop most attacks", 26 passive income as "the point", 15 credit-history hook (US-style tiered pricing), 51 "What to do with".
- Recurring pattern: a description sharpens a body hedge ("in many systems" becomes universal, "can matter as much" becomes "more than").

Related: [[savings-rate-claims]], [[tool-model-positions]]
