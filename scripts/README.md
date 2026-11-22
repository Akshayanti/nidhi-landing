# scripts/

What runs by itself is named where it runs: the npm scripts in `package.json`
(build, lint, tests, audits, the reel and Instagram renders) and the workflows
in `.github/workflows/` (`send_newsletter.py`, `fetch-inflation.mjs`,
`indexnow.mjs`, `npm-audit.mjs`, `verify-tool-privacy.mjs`). `lib/` holds the
modules those scripts share, with their tests beside them.

This page lists the rest: tools a person runs by hand. Each one's header has
its full usage. A script that is finished for good is deleted, not kept here.

## Run by hand

| Script | What it does | Run |
|---|---|---|
| `regenerate-captions.mjs` | Rewrites the platform captions from saved reel plans, without rendering video again. Reads `output/plans/`, writes `output/captions/`. | `node scripts/regenerate-captions.mjs [--level <level>] [--slug <slug>]` |
| `render-kit.mjs` | Renders an Instagram kit from `docs/instagram-kit/`: carousel, story frames, captions and a posting sheet. | `node scripts/render-kit.mjs` (see `docs/plans/REELS-PIPELINE.md`) |
| `render-slides.js`, `render-stories.js` | The carousel and story renderers that `npm run render-ig` drives; each also runs alone. | `node scripts/render-slides.js [post]` |
| `slides-to-reel.sh` | Turns rendered carousel slides into story frames and a silent slideshow reel. Needs ffmpeg and ImageMagick. | `scripts/slides-to-reel.sh <carousel dir> <out dir>` |
| `smoke-render.mjs` | Runs the reel pipeline end to end from a fixed plan, with no call to the script-writing model. | `node scripts/smoke-render.mjs [--no-render]` |
| `render-guide-cards.mjs` | Renders each How-to guide's share image into `public/brand/social/how-to/`. Run after adding a guide or changing a title. | `node scripts/render-guide-cards.mjs` |
| `render-logo-with-url.mjs` | Composes logo variants with the site address under the wordmark, for print and merchandise. Writes to `output/brand/`, which git ignores; needs the Inter font installed. | `node scripts/render-logo-with-url.mjs` |
| `simulate-projection-paths.mjs` | Reproduces the Monte Carlo figure in lesson 43 from the Jordà-Schularick-Taylor data, which is downloaded by hand and not checked in. | see its header |
| `preview_transactional_emails.py` | Writes local previews of the confirmation and welcome emails to `emails/_preview/`. It copies their wording from `newsletter.gs` by hand, so check it against that file before trusting a preview; the reminder email has no preview. | `python3 scripts/preview_transactional_emails.py` |
| `qr_svg.py` | Makes a QR code for one address as an SVG, with the standard library only, so no QR service sees the link. | `python3 scripts/qr_svg.py <url> -o qr.svg` |
| `review/glossary-export.ts` | Builds the data for a language's glossary review sheets. | `npx --no-install tsx scripts/review/glossary-export.ts --langs <codes> --out <dir>` |

## Pasted into Google Apps Script

These do not run from this repository. Each is the source of a script that
lives in a Google account, and its header says how to deploy it:
`newsletter.gs` (the newsletter backend; its header is the setup guide),
`waitlist.gs`, `deploy-trigger.gs` (asks GitHub for the daily deploy),
`volunteer-form.gs`, `volunteer-list.gs`, `review/review-sheet.gs` and
`review/review-text.gs`.

## The reel script writer's model

`npm run render-reels` asks an Anthropic model to write each reel's script
(`lib/llm-script-writer.mjs`, with `ANTHROPIC_API_KEY` set). The model id is
written in one place, `DEFAULT_REEL_MODEL` in that file, and
`NIDHI_REEL_MODEL` overrides it for a run. Model ids are retired on published
dates, so that constant is the line to update when one is.

## Python

`send_newsletter.py` needs the packages in `requirements.txt`, at those exact
versions: `pip install --require-hashes -r scripts/requirements.txt`. The other Python scripts
use the standard library only.
