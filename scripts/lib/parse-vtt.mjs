/**
 * Parse a WebVTT file (phrase-level from edge-tts) into word-level timings.
 *
 * edge-tts outputs phrase-level cues like:
 *   1
 *   00:00:00,100 --> 00:00:02,750
 *   Financial risk isn't danger.
 *
 * We split each phrase into words and distribute the time evenly.
 *
 * @param {string} vttContent - Raw VTT content
 * @returns {Array<{word: string, startMs: number, endMs: number}>}
 */
export function parseVtt(vttContent) {
  const words = [];
  const lines = vttContent.split("\n");

  let currentStartMs = 0;
  let currentEndMs = 0;

  for (const line of lines) {
    // Timestamp line: "00:00:00,100 --> 00:00:02,750" (commas for ms separator)
    const timestampMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );

    if (timestampMatch) {
      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = timestampMatch;
      currentStartMs =
        Number.parseInt(h1) * 3600000 +
        Number.parseInt(m1) * 60000 +
        Number.parseInt(s1) * 1000 +
        Number.parseInt(ms1);

      currentEndMs =
        Number.parseInt(h2) * 3600000 +
        Number.parseInt(m2) * 60000 +
        Number.parseInt(s2) * 1000 +
        Number.parseInt(ms2);

      continue;
    }

    // Text line: non-empty, not WEBVTT header, not a cue number, not NOTE
    const trimmed = line.trim();
    if (
      trimmed &&
      trimmed !== "WEBVTT" &&
      !trimmed.startsWith("NOTE") &&
      !/^\d+$/.test(trimmed)
    ) {
      const phraseWords = trimmed.split(/\s+/);
      const phraseDuration = currentEndMs - currentStartMs;
      const msPerWord = phraseDuration / phraseWords.length;

      for (let i = 0; i < phraseWords.length; i++) {
        words.push({
          word: phraseWords[i],
          startMs: currentStartMs + Math.round(i * msPerWord),
          endMs: currentStartMs + Math.round((i + 1) * msPerWord),
        });
      }
    }
  }

  return words;
}

/**
 * Calculate total audio duration in seconds from word timings.
 * @param {Array<{word: string, startMs: number, endMs: number}>} wordTimings
 * @returns {number} Duration in seconds
 */
export function getDurationSec(wordTimings) {
  if (wordTimings.length === 0) return 30;
  return wordTimings[wordTimings.length - 1].endMs / 1000;
}
