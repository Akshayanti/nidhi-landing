#!/usr/bin/env node
/**
 * IndexNow helper for the deploy pipeline.
 *
 * Two responsibilities, deliberately separated so they can be invoked
 * independently and so the pure logic can be unit-tested:
 *
 *   1. `hash <distDir>`
 *      Reads `<distDir>/sitemap-index.xml`, follows every sub-sitemap,
 *      hashes the rendered HTML for each URL, and writes a deterministic
 *      JSON manifest to stdout: `{ "<url>": "<sha256>", ... }`.
 *      The build workflow runs this and uploads the result as an
 *      artifact ("indexnow-hashes").
 *
 *   2. `submit <previous.json> <current.json> <key>`
 *      Loads the previous run's manifest and the current run's manifest,
 *      computes the set of URLs whose hash is new or has changed, and
 *      POSTs that list to https://api.indexnow.org/IndexNow.
 *      The post-deploy workflow job runs this. The diff approach is
 *      what IndexNow's protocol guidance asks for ("submit only changed
 *      URLs"), and it makes scheduled rebuild crons safe to include in
 *      the trigger list, since rebuilds that don't change content
 *      produce a zero-URL diff and skip the API call.
 *
 * Why Node (not Python or shell): consistent with the existing
 *   scripts/lint.mjs and scripts/render-figures.mjs, and means the
 *   testable bits live in the same Node 22 test runner the rest of the
 *   project uses (see scripts/indexnow.test.mjs).
 *
 * Why ESM (.mjs) and not the .ts test convention: this is a build-tool
 *   script, not part of the shipped site code. Plain ESM avoids the
 *   type-stripping path and is what other scripts/ files use.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Map a fully-qualified URL to its expected static-output path inside the
 * distribution directory. Mirrors Astro's default trailing-slash behaviour
 * with `trailingSlash: 'never'`:
 *
 *   https://nidhi.today              -> index.html
 *   https://nidhi.today/             -> index.html
 *   https://nidhi.today/free/loan-comparison
 *                                    -> free/loan-comparison/index.html
 *   https://nidhi.today/rss.xml      -> rss.xml
 *
 * The function does NOT touch the filesystem; it's pure path arithmetic
 * so the unit tests don't need fixtures.
 */
export function urlToDistPath(url) {
  const u = new URL(url);
  // Treat empty path or "/" as the site root.
  const path = u.pathname === '' || u.pathname === '/'
    ? '/'
    : u.pathname.replace(/\/$/, '');
  if (path === '/') return 'index.html';
  // If the last segment has a file extension (e.g. `.xml`, `.txt`), use
  // the path verbatim; the static build emits a single file at that
  // location. Otherwise we assume Astro routed it to a directory whose
  // index.html holds the rendered page.
  const trimmed = path.replace(/^\//, '');
  if (/\.[a-z0-9]+$/i.test(trimmed)) return trimmed;
  return `${trimmed}/index.html`;
}

/**
 * Cheap XML scrape for `<loc>...</loc>` payloads. The sitemap files we
 * read are produced by @astrojs/sitemap with predictable formatting, so
 * a regex is correct and ~50x faster than spinning up a real XML parser.
 * Only used for sitemap-index.xml and per-section sitemap-N.xml here;
 * not a general-purpose XML extractor.
 */
function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/**
 * Walk dist/sitemap-index.xml and every sub-sitemap it references, and
 * return the deduplicated, insertion-ordered list of URLs the site
 * actually publishes. Reading from `dist/` (rather than from the live
 * CDN) keeps the build job hermetic and avoids a CDN-propagation race.
 */
export function readSitemapUrls(distDir) {
  const indexPath = join(distDir, 'sitemap-index.xml');
  const indexXml = readFileSync(indexPath, 'utf-8');
  const subSitemaps = extractLocs(indexXml);
  const seen = new Set();
  const ordered = [];
  for (const sm of subSitemaps) {
    // Sub-sitemap entries are absolute URLs; we only care about the
    // pathname so we can read the local file. This means the function
    // works regardless of which `site:` value Astro is configured with.
    const u = new URL(sm);
    const localSitemap = join(distDir, u.pathname.replace(/^\//, ''));
    const xml = readFileSync(localSitemap, 'utf-8');
    for (const url of extractLocs(xml)) {
      if (!seen.has(url)) {
        seen.add(url);
        ordered.push(url);
      }
    }
  }
  return ordered;
}

/**
 * For each URL in the sitemap, compute SHA-256 of the rendered HTML
 * served at that URL. Returns a JSON-serialisable object sorted by
 * URL so the manifest produced by two identical builds is byte-for-byte
 * identical (important when GitHub Actions diffs cache contents).
 *
 * URLs whose corresponding file is missing are skipped silently rather
 * than raising; in practice this should only happen if the sitemap
 * lists a URL that didn't actually emit a static asset, which would be
 * a build bug we don't want to mask as an IndexNow failure.
 */
export function hashSitemapPages(distDir) {
  const urls = readSitemapUrls(distDir);
  const out = {};
  for (const url of urls) {
    const localPath = join(distDir, urlToDistPath(url));
    if (!existsSync(localPath)) continue;
    const buf = readFileSync(localPath);
    out[url] = createHash('sha256').update(buf).digest('hex');
  }
  // Sort for deterministic output across runs and across machines.
  // Without this, the cache restore-key heuristic still works, but
  // diffing two manifests by eye in a PR would be needlessly noisy.
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * URLs in `current` whose hash is new (not in `previous`) or differs
 * from the previous value. Returns insertion order from `current`.
 *
 * Removed URLs are intentionally NOT returned. IndexNow has no
 * "forget this URL" operation; search engines learn of removals from
 * 404s on recrawl, which is correct for that case.
 *
 * Pure function, side-effect free, fully tested.
 */
export function computeDiff(previous, current) {
  const changed = [];
  for (const [url, hash] of Object.entries(current)) {
    if (previous[url] !== hash) {
      changed.push(url);
    }
  }
  return changed;
}

/**
 * Build the IndexNow request body from a list of changed URLs and the
 * key+host metadata. Pure function so the test suite can assert the
 * exact wire format we send; no surprises if a future search engine
 * starts validating on a field we accidentally renamed.
 */
export function buildIndexNowPayload({ urls, key, host }) {
  return {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };
}

// ---------------------------------------------------------------------------
// CLI entry. Side-effecting; kept thin and uses only the helpers above.
// ---------------------------------------------------------------------------

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

async function cmdHash(distDir) {
  if (!distDir) {
    console.error('Usage: indexnow.mjs hash <distDir>');
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(hashSitemapPages(distDir), null, 2));
  process.stdout.write('\n');
}

async function cmdSubmit(prevPath, currPath, key) {
  if (!prevPath || !currPath || !key) {
    console.error('Usage: indexnow.mjs submit <previous.json> <current.json> <key>');
    process.exit(2);
  }
  // Treat a missing previous manifest as "fresh slate"; every URL is
  // considered new and gets submitted. This is the first-run case, and
  // also any case where the cache was evicted by GitHub's 7-day expiry.
  const previous = existsSync(prevPath)
    ? JSON.parse(readFileSync(prevPath, 'utf-8'))
    : {};
  const current = JSON.parse(readFileSync(currPath, 'utf-8'));
  const changed = computeDiff(previous, current);
  if (changed.length === 0) {
    console.log('No URL content changes; skipping IndexNow submission.');
    return;
  }
  // Infer host from the first changed URL. All sitemap entries share a
  // host by construction (they come from the same `site:` config), so
  // any URL gives the right answer.
  const host = new URL(changed[0]).hostname;
  const payload = buildIndexNowPayload({ urls: changed, key, host });
  console.log(`Submitting ${changed.length} changed URL(s) to IndexNow:`);
  for (const u of changed) console.log(`  - ${u}`);
  // We use the global fetch (Node 18+) rather than pulling in undici
  // explicitly. Timeout via AbortController so a hung response can't
  // block the workflow; 30s is generous given IndexNow typically
  // responds in <1s.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const resp = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await resp.text();
    console.log(`IndexNow returned HTTP ${resp.status}: ${text.slice(0, 500)}`);
    if (!resp.ok) {
      // Surface as a workflow warning, but exit 0 so the deploy stays
      // green. A flaky third-party API mustn't fail an already-good
      // deploy.
      console.log(`::warning::IndexNow non-2xx; deploy unaffected.`);
    }
  } catch (e) {
    console.log(`::warning::IndexNow request failed: ${e.message ?? e}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'hash') return cmdHash(rest[0]);
  if (cmd === 'submit') return cmdSubmit(rest[0], rest[1], rest[2]);
  console.error('Usage:');
  console.error('  indexnow.mjs hash <distDir>');
  console.error('  indexnow.mjs submit <previous.json> <current.json> <key>');
  process.exit(2);
}

// Only run main when invoked directly. When imported by the test file,
// process.argv[1] points at node's test runner, not at this script.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    // Exit 0: any failure here is logged as a warning. We don't want a
    // crash in IndexNow tooling to fail the workflow.
    process.exit(0);
  });
}
