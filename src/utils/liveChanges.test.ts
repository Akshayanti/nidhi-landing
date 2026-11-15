import './testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ChangeDay, ChangeItem } from '../i18n/strings/changes.ts';

const { withLaunchItem } = await import('./liveChanges.ts');
const { feedItems } = await import('./changesFeed.ts');

const item = (id: string): ChangeItem => ({
  id,
  text: { en: `${id} en`, hi: `${id} hi`, es: `${id} es`, cs: `${id} cs`, mr: `${id} mr` },
});
const days = (): ChangeDay[] => [
  { date: '2026-11-10', items: [item('c')] },
  { date: '2026-11-02', items: [item('a'), item('b')] },
];
const shape = (d: ChangeDay[]) => d.map((x) => [x.date, x.items.map((i) => i.id)]);

describe('a launch item on the What\'s changed page', () => {
  it('joins the day that already exists, and reads first', () => {
    assert.deepEqual(shape(withLaunchItem(days(), item('launch'), '2026-11-02')), [
      ['2026-11-10', ['c']],
      ['2026-11-02', ['launch', 'a', 'b']],
    ]);
  });

  it('makes a new day in date order: between, newest and oldest', () => {
    assert.deepEqual(shape(withLaunchItem(days(), item('launch'), '2026-11-04')).map((d) => d[0]), ['2026-11-10', '2026-11-04', '2026-11-02']);
    assert.deepEqual(shape(withLaunchItem(days(), item('launch'), '2026-11-12'))[0], ['2026-11-12', ['launch']]);
    assert.deepEqual(shape(withLaunchItem(days(), item('launch'), '2026-10-01'))[2], ['2026-10-01', ['launch']]);
  });

  it('keeps one day per date and leaves the written days untouched', () => {
    const before = days();
    const out = withLaunchItem(before, item('launch'), '2026-11-02');
    assert.equal(new Set(out.map((d) => d.date)).size, out.length);
    assert.deepEqual(shape(before), shape(days()));
  });
});

describe('the What\'s changed feed', () => {
  it('one item per change: this language\'s line, dated in UTC, linking to its anchor', () => {
    const [first] = feedItems('en', [{ ...item('loan-waitlist'), date: '2026-11-02' }]);
    assert.equal(first.title, 'loan-waitlist en');
    assert.equal(first.pubDate.toISOString(), '2026-11-02T00:00:00.000Z');
    assert.equal(first.link, '/changes/#loan-waitlist');
  });

  it('each language links to its own page, by the permanent id', () => {
    const items = [{ ...item('x'), date: '2026-11-02' }];
    assert.deepEqual(
      (['hi', 'es', 'cs', 'mr'] as const).map((l) => [feedItems(l, items)[0].title, feedItems(l, items)[0].link]),
      [['x hi', '/hi/changes/#x'], ['x es', '/es/changes/#x'], ['x cs', '/cs/changes/#x'], ['x mr', '/mr/changes/#x']],
    );
  });
});
