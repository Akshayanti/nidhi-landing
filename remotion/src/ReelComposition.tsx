import {
  Audio,
  Composition,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BrandBackground } from "./components/BrandBackground";
import { KineticHook } from "./components/KineticHook";
import { BeatScene } from "./components/BeatScene";
import { CTAScene } from "./components/CTAScene";
import { SubtitleCaption } from "./components/SubtitleCaption";
import { SeriesChip } from "./components/SeriesChip";
import { Thumbnail, makeDefaultThumbnailPlan } from "./Thumbnail";
import {
  FPS, WIDTH, HEIGHT, MUSIC_DUCK_GAIN, MUSIC_FULL_GAIN,
  type ReelInput, type Beat,
} from "./data";

interface Props {
  input: ReelInput;
}

/**
 * Convert a ms span to a frame range relative to the global timeline.
 */
function msToFrames(ms: number, fps: number) {
  return Math.round((ms / 1000) * fps);
}

/**
 * Plan the composition layout.
 *
 * Input has segment spans in ms (hookSpan, beatSpans, ctaSpan). We slightly
 * pad each segment so the visuals appear ~3 frames before narration starts
 * and persist ~3 frames after, which matches how viewers' eyes lead audio.
 */
function planLayout(input: ReelInput, fps: number) {
  const PRE_PAD = Math.round(fps * 0.10); // 100ms
  const POST_PAD = Math.round(fps * 0.18); // 180ms

  // Filter beats if hookcut.
  const activeBeats = input.cut === "hookcut" && input.hookcutBeatIds
    ? input.plan.beats.filter(b => input.hookcutBeatIds!.includes(b.id))
    : input.plan.beats;

  const activeBeatSpans = input.beatSpans.filter(s =>
    activeBeats.some(b => b.id === s.beatId)
  );

  const segments: Array<{
    kind: "hook" | "beat" | "cta";
    beat?: Beat;
    fromFrame: number;
    durationInFrames: number;
    /** For audio offset in hookcut mode (always 0 for full mode). */
    audioOffsetMs: number;
  }> = [];

  // For hookcut mode we re-layout all segments end-to-end with a tight gap
  // and re-mount the audio per segment using its original time span. For
  // full mode, segments use their original timestamps directly so the
  // audio plays continuously.
  if (input.cut === "full") {
    const hookFrom = Math.max(0, msToFrames(input.hookSpan.startMs, fps) - PRE_PAD);
    const hookEnd = msToFrames(input.hookSpan.endMs, fps) + POST_PAD;
    segments.push({
      kind: "hook",
      fromFrame: hookFrom,
      durationInFrames: hookEnd - hookFrom,
      audioOffsetMs: 0,
    });

    for (const span of activeBeatSpans) {
      const beat = activeBeats.find(b => b.id === span.beatId)!;
      const from = Math.max(0, msToFrames(span.startMs, fps) - PRE_PAD);
      const end = msToFrames(span.endMs, fps) + POST_PAD;
      segments.push({
        kind: "beat",
        beat,
        fromFrame: from,
        durationInFrames: end - from,
        audioOffsetMs: 0,
      });
    }

    const ctaFrom = Math.max(0, msToFrames(input.ctaSpan.startMs, fps) - PRE_PAD);
    const ctaEndAudio = msToFrames(input.ctaSpan.endMs, fps);
    // Hold the CTA scene a bit after audio ends so the handle is visible.
    const ctaEnd = ctaEndAudio + msToFrames(1500, fps);
    segments.push({
      kind: "cta",
      fromFrame: ctaFrom,
      durationInFrames: ctaEnd - ctaFrom,
      audioOffsetMs: 0,
    });

    return { segments, totalFrames: ctaEnd, fullAudio: true };
  }

  // -- hookcut mode: stitch hook + selected beats + CTA into a tight reel --
  let cursor = 0;
  const GAP = msToFrames(80, fps); // 80ms gap between segments

  const hookDur = msToFrames(input.hookSpan.endMs - input.hookSpan.startMs, fps) + POST_PAD;
  segments.push({
    kind: "hook",
    fromFrame: cursor,
    durationInFrames: hookDur,
    audioOffsetMs: input.hookSpan.startMs,
  });
  cursor += hookDur + GAP;

  for (const span of activeBeatSpans) {
    const beat = activeBeats.find(b => b.id === span.beatId)!;
    const dur = msToFrames(span.endMs - span.startMs, fps) + POST_PAD;
    segments.push({
      kind: "beat",
      beat,
      fromFrame: cursor,
      durationInFrames: dur,
      audioOffsetMs: span.startMs,
    });
    cursor += dur + GAP;
  }

  const ctaDur = msToFrames(input.ctaSpan.endMs - input.ctaSpan.startMs, fps) + msToFrames(1200, fps);
  segments.push({
    kind: "cta",
    fromFrame: cursor,
    durationInFrames: ctaDur,
    audioOffsetMs: input.ctaSpan.startMs,
  });
  cursor += ctaDur;

  return { segments, totalFrames: cursor, fullAudio: false };
}

/**
 * Root-level karaoke caption layer.
 *
 * IMPORTANT: this component is rendered at the COMPOSITION ROOT (outside any
 * Sequence) so `useCurrentFrame()` returns the true global frame. If it were
 * placed inside a Sequence, useCurrentFrame() would return the sequence-local
 * frame and the captions would re-start from word[0] on every beat boundary.
 *
 * The active beat (and therefore the emphasis word list + the variant for
 * dark vs paper backgrounds) is derived from `beatSpans` based on the
 * current global time.
 */
function RootCaptionLayer({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // For full-cut mode, frame → ms is direct. For hookcut, we don't render the
  // root caption layer at all (per-segment audio is gated inside each Sequence
  // and captions there don't need a global timeline). The orchestrator
  // currently only emits "full" cuts by default.
  if (input.cut !== "full") return null;

  const currentTimeMs = (frame / fps) * 1000;

  // Subtitle variant follows the canvas of the currently-playing panel:
  // dark on the hook (and CTA, but CTA suppresses the pill anyway), paper
  // on body beats. This keeps the pill legible on whichever surface it
  // lands on — high-contrast white-ink on cream during body, light pill
  // on navy during hook.
  let variant: "paper" | "dark" = "paper";
  let emphasis: string[] = [];

  if (currentTimeMs < input.hookSpan.endMs) {
    variant = "dark";
    emphasis = input.plan.hookVariants[input.plan.useHookVariant].emphasis ?? [];
  } else if (currentTimeMs >= input.ctaSpan.startMs) {
    // Hide caption on the CTA frame: the CTA scene already shows everything
    // legibly and a duplicate caption pill clutters the closer.
    return null;
  } else {
    // Inside the body. Find the active beat span (or the most recent one if
    // we're between beats during a small audio gap).
    const span = input.beatSpans.find(
      s => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs,
    ) ?? [...input.beatSpans].reverse().find(s => currentTimeMs > s.startMs);
    if (span) {
      const beat = input.plan.beats.find(b => b.id === span.beatId);
      emphasis = beat?.emphasis ?? [];
      // Body always sits on paper; even warning beats keep the paper pill
      // (the warning amber accent reads inside the panel, not the subtitle).
      variant = "paper";
    }
  }

  // SubtitleCaption needs the full word list so chunk boundaries are stable
  // across frames (a sliding window would re-chunk every frame at the edges).
  // It memoizes chunks internally and only renders the active chunk.
  return (
    <SubtitleCaption
      words={input.wordTimings}
      currentTimeMs={currentTimeMs}
      variant={variant}
      emphasis={emphasis}
      bottom={220}
    />
  );
}

export function ReelComposition({ input }: Props) {
  const { fps } = useVideoConfig();
  const { segments, totalFrames, fullAudio } = planLayout(input, fps);

  const hook = input.plan.hookVariants[input.plan.useHookVariant];
  const cta = input.plan.cta;

  // Tonal rhythm per panel: hook + CTA on the dark navy canvas, body beats
  // on the cream paper canvas. This was the original editorial cadence
  // (dark headline → paper magazine spread → dark closer). A unified
  // single-canvas reel was tried and rejected — it lost the visual arc and
  // also clashed with the existing paper-baked figure assets (chart, the
  // Rackham Aesop illustration). Warning beats keep their amber-tinted
  // paper variant for the heads-up signal.
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "hook") {
          return (
            <Sequence key={i} from={seg.fromFrame} durationInFrames={seg.durationInFrames}>
              <BrandBackground variant="dark">
                <KineticHook hook={hook} />
                <SeriesChip
                  level={input.plan.postLevel}
                  episode={input.plan.episode}
                  total={input.plan.seriesTotal}
                  topicChip={input.plan.topicChip}
                  dark
                />
              </BrandBackground>
              {!fullAudio && (
                <Audio
                  src={staticFile(input.audioFile)}
                  startFrom={Math.round((seg.audioOffsetMs / 1000) * fps)}
                  endAt={Math.round(((seg.audioOffsetMs + (input.hookSpan.endMs - input.hookSpan.startMs)) / 1000) * fps) + 6}
                />
              )}
            </Sequence>
          );
        }

        if (seg.kind === "beat" && seg.beat) {
          // Body beats render on cream paper. Warning beats use the
          // amber-tinted paper variant so the heads-up signal carries
          // through the canvas as well as the KindLabel + amber rule.
          const beatVariant = seg.beat.kind === "warning" ? "warning" : "paper";
          return (
            <Sequence key={i} from={seg.fromFrame} durationInFrames={seg.durationInFrames}>
              <BrandBackground variant={beatVariant}>
                <BeatScene beat={seg.beat} durationInFrames={seg.durationInFrames} />
                <SeriesChip
                  level={input.plan.postLevel}
                  episode={input.plan.episode}
                  total={input.plan.seriesTotal}
                  topicChip={input.plan.topicChip}
                />
              </BrandBackground>
              {!fullAudio && (
                <Audio
                  src={staticFile(input.audioFile)}
                  startFrom={Math.round((seg.audioOffsetMs / 1000) * fps)}
                  endAt={Math.round((seg.audioOffsetMs / 1000 + (seg.durationInFrames / fps)) * fps) + 6}
                />
              )}
            </Sequence>
          );
        }

        // cta
        return (
          <Sequence key={i} from={seg.fromFrame} durationInFrames={seg.durationInFrames}>
            <BrandBackground variant="dark">
              <CTAScene
                cta={cta}
                blogPath={input.plan.blogPath}
                relatedTool={input.plan.relatedTool}
                reelPromise={input.plan.reelPromise}
              />
              <SeriesChip
                level={input.plan.postLevel}
                episode={input.plan.episode}
                total={input.plan.seriesTotal}
                topicChip={input.plan.topicChip}
                dark
              />
            </BrandBackground>
            {!fullAudio && (
              <Audio
                src={staticFile(input.audioFile)}
                startFrom={Math.round((seg.audioOffsetMs / 1000) * fps)}
                endAt={Math.round(((seg.audioOffsetMs + (input.ctaSpan.endMs - input.ctaSpan.startMs)) / 1000) * fps) + 6}
              />
            )}
          </Sequence>
        );
      })}

      {/* Continuous voiceover for full-cut mode. */}
      {fullAudio && input.audioFile && (
        <Audio src={staticFile(input.audioFile)} />
      )}

      {/* Optional music bed at low gain (no-op when musicFile is empty). */}
      {input.musicFile && (
        <Audio
          src={staticFile(input.musicFile)}
          volume={MUSIC_DUCK_GAIN}
          loop
        />
      )}

      {/*
        Subtitle caption pill: rendered at the COMPOSITION ROOT (not inside a
        Sequence) so useCurrentFrame() returns the global frame. Inside a
        Sequence it would return the sequence-local frame and the captions
        would re-start their timeline on every beat boundary.

        Movie-subtitle style: chunks of 4-8 words split at natural punctuation
        boundaries, each chunk fades in for ~6 frames and stays put until the
        next chunk arrives. No per-word animation.
      */}
      <RootCaptionLayer input={input} />
    </>
  );
}

// ---- Composition registration ----

export default function Root() {
  return (
    <>
      <Composition
        id="ReelComposition"
        // Cast keeps Composition typing happy: Remotion's LooseComponentType
        // expects a wider Record<string, unknown> signature than our Props.
        component={ReelComposition as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={90 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          input: makeDefaultInput(),
        }}
      />
      {/*
        Reel cover thumbnail (1080×1920 still PNG). Rendered via
        Remotion's `renderStill` from the `Thumbnail` composition. See
        `Thumbnail.tsx` for the design notes; `render-thumbnail.ts` for
        the CLI entry point used by `scripts/render-reels.mjs`.
      */}
      <Composition
        id="Thumbnail"
        component={Thumbnail as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          plan: makeDefaultThumbnailPlan(),
        }}
      />
    </>
  );
}

function makeDefaultInput(): ReelInput {
  return {
    plan: {
      slug: "preview",
      postTitle: "Preview reel",
      postLevel: "discovery",
      episode: 8,
      seriesTotal: 16,
      mode: "faithful",
      topic: "Emergency funds: why most people get this wrong",
      topicChip: "EMERGENCY FUNDS",
      blogPath: "blog/emergency-fund",
      mood: "calm-authority",
      hookVariants: [
        {
          id: "h-stat",
          layout: "big-number",
          narration: "One in four expats can't cover a single 400 euro emergency. The math is uglier than you think.",
          onscreenLines: ["Most people", "are one bill", "away from debt."],
          anchor: { type: "stat", value: "1 in 4", label: "couldn't cover EUR 400" },
          emphasis: ["one bill", "debt"],
        },
        { id: "h-q", layout: "question", narration: "How long could you survive without income?", onscreenLines: ["Three months?", "One?", "Be honest"] },
        { id: "h-c", layout: "contradiction", narration: "Saving feels safe. Without an emergency fund, it isn't.", onscreenLines: ["Saving feels safe.", "It isn't."] },
      ],
      useHookVariant: 0,
      beats: [
        { id: "b1", kind: "definition", narration: "An emergency fund is cash for the unexpected and necessary, not for sales or holidays.", onscreenText: "What it is", subtext: "Cash for the unexpected and necessary." },
        { id: "b2", kind: "stat", narration: "Start with one month of essential expenses, not one month of salary.", onscreenText: "Start small", anchor: { type: "stat", value: "1 month", label: "of essential expenses" } },
        { id: "b3", kind: "list", narration: "Rent, food, insurance, minimum debt payments, utilities. That's it.", onscreenText: "Essential expenses are", anchor: { type: "list", items: ["Rent", "Food and basics", "Insurance", "Minimum debt payments", "Utilities"] } },
        { id: "b4", kind: "stat", narration: "Then build toward three months. Six if your income is variable.", onscreenText: "The full target", anchor: { type: "stat", value: "3 to 6", label: "months of essentials" } },
        { id: "b5", kind: "warning", narration: "Don't keep it in your daily account. It will get spent.", onscreenText: "Move it out of sight", subtext: "Separate account. Accessible. Not visible from your daily app." },
        { id: "b6", kind: "transition", narration: "An emergency fund is the foundation for everything else.", onscreenText: "It's the foundation." },
      ],
      cta: { approved: "save", narration: "Save this so the day you need it, you'll know exactly what to do.", onscreenText: "Save this", subtext: "for the day you'll need it.", handle: "@nidhi.today", followAsk: "For the rest of the Basics series." },
      caption: { instagram: "", tiktok: "" },
      hashtags: ["nidhi", "expatfinance", "emergencyfundeurope", "fireeurope", "moneymindset"],
      availableFigures: [],
    },
    hookSpan: { startMs: 0, endMs: 5000 },
    beatSpans: [
      { beatId: "b1", startMs: 5500, endMs: 11000 },
      { beatId: "b2", startMs: 11500, endMs: 16500 },
      { beatId: "b3", startMs: 17000, endMs: 23500 },
      { beatId: "b4", startMs: 24000, endMs: 28500 },
      { beatId: "b5", startMs: 29000, endMs: 34000 },
      { beatId: "b6", startMs: 34500, endMs: 39000 },
    ],
    ctaSpan: { startMs: 39500, endMs: 45000 },
    wordTimings: [],
    audioFile: "",
    musicFile: "",
    cut: "full",
  };
}
