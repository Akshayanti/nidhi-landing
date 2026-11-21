// Which advisories in an `npm audit --json` report block a merge.
//
// The audit check fails a pull request on any high or critical advisory in
// what the site ships with. Now and then an advisory is published before its
// fix: nothing can be updated, and every pull request would wait on a package
// nobody here controls. Such an advisory can be given an exception below, by
// its id, with the reason and a last day. The exception covers that one
// advisory only, and it ends by itself: from the day after `until` the
// advisory blocks again, so an exception cannot be forgotten.
//
// Adding an exception is the owner's decision (CLAUDE.md), not a routine fix.

/**
 * @typedef {{ id: string, until: string, reason: string }} Exception
 * `id` is the advisory's GHSA id; `until` is the last day it applies (YYYY-MM-DD, UTC).
 */

/** @type {Exception[]} */
export const EXCEPTIONS = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    // Owner's standing rule (Nov 21, 2026): extended a month at a time until
    // picomatch ships a fix. GitHub withdrew the advisory on Nov 18, 2026, so
    // npm audit does not report it now; the exception stays in case it returns.
    until: '2027-01-17',
    reason:
      'picomatch (through astro and vite), all versions up to the latest, 4.0.7: no fixed release exists yet. '
      + 'It is used while building, on patterns this repository writes itself; the site is static and runs no code '
      + 'on a server. Owner, Nov 17, 2026; extended a month at a time until the fix ships (owner, Nov 21, 2026). '
      + 'Remove once picomatch ships a fix and the lockfile has it.',
  },
];

const BLOCKING = new Set(['high', 'critical']);

/** The GHSA id in an advisory's address, or the address itself when it has none. */
export function advisoryId(url) {
  const m = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i.exec(String(url ?? ''));
  return m ? m[0] : String(url ?? '');
}

/**
 * Sorts a report's high and critical advisories into those that block and
 * those an exception covers today. A package listed only because it depends
 * on a vulnerable one carries no advisory of its own and is not counted twice.
 *
 * @param {{ vulnerabilities?: Record<string, { via?: unknown[] }> }} report
 * @param {Exception[]} exceptions
 * @param {string} today YYYY-MM-DD
 */
export function judge(report, exceptions, today) {
  const seen = new Map();
  for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      if (!via || typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = advisoryId(via.url);
      if (!seen.has(id)) seen.set(id, { id, severity: via.severity, title: via.title ?? '', url: via.url ?? '', packages: [] });
      const found = seen.get(id);
      if (!found.packages.includes(name)) found.packages.push(name);
    }
  }
  const blocking = [];
  const excepted = [];
  for (const advisory of seen.values()) {
    const exception = exceptions.find((e) => e.id === advisory.id);
    if (exception && today <= exception.until) excepted.push({ ...advisory, until: exception.until, reason: exception.reason });
    else blocking.push({ ...advisory, expired: exception ? exception.until : null });
  }
  return { blocking, excepted };
}
