import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tldrProblems, type TldrLesson } from './tldrRules.ts';

const lesson = (over: Partial<TldrLesson> = {}): TldrLesson => ({
  slug: 'a',
  pubDate: new Date('2026-05-01'),
  tldr: ['Plain words only.', 'Two bullets are enough.'],
  ...over,
});
const earlier = lesson({ slug: 'earlier', pubDate: new Date('2026-01-01'), glossary: [{ term: 'Fund' }, { term: 'Power of attorney' }] });

describe('TL;DR rule', () => {
  it('passes two or three short plain bullets', () => {
    assert.deepEqual(tldrProblems([earlier, lesson()], []), []);
  });

  it('asks for two or three bullets', () => {
    assert.match(tldrProblems([lesson({ tldr: ['One.'] })], [])[0], /1 bullets/);
    assert.match(tldrProblems([lesson({ tldr: ['A.', 'B.', 'C.', 'D.'] })], [])[0], /4 bullets/);
  });

  it('caps a bullet at 25 words and rejects empty bullets and markup', () => {
    assert.match(tldrProblems([lesson({ tldr: ['ok here', Array(26).fill('word').join(' ')] })], [])[0], /26 words/);
    assert.match(tldrProblems([lesson({ tldr: ['ok here', '  '] })], [])[0], /empty/);
    assert.match(tldrProblems([lesson({ tldr: ['ok here', 'a **bold** word'] })], [])[0], /markup/);
  });

  it('finds a term from any lesson, in any case, with a plural', () => {
    const problems = tldrProblems([earlier, lesson({ tldr: ['Index funds are common.', 'A Power of Attorney helps.'] })], []);
    assert.equal(problems.length, 2);
  });

  it('does not match inside a longer word', () => {
    assert.deepEqual(tldrProblems([earlier, lesson({ tldr: ['Refunds arrive later.', 'Fundamentals matter.'] })], []), []);
  });

  it('allows a different sense only for the exact phrase in that lesson', () => {
    const exceptions = [{ slug: 'a', phrase: 'emergency fund', reason: 'cash, not an investment', kind: 'different-sense' as const }];
    assert.deepEqual(tldrProblems([earlier, lesson({ tldr: ['An emergency fund helps.', 'Plain.'] })], exceptions), []);
    assert.equal(tldrProblems([earlier, lesson({ tldr: ['An index fund helps.', 'Plain.'] })], exceptions).length, 1);
    assert.equal(tldrProblems([earlier, lesson({ slug: 'b', tldr: ['An emergency fund helps.', 'Plain.'] })], exceptions).length, 1);
  });

  it('allows an unavoidable term only from an earlier lesson, never its own', () => {
    const exception = { slug: 'a', phrase: 'power of attorney', reason: 'no plain wording', kind: 'published-term' as const };
    const uses = { tldr: ['A power of attorney helps.', 'Plain.'] };
    assert.deepEqual(tldrProblems([earlier, lesson(uses)], [exception]), []);
    assert.equal(tldrProblems([lesson({ ...uses, glossary: [{ term: 'Power of attorney' }] })], [exception]).length, 1);
    const later = lesson({ slug: 'later', pubDate: new Date('2027-01-01'), glossary: [{ term: 'Power of attorney' }] });
    assert.equal(tldrProblems([later, lesson(uses)], [exception]).length, 1);
  });
});
