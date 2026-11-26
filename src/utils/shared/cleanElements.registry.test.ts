/**
 * The label registry that cleanElements.js is given on the page: every
 * `data-attr` label in the source, read at build time by
 * src/utils/analyticsLabels.ts. A label the registry does not know is not
 * sent with a click (CLAUDE.md, "Keep the analytics backstops").
 *
 * In a file of its own, apart from the filter's own tests
 * (cleanElements.test.ts): the registry is made by walking the whole source,
 * so this file depends on every file, and the mutation cache works out what
 * a test depends on from its source (#904). It runs no code a mutation run
 * mutates.
 *
 * Run with:  npm test
 */
import { readsSource } from '../../../test/mutationRun.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { scanLabels } from '../analyticsLabels.ts';

describe('the label registry', () => {
  // From this file's own place, not the directory the runner starts in (#366).
  const scan = scanLabels(join(import.meta.dirname, '..', '..'));

  it('resolves every data-attr in the source', () => {
    assert.deepEqual(scan.unresolved, []);
  });

  it('knows the labels the notice and the dashboards rely on', { skip: readsSource }, () => {
    for (const label of ['volunteers-form', 'lc-share-copy', 'mcnw-csv-download', 'free-monte-carlo-share', 'waitlist-confirm-yes', 'post-inline-tool-loan-comparison']) {
      assert.ok(scan.exact.includes(label), label);
    }
    for (const prefix of ['related-', 'lc-tab-', 'nav-menu-']) assert.ok(scan.prefixes.includes(prefix), prefix);
  });

  it('holds only slugs', () => {
    for (const label of [...scan.exact, ...scan.prefixes.map((p) => p.replace(/-$/, ''))]) {
      assert.match(label, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
