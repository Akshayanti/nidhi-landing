import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import { BRAND, TYPE, WIDTH } from "../data";
import type { WordTiming } from "../data";

interface Props {
  /** Full word-timing list for the reel. Filtering is done internally. */
  words: WordTiming[];
  currentTimeMs: number;
  /**
   * Variant decides foreground/background contrast. Defaults to "paper"
   * (dark ink on cream pill) for editorial frames; "dark" inverts for
   * dark hook/CTA frames.
   */
  variant?: "paper" | "dark";
  /** Bottom offset in px from frame edge (default 220). */
  bottom?: number;
  /** Words to bolden inside the active chunk. */
  emphasis?: string[];
  /** Hard cap on words per chunk (default 8). */
  maxWords?: number;
  /** Hard cap on chunk duration in ms (default 3500). */
  maxDurationMs?: number;
  /**
   * Below this word-count, soft punctuation (`,` `;` `:`) is ignored so we
   * don't end up with orphaned 2-word chunks. Sentence-final punctuation
   * (`.` `?` `!`) always splits regardless. Default 4.
   */
  minWordsForSoftBreak?: number;
}

interface Chunk {
  words: WordTiming[];
  startMs: number;
  endMs: number;
}

const HARD_BREAK_RE = /[.?!]"?$/; // sentence terminators (allow trailing quote)
const SOFT_BREAK_RE = /[,;:]"?$/; // clause boundaries

function buildChunks(
  words: WordTiming[],
  maxWords: number,
  maxDurationMs: number,
  minWordsForSoftBreak: number,
): Chunk[] {
  const chunks: Chunk[] = [];
  let buf: WordTiming[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    chunks.push({
      words: buf,
      startMs: buf[0].startMs,
      endMs: buf[buf.length - 1].endMs,
    });
    buf = [];
  };

  for (const w of words) {
    buf.push(w);
    const dur = buf[buf.length - 1].endMs - buf[0].startMs;
    const isHardBreak = HARD_BREAK_RE.test(w.word);
    const isSoftBreak = !isHardBreak && SOFT_BREAK_RE.test(w.word);
    const overflow = buf.length >= maxWords || dur >= maxDurationMs;

    if (isHardBreak || overflow) {
      flush();
    } else if (isSoftBreak && buf.length >= minWordsForSoftBreak) {
      flush();
    }
  }
  flush();

  return chunks;
}

function normalise(s: string) {
  return s.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function SubtitleCaption({
  words,
  currentTimeMs,
  variant = "paper",
  bottom = 220,
  emphasis = [],
  maxWords = 8,
  maxDurationMs = 3500,
  minWordsForSoftBreak = 4,
}: Props) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Memoize chunk computation against the full word list. This is critical:
  // chunking against a sliding window would yield unstable boundaries as the
  // window edge slid through a chunk on each frame.
  const chunks = useMemo(
    () => buildChunks(words, maxWords, maxDurationMs, minWordsForSoftBreak),
    [words, maxWords, maxDurationMs, minWordsForSoftBreak],
  );

  if (chunks.length === 0) return null;

  // Show chunk from PREROLL_MS before first word; linger LINGER_MS after last
  // word to mask the inter-chunk gap unless the next chunk arrives sooner.
  const PREROLL_MS = 80;
  const LINGER_MS = 200;

  let activeIdx = -1;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const visibleStart = c.startMs - PREROLL_MS;
    const next = chunks[i + 1];
    // Visible until either next chunk's preroll begins, or LINGER_MS past end.
    const visibleEnd = next
      ? Math.min(c.endMs + LINGER_MS, next.startMs - PREROLL_MS)
      : c.endMs + LINGER_MS;
    if (currentTimeMs >= visibleStart && currentTimeMs <= visibleEnd) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx === -1) return null;
  const chunk = chunks[activeIdx];

  // Fade-in over first 6 frames of chunk visibility.
  const chunkVisibleFrame = Math.round(((chunk.startMs - PREROLL_MS) / 1000) * fps);
  const fadeInProgress = interpolate(
    frame - chunkVisibleFrame,
    [0, 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const emphasisSet = new Set(emphasis.map(normalise));

  const isPaper = variant === "paper";
  const pillBg = isPaper ? "rgba(0, 33, 113, 0.92)" : "rgba(250, 247, 242, 0.94)";
  const fgColour = isPaper ? BRAND.paper : BRAND.ink;

  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: "50%",
        transform: `translateX(-50%) translateY(${(1 - fadeInProgress) * 6}px)`,
        opacity: fadeInProgress,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 14,
        rowGap: 6,
        maxWidth: WIDTH - 160,
        padding: "18px 32px",
        borderRadius: 18,
        backgroundColor: pillBg,
        boxShadow: isPaper
          ? "0 12px 28px rgba(0, 33, 113, 0.28)"
          : "0 12px 28px rgba(0, 0, 0, 0.18)",
        zIndex: 5,
      }}
    >
      {chunk.words.map((w, i) => {
        const isEmphasis = emphasisSet.has(normalise(w.word));
        return (
          <span
            key={i}
            style={{
              fontSize: TYPE.caption + (isEmphasis ? 2 : 0),
              fontWeight: isEmphasis ? 800 : 600,
              fontFamily: TYPE.ui,
              letterSpacing: "-0.005em",
              color: fgColour,
              lineHeight: 1.18,
              whiteSpace: "nowrap",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}
