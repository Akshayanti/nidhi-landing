#!/usr/bin/env node
// Checks one scope's mutation reports against its floors (#790).
//
//   node scripts/mutation-floors.mjs <scope>
//
// Reads the scope's reports in reports/mutation/ (written by `npx stryker
// run`): <scope>.json, or one <scope>-<i>of<n>.json per shard when
// stryker.shards.json splits it (#846), all of which must be there. Exit 1
// when a part is below its floor, 2 when a report is missing or unreadable.
import { readFileSync } from 'node:fs';
import { judgeScope, mergeReports, partScores } from './lib/checks/mutation-floors.mjs';

const scope = process.argv[2];
const count = JSON.parse(readFileSync('stryker.shards.json', 'utf8'))[scope];
if (!count) {
  console.error(`mutation-floors: ${scope} is not in stryker.shards.json`);
  process.exit(2);
}
const names = count === 1 ? [scope] : Array.from({ length: count }, (_, i) => `${scope}-${i + 1}of${count}`);
const reports = [];
for (const name of names) {
  try {
    reports.push(JSON.parse(readFileSync(`reports/mutation/${name}.json`, 'utf8')));
  } catch (error) {
    console.error(`mutation-floors: no report to read for ${name}: ${error.message}`);
    process.exit(2);
  }
}
const report = mergeReports(reports);
const total = Object.values(report.files).reduce((n, f) => n + f.mutants.length, 0);
console.log(`${scope}: ${total} mutants from ${reports.length} report(s)`);
const floors = JSON.parse(readFileSync('stryker.floors.json', 'utf8'));
const scores = partScores(report);
for (const part of ['logic', 'component']) {
  const c = scores.counts[part];
  console.log(`${scope} ${part}: ${scores[part] ?? 'no mutants'}% (floor ${floors[scope]?.[part] ?? 'none'}%; ${c.detected} detected, ${c.undetected} not)`);
}
const problems = judgeScope(scope, scores, floors);
for (const p of problems) console.error(`BELOW FLOOR: ${p}`);
process.exit(problems.length ? 1 : 0);
