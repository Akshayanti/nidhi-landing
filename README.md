# Nidhi

The website for [nidhi.today](https://nidhi.today/?utm_source=github).

## What's here

- **Blog** — personal finance articles organized by level: discovery, building, psychology, optimizing, and mastery.
- **Tools** — free financial calculators and tools.

## Local development

```bash
npm install
npm run dev          # start the dev server
npm run build        # production build
npm test             # run the test suite
npm run lint         # lint the project
```

Requires **Node.js 24 or later**; CI and deploys run the exact version in `.nvmrc` (`nvm use` picks it up).

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
