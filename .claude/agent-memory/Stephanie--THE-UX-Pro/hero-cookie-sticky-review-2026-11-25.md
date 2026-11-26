---
name: hero-cookie-sticky-review-2026-11-25
description: Home hero buttons before lead + sticky cookie answers; 39dvh and pinning only under height >= 30rem and width < 48rem, so 200%+ text on phones is as on main; #769 unchanged
metadata:
  type: project
---

Review 2026-11-25, branch home-hero-planner-and-cookie-sheet. Signed off.

- `@media (height >= 30rem)` is in rem, so the pinned answers exist only at ~100-175% text on phones (taller phones); at 200% and 400% the sheet behaves as on main (answers 1100-6600px down the scroll area).
- First draft put 39dvh in the base rule, shrinking the sheet at 400% (222px at 320x568). Fixed in 80f3ebc: 39dvh only under the same rem guard, so at 200% and 400% the sheet is 45% (256px at 320x568), as on main; #769 neither better nor worse. Rechecked 2026-11-25.
- The planner as a `.btn` is taller than the old `.jump` link: at 320-375/400% (en, es, cs) its focus is partly under the sheet (not entirely: 2.4.11 AA passes).
- Strip hairline is 1.3:1 in light and dark (decorative), 3.3:1+ under prefers-contrast more, black in forced colours.

**Probe recipe:** puppeteer via `createRequire(package.json)('puppeteer')`, `--no-sandbox`, CDP `Page.setFontSizes` for text size, `el.focus({focusVisible:true})` with reduced motion, then measure ring (2px + 3px offset) against the sheet's top. See [[postmerge-746-748-2026-11-21]], [[pr764-review-2026-11-21]].
