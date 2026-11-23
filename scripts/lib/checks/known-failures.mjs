/**
 * Known failures of the browser checks (#364): a problem the accessibility
 * pass (`axe`, scripts/smoke-pages.mjs) or the phone-width audit (`audit`,
 * scripts/audit-mobile.mjs) finds, that is tracked in a GitHub issue and not
 * fixed yet. Agreed by the council (Claude, DeepSeek, Codex), Nov 21, 2026.
 *
 * An entry is `{ check, rule, element, pages, issue, added, until, reason }`,
 * every field required:
 *   - `check`: 'axe' or 'audit'.
 *   - `rule`: the axe rule id, or the audit's kind of finding; exact.
 *   - `element`: exact, no wildcard. For axe, the selector axe reports, which
 *     axe makes unique in the page. For the audit, the selector the audit
 *     makes unique in the page plus the measured value
 *     (`span.ref-external:nth-of-type(2) @ 12.24px`), or, for one defect of
 *     one CSS rule on many nodes, the class and the exact measured value
 *     (`span.ref-external @ 12.24px`): only nodes measured at that value are
 *     excused, and fixing the rule clears them all at once.
 *   - `pages`: an explicit list of paths, or one route family named in
 *     FAMILIES (`lessons`, `how-to-guides`, `tool:<slug>`). Lessons and guides
 *     go live on their date with no pull request, so a list of them would fail
 *     an unrelated pull request the day a scheduled one goes live.
 *   - `issue` "#n"; `reason`, why it is not fixed here.
 *   - `added` and `until`, YYYY-MM-DD: `added` is not after today (UTC),
 *     `until` is after `added` and at most 30 days after it.
 * An entry that is malformed, future-dated or past its `until`, or that
 * matches nothing in a full run, fails the run by itself: the problem is
 * fixed and the entry removed, or the entry is renewed with a reason, in a
 * reviewed pull request. Page-level findings (a smoke failure, a page that
 * scrolls sideways, a page that does not load) cannot be excused at all.
 */

/** Findings about a whole page, which no entry may excuse. */
export const PAGE_LEVEL = new Set(['smoke', 'error', 'http', 'overflow']);

/** Route families an entry may name instead of a list of pages. */
export const FAMILIES = {
  // A lesson: /blog/<slug>/, English only, not a level, tag or hub page.
  lessons: (path) => /^\/blog\/(?!(?:discovery|building|psychology|optimizing|mastery|tag|glossary|inclusive-finances)\/)[^/]+\/$/.test(path),
  // A How-to guide: /how-to/<slug>/, English only.
  'how-to-guides': (path) => /^\/how-to\/(?!situation\/|rss)[^/]+\/$/.test(path),
};

/** `tool:<slug>`: the tool's page in every edition. */
function toolFamily(name) {
  const slug = /^tool:([a-z0-9-]+)$/.exec(name)?.[1];
  return slug ? (path) => new RegExp(`^(?:/[a-z]{2})?/free/${slug}/$`).test(path) : null;
}

export function inPages(pages, path) {
  if (Array.isArray(pages)) return pages.includes(path);
  const family = FAMILIES[pages] ?? toolFamily(pages);
  return family ? family(path) : false;
}

const DAY = 24 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const days = (from, to) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY;
export const todayUTC = () => new Date().toISOString().slice(0, 10);

/** Why an entry may not be used, or null when it may. */
export function entryProblem(entry, today = todayUTC()) {
  if (!entry || typeof entry !== 'object') return 'not an object';
  const { check, rule, element, pages, issue, added, until, reason } = entry;
  if (!['axe', 'audit'].includes(check)) return `check must be 'axe' or 'audit', not ${JSON.stringify(check)}`;
  if (typeof rule !== 'string' || !rule || rule.includes('*')) return 'rule must be an exact rule id';
  if (PAGE_LEVEL.has(rule)) return `a ${rule} finding is about a whole page and cannot be excused`;
  if (typeof element !== 'string' || !element.trim() || element.includes('*')) return 'element must be an exact selector, with no wildcard';
  if (Array.isArray(pages)) {
    if (pages.length === 0 || !pages.every((p) => typeof p === 'string' && p.startsWith('/'))) return 'pages must list paths that start with /';
  } else if (!(pages in FAMILIES) && !toolFamily(pages)) {
    return `pages must be a list of paths or one of ${[...Object.keys(FAMILIES), 'tool:<slug>'].join(', ')}`;
  }
  if (!/^#\d+$/.test(issue ?? '')) return 'issue must be "#<number>"';
  if (typeof reason !== 'string' || !reason.trim()) return 'reason is required';
  if (!DATE.test(added ?? '') || Number.isNaN(Date.parse(added))) return 'added must be a YYYY-MM-DD date';
  if (!DATE.test(until ?? '') || Number.isNaN(Date.parse(until))) return 'until must be a YYYY-MM-DD date';
  if (added > today) return `added (${added}) is after today (${today})`;
  const span = days(added, until);
  if (span <= 0) return 'until must be after added';
  if (span > 30) return `until is ${span} days after added; the most is 30`;
  if (until < today) return `ended on ${until}`;
  return null;
}

export function matches(entry, problem) {
  return entry.check === problem.check && entry.rule === problem.rule && inPages(entry.pages, problem.page) &&
    (entry.element === problem.element || (problem.ruleElement !== undefined && entry.element === problem.ruleElement));
}

/**
 * Split a run's problems (`{ check, rule, page, element, ruleElement?, message }`)
 * by the entries for that check. Returns the problems no entry excuses, the
 * ones an entry excuses, the entries that cannot be used, and the usable
 * entries that matched nothing (meaningful only for a full run).
 */
export function splitKnown(problems, entries, today = todayUTC()) {
  const invalid = [];
  const live = [];
  for (const entry of entries) {
    const problem = entryProblem(entry, today);
    if (problem) invalid.push({ entry, problem });
    else live.push(entry);
  }
  const used = new Set();
  const fresh = [];
  const known = [];
  for (const problem of problems) {
    const entry = PAGE_LEVEL.has(problem.rule) ? undefined : live.find((e) => matches(e, problem));
    if (entry) { used.add(entry); known.push({ problem, entry }); } else fresh.push(problem);
  }
  return { fresh, known, invalid, unmatched: live.filter((e) => !used.has(e)) };
}

/** Print a check's result; returns the number of failures. */
export function report(check, { fresh, known, invalid, unmatched }, { full = true } = {}) {
  let failures = fresh.length + invalid.length + (full ? unmatched.length : 0);
  if (known.length) console.log(`  ${check}: ${known.length} known problem(s) excused (${[...new Set(known.map((k) => k.entry.issue))].join(', ')}).`);
  for (const { entry, problem } of invalid) console.error(`✗ ${check}: the known-failure entry for ${entry?.issue ?? '?'} (${entry?.rule ?? '?'}) cannot be used: ${problem}.`);
  if (full) for (const e of unmatched) console.error(`✗ ${check}: the known-failure entry for ${e.issue} (${e.rule}, ${e.element}) matched nothing: if it is fixed, remove the entry.`);
  if (fresh.length) {
    console.error(`\n✗ ${check}: ${fresh.length} problem${fresh.length === 1 ? '' : 's'}`);
    for (const p of fresh.slice(0, 200)) console.error(`  ${p.message}`);
    if (fresh.length > 200) console.error(`  … and ${fresh.length - 200} more`);
  } else if (!failures) {
    console.log(`✓ ${check}`);
  }
  return failures;
}

/**
 * The known failures, for both checks. Each names its issue; see the top of
 * this file for the rules every entry follows.
 */
export const KNOWN_FAILURES = [];
