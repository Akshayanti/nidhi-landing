---
title: "Life Events and Your Finances: How to Plan Ahead"
blog_url: "https://nidhi.today/blog/life-events/"
chip: "Money, Compounding"
hashtags_day1: "#parentalleave #familybudget #expatparents #personalfinanceeurope #nidhi"
keywords_day1: "cost of a child, cost of raising a child, part time after baby, career break, motherhood penalty, fatherhood, pay gap after children, pension gap, household income, family planning, take home pay, marginal tax rate, personal finance, money abroad, global expats, Kinderkosten, Elterngeld, Teilzeit, coût d'un enfant, congé parental, coste de un hijo"
hashtags_day2: "#emergencysavings #insurancetips #moneyplanning #expatfinance #nidhi"
keywords_day2: "life events, life changes, financial planning, emergency fund, rainy day fund, redundancy, job loss, illness, buying a home, career break, moving abroad, insurance, financial safety net, scenario planning, personal finance, global expats, Notgroschen, Lebensereignisse, fondo de emergencia, imprevistos, imprévus, épargne de précaution"
---

## Brief

person: Petra and her partner
situation: Petra earns €60,000. After their first child she plans to take a €20,000 role for five years, then go back to full time. Over the next few years they also expect a bigger home and possibly a move abroad, and like anyone they could face an illness or a redundancy.
withheld: How to model a career break, the six inputs for a home purchase, the five dimensions of a move abroad, what to do when events overlap, and how childcare and benefits change the picture by country.

## Day 1 (angle)

angle: When a parent cuts back, the pay given up can outweigh the receipts
number: About €192,000 of take home pay given up against about €165,000 of direct costs to age 18, and €224,000 with lost pension contributions
takeaway: A projection that models only the expense line misses the income line, which can be as big or bigger when a parent cuts back.
tool: The pay line. Pay given up × years × what you keep after tax, plus the pension.

## Day 1 (reel)

plan: 45-life-events.reel.json
render: node scripts/render-reels.mjs life-events --level optimizing --from-plan
video: output/videos/optimizing/45-life-events.mp4
cover: output/thumbnails/optimizing/45-life-events.png
caption: output/captions/optimizing/45-life-events.ig.txt
hashtags: #nidhi #nidhicompounding #familyfinance #newparents #workingparents

## Day 1 (carousel)

### Caption

Many people price the pram. Fewer price the pay.

Studies in Germany and Spain put the direct cost of a child at about €760 a month, around €165,000 to age 18. Petra earns €60,000. If she takes a €20,000 role for five years and returns at 10% below where she would have been, she gives up about €192,000 of take home pay, and about €224,000 counting lost pension contributions.

Slide 5 is the one to keep: the pay line, in three steps.

→ Save this before you plan the time off

The blog covers the four costs of a career break to model first → link in bio

Figures are illustrative. Direct costs come from a 2018 German survey (higher in today's prices) and a 2024 Spanish figure. If neither parent cuts back, the picture is very different. Tax, parental benefits and pay penalties vary widely by country and person.

Made by the person building nidhi, a planner that shows its assumptions. No ads, no data selling. Free tools you can use today, link in bio.

### Slide 1 (hook)

alt: Two bars: direct costs of a child to age 18, about €165,000, next to the take home pay a parent gives up, about €192,000. Headline: When a parent cuts back, the biggest cost of a child may not be on a receipt. Direct costs from 2018 and 2024 surveys. Illustrative.

strip: Illustrative · direct costs from 2018 and 2024 surveys
bar: Direct costs to 18 | 165000 | €165,000 | muted
bar: Pay a parent gives up | 192000 | €192,000 | warn
premise: When a parent cuts back.

The biggest cost of a child may **not be on a receipt**

### Slide 2 (inputs)

alt: Petra and her partner: she earns €60,000 a year, plans a €20,000 role for five years after the birth, and expects to return at 10% below where she would have been. Question: What does that cost her?

who: Petra and her partner
where: Planning their first child
input: €60,000 | Petra's pay today
input: €20,000 | a year, for five years after the birth
input: 10% lower | pay when she goes back to full time
question: What does the pay line add up to?

### Slide 3 (worked)

alt: Two lines for the same child: the receipts, about €760 a month for 18 years, €165k; five years of reduced pay, €40,000 a year after 40% tax, €120k; lower pay on return, €6,000 a year for 20 years after tax, €72k.

title: Two lines, same child
strip: Illustrative · pay after tax · costs from 2018 and 2024 surveys
calc: The receipts | about €760 a month | for 18 years | €165k | muted
calc: Reduced pay | €40,000 a year × 5 | after 40% tax | €120k | warn
calc: Lower pay on return | €6,000 a year × 20 | after 40% tax | €72k | warn
note: Direct costs from Destatis (Germany, 2018 survey) and Save the Children (Spain, 2024). 40% is tax and social contributions on the top slice of pay.

### Slide 4 (bars)

alt: Bars: direct costs to 18 €165,000, pay given up after tax €192,000, and with lost pension contributions €224,000. The pay line is bigger even before the pension. Illustrative.

title: What each line adds up to
strip: Pay after tax · costs from 2018 and 2024 surveys
bar: Direct costs to 18 | 165000 | €165,000 | muted
bar: Pay given up | 192000 | €192,000 | warn
bar: With lost pension | 224000 | €224,000 | warn
note: Illustrative. Pension at 10% of the pay given up.

The pay line is bigger **before** the pension is even counted.

### Slide 5 (tool)

alt: Tool card, the pay line: pay given up times the years, times what you keep after tax, 0.6 at a 40% rate, then add the pension contributions that came with it. Compare that with the receipts.

band: The pay line
lead: What a big change costs in pay
row: Pay given up | × years | ink | each year you earn less
row: What you keep | × 0.6 | ink | at 40% tax and contributions
row: Then add | + pension | warn | contributions that came with the pay
also: Compare it with the receipts, not instead of them.
note: Illustrative. Tax and contributions on the top slice of pay vary by country.

### Slide 6 (scenarios)

alt: Why the pay line is easy to miss: there is no bill, only a smaller payslip; it is spread over decades, €6,000 a year for 20 years; and it usually lands on one parent. Rule: model both lines.

title: Why the pay is easy to miss
case: No bill | just a smaller payslip
case: Spread out | €6,000 a year for 20 years
case: One person | usually lands on the parent who steps back
rule: Model both lines

### Slide 7 (scenarios)

alt: What changes the balance: a lower tax rate makes the pay line bigger; near a 50% rate the two lines are about even; parental benefits and subsidised childcare shrink one line or the other.

title: What changes the balance
case: Lower tax rate | the pay line gets bigger
case: Rate near 50% | the two lines are about even
case: Benefits and childcare | can shrink either line
rule: Run your own numbers

### Slide 8 (closer)

alt: Closing slide: Price the pay, not just the pram. When a parent cuts back, the receipts can be the smaller line. Save slide 5. On the blog: the four costs of a career break to model first.

kicker: Price the pay, not just the pram.
line: When a parent cuts back, the receipts can be the smaller line.
save: Save slide 5
read: The four costs of a career break to model first

## Day 2 (angle)

angle: Plan what you can see coming, buffer what you cannot
number: Four events you can see years ahead, four nobody can, and three buffers for the second kind
takeaway: Sorting comes first: foreseeable events can get a plan, and the rest usually get a buffer.
tool: The sorting question. Can you name roughly when it happens? Then it can go in the plan. If not, it usually gets a buffer.

## Day 2 (reel)

plan: 45-life-events.day2.reel.json
render: node scripts/render-reels.mjs life-events --level optimizing --from-plan --angle day2
video: output/videos/optimizing/45-life-events-day2.mp4
cover: output/thumbnails/optimizing/45-life-events-day2.png
caption: output/captions/optimizing/45-life-events-day2.ig.txt
hashtags: #nidhi #nidhicompounding #lifeevents #financialresilience #expatlife

## Day 2 (carousel)

### Caption

Most money shocks are not shocks. You knew they were coming.

A child, a bigger home, a career break, a move abroad: you can usually see these years ahead, so they can get a plan with a rough date, a number and the bad case tested. An illness, a redundancy, a family emergency, a market shock: nobody can, so they usually get a buffer instead.

Slide 5 is the one to keep: one question that sorts every life event.

→ Save this for your next five years

The blog covers how to model a home purchase, a move abroad, and events that overlap → link in bio

Illustrative. 3 to 6 months is a common guideline for an emergency fund, not a rule.

Made by the person building nidhi, a planner that shows its assumptions. No ads, no data selling. Free tools you can use today, link in bio.

### Slide 1 (hook)

alt: Two columns: You can see it coming, a plan: a child, a home, a career break, a move abroad. You cannot, a buffer: an illness, a redundancy, a family emergency, a market shock. Headline: Most money shocks are not shocks.

left: You can see it coming | A plan
left_item: A child
left_item: A home
left_item: A career break
left_item: A move abroad
right: You cannot | A buffer
right_item: An illness
right_item: A redundancy
right_item: A family emergency
right_item: A market shock

Most money shocks are **not shocks**

### Slide 2 (inputs)

alt: Petra's next five years: a child, in about two years; a bigger home, in about three; a redundancy, nobody knows. Question: Which of these can she plan?

who: Petra, the next five years
where: Three things that could happen
input: A child | in about two years
input: A bigger home | in about three years
input: A redundancy | nobody knows if or when
question: Which of these can she plan?

### Slide 3 (scenarios)

alt: Planning it in three steps: date it, roughly when, even a range; price it, both income and costs; test it, the bad case first. Rule: in the projection, not in your head.

title: Planning it: three steps
case: Date it | roughly when, even a range
case: Price it | the income line and the cost line
case: Test it | the bad case first
rule: In the projection, not in your head

### Slide 4 (scenarios)

alt: The buffer, three things: an emergency fund, often 3 to 6 months of costs; insurance, for what you could not absorb; slack, a savings rate you can cut for a while. Rule: generic on purpose, sized to the household.

title: The buffer: three things
case: Emergency fund | often 3 to 6 months of costs
case: Insurance | for what you could not absorb
case: Slack | a savings rate you can cut for a while
rule: Generic on purpose, sized to the household

### Slide 5 (tool)

alt: Tool card, the sorting question: can you name roughly when it happens? Then it can go in the projection. If you cannot, it usually gets a buffer: an emergency fund, insurance and slack.

band: The sorting question
lead: For any big life event
row: Can you name roughly when? | Plan | teal | it can go in the projection
row: You cannot | Buffer | warn | emergency fund, insurance, slack
also: Sorting comes first.
note: Illustrative.

### Slide 6 (scenarios)

alt: Two ways to mix them up: treating a planned baby as a surprise, so the pay line is never modelled; or planning for every disaster one by one, and still not being covered.

title: Two ways to mix them up
case: A planned baby, treated as a surprise | the pay line never gets modelled
case: Every disaster, planned one by one | and still not covered
rule: Sorting comes first

### Slide 7 (scenarios)

alt: When events stack: two or three at once stress a plan more than each one alone. Some timing is yours, since a break or a purchase can often wait, and comparing orders shows which leaves more cash.

title: When events stack
case: Two or three at once | stress a plan more than each alone
case: Some timing is yours | a break or a purchase can often wait
case: Try different orders | see which leaves more cash
rule: Timing is often a choice

### Slide 8 (closer)

alt: Closing slide: What you can see can be planned. The rest usually gets a buffer. One question sorts every event. Save slide 5. Also in the full post: the six inputs for a home purchase, the five dimensions of a move abroad, and how childcare costs differ by country.

kicker: What you can see can be planned. The rest usually gets a buffer.
line: One question sorts every event.
save: Save slide 5
more: The six inputs for a home purchase
more: The five dimensions of a move abroad
more: How childcare costs differ by country

## Stories

d1_f1_share: the day 1 reel
d1_f1_time: at posting
d1_f1_overlay: The biggest cost may not be on a receipt
d1_f1_caption: The hidden cost of having a child

d1_f2_kind: poll
d1_f2_alt: Plain story background with the series label, for the poll sticker asking which you would price first before a big life change.
d1_f2_time: 90 minutes later
d1_f2_poll_q: Before a big life change, what do you price first?
d1_f2_poll_opts: The costs | The lost pay | Both | Neither
d1_f2_caption: What do you price first before a big change?

d1_f3_kind: tool
d1_f3_alt: Story version of the pay line card: pay given up times years, times what you keep after tax, plus the pension.
d1_f3_time: evening, with the day 1 carousel
d1_f3_caption: How to price the pay you give up

d2_f1_share: the day 2 reel
d2_f1_time: at posting
d2_f1_overlay: A plan or a buffer?
d2_f1_caption: How to plan for big life events

d2_f2_kind: result
d2_f2_alt: Yesterday's poll question, before a big life change what do you price first, with an empty box for the result.
d2_f2_time: 90 minutes later
d2_f2_label: Yesterday's poll
d2_f2_title: Before a big life change, what do you price first?
d2_f2_operator: Type the winning answer and its share as overlay text in the empty box.
d2_f2_caption: What you price first before a big change

d2_f3_kind: tool
d2_f3_alt: Story version of the sorting question card: can you name roughly when it happens? Then it can go in the plan. If not, it usually gets a buffer.
d2_f3_time: evening, with the day 2 carousel
d2_f3_caption: One question for every life event

d2_f4_kind: extra
d2_f4_alt: Beyond this post: A career break can end more than pay. Where employers provide health, life and disability cover, it often stops too, and replacing it privately often costs more.
d2_f4_time: late evening
d2_f4_label: Beyond this post
d2_f4_title: A break can end more than pay.
d2_f4_body: Where employers provide health, life and disability cover, it often stops when a career break starts. Replacing it yourself often costs more, which many people price into the break.
d2_f4_sticker: link sticker to the blog post
d2_f4_caption: What a career break does to your insurance
