#!/usr/bin/env node
/**
 * Lightweight lint pass.
 *
 * Goals
 * -----
 * - Zero new dependencies (uses only Node built-ins). The repo has been
 *   careful to keep its dep surface small; ESLint + plugins would multiply
 *   transitive packages and lengthen build/CI time. A targeted custom
 *   linter is sufficient at the current size of this codebase.
 * - Covers all of src/ and the workflows (TARGETS below), less the
 *   commented EXCLUDES.
 * - Catch the highest-frequency, highest-impact issues:
 *     • forgotten `console.log` / `console.debug` / `debugger` statements
 *     • `TODO`/`FIXME` without a tracking reference
 *     • `as any` escape hatches in TS
 *     • tabs in CSS/TS/Astro files (the codebase is space-indented)
 *     • trailing whitespace
 *     • files outside src/utils/*.test.ts importing from test-only modules
 * - Run alongside the existing scripts/lint-figures.mjs blog-figures linter.
 *
 * Usage
 * -----
 *   npm run lint
 *   node scripts/lint.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// What is linted: every file under these paths. A path that does not exist
// is an error, not a silent skip: the list once named three files that had
// moved, and the loan engine went unlinted with nobody told (#319).
//
// scripts/ is linted too (#791): the gates themselves live there. Two rules
// stay off for it (SITE_ONLY below): the render and pipeline scripts log to
// the console by design, and the dash rule is about the site's own words,
// while scripts hold dash-matching patterns and model prompts (the scripts
// that write copy check it for dashes themselves, in scrub-output.mjs).
const TARGETS = [
  'src',
  '.github/workflows',
  'scripts',
];

// What is left out of those paths, each with its reason. A path ending in
// `/` is a whole directory. Every entry must match a file, or the lint
// fails: an exclude that outlives its file hides nothing and misleads the
// next reader.
const EXCLUDES = [
  // Lessons, guides and situations are prose with their own linter
  // (lint-figures.mjs, run below) and their own tests (tldrRules,
  // lessonLinks, layeredLessons). Markdown also ends a line with two spaces
  // on purpose, which the trailing-whitespace rule would flag.
  'src/content/',
  // Data files written by a script (the World Bank history, country names),
  // not by hand.
  'src/data/',
  // The linter names its own rules in prose (debugger, TODO) and would
  // flag itself.
  'scripts/lint.mjs',
  // Test fixtures compared byte for byte (a signed request body): a trailing
  // newline added to one would change what is signed.
  'scripts/fixtures/',
];

/** Whether a file is under scripts/, where the console and dash rules do not apply. */
function inScripts(file) {
  return relative(repoRoot, file).split('\\').join('/').startsWith('scripts/');
}

// Only text files a person writes are read; images and fonts are skipped.
const LINTED_EXTENSIONS = /\.(ts|tsx|astro|mjs|js|css|md|json|yml|yaml)$/;

/**
 * @typedef {{file: string, line: number, message: string}} Diagnostic
 */

/** @type {Diagnostic[]} */
const diagnostics = [];

/** Targets that name nothing on disk. @type {string[]} */
const missing = [];

/** Excludes that matched at least one file. @type {Set<string>} */
const usedExcludes = new Set();

function excludedBy(rel) {
  const posix = rel.split('\\').join('/');
  return EXCLUDES.find((entry) => (entry.endsWith('/') ? posix.startsWith(entry) : posix === entry));
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function* walk(rootRel) {
  const root = join(repoRoot, rootRel);
  let stat;
  try {
    stat = statSync(root);
  } catch {
    missing.push(rootRel);
    return;
  }
  if (stat.isFile()) {
    yield root;
    return;
  }
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(relative(repoRoot, full));
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------------------
// Per-line rules
// ---------------------------------------------------------------------------

const LINE_RULES = [
  {
    name: 'no-console',
    test: (line) =>
      /\bconsole\.(log|debug|info|warn|error|trace|dir)\b/.test(line) &&
      // Allow the lint script itself and the existing render scripts to log.
      !/scripts\//.test(line),
    message:
      "left-over console.* call (use a real error path or remove before committing)",
    appliesTo: (file) => /\.(ts|tsx|astro|mjs|js)$/.test(file) && !inScripts(file),
  },
  {
    name: 'no-debugger',
    test: (line) => /\bdebugger\b/.test(line),
    message: 'left-over `debugger` statement',
    appliesTo: (file) => /\.(ts|tsx|astro|mjs|js)$/.test(file),
  },
  {
    name: 'todo-needs-ref',
    test: (line) => /\b(TODO|FIXME|XXX)\b/.test(line) && !/\b(#|GH-|issue\s*\d|gh:)/i.test(line),
    message: 'TODO/FIXME without an issue reference (e.g. "TODO(#123): …")',
    appliesTo: (file) => /\.(ts|tsx|astro|mjs|js)$/.test(file),
  },
  {
    name: 'no-as-any',
    test: (line) => {
      // Skip pure comment lines so prose containing "as any" doesn't trip
      // a TypeScript-only rule.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return false;
      return /\bas\s+any\b/.test(line);
    },
    message: '`as any` escape hatch (narrow the type or use `unknown`)',
    appliesTo: (file) => /\.(ts|tsx)$/.test(file),
  },
  {
    name: 'no-tabs',
    test: (line) => /\t/.test(line),
    message: 'tab character (this codebase uses spaces)',
    appliesTo: (file) => /\.(ts|tsx|astro|css|mjs|js)$/.test(file),
  },
  {
    name: 'no-trailing-whitespace',
    test: (line) => /[ \t]+$/.test(line),
    message: 'trailing whitespace',
    appliesTo: (file) => /\.(ts|tsx|astro|css|mjs|js|md)$/.test(file),
  },
  {
    // Project policy: no em-dashes in source files. Use a colon, semicolon,
    // or restructure the sentence. We catch both the literal U+2014
    // character and the HTML entity forms (&mdash;, &#8212;, &#x2014;) so
    // they can't slip through as encoded markup. Comments count too: Astro
    // ships the comments of an inline script to the reader's browser (#320).
    // A test that needs the character as data writes it as an escape.
    name: 'no-em-dash',
    test: (line) => /\u2014|&mdash;|&#8212;|&#x2014;/i.test(line),
    message: 'em-dash (U+2014 or &mdash; / &#8212; / &#x2014;) is not allowed; use a colon, semicolon, or restructure',
    appliesTo: (file) => /\.(ts|tsx|astro|css|mjs|js|md|yml|yaml)$/.test(file) && !inScripts(file),
  },
];

// A line that breaks a rule on purpose says so, with its reason, in a comment
// on the same line or the line above: `lint-allow no-console: a build-time
// warning`. The rule is named, so one allowance never covers another rule,
// and the dash rule takes no allowance at all.
const ALLOWABLE = new Set(['no-console', 'no-as-any', 'todo-needs-ref']);

function allowed(ruleName, line, previousLine) {
  if (!ALLOWABLE.has(ruleName)) return false;
  const marker = new RegExp(`lint-allow ${ruleName}: \\S`);
  return marker.test(line) || marker.test(previousLine ?? '');
}

// ---------------------------------------------------------------------------
// Whole-file rules
// ---------------------------------------------------------------------------

const FILE_RULES = [
  {
    name: 'eol-newline',
    test: (content) => content.length > 0 && !content.endsWith('\n'),
    message: 'file is missing a trailing newline',
    appliesTo: (file) => /\.(ts|tsx|astro|css|mjs|js|md|json)$/.test(file),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function lintFile(absPath) {
  const rel = relative(repoRoot, absPath);
  const content = readFileSync(absPath, 'utf8');

  for (const rule of FILE_RULES) {
    if (rule.appliesTo(rel) && rule.test(content)) {
      diagnostics.push({ file: rel, line: 0, message: `[${rule.name}] ${rule.message}` });
    }
  }

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const rule of LINE_RULES) {
      if (!rule.appliesTo(rel)) continue;
      if (rule.test(line)) {
        if (allowed(rule.name, line, lines[idx - 1])) continue;
        diagnostics.push({
          file: rel,
          line: idx + 1,
          message: `[${rule.name}] ${rule.message}: ${line.trim().slice(0, 120)}`,
        });
      }
    }
  });
}

async function main() {
  // 1. Custom rules over everything in TARGETS that EXCLUDES does not name.
  let scanned = 0;
  for (const target of TARGETS) {
    for await (const file of walk(target)) {
      const rel = relative(repoRoot, file);
      const exclude = excludedBy(rel);
      if (exclude) {
        usedExcludes.add(exclude);
        continue;
      }
      if (!LINTED_EXTENSIONS.test(rel)) continue;
      await lintFile(file);
      scanned++;
    }
  }
  for (const target of missing) {
    diagnostics.push({ file: target, line: 0, message: '[lint-target] this lint target does not exist; update TARGETS in scripts/lint.mjs' });
  }
  for (const entry of EXCLUDES) {
    if (!usedExcludes.has(entry)) {
      diagnostics.push({ file: entry, line: 0, message: '[lint-exclude] this exclude matches no file; remove it from EXCLUDES in scripts/lint.mjs' });
    }
  }

  // 2. Reuse the existing blog-figures linter so a single `npm run lint`
  //    covers the whole project's existing checks.
  const figResult = spawnSync(process.execPath, [join(here, 'lint-figures.mjs')], {
    stdio: 'inherit',
    cwd: repoRoot,
  });

  // 3. Scoped style rules that can never match (see lint-scoped-styles.mjs).
  const scopedResult = spawnSync(process.execPath, [join(here, 'lint-scoped-styles.mjs')], {
    stdio: 'inherit',
    cwd: repoRoot,
  });

  if (diagnostics.length > 0) {
    console.error('\nLint failures:');
    for (const d of diagnostics) {
      const loc = d.line > 0 ? `${d.file}:${d.line}` : d.file;
      console.error(`  ${loc}  ${d.message}`);
    }
    console.error(`\n${diagnostics.length} issue(s) in ${scanned} file(s).`);
    process.exit(1);
  }

  if (figResult.status !== 0) {
    process.exit(figResult.status ?? 1);
  }
  if (scopedResult.status !== 0) {
    process.exit(scopedResult.status ?? 1);
  }

  console.log(`\u2713 lint: ${scanned} file(s) checked, no issues.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
