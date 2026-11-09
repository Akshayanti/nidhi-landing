/**
 * Builds the data for one language's glossary review sheet, batch by batch.
 *
 * Reads the language's glossary (`docs/i18n/<lang>-glossary.md`, the drafted
 * terms and their notes) and the shared context
 * (`scripts/review/glossary-context.json`, what each English term means and a
 * real sentence from the site), checks that every example still exists in the
 * English catalog, and writes `Data.js` for the Apps Script that builds the
 * sheet (`scripts/review/review-sheet.gs`). Nothing is sent anywhere: the file
 * is pushed to the owner's Apps Script project with clasp, and the owner runs
 * the build from the script editor.
 *
 * Usage:
 *   npx tsx scripts/review/glossary-export.ts --lang id --batch G1 --copy id-SAMPLE --out <dir>
 *
 * The private export manifest (Ref, English and draft fingerprints, source
 * commit, copy id) is written next to Data.js as manifest.json. It never goes
 * into the repository or into a sheet. See
 * docs/plans/volunteer-review-material.md, sections 2, 5 and 10.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { en } from '../../src/i18n/strings/en.ts';

type Args = { lang: string; batch: string; copy: string; out: string };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1 || !argv[i + 1]) throw new Error(`Missing --${name}`);
    return argv[i + 1];
  };
  return { lang: get('lang'), batch: get('batch'), copy: get('copy'), out: resolve(get('out')) };
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
function readGlossary(lang: string): Map<string, GlossaryRow> {
  const text = readFileSync(join(ROOT, `docs/i18n/${lang}-glossary.md`), 'utf8');
  const rows = new Map<string, GlossaryRow>();
  const plain = (s: string) => s.replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
  for (const line of text.split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| ---') || line.startsWith('| English') || line.startsWith('| Context')) continue;
    const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 5) continue;
    const [english, draft, alternatives, notes, status] = cells.map(plain);
    rows.set(english, { english, draft, alternatives, notes, status });
  }
  return rows;
}

type RegisterRow = { context: string; english: string; anda: string; kamu: string; none: string };

/** The register question's example table: the rows under the "| Context |" header. */
function readRegister(lang: string): RegisterRow[] {
  const lines = readFileSync(join(ROOT, `docs/i18n/${lang}-glossary.md`), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('| Context |'));
  if (start === -1) return [];
  const plain = (s: string) => s.replace(/\*([^*]+)\*/g, '$1').trim();
  const out: RegisterRow[] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    const [context, english, anda, kamu, none] = line.trim().slice(1, -1).split('|').map(plain);
    out.push({ context, english, anda, kamu, none });
  }
  return out;
}

const fingerprint = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = JSON.parse(readFileSync(join(ROOT, 'scripts/review/glossary-context.json'), 'utf8'));
  const batch = context.batches.find((b: { id: string }) => b.id === args.batch);
  if (!batch) throw new Error(`No batch ${args.batch} in glossary-context.json`);

  const strings = catalogStrings();
  const glossary = readGlossary(args.lang);
  const problems: string[] = [];

  const terms = batch.terms.map((t: { term: string; meaning: string; key: string; example: string }, i: number) => {
    const source = strings.get(t.key);
    if (source === undefined) problems.push(`${t.term}: key ${t.key} is not in the English catalog`);
    else if (!source.includes(t.example)) problems.push(`${t.term}: the example is no longer in ${t.key}`);
    // The glossary may list a term under a fuller heading ("investing" and
    // "stock, shares" are exact; "refinance" is listed as "refinance, refinancing").
    const row = glossary.get(t.term) ?? [...glossary.values()].find((r) => r.english.split(', ').includes(t.term));
    if (!row) problems.push(`${t.term}: not in docs/i18n/${args.lang}-glossary.md`);
    const ref = `${args.lang.toUpperCase()}-${args.batch}-${String(i + 1).padStart(3, '0')}`;
    return {
      ref,
      term: t.term,
      meaning: t.meaning,
      example: t.example,
      where: whereLabel(t.key),
      draft: row?.draft ?? '',
      alternatives: row?.alternatives ?? '',
      notes: row?.notes ?? '',
    };
  });

  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const exportedAt = new Date().toISOString();
  const register = readRegister(args.lang);
  const data = { lang: args.lang, copyId: args.copy, batch: { id: batch.id, title: batch.title }, sourceCommit: commit, exportedAt, register, terms };
  const manifest = {
    lang: args.lang,
    copyId: args.copy,
    batch: batch.id,
    sourceCommit: commit,
    exportedAt,
    rows: terms.map((t: { ref: string; term: string; example: string; draft: string }) => ({
      ref: t.ref,
      english: fingerprint(`${t.term}\n${t.example}`),
      draft: fingerprint(t.draft),
    })),
  };

  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'Data.js'), `// Generated by scripts/review/glossary-export.ts. Do not edit.\nconst REVIEW_DATA = ${JSON.stringify(data, null, 2)};\n`);
  writeFileSync(join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`${terms.length} terms, batch ${batch.id}, copy ${args.copy}, source ${commit} -> ${args.out}`);
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
