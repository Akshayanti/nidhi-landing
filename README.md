# nidhi

The website for [nidhi.today](https://nidhi.today/?utm_source=github).

## What's here

- **Lessons**: personal finance lessons in four levels (discovery, building, psychology, optimizing), plus the Inclusive Finances series. Written in English (`src/content/blog/`).
- **How-to guides**: short step-by-step guides for one money task each (`src/content/guides/`).
- **Free tools**: calculators that run in the browser (`src/pages/free/`).
- **Five languages**: the site's own pages and tools are published in English, Hindi, Spanish, Czech and Marathi (`src/i18n/`); lessons and guides stay in English.
- **The newsletter and the reel pipeline**: `scripts/` and `remotion/`. [scripts/README.md](scripts/README.md) lists the tools that are run by hand.
- **The Apps Script projects** behind the sign-up forms and the newsletter: deployed by hand. [docs/operations.md](docs/operations.md) says how, and how to check that production runs what `main` holds.

## Local development

```bash
npm install
npm run dev          # start the dev server
npm run build        # production build
npm test             # run the test suite
npm run lint         # lint the project
npm run typecheck    # type-check every .ts and .tsx file
```

The newsletter script is Python and has its own tests, which `npm test` does not run:

```bash
pip install --require-hashes -r scripts/requirements.txt
python -m unittest scripts/test_send_newsletter.py scripts/test_newsletter_sender.py scripts/test_qr_svg.py
```

Requires **Node.js 24 or later**; CI and deploys run the exact version in `.nvmrc` (`nvm use` picks it up).

### Version pins

`package-lock.json` decides what is installed: CI and deploys run `npm ci`, which installs exactly what the lockfile names and fails if `package.json` disagrees with it. So most ranges in `package.json` are carets, and a new version arrives only in a pull request that changes the lockfile. Three things are exact on top of that, because for them even the range is the control: `tsx` (it runs the tests) and `typescript` (a compiler minor can add errors), in the root and in `remotion/`, and the one approved install script below. `src/utils/dependencies.test.ts` holds a snapshot of all of it, so a dependency change, Dependabot's included, fails `npm test` until the snapshot is edited in the same pull request. GitHub Actions are pinned to commit SHAs and the Python packages to exact versions in `scripts/requirements.txt`.

### Install scripts

Some dependencies run code of their own when they are installed. npm only runs it for packages listed in `allowScripts` in `package.json` (npm 12 blocks the rest; npm 11 runs them with a warning). Each project lists every such dependency it has:

| Project | Package | Entry | Why |
|---|---|---|---|
| root | `puppeteer` | approved, pinned to one version | Its script downloads the Chrome that the build's figure renders use. Without it, `npm run build` fails on a fresh machine. |
| root, `remotion/` | `fsevents` | denied | macOS only. Its script would recompile a file watcher that already ships compiled; file watching was checked working with the script blocked. |
| root, `remotion/` | `esbuild` | denied | Comes with `tsx`, which runs the tests and the reel renders. Its script only checks and speeds up a binary that installs anyway; with it blocked, the tests pass, `tsc` passes and a reel renders byte for byte the same. |

CI is strict: every workflow sets `NPM_CONFIG_STRICT_ALLOW_SCRIPTS=true`, so `npm ci` fails when a dependency has an install script that `allowScripts` does not cover. It is not set in `.npmrc`, because there it would stop Dependabot from opening those updates at all.

When Dependabot bumps puppeteer, CI fails on the pinned approval. Read what the new version's install script does, then update the pin (`"puppeteer@<new version>": true`) in the same commit that updates the dependency snapshot in `src/utils/dependencies.test.ts`. A new dependency with an install script fails CI the same way: review it, then approve it pinned or deny it.

To run the same check locally: `NPM_CONFIG_STRICT_ALLOW_SCRIPTS=true npm ci`.

## License

This source is public so people can read it. It is not open source, and all rights are reserved: see [LICENSE](LICENSE). Third-party material keeps its own terms: see [the notices](public/third-party-notices.txt).
