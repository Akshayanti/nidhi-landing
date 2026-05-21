/**
 * Music bed picker.
 *
 * Reads `remotion/public/music/manifest.json` and selects a track for the reel
 * based on `plan.mood`. Deterministic per-slug so renders are reproducible.
 *
 * Manifest schema:
 *   {
 *     "tracks": [
 *       {
 *         "file": "music/calm-authority/track-01.mp3",  // path relative to remotion/public/
 *         "moods": ["calm-authority", "reflective"],
 *         "bpm": 90,
 *         "license": "Pixabay" | "Mixkit" | "EpidemicSound" | ...
 *       },
 *       ...
 *     ]
 *   }
 *
 * If the manifest is missing or no tracks match, returns "" (silent — Remotion
 * skips the music <Audio> tag). The pipeline still produces a valid reel.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MUSIC_DIR = join(import.meta.dirname, "../../remotion/public/music");
const MANIFEST_PATH = join(MUSIC_DIR, "manifest.json");

/**
 * Stable hash for deterministic picking.
 * @param {string} s
 */
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * @param {object} args
 * @param {import('../../remotion/src/data').Mood} args.mood
 * @param {string} args.slug
 * @returns {Promise<{ musicFile: string; track?: object }>}
 */
export async function pickMusic({ mood, slug }) {
  let manifest;
  try {
    const raw = await readFile(MANIFEST_PATH, "utf-8");
    manifest = JSON.parse(raw);
  } catch {
    return { musicFile: "" };
  }

  if (!manifest?.tracks?.length) {
    return { musicFile: "" };
  }

  const candidates = manifest.tracks.filter(
    (t) => Array.isArray(t.moods) && t.moods.includes(mood)
  );

  // Fallback to "calm-authority" pool if no exact match, then to all tracks.
  const pool = candidates.length > 0
    ? candidates
    : manifest.tracks.filter(t => Array.isArray(t.moods) && t.moods.includes("calm-authority"));
  const finalPool = pool.length > 0 ? pool : manifest.tracks;

  const picked = finalPool[hash(slug) % finalPool.length];

  return { musicFile: picked.file, track: picked };
}
