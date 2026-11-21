---
title: "Income Replacement Ratio: How Much Income You Need in Retirement"
blog_url: "https://nidhi.today/blog/income-replacement-ratio/"
chip: "Money, Compounding"
---

## Brief

person: Eva, 44
situation: Eva earns €4,000 a month before tax and has read that retirement needs 70 to 80% of it. She does not know where that figure comes from or whether it fits her.
withheld: Where the 70 to 80% figure comes from and where it breaks, building the number line by line, how the ratio moves the target, how spending changes across retirement, and pensions and healthcare by country.

## Day 1 (angle)

angle: The rule says retirement needs 70 to 80% of your pay: what does that number assume?
breadth: broad | Anyone who has seen a retirement estimate
number: 70 to 80% of pay; saving 10 to 15%, work costs 5 to 10%, tax 5 to 10% drop away; real households 40% to over 100%. The reel says the ranges
takeaway: The 70 to 80% figure assumes retirement saving, work costs and some tax drop away; where one of those does not, the figure is off.
tool: The three assumptions. Saving that stops, work costs that stop, and tax that falls.
send_to: Someone wondering where retirement estimates come from.
send_why: number

## Day 1 (reel)

plan: 57-income-replacement-ratio.reel.json
render: cp "docs/instagram-kit/4. optimizing/57-income-replacement-ratio.reel.json" output/plans/optimizing/57-income-replacement-ratio.json && node scripts/render-reels.mjs income-replacement-ratio --level optimizing --from-plan
video: output/videos/optimizing/57-income-replacement-ratio.mp4
cover: output/thumbnails/optimizing/57-income-replacement-ratio.png
caption: output/captions/optimizing/57-income-replacement-ratio.ig.txt
hashtags: #nidhi #nidhicompounding #retirementplanning #retirementincome #pensionplanning

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the three assumptions, behind 70 to 80%: retirement saving stops; work costs stop; and tax falls with a lower income.

band: The three assumptions
lead: Behind 70 to 80%
row: Saving | Stops? | ink | 10 to 15% of pay
row: Work costs | Stop? | teal | 5 to 10% of pay
row: Tax | Falls? | warn | 5 to 10% of pay
note: Illustrative. Mainly from US studies.

## Day 2 (angle)

angle: You retire before your pension starts: can it cut what you withdraw straight away?
breadth: narrow | Needs a viewer thinking of stopping work before pension age
number: €55,000 of yearly spending; a pension of €25,000 from age 67; €30,000 from investments after that. The reel says all four
takeaway: A pension reduces what investments must cover only from the year it starts; the years before it need the full amount.
tool: The pension timeline. Spending each year, when the pension starts, and what savings cover before and after.
send_to: Someone hoping to retire before their pension starts.
send_why: number

## Day 2 (reel)

plan: 57-income-replacement-ratio.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/57-income-replacement-ratio.day2.reel.json" output/plans/optimizing/57-income-replacement-ratio-day2.json && node scripts/render-reels.mjs income-replacement-ratio --level optimizing --from-plan --angle day2
video: output/videos/optimizing/57-income-replacement-ratio-day2.mp4
cover: output/thumbnails/optimizing/57-income-replacement-ratio-day2.png
caption: output/captions/optimizing/57-income-replacement-ratio-day2.ig.txt
hashtags: #nidhi #nidhicompounding #statepension #retirementgoals #financialindependence

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the pension timeline, year by year: yearly spending including tax; the age the pension starts; and what savings cover before and after it.

band: The pension timeline
lead: Year by year
row: Spending | Each year | ink | including tax
row: Pension | From when? | teal | its start age
row: Savings | Cover? | warn | before it and after
note: Illustrative. Pension ages differ.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: 70 to 80% of what?
d1_f1_caption: What the retirement rule assumes

d1_f3_kind: tool
d1_f3_alt: Story version of the three assumptions: retirement saving stops, work costs stop, and tax falls with a lower income.
d1_f3_time: evening
d1_f3_caption: The three assumptions

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: Retiring before the pension?
d2_f1_caption: A pension has a start date

d2_f3_kind: tool
d2_f3_alt: Story version of the pension timeline: yearly spending including tax, the age the pension starts, and what savings cover before and after.
d2_f3_time: evening
d2_f3_caption: The pension timeline

d2_f4_kind: extra
d2_f4_alt: Beyond this post: spending is rarely flat across thirty years of retirement; travel and leisure often rise early and fall later, while care costs can arrive late.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Spending is rarely flat.
d2_f4_body: Travel and leisure often rise early in retirement and fall later. Care costs can arrive late.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: How spending changes
