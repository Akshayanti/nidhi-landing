import { spawn } from "node:child_process";
import { join } from "node:path";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { parseVtt } from "./parse-vtt.mjs";

const AUDIO_DIR = join(import.meta.dirname, "../../remotion/public/audio");

// Voice options. We default to a UK male editorial voice ("authority + warmth").
// Override per render via options.voice or the NIDHI_REEL_VOICE env var.
//
//   en-GB-RyanNeural          — UK male, conversational, editorial (DEFAULT)
//   en-GB-SoniaNeural         — UK female, clear, warm
//   en-US-AndrewMultilingualNeural — US male, slower, considered
//   en-US-GuyNeural           — US male, neutral
//   en-IE-ConnorNeural        — Irish male, distinctive, warm
//
// Aria (the previous default) is explicitly NOT used. It reads as a
// presentation narrator and is the single biggest cause of the
// "presentation with voiceover" feel of the legacy pipeline.

const DEFAULT_VOICE = process.env.NIDHI_REEL_VOICE || "en-GB-RyanNeural";

// Subtle pacing tune. edge-tts accepts +/-NN% for rate and +/-NNHz for pitch.
// A small positive rate helps fight the "monotone deliberate" cadence.
const DEFAULT_RATE = process.env.NIDHI_REEL_RATE || "+5%";
const DEFAULT_PITCH = process.env.NIDHI_REEL_PITCH || "-2Hz";

/**
 * Generate TTS audio + word-level subtitle file using edge-tts.
 *
 * @param {string} text - Plain text. Punctuation and ellipses control pacing;
 *                        SSML is not used (edge-tts CLI is text-only by default).
 * @param {string} slug - Output filename stem.
 * @param {object} [options]
 * @param {string} [options.voice]
 * @param {string} [options.rate]
 * @param {string} [options.pitch]
 * @returns {Promise<{audioFile: string, audioRelative: string, vttPath: string, wordTimings: Array<{word:string,startMs:number,endMs:number}>}>}
 */
export async function generateTTS(text, slug, options = {}) {
  const voice = options.voice || DEFAULT_VOICE;
  const rate = options.rate || DEFAULT_RATE;
  const pitch = options.pitch || DEFAULT_PITCH;

  await mkdir(AUDIO_DIR, { recursive: true });

  const audioFile = join(AUDIO_DIR, `${slug}.mp3`);
  const vttFile = join(AUDIO_DIR, `${slug}.vtt`);

  await new Promise((resolve, reject) => {
    // Use --flag=value form for rate/pitch because they accept signed
    // values like "-2Hz" / "+5%" that argparse otherwise treats as flags.
    const proc = spawn("python3", [
      "-m",
      "edge_tts",
      "--voice", voice,
      `--rate=${rate}`,
      `--pitch=${pitch}`,
      "--text", text,
      "--write-media", audioFile,
      "--write-subtitles", vttFile,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`edge-tts exited with code ${code}: ${stderr}`));
      } else {
        resolve();
      }
    });
    proc.on("error", reject);
  });

  const vttContent = await readFile(vttFile, "utf-8");
  const wordTimings = parseVtt(vttContent);

  return {
    audioFile,
    audioRelative: `audio/${slug}.mp3`,
    vttPath: vttFile,
    wordTimings,
  };
}

/**
 * Stitch a ReelPlan's narration into a single text stream.
 * Beats are joined with a long ellipsis to coax edge-tts into a brief pause
 * between thoughts (~350ms in observed output). Hook gets a slightly longer
 * pause before the first beat. CTA is preceded by a clear breath beat.
 *
 * @param {import('../../remotion/src/data').ReelPlan} plan
 * @returns {{ text: string; hookText: string; beatTexts: string[]; ctaText: string }}
 */
export function stitchNarration(plan) {
  const hookText = plan.hookVariants[plan.useHookVariant].narration.trim();
  const beatTexts = plan.beats.map(b => b.narration.trim());
  const ctaText = plan.cta.narration.trim();

  // " ... " inserts a soft pause between segments without confusing edge-tts.
  // Trailing periods on each segment ensure prosodic finality.
  const ensurePeriod = (s) => /[.!?]$/.test(s) ? s : `${s}.`;

  const text = [
    ensurePeriod(hookText),
    "...",
    ...beatTexts.map(ensurePeriod).join(" ... ").split(" ... ").flatMap((s, i, a) =>
      i < a.length - 1 ? [s, "..."] : [s]
    ),
    "...",
    ensurePeriod(ctaText),
  ].join(" ");

  return { text, hookText, beatTexts, ctaText };
}

/**
 * Compute span (startMs, endMs) of each narration segment within the global
 * word-timing array, by word-matching. Tolerant of small punctuation edits
 * edge-tts performs (e.g. dropping commas, joining contractions).
 *
 * @param {Array<{word:string, startMs:number, endMs:number}>} wordTimings
 * @param {string[]} segmentTexts - hook, ...beats, cta in order
 * @returns {Array<{startMs:number, endMs:number}>}
 */
export function alignSegments(wordTimings, segmentTexts) {
  /** @type {Array<{startMs:number, endMs:number}>} */
  const spans = [];
  let cursor = 0;

  const norm = (w) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();

  for (const segText of segmentTexts) {
    const segWords = segText.split(/\s+/).map(norm).filter(Boolean);
    if (segWords.length === 0) {
      // Empty segment: zero-length span at the cursor.
      const t = cursor < wordTimings.length ? wordTimings[cursor].startMs : 0;
      spans.push({ startMs: t, endMs: t });
      continue;
    }

    // Find first matching word starting at or after cursor.
    let start = -1;
    for (let i = cursor; i < wordTimings.length; i++) {
      if (norm(wordTimings[i].word) === segWords[0]) {
        start = i;
        break;
      }
    }
    if (start === -1) {
      // Fallback: assume contiguous from cursor.
      start = cursor;
    }

    const end = Math.min(wordTimings.length - 1, start + segWords.length - 1);
    spans.push({
      startMs: wordTimings[start].startMs,
      endMs: wordTimings[end].endMs,
    });
    cursor = end + 1;
  }

  return spans;
}

/** Default voice (exposed for diagnostics). */
export const DEFAULT_TTS_VOICE = DEFAULT_VOICE;
