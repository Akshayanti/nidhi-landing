import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ChangeItem } from '../i18n/strings/changes.ts';

const { feedItems } = await import('./changesFeed.ts');

const item = (id: string): ChangeItem => ({
  id,
  text: { en: `${id} en`, hi: `${id} hi`, es: `${id} es`, cs: `${id} cs`, mr: `${id} mr` },
});

describe('the What\'s changed feed', () => {
  it('one item per change: this language\'s line, dated in UTC, linking to its anchor', () => {
    const [first] = feedItems('en', [{ ...item('loan-waitlist'), date: '2026-11-02' }]);
    assert.equal(first.title, 'loan-waitlist en');
    assert.equal(first.description, 'loan-waitlist en');
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

  it('the whole line is the description, and its first sentence the title', () => {
    const long = { id: 'two', text: { en: 'First sentence. Second one.', hi: 'पहला वाक्य। दूसरा वाक्य।', es: 'Primera frase. Segunda.', cs: 'První věta. Druhá.', mr: 'पहिले वाक्य. दुसरे वाक्य.' } };
    const [en] = feedItems('en', [{ ...long, date: '2026-11-02' }]);
    assert.equal(en.title, 'First sentence.');
    assert.equal(en.description, 'First sentence. Second one.');
    const [hi] = feedItems('hi', [{ ...long, date: '2026-11-02' }]);
    assert.equal(hi.title, 'पहला वाक्य।');
    assert.equal(hi.description, 'पहला वाक्य। दूसरा वाक्य।');
  });
});
