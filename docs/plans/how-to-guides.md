# How-to guides

Short guides at `/how-to/` that each answer one money question a reader recognises, useful without opening a lesson. Designed by the council on Nov 10, 2026, in its three-stage design process (each member presented three designs blind, each combined the best items into overall designs, then item votes and a sign-off). The owner set the goals and decided the two questions left to them.

## The owner's goals

1. A quick solution to a problem a reader has, wikiHow style: answer the question, then the deeper lesson, extra references and the main lessons at the end.
2. Real value to a reader, not a fancy thing on the site; but visual, and found in search.
3. Help a reader who is scared of everything finance understand important things easily.

## Owner decisions (Nov 10, 2026)

- Guide bodies are **English only**, like the lessons. The hub and the lines leading to it are in every language, and outside English each card says "Guide in English".
- The address is **`/how-to/`**, with guides at `/how-to/<slug>/`.

## What a guide is

- One recognisable problem, one useful outcome. Normally 350 to 650 words, shorter when that is enough, and never more than a 4-minute read (owner, Nov 10, 2026; `GUIDE_MAX_MINUTES`, enforced by the build at 200 words a minute). If the answer needs more, the question is narrowed.
- Written fresh for the task; the lesson stays the deep study. A guide names its lessons, main one first.
- The council rejected the earlier idea of relabelling existing lessons by method ("work out a number, run a check, follow the steps"): readers think in problems, not methods.

## Page order (`src/pages/how-to/[slug].astro`)

1. The title is the reader's question; one line says what they will have at the end.
2. **Short answer**, two or three plain sentences, useful on its own; reading only this is a legitimate visit.
3. What this page can and cannot solve.
4. A **protective strip** where safety matters (what to do now, what can wait). No universal deadlines; no promise that regulated help exists everywhere. There is no separate "first aid" format: it would frame the section around alarm, and help routes vary by country.
5. **You'll need**: materials or nothing. Reading time always; task time only when an honest estimate exists, otherwise what it depends on.
6. **Steps** (3 to 5): one neutral action each, why it matters, an example where helpful, cautions beside the step they qualify. Or **"See it, try it"**: a worked example first, then how to read your own.
7. One **visual** (below).
8. **You can stop here**: the result the reader now holds.
9. A **blank sheet** to print and fill in where readers repeat the task. No download file.
10. **What depends on you**: the decision the page leaves to the reader first, then what it depends on.
11. **Go deeper**: the lessons (unpublished ones appear when they go live), a matching tool, two or three references; sources folded; last checked date.

## Topic rule

A guide is admitted only if its outcome is an inventory, a calculation, an understood charge, a verification, a bounded comparison or questions to ask. No product, allocation, debt-strategy, tax or legal direction; a consequential choice explains the trade-offs and links the decision lesson. Country rules are scoped. Time-sensitive protective steps are allowed; manufactured urgency is not. Each new guide gets a council editorial check: which decision could a reader infer, which assumptions drive the answer, and where it fails.

## The scared reader

Answer first. Terms explained at first use. One clearly fictional example person. Estimates allowed where precision does not matter, and the page says where it does. A missing number gets "where to find it". No grades, failure colours, shame or "you should already know". Never imply the task solves the whole problem.

## Visuals (`src/components/GuideVisual.astro`)

One per guide, from a reusable set: a timeline with a running balance, a filled table, a document with numbered notes, a message with its warning signs marked. Built from HTML text and tables, never an image; meaning never rests on colour alone. Values are written once, in the guide's frontmatter. Each guide also has a share image (`scripts/render-guide-cards.mjs`, output in `public/brand/social/how-to/`); run it after adding a guide or changing a title. Instagram panels can be adapted from a guide's own example and are reviewed alongside it.

## Search and SEO

- Search on `/blog/` (`src/utils/siteSearch.ts`) covers lessons and guides (the hub has its own guide search, below): words matched separately, filler words dropped, word starts only ("rent" finds "renting", not "current"), a few everyday words mapped to the lessons' words, FAQ questions and "In this lesson" phrases included. Guides come first on a tie. What is typed stays in memory.
- Reader-question titles, answer-led meta descriptions, Article and BreadcrumbList structured data, sitemap entries dated by `lastChecked`, links both ways between guides and lessons, one line in `llms.txt`. No HowTo or FAQ schema: Google dropped those rich results.

## Where readers find it

The hub (`/how-to/`, grouped as "Getting through the month", "I owe money", "Taking stock", "Money across borders", "Is this safe?"). On `/blog/`, a two-way start band, "Where would you like to start?": the path from the start on one side, and on the other "One money question?" with three guide questions (`FEATURED_GUIDES` in `src/utils/guides.ts`) and a link to all of them; also a line under a search with no results. On the home page, a card at the top of the Lessons section, and a "Can I get help with just one money question?" item in the FAQ (and its FAQPage data); the hero carries no How-to link, so it doesn't compete with the situations. One line under a lesson's TL;DR and one near its end; a quiet line on the volunteer page; the Instagram bio through `/how-to/ig/`.

The FAQ item has no click label, so the two original questions keep `home-faq-1` and `home-faq-2`, as the privacy notice records them.

## Finding guides as the set grows

Designed by the council on Nov 10, 2026 (three stages, unanimous), after the owner asked how readers will find guides once there are many; the owner then asked for every layer to be built at once, so nothing has to be set up later.

**Live now**
- A "Search the guides" box at the top of `/how-to/` in every language: guides only, in the page's memory (no field name, no form action, nothing in the address, nothing sent). Each language adds its own everyday phrases for the guides (`src/i18n/strings/howToAliases.ts`, council-reviewed; coverage reviewed at about 25 guides). The search keeps letters of any script, and drops common filler words in all five languages. With no guide match, up to three "Lessons that may help".
- "Common questions" under the box (`COMMON_GUIDES` in `src/utils/guides.ts`), and links to each group.
- "Related questions" on every guide: two or three chosen by hand in the guide's `related` field (any group; the build fails on an unknown slug or the guide itself). It replaced the old automatic "Other short guides".

**Built and switched off** (`src/utils/guideLayers.ts`, three flags, all false)
- Group pages, `/how-to/<group>/` in every language, with the group's introduction; the hub then shows four guides per group and "All N in this group". Off: no page is built and nothing reaches the sitemap.
- Situation pages, `/how-to/situation/<slug>/` (English), from `src/content/situations/`, and a "What's happening?" row on the hub. A published situation needs at least three live guides, or the build fails. None is written in advance.
- Filters on the hub, over the facets the guides carry (today only the group), one value at a time, in memory.

A guide count never switches a layer on. The build prints a notice when a layer reaches its review count (group pages: one group at 10 or the hub at 30; situations: 30; filters: 50), and the council switches it on after its review. Turning one on changes the flag and its test in the same commit (`src/utils/guideLayers.test.ts`, which checks each layer both ways).

**Not built yet, on purpose:** the `countries` and `moments` (life event) fields. Each is added with the first real guide that needs it, so its meaning comes from content; the filters then pick it up.

No new analytics labels or storage, so no privacy changelog entry.

## Upkeep (`src/content.config.ts`, `src/utils/guides.ts`)

Each guide records its lessons, the figures it shares with them (`sharedFigures`: the build fails if the lesson no longer contains the exact text), its sources, a review trigger and a last checked date. A lesson change that touches a shared figure updates the guide in the same pull request. Corrections are shown above the title, as on lessons.

## Privacy and What's changed

The section launched with no new analytics labels, so it needed no privacy changelog entry. A later label needs a material entry first. Search text and anything typed are never captured. The launch has a What's changed item (2026-11-10); later guides can be batched into one item a month.

## Launch set and growth

The first five guides, then, after the owner found five too few (Nov 10, 2026), a council design round chose a wave of seven more for the launch and a second wave of four. Every guide has its own council editorial check.

Launch (12):
1. Will my money last until payday? (includes the essential-spending checklist)
2. How do I list what I owe?
3. What does the minimum payment on my credit-card bill mean?
4. How do I compare two money-transfer quotes by what actually arrives?
5. How can I check a suspicious money message? (its main lesson, 59, links once it is published)
6. How do I work out my net worth? (Taking stock; net worth calculator)
7. How do I compare two loan offers by what they cost in total? (loan comparison; no ranking, questions about missing terms)
8. What does a 0% EMI or buy now, pay later plan really cost? (published Nov 13 with its lesson, 50c)
9. How do I work out a month of essential costs? (no emergency-fund target)
10. How much would the same shopping cost after inflation? (an assumed rate, never a forecast; inflation calculator)
11. How do I list my accounts and regular payments? (Taking stock; an inventory, never credentials)
12. How can I check a money website is the real one? (matching details don't prove an offer is safe)

Wave 2 (separate pull request, about two weeks later, each after its own check): turning a yearly bill into a monthly amount; my share of rent and bills (an agreed split, not what is fair); how much of my money I can get to, and when (an inventory, not where to hold money); checking the exchange rate my card used abroad (one transaction, no card recommendation).

Left for later: refinancing break-even (after the loan guide sets the format), savings growth ranges, savings interest, last month's earnings and spending, early-repayment quotes, an emergency-fund target. Next, a few beginners try the guides (no financial details collected). Growth then comes from questions readers report, consented usability sessions and observed misunderstandings. Still deferred: "I can't pay a bill this month" and country-specific topics (tax notices, credit reports, moving abroad).

## Left out on purpose

A separate first-aid section, branching walkthroughs, calculators, accounts, ratings, quizzes, personalised recommendations, translated guide bodies, HowTo or FAQ schema, a method-based hub, relabelled lessons.
