# Master Plan: SEO Audit + Landing-Page Redesign

> Status (2026-11-03): the June 2026 plan is closed except for the items below. Merged PRs (PR0 to PR5, PR14, PR15, PR17, PR18), the superseded PR6-PR13, the June home spec and the closed findings are archived in [done/pr-plan.md](done/pr-plan.md).

## Contents

- [Hard constraints](#hard-constraints)
- [PR16: Per-post OG image generator (optional)](#pr16-per-post-og-image-generator-optional-defer-if-time-pressed)
- [Pre-beta privacy notice edits](#pre-beta-privacy-notice-edits)
- [Open findings](#open-findings)
- [Already strong, do not break](#already-strong-do-not-break)
- [Out of scope](#out-of-scope)
- [Open questions for the owner](#open-questions-for-the-owner)

---

## Hard constraints

These still apply to any SEO or page work. Privacy, copy in five languages, the What's changed page and the editorial voice are governed by `CLAUDE.md`, which takes precedence.

- **No em dashes (`—`, `&mdash;`) and no double dashes (`--`)** in copy or content. Use colons, commas, periods, or rephrase. Per `CLAUDE.md`. BEM-style class names that already use `--` are conventional and not in scope of this rule.
- **Light and dark mode are both first-class.** Every section, composed SVG, visual primitive, form state, and hover/focus state must work in both themes. SVG fills/strokes use CSS variables (`var(--color-deep-blue)`, `var(--chart-eur)`, etc.) or `currentColor`, never literal hex. Backgrounds use `var(--color-bg)` / `var(--color-bg-white)` token pair.
- **No screenshots of the actual app.** The product is pre-launch; no UI we have not built. Composed SVG mocks labelled "example output [illustrative]" only.
- **Backward-only internal links** in blog content. Per `docs/plans/blog-content-plan.md` rule 2, internal `/blog/...` links must point to posts whose `pubDate` is on or before the linking post's.
- **Editorial style (blog content).** Concrete (worked examples, tables, country notes), jargon-glossed on first use. No padding, no synonym stuffing, no AI-generated filler. Per `blog-content-plan.md`.
- **Controlled tag vocabulary.** `blog-content-plan.md` rule 4 lists allowed tags. Don't introduce new ones during the SEO push.

---

## PR16: Per-post OG image generator (optional, defer if time-pressed)

> All 80 lessons share `/brand/social/og-image.png`. Custom OG images materially improve social CTR; higher CTR feeds branded search and direct traffic. Lessons are English only, so one image per lesson covers every edition.

### Scope

1. **Build-time generator.**
   - Render title + reading time + level onto the existing OG template per post.
   - Options: `astro-og-canvas`, `satori-html`, or a small Puppeteer script (Puppeteer is already a dependency in `package.json`).
   - Output `public/og/<slug>.png` per post at `1200x630`.

2. **Pass per-post props from `BlogPost.astro`.**
   - `image`, `imageWidth`, `imageHeight`, `imageAlt` to `BaseLayout`.
   - PR3 already added the prop signature; this PR populates the values.

3. **Repoint `BlogPosting.image`.**
   - PR1 pointed it at the generic OG image. Now point at the per-post OG image; emit dimensions from the build.
   - Closes the original concern in finding 22 properly (PR1 fixed it provisionally).

### Effort

4-6 h one-time for the generator pipeline.

### Dependencies

PR3 (dynamic OG dim props must exist on `BaseHead`). Merged.

### Privacy changelog

None. Build-time image generation.

### What's changed

Readers who share a lesson would see a new preview, so check whether it earns an item under the `CLAUDE.md` rule "What's Changed Grows With Every Visible Change". If any new font or image is copied in for the template, update `public/third-party-notices.txt`.

### Verification

- [ ] One PR-build of the blog produces `public/og/<slug>.png` for every post.
- [ ] One representative post's `dist/blog/<slug>/index.html` references the per-post OG image with correct `og:image:width`, `og:image:height`, `twitter:image:alt`.
- [ ] OG image preview validates in an Open Graph preview debugger (for example Facebook Sharing Debugger).

### Defer guidance

If time-pressed, skip PR16. PR1 already pointed `BlogPosting.image` at the generic OG image with correct dims; it is not a regression to leave it there. Roadmap-track this item.

---

## Pre-beta privacy notice edits

Needed before planner beta invites go out (the beta is planned to open in January 2027; see [done/beta-reward.md](done/beta-reward.md)). Each lands with a `material: true` changelog entry in `src/components/pages/PrivacyPage.astro` and the notice prose in all five catalogs.

- The hosting company that stores planner account data, named as a processor. Vendor to confirm: the June draft assumed DigitalOcean EU.
- Encryption at rest claim, encryption in transit claim, both with specifics.
- Retention policy for account data (and what happens on account deletion).
- Explicit "we do not use your data to train AI models" clause if the site claims it anywhere.
- Updated processor list (today the notice lists PostHog Cloud EU, Google Workspace, GitHub Pages and your browser; the hosting company joins it).

---

## Open findings

The rest of the June catalog is closed; see [done/pr-plan.md](done/pr-plan.md#appendix-b-seo-findings-catalog).

| # | Title | Status | Closes in |
|---|---|---|---|
| 14 | Per-post OG images | Open | PR16 (optional) |
| 21 | Per-style budget on long inline `<style>` blocks (informational) | Open | not blocking |
| 22 | `BlogPosting.image` declares dimensions that don't match | **Resolved provisionally** (PR1); proper fix in PR16 | PR16 |

Evidence:

- **F14**: all lessons share `/brand/social/og-image.png` (`BaseHead.astro` default image; no per-lesson `image` prop from `BlogPost.astro`).
- **F21**: long inline `<style>` blocks in the tool page components (`src/components/pages/LoanComparisonPage.astro`, `MultiCurrencyNetWorthPage.astro`). Informational only.
- **F22**: `src/layouts/BlogPost.astro` `BlogPosting.image` points at the generic `og-image.png` with its true `1200x630`; the per-lesson image waits on PR16.

---

## Already strong, do not break

- **Per-page JSON-LD**: `Organization`, `WebSite`, `WebApplication`, `BlogPosting`, `BreadcrumbList`, `ItemList`, `FAQPage`, `ProfilePage`, `CollectionPage`.
- **`trailingSlash: 'always'`** matched to GitHub Pages behavior. Avoids canonical / duplicate-content issues.
- **`noindex`** on the transactional pages (confirm, unsubscribe, subscription status) and `/404/`, which the sitemap also excludes.
- **Redirect** from retired `/free/currency-risk/` to `/free/multi-currency-net-worth/` (`astro.config.mjs`; a static redirect page, not a true 301 on GitHub Pages).
- **Canonical, hreflang for the five editions plus x-default, prev/next link tags.**
- **RSS and llms.txt** present.
- **Skip-link, focus-visible styles, `prefers-reduced-motion`.**

---

## Out of scope

- **Backlink acquisition.** On-site only. Off-site is a separate effort.
- **Paid search and social.** Both can amplify but won't compensate for structural items.
- **Renaming personas or refactoring the persona system.** Five personas in `src/content.config.ts` remain editorial framing for blog content.
- **Beta access mechanic** (invitation logic, batching, account creation flow). Decided separately; see [done/beta-reward.md](done/beta-reward.md).
- **B2B positioning.** Future direction. When B2B becomes real, it earns its own page (e.g. `/teams/`, `/business/`), not a section on the home.

---

## Open questions for the owner

- Open question for the owner: PR14 recorded `BlogPosting.author` as a `Person` named nidhi, but the code has used an `Organization` since 41ca037 (2026-06-12), in `src/layouts/BlogPost.astro` and as the `ProfilePage.mainEntity` on /about/. Is `Organization` the intended author type (then nothing changes), or should it go back to `Person`?
- Open question for the owner: finding 16 (home `BreadcrumbList`) shipped in #23 and was removed in #85 (2026-10-06) without a record. Close it as not needed (a one-item home breadcrumb adds nothing), or restore it?
- Open question for the owner: do the pre-beta privacy edits above belong in this site's notice, or in the planner's own notice (the archived beta-reward plan puts the invite and cohort privacy entries in the planner repo)?
