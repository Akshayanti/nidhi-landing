/**
 * A share link's state that can tell whether it arrived whole (#820).
 *
 * A tool's link leaves out every value that equals its default, so a link cut
 * short in a messaging app reads as a shorter link: the lost fields took their
 * defaults, the defaults are example values, and the page showed a full,
 * wrong comparison with no error. A link written through `sealState` has an
 * envelope around the state the tool already wrote:
 *
 *     f=<format>&<the state, as before>&z=<check>
 *
 * `f` comes first and names the format, so a link that still starts with it
 * says "I was written with a check". `z` comes last and is the check, so a
 * link cut anywhere loses it or breaks it. Both stay after the `#` with the
 * rest of the state; a tool that adopts this adds `f` and `z` to the key
 * pattern it hands its guard (`STATE_KEY_PATTERN`), or they stay in the
 * address.
 *
 * The check
 * ---------
 * CRC-32 (the one a zip file uses), written as eight lower-case hex digits,
 * over the pairs of the state other than `z`, `f` included:
 *
 *   - decoded, so "+" or "%20" for a space, "~" or "%7E", give one check;
 *   - in the order they were received, so a reordered link fails;
 *   - before any default is filled in: the check is of what the link carries.
 *
 * The pairs are written out as one text, each key and each value as its
 * length, a colon, and the text itself, with nothing between them:
 * `[["f","2"],["n","3"]]` is `1:f1:21:n1:3`. A length counts UTF-16 units, as
 * `String.length` does. Reading that text back can only give the same list
 * (a length says exactly where its text ends), so no two different lists of
 * pairs are written alike. The text is encoded as UTF-8 and summed. Writer
 * and reader both go through `checkOf`, on pairs read by `pairsOf`.
 *
 * A check, not a signature: it catches a link that was cut or altered by
 * accident. Anyone can write a link with a correct check, and what a link
 * may put into a tool is still limited by `linkInput.ts`.
 *
 * What it cannot catch
 * --------------------
 * A state with no `f` key is an older link and is read as it always was. So
 * a link cut so that no `f` survives (its start lost), and any link written
 * before the envelope and cut since, cannot be told from an older link that
 * arrived whole. That limit is accepted (council, #820).
 */
import { crc32 } from './xlsx.ts';

/** The key that names the format. First in a sealed state. */
export const FORMAT_KEY = 'f';

/** The key that holds the check. Last in a sealed state. */
export const CHECK_KEY = 'z';

/** One `key=value` of a state, decoded. */
export type Pair = readonly [key: string, value: string];

/** The pairs a state holds, decoded, in the order written. Duplicates are kept. */
export function pairsOf(state: string): Pair[] {
  return [...new URLSearchParams(state)];
}

/** The check of these pairs: CRC-32 of their length-prefixed text in UTF-8, as eight hex digits. */
export function checkOf(pairs: readonly Pair[]): string {
  const text = pairs.map(([key, value]) => `${key.length}:${key}${value.length}:${value}`).join('');
  return crc32(new TextEncoder().encode(text)).toString(16).padStart(8, '0');
}

/**
 * `state` (a tool's encoded state, possibly empty) inside the envelope. The
 * state itself is not rewritten. `format` is a plain token such as "2".
 */
export function sealState(state: string, format: string): string {
  const body = [`${FORMAT_KEY}=${format}`, ...(state === '' ? [] : [state])].join('&');
  return `${body}&${CHECK_KEY}=${checkOf(pairsOf(body))}`;
}

/**
 * What a state that arrived is:
 *   - `'plain'`: no `f` key. An older link, to be read as it always was.
 *   - `'whole'`: sealed in `format`, and its check holds.
 *   - `'damaged'`: it has an `f` key and anything is wrong: `f` is not first
 *     or is there twice, its value is not `format`, `z` is missing, not last,
 *     there twice or not the check of the rest, or any other key is there
 *     twice. Nothing of such a link is to be used.
 */
export function openState(state: string, format: string): 'plain' | 'whole' | 'damaged' {
  const pairs = pairsOf(state);
  const keys = pairs.map(([key]) => key);
  if (!keys.includes(FORMAT_KEY)) return 'plain';
  const first = pairs[0];
  const last = pairs[pairs.length - 1];
  const whole =
    first[0] === FORMAT_KEY &&
    first[1] === format &&
    last[0] === CHECK_KEY &&
    new Set(keys).size === keys.length &&
    // Every pair but the check: with `z` last and no key twice, that is every pair before it.
    last[1] === checkOf(pairs.slice(0, -1));
  return whole ? 'whole' : 'damaged';
}
