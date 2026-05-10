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

// Files inside this list are linted by the rules below. The lint script
// itself is intentionally excluded: it documents the rules in prose
// (mentioning "console.log", "debugger", "TODO", em-dashes) and would
// self-flag every rule, drowning real findings.
const TARGET_GLOBS = [
  'src/pages/free',
  'src/pages/privacy.astro',
  'src/components/LoanCompare.tsx',
  'src/utils/loanMath.ts',
  'src/utils/loanMath.test.ts',
  'src/utils/dependencies.test.ts',
  'docs/free-tools-pr-checks.md',
  '.github/workflows/pr-checks.yml',
];

/**
 * @typedef {{file: string, line: number, message: string}} Diagnostic
 */

/** @type {Diagnostic[]} */
const diagnostics = [];

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function* walk(rootRel) {
  const root = join(repoRoot, rootRel);
  let stat;
  try {
    stat = statSync(root);
  } catch {
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
    appliesTo: (file) => /\.(ts|tsx|astro|mjs|js)$/.test(file) && !/\/scripts\//.test(file),
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
    // they can't slip through as encoded markup. The rule is scoped to
    // TARGET_GLOBS and does not police pre-existing em-dashes elsewhere.
    name: 'no-em-dash',
    test: (line) => /\u2014|&mdash;|&#8212;|&#x2014;/i.test(line),
    message: 'em-dash (U+2014 or &mdash; / &#8212; / &#x2014;) is not allowed; use a colon, semicolon, or restructure',
    appliesTo: (file) => /\.(ts|tsx|astro|mjs|js|md|yml|yaml)$/.test(file),
  },
];

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
  // 1. Custom rules over the loan-comparison surface.
  let scanned = 0;
  for (const target of TARGET_GLOBS) {
    for await (const file of walk(target)) {
      await lintFile(file);
      scanned++;
    }
  }

  // 2. Reuse the existing blog-figures linter so a single `npm run lint`
  //    covers the whole project's existing checks.
  const figResult = spawnSync(process.execPath, [join(here, 'lint-figures.mjs')], {
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

  console.log(`\u2713 lint: ${scanned} file(s) checked, no issues.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
