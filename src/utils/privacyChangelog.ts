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
      'Merge them into one entry per date in src/utils/privacyChangelogEntries.ts.',
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

/** How many entries the notice shows: the latest in full and the two before it open (#722). */
export const NOTICE_ENTRIES = 3;

/** The anchor of an entry on its year page: `change-2026-05-05`. It never changes. */
export function entryAnchor(iso: string): string {
  return `change-${iso}`;
}

/** The year an entry belongs to, as its year page's address segment. */
export function entryYear(iso: string): string {
  return iso.slice(0, 4);
}

export interface ChangelogYear {
  year: string;
  entries: ChangelogEntry[];
  /** The oldest and the newest entry's date, YYYY-MM-DD. */
  from: string;
  to: string;
}

/**
 * The entries by year, newest year first, each year's entries newest first.
 * Expects the newest-first order `mergeByDate` returns.
 */
export function changelogYears(entries: ChangelogEntry[]): ChangelogYear[] {
  const years: ChangelogYear[] = [];
  for (const entry of entries) {
    const year = entryYear(entry.iso);
    let current = years.at(-1);
    if (!current || current.year !== year) {
      current = { year, entries: [], from: entry.iso, to: entry.iso };
      years.push(current);
    }
    current.entries.push(entry);
    current.from = entry.iso;
  }
  return years;
}

/** A year's entries by month (`2026-11`), newest month first. */
export function changelogMonths(entries: ChangelogEntry[]): Array<{ key: string; entries: ChangelogEntry[] }> {
  const months: Array<{ key: string; entries: ChangelogEntry[] }> = [];
  for (const entry of entries) {
    const key = entry.iso.slice(0, 7);
    let current = months.at(-1);
    if (!current || current.key !== key) {
      current = { key, entries: [] };
      months.push(current);
    }
    current.entries.push(entry);
  }
  return months;
}
