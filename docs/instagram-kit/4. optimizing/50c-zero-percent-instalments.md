---
title: "Is 0% EMI or Buy Now Pay Later Really Free? When Free Is Free"
blog_url: "https://nidhi.today/blog/zero-percent-instalments/"
chip: "Money, Compounding"
---

> **Reels only, two days (owner, Nov 5, 2026).** Day 1 the checkout check, day 2 free until a deadline (deferred interest). No carousel. Remove this note once scheduled.

## Brief

person: Jiri, 38
situation: Jiri needs a €1,200 laptop. The shop offers twelve monthly payments of €100 at 0%, or €1,140 paid now.
withheld: Who pays when 0% really is free (the merchant fee), processing fees and tax on no cost EMI, stacked plans, the spending studies and their limits, and the rules by country.

## Day 1 (angle)

angle: Is 0% really free? Only when the price matches paying now; a lost discount is the cost
breadth: narrow | Needs a specific product: a viewer offered instalments at a checkout
number: €1,200 in monthly payments at 0% against €1,140 now: the €60 gap works like about 10% a year
takeaway: A 0% plan can be free when the price is the same, there are no fees and every payment is on time; otherwise someone pays, often the buyer.
tool: The checkout check. Same price as paying now? What does a late payment cost? Would I buy it today at this price?
send_to: A friend who picks instalments at every checkout.
send_why: checklist

## Day 1 (reel)

plan: 50c-zero-percent-instalments.reel.json
render: cp "docs/instagram-kit/4. optimizing/50c-zero-percent-instalments.reel.json" output/plans/optimizing/zero-percent-instalments.json && node scripts/render-reels.mjs zero-percent-instalments --level optimizing --from-plan
video: output/videos/optimizing/zero-percent-instalments.mp4
cover: output/thumbnails/optimizing/zero-percent-instalments.png
caption: output/captions/optimizing/zero-percent-instalments.ig.txt
hashtags: #nidhi #nidhicompounding #buynowpaylater #nocostemi #shoppingtips

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the checkout check, before you choose instalments: is the price the same as paying now; what a late or failed payment costs; and would you buy it today at this price.

band: The checkout check
lead: Before you choose instalments
row: Price | Same? | teal | as paying now; a gap is the cost
row: Late | Fees? | warn | or interest from day one
row: Today | Buy it? | ink | at this price, paid now
note: Illustrative. Paying later tends to raise spending, studies find.

## Day 2 (angle)

angle: Free until a deadline: on some store cards, anything left unpaid brings interest back to the day of purchase
breadth: narrow | Needs a specific product: a viewer with a store card or a 0% until a deadline offer
number: €1,200 at 0% for a year; a little left at the deadline brings about €176 of interest charged back to day one
takeaway: Some 0% offers are free only if the whole amount is paid by the deadline; if any is left, interest can be charged from the purchase date, and it can exceed what was left.
tool: The deadline check. When exactly is the deadline? Is the whole amount paid by then? If not, is interest charged from day one?
send_to: A friend who just bought something big on a store card 0% offer.
send_why: checklist

## Day 2 (reel)

plan: 50c-zero-percent-instalments.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/50c-zero-percent-instalments.day2.reel.json" output/plans/optimizing/zero-percent-instalments-day2.json && node scripts/render-reels.mjs zero-percent-instalments --level optimizing --from-plan --angle day2
video: output/videos/optimizing/zero-percent-instalments-day2.mp4
cover: output/thumbnails/optimizing/zero-percent-instalments-day2.png
caption: output/captions/optimizing/zero-percent-instalments-day2.ig.txt
hashtags: #nidhi #nidhicompounding #storecard #creditcardtips #moneytraps

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the deadline check, before a 0% until a deadline offer: when exactly the deadline is; whether the whole amount is paid by then; and if not, whether interest is charged from the day of purchase.

band: The deadline check
lead: Before a 0% until a deadline offer
row: Deadline | When? | ink | the exact date, not the month
row: Whole amount | Paid? | teal | all of it, by that date
row: If not | Day one? | warn | interest charged from the purchase date
note: Illustrative. Terms vary by provider and country.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: Is 0% free?
d1_f1_caption: When 0% instalments cost something

d1_f3_kind: tool
d1_f3_alt: Story version of the checkout check: same price as paying now, the cost of a late payment, and whether you would buy it today at this price.
d1_f3_time: evening
d1_f3_caption: The checkout check

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: 0%, then €176?
d2_f1_caption: Free until a deadline

d2_f3_kind: tool
d2_f3_alt: Story version of the deadline check: when exactly the deadline is, whether the whole amount is paid by then, and whether interest is charged from day one if not.
d2_f3_time: evening
d2_f3_caption: The deadline check

d2_f4_kind: extra
d2_f4_alt: Beyond this post: pay later plans for small buys are easy to stack. In a US regulator's 2025 report, 63% of the borrowers studied had several running at once at some point in a year.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Small plans stack up.
d2_f4_body: Pay later plans for small buys are easy to stack. In a US regulator's 2025 report, 63% of the borrowers studied had several running at once at some point in a year.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: When small plans stack up
