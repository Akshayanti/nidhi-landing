/**
 * The number boxes of a tool that calculates on numbers, as a link or the
 * language switch carries them.
 *
 * Those tools' encoded state can hold only valid numbers, so a bad box used to
 * travel as the last good value, with a full answer and no error (#789). The
 * boxes are carried beside that state: a readable number as it is, in range
 * or not, an empty box empty, and anything else as the marker. The text
 * typed never travels, and the calculation never sees the marker.
 */
import { serializeParams } from './compactUrl.ts';
import { UNREADABLE } from './linkInput.ts';
import { completeNumber, parseLocaleNumber } from './parseLocaleNumber.ts';

/** The longest number a box may carry in a link, as in linkInput.ts. */
const MAX_LENGTH = 200;

/** A number as this site writes one into a link. */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/** What a box on `locale`'s page is in a link. */
export function boxValue(raw: string, locale: string): string {
  if (raw.trim() === '') return '';
  const n = parseLocaleNumber(completeNumber(raw, locale), locale, { allowNegative: true });
  if (n === null) return UNREADABLE;
  // String() writes the very large and the very small with an exponent.
  const plain = String(n).includes('e') ? n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : String(n);
  return plain.length <= MAX_LENGTH ? plain : UNREADABLE;
}

/** `encoded` with each of `boxes` written over it, the empty ones as empty. */
export function withBoxes(encoded: string, boxes: Record<string, string>): string {
  const entries = Object.entries(boxes);
  if (entries.length === 0) return encoded;
  const params = new URLSearchParams(encoded);
  for (const [key, value] of entries) params.set(key, value);
  return serializeParams(params);
}

/** The boxes of `keys` that a link carries. A key that is not there takes the tool's default. */
export function readBoxes(search: string, keys: readonly string[]): Record<string, string> {
  const params = new URLSearchParams(/^[?#]/.test(search) ? search.slice(1) : search);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const raw = params.get(key);
    if (raw === null) continue;
    out[key] = raw === '' || (raw.length <= MAX_LENGTH && PLAIN_NUMBER.test(raw)) ? raw : UNREADABLE;
  }
  return out;
}
