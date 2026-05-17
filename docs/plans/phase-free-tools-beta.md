# Phase: Free Tools for Traffic Acquisition

**Status**: Implementing
**Priority**: High
**Owner**: Product + Engineering

> All tools are frontend-only (Astro + React). Zero backend endpoints, zero database tables, zero auth. Every computation runs in the browser.

---

## Contents

- [Decisions](#decisions) — what, why, constraints
- [Phase Boundaries](#phase-boundaries) — what ships when, gating criteria
- [Tools Built](#tools-built) — Currency Risk Analyzer, Loan Comparison Calculator
- [Beta Deliverables](#beta-deliverables) — FIRE Number (preview), Coast FIRE (preview) (2 tools, ~1 week)
- [Public Launch Deliverables](#public-launch-deliverables) — Monte Carlo Tester, Cash Shortfall Predictor, Life Event Impact Calculator (3 tools, ~1.5 weeks)
- [Tools Considered and Cut](#tools-considered-and-cut) — Avalanche vs Snowball, Historical Net Worth Simulator
- [Conversion Funnel](#conversion-funnel)
- [Content Marketing Strategy](#content-marketing-strategy)
- [Free-Tool Competitive Landscape](#free-tool-competitive-landscape) — ProjectionLab, ActuaPlan, Empower, Monarch, Kubera, Wallet, Spendee, YNAB, NerdWallet/Bankrate/Ramsey, Czech banking apps
- [Risks](#risks)
- [Dependencies](#dependencies)
- [Related Documents](#related-documents)

---

## Decisions

### What

Free, standalone financial calculators targeting expat and FIRE communities. Each tool is a public Astro page with a React component handling all computation in the browser — no signup, no backend calls, no data sent anywhere.

### Why

- **Traffic acquisition through differentiation, not volume**: We deliberately avoid saturated calculator categories (debt avalanche/snowball, generic budget calculators, vanilla compound-interest tools). Every tool we ship must have a defensible angle — multi-currency, expat-specific, simpler-than-incumbent UX, or a niche no competitor owns. High search volume on a saturated keyword is worth less than moderate volume on an undefended one.
- **Conversion, not cannibalization**: Free tools must funnel into the main product, not replace it. Tools that overlap heavily with paid features (e.g. multi-asset historical net worth tracking) are out of scope — they train users to expect paid features for free.
- **Conversion validation**: Prove the free-tool-to-signup funnel works during beta before scaling.
- **Competitive moat**: We compete in a landscape with 12 tracked competitors (see [Free-Tool Competitive Landscape](#free-tool-competitive-landscape)). Most have richer paid products; none combine **anonymous-no-signup** + **per-asset multi-currency** + **EU-native framing** + **60-second answer UX** in their free tier. Being first to rank for terms like "multi-currency net worth" and "currency risk calculator" matters more than fighting commodity terms where NerdWallet/Bankrate/Ramsey already dominate.
- **Community trust**: FIRE/expat/personal-finance communities share tools that are transparent (all math visible client-side) and private (no data leaves the browser).

### Constraints

- **Zero backend trips**: Every computation runs in the browser. No FastAPI endpoints, no database tables, no auth, no rate limiting. The tools work entirely offline once the page loads (exception: Currency Risk Analyzer fetches live FX rates from Frankfurter API — a free, no-key public service).
- **Brand identity**: Must look like Nidhi — same typography, color tokens, spacing scale. Reuses BaseLayout, PostHog, and CSS conventions from the existing site. Nothing should feel like a generic Bootstrap calculator.
- **Compact share URLs (chat-friendly, no shortener)**: A server-side URL shortener is forbidden — it would break the zero-backend rule and the privacy story. Instead, every tool encodes state via the project-wide compact-URL convention (`src/utils/shared/compactUrl.ts`): single-letter scalar keys, tuple-packed records (`a1=Name~Value~Currency~Type`), and default-omission per field. A realistic 8-row multi-currency share URL fits in ~334 chars (vs ~1,200 chars under a naive per-field layout), and the redacted "share-anonymously" variant is ~85 chars. Tools that exceed ~700 chars on a typical full-share payload should re-examine their wire format before adding fields.
- **Pattern consistency**: Every tool follows the same structure established by the two shipped tools:
  - Astro page at `/free/<slug>.astro` with full SEO frontmatter (JSON-LD, FAQ schema, breadcrumbs)
  - React component with `useState`/`useMemo`/`useEffect` for state, computation, and URL sync
  - Math utility module with pure functions (testable under `node --test`)
  - URL codec module for shareable query-string encoding, built on the shared compact-URL helpers (`encodeTuple`, `decodeTuple`, `setNonDefault`, `serializeParams` from `src/utils/shared/compactUrl.ts`)
  - Scoped `<style>` block with prefixed CSS classes (e.g. `lc-`, `cr-`)
  - PostHog events for key interactions
  - URL-length regression test that asserts a representative full-share payload stays under a documented byte budget

---

## Phase Boundaries

### Beta (Current — Phase 1)

**Goal**: Validate the free-tool-to-signup funnel with two preview tools. Prove the model works before scaling.

Beta tools are framed as **preview tools** — they answer one question with one number, then dedicate the bottom half of the page to a CTA showing what the user gets by connecting their real assets in the main product. The standalone tool must intentionally do *less* than the in-app free tier so the funnel direction is unambiguous.

**Deliverables**:

| # | Tool | Effort | Status |
|---|------|--------|--------|
| 1 | FIRE Number Calculator (preview) | 2 days | Not started |
| 2 | Coast FIRE Calculator (preview) | 2 days | Not started |

**Success metrics**:

- 200+ monthly visitors to free tools
- 10%+ conversion rate from tool usage to signup
- Measurable referral traffic from FIRE/expat communities

**Gating criteria for Public Launch** (all must be true before starting Phase 2):

- [ ] Beta tools (FIRE Number + Coast FIRE) live and stable
- [ ] Tool-to-signup conversion >= 10% confirmed via PostHog
- [ ] At least one tool getting organic search traffic
- [ ] No critical UX issues outstanding

### Public Launch (Phase 2)

**Prerequisite**: All beta gating criteria met.

**Goal**: Scale the suite to 7 tools (2 built + 2 beta + 3 public launch). Each public-launch tool fills a content gap on a non-saturated keyword and points users into the main product.

**Deliverables**:

| # | Tool | Effort | Dependencies |
|---|------|--------|--------------|
| 1 | Simple Monte Carlo Tester | 2-3 days | None — `Math.random()` |
| 2 | Cash Shortfall Predictor | 2-3 days | None — arithmetic loop |
| 3 | Life Event Impact Calculator | 2-3 days | Lookup tables (hardcoded) |

**Success metrics** (cumulative across all 7 tools):

- 1,000+ monthly visitors to free tools
- 15%+ conversion rate from tool usage to signup
- 250+ backlinks/referrals from FIRE and expat communities

---

## Tools Built

### Currency Risk Analyzer

**Phase**: Built (shipped during beta prep)
**Live at**: `/free/currency-risk`

**Purpose**: Expat differentiator — users add assets and liabilities across currencies, see net currency concentration with live exchange rates, and share results with data or anonymously.

**Source files**:

| File | Purpose |
|------|---------|
| `src/pages/free/multi-currency-net-worth.astro` | Astro page: SEO frontmatter, JSON-LD, FAQ schema, breadcrumbs, related-reading blog cards, scoped `mcnw-` CSS. (Renamed from `currency-risk.astro` on 2026-05-17 alongside the URL move from `/free/currency-risk` to `/free/multi-currency-net-worth`; the old URL serves a meta-refresh redirect.) |
| `src/components/MultiCurrencyNetWorth.tsx` | React component (~1300 lines): AssetTable, CSV upload, ResultsPanel with SVG donut chart, Toolbar, PostHog events. (Renamed from `CurrencyRiskAnalyzer.tsx`.) |
| `src/utils/multi-currency-net-worth/math.ts` | Pure functions: `aggregate` (per-currency netting + concentration), `assessRisk`, `parseCSV`, `isSupportedCurrency`, `formatPct`. (Renamed from `src/utils/currencyRiskMath.ts`.) |
| `src/utils/multi-currency-net-worth/url.ts` | Dual-mode URL codec: full-data encoding + redacted encoding. (Renamed from `src/utils/currencyRiskUrl.ts`.) |
| `src/utils/multi-currency-net-worth/math.test.ts` | Tests for math utils |
| `src/utils/multi-currency-net-worth/url.test.ts` | Tests for URL codec |

**Inputs (per asset row)**:
- Asset name (optional, free-text)
- Current value (major-unit amount, positive number)
- Currency (select from 11 supported currencies, reuses catalogue from `loanMath.ts`)
- Type toggle: Asset (default) / Liability

**Global inputs**:
- Functional currency (the currency the user spends in) — results displayed in this currency; excluded from risk flagging
- CSV file upload (optional bulk input)

**Aggregation logic** (all browser, zero backend):

1. Group rows by currency
2. Per currency: `net = sum(asset amounts) − sum(liability amounts)`
3. Convert each net to functional currency using fetched exchange rates
4. Total = sum of converted nets. Per-currency % = `converted_net / total × 100`
5. Risk assessment per non-functional currency:
   - < 20%: Low exposure
   - 20–40%: Moderate exposure
   - > 40%: Elevated exposure (recommend review)
   - Functional currency: "Your spending currency" — never flagged
   - Net-negative position: "Net debt in X" label

**Outputs**:
- Total net worth in functional currency (large-format number)
- SVG donut chart of net currency concentration (inline SVG, viewBox, aria-label, screen-reader-only data table)
- Per-currency risk assessment cards: colored badge (green/yellow/red), concentration %, actionable recommendation
- Overall risk summary sentence
- Exchange rate source attribution (ECB reference rates, dated)

**Exchange rates**: Uses [Frankfurter API](https://frankfurter.app) — free, no API key, ECB reference rates updated daily, called directly from browser.
- Fetched on mount + when functional currency changes
- Loading state: subtle spinner overlay on results panel; inputs remain editable
- Error state: yellow banner "Exchange rates unavailable — showing raw amounts without conversion" + retry button; donut chart still renders with caveat

**CSV Upload**:
- Format (name and type columns optional):
  ```csv
  name,value,currency,type
  US Stocks,50000,USD,asset
  US Mortgage,60000,USD,liability
  Apartment,200000,EUR,asset
  ,1000000,INR,asset
  ```
- Hand-rolled parser (~50 lines, zero dependencies)
- Replaces existing rows (not append) — confirmation prompt warns before overwriting
- Partial import on errors: valid rows populate, failed rows listed with line numbers and reasons

**URL Sharing — Two Modes**:

1. **Share with data** (full asset details in URL):
   ```
   ?a1_n=US+Stocks&a1_v=50000&a1_c=USD&a1_t=asset&a2_v=60000&a2_c=USD&a2_t=liability&func=EUR
   ```
   Empty/default fields omitted to keep URLs compact.

2. **Share anonymously** (only concentration % and risk levels):
   ```
   ?func=EUR&anon=1&c_USD=28.5&r_USD=moderate&c_EUR=71.5&r_EUR=functional
   ```

Both modes: `navigator.clipboard.writeText` with "Link copied" confirmation. Split-button dropdown UI.

**Edge cases handled**:

| Case | Behavior |
|------|----------|
| Zero assets added | "Add at least one asset to see your currency concentration" |
| Single asset | Donut shows 100%; risk = functional (if currency matches) or low |
| Net negative in a currency | Red bar in chart, "Net debt in X" label, note about leverage |
| Total net worth ≤ 0 | "Your net worth is zero or negative — risk assessment not meaningful" |
| Frankfurter API down | Yellow banner, raw (unconverted) amounts, donut rendered with caveat, retry button |
| URL > 2000 chars (full-data mode) | Truncate asset names in URL, brief warning on copy |
| CSV with invalid rows | Partial import: valid rows populate, invalid rows listed with reasons |
| All currencies match functional currency | "No currency risk detected — all your net worth is in your spending currency" |

**PostHog events**: `currency_risk_asset_added`, `currency_risk_csv_uploaded`, `currency_risk_currency_changed`, `currency_risk_share_copied` (with mode), `currency_risk_reset`

**SEO Keywords**: currency risk calculator, multi currency net worth, expat financial planning, currency diversification, currency exposure calculator, foreign exchange risk, currency concentration, net worth by currency, multi-currency portfolio analyzer, currency risk assessment

---

### Loan Comparison Calculator

**Phase**: Built (shipped before beta)
**Live at**: `/free/loan-comparison`

**Purpose**: Compare two loan scenarios side-by-side across rate, tenure, and amount. Users see amortization schedules, total interest, and a visual balance chart.

**Source files**:

| File | Purpose |
|------|---------|
| `src/pages/free/loan-comparison.astro` | Astro page: SEO frontmatter, JSON-LD, FAQ, breadcrumbs, scoped `lc-` CSS |
| `src/components/LoanCompare.tsx` | React component: loan input form, BalanceChart (SVG), amortization table, PostHog events |
| `src/utils/loanMath.ts` | Pure functions: EMI calculation, amortization schedule generator, CURRENCIES catalogue |
| `src/utils/loanCompareUrl.ts` | URL codec: encodes loan inputs as query-string params |
| `src/utils/loanCompareInputs.ts` | Input parsing + validation for query-string decoding |

**Inputs (per loan)**: Principal amount, annual interest rate (%), loan tenure (years + months), currency (from 11 supported).

**Outputs**: Monthly EMI, total interest paid, side-by-side amortization schedule, SVG balance-over-time chart, difference in total cost.

**Edge cases handled**: Single loan, identical loans, zero interest rate, zero principal, URL sharing with partial params, invalid query-string values.

**SEO Keywords**: loan comparison calculator, compare home loans, EMI calculator, loan amortization, mortgage comparison

---

## Beta Deliverables

**Phase 1 | Effort: ~1 week | Prerequisite: None**

These two tools complete the beta free-tool suite (alongside the already-built Currency Risk Analyzer and Loan Comparison Calculator). FIRE Number and Coast FIRE share the same SWR toggle and real-vs-nominal labelling, so building them together avoids rework.

### Preview-Tool Pattern

Both Beta tools are explicitly framed as **preview tools**. The main product's free tier already shows a logged-in user their FIRE number and Coast FIRE status from their actual assets — so a standalone calculator that asks the user to retype net worth and expenses must do *less* than that, not more, otherwise it cannibalizes signups.

Layout discipline (applies to both):

- **Top half of page**: Minimal input form (4-5 fields max), one headline number, one tiny chart. No URL sharing. No CSV upload. No save button. No multi-scenario toggle.
- **Bottom half of page**: A persistent CTA panel (not a modal, not a popup) showing what the user gets by signing up — multi-asset modeling, what-if scenarios, real return tracking against actual portfolio, multi-currency, life events, etc. The CTA panel is the same height as the result card so users can't miss it.
- **No "save your result" feature** — that's the signup CTA. No "share with friends" — that drives traffic to the static page, not the product.
- The page exists to rank on the keyword, deliver the headline number, and route motivated users into the funnel. That's it.

### FIRE Number Calculator (Preview)

**Purpose**: Rank on a high-volume FIRE keyword and route Tomas/Eva into the signup funnel. Saturated category — differentiation is brand (multi-currency mention, expat framing) and conversion (CTA-heavy layout).

**Inputs** (4 fields): Annual expenses, current net worth, monthly savings, safe withdrawal rate (default 4% / 25x; toggle to 3.3% / 30x).

> **Financial accuracy note (per Jan)**: The 4% rule (25x expenses) is the recognized standard but must be adjustable. Offer 25x / 30x multipliers corresponding to 4% / 3.3% withdrawal rates (European FIRE practitioners often use 3.3% due to longer expected retirement horizons). Default to real (inflation-adjusted) returns and label the return field accordingly. Do NOT conflate nominal vs. real return — the calculator must be explicit.

**Outputs** (one screen, no tabs): FIRE number (expenses × multiplier), years to FIRE at current savings rate, savings rate %. That's it. No amortization table, no monthly projection, no scenario comparison.

**Traffic Hook**: "Find your FIRE number in 60 seconds"

**CTA Panel (bottom half — required content)**:
- Headline: "This is the textbook FIRE number. Yours is more nuanced."
- Three bullets showing what the user gets in the product: (1) FIRE projected from your actual asset mix and growth rates, (2) Lean / Traditional / Fat / Coast FIRE all computed together, (3) Multi-currency support if you earn, spend, or retire in different currencies.
- Primary CTA: "Connect your assets — free, 5 minutes"

**Formulas (all client-side)**:
- FIRE number = `annualExpenses / withdrawalRate`
- Years to FIRE = solve `currentNW × (1+r)^n + monthlySavings × ((1+r)^n − 1) / (r/12) = fireNumber` for n
- Savings rate = `monthlySavings / (monthlySavings + monthlyExpenses)`

**Source files to create**:

| File | Purpose |
|------|---------|
| `src/pages/free/fire-calculator.astro` | Astro page with SEO, FAQ, breadcrumbs, scoped CSS, CTA panel |
| `src/components/FireCalculator.tsx` | React component: inputs, single result card, PostHog events |
| `src/utils/fireMath.ts` | Pure functions ported from `projection_service.py` |

**PostHog events**: `fire_preview_calculated`, `fire_preview_cta_clicked` (must distinguish CTA click from external bounce)

**SEO Keywords**: fire calculator, fire number, when can I retire, financial independence calculator, 4% rule calculator

---

### Coast FIRE Calculator (Preview)

**Purpose**: Less saturated than vanilla FIRE Number; the "stop saving" framing has high shareability in r/coastFIRE. Same preview discipline as FIRE Number.

**Inputs** (5 fields): Current age, current net worth, target retirement age, annual expenses in retirement, real (inflation-adjusted) annual return.

> **Financial accuracy note (per Jan)**: The most common credibility mistake is mixing real and nominal returns. The UI must label the return field as "Real (inflation-adjusted) annual return" with a tooltip explaining that nominal return ≈ real return + inflation (e.g. 7% nominal − 2.5% inflation = 4.5% real). This is the #1 issue FIRE communities will call out.

**Outputs** (one screen): Coast FIRE number, gap vs. current NW, coast-at-age (single number — "you can stop saving at age X"). No timeline visual, no scenario explorer, no SWR toggle on this preview (default to 4%; SWR exploration is a Pro-tier reason to sign up).

**Traffic Hook**: "Can you stop saving and still retire?"

**CTA Panel (bottom half — required content)**:
- Headline: "You hit Coast FIRE on paper. Here's what changes that in real life."
- Three bullets: (1) Track Coast FIRE status against your actual portfolio, recomputed daily, (2) Model what happens if returns underperform, (3) See how a child, sabbatical, or relocation moves your coast date.
- Primary CTA: "Track your Coast FIRE — free, 5 minutes"

**Formulas (all client-side)**:
- `RetirementTarget = annualExpenses / withdrawalRate` (withdrawalRate = 4% on this preview)
- `CoastFIRE = RetirementTarget / (1 + r)^(retirementAge − currentAge)`
- Coast-at age: solve `currentNW × (1+r)^n = RetirementTarget / (1+r)^(retirementAge − (currentAge+n))` for n

**Source files to create**:

| File | Purpose |
|------|---------|
| `src/pages/free/coast-fire.astro` | Astro page with SEO, FAQ, breadcrumbs, scoped CSS, CTA panel |
| `src/components/CoastFireCalculator.tsx` | React component: inputs, single result card, PostHog events |
| `src/utils/coastFireMath.ts` | Pure functions: coast number, gap, coast-at-age solver |

**PostHog events**: `coast_fire_preview_calculated`, `coast_fire_preview_cta_clicked`

**SEO Keywords**: coast fire calculator, coast fire number, stop saving calculator, coast FIRE Europe

---

## Public Launch Deliverables

**Phase 2 | Effort: ~1.5 weeks | Prerequisite: Beta gating criteria met**

These 3 tools scale the suite from 4 (after beta) to 7. Each is a self-contained Astro page + React component with zero backend. Ship order: **Cash Shortfall → Life Event → Monte Carlo**. Cash Shortfall and Life Event have weak free-tool competition; Monte Carlo is more saturated (ProjectionLab and ActuaPlan both offer free Monte Carlo) so it ships last with the most differentiation work.

### Cash Shortfall Predictor

**Purpose**: Project month-by-month cash flow runway and flag deficit months. Uncontested in the free-tool space — no major competitor offers a forward-looking cash runway calculator without signup. Closest analogues are budgeting apps (YNAB, Spendee) which are backward-looking, not predictive.

**Competitive context**:
- **YNAB / Wallet / Spendee**: Backward-looking budgeting, not month-by-month future projection. Require account.
- **ProjectionLab Premium**: Has Sankey cash flow but paid only ($129/yr).
- **Generic "budget calculators" (NerdWallet, Bankrate)**: Static one-month snapshot, no future projection.
- **Our angle**: 12-36 month projection, anonymous, no signup, multi-currency. Genuinely uncontested for the runway query.

**Inputs**: Monthly income, monthly fixed expenses, monthly variable expenses, timeline (12–36 months), expected changes (one-time bonus, raise on date X, new recurring expense from date Y). Currency selector.

**Scope guard**: Cash *runway* tool only — projects spendable cash month by month. **Do not** add asset stress-testing, market-drop scenarios, or portfolio modeling. Those are paid Monte Carlo / what-if territory.

**Outputs**: Month-by-month cash flow chart, specific months with projected deficits highlighted, total shortfall amount, narrative summary ("You go negative in month 14 by €2,400").

**Traffic Hook**: "Will you run out of cash? See your future month by month"

**CTA Panel**: "Connect your real income, expenses and recurring contributions in nidhi to project runway against your full asset base — and see how a market drop, raise, or relocation changes the picture."

**Implementation**: Month-by-month arithmetic loop — apply expected changes on their trigger dates, compute running balance, flag deficit months. All in the browser.

**Source files to create**:

| File | Purpose |
|------|---------|
| `src/pages/free/cash-shortfall.astro` | Astro page |
| `src/components/CashShortfallPredictor.tsx` | React component |
| `src/utils/cashShortfallMath.ts` | Pure functions: month-by-month projector, deficit detector |

**SEO Keywords**: cash runway calculator, will I run out of money, monthly cash flow projection, cash shortfall predictor, when will I go broke calculator

---

### Life Event Impact Calculator

**Purpose**: Model how a single major life event (child, sabbatical, relocation, job loss, downsize) shifts retirement age and net worth trajectory. Genuinely uncontested in the free-tool space — competitors' content is articles, not interactive tools.

**Competitive context**:
- **Articles abound** (USDA cost-of-child reports, expat relocation guides, NerdWallet "cost of a baby") but they're static lists, not calculators.
- **ProjectionLab**: Lets users add custom milestones in paid tier; no free standalone life-event tool.
- **ActuaPlan**: Retirement-only; doesn't model child or relocation events.
- **Our angle**: Pick one event, see its impact on FIRE/retirement age in 30 seconds, anonymous, no signup. The interactive format is the differentiation; we are not competing on cost-data depth.

**Life events supported (v1)**: Having a child, career break (6–12 months), relocating to another country, job loss (3–6 months). Defer "downsizing home" until v2 — too many sub-variables.

**Scope guard**: **One event at a time**. The paid product's value is composing many life events with the actual asset base — the free tool must not let users stack multiple events.

**Inputs**: Current age, current monthly expenses, current monthly savings, expected real return rate, selected life event (with event-specific sub-fields, e.g. "country" for relocation).

**Outputs**: One-time cost estimate, ongoing monthly cost impact, retirement age delta ("This pushes your FIRE date out by 2.4 years"), one-paragraph narrative.

**Traffic Hook**: "How much does a baby actually cost your retirement?"

**CTA Panel**: "Stack multiple life events against your real assets in nidhi — model a child + relocation + sabbatical together and see how your full plan changes."

**Implementation**: Hardcoded lookup tables with cost estimates per life event (sourced from public research — government cost-of-child reports, expat relocation studies). Cite sources visibly under the result. All math in the browser.

**Source files to create**:

| File | Purpose |
|------|---------|
| `src/pages/free/life-event.astro` | Astro page |
| `src/components/LifeEventCalculator.tsx` | React component |
| `src/utils/lifeEventMath.ts` | Pure functions + cost lookup tables (with source citations) |

**SEO Keywords**: cost of having a baby calculator, career break cost calculator, relocation cost calculator, job loss financial impact, sabbatical cost

---

### Simple Monte Carlo Retirement Tester

**Purpose**: Anonymous, 3-input, no-signup Monte Carlo for users who Google "monte carlo retirement calculator" and don't yet want a ProjectionLab or ActuaPlan account. Saturated category — ship last with the most differentiation work.

**Competitive context (this is the most contested tool — read carefully)**:
- **ProjectionLab free tier**: Includes Monte Carlo but **requires a signup** and has a richer onboarding (asset categories, withdrawal strategies). Strong product, US-first.
- **ActuaPlan free tier**: 10K Monte Carlo paths, 1 saved plan, **anonymous access available**. Actuarial-grade. US-centric pricing ($12/mo).
- **Empower / Personal Capital**: Free Monte Carlo retirement planner — but EU users are blocked.
- **Generic calc sites (Bankrate, NerdWallet)**: Deterministic only, no Monte Carlo.
- **Our angle (the only defensible ones)**: (1) **3 inputs, 60 seconds** — every other tool requires more onboarding; (2) **anonymous, no email capture** — ProjectionLab requires signup; (3) **multi-currency** — every competitor is single-currency display; (4) **EU-native framing** in the page copy. We are not trying to be more sophisticated than ProjectionLab. We are the page someone lands on at 11pm before they're ready to commit to anything.

**Scope guard**: 3 inputs only. **No** asset-class breakdown, **no** sequence-of-returns risk modeling, **no** custom withdrawal strategies, **no** save scenarios, **no** historical-data backtesting. The moment we add any of these we become a worse ProjectionLab. The moment we add asset-level inputs we cannibalize the paid product.

**Inputs**: Current savings, monthly contribution, years to retirement. Currency selector. (4 fields including currency.)

**Outputs**: Probability of success (success = nest egg ≥ 25× annual expenses at retirement age), 10th/50th/90th percentile final balance, "On track / Consider adjusting" verdict, simple percentile fan chart.

**Traffic Hook**: "Will your retirement plan work? Test 1,000 possible futures in 60 seconds"

**CTA Panel**:
- Headline: "This Monte Carlo uses generic assumptions. Yours doesn't have to."
- Bullets: (1) Run Monte Carlo against your actual asset mix and per-asset growth rates [Phase 2 product feature], (2) Model your real expenses, recurring contributions, and life events, (3) See sequence-of-returns risk against your withdrawal plan.
- Primary CTA: "Connect your assets — free, 5 minutes"

**Implementation**: 1,000 simulation paths using `Math.random()` in the browser. Each path samples annual returns from a normal distribution (mean 5% real, stddev 12%) and compounds. Default assumptions documented under the result.

**Source files to create**:

| File | Purpose |
|------|---------|
| `src/pages/free/monte-carlo.astro` | Astro page with assumption disclosure |
| `src/components/MonteCarloTester.tsx` | React component: 4 inputs, single result card, percentile chart |
| `src/utils/monteCarloMath.ts` | Pure functions: simulation runner, percentile calculator, success-rate computation |

**SEO Keywords**: simple retirement calculator, monte carlo retirement calculator, will my savings last, retirement probability calculator, anonymous retirement calculator

---

## Tools Considered and Cut

The plan previously listed 9 tools. Two were cut after a deeper audit against the main product (NetWorthAndExpenses), the blog content, and the competitive landscape. Documenting them here so future versions don't reintroduce them without re-litigating the reasoning.

### ❌ Avalanche vs Snowball Calculator (cut)

**Status**: Cut from beta on 2026-05-17.

**Why originally proposed**: Blog post #05 ("How to Get Out of Debt: Snowball vs. Avalanche") already exists; the keyword has high intent; the main product has no head-to-head debt-strategy comparator.

**Why cut**: **Saturated category**. NerdWallet, Bankrate, Ramsey Solutions, Mint/Credit Karma, Magnify Money, Forbes Advisor, and dozens of bloggers all rank for "avalanche vs snowball calculator." Domain authority and backlink profiles dwarf ours. Even with a better tool, organic ranking is unrealistic in <12 months. Build cost is not justified by the achievable traffic.

**What replaces it**: The existing blog post #05 stays; it answers the educational question and links to the main product CTA. We do not build a calculator that competes for a saturated commodity keyword.

**Reconsider when**: We have domain authority to rank against generalist personal-finance sites, OR we discover an angle no incumbent occupies (e.g. multi-currency debt across countries, common for expats).

---

### ❌ Historical Net Worth Simulator (cut)

**Status**: Cut from public launch on 2026-05-17.

**Why originally proposed**: Framed as "no competitor has this."

**Why cut**: **Direct cannibalization of a paid Phase 2 feature**. The main product already has full snapshot infrastructure (`/networth/history`, `/networth/chart-data`, `/networth/dip-analysis`) and the Phase 2 "time-travel UX" is *the* promised paid upgrade. A free tool that lets users plug in past net worth and chart their journey trains them to expect this for free, then to feel the paid feature is overpriced when it lands. The framing "no competitor has this" applies to the *paid* product — not to a free top-of-funnel tool.

**What replaces it**: Nothing. The main product covers this; the free-tool slot goes to non-overlapping capability.

**Reconsider when**: Never as proposed. If we revisit, scope must be radically narrower — e.g. a single "your net worth on date X" backsolve from one input, with zero per-asset detail, and only as a teaser for the paid time-travel UX.

---

## Conversion Funnel

**Visitor** → **Uses tool (60 seconds)** → **Sees result + CTA panel below the fold** → **Connect-your-assets landing page** → **Signup**

### Funnel Discipline

The free tools' job is to send qualified visitors into the main product, not to be a destination. Three rules apply to every tool:

1. **No "save your results" feature.** Saving is the hook for signup, not a feature of the tool. The CTA *is* the save action: "to save this and run it against your real assets, connect your account."
2. **No email capture from the tool itself.** Email capture creates a soft funnel that rarely converts. The hard funnel is "connect your assets" — same friction, but at least the email comes with intent.
3. **The CTA panel is required content, not a bolt-on.** It must occupy the bottom half of the page, be visually equivalent to the result card, and explicitly name what the user gets in the product (not generic "see your full financial picture").

### CTA panel content (per-tool)

Each tool has a tool-specific CTA panel — see the per-tool sections above for the exact headline and bullets. Generic CTAs are forbidden because they don't convert; the CTA must connect the user's *just-revealed* result to a concrete next-step capability in the product (e.g. "you got a Monte Carlo result on generic assumptions — run it against your actual asset mix").

### Conversion optimization (post-launch)

- A/B test the CTA panel headline against alternatives.
- Track tool-to-CTA-click and CTA-click-to-signup separately in PostHog.
- Optionally add an exit-intent prompt **only if** the CTA-click-rate baseline is established and the prompt is shown to test variants only — not as a default mechanism.

---

## Content Marketing Strategy

### Launch Channels

| Tool | Primary channel | Secondary | Content angle |
|------|----------------|-----------|---------------|
| Currency Risk Analyzer | r/expats, r/IWantOut, r/EuropeFIRE | r/PersonalFinanceCanada (expat threads), Facebook expat groups | "I built a multi-currency net worth tool for expats — track risk across currencies" |
| Loan Comparison | r/personalfinance, r/MortgagesCanada | r/Czech (mortgage threads) | "Compare two loan offers side-by-side, no signup" |
| FIRE Number (preview) | r/EuropeFIRE, r/FIREyFemmes | r/Fire (general) | "60-second FIRE number — connect your real assets in nidhi to refine" |
| Coast FIRE (preview) | r/coastFIRE, r/EuropeFIRE | r/FinancialIndependence | "Can you stop saving and still retire? Quick check" |
| Cash Shortfall Predictor | r/personalfinance, r/ynab | r/povertyfinance, r/leanfire | "Project your cash runway 12-36 months ahead" |
| Life Event Impact | r/Parenting (financial threads), r/careerguidance | r/IWantOut (relocation), r/sabbatical | "How much does a baby actually delay your retirement?" |
| Monte Carlo Tester | r/EuropeFIRE, r/financialindependence | r/Bogleheads | "Anonymous 60-second retirement Monte Carlo, no signup" |

### Content Plan

- 1 blog post per *new* tool (5 posts: FIRE Number, Coast FIRE, Cash Shortfall, Life Event, Monte Carlo). Currency Risk and Loan Comparison are already shipped — post-shipping promo only.
- **One head-to-head comparison post per major free competitor**: "ProjectionLab vs nidhi free tools", "ActuaPlan vs nidhi free tools", "Empower / Personal Capital alternatives for EU users". These are high-intent SEO and double as feature pages.
- One round-up post: "Best free FIRE calculators for European expats (2026)".
- Guest posts on European FIRE blogs (e.g. The Poor Swiss, Mr Free At 33, Indeedably) and Czech personal finance sites — focus on multi-currency angle, since incumbents don't cover it.

### Tools Landing Page

Eventually: a `/free/` landing page with:
- Headline: "Free Financial Planning Tools"
- Subheadline: "No signup. No data leaves your browser. Multi-currency. Built for expats and FIRE enthusiasts."
- Grid of all 7 tools with icons and descriptions
- Comparison row showing what's free here vs. ProjectionLab / ActuaPlan / Empower (anonymous? multi-currency? EU-accessible?)
- CTA to the main product

---

## Free-Tool Competitive Landscape

The main product competes against 12 tracked competitors (see [Competitive Matrix](../../../NetWorthAndExpenses/docs/research/COMPETITIVE_MATRIX.md) in the main repo). For free tools specifically — i.e. what users hit when they Google a calculator term and don't yet have an account anywhere — the relevant set is narrower. This section covers each one, what they offer for free, and our defensible angle.

### The honest assessment

We do not have domain authority to outrank NerdWallet, Bankrate, or Ramsey on commodity keywords. We do not have a free Monte Carlo product more sophisticated than ProjectionLab. We do not aggregate banks like Empower. **What we have is**: per-asset multi-currency, anonymous-no-signup, EU-native framing, and a focused 60-second-answer UX. Every tool's positioning has to lean on at least one of those four — otherwise the tool should not be built.

### Competitor matrix (free-tool surface)

| Competitor | Free FIRE/retirement calc | Free Monte Carlo | Free Coast FIRE | Free debt comparator | Free cash flow projection | Free life-event tool | Free per-asset multi-currency NW | Anonymous (no signup) | EU-accessible |
|---|---|---|---|---|---|---|---|---|---|
| **ProjectionLab** ($129/yr) | ✅ | ✅ | ✅ | partial | ✅ | ❌ | ❌ display-only | ❌ requires signup | ✅ |
| **ActuaPlan** ($144/yr) | ⚠️ retirement-shaped | ✅ 10K paths | ❌ | ❌ | ⚠️ retirement cash | ❌ | ⚠️ FX modeled | ✅ | ✅ |
| **Empower / Personal Capital** | ✅ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ requires signup + US account | ❌ EU-blocked |
| **Monarch Money** ($99/yr) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ trial-only | ❌ US-only |
| **Kubera** ($249/yr) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ cross-border (paid) | ❌ trial-only | ✅ |
| **Wallet (BudgetBakers)** | ❌ | ❌ | ❌ | ❌ | ❌ (backward) | ❌ | ❌ | ❌ requires signup | ✅ |
| **Spendee** | ❌ | ❌ | ❌ | ❌ | ❌ (backward) | ❌ | ❌ | ❌ | ✅ |
| **YNAB** ($109/yr) | ❌ | ❌ | ❌ | ❌ | ❌ (backward budgeting) | ❌ | ❌ | ❌ trial-only | ⚠️ no EU bank sync |
| **NerdWallet / Bankrate / Ramsey** | ✅ | ❌ | rare | ✅ avalanche/snowball | ⚠️ static one-month | ❌ articles | ❌ | ✅ | ✅ |
| **Czech banking apps** (George, Air Bank, Raiffeisen, Moneta, ČSOB) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ requires bank account | ✅ |
| **Our free tools** | ✅ preview | ✅ 3-input | ✅ preview | ❌ deliberately cut | ✅ runway predictor | ✅ single-event | ✅✅ Currency Risk Analyzer | ✅✅ all tools | ✅✅ EU-native |

### Per-tool competitive positioning

#### 1. Currency Risk Analyzer ✅ (built)
- **Direct free competitor**: None.
- **Closest paid**: Kubera ($249/yr) for HNW with cross-border assets.
- **Why we win**: Only free tool with per-asset multi-currency net worth + risk concentration. Genuinely uncontested.
- **SEO opportunity**: HIGH — "multi-currency net worth", "currency risk calculator", expat-specific long-tails are not occupied by major incumbents.

#### 2. Loan Comparison ✅ (built)
- **Direct free competitors**: NerdWallet, Bankrate, Ramsey, every bank's site. Saturated.
- **Why this is acceptable to keep**: Already shipped; reuses currency catalogue from main product; the multi-currency angle has weak but non-zero differentiation for expats with EUR/USD/CZK/GBP comparisons.
- **SEO opportunity**: LOW — don't expect this to drive organic traffic. It's a utility, not a hook.

#### 3. FIRE Number Calculator (preview)
- **Direct free competitors**: ProjectionLab (free tier, signup), Networthify, FIRECalc, Choose FI calculators, Mr Money Mustache's calculator.
- **Why we win**: Anonymous no-signup + 60-second UX + EU-default real-return framing + multi-currency. We are not trying to be more sophisticated than ProjectionLab; we are the no-friction landing page.
- **SEO opportunity**: MEDIUM — saturated keyword but the long-tail "fire calculator europe", "fire calculator real returns", "fire calculator no signup" is more open.
- **Risk**: Without strong differentiation copy, this tool ranks behind ProjectionLab and Networthify. Saturation acknowledged.

#### 4. Coast FIRE Calculator (preview)
- **Direct free competitors**: walletburst.com (the dominant Coast FIRE calculator), ProjectionLab.
- **Why we win**: walletburst is the de-facto winner here and we're unlikely to outrank it. Our angle is the multi-currency / EU framing and a hard CTA into the paid product (which walletburst doesn't have — it's just a calculator).
- **SEO opportunity**: LOW-MEDIUM. Realistic outcome is referral traffic from FIRE blogs, not search dominance.

#### 5. Cash Shortfall Predictor
- **Direct free competitors**: None for forward-looking month-by-month runway. NerdWallet has static "monthly budget" calculators; YNAB and budgeting apps are backward-looking.
- **Why we win**: Forward projection is uncontested in the free space. Multi-currency. The "when do I go broke" framing has strong intent.
- **SEO opportunity**: HIGH — "cash runway calculator", "when will I run out of money", "cash flow projection calculator" are not occupied by major incumbents.

#### 6. Life Event Impact Calculator
- **Direct free competitors**: None as interactive calculators. NerdWallet, BabyCenter, USDA reports, etc. have *articles* on life-event costs but not interactive tools that show retirement-age impact.
- **Why we win**: Interactive format + retirement-age delta as the headline output (not just "cost of X"). Multi-currency.
- **SEO opportunity**: HIGH — "how much does a baby cost calculator", "career break cost calculator", "sabbatical cost", "relocation cost calculator" — articles dominate but interactive calculators don't.

#### 7. Simple Monte Carlo Tester (saturated, ship last)
- **Direct free competitors**: ProjectionLab (signup required), ActuaPlan (anonymous, 10K paths), ficalc.app, cFIREsim, Empower (EU-blocked).
- **Why we *might* win**: 3 inputs, no signup, EU-native, multi-currency, no email capture. Simpler than every alternative.
- **Why we might not**: ActuaPlan also offers anonymous Monte Carlo. ProjectionLab dominates SEO. We are a lightweight alternative, not a replacement.
- **SEO opportunity**: MEDIUM. "Simple monte carlo retirement calculator" and "anonymous retirement calculator" are realistic targets. "Monte carlo retirement calculator" alone is not.

### Strategic implication for the suite

The audit produced the following hierarchy of organic traffic potential:

| Rank | Tool | Realistic SEO outcome | Realistic role |
|---|---|---|---|
| 1 | Currency Risk Analyzer | Top 3 for "multi-currency net worth", "currency risk calculator" within 6 months | Hero — drives expat audience |
| 2 | Cash Shortfall Predictor | Top 5-10 for "cash runway calculator" within 9 months | Workhorse — Eva/Petra audience |
| 3 | Life Event Impact | Top 10 for life-event-cost long-tails within 9 months | Workhorse — Jiri/Marcus audience |
| 4 | Monte Carlo (simple) | Top 20 for "simple/anonymous retirement calculator" within 12 months | Funnel filler — Tomas audience |
| 5 | FIRE Number (preview) | Mid-page-1 for long-tails; not ranking for the head term | Funnel filler |
| 6 | Coast FIRE (preview) | Referral traffic, not SEO | Funnel filler |
| 7 | Loan Comparison | No organic ranking expected | Utility only |

**Recommendation**: invest the most differentiation work (copy, design, sharing, blog posts) in tools 1-3, where we have a defensible angle. Tools 4-6 are funnel fillers — ship them lean, optimize the CTA, don't expect them to drive top-of-funnel volume.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Free tools cannibalize the paid product | Beta tools are explicitly framed as preview tools with hard CTA panels; deliberately do *less* than the in-app free tier. Historical Net Worth Simulator was cut for this reason. |
| ProjectionLab adds EU localization or per-asset currency | Architectural moat (per-asset currency is non-trivial to retrofit); accelerate Czech/Polish content; emphasize anonymous-no-signup advantage in tool copy. |
| ActuaPlan iterates on free tier (already has 10K MC + anonymous access) | Compete on simplicity (3 inputs vs their actuarial onboarding) and on tools they don't offer (Currency Risk, Cash Runway, Life Event). |
| Empower / Personal Capital launch in EU | Current threat is low (12-18mo away minimum); use head-start to build SEO and brand in Czech/EU FIRE communities. |
| Saturated category dragging average performance down | Loan Comparison and FIRE Number are SEO-saturated and treated as funnel fillers, not traffic drivers. Don't measure them on organic visitors; measure on conversion of arriving visitors. |
| Low conversion rates | A/B test CTA panels; the result page must always show what the user gets in the paid product, not just the calculator output. |
| Beta metrics don't justify Phase 2 | Gating criteria act as a kill-switch; no Phase 2 investment until beta validates the model. |
| Resource drain | Cut Avalanche vs Snowball and Historical Net Worth in v5.2 to focus build effort on differentiated tools. Continue this discipline at each phase boundary. |

---

## Dependencies

### Beta (Phase 1)

- ✅ nidhi-landing Astro project (BaseLayout, PostHog, SEO patterns)
- ✅ Two reference implementations shipped (Loan Comparison, Currency Risk Analyzer)
- ✅ Shared compact-URL codec (`src/utils/shared/compactUrl.ts`) — every new tool's `url.ts` builds on `encodeTuple` / `decodeTuple` / `setNonDefault` / `serializeParams`
- ✅ FIRE math formulas (documented, ported from `projection_service.py`)
- 🔄 `fireMath.ts` + `FireCalculator.tsx` (preview) + `fire-calculator.astro`
- 🔄 `coastFireMath.ts` + `CoastFireCalculator.tsx` (preview) + `coast-fire.astro`

### Public Launch (Phase 2)

- ⬜ Beta gating criteria met (see [Phase Boundaries](#phase-boundaries))
- ⬜ 3 sets of source files to create (page + component + math utils per tool):
  - `cashShortfallMath.ts` + `CashShortfallPredictor.tsx` + `cash-shortfall.astro`
  - `lifeEventMath.ts` + `LifeEventCalculator.tsx` + `life-event.astro`
  - `monteCarloMath.ts` + `MonteCarloTester.tsx` + `monte-carlo.astro`

---

## Related Documents

- [FIRE Categories plan](../done/phase-fire-categories-beta.md)
- [FIRE Refactor Implementation](phase-fire-refactor.md)
- [Competitive Matrix (full B2C)](../../../NetWorthAndExpenses/docs/research/COMPETITIVE_MATRIX.md) — 12 primary competitors tracked in main product repo
- [Customer Personas](../../../NetWorthAndExpenses/docs/product/CUSTOMER_PERSONAS.md)

---

**Document Version**: 5.3
**Last Updated**: 2026-05-17
**Status**: Implementing — Beta (Phase 1)
**Changelog**:
- v5.3 (2026-05-17): **Compact share URLs.** Introduced `src/utils/shared/compactUrl.ts` with `encodeTuple` / `decodeTuple` / `setNonDefault` / `serializeParams` helpers. Refactored both shipped tools (Currency Risk, Loan Comparison) to use single-letter scalar keys and tuple-packed records. Hard cutover — legacy long-form keys (`a1_name`, `v1_principal`, `mode=full`, `cur=`) no longer decoded. Real-world reduction: 8-row multi-currency share URL goes from ~1,200 chars to **334 chars** (~72% reduction), 1-row from ~157 to **66 chars** (~58%), redacted-anonymous share to **85 chars**. Added URL-length regression tests in both tools and documented the convention as a Beta-Phase-1 dependency for future tools (FIRE preview, Coast FIRE preview, etc.) to inherit.
- v5.2 (2026-05-17): **Audit pass.** Cut Avalanche vs Snowball (saturated category — NerdWallet/Bankrate/Ramsey domain authority makes ranking unrealistic). Cut Historical Net Worth Simulator (cannibalizes the Phase 2 paid time-travel UX in the main product). Reframed FIRE Number and Coast FIRE as **preview tools** with mandatory CTA panels — they must do *less* than the in-app free tier so signup direction is unambiguous. Added scope guards to Monte Carlo (3 inputs, no asset breakdown), Cash Shortfall (runway only, no asset stress-testing), Life Event (one event at a time). Replaced single-competitor (ActuaPlan) section with full **Free-Tool Competitive Landscape** covering ProjectionLab, ActuaPlan, Empower/Monarch/Kubera, Wallet/Spendee/YNAB, NerdWallet/Bankrate/Ramsey, and Czech banking apps — with per-tool defensible-angle analysis and realistic SEO outcomes. Tool count: 9 → 7 (2 built + 2 beta + 3 public launch).
- v5.1: Moved Avalanche vs Snowball Calculator (renamed from Debt Payoff Optimizer) to Beta. Simplified scope — avalanche vs snowball comparison only, no consolidation logic. *(Decision reversed in v5.2.)*
- v5.0: Added Phase Boundaries with clear beta vs. public launch split, gating criteria, separate deliverables tables per phase.
- v4.0: Merged phase-get-traffic.md into this document. Removed all backend/API assumptions.
