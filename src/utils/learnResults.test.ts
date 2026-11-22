/**
 * The search result list on /blog/ (src/utils/learnResults.ts): eight results
 * then "show all", the count line, and a `?q=` taken out of the address.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RESULT_LIMIT, queryFromAddress, resultView } from './learnResults.ts';

const WORDS = { noMatches: 'No lessons match.', lessonOne: 'lesson', lessonFew: 'lessons', lessonMany: 'lessons' };
const CS = { noMatches: 'Nic.', lessonOne: 'lekce', lessonFew: 'lekce', lessonMany: 'lekcí' };
const lessons = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, kind: 'lesson' as const }));
const guides = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `guide:g${i}`, kind: 'guide' as const }));

describe('resultView', () => {
  it('shows nothing before anything is typed', () => {
    assert.deepEqual(resultView(lessons(3), '   ', false, WORDS, 'en'), { shown: [], countLine: '', none: false, more: 0 });
  });

  it('shows the first eight, then offers all of them', () => {
    const v = resultView(lessons(11), 'debt', false, WORDS, 'en');
    assert.equal(RESULT_LIMIT, 8);
    assert.equal(v.shown.length, 8);
    assert.equal(v.more, 11);
    assert.equal(v.countLine, '11 lessons');
    const all = resultView(lessons(11), 'debt', true, WORDS, 'en');
    assert.equal(all.shown.length, 11);
    assert.equal(all.more, 0);
  });

  it('needs no button for eight or fewer', () => {
    assert.equal(resultView(lessons(8), 'x', false, WORDS, 'en').more, 0);
  });

  it('counts lessons only, in the language\'s own plural', () => {
    assert.equal(resultView([...guides(2), ...lessons(1)], 'x', false, WORDS, 'en').countLine, '1 lesson');
    assert.equal(resultView(lessons(3), 'x', false, CS, 'cs').countLine, '3 lekce');
    assert.equal(resultView(lessons(5), 'x', false, CS, 'cs').countLine, '5 lekcí');
  });

  it('has no count line when only guides match', () => {
    const v = resultView(guides(2), 'x', false, WORDS, 'en');
    assert.equal(v.countLine, '');
    assert.equal(v.none, false);
    assert.equal(v.shown.length, 2);
  });

  it('says so when nothing matches', () => {
    const v = resultView([], 'zzz', false, WORDS, 'en');
    assert.equal(v.countLine, 'No lessons match.');
    assert.equal(v.none, true);
  });
});

describe('queryFromAddress', () => {
  it('takes ?q= out and keeps the rest of the address', () => {
    assert.deepEqual(queryFromAddress('https://nidhi.today/blog/?q=credit+card&utm_source=x#level-helper'), {
      query: 'credit card',
      address: '/blog/?utm_source=x#level-helper',
    });
    assert.deepEqual(queryFromAddress('https://nidhi.today/hi/blog/?q=debt'), { query: 'debt', address: '/hi/blog/' });
  });

  it('caps a long query at the box\'s length', () => {
    assert.equal(queryFromAddress(`https://nidhi.today/blog/?q=${'a'.repeat(300)}`)!.query.length, 200);
  });

  it('does nothing without a query', () => {
    assert.equal(queryFromAddress('https://nidhi.today/blog/'), null);
    assert.equal(queryFromAddress('https://nidhi.today/blog/?q='), null);
    assert.equal(queryFromAddress('not an address'), null);
  });
});
