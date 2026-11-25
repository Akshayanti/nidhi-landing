---
name: minus-sign-review-2026-11-24
description: How NVDA speaks hyphen vs U+2212 in amounts; the net worth tool's spoken total is formatted apart from the visible one; worktree dev server cannot hydrate
metadata:
  type: project
---

Net worth U+2212 change (branch fix/mutation-net-worth, 24 Nov 2026): OBJECT because TotalAnnouncement (the tool's one live announcement) still used a hyphen.

- **NVDA rule** (symbols.dic, en/es/cs; hi has 4 lines and falls back to English; no mr locale found): "negative number" = `(?<!\w)[-−](?=[$£€¥.]?\d)` spoken "minus/menos/mínus". Otherwise "-" is level *most* (silent at default *some*), "−" is level *some* (spoken "minus"). So "CHF-1,500", "-₹1,500", "-R$", "-₺", "-₩", "-￥" are read as POSITIVE by default NVDA; with U+2212 they say minus. "-€", "-$", "-£", "-1.500 €" are fine either way.
- **Why:** visible amounts and spoken amounts are formatted in separate code paths in these tools (live region, chart announce, export report); a sign fix to one misses the others.
- **How to apply:** for any number-format change, read the live-region text in the browser (`.chart-srOnly`, ResultAnnouncement), not only the visible cards.
- **Recipe:** worktrees symlink node_modules to another worktree, so `astro dev` 403s the React client (`/@fs/` outside allow list) and islands never hydrate; build to `dist` (ignored; `--outDir` in /tmp fails with a cross-device rename) and use `astro preview --port <free>`.

- **Invest or pay off (25 Nov, fix/mutation-invest): SIGN OFF.** One `money` feeds answer, live region, paths, chart labels, side table and report answer lines; verified in 5 languages with CHF. Of 38 currencies under no page style, only CHF puts the sign after letters; NOK/SEK already emit U+2212. `splitAmounts` keeps every "CHF−…" whole.
- **Left over (not blocking):** printed report tables format cells via `cellText` (hyphen "-1,520.00", print-only, spoken fine); `pct()` rates keep a hyphen; `formatAmount`'s `Math.round` turns (-0.5,0) into "−0" (roundToStep already cleans -0).
- **Recipe:** `astro preview` daemonises (prints a pid); kill that pid. Resolve puppeteer with `node -e "require.resolve('puppeteer')"`; tsx scripts must be `.mts` for top-level await.

Related: [[announce-review-2026-11-20]]
