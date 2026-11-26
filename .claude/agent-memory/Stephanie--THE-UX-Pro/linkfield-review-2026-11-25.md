---
name: linkfield-review-2026-11-25
description: e51afdc review: LinkField (uncontrolled read-only share box, value set in layout effect) is safe for focus/select; old net worth links get refusedOld banner; privacy bullets lean technical
metadata:
  type: project
---

LinkField in `src/components/toolShared.tsx` sets the share link as the input's value property in a `useLayoutEffect`, no `value` attribute. Focus-on-copy-failure in the net worth ShareModal runs in a passive `useEffect`, and all layout effects (child first) run before passive ones, so the value is in place before `focus()` fires `onFocus` select: no empty flash, selection covers the link. SIGNED OFF.

**Why:** an uncontrolled field is only safe while every reader of its value (focus, select, copy) runs after the layout effect; a future `useLayoutEffect` focus in a parent would still be fine (child layout effects first), but a synchronous focus during render or in a ref callback would not.

**How to apply:** if a later change focuses or reads the share box from a ref callback or before commit, re-check selection. Privacy changelog bullets written by coordinators drift into "percent-encoding", "markup", "describe an element": suggest plain wording, non-blocking. Related: [[share-link-review-2026-11-14]], [[timing-review-2026-11-25]].
