# Instagram Content Playbook

Strategic decisions and workflow for @nidhi.today Instagram content.
This is the working reference. Update as decisions change.

**Content rules (set Oct 14, 2026).** Every kit, reel, carousel, story and caption follows these, and so does the blog post it comes from:
1. **Teach, don't prescribe.** The concept, why people use it, the evidence with its limits, where it breaks, what depends on the reader's situation (CLAUDE.md "Editorial Voice"). Describe common practice; never tell a reader what to do with their money.
2. **Engaging, and plain enough for someone new to money.** Explain or replace financial terms (APR, median, percentile, real return) in everyday words. Open on a person or a number that matters, not a definition.
3. **Every number and source checked twice.** Recompute each worked example and check every figure against its cited source and against the blog post. If the blog post is wrong or out of date, correct the blog in the same pass, not only the kit.
4. **Codex as the visual partner.** Codex reviews layout, slide design, reel staging and readability, not only the text. Either side can correct the other; the kit ships with one agreed result, and the disagreements and how they were settled are noted in the PR.

**Blog lessons: Optimizing and Inclusive Finances (set Oct 21, 2026).** Every lesson at these two levels, already published or still to be written, follows the content rules above and these. The markup and evidence are in `blog-content-plan.md` Rule 10; the build enforces the checkable parts (`src/utils/layeredLessons.ts`) and fails on any lesson at these levels that does not meet them. Every lesson at both levels was converted by Oct 22, 2026, in stacked PRs in publish order (#207 to #216), so there is no backlog; a new lesson must pass from the start. Decision #44.
1. **Three reading depths.** A TL;DR of two or three short plain bullets that answers the question, at most 25 words each and with no glossary term from any lesson (`src/utils/tldrRules.ts` checks this at build time; a term stays only if no plain wording works and an earlier lesson defines it, listed as an exception); an "In this lesson" list whose every line links to the section that delivers it, ending with a link to the lesson's FAQ (the lesson's only index, on every screen; there is no sidebar, a jump lands with the heading clear of the sticky header, and once the list scrolls away a button reopens it with the part being read marked); a main path of roughly 3 to 5 minutes; evidence, country notes and edge cases folded into `lesson-depth` expanders, never the answer itself and never a caveat a skimmer needs. Total reading time stays at 14 minutes or less (Oct 3 cap). Since Nov 2, 2026 (#277), the TL;DR rule applies to every lesson at every level.
2. **A glossary card.** The lesson's terms go in frontmatter; the template shows them as a "Glossary" card at the top (pills, folded definitions, "All terms"). Link a term's first use in the body to its card entry (`[term](#term-slug)`) instead of defining it again in bold; on the page that link becomes the term itself, with a small question mark beside it and its definition on hover or keyboard focus (desktop) or tap (phones), so the reader never jumps away (owner, Oct 25, 2026). The build fails if a body link names a term the lesson does not define. Every term also appears on `/blog/glossary/`, which is in every language and linked from the Learn menu, the footer and the learning path. Lessons that share a term spell it the same way.
3. **Headings that name the point.** Avoid repeated counting formulas ("Three questions...", "Part one", "Adjustment two") and the shared closing skeleton ("Cross-continent notes", "Getting started") that make sections sound alike. Every heading names its section's distinct idea; a necessary sequence may use "Step" when order matters, as long as the rest of the heading states the point. A useful count can live in the sentence below a heading. Sections that say the same thing twice are merged.
4. **One title, in the reader's words.** The page title uses the words a reader would type for their situation, and a `seoTitle` (57 characters or fewer) may only shorten it, never change its promise (the build checks the words). The `description`, at least one heading and a few FAQ questions use the same search words. Titles and headings name what the reader can do or protect without hiding the consequence; an Inclusive Finances title names its audience first, in their own words (`blog-content-plan.md` Rule 11). A published `slug` never changes.
5. **Reference, don't repeat** (agreed Oct 2, 2026). A concept an earlier lesson explained gets a one-line link back ("the [post on X](/blog/x/) covered this"), and the words go to what is new. Lessons that make the same point are merged.
6. **Quick checks where they help.** Up to two questions a reader can answer from the section above, inviting them to try before opening the answer; never used to hide a caveat.
7. **The closing hands the judgment back:** a question about the reader's own situation, not a generic to-do list.
8. **Beneficiary forms are not a sure fix.** Where a lesson names a beneficiary form as a fix, it says the form may be binding or, for a pension scheme, only a guide for its trustees, and, where relevant, that a survivor pension can follow different rules from a lump sum. Where the lesson turns on whether a pension scheme is bound by its form, it links to inc-1's "Is a pension beneficiary form binding?".
9. **The lesson's Instagram kit still matches.** Everything a scheduled kit promises stays on the page.
10. **Council and checks.** Each conversion passes the three-member council (CLAUDE.md), is rendered on phone and laptop in light and dark mode, and needs no privacy entry or translation unless it changes analytics, storage, shared copy or site behaviour.

Agreed, not yet applied (try them case by case): the lesson's key figure near the top, with the reel's number in the TL;DR where it fits; a named persona opening the lesson; figures that replace paragraphs, where the figure fits a phone's first view without a sideways swipe; reels and story links landing on the matching section of the lesson. Waiting on results: the five-reader test of old against new inc-1, the control-lesson review and a PostHog scroll-depth check. None of them has run yet; they gate the rest of the layered format (the linked index, the glossary card, the folds) for Discovery, Building and Psychology.

---

## 1. Target Audience

**Primary: global expats — from anywhere, living anywhere, except North America.**

- Europeans (EU residents) are the **largest single segment** because content is priced in €, references EU cities, and covers EU-relevant credit/tax/savings structures. But the audience is global, not EU-only.
- Global expat communities outside North America: Middle East (Dubai, Abu Dhabi, Doha), APAC (Singapore, Bangkok, KL, Hong Kong), Australia/NZ, LATAM, Africa.
- Indian audiences are a natural fit for the `nidhi` brand handshake (the word itself is Indian-origin) — one advantage among several, not the positioning centerpiece. Don't over-index on India-specific framing in content or keywords.

**Explicitly avoid:**
- US / Canada targeting — no US-focused hashtags, no `#americanexpat`, no US-specific credit (FICO) / tax (IRA, 401k, Roth) / retirement content.
- Framing that makes the account feel like a single-country publication (EU-only, India-only).

**Language:** English, with a money context that's EU-dominant (€, EU examples) but cosmopolitan — expat hubs globally (Lisbon, Berlin, Helsinki, Bangkok, Dubai, Singapore) rotate in as examples.

Open question for the owner: is "global expats" the Instagram audience only? The lessons are written for the anxious newcomer to money (`blog-content-plan.md`), the global pass widened every lesson beyond the EU, and the site is in five languages.

---

## 2. Posting Schedule

### 2.1 Current format: reels only (since Oct 29, 2026)

Owner, Oct 29, 2026 (`action-plan-nov-2026.md` log): no carousels; the carousel files stay in the kits but are not rendered or posted. Each blog post gets one to three days with one reel a day, rendered with `render-kit --reels-only` (§10). Reels follow the light rules (25 to 35 s, at most 5 beats) and `REELS-PIPELINE.md` §1e and §1f. When day 2 continues day 1's question, the days are linked as Part 1 and Part 2 and the reel chips read "<TOPIC> · PART 1/2" (`REELS-PIPELINE.md` §1e). The two-day, two-angle structure it replaced (Decision #42) is archived in [done/PLAYBOOK.md](done/PLAYBOOK.md); the Oct 2026 angle audit of the Optimizing run is [done/instagram-two-angle-audit.md](done/instagram-two-angle-audit.md).

**Weekly rhythm.** Three blog posts a week, Monday to Saturday, one reel a day. The blog post publishes on its day 1.

| | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|
| Blog post | A | | B | | C | |
| Reel | A day 1 | A day 2 | B day 1 | B day 2 | C day 1 | C day 2 |

**Slots (set Oct 29, 2026; winter IST times keep the European clock time).** Everything goes to Instagram and Facebook.

| Piece | Day 1 | Day 2 |
|---|---|---|
| Reel (on Facebook with Share to Facebook Story) | 12:15 IST (07:45 CET) | 08:45 IST |
| Reel shared to the Instagram story, by the owner | when the reel is live | when the reel is live |
| Tool card story | 18:00 IST | 14:15 IST |
| "Beyond this post" story with the lesson link (Instagram link sticker, Facebook swipe up link) | | 19:00 IST |

The lesson must be live before its day 1 reel: the Apps Script trigger (`scripts/deploy-trigger.gs`, #276) asks for the deploy at about 11:00 IST, with the scheduled cron as the backstop.

**What every reel carries:**
- **A tool you keep.** One named rule of thumb, checklist or test the reader can use on their own numbers, as the reel's screenshot moment and on the tool card story.
- **A recurring cast.** Followers should meet the same few people across posts. Where the blog post's worked example already names someone (Petra, Jiri and Marcus appear in the blog), use them; otherwise use Eva, the "Eva-type" primary reader from `blog-content-plan.md`, as post 43 does. Do not invent a new character per post, and check names don't collide with another post's character.
- **Shown working.** Every chart is computed from stated inputs and labelled illustrative, with its assumptions on the frame. Ranges over single numbers. No "you should".
- **A maker's mark, not a plug.** nidhi is described as being built, never as available, and the line points to the free tools, which are live (decided Oct 1, 2026). Captions end on "Made by the person building nidhi, a planner that shows its assumptions. No ads, no data selling. Free tools you can use today, link in bio." The reel end card carries "nidhi, a planner in the making · free tools live today". No ask is attached to either.

**When a post or story shows a free tool** (rules from the Sunday tool posts, still in force):
- **The privacy fact, exactly:** calculations run in your browser and the numbers you type are not sent anywhere. Never "no data leaves your browser": the pages fetch exchange rates and count anonymous pageviews.
- **The tools are live, the planner is not.** Say "free tools at nidhi.today", never "nidhi now does" anything. No ask beyond save; the link is stated as a fact, never as "try it".

**Sub-articles** (posts that extend a parent post, such as inc-7a and inc-7b under the unmarried couples post) publish on the blog in the days after their parent and get no run of their own.

**First hour (added Oct 2, 2026).** Instagram tests a post on a small first audience and reads rates among real viewers (watch time, sends, saves). Every posting sheet ends each day with a checklist: story share the moment the reel is live, send it to 3 to 5 real people it would help, reply to every comment within the hour. No engagement from your own other accounts (it is discounted at best and treated as inauthentic at worst); if any happens, it is logged in the sheet so it can be subtracted from the metrics. Trial reels are not available on the account yet (checked Oct 2, 2026).

**Chip and series signal.** Kits keep the series chip in their frontmatter (`Money, Compounding` for Optimizing, `Money, For You and Me` for Inclusive Finances, which is its own theme with its own profile Highlight); the reel itself shows its topic chip, with "· PART 1" or "· PART 2" when the days are linked. Each inclusive post still ships interleaved, directly after its host, and opens from the assumption the host post makes. Every series keeps a Highlight so the profile works as a library.

**Sundays (owner, Nov 4, 2026).** From Nov 8, each Sunday carries two silent text reels: one Belief (next: Beliefs 3) and one volunteering (the translator call). Nov 8 gets a new volunteering reel and story; later Sundays alternate reposting that reel and that story. Lesson runs pause on Sunday: the next lesson starts the day after the previous lesson's last reel, with no fixed weekday grid ("let the days decide the dates"). The remaining Sunday kits (Beliefs 3 to 7 and the tool posts in `docs/instagram-kit/`) are carousels, so each Belief needs a reel built from its kit; building waits for the owner's review of the reel decisions (`action-plan-nov-2026.md`, log, Nov 4).

### 2.2 Who posts what (decided Oct 14, 2026)

Posting is split by what can be scheduled ahead and what has to happen live:

| Piece | Who | How |
|---|---|---|
| Reels | Claude | Scheduled ahead in Meta Business Suite through Claude in Chrome, on Instagram and Facebook (Share to Facebook Story on Facebook), at the slots in §2.1, with caption, hashtags, keywords block, cover and alt text from the kit |
| Stories at post time (sharing the reel to the Instagram story the moment it goes live) | The account owner | Posted live in the Instagram app, since a share of a post can only be made once the post exists |
| Every other story frame | Claude | Scheduled ahead in Business Suite as the rendered PNG, with whatever Business Suite can attach (link, text) added in the scheduler |

**What Business Suite cannot do is not in the kit.** A kit only asks for what its scheduler can actually place. Before the first scheduling session, check in Business Suite which story features scheduling supports (link sticker, text, poll sticker, mentions) and record the result here. Anything it cannot schedule is designed out: words go into the rendered PNG instead of a typed overlay, and a frame that only works with an unsupported sticker (the self-assessment poll in §7 and the day 2 poll result that depends on it) is redesigned or dropped, never left as a manual step.

**Capability check (scheduling sessions Oct 29 to Nov 2, 2026):** link sticker: yes on Instagram stories, and a swipe up link on Facebook stories; poll sticker: not needed, polls are designed out of the reels only kits; text overlay and mentions: not checked, so words go into the rendered PNG.

### 2.3 Series 1 to 3 slots (record)

How Discovery, Building and Psychology were scheduled: one feed post per blog post, Tuesday to Thursday. The holiday rules below still apply to the reels only run; Sundays follow §2.1.

### Primary slot — `14:30 CET · Tue / Wed / Thu`
- EU afternoon scroll (end of lunch, early afternoon)
- India peak evening (19:00 IST)
- Leaves 6–7 hours for the 4-frame story cascade before EU late night

### Secondary slot — `08:00 CET · Tue / Thu`
- EU morning commute
- India lunch scroll (12:30 IST)
- Used for morning-energy content (e.g. Cash Flow, Budgeting)

### Story cascade timing

| Step | 14:30 CET post | 08:00 CET post |
|---|---|---|
| 1 — Hook | 14:30 | 08:00 |
| 2 — Poll sticker on stat PNG | 16:00 | 12:30 |
| 3 — Link sticker on stat or answer PNG | 18:00 | 17:00 |
| 4 — Save/Tag CTA | 20:30 | 19:30 |

### Holidays
- **Don't skip** minor public holidays (Labour Day, Ascension, national days). Shift post by 1–2h later — people scroll later on day-offs.
- **Skip entirely:** Christmas Eve/Day, New Year's Eve/Day, Easter Sunday, Diwali, Eid.
- **Post normally** on Black Friday / shopping days (content has relevance).

### Sundays
- Sunday 18:00 to 20:00 CET ("Sunday scaries") is a strong save-rate window for financial content; try it only as a deliberate timing test, so the Sunday results stay comparable.
- A Sunday without a feed post can be story-only (reshare, polls, a "Sunday reset" prompt).

---

## 3. Hashtag Strategy

### Rules
- **Max 5 hashtags per post.** IG deprioritizes more than 5.
- **No repeats** across consecutive posts — IG treats it as hashtag stuffing. The brand tag `#nidhi` is the only allowed exception (single-tag brand handshake doesn't count as stuffing in 2026 IG signals).
- **Composition:** 1 topic tag (medium-large) + 2 niche/community + 1 geo/audience + 1 branded `#nidhi`
- **Placement:** in caption body, separated by 3–5 line breaks from visible caption. NOT in first comment (IG weights caption hashtags higher).
- **Keywords in first 125 chars of caption** matter more than hashtags now — IG topic classifier reads there.
- **Hashtags are evaluated at the account level, not just the post level.** IG's classifier rolls hashtag history into an account-level audience graph. Repeating an audience-narrowing identity tag across multiple posts shapes who IG considers the *whole account* to be for — and that classification then governs which non-followers see *every subsequent post*, regardless of that post's own tags. See "Account-level cohort hygiene" below.

### Anchor tags by axis
| Axis | Tags |
|---|---|
| Europe core | `#fireeurope`, `#expatfinance`, `#personalfinanceeurope` |
| Expat / relocation | `#expatlife`, `#movingabroad` |
| Topic niches | `#liquidityrisk`, `#emergencyfundeurope`, `#savingvsinvesting`, `#creditscore`, `#zerobasedbudget`, `#firemath`, `#paycheckplanning`, etc. |
| Brand | `#nidhi` (always include) |

### Account-level cohort hygiene

The audience defined in §1 is *global expats ex-North America*, with EU as the largest single segment but the audience itself is intentionally broad. Any hashtag that narrows to a single national/cultural cohort — even when the topic is universal — pulls IG's account-level classifier toward that cohort and shrinks the non-follower reach pool for *every future post* until the signal is reversed (typically 3–4 posts of consistent counter-signal).

The failure mode is most acute when an audience-narrowing tag co-exists with the multilingual keyword block (§6). The hashtag tells IG "ship to cohort A," the keyword block tells IG "ship to cohort B" (a multilingual EU cohort). When IG's recs engine can't resolve a clear primary cohort, it defaults to "show to existing followers only" rather than guess — exactly the symptom that surfaces as a sudden non-follower-reach drop.

Recovery rule: ship 3–4 consecutive posts with no audience-narrowing identity tags before evaluating reach. IG re-classifies on a rolling window; one clean post does not reverse five anchored ones.

### Avoid

**Saturated / low-quality:**
- `#personalfinance` — 30M+ posts, saturated
- `#financialliteracy` — 6M+, same issue
- `#moneytips`, `#wealthbuilding`, `#financialfreedom` — vague, attract bots not followers

**Wrong audience:**
- Any `#...us`, `#americanexpat`, `#personalfinanceus` — wrong audience per §1

**Audience-narrowing identity tags (avoid as defaults; use only when the post is genuinely about that specific cohort, e.g. a remittance / NRI / dual-tax post):**
- `#desifinance`, `#indiansineurope`, `#indianfinance` — over-anchor the account-level classifier to South-Asian / Indian-diaspora cohort. Directly contradicts §1 ("don't over-index on India-specific framing"). The brand handshake `#nidhi` already carries the Indian-origin signal without needing a community tag — these add narrowing on top of an already-positioned brand. Most damaging when stacked with the multilingual EU keyword block (§6) because the two surfaces signal opposite cohorts and IG defaults to follower-only delivery (see "Account-level cohort hygiene").

**Dead / content-farm-associated compound tags (May 2026 update):**
- `#moneyineurope` — small, mostly dormant; not a real follow-able community
- `#inflationawareness` — same; "awareness"-suffix tags rarely have active scrolling communities
- `#costoflivingcomparison` — long compound tag heavily used by content-farm accounts, guilt by association on IG's quality signal

If a topic genuinely fits one of these, choose a stronger niche (`#fireeurope`, `#purchasingpower`, `#movingabroad`) or a topic-specific tag instead.

---

## 4. Engagement Philosophy

**No manual engagement.** No "first 5 replies get feedback", no "DM me for X", no "reply and I'll share mine" prompts.

### Approved CTA patterns
- **Save** — "Save this for..." / "Save this before..."
- **Tag** — "Tag someone who..." / "Tag a friend considering..."
- **Share** — "Share with anyone who..."
- **Polls / quizzes / sliders** — self-contained, Instagram handles the interaction

### Rejected patterns
- "Comment X and I'll DM you Y" (requires manual DM work)
- "First N replies get feedback" (requires reply management)
- Question stickers expecting replies ("AMA" format)
- "Reply and I'll share mine" prompts

### Future option
- **ManyChat auto-responder** can run "comment X → auto-DM link" flows with zero ongoing effort. ~30 min setup. Worth revisiting if growth stalls after ~6 posts.

---

## 5. Carousel Structure

Archived: see [done/PLAYBOOK.md](done/PLAYBOOK.md#5-carousel-structure) (no carousels since Oct 29, 2026).

---

## 6. Caption Structure

### Opening (first 125 chars)
- Topic keyword included (for IG topic classifier)
- Hook/tension, not summary
- Break at natural pauses

### Body
- Short paragraphs
- Pattern-interrupt + tension + payoff, not article rehash

### CTAs (near end)
- 2–3 save / tag / share prompts
- Full post → link in bio
- **Never put outbound links in caption body** — IG suppresses posts with them

### Hashtags
- Final 5, on their own lines, separated from visible caption by 3–5 dots/line breaks

### Keywords block (after hashtags)

Instagram now indexes a bracketed keyword block placed **after** the hashtags. It feeds the topic classifier and surfaces the post in keyword search across languages — without counting toward the 5-hashtag cap and without looking like hashtag stuffing.

**Hashtags and keywords cover different ground.** Hashtags are a community/browse surface — users follow `#expatlife`, scroll `#fireeurope`, and IG places posts in those feeds. Keywords feed the search-query index — users type `50 30 20 rule` or `finanzielle freiheit` into IG search and IG matches the post. The two surfaces overlap in IG's topic classifier, but the reach mechanisms differ enough that using them for **the same terms is waste**. Split the work:

- **Hashtags** → single-word compound community tags (`#purchasingpower`, `#indiansineurope`, `#fireeurope`). English-dominant. Community membership, not search.
- **Keywords** → natural search phrases (`50 30 20 rule`, `compound interest`, `digital nomad`), multilingual terms, long-tail queries. Search-facing, not community-facing.

Rule of thumb when picking hashtags: pick the community someone *follows*. When picking keywords: pick the phrase someone *types*. If a term works as both, put it in the hashtag (tags are scarcer — make them count); use the keyword slot for something the hashtag can't carry (a multi-word phrase, a non-English term, or a niche long-tail).

**Rules:**
- **Placement:** after the final hashtag line, separated by one blank line. Last element of the caption.
- **Format:** a **single** square-bracketed array, comma-separated, lowercase where natural. Wrap to ~60 char lines for readability.
- **One array per post, not per language.** Every language's keywords get merged into the same bracket, then deduplicated on exact string match. IG's search index treats each comma-separated token as a keyword regardless of language — splitting into per-language blocks adds no reach and wastes caption characters.
- **Caption body stays English.** Only the keyword array goes multilingual.
- **Per-post, topic-grounded.** Keywords are sourced from the corresponding blog post (topic terms, slug, TLDR) plus a stable audience/geo base. Avoid generic filler.
- **Languages covered in the merged array:**
  EN · DE · FR · ES · IT · PT · NL · CS · PL · SV · NO · DA
- **Deduplicate on exact match.** When a word is identical across multiple languages (e.g. `euro`, `budget`, `Europa`, `inflation`), include it once — not once per language.
- **No language labels, no flags, no section breaks.** Native-word recognition is enough; labels add clutter and don't help IG search.
- **No hashtag symbols inside the brackets.** Keywords, not tags.
- **Overlap with hashtags is fine** — brackets are a separate search surface. Don't duplicate verbatim when a synonym works (e.g. hashtag `#fireeurope` → keyword `financial independence europe`).
- **No city-name stacks above 3 in one block, and never mix continents.** Listing 4+ cities in a row (`lisbon, berlin, helsinki, bangkok, dubai, singapore`) is the signature pattern IG's spam-detection layer was tuned against in Q1 2026 — it reads as geo-SEO bait and demotes the post out of non-follower recommendations. Mixing EU and Asia/ME cities (`berlin … bangkok`) compounds the problem because the topic classifier reads two different geographic cohorts from the same block and can't resolve which cohort to ship the post to. If a post genuinely covers multiple expat hubs, name 1–2 in the keyword block and let the caption body carry the rest as examples; the caption body is not subject to the same spam pattern.

**Sweet spot: 18–24 keywords per post, lean tighter over looser.** More than ~30 triggers IG's spam/low-quality filters; below ~15 leaves reach on the table. Creator benchmarks (Later, Metricool, IG partner reports 2024–2025) peak in the 10–25 range. Above 60 keywords, posts get flagged out of the "recommended to non-followers" surface.

**Reels parity (added May 2026).** The same keyword surface applies to IG Reels: the topic classifier reads the Reels caption identically to feed posts. Kit reels take their keywords from the kit (`keywords_day1`, `keywords_day2`), and the kit lint (`scripts/render-kit.mjs`) enforces 18 to 24 per day. Per-reel audience-angle notes from the earlier series are in [done/IG-KEYWORDS.md](done/IG-KEYWORDS.md).

Open question for the owner: how many keywords a reel caption carries. This section said 13 to 18 for reels (May 2026), and `REELS-PIPELINE.md` says the same for its LLM route; the kit lint enforces 18 to 24, and the current reels follow the lint.

**TikTok equivalent (added May 2026).** TikTok 2026 weights caption text + on-screen text + audio transcript with roughly equal weight; bracketed multilingual blocks read as spam there, and TikTok auto-translates so multilingual stuffing wastes characters. The TikTok-equivalent of the keyword block has two parts:

1. **`caption.tiktokTopics`** — 3–5 natural-language English search-query phrases, rendered as a single `Topics: phrase1, phrase2, phrase3` line above the hashtag wave. Phrases mirror how someone types into TikTok Search (which hit ~50% of Gen Z product searches by 2025). Stay grounded in the post's actual content; never byte-equal to an `instagramKeywords` entry — rephrase as a natural search query.
2. **`caption.tiktokExtraTags`** — 0–3 niche TikTok-native hashtags (`#moneytok`, `#financetok`, `#financialeducation`, `#expatlifehacks`, `#europemoney`) appended to the TikTok caption ONLY (IG enforces the 5-cap; TikTok tolerates 5–7). Banned: `#fyp`, `#foryou`, `#foryoupage` (saturated, flagged).

**Searchability test.** Every keyword must be a term a real person would type into IG's search bar. Check each one against: "would anyone actually search this, in this language?" If no, drop it. Weak candidates that fail the test: `money` (too generic, nobody searches it alone), `europe` (not a finance search — it's a continent), `finance` alone (better: `personal finance`), generic renderings of cognates like `Geld` or `pengar` that are never used as standalone search queries. Strong candidates that pass: `personal finance`, `privatekonomi`, `finanse osobiste`, `finanzielle freiheit`, `épargne`, `FIRE`, `index funds`, `zero-based budgeting`, `emergency fund`, `köpkraft`, `savings rate`.

**Vary the audience segment per post.** Don't anchor every post to the same cluster of keywords — that makes IG show every post to the same audience slice and stalls growth. Each post should lean toward a **distinct sub-audience**:

| Post type | Lean audience angle (examples) |
|---|---|
| Cash flow / subscription leaks | millennials/gen-z adulting, money-leak hunters, subscription-audit crowd |
| Purchasing power / inflation | older risk-averse savers, inflation-worried, conservative savers |
| Cost of living / relocation | digital nomads, relocators, geoarbitrage, expat movers |
| Saving vs. investing | FIRE / financial independence, first-time investors, long-term planners |
| Budgeting | young professionals, debt-conscious, 50/30/20 seekers |
| Credit scores | first-time borrowers, mortgage seekers, cross-border movers |
| Insurance | parents, homeowners, relocators, risk-aware expats |
| Milestones / series | beginner finance, money literacy seekers, "basics of money" browsers |

Audience anchors (`global expats`, `expat life`, `expat finance`) can repeat — but the topic- and lifestyle-flavored keywords should rotate so IG's classifier reads each post as a different offering.

**Composition target for ~22 tokens:**
- 4–6 **topic concepts** — sourced from the blog post body, slug, and TLDR. Render each in EN + the 2–3 highest-reach languages where the word is **meaningfully different** from English (DE, FR, ES, sometimes IT/NL). Skip the translation if it's identical or near-identical (`inflation`, `budget`, `euro` already cover most European search).
- 2–3 **audience concepts** — `global expats`, `expat life`, `expat finance`, `moving abroad` where relevant. English dominates in this search space; don't translate.
- 2–3 **geo concepts** — `europe` is the stable default (largest segment). Add expat-hub specifics (`lisbon`, `berlin`, `helsinki`, `bangkok`, `dubai`, `singapore`) only when the post references them or the topic is relocation/cost-of-living. **Don't anchor on `india`** unless the post is genuinely about Indian diaspora finance (remittances, NRI context, etc.) — over-indexing narrows reach toward one country when the audience is global ex-North America.
- 1–2 **money anchors** — `personal finance` + one localized form like `privatøkonomi` or `finanza personale` to reach Nordic/Italian searchers who don't default to English.

**Which translations earn their slot:** only include a non-English form when (a) it's the word a native speaker would type into search, and (b) it's not already visually identical to the English form. Five renderings of "money" in five languages wastes characters nobody searches for.

**Example** (post 09 Income vs. Wealth, ~22-token target):

```
[ salary, income, wealth, savings rate, lifestyle
inflation, personal finance, finance, global expats,
expat life, expat finance, europe, money, savings,
Gehalt, Vermögen, Einkommen, salaire, patrimoine,
revenu, patrimonio, ingresos, finanza personale,
privatøkonomi ]
```

Breakdown: 5 topic concepts (salary/income/wealth/savings rate/lifestyle inflation), 3 audience (global expats, expat life, expat finance), 1 geo (europe), 2 money anchors (personal finance, finance), plus localized forms for the highest-differentiating terms in the top-reach languages. Total: ~23 keywords.

**Format template for the caption tail:**

```
#topic1 #topic2 #audience1 #geo1 #nidhi

[ concept1, concept1_de, concept1_fr, concept2, ... ]
```

**Per-post audience angle + tuning rationale:** [done/IG-KEYWORDS.md](done/IG-KEYWORDS.md) is the staging ground and rationale reference. The final hashtag line and keyword array for each post live in the post file's `## Caption` section (canonical once drafted); the reference doc carries the per-post audience angle and any deliberate inclusion/exclusion notes that don't survive into the caption (e.g. "no brokerage names", country-vs-global hashtag trade-offs). Use it when planning a new series and during rewrites or consistency reviews. Organized by series — Series 2 "Money in Action" = Building level (posts 17–32, all drafted); future sections appended as Series 3 / Mastery posts land.

### May 2026 algo notes (keyword surface specifics)

The keyword block was new and lenient when IG launched it in 2025. By Q1 2026 the spam-detection layer matured and the recommendations engine started using the block as a primary input for the non-follower surfaces. Three behaviors govern reach:

- **"Inspired by your interest in [topic]" surface** broadened in March 2026 to be the dominant non-follower discovery card in the home feed. Eligibility requires a clean single-topic classification — when the keyword block sprays across multiple unrelated topics, or fights the hashtag line, the post is excluded from this surface entirely. Posts with strong cohort signal can see 3–5× the non-follower reach of posts that miss the surface; posts that fight themselves see ~0.
- **Language-cohort match is enforced more strictly than 2025.** A post with 8+ languages in the keyword block needs a clear primary-language signal somewhere — caption body in English (the default) is the standard signal. Don't put 8 equally-weighted non-English keywords with no EN dominance; lead with EN concepts, follow with 2–3 high-volume EU languages (DE/FR/ES/IT), tail with 1–2 niche (PL/SV/NL). The order inside the bracket is not strictly weighted by IG, but the *count distribution* across languages is — keep EN ≥ any single non-EN language.
- **Cohort-fight failure mode** (the most common 2026 break): when the hashtag line targets one audience cohort (e.g. `#desifinance` → South-Asian) and the keyword block targets another (multilingual EU search terms), IG's recs engine can't resolve the primary cohort and defaults to "show to existing followers only" rather than guess. Symptom: sudden non-follower-reach drop after introducing the multilingual block, even though the block itself is well-formed. Fix: align the hashtag line and keyword block on the same audience cohort. See §3 "Account-level cohort hygiene" for the recovery cadence.

---

## 7. Story Structure

The current story set is in §2.1 (reel share, tool card story, "beyond this post" story with the lesson link). The earlier cascades are archived: see [done/PLAYBOOK.md](done/PLAYBOOK.md#7-story-structure).

---

## 8. Typography & Voice Rules

### No dashes of any kind anywhere (Series 2 onwards)
- **No em dashes (`—`), en dashes (`–`), hyphens (`-`), or double hyphens (`--`).** All four are out. Use commas, colons, semicolons, periods, or restructure the sentence.
- The renderer's smart-typography pass does not generate any of them; whatever appears in output came from source markdown.
- House style for what each was doing:
  - **Em dash** → comma, colon, period, or restructure. Em dashes lump text together visually and read as filler.
  - **En dash** for numeric ranges (`25–34`) → use the word `to` (`years 25 to 34`, `1980 to 2024`, `from 5% to 7%`).
  - **Hyphen for compound modifiers** (`long-term`, `tax-advantaged`, `20-year`, `cross-border`) → drop the hyphen if the result reads naturally (`long term`, `20 year horizon`), or restructure (`with tax advantages`, `across borders`).
  - **Hyphen as filler** (` - ` between phrases) → comma or period.
- Math symbols are not dashes and are allowed: minus sign in negative numbers (`-43%`), arrows (`→`, `←`), comparison (`<`, `>`).
- Applies to **slide bodies, captions, story text, frontmatter fields, and per-slide field values**. Every surface that ships in a post.
- Pre-existing em dashes in Series 1 (Discovery) frontmatter and captions are grandfathered for those posts. Anything authored from Building (post 17) onwards has zero dashes of any kind.

### Curly quotes and real apostrophes
- The renderer auto-converts straight `"..."` to curly quotes and straight `'` to curly apostrophe in carousel slide text. Authors don't need to type curly quotes manually; just write naturally and the smart-typography pass handles it.

### Drop unnecessary periods in stories
- Stories: drop trailing periods on standalone lines
- Captions (prose): periods OK where sentences demand them
- Keep: decimal points (€4.50), apostrophes, question marks, commas doing structural work

### Line breaks in stories
- YAML block scalar `|` for multi-line values
- **Blank lines inside block scalar** for rhythm / breathing room
- `||` convenience marker works anywhere in value (single-line quoted strings too)
- Multiple blank lines are preserved (not collapsed). `||||` = 2 blank lines, etc.

### Slide 1 hooks (Series 2 onwards)
- Layout dispatched as `hook`. Asymmetric headline; one bolded teal accent word maximum; optional one-line `sub:` underneath in muted ink.
- Short, minimal periods, no dashes of any kind, question marks earn their place.
- Auto-shrink scales the headline to fit the safe zone; trust the layout, don't pre-shrink the copy.

**Problem first, relatability sells.** The hook's job is to make a reader who is living the problem feel seen, then make them curious enough to read on. Rules:
- **Name the problem, not the topic.** Open on the reader's lived situation, not the concept's name. "Counting on retiring at 65? That date is mostly a guess." beats "What is financial independence?" The reader who recognises their own situation keeps reading.
- **Direct address.** Speak to one person in their own words ("Saving hard but for 'someday'?", "Haven't touched your portfolio in years?"). A relatable call-out outperforms an abstract statement.
- **Open the curiosity gap, never close it.** Pose the problem and hint that something is off, but withhold the solution direction. The hook makes a promise the carousel pays off.
- **Avoid "not X, but Y" reframes in the hook.** They leak the answer and kill curiosity. Keep the resolution for the body slides.
- **Vary the rhythm across the series** so consecutive posts don't open with an identical template (e.g. "Counting on... / Want... / Taking out... / Sure... / Earn... / Only check...").

---

## 9. Destination Strategy

**No PDFs.** Everything long-form lives on the blog at nidhi.today.

### Why
- PDFs leak attention off-platform with no return path
- Blog builds SEO authority that compounds; PDFs don't
- Blog updates propagate; PDFs freeze on send
- Email capture happens on blog, not inside PDFs
- Every blog visit = chance to surface Nidhi (app/tool) later

### Link targeting
- All "learn more" / "full post" links → specific blog article for that post
- Exception: the Sunday free tools posts (now archived, see [done/PLAYBOOK.md](done/PLAYBOOK.md)) linked to the tool page itself, since the tool is the thing being shown
- Open question for the owner: what the Instagram bio link opens. This section said it swaps daily to the day's post; the beta plan (now [done/beta-reward.md](done/beta-reward.md)) said the bio points to `/beta/`; what it opened on any given date is not recorded.

---

## 10. Tool Chain

### Commands
```bash
npm run render-ig                                       # all posts
npm run render-ig "1. discovery/07-liquidity.md"        # single post
```

One command. Generates both carousel slides (1080×1080) and story frames (1080×1920) in a single pass with a shared browser instance.

### Optimizing onwards: the post kit

Standalone feed posts that are not tied to a blog post (the Beliefs series) use the same renderer with `type: standalone` in the kit frontmatter: one `## Day 1 (carousel)` deck (a single slide is a single image), no reel, no brief, plus `## Stories`. Beliefs 1 is the reference, at `docs/instagram-kit/beliefs/01-built-from-frustration.md`, using the data-driven `sheet` (spreadsheet) layout.

From post 43, each blog post has one kit source file, `docs/instagram-kit/<level>/<NN-slug>.md`. It holds a `## Brief` (person, situation, what the blog withholds), then per day a `## Day N (angle)`, `## Day N (reel)` and `## Day N (carousel)`, then `## Stories`. Next to it sit one reel plan per day: `<NN-slug>.reel.json` for day 1 and `<NN-slug>.day2.reel.json` for day 2. Post 43 is the reference kit.

```bash
# Carousels, story frames, captions and the posting sheet for both days (lints first)
node scripts/render-kit.mjs "4. optimizing/43-financial-projections.md"

# Reels: copy each plan into output/plans/<level>/ first, then render
cp "docs/instagram-kit/4. optimizing/43-financial-projections.reel.json" output/plans/optimizing/43-financial-projections.json
cp "docs/instagram-kit/4. optimizing/43-financial-projections.day2.reel.json" output/plans/optimizing/43-financial-projections-day2.json
node scripts/render-reels.mjs financial-projections --level optimizing --from-plan                # day 1
node scripts/render-reels.mjs financial-projections --level optimizing --from-plan --angle day2   # day 2
```

Since Oct 29, 2026, kits are rendered reels only: `node scripts/render-kit.mjs "<level>/<kit>.md" --reels-only` writes the reels only posting sheet (reel and tool card story on Instagram and Facebook, day 2 "beyond this post" with its link on both, the reel share to Stories as the one manual step) and skips the carousel, poll and poll result renders. It does not copy the reel plans into `output/plans/`: copy them as above before `render-reels --from-plan`. A kit may have a reels only day 3 (a reel plus the tool card story). A lesson that runs one day (50b, 50c) has a one day kit: its day 1 has a reel and a `## Day 1 (story)` tool card instead of a carousel, plus the reel share, tool card and "beyond this post" stories on the same day.

Run with `/usr/local/bin` first on `PATH` so the reel renderer finds `edge-tts`. The kit lint fails on: anything other than two days (or three with a reels only day 3), a missing reel plan, more than 5 hashtags or no `#nidhi`, banned hashtags, a hashtag repeated across the two days, fewer than 18 or more than 24 keywords, any dash or hyphen, more than 8 slides, no `tool` slide, and a closer with more than one ask or no `read:` line.

Output lands in `output/instagram-kit/<level>/<NN-slug>/` (`day1/carousel/`, `day2/carousel/`, `stories/`, `posting-sheet.txt`) and, for reels, in `output/videos/<level>/`, `output/thumbnails/<level>/` and `output/captions/<level>/`. The posting sheet lists every file, caption, hashtag line and story frame for both days in posting order.

### Files
| Path | Purpose |
|---|---|
| `scripts/render-ig.js` | Orchestrator; calls both renderers per post |
| `scripts/render-slides.js` | Carousel renderer (Series 2 cream editorial template, 6 layout variants, smart-typography pass, blog pointer auto-derivation). Exports `renderSlides`. |
| `scripts/render-stories.js` | Story renderer (exports `renderStoriesForPost`). Threads `series:` / `category:` from post frontmatter through every frame as the eyebrow chip text; legacy posts that lack those fields render no chip. |
| `scripts/slide-template.html` | Carousel template (1080×1080). Series 2 cream editorial system. CSS-driven layout dispatch via `data-layout="hook|prose|stat|list|comparison|closer"`. |
| `scripts/story-template.html` | Story template (1080×1920). Series 2 cream editorial system, palette and chrome shared with the carousel template. CSS-driven variant dispatch via `class="story story-{hook|stat|poll|answer|cta}"`. |
| `scripts/lib/parse-markdown.js` | Frontmatter + content parser. Supports YAML block scalar, `\|\|` convenience, inline `## Slide N (layout)` directive, and per-slide field-block extraction (`eyebrow:`, `hero:`, `caption:`, `note:`, `sub:`, `title:`, `next:`, `save:`, `share:`, `follow:`, `read:`, `source:`). |

### Output
```
output/instagram/{subdir}/{slug}/
├── slide-01.png … slide-NN.png           # carousel
└── stories/
    ├── frame-1-hook.png                  # opt-in fallback. Only emits when post sets story_render_hook_png: true (milestone teasers, beta launches). Default frame 1 is a tap-to-post share + story_hook as overlay text in IG composer
    ├── frame-2-poll.png                  # active. Brand-chrome canvas under the poll sticker (if story_poll_q set)
    ├── frame-4-extra.png                 # active. Designed bonus content frame paired with link sticker (if story_blog_extra set)
    │                                     # (frame 3 is a manual tap-to-post share of carousel slide #story_insight_slide; no PNG)
    │
    ├── frame-2-stat.png                  # legacy (Series 1) — story_stat
    ├── frame-2-answer.png                # legacy (Series 1) — story_answer (quiz mode)
    ├── frame-3-cta.png                   # legacy (Series 1) — story_prompt (save/tag/share frame)
    │
    ├── day2-frame-1-hook.png             # milestone posts only (if story_day2_hook defined)
    ├── day2-frame-2-poll.png             # same rules as Day 1, day2- prefix
    ├── day2-frame-4-extra.png
    │
    ├── day2-frame-2-stat.png             # legacy day2 fallbacks
    ├── day2-frame-2-answer.png
    └── day2-frame-3-cta.png
```

Stories auto-skip frames whose source field is absent. The `story_poll_*` fields stay in frontmatter as reference content to type into the native IG poll sticker when posting. Quiz stickers are no longer supported by IG — `story_quiz_*` fields are legacy and ignored. `story_day2_*` fields (milestone posts only) drive a parallel Day 2 cascade using the `day2-` filename prefix.

---

## 11. Frontmatter Schema

```yaml
---
title: "Post title"
blog_url: "https://nidhi.today/blog/slug"
hashtags: "#a #b #c #d #nidhi"
post_time: "14:30 CET (Tue/Wed/Thu) — reasoning"

# Series 2 onwards. Eyebrow chip rendered top-left on every non-hook slide.
# Skip both fields on Series 1 posts (legacy format ignores them).
category: "Money in Action"                  # fallback chip text
series: "Money in Action · 4 of 16"          # preferred chip text (used when set)
byline: "@nidhi.today"                       # optional; not currently rendered, reserved

# Story content — 4-frame cascade. Two frames are manual shares + overlay
# text in IG composer (announce, insight); two are rendered PNGs (poll
# backdrop, blog extra). See §7 for the full cascade.
#
# Frame 1 — Announce: tap-to-post share of carousel + story_hook overlay
story_hook: |
  Short overlay line one
  Short overlay line two
#
# Frame 2 — Poll: brand-chrome canvas under the native IG poll sticker
story_poll_q: "Self-assessment question (asks the viewer about their own situation)"
story_poll_opts: "Option A | Option B | Option C | Option D"   # up to 4 options
#
# Frame 3 — Insight: tap-to-post share of carousel slide N + overlay text
story_insight_slide: 4                  # which carousel slide to re-share
story_insight: "Short overlay text emphasising the key takeaway"
#
# Frame 4 — Beyond: designed PNG with content the carousel didn't cover,
# paired with the link sticker pointing to the blog
story_blog_extra: |
  Stat, scenario, or counter-intuitive line from the blog post
  that the carousel intentionally didn't include.

# Tiny captions for IG native caption field (paste into IG when posting)
story_caption_announce: "..."   # frame 1
story_caption_poll: "..."       # frame 2
story_caption_insight: "..."    # frame 3
story_caption_extra: "..."      # frame 4

story_hashtag: "#one-story-tag"   # frame 1 only, hashtag sticker

# Opt-in: emit frame-1-hook.png as a standalone PNG. Default cascade does
# NOT emit a frame 1 PNG (story_hook is overlay text typed in IG composer).
# Set true only for milestone teasers / beta launches / posts that ship
# before the carousel. Default false.
story_render_hook_png: false

# DEPRECATED fields (Series 1 only; renderer still parses for back-compat).
# New posts (Series 2 onwards) must NOT set these:
#   story_stat    → emitted frame-2-stat.png; replaced by frame-3 shared-slide
#   story_answer  → emitted frame-2-answer.png quiz reveal; pattern retired
#   story_prompt  → emitted frame-3-cta.png "save this" frame; retired

# Optional — milestone posts only. Parallel Day 2 cascade rendered with the
# day2- filename prefix in the same stories/ directory.
story_day2_hook: |
  Day 2 announce overlay text
story_day2_poll_q: "..."
story_day2_poll_opts: "A | B | C | D"
story_day2_insight_slide: 7
story_day2_insight: "Day 2 insight overlay"
story_day2_blog_extra: "Day 2 blog-extra body"
story_day2_hashtag: "#day2-tag"   # optional; falls back to story_hashtag
story_day2_caption_announce: "..."
story_day2_caption_poll: "..."
story_day2_caption_insight: "..."
story_day2_caption_extra: "..."
---
```

### Parser features
- Simple `key: "value"` format (single-line)
- YAML block scalar `key: |` (preserves newlines)
- YAML folded scalar `key: >` (folds wrapped lines to spaces)
- `#` comment lines inside frontmatter are ignored
- `||` in any value is expanded to `\n\n` (one blank line) at render time

### Per-slide authoring (Series 2 onwards)

Each slide block uses an inline layout directive in the header. Body is free-form markdown; structured layouts (`stat`, `closer`, sometimes `list`/`prose`/`comparison`) read additional `key: value` lines from the slide block as fields.

```markdown
## Slide 1 (hook)

"I don't know where my **money** went"

sub: The most expensive sentence in personal finance. A budget fixes it in under an hour.

---

## Slide 3 (stat)

label: The first method, in three numbers
hero: 50 / 30 / 20
caption: Needs · Wants · Save & repay
note: On €2,500 net → €1,250 needs · €750 wants · €500 saved.

---

## Slide 4 (comparison)

title: Pick the method that matches how you think

**Zero-based**

Every euro gets a job before payday.
Income − planned spending = 0.

===

**Pay-yourself-first**

Auto-transfer savings & investments first.
Whatever's left is yours to spend.

---

## Slide 7 (prose)

title: The bottom line

A budget does not restrict your freedom. It creates it.

source: Eurostat 2024. 36% of EU adults aged 25 to 34 cannot cover an unexpected €1,000 expense from savings.

---

## Slide 8 (closer)

kicker: Pick a method by Sunday. Start Monday.
next: Up next: Credit scores, decoded
save: this for your next paycheck review
share: with someone still budgeting in their head
follow: @nidhi.today for posts 15 & 16
```

**Field key vocabulary:**

| Key | Used by | Renders as |
|---|---|---|
| `eyebrow` | non-title layouts | small caps eyebrow above body (when not consumed as title) |
| `title` | prose, list, comparison | bold heading above body |
| `label` | stat | small label above the hero number |
| `hero` | stat | giant number/phrase, auto-fits to one line at full canvas width |
| `caption` | stat | bold one-line caption beneath the hero |
| `note` | stat | smaller supporting paragraph beneath the caption |
| `sub` | hook | muted subhead beneath the headline |
| `kicker` | closer | bold anchor line at top of the closer |
| `next` | closer | small teal pill: "Up next: …" |
| `save` / `share` / `follow` | closer | row text in the CTA ladder |
| `read` | closer | override for the auto-derived blog pointer (rare; default is auto from `blog_url`) |
| `source` | any non-closer | citation rendered with `SOURCE` eyebrow; auto-pairs with a `READ` blog nudge when `blog_url` is set |

**Comparison column separator:** `===` on its own line. Do not use `---` inside a slide body; that's the slide-block terminator and would split the slide in two.

**Legacy directives** (`>>`, `>>>`, `!!`, `———`): not used in Series 2; the renderer silently strips them if present, so old markdown does not crash. Series 2 markdown should never contain them.

---

## 12. Decisions Log

Chronological log of decisions made during playbook development. Update as you iterate.

The active table covers what currently governs the playbook. Decisions that were tried, learned from, and superseded live in §12.1 (Archive). Numbers in the archive are not reused, so cross-references in commit messages, blog drafts, and external notes still resolve.

| # | Decision | Rationale |
|---|---|---|
| 1 | Target audience = EU + expats + Indians (non-US) | Matches product positioning + available content angles |
| 2 | 14:30 CET primary, 08:00 CET secondary | Maximum overlap of EU + India peak windows; enables same-day story cascade |
| 3 | 5 hashtags max, no repeats, niche over broad | IG cap + saturation on big tags; small accounts rank on niche |
| 4 | No manual-engagement CTAs | Founder time constraint; save/tag mechanics grow without it |
| 5 | Series badge moved from Slide 1 to final slide | Slide 1 badges hurt reach from non-followers ("you missed content") |
| 6 | Blog is destination, no PDFs | SEO compounds; PDFs are dead ends |
| 7 | Native IG stickers own poll/quiz questions | One source of truth, searchable, cleaner UX; PNG is brand backdrop |
| 8 | Single `npm run render-ig` command | One target per user preference |
| 9 | YAML block scalar + `\|\|` convenience | Readable source, explicit rhythm control |
| 10 | Per-line `<div>` rendering (not `<br/>`) | `<br/>` collapse in Chromium; `<div>` gives reliable blank-line gaps |
| 11 | Story captions defined per frame in frontmatter | Reduces post-day cognitive load; 30 sec paste per frame |
| 12 | Reduce em dashes + unnecessary periods in stories | Story format is visual, not prose; rhythm beats grammar |
| 13 | Stronger Slide 1 hooks for posts 8, 9, 11, 12, 14, 15, 16 | Original openings were soft; carousel reach depends on first 3 seconds |
| 14 | Final slide format: position badge + next-up tease + follow CTA | Clean close, sets up the next post, drives follows |
| 15 | Drop quiz stickers; use multi-option polls (up to 4) instead | IG quietly removed quiz stickers from story composition; multi-option polls cover the "which of these" use case at the platform level. Note: how we *use* polls evolved further in #38 (self-assessment only, no quiz framing), but the underlying platform observation stays |
| 16 | Quiz-as-poll + answer-reveal pattern via `story_answer` (SUPERSEDED — see Archive) | — |
| 17 | One stat backdrop for both poll + link frames (SUPERSEDED — see Archive) | — |
| 18 | Quiz-mode blank poll + combined answer/stat frame (SUPERSEDED — see Archive) | — |
| 19 | Quiz-mode `story_stat` must advance from the answer (SUPERSEDED — see Archive) | — |
| 20 | "ANSWER" eyebrow type bump to 48px (SUPERSEDED — see Archive) | — |
| 21 | Add optional Day 2 cascade via `story_day2_*` frontmatter fields and `day2-` filename prefix | Milestone posts (16b, series launches, beta reveals) already ran a documented 2-day campaign per playbook §2, but only Day 1 frames were actually rendered as PNGs — Day 2 frames lived in prose and had to be composed manually on post day. That inconsistency meant Day 2 either launched under-branded or got silently dropped. Fix: parallel `story_day2_*` fields mirror the Day 1 shape, renderer emits `day2-frame-*.png` into the same stories dir. Default behavior unchanged for non-milestone posts (no day2 fields → no extra PNGs) |
| 22 | Bracketed multilingual keyword array after hashtags, caption body stays English | IG's 2026 update added a post-hashtag keyword surface that feeds the topic classifier and powers multilingual search indexing without triggering hashtag-stuffing penalties. Full multilingual *captions* would balloon post length past the 2,200-char limit and dilute the English voice; a compact deduplicated keyword array covering EN + DE + FR + ES + IT + PT + NL + CS + PL + SV + NO + DA gets most of the non-English reach for a fraction of the effort. Keywords are sourced per-post from the corresponding blog article (topic terms) plus a stable audience/geo base, so each array stays grounded in what the post is actually about |
| 23 | 18–24 keywords per post (not 100+), translate only when the word is meaningfully different | First pass generated ~120 tokens per post (every concept in every language). That overshoots the sweet spot documented in creator benchmarks (Later, Metricool, IG partner data 2024–2025 → peak performance at 10–25 keywords; reach drops above ~30; >60 triggers the "recommended to non-followers" spam filter). Fix: 4–6 topic concepts + 2–3 audience + 2–3 geo + 1–2 anchors = ~22 keywords. Translate a concept only when the native word is (a) meaningfully different from English and (b) a plausible search query in that language. Skip `inflation`, `budget`, `euro`-class cognates — they already cover cross-lingual search |
| 24 | Keyword searchability test + per-post audience variation | Round 2 revealed two more traps. (a) Including a keyword "because the concept exists" doesn't help — if no one searches it, it's just caption clutter that dilutes the array. Rule: every keyword must pass the "would anyone actually type this into IG search, in this language?" test. Cognate renderings like `Geld`, `pengar`, `dinero` fail — they're too generic to be search queries on their own. (b) Using the same keyword cluster on every post anchors the account to a single audience slice and stalls growth. Rule: each post leans toward a distinct sub-audience (FIRE crowd on investing, relocators on cost-of-living, parents on insurance, etc.) so IG's classifier reads each post as a different offering and widens the reach graph |
| 25 | Hashtags and keywords split: community vs. search, no overlap | Verified IG's two surfaces work differently: hashtags = community/browse (users follow `#expatlife`), keywords = search-index (users type `geoarbitrage`). Using the same term on both surfaces pays twice for the same reach. Split the work: hashtags stay English-dominant, pick communities someone follows; keywords carry multilingual load + long-tail phrases someone would type. When a term fits both surfaces, put it in the hashtag (5-slot cap makes tags more scarce) and spend the keyword slot on something tags can't carry |
| 26 | Meme & comic policy: carousels-only, opt-in by series, never on Slide 1, MiFID-safe directive applies (§13) | Question raised whether memes (xkcd, popular-media reactions) would lift engagement on the blog and from the next IG series onwards. Reframed against the brand voice ("Money, understood" — closer to authority than relatability), the global ex-North America audience (US sitcom references don't carry; AI-generated memes flagged as low-effort in 2026), and the MiFID II posture the rest of the content already holds. Conclusion: memes are a sharpening tool, not a default ingredient. Carousel only (stories stay brand-chrome consistent), max 1 per carousel, never on Slide 1 (same low-effort signal that pushed the series badge off Slide 1 in #5). Cadence varies by series: ~0% Discovery, ~25% Building/Optimizing/Mastery, ~70% Psychology (highest leverage — the topic *is* memes), 0% on stress/fear-state posts (Debt, Insurance, Loan Terms, Real Estate, beta launch). Source priority: xkcd → screenshot/POV formats → globally legible movie stills. Hard avoids: 2020-2023 templates, AI-generated, US-only cultural references, Bollywood-default. **MiFID-safe directive promoted to top-level subsection of §13:** no named instruments / tickers / coins / brokerages, no return forecasts presented as fact (any number in a meme requires an inline "illustrative + assumptions" disclaimer visible *inside the image* because slides circulate standalone on IG), no jurisdiction-locked tax math, no advice phrasing, no before/after performance of real products, no screenshots of brokerage / exchange UIs, no product-vs-product comparisons. Behavioural and conceptual zone only. Pre-publish checklist (7 items) attached. A/B test threshold: 15%+ lift on saves or sends after ~6 paired posts, otherwise drop. Blog-side mirror in `blog-content-plan.md` Editorial Rule 8 with same directive |
| 27 | Reframe: memes removed from blog posts and educational carousels entirely; live as a separate IG-only stream (quote cards + Reels) | Decision #26's policy attempted to embed memes inside educational carousels with a per-series cadence and a MiFID-safe checklist. In practice the constraint stack (MiFID-clean, audience-globalized, no AI, no 2020-2023 templates, slot inside an authority-voice teaching arc) squeezed real memes out and produced illustrated comics pretending to be memes. Sight-unseen archive scans of supplementary sources (SMBC) couldn't validate panel-level fit through automated tooling. The locked 5-post Building cohort (#21, #23, #24, #25, #30) was demonstrably 4 educational comics + 1 real meme (xkcd #927), which is the wrong return on production effort. **Reframe:** decouple memes from the educational surface. Carousels stay clean information design (diagrams, charts, key-number heroes); blog posts ship without memes (Editorial Rule 8 rewritten to "no memes in post bodies"); memes live as standalone IG content in two formats — **quote cards** (single-image standalone posts of sharp Nidhi lines, 2x/week, ~5 min production each, KPI: 2x carousel saves/sends per post) and **Reels** (10-15s text-on-background video, 1 per Building post during the June 2026 pilot, KPI: 3x reach or 1.5x new followers vs. matched-period carousels). The original 5-post locked cohort dissolves: those visuals become Reels source material, not carousel slides. xkcd #927 stays planned for #23 as a blog post HTML embed (not as a carousel slide). MiFID-safe directive remains binding on every image asset that includes financial numbers, regardless of which stream it ships in. **Source-priority cleanup:** added Dilbert to the off-limits list (Scott Adams' post-2023 reputation makes any Dilbert reference a brand-association risk regardless of strip vintage). AI-generated images allowed for layout ideation only, never as final assets. SMBC scan deferred — Weinersmith licensing not verified, and the strategic case for chasing more third-party sources is weak now that the standalone IG stream is the right surface for memes |
| 28 | Blog figure language: clean conceptual SVG diagrams as a distinct visual surface inside blog post bodies, designed to avoid math-anxiety triggers for the Eva-type primary audience | Decision #27 left a gap: it ruled memes out of carousels and blog bodies and named the carousel as the "clean information design" surface, but didn't specify what *blog* figures should look like. The infrastructure audit confirmed greenfield — `public/images/blog/` empty, no `<figure>` styles in `BlogPost.astro`, no MDX, no chart library, `heroImage` schema field declared but never rendered. **Direction:** figures are inline SVG inside markdown, wrapped in `<figure><svg/><figcaption/></figure>`, brand-styled via reusable CSS classes (`.fig-title`, `.fig-fill-blue`, etc.) added once to `BlogPost.astro`. Astro markdown passes raw HTML through unchanged, so no MDX migration and no asset pipeline. SVG via CSS custom properties = automatic dark-mode parity with no per-figure work. **Audience-anxiety constraint shaped design language:** Eva-type readers treat dense data charts (axes, gridlines, 7-row data series) as homework — exactly the wrong response. Figures use conceptual shapes (boxes, ladders, spectra, before/after pairs, shape-only line drawings) over data charts; ≤4 numbers per figure, in service of a single comparison the post has already led the reader to; no gridlines, no decimals; one short italic caption only. **Initial cohort (May 2026):** nine figures across eight Building posts establish the grammar — risk-return spectrum (#17), free-lunch wave cancellation (#20), xkcd #927 + 5-pattern functional map (#23), silent drift (#24), four FIRE flavors (#25), passive-to-active spectrum (#26), home asset/liability duality (#28), wish vs. plan (#30). Two figures replaced math-heavy candidates: FIRE savings-rate curve and #30 cost-of-delay bars were both rejected as math-anxiety triggers and replaced with conceptual versions of the same insight (4-flavors lineup; wish-vs-plan typographic). **Cross-stream reuse:** #20, #24, #25, #30 figures double as Reels source material per §13 — blog SVG is the design source of truth; the Reel adds motion and audio over the same scaffold. **MiFID-safe directive applies to every figure with numbers** (illustrative tag in-image or in caption, no named instruments, no jurisdiction-locked tax math) — same rule as IG image content. **Skipped scope:** posts #21 (Getting Started, table-heavy already) and #29 (Currencies, decorative not conceptual) deliberately excluded; #23 priority ladder considered but skipped (prose ordering already covers it). Editorial Rule 9 added to `blog-content-plan.md` codifying the figure language and the pre-publish checklist; PLAYBOOK §13 amended to cross-reference the figure stream as a third visual surface alongside carousels and the meme/Reels stream |
| 29 | Figure cohort cut from 9 to 5 on a stricter "what does the figure show that prose cannot" test; surviving figures redesigned around data-anchored shapes; figure CSS moved out of scoped `<style>` into `src/styles/global.css` after a silent rendering bug | First-pass review of the nine-figure cohort surfaced that four were decorative restatements of prose the reader had already absorbed (#23 5-pattern map, #26 passive-to-active spectrum, #28 home asset/liability duality, #30 wish-vs-plan) — they failed the "shape, trajectory, or crossing the prose can't carry" bar that Editorial Rule 9 was supposed to enforce. Cuts taken; xkcd #927 retained on #23 as the only kept image. Four remaining figures redesigned with data-anchored math (Python-verified coordinates before placement): #17 split into per-horizon return-range bars showing the loss tail collapsing as horizon grows; #20 plotted the post's own worked-example table as three line series with the portfolio line perfectly flat; #24 became a single-curve silent-drift trajectory with rising dot opacity; #25 became the literal crossover moment (flat dashed expense line meeting a rising teal income curve at a marked point). **Rendering-pipeline lesson:** initial implementation put figure CSS in `BlogPost.astro`'s component `<style>` block. The figures rendered visibly broken (polylines invisible, fills defaulted to black, dark mode unreadable) because Astro adds a `[data-astro-cid-*]` qualifier to every selector in a scoped block, and markdown-slotted SVG nodes never receive that attribute — so the rules silently fail to match. The DOM looked correct in `curl` output (classes present, structure intact); only a screenshot would have caught the bug. **Fix:** all `.prose figure`, `.prose figcaption`, and `.fig-*` rules moved to `src/styles/global.css` (which is unscoped and already houses the rest of `.prose`). `BlogPost.astro` retains a one-line comment pointing at the global file so the next maintainer doesn't repeat the mistake. **Process amendments:** (a) figures with quantitative shapes get coordinate math verified in Python before SVG placement; (b) "rendered correctly" verification means a screenshot, never just a `curl` of the DOM; (c) Editorial Rule 9 amended with the rendering-pipeline note. **Updated cohort (May 2026):** five figures total — #17 time narrows the range, #20 two volatile companies one steady portfolio, #23 xkcd #927, #24 silent drift, #25 the crossover point. Four of the five (excluding #23) double as canonical "hero" frames for the corresponding Reels concept in §13's Format 2 stream |
| 30 | Drop South-Asian community tags (`#desifinance`, `#indiansineurope`, `#indianfinance`) from default rotation; brand handshake `#nidhi` carries the Indian-origin signal alone (May 2026) | Discovery posts 11 and 12 dropped sharply on the non-follower-recommendations surface after the multilingual keyword block was introduced. Diagnosis: `#desifinance` was running on 5 of 7 Discovery posts (11, 13, 14, 16, 16b), training IG's account-level classifier to file the account as a South-Asian-finance creator. Once the multilingual EU keyword block landed on top of that anchor, every post sent two non-overlapping cohort signals — South-Asian (hashtag) vs. multilingual EU (keywords). IG's recs engine, faced with a cohort it can't resolve, defaults to "show to existing followers only" rather than guess. Direct violation of §1's "don't over-index on India-specific framing" — the brand handshake `#nidhi` already carries the Indian-origin signal without needing a community tag layered on top. **Fix applied to 13–16b:** dropped `#desifinance` everywhere; replaced with topic- and audience-axis tags consistent with the global-expat positioning (`#firemath`, `#paycheckplanning`, `#movingabroad`, `#expatinsurance`, `#beginnerfinance`). South-Asian tags remain available for posts genuinely about that audience (remittances, NRI tax, dual-currency families) — not as defaults. **Recovery cadence:** 3–4 consecutive clean posts before evaluating reach; one clean post does not reverse five anchored ones |
| 31 | Geo-keyword stuffing rule: no city-name stacks above 3 in one keyword block; never mix continents | Discovery post 12 carried `lisbon, berlin, helsinki, bangkok, dubai, singapore` — six cities mixing EU and Asia/ME. IG's spam-detection layer matured between Q4 2025 and Q1 2026, and city-name stacks (>3 cities, especially mixed continents) are now a signature pattern flagged as geo-SEO bait and demoted from non-follower recommendations. The continent-mix compounds it: the topic classifier reads "EU expat content" from the caption (Helsinki/Berlin/Lisbon examples) but "Asia nomad content" from `bangkok, dubai, singapore`, forcing the same cohort-confusion failure mode as #30. **Rule:** ≤2 cities in the keyword block, kept on one continent; if a post genuinely spans multiple expat hubs, name 1–2 in the block and let the caption body carry the rest as examples (caption body is not subject to this spam pattern). **Side rule:** drop dead/content-farm-associated compound tags from §3 anchor table — `#moneyineurope`, `#inflationawareness`, `#costoflivingcomparison` are slot waste at best and quality-signal drag at worst |
| 32 | May 2026 algo notes added to §6: Inspired-by-your-interest surface, language-cohort-match strictness, cohort-fight failure mode | The keyword block's role inside IG changed enough between launch (2025, lenient) and Q1 2026 to warrant explicit documentation in the playbook rather than tribal knowledge. Three behaviors now govern non-follower reach: (a) the "Inspired by your interest in [topic]" home-feed card broadened in March 2026 and dominates non-follower discovery — eligibility requires single-topic classification, posts that fight themselves are excluded entirely; (b) language-cohort match enforced more strictly — a post with 8+ languages needs a clear primary-language signal (English caption body, EN ≥ any single non-EN language in keyword count); (c) cohort-fight is now the most common 2026 break, where hashtag and keyword block target non-overlapping audiences and IG defaults to follower-only delivery. Documented in §6 as a standalone subsection so the next post-author doesn't have to re-discover it from a reach drop. Cross-references §3 "Account-level cohort hygiene" for the recovery cadence |
| 33 | Carousel design overhaul: cream editorial template, 6 layout variants, 8-slide cap, no em-dashes globally, blog pointer pattern, source/trust signal slot. Authoring switches from `>>` directives to inline `## Slide N (layout)` plus per-slide field blocks. **Series 2 onwards (Building, post 17+) only. Series 1 finishes in original format** (May 2026) | Audit of the original Series 1 carousels surfaced systemic mechanical-feel issues: (a) layout monotony (every slide centered text on the same diagonal blue-to-teal gradient), (b) inverted hierarchy (the `**bold** = teal + 1.15em` rule made setup text louder than punchlines on hooks), (c) uniform teal middle-slide titles by slide 3 reading as noise rather than headings, (d) 12-slide cap working against 2026 IG completion-rate weighting (sweet spot 6 to 8), (e) bottom bar over-branded (full URL printed every slide), (f) gradient itself dated against May 2026 finance-IG editorial palettes (Money with Katie, Tori Dunlap, FT Money), (g) no trust-signal slot anywhere, (h) closer was a text wall ("Follow @nidhi.today for post N"), the weakest possible CTA. **Fix:** new template at `scripts/slide-template.html` runs cream paper (`#FAF7F2`) with brand navy (`#002171`) ink and brand teal (`#00897B`) reserved for one intentional accent per slide; 8-slide cap; six CSS-driven layout variants dispatched via `data-layout`; eyebrow chip top-left (sourced from `series:`/`category:` frontmatter) replaces top accent stripe; progress dots replace the `1/12` counter; `@nidhi.today` handle bottom-right (visible on hook + closer, muted on middle slides) replaces the per-slide URL print. Authors pick one of `hook | prose | stat | list | comparison | closer` per slide via inline `## Slide N (layout)` directive in the markdown header; structured layouts read additional `key: value` lines as fields (`hero:`, `caption:`, `note:`, `kicker:`, `next:`, `save:`, `share:`, `follow:`, `read:`, `source:`, etc.). Em-dash conversion removed from the renderer's smart-typography pass entirely; house style now bans em-dashes globally (slides, captions, story text, frontmatter). Trust-signal slot (`source:` field) renders a `SOURCE` citation under any non-closer slide, and when paired with `blog_url` auto-generates a secondary `READ Full breakdown on nidhi.today/blog/<slug> (link in bio)` line beneath the citation. Closer redesigned as a 4-row CTA ladder leading with `READ` (primary blog pointer, auto-derived from `blog_url`) followed by `SAVE / SHARE / FOLLOW`, with an "Up next" pill above the ladder. Reference rewrite: `14-budgeting` from 12 slides to 8, demonstrates each layout in service of one piece of content; preserved as the Series 2 design spec under git history. Old `>>` / `>>>` / `———` directives are silently stripped by the renderer if encountered in legacy markdown, but Series 2 markdown should never contain them. See §5.1 for the full spec, §11 for the per-slide field vocabulary, §8 for typography rules |
| 34 | Hold the redesign for the Series 1 to Series 2 boundary; do not switch mid-Discovery. **Series 1 (Discovery, posts 1 to 16b) finishes on the original dark-gradient template; Series 2 (Building, post 17+) launches on the new cream editorial template from day one.** The redesigned `14-budgeting` carousel is a design spec, not a publication asset (May 2026) | Three options on the table when the new template was ready: (a) re-render unshipped Discovery posts (14, 15, 16, 16b) on the new template and ship them out, (b) keep original format through Discovery 16b and launch the redesign at the next series boundary, (c) ship the redesigned `14-budgeting` standalone as a "preview." Chose (b). Reasoning: grid coherence is the strongest argument. When a follower taps the profile they see a 9-grid; mixing two visual systems mid-series reads as "couldn't decide" rather than "evolved," and the seam disrupts the whole grid not just one post. Marginal upside on 4 posts is small (slightly higher saves and completion rate) and does not outweigh the cost of grid disruption + the lost relaunch beat. Series boundary is the strongest relaunch moment a small account gets: "Discovery wraps. Building begins. New look. Same voice." gives existing followers a reason to pay attention and lapsed followers a reason to re-engage; mid-series redesign with no announcement gets none of that. **Action:** original Series 1 markdown (pre-rewrite) was preserved in git for posts 13 to 16b and is the version that ships; original Series 1 PNG renderings are already produced and on hand for the remaining drops; the new renderer + template + parser changes stay in the repo as Series 2 assets. Series 2 (Building, post 17+) is authored from scratch on the new system; every post starts in the layout dispatch from day one, never as a retrofit. Series 1 to Series 2 transition gets 1 to 2 stories teasing the visual shift before the first Building post drops |
| 35 | Story template (`scripts/story-template.html`) redesigned alongside the carousel template for Series 2 visual parity; same cream/editorial palette, fonts, and chrome conventions as the feed (May 2026) | The carousel-only redesign in #33 left a known mismatch: a Series 2 post's feed slides would render cream/editorial while its 4-frame story cascade would still ship in the legacy dark-gradient look. On a single profile that mismatch reads as two brands sharing one handle. **Fix:** ported the cream system end-to-end. New `story-template.html` uses `#FAF7F2` paper, `#002171` ink, `#00897B` accent, Inter + Roboto type, and the same eyebrow-chip + bottom-handle-and-hashtag chrome as feed slides — sized up for the 1080×1920 canvas and offset by IG's safe zones (~220px top, ~320px bottom). All five frame variants (`hook`, `stat`, `poll`, `answer`, `cta`) restyled in place; the renderer's frontmatter contract (`story_*` and `story_day2_*` fields) is unchanged, so no authoring migration is required. `render-stories.js` now threads the post's `series:` (or `category:`) value through every frame as the eyebrow chip text, with empty-string fallback so legacy Series 1 posts that lack those fields render no chip rather than crashing. **Decision rationale:** an alternative was to ship Series 2 launch with mismatched stories and redesign later. Rejected: stories pull ~4× the views of the carousel (per §7), so they're the higher-impact surface to keep on-brand; deferring leaves the most-viewed format on the old visual system precisely when the relaunch beat is asking the audience to notice the new look. Cost was small (~one session of work, no data model changes), so parity wins. Series 1 stories already on hand are not re-rendered — the redesign applies only Series 2 onwards |
| 36 | Retire the quiz-as-poll + answer-reveal pattern. Self-assessment polls only. Decisions #16, #18, #19, #20 superseded (May 2026) | Quiz-as-poll asked a trivia-style question with one "correct" option inside a poll sticker, then revealed the answer one frame later. Without IG's native quiz sticker's right/wrong feedback, the pattern read as a survey followed by an answer key, with extra production overhead (advance-from-answer rule, dedicated reveal frame, ANSWER eyebrow tuning). Self-assessment polls ask the viewer about their own situation ("how many months of expenses do you have saved?"), collapse the cascade into one coherent beat, produce more honest engagement (no "right answer" pressure), and hand off cleanly to the blog. Renderer keeps `story_answer` handling for back-compat with Series 1 posts already shipped (08/10/13/14/16). Folded into the broader cascade redesign in #38 |
| 37 | Frame 1 is a tap-to-post share + overlay text, not a custom-rendered PNG. `story_hook` repurposed as overlay text typed into IG's composer (May 2026) | Practical observation: in production, the first story in nearly every cascade is the freshly-dropped feed post itself shared via IG's tap-to-post sticker, with a one-line text overlay on top. The pre-rendered hook PNG was unused most of the time because (a) tapping the shared-post sticker routes the viewer straight back to the carousel and preserves the swipe arc — a custom PNG is a third version of the same headline competing with Slide 1, (b) the share+overlay pattern costs ~30 seconds in IG composer vs. designing and re-rendering a hook frame that's strictly worse than the carousel's own slide 1. `story_hook` semantics updated to overlay text (2 to 4 short lines, big-text friendly). Renderer still emits `frame-1-hook.png` as a legacy fallback for posts that need a standalone first frame (milestone teasers, beta launches, posts that ship before the carousel). Folded into #38 |
| 38 | Story cascade redesign: 4 frames, 2 manual shares + 2 rendered PNGs, no CTA frame, no save-on-stories ask. Decisions #11, #17, #36, #37 incorporated; CTA frame retired (May 2026) | The previous cascade (frame-1-hook.png, frame-2-stat.png, frame-3-cta.png) had three problems: (a) `frame-2-stat.png` was a designed-from-scratch image that competed with carousel slides already designed for the same content, (b) `frame-3-cta.png` carried "save this for your next paycheck review"-style CTAs but story viewers can't save stories the way they save feed posts — that ask was always dead text, (c) the cascade did not route a tap path to the long-form blog with the right shape (the link sticker fired on step 3 under a generic stat, not on a frame carrying genuinely new content). **New cascade (4 frames over ~6h):** (1) Announce — tap-to-post share of the carousel + `story_hook` typed as overlay (per #37), (2) Engage — `frame-2-poll.png` brand-chrome canvas under the native poll sticker, self-assessment only (per #36), (3) Insight — tap-to-post share of carousel slide #`story_insight_slide` + `story_insight` typed as overlay, (4) Beyond — `frame-4-extra.png` carrying genuinely new blog content (a stat, scenario, citation the carousel didn't include) paired with the link sticker into the blog. Reuses what's already designed (frames 1 and 3 are carousel re-shares); only renders PNGs that carry NEW content (the bare poll backdrop and the blog extra). **What changed:** `render-stories.js` cascade rewritten; new `story-extra` variant added to `story-template.html` ("BEYOND THIS POST" eyebrow + "Read on blog · link below" footer); `parse-markdown.js` parses new fields `story_insight_slide`, `story_insight`, `story_blog_extra` plus `story_day2_*` mirrors. **Deprecated fields kept parsable** for Series 1 posts: `story_stat`, `story_answer`, `story_prompt`. **Caption keys renamed:** `story_caption_hook/poll/stat/cta` → `story_caption_announce/poll/insight/extra`. **Posts 17-24 audited and reauthored** on the new shape from day one |

| 39 | Frame-1-hook.png is opt-in only; default cascade emits exactly 2 PNGs (May 2026) | Decision #38 retired the custom frame-1 PNG by intent ("default cascade does NOT emit a PNG for frame 1") but left the renderer hardcoded to emit `frame-1-hook.png` whenever `story_hook` was set. Result on first Series 2 render (post 17): three PNGs in the stories dir (frame-1-hook, frame-2-poll, frame-4-extra) when the playbook spec was two. Either the renderer matched the spec, or the spec was wrong. The spec was right: frame 1 is a tap-to-post share of the carousel feed post with `story_hook` typed as overlay text in IG composer. The PNG is unused except for milestone teasers / beta launches / pre-carousel ships. **Fix:** added `story_render_hook_png` boolean frontmatter flag (default false). Renderer skips `frame-1-hook.png` unless explicitly opted in. `parse-markdown.js` parses the flag for both Day 1 and Day 2 cascades. PLAYBOOK §7 cascade table, §10 output diagram, §11 frontmatter schema all updated. Default Series 2 post now produces exactly 2 story PNGs (poll + extra) plus 8 carousel slides |
| 40 | Strict no-dash typography: no em dashes, en dashes, hyphens, or double hyphens anywhere in carousel or story posts (May 2026) | Decision #33 retired em dashes globally for Series 2; #28's blog figure rule kept en dashes for numeric ranges (`25–34`). On Series 2 first render the policy was inconsistent across surfaces (post 17 carousel slide 4 had `−43% → +2%` with the ASCII minus reading visually similar to a hyphen, frontmatter `post_time` carried an em dash, source line had `post-1926` and `non-US` hyphens). The reader doesn't know which dash is which; visually they all blur together and the cream/editorial template's tight type makes hyphenated compound modifiers look like dropped en dashes. **Rule:** four characters out everywhere (slides, captions, story text, frontmatter, per-slide field values): `—` em dash, `–` en dash, `-` hyphen, `--` double hyphen. Use `to` for ranges (`years 25 to 34`, `1980 to 2024`). Drop hyphens from compound modifiers (`long term`, `20 year horizon`, `tax advantaged`) when readable; restructure when not (`with tax advantages`, `over the long term`). Math symbols stay in: minus sign in negative numbers, arrows (`→`, `←`), comparison operators. Series 1 grandfathered. PLAYBOOK §8 rewritten. Audit pass against post 17 surfaced ~12 hyphens to remove |
| 41 | Reels are a tension-arc Remotion pipeline, not a CapCut text-on-background pilot. Building reels: story-driven, cold hooks, blog `figure` mid-reel, `flow` diagram resolution in the back third, 3-way hook A/B. §13 Format 2 rewritten to point at `REELS-PIPELINE.md` as source of truth (June 2026) | #27 framed Reels as a lightweight humor stream ("10-15s text-on-background, CapCut, ~30-60 min, no voice"). The pipeline that actually shipped is materially different and §13 had drifted into being misleading: an automated build-time system (`scripts/render-reels.mjs`) reads the full blog body, an LLM authors a plan with 3 hook variants and 6-15 beats, a hard brand-rule scrubber gates it (56 unit tests), edge-tts narrates (en-GB-RyanNeural), and Remotion renders a 45-85s 9:16 reel with kinetic typography and karaoke captions. **Two new visual primitives** added this session: a `figure` beat anchor that reuses the post's own blog SVG (rasterised by `npm run render-figures` — same design source of truth as Editorial Rule 9), and a `flow` anchor rendering a 3-to-5 step "how it works" diagram (scrubber rules: 3-5 steps, horizontal caps at 3 nodes, ≤1 outcome node). **Editorial direction for Building reels:** story-driven not framework-driven, using a tension arc — open on a problem the viewer is *in* (second person), build the cost, land the `figure` mid-reel as "why this matters," withhold the `flow` step diagram until the back third as the resolution, close on the opener's image. **Cold-hook rule:** no spoken/on-screen copy may assume the viewer has seen earlier posts ("after the basics", "rest of the series" banned); the on-screen SeriesChip carries the series signal silently. **Concrete blog reason:** a post's `reelPromise` frontmatter names the specific thing the blog adds (worked example, side-by-side table, rule of thumb) and drives both the CTA READ row and the caption's "Read the full post" line; must be backed by content actually in the post. **Hook A/B made genuine end-to-end:** `--variants-all` emits 3 distinct mp4s plus 3 captions that each open with that variant's spoken hook (`leadHookText`/`replaceFirstLine` in `render-platform-caption.mjs`); `--from-plan` loads the base plan and selects the hook by `useHookVariant`, so one saved plan A/Bs all three without re-calling the LLM. (Earlier `--from-plan --variant N` looked for a non-existent `-v2`/`-v3` plan file and failed; fixed.) **Bug fixed in passing:** `render-figures.mjs` captured only the first `:root` CSS block, leaving `--color-*` aliases unresolved so figure bars rendered black; now joins all `:root` blocks. Full technical spec, doctrine, and runbook live in `REELS-PIPELINE.md`; §13 Format 2 reduced to strategy-level facts plus a pointer |
| 42 | Two-angle structure from Optimizing onwards: each blog post gets two days, each day one angle told as a reel (08:00 CET) and a carousel (14:30 CET); three blog posts a week, Monday to Saturday; stories follow the day (three frames on day 1, four on day 2); one kit source file per post rendered by `render-kit.mjs` (Sep 30, 2026) | The old rhythm (a carousel or video over a post's day and the next, then the next post) wrote the carousel, comic and reel for each post separately, with no shared spine, and the docs disagreed on cadence (blog plan Mon/Wed/Fri, playbook Tue/Wed/Thu, actual practice two days per post). The post 43 pilot showed most posts hold two genuinely distinct ideas, so the second day can be a new topic for a follower instead of a repeat. Giving each day a reel and a carousel on the same angle splits the jobs cleanly: the reel reaches non-followers, the carousel earns saves from whoever arrived through the reel. Three posts a week was kept over two (which would stretch the 48-post run from 16 weeks to 24). **Rules added:** every angle carries a tool the reader keeps, shown working on every chart, a fixed maker's line instead of a product plug, and one ask on the closer. **Two-angle test** (distinct, carryable, not a repeat of a neighbour) applied to the whole Optimizing run in `instagram-two-angle-audit.md`: 25 of 26 posts passed; inc-1 (then numbered 76) held one idea, and passed once its draft grew a second one on Oct 1, 2026. **Sub-articles** get no two-day run. **Known risk:** two feed posts a day may split early engagement on a small account; reviewed after two weeks (§14). See §2.1 |
| 43 | Content rules at the top of this playbook, and the posting split in §2.2: Claude schedules reels, carousels and every story frame not tied to post time in Meta Business Suite; the account owner posts the post-time story shares; a kit includes only what Business Suite can schedule (Oct 14, 2026) | The owner set four standing content rules (teach not prescribe, plain words, numbers and sources checked twice with the blog corrected in the same pass, Codex as visual partner with a consensus result) and wanted them written where every kit session reads them. Posting: anything left as a manual step gets skipped or done inconsistently, so the kit is shaped to what the scheduler can place instead of carrying instructions for a human. Shares of a live post stay manual because a post has to exist before it can be shared. |
| 44 | Blog lessons at Optimizing and Inclusive Finances follow the layered format (TL;DR, linked "In this lesson", glossary card, folded depth, quick checks), headings that name the point, search titles, "reference, don't repeat" and the beneficiary-form caveat, past and future; rules under the content rules at the top of this playbook, details in `blog-content-plan.md` Rule 10, enforced by the build with a shrinking backlog list (Oct 21, 2026) | Readers called the lessons text heavy, a scholar's reading. The inc-1 pilot (#192, #194) and its reader feedback (#206) produced a format that keeps the evidence but lets each reader stop at their depth: a linked index (phones had none), a glossary card that does not look like another list, headings that do not blur together, and titles people would search. The owner made it the rule for both levels, including lessons already published, and asked that agreed changes live in one place. Conversions land as stacked PRs in publish order, each council-reviewed |

### 12.1 Archive: superseded decisions

These were tried, learned from, and replaced. Numbers are not reused — cross-references in commit messages and external notes still resolve. Each archived entry names the decision that superseded it.

| # | Decision | Why archived |
|---|---|---|
| 16 | Quiz-as-poll + answer-reveal pattern via optional `story_answer` (~Mar 2026) | Recovered the quiz affordance after IG removed quiz stickers — curiosity-gap poll on step 2, dedicated reveal frame on step 3 under the link sticker. Worked on paper as a stronger funnel than self-assessment polls for educational content. **Superseded by #36:** without IG's native quiz sticker right/wrong feedback loop, the structure read as a survey followed by an answer key on a different surface, with no sticker mechanic linking the two. Self-assessment polls (the viewer rates their own situation) collapse the cascade into one coherent beat and produce more honest engagement |
| 17 | Keep one stat backdrop for both step 2 and step 3; add `frame-2-answer.png` only for quiz posts | Earlier attempt at a split poll-specific backdrop produced decorative stat text that read disconnected from the poll question. One cohesive stat backdrop served both step 2 and step 3 well in default (self-assessment) mode. **Superseded by #38:** the entire `frame-2-stat.png` concept was retired; frame 2 is now a brand-chrome-only canvas for the poll sticker, frame 3 is a re-shared carousel slide rather than a stat backdrop |
| 18 | Quiz-mode blank poll backdrop + combined answer/stat frame (superseded #17 for quiz posts only) | On true quiz posts the stat text *was* unrelated to the poll options — exactly the disconnect #17 meant to avoid. Fix: step 2 → blank `frame-2-poll.png`, stat moves onto `frame-2-answer.png` below the ANSWER reveal so the narrative continues. Default mode still used the single stat backdrop. **Superseded by #36:** quiz mode itself retired; the backdrop split is moot |
| 19 | In quiz mode, `story_stat` must advance from the answer, not echo the hook | Once `stat` rendered directly under the answer reveal, hook ↔ stat semantic overlap read as the cascade restating itself. Rule of thumb: hook poses the premise, answer lands the reveal, stat introduces the *why* or the principle. Audited posts 08/10/16 and rewrote each to forward-look. **Superseded by #36:** no more answer reveal frame to advance from |
| 20 | Bump "ANSWER" eyebrow to 48px / weight 700 / full opacity | Original 32px @ 0.75 opacity read as decorative rather than a section label, so the reveal felt under-announced. Larger bolder full-opacity eyebrow sat as a clear "new frame, new beat" marker. **Superseded by #36:** no more answer-reveal frame; the eyebrow it sized doesn't render in the new cascade |

---

## 13. Meme & Reels Stream Policy (standalone IG content, separate from carousels and blog)

Memes belong on Instagram, not in blog post bodies and not inside educational carousels. The earlier policy (memes as a slide inside the educational carousel) collapsed in practice: every constraint that kept a meme brand-safe (MiFID-clean, audience-globalized, no AI, no dated templates, slot inside an authority-voice teaching arc) squeezed real memes out and produced illustrated comics pretending to be memes. Decoupling the two surfaces solves the problem.

The new shape:

- **Educational carousels** stay clean information design. Diagrams, charts, key-number heroes, before/after layouts. No memes, no humor slides, no "relatability" beats. The carousel earns its slot as the authority surface.
- **Blog posts** ship without memes but with a defined *figure* language — clean conceptual SVG diagrams that crystallize one idea per figure, designed to avoid math-anxiety triggers for the Eva-type primary audience. Full figure rules in `blog-content-plan.md` Editorial Rule 9; five figures remain after Decision #29 cut the cohort from nine on a stricter test, and they establish the visual grammar.
- **Memes and humor live as a separate IG stream**, in two formats: **quote cards** (single-image standalone posts) and **Reels** (short-form video). Different cadence, different KPI, different production discipline. The two streams reinforce each other: the educational carousel teaches, the meme stream broadcasts the most quotable line from that teaching to a different segment of IG's algorithm.

### Format 1: Quote cards (never started)

Archived: see [done/PLAYBOOK.md](done/PLAYBOOK.md#format-1-quote-cards-start-immediately).

### Format 2: Reels (pipeline live; see `REELS-PIPELINE.md` for the full spec)

Reels are produced by an automated build-time pipeline, NOT hand-edited in CapCut. The technical spec, brand-rule scrubber, editorial doctrine, and operator runbook all live in **`docs/plans/REELS-PIPELINE.md`** — that is the source of truth. This section captures only the strategy-level facts a planner needs.

**What a reel is now.** A 25 to 35 s faceless short (1080×1920 9:16) of at most 5 beats (the light rules, `action-plan-nov-2026.md`), cream editorial palette, kinetic typography, karaoke captions, AI voiceover (edge-tts, en-GB-RyanNeural). Current reels are written as kit plans (`docs/instagram-kit/<level>/<slug>.reel.json`, one per day), reviewed by the council against `REELS-PIPELINE.md` §1e and §1f, and rendered with `--from-plan`; the older route, an LLM script from the full blog body, is kept in the pipeline but not used for the current run. Every script passes the hard brand-rule gate before render.

**Story-driven, not framework-driven.** Building reels use a tension arc: open on a problem the viewer is *in* (second person, cold hook that assumes no prior post), build the cost, land the blog `figure` mid-reel as "why this matters," withhold the step-by-step `flow` diagram until the back third as the resolution, then close on the opener's image and a concrete blog reason. Reels that open with the answer have spent their tension before building any.

**Shared design source of truth.** Blog figures (per `blog-content-plan.md` Editorial Rule 9) double as the reel's `figure` anchor — the same SVG, rasterised to PNG by `npm run render-figures`. The reel adds motion, voice, and the surrounding tension arc over the same conceptual scaffold.

**Hook A/B.** Each plan carries 3 hook variants; `--variants-all` renders all three as distinct mp4s (plus matching captions that each open with that variant's hook) for a real A/B test. See `REELS-PIPELINE.md` "Hook A/B variants." The current kit reels render one hook each, so no A/B results exist yet.

**Cadence:** reels only, one reel per day, one to three days per blog post (§2.1). Each reel is built around one persistent data-driven visual, all driven by plan data and reusable across posts: the growth chart (`FinancialProjectionStory.tsx`), the comparison bars (`BarComparisonStory.tsx`), the month bars (`MonthStory.tsx`, with a calendar mode for monthly series against a reference line and a runway mode for a balance draining month by month), the animated line (`LineRaceStory.tsx`, preferred where a quantity moves over time, `REELS-PIPELINE.md` §1f), vertical columns (`ColumnStory.tsx`), bands (`BandStory.tsx`) and the route (`RouteStory.tsx`), all in `remotion/src/components/`.

### What's still off-limits

- **No memes inside educational carousels.** Carousel-side visual content is information design only.
- **No memes in blog post bodies.** Per blog Editorial Rule 8.
- **No memes in stories.** Stories stay brand-chrome consistent (§2.1).
- **No separate meme account.** One account, two streams — the volume doesn't justify a second handle and dilution risk is real.

### Sources still allowed (when humor IS the vector, e.g. for occasional reactive memes)

The original source priority remains valid for any future case where a humor-vector meme is appropriate (rare, not part of the standing cadence, used reactively to news/markets):

1. **xkcd** — CC BY-NC 2.5, safe to embed with attribution. Best fit for conceptual humor. Note: xkcd #927 "Standards" is referenced in `blog-content-plan.md` post #23 (Tax-Advantaged Accounts) — as an embed in the blog HTML, not as a carousel slide.
2. **Screenshot-style memes** — fake DMs, fake search results, fake bank notifications, real public-figure tweet screenshots when the joke is descriptive (not directive).
3. **Globally released movie stills** — usable but rarely worth the production effort once production cost is honest.

### Sources still off-limits

- **Dilbert** — Scott Adams' public reputation post-2023 makes any Dilbert reference a brand-association risk regardless of strip vintage.
- **2020-2023 meme templates** — Drake-pointing, Distracted Boyfriend, Galaxy Brain, "nobody: / me:", Woman Yelling at Cat. Out-of-touch in 2026.
- **AI-generated images** as final assets. Allowed for layout ideation only — AI-generated pixels never ship.
- **US-only cultural memes** — The Office, Parks & Rec, Seinfeld. Audience is global ex-North America (§1).
- **Country-specific memes** — Bollywood, German humor formats, Asterix. Only on geography-specific posts, and §1 pushes back against Indian-diaspora bias.

### MiFID-safe directive (still binding on every image asset that includes numbers)

Quote cards, Reels, and any other image content that includes financial numbers carry the same regulatory rules that govern blog prose:

1. **No named investment products** in the image or caption (no stock tickers, fund names, ETF tickers, crypto coins, brokerage names). Tax-advantaged-account *categories* (401(k), ISA, NPS) are allowed as descriptive references when the surrounding context is educational, never as a directive.
2. **No return guarantees, no forecasts presented as fact.** Any number that depends on a return assumption must carry the disclaimer *visible inside the image itself* (not just in the caption, since images circulate standalone): "illustrative," "example," or "assumes X% return — past performance is not a forecast."
3. **No specific tax rates or jurisdiction-locked tax math** in the image. Conceptual framings are fine; specific numbers are not.
4. **No advice phrasing** in the image or caption: "you should buy," "now is a good time," "don't miss out," "this is the dip," "load up on X." Allowed: "consider," "the math says," "common patterns," "research suggests."
5. **No before/after performance of a real product.** Generic compound-interest curves with no product name attached are fine.
6. **No screenshots of brokerage apps, exchanges, or trading interfaces.** Generic phone-UI styling only.
7. **No product-vs-product comparisons** by name. Category-level comparisons (active vs. passive at the asset-class level, with no fund named) are fine.

### Pre-publish checklist (every quote card and Reel)

- [ ] No named instrument, fund, ticker, coin, exchange, or platform in image, video, or caption?
- [ ] If numbers are shown: labelled "illustrative" with assumptions (X% return, Y% inflation, Z% SWR) visible *inside the image or video frame* — not just in caption?
- [ ] No phrasing that reads as "buy this" / "do this now" / "miss out otherwise"?
- [ ] No specific tax rates, contribution limits, or jurisdiction-locked math inside the image?
- [ ] No before/after performance of a real product?
- [ ] No screenshot of a real brokerage / exchange / trading UI?
- [ ] Alt text written (accessibility + IG's image-content classifier)?
- [ ] If unsure on any of the above: drop the asset.

### A/B test plan

Archived: see [done/PLAYBOOK.md](done/PLAYBOOK.md#ab-test-plan). Reels are now judged by the reels only safety check (Nov 2 to 15, `action-plan-nov-2026.md`) and the `REELS-PIPELINE.md` §1f review at 40 reels.

### Cross-reference

Blog-side rules:
- No memes in post bodies: `blog-content-plan.md` Editorial Rule 8.
- Blog figure language (clean conceptual SVG): `blog-content-plan.md` Editorial Rule 9.

Reels:
- Full technical spec, brand-rule scrubber, editorial doctrine (tension arc, cold hooks, visual density), and operator runbook: `docs/plans/REELS-PIPELINE.md`.

---

## 14. Review Cadence

- **Quarterly** → review hashtag landscape; niche tags shift faster than broad ones
- **Reels only** → the safety check (Nov 2 to 15, interim look after Nov 8, `action-plan-nov-2026.md`) and the `REELS-PIPELINE.md` §1f review at 40 reels
