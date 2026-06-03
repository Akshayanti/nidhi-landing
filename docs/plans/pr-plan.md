# Master Plan: SEO Audit + Landing-Page Redesign

> Single source of truth for the SEO program and the landing-page redesign, organised around the 18 PRs that ship them. Replaces the previous `seo-audit.md` and `landing-page-redesign.md`.

> Last revised June 2026.

---

## What this document is

Two streams of work were running in parallel:

1. **SEO program.** 27 findings against the live site, ranging from critical (thin Discovery posts, weak internal linking, missing brand suffix on titles, keyword stuffing on free-tool pages) to hygiene (missing JSON-LD on `/privacy/`, hard-coded OG dims). Roughly half is template/infrastructure, half is content rewriting. Total open effort: ~30-43 hours.
2. **Landing-page redesign.** The current home page (`src/pages/index.astro`) is a placeholder: floating image, finosopher joke, two free tool cards. The redesign at `src/pages/index2.astro` (parked, `noindex,nofollow`) replaces it with a four-snap-section structure carrying real product positioning, multi-currency / FIRE / what-if capability framing, a hero with a live FX caption, and a conversion tail with self-check + trust strip + waitlist.

These are not independent. Three SEO findings (the home H1, the home `BreadcrumbList`, and the `Organization.sameAs` gap) close automatically when the redesign ships. Several other findings cleanly attach to specific PRs in the redesign rollout. A unified plan lets each PR carry both the SEO and the redesign work that belongs together.

The rest of this document is organised around the 18 PRs. Each PR section names: scope, files touched, SEO findings closed, redesign work bundled, effort, dependencies, privacy changelog (almost always none, see Appendix D), and a verification checklist.

Reference content (full landing-page copy, SVG specs, trust-strip variants, the SEO findings catalog) lives in the appendices and is cross-referenced from the PR sections.

---

## Hard constraints (durable, apply to every PR)

These are non-negotiable from existing project rules and from earlier audit/design work.

- **No em dashes (`—`, `&mdash;`) and no double dashes (`--`)** in copy or content. Use colons, commas, periods, or rephrase. Per `CLAUDE.md`. BEM-style class names that already use `--` are conventional and not in scope of this rule.
- **Privacy policy is the source of truth.** A privacy changelog entry is required only when a change touches user-data collection, storage, third-party calls, analytics events, forms, user-facing flows, or retention. Cosmetic, structural, content, and SEO changes do not get entries. See Appendix D for the corrected discipline and what it means PR-by-PR.
- **Light and dark mode are both first-class.** Every section, composed SVG, visual primitive, form state, and hover/focus state must work in both themes. SVG fills/strokes use CSS variables (`var(--color-deep-blue)`, `var(--chart-eur)`, etc.) or `currentColor`, never literal hex. Backgrounds use `var(--color-bg)` / `var(--color-bg-white)` token pair.
- **No screenshots of the actual app.** The product is pre-launch; no UI we have not built. Composed SVG mocks labelled "example output [illustrative]" only.
- **Backward-only internal links** in blog content. Per `docs/plans/blog-content-plan.md` rule 2, internal `/blog/...` links must point to posts whose `pubDate` is on or before the linking post's. Applies to PR5 onwards.
- **Editorial style (blog content).** Concrete (worked examples, tables, country notes), jargon-glossed on first use. No padding, no synonym stuffing, no AI-generated filler. Per `blog-content-plan.md`.
- **Controlled tag vocabulary.** `blog-content-plan.md` rule 4 lists allowed tags. Don't introduce new ones during the SEO push.
- **`scroll-snap-type: y proximity`, not `mandatory`,** disabled below 768px and on `prefers-reduced-motion`. Single document scroller (no `overflow-y: auto` on `<main>`). Already implemented in `global.css`; PR0 carries it; PR18 keeps it.
- **`/index2/` carries `robots="noindex,nofollow"`** for the entire parallel period and is excluded from the sitemap filter in `astro.config.mjs`. PR18 reverses both.

---

## Site snapshot (June 2026)

Verified against a fresh `npm run build` run.

- **42 built pages**, **35 in the sitemap**.
- **Indexable**: home (`/`), `/beliefs/`, `/free/` (June 2026 addition), `/free/multi-currency-net-worth/`, `/free/loan-comparison/`, `/blog/`, 17 blog posts, 8 tag pages, `/privacy/`.
- **Excluded from sitemap (intentional)**: 5 transactional pages plus the parked redesign at `/index2/`.
- **`/index2/`**: `robots="noindex,nofollow"`, not linked from anywhere visible. Slated to replace `/` in PR18.
- **JSON-LD coverage**: every indexable page emits at least one schema. `/privacy/` was the last gap (finding 23); closed by PR1, which added `WebPage` + `BreadcrumbList`.
- **No `<lastmod>` in the sitemap** (finding 11, closes in PR3).
- **Frontmatter usage**: 0 of 32 posts populate `relatedSlugs:`. 4 of 32 populate `faq:`. 1 of 32 populates `howTo:`. (Findings 4 + 7, close across PR2 + PR5.)

---

## PR sequence at a glance

| PR | Title | Findings closed | Effort | Depends on |
|---|---|---|---|---|
| PR0 | Landing-page foundation | (sets up 1, 16, 25) | done | — |
| PR1 | SEO quick wins (markup-only batch) | 2, 10, 12, 15, 19, 22, 23, 27 | done | PR0 |
| PR2 | Internal linking + tag discovery | 4 (render), 5, 20, 26 | done | PR0 |
| PR3 | Performance + sitemap + dynamic OG | 9, 11, 24 | done | PR0 |
| PR4 | `WebSite.SearchAction` wire-up | 17 | done (with PR3) | PR0 |
| PR5 | Schema track: FAQ + relatedSlugs + inline links | 4 (population), 7 | 8-12 h | PR2 |
| PR6-PR13 | Depth rewrites for thin Discovery posts | 3 (collectively) | 12-16 h | PR5 |
| PR14 | EEAT: named author, byline, editorial policy, sameAs | 6, 25 | 3-5 h | PR0 |
| PR15 | PostHog defer + env wire-up | 8 | 1-2 h | PR0 |
| PR16 | Per-post OG image generator (optional) | 14 | 4-6 h | PR3 |
| PR17 | AI-bot policy update | 13 | 0.5 h + decision | PR0 |
| PR18 | Final `/` ← `/index2/` swap | 1, 16, (25 if not in PR14) | 0.5-1 h | PR0; ideally PR1, PR3, PR14 |

**Total open effort**: 28-41 h across 8-15 PRs (PR6-PR13 expand to 4-8 PRs depending on batching). Splittable along the existing Mon/Wed/Fri publishing cadence at ~11-12 weeks if depth rewrites slot one per publishing window.

---

## PR0: Landing-page foundation

> Already built on `feat/landing-page`. Sets up everything PR18 needs for the swap, plus the `/free/` index page and the nav/scaffolding that ride along.

### Scope

Files added:
- `src/pages/index2.astro`: parked redesign. Carries `robots="noindex,nofollow"`, `body[data-page="landing"]`, `mainClass="landing-shell"`. Four snap sections (hero, multi-currency, projections, what-if) plus a non-snap conversion tail (self-check + trust strip + waitlist). See Appendix A for full copy and visual specs.
- `src/pages/free/index.astro`: live `/free/` index. H1 `Free personal finance tools that run in your browser.` Lists multi-currency and loan tools, emits `BreadcrumbList` + `ItemList` + `CollectionPage` JSON-LD, in sitemap.
- `docs/plans/pr-plan.md` (this doc).

Files modified:
- `src/layouts/BaseLayout.astro`: accepts new `mainClass` and `bodyData` props (additive, default behaviour unchanged).
- `src/components/WaitlistSection.astro`: accepts `variant: 'default' | 'hero'` and `cta` props. `hero` variant strips heading and box chrome. CTA copy parameterised so the same component supports `Notify me at launch` (now), `Get beta access` (beta), `Sign up free` (public) without component changes. Unique form `id` prefix per variant so two instances on one page do not collide.
- `src/components/Header.astro`: dropdown gained `View all free tools` entry under a hairline `.nav-dropdownDivider`, pointing at `/free/`.
- `src/components/Footer.astro`: Free Tools column gained `View all` link to `/free/`.
- `src/styles/global.css`: appended landing-page block at the end. Chart palette tokens (`--chart-eur`, `--chart-usd`, `--chart-inr`) per theme. `html:has(body[data-page="landing"]) { scroll-snap-type: y proximity; }` (with mobile and reduced-motion overrides). `body[data-page="landing"] .site-header` backdrop-blur over alternating section backgrounds. `.snap-section { min-height: 100dvh; }` with `100vh` fallback.
- `astro.config.mjs`: sitemap filter excludes `index2` (alongside the existing transactional list). `/free/` is **not** excluded (it should be indexed).

Files deleted:
- `index.html` (root, 9 KB, pre-Astro coming-soon page).
- `baba_money.png` (root, 3.7 MB, unoptimised source for the deployed `.webp`). Repo hygiene; not deployed; not an SEO issue.

### Findings touched

PR0 does not directly close any audit finding. It pre-stages findings 1, 16, 25 for PR18 (the parked redesign already includes the new H1, the `BreadcrumbList` JSON-LD, and `Organization.sameAs` for Instagram).

### Effort

Already done. Listed for completeness so the rest of the PR sequence has a base to build on.

### Dependencies

None. Merges first.

### Privacy changelog

None. The `/free/` index collects nothing. The parked `/index2/` reuses the same Frankfurter API call already disclosed for `/free/multi-currency-net-worth/`, the same waitlist endpoint, the same localStorage key, the same PostHog instance. No new vendor, no new data, no new flow.

### Verification

- [x] `npm run build` clean.
- [x] `dist/index2/index.html` contains `<meta name="robots" content="noindex,nofollow">`.
- [x] `dist/sitemap-0.xml` does **not** contain `https://nidhi.today/index2/`.
- [x] `dist/sitemap-0.xml` **does** contain `https://nidhi.today/free/`.
- [x] `/index2/` and `/free/` render in dev with no console errors.
- [x] Hero composed SVG renders correctly in light and dark themes; live FX caption fetches from Frankfurter and falls back silently on error.
- [x] Each snap section is visible at 1280x720 and stacks correctly at 375x667 (mobile single-column).
- [x] No em dashes, no double dashes in any rendered output.

---

## PR1: SEO quick wins (markup-only batch)

> **Status**: merged. Branch `feat/seo-quick-wins`, commit `292d898`, PR #16, merged 2026-06-01 as `b3beb91`. All eight findings closed.
>
> One PR, one focused review pass, eight findings closed. All markup, schema, or metadata. Zero data-handling impact.

### Scope

In order of importance:

1. **Strip `<meta name="keywords">` site-wide** (finding 12, **highest urgency**).
   - Remove the `keywords` prop from `BaseHead.astro:50` and from every `BaseLayout` call site.
   - Delete the keyword arrays in page frontmatters. The largest stuffing site is `/free/loan-comparison/` (44 keywords, more than doubled since May).
   - Why now: Bing has hinted at penalties when stuffing is obvious; 44 keywords is unmistakable stuffing.

2. **Append `| nidhi` to blog post and tag-page titles** (finding 2).
   - `src/layouts/BlogPost.astro:118`: change `title={title}` to `title={\`${title} | nidhi\`}`. Audit each post's frontmatter title: must stay under ~55 chars so the suffix fits Google's ~60-char SERP cap.
   - `src/pages/blog/tag/[tag].astro:93`: append `| nidhi` to the `meta?.title` branch (or trim the suffix from the fallback and append once at the end).

3. **Preload primary Inter font** (finding 10).
   - `src/components/BaseHead.astro`: add a `<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>`.
   - Only the latin variant; latin-ext is rarely needed on first paint.

4. **Surface `Updated [date]` on blog posts** (finding 15).
   - `src/layouts/BlogPost.astro:138`: render `Updated [dateStr]` next to or below the publish date when `updatedDate` is set and differs from `pubDate` by more than a week.
   - Visible recency lifts CTR on evergreen finance content.

5. **Fix `BlogPosting.image` dimensions** (finding 22).
   - `src/layouts/BlogPost.astro:57-62`: point `BlogPosting.image` at `/brand/social/og-image.png` and emit the actual dims `1200x630`. The existing pointer at `/baba_money.webp` with declared `800x1200` is wrong on both URL and dims.
   - When PR16 ships, this gets repointed at the per-post OG image.

6. **Add JSON-LD to `/privacy/`** (finding 23).
   - `src/pages/privacy.astro`: emit `WebPage` (with `name`, `url`, `datePublished`, `dateModified`, `breadcrumb`) and a small `BreadcrumbList`. Single-page schema gap closed.

7. **Encode `[tag]` in tag-page BreadcrumbList** (finding 27).
   - `src/pages/blog/tag/[tag].astro:102`: wrap with `encodeURIComponent`. Pre-emptive bug fix.

8. **Add native `title` attribute to `<abbr class="finosopher">`** (finding 19).
   - `src/pages/index.astro:41`: `title="finance + philosopher"`. Polish.

### Effort

Done. Estimated 1.5-2 h, actual within band.

### Dependencies

PR0.

### Privacy changelog

None. Markup, schema, and metadata changes only; no user-data scope change.

### Verification

- [x] `dist/` rebuild contains zero `<meta name="keywords">` tags. Verified via grep.
- [x] All blog post titles in `dist/blog/*/index.html` end with `| nidhi`.
- [x] All tag-page titles in `dist/blog/tag/*/index.html` end with `| nidhi`.
- [x] `<link rel="preload">` for `inter-latin.woff2` appears in every `<head>` in `dist/` (42/42 pages).
- [x] One representative blog post with `updatedDate` set renders both publish and updated dates (`/blog/what-is-net-worth/`, pubDate 2026-04-19, updatedDate 2026-05-07).
- [x] `BlogPosting.image` JSON-LD now references `og-image.png` with `1200x630`.
- [x] `dist/privacy/index.html` contains `<script type="application/ld+json">` blocks for `WebPage` and `BreadcrumbList`.
- [x] Built tag-page BreadcrumbList JSON-LD passes `encodeURIComponent` (every current tag is plain ASCII, so no surface change today; the call site is now safe for future tags with spaces or unicode).
- [ ] Lighthouse SEO score on `/`, `/blog/`, `/blog/<post>/`, and `/free/loan-comparison/` is at least equal to pre-PR baseline. Not measured locally; deferred to a post-deploy spot-check.

### Follow-ups surfaced during PR1

- Several blog post frontmatter titles already exceed ~55 chars; with the `| nidhi` suffix appended, they now exceed Google's ~60-char SERP cap and will be truncated. Per-post title shortening is content work and was out of PR1's markup-only scope. Queue as a small content pass before PR5 lands.

---

## PR2: Internal linking + tag discovery

> **Status**: merged. Branch `feat/internal-linking`, commit `be4efcf`, PR #17, merged 2026-06-01 as `e659fa3`. Closes findings 4 (render side), 5, 20, 26.
>
> Strengthens the crawlable internal-link graph. Pure template work; no content rewrites yet (PR5 carries the population side).

### Scope

1. **Render `relatedSlugs` block in `BlogPost.astro`** (finding 4, render side).
   - Reuse the card pattern from `src/pages/free/multi-currency-net-worth.astro:333-341` for visual consistency.
   - Render as a 3-up "Keep reading" block above `SubscribeSection`.
   - Filter against published slugs the same way that page does (silent fallback for unpublished targets).
   - Resolution honours the documented schema contract: `relatedSlugs` first, then a tag-overlap fallback against the published corpus when fewer than 3 candidates remain. Backward-only link discipline: a related entry must have `pubDate` on or before the linking post's `pubDate`. The earliest post in the corpus therefore renders no related block, which is correct.
   - Frontmatter population (PR5) will replace tag-overlap picks with editorially curated ones; the render path is the same either way.

2. **Build `/blog/tag/` index page** (finding 5).
   - New file: `src/pages/blog/tag/index.astro`.
   - Lists every tag the published corpus actually uses (not just the curated `TAG_META` set; tags missing from `TAG_META` get a generated fallback blurb).
   - Sorted by post count (descending), tie-broken alphabetically.
   - Emits `CollectionPage` (with `hasPart` listing every tag URL) + `BreadcrumbList` JSON-LD.
   - Linked from blog index ("Browse by topic") and footer ("Browse topics").

3. **Convert `LearningPath.tsx` chips from `<button>` to `<a>`** (finding 26).
   - `src/components/LearningPath.tsx:145` (per-card tag chips) and `:331` (filter-bar chips).
   - `<a href="/blog/tag/${encodeURIComponent(tag)}/">` carrying the same click handler.
   - New `interceptTagClick` prop on `<LearningPath>`: defaults to `true` (blog index → click filters in place via `e.preventDefault()`); explicitly `false` on the per-tag page so a chip click navigates to the new tag's page.
   - Net behaviour: identical UX, plus crawlable links in the static HTML.

4. **Add "Browse all topics" CTA on `[tag].astro`** (finding 20).
   - Bottom of post list, before footer. Dotted-underline treatment for affordance consistency with the related-tools footer link.

5. **Refactor: extract shared tag metadata** (incidental, not a numbered finding).
   - `TAG_META` and `formatTag` moved to `src/utils/tags.ts` so the new tag hub and the existing `[tag].astro` route share one source. `TAG_META` titles now end with `| nidhi` directly so the tag page no longer has to append the suffix at the call site.

### Effort

Estimated 2.5-3 h, actual within band.

### Dependencies

PR0. Independent of PR1.

### Privacy changelog

None. Pure markup, schema, and template work; no new data collection, storage, third-party calls, or user-facing flows that touch personal data. The new `/blog/tag/` route emits no requests beyond the static page render. Tag-chip clicks on the blog index and tag pages stay client-side; the new anchors give crawlers a real link, but the click handler still controls the actual behaviour.

### Verification

- [x] `dist/blog/tag/index.html` exists with `CollectionPage` + `BreadcrumbList` JSON-LD.
- [x] Tag index page is reachable from the blog index ("Browse by topic" link) and from the footer ("Browse topics" link under Learn).
- [x] Built blog post pages render the "Keep reading" 3-up block when at least one published post matches by `relatedSlugs` or tag overlap. The earliest post (`/blog/what-is-net-worth/`) correctly renders no block (no backward-eligible candidates).
- [x] `dist/blog/index.html` and `dist/blog/tag/<tag>/index.html` both contain `<a href="/blog/tag/...">` instead of `<button>` for the chip elements (55 anchor chips on the blog index; 0 button chips anywhere in `dist/`).
- [x] Tag chip click on the blog index still triggers the React filter via the default `interceptTagClick=true` (verified by inspecting the serialized island props: blog index omits the prop and falls back to the default; tag page passes `interceptTagClick: false`).
- [x] Tag chip click on a tag page navigates to the new tag's page (no filter context to preserve).
- [x] `dist/sitemap-0.xml` includes `https://nidhi.today/blog/tag/`.

---

## PR3: Performance + sitemap + dynamic OG

> **Status**: merged. Branch `feat/perf-sitemap-search`, commit `66535cc`, PR #18, merged 2026-06-03 as `0fdaec2`. Closes findings 9, 11, 24.
>
> Markup and config that improves Core Web Vitals and OG accuracy. Independent of content changes.

### Scope

1. **Resize hero image** (finding 9).
   - Source `public/baba_money.webp` (800x1200, 411 KB) replaced with `public/baba_money-200.webp` (200x300, ~28 KB). 93% smaller, rendered at 100x150 CSS on home and 80x120 on beliefs (so the 200-wide source covers DPR 2 cleanly without overfetching for non-retina viewers).
   - Encoder note: cwebp prefers a paletted lossless mode for this illustration; quality flags plateau around 28 KB. The "8-15 KB" estimate in the original plan was optimistic for a 200-wide illustration with limited palette. 28 KB is still a 93% reduction.
   - Hand-authored `<img>` with `width="200" height="300"` (intrinsic dims, browser scales via CSS), `fetchpriority="high"`, `loading="eager"`, `decoding="async"` on both home and beliefs hero. No `<picture>` element: a single source that covers both rendered sizes is enough, and srcset would only matter if the source asset were big enough to benefit from a smaller variant.
   - Old `public/baba_money.webp` deleted (no remaining references; was orphaned after PR1 repointed `BlogPosting.image` at `/brand/social/og-image.png`).

2. **Sitemap `<lastmod>`** (finding 11).
   - `serialize` hook added to `@astrojs/sitemap` in `astro.config.mjs`. Per-URL resolution:
     - Blog post (`/blog/<slug>/`): `updatedDate ?? pubDate` from frontmatter.
     - Tag page (`/blog/tag/<tag>/`): newest `updatedDate ?? pubDate` among published posts carrying that tag (filtered by `pubDate <= now` so future-dated drafts don't leak through).
     - Tag hub (`/blog/tag/`): newest among all tag dates above, falling back to git author-date of the source file.
     - Other static pages (`/`, `/beliefs/`, `/privacy/`, `/blog/`, `/free/...`): git author-date of the matching source file.
   - Frontmatter is read directly via `fs` + a minimal line-based parser; `astro:content` is not available at config-load time. Parser handles the subset of YAML the corpus actually uses (scalar lines + inline tag arrays).
   - All 38 indexable URLs now carry `<lastmod>`.

3. **Accept `imageWidth`, `imageHeight`, `imageAlt` props in `BaseHead.astro`** (finding 24).
   - `BaseHead.astro` props (`imageWidth`, `imageHeight`, `imageAlt`) thread through `BaseLayout.astro` to the meta tags. Defaults are `1200`, `630`, and a generic site-level alt text — so existing call sites render identically.
   - New `og:image:alt` meta added (was previously only on Twitter; now shared with OG so Facebook and LinkedIn previews carry alt text too).
   - Pre-emptive fix: PR16's per-post OG generator will start passing per-post dims and alt text without further changes here.

4. **Index2 parity**: parked redesign already uses `BaseLayout` defaults for OG; no override needed. No baba_money image on index2; no change. SearchAction added in PR4 (see below) so the post-PR18 home retains the wire-up.

### Effort

Estimated 2-3 h, actual within band (some time bled into picking encoder settings before accepting the 28 KB plateau).

### Dependencies

PR0. Independent of PR1, PR2.

### Privacy changelog

None.

### Verification

- [x] Built home page references the resized hero asset (`/baba_money-200.webp`) with explicit `width="200" height="300"`, `fetchpriority="high"`, `loading="eager"`, `decoding="async"`.
- [ ] Lighthouse LCP on `/` and `/beliefs/` is materially improved over pre-PR baseline (record both). Not measured locally; deferred to a post-deploy spot-check.
- [x] No CLS regression: image reserves its own slot via `width`/`height` attributes; the 200/300 ratio matches the 800/1200 source.
- [x] `dist/sitemap-0.xml` contains `<lastmod>` for every URL (38/38).
- [x] Blog posts with newer `updatedDate` show that date in the sitemap, not `pubDate` (verified on `/blog/what-is-net-worth/`: pubDate 2026-04-19, updatedDate 2026-05-07, sitemap shows `2026-05-07T00:00:00.000Z`).
- [x] `BaseHead` accepts the new props with sensible defaults; existing pages render identical OG dims (1200x630) and alt text.
- [x] New `og:image:alt` meta tag emits alongside `twitter:image:alt`.
- [x] Old `public/baba_money.webp` removed; no remaining references in `src/`.

---

## PR4: `WebSite.SearchAction` wire-up

> **Status**: merged (shipped together with PR3 in branch `feat/perf-sitemap-search`, PR #18, merged 2026-06-03 as `0fdaec2`). Closes finding 17.
>
> Honour the existing schema declaration on `/` so the SERP sitelinks search box, if Google grants it, lands on a working query page.

### Scope

Implemented option (a) per the original plan: wire it up.

- **`src/components/LearningPath.tsx`**: seed `searchQuery` state from `?q=` on mount (alongside the existing `?tag=` deep link). New effect mirrors `searchQuery` back into the URL via `history.replaceState` whenever it changes; empty queries clean the param off the URL so shared links don't carry stale state. No history entries pushed (back-button stays useful), no navigation.
- **`src/pages/index2.astro`**: `webSiteSchema` now declares `potentialAction` matching the live home, so when the parked redesign graduates to `/` in PR18 the SearchAction does not silently regress.

### Effort

Estimated 30-45 min, actual within band.

### Dependencies

PR0. Independent. Bundled into the same PR as PR3 because the changes are small and the verification touches the same surface (rebuilt blog index).

### Privacy changelog

None. URL state is local to the visitor's browser; no new collection or transmission.

### Verification

- [x] Bundled `LearningPath.*.js` reads `params.get("q")` on mount and calls `replaceState` on query change.
- [x] `dist/index.html` continues to declare the `WebSite.SearchAction` JSON-LD; `dist/index2/index.html` now also declares it.
- [ ] Manual: visiting `/blog/?q=savings` lands the page with `savings` pre-filled in the search input and the filter applied.
- [ ] Manual: typing in the search box updates `?q=` in the URL without a full navigation.

---

## PR5: Schema track for content (FAQ + relatedSlugs + inline links)

> **Status**: implemented on branch `feat/schema-track` (awaiting review/merge). Closes finding 7 and the population side of finding 4. All 32 posts now carry `faq:` and `relatedSlugs:`; backward-only inline links added throughout; `updatedDate` bumped to 2026-06-03 on the 21 already-published posts.
>
> Pure frontmatter and prose work. No template change. Highest ROI per hour in the audit. Splittable into PR5a and PR5b if reviewers prefer smaller diffs (split by topic cluster: Discovery vs Building).

### Scope

1. **Populate `faq:` on the 28 posts that lack it** (finding 7).
   - Currently 4 posts have it: `how-to-get-out-of-debt`, `emergency-fund`, `budgeting`, `credit-and-credit-scores`.
   - 4-6 Q&As per post. Answers 80-120 words. Pull questions from People-Also-Ask, Reddit threads in the relevant subreddit, and the "frequently asked questions" sections of competing pages on the same query.
   - Answers must be standalone: someone reading the SERP snippet should get the answer without clicking through.
   - Existing FAQ rendering in `src/layouts/BlogPost.astro:89-100` picks them up automatically.

2. **Populate `relatedSlugs:` on all 32 posts** (finding 4, population side).
   - 3-5 slugs per post, ordered by topical fit.
   - Renders via the block added in PR2.
   - Backward-only link discipline applies: each `relatedSlugs` entry must point to a post whose `pubDate` is on or before the linking post's.

3. **Add 2-5 inline contextual `[anchor](/blog/slug/)` links per post body**.
   - Plain markdown links inside the existing prose. No template change.
   - Same backward-only constraint.

### Effort

8-12 h. Solo, focused. Can ship as one PR or split into PR5a (Discovery cluster) + PR5b (Building cluster) for review hygiene.

### Dependencies

PR2 (must merge first so populated `relatedSlugs:` actually renders).

### Privacy changelog

None. Content edits.

### Verification

- [x] `rg "^faq:" src/content/blog/ --files-with-matches | wc -l` returns 32.
- [x] `rg "^relatedSlugs:" src/content/blog/ --files-with-matches | wc -l` returns 32.
- [x] Representative posts render correctly: `income-vs-wealth` emits a valid `FAQPage` (5 questions); `cash-flow-101` renders the "Keep reading" 3-up with three real cards (`what-is-net-worth`, `income-vs-wealth`, `emergency-fund`); inline `/blog/...` links appear in the prose. The earliest post `what-is-net-worth` correctly has `relatedSlugs: []` and renders no block.
- [x] Backward-only link discipline upheld: full programmatic scan of all 32 posts found zero forward references in `relatedSlugs` or inline body links (two pre-existing forward links in posts 17 and 22 were rewritten to backward targets).
- [x] `npm run build` clean (45 pages); 21 published posts emit `FAQPage` JSON-LD in `dist/` (11 future-dated posts not yet built, expected).
- [x] `updatedDate` bumped to 2026-06-03 on the 21 posts with `pubDate <= today`; the 11 future-dated posts left at `updatedDate == pubDate`.
- [ ] Google Rich Results Test on one FAQ-bearing post returns no errors. Deferred to post-deploy spot-check.

---

## PR6 through PR13: Depth rewrites for thin Discovery posts

> One PR per post (4-8 PRs depending on batching). Brings each thin Discovery post above the 1,500-word threshold competing SERPs require.

### Scope (per post)

For each of the 8 thin Discovery posts (`what-is-net-worth` 544, `income-vs-wealth` 650, `how-to-calculate-net-worth` 738, `liabilities` 783, `assets` 832, `cash-flow-101` 851, `liquidity` 1,012, `emergency-fund` 1,027):

- Expand to 1,500-2,000 words with **concrete additions, no padding**:
  - 2-4 worked examples with EUR, USD, and INR figures (the audience is global English).
  - FAQ block (4-6 Q&As) if not already populated in PR5.
  - Country-specific notes where applicable: net worth conventions, tax treatment, currency considerations.
  - 3-5 inline contextual links to other posts (backward-only).
  - A small comparison table or chart where the topic supports it.
  - For "how-to" posts, populate the `howTo:` schema field.
- Editorial constraint: concise, jargon-free, no synonym stuffing, no AI-generated filler. Per `blog-content-plan.md`.

Borderline posts (`appreciation-vs-depreciation` 1,104, `why-your-euro-buys-more-in-some-countries` 1,180, `purchasing-power` 1,310) get a lighter version of the same: +200-400 words, FAQ if not already, 2-3 inline links. Can be batched with PR13 or run as a single follow-up PR.

### Effort

1.5-2 h per critical post x 8 = 12-16 h. Borderline posts 45-60 min x 3 = 2.5-3 h.

### Dependencies

PR5 (so each rewrite inherits populated `faq:` and `relatedSlugs:`).

### Privacy changelog

None per PR.

### Verification (per post)

- [ ] Word count above 1,500 (or 1,200 for borderline). Verify via `wc -w`.
- [ ] At least 2 worked examples with concrete numbers, ideally one in EUR and one in another currency.
- [ ] FAQ block renders.
- [ ] 3-5 inline `/blog/...` links present in the body.
- [ ] No em dashes, no double dashes.
- [ ] Editorial spot-check: prose is concrete, not padded.
- [ ] Backward-only link discipline upheld.

### Splitting strategy

- **PR6-PR9**: 4 critical-est posts solo (`what-is-net-worth`, `income-vs-wealth`, `how-to-calculate-net-worth`, `liabilities`).
- **PR10-PR13**: remaining 4 critical posts batched 2 per PR for faster shipping (`assets` + `cash-flow-101`; `liquidity` + `emergency-fund`).
- **Optional PR**: borderline trio (`appreciation-vs-depreciation`, `why-your-euro-buys-more-in-some-countries`, `purchasing-power`) batched as one follow-up.

---

## PR14: EEAT (named author, byline, editorial policy, sameAs)

> **Status**: implemented on branch `feat/eeat-author` (awaiting review/merge). Closes findings 6 and 25.
>
> The audit's biggest structural lever for YMYL content. Anonymous money-advice sites have a hard ranking ceiling; named expertise raises it.
>
> **Author identity decision**: "nidhi" is itself a name, so the author is published as a named `Person` called nidhi, distinct from the publishing `Organization` of the same name. This gives search engines a consistent named author entity without inventing founder PII and without contradicting the deliberately anonymous, collective voice on `/beliefs/`. The qualification framing is practitioner plus research-led (builds the tools, sources every post against the references already listed on it); no credentials are claimed, consistent with the educational, not-advice footer disclaimer. `sameAs` is Instagram only for now.

### Scope

1. **`/about/` page (or expanded `/beliefs/`).**
   - Founder name, photo, professional background, qualification statement.
   - Why qualified to write about money: experience, training, perspective.
   - Linkable from footer About column and blog post bylines.

2. **Per-post visible byline** in `src/layouts/BlogPost.astro`.
   - Format: `By [Name], updated [Date]` (or `published [Date]` if no `updatedDate`).
   - Match the author schema with `url` (the new `/about/` page), `sameAs` (LinkedIn, X), short bio.

3. **`/editorial-policy/` page.**
   - How posts are reviewed, source standards, regulatory disclaimers, correction process.
   - Linked from the footer and from each blog post byline.

4. **`Organization.sameAs`** on the live home schema.
   - `src/pages/index.astro:5-12` currently has no `sameAs`.
   - Add LinkedIn, X, GitHub at minimum once those profiles exist. Instagram already on `/index2/` from PR0.
   - Closes finding 25 here so PR18 (the swap) does not have to carry it. Alternative: roll the live-home `sameAs` into PR18 itself; both are fine.

### Effort

3-5 h, mostly writing and a photo.

### Dependencies

PR0. Best timed after PR5-PR13 so the new bylines apply to the strongest version of each post, but not strictly blocking.

### Privacy changelog

**None.** Reasoning: the privacy policy describes how the site handles **visitor data**. Publishing the founder's name, photo, and bio is **editorial content about the founder**, not collection, storage, or processing of any visitor's data. No new vendor, no new flow, no new data category.

### Verification

- [x] `/about/` ships with the named author (nidhi), qualification statement (practitioner + research-led), and `knowsAbout`. Uses the existing hero asset as the avatar; no founder photo, by the author-identity decision above.
- [x] `/editorial-policy/` ships with the four content blocks: how posts are reviewed, sourcing standards, education-not-advice boundary, corrections process (plus a "who is behind this" pointer).
- [x] Blog posts render a visible byline "By nidhi" (`rel="author"`, links to `/about/`) alongside the existing publish/updated date.
- [x] Per-post `BlogPosting.author` schema is a `Person` with `name`, `url` (`/about/`), `sameAs` (Instagram), and a short `description`.
- [x] Home `Organization` schema (`dist/index.html`) includes `sameAs` (Instagram). Single profile for now; LinkedIn/X to be added when they exist.
- [x] `/about/` emits `Person` + `ProfilePage` + `BreadcrumbList`; `/editorial-policy/` emits `WebPage` + `BreadcrumbList`. Both indexable and in the sitemap (their `<lastmod>` populates once committed, since `gitLastmod` reads git author-date).
- [x] No em dashes, no double dashes; no hex literals (light/dark safe via CSS variables).

---

## PR15: PostHog defer + env wire-up

**Status: implemented on `feat/posthog-defer`. Pending review/merge.**

> Performance fix. Inline `<head>` script blocks parsing; wrapper eval and `posthog.init()` run synchronously. Affects LCP and TTI.

### Scope

1. **Wire `PUBLIC_POSTHOG_KEY` into the build pipeline.**
   - Correction to original assumption: the production key is NOT empty. It is injected at build time from the GitHub Actions secret `PUBLIC_POSTHOG_KEY` (`.github/workflows/deploy.yml:78`). Local `.env` is empty by design; the snippet no-ops in dev.
   - Added `.env.example` documenting all three `PUBLIC_` vars and that production values come from GitHub Actions secrets.

2. **Defer the PostHog script.**
   - Extracted the snippet verbatim from `BaseHead.astro` into `src/components/Analytics.astro` and rendered it at the end of `<body>` in `BaseLayout.astro` (after `CookieConsent`). Removes render-blocking from `<head>` with zero behavioural change.
   - Theme-flash prevention stays inline in `BaseHead.astro`.

### Implementation notes

- Snippet body is byte-for-byte identical to the prior `<head>` version (only load position changed); verified by diff.
- `define:vars={{ posthogKey: import.meta.env.PUBLIC_POSTHOG_KEY }}` still injects the key from the new location; built output emits `const posthogKey = "..."`.
- Runtime-simulated the moved snippet with a real key: `posthog.init` queues correctly, the async `array.js` loader injects from `eu-assets.i.posthog.com`, and the `$ai_referrer` capture still fires. The `getElementsByTagName("script")[0]` insertBefore target is always non-null (theme-flash script precedes it).

### Effort

1-2 h.

### Dependencies

PR0. Independent.

### Privacy changelog

**None.** Reasoning: same vendor (PostHog Cloud EU), same project key, same events captured, same EU instance. Deferring the load is an internal implementation detail; the visitor's data flow is unchanged. No new collection, no new processor, no new event category.

### Verification

- [x] `dist/index.html` `<head>` no longer contains the inline PostHog body; placed before `</body>`. Verified on `/`, `/blog/`, `/about/`.
- [ ] PostHog still captures pageviews on a real production load (verify in PostHog dashboard with a test pageview after deploy). Runtime-simulated locally with a real key: init queues, array.js loads, capture fires.
- [ ] Lighthouse "Avoid render-blocking resources" passes on `/` (verify post-deploy).
- [ ] LCP improvement on `/` over pre-PR baseline (verify post-deploy).
- [x] `.env.example` documents the prod key source (GitHub Actions secret).

---

## PR16: Per-post OG image generator (optional, defer if time-pressed)

> All 32 posts share `/brand/social/og-image.png`. Custom OG images materially improve social CTR; higher CTR feeds branded search and direct traffic.

### Scope

1. **Build-time generator.**
   - Render title + reading time + level onto the existing OG template per post.
   - Options: `astro-og-canvas`, `satori-html`, or a small Puppeteer script (Puppeteer is already declared in `astro.config.mjs:29`).
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

PR3 (dynamic OG dim props must exist on `BaseHead`).

### Privacy changelog

None. Build-time image generation.

### Verification

- [ ] One PR-build of the blog produces `public/og/<slug>.png` for every post.
- [ ] One representative post's `dist/blog/<slug>/index.html` references the per-post OG image with correct `og:image:width`, `og:image:height`, `twitter:image:alt`.
- [ ] OG image preview validates on Twitter Card validator and Facebook Sharing Debugger.

### Defer guidance

If time-pressed, skip PR16. PR1 already pointed `BlogPosting.image` at the generic OG image with correct dims; it is not a regression to leave it there. Roadmap-track this item.

---

## PR17: AI-bot policy update

**Status: implemented on `feat/ai-bot-policy`. Pending review/merge.**

### Decision taken

Search/citation crawlers explicitly allowed; OpenAI's `GPTBot` allowed (its fetches can surface in ChatGPT answers, treated as a citation pathway alongside `OAI-SearchBot`); `anthropic-ai` allowed; `Applebot` (Siri/Spotlight, drives traffic) allowed.

Blocked (training/scraper, no citation pathway): `CCBot` (Common Crawl corpus aggregator), `cohere-ai`, `FacebookBot`, `Meta-ExternalAgent`, `Bytespider`, `Applebot-Extended` (Apple AI-training variant, distinct from the allowed `Applebot`), `Amazonbot`, `Diffbot`, `Omgilibot`, `ImagesiftBot`, `Timpibot`.

Net change from prior file: added explicit `Allow` for `OAI-SearchBot`, `GPTBot`, `ClaudeBot`, `Claude-SearchBot`, `anthropic-ai`, `Applebot`; moved `GPTBot` and `anthropic-ai` from Disallow to Allow; kept `CCBot`, `cohere-ai`, `FacebookBot` blocked; added new blocks for `Meta-ExternalAgent`, `Bytespider`, `Applebot-Extended`, `Amazonbot`, `Diffbot`, `Omgilibot`, `ImagesiftBot`, `Timpibot`. Search-engine bots (Googlebot, Bingbot, DuckDuckBot, Baiduspider, YandexBot, Google-Extended, PerplexityBot) unchanged.

> Strategy decision required before the PR opens. Implementation is 30 minutes.

### Context

The current `public/robots.txt:25-32` blocks `GPTBot`, `anthropic-ai`, `CCBot`, `cohere-ai`, `FacebookBot`. The policy was set when these bots were training-only ("no attribution, no traffic benefit"), which was true 18 months ago. ChatGPT search and Claude search now cite source domains in answers; the citation pathway feeds branded search and direct traffic. `BaseHead.astro:118` already has a tracker for AI referrers, indicating intent to capture this traffic.

### Scope

1. **Explicitly name** `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot` as `Allow`.
   - Currently allowed by fall-through, not by explicit rule. Documenting the intent.

2. **Reconsider** the blocks on `GPTBot`, `anthropic-ai`, `CCBot` (decision-gated).
   - Allow side: training-data inclusion that surfaces in answer citations is a citation pathway to the site.
   - Block side: content used for training. Already public; arguably the only real downside is "we don't want to be in training corpora on principle."
   - Recommendation: name the search bots explicitly regardless. The training-bot decision is yours.

### Effort

30 min after the decision.

### Dependencies

PR0. Independent.

### Privacy changelog

**None.** Reasoning: `robots.txt` governs which crawlers may read **public site content**. It does not affect collection, storage, or processing of any visitor's data. The site's public pages contain no user data; PostHog data is on PostHog Cloud EU servers, not in HTML crawlers can read. The decision is editorial and SEO-strategic, not privacy-affecting.

### Verification

- [x] `dist/robots.txt` explicitly names `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot` under `Allow`.
- [x] Blocks loosened where decided: `GPTBot` and `anthropic-ai` moved to `Allow`; verified via exact-match parse of built `dist/robots.txt`.
- [x] No other bot directive accidentally changed (Googlebot, Bingbot, DuckDuckBot, Baiduspider, YandexBot, Google-Extended, PerplexityBot all still `Allow`); `Applebot` Allow vs `Applebot-Extended` Disallow confirmed distinct.

---

## PR18: Final `/` ← `/index2/` swap

> The closing move. Mechanical, small, but high-stakes because it touches the most-trafficked URL. Keep the diff focused.

### Scope

1. **Replace `src/pages/index.astro` content** with the contents of `src/pages/index2.astro`.
   - Equivalent: rename `src/pages/index2.astro` to `src/pages/index.astro` and delete the old. Pick the cleaner git diff for review.
   - Drop `robots="noindex,nofollow"` from the new home content.
   - Drop the `body[data-page="landing"]` attribute? Keep it; the snap-shell CSS depends on it.

2. **Drop `'index2'` from the sitemap exclusion** in `astro.config.mjs:8-11`.
   - Verify `dist/sitemap-0.xml` now contains `https://nidhi.today/` (not the parked URL).

3. **Verify no internal links still point to `/index2/`**.
   - `rg "/index2/" src/` should return zero hits in production code.

4. **Move `docs/plans/pr-plan.md` to a `done/` archive (optional).**
   - Or leave in place as the historical record. Recommend leaving in place; the appendix is durable reference.

5. **Verify `Organization.sameAs`** is on the live home.
   - If PR14 already promoted it: nothing to do here.
   - If not: copy the array from the parked `/index2/` source so it survives the swap.

### Findings closed

- **1** (home H1 becomes `See your full financial picture, in any currency.`).
- **16** (home `BreadcrumbList` JSON-LD now present).
- **25** (if PR14 has not already moved `sameAs` to the live home).

### Effort

30-45 min execution + careful review pass.

### Dependencies

PR0 obviously. PR14 ideally (so live `Organization.sameAs` is already in place). PR1, PR3 ideally (so the new home ships with all the markup wins). PR5-PR13 not blocking; rewrites apply to blog posts, not the home.

### Privacy changelog

**None.** Reasoning: the swap moves markup; same Frankfurter call, same waitlist endpoint, same localStorage key, same PostHog. No new vendor, no new data, no new flow.

### Verification

- [ ] Pre-merge: built `dist/index.html` matches the parked `dist/index2/index.html` content (one byte-level diff: the new home has no `noindex` meta).
- [ ] Built `dist/sitemap-0.xml` now lists `https://nidhi.today/` and does **not** list `https://nidhi.today/index2/` (the parked URL is gone, not just unindexed).
- [ ] No 404s introduced: `rg "/index2/"` returns zero in production code; one-off check that any external bookmarks of `/index2/` would 404 is fine (page never had real traffic).
- [ ] H1 on `dist/index.html` is `See your full financial picture, in any currency.`.
- [ ] `dist/index.html` contains `BreadcrumbList` JSON-LD.
- [ ] `dist/index.html` `Organization` schema includes `sameAs`.
- [ ] Live FX caption on the new home renders within 1 second on first paint, falls back silently on error.
- [ ] Hero waitlist form and tail waitlist form both submit successfully (Apps Script endpoint receives test).
- [ ] Light and dark mode both render correctly across all four snap sections + tail.
- [ ] Lighthouse on `/` (post-swap) is at least equal to pre-swap baseline on Performance and SEO. Record both.
- [ ] System "reduce motion" preference disables snap; mobile (<768px) has no snap.
- [ ] No em dashes, no double dashes anywhere in rendered output.

---

# Appendix A: Landing-page reference

Full copy and visual specs for `/index2/` (and post-swap `/`). Lives here so the PR0 and PR18 sections do not duplicate content.

## Three jobs of the home page

1. **Convert visitors to waitlist signups** (primary).
2. **Rank for target organic queries** so visitors arrive in the first place. Home is the most-linked page on the site.
3. **Build trust for YMYL content.** Financial-planning is "Your Money or Your Life" in Google's quality framework.

These goals are in tension. A pure brand-positioning page converts but does not rank. A keyword-stuffed page ranks but does not convert. The plan resolves the tension by leading with the user problem, naming the capability that solves it, and surfacing trust artifacts visibly.

## Phase durability

The same structure carries from waitlist to beta to public release. Only narrow edits between phases:

- **Pre-launch (current):** Hero CTA `Notify me at launch`. Free tools live in chrome only.
- **Beta:** CTA `Get beta access`. Same form, same component, same endpoint. One copy swap.
- **Public:** CTA `Sign up free`. Form posts to auth flow instead of waitlist endpoint. Same component, swap action.

Section structure, headings, capability claims, trust artifact, and SEO metadata are stable across all three phases. Build right once.

## Capabilities shippable at or near launch (within 3 months)

- Multi-currency net worth (already live as the free tool; enhanced in the authenticated product).
- Net worth tracking with history.
- FIRE / retirement projections (real returns, inflation-adjusted, **deterministic forecast** with assumptions visible). Probabilistic ranges out of scope at launch.
- What-if scenarios (compare two paths side by side).

Monte Carlo simulations are **roadmap, not launch-day**. Copy must not promise them.

## Query intent and copy strategy

Two query clusters carry equal weight in copy, with multi-currency leading in the H1.

1. **Multi-currency / expat financial planning** (lead in H1):
   `multi-currency net worth`, `expat financial planner`, `currency exposure calculator`, `cross-border net worth tracker`.
2. **Financial independence planning** (strong second beat in subhead and section 2):
   `FIRE calculator`, `when can I retire`, `financial independence planner`, `early retirement projections`.
3. **General planning software** (deliberately skipped on home): too competitive for a thin home page. Addressed via blog content.

Phrases to land naturally (H1, subhead, at least one H2, one body paragraph):

- "financial picture" or "financial planning"
- "multi-currency" or "across currencies"
- "net worth"
- "financial independence" or "retirement planning"

## Section roster

**Four snap sections + non-snap conversion tail.**

1. Hero (summary card + form + trust line)
2. Capability 1: Multi-currency net worth
3. Capability 2: Projections you can plan around
4. Capability 3: What-if scenarios
5. Conversion tail (does not snap; self-check + trust strip + full WaitlistSection + Footer.astro chrome)

### Why no free-tools section on the home page

The May draft included a fifth snap section showcasing the two shipped free tools. Removed in June. Reasoning:

- **Header dropdown already links them on every route**, with two specific tools and a "View all free tools" entry pointing at `/free/`. Footer column carries the same.
- **Section interrupted the conversion narrative.** Hero -> 3 capability snaps -> self-check -> trust -> waitlist is a tight funnel.
- **Messaging conflict.** Hero promises an upcoming product; "the multi-currency one already works today" sat directly under it.
- **Internal-link signal loss is small.** Tool pages still receive incoming links from the header on every route, the footer on every route, the new `/free/` index, and per-tool "related reading" rails to relevant blog posts.

## Section 1: Hero

### Layout

- **Desktop (>=1024px):** two columns. Left: copy + form + trust line. Right: visual primitive.
- **Mobile:** single column. Copy + form + trust line. Visual hidden.

### Copy

- **Eyebrow:** `Money, understood` (kicker, not H1).
- **H1:** `<h1>See your full financial picture, in any currency.</h1>` (~7 words; carries `financial picture` and `currency`).
- **Subhead:** "Track net worth across currencies, project when you can stop working, and compare decisions before you make them." (~18 words; three capabilities, no jargon).
- **Inline form** (`WaitlistSection` with `variant="hero"` prop). CTA copy by phase: `Notify me at launch` / `Get beta access` / `Sign up free`.
- **Trust line** (one sentence, ~25 words):
  > "Built because no planner handled my actual life: assets in three currencies, debts in two, retirement that crossed borders. Free during beta, free tier always after. [More on our beliefs.](/beliefs/)"
- **Scroll affordance:** static chevron at section bottom. `aria-hidden`, decorative, no animation.

### Visual primitive (right column, desktop only)

A two-panel summary card grouped in a single ~360x340px frame, with a horizontal divider between panels.

**Top panel: total + currency mix.**
1. Eyebrow `NET WORTH` in muted small caps.
2. Big total `EUR 124,300` in heading typography, deep-blue, centered.
3. **Horizontal stacked bar** showing currency split (62% EUR, 28% USD, 10% INR). Outer corners rounded only on the leftmost and rightmost segments so the whole bar reads as a single capsule. **Deliberately a different visual idiom from section 2's labelled donut**; same data, different shape.
4. Inline label below the bar: `EUR 62% · USD 28% · INR 10%`.

**Bottom panel: short-horizon track.**
1. Eyebrow `12-MONTH TRACK` in muted small caps.
2. Three subtle gridlines (top, mid, axis).
3. Sparkline showing the last 12 months of net worth trending up, **solid stroke**.
4. "today" marker (filled circle with white halo) at the historical-to-forecast handoff.
5. **Dashed continuation** for a 12-month forward extrapolation. Slope deliberately slightly less steep than historical so it reads as conservative, not a hockey stick.
6. Axis labels `12 mo ago | today | + 12 mo`.

**Intentionally NOT in the hero visual:**
- No donut, no labelled wedges, no currency legend with percentages: section 2.
- No FI target line, no crossing year, no assumptions block: section 3.
- No forecast cone, no probability band, no multiple sample paths: those read as Monte Carlo, which is roadmap.
- No comparison-of-paths visual: section 4.

Each capability section has something genuinely new to show, instead of being a more detailed copy of what the hero already covered.

### Live FX caption

- Single small caption underneath the visual: `Live ECB rate: 1 EUR = 1.0XX USD`.
- Pulled at page load from the Frankfurter API (the same API the existing multi-currency tool uses; preconnect already in `multi-currency-net-worth.astro:231`).
- One fetch on hydration, no polling. Fails silently on error (caption hides).
- `aria-live="polite"` so a screen reader announces the rate once when it lands.
- This is the **only interactive element on the home page**, and it earns its place: it proves the "live FX rates" claim.

### Mobile fallback

Hide the visual entirely below 1024px. Per-capability visuals in sections 2-4 do show on mobile (stacked below copy).

## Sections 2-4: capability sections (Attio-pattern)

Three consecutive snap sections, one per capability. Same template:

- **Layout:** two-column, alternating. Sections 2 and 4: copy left, visual right. Section 3: copy right, visual left. Mobile: single column.
- **Per-section budget:** one short H2, one to two sentences (~30-40 words), one composed inline SVG mock (480-560 px wide on desktop).
- **No CTA per section.** Hero form and tail waitlist carry that job.

### Section 2: Multi-currency net worth

- **H2:** `See your wealth in any currency, all at once.`
- **Body:** "Track every asset and liability in any currency. See your net worth in your spending currency, with live ECB rates. See where the concentration sits, and where it should not."
- **Visual (right column):** composed mock with three elements:
  1. Stylised list of 4-5 line items: `Apartment, Prague, EUR 280,000`, `Brokerage, US, USD 47,300`, `Savings, India, INR 8,40,000`, etc. Each with a small currency-code badge.
  2. 3-wedge donut showing the resulting currency split.
  3. Net-worth total in a large readable font: `EUR 451,200` with a small "example" badge.
  - Total ~6KB inline SVG.

### Section 3: Projections you can plan around

- **H2:** `Know when you can stop working.`
- **Body:** "Inflation-adjusted projections for net worth, retirement, and financial independence. The assumptions are visible alongside the answer. Change them, and watch the year move."
- **Visual (left column):**
  1. Short historical sparkline (last 12 months) transitioning into a **single deterministic forecast curve** over ~25 years. **No fanned cone, no probability band, no dashed median:** a probabilistic visual would read as Monte Carlo, which is roadmap.
  2. Horizontal target line labelled `Financial independence`. Label anchored at the **left** end (rising forecast passes through the upper right; right-anchored label would visually collide).
  3. Marker where the forecast crosses the target, with a short dashed drop-line down to the time axis: `Reaches FI at year 16.`
  4. Below the chart, the three driving assumptions, separated by middle dots: `Real returns 5% · Inflation 2.5% (EUR) · Savings rate 38%`.
  - Total ~6KB inline SVG.

**Intentionally NOT in this visual:**
- Forecast cone or probability band: reads as Monte Carlo.
- Multiple sample paths or percentile bands: same reason.
- "Most likely" framing: implies probability distribution; deterministic projections produce a single answer per assumption set.

### Section 4: What-if scenarios

- **H2:** `Compare decisions before you make them.`
- **Body:** "Run two paths side by side. Higher savings rate, different asset mix, foreign-currency mortgage, retirement in a different country. Each gives a yes-or-no, not a guess."
- **Visual (right column):** composed mock with:
  1. Two parallel sparklines labelled `Save +5pp` and `Current`. Both ending at +20 years, with the second visibly higher.
  2. Single centered outcome line below the chart: `After 20 years: about EUR 220k more by saving 5pp extra.`
  - Total ~5KB inline SVG.

The visual was simplified in June: an earlier draft had a dual-claim footer ("Retire 3 years sooner" + "Net worth at 60: +EUR 220k") that mixed timeframes (20-year horizon vs age 60) and asserted a retirement claim the chart never visualised. Replaced with one delta the chart actually shows.

## Section 5 (tail, does not snap): self-check + trust strip + waitlist + footer

Last section, no `scroll-snap-align`. Scrolls naturally as a tail. Order matters and is fixed:

1. Self-check
2. Trust strip
3. Full WaitlistSection (default variant with heading and box chrome)
4. Footer.astro (renders below `<main>` per default Astro flow)

### Self-check

After three capability sections, the reader has seen what nidhi does. The self-check converts that observation into "and yes, that's me." Acts as the priming gesture for the form immediately below.

- **Heading:** `<h3>nidhi is for you if:</h3>`
- **Bullets** (statements, not questions; parallel structure):
  - You hold money or debts in more than one currency.
  - You have moved countries, or plan to, and your savings have not caught up.
  - You want to know, with some confidence, when you can stop working.
  - You want to see what changes if you save five percent more, or take a lower-paying job you actually want.
  - Your retirement depends on where you eventually live.
  - Your spreadsheet has stopped keeping up, or you would rather not maintain one at all.
- **Closing line:** `If any of these sound like you, drop your email below.`

The form is the next block. Phrasing builds momentum into it without an anchor link or scroll jump.

The June revision rewrote this section: the previous draft used a question heading ("How do you know if nidhi is for you?") with question-form bullets, layered behind an "Ask yourself:" intro. Two layers of questions broke the rhythm. Statements scan faster and parallel the other "You..." bullets in length and shape.

### Trust strip

A small four-line block of factual data-handling claims. Sits between the self-check and the form. Visually a muted aside, not a billboard: smaller type, lighter color, low-contrast box. **Not a "trust badge wall"** of vendor logos and certification seals; just specific verifiable facts.

Phase-specific because data-handling reality changes when the authenticated product launches.

#### Pre-launch (today)

> **What this means for your data**
>
> - Free-tool calculations run entirely in your browser. Your numbers never leave the page.
> - No ads. No data selling. Analytics on EU servers only (PostHog Cloud EU).
> - We never share or sell your email. One click to unsubscribe from anything.
> - GDPR-aware. [Read the full privacy policy.](/privacy/)

#### Beta and post-launch

> **What this means for your data**
>
> - Free tools run entirely in your browser; your numbers never leave the page.
> - The authenticated product stores your data encrypted on EU servers (DigitalOcean EU). Never shared. Never sold. Never used to train AI models.
> - No ads. No third-party trackers beyond PostHog (EU). One click to unsubscribe from email anytime.
> - GDPR-aware. [Read the full privacy policy.](/privacy/)

The "never used to train AI models" line is a deliberate addition for the post-launch version. As more financial products feed user data into ML training pipelines, an explicit no-training commitment is becoming a meaningful YMYL trust differentiator. **Only ship this line if you are committing to it**; once written, it constrains internal AI/ML use.

#### Privacy policy backing (pre-launch)

Every claim is already supported by `src/pages/privacy.astro`:

| Claim | Backing in privacy policy |
|---|---|
| Free-tool calculations run in your browser; numbers never leave the page | Lines 178, 189, 301 |
| No ads, no data selling, no third-party trackers beyond PostHog (EU) | Lines 211, 414, 416 |
| Never share/sell email, one click unsubscribe | Lines 212, 338, 414 |
| GDPR-aware | Line 454 |

**Pre-launch ships with no privacy policy edits.**

#### Beta/post-launch privacy policy edits

Required additions when the auth product ships:

- DigitalOcean EU as a processor (encrypted storage of user account data).
- Encryption at rest claim, encryption in transit claim, both with specifics.
- Retention policy for account data (and what happens on account deletion).
- Explicit "we do not use your data to train AI models" clause if the trust strip claims it.
- Updated processor list (currently lists PostHog Cloud EU, Google Workspace EU, GitHub Pages, browser localStorage; needs DigitalOcean EU added).

Tied to the auth product launch, not this redesign. Both update in the same PR with a `material: true` changelog entry.

#### What is intentionally NOT in the trust strip

- "Bank-grade security," "ISO 27001," "SOC 2," any certification seal. None are real.
- "Trusted by N users" or customer logos. We have no users yet.
- "Open methodology, every formula in the blog." Aspirational, only partially true today.
- Newsletter-vs-waitlist opt-in distinction. Privacy policy carries the precision; trust strip is for fast trust.

## Scroll behavior (technical)

Implemented in `global.css` (PR0). Final behavior:

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 60px;          /* fixed-header height */
}

@media (min-width: 768px) and (prefers-reduced-motion: no-preference) {
  html:has(body[data-page="landing"]) {
    scroll-snap-type: y proximity;
  }
  body[data-page="landing"] .snap-section {
    scroll-snap-align: start;
    scroll-snap-stop: normal;        /* not 'always' */
  }
}

.snap-section {
  min-height: 100dvh;
}
@supports not (min-height: 100dvh) {
  .snap-section { min-height: 100vh; }
}
```

- **Single scroll container = the document.** No `overflow-y: auto` on `<main>`. One scrollbar, one mental model.
- **Mobile (<768px): no snap.** Page scrolls naturally. Sections still have `min-height: 100dvh`.
- **Desktop with reduced-motion: no snap.**
- **Desktop default: proximity snap.** Sections magnetize but the user can scroll past or stop mid-section without being yanked.
- **`scroll-padding-top: 60px`** matches the fixed header so a snapped section's top sits just below the header.
- Footer (rendered after `<main>`) has no `scroll-snap-align`, scrolls naturally as a tail.

## SVG conventions for both themes

Every composed SVG mock follows the same rules so the same markup renders correctly in both themes without duplication.

- **All fills and strokes use CSS variables or `currentColor`.**
  - Donut wedges: `fill="var(--chart-eur)"`, etc.
  - Sparkline strokes: `stroke="var(--color-deep-blue)"`.
  - Text: `fill="var(--color-text-primary)"` for primary, `var(--color-text-muted)` for secondary.
  - "Example" badges: `fill="var(--color-bg)"` background, `var(--color-text-muted)` text.
- **No literal hex codes anywhere in SVG markup.** If a color is needed without a token, add the token to `global.css` first (with both light and dark values).
- **Avoid white backgrounds inside SVG.** Use `var(--color-bg-white)` or transparent.
- **Color-coded data uses chart palette tokens** (`--chart-eur`, `--chart-usd`, `--chart-inr`). Defined in `global.css` per theme.

Per-section background colors (alternating, low contrast):

- Section 1 (hero): `var(--color-bg)`
- Section 2 (multi-currency): `var(--color-bg-white)`
- Section 3 (projections): `var(--color-bg)`
- Section 4 (what-if): `var(--color-bg-white)`
- Tail (self-check + trust + waitlist + footer): `var(--color-bg-white)`

## Visual treatment rules

- **Generous whitespace.** Sections target 60-70% content density at most.
- **Restrained brand colors via tokens, never hex.** Deep blue and teal as accents.
- **Type scale follows existing tokens.** H1 ~2.4rem desktop, 1.8rem mobile. H2 ~1.4rem. Body 1rem.
- **No bouncing CTAs, no animated counters, no parallax.** Static, deliberate, calm.
- **Static scroll chevron**, `aria-hidden`, no animation.
- **No floating images.**
- **Section dividers restrained.** A 1px border in `--color-border-light`, not a colored band.

---

# Appendix B: SEO findings catalog

All 27 findings, condensed. Each cross-refs the PR that closes it. Full evidence and per-finding fix detail were preserved by reading them into the relevant PR scope sections above; this catalog is the lookup index.

## Status legend

- **Open**: present in May 2026 audit, not yet fixed.
- **Open (worse)**: present in May, has degraded since.
- **New (June 2026)**: surfaced in this revision.
- **Resolved**: addressed since the May audit.
- **Conditional resolve**: closes automatically when `/index2/` graduates to `/`.

## Catalog

| # | Title | Status | Closes in |
|---|---|---|---|
| 1 | Home page H1 is the brand word, not a keyword phrase | Conditional resolve | PR18 |
| 2 | Blog post `<title>` tags omit the brand suffix; tag pages too | **Resolved** (PR1) | — |
| 3 | Discovery posts too thin to rank | Open | PR6-PR13 |
| 4 | Internal linking weak; `relatedSlugs` is dead code | **Resolved** (render side, PR2); population in PR5 | PR5 |
| 5 | `/blog/tag/` returns a 404 | **Resolved** (PR2) | — |
| 6 | EEAT signals missing for YMYL content | Open | PR14 |
| 7 | FAQ schema wired but used by only 4 of 32 posts | Open | PR5 |
| 8 | PostHog snippet render-blocking (deferred to end of body in PR15; key supplied by GH Actions secret, not inert) | Addressed (PR15 pending merge) | PR15 |
| 9 | Hero image oversized for its rendered slot | **Resolved** (PR3) | — |
| 10 | Fonts not preloaded | **Resolved** (PR1) | — |
| 11 | Sitemap has no `lastmod` | **Resolved** (PR3) | — |
| 12 | `<meta name="keywords">` dead weight; free-tool pages stuffed | **Resolved** (PR1) | — |
| 13 | Reconsider AI-bot blocks in robots.txt | Addressed (PR17 pending merge) | PR17 |
| 14 | Per-post OG images | Open | PR16 (optional) |
| 15 | Surface "last updated" dates visibly | **Resolved** (PR1) | — |
| 16 | Add `BreadcrumbList` to home page | Conditional resolve | PR18 |
| 17 | `WebSite.SearchAction` points at non-functional URL | **Resolved** (PR4) | — |
| 18 | Repo-root cruft (`index.html`, `baba_money.png`) | **Resolved** (PR0) | — |
| 19 | `<abbr class="finosopher">` lacks native `title` attribute | **Resolved** (PR1) | — |
| 20 | Tag pages don't have a "Browse all topics" link back | **Resolved** (PR2) | — |
| 21 | Per-style budget on long inline `<style>` blocks (informational) | Open | not blocking |
| 22 | `BlogPosting.image` declares dimensions that don't match | **Resolved provisionally** (PR1); proper fix in PR16 | PR16 |
| 23 | `/privacy/` emits no JSON-LD | **Resolved** (PR1) | — |
| 24 | `og:image` width/height and `twitter:image:alt` hard-coded | **Resolved** (PR3) | — |
| 25 | `Organization.sameAs` only on parked redesign | New (June), Conditional resolve | PR14 (or PR18) |
| 26 | `LearningPath.tsx` chips are `<button>` not `<a>` | **Resolved** (PR2) | — |
| 27 | `[tag]` URL not encoded in tag-page BreadcrumbList | **Resolved** (PR1) | — |

## Per-finding evidence (file/line refs)

- **F1**: `src/pages/index.astro:37` `<h1 class="brand">nidhi</h1>`. Replacement at `src/pages/index2.astro:72`.
- **F2**: `src/layouts/BlogPost.astro:118`; `src/pages/blog/tag/[tag].astro:93`.
- **F3**: `src/content/blog/1. discovery/*.md`. Word counts in PR6-PR13 scope.
- **F4**: schema `src/content.config.ts:64`; not destructured in `BlogPost.astro:32`.
- **F5**: `src/pages/blog/tag/` has only `[tag].astro`; no `index.astro`.
- **F6**: `src/layouts/BlogPost.astro:48` `author: { '@type': 'Person', name: 'nidhi', ... }`.
- **F7**: `src/layouts/BlogPost.astro:89-100` (rendering); 4 posts use `faq:`.
- **F8**: `src/components/BaseHead.astro:99-125`; `.env` `PUBLIC_POSTHOG_KEY=`.
- **F9**: `public/baba_money.webp` 411 KB; rendered ~100x150 px at `src/pages/index.astro:35`, `src/pages/beliefs.astro:40`.
- **F10**: `src/styles/global.css:5-35` 4 `@font-face` with `font-display: swap`.
- **F11**: `dist/sitemap-0.xml` flat list, no lastmod.
- **F12**: `src/components/BaseHead.astro:50`; `/free/loan-comparison/` 44 keywords; `/free/multi-currency-net-worth/` 18.
- **F13**: `public/robots.txt:25-32`.
- **F14**: all posts share `/brand/social/og-image.png` (no `image` prop passed from `BlogPost.astro`).
- **F15**: `src/layouts/BlogPost.astro:138`.
- **F16**: `src/pages/index.astro:5-28` no `BreadcrumbList`.
- **F17**: `src/pages/index.astro:14-28` declares `?q=`; `LearningPath.tsx:171-183` reads only `tag`.
- **F18**: now resolved.
- **F19**: `src/pages/index.astro:41` `<abbr>` lacks `title`.
- **F20**: `src/pages/blog/tag/[tag].astro` has no "Browse all" link.
- **F21**: long inline styles in `multi-currency-net-worth.astro` and `loan-comparison.astro`. Informational only.
- **F22**: `src/layouts/BlogPost.astro:57-62` declares `800x1200` for `/baba_money.webp`.
- **F23**: `dist/privacy/index.html` has no `application/ld+json` block.
- **F24**: `src/components/BaseHead.astro:66-67` (dims), `:85` (alt).
- **F25**: `src/pages/index2.astro:18-21` has `sameAs`; live `index.astro:5-12` does not.
- **F26**: `src/components/LearningPath.tsx:145, 331`.
- **F27**: `src/pages/blog/tag/[tag].astro:102` no `encodeURIComponent`.

---

# Appendix C: Verification (cross-cutting checks)

Most checks are PR-local (in each PR's section above). These are the cross-cutting ones that span multiple PRs and the swap.

## Build hygiene (every PR)

- [ ] `npm run build` clean.
- [ ] No console errors on dev or production preview.
- [ ] No regressions in Lighthouse Performance or SEO score on `/`, `/blog/`, `/blog/<post>/`, `/free/`, `/free/<tool>/`. Record pre/post numbers per PR.

## Cross-theme (any PR touching markup or SVG)

- [ ] Light theme: every changed page renders correctly.
- [ ] Dark theme: every changed page renders correctly.
- [ ] System theme: respects `prefers-color-scheme` on first load.
- [ ] No flash of incorrect theme on page load (existing flash-prevention script in `BaseHead.astro:26-34`).
- [ ] Form input borders, focus rings, button hover states match in both themes.

## Accessibility (any PR touching markup, SVG, or layout)

- [ ] One H1 per page, well-formed H2s.
- [ ] Tab order logical: skip-link, header, content, form fields.
- [ ] Color contrast passes WCAG AA in both themes.
- [ ] `prefers-reduced-motion` respected.
- [ ] Focus states on form fields and buttons are visible.

## Scroll behavior (PR0 and PR18 specifically)

- [ ] Desktop with proximity snap: scrolling past a section is smooth; sections magnetize gently; no yank.
- [ ] Mobile: no snap, page scrolls naturally.
- [ ] iOS Safari and Chrome Android: tap into email input, keyboard pops up, no jitter or re-snap mid-input.
- [ ] Address-bar collapse on mobile scroll: no jitter.
- [ ] Browser back navigation returns to correct section.
- [ ] Browser zoom 200% and 300%: content is not trapped behind a snap point.
- [ ] OS "reduce motion" disables snap.

## Functional (waitlist-touching PRs)

- [ ] Hero waitlist form submits successfully (Apps Script endpoint receives a test email).
- [ ] Tail-section waitlist form submits successfully (same endpoint).
- [ ] Both forms hide after a successful submit (shared localStorage `nidhi-waitlist-signedup`).
- [ ] Live FX caption fetches from Frankfurter within ~1 second; fails silently on error.
- [ ] `/free/` index links resolve; tool pages render.

## Sitemap and robots (any PR touching `astro.config.mjs` or `robots.txt`)

- [ ] `dist/sitemap-0.xml` lists every indexable page (verify count: 35 pre-PR18, 36 post-PR18 since `/index2/` joins `/`... actually `/index2/` becomes `/`, so count stays 35).
- [ ] `dist/sitemap-0.xml` does not list any transactional or noindexed page.
- [ ] `dist/robots.txt` has the intended rules per PR17 decision.

---

# Appendix D: Privacy changelog discipline

A change requires a privacy changelog entry **only if** it touches:

- user-data collection (new form, new field, new event);
- storage (new localStorage key, new cookie, new database field);
- third-party calls (new vendor, new endpoint, new domain);
- analytics events (new tracked action, new PostHog property);
- user-facing flows that change what visitors are asked or told;
- retention or deletion policy.

A change does **not** require an entry when it is:

- cosmetic (typography, layout, color);
- structural markup (schema additions, sitemap config, header preloads);
- content (blog posts, prose edits, copy rewrites);
- editorial (publishing the founder's bio is not visitor-data handling);
- operational (deferring an existing script's load order, internal env wiring);
- crawler-policy (robots.txt rules govern public-content access, not visitor data).

The "(typos, phrasing)" parenthetical for `material: false` in `CLAUDE.md` refers to fixes to the **privacy policy text itself**, not to any small site change.

## What this means PR-by-PR

| PR | Privacy entry? | Why |
|---|---|---|
| PR0 | No | `/free/` collects nothing; `/index2/` reuses already-disclosed Frankfurter call, waitlist endpoint, localStorage key, PostHog instance |
| PR1 | No | markup, schema, metadata only |
| PR2 | No | linking and routing only |
| PR3 | No | image asset, sitemap config, OG props |
| PR4 | No | URL state local to browser |
| PR5 | No | content edits |
| PR6-PR13 | No | content rewrites |
| PR14 | No | publishing founder's bio is editorial, not visitor-data handling |
| PR15 | No | same vendor, key, events; load-order is implementation detail |
| PR16 | No | build-time image generation |
| PR17 | No | robots.txt governs crawler access, not visitor data |
| PR18 | No | markup move; same Frankfurter, waitlist, localStorage, PostHog |

**Total privacy entries across the entire 18-PR sequence: zero.**

The privacy policy will of course continue to receive entries for changes that do touch user data: when the auth product launches with DigitalOcean EU as a processor, when newsletter mechanics change, when a new vendor is added, etc. Those are out of scope for this plan.

---

# Appendix E: Already strong, do not break

Pre-existing site posture that earlier audits validated. Each PR should preserve these.

- **Per-page JSON-LD**: `Organization`, `WebSite`, `WebApplication`, `BlogPosting`, `BreadcrumbList`, `ItemList`, `FAQPage`, `AboutPage`, `CollectionPage`. Coverage cleaner than most YMYL sites.
- **`trailingSlash: 'always'`** matched to GitHub Pages behavior. Avoids canonical / duplicate-content issues.
- **`robots="noindex,nofollow"`** on 5 transactional pages plus `/index2/` plus `/404/`.
- **Sitemap excludes** transactional pages and parked redesign (`astro.config.mjs:8-15`).
- **301 redirect** from retired `/free/currency-risk/` to `/free/multi-currency-net-worth/`.
- **Canonical, hreflang en/x-default, prev/next link tags.**
- **RSS, llms.txt, BingSiteAuth.xml** present and correct.
- **Skip-link, focus-visible styles, `prefers-reduced-motion`.** Soft quality signal.
- **Privacy changelog discipline** as described in Appendix D.

---

# Appendix F: Out of scope

- **Backlink acquisition.** On-site only. Off-site is a separate effort, follows once on-site work is done.
- **Paid search and social.** Both can amplify but won't compensate for structural items.
- **Internationalisation.** Site is English-only. Czech, German, Hindi versions are separate decisions with their own SEO implications.
- **Renaming personas or refactoring the persona system.** Five personas in `src/content.config.ts` remain editorial framing for blog content.
- **Beta access mechanic** (invitation logic, batching, account creation flow). Home page collects emails; how those turn into beta accounts is a separate concern.
- **B2B positioning.** Future direction; not in scope for this landing page. When B2B becomes real, it earns its own page (e.g. `/teams/`, `/business/`), not a section on the home.
- **Auth product privacy policy expansion.** Tied to auth product launch, not this plan. When the auth product ships, both the policy and the trust strip's beta/post-launch copy update in the same PR with a `material: true` changelog entry.

---

# Appendix G: Rollback strategy

## Per-PR rollback

Each PR is small enough to revert as a single commit if it ships and underperforms. Specific rollback paths:

- **PR1, PR2, PR3, PR4**: revert the commit; markup/schema reverts cleanly.
- **PR5**: frontmatter and inline link revert. Pure text undo.
- **PR6-PR13**: each post is its own PR; revert just that post's commit.
- **PR14**: removes the new `/about/` and `/editorial-policy/` pages; reverts byline; reverts `sameAs`. Privacy policy was not edited (Appendix D), so no policy revert needed.
- **PR15**: revert moves PostHog snippet back to inline-in-`<head>`. No data lost; PostHog ingestion continues.
- **PR16**: revert the generator and the per-post OG props; pages fall back to the generic OG image. PR1's provisional fix to `BlogPosting.image` still holds.
- **PR17**: revert `robots.txt` to prior bot list.
- **PR18**: revert restores the placeholder `index.astro` and re-parks `/index2/`. The previous home is preserved in git history; `git log src/pages/index.astro` shows the swap commit.

## Measurement

**Ship without formal measurement.** Pre-launch traffic is too low for any A/B test to produce reliable signal. Anecdotal observation via PostHog dashboards is the rollback trigger. When PostHog is fully wired (PR15) and traffic is materially higher, revisit measurement for future home-page changes; at that point feature-flag A/B testing becomes worth the setup cost.

---

# Appendix H: Reused from existing code (PR0 baseline)

- `WaitlistSection.astro`: extended with `variant="hero"` prop. Default variant unchanged, used in conversion tail.
- All design tokens from `global.css`. Chart palette tokens (`--chart-eur`, `--chart-usd`, `--chart-inr`) added per theme.
- `Header.astro`: imported via `BaseLayout`; fixed/transparent treatment toggled by `body[data-page="landing"]`.
- `Footer.astro`: kept as-is, renders after `<main>` per default Astro flow.
- `LogoMark.astro`: optional fallback on hero right column for small screens.

`PersonaBadge.astro` is **not** used on the new home page; stays in use on blog post templates.

---

# Appendix I: What changed since the May audits

This document supersedes the May 2026 revision of `seo-audit.md` and the early-June revision of `landing-page-redesign.md`. Material changes from those drafts:

1. **`/free/` index page shipped** in PR0 (was a planned action item in May).
2. **Parked landing-page redesign shipped** at `/index2/` in PR0 (was a planned redesign in May).
3. **Free-tools section removed from the parked redesign.** Earlier drafts of `/index2/` had a fifth snap section showcasing the two shipped free tools. Removed in June: header dropdown and footer column already cover discovery, the section interrupted the conversion narrative, and it created a small messaging conflict (hero promises an upcoming product; tools section under it said "the multi-currency one already works today").
4. **Repo-root `index.html` and `baba_money.png` deleted** in PR0. Pre-Astro leftovers; never deployed; SEO impact zero. Originally listed as audit finding 18; honest framing: it was repo hygiene, not SEO.
5. **Privacy changelog discipline corrected.** Earlier drafts over-applied the rule, generating entries for cosmetic, structural, and editorial changes. The rule applies only to changes that touch user-data handling. Entry count for the entire 18-PR plan: zero. See Appendix D.
6. **Section 4 visual simplified.** Earlier draft had a dual-claim footer ("Retire 3 years sooner" + "Net worth at 60: +EUR 220k") that mixed timeframes and asserted a retirement claim the chart never visualised. Replaced with one delta the chart actually shows: `After 20 years: about EUR 220k more by saving 5pp extra.`
7. **Self-check rewritten.** Earlier draft used a question heading ("How do you know if nidhi is for you?") with question-form bullets behind an "Ask yourself:" intro. Two layers of questions broke the rhythm. June revision flattened to a direct heading ("nidhi is for you if:") with statement-form bullets. The closing line tightened to "If any of these sound like you, drop your email below."
8. **Six new findings (22-27) catalogued** in the June revision: `BlogPosting.image` dim mismatch, `/privacy/` JSON-LD gap, hard-coded OG dims and Twitter alt, `Organization.sameAs` only on parked redesign, `LearningPath.tsx` chips as `<button>` not `<a>`, unencoded `[tag]` in tag-page BreadcrumbList.
9. **Finding 12 worsened.** `/free/loan-comparison/` keyword count grew from "18+" in May to **44** in June. Highest-priority quick win.
10. **PR-organised structure adopted.** Both predecessor docs were finding-organised (`seo-audit.md`) or section-organised (`landing-page-redesign.md`). This document organises everything around the 18 PRs that ship the work, with reference content collapsed into appendices.
