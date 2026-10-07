/**
 * The privacy notice's changelog keeps one entry per date (see CLAUDE.md).
 *
 * Hand-written entries are checked at build time: two with the same `iso`
 * date fail the build, so a second entry for a day cannot slip in. Entries
 * that appear with a launch (the Monte Carlo simulator's) are dated by that
 * launch, which can fall on a day that already has an entry; those are
 * merged into it instead.
 */

export interface ChangelogEntry {
  date: string;          // "Month D, YYYY" for display
  iso: string;           // YYYY-MM-DD for machines + <time datetime>
  material: boolean;
  summary: string;
  details?: string[];
}

export function assertOneEntryPerDate(entries: ChangelogEntry[]): void {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.iso)) repeated.add(e.iso);
    seen.add(e.iso);
  }
  if (repeated.size > 0) {
    throw new Error(
      `The privacy changelog has more than one entry for ${[...repeated].join(', ')}. ` +
      'Merge them into one entry per date in src/pages/privacy.astro.',
    );
  }
}

/** Merges entries that share a date, keeping the newest-first order. */
export function mergeByDate(entries: ChangelogEntry[]): ChangelogEntry[] {
  const byIso = new Map<string, ChangelogEntry>();
  for (const e of entries) {
    const existing = byIso.get(e.iso);
    if (!existing) {
      byIso.set(e.iso, { ...e, details: e.details ? [...e.details] : undefined });
      continue;
    }
    existing.material = existing.material || e.material;
    existing.summary = `${existing.summary} ${e.summary}`;
    const details = [...(existing.details ?? []), ...(e.details ?? [])];
    existing.details = details.length > 0 ? details : undefined;
  }
  return [...byIso.values()].sort((a, b) => b.iso.localeCompare(a.iso));
}
