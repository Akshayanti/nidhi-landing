---
title: "Is 0% EMI or Buy Now Pay Later Really Free? When Free Is Free"
blog_url: "https://nidhi.today/blog/zero-percent-instalments/"
chip: "Money, Compounding"
---

> **Reels only, two days (owner, Nov 5, 2026).** Day 1 who pays for 0% (one example, the checkout check as its story card), day 2 the fine print that ends it. No single country's product is the subject of a reel (owner: no single country framing). No carousel. Remove this note once scheduled.

## Brief

person: Jiri, 38
situation: Jiri needs a €1,200 laptop. The shop offers twelve monthly payments of €100 at 0%, or €1,140 paid now.
withheld: What €60 costs as a yearly rate (about 10%), the worked deferred interest example, products by country (no cost EMI, meses sin intereses, parcelado sem juros), the spending studies and their limits, and the rules by country.

## Day 1 (angle)

angle: Instalments with no interest: who pays? Often the shop, and no interest does not always mean the lowest price
breadth: narrow | Needs a specific product: a viewer offered instalments at a checkout
number: €1,200 in instalments against €1,140 paid now
takeaway: A 0% plan can be free when the price is the same, there are no fees and every payment is on time; otherwise someone pays, often the buyer.
tool: The checkout check. Same price as paying now? Any fees? Every payment on time?
send_to: A friend who picks instalments at every checkout.
send_why: checklist

## Day 1 (reel)

plan: 50c-zero-percent-instalments.reel.json
render: cp "docs/instagram-kit/4. optimizing/50c-zero-percent-instalments.reel.json" output/plans/optimizing/zero-percent-instalments.json && node scripts/render-reels.mjs zero-percent-instalments --level optimizing --from-plan
video: output/videos/optimizing/zero-percent-instalments.mp4
cover: output/thumbnails/optimizing/zero-percent-instalments.png
caption: output/captions/optimizing/zero-percent-instalments.ig.txt
hashtags: #nidhi #nidhicompounding #buynowpaylater #shoppingtips #instalments

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the checkout check, before you choose instalments: is the price the same as paying now; are there any fees; and is every payment on time.

band: The checkout check
lead: Before you choose instalments
row: Price | Same? | teal | as paying now; a gap is the cost
row: Fees | Any? | warn | processing, account or late fees
row: Payments | On time? | ink | every one, or a fee or interest
note: Illustrative. Terms vary by shop, provider and country.

## Day 2 (angle)

angle: 0% interest can still cost you: a balance left at a deadline, a late or failed payment, fees on top
breadth: narrow | Needs a specific product: a viewer with a 0% plan or store card offer
number: €1,200 at 0% until a deadline; on some plans a small balance left brings interest back to purchase day
takeaway: Some 0% offers are free only if the whole amount is paid by the deadline and every payment goes through; the fine print decides.
tool: The fine print. Whole amount paid by the deadline? What a late or failed payment brings? Fees or taxes on top?
send_to: A friend who just bought something big on a 0% offer.
send_why: checklist

## Day 2 (reel)

plan: 50c-zero-percent-instalments.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/50c-zero-percent-instalments.day2.reel.json" output/plans/optimizing/zero-percent-instalments-day2.json && node scripts/render-reels.mjs zero-percent-instalments --level optimizing --from-plan --angle day2
video: output/videos/optimizing/zero-percent-instalments-day2.mp4
cover: output/thumbnails/optimizing/zero-percent-instalments-day2.png
caption: output/captions/optimizing/zero-percent-instalments-day2.ig.txt
hashtags: #nidhi #nidhicompounding #interestfree #moneytraps #creditcardtips

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the fine print, before a 0% offer: is the whole amount paid by the deadline; what a late or failed payment brings; and any fees or taxes on top.

band: The fine print
lead: Before a 0% offer
row: Deadline | All paid? | ink | by the exact date
row: Late | Fees? | warn | or interest, on some plans
row: On top | Taxes? | warn | processing fees, any tax
note: Illustrative. Terms vary by provider and country.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: No interest. Who pays?
d1_f1_caption: Who pays when instalments are free

d1_f3_kind: tool
d1_f3_alt: Story version of the checkout check: same price as paying now, any fees, and every payment on time.
d1_f3_time: evening
d1_f3_caption: The checkout check

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: 0%, until the fine print?
d2_f1_caption: The fine print on 0%

d2_f3_kind: tool
d2_f3_alt: Story version of the fine print: the whole amount paid by the deadline, what a late or failed payment brings, and any fees or taxes on top.
d2_f3_time: evening
d2_f3_caption: The fine print

d2_f4_kind: extra
d2_f4_alt: Beyond this post: studies find the option to pay later tends to raise how much people buy; in one study, shops that offered it saw sales rise by about 20%.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Pay later, buy more.
d2_f4_body: Studies find the option to pay later tends to raise how much people buy. In one study, shops that offered it saw sales rise by about 20%.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: Why paying later raises spending
