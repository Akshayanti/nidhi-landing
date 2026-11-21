---
title: "Real Returns: How to Tell if Your Portfolio Is Really Performing"
blog_url: "https://nidhi.today/blog/real-returns-and-benchmarking/"
chip: "Money, Compounding"
---

## Brief

person: Petra, 41
situation: Petra's statement says her account grew €50,000 this year. She added €35,000 of it herself, prices rose 4%, and the index in the news did twice as well as she did.
withheld: The exact formula when inflation is high, the long run yardsticks after inflation, money weighted and time weighted returns, benchmarks for common portfolio shapes, how to tell noise from a lasting gap, why chasing last year's winners has tended to lose, and the four questions to ask once a year.

## Day 1 (angle)

angle: Your account grew €50,000 this year: how much did your investments really earn?
breadth: narrow | Needs a viewer with an investment account they add to
number: €50,000 of growth: €35,000 added, €8,000 that only kept up with prices, about €7,000 of real growth. The reel says all four
takeaway: A statement's growth mixes your own deposits with the market and leaves rising prices out; what is left after both is the real return.
tool: The growth split. What you added, what only kept up with prices, and what is left.
send_to: Someone who watches their balance.
send_why: number

## Day 1 (reel)

plan: 54-real-returns-and-benchmarking.reel.json
render: cp "docs/instagram-kit/4. optimizing/54-real-returns-and-benchmarking.reel.json" output/plans/optimizing/54-real-returns-and-benchmarking.json && node scripts/render-reels.mjs real-returns-and-benchmarking --level optimizing --from-plan
video: output/videos/optimizing/54-real-returns-and-benchmarking.mp4
cover: output/thumbnails/optimizing/54-real-returns-and-benchmarking.png
caption: output/captions/optimizing/54-real-returns-and-benchmarking.ig.txt
hashtags: #nidhi #nidhicompounding #realreturn #inflation #portfolioreview

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the growth split, with your yearly statement: what you added; what only kept up with prices; and what is left, the real return.

band: The growth split
lead: With your yearly statement
row: Added | Yours | ink | your own deposits
row: Prices | Kept pace | teal | bought nothing new
row: Left | Real return | warn | after both
note: Illustrative.

## Day 2 (angle)

angle: Your investments made 12% and the index in the news made 24%: did you do badly?
breadth: narrow | Needs a viewer who compares their returns with a headline index
number: A mix of shares and bonds rose 12%; a widely quoted share index rose 24%; a comparison with the same mix returned about 11%. The reel says 12%, 24% and 11%
takeaway: A return means little until it is set beside a comparison that holds the same mix; even then one year proves little.
tool: The fair comparison. The same kinds of investments, in the same proportions, over more than one year.
send_to: Someone comparing their returns.
send_why: number

## Day 2 (reel)

plan: 54-real-returns-and-benchmarking.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/54-real-returns-and-benchmarking.day2.reel.json" output/plans/optimizing/54-real-returns-and-benchmarking-day2.json && node scripts/render-reels.mjs real-returns-and-benchmarking --level optimizing --from-plan --angle day2
video: output/videos/optimizing/54-real-returns-and-benchmarking-day2.mp4
cover: output/thumbnails/optimizing/54-real-returns-and-benchmarking-day2.png
caption: output/captions/optimizing/54-real-returns-and-benchmarking-day2.ig.txt
hashtags: #nidhi #nidhicompounding #investmentreturns #indexinvesting #moneymindset

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the fair comparison, before judging a year: the same kinds of investments; in the same proportions; over more than one year.

band: The fair comparison
lead: Before judging a year
row: Kinds | Same? | ink | shares, bonds, regions
row: Share | Same? | teal | the proportions you hold
row: Years | Several? | warn | one year proves little
note: Illustrative.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: €50,000 of growth. Really?
d1_f1_caption: What a statement's growth is made of

d1_f3_kind: tool
d1_f3_alt: Story version of the growth split: what you added, what only kept up with prices, and what is left, the real return.
d1_f3_time: evening
d1_f3_caption: The growth split

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: 12% against 24%?
d2_f1_caption: Compared with what

d2_f3_kind: tool
d2_f3_alt: Story version of the fair comparison: the same kinds of investments, in the same proportions, over more than one year.
d2_f3_time: evening
d2_f3_caption: The fair comparison

d2_f4_kind: extra
d2_f4_alt: Beyond this post: studies of fund rankings find that few top funds stay at the top, and investors' money often arrives after a strong run.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: Last year's winner.
d2_f4_body: Studies of fund rankings find that few top funds stay at the top, and money often arrives after the strong run.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: Why chasing winners has tended to lose
