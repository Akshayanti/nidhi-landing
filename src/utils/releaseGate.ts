/**
 * The rule behind every launch gate: a tool goes live when the lesson it
 * belongs to does. Pure, with the clock passed in, so it can be tested; the
 * gates themselves (monte-carlo/release.ts, invest-or-pay-off/release.ts) read
 * the lesson's pubDate and call these.
 *
 * These decide whether a tool page, its links, its privacy entry and its
 * What's changed item are built on a given day.
 */

/** Live once the host lesson's pubDate has passed; always in dev, as draft lessons are. */
export function isReleased(pubDate: Date | null, now: Date, dev: boolean): boolean {
  if (dev) return true;
  return !!pubDate && pubDate <= now;
}

/**
 * The launch date: the host lesson's pubDate once it has passed. In dev, where
 * the tool shows before launch, the present moment stands in.
 */
export function releaseDate(pubDate: Date | null, now: Date, dev: boolean): Date | null {
  if (pubDate && pubDate <= now) return pubDate;
  return dev ? now : null;
}
