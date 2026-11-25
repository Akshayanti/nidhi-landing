#!/usr/bin/env node
// Measures what each statement costs to test, for stryker.shard-weights.json (#846).
//
//   gh run download <full mutation run id> --dir <dir>
//   node scripts/mutation-weights.mjs <dir> [--write]
//
// Reads every scope's reports from a FULL run of "Free tools mutation" (a
// nightly run, or a pull request whose cache was empty: a reused result took
// no time). Prints, per scope, what its shards would each take under the
// counts in stryker.shards.json, slowest and fastest, in summed test seconds.
// With --write, sets the weights of every scope cut into more than one shard.
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { shardUnits, unitCosts, units, weightsFromReport } from './lib/checks/mutation-shards.mjs';
import { mergeReports } from './lib/checks/mutation-floors.mjs';

const [dir, flag] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node scripts/mutation-weights.mjs <dir of downloaded mutation-* artifacts> [--write]');
  process.exit(2);
}
// The config needs a scope to load; any will do, since only its scope list is read.
process.env.STRYKER_SCOPE ??= 'inflation';
const { SCOPES, scopeFiles } = await import('../stryker.config.mjs');
const shards = JSON.parse(readFileSync('stryker.shards.json', 'utf8'));

const weights = {};
for (const scope of Object.keys(SCOPES)) {
  const reports = globSync(`${dir}/mutation-${scope}{,-*of*}/*.json`).map((f) => JSON.parse(readFileSync(f, 'utf8')));
  if (reports.length === 0) {
    console.error(`mutation-weights: no reports for ${scope} in ${dir}`);
    process.exit(2);
  }
  const all = units(scopeFiles(scope));
  const measured = weightsFromReport(all, mergeReports(reports));
  const costs = unitCosts(all, measured);
  const count = shards[scope];
  const loads = Array.from({ length: count }, (_, i) =>
    shardUnits(all, count, i + 1, measured).reduce((sum, u) => sum + costs[all.indexOf(u)], 0),
  );
  const total = costs.reduce((a, b) => a + b, 0);
  console.log(
    `${scope}: ${Math.round(total)} s in all, dearest statement ${Math.round(Math.max(...costs))} s; ` +
      `${count} shard(s): slowest ${Math.round(Math.max(...loads))} s, fastest ${Math.round(Math.min(...loads))} s`,
  );
  if (count > 1) weights[scope] = measured;
}
if (flag === '--write') {
  writeFileSync('stryker.shard-weights.json', `${JSON.stringify(weights, null, 2)}\n`);
  console.log('mutation-weights: stryker.shard-weights.json written');
}
