---
name: timing-review-2026-11-25
description: 197c3ff/ed43f3b review: ResultAnnouncement quiet={!hydrated} still reads a link's result when its country's history loads late; scratch-test probe recipe outside the tree
metadata:
  type: project
---

Invest or pay off `quiet={!hydrated}` (ed43f3b, #880) only covers links whose country is the page's default (embedded history). A link naming any other country renders "Enter an inflation figure..." as the silent baseline, then the history fetch lands and the full three-sentence result is announced on open. Verified by a probe test (said() non-empty). OBJECTED; fix: keep quiet while the arrived form is untouched and `historyState(settled.country) === 'loading'`.

**Why:** a quiet prop tied to hydration misses any async step after hydration; the What's changed copy promised more than the code did.

**How to apply:** for any "silent on load" fix, ask what else arrives after mount (history, rates, fonts) and test a link that needs it.

Probe recipe without touching the tree: copy a committed test with `git show`, rewrite relative imports to absolute worktree paths, import `@testing-library/react` via `node_modules/.../dist/index.js` and add `import React` (tsconfig JSX settings do not apply outside the tree), run `npx tsx --test --test-name-pattern=PROBE <scratch file>` from the worktree. Related: [[announce-review-2026-11-20]], [[numbers-review-2026-11-25]].

Follow-up 25 Nov 12:17: fix applied (`linkForm` state + `quiet={!hydrated || (form === linkForm && historyState(settled.country) === 'loading')}`), re-probed: silent while loading and after, the reader's next edit is said. SIGNED OFF. A parallel agent editing the same tree removed the new regression test mid-review: re-list `it(` names before trusting a coordinator's "new test added".
