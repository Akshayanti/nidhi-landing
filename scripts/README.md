# scripts/

<!-- Written by `node scripts/scripts-index.mjs`; do not edit by hand. -->

Every entry point stays at its path here. Each row is read from the script:
its purpose is the first sentence of its header comment (the header has the
full usage), who runs it comes from `package.json` and the workflows' `run:`
lines, and its tests are the test files beside it or importing it.

## Entry points

| Script | What it does | Run by | Tests |
|---|---|---|---|
| `audit-mobile.mjs` | Phone-width audit of every site page. | `npm run audit:mobile`, workflow "PR Checks" | none |
| `audit-text-size.mjs` | Large-text audit of the free tools, run against a dev or preview server. | `npm run audit:text-size`, workflow "Free tools gates" | `repo-hygiene.test.mjs` |
| `check-dist.mjs` | Checks the built site in dist/ (#361): canonical and hreflang links, the sitemap, internal links, leftover template text and the feeds. | `npm run check:dist`, workflow "PR Checks" | none |
| `check-gs-versions.mjs` | Compares each deployed Apps Script with main (#443): asks its health action for the VERSION it runs and checks it against the hash of the file here. | workflow "Apps Script versions" | `gs-version.test.mjs` |
| `deploy-trigger.gs` | Nidhi daily deploy trigger: Google Apps Script (no Web App). | pasted into Google Apps Script | `deploy-trigger.test.mjs` |
| `fetch-inflation.mjs` | Refreshes the inflation calculator's history: World Bank indicator FP.CPI.TOTL.ZG (consumer price inflation, annual %) for every country. | workflow "Inflation data refresh" | `fetch-inflation.test.mjs` |
| `gs-version.mjs` | Writes each Apps Script file's VERSION (scripts/lib/publishing/gs-version.mjs). | `npm run gs:check`, `npm run gs:version` | `gs-version.test.mjs` |
| `indexnow.mjs` | IndexNow helper for the deploy pipeline. | workflow "Deploy to GitHub Pages" | `indexnow.test.mjs` |
| `lint-figures.mjs` | Lint blog figures (the prebuild gate). | `npm run lint:figures`, `npm run build` (prebuild), workflow "Deploy to GitHub Pages", workflow "Free tools gates", workflow "PR Checks", workflow "Tool privacy check" | `lint-figures.test.mjs` |
| `lint-scoped-styles.mjs` | Fail on a scoped style rule that can never match. | `npm run lint:scoped-styles`, `npm run build` (prebuild), workflow "Deploy to GitHub Pages", workflow "Free tools gates", workflow "PR Checks", workflow "Tool privacy check" | none |
| `lint.mjs` | Lightweight lint pass. | `npm run lint`, workflow "PR Checks" | none |
| `mutation-floors.mjs` | Checks one scope's mutation reports against its floors (#790). | workflow "Free tools gates" | none |
| `newsletter.gs` | Nidhi blog newsletter: Google Apps Script Web App. | pasted into Google Apps Script | `newsletter.test.mjs`, `server-events.test.mjs`, `src/utils/subscriberId.test.ts` |
| `npm-audit.mjs` | The audit check: fails on a high or critical advisory in any install the repository runs, except an advisory that has a dated exception in scripts/lib/checks/audit-exceptions.mjs. | workflow "PR Checks" | `repo-hygiene.test.mjs` |
| `preview_transactional_emails.py` | Render HTML previews of the two transactional emails built by scripts/newsletter.gs, the confirmation email (`sendConfirmationEmail_`) and the welcome email (`sendWelcomeEmail_`). | by hand | none |
| `qr_svg.py` | Make a QR code for one URL, as a deterministic SVG file. | by hand | `test_qr_svg.py`, `src/utils/qr/encode.test.ts` |
| `regenerate-captions.mjs` | Regenerate platform captions (.ig.txt / .tiktok.txt / .json) from saved reel plans without re-running TTS / Remotion. | by hand | none |
| `render-email-figures.mjs` | Rasterise blog figures into email-ready PNGs. | `npm run build` (postbuild), `npm run render-email-figures`, workflow "Deploy to GitHub Pages", workflow "Free tools gates", workflow "PR Checks", workflow "Tool privacy check" | none |
| `render-figures.mjs` | Rasterise blog figures into Instagram-ready PNGs. | `npm run render-figures` | none |
| `render-guide-cards.mjs` | Renders each How-to guide's share image (the og:image a link preview shows) to public/brand/social/how-to/<slug>.png, 1200×630. | by hand | none |
| `render-ig.js` | Unified Instagram renderer. | `npm run render-ig` | none |
| `render-kit.mjs` | Instagram content kit renderer: one source file per blog post, two days, one angle per day. | by hand | none |
| `render-logo-with-url.mjs` | Composes merchandise-oriented logo variants that include the website URL beneath the existing wordmark and tagline. | by hand | none |
| `render-reels.mjs` | Reel render orchestrator (v2). | `npm run reels:plan-only`, `npm run render-reels`, `npm run render-reels:building`, `npm run render-reels:discovery` | none |
| `render-slides.js` | Renders Instagram carousel slides (1080x1080) from docs/instagram/ posts with scripts/templates/slide-template.html. | by hand | none |
| `render-stories.js` | Renders Instagram story frames (1080x1920) from docs/instagram/ posts with scripts/templates/story-template.html. | by hand | none |
| `render-thumbnails.mjs` | Backfill / batch render reel cover thumbnails from saved plan JSONs. | `npm run render-thumbnails` | none |
| `review/glossary-export.ts` | Builds the data for one language's glossary review sheets: every batch. | by hand | none |
| `review/review-sheet.gs` | nidhi volunteer review sheets: the "nidhi review" menu. | pasted into Google Apps Script | `review/review-sheet.test.mjs` |
| `review/review-text.gs` | The words a volunteer sees in a review sheet, per language. | pasted into Google Apps Script | `review/review-sheet.test.mjs`, `review/review-text.test.mjs` |
| `run-tests.mjs` | `npm test` (#791): every test file in the repository, found rather than listed. | `npm test`, workflow "PR Checks" | `repo-hygiene.test.mjs` |
| `scripts-index.mjs` | Writes scripts/README.md, the index of every script in scripts/, from the scripts themselves. | by hand | `scripts-index.test.mjs` |
| `send_newsletter.py` | Send blog-post newsletters to the Apps Script newsletter endpoint. | workflow "Newsletter pipeline" | `test_newsletter_sender.py`, `test_send_newsletter.py` |
| `simulate-projection-paths.mjs` | Reproducible Monte Carlo behind the "One line versus ten thousand paths" figure in src/content/blog/4. optimizing/43-financial-projections.md. | by hand | none |
| `slides-to-reel.sh` | Turn a kit's rendered carousel slides into 9:16 story frames (one per slide) and a silent slideshow reel with slide-left transitions. | by hand | none |
| `smoke-pages.mjs` | Every free tool, in every language it is published in, opened in a real browser from the built site (#363, #364). | `npm run smoke:pages`, workflow "PR Checks" | none |
| `smoke-render.mjs` | End-to-end smoke test for the reel pipeline minus the LLM call. | by hand | none |
| `verify-tool-privacy.mjs` | The browser check of CLAUDE.md, "Free tools keep inputs out of URLs", rule 6, as a script: nothing a reader types into a free tool may reach PostHog. | `npm run verify:tool-privacy`, workflow "Tool privacy check" | `lib/checks/tool-privacy-checks.test.mjs` |
| `volunteer-form.gs` | Nidhi volunteer translators: Google Form builder (Google Apps Script). | pasted into Google Apps Script | `apps-script-lists.test.mjs`, `review/review-text.test.mjs`, `volunteer-form.test.mjs` |
| `volunteer-list.gs` | Nidhi volunteer beta-interest list: Google Apps Script Web App. | pasted into Google Apps Script | `apps-script-lists.test.mjs` |
| `waitlist.gs` | Nidhi product-launch waitlist: Google Apps Script Web App. | pasted into Google Apps Script | `apps-script-lists.test.mjs`, `server-events.test.mjs` |

## Modules in `lib/`

The modules the entry points import, each with its tests beside it, kept in
one folder per purpose:

- `lib/checks/`: What gates a pull request or verifies the build: the post-build checks, the privacy check's rules, mutation floors, known failures, audit exceptions, the figure lint and the local server the browser checks use. Modules: `audit-exceptions.mjs`, `check-dist.mjs`, `known-failures.mjs`, `lint-figures.mjs`, `mutation-floors.mjs`, `mutation-shards.mjs`, `serve-dist.mjs`, `tool-privacy-checks.mjs`.
- `lib/publishing/`: The site build and its data: the short-link pages and inline-script minifier astro.config.mjs runs, the inflation history and the Apps Script version stamp. Modules: `gs-version.mjs`, `inflation-data.mjs`, `minify-inline-scripts.mjs`, `short-link-stub.mjs`.
- `lib/media/`: The reel, caption and Instagram pipeline: lesson and post parsers, the script writer, the scrubber and its maths check, speech, music, figures and captions. Modules: `generate-tts.mjs`, `llm-script-writer.mjs`, `math-consistency.mjs`, `parse-blog-meta.mjs`, `parse-markdown.js`, `parse-vtt.mjs`, `pick-music.mjs`, `prepare-figures.mjs`, `render-platform-caption.mjs`, `scrub-output.mjs`.

Beside them: `templates/` holds the HTML the Instagram renderers read,
`fixtures/` the files tests compare byte for byte, and `review/` the volunteer
review sheets' Apps Script and the glossary export.

## Pasted into Google Apps Script

The `.gs` files do not run from this repository. Each is the source of a
script that lives in a Google account, and its header says how to deploy
it. After editing one, `npm run gs:version` stamps its VERSION.

## The reel script writer's model

`npm run render-reels` asks an Anthropic model to write each reel's script
(`lib/media/llm-script-writer.mjs`, with `ANTHROPIC_API_KEY` set). The model
id is written in one place, `DEFAULT_REEL_MODEL` in that file, and
`NIDHI_REEL_MODEL` overrides it for a run. Model ids are retired on
published dates, so that constant is the line to update when one is.

## Python

`send_newsletter.py` needs the packages in `requirements.txt`, at those exact
versions: `pip install --require-hashes -r scripts/requirements.txt`. The
other Python scripts use the standard library only.
