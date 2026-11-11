# Free tools: handover, Nov 11, 2026

Written by the session that worked through the Nov 2026 audit, for the session that is redesigning the five tool pages (pull requests #558 to #562). From here on, that session owns everything under `/free/`: the tool components, their strings, their maths and their styles. The audit session makes no further changes to the tools.

Everything below marked **Owner** was decided by the owner on Nov 11, 2026. Everything marked **Council** was agreed unanimously by the three-model council on Nov 10 and 11, 2026.

## 1. What changed under you today

Your five branches were opened before these merged. They touch the same files, so rebase onto `main` before anything else.

**Chart colours, markers and neutral names (#557, closes #391 and #406).** Council and Owner; the owner's condition was that WCAG is met.

- `CHART_SERIES` in `src/styles/palette.ts` is now eleven CSS variables, `var(--chart-1)` to `var(--chart-11)`, each with a light and a dark value in `src/styles/global.css`. `RISK_COLORS` is `var(--risk-*)`. No slot is a fixed hex any more.
- `src/components/chart/SeriesMarker.tsx` gives every slot a marker shape (`SeriesMarker` beside a name, `MarkerGlyph` inside an `<svg>`). The loan comparison uses it in the legend, along each line, at the payoff point, on hover points and in each card's heading; the net worth calculator uses it on the donut's slices and in its legend.
- **A series colour is never a text colour.** Card names, tab letters, table letters and emphasised values are in neutral ink. `--chart-N-on` is the ink for a label or marker drawn on slot N; `--risk-on` is the ink on a risk badge.
- The chosen "solve for" and "rate structure" options use the brand pair (`--color-deep-blue` with `--color-bg-white` as ink), not the offer's colour.
- Split chart: labels inside bars use the ink for that fill; orange text uses `--chart-text-warn`; the light orange bar has an edge (`--chart-outline-warn`).
- `src/styles/chartColors.test.ts` (in `npm test`) fails if a slot falls under 3:1 against the card or the page in either theme, if an ink falls under 4.5:1 on its fill, if `global.css` and `palette.ts` disagree, if any rule sets `color:` to `--lc-color` or `--chart-N`, or if two slots share a marker. A redesign that reintroduces coloured names will fail it; that is intended.
- The rules are written down in `docs/color-palette.md`, "Chart series, risk scale and figure inks". That guide is shared with the planner.

**Earlier the same week, also in the tool files** (all on `main`): #535 (loan term exact), #536 and #537 (unreadable amounts and optional boxes are errors, not zero), #545, #546 (held exchange rates, `ratesForBase`), #547 (discount points verdict), #551 (an emptied box stays empty in a share link), #511 (shared-link input limits, fixed reasons for a failed rates request), #534 (surveys off). Each came with tests; keep them passing rather than rewriting them to fit a new layout.

**Lesson figures (#544)** are separate from the tools and need nothing from you.

## 2. Decisions waiting to be built

### 2.1 APR in the loan comparison (#368), high

The tool reports APR as the monthly rate times 12 (the US and Canadian convention). The how-to guide and EU and UK loan documents use the compounded yearly rate, so the tool and the guide it is linked from give different APRs for the same offers.

- **Owner:** show both conventions and let the reader choose.
- **Owner:** the default follows the currency: times 12 for USD and CAD, compounded for every other currency.
- **Owner:** one switch above the offers picks the convention; every card shows one APR, with a line naming which convention it is. Not two figures per card.

To settle while building (yours to propose, then Jan and the owner):

- Whether the choice travels in a share link. If it does, it is a choice, not a value, so it may also be an event property; the share link, the guard pattern and `toolPrivacy.test.ts` all need it.
- What happens to the convention when the reader changes currency after choosing by hand (suggestion: a hand choice sticks).
- The wording. The issue has a proposed label and a replacement for the FAQ sentence "When the fee is zero, APR equals the nominal rate", which is false on EU and UK documents. Five languages.
- The same change must make these agree: the how-to guide `compare-loan-offers` (its example reads about 8.2% and 9.4% compounded, 7.90% and 9.02% times 12), lesson 27's APR table (a line saying which convention it uses), the exports (which convention the PDF and spreadsheet state), and the code comment in `src/utils/loan/math.ts` that says "almost every regulator".
- Jan checks the maths and the wording before it merges.

### 2.2 Buttons (#408), high

**Council** design, **Owner** choices:

- **Owner:** the primary fill is brand blue, `#0A3D8F` in light and `#90CAF9` in dark. The teal filled buttons (Monte Carlo, inflation, invest or pay off, the cookie prompt, the newsletter, volunteers, the learning path) become blue.
- **Owner:** "Copy a share link" is outlined, like every other tool action. A tool page has no filled button of its own.
- One filled main action per page or section. A tool's own actions (share, export, add a row, upload) are outlined in brand blue, the same in all five tools.
- Every role: 1rem, line-height 1.5, radius 8px, 1.5px border (transparent on quiet), min-height 44px with automatic height, padding 0.625rem 1rem. Labels wrap and are never cut. A link styled as a button keeps link semantics.
- Main action: weight 700; the others 600. No arrow.
- Quiet buttons (reset, cancel, not now): neutral text `#3D3D3D` / `#E0E0E0`, no visible edge, underline on hover.
- Danger: outline in the guide's red pair `#991100` / `#FF9E80`, with an explicit verb.
- Hover: colours stay; the label underlines and an inset line appears (2px on primary, 1px on outline and danger).
- Disabled: role colours kept, dashed border, no hover, no opacity change; native `disabled`, or `aria-disabled` on a link without `href`.
- Focus: 2px ring, 3px offset, teal `#005B4F` / `#26A69A`; `#80CBC4` on the blue callout.
- On the blue callout: white fill and border, text in the primary colour.
- Icons on tool actions come later, as their own change.
- **Order:** the shared `.btn` classes first, then pages and tools moved onto them in changes that are released together, so no reader sees half the site in each style.

The button system reaches beyond the tools (cookie prompt, newsletter, waitlist, volunteers, lessons). Since your redesign already rewrites every tool's buttons, the simplest split is: you add the `.btn` system and move the tools; say in that pull request which non-tool pages are left, and the owner assigns them.

### 2.3 "Concentration" in the net worth calculator (#515), medium

With a debt in one currency, the chart and its table show each currency's size over the sum of all sizes (63.5%), while the risk cards and both exports show net amount over net worth (234.97%). Both are called "concentration".

- **Owner:** ask Jan first. Jan proposes which measure keeps the name, what the other is called, and which one drives the risk level; that goes back to the owner before it is built. Both figures then go into the exports under their own names, in five languages.

### 2.4 Two findings kept in the local list

`docs/curr_bugs.md` is ignored by git and exists only in the main checkout. Read these two there; they are referred to by id here on purpose.

- **N22** (net worth, wording). **Owner:** yes, make English, Spanish and Marathi match Hindi and Czech. The finding gives the three replacement strings and the glossary line to update. It needs a privacy changelog entry, `material: false`, on the day it merges.
- **X7** (loan comparison, the payment-split chart). No decision needed: the finding gives the fix. It falls under "Free Tools Keep Inputs Out of URLs", rule 4, in `CLAUDE.md`.

One more, public and small: with JavaScript off, the tools show live-looking inputs that never recalculate and say nothing. The sign-up forms were fixed in #556; a `<noscript>` line inside each tool is still open.

## 3. Open audit issues that touch the tools

All carry the label `audit-2026-11`. Check each against your redesign: some will be fixed by it, some will be made moot, and some will need carrying over.

**Maths, models and what the page claims (Jan reviews):** #368, #369, #371, #374, #377, #378, #380, #388, #515, #519, #527, #529, #531, #532.

**Behaviour and accessibility (Stephanie reviews):** #343, #348, #351, #393, #394, #398, #421, #476, #477, #479, #484, #517, #521, #522, #524.

**Structure and styles:** #408, #412, #413, #451, #457, #460.

**Copy and translation:** #424, #497, #498, #500, #502, #503, #504, #505, #506.

**Lessons that describe a tool (fix with the tool, or tell the owner):** #384, #385, #467.

**Tests:** #352, #353, #354, #362.

#412 and #413 (five parallel sets of classes; about 70 net worth rules defined twice) are the ones your redesign most directly decides.

## 4. Rules that apply to every tool change

All from `CLAUDE.md`; listed here because each has bitten this week.

- **Privacy check before merge.** `npm run verify:tool-privacy` locally for the tools you touched, and the "No typed value reaches analytics" check on the pull request (about 35 minutes; it is not a required check, so wait for it by hand). A new kind of control needs a step added to `scripts/verify-tool-privacy.mjs`.
- **The pinned surface.** A new or renamed `data-attr`, event, event property or storage key fails `npm test` until `src/utils/privacySurface.test.ts` is updated, and needs a `material: true` privacy changelog entry first. Removing a label needs none.
- **One privacy changelog entry per UTC date.** Nov 11 already has one; add to it if you merge the same day.
- **Five languages in the same change**, each following its glossary in `docs/i18n/`. A typography test checks Marathi and Hindi spacing after Latin words.
- **"What's changed"** gets an item for anything a reader would notice, in five languages, dated by the UTC merge day.
- **Design questions go to the council** in three stages; other decisions do not need it.
- **The owner previews only at `localhost:4321`** from the main checkout.

## 5. Not part of this handover

These stay with the owner or the audit session: #399 (cookie prompt as a full-screen modal) and #400 (home page first screen), both design questions for the council; #472 (model migration, later); the Content Security Policy (on record, not yet); and the newsletter and waitlist scripts.
