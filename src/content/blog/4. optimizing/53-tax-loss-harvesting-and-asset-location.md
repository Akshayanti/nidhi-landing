---
slug: "tax-loss-harvesting-and-asset-location"
title: "Tax-Loss Harvesting and Asset Location Explained"
description: "Tax-loss harvesting and asset location do not generate returns. They reduce the tax drag on returns, which compounds to the same thing over decades."
tldr: "Tax-loss harvesting is realising unrealised losses in taxable accounts to offset gains or ordinary income (up to jurisdictional caps), then reinvesting in a similar but not-substantially-identical position to maintain market exposure. It does not create investment return; it defers tax, which compounds. Wash-sale rules exist in most jurisdictions to prevent gaming; the concept is universal, the specific timing rules are local. Asset location (distinct from asset allocation) is the same overall stock/bond mix, held in different accounts based on tax efficiency: place tax-inefficient assets (bonds, REITs, high-turnover funds, high-yield equity) in tax-advantaged accounts; place tax-efficient assets (broad equity index funds, buy-and-hold individual stocks) in taxable. Long-run drag reduction is typically 0.3 to 0.5% per year without changing the risk profile. Both techniques are more valuable in high-marginal-tax situations and in high-turnover portfolios. Neither should be the tail wagging the dog: correct asset allocation and reasonable fees dominate; tax optimisation is the third-order refinement that adds up over decades."
order: 53
pubDate: 2099-01-16
updatedDate: 2026-08-17
level: "optimizing"
primaryPersona: "eva"
personas: ["eva", "petra", "marcus", "jiri"]
tags: ["optimizing", "taxes", "investing"]
faq:
  - question: "What is tax-loss harvesting in one sentence?"
    answer: "Selling an investment that is currently at a loss (in a taxable account), booking the loss for tax purposes to offset gains or ordinary income, and immediately reinvesting the proceeds in a similar-but-not-identical position so your market exposure is preserved. The gain is time value: the tax you would have owed on your gains this year is deferred (possibly for decades), and the deferred amount stays invested."
  - question: "Doesn't harvesting a loss mean I lose money?"
    answer: "No. Harvesting a loss means realising a loss that already exists on paper. The loss happened when the market dropped; harvesting it just tells the tax authority about it, so they can credit it against your gains elsewhere or against your ordinary income (up to a jurisdictional cap). You immediately reinvest in a similar position, so your market exposure and future upside are preserved. The only thing that changes is the tax basis (which is lower after the reinvestment, meaning future gains will be larger, but by the time you realise them, you have benefited from years of tax deferral). It is not a magic trick; it is deferring a tax obligation using paper losses that would otherwise be wasted."
  - question: "What is a wash sale and why does it matter?"
    answer: "A wash-sale rule (US terminology; similar rules exist in most jurisdictions under different names) says that if you sell an investment at a loss and buy back a substantially identical investment within a specific window (usually 30 days before or after the sale), the tax authority disallows the loss for tax purposes. The rule exists to prevent investors from harvesting losses cosmetically without actually giving up the investment. The workaround: after selling the loss position, reinvest in a similar but not substantially identical alternative. A common example: sell a broad US equity index fund, buy a total US equity market fund from a different provider tracking a different but highly correlated index. Both are broad US equity exposure but not the same fund tracking the same index. The rules vary by jurisdiction; know your local specifics before harvesting."
  - question: "What is asset location and how does it differ from asset allocation?"
    answer: "Asset allocation is what you hold: the mix of stocks, bonds, cash, and other asset classes in your portfolio. Asset location is where you hold each piece: which account type (taxable, tax-deferred retirement, tax-free retirement, health savings) each asset sits in. The same overall allocation can produce different after-tax returns depending on location, because different assets generate different types of taxable events. High-yield bonds generate ordinary-income coupons, which are taxed annually at high rates; placing them in a tax-advantaged retirement account defers or eliminates the tax. Broad equity index funds generate mostly qualified dividends and long-term capital gains at lower rates, and generate them only when sold; placing them in a taxable account preserves the tax efficiency. Getting location right can add 0.3 to 0.5% per year to after-tax returns without changing what you hold."
  - question: "How much does this actually matter?"
    answer: "For someone in a low-tax bracket with a small taxable portfolio, both techniques matter less than getting the asset allocation and fee structure right first. For someone in a high-tax bracket with a large taxable portfolio, both techniques compound to meaningful money over decades. Rough industry estimates put the combined value at 0.3 to 0.7% per year of after-tax return improvement, depending on tax bracket, portfolio size, market conditions, and asset mix. On a €500,000 portfolio over 20 years, a 0.5% per-year improvement is roughly €200,000 of additional wealth. This is not the largest optimisation available (fee reduction and correct asset allocation are typically larger), but it is a meaningful third-order refinement that requires only annual attention once set up."
reelPromise: "The one-paragraph tax-loss harvesting rule, the wash-sale trap that nullifies careless harvesting, and the asset-location math that quietly adds 0.5% to after-tax returns"
relatedSlugs: ["taxes-and-your-financial-plan", "tax-advantaged-accounts", "rebalancing-your-portfolio", "investing-101-asset-classes", "fee-optimization"]
referentialReading:
  - title: "The Bogleheads' Guide to Investing"
    author: "Taylor Larimore, Mel Lindauer, Michael LeBoeuf"
    url: "https://www.goodreads.com/book/show/860131.The_Bogleheads_Guide_to_Investing"
    type: "book"
  - title: "Tax-Loss Harvesting"
    url: "https://www.bogleheads.org/wiki/Tax_loss_harvesting"
    type: "blog"
---

Every year, in most taxable investment accounts, some positions are at a paper loss. Nothing about the loss requires action: the position can be held, and if it recovers, the paper loss disappears without ever having been realised. This is the default. And for most investors, the default costs money.

Every year, in most portfolios, the same asset mix is held across taxable and tax-advantaged accounts in roughly the same proportion in each. Nothing about this requires action either. This is also the default. And for most investors, this default also costs money.

Neither default is expensive in a single year. Each costs a few tenths of a percent, sometimes less, sometimes a bit more. Over a working career of contributions and compounding, both cost meaningful multiples of that. Both are avoidable with an hour of setup once and an hour of attention per year. This post covers the two techniques.

## Tax-loss harvesting: what it is and what it is not

Tax-loss harvesting is one of the most commonly misunderstood techniques in personal investing. Both the mechanics and the point are worth stating carefully.

**What it is.** In a taxable account, you sell an investment that is currently at a loss (below its purchase price). You book the loss for tax purposes. You immediately reinvest the proceeds in a similar but not substantially identical investment, so your market exposure and future upside are preserved. The realised loss offsets gains elsewhere in your tax return, or offsets a portion of ordinary income (up to a jurisdictional cap), or carries forward to future years.

**What it is not.** It is not a way to make money. It does not increase your investment return. It does not add to the value of your portfolio in any single year. Its benefit is tax deferral: you push the tax bill on your gains into the future, and the deferred amount stays invested and compounds. The value of harvesting is the value of the time delay on the tax bill, plus the value of any bracket arbitrage (if you harvest losses in a high-tax year and eventually realise gains in a lower-tax year).

**Why it works arithmetically.** Suppose you have a €10,000 gain in your portfolio for the year, which will be taxed at (say) 25% short-term capital-gains rate when realised. Without harvesting, you pay €2,500 in tax. With harvesting, you realise €10,000 of losses to offset the gains: net taxable gain is zero, tax is zero. The €2,500 that would have gone to tax stays invested. In year 2 the €2,500, invested at 7%, is €2,675. In year 20, it is roughly €9,700. When you eventually realise the gains on the reinvested position (which now has a lower cost basis, so a larger unrealised gain), you owe more tax at that point. But the extra tax is not much larger than the original €2,500, while the compounded €2,500 has grown substantially. The net benefit is the compounding on the deferred tax minus the incremental tax on the eventual sale.

The value scales with several factors: your marginal tax rate (higher rate = larger benefit), the volatility of your holdings (more volatility = more harvestable losses in a typical year), the frequency of your attention (annual scanning captures losses that arise during the year), and your investing horizon (more years of deferral = more compounding).

## The wash-sale rule and how to work around it

Every jurisdiction that allows loss harvesting has some version of a rule preventing cosmetic harvesting: selling a loss position and immediately buying it back to keep the paper loss for tax purposes without actually giving up the investment. Without such a rule, you could harvest a loss on Monday and repurchase the identical position on Tuesday, capturing the tax benefit while retaining the exposure.

**In the US.** The wash-sale rule disallows a loss deduction if you buy a "substantially identical" security within 30 days before or after the sale. Same fund, same stock, same option contract with similar economic characteristics. The disallowed loss is added to the cost basis of the replacement position (so it is not lost forever; it just gets deferred until the replacement is sold).

**In the UK.** The "bed and breakfast" rule prevents claiming a loss if you buy the same shares within 30 days after selling. Sales are matched against subsequent purchases in a specific order.

**In other jurisdictions.** Most other jurisdictions have similar rules under different names. Timing windows vary (some are 30 days, some are 60, some tie to the calendar year); the concept is universal.

**The workaround.** After selling a loss position, reinvest in a similar but not substantially identical alternative. Examples that typically satisfy the rules:

- Sell a broad global equity fund tracking one index, buy a broad global equity fund from a different provider tracking a different index. Both give broad global equity exposure; the underlying indices are different.
- Sell a broad developed-market equity fund, buy a fund tracking a different developed-market index.
- Sell an aggregate bond fund, buy a government bond fund of similar duration and credit quality. Different bond composition, similar risk.
- Sell a broad emerging-markets fund tracking one index, buy a broad emerging-markets fund tracking a different index.

The similarity of the two funds is close enough that your portfolio's overall market exposure and expected return are essentially unchanged. The tax authorities have historically not treated broadly-similar-but-different-index funds as substantially identical. Specific product-to-product substitutions and the exact tolerance of the rules vary by jurisdiction; know your local rules or check with a professional before implementing systematically.

**One trap to avoid.** If the same investment position is held in multiple accounts (a taxable brokerage and a spouse's brokerage, or a taxable brokerage and a retirement account), the wash-sale rule can look across accounts in some jurisdictions. Selling at a loss in one account while buying the same fund in another account can trigger the rule. Coordination across household accounts matters.

<figure>
<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fig-harvest-title fig-harvest-desc">
  <title id="fig-harvest-title">The three-step tax-loss harvest</title>
  <desc id="fig-harvest-desc">Three boxes arranged left to right with arrows between them. Box one: Identify (a position at a loss in a taxable account). Box two: Sell (realise the loss for tax purposes). Box three: Replace (reinvest immediately in a similar but not substantially identical position, avoiding the wash-sale window).</desc>
  <text class="fig-title" x="360" y="42" text-anchor="middle">The three-step harvest</text>
  <text class="fig-subtitle" x="360" y="68" text-anchor="middle">Market exposure preserved; tax benefit captured.</text>
  <rect x="90" y="140" width="160" height="120" class="fig-fill-blue" opacity="0.4" rx="8" />
  <text class="fig-tick" x="170" y="180" text-anchor="middle">1. Identify</text>
  <text class="fig-quote-small" x="170" y="210" text-anchor="middle">Position at a loss</text>
  <text class="fig-quote-small" x="170" y="228" text-anchor="middle">in taxable account</text>
  <rect x="280" y="140" width="160" height="120" class="fig-fill-warn" opacity="0.4" rx="8" />
  <text class="fig-tick" x="360" y="180" text-anchor="middle">2. Sell</text>
  <text class="fig-quote-small" x="360" y="210" text-anchor="middle">Realise loss for</text>
  <text class="fig-quote-small" x="360" y="228" text-anchor="middle">tax purposes</text>
  <rect x="470" y="140" width="160" height="120" class="fig-fill-success" opacity="0.5" rx="8" />
  <text class="fig-tick" x="550" y="180" text-anchor="middle">3. Replace</text>
  <text class="fig-quote-small" x="550" y="210" text-anchor="middle">Similar but not</text>
  <text class="fig-quote-small" x="550" y="228" text-anchor="middle">substantially identical</text>
  <line x1="250" y1="200" x2="280" y2="200" class="fig-stroke-muted" stroke-width="2" />
  <line x1="440" y1="200" x2="470" y2="200" class="fig-stroke-muted" stroke-width="2" />
  <text class="fig-quote-small" x="360" y="310" text-anchor="middle">Same market exposure. Tax deferred. Basis reduced.</text>
</svg>
<figcaption>Illustrative three-step harvest workflow. Timing rules vary by jurisdiction; the workflow is universal.</figcaption>
</figure>

## When harvesting is worth doing

Harvesting is not always worth the friction. A few cases where it clearly does and does not.

**Clearly worth doing.**

- You are in a high marginal tax bracket and have realised gains this year or elsewhere in the portfolio to offset.
- Volatility has produced meaningful paper losses in specific positions.
- Your total portfolio is large enough that the tax deferral is materially valuable (typically €50,000+ in taxable investment accounts).
- The replacement position is available at similar cost and similar market exposure.
- The specific transaction is not going to trigger a wash-sale rule violation.

**Not worth doing.**

- Small paper losses (a €200 loss produces at most €50 to €100 of tax deferral; not worth the friction).
- Positions with large unrealised gains alongside modest losses (selective harvesting is fine; wholesale rebalancing that also realises gains defeats the purpose).
- Positions where the replacement would trigger substantial transaction costs or FX conversion costs that exceed the tax benefit.
- Near the top of your investing career if you plan to hold the reinvested positions indefinitely: the tax basis reduction eventually matters when you sell, and if you plan to use step-up-in-basis at death (in some jurisdictions), the harvesting benefit is smaller than the tax cost of the eventual sale.
- Cases where the marginal tax rate on the eventual sale will be higher than the current tax rate the harvest is offsetting. This is rare but possible (young worker at low bracket harvesting to offset ordinary income, expecting to be in a much higher bracket at eventual sale).

**One nuanced case.** Some jurisdictions treat short-term capital losses (positions held under a year) differently from long-term losses. In the US, short-term losses first offset short-term gains (taxed as ordinary income), then long-term gains (taxed at lower rates). The choice of which lot to harvest can matter. Specific lot identification at sale (rather than default FIFO) allows selective harvesting of specific tax lots.

## Asset location: the same portfolio, different placement

Asset location is the practice of placing each part of your portfolio in the account type that produces the best after-tax outcome for that asset, given how it generates taxable events.

**The starting principle.** Different assets generate different types of taxable events. Some generate ordinary-income coupons taxed annually at high rates. Others generate qualified dividends taxed at lower rates. Some generate very little annual taxable event and produce most of their return as unrealised capital appreciation that is only taxed at eventual sale. The tax efficiency of each asset differs.

**The other starting principle.** Different account types are taxed differently: taxable accounts as income and gains arise, tax-deferred accounts on withdrawal, tax-free accounts not at all. The [tax-advantaged accounts post](/blog/tax-advantaged-accounts/) covered the categories and their local names.

**The location rule.** Place tax-inefficient assets (assets that generate large annual taxable events) in tax-advantaged accounts, where the events are deferred or eliminated. Place tax-efficient assets (assets that generate small annual taxable events) in taxable accounts, where their tax efficiency is preserved. The overall asset allocation is unchanged; only the placement changes.

**Typical placement decisions.**

- **High-yield bonds and REITs (Real Estate Investment Trusts):** high ordinary-income distributions. Better in tax-advantaged accounts.
- **Broad taxable-bond funds:** ordinary-income coupons. Better in tax-advantaged accounts if space allows.
- **Actively managed equity funds with high turnover:** generate short-term and long-term capital-gains distributions. Better in tax-advantaged accounts.
- **Broad equity index funds with low turnover:** generate mostly long-term qualified dividends and rare capital-gains distributions. Fine in taxable accounts; the tax efficiency is high.
- **International equity funds:** in some jurisdictions carry a foreign-tax credit that is only usable in taxable accounts. Some argue for taxable placement for this reason; the credit value depends on jurisdiction.
- **Municipal bonds** (US) or their local equivalent: tax-exempt at some level; only makes sense in taxable accounts because the tax exemption is wasted in a tax-advantaged account.
- **Individual buy-and-hold stocks:** no annual distributions beyond dividends; tax-efficient. Fine in taxable accounts.

The specific optimal placement varies by jurisdiction, tax bracket, and the specific assets held. The general principle is universal: the more taxable events an asset generates annually, the more valuable it is to shelter it in a tax-advantaged account.

## A worked asset-location example

Consider a household with the following target allocation and account types:

- Total portfolio: €400,000.
- Target allocation: 70% equities, 25% bonds, 5% REITs.
- Accounts: €150,000 tax-advantaged retirement, €50,000 tax-free retirement, €200,000 taxable brokerage.

**Naive placement (same allocation in each account).**
- Tax-advantaged retirement (€150k): 70% equity = €105k, 25% bonds = €37.5k, 5% REITs = €7.5k.
- Tax-free retirement (€50k): 70% equity = €35k, 25% bonds = €12.5k, 5% REITs = €2.5k.
- Taxable brokerage (€200k): 70% equity = €140k, 25% bonds = €50k, 5% REITs = €10k.

Bonds and REITs in the taxable account generate ordinary-income distributions taxed annually at the marginal rate. Assume a 30% marginal rate: on €50k of bonds yielding 4% (€2,000 of interest) plus €10k of REITs yielding 4% (€400 of distributions), the annual tax bill is €720. Over 20 years the compounded drag is meaningful.

**Location-optimised placement.**
- Tax-advantaged retirement (€150k): bonds €100k + REITs €20k + equity €30k. Fills the bond and REIT allocation from the tax-advantaged bucket.
- Tax-free retirement (€50k): equity €50k. Puts the highest-expected-return asset in the highest-tax-benefit account.
- Taxable brokerage (€200k): equity €200k. All equity, tax-efficient index funds only.

The overall allocation is still 70/25/5 (280k equity, 100k bonds, 20k REITs); only the placement changed. The taxable account now generates only equity dividends (typically at qualified-dividend rates, lower than ordinary income) and no bond or REIT ordinary-income distributions. Annual tax drag falls by about €550: the €720 on bond and REIT income goes, and the extra €60,000 of equity in the taxable account adds back roughly €180 of dividend tax (2% yield taxed at 15%). Over 20 years, with the saving reinvested at 5% real, the difference is roughly €18,000 of extra terminal wealth.

**One catch.** The tax-free retirement account holds only equity in the optimised version. If equities have a bad decade and the tax-free account underperforms while the tax-advantaged account (holding bonds and REITs) outperforms, the household loses some of the tax-free advantage. Location is an optimisation that pays off over long horizons; over short horizons it can go either way. The tradeoff is generally worth it, but is worth understanding.

**Another catch.** Rebalancing across account types adds friction. If the target is 70/25/5 and equities have run up, the household needs to rebalance. In the location-optimised version, the rebalancing has to happen across account types (sell equity in tax-free retirement, buy bonds; or redirect new contributions selectively). This is more complex than rebalancing within a single account, and requires attention.

## The order of operations

Both techniques matter, but neither should displace the more foundational decisions. A rough priority order:

1. **Correct asset allocation.** The mix of stocks, bonds, and other assets appropriate to your risk tolerance and horizon (see the [investing 101 post](/blog/investing-101-asset-classes/)). This is the largest single determinant of returns.
2. **Low fees.** As covered in the [fee optimization post](/blog/fee-optimization/) immediately preceding this one. Fee compression typically produces 0.5 to 1% per year of return improvement, which is larger than the location or harvesting benefit.
3. **Tax-advantaged account maximisation.** Use the retirement, education, and health-savings vehicles available to you (per the [tax-advantaged accounts post](/blog/tax-advantaged-accounts/)). The tax benefit of the account structure itself typically exceeds the benefit of location optimisation within it.
4. **Asset location.** The refinement covered in this post. Once the above three are handled, this typically adds around 0.1 to 0.3% per year (the worked example above comes to roughly 0.14%).
5. **Tax-loss harvesting.** The final refinement. Adds another 0.1 to 0.3% per year in typical conditions, more in high-volatility years, less in low-volatility years.

If your allocation is wrong or your fees are 1.5%, tax-loss harvesting is not the first thing to fix. Once the basics are handled, both harvesting and location are worth the modest annual effort.

## What can go wrong

The wash-sale window, harvests too small to beat their costs, the eventual sale at a lower cost basis, and the rebalancing friction of location are covered in the sections above. Three further ways this optimisation can backfire:

**Chasing tax benefits into worse allocations.** If asset location leads you to hold too much of one asset class in a single account because it fits the tax rules, and the overall allocation drifts away from target, you have optimised the wrong variable.

**Ignoring state or provincial tax.** In multi-tier tax jurisdictions (US federal + state, some Canadian province specifics, Australian federal + state), the marginal tax rate for calculating harvest benefit includes both layers. Use the combined rate.

**Overloading a single account with a single risk.** Location optimisation can lead to concentration by account type. If all equity is in one account and it underperforms for a decade, the psychological experience is worse than a distributed loss. This is a soft cost, not a hard one, but it is real.

## Cross-continent notes

The techniques are universal; the specific rules and available vehicles vary widely.

- **US.** Wash-sale rule at 30 days before and after sale. Short-term versus long-term capital-gains distinction. Foreign tax credit on international dividends in taxable accounts. Municipal bonds tax-exempt at federal (and sometimes state) level. Roth IRA (US tax-free-growth retirement account) contribution and conversion rules interact with harvesting.
- **UK.** Bed-and-breakfast rule; same-day and 30-day matching for share disposals. Annual capital-gains tax allowance provides a small automatic harvest each year for households below the threshold. ISA (Individual Savings Account, UK) wrapper eliminates capital-gains and dividend taxes within the wrapper; asset-location decisions primarily involve the choice of what to hold inside versus outside the ISA.
- **EU / eurozone.** Wide variation across countries. Some jurisdictions apply a flat capital-gains rate; some integrate capital gains into ordinary income at marginal rates. Withholding taxes on cross-border dividends complicate the harvesting math for holders of pan-European or global funds. National tax-advantaged accounts vary in their treatment of gains and dividends.
- **India.** Short-term capital gains on listed equity (held under 12 months) taxed at 20%; long-term (over 12 months) at 12.5% above ₹1.25 lakh per year, following the 2024 budget. Debt-fund taxation reformed 2023 to remove long-term capital-gains indexation benefit; asset location within ELSS, PPF, and other tax-advantaged accounts follows different rules. Wash-sale-equivalent restrictions less formalised; the general principle of not sitting out of the market during harvesting applies.
- **Australia.** Capital gains discount of 50% for assets held over 12 months. Harvesting rules exist but framed differently. Franking credits on domestic dividends affect the after-tax picture and asset-location decisions.
- **Canada.** Capital-gains inclusion rate of 50% (as of writing; subject to change). Superficial-loss rule at 30 days is Canada's wash-sale equivalent. TFSA (Tax-Free Savings Account, Canada) allows tax-free growth; RRSP (Registered Retirement Savings Plan, Canada) defers. Location decisions primarily between TFSA, RRSP, and non-registered accounts.

In every jurisdiction, the principles are the same: harvest losses when they exist and the benefit exceeds the friction; place assets by tax efficiency across account types; do not let the tail wag the dog. The specific rules and vehicle names are local; the arithmetic is universal.

## Getting started

Three concrete steps for the first harvesting and location pass.

- Review each taxable-account position at year end (or at any market drop of 10%+ during the year). Identify positions currently at a paper loss. Estimate the tax benefit of harvesting each. Execute where the benefit exceeds a few hundred euros and a suitable replacement exists.
- Map your current asset location: which asset class sits in which account. Identify assets in the wrong account (high-yield bonds in taxable, tax-inefficient active funds in taxable). Where possible, migrate to correct location; if migration triggers a large tax event, redirect new contributions and rebalancing to move the placement over time rather than incurring the cost immediately.
- Set a calendar reminder for an annual review. Once a year, in December (or before any tax-year cutoff in your jurisdiction), rescan for harvestable losses and verify location is still correct after any allocation drift.

The next post in this series covers real returns and benchmarking, which is the measurement side of the equation: once fees are low, taxes are optimised, and asset allocation is right, the question is how to know whether the portfolio is actually performing as expected.
