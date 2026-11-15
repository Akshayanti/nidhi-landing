import './utils/testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { collections } = await import('./content.config.ts');
type Schema = { safeParse: (v: unknown) => { success: boolean; data?: Record<string, unknown> } };
const schema = (name: keyof typeof collections) => (collections[name] as unknown as { schema: Schema }).schema;

const lesson = {
  slug: 'a-lesson', title: 'A lesson', description: 'What it covers.', tldr: ['One.', 'Two.'],
  pubDate: '2026-11-04', level: 'discovery', primaryPersona: 'eva', personas: ['eva'], tags: ['budgeting'],
};
const guide = {
  slug: 'a-guide', title: 'A question?', description: 'The answer.', outcome: 'An outcome.', group: 'month',
  answer: ['An answer.'], scope: { can: 'Can.', cannot: 'Cannot.' }, needs: [], form: 'steps',
  steps: [1, 2, 3].map(() => ({ action: 'Do.', why: 'Because.' })),
  visual: { kind: 'table', caption: 'A table', columns: ['A', 'B'], rows: [['1', '2']] },
  stopHere: 'Enough.', leftToYou: 'Yours.', dependsOn: ['One', 'Two'], lessons: ['a-lesson'],
  related: ['b-guide', 'c-guide'],
  references: [{ title: 'A reference', publisher: 'A body', url: 'https://example.org/' }],
  searchTerms: ['one', 'two'], reviewTrigger: 'A rule changes.', pubDate: '2026-11-10', lastChecked: '2026-11-10',
};
const situation = {
  slug: 'a-moment', title: 'Something arrived', description: 'What helps.', intro: 'An intro.',
  guides: ['a', 'b', 'c'], pubDate: '2026-11-10', lastChecked: '2026-11-10',
};

/** `base` passes; `base` with each change in `bad` fails; with each in `good` passes. */
function cases(name: keyof typeof collections, base: Record<string, unknown>, bad: Record<string, unknown>[], good: Record<string, unknown>[] = []) {
  const s = schema(name);
  assert.equal(s.safeParse(base).success, true, 'the base fixture is valid');
  for (const change of bad) assert.equal(s.safeParse({ ...base, ...change }).success, false, `should fail: ${JSON.stringify(change)}`);
  for (const change of good) assert.equal(s.safeParse({ ...base, ...change }).success, true, `should pass: ${JSON.stringify(change)}`);
}

describe('the lesson schema', () => {
  it('reads dates, and gives an unplaced lesson the last place', () => {
    const parsed = schema('blog').safeParse(lesson).data!;
    assert.equal((parsed.pubDate as Date).toISOString(), '2026-11-04T00:00:00.000Z');
    assert.equal(parsed.order, 99);
  });

  it('a search title fits in 57 characters', () => {
    cases('blog', lesson, [{ seoTitle: 'x'.repeat(58) }], [{ seoTitle: 'x'.repeat(57) }]);
  });

  it('"In this lesson" has two to five lines, and a link is an anchor on the page', () => {
    cases('blog', lesson,
      [{ takeaways: ['Why'] }, { takeaways: ['1', '2', '3', '4', '5', '6'] },
        { takeaways: ['Why', { text: 'How', href: '/blog/other/' }] }, { takeaways: ['Why', { text: 'How', href: '#Term' }] }],
      [{ takeaways: ['Why', { text: 'How', href: '#term-net-worth' }] }]);
  });

  it('a suggested read links to the work itself, over https', () => {
    const read = { title: 'A book', type: 'book' };
    cases('blog', lesson,
      [{ referentialReading: [read] }, { referentialReading: [{ ...read, url: 'http://example.org/' }] },
        { referentialReading: [{ ...read, url: 'https://example.org/', type: 'video' }] }],
      [{ referentialReading: [{ ...read, url: 'https://example.org/' }] }]);
  });

  it('levels, personas and local rule areas come from their lists', () => {
    cases('blog', lesson,
      [{ level: 'advanced' }, { primaryPersona: 'anna' }, { personas: ['anna'] }, { localRules: ['weather'] }, { regulatoryNote: 'fine' }],
      [{ level: 'inclusive-finances' }, { localRules: ['tax', 'deposit-protection'] }]);
  });

  it('a glossary term and a correction cannot be blank', () => {
    cases('blog', lesson,
      [{ glossary: [{ term: '', definition: 'x' }] }, { glossary: [{ term: 'x', definition: '' }] }, { corrections: [{ date: '2026-11-05', note: '' }] }],
      [{ glossary: [{ term: 'Net worth', definition: 'What you own minus what you owe.' }] }]);
  });
});

describe('the how-to guide schema', () => {
  it('a slug is lower-case words joined by hyphens, and the description fits a search result', () => {
    cases('guides', guide, [{ slug: 'A Guide' }, { slug: 'a_guide' }, { description: 'x'.repeat(171) }, { description: '' }], [{ description: 'x'.repeat(170) }]);
  });

  it('keeps the agreed shape: a short answer, three to five steps, two or three related questions', () => {
    const step = { action: 'Do.', why: 'Because.' };
    cases('guides', guide,
      [{ answer: [] }, { answer: ['1', '2', '3', '4'] }, { steps: [step, step] }, { steps: Array(6).fill(step) },
        { steps: [step, step, { action: 'Do.', why: '' }] }, { related: ['b-guide'] }, { related: ['b', 'c', 'd', 'e'] },
        { dependsOn: ['One'] }, { lessons: [] }, { lessons: ['a', 'b', 'c', 'd'] }, { searchTerms: ['one'] }, { group: 'other' }, { form: 'essay' }],
      [{ steps: Array(5).fill(step) }, { related: ['b', 'c', 'd'] }]);
  });

  it('a tool is one of the site\'s own, and references and sources are https links', () => {
    const ref = { title: 'A reference', publisher: 'A body' };
    cases('guides', guide,
      [{ tool: { url: 'https://example.org/', label: 'A tool' } }, { tool: { url: '/blog/x/', label: 'A tool' } },
        { references: [] }, { references: [{ ...ref, url: 'http://example.org/' }] }, { references: Array(4).fill({ ...ref, url: 'https://example.org/' }) },
        { sources: [{ title: 'A source', url: 'example.org' }] }],
      [{ tool: { url: '/free/loan-comparison/', label: 'Loan comparison' } }]);
  });

  it('the one visual is one of the four kinds, within its limits', () => {
    const event = { day: 'Mon', label: 'Rent', amount: -500 };
    cases('guides', guide,
      [{ visual: { kind: 'chart', caption: 'x' } }, { visual: { ...guide.visual, columns: ['A'] } }, { visual: { ...guide.visual, rows: [] } },
        { visual: { ...guide.visual, caption: '' } },
        { visual: { kind: 'timeline', caption: 'x', currency: 'EUR', start: { label: 'Today', balance: 900 }, events: [event], end: { label: 'Payday' } } },
        { visual: { kind: 'message', caption: 'x', from: 'A bank', parts: [{ text: 'Hello' }] } }],
      [{ visual: { kind: 'timeline', caption: 'x', currency: 'EUR', start: { label: 'Today', balance: 900 }, events: [event, event], end: { label: 'Payday' } } },
        { visual: { kind: 'message', caption: 'x', from: 'A bank', parts: [{ text: 'Hello' }, { text: 'Pay now', sign: 'Hurry' }] } },
        { visual: { kind: 'annotated', caption: 'x', title: 'A statement', lines: [{ label: 'Rate', value: '9%' }, { label: 'Fee', value: '20', note: 'Once' }] } }]);
  });

  it('a printable template has two to six columns and three to twelve whole rows', () => {
    const template = { title: 'A list', columns: ['A', 'B'], rows: 5 };
    cases('guides', guide,
      [{ template: { ...template, rows: 2 } }, { template: { ...template, rows: 13 } }, { template: { ...template, rows: 4.5 } }, { template: { ...template, columns: ['A'] } }],
      [{ template }]);
  });
});

describe('the situation page schema', () => {
  it('needs three to eight guides, and at most three lessons', () => {
    cases('situations', situation,
      [{ guides: ['a', 'b'] }, { guides: Array(9).fill('a') }, { lessons: ['a', 'b', 'c', 'd'] }, { slug: 'A moment' }, { description: 'x'.repeat(171) }, { intro: '' }],
      [{ lessons: ['a'] }]);
    assert.deepEqual(schema('situations').safeParse(situation).data!.lessons, []);
  });
});
