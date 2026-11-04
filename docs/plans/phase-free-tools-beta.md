# Phase: Free Tools for Traffic Acquisition

> Status (2026-11-03): the June roadmap (beta and public-launch phases, signup funnel, tool specs) is archived in [done/phase-free-tools-beta.md](done/phase-free-tools-beta.md). What stays here is the principle for choosing tools, the tools that were cut, and the ideas that are parked. How a tool is built today is set by `CLAUDE.md` ("Free Tools Keep Inputs Out of URLs", "Copy Changes Reach Every Language", "What's Changed Grows With Every Visible Change").
>
> Live tools: loan comparison, net worth calculator (`/free/multi-currency-net-worth/`), Monte Carlo simulator (`/free/monte-carlo-simulator/`) and inflation calculator (`/free/inflation-calculator/`). A fifth, invest or pay off (`/free/invest-or-pay-off/`), is built and gated on lesson 49.

## Contents

- [Principle: differentiation, not volume](#principle-differentiation-not-volume)
- [Tools Considered and Cut](#tools-considered-and-cut)
- [Parked tool ideas](#parked-tool-ideas)

---

## Principle: differentiation, not volume

- **Traffic acquisition through differentiation, not volume**: We deliberately avoid saturated calculator categories (debt avalanche/snowball, generic budget calculators, vanilla compound-interest tools). Every tool we ship must have a defensible angle: multi-currency, simpler-than-incumbent UX, a companion to a lesson, or a niche no competitor owns. High search volume on a saturated keyword is worth less than moderate volume on an undefended one.
- **Everything runs in the browser.** No backend endpoints, no database, no accounts. The exceptions are fetches, not computation: the net worth calculator fetches exchange rates from the Frankfurter API (`api.frankfurter.dev`), and inflation history is bundled and served from nidhi.today.

---

## Tools Considered and Cut

The plan previously listed 9 tools. Two were cut after a deeper audit against the main product (NetWorthAndExpenses), the blog content, and the competitive landscape. Documenting them here so future versions don't reintroduce them without re-litigating the reasoning.

### ❌ Avalanche vs Snowball Calculator (cut)

**Status**: Cut from beta on 2026-05-17.

**Why originally proposed**: Lesson 05 ("How to Get Out of Debt: Snowball vs. Avalanche") already exists; the keyword has high intent; the main product has no head-to-head debt-strategy comparator.

**Why cut**: **Saturated category**. NerdWallet, Bankrate, Ramsey Solutions, Mint/Credit Karma, Magnify Money, Forbes Advisor, and dozens of bloggers all rank for "avalanche vs snowball calculator." Domain authority and backlink profiles dwarf ours. Even with a better tool, organic ranking is unrealistic in <12 months. Build cost is not justified by the achievable traffic.

**What replaces it**: Lesson 05 stays; it answers the educational question and carries the planner waitlist like every lesson. We do not build a calculator that competes for a saturated commodity keyword.

**Reconsider when**: We have domain authority to rank against generalist personal-finance sites, OR we discover an angle no incumbent occupies (e.g. multi-currency debt across countries, common for expats).

---

### ❌ Historical Net Worth Simulator (cut)

**Status**: Cut from public launch on 2026-05-17.

**Why originally proposed**: Framed as "no competitor has this."

**Why cut**: **Direct cannibalization of a paid Phase 2 feature**. The main product already has full snapshot infrastructure (`/networth/history`, `/networth/chart-data`, `/networth/dip-analysis`) and the Phase 2 "time-travel UX" is *the* promised paid upgrade. A free tool that lets users plug in past net worth and chart their journey trains them to expect this for free, then to feel the paid feature is overpriced when it lands. The framing "no competitor has this" applies to the *paid* product, not to a free top-of-funnel tool.

**What replaces it**: Nothing. The main product covers this; the free-tool slot goes to non-overlapping capability.

**Reconsider when**: Never as proposed. If we revisit, scope must be radically narrower, e.g. a single "your net worth on date X" backsolve from one input, with zero per-asset detail, and only as a teaser for the paid time-travel UX.

---

## Parked tool ideas

Never built. Each would need a fresh brief as a lesson companion under the current `CLAUDE.md` rules before any work; the June specs in [done/phase-free-tools-beta.md](done/phase-free-tools-beta.md) are background only (their signup CTAs, query-string sharing and phase gates no longer apply).

- **FIRE Number Calculator**: expenses and withdrawal rate to a target number. Saturated category, so it needs an angle first.
- **Coast FIRE Calculator**: whether current savings could grow to the target without new contributions. Pairs with the FIRE number.
- **Cash Shortfall Predictor**: month-by-month cash runway, 12 to 36 months, flagging deficit months. Runway only, no portfolio modeling.
- **Life Event Impact Calculator**: one life event at a time (a child, a career break, a move, a job loss) and its effect on the plan. Cost figures would need global, not US-only, sources. Lesson 45 could anchor a companion brief.
- **Banned-vocabulary test**: a catalog-level test that fails if tool copy says "on track", "recommend" or similar verdict words. The Monte Carlo strings are clean today, but nothing enforces it.
