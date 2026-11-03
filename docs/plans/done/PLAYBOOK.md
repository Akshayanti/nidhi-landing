# Instagram Content Playbook (archived parts)

Live file: [../PLAYBOOK.md](../PLAYBOOK.md). Text below is moved verbatim under its original heading.

## Opening rules (above §1)

> Moved 2026-11-03: item 9's "more" wording belonged to carousel closers (no carousels since Oct 29); the "try it with your numbers" tool link is in place where a matching tool exists (16 lessons carry `relatedTool`); the TL;DR part was rolled out to every lesson by #277; the Discovery depth rewrites were dropped (ec3f9f7). The open items stay in the live file.

9. **The lesson's Instagram kit still matches.** Everything a scheduled kit promises stays on the page, and expander labels reuse the kit's "more" wording.

Agreed, not yet applied (try them in conversions, decide case by case): the lesson's key figure near the top; a named persona opening the lesson (the personas appear in the text of only 2 of 78 lessons); figures that replace paragraphs; a "try it with your numbers" link to the matching free tool; reels and story links landing on the matching section. Waiting on results: the five-reader test of old against new inc-1, the control-lesson review and a PostHog scroll-depth check, before the format becomes the rule for Discovery, Building and Psychology.

### 2.1 Two-angle structure (Optimizing onwards, Series 4 "Money, Compounding")

> Moved 2026-11-03: overtaken by the reels only format from Oct 29, 2026 (owner, action plan log): no carousels, no polls, new slots in IST; the Sunday table stopped after Nov 1. The parts still in force are restated in the live §2.1.

This is the current structure. It governs every blog post from post 43 onward, including the Inclusive Finances companion posts interleaved through Optimizing and Mastery. The slot tables further down this section describe Series 1 to 3 and stay as the record of how those shipped. Decision #42.

**Each blog post gets two days, and each day carries one angle.** An angle is a single idea from the post with its own hook and its own number or picture. Each day tells its angle twice:

| | Job | Format |
|---|---|---|
| Reel | Reach: non-followers | 9:16, one persistent data-driven visual, voiced (see `REELS-PIPELINE.md`) |
| Carousel | Saves: the reference version | 4:5, up to 8 slides, rendered from the post's kit (§10) |

Day 2 is a second, distinct angle, not a continuation of day 1. A follower who saw day 1 should meet a new topic on day 2. Post 43 is the reference: day 1 is "one growth assumption moves a 30 year projection by €1.06M", day 2 is "what moves the line is what repeats" (a €4,000 holiday against €150 a month more rent).

**Weekly rhythm.** Three blog posts a week, two days each, Monday to Saturday. Sundays alternate: the Beliefs post one Sunday, a free tools post the next (below).

| | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|
| Blog post | A | | B | | C | |
| Feed | A day 1 | A day 2 | B day 1 | B day 2 | C day 1 | C day 2 |

That is two feed posts a day and twelve a week. The blog post publishes on its day 1.

**Daily slots.** Reel first, carousel second, using the two existing slots: the reel at `08:00 CET` and the carousel at `14:30 CET`. The reel goes first because it reaches people who haven't seen the topic; the carousel then gives anyone who arrived through the reel something to save. Two feed posts on one day may split early engagement on a small account; check this after the first two weeks (§14).

**What every angle must carry:**
- **A tool you keep.** One named rule of thumb, checklist or test the reader can use on their own numbers, always on its own `tool` slide and as the reel's screenshot moment. Post 43: the 30 year multiplier (day 1), the repeat test (day 2).
- **A recurring cast.** Followers should meet the same few people across posts. Where the blog post's worked example already names someone (Petra, Jiri and Marcus appear in the blog), use them; otherwise use Eva, the "Eva-type" primary reader from `blog-content-plan.md`, as post 43 does. Do not invent a new character per post, and check names don't collide with another post's character.
- **Shown working.** Every chart is computed from stated inputs and labelled illustrative, with its assumptions on the frame. Ranges over single numbers. No "you should".
- **A maker's mark, not a plug.** nidhi is described as being built, never as available, and the line points to the free tools, which are live (decided Oct 1, 2026). Captions end on "Made by the person building nidhi, a planner that shows its assumptions. No ads, no data selling. Free tools you can use today, link in bio." The carousel closer carries "Made by the person building nidhi, a planner that shows its assumptions. Free tools at nidhi.today." The reel end card carries "nidhi, a planner in the making · free tools live today". No ask is attached to any of them.
- **One ask.** The carousel closer carries a single `save:` ask and no share, send or follow rows. Day 1 closer: one `read:` line naming something the blog holds (§9). Day 2 closer, the last Instagram piece for the post: an "Also in the full post" list of 2 or 3 one-line `more:` items naming ideas from the post that neither day showed, so followers see the blog has real depth without the reels carrying it. Never repeat day 1's line or anything either day taught. Lint enforces the split (decided Oct 2, 2026).

**The two-angle test.** Before a post enters the run, both angles must be:
1. **Distinct:** day 2 is not the solution to day 1's problem or a continuation of it.
2. **Carryable:** each angle has its own hook and either a number or a picture a reel can be built around.
3. **Not a repeat:** the angle has not been used by a nearby post in the run. Known clusters where only one post may use the obvious angle: "a range, not a single number" (43, which now includes the merged 55), "real versus nominal" (43, 54), "sequence of returns" (55, 60), "the five documents" (inc-6, inc-7, inc-1).

The audit of the whole Optimizing run against this test lives in `docs/plans/instagram-two-angle-audit.md`.

**Exceptions:**
- **A post with one idea** cannot fill two days. Either the draft grows a second angle, or it runs as a one-day post (reel and carousel on the same day, and the next post starts a day early). inc-1, "When the Default Plan Doesn't Fit You", was the one known case until its draft grew a second angle on Oct 1, 2026; no post in the current run needs this exception. (Inclusive Finances posts use `inc-N` ids; map in `blog-content-plan.md`.)
- **Sub-articles** (posts that extend a parent post, such as inc-7a and inc-7b under the unmarried couples post) publish on the blog in the days after their parent and get no two-day run of their own.

**Stories: three frames a day, four on day 2.** Stories follow the reel and the carousel instead of the four-frame cascade in §7.

| Frame | Day 1 | Day 2 |
|---|---|---|
| 1, at the reel slot | Share the reel (tap to post) with a hook overlay | Share the day 2 reel with a hook overlay |
| 2, about 90 minutes later | Self-assessment poll on a rendered backdrop | Yesterday's poll result, the winning answer typed in by hand |
| 3, with the carousel | The tool you keep, as a standalone frame | The day 2 tool, as a standalone frame |
| 4, late evening | | Blog extra (something the carousel didn't cover) with the link sticker |

The poll result on day 2 is the reason to come back the next day; it takes about a minute to type in.

**First hour (added Oct 2, 2026).** Instagram tests a post on a small first audience and reads rates among real viewers (watch time, sends, saves). Every posting sheet ends each day with a checklist: story share the moment the reel is live, send it to 3 to 5 real people it would help, reply to every comment within the hour, repeat for the carousel. No engagement from your own other accounts (it is discounted at best and treated as inauthentic at worst); if any happens, it is logged in the sheet so it can be subtracted from the metrics. Trial reels are not available on the account yet (checked Oct 2, 2026).

**Chip and series signal.** Optimizing runs under the chip `Money, Compounding` with no "N of 18" counter, because the Inclusive Finances companions are interleaved. Inclusive Finances is its own theme on Instagram (decided Oct 1, 2026): it has its own chip, `Money, For You and Me`, and its own profile Highlight, with no "N of 16" counter. Each inclusive post still ships interleaved, directly after its host, and opens from the assumption the host post makes. Every series keeps a Highlight so the profile works as a library.

**Beliefs on Sundays.** The seven Beliefs posts (Instagram only, `docs/instagram-kit/beliefs/`, one standalone kit each, in the order of the beliefs page) run every other Sunday, starting with "Built from frustration" on the Sunday before the restart (Oct 11, 2026) as the comeback post. The seventh, "Not just the rules of thumb", was added Oct 7, 2026 with the matching belief on the page. Render with `node scripts/render-kit.mjs beliefs/<file>.md`.

**Free tools on the other Sundays (decided Oct 13, 2026).** Every caption ends on "Free tools you can use today", but until now no post showed them. The Sundays between Beliefs posts carry one standalone post each (`docs/instagram-kit/sundays/`, same kit format, story pattern and 14:30 CET slot as Beliefs; render with `node scripts/render-kit.mjs sundays/<file>.md`):

| Sunday | Post |
|---|---|
| Oct 18 | Inflation calculator (the newest tool; pairs with the purchasing power ideas in the restart run) |
| Oct 25 | Beliefs 2 |
| Nov 1 | Languages: the site and all four tools in Hindi and Spanish |
| Nov 8 | Beliefs 3 |
| Nov 15 | Net worth calculator |
| Nov 22 | Beliefs 4 |
| Nov 29 | Loan comparison |
| Dec 6 | Beliefs 5 |
| Dec 13 | Monte Carlo simulator |
| Dec 20 | Beliefs 6 |
| Dec 27 | No feed post, stories only (the week between Christmas and New Year) |
| Jan 3, 2027 | Beliefs 7, the last |

Rules for these posts:
- **Three slides for a tool post** (the languages post has two). What the tool answers; one worked example, computed with the tool's own maths and labelled illustrative; what it can't see, with the privacy fact. Caption and stories carry the rest.
- **The privacy fact, exactly:** calculations run in your browser and the numbers you type are not sent anywhere. Never "no data leaves your browser": the pages fetch exchange rates and count anonymous pageviews.
- **The tools are live, the planner is not.** Say "free tools at nidhi.today", never "nidhi now does" anything. No ask beyond save; the link is stated as a fact, never as "try it".
- **Limits on the slide, not only on the page.** The Monte Carlo post says it is not a forecast and names its return source; the loan post says APR rules differ by country and the result is a comparison, not a lender's quote; the inflation post says history is not a forecast.
- **Every tool post mentions Hindi and Spanish** in one caption line, so a follower who reads either does not wait for the languages post.
- **The languages post is one post for both languages,** framed as access, not identity: English caption, no identity, country or festival hashtags, no flags, Hindi and Spanish search terms only in the keyword block (§3 "Account-level cohort hygiene"). It says plainly that the lessons stay in English. A later locale (Czech) gets stories when it goes live and a feed post only in a later written plan; it is not teased before it ships.
- **Link sticker and bio link** go to the tool page, not the blog, tagged `utm_source=instagram&utm_medium=social&utm_campaign=sunday_tools&utm_content=<tool>` (§9).

After Beliefs 7 and these five posts, Sundays have no feed post until a new Sunday plan is written here.

### Sundays

> Moved 2026-11-03: the Beliefs and tools Sunday run stopped with the reels only format (no carousels from Oct 29); what Sundays carry now is an open question in the live §2.1.

- Series 1 to 3 did not post on Sundays. From the two-angle restart, Sundays alternate between Beliefs and free tools posts (§2.1), at 14:30 CET.
- After Beliefs 7, Sundays go back to no feed post until a new Sunday plan is written here.

## 5. Carousel Structure

> Moved 2026-11-03: no carousels since Oct 29, 2026 (owner); the carousel files are kept in the kits on purpose, and this spec stays here for reference. The Series 1 format's "unshipped Discovery posts" all shipped in May.

The carousel system has two formats. Series 1 (Discovery, posts 1 through 16b) ships in the original dark-gradient format. **Series 2 onwards (Building, post 17+) ships exclusively on the new cream editorial template.** Do not mix formats within a series; grid coherence beats marginal per-post performance.

**Optimizing onwards (Series 4):** carousels are 4:5 (1080×1350), one per angle, and are authored in the post's kit file and rendered by `scripts/render-kit.mjs`, not `render-ig`. Same cream palette and 8-slide cap. The kit uses its own data layouts (`hook`, `inputs`, `growth`, `bars`, `repeat`, `tool`, `worked`, `scenarios`, `closer`), and its lint requires a `tool` slide and a single-ask closer. See §2.1 and §10.

### 5.1 Series 2 carousel system (current spec)

**Visual:** cream paper background (`#FAF7F2`), deep-blue ink (`#002171`), teal accent (`#00897B`) reserved for *one* intentional emphasis per slide. No gradient. Subtle radial warm-grain to avoid flat-color reading. Brand chrome: small teal-stroke eyebrow chip top-left (`SERIES · POSITION`), progress dots and `@nidhi.today` handle bottom row.

**Slide cap: 8.** Down from 12. Completion rate is the metric IG's recommendation engine rewards in 2026; 6–8 is the documented sweet spot. Beyond 8, reach drops sharply.

**Six layout variants, one per slide, picked by author.** Inline directive in the slide header: `## Slide N (layout)`. Default for Slide 1 is `hook`; default for Slides 2 through N-1 is `prose`; the closer slide is explicitly tagged `(closer)`.

| Layout | When to use | Authored as |
|---|---|---|
| `hook` | Slide 1 only. Scroll-stopper. Asymmetric headline, single bolded teal accent word, bottom-right `SWIPE →` cue. No eyebrow chip (its absence reads as "this is the start"). | One headline as body text + optional `sub:` field |
| `prose` | Default middle slide. Single idea, short prose body with teal left-rule. Optional title via `title:` field. | Free body text + `title:` field |
| `stat` | One number / phrase as the slide. Hero auto-scales to fit on one line at full width; everything else is supporting context. The slide design IS the data. | `label:`, `hero:`, `caption:`, `note:` fields |
| `list` | Numbered or bulleted procedural content. Renders as cards with row dividers and circular markers; no list-bunching. | Numbered or bulleted body; auto-converts to row cards |
| `comparison` | Two-option choices, framework comparisons, before/after framings. Two columns, vertical rule between, eyebrow chip per column. | Body split by `===` between columns; first `**bold**` line per column becomes the column heading |
| `closer` | Last slide. CTA ladder: `READ` row at top (auto-derived from `blog_url` frontmatter, with "(link in bio)" navigation cue), then `SAVE`, `SHARE`, `FOLLOW`. Plus a small "Up next" pill above the ladder. | `kicker:` (anchor line), `next:` (pill text), `save:`, `share:`, `follow:`, optional `read:` (override) fields |

**Narrative flow: problem before solution.** Sequence the deck so tension builds before it resolves. The hook names the problem (§8); the early-middle slides deepen and complicate it so the reader feels the stakes; only then do the later slides deliver the framework, number, or fix. Do not resolve the problem on slide 2. A reader who is still holding the question swipes; a reader handed the answer early stops. Order slides to keep one open loop running into the next slide at all times.

**Icon system: cut text weight, label categories.** Carousels skew text-heavy; line icons let a reader parse a slide at a glance. The renderer ships a fixed line-icon vocabulary (`scripts/render-slides.js` → `ICON_PATHS`: e.g. `home`, `bank`, `wallet`, `coins`, `shield`, `calendar`, `clock`, `flag`, `target`, `scale`, `gauge`, `trendUp`, `trendDown`, `recurring`, `exchange`, `globe`, `alert`, `chart`). Usage:
- **Per-row list icons:** prefix a list item with a `:name:` token (e.g. `1. :home: Maintenance and repairs...`). Renders a soft-teal badge marker in place of the number/bullet.
- **Comparison column icons:** `left_icon:` / `right_icon:` fields put one glyph atop each column.
- **Slide topic glyph:** `icon:` field on hook/prose/list/stat renders a single badge above the content.
- **Rules:** icons must *label a real category* (housing, banking, time, risk), never decorate. Use them where a row maps to a concrete thing; skip them on sequential/priority lists where the order is the content, and on all-negative lists ("mistakes") where one repeated icon adds nothing. Unknown icon names render nothing (safe no-op). Keep to the existing vocabulary; add new glyphs to `ICON_PATHS` rather than improvising.

**Trust signal slot (any non-closer layout).** Optional `source:` field renders as a small grey citation under the body, prefixed `SOURCE` in teal. When a slide has both a `source:` field and the post has a `blog_url`, a secondary `READ` line auto-renders below the citation: `Full breakdown on nidhi.today/blog/<slug> (link in bio)`. This is the "curiosity peak" placement: readers asking "where's this number from?" get a natural pointer to the long-form.

**Eyebrow chip:** rendered top-left on every slide except the hook. Sourced from frontmatter:
- `series:` field: the visible chip text, e.g. `"Money in Action · 4 of 16"`
- `category:` field: fallback if `series:` is absent
- Hook slide intentionally has no eyebrow; the headline is the anchor.

**Progress dots:** bottom-left, replace the `1/12` counter from Series 1. Current slide highlighted teal as a longer pill; remaining as small grey dots.

**Handle placement:** `@nidhi.today` bottom-right. Visible on hook + closer; muted-grey (de-emphasized) on middle slides. URL is never printed on slides; it's only ever spoken as `nidhi.today/blog/<slug>` inside the READ row or source nudge.

**No em-dashes.** Globally enforced by the renderer (the `---` to em-dash substitution that was in the old smart-typography pass has been removed). Use commas, colons, or periods. See §8.

**No legacy `>>` / `>>>` / `———` directives.** The Series 1 format used these for centered/right-aligned text and divider rendering; the new layout system handles alignment via CSS per-layout, so authors don't write alignment markup. The renderer silently strips legacy markers if it encounters them, so old markdown re-renders without crashing, but Series 2 markdown should never use them.

**Stories use the same visual system.** `scripts/story-template.html` was redesigned alongside the carousel template to share palette, type, eyebrow chip, and chrome conventions. A Series 2 post's feed carousel and 4-frame story cascade read as one branded surface. See §7 for the story spec.

### 5.2 Series 1 legacy format (used through Discovery 16b)

The Discovery series ran on a dark-gradient template (`#002171` to `#005B4F` at 135°), single layout (centered prose), 12-slide cap, with directive-based authoring:

- `>> text`: center-aligned line
- `>>> text`: right-aligned line
- `!! text`: handle annotation block (positioned bottom-center)
- `———`: visual divider on closer slide
- Bold `**word**` rendered teal + 1.15em (the "title" treatment)
- Series badge (`Basics of Money · N/16`) lived on the final slide; never on Slide 1 (decision #5)

This format remains the spec for any unshipped Discovery posts (13 onwards) so the series finishes coherent on the grid. The original `slide-template.html` and `render-slides.js` for this format are recoverable from git history pre-redesign, and the original Series 1 PNG renderings are already on hand for the remaining drops, so re-rendering is not required. **Do not mix Series 1 and Series 2 visual systems within the same series, ever.** The redesign launches at the Series 1 to Series 2 boundary as a deliberate relaunch beat (decision #34).

### Keywords block (after hashtags)

> Moved 2026-11-03: the 13 to 18 reel count contradicts the kit lint (18 to 24, `scripts/render-kit.mjs`), and reel keywords now live in the kit, not in an LLM plan; the count is an open question in the live file.

**Reels parity (added May 2026).** The same keyword surface applies to IG Reels — the topic classifier reads the Reels caption identically to feed posts. Reels carry a slightly tighter `13–18` keyword count than carousels (Reels captions are scrolled past faster; longer keyword blocks dilute the engagement signal). Reels tooling lives in `scripts/lib/render-platform-caption.mjs`; the LLM emits the array under `caption.instagramKeywords` and the scrubber rejects count violations, hashtag duplicates, and banned terms. Per-reel audience-angle notes belong in `docs/plans/IG-KEYWORDS.md` alongside carousel rationale; final keyword arrays live in the saved plan JSON at `output/plans/<level>/<slug>.json`.

## 7. Story Structure

> Moved 2026-11-03: overtaken by the reels only story set from Oct 29, 2026 (reel share, tool card story, "beyond this post" story; `render-kit --reels-only` skips the poll and poll result frames). The 4-frame cascade and the two-angle story frames are the record of Series 2 to 4.

**Stories pull ~4× the views of carousels.** Treat them as the primary channel; carousels are the library.

**Optimizing onwards (Series 4):** stories follow the two-angle day (three frames on day 1, four on day 2) described in §2.1. The 4-frame cascade below governs Series 2 and 3. The visual system, self-assessment poll rule, caption field and hashtag rules in this section still apply.

### Visual system (Series 2 onwards)

Stories share the cream editorial system with the feed carousel. Same palette (`#FAF7F2` paper, `#002171` ink, `#00897B` accent), same fonts (Inter for headlines, Roboto for body), same eyebrow-chip chrome.

- **Canvas:** 1080×1920 with 260px top / 360px bottom padding to clear IG's profile bar (~220px) and reply bar (~320px).
- **Top chrome:** small teal-stroke eyebrow chip showing `series:` (or `category:`). Empty when neither is set (legacy Series 1).
- **Bottom chrome:** `@nidhi.today` handle bottom-left, `story_hashtag` value bottom-right.
- **Bold (`**word**`) = teal accent** across all variants.
- **Active variants:** `poll` (brand-chrome canvas under the poll sticker, frame 2) and `extra` (designed bonus content with "BEYOND THIS POST" eyebrow + "Read the full breakdown · link below" footer, frame 4). `hook` is retained as a legacy fallback. `stat`, `answer`, `cta` are deprecated for new posts (kept in template only so legacy Series 1 stories re-render unchanged).

Series 1 (Discovery, posts 1 to 16b) stories already shipped in the original dark-gradient design; they will not be re-rendered.

### 4-frame cascade

The cascade is 4 frames over ~6 hours. Two frames are **manual shares + overlay text** in IG's native composer (cheap, brand-safe, route taps back to the post). Two frames are **rendered PNGs** (the poll backdrop and the blog-extra). No "save this" CTA frame: story viewers can't save stories the way they save feed posts, so that ask was always dead text.

**Default cascade emits exactly 2 PNGs:** `frame-2-poll.png` and `frame-4-extra.png`. Frame 1 and frame 3 are manual shares in IG composer, no PNG produced. (Opt-in escape hatch: set `story_render_hook_png: true` to also emit `frame-1-hook.png` for milestone posts that need a standalone first frame, e.g. a beta-launch teaser that ships before any carousel.)

| Step | Timing (14:30 post) | What goes on screen | Native sticker | Rendered PNG? |
|---|---|---|---|---|
| 1. Announce | 14:30 | **Tap-to-post share of the carousel** + `story_hook` typed as text overlay in IG composer | Tap-to-post + hashtag | No (opt-in fallback) |
| 2. Engage | 16:00 | `frame-2-poll.png` (brand chrome only, no body text) | **Poll sticker** with question from `story_poll_q` + up to 4 options from `story_poll_opts` | Yes |
| 3. Insight | 18:00 | **Tap-to-post share of carousel slide #`story_insight_slide`** + `story_insight` typed as text overlay | Tap-to-post | No |
| 4. Beyond | 20:30 | `frame-4-extra.png` (designed canvas with `story_blog_extra` body + "BEYOND THIS POST" eyebrow + "Read on blog · link below" footer) | **Link sticker** to blog URL | Yes |

### Frame-by-frame guidance

**Frame 1: share + overlay.** Don't render a custom hook PNG. Share the freshly-dropped carousel via tap-to-post, type `story_hook` (2 to 4 short lines, big-text friendly, in voice) as overlay in IG's text tool. A tap routes back to the carousel and the swipe arc is preserved. The renderer only emits `frame-1-hook.png` when the post sets `story_render_hook_png: true`, reserved for milestone teasers, beta launches, and posts that ship before the carousel.

**Frame 2: poll.** `frame-2-poll.png` is intentionally bare paper plus brand chrome (eyebrow, handle, hashtag). The native IG poll sticker carries the question and options. No body text on the PNG itself, because anything there competes with the sticker for the viewer's attention. The poll is **self-assessment only** — it asks the viewer about their own situation ("how many months of expenses do you have saved?", "when did you last rebalance?"), not a quiz with a right answer.

**Frame 3: shared slide + insight overlay.** Re-share a specific carousel slide (`story_insight_slide`, e.g. `4`) via tap-to-post, then type `story_insight` as a short overlay highlighting the takeaway. Pick the slide that carries the post's strongest single idea — usually a `stat`, `comparison`, or punchy `prose` slide; rarely the closer. This frame doubles down on the carousel's best beat without designing a third version of the same idea.

**Frame 4: blog extra + link.** `frame-4-extra.png` is the only frame in the cascade carrying genuinely new content — content from the blog that the carousel intentionally didn't cover (a deeper stat, a worked example, a counter-intuitive line, a citation). The "BEYOND THIS POST" eyebrow signals: *the blog has more*. The link sticker carries the tap. This is the cascade's primary funnel beat into the blog.

### Native stickers
- **Tap-to-post** sticker: shares a feed post inside a story; one-tap return path. Used on frames 1 and 3.
- **Poll sticker:** question + up to 4 options. Used on frame 2 only. Self-assessment style.
- **Link sticker** → blog URL. Used on frame 4 only.
- **Hashtag sticker** (small, tucked corner): used on frame 1 only.

### Why no CTA frame

The previous cascade had a frame 4 reading "Save this for your next paycheck review" or similar. Story viewers can't save stories the way they save feed posts, and the ask read as filler. Replaced by the blog-extra frame, which gives the engaged viewer something genuinely new and routes them to the long-form. See decision #38.

### Self-assessment polls (the only supported pattern)

Polls ask the viewer about their own situation. No quiz-style "which of these" framing, no answer-reveal frame.

- `story_poll_q`: "How many months of expenses do you have saved?"
- `story_poll_opts`: "<1 | 1-3 | 3-6 | 6+"

We previously documented a "quiz-as-poll + answer reveal" pattern; it was retired (see archived decisions #16, #18, #19, #20 in §12). Without IG's native quiz sticker's right/wrong feedback loop, asking a trivia-style question inside a poll reads as a survey followed by an answer key one frame later. Self-assessment polls collapse the cascade into one coherent beat and produce more honest engagement.

### Deprecated story fields (Series 1 only)

The renderer keeps parsing these for backward compatibility, but new posts must omit them:

- `story_answer` → emitted `frame-2-poll.png` + `frame-2-answer.png` quiz-mode frames (retired)
- `story_stat` → emitted `frame-2-stat.png` body backdrop (replaced by frame-3 shared-slide pattern)
- `story_prompt` → emitted `frame-3-cta.png` save/tag/share frame (replaced by frame-4 blog-extra)
- `story_quiz_*` → legacy from before IG removed quiz stickers; never honored

### 2-day campaign (milestone posts only)

Milestone posts (series launches, beta reveals, `16b-discovery-level-complete`-style wraps) run the cascade twice. `story_day2_*` mirrors every Day 1 field with the same semantics:

- `story_day2_hook` (overlay text), `story_day2_poll_q` / `story_day2_poll_opts`, `story_day2_insight_slide` / `story_day2_insight`, `story_day2_blog_extra`, `story_day2_hashtag` (optional — falls back to `story_hashtag`)
- `story_day2_caption_*` mirrors the IG native caption fields
- Rendered PNGs use the `day2-` prefix (`day2-frame-2-poll.png`, `day2-frame-4-extra.png`) in the same `stories/` directory
- Reserved for genuine milestones; do not use as overflow from Day 1

### Story captions (IG native caption field)

Tiny captions you type into IG's caption text field on each story frame, separate from on-PNG body text and from sticker text. ~10 words / 80 chars max, one per frame:

- `story_caption_announce` → frame 1
- `story_caption_poll` → frame 2
- `story_caption_insight` → frame 3
- `story_caption_extra` → frame 4

Each should include one searchable keyword (IG indexes the caption field for topic classification and search).

### Story hashtags

One per cascade max, on frame 1 (the announce frame). Hashtag sticker, small, tucked in a corner. Not the caption field. `story_hashtag` is the source.

### Link targeting

> Moved 2026-11-03: the bio line is now an open question in the live file (it conflicts with the beta plan); the hub exists as `/blog/discovery/` in all five languages.

- Bio link → swap daily to match the current day's post
- **Recommended:** build a `/basics` hub page listing all 16 discovery posts — lets Post 16b ("Discovery Complete") point to a single durable URL

### Carousel-side blog pointer pattern (Series 2 onwards)

> Moved 2026-11-03: carousel-era pattern, no carousels since Oct 29, 2026; reels now point to the lesson through the caption and the "beyond this post" story.

URLs are not tappable inside Instagram posts. The carousel must therefore *direct* the reader to the blog rather than pretend a URL is a link. Two coordinated placements per carousel:

1. **Closer slide: primary CTA, top of the ladder.**
   The `closer` layout's CTA ladder leads with a `READ` row (above SAVE / SHARE / FOLLOW). Auto-derived from the post's `blog_url` frontmatter and rendered as `Full breakdown on **nidhi.today/blog/<slug>** (link in bio)`. This is the dominant action on the closer; placing it first signals it's the intended next step, with social CTAs as secondary.

2. **Source slide: secondary nudge, curiosity placement.**
   When any non-closer slide carries a `source:` field (a citation), the renderer auto-renders a small `READ` line directly under the citation: `Full breakdown on **nidhi.today/blog/<slug>** (link in bio)`. This fires at the moment curiosity peaks ("where's this number from?"), routing the engaged reader to the long-form before they finish the carousel.

The URL is rendered with protocol and UTM parameters stripped (`nidhi.today/blog/budgeting`, not `https://nidhi.today/blog/budgeting/?utm_source=instagram&...`) for legibility. UTMs survive in the actual link-in-bio destination because the bio link is built with full UTM tagging at swap time.

**Do not place the URL on every slide.** It reads as desperation and burns canvas. Two placements (closer + source slide) are enough; everything else stays content-only.

**Tease the solution, don't hand it over.** The carousel must deliver real, standalone value *and* leave a specific reason to click through. Use the closer's optional `read:` field (overrides the auto-derived READ line) to name a concrete payoff the carousel deliberately did not cover, phrased as a curiosity gap rather than a summary:
- Point at a specific artifact or answer the blog holds: "The country-by-country cost map, where buying eats 2% in one place and 15% in another", "The surplus reality check: what to cut when your goals add up to more than you can save".
- **Withhold the specifics**, not the topic. Promise the thing, never pre-deliver it on the slide. If the deck already showed it, it can't be the tease.
- Avoid generic "read more / full breakdown" as the only pull. The closer auto-line already covers the existence of the post; `read:` exists to make the reader *want* it.

### Format 1: Quote cards (start immediately)

> Moved 2026-11-03: never started; no quote card kit exists in `docs/instagram-kit/`, and the cadence was overtaken by Decision #42 and then the reels only format.

Single-image standalone posts. Sharp Nidhi lines, formatted as a square (1:1) or portrait (4:5) image, dark background, Nidhi mark in the corner, the line in the center, nothing else.

These function as memes in the 2026 IG sense (saved, sent in DMs, screenshot-shared) without humor as the vector. The shareability is "this is true" rather than "this is funny."

**Source material.** Pull lines from already-published blog posts. Examples drawn from the existing Building corpus:

- "A goal without a number is a wish." (#30)
- "Inflation is the silent eraser." (Discovery / Building)
- "Most internet 'passive income' is active business income in disguise." (#26)
- "The biggest risk most people overlook is doing nothing." (#17)
- "Your primary home is an asset on the balance sheet, a liability in the cash flow." (#28)
- "Diversification is often called the only free lunch in finance." (#20)
- "Renting is throwing money away is a myth." (#28)
- "At a 50% savings rate, financial independence is roughly 17 years away regardless of salary." (#25)
- "Compounding does most of the work in the last decade." (#30)

**Production:** the line is the entire asset. Set in the existing carousel typography (DM Sans / Inter / whatever the carousel uses), centered, large enough to read at thumbnail. No illustration, no decoration. Asset takes ~5 minutes per card to produce; the writing was the work.

**Cadence:** 2x/week between educational carousels. Post weeks: Mon educational carousel, Wed quote card, Fri educational carousel, Sun quote card (or similar).

### Format 2: Reels (pipeline live; see `REELS-PIPELINE.md` for the full spec)

> Moved 2026-11-03: the 45 to 85 s length and LLM route are overtaken by the light rules (25 to 35 s, at most 5 beats) and kit reel plans; the cadence by the reels only format (Oct 29); the list of visuals now also has LineRace, Column, Band and Route.

**What a reel is now.** A 45-85s faceless short (1080×1920 9:16), cream editorial palette, kinetic typography, karaoke captions, AI voiceover (edge-tts, en-GB-RyanNeural). The script is LLM-authored from the full blog body, then passed through a hard brand-rule gate before render. Discovery reels run ~45-75s; tension-arc Building reels (figure + flow diagram + 6 beats) run ~75-85s. This replaces the original "10-15s text-on-background, CapCut, ~30-60 min" pilot framing.

**Cadence:** see the content-cadence table in `REELS-PIPELINE.md`. Released alongside the corresponding educational carousel. From Optimizing onwards, every blog post gets two reels, one per angle, each posted the same day as its carousel (§2.1). Each reel is built around one persistent data-driven visual; built so far are the growth chart (`FinancialProjectionStory.tsx`), the comparison bars (`BarComparisonStory.tsx`) and the month bars (`MonthStory.tsx`, with a calendar mode for monthly series against a reference line and a runway mode for a balance draining month by month), all driven by plan data and reusable across posts. Carousels have matching `months` and `runway` layouts in `render-kit.mjs`.

### A/B test plan

> Moved 2026-11-03: quote cards never ran; the reels evaluation was overtaken by the reels only safety check (Nov 2 to 15, `action-plan-nov-2026.md`) and the `REELS-PIPELINE.md` §1f review at 40 reels.

The two streams have separate KPIs and separate evaluation horizons.

- **Quote cards.** Evaluate after 12 cards shipped (~6 weeks at 2x/week). Compare against the educational carousel cohort over the same period. Threshold to keep: **2x lift on saves OR sends per post relative to carousel baseline**, since a quote card is a smaller production investment than a carousel and only needs to outperform on a per-effort basis.
- **Reels.** Evaluate after the June pilot batch. Compare reach and follower acquisition against the matched-period educational carousels. Threshold to keep: **3x lift on reach OR 1.5x lift on new followers**, since Reels' algorithmic upside is reach-driven and the entire reason to invest production effort is discovery. **Hook-level A/B:** when a post ships with `--variants-all`, compare 3s-retention and saves across the three hook variants of the same reel to learn which opener register wins (problem-in-second-person vs. question-wall vs. hidden-cost). The pipeline emits the variants; the learning feeds back into `opener-assignments.json` and the system prompt.

If either stream falls below threshold, drop it. The educational carousel stream is the authority surface and earns its slot independently.

## 14. Review Cadence

> Moved 2026-11-03: the Discovery reviews are done (Discovery and Building shipped); the two-angle check was overtaken by the reels only format and the Nov 1 readout (carousel median reach 10).

- **After 3 posts** → review reach vs. pre-playbook baseline; adjust timing and hashtag mix
- **After 6 posts** → if growth is slow, revisit engagement philosophy (consider ManyChat auto-DM for "comment X" flows)
- **After 10 posts (Discovery series complete — 08 through 16b)** → hold before Money in Action; iterate playbook based on what worked
- **After the first two weeks of the two-angle run (§2.1)** → check whether two feed posts a day split early engagement: compare reach and saves of each day's second post against its first, and against single-post days from earlier series. If the second post is consistently starved, space the slots further apart or drop to two blog posts a week

---
