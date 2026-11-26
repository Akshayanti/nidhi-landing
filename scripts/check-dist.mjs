#!/usr/bin/env node
/**
 * Checks the built site in dist/ (#361): canonical and hreflang links, the
 * sitemap, internal links, leftover template text and the feeds. The checks
 * live in scripts/lib/checks/check-dist.mjs, which says what each one asks.
 *
 *   npm run build && node scripts/check-dist.mjs [distDir]
 *
 * Exits 1 on any problem. Every finding here is about a page as a whole, so
 * none can be excused by a known-failure entry (scripts/lib/checks/known-failures.mjs):
 * it is fixed, or the check fails. Run in the Build job of
 * .github/workflows/pr-checks.yml, after the build.
 */
import { join } from 'node:path';
import { CHECKS, loadDist } from './lib/checks/check-dist.mjs';

const dir = process.argv[2] ?? join(import.meta.dirname, '..', 'dist');
const site = loadDist(dir);
if (!site.pages.has('/')) {
  console.error(`${dir} has no index.html: build the site first (npm run build).`);
  process.exit(1);
}
let failed = 0;
for (const [name, check] of Object.entries(CHECKS)) {
  const problems = check(site);
  if (problems.length) {
    failed += problems.length;
    console.error(`\n✗ ${name}: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
    if (problems.length > 50) console.error(`  … and ${problems.length - 50} more`);
  } else {
    console.log(`✓ ${name}`);
  }
}
console.log(`\n${site.pages.size} pages and ${site.xml.size} XML files in ${dir}. ${failed} problem(s).`);
process.exit(failed ? 1 : 0);
