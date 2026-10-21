import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { layeredLessonProblems } from './layeredLessons.ts';

const ok = {
  seoTitle: 'Searchable title',
  glossary: [{ term: 'Default assumption' }],
  takeaways: [{ text: 'a', href: '#a' }, { text: 'b', href: '#b' }],
};

describe('layered-lesson rule', () => {
  it('passes a converted lesson', () => {
    assert.deepEqual(layeredLessonProblems(ok, ['Rules written for one kind of household']), []);
  });

  it('asks for a search title, glossary terms and linked takeaways', () => {
    assert.deepEqual(
      layeredLessonProblems({ takeaways: ['plain text', 'another'] }, []),
      [
        'no seoTitle in the reader\'s search words',
        'no glossary terms',
        '"In this lesson" needs at least two takeaways, each with an href to its section',
      ],
    );

    assert.deepEqual(
      layeredLessonProblems({
        ...ok,
        takeaways: [
          { text: 'linked', href: '#linked' },
          { text: 'missing href' },
        ],
      } as any, []),
      ['"In this lesson" needs at least two takeaways, each with an href to its section'],
    );
  });

  it('rejects counted headings and the shared closing skeleton', () => {
    const problems = layeredLessonProblems(ok, [
      'Part one: the map',
      'Three questions to ask',
      'Adjustment two: tax',
      'Step two: check the scheme',
      'Cross-continent notes: tax',
      'Cross-continent notes on consolidation mechanics',
      'Getting started',
      'Where this series goes next',
      'One pension, three households',
    ]);
    assert.deepEqual(problems, [
      'heading counts instead of naming its point: "Part one: the map"',
      'heading counts instead of naming its point: "Three questions to ask"',
      'heading counts instead of naming its point: "Adjustment two: tax"',
      'shared closing heading, name the section\'s point instead: "Cross-continent notes: tax"',
      'shared closing heading, name the section\'s point instead: "Cross-continent notes on consolidation mechanics"',
      'shared closing heading, name the section\'s point instead: "Getting started"',
    ]);
  });
});
