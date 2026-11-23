#!/usr/bin/env node
// Writes scripts/README.md, the index of every script in scripts/, from the scripts themselves.
//
//   node scripts/scripts-index.mjs           write the README
//   node scripts/scripts-index.mjs --check   fail if the README is out of date
//
// Each entry point's purpose is the first sentence of its header comment;
// who runs it is read from package.json and the workflows' run: lines; its
// tests are the test files beside it or importing it. The output is sorted
// and carries no dates, so the same tree always writes the same file, and
// scripts/scripts-index.test.mjs fails when the README falls behind.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { testFiles } from './run-tests.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** What each folder under scripts/lib/ holds. A folder not on disk is left out of the README. */
export const LIB_FOLDERS = {
  checks: 'What gates a pull request or verifies the build: the post-build checks, the privacy check\'s rules, mutation floors, known failures, audit exceptions, the figure lint and the local server the browser checks use.',
  publishing: 'The site build and its data: the short-link pages and inline-script minifier astro.config.mjs runs, the inflation history and the Apps Script version stamp.',
  media: 'The reel, caption and Instagram pipeline: lesson and post parsers, the script writer, the scrubber and its maths check, speech, music, figures and captions.',
  shared: 'Only what modules in more than one of the folders above import.',
};

const ENTRY_EXT = new Set(['.mjs', '.js', '.sh', '.py', '.gs', '.ts']);
const isTest = (name) => /\.test\.\w+$/.test(name) || /^test_.*\.py$/.test(name);

const posix = (p) => p.split('\\').join('/');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The entry points: every script at the top of scripts/ and in scripts/review/, tests aside. */
export function entryPoints(root = ROOT) {
  const list = [];
  for (const dir of ['scripts', 'scripts/review']) {
    for (const ent of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (!ent.isFile() || isTest(ent.name) || !ENTRY_EXT.has(extname(ent.name))) continue;
      if (dir === 'scripts' && extname(ent.name) === '.ts') continue;
      list.push(`${dir}/${ent.name}`);
    }
  }
  return list.sort();
}

/** The header comment's lines, without comment marks: the comment at the top of the file, after a shebang. */
function headerLines(text) {
  const lines = text.split('\n');
  let i = 0;
  if (lines[0]?.startsWith('#!')) i = 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  const first = (lines[i] ?? '').trim();
  const out = [];
  if (first.startsWith('//')) {
    for (; i < lines.length && lines[i].trim().startsWith('//'); i++) out.push(lines[i].trim().replace(/^\/\/ ?/, ''));
  } else if (first.startsWith('/*')) {
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      out.push(line.replace(/^\/\*\*?/, '').replace(/\*\/$/, '').replace(/^\* ?/, '').replace(/^\*$/, ''));
      if (line.endsWith('*/')) break;
    }
  } else if (first.startsWith('"""')) {
    out.push(first.slice(3).replace(/"""$/, ''));
    if (!(first.length > 3 && first.endsWith('"""'))) {
      for (i++; i < lines.length && !lines[i].includes('"""'); i++) out.push(lines[i].trim());
      if (i < lines.length) out.push(lines[i].split('"""')[0].trim());
    }
  } else if (first.startsWith('#')) {
    for (; i < lines.length && lines[i].trim().startsWith('#'); i++) out.push(lines[i].trim().replace(/^# ?/, ''));
  }
  return out;
}

/** One line on what a script is for: the first sentence of its header comment, or '' when it has none. */
export function purposeOf(text) {
  const lines = headerLines(text).map((l) => l.trim());
  while (lines.length && lines[0] === '') lines.shift();
  const para = [];
  for (const line of lines) {
    if (line === '') break;
    if (/^[=\-~]{3,}$/.test(line)) continue;
    para.push(line);
  }
  const joined = para.join(' ').replace(/\s+/g, ' ').trim();
  // A sentence ends at a full stop before a capital or the end, so "4. optimizing" in a path does not end it.
  let sentence = (/^(.*?[.!?])(?:\s+(?=[A-Z`])|$)/.exec(joined)?.[1] ?? joined).replace(/:$/, '');
  if (sentence && !/[.!?]$/.test(sentence)) sentence += '.';
  return sentence
    .replace(/\s*\u2014\s*/g, ': ')
    .replace(/ -- /g, ': ')
    .replace(/\|/g, '\\|');
}

function packageScripts(root) {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {};
}

/** Every run: command in every workflow, by workflow name. */
export function workflowRuns(root = ROOT) {
  const dir = join(root, '.github/workflows');
  return readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort().map((file) => {
    const doc = parseYaml(readFileSync(join(dir, file), 'utf8'));
    const runs = Object.values(doc.jobs ?? {}).flatMap((job) => (job.steps ?? []).map((s) => s.run).filter(Boolean));
    return { file, name: doc.name ?? file, runs };
  });
}

/** Whether a command names this path as a word of its own. */
const names = (command, path) => new RegExp(`(^|[\\s'"=(./])${escapeRe(path)}(?=$|[\\s'";|&)])`, 'm').test(command);

/** The npm scripts `npm run <name>` reaches: itself, its pre and post hooks, and any npm run inside them. */
function npmClosure(name, scripts, seen = new Set()) {
  for (const n of [`pre${name}`, name, `post${name}`]) {
    if (!(n in scripts) || seen.has(n)) continue;
    seen.add(n);
    for (const m of scripts[n].matchAll(/npm (?:run(?:-script)? ([\w:-]+)|(test|t)\b)/g)) npmClosure(m[1] ?? 'test', scripts, seen);
  }
  return seen;
}

/** The npm script names a command calls. */
const npmCalls = (command) => [...command.matchAll(/npm (?:run(?:-script)? ([\w:-]+)|(test|t)\b)/g)].map((m) => m[1] ?? 'test');

/** Who runs a script: its npm names and the workflows that reach it, directly or through npm. */
export function runnersOf(path, root = ROOT) {
  const scripts = packageScripts(root);
  const npm = Object.keys(scripts).filter((n) => names(scripts[n], path)).sort();
  const workflows = workflowRuns(root).filter(({ runs }) => runs.some((cmd) =>
    names(cmd, path) || npmCalls(cmd).some((n) => [...npmClosure(n, scripts)].some((m) => npm.includes(m))),
  )).map((w) => w.name).sort();
  return { npm, workflows };
}

/** The import specifiers and repository paths a test file names. */
function namedPaths(testPath, text) {
  const out = new Set();
  const dir = dirname(testPath);
  for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|new URL\(\s*)['"`](\.{1,2}\/[^'"`$]+)['"`]/g)) out.add(posix(join(dir, m[1])));
  for (const m of text.matchAll(/['"`]((?:scripts|src)\/[^'"`$\s]+)['"`]/g)) out.add(m[1]);
  return out;
}

/** The tests of a script: test files beside it by name, or importing it. */
export function testsOf(path, root = ROOT, tests = allTests(root)) {
  const dir = dirname(path);
  const stem = basename(path, extname(path));
  return tests.filter(({ file, text }) => {
    if (dirname(file) === dir && (basename(file).startsWith(`${stem}.test.`) || basename(file) === `test_${stem}.py`)) return true;
    if (file.endsWith('.py')) return dirname(file) === dir && new RegExp(`^\\s*(?:import ${escapeRe(stem)}\\b|from ${escapeRe(stem)} import)`, 'm').test(text);
    return namedPaths(file, text).has(path);
  }).map(({ file }) => file).sort();
}

function allTests(root) {
  const py = readdirSync(join(root, 'scripts')).filter((f) => /^test_.*\.py$/.test(f)).map((f) => `scripts/${f}`);
  return [...testFiles(root), ...py].sort().map((file) => ({ file, text: readFileSync(join(root, file), 'utf8') }));
}

/** Everything the README says about each entry point. */
export function entries(root = ROOT) {
  const tests = allTests(root);
  return entryPoints(root).map((path) => {
    const { npm, workflows } = runnersOf(path, root);
    return { path, purpose: purposeOf(readFileSync(join(root, path), 'utf8')), npm, workflows, tests: testsOf(path, root, tests) };
  });
}

function npmLabel(name, scripts) {
  if (name === 'test') return '`npm test`';
  const hook = /^(pre|post)(.+)$/.exec(name);
  if (hook && hook[2] in scripts) return `\`npm run ${hook[2]}\` (${name})`;
  return `\`npm run ${name}\``;
}

function runBy(entry, scripts) {
  const parts = [...entry.npm.map((n) => npmLabel(n, scripts)), ...entry.workflows.map((w) => `workflow "${w}"`)];
  if (parts.length) return parts.join(', ');
  return entry.path.endsWith('.gs') ? 'pasted into Google Apps Script' : 'by hand';
}

/** The README, as the generator writes it. */
export function render(root = ROOT) {
  const scripts = packageScripts(root);
  const rows = entries(root).map((e) => {
    const tests = e.tests.length ? e.tests.map((t) => `\`${t.replace(/^scripts\//, '')}\``).join(', ') : 'none';
    return `| \`${e.path.replace(/^scripts\//, '')}\` | ${e.purpose} | ${runBy(e, scripts)} | ${tests} |`;
  });
  const libs = Object.entries(LIB_FOLDERS)
    .filter(([name]) => existsSync(join(root, 'scripts/lib', name)))
    .map(([name, what]) => {
      const modules = readdirSync(join(root, 'scripts/lib', name))
        .filter((f) => /\.(mjs|js)$/.test(f) && !isTest(f)).sort().map((f) => `\`${f}\``).join(', ');
      return `- \`lib/${name}/\`: ${what} Modules: ${modules}.`;
    });
  return [
    '# scripts/',
    '',
    '<!-- Written by `node scripts/scripts-index.mjs`; do not edit by hand. -->',
    '',
    'Every entry point stays at its path here. Each row is read from the script:',
    'its purpose is the first sentence of its header comment (the header has the',
    'full usage), who runs it comes from `package.json` and the workflows\' `run:`',
    'lines, and its tests are the test files beside it or importing it.',
    '',
    '## Entry points',
    '',
    '| Script | What it does | Run by | Tests |',
    '|---|---|---|---|',
    ...rows,
    '',
    '## Modules in `lib/`',
    '',
    'The modules the entry points import, each with its tests beside it, kept in',
    'one folder per purpose:',
    '',
    ...libs,
    '',
    'Beside them: `templates/` holds the HTML the Instagram renderers read,',
    '`fixtures/` the files tests compare byte for byte (the media tests keep',
    'theirs in `lib/media/fixtures/`), and `review/` the volunteer review',
    'sheets\' Apps Script and the glossary export.',
    '',
    '## Pasted into Google Apps Script',
    '',
    'The `.gs` files do not run from this repository. Each is the source of a',
    'script that lives in a Google account, and its header says how to deploy',
    'it. After editing one, `npm run gs:version` stamps its VERSION.',
    '',
    '## The reel script writer\'s model',
    '',
    '`npm run render-reels` asks an Anthropic model to write each reel\'s script',
    '(`lib/media/llm-script-writer.mjs`, with `ANTHROPIC_API_KEY` set). The model',
    'id is written in one place, `DEFAULT_REEL_MODEL` in that file, and',
    '`NIDHI_REEL_MODEL` overrides it for a run. Model ids are retired on',
    'published dates, so that constant is the line to update when one is.',
    '',
    '## Python',
    '',
    '`send_newsletter.py` needs the packages in `requirements.txt`, at those exact',
    'versions: `pip install --require-hashes -r scripts/requirements.txt`. The',
    'other Python scripts use the standard library only.',
    '',
  ].join('\n');
}

export const README = 'scripts/README.md';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = render();
  const file = join(ROOT, README);
  if (process.argv.includes('--check')) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text) {
      console.error(`${README} is out of date: run node scripts/scripts-index.mjs`);
      process.exit(1);
    }
    console.log(`${README} is up to date.`);
  } else {
    writeFileSync(file, text);
    console.log(`Wrote ${relative(ROOT, file)}.`);
  }
}
