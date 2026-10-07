---
slug: "real-returns-and-benchmarking"
title: "Real Returns: Is Your Portfolio Actually Performing?"
description: "Most portfolio returns look better than they are. Four adjustments, from inflation to the right benchmark, turn a comforting number into an honest one."
tldr: "The number you see on your account statement is nominal return: what the portfolio value has grown to, before adjusting for inflation, before subtracting contributions, and without comparison to a relevant benchmark. Real return (inflation-adjusted) is what actually accumulates purchasing power. Contribution-adjusted return (what the market did versus what you added) separates skill or luck from savings behaviour. Benchmark-relative return compares your portfolio to a matched-risk index; without this comparison, you cannot tell whether you did well or the market did. Chasing past performance has tended to lose: in fund data, yesterday's winners rarely stay on top, and investors who switch into them often arrive late. Underperformance is often just normal volatility around a correct allocation and a legitimate benchmark; occasionally it signals a real problem (bad fund choice, wrong asset allocation, high fees). The four honest questions are: what is my real return, how much of my growth came from me versus the market, how did I do against a matched benchmark, and is any underperformance due to volatility or something structural?"
takeaways:
  - "Why the growth on your statement is not your real return"
  - "How to separate what you contributed from what the market did"
  - "Why a fair benchmark must match your portfolio's risk and mix"
  - "How to tell normal underperformance from a structural problem"
order: 54
pubDate: 2099-01-17
updatedDate: 2026-08-19
level: "optimizing"
primaryPersona: "eva"
personas: ["eva", "petra", "marcus", "jiri"]
tags: ["optimizing", "investing", "fundamentals"]
faq:
  - question: "What is the difference between nominal and real return?"
    answer: "Nominal return is the change in the portfolio's value expressed as a percentage, before adjusting for inflation. Real return is the change in purchasing power the portfolio provides, after adjusting for inflation. If your portfolio grew 7% in a year with 3% inflation, your nominal return is 7% but your real return is roughly 4% (a more precise calculation divides 1.07 by 1.03 and subtracts 1, giving 3.88%). Real return is what you actually own more of in terms of real-world consumption. Over long horizons, nominal returns can look impressive while real returns tell the true story: a portfolio that grew 12% per year through the 1970s often lost purchasing power because inflation ran higher than that. The purchasing power post covered this framing at the concept level; benchmarking against real return is how you apply it to a specific portfolio."
  - question: "How do I separate what I contributed from what the market did?"
    answer: "The rough distinction: if your portfolio grew €50,000 over a year but you contributed €30,000 to it, only €20,000 came from investment returns. Dividing by the beginning balance gives you a simple return figure, but that ignores the timing of the contributions. For a more accurate measure, calculate a money-weighted return (which accounts for cash-flow timing) or a time-weighted return (which strips out contribution timing to compare performance to a market benchmark). Most brokerages report one or both; the two answer different questions. Money-weighted return tells you how well your money did overall. Time-weighted return tells you how well the underlying investments did, independent of when you happened to contribute. Both are useful. What is misleading is treating total portfolio growth as return."
  - question: "What benchmark should I compare my portfolio to?"
    answer: "A benchmark should match your portfolio's risk profile and asset composition. Comparing a 60% stocks 40% bonds portfolio to a 100% equity index like the S&P 500 will make you look terrible in bull markets and great in bear markets, but neither comparison is meaningful. A fairer benchmark is a blended index that matches your asset allocation: for a 60/40 portfolio, roughly 60% of an appropriate broad equity index plus 40% of an appropriate broad bond index. A globally-diversified portfolio compares best with globally-diversified benchmarks; a portfolio tilted toward small-cap or value, with benchmarks that include those tilts. Comparing to the wrong benchmark is a very common benchmarking error, and it usually flatters or damns the portfolio for reasons unrelated to your skill or luck."
  - question: "When is underperformance a real problem versus normal volatility?"
    answer: "Most short-term underperformance is normal volatility. A well-diversified portfolio compared to a well-matched benchmark will typically underperform by small amounts in some years and outperform in others, roughly symmetrically. Any single year of 1 to 2% underperformance is usually noise. Real problems show up as persistent underperformance across multiple years, larger magnitude (5%+ per year), or specific structural causes: high fees eating returns (see the fee optimization post), a fund manager who has consistently missed the benchmark by a wide margin, an allocation that does not match your stated risk tolerance, or missing exposure to a major asset class. The diagnostic: if you cannot identify a specific structural cause, three years of underperformance is usually a bad reason to change. Chasing performance is one of the most consistently loss-generating behaviours in personal investing."
  - question: "Why is past performance such a poor predictor?"
    answer: "Because performance is mostly a mix of exposure to certain factors (small-cap, value, growth, momentum, geography) and luck, and both revert. A fund that outperformed by 3% per year for five years was often benefiting from a specific factor exposure that was in favour during that period; when the factor rotates out of favour (which happens routinely), the same fund underperforms by similar magnitudes. S&P's SPIVA persistence scorecards repeatedly find that few top-quartile funds stay in the top quartile over following periods, often no more than chance would predict. In most fund categories and periods studied, the link between past and future rank is weak. This is why the standard SEC and equivalent disclaimers say what they say: past performance does not indicate future results. It is not compliance boilerplate; it is the actual empirical finding."
reelPromise: "The four numbers to check to know whether your portfolio is really performing, why chasing yesterday's winners has tended to lose, and how to spot the difference between volatility and a real problem"
relatedSlugs: ["purchasing-power", "investing-101-asset-classes", "financial-projections", "fee-optimization", "understanding-risk"]
referentialReading:
  - title: "A Random Walk Down Wall Street"
    author: "Burton Malkiel"
    url: "https://www.goodreads.com/book/show/900.A_Random_Walk_Down_Wall_Street"
    type: "book"
  - title: "SPIVA Persistence Scorecard"
    url: "https://www.spglobal.com/spdji/en/research-insights/spiva/"
    type: "blog"
  - title: "The Simple Path to Wealth"
    author: "JL Collins"
    url: "https://www.goodreads.com/book/show/30646587-the-simple-path-to-wealth"
    type: "book"
---

A portfolio grew from €200,000 to €250,000 over the past year. The account statement labels this as "25% return." The household reads it and feels good. This feels like a strong performance year.

It is possibly a very good year, possibly a very bad year, and mostly there is no way to tell from the €50,000 increase alone. If the household contributed €35,000 to the portfolio during the year, the investments themselves earned €15,000, roughly 7% on the money that was invested during the year. If inflation was 4%, the real return (in purchasing-power terms) was about 3%. If a well-matched benchmark returned 10% over the same period, the portfolio underperformed by roughly 3 percentage points, which may or may not indicate a real problem.

The single €50,000 number told none of this. Real portfolio evaluation requires four adjustments to that headline number: real (inflation-adjusted), contribution-adjusted, benchmark-relative, and normal-volatility-adjusted. Each adjustment turns a comforting story into a more accurate one.

This post is about the four adjustments and the honest questions they let you ask.

## Adjustment one: real return

The [purchasing power post](/blog/purchasing-power/) explained real return, what is left after inflation, and the [projections post](/blog/financial-projections/) used it to set long-run assumptions. Two refinements matter when you benchmark.

**Use the exact formula when inflation is high.** Real return is (1 + nominal return) divided by (1 + inflation), minus 1. For 7% nominal and 3% inflation that is 3.88%, slightly below the 4% the simple subtraction gives. The gap grows with inflation: a 12% nominal year during 15% inflation is a 2.6% loss of purchasing power, roughly what many investors lived through in the 1970s.

**Compare against real benchmarks.** Long-run real returns have been about 4 to 6% a year for developed-market equities since 1900 and a little under 2% a year for bonds (Dimson, Marsh and Staunton), with cash close to zero, and with long stretches well below those averages. Those are the numbers to hold your portfolio's real return against over a multi-decade horizon, not the more comforting nominal ones.

**One caveat.** Inflation is not one number; it depends on what you consume. Official measures use a national basket; your personal rate can be higher or lower. Housing-heavy budgets in cities with rising rents can run well above the national figure. For benchmarking a portfolio, the national measure is the usual choice; for retirement planning, your own basket can matter more.

## Adjustment two: contribution-adjusted return

Total portfolio growth combines two very different things: what you added, and what the investments did. Conflating them makes savers look like great investors and makes market corrections look like personal failures.

**The rough split.** Ending balance minus starting balance equals total growth. Total growth minus contributions equals investment return. Investment return divided by average balance (roughly the starting balance plus half of net contributions) approximates your simple return.

**Money-weighted versus time-weighted return.** Two more precise measures exist, and they answer different questions.

*Money-weighted return* (also called internal rate of return, IRR) is the discount rate that makes the present value of all cash flows (contributions, withdrawals, ending balance) equal to zero. It tells you the return you earned on your money given the timing of when you invested it. A household that lump-summed into equities right before a bull market has a much higher money-weighted return than a household that dollar-cost averaged during the same period; both were "in the market" but the timing captured different market conditions.

*Time-weighted return* strips out contribution and withdrawal timing to isolate the performance of the underlying investments. It tells you how well the investments did, independent of when you happened to contribute. Time-weighted return is the standard for comparing fund performance and for benchmarking against a market index.

Most brokerages report one or both. If yours reports only one, know which one, because it answers a specific question.

**Why this matters.** A household that saved heroically during a bear market often shows small or negative total portfolio growth because the market fell more than they contributed. Their behaviour was excellent; the timing was unlucky. Reporting total growth as "how did I do?" hides the good behaviour and dwells on the bad luck. Reporting contribution-adjusted return separates the two.

Similarly, in a strong bull market, a household that saved lightly can show impressive total growth because the market did most of the work. Reporting total growth as "how did I do?" flatters the light saving. Contribution-adjusted return reveals the truth.

<figure>
<svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig-breakdown-title fig-breakdown-desc">
  <title id="fig-breakdown-title">Breaking down portfolio growth</title>
  <desc id="fig-breakdown-desc">Two bars drawn to the same scale. Left: the statement view, a single bar of plus €50,000. Right: the honest view of the same €50,000, split into contributions (€35,000, the largest part), real investment return (€7,000), and the part of the nominal return that only kept pace with inflation (€8,000).</desc>
  <text class="fig-title" x="360" y="42" text-anchor="middle">What actually made your portfolio grow</text>
  <text class="fig-subtitle" x="360" y="68" text-anchor="middle">The account balance rose; contributions did most of it.</text>
  <text class="fig-tick" x="200" y="110" text-anchor="middle">Statement view</text>
  <rect x="150" y="120" width="100" height="180" class="fig-fill-success" opacity="0.55" />
  <text class="fig-label" x="200" y="215" text-anchor="middle">+€50,000</text>
  <text class="fig-quote-small" x="200" y="325" text-anchor="middle">All growth looks the same</text>
  <text class="fig-tick" x="480" y="110" text-anchor="middle">Honest view</text>
  <rect x="430" y="174.0" width="100" height="126.0" class="fig-fill-blue" opacity="0.55" />
  <text class="fig-quote-small" x="542" y="241.0" text-anchor="start">Contributions: €35k</text>
  <rect x="430" y="148.8" width="100" height="25.2" class="fig-fill-success" opacity="0.7" />
  <text class="fig-quote-small" x="542" y="165.4" text-anchor="start">Real return: €7k</text>
  <rect x="430" y="120.0" width="100" height="28.8" class="fig-fill-warn" opacity="0.4" />
  <text class="fig-quote-small" x="542" y="138.4" text-anchor="start">Inflation: €8k</text>
  <text class="fig-quote-small" x="480" y="325" text-anchor="middle">Small real return, large contribution</text>
</svg>
<figcaption>Illustrative decomposition of a portfolio's annual growth. The nominal number is what you see on the statement. The honest breakdown shows how much came from you versus how much came from real investment return.</figcaption>
</figure>

## Adjustment three: benchmark-relative return

Absolute return numbers are only meaningful when compared to something. "The portfolio returned 12% last year" is uninformative until you know what a comparable-risk investment did over the same period.

**The right benchmark matches risk and composition.** A common benchmarking error is comparing your portfolio to whatever index is in the news. If the S&P 500 returned 24% and your portfolio returned 12%, you feel you have failed. But if your portfolio is 60% globally-diversified equities and 40% bonds, the appropriate benchmark is a blended index of roughly 60% global equity plus 40% bond, which might have returned 11%. In that case, you slightly outperformed the appropriate benchmark, and the S&P 500 comparison was meaningless.

Benchmarks to consider for common portfolio shapes:

- 100% globally-diversified equities: a broad global equity index (MSCI ACWI, FTSE All-World, similar).
- 100% US or single-country equities: a broad domestic equity index (S&P 500, FTSE All-Share, STOXX 600, Nifty 500, similar depending on region).
- 60/40 stocks/bonds globally: 60% of a global equity index plus 40% of a global aggregate bond index.
- Small-cap or value-tilted: benchmarks that include those tilts (MSCI World Small Cap Value, Russell 2000, similar).

The benchmark should look like your portfolio in the ways that drive returns: geographic mix, asset-class mix, size and style tilts. If it does not, the comparison is not meaningful.

**Do not rebuild the benchmark to match a bad year.** If your portfolio underperformed the appropriate benchmark by 3%, resist the temptation to redefine the benchmark until the comparison flatters you. The correct diagnostic response is to ask why you underperformed, not to lower the bar.

**Include cost.** The right benchmark for a portfolio you can actually buy is a tradeable index at low cost. Comparing to a hypothetical index that includes no fees or trading friction is unfair to any real portfolio. When benchmarking against a specific index, use a low-cost fund tracking that index as the reference; the small tracking error is the honest ceiling on what a passive replication actually achieves.

## Adjustment four: is the underperformance volatility or a real problem?

Underperformance in a single year, or even over three years, is often just volatility. A well-diversified portfolio compared to a well-matched benchmark will underperform in some years and outperform in others, roughly symmetrically. Zero years of underperformance would be suspicious.

**Signals that underperformance is likely just noise.**

- Small magnitude (1 to 3 percentage points per year).
- Does not persist consistently (some years better, some worse).
- Corresponds to specific market conditions where your tilts happen to be out of favour (small-cap tilt during a large-cap year, value tilt during a growth year, international tilt during a US-dominant year).
- Your benchmark is well-matched and the comparison is fair.

**Signals that underperformance may be structural.**

- Persistent underperformance across 4+ years.
- Large magnitude (5+ percentage points per year).
- Specific identifiable cause: a fund manager who has systematically missed the benchmark; a fund holding you should not have (high fees, high turnover, wrong sector); allocation drift away from your target that you have not corrected; missing exposure to a major asset class or region.
- Fees eating a substantial portion of the return (per the [fee optimization post](/blog/fee-optimization/)).

**The diagnostic.** When there is a specific structural cause of persistent underperformance, the usual responses are switching fund, rebalancing or cutting fees. Without a specific cause, three years of small underperformance is usually a bad reason to change, for the reason the next section explains.

**The corollary.** Overperformance is often noise too. If your portfolio outperformed the appropriate benchmark by 5% last year, resist the temptation to believe you have found a special skill. Most likely, your tilts happened to be in favour, and the reversion will come.

## Chasing performance: the trap that has tended to lose

A common pattern: an investor sees a fund that beat the market by 3% per year for five years. They switch to that fund. The fund reverts to the mean (typically underperforming for a period thereafter, sometimes by matching amounts). The investor experiences an entry point at the top of the outperformance cycle, misses the ensuing weak period, and eventually switches out at the bottom.

**Why this happens.** Cognitive bias: recency (recent performance is overweighted in mental estimates of future performance), availability (the story of the star manager is more available than the story of the average manager), and the fundamental illusion that past outperformance was skill rather than a specific factor exposure that happened to be in favour.

**The empirical result.** Studies of fund flows find that money tends to follow past performance, and that returns after those flows often disappoint. Morningstar's annual "Mind the Gap" studies, mostly of US funds, find that the average investor dollar earns less than the funds themselves report, largely because money tends to arrive after strong runs and leave after weak ones. The size of the gap varies by period and fund type.

**The common response.** For someone whose allocation fits their risk tolerance and horizon, implemented with low-cost funds tracking appropriate benchmarks, many planners see short-term over- or underperformance as something to note rather than act on, with an annual rebalance to target (see the [rebalancing post](/blog/rebalancing-your-portfolio/)). It is unexciting, and the evidence above is why it is common. It assumes the allocation itself still fits, which is what the deeper periodic review checks.

## The four honest questions

Each adjustment becomes one question at review time:

1. **What is my real return?** If it is running below the assumption in your projection over several years, the projection may need updating.
2. **How much of the growth was contributions versus market?** The savings reflect your discipline; the market's part reflects the market.
3. **How did I do against a matched benchmark?** This judges the implementation, not the year.
4. **Is any underperformance volatility or structural?** Structural causes are the ones that usually justify a change.

## The measurement cadence

Portfolio performance analysis is not something to do monthly. Monthly checks amplify noise (see the loss aversion discussion elsewhere in the Psychology series: experiments on myopic loss aversion suggest that frequent checking tends to lead to more cautious and worse-timed decisions).

A reasonable cadence:

- **Quarterly (light):** Confirm allocation is still close to target. Note any large deviations. This is not performance review; it is drift check.
- **Annually (real):** Run the four questions. Compare real return to plan. Compare to matched benchmark. Rebalance if needed. Identify any structural issues.
- **Every 3 to 5 years (deep):** Revisit the assumptions underlying the plan. Has your risk tolerance changed? Has your time horizon shifted? Do the benchmark comparisons over the last 3-5 years suggest any structural issues in the implementation?

The annual review is where most of the work happens. The quarterly checks are minimal. The deep review is periodic. This cadence keeps you honest without inducing performance chasing.

## Cross-continent notes

The framework is universal; specific benchmarks and inflation measures vary.

- **US.** Inflation measured by CPI-U (Consumer Price Index for Urban Consumers) or PCE (Personal Consumption Expenditures). Common benchmarks include S&P 500 (US large-cap), Russell 2000 (US small-cap), MSCI EAFE (developed international ex-US), MSCI Emerging Markets, Bloomberg US Aggregate Bond. Blended benchmarks widely reported by financial media.
- **UK.** Inflation measured by CPI and RPI (Retail Prices Index), with different components; know which one your comparisons use. Common benchmarks include FTSE 100, FTSE All-Share, FTSE Global All Cap, Bloomberg Global Aggregate Bond. UK real returns on domestic equities historically similar to global averages.
- **EU / eurozone.** HICP (Harmonised Index of Consumer Prices) as the eurozone benchmark inflation measure. National indices vary. Common benchmarks include STOXX Europe 600, MSCI Europe, various national indices. Bond benchmarks include Bloomberg Euro Aggregate.
- **India.** WPI (Wholesale Price Index) and CPI both reported; CPI is now the primary policy anchor. Common benchmarks include Nifty 50, Nifty 500, BSE Sensex, MSCI India, various bond indices. Nominal returns on Indian equities have been high, but so has inflation, so comparisons with other markets are more meaningful in real terms.
- **Australia.** CPI as inflation measure. Common benchmarks include ASX 200, MSCI Australia, Bloomberg AusBond Composite.
- **Canada.** CPI-Total or CPI-Core as inflation measures. Common benchmarks include S&P/TSX Composite, S&P/TSX 60, FTSE Canada Universe Bond.

In each case, the four adjustments apply. The specific benchmarks and inflation measures are local; the arithmetic is universal.

## Getting started

Three concrete steps for the honest performance review.

- Look up your portfolio's nominal return for the last year. Subtract your jurisdiction's inflation rate. That is real return; compare it against your assumed long-run real return in any projections.
- Look up (or calculate) how much you contributed to the portfolio during the year. Subtract contributions from total growth to isolate investment return. Divide by starting balance for a rough return figure, or use money-weighted or time-weighted return if your brokerage reports them.
- Identify the correct benchmark for your allocation (blended if you hold multiple asset classes). Compare your portfolio's return to the benchmark. If materially different, ask whether the difference is volatility, tilt exposure, or something structural. Structural causes are the ones that usually justify a change.

The next post in this series covers geographic arbitrage: instead of changing what your portfolio earns, changing what your life costs, which can shift what any given portfolio has to produce.
