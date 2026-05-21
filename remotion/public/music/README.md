# Reel music beds

> **Default: no music.** The manifest ships empty by design. Reels render
> voice-only, which preserves voice clarity, suits the editorial-authority
> brand voice ("Money, understood"), and avoids the over-musicked
> finance-bro sound that audiences increasingly skip in 2026. Adding a music
> bed is opt-in.

This folder holds royalty-free music tracks layered under reel voiceovers.
The picker is `scripts/lib/pick-music.mjs`. Manifest is `manifest.json`.

## When to add music

Add tracks when:
- Voice-only renders feel under-paced after seeing the first 2–3 reels in the
  feed (algo perception, not ours, is what matters).
- You want a specific aspirational mood for FIRE / wealth-building hooks
  (mood: `bold`).
- Story / scenario beats feel emotionally flat without atmosphere.

Do NOT add music if:
- The voice is already carrying the energy (good kinetic typography + a
  warm voice often does).
- You can't validate the loudness mix end-to-end (see "Mix discipline" below).

## Mix discipline (the only reason to be careful)

Music dulls audio quality only when:
1. **Frequency masking**: music has lots of energy in 200–4000 Hz (where
   the voice lives). Piano mid-range, vocals, busy strings.
   **Fix**: pick instrumental tracks with sparse mid-range — sub-bass pads,
   high shimmer, percussive low-end only.
2. **Triple compression**: edge-tts mp3 → mixed mp3 → h264 AAC re-encode
   smears transients three times.
   **Fix**: for music renders, bump `crf` and audio bitrate in
   `remotion/src/render-single.ts` (defaults are tuned for voice-only).
3. **Loudness war**: music mastered too hot relative to voice creates
   pumping ducks.
   **Fix**: keep `MUSIC_DUCK_GAIN ≈ 0.10–0.15` (set in
   `remotion/src/data.ts`). Never go above 0.20.

## Folder convention

```
music/
  manifest.json
  calm-authority/
    01-name.mp3
  curious/
  reflective/
  urgency/
  bold/
  warm/
```

## Adding a track

1. Download a royalty-free track. Recommended free sources:
   - **Pixabay Music** (no account required, CC0): https://pixabay.com/music/
   - **Mixkit** (free, attribution-free): https://mixkit.co/free-stock-music/
   - **YouTube Audio Library** (download requires a Google account, free for any platform): https://studio.youtube.com/ → Audio library
2. Save the file as `music/<mood>/<slug>.mp3`. Keep it 60–90s minimum so it
   covers a full reel without obvious looping.
3. Add an entry to `manifest.json`:
   ```json
   {
     "file": "music/calm-authority/01-paper-trail.mp3",
     "moods": ["calm-authority", "reflective"],
     "bpm": 90,
     "license": "Pixabay",
     "attribution": "(if required by license)"
   }
   ```
4. The picker uses `hash(slug) % tracks_for_mood` so renders stay reproducible.

## Mood guide

| mood | use for | feel |
|---|---|---|
| `calm-authority` | most explainer reels (default) | low BPM piano + soft pad |
| `curious` | hypothesis / question hooks | light strings / pluck |
| `reflective` | story or warning beats | minimal solo piano |
| `urgency` | "stop / wait" hooks; deadline beats | low pulse, no melody |
| `bold` | big-number reveals; FIRE-type aspirational | cinematic builds |
| `warm` | onboarding / community CTAs | acoustic guitar, soft brass |

## Volume & ducking

Music is rendered at `MUSIC_DUCK_GAIN = 0.13` (~ -18 dB) under the voiceover
and `MUSIC_FULL_GAIN = 0.35` (~ -9 dB) during the silent intro tail. Override
in `remotion/src/data.ts` if needed.

## Brand-rule reminders

- **No vocals**. Music must be instrumental.
- **No copyrighted commercial tracks** (TikTok's commercial music library
  cannot be re-used in self-rendered MP4s).
- Avoid genre clichés: phonk drums, "money flex" trap, lo-fi anime. They
  fight the editorial voice.
