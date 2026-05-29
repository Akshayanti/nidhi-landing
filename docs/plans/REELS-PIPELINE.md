# Reels pipeline (v2)

Faceless reels for nidhi.today blog posts. Cream editorial palette, kinetic
typography, karaoke captions, LLM-driven scripts. Rendered with Remotion.

> **Status (May 2026):** v2 rewrite shipped. Discovery first (Series 1: 16
> Basics posts), Building reels follow ~4 weeks behind carousels. Targets
> Instagram Reels + TikTok (1080×1920 9:16). 45–75s primary cut + 12–20s
> hook-cut byproduct.

---

## TL;DR — running it

```sh
# One-time setup
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env
nvm use 22                                    # node >= 22.12
npm install
python3 -m pip install --upgrade edge-tts     # if not already

# Render all Discovery reels (default level)
npm run render-reels

# Render one post
node scripts/render-reels.mjs emergency-fund

# Building reels
npm run render-reels:building

# Generate plans only (no TTS, no render)  — useful for fast LLM iteration
npm run reels:plan-only

# Force the script-writing mode
node scripts/render-reels.mjs --mode faithful  # tight summary of the post
node scripts/render-reels.mjs --mode riff      # concept-driven new framing
node scripts/render-reels.mjs --mode auto      # let Claude pick (default)

# Render all 3 hook variants for one post (for A/B testing)
node scripts/render-reels.mjs emergency-fund --variants-all

# Also render the 15-20s hook-cut byproduct (off by default)
node scripts/render-reels.mjs --hookcut
```

Outputs are organised per-level (mirrors `src/content/blog/`):

```
output/
├── videos/
│   ├── discovery/<slug>.mp4         ← final 45–75s clean cut
│   └── building/<slug>.mp4
├── thumbnails/
│   ├── discovery/<slug>.png         ← 1080×1920 cover (IG/TikTok cover, blog grid)
│   └── building/...
├── captions/
│   ├── discovery/<slug>.ig.txt      ← paste into Instagram
│   ├── discovery/<slug>.tiktok.txt  ← paste into TikTok
│   ├── discovery/<slug>.json        ← machine-readable
│   └── building/...
└── plans/
    ├── discovery/<slug>.json        ← LLM plan, kept for audit
    └── building/...
```

The 15–20s hookcut byproduct is **off by default** — opt in with `--hookcut`
when you want short-form A/B variants. Intermediate files (Remotion input
JSON, TTS mp3 + VTT) are deleted automatically after each successful render.

The 1080×1920 cover thumbnail (`<slug>.png`) is **on by default** — opt out
with `--no-thumbnail` for fast iteration loops. To re-emit thumbnails for
existing reels without re-rendering the mp4 (e.g. after a `Thumbnail.tsx`
style change), use `npm run render-thumbnails` which only needs the saved
plan JSON. Each thumbnail is a Remotion `renderStill` of the dedicated
`Thumbnail` composition (registered in `ReelComposition.tsx`'s Root): dark
navy canvas, SeriesChip top-left, optional stat kicker, oversized hook
headline auto-fitted to the longest line, "WATCH THE REEL ▶" + handle
bottom. ~5–8s wall-clock per still.

---

## Architecture

```
src/content/blog/{1. discovery,2. building}/<n>-<slug>.md
        │
        ▼  scripts/lib/parse-blog-meta.mjs  (level-agnostic loader)
{ meta, body }   ← FULL BODY: paragraphs, tables, blockquotes, figures
        │
        ▼  scripts/lib/llm-script-writer.mjs   (Claude Sonnet 4.5)
        │     • System prompt: brand voice, EU-leaning, anti-US, anti-India-only
        │       MiFID-safe, Save/Tag/Share/Poll CTA, no em dashes
        │     • 3 hook variants per post; LLM picks default
        │     • Modes: faithful (faithful summary) | riff (concept-driven new angle)
ReelPlan { hookVariants[3], beats[7-15], cta, caption{ig,tiktok}, hashtags[5] }
        │
        ▼  scripts/lib/scrub-output.mjs        (HARD brand-rule gate)
        │     • Auto-fix: em/en dashes, double-hyphen, multi-space
        │     • Reject: $/USD/dollar default, 401k/IRA/Roth/FICO/Fed,
        │       Walmart/Costco/Black Friday, lakh/crore/SIP, tickers,
        │       brokerages, return-as-fact, banned CTAs, banned hashtags
        │     • Throws if any unresolved violation → operator regenerates
        │
        ▼  scripts/lib/generate-tts.mjs        (Microsoft edge-tts)
        │     • Default voice: en-GB-RyanNeural (override: NIDHI_REEL_VOICE)
        │     • Rate +5%, pitch -2Hz for editorial-authority cadence
        │     • Acronym spellout (rewriteForTTS): APR/IRA/ISA/PAYE → A.P.R.
        │       etc. on the TTS-input side ONLY. The plan JSON keeps "APR"
        │       so on-screen text stays clean. Edge-tts otherwise reads
        │       "APR" as the calendar month "April".
        │     • One audio file per reel, word-level VTT timings
audio/<slug>.mp3  +  Array<WordTiming>
        │
        ▼  scripts/lib/generate-tts.mjs::alignSegments
beatSpans[]   (mapping each beat.id to a startMs/endMs in the audio)
        │
        ▼  scripts/lib/pick-music.mjs          (manifest-based picker)
        │     • Reads remotion/public/music/manifest.json
        │     • Deterministic per-slug pick keyed off plan.mood
        │     • DEFAULT: empty manifest = voice-only renders
        │
        ▼  scripts/lib/render-platform-caption.mjs
output/captions/<slug>.{ig,tiktok}.txt
        │
        ▼  remotion/src/render-single.ts        (Remotion bundle + render)
        ▼  remotion/src/ReelComposition.tsx
        │     • Beat-sequenced visuals, hard cuts at narration boundaries
        │     • Backgrounds: cream paper (default), navy (hook/CTA), amber (warning)
        │     • SeriesChip top-right (BASICS · 08/16) on every frame
        │     • HandleWatermark @nidhi.today bottom-right on body beats
        │     • SubtitleCaption pill bottom-center: 4-8 word chunks, fade-in per chunk
        │     • 8 beat-layout primitives:
        │         stat, compare, list, number-counter,
        │         definition, story/example, warning, transition
        │     • 5 hook-layout primitives:
        │         big-number, question, contradiction, scenario, quote
output/videos/<slug>.mp4   (h264, 1080×1920, 30fps, ~45–75s)
output/videos/<slug>-hookcut.mp4   (12–20s short)
```

---

## What changed vs v1

The v1 pipeline was deterministic regex extraction of the blog post → static
gradient slides → monotone Aria voiceover. v2 replaces this with:

| Layer | v1 | v2 |
|---|---|---|
| Script | Regex on first paragraph + table mining | Claude Sonnet reads the WHOLE blog body and writes a concept-aware plan |
| Hook | First sentence of post, truncated to 100 chars | 3 LLM-authored hook variants (5 layouts), operator picks |
| Body | "Key points" = chart column titles | 7-15 narrative beats, 8 layout primitives |
| Voice | en-US-AriaNeural (presentation narrator) | en-GB-RyanNeural at +5% rate (editorial authority) |
| Captions | KaraokeCaption written but never imported (dead code) | SubtitleCaption pill, movie-subtitle style 4-8 word chunks |
| Visuals | Material-Design deep-blue gradient + hairline charts | Cream editorial palette (Series 2), kinetic typography, beat-paced anchors |
| Cuts | 6s hook + 8s per visual + 4s per text | 1.5–4s per beat, hard cuts at narration boundaries |
| Branding | CTA hash-picked from 4 generic lines | Save/Tag/Share/Poll only; SeriesChip BASICS·08/16 + HandleWatermark on every frame |
| Captions for socials | None | output/captions/*.ig.txt + tiktok.txt with brand-compliant 5-tag set |
| Music | None (and no architecture for it) | Optional, manifest-driven, defaults to voice-only |
| Brand rules | None enforced | Hard-gated scrubber: 28 unit tests, throws on violation |

---

## Brand rules (hard-enforced)

The scrubber `scripts/lib/scrub-output.mjs` is a non-bypassable gate before
TTS. If the LLM emits anything in these categories, the renderer halts:

- **Dashes** (em `—`, en `–`, double `--`) → auto-replaced with comma or period.
  Reason: blog-content-plan.md:71 — "they scream 'generated text' when overused".
- **US-only finance**: 401(k), IRA, Roth, FICO, Social Security, HSA, 529,
  W-2, IRS, Federal Reserve, Wall Street, Medicare, Medicaid, ACA.
- **US currency**: `$` prefix, `USD`, `dollar(s)` (except in explicit `USD/EUR`
  conversion contexts).
- **US retailers / culture**: Walmart, Costco, Whole Foods, CVS, Walgreens,
  Trader Joe's, Best Buy, Thanksgiving, Black Friday, Super Bowl, Memorial
  Day, Labor Day, July 4th, Cyber Monday, Silicon Valley.
- **India-only finance**: lakh, crore, paisa, SIP, ELSS, PPF, EPF, NPS,
  #desifinance, #indiansineurope, #indianfinance.
- **MiFID**: tickers (`$XYZ`), named brokerages (Vanguard, Fidelity,
  Robinhood, Trading 212, Degiro, Trade Republic, Schwab, eToro, etc.),
  return-as-fact phrasing ("stocks return X%", "guaranteed N%").
- **Banned CTAs**: "comment X for Y", "DM me", "follow for more", "first N
  comments", "link in bio NOW". Approved CTAs: **Save / Tag / Share / Poll**.
- **Hashtag cap**: max 5. Banned tags: desifinance, indiansineurope,
  indianfinance, americanexpat, 401k, IRA, Roth, FICO, fyp, foryou,
  foryoupage. Saturated tags (banned per PLAYBOOK): personalfinance,
  financialliteracy, moneytips.
- **Hashtag rotation (May 2026 cohort-fight protection)**: slots 1+2 are
  mandatory `#nidhi` + `#nidhibasics` / `#nidhibuilding`. Slot 3 is the
  topic-specific niche tag, unique per post. Slots 4+5 rotate from a wider
  community/audience/topic-axis pool — no anchor may run on more than ~3
  posts in a 16-post series. PLAYBOOK §30 documents the regression: when
  12 of 16 Discovery reels shared `#expatfinance`, IG anchored the account
  to one cluster and stalled non-follower reach. Pre-flight audit script:
  `node -e '...' | sort | uniq -c | awk "$1>3"`.
- **IG keyword block (May 2026 search surface, separate from hashtags)**:
  `caption.instagramKeywords` is a 13–18 item array of multilingual search
  phrases that renders as a bracketed block after the hashtag line in
  `.ig.txt`. Hashtags = community-follow surface; keywords = search-query
  index. Scrubber rejects: count <13 or >18, leading `#` symbols, terms
  that duplicate the hashtag list (token-collapse comparison), banned
  terms. EN must dominate the count vs any single non-EN language
  (PLAYBOOK §3 cohort-balance rule).
- **TikTok extras (May 2026)**: `caption.tiktokTopics` is a 3–5 item array
  of natural-language English search-query phrases, rendered as a single
  `Topics: phrase1, phrase2, ...` line above the hashtag wave in
  `.tiktok.txt`. `caption.tiktokExtraTags` is a 0–3 item array of
  TikTok-native niche hashtags appended to the TikTok caption ONLY (IG
  enforces a 5-cap; TikTok tolerates 5–7). Banned: `fyp`, `foryou`,
  `foryoupage`. Scrubber rejects: tiktokTopics byte-equal to instagramKeywords
  (signals lazy authoring), tiktokExtraTags duplicating the main hashtag
  list, count violations.
- **Collapsed numeric ranges**: when narration says "X to Y" (digit form
  *or* word form: "five to fifteen", "70 to 85%"), the corresponding
  `anchor.value`, `anchor.label`, `subtext`, and `onscreenText` MUST
  preserve the range with a separator ("5-15%", "5 to 15%", or use a
  `compare` anchor with two cards). The scrubber's
  `collapsed-numeric-range` rule (`detectCollapsedRange` in
  `scripts/lib/scrub-output.mjs`) will reject any plan where the field
  collapses the digits into a fused number ("515%", "7085%"), because on
  screen that reads as "five hundred and fifteen percent" and contradicts
  the narration. Discovered May 2026 after a satellite-assets reel rendered
  "5-15% combined" as "515%". Caught at the gate now; covered by 8 unit
  tests.

Run the scrubber tests in CI:

```sh
npm test    # includes scripts/lib/scrub-output.test.mjs (28 tests)
```

---

## Editorial doctrine (HARD — LLM-enforced via the system prompt)

The brand rules above are mechanical (term blocklists, count caps, surface
formatting). The doctrine in this section is *editorial*: voice, register,
framing, and how a reel earns the viewer's attention. These rules are baked
into the system prompt in `scripts/lib/llm-script-writer.mjs` so the LLM
enforces them per-call, but they're documented here so an operator (or
future-you) doesn't have to re-derive them every session.

### 1. Engagement first — "boring and professional" is the failure mode

The earliest v2 reels were tight, accurate, on-brand, and unwatchable. They
read like an annual report set to TTS. The diagnosis came from a real-world
test viewer: *"these are super boring and professional, and not engaging
enough."* That feedback is the highest-priority constraint on every reel.

A reel must feel like someone TELLING you something — a friend at a kitchen
table, not a presenter at a deck. If the first three sentences sound like a
textbook, an annual report, a bullet list, or a finance influencer's "5
things you need to know" — they are wrong. Rewrite as a small story. Use a
person, a place, a moment, a question, an image. Always.

This principle outranks every other framing rule below. If a doctrine pick
collides with engagement (e.g. "Building defaults to numerical contrast"
producing a boring opener), engagement wins.

### 1b. Narrative carry-through

A hook that disappears after sentence 3 leaves the reel feeling like a deck
with a cute cover slide. Discovery reels work because the wolf comes back,
the brick house comes back, the goose comes back. The opener's metaphor is
the reel's spine.

- If the opener introduces a CHARACTER (Maya, Jakub, Ana), bring them back
  at least TWICE in the body beats — as a continuing scene, not as a
  lecture target. ("Six months later, Maya checks her balance.")
- If the opener uses a FABLE or MYTH, weave the same image through 2-3
  mid-beats and the closer ("the wolf came again", "the breadcrumb trail
  picked up").
- If the opener uses a FAMILIAR-LIFE METAPHOR (umbrella vs sunscreen,
  packing for one season), keep that same prop active across beats. Don't
  switch metaphors mid-reel.
- The closer beat (the one before the CTA) MUST land the opener's image
  one final time. That's what makes a reel quotable.

The audit signal: a hook that names a person or a parable and never
references them again. That reads worse than no hook at all because it
advertises a payoff it doesn't deliver.

### 1c. Body-beat shape — the dryness fight

The opener carries warmth. The CTA carries the ask. The BODY is where reels
go dry. Building reels that read as "boring and professional" share the same
body shape: 5+ definition / category-explanation beats wedged between a warm
hook and a warm closer. The fix is structural, not decorative.

**Engagement supremacy.** The rules in this section are diagnostic, not
adversarial. A plan that satisfies every hard gate below and still reads
like an annual report has failed — engagement (1 above) is the only test
that matters. If a rule below collides with warmth on a specific reel, the
engagement-first principle wins. The rules exist to break the encyclopedia
default; they do not exist to be engineered around. *If we can't make the
audience feel engaged, we don't attract them.*

**Beat-kind budget.** Across the whole reel, beats with kind ∈ {definition,
list} MUST NOT exceed 2 combined. Most reels should have at most 1
definition beat (often zero — definitions belong on the blog). The reel is
the hook; the blog is the explainer.

**Showing minimum.** At least 4 body beats must SHOW, not TELL. A "showing"
beat is one of: kind="story" with a continuing scene; kind="example" where a
named character does/sees/says something specific; kind="comparison" where
two named people / two named offers / two specific moments are juxtaposed;
kind="warning" framed as a moment a real person notices. Decontextualised
stats and abstract rules count toward the cap but NOT toward this minimum.

**Recurring scene / character requirement.** If Variant 0's hook names a
character (Maya, Jakub, Ana, Lukas) or sets a scene, that name or scene
MUST appear:

- At least twice in the body beats by name — not "she" / "you", the actual
  name. Or the scene continues explicitly ("Six months later", "Back at the
  kitchen table").
- Once in the closer beat or in the CTA narration. The reel finishes where
  it started.

If the hook is a **public-domain fable** (~12 of the 16 Building reels open
this way under the current manifest — fables are the default register here,
not the exception), the fable's character and image carry through under the
same recurrence rule. The fox
keeps appearing. The reed keeps bending. Sisyphus keeps pushing the boulder.
A fable that disappears after beat 1 is the same failure as a Maya hook
that disappears after beat 1.

If the hook is a parable / dilemma / quotable observation (no character, no
fable), the central METAPHOR must recur with the same rule.

**Banned meta-narration phrases.** These are encyclopedia tells. They
literally announce the dry section is starting. Never use them in any
narration field:

- "Here's the math" / "Here's the worked math" / "Let's run the numbers"
- "Three methods exist" / "There are four ways" / list-of-N openers
- "Let's break it down" / "Let's unpack this" / "Here's what you need to
  know"
- "First… Second… Third…" as a sequence of beat narrations
- "Now let's look at…" / "Moving on to…" / explicit transition prose

If a beat is genuinely a transition between two scenes, write the next
scene's first sentence — that IS the transition.

**The screenshottable-body test.** Read each body beat's narration on its
own. Would a viewer screenshot this sentence? Quotable sentences are
specific (a person, a place, a number that reveals something), short, and
have a small rhythm. Generic sentences ("Diversification reduces risk by
spreading investments across asset classes") fail the test even when true.
At least HALF of the body beats should pass.

The dryness audit signal: a reel where ONLY the hook and CTA pass the
screenshottable test, and the 12 body beats fail it. That is the failure
mode the audience flagged after the first Building batch.

**Pre-commit read-aloud test.** Before the LLM emits the plan (and before
the operator approves a hand-edit), the full reel script — hook, every
body beat, CTA — must be read out loud as one continuous voice piece. The
three questions:

1. Is there any beat where attention drops? Rewrite it.
2. Does the closer give the same feeling the hook promised? If no,
   rewrite the closer.
3. If this reel auto-played while scrolling, would viewing continue past
   the third sentence? If no, the hook is wrong — pick a different opener.

The viewer never sees beat-kind labels or fable names. They experience the
spoken script as a single continuous piece. Optimise for that experience.
Structural rules are downstream effects, not the goal.

### 2. Reel-vs-blog division of labour

The reel is the **hook**, not the tutorial. It exists to get someone
interested enough in the topic to click through to the blog post for the
proper treatment. The blog is where the math, the tables, the edge cases,
the jurisdictional nuance, and the worked compound-interest examples live.
The reel's job is the spark.

- DO: name the problem in plain language. Make the viewer feel "I want to
  understand this."
- DO: land ONE memorable thought per beat.
- DO NOT: try to fully teach the topic. The CTA scene's READ row sends the
  viewer to the blog for that.
- DO NOT: cram numerical detail "for completeness". Completeness lives on
  the blog.

### 3. Math-literacy guard

Do NOT assume the viewer is proficient at math. The reel must land for an
intelligent reader who is rusty with percentages, compounding, ratios, and
multi-step arithmetic. Concretely:

- NEVER ask the viewer to compare two compound-growth figures in their head
  ("at 7% real, €567,000; at 4% real, €347,000" — out).
- NEVER stack multiple percentages in one beat ("a 25% drag on a 7% return
  over 30 years"). One number per beat.
- Prefer absolute euros over percentages where both work ("€60 a month"
  beats "1.2% of salary").
- Prefer round, memorable numbers ("about €10,000" beats "€10,247").
- Worked examples are presented as ALREADY-COMPUTED results with the
  assumption stated in plain English, never as a calculation the viewer is
  asked to follow.
- Percentages are allowed only when they map to a familiar mental model:
  "1 in 3" (33%), "half" (50%), "3 in 4" (75%). Skip "23.7%" — round or
  rephrase.
- Hard cap: max 3 stat / number-counter beats across the whole reel. Most
  beats are word-driven with a single noun-phrase anchor.

### 4. Series-progression doctrine — same warmth, broader sources

The 5 levels are a maturity ladder. Each level meets the reader where they
now are. The framing changes; the warmth never does.

| Level | Reader is | Default opener register | Public-domain fable usage |
|---|---|---|---|
| Discovery (1-16, "Basics") | New to personal finance. Needs comfort + memorable hooks. | Public-domain fable / myth / parable scaffold. | DEFAULT — open ~50-70% of reels with a fable. |
| Building (17-32, "Money in Action") | Has the basics. Now making concrete decisions: which fund, which loan, what target. | Public-domain fable (default, ~12 of 16 — see manifest) when the fable maps tightly to the topic; named-expat vignette in a eurozone city for the ~4 reels where no Discovery-clean fable fits. | TARGET ~12 of 16 fable openers. Per-reel assignment lives in `scripts/lib/opener-assignments.json` and is injected into the LLM user message as a HARD opener directive. Each fable used at most ONCE in the level. NEVER reuse a Discovery fable. |
| Psychology (33-42) | Behavioural prep before optimisation. | Named cognitive bias illustrated through a one-paragraph case vignette. | Rare. Research-anchored case beats fable. |
| Optimizing (43-54) | Has the plan. Now tuning it. | Counter-intuitive practitioner scene; the data lands inside the story. | Never as the opener. |
| Mastery (55-66) | Building or running their own framework. | Practitioner anecdote, acknowledged trade-off, "textbooks vs practice" framing. | Never as the opener. |

Why this matters: viewers who graduated from Discovery have already absorbed
the Aesop register. Repeating Three Pigs / Tortoise / Goose in Building reads
as "the brand didn't move on with me." But REMOVING the story shape entirely
reads as "the brand got dry once it started talking about money I actually
have to deal with." The fix is BROADER STORY SOURCES, not less story.

### 5. Public-domain fable rules (when used at all)

- Public-domain only. Aesop, Greek/Roman myth, Andersen, Grimm, La Fontaine,
  Lao Tzu, English folk tales, Arabian Nights, Panchatantra, Jataka tales.
  NEVER reference modern IP (Disney, Pixar, Marvel, copyrighted retellings,
  named living authors).
- Globally recognisable. Test: would a reader in Lisbon, Berlin, Bangkok,
  Lagos, Buenos Aires, Manila recognise the story? If only Westerners would,
  pick another.
- The fable is a SCAFFOLD, not the lesson. Every beat must still teach the
  actual financial concept from the post.
- Document the fable choice in `assumptions.notes`: *"<Fable name> used as
  narrative framing only; the substantive guidance matches the source post."*
- One-fable-per-reel HARD CAP. Never thread two fables through one reel.

**Already burned in Discovery — never reuse for any later level:**

| Discovery post | Fable |
|---|---|
| 03 Assets | The Emperor's New Clothes (Andersen) |
| 04 Liabilities | The Sorcerer's Apprentice (Goethe / Dukas) |
| 06 Appreciation vs Depreciation | The Tortoise and the Hare (Aesop) |
| 07 Liquidity | King Midas (Greek myth) |
| 08 Emergency Fund | The Three Little Pigs (English folk tale) |
| 09 Income vs Wealth | The Goose with the Golden Eggs (Aesop) |
| 13 Saving vs Investing | The Ant and the Grasshopper (Aesop) |
| 14 Budgeting | Belling the Cat (Aesop) |
| 15 Credit Scores | The Boy Who Cried Wolf (Aesop) |

When generating reels for later series, this list is reproduced verbatim in
the system prompt's "ALREADY USED" forbidden-fable list. Add new entries to
*both* places (this table AND the system prompt) every time a fable is burned
on a reel that ships, so future series stay fresh.

### 6. Discovery is the phrasing canon

For every series after Discovery, match Discovery's rhythm and warmth, just
with different story sources:

- Spoken sentences are short. 5-12 words median.
- A worked example arrives ONCE, with the result already computed, in round
  numbers, framed in plain English. *"Imagine essentials of two thousand a
  month. Six months of cushion is twelve thousand."*
- The reel feels like someone telling you something.
- The CTA scene's READ row sends the viewer to the blog. The reel doesn't
  try to be exhaustive; it tries to be remembered.

### 7. Where this is enforced

- **Authoritative source**: `scripts/lib/llm-script-writer.mjs` `SYSTEM_PROMPT`
  constant (sections "Engagement-first principle", "Series progression
  doctrine", "Reel-vs-blog division of labour", "Math-literacy rule",
  "Public-domain fable rules", "Building-specific opener guidance").
- **Operator-readable summary**: this section.
- **Audit trail**: `output/plans/<level>/*.json` `assumptions.notes` field
  records the fable choice (or lack of one) per reel.

When the doctrine evolves, change BOTH the system prompt AND this section.
Drift between them produces reels that don't match operator expectations.

---

## Series anchoring policy (counter-intuitive)

**Don't put series mention in the spoken hook.** The 0–3s hook window decides
completion rate (the 2026 IG/TikTok dominant metric). Spoken series
anchoring ("Part 8 of 16…") burns that window. Instead:

1. **On-screen chip**: `SeriesChip` (top-right, 90% transparent) reads
   `BASICS · 08 / 16` on every frame. Costs no spoken time. Implemented in
   `remotion/src/components/SeriesChip.tsx`.
2. **Caption first sentence after hook restate**: LLM is prompted to include
   *"Part of the Basics series, sixteen short reels covering personal finance
   from scratch."*
3. **Hashtag**: `#nidhibasics` (Discovery) or `#nidhibuilding` (Building) is
   mandatory in the 5-tag set, alongside `#nidhi`.
4. **Instagram Series feature**: in the IG composer, mark the reel as part of
   the relevant Series. This is a manual step until we automate the IG API
   (out of scope for v2).

---

## Voice tuning

Default voice is **`en-GB-RyanNeural`**: UK male, conversational, editorial.
Override per render:

```sh
NIDHI_REEL_VOICE=en-GB-SoniaNeural npm run render-reels    # UK female
NIDHI_REEL_VOICE=en-IE-ConnorNeural npm run render-reels   # Irish male
NIDHI_REEL_RATE=+8% npm run render-reels                    # snappier
NIDHI_REEL_PITCH=+0Hz npm run render-reels                  # disable pitch tweak
```

Aria (the v1 default) is intentionally NOT used. It reads as a presentation
narrator and was the single biggest cause of the "presentation with
voiceover" feel.

---

## Music (optional, default off)

Voice-only is the default. Music architecture exists; manifest is empty.

Why off-by-default:
- Voice clarity preserved 100%.
- Editorial-authority brand voice is better served by clean voice + kinetic
  type than by a music bed.
- Top-performing 2026 finance creators (Morning Brew, Smart Nora, How Money
  Works) lean voice-forward.

To enable, drop royalty-free instrumental tracks into
`remotion/public/music/<mood>/` and add entries to `manifest.json`. See
`remotion/public/music/README.md` for licensing sources and mix discipline.

---

## Content cadence (May–July 2026)

| Week | Carousels | Reels (new) |
|---|---|---|
| May 19–22 | Discovery wrap (last 1–2) | none (rewrite shipping) |
| May 25–29 | Building #17–19 | **Discovery reels #1–3** (back-fill) |
| Jun 1–5 | Building #20–22 | Discovery reels #4–6 |
| Jun 8–12 | Building #23–25 | Discovery reels #7–9 |
| Jun 15–19 | Building #26–28 | Discovery #10–12 + **Building reels #17–18 start** |
| Jun 22–26 | Building #29–31 | Discovery #13–16 + Building #19–22 |
| Jun 29–Jul 3 | Building #32 / wrap | Building #23–28 |
| Jul 6–10 | Optimizing prep | Building #29–32 wrap |

3 reels/week (Tue/Wed/Thu 14:30 CET — `PLAYBOOK.md:25-44`). Each reel ships
with a 12–20s hookcut byproduct, doubling content volume for stories /
TikTok-only A/B slots.

---

## Operator runbook

### First reel of a new post

```sh
# 1. Generate plans only (cheap, fast)
node scripts/render-reels.mjs <slug> --plan-only

# 2. Inspect output/plans/<slug>.json
#    Look for: hook concept, beat order, CTA fit, hashtag relevance

# 3. If unhappy with hook, rerun with a different variant
node scripts/render-reels.mjs <slug> --variant 1 --plan-only
node scripts/render-reels.mjs <slug> --variant 2 --plan-only

# 4. Once happy, render the chosen variant + hookcut
node scripts/render-reels.mjs <slug> --variant 0
```

### Brand-rule violation hit

```
Brand-rule violations detected (1):
  1. [us-only-term] beats[3].narration: "401k"
     → Use EU framing: 'workplace pension', ...
```

The plan was already saved to `output/plans/<slug>.json` for inspection.
Either:
- Hand-edit the plan and re-run the orchestrator with `--use-plan` *(not
  yet implemented; for now: regenerate with stronger prompt directive)*
- Re-run the LLM call: `node scripts/render-reels.mjs <slug>` (new draft)

### LLM cost estimate

Each reel = 1 Claude Sonnet 4.5 call, ~5–8k input tokens (full blog body),
~2–3k output tokens. At list price (~$3/Mtok in, ~$15/Mtok out) that's
roughly **$0.05–$0.08 per reel**. 32 reels (Discovery + Building) ≈ $2.

### What to commit

- ✅ `scripts/`, `remotion/src/` — all source
- ✅ `output/plans/{discovery,building}/*.json` — useful for diffing LLM output
- ✅ `output/captions/{discovery,building}/*.{txt,json}` — ready to paste, no PII
- ❌ `output/videos/{discovery,building}/*.mp4` — gitignored (large binaries)
- ❌ `remotion/public/audio/*.mp3` — gitignored (auto-deleted after render)
- ❌ `remotion/public/figures/*.png` — gitignored (rebuilt by `npm run render-figures`)
- ❌ `remotion/outputs/*.json` — gitignored (auto-deleted after render)

---

## Testing

```sh
# Unit tests: brand-rule scrubber, blog-meta parser, VTT parser
npm test

# Smoke test: full pipeline minus the Anthropic call (fixture-driven)
node scripts/smoke-render.mjs            # full + hookcut renders
node scripts/smoke-render.mjs --no-render  # plan + scrub only

# Type-check the Remotion side
cd remotion && npx tsc --noEmit
```

---

## Known limitations / future v3 candidates

1. **edge-tts is fast and free but the voice is still TTS.** ElevenLabs at
   ~$0.30/min would be the next quality jump. Architecture supports a swap.
2. **No B-roll layer.** Kinetic typography is carrying the whole visual
   load. Adding a `Video` layer behind beats (with a `pick-broll` analogue
   to `pick-music`) is the highest-leverage v3 visual upgrade. Brand rule:
   no AI-generated B-roll (PLAYBOOK avoid list).
3. **No transitions between beats.** Hard cuts only. `@remotion/transitions`
   is installed but unused. Could add wipe/slide between same-variant beats
   without losing pacing.
4. **No automatic Instagram Series API integration.** Reels still need to
   be marked as part of a Series in the IG composer manually.
5. **Hookcut beat selection is heuristic** (highest-density 2 beats by
   `kind` score). A "best clip" heuristic that watches the full reel and
   picks based on word-density / on-screen-anchor presence would be better.
6. **Word-level timings are linear-interpolated** from edge-tts phrase-level
   VTT, not true forced-alignment. Captions feel slightly off on long
   beats. Replace with `whisperx` or `faster-whisper` if quality bites.
