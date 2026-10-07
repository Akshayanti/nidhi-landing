/**
 * Unit tests for src/utils/privacyChangelog.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertOneEntryPerDate, mergeByDate, type ChangelogEntry } from './privacyChangelog.ts';

const entry = (iso: string, material: boolean, summary: string, details?: string[]): ChangelogEntry => ({
  date: iso,
  iso,
  material,
  summary,
  details,
});

describe('one entry per date', () => {
  it('passes when every date is unique', () => {
    assert.doesNotThrow(() => assertOneEntryPerDate([entry('2026-10-07', false, 'a'), entry('2026-10-05', true, 'b')]));
  });

  it('names the repeated date', () => {
    assert.throws(
      () => assertOneEntryPerDate([entry('2026-10-07', false, 'a'), entry('2026-10-07', false, 'b')]),
      /2026-10-07/,
    );
  });
});

describe('merging a launch entry into its day', () => {
  it('combines summary and details, and is material if either part is', () => {
    const merged = mergeByDate([
      entry('2027-01-01', true, 'Launch.', ['x']),
      entry('2027-01-01', false, 'Copy edits.', ['y']),
      entry('2026-12-01', false, 'Older.'),
    ]);
    assert.equal(merged.length, 2);
    assert.deepEqual(merged[0], entry('2027-01-01', true, 'Launch. Copy edits.', ['x', 'y']));
    assert.equal(merged[1].iso, '2026-12-01');
  });

  it('keeps newest first when a launch is older than the latest entry', () => {
    const merged = mergeByDate([entry('2026-01-01', true, 'Launch.'), entry('2026-10-07', false, 'Newer.')]);
    assert.deepEqual(merged.map((e) => e.iso), ['2026-10-07', '2026-01-01']);
  });

  it('does not change the entries it was given', () => {
    const written = entry('2027-01-01', false, 'Copy edits.', ['y']);
    mergeByDate([entry('2027-01-01', true, 'Launch.', ['x']), written]);
    assert.deepEqual(written, entry('2027-01-01', false, 'Copy edits.', ['y']));
  });
});
