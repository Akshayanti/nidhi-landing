---
slug: "advanced-rebalancing"
title: "Advanced Rebalancing: Glide Paths and Bond Tents"
description: "Basic rebalancing holds a static target. Advanced rebalancing moves the target over time: glide paths and bond tents for when bad returns hurt most."
tldr: "The rebalancing post in Building covered calendar-based, threshold-based, and contribution-based rebalancing to a static target. This post covers what changes as you approach and enter retirement. Glide paths gradually shift allocation from higher-risk to lower-risk over time; the classic 100-minus-age formula is one version, target-date-fund shapes are another, and each has trade-offs. Bond-tent strategies temporarily raise bond allocation in the 5 years before and 5 years after retirement to buffer against sequence-of-returns risk (the specific danger of bad early-retirement returns). Rebalancing frequency and threshold tightening often makes sense near retirement because the cost of drift is asymmetric (bad drift hurts more than good drift helps at drawdown). Tax-aware rebalancing across taxable and tax-advantaged accounts uses new contributions and withdrawals to shift allocation without triggering unnecessary tax events. Common mistakes: over-aggressive de-risking that leaves you exposed to inflation over 30+ years of retirement, and letting loss aversion drive rebalancing decisions (rebalancing that feels safer often sacrifices real return without meaningful risk reduction). The Mastery-level posts on sequence risk and withdrawal sequencing go deeper; this post positions the accumulation-to-drawdown transition."
takeaways:
  - "What the 100 minus age rule captures and where it falls short"
  - "How a bond tent cushions the years right around retirement"
  - "Why too many bonds can leave a long retirement exposed to inflation"
  - "Why guaranteed income like a pension can justify more equity"
order: 60
pubDate: 2099-01-29
updatedDate: 2026-09-02
localRules: [tax]
level: "optimizing"
primaryPersona: "eva"
personas: ["eva", "petra", "marcus", "jiri"]
tags: ["optimizing", "investing", "planning"]
faq:
  - question: "What is a glide path?"
    answer: "A glide path is a pre-planned reduction in equity allocation as you approach retirement. The idea: earlier in a career, when the portfolio is small and the working years ahead are many, many people hold more equity; nearer retirement, when the portfolio is large and the years to recover from losses are few, lower equity allocation reduces the risk of a bad-timing loss doing lasting damage. The classic simple formula is '100 minus your age in stocks' (a 30-year-old holds 70% stocks, a 60-year-old holds 40%); more modern variants use 110 or 120 minus age given longer life expectancies. Target-date retirement funds implement glide paths automatically: each fund is named for a retirement year and gradually shifts allocation as that year approaches. The trade-off is that de-risking too early costs meaningful growth (bonds have lower long-run expected return than stocks); de-risking too late leaves you exposed to sequence-of-returns risk. The right glide path depends on your specific situation, risk tolerance, and how much of your retirement income is portfolio-dependent versus pension-covered."
  - question: "What is a bond tent, and why does it help sequence risk?"
    answer: "A bond tent is a specific glide-path shape that temporarily raises bond allocation in the 5 years before and 5 years after retirement, then gradually rolls back down to a lower bond allocation as retirement progresses. The rationale: sequence-of-returns risk (the danger of bad early returns during drawdown) is concentrated in the first 5 to 10 years of retirement. Having a temporarily higher bond allocation during this window means less portfolio value is exposed to a bad market when you are simultaneously drawing income. After the window, if returns have been decent, you gradually shift back toward higher equity because the sequence risk has largely passed and 20+ years of remaining retirement still benefit from long-run equity growth. The tent shape (bond allocation goes up, then back down) is deliberate; the alternative of just steadily reducing equity all the way through retirement leaves you underinvested in growth assets for the majority of the retirement period."
  - question: "How does rebalancing change when I approach retirement?"
    answer: "Three things typically shift. First, frequency and threshold: many households tighten rebalancing bands as they approach retirement because the cost of drift is asymmetric. Being over-allocated to equity right before a crash matters more than being over-allocated to bonds right before a rally. Second, tax-awareness increases: in accumulation, using new contributions to rebalance is often the tax-cheapest approach; near retirement and in drawdown, contributions may have stopped, and rebalancing must happen through selling, which triggers tax in taxable accounts. Coordinating rebalancing across account types (rebalance first in tax-advantaged accounts where there is no tax consequence) becomes more important. Third, the target itself may shift under the glide path or bond tent; the rebalancing is not to a fixed 60/40 but to a moving target that reduces equity gradually or non-monotonically."
  - question: "Should I use a target-date fund for automatic glide-path rebalancing?"
    answer: "Many households use one as a default. Target-date funds implement a pre-designed glide path automatically, rebalance internally, and at the leading US providers typically have low expense ratios (0.05% to 0.20%); availability and costs vary by country. For households who do not want to manage allocation actively, that simplicity is the main appeal. The trade-offs: the specific glide-path shape is designed for an average investor, which may not match your specific situation (your specific pension coverage, risk tolerance, retirement age target); the fund's tax efficiency in a taxable account is generally lower than a portfolio of separate stock and bond index funds because internal rebalancing generates capital-gains distributions in the US and some other systems; where funds do not distribute gains, or tax them differently, this may not apply. Target-date funds work best in tax-advantaged accounts where the internal rebalancing has no tax consequence. In taxable accounts, a portfolio of separate index funds with periodic manual rebalancing is often more efficient. For households who prefer full control or have unusual circumstances, custom glide paths can be constructed but require ongoing attention."
  - question: "What common rebalancing mistakes should I avoid near retirement?"
    answer: "Two big ones. First, over-aggressive de-risking. A common intuition is that retirees should hold mostly bonds because bonds are 'safe.' But retirement often lasts 25 to 35 years, and over that time inflation is the primary long-run risk. A portfolio that is 80% bonds and 20% equity has meaningfully lower long-run expected return, and if inflation runs above expectations, the real value of the portfolio may not sustain lifestyle over 30 years. Many retirement planners work with equity allocations somewhere around 40 to 70% in retirement rather than 20%, though the right level depends on pensions, spending flexibility and how much volatility someone can live with. Second, loss aversion driving rebalancing decisions. If equity has risen and your allocation drifts to over-target, rebalancing means selling equity to buy bonds. Loss aversion (see the loss aversion post) makes selling winners painful; many households delay rebalancing when it would sell winners and rush to rebalance when it would sell losers. The usual remedy is mechanical: explicit thresholds set in advance, followed when triggered, which takes the emotional decision out of the moment."
reelPromise: "Why the classic '100-minus-age' formula still teaches the right shape, what a bond tent buys you around the retirement transition, and the loss-aversion trap that quietly wrecks rebalancing near retirement"
relatedSlugs: ["rebalancing-your-portfolio", "introduction-to-financial-independence", "financial-projections", "loss-aversion-and-the-disposition-effect"]
referentialReading:
  - title: "The Ages of the Investor"
    author: "William Bernstein"
    url: "https://www.goodreads.com/book/show/13715796-the-ages-of-the-investor"
    type: "book"
  - title: "Reducing Retirement Risk with a Rising Equity Glide Path (Kitces / Pfau)"
    url: "https://www.kitces.com/blog/should-equity-exposure-decrease-in-retirement-or-is-a-rising-equity-glidepath-actually-better/"
    type: "blog"
  - title: "The Bogleheads' Guide to the Three-Fund Portfolio"
    author: "Taylor Larimore"
    url: "https://www.goodreads.com/book/show/40611856-the-bogleheads-guide-to-the-three-fund-portfolio"
    type: "book"
---

The [rebalancing post in Building](/blog/rebalancing-your-portfolio/) established the core mechanics: pick a target asset allocation, and periodically bring the portfolio back to that target as market movements pull it away. Calendar-based, threshold-based, or contribution-based methods all achieve the same goal. Research on rebalancing, such as Vanguard's, largely on US data, has generally found that annual or band-based rebalancing captures most of the risk-control benefit, and that rebalancing much more often adds cost without a clear gain.

This post is about what changes as you approach the end of accumulation and the beginning of drawdown. Two things shift: the target itself often starts to move (many people do not hold the same 80/20 allocation at 62 that they held at 32), and the cost of getting rebalancing wrong becomes asymmetric (in accumulation, over-allocation to equity in a downturn is an opportunity to buy more shares cheaply; in drawdown, it locks in losses that funded expenses).

Advanced rebalancing addresses both. Glide paths shift the target over time. Bond tents shift it non-monotonically around the retirement transition. Tighter thresholds and tax-aware coordination reduce the cost of drift. The final Mastery-level posts on sequence risk and withdrawal sequencing go deeper into the drawdown mechanics; this post is about positioning the transition.

## Glide paths: the target that moves

A glide path is a pre-planned reduction in equity allocation over time. The theoretical justification: earlier in a career, when the portfolio is small and working years ahead are many, higher equity allocation is easier to carry because the cost of a bad market is offset by decades of subsequent contributions and time to recover. Nearer retirement, when the portfolio is at its largest and working years are few, the cost of a bad market is much higher, and lower equity allocation reduces the risk of a badly-timed loss doing lasting damage.

**The simple heuristic.** "100 minus age in stocks" is the classic version. A 30-year-old holds 70% stocks, 30% bonds. A 40-year-old holds 60% stocks. A 60-year-old holds 40% stocks. Straightforward, easy to apply, and captures the direction of change most planners favour, though it ignores everything about the individual except age.

**The modern update.** Life expectancies have risen; retirement periods are longer; portfolios need to sustain 25 to 35 years of drawdown. Many modern versions use "110 minus age" or "120 minus age" to keep more equity later in life, recognising the long-run need for growth. A 60-year-old under "120 minus age" holds 60% stocks rather than 40%; the extra equity aims to keep ahead of inflation over a longer retirement, at the cost of larger swings.

**Target-date funds.** Commercial funds named after retirement years (Target Retirement 2050, Target Retirement 2030, etc.) implement glide paths automatically. Each fund holds a diversified allocation that gradually shifts toward more bonds as the target date approaches. The specific glide-path shape varies by provider, but the common features: high equity in the first decades, gradual shift toward bonds, arrival at some retirement-appropriate allocation at or near the target date, and often a continued gentle shift after the target date.

**What glide paths get right.** They embed the direction most planners favour (more bonds over time) into an automatic mechanism. They protect against the specific failure mode of setting an allocation at 30 and never revisiting it (a common enough pattern that target-date funds solve a real problem). They reduce the emotional weight of individual rebalancing decisions.

**What glide paths get wrong.** The specific glide-path shape is designed for an average investor. Your specific situation (pension coverage, risk tolerance, planned retirement age, health, other income streams, dependants) may not match. A household with a strong employer pension, for example, may be under-invested on a standard glide path (the pensions section below explains why).

**The custom-glide-path option.** For households who prefer more control, a custom glide path can be constructed: a target allocation set for each of several ages, with each annual review rebalancing to that changing target. This gives you control over the specific shape at the cost of requiring more attention.

<figure>
<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig-glide-title fig-glide-desc">
  <title id="fig-glide-title">Three glide-path shapes</title>
  <desc id="fig-glide-desc">A line chart showing equity allocation percentage on the vertical axis and age from 30 to 90 on the horizontal axis. Three lines: (1) classic 100-minus-age declining steadily from 70% at age 30 to 10% at age 90; (2) modern 120-minus-age declining more slowly from 90% at age 30 to 30% at age 90; (3) bond-tent shape starting at 70% at age 30, dropping more steeply in the five years before retirement to 40% at age 60, holding there until about 65, then rising back to 60% by age 80 and staying there.</desc>
  <text class="fig-title" x="360" y="42" text-anchor="middle">Three glide-path shapes</text>
  <text class="fig-subtitle" x="360" y="68" text-anchor="middle">Equity allocation over the working and retirement years. Illustrative.</text>
  <line x1="80" y1="330" x2="610" y2="330" class="fig-stroke-muted" />
  <line x1="80" y1="90" x2="80" y2="330" class="fig-stroke-muted" />
  <text class="fig-quote-small" x="80" y="355" text-anchor="start">Age 30</text>
  <text class="fig-quote-small" x="345.0" y="355" text-anchor="middle">Age 60</text>
  <text class="fig-quote-small" x="610.0" y="355" text-anchor="end">Age 90</text>
  <text class="fig-quote-small" x="75" y="95" text-anchor="end">100%</text>
  <text class="fig-quote-small" x="75" y="330" text-anchor="end">0%</text>
  <line x1="80.0" y1="162.0" x2="610.0" y2="306.0" class="fig-stroke-warn" stroke-width="2" />
  <text class="fig-quote-small" x="618.0" y="310.0" text-anchor="start">100-age</text>
  <line x1="80.0" y1="114.0" x2="610.0" y2="258.0" class="fig-stroke-blue" stroke-width="2" />
  <text class="fig-quote-small" x="618.0" y="262.0" text-anchor="start">120-age</text>
  <path d="M 80.0 162.0 L 300.8 181.2 L 345.0 234.0 L 389.2 234.0 C 433.3 234.0 477.5 186.0 521.7 186.0 L 610.0 186.0" fill="none" class="fig-stroke-teal" stroke-width="3" />
  <text class="fig-quote-small" x="618.0" y="190.0" text-anchor="start">Bond tent</text>
  <line x1="345.0" y1="90" x2="345.0" y2="330" class="fig-stroke-muted" stroke-dasharray="4" />
  <text class="fig-quote-small" x="345.0" y="105" text-anchor="middle">Retirement</text>
</svg>
<figcaption>Illustrative glide-path shapes. Straight-line rules capture the direction of the right change; bond-tent shapes specifically address the sequence-risk window around retirement.</figcaption>
</figure>

## The bond tent: a shape designed for sequence risk

Sequence-of-returns risk (introduced in the [projections post](/blog/financial-projections/), and covered more deeply in Mastery-level posts) is the danger of getting bad returns in the specific window when you are drawing income from the portfolio. Bad returns in year 1 of retirement, when you must sell shares to fund expenses, do more damage than the same-magnitude bad returns in year 25.

The bond tent is a glide-path shape designed specifically to reduce sequence-risk exposure. Its shape has three phases.

**Phase 1: pre-retirement (approximately 5 years before retirement).** The bond allocation rises gradually from wherever it was in accumulation (say, 30% bonds) to a higher level (say, 50 to 60% bonds). The rise happens in the years immediately before retirement so that the portfolio entering drawdown has lower equity exposure.

**Phase 2: early retirement (approximately 5 years after retirement).** The higher bond allocation is held. This is the peak sequence-risk window; the portfolio is at its largest and drawdowns are just beginning. Withdrawing from bonds preserves equity through a possible bad market.

**Phase 3: mid-and-late retirement (approximately year 5 to year 25+ of retirement).** The bond allocation gradually falls and equity rises back toward a moderate level (say, 50 to 60% equity). The rationale: sequence risk has largely passed, and 20+ years of remaining retirement still benefit from long-run equity growth. Inflation is one of the main risks in a long retirement, and equities have historically outpaced it over long periods, though not in every decade.

**The "tent" name.** Plotted against age, the bond allocation rises to a peak around retirement (the "tent pole") and then declines back down. The shape is asymmetric to the sequence-risk exposure it addresses.

**Where the tent came from.** Research by Wade Pfau, Michael Kitces, and others (from roughly 2013 onwards) formalised what many advisors had been suggesting informally: reducing sequence-risk exposure specifically around the transition, rather than reducing equity monotonically through retirement, produced better outcomes in many simulated retirement paths. The simulations rest largely on US return history and on assumptions about withdrawals, so they show a tendency rather than a guarantee.

**When the tent matters most.** For households where the portfolio must cover a substantial fraction of retirement expenses. Households withdrawing 3.5% to 4.5% of the portfolio annually see the largest tent benefit.

**When the tent matters less.** For households with substantial buffer wealth beyond the FIRE target, or flexible enough to reduce spending in bad early years. Heavy pension income has the same effect, covered in its own section below. The tent is a specific tool for a specific problem; it is not universally required.

## Rebalancing frequency and thresholds near retirement

The Building-level rebalancing post described annual rebalancing with 5%-absolute or 20%-relative bands, based on research showing that more frequent rebalancing does not improve returns. That guidance is a reasonable default for accumulation.

Near retirement, some households tighten these thresholds. The reasoning: the cost of drift is asymmetric near the retirement transition. In accumulation, being over-allocated to equity when the market falls is offset by contributions buying more shares at lower prices; the drift eventually self-corrects. In drawdown, being over-allocated to equity when the market falls means selling equity at low prices to fund withdrawals, locking in losses that then reduce the portfolio's ability to recover.

**Tighter thresholds.** Some households move from 5% bands to 3% bands, or from annual reviews to semi-annual reviews, in the 5 years before and after retirement. The additional attention is more costly in terms of time but less costly than the alternative of being far off target at a bad moment.

**Trigger events for off-cycle rebalancing.** A market move of 15% or more (in either direction) is an event that often warrants an off-cycle allocation check. Similarly, a large withdrawal or a specific life event (job change, inheritance, major purchase) is worth re-evaluating allocation around.

**The over-tightening trap.** Tightening thresholds indefinitely (rebalancing weekly, monthly, quarterly) provides no additional benefit and generates transaction costs and tax events in taxable accounts. There is a sweet spot; annual to semi-annual with 3 to 5% bands is a defensible upper bound on frequency.

## Tax-aware rebalancing across account types

The [rebalancing post](/blog/rebalancing-your-portfolio/) set the order for tax-aware rebalancing: use new contributions where you can, rebalance inside tax-advantaged accounts first, and sell in taxable accounts only when that cannot close the gap, starting with positions that carry losses or the smallest gains (the [tax-loss harvesting post](/blog/tax-loss-harvesting-and-asset-location/) covers the mechanics). Near retirement, contributions shrink or stop, so more of the work falls on sales and on withdrawals.

**Rebalancing through withdrawals in drawdown.** Once drawing income, every withdrawal is a rebalancing opportunity. When equity has run up, taking the withdrawal from equity reduces the over-target allocation; when bonds have run up, taking it from bonds does the same. This coordination lets you rebalance without incremental trades.

**The withdrawal-order question.** In retirement, which type of account (taxable, tax-deferred, tax-free) to withdraw from first is a separate optimisation covered in Mastery posts on withdrawal sequencing. Rebalancing coordinates with, but is distinct from, withdrawal sequencing.

## The two common mistakes near retirement

**Over-aggressive de-risking.** A common late-career rebalancing mistake is holding too much in bonds. Intuition says retirees should hold mostly bonds because bonds are "safe." But retirement often lasts 25 to 35 years, and over that time inflation is one of the main long-run risks. Over long periods, cash and short-term bonds have tended to only just keep pace with inflation, and sometimes fall behind it; bonds overall have returned a little under 2% a year after inflation since 1900 (Dimson, Marsh and Staunton), with long stretches below that. Equities have been the main long-run hedge against inflation historically, though they can lag it for a decade or more.

A portfolio that is 80% bonds and 20% equity has substantially lower long-run expected return than a 60% bond, 40% equity portfolio; over 25 years the compounded difference is meaningful. If inflation runs above expectations, the 80/20 portfolio may not sustain lifestyle over the full retirement.

Many retirement planners work with equity allocations somewhere in the 40 to 70% range through retirement rather than 10 to 20%, adjusted for pensions, spending flexibility and temperament. The bond tent temporarily peaks at higher bond allocation around the sequence-risk window and then reduces bond allocation again as the risk passes.

**Loss aversion driving rebalancing decisions.** The [loss aversion post](/blog/loss-aversion-and-the-disposition-effect/) covered how selling positions at a loss is disproportionately painful and how selling positions at a gain triggers different feelings than the math suggests. In rebalancing, this shows up predictably:

- When equity has risen (creating over-allocation), rebalancing requires selling equity to buy bonds. This means selling winners. Loss aversion makes this painful; many households delay the sale, hoping the winners continue to run.
- When equity has fallen (creating under-allocation), rebalancing requires buying more equity. This means adding to losers. Loss aversion makes this uncomfortable; many households find reasons not to add to the falling asset.
- Both patterns produce the same result: allocation drifts further and further from target, and the household reaches retirement with an allocation quite different from what they intended.

The usual remedy is mechanical execution: thresholds set explicitly in advance and followed when triggered. Some people automate this or use a fee-only advisor to take the emotional decision out of the individual moment.

## The role of pensions and other guaranteed income

Everything above assumes the portfolio must cover a substantial portion of retirement expenses. When pensions, social security, or other guaranteed income sources cover much of expenses, the analysis changes.

**More equity is often defensible.** If a guaranteed, inflation-linked pension covers 70% of retirement expenses, the portfolio only needs to cover 30%. The portfolio's sequence-risk exposure is much smaller. A higher equity allocation (say, 70 to 80%) throughout retirement is defensible for some such households because bad early returns hit a smaller drawdown and the pension keeps paying. Whether it suits a particular person still depends on how they would feel watching the portfolio fall.

**Bond tents may not be needed.** The tent addresses portfolio sequence risk. Without meaningful portfolio drawdown pressure, the tent's specific value is smaller. A more monotonic glide path may work as well.

**Rebalancing frequency can stay looser.** Without acute sequence-risk sensitivity, annual rebalancing with wider bands (5% or more) remains adequate.

The general principle: the sophistication of the rebalancing tends to track the household's actual sequence-risk exposure. Households with heavy pension coverage often need less complex rebalancing structures.

## Putting the pieces together

What a typical bond-tent plan looks like across the transition, as one illustration rather than a template:

- **In late accumulation (5 to 10 years before retirement):** The glide path or bond tent shift begins. New contributions go to under-target assets to reduce the need for taxable sales.
- **At the retirement transition:** The tent-peak allocation is held, with annual rebalancing on tighter bands. Allocation moves are coordinated with large cash-flow events (retirement lump-sum, first pension payment, sale of a home if downsizing).
- **In early retirement (year 1 to 5):** The higher-bond allocation is maintained, and withdrawals come mainly from bonds to preserve equity through the sequence-risk window. Losses in taxable accounts can offer tax-loss harvesting opportunities.
- **In mid retirement (year 5 to 15):** The bond allocation rolls back down, with equity drifting slightly higher each year through withdrawals from bonds. Annual rebalancing continues.
- **In late retirement (year 15+):** A stable moderate allocation (often 40 to 60% equity depending on household). Rebalancing continues annually. Attention to any specific late-retirement needs (long-term-care planning, estate planning coordination, gifting).

The Mastery-level posts pick up the specific mechanics of sequence risk, withdrawal sequencing, longevity risk, and estate planning. This post positions the transition; the Mastery-level treatment covers the drawdown period in more depth.

## Cross-continent notes

The framework is universal; the specific vehicles and constraints vary.

- **US.** Target-date funds widely available at low cost through the major providers. Roth conversions in early retirement (before Required Minimum Distributions begin at 73 in current rules) create rebalancing opportunities across account types. HSA (Health Savings Account) can hold portfolio assets long-term with unique triple-tax-advantage treatment.
- **UK.** Lifestyle funds (UK equivalent of target-date funds) available through some workplace pensions. Drawdown mechanics through SIPP (Self-Invested Personal Pension). Tax-free lump-sum (usually 25% of the pension, up to a cap) creates a specific rebalancing event at retirement.
- **EU / eurozone.** Lifecycle funds available through many national retirement schemes. Country-specific pension structures affect the relative importance of glide paths.
- **India.** NPS (National Pension System, India) has default lifecycle funds (LC-25, LC-50, LC-75) that implement age-based glide paths. Withdrawal rules at retirement (mandatory annuitisation of a portion) affect the rebalancing calculation.
- **Australia.** Super (Superannuation) accounts often offer age-based investment options that implement glide paths. Transition-to-retirement rules allow specific tax-advantaged strategies during the late-accumulation phase.
- **Canada.** RRSP (Registered Retirement Savings Plan, Canada) to RRIF (Registered Retirement Income Fund) conversion at retirement age creates a specific rebalancing event. TFSA (Tax-Free Savings Account, Canada) can hold portfolio assets with different rebalancing tax dynamics.

In each case, the framework applies. The specific vehicles are local; the arithmetic of glide paths, bond tents, and sequence risk is universal.

## Getting started

Three concrete steps for the next few years.

- If you are within 10 years of planned retirement, write down which glide-path approach your portfolio is actually following, if any. The common options are (a) a target-date fund, (b) a custom glide path with defined equity percentages at each age, or (c) a bond tent with specific pre- and post-retirement adjustments. Which fits depends on pensions, other income and how you handle volatility.
- Write down your rebalancing thresholds and review calendar. Some people tighten bands (to 3%) near retirement; annual review is a common default.
- List which accounts hold which assets. Rebalancing sales usually happen first in tax-advantaged accounts, where they have no tax consequence, with taxable sales used when needed and combined with tax-loss harvesting where local rules allow.

This is the last post in the Optimizing level. The Mastery level, beginning immediately after this, covers advanced FIRE strategies, safe withdrawal rate, sequence risk in depth, longevity risk, pension income and payout options, tax-aware investing in drawdown, withdrawal sequencing, international retirement, estate planning, charitable giving, teaching children about money, financial vehicles for children, generational wealth, and a capstone. Optimising the accumulation is done; the drawdown mechanics get their own treatment ahead.
