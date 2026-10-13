---
type: standalone
title: "Sunday tools 5: Monte Carlo simulator"
when: "Sunday Dec 13, 2026, 14:30 CET. Free tools 5 of 5, between Beliefs 5 and 6. Dec 27 has no feed post."
blog_url: "https://nidhi.today/free/monte-carlo-simulator/?utm_source=instagram&utm_medium=social&utm_campaign=sunday_tools&utm_content=monte_carlo"
chip: "Free tools"
hashtags_day1: "#montecarlo #retirementplanning #fireeurope #longterminvesting #nidhi"
keywords_day1: "Monte Carlo simulation, retirement calculator, retirement planning, investment returns, sequence of returns, range of outcomes, stock and bond mix, today's money, FIRE, safe withdrawal, financial projection, money tools, free calculator, global expats, money abroad, Altersvorsorge, Rentenrechner, simulación Monte Carlo, jubilación, simulation retraite"
---

## Brief

purpose: Shows the Monte Carlo simulator as the answer to a single straight projection line: the same plan, played forward 10,000 times, gives a spread.
honesty: Computed with the tool's own simulate() (src/utils/monte-carlo/math.ts), default seed, 10,000 paths, historical setting: €20,000 today plus €400 a month for 25 years, 60% stocks, 0.3% yearly fees, in today's money. At 25 years: 1 in 10 paths below €159k, median €263k, 1 in 10 above €451k; the straight line at the blended rate ends at €242k; 42% of paths end below it. €140,000 paid in. Returns are drawn to match world stock and bond markets 1900 to 2025 (Dimson, Marsh and Staunton; McQuarrie; CFA Institute Research Foundation, 2026). The tool says years are drawn independently, so long bad runs are rarer than in history; the post says it is not a forecast.

## Day 1 (carousel)

### Caption

A calculator that draws one straight line says €20,000 plus €400 a month, for 25 years, ends at about €242,000 in today's money.

The same plan, played forward 10,000 times with returns drawn from world markets since 1900, gives a spread instead: 1 in 10 paths below €159,000, half above €263,000, 1 in 10 above €451,000. And 42% of them finish below the straight line.

That is what the free Monte Carlo simulator at nidhi.today shows: a low, a median and a high outcome, and, if you switch on withdrawals, how often the money lasts.

It is not a forecast. It draws each year independently, so long runs of bad years are rarer than they were in reality, and it leaves out taxes and life's lumps. The page lists everything it can't see.

The calculations run in your browser; the numbers you type are not sent. It also reads in Hindi and Spanish.

→ Save this for the next time a projection shows you a single line

Made by the person building nidhi, a planner that shows its assumptions. No ads, no data selling. Free tools you can use today, link in bio.

### Slide 1 (scenarios)

alt: The Monte Carlo simulator plays a plan forward thousands of times. What could it grow to: a low, a median and a high outcome. How often does it last: once you live off it. In what money: today's, in 29 currencies. Free at nidhi.today, no account.

title: The spread, not the single line
case: What could it grow to? | a low, a median and a high outcome
case: How often does it last? | once you start living off it
case: In what money? | today's, in any of 29 currencies
rule: Free at nidhi.today · no account

### Slide 2 (worked)

alt: Illustrative worked example. 20,000 euros today plus 400 euros a month for 25 years, 60% stocks, 0.3% yearly fees, 10,000 simulated paths, in today's money. 1 in 10 paths end below 159,000 euros. The median ends at 263,000 euros. 1 in 10 end above 451,000 euros. A single straight line at the average rate ends at 242,000 euros, and 42% of paths finish below it. 140,000 euros paid in.

title: One plan, 10,000 paths
strip: Illustrative · €20k + €400 a month · 25 years · 60% stocks
calc: Low | 1 in 10 paths end below | | !!€159k!! | warn
calc: Median | half end above | | €263k | ink
calc: High | 1 in 10 paths end above | | €451k | teal
note: The straight line says €242k; 42% of paths end below it. €140k paid in.

### Slide 3 (scenarios)

alt: What the simulator can't see. Not a forecast: returns are drawn to match world markets from 1900 to 2025, and years are drawn independently, so long bad runs are rarer than in history. Sources: Dimson, Marsh and Staunton; McQuarrie; CFA Institute Research Foundation, 2026. One pot, one currency. No taxes, and a career break, a house or an inheritance are left out. Calculations run in your browser; the numbers you type are not sent.

title: What it can't see
case: The future | world markets 1900 to 2025, drawn year by year: not a forecast
case: Long bad runs | rarer here than they were in reality
case: Your life | taxes, a career break, a house, a second currency
note: Returns: Dimson, Marsh and Staunton; McQuarrie; CFA Institute Research Foundation, 2026.
rule: Calculations run in your browser · the numbers you type are not sent

## Stories

d1_f1_share: the Sunday tools post
d1_f1_time: at posting
d1_f1_overlay: One plan, 10,000 paths
d1_f1_caption: One savings plan, played forward 10,000 times

d1_f2_kind: poll
d1_f2_alt: Plain story background with the series label, for the poll sticker asking whether your retirement number is one figure or a range.
d1_f2_time: 90 minutes later
d1_f2_poll_q: Is your retirement number one figure or a range?
d1_f2_poll_opts: One figure | A range | I don't have one yet
d1_f2_caption: Is your retirement number one figure or a range?

d1_f3_kind: extra
d1_f3_alt: While nidhi is being built: a free Monte Carlo simulator, up to 100,000 paths, with returns from world markets 1900 to 2025, in today's money.
d1_f3_time: evening
d1_f3_label: While nidhi is being built
d1_f3_title: See the spread
d1_f3_body: Up to 100,000 paths, with returns drawn from world markets since 1900, in today's money.
d1_f3_foot: Free, no account · link below
d1_f3_sticker: link sticker to the tool page, the blog_url above with its UTM tags
d1_f3_caption: Free Monte Carlo retirement simulator, in your browser
