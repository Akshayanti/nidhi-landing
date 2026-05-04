# Blog Content Plan: Discovery to Mastery

> Complete content plan for nidhi.today blog, organized by the 4 learning levels defined in `src/components/LearningPath.tsx`.

---

## Strategic Context

**The app is not live yet.** All posts are tool-agnostic education, building an audience. On beta launch day:
1. Publish a major announcement post tying all prior content to the app
2. Batch-update all prior posts with brief CTAs

## Publishing Cadence & Timeline

**Publishing cadence:** one post at a time on Monday, Wednesday, and Friday (blog post + Instagram carousel published together).

**As of May 4, 2026:** posts 1-8 are live (post 8 published today). Post 9 goes live Wed May 6, then one per M/W/F slot from there.

| Milestone | Post | Target date |
|-----------|------|-------------|
| Discovery complete | post 16 | Fri May 22, 2026 |
| Building complete | post 29 | Mon Jun 22, 2026 |
| **BETA LAUNCH** | -- | **late June 2026** (right after post 29) |
| Psychology complete | post 39 | Wed Jul 15, 2026 |
| Optimizing complete | post 51 | Wed Aug 12, 2026 |
| Mastery complete | post 63 | Wed Sep 9, 2026 |

**Timeline note (updated May 4, 2026):** Cadence is Mon/Wed/Fri (3/week). Previous plan assumed every-3-days (~2.3/week), so end dates pulled in by ~2-3 weeks. Gap analysis (April 23, 2026) added 5 posts. Post 13 (Time Value of Money) was removed — its unique content (present value, discount rate, opportunity cost) folded into Saving vs Investing. Budgeting was moved from Building to Discovery. Building is 13 posts (not 14).

**Beta launch target: late June 2026** -- immediately after the Building level is complete (post 29, Mon Jun 22). At this point readers understand net worth, cash flow, budgeting, investing, diversification, FIRE basics, loan terms, goals, and the dashboard -- which maps directly to the app's Phase 1 feature set.

**Post-launch shift:** Optimizing and Mastery posts publish WITH app CTAs from day one. "Financial Projections" becomes "see your own projections in nidhi" instead of a theoretical exercise. This makes later content more compelling, not less.

## Level System (from `src/content.config.ts` and `src/components/LearningPath.tsx`)

| Level | Label | Prerequisite | Target |
|-------|-------|-------------|--------|
| `discovery` | Discovery | For beginners | 16 posts |
| `building` | Building | Comfortable with basics | 13 posts |
| `psychology` | Psychology | Knows the basics, ready to understand how the mind sabotages the math | 10 posts |
| `optimizing` | Optimizing | Has a budget, investment plan, and bias awareness | 12 posts |
| `mastery` | Mastery | Experienced planners | 12 posts |

> **Note:** `psychology` is a new level added May 4, 2026. Requires adding `'psychology'` to the `level` enum in `src/content.config.ts` and to `LearningPath.tsx` before the first post ships.

---

## Gap Analysis (April 23, 2026)

Cross-referencing all 121 customer questions (`docs/plans/additional-customer-questions.md`), beta feature plans (`docs/plans/1.beta-release/`), and public release plans (`docs/plans/2.public-release/`) against the original 49-post blog plan revealed 5 coverage gaps. Each new post maps to a shipped or in-progress app feature that would otherwise lack educational context at launch.

### Critical gaps (feature-blog misalignment)

| New Post | Level | Why it's needed |
|----------|-------|----------------|
| **#22: Introduction to Financial Independence** | Building | FIRE categories are already built and ship at beta. Free FIRE and Coast FIRE calculators launch as traffic tools. But FIRE education was in Mastery (#42), publishing ~2 months after beta. Users would land on the FIRE calculator with no context. |
| **#25: Understanding Loan Terms** | Building | Loan vendor comparison is a beta feature (`phase-loan-vendor-comparison.md`). Existing posts cover debt payoff (#5) but nothing about acquiring debt wisely -- APR, amortization, fixed vs variable rates, comparing offers. |
| **#31: Cash Flow Forecasting** | Optimizing | Phase 1.5 cash flow modeling is a beta must-have. Post 10 (Cash Flow 101) covers historical concepts. Post 30 covers net worth projections. But no post covered forward-looking cash flow, shortfall detection, or liquidity planning (customer Q73-Q76). |

### Important gaps (curriculum completeness)

| New Post | Level | Why it's needed |
|----------|-------|----------------|
| **#16: Insurance Basics** | Discovery | Not covered in any of the original 49 posts. Insurance affects net worth (cash value), cash flow (premiums), and risk management. Most financial literacy curricula include it. Fits naturally after Credit Scores (#15). |
| **#30: Taxes and Your Financial Plan** | Building | No Discovery/Building post covered taxation. Tax-Aware Investing (#48) is in Mastery. But taxes affect cash flow from day one, and the app has an `is_tax_advantaged` flag on retirement investments. A generic treatment (no jurisdiction-specific rules per MiFID II guardrails) bridges this gap. |

### Considered but not added

| Concept | Why excluded |
|---------|------------|
| **Refinancing / debt consolidation** | Folded into new post #25 (Understanding Loan Terms) rather than separate post. |
| **Contributions vs. market returns** | Folded into post #37 (Real Returns & Benchmarking) as a section. |
| **Time Value of Money (post 13)** | Removed — overlapped heavily with compound interest (post 6). Unique concepts (present value, discount rate, opportunity cost) folded into Saving vs Investing (post 13). |

### Later additions

| Concept | Decision |
|---------|----------|
| **Behavioral finance / psychology of money** | Added May 4, 2026 as new `psychology` level (10 posts, 30-39). Placed between Building and Optimizing — readers have the foundations and first systems, now they learn why knowing the math isn't enough before they start fine-tuning. Serves as behavioral prep for Optimizing (rebalancing, fee awareness, Monte Carlo interpretation, geo-arbitrage decisions) and Mastery (FIRE, drawdown, sequence risk) — the advanced topics where behavioral mistakes cost the most. No direct app feature tie-in, but bias-awareness reinforces the "nidhi shows math, user decides" positioning (the dashboard itself is an anti-bias tool). Ships post-beta-launch with app CTAs from day one. Pushes Mastery end date from Aug 17 to Sep 9, 2026. |

---

# DISCOVERY (Posts 1-16)

> The fundamentals. If you're new to personal finance, start here.

| # | Title | Status | Key Concept |
|---|-------|--------|-------------|
| 1 | What Is Net Worth and Why Does It Matter? | shipped | Assets - Liabilities = the one number that captures your full financial picture |
| 2 | How to Calculate Your Net Worth in 10 Minutes | shipped | Step-by-step: list assets, list liabilities, subtract |
| 3 | Assets: What You Own and What Actually Counts | shipped | Real assets vs not-assets; asset quality; retirement accounts as distinct class |
| 4 | Liabilities: What You Owe and Why the Interest Rate Matters | shipped | Interest rate as key discriminator; three-question evaluation framework |
| 5 | How to Get Out of Debt: Snowball vs. Avalanche | shipped | Two proven payoff strategies; emotional vs mathematical optimization |
| 6 | Appreciation vs. Depreciation | shipped | Why some assets grow, others shrink; compound interest; starting early |
| 7 | Liquidity: Why Being Unable to Access Your Money Is a Risk | shipped | Liquidity spectrum; when illiquidity is appropriate; right balance |
| 8 | The Emergency Fund: Your First Financial Safety Net | shipped | How much, where to keep it, how to build it; what counts as an emergency |
| 9 | Income vs. Wealth: They're Not the Same Thing | shipped | Income is flow, wealth is stock; lifestyle inflation; savings rate introduced |
| 10 | Cash Flow 101: Where Your Money Actually Goes | shipped | Cash flow formula; fixed vs variable; savings rate as %; 50/30/20 guideline |
| 11 | Purchasing Power: Why €1,000 Today Isn't €1,000 Tomorrow | shipped | Inflation erodes value over time; real vs nominal; saving alone isn't enough |
| 12 | Why Your Euro Buys More in Some Countries Than Others | shipped | Exchange rates vs PPP; Big Mac index; currency risk types |
| 13 | Saving vs Investing -- When to Do Which | written | Saving = preserving capital (low risk, low return, liquid). Investing = growing capital (higher risk, higher return, less liquid). When each is appropriate. Opportunity cost and present value. The risk of investing too early (before emergency fund). |
| 14 | Budgeting -- Controlling the Gap Between Income and Spending | written | Budgeting isn't restriction -- it's directing cash flow intentionally. 50/30/20, zero-based, pay-yourself-first approaches. Automating saves willpower. |
| 15 | Credit and Credit Scores -- What They Are and Why They Matter | written | What a credit score measures. How it affects borrowing costs (interest rates). Why it matters even if you avoid debt (rental applications, insurance). How to build and maintain good credit. Common myths. Kept generic across EU markets. |
| 16 | Insurance Basics -- Protecting What You've Built | planned | **[GAP FILL]** What insurance protects and why it matters for financial planning. Types: health, life, property, disability, liability. How premiums affect cash flow. When coverage gaps create financial vulnerability. The relationship between insurance and emergency fund sizing (more coverage = less emergency fund needed, and vice versa). Connection to net worth: life insurance cash value, property protection. Kept generic -- no jurisdiction-specific products or requirements. |

---

# BUILDING (Posts 17-29)

> Putting the pieces together. Risk, investing, and first financial systems.

### Post 17: Understanding Risk -- What It Actually Means for Your Money
**Builds on:** Assets (#3), Appreciation/Depreciation (#6), Saving vs Investing (#13)
**Key concept:** Risk isn't just "losing money." Volatility vs permanent loss. Risk tolerance vs risk capacity (what you can stomach vs what you can afford). How time horizon changes risk (short-term volatility, long-term growth). Why avoiding all risk is itself a risk (inflation). Risk as the price of return.
**App tie-in (add on launch day):** nidhi lets you assign growth rates per asset, reflecting your own risk assumptions.

---

### Post 18: Investing 101 -- Asset Classes and How They Work
**Builds on:** Assets (#3), Appreciation/Depreciation (#6), Understanding Risk (#17)
**Key concept:** The main asset classes: stocks (ownership), bonds (lending), real estate (property), cash equivalents (safety). How each generates returns. Historical return ranges. Why stocks are volatile short-term but the strongest long-term grower. Why bonds are stable but barely beat inflation. How they work together.
**App tie-in (add on launch day):** nidhi tracks all these asset classes with per-asset growth rates and projects their future value.

---

### Post 19: Getting Started -- Investment Accounts, Automation, and Your First Steps
**Builds on:** Investing 101 (#18), Budgeting (#14), Cash Flow 101 (#10)
**Key concept:** Types of investment accounts: regular brokerage, tax-advantaged retirement, employer-sponsored (generic, not jurisdiction-specific). Why index funds are commonly cited as a starting point. Dollar-cost averaging: investing a fixed amount regularly removes timing decisions. Automation: set it up once, let it run. The power of starting small and early over starting big and late.
**App tie-in (add on launch day):** nidhi tracks recurring contributions (DCA, pension top-ups) as a dedicated asset type and shows their compound impact in projections.

---

### Post 20: Diversification -- Why You Don't Put All Your Eggs in One Basket
**Builds on:** Investing 101 (#18), Assets (#3), Liquidity (#7)
**Key concept:** Risk reduction through spreading across asset types, geographies, and time (DCA). Concentration risk. How diversification works at the portfolio level. Correlation basics (without the math). The free lunch of finance.
**App tie-in (add on launch day):** nidhi shows your asset allocation breakdown -- liquid vs illiquid, by type, by currency -- so you can see concentration at a glance.

---

### Post 21: Introduction to Financial Independence -- What It Means and Why It Matters
**Builds on:** Cash Flow 101 (#10), Investing 101 (#18), Saving vs Investing (#13)
**Key concept:** **[GAP FILL — critical for beta FIRE features]** Financial independence = your investments generate enough to cover expenses indefinitely. Not just for extreme savers or early retirees. The core formula: FIRE number = annual expenses / safe withdrawal rate. Four flavors introduced: Lean FIRE (bare minimum), Traditional FIRE (current lifestyle), Fat FIRE (comfortable margin), Coast FIRE (stop saving, let growth do the work). Savings rate as the key lever: why a 50% savings rate reaches FI in ~17 years regardless of income level. The crossover point: when investment income exceeds expenses. This is an introduction -- advanced FIRE strategies (sequence risk, drawdown, SWR deep dive) are covered in Mastery.
**App tie-in (add on launch day):** nidhi calculates all four FIRE numbers and shows when you'll cross each threshold. The free FIRE calculator and Coast FIRE calculator let you explore this before signing up.

---

### Post 22: Managing Money Across Currencies -- When Your Finances Cross Borders
**Builds on:** Diversification (#20), Euro Buys More (#12), Purchasing Power (#11)
**Key concept:** Multi-currency net worth fluctuates with exchange rates even when nothing else changes. Currency concentration as undiversification. Which currency to hold savings in. When currency diversification helps vs adds complexity. Not forex trading -- the currency dimension of your existing financial life.
**App tie-in (add on launch day):** nidhi tracks 150+ currencies with live ECB rates, shows net worth by currency, and flags currency concentration.

---

### Post 23: Real Estate as an Investment -- Beyond Just Owning a Home
**Builds on:** Assets (#3), Investing 101 (#18), Liabilities (#4)
**Key concept:** Real estate as an asset class vs stocks/bonds. Leverage (mortgage amplifies gains AND losses). Illiquidity. Rental yield vs appreciation. Total return calculation including maintenance, taxes, vacancy. Why "renting is throwing money away" is a myth. When buying makes financial sense vs when renting + investing wins. The dual nature of a home: asset on the balance sheet, liability in the cash flow.
**App tie-in (add on launch day):** nidhi tracks real estate with appreciation rates and models mortgage amortization, so you can see the true financial picture of property ownership.

---

### Post 24: Understanding Loan Terms -- How to Compare Borrowing Options
**Builds on:** Liabilities (#4), Credit and Credit Scores (#15), Real Estate (#23)
**Key concept:** **[GAP FILL — critical for loan comparison feature]** When you borrow, the interest rate is only part of the cost. APR vs. nominal rate: why advertised rates are misleading. Fixed vs. variable rates: predictability vs. potentially lower cost. Amortization: how loan payments split between principal and interest over time (and why early payments are mostly interest). Total cost of borrowing: the number that actually matters. How to compare loan offers side by side: same term, same amount, compare total cost. Discount points and break-even analysis. Refinancing: when replacing an existing loan saves money. Prepayment: why paying extra on principal accelerates payoff dramatically. Kept generic -- no jurisdiction-specific products or regulations.
**App tie-in (add on launch day):** nidhi's loan vendor comparison tool lets you enter 2-3 offers side by side and see the true cost using IRR methodology, with break-even analysis and prepayment scenarios.

---

### Post 25: Passive Income Streams -- Making Your Money Work Without You
**Builds on:** Income vs Wealth (#9), Investing 101 (#18), Cash Flow 101 (#10)
**Key concept:** Types of passive income: dividends, rental income, interest, royalties, side business revenue. The investment income crossover point (when passive income exceeds expenses). Realistic expectations: truly passive income requires upfront capital or effort. How passive income accelerates FIRE.
**App tie-in (add on launch day):** nidhi tracks active and passive income separately and projects the crossover point where passive income covers your expenses.

---

### Post 26: Setting Financial Goals -- From Vague Wishes to Concrete Targets
**Builds on:** Investing 101 (#18), Emergency Fund (#8), Cash Flow 101 (#10)
**Key concept:** A goal without a number and a date is just a wish. Translating "buy a house" into "€40,000 in 5 years = €X/month at Y% return." Short/medium/long-term buckets. Prioritizing competing goals. The cost of delaying.
**App tie-in (add on launch day):** nidhi's projection engine lets you model whether you'll hit your targets at your current pace.

---

### Post 27: Your Financial Dashboard -- What to Track and How Often
**Builds on:** All previous posts
**Key concept:** What to monitor: net worth (monthly), savings rate (monthly), cash flow (monthly), asset allocation (quarterly), projection vs actual (annually). Over-checking creates anxiety, under-checking creates drift. Signals vs noise.
**App tie-in (add on launch day):** nidhi is designed as your financial dashboard -- net worth snapshots, cash flow tracking, FIRE progress, and projection updates, all in one place.

---

### Post 28: Financial Health Metrics -- How to Know If You're on Track
**Builds on:** Dashboard (#27), Cash Flow 101 (#10), Emergency Fund (#8)
**Key concept:** Beyond net worth: the key ratios that reveal financial health. Debt-to-asset ratio. Emergency fund coverage (months). Savings rate. Income replacement ratio. Liquid asset percentage. What "healthy" looks like for each (common benchmarks, not prescriptions). How to use these as early warning signals.
**App tie-in (add on launch day):** nidhi calculates debt-to-asset ratio, liquid/illiquid split, savings rate, and income replacement metrics automatically.

---

### Post 29: Taxes and Your Financial Plan -- How Taxation Affects Every Decision
**Builds on:** Cash Flow 101 (#10), Investing 101 (#18), Getting Started (#19)
**Key concept:** **[GAP FILL — bridges to Optimizing; supports is_tax_advantaged flag]** Taxes reduce your cash flow, your investment returns, and your retirement income. Income tax basics: why your take-home pay differs from your salary. Capital gains: the cost of selling investments at a profit (and why holding period matters). Tax-advantaged accounts: the concept of deferring or eliminating tax on investment growth (generic -- no jurisdiction-specific products). Why pre-tax vs. post-tax contributions matter for retirement. How to think about after-tax returns. The key insight: a 7% return taxed at 25% is a 5.25% return -- and that difference compounds over decades. Kept entirely generic per MiFID II guardrails -- concepts only, no specific tax rates, rules, or products.
**App tie-in (add on launch day):** nidhi's `is_tax_advantaged` flag on retirement investments and configurable tax rates let you see the impact of taxation on your projections without jurisdiction-specific calculations.

---

# PSYCHOLOGY (Posts 30-39)

> You know the fundamentals and have built first systems. Now meet the opponent: your own brain. Behavioral finance explains why smart people consistently make predictable money mistakes — and how to build systems that beat your biases. This series is the bridge into Optimizing: you can't fine-tune what your biases keep undoing.

### Post 30: Why Smart People Make Dumb Money Decisions
**Builds on:** All Discovery and Building content (capstone intro to the series)
**Key concept:** Traditional economics assumes rational actors. Behavioral economics studies how real humans actually decide. Kahneman's System 1 (fast, emotional, pattern-matching) vs System 2 (slow, deliberate, effortful). Why knowing the math doesn't prevent bad decisions. The core insight: your brain evolved to avoid predators, not to compound capital over 40 years. Meet the major biases you'll encounter in the rest of the series.
**App tie-in:** nidhi's dashboard replaces gut feeling with numbers — a System-2 tool for a System-1 species.

---

### Post 31: Loss Aversion and the Disposition Effect
**Builds on:** Why Smart People (#30), Understanding Risk (#17), Investing 101 (#18)
**Key concept:** Losses hurt ~2× more than equivalent gains feel good (Kahneman & Tversky, prospect theory). Consequences: panic-selling in downturns, refusing to sell losing positions ("I'll sell when it gets back to even"), holding winners too briefly. The disposition effect: investors sell winners at 1.5× the rate they sell losers, even when tax-inefficient. Why checking your portfolio daily makes you worse off. Myopic loss aversion.
**App tie-in:** nidhi shows long-term projections, not daily price swings — reframing the time horizon fights short-term loss aversion.

---

### Post 32: Mental Accounting
**Builds on:** Why Smart People (#30), Budgeting (#14), Liabilities (#4)
**Key concept:** Treating money differently based on arbitrary labels, despite it all being fungible. The tax refund spent freely vs salary saved carefully. Paying off a small "scary" debt before a larger expensive one. Keeping emergency fund at 0.5% while carrying 18% credit card debt. The "house money effect" — gambling more with gains than principal. Why mental accounting is sometimes useful (budgeting buckets) and sometimes destructive (irrational prioritization). Sets up the invest-vs-debt decision in Optimizing.
**App tie-in:** nidhi's unified net worth view collapses artificial mental buckets into one truthful number.

---

### Post 33: Present Bias and the Battle With Your Future Self
**Builds on:** Why Smart People (#30), Cash Flow 101 (#10), Introduction to FI (#21)
**Key concept:** Hyperbolic discounting — we heavily overvalue immediate rewards vs future ones, and the discount curve is steepest in the short term. Why €100 today feels much more valuable than €110 next week, but €100 in 52 weeks feels roughly equal to €110 in 53 weeks. The "future self as a stranger" problem. Commitment devices: automating savings, pre-committing to raises going to retirement, making the default save-first. Why willpower loses and systems win.
**App tie-in:** nidhi's recurring contribution tracking and FIRE projections make the future self concrete and visible.

---

### Post 34: Overconfidence and the Planning Fallacy
**Builds on:** Why Smart People (#30), Investing 101 (#18), Financial Goals (#26)
**Key concept:** Most people rate themselves above-average investors — a mathematical impossibility. Overconfidence leads to excessive trading, under-diversification, and taking on concentrated bets. The planning fallacy: systematically underestimating time, cost, and difficulty of future projects (including savings plans). Why "I'll start saving more next year when I make more" almost never works out. Outside view vs inside view (Kahneman). Using base rates to counteract overconfidence. Prepares readers to set realistic assumptions in the Optimizing projections.
**App tie-in:** nidhi's projections use conservative deterministic math — but the user sets the assumptions, which is where overconfidence sneaks in.

---

### Post 35: Framing, Anchoring, and Price Psychology
**Builds on:** Why Smart People (#30), Liabilities (#4), Purchasing Power (#11)
**Key concept:** The same decision becomes different decisions based on how it's presented. "Save €200/month" vs "€2,400/year" vs "€72,000 over 30 years with compounding." A 1% fund fee sounds trivial but costs ~25% of lifetime returns (sets up Fee Optimization in Optimizing). Anchoring: the first number you see (sticker price, purchase price, last year's high) becomes the reference point, regardless of fundamentals. The sunk cost fallacy. Why re-framing is one of the cheapest financial skills to acquire.
**App tie-in:** nidhi surfaces the long-horizon framing — not "1% fee" but "€X lost to fees over 40 years."

---

### Post 36: Herd Behavior, FOMO, and Social Influence
**Builds on:** Why Smart People (#30), Investing 101 (#18), Diversification (#20)
**Key concept:** Humans are wired to follow the crowd — evolutionarily adaptive, financially dangerous. Buying because "everyone else is buying" is the mechanism of bubbles; selling because "everyone else is selling" is the mechanism of crashes. FOMO (fear of missing out) as a decision-driver. Social proof in investing: why a rising stock attracts more buyers regardless of fundamentals. Why the best long-term investors are often boring and unfashionable. The cost of needing to tell friends about your portfolio.
**App tie-in:** nidhi is a private, personal tool — it doesn't show you what "everyone else" is doing.

---

### Post 37: Narrative Economics and Bubbles
**Builds on:** Herd Behavior (#36), Investing 101 (#18), Understanding Risk (#17)
**Key concept:** Shiller's narrative economics: stories drive markets more than fundamentals. Historical bubbles (Tulip mania 1637, South Sea 1720, dotcom 2000, housing 2008, various crypto cycles) share the same anatomy: plausible story + rising prices + new-era thinking + "this time is different." Why bubbles feel obvious in hindsight but are hard to identify in real time. Recency bias and availability bias amplifying the narrative. How to stay grounded when the story is seductive. Sets up Monte Carlo interpretation in Optimizing — probability as a grounding tool against narratives.
**App tie-in:** nidhi projects with user-set growth rates — if you believe "this time is different," you can model it and see the long-term math.

---

### Post 38: Money Scripts -- Your Financial Autobiography
**Builds on:** Why Smart People (#30), Cash Flow 101 (#10), Financial Goals (#26)
**Key concept:** Klontz's research on money scripts — unconscious beliefs about money formed in childhood, often from observing parents. Four patterns: money avoidance (money is bad, wealthy people are greedy), money worship (more money solves everything), money status (net worth = self-worth), money vigilance (secrecy, anxiety, hoarding). Why couples fight about money (often clashing scripts, not clashing numbers). Identifying your own script. Why self-awareness of money beliefs often matters more than financial literacy.
**App tie-in:** nidhi shows numbers without judgment — a neutral mirror against which users can examine their own scripts.

---

### Post 39: Building an Anti-Bias Financial Life
**Builds on:** Entire Psychology series; bridges to Optimizing
**Key concept:** Capstone. You can't rewire your brain, but you can design a financial life that works *despite* your biases. Automation (remove willpower from the equation). Defaults (set save-first, opt-out of bad choices). Checklists (slow down System 1 when stakes are high). Pre-commitment (Ulysses contracts, locked-in raises). Reduce decision frequency (annual reviews beat daily checking). Boring is beautiful (index funds, dollar-cost averaging). Using a dashboard to replace gut feeling with numbers. Sets up Optimizing and Mastery: fine-tuning and advanced strategy only work if your behavior doesn't sabotage them.
**App tie-in:** nidhi is itself a bias-fighting system — automation of tracking, long-term framing, neutral math, System-2 dashboards for a System-1 brain.

---

# OPTIMIZING (Posts 40-51)

> Fine-tuning what works. Projections, scenario modeling, and applied planning. With Psychology as prep, you're less likely to let biases undo the optimization.

### Post 40: Financial Projections -- Where Will You Be in 10, 20, 30 Years?
**Builds on:** Appreciation/Depreciation (#6), Investing 101 (#18), Financial Goals (#26), Overconfidence (#34)
**Key concept:** Projecting net worth forward using growth rates, inflation, recurring contributions, and liability payoffs. Small differences compound dramatically. Projections aren't predictions (assumptions matter) — and overconfident assumptions (covered in #34) are the most common failure mode.
**App tie-in (add on launch day):** nidhi runs 50-year deterministic projections per-asset, incorporating growth rates, inflation, and surplus allocation.

---

### Post 41: Cash Flow Forecasting -- Will You Have Enough When You Need It?
**Builds on:** Cash Flow 101 (#10), Financial Projections (#40), Financial Health Metrics (#28)
**Key concept:** **[GAP FILL — critical for Phase 1.5 cash flow modeling]** Net worth projections tell you where your wealth is headed. Cash flow forecasting tells you whether you'll have enough cash in the right place at the right time. Month-by-month income vs. expense projections. Detecting future shortfalls before they happen. Liquidity planning: ensuring large upcoming expenses (tuition, down payment, car) don't force you to sell investments at the wrong time. Emergency fund adequacy as a dynamic metric (months of expenses covered by liquid assets, not a static number). The cash runway question: if income stopped today, how long could you sustain your current expenses? Why cash flow problems can exist even when net worth is growing (illiquid wealth, timing mismatches).
**App tie-in (add on launch day):** nidhi's Phase 1.5 cash flow model projects month-by-month income vs. expenses, detects shortfall months, and calculates emergency fund coverage dynamically (customer Q73-Q76).

---

### Post 42: What-If Scenarios -- Modeling Different Life Paths
**Builds on:** Financial Projections (#40), Cash Flow 101 (#10)
**Key concept:** What if you took a lower-paying job? Bought a house? Moved countries? Changing one variable ripples through your entire financial future. Decision-making under uncertainty.
**App tie-in (add on launch day):** nidhi's what-if engine lets you override any assumption and instantly see how it changes your trajectory.

---

### Post 43: Life Events and Your Finances -- Children, Career Breaks, Relocations
**Builds on:** What-If Scenarios (#42), Cash Flow 101 (#10), Financial Projections (#40)
**Key concept:** Major life events change your financial picture dramatically but predictably. Children (expense increase, income decrease), career breaks (income gap), buying a home (asset + liability), relocating (income and expense shift). Planning for the foreseeable, buffering for the unforeseeable.
**App tie-in (add on launch day):** nidhi's projection engine handles future-dated assets, hypothetical expenses, and what-if overrides -- purpose-built for modeling life events.

---

### Post 44: Invest or Pay Off Debt? -- The Math Behind the Decision
**Builds on:** Liabilities (#4), Appreciation/Depreciation (#6), Investing 101 (#18), Mental Accounting (#32)
**Key concept:** Compare the guaranteed return of paying off debt (the interest rate) vs the expected return of investing. When the math is clear (credit card at 22% vs market at 7%) and when it's ambiguous (mortgage at 3.5% vs market at 7%). Show both outcomes side by side. Mental accounting (covered in #32) often makes people pay off the "scary" debt instead of the expensive one — the math here corrects that.
**App tie-in (add on launch day):** nidhi models both scenarios in its what-if engine -- pay debt faster vs invest more -- so you can see the long-term impact.

---

### Post 45: Portfolio Rebalancing -- Keeping Your Plan on Track
**Builds on:** Diversification (#20), Getting Started (#19), Financial Goals (#26), Loss Aversion (#31)
**Key concept:** Over time, different assets grow at different rates, drifting your allocation from your target. Rebalancing restores it. When to rebalance (calendar vs threshold). Tax-efficient rebalancing (new contributions first). Why discipline matters more than timing — rebalancing means selling winners and buying losers, which loss aversion (#31) makes emotionally hard.
**App tie-in (add on launch day):** nidhi tracks your asset allocation and shows drift from your target, so you know when rebalancing makes sense.

---

### Post 46: Fee Optimization -- The Silent Drag on Your Returns
**Builds on:** Investing 101 (#18), Financial Projections (#40), Framing (#35)
**Key concept:** Expense ratios, trading costs, advisor fees, platform fees. A 1% fee difference compounds into tens of thousands over decades. How to compare funds by total cost. Why low-cost index funds dominate long-term. The only guaranteed way to improve returns: reduce costs. This is where reframing matters most (covered in #35) — "1%" sounds tiny until you see "€X over 40 years."
**App tie-in (add on launch day):** nidhi's projection engine shows the impact of different growth rate assumptions -- and fees directly reduce your effective growth rate.

---

### Post 47: Real Returns and Benchmarking -- Is Your Portfolio Actually Performing?
**Builds on:** Purchasing Power (#11), Investing 101 (#18), Financial Projections (#40)
**Key concept:** Nominal return vs real (inflation-adjusted) return. How to benchmark your portfolio against relevant indices. Why comparing to "the market" requires knowing which market. When underperformance signals a problem vs normal volatility. The danger of chasing past performance. How much of your net worth growth came from contributions vs. market returns (customer Q80) -- and why that distinction matters.
**App tie-in (add on launch day):** nidhi projects with user-set growth rates and inflation, so you can compare actual performance against your assumptions over time.

---

### Post 48: Monte Carlo & Probability -- Why One Projection Isn't Enough
**Builds on:** Financial Projections (#40), Narrative Economics (#37)
**Key concept:** A single projection assumes fixed returns every year. Reality is volatile. Monte Carlo runs thousands of simulations using historical return distributions to show a range of outcomes. "In 85% of historical simulations, this plan succeeded." Understanding percentiles (10th = bad luck, 50th = median, 90th = good luck). Why this matters for retirement planning especially. Probabilistic thinking is the antidote to narrative thinking (#37).
**App tie-in (add on launch day):** nidhi's Phase 2 Monte Carlo engine runs probabilistic projections and shows confidence ranges.

---

### Post 49: Geographic Arbitrage -- How Location Shapes Your Financial Plan
**Builds on:** Euro Buys More (#12), What-If Scenarios (#42), Cash Flow 101 (#10)
**Key concept:** Living where costs are low while earning where salaries are high. Remote work as a financial lever. How relocating affects cash flow, savings rate, and FIRE timeline. The math of geo-arbitrage: same income, different expense base = dramatically different wealth trajectory. Practical considerations: visa, healthcare, social network, taxes (generic).
**App tie-in (add on launch day):** nidhi's multi-currency support and what-if engine let you model the financial impact of living in different countries.

---

### Post 50: Income Replacement Ratio -- How Much Income Do You Need in Retirement?
**Builds on:** Cash Flow 101 (#10), Financial Goals (#26), Financial Projections (#40)
**Key concept:** The percentage of pre-retirement income needed to maintain your lifestyle. Why 70-80% is a common benchmark (no commuting costs, no saving for retirement, potentially lower taxes). How to calculate your own number based on actual projected expenses. How pension income, investment income, and savings drawdown combine to replace your salary.
**App tie-in (add on launch day):** nidhi projects income replacement from all sources -- active income, passive income, and portfolio drawdown.

---

### Post 51: The Invest-vs-Debt Decision Tree -- Advanced Scenarios
**Builds on:** Invest or Pay Off Debt (#44), What-If Scenarios (#42)
**Key concept:** Beyond the simple rate comparison. When employer matching makes investing win even at higher debt rates. The psychological value of being debt-free. How tax deductions on debt (mortgage interest) change the math. Student loans: income-driven repayment vs aggressive payoff. Multiple debts + investment opportunities simultaneously.
**App tie-in (add on launch day):** nidhi's what-if engine handles multiple scenarios simultaneously so you can compare complex paths.

---

# MASTERY (Posts 52-63)

> The long game. Financial independence, retirement, and advanced strategies.

### Post 52: FIRE -- Advanced Strategies for Financial Independence
**Builds on:** Introduction to Financial Independence (#21), Investing 101 (#18), Financial Projections (#40), Building an Anti-Bias Financial Life (#39)
**Key concept:** Building on the FI introduction (#21), this goes deeper. Barista FIRE (part-time income covers gap). The savings rate / years-to-FI table in detail. Why sequence of returns risk matters most in the first 5 years of FIRE. The "one more year" trap (a behavioral problem — see #33 present bias). Common FIRE mistakes: underestimating expenses, ignoring healthcare costs, neglecting inflation. When FIRE is realistic and when the math doesn't work. The role of flexibility (variable spending, side income) in making FIRE achievable at lower multiples.
**App tie-in (add on launch day):** nidhi calculates all FIRE numbers, tracks milestone progress (25/50/75/100%), and shows when you'll cross each threshold in your projections.

---

### Post 53: The Safe Withdrawal Rate -- How Much Can You Take Out Each Year?
**Builds on:** FIRE (#52), Purchasing Power (#11), Investing 101 (#18)
**Key concept:** The 4% rule (Trinity Study). What can go wrong (sequence of returns risk, inflation spikes, longevity). Why SWR isn't a guarantee but a guideline. FIRE number = annual expenses / SWR.
**App tie-in (add on launch day):** nidhi uses your SWR (default 4%, configurable) to calculate your FIRE targets and project drawdown sustainability.

---

### Post 54: Retirement Planning -- What Traditional Retirement Looks Like
**Builds on:** FIRE (#52), SWR (#53), Financial Projections (#40)
**Key concept:** State pensions, employer pensions, private retirement accounts. How retirement accounts differ from regular investments (tax advantages, liquidity restrictions). Starting early matters. Retirement age vs FIRE age. Planning for 30+ years.
**App tie-in (add on launch day):** nidhi separates retirement investments from regular investments and models both in projections.

---

### Post 55: Sequence of Returns Risk -- Why When Matters as Much as How Much
**Builds on:** SWR (#53), Financial Projections (#40), Monte Carlo (#48)
**Key concept:** Poor market returns early in retirement are far more damaging than poor returns later. The math behind sequence risk. Why a 7% average doesn't mean 7% every year. How to buffer against it (cash reserves, flexible spending, bond tent strategy). Loss aversion (#31) makes this especially dangerous — panic-selling in an early-retirement downturn locks in the damage.
**App tie-in (add on launch day):** nidhi's projection engine models different return sequences so you can see the impact on retirement sustainability.

---

### Post 56: Longevity Risk -- Planning When You Don't Know the End Date
**Builds on:** Retirement Planning (#54), SWR (#53)
**Key concept:** The risk of outliving your money. Average life expectancy vs planning age. Why planning to 90 or 95 matters. Strategies: annuities, delayed pension claiming, maintaining growth assets in retirement. The trade-off between running out and leaving too much behind.
**App tie-in (add on launch day):** nidhi's projections extend to 50 years and let you adjust life expectancy to see the impact.

---

### Post 57: Pension Income and Payout Options -- Lump Sum, Annuity, or Both?
**Builds on:** Retirement Planning (#54), Financial Projections (#40), Longevity Risk (#56)
**Key concept:** Multiple retirement income streams: state pension, employer pension, personal savings. How to estimate pension income. When to claim (early vs late trade-off). Lump sum vs annuity: liquidity and growth potential vs guaranteed lifetime income. How pension income changes the FIRE calculation.
**App tie-in (add on launch day):** nidhi models passive income streams alongside portfolio drawdown in retirement projections.

---

### Post 58: Tax-Aware Investing -- Keeping More of What You Earn
**Builds on:** Investing 101 (#18), Retirement Planning (#54), Taxes and Your Financial Plan (#29)
**Key concept:** Tax-advantaged accounts: contributing pre-tax or growing tax-free. Asset location: why some investments belong in tax-advantaged accounts. Tax-efficient withdrawal sequencing: which accounts to draw from first. All explained generically -- no jurisdiction-specific rates or products.
**App tie-in (add on launch day):** nidhi's `is_tax_advantaged` flag and configurable tax rates let you model tax impact without jurisdiction-specific calculations.

---

### Post 59: Withdrawal Sequencing -- Which Accounts to Tap First
**Builds on:** Tax-Aware Investing (#58), SWR (#53), Retirement Planning (#54)
**Key concept:** In retirement, the order you draw from different account types matters enormously for total tax paid and portfolio longevity. Taxable first, tax-deferred second, tax-free last (common strategy). Why Roth conversions / tax-free account strategies matter. How to think about it without jurisdiction-specific rules.
**App tie-in (add on launch day):** nidhi's projection engine models drawdown from multiple asset types with different tax treatment.

---

### Post 60: International Retirement -- How Location Changes the Math
**Builds on:** Euro Buys More (#12), Life Events (#43), Retirement Planning (#54)
**Key concept:** Retiring in a lower-cost country can dramatically reduce your FIRE number. PPP in practice: same retirement, different price tag. Tax residency implications (generic). Healthcare considerations. The emotional vs financial trade-off of moving.
**App tie-in (add on launch day):** nidhi's multi-currency support and what-if engine let you compare retirement scenarios across countries.

---

### Post 61: Estate Planning Basics -- What Happens to Your Wealth After You
**Builds on:** Assets (#3), Retirement Planning (#54), Longevity Risk (#56)
**Key concept:** Estate planning isn't just for the wealthy. What happens without a plan (intestacy). The basics: wills, beneficiary designations, power of attorney. Why estate planning intersects with financial planning (gifting, inheritance tax concepts, generational wealth transfer). Kept generic.
**App tie-in (add on launch day):** nidhi's what-if engine can model inheritance scenarios (Q24) and gifting impacts on net worth projections.

---

### Post 62: Generational Wealth -- Building Beyond Your Lifetime
**Builds on:** Estate Planning (#61), Investing 101 (#18), FIRE (#52)
**Key concept:** Wealth that outlasts one generation. The difference between inheritance (one-time transfer) and generational wealth (self-sustaining). Teaching financial literacy to the next generation. Trust structures (concept only, not legal advice). Why compound interest across generations is the most powerful wealth engine. The responsibility that comes with building lasting wealth.
**App tie-in (add on launch day):** nidhi's 50-year projections can model multi-generational wealth trajectories.

---

### Post 63: The Complete Picture -- How Everything Connects
**Builds on:** All previous posts
**Key concept:** A capstone post mapping the entire journey from discovery to mastery. How net worth, cash flow, investing, projections, FIRE, and retirement planning form an interconnected system. Where you are, where you're going, what could change the path. Why revisiting your plan annually matters more than getting it perfect once.
**App tie-in (add on launch day):** nidhi is the tool that holds all these pieces together -- the dashboard that turns everything you've learned into a living financial plan.

---

---

### BETA LAUNCH POST (unnumbered, major event)
**Level:** n/a -- announcement, not educational
**Builds on:** Everything from posts 1-29
**Key concept:** "You've been learning the building blocks of financial planning. Now there's a tool that puts it all together." Maps each concept readers have learned (net worth, assets, liabilities, cash flow, budgeting, investing, diversification, FIRE basics, loan comparison, goals) to the specific nidhi feature that implements it.
**Timing:** Immediately after post 29 (end of Building level), before the Psychology series begins. Target: **late June 2026** (post 29 lands Mon Jun 22). At this point readers have the full foundation + practical skills that map 1:1 to the app's Phase 1 feature set, including FIRE concepts and loan comparison understanding.
**Follow-up action:** Same day, add brief CTAs to all posts 1-29. All subsequent posts (30+) ship with CTAs built in from the start — the Psychology series uses the app as its recurring example of a System-2 anti-bias tool.

---

## Summary: Reading Order by Level

```
DISCOVERY (posts 1-16) -- 8 live, 8 written/scheduled
  1.  What Is Net Worth                     (live)
  2.  How to Calculate Net Worth            (live)
  3.  Assets                                 (live)
  4.  Liabilities                            (live)
  5.  How to Get Out of Debt                 (live)
  6.  Appreciation vs Depreciation           (live)
  7.  Liquidity                              (live)
  8.  Emergency Fund                         (live - May 4)
  9.  Income vs Wealth                       (Wed May 6)
  10. Cash Flow 101 (includes savings rate)  (Fri May 8)
  11. Purchasing Power                       (Mon May 11)
  12. Why Your Euro Buys More                (Wed May 13)
  13. Saving vs Investing                    (Fri May 15)
  14. Budgeting                              (Mon May 18) [moved from Building]
  15. Credit and Credit Scores               (Wed May 20)
  16. Insurance Basics                       (Fri May 22) [GAP FILL]

BUILDING (posts 17-29) -- all planned
  17. Understanding Risk                     (Mon May 25)
  18. Investing 101: Asset Classes           (Wed May 27)
  19. Getting Started: Accounts & DCA
  20. Diversification
  21. Introduction to Financial Independence [GAP FILL — critical]
  22. Multi-Currency
  23. Real Estate as Investment
  24. Understanding Loan Terms               [GAP FILL — critical]
  25. Passive Income Streams
  26. Financial Goals
  27. Financial Dashboard
  28. Financial Health Metrics
  29. Taxes and Your Financial Plan          (Mon Jun 22) [GAP FILL] -> BETA LAUNCH

PSYCHOLOGY (posts 30-39) -- all planned [NEW LEVEL — added May 4, 2026]
  30. Why Smart People Make Dumb Money Decisions
  31. Loss Aversion and the Disposition Effect
  32. Mental Accounting
  33. Present Bias and the Battle With Your Future Self
  34. Overconfidence and the Planning Fallacy
  35. Framing, Anchoring, and Price Psychology
  36. Herd Behavior, FOMO, and Social Influence
  37. Narrative Economics and Bubbles
  38. Money Scripts: Your Financial Autobiography
  39. Building an Anti-Bias Financial Life   (Wed Jul 15)

OPTIMIZING (posts 40-51) -- all planned
  40. Financial Projections
  41. Cash Flow Forecasting                  [GAP FILL — critical]
  42. What-If Scenarios
  43. Life Events
  44. Invest or Pay Off Debt
  45. Portfolio Rebalancing
  46. Fee Optimization
  47. Real Returns & Benchmarking
  48. Monte Carlo & Probability
  49. Geographic Arbitrage
  50. Income Replacement Ratio
  51. Invest-vs-Debt Advanced                (Wed Aug 12)

MASTERY (posts 52-63) -- all planned
  52. FIRE: Advanced Strategies              [RETITLED — intro now in #21]
  53. Safe Withdrawal Rate
  54. Retirement Planning
  55. Sequence of Returns Risk
  56. Longevity Risk
  57. Pension Income & Payout Options
  58. Tax-Aware Investing
  59. Withdrawal Sequencing
  60. International Retirement
  61. Estate Planning Basics
  62. Generational Wealth
  63. The Complete Picture (capstone)        (Wed Sep 9)
```

---

## App Feature Alignment

| Post | Primary App Feature |
|------|-------------------|
| 1-2 | Net worth calculation, multi-currency dashboard |
| 3 | 11 asset types |
| 4-5 | Liability tracking, amortization, debt-to-asset ratio |
| 6 | Per-asset growth rates, projection engine |
| 7 | Liquid vs illiquid split |
| 8 | Cash asset tracking, threshold alerts |
| 9-10 | Income tracking (active + passive), savings rate, recurring expenses |
| 11-12 | Expected inflation rate, multi-currency, ECB rates |
| 13 | Asset type classification (cash vs investment), opportunity cost, present value |
| 14 | Recurring expense tracking, fixed vs discretionary |
| 15 | Liability tracking (credit impacts borrowing costs) |
| 16 | Recurring expense tracking (insurance premiums), emergency fund sizing |
| 17 | Per-asset growth rate assumptions |
| 18 | Investment asset tracking, growth rates |
| 19 | recurring_contribution asset type, DCA modeling |
| 20 | Asset allocation breakdown, liquid/illiquid split |
| 21 | Lean/Traditional/Fat/Coast FIRE calculations, free FIRE calculator, free Coast FIRE calculator |
| 22 | 150+ currencies, currency concentration (Q3), conversion what-if (Q23) |
| 23 | real_estate asset type, mortgage amortization |
| 24 | Loan vendor comparison tool, IRR methodology, break-even analysis |
| 25 | income_passive asset type, crossover point (Q16) |
| 26 | Projection engine, target modeling |
| 27 | Full dashboard: net worth, cash flow, FIRE, projections |
| 28 | Debt-to-asset ratio (Q4), liquid % (Q5), savings rate (Q10), health checklist (Q71) |
| 29 | is_tax_advantaged flag, configurable tax rates, after-tax return projections |
| 30 | Dashboard as System-2 tool (no direct feature — introduces bias framework) |
| 31 | Long-horizon projections reframe loss aversion (no direct feature) |
| 32 | Unified net worth view collapses mental accounting buckets |
| 33 | Recurring contributions, FIRE projections make future self concrete |
| 34 | User-set assumptions in projections (where overconfidence sneaks in) |
| 35 | Long-horizon fee/cost framing in projections |
| 36 | Private personal tool (no social feed; bias resistance by design) |
| 37 | User-set growth rates allow modeling "this time is different" narratives |
| 38 | Neutral numbers, no judgment (money script reflection) |
| 39 | App itself as anti-bias system (automation, defaults, long-term framing) |
| 40 | 50-year deterministic projection engine |
| 41 | Phase 1.5 cash flow model, shortfall detection, emergency fund coverage, cash runway (Q73-Q76) |
| 42 | What-if override engine |
| 43 | Future-dated assets, hypothetical assets/liabilities |
| 44 | What-if comparisons (Q63) |
| 45 | Asset allocation tracking, drift detection (Q91, Q93) |
| 46 | Growth rate assumptions (fees reduce effective rate) |
| 47 | Inflation-adjusted returns (Q70), contributions vs market returns (Q80) |
| 48 | Phase 2 Monte Carlo engine, confidence ranges (Q57-59) |
| 49 | Multi-currency what-if, geographic scenarios (Q59, Q105) |
| 50 | Income replacement calculation (Q40, Q42, Q15) |
| 51 | Multi-scenario what-if comparisons |
| 52 | FIRE milestone tracking, progress notifications (25/50/75/100%) |
| 53 | Configurable SWR, FIRE number formula (Q60) |
| 54 | investment_retirement asset type, projection engine |
| 55 | Return sequence modeling (Q108) |
| 56 | Adjustable life expectancy (Q111) |
| 57 | Passive income modeling, income_passive (Q52, Q100, Q101) |
| 58 | is_tax_advantaged flag, user-entered tax rates (Q94, Q97-99) |
| 59 | Multi-type drawdown modeling (Q89-90) |
| 60 | Multi-currency projections, PPP-aware what-if (Q105) |
| 61 | Inheritance what-if (Q24), gifting (Q103) |
| 62 | 50-year projections, generational modeling |
| 63 | Full dashboard, all features |

---

## MiFID II / CNB Regulatory Alignment

Blog posts are public educational content ("issued exclusively for the public") and do NOT trigger MiFID II. However, blog language should stay consistent with the app's regulatory posture. Core principle: **"nidhi shows math. The user makes decisions."**

Reference: `/docs/strategy/regulatory-advisory-classification.md` (7 bright lines)

### Per-Post Guardrails

| Post | Risk | Guardrail |
|------|------|-----------|
| **18. Investing 101** | "recommendation" language | "Commonly cited in personal finance literature." Present options, not advice |
| **19. Getting Started** | Could recommend accounts/products | Generic account types only. Never name jurisdiction-specific products |
| **20. Diversification** | Could prescribe allocation | Concept level only. Don't prescribe a specific mix |
| **21. FI Introduction** | Could imply target savings rate | Present as math: "at X% savings rate, it works out to Y years." Never prescribe a target rate. BL#7 |
| **22. Multi-Currency** | Could recommend currencies | Educate on exposure as risk. Never recommend holding a specific currency |
| **24. Loan Terms** | Could recommend specific loan products | Present comparison framework and metrics. Never recommend a specific offer or lender. BL#7 |
| **27. Dashboard** | Could rank actions | Present monitoring cadences as "common approaches" not prescriptions |
| **29. Taxes** | Tax rules jurisdiction-specific | Generic concepts only. Never name specific tax codes, rates, or products. BL#4 |
| **30. Why Smart People** | Could sound condescending/prescriptive about behavior | Frame as universal human wiring, not user failing. Cite research (Kahneman, Tversky). No "you should be rational" |
| **37. Narrative Economics** | Could call a current bubble | Historical examples only. Never claim a specific current asset is in a bubble. BL#6 |
| **38. Money Scripts** | Not therapy or diagnosis | Educational reflection only. No diagnostic claims, no prescriptions to seek therapy. Refer to primary source (Klontz) |
| **44. Invest vs Debt** | Could become "you should" | Show both outcomes side by side. User decides |
| **45. Rebalancing** | Could prescribe frequency | Present calendar vs threshold approaches equally |
| **48. Monte Carlo** | Probability as prediction | "In X% of historical simulations..." Never "you have an X% chance." BL#6 |
| **52. FIRE** | Could imply target savings rate | Present as math: "at X%, it works out to Y years" |
| **53. SWR** | "The 4% rule" as advice | "Trinity Study found in historical simulations..." |
| **54. Retirement** | Tax advantages are jurisdiction-specific | "Many countries offer..." Never name specific products. BL#4 |
| **57. Pension** | Pension rules jurisdiction-specific; lump sum vs annuity | Present both options side by side. Never recommend one |
| **58. Tax-Aware** | Tax rules jurisdiction-specific | Generic concepts only. User enters rates. BL#4 |
| **59. Withdrawal Seq.** | Could prescribe order | Present common strategies side by side. Never rank. BL#7 |
| **60. Intl Retirement** | Tax residency jurisdiction-specific | Cost-of-living comparison only |
| **61. Estate Planning** | Inheritance law jurisdiction-specific | Generic concepts. Never state specific thresholds or rules |

### General Rules for All Posts

1. **No "should" with instruments.** "Index funds are a common choice" not "you should buy index funds."
2. **Present options, not recommendations.** Side by side. Let the reader decide.
3. **Use "common guideline" language.** "A common guideline is 3-6 months" not "you need 6 months."
4. **Keep tax references generic.** Never name jurisdiction-specific rules, rates, or products.
5. **Historical framing for returns.** "Stocks have historically returned ~7% annually" not "stocks return 7%."

---

## LearningPath.tsx Update (when posts ship)

The `covered` descriptions in `src/components/LearningPath.tsx` should be updated to match actual content:

```
discovery:  "Net worth, assets, liabilities, cash flow, debt, compound interest, liquidity, emergency funds, purchasing power, saving vs investing, budgeting, credit, insurance"
building:   "Risk, asset classes, investment accounts, diversification, financial independence intro, multi-currency, real estate, loan terms, passive income, goals, dashboard, health metrics, taxes"
psychology: "Loss aversion, mental accounting, present bias, overconfidence, framing and anchoring, herd behavior, narrative economics, money scripts, anti-bias systems"
optimizing: "Projections, cash flow forecasting, what-if scenarios, life events, invest-vs-debt, rebalancing, fees, benchmarking, Monte Carlo, geo-arbitrage, income replacement"
mastery:    "FIRE advanced strategies, safe withdrawal rate, retirement, sequence risk, longevity, pensions, tax-aware investing, withdrawal sequencing, international retirement, estate planning, generational wealth"
```

**Schema change required:** Add `'psychology'` to the `level` enum in `src/content.config.ts` (line 15). Add `psychology` entry to the levels array and `covered` map in `src/components/LearningPath.tsx` before the first Psychology post (#30) ships on Wed Jun 24, 2026.