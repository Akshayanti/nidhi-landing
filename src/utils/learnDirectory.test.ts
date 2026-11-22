/**
 * The /blog/ directory (src/utils/learnDirectory.ts): every published lesson
 * and guide exactly once, and every search entry with its row. The page runs
 * `directoryProblems` on the real content at build time and stops on any.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { directoryGroups, directoryProblems, guideId } from './learnDirectory.ts';

const LEVELS = ['discovery', 'building', 'psychology', 'optimizing', 'mastery'];
const lesson = (id: string, level: string) => ({ id, title: id.toUpperCase(), href: `/blog/${id}/`, level, readingTime: 5 });
const LESSONS = [
  lesson('a1', 'discovery'),
  lesson('a2', 'discovery'),
  lesson('b1', 'building'),
  lesson('p1', 'psychology'),
  lesson('i1', 'inclusive-finances'),
];
const GUIDES = [{ id: 'g1', title: 'G1', href: '/how-to/g1/' }];

describe('directoryGroups', () => {
  const groups = directoryGroups(LEVELS, LESSONS, GUIDES);

  it('folds by level in ladder order, then Inclusive Finances, then the guides, leaving out empty levels', () => {
    assert.deepEqual(groups.map((g) => g.id), ['discovery', 'building', 'psychology', 'inclusive-finances', 'how-to']);
  });

  it('keeps reading order and numbers the ladder lessons only', () => {
    assert.deepEqual(groups[0].rows.map((r) => [r.id, r.seq]), [['a1', 0], ['a2', 1]]);
    assert.equal(groups[2].rows[0].seq, 3);
    assert.equal(groups[3].rows[0].seq, undefined);
  });

  it('gives guides their own ids and no reading time', () => {
    assert.deepEqual(groups[4].rows, [{ id: 'guide:g1', title: 'G1', href: '/how-to/g1/', level: 'how-to' }]);
  });
});

describe('directoryProblems', () => {
  const groups = directoryGroups(LEVELS, LESSONS, GUIDES);
  const published = [...LESSONS.map((l) => l.id), guideId('g1')];

  it('passes a complete directory', () => {
    assert.deepEqual(directoryProblems(groups, published, published), []);
  });

  it('finds a published lesson that is missing or listed twice', () => {
    const missing = directoryGroups(LEVELS, LESSONS.slice(1), GUIDES);
    assert.match(directoryProblems(missing, published, published.slice(1)).join('\n'), /a1 is listed 0 times/);
    const twice = [...groups, { id: 'extra', rows: [groups[0].rows[0]] }];
    assert.match(directoryProblems(twice, published, published).join('\n'), /a1 is listed 2 times/);
  });

  it('finds a lesson that is listed but not published, as with a level the directory does not know', () => {
    const odd = directoryGroups(LEVELS, [...LESSONS, lesson('x1', 'unknown')], GUIDES);
    assert.match(directoryProblems(odd, [...published, 'x1'], [...published, 'x1']).join('\n'), /x1 is listed 0 times/);
    assert.match(directoryProblems(groups, published.slice(1), published.slice(1)).join('\n'), /a1 is in the \/blog\/ directory but is not published/);
  });

  it('finds a search entry without a row, and a row without a search entry', () => {
    assert.match(directoryProblems(groups, published, [...published, 'ghost']).join('\n'), /search entry ghost has no row/);
    assert.match(directoryProblems(groups, published, published.slice(1)).join('\n'), /a1 has no search entry/);
  });
});
