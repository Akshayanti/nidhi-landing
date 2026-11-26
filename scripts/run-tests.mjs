#!/usr/bin/env node
// `npm test` (#791): every test file in the repository, found rather than
// listed. A hand-written list let a new test file sit outside the run without
// anyone noticing. Fails if it finds none, so a broken pattern cannot pass.
//
//   node scripts/run-tests.mjs           every test file
//   node scripts/run-tests.mjs --list    print them and stop
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** What counts as a test file: under src/ and scripts/, never inside node_modules. */
export const TEST_PATTERNS = ['src/**/*.test.{ts,tsx,mjs,js}', 'scripts/**/*.test.{ts,mjs,js}'];

export function testFiles(root = ROOT) {
  return globSync(TEST_PATTERNS, { cwd: root, exclude: (f) => f.includes('node_modules') }).sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = testFiles();
  if (files.length === 0) {
    console.error('run-tests: no test files found; the patterns are broken.');
    process.exit(1);
  }
  if (process.argv.includes('--list')) {
    console.log(files.join('\n'));
    process.exit(0);
  }
  console.log(`run-tests: ${files.length} test files`);
  const r = spawnSync('npx', ['tsx', '--test', '--test-reporter=spec', ...files], { cwd: ROOT, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
