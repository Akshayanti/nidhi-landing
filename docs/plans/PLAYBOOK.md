# Instagram Content Playbook

Strategic decisions and workflow for @nidhi.today Instagram content.
This is the working reference. Update as decisions change.

---

## 1. Target Audience

**Primary:**
- Europeans (EU residents)
- Expats living in Europe
- Indians (in India)
- Indian expats in non-US countries

**Explicitly avoid:**
- US-focused hashtags or audience targeting
- US-specific credit / tax / retirement content

**Language:** English, EU-localized money context (€, local references like Helsinki, Lisbon, Berlin, Bangkok).

---

## 2. Posting Schedule

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
- Currently not posting on Sundays. Fine to continue.
- Alternative: Sunday 18:00–20:00 CET ("Sunday scaries") is actually a strong save-rate window for financial content if ever reactivated.
- Can also do story-only Sundays (reshare + polls + "Sunday reset" prompt).

---

## 3. Hashtag Strategy

### Rules
- **Max 5 hashtags per post.** IG deprioritizes more than 5.
- **No repeats** across consecutive posts — IG treats it as hashtag stuffing.
- **Composition:** 1 topic tag (medium-large) + 2 niche/community + 1 geo/audience + 1 branded `#nidhi`
- **Placement:** in caption body, separated by 3–5 line breaks from visible caption. NOT in first comment (IG weights caption hashtags higher).
- **Keywords in first 125 chars of caption** matter more than hashtags now — IG topic classifier reads there.

### Anchor tags by axis
| Axis | Tags |
|---|---|
| Europe core | `#moneyineurope`, `#fireeurope`, `#expatfinance`, `#personalfinanceeurope` |
| Indian diaspora | `#desifinance`, `#indiansineurope`, `#indianfinance` |
| Expat / relocation | `#expatlife`, `#movingabroad`, `#costoflivingcomparison` |
| Topic niches | `#liquidityrisk`, `#emergencyfundeurope`, `#savingvsinvesting`, `#inflationawareness`, `#creditscore`, etc. |
| Brand | `#nidhi` (always include) |

### Avoid
- `#personalfinance` — 30M+ posts, saturated
- `#financialliteracy` — 6M+, same issue
- `#moneytips`, `#wealthbuilding`, `#financialfreedom` — vague, attract bots not followers
- Any `#...us`, `#americanexpat`, `#personalfinanceus` — wrong audience

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

### Slide 1 — Hook
- Scroll-stopper in the first 3 seconds
- Short question or stat + pattern-interrupt
- **No series badge** on Slide 1 — signals "you missed content" to non-followers, hurts reach
- Examples:
  - "€100K in net worth but can't cover a €2K bill? / That's a liquidity problem"
  - "Same house · Same salary / One person pays €77,000 more"

### Slides 2 through N-1 — Content
- One idea per slide
- Short, scannable, no long paragraphs
- Concrete examples beat abstract definitions

### Final slide — Next-up tease + follow CTA
Series position badge lives here (moved from Slide 1). Clean format:

```
>> **Basics of Money · 7/16**

>> Next up →
>> The emergency fund:
>> your first financial safety net.

>> ———

>> Full library → link in bio
>> Follow @nidhi.today for post 8
```

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

---

## 7. Story Structure

**Stories pull ~4× the views of carousels.** Treat them as the primary channel; carousels are the library.

### 4-step cascade per post

| Step | Timing (14:30 post) | PNG to upload | Native sticker to add | Purpose |
|---|---|---|---|---|
| 1 — Hook | 14:30 | `frame-1-hook.png` | Tap-to-post + 1 hashtag sticker | Scroll-stopper, announce the drop |
| 2 — Poll | 16:00 | `frame-2-stat.png` *(default)* or `frame-2-poll.png` *(quiz mode)* | Native **poll** sticker (question from `story_poll_q`, up to 4 options from `story_poll_opts`) | Drive interaction |
| 3 — Value / Reveal | 18:00 | `frame-2-stat.png` *(default)* or `frame-2-answer.png` *(quiz mode)* | **Link sticker** → blog URL | Educate + drive traffic (reveal quiz answer when applicable) |
| 4 — CTA | 20:30 | `frame-3-cta.png` | None (text is the message) | Prompt save/tag/share |

### PNG backdrops
- **Default mode** — one content PNG (`frame-2-stat.png`) serves both step 2 and step 3. The stat is cohesive context under a self-assessment poll and continues to read well under the step-3 link sticker.
- **Quiz mode** — step 2 uses `frame-2-poll.png` (blank brand-chrome-only canvas) so the multi-option poll sticker has a clean backdrop with no competing text. Step 3 uses `frame-2-answer.png`, which renders the "ANSWER" reveal *and* the continuing stat below it, so the narrative doesn't drop on the reveal frame. The standalone `frame-2-stat.png` is not emitted in quiz mode — the stat is folded into the answer frame.
- Template, palette, brand chrome, and safe zones are identical across all frame variants — the cascade stays visually consistent whether or not a post has a quiz.

### Two poll patterns

**Self-assessment poll** (default). Poll asks about the user; step 3 shows the same stat with a link sticker.
- `story_poll_q`: "How many months of expenses do you have saved?"
- `story_poll_opts`: "<1 | 1-3 | 3-6 | 6+"
- `story_stat`: "One bad month is how debt starts"
- Uses `frame-2-stat.png` for both step 2 (poll) and step 3 (link).

**Quiz-style poll + answer reveal** (stronger funnel). Poll creates curiosity gap; step 3 reveals the answer *and* continues into the stat, then hands off to the blog via the link sticker for the "why".
- `story_poll_q`: "Which of these is NOT an emergency?"
- `story_poll_opts`: "Car breakdown | Broken phone | Flight deal | Medical copay"
- `story_stat`: "3 months · no income · how long do you last?"   *(rendered under the answer on `frame-2-answer.png`)*
- `story_answer`: "Flight deal to Bali"   *(top of `frame-2-answer.png`, under the "ANSWER" eyebrow)*
- Step 2 is backed by `frame-2-poll.png` (blank canvas) so nothing competes with the poll sticker.

The renderer emits `frame-2-poll.png` + `frame-2-answer.png` (instead of `frame-2-stat.png`) when `story_answer` is set.

### Quiz stickers deprecated
- Instagram has quietly removed quiz stickers from story composition. **Do not plan for quiz frames.**
- Multi-option **polls now support up to 4 options** — use those when you want the quiz-like "which of these" feel, then reveal the answer on step 3 using `story_answer`.
- `story_quiz_*` fields in existing frontmatter are ignored at render time and should be migrated to `story_poll_*` + `story_answer` when touched. New posts should not include `story_quiz_*` fields.

### Native stickers own the interaction
- Poll **question → native IG sticker, NOT the PNG.** Reference text is in `story_poll_q` / `story_poll_opts` — copy into the sticker when posting.
- PNG = brand-consistent backdrop
- Link sticker on step 3 → blog URL (especially important in quiz mode — the link is the payoff for the curiosity gap)
- Hashtag sticker (small, one per story, on step 1 only)

### Story captions (IG native caption field)
- Max ~10 words / 80 chars
- One per frame, where it adds value
- Include a keyword (feeds IG topic classifier + search indexing)
- Defined per frame in frontmatter as `story_caption_*`

### Story hashtags
- 1 per story max, on Frame 1 only (or wherever the hashtag most fits)
- Use the hashtag sticker (small, tucked in corner), NOT the caption field

---

## 8. Typography & Voice Rules

### Reduce em dashes in stories
- Em dashes (—) lump text together visually
- Prefer line breaks (block scalar `|`) or commas
- Em dashes OK in long-form `## Caption` prose

### Drop unnecessary periods in stories
- Stories: drop trailing periods on standalone lines
- Captions (prose): periods OK where sentences demand them
- Keep: decimal points (€4.50), apostrophes, question marks, commas doing structural work

### Line breaks in stories
- YAML block scalar `|` for multi-line values
- **Blank lines inside block scalar** for rhythm / breathing room
- `||` convenience marker works anywhere in value (single-line quoted strings too)
- Multiple blank lines are preserved (not collapsed) — `||||` = 2 blank lines, etc.

### Slide 1 hooks
- Same rules: short, minimal periods, no em dashes
- Question marks stay — they're the punch

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
- Bio link → swap daily to match the current day's post
- **Recommended:** build a `/basics` hub page listing all 16 discovery posts — lets Post 16b ("Discovery Complete") point to a single durable URL

---

## 10. Tool Chain

### Commands
```bash
npm run render-ig                                       # all posts
npm run render-ig "1. discovery/07-liquidity.md"        # single post
```

One command. Generates both carousel slides (1080×1080) and story frames (1080×1920) in a single pass with a shared browser instance.

### Files
| Path | Purpose |
|---|---|
| `scripts/render-ig.js` | Orchestrator; calls both renderers per post |
| `scripts/render-slides.js` | Carousel renderer (exports `renderSlides`) |
| `scripts/render-stories.js` | Story renderer (exports `renderStoriesForPost`) |
| `scripts/slide-template.html` | Carousel template (1080×1080) |
| `scripts/story-template.html` | Story template (1080×1920) |
| `scripts/lib/parse-markdown.js` | Frontmatter + content parser (YAML block scalar support + `||` convenience) |

### Output
```
output/instagram/{subdir}/{slug}/
├── slide-01.png … slide-NN.png           # carousel
└── stories/
    ├── frame-1-hook.png                  # (if story_hook defined)
    ├── frame-2-stat.png                  # default mode only (if story_stat defined, story_answer NOT defined); backdrop for step 2 poll + step 3 link
    ├── frame-2-poll.png                  # quiz mode only (if story_answer defined); blank canvas for step 2 poll sticker
    ├── frame-2-answer.png                # quiz mode only (if story_answer defined); ANSWER reveal + continuing stat, backs step 3 link
    └── frame-3-cta.png                   # (if story_prompt defined)
```

Stories auto-skip frames whose source field is absent. The `story_poll_*` fields stay in frontmatter as reference content to type into the native IG poll sticker when posting. Quiz stickers are no longer supported by IG — `story_quiz_*` fields are legacy and ignored.

---

## 11. Frontmatter Schema

```yaml
---
title: "Post title"
blog_url: "https://nidhi.today/blog/slug"
hashtags: "#a #b #c #d #nidhi"
post_time: "14:30 CET (Tue/Wed/Thu) — reasoning"

# Story content — reference for 4-frame story sequence on post day
story_hook: |
  Multi-line hook
  With line breaks

  Blank line for rhythm
story_stat: "Big number or fact. Default mode → backs step 2 poll + step 3 link (frame-2-stat.png). Quiz mode → rendered below the ANSWER reveal on frame-2-answer.png"
story_poll_q: "Question to type into native IG poll sticker"
story_poll_opts: "Option A | Option B | Option C | Option D"   # up to 4 options
# Presence of story_answer flips the post into quiz mode:
#   - Step 2 backdrop becomes frame-2-poll.png (blank canvas, no competing text)
#   - Step 3 backdrop becomes frame-2-answer.png — renders the ANSWER reveal
#     up top and the story_stat below as the continuing insight
# Omit story_answer for self-assessment polls (default mode).
story_answer: "The correct answer, as a bold reveal"
story_prompt: "Save/tag/share CTA text"

# Tiny captions for IG native caption field (paste when posting)
story_caption_hook: "..."
story_caption_poll: "..."
story_caption_stat: "..."
story_caption_cta: "..."

story_hashtag: "#one-story-tag"
---
```

### Parser features
- Simple `key: "value"` format (single-line)
- YAML block scalar `key: |` (preserves newlines)
- YAML folded scalar `key: >` (folds wrapped lines to spaces)
- `#` comment lines inside frontmatter are ignored
- `||` in any value is expanded to `\n\n` (one blank line) at render time

---

## 12. Decisions Log

Chronological log of decisions made during playbook development. Update as you iterate.

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
| 15 | Drop quiz stickers; use multi-option polls (up to 4) instead | IG quietly removed quiz stickers from story composition; polls now cover the "which of these" use case |
| 16 | Quiz-as-poll + answer-reveal pattern via optional `story_answer` | Recovers the quiz affordance under the new poll-only reality: curiosity-gap poll → reveal on the link-sticker frame → blog for the "why". Stronger funnel than self-assessment polls for educational content |
| 17 | Keep one stat backdrop for both step 2 + step 3; add `frame-2-answer.png` only for quiz posts | Attempted a split poll-specific backdrop earlier — decorative stat text on the poll PNG read as disconnected from the poll question/options. Cohesive stat content serves both stickers well; answer PNG only appears when a reveal is needed |
| 18 | **Quiz mode: blank poll backdrop + combined answer/stat frame** (supersedes #17 for quiz posts only) | Revisiting #17 in practice: on true quiz posts (`story_answer` set), the stat text *was* unrelated to the poll options — exactly the disconnect #17 meant to avoid. Fix: step 2 becomes a blank `frame-2-poll.png` (just brand chrome) so the poll sticker stands alone, and the stat moves onto `frame-2-answer.png` below the "ANSWER" reveal so the narrative continues under the link sticker instead of dropping. Default (self-assessment) mode still uses the single stat backdrop — #17 still applies there |
| 19 | In quiz mode, `story_stat` must *advance* from the answer, not echo the hook | Consequence of #18: now that `stat` renders directly under the answer reveal, any hook ↔ stat semantic overlap reads as the cascade restating itself. Rule of thumb: hook poses the premise, answer lands the reveal, stat introduces the *why* or the underlying principle. Audited posts 08/10/16 and rewrote each to forward-look (e.g. 08 stat "3 months · no income · how long do you last?" → "Unexpected · Urgent · Necessary"; 10 "Most people can't name 5 of their monthly expenses" → "Your savings rate predicts your wealth / Not your salary"; 16 "Same disaster · 30x cost difference" → "Your salary is your biggest asset / Protect it first"). 13 and 14 were already clean |
| 20 | Bump "ANSWER" eyebrow to 48px / weight 700 / full opacity | Original 32px @ 0.75 opacity read as decorative rather than a section label, so the reveal felt under-announced. Larger bolder full-opacity eyebrow sits as a clear "new frame, new beat" marker without competing with the answer text below |

---

## 13. Review Cadence

- **After 3 posts** → review reach vs. pre-playbook baseline; adjust timing and hashtag mix
- **After 6 posts** → if growth is slow, revisit engagement philosophy (consider ManyChat auto-DM for "comment X" flows)
- **After 10 posts (Discovery series complete — 08 through 16b)** → hold before Money in Action; iterate playbook based on what worked
- **Quarterly** → review hashtag landscape; niche tags shift faster than broad ones

---

## Appendix — Posts published vs. upcoming

**Published (pre-playbook or during):**
- 01 What Is Net Worth
- 02 How to Calculate Net Worth
- 03 Assets
- 04 Liabilities
- 05 How to Get Out of Debt
- 06 Appreciation vs. Depreciation
- 07 Liquidity *(first post under this playbook)*

**Upcoming (playbook applies):**
- 08 Emergency Fund
- 09 Income vs. Wealth
- 10 Cash Flow *(08:00 CET morning slot)*
- 11 Purchasing Power
- 12 Why Your Euro Buys More *(flagship Indian-diaspora post)*
- 13 Saving vs. Investing
- 14 Budgeting *(08:00 CET morning slot)*
- 15 Credit and Credit Scores
- 16 Insurance Basics
- 16b Discovery Level Complete *(milestone — 2-day story campaign)*
