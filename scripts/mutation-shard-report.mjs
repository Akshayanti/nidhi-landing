#!/usr/bin/env node
// Trims one shard's mutation report to the mutants that shard holds (#846).
//
//   STRYKER_SCOPE=<scope> STRYKER_SHARD=<i>/<n> node scripts/mutation-shard-report.mjs
//
// Run after `npx stryker run` in the same environment. Stryker's incremental
// mode also writes earlier results for mutants outside the shard's ranges;
// left in, a mutant that moved to another shard would be counted twice. The
// report is rewritten in place. Exit 2 when it cannot be read.
import { readFileSync, writeFileSync } from 'node:fs';
import { withinShard } from './lib/checks/mutation-shards.mjs';

const { default: config } = await import('../stryker.config.mjs');
const path = config.jsonReporter.fileName;
let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  console.error(`mutation-shard-report: cannot read ${path}: ${error.message}`);
  process.exit(2);
}
const count = (r) => Object.values(r.files ?? {}).reduce((n, f) => n + f.mutants.length, 0);
const trimmed = withinShard(report, config.mutate);
writeFileSync(path, JSON.stringify(trimmed));
console.log(`${path}: ${count(trimmed)} mutants in this shard (${count(report) - count(trimmed)} earlier results outside it left out)`);
