/**
 * Builds the data for one language's glossary review sheets: every batch.
 *
 * Reads the language's glossary (`docs/i18n/<lang>-glossary.md`, the drafted
 * terms and their notes) and the shared context
 * (`scripts/review/glossary-context.json`, the batches in order, what each
 * English term means and a real sentence from the site), checks that every
 * example still exists in the English catalog, and writes `Data.js` for the
 * Apps Script bound to the volunteer sheet (`scripts/review/review-sheet.gs`).
 * Nothing is sent anywhere: the file is pushed to that project with clasp.
 *
 * Usage:
 *   npx tsx scripts/review/glossary-export.ts --langs id,fr --out <dir>
 *
 * Every listed language needs `docs/i18n/<lang>-glossary.md` with the
 * vocabulary tables. A language the volunteer sheet offers but this file
 * does not list has no material yet, and the menu says so.
 *
 * Data.js holds no copy code and nothing about any volunteer. The menu in the
 * volunteer sheet makes a copy code (`id-G1-7Q3K`) when it builds a sheet,
 * and records exactly what it sent, with the source commit, in that copy's
 * private master file. See docs/plans/volunteer-review-material.md.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { en } from '../../src/i18n/strings/en.ts';

type Args = { langs: string[]; out: string };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1 || !argv[i + 1]) throw new Error(`Missing --${name}`);
    return argv[i + 1];
  };
  return { langs: get('langs').split(','), out: resolve(get('out')) };
}

const ROOT = resolve(import.meta.dirname, '../..');

/** Every leaf string in the English catalog, by dotted key. */
function catalogStrings(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') out.set(path, node);
    else if (node && typeof node === 'object')
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(en, '');
  return out;
}

type GlossaryRow = { english: string; draft: string; alternatives: string; notes: string; status: string };

/**
 * The vocabulary tables of a glossary file: every table row with five cells
 * (English, draft, alternatives, notes, status). Markdown emphasis is removed,
 * since a sheet cell shows it as literal asterisks.
 */
/**
 * Term tables in a glossary. Two shapes are read, and nothing else:
 *   - `| English | <draft> | Alternatives | Notes | Status |`, the review
 *     table of a language without an edition (every row a draft);
 *   - `| English | <language> | Notes |`, the tables of a published edition,
 *     where the second column is the wording the site uses today.
 * A row belongs to the table whose header it follows.
 */
function readGlossary(lang: string): Map<string, GlossaryRow> {
  const text = readFileSync(join(ROOT, `docs/i18n/${lang}-glossary.md`), 'utf8');
  const rows = new Map<string, GlossaryRow>();
  const plain = (s: string) => s.replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
  const cellsOf = (line: string) => line.trim().slice(1, -1).split('|').map((c) => c.trim());
  let shape: 'review' | 'published' | null = null;
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) { shape = null; continue; }
    if (line.startsWith('| ---')) continue;
    const cells = cellsOf(line);
    if (cells[0] === 'English') {
      shape = cells.length === 5 && cells[4] === 'Status' ? 'review' : cells.length === 3 && cells[2] === 'Notes' ? 'published' : null;
      continue;
    }
    if (shape === 'review' && cells.length === 5) {
      const [english, draft, alternatives, notes, status] = cells.map(plain);
      rows.set(english, { english, draft, alternatives, notes, status });
    } else if (shape === 'published' && cells.length === 3) {
      const [english, current, notes] = cells.map(plain);
      if (!rows.has(english)) rows.set(english, { english, draft: current, alternatives: '', notes, status: 'In use' });
    }
  }
  return rows;
}

/** "stock, shares" finds "share, stock"; "fee" finds "fees". */
function findRow(glossary: Map<string, GlossaryRow>, term: string): GlossaryRow | undefined {
  const items = (s: string) => s.replace(/ \(.*\)$/, '').split(',').map((x) => x.trim().toLowerCase().replace(/s$/, ''));
  const want = items(term);
  return glossary.get(term) ?? [...glossary.values()].find((r) => want.every((w) => items(r.english).includes(w)));
}

type Register = { options: string[]; rows: { context: string; english: string; examples: string[] }[] };

/**
 * The register question, if the glossary has one: a table headed
 * `| Context | English | <option> | <option> ... |`, one column per way of
 * addressing the reader. Languages without the question get no register tab.
 */
function readRegister(lang: string): Register | null {
  const lines = readFileSync(join(ROOT, `docs/i18n/${lang}-glossary.md`), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('| Context |'));
  if (start === -1) return null;
  const plain = (s: string) => s.replace(/\*([^*]+)\*/g, '$1').trim();
  const cells = (line: string) => line.trim().slice(1, -1).split('|').map(plain);
  const options = cells(lines[start]).slice(2);
  const rows: Register['rows'] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    const [context, english, ...examples] = cells(line);
    rows.push({ context, english, examples });
  }
  return { options, rows };
}

const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex').slice(0, 16);

type ContextTerm = { term: string; meaning: string; key: string; example: string };

function exportLanguage(lang: string, context: { batches: { id: string; title: string; terms: ContextTerm[] }[] }, strings: Map<string, string>, problems: string[]) {
  const glossary = readGlossary(lang);
  const register = readRegister(lang);
  const seen = new Set<string>();
  const batches = context.batches.map((batch) => {
    const terms = batch.terms.map((t, i) => {
      if (seen.has(t.term)) problems.push(`${t.term}: in more than one batch`);
      seen.add(t.term);
      if (t.key.startsWith('lesson:')) {
        const file = join(ROOT, 'src/content/blog', t.key.slice('lesson:'.length));
        let text = '';
        try { text = readFileSync(file, 'utf8'); } catch { problems.push(`${t.term}: lesson ${t.key} not found`); }
        if (text && !text.includes(t.example)) problems.push(`${t.term}: the example is no longer in ${t.key}`);
      } else {
        const source = strings.get(t.key);
        if (source === undefined) problems.push(`${t.term}: key ${t.key} is not in the English catalog`);
        else if (!source.includes(t.example)) problems.push(`${t.term}: the example is no longer in ${t.key}`);
      }
      // The glossary may list a term under a fuller heading ("refinance" is
      // listed as "refinance, refinancing").
      const row = findRow(glossary, t.term);
      if (!row) problems.push(`${lang}: ${t.term} is not in docs/i18n/${lang}-glossary.md`);
      return {
        ref: `${lang.toUpperCase()}-${batch.id}-${String(i + 1).padStart(3, '0')}`,
        term: t.term,
        meaning: t.meaning,
        example: t.example,
        where: t.key.startsWith('lesson:') ? 'A lesson (English only)' : whereLabel(t.key),
        draft: row?.draft ?? '',
        alternatives: row?.alternatives ?? '',
        notes: row?.notes ?? '',
      };
    });
    // The fingerprint covers everything the sheet shows, so the master's
    // record of what was sent can be checked against it later.
    return { id: batch.id, title: batch.title, fingerprint: fingerprint({ terms, register }), terms };
  });
  return { lang, register, batches };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = JSON.parse(readFileSync(join(ROOT, 'scripts/review/glossary-context.json'), 'utf8'));
  const strings = catalogStrings();
  const problems: string[] = [];
  const languages: Record<string, ReturnType<typeof exportLanguage>> = {};
  for (const lang of args.langs) languages[lang] = exportLanguage(lang, context, strings, problems);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  const data = {
    schema: 2,
    sourceCommit: execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(),
    exportedAt: new Date().toISOString(),
    languages,
  };
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'Data.js'), `// Generated by scripts/review/glossary-export.ts. Do not edit.\nconst REVIEW_DATA = ${JSON.stringify(data, null, 2)};\n`);
  for (const l of Object.values(languages)) {
    console.log(`${l.lang}: ${l.batches.map((b) => `${b.id} (${b.terms.length} terms)`).join(', ')}${l.register ? ', register question' : ''}`);
  }
  console.log(`source ${data.sourceCommit} -> ${args.out}`);
}

/** Where a catalog key is shown, in words a volunteer recognises. */
function whereLabel(key: string): string {
  const places: [string, string][] = [
    ['tools.loanComparison', 'Loan comparison tool'],
    ['tools.multiCurrencyNetWorth', 'Net worth calculator'],
    ['tools.monteCarlo', 'Monte Carlo simulator'],
    ['tools.investOrPayOff', 'Invest or pay off debt tool'],
    ['tools.inflation', 'Inflation calculator'],
    ['home', 'Home page'],
    ['learn', 'Learning path'],
    ['blogIndex', 'Lessons list'],
    ['editorialPolicy', 'Editorial policy'],
  ];
  return places.find(([prefix]) => key === prefix || key.startsWith(`${prefix}.`))?.[1] ?? 'Site';
}

main();
