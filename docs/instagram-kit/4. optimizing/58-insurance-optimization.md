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

angle: You have €1,000 saved: what would a €500 loss take?
breadth: broad | Anyone with savings and an insurance policy
number: €1,000 saved, a €500 loss, then €4,000 saved. The reel says all three
takeaway: The same loss takes a smaller share of larger savings, which is why some people stop insuring small losses as savings grow.
tool: The loss test. The largest plausible loss, what savings could absorb, and what stays insured.
send_to: Someone who has more savings now.
send_why: number

## Day 1 (reel)

plan: 58-insurance-optimization.reel.json
render: cp "docs/instagram-kit/4. optimizing/58-insurance-optimization.reel.json" output/plans/optimizing/58-insurance-optimization.json && node scripts/render-reels.mjs insurance-optimization --level optimizing --from-plan
video: output/videos/optimizing/58-insurance-optimization.mp4
cover: output/thumbnails/optimizing/58-insurance-optimization.png
caption: output/captions/optimizing/58-insurance-optimization.ig.txt
hashtags: #nidhi #nidhicompounding #insurancebasics #emergencysavings #moneydecisions

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the loss test, for each policy: the largest plausible loss; whether savings could absorb it; and what that says about the cover.

band: The loss test
lead: For each policy
row: Loss | How large? | ink | the largest plausible one
row: Savings | Absorb it? | teal | without serious harm
row: Cover | Still needed? | warn | large losses, usually yes
note: Illustrative.

## Day 2 (angle)

angle: You owe €500,000 for injuring someone: will your insurance pay it all?
breadth: broad | Anyone with liability cover on a home, car or personal policy
number: €500,000 owed, a €300,000 limit, €200,000 uninsured. The reel says all three
takeaway: A covered claim above the policy limit leaves a gap that may be pursued from savings or income, depending on local rules.
tool: The limit check. What the policy pays at most, what a serious claim could reach, and what you own.
send_to: Someone who thinks covered means paid in full.
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

alt: Tool card, the limit check, for cover that pays what you owe others: the most the policy pays; what a serious claim could reach; and what you own.

band: The limit check
lead: For cover that pays others
row: Limit | The most paid | ink | per claim
row: Claim | How large? | warn | a serious injury
row: Yours | What you own | teal | savings and income
note: Illustrative. Rules differ by country.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: What would €500 take?
d1_f1_caption: The same loss, different savings

d1_f3_kind: tool
d1_f3_alt: Story version of the loss test: the largest plausible loss, whether savings could absorb it, and what that says about the cover.
d1_f3_time: evening
d1_f3_caption: The loss test

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: Covered. Paid in full?
d2_f1_caption: A claim above the limit

d2_f3_kind: tool
d2_f3_alt: Story version of the limit check: the most the policy pays, what a serious claim could reach, and what you own.
d2_f3_time: evening
d2_f3_caption: The limit check

d2_f4_kind: extra
d2_f4_alt: Beyond this post: life cover exists for people who depend on your income; once nobody would struggle without it, many people let term cover lapse.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Cover follows dependence.
d2_f4_body: Life cover exists for people who depend on your income. Once nobody would, many let term cover lapse.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: When life cover can end
