# Free tool: invest or pay off debt (scope brief)

**Status:** Design signed off by the council (round 4, Oct 30, 2026). Owner: build now, gated on lesson 49's pubDate so everything goes live at once on 49's slot (~Nov 4).

**Owner's asks so far (Oct 30, 2026):**
- A free tool for "invest vs pay off".
- Use the inflation data the inflation calculator already has, so a reader cannot quietly type an unrealistically high return.
- Do both: warn next to the field, and show the reader's figure next to the historical range.
- Plug it into lesson 49, which is not out yet.

## Why build it

- **Companion to lesson 49** (Invest or pay off debt first?, not yet published). The lesson's core claim is a calculation a reader can run with their own numbers: for a fixed-rate debt without prepayment costs or changing relief, paying it off produces a return equal to the interest avoided; investing earns more on average but not for sure. Other debts (variable rates, prepayment fees, income-based or written-off loans) behave differently, and the page says so.
- **How-to series** (action plan step 12) lists 49 as a candidate; a lesson that ends in something the reader can run is what that series wants.
- **Most of the engine exists:** loan arithmetic in `src/utils/loan/`, return distributions and fees in `src/utils/monte-carlo/math.ts` (Dimson, Marsh and Staunton world stocks; cautious 4%, historical 5.3%, optimistic 6% a year after inflation), country inflation in `src/utils/inflation/` (World Bank FP.CPI.TOTL.ZG, 194 countries, served from nidhi.today, updated 2026-10-08).

## The precedent it has to answer

`docs/plans/phase-free-tools-beta.md` cut the Avalanche vs Snowball calculator on 2026-05-17 because the category is saturated in English search. The case for this tool is not English search traffic, and is not claimed to be search in other languages either until there is evidence:
- It is a **lesson companion first**: it serves readers already on lesson 49 and the How-to hub.
- Its calculation differs from the incumbents': same-date net wealth, after the reader's country's inflation, paired simulations rather than one assumed return.
- **Success is judged by use from lesson 49 and the How-to hub**, not by ranking. **Review gate, not an automatic kill** (council round 2):
  - Measured from what is already sent: the anonymous pageviews every page sends (sent without consent too, so the numerator and the denominator are the same population). Opens = the tool's pageviews whose referrer is lesson 49 or the How-to hub; the denominator = those two pages' pageviews over the same 8 weeks. Completion = the share of tool pageviews followed by one `calculated` event (below).
  - Assessed 8 weeks after launch, and only once lesson 49 and the How-to hub have at least 1,000 pageviews between them; until then the gate waits.
  - Opens under 5% (the starting line, to be compared with the other tools' related-tool click-through at the review) block expansion (several debts, the match, promotion), and the council then reviews the tool with both open and completion rates. Neither number alone removes it.

If the council does not accept this, the fallback is a worked example inside lesson 49 and no tool.

## The model (v1)

One debt against one investment, from the same extra monthly amount, compared at the same date.

**The investment is defined:** a diversified global stock portfolio, using the Monte Carlo simulator's world-stocks distribution (Dimson, Marsh and Staunton). The page says so; it is not "an investment" in general.

**The engine is nominal; the display is in today's money.**
- Debt schedules run in nominal cash flows at the debt's own rate (never amortised at an "after-inflation" rate).
- The return settings are after inflation; each simulated year's return is converted to nominal with the country's inflation figure: (1 + real) × (1 + inflation) − 1.
- Results are deflated to today's money at the end. Nominal figures are available on request.
- Exact compounding throughout, never "nominal minus inflation".

**Both paths, same date, same simulated returns (paired):**
- **Path A, pay off:** the extra money goes to the debt. Once it is paid, the old payment plus the extra are invested monthly. Path A has a distribution too.
- **Path B, invest:** the debt runs its normal schedule; the extra money is invested monthly. If the debt ends before the comparison date, the freed payment is invested from then on.
- **Net wealth at the comparison date** = investments minus any debt still owed. Path B's remaining balance is subtracted.
- Payment timing is consistent (end of month), including the final partial payment. Extra money above the remaining balance goes to investing in Path A.
- Each simulation runs both paths on the same return path, so the difference isolates the choice, not the luck.

**Comparison date (presets only in v1):** the date Path A clears the debt, that date plus 5 years, or plus 10 years. No free-form horizon in v1 (council round 1 split: Codex asked for a custom date, DeepSeek against; presets are the smaller step, custom can follow if readers ask). A note when the comparison date is under a year away: over short periods market swings dominate.

**Costs on the investment side**, so the comparison is not tilted toward investing:
- **Yearly fund fee**, as in the Monte Carlo simulator, taken off each year's return.
- **Tax on investment gains:** an optional rate applied to gains at the comparison date, default 0, with a plain note that taxes depend on the account and the country.
- **Fixed text on what is not modelled on this side:** "Only a yearly fund fee and an optional tax on final investment gains are modelled; platform and transaction fees, dividend and withholding taxes, and when tax is paid are left out. If you enter relief on the debt and leave the investment tax at 0, the comparison can favour investing." 

**Tax relief on the debt:** optional, described as "your own estimate of the relief on this debt's interest", not a universal formula. The note says relief may be capped, may need itemising, may apply only to part of the interest, and may arrive once a year; and that relief can change if tax rules or your income change, while the model holds the entered rate constant. When used, the effective rate is rate × (1 − relief rate) for the interest that qualifies.

**Outputs**
- **The difference, B minus A**, at the comparison date: 10th, 50th and 90th percentile of the paired difference, and in how many of the modelled scenarios B ended with higher net wealth. Percentiles are explained in plain words: the 10th is not a worst case, and the share of scenarios is a property of the model, not a forecast.
- **Each path's net wealth** (10th, 50th, 90th), with equal visual weight.
- **Interest avoided in Path A**, labelled nominal or today's money, shown as one line inside the comparison, never as a headline benefit.
- **The debt's rate after relief and after inflation, next to the 4 to 6% after-inflation range of the return settings.** No decision bands on the result (council round 1: the lesson's bands read as a rule in a calculator). Lesson 49 keeps its bands, where they are discussed with their limits.
- **Fixed text, things the model leaves out:** an employer match (lesson 49), which can outweigh everything here; several debts and their order; variable rates; prepayment penalties or fees; income-based student loans and write-offs (UK, Australia, US plans); losing access to money once it repays a debt, while an investment can be sold; keeping an emergency fund; peace of mind; inflation uncertainty. The page is educational, not advice.

**Neutral presentation rules:** no winner colour, no "better", "wins", "should" or celebratory copy, no default-ranked outcome. Wording such as "ended with higher modelled net wealth in 62 of 100 scenarios". Both paths in the same colour family.

## Inflation data: how it keeps returns honest

- **Default figure:** the country's geometric average over the last 10 years, used only if at least 5 of those 10 years have data. Shown with its years, the 5-year average and the latest year for context ("India, 2015 to 2024: 5.0% a year; last 5 years 5.6%; 2024 4.9%; World Bank"). Editable. Labelled a constant planning assumption, not an inflation forecast.
- **No recent figure:** the field starts empty and the comparison does not run until the reader enters one, because both the today's-money display and the conversion of the after-inflation settings to nominal need it. Nothing is half-filled.
- **"My own figure"** (before inflation, as fund returns are quoted) is converted with the same figure: real = (1 + own) / (1 + inflation) − 1.
- **Warning (owner: yes)**, strictly above 6% after inflation: "This is above the top of the long-run range used in this model and in our lessons (4 to 6% a year after inflation for world stocks since 1900, Dimson, Marsh and Staunton; mostly developed markets)." Not "unrealistic". A second note strictly below 0% after inflation: the figure means the investment loses buying power. (At exactly 0% the model assumes buying power is kept, before fees and taxes; no note.)
- **Side by side (owner: yes):** when the warning shows, the result is shown with the reader's figure and with the historical range (cautious to optimistic), with equal weight. The reader's figure is never replaced.
- **Field range** for "my own figure" defaults to the country's inflation plus 0 to 10%; typing beyond it is allowed. Inputs at or below −100% (returns, inflation) are rejected as impossible.
- **Limits shown on the page:** World Bank figures are yearly and a year or more behind; past inflation does not predict future inflation; the return history is mostly developed markets; a fixed-rate debt does not move with inflation, a variable one does.

## Privacy and the `/free/` rules

- Same rules as the other four tools (CLAUDE.md "Free Tools Keep Inputs Out of URLs"): `ToolStateGuard`, state after `#` only, `publishToolState`, both analytics backstops untouched, the full browser check in five languages, both viewports, with and without consent.
- **No new third party.** The country history comes from `/data/inflation-history.json` on nidhi.today, as the inflation calculator already does.
- **Events (council round 2, generic only):** `calculated` (no properties, once per page view, when a comparison first shows), share copied, export format (`xlsx` or `pdf`), reset, and a shared view opened. **Not tracked:** return setting, comparison date preset, country, currency, tax relief on or off, investment tax on or off, whether the high-return or below-zero warning showed, whether "my own figure" left the default range, any amount, rate, fee or the encoded state.
- **Where the `#` and the inputs could leak, and why they do not:** browsers never send the fragment in requests or in the `Referer` header; `ToolStateGuard` moves it out of the address before analytics load; `before_send` in `Analytics.astro` keeps only `utm_*` and drops the `#` on every URL property that points at a `/free/` page, including `$current_url`, `$referrer`, `$pathname` and the session entry URL; the site has no error-reporting service and PostHog exception capture is off (`capture_exceptions: false`); static hosting logs see no fragment. Exports carry no telemetry. The browser check confirms all of this in the payloads. (The inflation calculator tracks country and currency, disclosed in the notice; this tool does not, because next to a debt it says more about a person.)
- **Share links** carry the inputs after the `#`, as the other tools do, and the share box says plainly that the link contains the numbers entered. Exports are named by tool and date only.
- New `data-attr` labels resolvable by the registry; a privacy changelog entry, `material: true` (new tool page, new events, new labels, export events), dated the day it ships.

## Plugging it into lesson 49 (owner, Oct 30, 2026)

Lesson 49 is not out yet (`pubDate: 2099-01-11` placeholder, expected slot ~Nov 4).

**Owner's decision (Oct 30, 2026), replacing the council's option (a):** lessons are not held. Lesson 49 publishes on its slot, and **the day it publishes is the day everything goes live, at once, not in steps**: the tool in five languages, the home page listing, the privacy changelog entry, the What's changed item, nav, footer, hub and sitemap. Publishing order is unchanged.

**How (the Monte Carlo precedent, `src/utils/monte-carlo/release.ts`):** the tool's release is gated on lesson 49's `pubDate`. Until it passes, the production build leaves out the tool page and every link to it (dev shows everything); the privacy entry and the What's changed item take their date from the same release date. Setting 49's real `pubDate` launches all of it on that day's scheduled deploy, with no second change. So the tool must be merged, translated and privacy-checked **before 49's slot (~Nov 4)**.

- **49 publishes with the tool already in it:** `relatedTool` is this tool (label, cta and idea written for it); one inline link at the end of "The rate sets a debt's cost, not its size", after the bands ("The free invest or pay off calculator runs this comparison with your own debt and your country's inflation"), labelled `post-inline-tool-invest-or-pay-off` as 47 and 50 do; the loan comparison stays linked inline where the lesson talks about a loan's full cost. No later swap, so no update date is needed for it.
- **Launch day, all in one release:** lesson 49's `pubDate`; the tool page in five languages; the `/free/` hub, nav, footer and sitemap; the home page's free tools listing (owner: a listing where the home page shows the free tools, nothing more); the privacy changelog entry (`material: true`) and the notice's "What we collect" text; one What's changed item in five languages. Readers never see one without the others.
- The Instagram kits for 49 do not change: the lesson's promise, example and action stay the same.

## Everything else it needs

- Catalog strings in all five languages (`src/i18n/strings/tools/`), glossary terms per `docs/i18n/`.
- Exports (spreadsheet and PDF report) like the other tools.
- Hub (`/free/`), nav, footer, sitemap, the home page; later the How-to hub.
- A What's changed item in five languages, council-reviewed, on launch day.
- The waitlist/beta box, as on the other tools.
- **Tests:** zero extra; extra above the balance; Path B paying off before and after the comparison date; remaining debt at the comparison date; final partial payment; high, negative, missing and sparse inflation (fewer than 5 of 10 years); tax relief; fees and investment tax; warning thresholds (strictly above 6%, strictly below 0%, and no warning at exactly 0%); exact real/nominal conversion; paired percentiles of the difference; seeded reproducibility; URL state and share/export privacy; catalog parity.

## Placement in the action plan

**Now, due before lesson 49's slot (~Nov 4)** (owner, Oct 30, 2026). The council had advised after step 12; the owner's decision to launch it with 49 places it first. Nothing is held: lessons and reels keep their slots.

## Decisions taken in rounds 1 and 2 (for sign-off)

1. Build it, as a lesson companion first, with the review gate above; fallback is a worked example in lesson 49.
2. One debt; employer match, several debts, variable rates and prepayment penalties out of v1, named in the fixed text.
3. Comparison date presets only: payoff date, +5 years, +10 years.
4. 10-year geometric inflation average with the 5-of-10-years rule and 5-year and latest context; no comparison without a figure.
5. Warning strictly above 6% after inflation, worded as the model's range; a second note strictly below 0%; no hard cap.
6. Placement: owner's decision, built now, ready before 49's slot.
7. Owner's decision: nothing is held; on 49's publish day everything goes live at once, gated on 49's pubDate as Monte Carlo was on 43's.
8. Events are generic only (calculated, share, export format, reset, shared view); success is read from anonymous pageviews and their referrers.

## Council log

- **Round 1 (Oct 30, 2026).** Claude: build, one debt, payoff +5/+10, 10-year average, 6% warning, before step 12, lesson 49 option (a). Codex: build as lesson companion; paired simulations and same-date net wealth with Path B's remaining debt; distributions for both paths and the difference; fees, investment tax, variable-rate and prepayment assumptions; tax relief as a qualified estimate; warning as "model range"; drop country, currency and relief from analytics; neutral presentation; omit or attribute the bands; presets plus custom date; after step 12. DeepSeek: same maths fixes (nominal engine, real display, subtract remaining debt, paired difference); minimum-years rule and no comparison without inflation; investment tax/fee asymmetry; warning wording plus a zero-return note; review the tracked combination and warn that share links carry the numbers; equal weight, no winner; presets only; after step 12; kill criterion. All three: option (a) for lesson 49. Claude accepts all of the above; on the split over a custom date, proposes presets only for v1.
- **Round 2 (Oct 30, 2026), sign-off round: both OBJECT.** Codex: track only generic events; state that fragments are stripped from analytics URLs, referrers, error reports and logs; qualify "for certain"; make the kill rule a review gate with a minimum sample, the same population, and completion. DeepSeek: the 0% note was wrong at exactly 0%; the kill rule could not be measured and dropped completion (proposed `tool_opened` with a source); state fragment stripping; relief can change; spell out the investment-side omissions. Claude accepts all, except measuring opens with the existing anonymous pageviews and their referrer instead of a new `tool_opened` event (it is already sent, in the same population as the denominator, and adds nothing new to the notice); completion uses a property-free `calculated` event.

- **Round 3 (Oct 30, 2026).** Codex: OBJECT, one point: the tests line still said "at or below 0%"; changed to "strictly below 0%, and no warning at exactly 0%". DeepSeek: no output (run returned empty); rerun in round 4.
- **Owner, Oct 30, 2026:** everything (lesson, tool, home page, privacy, changelog) drops on the same day, in publishing order. This replaces decisions 6 and 7; the council is told in the next round.

- **Round 4 (Oct 30, 2026): Codex SIGN OFF, DeepSeek SIGN OFF** on the design (model, inflation, warning, privacy, events, review gate, tests). The council is unanimous on the design. Launch timing and placement are the owner's decision above, not the council's.
- **Owner, Oct 30, 2026 (clarified):** lessons are not held; 49's publish day is the day all of it goes live, at once. Home page: a listing where it shows the free tools.
