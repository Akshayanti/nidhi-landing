#!/usr/bin/env node
// Checks one scope's mutation report against its floors (#790).
//
//   node scripts/mutation-floors.mjs <scope>
//
// Reads reports/mutation/<scope>.json (written by `npx stryker run`) and
// stryker.floors.json. Exit 1 when a part is below its floor, 2 when the
// report cannot be read.
import { readFileSync } from 'node:fs';
import { judgeScope, partScores } from './lib/checks/mutation-floors.mjs';

const scope = process.argv[2];
let report;
try {
  report = JSON.parse(readFileSync(`reports/mutation/${scope}.json`, 'utf8'));
} catch (error) {
  console.error(`mutation-floors: no report to read for ${scope}: ${error.message}`);
  process.exit(2);
}
const floors = JSON.parse(readFileSync('stryker.floors.json', 'utf8'));
const scores = partScores(report);
for (const part of ['logic', 'component']) {
  const c = scores.counts[part];
  console.log(`${scope} ${part}: ${scores[part] ?? 'no mutants'}% (floor ${floors[scope]?.[part] ?? 'none'}%; ${c.detected} detected, ${c.undetected} not)`);
}
const problems = judgeScope(scope, scores, floors);
for (const p of problems) console.error(`BELOW FLOOR: ${p}`);
process.exit(problems.length ? 1 : 0);
