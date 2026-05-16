# Phase: Free Tools for Beta Traffic Acquisition

**Status**: Planning
**Phase**: Beta Release (Phase 1)
**Priority**: High
**Estimated Effort**: 2-3 weeks (all 3 tools)
**Owner**: Product + Engineering

> **Note**: This is the beta-scoped subset of the full free tools plan. The remaining 5 tools (Debt Payoff Optimizer, Historical Net Worth Simulator, Life Event Impact Calculator, Cash Shortfall Predictor, Simple Monte Carlo Tester) are planned for public release. See [phase-get-traffic.md](../../2.public-release/phase-get-traffic.md).

---

## Objective

Validate the free-tool-to-signup conversion funnel during beta, gain early SEO indexing, and gather community feedback — using frontend-only Astro pages deployed on GitHub Pages (nidhi-landing). No backend endpoints required for the free tools themselves; all computation runs in the browser.

**Beta Success Metrics**:
- 200+ monthly visitors to free tools
- 10%+ conversion rate from tool usage to signup
- Measurable referral traffic from FIRE/expat communities

---

## Implementation Model: Frontend-Only (Astro + GitHub Pages)

All free tools follow the same pattern as the already-shipped **Loan Comparison Calculator** (`nidhi-landing/src/pages/free/loan-comparison.astro`):

- **Astro page** at `/free/<tool-slug>.astro` in the `nidhi-landing` repo
- **React component** with all computation logic in the browser (zero backend calls)
- **Utility modules** for math (ported from backend formulas where applicable)
- **Shareable URLs** via query-string encoding (same pattern as `loanCompareUrl.ts`)
- **SEO metadata** (JSON-LD, FAQ schema, breadcrumbs) in the Astro frontmatter
- **Analytics** via PostHog (already wired in nidhi-landing)

No new FastAPI endpoints, no database, no auth — the tools are pure client-side calculators.

---

## Tools Included (3)

### Tool 1: FIRE Number Calculator

**Purpose**: Core differentiator vs. ActuaPlan; FIRE community loves sharing.

**Inputs**:
- Current net worth
- Monthly savings
- Annual expenses
- Expected return rate
- Safe withdrawal rate (default 4% / 25x, toggle to 3.3% / 30x or 3% / 33x)

> **Financial accuracy note (per Jan)**: The 4% rule (25x expenses) is the recognized standard but must be adjustable. Offer 25x / 30x / 33x multipliers corresponding to 4% / 3.3% / 3% withdrawal rates. European FIRE practitioners often use 3.3% due to longer expected retirement horizons. Do NOT conflate nominal vs. real return — the calculator must be explicit about which it uses. Default to real (inflation-adjusted) returns.

**Outputs**:
- FIRE number (expenses × multiplier)
- Years to FIRE at current savings rate
- Savings rate %
- Whether return rate input is real or nominal (labelled clearly)

**Traffic Hook**: "Find your FIRE number in 60 seconds"

**Formulas (all client-side)**:
- FIRE number = `annualExpenses / withdrawalRate`
- Years to FIRE = solve `currentNW * (1+r)^n + monthlySavings * ((1+r)^n - 1) / (r/12) = fireNumber` for n
- Savings rate = `monthlySavings / (monthlySavings + monthlyExpenses)`

**Implementation**:
- New Astro page: `nidhi-landing/src/pages/free/fire-calculator.astro`
- React component: `nidhi-landing/src/components/FireCalculator.tsx`
- Math utils ported from `projection_service.py` to TypeScript
- No backend endpoint needed

**SEO Keywords**: fire calculator, fire number, when can I retire, financial independence calculator, 4% rule calculator

---

### Tool 2: Coast FIRE Calculator

**Purpose**: Popular concept ActuaPlan lacks; high shareability.

**Inputs**:
- Current age
- Current net worth / investable assets
- Target retirement age
- Annual expenses in retirement
- Expected annual return rate (real, inflation-adjusted — labelled explicitly)
- Safe withdrawal rate (4% / 3.3% / 3% toggle, consistent with Tool 1)

> **Financial accuracy note (per Jan)**: The most common credibility mistake is mixing real and nominal returns. If the user enters a nominal return (e.g. 7%), the coast number will be understated. The UI must label the return field clearly as "Real (inflation-adjusted) annual return" and provide a tooltip explaining that nominal return ≈ real return + inflation (e.g. 7% nominal − 2.5% inflation = 4.5% real). This is the #1 issue FIRE communities will call out on launch day.

**Outputs**:
- Coast FIRE number (amount needed today to coast to target retirement)
- Gap between current net worth and coast FIRE number
- "You can coast at age X" message (if gap > 0, project when they will cross coast threshold at current savings)
- Visual timeline: coast phase vs. keep-saving phase

**Traffic Hook**: "Can you stop saving and still retire?"

**Formulas (all client-side)**:
- `RetirementTarget = annualExpenses / withdrawalRate`
- `CoastFIRE = RetirementTarget / (1 + r)^(retirementAge - currentAge)`
- Gap = `currentNW - CoastFIRE`
- Coast-at age: solve `currentNW * (1+r)^n = RetirementTarget / (1+r)^(retirementAge - (currentAge+n))` for n, add to current age

**Implementation**:
- New Astro page: `nidhi-landing/src/pages/free/coast-fire.astro`
- React component: `nidhi-landing/src/components/CoastFireCalculator.tsx`
- No backend endpoint needed

**SEO Keywords**: coast fire calculator, coast fire number, stop saving calculator, coast FIRE Europe

---

### Tool 3: Currency Risk Analyzer

**Purpose**: Unique expat differentiator; targets Marcus (Expat) persona. Users add individual assets and liabilities across currencies, see their net currency concentration with live exchange rates, and share results publicly or anonymously.

**User Flow**:
1. User lands on page. Sees **2 empty asset rows** (name, value, currency, type toggle) and a functional currency picker.
2. Fills in rows manually, clicks "Add asset" for more, or clicks "Upload CSV" to bulk-populate rows.
3. Each row has a **type toggle**: Asset (default) / Liability. Liability amounts are subtracted from that currency's net position.
4. On any input change, results update **live** (no calculate button needed) — same real-time pattern as the loan comparison calculator.
5. User sees: total net worth in functional currency, SVG donut chart of net currency concentration, per-currency risk assessment cards.
6. Shares via two buttons: **Share with data** (full asset details in URL) or **Share anonymously** (only concentration % and risk levels, no amounts or asset names).

**Inputs (per asset row)**:
- Asset name (optional, free-text label — e.g. "US Stocks", "Apartment", "FD in SBI")
- Current value (major-unit amount, positive number)
- Currency (select from 11 supported currencies, reuses catalogue from `loanMath.ts`)
- Type toggle: **Asset** (default) | **Liability** (e.g. mortgage, student loan, credit card debt in a foreign currency)

**Global inputs**:
- Functional currency (the currency the user actually spends in) — determines which currency the results are displayed in and which currency is excluded from risk flagging
- CSV file upload (optional bulk input)
- Maximum rows: no hard limit for in-browser use; practical cap of 50 for URL sharing (URL length constraint)

> **Financial accuracy note (per Jan)**: Risk thresholds must distinguish between functional and non-functional currency exposure. Having 60%+ in your spend/functional currency is normal and not risky. Having 60%+ in a currency you do NOT spend in is elevated risk — currency swings directly erode purchasing power. The risk assessment must ask which currency the user spends in, then only flag concentration in non-functional currencies.

> **Net exposure note**: Allowing liabilities (negative positions) is critical for expat accuracy. Someone with $100K in USD assets and a $60K USD mortgage has only $40K of real USD exposure. The pie chart and risk assessment reflect **net** currency positions (assets − liabilities per currency), not gross assets. A currency with net-negative position (more liabilities than assets) gets a special "Net debt" label.

**Aggregation logic** (all client-side, in `currencyRiskMath.ts`):
1. Group asset rows by currency.
2. Per currency: `net = sum(asset amounts) − sum(liability amounts)`.
3. Convert each net to functional currency using fetched exchange rates.
4. Total = sum of converted nets. Per-currency % = `converted_net / total × 100`.
5. Risk assessment per non-functional currency:
   - < 20%: Low exposure
   - 20–40%: Moderate exposure
   - > 40%: Elevated exposure (recommend review)
   - Functional currency: Always labelled "Your spending currency" — never flagged
   - Net-negative position: Special "Net debt in X" label

**Outputs**:
- Total net worth in functional currency (large-format number)
- SVG donut chart of net currency concentration (%, following same SVG patterns as `BalanceChart` in LoanCompare — inline SVG, viewBox, aria-label, screen-reader-only table of sampled values)
- Per-currency risk assessment cards:
  - Colored badge: green (low / functional), yellow (moderate), red (elevated)
  - Concentration percentage
  - Actionable recommendation sentence (e.g. "28% of your net worth is in USD, which you don't spend in. Consider diversifying.")
- Overall risk summary sentence
- Exchange rate source attribution (ECB reference rates, dated)

**Traffic Hook**: "Are you over-exposed to one currency? Check now"

**CSV Upload**:
- Format (name and type columns optional):
  ```csv
  name,value,currency,type
  US Stocks,50000,USD,asset
  US Mortgage,60000,USD,liability
  Apartment,200000,EUR,asset
  ,1000000,INR,asset
  ```
- Triggered via a hidden `<input type="file" accept=".csv">` wired to a styled button
- Hand-rolled parser (~50 lines, zero dependencies) — CSV format is trivial (split lines, split commas, trim whitespace)
- Validation per row: currency must be a supported 3-letter code, value must be a positive number, type defaults to "asset" if omitted or unrecognized
- On parse errors: valid rows populate the table; failed rows are listed below the upload button with line numbers and reasons. User can fix bad rows directly in the UI.
- CSV upload **replaces** existing rows (not append) — a confirmation prompt warns before overwriting

**Exchange rate strategy**: Uses the free [Frankfurter API](https://frankfurter.app) (no API key required, ECB reference rates, updated daily) called directly from the browser. No backend proxy needed.

- **Endpoint**: `GET https://api.frankfurter.app/latest?from={functionalCurrency}` (fetches rates for all ~30 supported currencies relative to the user's functional currency)
- **Trigger**: On mount + when functional currency changes
- **Loading state**: Subtle skeleton/spinner overlay on the results panel during fetch. Asset inputs remain editable — the tool never blocks on network.
- **Error state**: Yellow banner "Exchange rates unavailable — showing raw amounts without conversion" + retry button. The donut chart still renders using raw (unconverted) amounts in original currencies with a clear caveat. The tool is never fully blocked.
- **Caching**: Browser's standard HTTP cache (rates update daily; no client-side caching layer needed)

**URL Sharing — Two Modes**:

URL state is managed via query-string encoding (same `history.replaceState` pattern as `loanCompareUrl.ts`). Two sharing modes are offered:

1. **Share with data** (full asset details visible in URL):
   ```
   ?a1_n=US+Stocks&a1_v=50000&a1_c=USD&a1_t=asset&a2_v=60000&a2_c=USD&a2_t=liability&func=EUR
   ```
   Empty/default fields are omitted to keep URLs compact (`a2_n` skipped if name blank, `a2_t` skipped if "asset" since it's the default).

2. **Share anonymously** (only concentration % and risk levels, no amounts or asset names):
   ```
   ?func=EUR&anon=1&c_USD=28.5&r_USD=moderate&c_EUR=71.5&r_EUR=functional
   ```
   Encodes only: functional currency, per-currency concentration %, and per-currency risk level. Recipients can see the risk profile without seeing net worth or individual holdings.

Both modes use `navigator.clipboard.writeText` for one-click copy with a "Link copied" confirmation. The share button is a split button or dropdown with both options.

**Implementation**:
- New Astro page: `nidhi-landing/src/pages/free/currency-risk.astro` (~350 lines)
  - Frontmatter: SEO title, description, keywords, FAQ data (10 questions), JSON-LD schemas (WebApplication, BreadcrumbList, FAQPage)
  - Blog collection query for related-reading cards (3 slots, filtered to published posts, with fallback candidates)
  - Breadcrumb nav, header (eyebrow "Free tools" + h1 + lead), explainer section, FAQ accordion, related-reading grid
  - Scoped `<style>` block with all CSS classes prefixed `cr-` (consistent with `lc-` convention from loan comparison)
- React component: `nidhi-landing/src/components/CurrencyRiskAnalyzer.tsx` (~500 lines)
  - **AssetTable**: List of `AssetRow` components (name input, value input, currency select, type toggle, delete button)
  - **CSV upload**: Hidden file input + styled button, parse-then-populate flow
  - **ResultsPanel**: Total NW, SVG donut chart (`ConcentrationChart`), per-currency risk cards
  - **Toolbar**: Functional currency select, split share button (full data / anonymous), reset button
  - State management: `useState` + `useMemo` for computation, `useEffect` for URL sync + Frankfurter fetch
  - PostHog tracking: `currency_risk_asset_added`, `currency_risk_csv_uploaded`, `currency_risk_currency_changed`, `currency_risk_share_copied` (with mode), `currency_risk_reset`
  - Loading/error/empty/edge-case states handled explicitly
- Math utils: `nidhi-landing/src/utils/currencyRiskMath.ts` (~120 lines)
  - `aggregateByCurrency(rows, rates, functionalCurrency)` → `CurrencyPosition[]`
  - `computeRiskLevel(pct, isFunctional)` → `RiskLevel`
  - `parseCSV(text)` → `{ rows: AssetRow[]; errors: ParseError[] }`
  - Pure functions, no React dependency, testable under `node --test`
- URL codec: `nidhi-landing/src/utils/currencyRiskUrl.ts` (~140 lines)
  - `encodeFullData(rows, functionalCurrency)` → query string
  - `encodeAnonymous(positions, functionalCurrency)` → query string
  - `decodeFromQueryString(qs)` → `{ rows, functionalCurrency, isAnonymous }`
  - Default state: 2 empty asset rows, functionalCurrency = USD
- Reuses currency catalogue from `loanMath.ts` (CURRENCIES array — 11 supported currencies)
- No backend endpoint needed

**UI Layout** (schematic):
```
┌──────────────────────────────────────────────────┐
│ Home > Currency risk analyzer                     │
│                                                   │
│ Free tools                                        │
│ # Currency Risk Analyzer                          │
│ Check how concentrated your net worth is across    │
│ different currencies. Everything runs in your      │
│ browser. Nothing is sent anywhere.                 │
│                                                   │
│ ┌─ Toolbar ───────────────────────────────────┐   │
│ │ Functional currency: [EUR ▾]                │   │
│ │ [Share ▾]  [Reset to defaults]              │   │
│ │   ├ Share with data                          │   │
│ │   └ Share anonymously                        │   │
│ └─────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Assets ────────────────────────────────────┐   │
│ │  #  Name       Value    Currency  Type       │   │
│ │  1  US Stocks  50000    [USD ▾]   [Asset ▾]  │   │
│ │  2  Mortgage   60000    [USD ▾]   [Liability]│   │
│ │  3  Apartment  200000   [EUR ▾]   [Asset ▾]  │   │
│ │  ──────────────────────────────────────────  │   │
│ │  [+ Add asset]  [Upload CSV]                 │   │
│ └──────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Results ───────────────────────────────────┐   │
│ │  Total net worth: €142,500                   │   │
│ │                                              │   │
│ │  (SVG donut chart: USD 28% / EUR 72%)       │   │
│ │                                              │   │
│ │  🟡 USD — 28.1% — Moderate exposure         │   │
│ │  28% of your net worth is in USD, which      │   │
│ │  you don't spend in. Consider diversifying.  │   │
│ │                                              │   │
│ │  🟢 EUR — 71.9% — Your spending currency    │   │
│ │  Most of your wealth is in your functional   │   │
│ │  currency. No action needed.                 │   │
│ └──────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ How this works ───────────────────────────┐   │
│ │ (Formula explanation)                        │   │
│ └──────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ FAQ (10 questions, accordion) ────────────┐   │
│ └──────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Related reading (3 blog cards) ───────────┐   │
│ └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Edge Cases Handled**:

| Case | Behavior |
|---|---|
| Zero assets added | Empty state: "Add at least one asset to see your currency concentration" |
| Single asset | Donut shows 100%, risk = functional (if currency matches) or low (single non-functional currency) |
| Net negative in a currency | Red bar in chart, "Net debt in X" label on risk card, note about leverage |
| Total net worth ≤ 0 | "Your net worth is zero or negative — risk assessment not meaningful" |
| Frankfurter API down | Yellow banner, raw (unconverted) amounts shown, donut chart rendered with caveat, retry button |
| URL too long (>2000 chars, full-data mode only) | Truncate asset names in URL, show a brief warning on copy |
| CSV with invalid rows | Partial import: valid rows populate table, invalid rows listed with line numbers and reasons |
| CSV upload replaces existing data | Confirmation prompt before overwriting current rows |
| All currencies match functional currency | Green "No currency risk detected — all your net worth is in your spending currency" |

**SEO Keywords**: currency risk calculator, multi currency net worth, expat financial planning, currency diversification, currency exposure calculator, foreign exchange risk, currency concentration, net worth by currency, multi-currency portfolio analyzer, currency risk assessment

---

## Removed from Beta Scope

### ~~Tool 4: Loan Comparison Calculator~~ → Already shipped

The Loan Comparison Calculator was implemented as a frontend-only Astro page in the `nidhi-landing` project and is live at `/free/loan-comparison`. It is no longer a beta deliverable for the NetWorthAndExpenses backend.

- **Page**: `nidhi-landing/src/pages/free/loan-comparison.astro`
- **Component**: `nidhi-landing/src/components/LoanCompare.tsx`
- **Math utils**: `nidhi-landing/src/utils/loanMath.ts`
- **URL codec**: `nidhi-landing/src/utils/loanCompareUrl.ts`

---

## Technical Requirements

### Architecture
- Standalone Astro pages in `nidhi-landing` repo (no authentication required)
- All computation runs client-side in React components
- No new backend endpoints, no database, no rate limiting needed
- Shareable URLs with encoded parameters (query string, same pattern as loan comparison)
- Mobile-responsive design (reuse existing nidhi-landing CSS patterns)
- SEO: JSON-LD structured data, FAQ schema, breadcrumbs in Astro frontmatter

### New Astro Pages
```
/free/fire-calculator    → fire-calculator.astro + FireCalculator.tsx
/free/coast-fire         → coast-fire.astro + CoastFireCalculator.tsx
/free/currency-risk      → currency-risk.astro + CurrencyRiskAnalyzer.tsx
```

### New TypeScript Utilities
```
src/utils/fireMath.ts              — FIRE number + years-to-FIRE formulas
src/utils/coastFireMath.ts         — Coast FIRE + coast-at-age formulas
src/utils/currencyRiskMath.ts      — Currency aggregation, concentration %, risk thresholds, CSV parser
src/utils/currencyRiskUrl.ts       — Dual-mode URL codec (full-data + anonymous sharing)
```

### External Dependencies
- **Frankfurter API** (Tool 3 only): `https://api.frankfurter.app/latest?from={functionalCurrency}` — free, no API key, ECB reference rates updated daily, called directly from browser. Returns rates for all ~30 supported currencies relative to the user's chosen functional currency. No backend proxy needed. No client-side caching layer needed (browser HTTP cache is sufficient for daily-updated rates).

---

## Conversion Funnel

**Visitor** → **Uses tool (60 seconds)** → **Sees result with CTA** → **Product landing page** → **Signup**

CTAs on result pages:
- "Save your results — create a free account"
- "See your full financial picture" (links to product)
- Email capture: "Email me my results" (email nurture sequence)

---

## Implementation Order

1. **First (3-4 days)**: Currency Risk Analyzer — most unique differentiator, targets Marcus (Expat) persona, Frankfurter API integration, dual sharing modes
2. **Week 2**: FIRE Number Calculator + Coast FIRE Calculator (most search volume, pure client-side math, fastest to ship)

---

## Dependencies

- ✅ nidhi-landing Astro project (already set up with BaseLayout, PostHog, SEO patterns)
- ✅ Loan comparison page pattern (reference implementation for all free tools)
- ✅ Currency catalogue (`loanMath.ts` CURRENCIES array — reusable by Tool 3)
- ✅ Frankfurter API (free, no key, for Tool 3 exchange rates)
- ✅ FIRE math formulas (documented in this plan and existing backend code)
- 🔄 Tool page templates (to be created, following loan-comparison.astro pattern)
- 🔄 TypeScript math utilities (to be created, ported from backend formulas)

---

## Related Documents

- [Full free tools plan — Public Release](../../2.public-release/phase-get-traffic.md)
- [FIRE Categories plan](../done/phase-fire-categories-beta.md)
- [FIRE Refactorinmplementation](phase-fire-refactor.md)
- [Competitive Analysis vs ActuaPlan](../../2.public-release/competitive-moat-vs-actuaplan.md)

---

**Document Version**: 2.0
**Last Updated**: 2026-05-15
**Status**: Planning
**Changelog**:
- v2.0: Full spec for Currency Risk Analyzer — asset-level input, asset/liability toggle, CSV bulk upload, dual sharing modes (full-data + anonymous), Frankfurter API loading/error states, SVG donut chart, edge case table. Reordered to Currency Risk Analyzer first.