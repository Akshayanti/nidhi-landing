/**
 * Unit tests for src/utils/privacyChangelog.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  NOTICE_ENTRIES, assertOneEntryPerDate, changelogMonths, changelogYears, entryAnchor, entryYear, mergeByDate, type ChangelogEntry,
} from './privacyChangelog.ts';
import { launchChangelog, writtenChangelog } from './privacyChangelogEntries.ts';

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

describe('the changelog pages (#722)', () => {
  const log = [
    entry('2027-01-03', false, 'e'),
    entry('2026-11-21', true, 'd'),
    entry('2026-11-14', false, 'c'),
    entry('2026-10-07', false, 'b'),
    entry('2026-01-02', true, 'a'),
  ];

  it('groups the entries by year, newest first, with each year\'s range', () => {
    const years = changelogYears(log);
    assert.deepEqual(years.map((y) => [y.year, y.entries.length, y.from, y.to]), [
      ['2027', 1, '2027-01-03', '2027-01-03'],
      ['2026', 4, '2026-01-02', '2026-11-21'],
    ]);
  });

  it('groups a year by month, newest first', () => {
    const months = changelogMonths(changelogYears(log)[1].entries);
    assert.deepEqual(months.map((m) => [m.key, m.entries.map((e) => e.summary).join('')]), [
      ['2026-11', 'dc'],
      ['2026-10', 'b'],
      ['2026-01', 'a'],
    ]);
  });

  it('gives each entry a permanent anchor and a year', () => {
    assert.equal(entryAnchor('2026-05-05'), 'change-2026-05-05');
    assert.equal(entryYear('2026-05-05'), '2026');
  });

  it('shows the latest three on the notice, across a year boundary', () => {
    assert.equal(NOTICE_ENTRIES, 3);
    assert.deepEqual(log.slice(0, NOTICE_ENTRIES).map((e) => e.iso), ['2027-01-03', '2026-11-21', '2026-11-14']);
  });
});

describe('the written changelog', () => {
  it('has one entry per date, newest first, each dated in both forms', () => {
    assert.doesNotThrow(() => assertOneEntryPerDate(writtenChangelog));
    const isos = writtenChangelog.map((e) => e.iso);
    assert.deepEqual(isos, [...isos].sort().reverse());
    for (const e of writtenChangelog) {
      assert.match(e.iso, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(new Date(`${e.date} UTC`).toISOString().slice(0, 10), e.iso, `${e.iso}: its display date says ${e.date}`);
    }
  });

  it('builds a launch entry only for a tool that is live, dated with its launch', () => {
    assert.deepEqual(launchChangelog({ monteCarloLaunch: null, investOrPayOffLaunch: null }), []);
    const launched = launchChangelog({ monteCarloLaunch: new Date('2026-12-01T00:00:00Z'), investOrPayOffLaunch: null });
    assert.deepEqual(launched.map((e) => [e.iso, e.date, e.material]), [['2026-12-01', 'Dec 1, 2026', true]]);
  });
});
