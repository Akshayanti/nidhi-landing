---
title: "Geographic Arbitrage: Living Abroad to Save More"
blog_url: "https://nidhi.today/blog/geographic-arbitrage/"
chip: "Money, Compounding"
---

## Brief

person: Marek, 33
situation: Marek works remotely and earns the same wherever he lives. He is comparing his city with a place where the same life costs half.
withheld: The yearly arithmetic (40% and 70% saved, about 22 against 9 years), visa routes, how tax residency is tested, healthcare, the costs no spreadsheet shows, and common routes region by region.

## Day 1 (angle)

angle: You earn €6,000 a month wherever you live: what could lower living costs leave?
breadth: narrow | Needs a viewer whose pay could travel with them
number: €6,000 a month; €4,000 of costs leaves €2,000; €2,000 of costs leaves €4,000. The reel says all three
takeaway: The same pay with lower living costs leaves more to save; nothing else in the sum changes.
tool: The move sum. Pay that travels, costs there, and what is left.
send_to: Someone who could keep their pay while living abroad.
send_why: number

## Day 1 (reel)

plan: 56-geographic-arbitrage.reel.json
render: cp "docs/instagram-kit/4. optimizing/56-geographic-arbitrage.reel.json" output/plans/optimizing/56-geographic-arbitrage.json && node scripts/render-reels.mjs geographic-arbitrage --level optimizing --from-plan
video: output/videos/optimizing/56-geographic-arbitrage.mp4
cover: output/thumbnails/optimizing/56-geographic-arbitrage.png
caption: output/captions/optimizing/56-geographic-arbitrage.ig.txt
hashtags: #nidhi #nidhicompounding #livingabroad #remotework #costofliving

## Day 1 (story)

### Slide 1 (tool)

alt: Tool card, the move sum, for one specific place: the pay that travels; the costs there; and what is left each month.

band: The move sum
lead: For one specific place
row: Pay | Travels? | ink | the same after tax
row: Costs | There | teal | rent, food, healthcare
row: Left | Each month | warn | before tax changes
note: Illustrative.

## Day 2 (angle)

angle: Your monthly bills abroad cost €2,000: can the same local prices cost you more?
breadth: narrow | Needs a viewer who earns in one currency and spends in another
number: €2,000 of bills; the local currency rises, so the same bills cost €500 more: €2,500. The reel says all three
takeaway: Earning in one currency and spending in another means an exchange rate move changes what the same bills cost.
tool: The currency check. What you earn in, what you spend in, and how far the rate has moved before.
send_to: Someone who earns and spends in different currencies.
send_why: number

## Day 2 (reel)

plan: 56-geographic-arbitrage.day2.reel.json
render: cp "docs/instagram-kit/4. optimizing/56-geographic-arbitrage.day2.reel.json" output/plans/optimizing/56-geographic-arbitrage-day2.json && node scripts/render-reels.mjs geographic-arbitrage --level optimizing --from-plan --angle day2
video: output/videos/optimizing/56-geographic-arbitrage-day2.mp4
cover: output/thumbnails/optimizing/56-geographic-arbitrage-day2.png
caption: output/captions/optimizing/56-geographic-arbitrage-day2.ig.txt
hashtags: #nidhi #nidhicompounding #exchangerate #digitalnomadlife #movingoverseas

## Day 2 (story)

### Slide 1 (tool)

alt: Tool card, the currency check, when pay and bills differ: the currency you earn in; the currency you spend in; and how far the rate has moved before.

band: The currency check
lead: When pay and bills differ
row: Earn | Which? | ink | your pay's currency
row: Spend | Which? | teal | your bills' currency
row: Rate | How far? | warn | 20 to 30% in a few years
note: Illustrative. Rates move both ways.

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: Same pay, lower costs?
d1_f1_caption: What lower living costs leave

d1_f3_kind: tool
d1_f3_alt: Story version of the move sum: the pay that travels, the costs there, and what is left each month.
d1_f3_time: evening
d1_f3_caption: The move sum

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: Same prices, bigger bill?
d2_f1_caption: When the exchange rate moves

d2_f3_kind: tool
d2_f3_alt: Story version of the currency check: the currency you earn in, the one you spend in, and how far the rate has moved before.
d2_f3_time: evening
d2_f3_caption: The currency check

d2_f4_kind: extra
d2_f4_alt: Beyond this post: spending fewer than 183 days in a country does not on its own settle where tax is due; many countries also look at a home, work and family.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: 183 days is a start.
d2_f4_body: Fewer than 183 days does not settle where tax is due. Many countries also look at a home, work and family.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: Days and other ties
