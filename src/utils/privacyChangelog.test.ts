/**
 * Unit tests for src/utils/privacyChangelog.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  NOTICE_ENTRIES, assertOneEntryPerDate, changelogMonths, changelogYears, entryAnchor, entryYear, type ChangelogEntry,
} from './privacyChangelog.ts';
import { writtenChangelog } from './privacyChangelogEntries.ts';

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

  // The two tools that launched with a lesson are recorded on that lesson's
  // day, first in that day's entry, as they read when they were added at build time.
  it('records each tool launch on its lesson\'s day, first in that day\'s entry', () => {
    const on = (iso: string) => writtenChangelog.find((e) => e.iso === iso);
    assert.match(on('2026-10-12')?.summary ?? '', /^New free tool: a Monte Carlo simulator\. The site is published in Spanish/);
    assert.match(on('2026-10-12')?.details?.[0] ?? '', /^The simulator plays a savings and withdrawal plan forward/);
    assert.match(on('2026-11-04')?.summary ?? '', /^New free tool: an invest or pay off calculator, .* The home page has a new layout/);
    assert.match(on('2026-11-04')?.details?.[0] ?? '', /^The calculator compares paying a debt off early/);
    assert.ok(on('2026-11-04')?.details?.some((d) => d.includes('nidhi-invest-or-pay-off-2026-11-04.xlsx')));
  });
});
