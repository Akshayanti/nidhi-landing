#!/usr/bin/env node
// Prints what the test files that depend on everything cover in a mutation run (#904).
//
//   node scripts/mutation-wide-coverage.mjs
//
// Reads every report in reports/mutation/ (the shards', as the floors job
// has them). A test file that depends on everything is marked by any change,
// and Stryker then tests again every mutant it covers: this is that number,
// so a test that starts to cost shows in the next run. It judges nothing and
// always exits 0; the names are in lib/checks/mutation-wide-tests.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { READ_THE_SOURCE, STILL_COSTLY, coveredBy } from './lib/checks/mutation-wide-tests.mjs';

try {
  const reports = readdirSync('reports/mutation').filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(readFileSync(`reports/mutation/${name}`, 'utf8')));
  const { total, covered, byTest } = coveredBy(reports, [...READ_THE_SOURCE, ...Object.keys(STILL_COSTLY)]);
  console.log(`Test files that depend on everything cover ${covered} of ${total} mutants (${total ? (100 * covered / total).toFixed(1) : '0.0'}%) in ${reports.length} report(s): any change tests these again.`);
  for (const [test, n] of Object.entries(byTest).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${test}${Object.hasOwn(STILL_COSTLY, test) ? '' : '  <- named as running no mutated code: look at it'}`);
  }
} catch (error) {
  console.log(`mutation-wide-coverage: nothing printed (${error.message}).`);
}
