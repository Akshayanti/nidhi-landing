/**
 * Compact URL codec helpers — shared across all free tools.
 *
 * Why this module exists
 * ----------------------
 * Free-tool share URLs encode all state in the query string (the tools have
 * no backend). Naïve encoding (`a1_name=…&a1_value=…&a1_currency=…&a1_type=…`
 * for every row) produces 1,000+ char URLs that break in chat clients and
 * embarrass the brand. This module provides the two primitives every tool
 * uses to keep URLs short:
 *
 *   1. `encodeTuple` / `decodeTuple` — pack a record's fields into a single
 *      tilde-separated value (`a1=US%20Stocks~50000~USD`). Trailing default
 *      fields are dropped on encode and restored on decode.
 *
 *   2. `setNonDefault` — emit a query-string key only when its value differs
 *      from the documented default. Combined with short key names (`m`, `n`,
 *      `f`, `c` rather than `mode`, `count`, `func`, `currency`) this is the
 *      bulk of the URL-shrinking win.
 *
 * Convention summary (every free tool's url.ts MUST follow):
 *
 *   - Single- or two-letter param names. Multi-char names allowed only when
 *     the prefix carries data (e.g. `c_USD` where `USD` is a per-currency
 *     code and unavoidable).
 *   - Records (rows, vendors) get one param each, packed as a tuple via
 *     `encodeTuple`. Field order is documented at the call site; trailing
 *     default fields are dropped.
 *   - Every scalar field is omitted when at its default. Default values are
 *     declared in the consuming tool's url.ts, NOT here, so each tool owns
 *     its own contract.
 *   - Wire format is fixed and not versioned. Hard cutovers only — see the
 *     v5.2 plan note for why we don't carry legacy decode paths.
 *
 * The separator
 * -------------
 * `~` (tilde) is unreserved per RFC 3986 — neither `URLSearchParams` nor
 * `encodeURIComponent` percent-escape it, which is what we want for a
 * delimiter (the URL stays readable: `a1=US+Stocks~50000~USD`).
 *
 * Field values that happen to contain a literal `~` (rare in financial
 * data, but possible: "Mortgage ~ House") would otherwise corrupt the
 * tuple. We swap them for `\u0001` (Start-of-Heading, a control char that
 * cannot legitimately appear in a typed string) before joining. The marker
 * survives the URLSearchParams round-trip cleanly: `toString()` percent-
 * encodes it as `%01`, and the parser auto-decodes `%01` back to `\u0001`,
 * which `unescapeField` then turns back into `~`.
 *
 * IMPORTANT: encoded values must NOT be percent-encoded before going into
 * URLSearchParams. The `URLSearchParams.toString()` method will encode them
 * itself; pre-encoding causes double-encoding (e.g. `US Stocks` → `US%20Stocks`
 * → `US%2520Stocks`). The encoder/decoder pair below stores raw strings.
 */

const SEP = '~';
// SOH (Start of Heading). Picked because it cannot legitimately appear in
// any human-typed field, and URLSearchParams round-trips it as `%01`.
const TILDE_MARKER = '\u0001';

/**
 * Replace literal tildes in a field value with the internal marker so the
 * delimiter can never collide with field content. The output is raw —
 * callers should hand it directly to `URLSearchParams.set` and let the
 * URL-encoding happen there (NOT pre-encode it).
 */
export function escapeField(s: string): string {
  return s.replace(/~/g, TILDE_MARKER);
}

/** Reverse of `escapeField`. */
export function unescapeField(s: string): string {
  return s.replace(/\u0001/g, '~');
}

/**
 * Pack an array of field values into a single tilde-separated tuple.
 *
 * Trailing fields whose value is the empty string are dropped, so a row
 * with only the first two fields populated encodes as `A~50000` rather than
 * `A~50000~~`. Callers MUST pre-substitute defaults to '' when they want
 * the omit-when-default behaviour. Empty middle fields stay (preserved as
 * empty strings between tildes) because position is significant.
 *
 * The empty-array and "all-empty" cases both encode to `''`. Callers should
 * skip emitting the parameter entirely when this returns ''.
 */
export function encodeTuple(values: readonly string[]): string {
  const fields = values.map((v) => v ?? '');
  while (fields.length > 0 && fields[fields.length - 1] === '') fields.pop();
  return fields.map(escapeField).join(SEP);
}

/**
 * Split a tuple back into its individual field values, optionally padding
 * with empty strings up to `expectedLength`.
 *
 * Padding is on so callers can index by position without bounds checks; if
 * a tool is OK with `result[i] === undefined` it can pass 0 to disable.
 */
export function decodeTuple(s: string, expectedLength: number = 0): string[] {
  if (s === '') {
    return Array.from({ length: expectedLength }, () => '');
  }
  const parts = s.split(SEP).map(unescapeField);
  while (parts.length < expectedLength) parts.push('');
  return parts;
}

/**
 * Set a key on `params` only when `value` differs from `dflt`. Empty-string
 * and null/undefined values are also skipped, matching the "this field is
 * unset" intent.
 *
 * Stringifies via `String(value)` so callers can pass numbers, booleans, etc.
 */
export function setNonDefault(
  params: URLSearchParams,
  key: string,
  value: unknown,
  dflt: unknown,
): void {
  if (value === undefined || value === null) return;
  if (value === '') return;
  if (value === dflt) return;
  if (String(value) === String(dflt)) return;
  params.set(key, String(value));
}

/**
 * Serialise a URLSearchParams to a query string, but with `~` left raw
 * instead of percent-escaped.
 *
 * Why this exists: `URLSearchParams.toString()` uses the
 * application/x-www-form-urlencoded encoding set, which percent-escapes
 * tilde as `%7E`. RFC 3986 marks tilde as an unreserved character, and
 * every URL parser (including `new URLSearchParams(qs)`) accepts a raw
 * tilde without complaint. Keeping it raw saves 2 bytes per separator —
 * with ~25 separators in a typical 8-row share URL, that's ~50 bytes of
 * pointless overhead.
 *
 * The replacement is applied AFTER `toString()` so it cannot interfere
 * with how URLSearchParams encodes anything else: any `~` that appears
 * in the serialised form came from our own delimiter (because user-typed
 * tildes are pre-substituted to `\u0001` by `escapeField`, which then
 * surfaces in the URL as `%01`, never `%7E`).
 */
export function serializeParams(params: URLSearchParams): string {
  return params.toString().replace(/%7E/g, '~');
}
