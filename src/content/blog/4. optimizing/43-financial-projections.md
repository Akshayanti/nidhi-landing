---
slug: "financial-projections"
title: "Financial Projections: Your Next 10, 20, 30 Years"
description: "A financial projection turns today's numbers into a picture of your future. Why the assumptions matter more than the model, and why one line is not enough."
tldr: "A projection takes your current net worth, your monthly contributions, your growth-rate assumptions, and your expected inflation, and plays them forward. It is not a prediction. It is a way of making the compound consequences of today's choices visible so you can decide whether you like where you are heading. The trap is not the math. The trap is overconfidence in the assumptions. A projection at 8% real returns and a projection at 4% real returns tell very different stories about the same starting balance, and the honest answer is usually somewhere in between. Use ranges, not single lines. Use real returns, not nominal. Revisit annually. Monte Carlo simulation goes one step further: thousands of uneven return sequences instead of one smooth line, which shows the spread of outcomes and why the order of returns matters once you draw money out."
order: 43
pubDate: 2099-01-01
updatedDate: 2026-10-03
level: "optimizing"
primaryPersona: "eva"
personas: ["eva", "petra", "jiri", "marcus"]
tags: ["optimizing", "planning", "investing"]
faq:
  - question: "What is a financial projection and how is it different from a prediction?"
    answer: "A projection is a forward calculation that starts from today's numbers (net worth, recurring contributions, expected growth rate, expected inflation) and plays them out year by year to show where you would end up if those inputs held. A prediction claims to know what will actually happen. The difference matters. A projection is honest about being conditional (if this holds, then that follows), which makes it a decision tool. A prediction pretends the future is knowable, which turns it into a bet. The projection at 7% growth and the projection at 5% growth are both correct arithmetic given their inputs. Which one is closer to what happens depends on decades of unknowable market behaviour, so the useful move is to look at both."
  - question: "What are the inputs to a good projection?"
    answer: "Five inputs do most of the work. First, your starting balance broken down by asset type, because different asset types have different expected returns. Second, your recurring contribution: how much you are adding per month, per year, or as scheduled lump sums. Third, your growth-rate assumption per asset type, ideally as a range rather than a single number. Fourth, your inflation assumption, so you can see real (purchasing-power-adjusted) numbers not just nominal ones. Fifth, your time horizon and any planned liability payoffs (mortgage schedule, student-loan payoff date). Getting these five right matters far more than getting the model's mathematical machinery right."
  - question: "Why does a small change in the growth rate produce such a large difference in the projection?"
    answer: "Because compounding is exponential. A 2-percentage-point difference in growth (5% vs 7%) does not create a 2-percentage-point difference in outcome. Over 30 years, the higher rate adds roughly 40% to what a regular monthly saver ends up with, and roughly 75% to a lump sum left untouched. The gap widens dramatically the longer the horizon. This is why projection outputs feel disproportionately sensitive to the assumption you almost typed without thinking. It is also why a single-line projection is misleading: the line implies precision the underlying model cannot deliver. A fan of three lines (conservative, central, optimistic) tells the truth better."
  - question: "Real return or nominal return: which should the projection use?"
    answer: "Both are useful, but real returns (nominal return minus inflation) are what you should care about because they tell you what your money will actually buy. Nominal projections look bigger and feel more satisfying, but they overstate what the future dollar or euro is worth. A projection that says you will have €1,200,000 in 30 years at 7% nominal growth with 2% inflation is really telling you the purchasing power of roughly €660,000 in today's terms. That is still a meaningful number, but it is a very different number. The safe practice: run the projection in nominal terms so contribution amounts stay recognisable, but always also display the real (inflation-adjusted) version so the outcome is honest."
  - question: "How do I set assumptions without falling into overconfidence?"
    answer: "The single biggest projection failure mode is not the model. It is the person setting the growth-rate assumption too high, usually by anchoring to recent market performance or to the highest number they have read. Three defenses. First, use a range: run the projection with a conservative, central, and optimistic set of assumptions and show all three. Second, use long-run averages that span multiple market environments (about 4 to 6% real for a globally diversified equity portfolio, which is what developed markets have delivered since 1900), not the last five years. Third, revisit and update annually rather than defending a projection built during a moment of enthusiasm. The Psychology series covers the underlying bias (overconfidence) in more depth; the practical answer is to build the projection so it has to survive its own assumptions."
  - question: "What is a Monte Carlo simulation, and do I need one?"
    answer: "A Monte Carlo simulation runs your projection thousands of times, each time with a different sequence of yearly returns drawn from a realistic range, and shows how the outcomes spread out. The 10th percentile is the bad-luck path, the median the middle, the 90th the good-luck path. It also shows something a single line hides: uneven returns compound to less than the same average delivered smoothly, so the middle outcome usually lands below the single line. While you are saving, a simple fan of three growth rates is enough for most decisions. Close to retirement, when you start drawing money out, a simulation becomes essential because the order of good and bad years starts to matter."
  - question: "Why say 'in 90% of simulations' rather than 'a 90% chance'?"
    answer: "Because a simulation describes what the model produced from its assumptions, not what the future will do. The future can differ from the past in inflation, growth and how markets move together. 'In 90% of simulations the money lasted' is accurate; 'you have a 90% chance of success' drops the assumptions and reads the model's estimate as a promise about your future."
reelPromise: "How to choose the growth rate you model, and why one line hides a range of outcomes"
relatedSlugs: ["appreciation-vs-depreciation", "investing-101-asset-classes", "setting-financial-goals", "overconfidence-and-the-planning-fallacy", "purchasing-power", "understanding-risk"]
relatedTool:
  url: "/free/monte-carlo-simulator"
  label: "Monte Carlo simulator"
  cta: "See the spread of outcomes for your own plan"
referentialReading:
  - title: "Compound Interest Formula"
    url: "https://www.investopedia.com/terms/c/compoundinterest.asp"
    type: "blog"
  - title: "Historical Real Equity Returns Across Countries (Credit Suisse Global Investment Returns Yearbook)"
    url: "https://www.ubs.com/global/en/investment-bank/in-focus/2023/global-investment-returns-yearbook.html"
    type: "paper"
  - title: "The Rate of Return on Everything, 1870 to 2015 (Jordà, Knoll, Kuvshinov, Schularick and Taylor), data from the Macrohistory Database"
    url: "https://www.macrohistory.net/database/"
    type: "paper"
  - title: "Thinking, Fast and Slow"
    author: "Daniel Kahneman"
    url: "https://www.goodreads.com/book/show/11468377-thinking-fast-and-slow"
    type: "book"
  - title: "The Physics of Wall Street"
    author: "James Owen Weatherall"
    url: "https://www.goodreads.com/book/show/13158695-the-physics-of-wall-street"
    type: "book"
---

You know what you have today. You have some sense of what you save each month. But if someone asked you to point at where your net worth will actually be in ten years, twenty years, thirty years, you would probably shrug and offer a vague direction rather than a number.

That shrug is what a projection replaces. A projection takes today's numbers, plus your growth-rate assumptions, plus your contribution plan, and plays them forward year by year. The output is a picture of your financial future conditional on those inputs holding. It is not a prediction. It is a way of making the compound consequences of today's choices visible so you can decide whether you like where you are heading.

Most people never do this. They save what they can, invest in something reasonable, and hope the trajectory is fine. A projection replaces hope with arithmetic. The arithmetic is not perfect (nothing is, over 30 years) but it is honest, and honest is enough to make better decisions.

## Why projections beat gut feeling

Gut feeling about long-horizon financial outcomes is systematically wrong, in one direction. Humans linearize things they should exponentialise. Ask someone what €500 a month invested at 7% real returns is worth in 30 years, and the median answer will be dramatically lower than the actual €585,000-ish (in today's purchasing power). We evolved to plan for tomorrow's meal, not for the geometric growth of capital compounding over decades.

Three specific things a projection makes visible that gut feeling misses:

**The scale of the endgame.** A 25-year-old saving €300 a month at a 6% real return retires with substantial wealth. A 45-year-old with the same €300 a month has meaningfully less, not because compounding failed but because it had less time. The projection shows the difference in a single glance; the gut always underestimates it.

**The cost of small delays.** Waiting five years to start contributing is not a 5-out-of-30 penalty. It is closer to a 30% haircut on the ending balance, because you lost the five years when compounding was operating on the smallest base (so absolute gains were small) but which were multiplying the largest base in your final years. The projection makes the geometry visible; the gut treats it linearly.

**The leverage of contributions vs returns.** In the early years of accumulation, most of your growth is contributions. In the late years, most of it is compound returns. This crossover point (usually somewhere between years 15 and 25 for a middle-income accumulator) is worth seeing on a chart, because it changes how you should think about a windfall or a temporary savings dip.

None of this is complicated math. It is just math your brain does not run natively.

## The five inputs

A projection takes five inputs and turns them into a curve. Get these five right and the model is close enough. Get them wrong and the model is fiction.

**Starting balance, broken down by asset type.** Not just "€120,000 net worth." Different asset types grow at different long-run rates, and lumping them together makes the projection wrong by construction. Cash grows at roughly the deposit rate. Broad equity indices across developed markets have returned about 4 to 6% a year after inflation since 1900 (with meaningful variation by country and era). Bonds sit lower. Real estate sits somewhere in the middle, with the caveat that it also throws off rent and requires maintenance. Split your starting balance by asset type before the projection touches it.

**Recurring contributions.** How much are you adding each month or year, and to which asset type? If you contribute €1,000 a month split as €700 to a broad equity fund and €300 to a bond fund, the projection needs to know that split. If your contribution grows with salary (a common pattern), model that too. If it is planned to stop at retirement, make sure the projection stops it.

**Per-asset growth-rate assumptions.** This is where the overconfidence lives. The [Psychology post on overconfidence](/blog/overconfidence-and-the-planning-fallacy/) covers why we systematically over-set this number. Practical answer: use a range, not a single value. A conservative, a central, and an optimistic assumption produce three projections, and the truth is somewhere in the fan.

**Expected inflation.** Inflation is the silent tax on nominal returns. A projection that shows a €1,200,000 outcome at 7% nominal growth is telling you a much smaller story once you subtract 2% inflation across 30 years. Modelling inflation lets you see the real (purchasing-power-adjusted) outcome, which is the number that actually matters for what you can buy.

**Time horizon and scheduled events.** How many years does the projection run? Are there planned events (a house purchase, a career break, a mortgage payoff, an inheritance received) that change the trajectory at specific years? The projection should be able to accept these as scheduled disturbances rather than blending them into a smooth curve.

Everything else is decoration. If these five are right, the projection tells you something useful. If any of them are off, no amount of model sophistication will rescue the output.

## Why assumptions matter more than the model

The most surprising thing about projections is how sensitive the output is to the growth-rate input. Not intuitively sensitive: violently, exponentially sensitive.

Consider a €50,000 starting balance with €1,000 a month in contributions, over 30 years:

- At 4% real returns: roughly €847,000 ending balance
- At 6% real returns: roughly €1,260,000
- At 8% real returns: roughly €1,910,000

The difference between the 4% and 8% assumptions is more than a factor of two on the final number. And that gap is 4 percentage points, which sounds small when you say it out loud but is very large in the underlying arithmetic.

This is why single-line projections are dangerous. The line implies precision that the underlying math cannot deliver. A number pulled from thin air (say, 7% because you saw it in a US article about S&P 500 returns) produces a chart that looks precise but is anchored to a single guess about an unknowable future.

<figure>
<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig-fan-title fig-fan-desc">
  <title id="fig-fan-title">The projection fan: three growth rates, one starting balance</title>
  <desc id="fig-fan-desc">Three projection curves starting at €50,000 with €1,000 monthly contributions over 30 years. The 4 percent line ends near €847,000. The 6 percent line ends near €1,260,000. The 8 percent line ends near €1,910,000. The fan widens dramatically after year 15.</desc>
  <text class="fig-title" x="360" y="42" text-anchor="middle">Same starting balance, three growth-rate assumptions</text>
  <text class="fig-subtitle" x="360" y="68" text-anchor="middle">€50,000 start, €1,000 per month, 30 years, real returns</text>
  <line x1="90" y1="320" x2="600" y2="320" class="fig-stroke-rule" />
  <line x1="90" y1="90" x2="90" y2="320" class="fig-stroke-rule" />
  <text class="fig-tick" x="85" y="324" text-anchor="end">0</text>
  <text class="fig-tick" x="85" y="224" text-anchor="end">€1M</text>
  <text class="fig-tick" x="85" y="124" text-anchor="end">€2M</text>
  <text class="fig-tick" x="90" y="340" text-anchor="middle">Year 0</text>
  <text class="fig-tick" x="345" y="340" text-anchor="middle">Year 15</text>
  <text class="fig-tick" x="600" y="340" text-anchor="middle">Year 30</text>
  <path class="fig-stroke-warn" stroke-width="2.5" fill="none" d="M 90.0 315.0 L 107.0 313.6 L 124.0 312.1 L 141.0 310.6 L 158.0 309.0 L 175.0 307.3 L 192.0 305.6 L 209.0 303.8 L 226.0 301.9 L 243.0 300.0 L 260.0 297.9 L 277.0 295.8 L 294.0 293.6 L 311.0 291.4 L 328.0 289.0 L 345.0 286.5 L 362.0 284.0 L 379.0 281.3 L 396.0 278.5 L 413.0 275.7 L 430.0 272.7 L 447.0 269.5 L 464.0 266.3 L 481.0 262.9 L 498.0 259.4 L 515.0 255.8 L 532.0 252.0 L 549.0 248.1 L 566.0 244.0 L 583.0 239.7 L 600.0 235.3" />
  <path class="fig-stroke-blue" stroke-width="3" fill="none" d="M 90.0 315.0 L 107.0 313.5 L 124.0 311.8 L 141.0 310.1 L 158.0 308.3 L 175.0 306.4 L 192.0 304.3 L 209.0 302.1 L 226.0 299.8 L 243.0 297.4 L 260.0 294.8 L 277.0 292.1 L 294.0 289.1 L 311.0 286.1 L 328.0 282.8 L 345.0 279.3 L 362.0 275.7 L 379.0 271.8 L 396.0 267.6 L 413.0 263.3 L 430.0 258.6 L 447.0 253.7 L 464.0 248.5 L 481.0 243.0 L 498.0 237.1 L 515.0 230.9 L 532.0 224.3 L 549.0 217.4 L 566.0 210.0 L 583.0 202.1 L 600.0 193.8" />
  <path class="fig-stroke-teal" stroke-width="2.5" fill="none" d="M 90.0 315.0 L 107.0 313.4 L 124.0 311.6 L 141.0 309.7 L 158.0 307.6 L 175.0 305.4 L 192.0 302.9 L 209.0 300.3 L 226.0 297.5 L 243.0 294.5 L 260.0 291.2 L 277.0 287.6 L 294.0 283.8 L 311.0 279.7 L 328.0 275.2 L 345.0 270.4 L 362.0 265.2 L 379.0 259.5 L 396.0 253.5 L 413.0 246.9 L 430.0 239.8 L 447.0 232.1 L 464.0 223.9 L 481.0 214.9 L 498.0 205.3 L 515.0 194.9 L 532.0 183.6 L 549.0 171.4 L 566.0 158.3 L 583.0 144.1 L 600.0 128.8" />
  <text class="fig-tick" x="610" y="240" text-anchor="start">€847k (4%)</text>
  <text class="fig-tick" x="610" y="199" text-anchor="start">€1.26M (6%)</text>
  <text class="fig-tick" x="610" y="134" text-anchor="start">€1.91M (8%)</text>
  <text class="fig-quote-small" x="345" y="368" text-anchor="middle">Illustrative. Real returns; inflation already subtracted.</text>
</svg>
<figcaption>Illustrative projection at three growth-rate assumptions. The fan widens dramatically after year 15, which is why a single-line projection overstates its own precision.</figcaption>
</figure>

The fan is the honest picture. Any one line inside it is defensible. Which one turns out to match the future is not knowable in advance. The right response is not to pick the middle and commit to it. The right response is to plan against the conservative line (so you are not counting on luck) while celebrating if the optimistic line proves closer. It helps to know where the lines sit against history: developed markets have returned about 4 to 6% a year after inflation since 1900, so 4% is the low end of that record, 6% the high end, and 8% is above it.

## Real returns, not nominal

The [Purchasing Power post](/blog/purchasing-power/) explained real returns: what is left of a return after inflation. For projections the rule is simple. Run them in real terms, with inflation already subtracted, so the numbers show what future money will actually buy. Over five years the difference is small; over the decades projections exist for, a nominal projection overstates what you will be able to afford by a wide margin. If you want the nominal figures too, run both, but let the real numbers drive the decisions.

## The overconfidence trap

Every projection failure I have ever seen has been on the input side, not the model side. And by a wide margin, the failure was overconfidence in the growth-rate assumption.

The Psychology series post on [overconfidence and the planning fallacy](/blog/overconfidence-and-the-planning-fallacy/) explains the underlying bias. In a projection context, it shows up in three specific ways.

**Anchoring to the best recent decade.** US equity returns from 2010 to 2020 were exceptional by long-run standards. Using them as your baseline for the next 30 years is not analysis, it is extrapolation from a favorable sample. The Global Investment Returns Yearbook puts world equities at 5.2% a year after inflation from 1900 to 2024, and single countries have typically landed between 4 and 6%. Some decades are much better; some are much worse.

**Confusing your target with your assumption.** "I need 8% to hit my goal, so I will model 8%." This is one of the more expensive mistakes in personal finance. The market does not care what return you need. Modelling the return you need rather than the return you can plausibly expect turns the projection into a wish list.

**Ignoring the fees you actually pay.** Nominal 7% before fees is 6.5% after a 0.5% expense ratio, and 6% after a 1% expense ratio. A later post in this series covers fee optimization in detail; for now, subtract your total fee load from any market-return assumption before it enters the projection.

The counter to all three is the same: use a range, use long-run averages that span multiple market environments, and revisit the projection annually rather than defending an old one.

## From one line to many: Monte Carlo

A projection is not a prediction. It says: given these inputs, this is where you end up. Every input is uncertain, and if the inputs change, the projection changes.

There is a second, quieter limit. Even the fan above assumes the market delivers its rate smoothly: 6% in year one, 6% in year two, 6% in year thirty. Markets never do that. A long-run average of 6% arrives as three good years, one terrible one, two average ones, and so on. That unevenness changes the outcome, not just the path.

**The Monte Carlo idea.** Instead of running the projection once with a fixed return, you run it thousands of times. Each run draws a different sequence of yearly returns from a realistic range, built from historical market behaviour or a forward-looking estimate. The result is not one ending number but thousands, and you look at how they spread out. The name comes from the casino: the technique was developed in the 1940s for physics problems that could only be solved by random sampling, and it has been standard in retirement-planning software since the 1990s.

Here is Eva's plan from the fan above, simulated 10,000 times. Each year's return is drawn at random from real history: the yearly returns, after inflation, of a portfolio split equally across up to 16 developed stock markets from 1900 to 2020. Those years averaged 6.7%; each is lowered by the same 0.7 points so they average the 6% used for the middle line. The year-to-year spread is kept, while the level is set to the 6% assumption. The calculation is in the source note below the figure, so anyone can rerun it.

<figure>
<svg viewBox="0 0 720 396" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig-mc-title fig-mc-desc">
  <title id="fig-mc-title">One line versus ten thousand paths</title>
  <desc id="fig-mc-desc">The same plan as above, €50,000 plus €1,000 a month for 30 years, simulated 10,000 times with single years of real returns drawn independently from developed-market history, 1900 to 2020, adjusted to average 6%. A shaded band runs from the 10th percentile, about €510,000 after 30 years, to the 90th percentile, about €2.2 million. The median path ends near €1.08 million, below the dashed single line at 6% every year, which ends near €1.26 million.</desc>
  <text class="fig-title" x="360" y="42" text-anchor="middle">One line versus ten thousand paths</text>
  <text class="fig-subtitle" x="360" y="68" text-anchor="middle">€50,000 start, €1,000 per month, 30 years, real returns</text>
  <line x1="90" y1="320" x2="600" y2="320" class="fig-stroke-rule" />
  <line x1="90" y1="90" x2="90" y2="320" class="fig-stroke-rule" />
  <text class="fig-tick" x="85" y="324" text-anchor="end">0</text>
  <text class="fig-tick" x="85" y="232.0" text-anchor="end">€1M</text>
  <text class="fig-tick" x="85" y="140.0" text-anchor="end">€2M</text>
  <text class="fig-tick" x="90" y="340" text-anchor="middle">Year 0</text>
  <text class="fig-tick" x="345" y="340" text-anchor="middle">Year 15</text>
  <text class="fig-tick" x="600" y="340" text-anchor="middle">Year 30</text>
  <path d="M 90.0 315.4 L 107.0 313.1 L 124.0 310.9 L 141.0 308.6 L 158.0 306.2 L 175.0 303.5 L 192.0 300.6 L 209.0 297.5 L 226.0 294.2 L 243.0 290.5 L 260.0 286.8 L 277.0 282.6 L 294.0 278.3 L 311.0 273.5 L 328.0 268.6 L 345.0 262.8 L 362.0 257.0 L 379.0 250.6 L 396.0 243.3 L 413.0 236.5 L 430.0 228.8 L 447.0 220.0 L 464.0 211.8 L 481.0 201.3 L 498.0 191.5 L 515.0 181.5 L 532.0 170.4 L 549.0 156.3 L 566.0 144.6 L 583.0 130.7 L 600.0 116.4 L 600.0 272.9 L 583.0 274.7 L 566.0 276.9 L 549.0 279.2 L 532.0 280.8 L 515.0 283.2 L 498.0 284.9 L 481.0 286.6 L 464.0 288.4 L 447.0 289.8 L 430.0 291.6 L 413.0 293.0 L 396.0 294.7 L 379.0 296.4 L 362.0 297.8 L 345.0 299.2 L 328.0 300.5 L 311.0 301.7 L 294.0 303.0 L 277.0 304.3 L 260.0 305.6 L 243.0 306.7 L 226.0 307.8 L 209.0 309.0 L 192.0 310.0 L 175.0 311.0 L 158.0 312.1 L 141.0 313.1 L 124.0 314.0 L 107.0 314.9 L 90.0 315.4 Z" class="fig-fill-blue" opacity="0.18" />
  <path d="M 90.0 315.4 L 107.0 314.0 L 124.0 312.5 L 141.0 310.9 L 158.0 309.2 L 175.0 307.5 L 192.0 305.6 L 209.0 303.6 L 226.0 301.4 L 243.0 299.2 L 260.0 296.8 L 277.0 294.3 L 294.0 291.6 L 311.0 288.8 L 328.0 285.8 L 345.0 282.6 L 362.0 279.2 L 379.0 275.6 L 396.0 271.8 L 413.0 267.8 L 430.0 263.5 L 447.0 259.0 L 464.0 254.2 L 481.0 249.1 L 498.0 243.7 L 515.0 238.0 L 532.0 232.0 L 549.0 225.6 L 566.0 218.8 L 583.0 211.6 L 600.0 203.9" fill="none" class="fig-stroke-muted" stroke-width="2" stroke-dasharray="6 5" />
  <path d="M 90.0 315.4 L 107.0 314.0 L 124.0 312.6 L 141.0 311.0 L 158.0 309.4 L 175.0 307.6 L 192.0 305.9 L 209.0 304.0 L 226.0 302.1 L 243.0 300.0 L 260.0 297.8 L 277.0 295.5 L 294.0 293.0 L 311.0 290.6 L 328.0 288.2 L 345.0 285.3 L 362.0 282.1 L 379.0 279.0 L 396.0 275.9 L 413.0 272.4 L 430.0 268.8 L 447.0 265.0 L 464.0 261.0 L 481.0 256.4 L 498.0 252.4 L 515.0 247.7 L 532.0 243.1 L 549.0 238.3 L 566.0 232.9 L 583.0 227.1 L 600.0 220.9" fill="none" class="fig-stroke-blue" stroke-width="3" />
  <text class="fig-tick" x="610" y="120.4" text-anchor="start">90th: €2.2M</text>
  <text class="fig-tick" x="610" y="203.9" text-anchor="start">One line: €1.26M</text>
  <text class="fig-tick" x="610" y="224.9" text-anchor="start">Median: €1.08M</text>
  <text class="fig-tick" x="610" y="276.9" text-anchor="start">10th: €510k</text>
  <text class="fig-quote-small" x="345" y="368" text-anchor="middle">10,000 paths. Single years of real returns drawn independently from</text>
  <text class="fig-quote-small" x="345" y="386" text-anchor="middle">developed-market history, 1900 to 2020, adjusted to a 6% average.</text>
</svg>
<figcaption>Monte Carlo of the same plan, using the spread of historical yearly returns. About three in five simulated paths finish below the single 6% line, because years of losses do more damage to compounding than equal years of gains repair. The single line hides both the spread and that drag. Source: Jordà-Schularick-Taylor Macrohistory Database, release 6; reproduce with <code>scripts/simulate-projection-paths.mjs</code> (seed 43).</figcaption>
</figure>

**Reading percentiles.** The 10th percentile is the bad-luck path: only one simulation in ten did worse. The 50th, the median, is the middle. The 90th is the good-luck path: only one in ten did better. In this example they land at about €510,000, €1.08 million and €2.2 million.

**Why the middle sits below the single line.** About three in five paths (61%) finish below the €1.26 million that a steady 6% produces. A 20% loss followed by a 20% gain leaves you 4% down, not back where you started, so the same average return compounds to less when it arrives unevenly. The historical years in this simulation average 6% but compound at about 4.9%. The single line hides that drag as well as the spread.

**What to plan against.** While you are still saving, the median with an eye on the 10th percentile is a reasonable target. Once you are drawing money out, planning to the median is too optimistic: running out of money is much worse than ending with more than you needed, so a 5th or 10th percentile focus is the safer one.

### Sequence of returns: why order matters once you draw down

While you are contributing, the order of good and bad years matters little. Bad years let your contributions buy more cheaply; over decades the sequence averages out.

Once you are withdrawing, order matters a great deal. Take someone drawing €40,000 a year from €1 million. If the market falls 30% in the first year, they still need €40,000, but now they are selling from €700,000, so they have to sell a larger share of what they own, at low prices. Those shares are gone when the market recovers. Two retirees with the same starting balance, the same withdrawals and the same average return over 30 years can end up very differently: the one who meets the bad years early can run out of money long before the one who meets them late.

A single-line projection cannot show this at all, because it has no sequence. A simulation can, which is why it becomes essential near retirement. The ways to buffer sequence risk, from cash reserves and flexible spending to a temporarily higher bond allocation, belong to the drawdown years and are covered later.

### Saying it honestly

A simulation result is easy to overstate. "In 90% of simulations the money lasted" is what the model actually says. "You have a 90% chance of success" drops the assumptions and turns the model's estimate into a promise about your future, which it cannot be: the future can differ from the past in inflation, growth and how markets move together. Use the first phrasing, and decide for yourself how much weight the model deserves.

The model also leaves things out. Resampling history includes the crashes that happened, but not worse ones that have not happened yet, and it draws each year independently, so it understates how bad years clustered in history, as in the 1930s or the 1970s. Real investors sell in panics and chase what just went up, which the model does not do. And the personal shocks, a job loss, an illness, a divorce, are not market events at all; they belong to the emergency fund and insurance.

**Using it well.** Look at the shape, not the decimals: whether the 10th percentile is €500,000 or €520,000 does not matter; whether it falls short of what you need does. Run a cautious, a central and an optimistic set of assumptions. Do not change course because a rerun moves a few points; change it when your situation changes. And if the 10th-percentile outcome would not cover your minimum needs, that is the signal to adjust the plan (the savings rate, the retirement date, the target lifestyle) until it would.

## How to actually use a projection

Two practical uses that beat "run once and forget."

**Gap analysis against a goal.** You have a target (a specific ending balance, a FIRE number, a house down payment by a specific year). The projection shows whether your current trajectory hits the target. If yes, at what level of confidence (across the fan)? If no, by how much? A projection turns "will I be OK?" into "at 4% real returns I am short by €80,000; at 6% I am ahead by €40,000; what would I have to change to hit the target under the 4% case?"

**Annual revisit and update.** A projection built at age 30 with assumptions from 2020 stops being useful by 2030 if you never update it. Revisit annually. Update the starting balance to what it actually became. Adjust the growth-rate assumption if you have material new information (rarely). Add or remove scheduled events. Track how the projection has drifted from what actually happened, and use that gap as feedback on how tight your assumptions were.

The third use, testing a decision before you make it by changing one input and comparing the result, is big enough for its own post, and it is the next one in this series.

## Putting it together

Build the baseline honestly. Show it as a fan, not a line, and as a simulated range once the stakes are high. Plan against the lower lines, so you are not counting on luck. Revisit the whole thing annually.

The projection is scaffolding for decisions. It is not a promise about the future. Used well, it turns "will I be OK?" into a specific gap you can close. That is a very different conversation than the shrug most people offer when asked where they will be in 30 years.

Later posts in this series build on this foundation. What-if scenarios use it to test decisions. Cash flow forecasting adds the month-by-month picture. Life-events planning uses it for foreseeable disruptions. Later posts on fees and taxes make the projection more accurate. But the underlying discipline is what you have here: honest inputs, ranges not lines, real returns, annual updates.
