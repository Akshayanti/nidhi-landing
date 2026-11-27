---
name: old-anchor-spans-review-2026-11-27
description: fix/content-wording review: an old-anchor empty span at the END of a wrapped heading lands the reader mid-heading; glossary span ids lose :target outline and scroll-margin; worktree dev server cannot hydrate islands
metadata:
  type: project
---

Branch fix/content-wording (#804 and friends, 27 Nov 2026) kept respelled headings' old ids as `<span id="old"></span>` at the end of the markdown heading, and respelled glossary terms' old ids as a span inside `<dt>`.

- **Span at the end of a heading is wrong when the heading wraps**: the browser aligns the span's line, so the first 1 to 4 lines sit under the sticky header or above the viewport (measured: heading top -87 to -231 px at 375/320, -30 px at 1280, header bottom 61). Span moved first (`## <span id="old"></span>Heading`) lands at 77 px, the intended 1rem below the header. Slug and "In this lesson" text are unaffected either way (empty span adds no text).
- **Span inside `<dt>`**: `.glossary-entry:target` / `.post-glossary-item:target` outline no longer shows (target is the span), and the glossary page's `scroll-margin-top: 80px` sits on `.glossary-entry`, so the dt lands a few px under the sticky header/letter bar. Fix with `:has(:target)` and `scroll-margin-top` on the span. The lesson's openFor() still opens the closed glossary details (it uses getElementById + closest).

**How to apply:** any future "keep the old address" span goes at the START of the element, and target styles need `:has(> … :target)`.

Probe recipe: a dev server started in a `.claude/worktrees/*` checkout serves pages but React islands fail to hydrate (Vite 403 on `/@fs/` because node_modules resolves into another worktree). To measure tool help text, inject the string into an existing `.lc-field > .lc-fieldHelp` of the SSR card instead. Kill only your own server's pid; the dev server daemonises (`astro dev` prints its pid). See [[contrast-audit-pitfalls]].
