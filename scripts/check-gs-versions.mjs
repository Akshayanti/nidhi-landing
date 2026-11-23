#!/usr/bin/env node
// Compares each deployed Apps Script with main (#443): asks its health action
// for the VERSION it runs and checks it against the hash of the file here.
// Run by .github/workflows/apps-script-versions.yml nightly, after each
// deploy and by hand. Endpoints come from the environment; an unset one is
// reported as not checked, not as a pass. Writes a Markdown report to
// $REPORT (when set) and exits 1 on any mismatch or failure.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSIONED_SCRIPTS, gsVersion } from './lib/publishing/gs-version.mjs';

const ROOT = join(import.meta.dirname, '..');

/** Which environment variable holds each script's /exec address. */
export const ENDPOINTS = {
  'scripts/newsletter.gs': 'NEWSLETTER_ENDPOINT',
  'scripts/waitlist.gs': 'WAITLIST_ENDPOINT',
  'scripts/volunteer-list.gs': 'VOLUNTEER_LIST_ENDPOINT',
};

/** One row of the report from what health answered (or null when it could not be read). */
export function verdict(file, expected, answer) {
  if (!answer) return { file, expected, live: '', ok: false, why: 'no answer from health' };
  if (!answer.version) return { file, expected, live: '', ok: false, why: 'health reports no version: deployed before #443' };
  if (answer.version !== expected) return { file, expected, live: answer.version, ok: false, why: 'differs from main: deploy a New version' };
  if (answer.ok !== true) return { file, expected, live: answer.version, ok: false, why: 'version matches; health is not ok (see the script\'s executions)' };
  return { file, expected, live: answer.version, ok: true, why: 'matches main, health ok' };
}

async function health(url) {
  const sep = url.includes('?') ? '&' : '?';
  try {
    const res = await fetch(`${url}${sep}action=health`, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

async function main() {
  const rows = [];
  for (const file of VERSIONED_SCRIPTS) {
    const expected = gsVersion(readFileSync(join(ROOT, file), 'utf8'));
    const url = process.env[ENDPOINTS[file]];
    if (!url) { rows.push({ file, expected, live: '', ok: true, why: `not checked: ${ENDPOINTS[file]} is not set` }); continue; }
    rows.push(verdict(file, expected, await health(url)));
  }
  const table = ['| Script | main | live | |', '|---|---|---|---|',
    ...rows.map(r => `| \`${r.file}\` | \`${r.expected}\` | \`${r.live || '?'}\` | ${r.ok ? r.why : `**${r.why}**`} |`)].join('\n');
  console.log(table);
  if (process.env.REPORT) writeFileSync(process.env.REPORT, table + '\n');
  process.exit(rows.every(r => r.ok) ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
