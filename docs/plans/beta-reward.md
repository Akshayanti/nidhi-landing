# Planner beta reward: decisions and copy

Status (Oct 29, 2026): English v5 approved by the council (unanimous, 4 rounds). Next: the owner approves the English wording, then hi, es, cs and mr (council), then build. Nothing is on the site yet.

**Source of truth:** `../NetWorthAndExpenses/docs/strategy/GRANDFATHER_STRATEGY.md`, and for wording its `BETA_REWARD_BRIEF.md` (true / not decided / honesty rules, Directive 2 calculator-not-adviser, Directive 13 plain copy). If this file and those disagree, those win. After publishing, the final wording goes to the owner to log under "Public Commitments" in the strategy doc.

## Decisions (owner, Oct 29, 2026)

- Beta is free; opens by January 1, 2027; access may open earlier, in stages. Changed the same day (owner): "is planned to open in January 2027", so a slip doesn't break a promise, and no per-person invite date (the strategy plans small waves).
- Beta tester = anyone who creates an account while the beta is open (strategy doc). The stricter rule discussed earlier (5 assets or debts, a request, 5 lessons) was dropped in favour of the strategy doc.
- Paid features free during the beta and for 12 months after launch; then a founding price, billed yearly, locked while subscribed; 30 days after the free year to take it; no card, nothing charged automatically; otherwise the free plan, data kept, export always; reminders 30, 14 and 1 days before, in the planner and by email to account holders; cancelling ends the founding price.
- Never stated: any price, the launch date, the paid/free feature split, Founding 50/500, lifetime, future features.
- Access by invite: the waitlist's one email is the invite, with a personal one-time code after the `#` of the link (ties the account to the waitlist entry, measures waitlist to beta conversion). Volunteers can ask for an invite on the volunteer form.
- No newsletter email about the beta.
- Placement: the waitlist box (home and all four tools, one shared component), the volunteers page item `beta`, and a new page `/beta/` in all five languages. Instagram bio, Sunday posts and talk QR codes (`/beta/?utm_source=talk&utm_campaign=<event>`) point to `/beta/`.
- Privacy: this website copy collects nothing new, so no changelog entry for it. The invite code and the planner's cohort tables get their own privacy notice entries when built, before the beta opens.

## Copy (English v5, council signed off)

## Waitlist box line (home page + all four tools), under the heading "Want the planner when it opens?"
Beta testers get the paid features free for 12 months after launch. [How the beta works](/beta/)

## Volunteers page, "What you get", item `beta`
lead: "A planner beta invite, if you want one:"
rest: " a separate, optional choice on the form. Create your account while the beta is open and, like every beta tester, you get the paid features free for 12 months after launch. [How the beta works](/beta/)."

## New page /beta/
meta title: "The planner beta | nidhi"
meta description: "The nidhi planner beta is free and opens by January 1, 2027. Beta testers get the paid features free for 12 months after launch, then a founding price, billed yearly, locked for as long as you stay subscribed."

H1: The planner beta
Lead: I'm building a planner for real lives: what you own, owe, earn and expect to spend in one place, in one currency or several, projected forward with the assumptions shown. The beta is free and opens by January 1, 2027. Access may open earlier, in stages.

H2: What beta testers get
- The paid features are free during the beta.
- After launch, the paid features stay free for 12 months.
- After that year, you can keep them at a founding price, billed yearly, locked for as long as you stay subscribed.
- No card is asked for during the beta or the free year. Nothing is charged automatically.

H2: Who counts as a beta tester
Anyone who creates an account while the beta is open.

H2: After the free year
- You can take the founding price up to 30 days after your free year ends.
- Or move to the free plan. Your data stays, and you can export it any time.
- Once you have an account, I'll remind you in the planner and by email 30 days, 14 days and 1 day before your free year ends.
- If you cancel later, the founding price ends. Coming back is at the normal price.

H2: Not decided yet
Prices and the launch date aren't set. I'll announce them before launch.

H2: Why join
- See the planner before it opens to everyone.
- What you tell me shapes what it becomes.
- The free tools answer one question at a time. The planner is being built to keep the whole picture together, so you can compare decisions before you make them.

H2: How it works
1. Join the waitlist below.
2. While you're on the waitlist, you get one email when your access opens, no later than January 1, 2027. That email is your invite.
3. Create your account. From then on, you're a beta tester.
4. Use it, and tell me what's missing.

[existing waitlist box: "Want the planner when it opens?" / email / "One email when access opens. Privacy policy."]

## Built (Oct 29, 2026, branch beta-page, not committed)

- `/beta/` in five languages (`BetaPage.astro`, `src/pages/beta.astro`, `src/pages/[locale]/beta.astro`); strings under `beta` in every catalog.
- Owner additions after v5, council signed off: "Who counts" and "Why join" say accounts are invite only during the beta, with invites going to the waitlist in stages.
- Reward line in the waitlist box (home, four tools, end of every lesson; off on `/beta/`); volunteers page item; home FAQ "What is the planner" answer shortened with a "What beta testers get" link.
- Tool exports: a plain line about the free beta and the beta page address (PDF footer, spreadsheet "About" sheet).
- Short links `/beta/{ig,tg,wa,dsc}/` in every language, `utm_content=beta_link`.
- Privacy notice: the waitlist's one email is the beta invite, sent when access opens (was "the launch email"), all five editions; changelog entry 2026-10-29 (material).
- Terms: Hindi "शुरुआती सदस्यों की दर" and Marathi "सुरुवातीच्या सदस्यांची किंमत" for "founding price" (owner asked; council unanimous, as "introductory rate" would suggest a price that rises later). Hindi स्वयंसेवक replaces वॉलंटियर (glossary row added).
- What's changed item `planner-beta-page` (2026-10-29).
- Footer: "Planner beta" link in the About column, click label `footer-beta` (in the privacy changelog entry).
- SEO: search titles name the product ("Free personal finance planner beta | nidhi" and translations); meta descriptions carry no date (cached snippets go stale; council), say invite-only and the free year after launch; canonical, hreflang for all five, Open Graph, WebPage JSON-LD; in the sitemap; llms.txt line (no date).
- Date wording (Oct 29, owner + council): "planned to open in January 2027" on /beta/, home FAQ, exports and What's changed; step 2 no longer promises an invite by January 1. The published wording is logged in GRANDFATHER_STRATEGY.md Public Commitments.
