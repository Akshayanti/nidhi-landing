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

Run the scrubber tests in CI:

```sh
npm test    # includes scripts/lib/scrub-output.test.mjs (28 tests)
```

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
