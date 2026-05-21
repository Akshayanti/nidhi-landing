---
slug: "understanding-loan-terms"
title: "Understanding Loan Terms: How to Compare Borrowing Options"
description: "When you borrow, interest rate is only part of the story. APR, amortisation, fixed vs. variable, and prepayment rules decide what the loan really costs."
tldr: "The advertised rate on a loan is almost never the whole cost. APR (annual percentage rate) includes fees and is the number you should actually compare. Amortisation explains why early payments go mostly to interest and late payments mostly to principal, which matters hugely for refinancing and prepayment decisions. Fixed rates trade predictability for potentially higher cost; variable rates can be cheaper but carry the risk of future payment shock. To compare two loans honestly, normalise for term and amount and compare the total cost of borrowing (or equivalently, the IRR of the cash flows). Prepayment is one of the most powerful ways to reduce total interest paid, as long as your loan allows it without penalty. Kept generic: specific rules and products vary heavily by country and provider."
order: 27
pubDate: 2026-06-17
updatedDate: 2026-06-17
level: "building"
primaryPersona: "eva"
personas: ["eva", "petra", "jiri", "tomas"]
tags: ["building", "debt", "planning"]
relatedTool:
  url: "/free/loan-comparison"
  label: "Loan comparison calculator"
  cta: "Compare any two offers including fees"
reelPromise: "How APR hides fees, why amortisation matters for refinancing, and a side-by-side calculator that surfaces the real total cost"
referentialReading:
  - title: "Annual Percentage Rate (APR)"
    url: "https://www.investopedia.com/terms/a/apr.asp"
    type: "blog"
  - title: "Amortization Schedule"
    url: "https://www.investopedia.com/terms/a/amortization_schedule.asp"
    type: "blog"
  - title: "Your Money or Your Life"
    author: "Vicki Robin and Joe Dominguez"
    url: "https://www.goodreads.com/book/show/37590422-your-money-or-your-life"
    type: "book"
---

Two lenders offer you a mortgage. Bank A advertises 3.2%. Bank B advertises 3.1%. Bank B is the better deal, obviously.

Except Bank B charges €3,000 in arrangement fees, requires a mandatory insurance product, and has a variable rate after the first 3 years. Bank A has no fees, a fully fixed rate for the whole term, and allows free prepayment. Once you do the real math, Bank A is thousands of euros cheaper over the life of the loan.

This is how most people lose money on loans: by comparing the wrong number. The [liabilities post](/blog/liabilities/) covered why the interest rate matters most when evaluating existing debt. This post is the other side: how to actually compare offers *before* you borrow, so you don't sign something you'll regret for twenty years.

## Why the advertised rate is misleading

The interest rate on a loan is the cost of borrowing the money itself, expressed as an annual percentage. But borrowing almost always comes with additional costs that aren't in the headline rate:

- Arrangement or origination fees
- Mandatory insurance tied to the loan
- Account administration fees
- Valuation or appraisal charges
- Early-repayment penalties that show up only if life changes

Two loans with identical headline rates can have wildly different real costs. Two loans with *different* headline rates can, once fees are counted, have the cheaper one be the one with the higher rate.

The only way to compare fairly is to use a metric that folds everything in. That metric is APR.

## APR: the number that matters

APR, or annual percentage rate, expresses the total cost of borrowing as a single annualised percentage. It rolls together:

- The nominal interest rate
- Most mandatory fees
- The timing of payments over the life of the loan

Specific definitions of APR vary by jurisdiction. Some countries require more costs to be included than others, and products like insurance may or may not count. But directionally, APR is always a more honest comparison number than the headline rate.

| Loan | Rate | Costs included in APR | Term | APR |
|---|---|---|---|---|
| A | 3.2% | €0 | 25 years | 3.20% |
| B | 3.1% | €3,000 fee + ~€2,500 bundled insurance | 25 years | 3.30% |
| C | 3.5% | €0 | 25 years | 3.50% |
| D | 2.9% | €5,000 fee + ~€13,000 bundled insurance | 25 years | 3.59% |

The loan with the lowest rate (D) is actually the most expensive once you include its fees and bundled products. The lowest *APR* is the lowest actual cost.

*The "bundled insurance" figures above are the lifetime cost of the mandatory insurance product priced into APR; they're representative numbers chosen so the math reproduces. Real quotes vary by lender and borrower profile.*

> **Check what's included locally.** APR calculation rules differ by country. Two lenders may quote APR slightly differently. Ask what's included. If something is excluded (like life insurance mandated alongside the loan), build it into your own comparison.

## Fixed vs. variable rates

Most loans come in two structural flavors:

**Fixed rate.** The interest rate is locked for a set period, sometimes the full loan term, sometimes an initial period. Monthly payments are predictable. You know what you owe over time.

**Variable rate.** The interest rate tracks a reference rate (like a central bank rate or an interbank benchmark) plus a margin. When the reference rises, your payment rises; when it falls, your payment falls. Cheaper on average historically in many markets, but exposed to future rate shocks.

| Aspect | Fixed rate | Variable rate |
|---|---|---|
| Payment predictability | High | Low |
| Exposure to rate rises | None (during fixed period) | Full |
| Typical initial rate | Higher | Lower |
| Flexibility | Less (sometimes with prepayment penalties) | Often more |
| Best suited for | Long horizons, stable cash flow, aversion to shocks | Short expected holding periods, higher risk tolerance |

A hybrid common in many markets: fixed for an initial period (e.g. 5 or 10 years), then variable for the remainder. These trade off some payment predictability for a lower initial rate, but they bring back variable-rate risk exactly when the remaining balance is still large.

The right choice depends on your cash flow stability, how long you expect to hold the loan, and your honest tolerance for payment shock. "Cheaper on paper right now" is not the same as "cheaper over the loan's life."

## Amortisation: how a loan actually gets paid

When you make a monthly mortgage payment, a portion goes to interest and a portion goes to principal (the amount you still owe, distinct from the interest you pay on it each period). The split changes over the life of the loan. Most borrowers don't realise how extreme the early-years skew is.

Illustrative (a separate example from the APR table above; we round the rate to a clean 3% here so the amortisation maths reproduce easily): €250,000 mortgage, 3% fixed rate, 25-year term. Monthly payment of €1,185.53.

| Payment number | Interest portion | Principal portion | Balance after |
|---|---|---|---|
| Month 1 | €625.00 | €560.53 | €249,439.47 |
| Month 60 (year 5) | €536.03 | €649.50 | €213,763.62 |
| Month 120 (year 10) | €431.06 | €754.47 | €171,670.78 |
| Month 180 (year 15) | €309.13 | €876.40 | €122,775.08 |
| Month 240 (year 20) | €167.49 | €1,018.04 | €65,976.98 |

*Illustrative figures; exact numbers depend on loan details.*

<figure>
  <svg viewBox="0 0 800 480" role="img" aria-labelledby="fig-amort-title fig-amort-desc" xmlns="http://www.w3.org/2000/svg">
    <title id="fig-amort-title">Where each monthly payment actually goes over the life of the loan</title>
    <desc id="fig-amort-desc">Six stacked bars at months 1, 60, 120, 180, 240, and 300. Each bar represents the same €1,185.53 monthly payment, split into the interest portion (orange, on top) and the principal portion (deep blue, on bottom). The interest portion shrinks dramatically over time while the principal portion grows. By the final payment, almost the entire amount is principal.</desc>
    <text x="400" y="32" text-anchor="middle" class="fig-title">The same €1,185.53 payment, every month</text>
    <text x="400" y="54" text-anchor="middle" class="fig-subtitle">€250,000 mortgage · 3% fixed · 25-year term</text>
    <rect x="290" y="76" width="12" height="12" class="fig-fill-warn"/>
    <text x="308" y="86" text-anchor="start" class="fig-eyebrow">Interest</text>
    <rect x="400" y="76" width="12" height="12" class="fig-fill-blue"/>
    <text x="418" y="86" text-anchor="start" class="fig-eyebrow">Principal</text>
    <rect x="115" y="110" width="70" height="158.2" class="fig-fill-warn"/>
    <rect x="115" y="268.2" width="70" height="141.8" class="fig-fill-blue"/>
    <text x="150" y="195" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€625</text>
    <text x="150" y="345" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€561</text>
    <text x="150" y="430" text-anchor="middle" class="fig-tick">Month 1</text>
    <rect x="217" y="110" width="70" height="135.6" class="fig-fill-warn"/>
    <rect x="217" y="245.6" width="70" height="164.4" class="fig-fill-blue"/>
    <text x="252" y="184" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€536</text>
    <text x="252" y="334" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€650</text>
    <text x="252" y="430" text-anchor="middle" class="fig-tick">Month 60</text>
    <rect x="319" y="110" width="70" height="109.1" class="fig-fill-warn"/>
    <rect x="319" y="219.1" width="70" height="190.9" class="fig-fill-blue"/>
    <text x="354" y="170" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€431</text>
    <text x="354" y="320" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€754</text>
    <text x="354" y="430" text-anchor="middle" class="fig-tick">Month 120</text>
    <rect x="421" y="110" width="70" height="78.2" class="fig-fill-warn"/>
    <rect x="421" y="188.2" width="70" height="221.8" class="fig-fill-blue"/>
    <text x="456" y="155" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€309</text>
    <text x="456" y="305" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€876</text>
    <text x="456" y="430" text-anchor="middle" class="fig-tick">Month 180</text>
    <rect x="523" y="110" width="70" height="42.4" class="fig-fill-warn"/>
    <rect x="523" y="152.4" width="70" height="257.6" class="fig-fill-blue"/>
    <text x="558" y="136" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€167</text>
    <text x="558" y="285" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€1,018</text>
    <text x="558" y="430" text-anchor="middle" class="fig-tick">Month 240</text>
    <rect x="625" y="110" width="70" height="2" class="fig-fill-warn"/>
    <rect x="625" y="112" width="70" height="298" class="fig-fill-blue"/>
    <text x="660" y="104" text-anchor="middle" class="fig-tick" style="fill: var(--color-text-primary); font-weight: 600;">~€3</text>
    <text x="660" y="265" text-anchor="middle" class="fig-tick" style="fill: #ffffff; font-weight: 600;">€1,183</text>
    <text x="660" y="430" text-anchor="middle" class="fig-tick">Month 300</text>
    <text x="400" y="465" text-anchor="middle" class="fig-tick" style="font-style: italic;">Illustrative · constant monthly payment, the split changes every month</text>
  </svg>
  <figcaption>Same payment, every month, for 25 years. Early on, you're mostly paying interest; the principal barely moves. By the final years, almost the entire payment is principal. This is why an extra €1,000 in month 1 cancels 25 years of interest on that euro, and the same €1,000 near month 290 saves almost nothing.</figcaption>
</figure>

Two consequences people almost always underestimate:

- **In the early years, most of the payment is interest.** In the first few years, you build equity very slowly. Selling in year 3 after paying tens of thousands of euros might only have reduced your principal by a few thousand
- **Prepayments in early years are disproportionately powerful.** One extra €1,000 payment in year 1 removes €1,000 of principal that would otherwise accrue interest for 25 years. The same €1,000 in year 24 saves almost nothing

This is why the timing of any prepayment matters as much as the amount.

## Discount points and break-even analysis

Some lenders offer to lower your interest rate in exchange for an upfront fee, sometimes called discount points or rate-buy-down. A typical structure: pay 1% of the loan amount now, get a slightly lower rate for the life of the loan.

Whether this is worth it depends on break-even analysis:

1. Compute the monthly payment savings from the lower rate
2. Divide the upfront fee by the monthly savings → number of months to recoup the fee
3. Compare to how long you actually expect to hold the loan

If you'll keep the loan for 20 years and recoup the fee in 5 years, points are probably worth it. If you'll sell the property or refinance in 3 years and recoup only at year 6, paying for points loses money.

Same logic applies in reverse when lenders offer "no-fee" loans at a slightly higher rate: you're effectively paying for the lender's costs over time.

## Refinancing: replacing a loan with a better one

Refinancing means taking out a new loan to pay off an existing one, usually to get a lower rate, a different term, or to switch between fixed and variable. It makes sense when:

- Interest rates have dropped meaningfully since you took the original loan
- Your credit situation has improved and you can now qualify for a better rate
- You want to change the loan term (shortening to pay off faster or lengthening to reduce monthly payments)
- Your original loan type no longer fits your situation

The break-even analysis is the same: new loan fees ÷ monthly payment savings = months to break even. If you'll keep the loan longer than that, refinancing saves money.

Caveats:

- Some existing loans carry prepayment or early-termination penalties. Check before you refinance
- Refinancing restarts the amortisation clock. A new 25-year loan from year 10 of an old one may have a lower payment but extend total interest paid
- Hidden costs: new appraisal, new arrangement fees, legal fees. Not all are obvious in marketing copy

## Prepayment: the most effective interest-reducer

If your loan allows it without penalty, prepaying principal is one of the most powerful ways to reduce total interest paid.

Example: the €250,000, 3%, 25-year mortgage above has total interest of roughly €105,000 over its life. Adding just €100 a month of principal prepayment reduces the term by roughly 2.75 years and saves around €13,000 in total interest. Doubling that to €200 a month extra cuts the term by around 5 years and saves about €23,000. Larger prepayments scale the savings further.

Prepayment is effectively a guaranteed return equal to the loan's interest rate. A 3% mortgage prepayment delivers a guaranteed 3% after-tax return (in jurisdictions without mortgage interest tax relief; the math is slightly different where such relief exists). A 7% consumer loan delivers a guaranteed 7%. That's why high-interest debt dominates investment returns in the prioritization hierarchy covered in the [saving vs. investing post](/blog/saving-vs-investing/).

Important: some loans, especially fixed-rate mortgages in certain markets, charge prepayment penalties. Check your specific loan before planning a prepayment strategy.

## Comparing loan offers: the honest method

Here's a side-by-side comparison framework that won't mislead you:

1. **Normalise the amount and term.** Quote every lender on the same loan amount and the same term. Otherwise the numbers aren't comparable
2. **Get the full APR.** Include all mandatory fees and bundled products
3. **Compute the total cost of borrowing.** Monthly payment × number of payments + any upfront fees. This is the total money you'll hand over for the loan
4. **Check all restrictions.** Prepayment penalties, rate reset dates, insurance bundles, account fees, early-termination clauses
5. **Stress-test variable elements.** If the rate can change, what's the worst realistic scenario? Can you afford it?
6. **Only then compare headline rates.** They're the last thing to look at, not the first

| Offer | Amount | Term | Rate | Fees + bundled | APR | Fixed/Variable | Prepayment | Total cost |
|---|---|---|---|---|---|---|---|---|
| A | €250,000 | 25y | 3.2% | €0 | 3.20% | Fixed 25y | Free | €363,510 |
| B | €250,000 | 25y | 3.1% | €3,000 + €2,500 insurance | 3.30% | Fixed 5y, then variable | Penalty first 5y | Depends on rate path |
| C | €250,000 | 25y | 3.5% | €0 | 3.50% | Fixed 25y | Free | €375,470 |

*Illustrative.*

If you'd rather not work the table by hand, the [loan comparison calculator](/free/loan-comparison/) runs the math for up to five offers side by side: monthly payment, time to payoff, total interest, and total amount paid, with origination fees and extra-monthly-principal modelling included. It supports multiple currencies and uses the right local conventions, so an INR comparison reads with proper lakh/crore grouping.

The best offer is not always the one with the lowest rate. It's the one whose total cost, APR, and contractual terms align best with your actual plan.

## Common mistakes

- **Anchoring on the advertised rate.** It's the marketing number. APR is the honest one, and total cost is more honest still
- **Underestimating fees.** €3,000 of fees on a €250,000 loan feels small. Over the loan's life, it's real money and shifts the comparison
- **Ignoring the variable-rate reset.** A teaser rate that's fixed for 3 years then floats is exposing you to five or more rate resets over a 25-year mortgage
- **Refinancing without checking break-even.** Lower rate ≠ savings. Fees and extended term can erase the benefit
- **Not checking prepayment rules.** Future-you might come into money and want to pay the loan down. A penalty clause can cost thousands in that scenario
- **Signing without stress-testing.** "Can I afford this payment if rates rise 2%?" is the minimum question to ask on any variable-rate loan
- **Bundling you didn't understand.** Mandatory insurance tied to the loan, account products you have to open, investment products sold alongside. Any of these can quietly change the effective cost

## What you can do

1. **Compare APRs, not rates.** The APR is a more honest one-number comparison than the headline rate
2. **Compute total cost.** Monthly payment × number of payments + upfront fees. That's the real price
3. **Read the variable-rate clause carefully.** What index? What margin? How often can it reset? What's the maximum it can rise to?
4. **Check prepayment rules before signing.** Free prepayment is a valuable option even if you never use it
5. **Model the worst case.** For any variable-rate loan, model the highest realistic rate and confirm you can live with the payment
6. **Do the break-even math on points and refinancing.** Fees divided by monthly savings = months to recoup. Compare to how long you'll actually hold
7. **Prepay aggressively when the rate is high.** For high-interest loans, extra principal is a guaranteed return. For low-interest loans, invest the extra money instead. See [saving vs. investing](/blog/saving-vs-investing/) for the framing

Loans are contracts. The rate on the billboard is the invitation. The APR, the total cost, the amortisation schedule, and the fine print are the actual deal. Knowing what to compare is most of the battle; the rest is discipline to keep comparing until the cheapest honest offer is clear.

The single largest loan most people will ever take is a mortgage, and the asset that loan buys is real estate. The next post zooms in on real estate as an asset class: how it actually generates returns once you net out maintenance, taxes, and transaction costs, why leverage cuts both ways, and how to run an honest rent-vs-buy comparison instead of the sloppy one.
