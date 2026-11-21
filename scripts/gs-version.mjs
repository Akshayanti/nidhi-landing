#!/usr/bin/env node
// Writes each Apps Script file's VERSION (scripts/lib/gs-version.mjs). Run it
// after editing a .gs file: npm run gs:version. With --check it only reports.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSIONED_SCRIPTS, gsVersion, writtenVersion, withVersion } from './lib/gs-version.mjs';

const ROOT = join(import.meta.dirname, '..');
const check = process.argv.includes('--check');
let stale = 0;
for (const file of VERSIONED_SCRIPTS) {
  const path = join(ROOT, file);
  const source = readFileSync(path, 'utf8');
  const want = gsVersion(source);
  if (writtenVersion(source) === want) { console.log(`${file}: ${want}`); continue; }
  stale++;
  if (check) console.log(`${file}: says ${writtenVersion(source)}, is ${want}`);
  else { writeFileSync(path, withVersion(source)); console.log(`${file}: ${want} (written)`); }
}
if (check && stale) process.exit(1);
