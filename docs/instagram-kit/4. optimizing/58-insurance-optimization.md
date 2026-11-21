---
title: "How Much Insurance Do You Need as Your Wealth Grows?"
blog_url: "https://nidhi.today/blog/insurance-optimization/"
chip: "Money, Compounding"
---

## Brief

person: Eva, 45
situation: Eva set up her insurance at 25 with €1,000 saved. Twenty years on she has savings, grown children and the same policies.
withheld: Health cover and where not to cut, term against whole life, when life cover can lapse, deductibles and old cars, the cover many people drop, and the yearly review.

## Day 1 (angle)

angle: A cheaper policy raises your deductible by €2,000: when do premium savings catch up?
breadth: broad | Anyone who has chosen a deductible
number: €2,000 more per claim at most; €300 a year saved; seven claim free years; €2,100. The reel says all four
takeaway: A higher deductible pays for itself over claim free years; a claim before then needs the extra from cash already set aside.
tool: The deductible sum. The extra per claim, the premium saved each year, and the cash on hand for an early claim.
send_to: Someone weighing a higher deductible.
send_why: number

## Day 1 (reel)

plan: 58-insurance-optimization.reel.json
render: cp "docs/instagram-kit/4. optimizing/58-insurance-optimization.reel.json" output/plans/optimizing/58-insurance-optimization.json && node scripts/render-reels.mjs insurance-optimization --level optimizing --from-plan
video: output/videos/optimizing/58-insurance-optimization.mp4
cover: output/thumbnails/optimizing/58-insurance-optimization.png
caption: output/captions/optimizing/58-insurance-optimization.ig.txt
hashtags: #nidhi #nidhicompounding #insurancebasics #deductible #moneydecisions

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the deductible sum, before raising it: the extra you would pay on a claim; the premium saved each year; and the cash on hand if a claim comes early.

band: The deductible sum
lead: Before raising it
row: Extra | Per claim | warn | the higher deductible
row: Saved | Each year | teal | the lower premium
row: Cash | On hand? | ink | for an early claim
note: Illustrative. Premiums differ by insurer.

## Day 2 (angle)

angle: Your net worth is €400,000: can cover above it still leave a gap?
breadth: broad | Anyone with liability cover or wondering about it
number: Net worth €400,000; policy limit €1 million; an illustrative judgment of €1.2 million. The reel says all three
takeaway: A claim's size follows the harm done, not the wealth of the person who caused it, so a limit above net worth can still fall short.
tool: The liability check. The policy's limit, what is owned after debts, and what local rules protect.
send_to: Someone whose wealth has grown.
send_why: number

## Day 2 (reel)

plan: 58-insurance-optimization.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/58-insurance-optimization.day2.reel.json" output/plans/optimizing/58-insurance-optimization-day2.json && node scripts/render-reels.mjs insurance-optimization --level optimizing --from-plan --angle day2
video: output/videos/optimizing/58-insurance-optimization-day2.mp4
cover: output/thumbnails/optimizing/58-insurance-optimization-day2.png
caption: output/captions/optimizing/58-insurance-optimization-day2.ig.txt
hashtags: #nidhi #nidhicompounding #liabilityinsurance #protectyourassets #insurancereview

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the liability check, for one household: the policy's limit; what is owned after debts; and what local rules protect.

band: The liability check
lead: For one household
row: Limit | How much? | teal | the most the insurer pays
row: Net worth | How much? | ink | owned, after debts
row: Protected | What? | warn | depends on local law
note: Illustrative. Rules differ by country.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: Cheaper policy. When does it pay?
d1_f1_caption: A higher deductible, year by year

d1_f3_kind: tool
d1_f3_alt: Story version of the deductible sum: the extra paid on a claim, the premium saved each year, and the cash on hand for an early claim.
d1_f3_time: evening
d1_f3_caption: The deductible sum

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: Cover above your net worth?
d2_f1_caption: A claim above the limit

d2_f3_kind: tool
d2_f3_alt: Story version of the liability check: the policy limit, what is owned after debts, and what local rules protect.
d2_f3_time: evening
d2_f3_caption: The liability check

d2_f4_kind: extra
d2_f4_alt: Beyond this post: life cover exists for people who depend on your income; once nobody would struggle without it, many people let term cover lapse.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Cover follows dependence.
d2_f4_body: Life cover exists for people who depend on your income. Once nobody would, many let term cover lapse.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: When life cover can end
