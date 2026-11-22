/**
 * Reading progress on /blog/ (src/utils/learnProgress.ts): the start card's
 * three versions and the level cards' counts, from the stored list of lessons.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgress, progressState, startState } from './learnProgress.ts';

const CORE = [
  { id: 'a1', level: 'discovery' },
  { id: 'a2', level: 'discovery' },
  { id: 'a3', level: 'discovery' },
  { id: 'b1', level: 'building' },
  { id: 'b2', level: 'building' },
];

describe('parseProgress', () => {
  it('reads a stored list of ids', () => {
    assert.deepEqual([...parseProgress('["a1","b2"]')], ['a1', 'b2']);
  });

  it('treats a missing, broken or wrong-shaped value as no progress', () => {
    for (const raw of [null, undefined, '', 'not json', '{"a1":true}', '"a1"', '42']) {
      assert.equal(parseProgress(raw).size, 0, String(raw));
    }
  });

  it('keeps numbers as text', () => {
    assert.ok(parseProgress('[7]').has('7'));
  });
});

describe('progressState', () => {
  it('offers lesson 1 to a new reader', () => {
    const p = progressState(CORE, new Set());
    assert.equal(startState(p), 'new');
    assert.equal(p.returning, false);
    assert.equal(p.currentLevel, null);
    assert.deepEqual(p.next, { lesson: CORE[0], index: 1, total: 3, levelRead: 0 });
  });

  it('offers the first unread lesson to a returning reader, with its place in the level', () => {
    const p = progressState(CORE, new Set(['a1', 'a3']));
    assert.equal(startState(p), 'returning');
    assert.equal(p.readCount, 2);
    assert.equal(p.currentLevel, 'discovery');
    assert.deepEqual(p.next, { lesson: CORE[1], index: 2, total: 3, levelRead: 2 });
  });

  it('moves to the next level once a level is read', () => {
    const p = progressState(CORE, new Set(['a1', 'a2', 'a3']));
    assert.equal(p.currentLevel, 'building');
    assert.deepEqual(p.next, { lesson: CORE[3], index: 1, total: 2, levelRead: 0 });
    assert.equal(p.perLevel.get('discovery'), 3);
    assert.equal(p.perLevel.get('building'), undefined);
  });

  it('says when every lesson is read', () => {
    const p = progressState(CORE, new Set(CORE.map((l) => l.id)));
    assert.equal(startState(p), 'finished');
    assert.equal(p.finished, true);
    assert.equal(p.currentLevel, null);
    assert.equal(p.readCount, 5);
  });

  it('ignores ids that are not on the ladder (an Inclusive Finances lesson, an old slug)', () => {
    const p = progressState(CORE, new Set(['inclusive-1', 'gone']));
    assert.equal(startState(p), 'new');
    assert.equal(p.readCount, 0);
  });

  it('has nothing to offer with no lessons', () => {
    const p = progressState([], new Set(['a1']));
    assert.equal(startState(p), 'none');
    assert.equal(p.next, null);
  });
});
