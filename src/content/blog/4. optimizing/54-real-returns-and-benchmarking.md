---
slug: "real-returns-and-benchmarking"
title: "Real Returns: Is Your Portfolio Actually Performing?"
seoTitle: "How to Tell if Your Portfolio Is Really Performing"
description: "Is your portfolio really doing well? How to find your real return, separate your savings from market growth, pick a fair benchmark and tell noise from a real problem."
tldr: "The growth on a statement mixes your own contributions with the market, and leaves inflation out. Four adjustments give an honest picture: the real return after inflation, what came from saving versus investing, how you did against a benchmark that matches your mix, and whether any gap is normal noise or a structural problem. Chasing last year's winners has tended to lose."
takeaways:
  - text: "Why the growth on your statement is not your real return"
    href: "#the-statement-shows-nominal-growth-not-real-return"
  - text: "How to separate what you contributed from what the market did"
    href: "#separate-what-you-saved-from-what-the-market-did"
  - text: "Why a fair benchmark must match your portfolio's risk and mix"
    href: "#a-fair-benchmark-matches-your-portfolios-mix"
  - text: "How to tell normal underperformance from a structural problem"
    href: "#most-underperformance-is-noise-some-is-a-real-problem"
glossary:
  - term: "Real return"
    definition: "A return after inflation is taken off, so it shows what the money will buy. 7% growth with 2% inflation is about a 5% real return."
  - term: "Nominal return"
    definition: "A return before inflation is taken off. It makes future amounts look bigger than what they will buy."
  - term: "Benchmark"
    definition: "An index or blend of indices with a similar mix and risk to your portfolio, used to judge how it did."
  - term: "Money-weighted return"
    definition: "A return that reflects when your money went in and out, so it shows how your own money did."
  - term: "Time-weighted return"
    definition: "A return that strips out the timing of contributions and withdrawals, so it shows how the investments themselves did; the standard for comparing funds."
order: 54
pubDate: 2099-01-17
updatedDate: "2026-10-22"
level: "optimizing"
primaryPersona: "eva"
personas: ["eva", "petra", "marcus", "jiri"]
tags: ["optimizing", "investing", "fundamentals"]
faq:
  - question: "What is the difference between nominal and real return?"
    answer: "Nominal return is the change in the portfolio's value expressed as a percentage, before adjusting for inflation. Real return is the change in purchasing power the portfolio provides, after adjusting for inflation. If your portfolio grew 7% in a year with 3% inflation, your nominal return is 7% but your real return is roughly 4% (a more precise calculation divides 1.07 by 1.03 and subtracts 1, giving 3.88%). Real return is what you actually own more of in terms of real-world consumption. Over long horizons, nominal returns can look impressive while real returns tell the true story: in the UK, a portfolio that grew 12% per year through the 1970s lost purchasing power because inflation over the decade averaged higher than that. The purchasing power post covered this framing at the concept level; benchmarking against real return is how you apply it to a specific portfolio."
  - question: "How do I separate what I contributed from what the market did?"
    answer: "The rough distinction: if your portfolio grew €50,000 over a year but you contributed €30,000 to it, only €20,000 came from investment returns. Dividing by the beginning balance gives you a simple return figure, but that ignores the timing of the contributions. For a more accurate measure, calculate a money-weighted return (which accounts for cash-flow timing) or a time-weighted return (which strips out contribution timing to compare performance to a market benchmark). Most brokerages report one or both; the two answer different questions. Money-weighted return tells you how well your money did overall. Time-weighted return tells you how well the underlying investments did, independent of when you happened to contribute. Both are useful. What is misleading is treating total portfolio growth as return."
  - question: "What benchmark should I compare my portfolio to?"
    answer: "A benchmark should match your portfolio's risk profile and asset composition. Comparing a 60% stocks 40% bonds portfolio to a 100% equity index like the S&P 500 will make you look terrible in bull markets and great in bear markets, but neither comparison is meaningful. A fairer benchmark is a blended index that matches your asset allocation: for a 60/40 portfolio, roughly 60% of an appropriate broad equity index plus 40% of an appropriate broad bond index. A globally-diversified portfolio compares best with globally-diversified benchmarks; a portfolio tilted toward small-cap or value, with benchmarks that include those tilts. Comparing to the wrong benchmark is a very common benchmarking error, and it usually flatters or damns the portfolio for reasons unrelated to your skill or luck."
  - question: "When is underperformance a real problem versus normal volatility?"
    answer: "Most short-term underperformance is normal volatility. A well-diversified portfolio compared to a well-matched benchmark will typically underperform by small amounts in some years and outperform in others, roughly symmetrically. A small gap over one year can easily be noise. A gap deserves investigation when it persists or when a specific structural cause is visible: high fees eating returns (see the fee optimization post), a fund manager who has consistently missed the benchmark by a wide margin, an allocation that does not match your stated risk tolerance, or missing exposure to a major asset class. The diagnostic: if you cannot identify a specific structural cause, three years of underperformance is usually a bad reason to change. Chasing performance is one of the most consistently loss-generating behaviours in personal investing."
  - question: "Why is past performance such a poor predictor?"
    answer: "Because performance is mostly a mix of exposure to certain factors (small-cap, value, growth, momentum, geography) and luck, and both revert. A fund that outperformed by 3% per year for five years was often benefiting from a specific factor exposure that was in favour during that period; when the factor rotates out of favour (which happens routinely), the same fund underperforms by similar magnitudes. S&P's SPIVA persistence scorecards repeatedly find that few top-quartile funds stay in the top quartile over following periods, often no more than chance would predict. In most fund categories and periods studied, the link between past and future rank is weak. This is why the standard SEC and equivalent disclaimers say what they say: past performance does not indicate future results. It is not compliance boilerplate; it is the actual empirical finding."
reelPromise: "The four numbers to check to know whether your portfolio is really performing, why chasing yesterday's winners has tended to lose, and how to spot the difference between volatility and a real problem"
relatedSlugs: ["purchasing-power", "investing-101-asset-classes", "financial-projections", "fee-optimization", "understanding-risk"]
referentialReading:
  - title: "A Random Walk Down Wall Street"
    author: "Burton Malkiel"
    url: "https://www.goodreads.com/book/show/40242274-a-random-walk-down-wall-street"
    type: "book"
  - title: "SPIVA Scorecards, including the Persistence Scorecard"
    url: "https://www.spglobal.com/spdji/en/research-insights/spiva/"
    type: "blog"
---

A portfolio grew from €200,000 to €250,000 over the past year, and the statement calls it a 25% return. The household feels good about it.

It might have been a good year or a poor one, and the €50,000 alone cannot say which. If they added €35,000 during the year, the investments earned about €15,000, roughly 7% on the money invested. If inflation was 4%, the [real return](#term-real-return) was about 3%. If a fair [benchmark](#term-benchmark) returned 10%, they trailed it by about 3 points, which may or may not mean anything is wrong. Four adjustments turn the headline number into an honest one.

## The statement shows nominal growth, not real return

The [purchasing power post](/blog/purchasing-power/) explained real return, what is left after inflation, and the [projections post](/blog/financial-projections/) used it for long-run assumptions. Two refinements matter when measuring a portfolio. When inflation is high, the exact formula, (1 + [nominal return](#term-nominal-return)) ÷ (1 + inflation) − 1, matters: a 12% year during 15% inflation is a 2.6% loss of purchasing power, roughly what many investors lived through in the 1970s. And the long-run yardsticks are real ones: about 4 to 6% a year for developed-market shares since 1900, a little under 2% for bonds (Dimson, Marsh and Staunton), cash close to zero, with long stretches well below those averages.

Inflation also depends on what you buy. Official figures use a national basket; a housing-heavy budget in a city with rising rents can run well above it. For measuring a portfolio the national figure is the usual choice; for retirement planning, your own basket can matter more.

## Separate what you saved from what the market did

Total growth mixes two different things: what you added and what the investments did. Mixing them makes heavy savers in a bear market look like poor investors, and light savers in a bull market look like good ones. A rough split: growth minus contributions is the investment return; divided by the average balance (roughly the starting balance plus half the net contributions), it approximates the year's return.

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

<details class="lesson-depth">
<summary class="disclosure">Money-weighted and time-weighted returns</summary>

Brokers often report one of two more precise measures, which answer different questions. A [money-weighted return](#term-money-weighted-return) (also called the internal rate of return) reflects when your money went in: someone who invested a lump sum just before a rise shows a higher figure than someone who drip-fed the same period. A [time-weighted return](#term-time-weighted-return) strips out the timing of contributions and withdrawals to show how the investments themselves did; it is the standard for comparing funds and benchmarks. Knowing which one a statement shows tells you which question it answers.

</details>

<details class="quick-check">
<summary class="disclosure">Quick check: a portfolio grew €50,000 and you added €30,000. How much did the investments earn?</summary>

About €20,000. The other €30,000 was your own saving.

</details>

## A fair benchmark matches your portfolio's mix

"12% last year" means little until it is compared with something of similar risk. If a widely quoted share index rose 24% and a portfolio of 60% global shares and 40% bonds rose 12%, the portfolio looks poor; against a blended index of 60% global shares and 40% bonds that returned perhaps 11%, it slightly did better. A fair benchmark looks like the portfolio in the ways that drive returns: its regions, its mix of assets, any tilt toward small or value companies. A cheap fund that tracks the index makes a more honest yardstick than the index itself, which pays no fees.

When a year goes badly, the temptation is to redefine the benchmark until the comparison looks better. The more useful question is why the gap opened.

<details class="lesson-depth">
<summary class="disclosure">Benchmarks for common portfolio shapes</summary>

- **All global shares:** a broad global index such as MSCI ACWI or FTSE All-World.
- **One country's shares:** a broad domestic index, such as the S&P 500, FTSE All-Share, STOXX 600 or Nifty 500, depending on the market.
- **60/40 shares and bonds, global:** 60% of a global share index plus 40% of a global aggregate bond index.
- **Small-company or value tilts:** a blend of indices matching the actual tilt, such as MSCI World Small Cap for global smaller companies or a suitable regional value index. The Russell 2000 is a US small-company index, not a global or value one.

</details>

## Most underperformance is noise; some is a real problem

A well-diversified portfolio against a well-matched benchmark trails in some years and leads in others; a record with no bad years would be suspicious.

**Often noise:** modest gaps that do not persist, including ordinary tracking difference and short-term variation among holdings within the same market segments. An out-of-favour tilt (small companies in a large-company year, value in a growth year) can explain weak performance against a broad index, but not a gap against a benchmark built to match that tilt.

**Possibly structural:** a persistent gap, an unexpectedly large one, or a specific cause: a manager who keeps missing, a high-fee or high-turnover fund, an allocation that has drifted from target, a missing region or asset class, or fees eating the return (the [fees post](/blog/fee-optimization/) covered this).

When there is a specific structural cause, many planners treat it as a reason to consider switching a fund, rebalancing or cutting costs. Without one, three years of small underperformance is usually a weak reason to change. The same applies the other way: a year of beating the benchmark by 5 points is more often luck than a newfound skill.

<details class="quick-check">
<summary class="disclosure">Quick check: a portfolio trailed a well-matched benchmark by 2 points last year and led it the year before. Noise or a problem?</summary>

Most likely noise: a small gap that does not persist. Without a specific cause such as high fees or drift, it is a weak reason to change anything.

</details>

## Chasing last year's winners has tended to lose

A familiar pattern: an investor sees a fund that beat the market by 3 points a year for five years, switches in, and the fund then lags, often because the style that helped it fell out of favour. They arrive near the top of the run and often leave after the weak stretch. Recency and the vivid story of a star manager make past success look like skill. S&P's SPIVA persistence scorecards repeatedly find that few top funds stay at the top, often no more than chance would predict, and Morningstar's "Mind the Gap" studies, mostly of US funds, find the average investor's money earns less than the funds report, largely because it arrives after strong runs and leaves after weak ones. The size of that gap varies by period and fund type.

For a portfolio whose allocation fits the person's risk and horizon, held in low-cost funds against fitting benchmarks, many planners note short-term gaps rather than act on them; a common rhythm is to [rebalance](/blog/rebalancing-your-portfolio/) to target once a year. That assumes the allocation itself still fits, which the deeper review checks.

## The questions to ask once a year

1. **What was my real return?** If it runs below the projection's assumption for several years, the projection may need updating.
2. **How much was my saving and how much the market?**
3. **How did I do against a matched benchmark?** This judges the implementation, not the year.
4. **Is any gap noise or structural?** Structural causes are the ones that usually justify a change.

Checking monthly mostly amplifies noise; studies of myopic loss aversion suggest frequent checking tends to lead to more cautious and worse-timed decisions. A common rhythm is a light quarterly look at whether the allocation has drifted, the full questions once a year, and every three to five years a deeper review of whether the risk level, horizon and assumptions still fit.

## Inflation measures and benchmarks where you live

<details class="lesson-depth">
<summary class="disclosure">Inflation measures and benchmarks in the US, UK, eurozone, India, Australia and Canada</summary>

- **US.** Inflation as CPI-U or PCE; benchmarks such as the S&P 500, Russell 2000, MSCI EAFE, MSCI Emerging Markets and the Bloomberg US Aggregate Bond index.
- **UK.** CPI and RPI measure inflation differently, so it matters which one a comparison uses; benchmarks such as the FTSE 100, FTSE All-Share, FTSE Global All Cap and Bloomberg Global Aggregate.
- **Eurozone.** HICP is the common inflation measure, with national indices alongside; benchmarks such as the STOXX Europe 600 and MSCI Europe, and the Bloomberg Euro Aggregate for bonds.
- **India.** CPI is the main policy measure, with WPI also reported; benchmarks such as the Nifty 50, Nifty 500 and BSE Sensex. Nominal returns have been high but so has inflation, so comparisons with other markets mean more in real terms.
- **Australia.** CPI; benchmarks such as the ASX 200 and the Bloomberg AusBond Composite.
- **Canada.** CPI; benchmarks such as the S&P/TSX Composite and the FTSE Canada Universe Bond index.

</details>

The next post covers geographic arbitrage: instead of changing what a portfolio earns, changing what life costs, and so what the portfolio has to produce.

Last year, how much of your portfolio's growth was your own saving?
